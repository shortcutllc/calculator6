/**
 * founder-note-v2.js — the WRITING loop (vs founder-note.js, the CHECKING loop).
 *
 * WHY THIS EXISTS. See memory/llm_writing_loop_architecture.md for the full research.
 * The v1 engine drafts ONE note, then patches it up to 4 times against ~24 constraints
 * until it stops failing. That is a COMPLIANCE ENGINE: it optimizes "survive the gate",
 * and writing-to-survive-a-gate is what robotic prose IS. Three findings force a redesign:
 *
 *  1. The blandness is UPSTREAM of the prompt. RLHF collapses PER-INPUT diversity (Kirk
 *     et al., ICLR 2024); co-writing with an instruction-tuned model measurably reduces
 *     content diversity while a BASE model does not (Padmakumar & He, ICLR 2024). No rule
 *     we write can fix it, and temperature only samples the same narrow mode more noisily.
 *  2. PATCHING is non-monotonic and damages good drafts. Self-Refine's own authors report
 *     it improving one aspect while degrading another under multi-aspect feedback, and had
 *     to bolt per-aspect scoring + OUTPUT SELECTION onto their own loop. Snell et al.
 *     measured ~38% of already-correct outputs revised INTO incorrect ones.
 *  3. Huang et al. §4 give the placement rule: if a requirement is pre-hoc specifiable and
 *     mechanically checkable, post-hoc self-correction adds NOTHING over putting it in the
 *     prompt. => it belongs in the PROMPT + a TERMINAL reject gate, NEVER a revision loop.
 *
 * SO: generate N structurally-DIFFERENT candidates, SELECT the best, and let the guards
 * REJECT but never REWRITE. Guards are a net, not a mold.
 *
 * WHAT IS BACKED vs WHAT IS A BET (never let these blur):
 *   TIER A  — select-don't-patch; diversify structurally not thermally; panel > single
 *             judge; pairwise + dual-order + blind; guards-as-terminal-reject.
 *   ⚠️ BET  — the NOTEWORTHINESS lens ("would this be true of 100 other companies?").
 *             Every published metric for information-value was REFUTED in verification.
 *             There is no cure in the literature. This is an engineering guess.
 *   ⚠️ BET  — the FRESHNESS lens (prefer the candidate least like recent sends). The
 *             embedding-as-diversity-MEASURE is A-tier (Kirk et al. used Sentence-BERT
 *             cosine exactly this way); the JUDGE LENS is uncited. And note the axis:
 *             the diversity research is strongest on PER-INPUT (many candidates, ONE
 *             lead) — our cross-LEAD sameness is a thinner-evidence axis.
 *
 * MEASURE ON POSITIVE REPLIES, NEVER ON JUDGE SCORES. Optimizing against our own judge is
 * exactly how we rebuild the compliance engine aimed at a new target.
 *
 * v1 (founder-note.js) stays intact and is still the live path. This ships behind an A/B.
 */

import { buildPositioningBlock } from './positioning.js';
import {
  ANTHROPIC_MODEL, todayLong, guardNote, applySignoff, pickSignoff,
  normalizeParagraphs, autoFixDashes, autoFixServiceFragment, autoSplitParagraphs,
  isolateQuestion, noteWordCount, stripInterpretiveTail,
} from './founder-note.js';

// ============================================================================
// RESEARCH — gather WIDE, rate for NOTEWORTHINESS, and be allowed to REFUSE.
// ============================================================================

/**
 * v1 researched ONE fact and committed to it. A good writer gathers ten and uses one —
 * and v1's single fact had nowhere to go but into the email, which is how a CHRO got
 * complimented on having "employee experience" in her job title. That fact was TRUE,
 * SPECIFIC, and RELEVANT: it passed every bar v1 had. What it failed is a test v1 never
 * had — is this WORTH SAYING? The system understood relevance and had no concept of
 * NOTEWORTHINESS.
 *
 * ⚠️ THE BET: after three research passes there is NO evidence-backed way to score
 * information value. PMI/information-gain, surprisal-as-blandness-tell, and banded
 * surprisal targets were ALL refuted in verification. The two tests below are engineering
 * guesses with zero citation. They are also the best available, because the failure they
 * target is precise: a job title is RELEVANCE-maximizing and SURPRISE-minimizing, which is
 * exactly what a mode-collapsed model plus a relevance gate produces.
 */
const OBSERVATIONS_SCHEMA = {
  type: 'object',
  properties: {
    observations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          fact: { type: 'string', description: 'the verified fact, stated plainly and completely' },
          category: { type: 'string', enum: ['office', 'milestone', 'people', 'content', 'award', 'person', 'other'] },
          recency: { type: 'string', enum: ['recent', 'standing'], description: "'recent' ONLY if within ~6 months of today; else 'standing' (must be phrased as a present-tense truth, never as news)" },
          source: { type: 'string', description: 'where you found it — a real URL or publication. If you cannot name one, do not report the fact.' },
          generic_test: { type: 'string', description: 'Would this be true of 100 other companies? Answer "yes — <why>" or "no — <what makes it specific to them>".' },
          effort_test: { type: 'string', description: 'Could this only have been found by actually looking? Answer "yes — <where it was buried>" or "no — <how anyone would see it in 10 seconds>".' },
          notability: { type: 'number', description: '0-1. 0 = anyone could have grabbed this in ten seconds (a job title, an industry, that they have employees). 1 = a thoughtful person who genuinely researched them would notice this and it would land. BE HARSH. Most facts are below 0.4.' },
          why_notable: { type: 'string', description: 'one line: why a peer founder would actually mention this' },
        },
        required: ['fact', 'category', 'recency', 'source', 'generic_test', 'effort_test', 'notability', 'why_notable'],
      },
    },
    nothing_worth_saying: { type: 'boolean', description: 'true if NOTHING you found clears the bar. This is a legitimate, respectable answer — say so rather than reaching for filler.' },
  },
  required: ['observations', 'nothing_worth_saying'],
};

export const NOTABILITY_FLOOR = 0.6;

