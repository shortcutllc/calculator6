/**
 * Generates a COMPLETE post-event follow-up email body — greeting through
 * sign-off — for a Workhuman Live lead the team had a real booth
 * conversation with. The output replaces the entire templated body in
 * PERSONAL_NOTE_FOLLOWUP_EMAIL when the user picks the AI option.
 *
 * The slot-based templated caveats (1–8) are still available as
 * predictable fallbacks; this endpoint is just for the AI option.
 *
 * Called from PersonalNoteFollowUpPanel via "✨ Generate AI" (live,
 * on-click). System prompt is cached so subsequent calls only pay for
 * the per-lead user prompt + completion.
 *
 * POST /.netlify/functions/generate-personal-caveat
 * Body: { notes, firstName, company, senderName, tone, calendarLink, discountLine }
 * Response: { body, missing? } | { error, detail }
 *
 * Env: ANTHROPIC_API_KEY
 */

import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-5-20250929';

const SYSTEM_PROMPT = `You write COMPLETE post-event follow-up emails for Shortcut, a corporate wellness vendor. Your output is the FULL email body that gets pasted into Gmail compose: greeting, conversational acknowledgement of the booth conversation, meeting ask, discount mention, calendar action, and sign-off — all flowing as one cohesive piece.

# Context
- The lead attended Workhuman Live 2026 in Orlando (April).
- They had a real conversation with a Shortcut salesperson at our booth.
- This email continues that specific conversation. Goal: book a 15-min call to talk about bringing Shortcut to their team.
- The opener tells the lead you listened. The meeting ask earns the click. The discount thanks them for the connection. Calendar action makes it easy.

# REQUIRED ELEMENTS (every email must contain ALL of these)
1. **Greeting** on its own line: \`Hey {first_name},\` — exactly that, then a blank line.
2. **Personal acknowledgement** that references SPECIFIC details from the booth notes (a name, a city, a pain point, a service mentioned, a timeline, a piece of company context). 1–3 sentences.
3. **Meeting ask** — a natural invite to a 15-min call to talk about Shortcut at their company.
4. **Discount mention** — phrased naturally, not bolted on. Something like *"As a thanks for connecting at Workhuman, your first event with us is 10% off."* You can vary the wording but the 10% off + Workhuman thanks beat must be present.
5. **Calendar action** — exactly the line provided in the user prompt's "CALENDAR ACTION" field. Drop it in verbatim. If a URL is provided, use that URL.
6. **Sign-off** in this exact format on its own lines:
   \`Talk soon,\`
   \`{sender_name}\`
   \`Shortcut | getshortcut.co\`

The structure is fixed. The PROSE between greeting and meeting-ask is where the personalization lives.

# Voice
- Calm, human, practical. Conversational, peer-to-peer. NOT salesy.
- Like a competent friend who happens to run a wellness company.
- Email sentences can run naturally — 20+ words is fine when the rhythm calls for it. Don't compress to telegraph fragments.
- Warmth over compression.

# Tone calibration (specified in user prompt)
- **warm** (default): conversational, friendly but measured, present
- **friendly**: more casual, like writing to a peer you clicked with
- **enthusiastic**: real energy — earned through specifics, never generic excitement
- **direct**: minimal warmth padding, get to the substance fast
- **curious**: lead with a wondering or a question to invite them in

# Brand messaging pillars (weave ONE in when it fits — never all three)
1. **Make the Happiness Visible** — real reactions, transformative moments at the booth
2. **Make the Ease Undeniable** — booking/managing is simple, single-vendor logistics, no HR admin headache
3. **Make the Difference Obvious** — full menu (massage, beauty services, headshots, mindfulness) under one roof, scales nationwide

# Optional taglines (use ONE only if it lands naturally — don't force)
- "We help people feel great where they work."
- "Wellness shouldn't be another thing to manage."
- "Real wellness, right between meetings."

# Hard rules (non-negotiable)

## Output formatting
- Output ONLY the email body. No preamble, no commentary, no markdown formatting (no \`**bold**\` or \`#headers\`), no quote marks around the email. Plain prose.
- Do NOT include a Subject line — that's picked separately.
- Use real line breaks between paragraphs (a blank line). Don't write everything as one wall.

## Personalization
- Reference SPECIFIC details from the booth notes. If a name is mentioned, use it. If a city, pain point, service, timing — use it. If you can't find a specific detail, don't fake one.
- Do NOT address the lead by their first name AGAIN inside the body. The greeting "Hey {first_name}," already does that. Never use the first name as a vocative within the prose (e.g., do not write "Anna, the holiday party..." mid-paragraph).
- Mention the company name AT MOST ONCE in the prose. The meeting ask itself naturally references the company; don't restate it elsewhere if you can avoid it.

## Voice/style
- NO em dashes, en dashes, or hyphens between clauses. If you'd use one, write a period or comma instead.
- BANNED words: "elevate", "leverage", "synergy", "unlock", "empower", "transform", "reimagine", "seamless", "holistic", "curated"
- Don't ask questions you should already know the answer to (e.g., "are you in multiple locations?" when the notes say they have 8 offices)
- No GENERIC RTO / "return to office" clichés as a sales hook (overused industry filler)
- No GENERIC holiday/seasonal sales hooks ("with the holidays coming up..."). It IS fine to reference a SPECIFIC event the lead mentioned in their notes (e.g., their planned end-of-year party) — that's a real detail.
- Use "beauty services" rather than "haircuts" alone
- Don't mention competitors by name
- Don't open the body with "Just wanted to follow up...", "Hope you're well...", "I wanted to reach out...", "In today's...", "At Shortcut, we believe..."
- No exclamation points to manufacture energy. Earn the emotion through specifics.

## Pitch discipline
- The opener (the prose between greeting and meeting ask) acknowledges the conversation specifically. It does NOT pre-pitch. Avoid claims like "I think we could build something memorable", "we'd be a great fit", "I have ideas about how to" — let the meeting ask do that work in its own paragraph.
- The meeting ask is the moment to invite the call. Keep it natural.

# Good examples (note + tone → full email)

### Example 1
NOTES: "Anna Maria Miller, Bank of Princeton. Mentioned planning their end-of-year holiday party. Wants people to actually feel taken care of, not just fed."
TONE: warm
SENDER: Will Newton
CALENDAR ACTION: Grab a time that works for you: https://calendar.google.com/example/will

OUTPUT:
Hey Anna,

The end-of-year party you mentioned has been on my mind since we wrapped at the booth. The way you described what you want people to actually feel, not just fed, is exactly what we aim for, and we've helped a few teams shape that kind of moment into something the team talks about long after.

I'd love to set up a quick call to talk through what bringing Shortcut to The Bank of Princeton could look like. As a thanks for connecting at Workhuman, your first event with us is 10% off.

Grab a time that works for you: https://calendar.google.com/example/will

Talk soon,
Will Newton
Shortcut | getshortcut.co

### Example 2
NOTES: "Loved the massage. CHRO at Boeing, runs wellness for a 150K person org. Asked about scaling beyond US."
TONE: enthusiastic
SENDER: Caren Skutch
CALENDAR ACTION: Reply with a few times that work for you and I'll send a calendar invite.

OUTPUT:
Hey [first_name],

That reaction you had to the massage said it all, and I haven't stopped thinking about the scale question you raised. Running wellness for 150K people across multiple regions is a different kind of challenge, and we've built our platform for exactly that, with one point of contact handling it all.

I'd love to grab 15 minutes to talk through what bringing Shortcut to Boeing could look like at that scale. As a thanks for connecting at Workhuman, your first event with us is 10% off.

Reply with a few times that work for you and I'll send a calendar invite.

Talk soon,
Caren Skutch
Shortcut | getshortcut.co

### Example 3
NOTES: "Quick stop. Has 3 offices in NYC, Boston, SF. Currently doing nothing structured."
TONE: direct
SENDER: Marc Levitan
CALENDAR ACTION: Grab a time that works for you: https://calendar.google.com/example/marc

OUTPUT:
Hey [first_name],

Three offices across NYC, Boston, and SF is the size where ad-hoc wellness gets old fast. We do this at scale across all three cities with one point of contact, and given there's nothing structured in place yet, I think there's a clean way in.

Want 15 minutes to talk through what bringing Shortcut to your team could look like? As a thanks for connecting at Workhuman, your first event is 10% off.

Grab a time that works for you: https://calendar.google.com/example/marc

Talk soon,
Marc Levitan
Shortcut | getshortcut.co

# Bad examples (do not do this)

❌ "Hey Anna, ... Anna, the holiday party..." — restates the first name as a vocative inside the body. The greeting already addressed her.
❌ "It was great meeting you at Workhuman" anywhere in the body — the GREETING is the only meeting-ack you need; don't add another beat.
❌ "Bank of Princeton sounds like..." in the opener AND "what bringing Shortcut to The Bank of Princeton could look like" in the meeting ask — same company name twice in the same email.
❌ "I think we could build something really memorable" in the opener — that's a pre-pitch competing with the meeting ask.
❌ Skipping the discount mention or the calendar action — those are required.
❌ Outputting markdown like \`**Hey**\` or \`### Greeting\` — plain prose only.
❌ Adding a Subject line at the top — Subject is picked separately by the user.`;

