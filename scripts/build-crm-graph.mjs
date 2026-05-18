/**
 * build-crm-graph.mjs — collapse crm_events into the Company -> Site -> Event
 * graph, classify each company's land-and-expand trajectory, and STAGE (never
 * auto-apply) the ambiguous merges for human review.
 *
 * Run AFTER backfill-parse-crm.mjs. Idempotent. Supabase-only. Supports --dry.
 *
 *   cd /Users/willnewton/Documents/GitHub/calculator6
 *   source ~/.nvm/nvm.sh
 *   export SUPABASE_URL="$(netlify env:get VITE_SUPABASE_URL)" \
 *          SUPABASE_SERVICE_ROLE_KEY="$(netlify env:get SUPABASE_SERVICE_ROLE_KEY)"
 *   node .claude/worktrees/<wt>/scripts/build-crm-graph.mjs [--dry]
 */

import { createClient } from '@supabase/supabase-js';

const DRY = process.argv.includes('--dry');
const RECONCILE = process.argv.includes('--reconcile'); // live: also delete superseded orphan company rows
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!/^https?:\/\//i.test(SUPABASE_URL) || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('MISSING_ENV: need a valid SUPABASE_URL and a SUPABASE_SERVICE_ROLE_KEY (env injection may have come back empty — retry)');
  process.exit(2);
}

const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const DAY = 86400000;
const NOW = Date.now();
const ACTIVE_DAYS = 547;    // last completed <= ~18mo => active
const LAPSED_DAYS = 1095;   // <= ~36mo => lapsed; older => churned

// ---------- Normalization helpers ----------

const STATE_MAP = {
  alabama: 'AL', al: 'AL', alaska: 'AK', ak: 'AK', arizona: 'AZ', az: 'AZ',
  arkansas: 'AR', ar: 'AR', california: 'CA', ca: 'CA', colorado: 'CO', co: 'CO',
  connecticut: 'CT', ct: 'CT', delaware: 'DE', de: 'DE', florida: 'FL', fl: 'FL',
  georgia: 'GA', ga: 'GA', hawaii: 'HI', hi: 'HI', idaho: 'ID', id: 'ID',
  illinois: 'IL', il: 'IL', indiana: 'IN', in: 'IN', iowa: 'IA', ia: 'IA',
  kansas: 'KS', ks: 'KS', kentucky: 'KY', ky: 'KY', louisiana: 'LA', la: 'LA',
  maine: 'ME', me: 'ME', maryland: 'MD', md: 'MD', massachusetts: 'MA', ma: 'MA',
  michigan: 'MI', mi: 'MI', minnesota: 'MN', mn: 'MN', mississippi: 'MS', ms: 'MS',
  missouri: 'MO', mo: 'MO', montana: 'MT', mt: 'MT', nebraska: 'NE', ne: 'NE',
  nevada: 'NV', nv: 'NV', 'new hampshire': 'NH', nh: 'NH', 'new jersey': 'NJ',
  nj: 'NJ', 'new mexico': 'NM', nm: 'NM', 'new york': 'NY', ny: 'NY',
  'north carolina': 'NC', nc: 'NC', 'north dakota': 'ND', nd: 'ND', ohio: 'OH',
  oh: 'OH', oklahoma: 'OK', ok: 'OK', oregon: 'OR', or: 'OR', pennsylvania: 'PA',
  pa: 'PA', 'rhode island': 'RI', ri: 'RI', 'south carolina': 'SC', sc: 'SC',
  'south dakota': 'SD', sd: 'SD', tennessee: 'TN', tn: 'TN', texas: 'TX', tx: 'TX',
  utah: 'UT', ut: 'UT', vermont: 'VT', vt: 'VT', virginia: 'VA', va: 'VA',
  washington: 'WA', wa: 'WA', 'west virginia': 'WV', wv: 'WV', wisconsin: 'WI',
  wi: 'WI', wyoming: 'WY', wy: 'WY', 'district of columbia': 'DC',
  'washington dc': 'DC', dc: 'DC',
};
function canonState(s) {
  if (!s) return null;
  const k = String(s).trim().toLowerCase().replace(/\./g, '');
  return STATE_MAP[k] || String(s).trim().toUpperCase() || null;
}
const STATE_CODES = new Set(Object.values(STATE_MAP));
// Trailing tokens safe to auto-strip into the company key (office tags that
// are never a legitimate name tail). Full state NAMES and city WORDS are NOT
// here — those are staged for review, not auto-merged.
const LOC_SUFFIX_1 = new Set([...[...STATE_CODES].map((s) => s.toLowerCase()), 'lv', 'nyc', 'vegas', 'hq']);
const LOC_SUFFIX_2 = new Set(['las vegas']);
// City WORDS used only to PROPOSE (never auto-apply) city-suffix site merges.
const CITY_WORDS = new Set([
  'boston', 'chicago', 'austin', 'miami', 'seattle', 'atlanta', 'denver',
  'dallas', 'houston', 'philadelphia', 'philly', 'brooklyn', 'manhattan',
  'nomad', 'portland', 'phoenix', 'minneapolis', 'nashville', 'charlotte',
  'detroit', 'baltimore', 'pittsburgh', 'cincinnati', 'cleveland', 'orlando',
  'tampa', 'sacramento', 'oakland', 'newark', 'hoboken', 'stamford',
]);
const STOP = new Set(['and', 'of', 'the', 'for', 'at']);

