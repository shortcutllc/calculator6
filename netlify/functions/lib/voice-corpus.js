/**
 * voice-corpus.js — Will's actual voice, CURATED. Not a dump of his sent mail.
 *
 * WHY CURATED, AND WHY THIS IS THE WHOLE POINT (2026-07-16):
 * The plan said "feed the model 10-20 of Will's real emails." Then we pulled his real
 * emails and found the trap: MOST OF WILL'S SENT MAIL IS TEMPLATES. That is not a
 * criticism — it is how you run outreach at volume — but it means "train on Will's real
 * emails" would teach the model the exact robot we are trying to escape.
 *
 * Measured, not asserted:
 *  - The "Massage lounge @ Workhuman Live" follow-ups are a merge template. The notes to
 *    Sarah Gray and Patrick Fulcher are WORD-FOR-WORD identical except the first name.
 *    They also carry em dashes and stock pleasantries ("hope all is well"), both of which
 *    Will's own brand guide bans and our guards reject. EXCLUDED ENTIRELY.
 *  - The "Great meeting you at Workhuman" follow-ups share ONE skeleton across all eight
 *    ("It was great meeting you at X and learning about your work at Y" -> "I'd love to
 *    set up a quick call" -> "your first event is 10% off" -> "Does a time this week or
 *    next work?"). The skeleton is a template. But the SECOND PARAGRAPH of each is
 *    genuinely Will writing to a genuine person, and that is the most valuable voice
 *    signal we have. So: we keep the ones whose personal paragraph is alive, and we do
 *    NOT keep the near-duplicate skeletons.
 *
 * Selection rule (apply it when adding to this file): does this email contain at least
 * one sentence that could ONLY have been written by Will, to THIS person? If it is the
 * skeleton with the name swapped, it is not a voice exemplar, it is the disease.
 *
 * ⚠️ EVIDENCE TIER. That exemplars beat style instructions went UNANSWERED across three
 * research passes — there is no verified evidence that few-shot voice conditioning
 * recovers per-input diversity from an RLHF'd model, or how many exemplars is enough, or
 * how to select them. We do this anyway because every builder who ships good LLM writing
 * conditions on real examples and it is cheap. It is a BET. See
 * memory/llm_writing_loop_architecture.md.
 *
 * TO EDIT: add/remove entries here and re-run scripts/draft-founder-note-v2.mjs. No deploy
 * needed to iterate. Keep `why` honest — it is the note to the next person who touches this.
 */

/**
 * Each entry: { text, why, tags }
 * tags: 'warm' (existing relationship) | 'inbound' (they came to us) | 'proposal'
 *       | 'conference' (met in person) | 'peer' | 'short'
 */
