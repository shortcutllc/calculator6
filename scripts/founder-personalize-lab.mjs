/**
 * founder-personalize-lab.mjs — SANDBOX experiment (Will 2026-07-08): be HUMAN, not
 * robotic. Instead of a trigger_type deciding the opener, INFORM the model, have it
 * research the company and EXTRACT one genuine, specific, kind personal detail from
 * ANY category (growth, milestone, new office, product, leadership, an award, or how
 * they treat their people), then open the note with a warm human line that connects
 * honestly to Shortcut. Prints the personalized draft SIDE-BY-SIDE with the current
 * production note (composeNote) so we can compare before anything touches prod.
 *
 * NEVER sends or writes Gmail/Slack/DB. Output only. Hard caps per lead.
 *
 *   set -a; . ~/.shortcut-cron.env; set +a
 *   export ANTHROPIC_API_KEY=$(grep ^ANTHROPIC_API_KEY ~/.openclaw/workspace/.env|cut -d= -f2-)
 *   node scripts/founder-personalize-lab.mjs            # runs the 3-lead demo set
 *   node scripts/founder-personalize-lab.mjs --only "Morning Brew"
 */
import { readFileSync } from 'fs';
import Anthropic from '@anthropic-ai/sdk';
import { composeNote, guardNote, todayLong } from '../netlify/functions/lib/founder-note.js';
import { buildPositioningBlock } from '../netlify/functions/lib/positioning.js';

