/**
 * belief-generator.mjs — the HYPOTHESIZE step of the weekly self-improve loop.
 *
 * Mines the belief model for two kinds of candidate experiments and hands them
 * to the belief skeptic (which defaults to rejecting them):
 *   EXPLOIT — cells with enough sends to maybe be "proven". Concentrate spend
 *             here IF the skeptic agrees the positive floor clears baseline.
 *   EXPLORE — bounded bets: a known untested lever (the RTO opener), plus cells
 *             whose point estimate beats baseline but lack the sample to prove
 *             it. Each carries a stated mechanism (the skeptic rejects bets
 *             with no reason to believe).
 *
 * Deterministic + pure: same belief model in, same hypotheses out. No keys, so
 * the loop runs in cron. An LLM angle-proposer can be injected later via
 * opts.propose(belief) returning extra Hypothesis objects; the skeptic critiques
 * those on the same footing (generator never grades itself).
 *
 * Generator ≠ evaluator: this file PROPOSES. It is intentionally generous —
 * it surfaces the selection-bias title cells and the low-n flukes too, because
 * the skeptic's job is to knock them down with named reasons. A generator that
 * pre-filters would hide the rejections that make the loop legible.
 */

const evOf = (row) => ({
  sent: row.sent, positive: row.positive,
  positive_rate: row.positive_rate, reply_lb95: row.reply_lb95, confidence: row.confidence,
});

// The cold-channel positive POINT estimate — what "promising" is measured against.
const baselinePositiveRate = (belief) => {
  const cold = (belief?.where?.channel || []).find((r) => r.value === 'cold');
  return cold && cold.sent ? cold.positive_rate : 0.009;
};

const DEFAULTS = {
  exploitMinN: 50,     // mirror the skeptic — only mine real exploit candidates at/above this
  exploreMinN: 10,     // a cell needs at least this many sends to be a "promising" bet, not pure noise
  exploreMaxN: 50,     // under-tested = fewer than this
  perFaceTop: 4,       // cap candidates per face so the digest stays legible
};

/**
 * @param {Object} belief  belief_model.json object
 * @param {Object} [options]  { exploitMinN, exploreMaxN, perFaceTop, propose }
 * @returns {Hypothesis[]}
 */
export function generateHypotheses(belief, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  const base = baselinePositiveRate(belief);
  const hyps = [];
  let seq = 0;
  const id = (face, value) => `h${++seq}:${face}:${String(value).replace(/\s+/g, '_').slice(0, 24)}`;

  const FACES = [
    ['title_category', belief?.who?.title_category],
    ['size_band', belief?.who?.size_band],
    ['industry', belief?.who?.industry],
    ['hub', belief?.where?.hub],
    ['cross', belief?.cross_title_x_hub],
  ];

  for (const [face, rows] of FACES) {
    if (!Array.isArray(rows)) continue;

    // EXPLOIT candidates: enough sends to maybe be proven. Rank by positive
    // floor (the skeptic's metric) so the strongest go first.
    const exploit = rows
      .filter((r) => (r.sent || 0) >= opts.exploitMinN)
      .sort((a, b) => (b.positive_rate - a.positive_rate) || (b.sent - a.sent))
      .slice(0, opts.perFaceTop);
    for (const r of exploit) {
      hyps.push({
        id: id(face, r.value), kind: 'exploit', face, value: r.value, metric: 'positive_rate',
        claim: `Concentrate cold spend on ${face}=${r.value} (positive ${(r.positive_rate * 100).toFixed(1)}% over ${r.sent} sends).`,
        evidence: evOf(r),
      });
    }

    // EXPLORE candidates: point estimate beats baseline but under-tested. A
    // bounded bet worth reaching significance on.
    const explore = rows
      .filter((r) => (r.sent || 0) >= opts.exploreMinN && (r.sent || 0) < opts.exploreMaxN && (r.positive_rate || 0) > base)
      .sort((a, b) => (b.positive_rate - a.positive_rate))
      .slice(0, opts.perFaceTop);
    for (const r of explore) {
      hyps.push({
        id: id(face, r.value), kind: 'explore', face, value: r.value, metric: 'positive_rate',
        claim: `Test ${face}=${r.value}: ${(r.positive_rate * 100).toFixed(1)}% positive but only ${r.sent} sends. Bounded batch to reach significance.`,
        mechanism: `Point estimate ${(r.positive_rate * 100).toFixed(1)}% is above the ${(base * 100).toFixed(1)}% cold baseline; too few sends to trust yet.`,
        budget_pct: 20, evidence: evOf(r),
      });
    }
  }

  // The standing opener experiment: RTO ("make the office worth the commute")
  // vs the generic problem-open. Live campaign 3557935 runs generic; the RTO
  // variant is approved but not yet measured. This is the cleanest real lever
  // the cold engine exposes (--opener generic|rto), so always surface it until
  // it has data. Grounded in the messaging playbook (RTO = richest wedge).
  const openerRow = (belief?.solution?.campaign || []).find((r) => /rto|return.to.office|commute/i.test(String(r.value)));
  if (!openerRow) {
    hyps.push({
      id: 'h-opener-rto', kind: 'explore', face: 'opener', value: 'rto', metric: 'positive_rate',
      claim: 'Run a bounded RTO-opener batch ("make the office worth the commute") against the live generic opener.',
      mechanism: 'RTO is the richest documented trigger moment (messaging playbook); the RTO E1 is approved but has zero cold sends, so it is untested signal, not noise.',
      budget_pct: 20,
      evidence: { sent: 0, positive: 0, positive_rate: 0, reply_lb95: 0, confidence: 'insufficient' },
    });
  }

  // Optional injected LLM proposer (DI). It runs on the same belief model and
  // its output is critiqued by the same skeptic — the generator never grades.
  if (typeof opts.propose === 'function') {
    try {
      const extra = opts.propose(belief) || [];
      for (const h of extra) hyps.push({ ...h, id: h.id || id(h.face || 'llm', h.value || seq), source: 'llm' });
    } catch { /* proposer is best-effort; deterministic core stands alone */ }
  }

  return hyps;
}

export const BELIEF_GENERATOR_DEFAULTS = DEFAULTS;
