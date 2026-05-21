// Reproduce the crawl-window race against Larcy.
// 1) Show current last_sent_crawl_at for Will.
// 2) Simulate the crawl logic manually for a specific test message and see
//    whether the line-77 time check would filter Larcy's 5/20 send.
// 3) Print which crawl runs (per the implied schedule) would have either
//    captured or skipped each of Larcy's recent gmail messages.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const banner = (s) => console.log(`\n===== ${s} =====`);

// Larcy's actual gmail messages (from previous trace)
const larcyMsgs = [
  { id: '19e4628f14671cb6', subject: 'Re: Shortcut Next Steps', sent: '2026-05-20T16:12:28.000Z' },
  { id: '19e221be51b93c5b', subject: 'Shortcut Next Steps', sent: '2026-05-13T16:11:53.000Z' },
  { id: '19e177efdadc9c90', subject: 'Schedule a call (Larcy)', sent: '2026-05-11T14:44:18.000Z' },
  { id: '19dfa2d6c4e6a525', subject: 'Appointment booked', sent: '2026-05-05T22:06:13.000Z' },
  { id: '19df925e3db5590b', subject: 'Great meeting you at Workhuman!', sent: '2026-05-05T17:18:22.000Z' },
];

banner('Will gmail_accounts');
const { data: w } = await sb.from('gmail_accounts').select('email, connected_at, last_sent_crawl_at, sent_crawl_enabled').eq('email', 'will@getshortcut.co').maybeSingle();
console.log(JSON.stringify(w, null, 2));

banner('Larcy outreach_sends rows (sanity)');
const { data: rows } = await sb.from('outreach_sends').select('campaign_id, sent_time, message_id, ingested_at, touch_count').eq('email', 'lallen@schulzlogistics.com').order('sent_time');
console.table(rows);

banner('Simulated crawl window analysis');
const connected = new Date(w.connected_at);
const lastCrawl = new Date(w.last_sent_crawl_at);
console.log(`connected_at:        ${connected.toISOString()}`);
console.log(`last_sent_crawl_at:  ${lastCrawl.toISOString()}`);
console.log('');
console.log('For each Larcy message, work out the earliest hourly crawl that would have seen it:');
console.log('(assumes cron actually fires at HH:15 UTC every hour)');
for (const m of larcyMsgs) {
  const sent = new Date(m.sent);
  if (sent < connected) { console.log(`  ${m.id} ${m.sent} → sent BEFORE Will connected (${connected.toISOString()}); would not be visible to crawl since Gmail history starts on connect`); continue; }
  // Hourly crawl at HH:15. Find next HH:15 strictly AFTER sent.
  const next = new Date(sent); next.setUTCMinutes(15, 0, 0);
  if (next <= sent) next.setUTCHours(next.getUTCHours() + 1);
  // The "previous" run end time which becomes the next run's `since`
  const prev = new Date(next); prev.setUTCHours(prev.getUTCHours() - 1);
  const filtered = sent.getTime() <= prev.getTime();
  const minutesGap = (sent.getTime() - prev.getTime()) / 60000;
  console.log(`  ${m.id} ${m.sent} → first crawl at ${next.toISOString()}, since=${prev.toISOString()}; sent-to-since gap ${minutesGap.toFixed(1)}min → ${filtered ? 'FILTERED (sent <= since)' : 'should pass'}`);
}
