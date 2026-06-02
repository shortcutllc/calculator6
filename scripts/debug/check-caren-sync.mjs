import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const banner = (s) => console.log(`\n===== ${s} =====`);

banner('1. Caren gmail_accounts row');
{
  const { data, error } = await sb.from('gmail_accounts')
    .select('email, slack_user_id, sent_crawl_enabled, connected_at, last_sent_crawl_at, digest_enabled, tz')
    .eq('email', 'caren@getshortcut.co').maybeSingle();
  if (error || !data) { console.log('❌ NO ROW — Caren has not connected Gmail'); }
  else {
    console.log(JSON.stringify(data, null, 2));
    const hours = data.last_sent_crawl_at ? Math.floor((Date.now() - new Date(data.last_sent_crawl_at).getTime()) / 3600000) : null;
    console.log(`hours since last crawl: ${hours === null ? 'never' : hours}`);
  }
}

banner('2. Recent sends attributed to Caren');
{
  const { data } = await sb.from('outreach_sends')
    .select('email, campaign_id, sent_time')
    .eq('sender_email', 'caren@getshortcut.co')
    .order('sent_time', { ascending: false }).limit(20);
  console.log(`count: ${data?.length || 0}`);
  if (data?.length) console.table(data.slice(0, 10).map((s) => ({
    email: s.email, sent: s.sent_time?.slice(0, 16), campaign: s.campaign_id?.slice(0, 40),
  })));
}

banner('3. Caren broker queue + status');
{
  const { data } = await sb.from('outreach_contacts')
    .select('email, name, company, broker_priority_rank')
    .eq('broker_assigned_to', 'caren@getshortcut.co')
    .order('broker_priority_rank', { ascending: true }).limit(5);
  console.log(`Caren has ${data?.length ? '5+ in top 5 — full count is 37' : 'NO'} broker contacts assigned`);
  console.table(data);
}