function researchSystem(audience) {
  const lane = audience === 'brokers'
    ? `Shortcut helps BROKERS make their CLIENTS the hero: deploying carrier wellness funds (Cigna, Aetna, Anthem) on wellness employees actually use. A usable observation connects to the benefits/wellness thread ON ITS FACE — their firm's wellbeing practice, their published benefits content, their metro, their client base. Do NOT comment on how the FIRM treats its own staff (this note is about their clients).`
    : `Shortcut brings wellness into companies: chair massage, nails, facials on-site, plus mindfulness/sound baths/nutrition coaching in person or over Zoom. One team, fully managed, and people actually use it. A usable observation connects to caring for a team ON ITS FACE.`;
  return `You research ONE person and their company so Will Newton (founder of Shortcut) can write them a genuine 1:1 email. ${lane}

TODAY IS ${todayLong()}.

## YOUR JOB: FIND FACTS WORTH SAYING. NOT FACTS THAT ARE MERELY TRUE.
This is the whole task, so read it twice. A real system once opened an email to a Chief Human Resources Officer by complimenting her on having "employee experience" in her job title. That fact was true. It was specific. It was relevant to wellness. And it was WORTHLESS — because a job title is not a discovery, it is a lookup, and mentioning it ADVERTISES that the sender looked for ten seconds. The implicit promise of an opening line is "I actually spent time on you." A findable-in-ten-seconds fact BREAKS that promise while technically satisfying every rule.

So apply TWO tests to every fact, and report both honestly:
1. THE GENERIC TEST: would this be true of a hundred other companies? A job title, an industry, "they value their people", "they're growing", a mission statement, a generic award — all yes, all worthless.
2. THE EFFORT TEST: could this only have been found by actually looking? A specific building, a square footage, a number, a named thing they did, something they published.

## SEARCH STRATEGY — spend your searches deliberately, best class first
1. THE OFFICE / SPACE. "<company>" office lease OR sublease OR relocate OR "square feet" · "<company>" new office <city> · "<company>" return to office. This lives in the commercial real-estate trade press (Commercial Observer, Bisnow, The Real Deal, citybiz), NOT on their own site. A company that just committed to more space HAS ALREADY DECIDED it wants people in the building. That is the single most actionable class of fact for Shortcut. Look here FIRST.
2. A REAL MILESTONE: funding, IPO, acquisition, a big launch, a notable partnership.
3. THEIR OWN PUBLISHED CONTENT: something this person or firm wrote, especially on benefits/wellness/workplace.
4. HOW THEY TREAT THEIR PEOPLE: a real internal program, a specific benefit, a named recognition.
5. THE PERSON: something they are actually known for.
Do NOT burn a search on a generic "<company>" lookup. That lands on their About page and returns exactly the kind of fact nobody would have noticed.

## HARD RULES
- Every fact must be TRUE and must have a real source you actually found. NEVER invent or embellish. If you cannot name where it came from, do not report it.
- RECENCY: mark anything older than ~6 months 'standing'. A standing fact is NOT weaker — it just has to be written as a present-tense truth about their world ("they have close to double the space at One Soho Square now"), never as news ("I saw they just moved").
- COHERENCE: cross-check every fact against THIS person's location, title and company. A real fact about a different office, region, or division is WRONG for them, and using it is a tell that nobody actually looked.
- BE HARSH ON notability. Most facts score below 0.4. If nothing clears the bar, set nothing_worth_saying=true — that is a respectable answer and it is far better than handing over filler, because the writer downstream will be forced to use whatever you give them.

Report via report_observations exactly once, after your searches.`;
}

/**
 * Returns { observations, refused, all } — observations are only those above the floor.
 * refused=true means nothing was worth saying, which is a legitimate outcome.
 */
export async function researchObservations(anthropic, lead, {
  audience = 'tech-execs', maxSearches = 5, timeoutMs = 120000, floor = NOTABILITY_FLOOR, log = () => {},
} = {}) {
  const tools = [
    { type: 'web_search_20250305', name: 'web_search', max_uses: maxSearches },
    { name: 'report_observations', description: 'Report every fact you found, each with its two tests and a notability score. Call exactly once.', input_schema: OBSERVATIONS_SCHEMA },
  ];
  const messages = [{
    role: 'user',
    content: `The person: ${lead.name}, ${lead.title} at ${lead.company} (${lead.location || 'location unknown'}).

Work the search strategy in order.${audience === 'brokers' ? '' : ` Start with the office/space class — search for a lease, a move, a new office, or a space expansion at ${lead.company}${lead.location ? ` in ${lead.location}` : ''}.`}

Report EVERY genuine fact you found (not just the best one — the writer wants raw material to choose from), each scored honestly. Then call report_observations.`,
  }];
  const t0 = Date.now();
  try {
    for (let i = 0; i < 6; i += 1) {
      if (Date.now() - t0 > timeoutMs) { log(`research timeout for ${lead.company}`); return { observations: [], refused: true, all: [] }; }
      const resp = await Promise.race([
        anthropic.messages.create({ model: ANTHROPIC_MODEL, max_tokens: 3000, system: researchSystem(audience), tools, messages }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('research_timeout')), timeoutMs)),
      ]);
      messages.push({ role: 'assistant', content: resp.content });
      const tu = (resp.content || []).find((b) => b.type === 'tool_use' && b.name === 'report_observations');
      if (tu) {
        const all = (tu.input.observations || []).map((o) => ({ ...o, fact: stripInterpretiveTail(o.fact) }));
        const kept = all.filter((o) => Number(o.notability) >= floor);
        log(`research ${lead.company}: ${all.length} facts, ${kept.length} above the ${floor} bar${all.length ? ` — ${all.map((o) => `${o.category}:${Number(o.notability).toFixed(2)}`).join(' ')}` : ''}`);
        for (const o of all.filter((x) => Number(x.notability) < floor)) log(`  dropped (${Number(o.notability).toFixed(2)}): ${o.fact.slice(0, 70)} — ${o.generic_test.slice(0, 60)}`);
        const refused = tu.input.nothing_worth_saying === true || kept.length === 0;
        return { observations: kept, refused, all };
      }
      if (resp.stop_reason === 'pause_turn') continue;
      if (resp.stop_reason === 'end_turn') messages.push({ role: 'user', content: 'Call report_observations now.' });
    }
  } catch (e) { log(`research error for ${lead.company}: ${e.message}`); return { observations: [], refused: true, all: [] }; }
  return { observations: [], refused: true, all: [] };
}

// ============================================================================
// CANDIDATE GENERATION — diversity injected STRUCTURALLY, not thermally.
// ============================================================================

// Verbalized Sampling (arXiv:2510.01171, ICML 2026): asking a model to emit N candidates
// *in one call* with their own confidence recovers ~67% of BASE-model diversity and beats
// direct prompting 1.6-2.1x on creative writing — training-free, and it STACKS with
// temperature rather than competing (temperature moves you ALONG the diversity/quality
// frontier; VS MOVES the frontier). Two adaptations for our case:
//   - We also vary the ANGLE and SHAPE explicitly, because our sameness is cross-LEAD
//     (every email the same skeleton), which plain VS does not target.
//   - We IGNORE the self-reported confidence for selection (the paper says the verbalized
//     probabilities are uncalibrated). We ask for it because eliciting the distribution is
//     what produces the spread; the JUDGE does the selecting.
const CANDIDATES_SCHEMA = {
  type: 'object',
  properties: {
    candidates: {
      type: 'array',
      minItems: 3,
      items: {
        type: 'object',
        properties: {
          angle: { type: 'string', description: 'the ONE thing this version leads on, in 3-6 words (each candidate must lead on something genuinely different)' },
          shape: { type: 'string', description: 'the structure this version uses, in 3-6 words (e.g. "question first", "two-liner", "observation then easy out")' },
          subject: { type: 'string', description: '1-4 words lowercase. A REFERENT (a real thing from their world) not a topic label, never a teaser.' },
          body: { type: 'string', description: "the full email, plain text, paragraphs separated by a BLANK line, ending 'Cheers!' or 'Thanks!' then '\\nWill'." },
          reply_odds: { type: 'number', description: 'your honest 0-1 estimate that a busy recipient replies to THIS version. Be discriminating: spread these out, do not give everything 0.6.' },
        },
        required: ['angle', 'shape', 'subject', 'body', 'reply_odds'],
      },
    },
    research_note: { type: 'string', description: 'one line for Will: the specific thing you found and used (or "nothing specific found")' },
    linkedin_step: { type: 'string', description: "today's LinkedIn action for Will for this person, one line" },
  },
  required: ['candidates', 'research_note', 'linkedin_step'],
};

