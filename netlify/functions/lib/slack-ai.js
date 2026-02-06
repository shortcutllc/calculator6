/**
 * Slack AI — the brain of the Pro assistant.
 * System prompt, tool definitions, and Anthropic conversation loop.
 */

import Anthropic from '@anthropic-ai/sdk';
import { executeTool } from './slack-tools.js';
import { getConversation, saveConversation } from './slack-conversation-store.js';

const MODEL = 'claude-3-5-haiku-20241022';
const MAX_TOOL_ROUNDS = 8; // Safety limit on tool call loops

// --- System Prompt ---

const SYSTEM_PROMPT = `You are Pro, Shortcut's internal proposal assistant on Slack.

Shortcut is a corporate wellness company that delivers in-person wellness experiences — chair massage, facials, nails, hair styling, makeup, headshots, and mindfulness workshops — to offices. You help the team create, edit, search, and manage proposals.

Be concise, calm, and practical. Respond in Slack formatting: use *bold* for emphasis, bullet points for lists, and format dollar amounts with commas (e.g., $1,350.00). Keep responses short — one sentence of context, then bullet points.

## Services & Pricing

| Service | Appt Time | Default Hours | Default Pros | Hourly Rate | Pro Rate | Early Arrival |
|---------|-----------|---------------|--------------|-------------|----------|---------------|
| massage | 20 min | 4 hrs | 2 | $135/hr | $50/hr | $25 |
| facial | 20 min | 4 hrs | 2 | $135/hr | $50/hr | $25 |
| nails | 30 min | 6 hrs | 2 | $135/hr | $50/hr | $25 |
| hair | 30 min | 6 hrs | 2 | $135/hr | $50/hr | $25 |
| makeup | 30 min | 4 hrs | 2 | $135/hr | $50/hr | $25 |
| hair-makeup | 20 min | 4 hrs | 2 | $135/hr | $50/hr | $25 |
| headshot | 12 min | 5 hrs | 1 | N/A | $400/hr | $0 |
| mindfulness | 45 min | 0.75 hrs | 1 | Fixed $1,375 | N/A | $0 |

Headshot cost = (numPros x totalHours x proHourly) + (totalAppointments x retouchingCost).
Mindfulness is fixed-price, not hourly.
All other services: cost = numPros x totalHours x hourlyRate + earlyArrival.
Appointments per pro per hour = 60 / appTime.

## Recurring Discounts
- 4-8 occurrences (quarterly): 15% discount
- 9+ occurrences (monthly): 20% discount
Discounts apply to the service cost.

## Key Behaviors
1. When a client name is mentioned, ALWAYS call lookup_client first to check for existing data (logo, locations, past proposals).
2. When the user says "X appointments" but doesn't specify hours and pros, call calculate_pricing to show staffing options.
3. When ambiguous, ask a clarifying question — don't guess service type, staffing, or dates.
4. After creating or editing a proposal, always include the proposal link in your response.
5. Remember the proposal context within this thread. If the user says "make it recurring," apply it to the proposal you just created or last discussed.
6. For edit operations, you need to know the proposal's location, date, and service index. If you're not sure, call get_proposal first to see the current structure.

## Edit Operations
When editing proposals, use these operations:
- add_service: Add a service at a location/date
- remove_service: Remove a service by index
- update_service: Change service fields (totalHours, numPros, appTime, hourlyRate, etc.)
- set_recurring: Make a service recurring (frequency: { type: "quarterly"|"monthly"|"custom", occurrences: number })
- remove_recurring: Remove recurring from a service
- set_gratuity: Add gratuity (type: "percentage"|"dollar", value: number)
- remove_gratuity: Remove gratuity
- set_discount: Set discount percentage on a service
- update_client_info: Update client name, email, or logo
- add_location: Add a new office location
- remove_location: Remove a location and all its services
- set_status: Change status (draft, pending, approved)
- update_customization: Update proposal display settings

Field aliases for update_service: appointmentTime→appTime, hours→totalHours, pros→numPros, rate→hourlyRate, discount→discountPercent

## Date Format
Always use YYYY-MM-DD format for dates (e.g., 2026-02-18).`;

