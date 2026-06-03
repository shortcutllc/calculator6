import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Find Will's top 5 broker contacts with no prior send + no suppression
const { data } = await sb.from('outreach_contacts')
  .select('email, name, title, company, broker_track, broker_priority_rank, broker_firm_tier')
  .eq('broker_assigned_to', 'will@getshortcut.co')
  .not('broker_track', 'is', null)
  .order('broker_priority_rank', { ascending: true })
  .limit(50);

const eligible = [];
for (const c of (data || [])) {
  if (eligible.length >= 5) break;
  // Skip if any prior send by Will
  const { data: prior } = await sb.from('outreach_sends').select('email').eq('email', c.email).eq('sender_email', 'will@getshortcut.co').limit(1).maybeSingle();
  if (prior) continue;
  // Skip if suppressed
  const { data: sup } = await sb.from('crm_suppression').select('email').eq('email', c.email).maybeSingle();
  if (sup) continue;
  eligible.push(c);
}

console.log('Will\'s top 5 broker contacts ready for supervised test send:\n');
console.table(eligible.map((c, i) => ({
  '#': i + 1,
  name: c.name,
  title: c.title?.slice(0, 35),
  company: c.company,
  tier: c.broker_firm_tier?.replace('tier_', 'T'),
  track: c.broker_track,
  email: c.email,
})));
