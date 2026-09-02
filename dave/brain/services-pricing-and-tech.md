# Services pricing math + how to talk about the tech

Pricing bands + the tech story for service pages. For copy voice, terminology, and SEO, see
**service-page-copy-rules.md** (that file owns "Pros not therapists," don't-invent, keyword data).

## Part 1 — Pricing math (source: docs/SERVICES.md → proposalGenerator.ts)

Two billing models. Every service is exactly one.

**Flat group class** (mindfulness, sound bath, yoga, 2026 movement/sound classes):
- Client pays one `fixedPrice` per session; whole group attends (appointments = "unlimited").
- Priced from a catalog; each duration (30/40/60 min) is its own entry.
- Examples: Intro to Mindfulness 40min $1,375 (default) / 60min $1,500; Sound Bath 60min $1,500;
  Chair Yoga 30min $650; Dance Cardio / Strength & Sculpt 60min $1,250.

**Individual appointment** (massage, facial, hair, nails, makeup, reiki, assisted stretch):
- **Client price = totalHours × hourlyRate × numPros**
- **Capacity = floor(totalHours × (60 / appTime) × numPros)**
- hourlyRate (client) = **$150 per Pro per hour** for most; **Reiki $200**. Pro pay = $50/hr.
  earlyArrival $25/Pro is pro-pay only (NOT in client price).
- Headshot special: serviceCost = totalHours × numPros × $400/hr + appointments × $40/photo; 80% to Pro.

Throughput per Pro per hour: **20-min = 3**, **15-min = 4**, 12-min = 5, 30-min = 2.

**Massage worked examples (client price, PRE-discount, at $150 per Pro per hour):**

| People | 20-min (3/hr) | 15-min (4/hr) |
|---|---|---|
| 24 | 2 Pros × 4 hrs = **$1,200** | 2 Pros × 3 hrs = **$900** |
| 36 | 3 Pros × 4 hrs = **$1,800** | 3 Pros × 3 hrs = **$1,350** |
| 60 | 5 Pros × 4 hrs = **$3,000** | 5 Pros × 3 hrs = **$2,250** |

- Price depends ONLY on total Pro-hours (Pros × hours); appointment length only sets people-per-hour.
- **15-min is exactly 25% cheaper than 20-min** for the same headcount.
- Pros↔hours trade freely: 60 ppl/20-min = 5×4 hrs OR 4×5 hrs, both $3,000.
- Recurring discounts in the ENGINE: **15% at 4+ events, 20% at 9+**. NOTE: the massage service PAGE
  publishes **10% / 15%** per Will's design call — page ≠ engine; reconcile if it ever matters.
- Publishable massage price = **$150 per Pro, per hour**; typical event $900–$3,000; 24–36-person
  events land **under $2,000** (backs "first events under $2,000").

Appointment defaults (SERVICE_DEFAULTS): Massage 20min/4hr/2pro · Facial 20/4/2 · Hair 30/6/2 ·
Nails 30/6/2 · Makeup 30/4/2 · Reiki 60/4/2 @$200 · Assisted Stretch 20/4/2 · Headshot 12min/5hr/1pro.

## Part 2 — How to talk about the technology (the reconciliation)

The spine says "NEVER sell the technology" — but that bans selling it AS A PRODUCT ("our platform /
app / software," SaaS feature-grids, "powered by AI"), because that makes us look like the
directories we beat. The spine's own words: **"Show what it does for them."** So: **lean all the way
into what the tech DOES (the coordination work that vanishes); never frame it as a software product.**
Leaning in is correct; product-framing is not.

The tech is the PROOF that "zero lift for managers" is literally true — a hero module, never a footnote.

### APPROVED VERBATIM tech copy (Will, 2026-09-01) — IMMUTABLE, use these words

Do NOT invent new tech phrasing. When a surface talks about the sign-up experience, pull from
these approved blocks (byte-for-byte). Two registers:

**Short / punchy (eyebrow + two lines + body):**
> No lines, no chasing
> **Sign-ups run themselves.**
> **Lines never form.**
> We build the sign-up page. Everyone picks their pro, service and time. You track it all and adjust on the fly.

**Fuller (heading + body):**
> **Technology employees and managers love.**
> We curate a sign-up experience unique to your company, where attendees can choose their Pro, service, and appointment time. As a manager, you can track sign-ups and make adjustments on the fly.

Canonical verbs/phrases from these: "sign-ups run themselves," "lines never form," "we build the
sign-up page," "everyone picks their pro, service and time," "track it all and adjust on the fly,"
"a sign-up experience unique to your company," "technology employees and managers love." Reuse these;
don't reword them into something "better."

**Every surface frames it as work-removal (never a spec sheet):**
- Live getshortcut.co: "attendees choose their Pro, service, and appointment time" · "as a manager,
  you track sign-ups and make adjustments on the fly" · "we do the rest."
- Homepage concept: "Sign-ups run themselves. Lines never form. We build the sign-up page. Everyone
  picks their Pro, service and time. You track it all and adjust on the fly."
- Proposals: "Effortless scheduling" · "easy online booking with automated reminders."

**Two-viewpoint tech module for service pages** (the manager half is what we under-show). Label it
with APPROVED words only:
- Employee side: the sign-up flow — pick Pro / service / time. (NOT "You're booked / auto text
  reminder" — those were mine, not approved.)
- Manager side: the live tracker — fill %, "X of Y booked," and the approved verb **"adjust on the
  fly."** The manager's relief, not "our dashboard."
- ⚠️ "Watch it fill" and "Never touch a spreadsheet" were MINE, NOT approved — do not use them.
  If words are needed, pull from the approved blocks above ("track it all and adjust on the fly").

Never write "our platform / software / app," SaaS feature lists, "powered by AI." Always write the
disappearing work.
