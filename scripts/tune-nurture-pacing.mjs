#!/usr/bin/env node
/**
 * tune-nurture-pacing.mjs — push the sequence + pacing config to the nurture campaigns.
 *
 * THE BOTTLENECK worth understanding before changing numbers:
 *   1. The MAILBOX cap (message_per_day) is the hard ceiling on TOTAL sends from
 *      that address. It was 15, which throttles everything downstream regardless
 *      of campaign settings.
 *   2. The campaign's max_leads_per_day counts NEW leads only. Follow-ups are on
 *      top, so with a 3-step sequence the steady-state total is roughly 3x that.
 *   3. The send WINDOW times min_time_btwn_emails caps sends independently: a
 *      09:00-12:00 window at 15 min gaps physically allows ~12 sends, so the old
 *      config could never reach even its own 15/day cap.
 *
 * Defaults below target finishing first touches inside October, from one personal
 * Gmail, on the primary domain.
 *
 *   node scripts/tune-nurture-pacing.mjs --dry-run
 *   node scripts/tune-nurture-pacing.mjs --rep jaimie --apply
 *   node scripts/tune-nurture-pacing.mjs --all --apply
 */
import { requireEnv } from './lib/load-env.mjs';
import { REP_MAILBOXES, REPS } from './lib/nurture-config.mjs';
import { buildNurtureSequence, spinCombinations } from './lib/nurture-sequence.mjs';

const BASE = 'https://server.smartlead.ai/api/v1';
requireEnv('SMARTLEAD_API_KEY');
const KEY = process.env.SMARTLEAD_API_KEY;

const CAMPAIGNS = { marc: 3935143, caren: 3935144, jaimie: 3935145 };

// New leads injected per day. Total daily sends settle near 3x this with 3 steps.
export const NEW_LEADS_PER_DAY = 25;
// Hard ceiling on the mailbox. Must comfortably exceed NEW_LEADS_PER_DAY x steps.
export const MAILBOX_PER_DAY = 80;
// Floor between sends. Smartlead jitters above this; it is a minimum, not a fixed gap.
export const MIN_GAP_MINUTES = 6;

export const SCHEDULE = {
  timezone: 'America/New_York',
  days_of_the_week: [1, 2, 3, 4, 5],
  start_hour: '09:00',
  end_hour: '17:00',
  min_time_btw_emails: MIN_GAP_MINUTES,
  max_new_leads_per_day: NEW_LEADS_PER_DAY,
};

const arg = (f, d = null) => { const i = process.argv.indexOf(f); return i > -1 ? (process.argv[i + 1] ?? true) : d; };
const has = (f) => process.argv.includes(f);

async function sl(method, path, body) {
  const r = await fetch(`${BASE}${path}${path.includes('?') ? '&' : '?'}api_key=${KEY}`, {
    method, headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${t.slice(0, 200)}`);
  try { return JSON.parse(t); } catch { return { raw: t }; }
}

/** Window capacity is its own constraint; report it so pacing is never silently capped. */
export function windowCapacity(schedule) {
  const [sh, sm] = schedule.start_hour.split(':').map(Number);
  const [eh, em] = schedule.end_hour.split(':').map(Number);
  return Math.floor(((eh * 60 + em) - (sh * 60 + sm)) / schedule.min_time_btw_emails);
}

(async () => {
  const apply = has('--apply');
  const reps = has('--all') ? REPS : [arg('--rep')].filter(Boolean);
  if (!reps.length) throw new Error('pass --rep <marc|caren|jaimie> or --all');

  const failures = [];
  const cap = windowCapacity(SCHEDULE);
  const peak = NEW_LEADS_PER_DAY * 3;
  console.log(`window allows ~${cap} sends/day | new leads/day ${NEW_LEADS_PER_DAY} | steady-state total ~${peak}/day | mailbox cap ${MAILBOX_PER_DAY}`);
  if (peak > cap) console.log(`  WARNING: steady-state ${peak} exceeds window capacity ${cap}; widen the window or lower the gap.`);
  if (peak > MAILBOX_PER_DAY) console.log(`  WARNING: steady-state ${peak} exceeds mailbox cap ${MAILBOX_PER_DAY}.`);

  for (const rep of reps) {
    const id = CAMPAIGNS[rep];
    const box = REP_MAILBOXES[rep];
    const seq = buildNurtureSequence({ signOff: box.sign_off });
    const combos = seq.reduce((n, s) => n * spinCombinations(s.email_body) * (s.subject ? spinCombinations(s.subject) : 1), 1);
    console.log(`\n${rep} (campaign ${id}, ${box.email}) — ${seq.length} steps, ${combos.toLocaleString()} renderings`);
    if (!apply) { console.log('  dry run, nothing written'); continue; }

    try {
      // mailbox cap first: it is the hard ceiling, and the most likely call to fail
      await sl('POST', `/email-accounts/${box.account_id}`, { max_email_per_day: MAILBOX_PER_DAY });
      await sl('POST', `/campaigns/${id}/sequences`, { sequences: seq });
      await sl('POST', `/campaigns/${id}/schedule`, SCHEDULE);
      console.log('  mailbox cap + sequence + schedule written');
    } catch (err) {
      failures.push(`${rep}: ${err.message}`);
      console.log(`  FAILED: ${err.message}`);
    }
  }
  if (failures.length) {
    console.error(`\n${failures.length} rep(s) failed:\n  ${failures.join('\n  ')}`);
    process.exit(1);
  }
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
