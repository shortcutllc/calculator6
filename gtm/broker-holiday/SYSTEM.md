# Small broker holiday outreach: the system, version 2

Version 2 of the Nov 9 2026 breakdown. What changed and why is in `CRITIQUE.md`. Where this file
and an older copy disagree, this file wins, and where this file and `broker.mjs` disagree on
wording or checks, `broker.mjs` wins, because that is the copy that actually runs.

## What this is

A channel test with a deadline. Small independent benefits brokers have employer clients with
carrier wellness fund dollars that expire at plan year end. Shortcut can be paid from those funds
with carrier preapproval. The prize is 3 to 6 principal level broker relationships who forward
Shortcut to a client this year and remember it at renewal in 2027. It is not a Q4 revenue plan.

## Who

Founder, managing partner, principal or VP Employee Benefits at a small independent firm whose
clients have 100 plus lives. No account executives or managers. Hub cities first: Boston, New
York, Philadelphia, Miami, Los Angeles, San Francisco, Las Vegas. Never the nationals (Gallagher,
NFP, Marsh, HUB, Alera, OneDigital, Brown and Brown) or any acquired firm.

A firm is **verified** only when its own homepage has been read today or within 14 days and shows:
principal name and title, still independent, a contact form URL or a published email, carrier
signals, client size. Search results and directories find candidates; they never verify one.
Never invent a principal, an email address or a carrier claim. A guessed address pattern counts as
invented.

Before day 1 every firm is also checked against the existing CRM (`outreach_contacts`,
`crm_suppression`) so nobody already in a rep's hands gets a cold note from Will.

## The offer

Track A, lead with this: chair massage, assisted stretch, sound baths, mindfulness, nutrition
coaching, paid from the carrier fund, subject to carrier preapproval. Nails, facials and headshots
are never fund eligible. (A5, checked Nov 9: all five are fund eligible on www, along
with yoga, strength, dance cardio and somatic movement. Full list in `SOLUTION.md`.)

Track B, employer paid: the full holiday menu, 10 percent off when a visit combines 2 or more
services, a free 30 minute class worth up to 1250 dollars to claim by March 2027, at least 7
business days from signed quote. Book by Dec 7.

## Carrier funds

Tier 1, can pay Shortcut with preapproval: Cigna Health Improvement Fund, Aetna Wellness Allowance.
Cigna pays third party vendors only through a Cigna approved vendor; Shortcut's status is pending,
so on a call the answer is "Aetna yes, Cigna in progress".
Tier 2, plan specific language only: Anthem, UnitedHealthcare, Blue Cross Blue Shield. (A5: the
claims file and the www site treat the Anthem Wellness Fund as confirmed, beside Cigna and Aetna.
Waits on Will.)
Tier 3, member rewards only: Humana Go365, Kaiser, Centene Ambetter, Molina, Oscar.
Never state a percent or dollar reimbursement, and never say preapproved without the client's
written preapproval on file.

## The words

All wording is Will's Nov 9 approved text and lives in `broker.mjs`. Drafts are built by
`broker.mjs draft`, never typed. Per firm, exactly three things vary: the firm name (colloquial,
no Inc or LLC), the principal's first name, and one short Since clause (8 words or fewer, no
numbers, no lists). The opening paragraph is one of three approved intros (A, B, C), fixed per
firm by its name; the batch shows which. Subject for every email: `quick question - carrier funds`.

Channels: `form` (to the firm team, one plain link), `email1` (day 1 where there is no form),
`email3` (after a form, with the website reference line), `linkedin` (to the principal, no link),
`instagram` (to the firm account, no link). Cold emails carry zero links, body and signature.

Two messages have no approved wording yet and are never drafted until they do: the thread follow
up for firms whose day 1 was an email, and the day 7 follow up. Proposals P2 and P3 in the critique.

## Cadence

Counted in business days from the day 1 touch, skipping weekends and Nov 11, Nov 26, Nov 27,
Dec 24, Dec 25, Dec 31, Jan 1. `broker.mjs due` computes it; nobody types a date.

| Touch | When | What |
|---|---|---|
| 1 | Day 1 | Form, or email if the firm has no usable form |
| 2 | 2 business days later | Email. Form firms: `email3` to the principal. Email firms: reply in the same thread |
| 3 | 5 business days after day 1 | LinkedIn connection to the principal |
| 4 | 8 business days after day 1 | One of: follow up email, or one DM. Never both |
| Close | 10 business days after day 1 | Log no reply, move to the January renewal list |

Four touches at most. Never two touches inside two business days; a late touch pushes the next one
out. A reply, a bounce or an opt out stops the cadence that day. For the Nov 9 firms: touch 2 on
Thu Nov 12, touch 3 on Tue Nov 17, touch 4 on Fri Nov 20, close on Tue Nov 24.

## A send, step by step

1. `broker.mjs batch` builds every draft due today and runs the pre-send check. A draft that fails
   is not shown as a draft; it is shown as blocked with the reason.
2. Will sees the batch rendered, one block per paragraph, with the check count on each draft.
3. Batch approval (Will, Nov 9): Will approves one locked text per channel plus the list of firms
   it goes to, with each firm's Since clause. He does not read every draft. Any change to the text
   itself is a separate decision and goes through `broker.mjs` first.
4. Email: sent by Will from will@getshortcut.co, then read back from Sent mail.
   Form: once Will has approved the batch (text plus firm list), the agent submits the forms
   for the firms on that list, in the browser, one at a time: fill, read the message field back
   to confirm the blank lines, submit once, screenshot the confirmation (Will, Nov 9 evening).
   Only on a business day between 9:00 and 17:00 in the firm's own time zone, never at night.
   Never a firm that was not on the approved list. A CAPTCHA, a login, a field asking for anything
   beyond name, email, phone, company, address and message, or a form with no message field: stop
   and hand that firm to Will.
5. The tracker row gets the touch (`date:channel`) the same day. Message ids and form
   confirmations go in `notes`.

## Measuring

Count only firms whose cadence has closed. Keep role inbox sends (info@, sales@) as a separate
line from principal sends. Will, Nov 9: the target is 100 firms in the first week and 100 or more a
week after, so 25 closed firms is a review point, not a stop: 0 replies there means the message is
reworked with Will while sourcing continues; 2 or more means the text stays. A quiet
November judges this message in this season, not the broker channel.

Planning rates from the original plan: form reply 3 to 8 percent, cold email 8 to 12 percent, then
half at each step from reply to call to proposal to event.

## Dates

Through Nov 20: holiday note. These are the only firms that can realistically reach a 2026 event.
Nov 23 to Dec 11: new firms are for the January renewal list (needs wording, proposal P4).
Dec 7: book by date. Dec 11: last new cold outreach. Dec 18: last proposals. Dec 21 to 23: last
event dates. Jan 5 2027: final report and the warm list, then the daily job turns itself off.

## Files

`broker.mjs` locked wording, pre-send check, cadence, batch builder. `broker.test.mjs` its tests.
`tracker.csv` one row per firm. `batches/` each day's output. `JOB.md` the daily job.
`CRITIQUE.md` the review and the open proposals. `runs.md` one line per run.
`find-email.mjs` finds a principal's address through Apollo and keeps it only if it clears
MillionVerifier or BounceBan; results go to the private people file. `SOLUTION.md` the offer in facts.
`BRAIN.md` what the job has learned: scoreboard, beliefs, experiments, channel backlog. The job
rewrites it every run. `broker.mjs score` gives it the numbers.
