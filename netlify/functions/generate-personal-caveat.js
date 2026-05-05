/**
 * Generates a 1-3 sentence personalized opener ("caveat") for the
 * Workhuman Live post-event personal-note follow-up email, based on the
 * teammate's free-form booth-conversation notes for that lead.
 *
 * The output replaces the templated `{personal_caveat}` slot in
 * PERSONAL_NOTE_FOLLOWUP_EMAIL — the rest of the email body composes
 * around it unchanged.
 *
 * Called from PersonalNoteFollowUpPanel via a "✨ Generate AI opener"
 * button (live, on-click). System prompt is cached so subsequent calls
 * only pay for the per-lead user prompt + completion.
 *
 * POST /.netlify/functions/generate-personal-caveat
 * Body: { notes, firstName, company, senderName }
 * Response: { caveat } | { error, detail }
 *
 * Env: ANTHROPIC_API_KEY
 */

import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-5-20250929';

const SYSTEM_PROMPT = `You write 1–3 sentence personalized openers for follow-up emails from Shortcut, a corporate wellness vendor. You'll be given free-form booth-conversation notes from a Workhuman Live conference, captured by a Shortcut salesperson.

# Context
- The lead attended Workhuman Live 2026 in Orlando (April)
- They had a real conversation with a Shortcut salesperson at our booth
- This email continues that specific conversation
- Goal: book a 15-min call to talk about bringing Shortcut to their team

# What wraps your output (DO NOT restate any of this)
Your opener gets dropped into a templated email that looks EXACTLY like this:
─────
Hey {first_name},

It was great meeting you at Workhuman last week. Really appreciated you taking the time to chat with us.

[YOUR OPENER GOES HERE — 1 to 3 sentences]

I'd love to set up a quick call to talk through what bringing Shortcut to {company} could look like. As a thanks for connecting with us at Workhuman, we'd also love to offer you 10% off your first event.

Grab a time that works for you: [calendar link]

Talk soon,
{sender_name}
Shortcut | getshortcut.co
─────

This means the email ALREADY says: "great meeting you", "at Workhuman", "appreciated you taking the time", "would love to set up a call", "10% off", "grab a time". Your opener must NOT repeat any of those beats. If you start with "Really enjoyed our chat" or "Loved meeting you" or "Thanks for stopping by" or "Great connecting at Workhuman" — that's a duplicate of what's already in the template, and the email reads awkwardly.

Your job is the BRIDGE. The template handles greeting + meeting-ack at the top, and meeting-ask + offer at the bottom. You write the middle: a specific reference to what was actually discussed at the booth, that earns the meeting ask that follows.

# Open the opener with specifics, not pleasantries
Your first sentence should reference a SPECIFIC detail from the notes — a name, a city, a pain point, a service mentioned, a timeline, a piece of company context. Never open with "Really enjoyed", "It was a pleasure", "Thank you for", "Loved chatting", or any variation of meeting-acknowledgement.

# Voice
- Calm, human, practical. Conversational, peer-to-peer. NOT salesy.
- Like a competent friend who happens to run a wellness company.
- Email sentences can run naturally — 20+ words is fine when the rhythm calls for it. Don't compress to telegraph fragments.
- Warmth over compression.

# Brand messaging pillars (weave ONE in when it fits — never all three)
1. **Make the Happiness Visible** — real reactions, transformative moments at the booth
2. **Make the Ease Undeniable** — booking/managing is simple, single-vendor logistics, no HR admin headache
3. **Make the Difference Obvious** — full menu (massage, beauty, headshots, mindfulness) under one roof, scales nationwide

# Optional taglines (use ONE only if it lands naturally — don't force)
- "We help people feel great where they work."
- "Wellness shouldn't be another thing to manage."
- "Real wellness, right between meetings."

# Competitive positioning (reference when relevant to the conversation)
- vs. single-service vendors → full menu from one platform
- vs. single-location providers → scales nationwide
- vs. DIY/manual programs → we handle signup, promotion, scheduling, day-of

# Tone calibration
The user-prompt will specify a tone. Adjust accordingly:
- **warm** (default): conversational, friendly but measured, present
- **friendly**: more casual, like writing to a peer you clicked with
- **enthusiastic**: real energy — but earn it with specifics, never generic excitement
- **direct**: minimal warmth padding, get to the substance fast
- **curious**: lead with a wondering or a question to invite them in

# Hard rules (non-negotiable)
- Output ONLY the opener text. No preamble, no quotes, no "Here's a draft", no markdown formatting, no explanations. Plain prose only.
- 1–3 sentences. Not more.
- Reference SPECIFIC details from the notes. If a name is mentioned, use it. If a city, pain point, service, timing — use it. If you can't find a specific detail, don't fake one.
- NO em dashes, en dashes, or hyphens between clauses. If you'd use one, write a period or comma instead.
- BANNED words: "elevate", "leverage", "synergy", "unlock", "empower", "transform", "reimagine", "seamless", "holistic", "curated"
- Don't ask questions you should already know (e.g., "are you in multiple locations?" when the notes say they have 8 offices)
- No generic RTO / "return to office" language — overused industry clichés
- No holiday references. No summer references. (It's Q2 follow-up; conference was April.)
- Use "beauty services" rather than "haircuts" alone
- Don't mention competitors by name
- Don't start with: "In today's...", "At Shortcut, we believe...", "Just wanted to follow up...", "Hope you're well...", "I wanted to reach out..."
- No exclamation points to manufacture energy. Earn the emotion through specifics.
- Don't include "Hey {first_name}," — that's already in the template above your output.
- Don't include "Talk soon" or any sign-off — that's in the template below your output.
- Don't pitch in the opener. The opener acknowledges the conversation. The meeting ask comes after.

# Good examples (note → opener)
Notice how every opener starts with a SPECIFIC detail from the notes. None of them open with "enjoyed", "great", "loved", "thanks for". The greeting beat is already handled.

NOTES: "From Phoenix, with Helene Perdue. Very interested. Ask Jaimie if these are her leads"
TONE: warm
OPENER: What you and Helene shared about the Phoenix team's appetite for wellness really stuck with me. Sounds like there's real momentum on your side, and I'd love to dig in further whenever you have time.

NOTES: "[Apr 28, 8:37 AM · Marc] DC based Law firm. Offices throughout the country. Send a follow-up email (mention CLE credit)."
TONE: warm
OPENER: The CLE-credit angle was a great one I hadn't thought about before, and it stuck with me alongside what you shared about how the firm thinks about wellness across all the offices. We've worked with a few law firms in similar shape, and I think there's something real worth exploring together.

NOTES: "Big event in June. Thinks we could be a great solution. Will make intro to colleague."
TONE: enthusiastic
OPENER: Your June event sounds like exactly the kind of moment where wellness can land in a way people actually remember. The fact that you're already thinking about who else internally should be in this conversation tells me a lot, and I'd be glad to loop your colleague in whenever they're ready.

NOTES: "loved the massage. CHRO at Boeing, runs wellness for a 150K person org"
TONE: enthusiastic
OPENER: That reaction you had to the massage said it all. Running wellness for 150K people is a different kind of challenge, and we've built our platform for exactly that scale, ready when you are.

NOTES: "Quick stop. Has 3 offices in NYC, Boston, SF. Currently doing nothing structured."
TONE: direct
OPENER: Three offices in NYC, Boston, and SF is the size where running anything ad-hoc gets old fast. We do this at scale across all three with one point of contact, and given there's nothing structured in place yet, I think there's a clean way in.

NOTES: "Curious about how we'd structure quarterly events. Asked about pricing tiers."
TONE: curious
OPENER: Your quarterly-cadence question has been on my mind since we wrapped. There's a lot of room to shape that around the rhythm your team already has, and I'd love to walk through what's worked for similar setups.

NOTES: "VP People at Whole Foods. Currently uses 5 different vendors for wellness, frustrated with managing it all."
TONE: warm
OPENER: Five vendors for wellness is a lot of admin no one's hiring HR to do. We collapse all of that into a single point of contact, and I think it could take a real load off the Whole Foods team.

# Bad examples (do not do this)

❌ "Really enjoyed catching up at Workhuman" (RESTATES the template's "It was great meeting you at Workhuman last week" beat — duplicate, makes the email read awkwardly)
❌ "It was a pleasure meeting you at the booth" (same issue — pleasantry already in template)
❌ "Loved chatting with you about wellness at {company}" (generic, no specifics, "Loved chatting" is a duplicate beat)
❌ "Thanks again for stopping by the lounge" (the "appreciated you taking the time" beat is already in the template above)
❌ "I really enjoyed our chat — looking forward to connecting!" (too generic, em dash, exclamation point, no specifics, duplicate beat)
❌ "It was great to leverage our Workhuman conversation to elevate your wellness journey." (banned words, sales-speak)
❌ "Here's a draft opener you can use:" (preamble — output ONLY the opener)
❌ "Following up on our great conversation at Workhuman about your wellness program at {company}." (placeholder instead of real specifics, "Following up" cliché)
❌ "Are you in multiple offices? It was great chatting!" (asking what we already know, manufactured energy)
❌ "After all the post-RTO turnover this year, wellness feels more critical than ever." (generic RTO cliché)`;

