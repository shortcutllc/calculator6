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

// ---- COLD SUBJECT LINTER (see memory/cold_email_subjects.md) ----
// Cold E1 subjects must read like a 1-line internal note: 1-4 words, no sell, no
// spam/urgency/money words, no fake Re:/Fwd: (the one pattern that actively burns
// sacrificial domains), no ALL-CAPS/emoji/exclamation.
const SUBJ_FAKE_THREAD = /^\s*(re|fwd|fw)\s*:/i;
const SUBJ_SPAM = /\b(free|discount|guarantee|risk[- ]?free|cash|earn|cheap|act now|urgent|asap|limited time|last chance|winner|amazing|incredible|miracle|best price|% off)\b|\$/i;
const SUBJ_SELL = /\b(boost|improve|increase|accelerate|maximize|guaranteed|save big|better|best)\b/i;     // overt sell / superlative / command
const SUBJ_EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}]/u;
const SUBJ_ACRONYM_OK = new Set(['CLE', 'RTO', 'NYC', 'USA', 'LLC', 'LLP', 'CEO', 'CFO', 'CHRO', 'PTO']);
const subjWords = (s) => String(s || '').replace(/\{\{[^}]+\}\}/g, 'x').split(/\s+/).filter(Boolean);

/** Lint one cold subject → array of {hard, rule, detail}. */
export function lintSubject(subject) {
  const s = String(subject || '');
  const out = [];
  if (!s.trim()) return out;                                   // blank = threaded follow-up, fine
  if (SUBJ_FAKE_THREAD.test(s)) out.push({ hard: true, rule: 'subject_fake_thread', detail: 'fake Re:/Fwd: on a cold touch is deceptive and burns sacrificial domains' });
  if (SUBJ_EMOJI.test(s)) out.push({ hard: true, rule: 'subject_emoji', detail: 'no emoji in cold subjects (spam signal)' });
  if (/!/.test(s)) out.push({ hard: true, rule: 'subject_exclamation', detail: 'no exclamation in subject' });
  const m = SUBJ_SPAM.exec(s); if (m) out.push({ hard: true, rule: 'subject_spam_word', detail: `"${m[0]}"` });
  const sell = SUBJ_SELL.exec(s); if (sell) out.push({ hard: true, rule: 'subject_sell_word', detail: `"${sell[0]}" — overt sell/superlative, not an internal-note subject` });
  const caps = (s.match(/\b[A-Z]{4,}\b/g) || []).filter((w) => !SUBJ_ACRONYM_OK.has(w));
  if (caps.length) out.push({ hard: true, rule: 'subject_allcaps', detail: `"${caps[0]}"` });
  const n = subjWords(s).length;
  if (n > 6) out.push({ hard: false, rule: 'subject_long', detail: `${n} words — cold subjects want 1-4; 7+ opens decline sharply` });
  else if (n > 4) out.push({ hard: false, rule: 'subject_longish', detail: `${n} words (1-4 ideal)` });
  if (n > 1 && /\?/.test(s)) out.push({ hard: false, rule: 'subject_multiword_question', detail: 'a "?" reads best on a 1-2 word problem-noun, not a long question' });
  if (/\d/.test(s)) out.push({ hard: false, rule: 'subject_number', detail: 'numbers slightly hurt cold opens (Belkins)' });
  if (/\{\{first_?name\}\}/i.test(s)) out.push({ hard: false, rule: 'subject_firstname_token', detail: 'prefer {{company}}/trigger over {{first_name}} (reads as mail-merge)' });
  return out;
}

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
// Merge-tag links ({{landing_url}}/{{cle_url}}) render as URLs per lead — they
// count toward the link budget so E1/E2 stay link-free and E3 keeps exactly one.
const countLinks = (t) => (String(t || '').match(/https?:\/\/|\]\(|href=|\{\{\s*(?:landing_url|cle_url)\s*\}\}/gi) || []).length;
// FABRICATION GUARDS (first proposal-lane run, 2026-07-06 — the composer invented
// a "~24%" stat, a shortcut.live URL, and a "[Your name]" sign-off; none were laws):
// numbers must come from the cleared proof set, URLs from our real domains, and
// the sign-off must be the Smartlead sender token.
const ALLOWED_NUMBERS = new Set(['90', '87', '500', '15', '20', '1', '2', '3', '4', '5', '10', '30', '60']); // proof points + small ordinals/durations
const URL_WHITELIST_RE = /^https?:\/\/(www\.)?(proposals\.)?getshortcut\.co(\/|$)/i;
// STANDALONE RULE (Will, 2026-07-02): every pitch-carrying touch (E1, E3 + every
// E3 variant) must stand alone — a busy reader who never opens the earlier emails
// (threading quotes them BELOW, previews show only the new text) must still learn
// WHAT we actually run. Concrete services, not the category word "wellness".
// Born from the short E3 shipping with "what we run on-site and virtually" and no
// service named — Will caught it, the gates did not. E2 is exempt (pure bump).
// PRIORITY: this beats the word budget — extend length to fit the essentials,
// never cut a service/proof/who-we-are element to hit a word target (word overage
// is a warning; a non-standalone email is a hard reject).
const SERVICE_RE = /\b(?:chair )?(?:massage|nails?|facials?|mindfulness|meditation|headshots?|nutrition|grooming|sound ?baths?|yoga)\b/i;
const countSpintax = (t) => (String(t || '').match(/\{[^{}]*\|[^{}]*\}/g) || []).length;
// em/en dash anywhere, or clause hyphen " - " (intra-word hyphens like mid-market are fine)
const hasDash = (t) => /[—–]/.test(String(t || '')) || /\s-\s/.test(String(t || ''));
const lc = (t) => String(t || '').toLowerCase();