const args = process.argv.slice(2);
const val = (f, d) => { const i = args.indexOf(f); return i !== -1 && args[i + 1] ? args[i + 1] : d; };
const ONLY = val('--only', null);
const envKey = (n) => { try { return (readFileSync('/Users/willnewton/.openclaw/workspace/.env', 'utf8').match(new RegExp(`^${n}=(.+)$`, 'm'))?.[1] || '').trim().replace(/^["']|["']$/g, ''); } catch { return ''; } };
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || envKey('ANTHROPIC_API_KEY');
const MODEL = 'claude-sonnet-4-5-20250929';
const MAX_ITERS = 6; const TIMEOUT_MS = 110000;
const c = { g: (s) => `\x1b[90m${s}\x1b[0m`, b: (s) => `\x1b[1m${s}\x1b[0m`, gr: (s) => `\x1b[32m${s}\x1b[0m`, cy: (s) => `\x1b[36m${s}\x1b[0m`, y: (s) => `\x1b[33m${s}\x1b[0m` };

// The experiment leads (real, from this morning's harvest). trigger/triggerType are
// what production has TODAY, so the comparison is apples-to-apples.
const LEADS = [
  { name: 'Stacey Lieberman', title: 'Chief of Staff', company: 'Morning Brew', location: 'New York, New York', trigger: 'Associate Director, People Ops role open (Axel Springer owned, NYC)', triggerType: 'people_posting' },
  { name: 'Naz Hassan', title: 'Director of People Operations', company: 'LeapXpert', location: 'New York, New York', trigger: '$180M Growth funding led by Riverwood Capital on June 30, 2026', triggerType: 'funding' },
  { name: 'Jessica Ryan', title: 'Senior Director & Head of Talent Strategy', company: 'Orr Group', location: 'New York, New York', trigger: 'Head of People & Culture role open (nonprofit consulting, NYC/DC)', triggerType: 'people_posting' },
];

const PERSONAL_SCHEMA = {
  type: 'object',
  properties: {
    personal_detail: { type: ['string', 'null'], description: 'the single most genuine, specific, verified fact you found, or null if nothing real exists' },
    category: { type: 'string', description: 'growth | milestone | office | product | leadership | award | how_they_treat_people | person' },
    warm_line: { type: ['string', 'null'], description: "a first-person warm sentence Will could actually say to open with, in his calm human voice (no buzzwords, no dashes). null if no genuine detail." },
    connects: { type: 'string', description: 'one honest line on how it connects to caring for their team (or "generic" if it does not)' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: ['personal_detail', 'category', 'warm_line', 'connects', 'confidence'],
};

function personalizeSystem() {
  return `You help Will Newton, founder of Shortcut, write a GENUINELY personal 1:1 note to ONE person. Shortcut brings wellness into companies: in-person (chair massage, nails, facials) and flexible services delivered in person or over Zoom (mindfulness, sound baths, nutrition coaching), one team, fully managed, and people actually use it.

YOUR JOB: research THIS company and find the SINGLE most genuine, specific, HUMAN detail a thoughtful person would actually notice and warmly mention. It can come from ANY category:
- a real milestone (funding, IPO, a revenue milestone, a big launch)
- a new office / HQ / expansion
- a notable product or something they are known for
- a leadership moment (new CEO, a founder transition)
- an award or recognition
- HOW THEY TREAT THEIR PEOPLE (their culture, an internal wellness program, benefits, work-life values) — often the warmest and most relevant detail for Shortcut
- something the person themselves is known for

HOW TO CHOOSE: prefer the detail that is (a) genuinely warm and kind to mention, and (b) connects HONESTLY to caring for a team. A company that already invests in its people's wellbeing is a GREAT fit to point out, not awkward. Avoid anything that reads like a scraped job posting ("I saw you're hiring…") — that is not human.

HARD RULES: it must be TRUE and specific — verify with 1 to 3 web searches and only report what you actually found. NEVER invent or embellish. If nothing genuine exists, return personal_detail=null (rare — most companies have something real).

Write warm_line the way Will actually talks: calm, human, kind, a little understated. No buzzwords, no dashes as punctuation, no exclamation points. Report via report_personal exactly once.`;
}

async function personalize(anthropic, lead, counters, t0) {
  const tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }, { name: 'report_personal', description: 'Report the single personal detail. Call once.', input_schema: PERSONAL_SCHEMA }];
  const messages = [{ role: 'user', content: `The person: ${lead.name}, ${lead.title} at ${lead.company} (${lead.location}). Research ${lead.company} and report the single best genuine personal detail, then call report_personal.` }];
  let iters = 0;
  while (iters < MAX_ITERS) {
    if (Date.now() - t0 > TIMEOUT_MS) break;
    iters += 1;
    let resp;
    try { resp = await anthropic.messages.create({ model: MODEL, max_tokens: 1500, system: personalizeSystem(), tools, messages }); }
    catch (e) { return { personal_detail: null, category: 'error', warm_line: null, connects: e.message, confidence: 'low' }; }
    counters.in += resp.usage?.input_tokens || 0; counters.out += resp.usage?.output_tokens || 0;
    messages.push({ role: 'assistant', content: resp.content });
    const rp = (resp.content || []).find((b) => b.type === 'tool_use' && b.name === 'report_personal');
    if (rp) return rp.input;
    if (resp.stop_reason === 'pause_turn') continue;
    if (resp.stop_reason === 'end_turn') { messages.push({ role: 'user', content: 'Call report_personal now.' }); }
  }
  return { personal_detail: null, category: 'none', warm_line: null, connects: 'research incomplete', confidence: 'low' };
}

// Draft a warm note that OPENS with the personal line, grounded in the brain.
async function personalizeDraft(anthropic, lead, artifact, counters) {
  const brain = buildPositioningBlock({ channel: 'direct' });
  const system = `You are Will Newton, founder of Shortcut, writing ONE short, warm, human 1:1 email. This is WRITING, not assembling lines.

${brain}

TODAY IS ${todayLong()}. Never call a past date "upcoming".

OPEN WITH THE PERSONAL LINE below, in your own words, warm and genuine and kind. It is the reason this email is not a template. Then say who you are and what Shortcut does (fresh words, complete sentences, services inside a real sentence, never a bare list). Weave in ONE real proof only if it flows. Make clear it is zero lift for them. Close soft (offer to send a bit more). End "Cheers!" then "Will".

VOICE: calm, warm, human, a little understated. Contractions. Email breathes (warmth over compression, not clipped fragments). No buzzwords, no dashes as punctuation, no exclamation points except the sign-off. Never assert their team is stressed (only an "if"/question). Never RTO framing.

THE PERSONAL LINE (verified, use it): ${artifact.warm_line || '(none found — write a warm clean note with no personal hook)'}
Why it connects: ${artifact.connects || 'n/a'}

Report via report_note (subject, body).`;
  const resp = await anthropic.messages.create({
    model: MODEL, max_tokens: 1200, system,
    tools: [{ name: 'report_note', description: 'Report the note.', input_schema: { type: 'object', properties: { subject: { type: 'string' }, body: { type: 'string' } }, required: ['subject', 'body'] } }],
    tool_choice: { type: 'tool', name: 'report_note' },
    messages: [{ role: 'user', content: `Write the note for ${lead.name} at ${lead.company}.` }],
  });
  counters.in += resp.usage?.input_tokens || 0; counters.out += resp.usage?.output_tokens || 0;
  const tu = (resp.content || []).find((b) => b.type === 'tool_use' && b.name === 'report_note');
  return tu?.input || { subject: '', body: '' };
}

(async () => {
  if (!ANTHROPIC_KEY) { console.error('MISSING ANTHROPIC_API_KEY'); process.exit(2); }
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });
  const leads = ONLY ? LEADS.filter((l) => l.company.toLowerCase().includes(ONLY.toLowerCase())) : LEADS;
  console.log(c.b(`\n╔══ PERSONALIZE LAB — research-wide + human line vs current production (${leads.length} leads) ══╗`));
  console.log(c.g('  sandbox: nothing sends/writes\n'));

  for (const lead of leads) {
    const counters = { in: 0, out: 0 }; const t0 = Date.now();
    console.log(c.b(`\n════════ ${lead.name} · ${lead.title} · ${lead.company} ════════`));
    const art = await personalize(anthropic, lead, counters, t0);
    console.log(`  ${c.cy('FOUND')} [${art.category}/${art.confidence}] ${art.personal_detail ? art.personal_detail.slice(0, 140) : c.g('nothing genuine')}`);
    if (art.warm_line) console.log(`  ${c.cy('WARM LINE')} ${c.gr(art.warm_line)}`);
    // Route the verified warm_line THROUGH the real production pipeline (draft ->
    // guard -> one-proof -> skeptic -> revise). Same engine as prod = final email.
    let note = { subject: '', body: '(no draft)' };
    try {
      const r = await composeNote(anthropic, { lead: { ...lead, email: 'lab@example.com' }, firm: null, exemplars: [], audience: 'tech-execs', ctaVariant: 'help', trigger: lead.trigger, triggerType: lead.triggerType, personalHook: art.warm_line });
      note = r.note;
    } catch (e) { note = { subject: '', body: 'PIPELINE ERROR: ' + e.message }; }
    let guard = c.gr('PASS'); try { guardNote({ subject: note.subject, body: note.body }, 'tech-execs', null); } catch (e) { guard = c.y('guard: ' + e.message); }
    console.log(c.b('\n  ── PERSONALIZED (through real pipeline) ──') + `  ${guard}`);
    console.log(c.b('  SUBJECT: ') + note.subject);
    console.log((note.body || '').split('\n').map((l) => c.cy('  │ ') + l).join('\n'));

    // production comparison (current deployed logic)
    let prod = null; try { const r = await composeNote(anthropic, { lead: { ...lead, email: 'lab@example.com' }, firm: null, exemplars: [], audience: 'tech-execs', ctaVariant: 'help', trigger: lead.trigger, triggerType: lead.triggerType }); prod = r.note; } catch (e) { prod = { body: 'ERROR ' + e.message }; }
    console.log(c.b('\n  ── PRODUCTION (current) ──'));
    console.log((prod.body || '').split('\n').map((l) => c.g('  │ ') + l).join('\n'));
    console.log(c.g(`\n  tokens ~${counters.in + counters.out} · ${(Date.now() - t0) / 1000 | 0}s`));
  }
  console.log(c.g('\nSandbox complete. Nothing sent or written.'));
})().catch((e) => { console.error('LAB_ERROR:', e.message); process.exit(1); });
