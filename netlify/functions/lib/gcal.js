/**
 * Google Calendar for sponsor page call booking, with no SDK.
 *
 * Ported from the website's intro-call scheduler (shortcut repo,
 * frontend/netlify/functions/lib/gcal.mjs), and it uses the SAME service
 * account: `site-call-booking` in Google Cloud project
 * shortcut-seo-tools-2026, acting AS each host through Workspace domain-wide
 * delegation (admin.google.com → Security → API controls → Domain-wide
 * delegation, client id 113978130422052008607, scopes calendar.events and
 * calendar.freebusy). Acting as the host makes the host the organiser, so
 * Google emails the invite.
 *
 * GOOGLE_CALENDAR_SA_KEY (Netlify env, secret, Functions scope) holds a key
 * of that service account. NOT the whole JSON key file, as the website has:
 * every function here runs in Lambda compatibility mode, where AWS caps ALL
 * of a function's env vars at 4KB together, the site already uses about
 * 2.4KB, and a key file is 2.3KB. So it holds the key packed:
 * `rsa-pq.<key id>.<p>.<q>`, the RSA key's two primes (base64url), which
 * rebuild the whole key and come to about 400 characters. A raw or base64
 * JSON key file is still accepted, for when the functions leave Lambda
 * compatibility mode (Netlify stops accepting it on July 1, 2027).
 * scripts/set-google-calendar-key.mjs creates a key with gcloud, packs it,
 * checks it with Google and sets it here, without printing it. Never print
 * it or commit it.
 *
 * Each call signs a short JWT (RS256, node:crypto), swaps it for an access
 * token for that host, and caches the token for the life of the function
 * instance. GOOGLE_OAUTH_TOKEN_URL and GOOGLE_CALENDAR_API_URL exist only so
 * local tests can point at a mock.
 */
import { createPrivateKey, createSign } from 'node:crypto';

/** The service account, for a packed key (it carries no email). Not secret. */
export const SERVICE_ACCOUNT = 'site-call-booking@shortcut-seo-tools-2026.iam.gserviceaccount.com';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
].join(' ');
const TOKEN_URL = () => process.env.GOOGLE_OAUTH_TOKEN_URL || 'https://oauth2.googleapis.com/token';
const API = () => process.env.GOOGLE_CALENDAR_API_URL || 'https://www.googleapis.com/calendar/v3';
const TIMEOUT_MS = 8000;

/* ── Packed keys: an RSA private key rebuilt from its primes p and q ── */

const big = (b64u) => BigInt(`0x${Buffer.from(b64u, 'base64url').toString('hex') || '0'}`);
const b64u = (n) => {
  let hex = n.toString(16);
  if (hex.length % 2) hex = `0${hex}`;
  return Buffer.from(hex, 'hex').toString('base64url');
};
function modInverse(a, m) {
  let [r0, r1, s0, s1] = [((a % m) + m) % m, m, 1n, 0n];
  while (r1) {
    const q = r0 / r1;
    [r0, r1] = [r1, r0 - q * r1];
    [s0, s1] = [s1, s0 - q * s1];
  }
  if (r0 !== 1n) throw new Error('not invertible');
  return ((s0 % m) + m) % m;
}

/** 'rsa-pq.<kid>.<p>.<q>' → { private_key (PEM), private_key_id }. */
export function unpackKey(packed) {
  const [tag, kid, pS, qS] = String(packed).split('.');
  if (tag !== 'rsa-pq' || !pS || !qS) return null;
  const p = big(pS), q = big(qS), e = 65537n;
  const d = modInverse(e, (p - 1n) * (q - 1n));
  const jwk = {
    kty: 'RSA', e: b64u(e), n: b64u(p * q), d: b64u(d), p: b64u(p), q: b64u(q),
    dp: b64u(d % (p - 1n)), dq: b64u(d % (q - 1n)), qi: b64u(modInverse(q, p)),
  };
  const pem = createPrivateKey({ key: jwk, format: 'jwk' }).export({ type: 'pkcs8', format: 'pem' });
  return { private_key: pem, private_key_id: kid || undefined };
}

