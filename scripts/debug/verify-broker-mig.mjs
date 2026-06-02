import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const a = await sb.from('crm_target_firms').select('id').limit(1);
const b = await sb.from('outreach_contacts').select('broker_track').limit(1);
console.log('crm_target_firms:', a.error ? '❌ ' + a.error.message : '✓ table exists');
console.log('outreach_contacts.broker_track:', b.error ? '❌ ' + b.error.message : '✓ column exists');
