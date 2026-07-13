/**
 * founder-queue-scheduled — Netlify SCHEDULED trigger for Will's morning broker
 * queue, replacing the Mac cron (which skipped when the laptop slept — confirmed
 * missed Mon 2026-07-13, Mac asleep at 7:45am).
 *
 * The real work already lives in founder-queue-background.js (research → draft in
 * Will's voice → Gmail draft + Slack card per lead), which runs ON NETLIFY and
 * only needs ANTHROPIC_API_KEY + PRO_SLACK_BOT_TOKEN + SUPABASE_* — all already in
 * the site env (it drafts successfully today via the Mac cron's POST). So moving
 * the TRIGGER here is machine-independent and needs no new env. (tech-scout is
 * different: it calls Apollo/MillionVerifier directly and still needs those keys
 * added before it can move.)
 *
 * Fires 7:45am ET on weekdays. 45 11 = 7:45 EDT (matches the codebase's EDT-fixed
 * cron convention; fires 6:45am during EST — immaterial, the drafts wait for Will
 * to send by hand). audience defaults to brokers; max 5 (raise later if desired).
 * Weekend-due days simply don't fire (Mon-Fri cron).
 *
 * Schedule declared here AND in netlify.toml (see scripts/check-schedules.mjs).
 */

const BACKGROUND_URL_PATH = '/.netlify/functions/founder-queue-background';

export const config = { schedule: '45 11 * * 1-5' };

export const handler = async () => {
  const base = (process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://proposals.getshortcut.co').replace(/\/$/, '');
  try {
    const r = await fetch(`${base}${BACKGROUND_URL_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ max: 5, audience: 'brokers' }),
    });
    console.log(`[founder-queue-scheduled] dispatched → HTTP ${r.status}`);
    return { statusCode: 200, body: `dispatched founder-queue-background (HTTP ${r.status})` };
  } catch (e) {
    console.error('[founder-queue-scheduled] dispatch failed:', e.message);
    return { statusCode: 500, body: e.message };
  }
};