/**
 * The generator prompt. DELIBERATELY LIGHTER THAN v1's.
 * v1 stuffs ~24 constraints into context. Every constraint narrows the mode we sample
 * from, and the sameness is a DISTRIBUTIONAL problem, not a specification problem — so
 * adding rules here would defeat the entire purpose of this module. Only two classes of
 * rule survive into this prompt:
 *   (a) BRAND-SAFETY non-negotiables that are cheap to state and catastrophic to break
 *       (never fabricate, only these clients, fund-eligible services, no dashes/bangs).
 *   (b) The CRAFT of what a good 1:1 note IS (from memory/cold_networking_research.md).
 * Everything else that used to be a mandatory beat is now a SELECTION PREFERENCE — the
 * judge prefers candidates that land them naturally, instead of the drafter being forced
 * to cram all five into 130 words (which is what collided the paragraphs in v1).
 */
export function generatorSystem({ exemplars = [], audience, remote = false, recentNotes = [], n = 6 }) {
  const channel = audience === 'brokers' ? 'broker' : 'direct';
  return `You are Will Newton, founder and CEO of Shortcut (getshortcut.co), writing a 1:1 networking email to ONE person. You write ${n} genuinely different versions, then stop. Someone else picks the winner.

${buildPositioningBlock({ channel, remote })}

Everything above is the ONLY source of facts and proof you may use. It is RAW MATERIAL to say in your own words, never lines to paste.

TODAY IS ${todayLong()}. Never call a past month "upcoming".

## WHAT MAKES THESE EMAILS WORK (the craft — this is the job, not the rules)
This is one human writing to one human, hoping for a reply. It is NOT marketing copy and NOT a sales sequence. From the operators who actually do this well:
- ONE question. Derek Sivers: "Only ask one question." A note that asks nothing gives the reader nothing easy to do, so they do nothing. Make it a real question about THEIR world, answerable in one line. Not rhetorical, not a pitch wearing a question mark.
- The observation has to be WORTH SAYING, not merely true. A job title is not an observation, it is a lookup. The implicit promise of an opening line is "I actually spent time on you" — a fact anyone could have grabbed in ten seconds BREAKS that promise while technically being relevant. If the best you have is generic, say something honest and plain instead; a warm note with NO observation beats a forced one.
- An easy out earns replies. Tim Ferriss: "He makes it clear that it's OK if I can't help... This, paradoxically, makes it much more likely he'll get a response."
- Proof is evidence for an argument, not a boast. If you use a receipt, it should be the REASON you are asking, not a stat dropped in its own sentence.
- SHORT IN STRUCTURE, HUMAN IN TEXTURE. Paul Graham: "I respond faster to emails that are short. Two-liners I often reply to immediately. Long emails I leave in my inbox to deal with later, and never do." But Derek Sivers, on the same problem: "Don't be too succinct." A maximally compressed email is indistinguishable from an automated one. Cut the throat-clearing, not the humanity.
- At least one line in each version should be a line ONLY you could have written to THIS person. Not a stat, not a service list, not a value claim: those are transferable by definition. That line is the proof a human wrote it.

## VOICE
Calm, warm, casual, practical. A busy founder dashing off a note to a peer he'd like to know. Zero sales push, genuinely curious about them. Contractions everywhere. Sentence length VARIES — a short line, then a longer one that breathes. Plain verbs: things ARE and HAVE, they never "serve as" or "boast".
${exemplars.length ? `\n### WILL'S REAL EMAILS — match this register, rhythm and warmth. Do NOT copy their content.\n${exemplars.map((e, i) => `--- example ${i + 1} ---\n${e}`).join('\n\n')}\n` : ''}
## HARD RULES (breaking one voids the whole candidate)
- SAY WHO YOU ARE. One plain human sentence, early: "I'm Will, I run Shortcut" and what Shortcut does, in concrete terms. Compose it FRESH each time — never paste a fixed sentence. They have never heard of you and cannot infer it. (This is the ONE beat that is mandatory: an unidentified sender is a broken cold email. Everything else — the proof point, the zero-lift line — is OPTIONAL raw material, use it only where it genuinely helps.)
- NEVER fabricate. Only the facts in the positioning block above, and only what your research actually found.
- Client claims are CLOSED-WORLD: the only clients you may name are the ones in the positioning block. Never invent a roster or a segment.
- No dashes as punctuation. End the sentence instead.
- No exclamation points except the sign-off.
- Sign off "Cheers!" or "Thanks!" on its own line, then "Will". Nothing after.
- No links, no attachments, no calendar link, no "15 minutes".
- Banned words: elevate, leverage, unlock, empower, transform, seamless, holistic, curated, delve, foster, streamline, navigate, landscape, showcase, testament, realm, pivotal, underscore, meticulous, additionally. No "not just X, but Y".
${audience === 'brokers' ? `- BROKER LANE: this is channel courtship, helping the broker help THEIR clients deploy carrier wellness funds (Cigna Health Improvement Fund, Aetna Wellness Allowance, Anthem). Funds cover ONLY chair massage, assisted stretch, sound baths, mindfulness, nutrition coaching — naming nails/facials/hair/headshots here misstates eligibility to the one audience that would catch it. Will's ground truth is the CLIENT side: he may say what he sees at the companies he talks to, and may never claim broker conversations or assert facts about THIS broker's book (only a QUESTION may reference their clients). Never say "groups".` : `- TECH-EXEC LANE: celebrate their growth and OFFER help. Never assert their team is stressed/burned out (only inside an if/as/when clause or a question). Never use consequence or urgency framing. Never RTO/"worth the commute" framing UNLESS the verified observation is itself about their office.`}

## YOUR TASK — ${n} GENUINELY DIFFERENT VERSIONS
Not ${n} rewordings of one email. ${n} different emails. Each must differ in at least one of:
- ANGLE: which true thing you lead on. (If the research gave you several facts, different candidates should use different ones. If it gave you one, then differ on what you SAY about it.)
- SHAPE: question-first vs observation-first vs a bare two-liner vs observation-then-easy-out. Some should carry a proof point; at least one should carry NONE and just be a human note with a question.
- LENGTH: at least one under 70 words, at least one around 100-120. HARD CEILING ${V2_WORD_CEILING} words for the message body (greeting and sign-off do not count) — anything longer is discarded unread, so a long candidate is a wasted slot.
Vary the opening move. Vary where the question lands. Vary whether the receipt appears at all.
If two of your versions could swap a sentence unnoticed, you have written one email ${n} times and failed the task.
${recentNotes.length ? `\n### ALREADY SENT TO OTHER PEOPLE — do not reuse ANY of this phrasing or shape\n${recentNotes.slice(0, 12).map((b, i) => `--- ${i + 1} ---\n${b}`).join('\n\n')}\nA recipient who compares notes with a peer must not find the same email. Your self-intro ("I'm Will, I run Shortcut") and the service menu are ALLOWED to recur — they are the product. Everything else must be fresh.\n` : ''}
## THE BOILERPLATE TRAP — THIS IS WHERE SAMENESS ACTUALLY LIVES
Measured on a real batch (2026-07-20): the openings were all genuinely different and well
researched, and the notes STILL read as one template, because the MIDDLE and the CLOSE were
identical. Five of five notes contained "you just approve a date and do nothing else" word
for word. Two contained "Happy to share more if it's useful, or totally fine if the timing
isn't right" word for word. A varied opening bolted onto identical boilerplate is still a
form letter, and it is worse than obvious sameness because it looks personalised at a glance.
Selection cannot rescue this: if all ${n} of your candidates carry the same zero-lift
sentence, the freshest of them is still that sentence. It has to be fixed HERE, in
generation.
So: the zero-lift idea (it is effortless for them, Shortcut handles everything, they pick a
date), the proof, and the sign-off ask are IDEAS TO EXPRESS, never phrases to reuse. Say each
one differently in every candidate AND differently from the recent notes above. If you cannot
think of a fresh way to say the zero-lift idea, LEAVE IT OUT of that candidate entirely —
it is a supporting beat, not a requirement, and a note without it beats five notes with the
same sentence. Same for the proof and the close.
For each version give an honest reply_odds (0-1): would a busy person actually reply to THIS one? Spread them out. If a version is only there to fill the count, score it low and say so in the angle.

Report all ${n} via report_candidates in ONE call.`;
}

export async function generateCandidates(anthropic, {
  lead, firm, audience, remote = false, exemplars = [], recentNotes = [],
  observations = [], trigger = null, n = 6, temperature = 0.9, log = () => {},
}) {
  const userContent = [
    'THE PERSON (JSON, trusted):',
    JSON.stringify({
      name: lead.name, title: lead.title, company: lead.company,
      location: lead.location || null, remote_or_distributed: remote || null,
      firm_tier: firm?.tier || null, firm_why: firm?.why || null,
    }, null, 2),
    '',
    observations.length
      ? `VERIFIED OBSERVATIONS (already researched and TRUE — these are your raw material; different candidates should lead on different ones, and you may use NONE if none is worth saying):\n${observations.map((o, i) => `${i + 1}. [${o.category}${o.recency ? '/' + o.recency : ''}] ${o.fact}${o.why_notable ? `\n   why it is worth saying: ${o.why_notable}` : ''}`).join('\n')}\n\nRECENCY: an observation older than ~6 months must be written as a STANDING fact about their world today ("you have close to double the space at One Soho Square now"), NEVER as news ("I saw you just moved"). An older fact is not a weaker hook — reframe it, do not drop it.`
      : 'NO OBSERVATION cleared the bar. Do NOT invent one and do NOT reach for something generic (their job title, their industry, the fact that they have employees). Write honest, warm, plain notes that stand on the question alone.',
    trigger ? `\nWHY WE REACHED OUT (internal context, NEVER quote this at them): ${trigger}` : '',
    '',
    `Write ${n} genuinely different versions, then call report_candidates once.`,
  ].filter(Boolean).join('\n');

  const resp = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 8000,
    // Temperature is a SECONDARY knob (Verbalized Sampling moves the frontier, temperature
    // moves you along it) — but the two stack, so we run warm. This is not the diversity
    // strategy; the structural variation in the prompt is.
    temperature,
    system: generatorSystem({ exemplars, audience, remote, recentNotes, n }),
    tools: [{ name: 'report_candidates', description: `Report all ${n} candidate emails. Call exactly once.`, input_schema: CANDIDATES_SCHEMA }],
    tool_choice: { type: 'tool', name: 'report_candidates' },
    messages: [{ role: 'user', content: userContent }],
  });
  const tu = (resp.content || []).find((b) => b.type === 'tool_use' && b.name === 'report_candidates');
  if (!tu) throw new Error('no report_candidates from generator');

  // Formatting is an AUTO-FIX, never a lead-killer (v1's hard-won lesson, kept). These are
  // pure mechanical repairs with zero wording change, applied per candidate.
  const candidates = (tu.input.candidates || []).map((c, i) => ({
    ...c,
    id: `c${i + 1}`,
    subject: autoFixDashes(String(c.subject || '')),
    // isolateQuestion LAST: autoSplitParagraphs may leave the question sharing a block with
    // the intro or a stat (Will 2026-07-14: "the email loses its flow"). Pure formatting.
    body: isolateQuestion(autoSplitParagraphs(autoFixServiceFragment(autoFixDashes(normalizeParagraphs(c.body || ''))))),
  }));
  log(`generated ${candidates.length} candidates: ${candidates.map((c) => `${c.id}(${c.angle}, ${noteWordCount(c.body)}w)`).join(' | ')}`);
  return { candidates, research_note: tu.input.research_note, linkedin_step: tu.input.linkedin_step };
}

// ============================================================================
// TERMINAL GATE — guards REJECT, they never REWRITE.
// ============================================================================

/**
 * Huang et al. §4: a pre-hoc-specifiable, mechanically-checkable constraint belongs in the
 * prompt and in a terminal gate — putting it in a revision loop adds nothing and (per
 * Self-Refine + Snell) actively damages the draft. So: every candidate is screened, the
 * failures are DISCARDED, and we select among the survivors. Nothing is ever patched.
 * Returns { survivors, rejected } so callers can see WHY a candidate died.
 */
// Total-length ceiling. v1 enforced ~130 words inside the skeptic/revise loop; deleting
// that loop silently deleted the ceiling too, and a 143-word note shipped on 2026-07-20.
// Length is pre-hoc specifiable and mechanically checkable, so by Huang et al. §4 it
// belongs in the PROMPT (stated once, see generatorSystem) and in the TERMINAL gate as a
// reject — never in a revision loop. Rejecting is safe here precisely because candidates
// are plural: the generator is told to vary length and to produce at least one short one,
// so a long candidate loses its slot rather than costing us the lead.
export const V2_WORD_CEILING = 130;

export function screenCandidates(candidates, { audience, trigger = null, officeContext = false }) {
  const survivors = []; const rejected = [];
  for (const c of candidates) {
    try {
      const words = noteWordCount(c.body);
      if (words > V2_WORD_CEILING) throw new Error(`${words} words — over the ${V2_WORD_CEILING} ceiling (a 1:1 note makes ONE point)`);
      // BRAND-SAFETY ONLY. Fabrication, banned words, dashes, bangs, the sign-off shape,
      // one question, fund-eligible services, no-links. Things that are catastrophic to
      // ship and cheap to check. Nothing here is a taste judgement.
      //
      // ⚠️ SAMENESS IS DELIBERATELY *NOT* HERE (and was, for about an hour, on 2026-07-14 —
      // a phrase-overlap check rejected 5/5 candidates because 4 of them contained "we
      // bring chair massage", i.e. the service menu, which is MANDATED to recur). That bug
      // is the whole thesis of this module in miniature: a well-meaning deterministic rule
      // silently deleting legitimate output, exactly like stripSecondProof() quietly making
      // BCG/DraftKings unshippable in v1. Sameness is a matter of DEGREE and SHAPE, which
      // makes it a SELECTION preference (LENSES.fresh), never a binary gate. If it ever
      // creeps back in here, the guard has become a mold again.
      guardNote({ subject: c.subject, body: c.body }, audience, trigger, { officeContext });
      survivors.push(c);
    } catch (e) {
      rejected.push({ ...c, reason: e.message });
    }
  }
  return { survivors, rejected };
}

// ============================================================================
// THE JUDGE PANEL — blind, dual-ordered, lens-separated.
// ============================================================================

/**
 * ⚠️ THE CONSTRAINT WE CANNOT CURRENTLY SATISFY (2026-07-14): the research says use 3
 * judges from DISJOINT model families, and specifically NOT the generator's family —
 * self-preference bias is measured (Panickssery et al.; Wataoka et al. locate the
 * mechanism in perplexity: judges over-reward text that is FAMILIAR to them). We only
 * have ANTHROPIC_API_KEY. An Anthropic panel judging Anthropic drafts is precisely the
 * configuration warned against.
 * Until a second family key exists, `judges` accepts a list of {name, call} adapters, so
 * adding OpenAI/Gemini later is a config change and not a rewrite. With one family we
 * degrade to lens-diversity only (different QUESTIONS, same model) and we log that the
 * panel is single-family so nobody later mistakes it for the validated design.
 *
 * THE LENSES. NOT one "which is better?" rubric — that is the surface a typicality-biased
 * judge answers with "the smoothest one", which would rebuild the compliance engine with
 * extra steps. Each lens asks ONE narrow question:
 *   - noteworthiness  ⚠️ THE BET. No published metric survived verification.
 *   - voice           pairwise against Will's own exemplars, never against an adjective.
 *   - freshness       ⚠️ BET. Least like recent sends (structural, not lexical).
 *   - reply           would a busy person actually reply to this?
 * A coherence FLOOR is enforced by the terminal gate, not a lens — "entropy is not
 * quality", so nothing may win on surprise alone.
 */
export const LENSES = {
  reply: {
    key: 'reply',
    weight: 1.0,
    prompt: (ctx) => `You are a busy ${ctx.title || 'executive'} at ${ctx.company || 'a company'}. You get pitched constantly and you delete almost all of it.

Two cold emails are below. Which one would you ACTUALLY reply to? Not which is better written. Not which is more polite. Which one gets a reply from you, today, in the ninety seconds you have.

If the only reason to reply to one is that it would be rude not to, that one LOSES. Notes die of blandness far more often than they die of a flaw.`,
  },
  noteworthy: {
    key: 'noteworthy',
    weight: 1.0,
    // ⚠️ UNPROVEN. This is the engineering guess aimed straight at the live defect
    // ("complimented a CHRO on having 'employee experience' in her job title" — true,
    // relevant, and worthless). Every published information-value metric (PMI, surprisal,
    // banded-surprisal) was REFUTED in verification. Instrument this; do not trust it.
    prompt: () => `Judge ONLY the opening observation in each email. Ignore everything else — the pitch, the ask, the writing quality.

Apply one test to each: WOULD THIS OPENING BE TRUE OF A HUNDRED OTHER COMPANIES? If yes, it is worthless, no matter how true or how relevant it is. A job title, an industry, the fact that they have employees, a generic compliment about their mission: all worthless. They advertise that the sender looked for ten seconds.

The winner is the one whose opening could ONLY have been written by someone who actually went and looked. A specific building, a specific number, a specific thing they did.

An email with NO observation that is honest and plain BEATS an email with a forced or generic one. If neither has a real observation, prefer the one that does not pretend.`,
  },
  voice: {
    key: 'voice',
    weight: 1.0,
    prompt: (ctx) => `Below are real emails written by Will, then two candidate emails.

Which candidate sounds more like the SAME PERSON wrote it? Judge rhythm, sentence-length variation, warmth, how he opens, how he closes, what he would never say. Not which is more polished — polish is the tell. Will's real emails are uneven in a way a machine is not.

### WILL'S REAL EMAILS
${(ctx.exemplars || []).slice(0, 6).map((e, i) => `--- ${i + 1} ---\n${e}`).join('\n\n') || '(none provided — say so and abstain)'}`,
  },
  fresh: {
    key: 'fresh',
    weight: 0.5, // half weight: it is a bet, and "different" is not "good"
    // ⚠️ UNPROVEN AS A LENS. Embedding-similarity as a diversity MEASURE is A-tier (Kirk
    // et al.). Asking a JUDGE to rank freshness is uncited, and the cross-lead axis is
    // where the evidence is thinnest. Half weight so it can inform but never dominate.
    prompt: (ctx) => `Below are emails already sent to OTHER people, then two candidates.

Which candidate is LESS like the already-sent set? Judge the SHAPE and the MOVE, not the words: same opening move, same rhythm, same order of ideas = the same email in different clothes, even with zero shared phrases.

Will's self-intro and the service list are ALLOWED to recur — they are the product. Judge everything around them.

Do NOT reward weirdness. A candidate that is different because it is off-key or incoherent LOSES. You are picking fresh, not strange.

### ALREADY SENT
${(ctx.recentNotes || []).slice(0, 8).map((e, i) => `--- ${i + 1} ---\n${e}`).join('\n\n') || '(none — abstain)'}`,
  },
};

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    winner: { type: 'string', enum: ['A', 'B', 'tie'], description: 'which candidate wins on THIS lens only' },
    why: { type: 'string', description: 'one sentence, concrete' },
  },
  required: ['winner', 'why'],
};

/**
 * One blind pairwise comparison on one lens, run in BOTH orderings.
 * Position bias is WORST when candidates are close in quality (Zheng et al.; Shi et al.) —
 * which is exactly N siblings from one prompt, so this is mandatory, not optional. A win
 * counts ONLY if it survives the swap; otherwise it is a tie. Frontier judges flip on
 * reorder 10-30% of the time, so expect a lot of ties here — that is the mechanism working,
 * not a bug.
 * BLIND: no provenance labels ever (labeling identical prose "human" vs "AI" swings LLM
 * judge preference by +34.3pp — Haverals & Martin).
 */
/** Run `fn` over items with at most `limit` in flight. Rate-limited judges need this. */
async function mapLimit(items, limit, fn) {
  if (!Number.isFinite(limit) || limit >= items.length) return Promise.all(items.map(fn));
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (i < items.length) { const k = i; i += 1; out[k] = await fn(items[k], k); }
  }));
  return out;
}

/** Retry a judge call on transient/rate-limit errors with exponential backoff. */
async function callWithRetry(judge, args, log) {
  const tries = judge.retries || 1;
  for (let t = 0; t < tries; t += 1) {
    try { return await judge.call(args); } catch (e) {
      const rateLimited = /quota|rate|429|exhaust/i.test(e.message || '');
      if (!rateLimited || t === tries - 1) throw e;
      const wait = 2000 * (2 ** t); // 2s, 4s, 8s
      log(`${judge.name} rate-limited, backing off ${wait / 1000}s`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  return null;
}

async function pairwiseDualOrder(judge, lens, a, b, ctx, log = () => {}) {
  const ask = async (first, second) => {
    const r = await callWithRetry(judge, {
      system: `${lens.prompt(ctx)}\n\nAnswer on THIS LENS ONLY. Report via report_verdict exactly once.`,
      user: `### CANDIDATE A\nSubject: ${first.subject}\n\n${first.body}\n\n### CANDIDATE B\nSubject: ${second.subject}\n\n${second.body}`,
      schema: VERDICT_SCHEMA,
      toolName: 'report_verdict',
    }, log);
    return r?.winner || 'tie';
  };
  // Sequential, not parallel: a rate-limited judge must not burst its own two orderings.
  const fwd = await ask(a, b);
  const rev = await ask(b, a);
  // fwd: A=a wins means a. rev: A=b wins means b. Only an order-invariant verdict counts.
  if (fwd === 'A' && rev === 'B') return { winner: a.id, consistent: true };
  if (fwd === 'B' && rev === 'A') return { winner: b.id, consistent: true };
  return { winner: null, consistent: false }; // inconsistent OR genuine tie -> no points
}

