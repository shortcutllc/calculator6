// Follow-up nudge to the reps who still need to grant gmail.compose.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const TOKEN = env.PRO_SLACK_BOT_TOKEN;
const slack = async (m, b) => { const r = await fetch(`https://slack.com/api/${m}`, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); return r.json(); };

const MSG = `:wave: Quick nudge from Will — when you have 10 seconds:

Click *Reconnect Gmail* on the <https://proposals.getshortcut.co/sales-intelligence|Sales Intelligence page> (top-right header, next to Disconnect). It triggers Google to add one new permission ("Manage drafts and send emails") to Pro's connection.

After that, every "Open in Gmail" click from your draft preview opens a real Gmail compose window with your full HTML signature + formatted body — instead of plain text with no signature.

(Marc already reconnected — works great for him now.)

No other workflow change. Thanks!`;

for (const email of ['caren@getshortcut.co', 'jaimie@getshortcut.co']) {
  const { data: a } = await sb.from('gmail_accounts').select('slack_user_id').eq('email', email).maybeSingle();
  if (!a?.slack_user_id) { console.log(`  ${email}: no slack_user_id`); continue; }
  const open = await slack('conversations.open', { users: a.slack_user_id });
  if (!open.ok) { console.log(`  ${email}: open failed: ${open.error}`); continue; }
  const post = await slack('chat.postMessage', { channel: open.channel.id, text: MSG, unfurl_links: false });
  console.log(`  ${email}: ${post.ok ? '✓ nudge sent' : `❌ ${post.error}`}`);
}
