/**
 * generate-plays.mjs — the Step 5 payoff. Produces three ranked deliverables,
 * read-only, no Apollo spend, every row passed through the pre-flight gate:
 *   Play A  — active clients we under-serve that are big multi-office cos
 *   Play B  — net-new cold prospects that look like our real winners
 *   Reconciliation — closed vs replied-not-closed vs never-reached, by title/size
 * Writes play_a.csv / play_b.csv / reconciliation.csv to repo root + prints tops.
 *
 *   export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
 *   node .claude/worktrees/<wt>/scripts/generate-plays.mjs
 */

import { writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { preflight } from './preflight.mjs';

const ROOT = '/Users/willnewton/Documents/GitHub/calculator6';
const URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!/^https?:\/\//i.test(URL) || !KEY) { console.error('MISSING_ENV'); process.exit(2); }
const sb = createClient(URL, KEY, { auth: { persistSession: false } });
const log = (...a) => console.log(...a);
const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);

const sizeNum = (n) => parseInt(String(n || '').replace(/[^\d]/g, ''), 10) || 0;
const titleCat = (t) => {
  const s = (t || '').toLowerCase();
  if (/hr|people|talent|human resources/.test(s)) return 'HR/People';
  if (/office (manager|coordinator|admin)/.test(s)) return 'OfficeMgr';
  if (/employee experience/.test(s)) return 'EmployeeExp';
  if (/workplace/.test(s)) return 'Workplace';
  if (/facilit/.test(s)) return 'Facilities';
  return t ? 'Other' : null;
};
const GOOD = new Set(['HR/People', 'OfficeMgr', 'EmployeeExp']);
const csv = (rows) => rows.map((r) => r.map((c) => {
  const v = c == null ? '' : String(c);
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}).join(',')).join('\n');

async function readAll(t, cols, mod) {
  const out = [];
  for (let f = 0; ; f += 1000) {
    let q = sb.from(t).select(cols).range(f, f + 999);
    if (mod) q = mod(q);
    const { data, error } = await q;
    if (error) throw new Error(`${t}: ${error.message}`);
    out.push(...data); if (data.length < 1000) break;
  }
  return out;
}

// Snapshot table refresh: clear then chunk-insert, backoff on transient fetch fails.
async function replaceAll(table, rows) {
  for (let a = 0; ; a += 1) {
    const { error } = await sb.from(table).delete().not('id', 'is', null);
    if (!error) break;
    if (a >= 4) throw new Error(`clear ${table}: ${error.message}`);
    await new Promise((r) => setTimeout(r, 1000 * 2 ** (a + 1)));
  }
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    for (let a = 0; ; a += 1) {
      try {
        const { error } = await sb.from(table).insert(batch);
        if (error) throw new Error(error.message);
        break;
      } catch (e) {
        if (a >= 4) throw new Error(`insert ${table} after ${a} tries: ${e.message}`);
        await new Promise((r) => setTimeout(r, 1000 * 2 ** (a + 1)));
      }
    }
  }
}

