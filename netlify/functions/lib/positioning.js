/**
 * positioning.js — THE single programmatic source of Shortcut's positioning.
 *
 * Mirrors memory/messaging_spine.md (v2, locked 2026-06-25). That memory file is
 * the human source of truth; this is its machine-readable twin. Every drafting
 * surface (draft-outreach.js personal lane, the cold sequence composer, the copy
 * evaluator) imports from HERE so positioning cannot drift between surfaces.
 *
 * When the spine changes, update BOTH this file and messaging_spine.md.
 */

// North star (internal, never a tagline).
export const POSITIONING_STATEMENT =
  'For HR and office managers at mid-market and enterprise companies tired of wellness perks employees ignore (and the hassle of running them), Shortcut is the one vendor that delivers premium on-site wellness your team actually shows up for, and handles every logistic so you approve a date and do nothing else.';

// Lead with the problem. Three voice directions; medium is the fight-for.
export const PROBLEM_FIRST = {
  safe: "Most wellness benefits go unused. Ours don't.",
  medium: "You're already paying for wellness your team doesn't use. We're the part they actually show up for.",
  brave: 'The average wellness budget buys a lot of things nobody opens. We bring the one they line up for.',
};

// Exactly four pillars, each with proof. (Landing pages use only THREE — a 4th
// claim breeds skepticism — but outreach may draw on any.)
export const PILLARS = [
  { key: 'actually_used', claim: 'Actually used', proof: 'Opt-out and comes to the desk, so participation approaches everyone present vs ~24% for typical wellness programs (Gallup).' },
  { key: 'zero_work', claim: 'Zero work for you', proof: 'One vendor runs booking, vetted pros, equipment, and the day itself. You approve a date, we do the rest.' },
  { key: 'premium', claim: 'Premium, done right', proof: 'Vetted, licensed, insured pros. A spa-grade experience run like clockwork.' },
  { key: 'costs_less', claim: 'Costs less than what is wasted', proof: 'Roughly 7% of what is already in the wellness budget, and it does not sit on a shelf.' },
];

// What ONLY Shortcut can say (competitive scan). Use to differentiate, never the
// dead "all-in-one" frame.
export const DIFFERENTIATION = {
  whitespace: 'One vendor that actually DELIVERS a premium curated suite of in-person experiences (massage, grooming, headshots, nails, facials, mindfulness) into the office, with participation approaching everyone, and can deploy carrier wellness funds to pay for it.',
  uncontested: [
    'Grooming and headshots in a wellness program: no competitor offers these at all.',
    'Participation as the outcome: rivals brag about access, nobody owns "people actually show up".',
    'Carrier-fund deployment paired with premium in-person delivery: nobody pairs the two.',
    'A calm, premium, human voice in a field that shouts buzzwords.',
  ],
  vs_marketplaces: 'We do not book you a masseuse. We run a whole experience, plus five more services single-service marketplaces do not offer.',
  vs_aggregators: 'We ARE the vendor, not the directory. One team owns the quality, not a network of strangers.',
};

// Shared proof points.
export const PROOF = {
  rebook: '87% of clients rebook.',
  participation: 'On-site events reach near-100% of those present vs ~24% utilization for typical wellness benefits (Gallup).',
  cost: 'Median deal ~$1,452, about $46/employee, roughly 7% of existing wellness spend.',
  named: 'DraftKings, BCG, PwC, TripAdvisor, Schrodinger.',
};

// Broker-channel persona hooks (carrier-fund angle is the differentiator here).
export const BROKER_HOOKS = {
  wellness_consultant: 'makes you a hero to clients',
  producer_partner: 'wins and keeps clients on renewal',
  ae: 'a low-effort renewal value-add',
  carrier_hec: 'co-branded reporting for QBRs',
  carrier_funds: 'we can deploy carrier wellness funds (Cigna HIF, Aetna allowance, Anthem fund) to pay for it.',
};

// DEAD as differentiators — everyone says them. Allowed as a plain benefit
// (e.g. "you approve a date, we do the rest") but NEVER as the differentiation
// claim. The copy evaluator flags these used as the positioning frame.
export const DEAD_DIFFERENTIATORS = [
  'all-in-one', 'one-stop', 'one stop shop', 'turnkey', 'nationwide network',
  'on-site and remote', 'hybrid workforce',
];

// Off-spine evergreen: "gift" framing is SEASONAL (holiday) ONLY.
export const SEASONAL_ONLY_PHRASES = ['a gift they', 'gift your team', 'perfect gift'];

/**
 * Build the positioning block injected into a drafting system prompt.
 * @param {Object} [o]
 * @param {'direct'|'broker'} [o.channel]  broker adds the carrier-fund angle
 * @param {boolean} [o.seasonal]           allow the "gift" framing (holiday only)
 */
export function buildPositioningBlock({ channel = 'direct', seasonal = false } = {}) {
  const lines = [
    'POSITIONING (source of truth — memory/messaging_spine.md v2). Everything you write ladders to this:',
    `- North star (internal, do not quote): ${POSITIONING_STATEMENT}`,
    '- LEAD WITH THE PROBLEM, calm not fear-based. Reference line to adapt (do not paste verbatim):',
    `    "${PROBLEM_FIRST.medium}"`,
    '- Value pillars (claim + proof, pick what fits, do not list all four):',
    ...PILLARS.map((p) => `    ${p.claim}: ${p.proof}`),
    `- Differentiation (the white space): ${DIFFERENTIATION.whitespace}`,
    `- Strongest uncontested ground: ${DIFFERENTIATION.uncontested[0]} ${DIFFERENTIATION.uncontested[1]}`,
    `- Proof to deploy when relevant: ${PROOF.rebook} ${PROOF.named}`,
  ];
  if (channel === 'broker') {
    lines.push(`- Broker angle: ${BROKER_HOOKS.carrier_funds} Frame value as: ${BROKER_HOOKS.wellness_consultant}, ${BROKER_HOOKS.producer_partner}.`);
  }
  lines.push(
    `- DO NOT use as your differentiator (dead, everyone says them): ${DEAD_DIFFERENTIATORS.join(', ')}. "You approve a date, we do the rest" is fine as a benefit, never as the headline claim.`,
  );
  if (!seasonal) {
    lines.push('- DO NOT use "gift" framing. That is holiday-seasonal only. This is year-round operational value.');
  }
  return lines.join('\n');
}
