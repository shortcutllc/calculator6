/**
 * belief-skeptic.test.mjs — proves the skeptic defaults to "noise" and only
 * accepts hypotheses that clear the bar. Run: node scripts/lib/belief-skeptic.test.mjs
 */
import assert from 'node:assert';
import { critiqueHypotheses, minNToProve, positiveFloor } from './belief-skeptic.mjs';

// A belief model whose cold baseline positive floor is ~0.9%.
const belief = { where: { channel: [{ value: 'cold', sent: 26000, positive: 230, positive_rate: 0.0088, reply_lb95: 0.11, confidence: 'high' }] } };

let pass = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); pass += 1; };
const reasonsOf = (arr, id) => (arr.find((h) => h.id === id)?.reasons || []).join(' | ');

// 1. Small-sample exploit → INSUFFICIENT_N
let r = critiqueHypotheses([{ id: 'a', kind: 'exploit', face: 'hub', value: 'Austin', metric: 'positive_rate', evidence: { sent: 12, positive: 4, positive_rate: 0.33 } }], belief);
ok(r.accepted.length === 0 && /INSUFFICIENT_N/.test(reasonsOf(r.rejected, 'a')), 'small-sample exploit rejected');

// 2. Selection-bias title cell (HR 50% positive on n=160) → SELECTION_BIAS
r = critiqueHypotheses([{ id: 'b', kind: 'exploit', face: 'title_category', value: 'HR/People', metric: 'positive_rate', evidence: { sent: 160, positive: 81, positive_rate: 0.5062 } }], belief);
ok(r.accepted.length === 0 && /SELECTION_BIAS/.test(reasonsOf(r.rejected, 'b')), 'selection-bias title cell rejected');

// 3. Sender face → ZERO_LEVER_IN_COLD
r = critiqueHypotheses([{ id: 'c', kind: 'exploit', face: 'sender', value: 'Jaimie Pritchard', metric: 'positive_rate', evidence: { sent: 5000, positive: 130, positive_rate: 0.026 } }], belief);
ok(r.accepted.length === 0 && /ZERO_LEVER/.test(reasonsOf(r.rejected, 'c')), 'sender hypothesis rejected');

// 4. Dead value (NoTitle) → DEAD_PATTERN
r = critiqueHypotheses([{ id: 'd', kind: 'exploit', face: 'title_category', value: 'NoTitle', metric: 'positive_rate', evidence: { sent: 9000, positive: 9, positive_rate: 0.001 } }], belief);
ok(r.accepted.length === 0 && /DEAD_PATTERN/.test(reasonsOf(r.rejected, 'd')), 'NoTitle rejected');

// 5. reply_rate metric → WRONG_METRIC
r = critiqueHypotheses([{ id: 'e', kind: 'exploit', face: 'hub', value: 'Boston', metric: 'reply_rate', evidence: { sent: 800, positive: 8, positive_rate: 0.01 } }], belief);
ok(r.accepted.length === 0 && /WRONG_METRIC/.test(reasonsOf(r.rejected, 'e')), 'reply_rate metric rejected');

// 6. Exploit with no edge over baseline (1% positive, big n, non-title) → NO_EDGE_OVER_BASELINE
r = critiqueHypotheses([{ id: 'f', kind: 'exploit', face: 'industry', value: 'Legal', metric: 'positive_rate', evidence: { sent: 1500, positive: 15, positive_rate: 0.01 } }], belief);
ok(r.accepted.length === 0 && /NO_EDGE_OVER_BASELINE/.test(reasonsOf(r.rejected, 'f')), 'no-edge exploit rejected');

// 7. Legit exploit: industry cell, big n, positive floor well above baseline → ACCEPT
r = critiqueHypotheses([{ id: 'g', kind: 'exploit', face: 'industry', value: 'Consulting', metric: 'positive_rate', evidence: { sent: 1200, positive: 96, positive_rate: 0.08 } }], belief);
ok(r.accepted.length === 1 && r.accepted[0].id === 'g', 'legit high-floor exploit accepted');

// 8. Bounded explore with mechanism + low n → ACCEPT
r = critiqueHypotheses([{ id: 'h', kind: 'explore', face: 'opener', value: 'rto', metric: 'positive_rate', mechanism: 'RTO is the richest trigger; untested.', budget_pct: 20, evidence: { sent: 0, positive: 0, positive_rate: 0 } }], belief);
ok(r.accepted.length === 1 && r.accepted[0].id === 'h', 'bounded explore with mechanism accepted');

// 9. Explore with no mechanism → NO_MECHANISM
r = critiqueHypotheses([{ id: 'i', kind: 'explore', face: 'hub', value: 'Denver', metric: 'positive_rate', budget_pct: 20, evidence: { sent: 10, positive: 1, positive_rate: 0.1 } }], belief);
ok(r.accepted.length === 0 && /NO_MECHANISM/.test(reasonsOf(r.rejected, 'i')), 'mechanism-less explore rejected');

// 10. Over-budget explore → UNBOUNDED
r = critiqueHypotheses([{ id: 'j', kind: 'explore', face: 'hub', value: 'Denver', metric: 'positive_rate', mechanism: 'plausible', budget_pct: 60, evidence: { sent: 10, positive: 1, positive_rate: 0.1 } }], belief);
ok(r.accepted.length === 0 && /UNBOUNDED/.test(reasonsOf(r.rejected, 'j')), 'over-budget explore rejected');

// 11. minNToProve: a 2% rate needs a real sample to clear 0.9%; a rate below the bar is impossible.
ok(Number.isFinite(minNToProve(0.02, 0.009)) && minNToProve(0.02, 0.009) > 50, 'minNToProve returns a sane sample size');
ok(minNToProve(0.005, 0.009) === Infinity, 'minNToProve impossible when point estimate below bar');

// 12. positiveFloor monotonic in n at fixed rate (more data → higher floor)
ok(positiveFloor({ positive: 8, sent: 100 }) < positiveFloor({ positive: 80, sent: 1000 }), 'positive floor rises with sample at fixed rate');

console.log(`belief-skeptic.test.mjs — ${pass} assertions passed ✓`);
