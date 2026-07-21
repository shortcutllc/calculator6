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

- 2026-07-20 · **Reply detection is blind to a forward.** Will's one real broker win came from
  Craig Hasday (President, EPIC) forwarding the note internally to Kristin Sanders, who replied
  from her own address. The system watches the address it mailed, so it recorded Craig's
  sequence as "replied" while the actual reply, the person, and the booked meeting were
  invisible to every query. **Aim high at big firms and expect the forward.** · EPIC thread ·
  high
