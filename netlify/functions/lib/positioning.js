/**
 * positioning.js — THE single programmatic source of Shortcut's positioning.
 *
 * Mirrors memory/messaging_spine.md (v3, locked 2026-06-25 — Will reprioritized
 * the differentiators to what actually CLOSES). That memory file is the human
 * source of truth; this is its machine-readable twin. Every drafting surface
 * (draft-outreach.js, the cold sequence composer, the copy evaluator) imports
 * from HERE so positioning cannot drift between surfaces.
 *
 * When the spine changes, update BOTH this file and messaging_spine.md.
 */

// North star (internal, never a tagline).
export const POSITIONING_STATEMENT =
  'For HR and office managers tired of wellness perks employees ignore (and the hassle of running them), Shortcut is the one vendor for your whole team, in office and remote, that people actually use, fully managed start to finish. You approve a date and do nothing else.';

// Lead with the problem. Three voice directions; medium is the fight-for.
export const PROBLEM_FIRST = {
  safe: "Most wellness benefits go unused. Ours don't.",
  medium: "You're already paying for wellness your team doesn't use. We're the part they actually show up for.",
  brave: 'The average wellness budget buys a lot of things nobody opens. We bring the one they line up for.',
};

// The THREE lead pillars, IN PRIORITY (this is what closes — exactly three).
// Order matters: drafts should lead with #1, then #2, then #3.
export const PILLARS = [
  { key: 'actually_used', claim: 'People actually use it, and love it', proof: 'Opt-out and comes to them, so participation approaches everyone vs ~24% for typical wellness programs (Gallup). The part of the budget that does not sit unused.' },
  { key: 'zero_lift', claim: 'Zero lift for managers', proof: 'Fully managed start to finish: booking, vetted pros, equipment, the day itself. You approve a date and do nothing else. (This is the real "turnkey" benefit. Lead with it in plain words. Never write the word "turnkey".)' },
  { key: 'one_vendor_whole_team', claim: 'One vendor for your whole team, in office and remote', proof: 'In-person experiences (massage, nails, facials and more) plus flexible sessions (mindfulness, sound baths, nutrition coaching) that run in person, over Zoom, or hybrid, all from one team. Breadth from one team is the differentiator, not any single service.' },
];

// Supporting points — proof / objection handling, NOT headline pillars.
export const SUPPORTING = [
  { key: 'premium', point: 'Premium, done right: vetted, licensed, insured pros, run like clockwork.' },
  { key: 'costs_less', point: 'Costs less than what is wasted: roughly 7% of what is already in the wellness budget.' },
  // Added 2026-07-21 (Will): "the cherry on top is how easy we make everything with
  // our hospitality and tech approach". Deliberately NOT a fourth pillar — the spine
  // holds exactly three (a fourth claim breeds skepticism, Shu & Carlson). This is the
  // MECHANISM under pillar 2 (zero lift) and the reason pillar 1 (they love it) is
  // true by behaviour rather than asserted.
  { key: 'hospitality_and_tech', point: 'Hospitality is the discipline, technology is the machinery. Trained hosts who run the day the way a good hotel runs its lobby (the room is set before anyone arrives, someone is there to greet you, it never feels like queuing at a clinic), plus software that absorbs the sign-ups, scheduling, reminders and paperwork. This is WHY zero lift feels effortless rather than merely organised. It is the finish, never the headline.' },
];

// The one supporting point that IS injected into every draft prompt (see
// buildPositioningBlock). The other two remain reference-only for now.
export const FINISH = SUPPORTING.find((s) => s.key === 'hospitality_and_tech').point;

// Service menu — grouped by DELIVERY CONSTRAINT, not by "on-site vs virtual"
// (Will, 2026-07-07 — the old split wrongly implied mindfulness/sound-bath/
// nutrition are remote-only; they are not). Lead with "your whole team, wherever
// they are", NOT a service checklist. Grooming + headshots are menu breadth, never
// the headline.
export const SERVICE_MENU = {
  // PHYSICAL — must happen in person; cannot be delivered remotely.
  in_person_only: ['massage (chair and table)', 'nails', 'facials', 'hair and grooming', 'headshots'],
  // FLEXIBLE — we deliver these in person, over Zoom, OR hybrid (some in the room,
  // others remote). Available to ANY company, in-office included.
  flexible: ['mindfulness', 'sound baths', 'nutrition coaching'],
  note: 'The ONLY delivery rule: in_person_only services (massage, nails, facials, hair, headshots) require a physical location, so NEVER offer them to a fully remote company. flexible services (mindfulness, sound baths, nutrition coaching) work in person, over Zoom, or hybrid, so they are fair game for EVERYONE, including in-office teams (an in-office company can do mindfulness in the room, all on Zoom, or a mix). Only a FULLY REMOTE company is limited to the flexible set. Do not call the flexible services "virtual" as if that were their only mode.',
};

