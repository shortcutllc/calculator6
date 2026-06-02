import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const banner = (s) => console.log(`\n===== ${s} =====`);

banner('1. crm_target_firms — seeded?');
{
  const { count, data } = await sb.from('crm_target_firms')
    .select('name, tier, track, priority_rank', { count: 'exact' })
    .order('priority_rank', { ascending: true });
  console.log(`row count: ${count || 0}`);
  if (data?.length) console.table(data.slice(0, 5));
}

banner('2. outreach_contacts with broker_track set');
{
  const { count } = await sb.from('outreach_contacts')
    .select('email', { count: 'exact', head: true })
    .not('broker_track', 'is', null);
  console.log(`broker-tagged contacts: ${count || 0}`);
}

banner('3. broker_assigned_to breakdown');
{
  const { data } = await sb.from('outreach_contacts')
    .select('broker_assigned_to')
    .not('broker_track', 'is', null);
  const counts = {};
  for (const r of (data || [])) counts[r.broker_assigned_to || '(unassigned)'] = (counts[r.broker_assigned_to || '(unassigned)'] || 0) + 1;
  console.table(counts);
}

banner('4. Any UI surface? grep for broker_track in src/');
console.log('(see separate grep)');
