# Shortcut Services & Pricing — Reference

The single authoritative overview of **what Shortcut offers, how each service works, and how it's priced.** Written for onboarding an agent (or a person) to the proposal system.

> **Keep this accurate.** Every number and blurb here is copied from source. When a service, price, or description changes in code, update this file. The source-of-truth files are listed at the bottom — this doc summarizes them, it does not replace them.

---

## 1. The two billing models

Every service is exactly one of two models. This is the single most important thing to understand.

| | **Flat group class** | **Individual appointment** |
|---|---|---|
| **Who** | mindfulness, sound bath, yoga, and all 2026 movement & sound classes (Crystal Sound Bath, Somatic + Sound Bath, Stretch/Mobility, Dance Cardio, Strength & Sculpt) | massage, facial, hair, nails, makeup, headshot, **reiki**, assisted stretch |
| **Client pays** | one flat `fixedPrice` **per session** | `totalHours × hourlyRate × numPros` |
| **Appointments** | `"unlimited"` (whole group attends) | computed: `floor(totalHours × (60 / appTime) × numPros)` |
| **Duration** | `classLength` (30 / 40 / 60 min), chosen from a **catalog** | `appTime` (minutes per appointment) |
| **Priced from a catalog?** | Yes — `src/utils/*Catalog.ts` | No — priced live from the params below |

The engine decides which model applies via the `isMindfulness` flag in `calculateServiceResults` (`src/utils/proposalGenerator.ts`). Despite the name, that flag means "flat-class" and includes sound bath, yoga, and the movement services.

---

## 2. Service catalog

### 2a. Flat group classes (priced from a catalog)

Each catalog entry is `{ id, name, classLength, fixedPrice, description }`. Duration is not a field you type — **each duration is its own catalog entry**, so switching 30↔60 min swaps price + length together.

**Mindfulness** — `src/utils/mindfulnessCatalog.ts` · facilitator: **Courtney Schulnick**

| Offering | Length | Price |
|---|---|---|
| Mindful Eating & Breath Awareness | 30 min | $1,250 |
| Movement & Scan | 30 min | $1,250 |
| Drop-in Session | 30 min | $1,250 |
| Intro to Mindfulness | 40 min | $1,375 *(default)* |
| Intro to Mindfulness | 60 min | $1,500 |
| Mindful Movement | 60 min | $1,500 |
| Speak & Listen | 60 min | $1,500 |

**Sound Bath** — `src/utils/soundBathCatalog.ts`

| Offering | Length | Price |
|---|---|---|
| Sound Bath | 30 min | $1,250 |
| Sound Bath | 60 min | $1,500 *(default)* |

**Yoga** — `src/utils/yogaCatalog.ts`

| Offering | Length | Price |
|---|---|---|
| Chair Yoga | 30 min | $650 *(default)* |
| Vinyasa Flow | 60 min | $1,150 |
| Restorative + Yin | 60 min | $1,250 |

**2026 Movement & Sound** — `src/utils/movementCatalog.ts` · facilitator: **Kirsten Smits** · default entry is the 60-min

| Service | 30 min | 60 min |
|---|---|---|
| Crystal Sound Bath | $1,250 | $1,500 |
| Somatic Movement + Crystal Sound Bath *(in-person)* | $1,500 | $1,750 |
| Stretch, Mobility & Somatic Recovery | $1,000 | $1,250 |
| Dance Cardio | $1,000 | $1,250 |
| Strength & Sculpt | $1,000 | $1,250 |

> **Pricing rationale for the 2026 movement & sound menu:** these are marked up to **at least 2× Kirsten's provider fee** (so Shortcut keeps at least what she does), and anchored to the existing menu + corporate market rates. Format (in-person / virtual) is display-only and does not change price.

### 2b. Individual appointment services (priced live)

Client price = `totalHours × hourlyRate × numPros`. Defaults below are the starting values when a service is added (staff adjust per proposal). Source: `SERVICE_DEFAULTS` in `src/components/ProposalViewerV2.tsx`.

