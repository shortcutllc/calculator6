/**
 * Dave's ONLY outbound channel: a DM to Will. Usage:
 *   node tools/slack-dm.mjs "message text"        (or pipe text on stdin)
 * Uses DAVE_SLACK_BOT_TOKEN + DAVE_ALLOWED_USER. Posts nowhere else, ever.
 */
// Self-load dave/.env (macOS TCC: launchd's zsh can't read ~/Documents files; node can).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
try {
  const envFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env');
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim();
  }
} catch { /* fine */ }

const token = process.env.DAVE_SLACK_BOT_TOKEN;
const user = process.env.DAVE_ALLOWED_USER;
if (!token || !user) { console.error('need DAVE_SLACK_BOT_TOKEN + DAVE_ALLOWED_USER'); process.exit(2); }

let text = process.argv.slice(2).join(' ');
if (!text) {
  text = await new Promise((res) => { let d = ''; process.stdin.on('data', (c) => { d += c; }).on('end', () => res(d)); });
}
text = text.trim();
if (!text) { console.error('empty message'); process.exit(2); }

// Slack renders mrkdwn, NOT GitHub markdown — Dave's ## headers and **bold** were arriving
// as literal hash marks and double asterisks (Will, 2026-07-21). Formatting is an auto-fix
// in code, never a prompt hope: convert the mechanical parts.
text = text
  .replace(/^#{1,6}\s+(.+)$/gm, '*$1*')   // "# Heading"  -> "*Heading*"
  .replace(/\*\*([^*\n]+)\*\*/g, '*$1*')  // "**bold**"   -> "*bold*"
  .replace(/^\s*[-=]{3,}\s*$/gm, '')      // "---" rules  -> gone
  .replace(/^(\s*)-\s+/gm, '$1• ');       // "- item"     -> "• item"

const api = (method, body) => fetch(`https://slack.com/api/${method}`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
}).then((r) => r.json());

const open = await api('conversations.open', { users: user });
if (!open.ok) { console.error(`conversations.open failed: ${open.error}`); process.exit(1); }
for (let i = 0; i < text.length; i += 3800) {
  const r = await api('chat.postMessage', { channel: open.channel.id, text: text.slice(i, i + 3800) });
  if (!r.ok) { console.error(`postMessage failed: ${r.error}`); process.exit(1); }
}
console.log('sent');
