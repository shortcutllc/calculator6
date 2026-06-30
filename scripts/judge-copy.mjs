/**
 * judge-copy.mjs — run the LLM strategic-fit judge (scripts/lib/copy-judge.mjs)
 * over a cold sequence. The middle gate between the deterministic copy-evaluator
 * and the human launch click. Advisory: prints a verdict + concrete fixes, never
 * sends anything.
 *
 * Needs ANTHROPIC_API_KEY in .env or openclaw .env.
 *
 *   node scripts/judge-copy.mjs --segment law --opener cle
 *   node scripts/judge-copy.mjs --segment direct --opener generic
 */
import { readFileSync } from 'fs';
import Anthropic from '@anthropic-ai/sdk';
import { judgeCopy } from './lib/copy-judge.mjs';
import { coldSequenceV3 } from './lib/cold-sequence-v3.mjs';
import { coldSequenceLaw } from './lib/cold-sequence-law.mjs';
import { coldSequenceRealEstate } from './lib/cold-sequence-realestate.mjs';

const val = (f, d) => { const i = process.argv.indexOf(f); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const SEGMENT = (val('--segment', 'direct') || 'direct').toLowerCase();
const OPENER = (val('--opener', '') || '').toLowerCase();
const envKey = (n) => {
  for (const p of ['/Users/willnewton/Documents/GitHub/calculator6/.env', '/Users/willnewton/.openclaw/workspace/.env']) {
    try { const m = readFileSync(p, 'utf8').match(new RegExp(`^${n}=(.+)$`, 'm')); if (m) return m[1].trim().replace(/^["']|["']$/g, ''); } catch { /* skip */ }
  }
  return process.env[n] || '';
};

export function resolveSequence(segment, opener) {
  if (segment === 'law') return coldSequenceLaw(['cle', 'wellness'].includes(opener) ? opener : 'cle');
  if (segment === 'realestate') return coldSequenceRealEstate(['building', 'portfolio'].includes(opener) ? opener : 'building');
  return coldSequenceV3(['generic', 'rto'].includes(opener) ? opener : 'generic');
}

(async () => {
  const KEY = envKey('ANTHROPIC_API_KEY');
  if (!KEY) { console.error('MISSING ANTHROPIC_API_KEY (add to .env or openclaw .env to enable the judge).'); process.exit(2); }
  const seq = resolveSequence(SEGMENT, OPENER);
  const r = await judgeCopy({ anthropic: new Anthropic({ apiKey: KEY }), sequence: seq, segment: SEGMENT });
  console.log(`\n=== JUDGE — ${seq.label} [${SEGMENT}/${OPENER || 'default'}] ===`);
  console.log(`verdict: ${r.verdict.toUpperCase()}  ·  score ${r.score}/100`);
  console.log(`would they reply: ${r.would_reply_read}`);
  console.log(`subject take: ${r.subject_take}`);
  if (r.strengths.length) console.log('strengths:\n  + ' + r.strengths.join('\n  + '));
  if (r.issues.length) console.log('issues:\n' + r.issues.map((i) => `  [${i.severity}] E${i.step}: ${i.issue}`).join('\n'));
  if (r.suggestions.length) console.log('suggestions:\n  - ' + r.suggestions.join('\n  - '));
  console.log('\n(advisory — the human decides the launch. Deterministic rules are copy-evaluator\'s job.)');
})().catch((e) => { console.error('JUDGE_ERROR:', e.message); process.exit(1); });
