/**
 * Proposal Linker — manages proposal groups (linking/unlinking proposals as options).
 * Matches the linking logic from ProposalViewer.tsx.
 *
 * Proposals are linked by sharing a `proposal_group_id`. Each proposal in a group
 * has its own `option_name` and `option_order` for display.
 * Linked proposals are independent — they don't share data, just UI grouping.
 */

import { recalculateProposalSummary } from './pricing-engine.js';

/**
 * Create a new option by duplicating the current proposal into a group.
 * If the source proposal isn't in a group yet, it becomes Option 1.
 *
 * @param {object} supabase - Supabase client
 * @param {string} proposalId - Source proposal ID
 * @param {string} userId - Current user ID
 * @param {object} options
 * @param {string} options.optionName - Name for the new option (default: "Option N")
 * @returns {object} { newProposal, groupId, optionCount }
 */
async function createOption(supabase, proposalId, userId, options = {}) {
  // Fetch the source proposal
  const { data: source, error: fetchError } = await supabase
    .from('proposals')
    .select('*')
    .eq('id', proposalId)
    .single();

  if (fetchError || !source) {
    throw new Error(`Proposal ${proposalId} not found`);
  }

  // Determine the group ID (use existing or create from source ID)
  const groupId = source.proposal_group_id || source.id;

  // If source isn't in a group yet, make it Option 1
  if (!source.proposal_group_id) {
    const { error: updateError } = await supabase
      .from('proposals')
      .update({
        proposal_group_id: groupId,
        option_name: source.option_name || 'Option 1',
        option_order: 1
      })
      .eq('id', source.id);

    if (updateError) {
      throw new Error(`Failed to initialize group on source: ${updateError.message}`);
    }
  }

  // Count existing options to determine next order
  const { data: existingOptions, error: countError } = await supabase
    .from('proposals')
    .select('id, option_order')
    .eq('proposal_group_id', groupId);

  if (countError) {
    throw new Error(`Failed to count existing options: ${countError.message}`);
  }

  const nextOrder = (existingOptions || []).length + 1;
  const optionName = options.optionName || `Option ${nextOrder}`;

  // Deep clone the source data for the new option
  const clonedData = JSON.parse(JSON.stringify(source.data));
  clonedData.clientName = `${source.client_name} - ${optionName}`;

  const newOption = {
    data: clonedData,
    customization: JSON.parse(JSON.stringify(source.customization || {})),
    is_editable: true,
    user_id: userId,
    status: 'draft',
    pending_review: false,
    has_changes: false,
    original_data: JSON.parse(JSON.stringify(clonedData)),
    client_name: source.client_name,
    client_email: source.client_email,
    client_logo_url: source.client_logo_url,
    notes: '',
    is_test: source.is_test || false,
    proposal_type: source.proposal_type || 'event',
    proposal_group_id: groupId,
    option_name: optionName,
    option_order: nextOrder
  };

  const { data: created, error: insertError } = await supabase
    .from('proposals')
    .insert(newOption)
    .select()
    .single();

  if (insertError) {
    throw new Error(`Failed to create option: ${insertError.message}`);
  }

  return {
    newProposal: created,
    groupId,
    optionCount: nextOrder,
    url: `https://proposals.getshortcut.co/proposal/${created.id}?shared=true`
  };
}

/**
 * Link existing proposals together into a group.
 *
 * @param {object} supabase - Supabase client
 * @param {string} sourceProposalId - The anchor proposal (determines groupId)
 * @param {string[]} proposalIds - Array of proposal IDs to link
 * @returns {object} { groupId, linkedCount, options }
 */
async function linkProposals(supabase, sourceProposalId, proposalIds) {
  if (!proposalIds || proposalIds.length === 0) {
    throw new Error('At least one proposal ID is required to link');
  }

  // Fetch the source proposal
  const { data: source, error: fetchError } = await supabase
    .from('proposals')
    .select('id, proposal_group_id, option_name, option_order')
    .eq('id', sourceProposalId)
    .single();

  if (fetchError || !source) {
    throw new Error(`Source proposal ${sourceProposalId} not found`);
  }

  const groupId = source.proposal_group_id || source.id;

  // If source isn't in a group yet, make it Option 1
  if (!source.proposal_group_id) {
    await supabase
      .from('proposals')
      .update({
        proposal_group_id: groupId,
        option_name: source.option_name || 'Option 1',
        option_order: 1
      })
      .eq('id', source.id);
  }

  // Get current max order in the group
  const { data: existingOptions } = await supabase
    .from('proposals')
    .select('id, option_order')
    .eq('proposal_group_id', groupId);

  let nextOrder = (existingOptions || []).length + 1;

  // Link each proposal
  const linked = [];
  for (const pid of proposalIds) {
    if (pid === sourceProposalId) continue; // Skip self

    const optionName = `Option ${nextOrder}`;

    const { data: updated, error: updateError } = await supabase
      .from('proposals')
      .update({
        proposal_group_id: groupId,
        option_name: optionName,
        option_order: nextOrder
      })
      .eq('id', pid)
      .select('id, client_name, option_name, option_order')
      .single();

    if (updateError) {
      console.warn(`Failed to link proposal ${pid}: ${updateError.message}`);
      continue;
    }

    linked.push(updated);
    nextOrder++;
  }

  // Fetch final group state
  const { data: finalOptions } = await supabase
    .from('proposals')
    .select('id, client_name, option_name, option_order, status')
    .eq('proposal_group_id', groupId)
    .order('option_order', { ascending: true });

  return {
    groupId,
    linkedCount: linked.length,
    options: finalOptions || []
  };
}

