/**
 * generate-plays-scheduled — Netlify SCHEDULED function (daily 10:45 UTC ≈ 6:45am ET).
 *
 * Rebuilds the Play A / Play B / Reconciliation boards the /sales-intelligence
 * page reads, off the Mac (the Mac's morning run was silently no-showing). Runs
 * the SAME shared lib as the CLI (scripts/generate-plays.mjs) with writeCsv=false
 * (no repo-root CSVs on Netlify; the web reads the crm_play_* tables). Scheduled
 * AFTER enrich-replies (10:30) so Play B reflects freshly classified sentiment.
 *
 * REQUIRES SUPABASE env in Netlify. Read-only on source data, NO Anthropic, no
 * Apollo spend. Schedule declared here AND in netlify.toml (see check-schedules).
 */
import { createClient } from '@supabase/supabase-js';
import { generatePlays } from './lib/generate-plays.js';

export const config = { schedule: '45 10 * * *' };

export const handler = async () => {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) { console.error('[generate-plays] missing SUPABASE env'); return { statusCode: 500, body: 'missing SUPABASE env' }; }
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const log = (...a) => console.log('[generate-plays]', ...a);
  try {
    const r = await generatePlays({ sb, writeCsv: false, host: 'netlify', log });
    return { statusCode: 200, body: JSON.stringify(r) };
  } catch (e) {
    console.error('[generate-plays] ERROR:', e.message);
    return { statusCode: 500, body: e.message };
  }
};
