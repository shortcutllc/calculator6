/**
 * gmail-status — "is a Gmail account connected, and which one?"
 *
 * Auth: Supabase JWT. Returns ONLY non-sensitive fields (connected flag,
 * the address, watch expiry). Never returns tokens — the gmail_accounts
 * table is service-role only and the browser must never see a refresh token.
 */

import { createClient } from '@supabase/supabase-js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};
const json = (s, b) => ({ statusCode: s, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(b) });

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader?.startsWith('Bearer ')) return json(401, { error: 'Authorization required' });

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return json(500, { error: 'Server misconfigured' });

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data: { user }, error } = await sb.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !user) return json(401, { error: 'Invalid or expired token' });

  // Prefer the account this user connected; fall back to any connected account.
  let { data: acct } = await sb.from('gmail_accounts')
    .select('email, watch_expiration, connected_at')
    .eq('supabase_user_id', user.id).maybeSingle();
  if (!acct) {
    const r = await sb.from('gmail_accounts')
      .select('email, watch_expiration, connected_at')
      .order('connected_at', { ascending: false }).limit(1).maybeSingle();
    acct = r.data || null;
  }

  return json(200, {
    connected: !!acct,
    email: acct?.email || null,
    watch_active: acct?.watch_expiration ? new Date(acct.watch_expiration).getTime() > Date.now() : false,
    connected_at: acct?.connected_at || null,
  });
};
