/**
 * score-companies.mjs — Step 5 core. Derives the recency-weighted WINNER
 * profile from companies that actually closed (≤5yr), then scores every
 * company 0–100 = transparent weighted blend:
 *   trajectory 30 / recency 25 / title-fit 25 / firmographic-fit 20
 * Persists fit_score + fit_breakdown (explainable, tunable). Read-only on
 * Apollo. Supports --dry. Validates that DraftKings/BCG/Schrödinger top it.
 *
 *   export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
 *   node .claude/worktrees/<wt>/scripts/score-companies.mjs [--dry]
 */

import { createClient } from '@supabase/supabase-js';

const DRY = process.argv.includes('--dry');
const URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!/^https?:\/\//i.test(URL) || !KEY) { console.error('MISSING_ENV'); process.exit(2); }
const sb = createClient(URL, KEY, { auth: { persistSession: false } });
const log = (...a) => console.log(...a);

const W = { trajectory: 0.30, recency: 0.25, title: 0.25, firmo: 0.20 }; // tunable
const FIVE_YR = Date.now() - 5 * 365 * 86400000;

const TRAJ = { multi_site_grower: 1.0, single_site_deep: 0.7, demoed_not_closed: 0.5, one_off: 0.35 };
const REC = { active: 1.0, lapsed: 0.6, churned: 0.2, never_completed: 0.1 };
function sizeBand(n) {
  const x = parseInt(String(n || '').replace(/[^\d]/g, ''), 10);
  if (!x) return null;
  if (x <= 50) return '1-50'; if (x <= 200) return '51-200'; if (x <= 500) return '201-500';
  if (x <= 1000) return '501-1000'; if (x <= 5000) return '1001-5000';
  if (x <= 10000) return '5001-10000'; return '10001+';
}
const titleCat = (t) => {
  const s = (t || '').toLowerCase();
  if (/hr|people|talent|human resources/.test(s)) return 'HR/People';
  if (/office (manager|coordinator|admin)/.test(s)) return 'OfficeMgr';
  if (/employee experience/.test(s)) return 'EmployeeExp';
  if (/workplace/.test(s)) return 'Workplace';
  if (/facilit/.test(s)) return 'Facilities';
  return t ? 'Other' : null;
};
const GOOD_TITLES = new Set(['HR/People', 'OfficeMgr', 'EmployeeExp']); // validated converters

async function readAll(table, cols) {
  const out = [];
  for (let f = 0; ; f += 1000) {
    const { data, error } = await sb.from(table).select(cols).range(f, f + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data); if (data.length < 1000) break;
  }
  return out;
}

