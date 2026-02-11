/**
 * Slack AI — the brain of the Pro assistant.
 * System prompt, tool definitions, and Anthropic conversation loop.
 */

import Anthropic from '@anthropic-ai/sdk';
import { executeTool } from './slack-tools.js';
import { getConversation, saveConversation } from './slack-conversation-store.js';

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOOL_ROUNDS = 8; // Safety limit on tool call loops

// --- System Prompt ---
// Wrapped in an array of content blocks for prompt caching.
// cache_control on the last block tells Anthropic to cache tools + system prompt.

const SYSTEM_PROMPT_TEXT = `You are Pro, Shortcut's internal proposal assistant on Slack.

Shortcut is a corporate wellness company that delivers in-person wellness experiences — chair massage, facials, nails, hair styling, makeup, headshots, and mindfulness workshops — to offices. You help the team create, edit, search, and manage proposals.

Be concise, calm, and practical. Format your responses for easy reading in Slack:
- Use *bold* for labels, client names, totals, and key info.
- Use bullet points for lists — keep each bullet to one line when possible.
- Format dollar amounts with commas (e.g., $1,350.00).
- When showing proposal search results, format each proposal as a clear block:
  *Proposal Name/Client* — Status
  • *Total:* $X,XXX | *Appts:* XX
  • *Services:* massage, nails, etc.
  • *Date:* Month DD, YYYY | *Location:* City
  • *ID:* proposal-uuid
  Add a blank line between proposals for readability.
- When confirming what you're about to create, use a clear summary block with bold labels.
- When reporting a completed action, lead with the result and link, then details below.

## CRITICAL RULES — Read These First

1. *NEVER claim you did something unless a tool returned a success result.* If a tool returned an error, say it failed and what went wrong. If you didn't call a tool, don't say the action happened.
2. *ALWAYS use the EXACT URL returned by a tool.* Never construct, rewrite, guess, or shorten URLs. Copy the "url" field from the tool result verbatim. This applies to proposal URLs, landing page URLs, and all other links. If you don't have a URL from a tool result, say you don't have the link — never make one up.
3. *ALWAYS confirm details with the user BEFORE creating a proposal.* Summarize what you're about to build and ask "Want me to go ahead?" UNLESS they gave you every detail (service type, hours, pros, date, location).
4. *After editing a proposal, check the "verifiedState" in the tool result.* Report what you see in verifiedState as the confirmed current state — not what you assumed would happen.
5. *ONLY report numbers, services, and totals that appear in the tool result.* Never calculate or assume costs on your own — always use the summary/verifiedState data from the tool.

## Conversational Flow

When a user asks you to create a proposal:
1. Call lookup_client to check for existing data.
2. If any of these are missing, ask: service type, date, hours, number of pros, location/address.
3. If the user said "X appointments" without hours/pros, call calculate_pricing and present the options.
4. Once you have all the details, summarize them back: "Here's what I'll create: [details]. Want me to go ahead?"
5. After user confirms (or if they gave you every detail up front), create the proposal.
6. Report ONLY what the tool returned — the exact URL, exact costs, exact appointment counts.

When a user asks you to edit a proposal:
1. Call get_proposal first to see the current structure (locations, dates, services, indices).
2. Apply the edit.
3. The edit_proposal tool automatically verifies the result — check the "verifiedState" field in the response.
4. Report the confirmed state from verifiedState. If something doesn't match expectations, say so.

When a user mentions a client:
- Always call lookup_client first — don't skip it.

## Services & Pricing

### Standard Services
| Service | Appt Time | Default Hours | Default Pros | Hourly Rate | Pro Rate | Early Arrival |
|---------|-----------|---------------|--------------|-------------|----------|---------------|
| massage | 20 min | 4 hrs | 2 | $135/hr | $50/hr | $25 |
| facial | 20 min | 4 hrs | 2 | $135/hr | $50/hr | $25 |
| nails | 30 min | 6 hrs | 2 | $135/hr | $50/hr | $25 |
| nails (hand massage) | 35 min | 6 hrs | 2 | $135/hr | $50/hr | $25 |
| hair | 30 min | 6 hrs | 2 | $135/hr | $50/hr | $25 |
| makeup | 30 min | 4 hrs | 2 | $135/hr | $50/hr | $25 |
| hair-makeup | 20 min | 4 hrs | 2 | $135/hr | $50/hr | $25 |
| headshot-hair-makeup | 20 min | 4 hrs | 2 | $135/hr | $50/hr | $25 |

### Massage Types
Massage services have an optional massageType field: "chair", "table", or "massage" (general).
- Pass massageType in the event object when creating, or in updates when editing.
- If user says "chair massage" → serviceType: "massage", massageType: "chair"
- If user says "table massage" → serviceType: "massage", massageType: "table"

### Nails Types
Nails services have an optional nailsType field: "nails" (classic, 30 min) or "nails-hand-massage" (35 min).
- Pass nailsType in the event object when creating, or in updates when editing.
- If user says "nails" or "manicure" → serviceType: "nails", nailsType: "nails"
- If user says "nails and hand massage" or "mani with hand massage" → serviceType: "nails", nailsType: "nails-hand-massage"

### Headshot Tiers
| Tier | Pro Rate | Retouching | Appt Time | Default Hours |
|------|----------|------------|-----------|---------------|
| basic (default) | $400/hr | $40/photo | 12 min | 5 hrs |
| premium | $500/hr | $50/photo | 12 min | 5 hrs |
| executive | $600/hr | $60/photo | 12 min | 5 hrs |

Headshot cost = (numPros × totalHours × proHourly) + (totalAppointments × retouchingCost).
Pass headshotTier: "basic", "premium", or "executive" to set the tier.

### Mindfulness Programs (ALL fixed-price, 1 facilitator)
| serviceType | Name | Class Length | Fixed Price |
|-------------|------|-------------|-------------|
| mindfulness | Intro to Mindfulness | 45 min | $1,375 |
| mindfulness-soles | Soles of the Feet | 30 min | $1,250 |
| mindfulness-movement | Mindful Movement | 30 min | $1,250 |
| mindfulness-pro | Pro Mindfulness | 45 min | $1,375 |
| mindfulness-cle | Pause, Breathe, Lead: Mindfulness for Ethical Decision-Making (CLE Ethics, 1.0 credit) | 60 min | $3,000 |
| mindfulness-pro-reactivity | Pro Reactivity | 45 min | $1,375 |

Each mindfulness type is a SEPARATE serviceType value — use the full string (e.g., "mindfulness-cle", NOT "mindfulness" with a sub-type).
When a user says "CLE course" or "CLE mindfulness" → use serviceType: "mindfulness-cle".
When a user says "soles of the feet" → use serviceType: "mindfulness-soles".
When a user says "mindful movement" → use serviceType: "mindfulness-movement".

### CLE State Accreditation
For CLE proposals, set cleState to the state where accreditation applies (NY, PA, CA, TX, FL). This determines which state's CLE board is referenced in the proposal. If not specified, the system infers from the office address or defaults to NY. Use set_cle_state edit operation to change it on existing proposals.

### Pricing Formulas
- Standard services: cost = numPros × totalHours × hourlyRate + earlyArrival.
- Headshots: cost = (numPros × totalHours × proHourly) + (totalAppointments × retouchingCost).
- Mindfulness: fixed price per session (see table above).
- Appointments per pro per hour = 60 / appTime.

## Recurring Discounts
- 4-8 occurrences (quarterly): 15% discount
- 9+ occurrences (monthly): 20% discount
Discounts apply to the service cost.

## Locations
- locationName is a SHORT label like "NYC", "SF Office", "LA HQ", "Main Office" — NOT a street address.
- officeAddress is the full street address like "350 5th Ave, New York NY 10118".
- When a user says "at 123 Main St in Chicago", use locationName: "Chicago" and officeAddress: "123 Main St, Chicago IL".
- When a user mentions a city or area, infer a short locationName from it. Never put a full address as the locationName.
- When adding a service to an existing proposal, use the SAME locationName and date that already exist on the proposal. Call get_proposal first if you're unsure.

## Logos

### Step 1: Resolve the company name
- ALWAYS call lookup_client FIRST to check if the company exists in our system. Users often use abbreviations (e.g. "BCG" for "Boston Consulting Group", "PwC" for "PricewaterhouseCoopers").
- If lookup_client finds a match, use the FULL company name from our system for all subsequent steps.
- If lookup_client returns multiple matches, pick the one with the most proposals (most likely the intended client).

### Step 2: Find the logo
- Call search_logo with the FULL resolved company name (never abbreviations).
- If you know the company's website domain, pass it as the "domain" parameter (e.g. domain: "bcg.com") — this gives the most reliable results.
- search_logo checks existing proposals first (partial match), then Clearbit, then Brave Search.

### Step 3: Preview before applying — MANDATORY
- NEVER auto-apply a logo. After finding a logo URL, ALWAYS show it to the user and ask for confirmation.
- Format: "I found this logo for [Company]: [URL] — should I apply it?"
- Do NOT pass clientLogoUrl in create_proposal. Create the proposal first WITHOUT a logo, then search for the logo separately.
- Only apply the logo via edit_proposal with update_client_info AFTER the user confirms.

### Step 4: Verify
- After editing a logo, check verifiedState.clientLogoUrl to confirm it was actually set. If it's null, tell the user the logo wasn't applied.
- NEVER claim a logo was added unless verifiedState.clientLogoUrl contains a URL.

## Gratuity
- To add gratuity, use the set_gratuity operation with type ("percentage" or "dollar") and value.
  - Example: "add 20% gratuity" → { op: "set_gratuity", type: "percentage", value: 20 }
  - Example: "add $200 gratuity" → { op: "set_gratuity", type: "dollar", value: 200 }
- set_gratuity does NOT require location/date/serviceIndex — it applies to the entire proposal.
- After setting gratuity, check verifiedState.gratuity to confirm it was applied.
- To remove gratuity, use remove_gratuity (no parameters needed).

## Generic Landing Pages
- When a user says "create a landing page", "generic landing page", "partner page", or anything similar → call the create_landing_page tool. Do NOT skip the tool call.
- The create_landing_page tool requires partnerName. Optional fields: partnerLogoUrl, clientEmail, customMessage, isReturningClient, customization (theme, includePricingCalculator, includeTestimonials, includeFAQ).
- The tool automatically searches for the client's logo (existing proposals → Brave → Clearbit) if you don't provide partnerLogoUrl. Check the result's logoApplied and logoUrl fields to confirm.
- The CORRECT URL format is: https://proposals.getshortcut.co/generic-landing-page/{uniqueToken}
- NEVER fabricate a landing page URL. ALWAYS use the exact "url" field returned by the create_landing_page tool result. If the tool fails, say it failed — don't make up a URL.
- If the user says "mark them as a returning/recurring client", set isReturningClient: true.
- After creating the landing page, report whether a logo was found. If logoApplied is false, tell the user: "I couldn't find a logo — if you have one, send me the URL and I can update the page."

## Key Behaviors
1. When a client name is mentioned, ALWAYS call lookup_client first to check for existing data (logo, locations, past proposals).
2. When the user says "X appointments" but doesn't specify hours and pros, call calculate_pricing to show staffing options.
3. When ambiguous, ask a clarifying question — don't guess service type, staffing, or dates.
4. Remember the proposal context within this thread. If the user says "make it recurring," apply it to the proposal you just created or last discussed.
5. For edit operations, you need to know the proposal's location, date, and service index. If you're not sure, call get_proposal first to see the current structure.
6. When adding a new service to an existing proposal, ALWAYS call get_proposal first to get the existing location names and dates, then use those same values in your add_service operation.
7. NEVER describe an action as done if you haven't received a tool result confirming it. If in doubt, call get_proposal to verify.
8. After editing a logo, ALWAYS check verifiedState.clientLogoUrl. If it's null, the logo was NOT applied — tell the user honestly.

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
- rename_location: Rename a location (oldName, newName)
- change_date: Move all services from one date to another at a location (location, oldDate, newDate)
- set_status: Change status (draft, pending, approved)
- update_customization: Update proposal display settings

Field aliases for update_service: appointmentTime→appTime, hours→totalHours, pros→numPros, rate→hourlyRate, discount→discountPercent
update_service also accepts: massageType ("chair"|"table"|"massage"), nailsType ("nails"|"nails-hand-massage"), headshotTier ("basic"|"premium"|"executive"), mindfulnessType ("intro"|"drop-in"|"mindful-movement")

## Date Format
Always use YYYY-MM-DD format for dates (e.g., 2026-02-18).

## TBD Dates
When a user says the date is "TBD", "to be determined", "not yet confirmed", or asks to "check the date TBD box":
- Use the string "TBD" as the date value when creating a proposal (e.g., date: "TBD").
- To change an existing date to TBD, use change_date with newDate: "TBD".
- To change a TBD date to a real date, use change_date with oldDate: "TBD" and newDate: "2026-03-15".
- "TBD" is a fully supported date value — never ask the user for a placeholder date when they say TBD.`;