// Fold accents/diacritics so "Schrödinger" == "Schrodinger" (NFD decompose,
// strip combining marks). Without this, ö -> space and the names fragment.
const foldAccents = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function normCore(s) {
  if (!s || typeof s !== 'string') return '';
  return foldAccents(s)
    .toLowerCase()
    .replace(/[.,]/g, ' ')
    .replace(/\b(inc|llc|l l c|corp|corporation|co|company|ltd|limited|the)\b/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function companyKey(raw) {
  let toks = normCore(raw).split(' ').filter(Boolean);
  let changed = true;
  while (changed && toks.length > 1) {
    changed = false;
    if (toks.length > 2 && LOC_SUFFIX_2.has(toks.slice(-2).join(' '))) { toks = toks.slice(0, -2); changed = true; continue; }
    if (LOC_SUFFIX_1.has(toks[toks.length - 1])) { toks = toks.slice(0, -1); changed = true; }
  }
  return toks.join(' ').trim() || normCore(raw) || null;
}
function prettyDisplay(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  for (;;) {
    const m = s.match(/^(.*\S)[\s,\-]+([A-Za-z]+)$/);
    if (m && LOC_SUFFIX_1.has(m[2].toLowerCase()) && m[1].trim().length >= 2) { s = m[1].trim(); continue; }
    break;
  }
  const m2 = s.match(/^(.*\S)[\s,\-]+([A-Za-z]+\s+[A-Za-z]+)$/);
  if (m2 && LOC_SUFFIX_2.has(m2[2].toLowerCase()) && m2[1].trim().length >= 2) s = m2[1].trim();
  return s || String(raw).trim();
}
// Owner-authoritative curated company overrides (Will, 2026-05-18). These are
// DECIDED — applied deterministically (NOT staged for review). Sites still
// split by event address, so BCG/WLRK get "<display> — <City>, <ST>" labels.
function resolveCompany(rawName) {
  const base = companyKey(rawName);
  if (!base) return null;
  const t = base.split(' ');
  // BCG == Boston Consulting Group (+ any city, incl. "BCGLA" no-space) -> "bcg"
  if (/^bcg/.test(base) || base.includes('boston consulting group')) {
    return { key: 'bcg', display: 'BCG' };
  }
  // WLRK == Wachtell Lipton Rosen & Katz -> company "wlrk"
  if (base === 'wlrk' || base.includes('wachtell')) {
    return { key: 'wlrk', display: 'WLRK' };
  }
  // Shortcut x Baxter of California x Banana Republic -> "Baxter x BR" (pop-up).
  // Resolved away from the "shortcut" prefix BEFORE the internal check, so this
  // co-brand stays a real client and is NOT flagged internal.
  if (base.includes('baxter') && base.includes('banana republic')) {
    return { key: 'baxter x br', display: 'Baxter x BR' };
  }
  // DraftKings — any office/city -> one company "DraftKings". Sites split by
  // event address (folds in "DraftKings Boston" etc.).
  if (t[0] === 'draftkings') {
    return { key: 'draftkings', display: 'DraftKings' };
  }
  return { key: base, display: null };
}

function emailDomain(e) {
  if (!e || typeof e !== 'string') return null;
  const m = e.toLowerCase().trim().match(/@([^@\s]+)$/);
  return m ? m[1] : null;
}
// Shortcut's own activations/popups (curated): not a client. "baxter x br"
// is already resolved away from the "shortcut" prefix, so it is NOT internal.
// Shortcut's own activations + QA-artifact test names — not real prospects.
const isInternalKey = (k) => typeof k === 'string' && (
  k === 'shortcut' || k.startsWith('shortcut ')
  || k === 'test' || k.startsWith('test ') || k.includes('claude test'));

// Curated venues / coworking / events-industry — real revenue, NOT ICP.
function specialHandling(k) {
  if (typeof k !== 'string') return null;
  if (k === 'wework' || k.startsWith('wework ')) return 'venue';
  if (k === 'industrious' || k.startsWith('industrious ')) return 'venue';
  if (k.startsWith('yard bryant')) return 'venue';
  if (k === 'bisnow' || k.startsWith('bisnow ')) return 'venue';
  return null;
}

const titleCase = (s) => s.split(' ').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');

// City canonicalizer (deterministic, like canonState). Collapses spelling /
// case / abbreviation variants of the SAME city. Genuinely distinct places
// (Brooklyn, Manhattan Beach, Cambridge) are left separate on purpose.
const CITY_ALIASES = {
  'new york': 'New York', 'new york city': 'New York', nyc: 'New York',
  ny: 'New York', manhattan: 'New York', 'new york ny': 'New York',
  'san francisco': 'San Francisco', sf: 'San Francisco',
  'san francisco bay area': 'San Francisco', 'bay area': 'San Francisco',
  'los angeles': 'Los Angeles', la: 'Los Angeles',
};
function canonCity(c) {
  if (!c) return null;
  let s = String(c).trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.,]+$/, '').trim();
  if (s.includes(',')) s = s.split(',')[0].trim(); // "new york, ny" -> "new york"
  if (!s) return null;
  return CITY_ALIASES[s] || titleCase(s);
}
// When an event name lacks a city but ends in a known city word, recover it
// (used only as a fallback when the address has no city).
function nameCity(raw) {
  const toks = normCore(raw).split(' ').filter(Boolean);
  if (toks.length >= 2 && toks.slice(-2).join(' ') === 'las vegas') return 'Las Vegas';
  if (toks.length >= 2 && CITY_WORDS.has(toks[toks.length - 1])) return titleCase(toks[toks.length - 1]);
  return null;
}
const uniq = (a) => [...new Set(a.filter((v) => v != null && v !== ''))];
const ts = (v) => (v ? new Date(v).getTime() : null);
const mode = (arr) => {
  const m = new Map();
  for (const v of arr) if (v != null && v !== '') m.set(v, (m.get(v) || 0) + 1);
  let best = null;
  let bc = -1;
  for (const [v, c] of m) if (c > bc || (c === bc && String(v).length > String(best).length)) { best = v; bc = c; }
  return best;
};

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function readEvents() {
  const cols = [
    'parse_object_id', 'client_name', 'status', 'start_time',
    'address_city', 'address_state', 'service_offerings', 'service_categories',
    'category', 'payment', 'mobile_revenue', 'contact_name', 'contact_email',
    'contact_phone', 'contacts_raw', 'is_test_event',
  ].join(',');
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('crm_events').select(cols).range(from, from + 999);
    if (error) throw new Error(`select crm_events: ${error.message}`);
    out.push(...data);
    log(`  read ${out.length} events`);
    if (data.length < 1000) break;
  }
  return out;
}

