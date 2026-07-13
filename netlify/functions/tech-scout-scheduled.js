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
      body: JSON.stringify({ harvest: true, confirm: true, queue: true, maxOrgs: 30, maxBuyers: 5 }),
    });
    console.log(`[tech-scout-scheduled] dispatched → HTTP ${r.status}`);
    return { statusCode: 200, body: `dispatched tech-scout-background (HTTP ${r.status})` };
  } catch (e) {
    console.error('[tech-scout-scheduled] dispatch failed:', e.message);
    return { statusCode: 500, body: e.message };
  }
};