export const VOICE_EXEMPLARS = [
  {
    tags: ['inbound', 'warm'],
    why: 'Direct, no throat-clearing, offers real times. "We\'d love to deliver an awesome hair event" — plain and enthusiastic without being salesy.',
    text: `Hi Jill,

Thanks for reaching out! We'd love to deliver an awesome hair event for the team. We specialize in delivering high-quality experiences and working with diverse groups of clients across all hair types and backgrounds.

We'd like to set up a quick call to walk through the details and answer any questions. Does a time tomorrow after 11 AM, or Monday or Tuesday work for you?

Looking forward to hearing from you,
Will`,
  },
  {
    // Re-tagged warm 2026-07-20: carries "please don't hesitate to reach out", a stock
    // pleasantry the cold guards reject. Great warm exemplar, wrong teacher for a cold open.
    lane: 'warm',
    tags: ['short', 'warm'],
    why: 'The shortest thing he sends. Proof that a Will email can be three lines and still land. Note the rhythm: thanks, a warm line, an open door, out.',
    text: `Thanks, Jaimie! It's a pleasure to connect, Christian and we're excited to help with anything you need.

Please don't hesitate to reach out with any questions.

Talk soon,
Will`,
  },
  {
    tags: ['proposal', 'warm'],
    why: 'How he handles a proposal. "I\'ve also included a smaller option if you\'d prefer to start there" — he lowers the stakes unprompted, which is the same instinct as an easy out.',
    text: `Hi Bridget,

Great to hear from you! Please see our proposal linked here, which outlines timing and pricing for 50 hair appointments. The event would run a little over six hours, with a recommended one-hour break in the middle.

I've also included a smaller option if you'd prefer to start there—we can always add more slots if the event fills quickly.

Looking forward to your thoughts!

Thanks!
Will`,
  },
  {
    tags: ['proposal', 'inbound'],
    why: '"We had so much fun working with the Boston team" — he leads with the relationship, not the sale. Handles a colleague being out without making it the client\'s problem.',
    text: `Hi Bridget,

Thanks so much for reaching out! We had so much fun working with the Boston team on their recent nail event.

Jaimie (copied here), who worked with Kasey, is out the rest of this week, so I wanted to kick things off by sharing a couple of options for your request. Below are two proposals:

Option 1: 20-minute chair massage + nails

Option 2: 15-minute chair massage + nails

For nails, we recommend 30-minute appointments. If you scroll down in each proposal, you'll also see different package options for each service. We run a similar-sized event for BCG NYC every year as well.

Let us know if you have any immediate questions. Happy to set up a call next week, and we look forward to partnering with you!

Talk soon!
Will`,
  },
  {
    tags: ['peer', 'warm'],
    why: 'The long one. Structured without being corporate. Crucially: "I misspoke earlier—here\'s the actual BCG schedule" — he corrects himself in writing, in front of a prospect. A machine never does that.',
    text: `Olivia and Noel,

It was a pleasure speaking with you both yesterday and thank you again for your time. I'm excited about the opportunities we discussed and how Shortcut can become a valuable wellness partner for Related and its tenants.

Here are a few simple and effective launch points for our partnership:

• Providing our services at one of Related's scheduled wellness days
• Hosting a Shortcut-sponsored meet-and-greet for Hudson Yards tenants, featuring refreshments and a mix of massage, corporate headshots with hair + makeup, and beauty services
• Offering exclusive discounts and materials for Related tenants looking for in-office wellness solutions

I know you were interested in visiting one of our upcoming BCG events. I misspoke earlier—here's the actual BCG schedule, which is not until June:

• June 6th | Headshots
• August 1st | Massages
• October 3rd | Headshots

Since these dates are a bit farther out, I'd also love to invite you to a manicure event at Betterment next week on Tuesday, March 11th, from 11 AM - 3 PM at 450 W 33rd St. (just across the street). This isn't one of Related's properties, so let me know if that would be of interest.

Let me know your thoughts, and thanks again for the great conversation! Looking forward to next steps.

Best,
Will`,
  },
  {
    tags: ['conference', 'peer'],
    why: 'THE BEST ONE IN THE CORPUS. "even if the details got a little scrambled when I saw you later on, lol" — self-deprecating, unpolished, and no LLM would ever write it. This is the target.',
    text: `Hey Ashley!

So glad we got to connect at Workhuman last week, especially since you're right there outside of Orlando. Hope you enjoyed your massage as well!

The conversation at the booth stayed with me, even if the details got a little scrambled when I saw you later on, lol. I'd love to pick back up and talk through what bringing Shortcut to Westcor Land Title could look like.

Does a time this week or next work for a quick call?

Talk soon!
Will`,
  },
  {
    tags: ['conference', 'peer'],
    why: '"Thanks for all the helpful sales tips too!" — he thanks a prospect for helping HIM. And "the lead gen from booking an appointment is huge!" is him getting genuinely excited mid-sentence.',
    text: `Hey Aubrey,

It was great meeting you and Max at Workhuman last week and hearing about your work at BambooHR. Thanks for all the helpful sales tips too!

The idea of bringing our wellness services to both your office and your conference booths is something we'd really love to explore. That dual-use case in the conference setting is something we've seen work time and time again. It not only attracts the crowd, but the lead gen from booking an appointment is huge!

I'd love to set up a quick call to talk through what partnering with Shortcut could look like.

Does a time this week or next work for a quick call?

Talk soon!
Will`,
  },
  {
    tags: ['conference'],
    why: '"we make the whole thing a cinch for you" — a Will word, not a marketing word. And "As I hope Workhuman proved to you" earns the claim from their own experience instead of asserting it.',
    text: `Hello Kaya!

So glad we got to meet at Workhuman last week and hear about your work running international conferences at AACSB.

The October conference in Orlando sounds like the perfect opportunity for us to work together. As I hope Workhuman proved to you, bringing wellness services into a conference setting is something we've done really well, and we make the whole thing a cinch for you.

Would love to set up a quick call to talk through what bringing Shortcut to that event could look like.

Does a time this week or next work for a quick call?

Talk soon,
Will`,
  },
  {
    tags: ['conference'],
    why: '"A 24-person team in Lincoln is exactly the size where thoughtful wellness makes the biggest difference" — a specific, non-transferable observation. He also engages her actual question instead of steering past it.',
    text: `Hey Larcy,

It was great meeting you at Workhuman last week and learning about your work at Schulz Logistics. Hope you enjoyed your massage as well!

A 24-person team in Lincoln is exactly the size where thoughtful wellness makes the biggest difference. The insurance question you raised about United and Medica group wellness funds is a good one, and I'd be curious to walk through what options we've seen work at similar-sized companies.

I'd love to set up a quick call to talk through what bringing Shortcut to Schulz Logistics could look like.

Does a time this week or next work for a quick call?

Talk soon,
Will`,
  },

  // ==========================================================================
  // WARM LANE — supplied by Will 2026-07-20, hand-written, not scraped.
  // These are the reply/proposal/post-call register. They are lane:'warm' ON PURPOSE:
  // several contain "I hope you're having a great week", "please don't hesitate to reach
  // out", and exclamation points mid-body, all of which the COLD guards reject. Excellent
  // for the graduation + reply drafters; poison for a cold first touch.
  // ==========================================================================
  {
    lane: 'warm', tags: ['post-call', 'warm'],
    why: 'Post-discovery-call recap. The move to learn: he names what HE heard ("your plans for Employee Appreciation Week") before proposing anything, then commits to a specific next step with a deadline.',
    text: `Hi Sarah,

It was wonderful speaking with you today! I really enjoyed learning more about your plans for Employee Appreciation Week and the experience you're hoping to create for your team.

Based on our conversation, I think onsite chair massage and mini facials would be a great fit for your goals. I'll put together a proposal outlining a few options and send it over by tomorrow afternoon.

In the meantime, please don't hesitate to reach out if any additional questions come up. We would love the opportunity to partner with you and help create a memorable experience for your employees.

Looking forward to staying in touch!
Thank you,
Will`,
  },
  {
    lane: 'warm', tags: ['proposal', 'warm'],
    why: 'Proposal send. Note the flexibility offer ("happy to tailor the services, timing, and format") — he hands control back rather than pushing.',
    text: `Hi Sarah,

Thank you again for taking the time to speak with me this week. It was great learning more about your team and your vision for the event.

I've attached a proposal for your review that outlines several options based on our discussion. We're happy to tailor the services, timing, and format to best align with your goals and budget.

Please let me know if you have any questions or if you'd like to schedule a time to walk through the proposal together. We'd be happy to make any adjustments needed.

I look forward to hearing your thoughts!
Thank you,
Will`,
  },
  {
    lane: 'warm', tags: ['nudge', 'warm'],
    why: 'The polite nudge. Gives an explicit face-saving reason ("I know things can get busy") instead of implying they ignored him. NOTE: "I hope you\'re having a great week!" is exactly the stock pleasantry the cold guards ban — which is why this is warm-only.',
    text: `Hi Sarah,

I hope you're having a great week!

I wanted to check in and see if you've had a chance to review the proposal I sent over. I know things can get busy, so I just wanted to make sure it didn't get buried in your inbox.

Please let me know if any questions have come up or if there is any additional information I can provide. We'd love the opportunity to work with you and support your team.

Looking forward to hearing from you.
Thank you,
Will`,
  },
  {
    lane: 'warm', tags: ['loss', 'warm', 'short'],
    why: 'The loss reply, and the best-written thing in the set. No pressure, no guilt, no last-ditch pitch — he grants the reason ("budgets and priorities can shift"), wishes them well, and leaves the door open. This is the register the graduation drafter should steal.',
    text: `Hi Sarah,

Thank you for letting me know, and I truly appreciate the opportunity to connect with you and learn more about your team.

While I'm disappointed we won't be able to partner on this event, I completely understand that budgets and priorities can shift throughout the year.

I hope the event is a great success, and I'd love to stay in touch for any future wellness initiatives or employee appreciation programs that may arise down the road.

Thank you again for considering Shortcut.
Warmly,
Will`,
  },
  {
    lane: 'warm', tags: ['operational', 'short'],
    why: 'Event confirmation. Pure logistics done well: the facts in a scannable block, what Shortcut will do, then one open question. No selling once the deal is won.',
    text: `Hi Sarah,

We're excited to partner with you for your upcoming wellness event!

Here are the details we have confirmed:
Date: October 15
Time: 10:00 AM to 3:00 PM
Service: Chair Massage
Providers: 4
Location: Boston Office

Our team will arrive approximately 30 minutes prior to the event to set up and ensure everything is ready to go.

If there are any last-minute updates, parking instructions, or building access details you'd like to share, please let me know.

We're looking forward to a great event!
Thank you,
Will`,
  },
  {
    lane: 'warm', tags: ['re-engagement', 'warm'],
    why: 'Re-engaging a past client. Leads with a genuine open question about THEIR plans, then offers the menu as options rather than a pitch. Closest of the warm set to a cold opener, but still assumes prior relationship.',
    text: `Hi Sarah,

I hope you've been doing well!

I wanted to reach out and see if your team is planning any wellness, appreciation, or engagement initiatives in the coming months.

We've recently been helping clients with chair massage events, mindfulness workshops, headshot days, fitness classes, and seasonal wellness activations, and I'd be happy to brainstorm ideas if you're looking for something new.

If you'd like to connect, feel free to grab a time on my calendar.

I hope to hear from you soon!
Will`,
  },
  {
    lane: 'warm', tags: ['discovery', 'warm', 'short'],
    why: 'Asking for the discovery call. The reason for the call is THEIR benefit ("so I can put together the most accurate recommendation and quote"), not his pipeline.',
    text: `Hi Sarah,

I'd love to learn a bit more about what you're envisioning so I can put together the most accurate recommendation and quote possible.

Would you be available for a quick call sometime next week? Here's a link to my calendar to make scheduling easy.

I'm looking forward to learning more about your goals and exploring how we can support your team.

Thanks!
Will`,
  },
];