function collectContacts(evs) {
  const seen = new Set();
  const emails = [];
  const contacts = [];
  for (const e of evs) {
    const cs = [{ name: e.contact_name, email: e.contact_email, phone: e.contact_phone },
      ...(Array.isArray(e.contacts_raw) ? e.contacts_raw : [])];
    for (const c of cs) {
      const em = (c?.email || '').toLowerCase().trim();
      if (em) emails.push(em);
      const id = em || `${c?.name || ''}|${c?.phone || ''}`;
      if (id && !seen.has(id) && contacts.length < 20) {
        seen.add(id);
        contacts.push({ name: c?.name || null, email: c?.email || null, phone: c?.phone || null });
      }
    }
  }
  const ue = uniq(emails);
  return { contact_emails: ue, contact_domains: uniq(ue.map(emailDomain)), contacts };
}

function build(events) {
  // 1. group events by (companyKey, siteKey)
  const companies = new Map(); // key -> { evs, sites: Map(siteKey -> evs) }
  const forcedDisplay = new Map(); // curated-override display names
  for (const e of events) {
    // Test events are kept (they = a demo reached). is_internal QA names are
    // still excluded downstream via the real-cohort filter.
    const r = resolveCompany(e.client_name);
    if (!r) continue;
    const ck = r.key;
    if (r.display) forcedDisplay.set(ck, r.display);
    const st = canonState(e.address_state);
    const city = canonCity(e.address_city || nameCity(e.client_name));
    const siteKey = `${ck}|${st || ''}|${city || ''}`;
    if (!companies.has(ck)) companies.set(ck, { evs: [], sites: new Map() });
    const c = companies.get(ck);
    c.evs.push(e);
    if (!c.sites.has(siteKey)) c.sites.set(siteKey, { city, state: st, evs: [] });
    c.sites.get(siteKey).evs.push(e);
  }

  // 2. build company + site records
  const companyRows = [];
  const siteRows = [];
  for (const [ck, c] of companies) {
    const evs = c.evs;
    const completed = evs.filter((e) => e.status === 'Completed' && e.is_test_event !== true);
    const testEvents = evs.filter((e) => e.is_test_event === true);
    const cancelled = evs.filter((e) => e.status === 'Cancelled');
    const pending = evs.filter((e) => e.status === 'Pending');
    const nonCanc = evs.filter((e) => e.status !== 'Cancelled');
    const startsAll = nonCanc.map((e) => ts(e.start_time)).filter(Boolean);
    const compTimes = completed.map((e) => ts(e.start_time)).filter(Boolean);
    // reached a demo but never a real completed event = high-intent loss
    const demoedNotClosed = completed.length === 0 && testEvents.length >= 1;
    // recency from completed times, else fall back to demo (test) times
    const recencyTimes = compTimes.length
      ? compTimes : testEvents.map((e) => ts(e.start_time)).filter(Boolean);
    const c12 = compTimes.filter((t) => NOW - t <= 365 * DAY).length;
    const c24 = compTimes.filter((t) => NOW - t <= 730 * DAY).length;
    const lastC = recencyTimes.length ? Math.max(...recencyTimes) : null;
    const ageDays = lastC == null ? null : (NOW - lastC) / DAY;
    const activityStatus = lastC == null ? 'never_completed'
      : ageDays <= ACTIVE_DAYS ? 'active'
        : ageDays <= LAPSED_DAYS ? 'lapsed' : 'churned';

    // sites with their own first-event timing
    const sitesArr = [];
    for (const [sk, s] of c.sites) {
      const sCompleted = s.evs.filter((e) => e.status === 'Completed');
      const sStarts = s.evs.filter((e) => e.status !== 'Cancelled').map((e) => ts(e.start_time)).filter(Boolean);
      const sCompT = sCompleted.map((e) => ts(e.start_time)).filter(Boolean);
      const ctc = collectContacts(s.evs);
      sitesArr.push({
        site_key: sk,
        company_key: ck,
        site_label: `${forcedDisplay.get(ck) || prettyDisplay(mode(s.evs.map((e) => e.client_name)))} — ${s.city || '(city unknown)'}`,
        city: s.city,
        state: s.state,
        total_events: s.evs.length,
        completed_events: sCompleted.length,
        cancelled_events: s.evs.filter((e) => e.status === 'Cancelled').length,
        first_event_at: sStarts.length ? new Date(Math.min(...sStarts)).toISOString() : null,
        last_event_at: sStarts.length ? new Date(Math.max(...sStarts)).toISOString() : null,
        last_completed_at: sCompT.length ? new Date(Math.max(...sCompT)).toISOString() : null,
        ...ctc,
      });
    }
    siteRows.push(...sitesArr);

    // trajectory from per-site first-event ordering
    const siteFirsts = sitesArr.map((s) => ts(s.first_event_at)).filter(Boolean).sort((a, b) => a - b);
    let trajectory;
    let expansionDays = null;
    if (demoedNotClosed) trajectory = 'demoed_not_closed';
    else if (completed.length <= 1) trajectory = 'one_off';
    else if (sitesArr.length === 1) trajectory = 'single_site_deep';
    else {
      // expander + multi_site_flat merged: "grew beyond one office" IS the
      // signal (DraftKings slow, BCG fast — both qualify). Speed is kept as
      // the site_expansion_days attribute, NOT the classifier gate.
      expansionDays = siteFirsts.length >= 2 ? Math.round((siteFirsts[1] - siteFirsts[0]) / DAY) : null;
      trajectory = 'multi_site_grower';
    }

    const etMix = {};
    for (const e of evs) {
      const t = e.category || 'Unknown';
      etMix[t] = (etMix[t] || 0) + 1;
    }

    const ctc = collectContacts(evs);
    companyRows.push({
      canonical_key: ck,
      display_name: forcedDisplay.get(ck) || prettyDisplay(mode(evs.map((e) => e.client_name))),
      aliases: uniq(evs.map((e) => e.client_name)),
      is_internal: isInternalKey(ck),
      special_handling: specialHandling(ck),
      primary_event_type: mode(evs.map((e) => e.category || 'Unknown')),
      event_type_mix: etMix,
      total_sites: sitesArr.length,
      total_events: evs.length,
      completed_events: completed.length,
      cancelled_events: cancelled.length,
      pending_events: pending.length,
      is_recurring: completed.length >= 2,
      first_event_at: startsAll.length ? new Date(Math.min(...startsAll)).toISOString() : null,
      last_event_at: startsAll.length ? new Date(Math.max(...startsAll)).toISOString() : null,
      last_completed_at: compTimes.length ? new Date(Math.max(...compTimes)).toISOString() : null,
      tenure_days: startsAll.length ? Math.round((Math.max(...startsAll) - Math.min(...startsAll)) / DAY) : null,
      trajectory,
      site_expansion_days: expansionDays,
      test_events: testEvents.length,
      demoed_not_closed: demoedNotClosed,
      activity_status: activityStatus,
      completed_last_12mo: c12,
      completed_last_24mo: c24,
      service_titles: uniq(evs.flatMap((e) => (Array.isArray(e.service_offerings) ? e.service_offerings.map((x) => x?.serviceTitle) : []))),
      service_categories: uniq([
        ...evs.flatMap((e) => (Array.isArray(e.service_categories) ? e.service_categories : [])),
        ...evs.map((e) => e.category),
      ]),
      top_category: mode(evs.map((e) => e.category)),
      states: uniq(evs.map((e) => canonState(e.address_state))),
      cities: uniq(evs.map((e) => canonCity(e.address_city || nameCity(e.client_name)))),
      primary_state: mode(evs.map((e) => canonState(e.address_state))),
      primary_city: mode(evs.map((e) => canonCity(e.address_city || nameCity(e.client_name)))),
      sum_payment_completed: completed.reduce((s, e) => s + (Number(e.payment) || 0), 0) || null,
      sum_mobile_revenue_completed: completed.reduce((s, e) => s + (Number(e.mobile_revenue) || 0), 0) || null,
      ...ctc,
    });
  }

  // 3. stage ambiguous merges (propose, never apply)
  const keys = new Set(companyRows.map((c) => c.canonical_key));
  const candidates = [];
  for (const ck of keys) {
    if (isInternalKey(ck)) continue; // internal activations are not review candidates
    const toks = ck.split(' ');
    // city-suffix site: "draftkings boston" where base "draftkings" exists
    if (toks.length >= 2 && CITY_WORDS.has(toks[toks.length - 1])) {
      const base = toks.slice(0, -1).join(' ');
      if (keys.has(base)) {
        candidates.push({
          candidate_type: 'city_suffix_site',
          raw_name: ck,
          proposed_company_key: base,
          evidence: { reason: 'prefix matches an existing company + trailing city word', city: toks[toks.length - 1] },
        });
      }
    }
  }
  // acronym alias: short single-token key whose letters are the initials of a multi-word key
  const multiWord = companyRows.filter((c) => c.canonical_key.includes(' '));
  for (const c of companyRows) {
    const k = c.canonical_key;
    if (isInternalKey(k) || k.includes(' ') || k.length < 2 || k.length > 6 || /\d/.test(k)) continue;
    for (const mw of multiWord) {
      const initials = mw.canonical_key.split(' ').filter((t) => !STOP.has(t)).map((t) => t[0]).join('');
      if (initials === k) {
        candidates.push({
          candidate_type: 'acronym_alias',
          raw_name: k,
          proposed_company_key: mw.canonical_key,
          evidence: { reason: 'acronym = initials of an existing multi-word company', target: mw.display_name },
        });
        break;
      }
    }
  }

  return { companyRows, siteRows, candidates };
}