/** A key file's PEM → 'rsa-pq.<kid>.<p>.<q>'. For scripts/set-google-calendar-key.mjs. */
export function packKey(pem, kid) {
  const jwk = createPrivateKey(pem).export({ format: 'jwk' });
  return ['rsa-pq', kid || '', jwk.p, jwk.q].join('.');
}

let keyCache;
/** The parsed key, or null when the env var is missing or unreadable. */
export function serviceKey() {
  if (keyCache !== undefined) return keyCache;
  const raw = (process.env.GOOGLE_CALENDAR_SA_KEY || '').trim();
  keyCache = null;
  if (raw.startsWith('rsa-pq.')) {
    try {
      const k = unpackKey(raw);
      if (k) keyCache = { client_email: process.env.GOOGLE_CALENDAR_SA_EMAIL || SERVICE_ACCOUNT, ...k };
    } catch (err) {
      console.error('GOOGLE_CALENDAR_SA_KEY unreadable', err?.message);
    }
    return keyCache;
  }
  for (const text of [raw, raw && Buffer.from(raw, 'base64').toString('utf8')]) {
    try {
      const k = JSON.parse(text);
      if (k?.client_email && k?.private_key) { keyCache = k; break; }
    } catch { /* try the next form */ }
  }
  return keyCache;
}

export const calendarConfigured = () => Boolean(serviceKey());

const b64url = (v) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');

const tokens = new Map(); // host email -> { token, exp }

async function accessToken(host) {
  const hit = tokens.get(host);
  if (hit && hit.exp > Date.now() + 60_000) return hit.token;
  const key = serviceKey();
  if (!key) throw new Error('GOOGLE_CALENDAR_SA_KEY is not set');
  const iat = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url({ alg: 'RS256', typ: 'JWT', kid: key.private_key_id })}.${b64url({
    iss: key.client_email, sub: host, scope: SCOPES, aud: 'https://oauth2.googleapis.com/token', iat, exp: iat + 3600,
  })}`;
  const sig = createSign('RSA-SHA256').update(unsigned).sign(key.private_key).toString('base64url');
  const res = await fetch(TOKEN_URL(), {
    method: 'POST',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${sig}` }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    /* unauthorized_client here means the domain-wide delegation entry is
       missing, has the wrong client id, or lacks one of the two scopes. */
    throw new Error(`token for ${host}: ${data.error || res.status} ${data.error_description || ''}`.trim());
  }
  tokens.set(host, { token: data.access_token, exp: Date.now() + (data.expires_in || 3600) * 1000 });
  return data.access_token;
}

async function call(host, path, body) {
  const res = await fetch(`${API()}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      authorization: `Bearer ${await accessToken(host)}`,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path.split('?')[0]} for ${host}: ${res.status} ${data?.error?.message || ''}`.trim());
  return data;
}

/**
 * The host's own busy times between two instants (ms), as Google returns them:
 * [{ start, end }] ISO strings. Throws if Google reports an error for the
 * calendar, so a calendar we cannot see is never mistaken for an empty one.
 */
export async function freeBusy(host, timeMin, timeMax) {
  const data = await call(host, '/freeBusy', {
    timeMin: new Date(timeMin).toISOString(),
    timeMax: new Date(timeMax).toISOString(),
    items: [{ id: host }],
  });
  const cal = data.calendars?.[host];
  if (!cal || cal.errors?.length) throw new Error(`freeBusy for ${host}: ${cal?.errors?.[0]?.reason || 'no calendar'}`);
  return cal.busy || [];
}

/**
 * Events on the host's primary calendar that carry a private extended
 * property `key=value` and end after `timeMin` (ms). The booking limits are
 * kept this way, on the calendar itself, so there is no store to run.
 */
export async function eventsWithProperty(host, key, value, timeMin) {
  const q = new URLSearchParams({
    privateExtendedProperty: `${key}=${value}`,
    timeMin: new Date(timeMin).toISOString(),
    singleEvents: 'true',
    maxResults: '20',
  });
  const data = await call(host, `/calendars/primary/events?${q}`);
  return (data.items || []).filter((e) => e.status !== 'cancelled');
}

/**
 * Create an event on the host's primary calendar with a Google Meet link, and
 * have Google email the invite to every attendee.
 */
export async function insertEvent(host, event) {
  return call(host, '/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all', event);
}
