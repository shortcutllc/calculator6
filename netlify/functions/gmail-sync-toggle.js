/**
 * gmail-sync-toggle — rep opts in/out of sent-mail crawling.
 *
 * Auth: Supabase JWT. Body { enabled: bool }. When enabling, also stamps
 * last_sent_crawl_at = now so the next scheduled run starts from the opt-in
 * moment (no historical backfill — sent_crawl_enabled is forward-looking by
 * design; a backfill is a separate one-time script if needed).
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

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid JSON body' }); }
  const enabled = !!body.enabled;

  const { data: acct } = await sb.from('gmail_accounts')
    .select('email, sent_crawl_enabled, last_sent_crawl_at')
    .eq('supabase_user_id', user.id).maybeSingle();
  if (!acct) return json(404, { error: 'No Gmail account connected. Connect first.' });

  const patch = { sent_crawl_enabled: enabled, updated_at: new Date().toISOString() };
  if (enabled && !acct.last_sent_crawl_at) patch.last_sent_crawl_at = new Date().toISOString();
  const { error: upErr } = await sb.from('gmail_accounts').update(patch).eq('email', acct.email);
  if (upErr) return json(500, { error: `update failed: ${upErr.message}` });

  return json(200, { success: true, email: acct.email, sent_crawl_enabled: enabled, last_sent_crawl_at: patch.last_sent_crawl_at || acct.last_sent_crawl_at });
};
