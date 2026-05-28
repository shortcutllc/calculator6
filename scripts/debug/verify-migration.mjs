import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data, error } = await sb.from('gmail_accounts')
  .select('email, slack_user_id, tz, digest_enabled, digest_skip_weekends, digest_last_sent_at, event_pings_enabled, muted_until').order('email');
if (error) { console.error('Migration NOT applied — error:', error.message); process.exit(1); }
console.log('Migration applied. Current state:');
console.table(data);