/**
 * DELIBERATELY EXCLUDED — kept as a record so nobody re-adds them.
 * (a) The Christian introduction email: signed "Will" but the body says "I would like to
 *     introduce you to Will Newton, who is the founder of Shortcut" — it is JAIMIE's
 *     email. Feeding it teaches Jaimie's voice.
 * (b) The Noel "thank you for visiting" email: signed "Jaimie". Same reason.
 * (c) The Nicole cold email ("Are you looking for a new approach to employee wellness in
 *     2024?... Shortcut helps companies like DraftKings and BCG TRANSFORM their
 *     workplaces"): it IS Will's, and it is the closest genre to what we generate — but
 *     "transform" is a banned word in his own brand guide, and it is the most templated,
 *     most salesy thing in the set. Including it would teach the register we are trying to
 *     kill. Will's call to re-add.
 * (d) ALL "Massage lounge @ Workhuman Live" notes: a merge template (Sarah and Patrick are
 *     identical but for the name), plus em dashes and stock pleasantries. Zero voice value.
 * (e) The near-duplicate "Great meeting you" skeletons (Jessica, Jamie, Lisa/Helene): same
 *     skeleton as the four kept above but with a flat personal paragraph. Redundant — they
 *     would just reinforce the template.
 * NOTE on the kept conference notes: their trailing "grab a time from my calendar" +
 * 10%-off + signature block are STRIPPED above. The founder lane bans a calendar link in a
 * first touch, and we want the VOICE, not the CTA machinery.
 */