export function evaluateCopy(sequence, opts = {}) {
  const seasonal = !!opts.seasonal;
  const segment = (opts.segment || sequence?.segment || 'direct').toLowerCase();   // direct | law | realestate | broker
  const opener = (opts.opener || sequence?.opener || '').toLowerCase();
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
      for (const issue of lintSubject(subj)) {
        if (issue.hard) flag(bp.step, issue.rule, `"${subj}" — ${issue.detail}`);
        else warn.push({ step: bp.step, rule: issue.rule, detail: `"${subj}" — ${issue.detail}` });
      }
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

    // ---- E1 OPENER CLARITY (Will, 2026-07-06 — "poor grammar, not clear what
    // problem we're talking about"): the opener must read like a human sentence
    // and make the PROBLEM DOMAIN legible immediately.
    if (bp.step === 1 && !(segment === 'law' && opener === 'cle')) {
      const lines = String(body).split('\n').map((l) => l.trim()).filter((l) => l && !/^\{?(hi|hey)\b/i.test(l));
      const opener1 = (lines[0] || '').replace(/\{([^{}|]+)\|[^{}]*\}/g, '$1');
      const firstSentence = opener1.split(/(?<=[.!?])\s+/)[0] || '';
      // comma-splice pileup: 3+ commas in the first sentence with no question =
      // the "Booking the vendors, chasing the RSVPs, running the day, it all
      // lands..." pattern — unreadable as a cold open.
      if ((firstSentence.match(/,/g) || []).length >= 3 && !firstSentence.includes('?')) {
        flag(1, 'e1_opener_splice', 'E1 first sentence is a comma-spliced list — one clear human sentence (or a question), not a pileup');
      }
      // the problem domain must be legible fast: a wellness word (or the RTO
      // trigger for the rto opener) within the first two sentences.
      const firstTwo = opener1.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
      if (!/wellness|massage|facials?|nails?|mindfulness|spa|headshots?/i.test(firstTwo)
          && !/office|commute|back in|return/i.test(firstTwo)) {
        flag(1, 'e1_opener_unclear', 'E1 opener never names the problem domain — the reader cannot tell this is about wellness (or the RTO moment) within two sentences');
      }
    }

    // ---- FABRICATION GUARDS (all steps) ----
    for (const url of String(body).match(/https?:\/\/[^\s)>"']+/gi) || []) {
      if (!URL_WHITELIST_RE.test(url)) flag(bp.step, 'invented_url', `"${url}" — only getshortcut.co / proposals.getshortcut.co URLs (or {{landing_url}}/{{cle_url}}) may appear`);
    }
    for (const m of stripForCount(body).matchAll(/(\d+(?:\.\d+)?)\s*%|~\s*(\d+)/g)) {
      const n = (m[1] || m[2] || '').replace(/\.0$/, '');
      if (n && !ALLOWED_NUMBERS.has(n)) flag(bp.step, 'unlisted_statistic', `"${m[0]}" — not in the cleared proof set (90%+ booked, 87% rebook, 500+ companies); never invent numbers`);
    }
    if (/\[(your|sender|rep)[^\]]*\]/i.test(body)) flag(bp.step, 'placeholder_signoff', 'literal placeholder like "[Your name]" — sign-offs use %sender-firstname%');

    // ---- STANDALONE (hard on E1 + E3; law-CLE E1 exempt — the CLE course IS its
    // offer). E4 gets a soft warn (a breakup can stay light).
    const standaloneExempt = bp.step === 1 && segment === 'law' && opener === 'cle';
    if ((bp.step === 1 || bp.step === 3) && !standaloneExempt && !SERVICE_RE.test(body)) {
      flag(bp.step, 'not_standalone', `E${bp.step} names no concrete service — a reader who never opened the earlier emails must still learn what we run (extend length if needed; never cut services to fit a word budget)`);
    }
    if (bp.step === 4 && !SERVICE_RE.test(body) && !/wellness|amenity|cle|ethics/i.test(body)) {
      warn.push({ step: 4, rule: 'not_standalone', detail: 'E4 has no service or category anchor — fine for a breakup, but check it reads sensibly alone' });
    }

    // ---- A/B VARIANTS: step.body is variant A (already checked above); run the
    // body-level gates on every EXTRA variant so a bad variant B can't ship via
    // the manual Smartlead-UI paste unlinted.
    for (const av of (s.abVariants || []).slice(1)) {
      const vb = av.body || ''; const tag = av.variantLabel || 'variant';
      const vLinks = countLinks(vb);
      if (vLinks > bp.maxLinks) flag(bp.step, 'too_many_links', `[${tag}] ${vLinks} links, max ${bp.maxLinks}`);
      const vwc = wordCount(vb);
      if (vwc < bp.words[0]) warn.push({ step: bp.step, rule: 'short', detail: `[${tag}] ${vwc}w < ${bp.words[0]}` });
      if (vwc > bp.words[1]) warn.push({ step: bp.step, rule: 'long', detail: `[${tag}] ${vwc}w > ${bp.words[1]}` });
      if (hasDash(vb)) flag(bp.step, 'dash', `[${tag}] no em/en dashes or " - " as punctuation`);
      if (/!/.test(vb)) flag(bp.step, 'exclamation', `[${tag}] no exclamation points`);
      for (const w of BANNED_WORDS) if (new RegExp(`\\b${w}\\b`, 'i').test(vb)) flag(bp.step, 'banned_word', `[${tag}] ${w}`);
      for (const p of DEAD_DIFFERENTIATORS) if (lc(vb).includes(lc(p))) flag(bp.step, 'dead_differentiator', `[${tag}] "${p}"`);
      if (/\bat\s+(?:their\s+|your\s+)?desks?\b/i.test(vb) || /\bdesk-?side\b/i.test(vb)) flag(bp.step, 'massage_at_desk', `[${tag}] never "at desks"`);
      if (countSpintax(vb) < 3) warn.push({ step: bp.step, rule: 'low_spintax', detail: `[${tag}] wants 3+ spintax groups` });
      // every variant must stand alone too — a variant ships to half the leads
      if ((bp.step === 1 || bp.step === 3) && !SERVICE_RE.test(vb)) flag(bp.step, 'not_standalone', `[${tag}] names no concrete service — each variant must stand alone`);
    }

    // ---- LAW / CLE compliance (every step, segment=law) — hard. These claims
    // are compliance-sensitive: CLE is accredited ONLY in NY/FL/PA and our
    // course is ONE hour of the ethics category, never the whole requirement.
    if (segment === 'law') {
      if (/cover(?:s|ed)?\s+(?:your\s+)?(?:whole\s+|entire\s+|full\s+)?(?:ethics\s+|cle\s+)?requirement/i.test(all)
        || /(?:fulfill|satisf|complete)(?:s|es|ed)?\s+(?:your\s+)?(?:entire\s+|whole\s+|all\s+)?(?:ethics|cle)\b/i.test(all)
        || /all\s+(?:your\s+|their\s+)?(?:ethics|cle)\s+(?:credits|requirements|hours)/i.test(all)) {
        flag(bp.step, 'cle_overstates', 'never claim it covers the full ethics/CLE requirement — it is ONE hour of the ethics category ("an hour of your mandatory ethics credit")');
      }
      // accreditation claimed for any state outside NY/FL/PA
      const mentionsCle = /\b(cle|accredit|ethics credit|ethics and professionalism)\b/i.test(all);
      const otherState = /\b(california|texas|illinois|new jersey|connecticut|massachusetts|georgia|maryland|nevada|\bCA\b|\bTX\b|\bIL\b|\bNJ\b|\bMA\b|\bGA\b)\b/i;
      if (mentionsCle && otherState.test(all)) flag(bp.step, 'cle_wrong_state', 'CLE is accredited ONLY in New York, Florida, Pennsylvania — do not name another state');
    }

    // ---- E1 PLACEMENT (the acquisition lead) — segment-specific.
    if (bp.step === 1) {
      if (segment === 'law' && opener === 'cle') {
        // CLE-led: must reference the CLE/ethics-credit wedge; no massage lead required.
        if (!/\b(cle|ethics|credit|accredit)/i.test(all)) flag(1, 'law_e1_no_cle', 'law CLE E1 must lead with the CLE / ethics-credit wedge');
      } else if (segment === 'realestate') {
        // Amenity-led: must signal building/tenant/amenity value, not lead with a service.
        if (!/\b(amenit|tenant|building|member|resident|portfolio|occupanc|renewal|calendar|commute)\b/i.test(all)) flag(1, 're_e1_no_amenity', 'real estate E1 must signal amenity / tenant / building value (the buyer is the landlord/operator, not the employer)');
      } else {
        // direct + law-wellness: massage-led, breadth-signalling, no remote/virtual.
        if (/\b(remote|virtual|hybrid|distributed)\b/i.test(all)) flag(1, 'e1_mentions_remote', 'E1 must not mention remote/virtual (that is a later-touch objection-handler, not the acquisition lead)');
        const svc = [...all.matchAll(/\b(massage|nails|facials|grooming|headshots|mindfulness|nutrition|sound ?bath)\b/gi)].map((m) => m[1].toLowerCase());
        if (!svc.length) flag(1, 'e1_no_service', 'E1 names no service');
        else if (svc[0] !== 'massage') flag(1, 'massage_not_leading', `E1 leads with ${svc[0]}, not massage (massage is the hero service)`);
        const nonMassage = svc.some((s) => s !== 'massage');
        const oneTeam = /one team|one vendor|all from one/i.test(all);
        if (!nonMassage || !oneTeam) flag(1, 'no_breadth_signal', 'E1 must signal breadth: a non-massage service AND a one-team/one-vendor phrase');
      }
    }
  }

  const verdict = v.length === 0 ? 'pass' : 'reject';
  return { verdict, violations: v, warnings: warn };
}

export { BANNED_WORDS };
