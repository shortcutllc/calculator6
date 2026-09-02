# Service-page template fills — all 12 services (first pass, 2026-09-02)

Every service poured into the LOCKED massage template, grounded in each service's OWN existing copy
(`src/utils/menuServices.ts` desc/items, `SERVICE_COPY.md`, `serviceContent.ts`), with terminology
fixed (Pros not therapists/estheticians/stylists/technicians; no "oils"; no invented details) and the
head term front-loaded. This is a FIRST PASS — expect Will to iterate each like he did massage.

## Two template variants

- **Template A — Appointment** (massage, assisted stretch, hair, nails, facials, headshots):
  priced **per Pro, per hour** (~3 appts/hr; add Pros for capacity), individual sign-up flow.
  5 choice-cards: **Date · Format · Timing · Preferences & extras · Recurring.**
- **Template B — Group class** (mindfulness, sound bath, yoga, strength & sculpt, dance cardio,
  somatic movement): **one flat price per session, unlimited attendance, in person OR virtual.**
  5 choice-cards: **Date · Class · Length · Reach · Recurring.**

## Shared modules (identical across all 12 — write once, reuse)

- **Trust strip:** "500+ organizations trust Shortcut" + logo row.
- **What makes it Shortcut:** two-viewpoint tech module + approved caption ("Sign-ups run themselves.
  Lines never form. We build the sign-up page. Everyone picks their pro, service and time. You track
  it all and adjust on the fly.") + the two proof cards (ONE VENDOR, EVERY OFFICE / THE WHOLE THING
  HANDLED). Group-class version swaps the tracker copy to attendance, not appointment slots.
- **Proof:** 24% (Gallup) vs 100% (DraftKings) + "90%+ of slots booked, 87% rebook" + DK testimonial.
- **Cities strip:** "Corporate {service}, city by city." + the 7 city links.
- **Cross-sell:** "The same team also runs {other services}. Over a dozen on-site and virtual
  services, all run by one team."
- **CTA + footer.**

### Personalized "THE WHOLE THING HANDLED" line, per service

Personalize the "we bring…" half (carries service-specific nouns = natural keywords); keep the
"you bring…" close constant. Do NOT personalize the ONE VENDOR card the same way — keep the parallel.

| Service | Handled line |
|---|---|
| Massage | We bring the massage chairs, tables, linens and privacy screens. You bring a room and an outlet. |
| Assisted stretch | We bring the tables, straps and mats. You bring a room and an outlet. |
| Hair | We bring the chair, the clippers and brand-name products, and leave the space spotless. You bring a room and an outlet. |
| Nails | We bring the single-use manicure kits, colors and sanitized tools. You bring a table and two chairs. |
| Facials | We bring the skincare, the steamer and the spa setup. You bring a quiet room. |
| Headshots | We bring the lighting, backdrops and retouching. You bring a room and an outlet. |
| Mindfulness | We bring the facilitator, the guided meditation and the handouts. You bring a room or a Zoom link. |
| Sound bath | We bring the crystal singing bowls, the gong and the full instrument kit. You bring a room or a Zoom link. |
| Yoga | We bring the certified instructor and the playlist. You bring a conference room, no mats needed, or a Zoom link. |
| Strength & sculpt | We bring the instructor, the class and optional bands and dumbbells. You bring open space or a Zoom link. |
| Dance cardio | We bring the instructor and the playlist. You bring open space or a Zoom link. |
| Somatic movement | We bring the facilitator, the crystal singing bowls and the movement kit. You bring a room or a Zoom link. |

### VERIFIED keyword volume — US, Keyword Planner, pulled 2026-09-02