function summarize(companyRows, siteRows, candidates) {
  const traj = {};
  for (const c of companyRows) traj[c.trajectory] = (traj[c.trajectory] || 0) + 1;
  const real = companyRows.filter((c) => !c.is_internal && !c.special_handling); // exclude internal + venues
  const growers = real.filter((c) => c.trajectory === 'multi_site_grower');
  const singleDeep = real.filter((c) => c.trajectory === 'single_site_deep');
  log('================ COMPANY GRAPH SUMMARY ================');
  const nInternal = companyRows.filter((c) => c.is_internal).length;
  const nVenue = companyRows.filter((c) => c.special_handling === 'venue').length;
  const nNoCity = siteRows.filter((s) => !s.city).length;
  log(`Companies: ${companyRows.length} (excluded from cohorts: ${nInternal} internal, ${nVenue} venue)   Sites: ${siteRows.length} (${nNoCity} missing city — flagged, not mislabeled)`);
  log(`  trajectory: ${JSON.stringify(traj)}`);
  const etByCompany = {};
  for (const c of companyRows) etByCompany[c.primary_event_type] = (etByCompany[c.primary_event_type] || 0) + 1;
  log(`  primary event type (companies): ${JSON.stringify(etByCompany)}`);
  log('  curated overrides (verify):');
  for (const k of ['bcg', 'wlrk', 'baxter x br']) {
    const c = companyRows.find((x) => x.canonical_key === k);
    if (c) {
      log(`    ${c.display_name}: ${c.completed_events} completed, ${c.total_sites} sites, type=${c.primary_event_type}, traj=${c.trajectory}, site#1->#2 gap=${c.site_expansion_days}d`);
      for (const s of siteRows.filter((s) => s.company_key === k)) log(`        site: ${s.site_label} (${s.completed_events} completed)`);
    } else log(`    [${k}] not found`);
  }
  const am = {};
  for (const c of real) am[c.activity_status] = (am[c.activity_status] || 0) + 1;
  log(`  recency (real cohort): ${JSON.stringify(am)}`);
  const playA = singleDeep.filter((c) => c.activity_status === 'active');
  log(`  >> MULTI-SITE GROWERS: ${growers.length} total — ${growers.filter((c) => c.activity_status === 'active').length} still active (clone the active ones; expansion speed = site_expansion_days attribute, not a gate)`);
  log(`  >> Play A pool (single-site-deep AND active): ${playA.length}  [was ${singleDeep.length} ignoring recency — recency matters]`);
  const demoed = real.filter((c) => c.demoed_not_closed);
  log(`  >> DEMOED-NOT-CLOSED: ${demoed.length} — reached a demo, never converted (loss-analysis + lookalike fuel); ${demoed.filter((c) => c.activity_status === 'active').length} demoed recently`);
  log('  top multi-site growers by sites served (with recency):');
  for (const c of [...growers].sort((a, b) => b.total_sites - a.total_sites).slice(0, 8)) {
    log(`    ${c.display_name}: ${c.total_sites} sites, ${c.completed_events}c (24mo=${c.completed_last_24mo}), last ${(c.last_completed_at || '').slice(0, 7) || '—'} → ${c.activity_status}  [${(c.cities || []).slice(0, 6).join(' / ')}]`);
  }
  log('  top companies by LIFETIME completed (note recency flag):');
  for (const c of [...real].sort((a, b) => b.completed_events - a.completed_events).slice(0, 10)) {
    log(`    ${String(c.completed_events).padStart(4)}c  ${c.display_name}  (24mo=${c.completed_last_24mo}, last ${(c.last_completed_at || '').slice(0, 7) || '—'} → ${c.activity_status}, ${c.trajectory})`);
  }
  log('  top companies by RECENT (last 24mo) completed:');
  for (const c of [...real].sort((a, b) => b.completed_last_24mo - a.completed_last_24mo).slice(0, 10)) {
    log(`    ${String(c.completed_last_24mo).padStart(3)}/24mo  ${c.display_name}  (lifetime ${c.completed_events}c, ${c.trajectory}, ${c.activity_status})`);
  }
  const venues = companyRows.filter((c) => c.special_handling === 'venue');
  log(`  VENUE-flagged (${venues.length}) — verify none are real clients:`);
  for (const v of [...venues].sort((a, b) => b.completed_events - a.completed_events).slice(0, 20)) {
    log(`    ${String(v.completed_events).padStart(3)}c  ${v.display_name}  (key="${v.canonical_key}")`);
  }
  const byType = {};
  for (const c of candidates) byType[c.candidate_type] = (byType[c.candidate_type] || 0) + 1;
  log(`  STAGED for human review (NOT merged): ${JSON.stringify(byType)}`);
  for (const c of candidates.slice(0, 8)) {
    log(`    [${c.candidate_type}] "${c.raw_name}" -> "${c.proposed_company_key}"`);
  }
  log('======================================================');
}

