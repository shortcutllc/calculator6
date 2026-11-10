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
Will, Nov 9: the form already reaches the general inbox, so email touches go to a named principal,
never to info@ or sales@. Checked on the firms' own sites the same day: Innovo and Houtz publish a
principal's address; EPIQ and JDI name a principal but publish only a role address; Greystone shows
no current principal. Where no personal address is published the email touch is blocked, and the
choice is LinkedIn to the principal or an approved email finder (B6).

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

**A5. CORRECTED Nov 9 (local session). The breakdown is the outlier, not the pages.** Shortcut's own
source of truth says there IS a standard Anthem fund: `CLAIMS_VERIFICATION.md` section 4 in the
getshortcut.co repo lists Cigna Health Improvement Fund, Aetna Wellness Allowance and Anthem
Wellness Fund as "confirmed and safe to publish", and www `/solutions/brokers`,
`/solutions/healthcare` and `/pricing` all name the three (`frontend/data/wellness-funds-data.js`,
CARRIERS). The Muse carrier check that demoted Anthem to "plan specific language only" is the one
file I still cannot read, so I cannot say what it found. Until Will rules, the outreach text is
unaffected (it names only Cigna and Aetna), but call prep should not tell a broker "no Anthem fund"
while the site says the opposite.
Fund eligible list, corrected again late Nov 9 after reading the whole broker page: carriers
reimburse two categories. Stress management: massage, assisted stretch, mindfulness, sound bath.
Group exercise: yoga, strength and sculpt, dance cardio, somatic movement, and one on one or group
nutrition coaching. So nutrition coaching IS fund eligible on www (`FUND_CATEGORIES`); my earlier
note said it was not, because I had read only the eight page slugs. Both the breakdown's list and
the Sterling page are subsets of the truth. The full list is in `SOLUTION.md`.

**A6. CONFIRMED GAP Nov 9. "BCG and Burberry pay for Shortcut services completely via these
funds."** Burberry and Aetna is supported: the carrier funds reference records the flow as confirmed
May 2026 (Shortcut invoices Burberry, Burberry submits to Aetna, Aetna pays Shortcut). BCG is not
supported anywhere I can now read: `CLAIMS_VERIFICATION.md` lists BCG only as a named client with 5
locations, and no file in this repo, the www repo, the coordinator repo or Dave's brain ties BCG to
a carrier fund. "Completely" is not recorded for either client. Six notes carrying the sentence
have already gone out. Will either confirms BCG from his own knowledge (then it should be added to
the claims file) or the sentence needs new approved wording before more go out.

**A7. The note names Cigna while the system says not to promise Cigna.** The carrier section says
Cigna third party vendors are ineligible unless Cigna approved, and approved vendor work is still
one step a day. The note says companies are "sitting on unused Cigna or Aetna wellness dollars"
and that clients "pay completely via these funds". That is fair as a question, but on a call the
honest answer today is "Aetna yes, Cigna pending". Put that sentence in the call prep so nobody
improvises it.

**A8. CONFIRMED Nov 9. The holiday link shows services the fund will not pay for.** www
`frontend/pages/holiday.vue` and `frontend/data/holiday-data.js` contain no mention of funds,
carriers or eligibility at all. A broker who clicks the form note's link lands on the full menu with
no fund story. `/solutions/brokers` is the page written for this reader: it shows only the eight
eligible services and says beauty and headshots get 10 percent off at the partner rate instead.
Fix: point the form note at `/solutions/brokers`, or add a fund line to `/holiday`. Either changes
approved text or a live page, so it is Will's call.

**A9. Cold email compliance.** A commercial cold email in the US is expected to carry a physical
postal address and a way to opt out, and opt outs must be honored. The cold email signature is
name, title, email, phone. You already have the address (220 W Rittenhouse Sq) for forms. I am not
your lawyer; this is the standard CAN-SPAM point and worth a two minute check before volume grows.
The system also has no opt out or bounce handling anywhere: no suppression list, no status for
"asked not to be contacted". The tracker now has `suppressed` and `bounced` statuses.

**A10. DONE Nov 9 for the firms that can be identified.** Checked read only against Supabase.
`outreach_contacts`: the four Nov 9 addresses are there only because the Gmail sent crawl ingested
the sends themselves (source `gmail-sent-crawl`, no stage, no broker track, no owner). No other
contact at greystonebenefits.com, epiqrm.com, acmgmt.com or jdigroup.com. `crm_suppression`: none of
the four domains. `crm_target_firms`: none. Innovo and Houtz: no match by name. So none of the six
identifiable firms is a rep's relationship. BSP, Troy, Alliance and Shore cannot be deduped until
their domains are known. For scale: 241 broker track contacts exist (will@ 98, caren@ 34, unassigned
109). The local job can reach Supabase, so this check now runs before every day 1.
The same table answers the mail question without the connector: `outreach_sends` shows all four
Nov 9 emails sent from will@getshortcut.co with the message ids in the tracker, and no reply and no
bounce recorded as of the evening of Nov 9.

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

## Will's decisions, Nov 9 evening

- A6 closed: Will confirmed that BCG pays through a carrier fund. The proof line stands as
  written. It is still not in `CLAIMS_VERIFICATION.md`; worth adding there with the carrier.
- Forms: standing approval, 50 a day, 9 to 5 in the firm's time zone. Target 50 forms a day.

- P2: no thread reply to the role inboxes. Touch 2 for Greystone, EPIQ, A and C and Jordan is the
  firm's contact form (locked form note) or LinkedIn to the principal. `broker.mjs` now routes
  touch 2 to the form for these firms. The LinkedIn note says "I reached out via your website", so
  it is only true after a form has gone in.
- P3: approved as proposed. Not yet locked into `broker.mjs`; first due Nov 20.
- P5: neither. The Nov 9 signature stays as approved, no postal address, no opt out line.
- Role inbox sends are reported as a separate line; the stop rule reads form and principal sends.
- Still open: P1, P4, A5 (Anthem and the eligible list), A6 (BCG), A8 (which page the link opens).

## What is still unread (updated Nov 9, local session)

- The Muse workspace. It is not on this Mac: Muse keeps its workspace in the cloud, and the only
  local copy of anything is `~/Downloads/broker-system-breakdown.md`, which the tracker was already
  seeded from. Tracker, checklist, strategy doc, the original 25 scope and the carrier check need
  an export from Muse. Until then BSP, Troy, Alliance and Shore cannot be identified.
- will@ mail through the connector, which is still signed in to a personal mailbox and was not
  read. Sends, replies and bounces are read from `outreach_sends` instead.
- Read this session: getshortcut.co repo (brokers and healthcare pages, holiday page and data,
  pricing, `CLAIMS_VERIFICATION.md`), shortcut-coordinator (nothing about carrier funds in it), the
  Sterling page and data, `WellnessFundsOnePager.tsx`, and six broker homepages.
