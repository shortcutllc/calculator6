import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
// Pull one broker contact + its apollo row
const { data: oc } = await sb.from('outreach_contacts').select('email, name, company, broker_track').not('broker_track', 'is', null).limit(1).single();
console.log('sample broker contact:', oc);
const { data: ap } = await sb.from('apollo_person_cache').select('*').eq('email', oc.email).maybeSingle();
console.log('\napollo row:', JSON.stringify(ap, null, 2));
