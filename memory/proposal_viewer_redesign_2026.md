# Proposal Viewer Redesign — `redesign-2026` branch

Active multi-day rewrite of both proposal-viewer surfaces. **Read this whole file before touching `StandaloneProposalViewer*` / `ProposalViewer*` or anything under `src/components/proposal/`.**

---

## Setup & branch

- **Branch:** `redesign-2026` (created from `main`, currently long-lived)
- **Preview URL** (auto-deploys on every push to that branch):
  `https://redesign-2026--resplendent-narwhal-3de33b.netlify.app`
- **Production** (`proposals.getshortcut.co`) is fully isolated. Deploys only from `main`. Until we explicitly merge `redesign-2026 → main`, real clients see the unchanged V1 viewers.
- **Feature gate for V2:** `?redesign=1` on any `/proposal/:id?shared=true` URL routes to the new viewer. Without the flag, V1 still renders. Implemented in `ProposalTypeRouter.tsx`.
- **Worktree:** `/Users/willnewton/Documents/GitHub/calculator6/.claude/worktrees/intelligent-mirzakhani-9317cc` (check out `redesign-2026` there).

## Source materials

- Design handoff zip: `/Users/willnewton/Desktop/New Shortcut Design System.zip`
- Unzipped reference (rebuild from these): `/tmp/design_handoff/design_handoff_proposal_viewer/`
  - `README.md` — the handoff brief (long, exhaustive)
  - `styles/proposal-viewer.css` — CSS package (already imported, see Phase 0)
  - `design_reference/*.jsx` — HTML/JSX prototypes per section. Reference for look/behavior, NOT production code. Rebuild in calculator6's TS+Tailwind setup.

## Workflow conventions (different from the rest of this repo)

1. **Edit → user reviews on `localhost:5174` → commit + push.** Do not deploy/commit speculatively. The user explicitly asked for local-review-first.
2. Commits go to `redesign-2026`, which auto-deploys to the preview URL as a checkpoint. The user does NOT need every change deployed to prod.
3. Use plain `netlify deploy --prod` (no `--no-build`) IF you ever need to deploy to prod, but for redesign work that's almost never. The branch deploy handles it.
4. Dev server: `nohup npm run dev > /tmp/vite-dev.log 2>&1 & disown` (so it survives the Bash-tool timeout). Listens on `:5174`.

---

## Phase status

| Phase | Status | Files touched |
|---|---|---|
| **0** — CSS package + Inter font load | ✅ shipped | `src/styles/proposal-viewer.css`, `src/index.css`, `index.html` |
| **1** — Shared primitives + ServiceCard + PricingOptionsSelector + `/redesign-preview` page | ✅ shipped | `src/components/proposal/shared/primitives.tsx`, `ServiceCard.tsx`, `PricingOptionsSelector.tsx`, `data.ts`, `useServiceSelections.ts`, `RedesignPreview.tsx`, `App.tsx` (route) |
| **2A** — Shell + header + hero + 2-col body + service blocks + Live Total sidebar | ✅ shipped | `StandaloneProposalViewerV2.tsx`, `ProposalTypeRouter.tsx` (V2 routing) |
| **2B** — Pricing summary + custom note + approve flow + DB persistence + date formatting + slug eyebrow + isRecurring legacy fallback | ✅ shipped | `StandaloneProposalViewerV2.tsx`, `useServiceSelections.ts` |
| **2C** — Sidebar modules: AccountTeam + Gallery (placeholder) + WhatsNext + Trust + FAQ | ✅ shipped | `src/components/proposal/sidebar/*.tsx` (5 new files) |
| **2D** — OptionsTabs (multi-option) + EventDaySummaryCard + ServiceAgreementCard + RequestChangesModal + survey CTA + PDF wire-up + partner logo banner + office address per location | ✅ shipped | `OptionsTabs.tsx`, `EventDaySummaryCard.tsx`, `ServiceAgreementCard.tsx`, `RequestChangesModal.tsx`, `ServiceAgreement.tsx` (added `forceExpanded` prop), `sidebar/FaqCard.tsx` (rewrote with real agreement terms), `StandaloneProposalViewerV2.tsx` |
| **3A** — Internal/admin viewer baseline: shell, hero (editable name/logo/note), service blocks via `ServiceCard` `editing` + `internalView` + service-type/massage/nails/mindfulness sub-pickers + discount %, add/remove service + day, date picker per day, multi-option strip (rename/reorder/remove/create/link), admin actions sidebar (Send-to-Client, Copy link, Stripe invoice, View Changes toggle, Change history), Send-to-Client modal, Link-existing modal, ChangeHistoryDrawer, View-original toggle, save flow, ?redesign=1 gate for admin | ✅ shipped | `ProposalViewerV2.tsx`, `ProposalTypeRouter.tsx` (admin V2 routing) |
| **3B** — Inline pricing-options editor, account-team owner override dropdown, force-approve from admin, ServiceAgreement preview inside admin view | not started | TBD |
| **4** — Modals: ChangeConfirmationModal restyle, ApproveConfirmModal polish (admin approve confirm), notification-prefs modal | not started | TBD |
| **5** — Mindfulness-only proposal sections (Why Shortcut / Participant Benefits / CLE outline / Resources) | not started | `MindfulnessProposalContent.tsx` restyle |
| **6** — Gallery backend + Trust real logos + recurring data migration | not started | New `proposal_gallery` table + storage bucket |

