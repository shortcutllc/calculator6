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
        price: s.price || undefined,
      })),

    // Service categories — derived from service type mapping
    serviceCategories: [...new Set(
      (eventForm.services || [])
        .filter(s => s.coordinatorServiceType)
        .map(s => s.coordinatorServiceType)
    )],

    // Timing
    startTime: startDateTime.toISOString(),
    endTime: endDateTime.toISOString(),
    lengthPerService: eventForm.lengthPerService,
    signupsPerTimeslot: eventForm.signupsPerTimeslot || 1,

    // Financial (optional)
    taxRate: eventForm.taxRate ? parseFloat(eventForm.taxRate) : undefined,

    // Settings
    isSecret: eventForm.isSecret || false,
    doesNotRequireTimeslots: eventForm.doesNotRequireTimeslots || false,
    sendAutoEmailsManually: eventForm.sendAutoEmailsManually || false,
    allowMultipleReservations: eventForm.allowMultipleReservations || false,
    overrideNameCheck: eventForm.overrideNameCheck || false,
    isTestEvent: eventForm.isTestEvent || false,
    isOutbound: false,

    // Optional fields
    legacyName: eventForm.legacyName || undefined,
    eventLinkURL: eventForm.eventLinkURL || undefined,
    sponsorName: eventForm.sponsorName || undefined,
    managerPassword: eventForm.managerPassword || undefined,
    staffNotes: eventForm.staffNotes || undefined,
    adminNotes: eventForm.adminNotes || undefined,

    // Logo URL from proposal (Parse cloud function will download and save via Parse Files)
    clientLogoUrl: eventForm.clientLogoUrl || undefined,
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

    // TODO: Call Parse Cloud Function to create each event
    // When Parse is plugged in, replace this block:
    //
    // const parseResponse = await fetch(process.env.PARSE_SERVER_URL + '/functions/addEvent', {
    //   method: 'POST',
    //   headers: {
    //     'X-Parse-Application-Id': process.env.PARSE_APP_ID,
    //     'X-Parse-REST-API-Key': process.env.PARSE_REST_API_KEY,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify(payload)
    // });
    // const parseResult = await parseResponse.json();
    //
    // For now, store the payload as pending:
    createdEvents.push({
      date: eventForm.eventDate,
      location: eventForm.locationName,
      eventName: eventForm.name,
      status: 'pending_parse_integration',
      coordinatorEventId: null,
      payload,
      createdAt: new Date().toISOString()
    });
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
