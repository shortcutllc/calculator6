import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// 1. Jaimie Smith's actual email — try the obvious patterns
for (const email of [
  'jaimie.smith@danaher.com', 'jamie.smith@danaher.com', 'jsmith@danaher.com',
  'jaimies@danaher.com', 'jamies@danaher.com', 'smith.jaimie@danaher.com',
]) {
  const { data } = await sb.from('outreach_sends')
    .select('campaign_id, sent_time, sender_email')
    .eq('email', email).order('sent_time', { ascending: false }).limit(3);
  if (data?.length) {
    console.log(`\n${email} — ${data.length} sends:`);
    console.table(data);
  }
}

// 2. workhuman_signups for Jaimie Smith
console.log('\n--- workhuman_signups for Jaimie Smith ---');
const { data: signups } = await sb.from('workhuman_signups')
  .select('full_name, email, company, day_label, time_slot, matched_lead_id')
  .ilike('full_name', '%jaimie smith%').limit(5);
console.table(signups);
const { data: signups2 } = await sb.from('workhuman_signups')
  .select('full_name, email, company, day_label, time_slot, matched_lead_id')
  .ilike('full_name', '%jamie smith%').limit(5);
console.table(signups2);

// 3. Most recent sends/replies on Will's account where email contains danaher
console.log('\n--- All danaher-domain replies + sends ---');
const { data: dRep } = await sb.from('outreach_replies')
  .select('email, reply_date, reply_content')
  .ilike('email', '%@danaher%').order('reply_date', { ascending: false }).limit(5);
console.log('replies:'); console.table((dRep || []).map((r) => ({ email: r.email, date: r.reply_date?.slice(0,16), preview: (r.reply_content || '').slice(0, 80) })));
