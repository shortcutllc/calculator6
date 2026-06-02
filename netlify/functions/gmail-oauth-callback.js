/**
 * gmail-oauth-callback — Google redirects here with ?code&state.
 *
 * Unauthenticated by nature (Google does the redirect), so trust comes from
 * the HMAC-signed `state` minted by gmail-oauth-start. Exchanges the code,
 * stores the rep's refresh token (service-role table, never exposed to the
 * browser), arms Gmail push, and redirects back to the app.
 */

import { createClient } from '@supabase/supabase-js';
import { exchangeCode, startWatch, lc } from './lib/gmail.js';
import { verifyState } from './gmail-oauth-start.js';

const REDIRECT_URI = 'https://proposals.getshortcut.co/.netlify/functions/gmail-oauth-callback';
const APP_RETURN = 'https://proposals.getshortcut.co/sales-intelligence';
const STATE_MAX_AGE_MS = 10 * 60 * 1000;

const redirect = (status) => ({
  statusCode: 302,
  headers: { Location: `${APP_RETURN}?gmail=${status}` },
  body: '',
});

export const handler = async (event) => {
  const q = event.queryStringParameters || {};
  if (q.error) return redirect('denied');
  if (!q.code || !q.state) return redirect('error');

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return redirect('error');

  const st = verifyState(q.state, key);
  if (!st || !st.uid || !st.ts || Date.now() - st.ts > STATE_MAX_AGE_MS) return redirect('error');

  try {
    const tok = await exchangeCode(q.code, REDIRECT_URI);
    if (!tok.refresh_token) return redirect('noretoken'); // user must revoke + reconnect

    // Identify the mailbox from the access token (Gmail profile).
    const pr = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    });
    const profile = await pr.json();
    const email = lc(profile.emailAddress);
    if (!email) return redirect('error');

    const sb = createClient(url, key, { auth: { persistSession: false } });

    let historyId = null;
    let watchExpiration = null;
    try {
      const w = await startWatch(tok.access_token);
      historyId = w.historyId || null;
      watchExpiration = w.expiration ? new Date(Number(w.expiration)).toISOString() : null;
    } catch (e) {
      // Sending still works without watch; reply tracking just won't arm.
      console.error('gmail watch failed (non-fatal):', e.message);
    }

    // Auto-resolve the rep's Slack user id by email. If the workspace token
    // can find them, the daily digest + event pings work immediately — no
    // manual backfill step. Non-fatal on failure (digest can still be set
    // up later); we don't block the connect on a missing scope.
    let slackUserId = null;
    if (process.env.PRO_SLACK_BOT_TOKEN) {
      try {
        const r = await fetch(`https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`, {
          headers: { Authorization: `Bearer ${process.env.PRO_SLACK_BOT_TOKEN}` },
        });
        const j = await r.json();
        if (j.ok && j.user?.id) slackUserId = j.user.id;
        else console.warn(`Slack lookup for ${email} returned:`, j.error || '(no user)');
      } catch (e) { console.warn('Slack lookup non-fatal:', e.message); }
    }

    const now = new Date().toISOString();
    const upsertPayload = {
      email,
      supabase_user_id: st.uid,
      refresh_token: tok.refresh_token,
      access_token: tok.access_token,
      token_expiry: new Date(Date.now() + (tok.expires_in || 3600) * 1000).toISOString(),
      history_id: historyId,
      watch_expiration: watchExpiration,
      connected_at: now,
      updated_at: now,
    };
    // Only set slack_user_id when the lookup actually returned one. If lookup
    // failed AND a row already exists with a manual slack_user_id (e.g. stub
    // pre-populated by an admin), don't clobber it with null.
    if (slackUserId) upsertPayload.slack_user_id = slackUserId;
    await sb.from('gmail_accounts').upsert(upsertPayload, { onConflict: 'email' });

    return redirect('connected');
  } catch (e) {
    console.error('gmail-oauth-callback error:', e.message);
    return redirect('error');
  }
};
