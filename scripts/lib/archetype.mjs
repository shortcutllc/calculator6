/**
 * archetype.mjs — the two-cluster ARCHETYPE classifier (pure, DI, testable).
 *
 * Will's data-grounded ICP (memory/client_roster_target_profile): the Apollo
 * industry label is a lossy proxy. The real prime targets are two clusters that
 * fragment across many industry strings:
 *   high_growth_tech    — venture/digital, tech-ENABLED (DraftKings="computer
 *                         games", Betterment="financial services" fintech,
 *                         Teads="marketing" adtech, WIX="IT services").
 *   elite_prof_services — law, consulting, finance, accounting (Wachtell, BCG).
 * Everything else = other.
 *
 * Signal, not just the label: industry sets the cluster, then the TECH FOOTPRINT
 * (Apollo technology_names count) + keywords + funding/founded disambiguate the
 * ambiguous verticals (financial/marketing can be either) and score the fit.
 * Degrades gracefully when ext_signals are absent (industry + size only).
 *
 * @param {{industry?:string, employees?:string|number, signals?:object}} input
 * @returns {{archetype:string, archetype_score:number, reasons:string[]}}
 */

// Industries whose BUSINESS is digital/tech → high_growth_tech outright.
const TECH_VERTICALS = new Set([
  'computer software', 'information technology & services', 'internet', 'computer games',
  'computer & network security', 'computer hardware', 'computer networking', 'semiconductors',
  'consumer electronics', 'information services', 'e-learning', 'wireless', 'nanotechnology',
  'telecommunications', 'online media', 'computer & network security',
]);
// Core professional services → elite_prof_services outright.
const PROF_SERVICES = new Set([
  'law practice', 'legal services', 'management consulting', 'accounting',
  'professional training & coaching', 'investment banking',
]);
// Ambiguous-FINANCE: fintech (tech cluster) OR bank/PE (elite cluster). Without
// a tech signal, default to elite (finance IS a prime professional-services cell).
const AMBIG_FINANCE = new Set([
  'financial services', 'capital markets', 'investment management', 'banking',
  'venture capital & private equity',
]);
// Ambiguous-MEDIA: adtech (tech cluster) OR a traditional agency/shop (NOT a
// prime cluster). Without a tech signal, default to other — a regular agency is
// not elite professional services.
const AMBIG_MEDIA = new Set(['marketing & advertising', 'media production']);

const TECH_KEYWORDS = /\b(software|platform|saas|api|cloud|app|apps|digital|fintech|adtech|analytics|data|\bai\b|machine learning|developer|engineering|mobile|web3|crypto|blockchain|startup|technology)\b/i;
const TECH_COUNT_HIGH = 40;   // Apollo technology_names count signalling a digitally-sophisticated org

const empNum = (e) => parseInt(String(e == null ? '' : e).replace(/[^\d]/g, ''), 10) || 0;

export function classifyArchetype(input = {}) {
  const sig = input.signals || {};
  const ind = String(input.industry || sig.industry || '').toLowerCase().trim();
  const techCount = sig.technology_count ?? null;
  const kw = (sig.keywords || []).join(' ');
  const founded = sig.founded_year || null;
  const funded = !!(sig.total_funding || (sig.latest_funding_stage && !sig.is_public));
  const techKw = TECH_KEYWORDS.test(kw);
  const highTech = techCount != null && techCount >= TECH_COUNT_HIGH;
  const reasons = [];
  let archetype = 'other';
  let score = 0;
  // needs_signal = the classifier is GUESSING and a tech-footprint signal would
  // change/confirm the answer. The system should go enrich exactly these (an
  // ambiguous vertical with no signal, or no industry at all), not default
  // silently and not blanket-enrich everything. Curiosity, scoped.
  let needsSignal = false;
  const hasSig = techCount != null || (sig.keywords && sig.keywords.length);

  if (TECH_VERTICALS.has(ind)) { archetype = 'high_growth_tech'; score = 70; reasons.push(`tech vertical: ${ind}`); }
  else if (PROF_SERVICES.has(ind)) { archetype = 'elite_prof_services'; score = 70; reasons.push(`professional services: ${ind}`); }
  else if (AMBIG_FINANCE.has(ind) || AMBIG_MEDIA.has(ind)) {
    if (highTech || techKw) { archetype = 'high_growth_tech'; score = 55; reasons.push(`${ind} + tech footprint (${techCount ?? '?'} tech${techKw ? ', tech keywords' : ''}) → tech-enabled`); }
    else if (AMBIG_FINANCE.has(ind)) { archetype = 'elite_prof_services'; score = 50; needsSignal = !hasSig; reasons.push(`${ind}, ${hasSig ? 'low tech footprint' : 'NO tech signal yet (guess)'} → finance`); }
    else { archetype = 'other'; needsSignal = !hasSig; reasons.push(`${ind}, ${hasSig ? 'no tech footprint' : 'NO tech signal yet (guess)'} → traditional agency/media`); }
  } else if (!ind) {
    needsSignal = true; reasons.push('no industry signal — enrich to classify');
  } else {
    reasons.push(`"${ind}" not in a prime cluster`);
  }

  // Refine the fit score with the growth/tech signals.
  if (archetype === 'high_growth_tech') {
    if (highTech) { score += 15; reasons.push(`high tech footprint (${techCount})`); }
    else if (techKw) { score += 8; }
    if (funded) { score += 8; reasons.push(`funding signal (${sig.latest_funding_stage || 'funded'})`); }
    if (founded && founded >= 2005) { score += 5; reasons.push(`founded ${founded}`); }
  } else if (archetype === 'elite_prof_services') {
    const emp = empNum(input.employees ?? sig.employees);
    if (emp >= 1000) { score += 15; reasons.push(`large firm (${emp} emp)`); }
    else if (emp >= 200) { score += 8; reasons.push(`mid firm (${emp} emp)`); }
    if (highTech) { score += 5; reasons.push(`digitally sophisticated (${techCount} tech)`); }
  }

  return { archetype, archetype_score: Math.min(100, score), confidence: needsSignal ? 'low' : 'high', needs_signal: needsSignal, reasons };
}

export const ARCHETYPES = ['high_growth_tech', 'elite_prof_services', 'other'];