/** Pick exemplars for a lane. Conference/peer notes are the most human, so they lead. */
/**
 * LANE SPLIT (Will, 2026-07-20) — the cold lane must NOT be taught the warm register.
 *
 * Will supplied seven hand-written notes: a post-call follow-up, a proposal send, a nudge,
 * a loss reply, an event confirmation, a re-engagement, and a discovery-call ask. They are
 * genuinely his and genuinely good AT WHAT THEY ARE — but every one is a WARM-lane email to
 * someone who already knows him, and several carry constructions the COLD guards actively
 * reject: "I hope you're having a great week!", "please don't hesitate to reach out",
 * "We'd love the opportunity to", and exclamation points outside the sign-off.
 *
 * Feeding those to the cold generator would teach it patterns the terminal gate then kills:
 * candidates die on the guard, and the loop gets WORSE, not better. So each exemplar
 * declares a lane:
 *   'cold' — safe to condition a first-touch cold note on
 *   'warm' — reply//proposal/post-call register; for the graduation + reply drafters
 *   'both' — plain enough for either (most of the short, declarative ones)
 * Default is 'both' so an untagged legacy entry keeps its existing behaviour.
 *
 * The warm set is NOT dead weight: the graduation reply drafter (a positive cold reply ->
 * on-spine draft) is a WARM surface and is currently off-brain. These are exactly right for
 * it. See memory/graduation_reply_system.md.
 */
export function voiceExemplars({ audience = 'tech-execs', lane = 'cold', max = 6 } = {}) {
  const pool = VOICE_EXEMPLARS.filter((e) => {
    const l = e.lane || 'both';
    return l === 'both' || l === lane;
  });
  const want = audience === 'brokers' ? ['peer', 'warm', 'conference'] : ['conference', 'peer', 'short', 'warm'];
  const scored = pool.map((e) => ({
    e, score: e.tags.reduce((s, t) => s + (want.includes(t) ? want.length - want.indexOf(t) : 0), 0),
  })).sort((a, b) => b.score - a.score);
  return scored.slice(0, max).map((s) => s.e.text);
}
