// Who was supposed to get pinged for the Jaimie Smith @ Danaher reply?
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const banner = (s) => console.log(`\n===== ${s} =====`);

banner('1. Find Jaimie Smith @ Danaher');
{
  const { data } = await sb.from('outreach_contacts')
    .select('email, name, company, broker_assigned_to')
    .or('name.ilike.%jaimie smith%,name.ilike.%jamie smith%')
    .ilike('company', '%danaher%').limit(10);
  console.table(data);
  // Also try workhuman_leads
  const { data: wh } = await sb.from('workhuman_leads')
    .select('id, email, name, company, assigned_to')
    .or('name.ilike.%jaimie smith%,name.ilike.%jamie smith%').limit(10);
  console.log('workhuman_leads:'); console.table(wh);
}

banner('2. Recent sends + replies to the Danaher contact');
{
  const { data: c } = await sb.from('outreach_contacts')
    .select('email').or('name.ilike.%jaimie smith%,name.ilike.%jamie smith%').ilike('company', '%danaher%').limit(1).maybeSingle();
  let target = c?.email;
  if (!target) {
    const { data: alt } = await sb.from('outreach_contacts').select('email, name').ilike('email', '%@danaher%').limit(10);
    console.log('Danaher domain contacts:'); console.table(alt);
    target = alt?.[0]?.email;
  }
  if (!target) { console.log('no target found'); }
  else {
  console.log(`target email: ${target}`);

  const { data: sends } = await sb.from('outreach_sends')
    .select('campaign_id, sent_time, sender_email, thread_id, message_id, reply_time')
    .eq('email', target).order('sent_time', { ascending: false }).limit(10);
  console.log('outreach_sends:'); console.table(sends);

  const { data: reps } = await sb.from('outreach_replies')
    .select('campaign_id, reply_date, reply_sentiment, sentiment_source')
    .eq('email', target).order('reply_date', { ascending: false }).limit(5);
  console.log('outreach_replies:'); console.table(reps);
  }
}
