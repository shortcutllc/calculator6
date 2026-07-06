/**
 * cold-sequence-v3.mjs — APPROVED v3 cold sequence (updated 2026-06-27).
 *
 * Two E1 openers for a SEGMENT-LEVEL A/B (generic problem-aware list vs RTO-
 * triggered list); pick with cold-engine --opener generic|rto. Within each, the
 * two subjects are the in-campaign A/B lever. E2-E4 are shared.
 *
 * E1 rules (enforced by copy-evaluator): massage-LED hero, signal breadth
 * (a non-massage service + "all from one team"), real proof (90%+ booked), zero-
 * lift, names Shortcut, and NO remote/virtual (virtual is a later-touch
 * objection-handler, never the acquisition lead). Spa/conference-room framing,
 * never "at desks". Spintax throughout; short paragraphs with blank-line breaks.
 * Sender identity = each inbox's Smartlead signature after %sender-firstname%.
 */

const E1_GENERIC = {
  step: 1, delayDays: 0,
  subjects: ['the part they actually use', 'wellness without the coordination', 'the perk people actually book'],
  // WILL-APPROVED Jun-26, RESTORED Jul-6 (locked — see feedback_no_ungated_copy:
  // "approved copy is locked"; the Jun-30 rewrite shipped without re-approval and
  // Will rejected it on review: comma-spliced opener, problem domain never named).
  body: `{Hi|Hey} {{first_name}},

{Most companies already pay for wellness their team never uses|Most wellness perks quietly go unused}.

At Shortcut, we are the part they actually show up for. We turn a conference room into a spa for the day, with {massage, nails, facials, and more|chair massage, nails, facials, and more}, all from one team, and {over 90% of slots booked|90%+ of slots booked}.

{You pick a date. We run the rest|We run everything, so all you do is pick a date}.

{Worth a quick chat about {{company_name}}?|Open to sharing a few details for your team?}

{Warmly,|Thanks,}
%sender-firstname%`,
};

const E1_RTO = {
  step: 1, delayDays: 0,
  subjects: ['making the office worth the commute', 'a reason they are glad they came in'],
  body: `{Hi|Hey} {{first_name}},

{You asked the team back to the office. Now you need a reason they are glad they came|Bringing everyone back in is one thing. Giving them a reason to want to be there is another}.

At Shortcut, we turn a conference room into a spa for the day, with {massage, nails, facials, and more|chair massage, nails, facials, and more}, all from one team, and {over 90% of slots booked|90%+ of slots booked}.

{You pick a date. We run the rest|We run everything, so all you do is pick a date}.

{Worth a quick chat about {{company_name}}?|Open to sharing a few details for your team?}

{Warmly,|Thanks,}
%sender-firstname%`,
};

const E2 = {
  step: 2, delayDays: 3,
  subjects: [''],
  body: `{Hi|Hey} {{first_name}}, {hope your day is treating you well|hope you are having a good week}.

Following up on the note below. {Wondering if we could connect?|Worth a quick chat?}

{Thanks,|Best,}
%sender-firstname%`,
};

// E3 may reference remote/virtual — this is virtual's correct placement (a later
// touch objection-handler for distributed teams), NOT the acquisition lead.
const E3 = {
  step: 3, delayDays: 4,
  subjects: [''],
  body: `{Hi|Hey} {{first_name}},

Most wellness vendors do one thing, or hand you a directory of contractors. We are one team and one invoice, covering your whole team {in the office and remote|wherever they work}.

{On-site chair massage, nails, and facials|Chair massage, nails, and facials on-site}, plus virtual mindfulness and nutrition coaching for your distributed staff.

BCG and DraftKings use us at every one of their US offices, and 87% of companies rebook.

{Happy to share a few details if useful|Open to sending a quick overview whenever works}. {Just reply and I will send them over|Worth a short call?}

{Warmly,|Thanks,}
%sender-firstname%`,
};

const E4 = {
  step: 4, delayDays: 5,
  subjects: [''],
  body: `{Hi|Hey} {{first_name}}, {I will keep this short|I do not want to crowd your inbox}.

{If on-site or virtual wellness is not a priority right now, no problem at all|If the timing is not right, I completely understand}.

{Just reply and I will close the loop|A quick note back and I will step away}. {If it is better down the road, we would love to help|Happy to circle back whenever it fits}.

{Warmly,|Thanks,}
%sender-firstname%`,
};

// E3 LINK A/B (Will, 2026-07-02): with { e3Link: true }, E3 carries the sequence's
// ONE link — the per-lead personalized book-a-call page ({{landing_url}} custom
// field, minted via create-book-a-call-page). Two variants testing LENGTH/HOOK,
// both soft-CTA (never "grab a time" — this buyer is allergic to being sold to):
//   A short — brief page-note + one proof line (~58w)
//   B long  — full differentiation + proof + page line (~105w)
// Smartlead's API cannot store seq_variants (verified 2026-07-02: POST silently
// drops them; PATCH/sub-routes 404) — the engine writes variant A; variant B is
// pasted once into the Smartlead UI, which unlocks native per-variant stats.
const E3_LINK_SHORT = {
  step: 3, delayDays: 4, subjects: [''], variantLabel: 'A-short',
  body: `{Hi|Hey} {{first_name}},

{I put together|I made} <a href="{{landing_url}}">a short page for the {{company_name}} team</a>, with how a day works, the services (chair massage, nails, and facials on-site, plus virtual mindfulness), and a rough price.

Over 90% of slots get booked at these events, so it is the part of the wellness budget people actually use.

{No pressure, just so you can see the shape of it|Have a look whenever it is useful}.

{Warmly,|Thanks,}
%sender-firstname%`,
};

const E3_LINK_LONG = {
  step: 3, delayDays: 4, subjects: [''], variantLabel: 'B-long',
  body: `{Hi|Hey} {{first_name}},

Most wellness vendors do one thing, or hand you a directory of contractors. We are one team and one invoice, covering your whole team {in the office and remote|wherever they work}.

{On-site chair massage, nails, and facials|Chair massage, nails, and facials on-site}, plus virtual mindfulness and nutrition coaching for your distributed staff.

BCG and DraftKings use us at every one of their US offices, and 87% of companies rebook.

{I put together|I made} <a href="{{landing_url}}">a short page for the {{company_name}} team</a>, with how a day works, the services, and a rough price.

{No pressure, just so you can see the shape of it|Have a look whenever it is useful}.

{Warmly,|Thanks,}
%sender-firstname%`,
};

export function coldSequenceV3(opener = 'generic', { e3Link = false } = {}) {
  const e1 = opener === 'rto' ? E1_RTO : E1_GENERIC;
  // e3Link: step 3 = variant A (what the API can write) + abVariants for the
  // gates and for the one-time UI paste of variant B.
  const e3 = e3Link
    ? { ...E3_LINK_SHORT, abVariants: [E3_LINK_SHORT, E3_LINK_LONG] }
    : E3;
  return { label: `v3 direct cold (${opener} opener${e3Link ? ', E3 link A/B' : ''}, spintax)`, opener, steps: [e1, E2, e3, E4] };
}

// Default = generic opener (back-compat for importers).
export const COLD_SEQUENCE_V3 = coldSequenceV3('generic');
export const COLD_SEQUENCE_V3_RTO = coldSequenceV3('rto');
