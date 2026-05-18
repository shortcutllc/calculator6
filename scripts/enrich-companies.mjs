/**
 * enrich-companies.mjs — Apollo company (organization) enrichment for the CRM
 * graph, with the openclaw two-phase TOKEN GATE ported verbatim in spirit.
 *
 * Endpoint: GET /api/v1/organizations/enrich?domain=  (1 credit per call that
 * returns an org — success OR wrong_domain. not-found / no-domain / error = 0.)
 *
 * PHASE 1 (default, NO SPEND): pick priority companies, drop ones without a
 *   real domain or already cached, print the credit ceiling + a random token,
 *   write pending_company_enrichment.json, exit. No Apollo calls.
 * PHASE 2 (--confirm --token X): only runs if token matches Phase 1's and the
 *   pending file isn't stale (>30min). Enriches, applies the namesMatch
 *   integrity guard, writes crm_companies.ext_*, logs credits, caches results.
 *
 *   cd /Users/willnewton/Documents/GitHub/calculator6
 *   source ~/.nvm/nvm.sh
 *   export SUPABASE_URL="$(grep '^VITE_SUPABASE_URL=' .env | cut -d= -f2- | tr -d '"'"'"' \r\n')" \
 *          SUPABASE_SERVICE_ROLE_KEY="$(netlify env:get SUPABASE_SERVICE_ROLE_KEY | tr -d ' \r\n')"
 *   # Phase 1 (free):
 *   node .claude/worktrees/<wt>/scripts/enrich-companies.mjs --limit 20
 *   # Phase 2 (spends, capped). APOLLO_API_KEY lives in openclaw's .env,
 *   # NOT Netlify (Apollo is the openclaw cold-outreach stack):
 *   export APOLLO_API_KEY="$(grep '^APOLLO_API_KEY=' /Users/willnewton/.openclaw/workspace/.env | cut -d= -f2- | tr -d ' \r\n')"
 *   node .claude/worktrees/<wt>/scripts/enrich-companies.mjs --confirm --token <token> --budget 20
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { randomBytes } from 'crypto';
import { createClient } from '@supabase/supabase-js';

const ROOT = '/Users/willnewton/Documents/GitHub/calculator6';
const PENDING_FILE = `${ROOT}/pending_company_enrichment.json`;
const CACHE_FILE = `${ROOT}/apollo_company_cache.json`;
const CREDIT_LOG = `${ROOT}/apollo_company_credit_log.json`;
const DAILY_CREDIT_HARD_CAP = 300; // backstop; company enrichment is low-volume

const args = process.argv.slice(2);
const argv = (n, d) => { const i = args.indexOf('--' + n); return i === -1 ? d : (args[i + 1] || d); };
const LIMIT = parseInt(argv('limit', '20'), 10);
const BUDGET = argv('budget', null) ? parseInt(argv('budget', '0'), 10) : null;
const CONFIRM = args.includes('--confirm');
const TOKEN = argv('token', null);

const URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const AK = (process.env.APOLLO_API_KEY || '').trim();
if (!/^https?:\/\//i.test(URL) || !KEY) { console.error('MISSING_ENV: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY'); process.exit(2); }
if (CONFIRM && !AK) { console.error('MISSING_ENV: APOLLO_API_KEY (required for Phase 2 --confirm)'); process.exit(2); }

const sb = createClient(URL, KEY, { auth: { persistSession: false } });
const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const FREE = new Set(['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com',
  'aol.com', 'me.com', 'msn.com', 'live.com', 'proton.me', 'protonmail.com', 'gmx.com',
  'mail.com', 'comcast.net', 'verizon.net', 'sbcglobal.net', 'att.net']);
// Shortcut's own domains — event contacts are often OUR salesperson, so these
// pollute contact_domains. Never enrich these (would just look up Shortcut).
const BLOCK = new Set(['getshortcut.co', 'shortcut.co', 'shortcutpros.com', 'admin.shortcutpros.com']);

// ---- ported verbatim from search_with_cache.js ----
function generateToken() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  const b = randomBytes(5);
  let t = '';
  for (let i = 0; i < 5; i++) t += chars[b[i] % chars.length];
  return t;
}
function loadCreditLog() {
  try { return JSON.parse(readFileSync(CREDIT_LOG, 'utf8')); } catch { return { entries: [] }; }
}
function creditsUsedToday() {
  const today = new Date().toISOString().slice(0, 10);
  return loadCreditLog().entries.filter((e) => e.date === today).reduce((s, e) => s + e.credits, 0);
}
function logCreditsUsed(credits, description) {
  const l = loadCreditLog();
  l.entries.push({ date: new Date().toISOString().slice(0, 10), time: new Date().toISOString(), credits, description });
  const cutoff = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  l.entries = l.entries.filter((e) => e.date >= cutoff);
  writeFileSync(CREDIT_LOG, JSON.stringify(l, null, 2));
}
// ---- ported from enrich_companies_by_domain.js ----
function namesMatch(ours, apollo) {
  if (!ours || !apollo) return false;
  const a = ours.toLowerCase().replace(/[^a-z0-9]/g, '');
  const b = apollo.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (a.includes(b) || b.includes(a)) return true;
  if (a.length >= 6 && b.length >= 6 && a.slice(0, 6) === b.slice(0, 6)) return true;
  return false;
}
async function enrichDomain(domain) {
  const r = await fetch(`https://api.apollo.io/api/v1/organizations/enrich?domain=${encodeURIComponent(domain)}`,
    { headers: { 'x-api-key': AK } });
  return r.json();
}

function loadCache() { try { return JSON.parse(readFileSync(CACHE_FILE, 'utf8')); } catch { return {}; } }
function pickDomain(domains) {
  for (const d of domains || []) {
    const dd = String(d).toLowerCase().replace(/^www\./, '').trim();
    if (dd && dd.includes('.') && !FREE.has(dd) && !BLOCK.has(dd)) return dd;
  }
  return null;
}

// Priority: active multi-site growers > active Play A > recent demoed > other active
function priorityRank(c) {
  const act = c.activity_status === 'active';
  if (act && c.trajectory === 'multi_site_grower') return 0;
  if (act && c.trajectory === 'single_site_deep') return 1;
  if (c.demoed_not_closed && (c.activity_status === 'active' || c.activity_status === 'lapsed')) return 2;
  if (act) return 3;
  return 4;
}

async function loadCompanies() {
  const out = [];
  for (let f = 0; ; f += 1000) {
    const { data, error } = await sb.from('crm_companies')
      .select('id, canonical_key, display_name, contact_domains, is_internal, special_handling, trajectory, activity_status, demoed_not_closed, ext_enriched_at')
      .range(f, f + 999);
    if (error) throw new Error(`crm_companies: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

async function phase1() {
  const cache = loadCache();
  const companies = await loadCompanies();
  const candidates = companies
    .filter((c) => !c.is_internal && !c.special_handling && !c.ext_enriched_at)
    .map((c) => ({ ...c, _domain: pickDomain(c.contact_domains) }))
    .filter((c) => c._domain && !cache[c._domain])
    .sort((a, b) => priorityRank(a) - priorityRank(b))
    .slice(0, LIMIT);

  const ceiling = candidates.length; // worst case: every one returns an org = 1 credit each
  const usedToday = creditsUsedToday();
  log(`\n  ┌──────────────────────────────────────────────────────┐`);
  log(`  │  COMPANY ENRICHMENT — PHASE 1 (no credits spent)     │`);
  log(`  │  Priority candidates (limit ${String(LIMIT).padStart(4)}):      ${String(candidates.length).padStart(5)}        │`);
  log(`  │  Credit CEILING (worst case, 1/co):  ${String(ceiling).padStart(5)}        │`);
  log(`  │  (real spend lower: not-found/no-domain = 0 credits) │`);
  log(`  │  Credits used today:                 ${String(usedToday).padStart(5)}        │`);
  log(`  │  Daily hard cap:                     ${String(DAILY_CREDIT_HARD_CAP).padStart(5)}        │`);
  if (BUDGET !== null) log(`  │  Budget this run:                    ${String(BUDGET).padStart(5)}        │`);
  log(`  └──────────────────────────────────────────────────────┘`);
  log('  Sample (first 12):');
  for (const c of candidates.slice(0, 12)) {
    log(`    ${c.display_name?.slice(0, 32).padEnd(32)} ${(c._domain || '').padEnd(26)} [${c.trajectory}/${c.activity_status}]`);
  }

  if (!candidates.length) { log('\n  Nothing to enrich (all cached or no domains).'); return; }
  const token = generateToken();
  writeFileSync(PENDING_FILE, JSON.stringify({
    created_at: new Date().toISOString(),
    token,
    budget: BUDGET,
    candidates: candidates.map((c) => ({ id: c.id, key: c.canonical_key, name: c.display_name, domain: c._domain })),
  }, null, 2));
  const cap = BUDGET !== null ? Math.min(ceiling, BUDGET) : ceiling;
  log(`\n  📋 Pending saved. To APPROVE and spend up to ${cap} credit${cap === 1 ? '' : 's'}, run:`);
  log(`  node scripts/enrich-companies.mjs --confirm --token ${token}${BUDGET !== null ? ` --budget ${BUDGET}` : ''}`);
  log(`  (token expires in 30 min; nothing was charged)\n`);
}

async function phase2() {
  if (!existsSync(PENDING_FILE)) { console.error('  ❌ No pending enrichment. Run Phase 1 first.'); process.exit(1); }
  const state = JSON.parse(readFileSync(PENDING_FILE, 'utf8'));
  const ageMs = Date.now() - new Date(state.created_at).getTime();
  if (ageMs > 30 * 60 * 1000) { unlinkSync(PENDING_FILE); console.error(`  ❌ Pending is stale (${Math.round(ageMs / 60000)}min). Re-run Phase 1.`); process.exit(1); }
  if (!TOKEN) { console.error('  ❌ --token required with --confirm (shown in Phase 1).'); process.exit(1); }
  if (state.token !== TOKEN) { console.error('  ❌ Invalid token. Use the exact token from Phase 1.'); process.exit(1); }

  const budget = state.budget;
  log(`  (APOLLO_API_KEY length: ${AK.length})`);
  const cache = loadCache();
  let spent = 0;
  let lastErr = '';
  const stats = { success: 0, wrong_domain: 0, fail: 0, error: 0 };
  for (const c of state.candidates) {
    if (budget !== null && spent >= budget) { log(`  Budget ${budget} reached — stopping.`); break; }
    if (creditsUsedToday() + 1 > DAILY_CREDIT_HARD_CAP) { log('  Daily hard cap reached — stopping.'); break; }
    let status = 'fail';
    let industry = null;
    let employees = null;
    let hqCity = null;
    let hqState = null;
    try {
      const d = await enrichDomain(c.domain);
      const org = d.organization;
      if (org && org.name) {
        if (namesMatch(c.name, org.name)) {
          status = 'success';
          industry = org.industry || null;
          employees = org.estimated_num_employees ? String(org.estimated_num_employees) : null;
          hqCity = org.city || null;
          hqState = org.state || null;
        } else { status = 'wrong_domain'; }
        spent += 1; // Apollo charged: org returned (success OR wrong_domain)
      } else { status = 'fail'; }
    } catch (e) { status = 'error'; lastErr = e.message; }

    stats[status] += 1;
    cache[c.domain] = { status, industry, employees, hqCity, hqState, fetched_at: new Date().toISOString() };
    if (status === 'success') {
      await sb.from('crm_companies').update({
        ext_industry: industry, ext_employee_size: employees,
        ext_hq_city: hqCity, ext_hq_state: hqState, ext_enriched_at: new Date().toISOString(),
      }).eq('id', c.id);
    }
    log(`  ${c.name?.slice(0, 30).padEnd(30)} ${c.domain.padEnd(24)} ${status}${status === 'success' ? `  ${employees || '?'} emp / ${industry || '?'}` : ''}${status === 'error' ? `  (${lastErr})` : ''}`);
    writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
    await sleep(300);
  }
  if (spent > 0) logCreditsUsed(spent, `company enrich: ${stats.success} ok, ${stats.wrong_domain} wrong (${spent} credits)`);
  unlinkSync(PENDING_FILE);
  log(`\n  DONE. Credits spent: ${spent}  |  ${JSON.stringify(stats)}`);
}

(async () => {
  if (CONFIRM) await phase2(); else await phase1();
})().catch((e) => { console.error('ENRICH_ERROR:', e.message); process.exit(1); });