// --- Tool Definitions ---

const TOOLS = [
  {
    name: 'create_proposal',
    description: 'Create a new wellness service proposal for a client. Returns the proposal ID, URL, and cost summary.',
    input_schema: {
      type: 'object',
      properties: {
        clientName: { type: 'string', description: 'Client company name' },
        clientEmail: { type: 'string', description: 'Client contact email (optional)' },
        clientLogoUrl: { type: 'string', description: 'URL to client company logo (optional, will be stored permanently)' },
        events: {
          type: 'array',
          description: 'Array of service events to include in the proposal',
          items: {
            type: 'object',
            properties: {
              serviceType: { type: 'string', enum: ['massage', 'facial', 'nails', 'hair', 'makeup', 'hair-makeup', 'headshot', 'mindfulness'] },
              location: { type: 'string', description: 'Office address for this event' },
              date: { type: 'string', description: 'Event date in YYYY-MM-DD format' },
              totalHours: { type: 'number', description: 'Hours of service' },
              numPros: { type: 'integer', description: 'Number of professionals' },
              appTime: { type: 'integer', description: 'Appointment time in minutes (optional, uses service default)' },
              isRecurring: { type: 'boolean', description: 'Whether this is a recurring event' },
              recurringFrequency: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['quarterly', 'monthly', 'custom'] },
                  occurrences: { type: 'integer' }
                }
              },
              discountPercent: { type: 'number', description: 'Discount percentage (0-100)' }
            },
            required: ['serviceType', 'location', 'date', 'totalHours', 'numPros']
          }
        },
        notes: { type: 'string', description: 'Internal notes about this proposal' }
      },
      required: ['clientName', 'events']
    }
  },
  {
    name: 'edit_proposal',
    description: 'Edit an existing proposal by applying operations. Use get_proposal first if you need to see the current structure (locations, dates, service indices).',
    input_schema: {
      type: 'object',
      properties: {
        proposalId: { type: 'string', description: 'UUID of the proposal to edit' },
        operations: {
          type: 'array',
          description: 'Array of edit operations to apply in order',
          items: {
            type: 'object',
            properties: {
              op: { type: 'string', description: 'Operation type: add_service, remove_service, update_service, set_recurring, remove_recurring, set_gratuity, remove_gratuity, set_discount, update_client_info, add_location, remove_location, set_status, update_customization' },
              location: { type: 'string' },
              date: { type: 'string' },
              serviceIndex: { type: 'integer' },
              service: { type: 'object', description: 'For add_service: the service config' },
              updates: { type: 'object', description: 'For update_service: field updates' },
              frequency: { type: 'object', description: 'For set_recurring: { type, occurrences }' },
              type: { type: 'string', description: 'For set_gratuity: percentage or dollar' },
              value: { type: 'number', description: 'For set_gratuity: the amount' },
              discountPercent: { type: 'number', description: 'For set_discount' },
              status: { type: 'string', description: 'For set_status: draft, pending, approved' },
              clientName: { type: 'string', description: 'For update_client_info' },
              clientEmail: { type: 'string', description: 'For update_client_info' },
              clientLogoUrl: { type: 'string', description: 'For update_client_info' },
              customization: { type: 'object', description: 'For update_customization' }
            },
            required: ['op']
          }
        }
      },
      required: ['proposalId', 'operations']
    }
  },
  {
    name: 'search_proposals',
    description: 'Search for existing proposals by client name. Returns a list of matching proposals with summaries.',
    input_schema: {
      type: 'object',
      properties: {
        searchTerm: { type: 'string', description: 'Client name or partial name to search for' }
      },
      required: ['searchTerm']
    }
  },
  {
    name: 'get_proposal',
    description: 'Get full details of a specific proposal including all services, locations, dates, and pricing. Use this before editing if you need to know the exact structure.',
    input_schema: {
      type: 'object',
      properties: {
        proposalId: { type: 'string', description: 'UUID of the proposal' }
      },
      required: ['proposalId']
    }
  },
  {
    name: 'calculate_pricing',
    description: 'Calculate staffing options for a target number of appointments. Use this when someone says "I need X appointments" but does not specify hours and number of professionals. Returns multiple options with costs.',
    input_schema: {
      type: 'object',
      properties: {
        serviceType: { type: 'string', enum: ['massage', 'facial', 'nails', 'hair', 'makeup', 'hair-makeup', 'headshot'] },
        targetAppointments: { type: 'integer', description: 'Desired number of appointments' }
      },
      required: ['serviceType', 'targetAppointments']
    }
  },
  {
    name: 'lookup_client',
    description: 'Look up a client by name to check for existing data — past proposals, logo, locations, contacts. Always call this first when a client name is mentioned.',
    input_schema: {
      type: 'object',
      properties: {
        clientName: { type: 'string', description: 'Client company name to look up' }
      },
      required: ['clientName']
    }
  },
  {
    name: 'duplicate_proposal',
    description: 'Create a copy of an existing proposal. The duplicate starts as a draft with a new ID.',
    input_schema: {
      type: 'object',
      properties: {
        proposalId: { type: 'string', description: 'UUID of the proposal to duplicate' },
        newTitle: { type: 'string', description: 'Optional new client name/title for the duplicate' }
      },
      required: ['proposalId']
    }
  },
  {
    name: 'create_proposal_option',
    description: 'Create a new option/variant of a proposal (e.g., "Premium Package"). Duplicates the proposal into a linked group.',
    input_schema: {
      type: 'object',
      properties: {
        proposalId: { type: 'string', description: 'UUID of the source proposal' },
        optionName: { type: 'string', description: 'Name for the new option (e.g., "Premium Package")' }
      },
      required: ['proposalId']
    }
  },
  {
    name: 'link_proposals',
    description: 'Link multiple existing proposals together as options in a group.',
    input_schema: {
      type: 'object',
      properties: {
        sourceProposalId: { type: 'string', description: 'UUID of the primary proposal' },
        proposalIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'UUIDs of proposals to link as options'
        }
      },
      required: ['sourceProposalId', 'proposalIds']
    }
  },
  {
    name: 'unlink_proposal',
    description: 'Remove a proposal from its option group, making it standalone.',
    input_schema: {
      type: 'object',
      properties: {
        proposalId: { type: 'string', description: 'UUID of the proposal to unlink' }
      },
      required: ['proposalId']
    }
  },
  {
    name: 'create_landing_page',
    description: 'Create a generic landing page for a partner/client.',
    input_schema: {
      type: 'object',
      properties: {
        partnerName: { type: 'string', description: 'Partner company name' },
        partnerLogoUrl: { type: 'string', description: 'URL to partner logo' },
        clientEmail: { type: 'string', description: 'Partner contact email' },
        customMessage: { type: 'string', description: 'Custom welcome message' },
        isReturningClient: { type: 'boolean', description: 'Whether this is a returning client' },
        customization: {
          type: 'object',
          properties: {
            contactFirstName: { type: 'string' },
            contactLastName: { type: 'string' },
            customNote: { type: 'string' },
            includePricingCalculator: { type: 'boolean' },
            includeTestimonials: { type: 'boolean' },
            includeFAQ: { type: 'boolean' },
            theme: { type: 'string', enum: ['corporate', 'wellness', 'minimal'] }
          }
        }
      },
      required: ['partnerName']
    }
  },
  {
    name: 'get_landing_page',
    description: 'Get details of a landing page by ID.',
    input_schema: {
      type: 'object',
      properties: {
        pageId: { type: 'string', description: 'UUID of the landing page' }
      },
      required: ['pageId']
    }
  }
];

