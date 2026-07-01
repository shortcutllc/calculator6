/**
 * copy-judge.mjs — the LLM STRATEGIC-FIT JUDGE. The middle layer in the cold
 * engine's three-tier quality gate (per the Loop-Engineering design principle):
 *
 *   1. copy-evaluator (deterministic)  — catches PLACEMENT / rule misses
 *      (dashes, banned words, fake Re:, massage-leads, link discipline). Hard yes/no.
 *   2. copy-judge (THIS, LLM)          — catches STRATEGIC-FIT misses a rule can't:
 *      is it relevant to THIS segment's buyer? does it read like a 1:1, not a
 *      blast? is the hook actually compelling? on-spine + real proof only?
 *      Advisory score + concrete suggestions.
 *   3. human                            — the launch click (irreversible).
 *
 * Generator ≠ evaluator: this is a SEPARATE skeptic, prompted to default to
 * "most cold email gets ignored — would THIS earn a reply?". Pure +
 * dependency-injected (Anthropic client passed in) so it mirrors
 * sequence-composer and is testable with a mock. NEVER hard-blocks a launch (the
 * human decides); it surfaces a verdict + fixes.
 *
 *   import Anthropic from '@anthropic-ai/sdk';
 *   const judge = await judgeCopy({ anthropic: new Anthropic({apiKey}), sequence, segment });
 */

import { buildPositioningBlock } from '../../netlify/functions/lib/positioning.js';

const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';

// Segment → who the buyer really is + what "relevant" means for them. Mirrors the
// vertical GTM memories so the judge evaluates against the RIGHT buyer.
const SEGMENT_BUYER = {
  direct: 'People-Ops / HR / Office Manager at mid-market + enterprise. Exhausted by wellness theater + the logistics of running it. Allergic to being sold to.',
  law: 'Law firm Director of Professional Development / CLE Coordinator / Firm Administrator. The CLE wedge (mandatory ethics credit, accredited NY/FL/PA only) is the door-opener; wellness day is the upsell. Compliance-sensitive: only the ethics category, only NY/FL/PA, "an hour of" not "covers your requirement".',
  realestate: 'Landlord / property-manager / coworking operator. B2B2C amenity buyer (NOT employer-buys-for-staff): wellness as a building amenity to win/keep tenants. Lead with tenant attraction/retention/NOI + filling the amenity calendar, not employee wellness.',
  broker: 'Health/benefits broker. Hook = deploying carrier wellness funds (Cigna HIF / Aetna / Anthem) for their clients with zero admin; "hero to clients". Not a Workhuman-booth lead.',
};

const SUBJECT_PRINCIPLES = 'Cold subjects should read like a 1-line internal note: 1-4 words, lowercase, no sell, points at the prospect\'s world. "Quick question" is a tired cliché. NEVER fake Re:/Fwd:, emoji, ALL-CAPS, exclamation, spam/money words.';

function buildJudgeSystem(segment) {
  const buyer = SEGMENT_BUYER[segment] || SEGMENT_BUYER.direct;
  return `You are a skeptical, senior B2B cold-email strategist (in the school of Josh Braun, Lavender, 30 Minutes to President's Club). You have read tens of thousands of cold emails and your DEFAULT belief is that a cold email gets ignored. Your job is to judge whether THIS sequence would actually earn a positive reply from a real, busy buyer — strategic fit, not grammar.

You are the SECOND gate. A deterministic linter already checked the hard rules (no dashes, no banned words, no fake Re:, link discipline, massage-leads-in-direct). Do NOT re-litigate those. Judge what a rule CAN'T:

WHO YOU ARE JUDGING FOR (this segment's real buyer):
${buyer}

SHORTCUT POSITIONING (the copy must ladder to this, use ONLY real proof, never fabricate):
${buildPositioningBlock({ channel: segment === 'broker' ? 'broker' : 'direct' })}

SUBJECT PRINCIPLES: ${SUBJECT_PRINCIPLES}

JUDGE ON (be specific, cite the step):
1. RELEVANCE — does E1 speak to THIS buyer's actual world/pain, or is it generic "any wellness company" copy?
2. 1:1-NOT-BLAST — would a busy exec believe a human wrote this to them specifically? Or does it smell like a sequence?
3. HOOK — is the first line of E1 compelling in 5 seconds, or does it bury the point / open with "we"?
4. ON-SPINE + REAL PROOF — does it use the actual proof points and lead with the right pillar for this segment? Any fabricated or off-positioning claim is a hard issue.
5. SUBJECT QUALITY — short, internal-note, no cliché/sell, points at their world.
6. THE ASK — one low-friction soft CTA, not pushy, no premature link/calendar.
7. SEQUENCE LOGIC — E2 is a real bump (no new pitch), E3 earns the differentiation, E4 closes softly. Each email earns its place.

Be honest and critical — if it's mediocre, say so and say exactly why. Reserve a high score for copy you'd actually bet on.

Report your verdict by calling the report_verdict tool. verdict "pass" only if you'd send it; "revise" if it needs work. Score: 80+ strong, 60-79 workable-with-fixes, <60 weak.`;
}

