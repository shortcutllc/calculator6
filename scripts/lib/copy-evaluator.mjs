/**
 * copy-evaluator.mjs — the COPY skeptic. Deterministic lint that judges a
 * composed cold sequence against the messaging spine + brand voice + the
 * blueprint, and defaults to REJECT on any hard violation.
 *
 * Deliberately rule-based (no LLM): the generator (sequence-composer) is the
 * creative half; this is the reliable half that can say "no" the same way every
 * time. Pure + testable with NO keys.
 *
 * Normalized sequence shape it reads (the composer's internal shape):
 *   { steps: [ { step, delayDays, subjects: [..], body } ] }
 */

import { DEAD_DIFFERENTIATORS, SEASONAL_ONLY_PHRASES } from '../../netlify/functions/lib/positioning.js';

// Brand voice banned words (mirror draft-outreach.js HARD WRITING RULES).
const BANNED_WORDS = ['elevate', 'leverage', 'synergy', 'unlock', 'empower', 'transform', 'reimagine', 'seamless', 'holistic', 'curated'];

// The fixed skeleton (copy is composed into it; this enforces it).
export const SEQUENCE_BLUEPRINT = [
  { step: 1, delayDays: 0, role: 'problem-first hook + one pillar (actually-used)', words: [40, 95], maxLinks: 0, subjectVariants: 2, requireMergeTag: true },
  { step: 2, delayDays: 3, role: 'simple bump, NO proof point', words: [6, 45], maxLinks: 0, subjectVariants: 1, mustBeBump: true },
  { step: 3, delayDays: 4, role: 'differentiation: one vendor, whole team, in office + remote (breadth from one team; grooming/headshots only as a menu aside, never the lead)', words: [55, 115], maxLinks: 1, subjectVariants: 1 },
  { step: 4, delayDays: 5, role: 'soft close / breakup', words: [28, 78], maxLinks: 0, subjectVariants: 1 },
];

