/**
 * belief-skeptic.mjs — THE BELIEF SKEPTIC. The third reuse of the keystone
 * (after cold-list-evaluator = list skeptic, copy-evaluator = copy skeptic).
 *
 * Per "Loop Engineering": the generator proposes, a SEPARATE evaluator that
 * defaults to "noise until proven" disposes. This one critiques the weekly
 * hypotheses about WHO/WHERE/SOLUTION before any of them earns cold spend. It
 * exists so the loop cannot fool itself with small-sample flukes or the
 * selection-bias artifacts the cold brain already paid to learn.
 *
 * Pure + dependency-injected: it reads a belief_model.json object and a list of
 * candidate hypotheses, runs deterministic rules, and returns accept/reject
 * with named reasons. No keys, no I/O, unit-testable.
 *
 * THE HARD-WON COLD LESSONS this skeptic enforces (memory/cold_campaign_brain):
 *   - positive_rate is the metric. reply_rate is mostly OOO/auto-replies.
 *   - cold-to-ICP converges on ~1% positive REGARDLESS of targeting finesse.
 *     So an "exploit" cell must beat the channel baseline FLOOR by a real
 *     margin at adequate n, or it is not worth concentrating spend on.
 *   - high title-category positive rates (HR 50%+) are SELECTION BIAS: titles
 *     are back-filled from responders, so the cell is responders, not a
 *     targetable population. Reject title exploits with implausible rates.
 *   - sender does not move cold (Jaimie ≈ Will). Reject sender hypotheses.
 *   - NoTitle / unenriched / "Opened + No Reply" recycling = ~0% positive, dead.
 *   - explore is a BOUNDED bet (<=20% spend), judged on plausibility +
 *     measurability, not on evidence it does not have yet.
 *
 * @typedef {Object} Hypothesis
 * @property {string} id
 * @property {'exploit'|'explore'} kind
 * @property {string} face        title_category | size_band | industry | hub | cross | opener | sender | campaign
 * @property {string} value
 * @property {'positive_rate'|'reply_rate'} metric
 * @property {Object} evidence    { sent, positive, positive_rate, reply_lb95, confidence }
 * @property {string} [mechanism] required for explore: why this might convert
 * @property {number} [budget_pct] explore only: share of next batch (default capped)
 */

const wilsonLower = (pos, n, z = 1.96) => {
  if (!n) return 0;
  const p = pos / n;
  const d = 1 + (z * z) / n;
  const centre = p + (z * z) / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return Math.max(0, (centre - margin) / d);
};

// Positive-rate Wilson lower bound — the honest worst-case positive rate for a
// cell. This is what "proven" means: not the headline rate, the floor.
export const positiveFloor = (ev) => wilsonLower(ev?.positive || 0, ev?.sent || 0);

const DEFAULTS = {
  exploitMinN: 50,          // an exploit cell needs at least medium confidence
  exploitMinLift: 1.5,      // its positive floor must beat baseline floor by >=1.5x
  selectionBiasCeil: 0.10,  // a title cell claiming >10% positive in cold is back-fill, not a population
  exploreMaxN: 50,          // "under-tested" means fewer than this many sends
  maxExplorePct: 20,        // explore is a bounded bet, never more than this share
  baselineFloorFallback: 0.009, // cold ~0.9% positive if the model lacks a channel row
};

// Faces the data has shown do NOT move cold outcomes — any hypothesis built on
// them is rejected outright (no amount of sample size makes sender matter).
const ZERO_LEVER_FACES = new Set(['sender']);
// Cell values that are structurally dead (no person/title to target, or a
// recycling pattern the brain measured at 0% positive).
const DEAD_VALUES = new Set(['NoTitle', 'NoContact', 'unknown', 'Unknown', 'Other', 'unassigned']);
const DEAD_PATTERN = /opened.*no reply|no[- ]?reply recycle|re-?send opened/i;

/** Cold-channel baseline positive floor from the belief model (or fallback). */
export function baselinePositiveFloor(belief, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const cold = (belief?.where?.channel || []).find((r) => r.value === 'cold');
  if (cold && cold.sent) return positiveFloor(cold);
  return o.baselineFloorFallback;
}

/**
 * Critique a list of hypotheses against the belief model. Defaults to REJECT;
 * a hypothesis is accepted only when it survives every applicable rule.
 *
 * @param {Hypothesis[]} hypotheses
 * @param {Object} belief  belief_model.json object
 * @param {Object} [options]
 * @returns {{accepted: Object[], rejected: Object[], baseline_positive_floor: number, params: Object}}
 */
