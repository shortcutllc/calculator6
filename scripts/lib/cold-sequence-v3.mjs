/**
 * cold-sequence-v3.mjs — the APPROVED v3 cold sequence (Will signed off 2026-06-26).
 *
 * On the v3 messaging spine: leads with people-actually-use + zero-lift, names
 * concrete services + a client in E1, differentiates on one-vendor-whole-team
 * (in office + remote, incl. virtual) in E3, demotes grooming/headshots, never
 * says "turnkey". Spintax throughout for deliverability. Passes copy-evaluator.
 *
 * Normalized shape ({steps:[{step,delayDays,subjects,body}]}) — the cold engine
 * passes this to smartlead-launch, which maps it to the Smartlead sequence shape.
 * %sender-firstname% is Smartlead's multi-sender rotation token.
 */
export const COLD_SEQUENCE_V3 = {
  label: 'v3 direct cold (spine v3, spintax)',
  steps: [
    {
      step: 1, delayDays: 0,
      subjects: ['{Quick question|A quick idea} for {{company_name}}', 'wellness your team will actually use'],
      body: `{Hi|Hey|Hello} {{first_name}},
{Most companies already pay for wellness their team never uses|A lot of wellness perks quietly go unused}. {We are the part they actually show up for|We are the one they actually book}. Over 90% of our appointment slots get booked. {On-site massage, nails, and facials|Massage, manicures, and facials on-site} brought right to your team, {plus virtual options for your remote staff|with virtual sessions for remote folks}. {We run the whole thing|We handle it all}, so all you do is {approve a date|pick a date}.
{Worth a quick look at how it could fit {{company_name}}?|Open to seeing how it might work for your team?}
{Warmly,|Thanks,}
%sender-firstname%`,
    },
    {
      step: 2, delayDays: 3,
      subjects: ['re: {wellness at {{company_name}}|your team}'],
      body: `{Hi|Hey} {{first_name}}, {hope your week is going well|hope you are having a great week}. {Following up on the note below|Floating this back to the top}. {Wondering if we could connect?|Would love to find a time to chat?}
{Thanks,|Best,}
%sender-firstname%`,
    },
    {
      step: 3, delayDays: 4,
      subjects: ['{your whole team, wherever they are|one vendor, no juggling}'],
      body: `{Hi|Hey} {{first_name}},
{Here is what makes us different|One thing that sets us apart}. {Most wellness vendors do one thing, or hand you a directory of contractors|Most options cover a single service, or just point you to a network}. We are one team and one invoice, covering your whole team {in the office and remote|wherever they work}. {Massage, nails, and facials on-site|On-site massage, nails, and facials}, plus {virtual mindfulness, sound baths, and nutrition coaching|virtual mindfulness and nutrition coaching} for your distributed staff. {BCG and DraftKings use us at every one of their US offices|BCG and DraftKings run us across all their US offices}, and 87% of companies rebook. {We handle every detail|We run the whole thing}, so you just pick a date.
{Here is a short overview if useful|Happy to send a quick overview}: getshortcut.co/overview
{Warmly,|Thanks,}
%sender-firstname%`,
    },
    {
      step: 4, delayDays: 5,
      subjects: ['{closing the loop|should I close this out?}'],
      body: `{Hi|Hey} {{first_name}}, {I will keep this short|I do not want to crowd your inbox}. {If on-site or virtual wellness is not a priority right now, no problem at all|If the timing is not right, I completely understand}. {Just reply and I will close the loop|A quick note back and I will step away}. {If it is better down the road, we would love to help|Happy to circle back whenever it fits}.
{Warmly,|Thanks,}
%sender-firstname%`,
    },
  ],
};
