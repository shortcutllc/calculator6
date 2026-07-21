/**
 * Dave's budget guard — hard daily caps, counted in the gateway (never trusted to the model).
 * Designed to fit inside ~$6-7/day at API rates even though Max makes it ~free today:
 * Anthropic has twice signaled the subscription subsidy for agent workloads will end.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const STATE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'state');
const FILE = path.join(STATE_DIR, 'budget.json');

// Caps per calendar day (local time). Conversations Will initiates always get priority;
// scheduled jobs are refused first when the cap nears.
export const CAPS = {
  frontier_calls: 25,   // opus-class invocations/day (jobs + chat)
  job_calls: 12,        // scheduled-job invocations/day (subset of the above)
};

function load() {
  try {
    const j = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    if (j.day === today()) return j;
  } catch { /* fresh day or first run */ }
  return { day: today(), frontier_calls: 0, job_calls: 0, cost_usd: 0, refused: 0 };
}
function save(s) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(s, null, 2));
}
const today = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local

/** Can we afford this call? kind: 'chat' | 'job'. Chat is only refused at the hard cap. */
export function canSpend(kind) {
  const s = load();
  if (kind === 'job' && s.job_calls >= CAPS.job_calls) return { ok: false, why: `job cap ${CAPS.job_calls}/day` };
  if (s.frontier_calls >= CAPS.frontier_calls) return { ok: false, why: `frontier cap ${CAPS.frontier_calls}/day` };
  return { ok: true };
}

/** Record a completed call. costUsd comes from the CLI result JSON (total_cost_usd) when present. */
export function record(kind, costUsd = 0) {
  const s = load();
  s.frontier_calls += 1;
  if (kind === 'job') s.job_calls += 1;
  s.cost_usd += Number(costUsd) || 0;
  save(s);
  return s;
}

export function recordRefusal() { const s = load(); s.refused += 1; save(s); return s; }

export function status() { return load(); }
