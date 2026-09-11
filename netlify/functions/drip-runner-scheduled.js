/**
 * drip-runner-scheduled — Netlify SCHEDULED trigger for rep nurture drips.
 *
 * Fires four times across the weekday sending window so the day's ramped cap is
 * spread out rather than dumped in one burst, and so a touch that comes due at
 * lunchtime still goes out the same day. The background function re-checks the
 * send window itself, so a fire outside a given campaign's hours is a no-op.
 *
 * Concurrent or double fires are safe: the runner re-reads each lead's touch
 * state, enforces one touch per lead per day, and counts what has already gone
 * out today against the cap before sending anything.
 *
 * 13/15/17/19 UTC = 9am/11am/1pm/3pm ET during EDT. Schedule declared here AND
 * in netlify.toml (see scripts/check-schedules.mjs).
 */

const BACKGROUND_URL_PATH = '/.netlify/functions/drip-runner-background';

export const config = { schedule: '0 13,15,17,19 * * 1-5' };

export const handler = async () => {
  const base = (process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://proposals.getshortcut.co').replace(/\/$/, '');
  try {
    const r = await fetch(`${base}${BACKGROUND_URL_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // max is a per-RUN ceiling; the campaign's own ramped daily cap is the real limit.
      body: JSON.stringify({ confirm: true, max: 25 }),
    });
    console.log(`[drip-runner-scheduled] dispatched → HTTP ${r.status}`);
    return { statusCode: 200, body: `dispatched drip-runner-background (HTTP ${r.status})` };
  } catch (e) {
    console.error('[drip-runner-scheduled] dispatch failed:', e.message);
    return { statusCode: 500, body: e.message };
  }
};