// --- Conversation Loop ---

/**
 * Process a Slack message through the Anthropic API with tool use.
 * Returns the final text response and any proposal IDs created/edited.
 */
async function processSlackMessage({ supabase, userId, channelId, threadTs, userMessage, slackUserId }) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Load conversation history
  const { messages: history, lastProposalId } = await getConversation(supabase, channelId, threadTs);

  // Build messages array
  const messages = [
    ...history,
    { role: 'user', content: userMessage }
  ];

  // If we have a last proposal ID from the thread, inject context
  if (lastProposalId && !userMessage.includes(lastProposalId)) {
    // Add a system-level hint about the active proposal
    const lastMsg = messages[messages.length - 1];
    if (typeof lastMsg.content === 'string') {
      messages[messages.length - 1] = {
        role: 'user',
        content: `${lastMsg.content}\n\n[Thread context: The most recent proposal discussed in this thread is ${lastProposalId}]`
      };
    }
  }

  let currentMessages = messages;
  let finalResponse = '';
  let proposalId = lastProposalId;
  let proposalAction = null; // 'created' | 'edited' | null
  let proposalSummary = null;

  // Tool use loop — Claude may call multiple tools before responding
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages: currentMessages
    });

    // Check if Claude wants to use tools
    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
    const textBlocks = response.content.filter(b => b.type === 'text');

    if (toolUseBlocks.length === 0) {
      // No tool calls — Claude is done, extract text response
      finalResponse = textBlocks.map(b => b.text).join('\n');
      break;
    }

    // Execute tool calls and feed results back
    // First, add Claude's response (with tool_use blocks) to messages
    currentMessages = [
      ...currentMessages,
      { role: 'assistant', content: response.content }
    ];

    // Execute each tool call
    const toolResults = [];
    for (const toolCall of toolUseBlocks) {
      console.log(`Pro: executing tool ${toolCall.name}`, JSON.stringify(toolCall.input).substring(0, 200));

      const result = await executeTool(toolCall.name, toolCall.input, supabase, userId);

      // Track proposal actions for cross-posting
      if (toolCall.name === 'create_proposal' && result.success) {
        proposalId = result.proposalId;
        proposalAction = 'created';
        proposalSummary = result;
      } else if (toolCall.name === 'edit_proposal' && result.success) {
        proposalId = result.proposalId;
        proposalAction = 'edited';
        proposalSummary = result;
      } else if (toolCall.name === 'duplicate_proposal' && result.success) {
        proposalId = result.proposalId;
        proposalAction = 'created';
        proposalSummary = result;
      }

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolCall.id,
        content: JSON.stringify(result)
      });
    }

    // Add tool results as user message
    currentMessages = [
      ...currentMessages,
      { role: 'user', content: toolResults }
    ];

    // If this was the last round, Claude's next response will be text
    if (round === MAX_TOOL_ROUNDS - 1) {
      finalResponse = 'I ran into a complexity limit. Could you try a simpler request?';
    }
  }

  // Save conversation (only user/assistant text messages, not tool internals)
  const conversationToSave = buildSaveableHistory(currentMessages, finalResponse);
  await saveConversation(supabase, channelId, threadTs, conversationToSave, proposalId);

  return {
    response: finalResponse,
    proposalId,
    proposalAction,
    proposalSummary
  };
}

