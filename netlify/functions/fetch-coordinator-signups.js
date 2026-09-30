/**
 * Fetch Coordinator Sign-ups — Netlify serverless function.
 *
 * Pulls the booked timeslots for one coordinator event so the headshot
 * manager can turn each sign-up into an employee gallery.
 *
 * Uses the same cloud function the coordinator's own timeslots page calls
 * (admin.shortcutpros.com/#/timeslots/<eventId>): pullEventReservations_Admin.
 * Each timeslot carries clientFullName / clientEmail / clientPhone plus
 * reserved / cancelled / checkedIn / noShow flags.
 *
 * Endpoints:
 *   GET ?eventId=<parse objectId>   (a full sign-up or timeslots URL also works)
 *
 * Auth: Supabase JWT in Authorization header (Bearer token)
 */

import { createClient } from '@supabase/supabase-js';

// --- Parse Auth (session-level cache) ---

let cachedSessionToken = null;

async function parseLogin() {
  const { PARSE_SERVER_URL, PARSE_APP_ID, PARSE_ADMIN_USERNAME, PARSE_ADMIN_PASSWORD } = process.env;

  if (!PARSE_SERVER_URL || !PARSE_APP_ID || !PARSE_ADMIN_USERNAME || !PARSE_ADMIN_PASSWORD) {
    throw { statusCode: 500, message: 'Parse configuration missing', code: 'PARSE_CONFIG_ERROR' };
  }

  const res = await fetch(`${PARSE_SERVER_URL}/login`, {
    method: 'POST',
    headers: {
      'X-Parse-Application-Id': PARSE_APP_ID,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: PARSE_ADMIN_USERNAME,
      password: PARSE_ADMIN_PASSWORD,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('Parse login failed:', res.status, err);
    throw { statusCode: 502, message: `Parse login failed: ${err.error || res.statusText}`, code: 'PARSE_LOGIN_FAILED' };
  }

  const data = await res.json();
  cachedSessionToken = data.sessionToken;
  return cachedSessionToken;
}

async function getSessionToken() {
  if (cachedSessionToken) return cachedSessionToken;
  return parseLogin();
}

/**
 * Call a Parse cloud function, re-authenticating once on an expired session.
 */
async function runCloudFunction(name, body) {
  const { PARSE_SERVER_URL, PARSE_APP_ID } = process.env;

  async function doFetch(token) {
    const res = await fetch(`${PARSE_SERVER_URL}/functions/${name}`, {
      method: 'POST',
      headers: {
        'X-Parse-Application-Id': PARSE_APP_ID,
        'X-Parse-Session-Token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { error: text }; }
    return { res, json };
  }

  let { res, json } = await doFetch(await getSessionToken());

  const sessionExpired = json.code === 209 || res.status === 209
    || (res.status === 401 && String(json.error || '').toLowerCase().includes('session'));
  if (sessionExpired) {
    console.warn('Parse session expired, re-authenticating...');
    cachedSessionToken = null;
    ({ res, json } = await doFetch(await parseLogin()));
  }

  if (!res.ok) {
    const message = json.error || res.statusText;
    const notFound = json.code === 101 || /not.?found|no event/i.test(String(message));
    throw {
      statusCode: notFound ? 404 : 502,
      message: notFound ? 'No coordinator event with that ID' : `Parse ${name} failed: ${message}`,
      code: notFound ? 'EVENT_NOT_FOUND' : 'PARSE_CLOUD_FAILED',
    };
  }

  return json.result;
}

// --- Helpers ---

/**
 * Accept a bare objectId or any coordinator URL that ends in one, e.g.
 *   https://admin.shortcutpros.com/#/timeslots/S0CrzXFAay
 *   https://admin.shortcutpros.com/#/signup/S0CrzXFAay
 */
function extractEventId(input) {
  const trimmed = String(input || '').trim().replace(/[/?#]+$/, '');
  if (!trimmed) return null;
  const last = trimmed.split(/[/#?=]/).filter(Boolean).pop();
  return /^[A-Za-z0-9]{8,12}$/.test(last || '') ? last : null;
}

function toIso(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value.iso) return value.iso;
  if (value instanceof Date) return value.toISOString();
  return null;
}

function cleanPhone(t) {
  const raw = t.clientPhoneString || t.clientPhone;
  return raw ? String(raw).trim() : null;
}

// --- CORS / responses ---

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}

function errorResponse(statusCode, message, code) {
  return jsonResponse(statusCode, { success: false, error: message, code });
}

// --- Auth ---

async function validateAuth(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw { statusCode: 401, message: 'Authorization header with Bearer token required', code: 'AUTH_MISSING' };
  }

  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw { statusCode: 500, message: 'Supabase configuration missing', code: 'CONFIG_ERROR' };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw { statusCode: 401, message: 'Invalid or expired token', code: 'AUTH_INVALID' };
  }

  return user;
}

// --- Handler ---

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return errorResponse(405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
  }

  try {
    await validateAuth(event);

    const eventId = extractEventId((event.queryStringParameters || {}).eventId);
    if (!eventId) {
      return errorResponse(400, 'Paste a coordinator sign-up link or event ID', 'MISSING_EVENT_ID');
    }

    const result = await runCloudFunction('pullEventReservations_Admin', { eventID: eventId });
    const timeslots = Array.isArray(result?.timeslots) ? result.timeslots : [];

    // Booked = reserved and not cancelled, the same rule the coordinator's page uses.
    const signups = timeslots
      .filter(t => t.reserved && !t.cancelled)
      .map(t => ({
        timeslotId: t.id || t.objectId || null,
        name: String(t.clientFullName || '').trim(),
        email: String(t.clientEmail || '').trim().toLowerCase(),
        phone: cleanPhone(t),
        startTime: toIso(t.startTime),
        checkedIn: !!t.checkedIn,
        noShow: !!t.noShow,
        guests: Array.isArray(t.additionalGuestNames) ? t.additionalGuestNames.filter(Boolean) : [],
        service: t.selectedService?.serviceTitle || null,
      }))
      .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));

    return jsonResponse(200, {
      success: true,
      eventId,
      eventName: result?.name || null,
      timezoneOffset: result?.timezoneOffset ?? null,
      totalTimeslots: timeslots.length,
      signups,
    });
  } catch (err) {
    if (err.statusCode) {
      return errorResponse(err.statusCode, err.message, err.code);
    }
    console.error('Unhandled error in fetch-coordinator-signups:', err);
    return errorResponse(500, err.message || 'Internal server error', 'INTERNAL_ERROR');
  }
};