const RANKING_SCHEMA = {
  type: 'object',
  properties: {
    order: { type: 'string', description: 'the candidate labels from BEST to WORST on this lens, comma-separated, e.g. "C,A,D,B". Every label exactly once.' },
    why: { type: 'string', description: 'one sentence on why the top one won' },
  },
  required: ['order', 'why'],
};

/**
 * LISTWISE ranking with order reversal — show the judge all N at once and ask it to rank,
 * then repeat with the list REVERSED and keep only what both passes agree on.
 *
 * WHY NOT PAIRWISE (changed 2026-07-20): pairwise is what the research tested, but it costs
 * C(N,2) x 2 calls per lens — 12 calls at N=4 — and Groq's free tier caps TOKENS per minute
 * (measured: gpt-oss-120b 8,000 TPM, llama-3.3-70b 12,000 TPM). Each pairwise call carries a
 * lens prompt plus two full emails, ~700 tokens, so one lens alone is ~8,400 tokens and blows
 * the cap. That is exactly why the NOTEWORTHINESS lens — our most important one — abstained
 * with HTTP 429 on the first real 3-family run. Listwise is 2 calls and ~3,200 tokens for the
 * same N: 6x fewer requests, ~60% fewer tokens, and the lens actually returns a verdict.
 *
 * WHAT WE KEEP vs WHAT WE GIVE UP (be honest about the deviation):
 *   KEEP  — comparison. The research's core finding is COMPARATIVE beats POINTWISE scoring;
 *           a listwise ranking is still comparative, not "grade each one 1-10 in isolation".
 *   KEEP  — position-bias mitigation. Running the list forward AND reversed, then keeping
 *           only the agreement, is the same instrument as pairwise dual-ordering. On the
 *           first live test this immediately caught Qwen ranking purely by slot position.
 *   GIVE UP — the exact tested protocol. Pairwise is what Zheng et al. and Verga et al.
 *           measured; listwise is an adaptation forced by rate limits. If we ever pay for
 *           inference, switch back: set `mode: 'pairwise'` on the judge.
 * A candidate scores on RANK, not just first place, so a lens expresses a full preference
 * order rather than a single winner-take-all vote.
 */
