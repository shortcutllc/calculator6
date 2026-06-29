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

console.log(`cold-sequence.test.mjs — ${pass} assertions passed ✓`);
