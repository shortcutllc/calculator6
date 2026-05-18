/**
 * backfill-parse-crm.mjs — read-only Parse -> Supabase historical backfill.
 *
 * Pulls ALL Parse `Event` (~2.45k) and `EventRequest` (538) into the
 * crm_events / crm_event_requests tables, idempotently, then reconstructs the
 * EventRequest -> Event link (no FK exists in Parse). Prints a first-run
 * data-quality report. Read-only against Parse (login + GET only).
 *
 * Run from the repo root with env injected from Netlify (same as the probe):
 *
 *   cd /Users/willnewton/Documents/GitHub/calculator6
 *   source ~/.nvm/nvm.sh
 *   export PARSE_SERVER_URL="$(netlify env:get PARSE_SERVER_URL)" \
 *          PARSE_APP_ID="$(netlify env:get PARSE_APP_ID)" \
 *          PARSE_ADMIN_USERNAME="$(netlify env:get PARSE_ADMIN_USERNAME)" \
 *          PARSE_ADMIN_PASSWORD="$(netlify env:get PARSE_ADMIN_PASSWORD)" \
 *          SUPABASE_URL="$(netlify env:get VITE_SUPABASE_URL)" \
 *          SUPABASE_SERVICE_ROLE_KEY="$(netlify env:get SUPABASE_SERVICE_ROLE_KEY)"
 *   node .claude/worktrees/<wt>/scripts/backfill-parse-crm.mjs [--dry]
 *
 * --dry : fetch + transform + print the data-quality report, write nothing.
 */

import { createClient } from '@supabase/supabase-js';

const DRY = process.argv.includes('--dry');

