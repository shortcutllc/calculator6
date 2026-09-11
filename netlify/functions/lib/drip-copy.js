/**
 * drip-copy.js — the fall nurture copy, as templates the drip runner renders.
 *
 * This is the SAME copy that sits in the "Fall Email Campaign 2026" doc and in
 * scripts/lib/nurture-sequence.mjs (the Smartlead path). Kept here as the
 * plain-text source of truth for self-hosted sending.
 *
 * SPINTAX RULE, same as the Smartlead sequence: spin the connective tissue,
 * never the approved copy. These lines send verbatim in every variant because
 * Will approved that exact wording:
 *   - "Shortcut looks different, and does more. New site, new services."
 *   - the five-new-Mind-&-Body-classes line
 *   - the Venture House / World Mental Health Day line
 * Anything spun is greeting, the summer line, transitions and the ask, none of
 * which carry a claim.
 *
 * {{sign_off}} is replaced with the sending rep's name before render, so one
 * template serves Marc, Caren and Jaimie.
 *
 * Bodies are plain text. The runner escapes them, converts newlines, reifies
 * [label](url) markdown into anchors, and appends the compliance footer.
 */

const SITE = 'https://www.getshortcut.co/';
const CAMPAIGN = 'https://www.getshortcut.co/mental-health-day';

export const STEPS = {
  1: {
    subject: "{Shortcut's got a new look|Shortcut has a new look|New look at Shortcut}",
    body: `{Hi|Hey|Hi there} {{first_name}},

{Hope the summer was good to you|Hope you had a good summer|Hope the summer treated you well|Hope you got a decent break over the summer} {and the {{company_name}} team|and everyone at {{company_name}}|and the team at {{company_name}}}. {It has been a while since we were in|It has been a minute since we were last in|We have not been in for a while now}, {and I wanted to catch you before the fall calendar fills up|and I wanted to reach you before fall gets away from us|so I wanted to check in before the fall books up}.

Shortcut looks different, and does more. New site, new services. [See for yourself](${SITE}) ✨

Five new Mind & Body classes joined the menu, including sound baths, yoga and dance cardio. They run in the office, on Zoom, or both, and it is one price however many people come.

One more thing. This October, for World Mental Health Day, we have partnered with Venture House, a New York nonprofit backing mental health recovery for nearly 40 years. 10% of every booking goes straight to them. [See the campaign](${CAMPAIGN}) 💚

{Want to find a date for the team this fall?|Want to get something on the calendar for the fall?|Worth finding a date for the team this fall?}

{Thanks!|Thanks}

{{sign_off}}`,
  },

  2: {
    subject: '',
    body: `{Hi|Hey} {{first_name}},

{Bumping this in case it got buried|Popping this back up in case it slipped by|Following up in case this one got lost|Nudging this back to the top of your inbox}.

{The October piece is the part with a date on it|October is the bit with a date attached|The October window is the time-sensitive part}, so I wanted to make sure it reached you.

{Want me to send over a couple of options?|Want me to put a couple of dates on hold?|Want me to pull together a couple of options?}

{Thanks!|Thanks}

{{sign_off}}`,
  },

  3: {
    subject: '',
    body: `{Hi|Hey} {{first_name}},

{Last one from me on this|This is my last note on this|I will leave this one here after today}.

{If the timing is wrong, no problem at all|If it is not the right time, that is completely fine|If this is not the year for it, no problem}. Just say the word and I will leave you be. {If you would rather pick it up later in the year, I am happy to circle back then|If the new year suits better, just tell me when|If it is worth revisiting after the holidays, say so and I will}.

{Thanks!|Thanks}

{{sign_off}}`,
  },
};

/** The three lines that must survive every render untouched. Asserted in tests. */
export const LOCKED_LINES = [
  'Shortcut looks different, and does more. New site, new services.',
  'Five new Mind & Body classes joined the menu, including sound baths, yoga and dance cardio.',
  'we have partnered with Venture House, a New York nonprofit backing mental health recovery for nearly 40 years',
];
