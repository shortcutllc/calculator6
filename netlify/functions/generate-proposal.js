/**
 * Generate Proposal API — main Netlify serverless function handler.
 *
 * Endpoints (single function, routed by method + query params):
 *   POST                          → Create a new proposal
 *   PATCH                         → Edit an existing proposal (operations array)
 *   GET  ?search=<term>           → Search proposals by client name
 *   GET  ?id=<uuid>               → Retrieve a single proposal
 *   POST ?action=calculate        → Reverse calculator (target appointments → options)
 *   GET  ?action=client&name=<n>  → Client lookup from past proposals
 *
 * Auth: Supabase JWT in Authorization header (Bearer token)
 */

import { createClient } from '@supabase/supabase-js';
import { assembleProposal } from './lib/proposal-assembler.js';
import { applyOperations } from './lib/proposal-editor.js';
import { calculateEventOptions } from './lib/reverse-calculator.js';
import { searchClients, getClientByName, searchProposals } from './lib/client-lookup.js';
import { fetchAndStoreLogo, storeProvidedLogo, fetchLogoUrl } from './lib/logo-fetcher.js';
import { notifyProposalCreated, notifyProposalEdited } from './lib/slack-notifier.js';

// --- CORS ---

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS'
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

  // Use VITE_ prefixed vars (existing in Netlify) with fallback to non-prefixed
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw { statusCode: 500, message: 'VITE_SUPABASE_URL not configured', code: 'CONFIG_ERROR' };
  }
  if (!serviceRoleKey) {
    throw { statusCode: 500, message: 'SUPABASE_SERVICE_ROLE_KEY not configured', code: 'CONFIG_ERROR' };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw { statusCode: 401, message: 'Invalid or expired token', code: 'AUTH_INVALID' };
  }

  return { user, supabase };
}

// --- Main Handler ---

export const handler = async (event, context) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  try {
    // Parse query params
    const params = event.queryStringParameters || {};
    const action = params.action;

    // Validate auth for all requests
    const { user, supabase } = await validateAuth(event);

    // Route based on method + action
    switch (event.httpMethod) {
      case 'POST':
        if (action === 'calculate') {
          return await handleCalculate(event);
        }
        return await handleCreate(event, user, supabase);

      case 'PATCH':
        return await handleEdit(event, user, supabase);

      case 'GET':
        if (action === 'client') {
          return await handleClientLookup(params, supabase);
        }
        if (params.search) {
          return await handleSearch(params, supabase);
        }
        if (params.id) {
          return await handleGetById(params, supabase);
        }
        return errorResponse(400, 'GET requires ?search=, ?id=, or ?action=client&name=', 'VALIDATION_ERROR');

      default:
        return errorResponse(405, `Method ${event.httpMethod} not allowed`, 'METHOD_NOT_ALLOWED');
    }
  } catch (err) {
    // Structured errors from auth or validation
    if (err.statusCode && err.code) {
      return errorResponse(err.statusCode, err.message, err.code);
    }
    // Unhandled errors
    console.error('Unhandled error:', err);
    return errorResponse(500, err.message || 'Internal server error', 'INTERNAL_ERROR');
  }
};

// --- POST: Create Proposal ---

