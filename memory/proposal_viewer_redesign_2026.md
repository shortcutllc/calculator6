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
| **3** — Internal/admin viewer (`ProposalViewerV2.tsx`) | **NEXT** — not started | TBD |
| **4** — Modals: ChangeConfirmationModal restyle, ApproveConfirmModal, ChangeHistoryDrawer | not started | TBD |
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

## Open gaps (deferred to later phases)

| Gap | Land in phase |
|---|---|
| Discount Percentage per service (editable in admin) | Phase 3 (internal viewer) |
| Service helper functions (Massage Type chooser, Nails Type chooser, Headshot Package, Mindfulness Service ID picker, Mindfulness Format picker) — these are the per-service-type edit affordances | Phase 3 |
| Add/remove date, location, service | Phase 3 |
| Stripe invoice (Send invoice / Invoice status badge) | Phase 3 |
| Share-with-client modal (admin) | Phase 3 |
| Send-to-client email | Phase 3 |
| Multi-option management (link existing / reorder / remove) | Phase 3 |
| Admin force-approve, Change History drawer | Phase 3 + Phase 4 |
| Client-side inline edit (V1 lets clients tweak params) | Decide in Phase 3 — wire `editing` prop, add Submit/Cancel pair |
| `recurringFrequency` data migration to `optionsFrequency` | Phase 6 cleanup |
| Real gallery (`proposal_gallery` table + storage bucket) | Phase 6 |
| Trust card real client logos | Phase 6 |
| Account team override UI (admin dropdown to pick owner) | Phase 3 |
| Mindfulness-only proposal layout (Why Shortcut / Participant Benefits / CLE outline / Resources) | Phase 5 |

---

## When picking up in a new conversation

**Spawn this prompt in a fresh session** to resume:

> I'm continuing a multi-day proposal-viewer redesign on the `redesign-2026` branch. Read `memory/proposal_viewer_redesign_2026.md` first — it has the full Phase status, data wiring map, file inventory, and open gaps. The current state is: Phase 2 (StandaloneProposalViewerV2) complete; Phase 3 (Internal/admin ProposalViewerV2) is next. Workflow is local-review-first on `localhost:5174` — start a detached dev server with `nohup npm run dev > /tmp/vite-dev.log 2>&1 & disown`. Don't deploy unprompted. Don't touch V1 files. Check out `redesign-2026` first if the worktree isn't already on it.

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
| V2 client view with sample (Applecart — logo, 2 services) | `localhost:5174/proposal/8f9f96af-3b15-46f1-8d2b-bd81676c0895?shared=true&redesign=1` |
| V2 client view (Burberry — logo + office address) | `localhost:5174/proposal/a369ad5e-84eb-4bbd-afcc-99b684bb82dc?shared=true&redesign=1` |
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
