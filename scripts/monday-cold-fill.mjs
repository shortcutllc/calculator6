/**
 * monday-cold-fill.mjs — guarantee the Monday direct campaign reaches --target
 * verified leads, then let cold-engine build it (DRAFTED, for Will's review).
 *
 * Why: cold-engine's HANDOFF pulls ONCE (shallow, 3 pages) then returns without
 * building, so a depleted pool produced no campaign (or a tiny one). This
 * orchestrator PRE-FILLS the banked verified-sendable direct-eastern pool to
 * target×margin by looping find-leads (deep pages, rotating eastern metros) until
 * the goal is met, THEN runs cold-engine — which now sees a full pool and builds a
 * full DRAFTED campaign in one pass. cold-engine's launchCampaign never starts
 * sending, so the result is a draft Will reviews + launches by hand.
 *
 * Reuses tested pieces (find-leads, cold-engine) — the core engine is untouched.
 *
 *   node scripts/monday-cold-fill.mjs            # DRY: show the fill plan, 0 spend
 *   node scripts/monday-cold-fill.mjs --confirm  # LIVE: pull to goal, then build the draft
 *
 * Cost: ~1.7 Apollo credits per net-new sendable lead (MV attrition), so a 200-lead
 * week from a near-empty pool is ~350-400 Apollo credits. Skips pulling for any
 * surplus already banked.
 */
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const ROOT = '/Users/willnewton/Documents/GitHub/calculator6';
const val = (f, d) => { const i = process.argv.indexOf(f); return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const CONFIRM = process.argv.includes('--confirm');
const TARGET = parseInt(val('--target', '200'), 10);
const MARGIN = parseFloat(val('--margin', '1.25'));           // pull a cushion so the skeptic's title-gating still leaves TARGET
const GOAL = Math.ceil(TARGET * MARGIN);
const MAX_PULLS = parseInt(val('--max-pulls', '8'), 10);
// Eastern metros to rotate through as each depletes (Apollo metro strings).
const CITIES = (val('--cities', 'New York Metropolitan Area|Greater Boston|Miami-Fort Lauderdale Area|Greater Philadelphia|Washington DC-Baltimore Area') || '').split('|').map((s) => s.trim()).filter(Boolean);

const sb = createClient((process.env.SUPABASE_URL || '').trim(), (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(), { auth: { persistSession: false } });
const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const EAST = /new york|nyc|manhattan|brooklyn|miami|fort lauderdale|boston|cambridge|philadelph|washington|d\.?c\.?/i;
async function rA(t, c) { const o = []; for (let f = 0; ; f += 1000) { const { data } = await sb.from(t).select(c).range(f, f + 999); o.push(...(data || [])); if (!data || data.length < 1000) break; } return o; }

async function bankedSendable() {
  const sends = new Set((await rA('outreach_sends', 'email')).map((s) => lc(s.email)));
  const supp = new Set((await rA('crm_suppression', 'email')).map((r) => lc(r.email)));
  const firms = new Set((await rA('crm_target_firms', 'domain')).map((r) => lc(r.domain)?.replace(/^www\./, '')).filter(Boolean));
  const c = await rA('outreach_contacts', 'email,source,broker_track,channel,graduated_at,in_campaign,mv_status,bounceban_status,location,email_domain');
  const srcl = (s) => (s || '').toLowerCase();
  const isDirect = (x) => { const d = lc(x.email_domain); if (x.broker_track || (d && firms.has(d))) return false; if (/real[\s_-]?estate/.test(srcl(x.source))) return false; if (/\blaw\b/.test(srcl(x.source))) return false; return true; };
  return c.filter((x) => x.email && isDirect(x) && x.channel !== 'personal' && !x.graduated_at && !sends.has(lc(x.email)) && !supp.has(lc(x.email)) && !x.in_campaign && EAST.test(x.location || '') && (x.mv_status === 'ok' || x.bounceban_status === 'deliverable') && !((x.source || '').startsWith('sheet:') && x.bounceban_status !== 'deliverable')).length;
}

(async () => {
  let banked = await bankedSendable();
  log(`FILL: banked sendable direct-eastern = ${banked} · goal ${GOAL} (target ${TARGET} × margin ${MARGIN})`);
  if (banked >= GOAL) { log('pool already at goal — no pull needed.'); }
  else if (!CONFIRM) {
    log(`DRY: would loop find-leads (deep pages, metros ${CITIES.join(', ')}) until banked >= ${GOAL} (need ~${GOAL - banked} more, ~${Math.ceil((GOAL - banked) * 1.7)} Apollo credits), then run cold-engine --target ${TARGET}.`);
    log('Re-run with --confirm to spend + build.');
    return;
  } else {
    let pulls = 0, ci = 0;
    while (banked < GOAL && pulls < MAX_PULLS) {
      const need = GOAL - banked;
      const max = Math.min(250, Math.ceil(need * 1.8));
      const city = CITIES[ci % CITIES.length];
      log(`  pull ${pulls + 1}: find-leads --city "${city}" --enrich --max ${max} --pages 30 (need ${need} more sendable)…`);
      const before = banked;
      try {
        execFileSync('node', [`${ROOT}/scripts/find-leads.mjs`, '--city', city, '--enrich', '--max', String(max), '--pages', '30', '--confirm'], { cwd: ROOT, stdio: 'inherit', env: process.env });
      } catch (e) { log(`  find-leads failed: ${e.message}`); }
      banked = await bankedSendable();
      const gained = banked - before;
      log(`  → +${gained} sendable (banked now ${banked})`);
      if (gained < 10) { ci += 1; log(`  metro "${city}" thin (+${gained}); rotating to next metro.`); if (ci >= CITIES.length * 2) { log('  all metros thin — stopping pull loop.'); break; } }
      pulls += 1;
    }
    if (banked < GOAL) log(`WARN: reached ${banked}/${GOAL} after ${pulls} pulls (eastern net-new may be depleting — consider widening cities/titles). Building with what we have.`);
  }

  // Build the DRAFTED campaign from the now-full pool (cold-engine leaves it drafted).
  log(`BUILD: cold-engine --region eastern --segment direct --target ${TARGET} (DRAFTED for review)…`);
  if (!CONFIRM) return;
  try {
    execFileSync('node', [`${ROOT}/scripts/cold-engine.mjs`, '--region', 'eastern', '--segment', 'direct', '--senders', '10', '--verify-max', '1200', '--target', String(TARGET), '--pull', '--verify', '--judge', '--launch', '--confirm', '--notify'], { cwd: ROOT, stdio: 'inherit', env: process.env });
  } catch (e) { log(`cold-engine build failed: ${e.message}`); process.exit(1); }
  log('DONE: campaign built DRAFTED — Will reviews + launches in the Smartlead UI.');
})().catch((e) => { console.error('MONDAY_FILL_ERROR:', e.message); process.exit(1); });
