/**
 * graduate-replies-scheduled — Netlify SCHEDULED function (daily 11:05 UTC ≈ 7:05am ET).
 *
 * Machine-independent graduation of positive cold replies, so it no longer
 * depends on Will's Mac being awake (a sleeping Mac already cost a graduation).
 * Runs the SAME shared lib as the CLI (scripts/graduate-replies.mjs) with
 * confirm + research + notify on, exactly like the retiring local cron
 * (`graduate-replies.mjs --research --confirm --notify`).
 *
 * Depends on enrich-replies having classified the day's replies first; keep this
 * scheduled AFTER that job. REQUIRES SMARTLEAD_API_KEY in the Netlify env (for
 * --research owner lookup); without it, research is skipped (owners still resolve
 * from outreach_sends). The openclaw smartlead_cache.json is not available here,
 * so owner resolution leans on outreach_sends + live research (fully recovers it).
 *
 * Schedule declared here AND in netlify.toml (see check-schedules.mjs).
 */
import { createClient } from '@supabase/supabase-js';
import { graduateReplies } from './lib/graduate-replies.js';

export const config = { schedule: '5 11 * * *' };

export const handler = async () => {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) { console.error('[graduate-replies] missing SUPABASE env'); return { statusCode: 500, body: 'missing SUPABASE env' }; }
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const notifyUrl = (process.env.GRADUATION_NOTIFY_URL || 'https://proposals.getshortcut.co/.netlify/functions/graduation-notify-background').trim();
  try {
    const r = await graduateReplies({
      sb,
      smartleadKey: (process.env.SMARTLEAD_API_KEY || '').trim(),
      cache: {},
      confirm: true, research: true, notify: true,
      notifyUrl, host: 'netlify',
      log: (...a) => console.log('[graduate-replies]', ...a),
    });
    return { statusCode: 200, body: JSON.stringify(r) };
  } catch (e) {
    console.error('[graduate-replies] ERROR:', e.message);
    return { statusCode: 500, body: e.message };
  }
};
