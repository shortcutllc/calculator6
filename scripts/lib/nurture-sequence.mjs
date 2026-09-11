/**
 * nurture-sequence.mjs — the 3-step fall nurture, per rep.
 *
 * Step 1 is the approved fall re-engagement email (see the "Fall Email Campaign
 * 2026" doc).
 *
 * SPINTAX RULE: spin the connective tissue, never the approved copy. These three
 * lines send verbatim in every variant, because Will approved that exact wording:
 *   - "Shortcut looks different, and does more. New site, new services."
 *   - the five-new-Mind-&-Body-classes line
 *   - the Venture House / World Mental Health Day line
 * Everything spun is greeting, the summer line, transitions and the ask, which
 * carry no claims and no positioning.
 *
 * Variance matters here because ~700 near-identical emails leave one personal
 * mailbox. Step 1 has 6 spin points giving 3x4x3x4x4x2 = 1,152 combinations, so
 * no two recipients at the same company see the same text.
 */

const SITE = 'https://www.getshortcut.co/';
const CAMPAIGN = 'https://www.getshortcut.co/mental-health-day';

/** Paragraph array -> the minimal HTML Smartlead sends. No template, no images. */
export function htmlBody(paragraphs) {
  return paragraphs.map((p) => `<p>${p}</p>`).join('');
}

/** Count spintax combinations in a body, so variance is measurable not assumed. */
export function spinCombinations(body) {
  return (body.match(/\{[^{}]*\|[^{}]*\}/g) || [])
    .reduce((n, block) => n * block.slice(1, -1).split('|').length, 1);
}

const GREET = '{Hi|Hey}';
const THANKS = '{Thanks!|Thanks}';

/**
 * Step 1. `opener` picks how personal the first line can be:
 *   'generic'  — safe with any warm list, needs no custom fields
 *   'detailed' — needs {{last_service}} and {{month}} on every lead
 */
export function step1({ signOff, opener = 'generic' }) {
  // One block, four COMPLETE sentences. Two independent blocks produced
  // "Hope you got a decent break over the summer and the Acme team." — spintax
  // must never span a grammatical dependency.
  const summer = '{Hope the summer was good to you and the {{company_name}} team|Hope you had a good summer and everyone at {{company_name}} did too|Hope the summer treated you and the {{company_name}} team well|Hope you and the {{company_name}} team got a decent break over the summer}';
  const team = '';
  const gap = opener === 'detailed'
    ? '{We were last in for {{last_service}} back in {{month}}|Our last visit was {{last_service}} in {{month}}|We came in for {{last_service}} back in {{month}}|It has been since {{month}} that we were in for {{last_service}}}'
    : '{It has been a while since we were in|It has been a minute since we were last in|We have not been in for a while now|It has been longer than I realised since our last visit}';
  const why = '{and I wanted to catch you before the fall calendar fills up|and I wanted to reach you before fall gets away from us|so I wanted to check in before the fall books up|and I figured I would catch you before the fall calendar goes}';
  const ask = '{Want to find a date for the team this fall?|Want to get something on the calendar for the fall?|Worth finding a date for the team this fall?|Shall we find a date for the team this fall?}';

  return {
    seq_number: 1,
    seq_delay_details: { delay_in_days: 0 },
    subject: "{Shortcut's got a new look|Shortcut has a new look|New look at Shortcut}",
    email_body: htmlBody([
      `${GREET} {{first_name}},`,
      `${summer}. ${gap}, ${why}.`,
      `Shortcut looks different, and does more. New site, new services. <a href="${SITE}">See for yourself</a> ✨`,
      'Five new Mind &amp; Body classes joined the menu, including sound baths, yoga and dance cardio. They run in the office, on Zoom, or both, and it is one price however many people come.',
      `One more thing. This October, for World Mental Health Day, we have partnered with Venture House, a New York nonprofit backing mental health recovery for nearly 40 years. 10% of every booking goes straight to them. <a href="${CAMPAIGN}">See the campaign</a> \u{1F49A}`,
      ask,
      THANKS,
      signOff,
    ]),
  };
}

/** Step 2. Threaded, so no subject. */
export function step2({ signOff }) {
  return {
    seq_number: 2,
    seq_delay_details: { delay_in_days: 3 },
    subject: '',
    email_body: htmlBody([
      `${GREET} {{first_name}},`,
      '{Bumping this in case it got buried|Popping this back up in case it slipped by|Following up in case this one got lost|Nudging this back to the top of your inbox}.',
      '{The October piece is the part with a date on it|October is the bit with a date attached|The October window is the time-sensitive part}, so I wanted to make sure it reached you.',
      '{Want me to send over a couple of options?|Want me to put a couple of dates on hold?|Want me to pull together a couple of options?}',
      THANKS,
      signOff,
    ]),
  };
}

/** Step 3. Last touch, with an easy out. Threaded. */
export function step3({ signOff }) {
  return {
    seq_number: 3,
    seq_delay_details: { delay_in_days: 5 },
    subject: '',
    email_body: htmlBody([
      `${GREET} {{first_name}},`,
      '{Last one from me on this|This is my last note on this|I will leave this one here after today}.',
      "{If the timing is wrong, no problem at all|If it is not the right time, that is completely fine|If this is not the year for it, no problem}. Just say the word and I will leave you be. {If you would rather pick it up later in the year, I am happy to circle back then|If the new year suits better, just tell me when|If it is worth revisiting after the holidays, say so and I will}.",
      THANKS,
      signOff,
    ]),
  };
}

export function buildNurtureSequence({ signOff, opener = 'generic' }) {
  return [step1({ signOff, opener }), step2({ signOff }), step3({ signOff })];
}
