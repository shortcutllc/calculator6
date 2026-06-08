// Generate a draft locally using the EXACT prompts from the deployed
// slack-draft-async-background.js — so we can read the warm voice (or
// not) before round-tripping through Slack.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Pull the SYSTEM_PROMPT directly from the deployed file (same string the
// production handler uses)
const fileText = readFileSync(new URL('../../netlify/functions/slack-draft-async-background.js', import.meta.url), 'utf8');
const sysMatch = fileText.match(/const SYSTEM_PROMPT = `([\s\S]*?)`;/);
const SYSTEM_PROMPT = sysMatch[1].replace(/\\\\n/g, '\\n').replace(/\\`/g, '`');

// Pick a real contact: Marissa Reyes from Friends of the High Line (had a
// personal note from the Workhuman booth — this is the case Will called out
// as sounding wrong before the warm voice update)
const { leadPicture } = await import('../../netlify/functions/lib/lead-picture.js');
const pic = await leadPicture(sb, { name: 'Marissa Reyes', company: 'Friends of the High Line' });

const ctx = {
  mode: 'personal_first_outreach',
  rep_first_name: 'Will',
  prospect: {
    name: pic.identity?.name || 'Marissa Reyes',
    title: pic.identity?.title || null,
    company: pic.identity?.company || 'Friends of the High Line',
  },
  workhuman_context: pic.workhuman ? {
    tier: pic.workhuman.tier,
    personal_note: pic.workhuman.personal_note,
    personal_note_by: pic.workhuman.personal_note_by,
    conference_attendee: pic.workhuman.conference_attendee,
  } : null,
  history: { emailed_count: 0, last_sent_iso: null, days_since_last_email: null, this_is_touch_number: 1 },
};

console.log('=== CONTEXT going to the LLM ===');
console.log(JSON.stringify(ctx, null, 2));

const userPromptParts = [
  `Mode: ${ctx.mode}`,
  '',
  `Prospect context (JSON, only use what's here — do not invent the rest):`,
  JSON.stringify({
    rep_first_name: ctx.rep_first_name,
    prospect: ctx.prospect,
    workhuman_context: ctx.workhuman_context,
    history: ctx.history,
  }, null, 2),
  '',
  `Sign emails from: ${ctx.rep_first_name}`,
  '',
  `This is a FIRST OUTREACH to someone the rep ACTUALLY MET IN PERSON at the Workhuman conference. It is NOT a follow-up — there is no prior email. The hook is the in-person conversation itself.`,
  ctx.workhuman_context?.personal_note ? `\nYOUR PERSONAL NOTE from that conversation (THIS is your hook — reference something specific from it; do not invent specifics that aren't in the note):\n"${ctx.workhuman_context.personal_note}"` : '',
  '',
  'Shape:',
  '  • SALUTATION: "Hi <first-name>," using prospect.name — NEVER "Hi there,". This person is real and you met them.',
  '  • Length: short. Under 100 words.',
  '  • Open with a specific reference to the in-person moment grounded in the note. Sound like a human writing to someone they actually talked to.',
  '  • Time reference: just say "at Workhuman" or "at the booth" with NO time qualifier.',
  '  • Tone: warm, conversational, real human. Reference the conversation specifically.',
  '  • One concrete next step.',
  '  • Close: pick from WARM CLOSES in the system prompt ("Thank you again," / "Warmly," / "Warm regards," / "Looking forward to...").',
  '',
  'Return the JSON only.',
];

console.log('\n=== Calling Anthropic with the deployed SYSTEM_PROMPT ===');
const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
const msg = await anthropic.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 2000,
  system: SYSTEM_PROMPT,
  messages: [{ role: 'user', content: userPromptParts.filter(Boolean).join('\n') }],
});
const text = (msg.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('');
const jsonMatch = text.match(/\{[\s\S]*\}/);
const result = JSON.parse(jsonMatch[0]);

console.log('\n=== MEDIUM DRAFT ===');
const m = result.directions.find((d) => d.label === 'medium') || result.directions[0];
console.log(`Subject: ${m.subject}\n`);
console.log(m.body);
console.log(`\n=== Pro recommended: ${result.fight_for} ===`);
console.log(result.fight_for_reason);
