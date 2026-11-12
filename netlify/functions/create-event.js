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
import { eventInstants, fallbackTimezone, wallClockToDate } from './lib/event-time.js';

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

/** POST a Parse cloud function as the admin, re-logging in once if the session expired. */
async function callParseFunction(name, payload) {
  const { PARSE_SERVER_URL, PARSE_APP_ID } = process.env;

  const post = (token) => fetch(`${PARSE_SERVER_URL}/functions/${name}`, {
    method: 'POST',
    headers: {
      'X-Parse-Application-Id': PARSE_APP_ID,
      'X-Parse-Session-Token': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  let res = await post(await getSessionToken());
  let responseText = await res.text();
  let responseBody;
  try { responseBody = JSON.parse(responseText); } catch { responseBody = { error: responseText }; }

  // Handle expired session — re-auth and retry once
  const isSessionError = (res.status === 209 || res.status === 401 || res.status === 400) &&
    (responseBody.code === 209 || String(responseBody.error || '').toLowerCase().includes('invalid session'));
  if (isSessionError) {
    console.warn('Parse session expired, re-authenticating...');
    cachedSessionToken = null;
    res = await post(await parseLogin());
    responseText = await res.text();
    try { responseBody = JSON.parse(responseText); } catch { responseBody = { error: responseText }; }
  }

  if (!res.ok) {
    throw { statusCode: 502, message: `Parse ${name} failed: ${responseBody.error || res.statusText}`, code: 'PARSE_FUNCTION_FAILED' };
  }
  return responseBody;
}

async function callAddEvent(payload) {
  console.log('addEvent payload:', JSON.stringify(payload, null, 2));
  const body = await callParseFunction('addEvent', payload);
  console.log('addEvent response:', JSON.stringify(body));
  return body;
}

// --- Timezone ---

/**
 * The office's offset and abbreviation on the event's day, the way the
 * coordinator's Add Event form gets them: Parse's timezoneInfoForAddress, which
 * geocodes the address. Falls back to the state's zone (lib/event-time.js).
 */
async function resolveTimezone(eventForm) {
  try {
    const { result } = await callParseFunction('timezoneInfoForAddress', {
      address: eventForm.address,
      apptDate: { __type: 'Date', iso: wallClockToDate(eventForm.eventDate, eventForm.startTime, 0).toISOString() },
    });
    if (result && Number.isFinite(result.timezoneOffset) && result.abbreviation) {
      return { timezoneOffset: result.timezoneOffset, timezoneAbbreviation: result.abbreviation };
    }
    console.warn('timezoneInfoForAddress returned no offset, using the state fallback:', result);
  } catch (err) {
    console.warn('timezoneInfoForAddress failed, using the state fallback:', err.message || err);
  }
  const fb = fallbackTimezone(eventForm.address?.state, eventForm.eventDate, eventForm.startTime);
  return { timezoneOffset: fb.timezoneOffset, timezoneAbbreviation: fb.abbreviation };
}

// --- CORS ---

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

function jsonResponse(statusCode, body) {
  return new Response(JSON.stringify(body), { status: statusCode, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
}

function errorResponse(statusCode, message, code) {
  return jsonResponse(statusCode, { success: false, error: message, code });
}

// --- Auth ---

async function validateAuth(req) {
  const authHeader = req.headers.get('authorization');
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

// Optional text: trimmed, or undefined so the coordinator keeps its automatic text.
const optionalText = (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

function transformToCoordinatorPayload(eventForm, tz) {
  // The times are the office's wall clock; turn them into real instants with
  // the office's offset on that day (see lib/event-time.js for the old bug).
  const { start, end } = eventInstants(eventForm.eventDate, eventForm.startTime, eventForm.endTime, tz.timezoneOffset);
  const groupClass = eventForm.groupClass === true;
  const taxRate = parseFloat(eventForm.taxRate);

  return {
    // Basic info
    name: eventForm.name,
    category: eventForm.category,
    description: eventForm.description || `Event for ${eventForm.name}`,
    mobileEventCode: eventForm.eventCode,
    // The room on site; blank (or an older modal build without the field) falls
    // back to the proposal's location label, as before.
    locationDescription: (eventForm.locationDescription || '').trim() || eventForm.locationName,

    // Page copy, like the coordinator's Add Event form. Blank keeps the
    // automatic text; the list-page title and intro apply to every event with
    // this code (addEvent only copies them across when they are not blank).
    signupTitle: optionalText(eventForm.signupTitle),
    signupHeadline: optionalText(eventForm.signupHeadline),
    seriesIntro: optionalText(eventForm.seriesIntro),
    applyToSeries: true,
    attendeeInstructions: optionalText(eventForm.attendeeInstructions),
    confirmationSubject: optionalText(eventForm.confirmationSubject),

    // Who books and how
    enableGuests: eventForm.enableGuests === true,
    maxGuests: eventForm.enableGuests === true ? (parseInt(eventForm.maxGuests, 10) || 0) : 0,
    optionalContact: eventForm.optionalContact === true,

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
    taxRate: Number.isFinite(taxRate) ? taxRate : undefined,

    // Services — use the coordinator service IDs selected by the admin
    serviceOfferings: eventForm.services
      .filter(s => s.coordinatorServiceId)
      .map(s => ({
        id: s.coordinatorServiceId,
        serviceTitle: s.coordinatorServiceTitle,
      })),

    // Timing — Parse Cloud Functions expect Date objects in {__type, iso} format
    startTime: { __type: 'Date', iso: start.toISOString() },
    endTime: { __type: 'Date', iso: end.toISOString() },
    lengthPerService: eventForm.lengthPerService,
    // Group class: several people book each time (a sound bath, a yoga class).
    signupsPerTimeslot: groupClass ? Math.min(500, Math.max(2, parseInt(eventForm.signupsPerTimeslot, 10) || 2)) : 1,

    timezoneOffset: tz.timezoneOffset,
    timezoneAbbreviation: tz.timezoneAbbreviation,

    // Settings
    isSecret: eventForm.isSecret || false,
    doesNotRequireTimeslots: eventForm.doesNotRequireTimeslots || false,
    sendAutoEmailsManually: eventForm.sendAutoEmailsManually || false,
    // Both default ON, like the coordinator's Add Event form: only an explicit
    // false (the admin unticked the box) turns them off. With multiple
    // reservations off, an attendee can book one event in the whole series.
    // The backend reads a missing oneReservationPerEvent as false.
    allowMultipleReservations: eventForm.allowMultipleReservations !== false,
    oneReservationPerEvent: eventForm.oneReservationPerEvent !== false,
    overrideNameCheck: eventForm.overrideNameCheck || false,
    isTestEvent: eventForm.isTestEvent || false,
    isOutbound: false,

    // Optional fields — match coordinator's exact field names
    legacyName: eventForm.legacyName || '',
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

async function handleCreateEvents(req, user, supabase) {
  const body = JSON.parse((await req.text()) || '{}');
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

    try {
      const payload = transformToCoordinatorPayload(eventForm, await resolveTimezone(eventForm));
      const parseResult = await callAddEvent(payload);
      // Parse returns { result: "eventId" } — result is the ID string directly
      const eventId = typeof parseResult?.result === 'string'
        ? parseResult.result
        : parseResult?.result?.id || parseResult?.result?.objectId;

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

async function handleGetStatus(req, user, supabase) {
  const params = Object.fromEntries(new URL(req.url).searchParams);
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

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  try {
    const { user, supabase } = await validateAuth(req);

    switch (req.method) {
      case 'POST':
        return await handleCreateEvents(req, user, supabase);
      case 'GET':
        return await handleGetStatus(req, user, supabase);
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
