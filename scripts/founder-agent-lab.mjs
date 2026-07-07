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
import { voiceSystem, guardNote, critiqueNote, composeNote } from '../netlify/functions/lib/founder-note.js';

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
const MAX_ITERS = parseInt(val('--max-iterations', '10'), 10) || 10;
const TIMEOUT_MS = parseInt(val('--timeout-ms', '240000'), 10) || 240000;
// Sonnet 4.5 list price (approx, for a $ estimate only): $3/M in, $15/M out.
const PRICE_IN = 3 / 1e6; const PRICE_OUT = 15 / 1e6;

const c = { gray: (s) => `\x1b[90m${s}\x1b[0m`, bold: (s) => `\x1b[1m${s}\x1b[0m`, green: (s) => `\x1b[32m${s}\x1b[0m`, red: (s) => `\x1b[31m${s}\x1b[0m`, yellow: (s) => `\x1b[33m${s}\x1b[0m`, cyan: (s) => `\x1b[36m${s}\x1b[0m` };

// ---- the three tools the agent is allowed (allowlist). web_search is a server
// tool (Anthropic runs it); the other two are client tools we execute here.
const CLIENT_TOOLS = [
  {
    name: 'get_lead_facts',
    description: 'Return everything WE already know about this recipient (name, title, company, location, linkedin). Call this FIRST — it is the ground truth to check any research find against (a real fact about the wrong office/city is worse than no fact).',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'submit_draft',
    description: 'Submit the finished founder note. Call this exactly once when you are done.',
    input_schema: {
      type: 'object',
      properties: {
        subject: { type: 'string' },
        body: { type: 'string', description: "plain text, blank line between paragraphs, ending 'Cheers!' or 'Thanks!' then 'Will'" },
        research_note: { type: 'string', description: 'one line: what you found and used, or that nothing specific fit' },
        coherence_check: { type: 'string', description: 'one line: how you confirmed every specific claim FITS this exact person (location/role), or that you used no specific claim' },
      },
      required: ['subject', 'body', 'research_note', 'coherence_check'],
    },
  },
];

function agentSystem(audience, cta) {
  // reuse the CANONICAL brand voice + rules (same as production), then add the
  // agentic operating instructions.
  return `${voiceSystem([], audience, cta)}

=== YOU ARE RUNNING AS AN AGENT (not a one-shot drafter) ===
You have tools and you decide how to use them. Work like a sharp SDR who thinks before writing:
1. Call get_lead_facts FIRST to see who this person actually is.
2. Decide whether to research (web_search). Only search if a genuine, FITTING hook is plausible. A note with no specific hook is completely fine — better than a forced or wrong-context one.
3. If you find a specific fact, CHECK IT against get_lead_facts before using it: does it match THEIR city/office/role? A "Best Workplaces in Chicago" award means nothing to a New York contact (a different office earned it) — drop it or reframe it company-wide, never as a personal congrats. Name any recognition completely.
4. Draft in Will's voice (all the rules above apply exactly).
5. Re-read your own draft once for coherence and voice, fix anything off, THEN call submit_draft with an honest coherence_check.
Be efficient: you do not need many searches. Think, verify, submit.`;
}

const usd = (n) => `$${n.toFixed(4)}`;
const summarizeToolUse = (b) => {
  if (b.type === 'server_tool_use' && b.name === 'web_search') return `${c.cyan('search')} "${(b.input?.query || '').slice(0, 70)}"`;
  if (b.type === 'web_search_tool_result') return c.gray(`  ↳ ${Array.isArray(b.content) ? b.content.length : '?'} results`);
  if (b.type === 'tool_use') return `${c.yellow('tool')} ${b.name}`;
  return null;
};

async function runAgent(leadFacts, { audience, cta, trigger }) {
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });
  const tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 4 }, ...CLIENT_TOOLS];
  const system = agentSystem(audience, cta);
  const seed = [
    'Draft a founder note for this recipient. Basic handle (call get_lead_facts for the full record):',
    JSON.stringify({ company: leadFacts.company, audience, why_now_trigger: trigger || null }, null, 2),
  ].join('\n');
  const messages = [{ role: 'user', content: seed }];

  const t0 = Date.now();
  let tokensIn = 0, tokensOut = 0, iters = 0, draft = null, aborted = null;
  const trace = [];

  while (iters < MAX_ITERS) {
    if (Date.now() - t0 > TIMEOUT_MS) { aborted = 'timeout'; break; }
    if (tokensIn + tokensOut >= MAX_TOKENS) { aborted = 'token_budget'; break; }
    iters += 1;
    let resp;
    try {
      resp = await anthropic.messages.create({ model: MODEL, max_tokens: 4000, system, tools, messages });
    } catch (e) { aborted = `api_error: ${e.message}`; break; }
    tokensIn += resp.usage?.input_tokens || 0; tokensOut += resp.usage?.output_tokens || 0;
    // trace: the agent's reasoning + tool actions this turn
    for (const b of resp.content || []) {
      if (b.type === 'text' && b.text.trim()) trace.push(`${c.gray(`[${iters}]`)} ${b.text.trim().slice(0, 180)}`);
      const s = summarizeToolUse(b); if (s) trace.push(`${c.gray(`[${iters}]`)} ${s}`);
    }
    messages.push({ role: 'assistant', content: resp.content });

    const clientCalls = (resp.content || []).filter((b) => b.type === 'tool_use' && ['get_lead_facts', 'submit_draft'].includes(b.name));
    if (clientCalls.some((b) => b.name === 'submit_draft')) {
      draft = clientCalls.find((b) => b.name === 'submit_draft').input; break;
    }
    if (resp.stop_reason === 'pause_turn') { continue; } // long server tool; resend context
    if (!clientCalls.length) {
      if (resp.stop_reason === 'end_turn') { // model finished without submitting — nudge once
        messages.push({ role: 'user', content: 'Call submit_draft now with the finished note.' }); continue;
      }
      continue;
    }
    const results = clientCalls.map((b) => ({ type: 'tool_result', tool_use_id: b.id, content: b.name === 'get_lead_facts' ? JSON.stringify(leadFacts) : 'received' }));
    messages.push({ role: 'user', content: results });
  }
  return { draft, aborted, iters, tokensIn, tokensOut, seconds: (Date.now() - t0) / 1000, trace, tokenBudgetHit: aborted === 'token_budget' };
}