async function upsert(table, rows, conflict, ignoreDup = false) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await sb.from(table).upsert(rows.slice(i, i + 500), { onConflict: conflict, ignoreDuplicates: ignoreDup });
    if (error) throw new Error(`upsert ${table}: ${error.message}`);
    log(`  ${table}: ${Math.min(i + 500, rows.length)}/${rows.length}`);
  }
}
async function selectMap(table, keyCol) {
  const m = new Map();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select(`id, ${keyCol}`).range(from, from + 999);
    if (error) throw new Error(`select ${table}: ${error.message}`);
    for (const r of data) m.set(r[keyCol], r.id);
    if (data.length < 1000) break;
  }
  return m;
}

// Orphan reconcile: rows in crm_companies whose canonical_key the CURRENT
// build no longer produces = superseded by a normalization change (e.g. the
// accent fold turned "schr dinger" into "schrodinger"). Lists always; only
// deletes on a live run explicitly invoked with --reconcile.
async function reconcile(companyRows) {
  const produced = new Set(companyRows.map((c) => c.canonical_key));
  const existing = [];
  for (let f = 0; ; f += 1000) {
    const { data, error } = await sb.from('crm_companies')
      .select('canonical_key, display_name, completed_events, is_internal, special_handling, ext_enriched_at')
      .range(f, f + 999);
    if (error) throw new Error(`select crm_companies: ${error.message}`);
    existing.push(...data);
    if (data.length < 1000) break;
  }
  const orphans = existing.filter((r) => !produced.has(r.canonical_key));
  log(`\n  RECONCILE: ${existing.length} rows in crm_companies, ${produced.size} produced this build → ${orphans.length} orphan(s) (old keys a normalization change replaced)`);
  for (const o of [...orphans].sort((a, b) => b.completed_events - a.completed_events)) {
    const tag = o.is_internal ? 'internal' : o.special_handling ? 'venue' : 'COHORT';
    log(`    "${o.display_name}"  key="${o.canonical_key}"  ${o.completed_events}c  [${tag}]${o.ext_enriched_at ? ' (has stranded enrichment)' : ''}`);
  }
  if (orphans.length && !DRY && RECONCILE) {
    const keys = orphans.map((o) => o.canonical_key);
    for (let i = 0; i < keys.length; i += 100) {
      const { error } = await sb.from('crm_companies').delete().in('canonical_key', keys.slice(i, i + 100));
      if (error) throw new Error(`reconcile delete: ${error.message}`);
    }
    log(`  ✅ Deleted ${orphans.length} superseded orphan rows.`);
  } else if (orphans.length) {
    log(`  (no deletion — ${DRY ? 'dry run' : 'pass --reconcile on a live run to remove these'})`);
  }
}

