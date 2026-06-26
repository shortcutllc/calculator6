/**
 * cold-list-evaluator.mjs — THE SKEPTIC. The keystone organ of the cold engine.
 *
 * Per "Loop Engineering": a loop that grades its own work praises it; the floor
 * of a loop is a SEPARATE evaluator that defaults to "broken until proven."
 * Nothing the cold engine assembles may launch until this gate says yes.
 *
 * Pure + dependency-injected so it unit-tests with NO keys: callers load the
 * suppression / client / personal-lane / contacted sets from Supabase and pass
 * them in. The evaluator does two things, in order:
 *   1. CLEAN — drop every lead that must not be emailed (suppressed, client,
 *      already-contacted, in the personal lane, undeliverable, no good title).
 *   2. JUDGE — on what survives, decide pass | hold with explicit reasons.
 *      Defaults to HOLD. A launch is the one irreversible, reputation-risking
 *      act, so the bar is high and every rejection is named.
 *
 * Returns { verdict, score, reasons[], stats, cleanLeads[], dropped[] }.
 *
 * Lead shape expected (orchestrator populates):
 *   { email, email_domain, title_cat, size_band, mv_status }
 *   mv_status ∈ ok | catch_all | unknown | invalid | disposable | null
 */

// MillionVerifier result → how we treat it. ok = send; catch_all = risky but
// allowed (counted, capped); everything else = never send cold.
const MV_SEND = new Set(['ok']);
const MV_RISKY = new Set(['catch_all']);
const MV_FAIL = new Set(['unknown', 'invalid', 'disposable']);

const GOOD_TITLES = new Set(['HR/People', 'OfficeMgr', 'EmployeeExp', 'Workplace']);
// Size bands the data says are worth cold spend (mid-market). Tunable from the
// belief model — pass opts.goodBands to override.
const DEFAULT_GOOD_BANDS = new Set(['201-500', '501-1000', '1001-5000', '5001-10000']);

const DEFAULTS = {
  minListSize: 50,          // a real cold batch, not a dribble
  maxListSize: 1500,        // one week's responsible volume ceiling
  maxPerDomain: 3,          // never blast many people at one company
  minDeliverableRate: 0.85, // of the cleaned list, ≥85% must be MV-ok
  maxRiskyRate: 0.20,       // ≤20% catch-all in what ships
  minGoodTitleRate: 0.60,   // ≥60% must be a converting title category
  maxPerSenderPerDay: 40,   // deliverability ceiling per sending mailbox/day
  goodBands: DEFAULT_GOOD_BANDS,
};

const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);

/**
 * @param {Array} leads
 * @param {Object} ctx  { suppressed:Set, clientDomains:Set, contacted:Set, personalLane:Set, senderCount:number }
 * @param {Object} [options]
 */
