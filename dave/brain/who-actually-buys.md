# Who actually buys Shortcut — measured, not assumed (2026-07-21)

Apollo-enriched **one contact per client at our 50 biggest paying clients**, ranked by completed
event volume. 50 credits. Source: `crm_companies.contacts` (names and emails we hold on paying
clients), titles from Apollo `people/match`. Raw data:
`state/dormant-mine/client-buyer-titles.json`.

## The result

| Segment | Count | Share |
|---|---|---|
| **Events / community / experience** | **10** | **20%** |
| **Office ops / admin / EA** | **6** | **12%** |
| Exec / owner | 5 | 10% |
| **HR / People** | **4** | **8%** |
| Facilities / workplace | 2 | 4% |
| Other | 12 | 24% |
| No title on file | 11 | 22% |

**The operations-and-events cluster is 32% of our biggest clients. HR is 8%.**

## The actual people, at the top of our book

- DraftKings, **514 events** — Customer Experience Associate II
- Schrödinger, **196 events** — Office Coordinator
- WIX, **67 events** — Workplace Operations Manager
- BCG, **60 events** — OE & Events Specialist
- PwC, 21 events — Market Event Manager
- Teads, 11 events — Executive Assistant & Senior Manager, Office Operations
- Ballard Spahr, 7 events — Manager, Office Services
- ROKT — Employee Experience and Events Manager
- Datadog — Senior Associate, Office Operations
- UiPath — Workplace Experience Manager
- WeWork sites — Community Manager, Community Associate, Event Sales Director

The entire HR cluster, for comparison: Barstool Sports (8 events, People Operations Manager),
Mikimoto (5, Learning & Talent), Teads Chicago (5, Senior Benefits Manager), Pivotal (3, People
Partner). **The largest HR-owned account in our book is 8 events. The largest ops-owned account
is 514.**

## ⚠️ THE FINDING THAT MATTERS MOST

**The people who REPLY to our marketing are not the people who RUN our accounts.**

| Population | HR / People | Office mgr / admin | Events / ops |
|---|---|---|---|
| Positive email repliers (n=194) | 48% | 28% | — |
| Workhuman booth walk-ups (n=1,307) | 65% | 3% | — |
| **Actual paying clients (n=50)** | **8%** | **12%** | **20%** |

HR answers marketing. **Operations and events people run the account.** Every prior read of
"who our buyer is" came from reply and booth data, which measures marketing response, not
revenue. This is the first look at the revenue side and it points somewhere else entirely.

## ⚠️ THE HONEST CAVEAT — read before acting
`crm_companies.contacts` is most likely the **operational** contact: the person we coordinate
with to run the day. That is not necessarily the person who approved the budget or signed. So
this measures **who we WORK WITH**, which may differ from **who DECIDES**. HR may still be
signing while ops runs the day.

What would settle it: the contact named on the proposal or invoice, from `proposals` /
`stripe_invoices`, cross-referenced with this list. That is the next query, not a guess.

Either way, these are the people who touch Shortcut repeatedly, who coordinate every event, and
who are in the room when it happens. The relationship lives with them regardless of whose
budget code it is.

## What this changes

1. **The influence map is ranked wrong.** Dave put HR rooms first — Philly SHRM, I Hate It Here,
   NYC SHRM. On revenue data, the office-manager and events rooms should lead.
2. **OrgOrg moves to #1.** Its stated audience is literally "office managers, ops leaders,
   workplace experts, EAs" — the exact cluster. It was ranked #2 on instinct; the data promotes
   it.
3. **IAAP deserves a second look.** Dave dismissed it for having no vendor membership class, but
   it is the association for administrative professionals — this cluster. Their Summit is
   27-29 Jul 2026 in LA. A room with no vendor class but the right people may still be worth
   attending as a paying attendee.
4. **Event and community managers are an unworked segment.** Nobody targets them. They are not
   in `outreach_contacts` in any volume, they have their own communities, and they book us more
   than HR does.
