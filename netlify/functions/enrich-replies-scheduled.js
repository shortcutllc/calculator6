/**
 * enrich-replies-scheduled — Netlify SCHEDULED function (daily 10:30 UTC ≈ 6:30am ET).
 *
 * Machine-independent reply classification + suppression, so a sleeping Mac can
 * no longer leave the day's replies unclassified (which is what silently starved
 * graduate-replies of positives). Runs the SAME shared lib as the CLI
 * (scripts/enrich-replies.mjs). Scheduled BEFORE graduate-replies-scheduled
 * (11:05 UTC) so positives are classified first. On Sundays it also runs the
 * weekly reclassify-all pass, retiring both Mac enrich-replies cron lines.
 *
 * REQUIRES SMARTLEAD_API_KEY + SUPABASE env in Netlify. Rule-based classifier —
 * NO Anthropic. Schedule declared here AND in netlify.toml (see check-schedules).
 */
import { createClient } from '@supabase/supabase-js';
import { enrichReplies } from './lib/enrich-replies.js';

export const config = { schedule: '30 10 * * *' };

export const handler = async () => {
  const sk = (process.env.SMARTLEAD_API_KEY || '').trim();
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!sk) { console.error('[enrich-replies] missing SMARTLEAD_API_KEY'); return { statusCode: 500, body: 'missing SMARTLEAD_API_KEY' }; }
  if (!url || !key) { console.error('[enrich-replies] missing SUPABASE env'); return { statusCode: 500, body: 'missing SUPABASE env' }; }
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const log = (...a) => console.log('[enrich-replies]', ...a);
  try {
    // Daily backfill (this is what feeds graduate-replies).
    const backfill = await enrichReplies({ sb, smartleadKey: sk, reclassifyAll: false, dry: false, host: 'netlify', log });
    // Sunday: also run the weekly reclassify-all maintenance pass.
    let reclassify = null;
    if (new Date().getUTCDay() === 0) {
      reclassify = await enrichReplies({ sb, smartleadKey: sk, reclassifyAll: true, dry: false, host: 'netlify', log });
    }
    return { statusCode: 200, body: JSON.stringify({ backfill, reclassify }) };
  } catch (e) {
    console.error('[enrich-replies] ERROR:', e.message);
    return { statusCode: 500, body: e.message };
  }
};
