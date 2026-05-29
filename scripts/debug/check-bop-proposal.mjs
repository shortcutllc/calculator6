import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data } = await sb.from('proposals')
  .select('id, client_name, customization, data, status, slug')
  .ilike('client_name', '%Bank of Princeton%')
  .order('updated_at', { ascending: false }).limit(3);

for (const p of (data || [])) {
  console.log(`\n===== ${p.client_name} · ${p.id.slice(0, 8)} · ${p.status} · slug=${p.slug} =====`);
  console.log('customization keys:', Object.keys(p.customization || {}));
  console.log('customization.customNote:', JSON.stringify(p.customization?.customNote));
  console.log('customization.contactFirstName:', JSON.stringify(p.customization?.contactFirstName));
  console.log('customization.contactLastName:', JSON.stringify(p.customization?.contactLastName));
  console.log('data.customNote:', JSON.stringify(p.data?.customNote));
  console.log('data.customization?.customNote:', JSON.stringify(p.data?.customization?.customNote));
}
