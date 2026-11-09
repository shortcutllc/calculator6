# Critique of the small broker holiday system

Written Nov 9 2026 against `broker-system-breakdown.md` (the Nov 9 version, after 6 of 10 contacts).
Sources I could read: this repo (the SterlingRisk partner page, `/wellness-funds`, `/broker-plan`,
the holiday package module, Dave's goals and lessons). Sources I could NOT read are listed at the
bottom. Per Will (Nov 9), the messaging spine is history, not a writing standard, so nothing below
judges the copy against it. The approved Nov 9 templates are the standard.

Ranked by how much each one can cost you.

## A. Things that can make the test fail or mislead you

**A1. The first four emails went to role inboxes, and the system's own rule is principals only.**
Greystone, EPIQ, A and C and Jordan went to info@, benefits@, info@ and sales@. Your own data says
the only broker replies on record came from practice leaders, and the one win came from a president
forwarding down (`dave/brain/lessons.md`, Jul 20 and 21). A role inbox has nobody to forward down
to. These four will read as "no reply" and drag the reply rate, when what they measure is the
address. Fix: count role inbox sends as their own arm, and put a principal's published address on
every firm before day 1 where the firm's site shows one.

**A2. The stop rule cannot tell signal from noise.** "Under 4 percent after 25 firms" means zero
replies stops the test and one reply continues it. One reply out of 25 is a coin flip. And at
firm 25 most firms will be only a few days into a 14 day cadence, so the rate is being read before
it has finished arriving. Fix: judge only firms whose cadence has closed, and use counts, not
percents: 0 replies from the first 25 closed firms means rework the message; 2 or more means scale.
One reply means look at who replied and why before deciding.

**A3. The calendar does not close.** The SterlingRisk page says book by Dec 7
(`sterlingData.ts`, CUTOFF, confirmed by Will Oct 6). The breakdown allows new cold outreach to
Dec 11 and proposals to Dec 18. A firm first contacted after about Nov 23 cannot finish a 14 day
cadence, take a call, get a client intro, get carrier preapproval and sign by Dec 7. Add
Thanksgiving week. Realistically the firms that can produce a 2026 event are the ones contacted
by Nov 20. Everything after that is building the January renewal list, which is fine, but the
message for those firms should not promise a holiday window that has closed. Fix: two phases.
Through Nov 20, the current holiday note. Nov 23 to Dec 11, a renewal note (needs your wording).

**A4. Your own notes call this the dead season for brokers.** `dave/brain/goals.md`: "Broker
seasonality: prime window Feb-Aug, DEAD Oct-mid-Jan." Q4 is open enrollment and Jan 1 renewals.
That does not kill the test, since leftover fund dollars really do expire at plan year end, but it
means a low reply rate now says little about the channel in February. Do not let a quiet November
kill the broker channel. The stop rule should stop this message in this season, nothing more.

**A5. The fund claims disagree across your own live pages.** The breakdown says never claim a
standard Anthem fund. The live `/wellness-funds` page and the SterlingRisk page both list "Anthem:
Wellness Fund" beside Cigna and Aetna, and `/wellness-funds` says "your plan most likely includes
an employer wellness fund". A broker who reads the note and then the page sees two different
stories. Also the fund eligible lists differ: the breakdown has nutrition coaching and no group
classes; the Sterling page has yoga, strength, dance cardio and somatic movement and no nutrition
coaching. One of them is wrong. Fix: decide which is true and I will change the other.

**A6. "BCG and Burberry pay for Shortcut services completely via these funds."** The repo supports
Burberry and Aetna in several places (`gtm-one-pager.md`, `/broker-plan`). I found nothing here
that says BCG pays through a carrier fund; BCG appears only as a client. It may well be true and
recorded in the claims file I cannot open. But a benefits broker is exactly the reader who will ask
"which fund, which carrier?" on the first call. Confirm BCG, and "completely", before firm 11.

**A7. The note names Cigna while the system says not to promise Cigna.** The carrier section says
Cigna third party vendors are ineligible unless Cigna approved, and approved vendor work is still
one step a day. The note says companies are "sitting on unused Cigna or Aetna wellness dollars"
and that clients "pay completely via these funds". That is fair as a question, but on a call the
honest answer today is "Aetna yes, Cigna pending". Put that sentence in the call prep so nobody
improvises it.

**A8. The holiday link shows services the fund will not pay for.** The form note sends brokers to
`/holiday`, the full menu, with nails, facials and headshots. The fund track covers five services.
The SterlingRisk page solved this by labelling every package fund eligible or partner rate. Small
brokers get the page that does not make the distinction. Fix: send them to `/wellness-funds`, or
add one line. Your call, since it changes approved text.

**A9. Cold email compliance.** A commercial cold email in the US is expected to carry a physical
postal address and a way to opt out, and opt outs must be honored. The cold email signature is
name, title, email, phone. You already have the address (220 W Rittenhouse Sq) for forms. I am not
your lawyer; this is the standard CAN-SPAM point and worth a two minute check before volume grows.
The system also has no opt out or bounce handling anywhere: no suppression list, no status for
"asked not to be contacted". The tracker now has `suppressed` and `bounced` statuses.

**A10. These brokers may already be in your CRM, or already be Caren's.** The repo has 222 broker
contacts, a `crm_suppression` list, and a broker motion Caren runs (the Sterling handoff says
"cc Caren"). The breakdown dedupes new firms only against its own tracker and the nationals.
Fix: dedupe each new firm against `outreach_contacts` and `crm_suppression` before day 1. The
cloud job cannot reach Supabase, so until it can this is a manual check, and the job says so.

## B. Rules that contradict each other (fixed in SYSTEM.md)

**B1. Day counting is off by one and lands on weekends.** With Nov 9 as day 1, day 3 is Nov 11,
not Nov 12. The breakdown's dates are day 1 plus 3, plus 5, plus 7. Its day 5 is Saturday Nov 14.
Nov 11 is Veterans Day and Nov 26 is Thanksgiving. Fix: count business days and skip holidays.
For the Nov 9 firms that gives Nov 12, Nov 17, Nov 20, close Nov 24. A script computes it per
firm, so nobody types a date.

**B2. "Max 4 touches" but the cadence lists 5,** and "never more than one touch in 48 hours" but
day 5 LinkedIn, day 6 DM, day 7 email are a day apart. Fix: four touches, two business days apart
at minimum, and touch 4 is the follow up email OR one DM, never both.

**B3. "Slight variation per firm" against "follow the templates exactly".** Variation also ruins
the test, because you cannot tell which wording earned a reply. Fix: the text is built by code
from the locked wording. The only things that vary are firm name, first name, and the Since clause.

**B4. "No dashes in the draft body" but the subject is "quick question - carrier funds".** Kept as
you approved it; the check applies to the body only. Say so, or the next reviewer "fixes" it.

**B5. "Exactly one question mark in paragraph 3" but the cold email asks a second question** two
lines later ("Can I share more info...?"). The check now reads it the way you meant it: one
question in the ask paragraph. The email still carries three asks (do your clients have funds,
can I share more, can I present). One ask usually pulls better than three. See proposal P1.

**B6. Day 3 email is "to the principal" but "never invent an email".** If the firm's site does not
publish the principal's address, there is no legal day 3 email. The job now blocks it and says why
instead of guessing a pattern. This will happen often; decide whether an email finder is allowed.

**B7. Two follow ups have no approved text.** The day 7 follow up ("no new pitch added") and the
follow up for firms whose day 1 was an email (Greystone, EPIQ, A and C, Jordan, due Nov 12) have
rules but no wording. The job will not invent them. Proposals P2 and P3 below need a yes or an edit.

**B8. "Flag any reply within 2 hours" from a job that runs once a day.** A reply at 10am waits
22 hours. Either add an afternoon reply check or drop the promise.

**B9. A correction is "banked" in five places** (skill, MEMORY, checklist, strategy doc, daily
job). Five copies drift; that is how the same mistakes came back. Fix: one source. The locked text
and the checks live in `broker.mjs`; everything else points at it.

## C. Load and design

**C1. The morning job does ten jobs.** Verify 10, draft 40 pieces (10 firms times 4 channels), work
follow ups, add 10 firms, forums, vendor registration, report. You then approve up to 40 drafts a
day. LinkedIn and Instagram notes drafted on day 1 are stale by day 5. Fix: draft only what is due
today. Verification and sourcing are capped by what you actually sent yesterday, so the queue
never runs more than two days ahead.

**C2. Forms give you no proof.** "Thank you" with no confirmation number means a silent failure
looks the same as a delivery. Keep a screenshot per submit.

**C3. Ten cold emails a day from will@ is your real inbox's reputation.** Fine at this size. If it
scales to 75 with links and follow ups, watch for replies landing in spam.

**C4. The approved vendor step is the critical path, not a side task.** Without Cigna approved
vendor status, half the pitch cannot close this year. One step a day behind a job that never
submits anything means it finishes after the window. This needs an owner and a date, not a cron.

## Proposals that need your yes (the job uses none of these until you approve)

**P1. One ask in the cold email.** Drop "Can I share more info on our holiday packages and how
funds can be applied?" and keep the present line, or the reverse.

**P2. Follow up for firms whose day 1 was an email (due Nov 12), sent as a reply in the thread:**

> Hi [Firm] team,
>
> Following up on my note from Monday. Do your clients have Cigna or Aetna wellness fund dollars
> still sitting there this plan year?
>
> If someone else handles wellness for your clients, point me their way and I will take it from
> there.
>
> Cheers,
> Will

**P3. Day 7 follow up, reply in thread, the one hyperlink allowed by your rule:**

> Hi [First],
>
> One last note from me. If any of your clients have fund dollars to use before the plan year
> ends, here is what we can do with them: our holiday packages (linked).
>
> Either way, thanks for your time.
>
> Cheers,
> Will

**P4. A renewal note for firms first contacted after Nov 20,** with no holiday deadline in it.

**P5. Add the postal address line under the cold email signature.**

## What I could not read

- `shortcutllc/getshortcut.co` and `shortcut-coordinator`: not granted to this session. I had this
  repo and a May 2026 copy of the old site. So I have not seen the live `/holiday` page source, the
  brokers and health plan solution pages on www, or the claims verification file.
- The Muse workspace: tracker, checklist, strategy doc, skill, the original 25 scope, the carrier
  check. The tracker here is seeded only from what the breakdown states.
- will@ and hello@ mail. The Gmail connection in this session is a personal mailbox.
- Any broker website, and getshortcut.co itself: this cloud environment's network blocks them.