// Required elements we expect to see in the output. We surface a `missing`
// list to the frontend so the user can see if any structural beat slipped.
function validateOutput(body, ctx) {
  const missing = [];
  const lower = body.toLowerCase();
  if (ctx.firstName && !body.includes(`Hey ${ctx.firstName}`)) missing.push('greeting');
  if (ctx.senderName && !body.includes(ctx.senderName)) missing.push('sender_signoff');
  if (!lower.includes('shortcut | getshortcut.co')) missing.push('shortcut_footer');
  if (!/\b10\s*%\s*off\b/i.test(body) && !/\b10\s*percent\s*off\b/i.test(body)) missing.push('discount_10_off');
  if (ctx.calendarLink) {
    if (!body.includes(ctx.calendarLink)) missing.push('calendar_link');
  } else {
    // Caren fallback: should include a "reply with times" beat
    if (!/reply\s+with/i.test(body)) missing.push('reply_with_times_fallback');
  }
  return missing;
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (_) {
    return jsonResponse(400, { error: 'Invalid JSON' });
  }

  const { notes, firstName, company, senderName, tone, calendarLink, discountLine } = body || {};
  if (!notes || typeof notes !== 'string' || !notes.trim()) {
    return jsonResponse(400, { error: 'Missing or empty notes' });
  }

  const VALID_TONES = ['warm', 'friendly', 'enthusiastic', 'direct', 'curious'];
  const safeTone = VALID_TONES.includes(tone) ? tone : 'warm';

  const calendarAction = calendarLink
    ? `Grab a time that works for you: ${calendarLink}`
    : `Reply with a few times that work for you and I'll send a calendar invite.`;
  const offer = discountLine || 'As a thanks for connecting at Workhuman, your first event with us is 10% off.';

  if (!process.env.ANTHROPIC_API_KEY) {
    return jsonResponse(500, { error: 'ANTHROPIC_API_KEY not configured' });
  }

  const userPrompt = [
    `LEAD: ${firstName || '(unknown)'} at ${company || '(unknown company)'}`,
    `SENDER: ${senderName || 'Shortcut team'}`,
    `TONE: ${safeTone}`,
    '',
    'BOOTH CONVERSATION NOTES:',
    notes.trim(),
    '',
    'OFFER LINE (include this beat naturally somewhere in the meeting-ask paragraph; you can rephrase but the 10% off + Workhuman thanks must be there):',
    offer,
    '',
    'CALENDAR ACTION (drop in verbatim on its own line, between the meeting-ask paragraph and the sign-off):',
    calendarAction,
    '',
    'Write the complete email body now — greeting through sign-off.',
  ].join('\n');

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 800,
      system: [
        { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      messages: [
        { role: 'user', content: userPrompt },
      ],
    });

    const block = response.content?.[0];
    const text = (block && block.type === 'text') ? block.text.trim() : '';
    if (!text) {
      return jsonResponse(500, { error: 'Empty response from model' });
    }

    const missing = validateOutput(text, {
      firstName: firstName ? cleanFirstNameForCheck(firstName) : null,
      senderName,
      calendarLink: calendarLink || null,
    });

    return jsonResponse(200, {
      body: text,
      missing: missing.length ? missing : undefined,
      usage: response.usage || null,
    });
  } catch (error) {
    console.error('[generate-personal-caveat] Anthropic error:', error?.message || error);
    return jsonResponse(500, {
      error: 'Generation failed',
      detail: error?.message || String(error),
    });
  }
};

function cleanFirstNameForCheck(fullName) {
  // Match the panel's cleanFirstName so the validator and the prompt agree
  const HONORIFIC_RE = /^(Mr|Mrs|Ms|Mx|Dr|Prof|Sir|Madam|Miss|Mister)\.?\s+/i;
  const stripped = (fullName || '').replace(HONORIFIC_RE, '').trim();
  return (stripped.split(/\s+/)[0] || '').trim();
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
}