const {
  PARSE_SERVER_URL,
  PARSE_APP_ID,
  PARSE_ADMIN_USERNAME,
  PARSE_ADMIN_PASSWORD,
} = process.env;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function requireEnv() {
  const missing = [];
  if (!PARSE_SERVER_URL) missing.push('PARSE_SERVER_URL');
  if (!PARSE_APP_ID) missing.push('PARSE_APP_ID');
  if (!PARSE_ADMIN_USERNAME) missing.push('PARSE_ADMIN_USERNAME');
  if (!PARSE_ADMIN_PASSWORD) missing.push('PARSE_ADMIN_PASSWORD');
  if (!DRY && !SUPABASE_URL) missing.push('SUPABASE_URL/VITE_SUPABASE_URL');
  if (!DRY && !SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (missing.length) {
    console.error('MISSING_ENV:', missing.join(', '));
    process.exit(2);
  }
}

const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Parse auth (proven pattern) ----------

let sessionToken = null;

async function parseLogin() {
  const res = await fetch(`${PARSE_SERVER_URL}/login`, {
    method: 'POST',
    headers: { 'X-Parse-Application-Id': PARSE_APP_ID, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: PARSE_ADMIN_USERNAME, password: PARSE_ADMIN_PASSWORD }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(`Parse login failed ${res.status}: ${e.error || res.statusText}`);
  }
  sessionToken = (await res.json()).sessionToken;
  return sessionToken;
}

async function getToken() {
  return sessionToken || parseLogin();
}

// ---------- Paginated read (no `count` permission; skip until short page) ----------

async function fetchAll(className, keys) {
  const PAGE = 1000;
  const out = [];
  let skip = 0;

  for (;;) {
    const params = new URLSearchParams({
      where: '{}',
      keys,
      limit: String(PAGE),
      skip: String(skip),
      order: 'createdAt,objectId', // stable composite sort -> no skip drift
    });

    let attempt = 0;
    let page;
    for (;;) {
      const tkn = await getToken();
      const res = await fetch(`${PARSE_SERVER_URL}/classes/${className}?${params}`, {
        headers: {
          'X-Parse-Application-Id': PARSE_APP_ID,
          'X-Parse-Session-Token': tkn,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) { page = (await res.json()).results || []; break; }

      const err = await res.json().catch(() => ({}));
      if (err.code === 209) { // session expired -> re-auth once and retry
        sessionToken = null;
        await parseLogin();
        continue;
      }
      if (res.status === 429 && attempt < 5) { // rate limited -> backoff
        attempt += 1;
        await sleep(Math.min(60000, 1000 * 2 ** attempt));
        continue;
      }
      throw new Error(`Parse query ${className} failed ${res.status}: ${err.error || res.statusText}`);
    }

    out.push(...page);
    log(`  ${className}: fetched ${out.length} (page skip=${skip}, size=${page.length})`);
    if (page.length < PAGE) break;
    skip += PAGE;
    await sleep(300); // rate-limit courtesy
  }
  return out;
}

// ---------- Helpers ----------

function normalizeName(s) {
  if (!s || typeof s !== 'string') return null;
  return s
    .toLowerCase()
    .replace(/[.,]/g, ' ')
    .replace(/\b(inc|llc|l\.l\.c|corp|corporation|co|company|ltd|limited|the)\b/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || null;
}

function emailDomain(email) {
  if (!email || typeof email !== 'string') return null;
  const m = email.toLowerCase().trim().match(/@([^@\s]+)$/);
  return m ? m[1] : null;
}

function pDate(v) {
  const iso = v && typeof v === 'object' ? v.iso : v;
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function num(v) {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

// Sørensen–Dice bigram similarity for fuzzy company matching.
function dice(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const bigrams = (s) => {
    const m = new Map();
    for (let i = 0; i < s.length - 1; i += 1) {
      const g = s.slice(i, i + 2);
      m.set(g, (m.get(g) || 0) + 1);
    }
    return m;
  };
  const A = bigrams(a);
  const B = bigrams(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const [g, c] of A) if (B.has(g)) inter += Math.min(c, B.get(g));
  return (2 * inter) / (a.length - 1 + (b.length - 1));
}

// Free / consumer email providers — corporate buyers rarely use these.
const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'ymail.com', 'hotmail.com', 'outlook.com',
  'live.com', 'msn.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com',
  'proton.me', 'protonmail.com', 'gmx.com', 'mail.com', 'comcast.net',
  'verizon.net', 'sbcglobal.net', 'att.net',
]);

function firstInt(s) {
  if (s == null) return null;
  const m = String(s).match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

// Read-only junk heuristics for EventRequest. Flags only — never auto-deletes;
// humans triage in /education. Real B2B inbound names a company on a work
// email for a multi-person event.
function junkSignals(req, phoneCounts, emailCounts) {
  const noCompany = !req.normalized_company;
  const freeEmail = req.email_domain ? FREE_EMAIL_DOMAINS.has(req.email_domain) : false;
  const individual = freeEmail && noCompany; // consumer / home-service client on the wrong form
  const np = firstInt(req.num_people);
  const tinyGroup = np != null && np <= 2;
  const dupPhone = !!(req.phone && (phoneCounts.get(req.phone) || 0) >= 4);
  const dupEmail = !!(req.email && (emailCounts.get((req.email || '').toLowerCase().trim()) || 0) >= 4);
  const blob = `${req.company || ''} ${req.other_info || ''}`;
  const hasUrl = /https?:\/\/|www\./i.test(blob);
  const gibberish = (req.company || '')
    .split(/\s+/)
    .some((t) => t.length >= 8 && !/[aeiou]/i.test(t));
  const likelyJunk = individual || dupPhone || dupEmail || hasUrl || gibberish;
  return { noCompany, freeEmail, individual, tinyGroup, dupPhone, dupEmail, hasUrl, gibberish, likelyJunk };
}

// ---------- Transforms ----------

const EVENT_KEYS = [
  'objectId', 'name', 'legacyName', 'description', 'sponsorName', 'contacts',
  'address', 'category', 'serviceOfferings', 'serviceCategories',
  'startTime', 'endTime', 'createdAt', 'updatedAt', 'status', 'paid',
  'cancelled', 'isTestEvent', 'barberHourlyRate', 'payment', 'mobileRevenue',
  'totalBarberPayments', 'mobileEventCode', 'eventLinkURL', 'isOutbound',
  'leadSalesperson',
].join(',');

const REQUEST_KEYS = [
  'objectId', 'firstName', 'lastName', 'email', 'company', 'phone',
  'location', 'type', 'numPeople', 'otherInfo', 'dateString',
  'createdAt', 'updatedAt',
].join(',');

function transformEvent(e) {
  const contacts = Array.isArray(e.contacts) ? e.contacts : [];
  const c0 = contacts[0] || {};
  const clientName = e.sponsorName || e.name || e.legacyName || null;
  return {
    parse_object_id: e.objectId,
    client_name: clientName,
    event_name: e.name || e.legacyName || null,
    description: e.description || null,
    contact_name: c0.name || null,
    contact_email: c0.email || null,
    contact_phone: c0.phone || null,
    contacts_raw: contacts.length ? contacts : null,
    address_street: e.address ? [e.address.street, e.address.unit].filter(Boolean).join(' ') || null : null,
    address_city: e.address?.city || null,
    address_state: e.address?.state || null,
    address_zip: e.address?.zip || null,
    address_coords: e.address?.coordinates || null,
    category: e.category || null,
    service_offerings: Array.isArray(e.serviceOfferings) ? e.serviceOfferings : null,
    service_categories: Array.isArray(e.serviceCategories) ? e.serviceCategories : null,
    start_time: pDate(e.startTime),
    end_time: pDate(e.endTime),
    parse_created_at: pDate(e.createdAt),
    parse_updated_at: pDate(e.updatedAt),
    status: e.status || null,
    paid: typeof e.paid === 'boolean' ? e.paid : null,
    cancelled: typeof e.cancelled === 'boolean' ? e.cancelled : null,
    is_test_event: typeof e.isTestEvent === 'boolean' ? e.isTestEvent : null,
    barber_hourly_rate: num(e.barberHourlyRate),
    payment: num(e.payment),
    mobile_revenue: num(e.mobileRevenue),
    total_barber_payments: num(e.totalBarberPayments),
    mobile_event_code: e.mobileEventCode || null,
    event_link_url: e.eventLinkURL || null,
    is_outbound: typeof e.isOutbound === 'boolean' ? e.isOutbound : null, // unreliable
    lead_salesperson: e.leadSalesperson || null, // unreliable
    normalized_client: normalizeName(clientName),
    raw: e,
  };
}

function transformRequest(r) {
  return {
    parse_object_id: r.objectId,
    first_name: r.firstName || null,
    last_name: r.lastName || null,
    email: r.email || null,
    company: r.company || null,
    phone: r.phone || null,
    location: r.location || null,
    request_type: r.type || null,
    num_people: r.numPeople != null ? String(r.numPeople) : null,
    other_info: r.otherInfo || null,
    date_string: r.dateString || null,
    parse_created_at: pDate(r.createdAt),
    parse_updated_at: pDate(r.updatedAt),
    normalized_company: normalizeName(r.company),
    email_domain: emailDomain(r.email),
    raw: r,
  };
}

// ---------- Supabase upsert (idempotent on parse_object_id) ----------

async function upsertBatch(sb, table, rows) {
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { error } = await sb
      .from(table)
      .upsert(slice, { onConflict: 'parse_object_id', ignoreDuplicates: false });
    if (error) throw new Error(`Supabase upsert ${table} failed: ${error.message}`);
    log(`  ${table}: upserted ${Math.min(i + CHUNK, rows.length)}/${rows.length}`);
  }
}

// ---------- EventRequest -> Event matching (reconstructed) ----------

const DAY = 86400000;
const WINDOW_FWD = 180 * DAY;
const SLACK_BACK = 1 * DAY;

function matchRequestToEvent(req, events) {
  const reqT = req.parse_created_at ? new Date(req.parse_created_at).getTime() : null;
  const inWindow = (ev) => {
    if (reqT == null) return true; // no request date -> don't time-gate
    const evT = ev.parse_created_at ? new Date(ev.parse_created_at).getTime() : null;
    if (evT == null) return true;
    return evT >= reqT - SLACK_BACK && evT <= reqT + WINDOW_FWD;
  };
  const earliest = (cands) =>
    cands.sort((a, b) => {
      const ta = a.parse_created_at ? Date.parse(a.parse_created_at) : Infinity;
      const tb = b.parse_created_at ? Date.parse(b.parse_created_at) : Infinity;
      return ta - tb;
    })[0];

  const email = (req.email || '').toLowerCase().trim();
  const last = (req.last_name || '').toLowerCase().trim();
  const nco = req.normalized_company;

  // Tier 1: exact email against any event contact email
  if (email) {
    const hits = events.filter(
      (ev) =>
        inWindow(ev) &&
        Array.isArray(ev.contacts_raw) &&
        ev.contacts_raw.some((c) => (c.email || '').toLowerCase().trim() === email),
    );
    if (hits.length) return { ev: earliest(hits), method: 'exact_email', conf: 0.95 };
  }

  // Tier 2: normalized company equal + last name present
  if (nco && last) {
    const hits = events.filter((ev) => {
      if (!inWindow(ev) || ev.normalized_client !== nco) return false;
      const hay = `${ev.client_name || ''} ${ev.contact_name || ''}`.toLowerCase();
      return hay.includes(last);
    });
    if (hits.length) return { ev: earliest(hits), method: 'company_lastname', conf: 0.8 };
  }

  // Tier 3: fuzzy company similarity + time window
  if (nco) {
    let best = null;
    let bestSim = 0;
    for (const ev of events) {
      if (!inWindow(ev) || !ev.normalized_client) continue;
      const sim = dice(nco, ev.normalized_client);
      if (sim >= 0.6 && sim > bestSim) { bestSim = sim; best = ev; }
    }
    if (best) return { ev: best, method: 'fuzzy_company_date', conf: Number(bestSim.toFixed(3)) };
  }

  return { ev: null, method: 'none', conf: 0 };
}

// ---------- Data-quality report ----------

function report(events, requests, matches) {
  const by = (arr, fn) => arr.reduce((m, x) => { const k = fn(x) ?? '∅'; m[k] = (m[k] || 0) + 1; return m; }, {});
  log('================ DATA-QUALITY REPORT ================');
  log(`Events: ${events.length}`);
  log('  by status:', JSON.stringify(by(events, (e) => e.status)));
  log(`  paid=true: ${events.filter((e) => e.paid === true).length}  paid=false/null: ${events.filter((e) => e.paid !== true).length}`);
  log(`  is_test_event=true: ${events.filter((e) => e.is_test_event === true).length}`);
  log(`  empty client_name: ${events.filter((e) => !e.client_name).length}`);
  log(`  usable geo (city AND state): ${events.filter((e) => e.address_city && e.address_state).length}/${events.length}`);
  log(`  distinct normalized_client: ${new Set(events.map((e) => e.normalized_client).filter(Boolean)).size}`);

  // is_outbound true/false/null split. populated != reliable: create-event.js
  // hardcodes false on every proposal-pipeline event -> auto-set noise.
  const ob = by(events, (e) => (e.is_outbound === true ? 'true' : e.is_outbound === false ? 'false' : 'null'));
  log(`  is_outbound split: ${JSON.stringify(ob)}  [false largely auto-set by create-event.js -> not attribution signal]`);
  const lsp = events.filter((e) => e.lead_salesperson).length;
  log(`  lead_salesperson populated: ${lsp}/${events.length} (~${((lsp / events.length) * 100).toFixed(1)}%) [sparse -> not reliable]`);

  // EventRequest junk signals (precomputed + persisted; humans triage in /education).
  const matchByPo = new Map(matches.map((m) => [m.parse_object_id, m]));
  const f = { noCompany: 0, freeEmail: 0, individual: 0, tinyGroup: 0, dupPhone: 0, dupEmail: 0, hasUrl: 0, gibberish: 0, likelyJunk: 0 };
  let junkMatched = 0;
  let cleanTotal = 0;
  let cleanMatched = 0;
  for (const r of requests) {
    const s = r.quality_flags || {};
    for (const k of Object.keys(f)) if (s[k]) f[k] += 1;
    const linked = (matchByPo.get(r.parse_object_id)?.method || 'none') !== 'none';
    if (s.likelyJunk) { if (linked) junkMatched += 1; }
    else { cleanTotal += 1; if (linked) cleanMatched += 1; }
  }
  log(`EventRequests: ${requests.length}  (with email: ${requests.filter((r) => r.email).length})`);
  log(`  no company: ${f.noCompany}   free-email: ${f.freeEmail}   tiny group (<=2 ppl): ${f.tinyGroup}`);
  log(`  individual/home-client (free-email + no company): ${f.individual}`);
  log(`  dup-phone cluster (>=4): ${f.dupPhone}   dup-email cluster (>=4): ${f.dupEmail}   URL in text: ${f.hasUrl}   gibberish company: ${f.gibberish}`);
  log(`  -> LIKELY JUNK (any of above): ${f.likelyJunk}/${requests.length} (${((f.likelyJunk / requests.length) * 100).toFixed(1)}%)`);
  log('  match method breakdown:', JSON.stringify(by(matches, (m) => m.method)));
  const linkedAll = matches.filter((m) => m.method !== 'none').length;
  log(`  linked (all): ${linkedAll}/${requests.length} (${((linkedAll / Math.max(1, requests.length)) * 100).toFixed(1)}%)`);
  log(`  linked among CLEAN (non-junk): ${cleanMatched}/${cleanTotal} (${((cleanMatched / Math.max(1, cleanTotal)) * 100).toFixed(1)}%)  <- truer inbound conversion`);
  log(`  junk that still matched (likely false positives to review): ${junkMatched}`);
  log(`  low-confidence (<0.7 -> /education review queue): ${matches.filter((m) => m.conf > 0 && m.conf < 0.7).length}`);
  log('====================================================');
}

// ---------- Main ----------

(async () => {
  requireEnv();
  log(DRY ? 'DRY RUN — no writes' : 'LIVE RUN — will upsert to Supabase');

  await parseLogin();
  log('Parse login OK');

  log('Fetching Event...');
  const rawEvents = await fetchAll('Event', EVENT_KEYS);
  log('Fetching EventRequest...');
  const rawRequests = await fetchAll('EventRequest', REQUEST_KEYS);

  const events = rawEvents.map(transformEvent);
  const requests = rawRequests.map(transformRequest);
  log(`Transformed: ${events.length} events, ${requests.length} requests`);

  // Attach read-only quality flags so the live upsert persists them
  // (is_likely_junk + quality_flags). Flags only — humans triage in /education.
  {
    const phoneCounts = new Map();
    const emailCounts = new Map();
    for (const r of requests) {
      if (r.phone) phoneCounts.set(r.phone, (phoneCounts.get(r.phone) || 0) + 1);
      if (r.email) { const k = r.email.toLowerCase().trim(); emailCounts.set(k, (emailCounts.get(k) || 0) + 1); }
    }
    for (const r of requests) {
      const s = junkSignals(r, phoneCounts, emailCounts);
      r.quality_flags = s;
      r.is_likely_junk = s.likelyJunk;
    }
  }

  const sb = DRY
    ? null
    : createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  if (!DRY) {
    log('Upserting crm_events...');
    await upsertBatch(sb, 'crm_events', events);
    log('Upserting crm_event_requests...');
    await upsertBatch(sb, 'crm_event_requests', requests);
  }

  // Build the id map for matching. Live: re-select the DB-assigned ids
  // (upsert keeps existing ids on conflict). Dry: synthesize placeholder ids.
  let eventMatchRows;
  if (DRY) {
    eventMatchRows = events.map((e) => ({
      id: `dry:${e.parse_object_id}`,
      parse_object_id: e.parse_object_id,
      client_name: e.client_name,
      contact_name: e.contact_name,
      contacts_raw: e.contacts_raw,
      normalized_client: e.normalized_client,
      parse_created_at: e.parse_created_at,
    }));
  } else {
    eventMatchRows = [];
    const SEL = 1000;
    for (let from = 0; ; from += SEL) {
      const { data, error } = await sb
        .from('crm_events')
        .select('id, parse_object_id, client_name, contact_name, contacts_raw, normalized_client, parse_created_at')
        .range(from, from + SEL - 1);
      if (error) throw new Error(`Supabase select crm_events failed: ${error.message}`);
      eventMatchRows.push(...data);
      if (data.length < SEL) break;
    }
  }

  log('Matching EventRequest -> Event...');
  const matches = [];
  const updates = [];
  for (const req of requests) {
    const { ev, method, conf } = matchRequestToEvent(req, eventMatchRows);
    matches.push({ parse_object_id: req.parse_object_id, method, conf });
    updates.push({
      parse_object_id: req.parse_object_id,
      matched_event_id: ev && !String(ev.id).startsWith('dry:') ? ev.id : null,
      match_method: method,
      match_confidence: conf,
    });
  }

  if (!DRY) {
    log('Writing match results...');
    const CHUNK = 100;
    for (let i = 0; i < updates.length; i += CHUNK) {
      const slice = updates.slice(i, i + CHUNK);
      await Promise.all(
        slice.map((u) =>
          sb
            .from('crm_event_requests')
            .update({
              matched_event_id: u.matched_event_id,
              match_method: u.match_method,
              match_confidence: u.match_confidence,
            })
            .eq('parse_object_id', u.parse_object_id),
        ),
      );
      log(`  match results: ${Math.min(i + CHUNK, updates.length)}/${updates.length}`);
    }
  }

  report(events, requests, matches);
  log('DONE');
})().catch((err) => {
  console.error('BACKFILL_ERROR:', err.message);
  process.exit(1);
});
