/**
 * Create Event API — Netlify serverless function.
 *
 * Accepts admin-reviewed event payloads from the CreateEventModal,
 * validates them, and creates event(s) via the Parse Cloud API. The payload, the
 * timezone and the record on the proposal are lib/coordinator-events.js, shared with
 * the AI's create_signup_link tool.
 *
 * Endpoints:
 *   POST                    → Create event(s) from admin-reviewed payloads
 *   GET  ?proposalId=<uuid> → Check event creation status for a proposal
 *
 * Auth: Supabase JWT in Authorization header (Bearer token)
 */

import { createClient } from '@supabase/supabase-js';
import {
  addCoordinatorEvent,
  eventLinks,
  recordOnProposal,
  resolveTimezone,
  transformToCoordinatorPayload,
} from './lib/coordinator-events.js';

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
      console.log('addEvent payload:', JSON.stringify(payload, null, 2));
      const eventId = await addCoordinatorEvent(payload);
      console.log('addEvent created:', eventId);

      createdEvents.push({
        date: eventForm.eventDate,
        location: eventForm.locationName,
        eventName: eventForm.name,
        status: 'created',
        coordinatorEventId: eventId,
        signupUrl: eventLinks(eventId, eventForm.eventCode).signupUrl,
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

  // Add them to the proposal's record (alongside any made before, never replacing them).
  await recordOnProposal(supabase, proposalId, createdEvents.map(e => ({
    date: e.date,
    location: e.location,
    eventName: e.eventName,
    status: e.status,
    coordinatorEventId: e.coordinatorEventId,
    signupUrl: e.signupUrl || null,
    error: e.error || null,
    createdAt: e.createdAt
  })));

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
