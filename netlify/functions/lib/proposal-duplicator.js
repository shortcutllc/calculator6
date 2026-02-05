/**
 * Proposal Duplicator — creates a deep clone of an existing proposal.
 * Matches the duplication logic from ProposalContext.tsx duplicateProposal().
 *
 * Preserved: all service configs, event dates, locations, summary, pricing options,
 *            customization, client logo, proposal type, is_test flag
 * Reset: id, timestamps, status→draft, client_email→null, notes→'',
 *        proposal_group_id/option_name/option_order→null, user_id→current user
 */

import { recalculateProposalSummary } from './pricing-engine.js';

/**
 * Duplicate an existing proposal.
 *
 * @param {object} supabase - Supabase client (service role)
 * @param {string} proposalId - ID of the proposal to duplicate
 * @param {string} userId - Current user's ID (will own the duplicate)
 * @param {object} options - Optional overrides
 * @param {string} options.newTitle - New client name / title (defaults to "Original (Copy)")
 * @param {string} options.notes - Notes for the new proposal
 * @param {boolean} options.recalculate - Whether to recalculate totals (default: false)
 * @returns {object} { proposal, url }
 */
async function duplicateProposal(supabase, proposalId, userId, options = {}) {
  // Fetch the original
  const { data: original, error: fetchError } = await supabase
    .from('proposals')
    .select('*')
    .eq('id', proposalId)
    .single();

  if (fetchError || !original) {
    throw new Error(`Proposal ${proposalId} not found`);
  }

  // Deep clone the data
  const clonedData = JSON.parse(JSON.stringify(original.data));

  // Apply new title if provided
  const newTitle = options.newTitle || `${original.client_name || clonedData.clientName} (Copy)`;
  clonedData.clientName = newTitle;

  // Optionally recalculate (useful if pricing logic has changed)
  if (options.recalculate) {
    recalculateProposalSummary(clonedData);
  }

  // Build the insert object — matches ProposalContext.tsx duplicateProposal pattern
  const newProposal = {
    data: clonedData,
    customization: JSON.parse(JSON.stringify(original.customization || {})),
    is_editable: true,
    user_id: userId,
    status: 'draft',
    pending_review: false,
    has_changes: false,
    original_data: JSON.parse(JSON.stringify(clonedData)),
    client_name: newTitle.trim(),
    client_email: null,                 // Reset — prevent accidental client contact
    client_logo_url: original.client_logo_url,  // Preserve logo
    notes: options.notes || '',
    is_test: original.is_test || false,
    proposal_type: original.proposal_type || 'event',
    // Break group association — duplicate is standalone
    proposal_group_id: null,
    option_name: null,
    option_order: null
  };

  // Insert
  const { data: created, error: insertError } = await supabase
    .from('proposals')
    .insert(newProposal)
    .select()
    .single();

  if (insertError) {
    throw new Error(`Failed to duplicate proposal: ${insertError.message}`);
  }

  return {
    proposal: created,
    url: `https://proposals.getshortcut.co/proposal/${created.id}?shared=true`
  };
}

export { duplicateProposal };