async function listwiseDualOrder(judge, lens, candidates, ctx, log = () => {}) {
  const label = (i) => String.fromCharCode(65 + i); // A, B, C...
  const render = (list) => list.map((c, i) => `### CANDIDATE ${label(i)}\nSubject: ${c.subject}\n\n${c.body}`).join('\n\n');
  const ask = async (list) => {
    const r = await callWithRetry(judge, {
      system: `${lens.prompt(ctx)}\n\nRank ALL candidates on THIS LENS ONLY, best first. Report via report_ranking exactly once.`,
      user: render(list),
      schema: RANKING_SCHEMA,
      toolName: 'report_ranking',
    }, log);
    if (!r?.order) return null;
    // Map the returned labels back to candidate ids, in rank order.
    const ids = String(r.order).split(/[,\s]+/).map((s) => s.trim().toUpperCase()).filter(Boolean)
      .map((l) => list[l.charCodeAt(0) - 65]?.id).filter(Boolean);
    return ids.length === list.length ? ids : null; // a partial/garbled ranking is unusable
  };
  const fwd = await ask(candidates);
  const rev = await ask([...candidates].reverse());
  if (!fwd || !rev) return null; // garbled/partial ranking is the only true abstention

  // AVERAGE THE TWO RANKINGS — the averaging IS the debiasing, so do not throw the lens
  // away when the two orders disagree on #1.
  //
  // (Corrected 2026-07-20. The first version abstained whenever fwd[0] !== rev[0], and on
  // a live lead THREE of four lenses abstained and the "winner" scored 0.0 — i.e. the
  // tie-break picked the note and the panel contributed nothing. That rule was far too
  // strict: disagreement on the top slot is EXPECTED, because position bias is worst
  // exactly when candidates are close in quality, which N siblings from one prompt always
  // are. Discarding a full preference order because its head disagreed threw away the
  // signal we paid for.)
  //
  // Why averaging is sufficient: each pass reflects (real signal + position preference).
  // Reversing the list flips the position component while leaving the signal, so the mean
  // cancels the former and keeps the latter — the same argument as pairwise dual-ordering.
  // A PURELY positional judge (one that always answers "A,B,C,D" regardless of content)
  // self-neutralises: fwd and rev are exact reverses, every candidate averages to
  // (n-1)/2, and the lens contributes zero discrimination without any special-casing. A
  // partially-biased judge is partially discounted, which is the behaviour we want.
  const rank = {};
  for (const c of candidates) {
    const a = fwd.indexOf(c.id); const b = rev.indexOf(c.id);
    rank[c.id] = (a + b) / 2;
  }
  // Log when the head disagrees — it is not fatal, but a lens that does it every time is
  // telling you the judge is weak on this task (that is how Qwen was caught).
  if (fwd[0] !== rev[0]) log(`   ${lens.key} (${judge.name}): orders disagree on #1 (${fwd[0]} vs ${rev[0]}) — averaged, position component cancels`);
  return rank;
}

