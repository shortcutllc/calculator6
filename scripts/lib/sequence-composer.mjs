/**
 * sequence-composer.mjs — the GENERATOR. Composes a fresh, on-spine 4-step cold
 * sequence into the locked blueprint, grounded on positioning.js + the measured
 * winning templates + brand voice. Replaces blind template cloning.
 *
 * Generator↔evaluator loop: it drafts, the copy-evaluator (the skeptic) lints,
 * and on REJECT it retries ONCE with the violations fed back. What it returns is
 * either a clean sequence (verdict pass) or the best attempt + the violations so
 * the cold engine can HOLD.
 *
 * LLM is dependency-injected (pass the Anthropic client) so callers own the key
 * and this stays mockable/testable.
 *
 *   import { composeSequence, toSmartleadSequences } from './lib/sequence-composer.mjs';
 *   const seq = await composeSequence({ anthropic, segment, belief, winningTemplates });
 *   if (seq.verdict === 'pass') await create(toSmartleadSequences(seq.steps));
 */

import { buildPositioningBlock } from '../../netlify/functions/lib/positioning.js';
import { SEQUENCE_BLUEPRINT, evaluateCopy } from './copy-evaluator.mjs';

const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';

// E2 reference — Will's proven simple-bump shape (sf_sequences.json, Jaimie).
const E2_REFERENCE = 'Hi {{first_name}}, hope your day is treating you well. Following up on the note below. Wondering if we could connect?';

const VOICE = [
  'VOICE: warm, conversational, like a competent friend who runs a wellness company. Confident, never loud. Premium without pretension.',
  'STANDALONE (hard rule): every email except the E2 bump must make complete sense to a busy reader who never opened the earlier emails. Threading quotes the old emails BELOW and preview panes show only the new text, so each of E1/E3/E4 names the CONCRETE services (chair massage, nails, facials, mindfulness...), never just the category word "wellness". The word ranges are guidance and they YIELD to this: if naming the services, one real proof point, and the ask pushes an email over its range, run longer. Never cut an essential element to hit a word count.',
  'HARD RULES (any violation fails): no dashes as punctuation (no em/en dash, no " - "; intra-word hyphens like mid-market are fine — end the sentence instead). No exclamation points. No buzzwords. Never these words: elevate, leverage, synergy, unlock, empower, transform, reimagine, seamless, holistic, curated. Specifics over superlatives.',
  'Merge tags allowed: {{first_name}}, {{company_name}}. One low-pressure, interest-based CTA per email (not "book 30 minutes").',
  'SPINTAX (required for deliverability): rotate copy with spintax {option1|option2|option3} on the greeting, several key phrases, and the CTA of EVERY email, so no two sends are byte-identical. Aim for 6+ spintax groups per email. Every variant must stay on-spine and read equally well. Do not spin merge tags.',
];

function blueprintInstructions() {
  const lines = SEQUENCE_BLUEPRINT.map((b) => {
    const links = b.maxLinks === 0 ? 'NO links' : `at most ${b.maxLinks} link`;
    const subj = b.subjectVariants > 1 ? `${b.subjectVariants} DISTINCT subject lines (A/B)` : '1 subject line';
    let extra = '';
    if (b.mustBeBump) extra = ` This is a PURE BUMP — NO proof point, NO new pitch. Match this shape exactly in spirit: "${E2_REFERENCE}".`;
    if (b.step === 1) extra = ' Lead with the problem, then one pillar (actually-used). Personalize with a merge tag.';
    if (b.step === 3) extra = ' Differentiate on the v3 lead: one vendor for your whole team, in office AND remote (breadth from one team, including virtual for remote/hybrid). Grooming/headshots only as a brief "we even do X" menu aside, NEVER the lead. The one allowed link goes here.';
    if (b.step === 4) extra = ' Soft close / graceful breakup. Easy out, no pressure.';
    return `  E${b.step} (send day +${b.delayDays}, ~${b.words[0]}-${b.words[1]} words, ${subj}, ${links}): ${b.role}.${extra}`;
  });
  return `SEQUENCE BLUEPRINT (compose copy INTO this fixed structure):\n${lines.join('\n')}\n  Word ranges are guidance, not caps: the standalone essentials (concrete services, one real proof, the ask) always win — go over the range rather than drop one.`;
}

