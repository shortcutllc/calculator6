/**
 * Dave's gateway — the thin always-on process. Holds the Slack Socket Mode connection
 * (zero tokens while idle) and wakes an ephemeral Claude session when Will messages.
 *
 * Architecture (research-backed, 2026-07-20):
 *  - NO resident Claude process. Each message spawns `claude -p` with --resume so one
 *    Slack thread == one persistent Claude session (context survives across messages).
 *  - Budget is enforced HERE, deterministically — never delegated to the model.
 *  - Dave can only talk to Will (DAVE_ALLOWED_USER). Everything else is ignored.
 *  - Sends: Dave posts to Will's DM only. He has no path to email or anyone else.
 *
 * Env (see dave/README.md): DAVE_SLACK_BOT_TOKEN, DAVE_SLACK_APP_TOKEN, DAVE_ALLOWED_USER,
 * optional DAVE_MODEL (default claude-opus-4-8), HEALTHCHECKS_URL.
 */
import pkg from '@slack/bolt';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { canSpend, record, recordRefusal, status } from './budget.mjs';

const { App } = pkg;
const DAVE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// macOS TCC (verified 2026-07-20): launchd's zsh gets "operation not permitted" reading
// files under ~/Documents, so the plist CANNOT `source` dave/.env — but node CAN read
// Documents. So the env file is loaded HERE, before anything touches process.env.
try {
  for (const line of fs.readFileSync(path.join(DAVE_DIR, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim();
  }
} catch { /* no .env — env must come from the caller */ }

const STATE_DIR = path.join(DAVE_DIR, 'state');
const SESSIONS_FILE = path.join(STATE_DIR, 'sessions.json');
const MODEL = process.env.DAVE_MODEL || 'claude-opus-4-8';
const ALLOWED_USER = process.env.DAVE_ALLOWED_USER; // Will's Slack user id (U...)

// Tools Dave gets in chat sessions. Read/search freely, write only inside dave/, run the
// repo's read-only scripts via Bash. No git push, no deploys, no Gmail — those are Will's.
const ALLOWED_TOOLS = 'Read,Grep,Glob,WebSearch,WebFetch,Write,Edit,Bash';

function loadSessions() { try { return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8')); } catch { return {}; } }
function saveSessions(s) { fs.mkdirSync(STATE_DIR, { recursive: true }); fs.writeFileSync(SESSIONS_FILE, JSON.stringify(s, null, 2)); }

/** Run one Claude turn. Returns { text, sessionId, costUsd }. */
function runClaude(prompt, resumeId) {
  return new Promise((resolve, reject) => {
    const args = ['-p', prompt, '--output-format', 'json', '--model', MODEL, '--allowedTools', ALLOWED_TOOLS, '--max-turns', '25'];
    if (resumeId) args.push('--resume', resumeId);
    const child = spawn('claude', args, { cwd: DAVE_DIR, env: process.env });
    let out = '', err = '';
    const killer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('claude timeout (10m)')); }, 10 * 60 * 1000);
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('close', (code) => {
      clearTimeout(killer);
      if (code !== 0 && !out.trim()) return reject(new Error(`claude exited ${code}: ${err.slice(0, 300)}`));
      try {
        const j = JSON.parse(out);
        resolve({ text: j.result || '(no reply)', sessionId: j.session_id || resumeId || null, costUsd: j.total_cost_usd || 0 });
      } catch { resolve({ text: out.trim().slice(0, 3500) || '(unparseable reply)', sessionId: resumeId || null, costUsd: 0 }); }
    });
  });
}

const app = new App({
  token: process.env.DAVE_SLACK_BOT_TOKEN,
  appToken: process.env.DAVE_SLACK_APP_TOKEN,
  socketMode: true,
});

// Any DM (or mention) from Will wakes Dave. One thread = one session.
app.event('message', async ({ event, client }) => {
  try {
    if (event.bot_id || event.subtype) return;                 // ignore bots/edits
    if (ALLOWED_USER && event.user !== ALLOWED_USER) return;   // Will only
    if (event.channel_type !== 'im') return;                   // DMs only in Phase 1
    const text = (event.text || '').trim();
    if (!text) return;

    // Built-in, zero-token commands.
    if (/^(dave )?status$/i.test(text)) {
      const s = status();
      await client.chat.postMessage({ channel: event.channel, thread_ts: event.thread_ts || event.ts, text: `Today: ${s.frontier_calls} calls (${s.job_calls} jobs), ~$${s.cost_usd.toFixed(2)} at API rates, ${s.refused} refused. Caps: 25 calls / 12 jobs.` });
      return;
    }

    const gate = canSpend('chat');
    if (!gate.ok) {
      recordRefusal();
      await client.chat.postMessage({ channel: event.channel, thread_ts: event.thread_ts || event.ts, text: `Hit today's budget (${gate.why}). I'll be back tomorrow, or raise the cap in gateway/budget.mjs.` });
      return;
    }

    await client.reactions.add({ channel: event.channel, name: 'thinking_face', timestamp: event.ts }).catch(() => {});
    const threadKey = event.thread_ts || event.ts;
    const sessions = loadSessions();
    const { text: reply, sessionId, costUsd } = await runClaude(text, sessions[threadKey]);
    if (sessionId) { sessions[threadKey] = sessionId; saveSessions(sessions); }
    record('chat', costUsd);
    // Slack hard-caps message length; chunk long replies.
    for (let i = 0; i < reply.length; i += 3800) {
      await client.chat.postMessage({ channel: event.channel, thread_ts: threadKey, text: reply.slice(i, i + 3800) });
    }
    await client.reactions.remove({ channel: event.channel, name: 'thinking_face', timestamp: event.ts }).catch(() => {});
    await client.reactions.add({ channel: event.channel, name: 'white_check_mark', timestamp: event.ts }).catch(() => {});
  } catch (e) {
    console.error('gateway message error:', e.message);
    try { await client.chat.postMessage({ channel: event.channel, thread_ts: event.thread_ts || event.ts, text: `Something broke on my end: ${e.message.slice(0, 200)}` }); } catch { /* give up quietly */ }
  }
});

(async () => {
  ['DAVE_SLACK_BOT_TOKEN', 'DAVE_SLACK_APP_TOKEN'].forEach((k) => {
    if (!process.env[k]) { console.error(`MISSING ${k} — see dave/README.md`); process.exit(2); }
  });
  await app.start();
  console.log(`Dave's gateway is up (socket mode, model ${MODEL}). Idle cost: $0.`);
})();
