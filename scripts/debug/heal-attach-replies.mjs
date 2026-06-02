// Attach inbound replies to recently-healed sends.
// gmail-sent-crawl normally pulls each thread after writing a send and attaches
// any inbound from the prospect — but heal-gmail-deep skipped that step to keep
// it simple. This pass fixes that: walks every gmail-sent-crawl-heal:* row for
// a rep, fetches the thread via Gmail, finds any messages from the prospect,
// writes outreach_replies + sets outreach_sends.reply_time.
//
// Usage: node scripts/debug/heal-attach-replies.mjs --email caren@getshortcut.co
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

const flag = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? (process.argv[i + 1] || true) : d; };
const REP_EMAIL = flag('--email', null);
if (!REP_EMAIL) { console.error('Usage: --email <rep@getshortcut.co>'); process.exit(1); }

const { getAccessToken, getThread, bodyFromPayload, lc } = await import('../../netlify/functions/lib/gmail.js');
const { classify, cleanReply } = await import('../../netlify/functions/lib/sentiment.js');

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

console.log(`Loading every send by ${REP_EMAIL} with a thread_id…`);
const sends = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('outreach_sends')
    .select('email, campaign_id, sent_time, thread_id, reply_time')
    .eq('sender_email', REP_EMAIL).not('thread_id', 'is', null).range(from, from + 999);
  if (error) { console.error(error.message); break; }
  if (!data || data.length === 0) break;
  sends.push(...data);
  if (data.length < 1000) break;
}
console.log(`${sends.length} sends with thread_id`);

// Group by (email, thread_id) — only need to walk each thread once
const groups = new Map();
for (const s of sends) {
  const k = `${s.email}|${s.thread_id}`;
  if (!groups.has(k)) groups.set(k, { email: s.email, thread_id: s.thread_id, earliestSent: s.sent_time, anyHasReplyTime: !!s.reply_time });
  const g = groups.get(k);
  if (s.sent_time < g.earliestSent) g.earliestSent = s.sent_time;
  if (s.reply_time) g.anyHasReplyTime = true;
}
console.log(`${groups.size} unique (email, thread) groups to walk`);

let tok;
try { tok = await getAccessToken(sb, REP_EMAIL); }
catch (e) { console.error(`gmail token: ${e.message}`); process.exit(1); }

let repliesAttached = 0, threadsScanned = 0, threadsFailed = 0;
for (const g of groups.values()) {
  threadsScanned += 1;
  let thread;
  try { thread = await getThread(tok, g.thread_id); }
  catch (e) { threadsFailed += 1; continue; }
  const msgs = thread?.messages || [];
  // Find inbound messages: From = prospect email
  const inbound = msgs.filter((m) => {
    const from = (m.payload?.headers || []).find((h) => h.name?.toLowerCase() === 'from')?.value || '';
    const fromAddr = lc(from.match(/<([^>]+)>/)?.[1] || from);
    return fromAddr === lc(g.email);
  });
  if (!inbound.length) continue;
  // Write ONE outreach_replies row per inbound message — collapsing into a
  // single row loses critical context (e.g., Lisa Bryan's 4 messages: lead-
  // qualifying reply, scheduling chitchat, meeting confirmation, phone
  // number — only the last would survive).
  let earliestReplyIso = null;
  for (const reply of inbound) {
    const replyMsgId = reply.id || `${g.thread_id}:${reply.internalDate}`;
    const body = cleanReply(bodyFromPayload(reply.payload));
    const c = classify(body);
    const replyIso = reply.internalDate ? new Date(Number(reply.internalDate)).toISOString() : g.earliestSent;
    if (!earliestReplyIso || replyIso < earliestReplyIso) earliestReplyIso = replyIso;
    await sb.from('outreach_replies').upsert(
      { email: g.email, campaign_id: `gmail-sent-crawl-heal-attach:${replyMsgId}`, reply_date: replyIso,
        reply_content: body ? body.slice(0, 4000) : null,
        reply_sentiment: c.sentiment, is_ooo: c.sentiment === 'ooo',
        sentiment_source: 'automated', ingested_at: new Date().toISOString() },
      { onConflict: 'email,campaign_id,sentiment_source' },
    );
    repliesAttached += 1;
    console.log(`  + ${g.email} ${replyIso.slice(0, 16)} ${c.sentiment} "${(body || '').slice(0, 80).replace(/\s+/g, ' ')}"`);
  }
  // Mark the rep's earliest-relevant send in this thread as replied
  if (earliestReplyIso) {
    await sb.from('outreach_sends').update({ reply_time: earliestReplyIso })
      .eq('email', g.email).eq('sender_email', REP_EMAIL).eq('thread_id', g.thread_id).is('reply_time', null);
  }
}
console.log(`\nDone. threads scanned: ${threadsScanned}, failed: ${threadsFailed}, replies attached: ${repliesAttached}`);
