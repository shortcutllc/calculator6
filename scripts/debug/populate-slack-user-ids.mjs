// One-off: populate gmail_accounts.slack_user_id by calling Slack's
// users.lookupByEmail for each opted-in account. Run after the migration lands.
// Requires the bot to have users:read.email scope; reports clearly if it doesn't.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const SLACK_TOKEN = env.PRO_SLACK_BOT_TOKEN;
if (!SLACK_TOKEN) { console.error('Missing PRO_SLACK_BOT_TOKEN — add to .env.local from `netlify env:get PRO_SLACK_BOT_TOKEN`'); process.exit(1); }
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: accounts, error } = await sb.from('gmail_accounts')
  .select('email, slack_user_id').order('email');
if (error) { console.error(error); process.exit(1); }

for (const a of accounts) {
  if (a.slack_user_id) { console.log(`  ${a.email}  already has slack_user_id ${a.slack_user_id} (skip)`); continue; }
  const r = await fetch(`https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(a.email)}`, {
    headers: { Authorization: `Bearer ${SLACK_TOKEN}` },
  });
  const j = await r.json();
  if (!j.ok) {
    console.warn(`  ${a.email}  lookup failed: ${j.error}${j.error === 'missing_scope' ? ' — bot needs users:read.email scope (add via api.slack.com → OAuth & Permissions, then reinstall)' : ''}`);
    continue;
  }
  const id = j.user?.id;
  if (!id) { console.warn(`  ${a.email}  no user.id in response`); continue; }
  const { error: upd } = await sb.from('gmail_accounts').update({ slack_user_id: id }).eq('email', a.email);
  if (upd) console.error(`  ${a.email}  db update error: ${upd.message}`);
  else console.log(`  ${a.email}  → ${id}  (${j.user?.real_name || j.user?.name || ''})`);
}
console.log('\nDone. Each account now has slack_user_id populated where lookup succeeded.');
