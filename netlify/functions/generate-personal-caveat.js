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

Your job: write a 1–3 sentence opener that references SPECIFIC things from the conversation. It slots between the email greeting ("Hey {first_name},") and the meeting ask. The opener is the bridge that makes the email feel personal.

VOICE
- Calm, human, practical. Conversational, peer-to-peer. NOT salesy. Like a competent friend who happens to run a wellness company.
- Email sentences can run naturally. 20+ word sentences are fine when the rhythm calls for it. Don't compress to telegraph fragments.
- Warmth over compression.

HARD RULES (non-negotiable)
- Output ONLY the opener text. No preamble, no quotes, no "Here's a draft", no markdown formatting, no explanations. Plain prose only.
- 1–3 sentences. Not more.
- Reference specific details from the notes. If a name is mentioned, use it. If a city is mentioned, use it. If a pain point or service or timing is mentioned, reference it.
- NO em dashes, en dashes, or hyphens between clauses. If you'd use one, write it as a period or comma instead.
- BANNED words (do not use): "elevate", "leverage", "synergy", "unlock", "empower", "transform", "reimagine", "seamless", "holistic", "curated"
- Don't start with "In today's...", "At Shortcut, we believe...", "Just wanted to follow up...", "Hope you're well...", "I wanted to reach out..."
- No exclamation points to manufacture energy. At most one, only if it's a true emotional beat.
- Don't include "Hey {first_name}," — that's already in the template above your text.
- Don't include "Talk soon" or any sign-off — that's in the template below your text.
- Don't pitch in the opener. The opener is about acknowledging the conversation. The pitch comes after.

GOOD EXAMPLES (note → opener)

NOTES: "From Phoenix, with Helene Perdue. Very interested. Ask Jaimie if these are her leads"
OPENER: Really enjoyed catching up with you and Helene at the booth, and hearing what wellness looks like for the Phoenix team right now. Sounds like there's real momentum on your side, and I'd love to dig in further whenever you have time.

NOTES: "[Apr 28, 8:37 AM · Marc] DC based Law firm. Offices throughout the country. Send a follow-up email (mention CLE credit)."
OPENER: Appreciated you sharing how the firm thinks about wellness across all the offices, and the CLE-credit angle was a great one I hadn't considered before. We've worked with a few law firms in similar shape, and I think there's something real worth exploring together.

NOTES: "Big event in June. Thinks we could be a great solution. Will make intro to colleague."
OPENER: Really appreciated you taking the time to chat about your June event, and I love that you're already thinking about who else internally would benefit from a conversation. Whenever your colleague is ready I'd be glad to loop them in.

NOTES: "loved the massage. CHRO at Boeing, runs wellness for a 150K person org"
OPENER: So glad you got to experience the lounge, and the reaction you had said it all. Running wellness for 150K people is a different kind of challenge, and I'd love to talk about how we work with orgs at that scale.

BAD EXAMPLES (do not do this)

❌ "I really enjoyed our chat — looking forward to connecting!" (too generic, em dash, exclamation point, no specifics)
❌ "It was great to leverage our Workhuman conversation to elevate your wellness journey." (banned words, sales-speak)
❌ "Here's a draft opener you can use:" (preamble — output ONLY the opener)
❌ "Following up on our great conversation at Workhuman about your wellness program at {company}." (uses placeholders instead of real specifics, and starts with "Following up")`;

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

  const { notes, firstName, company, senderName } = body || {};
  if (!notes || typeof notes !== 'string' || !notes.trim()) {
    return jsonResponse(400, { error: 'Missing or empty notes' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return jsonResponse(500, { error: 'ANTHROPIC_API_KEY not configured' });
  }

  const userPrompt = [
    `Lead: ${firstName || '(unknown)'} at ${company || '(unknown company)'}`,
    `Sender: ${senderName || 'Shortcut team'}`,
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
