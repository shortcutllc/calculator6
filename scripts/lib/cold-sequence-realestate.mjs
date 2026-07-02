/**
 * cold-sequence-realestate.mjs — the REAL-ESTATE cold sequence (segment=realestate).
 *
 * B2B2C amenity motion, NOT employer-buys-for-staff. The buyer (landlord /
 * property manager / operator) puts wellness inside a building to win and keep
 * tenants and justify the commute. Lead with THEIR value: filling the amenity
 * calendar, utilization to show at renewal, one vendor across the portfolio.
 * Massage appears but the LEAD is the amenity/tenant value, not the service.
 *
 * Two openers (cold-engine --opener building|portfolio):
 *   building  — single building / on-site experience manager. Empty-calendar +
 *               zero-lift + utilization. The fast pilot door.
 *   portfolio — owner/operator level. One vendor across every building, the
 *               "every US office" proof reframed for a property portfolio.
 *
 * See memory/vertical_real_estate_gtm.md. Position COMPLEMENTARY to tenant-
 * experience apps (HqO/Equiem), never competitive. Spintax throughout.
 */

// E1 — building level: fill the calendar, utilization, zero lift.
const E1_BUILDING = {
  step: 1, delayDays: 0,
  subjects: ['filling your amenity calendar, handled', 'one wellness vendor for the building'],
  body: `{Hi|Hey} {{first_name}},

{Keeping the amenity calendar full, with programming that actually attracts and keeps tenants, is its own job|A full amenity calendar that helps retain tenants is harder than it looks}.

Shortcut runs on-site wellness as a building amenity. {We turn a room into a spa for the day|We set up a spa-like space for the day}, with chair massage, nails, and facials, all from one team. Over 90% of slots get booked, so you have real utilization to show at renewal.

{You pick the dates. We handle the vendors, the setup, and the COI|You pick the dates, we handle the rest, including the COI}.

{Open to running one pilot day at {{company_name}}?|Worth setting up a pilot day?}

{Warmly,|Thanks,}
%sender-firstname%`,
};

// E1 — portfolio level: one vendor across every building.
const E1_PORTFOLIO = {
  step: 1, delayDays: 0,
  subjects: ['one wellness vendor across the portfolio', 'consistent amenities, every building'],
  body: `{Hi|Hey} {{first_name}},

{Amenities sell and keep tenants, but only the ones people actually use|Tenants renew for buildings that feel cared for, not for an unused amenity}.

Shortcut runs on-site wellness across a whole portfolio. {Chair massage, nails, and facials in a room turned spa|A spa-like setup with chair massage, nails, and facials}, all from one team, the same standard in every building. Over 90% of slots get booked, so the utilization is yours to show at renewal.

{One vendor, one invoice, every building|One team across the portfolio, not a different vendor per site}.

{Worth a quick chat about {{company_name}}?|Open to comparing notes?}

{Warmly,|Thanks,}
%sender-firstname%`,
};

const E2 = {
  step: 2, delayDays: 3,
  subjects: [''],
  body: `{Hi|Hey} {{first_name}}, {hope your week is treating you well|hope you are having a good week}.

Following up on the note below. {Wondering if we could connect?|Worth a quick chat?}

{Thanks,|Best,}
%sender-firstname%`,
};

// E3 — one vendor across the portfolio + virtual for hybrid tenants + proof.
const E3 = {
  step: 3, delayDays: 4,
  subjects: [''],
  body: `{Hi|Hey} {{first_name}},

{Here is what sets us apart for a building|One thing that makes this easy}. Most wellness comes from a different vendor each time, or an app that books it but does not run it.

We are one team and one invoice. {On-site massage, nails, and facials|Massage, nails, and facials on-site}, plus virtual sessions for hybrid tenants, {and we slot into your existing tenant app|and we work alongside your tenant communications}.

BCG and DraftKings use us at every one of their US offices, and 87% of clients rebook.

{Happy to show how a pilot day works|Open to sharing how one building runs}. {Just reply and I will send it over|Worth a short call?}

{Warmly,|Thanks,}
%sender-firstname%`,
};

const E4 = {
  step: 4, delayDays: 5,
  subjects: [''],
  body: `{Hi|Hey} {{first_name}}, {I will keep this short|I do not want to crowd your inbox}.

{If amenity programming is not a focus right now, no problem at all|If the timing is not right, I completely understand}.

{Happy to hold a pilot date whenever it helps|Glad to revisit whenever it fits}. {Just reply and I will step away|A quick note back and I will close the loop}.

{Warmly,|Thanks,}
%sender-firstname%`,
};

// E3 LINK A/B (Will, 2026-07-02) — same experiment as direct (see cold-sequence-v3):
// E3 carries the one link, the per-lead branded book-a-call page ({{landing_url}}).
// A short = page note + utilization proof; B long = full differentiation + page.
// Amenity-framed (utilization to show at renewal), soft CTA only.
const E3_LINK_SHORT = {
  step: 3, delayDays: 4, subjects: [''], variantLabel: 'A-short',
  body: `{Hi|Hey} {{first_name}},

{I put together a short page for the {{company_name}} team|I made a quick page for the {{company_name}} team}, with how a pilot day works in the building, the services, and a rough price: {{landing_url}}

Over 90% of slots get booked at these, so you have real utilization to show at renewal.

{No pressure, just so you can see the shape of it|Have a look whenever it is useful}.

{Warmly,|Thanks,}
%sender-firstname%`,
};

const E3_LINK_LONG = {
  step: 3, delayDays: 4, subjects: [''], variantLabel: 'B-long',
  body: `{Hi|Hey} {{first_name}},

Most building wellness comes from a different vendor each time, or an app that books it but does not run it. We are one team and one invoice. {On-site massage, nails, and facials|Massage, nails, and facials on-site}, plus virtual sessions for hybrid tenants, {and we slot into your existing tenant app|and we work alongside your tenant communications}.

BCG and DraftKings use us at every one of their US offices, and 87% of clients rebook.

{I put together a short page for the {{company_name}} team|I made a quick page for the {{company_name}} team}, with how a pilot day works, the services, and a rough price: {{landing_url}}

{No pressure, just so you can see the shape of it|Have a look whenever it is useful}.

{Warmly,|Thanks,}
%sender-firstname%`,
};

export function coldSequenceRealEstate(opener = 'building', { e3Link = false } = {}) {
  const e1 = opener === 'portfolio' ? E1_PORTFOLIO : E1_BUILDING;
  const e3 = e3Link
    ? { ...E3_LINK_SHORT, abVariants: [E3_LINK_SHORT, E3_LINK_LONG] }
    : E3;
  return { label: `real estate cold (${opener} opener${e3Link ? ', E3 link A/B' : ''}, spintax)`, segment: 'realestate', opener, steps: [e1, E2, e3, E4] };
}

export const COLD_SEQUENCE_RE_BUILDING = coldSequenceRealEstate('building');
export const COLD_SEQUENCE_RE_PORTFOLIO = coldSequenceRealEstate('portfolio');