---

## Data model decisions (locked in)

| Decision | Resolution |
|---|---|
| Where do `optionsState` / `optionsFrequency` / `optionsSelectedDefault` live? | All inside `proposals.data` JSONB. NO new columns. `data.optionsState[key]` for client selections; staff defaults on the service object itself. Key = `${location}|${date}|${serviceIndex}` (see `selectionKey()` in `useServiceSelections.ts`). |
| `isRecurring` legacy field — back-compat? | Yes. The new hook reads `optionsFrequency` first, falls back to `recurringFrequency.occurrences` if `isRecurring` is true. Both coexist. Migration to drop legacy is Phase 6. |
| Frequency unit | `1` (one-time), `2`, `4` (quarterly), `12` (monthly), or custom integer (1–52). Custom entry in the FrequencyPicker dropdown. |
| Volume discount math | 15% at 4+ total events across *all* selected services (combined count), 20% at 9+. Computed in `useServiceSelections.summary`. |
| Gratuity | Stays a staff-set add-on. Pricing summary only renders the gratuity line when `data.gratuityType` + `data.gratuityValue` are set. Never standard. |
| Persistence | On every selection change (include / frequency), `useServiceSelections` calls `onChange(state)` — V2 wires that to a Supabase `update proposals set data` (writing `data.optionsState`). Debounced 200ms. |
| Approve flow | Reuses existing `update proposals set status = 'approved'` + fires the existing `proposal-event-notification` Netlify function for Slack. Swaps the page to a green-check "Approved" state. |
| Request changes flow | Saves `data.clientChangesNote` + `clientChangesAt`. Sets `has_changes`, `pending_review`, `change_source = 'client'`. Fires `changes_submitted` Slack event. Banner appears at top of body. |
| Account team owner | **Static map** in `src/components/proposal/sidebar/AccountTeamCard.tsx` (Jaimie/Will/Marc/Caren). Per-proposal override via `data.accountTeamMemberEmail`. Default = Jaimie. No DB change. |
| Gallery | Phase 2C is a **static placeholder card**. Real wiring (Phase 6) needs a new `proposal_gallery` table keyed by `service_type` + a storage bucket. Photos/videos filter to services in the current proposal. |

---

## Key files and their roles

### New (created during this redesign)

```
src/styles/
  proposal-viewer.css                      ← design system tokens + .pv-* classes

src/components/
  StandaloneProposalViewerV2.tsx           ← the new client-facing viewer (Phase 2)
  ProposalViewerV2.tsx                     ← the new admin viewer (Phase 3A) — shell + edit + multi-option + send + change history
  RedesignPreview.tsx                      ← /redesign-preview route — primitives demo

src/components/proposal/
  data.ts                                  ← SERVICE_DISPLAY, SERVICE_DESC, SERVICE_CHIP_COLORS, FREQ_OPTIONS, formatCurrency
  useServiceSelections.ts                  ← include/frequency hook + summary calc
  ServiceCard.tsx                          ← the main service detail block (Phase 1)
  PricingOptionsSelector.tsx               ← in-service variant tiles (Half day / Full day)
  OptionsTabs.tsx                          ← multi-option proposal tabs
  EventDaySummaryCard.tsx                  ← per-location mini-stats + chip row
  ServiceAgreementCard.tsx                 ← collapsed terms summary + full-doc modal
  RequestChangesModal.tsx                  ← client-facing change-request modal

src/components/proposal/shared/
  primitives.tsx                           ← Eyebrow, CardHeading, StatusPill, MiniStat,
                                              ServiceImage, ServiceTypeChip, ToggleSwitch,
                                              FrequencyPicker, ParamCell, CollapseHead,
                                              SectionLabel, Editable, T (token shortcuts)

src/components/proposal/sidebar/
  AccountTeamCard.tsx                      ← team lead avatar + email + reply-time
  WhatsNextCard.tsx                        ← 4-step process flow
  TrustCard.tsx                            ← 87% rebook stat + client logo grid
  FaqCard.tsx                              ← 4 Q/As from the real agreement
  GalleryCard.tsx                          ← placeholder gallery (Phase 6 wires real media)
```

