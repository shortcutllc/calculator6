/**
 * cron-heartbeat-monitor — the dead-man's-switch for the outreach cron jobs.
 *
 * Runs on Netlify (always-on, machine-independent) — this is the whole point:
 * a monitor on Will's Mac would be down exactly when the Mac is down. Once a day
 * it reads cron_heartbeats and Slack-DMs Will if any critical job went stale
 * (didn't run) or reported an error. Silence = everything ran.
 *
 * Each watched job stamps cron_heartbeats on success (see lib/heartbeat.js).
 * To watch a new job: instrument it with stampHeartbeat, then add it to EXPECTED.
 *
 * Env: SUPABASE_URL/SERVICE_ROLE_KEY, PRO_SLACK_BOT_TOKEN.
 *      Optional HEARTBEAT_ALERT_SLACK_USER (email, default will@getshortcut.co).
 */
import { createClient } from '@supabase/supabase-js';

export const config = { schedule: '0 16 * * *' }; // 16:00 UTC daily (noon ET) — after the morning local jobs

// Watched jobs + how stale is "too stale". skipDays: UTC day numbers (0=Sun..6=Sat)
// to NOT evaluate (e.g. weekday-only jobs shouldn't alarm on Mon after the weekend).
const EXPECTED = [
  { job: 'smartlead-pull', maxStaleHours: 3, label: 'Smartlead reply pull (hourly)' },
  { job: 'gmail-sent-crawl', maxStaleHours: 3, label: "Reps' Gmail sent-crawl (hourly)" },
  { job: 'enrich-replies', maxStaleHours: 28, label: 'Reply classification (daily 6:30am)' },
  { job: 'generate-plays', maxStaleHours: 28, label: 'Play A/B boards (daily 6:45am)' },
  { job: 'graduate-replies', maxStaleHours: 28, label: 'Graduate positive replies (daily 7:05am)' },
  { job: 'sync-bounces', maxStaleHours: 28, label: 'Bounce suppression (daily 6:50am)' },
  { job: 'founder-reply-graduate', maxStaleHours: 3, label: 'Founder reply graduation (hourly)' },
];

const SLACK_API = 'https://slack.com/api';
const RECIPIENT = process.env.HEARTBEAT_ALERT_SLACK_USER || 'will@getshortcut.co';

async function slack(method, body) {
  const r = await fetch(`${SLACK_API}/${method}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.PRO_SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

async function dmWill(text) {
  // users.lookupByEmail does NOT accept a JSON body — it needs a GET query param.
  // Sending it as JSON (like the other calls) returns invalid_arguments, which is
  // why heartbeat DMs silently never delivered (Will 2026-07-10). GET it directly.
  const lr = await fetch(`${SLACK_API}/users.lookupByEmail?email=${encodeURIComponent(RECIPIENT)}`, {
    headers: { Authorization: `Bearer ${process.env.PRO_SLACK_BOT_TOKEN}` },
  });
  const u = await lr.json();
  if (!u.ok) { console.error('[heartbeat-monitor] slack lookup failed:', u.error); return; }
  const c = await slack('conversations.open', { users: u.user.id });
  if (!c.ok) { console.error('[heartbeat-monitor] conversations.open failed:', c.error); return; }
  await slack('chat.postMessage', { channel: c.channel.id, text, unfurl_links: false });
}

export const handler = async () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { statusCode: 500, body: 'misconfigured (SUPABASE)' };
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { data: rows, error } = await sb.from('cron_heartbeats').select('job_name, last_run_at, status, note, host');
  if (error) {
    // Missing table (migration not applied yet) → clean no-op, not a failure.
    console.warn('[heartbeat-monitor] cron_heartbeats not readable (migration applied?):', error.message);
    return { statusCode: 200, body: JSON.stringify({ skipped: true, reason: error.message }) };
  }
  const byJob = Object.fromEntries((rows || []).map((r) => [r.job_name, r]));

  const now = Date.now();
  const day = new Date().getUTCDay();
  const problems = [];
  for (const e of EXPECTED) {
    if (e.skipDays && e.skipDays.includes(day)) continue;
    const row = byJob[e.job];
    if (!row) { problems.push(`• *${e.job}* — no heartbeat ever recorded (${e.label})`); continue; }
    if (row.status && row.status !== 'ok') {
      problems.push(`• *${e.job}* — last run reported status \`${row.status}\`${row.note ? ` (${row.note})` : ''}`);
      continue;
    }
    const ageH = (now - new Date(row.last_run_at).getTime()) / 3600000;
    if (ageH > e.maxStaleHours) {
      problems.push(`• *${e.job}* — last ran ${ageH.toFixed(1)}h ago, expected < ${e.maxStaleHours}h (${e.label})`);
    }
  }

  if (problems.length && process.env.PRO_SLACK_BOT_TOKEN) {
    const text = [
      `:rotating_light: *Cron heartbeat alert* — ${problems.length} outreach job(s) look stale or failed.`,
      'A job that stopped means replies may not be getting classified, suppressed, or graduated. Check the Mac cron / logs.',
      '',
      ...problems,
    ].join('\n');
    await dmWill(text);
  }

  return { statusCode: 200, body: JSON.stringify({ checked: EXPECTED.length, problems }) };
};