(async () => {
  const companies = await readAll('crm_companies',
    'id, canonical_key, display_name, trajectory, activity_status, completed_events, fit_score, fit_breakdown, ext_industry, ext_employee_size, contact_domains, contacts, is_internal, special_handling, demoed_not_closed');
  const sites = await readAll('crm_sites', 'company_id, city');
  const persons = await readAll('apollo_person_cache', 'email, email_domain, company_headcount, industry, linkedin_url, location');
  const ocs = await readAll('outreach_contacts', 'email, name, title, company, email_domain, crm_company_id, linkedin_url, location');

  // Free contact-detail fallback (no Apollo spend): email -> {linkedin,location}
  // and domain -> a representative {linkedin,location} from already-paid Apollo.
  const apolloByEmail = new Map();
  const apolloByDom = new Map();
  for (const p of persons) {
    const em = lc(p.email);
    if (em && (p.linkedin_url || p.location) && !apolloByEmail.has(em)) {
      apolloByEmail.set(em, { linkedin: p.linkedin_url || null, location: p.location || null });
    }
    const d = lc(p.email_domain)?.replace(/^www\./, '');
    if (d && (p.linkedin_url || p.location) && !apolloByDom.has(d)) {
      apolloByDom.set(d, { linkedin: p.linkedin_url || null, location: p.location || null });
    }
  }

  const siteCount = new Map();
  const siteCities = new Map();
  for (const s of sites) {
    siteCount.set(s.company_id, (siteCount.get(s.company_id) || 0) + 1);
    if (s.city) { if (!siteCities.has(s.company_id)) siteCities.set(s.company_id, new Set()); siteCities.get(s.company_id).add(s.city); }
  }
  // domain -> firmographics fallback
  const byDom = new Map();
  for (const p of persons) {
    const d = p.email_domain; if (!d) continue;
    if (!byDom.has(d)) byDom.set(d, { ind: {}, hc: [] });
    const e = byDom.get(d);
    if (p.industry) e.ind[p.industry] = (e.ind[p.industry] || 0) + 1;
    const h = sizeNum(p.company_headcount); if (h) e.hc.push(h);
  }
  const domFirmo = (domains) => {
    for (const d of domains || []) {
      const e = byDom.get(lc(d)?.replace(/^www\./, ''));
      if (e) return { ind: Object.entries(e.ind).sort((a, b) => b[1] - a[1])[0]?.[0] || null, hc: e.hc.length ? e.hc.sort((a, b) => a - b)[e.hc.length >> 1] : 0 };
    }
    return { ind: null, hc: 0 };
  };
  const firmoOf = (co) => {
    if (co.ext_industry || co.ext_employee_size) return { ind: co.ext_industry, hc: sizeNum(co.ext_employee_size) };
    return domFirmo(co.contact_domains);
  };

  // winner firmographic profile (from our high-fit real companies)
  const real = companies.filter((c) => !c.is_internal && !c.special_handling);
  const winnerCos = real.filter((c) => c.fit_score >= 70 && !c.demoed_not_closed && c.completed_events > 0);
  const winInd = {};
  const winHC = [];
  for (const c of winnerCos) { const f = firmoOf(c); if (f.ind) winInd[f.ind] = (winInd[f.ind] || 0) + 1; if (f.hc > 0) winHC.push(f.hc); }
  winHC.sort((a, b) => a - b);
  const topInd = new Set(Object.entries(winInd).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k]) => k));
  const pct = (p) => (winHC.length ? winHC[Math.min(winHC.length - 1, Math.floor(p * winHC.length))] : 0);
  const P10 = pct(0.10); const P25 = pct(0.25); const P75 = pct(0.75); const P90 = pct(0.90);
  // Size score 0–30: reward proximity to the winner mid-market heartland;
  // strongly dampen mega-caps (way above p90 — not representative of our
  // wins, brutal to land). Fixes Play B v1 surfacing Amazon/IBM over
  // Schrödinger-shaped mid-market companies.
  const sizeScore = (hc) => {
    if (!hc) return 8;                          // unknown size — low-neutral
    if (hc >= P25 && hc <= P75) return 30;      // winner heartland
    if (hc >= P10 && hc <= P90) return 18;      // adjacent
    if (hc < P10) return 8;                     // too small
    return 4;                                   // mega-cap vs our winners — dampened
  };

  // ---------- PLAY A: under-served active clients that are big multi-office ----------
  const playA = [];
  for (const c of real) {
    if (c.activity_status !== 'active' || !c.completed_events) continue;
    const ourSites = siteCount.get(c.id) || 0;
    const f = firmoOf(c);
    if (f.hc < 500) continue;                 // big enough to have many offices
    if (ourSites > Math.max(2, Math.ceil(f.hc / 4000))) continue; // we already serve a lot of them
    const headroom = Math.round(f.hc / Math.max(1, ourSites));
    playA.push({
      company_id: c.id, company: c.display_name, fit: c.fit_score, trajectory: c.trajectory,
      our_sites: ourSites, cities: [...(siteCities.get(c.id) || [])].join(' / '),
      emp: f.hc, industry: f.ind || c.ext_industry || '?',
      score: Math.round(c.fit_score * 0.5 + Math.min(50, headroom / 100)),
    });
  }
  playA.sort((a, b) => b.score - a.score);

  // ---------- PLAY B: cold prospects that look like winners (gated) ----------
  // best contact per prospect company (prefer good title)
  const prospects = new Map();
  for (const o of ocs) {
    if (o.crm_company_id) continue;            // already tied to a client = not net-new
    const dom = lc(o.email_domain); if (!dom) continue;
    const cat = titleCat(o.title);
    const cur = prospects.get(dom);
    const rank = cat && GOOD.has(cat) ? 2 : cat ? 1 : 0;
    if (!cur || rank > cur._rank) prospects.set(dom, { domain: dom, company: o.company, email: o.email, name: o.name, title: o.title, linkedin: o.linkedin_url || null, location: o.location || null, cat, _rank: rank });
  }
  const playB = [];
  for (const p of prospects.values()) {
    const e = byDom.get(p.domain); if (!e) continue;             // need firmographics
    const ind = Object.entries(e.ind).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const hc = e.hc.length ? e.hc.sort((a, b) => a - b)[e.hc.length >> 1] : 0;
    let s = 0;
    if (ind && topInd.has(ind)) s += 45;
    s += sizeScore(hc);
    if (p.cat && GOOD.has(p.cat)) s += 25; else if (p.cat) s += 8;
    if (s < 40) continue;                                        // weak resemblance — drop
    const gate = await preflight(sb, { email: p.email, domain: p.domain });
    if (gate.recommendation === 'skip_suppressed' || gate.recommendation === 'skip_already_client'
      || gate.recommendation === 'caution_recently_contacted') continue;
    const apoF = apolloByEmail.get(lc(p.email)) || apolloByDom.get(p.domain) || {};
    playB.push({
      company: p.company || p.domain, domain: p.domain, score: s, industry: ind, emp: hc,
      contact: p.name, title: p.title, title_cat: p.cat || '-',
      email: p.email || null,
      linkedin: p.linkedin || apoF.linkedin || null,
      location: p.location || apoF.location || null,
    });
  }
  playB.sort((a, b) => b.score - a.score);

  // ---------- RECONCILIATION: closed vs replied-not-closed vs never-reached ----------
  const replies = await readAll('outreach_replies', 'email, reply_sentiment');
  const repByEmail = new Map(replies.map((r) => [r.email, r.reply_sentiment]));
  const recon = {};
  const bump = (bucket, cat) => { recon[bucket] = recon[bucket] || {}; recon[bucket][cat || 'NoTitle'] = (recon[bucket][cat || 'NoTitle'] || 0) + 1; };
  const clientDomains = new Set();
  for (const c of real) if (c.completed_events > 0) for (const d of c.contact_domains || []) clientDomains.add(lc(d));
  for (const o of ocs) {
    const cat = titleCat(o.title);
    const sent = true; // everyone in outreach_contacts was in a campaign context
    const replied = repByEmail.has(o.email);
    const isClient = o.crm_company_id || (o.email_domain && clientDomains.has(lc(o.email_domain)));
    if (isClient) bump('closed_or_client', cat);
    else if (replied) bump('replied_no_close', cat);
    else bump('never_reached_or_no_reply', cat);
  }

  // ---------- output ----------
  writeFileSync(`${ROOT}/play_a.csv`, csv([['rank', 'company', 'fit_score', 'trajectory', 'our_sites', 'cities_we_serve', 'company_employees', 'industry', 'expansion_score'],
    ...playA.map((r, i) => [i + 1, r.company, r.fit, r.trajectory, r.our_sites, r.cities, r.emp, r.industry, r.score])]));
  writeFileSync(`${ROOT}/play_b.csv`, csv([['rank', 'company', 'domain', 'lookalike_score', 'industry', 'employees', 'suggested_contact', 'title', 'title_category'],
    ...playB.map((r, i) => [i + 1, r.company, r.domain, r.score, r.industry, r.emp, r.contact, r.title, r.title_cat])]));
  writeFileSync(`${ROOT}/reconciliation.csv`, csv([['bucket', 'title_category', 'count'],
    ...Object.entries(recon).flatMap(([b, m]) => Object.entries(m).map(([t, n]) => [b, t, n]))]));

  // ---------- persist for the /sales-intelligence page ----------
  const genAt = new Date().toISOString();
  await replaceAll('crm_play_a', playA.map((r, i) => ({
    rank: i + 1, play_score: r.score, fit_score: r.fit, company_id: r.company_id,
    company_name: r.company, employees: String(r.emp), industry: r.industry,
    sites_served: r.our_sites, sites_list: r.cities, generated_at: genAt,
  })));
  await replaceAll('crm_play_b', playB.map((r, i) => ({
    rank: i + 1, score: r.score, company_name: String(r.company), domain: r.domain,
    employees: String(r.emp), industry: r.industry, contact_name: r.contact,
    contact_title: r.title, title_category: r.title_cat,
    contact_email: r.email, contact_linkedin: r.linkedin, contact_location: r.location,
    generated_at: genAt,
  })));
  await replaceAll('crm_reconciliation', Object.entries(recon).map(([bucket, m]) => ({
    bucket, total: Object.values(m).reduce((x, y) => x + y, 0), title_breakdown: m, generated_at: genAt,
  })));
  log(`Persisted to Supabase (crm_play_a/b/reconciliation) @ ${genAt}`);

  log(`\n=== PLAY A — under-served active clients to expand (${playA.length}) ===`);
  for (const r of playA.slice(0, 15)) log(`  ${String(r.score).padStart(3)}  ${r.company?.slice(0, 26).padEnd(26)} fit=${r.fit} ${String(r.emp).padStart(6)}emp  we serve ${r.our_sites} (${r.cities})  ${r.industry}`);
  log(`\n=== PLAY B — net-new winner lookalikes, gated (${playB.length}) ===`);
  for (const r of playB.slice(0, 15)) log(`  ${String(r.score).padStart(3)}  ${String(r.company)?.slice(0, 26).padEnd(26)} ${String(r.emp).padStart(6)}emp  ${r.industry || '?'}  -> ${r.title || '?'} (${r.title_cat})`);
  log(`\n=== RECONCILIATION (where the machine is aimed) ===`);
  for (const [b, m] of Object.entries(recon)) {
    const tot = Object.values(m).reduce((x, y) => x + y, 0);
    const top = Object.entries(m).sort((a, b2) => b2[1] - a[1]).slice(0, 4).map(([t, n]) => `${t}:${n}`).join(' ');
    log(`  ${b.padEnd(28)} ${String(tot).padStart(6)}   top titles: ${top}`);
  }
  log(`\nCSVs written: play_a.csv (${playA.length}), play_b.csv (${playB.length}), reconciliation.csv`);
  log('DONE');
})().catch((e) => { console.error('PLAYS_ERROR:', e.message); process.exit(1); });