### Modified
- `src/index.css` — imports `proposal-viewer.css`
- `index.html` — loads Inter font alongside Outfit
- `src/App.tsx` — adds `/redesign-preview` route
- `src/components/ProposalTypeRouter.tsx` — routes to `V2` when `?redesign=1`
- `src/components/ServiceAgreement.tsx` — added `forceExpanded` prop for embedding inside the V2 modal

### Untouched (V1 still in use for production today)
- `src/components/StandaloneProposalViewer.tsx`
- `src/components/ProposalViewer.tsx`
- `src/components/MindfulnessProposalViewer.tsx`
- `src/components/StandaloneMindfulnessProposalViewer.tsx`
- All `Home.tsx` proposal-creation logic

---

## How the new viewer reads data (every field has a verified source)

Audit done in Phase 2D. Mappings between existing DB fields and new UI:

| New UI | Source field in DB / `data` | Status |
|---|---|---|
| Client name | `data.clientName` | ✅ |
| Client email | `data.clientEmail` | ✅ |
| Contact first name | `data.customization.contactFirstName` | ✅ |
| Custom note | `data.customization.customNote` | ✅ |
| Client logo URL | `data.clientLogoUrl` OR `proposals.client_logo_url` (dual storage) | ✅ |
| Office address per location | `data.officeLocations[<location>]` OR legacy `data.officeLocation` | ✅ |
| Proposal slug (eyebrow) | `proposals.slug` (falls back to UUID prefix) | ✅ |
| Service params (totalHours, numPros, totalAppointments, appTime, hourlyRate, proHourly, earlyArrival, retouchingCost) | `data.services[loc][date].services[i].*` | ✅ |
| Mindfulness fields (mindfulnessServiceId, mindfulnessServiceName, mindfulnessFormat, mindfulnessDescription, classLength, participants, fixedPrice) | Same path | ✅ committed earlier this session (`4d8f13c`, `13c5533`) |
| Pricing options (Half day / Full day / Premium tiers) | `data.services[...][...].services[i].pricingOptions` AND `proposals.pricing_options` JSONB | ✅ existing dual-storage |
| Selected pricing option | `selectedOption` + `proposals.selected_options` | ✅ |
| Recurring legacy | `service.isRecurring`, `service.recurringFrequency.occurrences` | ✅ via hook fallback |
| Gratuity | `data.gratuityType`, `data.gratuityValue` | ✅ |
| Multi-option group | `proposals.proposal_group_id`, `option_name`, `option_order` | ✅ |
| Survey response | `proposal_survey_responses` table, `proposal_id` foreign key | ✅ |
| Account team | `data.accountTeamMemberEmail` (new optional field, defaults to Jaimie) | ✅ |
| Selection state (client edits) | `data.optionsState[key] = { included, frequency }` | ✅ |
| Change request note | `data.clientChangesNote`, `data.clientChangesAt` | ✅ |
| Approve status | `proposals.status = 'approved'` | ✅ |
| Has-changes flag | `proposals.has_changes`, `proposals.pending_review`, `proposals.change_source = 'client'` | ✅ |

---

## Feature-parity audit & checklist — V1 features V2 must carry forward

Compiled after Phase 3A shipped (May 13). Goal: nothing V1 does today disappears in V2. Tick the box when an item is fully implemented in V2 with matching design integrity.