(async () => {
  log(DRY ? 'DRY RUN — no writes' : 'LIVE RUN — will write the company graph');
  log('Reading crm_events...');
  const events = await readEvents();
  log(`Building graph from ${events.length} events...`);
  const { companyRows, siteRows, candidates } = build(events);

  if (!DRY) {
    log('Upserting crm_companies...');
    await upsert('crm_companies', companyRows, 'canonical_key');
    const companyId = await selectMap('crm_companies', 'canonical_key');

    log('Upserting crm_sites...');
    const sitesWithFk = siteRows
      .map(({ company_key, ...rest }) => ({ ...rest, company_id: companyId.get(company_key) }))
      .filter((s) => s.company_id);
    await upsert('crm_sites', sitesWithFk, 'site_key');
    const siteId = await selectMap('crm_sites', 'site_key');

    log('Linking crm_events -> company/site...');
    const updates = [];
    for (const e of events) {
      if (e.is_test_event === true) continue;
      const ck = companyKey(e.client_name);
      if (!ck) continue;
      const sk = `${ck}|${canonState(e.address_state) || ''}|${e.address_city || ''}`;
      updates.push({ po: e.parse_object_id, company_id: companyId.get(ck) || null, site_id: siteId.get(sk) || null });
    }
    for (let i = 0; i < updates.length; i += 100) {
      await Promise.all(updates.slice(i, i + 100).map((u) =>
        sb.from('crm_events').update({ company_id: u.company_id, site_id: u.site_id, resolved_via: 'deterministic' }).eq('parse_object_id', u.po)));
      log(`  linked ${Math.min(i + 100, updates.length)}/${updates.length}`);
    }

    if (candidates.length) {
      log('Staging alias candidates (insert-if-new; never clobbers human decisions)...');
      await upsert('crm_alias_candidates', candidates, 'candidate_type,raw_name', true);
    }
  }

  await reconcile(companyRows);
  summarize(companyRows, siteRows, candidates);
  log('DONE');
})().catch((err) => {
  console.error('BUILD_ERROR:', err.message);
  process.exit(1);
});
