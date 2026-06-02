import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data } = await sb.from('gmail_accounts')
  .select('email, slack_user_id, sent_crawl_enabled, event_pings_enabled, history_id, watch_expiration, connected_at')
  .order('email');
console.log('All connected reps — watch + ping readiness:');
const now = new Date();
const rows = data.map((a) => ({
  email: a.email,
  slack: a.slack_user_id ? '✓' : '❌',
  sent_crawl: a.sent_crawl_enabled ? '✓' : '❌',
  pings: a.event_pings_enabled ? '✓' : '❌',
  history_id: a.history_id || '❌ none',
  watch_exp: a.watch_expiration ? (new Date(a.watch_expiration) > now ? a.watch_expiration.slice(0, 16) + ' ✓' : a.watch_expiration.slice(0, 16) + ' ⚠ expired') : '❌ never armed',
  connected: a.connected_at?.slice(0, 16),
}));
console.table(rows);