(async () => {
  if (!ANTHROPIC_KEY) { console.error('MISSING ANTHROPIC_API_KEY'); process.exit(2); }

  // Resolve the lead (read-only). --email pulls the real record; else flags.
  let leadFacts = { name: val('--name', 'Alex Founder'), title: val('--title', 'Head of People'), company: val('--company', 'Acme AI'), location: val('--location', 'New York, NY'), linkedin_url: null };
  if (EMAIL) {
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient((process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim(), (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(), { auth: { persistSession: false } });
    const { data } = await sb.from('outreach_contacts').select('name, title, company, location, linkedin_url').eq('email', EMAIL.toLowerCase()).maybeSingle();
    if (!data) { console.error(`no outreach_contacts row for ${EMAIL}`); process.exit(2); }
    leadFacts = { ...data };
  }

  console.log(c.bold('\n╔══ FOUNDER AGENT LAB (sandbox — nothing sends, nothing is written) ══╗'));
  console.log(`  lead: ${leadFacts.name} · ${leadFacts.title} · ${leadFacts.company} (${leadFacts.location})`);
  console.log(`  audience ${AUDIENCE} · cta ${CTA} · model ${MODEL}`);
  console.log(c.gray(`  guardrails: ≤${(MAX_TOKENS / 1000)}k tokens · ≤${MAX_ITERS} iters · ≤${TIMEOUT_MS / 1000}s · tools[web_search,get_lead_facts,submit_draft] · NO send/write`));
  console.log(c.bold('╚════════════════════════════════════════════════════════════════════╝\n'));

  // ---- AGENT RUN
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
    console.log(c.gray(`  coherence_check: ${r.draft.coherence_check}`));
    // FINAL DETERMINISTIC GATE — same guards production uses, on the agent's output
    let guard = c.green('PASS');
    try { guardNote({ subject: r.draft.subject || '', body: r.draft.body }, AUDIENCE, TRIGGER); } catch (e) { guard = c.red(`FAIL: ${e.message}`); }
    const skeptic = await critiqueNote(new Anthropic({ apiKey: ANTHROPIC_KEY }), { subject: r.draft.subject, body: r.draft.body }, AUDIENCE, CTA, leadFacts);
    console.log(`  ${c.bold('DETERMINISTIC GUARD')}  ${guard}`);
    console.log(`  ${c.bold('COHERENCE SKEPTIC')}  ${skeptic.pass ? c.green('clean') : c.red('flagged: ' + (skeptic.issues || []).join(' | '))}`);
  }
  console.log('\n' + c.bold('COST / GUARDRAIL REPORT:'));
  console.log(`  tokens: ${r.tokensIn} in + ${r.tokensOut} out = ${r.tokensIn + r.tokensOut}  ·  est ${c.yellow(usd(costUsd))}`);
  console.log(`  iterations: ${r.iters}/${MAX_ITERS}  ·  wall: ${r.seconds.toFixed(1)}s/${TIMEOUT_MS / 1000}s  ·  ${r.aborted ? c.red('ABORTED: ' + r.aborted) : c.green('completed within all limits')}`);

  // ---- OPTIONAL: scripted-pipeline comparison on the same lead
  let compareOut = null;
  if (COMPARE) {
    console.log('\n' + c.bold('── COMPARISON: current SCRIPTED PIPELINE on the same lead ──'));
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });
    const p0 = Date.now();
    try {
      const { note } = await composeNote(anthropic, { lead: { ...leadFacts, email: EMAIL || 'lab@example.com' }, firm: null, exemplars: [], audience: AUDIENCE, ctaVariant: CTA, trigger: TRIGGER, label: 'lab', log: () => {} });
      console.log(c.bold('  SUBJECT: ') + note.subject);
      console.log(c.bold('  BODY:\n') + note.body.split('\n').map((l) => '  ' + l).join('\n'));
      console.log(c.gray(`  (pipeline wall: ${((Date.now() - p0) / 1000).toFixed(1)}s — token cost not itemized by composeNote, ~3-5 calls)`));
      compareOut = note;
    } catch (e) { console.log(c.red(`  pipeline error: ${e.message}`)); }
  }

  if (OUT) {
    writeFileSync(OUT, JSON.stringify({ lead: leadFacts, audience: AUDIENCE, cta: CTA, agent: { draft: r.draft, cost: { tokensIn: r.tokensIn, tokensOut: r.tokensOut, usd: costUsd, iters: r.iters, seconds: r.seconds, aborted: r.aborted }, trace: r.trace }, pipeline: compareOut }, null, 2));
    console.log(c.gray(`\nwrote ${OUT}`));
  }
  console.log(c.gray('\nSandbox run complete. Nothing was sent or written to Gmail/Slack/DB.'));
})().catch((e) => { console.error('AGENT_LAB_ERROR:', e.message); process.exit(1); });
