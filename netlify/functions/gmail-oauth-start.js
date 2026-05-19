/**
 * gmail-oauth-start — returns the Google consent URL for the signed-in rep.
 *
 * Auth: Supabase JWT (Bearer). The rep's identity is signed into `state`
 * (HMAC with the service-role key) so the unauthenticated callback can trust
 * who started the flow. Granting Gmail access is an explicit user action: the
 * frontend opens this URL and the rep clicks through Google's own consent.
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { buildAuthUrl } from './lib/gmail.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (s, b) => ({ statusCode: s, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(b) });

const REDIRECT_URI = 'https://proposals.getshortcut.co/.netlify/functions/gmail-oauth-callback';

export function signState(payload, secret) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyState(state, secret) {
  const [data, sig] = String(state || '').split('.');
  if (!data || !sig) return null;
  const expect = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  if (sig.length !== expect.length
    || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  try { return JSON.parse(Buffer.from(data, 'base64url').toString()); } catch { return null; }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader?.startsWith('Bearer ')) return json(401, { error: 'Authorization required' });

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !process.env.GOOGLE_OAUTH_CLIENT_ID) return json(500, { error: 'Server misconfigured' });

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data: { user }, error } = await sb.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !user) return json(401, { error: 'Invalid or expired token' });

  const state = signState({ uid: user.id, ts: Date.now(), nonce: crypto.randomBytes(8).toString('hex') }, key);
  return json(200, { url: buildAuthUrl(REDIRECT_URI, state) });
};
