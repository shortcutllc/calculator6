// DM Caren, Marc, Jaimie, Courtney via Pro asking them to Reconnect Gmail.
// Framed as a note from Will.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const TOKEN = env.PRO_SLACK_BOT_TOKEN;
if (!TOKEN) { console.error('PRO_SLACK_BOT_TOKEN missing in .env.local'); process.exit(1); }
const SLACK = 'https://slack.com/api';
const slack = async (method, body) => {
  const r = await fetch(`${SLACK}/${method}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
};

const TARGETS = ['caren@getshortcut.co', 'marc@getshortcut.co', 'jaimie@getshortcut.co', 'courtney@getshortcut.co'];

const MESSAGE = `:wave: Quick note from Will:

I just rolled out a fix that makes "Open in Gmail" on the sales-intelligence draft modal actually include your full Gmail signature (the brand-styled one with your logo, title, etc.). You'd need to grant Pro one additional permission for it to work on your account.

*Takes ~10 seconds:*
1. Open <https://proposals.getshortcut.co/sales-intelligence|/sales-intelligence>
2. Click the *Reconnect* button in the top-right header (next to Disconnect)
3. Click through Google's consent screen — there'll be one new permission ("Manage drafts and send emails")

After that, every "Open in Gmail" click will open a real Gmail compose draft with your formatted body + your full signature instead of plain text. No other changes to your workflow.

Thanks!`;

for (const email of TARGETS) {
  const { data: acct } = await sb.from('gmail_accounts').select('slack_user_id, email').eq('email', email).maybeSingle();
  if (!acct?.slack_user_id) {
    console.log(`  ❌ ${email}: no slack_user_id on file — skipping`);
    continue;
  }
  const open = await slack('conversations.open', { users: acct.slack_user_id });
  if (!open.ok) { console.log(`  ❌ ${email}: conversations.open failed: ${open.error}`); continue; }
  const post = await slack('chat.postMessage', {
    channel: open.channel.id,
    text: MESSAGE,
    unfurl_links: false,
  });
  if (!post.ok) { console.log(`  ❌ ${email}: chat.postMessage failed: ${post.error}`); continue; }
  console.log(`  ✓ ${email} (slack=${acct.slack_user_id}) — DM sent`);
}
