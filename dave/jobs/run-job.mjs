#!/usr/bin/env node
/**
 * Dave job runner — node, NOT shell. macOS TCC blocks launchd's zsh from reading files
 * under ~/Documents ("operation not permitted", verified 2026-07-20), while node reads
 * them fine — so every file read (env, prompts, watermarks) lives here.
 * Usage: node run-job.mjs <job-name>   (prompt at dave/jobs/<job-name>.md)
 *
 * Rules re-homed from the retired run-job.sh — ALL of them (the vanished-130-word-ceiling
 * lesson): 1 day guards · 2 watermark min-intervals · 3 budget gate · 4 ephemeral claude
 * run · 5 cost recording · 6 watermark-on-success · 7 healthchecks ping · 8 run logging.
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const DAVE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATE = path.join(DAVE_DIR, 'state');
const LOGS = path.join(STATE, 'logs');
fs.mkdirSync(LOGS, { recursive: true });
const log = (f, s) => fs.appendFileSync(path.join(LOGS, f), `${s}\n`);

// Load dave/.env (same TCC reason as the gateway; never override caller-provided env).
try {
  for (const line of fs.readFileSync(path.join(DAVE_DIR, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim();
  }
} catch { /* fine */ }

const job = process.argv[2];
if (!job) { console.error('usage: run-job.mjs <job-name>'); process.exit(1); }
const promptFile = path.join(DAVE_DIR, 'jobs', `${job}.md`);
if (!fs.existsSync(promptFile)) { log(`${job}.err`, `no job prompt: ${promptFile}`); process.exit(1); }

// --- 1+2. Day guard + watermark (extra launchd fires must cost $0) ---
const dow = new Date().getDay(); // 0=Sun 1=Mon ... 6=Sat
let minH = 20; // default ≈ once daily
if (job === 'monday-strategy') { if (!(dow === 1 || dow === 2)) process.exit(0); minH = 100; }  // Mon + Tue catch-up
if (job === 'influence-scan') { if (!(dow >= 4 || dow === 0)) process.exit(0); minH = 100; }    // Thu-Sun window
if (job === 'nightly-status') minH = 12;
const wmFile = path.join(STATE, `watermark-${job}`);
try {
  const last = Number(fs.readFileSync(wmFile, 'utf8').trim());
  if ((Date.now() / 1000 - last) / 3600 < minH) process.exit(0); // ran recently — free skip
} catch { /* first run */ }

// --- 3. Budget gate ---
const budget = await import(path.join(DAVE_DIR, 'gateway', 'budget.mjs'));
if (!budget.canSpend('job').ok) { log('budget-refusals.log', `${new Date().toISOString()} ${job} refused: budget`); process.exit(0); }

// --- 4. Run the job (ephemeral session, fresh context) ---
// launchd PATH lacks /opt/homebrew/bin (where claude lives) — same fix as the gateway.
if (!(process.env.PATH || '').includes('/opt/homebrew/bin')) {
  process.env.PATH = `/opt/homebrew/bin:${process.env.PATH || '/usr/bin:/bin'}`;
}
const CLAUDE_BIN = process.env.DAVE_CLAUDE_BIN
  || (fs.existsSync('/opt/homebrew/bin/claude') ? '/opt/homebrew/bin/claude' : 'claude');
// Max-plan login only — a stale launchctl-env API key 401'd the gateway (2026-07-20).
for (const k of ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN']) delete process.env[k];
const r = spawnSync(CLAUDE_BIN, [
  '-p', fs.readFileSync(promptFile, 'utf8'),
  '--output-format', 'json',
  '--model', process.env.DAVE_MODEL || 'claude-opus-4-8',
  '--allowedTools', 'Read,Grep,Glob,WebSearch,WebFetch,Write,Edit,Bash',
  '--max-turns', '40',
], { cwd: DAVE_DIR, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 15 * 60 * 1000 });
const out = r.stdout || '';
if (r.stderr) log(`${job}.err`, r.stderr.slice(0, 4000));
fs.writeFileSync(path.join(STATE, `last-${job}.json`), out);
const ok = r.status === 0;

// --- 5-8. Record cost, watermark on success, dead-man's ping, run log ---
let cost = 0;
try { cost = JSON.parse(out).total_cost_usd || 0; } catch { /* unparseable — cost stays 0 */ }
budget.record('job', cost);
if (ok) {
  fs.writeFileSync(wmFile, String(Math.floor(Date.now() / 1000)));
  if (process.env.HEALTHCHECKS_URL) await fetch(process.env.HEALTHCHECKS_URL, { signal: AbortSignal.timeout(10000) }).catch(() => {});
}
log('runs.log', `${new Date().toISOString()} ${job} rc=${r.status} cost=$${cost}`);
process.exit(ok ? 0 : 1);
