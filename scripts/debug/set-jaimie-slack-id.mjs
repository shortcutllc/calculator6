import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { error } = await sb.from('gmail_accounts')
  .update({ slack_user_id: 'UTBMB82PQ' })
  .eq('email', 'jaimie@getshortcut.co');
if (error) { console.error('update failed:', error.message); process.exit(1); }

const { data } = await sb.from('gmail_accounts')
  .select('email, slack_user_id, digest_enabled, digest_last_sent_at')
  .eq('email', 'jaimie@getshortcut.co').maybeSingle();
console.log('jaimie row now:', JSON.stringify(data, null, 2));
