import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const banner = (s) => console.log(`\n===== ${s} =====`);

banner('Caren ↔ Cleveland Research — all sends');
{
  const { data } = await sb.from('outreach_sends')
    .select('email, campaign_id, sent_time, reply_time, thread_id, message_id')
    .eq('sender_email', 'caren@getshortcut.co')
    .or('email.ilike.%cleveland-research%,email.ilike.%clevelandresearch%')
    .order('sent_time', { ascending: true });
  console.log(`count: ${data?.length || 0}`);
  console.table((data || []).map((s) => ({
    to: s.email, sent: s.sent_time?.slice(0, 16),
    replied: s.reply_time ? s.reply_time.slice(0, 16) : '—',
    thread: s.thread_id?.slice(0, 10) || '—',
  })));
}

banner('Replies from cleveland-research domain');
{
  const { data } = await sb.from('outreach_replies')
    .select('email, reply_date, reply_sentiment, reply_content')
    .ilike('email', '%cleveland-research%').order('reply_date', { ascending: true });
  console.log(`count: ${data?.length || 0}`);
  for (const r of (data || [])) {
    console.log(`  ${r.reply_date?.slice(0, 16)} | ${r.email} | sentiment=${r.reply_sentiment}`);
    if (r.reply_content) console.log(`    "${r.reply_content.slice(0, 200).replace(/\n/g, ' ')}"`);
  }
}

banner('Cleveland Research contacts in outreach_contacts');
{
  const { data } = await sb.from('outreach_contacts')
    .select('email, name, title, company, source')
    .or('email.ilike.%cleveland-research%,company.ilike.%cleveland research%');
  console.table(data);
}
