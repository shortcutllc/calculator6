/**
 * backfill-firmographics.mjs — fill ext_industry / ext_employee_size / HQ for the
 * client companies that have neither an ext_industry nor an Apollo person-cache
 * fallback, AND bank the archetype growth signals (founded year, keywords,
 * technology count, revenue, funding, public/private) for the classifier.
 *
 * Why: the winner profile + fit_score key off firmographics; ~40 real clients
 * (incl. WLRK/Wachtell, our #3 account) had none, so they were invisible to it.
 * The growth/tech signals are the inputs to the two-cluster archetype-fit score.
 *
 * Writes the EXISTING crm_companies columns (no migration needed for those) and
 * appends the full enrichment (incl. signals that need a column) to
 * apollo_org_cache.json so a later ext_signals migration can populate without
 * re-spending Apollo. Dry by default; --confirm spends Apollo credits + writes.
 *
 *   set -a; source .env; set +a; export SUPABASE_URL=$VITE_SUPABASE_URL
 *   node scripts/backfill-firmographics.mjs            # dry: who WOULD enrich (no spend)
 *   node scripts/backfill-firmographics.mjs --confirm  # enrich + write (spends ~1 credit/co)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const ROOT = '/Users/willnewton/Documents/GitHub/calculator6';
const OPENCLAW = '/Users/willnewton/.openclaw/workspace';
const CONFIRM = process.argv.includes('--confirm');
const CACHE = `${ROOT}/apollo_org_cache.json`;

const envKey = (name) => {
  try { return (readFileSync(`${OPENCLAW}/.env`, 'utf8').match(new RegExp(`^${name}=(.+)$`, 'm'))?.[1] || '').trim().replace(/^["']|["']$/g, ''); }
  catch { return (process.env[name] || '').trim(); }
};
const APOLLO = envKey('APOLLO_API_KEY');
const URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!APOLLO) { console.error('MISSING APOLLO_API_KEY (openclaw .env)'); process.exit(2); }
if (!/^https?:\/\//i.test(URL) || !KEY) { console.error('MISSING_ENV (SUPABASE)'); process.exit(2); }
const sb = createClient(URL, KEY, { auth: { persistSession: false } });
const log = (...a) => console.log(...a);
const lc = (s) => String(s || '').toLowerCase().replace(/^www\./, '');
const FREEMAIL = /gmail|yahoo|hotmail|outlook|icloud|aol|me\.com/;
const SKIP_DOMAIN = /getshortcut\.co|example\.com/;   // internal / test

async function readAll(t, c) { const o = []; for (let f = 0; ; f += 1000) { const { data, error } = await sb.from(t).select(c).range(f, f + 999); if (error) throw new Error(error.message); o.push(...data); if (data.length < 1000) break; } return o; }
const firstDom = (c) => { for (const d of c.contact_domains || []) { const k = lc(d); if (k && !FREEMAIL.test(k) && !SKIP_DOMAIN.test(k)) return k; } return null; };

// Pull the archetype signals out of an Apollo organization record.
const signalsOf = (o) => ({
  name: o.name || null,
  founded_year: o.founded_year || null,
  employees: o.estimated_num_employees || null,
  industry: o.industry || null,
  keywords: (o.keywords || []).slice(0, 25),
  technology_count: (o.technology_names || []).length,
  annual_revenue: o.annual_revenue || null,
  revenue_printed: o.organization_revenue_printed || null,
  is_public: !!o.publicly_traded_symbol,
  total_funding: o.total_funding || null,
  latest_funding_stage: o.latest_funding_stage || null,
  num_funding_rounds: o.num_funding_rounds || null,
  hq_city: o.primary_city || o.city || null,
  hq_state: o.primary_state || o.state || null,
  enriched_at: new Date().toISOString(),
});

(async () => {
  log(CONFIRM ? 'BACKFILL — LIVE (spends Apollo credits + writes)' : 'BACKFILL — dry run (no spend, no writes)');
  const persons = await readAll('apollo_person_cache', 'email_domain, industry');
  const domKnown = new Set(persons.filter((p) => p.industry).map((p) => lc(p.email_domain)));
  const co = await readAll('crm_companies', 'id, display_name, completed_events, contact_domains, ext_industry, is_internal, special_handling');
  const clients = co.filter((c) => !c.is_internal && !c.special_handling && c.completed_events > 0);
  const missing = clients.filter((c) => !c.ext_industry && !(c.contact_domains || []).some((d) => domKnown.has(lc(d))));
  const targets = missing.map((c) => ({ ...c, dom: firstDom(c) })).filter((c) => c.dom);

  // de-dupe by domain (LVMH brands share lvmhuspc.com etc.) — enrich once, apply to all
  const byDom = new Map();
  for (const t of targets) { if (!byDom.has(t.dom)) byDom.set(t.dom, []); byDom.get(t.dom).push(t); }
  log(`targets: ${targets.length} companies across ${byDom.size} unique domains (${missing.length - targets.length} skipped: no usable domain)`);

  const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};
  if (!CONFIRM) {
    for (const [dom, cos] of [...byDom].slice(0, 50)) log(`  ${dom.padEnd(28)} → ${cos.map((c) => `${c.display_name}(${c.completed_events})`).join(', ')}${cache[dom] ? '  [cached]' : ''}`);
    log(`\nDRY RUN — ${byDom.size} Apollo org-enrich calls (≈${[...byDom.keys()].filter((d) => !cache[d]).length} new credits). Re-run with --confirm to enrich + write.`);
    return;
  }

  let enriched = 0; let wrote = 0; let failed = 0;
  for (const [dom, cos] of byDom) {
    let org = cache[dom]?._raw;
    if (!org) {
      try {
        const r = await fetch(`https://api.apollo.io/api/v1/organizations/enrich?domain=${encodeURIComponent(dom)}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', 'X-Api-Key': APOLLO } });
        org = (await r.json())?.organization || null;
        enriched += 1;
        await new Promise((res) => setTimeout(res, 300));
      } catch (e) { log(`  ${dom}: enrich failed (${e.message})`); failed += 1; continue; }
    }
    if (!org) { log(`  ${dom}: no Apollo org match`); failed += 1; continue; }
    const sig = signalsOf(org);
    cache[dom] = { ...sig, _raw: org };
    // write the EXISTING firmographic columns for every company on this domain
    for (const c of cos) {
      const { error } = await sb.from('crm_companies').update({
        ext_industry: sig.industry, ext_employee_size: sig.employees ? String(sig.employees) : null,
        ext_hq_city: sig.hq_city, ext_hq_state: sig.hq_state, ext_enriched_at: sig.enriched_at,
      }).eq('id', c.id);
      if (error) log(`  write warn ${c.display_name}: ${error.message}`); else wrote += 1;
    }
    log(`  ${dom.padEnd(26)} ${sig.industry || '?'} · ${sig.employees || '?'}emp · ${sig.technology_count}tech · ${sig.founded_year || '?'} · ${sig.is_public ? 'public' : (sig.latest_funding_stage || 'private')}  → ${cos.length} co`);
    writeFileSync(CACHE, JSON.stringify(cache, null, 2));   // persist incrementally (don't lose spend)
  }
  log(`\nDONE — ${enriched} Apollo calls, wrote firmographics to ${wrote} companies, ${failed} unmatched. Signals banked in apollo_org_cache.json for the archetype migration.`);
})().catch((e) => { console.error('BACKFILL_ERROR:', e.message); process.exit(1); });
