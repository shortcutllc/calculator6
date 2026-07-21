/**
 * Dave's ONLY outbound channel: a DM to Will. Usage:
 *   node tools/slack-dm.mjs "message text"        (or pipe text on stdin)
 * Uses DAVE_SLACK_BOT_TOKEN + DAVE_ALLOWED_USER. Posts nowhere else, ever.
 */
const token = process.env.DAVE_SLACK_BOT_TOKEN;
const user = process.env.DAVE_ALLOWED_USER;
if (!token || !user) { console.error('need DAVE_SLACK_BOT_TOKEN + DAVE_ALLOWED_USER'); process.exit(2); }

let text = process.argv.slice(2).join(' ');
if (!text) {
  text = await new Promise((res) => { let d = ''; process.stdin.on('data', (c) => { d += c; }).on('end', () => res(d)); });
}
text = text.trim();
if (!text) { console.error('empty message'); process.exit(2); }

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
