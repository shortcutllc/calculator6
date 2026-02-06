/**
 * Slack Tools — execute proposal operations for the Pro assistant.
 * Each handler imports lib modules directly (same process, no HTTP hop).
 * Returns plain objects that Claude can interpret and relay to the user.
 */

import { assembleProposal } from './proposal-assembler.js';
import { applyOperations } from './proposal-editor.js';
import { calculateEventOptions } from './reverse-calculator.js';
import { searchClients, getClientByName, searchProposals } from './client-lookup.js';
import { fetchAndStoreLogo, storeProvidedLogo, fetchLogoUrl } from './logo-fetcher.js';
import { recalculateProposalSummary } from './pricing-engine.js';
import { duplicateProposal } from './proposal-duplicator.js';
import { createOption, linkProposals, unlinkProposal } from './proposal-linker.js';
import { createLandingPage, getLandingPage } from './landing-page-assembler.js';

const PROPOSAL_BASE_URL = 'https://proposals.getshortcut.co/proposal';

/**
 * Execute a tool call from Claude and return the result.
 */
async function executeTool(toolName, params, supabase, userId) {
  const handler = TOOL_HANDLERS[toolName];
  if (!handler) {
    return { error: `Unknown tool: ${toolName}` };
  }

  try {
    return await handler(params, supabase, userId);
  } catch (err) {
    console.error(`Tool ${toolName} error:`, err);
    return { error: err.message || 'Tool execution failed' };
  }
}

// --- Tool Handlers ---

const TOOL_HANDLERS = {
  create_proposal: handleCreateProposal,
  edit_proposal: handleEditProposal,
  search_proposals: handleSearchProposals,
  get_proposal: handleGetProposal,
  calculate_pricing: handleCalculatePricing,
  lookup_client: handleLookupClient,
  duplicate_proposal: handleDuplicateProposal,
  create_proposal_option: handleCreateOption,
  link_proposals: handleLinkProposals,
  unlink_proposal: handleUnlinkProposal,
  create_landing_page: handleCreateLandingPage,
  get_landing_page: handleGetLandingPage
};

// --- Create Proposal ---

async function handleCreateProposal(params, supabase, userId) {
  if (!params.clientName) return { error: 'clientName is required' };
  if (!params.events || !Array.isArray(params.events) || params.events.length === 0) {
    return { error: 'At least one event is required in the events array' };
  }

  const { proposalData, customization, proposalType } = assembleProposal(params);

  // Handle logo
  if (params.clientLogoUrl) {
    try {
      const { logoUrl, stored } = await storeProvidedLogo(supabase, params.clientLogoUrl, params.clientName);
      if (stored) proposalData.clientLogoUrl = logoUrl;
    } catch (e) {
      console.warn('Logo storage failed:', e.message);
    }
  }

  const proposalInsert = {
    data: proposalData,
    customization,
    is_editable: true,
    user_id: userId,
    status: 'draft',
    pending_review: false,
    has_changes: false,
    original_data: proposalData,
    client_name: proposalData.clientName.trim(),
    client_email: proposalData.clientEmail || params.clientEmail || null,
    client_logo_url: proposalData.clientLogoUrl || params.clientLogoUrl || null,
    notes: params.notes || 'Created by Pro (Slack assistant)',
    proposal_type: proposalType
  };

  const { data: newProposal, error } = await supabase
    .from('proposals')
    .insert(proposalInsert)
    .select()
    .single();

  if (error) return { error: `Failed to create proposal: ${error.message}` };

  return {
    success: true,
    proposalId: newProposal.id,
    url: `${PROPOSAL_BASE_URL}/${newProposal.id}?shared=true`,
    clientName: proposalData.clientName,
    status: 'draft',
    summary: proposalData.summary,
    eventCount: (proposalData.eventDates || []).length,
    locations: proposalData.locations || [],
    eventDates: proposalData.eventDates || []
  };
}

// --- Edit Proposal ---

async function handleEditProposal(params, supabase, userId) {
  if (!params.proposalId) return { error: 'proposalId is required' };
  if (!params.operations || !Array.isArray(params.operations) || params.operations.length === 0) {
    return { error: 'At least one operation is required' };
  }

  const { data: existing, error: fetchError } = await supabase
    .from('proposals')
    .select('*')
    .eq('id', params.proposalId)
    .single();

  if (fetchError || !existing) return { error: `Proposal ${params.proposalId} not found` };

  const proposalRecord = {
    status: existing.status,
    client_name: existing.client_name,
    client_email: existing.client_email,
    client_logo_url: existing.client_logo_url
  };

  const { proposalData: updatedData, customization: updatedCustomization, proposalRecord: updatedRecord, changesSummary } =
    applyOperations(existing.data, existing.customization || {}, proposalRecord, params.operations);

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

  const { error: updateError } = await supabase
    .from('proposals')
    .update(updatePayload)
    .eq('id', params.proposalId);

  if (updateError) return { error: `Failed to update proposal: ${updateError.message}` };

  return {
    success: true,
    proposalId: params.proposalId,
    url: `${PROPOSAL_BASE_URL}/${params.proposalId}?shared=true`,
    clientName: updatedData.clientName,
    status: updatedRecord.status,
    summary: updatedData.summary,
    changesSummary
  };
}