// What ONLY Shortcut can say, in CLOSE-priority order (Will, 2026-06-25).
export const DIFFERENTIATION = {
  whitespace: 'One vendor for your whole team, in office and remote, that people actually use, fully managed, with carrier-fund deployment. Breadth from one team (on-site plus virtual) is the differentiator; no single service is.',
  priority: [
    'People actually use it and love it (participation as the outcome). Rivals brag about access; nobody owns "people actually show up". THE lead.',
    'Zero lift for managers (fully managed, you approve a date and do nothing). The real turnkey benefit, said in plain words.',
    'One vendor, whole team, in office and remote (breadth from one team, including virtual for remote/hybrid). The structural differentiator.',
    'Carrier-fund deployment paired with premium delivery (channel lever, especially brokers).',
    'Calm, premium, human voice (tonal, not a closer).',
  ],
  vs_marketplaces: 'We do not book you a masseuse. We run your whole wellness program, on-site and remote.',
  vs_aggregators: 'We ARE the vendor, not the directory. One team owns the quality, not a network of strangers.',
  // grooming + headshots are uncontested but they do NOT close — menu breadth proof only.
  demoted_breadth: 'Grooming and headshots are uncontested (no rival offers them) but they do NOT close. Use only as a "we even do X" breadth proof, deep in the message. NEVER open with them or headline them.',
};

// REAL proof points (mirror memory/proof_points.md). These are the ONLY
// numbers/names allowed in copy. NEVER invent or estimate a stat (a fabricated
// "84% booked" was caught 2026-06-25; the real figure is 90%+).
export const PROOF = {
  booked: 'Over 90% of appointment slots get booked across all our events.', // Pillar 1 headline receipt
  rebook: '87% of companies rebook for a second event.',
  scale: 'Over 500 companies served across the US.',
  land_expand: 'BCG and DraftKings use Shortcut at every one of their US offices.',
  testimonial: '"Shortcut has become an extension of the DraftKings family." (DraftKings)',
  named: 'BCG, DraftKings.', // cleared marquee only — do NOT add PwC/TripAdvisor/etc. without clearance
};

// Broker-channel persona hooks (carrier-fund angle is the differentiator here).
export const BROKER_HOOKS = {
  wellness_consultant: 'makes you a hero to clients',
  producer_partner: 'wins and keeps clients on renewal',
  ae: 'a low-effort renewal value-add',
  carrier_hec: 'co-branded reporting for QBRs',
  carrier_funds: 'we can deploy carrier wellness funds (Cigna HIF, Aetna allowance, Anthem fund) to pay for it.',
};

// Banned as WORDS — everyone says them. CRITICAL: ban the word "turnkey"/
// "all-in-one", but the BENEFIT it points to ("fully managed, you approve a
// date and do nothing") is lead pillar #2 and MUST still lead. Ban the word,
// keep the benefit. The copy evaluator flags these words verbatim.
export const DEAD_DIFFERENTIATORS = [
  'all-in-one', 'one-stop', 'one stop shop', 'turnkey', 'nationwide network',
];

// Off-spine evergreen: "gift" framing is SEASONAL (holiday) ONLY.
export const SEASONAL_ONLY_PHRASES = ['a gift they', 'gift your team', 'perfect gift'];

/**
 * Build the positioning block injected into a drafting system prompt.
 * @param {Object} [o]
 * @param {'direct'|'broker'} [o.channel]  broker adds the carrier-fund angle
 * @param {boolean} [o.seasonal]           allow the "gift" framing (holiday only)
 * @param {boolean} [o.remote]             prospect is distributed → surface virtual
 */