5. **It does NOT invalidate the HR work.** HR replies at 48-65%, so HR is how we get in the
   door. Ops is who keeps us. Those are two different jobs and both are real — but the messaging
   and the rooms should stop treating them as one audience.

Related: [[influence-map]] · [[goals]] · [[wellness-evidence]] · client_roster_target_profile

---

# ⭐ CORRECTION — the proposal check (2026-07-21, run at Will's insistence)

Will refused to let the strategy move on the contacts data alone, and he was right. His
hypothesis: **HR answers the marketing, ops runs the account.** It is now confirmed.

**Method:** the `proposals` table is unusable for this — 305 proposals but only 9 distinct
`client_email` values, and 2 among the approved. `stripe_invoices` holds customer IDs, not
addresses. So instead: search will@'s sent mail for every message containing a
`proposals.getshortcut.co` link. Whoever the link was emailed to IS the addressee.

**51 sent messages, 29 distinct external recipients, 22 with a title on file:**

| Segment | Share |
|---|---|
| **HR / People** | **82%** |
| Exec / owner | 14% |
| Other | 5% |
| **Events / community** | **0%** |
| **Office ops / admin** | **0%** |

Eleven of the 22 are brokers (NFP, Corporate Synergies, OneDigital, EPIC, Risk Strategies) who
received the fund one-pager. **Strip those and the eleven genuine prospects are: nine VP/Head/
Director of People, two founders. Zero operations people.** Kristin Bryan (VP People,
LangChain), Sharon Rosen (Head of People US, Milltown), Naz Hassan (Director People Ops,
LeapXpert), Jourdan Pym (VP People, Karbon), Vy Chen (VP People, HYPR), Brittany Blumenthal (VP
People, HiddenLayer), Spandana Suddapalli (VP People, Vidmob), Rosemary Vargas (VP People,
Securitize), Mia Balabanis (People Ops, Tennr), plus two founders.

## THE RESOLVED PICTURE — two roles, not one buyer

| Stage | Who | Evidence |
|---|---|---|
| Answers the marketing | **HR / People** (48% of positive repliers, 65% of booth) | reply + booth data |
| **Receives the proposal** | **HR / People, 82%** | proposal links, this check |
| **Runs the account** | **Events + office ops, 32%; HR 8%** | `crm_companies.contacts` |

**HR signs. Ops delivers.** The earlier "HR is only 8% of who buys" read was measuring the
wrong end of the deal — those were the coordination contacts, exactly as Will suspected.

## THE STRATEGIC CONSEQUENCE — design for the forward

This is the same shape as the EPIC thread: Will emailed **Craig Hasday, a President**, who never
replied and instead **forwarded it to Kristin**, the practitioner who owns the problem. Senior
person receives, operator executes.

**So the play is not "pick the right person to target." It is: make the note forwardable.**
Written for HR to receive, and constructed so that when they hand it to the office manager or
events lead, it still makes sense to that second reader. Two audiences, one email, and the
second one never gets addressed directly.

## What this does NOT change
- **Targeting stays pointed at HR.** They answer, and they receive the proposal.
- The influence map's HR-first ranking **stands**. Philly SHRM, NYC SHRM, I Hate It Here are
  correctly placed after all.
- **OrgOrg does NOT get promoted to #1.** Office managers coordinate; they are not who the
  proposal goes to.

## What it DOES change
- The **office-manager and events rooms are a RETENTION and expansion channel**, not an
  acquisition one. That is where the people who run our events actually gather, and they are
  the ones who rebook.
- Copy should carry a **second beat aimed at whoever HR forwards it to** — the person who will
  have to run the day, whose real question is "how much work is this for me."
- Dave's original error is now named: **reply and booth data measure marketing response, and
  contact data measures delivery. Neither measures the sale.** The proposal trail was the only
  honest test and it needed a third dataset to see it.
