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
import { CAPS, canSpend, record, recordRefusal, status } from './budget.mjs';

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

// launchd's default PATH is /usr/bin:/bin:/usr/sbin:/sbin — no /opt/homebrew/bin, which is
// where the claude CLI lives (spawn ENOENT crashed the gateway on the first live message,
// 2026-07-20). Extend PATH for children (claude's own subshells want homebrew too) and
// resolve the binary to an absolute path.
if (!(process.env.PATH || '').includes('/opt/homebrew/bin')) {
  process.env.PATH = `/opt/homebrew/bin:${process.env.PATH || '/usr/bin:/bin'}`;
}
const CLAUDE_BIN = process.env.DAVE_CLAUDE_BIN
  || (fs.existsSync('/opt/homebrew/bin/claude') ? '/opt/homebrew/bin/claude' : 'claude');

// Dave authenticates via Will's Max-plan login, NEVER an API key. A stale key lurking in
// launchd's global env (`launchctl setenv ANTHROPIC_API_KEY ...`) 401'd the first live
// reply (2026-07-20) because the CLI prefers env keys over the stored login. Strip every
// key-auth path so the Max login always wins, whatever the parent env carries.
for (const k of ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN']) delete process.env[k];

// Tools Dave gets in chat sessions. Read/search freely, write only inside dave/, run the
// repo's read-only scripts via Bash. No git push, no deploys, no Gmail — those are Will's.
// Task = subagent fan-out (granted 2026-07-21) so Dave can parallelize research sweeps.
const ALLOWED_TOOLS = 'Read,Grep,Glob,WebSearch,WebFetch,Write,Edit,Bash,Task';

function loadSessions() { try { return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8')); } catch { return {}; } }
function saveSessions(s) { fs.mkdirSync(STATE_DIR, { recursive: true }); fs.writeFileSync(SESSIONS_FILE, JSON.stringify(s, null, 2)); }

/** Run one Claude turn. Returns { text, sessionId, costUsd }. */
function runClaude(prompt, resumeId) {
  return new Promise((resolve, reject) => {
    const args = ['-p', prompt, '--output-format', 'json', '--model', MODEL, '--allowedTools', ALLOWED_TOOLS, '--max-turns', '25'];
    if (resumeId) args.push('--resume', resumeId);
    const child = spawn(CLAUDE_BIN, args, { cwd: DAVE_DIR, env: process.env });
    let out = '', err = '';
    // 30 min: chat turns now include subagent research sweeps (two 10-min kills on
    // 2026-07-21 ate live sweep work). Dave's charter tells him to write findings to brain
    // files as he goes, so even a 30-min kill loses one angle, not a session.
    const killer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('claude timeout (30m) — long research should be chunked, one angle per turn')); }, 30 * 60 * 1000);
    // An unhandled 'error' event on a child process crashes node — this exact miss killed
    // the gateway on its first live message (spawn ENOENT). Always reject instead.
    child.on('error', (e) => { clearTimeout(killer); reject(new Error(`claude spawn failed: ${e.message}`)); });
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
    let text = (event.text || '').trim();

    // ATTACHMENTS (2026-07-21): download image files Will attaches and hand Dave the local
    // paths — his Read tool renders images natively. Needs the files:read bot scope.
    // Saved under state/inbox/ (gitignored). Non-image files are named but not fetched.
    const attached = [];
    for (const f of event.files || []) {
      try {
        if (!/^image\//.test(f.mimetype || '')) { attached.push(`(non-image attachment "${f.name}" — not downloaded)`); continue; }
        const r = await fetch(f.url_private_download, { headers: { Authorization: `Bearer ${process.env.DAVE_SLACK_BOT_TOKEN}` } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const buf = Buffer.from(await r.arrayBuffer());
        // Slack returns an HTML login page instead of bytes when the files:read scope is
        // missing — never save that as an "image".
        if (buf.slice(0, 15).toString().toLowerCase().includes('<!doctype')) throw new Error('got HTML — files:read scope missing?');
        const dir = path.join(STATE_DIR, 'inbox');
        fs.mkdirSync(dir, { recursive: true });
        const dest = path.join(dir, `${event.ts.replace('.', '-')}-${(f.name || f.id).replace(/[^\w.-]/g, '_')}`);
        fs.writeFileSync(dest, buf);
        attached.push(dest);
      } catch (e) { attached.push(`(attachment "${f.name || f.id}" failed to download: ${e.message})`); }
    }
    if (attached.length) text += `\n\n[Will attached ${attached.length} file(s). Image paths — use Read to view them:\n${attached.join('\n')}]`;
    if (!text) return;

    // Built-in, zero-token commands.
    if (/^(dave )?status$/i.test(text)) {
      const s = status();
      await client.chat.postMessage({ channel: event.channel, thread_ts: event.thread_ts || event.ts, text: `Today: ${s.frontier_calls} calls (${s.job_calls} jobs), ~$${s.cost_usd.toFixed(2)} at API rates, ${s.refused} refused. Caps: ${CAPS.frontier_calls} calls / ${CAPS.job_calls} jobs.` });
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