/**
 * Build a simplified conversation history for storage.
 * Strips tool_use/tool_result blocks, keeps user text and assistant text.
 */
function buildSaveableHistory(messages, finalResponse) {
  const simplified = [];

  for (const msg of messages) {
    if (msg.role === 'user') {
      // Extract text content, skip tool_result arrays
      if (typeof msg.content === 'string') {
        // Strip thread context hint
        const cleanContent = msg.content.replace(/\n\n\[Thread context:.*?\]$/, '');
        simplified.push({ role: 'user', content: cleanContent });
      }
      // Skip tool_result messages (arrays)
    } else if (msg.role === 'assistant') {
      // Extract only text blocks from assistant responses
      if (Array.isArray(msg.content)) {
        const textParts = msg.content.filter(b => b.type === 'text').map(b => b.text);
        if (textParts.length > 0) {
          simplified.push({ role: 'assistant', content: textParts.join('\n') });
        }
      } else if (typeof msg.content === 'string') {
        simplified.push({ role: 'assistant', content: msg.content });
      }
    }
  }

  // Add the final response if not already captured
  if (finalResponse && (simplified.length === 0 || simplified[simplified.length - 1].content !== finalResponse)) {
    simplified.push({ role: 'assistant', content: finalResponse });
  }

  return simplified;
}

export { processSlackMessage, SYSTEM_PROMPT, TOOLS };
