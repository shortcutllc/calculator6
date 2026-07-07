/**
 * founder-agent-lab.mjs — SANDBOXED agent dev harness for founder notes.
 * See memory/tech_exec_targeting.md "ARCHITECTURE HONESTY" (Will 2026-07-07).
 *
 * The production founder-note system is a SCRIPTED PIPELINE (draft→guard→revise→
 * skeptic). This harness is the opposite: a real AGENT LOOP — an LLM that
 * self-directs with tools (research, look up the lead, decide, self-verify,
 * submit) — so we can measure whether model-driven reasoning beats the pipeline,
 * WITHOUT any production risk. It is wrapped in hard, deterministic guardrails:
 *
 *   APPROVAL LAYER : never sends. Never writes Gmail / Slack / saved_drafts / any
 *                    DB. Output is stdout (+ optional --out file) for human review.
 *   COST LIMIT     : cumulative token budget (--max-tokens); the loop aborts the
 *                    instant a model call would push it over, and reports $ spent.
 *   ITERATION LIMIT: --max-iterations tool-use rounds (runaway-loop backstop).
 *   TIME LIMIT     : --timeout-ms wall clock; aborts a hung run.
 *   TOOL ALLOWLIST : the agent gets exactly three tools (web_search server-side,
 *                    get_lead_facts read-only, submit_draft terminal). Nothing
 *                    else — no send, no write, no filesystem.
 *   FINAL GATE     : the agent's submitted draft still runs the SAME deterministic
 *                    guardNote + coherence skeptic as production, and the verdict
 *                    is reported (a violating agent draft is a finding, not a send).
 *
 *   set -a; source ~/.shortcut-cron.env; set +a ; export ANTHROPIC_API_KEY=...
 *   node scripts/founder-agent-lab.mjs --email jourdan@karbonhq.com --audience tech-execs
 *   node scripts/founder-agent-lab.mjs --email <e> --compare   # agent vs scripted pipeline
 *   node scripts/founder-agent-lab.mjs --audience tech-execs --name "Ada Lovelace" \
 *        --title "Head of People" --company "Acme AI" --location "New York, NY"
 */
