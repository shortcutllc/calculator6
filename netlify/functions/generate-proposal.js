/**
 * Generate Proposal API — main Netlify serverless function handler.
 *
 * Endpoints (single function, routed by method + query params):
 *
 *   PROPOSALS:
 *   POST                              → Create a new proposal
 *   PATCH                             → Edit an existing proposal (operations array)
 *   GET  ?search=<term>               → Search proposals by client name
 *   GET  ?id=<uuid>                   → Retrieve a single proposal
 *   POST ?action=calculate            → Reverse calculator (target appointments → options)
 *   GET  ?action=client&name=<n>      → Client lookup from past proposals
 *   POST ?action=duplicate            → Duplicate an existing proposal
 *
 *   PROPOSAL LINKING (GROUPS):
 *   POST ?action=create-option        → Create a new option (duplicate into group)
 *   POST ?action=link                 → Link existing proposals into a group
 *   POST ?action=unlink               → Remove a proposal from its group
 *   POST ?action=rename-option        → Rename an option
 *   POST ?action=reorder-option       → Reorder an option
 *   GET  ?action=group-options&id=<>  → Get all options in a group
 *
 *   LANDING PAGES:
 *   POST ?action=create-landing-page  → Create a generic landing page
 *   PATCH ?action=update-landing-page → Update a landing page
 *   GET  ?action=landing-page&id=<>   → Get a landing page by ID
 *   GET  ?action=search-landing-pages&search=<> → Search landing pages
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
import { duplicateProposal } from './lib/proposal-duplicator.js';
import { createOption, linkProposals, unlinkProposal, renameOption, reorderOption, getGroupOptions } from './lib/proposal-linker.js';
import { createLandingPage, updateLandingPage, getLandingPage, searchLandingPages } from './lib/landing-page-assembler.js';

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

// --- Helper: Parse JSON body ---

function parseBody(event) {
  try {
    return JSON.parse(event.body);
  } catch (e) {
    return null;
  }
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
        if (action === 'calculate') return await handleCalculate(event);
        if (action === 'duplicate') return await handleDuplicate(event, user, supabase);
        if (action === 'create-option') return await handleCreateOption(event, user, supabase);
        if (action === 'link') return await handleLink(event, supabase);
        if (action === 'unlink') return await handleUnlink(event, supabase);
        if (action === 'rename-option') return await handleRenameOption(event, supabase);
        if (action === 'reorder-option') return await handleReorderOption(event, supabase);
        if (action === 'create-landing-page') return await handleCreateLandingPage(event, user, supabase);
        return await handleCreate(event, user, supabase);

      case 'PATCH':
        if (action === 'update-landing-page') return await handleUpdateLandingPage(event, supabase);
        return await handleEdit(event, user, supabase);

      case 'GET':
        if (action === 'client') return await handleClientLookup(params, supabase);
        if (action === 'group-options') return await handleGetGroupOptions(params, supabase);
        if (action === 'landing-page') return await handleGetLandingPage(params, supabase);
        if (action === 'search-landing-pages') return await handleSearchLandingPages(params, supabase);
        if (params.search) return await handleSearch(params, supabase);
        if (params.id) return await handleGetById(params, supabase);
        return errorResponse(400, 'GET requires ?search=, ?id=, or a valid ?action=', 'VALIDATION_ERROR');

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

// ============================================================
// PROPOSAL HANDLERS
// ============================================================

// --- POST: Create Proposal ---

async function handleCreate(event, user, supabase) {
  const body = parseBody(event);
  if (!body) return errorResponse(400, 'Invalid JSON body', 'VALIDATION_ERROR');

  if (!body.clientName) {
    return errorResponse(400, 'clientName is required', 'VALIDATION_ERROR');
  }
  if (!body.events || !Array.isArray(body.events) || body.events.length === 0) {
    return errorResponse(400, 'At least one event is required in the events array', 'VALIDATION_ERROR');
  }

  try {
    const { proposalData, customization, proposalType } = assembleProposal(body);

    // Handle logo storage
    if (body.clientLogoUrl && body.storeLogoCopy !== false) {
      try {
        const { logoUrl, stored } = await storeProvidedLogo(supabase, body.clientLogoUrl, body.clientName);
        if (stored) proposalData.clientLogoUrl = logoUrl;
      } catch (logoErr) {
        console.warn('Logo storage failed, using provided URL:', logoErr.message);
      }
    }

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

    // Slack notification (non-blocking)
    let slackResult = { slackNotified: false };
    try {
      slackResult = await notifyProposalCreated(newProposal, proposalData);
    } catch (slackErr) {
      console.warn('Slack notification failed:', slackErr.message);
    }

    const proposalUrl = newProposal.slug
      ? `https://proposals.getshortcut.co/p/${newProposal.slug}`
      : `https://proposals.getshortcut.co/proposal/${newProposal.id}?shared=true`;

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
  const body = parseBody(event);
  if (!body) return errorResponse(400, 'Invalid JSON body', 'VALIDATION_ERROR');

  if (!body.proposalId) {
    return errorResponse(400, 'proposalId is required', 'VALIDATION_ERROR');
  }
  if (!body.operations || !Array.isArray(body.operations) || body.operations.length === 0) {
    return errorResponse(400, 'At least one operation is required', 'VALIDATION_ERROR');
  }

  try {
    const { data: existing, error: fetchError } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', body.proposalId)
      .single();

    if (fetchError || !existing) {
      return errorResponse(404, `Proposal ${body.proposalId} not found`, 'NOT_FOUND');
    }

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

    const updatePayload = {
      data: updatedData,
      customization: updatedCustomization,
      updated_at: new Date().toISOString(),
      has_changes: true,
      change_source: 'staff'
    };

    if (updatedRecord.status !== existing.status) updatePayload.status = updatedRecord.status;
    if (updatedRecord.client_name !== existing.client_name) updatePayload.client_name = updatedRecord.client_name;
    if (updatedRecord.client_email !== existing.client_email) updatePayload.client_email = updatedRecord.client_email;
    if (updatedRecord.client_logo_url !== existing.client_logo_url) updatePayload.client_logo_url = updatedRecord.client_logo_url;

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

    let slackResult = { slackNotified: false };
    try {
      slackResult = await notifyProposalEdited(updated, updatedData, changesSummary);
    } catch (slackErr) {
      console.warn('Slack notification failed:', slackErr.message);
    }

    const proposalUrl = updated.slug
      ? `https://proposals.getshortcut.co/p/${updated.slug}`
      : `https://proposals.getshortcut.co/proposal/${updated.id}?shared=true`;

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

// --- POST ?action=duplicate: Duplicate Proposal ---

async function handleDuplicate(event, user, supabase) {
  const body = parseBody(event);
  if (!body) return errorResponse(400, 'Invalid JSON body', 'VALIDATION_ERROR');

  if (!body.proposalId) {
    return errorResponse(400, 'proposalId is required', 'VALIDATION_ERROR');
  }

  try {
    const { proposal, url } = await duplicateProposal(supabase, body.proposalId, user.id, {
      newTitle: body.newTitle,
      notes: body.notes,
      recalculate: body.recalculate || false
    });

    // Slack notification
    let slackResult = { slackNotified: false };
    try {
      slackResult = await notifyProposalCreated(proposal, proposal.data);
    } catch (slackErr) {
      console.warn('Slack notification failed:', slackErr.message);
    }

    return jsonResponse(201, {
      success: true,
      proposal: {
        id: proposal.id,
        url,
        clientName: proposal.client_name,
        status: proposal.status,
        summary: proposal.data?.summary || null,
        duplicatedFrom: body.proposalId,
        slackNotified: slackResult.slackNotified
      }
    });
  } catch (err) {
    console.error('Duplicate proposal error:', err);
    return errorResponse(422, err.message, 'DUPLICATE_FAILED');
  }
}

// ============================================================
// PROPOSAL LINKING HANDLERS
// ============================================================

// --- POST ?action=create-option ---

async function handleCreateOption(event, user, supabase) {
  const body = parseBody(event);
  if (!body) return errorResponse(400, 'Invalid JSON body', 'VALIDATION_ERROR');

  if (!body.proposalId) {
    return errorResponse(400, 'proposalId is required', 'VALIDATION_ERROR');
  }

  try {
    const result = await createOption(supabase, body.proposalId, user.id, {
      optionName: body.optionName
    });

    return jsonResponse(201, {
      success: true,
      newProposal: {
        id: result.newProposal.id,
        url: result.url,
        clientName: result.newProposal.client_name,
        optionName: result.newProposal.option_name,
        optionOrder: result.newProposal.option_order
      },
      groupId: result.groupId,
      optionCount: result.optionCount
    });
  } catch (err) {
    console.error('Create option error:', err);
    return errorResponse(422, err.message, 'CREATE_OPTION_FAILED');
  }
}

// --- POST ?action=link ---

async function handleLink(event, supabase) {
  const body = parseBody(event);
  if (!body) return errorResponse(400, 'Invalid JSON body', 'VALIDATION_ERROR');

  if (!body.sourceProposalId) {
    return errorResponse(400, 'sourceProposalId is required', 'VALIDATION_ERROR');
  }
  if (!body.proposalIds || !Array.isArray(body.proposalIds) || body.proposalIds.length === 0) {
    return errorResponse(400, 'proposalIds array is required', 'VALIDATION_ERROR');
  }

  try {
    const result = await linkProposals(supabase, body.sourceProposalId, body.proposalIds);

    return jsonResponse(200, {
      success: true,
      groupId: result.groupId,
      linkedCount: result.linkedCount,
      options: result.options
    });
  } catch (err) {
    console.error('Link proposals error:', err);
    return errorResponse(422, err.message, 'LINK_FAILED');
  }
}

// --- POST ?action=unlink ---

async function handleUnlink(event, supabase) {
  const body = parseBody(event);
  if (!body) return errorResponse(400, 'Invalid JSON body', 'VALIDATION_ERROR');

  if (!body.proposalId) {
    return errorResponse(400, 'proposalId is required', 'VALIDATION_ERROR');
  }

  try {
    const result = await unlinkProposal(supabase, body.proposalId);

    return jsonResponse(200, {
      success: true,
      unlinked: result.unlinked,
      remainingOptions: result.remainingOptions
    });
  } catch (err) {
    console.error('Unlink proposal error:', err);
    return errorResponse(422, err.message, 'UNLINK_FAILED');
  }
}

// --- POST ?action=rename-option ---

async function handleRenameOption(event, supabase) {
  const body = parseBody(event);
  if (!body) return errorResponse(400, 'Invalid JSON body', 'VALIDATION_ERROR');

  if (!body.proposalId) {
    return errorResponse(400, 'proposalId is required', 'VALIDATION_ERROR');
  }
  if (!body.optionName) {
    return errorResponse(400, 'optionName is required', 'VALIDATION_ERROR');
  }

  try {
    const result = await renameOption(supabase, body.proposalId, body.optionName);
    return jsonResponse(200, { success: true, ...result });
  } catch (err) {
    console.error('Rename option error:', err);
    return errorResponse(422, err.message, 'RENAME_FAILED');
  }
}

// --- POST ?action=reorder-option ---

async function handleReorderOption(event, supabase) {
  const body = parseBody(event);
  if (!body) return errorResponse(400, 'Invalid JSON body', 'VALIDATION_ERROR');

  if (!body.proposalId) {
    return errorResponse(400, 'proposalId is required', 'VALIDATION_ERROR');
  }
  if (body.optionOrder === undefined) {
    return errorResponse(400, 'optionOrder is required', 'VALIDATION_ERROR');
  }

  try {
    const result = await reorderOption(supabase, body.proposalId, Number(body.optionOrder));
    return jsonResponse(200, { success: true, ...result });
  } catch (err) {
    console.error('Reorder option error:', err);
    return errorResponse(422, err.message, 'REORDER_FAILED');
  }
}

// --- GET ?action=group-options&id=<proposalId> ---

async function handleGetGroupOptions(params, supabase) {
  if (!params.id) {
    return errorResponse(400, 'id parameter is required', 'VALIDATION_ERROR');
  }

  try {
    const result = await getGroupOptions(supabase, params.id);
    return jsonResponse(200, { success: true, ...result });
  } catch (err) {
    console.error('Get group options error:', err);
    return errorResponse(500, err.message, 'GROUP_OPTIONS_FAILED');
  }
}

// ============================================================
// LANDING PAGE HANDLERS
// ============================================================

// --- POST ?action=create-landing-page ---

async function handleCreateLandingPage(event, user, supabase) {
  const body = parseBody(event);
  if (!body) return errorResponse(400, 'Invalid JSON body', 'VALIDATION_ERROR');

  if (!body.partnerName) {
    return errorResponse(400, 'partnerName is required', 'VALIDATION_ERROR');
  }

  try {
    const result = await createLandingPage(supabase, user.id, body);

    return jsonResponse(201, {
      success: true,
      landingPage: {
        id: result.page.id,
        url: result.url,
        uniqueToken: result.uniqueToken,
        partnerName: body.partnerName,
        status: result.page.status
      }
    });
  } catch (err) {
    console.error('Create landing page error:', err);
    return errorResponse(422, err.message, 'LANDING_PAGE_CREATE_FAILED');
  }
}

// --- PATCH ?action=update-landing-page ---

async function handleUpdateLandingPage(event, supabase) {
  const body = parseBody(event);
  if (!body) return errorResponse(400, 'Invalid JSON body', 'VALIDATION_ERROR');

  if (!body.pageId) {
    return errorResponse(400, 'pageId is required', 'VALIDATION_ERROR');
  }

  try {
    const result = await updateLandingPage(supabase, body.pageId, body);

    return jsonResponse(200, {
      success: true,
      landingPage: {
        id: result.page.id,
        url: result.url,
        partnerName: result.page.data?.partnerName,
        status: result.page.status
      }
    });
  } catch (err) {
    console.error('Update landing page error:', err);
    return errorResponse(422, err.message, 'LANDING_PAGE_UPDATE_FAILED');
  }
}

// --- GET ?action=landing-page&id=<pageId> ---

async function handleGetLandingPage(params, supabase) {
  if (!params.id) {
    return errorResponse(400, 'id parameter is required', 'VALIDATION_ERROR');
  }

  try {
    const result = await getLandingPage(supabase, params.id);

    return jsonResponse(200, {
      success: true,
      landingPage: {
        id: result.page.id,
        url: result.url,
        data: result.page.data,
        customization: result.page.customization,
        status: result.page.status,
        isReturningClient: result.page.is_returning_client,
        uniqueToken: result.page.unique_token,
        createdAt: result.page.created_at,
        updatedAt: result.page.updated_at
      }
    });
  } catch (err) {
    console.error('Get landing page error:', err);
    return errorResponse(500, err.message, 'LANDING_PAGE_GET_FAILED');
  }
}

// --- GET ?action=search-landing-pages&search=<term> ---

async function handleSearchLandingPages(params, supabase) {
  if (!params.search) {
    return errorResponse(400, 'search parameter is required', 'VALIDATION_ERROR');
  }

  try {
    const result = await searchLandingPages(supabase, params.search);
    return jsonResponse(200, { success: true, ...result });
  } catch (err) {
    console.error('Search landing pages error:', err);
    return errorResponse(500, err.message, 'LANDING_PAGE_SEARCH_FAILED');
  }
}

// ============================================================
// EXISTING HANDLERS (Search, Get, Calculate, Client Lookup)
// ============================================================

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
      notes: proposal.notes,
      proposalGroupId: proposal.proposal_group_id,
      optionName: proposal.option_name,
      optionOrder: proposal.option_order
    }
  });
}

// --- POST ?action=calculate: Reverse Calculator ---

async function handleCalculate(event) {
  const body = parseBody(event);
  if (!body) return errorResponse(400, 'Invalid JSON body', 'VALIDATION_ERROR');

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