export function buildPositioningBlock({ channel = 'direct', seasonal = false, remote = false } = {}) {
  const lines = [
    'POSITIONING (source of truth — memory/messaging_spine.md v3). Everything you write ladders to this:',
    `- North star (internal, do not quote): ${POSITIONING_STATEMENT}`,
    '- LEAD WITH THE PROBLEM, calm not fear-based. Reference line to adapt (do not paste verbatim):',
    `    "${PROBLEM_FIRST.medium}"`,
    '- THE THREE LEAD PILLARS, in this order (lead with #1, then #2, then #3 — this is what closes):',
    ...PILLARS.map((p, i) => `    ${i + 1}. ${p.claim}: ${p.proof}`),
    `- THE FINISH (texture only — never a headline, never a fourth pillar): ${FINISH}`,
    `- SUPPORTING points (objection-handlers and texture, NOT headline claims — use at most one, only when it earns its place): ${SUPPORTING.filter((s) => s.key !== 'hospitality_and_tech').map((s) => s.point).join(' ')}`,
    '- NEVER sell the technology. Do not write "our platform", "our technology", "our software" or "our app". The tech is invisible plumbing that removes work, not a product we sell. Selling it makes us sound like the directory/SaaS players we beat (see "one vendor, not a directory" below).',
    `- Differentiation (the white space): ${DIFFERENTIATION.whitespace}`,
    `- One vendor, not a directory: ${DIFFERENTIATION.vs_aggregators}`,
    `- Service breadth (menu, NOT the headline). ${SERVICE_MENU.note}`,
    `    IN-PERSON ONLY (physical, never for a fully remote company): ${SERVICE_MENU.in_person_only.join(', ')}.`,
    `    FLEXIBLE (in person, over Zoom, or hybrid — offer to anyone): ${SERVICE_MENU.flexible.join(', ')}.`,
    '- DELIVERY (get it right IF you mention it, but it is OPTIONAL color, never load-bearing): massage is chair or table in a conference room turned into a spa-like space, NEVER "at their desks". If you use the spa-like-room image, give it its OWN natural beat, do NOT wedge it into the middle of the service list. Keep the service list itself a clean, simple enumeration.',
    `- DEMOTED: ${DIFFERENTIATION.demoted_breadth}`,
    `- REAL proof (use these EXACT figures/names when proof helps): ${PROOF.booked} ${PROOF.rebook} ${PROOF.scale} ${PROOF.land_expand}`,
    `- NO FABRICATION: only the proof above and the names ${PROOF.named} may appear. NEVER invent or estimate a number, and do NOT name other clients (PwC, TripAdvisor, etc.) without clearance. If you lack a stat, omit it.`,
    '- CRAFT (make it felt — see messaging_craft): plain "barbecue" register, mirror their internal monologue, no corporate words. Lead with ONE emotion, prove with ONE real receipt above. De-risk and reassure, never pressure (FOMU > FOMO — overwhelmed buyers stall under urgency).',
    '- AVOID: fear-mongering about a burnout/mental-health crisis, hype/buzzwords, guilt-tripping, perks-theater/pizza-party energy, inflated ROI or health-savings claims, urgency/scarcity/FOMO.',
  ];
  if (remote) {
    lines.push('- This prospect is FULLY REMOTE / distributed: do NOT offer the in-person-only services (massage, nails, facials, hair, headshots) here. Lead with the FLEXIBLE services (mindfulness, sound baths, nutrition coaching) delivered over Zoom, so they hear "your whole team, wherever they are". Remote is a segment we serve, never a poor fit.');
  }
  if (channel === 'broker') {
    lines.push(`- Broker angle: ${BROKER_HOOKS.carrier_funds} Frame value as: ${BROKER_HOOKS.wellness_consultant}, ${BROKER_HOOKS.producer_partner}.`);
  }
  lines.push(
    `- BANNED WORDS (never write them): ${DEAD_DIFFERENTIATORS.join(', ')}. CRITICAL: still LEAD with the benefit behind "turnkey" in plain words ("fully managed, you approve a date and do nothing else"). Ban the word, keep the benefit.`,
  );
  if (!seasonal) {
    lines.push('- DO NOT use "gift" framing. That is holiday-seasonal only. This is year-round operational value.');
  }
  return lines.join('\n');
}
