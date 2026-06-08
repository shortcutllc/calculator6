import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const TOKEN = env.PRO_SLACK_BOT_TOKEN;
const SLACK = 'https://slack.com/api';
const slack = async (m, b) => (await fetch(`${SLACK}/${m}`, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(b) })).json();

const COURTNEY = 'U08HKHAQAEA';

// 1. Persist the slack_user_id so future digests / pings route to her
const { error } = await sb.from('gmail_accounts').update({ slack_user_id: COURTNEY }).eq('email', 'courtney@getshortcut.co');
if (error) { console.error('update failed:', error.message); process.exit(1); }
console.log('✓ slack_user_id saved on courtney@getshortcut.co');

// 2. Open DM + send the same reconnect note
const MESSAGE = `:wave: Quick note from Will:

I just rolled out a fix that makes "Open in Gmail" on the sales-intelligence draft modal actually include your full Gmail signature (the brand-styled one with your logo, title, etc.). You'd need to grant Pro one additional permission for it to work on your account.

*Takes ~10 seconds:*
1. Open <https://proposals.getshortcut.co/sales-intelligence|/sales-intelligence>
2. Click the *Reconnect* button in the top-right header (next to Disconnect)
3. Click through Google's consent screen — there'll be one new permission ("Manage drafts and send emails")

After that, every "Open in Gmail" click will open a real Gmail compose draft with your formatted body + your full signature instead of plain text. No other changes to your workflow.

Thanks!`;

const open = await slack('conversations.open', { users: COURTNEY });
if (!open.ok) { console.error('open failed:', open.error); process.exit(1); }
const post = await slack('chat.postMessage', { channel: open.channel.id, text: MESSAGE, unfurl_links: false });
console.log(post.ok ? `✓ DM sent to courtney@getshortcut.co (channel=${open.channel.id})` : `❌ post failed: ${post.error}`);