| Service | Best head term | Vol/mo | Comp | SEO verdict |
|---|---|---|---|---|
| **Headshots** | **corporate headshots** | **3,600** | LOW | 🟢 highest-value page. (business headshots 3,600; corp headshots near me 1,600; corp headshot photography 210) |
| Massage | corporate massage / corporate chair massage | 320 / 320 | LOW/MED | 🟢 standalone |
| **Mindfulness** | **workplace meditation** | **390** | LOW | 🟢 standalone — but lead "workplace meditation," NOT "corporate mindfulness" (only 50) |
| **Yoga** | **office yoga** | **320** | LOW | 🟢 standalone — lead "office yoga," NOT "corporate yoga" (only 110) |
| Assisted stretch | assisted stretch | 260 | MED | 🟡 thin + consumer-leaning ("near me" 2,400 is B2C intent); standalone optional |
| Hair | (corporate hair ≈ 0) | ~0 | — | 🔴 mobile barber = 6,600 but that's B2C, wrong intent. Hub, don't index for "corporate" |
| Nails | office manicure | 10 | LOW | 🔴 hub / menu item |
| Facials | corporate facials | ~0 | — | 🔴 hub / menu item |
| Sound bath | corporate sound bath | 30 | LOW | 🔴 hub / menu item |
| Dance / Strength / Somatic | corporate fitness classes | 20 | LOW | 🔴 hub — one "wellness classes" page |

**Umbrella terms (for the Solutions/home page, not these service pages):** employer wellness programs 2,900 · corporate wellness platforms 1,900 · corporate wellness programs / company wellness programs 1,600 each · corporate wellness 880 · corporate wellness companies 480.

**Revised page strategy:** index **Headshots, Massage, Mindfulness (as workplace meditation), Yoga (as office yoga)** as full standalone pages. Everything else (hair, nails, facials, sound bath, dance, strength, somatic, and maybe stretch) becomes a section on a **"wellness classes / office services" hub** — thin standalone pages for ~0-volume terms just dilute the cluster.