function buildSystemPrompt({ channel = 'direct', seasonal = false, winningTemplates = [] } = {}) {
  const winners = (winningTemplates || []).slice(0, 3)
    .map((t, i) => `  [winner ${i + 1}, reply rate ${t.reply_rate != null ? (t.reply_rate * 100).toFixed(1) + '%' : 'n/a'}]: ${String(t.body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400)}`)
    .join('\n');
  return [
    'You compose cold outbound EMAIL SEQUENCES for Shortcut (premium on-site wellness: massage, grooming, headshots, nails, facials, mindfulness). One team runs everything.',
    '',
    buildPositioningBlock({ channel, seasonal }),
    '',
    ...VOICE,
    '',
    blueprintInstructions(),
    '',
    winners ? `MEASURED WINNERS (what historically earned replies for this profile — match the rhythm, do NOT copy):\n${winners}` : '',
    '',
    'OUTPUT: strict JSON only, no prose, no code fences. Plain text bodies with \\n line breaks (no HTML). Shape:',
    '{ "steps": [ { "step": 1, "delayDays": 0, "subjects": ["..", ".."], "body": ".." }, { "step": 2, "delayDays": 3, "subjects": [".."], "body": ".." }, { "step": 3, "delayDays": 4, "subjects": [".."], "body": ".." }, { "step": 4, "delayDays": 5, "subjects": [".."], "body": ".." } ] }',
  ].filter((x) => x !== '').join('\n');
}

function parseJSON(text) {
  const s = String(text || '');
  const start = s.indexOf('{'); const end = s.lastIndexOf('}');
  if (start < 0 || end < 0) throw new Error('no JSON object in model output');
  return JSON.parse(s.slice(start, end + 1));
}

/**
 * @param {Object} a
 * @param {Object} a.anthropic   Anthropic SDK client (injected)
 * @param {string} a.segment     e.g. "Office Managers at 500-2000 employee companies in NYC"
 * @param {Object} [a.belief]    belief_model.json (optional, for grounding)
 * @param {Array}  [a.winningTemplates]  [{ body, reply_rate }]
 * @param {'direct'|'broker'} [a.channel]
 * @param {boolean} [a.seasonal]
 * @param {string} [a.model]
 */
export async function composeSequence({ anthropic, segment, belief, winningTemplates = [], channel = 'direct', seasonal = false, model = DEFAULT_MODEL }) {
  if (!anthropic) throw new Error('composeSequence: anthropic client required');
  const system = buildSystemPrompt({ channel, seasonal, winningTemplates });
  const baseUser = `Compose the 4-step sequence for this target segment: ${segment || 'mid-market HR / office managers'}.`;

  let lastSteps = null; let lastEval = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const userContent = attempt === 1
      ? baseUser
      : `${baseUser}\n\nYour previous draft FAILED the copy check. Fix every issue and re-output the full JSON:\n${lastEval.violations.map((x) => `  - E${x.step} ${x.rule}: ${x.detail}`).join('\n')}`;
    const msg = await anthropic.messages.create({
      model, max_tokens: 2000, system,
      messages: [{ role: 'user', content: userContent }],
    });
    const text = msg.content?.map((c) => c.text || '').join('') || '';
    let parsed;
    try { parsed = parseJSON(text); } catch (e) { lastEval = { verdict: 'reject', violations: [{ step: 0, rule: 'parse', detail: e.message }] }; continue; }
    lastSteps = parsed.steps || [];
    lastEval = evaluateCopy({ steps: lastSteps }, { seasonal });
    if (lastEval.verdict === 'pass') return { steps: lastSteps, verdict: 'pass', violations: [], warnings: lastEval.warnings, attempts: attempt };
  }
  return { steps: lastSteps, verdict: 'reject', violations: lastEval.violations, warnings: lastEval.warnings || [], attempts: 2 };
}

// Plain text → the minimal HTML Smartlead expects.
const htmlBody = (text) => String(text || '').split('\n')
  .map((l) => (l.trim() ? `<div>${l}</div>` : '<div><br></div>')).join('');

/** Map composed steps → the shape create_campaign.js apiAddSequences expects. */
export function toSmartleadSequences(steps) {
  // Smartlead's POST /sequences wants subject + email_body directly on the step
  // (NOT a sequence_variants wrapper — that's the GET shape and the POST rejects
  // it). A/B happens via spintax in the single subject line. Matches the working
  // create_post_event_campaigns.js format.
  return (steps || []).map((s) => {
    // Multiple subjects ROTATE via SPINTAX in the single subject field (Smartlead's
    // POST rejects the sequence_variants A/B wrapper). 2-3 phrasings → {a|b|c} and
    // Smartlead picks one per send. One subject → as-is. Blank → threaded follow-up.
    const subs = (s.subjects || []).filter(Boolean);
    return {
      seq_number: s.step,
      seq_delay_details: { delay_in_days: s.delayDays ?? 0 },
      subject: subs.length > 1 ? `{${subs.join('|')}}` : (subs[0] || ''),
      email_body: htmlBody(s.body),
    };
  });
}

export { buildSystemPrompt, E2_REFERENCE };
