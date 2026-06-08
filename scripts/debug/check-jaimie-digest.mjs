// Did Jaimie get her morning digest?
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

console.log('All connected gmail_accounts — current digest state:');
const { data } = await sb.from('gmail_accounts')
  .select('email, slack_user_id, tz, digest_enabled, digest_skip_weekends, digest_last_sent_at, event_pings_enabled, muted_until')
  .order('email');
console.table(data);

const now = new Date();
console.log(`\nServer time now: ${now.toISOString()}`);
console.log(`\nDigest verdict per rep:`);
for (const a of data) {
  if (!a.digest_enabled) { console.log(`  ${a.email}: digest_enabled=false (won't fire)`); continue; }
  if (!a.slack_user_id) { console.log(`  ${a.email}: no slack_user_id (can't DM)`); continue; }
  const last = a.digest_last_sent_at ? new Date(a.digest_last_sent_at) : null;
  if (!last) { console.log(`  ${a.email}: NEVER received a digest`); continue; }
  const hoursAgo = Math.floor((now.getTime() - last.getTime()) / 3600000);
  const localHour = new Date(last.toLocaleString('en-US', { timeZone: a.tz })).getHours();
  console.log(`  ${a.email}: last sent ${last.toISOString()} (${hoursAgo}h ago, local hour=${localHour} ${a.tz})`);
}
