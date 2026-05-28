// Cron health spot-check.
// gmail-sent-crawl  — hourly :15 UTC. Healthy if last_sent_crawl_at is <90 min old.
// gmail-watch-renew — daily 12:00 UTC. Healthy if watch_expiration is >24h in future
//                      (Google Pub/Sub watches are 7d; this renews them daily).
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const banner = (s) => console.log(`\n===== ${s} =====`);
const now = Date.now();
const fmt = (iso) => iso ? new Date(iso).toISOString() : '(null)';
const ageMin = (iso) => iso ? Math.floor((now - new Date(iso).getTime()) / 60000) : null;
const ageH = (iso) => iso ? Math.floor((now - new Date(iso).getTime()) / 3600000) : null;
const inH = (iso) => iso ? Math.floor((new Date(iso).getTime() - now) / 3600000) : null;

const verdict = (ok) => ok ? '\x1b[32m✓ OK\x1b[0m' : '\x1b[31m✗ FAIL\x1b[0m';

banner('gmail-sent-crawl  (schedule: 15 * * * * — hourly at :15 UTC)');
const { data: accts } = await sb.from('gmail_accounts')
  .select('email, sent_crawl_enabled, last_sent_crawl_at, watch_expiration, connected_at, updated_at')
  .order('email');
console.log(`opted-in accounts: ${accts.filter((a) => a.sent_crawl_enabled).length} / ${accts.length} total`);
for (const a of accts) {
  if (!a.sent_crawl_enabled) { console.log(`  ${a.email}  (opt-out — not crawled)`); continue; }
  const lastMin = ageMin(a.last_sent_crawl_at);
  // Cron is hourly at :15. Healthy if last run was within the last 90 min
  // (a small buffer for cron drift and the 30-min overlap we just shipped).
  const healthy = lastMin !== null && lastMin <= 90;
  console.log(`  ${a.email}`);
  console.log(`    connected_at:        ${fmt(a.connected_at)} (${ageH(a.connected_at)}h ago)`);
  console.log(`    last_sent_crawl_at:  ${fmt(a.last_sent_crawl_at)} (${lastMin}m ago)  ${verdict(healthy)}`);
  if (!healthy) console.log(`    ↳ expected <90m, got ${lastMin}m — cron may not be firing`);
}

banner('gmail-watch-renew (schedule: 0 12 * * * — daily noon UTC)');
// Google's Gmail watch expires 7 days after registration. The renewer runs
// daily and pushes the expiration ~7 days into the future. Healthy if
// watch_expiration is >24h in the future on every opted-in account.
for (const a of accts) {
  if (!a.sent_crawl_enabled) continue;  // only matters for accounts being used
  if (!a.watch_expiration) { console.log(`  ${a.email}  watch_expiration: (null) ${verdict(false)} — no watch registered`); continue; }
  const hUntil = inH(a.watch_expiration);
  const healthy = hUntil >= 24;
  console.log(`  ${a.email}  watch_expiration: ${fmt(a.watch_expiration)} (${hUntil}h from now)  ${verdict(healthy)}`);
  if (!healthy) console.log(`    ↳ expected >=24h, got ${hUntil}h — daily renewer may not be firing, watch will lapse`);
}

banner('Side check: are recent inbox replies being attached?');
// gmail-pubsub-reply.js handles Gmail push notifications for inbound replies.
// Not strictly a cron but worth verifying — if no recent replies, either no
// one is replying OR the pubsub topic isn't wired up. Show last 5 reply rows.
{
  const { data } = await sb.from('outreach_replies')
    .select('email, campaign_id, reply_date, reply_sentiment, sentiment_source, ingested_at')
    .order('reply_date', { ascending: false }).limit(5);
  console.table(data);
  if (data?.length) {
    const newest = ageH(data[0].reply_date);
    console.log(`most recent reply: ${newest}h ago — ${newest <= 48 ? verdict(true) + ' looks normal' : verdict(false) + ' nothing in last 48h is suspicious'}`);
  }
}

banner('Side check: are sends being captured? (last 5 sends with sender_email set)');
{
  const { data } = await sb.from('outreach_sends')
    .select('email, campaign_id, sent_time, sender_email, ingested_at')
    .not('sender_email', 'is', null).order('sent_time', { ascending: false }).limit(5);
  console.table(data);
  if (data?.length) {
    const newest = ageH(data[0].sent_time);
    console.log(`most recent send: ${newest}h ago — ${newest <= 48 ? verdict(true) + ' looks normal' : verdict(false) + ' nothing in last 48h is suspicious'}`);
  }
}
