import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data, error } = await sb.from('crm_target_firms').select('*').limit(0);
console.log(error ? error.message : 'cols available — empty table');
// Try inserting a probe to see what columns exist
const probe = await sb.from('crm_target_firms').insert({ name: '__probe__' }).select();
console.log('probe insert:', probe.error?.message || JSON.stringify(probe.data?.[0] || {}, null, 2));
if (probe.data?.[0]) await sb.from('crm_target_firms').delete().eq('id', probe.data[0].id);
