/**
 * gmail-oauth-disconnect — revoke the rep's Google OAuth grant and clear
 * the token fields on the gmail_accounts row, so they can re-Connect from
 * a clean slate (useful when we add new scopes and the incremental
 * Reconnect flow doesn't surface them).
 *
 * Preserves: email, slack_user_id, tz, digest_enabled, digest_skip_weekends,
 * event_pings_enabled, muted_until, muted_lead_emails — anything that's
 * about preferences, not credentials.
 *
 * Auth: Supabase JWT (Bearer).
 */

import { createClient } from '@supabase/supabase-js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (s, b) => ({ statusCode: s, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(b) });

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader?.startsWith('Bearer ')) return json(401, { error: 'Authorization required' });

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return json(500, { error: 'Server misconfigured' });

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data: { user }, error } = await sb.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !user) return json(401, { error: 'Invalid or expired token' });

  // Look up the rep's gmail_accounts row
  const { data: acct } = await sb.from('gmail_accounts')
    .select('email, refresh_token').eq('supabase_user_id', user.id).maybeSingle();
  if (!acct) return json(404, { error: 'No connected Gmail account on file' });

  // Revoke the refresh token at Google (best-effort — never block disconnect
  // because the revoke call errored. The clear-on-our-side is what matters.)
  if (acct.refresh_token) {
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(acct.refresh_token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    } catch (e) { console.warn('Google revoke failed (non-fatal):', e.message); }
  }

  // Clear the credential fields; keep preferences. Email is kept too so the
  // mapping to slack_user_id survives a reconnect.
  const { error: updErr } = await sb.from('gmail_accounts')
    .update({
      refresh_token: null,
      access_token: null,
      token_expiry: null,
      history_id: null,
      watch_expiration: null,
      // sent_crawl_enabled stays — if the rep re-connects, they keep their prior preference
    })
    .eq('email', acct.email);
  if (updErr) return json(500, { error: `clear failed: ${updErr.message}` });

  return json(200, { ok: true, email: acct.email });
};
