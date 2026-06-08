import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data } = await sb.from('gmail_accounts').select('email, connected_at, updated_at, refresh_token').eq('email', 'will@getshortcut.co').maybeSingle();
console.log('connected_at:', data?.connected_at);
console.log('updated_at:  ', data?.updated_at);
console.log('refresh_token tail:', data?.refresh_token?.slice(-12));
