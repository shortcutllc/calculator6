# Workhuman Live 2026 — Booth Build Plan

## Conference: April 27-29, Gaylord Palms, Orlando
## Budget: $30,000
## Space: Gratitude Garden massage activation (5 stations)

---

## Booth Layout (v13 — locked)

### Space Description
- Wider than deep, roughly 2:1 ratio
- Back wall: wood panel with sunrise graphic, Shortcut logo + "Slack. Zoom. Shortcut. One of these helps your team relax."
- Left side: 2 massage stations with 1 privacy screen between them
- Right side: 3 massage stations with 2 privacy screens (between 1st/2nd and 2nd/3rd)
- Privacy screens: navy blue with coral/orange edges, perpendicular to back wall creating individual bays
- Front-left: TV + bar-height charging table with stools
- Front-right: White curved check-in kiosk with Shortcut logo, iPad, towels, giveaways
- Hedges: thick green border along both sides and front, wrapping corners
- Center: open floor space
- Lounge: 2 chairs + small table, front-left area in front of left hedge
- Ambient warm lighting at each massage station
- Potted tropical plants throughout

---

## Phase 1: Physical Elements (Order by April 1)

### Privacy Screen Panels
- 3 screens total, both sides brandable (6 panel faces)
- Navy background, coral accents, Shortcut logo
- Copy lines (one per screen face):
  - "This meeting could have been a massage"
  - "6 SaaS tools to help your team work better. And one to help them feel like humans again."
  - "Real wellness, right between meetings."
  - "Wellness shouldn't be another thing to manage. That's our job."
  - "Slack, Zoom, Shortcut. One of these tools helps your team relax."
  - (6th face TBD)
- **Blocker:** Need exact dimensions from vendor

### Charging Bar + TV Setup
- Tall bar-height table (light wood top, white base) + 3-4 bar stools
- Mounted flat-screen TV integrated with or behind the bar
- Positioned front-left of the space
- TV content: looping web app (copy slides, video clips, QR code, live stats)
- Charging station sign: "Currently recharging. Both of you."
- **Action:** Source from Orlando event rental company

### Check-in Counter Branding
- White curved desk — Shortcut logo + simple copy vinyl wrap/decal
- iPad for booking, tray of rolled cold towels, giveaway display
- **Blocker:** Confirm counter dimensions with Workhuman

### Giveaway Production (order by April 7)
- Branded sleep eye masks ("Slack. Zoom. Shortcut." line)
- Desk coasters ("This meeting could've been a massage.")
- DND door hangers ("Employee is recharging. Check back never.")
- Microfiber cloths or tote bags with copy lines
- Facial mist / aromatherapy balls

### Ambient Elements
- Scent diffusers
- Warm uplighting for each massage bay
- Curated spa music playlist
- Additional potted tropical plants

### Staff Attire
- Branded polos or aprons for Shortcut team

---

## Phase 2: Digital Builds (Start immediately)

### TV Content Loop Web App
- Fullscreen web page running on the mounted TV
- Timed rotation: copy slides, video clips, QR code for booking, live stats, testimonials
- Built as a route in the calculator6 app or standalone page

### Lite Booking / Sign-Up Page
- Streamlined booking for pre-event and on-site walk-ups
- Fields: name, email, company, title, time slot, 1-2 qualifying questions
- Branded with Recharge theme, mobile-friendly (iPad + phone)
- Auto-loads landing page after booking
- Includes conference map showing Gratitude Garden location

### Confirmation Flow
- Email (SendGrid) + SMS (Twilio) after booking
- Appointment details, what to expect, conference map

### Post-Event Messages
- Thank you email/text with brochure link
- Calendly link for follow-up meeting

### QR Codes
- Links to booking page for on-site signage

### Customizations (from coordinator system)
- Lite sign up page
- Confirmation email and texts
- Completion/thank you email/text
- Workhuman pricing ($0 — sponsor-covered)

---

## Phase 3: Sales Collateral & Outreach (Start by April 7)

### Pre-Event Outreach
- Target: HR leaders, People Ops VPs, CHROs at 2,500+ employee companies
- "VIP reserved massage slots" as meeting hook
- 4-6 week cadence before conference

### Printed Brochure/Flyer
- Headline: "Real wellness, right between meetings."
- Services overview, client logos, CTA

### Sales One-Pager
- For post-massage conversations at the charging bar
- "We create space to reset. You just pick the room."

### Post-Event Follow-Up Cadence
- Day 1: Hot leads (booked + had conversation)
- Day 7: Warm leads (booked but no deep convo)
- Day 30+: Cool leads (nurture sequence)
- Email + LinkedIn + phone

---

## The Experience Flow
1. Attendees book ahead via online reservation (captures name, email, company, title, qualifying Qs)
2. Arrive at check-in desk, greeted by name
3. Handed a chilled scented towel (immediate sensory shift)
4. Offered phone charging station: "Want to let your phone recharge while you do?"
5. Walk through hedge line into massage zone — privacy screens, ambient lighting, spa atmosphere
6. Branded eye mask offered before 15-minute massage
7. Return to pick up phone — **key sales moment** (relaxed, grateful, natural conversation window)
8. Receive giveaway and brochure

---

## Key Copy Lines
| Line | Placement |
|------|-----------|
| "Slack. Zoom. Shortcut. One of these helps your team relax." | Back wall, branded eye masks |
| "Real wellness, right between meetings." | Brochure, signage near check-in |
| "We make it easier to pause — without rescheduling your whole day." | Pull-up banner, pre-event emails |
| "We create space to reset. You just pick the room." | Sales one-pager, post-event follow-up |
| "Currently recharging. Both of you." | Phone charging station signage |
| "This meeting could've been a massage." | Desk coaster giveaway |
| "Employee is recharging. Check back never." | DND door hanger giveaway |

---

## Key Dates
| Date | Milestone |
|------|-----------|
| March 24 | Finalize booth layout (DONE — v13 locked) |
| April 1 | Order privacy screens, giveaways, staff attire |
| April 7 | Digital builds complete (booking page, TV loop, confirmation flow) |
| April 14 | Pre-event outreach begins |
| April 21 | All collateral printed and shipped |
| April 25 | Team arrives Orlando, setup day |
| April 27-29 | Workhuman Live — activation live |
| April 30 | Post-event follow-up begins |

---

## Brand Details
- **Colors:** Coral (#E85D4A), Navy (#1B3A5C), warm neutrals (light wood, white, cream)
- **Voice:** Dry, deadpan humor. Self-aware. Anti-corporate-wellness-cliché.
- **Aesthetic:** Premium, calming, spa-like. Boutique wellness studio dropped into a convention center.

---

## Tools & Integrations Set Up
- **Blender MCP** — connected for 3D booth rendering (uvx blender-mcp, port 9876)
- **Gemini Image Gen (mcp-image)** — available for panel/collateral design
- **OpenAI Image Gen** — script at `.claude/generate-image.cjs`
- **Workhuman Project Tracker** — live at `/workhuman` route with task management per section
