/**
 * smartlead-pull — Netlify SCHEDULED function (hourly at :25).
 *
 * Machine-independent Smartlead → Supabase reply/send PRESENCE refresh, so reply
 * capture no longer depends on the laptop being awake at 6:05am (Will 2026-07-09: a
 * sleeping Mac missed the local cron and a hot cold reply went uncaptured, costing a
 * graduation). Runs the SAME shared lib as the CLI (scripts/pull-smartlead.mjs).
 * Scans only campaigns launched in the last 3 months. Reply content/sentiment is
 * deferred to enrich-replies.
 *
 * Schedule declared here (config) AND in netlify.toml so the build registers it.
 * REQUIRES `SMARTLEAD_API_KEY` in the Netlify site env (it lived only in the local
 * cron env before this) — without it the run no-ops with a clear error.
 */

import { createClient } from '@supabase/supabase-js';
import { pullSmartlead } from './lib/smartlead-pull.js';
import { stampHeartbeat } from './lib/heartbeat.js';

export const config = { schedule: '25 * * * *' };

export default async () => {
  const apiKey = (process.env.SMARTLEAD_API_KEY || '').trim();
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!apiKey) { console.error('[smartlead-pull] MISSING SMARTLEAD_API_KEY in Netlify env — add it to run this in the cloud'); return new Response('missing SMARTLEAD_API_KEY', { status: 500 }); }
  if (!url || !key) { console.error('[smartlead-pull] missing SUPABASE env'); return new Response('missing SUPABASE env', { status: 500 }); }
  const sb = createClient(url, key, { auth: { persistSession: false } });
  try {
    const r = await pullSmartlead({ sb, apiKey, full: false, days: 30, campaignMonths: 3, log: (...a) => console.log('[smartlead-pull]', ...a) });
    console.log('[smartlead-pull] done', JSON.stringify(r));
    await stampHeartbeat(sb, 'smartlead-pull', { host: 'netlify' });
    return new Response(JSON.stringify(r), { status: 200 });
  } catch (e) {
    console.error('[smartlead-pull] ERROR:', e.message);
    return new Response(e.message, { status: 500 });
  }
};