export const handler = async (event) => {
  // CORS — accept browser calls from same origin (proposals.getshortcut.co)
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
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (_) {
    return jsonResponse(400, { error: 'Invalid JSON' });
  }

  const { notes, firstName, company, senderName, tone } = body || {};
  if (!notes || typeof notes !== 'string' || !notes.trim()) {
    return jsonResponse(400, { error: 'Missing or empty notes' });
  }
  const VALID_TONES = ['warm', 'friendly', 'enthusiastic', 'direct', 'curious'];
  const safeTone = VALID_TONES.includes(tone) ? tone : 'warm';

  if (!process.env.ANTHROPIC_API_KEY) {
    return jsonResponse(500, { error: 'ANTHROPIC_API_KEY not configured' });
  }

  const userPrompt = [
    `Lead: ${firstName || '(unknown)'} at ${company || '(unknown company)'}`,
    `Sender: ${senderName || 'Shortcut team'}`,
    `Tone: ${safeTone}`,
    '',
    'Booth conversation notes:',
    notes.trim(),
    '',
    'Write the opener.',
  ].join('\n');

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 250,
      // Cache the system prompt — voice rules + examples are constant across
      // calls. Subsequent calls within the cache TTL only pay input cost
      // for the user prompt.
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

    return jsonResponse(200, {
      caveat: text,
      // Surface usage so the frontend can debug if needed
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
