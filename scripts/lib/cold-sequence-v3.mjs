/**
 * cold-sequence-v3.mjs — the APPROVED v3 cold sequence (rebuilt 2026-06-26 to
 * the PROVEN Shortcut cold-email craft, not invented).
 *
 * On the v3 spine (problem-first, actually-used, one-vendor-whole-team in office
 * + remote incl. virtual, real proof_points only). Craft from the historical
 * winners (sf/feb/march/june sequences + draft-outreach reference patterns):
 *   - Subject = short "Quick question" hook (the proven first-touch winner);
 *     follow-ups are THREADED (empty subject).
 *   - Open: greeting, blank line, hook. Shortcut named inside the value sentence
 *     (never a "Will from Shortcut" intro line). Sender identity = the inbox's
 *     own Smartlead signature appended after %sender-firstname%.
 *   - Soft, low-pressure CTA (chat / send details). NO links in cold (spam +
 *     deliverability). Spintax throughout.
 *   - FORMAT: one short paragraph per block, blank lines between (htmlBody maps
 *     each \n to a <div> and blank lines to <div><br></div>).
 *
 * NOTE: the 10 sending inboxes must each have a Smartlead signature set (name,
 * title, Shortcut, contact) — that is the sender's introduction.
 */
export const COLD_SEQUENCE_V3 = {
  label: 'v3 direct cold (spine v3 + proven craft, spintax)',
  steps: [
    {
      step: 1, delayDays: 0,
      subjects: ['Quick question', 'quick question for you, {{first_name}}'],
      body: `{Hi|Hey|Hello} {{first_name}},

{Most companies already pay for wellness their team never uses|A lot of wellness perks quietly go unused}.

At Shortcut, we are the part people actually show up for. Over 90% of our appointment slots get booked.

We bring {on-site massage, nails, and facials|massage, manicures, and facials} right to your team, {plus virtual sessions for remote staff|with virtual options for your remote folks}, and we run the whole thing so all you do is {approve a date|pick a date}.

{Worth a quick chat about how it could fit {{company_name}}?|Open to me sharing a few details for your team?}

{Warmly,|Thanks,}
%sender-firstname%`,
    },
    {
      step: 2, delayDays: 3,
      subjects: [''],
      body: `{Hi|Hey} {{first_name}}, {hope your day is treating you well|hope you are having a good week}.

Following up on the note below. {Wondering if we could connect?|Worth a quick chat?}

{Thanks,|Best,}
%sender-firstname%`,
    },
    {
      step: 3, delayDays: 4,
      subjects: [''],
      body: `{Hi|Hey} {{first_name}},

{Here is what makes us different|One thing that sets us apart}. Most wellness vendors do one thing, or hand you a directory of contractors.

We are one team and one invoice, covering your whole team {in the office and remote|wherever they work}.

{On-site massage, nails, and facials|Massage, nails, and facials on-site}, plus virtual mindfulness and nutrition coaching for your distributed staff.

BCG and DraftKings use us at every one of their US offices, and 87% of companies rebook.

{Happy to share a few details if useful|Open to sending a quick overview whenever works}. {Just reply and I will send them over|Worth a short call?}

{Warmly,|Thanks,}
%sender-firstname%`,
    },
    {
      step: 4, delayDays: 5,
      subjects: [''],
      body: `{Hi|Hey} {{first_name}}, {I will keep this short|I do not want to crowd your inbox}.

{If on-site or virtual wellness is not a priority right now, no problem at all|If the timing is not right, I completely understand}.

{Just reply and I will close the loop|A quick note back and I will step away}. {If it is better down the road, we would love to help|Happy to circle back whenever it fits}.

{Warmly,|Thanks,}
%sender-firstname%`,
    },
  ],
};
