/**
 * founder-reply-reconcile-scheduled — DAILY cleanup (12:20 UTC ≈ 8:20am ET, after the
 * morning crawls). Sweeps Will's mailbox (incl. Trash/Spam) for off-thread founder
 * replies the hourly thread-walk can't see, ingests+classifies them, and branches
 * (graduate positive → on-spine draft, pause OOO, suppress unsub). Only wakes the
 * drafter if it graduated someone. Schedule declared here AND in netlify.toml.
 */
import { createClient } from '@supabase/supabase-js';
import { reconcileFounderReplies } from './lib/founder-reply-reconcile.js';

export const config = { schedule: '20 12 * * *' };

export const handler = async () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { statusCode: 500, body: 'misconfigured (SUPABASE)' };
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const log = (...a) => console.log('[founder-reply-reconcile]', ...a);
  try {
    const res = await reconcileFounderReplies({ sb, host: 'netlify', log });
    if (res.graduated > 0) {
      const base = (process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://proposals.getshortcut.co').replace(/\/$/, '');
      const r = await fetch(`${base}/.netlify/functions/graduation-notify-background`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      log(`graduated ${res.graduated} → triggered graduation-notify (HTTP ${r.status})`);
    }
    return { statusCode: 200, body: JSON.stringify(res) };
  } catch (e) {
    console.error('[founder-reply-reconcile] ERROR:', e.message);
    return { statusCode: 500, body: e.message };
  }
};