Recurring discount = **10% at 4+, 15% at 9+** (Will's page call; matches pricing band).

---

## Per-service "handled" lines (THE WHOLE THING HANDLED card)

Personalize the "we bring" half only (carries service-specific nouns = natural keywords); keep "you
bring a room and an outlet" as the constant close. Do NOT personalize the parallel ONE-VENDOR card.

1. **Massage** — We bring the massage chairs, tables, linens and privacy screens. You bring a room and an outlet.
2. **Assisted stretch** — We bring the tables, mats and straps. You bring a room and an outlet.
3. **Hair** — We bring the chair, the clippers, the premium products, and we sweep up after. You bring a room and an outlet.
4. **Nails** — We bring the single-use manicure kits, the colors and sanitized tools. You bring a table and two chairs.
5. **Facials** — We bring the skincare, the steamer and the spa setup. You bring a quiet room.
6. **Headshots** — We bring the lighting, the backdrops and the retouching. You bring a room and an outlet.
7. **Mindfulness** — We bring the facilitator, the guided meditation and the handouts. You bring a room or a Zoom link.
8. **Sound bath** — We bring the crystal singing bowls, the instruments and the setup. You bring a room or a Zoom link.
9. **Yoga** — We bring the certified instructor and the playlist. You bring a conference room, no mats needed.
10. **Strength & sculpt** — We bring the instructor, the class and optional bands or dumbbells. You bring open space or a screen.
11. **Dance cardio** — We bring the instructor, the playlist and the energy. You bring open space or a screen.
12. **Somatic movement** — We bring the facilitator, the crystal bowls and everything for the movement. You bring floor space or a screen.

---

# TEMPLATE A — APPOINTMENT SERVICES

## 1. Massage  (LOCKED — the template itself)
- **Title:** Corporate Chair Massage for Offices | Shortcut
- **H1:** Corporate massage, minus the planning.
- **Subhead:** Licensed Massage Pros turn a meeting room into a spa. You approve a date and we do the rest.
- **Definition H2:** How does our corporate massage experience work?
- **Body:** Our corporate massage experience treats your team to rejuvenating chair or table sessions
  right in the workplace. Our Massage Pros turn a meeting room into a calm, spa-like space, soft
  lighting, quiet music, a little aromatherapy, a real break without anyone leaving the building.
- **Menu:** Chair (neck, shoulders, back, arms) · Table (deeper, full-body) · Sports (deep-tissue
  recovery) · Compression (rhythmic pressure for circulation) · Reiki reset (grounding energy work).
- **Choice cards:** Date "Pick your date." / Format "Chair or table." / Timing "Session length." /
  Preferences & extras "Preferred Pro, and privacy." / Cadence "Recurring." (final copy already approved).
- **FAQ seeds:** cost, COI to building mgmt, headcount math, lead time, space & power.

## 2. Assisted stretch  (Template A)
- **Title:** Corporate Assisted Stretch for Offices | Shortcut
- **H1:** Assisted stretch, minus the PT waiting room.
- **Subhead:** Certified stretch specialists run a Massage-Day-style sign-up, right at the office.
- **Definition H2:** How does our corporate assisted-stretch experience work?
- **Body:** One-on-one assisted stretching with a certified specialist, backgrounds in physical
  therapy, sports massage and PNF/FST. Targeted release for the desk-and-travel tightness that lives
  in necks, shoulders, hips and lower backs. Same easy sign-up as a massage day, ten to twenty minutes
  a person.
- **Menu:** Express chair (any open corner) · Premium table (deeper work, curtained space).
- **Choice cards:** Date "Pick your date." / Format "Chair or table." (express chair vs premium table) /
  Timing "Session length." (10- or 20-minute slots) / Preferences & extras "Preferred Pro, and privacy." /
  Cadence "Recurring." (4+ save 10%, 9+ save 15%).
- **FAQ seeds:** what to wear (normal clothes), space, per-hour capacity, lead time.

## 3. Hair  (Template A)
- **Title:** Corporate Hair & Grooming for Offices | Shortcut
- **H1:** Fresh cuts at the office, minus the midday run.
- **Subhead:** Hair Pros bring the chair, the products and full cleanup. You bring a room.
- **Definition H2:** How does our corporate hair experience work?
- **Body:** Precision cuts, professional styling and grooming, delivered on site by Hair Pros
  experienced with every hair type and texture. Brand-name products, full sanitation between each
  appointment, and the space left exactly as we found it.
- **Menu:** Barber cut (quick cleanups included) · Beard trim (shaping & grooming) · Salon cut & style
  (all hair types) · Blowout (hot-tool styling & touch-ups).
- **Choice cards:** Date "Pick your date." / Format "Cut, style or grooming." / Timing "Session length."
  (20- or 30-minute slots) / Preferences & extras "Preferred Pro, and privacy." / Cadence "Recurring."
- **FAQ seeds:** hair-type range, products, cleanup, space & power, headcount per Pro.

## 4. Nails  (Template A)
- **Title:** Corporate Nail Services for Offices | Shortcut
- **H1:** Manicures at the office, minus the salon run.
- **Subhead:** Nail Pros bring single-use kits and 20+ colors. A polished escape without the trip.
- **Definition H2:** How does our corporate nails experience work?
- **Body:** Manicures and pedicures that mix real relaxation with a little polish. Licensed Nail Pros,
  a fresh single-use kit for every person and sanitized tools between clients, so your team steps away
  refreshed and back at their desk in twenty minutes.
- **Menu:** Classic manicure (shape, buff, cuticle care, polish) · Gel manicure (long-lasting) · Dry
  pedicure (waterless, office-friendly) · Hand treatment (moisturizer + hand massage).
- **Choice cards:** Date "Pick your date." / Format "Manicure or pedicure." / Timing "Session length."
  (20- or 30-minute slots) / Preferences & extras "Colors, and privacy." (20+ colors; screens optional) /
  Cadence "Recurring."
- **FAQ seeds:** hygiene / single-use kits, dry vs water pedicure, colors, space, headcount.

## 5. Facials  (Template A)
- **Title:** Corporate Facials for Offices | Shortcut
- **H1:** Facials at the office, minus the spa day.
- **Subhead:** Skincare Pros bring the spa atmosphere. Express slots, all skin types.
- **Definition H2:** How does our corporate facials experience work?
- **Body:** Professional facials that deep-clean, hydrate and calm, run right in the office by licensed
  Skincare Pros. Express twenty-minute slots, professional-grade products and a little spa atmosphere,
  so people walk back to their desk refreshed.
- **Menu:** Express facial (cleanse & hydration) · Signature facial (full treatment with extractions) ·
  LED light therapy (add-on) · Mask treatments (hydrating & detoxifying).
- **Choice cards:** Date "Pick your date." / Format "Express or signature." / Timing "Session length."
  (20-minute express slots) / Preferences & extras "Add-ons, and privacy." (LED, masks; screens optional) /
  Cadence "Recurring."
- **FAQ seeds:** skin-type range, products / sensitivity, space, headcount, lead time.

## 6. Headshots  (Template A — special: priced per event, retouching included)
- **Title:** Corporate Headshots On-Site | Shortcut
- **H1:** Team headshots, minus the studio trip.
- **Subhead:** A photographer sets up in a conference room. Retouched photos back in 5–7 days.
- **Definition H2:** How does our corporate headshots experience work?
- **Body:** A consistent, professional look across the whole team, shot on site by experienced
  corporate photographers. Expert posing help, optional hair and makeup touch-ups, and professionally
  retouched photos delivered in five to seven business days. Eight to twelve minutes a person.
- **Menu (Formats):** 8–12-minute sessions · optional 10–15-minute hair & makeup touch-ups ·
  delivered in 5–7 business days.
- **Choice cards:** Date "Pick your date." / Format "Backdrop & looks." (multiple backdrops) / Timing
  "Session length." (8–12-minute slots) / Preferences & extras "Touch-ups, and outfit guidance."
  (optional hair/makeup; pre-session guidance) / Cadence "Recurring." (onboarding cohorts, quarterly).
- **Pricing line:** flat event pricing, **retouching included** (not per-Pro-per-hour — confirm whether
  to publish a number).
- **FAQ seeds:** delivery time, retouching, backdrops, touch-ups, space & lighting, per-hour throughput.

---

# TEMPLATE B — GROUP CLASSES  (flat price, whole group, in person OR virtual)

Cards: **Date · Class · Length · Reach · Recurring.** Pricing line: "One flat price per session.
Unlimited attendance, invite the whole floor." Reach card is the big lever — one vendor covers the
building AND the people at home.

## 7. Mindfulness  (Template B)
- **Title:** Corporate Mindfulness & Meditation | Shortcut
- **H1:** Mindfulness at work, minus the offsite.
- **Subhead:** Guided sessions led by the same facilitator every time, in a conference room or on Zoom.
- **Definition H2:** How does our corporate mindfulness experience work?
- **Body:** Guided meditations and practical tools to lower stress and sharpen focus, led by Courtney
  Schulnick, an attorney with two decades of experience and deep training from the Myrna Brind Center
  for Mindfulness. One dedicated facilitator across every session, so the practice actually builds.
- **Menu (Formats):** 30-minute drop-ins & themed sessions · 40- or 60-minute intro courses · in a
  conference room or on Zoom.
- **Choice cards:** Date "Pick your date." / Class "Drop-in or course." / Length "30, 40 or 60 minutes." /
  Reach "In person or on Zoom." / Cadence "Recurring." (a weekly or monthly rhythm builds the habit).
- **FAQ seeds:** virtual vs in-person, group size (unlimited), takeaways (audio + handouts), cadence.

## 8. Sound bath  (Template B)
- **Title:** Corporate Sound Bath for Teams | Shortcut
- **H1:** Sound baths at the office, minus the studio.
- **Subhead:** Crystal singing bowls, led live. A nervous-system reset, not theater.
- **Definition H2:** How does our corporate sound bath experience work?
- **Body:** A group sound bath built around crystal singing bowls, led live by a facilitator with 200+
  hours of sound-healing training. Your team settles in, eyes closed, and lets the tones do the work.
  A real reset for the nervous system, in the office or over video.
- **Menu (Formats):** 30- or 60-minute sessions · in person, virtual or hybrid · sit or lie down, no
  experience needed.
- **Choice cards:** Date "Pick your date." / Class "Sound bath." (or pair with somatic movement) /
  Length "30 or 60 minutes." / Reach "In person, virtual or hybrid." / Cadence "Recurring."
- **FAQ seeds:** what happens / what to expect, space needed, group size, virtual setup.

## 9. Yoga  (Template B)
- **Title:** Corporate Yoga, In-Office or Virtual | Shortcut
- **H1:** Yoga at the office, minus the studio membership.
- **Subhead:** RYT-200+ instructors, the same teacher every time. Chair or mat, in person or livestreamed.
- **Definition H2:** How does our corporate yoga experience work?
- **Body:** Live yoga led by RYT-200+ certified instructors, the same teacher every time so the team
  finds a rhythm. Chair classes run in any conference room with zero equipment; mat classes range from
  gentle flow to restorative. Remote teams join the livestream.
- **Menu (Formats):** chair yoga (no mats, no changing) · vinyasa or restorative + yin (60 min) ·
  virtual livestream for remote teams.
- **Choice cards:** Date "Pick your date." / Class "Chair, flow or restorative." / Length "30 or 60
  minutes." / Reach "In person or livestreamed." / Cadence "Recurring."
- **FAQ seeds:** equipment (none for chair), levels/modifications, space, virtual, group size.

## 10. Strength & sculpt  (Template B — low SEO; consider hub)
- **Title:** Corporate Strength Classes, In-Office or Virtual | Shortcut
- **H1:** Strength classes at work, minus the gym.
- **Subhead:** A full-body class that scales to every level, on the spot. In person or over video.
- **Definition H2:** How does our corporate strength class work?
- **Body:** A full-body strength class that meets every fitness level. Bodyweight, light dumbbells or
  bands build strength, posture and stability, and a trained instructor scales every move up or down
  on the spot, so nobody feels behind.
- **Menu (Formats):** 30- or 60-minute classes · in person or live over video · bodyweight, dumbbells
  or bands.
- **Choice cards:** Date / Class "Strength & sculpt." / Length "30 or 60 minutes." / Reach "In person
  or over video." / Cadence "Recurring."
- **FAQ seeds:** equipment (optional), fitness levels, space, virtual.

## 11. Dance cardio  (Template B — low SEO; consider hub)
- **Title:** Corporate Dance Cardio Classes | Shortcut
- **H1:** Dance cardio at work, minus the gym class.
- **Subhead:** More good playlist than workout. Simple moves, every level moving.
- **Definition H2:** How does our corporate dance cardio class work?
- **Body:** An upbeat, music-driven cardio class that reads more like a good playlist than a workout,
  led by a trained dancer who keeps every level moving. Simple moves anyone can follow, dialed from
  full-out to low-impact, in the office or over video.
- **Menu (Formats):** 30- or 60-minute classes · in person or live over video · comfortable clothes,
  no experience.
- **Choice cards:** Date / Class "Dance cardio." / Length "30 or 60 minutes." / Reach "In person or
  over video." / Cadence "Recurring."
- **FAQ seeds:** fitness level, space, virtual, group size.

## 12. Somatic movement  (Template B — low SEO; consider hub)
- **Title:** Corporate Somatic Movement + Sound Bath | Shortcut
- **H1:** Movement and sound at work, minus the offsite.
- **Subhead:** Gentle somatic movement, then a crystal sound bath. One facilitator, both halves.
- **Definition H2:** How does our corporate somatic movement experience work?
- **Body:** Gentle somatic movement first, crystal sound bath second, led by one facilitator trained
  in both. Slow, guided movement unwinds what the body has been holding, then the bowls carry it the
  rest of the way from wired to rested.
- **Menu (Formats):** 30- or 60-minute sessions · in person or live over video · standing, seated or
  on the floor.
- **Choice cards:** Date / Class "Movement + sound." / Length "30 or 60 minutes." / Reach "In person
  or over video." / Cadence "Recurring."
- **FAQ seeds:** what to expect, space, virtual, no experience needed.

---

---

## HEADSHOTS — FULL PAGE (locked exemplar draft, 2026-09-02)

The appointment-template exemplar. Index priority #1 (corporate headshots 3,600/mo). Grounded in
`serviceContent.ts:166-241`, `EmployeeGallery.tsx`, and the Kemp beat. Awaiting Will's line pass.

- **Title tag:** Corporate Headshots, On-Site Nationwide | Shortcut
- **Meta desc:** On-site corporate headshots for your whole team. A photographer sets up in a
  conference room, retouched photos back in 5–7 days, from $1,999. Trusted by 500+ companies.
- **Breadcrumb:** Home / Services / Corporate headshots
- **H1:** Team headshots, minus the studio trip.
- **Hero subhead:** A photographer sets up in a conference room. Everyone sits for ten minutes,
  retouched photos land in 5–7 days, and no one leaves the building.
- **CTAs:** Get a quote · See pricing

**Definition H2:** How does our corporate headshots experience work?
Body: Our corporate headshots experience gives the whole team one consistent, professional look, shot
on site by experienced Headshot Pros. Expert posing help, optional hair and makeup touch-ups, and
professionally retouched photos back in five to seven business days. Eight to twelve minutes a person,
nobody leaves the building.

**Menu (What's included):** Outfit guidance (pre-session) · Multiple backdrops · Optional hair & makeup
touch-ups · Professional retouching, every photo · Delivered in 5–7 business days.

**Choice cards (appointment template):**
- 01 Date · "Pick your date." — Tell us the day. We build everything around it.
- 02 Format · "Backdrops & looks." — Choose from multiple backdrops. One clean, consistent look for the team.
- 03 Timing · "Session length." — Eight to twelve minutes a person. A whole team in a day.
- 04 Preferences & extras · "Touch-ups, and outfit guidance." — Optional hair and makeup before the
  camera, plus a quick outfit consult so everyone shows up ready.
- 05 Cadence · "Recurring." — Bring us back for new hires each quarter. 4+ events save 10%, 9+ save 15%.

**Pricing H2:** Simple, all-in pricing.
Body: From $1,999, $80 to $100 a person, retouching included. No per-day studio rate, no travel
fees, no surprise line items. [CONFIRM exact published number with Will before ship.]

**What makes it Shortcut (headshots keeps Pros, NOT a facilitator — two tech moments):**
- Caption under the module: "Sign-ups run themselves. Everyone books a slot, sits for ten
  minutes, then picks their favorite shot from a private gallery. We retouch it and send it back,
  ready for LinkedIn."
- **Module A — the sign-up** (shared): employees book their headshot slot, you track it and adjust on the fly.
- **Module B — the gallery demo** (UNIQUE, the hero animation): private gallery link → status pill
  "Pick your photo" → click to select (coral border, "2 of 3 picked" counter fills) → "Confirm my pick"
  → "We're retouching your pick now, we'll email you when it's ready" → **Download**. Payoff line lifted
  verbatim: "What retouching includes. Subtle, natural, still you." (softening fine lines, tidying
  flyaways, removing temporary blemishes, evening out glare, smoothing fabric).
- Two cards below: ONE VENDOR, EVERY OFFICE (same Headshot Pros and standard across every office,
  nationwide) / THE WHOLE THING HANDLED (we bring lighting, backdrop and retouching; you bring a room
  and an outlet).

**Proof:** shared 24%-vs-100% + 90%/87% + DraftKings testimonial. (Add a headshot case study with real
numbers ONLY if we have one — do not invent Kemp-style stats.)

**Cities:** "Corporate headshots, city by city." + 7 city links + "See every city we cover." Beats Kemp's
regional framing by naming markets + nationwide.

**Cross-sell:** The same team also runs massage, nails, facials and mindfulness. Over a dozen on-site
and virtual services, all run by one team. + bundle wedge: "Pair headshots with a wellness day" (Kemp
can't offer this).

**FAQ (12 Q — beats Kemp's 8):** How many can you shoot in a day? · How long per person? · How do
people get their photos? · Is retouching included? · How fast are the finals? · What does it cost? ·
Do you handle multiple offices? · What about new hires? · Can we add hair and makeup? · What do we
need to provide? · What should people wear? · Do you do branding or lifestyle photos too?

**Schema:** Service + FAQPage + BreadcrumbList + Organization + WebPage + WebSite (Kemp renders none — our edge).

---

## Facilitator bios + the group-class module (Will's point #1)

**Decision:** on GROUP-CLASS pages, the "we handle everything" slot swaps the **Pros / one-vendor card
for a FACILITATOR BIO module** ("Your facilitator"), mirroring `FacilitatorCard.tsx` (eyebrow renders
"Your facilitator"). Named expert > generic "Pros" for these.

- **Courtney Schulnick — mindfulness.** Title: *Shortcut's Mindfulness Meditation Leader.* Bio (verbatim,
  `serviceContent.ts:1418-1425`): "Courtney Schulnick, an attorney with two decades of experience, now
  leads mindfulness programs at Shortcut. With extensive training from the Myrna Brind Center for
  Mindfulness, she brings a unique perspective to corporate wellness. Her workshops give employees real
  tools for handling stress, sharpening focus, and getting through the harder parts of work."
- **Kirsten Smits — sound bath, somatic movement, stretch/mobility, dance cardio, strength & sculpt, reiki.**
  Title: *Movement, Sound & Reiki Specialist.* Bio (verbatim, `serviceContent.ts:1429-1436`): "Kirsten
  Smits is a New York based wellness facilitator, movement specialist, sound healing practitioner, and
  Reiki Master who designs engaging wellness experiences for luxury hospitality, corporate organizations,
  healthcare institutions, and private clients... She has collaborated with leading brands and
  institutions including Burberry, Samsung, Manolo Blahnik, NYU Langone, Columbia University, Casa
  Cipriani, and more." (Named clients are real receipts — usable.)
- **Yoga is NOT Kirsten** — generic RYT-200+ instructors, "same teacher every time." Use a lighter
  "your instructor" line, no named bio.
- **Facilitator photos (for the design agent):** Courtney = `/Holiday Proposal/Our Services/Mindfulness/Courtney Frame 2x.webp`
  (fallback `/Holiday Proposal/Our Services/Mindfulness/Courtney Frame 2x.png`), both under `public/`.
  Kirsten = `/kirsten-profile.jpg` under `public/`, object-position `top center`. (Source:
  `serviceContent.ts:1421-1433`.)

**Terminology rule across the family:** appointment services = **Pros** (convert the source's
therapist/esthetician/stylist/technician/photographer). Group classes keep **facilitator / instructor /
teacher** — don't force "Pro" onto Courtney or a yoga teacher. (Source copy is inconsistent
facilitator/instructor/specialist/practitioner; pick one per service, don't mix mid-page.)

**Use the real standalone copy, not my paraphrase**, for each group class's menu + benefits — verbatim
`whyShortcut` / `benefits` / `whatsIncluded` / `features` live at: mindfulness `serviceContent.ts:628-687`,
sound-bath `689-750`, yoga `752-810`, strength-sculpt `1198-1260`, dance-cardio `1133-1197`,
somatic (`somatic-sound-bath` `1003-1067`, `stretch-mobility` `1068-1132`). Recurring theme worth
lifting: "What we bring" + "What your team takes home" + "Format options: in-person / virtual / hybrid."

---

## Headshots — deep spec (Will's point #2)

**Keyword:** corporate headshots **3,600/mo LOW** (head term) + "onsite corporate headshots" = the
least-contested national angle (Kemp audit — all rivals are single-market photographers). Lead H1/title
with **"corporate headshots"** + "on-site."

**Competitor benchmark = Headshots by Kemp** (`shortcut/seo-research/2026-08-audit-headshots.md` +
`seo-plan.md`; our headshots page was reverse-engineered from their ~2,600-word /corporate page).
- Kemp H1: "Onsite Corporate Headshots & Branding." Emphasis order: on-site zero-lift ("send your team a
  calendar invite") → same-week turnaround → multi-office scale → photographer coaching → 150/day throughput.
- Kemp numbers: **$4,000–5,000/day**, 150/day, 2–3 min/person, case studies (890 employees/12 states;
  552 headshots in a month), finals "that week." No JSON-LD schema (our edge).
- **MATCH:** the concrete process walkthrough, per-person time + per-day throughput, same-week turnaround,
  a new-hire answer, 2–3 case studies with real numbers.
- **BEAT:** publish transparent price — **from ~$1,999 / ≈$80–100 per person, retouching included** (our
  seo-research figure) — visibly undercutting their $4–5k/day; add the **hair/makeup + wellness-day bundle**
  Kemp structurally can't offer; ship **schema (Service + FAQPage + BreadcrumbList)** they lack; a 10–12-Q FAQ;
  name our 33 markets vs their Orange-County-plus-national framing.
- **This answers the earlier "publish a number?" question: YES — we have a transparent price that beats Kemp.**

**Two tech moments to show (Will's point #2) — both real:**

(a) **Day-of sign-up** — same shared sign-up module as every service (employees book a headshot slot).
NOTE: that slot-booking is the separate Parse "Coordinator" `sign_up_links` system (outside the
proposal/gallery repo), not the gallery app. Will's point stands (headshots does use the main sign-up
for the day-of); it's just a different codebase from the gallery.

(b) **The private gallery / pick-your-photo flow** — UNIQUE to headshots, and the best thing on the
whole page to animate. Source: `EmployeeGallery.tsx` (token-routed). Real workflow:
- Status enum (`types/headshot.ts:25`): `pending → photos_uploaded → selection_made → retouching → completed`.
- Each employee gets a private gallery via a crypto-random 32-byte `unique_token` link (no login).
- **The demo (mirror the real UI):** status pill "Pick your photo" → "Selection confirmed" → "Final photo
  ready." State-aware headline "Choose your headshot." → "Nice pick, {name}." → "Your headshot is ready."
  Photo grid, click to select (coral border + check badge), an ActionRail counter that fills live
  ("**2 of 3 picked**") with thumbnail slots, a "Notes for our retouchers" field, a coral **Confirm my
  pick** button, reassurance "You can change your mind until you confirm," then "We are retouching your
  pick now. We'll email you when it's ready," then a **Download** button on the final.
- **Retouching payoff copy (verbatim, `EmployeeGallery.tsx:743-759`) — use it:** "What retouching
  includes. Subtle, natural, still you." → softening fine lines, tidying flyaways, removing temporary
  blemishes, evening out glare, smoothing fabric.
- Delivery **5–7 business days**; **12 min** per person; retouching **included**.

**Headshot standalone copy (verbatim, `serviceContent.ts:166-241`) to SEO-optimize, not reinvent:**
whyShortcut = Professional Photographers (→ **Headshot Pros**) / All-Inclusive Pricing / Expert Posing
Guidance / Fast Turnaround (5–7 days). whatsIncluded = Outfit Guidance / Background Selection /
Hair + Makeup Touch-ups / Professional Retouching. features = lighting, posing, 5–7-day turnaround,
pre & event-day support.
⚠️ **Spine-violation flag:** the source benefit **"Brand Consistency"** is on the known-bad list
(same family as "Productivity Boost / Team Morale" flagged live in the proposal viewer). Do NOT carry
it onto the marketing page — reframe to the outcome (people show up / a look the whole team is proud of).

**FAQ to answer** (Kemp's set + ours): people per day, how participants get images, time per person, do you
schedule each person, multi-office handling, retouching included, new-hire process, branding/lifestyle add-on,
turnaround, transparent pricing.

---

## Open items before locking any of these
1. ✅ **Keyword volume pulled** (2026-09-02, table above). Headshots is the giant (3,600); mindfulness
   leads on "workplace meditation" (390) and yoga on "office yoga" (320), NOT the "corporate X" terms.
2. **12 pages vs hub** — index Headshots / Massage / Mindfulness / Yoga; **hub** hair, nails, facials,
   sound bath, dance, strength, somatic (and maybe stretch) under one "wellness classes / office services"
   page. Thin pages for ~0-volume terms dilute the cluster.
3. ✅ **Headshots gallery-tech demo** — specced from `EmployeeGallery.tsx` (see Headshots section).
4. **Group-class facilitator module** — design needs a "Your facilitator" bio card (Courtney / Kirsten)
   in place of the Pros card.
5. Each service still needs Will's line-by-line pass (massage took ~15 rounds).
