// Discover ~150 broker + carrier-HEC contacts at our target firms via Apollo.
//
// Two-step Apollo call per firm:
//   1. /mixed_people/search  — free; returns candidate people IDs by org + title + location
//   2. /people/match          — 1 credit per; reveals work email + extra fields
//
// Caps:
//   --max 150   total enriched contacts (default)
//   --max-per-firm 8   safety per single firm so one firm doesn't consume the whole quota
//
// Cohort split (Sprint 1, per Will's spec):
//   Will  = Tier 1 brokers + Tier 2 brokers + Cigna HECs
//   Caren = Tier 3 brokers + Aetna HECs + Anthem HECs
//
// Dedupe: skip any email already in apollo_person_cache or outreach_contacts.
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);

// Apollo key lives in openclaw workspace .env (per broker_outreach_playbook.md)
const openclawEnv = Object.fromEntries(
  readFileSync('/Users/willnewton/.openclaw/workspace/.env', 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const APOLLO_KEY = openclawEnv.APOLLO_API_KEY;
if (!APOLLO_KEY) { console.error('Missing APOLLO_API_KEY in ~/.openclaw/workspace/.env'); process.exit(1); }

const flag = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? (process.argv[i + 1] || true) : d; };
const DRY = !!flag('--dry', false);
const MAX_TOTAL = Number(flag('--max', 150));
const MAX_PER_FIRM = Number(flag('--max-per-firm', 8));
const ONLY_TRACK = flag('--track', null);   // 'broker' | 'carrier_hec' | null

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const banner = (s) => console.log(`\n===== ${s} =====`);

// Apollo title filters per track (from broker_outreach_playbook.md ranked roles).
const BROKER_TITLES = [
  'Wellness Consultant', 'Wellbeing Consultant', 'Wellness Strategist',
  'Health and Welfare Practice Leader', 'Health & Welfare Practice Leader', 'Practice Leader Employee Benefits',
  'VP Employee Benefits', 'Vice President Employee Benefits',
  'Senior Producer', 'Producer', 'Partner',
  'Strategic Wellness Advisor', 'Population Health',
  'Benefits Consultant',
];
const HEC_TITLES = [
  'Health Engagement Consultant', 'Designated Consultant',
  'Health and Wellness Consultant', 'Health & Wellness Consultant',
  'Wellness Account Manager', 'Wellness Strategist', 'Wellness Account Executive',
];

// NYC tri-state locations (Apollo accepts city/state strings; we OR them).
const TRISTATE = ['New York', 'New Jersey', 'Connecticut', 'Pennsylvania'];

// Cohort split (per Will's Sprint 1 spec)
function assignTo(firm) {
  if (firm.track === 'broker') {
    if (firm.tier === 'tier_3') return 'caren@getshortcut.co';
    return 'will@getshortcut.co';     // tier_1 + tier_2 → Will
  }
  // carrier_hec
  if (firm.id === 'cigna') return 'will@getshortcut.co';
  return 'caren@getshortcut.co';      // aetna + anthem → Caren
}

async function apolloSearch({ orgDomain, titles, perPage = 25, page = 1 }) {
  const body = {
    q_organization_domains_list: [orgDomain],
    person_titles: titles,
    person_locations: TRISTATE,
    page,
    per_page: perPage,
  };
  const r = await fetch('https://api.apollo.io/api/v1/mixed_people/api_search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': APOLLO_KEY },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`apollo search ${r.status}: ${t.slice(0, 200)}`);
  }
  return r.json();
}

async function apolloMatch(personId) {
  const r = await fetch('https://api.apollo.io/api/v1/people/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': APOLLO_KEY },
    body: JSON.stringify({ id: personId, reveal_personal_emails: false }),
  });
  return r.json();
}

// ---- main ----
banner(`Loading target firms ${ONLY_TRACK ? `(track=${ONLY_TRACK})` : ''}`);
let firmsQ = sb.from('crm_target_firms').select('*').order('priority_rank');
if (ONLY_TRACK) firmsQ = firmsQ.eq('track', ONLY_TRACK);
const { data: firms, error: fErr } = await firmsQ;
if (fErr) { console.error(fErr.message); process.exit(1); }
console.log(`${firms.length} firms`);

banner('Loading existing emails (dedupe)');
const { data: existingCache } = await sb.from('apollo_person_cache').select('email').not('email', 'is', null);
const { data: existingContacts } = await sb.from('outreach_contacts').select('email').not('email', 'is', null);
const seen = new Set([
  ...existingCache.map((r) => r.email?.toLowerCase()).filter(Boolean),
  ...existingContacts.map((r) => r.email?.toLowerCase()).filter(Boolean),
]);
console.log(`Already have ${seen.size} emails on file; will skip matches.`);