// strip HTML, merge tags, and spinner syntax {a|b} → first option, for word count
const stripForCount = (t) => String(t || '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\{\{[^}]+\}\}/g, 'x')             // {{first_name}} → one token
  .replace(/\{([^{}|]+)\|[^{}]*\}/g, '$1')    // {Hi|Hello|Hey} → first option
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ').trim();
const wordCount = (t) => { const s = stripForCount(t); return s ? s.split(' ').length : 0; };
const countLinks = (t) => (String(t || '').match(/https?:\/\/|\]\(|href=/gi) || []).length;
const countSpintax = (t) => (String(t || '').match(/\{[^{}]*\|[^{}]*\}/g) || []).length;
// em/en dash anywhere, or clause hyphen " - " (intra-word hyphens like mid-market are fine)
const hasDash = (t) => /[—–]/.test(String(t || '')) || /\s-\s/.test(String(t || ''));
const lc = (t) => String(t || '').toLowerCase();

export function evaluateCopy(sequence, opts = {}) {
  const seasonal = !!opts.seasonal;
  const steps = sequence?.steps || [];
  const v = [];               // violations (hard → reject)
  const warn = [];            // soft (allowed, surfaced)
  const flag = (step, rule, detail) => v.push({ step, rule, detail });

  // ---- structure ----
  if (steps.length !== SEQUENCE_BLUEPRINT.length) {
    flag(0, 'step_count', `expected ${SEQUENCE_BLUEPRINT.length} steps, got ${steps.length}`);
  }

  for (const bp of SEQUENCE_BLUEPRINT) {
    const s = steps.find((x) => x.step === bp.step);
    if (!s) { flag(bp.step, 'missing_step', `step ${bp.step} (${bp.role}) absent`); continue; }
    const body = s.body || '';
    const subjects = s.subjects || [];
    const all = `${subjects.join(' ')} ${body}`;

    // delay
    if (s.delayDays == null) flag(bp.step, 'missing_delay', 'no delayDays');

    // subject variants
    if (subjects.length < bp.subjectVariants) flag(bp.step, 'subject_variants', `needs ${bp.subjectVariants} subject(s), got ${subjects.length}`);
    for (const subj of subjects) {
      if (subj.split(/\s+/).filter(Boolean).length > 7) warn.push({ step: bp.step, rule: 'subject_long', detail: `"${subj}"` });
    }

    // links discipline
    const links = countLinks(body);
    if (links > bp.maxLinks) flag(bp.step, 'too_many_links', `${links} links, max ${bp.maxLinks} for this step`);

    // merge tag on E1
    if (bp.requireMergeTag && !/\{\{[^}]+\}\}/.test(body)) flag(bp.step, 'no_merge_tag', 'E1 should personalize with a merge tag');

    // spintax for deliverability — soft (clone path carries it; composer should add it)
    const spin = countSpintax(body);
    if (spin < 3) warn.push({ step: bp.step, rule: 'low_spintax', detail: `${spin} spintax groups, want 6+ to rotate copy for deliverability` });

    // length
    const wc = wordCount(body);
    if (wc < bp.words[0]) warn.push({ step: bp.step, rule: 'short', detail: `${wc}w < ${bp.words[0]}` });
    if (wc > bp.words[1]) {
      // E2 over budget is HARD — a bump must stay a bump
      if (bp.mustBeBump) flag(bp.step, 'bump_too_long', `${wc}w > ${bp.words[1]} — E2 must be a simple bump, no proof`);
      else warn.push({ step: bp.step, rule: 'long', detail: `${wc}w > ${bp.words[1]}` });
    }

    // brand voice — hard
    if (hasDash(all)) flag(bp.step, 'dash', 'no em/en dashes or " - " as punctuation');
    if (/!/.test(all)) flag(bp.step, 'exclamation', 'no exclamation points');
    for (const w of BANNED_WORDS) if (new RegExp(`\\b${w}\\b`, 'i').test(all)) flag(bp.step, 'banned_word', w);

    // spine — hard
    for (const p of DEAD_DIFFERENTIATORS) if (lc(all).includes(lc(p))) flag(bp.step, 'dead_differentiator', `"${p}" — dead as a differentiator`);
    if (!seasonal) for (const p of SEASONAL_ONLY_PHRASES) if (lc(all).includes(lc(p))) flag(bp.step, 'seasonal_gift', `"${p}" — gift framing is holiday-only`);

    // FACT (all steps): massage is chair/table in a conference room turned spa, NEVER at desks.
    if (/\bat\s+(?:their\s+|your\s+)?desks?\b/i.test(all) || /\bdesk-?side\b/i.test(all)) flag(bp.step, 'massage_at_desk', 'massage is chair/table in a conference room, never "at desks"');

    // E1 PLACEMENT (the acquisition lead): massage-led, breadth-signalling, no remote/virtual.
    if (bp.step === 1) {
      if (/\b(remote|virtual|hybrid|distributed)\b/i.test(all)) flag(1, 'e1_mentions_remote', 'E1 must not mention remote/virtual (that is a later-touch objection-handler, not the acquisition lead)');
      const svc = [...all.matchAll(/\b(massage|nails|facials|grooming|headshots|mindfulness|nutrition|sound ?bath)\b/gi)].map((m) => m[1].toLowerCase());
      if (!svc.length) flag(1, 'e1_no_service', 'E1 names no service');
      else if (svc[0] !== 'massage') flag(1, 'massage_not_leading', `E1 leads with ${svc[0]}, not massage (massage is the hero service)`);
      const nonMassage = svc.some((s) => s !== 'massage');
      const oneTeam = /one team|one vendor|all from one/i.test(all);
      if (!nonMassage || !oneTeam) flag(1, 'no_breadth_signal', 'E1 must signal breadth: a non-massage service AND a one-team/one-vendor phrase');
    }
  }

  const verdict = v.length === 0 ? 'pass' : 'reject';
  return { verdict, violations: v, warnings: warn };
}

export { BANNED_WORDS };
