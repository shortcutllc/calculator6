/**
 * Calls a Parse cloud function on the Shortcut backend (the coordinator's API) as the
 * admin account in PARSE_ADMIN_USERNAME / PARSE_ADMIN_PASSWORD - the same account
 * create-event.js signs in with. The session token is cached for the life of the
 * function instance and renewed once if Parse says it has expired.
 *
 * Env: PARSE_SERVER_URL (…/parse), PARSE_APP_ID, PARSE_ADMIN_USERNAME, PARSE_ADMIN_PASSWORD.
 * Throws { statusCode, message, code } like the other function libs.
 */

let cachedToken = null;

function parseConfig() {
  const { PARSE_SERVER_URL, PARSE_APP_ID, PARSE_ADMIN_USERNAME, PARSE_ADMIN_PASSWORD } = process.env;
  if (!PARSE_SERVER_URL || !PARSE_APP_ID || !PARSE_ADMIN_USERNAME || !PARSE_ADMIN_PASSWORD) {
    throw { statusCode: 500, message: 'Parse configuration missing', code: 'PARSE_CONFIG_ERROR' };
  }
  return {
    url: PARSE_SERVER_URL.replace(/\/+$/, ''),
    appId: PARSE_APP_ID,
    username: PARSE_ADMIN_USERNAME,
    password: PARSE_ADMIN_PASSWORD,
  };
}

async function logIn() {
  const cfg = parseConfig();
  const res = await fetch(`${cfg.url}/login`, {
    method: 'POST',
    headers: { 'X-Parse-Application-Id': cfg.appId, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: cfg.username, password: cfg.password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.sessionToken) {
    throw { statusCode: 502, message: `Parse login failed: ${body.error || res.statusText}`, code: 'PARSE_LOGIN_FAILED' };
  }
  cachedToken = body.sessionToken;
  return cachedToken;
}

/** The function's `result`, or throws with Parse's own message (the backend's
 *  CloudError text, written for staff to read). */
export async function callParse(name, params = {}) {
  const cfg = parseConfig();
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = cachedToken || (await logIn());
    const res = await fetch(`${cfg.url}/functions/${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: {
        'X-Parse-Application-Id': cfg.appId,
        'X-Parse-Session-Token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) return body.result;
    // 209 = invalid session token: sign in again, once.
    if (body.code === 209 && attempt === 0) {
      cachedToken = null;
      continue;
    }
    throw {
      statusCode: res.status >= 500 ? 502 : 400,
      message: body.error || `${name} failed (${res.status})`,
      code: 'PARSE_FUNCTION_FAILED',
    };
  }
  throw { statusCode: 502, message: `${name} failed after signing in again`, code: 'PARSE_FUNCTION_FAILED' };
}

/** Which backend this talks to, for the dashboard to show (never the credentials). */
export function parseBackendLabel() {
  const url = process.env.PARSE_SERVER_URL || '';
  if (/parse-dev\.|localhost|127\.0\.0\.1/.test(url)) return 'dev';
  return url ? 'live' : 'unset';
}
