/**
 * drip-copy.js — the fall nurture copy, as templates the drip runner renders.
 *
 * TWO TOUCH-1 VARIANTS, chosen per lead by what we can actually prove:
 *
 *   'booked'  — crm_companies.completed_events > 0, i.e. we ran a real event.
 *               Only this variant may claim history or name {{last_service}}.
 *               39 of Jaimie's 700 qualify.
 *   'spoke'   — everyone else. Same structure and same copy, but it claims
 *               nothing beyond a lapsed conversation.
 *
 * The split exists because the honest version is the majority case: a proposal
 * in `draft` means we quoted someone, not that we were ever on site, so
 * "since we were in for X" is false for 94% of the list.
 *
 * SPINTAX: subject line only (Will, 2026-09-11). The body is approved prose and
 * ships verbatim. Spintax defends against volume pattern-detection on cold
 * blasts from burner domains; this is 10-40/day from a real mailbox with a real
 * signature to people already emailed before. The realistic failure mode is not
 * detection, it is shipping a sentence nobody approved — which already happened
 * once ("Hope you got a decent break over the summer and the Exos team").
 *
 * Bodies are plain text. The runner escapes them, converts newlines, reifies
 * [label](url) markdown into anchors, appends the rep's real Gmail signature,
 * then the compliance footer.
 */

const SITE = 'https://www.getshortcut.co/';
const CAMPAIGN = 'https://www.getshortcut.co/mental-health-day';

/** Shared below the opener. Identical in both variants, so the approved copy exists once. */
const BODY_REST = `We've made a few changes at Shortcut since we last connected: new site, new services, and a lot more to offer. [Take a look](${SITE})

Along with the massage, nails, and facials your team already knows, we've added a full Mind & Body offering with classes that can run in the office, over Zoom, or a mix of both:

**Sound baths:** A guided sound session to slow things down and reset.
**Yoga:** An all-levels class to stretch, move, and refocus.
**Somatic movement:** Gentle movement designed to release tension and help everyone settle in.
**Strength & sculpt:** A quick, energizing full-body workout.
**Dance cardio:** An upbeat class to get everyone moving.

We're also doing something special for **World Mental Health Day this October:** 10% of every booking will be donated to Venture House, a New York nonprofit that has supported mental health recovery for nearly 40 years. [See the campaign](${CAMPAIGN})

I'd love to catch up and reconnect, and hear what you have coming up for the fall and holidays. Let me know if you have time in the coming weeks for a quick call.

Thank you!
{{sign_off}}`;

const SUBJECT = '{Checking in from Shortcut|A few updates from Shortcut|Shortcut has a new look|Catching up before fall}';

export const STEPS = {
  1: {
    subject: SUBJECT,
    // Verbatim as Will wrote it. Requires {{last_service}} on the lead.
    booked: `Hi {{first_name}},

Hope you had a great summer! I wanted to check in as we head into fall and the holiday season, especially since it's been a little while since we were in for {{last_service}}.

${BODY_REST.replace("since we last connected", "since we last worked together")}`,

    // No claim of a visit or of having worked together.
    spoke: `Hi {{first_name}},

Hope you had a great summer! I wanted to check in as we head into fall and the holiday season, especially since it's been a little while since we last spoke.

${BODY_REST}`,
  },

  2: {
    subject: '',
    body: `Hi {{first_name}},

Just bumping this in case it got buried.

The October piece is the part with a date on it, so I wanted to make sure it reached you.

Want me to put a couple of dates on hold?

Thank you!
{{sign_off}}`,
  },

  3: {
    subject: '',
    body: `Hi {{first_name}},

Last one from me on this.

If the timing is wrong, no problem at all. Just say the word and I'll leave you be. If you'd rather pick it up later in the year, I'm happy to circle back then.

Thank you!
{{sign_off}}`,
  },
};

/** Pick the touch-1 variant from what we can prove about the lead. */
export function step1For(lead) {
  const svc = (lead.custom_fields || {}).last_service;
  return (lead.booked_before || svc) && svc ? STEPS[1].booked : STEPS[1].spoke;
}

/** Lines that must survive every render byte-for-byte. Asserted in tests. */
export const LOCKED_LINES = [
  "we've added a full Mind & Body offering with classes that can run in the office, over Zoom, or a mix of both:",
  '10% of every booking will be donated to Venture House, a New York nonprofit that has supported mental health recovery for nearly 40 years.',
  "I'd love to catch up and reconnect, and hear what you have coming up for the fall and holidays.",
];