export function critiqueHypotheses(hypotheses, belief, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  const baseline = baselinePositiveFloor(belief, opts);
  const accepted = [];
  const rejected = [];

  for (const h of (hypotheses || [])) {
    const reasons = [];
    const ev = h.evidence || {};
    const floor = positiveFloor(ev);

    // Rules that apply to EVERY hypothesis ---------------------------------
    if (h.metric && h.metric !== 'positive_rate') {
      reasons.push('WRONG_METRIC: ranked on reply_rate (mostly OOO/auto-replies); cold signal is positive_rate only.');
    }
    if (ZERO_LEVER_FACES.has(h.face)) {
      reasons.push('ZERO_LEVER_IN_COLD: this face does not move cold outcomes (e.g. sender: Jaimie ≈ Will). No n makes it real.');
    }
    if (DEAD_VALUES.has(h.value) || DEAD_PATTERN.test(String(h.value || '')) || DEAD_PATTERN.test(String(h.claim || ''))) {
      reasons.push('DEAD_PATTERN: unenriched / no-title / opened-no-reply recycling measured at ~0% positive. Do not spend here.');
    }

    if (h.kind === 'exploit') {
      // An exploit concentrates spend on a "proven" cell. The bar is high.
      if ((ev.sent || 0) < opts.exploitMinN) {
        reasons.push(`INSUFFICIENT_N: ${ev.sent || 0} sends < ${opts.exploitMinN}. Too few to concentrate spend; treat as explore, not exploit.`);
      }
      // Titles in this corpus are back-filled from responders, so EVERY title
      // cell's positive rate is upward-biased (pre-targeted-by-title cold
      // campaigns actually convert ~1%). Reject title-bearing EXPLOITS outright
      // (you cannot trust the historical estimate). They are still legal as
      // EXPLORES — a forward batch enriches titles via Apollo BEFORE sending, so
      // it measures the effect cleanly. That is the right way to test a title.
      if (h.face === 'title_category' || h.face === 'cross') {
        const extreme = (ev.positive_rate || 0) > opts.selectionBiasCeil ? ` ${((ev.positive_rate || 0) * 100).toFixed(0)}% is implausible for cold.` : '';
        reasons.push(`SELECTION_BIAS: title is back-filled from responders here, so this title cell's rate is inflated, not a targetable population (real cold-to-good-title rate is ~1%).${extreme} Test it as an EXPLORE (forward, Apollo-enriched), never an exploit.`);
      }
      if (floor <= baseline * opts.exploitMinLift) {
        reasons.push(`NO_EDGE_OVER_BASELINE: positive floor ${(floor * 100).toFixed(2)}% does not clear ${opts.exploitMinLift}x the cold baseline floor ${(baseline * 100).toFixed(2)}%. Not worth concentrating spend.`);
      }
    } else if (h.kind === 'explore') {
      // An explore is a bounded BET. It is judged on being genuinely untested,
      // plausible, and measurable — not on evidence it cannot have yet.
      if ((ev.sent || 0) >= opts.exploreMaxN) {
        reasons.push(`WRONG_KIND: ${ev.sent} sends is enough to judge directly; this is an exploit/kill decision, not an explore.`);
      }
      const pct = h.budget_pct ?? opts.maxExplorePct;
      if (pct > opts.maxExplorePct) {
        reasons.push(`UNBOUNDED: ${pct}% exceeds the ${opts.maxExplorePct}% explore ceiling. An unproven bet must stay small.`);
      }
      if (!h.mechanism || !String(h.mechanism).trim()) {
        reasons.push('NO_MECHANISM: an explore needs a stated reason it might convert. A cell with no hypothesis is noise, not a bet.');
      }
    } else {
      reasons.push(`UNKNOWN_KIND: "${h.kind}" — must be exploit or explore.`);
    }

    const out = { ...h, positive_floor: +floor.toFixed(4), baseline_positive_floor: +baseline.toFixed(4), reasons };
    if (reasons.length === 0) accepted.push({ ...out, verdict: 'accept' });
    else rejected.push({ ...out, verdict: 'reject' });
  }

  // Exploit accepts ranked by floor (best first); explores after, by budget.
  accepted.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'exploit' ? -1 : 1;
    return (b.positive_floor - a.positive_floor) || ((b.budget_pct || 0) - (a.budget_pct || 0));
  });

  return {
    accepted,
    rejected,
    baseline_positive_floor: +baseline.toFixed(4),
    params: { exploitMinN: opts.exploitMinN, exploitMinLift: opts.exploitMinLift, selectionBiasCeil: opts.selectionBiasCeil, exploreMaxN: opts.exploreMaxN, maxExplorePct: opts.maxExplorePct },
  };
}

/**
 * Smallest sample size at which a cell running at positive_rate p would have a
 * Wilson floor clearing `threshold` — i.e. how many sends an explore needs
 * before it can be called a win. Used to size experiments honestly.
 */
export function minNToProve(p, threshold, cap = 20000) {
  if (p <= threshold) return Infinity; // can never clear the bar if the point estimate is below it
  for (let n = 10; n <= cap; n += 10) {
    if (wilsonLower(Math.round(p * n), n) > threshold) return n;
  }
  return Infinity;
}

export const BELIEF_SKEPTIC_DEFAULTS = DEFAULTS;
