/**
 * find-leads.mjs — net-new lead finder (the only piece that GROWS the funnel).
 *
 * Brought up to openclaw search_with_cache.js standard (2026-06-26): city
 * targeting, industry whitelist + API-level exclusion, include_similar_titles,
 * Apollo email_status gate, INLINE MillionVerifier, and law/real-estate
 * segmentation (those go to a separate source, NOT the main cold pool).
 *
 * Strict spend gate (unchanged):
 *   1. Search (FREE) → Apollo person ids for ICP titles × size × CITY, bad
 *      industries excluded at the API so we never pay to enrich them.
 *   2. PRE-GATE (free): drop ids already in apollo_person_cache.
 *   3. PREVIEW (default): print net-new count + EXACT credit cost. Zero spend.
 *   4. ENRICH (--enrich --confirm --max N): people/match = 1 Apollo credit each.
 *      Per survivor: gate on email_status + allowed industry, run MillionVerifier
 *      (1 MV credit), drop invalid/disposable, persist mv_status. Law/real-estate
 *      get source 'apollo-leadgen-law' / 'apollo-leadgen-realestate' so the cold
 *      engine's direct segment excludes them (separate messaging later).
 *
 * Host-bound (APOLLO_API_KEY + MILLIONVERIFIER_API_KEY in openclaw .env):
 *   export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
 *   node scripts/find-leads.mjs                                  # preview NYC, 0 credits
 *   node scripts/find-leads.mjs --city "San Francisco Bay Area"  # different metro
 *   node scripts/find-leads.mjs --enrich --max 100 --confirm     # spend ≤100
 *   node scripts/find-leads.mjs --enrich --max 100 --confirm --no-mv   # skip MV
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d) => { const i = args.indexOf(f); return i !== -1 && args[i + 1] ? args[i + 1] : d; };

const PAGES = Math.max(1, parseInt(val('--pages', '3'), 10) || 3);
const PER_PAGE = 100;
const HARD_CAP = 500;
const MAX = Math.min(HARD_CAP, Math.max(0, parseInt(val('--max', '0'), 10) || 0));
const ENRICH = has('--enrich');
const CONFIRM = has('--confirm');
const CITY = val('--city', 'New York Metropolitan Area');   // NYC default (openclaw metro string)
const USE_MV = !has('--no-mv');
const INCLUDE_LAW_RE = has('--include-law-re');
const VERTICAL = (val('--vertical', '') || '').toLowerCase();   // '' (direct) | law | realestate

// Proven ICP titles + include_similar_titles so Apollo auto-matches variants.
const TITLES = [
  'Office Manager', 'Office Coordinator', 'Office Administrator',
  'Head of People', 'People Operations', 'HR Manager', 'HR Business Partner',
  'Director of People', 'Chief People Officer', 'Talent', 'Human Resources',
  'Employee Experience', 'Workplace Experience', 'Workplace Manager',
  'Facilities Manager', 'Events Manager',
];
// Vertical title-sets (from memory/vertical_law_firm_gtm.md + vertical_real_estate_gtm.md).
// Post-gated to the vertical's industry below, so generic titles (e.g. "Community
// Manager") only survive at a law firm / real-estate co. For LAW CLE, run with a
// NY/FL/PA --city (accreditation gating); the cle sequence only ships there.
const VERTICAL_TITLES = {
  // Precise CLE-organizer + wellness-organizer roles (research 2026-06-29, see
  // memory/vertical_law_firm_gtm.md "Apollo title strings"). include_similar_titles
  // expands variants; the law-practice industry tag keeps the generic ones clean.
  law: [
    // CLE / Professional Development organizers (book the session)
    'CLE Manager', 'CLE Coordinator', 'CLE and Events Manager',
    'Director of Professional Development', 'Professional Development Manager',
    'Professional Development Coordinator', 'Director of Attorney Development',
    'Manager of Attorney Development', 'Director of Talent Development', 'Chief Talent Officer',
    'Learning and Development Manager',
    // Wellbeing owners + event logistics (gated to law practice)
    'Director of Wellbeing', 'Director of Attorney Well-Being', 'Manager of Benefits and Wellness',
    'Director of Administration', 'Firm Administrator', 'Manager of Events and Conference Services',
  ],
  realestate: [
    'Tenant Experience Manager', 'Director of Tenant Experience', 'Director of Amenities',
    'Community Manager', 'Member Experience Manager', 'Director of Member Experience',
    'Property Manager', 'General Manager', 'Asset Manager', 'Workplace Experience Manager',
    'Head of Hospitality', 'Resident Experience Manager', 'Lifestyle Manager',
  ],
};
const EFFECTIVE_TITLES = (VERTICAL && VERTICAL_TITLES[VERTICAL]) ? VERTICAL_TITLES[VERTICAL] : TITLES;
// Apollo industry tag IDs to CONSTRAIN a vertical search to its own industry at
// the API level (the vertical titles alone are too generic — "Property Manager"
// / "Community Manager" exist everywhere). Verified from CBRE/JLL/Wachtell/etc.
const VERTICAL_INDUSTRY_TAGS = {
  law: ['5567ce1f7369644d391c0000'],          // law practice
  realestate: ['5567cd477369645401010000'],   // real estate
};
const SIZE_RANGES = ['201,500', '501,1000', '1001,2000', '2001,5000'];

// Apollo email_status we accept (reject guessed/unavailable/null). (openclaw)
const ACCEPTED_EMAIL_STATUSES = new Set(['verified', 'likely to engage']);

// Law + real estate are EXCLUDED from the main cold pool (openclaw create_campaign.js:982).
const LAW_INDUSTRIES = new Set(['law practice', 'legal services']);
const RE_INDUSTRIES = new Set(['real estate', 'commercial real estate']);

// API-level industry exclusion (organization_not_industry_tag_ids) — filters
// BEFORE enrichment so we never pay to enrich a bad industry. 65 hex IDs lifted
// from openclaw search_with_cache.js (gov/military/non-profit/media/sports/etc.).
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

// Post-enrich safety net: allowed industry strings (82 of Apollo's 148). (openclaw)
const ALLOWED_INDUSTRIES = new Set([
  'accounting', 'airlines/aviation', 'apparel & fashion', 'architecture & planning',
  'automotive', 'aviation & aerospace', 'banking', 'biotechnology',
  'business supplies & equipment', 'capital markets', 'chemicals', 'civil engineering',
  'computer & network security', 'computer games', 'computer hardware', 'computer networking',
  'computer software', 'consumer electronics', 'consumer goods', 'consumer services',
  'cosmetics', 'defense & space', 'design', 'electrical/electronic manufacturing',
  'entertainment', 'events services', 'executive office', 'facilities services',
  'financial services', 'food production', 'furniture',
  'gambling & casinos', 'hospitality', 'human resources', 'import & export',
  'industrial automation', 'information services', 'information technology & services',
  'insurance', 'internet', 'investment banking', 'investment management', 'legal services',
  'logistics & supply chain', 'luxury goods & jewelry', 'management consulting',
  'market research', 'marketing & advertising', 'mechanical or industrial engineering',
  'medical devices', 'motion pictures & film', 'music', 'nanotechnology',
  'oil & energy', 'online media', 'paper & forest products',
  'pharmaceuticals', 'photography', 'plastics', 'printing', 'program development',
  'public relations & communications', 'publishing', 'railroad manufacture',
  'recreational facilities & services', 'renewables & environment', 'research',
  'semiconductors', 'sporting goods', 'sports', 'staffing & recruiting',
  'utilities', 'venture capital & private equity', 'warehousing', 'wholesale', 'wireless',
  'writing & editing',
]);

const OPENCLAW = '/Users/willnewton/.openclaw/workspace';
const envKey = (name) => {
  try { return (readFileSync(`${OPENCLAW}/.env`, 'utf8').match(new RegExp(`^${name}=(.+)$`, 'm'))?.[1] || '').trim().replace(/^["']|["']$/g, ''); }
  catch { return (process.env[name] || '').trim(); }
};
const APOLLO = envKey('APOLLO_API_KEY');
const MV_KEY = envKey('MILLIONVERIFIER_API_KEY');
const URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!APOLLO) { console.error('MISSING: APOLLO_API_KEY (openclaw .env)'); process.exit(2); }
if (!/^https?:\/\//i.test(URL) || !KEY) { console.error('MISSING: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY'); process.exit(2); }
if (ENRICH && USE_MV && !MV_KEY) { console.error('MISSING: MILLIONVERIFIER_API_KEY (openclaw .env). Pass --no-mv to skip MV.'); process.exit(2); }

const sb = createClient(URL, KEY, { auth: { persistSession: false } });
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);
const emailDomain = (e) => { const m = lc(e)?.match(/@([^@\s]+)$/); return m ? m[1].replace(/^www\./, '') : null; };

async function apollo(path, bodyObj) {
  for (let a = 0; ; a += 1) {
    try {
      const r = await fetch(`https://api.apollo.io/api/v1/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', 'X-Api-Key': APOLLO },
        body: JSON.stringify(bodyObj),
      });
      if (r.status === 429 && a < 5) { await sleep(2000 * 2 ** a); continue; }
      const j = await r.json();
      if (!r.ok) throw new Error(`${r.status} ${j.error || ''}`);
      return j;
    } catch (e) {
      if (a >= 4) throw new Error(`apollo ${path}: ${e.message}`);
      await sleep(1000 * 2 ** (a + 1));
    }
  }
}

// MillionVerifier → ok | catch_all | unknown | invalid | disposable
async function mvVerify(email) {
  try {
    const r = await fetch(`https://api.millionverifier.com/api/v3/?api=${MV_KEY}&email=${encodeURIComponent(email)}&timeout=10`);
    const j = await r.json();
    return j.result || 'unknown';
  } catch { return 'unknown'; }
}

async function loadKnown() {
  const cacheIds = new Set(); const cacheEmails = new Set();
  for (let f = 0; ; f += 1000) {
    const { data, error } = await sb.from('apollo_person_cache').select('apollo_contact_id, email').range(f, f + 999);
    if (error) throw new Error(`apollo_person_cache: ${error.message}`);
    for (const r of data) { if (r.apollo_contact_id) cacheIds.add(String(r.apollo_contact_id)); if (r.email) cacheEmails.add(lc(r.email)); }
    if (data.length < 1000) break;
  }
  const supp = new Set();
  for (let f = 0; ; f += 1000) {
    const { data } = await sb.from('crm_suppression').select('email').range(f, f + 999);
    for (const r of data || []) supp.add(lc(r.email));
    if (!data || data.length < 1000) break;
  }
  const known = new Set();
  for (let f = 0; ; f += 1000) {
    const { data } = await sb.from('outreach_contacts').select('email').range(f, f + 999);
    for (const r of data || []) known.add(lc(r.email));
    if (!data || data.length < 1000) break;
  }
  const clientDomains = new Set();
  for (let f = 0; ; f += 1000) {
    const { data } = await sb.from('crm_companies').select('contact_domains, completed_events').range(f, f + 999);
    for (const c of data || []) if (c.completed_events > 0) for (const d of c.contact_domains || []) clientDomains.add(lc(d).replace(/^www\./, ''));
    if (!data || data.length < 1000) break;
  }
  return { cacheIds, cacheEmails, supp, known, clientDomains };
}

async function upsert(table, rows, conflict) {
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await sb.from(table).upsert(rows.slice(i, i + 200), { onConflict: conflict, ignoreDuplicates: false });
    if (error) throw new Error(`upsert ${table}: ${error.message}`);
  }
}

(async () => {
  log(`ICP${VERTICAL ? ` [VERTICAL=${VERTICAL}]` : ''}: ${EFFECTIVE_TITLES.length} titles (+similar) × sizes ${SIZE_RANGES.join('/')} · CITY "${CITY}" · pages ${PAGES} · MV ${USE_MV ? 'on' : 'off'}`);
  if (VERTICAL === 'law') log('  LAW pull: post-gated to law practice/legal services, tagged apollo-leadgen-law. For the CLE sequence, use a NY/FL/PA --city (we are accredited only there).');
  if (VERTICAL === 'realestate') log('  REAL-ESTATE pull: post-gated to real estate, tagged apollo-leadgen-realestate.');
  const known = await loadKnown();
  log(`known: cache ${known.cacheIds.size} ids / suppression ${known.supp.size} / contacts ${known.known.size} / client-domains ${known.clientDomains.size}`);

  // 1. Search (FREE) — title × size × CITY, bad industries excluded at the API.
  const candidates = [];
  let total = 0;
  for (let page = 1; page <= PAGES; page += 1) {
    const j = await apollo('mixed_people/api_search', {
      person_titles: EFFECTIVE_TITLES,
      include_similar_titles: true,
      person_locations: [CITY],
      organization_num_employees_ranges: SIZE_RANGES,
      organization_not_industry_tag_ids: EXCLUDED_INDUSTRY_TAG_IDS,
      // Vertical pulls constrain to the vertical's own industry (else generic
      // titles flood the search with insurance/marketing people).
      ...(VERTICAL && VERTICAL_INDUSTRY_TAGS[VERTICAL] ? { organization_industry_tag_ids: VERTICAL_INDUSTRY_TAGS[VERTICAL] } : {}),
      page, per_page: PER_PAGE,
    });
    total = j.total_entries ?? total;
    const people = j.people || [];
    for (const p of people) candidates.push({ id: String(p.id), title: p.title || null, org: p.organization?.name || null, hasEmail: !!p.has_email });
    log(`  page ${page}: +${people.length} (pool total_entries ${total})`);
    if (people.length < PER_PAGE) break;
    await sleep(300);
  }

  // 2. PRE-GATE (free): never re-enrich, skip no-email
  const fresh = [];
  let skipCached = 0; let skipNoEmail = 0;
  for (const c of candidates) {
    if (known.cacheIds.has(c.id)) { skipCached += 1; continue; }
    if (!c.hasEmail) { skipNoEmail += 1; continue; }
    fresh.push(c);
  }
  const seen = new Set();
  const netNew = fresh.filter((c) => (seen.has(c.id) ? false : seen.add(c.id)));

  log('================ LEAD-FINDER PREVIEW ================');
  log(`city                   : ${CITY}`);
  log(`search results fetched : ${candidates.length}  (of ~${total} in Apollo for this ICP+city)`);
  log(`already enriched (skip): ${skipCached}   no email (skip): ${skipNoEmail}`);
  log(`NET-NEW enrichable     : ${netNew.length}`);
  log(`enrich would cost      : ${Math.min(netNew.length, MAX || netNew.length)} Apollo${USE_MV ? ' + same in MV' : ''} credits` + (MAX ? ` (capped by --max ${MAX})` : ' (no --max set)'));
  log('====================================================');

  if (!ENRICH) { log('PREVIEW ONLY (no --enrich). 0 credits spent. DONE'); return; }
  if (!MAX) { log('REFUSING: --enrich requires --max N (explicit cap). 0 credits spent.'); return; }
  if (!CONFIRM) { log(`REFUSING: would spend up to ${Math.min(netNew.length, MAX)} credits. Re-run with --confirm. 0 spent.`); return; }

  const toEnrich = netNew.slice(0, MAX);
  log(`ENRICHING ${toEnrich.length} (≤${MAX})…`);
  const cacheRows = []; const contactRows = [];
  let added = 0; let lawRe = 0; let spent = 0;
  const gated = { email_status: 0, industry: 0, suppressed: 0, known: 0, client: 0, no_email: 0, mv_invalid: 0 };
  for (const c of toEnrich) {
    let j;
    try { j = await apollo('people/match', { id: c.id, reveal_personal_emails: false }); }
    catch (e) { log(`  match ${c.id} err: ${e.message}`); continue; }
    spent += 1;
    const p = j.person || {};
    const email = lc(p.email);
    const dom = email ? emailDomain(email) : (p.organization?.primary_domain ? lc(p.organization.primary_domain) : null);
    const industry = lc(p.organization?.industry);
    const now = new Date().toISOString();
    // Always cache (never re-spend on this id), even if gated out.
    cacheRows.push({
      apollo_contact_id: c.id, email, email_domain: dom,
      name: p.name || [p.first_name, p.last_name].filter(Boolean).join(' ') || null,
      title: p.title || c.title, company: p.organization?.name || c.org,
      company_headcount: p.organization?.estimated_num_employees ? String(p.organization.estimated_num_employees) : null,
      location: [p.city, p.state, p.country].filter(Boolean).join(', ') || null,
      industry: p.organization?.industry || null,
      company_url: p.organization?.website_url || p.organization?.primary_domain || null,
      linkedin_url: p.linkedin_url || null, email_status: p.email_status || null,
      cache_updated_at: now, ingested_at: now,
    });
    const cr = cacheRows[cacheRows.length - 1];

    // ---- POST-GATE before outbound ----
    if (!email) { gated.no_email += 1; continue; }
    if (p.email_status && !ACCEPTED_EMAIL_STATUSES.has(lc(p.email_status))) { gated.email_status += 1; continue; }
    // Industry gate. In a VERTICAL pull, require the vertical's own industry (so
    // generic titles only survive at a law firm / real-estate co). Otherwise the
    // normal allowed-industry gate (law/RE pass through to be tagged + segmented).
    if (VERTICAL === 'law') { if (!LAW_INDUSTRIES.has(industry)) { gated.industry += 1; continue; } }
    else if (VERTICAL === 'realestate') { if (!RE_INDUSTRIES.has(industry)) { gated.industry += 1; continue; } }
    else if (industry && !ALLOWED_INDUSTRIES.has(industry) && !LAW_INDUSTRIES.has(industry) && !RE_INDUSTRIES.has(industry)) { gated.industry += 1; continue; }
    if (known.supp.has(email)) { gated.suppressed += 1; continue; }
    if (known.known.has(email)) { gated.known += 1; continue; }
    if (dom && known.clientDomains.has(dom)) { gated.client += 1; continue; }

    // MillionVerifier (inline). Reject invalid/disposable. Keep ok/unknown/catch_all.
    let mv = null;
    if (USE_MV) {
      mv = await mvVerify(email);
      if (mv === 'invalid' || mv === 'disposable') { gated.mv_invalid += 1; await sleep(80); continue; }
      await sleep(80);
    }

    // Law / real estate → separate source (own segment). A VERTICAL pull tags
    // explicitly; otherwise law/RE encountered incidentally are tagged + split.
    let source = 'apollo-leadgen';
    if (VERTICAL === 'law') { source = 'apollo-leadgen-law'; lawRe += 1; }
    else if (VERTICAL === 'realestate') { source = 'apollo-leadgen-realestate'; lawRe += 1; }
    else if (!INCLUDE_LAW_RE) {
      if (LAW_INDUSTRIES.has(industry)) { source = 'apollo-leadgen-law'; lawRe += 1; }
      else if (RE_INDUSTRIES.has(industry)) { source = 'apollo-leadgen-realestate'; lawRe += 1; }
    }

    contactRows.push({
      email, email_domain: dom, name: cr.name, title: cr.title, company: cr.company,
      linkedin_url: p.linkedin_url || null, location: cr.location,
      source, mv_status: mv, mv_checked_at: mv ? now : null,
      first_seen: now, ingested_at: now,
    });
    if (source === 'apollo-leadgen') added += 1;
    await sleep(120);
  }

  if (cacheRows.length) await upsert('apollo_person_cache', cacheRows, 'apollo_contact_id');
  if (contactRows.length) await upsert('outreach_contacts', contactRows, 'email');

  log('================ ENRICH RESULT ================');
  log(`Apollo credits spent : ${spent}` + (USE_MV ? `   MV verified: ${contactRows.length + gated.mv_invalid}` : ''));
  log(`cached (no re-spend) : ${cacheRows.length}`);
  log(`gated out            : ${JSON.stringify(gated)}`);
  log(`law/real-estate (segmented, separate source): ${lawRe}`);
  log(`NEW direct leads added (source apollo-leadgen): ${added}  (flow into Play B on next generate-plays)`);
  log('===============================================');
  log('DONE');
})().catch((e) => { console.error('FIND_LEADS_ERROR:', e.message); process.exit(1); });
