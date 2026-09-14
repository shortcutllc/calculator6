/**
 * drip-runner-scheduled — Netlify SCHEDULED trigger for rep nurture drips.
 *
 * Fires every 10 minutes across the weekday sending window. Four fires a day put
 * ~17 sends into a 12-minute burst — roughly 42s apart, against Smartlead's ~19
 * minutes — which is exactly the automated pattern we are trying not to look
 * like. Frequent small ticks let the runner hold a human cadence: it sends 0-2
 * per tick and waits a random slice of the interval first, so messages scatter
 * across the window instead of landing on the :00/:10/:20 grid.
 *
 * The background function re-checks each campaign's own send window and daily
 * cap, so ticks outside a campaign's hours are cheap no-ops.
 *
 * Concurrent or double fires are safe: the runner re-reads each lead's touch
 * state, enforces one touch per lead per day, and counts what has already gone
 * out today against the cap before sending anything.
 *
 * 13-20 UTC = 9am-4pm ET during EDT. Schedule declared here AND in netlify.toml
 * (see scripts/check-schedules.mjs).
 */

const BACKGROUND_URL_PATH = '/.netlify/functions/drip-runner-background';

export const config = { schedule: '*/10 13-20 * * 1-5' };

export const handler = async () => {
  const base = (process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://proposals.getshortcut.co').replace(/\/$/, '');
  try {
    const r = await fetch(`${base}${BACKGROUND_URL_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Per-run ceiling only; tickPlan decides the real number for this tick.
      body: JSON.stringify({ confirm: true, max: 2 }),
    });
    console.log(`[drip-runner-scheduled] dispatched → HTTP ${r.status}`);
    return { statusCode: 200, body: `dispatched drip-runner-background (HTTP ${r.status})` };
  } catch (e) {
    console.error('[drip-runner-scheduled] dispatch failed:', e.message);
    return { statusCode: 500, body: e.message };
  }
};
