/**
 * founder-followup-scheduled — Netlify SCHEDULED trigger for the auto-sent founder
 * follow-ups, replacing the Mac cron (which missed sends when the laptop slept and
 * couldn't catch afternoon-due touches).
 *
 * Fires FOUR times on weekdays — 9am, 11am, 1pm, 3pm ET — so a day-2 E2 goes out
 * the same day no matter what time the E1 was sent (up to a 3pm ET cutoff, per Will
 * 2026-07-10). Weekends are skipped by the cron (Mon-Fri), so a touch that comes due
 * on Sat/Sun waits for Monday's first run. Each fire just POSTs the existing
 * founder-followup-background function with confirm=true — that function does the
 * live per-thread reply-halt, the one-touch-per-lead-per-day guard, and the actual
 * sending. Concurrent double-fires are safe: the background function reads the
 * sequence state + "already touched today" guard before every send.
 *
 * 13/15/17/19 UTC = 9am/11am/1pm/3pm during EDT. Schedule declared here AND in
 * netlify.toml (see scripts/check-schedules.mjs).
 */

const BACKGROUND_URL_PATH = '/.netlify/functions/founder-followup-background';

export const config = { schedule: '0 13,15,17,19 * * 1-5' };

export const handler = async () => {
  const base = (process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://proposals.getshortcut.co').replace(/\/$/, '');
  try {
    const r = await fetch(`${base}${BACKGROUND_URL_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true, max: 15 }),
    });
    console.log(`[founder-followup-scheduled] dispatched → HTTP ${r.status}`);
    return { statusCode: 200, body: `dispatched founder-followup-background (HTTP ${r.status})` };
  } catch (e) {
    console.error('[founder-followup-scheduled] dispatch failed:', e.message);
    return { statusCode: 500, body: e.message };
  }
};