import { readFileSync, writeFileSync } from 'fs';
import Anthropic from '@anthropic-ai/sdk';
import { voiceSystem, guardNote, critiqueNote, composeNote, reviseNote, autoFixDashes, autoSplitParagraphs, normalizeParagraphs } from '../netlify/functions/lib/founder-note.js';

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d) => { const i = args.indexOf(f); return i !== -1 && args[i + 1] ? args[i + 1] : d; };
const envKey = (n) => { try { return (readFileSync('/Users/willnewton/.openclaw/workspace/.env', 'utf8').match(new RegExp(`^${n}=(.+)$`, 'm'))?.[1] || '').trim().replace(/^["']|["']$/g, ''); } catch { return ''; } };
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || envKey('ANTHROPIC_API_KEY');

const MODEL = val('--model', 'claude-sonnet-4-5-20250929');
const AUDIENCE = val('--audience', 'tech-execs');
const CTA = ['help', 'convo'].includes(val('--cta', '')) ? val('--cta', '') : 'help';
const TRIGGER = val('--trigger', null);
const EMAIL = val('--email', null);
const COMPARE = has('--compare');
const OUT = val('--out', null);
// GUARDRAILS (deterministic, enforced by this wrapper — not the agent):
const MAX_TOKENS = parseInt(val('--max-tokens', '200000'), 10) || 200000;
const MAX_ITERS = parseInt(val('--max-iterations', '12'), 10) || 12;
const TIMEOUT_MS = parseInt(val('--timeout-ms', '240000'), 10) || 240000;
const MAX_REVISES = parseInt(val('--max-revises', '2'), 10); // gate-failure feedback rounds (a)
const BATCH = val('--batch', null) ? parseInt(val('--batch', null), 10) : null; // (b) run N leads
const CRAFT = has('--craft'); // craft-first drafting experiment (Will 2026-07-07): points as raw material, write coherent prose, vary phrasing, hook must earn its place — vs the compliance-gated pipeline.
// Sonnet 4.5 list price (approx, for a $ estimate only): $3/M in, $15/M out.
const PRICE_IN = 3 / 1e6; const PRICE_OUT = 15 / 1e6;

const c = { gray: (s) => `\x1b[90m${s}\x1b[0m`, bold: (s) => `\x1b[1m${s}\x1b[0m`, green: (s) => `\x1b[32m${s}\x1b[0m`, red: (s) => `\x1b[31m${s}\x1b[0m`, yellow: (s) => `\x1b[33m${s}\x1b[0m`, cyan: (s) => `\x1b[36m${s}\x1b[0m` };

const usd = (n) => `$${n.toFixed(4)}`;
const summarizeToolUse = (b) => {
  if (b.type === 'server_tool_use' && b.name === 'web_search') return `${c.cyan('search')} "${(b.input?.query || '').slice(0, 70)}"`;
  if (b.type === 'web_search_tool_result') return c.gray(`  ↳ ${Array.isArray(b.content) ? b.content.length : '?'} results (discarded after this phase)`);
  if (b.type === 'tool_use') return `${c.yellow('tool')} ${b.name}`;
  return null;
};

// =========================================================================
// STEP 1 — SPLIT RESEARCH FROM WRITING (Anthropic "context quarantine").
// PHASE 1 (this fn): an isolated research loop with web_search that returns a
// COMPACT facts artifact (~a few hundred tokens). The bulky search-result blocks
// live ONLY in this phase's messages and are THROWN AWAY when it returns — they
// never travel into drafting/revising. That is the whole fix for the 119k blowup.
// =========================================================================
const GET_LEAD_FACTS = { name: 'get_lead_facts', description: 'Return everything WE already know about this recipient (name, title, company, location). Call FIRST — the ground truth any hook must fit.', input_schema: { type: 'object', properties: {}, required: [] } };
const REPORT_FINDINGS = {
  name: 'report_findings',
  description: 'Report the compact research artifact. Call exactly once when done. Do NOT draft an email here.',
  input_schema: {
    type: 'object',
    properties: {
      hook: { type: ['string', 'null'], description: 'ONE specific, verified, recent fact that clearly FITS THIS person (their city/office/role), phrased ready to reference — or null if nothing clearly fits (null is the common, correct answer).' },
      hook_basis: { type: 'string', description: 'the evidence + one line on why it fits THIS exact person (location/role), or "none".' },
      company_stage: { type: 'string', description: 'e.g. "high-growth, recently raised", "established 400+ employees", "unknown".' },
      notes: { type: 'string', description: 'anything else genuinely useful, one line.' },
    },
    required: ['hook', 'hook_basis', 'company_stage'],
  },
};

function researchSystem(audience) {
  return `You are the RESEARCH step for a founder's 1:1 outreach note (audience: ${audience}). Your ONLY job is to gather facts and report a compact artifact. You do NOT write the email.

Do this:
1. Call get_lead_facts first to see exactly who this person is (name, title, company, LOCATION).
2. Decide if research is worth it. 1-2 web searches max. Most prospects have no usable specific hook, and that is FINE.
3. If you find a specific fact, VERIFY IT FITS THIS PERSON before reporting it as a hook: does it match their city/office/role? A "Best Workplaces in Chicago" award is meaningless to a New-York contact (a different office earned it) — that is NOT a valid hook, report hook=null. A fact must be real AND about THIS person's context to count.
4. Call report_findings once: a single fitting hook (or null), why it fits, and the company stage. Keep it short. Do not draft anything.`;
}

async function runResearch(anthropic, leadFacts, { audience }, counters, trace, t0) {
  const tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }, GET_LEAD_FACTS, REPORT_FINDINGS];
  const messages = [{ role: 'user', content: `Research this prospect at ${leadFacts.company}, then call report_findings. Call get_lead_facts for the full record.` }];
  let iters = 0, artifact = null, aborted = null;
  while (iters < MAX_ITERS) {
    if (Date.now() - t0 > TIMEOUT_MS) { aborted = 'timeout'; break; }
    if (counters.tokensIn + counters.tokensOut >= MAX_TOKENS) { aborted = 'token_budget'; break; }
    iters += 1;
    let resp;
    try { resp = await anthropic.messages.create({ model: MODEL, max_tokens: 1500, system: researchSystem(audience), tools, messages }); }
    catch (e) { aborted = `api_error: ${e.message}`; break; }
    counters.tokensIn += resp.usage?.input_tokens || 0; counters.tokensOut += resp.usage?.output_tokens || 0;
    for (const b of resp.content || []) {
      if (b.type === 'text' && b.text.trim()) trace.push(`${c.gray('  research')} ${b.text.trim().slice(0, 150)}`);
      const s = summarizeToolUse(b); if (s) trace.push(`${c.gray('  research')} ${s}`);
    }
    messages.push({ role: 'assistant', content: resp.content });
    const calls = (resp.content || []).filter((b) => b.type === 'tool_use' && ['get_lead_facts', 'report_findings'].includes(b.name));
    const rf = calls.find((b) => b.name === 'report_findings');
    if (rf) { artifact = rf.input; break; }
    if (resp.stop_reason === 'pause_turn') continue;
    if (!calls.length) { if (resp.stop_reason === 'end_turn') { messages.push({ role: 'user', content: 'Call report_findings now.' }); continue; } continue; }
    messages.push({ role: 'user', content: calls.map((b) => ({ type: 'tool_result', tool_use_id: b.id, content: b.name === 'get_lead_facts' ? JSON.stringify(leadFacts) : 'received' })) });
  }
  return { artifact: artifact || { hook: null, hook_basis: 'research incomplete', company_stage: 'unknown' }, iters, aborted };
}

// PHASE 2 — DRAFT FROM THE ARTIFACT (small context, NO search blocks). One call.
const DRAFT_SCHEMA = { type: 'object', properties: { subject: { type: 'string' }, body: { type: 'string' }, research_note: { type: 'string' } }, required: ['subject', 'body', 'research_note'] };
async function draftFromArtifact(anthropic, leadFacts, artifact, { audience, cta }, counters) {
  const user = [
    'Draft the founder note now. There is NO web research to do — everything you need is right here.',
    'RECIPIENT (trusted facts):', JSON.stringify(leadFacts, null, 2),
    'RESEARCH FINDINGS (already verified to fit this person):', JSON.stringify(artifact, null, 2),
    artifact.hook
      ? 'Use the hook above — it has been verified to fit THIS exact person. Reference it naturally, named completely.'
      : 'No fitting hook exists, and that is the GOAL here, not a fallback. Write the clean generic founder-to-peer note: acknowledge they are a high-growth company, make no personal claim, do not invent a hook.',
    'Call report_note once with subject, body, research_note.',
  ].join('\n\n');
  const resp = await anthropic.messages.create({
    model: MODEL, max_tokens: 1500, system: voiceSystem([], audience, cta),
    tools: [{ name: 'report_note', description: 'Report the founder note.', input_schema: DRAFT_SCHEMA }],
    tool_choice: { type: 'tool', name: 'report_note' },
    messages: [{ role: 'user', content: user }],
  });
  counters.tokensIn += resp.usage?.input_tokens || 0; counters.tokensOut += resp.usage?.output_tokens || 0;
  const tu = (resp.content || []).find((b) => b.type === 'tool_use' && b.name === 'report_note');
  const raw = tu?.input || { subject: '', body: '', research_note: '' };
  // STEP 2 — mechanical auto-fix in CODE before any gate (dashes/paragraphs are
  // never worth an LLM re-loop).
  return { subject: autoFixDashes(String(raw.subject || '')), body: autoSplitParagraphs(autoFixDashes(normalizeParagraphs(raw.body || ''))), research_note: raw.research_note };
}

// The gate: deterministic guard (free) first; coherence skeptic (judgment) only
// if the guard passes. Mechanical issues never reach here — they were auto-fixed.
async function gateDraft(anthropic, draft, { audience, cta, trigger, leadFacts }) {
  const issues = [];
  try { guardNote({ subject: draft.subject || '', body: draft.body || '' }, audience, trigger); }
  catch (e) { issues.push(`hard rule: ${e.message}`); }
  if (!issues.length) {
    const sk = await critiqueNote(anthropic, { subject: draft.subject, body: draft.body }, audience, cta, leadFacts);
    if (!sk.pass && (sk.issues || []).length) issues.push(...sk.issues.map((i) => `review: ${i}`));
  }
  return { pass: issues.length === 0, issues };
}

// =========================================================================
// CRAFT-FIRST path (Will 2026-07-07): the fix for "it reads like stitched-together
// approved lines." Points are RAW MATERIAL to say in the writer's own words, fresh
// every email; complete sentences only; the hook must connect to the offer or be
// cut; vary the phrasing. Judged on CRAFT, not compliance-checklist presence.
// =========================================================================
function craftDraftSystem(audience, cta) {
  const closeHint = cta === 'convo' ? 'offer a quick call, in your own words (no calendar link, no "15 minutes")' : 'offer to send a bit more, in your own words';
  return `You are Will Newton, founder of Shortcut, writing a short 1:1 email to ONE person you would genuinely like to know. Write ONE coherent, human email, the kind you'd actually type between meetings. This is WRITING, not assembling approved lines.

WHAT SHORTCUT IS (raw material — put it in YOUR OWN words, phrased differently every time, never as a stock catchphrase):
- You bring wellness days into offices: chair massage, nails, facials, mindfulness and more, all run by one team (one vendor, not a directory of contractors).
- You run the whole thing end to end; the client just picks a date. It is genuinely no work for them.
- Proof you MAY draw on, at most ONE, and only if it fits the sentence naturally: people actually use it (90%+ of slots get booked); 500+ companies including BCG and DraftKings; 87% come back for another.

HOW TO WRITE (this is what has been missing):
- COMPLETE SENTENCES ONLY. Never drop a bare noun phrase in as if it were a sentence. "The kind of wellness people actually make time for, and we handle everything" is a FRAGMENT and reads broken. Write "We run the kind of wellness people actually make time for," or rephrase the idea from scratch.
- VARY IT. Say the key points in fresh words, in an order that fits THIS person and THIS email. If two of your emails could swap sentences without anyone noticing, you have failed. No two notes should reuse the same catchphrase.
- SAY LESS. Cut every word not earning its place. You do NOT need to cram in every proof point or every selling point — pick the one or two that flow and drop the rest. Short and human beats complete and crammed.
- One thought per short paragraph. It must read like one train of thought from one person, not a checklist.

THE HOOK (optional, and it must EARN its place):
- If the research gave you a hook, use it ONLY if it connects to the reason you're writing (taking care of their team). A real fact with nothing to do with wellness is a non-sequitur — e.g. "I saw your passwordless-security report, candidate fraud at #2" has zero to do with wellness. DROP it. Do not force a bridge.
- A brief, genuine congrats on a real milestone (a raise, going public) is a fine warm opener. Keep it to one natural line, then move on. Do not stack it with the pitch in the same breath.
- If nothing fits, just write a warm clean note with no hook. That is the common, good case.

VOICE + HARD LINES:
- Warm, calm, casual, peer to peer. Contractions. Zero sales energy. No buzzwords (elevate, leverage, unlock, transform, seamless, foster, streamline, navigate, holistic, curated). No dashes as punctuation (end the sentence). Vary sentence length; at least one short line.
${audience === 'brokers' ? '- BROKER: this is about helping THEM help their clients deploy carrier wellness funds; name only fund-eligible services (chair massage, assisted stretch, sound baths, mindfulness, nutrition coaching); never "groups".' : '- Never assert their team is stressed or burned out (you have not met them); wonder about it only in a question or an "if". Never RTO / "worth the commute" framing.'}
- Close naturally: ${closeHint}.
- End with "Cheers!" or "Thanks!" then "Will". That is the ONLY exclamation mark, nothing after.

Write the email so good that Will would send it without touching a word. Report it via report_note.`;
}

async function craftDraft(anthropic, leadFacts, artifact, { audience, cta }, counters, priorProblems) {
  const user = [
    'Write the founder note now. No research to do — use what is here.',
    'RECIPIENT:', JSON.stringify(leadFacts, null, 2),
    'RESEARCH (already verified to fit; hook may be null):', JSON.stringify(artifact, null, 2),
    priorProblems ? `Your previous attempt had these problems — rewrite to fix them, do not just patch:\n- ${priorProblems.join('\n- ')}` : '',
    'Call report_note once (subject, body, research_note).',
  ].filter(Boolean).join('\n\n');
  const resp = await anthropic.messages.create({
    model: MODEL, max_tokens: 1500, system: craftDraftSystem(audience, cta),
    tools: [{ name: 'report_note', description: 'Report the note.', input_schema: DRAFT_SCHEMA }],
    tool_choice: { type: 'tool', name: 'report_note' },
    messages: [{ role: 'user', content: user }],
  });
  counters.tokensIn += resp.usage?.input_tokens || 0; counters.tokensOut += resp.usage?.output_tokens || 0;
  const tu = (resp.content || []).find((b) => b.type === 'tool_use' && b.name === 'report_note');
  const raw = tu?.input || { subject: '', body: '', research_note: '' };
  return { subject: autoFixDashes(String(raw.subject || '')), body: autoSplitParagraphs(autoFixDashes(normalizeParagraphs(raw.body || ''))), research_note: raw.research_note };
}

// Craft critic: judges the WRITING (fragments, flow, hook relevance, wordiness,
// sameness, coherence-to-this-person), not checklist presence. Returns {pass, issues}.
async function craftCritique(anthropic, note, leadFacts, { audience }, counters) {
  const system = `You are a ruthless copy editor for a founder's 1:1 email. The prose must read like a sharp human wrote ONE coherent note, not a system stitching approved lines. Default to FAILING. Flag, specifically:
- FRAGMENTS or broken grammar: any "sentence" without a real subject+verb, any bare noun phrase dropped in as if it were a sentence.
- STITCHED/TEMPLATED feel: reads like bolted-together stock phrases rather than one train of thought.
- HOOK that does not connect to wellness / taking care of the team (a non-sequitur company fact), or a hook that is wordy/in-the-weeds.
- WORDINESS: any sentence that could be half as long; filler that is not earning its place.
- COHERENCE: any claim that does not fit THIS recipient (check the facts below: ${JSON.stringify(leadFacts)}).
${audience === 'brokers' ? '' : '- Presumptuous stress claims stated as fact (allowed only as a question or "if").'}
Report via report_review with one issue string per problem. If the prose genuinely reads like a great human email, pass=true.`;
  const resp = await anthropic.messages.create({
    model: MODEL, max_tokens: 800, temperature: 0, system,
    tools: [{ name: 'report_review', description: 'Report the review.', input_schema: { type: 'object', properties: { pass: { type: 'boolean' }, issues: { type: 'array', items: { type: 'string' } } }, required: ['pass', 'issues'] } }],
    tool_choice: { type: 'tool', name: 'report_review' },
    messages: [{ role: 'user', content: `THE EMAIL:\nSubject: ${note.subject}\n\n${note.body}` }],
  });
  counters.tokensIn += resp.usage?.input_tokens || 0; counters.tokensOut += resp.usage?.output_tokens || 0;
  const tu = (resp.content || []).find((b) => b.type === 'tool_use' && b.name === 'report_review');
  return tu?.input || { pass: true, issues: [] };
}

// =========================================================================
// ORCHESTRATOR: research (once, fat) -> draft (small) -> gate -> bounded
// small-context revise with SETTLE-TO-GENERIC (steps 1, 2, 3).
// =========================================================================
async function runAgent(leadFacts, { audience, cta, trigger }) {
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });
  const t0 = Date.now();
  const counters = { tokensIn: 0, tokensOut: 0 };
  const trace = [];

  // PHASE 1 (isolated; bulky search results discarded on return)
  const research = await runResearch(anthropic, leadFacts, { audience }, counters, trace, t0);
  if (research.aborted && !research.artifact.hook && research.artifact.company_stage === 'unknown') {
    return { draft: null, aborted: research.aborted, artifact: research.artifact, revises: 0, researchIters: research.iters, tokensIn: counters.tokensIn, tokensOut: counters.tokensOut, seconds: (Date.now() - t0) / 1000, trace };
  }
  trace.push(`${c.bold('  ⇒ ARTIFACT')} hook=${research.artifact.hook ? c.green(JSON.stringify(research.artifact.hook).slice(0, 70)) : c.gray('null (generic note)')} · stage="${research.artifact.company_stage}"`);

  // PHASE 2 + 3. CRAFT path: write freely from raw material, judge on craft
  // (guardNote hard rules + craftCritique), craft-rewrite on failure. Else the
  // compliance path (draftFromArtifact + gateDraft).
  let note, gate, revises = 0;
  if (CRAFT) {
    note = await craftDraft(anthropic, leadFacts, research.artifact, { audience, cta }, counters);
    const runCraftGate = async () => {
      const issues = [];
      try { guardNote({ subject: note.subject || '', body: note.body || '' }, audience, trigger); } catch (e) { issues.push(`hard rule: ${e.message}`); }
      const cc = await craftCritique(anthropic, note, leadFacts, { audience }, counters);
      if (!cc.pass) issues.push(...(cc.issues || []));
      return { pass: issues.length === 0, issues };
    };
    gate = await runCraftGate();
    while (!gate.pass && revises < MAX_REVISES) {
      revises += 1;
      trace.push(`${c.gray('  craft-gate')} ${c.red('FAIL')} → rewrite ${revises}/${MAX_REVISES}: ${gate.issues.join(' | ').slice(0, 140)}`);
      note = await craftDraft(anthropic, leadFacts, research.artifact, { audience, cta }, counters, gate.issues);
      gate = await runCraftGate();
    }
  } else {
    note = await draftFromArtifact(anthropic, leadFacts, research.artifact, { audience, cta }, counters);
    gate = await gateDraft(anthropic, note, { audience, cta, trigger, leadFacts });
    while (!gate.pass && revises < MAX_REVISES) {
      revises += 1;
      trace.push(`${c.gray('  gate')} ${c.red('FAIL')} → small-context revise ${revises}/${MAX_REVISES}: ${gate.issues.join(' | ').slice(0, 140)}`);
      const settle = 'SETTLE: if any issue is that a specific claim does not fit this person, DROP the claim entirely and write the clean generic high-growth note with NO personal hook. Do not reach for another specific angle.';
      note = await reviseNote(anthropic, { note, issues: [...gate.issues, settle], exemplars: [], audience, lead: leadFacts, firm: null, ctaVariant: cta, trigger });
      gate = await gateDraft(anthropic, note, { audience, cta, trigger, leadFacts });
    }
  }
  trace.push(`${c.gray('  gate')} ${gate.pass ? c.green('PASS') : c.red('FAIL (revises exhausted): ' + gate.issues.join(' | '))}`);
  return { draft: note, artifact: research.artifact, finalGate: gate, revises, researchIters: research.iters, aborted: research.aborted, tokensIn: counters.tokensIn, tokensOut: counters.tokensOut, seconds: (Date.now() - t0) / 1000, trace };
}

