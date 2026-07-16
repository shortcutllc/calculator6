/**
 * founder-lane-metrics.mjs — the founder lane's real scoreboard (Will 2026-07-14).
 *
 * WHY THIS EXISTS: the help/convo CTA A/B cannot answer anything. As of 2026-07-14 it
 * had produced 71 drafts -> 27 sends -> ONE reply, on a 2.5:1 imbalanced split. And it
 * tests the wrong variable: the 1:1 research says the OBSERVATION is the lever, not the
 * CTA wording. So measure what matters:
 *
 *   1. SEND RATE (drafted -> actually sent). This is THE metric. Will discards ~62% of
 *      the queue's drafts, and a draft he won't send is worth zero. If the engine gets
 *      better, this number moves first — before any reply lands.
 *   2. Send + reply rate BY HOOK CATEGORY (office / milestone / culture / person / none).
 *      Every note carries a hook category, so this accumulates fast.
 *   3. Send + reply rate BY ARCHITECTURE (braun / short / ferriss).
 *
 * A "send" = the E1 landed in will@'s sent mail (outreach_sends, via gmail-sent-crawl).
 * A "reply" = that send has a reply_time. Both are ground truth, not self-reported.
 *
 * NOTE: hook_category/architecture are only recorded on notes drafted AFTER 2026-07-14
 * (deploy e9b68d5+). Older rows show as 'unrecorded' — that is expected, not a bug.
 *
 * Usage:
 *   set -a; source ~/.shortcut-cron.env; set +a
 *   node scripts/debug/founder-lane-metrics.mjs            # all time
 *   node scripts/debug/founder-lane-metrics.mjs --since 2026-07-14
 */
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const sinceIdx = args.indexOf('--since');
const SINCE = sinceIdx >= 0 ? args[sinceIdx + 1] : null;

const sb = createClient(
  (process.env.SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  { auth: { persistSession: false } },
);
const WILL = 'will@getshortcut.co';
const pct = (n, d) => (d ? `${((100 * n) / d).toFixed(0)}%` : '—');

(async () => {
  let q = sb.from('saved_drafts').select('recipient_email, subject, created_at, target_ref').eq('target_kind', 'founder_note');
  if (SINCE) q = q.gte('created_at', SINCE);
  const { data: drafts, error } = await q;
  if (error) { console.error('query failed:', error.message); process.exit(1); }
  if (!drafts?.length) { console.log('no founder_note drafts found'); return; }

  // Ground truth on sends/replies: will@'s actual sent mail.
  const { data: sends } = await sb.from('outreach_sends')
    .select('email, sent_time, reply_time')
    .eq('sender_email', WILL);
  const sentMap = new Map();
  for (const s of (sends || [])) {
    const k = String(s.email || '').toLowerCase();
    const prev = sentMap.get(k);
    // keep the row that actually got a reply, if any
    if (!prev || (!prev.reply_time && s.reply_time)) sentMap.set(k, s);
  }

  const rows = drafts.map((d) => {
    const r = d.target_ref || {};
    const send = sentMap.get(String(d.recipient_email || '').toLowerCase());
    return {
      audience: r.audience || '?',
      hook: r.hook_category || (r.personal_hook ? 'unrecorded(had hook)' : 'unrecorded(no hook)'),
      arch: r.architecture || 'unrecorded',
      cta: r.cta_variant || '-',
      sent: Boolean(send),
      replied: Boolean(send?.reply_time),
    };
  });

  const tally = (keyFn, title) => {
    const g = new Map();
    for (const r of rows) {
      const k = keyFn(r);
      const v = g.get(k) || { drafted: 0, sent: 0, replied: 0 };
      v.drafted += 1; if (r.sent) v.sent += 1; if (r.replied) v.replied += 1;
      g.set(k, v);
    }
    console.log(`\n=== ${title} ===`);
    console.log(`${'group'.padEnd(28)} ${'drafted'.padStart(7)} ${'sent'.padStart(6)} ${'send%'.padStart(6)} ${'replied'.padStart(7)} ${'reply%'.padStart(7)}`);
    const sorted = [...g.entries()].sort((a, b) => b[1].drafted - a[1].drafted);
    for (const [k, v] of sorted) {
      console.log(`${String(k).padEnd(28)} ${String(v.drafted).padStart(7)} ${String(v.sent).padStart(6)} ${pct(v.sent, v.drafted).padStart(6)} ${String(v.replied).padStart(7)} ${pct(v.replied, v.sent).padStart(7)}`);
    }
  };

  const T = rows.length;
  const S = rows.filter((r) => r.sent).length;
  const R = rows.filter((r) => r.replied).length;
  console.log(`\nFOUNDER LANE${SINCE ? ` (since ${SINCE})` : ' (all time)'}`);
  console.log('─'.repeat(72));
  console.log(`  drafted ${T}   sent ${S} (${pct(S, T)} of drafts)   replied ${R} (${pct(R, S)} of sends)`);
  console.log(`  >> SEND RATE IS THE METRIC. A draft Will won't send is worth zero.`);

  tally((r) => r.hook, 'BY HOOK CATEGORY  (the real A/B — the observation is the lever)');
  tally((r) => r.arch, 'BY ARCHITECTURE   (braun / short / ferriss)');
  tally((r) => r.audience, 'BY AUDIENCE');
  tally((r) => r.cta, 'BY CTA VARIANT    (retired 2026-07-14 — kept only to show it says nothing)');

  const unrec = rows.filter((r) => r.arch === 'unrecorded').length;
  if (unrec) console.log(`\nnote: ${unrec}/${T} drafts predate the 2026-07-14 instrumentation (hook_category/architecture not recorded). Expected.`);
})().catch((e) => { console.error('METRICS_ERROR:', e.message); process.exit(1); });
