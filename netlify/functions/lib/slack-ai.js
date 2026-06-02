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

const SYSTEM_PROMPT_TEXT = `You are Pro, Shortcut's internal proposal + sales-lead assistant on Slack.

Shortcut is a corporate wellness company that delivers in-person wellness experiences — chair massage, facials, nails, hair styling, makeup, headshots, and mindfulness workshops — to offices. You help the team create, edit, search, and manage proposals. You can also create and manage Stripe invoices — create invoices linked to proposals or standalone, search invoice history, and check payment status.

You ALSO handle sales-lead intelligence. Reps come to you with questions like "what is the deal with Beverly from Opensesame", "what's next on Lisa from Ghost Robotics", "did we ever talk to Anna Maria from Bank of Princeton". For those questions, call lookup_lead (NOT lookup_client — that's proposal-focused). lookup_lead returns the FULL picture: identity (including company_url), Workhuman tier and personal note (the in-person note from the conference), all contact channels we know (linkedin_url, phone with phone_source, personal_email, work email), firmographics (hq_location, industry, company_size), CRM company graph, pre-flight verdict, full email history with reply content + sentiment, multi-channel outreach_log (workhuman DM / linkedin connect / linkedin DM / email / sms — who reached out, when, via what channel), booth_signups (massage appointments they booked at our Workhuman booth with status), any existing proposals and landing pages, any sign-up links, AND ranked next-best actions. Use those next-best actions as your default recommendation, then offer to do them.

When asked about a Workhuman lead, proactively mention: tier, assignee, personal note, conference attendance, ALL contact channels we have (phone, LinkedIn, personal email when present), and whether they booked a massage at our booth. Don't be shy about surfacing the phone number or LinkedIn — those are why reps ask in the first place. If phone_source says "apollo_mobile_reveal", that's their personal cell; if "apollo_work_direct", that's their work direct. Call it out.

When a rep tells you "I just had a call with X", the natural next steps are usually:
  - create_proposal (use the create_proposal tool with the services/cadence they discussed)
  - create_landing_page (a personalized leave-behind for the prospect's wellness team)
  - create_signup_link (for employees to book once the event is approved)
You can chain these — confirm with the rep what was discussed, draft a proposal scaffold, ask which option fits, then create it. Always cite the personal-note text or the recent reply content as the basis for what you propose; don't invent details about the prospect (their team, their current vendors, their tools) — if it's not in the note or the reply, you don't know it.

When a rep asks you to *draft, write, compose, or send an email* to a lead — anything like "draft a follow-up for Beverly", "write a cold open to Larcy @ Schulz", "what should I send to jmcauliffe@philabar.org", "compose a reply for X" — call the draft_email tool. It runs the same brand-voice + anti-hallucination pipeline the digest uses and posts a preview in the rep's DM with Send/Cancel/etc buttons. The rep can hit Send right from Slack. Always confirm the recipient if ambiguous (multiple "Beverlys") before calling. After triggering, briefly tell the rep what's happening ("Drafting a follow-up to Beverly @ Opensesame — preview in your DM in ~10s") rather than re-listing what's in your reply.

When a rep asks "what should I do with X", call lookup_lead and surface the top 1-2 next_actions with their "why" field. Don't just dump everything — pick the most actionable based on the lead's stage.

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
6. *NEVER claim "I don't see X" about a contact's history, prior emails, replies, proposals, or signup links without calling lookup_lead FIRST.* If the rep asks "do you see the last email I sent" or "did you find the proposal" or "what's the history with this person" — your first action is to call lookup_lead (with email or name+company), THEN answer from what the tool returned. Saying "I don't see any email history" from conversation memory is the single most common Pro failure mode; the data is almost always there, you just didn't re-check. If lookup_lead genuinely returns empty, then say so — but only after the tool call. Same applies after the rep contradicts you ("yes I did email her, do you not see it?") — re-call lookup_lead before answering.
7. *You CAN read the body content of past emails. The read_thread tool exists for exactly this.* NEVER say any of these:
     - "I don't have access to the content of your email"
     - "The system doesn't show the body"
     - "I can see dates but not the actual email content"
     - "What was the focus of your last email?"
     - "Can you tell me what was in your last email?"
   These statements are factually WRONG because read_thread fetches the actual subject + body of recent thread messages from the rep's connected Gmail. The web CRM card on the sales-intelligence page uses the same underlying endpoint to render full thread bodies — Pro has the SAME access. Trigger phrasings for read_thread:
     - "what did I last say to <contact>" → read_thread first
     - "what was in my last email to <contact>" → read_thread first
     - "do you see my last email" → after lookup_lead, also read_thread to see content
     - About to draft a follow-up to anyone with prior thread history → read_thread to know what was already said
     - About to draft when emailed_count > 0 → read_thread (otherwise you'll restate things from the prior thread)
   If read_thread returns has_thread: false, THEN you can honestly say "I don't have a prior thread on file for this contact." But that comes AFTER the tool call, not before.

## Conversational Flow

When a user asks you to create a proposal:
0. **If the rep names a specific contact** (e.g. "for Anna Maria at Bank of Princeton", "create a proposal for Beverly @ Opensesame") — call lookup_lead FIRST with name + company. Pull the resolved email, title, company URL, personal-note text. You will pass these through to create_proposal as contactName / contactEmail / clientLogoUrl (via search_logo on the company domain) / customNote (grounded in the personal note or recent reply — NEVER invented). Skipping this step is the most common way the proposal ends up missing the contact, missing the right logo, and missing a personalized intro line. Always do it.
1. Call lookup_client to check for any prior proposal data for the company.
2. If any service details are missing, ask: service type, date, hours, number of pros, location/address.
3. If the user said "X appointments" without hours/pros, call calculate_pricing and present the options.
4. Call search_logo with the COMPANY DOMAIN (from lookup_lead.identity.company_url or workhuman.company_url, or guess the domain). Brandfetch is the default — only fall back to Brave if Brandfetch missed.
5. Summarize what you'll create back to the rep: "Here's what I'll create: [services + contactName + customNote]. Want me to go ahead?"
6. After user confirms, call create_proposal passing clientName, contactName, contactFirstName (override if the parser would split a compound name wrong like "Anna Maria"), contactEmail, clientLogoUrl, customNote, and events.
7. Report ONLY what the tool returned — exact URL, exact costs, exact appointment counts. Cite the source field on any logo ("Brandfetch", "Brave Search", "Clearbit") so the rep knows where the logo came from.

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

## QR Code Signs
- When a user says "create a QR code sign", "make a sign", "QR sign", or similar → call create_qr_code_sign.
- QR code signs are physical print signs (8.5" × 11") with a title, service image, event details, phone mockup, and QR code linking to a booking page.
- Service types for signs: massage, hair-beauty, headshot, nails, mindfulness, facial (max 3 per sign).
- When linking to a proposal, pass the proposalId — the tool will auto-fill partner name, logo, and services from the proposal.
- If the user provides a company name, event date, time, or location, build the eventDetails string with the format:
  "Service Type: Massage\\nDate: March 5th\\nTime: 1:00 PM - 5:00 PM\\nLocation: Quiet Room"
- The qrCodeUrl is the URL that the QR code will link to — typically a proposal link or booking page.
- Sign URLs follow the format: https://proposals.getshortcut.co/qr-code-sign/{uniqueToken}
- NEVER fabricate a sign URL. ALWAYS use the exact "url" field returned by the tool.
- After creating a sign, share the URL so the user can view/print it.
- To see existing signs, use list_qr_code_signs. To view a specific sign, use get_qr_code_sign.

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
- add_service: Add a service at a location/date. If the date doesn't exist yet, it will be created automatically.
- remove_service: Remove a single service by index from a location/date
- remove_date: Remove an entire day (all services on that date) from a location. Requires location and date.
- update_service: Change service fields (totalHours, numPros, appTime, hourlyRate, etc.)
- move_service: Reorder a service within its date (direction: -1 to move up, 1 to move down). The new order shows up on the client view.
- set_recurring: Make a service recurring (frequency: { type: "quarterly"|"monthly"|"custom", occurrences: number })
- remove_recurring: Remove recurring from a service
- set_gratuity: Add gratuity (type: "percentage"|"dollar", value: number)
- remove_gratuity: Remove gratuity
- set_discount: Set discount percentage on a service
- add_pricing_options: Generate 3 pricing variants (standard, +25% hours, +50% hours) for a service
- remove_pricing_options: Drop pricing variants from a service
- select_pricing_option: Pick which variant is the default-selected one (location, date, serviceIndex, optionIndex)
- update_client_info: Update client name, email, or logo
- add_location: Add a new office location
- remove_location: Remove a location and all its services
- rename_location: Rename a location (oldName, newName)
- change_date: Move all services from one date to another at a location (location, oldDate, newDate)
- set_status: Change status (draft, pending, approved)
- update_customization: Update proposal display settings (legacy customization keys only)
- set_proposal_field: Set proposal-wide fields not covered by other ops. Required: field (one of "startUnselected", "signupLink", "signupLinkTitle", "signupLinkDescription", "heroTitle", "accountTeamMemberEmail") and value. Pass empty string or null to clear the field.

Field aliases for update_service: appointmentTime→appTime, hours→totalHours, pros→numPros, rate→hourlyRate, discount→discountPercent
update_service also accepts: massageType ("chair"|"table"|"massage"), nailsType ("nails"|"nails-hand-massage"), headshotTier ("basic"|"premium"|"executive"), mindfulnessType ("intro"|"drop-in"|"mindful-movement"), optionsSelectedDefault (false → service starts unchecked on the client view), optionsFrequency (default frequency on the "X per year" picker)

## V2 Client-View Controls (build-your-own + sidebar extras)
The redesigned client viewer lets staff shape how the proposal lands for the prospect. Use these when the user asks for behavior that doesn't fit standard ops.

### "Let the client build it" mode
- Set proposal-wide so every service starts unchecked on the client view. The price reads $0 until the prospect opts services in. Use this when sending a *menu*, not a fixed bundle.
- Operation: \`{ op: "set_proposal_field", field: "startUnselected", value: true }\` (or value: false to switch back).
- Per-service override: set \`optionsSelectedDefault: false\` on the service via update_service to force that one service unchecked, even when the proposal-wide flag is off.
- Per-service override the other way: set \`optionsSelectedDefault: true\` to keep one service pre-selected when the rest are opt-in.
- When you flip either flag, the server automatically clears the matching persisted selection state so the new default actually takes effect on the next client load.

### Test signup link (employee booking demo)
- Pastes a Coordinator test event URL so the prospect can step through the *employee* booking flow on a sample event. Surfaces as a "Try the demo" card in the client viewer's right rail (and just under the Approve CTA on mobile). Same field the post-call email template reads as "Test Signup Link".
- Set: \`{ op: "set_proposal_field", field: "signupLink", value: "https://admin.shortcutpros.com/#/signup/..." }\`
- Optional copy override: \`signupLinkTitle\` and \`signupLinkDescription\` change the card title + body. Leave them unset for brand defaults.

### Hero title override
- Default hero reads "{ClientName} wellness proposal". To override, set \`{ op: "set_proposal_field", field: "heroTitle", value: "..." }\`. Empty string clears back to the default.

### Account team override
- Default account-team card shows Jaimie. To switch, set \`{ op: "set_proposal_field", field: "accountTeamMemberEmail", value: "caren@getshortcut.co" }\` (or whichever team member's email).

## Pricing Options (V2 multi-option pricing card)
Each service can carry up to N pricing variants the client clicks between (e.g. Standard / Premium / Best Value).
- add_pricing_options spins up 3 variants based on the current service params (standard, +25% hours, +50% hours).
- select_pricing_option picks which one is selected when the client first lands — index 0 is the first variant. The selected option's totals become the headline price.
- remove_pricing_options drops the variants and goes back to a single-price service.
- The client viewer renders these as side-by-side cards above the Approve CTA — selecting one updates the live total instantly.

## Date Format
Always use YYYY-MM-DD format for dates (e.g., 2026-02-18).

## TBD Dates
When a user says the date is "TBD", "to be determined", "not yet confirmed", or asks to "check the date TBD box":
- Use the string "TBD" as the date value when creating a proposal (e.g., date: "TBD").
- To change an existing date to TBD, use change_date with newDate: "TBD".
- To change a TBD date to a real date, use change_date with oldDate: "TBD" and newDate: "2026-03-15".
- "TBD" is a fully supported date value — never ask the user for a placeholder date when they say TBD.

### Multiple TBD Days at the Same Location
When a proposal has multiple TBD events at the same location that should be separate days (e.g., "Day 1 headshots + Day 2 headshots, both TBD"), the system uses unique TBD keys:
- First TBD day: "TBD"
- Second TBD day: "TBD-2"
- Third TBD day: "TBD-3"
- etc.

When working with these proposals:
- Call get_proposal first to see the actual date keys (e.g., "TBD", "TBD-2").
- Use the exact TBD key shown in verifiedState when referencing a specific day (e.g., date: "TBD-2").
- To add a new TBD day at a location that already has a "TBD" day, use the next available key (e.g., date: "TBD-2") with add_service.
- To remove a specific TBD day, use remove_date with the exact key (e.g., date: "TBD-2").
- To change a specific TBD day to a real date, use change_date with the exact key (e.g., oldDate: "TBD-2", newDate: "2026-04-15").`;

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
    description: 'Create a new wellness service proposal for a client. Returns the proposal ID, URL, and cost summary. When the rep names a specific contact ("for Anna Maria at Bank of Princeton"), CALL lookup_lead FIRST to resolve their email, title, company URL, and any personal-note context, then pass that info through contactName + contactEmail (and clientLogoUrl via search_logo on the resolved company domain). Otherwise the proposal won\'t address them by name and you\'ll miss the lead\'s context.',
    input_schema: {
      type: 'object',
      properties: {
        clientName: { type: 'string', description: 'Client company name' },
        clientEmail: { type: 'string', description: 'Client contact email (optional) — pull from lookup_lead.identity.email when the rep named a person.' },
        clientLogoUrl: { type: 'string', description: 'URL to client company logo (optional, will be stored permanently). Use search_logo first to get a Brandfetch-quality URL.' },
        contactName: { type: 'string', description: 'Full name of the named contact this proposal is for (e.g. "Anna Maria Miller"). Pulled from lookup_lead.identity.name when the rep named a person. The proposal viewer renders "Hi {firstName}" using the parsed first name.' },
        contactFirstName: { type: 'string', description: 'Override first name (used when the parser would get it wrong, e.g. compound names like "Anna Maria")' },
        contactLastName: { type: 'string', description: 'Override last name' },
        customNote: { type: 'string', description: 'A short personalized intro note from Shortcut that appears at the top of the proposal (e.g. "Anna Maria — great catching up at Workhuman. Here\'s the cadence we discussed for the Bank of Princeton team."). Ground this in personal_note / history.replies content from lookup_lead — do NOT invent details.' },
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
              op: { type: 'string', description: 'Operation type: add_service, remove_service, remove_date, update_service, move_service, set_recurring, remove_recurring, set_gratuity, remove_gratuity, set_discount, update_client_info, add_location, remove_location, rename_location, change_date, set_status, update_customization, set_cle_state, add_pricing_options, remove_pricing_options, select_pricing_option, set_proposal_field' },
              location: { type: 'string' },
              date: { type: 'string' },
              serviceIndex: { type: 'integer' },
              service: { type: 'object', description: 'For add_service: the service config' },
              updates: { type: 'object', description: 'For update_service: field updates. Supports totalHours, numPros, appTime, hourlyRate, proHourly, earlyArrival, retouchingCost, discountPercent, classLength, fixedPrice, participants, mindfulnessType, headshotTier, massageType, nailsType, optionsSelectedDefault (boolean — when false, this service starts unchecked on the client view), optionsFrequency (integer — default frequency for the "X per year" picker)' },
              frequency: { type: 'object', description: 'For set_recurring: { type, occurrences }' },
              type: { type: 'string', description: 'For set_gratuity: percentage or dollar' },
              value: { description: 'For set_gratuity: the amount (number). For set_proposal_field: the value to write (type depends on field).' },
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
              cleState: { type: 'string', enum: ['NY', 'PA', 'CA', 'TX', 'FL'], description: 'For set_cle_state: which state\'s CLE accreditation applies' },
              direction: { type: 'integer', enum: [-1, 1], description: 'For move_service: -1 to move up, 1 to move down. Service swaps with its neighbour.' },
              optionIndex: { type: 'integer', description: 'For select_pricing_option: zero-based index of the pricing option to select.' },
              field: { type: 'string', enum: ['startUnselected', 'signupLink', 'signupLinkTitle', 'signupLinkDescription', 'heroTitle', 'accountTeamMemberEmail'], description: 'For set_proposal_field: which proposal-wide field to write.' }
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
    description: 'Find a company logo. Lookup order: (1) Brandfetch API by domain — the highest-quality source, returns SVG/PNG with brand-mark / wordmark / symbol metadata. (2) Brandfetch with guessed domains (companyname.com / .co / .io) when no domain was passed. (3) Brave Image Search as fallback (noisy — only used when Brandfetch had no match). (4) Clearbit as last resort. Returns a stored Supabase URL that can be used with update_client_info or create_proposal. When telling the rep where a logo came from, say "Brandfetch" / "Brave" / "Clearbit" based on the `source` field in the result.',
    input_schema: {
      type: 'object',
      properties: {
        companyName: { type: 'string', description: 'Company name to search for — use the FULL resolved name, not abbreviations (e.g., "Boston Consulting Group" not "BCG")' },
        domain: { type: 'string', description: 'Optional company website domain (e.g. "bcg.com", "burberry.com"). PASS WHENEVER YOU KNOW IT — Brandfetch has a much higher hit rate with an explicit domain than with name-guessed domains.' }
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
    }
  },
  // --- QR Code Sign Tools ---
  {
    name: 'create_qr_code_sign',
    description: 'Create a QR code sign for an event. Returns the sign ID and URL for viewing/printing. Can optionally link to an existing proposal to auto-fill partner info and services.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Event title for the sign (e.g., "Powin PDX Team, Your Massage Day Is Here")' },
        serviceTypes: {
          type: 'array',
          items: { type: 'string', enum: ['massage', 'hair-beauty', 'headshot', 'nails', 'mindfulness', 'facial'] },
          description: 'Array of 1-3 service types for the sign'
        },
        qrCodeUrl: { type: 'string', description: 'URL the QR code links to (e.g., proposal URL or booking page)' },
        eventDetails: { type: 'string', description: 'Multi-line event details. Format: "Service Type: Massage\\nDate: March 5th\\nTime: 1:00 PM - 5:00 PM\\nLocation: Quiet Room"' },
        partnerName: { type: 'string', description: 'Company/partner name' },
        partnerLogoUrl: { type: 'string', description: 'URL to partner logo' },
        proposalId: { type: 'string', description: 'UUID of a proposal to link — auto-fills partner info and services if not provided' }
      },
      required: ['title', 'serviceTypes', 'qrCodeUrl']
    }
  },
  {
    name: 'get_qr_code_sign',
    description: 'Get details of a specific QR code sign by ID or unique token.',
    input_schema: {
      type: 'object',
      properties: {
        signId: { type: 'string', description: 'UUID or unique token of the QR code sign' }
      },
      required: ['signId']
    }
  },
  {
    name: 'list_qr_code_signs',
    description: 'List QR code signs, optionally filtered by search term or service type.',
    input_schema: {
      type: 'object',
      properties: {
        searchTerm: { type: 'string', description: 'Filter by title or partner name' },
        serviceType: { type: 'string', enum: ['massage', 'hair-beauty', 'headshot', 'nails', 'mindfulness', 'facial'], description: 'Filter by service type' },
        limit: { type: 'integer', description: 'Max results to return (default 10)' }
      }
    }
  },
  {
    name: 'edit_qr_code_sign',
    description: 'Update an existing QR code sign. Only pass the fields you want to change.',
    input_schema: {
      type: 'object',
      properties: {
        signId: { type: 'string', description: 'UUID of the QR code sign to edit' },
        title: { type: 'string', description: 'New event title' },
        eventDetails: { type: 'string', description: 'New event details' },
        qrCodeUrl: { type: 'string', description: 'New QR code URL' },
        serviceTypes: {
          type: 'array',
          items: { type: 'string', enum: ['massage', 'hair-beauty', 'headshot', 'nails', 'mindfulness', 'facial'] },
          description: 'New service types (1-3)'
        },
        partnerName: { type: 'string', description: 'New partner name' },
        partnerLogoUrl: { type: 'string', description: 'New partner logo URL' },
        status: { type: 'string', enum: ['draft', 'published', 'archived'], description: 'New status' }
      },
      required: ['signId']
    }
  },
  {
    name: 'create_invoice',
    description: 'Create and send a Stripe invoice to a client. Can be linked to an existing proposal or created standalone. Always confirm line items and amount with the user before calling this tool.',
    input_schema: {
      type: 'object',
      properties: {
        proposalId: { type: 'string', description: 'UUID of proposal to invoice (optional — omit for standalone invoices)' },
        clientName: { type: 'string', description: 'Client company name' },
        clientEmail: { type: 'string', description: 'Client email address for invoice delivery' },
        lineItems: {
          type: 'array',
          description: 'Line items for the invoice',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string', description: 'Line item description' },
              amount: { type: 'number', description: 'Amount in dollars (e.g. 1500.00)' }
            },
            required: ['description', 'amount']
          }
        },
        daysUntilDue: { type: 'integer', description: 'Payment due in N days (default 30)' }
      },
      required: ['clientEmail', 'lineItems']
    }
  },
  {
    name: 'search_invoices',
    description: 'Search for Stripe invoices by client name, status, or linked proposal ID. Returns a list of matching invoices.',
    input_schema: {
      type: 'object',
      properties: {
        clientName: { type: 'string', description: 'Client name to search (partial match)' },
        status: { type: 'string', enum: ['draft', 'open', 'sent', 'paid', 'uncollectible', 'void'], description: 'Filter by invoice status' },
        proposalId: { type: 'string', description: 'Filter by linked proposal UUID' },
        limit: { type: 'integer', description: 'Max results to return (default 10)' }
      }
    }
  },
  {
    name: 'get_invoice',
    description: 'Get full details of a specific invoice by its database ID or Stripe invoice ID (starts with "in_").',
    input_schema: {
      type: 'object',
      properties: {
        invoiceId: { type: 'string', description: 'Database UUID or Stripe invoice ID' }
      },
      required: ['invoiceId']
    }
  },
  {
    name: 'lookup_lead',
    description: 'Get the FULL picture for a sales lead/contact: identity, Workhuman lead context (tier, personal note text + author/timestamp, outreach status, all contact channels including phone + LinkedIn + personal email, firmographics, landing page, conference attendance, VIP slot, booth massage signups, multi-channel outreach log), CRM company graph (trajectory, activity status, completed events, sites we serve), pre-flight verdict (suppression / client / contacted), full email history SUMMARY (dates, counts, reply snippets — NOT full message bodies), any existing proposals for the company, any event sign-up links. Also returns ranked next-best actions. Use this FIRST whenever a user asks about a contact, lead, or person. When the user references someone by "FirstName from Company" (e.g. "Beverly from Opensesame"), pass BOTH name and company so we can resolve them in workhuman_leads even without an email. **Companion tool: read_thread.** lookup_lead gives you dates + snippet summaries; read_thread gives you the actual PROSE of past sent emails (subject + body). If the user asks about email CONTENT, or you\'re about to draft a follow-up to anyone with prior thread history, chain lookup_lead → read_thread so you have both.',
    input_schema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Contact email (preferred — most precise)' },
        name: { type: 'string', description: 'Contact name (first, last, or full). Use when the user references them by name and you don\'t have the email yet. Combine with company for best precision.' },
        domain: { type: 'string', description: 'Company domain (e.g. opensesame.com) — used when email is unknown' },
        company: { type: 'string', description: 'Company name — fallback when neither email nor domain is known. Always pair with name when resolving "FirstName from Company".' }
      }
    }
  },
  {
    name: 'next_actions_for_lead',
    description: 'Return ranked next-best actions for a lead given the current picture (replied → create proposal, never emailed → draft cold open, has proposal but no sign-up link → create one, etc.). Use this when the user asks "what should I do with X" or "what is next for X." Note: lookup_lead ALREADY includes these, so prefer lookup_lead for richer context.',
    input_schema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Contact email' }
      },
      required: ['email']
    }
  },
  {
    name: 'suppress_lead',
    description: 'Hide a contact from the CRM — they will be filtered from the daily digest, follow-up queue, contact-card searches, and Pro lookups. Use when the rep tells you a contact is NOT a sales lead: a personal contact ("that\'s my therapist", "that\'s my doctor", "my family member"), an internal teammate the system mis-categorized, a vendor we buy from, an automated/bot address, or just an address showing up by mistake. Phrasings to recognize: "hide X", "remove X from CRM", "X is my therapist", "mark X as personal", "X isn\'t a sales lead", "exclude X from the digest". Reversible — call unsuppress_lead if the rep changes their mind. Always confirm with the rep before calling this tool so you don\'t accidentally hide a real lead.',
    input_schema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'The email address to hide (e.g. pmkmsw@gmail.com)' },
        reason: { type: 'string', enum: ['personal', 'internal', 'vendor', 'automated', 'mistake', 'do_not_contact'], description: 'Why to hide. "personal" = personal contact like a therapist/doctor/family. "internal" = teammate mis-categorized. "vendor" = a vendor we buy from. "automated" = bot/mailer. "mistake" = wrong address showing up. "do_not_contact" = unsubscribe / DNC.' },
        detail: { type: 'string', description: 'Optional free-text note explaining why (e.g. "Will\'s therapist") so future reps see context.' }
      },
      required: ['email', 'reason']
    }
  },
  {
    name: 'unsuppress_lead',
    description: 'Restore a contact that was previously hidden from the CRM. Use when the rep wants a previously-suppressed contact back in the digest / follow-up queue — they changed roles, moved to a sales-relevant company, or were hidden by mistake. Phrasings to recognize: "restore X", "unhide X", "bring X back", "X is a real lead now".',
    input_schema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'The email address to restore' }
      },
      required: ['email']
    }
  },
  {
    name: 'list_broker_queue',
    description: 'List the broker GTM contacts assigned to a rep (Will or Caren). Shows the rep their stack of healthcare-broker and carrier-HEC prospects from the Sprint 1 Apollo discovery (~150 contacts at firms like OneDigital, NFP, EPIC, Sequoia, Cigna, Aetna, Anthem). Use when the rep asks "what brokers should I work today", "show me my broker queue", "what\'s in my carrier HEC stack", or similar. Returns email + name + title + firm + priority rank + whether they\'ve been emailed yet. Filter by track (\'broker\' or \'carrier_hec\') or status (\'untouched\' = never emailed, \'in_flight\' = emailed but no reply, \'replied\' = warm) to narrow. After they pick a contact, chain to lookup_lead + draft_email for the actual outreach.',
    input_schema: {
      type: 'object',
      properties: {
        rep: { type: 'string', description: 'Rep email — defaults to the rep who DMed Pro. Pass "will@getshortcut.co" or "caren@getshortcut.co" to override (e.g. Will inspecting Caren\'s queue).' },
        track: { type: 'string', enum: ['broker', 'carrier_hec'], description: 'Filter to one track. Omit to see both.' },
        status: { type: 'string', enum: ['untouched', 'in_flight', 'replied'], description: 'Filter by outreach state. Default returns all.' },
        limit: { type: 'integer', description: 'Max contacts to return (default 15, max 50).' }
      }
    }
  },
  {
    name: 'read_thread',
    description: 'Read the actual email body content from the rep\'s Gmail for the most recent thread with a contact. Use this BEFORE drafting a follow-up so you know what was already said in the prior emails — never ask the rep "what was the focus of your last email?" when you can just read it. Returns subject + body of recent messages (both directions). Pair with lookup_lead: lookup_lead gives you dates/counts/reply-snippets from the DB, read_thread gives you the actual prose. CALL this whenever: (a) the rep references an email "I sent" or "their reply", (b) you\'re about to draft a follow-up and want to avoid restating things already in the thread, (c) the rep asks "what did I last say" or "what was in my last email". Requires the rep\'s Gmail to be connected (digest opt-in flow). Returns null body if Gmail isn\'t reachable.',
    input_schema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Contact email (the prospect, not the rep). Pulls the most recent thread with this contact from the rep\'s Gmail.' },
        maxMessages: { type: 'integer', description: 'How many recent messages from the thread to return (default 4, max 10).' }
      },
      required: ['email']
    }
  },
  {
    name: 'edit_draft',
    description: 'Revise the most recent draft email in the current conversation. Use this when the rep is iterating on a draft Pro already posted — phrasings like "make it shorter", "drop the line about touring the space", "mention that we serve Fortune 500 wellness teams", "tighten the closing", "change the call ask to Thursday specifically". The edit happens IN PLACE on the existing draft preview message (chat.update) so the conversation stays clean. Subject + body are revised together. Same brand voice, anti-hallucination, and URL formatting rules apply. If the rep asks for a change but it\'s ambiguous which draft (multiple recent), ask them to clarify which lead. Edits land in DM within ~5s.',
    input_schema: {
      type: 'object',
      properties: {
        editInstructions: { type: 'string', description: 'The rep\'s requested change verbatim (e.g. "drop the line about touring the space" or "make it half as long and mention we serve Fortune 500 wellness teams"). This is what the LLM uses to revise the draft.' },
        email: { type: 'string', description: 'Optional recipient email — narrows to the draft for that specific lead when multiple recent drafts exist. If omitted, edits the rep\'s most recent draft.' },
        name: { type: 'string', description: 'Optional lead name — used to resolve recipient email when the rep says "edit the draft to Jen".' },
        company: { type: 'string', description: 'Optional company name — pair with name to disambiguate.' }
      },
      required: ['editInstructions']
    }
  },
  {
    name: 'draft_email',
    description: 'Generate a follow-up or cold-open email to a specific lead using Shortcut\'s brand voice + anti-hallucination rules, post the preview in the rep\'s DM with Send / Show angles / Edit in browser / Cancel buttons. Use this whenever the rep asks you to draft, write, or compose an email to a lead in Slack — phrasings like "draft a follow-up for Beverly", "write a cold open to Larcy @ Schulz", "compose an email to jmcauliffe@philabar.org", "draft an email to <name> @ <company>", "follow-up draft for X", "what should I send to Y". You can also chain this AFTER lookup_lead when the picture suggests a draft is the obvious next move. **CRITICAL: when the rep gives you ANY specific instructions about what the email should contain or accomplish — present a proposal, share a signup link, ask for a tour, schedule a call, mention a specific service, reference a specific event, etc. — pass that full instruction text verbatim in the `instructions` parameter.** The LLM uses `instructions` as the HIGHEST-PRIORITY guidance for what the email is for. Without it, the draft falls back to a generic follow-up shape that ignores what the rep actually wanted. Pre-flight gate runs on send so suppressed/client/DNC contacts are blocked automatically. Confirm the recipient with the rep before calling if their identification is ambiguous. The draft preview lands in DM within ~10s.',
    input_schema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Recipient email (preferred — most precise). If unknown, pass name + company and Pro will resolve.' },
        name: { type: 'string', description: 'Lead name (first, last, or full) — used to resolve when email is unknown.' },
        company: { type: 'string', description: 'Company name — pair with name to resolve "FirstName from Company"-style references.' },
        mode: { type: 'string', enum: ['auto', 'follow_up', 'first_outreach'], description: '"auto" (default) infers from history. "follow_up" forces a follow-up tone (continues a thread). "first_outreach" forces a cold-open tone (no prior contact assumed — uses Workhuman personal-note if present).' },
        instructions: { type: 'string', description: 'The rep\'s OWN instructions about what this email should do. Pass the rep\'s message verbatim (e.g. "Present the Bench Bar proposal and the signup link. Mention we can customize the signup copy. Ask for a follow-up call after she reviews and offer to tour the space together."). This is the SINGLE most important parameter when the rep tells you what to write — it goes to the LLM as the primary brief, overriding the default follow-up shape. Omit only when the rep just says "draft a follow-up" with no specifics.' },
        proposalIds: { type: 'array', items: { type: 'string' }, description: 'Optional proposal UUIDs to reference in the email. Pro should look these up via search_proposals or lookup_lead first, then pass them so the draft includes their share URLs.' },
        signupUrls: { type: 'array', items: { type: 'string' }, description: 'Optional signup link URLs (e.g. https://admin.shortcutpros.com/#/signup/iZdLEoviVK) to reference in the email. Pass when the rep mentions a signup link or when lookup_lead surfaces one.' }
      }
    },
    cache_control: { type: 'ephemeral' }  // Cache breakpoint 1: all tool definitions (must be on LAST tool)
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

      const result = await executeTool(toolCall.name, toolCall.input, supabase, userId, { channelId, threadTs });

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
