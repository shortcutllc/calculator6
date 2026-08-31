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

## Appended 2026-07-22

- 2026-07-22 · **A Supabase select naming columns that do not exist returned an empty array, not an
  error, and it read exactly like "nobody has ever been emailed."** The morning preflight asked
  `outreach_sends` for `sent_at` and `subject`; the real columns are `sent_time`, and subjects are not
  stored at all. Every one of 25 booth leads came back `sends=0`, which contradicted the known history
  and was the only reason the mistake got caught. **Before believing a zero, confirm the column names
  against a `select('*').limit(1)`.** Same family as the never-trust-a-derived-flag lessons: a clean
  empty result is not evidence of absence. · booth-lead preflight · high

- 2026-07-22 · **A person is not an email address.** Kaya Jill went into the brief as a cold
  no-reply because preflight keyed on the booth-sheet address `kaya26@gmail.com` and the one thread
  attached to it. She had answered on LinkedIn and switched to `kaya.jill@aacsb.edu` — so a booked
  call, a held call, a proposal, a colleague CC'd in, and a **reply from the day before asking for
  next steps** were all invisible. Will's correction: "we're at a later stage, remove her."
  **Any contact whose address is a personal or booth-sheet one gets searched in Gmail by NAME and
  COMPANY DOMAIN, not just by the address on the row** — the switch from personal to work email is
  the normal shape of a warm lead, not an edge case. Third time in three days that a "no reply on
  file" nearly cost a live opportunity (Kristin/EPIC forward, Beverly Marsters, now this), and the
  first where the lead was already past the proposal stage. Also: `workhuman_leads.outreach_status`
  and `responded_at` are stale and gave no warning. *Fix deferred by Will on 2026-07-22 — carry it.*
  · Will's correction · high

- 2026-07-22 · **The morning-brief job file and CLAUDE.md disagree about who comes first, and Dave
  followed the job file silently.** `jobs/morning-brief.md` ranks brokers LAST ("4. Cold... brokers
  are entirely cold"); CLAUDE.md objective 1 says "brokers first, emerging-tech execs second." The
  Jul-22 brief was five Workhuman booth leads and zero of either, and Will asked whether Dave even
  had broker or tech notes. He does: 222 brokers / 193 untouched and sendable / all with LinkedIn
  URLs across 36 tiered firms, plus 128 founder-personal tech contacts and 30 `buyer_landed`
  companies in `tech_scout_ledger`. **When two instruction sources conflict, say so in the brief
  that day — never resolve it silently by picking one.** Mix left unresolved at Will's call.
  · Will's correction · high

- 2026-07-22 · **The 15-minute brief and the warm register are in tension and the tension is real.**
  Five sendable WARM drafts cost ~570 words on their own, before a single word of Dave's framing, because
  warm notes must breathe ([[voice-samples]] rule, Marissa). The 400-word brief ceiling therefore caps the
  daily list at roughly three warm people, or it means 400 words of Dave's own prose with drafts excluded
  from the count. Flagged to Will 2026-07-22, awaiting his ruling. Do not resolve it by writing tighter
  warm notes — that is the exact defect he rejected. · morning brief 2026-07-22 · medium

## Appended 2026-07-27 (second Monday strategy pass)

- 2026-07-27 · **CONFIRMED over a second week: Will sends from LIVE THREADS, not from a cold
  queue — the automated broker-draft cron is producing waste.** Last week the 7:45 cron staged
  ~10 consultant-level broker notes (Aon/Jennifer Mitchell, NFP/Sarah Berkley + Dayton Preston +
  Teri Erhardt, USI/Cheryl Scanlon + Morgan Carlson, EPIC/Amanda Lapointe + Danielle Reyes,
  Sequoia/Jackie Ishibashi, WTW/Fidelia Andrean). **Will sent zero of them.** Every will@ send
  since Jul 20 (23 rows) collapses to just his two hand-worked live deals — EPIC/Kristin Sanders
  and AACSB/Brittany Papendorf — plus the two warm booth notes from the Jul 21 brief (Bev,
  Marissa) and a few one-offs (jsouza@next-insurance, holly@locality, tom@learnbedford). The
  Jul-21 "sends follow attention, not draft quality" hypothesis now has two weeks of evidence and
  upgrades to HIGH. **Implication: stop scoring the cron by drafts-produced; a cold consultant
  queue Will never opens is negative value (it costs tokens and buries the live work). Fewer,
  principal-aimed notes he might actually send beats a full queue.** · will@ sends since Jul 20 vs
  saved_drafts · high

- 2026-07-27 · **GOAL 1 HAS ITS FIRST BOOKED MEETING — and it is the aim-high/expect-the-forward
  play fully realized.** `outreach_replies` shows "Appointment booked: Schedule a call with Will @
  Shortcut (Kristin Sanders)" on Jul 24, positive. The path: Will's cold note to Craig Hasday
  (President, EPIC National EB Practice) → forwarded down to Kristin Sanders → she booked. That is
  1 of the 3-5 meetings Goal 1 needs by Oct 1, and it started at PRESIDENT level. Both broker
  replies on record (Hasday, Feigenbaum) were practice-leader level; the cron's ~10 consultant
  notes have produced 0 replies. **The evidence is now unambiguous: aim broker notes at practice
  leaders / principals, never individual-contributor consultants. A consultant has nobody to
  forward to.** · EPIC thread + reply history · high

- 2026-07-27 · **The 22-lead booth pool's strong-hook re-opens are exhausted after ~10 days, and
  three unactioned briefs (Jul 22/25/26) are an ATTENTION story, not a rejection one.** No verdicts
  were ever recorded for those briefs — Will was heads-down closing EPIC and AACSB by hand. Goal
  2's coverage scoreboard is largely met on the strong leads (Bev replied, Larcy dated to Sep,
  Kaya past-proposal); what remains is thin, and padding to five produces notes he won't send.
  **The daily practice should widen its intake beyond the booth pool — warm non-booth leads and,
  given the Oct 1 clock, brokers — or accept 2-3 genuine picks a day. Do not pad.** This is the
  open question Will left unanswered Jul 26 (keep booth brief / pause it / switch to brokers); it
  is now the load-bearing decision for both Goal 1 and Goal 2. · verdicts 07-22/25/26 · high

