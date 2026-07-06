/**
 * run-explore-arm.mjs — Monday cron: build the improve-loop's EXPLORE arm (the
 * 20%) so the experiment half of 80/20 never depends on someone remembering it.
 * (Two weeks running, the RTO arm was recommended and nobody launched it — a
 * learning loop whose experiment never runs is just an exploit loop.)
 *
 * Reads belief_experiments.json (written by improve-loop the same morning),
 * takes experiment.explore_20's recommended command, and runs it with the
 * action gates appended. Guards:
 *   - plan stale (>6 days) -> skip (improve-loop didn't run; don't act on old plans)
 *   - same arm launched <21 days ago (.explore-arms.json state) -> skip
 *     (one bounded arm needs ~250 sends ≈ 2-3 weeks; don't stack duplicates)
 * The human door stays: the build lands as a Smartlead DRAFT for Will's Start.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

const ROOT = '/Users/willnewton/Documents/GitHub/calculator6';
const PLAN = `${ROOT}/belief_experiments.json`;
const STATE = `${ROOT}/.explore-arms.json`;
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);

if (!existsSync(PLAN)) { log('no belief_experiments.json — improve-loop has not run. Skipping.'); process.exit(0); }
const plan = JSON.parse(readFileSync(PLAN, 'utf8'));
const ageDays = (Date.now() - new Date(plan.generated_at).getTime()) / 86400000;
if (ageDays > 6) { log(`plan is ${ageDays.toFixed(1)}d old — stale, skipping (did improve-loop run?).`); process.exit(0); }

const explore = plan.experiment?.explore_20;
const cmd = explore?.recommended_command || explore?.command;
if (!cmd) { log('no explore arm in this week\'s plan — nothing to do.'); process.exit(0); }
const armKey = [explore.face || 'opener', explore.value || explore.opener || (cmd.match(/--opener (\w+)/) || [])[1] || 'unknown'].join('=');

const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : {};
const last = state[armKey] ? (Date.now() - new Date(state[armKey]).getTime()) / 86400000 : Infinity;
if (last < 21) { log(`arm ${armKey} launched ${last.toFixed(1)}d ago — experiment in flight, skipping.`); process.exit(0); }

const full = `${cmd} --pull --verify --judge --launch --confirm`;
log(`EXPLORE ARM ${armKey}: ${full}`);
try {
  execSync(full, { cwd: ROOT, stdio: 'inherit' });
  state[armKey] = new Date().toISOString();
  writeFileSync(STATE, JSON.stringify(state, null, 2));
  log(`arm ${armKey} built (recorded in .explore-arms.json). Will reviews + Starts the draft.`);
} catch (e) {
  console.error('EXPLORE_ARM_ERROR:', e.message); process.exit(1);
}
