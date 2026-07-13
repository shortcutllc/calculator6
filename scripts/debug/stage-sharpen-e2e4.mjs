/**
 * stage-sharpen-e2e4.mjs — one-off: stage a copy_assets PROPOSAL (status='proposed',
 * inert until Will approves) that sharpens ONLY E2 + E4 of the approved v3 cold
 * sequence, per Will's 2026-07-13 decision (keep E2 a pure bump; give E4 a concrete
 * ask). E1 + E3 are preserved byte-for-byte from the locked template. Runs both
 * gates (deterministic evaluator + advisory judge) and attaches their verdicts.
 *
 *   node scripts/debug/stage-sharpen-e2e4.mjs           # dry: gates only, no insert
 *   node scripts/debug/stage-sharpen-e2e4.mjs --confirm  # insert proposed rows
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { coldSequenceV3 } from '../lib/cold-sequence-v3.mjs';
import { evaluateCopy } from '../lib/copy-evaluator.mjs';
import { judgeCopy } from '../lib/copy-judge.mjs';

const CONFIRM = process.argv.includes('--confirm');
const OPENCLAW = '/Users/willnewton/.openclaw/workspace';
const envKey = (name) => {
  try { return (readFileSync(`${OPENCLAW}/.env`, 'utf8').match(new RegExp(`^${name}=(.+)$`, 'm'))?.[1] || '').trim().replace(/^["']|["']$/g, ''); }
  catch { return (process.env[name] || '').trim(); }
};

// E2 = Will's preferred simple bump (2026-07-13), varied via spintax so no two
// sends are identical. NOT the earlier elaborate rewrite (he rejected "Still" +
// the over-long offer). First path renders his exact format.
const E2_NEW = `{Hi|Hey} {{first_name}},

{Following up on the note below|Circling back on my note below|Following up on my earlier note}. {Wondering if we could connect?|Open to connecting?|Worth a quick chat?}

{Thanks,|Best,}
%sender-firstname%`;

const E4_NEW = `{Hi|Hey} {{first_name}}, {last note from me|I will leave it here}.

If wellness is not this quarter's priority, no problem at all. {A one word reply and I will step back|Just say the word and I will close the loop}.

{Or if a short one page overview to keep on file for when the timing is better would help, say so and it is yours|Or if it helps to have a quick overview for later, just ask and I will send it over}.

{Warmly,|Thanks,}
%sender-firstname%`;

const swap = (seq) => ({ ...seq, steps: seq.steps.map((s) =>
  s.step === 2 ? { ...s, body: E2_NEW } : s.step === 4 ? { ...s, body: E4_NEW } : s) });

const LABEL = 'v3 + simple-spintax E2 + concrete E4 (2026-07-13)';
const NOTE = "E2 = Will's preferred simple bump ('Following up on the note below. Wondering if we could connect?') with spintax variety so sends differ; dropped the 'hope your day' pleasantry. E4 = graceful breakup + a concrete reply-ask + keepable-overview offer (no link). E1 + E3 unchanged from the locked v3 template.";

(async () => {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const ak = envKey('ANTHROPIC_API_KEY') || (process.env.ANTHROPIC_API_KEY || '').trim();
  if (!url || !key) { console.error('MISSING SUPABASE env'); process.exit(2); }
  if (!ak) { console.error('MISSING ANTHROPIC_API_KEY'); process.exit(2); }
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const anthropic = new Anthropic({ apiKey: ak });

  const probe = await sb.from('copy_assets').select('id').limit(1);
  if (probe.error) { console.error('MIGRATION NEEDED (copy_assets):', probe.error.message); process.exit(2); }

  for (const opener of ['generic', 'rto']) {
    const cand = swap(coldSequenceV3(opener, { e3Link: true }));
    const ev = evaluateCopy(cand, { segment: 'direct', opener });
    console.log(`\n=== opener=${opener} — evaluator: ${ev.verdict} (${ev.violations.length} violations, ${ev.warnings.length} warnings) ===`);
    if (ev.violations.length) { console.log('  VIOLATIONS:', JSON.stringify(ev.violations)); console.error('  aborting — candidate fails the deterministic gate'); process.exit(1); }

    const judge = await judgeCopy({ anthropic, sequence: cand, segment: 'direct' });
    console.log(`  judge: ${judge.verdict.toUpperCase()} ${judge.score}/100 — ${judge.would_reply_read}`);
    const e2e4Issues = (judge.issues || []).filter((i) => i.step === 2 || i.step === 4);
    console.log(`  E2/E4 issues remaining: ${e2e4Issues.length ? e2e4Issues.map((i) => `E${i.step}:${i.issue}`).join(' | ') : 'none'}`);

    if (!CONFIRM) { console.log('  (dry — add --confirm to stage this as a proposed copy_asset)'); continue; }
    const { data: row, error } = await sb.from('copy_assets').insert({
      segment: 'direct', opener, label: LABEL, steps: cand.steps,
      status: 'proposed', evaluator: { verdict: ev.verdict, warnings: ev.warnings }, judge, note: NOTE,
    }).select().single();
    if (error) { console.error('  save failed:', error.message); process.exit(1); }
    console.log(`  PROPOSAL SAVED: ${row.id}  →  approve: node scripts/approve-copy.mjs ${row.id}`);
  }
})().catch((e) => { console.error('STAGE_ERROR:', e.message); process.exit(1); });
