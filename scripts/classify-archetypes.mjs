/**
 * classify-archetypes.mjs — populate ext_signals (from apollo_org_cache.json,
 * no Apollo re-spend) and write the two-cluster archetype + fit score onto every
 * crm_company. Dry by default (prints the distribution + anchor validation);
 * --confirm writes ext_signals / archetype / archetype_score.
 *
 * Requires migration 20260629000002_add_archetype.sql applied (columns
 * ext_signals jsonb, archetype text, archetype_score int).
 *
 *   set -a; source .env; set +a; export SUPABASE_URL=$VITE_SUPABASE_URL
 *   node scripts/classify-archetypes.mjs            # dry: distribution + anchors
 *   node scripts/classify-archetypes.mjs --confirm  # write archetype + ext_signals
 */

import { readFileSync, existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { classifyArchetype } from './lib/archetype.mjs';

const ROOT = '/Users/willnewton/Documents/GitHub/calculator6';
const CONFIRM = process.argv.includes('--confirm');
const CACHE = `${ROOT}/apollo_org_cache.json`;
const URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!/^https?:\/\//i.test(URL) || !KEY) { console.error('MISSING_ENV (SUPABASE)'); process.exit(2); }
const sb = createClient(URL, KEY, { auth: { persistSession: false } });
const log = (...a) => console.log(...a);
const lc = (s) => String(s || '').toLowerCase().replace(/^www\./, '');

async function readAll(t, c) { const o = []; for (let f = 0; ; f += 1000) { const { data, error } = await sb.from(t).select(c).range(f, f + 999); if (error) throw new Error(error.message); o.push(...data); if (data.length < 1000) break; } return o; }
const distill = (s) => { if (!s) return null; const { _raw, ...rest } = s; return rest; };   // drop the bulky raw Apollo blob

(async () => {
  log(CONFIRM ? 'CLASSIFY — LIVE (writes archetype + ext_signals)' : 'CLASSIFY — dry run (no writes)');
  const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};
  const byDomSig = new Map(Object.entries(cache).map(([d, s]) => [lc(d), distill(s)]));

  // Domain → modal industry / median headcount from the Apollo person cache —
  // the SAME fallback score-companies uses, so a company with no ext_industry
  // (e.g. Schrödinger) still gets classified instead of dropping to "other".
  const persons = await readAll('apollo_person_cache', 'email_domain, company_headcount, industry');
  const domAgg = new Map();
  for (const p of persons) { const d = lc(p.email_domain); if (!d) continue; if (!domAgg.has(d)) domAgg.set(d, { ind: {}, hc: [] }); const e = domAgg.get(d); if (p.industry) e.ind[p.industry] = (e.ind[p.industry] || 0) + 1; const h = parseInt(String(p.company_headcount || '').replace(/[^\d]/g, ''), 10); if (h) e.hc.push(h); }
  const domFallback = (domains) => {
    for (const d of domains || []) { const e = domAgg.get(lc(d)); if (e) return { ind: Object.entries(e.ind).sort((a, b) => b[1] - a[1])[0]?.[0] || null, hc: e.hc.length ? e.hc.sort((a, b) => a - b)[e.hc.length >> 1] : null }; }
    return { ind: null, hc: null };
  };

  // ext_signals may not exist yet (pre-migration) — read it if present, else
  // fall back to the cache (same data). Lets us validate before the migration.
  let co;
  try { co = await readAll('crm_companies', 'id, display_name, contact_domains, ext_industry, ext_employee_size, ext_signals, is_internal'); }
  catch (e) {
    if (!/ext_signals/.test(e.message)) throw e;
    log('  (ext_signals column absent — using apollo_org_cache.json for signals; apply migration 20260629000002 before --confirm)');
    co = (await readAll('crm_companies', 'id, display_name, contact_domains, ext_industry, ext_employee_size, is_internal')).map((c) => ({ ...c, ext_signals: null }));
  }
  const sigFor = (c) => {
    if (c.ext_signals && Object.keys(c.ext_signals).length) return c.ext_signals;     // already populated
    for (const d of c.contact_domains || []) { const s = byDomSig.get(lc(d)); if (s) return s; }
    return null;
  };

  const rows = co.map((c) => {
    const signals = sigFor(c);
    const fb = (!c.ext_industry || !c.ext_employee_size) ? domFallback(c.contact_domains) : { ind: null, hc: null };
    const industry = c.ext_industry || signals?.industry || fb.ind;
    const employees = c.ext_employee_size || signals?.employees || fb.hc;
    const r = classifyArchetype({ industry, employees, signals });
    return { id: c.id, name: c.display_name, internal: c.is_internal, hasSignals: !!signals, signals, ...r };
  });

  const real = rows.filter((r) => !r.internal);
  const dist = real.reduce((m, r) => { m[r.archetype] = (m[r.archetype] || 0) + 1; return m; }, {});
  log(`\n${real.length} companies classified — distribution:`);
  for (const [a, n] of Object.entries(dist).sort((x, y) => y[1] - x[1])) log(`  ${String(n).padStart(4)}  ${a}`);
  log(`  (with rich Apollo signals: ${real.filter((r) => r.hasSignals).length}; industry+size fallback only: ${real.filter((r) => !r.hasSignals).length})`);

  // ANCHOR VALIDATION — the marquee accounts must land in the right cluster.
  log('\nanchor check (name → archetype/score · reason):');
  const anchors = ['draftkings', 'wachtell', 'wlrk', 'bcg', 'betterment', 'wix', 'teads', 'schr', 'tishman', 'mount sinai', 'paramount', 'pwc'];
  for (const a of anchors) {
    const m = real.find((r) => (r.name || '').toLowerCase().includes(a));
    if (m) log(`  ${(m.name || '').slice(0, 26).padEnd(26)} → ${m.archetype}/${m.archetype_score}  · ${m.reasons[0] || ''}`);
  }
  // top of each cluster
  for (const arch of ['high_growth_tech', 'elite_prof_services']) {
    log(`\ntop ${arch} (by score):`);
    for (const r of real.filter((x) => x.archetype === arch && x.hasSignals).sort((x, y) => y.archetype_score - x.archetype_score).slice(0, 8)) log(`  ${String(r.archetype_score).padStart(3)}  ${(r.name || '').slice(0, 30)}`);
  }

  if (!CONFIRM) { log('\nDRY RUN — re-run with --confirm to write archetype + archetype_score + ext_signals (needs migration 20260629000002).'); return; }

  let wrote = 0;
  for (let i = 0; i < rows.length; i += 100) {
    await Promise.all(rows.slice(i, i + 100).map((r) => sb.from('crm_companies')
      .update({ archetype: r.archetype, archetype_score: r.archetype_score, ...(r.signals ? { ext_signals: r.signals } : {}) })
      .eq('id', r.id).then(({ error }) => { if (error) throw new Error(error.message); wrote += 1; })));
    log(`  wrote ${Math.min(i + 100, rows.length)}/${rows.length}`);
  }
  log(`\nDONE — classified + wrote ${wrote} companies.`);
})().catch((e) => { console.error('CLASSIFY_ERROR:', e.message); process.exit(1); });