/**
 * Run the panel over the survivors and return them ranked.
 * Cost: lenses x 2 calls (listwise). With 4 lenses that is 8 calls per lead, vs 48 pairwise.
 */
export async function judgePanel(candidates, { assignments, ctx = {}, log = () => {} }) {
  if (candidates.length === 1) return [{ ...candidates[0], score: 0, wins: {}, note: 'only survivor, unjudged' }];
  const score = Object.fromEntries(candidates.map((c) => [c.id, 0]));
  const wins = Object.fromEntries(candidates.map((c) => [c.id, {}]));
  const n = candidates.length;
  log(`panel: ${assignments.map((a) => `${a.lens.key}→${a.judge.name}`).join(' ')} · ${assignments.length * 2} calls (listwise)`);
  // Each lens is judged by ONE model, and lenses run concurrently. A judge that errors
  // (bad key, quota, transient) must never take the whole lead down — its lens simply
  // abstains and the rest still rank. Silent degradation is worse than a loud one, so it
  // logs; but a lost lens is strictly better than a lost lead.
  await Promise.all(assignments.map(async ({ lens, judge }) => {
    try {
      const rank = await listwiseDualOrder(judge, lens, candidates, ctx, log);
      if (!rank) return; // abstained (garbled ranking, or position bias caught)
      // Convert rank -> points so a lens expresses a full preference order: best gets
      // (n-1) x weight, worst gets 0. Averaged ranks give halves, which is intended.
      for (const c of candidates) {
        score[c.id] += (n - 1 - rank[c.id]) * lens.weight;
      }
      const best = candidates.reduce((x, y) => (rank[x.id] <= rank[y.id] ? x : y));
      wins[best.id][lens.key] = 1;
    } catch (e) {
      log(`⚠️ lens ${lens.key} (${judge.name}) failed and ABSTAINED: ${e.message.slice(0, 80)}`);
    }
  }));
  const ranked = [...candidates].map((c) => ({ ...c, score: score[c.id], wins: wins[c.id] }))
    .sort((a, b) => b.score - a.score
      // TIE-BREAK POLICY (required, or the selector stalls — ties are EXPECTED because
      // position bias is worst at small quality gaps). Order: panel score, then the
      // generator's own reply_odds, then SHORTER. Shorter is the deliberate default for
      // this domain: the length-bias literature is assistant-helpfulness (longer≈better)
      // and may have the OPPOSITE sign for cold email, where brevity is plausibly the
      // quality signal. Nothing in the literature settles it — measure it on our own
      // held-out emails before trusting either direction.
      || (b.reply_odds || 0) - (a.reply_odds || 0)
      || noteWordCount(a.body) - noteWordCount(b.body));
  log(`panel: ${ranked.map((c) => `${c.id}=${c.score.toFixed(1)}${c.id === ranked[0].id ? ' WINNER' : ''}`).join(' ')}`);
  return ranked;
}

