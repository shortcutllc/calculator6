# Dave's lessons — what actually works (append-only, consolidate monthly)

Format per lesson: date · lesson · evidence (what happened) · confidence.
Dave appends after weekly reflection. Consolidate carefully — never overwrite a still-relevant
older lesson. This file is HOW Dave improves; an empty lessons file after a month of running
means the learning loop is broken.

## Seed lessons (inherited from the pipeline era, 2026-07)

- 2026-07-14 · Will discards ~62% of drafted notes (27/75 sent). Send-rate is the leading
  metric; a draft he won't send is worth zero. · founder-lane-metrics.mjs · high
- 2026-07-20 · The recurring draft defect: opener states a fact then hard-cuts to the pitch.
  The bridge (fact → what it means for them → Shortcut's story) is the judgment that fixes
  it. · Will's direct feedback · high
- 2026-07-20 · Stripping mandated beats makes prose human but invites invented facts. Truth
  checks stay hard; voice stays loose. · direct A/B test · high
- 2026-07-20 · Notes over-use "90% booked" + "zero lift". Rotate the deep receipts (Wachtell
  119, DraftKings 514/6, Schrödinger 196/5, BCG 60/7, WIX 67). · batch review · high
- 2026-07-14 · Three broker notes drafted minutes apart shared a near-verbatim middle
  paragraph. Cross-lead sameness is the failure readers actually notice. · live batch · high

## Appended 2026-07-20 (first live working session with Will)

- 2026-07-20 · **`crm_companies.contact_domains` is noisy — never treat a domain→company
  mapping as truth.** Bucketing the warm pool, `seatgeek.com` resolved to a company named
  "DIOR". The client/prospect split it produces is a useful triage signal and nothing more;
  confirm the employer another way before any claim about who someone works for reaches a
  draft. · warm-pool bucketing run · high

- 2026-07-20 · **Apply your own findings to your own numbers.** Within one hour Dave (a) found
  that the reply pipeline was ingesting internal and personal mail as "positive replies", then
  (b) presented a 211-person warm pool built on that same `reply_sentiment='positive'` label
  without re-screening it, then (c) shortlisted two people for drafts whose "positive replies"
  were a Merck auto-acknowledgement and a flowery out-of-office. The contamination was only 7
  people of 327, so the pool survived — but both hand-picked names were in the bad 7, because
  ranking was by TITLE SENIORITY and nobody read the reply text. **Rule: when you discover a
  data-quality flaw, immediately re-run every number you have already reported through it.
  A finding you don't apply to your own work is a finding you haven't really made.** ·
  Caracausa/Harrington draft attempt · high

- 2026-07-20 · **Rank warm leads by what they SAID, not by their title.** The genuinely
  valuable rows are the ones whose own words carry the signal ("What would the cost be for
  something like this?" — Janon Cohall, Combe, Feb 2024, then silence). Seniority is a
  tiebreak, never the sort key. · genuine-warm-ranked run · high

- 2026-07-20 · **Verify employment before drafting, always, and treat a stale promotion as a
  standing fact rather than news.** Of 15 Apollo checks, 4 had genuinely moved on. Marisa
  Peters (CPO, VideoAmp) is now a keynote speaker and songwriter elsewhere since Mar 2025.
  Kimberly Caracausa's "promotion" dated to May 2024 — 26 months old, so congratulating her
  would have read as scraped. Crude string comparison also over-calls moves ("icwgroup" vs
  "ICW Group"); read the pair before believing the flag. · Apollo shortlist verification · high

## Appended 2026-07-21 (first Monday strategy pass)

- 2026-07-21 · **`workhuman_leads.email_sent_at` is null on leads that `outreach_sends` proves
  Will emailed.** 19 of his 22 Workhuman leads show a null flag; only **2** have genuinely zero
  send rows (Marissa Reyes, Kendyll/Pivotal). The "13 never touched since April" baseline in
  goals.md came from that field and is **wrong**. The real shape of the pool is not "untouched"
  but "touched once around May 5, silent for 11 weeks" — which changes the play from first-touch
  to re-open, on almost every one of them. Second time the never-trust-a-derived-flag rule has
  bitten; this time it had reached my own goals file. **Reconcile any status flag against
  `outreach_sends` before it becomes a baseline.** · workhuman/outreach_sends join · high

- 2026-07-21 · **Send-rate is bimodal by week, not by draft.** Drafts created Jul 7-13: 27 of 51
  sent (**53%**, well above the 36% baseline). Drafts created Jul 14-21: **1 of 23 (4%)**, and
  Will has sent no new outreach at all since Jul 17 (crawl is fresh through Jul 20, so this is
  real, not lag). The engine and the guards did not change between the two batches. The week he
  sent was the week he was live in the EPIC thread. Reading, and it is only a hypothesis worth
  one question: **sends follow Will's attention being already in the lane, not draft quality.**
  If true, the lever is a smaller daily worklist he can clear, not better copy. · cohort
  send-rate query · medium, needs Will's read

- 2026-07-21 · **We aim at consultants and the only replies came from principals.** Both broker
  replies on record (Craig Hasday, President of EPIC's National EB Practice; Marshall
  Feigenbaum, VP EB, Risk Strategies) are practice-leader level, and Craig's converted by being
  **forwarded down** to the person who actually books. Every one of the 7 unsent broker drafts
  targets an individual contributor (Health & Benefits Consultant, Population Health Consultant,
  Wellness Program Manager). n=2, so this is a lead not a law, but it points the same way as the
  existing expect-the-forward lesson: **seniority buys you a forward; a consultant has nobody to
  forward to.** · broker reply history vs Jul-14 draft batch · medium

- 2026-07-21 · **The broker queue does not check geography, and the carrier-fund pitch is
  US-only.** The 7:45 cron drafted Fidelia Andrean (WTW), whose `outreach_contacts.location`
  reads *"jakarta, special capital region of jakarta"*, a note asking whether her clients are
  deploying **Cigna or Aetna wellness funds**. Those are US carrier constructs and our in-person
  delivery is US. Every premise in the note was wrong for her, and `preflight_reco` still said
  `ok_to_proceed` — the gates check verification and banned words, not whether the pitch is
  physically possible. **Add a geography gate before drafting any carrier-fund note; `location`
  is already on the row, so this is free.** · Fidelia Andrean draft · high

- 2026-07-21 · **A firm's published article is not the contact's article.** The same draft
  opened *"You published on Indonesia's draft law..."* when `target_ref.research_note` said only
  *"WTW insight article June 2024"*. The generator promoted a firm-level publication to a
  personal one, which is the exact move that makes a note read as scraped, and the source was
  25 months old besides. **When the research note names an organisation, the draft may not say
  "you".** · same draft · high

- 2026-07-20 · **Reply detection is blind to a forward.** Will's one real broker win came from
  Craig Hasday (President, EPIC) forwarding the note internally to Kristin Sanders, who replied
  from her own address. The system watches the address it mailed, so it recorded Craig's
  sequence as "replied" while the actual reply, the person, and the booked meeting were
  invisible to every query. **Aim high at big firms and expect the forward.** · EPIC thread ·
  high

- 2026-07-21 · **Hyper-personal leads get a WARM register, not a tight one. Terseness is not
  warmth.** Dave's first Marissa Reyes draft was 95 words and jumped straight from the
  observation to the bridge. Will rejected it and dictated the human version: acknowledge the
  time gap ("it's been a few months, this is well overdue"), say you enjoyed meeting them, ask
  how the rest of their thing went, reference the specific shared moment (she booked a massage
  at our own booth four minutes after Will's note), THEN the ask, THEN an easy out. **For
  someone Will physically met, the note should read like a person picking up a conversation,
  not an operator executing a follow-up.** This is Sivers' "don't be too succinct" from
  [[cold_networking_research]] — compression reads as automated. Cold notes stay tight; warm
  notes breathe. · Will's direct rewrite · high

- 2026-07-21 · **"I'd love to" may be over-banned.** Will used it twice in his own dictated
  warm note. The phrase is filler in a cold note to a stranger and ordinary human speech in a
  warm note to someone you met. Proposed: scope the ban to cold/first-touch copy. AWAITING
  WILL'S RULING before applying anywhere else. · Marissa draft v2 · medium

- 2026-07-21 · **Name-matching is a lead-selection hazard: `ilike '%Marissa%'` returned two
  people and Dave gated the wrong one.** The preflight ran clean against Marissa WALKER at
  Miebach while the draft was for Marissa REYES at Friends of the High Line. Would have
  reported "already emailed via campaign" about the wrong human. **Always gate on the exact
  email address, never a name pattern, and never take `[0]` from a fuzzy match.** · caught
  in-flight · high

- 2026-07-21 · **"Fully remote" kills the OFFICE, not the OFFSITE — the spine's delivery rule
  is blind to events.** The spine says a fully remote company is limited to the flexible set
  (mindfulness, sound baths, nutrition coaching), no massage/nails/facials/hair/headshots. Dave
  applied that literally to OpenSesame and called it a mindfulness-only lead. Will's own live
  proposals to them include monthly chair massage, a chair massage at the January kickoff, a
  September event in Texas, and a Portland conference breakout with hair, nails and headshots.
  **A distributed company still gathers — kickoffs, offsites, conferences, team weeks — and
  those are full-menu in-person moments.** Ask "where does this team physically gather?" before
  narrowing anyone to the flexible set. · OpenSesame thread · high

- 2026-07-21 · **Never call a thread cold from send-counts alone; READ IT.** Dave saw 7 sends
  to Beverly Marsters with no recorded reply and told Will it was a dead sequence to stop
  working. The thread was actually a booth meeting, a 14-minute positive reply, a booked call,
  a proposal, a nudge and a second proposal — Shortcut's warmest live deal. Her May 5 reply is
  missing from `outreach_replies`, the same forward/off-thread blind spot that hid the EPIC
  win. **Send-count plus "no reply on file" is not evidence of a cold lead; it is evidence the
  reply pipeline has holes. Open the thread before judging it.** · OpenSesame thread · high

- 2026-07-21 · **Scoping subagents: give a BOUNDED candidate list and a REPORT-BY budget, never
  an open-ended "find everything".** The Philadelphia/NYC rooms sweep died three times while
  six sister agents completed fine. Evidence: both failed runs stopped at ~250 transcript lines
  (a ceiling, not bad luck), and averaged 1.8 KB per line against 4.5 KB for the agent that
  succeeded — i.e. many small tool calls returning nothing, the signature of hammering dead
  pages. Three prompt errors, all Dave's: (1) two cities in one agent, double the surface of
  any sister sweep; (2) eight OPEN-ENDED categories instead of a named target list — every
  agent that succeeded had bounded targets; (3) Dave mandated dead-or-alive verification on
  every candidate INCLUDING Meetup, when an earlier sweep had already proven Meetup dead for
  this audience — ordering a long tail of fetches he already knew were worthless.
  **Rules now: one geography or one question per agent; a named candidate list, not
  categories; never re-verify what a previous sweep settled; and always instruct "at N fetches,
  stop and report what you have" — an agent told to be thorough will spend its whole budget
  searching and none reporting.** · three failed runs vs six clean ones · high

- 2026-07-21 · **Write research to disk the moment an angle lands, not at the end.** Six research
  angles survived the day because Dave wrote each one into influence-map.md as it completed. The
  SEVENTH — the wellness-efficacy evidence sweep, which was the single most consequential finding
  of the day because it invalidated Goal 3's thesis — existed ONLY in a chat message and was
  nearly lost across three killed turns. It is now `brain/wellness-evidence.md`. **Reporting a
  finding to Will is not the same as recording it. Chat is not storage.** · charter rule added
  2026-07-21 · high

- 2026-07-21 · **Subagent sweeps fail on SCOPE, not on time.** The Philadelphia/NYC sweep died
  three times while six others finished. Diagnosis from the transcripts: the failed runs stopped
  at almost the same point twice (246 and 253 lines), and averaged 1.8 KB per transcript line
  against 4.5 KB for the successful ones — i.e. far more tool calls returning far less. It was
  burning its budget on dead pages. Three causes, all Dave's prompt: two cities in one agent,
  eight open-ended categories instead of a bounded candidate list, and a mandate to verify
  dead-vs-alive on every branch INCLUDING Meetup, which an earlier sweep had already proven dead.
  **Rules now: one agent per geography, a NAMED candidate list rather than categories, never
  re-verify what a previous sweep settled, and always give an explicit "stop at N fetches and
  report what you have" budget.** An agent told to "find everything" with no reporting trigger
  spends its whole budget searching and none reporting. · three failed runs · high

- 2026-07-21 · **Ownership can be ADJUDICATED, not judged — but the rule has one known hole.**
  Will rejected a "confirmed / review" split as handing him homework and asked for a
  deterministic run instead: for each of 491 people, search will@'s FULL mailbox history for
  whether he ever sent to them, and whether the address was in To or only Cc. Never sent + any
  rep signal = the rep's. Result: 472 Jaimie, 14 existing-client accounts (both sides
  legitimately correspond, not a boundary question), 3 supplier, 2 Will, **zero left to guess
  at**. Only 10 needed a human ruling and Will cleared them in one message.
  **⚠️ THE HOLE: a marketing blast sent from will@ is indistinguishable from personal
  correspondence via the Gmail API.** Frida showed 5 "direct sends" that were all campaign
  emails ("Exciting New Wellness Offerings", "A Moment of Calm Awaits"). Across 491 people it
  surfaced once; on a bigger set it would matter. Fix before reusing: exclude sends whose body
  is HTML-templated or whose subject matches a known campaign. · ownership adjudication run ·
  high

- 2026-07-21 · **Two categories that are NOT prospects kept polluting the lead data: existing
  CLIENT accounts and our own SUPPLIERS.** Fourteen "conflicts" were just BCG, DraftKings and
  Schrödinger contacts where Will and Jaimie both correspond, which is normal account coverage.
  Three more were vendors we PAY — Coverdash (our business insurance broker) and Miriam Meza (a
  headshot photographer we hire, who was still chasing an unpaid invoice). **Check for
  client-domain and supplier status BEFORE flagging an ownership conflict, and never surface a
  supplier as a lead.** · same run · high

- 2026-07-21 · **CHECK WHAT WE ALREADY SELL BEFORE RESEARCHING HOW TO BUY OUR WAY IN.** Dave ran
  a legal-vertical sweep that concluded "Shortcut cannot accredit CLE itself; the realistic move
  is to co-present with a credentialed partner" and started planning ALA sponsorships around it.
  **Shortcut IS an accredited CLE provider** — 60 minutes, 1.0 Ethics & Professionalism credit,
  NY/PA/FL, with Shortcut handling submission, attendance and credit reporting. It has a live
  landing page at `/cle`, `/cle/pa`, `/cle/fl` and Dave never looked. The agent researched the
  outside world thoroughly and nobody checked the product. **Before any go-to-market research,
  inventory what the company already has: read the routes in `src/App.tsx` and the components
  they point at.** · Will's correction · high

- 2026-07-21 · **The CLE credit is the one thing we sell that the wellness-efficacy critique
  cannot touch**, because it is a regulator-recognised deliverable rather than a health claim —
  the attorney either earned the credit or did not. In rooms full of sophisticated skeptics
  (bar associations, benefits consultants, the tastemakers in [[influence-map]]), **lead with
  the CLE, not with participation stats.** No wellness competitor can grant it. See
  [[bench-bar-2026]]. · derived from [[wellness-evidence]] + the CLE page · high
