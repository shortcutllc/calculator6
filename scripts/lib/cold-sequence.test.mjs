/**
 * cold-sequence.test.mjs — every shipped cold sequence must pass its segment's
 * copy-evaluator, and the law CLE-compliance rules must fire on bad copy.
 * Run: node scripts/lib/cold-sequence.test.mjs
 */
import assert from 'node:assert';
import { coldSequenceV3 } from './cold-sequence-v3.mjs';
import { coldSequenceLaw } from './cold-sequence-law.mjs';
import { coldSequenceRealEstate } from './cold-sequence-realestate.mjs';
import { evaluateCopy } from './copy-evaluator.mjs';

let pass = 0;
const ok = (c, m) => { assert.ok(c, m); pass += 1; };

// Every shipped sequence passes its own segment's evaluator (warnings allowed).
const shipped = [
  coldSequenceV3('generic'), coldSequenceV3('rto'),
  coldSequenceLaw('cle'), coldSequenceLaw('wellness'),
  coldSequenceRealEstate('building'), coldSequenceRealEstate('portfolio'),
];
for (const seq of shipped) {
  const r = evaluateCopy(seq, { segment: seq.segment, opener: seq.opener });
  ok(r.verdict === 'pass', `${seq.label} should PASS — violations: ${JSON.stringify(r.violations)}`);
}

// The direct massage-led rules must STILL reject a law CLE draft if mis-tagged
// as direct (proves the segment branch is doing real work).
const lawAsDirect = evaluateCopy(coldSequenceLaw('cle'), { segment: 'direct' });
ok(lawAsDirect.verdict === 'reject', 'law CLE copy judged as direct should reject (no massage lead)');

// Law compliance: overstating the credit must be flagged.
const badOverstate = { segment: 'law', opener: 'cle', steps: [
  { step: 1, delayDays: 0, subjects: ['a', 'b'], body: 'Hi {{first_name}}, our CLE covers your entire ethics requirement. Reply?' },
  { step: 2, delayDays: 3, subjects: [''], body: 'Hi {{first_name}}, following up.' },
  { step: 3, delayDays: 4, subjects: [''], body: 'Hi {{first_name}}, more value here for your team to consider today.' },
  { step: 4, delayDays: 5, subjects: [''], body: 'Hi {{first_name}}, last note, happy to step away whenever it suits.' },
] };
let r = evaluateCopy(badOverstate, { segment: 'law', opener: 'cle' });
ok(r.violations.some((x) => x.rule === 'cle_overstates'), 'overstating the ethics requirement must be flagged');

// Law compliance: naming a non-NY/FL/PA state for CLE must be flagged.
const badState = { ...badOverstate, steps: [
  { step: 1, delayDays: 0, subjects: ['a', 'b'], body: 'Hi {{first_name}}, an accredited ethics CLE for your California attorneys. Reply?' },
  ...badOverstate.steps.slice(1),
] };
r = evaluateCopy(badState, { segment: 'law', opener: 'cle' });
ok(r.violations.some((x) => x.rule === 'cle_wrong_state'), 'CLE credit claimed for California must be flagged');

// Real estate E1 with no amenity signal must be flagged.
const reNoAmenity = { segment: 'realestate', opener: 'building', steps: [
  { step: 1, delayDays: 0, subjects: ['a', 'b'], body: 'Hi {{first_name}}, we do chair massage and nails. Reply?' },
  ...badOverstate.steps.slice(1),
] };
r = evaluateCopy(reNoAmenity, { segment: 'realestate', opener: 'building' });
ok(r.violations.some((x) => x.rule === 're_e1_no_amenity'), 'real estate E1 with no amenity/tenant signal must be flagged');

// STANDALONE (Will, 2026-07-02 — the miss that created this rule): an E3 that
// says "what we run" without naming a single concrete service must hard-fail.
// This exact copy shipped and Will caught it, not the gates.
const vagueE3 = coldSequenceV3('generic', { e3Link: true });
vagueE3.steps = vagueE3.steps.map((s) => (s.step === 3
  ? { ...s, abVariants: undefined, body: `{Hi|Hey} {{first_name}},\n\n{I put together a short page for the {{company_name}} team|I made a quick page for the {{company_name}} team}, with how a day works, what we run on-site and virtually, and a rough price: {{landing_url}}\n\nOver 90% of slots get booked at these events.\n\n{No pressure|Have a look}.\n\n{Warmly,|Thanks,}\n%sender-firstname%` }
  : s));
r = evaluateCopy(vagueE3, { segment: 'direct', opener: 'generic' });
ok(r.violations.some((x) => x.step === 3 && x.rule === 'not_standalone'), 'vague E3 (no service named) must hard-fail not_standalone');

// A vague VARIANT must fail too, even when variant A is fine (a variant ships to
// half the leads — every variant must stand alone).
const goodWithVagueVariant = coldSequenceV3('generic', { e3Link: true });
goodWithVagueVariant.steps = goodWithVagueVariant.steps.map((s) => (s.step === 3
  ? { ...s, abVariants: [s.abVariants[0], { variantLabel: 'B-vague', body: 'Hi {{first_name}}, quick page for your team with what we run and a rough price: {{landing_url}}. {No pressure|Have a look}. {Warmly,|Thanks,}' }] }
  : s));
r = evaluateCopy(goodWithVagueVariant, { segment: 'direct', opener: 'generic' });
ok(r.violations.some((x) => x.step === 3 && x.rule === 'not_standalone' && /B-vague/.test(x.detail)), 'vague E3 VARIANT must hard-fail not_standalone');

// The shipped e3Link sequences (both segments, both variants) must PASS the rule.
for (const seq of [coldSequenceV3('generic', { e3Link: true }), coldSequenceRealEstate('building', { e3Link: true })]) {
  const rr = evaluateCopy(seq, { segment: seq.segment, opener: seq.opener });
  ok(rr.verdict === 'pass', `${seq.label} must pass standalone — violations: ${JSON.stringify(rr.violations)}`);
}

console.log(`cold-sequence.test.mjs — ${pass} assertions passed ✓`);
