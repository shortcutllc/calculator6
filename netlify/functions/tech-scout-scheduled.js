/**
 * tech-scout-scheduled — Netlify SCHEDULED trigger for the tech-exec daily scout,
 * replacing the Mac cron (which skipped when the laptop slept — confirmed missed
 * Mon 2026-07-13 at 7:35am). Just POSTs tech-scout-background, which does the
 * harvest → enrich → verify → queue work (15-min background limit).
 *
 * Fires 7:35am ET weekdays. 35 11 = 7:35 EDT (matches the codebase's EDT-fixed
 * cron convention; fires 6:35 during EST — immaterial, drafts wait for Will).
 *
 * ACTIVE (cutover 2026-07-13): the netlify.toml [functions."tech-scout-scheduled"]
 * entry is in place, so this fires. The local Mac tech-scout harvest cron was
 * retired at the same time — Netlify is now the sole trigger. (The local --report
 * cron stays; it reads the shared Supabase ledger.)
 */

const BACKGROUND_URL_PATH = '/.netlify/functions/tech-scout-background';

export const config = { schedule: '35 11 * * 1-5' };

export const handler = async () => {
  const base = (process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://proposals.getshortcut.co').replace(/\/$/, '');
  try {
    const r = await fetch(`${base}${BACKGROUND_URL_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // QUEUE PAUSED 2026-07-20 (Will) while the v2 writing loop is evaluated.
      // tech-scout does TWO jobs: (a) harvest/qualify/enrich tech-exec targets, which is
      // valuable and keeps running, and (b) QUEUE v1 founder notes off the back of them.
      // (b) is what kept producing unread drafts after the morning queue was paused —
      // on 2026-07-20 it wrote 5 more at 11:39-11:47Z (tech-scout fires 11:35Z; the
      // founder-queue pause was working correctly and is NOT the leak, despite firing
      // 10 minutes later at 11:45Z with audience='brokers' — today's drafts were all
      // tech-execs, which only this path produces).
      // Set TECH_SCOUT_QUEUE=true in the site env to resume drafting.
      body: JSON.stringify({
        harvest: true, confirm: true, maxOrgs: 30, maxBuyers: 5,
        queue: process.env.TECH_SCOUT_QUEUE === 'true',
      }),
    });
    console.log(`[tech-scout-scheduled] dispatched → HTTP ${r.status}`);
    return { statusCode: 200, body: `dispatched tech-scout-background (HTTP ${r.status})` };
  } catch (e) {
    console.error('[tech-scout-scheduled] dispatch failed:', e.message);
    return { statusCode: 500, body: e.message };
  }
};