// Forced-tool schema — guarantees a valid structured object (no free-text JSON to
// parse/truncate). This is what fixed the "Expected ',' or ']'" parse errors.
const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['pass', 'revise'], description: 'pass only if you would send it as-is' },
    score: { type: 'integer', minimum: 0, maximum: 100 },
    would_reply_read: { type: 'string', description: 'one sentence: would this buyer reply, and why / why not' },
    strengths: { type: 'array', items: { type: 'string' } },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          step: { type: 'integer', description: 'which email (1-4)' },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          issue: { type: 'string' },
        },
        required: ['issue'],
      },
    },
    suggestions: { type: 'array', items: { type: 'string' }, description: 'concrete, rewrite-level fixes' },
    subject_take: { type: 'string', description: 'one line on the subject(s)' },
  },
  required: ['verdict', 'score', 'would_reply_read'],
};

function renderSequenceForJudge(sequence, segment, context) {
  const steps = sequence?.steps || [];
  const lines = [`SEGMENT: ${segment}`, sequence?.label ? `SEQUENCE: ${sequence.label}` : '', context?.note ? `CONTEXT: ${context.note}` : '', '', 'THE SEQUENCE:'];
  for (const s of steps) {
    lines.push(`\n--- E${s.step} (day ${s.delayDays}) ---`);
    lines.push(`Subjects: ${(s.subjects || []).map((x) => (x ? `"${x}"` : '(blank/threaded)')).join(' | ') || '(none)'}`);
    lines.push(s.body || '');
  }
  lines.push('\nNote: {curly|pipe} groups are spintax (one variant sent per email); {{merge_tags}} resolve per lead. Judge the content, not the spintax syntax.');
  return lines.filter((l) => l !== '').join('\n');
}

// Fallback only: if a model/SDK path ever returns text instead of a tool call,
// salvage the JSON object rather than throwing.
function extractJson(text) {
  const s = String(text || '');
  const a = s.indexOf('{'); const b = s.lastIndexOf('}');
  if (a < 0 || b < 0) throw new Error('no JSON in judge output');
  return JSON.parse(s.slice(a, b + 1));
}

/**
 * @param {Object} a
 * @param {Object} a.anthropic  Anthropic SDK client (injected)
 * @param {Object} a.sequence   { label?, steps:[{step,delayDays,subjects,body}] }
 * @param {string} [a.segment]  direct | law | realestate | broker
 * @param {Object} [a.context]  { note?:string }
 * @param {string} [a.model]
 * @returns {Promise<{verdict,score,would_reply_read,strengths,issues,suggestions,subject_take}>}
 */
export async function judgeCopy({ anthropic, sequence, segment = 'direct', context = {}, model = DEFAULT_MODEL }) {
  if (!anthropic) throw new Error('judgeCopy: anthropic client required');
  if (!sequence?.steps?.length) throw new Error('judgeCopy: sequence with steps required');
  const seg = ['direct', 'law', 'realestate', 'broker'].includes(segment) ? segment : 'direct';
  const resp = await anthropic.messages.create({
    model, max_tokens: 2000, temperature: 0.2,   // low: a gate should score the same copy consistently run-to-run
    system: buildJudgeSystem(seg),
    tools: [{ name: 'report_verdict', description: 'Report the strategic-fit verdict for this cold sequence.', input_schema: VERDICT_SCHEMA }],
    tool_choice: { type: 'tool', name: 'report_verdict' },
    messages: [{ role: 'user', content: renderSequenceForJudge(sequence, seg, context) }],
  });
  // Forced tool_use → the input IS the validated object. Fall back to text-JSON only
  // if some path returns prose instead of a tool call.
  const toolUse = (resp.content || []).find((b) => b.type === 'tool_use' && b.name === 'report_verdict');
  const j = toolUse?.input || extractJson((resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim());
  return {
    verdict: j.verdict === 'pass' ? 'pass' : 'revise',
    score: Math.max(0, Math.min(100, Number(j.score) || 0)),
    would_reply_read: j.would_reply_read || '',
    strengths: Array.isArray(j.strengths) ? j.strengths : [],
    issues: Array.isArray(j.issues) ? j.issues : [],
    suggestions: Array.isArray(j.suggestions) ? j.suggestions : [],
    subject_take: j.subject_take || '',
  };
}

export { buildJudgeSystem, renderSequenceForJudge };