/**
 * Unlink a proposal from its group.
 * If it's the last one remaining, the group dissolves.
 *
 * @param {object} supabase - Supabase client
 * @param {string} proposalId - Proposal to unlink
 * @returns {object} { unlinked, remainingOptions }
 */
async function unlinkProposal(supabase, proposalId) {
  // Fetch the proposal to get its group
  const { data: proposal, error: fetchError } = await supabase
    .from('proposals')
    .select('id, proposal_group_id, option_name')
    .eq('id', proposalId)
    .single();

  if (fetchError || !proposal) {
    throw new Error(`Proposal ${proposalId} not found`);
  }

  if (!proposal.proposal_group_id) {
    throw new Error(`Proposal ${proposalId} is not in a group`);
  }

  const groupId = proposal.proposal_group_id;

  // Unlink this proposal
  const { error: updateError } = await supabase
    .from('proposals')
    .update({
      proposal_group_id: null,
      option_name: null,
      option_order: null
    })
    .eq('id', proposalId);

  if (updateError) {
    throw new Error(`Failed to unlink: ${updateError.message}`);
  }

  // Get remaining options and reorder
  const { data: remaining } = await supabase
    .from('proposals')
    .select('id, option_name, option_order')
    .eq('proposal_group_id', groupId)
    .order('option_order', { ascending: true });

  // Reorder remaining options sequentially
  if (remaining && remaining.length > 0) {
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].option_order !== i + 1) {
        await supabase
          .from('proposals')
          .update({ option_order: i + 1 })
          .eq('id', remaining[i].id);
      }
    }

    // If only one option left, dissolve the group
    if (remaining.length === 1) {
      await supabase
        .from('proposals')
        .update({
          proposal_group_id: null,
          option_name: null,
          option_order: null
        })
        .eq('id', remaining[0].id);

      return { unlinked: true, remainingOptions: [] };
    }
  }

  return {
    unlinked: true,
    remainingOptions: remaining || []
  };
}

/**
 * Rename an option in a group.
 *
 * @param {object} supabase - Supabase client
 * @param {string} proposalId - Proposal to rename
 * @param {string} newName - New option name
 * @returns {object} { updated }
 */
async function renameOption(supabase, proposalId, newName) {
  if (!newName || typeof newName !== 'string') {
    throw new Error('newName is required');
  }

  const { data: updated, error } = await supabase
    .from('proposals')
    .update({ option_name: newName.trim() })
    .eq('id', proposalId)
    .select('id, option_name, option_order')
    .single();

  if (error) {
    throw new Error(`Failed to rename option: ${error.message}`);
  }

  return { updated };
}

/**
 * Reorder an option in a group.
 *
 * @param {object} supabase - Supabase client
 * @param {string} proposalId - Proposal to reorder
 * @param {number} newOrder - New position (1-based)
 * @returns {object} { updated }
 */
async function reorderOption(supabase, proposalId, newOrder) {
  if (typeof newOrder !== 'number' || newOrder < 1) {
    throw new Error('newOrder must be a positive integer');
  }

  const { data: updated, error } = await supabase
    .from('proposals')
    .update({ option_order: newOrder })
    .eq('id', proposalId)
    .select('id, option_name, option_order')
    .single();

  if (error) {
    throw new Error(`Failed to reorder option: ${error.message}`);
  }

  return { updated };
}

/**
 * Get all options in a proposal's group.
 *
 * @param {object} supabase - Supabase client
 * @param {string} proposalId - Any proposal in the group
 * @returns {object} { groupId, options }
 */
async function getGroupOptions(supabase, proposalId) {
  // Fetch the proposal to get its group
  const { data: proposal, error } = await supabase
    .from('proposals')
    .select('id, proposal_group_id')
    .eq('id', proposalId)
    .single();

  if (error || !proposal) {
    throw new Error(`Proposal ${proposalId} not found`);
  }

  const groupId = proposal.proposal_group_id;
  if (!groupId) {
    return { groupId: null, options: [] };
  }

  const { data: options } = await supabase
    .from('proposals')
    .select('id, client_name, option_name, option_order, status, data')
    .eq('proposal_group_id', groupId)
    .order('option_order', { ascending: true });

  // Return summary info for each option (not full data)
  const optionSummaries = (options || []).map(opt => ({
    id: opt.id,
    clientName: opt.client_name,
    optionName: opt.option_name,
    optionOrder: opt.option_order,
    status: opt.status,
    summary: opt.data?.summary || null
  }));

  return {
    groupId,
    options: optionSummaries
  };
}

export {
  createOption,
  linkProposals,
  unlinkProposal,
  renameOption,
  reorderOption,
  getGroupOptions
};