## Appended 2026-08-03 (third Monday strategy pass)

- 2026-08-03 · **THIRD straight week: the consultant broker cron is negative value — kill or
  repurpose it.** Jul 22–Aug 3 the 7:45 cron drafted ~15 broker notes (Gallagher x3 Wellbeing
  Consultants, WTW/Aon/NFP/USI/Sequoia), every `target_ref.trigger` = null, every title an
  individual-contributor consultant. **Will sent ZERO.** His actual will@ sends since Jul 27 are
  all hand-worked live threads: EPIC/Kristin, AACSB/Brittany, and two brand-new Kin Foundation
  notes he initiated himself Aug 3. The "sends follow attention, not a cold queue" law now has
  three weeks behind it. The cron burns tokens and buries live work; it should stop or be
  re-pointed at principals only. · saved_drafts vs will@ sends Jul 22–Aug 3 · high

- 2026-08-03 · **The CLE + healthcare-funds wedge is empirically landing on brokers — and Caren
  is the one running it, not Will.** On Aug 3 the subject "Shortcut CLE and HC funds" produced
  TWO engaged broker replies in a single day: Nazaretian at SterlingRisk (positive, "let's set
  up a call" after vacation) and Connie Brenton at LegalOps (CLOC founder — legal-ops royalty),
  both via warm intro, both `caren@`-owned. This is the first outside-EPIC evidence for goals.md's
  CLE-wedge + Track-B(carrier-funds) thesis, and it confirms the winning broker motion is
  aim-high + warm-intro + the CLE/funds wedge, the exact opposite of the cold consultant blast.
  Ownership: Caren's. Coordinate, never reach over. · Aug-3 outreach_replies (caren@ threads) ·
  high

- 2026-08-03 · **Goal 1's one booked meeting slipped but did NOT die — reschedules read as
  friction, not rejection (the Bev pattern again).** EPIC/Kristin's Jul 24 booked call hit a
  conflict Jul 27; she hearted Will's note and Erin Milliken accepted the calendar invite. Still
  warm, still live, awaiting a new time. A stalled reschedule is the quiet way a booked meeting
  goes cold — the move is new times promptly, reply-to-the-ask, no re-pitch. · EPIC reply history
  Jul 24–27 · medium

## Appended 2026-08-10 (fourth Monday strategy pass)

- 2026-08-10 · **FOURTH straight week the broker cron is unsent — and the new evidence kills the
  "aim higher" reading: seniority is not the fix, the COLD QUEUE is the problem.** Aug 3–10 the
  7:45 cron drafted 11 broker notes, and 2 of them were finally principal-level — NFP's Doreen
  Davis (SVP, Vitality & Wellbeing Solutions, Atlantic Region) and D. Smolensky (SVP & Global
  Practice Leader). Will sent **zero of all 11**, SVPs included. So the lesson upgrades: it was
  never just consultant-vs-principal; a cold queue Will did not start goes unsent at any level.
  The broker motion that actually lands is the warm-intro + CLE/funds wedge running on Caren's
  side (LegalOps/Connie Brenton still engaged Aug 5, SterlingRisk/Nazaretian). **Recommend the
  cron be killed or repointed to feed the warm-intro motion, not a cold list.** · saved_drafts
  Aug 3–10 (all reco=ok_to_proceed) vs will@ sends · high

- 2026-08-10 · **Will's real outreach energy goes to threads HE started from genuine
  relationship, never to a maintained list — the positive corollary of "sends follow
  attention."** His 5 self-initiated send-threads Aug 3–10 were all mission/community/local: Kin
  Foundation (Operation Backpack), Coalition/cpnyc.org (positive reply Aug 7), Kith NYC,
  learnbedford, VibeVentura (accepted a recurring Friday call Aug 8). None came from any pool
  Dave maintains. Four weeks of data now point one way: **Dave's leverage for Goal 2 is removing
  friction from the threads Will is already in — reply-to-the-ask nudges, next-step drafts,
  status closes — not generating fresh cold picks he won't clear.** This is the strategic case
  for the daily-brief pivot Will has left unanswered ~6 weeks. · will@ sends Aug 3–10 · medium-high

## Appended 2026-08-17 (fifth Monday strategy pass)

- 2026-08-17 · **FIFTH straight week the cold broker cron went unsent (0 of 5) — and this week the
  contrast is total, because the broker motion that DOES work booked real business in the same
  seven days.** Aug 10–17 the 7:45 cron drafted 5 consultant/manager notes (Gallagher ×2, HUB,
  WTW, Mercer), all reco=ok_to_proceed, and Will sent none. Meanwhile Caren's warm-intro CLE/funds
  motion, which Dave does not run, converted: **LegalOps/Connie Brenton (CLOC founder) booked a
  first hair-and-makeup event** ("just hair and makeup… will you send us your agreement," Aug 11),
  **SterlingRisk/Nazaretian stayed warm** ("all good," Aug 13), and **BDO/jcouillard set a call for
  the week of 9/21** (positive, Aug 13). The cron is not merely unsent, it drafts the WRONG motion
  (cold, ICP-consultant) while the RIGHT one (warm intro + CLE/funds, aimed high, rep-run) lands.
  · saved_drafts vs will@ sends + outreach_replies Aug 10–17 · high

- 2026-08-17 · **Re-asking a standing decision in the same words is Dave's failure, not Will's
  silence.** The "kill/repoint the cron" and "pivot the daily brief" questions have now been raised
  identically across ~4 Monday plans and ~5 morning briefs (Jul 26 → Aug 16) with no verdict. A
  question Will ignores five times is not waiting on more evidence; the framing is the blocker.
  Fix applied this week: stop asking "should I?" and state the DEFAULT Dave will take unless Will
  says stop (kill the cron, repoint the brief to friction-removal), reduced to one yes/no. Escalation
  by reframing, not by repetition. · six weeks of unanswered pivot asks · medium-high
