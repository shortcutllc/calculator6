// Why isn't Jen McAuliffe showing in Will's personal outreach view?
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const banner = (s) => console.log(`\n===== ${s} =====`);

const email = 'jmcauliffe@philabar.org';

banner(`1. workhuman_leads — is Jen on the WH list at all?`);
{
  const { data } = await sb.from('workhuman_leads')
    .select('id, email, name, company, assigned_to, tier, tier_1a, tier_1b, outreach_status, notes')
    .or('email.eq.jmcauliffe@philabar.org,name.ilike.%mcauliffe%,name.ilike.%jen%philabar%,company.ilike.%philadelphia bar%,company.ilike.%philabar%').limit(20);
  console.table(data);
}

banner(`2. outreach_contacts row`);
{
  const { data } = await sb.from('outreach_contacts').select('*').eq('email', email).maybeSingle();
  console.log(JSON.stringify(data, null, 2));
}

banner(`3. outreach_sends — full picture`);
{
  const { data } = await sb.from('outreach_sends')
    .select('campaign_id, sent_time, sender_email, reply_time, touch_count, message_id, ingested_at')
    .eq('email', email).order('sent_time');
  console.table(data);
}

banner(`4. outreach_replies`);
{
  const { data } = await sb.from('outreach_replies')
    .select('campaign_id, reply_date, reply_sentiment, sentiment_source, reply_content')
    .eq('email', email).order('reply_date');
  for (const r of (data || [])) {
    console.log(`  [${r.campaign_id}] ${r.reply_date} sentiment=${r.reply_sentiment} src=${r.sentiment_source}`);
    console.log(`    "${(r.reply_content || '').slice(0, 200).replace(/\n/g, ' ')}"`);
  }
}

banner(`5. would she pass the follow-ups Path B filter?`);
// Path B: rep-attributed sends, NO reply, >=4d old, <max touches
{
  const { data: sends } = await sb.from('outreach_sends')
    .select('campaign_id, sent_time, sender_email, reply_time, touch_count')
    .eq('email', email).eq('sender_email', 'will@getshortcut.co').is('reply_time', null);
  console.log(`unanswered-by-Will rows: ${(sends || []).length}`);
  console.table(sends);
}

banner(`6. Will's assignee name (for Path A filter)`);
{
  const { data } = await sb.from('gmail_accounts').select('email').eq('email', 'will@getshortcut.co').maybeSingle();
  console.log('connected gmail:', data?.email);
  // The followups function calls assigneeForGmail() to map gmail -> workhuman assignee.
  // Let's check what that mapping is:
  const lib = await import('../../netlify/functions/lib/assignee.js');
  console.log('assigneeForGmail("will@getshortcut.co"):', lib.assigneeForGmail('will@getshortcut.co'));
}