| Service | appTime | totalHours | numPros | hourlyRate (client) | proHourly (pro pay) | earlyArrival | notes |
|---|---|---|---|---|---|---|---|
| Massage | 20 min | 4 | 2 | $150 | $50 | $25 | chair or table |
| Facial | 20 min | 4 | 2 | $150 | $50 | $25 | |
| Hair | 30 min | 6 | 2 | $150 | $50 | $25 | |
| Nails | 30 min | 6 | 2 | $150 | $50 | $25 | classic or + hand massage |
| Makeup | 30 min | 4 | 2 | $150 | $50 | $25 | |
| Hair + Makeup | 20 min | 4 | 2 | $150 | $50 | $25 | |
| **Reiki Reset** | 60 min | 4 | 2 | **$200** | $50 | $25 | 15 or 60-min sessions; Kirsten |
| Assisted Stretch | 20 min | 4 | 2 | $150 | $50 | $25 | 1-on-1, chair or table |
| **Headshot** | 12 min | 5 | 1 | — | $400 | — | see special formula below |

---

## 3. Pricing engine

Core function: `calculateServiceResults` in `src/utils/proposalGenerator.ts`.

**Flat group class:**
```
serviceCost = fixedPrice          // straight from the catalog
proRevenue  = serviceCost × 0.30  // (labeled 30% margin)
appointments = "unlimited"
```

**Standard appointment (massage, facial, hair, nails, makeup, reiki, stretch):**
```
serviceCost  = totalHours × hourlyRate × numPros
proRevenue   = totalHours × numPros × proHourly + earlyArrival × numPros
appointments = floor(totalHours × (60 / appTime) × numPros)
```
Example — reiki default: 4 × $200 × 2 = **$1,600**, 8 appointments.

**Headshot (special):**
```
serviceCost = totalHours × numPros × proHourly + appointments × retouchingCost
proRevenue  = serviceCost × 0.80        // 80% to pro, 20% to Shortcut
```
Default retouchingCost = $40/photo; proHourly (photographer) = $400/hr.

**Discounts (applied after serviceCost, both models):**
- **Per-service discount:** `serviceCost × (1 − discountPercent/100)`.
- **Volume discount** (driven by total selected events across the proposal): **15% at 4+ events, 20% at 9+**. See `useServiceSelections.ts` and `calculateRecurringDiscount`.

**Selection-aware totals:** when a proposal is in "let the client build it" mode, only *included* services count toward the price. Logic lives in `src/components/proposal/useServiceSelections.ts`.

---

## 4. Service descriptions (customer-facing blurbs)

The short blurb each prospect reads on the service card. Source: `SERVICE_DESC` in `src/components/proposal/data.ts`. All written to the brand voice guide (`memory/brand_voice_copywriter.md`).

- **Massage** — "Treat your team to rejuvenating chair or table massage sessions right in the workplace…"
- **Reiki Reset** — "One-on-one Reiki sessions, right in the office. A trained practitioner guides each person through fifteen or sixty minutes of grounding and deep rest that calms the nervous system…"
- **Crystal Sound Bath** — "A group sound bath built around crystal singing bowls. Your team settles in, eyes closed, and lets the tones do the work…"
- **Somatic Movement + Crystal Sound Bath** — "Gentle somatic movement first, crystal sound bath second…"
- **Stretch, Mobility & Somatic Recovery** — "A guided group class for bodies that sit all day, and a reset after conferences, travel, or long stretches at a desk…"
- **Dance Cardio** — "An upbeat, music-driven cardio class that reads more like a good playlist than a workout…"
- **Strength & Sculpt** — "A full-body strength class that meets every fitness level…"
- **Sound Bath**, **Yoga**, **Assisted Stretch**, **Headshot**, **Mindfulness**, **Facial**, **Nails**, **Hair**, **Makeup** — all in the same file.

> The full text of every blurb is in `SERVICE_DESC`. Read it there rather than paraphrasing.

---

## 5. "What a session/day looks like" content

The expandable card section (and the bottom-of-proposal detail). Source: `SERVICE_CONTENT` in `src/components/proposal/sections/serviceContent.ts`, keyed by service type.

