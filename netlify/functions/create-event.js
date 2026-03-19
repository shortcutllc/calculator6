/**
 * Create Event API — Netlify serverless function.
 *
 * Accepts admin-reviewed event payloads from the CreateEventModal,
 * validates them, and creates event(s) via the Parse Cloud API.
 *
 * Endpoints:
 *   POST                    → Create event(s) from admin-reviewed payloads
 *   GET  ?proposalId=<uuid> → Check event creation status for a proposal
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

async function callAddEvent(payload) {
  const { PARSE_SERVER_URL, PARSE_APP_ID } = process.env;
  const token = await getSessionToken();

  console.log('addEvent payload:', JSON.stringify(payload, null, 2));

  const res = await fetch(`${PARSE_SERVER_URL}/functions/addEvent`, {
    method: 'POST',
    headers: {
      'X-Parse-Application-Id': PARSE_APP_ID,
      'X-Parse-Session-Token': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseText = await res.text();
  console.log('addEvent response status:', res.status, 'body:', responseText);

  let responseBody;
  try { responseBody = JSON.parse(responseText); } catch { responseBody = { error: responseText }; }

  // Handle expired session — re-auth and retry once
  if (res.status === 209 || res.status === 401) {
    const isSessionError = responseBody.code === 209 || responseBody.error?.toLowerCase().includes('invalid session');
    if (isSessionError) {
      console.warn('Parse session expired, re-authenticating...');
      cachedSessionToken = null;
      const newToken = await parseLogin();

      const retryRes = await fetch(`${PARSE_SERVER_URL}/functions/addEvent`, {
        method: 'POST',
        headers: {
          'X-Parse-Application-Id': PARSE_APP_ID,
          'X-Parse-Session-Token': newToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!retryRes.ok) {
        const retryErr = await retryRes.json().catch(() => ({}));
        throw { statusCode: 502, message: `Parse addEvent failed after re-auth: ${retryErr.error || retryRes.statusText}`, code: 'PARSE_ADD_EVENT_FAILED' };
      }

      return retryRes.json();
    }
  }

  if (!res.ok) {
    throw { statusCode: 502, message: `Parse addEvent failed: ${responseBody.error || res.statusText}`, code: 'PARSE_ADD_EVENT_FAILED' };
  }

  return responseBody;
}

// --- Timezone helpers ---

const PACIFIC_STATES = ['CA', 'WA', 'OR', 'NV'];
const MOUNTAIN_STATES = ['CO', 'AZ', 'UT', 'MT', 'WY', 'NM', 'ID'];
const CENTRAL_STATES = ['IL', 'TX', 'MN', 'WI', 'IA', 'MO', 'AR', 'LA', 'MS', 'AL', 'TN', 'KY', 'IN', 'KS', 'NE', 'SD', 'ND', 'OK'];

function getTimezoneOffset(state) {
  // Coordinator expects positive minutes from UTC (e.g. EST=300, CST=360, MST=420, PST=480)
  if (!state) return 300;
  const s = state.toUpperCase().trim();
  if (PACIFIC_STATES.includes(s)) return 480;
  if (MOUNTAIN_STATES.includes(s)) return 420;
  if (CENTRAL_STATES.includes(s)) return 360;
  return 300; // Eastern default
}

function getTimezoneAbbreviation(state) {
  if (!state) return 'EST';
  const s = state.toUpperCase().trim();
  if (PACIFIC_STATES.includes(s)) return 'PST';
  if (MOUNTAIN_STATES.includes(s)) return 'MST';
  if (CENTRAL_STATES.includes(s)) return 'CST';
  return 'EST';
}

// --- CORS ---

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
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

  return { user, supabase };
}

// --- Transform modal form data to coordinator event payload ---

function transformToCoordinatorPayload(eventForm) {
  // Build ISO date-times from date + time strings
  const startDateTime = new Date(`${eventForm.eventDate}T${eventForm.startTime}:00`);
  const endDateTime = new Date(`${eventForm.eventDate}T${eventForm.endTime}:00`);

  return {
    // Basic info
    name: eventForm.name,
    category: eventForm.category,
    description: eventForm.description || `Event for ${eventForm.name}`,
    mobileEventCode: eventForm.eventCode,
    locationDescription: eventForm.locationName,

    // Address
    address: {
      street: eventForm.address.street,
      unit: eventForm.address.unit || '',
      city: eventForm.address.city,
      state: eventForm.address.state,
      zip: eventForm.address.zip,
      country: eventForm.address.country || 'US',
    },

    // Contact
    contacts: [{
      name: eventForm.contactName,
      phone: eventForm.contactPhone,
      email: eventForm.contactEmail,
    }],

    // Financial
    payment: eventForm.payment,
    barberHourlyRate: eventForm.hourlyRate,
    numBarbersRequired: eventForm.numPros,

    // Services — use the coordinator service IDs selected by the admin
    serviceOfferings: eventForm.services
      .filter(s => s.coordinatorServiceId)
      .map(s => ({
        id: s.coordinatorServiceId,
        serviceTitle: s.coordinatorServiceTitle,
      })),

    // Timing
    startTime: startDateTime.toISOString(),
    endTime: endDateTime.toISOString(),
    lengthPerService: eventForm.lengthPerService,
    signupsPerTimeslot: eventForm.signupsPerTimeslot || 1,

    // Timezone — derive from address state or default to Eastern
    timezoneOffset: eventForm.timezoneOffset || getTimezoneOffset(eventForm.address?.state),
    timezoneAbbreviation: eventForm.timezoneAbbreviation || getTimezoneAbbreviation(eventForm.address?.state),

    // Settings
    isSecret: eventForm.isSecret || false,
    doesNotRequireTimeslots: eventForm.doesNotRequireTimeslots || false,
    sendAutoEmailsManually: eventForm.sendAutoEmailsManually || false,
    allowMultipleReservations: eventForm.allowMultipleReservations || false,
    overrideNameCheck: eventForm.overrideNameCheck || false,
    isTestEvent: eventForm.isTestEvent || false,
    isOutbound: false,

    // Optional fields — match coordinator's exact field names
    legacyName: eventForm.legacyName || undefined,
    eventLinkURL: eventForm.eventLinkURL || null,
    sponsorName: eventForm.sponsorName || undefined,
    managerPassword: eventForm.managerPassword || null,
    staffNotes: eventForm.staffNotes || '',
    adminNotes: eventForm.adminNotes || '',
    delayUntilSpecificDayBefore: null,
    delayUntilNumDaysBefore: null,

    // Logo URL (coordinator expects 'logo' field)
    logo: eventForm.clientLogoUrl || undefined,
  };
}

// --- Create Events ---

async function handleCreateEvents(event, user, supabase) {
  const body = JSON.parse(event.body || '{}');
  const { proposalId, events: eventForms } = body;

  if (!proposalId) {
    return errorResponse(400, 'proposalId is required', 'MISSING_PROPOSAL_ID');
  }

  if (!eventForms || !eventForms.length) {
    return errorResponse(400, 'No events provided', 'NO_EVENTS');
  }

  // Verify proposal exists
  const { data: proposal, error: fetchError } = await supabase
    .from('proposals')
    .select('id, client_name')
    .eq('id', proposalId)
    .single();

  if (fetchError || !proposal) {
    return errorResponse(404, 'Proposal not found', 'PROPOSAL_NOT_FOUND');
  }

  // Transform each admin-reviewed form to coordinator format
  const createdEvents = [];
  for (const eventForm of eventForms) {
    if (!eventForm.included) continue;

    const payload = transformToCoordinatorPayload(eventForm);

    try {
      const parseResult = await callAddEvent(payload);
      const eventId = parseResult?.result?.id || parseResult?.result?.objectId;

      if (!eventId) {
        console.error('Parse addEvent returned no event ID:', parseResult);
        createdEvents.push({
          date: eventForm.eventDate,
          location: eventForm.locationName,
          eventName: eventForm.name,
          status: 'error',
          coordinatorEventId: null,
          error: 'No event ID returned from coordinator',
          createdAt: new Date().toISOString()
        });
        continue;
      }

      createdEvents.push({
        date: eventForm.eventDate,
        location: eventForm.locationName,
        eventName: eventForm.name,
        status: 'created',
        coordinatorEventId: eventId,
        signupUrl: `https://admin.shortcutpros.com/#/signup/${eventId}`,
        createdAt: new Date().toISOString()
      });
    } catch (parseErr) {
      console.error(`Failed to create event "${eventForm.name}":`, parseErr);
      createdEvents.push({
        date: eventForm.eventDate,
        location: eventForm.locationName,
        eventName: eventForm.name,
        status: 'error',
        coordinatorEventId: null,
        error: parseErr.message || 'Failed to create event on coordinator',
        createdAt: new Date().toISOString()
      });
    }
  }

  if (!createdEvents.length) {
    return errorResponse(400, 'No events were included', 'NO_INCLUDED_EVENTS');
  }

  // Store event creation results on the proposal
  const { error: updateError } = await supabase
    .from('proposals')
    .update({
      coordinator_events: createdEvents.map(e => ({
        date: e.date,
        location: e.location,
        eventName: e.eventName,
        status: e.status,
        coordinatorEventId: e.coordinatorEventId,
        signupUrl: e.signupUrl || null,
        error: e.error || null,
        createdAt: e.createdAt
      }))
    })
    .eq('id', proposalId);

  if (updateError) {
    console.error('Failed to update proposal with event data:', updateError);
  }

  return jsonResponse(200, {
    success: true,
    proposalId,
    eventsCreated: createdEvents.length,
    events: createdEvents
  });
}

// --- Get Event Status ---

async function handleGetStatus(event, user, supabase) {
  const params = event.queryStringParameters || {};
  const { proposalId } = params;

  if (!proposalId) {
    return errorResponse(400, 'proposalId query parameter is required', 'MISSING_PROPOSAL_ID');
  }

  const { data: proposal, error } = await supabase
    .from('proposals')
    .select('id, coordinator_events')
    .eq('id', proposalId)
    .single();

  if (error || !proposal) {
    return errorResponse(404, 'Proposal not found', 'PROPOSAL_NOT_FOUND');
  }

  return jsonResponse(200, {
    success: true,
    proposalId,
    events: proposal.coordinator_events || []
  });
}

// --- Handler ---

export const handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  try {
    const { user, supabase } = await validateAuth(event);

    switch (event.httpMethod) {
      case 'POST':
        return await handleCreateEvents(event, user, supabase);
      case 'GET':
        return await handleGetStatus(event, user, supabase);
      default:
        return errorResponse(405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
    }
  } catch (err) {
    if (err.statusCode) {
      return errorResponse(err.statusCode, err.message, err.code);
    }
    console.error('Unhandled error in create-event:', err);
    return errorResponse(500, err.message || 'Internal server error', 'INTERNAL_ERROR');
  }
};