/** Anthropic adapter. */
export function anthropicJudge(anthropic, { model = ANTHROPIC_MODEL, name = 'claude' } = {}) {
  return {
    name, family: 'anthropic',
    async call({ system, user, schema, toolName }) {
      const r = await anthropic.messages.create({
        model, max_tokens: 500, temperature: 0, system,
        tools: [{ name: toolName, description: 'Report the verdict.', input_schema: schema }],
        tool_choice: { type: 'tool', name: toolName },
        messages: [{ role: 'user', content: user }],
      });
      return (r.content || []).find((b) => b.type === 'tool_use' && b.name === toolName)?.input || null;
    },
  };
}

/**
 * Gemini adapter — the SECOND FAMILY, which is what makes this a real panel rather than
 * Anthropic marking its own homework (Verga et al.: a 3-model panel of disjoint families
 * beat a single GPT-4 judge at ~7x lower cost, and self-preference bias is measured —
 * Panickssery et al.; Wataoka et al. locate the mechanism in perplexity, i.e. judges
 * over-reward text that is FAMILIAR to them).
 * NOTE (2026-07-17): gemini-2.0/2.5-* are closed to new API keys ("no longer available to
 * new users"), and gemini-2.0-flash returns a hard quota error on a fresh free key.
 * gemini-3.5-flash and gemini-flash-latest work. Responses may carry a `thoughtSignature`
 * part alongside the text part — pick the part that actually has `.text`, do not assume
 * parts[0].
 */
export function geminiJudge(apiKey, { model = 'gemini-3.5-flash', name = 'gemini', concurrency = 2, retries = 4 } = {}) {
  return {
    name, family: 'google',
    // The free tier is RATE-limited (~10-15 req/min), not volume-limited, so firing the
    // pairwise comparisons concurrently returns "exceeded your current quota" even though
    // single calls succeed (verified 2026-07-17: identical requests return HTTP 200 when
    // spaced out, 429 when bursted). judgePanel honours this, and `call` retries with
    // backoff on top. If Will ever enables billing, raise concurrency and this disappears.
    concurrency, retries,
    async call({ system, user, schema }) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ parts: [{ text: user }] }],
          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: Object.fromEntries(Object.entries(schema.properties).map(([k, v]) => [k, v.enum ? { type: 'STRING', enum: v.enum } : { type: 'STRING' }])),
              required: schema.required,
            },
          },
        }),
      }).then((x) => x.json());
      if (r.error) throw new Error(`gemini: ${r.error.message?.slice(0, 90)}`);
      const parts = r.candidates?.[0]?.content?.parts || [];
      const text = parts.find((p) => typeof p.text === 'string' && p.text.trim())?.text;
      if (!text) return null;
      try { return JSON.parse(text); } catch { return null; }
    },
  };
}

/**
 * Groq adapter — OpenAI-compatible, and the reason we have a REAL panel at zero cost.
 * One key serves several open-weight families, none of them Anthropic (the generator's).
 *
 * MEASURED 2026-07-20 (blind pairwise, both orderings, on the actual defect: Evan's
 * job-title opener vs Melanie's One Soho Square find — correct answer is Melanie):
 *   openai/gpt-oss-120b     order-invariant, CORRECT   ~1.0s   -> USE
 *   llama-3.3-70b-versatile order-invariant, CORRECT   ~1.0s   -> USE
 *   qwen/qwen3.6-27b        FLIPPED (said "A" in both orders), empty reasoning -> DROP
 * Qwen was the model Will specifically asked about and it turned out to be the worst
 * judge of the three: pure position bias, which a single-order comparison would have
 * reported as a confident verdict. The dual-ordering caught it on the first real test.
 * Kimi (also asked about) is NOT in Groq's catalog at all — do not re-propose it.
 *
 * TWO API QUIRKS, both cost real debugging time:
 *  1. `response_format: {type:'json_object'}` makes Groq HARD-FAIL with HTTP 400
 *     "Failed to validate JSON" on gpt-oss and qwen (the models emit reasoning before
 *     the object). Do NOT set it. Ask for JSON in the prompt and extract the first
 *     {...} block instead — that works on all of them.
 *  2. The free tier rate-limits on BURST: 12 concurrent pairwise calls returned 4 OK
 *     and 8 x HTTP 429. Hence concurrency 2 + backoff, same as Gemini.
 */
