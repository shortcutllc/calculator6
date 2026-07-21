# The daily networking practice — SCOPE (drafted 2026-07-20, not yet built)

Will's ask, in his words: "a consistent daily task of networking to do for new and existing
leads that I've started outreach with... human, perfect first touches on email, LinkedIn and
elsewhere... use these hunts to find out about the lead, what groups they may be a part of on
LinkedIn for instance, which could snowball other networking ideas... Do I have a direct
connection with them or second degree? And more."

This is Objective 1 (daily relationship work) properly specified. It replaces "queue 10-15
cold E1 drafts" as the shape of Will's day.

## What is wrong with today's version

The current lane does one thing: pick new leads, draft a cold E1, auto-send two follow-ups.
Three gaps, all of which Will named:

1. **Existing leads have no next move.** Once a sequence completes, a contact falls off the
   board forever. There is no "you emailed Riley twelve days ago, here is the human thing to
   do now." The system only knows how to start, never how to continue.
2. **No hunt.** The research is a thin per-lead lookup that feeds one email and is then thrown
   away. Nothing accumulates. The second email knows nothing the first one didn't.
3. **One channel.** Email only. No LinkedIn, no comment, no intro path, no event, no reason to
   exist in someone's world other than an inbox.

## The daily unit

Not "10 drafts." **A ranked worklist of PEOPLE, each with one recommended move.**

Every morning Dave posts N people (start at 5, tune later). Each entry:

- **Who** and why they're on today's list (new, or a live thread needing a move).
- **The move** — one of the plays in playbook.md. Most are no-ask.
- **Why now** — the trigger, with a receipt. No receipt, no entry. This is the hard rule.
- **What I know** — the dossier, accumulated across days, not re-derived each time.
- **The draft** — only when the move is a written touch. Will sends by hand, always.
- **Reply odds, honestly.** Including "low, but worth it because X."

Skips are output too. "I looked at 40, here are 5, and here's why the other 35 aren't worth
your morning" is the product, not a failure to produce.

## New vs existing: two different questions

- **New:** is there a real reason this person should hear from Will *today*? Usually no. The
  scout's job is to find the few where the answer is yes.
- **Existing:** what is the next human move for someone already in motion? This is the bigger
  miss and probably the higher EV. Categories:
  - Sent E1-E3, no reply, went quiet → a genuinely new angle, or a give-first touch, or park
    them with a date to resurface. Not another "just following up."
  - Replied warm → the thread is live; Dave's job is prep and timing, not new copy.
  - Met once, went cold → the dormant-tie play.
  - Someone we know at their company changed jobs → a real reason to reconnect.

## The hunt (what a dossier holds)

Reachable today, no LinkedIn needed:
- **Will's own mailbox.** 306k threads. Has Will ever talked to this person or anyone at their
  company? Who introduced them? What was said? **This is the single most valuable and least
  used asset we have** and it is the dormant-ties play the research calls highest-EV.
- Our DB: every send, reply, draft, proposal, event, and firm record we hold.
- The open web: company news, funding, office moves and leases, published content, podcast
  appearances, conference talks, their firm's own newsletters and webinars.
- Their firm's public content (EPIC's "The Well" newsletter is a live example).

**Not reachable today (needs a decision):**
- Connection degree (1st / 2nd / shared).
- LinkedIn groups, communities, who they follow, recent posts.
- Mutual connections and therefore intro paths.

Note that connection degree and mutuals are the highest-value missing fields — a warm intro
path beats every cold angle we can write. See the LinkedIn question below.

## The snowball

Will's instinct here is right and it's the part that compounds. A find about one person should
create work for the network, not just one email:

- Person is in a group / community → who else in our list is in it? Is it worth Will joining?
- Person spoke on a podcast → who hosts it, who else was on, is that a pitch for Will?
- Person's firm runs a newsletter or webinar → a give-first touch, and a channel to be in.
- Person shares a mutual with Will → an intro path, which outranks any cold note.
- Person's company just leased space → their peers are doing the same thing.

Each of these belongs in influence-map.md, not just in one draft. **The hunt feeds the map,
the map feeds the plan.**

## Channels

