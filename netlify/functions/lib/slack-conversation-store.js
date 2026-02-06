/**
 * Slack Conversation Store — persists Anthropic message history per Slack thread.
 * Keyed by (channel_id, thread_ts). Prunes to MAX_MESSAGES to control token usage.
 */

const MAX_MESSAGES = 20;

/**
 * Load conversation history for a Slack thread.
 * @returns {{ messages: Array, lastProposalId: string|null }}
 */
async function getConversation(supabase, channelId, threadTs) {
  const { data, error } = await supabase
    .from('slack_conversations')
    .select('messages, last_proposal_id')
    .eq('channel_id', channelId)
    .eq('thread_ts', threadTs)
    .single();

  if (error || !data) {
    return { messages: [], lastProposalId: null };
  }

  return {
    messages: data.messages || [],
    lastProposalId: data.last_proposal_id
  };
}

/**
 * Save conversation history for a Slack thread.
 * Prunes to the most recent MAX_MESSAGES to keep token usage bounded.
 */
async function saveConversation(supabase, channelId, threadTs, messages, lastProposalId) {
  // Prune old messages but keep the structure intact
  const prunedMessages = messages.slice(-MAX_MESSAGES);

  const record = {
    channel_id: channelId,
    thread_ts: threadTs,
    messages: prunedMessages,
    last_proposal_id: lastProposalId || null,
    updated_at: new Date().toISOString()
  };

  // Upsert: insert or update on (channel_id, thread_ts) unique constraint
  const { error } = await supabase
    .from('slack_conversations')
    .upsert(record, { onConflict: 'channel_id,thread_ts' });

  if (error) {
    console.error('Failed to save conversation:', error.message);
  }
}

export { getConversation, saveConversation };