(async () => {
  log(DRY ? 'DRY RUN — no writes' : 'LIVE RUN');
  const companies = await readAll('crm_companies',
    'id, canonical_key, display_name, trajectory, activity_status, completed_events, last_completed_at, last_event_at, contact_domains, ext_industry, ext_employee_size, is_internal, special_handling, demoed_not_closed');
  const persons = await readAll('apollo_person_cache', 'email_domain, company_headcount, industry');
  const ocs = await readAll('outreach_contacts', 'crm_company_id, email_domain, title');

  // domain -> firmographics (fallback when ext_* missing) ; modal industry / median headcount
  const byDom = new Map();
  for (const p of persons) {
    if (!p.email_domain) continue;
    if (!byDom.has(p.email_domain)) byDom.set(p.email_domain, { ind: {}, hc: [] });
    const e = byDom.get(p.email_domain);
    if (p.industry) e.ind[p.industry] = (e.ind[p.industry] || 0) + 1;
    const hc = parseInt(String(p.company_headcount || '').replace(/[^\d]/g, ''), 10);
    if (hc) e.hc.push(hc);
  }
  const domFirmo = (domains) => {
    for (const d of domains || []) {
      const e = byDom.get(String(d).toLowerCase().replace(/^www\./, ''));
      if (e) {
        const ind = Object.entries(e.ind).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
        const hc = e.hc.length ? e.hc.sort((a, b) => a - b)[Math.floor(e.hc.length / 2)] : null;
        return { ind, hc };
      }
    }
    return { ind: null, hc: null };
  };
  // company -> set of title categories from its known contacts
  const titlesByCo = new Map();
  const titlesByDom = new Map();
  for (const o of ocs) {
    const c = titleCat(o.title);
    if (!c) continue;
    if (o.crm_company_id) { (titlesByCo.get(o.crm_company_id) || titlesByCo.set(o.crm_company_id, new Set()).get(o.crm_company_id)).add(c); }
    if (o.email_domain) { (titlesByDom.get(o.email_domain) || titlesByDom.set(o.email_domain, new Set()).get(o.email_domain)).add(c); }
  }
  const titleCatsFor = (co) => {
    const s = new Set(titlesByCo.get(co.id) || []);
    for (const d of co.contact_domains || []) for (const t of (titlesByDom.get(String(d).toLowerCase().replace(/^www\./, '')) || [])) s.add(t);
    return s;
  };

  const firmoOf = (co) => {
    if (co.ext_industry || co.ext_employee_size) return { ind: co.ext_industry || null, band: sizeBand(co.ext_employee_size) };
    const d = domFirmo(co.contact_domains);
    return { ind: d.ind, band: sizeBand(d.hc) };
  };

  // ---- WINNER PROFILE: real closers, <=5yr, recency-weighted ----
  const winners = companies.filter((c) => !c.is_internal && !c.special_handling && !c.demoed_not_closed
    && c.completed_events > 0 && c.last_completed_at && new Date(c.last_completed_at).getTime() >= FIVE_YR);
  const wWeight = (c) => REC[c.activity_status] ?? 0.2;
  const indDist = {}; const bandDist = {}; const titleDist = {};
  let wTot = 0;
  for (const c of winners) {
    const w = wWeight(c); wTot += w;
    const f = firmoOf(c);
    if (f.ind) indDist[f.ind] = (indDist[f.ind] || 0) + w;
    if (f.band) bandDist[f.band] = (bandDist[f.band] || 0) + w;
    for (const t of titleCatsFor(c)) titleDist[t] = (titleDist[t] || 0) + w;
  }
  const share = (d, k) => (k && wTot ? (d[k] || 0) / wTot : 0);
  const maxIndShare = Math.max(0.0001, ...Object.values(indDist).map((v) => v / (wTot || 1)));
  const maxBandShare = Math.max(0.0001, ...Object.values(bandDist).map((v) => v / (wTot || 1)));

  // ---- SCORE every company ----
  const scored = companies.map((co) => {
    const internal = co.is_internal || !!co.special_handling;
    const tScore = TRAJ[co.trajectory] ?? 0.2;
    const rScore = REC[co.activity_status] ?? 0.1;
    const cats = titleCatsFor(co);
    const tlScore = cats.size === 0 ? 0.5 : ([...cats].some((c) => GOOD_TITLES.has(c)) ? 1.0 : 0.6);
    const f = firmoOf(co);
    let fScore = 0.5; // neutral when unknown — don't penalize missing firmographics
    if (f.ind || f.band) {
      const iS = f.ind ? share(indDist, f.ind) / maxIndShare : 0.5;
      const bS = f.band ? share(bandDist, f.band) / maxBandShare : 0.5;
      fScore = 0.5 * iS + 0.5 * bS;
    }
    const fit = internal ? 0 : Math.round(
      100 * (W.trajectory * tScore + W.recency * rScore + W.title * tlScore + W.firmo * fScore));
    return {
      id: co.id, key: co.canonical_key, name: co.display_name, trajectory: co.trajectory,
      activity: co.activity_status, internal, fit_score: fit,
      fit_breakdown: { trajectory: +tScore.toFixed(2), recency: +rScore.toFixed(2), title: +tlScore.toFixed(2), firmo: +fScore.toFixed(2), title_cats: [...cats], ind: f.ind, band: f.band, weights: W },
    };
  });

  // ---- validation ----
  const real = scored.filter((s) => !s.internal).sort((a, b) => b.fit_score - a.fit_score);
  log(`\n=== WINNER PROFILE (${winners.length} closers ≤5yr, recency-weighted) ===`);
  log('  top industries: ' + JSON.stringify(Object.entries(indDist).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => [k, +(v / wTot).toFixed(2)])));
  log('  size bands:     ' + JSON.stringify(Object.entries(bandDist).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, +(v / wTot).toFixed(2)])));
  log('  title mix:      ' + JSON.stringify(Object.entries(titleDist).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, +(v / wTot).toFixed(2)])));
  log(`\n=== TOP 15 BY FIT (sanity: DraftKings/BCG/Schrödinger must be here) ===`);
  for (const s of real.slice(0, 15)) log(`  ${String(s.fit_score).padStart(3)}  ${s.name?.slice(0, 30).padEnd(30)} [${s.trajectory}/${s.activity}]  ${JSON.stringify(s.fit_breakdown.title_cats)}`);
  log(`\n  churned sample (should score low): ` + real.filter((s) => s.activity === 'churned').slice(0, 5).map((s) => `${s.name}=${s.fit_score}`).join(', '));
  log(`  score distribution: 80+=${real.filter((s) => s.fit_score >= 80).length}  60-79=${real.filter((s) => s.fit_score >= 60 && s.fit_score < 80).length}  <60=${real.filter((s) => s.fit_score < 60).length}`);

  if (!DRY) {
    const at = new Date().toISOString();
    for (let i = 0; i < scored.length; i += 100) {
      const chunk = scored.slice(i, i + 100);
      let attempt = 0;
      for (;;) {
        try {
          await Promise.all(chunk.map((s) => sb.from('crm_companies')
            .update({ fit_score: s.fit_score, fit_breakdown: s.fit_breakdown, scored_at: at })
            .eq('id', s.id).then(({ error }) => { if (error) throw new Error(error.message); })));
          break;
        } catch (e) { if (++attempt > 4) throw new Error(`update: ${e.message}`); await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt)); }
      }
      log(`  scored crm_companies: ${Math.min(i + 100, scored.length)}/${scored.length}`);
    }
  }
  log('\nDONE');
})().catch((e) => { console.error('SCORE_ERROR:', e.message); process.exit(1); });