Email is the spine (it's measurable and Will already has the rails). LinkedIn is where the
research lives and where a comment or a connect costs nothing. "Elsewhere" means the things
that don't scale and therefore work: a podcast, a conference, an intro, a piece of useful
intel sent with no ask.

Hard rule stays: **Dave drafts, Will sends.** On every channel. Nothing automated on LinkedIn,
both because of the hard rule and because automating LinkedIn risks Will's Sales Nav account.

## Measurement

North star is **acceptance rate**, not volume: of the moves Dave suggests, what share does
Will act on. Captured as accepted / accepted-with-edits / skipped-and-why. The skip reasons
are the training data — they are the error analysis. Ladder underneath it: moves made →
replies → conversations → the Goal 1 meetings.

## Answers from Will (2026-07-20)

1. **LinkedIn:** (c) daily + (a) in batches, as recommended. Will checks connection degree by
   hand on the day's shortlist; Sales Nav exports when volume is needed. **No automation that
   touches LinkedIn.** Open want: Will asked Dave to research how sophisticated operators use
   *ethical* automation around Sales Navigator — a research task, not a build, and the answer
   must respect the ToS line.
2. **Time budget: 60 minutes a day.** Size the daily worklist to fit sixty minutes of Will's
   attention, not to fill a quota. Five people with real moves beats fifteen thin ones.
3. **Mailbox mine goes FIRST.** Confirmed.

## Open questions (original)

1. **LinkedIn access.** Three options: (a) Will runs Sales Nav searches and pastes/exports the
   results, Dave does everything downstream — zero account risk, recommended; (b) a browser
   MCP drives Will's logged-in Chrome — most capable, violates LinkedIn ToS, real risk to a
   Sales Nav account he depends on; (c) Will checks degree by hand on the daily shortlist
   only, which is 5 lookups a day, not 200. **Recommendation: (c) daily, (a) in batches.**
2. **How many people a day**, and how much time is Will actually willing to give it? The
   founder-lane doc says 30-60 min. Is that still true?
3. **Does the mailbox mine happen first?** Dave thinks yes: before hunting new leads, mine
   306k threads for dormant ties. It needs no LinkedIn, no new data, and no permission beyond
   what Dave already has. It is the cheapest high-EV thing on this page.

## Build order (proposed)

1. Mailbox dormant-tie mine (one-time sweep → a ranked list of people Will already knows).
   **START WITH `outreach_sends`, not raw Gmail** — the sent-mail crawl already holds one row
   per Gmail message Will ever sent (who, when, thread). Query that for the candidate list in
   seconds; touch the 306k raw threads only for the shortlist's content.

   > **VERIFIED 2026-07-20 (Dave) — outreach_sends CANNOT be the candidate source for this
   > job.** `gmail-sent-crawl` is an INCREMENTAL crawl with a watermark (`listSentSince`), and
   > its oldest row is **2026-03-03**. Filtered to will@ it holds 437 rows / 160 people, every
   > one active within the last year → a 3y+ dormant query against it returns exactly ZERO.
   > Dormant ties are 3+ years old BY DEFINITION, so they are not in the table at all.
   > **The correct split:** `outreach_sends` is the **exclusion list** (who is already active —
   > answer it in seconds, exactly as the annotation intends), and Gmail's sent folder is the
   > only possible **candidate source**. Probe: Q1-2022 alone = 366 sent messages; a 120-message
   > sample yielded 99 distinct recipients, 97 external, on domains like White & Case, Liberty
   > Mutual, Alvarez & Marsal, Kearney, OC&C, Altman Solon, Compass Lexecon, Kyndryl — heavily
   > ICP. Use `format=metadata&metadataHeaders=To&metadataHeaders=Date` (cheap, no bodies),
   > chunk by quarter (~22 quarters 2018-2023, ~6 min each, fits the 15-min job ceiling).

   Mining rules from the
   research (cold_networking_research.md): pick by VALUE (status, relevance) not comfort —
   people instinctively pick who they like, which is the wrong list; ~3+ years silent is the
   sweet spot; the play is weaker for brokers (relationship-dense industry) than tech. And
   respect the runtime: scheduled jobs have a 15-min timeout + daily budget caps, so the mine
   is a CHUNKED multi-day job, never one heroic run.
2. Existing-lead next-move layer. **CORRECTION (Dave 2026-07-20): this is NOT missing — the
   earlier claim above that it is was wrong.** `netlify/functions/lib/next-actions.js` (394
   lines: `rulesActions` + `nextActions`, gated verbs, graduation-aware) and
   `lib/lead-picture.js` (409 lines) are SHIPPED and live. P1 is done. What is missing is only
   the WIRING: it serves Pro Slack + the CRM card, not Will's personal founder lane or Dave's
   daily brief. This is an inherit-and-wire job, and P2 (the daily digest) is the exact phase
   Dave's morning brief should BE, not a parallel build.
   **A prior scope for exactly this already exists — READ IT FIRST, inherit don't rebuild:**
   `next_actions_layer_scope.md` in the memory dir (the "agentify the RECOMMEND layer, not
   the SEND layer" plan: turn the lead-picture into ranked, human-approved next-best-actions).
   Also read `sales_companion_architecture.md` (the shared lead-picture lib this should sit on).
3. Dossier store, so research accumulates instead of being thrown away.
4. Daily worklist + Slack brief format, with accept/edit/skip capture.
5. Snowball → influence-map.md wiring.
6. LinkedIn enrichment, in whatever form Will picks in Q1 above.

Related: [[goals]] · [[playbook]] · [[lessons]] · [[influence-map]]
