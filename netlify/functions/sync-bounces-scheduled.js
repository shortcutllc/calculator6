/**
 * sync-bounces-scheduled — Netlify SCHEDULED function (daily 10:50 UTC ≈ 6:50am ET).
 *
 * Suppresses every Smartlead-BLOCKED lead (hard bounce / unsubscribe / manual
 * block) + marks it invalid + removes it from the campaign, off the Mac. Runs
 * the SAME shared lib as the CLI (scripts/sync-bounces.mjs), confirm + delete,
 * scanning active campaigns.
 *
 * REQUIRES SMARTLEAD_API_KEY + SUPABASE env in Netlify. NO Anthropic. Schedule
 * declared here AND in netlify.toml (see check-schedules).
 */
import { createClient } from '@supabase/supabase-js';
import { syncBounces } from './lib/sync-bounces.js';

export const config = { schedule: '50 10 * * *' };

export const handler = async () => {
  const sk = (process.env.SMARTLEAD_API_KEY || '').trim();
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!sk) { console.error('[sync-bounces] missing SMARTLEAD_API_KEY'); return { statusCode: 500, body: 'missing SMARTLEAD_API_KEY' }; }
  if (!url || !key) { console.error('[sync-bounces] missing SUPABASE env'); return { statusCode: 500, body: 'missing SUPABASE env' }; }
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const log = (...a) => console.log('[sync-bounces]', ...a);
  try {
    const r = await syncBounces({ sb, smartleadKey: sk, confirm: true, del: true, host: 'netlify', log });
    return { statusCode: 200, body: JSON.stringify(r) };
  } catch (e) {
    console.error('[sync-bounces] ERROR:', e.message);
    return { statusCode: 500, body: e.message };
  }
};
