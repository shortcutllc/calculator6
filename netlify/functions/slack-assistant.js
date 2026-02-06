/**
 * Pro — Shortcut's Slack proposal assistant.
 *
 * Netlify Function (26-second timeout). Returns 200 immediately for Slack,
 * then processes the message. Slack retries are ignored via x-slack-retry-num.
 *
 * Flow:
 * 1. Slack sends event via HTTP webhook
 * 2. This function returns 200 immediately (Slack is happy)
 * 3. Verifies the signature, parses the event, and calls Claude
 * 4. Claude processes the message (possibly calling tools) and generates a response
 * 5. Response is posted back to Slack via chat.postMessage
 *
 * Environment variables required:
 *   PRO_SLACK_BOT_TOKEN       — xoxb-... bot token
 *   PRO_SLACK_SIGNING_SECRET  — Slack app signing secret
 *   ANTHROPIC_API_KEY         — Anthropic API key for Claude Haiku
 *   SLACK_PROPOSALS_CHANNEL_ID — Channel ID for cross-posting proposal events
 *   VITE_SUPABASE_URL / SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { processSlackMessage } from './lib/slack-ai.js';

// --- Slack Signature Verification ---

function verifySlackSignature(event) {
  const signingSecret = process.env.PRO_SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    console.error('PRO_SLACK_SIGNING_SECRET not configured');
    return false;
  }

  const timestamp = event.headers['x-slack-request-timestamp'];
  const signature = event.headers['x-slack-signature'];

  if (!timestamp || !signature) return false;

  // Reject requests older than 5 minutes (replay protection)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > 300) return false;

  const sigBasestring = `v0:${timestamp}:${event.body}`;
  const hmac = crypto.createHmac('sha256', signingSecret);
  hmac.update(sigBasestring);
  const expectedSignature = `v0=${hmac.digest('hex')}`;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// --- Slack API Helpers ---

const SLACK_API = 'https://slack.com/api';

async function slackPost(method, body) {
  const token = process.env.PRO_SLACK_BOT_TOKEN;
  if (!token) throw new Error('PRO_SLACK_BOT_TOKEN not configured');

  const response = await fetch(`${SLACK_API}/${method}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  if (!data.ok) {
    console.error(`Slack API ${method} error:`, data.error);
  }
  return data;
}

async function postMessage(channel, text, threadTs) {
  return slackPost('chat.postMessage', {
    channel,
    text,
    thread_ts: threadTs,
    unfurl_links: false,
    unfurl_media: false
  });
}

async function addReaction(channel, timestamp, emoji) {
  return slackPost('reactions.add', {
    channel,
    timestamp,
    name: emoji
  });
}

async function removeReaction(channel, timestamp, emoji) {
  return slackPost('reactions.remove', {
    channel,
    timestamp,
    name: emoji
  });
}

// --- Cross-Post to #proposals ---

async function crossPostToProposals(proposalAction, proposalSummary) {
  const channelId = process.env.SLACK_PROPOSALS_CHANNEL_ID;
  if (!channelId || !proposalSummary) return;

  const emoji = proposalAction === 'created' ? ':sparkles:' : ':pencil2:';
  const action = proposalAction === 'created' ? 'New proposal created' : 'Proposal updated';

  const summary = proposalSummary.summary || {};
  const cost = summary.totalEventCost
    ? `$${Number(summary.totalEventCost).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    : 'N/A';
  const appts = summary.totalAppointments || 'N/A';

  const text = [
    `${emoji} *${action} by Pro*`,
    `*Client:* ${proposalSummary.clientName || 'Unknown'}`,
    `*Total:* ${cost} | *Appointments:* ${appts}`,
    `*Link:* ${proposalSummary.url || 'N/A'}`
  ].join('\n');

  await postMessage(channelId, text);
}

// --- Supabase Client ---

function createSupabaseClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase configuration missing (VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)');
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

// --- Main Handler ---

export const handler = async (event) => {
  // Background functions still receive the event — Netlify has already returned 202 to the caller

  try {
    const body = JSON.parse(event.body || '{}');

    // 1. Handle url_verification challenge (one-time Slack setup)
    if (body.type === 'url_verification') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge: body.challenge })
      };
    }

    // 2. Verify Slack signature
    if (!verifySlackSignature(event)) {
      console.error('Invalid Slack signature');
      return { statusCode: 401, body: 'Invalid signature' };
    }

    // 3. Ignore retries (Slack sends x-slack-retry-num on retries)
    if (event.headers['x-slack-retry-num']) {
      console.log('Ignoring Slack retry');
      return { statusCode: 200, body: 'OK' };
    }

    // 4. Extract event data
    const slackEvent = body.event;
    if (!slackEvent) {
      return { statusCode: 200, body: 'No event' };
    }

    // 5. Ignore bot messages (including our own)
    if (slackEvent.bot_id || slackEvent.subtype === 'bot_message') {
      return { statusCode: 200, body: 'OK' };
    }

    // 6. Only process app_mention and direct messages
    if (slackEvent.type !== 'app_mention' && slackEvent.type !== 'message') {
      return { statusCode: 200, body: 'OK' };
    }

    // For message events, only process DMs (channel type "im")
    if (slackEvent.type === 'message' && slackEvent.channel_type !== 'im') {
      return { statusCode: 200, body: 'OK' };
    }

    // 7. Extract message details
    const userMessage = (slackEvent.text || '').replace(/<@[A-Z0-9]+>/g, '').trim();
    const channelId = slackEvent.channel;
    const threadTs = slackEvent.thread_ts || slackEvent.ts; // Use thread_ts if replying, otherwise start new thread
    const messageTs = slackEvent.ts;
    const slackUserId = slackEvent.user;

    if (!userMessage) {
      return { statusCode: 200, body: 'Empty message' };
    }

    console.log(`Pro: processing message from ${slackUserId} in ${channelId}: "${userMessage.substring(0, 100)}"`);

    // 8. Add thinking reaction
    await addReaction(channelId, messageTs, 'brain');

    // 9. Process with Claude
    const supabase = createSupabaseClient();

    // Use a fixed user ID for Pro-created proposals (service role)
    // In production, you could map Slack user IDs to Supabase user IDs
    const userId = '42c7eb9e-7ab1-4ba4-bfc7-f23d367d4884'; // Shortcut admin user

    const result = await processSlackMessage({
      supabase,
      userId,
      channelId,
      threadTs,
      userMessage,
      slackUserId
    });

    // 10. Post response to Slack thread
    if (result.response) {
      await postMessage(channelId, result.response, threadTs);
    }

    // 11. Cross-post to #proposals if proposal was created/edited
    if (result.proposalAction && result.proposalSummary) {
      await crossPostToProposals(result.proposalAction, result.proposalSummary);
    }

    // 12. Remove thinking reaction
    await removeReaction(channelId, messageTs, 'brain');

  } catch (err) {
    console.error('Pro handler error:', err);

    // Try to notify the user something went wrong
    try {
      const body = JSON.parse(event.body || '{}');
      const slackEvent = body.event;
      if (slackEvent) {
        await postMessage(
          slackEvent.channel,
          `Something went wrong processing your request. Error: ${err.message}`,
          slackEvent.thread_ts || slackEvent.ts
        );
      }
    } catch (notifyErr) {
      console.error('Failed to notify user of error:', notifyErr);
    }
  }

  return { statusCode: 200, body: 'OK' };
};
