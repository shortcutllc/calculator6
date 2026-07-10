/**
 * founder-reply-graduate-scheduled — hourly (all days) trigger for the founder
 * reply-brain. Scans Will's personal-lane E1 recipients for positive replies,
 * graduates the new ones, and (only if any graduated) kicks graduation-notify to
 * draft the on-spine reply into Will's Gmail + Slack. Runs at :35 so gmail-sent-crawl
 * (:15) has already captured + classified the reply.
 *
 * Reuses the cold lane's drafter — no parallel brain. Schedule declared here AND in
 * netlify.toml (see scripts/check-schedules.mjs).
 */
import { createClient } from '@supabase/supabase-js';
import { graduateFounderReplies } from './lib/founder-reply-graduate.js';

export const config = { schedule: '35 * * * *' };

export const handler = async () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { statusCode: 500, body: 'misconfigured (SUPABASE)' };
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const log = (...a) => console.log('[founder-reply-graduate]', ...a);
  try {
    const res = await graduateFounderReplies({ sb, host: 'netlify', log });
    // Only wake the drafter when we actually graduated someone new.
    if (res.graduated > 0) {
      const base = (process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://proposals.getshortcut.co').replace(/\/$/, '');
      const r = await fetch(`${base}/.netlify/functions/graduation-notify-background`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
      });
      log(`graduated ${res.graduated} → triggered graduation-notify (HTTP ${r.status})`);
    }
    return { statusCode: 200, body: JSON.stringify(res) };
  } catch (e) {
    console.error('[founder-reply-graduate] ERROR:', e.message);
    return { statusCode: 500, body: e.message };
  }
};