Each entry has this shape:
```ts
{
  label,                 // service name
  whyShortcut: [{ title, description }],       // 3 trust bullets (bottom "Why Shortcut" section)
  benefitsHeading, benefits: [{ iconName, title, description }],       // "What your team takes home"
  whatsIncludedHeading, whatsIncluded: [{ iconName, title, description }], // "What we bring"
  featuresHeading, features: [string],         // "Format options"
}
```

A service with no `SERVICE_CONTENT` entry simply hides that section (graceful). Rendered by `src/components/proposal/sections/ServiceDetailsSection.tsx`.

---

## 6. Facilitators

Bios shown in the right rail when a proposal is *only* that facilitator's services. Source: `FACILITATOR` (Courtney) and `FACILITATOR_KIRSTEN` in `serviceContent.ts`; rendered by `src/components/proposal/sidebar/FacilitatorCard.tsx`.

- **Courtney Schulnick** — Shortcut's Mindfulness Meditation Leader. Shows on **mindfulness-only** proposals.
- **Kirsten Smits** — Movement, Sound & Reiki Specialist (NYC; Reiki Master; sound healing; dance/somatic background; clients incl. Burberry, Samsung, NYU Langone, Columbia, Casa Cipriani). Shows on proposals that are **only the 2026 movement & sound services** (reiki + the group classes).

---

## 7. Source-of-truth files

| Concern | File |
|---|---|
| Short descriptions, display names, images, chip colors | `src/components/proposal/data.ts` |
| Real event photos for the gallery | `src/components/proposal/data.ts` → `SERVICE_EVENT_PHOTOS` (also seeded to the `proposal_gallery` DB table) |
| "What a session looks like" content + facilitator bios | `src/components/proposal/sections/serviceContent.ts` |
| Flat-class menus (offerings, durations, prices) | `src/utils/mindfulnessCatalog.ts`, `soundBathCatalog.ts`, `yogaCatalog.ts`, `movementCatalog.ts` |
| Pricing engine (formulas, discounts) | `src/utils/proposalGenerator.ts` (`calculateServiceResults`, `recalculateServiceTotals`) |
| Selection-aware totals ("let the client build it") | `src/components/proposal/useServiceSelections.ts` |
| Full service-type list + per-service default params + editor | `src/components/ProposalViewerV2.tsx` (`SERVICE_TYPE_OPTIONS`, `SERVICE_DEFAULTS`) |
| Creation flow (calculator) | `src/components/Home.tsx` |
| `Service` field definitions | `src/types/proposal.ts` |
| Client viewer / service cards | `src/components/StandaloneProposalViewerV2.tsx`, `src/components/proposal/ServiceCard.tsx`, `ServiceCardRefresh.tsx`, `mobile/MobileServiceCard.tsx` |
| Gallery admin (per-service photos) | `src/components/ProposalGalleryAdmin.tsx` → `/proposal-gallery-admin` |
| Brand voice / positioning (how copy is written) | `memory/brand_voice_copywriter.md`, `memory/messaging_spine.md`, `netlify/functions/lib/positioning.js` |
| App overview + deploy process | `CLAUDE.md` (repo root) |

### To add a new service (the touch points)
1. A catalog file (flat class) **or** a `SERVICE_DEFAULTS` entry (appointment).
2. `SERVICE_TYPE_OPTIONS` + `SERVICE_DEFAULTS` in `ProposalViewerV2.tsx`, and the dropdown + defaults in `Home.tsx`.
3. The `isMindfulness` gate + catalog-sync branch in `proposalGenerator.ts` (flat classes only).
4. Copy: `SERVICE_DESC` (+ optional `SERVICE_CONTENT`) — through the brand voice guide.
5. Imagery: `SERVICE_IMAGE_PATH` (cover) + `SERVICE_EVENT_PHOTOS` (gallery); the `isFlatClass` flag in `ServiceCard.tsx` **and** `MobileServiceCard.tsx` **and** `ServiceCardRefresh.tsx`.
6. A `Service` field if it needs new state, in `src/types/proposal.ts`.
