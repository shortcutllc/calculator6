/**
 * cold-engine.mjs — the autonomous WEEKLY cold-campaign loop.
 *
 * Runs the five moves of one turn (Loop Engineering) over the cold lane:
 *   DISCOVERY  read belief model + current funnel → decide this week's target
 *   HANDOFF    pull net-new leads (find-leads.mjs) to fill the deficit
 *   VERIFY     MillionVerifier the candidates so deliverability is known
 *   CRITIQUE   cold-list-evaluator (the skeptic) cleans + judges pass|hold
 *   PERSIST    write the campaign-ready bundle + plan to disk
 *   then STOP at launch for one human click (the open door). Sending cold is
 *   the one irreversible, domain-reputation-risking act — it stays human-gated
 *   until the skeptic has earned trust. Flip with --launch --confirm.
 *
 * DRY BY DEFAULT — like find-leads.mjs, it spends/sends NOTHING without explicit
 * flags. Each external action has its own gate:
 *   --pull   --confirm   allow Apollo enrich spend (via find-leads)
 *   --verify --confirm   allow MillionVerifier spend
 *   --launch --confirm   allow Smartlead campaign create + send (only if PASS)
 *
 *   export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
 *   node scripts/cold-engine.mjs                          # dry weekly plan, 0 spend
 *   node scripts/cold-engine.mjs --target 300 --senders 4
 *   node scripts/cold-engine.mjs --verify --confirm       # verify candidates
 *   node scripts/cold-engine.mjs --launch --confirm --clone 2918745
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execFileSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';

const ROOT = '/Users/willnewton/Documents/GitHub/calculator6';
const OPENCLAW = '/Users/willnewton/.openclaw/workspace';
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d) => { const i = args.indexOf(f); return i !== -1 && args[i + 1] ? args[i + 1] : d; };

const TARGET = Math.max(0, parseInt(val('--target', '300'), 10) || 300);   // net-new leads to launch this week
const SENDERS = Math.max(1, parseInt(val('--senders', '4'), 10) || 4);     // sacrificial sending mailboxes available
const VERIFY_MAX = Math.max(TARGET, parseInt(val('--verify-max', String(TARGET)), 10) || TARGET); // how many to verify/skim (raise to land more ok)
const CLONE = val('--clone', null);                                        // Smartlead template campaign id to clone
const EDIT = val('--edit', null);                                          // existing campaign id → update its copy in place
const SEGMENT = (val('--segment', 'direct') || 'direct').toLowerCase();     // direct | broker | law | realestate — NEVER mix
const OPENER = (val('--opener', '') || '').toLowerCase();                   // E1 A/B; valid set depends on segment (see resolveSequence)
// Each segment has its OWN sequence + valid openers. Law/realestate are NOT the
// direct massage pitch — see memory/vertical_law_firm_gtm.md + vertical_real_estate_gtm.md.
// E3 LINK A/B (Will, 2026-07-02): direct + realestate E3 carries the per-lead
// book-a-call page link ({{landing_url}}) with a short-vs-long A/B. ON by default
// for those segments (--no-e3-link to disable). Law keeps {{cle_url}} in its one
// E3 link slot — the CLE page IS its personalized page. Smartlead's API cannot
// store variants (verified 2026-07-02: POST silently drops them), so the engine
// writes variant A and prints variant B for a one-time paste in the Smartlead UI,
// which unlocks native per-variant stats.
const E3LINK = has('--no-e3-link') ? false
  : (has('--e3-link') || SEGMENT === 'direct' || SEGMENT === 'realestate');
function resolveSequence(segment, opener, e3Link = false) {
  if (segment === 'law') return coldSequenceLaw(['cle', 'wellness'].includes(opener) ? opener : 'cle');
  if (segment === 'realestate') return coldSequenceRealEstate(['building', 'portfolio'].includes(opener) ? opener : 'building', { e3Link });
  return coldSequenceV3(['generic', 'rto'].includes(opener) ? opener : 'generic', { e3Link }); // direct (broker uses --clone)
}
const SEQ = resolveSequence(SEGMENT, OPENER, E3LINK);
// Variant B → the one manual step: paste into Smartlead UI (Sequences → step 3 →
// Add variant). Printed after every launch/edit that carries an A/B step.
function printVariantB(seq) {
  const e3 = (seq?.steps || []).find((s) => s.step === 3);
  const vb = e3?.abVariants?.[1];
  if (!vb) return;
  console.log('\n================ E3 VARIANT B — one manual step ================');
  console.log('Smartlead cannot receive A/B variants via API. In the campaign UI:');
  console.log('Sequences → email #3 → Add A/B variant → paste this as the body');
  console.log(`(label it "${vb.variantLabel}"), keep the subject blank/threaded, save.`);
  console.log('----------------------------------------------------------------');
  console.log(vb.body);
  console.log('================================================================\n');
}
const REGION = val('--region', null);                                      // eastern → NYC/Miami/Boston/Philly/DC
const EASTERN = ['New York', 'Miami', 'Boston', 'Philadelphia', 'Washington DC'];
const CITIES = (val('--cities', REGION === 'eastern' ? EASTERN.join('|') : '') || '').split('|').map((s) => s.trim()).filter(Boolean);
const DO_PULL = has('--pull'); const DO_VERIFY = has('--verify'); const DO_LAUNCH = has('--launch');
const CONFIRM = has('--confirm');

const URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!/^https?:\/\//i.test(URL) || !KEY) { console.error('MISSING_ENV (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)'); process.exit(2); }
if (!['direct', 'broker', 'law', 'realestate'].includes(SEGMENT)) { console.error('--segment must be direct | broker | law | realestate (never mixed)'); process.exit(2); }
const sb = createClient(URL, KEY, { auth: { persistSession: false } });
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);
const sizeNum = (n) => parseInt(String(n || '').replace(/[^\d]/g, ''), 10) || 0;

const envKey = (name) => {
  try { return (readFileSync(`${OPENCLAW}/.env`, 'utf8').match(new RegExp(`^${name}=(.+)$`, 'm'))?.[1] || '').trim().replace(/^["']|["']$/g, ''); }
  catch { return (process.env[name] || '').trim(); }
};

// Same taxonomy as the rest of the pipeline — keep in sync.
const titleCat = (t) => {
  const s = (t || '').toLowerCase();
  if (/hr|people|talent|human resources/.test(s)) return 'HR/People';
  if (/office (manager|coordinator|admin)/.test(s)) return 'OfficeMgr';
  if (/employee experience/.test(s)) return 'EmployeeExp';
  if (/workplace/.test(s)) return 'Workplace';
  if (/facilit/.test(s)) return 'Facilities';
  return t ? 'Other' : 'NoTitle';
};
const sizeBand = (n) => {
  const x = sizeNum(n); if (!x) return 'unknown';
  if (x <= 50) return '1-50'; if (x <= 200) return '51-200'; if (x <= 500) return '201-500';
  if (x <= 1000) return '501-1000'; if (x <= 5000) return '1001-5000';
  if (x <= 10000) return '5001-10000'; return '10001+';
};
const channelOf = (cid) => {
  const c = String(cid || '');
  if (/gmail|personal|booth|workhuman-personal/i.test(c)) return 'personal';
  if (/^\d+$/.test(c) || /smartlead/i.test(c)) return 'cold';
  return 'other';
};
const hubOf = (loc) => {
  const s = (loc || '').toLowerCase();
  if (!s) return 'Unknown';
  if (/new york|nyc|manhattan|brooklyn|\bny\b/.test(s)) return 'New York';
  if (/san franc|bay area|oakland|palo alto|\bsf\b/.test(s)) return 'SF Bay';
  if (/los angeles|santa monica|\bla\b/.test(s)) return 'Los Angeles';
  if (/boston|cambridge/.test(s)) return 'Boston';
  if (/chicago/.test(s)) return 'Chicago';
  if (/philadelph/.test(s)) return 'Philadelphia';
  if (/miami|fort lauderdale/.test(s)) return 'Miami';
  if (/austin/.test(s)) return 'Austin';
  if (/seattle/.test(s)) return 'Seattle';
  if (/washington|d\.?c\.?\b/.test(s)) return 'Washington DC';
  if (/atlanta/.test(s)) return 'Atlanta';
  return 'Other';
};

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

import { evaluateColdList } from './lib/cold-list-evaluator.mjs';
import { cleanCompany } from './lib/clean-company.mjs';
import { launchCampaign, updateCampaignSequence } from './lib/smartlead-launch.mjs';
import { coldSequenceV3 } from './lib/cold-sequence-v3.mjs';
import { coldSequenceLaw } from './lib/cold-sequence-law.mjs';
import { coldSequenceRealEstate } from './lib/cold-sequence-realestate.mjs';
import { evaluateCopy } from './lib/copy-evaluator.mjs';

// MillionVerifier one email → result code (ok|catch_all|unknown|invalid|disposable)
async function mvVerify(email, mvKey) {
  try {
    const r = await fetch(`https://api.millionverifier.com/api/v3/?api=${mvKey}&email=${encodeURIComponent(email)}&timeout=10`);
    const j = await r.json();
    return j.result || 'unknown';
  } catch { return 'unknown'; }
}

(async () => {
  log(`COLD ENGINE — segment ${SEGMENT.toUpperCase()} · target ${TARGET}/wk · ${SENDERS} senders · dry=${!CONFIRM}`);

  // --edit <campaignId>: update an existing campaign's COPY in place (no new
  // campaign, leads/senders untouched). Skips the whole lead pipeline.
  if (EDIT) {
    const verdict = evaluateCopy(SEQ, { segment: SEGMENT, opener: OPENER });
    log(`EDIT campaign ${EDIT}: copy verdict ${verdict.verdict.toUpperCase()} (${verdict.violations.length} violations)`);
    if (verdict.verdict !== 'pass') { for (const v of verdict.violations) log(`  • E${v.step} ${v.rule}: ${v.detail}`); return; }
    const SL = envKey('SMARTLEAD_API_KEY');
    if (!SL) { log('EDIT refused: MISSING SMARTLEAD_API_KEY (openclaw .env).'); return; }
    if (E3LINK) log('  E3 carries {{landing_url}} — every lead in this campaign needs the custom field first (scripts/mint-landing-pages.mjs --campaign <id> --confirm).');
    if (!CONFIRM) {
      const plan = await updateCampaignSequence({ apiKey: SL, campaignId: EDIT, sequence: SEQ, dryRun: true });
      log(`EDIT plan: would replace campaign ${EDIT}'s sequence with the current v3 copy (${plan.would_write_steps} steps). Re-run with --confirm.`);
      return;
    }
    const res = await updateCampaignSequence({ apiKey: SL, campaignId: EDIT, sequence: SEQ });
    log(`EDIT done: campaign ${res.campaign_id} — replaced sequence, wrote ${res.wrote_steps} steps. ${res.url}`);
    printVariantB(SEQ);
    return;
  }

  // ---------- DISCOVERY ----------
  let belief = null;
  if (existsSync(`${ROOT}/belief_model.json`)) {
    try { belief = JSON.parse(readFileSync(`${ROOT}/belief_model.json`, 'utf8')); } catch {}
  }
  log(belief ? `belief model loaded (${belief.generated_at})` : 'no belief_model.json — using evaluator defaults');

  // load context sets + firmographics, once
  const contacts = await readAll('outreach_contacts', 'email, name, company, title, email_domain, location, source, crm_company_id, broker_track, mv_status, bounceban_status, channel, graduated_at');
  const sends = await readAll('outreach_sends', 'email, campaign_id');
  const persons = await readAll('apollo_person_cache', 'email, email_domain, company_headcount');
  const companies = await readAll('crm_companies', 'contact_domains, completed_events, ext_employee_size');
  const supp = new Set((await readAll('crm_suppression', 'email')).map((r) => lc(r.email)));
  // Broker channel = its own segment. A contact is a broker if broker_track is
  // set OR its domain is a known broker/carrier target firm. Never cold-blast
  // brokers with the direct-corporate template.
  let brokerDomains = new Set();
  try { brokerDomains = new Set((await readAll('crm_target_firms', 'domain')).map((r) => lc(r.domain)?.replace(/^www\./, '')).filter(Boolean)); }
  catch { /* table optional */ }

  const contactedAll = new Set();          // anyone ever sent to (any channel)
  const personalLane = new Set();          // emails touched on the personal channel — the wall
  for (const s of sends) {
    const e = lc(s.email); if (!e) continue;
    contactedAll.add(e);
    if (channelOf(s.campaign_id) === 'personal') personalLane.add(e);
  }
  const clientDomains = new Set();
  for (const c of companies) if (c.completed_events > 0) for (const d of c.contact_domains || []) clientDomains.add(lc(d)?.replace(/^www\./, ''));

  // firmographics by email + domain (headcount → size band)
  const hcByEmail = new Map(); const hcByDom = new Map();
  for (const p of persons) {
    const e = lc(p.email); const d = lc(p.email_domain)?.replace(/^www\./, '');
    const hc = sizeNum(p.company_headcount);
    if (e && hc) hcByEmail.set(e, hc);
    if (d && hc && !hcByDom.has(d)) hcByDom.set(d, hc);
  }

  // Per-lead CLE landing page by state (accredited NY/FL/PA only; NY = default
  // /cle). Powers the {{cle_url}} merge tag in the law E3 so each firm gets its
  // own state's page. Never points anywhere we are not accredited.
  const CLE_BASE = 'https://proposals.getshortcut.co';
  const cleUrlFor = (loc) => {
    const s = (loc || '').toLowerCase();
    if (/pennsylvania|philadelph|pittsburgh|\bpa\b/.test(s)) return `${CLE_BASE}/cle/pa`;
    if (/florida|miami|tampa|orlando|fort lauderdale|jacksonville|\bfl\b/.test(s)) return `${CLE_BASE}/cle/fl`;
    return `${CLE_BASE}/cle`; // New York (and safe default)
  };

  // CANDIDATE POOL = leads we have but have NEVER sent to (ready to launch)
  const candidates = [];
  let sheetSkipped = 0;
  for (const o of contacts) {
    const e = lc(o.email); if (!e || contactedAll.has(e)) continue;          // unsent only
    if (supp.has(e) || personalLane.has(e)) continue;
    if (o.channel === 'personal' || o.graduated_at) continue;               // graduated to personal — never re-cold
    // PROVENANCE GUARD: only cold-send leads from our verified Apollo pipeline.
    // Manually-imported "sheet:*" leads are unverified guessed-pattern emails that
    // MillionVerifier false-OK'd (they hard-bounced on netflix/coinbase/gusto/etsy
    // in campaign 3557935). mv='ok' alone is NOT enough without Apollo provenance.
    if ((o.source || '').startsWith('sheet:') && o.bounceban_status !== 'deliverable') { sheetSkipped += 1; continue; }
    const dom = lc(o.email_domain)?.replace(/^www\./, '') || (e.includes('@') ? e.split('@')[1] : null);
    if (dom && clientDomains.has(dom)) continue;
    const hc = hcByEmail.get(e) || (dom ? hcByDom.get(dom) : 0) || 0;
    // Segment: brokers (broker_track / target firm), then law + real estate
    // (their own messaging, never in direct cold), else direct.
    let segment = 'direct';
    if (o.broker_track || (dom && brokerDomains.has(dom))) segment = 'broker';
    else if ((o.source || '').endsWith('-law')) segment = 'law';
    else if ((o.source || '').endsWith('-realestate')) segment = 'realestate';
    candidates.push({ email: e, email_domain: dom, name: o.name || null, company: o.company || null, title_cat: titleCat(o.title), size_band: sizeBand(hc), mv_status: o.mv_status || null, bounceban_status: o.bounceban_status || null, source: o.source || null, segment, hub: hubOf(o.location), cle_url: cleUrlFor(o.location) });
  }
  const bySeg = candidates.reduce((m, c) => { m[c.segment] = (m[c.segment] || 0) + 1; return m; }, {});
  let pool = candidates.filter((c) => c.segment === SEGMENT);
  if (CITIES.length) pool = pool.filter((c) => CITIES.includes(c.hub));
  const deficit = Math.max(0, TARGET - pool.length);
  const cityNote = CITIES.length ? ` · cities [${CITIES.join(', ')}]` : '';
  log(`DISCOVERY: ${candidates.length} unsent (${Object.entries(bySeg).map(([s, n]) => `${n} ${s}`).join(' / ')}) · targeting ${SEGMENT.toUpperCase()}${cityNote} → ${pool.length} ready · target ${TARGET} · deficit ${deficit}`);
  if (sheetSkipped) log(`  provenance guard: excluded ${sheetSkipped} unverified sheet-import leads (cold ships only verified Apollo-pipeline leads).`);
  if (SEGMENT === 'broker') log('  NOTE: broker batch — clone a BROKER template (carrier-fund angle), not a direct-corporate one. Consider the personal lane for Tier-A brokers.');

  // ---------- HANDOFF (pull to fill deficit) ----------
  if (deficit > 0 && SEGMENT === 'direct') {
    if (DO_PULL && CONFIRM) {
      log(`HANDOFF: pulling ${deficit} net-new via find-leads.mjs (Apollo spend)…`);
      try {
        execFileSync('node', [`${ROOT}/scripts/find-leads.mjs`, '--enrich', '--max', String(deficit), '--confirm'],
          { cwd: ROOT, stdio: 'inherit', env: process.env });
      } catch (e) { log(`find-leads failed: ${e.message}`); }
      log('Re-run cold-engine to pick up the newly enriched candidates.');
      return; // candidates changed; restart cleanly next run
    }
    log(`HANDOFF: would pull ${deficit} net-new DIRECT leads (run with --pull --confirm to spend Apollo credits).`);
  } else if (deficit > 0) {
    log(`HANDOFF: ${deficit} short on BROKER leads — find-leads pulls direct ICP only. Broker leads come from the broker GTM ingestion, not Apollo title search.`);
  }

  // working set to verify + judge. Verify a bigger pool (--verify-max) so we can
  // skim enough deliverable (ok) leads to hit target after parking catch_all.
  const working = pool.slice(0, VERIFY_MAX);

  // ---------- VERIFY (MillionVerifier) ----------
  const needVerify = working.filter((l) => !l.mv_status);
  if (needVerify.length) {
    if (DO_VERIFY && CONFIRM) {
      const mvKey = envKey('MILLIONVERIFIER_API_KEY');
      if (!mvKey) { log('VERIFY: MISSING MILLIONVERIFIER_API_KEY (openclaw .env) — skipping'); }
      else {
        log(`VERIFY: MillionVerifier on ${needVerify.length} candidates…`);
        let done = 0;
        for (const l of needVerify) {
          l.mv_status = await mvVerify(l.email, mvKey);
          if (++done % 50 === 0) log(`  verified ${done}/${needVerify.length}`);
          await new Promise((r) => setTimeout(r, 80));
        }
        // Persist so verification is durable (never re-verify) + viewable in Play B.
        const at = new Date().toISOString();
        let saved = 0;
        for (let i = 0; i < needVerify.length; i += 200) {
          const rows = needVerify.slice(i, i + 200).map((l) => ({ email: l.email, mv_status: l.mv_status, mv_checked_at: at }));
          const { error } = await sb.from('outreach_contacts').upsert(rows, { onConflict: 'email' });
          if (error) log(`  writeback warn: ${error.message}`); else saved += rows.length;
        }
        log(`VERIFY done. Persisted ${saved} mv_status to outreach_contacts.`);
      }
    } else {
      log(`VERIFY: ${needVerify.length} candidates unverified — run with --verify --confirm. (Skeptic will HOLD on unverified, by design.)`);
    }
  }

  // ---------- CRITIQUE (the skeptic) ----------
  const ctx = { suppressed: supp, clientDomains, contacted: contactedAll, personalLane, senderCount: SENDERS };
  const goodBands = belief ? new Set((belief.who?.size_band || []).filter((b) => b.reply_lb95 > 0 && b.confidence !== 'insufficient').map((b) => b.value)) : undefined;
  const evalOpts = goodBands && goodBands.size ? { goodBands } : {};
  // Vertical pools (law / realestate / broker) are precision-pulled by their own
  // vertical titles + industry, so the generic converting-title floor (calibrated
  // for the direct HR/OfficeMgr ICP — e.g. a CLE Manager scores as "Other") does
  // not apply: the whole pool IS the ICP by construction. Relax it off-direct.
  if (SEGMENT !== 'direct') evalOpts.minGoodTitleRate = 0;
  const verdict = evaluateColdList(working, ctx, evalOpts);

  log('================ SKEPTIC VERDICT ================');
  log(`verdict: ${verdict.verdict.toUpperCase()}  · score ${verdict.score}`);
  log(`stats: ${JSON.stringify(verdict.stats)}`);
  if (verdict.reasons.length) { log('HOLD reasons:'); for (const r of verdict.reasons) log(`  • ${r}`); }
  log('=================================================');

  // Park catch_all: never sent, saved for a future catch-all verification tool.
  // Also persisted as mv_status='catch_all' in outreach_contacts (queryable list).
  if (verdict.parked && verdict.parked.length) {
    const rows = [['email', 'company', 'title_cat', 'size_band']].concat(
      verdict.parked.map((l) => [l.email, l.company || '', l.title_cat || '', l.size_band || '']));
    const csv = rows.map((r) => r.map((c) => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(',')).join('\n');
    writeFileSync(`${ROOT}/cold_engine_catch_all.csv`, csv);
    log(`PARKED ${verdict.parked.length} catch_all → cold_engine_catch_all.csv (never sent; also mv_status='catch_all' in DB).`);
  }

  // ---------- PERSIST (campaign-ready bundle + plan) ----------
  const week = new Date().toISOString().slice(0, 10);
  const shipLeads = verdict.cleanLeads.slice(0, TARGET);   // ok-only, capped to target
  const campaignName = `Cold Engine | ${week} | ${SEGMENT} | ${shipLeads.length} leads`;
  const bundle = {
    generated_at: new Date().toISOString(),
    week, campaign_name: campaignName,
    clone_template_id: CLONE,
    verdict: verdict.verdict, score: verdict.score, reasons: verdict.reasons, stats: verdict.stats,
    senders: SENDERS,
    leads: shipLeads.map((l) => {
      const [first, ...rest] = String(l.name || '').trim().split(/\s+/);
      return {
        email: l.email,
        first_name: first || '',
        last_name: rest.join(' '),
        company_name: cleanCompany(l.company) || '',
        custom_fields: {
          title_cat: l.title_cat, size_band: l.size_band, mv: l.mv_status || '', bb: l.bounceban_status || '', source: l.source || '',
          // Law E3 links each firm to ITS state's CLE page via {{cle_url}}.
          ...(SEGMENT === 'law' ? { cle_url: l.cle_url || `https://proposals.getshortcut.co/cle` } : {}),
        },
      };
    }),
  };
  writeFileSync(`${ROOT}/cold_engine_plan.json`, JSON.stringify(bundle, null, 2));
  log(`PERSIST: wrote cold_engine_plan.json (${bundle.leads.length} clean leads)`);

  // ---------- LAUNCH (guarded — the one human door) ----------
  if (verdict.verdict !== 'pass') {
    log('STOP: skeptic did not PASS — nothing launches. Resolve the HOLD reasons above, then re-run.');
    log('Most common fix: run --verify --confirm so deliverability is known, and --pull --confirm to reach target volume.');
    return;
  }
  // ---------- JUDGE (advisory LLM strategic-fit — the middle gate between the
  // deterministic skeptic and the human launch click). Never blocks. ----------
  if (has('--judge')) {
    const ak = envKey('ANTHROPIC_API_KEY');
    if (!ak) log('JUDGE: skipped (no ANTHROPIC_API_KEY in .env / openclaw .env).');
    else if (CLONE) log('JUDGE: skipped (cloning a template — no composed copy to judge).');
    else {
      try {
        const [{ default: Anthropic }, { judgeCopy }] = await Promise.all([import('@anthropic-ai/sdk'), import('./lib/copy-judge.mjs')]);
        const j = await judgeCopy({ anthropic: new Anthropic({ apiKey: ak }), sequence: SEQ, segment: SEGMENT });
        log(`JUDGE (advisory): ${j.verdict.toUpperCase()} · ${j.score}/100 — ${j.would_reply_read}`);
        if (j.issues.length) log('  issues: ' + j.issues.map((i) => `[${i.severity}] E${i.step} ${i.issue}`).join(' · '));
        if (j.suggestions.length) log('  fixes: ' + j.suggestions.slice(0, 4).join(' · '));
        log('  (advisory only — does not block; the human decides.)');
      } catch (e) { log(`JUDGE: error (${e.message}) — proceeding, advisory only.`); }
    }
  }

  const SMARTLEAD = envKey('SMARTLEAD_API_KEY');

  // ---------- PAGES (E3 link mode): one personalized book-a-call page per company,
  // {{landing_url}} on every lead. Minted only on a real launch (Brandfetch spend);
  // reused when a page for that company already exists. Generic fallback so the
  // merge tag can never render empty. ----------
  if (E3LINK && !CLONE) {
    const uniq = new Set(bundle.leads.map((l) => lc(l.company_name)).filter(Boolean));
    if (DO_LAUNCH && CONFIRM) {
      const { mintLandingPages, landingUrlFor } = await import('./lib/landing-pages.mjs');
      log(`PAGES: resolving ${uniq.size} company book-a-call pages (reuse first, Brandfetch-first mint for the rest)…`);
      const pageMap = await mintLandingPages({ sb, companies: bundle.leads.map((l) => ({ company: l.company_name, domain: l.email.split('@')[1] })), log });
      for (const l of bundle.leads) l.custom_fields.landing_url = landingUrlFor(pageMap, l.company_name);
    } else {
      log(`PAGES: E3 link A/B is ON — a confirmed launch will mint/reuse ~${uniq.size} personalized pages and set {{landing_url}} per lead.`);
    }
  }

  // Default to the approved v3 copy; --clone <id> overrides to clone a template.
  const launchOpts = { apiKey: SMARTLEAD, name: campaignName, leads: bundle.leads, cloneFromId: CLONE, sequence: CLONE ? undefined : SEQ };
  if (!(DO_LAUNCH && CONFIRM)) {
    try {
      const plan = await launchCampaign({ ...launchOpts, dryRun: true });
      log('================ READY FOR APPROVAL — launch plan ================');
      log(`  campaign  : ${plan.name}`);
      log(`  copy      : ${plan.copy_source}`);
      log(`  senders   : ${plan.sender_count} inboxes on the allowed domains (${plan.sender_source})`);
      log(`  schedule  : days ${plan.schedule.days_of_the_week} ${plan.schedule.start_hour}-${plan.schedule.end_hour} ${plan.schedule.timezone}, ${plan.schedule.max_new_leads_per_day}/day`);
      log(`  settings  : tracking OFF, AI ESP matching ON, stop on reply`);
      log(`  leads     : ${plan.lead_count}`);
      log('=================================================================');
    } catch (e) { log(`plan preview failed: ${e.message}`); }
    log('Launch with: --launch --confirm   (uses the approved v3 copy; add --clone <id> to clone a template instead)');
    return;
  }
  if (!SMARTLEAD) { log('LAUNCH refused: MISSING SMARTLEAD_API_KEY (openclaw .env).'); return; }
  log(`LAUNCH: building Smartlead campaign "${campaignName}" (${CLONE ? 'clone ' + CLONE : 'v3 copy'}) on the allowed-domain inboxes…`);
  try {
    const res = await launchCampaign(launchOpts);
    log(`LAUNCH complete: campaign ${res.campaign_id} · ${res.assigned_senders} senders · ${res.uploaded} leads.`);
    log(`  ${res.url}`);
    log('Track replies via pull-smartlead; positive replies graduate to the personal lane.');
    printVariantB(SEQ);
  } catch (e) { log(`LAUNCH failed: ${e.message}`); process.exit(1); }
  log('DONE');
})().catch((e) => { console.error('COLD_ENGINE_ERROR:', e.message); process.exit(1); });
