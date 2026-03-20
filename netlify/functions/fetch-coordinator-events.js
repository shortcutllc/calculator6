/**
 * Fetch Coordinator Events — Netlify serverless function.
 *
 * Queries the Parse Event class for upcoming (and optionally recent past) events
 * and returns them for display in the Upcoming Events dashboard.
 *
 * Endpoints:
 *   GET  ?scope=upcoming       → Events with startTime >= now (default)
 *   GET  ?scope=all            → All events (upcoming + recent past 30 days)
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
 * Query Parse Event class with automatic session retry on 209.
 */
async function queryEvents(where, limit = 200) {
  const { PARSE_SERVER_URL, PARSE_APP_ID } = process.env;
  const token = await getSessionToken();

  const keys = [
    'objectId', 'name', 'legacyName', 'category', 'status', 'cancelled',
    'startTime', 'endTime', 'timezoneAbbreviation', 'timezoneOffset',
    'address', 'locationDescription',
    'numTotalTimeslots', 'numOpenTimeslots', 'numWaitlistEntries',
    'numBarbersRequired', 'numOpenBarberSpots',
    'serviceOfferings', 'serviceCategories',
    'contactName', 'contactPhone',
    'sponsorName', 'barberHourlyRate', 'barberPaymentAmount', 'serviceCost',
    'paid', 'adminNotes', 'staffNotes',
    'eventLinkURL', 'link', 'logo',
    'barberList',
    'isTestEvent', 'isSecret', 'mobileEventCode',
    'createdAt', 'updatedAt',
  ].join(',');

  async function doFetch(includeBarbers) {
    const params = new URLSearchParams({
      where: JSON.stringify(where),
      keys,
      limit: String(limit),
      order: 'startTime',
    });
    if (includeBarbers) params.set('include', 'barberList');

    const tkn = await getSessionToken();
    const res = await fetch(`${PARSE_SERVER_URL}/classes/Event?${params}`, {
      method: 'GET',
      headers: {
        'X-Parse-Application-Id': PARSE_APP_ID,
        'X-Parse-Session-Token': tkn,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));

      // Session expired — re-auth and retry once
      if (err.code === 209) {
        console.log('Parse session expired, re-authenticating...');
        cachedSessionToken = null;
        const newToken = await parseLogin();

        const retryRes = await fetch(`${PARSE_SERVER_URL}/classes/Event?${params}`, {
          method: 'GET',
          headers: {
            'X-Parse-Application-Id': PARSE_APP_ID,
            'X-Parse-Session-Token': newToken,
            'Content-Type': 'application/json',
          },
        });

        if (!retryRes.ok) {
          const retryErr = await retryRes.json().catch(() => ({}));
          throw { statusCode: 502, message: `Parse query failed after re-auth: ${retryErr.error || retryRes.statusText}` };
        }

        return retryRes.json();
      }

      throw { statusCode: res.status, message: err.error || res.statusText };
    }

    return res.json();
  }

  // Try with barberList included; if a deleted pro breaks the query, retry without
  try {
    return await doFetch(true);
  } catch (err) {
    if (err.message && err.message.includes('Object not found')) {
      console.warn('barberList include failed (deleted pro pointer), retrying without include...');
      return await doFetch(false);
    }
    throw err;
  }
}

/**
 * Transform a Parse Event object into a cleaner shape for the frontend.
 */
function transformEvent(evt) {
  return {
    coordinatorEventId: evt.objectId,
    name: evt.name || evt.legacyName || 'Unnamed Event',
    category: evt.category || null,
    status: evt.cancelled ? 'cancelled' : (evt.status || 'pending'),
    startTime: evt.startTime?.iso || evt.startTime || null,
    endTime: evt.endTime?.iso || evt.endTime || null,
    timezoneAbbreviation: evt.timezoneAbbreviation || null,
    address: evt.address || null,
    locationDescription: evt.locationDescription || null,
    totalSlots: evt.numTotalTimeslots || 0,
    openSlots: evt.numOpenTimeslots || 0,
    filledSlots: (evt.numTotalTimeslots || 0) - (evt.numOpenTimeslots || 0),
    fillPercentage: evt.numTotalTimeslots
      ? Math.round(((evt.numTotalTimeslots - (evt.numOpenTimeslots || 0)) / evt.numTotalTimeslots) * 100)
      : 0,
    waitlistEntries: evt.numWaitlistEntries || 0,
    prosRequired: evt.numBarbersRequired || 0,
    openProSpots: evt.numOpenBarberSpots || 0,
    serviceOfferings: evt.serviceOfferings || [],
    serviceCategories: evt.serviceCategories || [],
    contactName: evt.contactName || null,
    contactPhone: evt.contactPhone || null,
    sponsorName: evt.sponsorName || null,
    proHourlyRate: evt.barberHourlyRate || null,
    proPayment: evt.barberPaymentAmount || null,
    serviceCost: evt.serviceCost || null,
    paid: evt.paid || false,
    adminNotes: evt.adminNotes || null,
    staffNotes: evt.staffNotes || null,
    signupUrl: evt.objectId
      ? `https://admin.shortcutpros.com/#/signup/${evt.objectId}`
      : null,
    eventLinkURL: evt.eventLinkURL || null,
    logoUrl: evt.logo?.url || null,
    pros: (evt.barberList || []).map(barber => ({
      id: barber.objectId || null,
      firstName: barber.firstName || null,
      lastName: barber.lastName || null,
      fullName: barber.fullName || [barber.firstName, barber.lastName].filter(Boolean).join(' ') || 'Unknown',
      proType: barber.proType || null,
      hairProType: barber.hairProType || null,
      active: barber.active ?? null,
    })),
    isTestEvent: evt.isTestEvent || false,
    isSecret: evt.isSecret || false,
    createdAt: evt.createdAt || null,
    updatedAt: evt.updatedAt || null,
  };
}

// --- Handler ---

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // --- Auth ---
  try {
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Missing authorization' }) };
    }

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid token' }) };
    }

    // --- Query Parse ---
    const scope = event.queryStringParameters?.scope || 'upcoming';
    const now = new Date().toISOString();

    let where;
    if (scope === 'all') {
      // Upcoming + last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      where = {
        startTime: { $gte: { __type: 'Date', iso: thirtyDaysAgo } },
      };
    } else {
      // Upcoming only
      where = {
        startTime: { $gte: { __type: 'Date', iso: now } },
      };
    }

    const result = await queryEvents(where);
    const events = (result.results || []).map(transformEvent);

    // Optionally filter out test events unless requested
    const includeTests = event.queryStringParameters?.includeTests === 'true';
    const filtered = includeTests ? events : events.filter(e => !e.isTestEvent);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        events: filtered,
        total: filtered.length,
        syncedAt: now,
      }),
    };
  } catch (err) {
    console.error('fetch-coordinator-events error:', err);
    return {
      statusCode: err.statusCode || 500,
      headers,
      body: JSON.stringify({
        error: err.message || 'Internal server error',
        code: err.code || 'UNKNOWN_ERROR',
      }),
    };
  }
};