// --- Search Proposals ---

async function handleSearchProposals(params, supabase) {
  if (!params.searchTerm) return { error: 'searchTerm is required' };

  const { results } = await searchProposals(supabase, params.searchTerm);
  return { success: true, results, resultCount: results.length };
}

// --- Get Proposal ---

async function handleGetProposal(params, supabase) {
  if (!params.proposalId) return { error: 'proposalId is required' };

  const { data: proposal, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('id', params.proposalId)
    .single();

  if (error || !proposal) return { error: `Proposal ${params.proposalId} not found` };

  return {
    success: true,
    proposalId: proposal.id,
    url: `${PROPOSAL_BASE_URL}/${proposal.id}?shared=true`,
    clientName: proposal.client_name,
    clientEmail: proposal.client_email,
    status: proposal.status,
    createdAt: proposal.created_at,
    data: proposal.data,
    customization: proposal.customization
  };
}

// --- Calculate Pricing ---

async function handleCalculatePricing(params) {
  if (!params.serviceType) return { error: 'serviceType is required' };
  if (params.targetAppointments === undefined) return { error: 'targetAppointments is required' };

  const result = calculateEventOptions(params.serviceType, params.targetAppointments, params.overrides);
  return result;
}

// --- Lookup Client ---

async function handleLookupClient(params, supabase) {
  if (!params.clientName) return { error: 'clientName is required' };

  // Try exact match first
  const exactResult = await getClientByName(supabase, params.clientName);
  if (exactResult.found) {
    return { success: true, found: true, client: exactResult.client };
  }

  // Fall back to partial search
  const searchResult = await searchClients(supabase, params.clientName);
  if (searchResult.found && searchResult.results.length > 0) {
    return {
      success: true,
      found: true,
      client: searchResult.results[0],
      alternateMatches: searchResult.results.slice(1)
    };
  }

  // Not found — try to suggest a logo
  let suggestedLogoUrl = null;
  try {
    suggestedLogoUrl = await fetchLogoUrl(params.clientName);
  } catch (e) { /* best-effort */ }

  return {
    success: true,
    found: false,
    client: { name: params.clientName, suggestedLogoUrl }
  };
}

// --- Duplicate Proposal ---

async function handleDuplicateProposal(params, supabase, userId) {
  if (!params.proposalId) return { error: 'proposalId is required' };

  const { proposal, url } = await duplicateProposal(supabase, params.proposalId, userId, {
    newTitle: params.newTitle,
    notes: params.notes
  });

  return {
    success: true,
    proposalId: proposal.id,
    url,
    clientName: proposal.client_name,
    duplicatedFrom: params.proposalId
  };
}

// --- Create Option ---

async function handleCreateOption(params, supabase, userId) {
  if (!params.proposalId) return { error: 'proposalId is required' };

  const result = await createOption(supabase, params.proposalId, userId, {
    optionName: params.optionName
  });

  return {
    success: true,
    newProposalId: result.newProposal.id,
    url: result.url,
    optionName: result.newProposal.option_name,
    groupId: result.groupId,
    optionCount: result.optionCount
  };
}

// --- Link Proposals ---

async function handleLinkProposals(params, supabase) {
  if (!params.sourceProposalId) return { error: 'sourceProposalId is required' };
  if (!params.proposalIds || !Array.isArray(params.proposalIds)) return { error: 'proposalIds array is required' };

  const result = await linkProposals(supabase, params.sourceProposalId, params.proposalIds);
  return { success: true, groupId: result.groupId, linkedCount: result.linkedCount, options: result.options };
}

// --- Unlink Proposal ---

async function handleUnlinkProposal(params, supabase) {
  if (!params.proposalId) return { error: 'proposalId is required' };

  const result = await unlinkProposal(supabase, params.proposalId);
  return { success: true, unlinked: result.unlinked, remainingOptions: result.remainingOptions };
}

// --- Create Landing Page ---

async function handleCreateLandingPage(params, supabase, userId) {
  if (!params.partnerName) return { error: 'partnerName is required' };

  const result = await createLandingPage(supabase, userId, params);
  return {
    success: true,
    pageId: result.page.id,
    url: result.url,
    partnerName: params.partnerName,
    uniqueToken: result.uniqueToken
  };
}

// --- Get Landing Page ---

async function handleGetLandingPage(params, supabase) {
  if (!params.pageId) return { error: 'pageId is required' };

  const result = await getLandingPage(supabase, params.pageId);
  return {
    success: true,
    pageId: result.page.id,
    url: result.url,
    data: result.page.data,
    customization: result.page.customization,
    status: result.page.status
  };
}

export { executeTool, TOOL_HANDLERS };