export function groqJudge(apiKey, { model = 'openai/gpt-oss-120b', name = null, family = null, concurrency = 2, retries = 4 } = {}) {
  const FAMILY_BY_MODEL = { 'openai/gpt-oss': 'openai', 'llama-': 'meta', 'qwen/': 'alibaba' };
  const inferred = Object.entries(FAMILY_BY_MODEL).find(([p]) => model.startsWith(p) || model.includes(p))?.[1] || 'groq';
  return {
    name: name || model.split('/').pop().split('-')[0],
    family: family || inferred,
    concurrency, retries,
    async call({ system, user, schema }) {
      const shape = `{${Object.keys(schema.properties).map((k) => {
        const v = schema.properties[k];
        return `"${k}":${v.enum ? v.enum.map((e) => `"${e}"`).join('|') : '"..."'}`;
      }).join(',')}}`;
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model, temperature: 0, max_tokens: 800,
          // NO response_format — see quirk 1 above.
          messages: [
            { role: 'system', content: `${system}\n\nReply with ONLY this JSON object and nothing else: ${shape}` },
            { role: 'user', content: user },
          ],
        }),
      });
      if (!r.ok) throw new Error(`groq ${model}: HTTP ${r.status} ${(await r.text()).slice(0, 80)}`);
      const j = await r.json();
      const txt = j.choices?.[0]?.message?.content ?? '';
      const m = String(txt).match(/\{[\s\S]*?\}/); // first object; models prepend reasoning
      if (!m) return null;
      try { return JSON.parse(m[0]); } catch { return null; }
    },
  };
}

/**
 * Build the panel from whatever keys exist, and ASSIGN ONE LENS PER JUDGE.
 *
 * WHY one-lens-per-judge (2026-07-17): running every lens through every judge costs
 * lenses x judges x C(N,2) x 2 calls — with 4 lenses, 3 judges and N=5 that is 240 calls
 * and ~5 minutes PER LEAD, which is absurd. Assigning each lens to a different family is
 * both ~5x cheaper AND more family-diverse per lens, which is the property the research
 * actually cares about. The noteworthiness lens (the bet aimed at our worst defect) goes
 * to a NON-Anthropic judge on purpose: the generator is Anthropic, so scoring its own
 * observations is precisely the self-preference case.
 * Falls back to single-family (and says so loudly) when only one key exists.
 */
export function buildPanel({ anthropic, groqKey = null, geminiKey = null, log = () => {} }) {
  const claude = anthropicJudge(anthropic);

  // PREFERRED: Groq gives two NON-Anthropic families from one free key, both verified as
  // order-invariant and CORRECT on our actual defect (see groqJudge). That makes a genuine
  // 3-family panel — OpenAI + Meta + Anthropic — which is what Verga et al. actually tested.
  // Claude staying as ONE of three is fine; the research's concern is a panel made ONLY of
  // the generator's family, and here it is outvoted 2-to-1.
  if (groqKey) {
    const gptoss = groqJudge(groqKey, { model: 'openai/gpt-oss-120b' });
    const llama = groqJudge(groqKey, { model: 'llama-3.3-70b-versatile' });
    log(`panel: 3 families (${gptoss.family}/${gptoss.name}, ${llama.family}/${llama.name}, anthropic/claude)`);
    return [
      // NOTEWORTHINESS scores the generator's OWN observations, so it must never run on the
      // generator's family — that is the textbook self-preference case, and it is also our
      // worst defect. gpt-oss got this exact comparison right in testing.
      { lens: LENSES.noteworthy, judge: gptoss },
      // REPLY ("would a busy person actually reply") is the other high-weight judgement;
      // second non-Anthropic family so the two lenses that decide most of the score are
      // both independent of the writer.
      { lens: LENSES.reply, judge: llama },
      // VOICE compares against Will's own exemplars. Kept on Claude deliberately: it is
      // a nuanced style-matching call, and Claude is not scoring its own observation here,
      // it is scoring similarity to a fixed human reference.
      { lens: LENSES.voice, judge: claude },
      // FRESH is the lowest-weight bet (0.5) — Claude is fine and it saves Groq quota.
      { lens: LENSES.fresh, judge: claude },
    ];
  }

  // FALLBACK: Gemini. Kept only because the key already exists; the free tier is 20
  // requests/DAY (~1.5 leads), so this is a stopgap, not a design. See the memory doc.
  if (geminiKey) {
    const gemini = geminiJudge(geminiKey);
    log('panel: 2 families (google/gemini + anthropic/claude) — Gemini free tier is ~20 req/day, expect abstentions.');
    return [
      { lens: LENSES.noteworthy, judge: gemini },
      { lens: LENSES.fresh, judge: claude },
      { lens: LENSES.voice, judge: claude },
      { lens: LENSES.reply, judge: claude },
    ];
  }

  log('⚠️ SINGLE-FAMILY PANEL — no GROQ_API_KEY or GEMINI_API_KEY. Anthropic is judging Anthropic, which is the exact self-preference case the research warns about. Add a free Groq key to fix.');
  return Object.values(LENSES).map((lens) => ({ lens, judge: claude }));
}

// ============================================================================
// THE LOOP
// ============================================================================

/**
 * composeNoteV2 — generate N, screen, select. NO PATCHING, EVER.
 * Returns { note, ranked, rejected, refused } — refused=true means no candidate survived,
 * which is a legitimate outcome (Will approved refuse-to-draft 2026-07-14): the system
 * being forced to produce a note for every lead is what guarantees a floor of blandness.
 * Five strong notes beat ten inert ones, and Will already discards ~62% by hand.
 */
export async function composeNoteV2(anthropic, {
  lead, firm, audience, remote = false, exemplars = [], recentNotes = [],
  observations = [], trigger = null, officeContext = false,
  n = 4, groqKey = null, geminiKey = null, assignments = null,
  label = lead?.email || lead?.name || 'lead', log = console.error,
}) {
  const panel = assignments || buildPanel({ anthropic, groqKey, geminiKey, log });
  const { candidates, research_note, linkedin_step } = await generateCandidates(anthropic, {
    lead, firm, audience, remote, exemplars, recentNotes, observations, trigger, n, log,
  });

  const { survivors, rejected } = screenCandidates(candidates, { audience, trigger, officeContext });
  if (rejected.length) log(`screened out ${rejected.length}/${candidates.length}: ${rejected.map((r) => `${r.id}(${r.reason.slice(0, 60)})`).join(' | ')}`);
  if (!survivors.length) {
    // Every candidate broke a hard rule. Do NOT patch one back to life — that is the v1
    // failure mode. Regenerating is the correct move; the caller decides whether to retry.
    return { note: null, ranked: [], rejected, refused: true, reason: 'no candidate passed the terminal gate' };
  }

  const ranked = await judgePanel(survivors, {
    assignments: panel,
    ctx: { title: lead?.title, company: lead?.company, exemplars, recentNotes },
    log,
  });
  const winner = ranked[0];
  const note = {
    subject: winner.subject,
    body: applySignoff(winner.body, pickSignoff(lead?.email || lead?.name, 1)),
    research_note, linkedin_step,
  };
  log(`winner for ${label}: ${winner.id} (${winner.angle} / ${winner.shape}, ${noteWordCount(winner.body)}w, score ${winner.score?.toFixed(1)})`);
  return { note, ranked, rejected, refused: false, winner };
}
