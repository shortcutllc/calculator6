// Compare what the DB has for Beverly vs what's actually in Will's Gmail Sent.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
for (const k of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET']) {
  if (env[k] && !process.env[k]) process.env[k] = env[k];
}
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const LEAD = 'beverly.marsters@opensesame.com';
const REP = 'will@getshortcut.co';
const banner = (s) => console.log(`\n===== ${s} =====`);

banner('1. gmail_accounts row — last crawl?');
{
  const { data } = await sb.from('gmail_accounts')
    .select('email, sent_crawl_enabled, last_sent_crawl_at, connected_at')
    .eq('email', REP).maybeSingle();
  console.log(JSON.stringify(data, null, 2));
  console.log(`server time now: ${new Date().toISOString()}`);
  const hoursSinceCrawl = data?.last_sent_crawl_at
    ? Math.floor((Date.now() - new Date(data.last_sent_crawl_at).getTime()) / 3600000)
    : null;
  console.log(`hours since last crawl: ${hoursSinceCrawl}`);
}

banner('2. outreach_sends — Beverly');
{
  const { data } = await sb.from('outreach_sends')
    .select('campaign_id, sent_time, sender_email, reply_time, touch_count, thread_id, message_id, ingested_at')
    .eq('email', LEAD).order('sent_time', { ascending: false });
  console.log(`count: ${data?.length || 0}`);
  console.table(data);
}

banner('3. Gmail Sent — every message to Beverly');
{
  const { data: acct } = await sb.from('gmail_accounts')
    .select('email, refresh_token').eq('email', REP).maybeSingle();
  const params = new URLSearchParams({
    client_id: env.GOOGLE_OAUTH_CLIENT_ID,
    client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
    refresh_token: acct.refresh_token,
    grant_type: 'refresh_token',
  });
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: params });
  const j = await r.json();
  if (!r.ok) { console.error('token refresh failed:', j); process.exit(1); }
  const token = j.access_token;

  const sr = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent('in:sent to:' + LEAD)}&maxResults=20`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const sj = await sr.json();
  const ids = (sj.messages || []).map((m) => m.id);
  console.log(`Gmail returned ${ids.length} sent message ids to Beverly`);

  // What's in the DB vs Gmail
  const { data: dbRows } = await sb.from('outreach_sends').select('message_id').eq('email', LEAD);
  const dbMsgIds = new Set((dbRows || []).map((r) => r.message_id).filter(Boolean));

  const rows = [];
  for (const id of ids) {
    const mr = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=To&metadataHeaders=From&metadataHeaders=Date`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const md = await mr.json();
    const hdr = (n) => (md.payload?.headers || []).find((x) => x.name?.toLowerCase() === n.toLowerCase())?.value || null;
    rows.push({
      message_id: md.id,
      thread_id: md.threadId,
      internalDate: md.internalDate ? new Date(Number(md.internalDate)).toISOString() : null,
      subject: hdr('Subject'),
      to: hdr('To'),
      in_db: dbMsgIds.has(md.id) ? '✓' : '❌ MISSING',
    });
  }
  rows.sort((a, b) => new Date(b.internalDate) - new Date(a.internalDate));
  console.table(rows);

  const missing = rows.filter((r) => r.in_db.includes('MISSING'));
  if (missing.length) {
    console.log(`\n${missing.length} message(s) in Gmail but NOT in outreach_sends:`);
    for (const m of missing) console.log(`  ${m.internalDate} | ${m.subject} | msg=${m.message_id} thread=${m.thread_id}`);
  } else {
    console.log('\n✓ Every Gmail message is in outreach_sends.');
  }
}
