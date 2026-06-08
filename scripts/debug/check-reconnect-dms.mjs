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

const NEEDED = 'https://www.googleapis.com/auth/gmail.compose';
const { getAccessToken } = await import('../../netlify/functions/lib/gmail.js');

const targets = ['caren@getshortcut.co', 'marc@getshortcut.co', 'jaimie@getshortcut.co', 'courtney@getshortcut.co'];

console.log('Check: have they reconnected (got gmail.compose) yet?');
for (const email of targets) {
  const { data: a } = await sb.from('gmail_accounts').select('slack_user_id, refresh_token').eq('email', email).maybeSingle();
  if (a?.refresh_token?.startsWith('_PLACEHOLDER')) { console.log(`  ${email}: disconnected (placeholder)`); continue; }
  try {
    const tok = await getAccessToken(sb, email);
    const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${tok}`);
    const j = await r.json();
    const has = (j.scope || '').includes(NEEDED);
    console.log(`  ${email}: ${has ? '✓ reconnected (has gmail.compose)' : '❌ STILL NEEDS reconnect'} | slack=${a?.slack_user_id || 'no'}`);
  } catch (e) { console.log(`  ${email}: token err: ${e.message.slice(0, 50)}`); }
}
