/**
 * broker-wellbeing-drysearch.mjs — FREE Apollo search (no enrich, 0 credits) to
 * size the wellbeing-role broker pool: those titles at our broker target firms.
 * Reports counts by firm + title so Will can approve an enrich spend.
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const OPENCLAW = '/Users/willnewton/.openclaw/workspace';
const envKey = (n) => { try { return (readFileSync(`${OPENCLAW}/.env`, 'utf8').match(new RegExp(`^${n}=(.+)$`, 'm'))?.[1] || '').trim().replace(/^["']|["']$/g, ''); } catch { return (process.env[n] || '').trim(); } };
const APOLLO = process.env.APOLLO_API_KEY || envKey('APOLLO_API_KEY');
const sb = createClient((process.env.SUPABASE_URL || '').trim(), (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(), { auth: { persistSession: false } });
const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TITLES = [
  'Wellbeing Account Manager', 'Wellbeing Consultant', 'Wellness Consultant', 'Wellness Program Manager',
  'Health Management Consultant', 'Population Health Consultant', 'Population Health Strategist',
  'Wellbeing Strategist', 'Vitality and Wellbeing', 'Health and Wellbeing', 'Wellness Manager', 'Wellbeing Specialist',
];

async function apollo(path, body) {
  for (let a = 0; ; a += 1) {
    const r = await fetch(`https://api.apollo.io/api/v1/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Api-Key': APOLLO }, body: JSON.stringify(body) });
    if (r.status === 429 && a < 5) { await sleep(2000 * 2 ** a); continue; }
    if (!r.ok) throw new Error(`${path} ${r.status}`);
    return r.json();
  }
}

(async () => {
  const firms = (await sb.from('crm_target_firms').select('display_name, domain, track').then((r) => r.data || [])).filter((f) => f.track === 'broker' && f.domain);
  const domains = firms.map((f) => lc(f.domain)?.replace(/^www\./, '')).filter(Boolean);
  console.log(`Searching ${TITLES.length} wellbeing titles across ${domains.length} broker firm domains (FREE search, 0 credits)…`);

  // one search: all titles across all broker domains, has_email, page through a few pages
  const known = new Set((await sb.from('outreach_contacts').select('email').then((r) => (r.data || []).map((x) => lc(x.email)))));
  let people = [];
  for (let page = 1; page <= 5; page += 1) {
    const s = await apollo('mixed_people/api_search', { q_organization_domains_list: domains, person_titles: TITLES, include_similar_titles: true, page, per_page: 100 });
    const batch = s.people || [];
    people.push(...batch);
    if (batch.length < 100) break;
    await sleep(300);
  }
  const withEmail = people.filter((p) => p.has_email);
  const netNew = withEmail.filter((p) => !known.has(lc(p.email)));
  console.log(`\nRESULTS: ${people.length} people matched · ${withEmail.length} have an email · ${netNew.length} NET-NEW (not already in our DB)`);

  const byFirm = {}, byTitle = {};
  for (const p of netNew) {
    const f = p.organization?.name || p.organization_name || '(unknown firm)';
    byFirm[f] = (byFirm[f] || 0) + 1;
    const t = (p.title || '(no title)');
    byTitle[t] = (byTitle[t] || 0) + 1;
  }
  console.log('\n=== NET-NEW by firm (top 15) ===');
  for (const [k, n] of Object.entries(byFirm).sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${String(n).padStart(3)}  ${k}`);
  console.log('\n=== NET-NEW by title (top 15) ===');
  for (const [k, n] of Object.entries(byTitle).sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${String(n).padStart(3)}  ${k}`);
  console.log(`\nENRICH COST if you proceed: ~${netNew.length} Apollo credits (1 per person) + MV/BounceBan (cheap). 0 spent so far.`);
})().catch((e) => { console.error('DRYSEARCH_ERROR:', e.message); process.exit(1); });
