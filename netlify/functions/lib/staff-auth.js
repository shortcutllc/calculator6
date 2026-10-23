/**
 * Who is calling: the one auth check for the API (generate-proposal.js) and
 * the MCP endpoint (mcp.js). See docs/AI_INTEGRATION.md.
 *
 * Two credentials work, both sent as `Authorization: Bearer <token>`:
 *   - a personal API key (sk_shortcut_...), issued by scripts/api-keys.mjs
 *     and stored as a SHA-256 in `staff_api_keys`. This is what a teammate's
 *     AI holds: it lasts until revoked.
 *   - a Supabase sign-in token (a JWT), what the staff app sends. It expires
 *     after an hour.
 *
 * Either way the caller acts as that teammate: their user id goes on what
 * they create. The service role key never leaves the server.
 *
 * Email signup is open with autoconfirm on, so a valid sign-in token proves
 * only that someone signed up. API keys are issued by hand, so a key is the
 * stronger check. Closing signup closes the gap for tokens.
 */
import { createHash, randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

export const API_KEY_PREFIX = 'sk_shortcut_';

export const hashApiKey = (key) => createHash('sha256').update(String(key)).digest('hex');

/** A new key, its hash, and the prefix shown in lists. */
export function newApiKey() {
  const key = API_KEY_PREFIX + randomBytes(24).toString('base64url');
  return { key, hash: hashApiKey(key), prefix: key.slice(0, API_KEY_PREFIX.length + 6) };
}

const authError = (statusCode, message, code) => ({ statusCode, message, code });

export function serviceClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw authError(500, 'VITE_SUPABASE_URL not configured', 'CONFIG_ERROR');
  if (!key) throw authError(500, 'SUPABASE_SERVICE_ROLE_KEY not configured', 'CONFIG_ERROR');
  return createClient(url, key, { auth: { persistSession: false } });
}

/** The bearer token, or with `allowQueryKey` a `?key=` for MCP clients that
 *  only take a URL. */
function tokenFrom(req, allowQueryKey) {
  const header = req.headers.get('authorization') || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  if (allowQueryKey) return (new URL(req.url).searchParams.get('key') || '').trim();
  return '';
}

/**
 * { user, supabase, via } for a valid key or token, where supabase is the
 * service-role client. Throws { statusCode, message, code } otherwise.
 */
export async function authenticate(req, { allowQueryKey = false } = {}) {
  const token = tokenFrom(req, allowQueryKey);
  if (!token) {
    throw authError(401, 'Send an API key or a staff sign-in token: Authorization: Bearer <token>', 'AUTH_MISSING');
  }
  const supabase = serviceClient();

  if (token.startsWith(API_KEY_PREFIX)) {
    return { user: await userForKey(supabase, token), supabase, via: 'api_key' };
  }

  const { data: { user } = {}, error } = await supabase.auth.getUser(token);
  if (error || !user) throw authError(401, 'Invalid or expired token', 'AUTH_INVALID');
  return { user, supabase, via: 'session' };
}

async function userForKey(supabase, key) {
  const { data: row, error } = await supabase
    .from('staff_api_keys')
    .select('id, user_id, revoked_at')
    .eq('key_hash', hashApiKey(key))
    .maybeSingle();
  if (error) {
    const missing = error.code === '42P01' || error.code === 'PGRST205' || /does not exist|could not find/i.test(error.message || '');
    if (missing) throw authError(503, 'API keys are not set up yet: the staff_api_keys migration has not been applied', 'KEYS_NOT_SET_UP');
    console.error('api key lookup', error.message);
    throw authError(500, 'Could not check the API key', 'AUTH_ERROR');
  }
  if (!row || row.revoked_at) throw authError(401, 'This API key is not valid or has been revoked', 'AUTH_INVALID');

  const { data: { user } = {}, error: userError } = await supabase.auth.admin.getUserById(row.user_id);
  if (userError || !user) throw authError(401, 'The teammate this key belongs to no longer exists', 'AUTH_INVALID');

  // A failed stamp never blocks the call.
  const { error: stampError } = await supabase
    .from('staff_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', row.id);
  if (stampError) console.warn('api key last_used_at', stampError.message);

  return user;
}
