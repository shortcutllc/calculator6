/**
 * propose-copy.mjs — the COPY PROPOSAL LANE's entrance (Will approved 2026-07-06).
 * The brain drafts, both gates review, WILL ratifies. Nothing this script
 * produces can ever reach a campaign without approve-copy.mjs (or Will telling
 * Claude "approve proposal <id>"). See feedback_no_ungated_copy.md: approved
 * copy is locked; this lane is the ONLY entrance for new copy.
 *
 * Flow: sequence-composer (LLM generator, grounded on positioning + measured
 * winners, retry-once vs the deterministic evaluator) → copy-evaluator (hard
 * gate: a proposal that fails is NOT saved) → copy-judge (advisory report,
 * attached) → copy_assets row status='proposed' → Slack DM to Will with the
 * full text + both gate reports.
 *
 *   set -a; source ~/.shortcut-cron.env; set +a
 *   node scripts/propose-copy.mjs --segment direct --opener generic \
 *        --note "belief loop: E1 positive rate below baseline for 3 weeks"
 *   # → prints + DMs the proposal; approve with: node scripts/approve-copy.mjs <id>
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { composeSequence } from './lib/sequence-composer.mjs';
import { evaluateCopy } from './lib/copy-evaluator.mjs';
import { judgeCopy } from './lib/copy-judge.mjs';

const OPENCLAW = '/Users/willnewton/.openclaw/workspace';
const envKey = (n) => { try { return (readFileSync(`${OPENCLAW}/.env`, 'utf8').match(new RegExp(`^${n}=(.+)$`, 'm'))?.[1] || '').trim().replace(/^["']|["']$/g, ''); } catch { return ''; } };
const val = (f, d) => { const i = process.argv.indexOf(f); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const SEGMENT = (val('--segment', 'direct') || 'direct').toLowerCase();
const OPENER = (val('--opener', 'generic') || 'generic').toLowerCase();
const NOTE = val('--note', null);
const LABEL = val('--label', `${SEGMENT}-${OPENER} proposal ${new Date().toISOString().slice(0, 10)}`);
const NOTIFY_URL = (process.env.COPY_PROPOSAL_NOTIFY_URL || 'https://proposals.getshortcut.co/.netlify/functions/copy-proposal-notify-background').trim();

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || envKey('ANTHROPIC_API_KEY');
const sb = createClient((process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim(), (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(), { auth: { persistSession: false } });
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);

(async () => {
  if (!ANTHROPIC_KEY) { console.error('MISSING ANTHROPIC_API_KEY'); process.exit(2); }
  const probe = await sb.from('copy_assets').select('id').limit(1);
  if (probe.error) { console.error('MIGRATION NEEDED: apply supabase/migrations/20260706000001_add_copy_assets.sql (' + probe.error.message + ')'); process.exit(2); }
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

  log(`COMPOSE: ${SEGMENT}/${OPENER}${NOTE ? ` — ${NOTE}` : ''}`);
  const composed = await composeSequence({ anthropic, segment: `${SEGMENT} cold outreach, ${OPENER} opener angle`, channel: SEGMENT === 'broker' ? 'broker' : 'direct', evalSegment: SEGMENT, evalOpener: OPENER });
  if (composed.verdict !== 'pass') {
    console.error(`COMPOSER FAILED ITS OWN GATE after retry — not saved. Violations:\n${composed.violations.map((x) => `  E${x.step} ${x.rule}: ${x.detail}`).join('\n')}`);
    process.exit(1);
  }
  // independent re-check with full segment context (composer's internal loop uses defaults)
  const ev = evaluateCopy({ steps: composed.steps }, { segment: SEGMENT, opener: OPENER });
  if (ev.verdict !== 'pass') {
    console.error(`EVALUATOR REJECTED — not saved:\n${ev.violations.map((x) => `  E${x.step} ${x.rule}: ${x.detail}`).join('\n')}`);
    process.exit(1);
  }
  const judge = await judgeCopy({ anthropic, sequence: { steps: composed.steps }, segment: SEGMENT });
  log(`gates: evaluator PASS · judge ${judge.verdict} ${judge.score}`);

  const { data: row, error } = await sb.from('copy_assets').insert({
    segment: SEGMENT, opener: OPENER, label: LABEL, steps: composed.steps,
    status: 'proposed', evaluator: { verdict: ev.verdict, warnings: ev.warnings },
    judge, note: NOTE,
  }).select().single();
  if (error) { console.error('save failed:', error.message); process.exit(1); }

  log(`PROPOSAL SAVED: ${row.id}`);
  for (const st of composed.steps) {
    console.log(`\n--- E${st.step} (day +${st.delayDays}) subj: ${JSON.stringify(st.subjects)} ---\n${st.body}`);
  }
  console.log(`\njudge: ${judge.would_reply_read}`);
  console.log(`\nApprove:  node scripts/approve-copy.mjs ${row.id}`);
  console.log(`Reject:   node scripts/approve-copy.mjs ${row.id} --reject`);
  try {
    const r = await fetch(NOTIFY_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ asset_id: row.id }) });
    log(`Slack card: HTTP ${r.status}`);
  } catch (e) { log(`Slack card failed (non-fatal): ${e.message}`); }
})().catch((e) => { console.error('PROPOSE_ERROR:', e.message); process.exit(1); });
