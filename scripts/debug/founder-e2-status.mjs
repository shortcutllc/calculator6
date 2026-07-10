/**
 * founder-e2-status — read-only table of founder E1s sent THIS WEEK, when their E2
 * is due, whether it's gone out, and why not. Mirrors founder-followup-background's
 * logic (E1 = earliest will@ send; E2 due = E1 + cadence). No writes.
 *   node scripts/debug/founder-e2-status.mjs
 */
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const WILL = 'will@getshortcut.co';
const E2_DAYS = Number(process.env.E2_DAYS || 3); // current cadence; pass E2_DAYS=2 to preview
const lc = (s) => String(s || '').trim().toLowerCase();
const fmt = (d) => d ? new Date(d).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }) : '—';
const dow = (d) => new Date(d).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/New_York' });
const isWeekend = (d) => ['Sat', 'Sun'].includes(dow(d));

// start of this week (Monday 00:00 ET) — approximate via UTC-4
const now = new Date();
const weekStart = new Date(now); weekStart.setUTCHours(4, 0, 0, 0);
weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));

const e1rows = [];
for (let f = 0; ; f += 1000) {
  const { data } = await sb.from('saved_drafts').select('id, recipient_email, target_ref').eq('target_kind', 'founder_note').range(f, f + 999);
  e1rows.push(...(data || [])); if (!data || data.length < 1000) break;
}
const supp = new Set();
{ const { data } = await sb.from('crm_suppression').select('email').limit(20000); (data || []).forEach((x) => supp.add(lc(x.email))); }

const rows = [];
for (const e1 of e1rows) {
  const email = lc(e1.recipient_email);
  const ref = e1.target_ref || {};
  const { data: sends } = await sb.from('outreach_sends').select('sent_time, reply_time, is_bounced').eq('email', email).eq('sender_email', WILL).order('sent_time', { ascending: true });
  const e1send = (sends || [])[0];
  if (!e1send?.sent_time) continue;                       // E1 not sent
  if (new Date(e1send.sent_time) < weekStart) continue;   // not this week
  const seq = ref.sequence || { touches: [{ n: 1 }], status: 'active' };
  const e2touch = (seq.touches || []).find((t) => t.n === 2);
  const dueAt = new Date(new Date(e1send.sent_time).getTime() + E2_DAYS * 86400000);
  const ageDays = (now - new Date(e1send.sent_time)) / 86400000;

  let status;
  if (supp.has(email)) status = 'HALTED: suppressed';
  else if ((sends || []).some((s) => s.is_bounced) || ref.sequence?.status === 'bounced') status = 'HALTED: bounced';
  else if ((sends || []).some((s) => s.reply_time) || ref.sequence?.status === 'replied') status = 'HALTED: replied ✋';
  else if (e2touch) status = `E2 SENT ${fmt(e2touch.sent_at)}`;
  else if (ageDays < E2_DAYS) status = `pending — not due yet`;
  else if (isWeekend(dueAt)) status = `DUE but weekend — waits to Monday`;
  else status = `DUE ${(ageDays - E2_DAYS).toFixed(1)}d ago — NOT SENT (cron gap)`;

  rows.push({ email, e1: e1send.sent_time, dueAt, dueWeekend: isWeekend(dueAt), status });
}
rows.sort((a, b) => new Date(a.e1) - new Date(b.e1));

console.log(`\nFounder E1s sent since ${fmt(weekStart)} (cadence: E2 = E1 + ${E2_DAYS}d)\n`);
console.log('EMAIL'.padEnd(42), 'E1 SENT'.padEnd(22), 'E2 DUE'.padEnd(22), 'STATUS');
console.log('-'.repeat(140));
for (const r of rows) console.log(lc(r.email).padEnd(42), fmt(r.e1).padEnd(22), `${fmt(r.dueAt)}${r.dueWeekend ? ' (wknd)' : ''}`.padEnd(22), r.status);
console.log(`\n${rows.length} E1s sent this week.`);
const notSent = rows.filter((r) => r.status.includes('NOT SENT'));
const pending = rows.filter((r) => r.status.startsWith('pending'));
const e2sent = rows.filter((r) => r.status.startsWith('E2 SENT'));
const halted = rows.filter((r) => r.status.startsWith('HALTED'));
console.log(`  E2 sent: ${e2sent.length} · pending (not due): ${pending.length} · DUE-but-not-sent: ${notSent.length} · halted: ${halted.length}`);
process.exit(0);
