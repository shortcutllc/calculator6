/**
 * find-founder-targets.mjs — pull the FOUNDER LANE's tech-exec cohort:
 * executives (CEO/COO/CHRO/Head of People) at emerging tech companies
 * (~100-500 employees; funding recency ranked after org enrichment). See
 * memory/founder_outreach_lane.md.
 *
 * DELIBERATELY SEPARATE from find-leads/the cold pool: every contact lands with
 * source='founder-personal' AND channel='personal', so the cold engine can never
 * touch them (provenance guard takes apollo-leadgen* only; personal channel is
 * excluded everywhere). These people get Will's 1:1 founder notes, nothing else.
 *
 * Same discipline as find-leads: Apollo email_status gate + inline MillionVerifier,
 * person-cache so an id is never re-bought, dedupe vs suppression/known/clients.
 *
 *   set -a; source ~/.shortcut-cron.env; set +a
 *   node scripts/find-founder-targets.mjs                       # preview, 0 credits
 *   node scripts/find-founder-targets.mjs --enrich --max 50 --confirm
 *   node scripts/find-founder-targets.mjs --city "San Francisco Bay Area" ...
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d) => { const i = args.indexOf(f); return i !== -1 && args[i + 1] ? args[i + 1] : d; };
const OPENCLAW = '/Users/willnewton/.openclaw/workspace';
const envKey = (n) => { try { return (readFileSync(`${OPENCLAW}/.env`, 'utf8').match(new RegExp(`^${n}=(.+)$`, 'm'))?.[1] || '').trim().replace(/^["']|["']$/g, ''); } catch { return ''; } };
const APOLLO = process.env.APOLLO_API_KEY || envKey('APOLLO_API_KEY');
const MV = process.env.MILLIONVERIFIER_API_KEY || envKey('MILLIONVERIFIER_API_KEY');
const CITY = val('--city', 'New York Metropolitan Area');
const PAGES = Math.max(1, parseInt(val('--pages', '3'), 10) || 3);
const MAX = Math.min(300, Math.max(0, parseInt(val('--max', '0'), 10) || 0));
const ENRICH = has('--enrich'); const CONFIRM = has('--confirm');

// Exec titles — exact-ish (no include_similar: "similar" floods with VPs of
// everything). Head-of-People variants included: at ~100 people the People leader
// IS the buyer; the CEO/COO is the top-down door.
const TITLES = [
  'Chief Executive Officer', 'CEO', 'Founder', 'Co-Founder', 'Chief Operating Officer', 'COO',
  'Chief People Officer', 'CHRO', 'Chief Human Resources Officer',
  'Head of People', 'VP of People', 'VP People', 'Head of People Operations', 'Head of Talent',
];
// Emerging-tech shape: 101-500 employees (the "just crossed 100" cohort).
const SIZE_RANGES = ['101,200', '201,500'];
// API-level industry exclusion — same 65 tag IDs find-leads.mjs uses, so bad
// industries are filtered BEFORE the paid people/match. Learned Jul 6 2026:
// api_search returns no organization.industry, so the post-filter alone let 91
// of 150 paid enrichments die on the industry gate (49/150 yield).
const EXCLUDED_INDUSTRY_TAG_IDS = [
  '55718f947369642142b84a12', '5567e1a87369641f6d550100', '5567e27c7369642ade490000',
  '5567cd4d73696439d9030000', '5567e1a17369641ea9d30100', '5567cdda7369644eed130000',
  '5567cd4773696439dd350000', '5567e8a27369646ddb0b0000', '5567e19c7369641c48e70100',
  '5567ce9e736964540d540000', '5567ce5b736964540d280000', '5567cd4f7369644d2d010000',
  '5567e2097369642420150000', '5567f96c7369642a22080000', '5567d2ad7261697f2b1f0100',
  '5567cd4f736964397e030000', '5567cd527369643981050000', '5567e29b736964256c370100',
  '5567cd4c73696453e1300000', '5567cddb7369644d250c0000', '5567cdde73696439812c0000',
  '5567d02b7369645d8b140000', '55680a8273696407b61f0000', '5567e1797369641c48c10100',
  '556808697369647bfd420000', '5567cd8273696439b1240000', '5567cd4d73696439d9040000',
  '5567d0467369645dbc200000', '5567e2c572616932bb3b0000', '5567ce2773696454308f0000',
  '5567e15373696422aa0a0000', '5567cd4773696454303a0000', '5567e0af7369641ec7300000',
  '5567cd4a7369643ba9010000', '5567e28a7369642ae2500000', '5567cd49736964541d010000',
  '5567fd5a73696442b0f20000', '5567e0f27369640e5aed0c00', '5567e0e0736964198de70700',
  '5567e2a97369642a553d0000', '5567e19b7369641ead740000', '5567e1de7369642069ea0100',
  '55680085736964551e070000', '5567cd4d7369643b78100000', '5567ce9673696439d5c10000',
  '5567e1097369641d91230300', '5567e36f73696431a4970000', '5567e3657369642f4ec90000',
  '5567cdd87369643bc12f0000', '5567e0e073696408da441e00', '5567d04173696457ee520000',
  '5567cd4e7369644cf93b0000', '5568047d7369646d406c0000', '5567cdd97369645430680000',
  '5567ce9673696453d99f0000', '5567e8bb7369641a658f0000', '5567e25f736964256cff0000',
  '5567ce9c7369644eed680000', '5567cd477369645401010000', '5567e1887369641d68d40100',
  '5567cd4a73696439a9010000', '5567e0f973696416d34e0200', '5567e0ea7369640d2ba31600',
  '5567ced173696450cb580000', '5567cd4c7369644d39080000',
];
// Post-filter: tech-ish industries only (Apollo labels are lossy; this is the
// same coarse gate the archetype classifier uses for the tech cluster).
const TECH_INDUSTRY_RE = /software|internet|information technology|computer|fintech|financial services|biotech|artificial intelligence|saas|e-?learning|health.*tech|marketing & advertising/i;

const sb = createClient((process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim(), (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(), { auth: { persistSession: false } });
const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const emailDomain = (e) => lc(String(e).split('@')[1] || '');
async function apollo(path, bodyObj) {
  for (let a = 0; ; a += 1) {
    const r = await fetch(`https://api.apollo.io/api/v1/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Api-Key': APOLLO },
      body: JSON.stringify(bodyObj),
    });
    if (r.status === 429 && a < 5) { await sleep(2000 * 2 ** a); continue; }
    if (!r.ok) throw new Error(`${path} ${r.status}`);
    return r.json();
  }
}
const mvVerify = async (email) => { try { const r = await fetch(`https://api.millionverifier.com/api/v3/?api=${MV}&email=${encodeURIComponent(email)}&timeout=20`); const j = await r.json(); return (j.result || 'unknown').toLowerCase(); } catch { return 'unknown'; } };
async function readAll(t, c) { const o = []; for (let f = 0; ; f += 1000) { const { data, error } = await sb.from(t).select(c).range(f, f + 999); if (error) throw new Error(error.message); o.push(...data); if (data.length < 1000) break; } return o; }
async function upsert(table, rows, conflict) { for (let i = 0; i < rows.length; i += 200) { const { error } = await sb.from(table).upsert(rows.slice(i, i + 200), { onConflict: conflict, ignoreDuplicates: false }); if (error) log(`  ${table} warn: ${error.message}`); } }

(async () => {
  if (!APOLLO) { console.error('MISSING APOLLO_API_KEY'); process.exit(2); }
  log(`FOUNDER TARGETS: ${TITLES.length} exec titles · size ${SIZE_RANGES.join('/')} · "${CITY}" · pages ${PAGES}`);
  const cacheIds = new Set((await readAll('apollo_person_cache', 'apollo_contact_id')).map((r) => r.apollo_contact_id));
  const knownEmails = new Set((await readAll('outreach_contacts', 'email')).map((r) => lc(r.email)));
  const supp = new Set((await readAll('crm_suppression', 'email')).map((r) => lc(r.email)));
  log(`known: cache ${cacheIds.size} / contacts ${knownEmails.size} / suppression ${supp.size}`);

  // 1. Search (FREE)
  const candidates = []; let total = 0;
  for (let page = 1; page <= PAGES; page += 1) {
    const j = await apollo('mixed_people/api_search', {
      person_titles: TITLES, include_similar_titles: false,
      person_locations: [CITY],
      organization_num_employees_ranges: SIZE_RANGES,
      organization_not_industry_tag_ids: EXCLUDED_INDUSTRY_TAG_IDS,
      page, per_page: 100,
    });
    total = j.pagination?.total_entries || total;
    for (const p of j.people || []) candidates.push({ id: String(p.id), title: p.title || null, org: p.organization?.name || null, industry: lc(p.organization?.industry), hasEmail: !!p.has_email });
    log(`  page ${page}: +${(j.people || []).length} (pool ${total})`);
    if ((j.people || []).length < 100) break;
  }
  const techish = candidates.filter((c) => !c.industry || TECH_INDUSTRY_RE.test(c.industry));
  const fresh = techish.filter((c) => !cacheIds.has(c.id) && c.hasEmail);
  log(`fetched ${candidates.length} · tech-ish ${techish.length} · net-new enrichable ${fresh.length}`);
  if (!ENRICH || !CONFIRM) { log(`PREVIEW ONLY (0 credits). Enrich with: --enrich --max ${Math.min(fresh.length, 50)} --confirm`); return; }

  // 2. Enrich (1 Apollo credit each) + inline MV → founder-personal contacts.
  const toEnrich = fresh.slice(0, MAX || 50);
  const cacheRows = []; const contactRows = [];
  const gated = { email_status: 0, no_email: 0, known: 0, suppressed: 0, mv_invalid: 0, industry: 0 };
  for (const c of toEnrich) {
    let j; try { j = await apollo('people/match', { id: c.id, reveal_personal_emails: false }); } catch (e) { log(`  match err: ${e.message}`); continue; }
    const p = j.person || {};
    const email = lc(p.email);
    const dom = email ? emailDomain(email) : lc(p.organization?.primary_domain);
    const now = new Date().toISOString();
    cacheRows.push({
      apollo_contact_id: c.id, email, email_domain: dom,
      name: p.name || [p.first_name, p.last_name].filter(Boolean).join(' ') || null,
      title: p.title || c.title, company: p.organization?.name || c.org,
      company_headcount: p.organization?.estimated_num_employees ? String(p.organization.estimated_num_employees) : null,
      location: [p.city, p.state].filter(Boolean).join(', ') || null,
      industry: p.organization?.industry || null,
      company_url: p.organization?.website_url || p.organization?.primary_domain || null,
      linkedin_url: p.linkedin_url || null, email_status: p.email_status || null,
      cache_updated_at: now, ingested_at: now,
    });
    const cr = cacheRows[cacheRows.length - 1];
    if (!email) { gated.no_email += 1; continue; }
    if (p.email_status && !['verified', 'likely to engage', 'likely_to_engage'].includes(lc(p.email_status))) { gated.email_status += 1; continue; }
    if (!TECH_INDUSTRY_RE.test(lc(p.organization?.industry) || 'software')) { gated.industry += 1; continue; }
    if (knownEmails.has(email)) { gated.known += 1; continue; }
    if (supp.has(email)) { gated.suppressed += 1; continue; }
    let mv = null;
    if (MV) { mv = await mvVerify(email); if (mv === 'invalid' || mv === 'disposable') { gated.mv_invalid += 1; await sleep(80); continue; } await sleep(80); }
    contactRows.push({
      email, email_domain: dom, name: cr.name, title: cr.title, company: cr.company,
      linkedin_url: p.linkedin_url || null, location: cr.location,
      source: 'founder-personal', channel: 'personal',   // THE WALL: never enters cold
      mv_status: mv, mv_checked_at: mv ? now : null,
      first_seen: now, ingested_at: now,
    });
    await sleep(120);
  }
  if (cacheRows.length) await upsert('apollo_person_cache', cacheRows, 'apollo_contact_id');
  if (contactRows.length) await upsert('outreach_contacts', contactRows, 'email');
  log(`DONE — spent ~${toEnrich.length} Apollo credits · gated ${JSON.stringify(gated)} · ${contactRows.length} founder-personal targets added (channel=personal, cold engine can never touch them).`);
  log('Next: rank by funding recency via org enrichment, then they feed the founder queue (audience: tech-execs).');
})().catch((e) => { console.error('FOUNDER_TARGETS_ERROR:', e.message); process.exit(1); });