async function handleCreate(event, user, supabase) {
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return errorResponse(400, 'Invalid JSON body', 'VALIDATION_ERROR');
  }

  // Validate required fields
  if (!body.clientName) {
    return errorResponse(400, 'clientName is required', 'VALIDATION_ERROR');
  }
  if (!body.events || !Array.isArray(body.events) || body.events.length === 0) {
    return errorResponse(400, 'At least one event is required in the events array', 'VALIDATION_ERROR');
  }

  try {
    // Assemble the proposal data
    const { proposalData, customization, proposalType } = assembleProposal(body);

    // Handle logo: if a URL is provided but not yet stored, store it
    if (body.clientLogoUrl && body.storeLogoCopy !== false) {
      try {
        const { logoUrl, stored } = await storeProvidedLogo(supabase, body.clientLogoUrl, body.clientName);
        if (stored) {
          proposalData.clientLogoUrl = logoUrl;
        }
      } catch (logoErr) {
        console.warn('Logo storage failed, using provided URL:', logoErr.message);
      }
    }

    // Insert into Supabase (matches ProposalContext.tsx createProposal pattern)
    const proposalInsert = {
      data: proposalData,
      customization,
      is_editable: true,
      user_id: user.id,
      status: 'draft',
      pending_review: false,
      has_changes: false,
      original_data: proposalData,
      client_name: proposalData.clientName.trim(),
      client_email: proposalData.clientEmail || body.clientEmail || null,
      client_logo_url: proposalData.clientLogoUrl || body.clientLogoUrl || null,
      notes: body.notes || 'Auto-generated via API',
      proposal_type: proposalType
    };

    const { data: newProposal, error } = await supabase
      .from('proposals')
      .insert(proposalInsert)
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return errorResponse(500, `Failed to create proposal: ${error.message}`, 'DB_INSERT_FAILED');
    }

    // Send Slack notification (non-blocking)
    let slackResult = { slackNotified: false };
    try {
      slackResult = await notifyProposalCreated(newProposal, proposalData);
    } catch (slackErr) {
      console.warn('Slack notification failed:', slackErr.message);
    }

    // Build response
    const proposalUrl = `https://proposals.getshortcut.co/proposal/${newProposal.id}?shared=true`;

    return jsonResponse(201, {
      success: true,
      proposal: {
        id: newProposal.id,
        url: proposalUrl,
        clientName: proposalData.clientName,
        status: 'draft',
        summary: proposalData.summary,
        eventCount: (proposalData.eventDates || []).length,
        locations: proposalData.locations || [],
        eventDates: proposalData.eventDates || [],
        slackNotified: slackResult.slackNotified
      }
    });
  } catch (err) {
    console.error('Create proposal error:', err);
    return errorResponse(422, err.message, 'VALIDATION_ERROR');
  }
}

// --- PATCH: Edit Proposal ---

async function handleEdit(event, user, supabase) {
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return errorResponse(400, 'Invalid JSON body', 'VALIDATION_ERROR');
  }

  if (!body.proposalId) {
    return errorResponse(400, 'proposalId is required', 'VALIDATION_ERROR');
  }
  if (!body.operations || !Array.isArray(body.operations) || body.operations.length === 0) {
    return errorResponse(400, 'At least one operation is required', 'VALIDATION_ERROR');
  }

  try {
    // Fetch the existing proposal
    const { data: existing, error: fetchError } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', body.proposalId)
      .single();

    if (fetchError || !existing) {
      return errorResponse(404, `Proposal ${body.proposalId} not found`, 'NOT_FOUND');
    }

    // Apply operations
    const proposalData = existing.data;
    const customization = existing.customization || {};
    const proposalRecord = {
      status: existing.status,
      client_name: existing.client_name,
      client_email: existing.client_email,
      client_logo_url: existing.client_logo_url
    };

    const { proposalData: updatedData, customization: updatedCustomization, proposalRecord: updatedRecord, changesSummary } =
      applyOperations(proposalData, customization, proposalRecord, body.operations);

    // Build the update object
    const updatePayload = {
      data: updatedData,
      customization: updatedCustomization,
      updated_at: new Date().toISOString(),
      has_changes: true,
      change_source: 'staff'
    };

    // Apply record-level changes (status, client info)
    if (updatedRecord.status !== existing.status) {
      updatePayload.status = updatedRecord.status;
    }
    if (updatedRecord.client_name !== existing.client_name) {
      updatePayload.client_name = updatedRecord.client_name;
    }
    if (updatedRecord.client_email !== existing.client_email) {
      updatePayload.client_email = updatedRecord.client_email;
    }
    if (updatedRecord.client_logo_url !== existing.client_logo_url) {
      updatePayload.client_logo_url = updatedRecord.client_logo_url;
    }

    // Save to Supabase
    const { data: updated, error: updateError } = await supabase
      .from('proposals')
      .update(updatePayload)
      .eq('id', body.proposalId)
      .select()
      .single();

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return errorResponse(500, `Failed to update proposal: ${updateError.message}`, 'DB_UPDATE_FAILED');
    }

    // Send Slack notification (non-blocking)
    let slackResult = { slackNotified: false };
    try {
      slackResult = await notifyProposalEdited(updated, updatedData, changesSummary);
    } catch (slackErr) {
      console.warn('Slack notification failed:', slackErr.message);
    }

    const proposalUrl = `https://proposals.getshortcut.co/proposal/${updated.id}?shared=true`;

    return jsonResponse(200, {
      success: true,
      proposal: {
        id: updated.id,
        url: proposalUrl,
        clientName: updatedData.clientName,
        status: updated.status,
        summary: updatedData.summary,
        eventCount: (updatedData.eventDates || []).length,
        locations: updatedData.locations || [],
        eventDates: updatedData.eventDates || [],
        slackNotified: slackResult.slackNotified
      },
      changesSummary
    });
  } catch (err) {
    console.error('Edit proposal error:', err);
    return errorResponse(422, err.message, 'VALIDATION_ERROR');
  }
}

