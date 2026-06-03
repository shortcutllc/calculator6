import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// 1. What broker_assigned_to values exist?
const { data: all } = await sb.from('outreach_contacts').select('broker_assigned_to').not('broker_track', 'is', null);
const counts = {};
for (const r of (all || [])) counts[r.broker_assigned_to || '(null)'] = (counts[r.broker_assigned_to || '(null)'] || 0) + 1;
console.log('broker_assigned_to value counts:', counts);

// 2. Try with name in case Will uses "Will Newton"
const { data: w } = await sb.from('outreach_contacts')
  .select('email, name, company, broker_priority_rank').not('broker_track', 'is', null)
  .or('broker_assigned_to.eq.will@getshortcut.co,broker_assigned_to.eq.Will Newton')
  .order('broker_priority_rank', { ascending: true }).limit(5);
console.log('\nTop 5 by Will assignment (any form):');
console.table(w);
