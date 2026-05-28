import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const banner = (s) => console.log(`\n===== ${s} =====`);

banner('1. All connected gmail_accounts');
const { data: accts } = await sb.from('gmail_accounts')
  .select('email, sent_crawl_enabled, connected_at, last_sent_crawl_at, slack_user_id, supabase_user_id')
  .order('email');
console.table(accts);

banner('2. Recent sends by Jaimie (any campaign, any state)');
{
  const { data } = await sb.from('outreach_sends')
    .select('email, campaign_id, sent_time, sender_email, message_id, ingested_at')
    .ilike('sender_email', '%jaimie%').order('sent_time', { ascending: false }).limit(20);
  console.log(`count: ${data?.length || 0}`);
  if (data?.length) console.table(data);
  else console.log('NO ROWS — Jaimie has zero sends on record');
}

banner('3. Multi-channel outreach log entries by Jaimie');
{
  const { data } = await sb.from('lead_outreach_log')
    .select('lead_id, channel, sender_name, sent_at, message_preview, template_id')
    .ilike('sender_name', '%jaimie%').order('sent_at', { ascending: false }).limit(20);
  console.log(`count: ${data?.length || 0}`);
  console.table(data);
}

banner('4. Will the heal script see Jaimies missing sends?');
console.log('Run scripts/debug/heal-gmail-crawl.mjs --dry --email <her-gmail> to preview.');
console.log('First we need to know her connected email — check section 1 above.');
