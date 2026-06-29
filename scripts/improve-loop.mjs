/**
 * improve-loop.mjs — the weekly self-improve loop for the cold-campaign brain.
 *
 * Closes the loop the cold engine opened: OBSERVE the live outcomes, HYPOTHESIZE
 * what to try next, CRITIQUE every hypothesis with a separate skeptic that
 * defaults to "noise", design a BOUNDED 80/20 experiment from what survives, and
 * PERSIST it for a human to approve. It never launches anything — the cold
 * launch stays a human door. Output is a recommended cold-engine command, not a
 * send.
 *
 *   OBSERVE     rebuild belief_model.json from send/reply history (--rebuild),
 *               or read the existing one (warns if stale)
 *   HYPOTHESIZE belief-generator mines exploit + explore candidates
 *   CRITIQUE    belief-skeptic rejects small-sample flukes, selection bias,
 *               zero-levers, dead patterns (defaults to reject)
 *   EXPERIMENT  80% exploit the proven setup, 20% one bounded explore, with the
 *               sample size needed to actually call it
 *   PERSIST     belief_experiments.json + belief_experiments.md at repo root
 *
 * Read-only on Supabase (only --rebuild shells out to build-belief-model, which
 * is itself read-only). No Apollo, no Smartlead, no sends.
 *
 *   export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...   # only for --rebuild
 *   node scripts/improve-loop.mjs              # read belief_model.json, plan
 *   node scripts/improve-loop.mjs --rebuild    # refresh the model first, then plan
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execFileSync } from 'child_process';
import { generateHypotheses } from './lib/belief-generator.mjs';
import { critiqueHypotheses, minNToProve } from './lib/belief-skeptic.mjs';

const ROOT = '/Users/willnewton/Documents/GitHub/calculator6';
const REBUILD = process.argv.includes('--rebuild');
const log = (...a) => console.log(...a);
const pct = (x) => `${(x * 100).toFixed(2)}%`;

// The proven base setup (the 80% exploit) when no targeting cell earns its own
// edge — "keep doing what works". Mirrors the live campaign config / brain.
const PROVEN_BASE = {
  region: 'eastern', segment: 'direct', opener: 'generic',
  why: 'Eastern direct, generic opener, MV ok-only, Tue/Wed/Thu 9-12 ET. The live, deliverable, on-spine setup. Cold has a ~1% positive ceiling, so the base is "do not break what works", not a targeting bet.',
};

function loadBelief() {
  if (REBUILD) {
    log('OBSERVE — rebuilding belief_model.json (channel=cold)...');
    try {
      execFileSync('node', ['scripts/build-belief-model.mjs', '--channel', 'cold'], { cwd: ROOT, stdio: 'inherit' });
    } catch (e) {
      log(`  rebuild failed (${e.message}). Falling back to the existing belief_model.json.`);
    }
  }
  const path = `${ROOT}/belief_model.json`;
  if (!existsSync(path)) { console.error('NO_BELIEF_MODEL: run `node scripts/build-belief-model.mjs --channel cold` first (or pass --rebuild).'); process.exit(2); }
  return JSON.parse(readFileSync(path, 'utf8'));
}

// Map an accepted hypothesis to the cold-engine knob that actions it, if any.
// The engine exposes --opener, --region, --segment. WHO cells (title/size/
// industry) have no direct filter yet, so they are advisory until one exists.
function toEngineAction(h) {
  if (h.face === 'opener') return { flag: `--opener ${h.value}`, actionable: true };
  if (h.face === 'hub') {
    const eastern = /new york|miami|boston|philadelphia|washington/i.test(h.value);
    return eastern
      ? { flag: '--region eastern', actionable: true, note: `concentrates on ${h.value} (within eastern)` }
      : { flag: `--cities "${h.value}"`, actionable: true };
  }
  if (h.face === 'cross') {
    const hub = String(h.value).split('|')[1]?.trim();
    if (hub && /new york|miami|boston|philadelphia|washington/i.test(hub)) return { flag: '--region eastern', actionable: true, note: `cell ${h.value}; engine cannot yet filter title, so this targets the hub only` };
  }
  // Size is ALREADY wired: Apollo pulls 201-5000 (find-leads SIZE_RANGES) and
  // cold-engine filters to the belief model's good size bands (cold-engine.mjs).
  // So a winning size cell needs no new feature — just confirm it is in range.
  if (h.face === 'size_band') {
    return { flag: null, actionable: false, note: `Already handled: Apollo pulls mid-market (find-leads SIZE_RANGES) and the cold engine filters to the belief model's good size bands. Confirm ${h.value} is in SIZE_RANGES + goodBands; no new feature needed.` };
  }
  // Industry is allow/deny only: Apollo's allow-list treats 82 industries
  // equally and the cold engine does not weight the pool by industry at all.
  // The real lever is to PRIORITISE proven-winning industries, not build
  // targeting from scratch.
  if (h.face === 'industry') {
    return { flag: null, actionable: false, note: `Allow/deny exists (Apollo's 82-industry allow-list) but is not PRIORITISED. Weight find-leads + the cold-engine pool toward ${h.value} (the engine already weights by size; do the same for industry).` };
  }
  return { flag: null, actionable: false, note: 'No direct cold-engine flag for this face. Advisory: prioritise this cell when building the pool.' };
}

(async () => {
  const belief = loadBelief();
  const ageDays = (Date.now() - new Date(belief.generated_at).getTime()) / 86400000;
  log(`\nBelief model: generated ${belief.generated_at} (${ageDays.toFixed(1)}d old, channel=${belief.channel_filter})`);
  if (!REBUILD && ageDays > 7) log(`  ⚠️  STALE (>7d). Re-run with --rebuild before trusting the plan.`);

  // HYPOTHESIZE
  const hypotheses = generateHypotheses(belief);
  log(`\nHYPOTHESIZE — ${hypotheses.length} candidates (${hypotheses.filter((h) => h.kind === 'exploit').length} exploit, ${hypotheses.filter((h) => h.kind === 'explore').length} explore)`);

  // CRITIQUE
  const { accepted, rejected, baseline_positive_floor, params } = critiqueHypotheses(hypotheses, belief);
  log(`\nCRITIQUE — baseline cold positive floor = ${pct(baseline_positive_floor)} (the bar everything must clear)`);
  log(`  ACCEPTED ${accepted.length}:`);
  for (const h of accepted) log(`    ✓ [${h.kind}] ${h.face}=${h.value} · floor ${pct(h.positive_floor)} · ${h.claim}`);
  log(`  REJECTED ${rejected.length} (showing top reasons):`);
  for (const h of rejected.slice(0, 12)) log(`    ✗ [${h.kind}] ${h.face}=${h.value} — ${h.reasons[0]}`);
  if (rejected.length > 12) log(`    …and ${rejected.length - 12} more`);

  // EXPERIMENT — 80% exploit the proven base, 20% one bounded explore arm.
  // Build every command from one knob set so flags never duplicate.
  const cmd = ({ opener = PROVEN_BASE.opener, region = PROVEN_BASE.region, segment = PROVEN_BASE.segment, cities = null, verifyMax = 1200 }) => {
    const where = cities ? `--cities "${cities}"` : `--region ${region}`;
    return `node scripts/cold-engine.mjs ${where} --segment ${segment} --opener ${opener} --senders 10 --verify-max ${verifyMax}`;
  };

  // 80% base: the proven, deliverable operational setup. Accepted firmographic
  // exploits (size/industry) can't be filtered by a cold-engine flag yet, so
  // they ride as ADVISORY guidance for pool-building, not a command change.
  const advisoryCells = accepted
    .filter((h) => h.kind === 'exploit')
    .map((h) => ({ face: h.face, value: h.value, positive_floor: h.positive_floor, claim: h.claim, action: toEngineAction(h) }));
  const exploitCmd = cmd({ verifyMax: 1200 });

  // 20% arm: prefer the strategic RTO opener (actionable, approved, untested);
  // else the best directly-actionable explore (a hub → region/cities) with a
  // non-trivial sample. Skip thin cells that can't be cleanly actioned.
  const arms = accepted.filter((h) => h.kind === 'explore');
  const pickArm = arms.find((h) => h.face === 'opener')
    || arms.filter((h) => toEngineAction(h).actionable && (h.evidence?.sent || 0) >= 10)
           .sort((a, b) => b.positive_floor - a.positive_floor)[0]
    || arms[0] || null;

  let arm = null;
  if (pickArm) {
    const act = toEngineAction(pickArm);
    const coldRate = belief.where?.channel?.find((r) => r.value === 'cold')?.positive_rate || 0.009;
    const target = Math.max(coldRate * 2, baseline_positive_floor * 2);   // power for a hoped 2x lift
    const needN = minNToProve(target, baseline_positive_floor);
    let armCmd = null;
    if (pickArm.face === 'opener') armCmd = cmd({ opener: pickArm.value, verifyMax: 400 });
    else if (act.actionable && /--region/.test(act.flag || '')) armCmd = cmd({ verifyMax: 400 });
    else if (act.actionable && /--cities/.test(act.flag || '')) armCmd = cmd({ cities: String(pickArm.value).split('|')[0].trim(), verifyMax: 400 });
    arm = {
      hypothesis: pickArm, budget_pct: pickArm.budget_pct ?? params.maxExplorePct,
      mechanism: pickArm.mechanism, actionable: act.actionable, action_note: act.note || null,
      success_metric: 'positive_rate', baseline_floor: baseline_positive_floor,
      target_positive_rate: +target.toFixed(4),
      min_sends_to_call_it: Number.isFinite(needN) ? needN : null,
      recommended_command: armCmd,
    };
  }

  const week = new Date().toISOString().slice(0, 10);
  const hasActionableTargeting = advisoryCells.length > 0;
  const plan = {
    generated_at: new Date().toISOString(),
    week,
    belief_model_generated_at: belief.generated_at,
    baseline_positive_floor,
    skeptic_params: params,
    counts: { hypotheses: hypotheses.length, accepted: accepted.length, rejected: rejected.length },
    experiment: {
      design: '80% exploit the proven base, 20% one bounded explore arm. Measure positive_rate.',
      exploit_80: { base: PROVEN_BASE, recommended_command: exploitCmd, advisory_cells: advisoryCells },
      explore_20: arm,
      other_explores_considered: arms.filter((h) => h !== pickArm).map((h) => ({ face: h.face, value: h.value, positive_floor: h.positive_floor, sent: h.evidence?.sent || 0 })),
      note: 'Human approves and runs. The cold engine still creates a DRAFT campaign; the send is a human click. The loop never launches.',
    },
    accepted, rejected,
    honest_read: hasActionableTargeting
      ? `Firmographic cells with a real edge cleared the skeptic: ${advisoryCells.map((c) => `${c.face}=${c.value}`).join(', ')}. Note what is ALREADY wired vs the real gap: SIZE is handled (Apollo pulls mid-market and the engine filters to the belief model's good size bands), so a winning size cell needs no new feature. INDUSTRY is allow/deny only (Apollo's 82-industry allow-list, treated equally; the cold engine does not weight the pool by industry) — so the genuine improvement is to PRIORITISE proven-winning industries in find-leads + the cold-engine pool, the same way it already weights by size. Title cells stay explore-only (back-filled history). The big lever remains CHANNEL (graduation, ~28x).`
      : 'No targeting cell earns a trustworthy edge over baseline at adequate n (title cells are back-filled selection bias; the rest are low-n). Expected: cold-to-ICP converges ~1% positive regardless of targeting. The real lever stays CHANNEL (graduation to the personal lane, ~28x). Cold experiments are about cost/deliverability and the opener A/B, not targeting finesse.',
  };

  writeFileSync(`${ROOT}/belief_experiments.json`, JSON.stringify(plan, null, 2));

  // Human-readable digest (the weekly read).
  const md = [
    `# Cold-campaign experiment plan — week of ${week}`,
    `Generated ${plan.generated_at} · belief model ${belief.generated_at} (${ageDays.toFixed(1)}d old)`,
    ``,
    `**Baseline cold positive floor:** ${pct(baseline_positive_floor)} — every exploit must clear ${params.exploitMinLift}x this.`,
    ``,
    `## Honest read`,
    plan.honest_read,
    ``,
    `## The experiment (80 / 20) — human approves and runs`,
    `### Exploit (80%): the proven base`,
    PROVEN_BASE.why,
    '```',
    exploitCmd,
    '```',
    advisoryCells.length
      ? `Advisory (the engine cannot filter these yet — weight them when building the pool):\n`
        + advisoryCells.map((c) => `- **${c.face}=${c.value}** (positive floor ${pct(c.positive_floor)})`).join('\n')
      : `No firmographic cell cleared the skeptic for advisory weighting.`,
    ``,
    `### Explore (20%)${arm ? `: ${arm.hypothesis.face}=${arm.hypothesis.value}` : ''}`,
    arm
      ? [
          arm.mechanism,
          ``,
          `Success metric: **positive_rate** vs the ${pct(baseline_positive_floor)} baseline floor. Target ~${pct(arm.target_positive_rate)}.`,
          arm.min_sends_to_call_it ? `Needs ~**${arm.min_sends_to_call_it} sends** before its Wilson floor can clear baseline (i.e. before we call it a win).` : `Point estimate too low to ever clear baseline at any sample — do not chase.`,
          arm.recommended_command ? '```\n' + arm.recommended_command + '\n```' : `_Not directly actionable via a cold-engine flag yet: ${arm.action_note}_`,
          plan.experiment.other_explores_considered.length ? `\n_Other bounded bets considered: ${plan.experiment.other_explores_considered.map((o) => `${o.face}=${o.value} (n=${o.sent})`).join(', ')}._` : ``,
        ].filter(Boolean).join('\n')
      : '_No explore arm survived the skeptic this week. Run the exploit base only, or invest the cycle in the personal/graduation lane._',
    ``,
    `## What the skeptic rejected (${rejected.length})`,
    '| hypothesis | reason |',
    '|---|---|',
    ...rejected.map((h) => `| ${h.kind} · ${h.face}=${h.value} | ${h.reasons[0]} |`),
    ``,
    `_The loop never sends. It recommends a command; a human runs the cold engine, which creates a DRAFT campaign for a human to start in Smartlead._`,
    ``,
  ].join('\n');
  writeFileSync(`${ROOT}/belief_experiments.md`, md);

  log(`\nEXPERIMENT — 80/20 plan written:`);
  log(`  exploit (80%): proven base${advisoryCells.length ? ` + advisory cells: ${advisoryCells.map((c) => `${c.face}=${c.value}`).join(', ')}` : ' (no targeting edge found)'}`);
  log(`    ${exploitCmd}`);
  if (arm) {
    log(`  explore (20%): ${arm.hypothesis.face}=${arm.hypothesis.value} · need ~${arm.min_sends_to_call_it ?? '∞'} sends to call it`);
    if (arm.recommended_command) log(`    ${arm.recommended_command}`);
    else log(`    (not flag-actionable yet: ${arm.action_note})`);
  } else {
    log(`  explore (20%): none survived the skeptic — run base only or invest in graduation.`);
  }
  log(`\nWrote belief_experiments.json + belief_experiments.md to repo root.`);
  log('The loop recommends. It does not launch. Human approves + runs the cold engine.');
  log('DONE');
})().catch((e) => { console.error('IMPROVE_LOOP_ERROR:', e.message); process.exit(1); });
