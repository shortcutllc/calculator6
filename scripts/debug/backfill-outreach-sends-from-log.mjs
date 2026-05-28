// Backfill outreach_sends from lead_outreach_log channel='email' entries.
//
// Context: workhuman booth + personal-note outreach tools log to
// lead_outreach_log (multi-channel record) but do NOT write to outreach_sends
// (the table the daily digest, follow-up queue, and "never emailed" badge
// all read from). Result: leads who were emailed via those tools look
// "never emailed" to the digest.
//
// This script aggregates per (lead_email, sender_email) and upserts a single
// outreach_sends row with touch_count = number of log entries. Idempotent —
// running twice produces the same touch_count, not double.
//
// Usage:
//   node scripts/debug/backfill-outreach-sends-from-log.mjs --dry       # preview
//   node scripts/debug/backfill-outreach-sends-from-log.mjs             # for real
//   node scripts/debug/backfill-outreach-sends-from-log.mjs --sender jaimie@getshortcut.co  # just one rep
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const flag = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? (process.argv[i + 1] || true) : d; };
const DRY = !!flag('--dry', false);
const ONLY_SENDER = flag('--sender', null);

// Centralized rep mapping. Keep in sync with workhuman-booth-send.js until
// we extract this to a shared lib.
const SENDER_EMAILS = {
  'Will Newton':       'will@getshortcut.co',
  'Jaimie Pritchard':  'jaimie@getshortcut.co',
  'Marc Levitan':      'marc@getshortcut.co',
  'Caren Skutch':      'caren@getshortcut.co',
};

const CAMPAIGN_ID = 'workhuman-booth-email';

console.log(`Mode: ${DRY ? 'DRY-RUN (no writes)' : 'WRITE'}${ONLY_SENDER ? ` · only ${ONLY_SENDER}` : ''}`);

// 1) Pull all email-channel log entries
const logRows = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('lead_outreach_log')
    .select('id, lead_id, channel, sender_name, sent_at, message_preview, template_id')
    .eq('channel', 'email').range(from, from + 999);
  if (error) { console.error(error); process.exit(1); }
  logRows.push(...data);
  if (data.length < 1000) break;
}
console.log(`Email log entries: ${logRows.length}`);

if (logRows.length === 0) { console.log('Nothing to backfill.'); process.exit(0); }

// 2) Resolve lead_id → email
const uniqLeadIds = [...new Set(logRows.map((r) => r.lead_id))];
const leadEmailById = new Map();
for (let i = 0; i < uniqLeadIds.length; i += 200) {
  const slice = uniqLeadIds.slice(i, i + 200);
  const { data } = await sb.from('workhuman_leads').select('id, email').in('id', slice);
  for (const row of (data || [])) leadEmailById.set(row.id, row.email?.toLowerCase());
}
const orphans = logRows.filter((r) => !leadEmailById.get(r.lead_id)).length;
if (orphans) console.warn(`  ⚠ ${orphans} log entries reference lead_ids with no workhuman_leads row (skipped)`);

// 3) Aggregate by (lead_email, sender_email): count + latest timestamp + sample template
const agg = new Map();
let skippedUnknownSender = 0;
for (const log of logRows) {
  const leadEmail = leadEmailById.get(log.lead_id);
  if (!leadEmail) continue;
  const senderEmail = SENDER_EMAILS[log.sender_name];
  if (!senderEmail) { skippedUnknownSender += 1; continue; }
  if (ONLY_SENDER && senderEmail !== ONLY_SENDER) continue;
  const key = `${leadEmail}|${senderEmail}`;
  const cur = agg.get(key) || { count: 0, latest: null, leadEmail, senderEmail, templates: new Set() };
  cur.count += 1;
  if (!cur.latest || log.sent_at > cur.latest) cur.latest = log.sent_at;
  if (log.template_id) cur.templates.add(log.template_id);
  agg.set(key, cur);
}
if (skippedUnknownSender) console.warn(`  ⚠ ${skippedUnknownSender} log entries with sender_name not in SENDER_EMAILS map (skipped)`);

console.log(`\nWould upsert ${agg.size} (lead, sender) rows:`);
const perSender = new Map();
for (const v of agg.values()) {
  const s = v.senderEmail;
  perSender.set(s, (perSender.get(s) || 0) + 1);
}
for (const [sender, n] of perSender) console.log(`  ${sender.padEnd(30)} ${n} unique leads`);
console.log('\nSample (first 10):');
let i = 0;
for (const v of agg.values()) {
  console.log(`  ${v.leadEmail.padEnd(40)} ← ${v.senderEmail.split('@')[0].padEnd(8)} · touches=${v.count} · latest=${v.latest}`);
  if (++i >= 10) break;
}

if (DRY) { console.log('\n[DRY-RUN] No writes performed. Re-run without --dry to apply.'); process.exit(0); }

console.log('\nApplying writes…');
let upserted = 0; const failures = [];
for (const v of agg.values()) {
  const { error } = await sb.from('outreach_sends').upsert(
    {
      email: v.leadEmail,
      campaign_id: CAMPAIGN_ID,
      sent_time: v.latest,
      sender_email: v.senderEmail,
      touch_count: v.count,
      ingested_at: new Date().toISOString(),
    },
    { onConflict: 'email,campaign_id' },
  );
  if (error) failures.push({ email: v.leadEmail, sender: v.senderEmail, error: error.message });
  else upserted += 1;
}
console.log(`\n✓ Upserted ${upserted} rows`);
if (failures.length) {
  console.error(`  ✗ ${failures.length} failures:`);
  failures.slice(0, 10).forEach((f) => console.error(`    ${f.email} (${f.sender}): ${f.error}`));
}