let totalEnriched = 0;
const allInserts = [];

for (const firm of firms) {
  if (totalEnriched >= MAX_TOTAL) break;
  const titles = firm.track === 'broker' ? BROKER_TITLES : HEC_TITLES;
  console.log(`\n— ${firm.display_name} (${firm.track}, ${firm.tier}, rank ${firm.priority_rank})`);
  let candidates = [];
  try {
    const j = await apolloSearch({ orgDomain: firm.domain, titles, perPage: 25, page: 1 });
    candidates = j.people || [];
    console.log(`  search returned ${candidates.length} candidates`);
  } catch (e) {
    console.error(`  search failed: ${e.message}`);
    continue;
  }
  let firmCount = 0;
  for (const cand of candidates) {
    if (totalEnriched >= MAX_TOTAL || firmCount >= MAX_PER_FIRM) break;
    if (!cand.id) continue;
    const candEmail = (cand.email || '').toLowerCase();
    if (candEmail && seen.has(candEmail)) { continue; }
    const assigned = assignTo(firm);

    // Enrich (costs 1 credit) — only if we don't already have an email
    let person = cand;
    if (!DRY && !candEmail) {
      try {
        const m = await apolloMatch(cand.id);
        person = m.person || cand;
      } catch (e) {
        console.warn(`  match failed for ${cand.id}: ${e.message}`);
        continue;
      }
    }
    const email = (person.email || '').toLowerCase();
    if (!email) continue;
    if (seen.has(email)) continue;
    seen.add(email);

    const row = {
      email,
      apollo_id: person.id || cand.id,
      name: [person.first_name, person.last_name].filter(Boolean).join(' ') || person.name || null,
      title: person.title || null,
      company: person.organization?.name || firm.display_name,
      email_domain: email.split('@')[1] || firm.domain,
      linkedin_url: person.linkedin_url || null,
      city: person.city || null, state: person.state || null,
      headcount: person.organization?.estimated_num_employees || null,
      industry: person.organization?.industry || null,
      email_status: person.email_status || null,
      broker_track: firm.track,
      broker_assigned_to: assigned,
      broker_firm_id: firm.id,
      broker_priority_rank: firm.priority_rank,
    };
    allInserts.push(row);
    totalEnriched += 1;
    firmCount += 1;
    console.log(`  + ${row.name || '?'} | ${row.title || '?'} | ${row.email} → ${assigned.split('@')[0]}`);
  }
  console.log(`  firm total: ${firmCount} (${totalEnriched}/${MAX_TOTAL} overall)`);
}

banner(`Discovered ${allInserts.length} new contacts`);
const byRep = allInserts.reduce((acc, r) => { (acc[r.broker_assigned_to] = (acc[r.broker_assigned_to] || 0) + 1); return acc; }, {});
console.log(`split:`, byRep);

if (DRY) {
  console.log('DRY run — not writing.');
  writeFileSync('/tmp/broker-discovery-preview.json', JSON.stringify(allInserts, null, 2));
  console.log('preview written to /tmp/broker-discovery-preview.json');
  process.exit(0);
}

banner('Writing to apollo_person_cache + outreach_contacts');
for (const r of allInserts) {
  // apollo_person_cache (the firmographics cache used by lead-picture)
  await sb.from('apollo_person_cache').upsert({
    apollo_contact_id: r.apollo_id,
    email: r.email, email_domain: r.email_domain,
    name: r.name, title: r.title, company: r.company,
    company_headcount: r.headcount, location: [r.city, r.state].filter(Boolean).join(', '),
    industry: r.industry, linkedin_url: r.linkedin_url, email_status: r.email_status,
    ingested_at: new Date().toISOString(),
  }, { onConflict: 'apollo_contact_id' });
  // outreach_contacts (the primary lookup_lead surface)
  await sb.from('outreach_contacts').upsert({
    email: r.email, email_domain: r.email_domain,
    name: r.name, title: r.title, company: r.company,
    headcount: r.headcount, industry: r.industry, location: [r.city, r.state].filter(Boolean).join(', '),
    linkedin_url: r.linkedin_url, email_status: r.email_status,
    source: 'broker_gtm_apollo',
    broker_track: r.broker_track, broker_assigned_to: r.broker_assigned_to,
    broker_firm_id: r.broker_firm_id, broker_priority_rank: r.broker_priority_rank,
    broker_added_at: new Date().toISOString(),
    ingested_at: new Date().toISOString(),
  }, { onConflict: 'email' });
}
console.log(`✓ wrote ${allInserts.length} contacts`);