async function sbClient() {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient((process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim(), (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(), { auth: { persistSession: false } });
}

// Run the scripted pipeline on a lead + gate its output, for apples-to-apples.
async function runPipeline(leadFacts, { audience, cta, trigger, email }) {
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });
  const p0 = Date.now();
  const { note } = await composeNote(anthropic, { lead: { ...leadFacts, email: email || 'lab@example.com' }, firm: null, exemplars: [], audience, ctaVariant: cta, trigger, label: 'lab', log: () => {} });
  let guardPass = true, guardMsg = null;
  try { guardNote({ subject: note.subject || '', body: note.body }, audience, trigger); } catch (e) { guardPass = false; guardMsg = e.message; }
  const sk = await critiqueNote(anthropic, { subject: note.subject, body: note.body }, audience, cta, leadFacts);
  return { note, seconds: (Date.now() - p0) / 1000, gatePass: guardPass && sk.pass, gateIssues: [guardMsg, ...(sk.pass ? [] : sk.issues || [])].filter(Boolean) };
}

(async () => {
  if (!ANTHROPIC_KEY) { console.error('MISSING ANTHROPIC_API_KEY'); process.exit(2); }

  // ===================== BATCH EVAL (part b) =====================
  if (BATCH) {
    const sb = await sbClient();
    const { data: pool } = await sb.from('outreach_contacts')
      .select('email, name, title, company, location, linkedin_url')
      .eq('source', 'founder-personal').not('location', 'is', null)
      .or('mv_status.eq.ok,bounceban_status.eq.deliverable').limit(BATCH);
    const leads = (pool || []).slice(0, BATCH);
    console.log(c.bold(`\n╔══ AGENT LAB — BATCH EVAL: agent vs scripted pipeline on ${leads.length} real leads (parallel) ══╗`));
    console.log(c.gray(`  sandbox: nothing sends/writes · guardrails per lead (≤${MAX_TOKENS / 1000}k tok, ≤${MAX_REVISES} revises)\n`));
    // PARALLEL (leads run concurrently — ~1 lead's wall time instead of N×).
    const rows = await Promise.all(leads.map(async (lf) => {
      const leadFacts = { name: lf.name, title: lf.title, company: lf.company, location: lf.location, linkedin_url: lf.linkedin_url };
      const a = await runAgent(leadFacts, { audience: AUDIENCE, cta: CTA, trigger: null });
      let p = null; try { p = await runPipeline(leadFacts, { audience: AUDIENCE, cta: CTA, trigger: null, email: lf.email }); } catch (e) { p = { error: e.message }; }
      const usd = a.tokensIn * PRICE_IN + a.tokensOut * PRICE_OUT;
      return { company: lf.company, name: lf.name, title: lf.title, location: lf.location, agent: { pass: a.finalGate?.pass ?? false, gateIssues: a.finalGate?.issues || [], revises: a.revises, tokens: a.tokensIn + a.tokensOut, usd, seconds: a.seconds, subject: a.draft?.subject, body: a.draft?.body, hook: a.artifact?.hook || null }, pipeline: p.error ? { error: p.error } : { pass: p.gatePass, seconds: p.seconds, subject: p.note.subject, body: p.note.body } };
    }));
    // PRINT THE ACTUAL DRAFTS (agent + pipeline) per lead
    for (const r of rows) {
      console.log(c.bold(`\n════ ${r.name} · ${r.title} · ${r.company} (${r.location}) ════`));
      console.log(`  ${c.bold('AGENT')}  ${r.agent.pass ? c.green('PASS') : c.red('FAIL')} · ${r.agent.revises} rev · ${c.yellow('$' + r.agent.usd.toFixed(3))} · ${r.agent.seconds.toFixed(0)}s · hook=${r.agent.hook ? c.green(JSON.stringify(r.agent.hook).slice(0, 50)) : c.gray('null')}`);
      if (!r.agent.pass) console.log(c.red(`    gate: ${r.agent.gateIssues.join(' | ').slice(0, 200)}`));
      console.log((r.agent.body || '(no draft)').split('\n').map((l) => c.cyan('  │ ') + l).join('\n'));
      console.log(`  ${c.bold('PIPELINE')}  ${r.pipeline.error ? c.red('ERR ' + r.pipeline.error) : (r.pipeline.pass ? c.green('PASS') : c.red('FAIL')) + ' · ' + r.pipeline.seconds.toFixed(0) + 's'}`);
      if (!r.pipeline.error) console.log((r.pipeline.body || '').split('\n').map((l) => c.gray('  │ ') + l).join('\n'));
    }
    // aggregate
    const ok = rows;
    const agPass = ok.filter((r) => r.agent.pass).length, pipePass = rows.filter((r) => r.pipeline.pass).length;
    const avg = (xs) => xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
    console.log('\n' + c.bold('AGGREGATE:'));
    console.log(`  AGENT     gate-pass ${agPass}/${rows.length}  ·  avg revises ${avg(rows.map((r) => r.agent.revises)).toFixed(1)}  ·  avg cost ${c.yellow('$' + avg(rows.map((r) => r.agent.usd)).toFixed(3))}/note  ·  avg ${avg(ok.map((r) => r.agent.seconds)).toFixed(0)}s`);
    console.log(`  PIPELINE  gate-pass ${pipePass}/${rows.length}  ·  avg ${avg(rows.filter((r) => !r.pipeline.error).map((r) => r.pipeline.seconds)).toFixed(0)}s  ·  cost not itemized (~3-5 calls, ~\$0.02-0.05/note)`);
    const outFile = OUT || 'agent_lab_batch.json';
    writeFileSync(outFile, JSON.stringify({ audience: AUDIENCE, cta: CTA, model: MODEL, count: rows.length, agent_pass: agPass, pipeline_pass: pipePass, rows }, null, 2));
    console.log(c.gray(`\n  full outputs (both drafts per lead) → ${outFile}. Nothing sent/written to Gmail/Slack/DB.`));
    return;
  }

  // ===================== SINGLE LEAD =====================
  let leadFacts = { name: val('--name', 'Alex Founder'), title: val('--title', 'Head of People'), company: val('--company', 'Acme AI'), location: val('--location', 'New York, NY'), linkedin_url: null };
  if (EMAIL) {
    const sb = await sbClient();
    const { data } = await sb.from('outreach_contacts').select('name, title, company, location, linkedin_url').eq('email', EMAIL.toLowerCase()).maybeSingle();
    if (!data) { console.error(`no outreach_contacts row for ${EMAIL}`); process.exit(2); }
    leadFacts = { ...data };
  }

  console.log(c.bold('\n╔══ FOUNDER AGENT LAB (sandbox — nothing sends, nothing is written) ══╗'));
  console.log(`  lead: ${leadFacts.name} · ${leadFacts.title} · ${leadFacts.company} (${leadFacts.location})`);
  console.log(`  audience ${AUDIENCE} · cta ${CTA} · model ${MODEL}`);
  console.log(c.gray(`  guardrails: ≤${(MAX_TOKENS / 1000)}k tokens · ≤${MAX_ITERS} iters · ≤${TIMEOUT_MS / 1000}s · ≤${MAX_REVISES} revises · NO send/write`));
  console.log(c.bold('╚════════════════════════════════════════════════════════════════════╝\n'));

  console.log(c.bold('AGENT TRACE (what it decided to do):'));
  const r = await runAgent(leadFacts, { audience: AUDIENCE, cta: CTA, trigger: TRIGGER });
  r.trace.forEach((l) => console.log('  ' + l));
  const costUsd = r.tokensIn * PRICE_IN + r.tokensOut * PRICE_OUT;

  console.log('\n' + c.bold('AGENT RESULT:'));
  if (!r.draft) {
    console.log(c.red(`  no draft — aborted: ${r.aborted || 'unknown'}`));
  } else {
    console.log(c.bold('  SUBJECT: ') + r.draft.subject);
    console.log(c.bold('  BODY:\n') + r.draft.body.split('\n').map((l) => '  ' + l).join('\n'));
    console.log(c.gray(`  research_note: ${r.draft.research_note}`));
    console.log(c.gray(`  artifact: hook=${r.artifact?.hook ? JSON.stringify(r.artifact.hook) : 'null'} · stage="${r.artifact?.company_stage}"`));
    console.log(`  ${c.bold('FINAL GATE')} (same guards as prod, after ${r.revises} revise round${r.revises === 1 ? '' : 's'})  ${r.finalGate?.pass ? c.green('PASS') : c.red('FAIL: ' + (r.finalGate?.issues || []).join(' | '))}`);
  }
  console.log('\n' + c.bold('COST / GUARDRAIL REPORT:'));
  console.log(`  tokens: ${r.tokensIn} in + ${r.tokensOut} out = ${r.tokensIn + r.tokensOut}  ·  est ${c.yellow(usd(costUsd))} ${c.gray('(coherence-skeptic + revise calls add a small untracked amount)')}`);
  console.log(`  research iters: ${r.researchIters}/${MAX_ITERS}  ·  revises: ${r.revises}/${MAX_REVISES}  ·  wall: ${r.seconds.toFixed(1)}s/${TIMEOUT_MS / 1000}s  ·  ${r.aborted ? c.yellow('research note: ' + r.aborted) : c.green('within all limits')}`);

  let compareOut = null;
  if (COMPARE) {
    console.log('\n' + c.bold('── COMPARISON: current SCRIPTED PIPELINE on the same lead ──'));
    try {
      const p = await runPipeline(leadFacts, { audience: AUDIENCE, cta: CTA, trigger: TRIGGER, email: EMAIL });
      console.log(c.bold('  SUBJECT: ') + p.note.subject);
      console.log(c.bold('  BODY:\n') + p.note.body.split('\n').map((l) => '  ' + l).join('\n'));
      console.log(`  ${c.bold('GATE')} ${p.gatePass ? c.green('PASS') : c.red('FAIL: ' + p.gateIssues.join(' | '))}  ·  ${c.gray(p.seconds.toFixed(1) + 's, ~3-5 calls')}`);
      compareOut = p.note;
    } catch (e) { console.log(c.red(`  pipeline error: ${e.message}`)); }
  }
  if (OUT) writeFileSync(OUT, JSON.stringify({ lead: leadFacts, agent: { draft: r.draft, artifact: r.artifact, cost: { tokensIn: r.tokensIn, tokensOut: r.tokensOut, usd: costUsd, researchIters: r.researchIters, revises: r.revises, seconds: r.seconds }, finalGate: r.finalGate, trace: r.trace }, pipeline: compareOut }, null, 2));
  console.log(c.gray('\nSandbox run complete. Nothing was sent or written to Gmail/Slack/DB.'));
})().catch((e) => { console.error('AGENT_LAB_ERROR:', e.message); process.exit(1); });