// --- GET: Search Proposals ---

async function handleSearch(params, supabase) {
  try {
    const { results } = await searchProposals(supabase, params.search);
    return jsonResponse(200, { success: true, results });
  } catch (err) {
    console.error('Search error:', err);
    return errorResponse(500, err.message, 'SEARCH_FAILED');
  }
}

// --- GET: Retrieve Single Proposal ---

async function handleGetById(params, supabase) {
  const { data: proposal, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !proposal) {
    return errorResponse(404, `Proposal ${params.id} not found`, 'NOT_FOUND');
  }

  return jsonResponse(200, {
    success: true,
    proposal: {
      id: proposal.id,
      clientName: proposal.client_name,
      clientEmail: proposal.client_email,
      clientLogoUrl: proposal.client_logo_url,
      status: proposal.status,
      createdAt: proposal.created_at,
      updatedAt: proposal.updated_at,
      proposalType: proposal.proposal_type,
      data: proposal.data,
      customization: proposal.customization,
      isEditable: proposal.is_editable,
      pendingReview: proposal.pending_review,
      hasChanges: proposal.has_changes,
      notes: proposal.notes
    }
  });
}

// --- POST ?action=calculate: Reverse Calculator ---

async function handleCalculate(event) {
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return errorResponse(400, 'Invalid JSON body', 'VALIDATION_ERROR');
  }

  if (!body.serviceType) {
    return errorResponse(400, 'serviceType is required', 'VALIDATION_ERROR');
  }
  if (!body.targetAppointments && body.targetAppointments !== 0) {
    return errorResponse(400, 'targetAppointments is required', 'VALIDATION_ERROR');
  }

  const result = calculateEventOptions(body.serviceType, body.targetAppointments, body.overrides);

  if (!result.success) {
    return errorResponse(422, result.error, result.code || 'CALCULATION_ERROR');
  }

  return jsonResponse(200, result);
}

// --- GET ?action=client: Client Lookup ---

async function handleClientLookup(params, supabase) {
  const clientName = params.name;

  if (!clientName) {
    return errorResponse(400, 'name parameter is required for client lookup', 'VALIDATION_ERROR');
  }

  try {
    // Try exact match first
    const exactResult = await getClientByName(supabase, clientName);

    if (exactResult.found) {
      return jsonResponse(200, {
        success: true,
        found: true,
        client: exactResult.client
      });
    }

    // Fall back to partial search
    const searchResult = await searchClients(supabase, clientName);

    if (searchResult.found && searchResult.results.length > 0) {
      // Return the best match
      return jsonResponse(200, {
        success: true,
        found: true,
        client: searchResult.results[0],
        alternateMatches: searchResult.results.slice(1)
      });
    }

    // Client not found — suggest a logo URL
    let suggestedLogoUrl = null;
    try {
      suggestedLogoUrl = await fetchLogoUrl(clientName);
    } catch (e) {
      // Logo lookup is best-effort
    }

    return jsonResponse(200, {
      success: true,
      found: false,
      client: {
        name: clientName,
        suggestedLogoUrl,
        source: suggestedLogoUrl ? 'web_lookup' : null
      }
    });
  } catch (err) {
    console.error('Client lookup error:', err);
    return errorResponse(500, err.message, 'LOOKUP_FAILED');
  }
}