**Design-integrity rule:** Every V2 surface must use the V2 design system (T tokens + primitives). No V1 Tailwind utility classes or V1-styled components rendered inline. See [feedback_v2_design_integrity.md](https://example.local/feedback_v2_design_integrity.md).

**Last audit pass: May 13.** Verified clean across `ProposalViewerV2.tsx`, `StandaloneProposalViewerV2.tsx`, and `proposal/*`:
- 0 V1 Tailwind utility classes (`bg-shortcut-*`, `card-medium`, `text-shortcut-*`, etc.)
- 0 V1 component imports (`Button`, `EditableField`, `ServiceAgreement` raw, `StripeInvoiceButton` raw)
- Only off-palette hex codes are `#fff` (white-in-dark-context) + `#FCFAF7` / `#FBF7F3` / `#D5DDE3` / `#D1D5DB` (V2 paper/border tones from `primitives.tsx`) + `#8C5A07` (V2 pending-review amber from `STATUS_MAP`)
- One remaining V1-styled element mounted from V2: `InvoiceConfirmationModal` (queued for Phase 3D restyle); its trigger UI in the sidebar is V2-styled via `SidebarInvoicePanel`.
- Re-run this audit (`grep -nE "(bg-shortcut|text-shortcut|card-medium|shortcut-teal|shortcut-navy)" V2_files`) before every commit to catch regressions.

### Phase 3B — parity-critical (both viewers)

- [x] **Custom line items** — admin add/edit/remove rows (name, optional description, amount); render in pricing summary of both V2 viewers. *Wired May 13 via `PricingExtrasEditor` in admin + extra rows in both pricing summary cards.*
- [x] **Gratuity picker (admin)** — type selector (none / percentage / dollar) + value input. *Wired May 13 via `PricingExtrasEditor`; client summary already rendered gratuity from Phase 2B.*
- [x] **Office address per location** — admin per-location text input with Google Places autocomplete. *Wired May 13: inline `office-edit-${loc}` input under each location header, persists to `data.officeLocations[loc]`, autocomplete via existing global `window.google.maps.places`.*
- [x] **Pricing-options inline editor** — per-option editable params (totalHours, hourlyRate, numPros, discountPercent) + Add Option + Remove Option + Generate-options button. *Wired May 13: `PricingOptionsSelector` extended with `editing` mode + handlers; admin viewer wires `handleEditPricingOption / handleAddPricingOption / handleRemovePricingOption / handleGeneratePricingOptions` and re-runs `calculateServiceResults` per option.*
- [x] **Stripe invoice control — re-style to V2** — replace white-box wrapper with V2-styled card. *Done May 13: new `SidebarInvoicePanel` matches sidebar dark palette (navy/coral/ghost buttons + custom status pill); underlying `InvoiceConfirmationModal` flow reused but trigger UI is V2. NOTE: the modal itself still uses V1 Tailwind — restyle queued in Phase 3D.*
- [x] **Pro-level numbers editable + reflected in admin summary** — Hourly rate (charged) + Pro hourly (paid) + Early arrival all editable in ServiceCard internal view for every service type, not just headshot. *Done May 13: ServiceCard internalView shows both rates side-by-side with hint labels; pricing-options editor + handleFieldChange both persist `proRevenue` so margin stays correct on option switches.*
- [x] **Admin internal financials breakdown** — Pro Revenue + Net Profit + Profit Margin rows inlined inside the existing dark Pricing Summary card (V1 pattern: same blue box). Admin-only — appears below the public Total with an "Internal · admin only" eyebrow + dashed white-alpha divider. Net Profit / Margin tinted with `T.aqua` (positive) or `T.coral` (negative). *Done May 13. Earlier iteration used a separate white `InternalFinancialsCard` that broke design integrity — removed; standalone V2 viewer never renders these rows (read-only client view).*
- [x] **Day-level summary box** (both viewers) — per-date appointments + cost inside each date block. *Done May 13: new shared `DaySummaryBox` primitive in `src/components/proposal/`; uses `MiniStat` tiles with `aqua` + `coral` accents inside a white card. Client viewer sums by **included** services × frequency; admin viewer sums raw revenue per date. Supports `originalCost` + `discountLabel` for the future auto-recurring callout.*
- [x] **Auto-recurring discount picker (admin)** — Auto (15/20 by date count) / Off / fixed 10/15/20%. *Decision May 13: Model A — kept V1's `data.isAutoRecurring` + `data.autoRecurringDiscount` flags alongside V2's per-service frequency × volume-discount. `recalculateServiceTotals` already owned the math; UI added to `PricingExtrasEditor`. Pricing summary in both viewers shows a "Recurring discount · N%" savings line; `DaySummaryBox` shows strike-through original when `dateData.originalTotalCost` is set; `ServiceCard` shows a green "Recurring discount" chip + strike-through original when `service.originalServiceCost` is set.*

### Phase 3C — client UX completeness ✅ shipped

- [x] **Client edit mode for service params** — totalHours, numPros, classLength, mindfulnessFormat editable from the client side (matches V1). *Done May 13: new `isClientEditing` state in `StandaloneProposalViewerV2`; ServiceCard wired with `editing` + `onFieldChange` for non-internal fields. Header swaps to Discard / Submit changes.*
- [x] **Client-editable pricing options** — per-option params editable from client view. *Done May 13: `PricingOptionsSelector.editing` no longer gated on `internalView`; admin-only Add/Remove/Generate buttons stay gated but per-option Hours/Pros/$/hr/Discount inputs are visible to clients in edit mode.*
- [x] **Approve confirmation modal** — confirm step before commit. *Done May 13 via new `ApproveConfirmModal` (Total / Services included / "Yes, approve" CTA).*
- [x] **View Your Changes / View Current toggle** for clients post-edit. *Done May 13: when `proposal.has_changes` is true and `proposal.original_data` exists, the header shows a "View original" toggle that swaps the rendered snapshot.*
- [x] **Large multi-option comparison grid** — replaced compact `OptionsTabs` with prominent cards (active = navy fill + lift, approved = green outline + check, best-value = coral chip; stats row for locations / dates / appts). *Done May 13.*
- [x] **Help modal** — "Review / Edit / Confirm" cards triggered by a `?` icon in the header. *Done May 13 via new `HelpModal`.*
- [x] **Cost-per-headshot** stat. *Done May 13: rendered as an inline pill under the hero mini-stats only when at least one headshot service has appointments.*
- [x] **Notes textarea on client view** — quick "anything else we should know?" save-only-when-changed flow that persists to `data.clientNote` and flips `pending_review`. *Done May 13.*

### Phase 3D — admin polish & net-new admin features

- [ ] **Account-team owner override dropdown** — admin picks `data.accountTeamMemberEmail` (NEW; not in V1)
- [ ] **Force-approve / mark-rejected** from admin — override client state (NEW)
- [ ] **"View as client" preview toggle** in admin — render StandaloneProposalViewerV2 inline (NEW)
- [ ] **Mark-reviewed per changeset** in change-history drawer — Pending / Approved / Rejected status (V1 had badges)
- [ ] **Save Notes flow** — separate "Save Notes" button + textarea that flips `pending_review` + `has_changes`
- [ ] **Collapsible location/date sections** — expand/collapse chevron headers
- [ ] **ServiceAgreement preview inside admin view** — with partner-name personalization
- [ ] **InvoiceConfirmationModal — restyle to V2 visual language** (currently still V1 Tailwind under a V2 trigger)
- [ ] **Bulk service-type swap** (NEW) — apply across a date or location
- [ ] **Test-send** (NEW) — send proposal email to a staff address before going live
- [ ] **Recurring partner badge + 15%/20% discount emphasis** per service (purple gradient from V1)

### Phase 5 — mindfulness completeness

- [ ] **Why Shortcut section** for mindfulness proposals
- [ ] **CLE class outline section** for CLE proposals
- [ ] **CLE accreditation section** for CLE proposals
- [ ] **Participant Benefits section** for mindfulness-only
- [ ] **Additional Resources section** for mindfulness-only
- [ ] **Facilitator card** (Courtney Schulnick) for mindfulness proposals
- [ ] **Mindfulness 5-slug backfill** — support `mindfulness-soles`, `-movement`, `-pro`, `-cle`, `-pro-reactivity` for legacy proposals (V2 normalized to `mindfulness` + sub-picker)
- [ ] **PartnershipModelsSection** — alt pricing layout for partnership mode (verify still in V1)
- [ ] **Mindfulness-only admin layout** mirroring above sections

### Phase 6 — data backend

- [ ] **Real gallery** — `proposal_gallery` table + storage bucket + filter to services in proposal
- [ ] **Real trust client logos** — replace TrustCard placeholder
- [ ] **`recurringFrequency` data migration** to `optionsFrequency`
- [ ] **Service image carousel** in right rail — wire to real assets (Phase 6 GalleryCard work)

---

## Open gaps (deferred to later phases)

| Gap | Land in phase | Status |
|---|---|---|
| Discount Percentage per service (editable in admin) | Phase 3A | ✅ shipped in `ProposalViewerV2.tsx` `NumberField` |
| Service-type / Massage / Nails / Mindfulness type / Mindfulness format choosers in admin | Phase 3A | ✅ shipped in `ServiceBlock` (inline component) |
| Add/remove date, add/remove service | Phase 3A | ✅ shipped (`handleAddService`, `handleRemoveService`, `handleAddDay`, `handleRemoveDay`, `handleDateChange`) |
| Stripe invoice button | Phase 3A | ✅ shipped (reuses `<StripeInvoiceButton>` inside admin sidebar) |
| Send-to-client modal | Phase 3A | ✅ shipped |
| Multi-option management (link existing / reorder / remove / rename / create) | Phase 3A | ✅ shipped via `ProposalOptionsBar` + Link modal |
| Change History drawer | Phase 3A | ✅ shipped via `ChangeHistoryDrawer` (right slide-over) |
| Logo upload (admin) | Phase 3A | ✅ shipped |
| Editable client name + customNote in admin | Phase 3A | ✅ shipped |
| View-original toggle | Phase 3A | ✅ shipped (sidebar "View client changes" button) |
| Inline pricing-options editor (Half day / Full day variant params) | Phase 3B | not started — admin can change selectedOption but not edit option params |
| Admin force-approve (and reject pending-review) UI | Phase 3B | not started |
| Account team override UI (admin dropdown to pick owner) | Phase 3B | not started |
| ServiceAgreement preview inside admin view | Phase 3B | not started |
| Client-side inline edit (V1 lets clients tweak params) | Decide in Phase 3B | open question — V2 client view is read-only by design |
| `recurringFrequency` data migration to `optionsFrequency` | Phase 6 cleanup | not started |
| Real gallery (`proposal_gallery` table + storage bucket) | Phase 6 | not started |
| Trust card real client logos | Phase 6 | not started |
| Mindfulness-only proposal layout (Why Shortcut / Participant Benefits / CLE outline / Resources) | Phase 5 | not started |

---

## When picking up in a new conversation

**Spawn this prompt in a fresh session** to resume:

> I'm continuing a multi-day proposal-viewer redesign on the `redesign-2026` branch. Read `memory/proposal_viewer_redesign_2026.md` first — it has the full Phase status, data wiring map, file inventory, and open gaps. The current state is: Phase 2 (StandaloneProposalViewerV2) and Phase 3A (admin `ProposalViewerV2`) shipped. Phase 3B (pricing-options inline editor, account-team override dropdown, admin force-approve, ServiceAgreement preview in admin) is next. Workflow is local-review-first on `localhost:5174` — start a detached dev server with `nohup npm run dev > /tmp/vite-dev.log 2>&1 & disown`. Don't deploy unprompted. Don't touch V1 files. Check out `redesign-2026` first if the worktree isn't already on it.

Verify before any work:
```bash
git status              # should show redesign-2026 branch, clean tree
git log -3 --oneline    # latest commit should be a 2D-era message
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5174/redesign-preview  # 200 = dev server up
```

---

## Latest commit messages on this branch (for grep)

- `Phase 0: drop in proposal-viewer.css + load Inter`
- *(Phase 1 / 2A / 2B / 2C / 2D commits in chronological order — `git log redesign-2026 --oneline` for current)*

## URLs for review

| What | URL |
|---|---|
| Phase 1 primitives demo | `localhost:5174/redesign-preview` |
| V2 client view (Applecart — logo, 2 services) | `localhost:5174/proposal/8f9f96af-3b15-46f1-8d2b-bd81676c0895?shared=true&redesign=1` |
| V2 client view (Burberry — logo + office address) | `localhost:5174/proposal/a369ad5e-84eb-4bbd-afcc-99b684bb82dc?shared=true&redesign=1` |
| V2 admin view (Applecart — must be signed in) | `localhost:5174/proposal/8f9f96af-3b15-46f1-8d2b-bd81676c0895?redesign=1` |
| V2 admin view (Burberry — must be signed in) | `localhost:5174/proposal/a369ad5e-84eb-4bbd-afcc-99b684bb82dc?redesign=1` |
| Preview deploy of this branch | `https://redesign-2026--resplendent-narwhal-3de33b.netlify.app` |

## How to reset a test proposal after testing approve / request-changes

```javascript
// In a node script (or paste into a service-role HTTP call):
await supabase.from('proposals')
  .update({
    status: 'draft',
    pending_review: false,
    has_changes: false,
    data: { ...currentData, optionsState: undefined, clientChangesNote: undefined },
  })
  .eq('id', '<proposal-id>');
```

The Applecart test proposal (`8f9f96af-...`) is the canonical demo target.
