/**
 * find-leads.mjs — net-new lead finder (the only piece that GROWS the funnel).
 *
 * Apollo people-search (FREE) for our proven ICP, then a strict spend gate:
 *   1. Search → Apollo person ids matching winner titles + size band.
 *   2. PRE-GATE (free): drop ids already in apollo_person_cache — we already
 *      paid to enrich them, re-enriching = wasted credits. Drop has_email=false.
 *   3. PREVIEW (default): print net-new count + EXACT credit cost. Zero spend.
 *   4. ENRICH (only with --enrich --confirm, hard-capped by --max): people/match
 *      = 1 credit each. Persist every result to apollo_person_cache so we can
 *      NEVER re-spend on them. POST-GATE the email/domain (suppression / already
 *      a client / already a known contact) → those are cached but NOT added to
 *      outbound. Survivors land in outreach_contacts (source apollo-leadgen) and
 *      flow into Play B on the next generate-plays run.
 *
 * Apollo's new api_search is obfuscated (id + title + org name + has_email
 * only — no name/email/domain), so the contacted/client/suppression checks
 * can only run POST-enrich. The id-cache pre-gate still fully prevents the
 * biggest waste vector (re-paying for someone we already have).
 *
 * Host-bound (APOLLO_API_KEY lives in openclaw .env, NOT Netlify):
 *   export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
 *   node scripts/find-leads.mjs                  # dry preview, 0 credits (default)
 *   node scripts/find-leads.mjs --pages 5        # search deeper
 *   node scripts/find-leads.mjs --enrich --max 50 --confirm   # spend ≤50 credits
 *
 * Spending is impossible without BOTH --enrich and --confirm. --max is clamped
 * to HARD_CAP. No flags = preview only.
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d) => { const i = args.indexOf(f); return i !== -1 && args[i + 1] ? args[i + 1] : d; };

const PAGES = Math.max(1, parseInt(val('--pages', '3'), 10) || 3);
const PER_PAGE = 100;
const HARD_CAP = 500;                       // never spend more than this in one run, period
const MAX = Math.min(HARD_CAP, Math.max(0, parseInt(val('--max', '0'), 10) || 0));
const ENRICH = has('--enrich');
const CONFIRM = has('--confirm');

// Proven ICP (matches the GOOD title categories that convert + winner size band)
const TITLES = [
  'Office Manager', 'Office Coordinator', 'Office Administrator',
  'Head of People', 'People Operations', 'HR Manager', 'HR Business Partner',
  'Director of People', 'Chief People Officer', 'Talent', 'Human Resources',
  'Employee Experience', 'Workplace Experience', 'Workplace Manager',
  'Facilities Manager', 'Events Manager',
];
const SIZE_RANGES = ['201,500', '501,1000', '1001,2000', '2001,5000'];

const OPENCLAW = '/Users/willnewton/.openclaw/workspace';
const APOLLO = (() => {
  try {
    const env = readFileSync(`${OPENCLAW}/.env`, 'utf8');
    return (env.match(/^APOLLO_API_KEY=(.+)$/m)?.[1] || '').trim().replace(/^["']|["']$/g, '');
  } catch { return (process.env.APOLLO_API_KEY || '').trim(); }
})();
const URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!APOLLO) { console.error('MISSING: APOLLO_API_KEY (openclaw .env)'); process.exit(2); }
if (!/^https?:\/\//i.test(URL) || !KEY) { console.error('MISSING: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY'); process.exit(2); }

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

// Read-only gate inputs already in Supabase (free).
async function loadKnown() {
  const cacheIds = new Set();
  const cacheEmails = new Set();
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
  log(`ICP: ${TITLES.length} titles × sizes ${SIZE_RANGES.join('/')} · pages ${PAGES}`);
  const known = await loadKnown();
  log(`known: cache ${known.cacheIds.size} ids / suppression ${known.supp.size} / contacts ${known.known.size} / client-domains ${known.clientDomains.size}`);

  // 1. Search (FREE) → candidate ids
  const candidates = [];
  let total = 0;
  for (let page = 1; page <= PAGES; page += 1) {
    const j = await apollo('mixed_people/api_search', {
      person_titles: TITLES, organization_num_employees_ranges: SIZE_RANGES, page, per_page: PER_PAGE,
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
  // de-dupe ids within this run
  const seen = new Set();
  const netNew = fresh.filter((c) => (seen.has(c.id) ? false : seen.add(c.id)));

  log('================ LEAD-FINDER PREVIEW ================');
  log(`search results fetched : ${candidates.length}  (of ~${total} in Apollo for this ICP)`);
  log(`already enriched (skip): ${skipCached}   no email (skip): ${skipNoEmail}`);
  log(`NET-NEW enrichable     : ${netNew.length}`);
  log(`enrich would cost      : ${Math.min(netNew.length, MAX || netNew.length)} credits` + (MAX ? ` (capped by --max ${MAX})` : ' (no --max set)'));
  log('====================================================');

  if (!ENRICH) { log('PREVIEW ONLY (no --enrich). 0 credits spent. DONE'); return; }
  if (!MAX) { log('REFUSING: --enrich requires --max N (explicit cap). 0 credits spent.'); return; }
  if (!CONFIRM) { log(`REFUSING: would spend up to ${Math.min(netNew.length, MAX)} credits. Re-run with --confirm to authorize. 0 spent.`); return; }

  const toEnrich = netNew.slice(0, MAX);
  log(`ENRICHING ${toEnrich.length} (≤${MAX}) — spending up to ${toEnrich.length} Apollo credits…`);
  const cacheRows = []; const contactRows = [];
  let added = 0; let gatedOut = 0; let spent = 0;
  for (const c of toEnrich) {
    let j;
    try { j = await apollo('people/match', { id: c.id, reveal_personal_emails: false }); }
    catch (e) { log(`  match ${c.id} err: ${e.message}`); continue; }
    spent += 1;
    const p = j.person || {};
    const email = lc(p.email);
    const dom = email ? emailDomain(email) : (p.organization?.primary_domain ? lc(p.organization.primary_domain) : null);
    const now = new Date().toISOString();
    // Always cache (so we NEVER re-spend on this id), even if gated out.
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
    // POST-GATE before adding to outbound.
    if (!email) { gatedOut += 1; continue; }
    if (known.supp.has(email)) { gatedOut += 1; continue; }
    if (known.known.has(email)) { gatedOut += 1; continue; }
    if (dom && known.clientDomains.has(dom)) { gatedOut += 1; continue; }
    contactRows.push({
      email, email_domain: dom, name: cacheRows[cacheRows.length - 1].name,
      title: cacheRows[cacheRows.length - 1].title, company: cacheRows[cacheRows.length - 1].company,
      linkedin_url: p.linkedin_url || null, location: cacheRows[cacheRows.length - 1].location,
      source: 'apollo-leadgen', first_seen: now, ingested_at: now,
    });
    added += 1;
    await sleep(120);
  }

  if (cacheRows.length) await upsert('apollo_person_cache', cacheRows, 'apollo_contact_id');
  if (contactRows.length) await upsert('outreach_contacts', contactRows, 'email');

  log('================ ENRICH RESULT ================');
  log(`credits spent      : ${spent}`);
  log(`cached (no re-spend): ${cacheRows.length}`);
  log(`gated out of outbound (suppressed/client/known/no-email): ${gatedOut}`);
  log(`NEW leads added to outreach_contacts: ${added}  (flow into Play B on next generate-plays)`);
  log('===============================================');
  log('DONE');
})().catch((e) => { console.error('FIND_LEADS_ERROR:', e.message); process.exit(1); });
