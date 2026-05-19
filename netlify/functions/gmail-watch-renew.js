/**
 * gmail-watch-renew — Netlify SCHEDULED function (daily).
 *
 * Gmail users.watch() expires ~7 days after it is armed. Without re-arming,
 * reply tracking silently stops. This re-arms watch for every connected
 * account once a day and refreshes the stored history_id / watch_expiration.
 *
 * No HTTP auth: Netlify's scheduler invokes it internally. Uses the
 * service-role key (gmail_accounts is service-role only). Best-effort per
 * account — one bad account never blocks the others.
 */

import { createClient } from '@supabase/supabase-js';
import { getAccessToken, startWatch } from './lib/gmail.js';

export const config = { schedule: '0 7 * * *' }; // 07:00 UTC daily

export const handler = async () => {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { statusCode: 500, body: 'misconfigured' };

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data: accounts, error } = await sb.from('gmail_accounts').select('email');
  if (error) return { statusCode: 500, body: `query failed: ${error.message}` };

  const results = [];
  for (const a of accounts || []) {
    try {
      const accessToken = await getAccessToken(sb, a.email);
      const w = await startWatch(accessToken);
      await sb.from('gmail_accounts').update({
        history_id: w.historyId ? String(w.historyId) : undefined,
        watch_expiration: w.expiration ? new Date(Number(w.expiration)).toISOString() : null,
        updated_at: new Date().toISOString(),
      }).eq('email', a.email);
      results.push(`${a.email}:ok`);
    } catch (e) {
      console.error(`watch renew failed for ${a.email}:`, e.message);
      results.push(`${a.email}:err`);
    }
  }

  console.log(`gmail-watch-renew: ${results.join(' ') || 'no accounts'}`);
  return { statusCode: 200, body: results.join(' ') || 'no accounts' };
};
