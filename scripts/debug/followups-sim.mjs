// Simulate the followups function for Will and see if Jen now appears.
// Uses the same supabase + logic shape as the deployed function.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);
const MAX_TOUCHES_30D = 3, MAX_TOUCHES_60D = 5, WINDOW_60_DAYS = 60, WINDOW_30_DAYS = 30;
const myEmail = 'will@getshortcut.co';
const now = Date.now();
const cutoff30 = new Date(now - WINDOW_30_DAYS * 86400000).toISOString();
const cutoff60 = new Date(now - WINDOW_60_DAYS * 86400000).toISOString();

// Pull Will's rep-attributed sends in last 60d, no reply filter
const sendRows = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('outreach_sends')
    .select('email, campaign_id, sent_time, reply_time, touch_count, thread_id, message_id, sender_email')
    .eq('sender_email', myEmail).gte('sent_time', cutoff60).range(from, from + 999);
  if (error) { console.error(error); break; }
  sendRows.push(...data);
  if (data.length < 1000) break;
}
console.log(`pulled ${sendRows.length} send rows for ${myEmail} since ${cutoff60.slice(0, 10)}`);

const path2Agg = new Map();
for (const s of sendRows) {
  const k = lc(s.email);
  const cur = path2Agg.get(k) || { latest: null, t30: 0, t60: 0, any_reply: false, seen_msg: new Set() };
  const seenKey = s.message_id || `${s.campaign_id}|${s.sent_time}`;
  if (s.sender_email && s.sent_time && s.sent_time >= cutoff60 && !cur.seen_msg.has(seenKey)) {
    const inc = s.touch_count || 1;
    cur.t60 += inc;
    if (s.sent_time >= cutoff30) cur.t30 += inc;
    cur.seen_msg.add(seenKey);
  }
  if (s.reply_time) cur.any_reply = true;
  if (s.sent_time && (!cur.latest || s.sent_time > cur.latest.sent_time)) cur.latest = s;
  path2Agg.set(k, cur);
}

const rows = [];
for (const [k, agg] of path2Agg.entries()) {
  if (!agg.latest?.sent_time) continue;
  const days_since = Math.floor((now - new Date(agg.latest.sent_time).getTime()) / 86400000);
  const cap30Hit = (agg.t30 || 0) >= MAX_TOUCHES_30D;
  const cap60Hit = (agg.t60 || 0) >= MAX_TOUCHES_60D;
  const state = agg.any_reply ? 'replied' : ((cap30Hit || cap60Hit) ? 'maxed' : 'no_reply');
  rows.push({ email: k, days_since, t30: agg.t30, t60: agg.t60, state });
}
rows.sort((a, b) => a.days_since - b.days_since);
console.log(`\n${rows.length} total contacts in Will's 60d personal outreach`);
console.table(rows.slice(0, 30));

console.log('\nJen specifically:');
console.table(rows.filter((r) => r.email === 'jmcauliffe@philabar.org'));
console.log('\nLarcy specifically:');
console.table(rows.filter((r) => r.email === 'lallen@schulzlogistics.com'));
