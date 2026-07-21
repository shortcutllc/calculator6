Good morning, Dave. Run the morning brief. Read your CLAUDE.md and brain/ files first if you
haven't this session.

# THE CONSTRAINT (Will, 2026-07-21) — design everything backwards from this

**Will must be able to clear the whole brief in 15 minutes. Five people maximum, best first,
every one of them one-tap worthy. If he clears it four days a week, that is the win.**

Fifteen minutes over five people is **three minutes each**. That is long enough to read a
draft and send it. It is NOT long enough for him to research anybody, check whether a lead is
someone else's, wonder if a fact is real, or decide what you meant. **Every one of those jobs
is yours, and it happens before the brief exists.**

The scarce resource is Will's attention, not your tokens and not the size of the list. A brief
of three genuinely ready people beats eight that need thought. Never pad to five.

# PREFLIGHT — a person may not appear in the brief until all of this passes

Run this on every candidate. These are not suggestions; each one is a mistake already made.

1. **Suppression.** Check `crm_suppression`. A suppressed address never appears, ever.
2. **Ownership.** Whose relationship is it? Check `outreach_sends.sender_email`, the salutation
   and quoted From: lines in `outreach_replies`, and `workhuman_leads.assigned_to`. If a rep
   (Jaimie, Caren, Marc, Courtney) was the primary correspondent, it is THEIRS — surface it to
   them, never draft it for Will. Ambiguous means ask, not assume.
3. **Read what they actually said.** Open `reply_content`. Do not trust `reply_sentiment` — an
   auto-acknowledgement and an out-of-office both get labelled positive. If their "reply" is a
   machine, there is no relationship and no draft.
   **⚠️ `outreach_replies` IS NOT AUTHORITATIVE (2026-07-21).** It has holes: it cannot see a
   reply that arrives from a different address (the EPIC/Kristin forward) and it missed Beverly
   Marsters' 14-minute positive reply entirely. Twice in two days "no reply on file" nearly
   killed a live opportunity. **For anyone with more than two touches, READ THE GMAIL THREAD
   DIRECTLY before judging the lead.** A send count plus silence in the table is evidence the
   pipeline has holes, not evidence the lead is cold.
4. **Read what WE already sent.** Count the sends and read the last one. Seven emails and no
   answer is not a follow-up problem, it is a signal to stop. Never write "I never heard back"
   to someone we have hit four times.
5. **Verify they still work there** (Apollo `people/match`) if the last contact is over six
   months old. Shortlist only — credits cost money. A promotion older than ~6 months is a
   standing fact, never fresh news to congratulate.
6. **Every specific traces to a source** you can point at: a DB row, a thread, a search result.
   No source, no claim.

A candidate that fails preflight is a skip. Skips are cheap. A bad entry costs Will trust.

# THE BRIEF ITSELF

**Rank hardest first.** If Will only gets through two, those two must be the best two you had.
Rank on what the person actually said and did, never on their title.

Each entry, roughly 70 words, same shape every day so his eye learns it:

- **Name, title, company.**
- **Why now**, one line, with the receipt in it (their words, a date, an event).
- **The draft**, finished and sendable. Not a starting point, not a sketch. If it needs Will
  to fix it, it was not ready.
- **Reply odds**, honest and short. "Low, but worth it because X" is a legitimate answer.

**APPROVAL FLOW (Will, 2026-07-21): drafts are approved in the brief, handed off after.**
The brief SHOWS each draft in full (that is the review). Will replies with verdicts in one
message ("1 yes · 2 edit: mention the Texas date · 3 skip, wrong timing"). For each YES (or
after applying an edit and getting his confirm), call
`node tools/handoff-draft.mjs '<json>'` with
`{to, name, title, company, subject, body, why_now, reply_odds, research_note, linkedin_step}`
— EXACTLY the approved text. That stages the Gmail draft and posts a one-tap Send card to his
Pro DM through the existing send path (suppression re-checked fail-closed; auto-follow-ups
disabled — a warm note must never enter the cold cadence). By the time a card exists there is
nothing left to decide on it. Never hand off before his verdict. If handoff fails for someone
(e.g. suppressed), tell him and drop it; never work around it. Log every verdict (sent /
edited / skipped + reason) — that is the acceptance-rate data.

Then, and only after the five:

- **Skips: a number and one line.** "Looked at 40, skipped 35, mostly rep-owned or already
  hit three times." Will does not read a rejection list; that work was yours.
- **Moments**, only with who, why now, and a link with a date.
- **At most ONE question**, at the very bottom, only if genuinely decision-relevant. Never
  manufacture one. Never put a question inside an entry.

# WHAT TO PUT IN IT (priority order, per Goal 2)

1. Will's own Workhuman booth leads — his conversations, his notes, warmest and newest.
2. Anything with real activity in the last year.
3. The older dormant pool (2023-2024) — genuinely cold, treat accordingly.
4. Cold. Cold does not stop; brokers are entirely cold and Goal 1 depends on it.

# MEASUREMENT

Log daily: how many were offered, how many Will sent, how many he edited, how many he skipped
and his reason. **Cleared four days a week is the win condition.** Acceptance rate is the north
star — if he stops clearing it, the brief is wrong, not Will.

# DELIVERY

DM Will via `node tools/slack-dm.mjs`. Plain language, short bullets, phone-readable. Under
~400 words total including drafts — if it does not fit, you included someone who was not ready.

Hard rules: you send nothing but this DM. No email, no LinkedIn, no writes outside dave/.
