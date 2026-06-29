/**
 * enrich-org-signals.mjs — pull the ARCHETYPE signal set for our companies.
 *
 * The Apollo industry string is a lossy proxy for our real ICP (a talent-
 * competitive, well-capitalised employer using workplace experience to retain
 * people): high-growth tech-enabled companies (the leading edge) + elite
 * professional services (law/consulting/finance). See
 * memory/client_roster_target_profile.md. To target the ARCHETYPE we need
 * signals we don't currently store: founded year, headcount growth, funding,
 * revenue, public/private, keywords, technology footprint.
 *
 * Apollo `organizations/enrich?domain=` returns ALL of them in one call
 * (1 credit). This script enriches our companies by primary domain and caches
 * the signal set to org_signal_cache.json (domain-keyed, idempotent). It ALSO
 * backfills industry/size for the ~110 roster companies that lack them.
 *
 * Read-only on Supabase + dry-by-default. --confirm spends Apollo credits.
 *
 *   export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
 *   node scripts/enrich-org-signals.mjs                 # dry: who WOULD be enriched + credit cost
 *   node scripts/enrich-org-signals.mjs --confirm       # enrich missing-firmographics roster cos
 *   node scripts/enrich-org-signals.mjs --all --confirm # enrich ALL roster cos (for threshold-setting)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const ROOT = '/Users/willnewton/Documents/GitHub/calculator6';
const CACHE = `${ROOT}/org_signal_cache.json`;
const CONFIRM = process.argv.includes('--confirm');
const ALL = process.argv.includes('--all');
const argVal = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const LIMIT = parseInt(argVal('limit', '0'), 10) || 0;   // cap calls (0 = no cap)
const REFRESH_DAYS = 180;                                 // re-enrich if cache older than this

const APOLLO = (() => {
  try { return (readFileSync('/Users/willnewton/.openclaw/workspace/.env', 'utf8').match(/^APOLLO_API_KEY=(.+)$/m)?.[1] || '').trim(); }
  catch { return ''; }
})();
const URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!/^https?:\/\//i.test(URL) || !KEY) { console.error('MISSING_ENV (SUPABASE)'); process.exit(2); }
const sb = createClient(URL, KEY, { auth: { persistSession: false } });
const log = (...a) => console.log(...a);
const cleanDom = (d) => String(d || '').toLowerCase().replace(/^www\./, '').trim() || null;

// Domains we must NOT org-enrich: free-email providers (the contact used a
// personal address — wedding/individual/one-off, not a corporate account) and
// our own Shortcut domains (test/internal/cancelled events). Enriching these
// burns a credit to fetch Google or ourselves. They are NOT real ICP companies.
const FREE_EMAIL = new Set(['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com', 'me.com', 'msn.com', 'live.com', 'protonmail.com', 'ymail.com', 'comcast.net']);
const OWN_DOMAINS = new Set(['getshortcut.co', 'shortcutwellness.com', 'shortcutcorporate.com', 'shortcutpros.com', 'shortcutpartnership.com', 'shortcutexperience.com', 'shortcutcorpwellness.com', 'shortcutemployeewellness.com', 'getshortcutcorporate.com']);
const isJunkDomain = (d) => !d || FREE_EMAIL.has(d) || OWN_DOMAINS.has(d);

async function readAll(t, c, mod) {
  const out = [];
  for (let f = 0; ; f += 1000) {
    let q = sb.from(t).select(c).range(f, f + 999);
    if (mod) q = mod(q);
    const { data, error } = await q;
    if (error) throw new Error(`${t}: ${error.message}`);
    out.push(...data); if (data.length < 1000) break;
  }
  return out;
}

// Pull only the archetype-relevant fields out of Apollo's (large) org object.
function extractSignals(o) {
  if (!o) return null;
  return {
    name: o.name || null,
    domain: cleanDom(o.primary_domain || o.website_url),
    industry: o.industry || null,
    secondary_industries: o.secondary_industries || [],
    estimated_num_employees: o.estimated_num_employees ?? null,
    founded_year: o.founded_year ?? null,
    annual_revenue: o.organization_revenue ?? o.annual_revenue ?? null,
    total_funding: o.total_funding ?? null,
    latest_funding_stage: o.latest_funding_stage || null,
    latest_funding_round_date: o.latest_funding_round_date || null,
    is_public: !!(o.publicly_traded_symbol || o.publicly_traded_exchange),
    headcount_growth_6mo: o.organization_headcount_six_month_growth ?? null,
    headcount_growth_12mo: o.organization_headcount_twelve_month_growth ?? null,
    keywords: Array.isArray(o.keywords) ? o.keywords.slice(0, 40) : [],
    technology_count: Array.isArray(o.technology_names) ? o.technology_names.length : null,
    short_description: o.short_description ? String(o.short_description).slice(0, 400) : null,
    enriched_at: new Date().toISOString(),
  };
}

async function apolloOrgEnrich(domain) {
  const r = await fetch(`https://api.apollo.io/api/v1/organizations/enrich?domain=${encodeURIComponent(domain)}`, {
    headers: { 'x-api-key': APOLLO, 'Content-Type': 'application/json' },
  });
  if (!r.ok) throw new Error(`apollo ${r.status}`);
  const j = await r.json();
  return extractSignals(j.organization || j);
}

(async () => {
  const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};
  const cacheFresh = (dom) => {
    const c = cache[dom];
    return c && c.enriched_at && (Date.now() - new Date(c.enriched_at).getTime()) < REFRESH_DAYS * 86400000;
  };

  const cos = await readAll('crm_companies',
    'id, display_name, contact_domains, ext_industry, ext_employee_size, completed_events, is_internal, special_handling');
  const roster = cos.filter((c) => !c.is_internal && !c.special_handling && (c.completed_events || 0) > 0);

  // Targets: roster companies with a usable domain. Default = those missing
  // firmographics OR not yet org-enriched; --all = the whole roster.
  const targets = [];
  let noDomain = 0; let junk = 0;
  for (const c of roster) {
    // First non-junk corporate domain (skip personal/own-domain contacts).
    const dom = (c.contact_domains || []).map(cleanDom).find((d) => d && !isJunkDomain(d)) || null;
    if (!dom) { if ((c.contact_domains || []).some((d) => isJunkDomain(cleanDom(d)))) junk += 1; else noDomain += 1; continue; }
    const missingFirmo = !c.ext_industry || !c.ext_employee_size;
    const needsSignals = !cacheFresh(dom);
    if (ALL ? needsSignals : (missingFirmo && needsSignals)) targets.push({ ...c, dom });
  }
  const capped = LIMIT ? targets.slice(0, LIMIT) : targets;

  log(`Roster: ${roster.length} client companies (${noDomain} no domain, ${junk} only personal/own-domain — neither enrichable)`);
  log(`Already cached fresh: ${roster.filter((c) => cacheFresh(cleanDom((c.contact_domains || [])[0]))).length}`);
  log(`${ALL ? 'ALL-mode' : 'missing-firmographics mode'} targets to enrich: ${capped.length}${LIMIT && targets.length > LIMIT ? ` (capped from ${targets.length})` : ''}`);
  log(`Apollo cost if confirmed: ~${capped.length} credits (1 per org).`);

  if (!CONFIRM) {
    log('\nSample targets:');
    for (const t of capped.slice(0, 15)) log(`  ${t.dom.padEnd(28)} ${t.display_name || ''}${(!t.ext_industry || !t.ext_employee_size) ? '  [missing firmo]' : ''}`);
    if (capped.length > 15) log(`  …and ${capped.length - 15} more`);
    log('\nDRY RUN — re-run with --confirm to enrich (spends Apollo credits). Add --all for the full roster.');
    return;
  }
  if (!APOLLO) { console.error('MISSING APOLLO_API_KEY (openclaw .env)'); process.exit(2); }

  let ok = 0; let miss = 0; let err = 0;
  for (let i = 0; i < capped.length; i++) {
    const t = capped[i];
    try {
      const sig = await apolloOrgEnrich(t.dom);
      if (sig && (sig.industry || sig.estimated_num_employees || sig.founded_year)) { cache[t.dom] = { crm_id: t.id, ...sig }; ok += 1; }
      else { miss += 1; }
    } catch (e) { err += 1; if (err <= 5) log(`  err ${t.dom}: ${e.message}`); }
    if ((i + 1) % 25 === 0) { writeFileSync(CACHE, JSON.stringify(cache, null, 2)); log(`  …${i + 1}/${capped.length} (${ok} ok, ${miss} miss, ${err} err)`); }
    await new Promise((r) => setTimeout(r, 250));
  }
  writeFileSync(CACHE, JSON.stringify(cache, null, 2));
  log(`\nEnriched ${ok} orgs (${miss} no-data, ${err} errors). Cache: org_signal_cache.json (${Object.keys(cache).length} total).`);
  log('Next: analyse the archetype-signal distribution across winners to set thresholds, then build the classifier.');
  log('DONE');
})().catch((e) => { console.error('ENRICH_ERROR:', e.message); process.exit(1); });