export function evaluateColdList(leads, ctx, options = {}) {
  const opts = { ...DEFAULTS, ...options, goodBands: options.goodBands || DEFAULTS.goodBands };
  const suppressed = ctx.suppressed || new Set();
  const clientDomains = ctx.clientDomains || new Set();
  const contacted = ctx.contacted || new Set();
  const personalLane = ctx.personalLane || new Set();
  const senderCount = Math.max(1, ctx.senderCount || 1);

  const reasons = [];
  const dropped = [];
  const parked = [];          // catch_all — never send, held for a future catch-all tool
  const drop = (lead, why) => { dropped.push({ email: lead.email, why }); };

  // ---- 1. CLEAN — hard exclusions first (these can never be cold-emailed) ----
  const perDomain = new Map();
  const cleanLeads = [];
  for (const raw of leads) {
    const email = lc(raw.email);
    const dom = lc(raw.email_domain) || (email?.includes('@') ? email.split('@')[1]?.replace(/^www\./, '') : null);
    if (!email) { drop(raw, 'no_email'); continue; }
    if (suppressed.has(email)) { drop(raw, 'suppressed'); continue; }
    if (personalLane.has(email)) { drop(raw, 'in_personal_lane'); continue; }   // the wall: never cold a personal-track lead
    if (contacted.has(email)) { drop(raw, 'already_contacted'); continue; }
    if (dom && clientDomains.has(dom)) { drop(raw, 'existing_client_domain'); continue; }
    if (raw.mv_status && MV_FAIL.has(raw.mv_status)) { drop(raw, `undeliverable_${raw.mv_status}`); continue; }
    if (MV_RISKY.has(raw.mv_status)) { parked.push({ ...raw, email, email_domain: dom }); continue; } // catch_all → park, never send
    // per-domain cap (anti-blast)
    const n = perDomain.get(dom) || 0;
    if (dom && n >= opts.maxPerDomain) { drop(raw, 'per_domain_cap'); continue; }
    perDomain.set(dom, n + 1);
    cleanLeads.push({ ...raw, email, email_domain: dom });
  }

  // ---- stats on what survived cleaning ----
  const total = cleanLeads.length;
  const okCount = cleanLeads.filter((l) => MV_SEND.has(l.mv_status)).length;
  const riskyCount = parked.length;   // catch_all are parked, not shipped
  const unverified = cleanLeads.filter((l) => !l.mv_status).length;
  const goodTitleCount = cleanLeads.filter((l) => GOOD_TITLES.has(l.title_cat)).length;
  const goodBandCount = cleanLeads.filter((l) => opts.goodBands.has(l.size_band)).length;
  const deliverableRate = total ? okCount / total : 0;
  const goodTitleRate = total ? goodTitleCount / total : 0;
  const perDayPerSender = Math.ceil(total / senderCount / 5); // spread Mon–Fri

  const stats = {
    input: leads.length, dropped: dropped.length, clean: total,
    mv_ok: okCount, mv_catch_all_parked: riskyCount, mv_unverified: unverified,
    deliverable_rate: +deliverableRate.toFixed(3),
    good_title_rate: +goodTitleRate.toFixed(3), good_band: goodBandCount,
    per_sender_per_day: perDayPerSender, sender_count: senderCount,
  };

  // ---- 2. JUDGE — default HOLD; every failed check names itself ----
  if (total < opts.minListSize) reasons.push(`too_small: ${total} clean leads < min ${opts.minListSize}`);
  if (total > opts.maxListSize) reasons.push(`too_large: ${total} > max ${opts.maxListSize} (split across weeks)`);
  if (unverified > 0) reasons.push(`unverified: ${unverified} leads have no MillionVerifier status — verify before launch`);
  if (deliverableRate < opts.minDeliverableRate) reasons.push(`low_deliverability: ${(deliverableRate * 100).toFixed(0)}% MV-ok < ${(opts.minDeliverableRate * 100).toFixed(0)}% floor (verify a bigger pool to skim more ok)`);
  if (goodTitleRate < opts.minGoodTitleRate) reasons.push(`weak_icp: only ${(goodTitleRate * 100).toFixed(0)}% converting titles < ${(opts.minGoodTitleRate * 100).toFixed(0)}% floor`);
  if (perDayPerSender > opts.maxPerSenderPerDay) reasons.push(`oversend: ${perDayPerSender}/sender/day > ${opts.maxPerSenderPerDay} cap (add senders or shrink list)`);

  const verdict = reasons.length === 0 ? 'pass' : 'hold';
  // score = blunt health signal 0–100 (deliverability × icp × volume-ok)
  const volumeOk = total >= opts.minListSize && total <= opts.maxListSize ? 1 : 0;
  const score = Math.round(100 * deliverableRate * (0.5 + 0.5 * goodTitleRate) * volumeOk);

  return { verdict, score, reasons, stats, cleanLeads, parked, dropped };
}

export const COLD_EVAL_DEFAULTS = DEFAULTS;