// Array format for prompt caching — cache_control on the last block
const SYSTEM_PROMPT = [
  {
    type: 'text',
    text: SYSTEM_PROMPT_TEXT,
    cache_control: { type: 'ephemeral' }  // Cache breakpoint 2: system prompt
  }
];

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
              serviceType: { type: 'string', enum: ['massage', 'facial', 'nails', 'hair', 'makeup', 'hair-makeup', 'headshot-hair-makeup', 'headshot', 'mindfulness', 'mindfulness-soles', 'mindfulness-movement', 'mindfulness-pro', 'mindfulness-cle', 'mindfulness-pro-reactivity'], description: 'Service type. For CLE mindfulness use "mindfulness-cle". For soles of the feet use "mindfulness-soles".' },
              massageType: { type: 'string', enum: ['chair', 'table', 'massage'], description: 'For massage services only: chair, table, or general massage' },
              nailsType: { type: 'string', enum: ['nails', 'nails-hand-massage'], description: 'For nails services only: classic nails (30 min) or nails + hand massages (35 min)' },
              headshotTier: { type: 'string', enum: ['basic', 'premium', 'executive'], description: 'For headshot services only: basic ($400/hr), premium ($500/hr), executive ($600/hr)' },
              locationName: { type: 'string', description: 'Short location name like "NYC", "SF Office", "LA HQ" — NOT a full street address' },
              officeAddress: { type: 'string', description: 'Full office street address (e.g., "350 5th Ave, New York NY 10118")' },
              date: { type: 'string', description: 'Event date in YYYY-MM-DD format, or "TBD" if the date is not yet confirmed' },
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
            required: ['serviceType', 'locationName', 'date', 'totalHours', 'numPros']
          }
        },
        notes: { type: 'string', description: 'Internal notes about this proposal' },
        cleState: { type: 'string', enum: ['NY', 'PA', 'CA', 'TX', 'FL'], description: 'For CLE proposals: which state\'s CLE accreditation applies. Inferred from office address if not set. Defaults to NY.' }
      },
      required: ['clientName', 'events']
    }
  },
  {
    name: 'edit_proposal',
    description: 'Edit an existing proposal by applying operations. Returns a "verifiedState" showing the confirmed state after edits — always report from verifiedState, not assumptions. Use get_proposal first if you need to see the current structure.',
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
              op: { type: 'string', description: 'Operation type: add_service, remove_service, update_service, set_recurring, remove_recurring, set_gratuity, remove_gratuity, set_discount, update_client_info, add_location, remove_location, rename_location, change_date, set_status, update_customization, set_cle_state' },
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
              customization: { type: 'object', description: 'For update_customization' },
              oldName: { type: 'string', description: 'For rename_location: current location name' },
              newName: { type: 'string', description: 'For rename_location: new location name' },
              oldDate: { type: 'string', description: 'For change_date: current date in YYYY-MM-DD format or "TBD"' },
              newDate: { type: 'string', description: 'For change_date: new date in YYYY-MM-DD format or "TBD"' },
              officeAddress: { type: 'string', description: 'For add_location: office street address' },
              cleState: { type: 'string', enum: ['NY', 'PA', 'CA', 'TX', 'FL'], description: 'For set_cle_state: which state\'s CLE accreditation applies' }
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
        serviceType: { type: 'string', enum: ['massage', 'facial', 'nails', 'hair', 'makeup', 'hair-makeup', 'headshot-hair-makeup', 'headshot'] },
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
    name: 'search_logo',
    description: 'Search for a company logo by name. First checks existing proposals, then uses Brave Search API and Clearbit. Returns a stored logo URL that can be used with update_client_info or create_proposal.',
    input_schema: {
      type: 'object',
      properties: {
        companyName: { type: 'string', description: 'Company name to search for — use the FULL resolved name, not abbreviations (e.g., "Boston Consulting Group" not "BCG")' },
        domain: { type: 'string', description: 'Optional company website domain (e.g. "bcg.com", "burberry.com"). If provided, uses Clearbit directly for the most reliable results.' }
      },
      required: ['companyName']
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
    description: 'Create a generic landing page for a partner or client. Use this whenever a user says "create a landing page", "generic landing page", "partner page", or similar. Returns the page ID and URL — always use the exact URL from the result.',
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
    },
    cache_control: { type: 'ephemeral' }  // Cache breakpoint 1: all tool definitions
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

    // Log cache performance metrics
    const usage = response.usage || {};
    console.log(`Pro [round ${round + 1}]: tokens — input: ${usage.input_tokens || 0}, cache_read: ${usage.cache_read_input_tokens || 0}, cache_create: ${usage.cache_creation_input_tokens || 0}, output: ${usage.output_tokens || 0}`);

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

export { processSlackMessage, SYSTEM_PROMPT, SYSTEM_PROMPT_TEXT, TOOLS };
