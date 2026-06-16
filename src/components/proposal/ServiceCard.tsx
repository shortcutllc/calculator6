import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  Eyebrow,
  CardHeading,
  ServiceImage,
  ToggleSwitch,
  FrequencyPicker,
  ParamCell,
  Editable,
  T,
} from './shared/primitives';
import { useIsCompact, useIsMobile } from './shared/useIsMobile';
import PricingOptionsSelector, { PricingOptionVariant } from './PricingOptionsSelector';
import {
  MASSAGE_TYPE_DESC,
  NAILS_TYPE_DESC,
  STRETCH_TYPE_DESC,
  SERVICE_DESC,
  SERVICE_DISPLAY,
  SERVICE_CHIP_COLORS,
  SERVICE_GALLERY,
  formatCurrency,
} from './data';
import { SERVICE_CONTENT } from './sections/serviceContent';
import { ServiceDayDetails } from './sections/ServiceDetailsSection';
import CLEOutlineSection from './sections/CLEOutlineSection';
import CLEAccreditationSection from './sections/CLEAccreditationSection';
import { GalleryStrip, PhotoCountPill } from './ServiceGallery';

// ============================================================================
// ServiceCard — the single most-used unit in the redesigned proposal viewer.
//
// Replaces the old space-between param rows (which caused the "Appointments"
// label to collide with the value at narrow widths) with a stacked 4-col
// param grid built from ParamCell.
//
// Card-face hierarchy (Apple/Airbnb progressive-disclosure pass):
//   - One hero stat carries the card: appointment count for appointment
//     services, class length for flat-rate classes. Price + include
//     control sit across from it.
//   - Supporting params (total hours, # of pros, format, staff-only rates)
//     and the service description move into a "How it works" expander,
//     collapsed by default so the face stays calm.
//
// Supports:
//   - include/exclude toggle. Excluded = soft cream tint only (full-color
//     image, normal title, prominent "Add to proposal" CTA). No strike-
//     through — opting in should feel additive, not like undoing a deletion.
//   - per-service frequency picker (×1, ×2, ×4, ×12, custom) — always visible
//   - mindfulness flavor (uses mindfulnessServiceName, mindfulnessFormat, etc.)
//   - pricing options sub-card (Half day / Full day variants)
//   - editing mode (inline editable fields — force the expander open so they
//     stay reachable)
// ============================================================================

export interface ServiceCardService {
  serviceType: string;
  serviceCost: number;
  totalHours?: number;
  numPros?: number;
  totalAppointments?: number | string;
  appTime?: number;
  hourlyRate?: number;
  proHourly?: number;
  earlyArrival?: number;
  retouchingCost?: number;
  massageType?: string;
  nailsType?: string;
  // Mindfulness-specific
  classLength?: number;
  participants?: string | number;
  fixedPrice?: number;
  mindfulnessServiceName?: string;
  mindfulnessDescription?: string;
  mindfulnessFormat?: 'in-person' | 'virtual' | 'blend';
  // Pricing options sub-card
  pricingOptions?: PricingOptionVariant[];
  selectedOption?: number;
  // Set by recalculateServiceTotals when auto-recurring discount fires —
  // used by ServiceCard to show the strike-through original price + chip.
  originalServiceCost?: number;
}

interface ServiceCardProps {
  service: ServiceCardService;
  /** Inline-edit mode for staff/admin */
  editing?: boolean;
  /** Field change handler used by Editable inputs */
  onFieldChange?: (field: keyof ServiceCardService, value: any) => void;
  /** Pricing-options selection handler */
  onSelectPricingOption?: (index: number) => void;
  /** Pricing-options editing handlers (admin only, used when editing && internalView) */
  onEditPricingOption?: (index: number, field: keyof PricingOptionVariant, value: any) => void;
  onAddPricingOption?: () => void;
  onRemovePricingOption?: (index: number) => void;
  onGeneratePricingOptions?: () => void;
  /** Service image on the left side */
  showImage?: boolean;
  /** Tighter padding for nested contexts */
  compact?: boolean;
  /** Include/exclude state (client view) */
  included?: boolean;
  /** How many times per year — drives the line cost calc */
  frequency?: number;
  onToggleInclude?: (next: boolean) => void;
  onChangeFrequency?: (next: number) => void;
  /** Massage format picker (chair/table). When provided and the service is a
   *  massage, a client-facing segmented control renders on the card face. */
  onChangeMassageType?: (type: 'chair' | 'table') => void;
  /** Whether to show the toggle + frequency picker controls. Off for
   *  read-only contexts (e.g. PDF render). */
  showSelectionControls?: boolean;
  /** Internal staff/admin view shows fields the client should not see:
   *  App time, Hourly/Pro hourly rate, Early arrival, Retouching. Defaults
   *  to false (client-safe view) — only Appointments / Total hours / # of
   *  pros render in the param grid. Mindfulness cards aren't affected
   *  (their cells are already client-safe). */
  internalView?: boolean;
  /** Proposal-wide auto-recurring discount (10/15/20%) — forwarded to
   *  PricingOptionsSelector so each option tile shows the post-recurring
   *  price as primary with the pre-discount price struck through. */
  autoRecurringDiscount?: number;
  /** Real per-service gallery photos (from proposal_gallery, filtered by
   *  service type). Falls back to the static SERVICE_GALLERY map when empty. */
  galleryImages?: string[];
}

const formatLabel = (format?: string): string => {
  switch (format) {
    case 'virtual':
      return 'Virtual session';
    case 'blend':
      return 'Hybrid (in-person + virtual)';
    case 'in-person':
    default:
      return 'In-person session';
  }
};

const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  editing = false,
  onFieldChange,
  onSelectPricingOption,
  onEditPricingOption,
  onAddPricingOption,
  onRemovePricingOption,
  onGeneratePricingOptions,
  showImage = true,
  compact = false,
  included = true,
  frequency = 1,
  onToggleInclude,
  onChangeFrequency,
  onChangeMassageType,
  showSelectionControls = true,
  internalView = false,
  autoRecurringDiscount,
  galleryImages: galleryImagesProp,
}) => {
  // Mobile = stack image above content + drop the title/price row to wrap.
  // Compact = phones (< md) where the image + title row gets aggressive.
  const isMobile = useIsMobile();
  const isCompact = useIsCompact();
  const [expanded, setExpanded] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  // Covers the whole mindfulness family (mindfulness-cle, -soles, -movement,
  // …) — proposalGenerator prices all of them as flat-rate classes, so the
  // card must match: description fallback, per-session hero stat, fixedPrice
  // cell. An exact match here silently dropped the description (and showed an
  // appointments hero) on every subtype card.
  const isMindful =
    service.serviceType === 'mindfulness' ||
    service.serviceType.startsWith('mindfulness-');
  // Flat-price class services share mindfulness's display: per-session price,
  // class length, format, unlimited participants. Sound bath + yoga join it.
  const isFlatClass =
    isMindful || service.serviceType === 'sound-bath' || service.serviceType === 'yoga';
  const isHeadshot = service.serviceType === 'headshot' || service.serviceType === 'headshots';
  const isMassage = service.serviceType === 'massage';

  // Description resolution:
  //   1. Mindfulness: use the per-service custom mindfulnessDescription if
  //      the staff set one, else the generic mindfulness blurb.
  //   2. Massage / Nails: if a sub-type variant exists (chair, table,
  //      nails-hand-massage) prefer the variant-specific copy.
  //   3. Otherwise fall back to the generic SERVICE_DESC for the service type.
  const variantDesc =
    service.serviceType === 'massage' && service.massageType
      ? MASSAGE_TYPE_DESC[service.massageType]
      : service.serviceType === 'nails' && service.nailsType
      ? NAILS_TYPE_DESC[service.nailsType]
      : service.serviceType === 'stretch' && service.stretchType
      ? STRETCH_TYPE_DESC[service.stretchType]
      : null;
  const desc = isMindful
    ? service.mindfulnessDescription || SERVICE_DESC.mindfulness
    : variantDesc || SERVICE_DESC[service.serviceType] || '';

  // Description read-more: clamp to ~2 lines of copy and let the client
  // expand. A real toggle (vs a CSS line-clamp) so nothing is silently lost.
  const DESC_CLAMP = 115;
  const isLongDesc = desc.length > DESC_CLAMP;
  const shownDesc =
    isLongDesc && !descExpanded
      ? `${desc.slice(0, DESC_CLAMP).replace(/\s+\S*$/, '')}…`
      : desc;

  // Brand accent color for the title dot (replaces the redundant category
  // chip — the chip text just duplicated the service name).
  const serviceColor =
    SERVICE_CHIP_COLORS[service.serviceType]?.color || T.navy;

  // Per-service image gallery. Prefer real photos passed from the viewer
  // (proposal_gallery filtered by service type); fall back to the static
  // SERVICE_GALLERY map so the card still has a gallery before staff have
  // uploaded service-tagged media in the gallery admin. Single-cover services
  // (neither source) keep the plain ServiceImage.
  const galleryImages = (
    galleryImagesProp && galleryImagesProp.length
      ? galleryImagesProp
      : SERVICE_GALLERY[service.serviceType] || []
  ).filter(Boolean);
  const hasGallery = galleryImages.length > 1;

  // Small muted label under the title: the sub-type (chair/table) for
  // massage/nails/stretch, or the session format for flat-rate classes.
  const cap = (s: string) =>
    s.replace(/(^|[-\s])([a-z])/g, (_m, p, c) => p + c.toUpperCase());
  const subtypeLabel = isFlatClass
    ? service.mindfulnessFormat
      ? formatLabel(service.mindfulnessFormat)
      : null
    : isMassage
    ? // massage chair/table is shown via the format selector, not a label
      null
    : service.nailsType && service.nailsType !== 'nails'
    ? cap(service.nailsType.replace(/-/g, ' '))
    : (service as any).stretchType && (service as any).stretchType !== 'stretch'
    ? `${cap((service as any).stretchType)} stretch`
    : null;

  // Rich per-service helper content for the bottom "What a service day looks
  // like" dropdown. Keyed by base service type — normalize plural/legacy
  // slugs so old proposals still resolve.
  const contentKey = isMindful
    ? 'mindfulness'
    : service.serviceType === 'headshots'
    ? 'headshot'
    : service.serviceType === 'facials'
    ? 'facial'
    : service.serviceType.startsWith('mindfulness')
    ? 'mindfulness'
    : service.serviceType;
  const dayContent = SERVICE_CONTENT[contentKey] || null;
  // CLE classes carry extra page-level content (class outline + state
  // accreditation) that lives inside this card's dropdown rather than as
  // standalone sections at the bottom of the proposal.
  const isCLE = service.serviceType.startsWith('mindfulness-cle');

  // When pricing options exist, the selected option drives the effective
  // hours/pros. Selecting an option mirrors serviceCost + totalAppointments
  // onto the base service but deliberately NOT totalHours/numPros (copying
  // those contaminates future recalculations). So the summary must read the
  // selected option's values directly — otherwise it shows stale base hours
  // while the price/appointments update. Mirrors V1 (StandaloneProposalViewer).
  const selectedOpt =
    service.pricingOptions && service.pricingOptions.length > 0
      ? service.pricingOptions[service.selectedOption || 0]
      : null;
  const displayHours = selectedOpt?.totalHours ?? service.totalHours;
  const displayPros = selectedOpt?.numPros ?? service.numPros;

  // Auto-recurring discount applied — set by recalculateServiceTotals on
  // service.originalServiceCost. We surface a strike-through + chip so the
  // savings is obvious next to the price.
  const hasRecurringDiscount =
    typeof service.originalServiceCost === 'number' &&
    service.originalServiceCost > service.serviceCost;

  const handleEdit = (field: keyof ServiceCardService) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!onFieldChange) return;
    const v = e.target.value;
    onFieldChange(field, v === '' ? '' : isNaN(Number(v)) ? v : Number(v));
  };

  return (
    <div
      style={{
        // Excluded-state design (additive, not punitive):
        // - The card stays fully appealing — full-color image, normal
        //   title — so an opt-in service reads as "available to add,"
        //   never as something crossed off.
        // - A single soft cream background tint is the only recede cue.
        // - The prominent coral "Add to proposal" CTA carries the action.
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 20,
        padding: compact ? '16px 18px' : '22px 24px',
        boxShadow: included
          ? '0 4px 16px rgba(0,0,0,0.06)'
          : '0 2px 8px rgba(0,0,0,0.04)',
        transition: 'background .2s, box-shadow .2s',
        background: included ? '#fff' : '#FBF7F3',
        position: 'relative',
      }}
    >

      <div
        style={{
          display: 'flex',
          // Mobile: stack image on top so the title + body get the full
          // card width instead of being crushed into a 150px column.
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 14 : 20,
          // Top-align so the image keeps a FIXED size and the content flows
          // beside it. (Stretching the image to the content height made every
          // card's photo a different size and resized it on toggle / Read
          // more — exactly what we don't want.)
          alignItems: isMobile ? 'stretch' : 'flex-start',
        }}
      >
        {showImage &&
          (() => {
            // Fixed height on every card so all service photos are identical
            // and never resize when the content below them grows. Mobile gets
            // a short full-width banner instead of a side thumbnail.
            const imgH = isMobile ? 140 : compact ? 200 : 240;
            const imgW = isMobile ? '100%' : compact ? 180 : 220;

            // Stable cover anchor + a "N photos" pill that opens the dropdown
            // strip (the full gallery lives inside "What a … day looks like").
            return (
              <div style={{ position: 'relative', flexShrink: 0, width: imgW }}>
                <ServiceImage
                  serviceType={service.serviceType}
                  massageType={service.massageType}
                  height={imgH}
                  width={imgW}
                />
                {hasGallery && (
                  <PhotoCountPill
                    count={galleryImages.length}
                    onClick={() => setExpanded(true)}
                  />
                )}
              </div>
            );
          })()}
        <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          {/* Title row. On desktop the price/toggle is pulled out of flow
              (absolute, top-right — see below) so this row collapses to the
              height of the title alone. That kills the big gap that used to
              sit between the title and the format/description, which was just
              the tall price column inflating the row. On phones the price
              stays in flow and wraps under the title. */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 8,
              paddingRight: isCompact ? 0 : 132,
              flexWrap: isCompact ? 'wrap' : 'nowrap',
            }}
          >
            <div style={{ minWidth: 0 }}>
              {/* Title row — a small brand-color dot replaces the old
                  category chip (which just repeated the service name). */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    background: serviceColor,
                    flexShrink: 0,
                  }}
                />
                <CardHeading size="card">
                  {isMindful
                    ? service.mindfulnessServiceName ||
                      SERVICE_DISPLAY[service.serviceType] ||
                      'Mindfulness'
                    : SERVICE_DISPLAY[service.serviceType] || service.serviceType}
                </CardHeading>
                {/* Recurring partner badge — purple chip when this service is
                    explicitly flagged as recurring on the data. Mirrors V1's
                    "Recurring (Nx · X% off)" emphasis. */}
                {(service as any).isRecurring &&
                  (service as any).recurringFrequency && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px 9px',
                        background:
                          'linear-gradient(90deg, rgba(159,91,178,.18), rgba(99,91,255,.18))',
                        color: '#6B2D80',
                        borderRadius: 9999,
                        fontFamily: T.fontUi,
                        fontWeight: 700,
                        fontSize: 10,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Recurring partner
                      {(service as any).recurringFrequency?.occurrences && (
                        <span style={{ opacity: 0.75 }}>
                          · {(service as any).recurringFrequency.occurrences}×
                        </span>
                      )}
                      {(service as any).recurringDiscount > 0 && (
                        <span style={{ color: T.success, fontWeight: 800 }}>
                          {' '}
                          {(service as any).recurringDiscount}% off
                        </span>
                      )}
                    </span>
                  )}
              </div>
              {/* Sub-type (chair/table) or session format, aligned under the
                  title past the color dot. */}
              {subtypeLabel && (
                <div
                  style={{
                    fontFamily: T.fontD,
                    fontSize: 13,
                    color: T.fgMuted,
                    marginTop: 4,
                    marginLeft: 17,
                  }}
                >
                  {subtypeLabel}
                </div>
              )}
            </div>

            {/* Toggle + price column. Absolute top-right on desktop so it
                doesn't stretch the title row; in-flow on phones. */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 12,
                flexShrink: 0,
                position: isCompact ? 'static' : 'absolute',
                top: isCompact ? 'auto' : 0,
                right: isCompact ? 'auto' : 0,
              }}
            >
              {showSelectionControls && (
                included ? (
                  <ToggleSwitch
                    on={true}
                    onChange={onToggleInclude}
                    label="Included"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => onToggleInclude && onToggleInclude(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      background: T.coral,
                      color: '#fff',
                      border: 'none',
                      borderRadius: 9999,
                      cursor: 'pointer',
                      fontFamily: T.fontUi,
                      fontWeight: 700,
                      fontSize: 13,
                      letterSpacing: '.01em',
                      boxShadow: '0 2px 8px rgba(255,80,80,0.25)',
                    }}
                  >
                    <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
                    Add to proposal
                  </button>
                )
              )}
              <div style={{ textAlign: 'right' }}>
                {hasRecurringDiscount && (
                  <div
                    style={{
                      fontFamily: T.fontD,
                      fontSize: 13,
                      color: T.fgMuted,
                      textDecoration: 'line-through',
                      marginBottom: 2,
                    }}
                  >
                    {formatCurrency(service.originalServiceCost || 0)}
                  </div>
                )}
                {/* Price is ALWAYS the per-event cost. Picking a frequency
                    never multiplies it — the ×N/yr badge below carries the
                    recurrence, and the annualized figure lives only in the
                    bottom Pricing summary. */}
                <div
                  style={{
                    fontFamily: T.fontD,
                    fontWeight: 700,
                    fontSize: 28,
                    color: !included
                      ? T.fgMuted
                      : hasRecurringDiscount
                      ? T.success
                      : T.navy,
                    letterSpacing: '-0.025em',
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatCurrency(service.serviceCost)}
                </div>
                <Eyebrow style={{ marginTop: 6 }}>
                  {isFlatClass ? 'per session' : 'per event day'}
                </Eyebrow>
                {frequency > 1 && included && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      marginTop: 8,
                      padding: '3px 10px',
                      background: 'rgba(255,80,80,0.10)',
                      color: T.coral,
                      borderRadius: 9999,
                      fontFamily: T.fontUi,
                      fontWeight: 800,
                      fontSize: 11,
                      letterSpacing: '.04em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ×{frequency}/yr
                  </div>
                )}
                {hasRecurringDiscount && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '3px 9px',
                      marginTop: 8,
                      background: 'rgba(30,158,106,.12)',
                      color: T.success,
                      borderRadius: 999,
                      fontFamily: T.fontUi,
                      fontWeight: 700,
                      fontSize: 10,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Recurring discount
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Massage format picker — when the admin leaves the massage as
              "general", the client picks chair or table here. This only swaps
              the format + description copy; appointment length, count, and
              pricing stay exactly as the admin built them. */}
          {isMassage && onChangeMassageType && showSelectionControls && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginTop: 12,
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontFamily: T.fontUi,
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: T.fgMuted,
                }}
              >
                Format
              </span>
              <div
                style={{
                  display: 'inline-flex',
                  background: '#F1ECE6',
                  borderRadius: 9999,
                  padding: 3,
                  gap: 2,
                }}
              >
                {(['chair', 'table'] as const).map((opt) => {
                  const active = service.massageType === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={!included}
                      onClick={() => onChangeMassageType(opt)}
                      style={{
                        padding: '6px 16px',
                        borderRadius: 9999,
                        border: 'none',
                        cursor: included ? 'pointer' : 'not-allowed',
                        fontFamily: T.fontUi,
                        fontWeight: 700,
                        fontSize: 13,
                        textTransform: 'capitalize',
                        background: active ? '#fff' : 'transparent',
                        color: active ? T.navy : T.fgMuted,
                        boxShadow: active ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                        transition: 'background .15s, color .15s',
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {(!service.massageType || service.massageType === 'massage') && (
                <span
                  style={{
                    fontFamily: T.fontD,
                    fontSize: 12.5,
                    color: T.coral,
                    fontWeight: 600,
                  }}
                >
                  Choose your format
                </span>
              )}
            </div>
          )}

          {/* Description — a labeled, left-aligned block sitting directly
              under the format selector (or under the title for non-massage
              services). Width-capped so it never tucks under the price column
              on the right, with a real Read more so nothing is silently cut. */}
          {desc && (
            <div
              style={{
                marginTop: 12,
                // Reserve ~180px on the right so the copy never runs under /
                // into the price column. calc adapts to the column width;
                // the 500px cap keeps a comfortable reading measure on wide
                // screens. Full width on phones (price is in-flow there).
                maxWidth: isCompact
                  ? '100%'
                  : 'min(500px, calc(100% - 180px))',
              }}
            >
              <Eyebrow color={T.navy} style={{ marginBottom: 4 }}>
                Description
              </Eyebrow>
              <p
                style={{
                  fontFamily: T.fontD,
                  fontSize: 13.5,
                  color: T.fgMuted,
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {shownDesc}
                {isLongDesc && (
                  <>
                    {' '}
                    <button
                      type="button"
                      onClick={() => setDescExpanded((v) => !v)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        fontFamily: T.fontUi,
                        fontWeight: 700,
                        fontSize: 12.5,
                        color: T.coral,
                      }}
                    >
                      {descExpanded ? 'Read less' : 'Read more'}
                    </button>
                  </>
                )}
              </p>
            </div>
          )}

          {/* Hero stat — the single number that carries the card face.
              Appointment services lead with appointment count; flat-rate
              classes (mindfulness / yoga / sound bath) lead with class
              length. */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 10,
              flexWrap: 'wrap',
              paddingTop: 16,
            }}
          >
            <span
              style={{
                fontFamily: T.fontD,
                fontWeight: 800,
                fontSize: 30,
                lineHeight: 1,
                letterSpacing: '-0.02em',
                color: included ? T.navy : T.fgMuted,
              }}
            >
              {isFlatClass
                ? service.classLength ?? '—'
                : service.totalAppointments ?? '—'}
              {isFlatClass && service.classLength != null && (
                <span style={{ fontSize: 16, fontWeight: 700, marginLeft: 3 }}>
                  min
                </span>
              )}
            </span>
            <span
              style={{
                fontFamily: T.fontUi,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: T.fgMuted,
              }}
            >
              {isFlatClass
                ? 'per session'
                : service.appTime
                ? `appointments · ${service.appTime} min each`
                : 'appointments'}
            </span>
          </div>

          {/* Admin edit grid — staff-only. Shown only in edit mode so staff
              can adjust the raw params (hours, # of pros, appointment time,
              pro pay). Clients never see these: the card face carries
              appointments + appointment length, and the "What a service day
              looks like" dropdown carries the experience copy. */}
          {editing && (
            <div
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: '1px dashed rgba(0,0,0,0.07)',
              }}
            >
              <div style={{ marginBottom: 12 }}>
                <Eyebrow color={T.navy}>
                  {internalView ? 'Staff · edit details' : 'Edit details'}
                </Eyebrow>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '16px 24px',
                  maxWidth: 640,
                }}
              >
                  {isFlatClass ? (
                    <>
                      <ParamCell
                        label="Class length"
                        value={
                          <Editable
                            value={service.classLength}
                            editing={editing}
                            suffix=" min"
                            width={64}
                            onChange={handleEdit('classLength')}
                          />
                        }
                      />
                      <ParamCell
                        label="Format"
                        value={
                          (service.mindfulnessFormat || 'in-person').replace('-', ' ')
                        }
                      />
                      <ParamCell
                        label="Participants"
                        value={service.participants || 'unlimited'}
                      />
                      <ParamCell
                        label="Per session"
                        value={
                          <Editable
                            // Bind to fixedPrice (the catalog-set per-session
                            // price) rather than serviceCost — the recalc
                            // engine reads fixedPrice for mindfulness and
                            // writes serviceCost from it. Falling back to
                            // serviceCost handles legacy proposals that
                            // pre-date the fixedPrice field.
                            value={service.fixedPrice ?? service.serviceCost}
                            editing={editing}
                            prefix="$"
                            width={80}
                            onChange={handleEdit('fixedPrice')}
                          />
                        }
                      />
                    </>
                  ) : (
                    <>
                      {/* Appointments is now the card-face hero stat, so it's
                          dropped from this grid. Total hours + # of pros are
                          the supporting client-safe cells. */}
                      <ParamCell
                        label="Total hours"
                        value={
                          <Editable
                            value={displayHours}
                            editing={editing}
                            suffix="h"
                            width={56}
                            onChange={handleEdit('totalHours')}
                          />
                        }
                      />
                      <ParamCell
                        label="# of pros"
                        value={
                          <Editable
                            value={displayPros}
                            editing={editing}
                            width={48}
                            onChange={handleEdit('numPros')}
                          />
                        }
                      />
                      {/* Internal-only cells (staff/admin editor only) — show
                          the full pro-pay picture: app time, client hourly
                          rate, pro hourly pay, early-arrival bonus, retouching
                          (headshot). For headshot, hourlyRate is derived from
                          photographerCost so we hide that cell; for everyone
                          else, both rates are visible side-by-side so margin
                          is legible. */}
                      {internalView && (
                        <>
                          <ParamCell
                            label="App time"
                            value={
                              <Editable
                                value={service.appTime}
                                editing={editing}
                                suffix=" min"
                                width={64}
                                onChange={handleEdit('appTime')}
                              />
                            }
                          />
                          {!isHeadshot && (
                            <ParamCell
                              label="Hourly rate"
                              hint="charged to client"
                              value={
                                <Editable
                                  value={service.hourlyRate}
                                  editing={editing}
                                  prefix="$"
                                  width={64}
                                  onChange={handleEdit('hourlyRate')}
                                />
                              }
                            />
                          )}
                          <ParamCell
                            label="Pro hourly"
                            hint="paid to pro"
                            value={
                              <Editable
                                value={service.proHourly}
                                editing={editing}
                                prefix="$"
                                width={64}
                                onChange={handleEdit('proHourly')}
                              />
                            }
                          />
                          <ParamCell
                            label="Early arrival"
                            hint="per pro, flat"
                            value={
                              <Editable
                                value={service.earlyArrival}
                                editing={editing}
                                prefix="$"
                                width={56}
                                onChange={handleEdit('earlyArrival')}
                              />
                            }
                          />
                          {isHeadshot && (
                            <ParamCell
                              label="Retouching"
                              hint="per appt"
                              value={
                                <Editable
                                  value={service.retouchingCost}
                                  editing={editing}
                                  prefix="$"
                                  width={48}
                                  onChange={handleEdit('retouchingCost')}
                                />
                              }
                            />
                          )}
                        </>
                      )}
                    </>
                  )}
              </div>
            </div>
          )}

          {/* Frequency picker row */}
          {showSelectionControls && (
            <div
              style={{
                marginTop: 16,
                paddingTop: 12,
                borderTop: '1px dashed rgba(0,0,0,0.07)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <FrequencyPicker
                value={frequency}
                onChange={onChangeFrequency}
                compact={compact}
                disabled={!included}
              />
              {frequency > 1 && (
                <div style={{ fontFamily: T.fontD, fontSize: 13, color: T.fgMuted }}>
                  Repeats{' '}
                  <span style={{ fontWeight: 700, color: T.navy }}>
                    {frequency}× a year
                  </span>
                  {' '}· annual total in the summary below
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pricing options sub-card.
          - Always rendered when the service has options (read-only view).
          - When `editing` is on, per-option params become editable inline.
          - Admin-only affordances (Add option / Generate / Remove) are gated
            on `internalView` so clients see fewer destructive controls. */}
      {(service.pricingOptions && service.pricingOptions.length > 0) ||
      (editing && internalView) ? (
        <div style={{ marginTop: 20 }}>
          <PricingOptionsSelector
            options={service.pricingOptions || []}
            selected={service.selectedOption || 0}
            onSelect={onSelectPricingOption}
            disabled={!included}
            editing={editing}
            onEditOption={onEditPricingOption}
            onAddOption={internalView ? onAddPricingOption : undefined}
            onRemoveOption={internalView ? onRemovePricingOption : undefined}
            onGenerateOptions={internalView ? onGeneratePricingOptions : undefined}
            autoRecurringDiscount={autoRecurringDiscount}
            appTime={service.appTime}
          />
        </div>
      ) : null}

      {/* What a service day looks like — bottom-of-card dropdown carrying the
          "every event includes" checklist. Collapsed by default; the short
          blurb now sits under the title, and the standalone ServiceDetailsSection
          lower on the page still holds the full marketing version. */}
      {dayContent && dayContent.features.length > 0 && (
        <div
          style={{
            marginTop: 18,
            paddingTop: 14,
            borderTop: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontFamily: T.fontUi,
              fontWeight: 700,
              fontSize: 13.5,
              color: T.navy,
              textAlign: 'left',
            }}
          >
            <ChevronDown
              size={16}
              style={{
                transform: expanded ? 'rotate(180deg)' : 'none',
                transition: 'transform .15s',
                color: T.coral,
                flexShrink: 0,
              }}
            />
            What a{' '}
            {(dayContent?.label ||
              SERVICE_DISPLAY[service.serviceType] ||
              'service'
            ).toLowerCase()}{' '}
            {isFlatClass ? 'session' : 'day'} looks like
          </button>

          {expanded && dayContent && (
            <div style={{ marginTop: 16 }}>
              {/* Photo strip at the top of the dropdown. */}
              {hasGallery && (
                <div style={{ marginBottom: 22 }}>
                  <GalleryStrip
                    images={galleryImages}
                    label={`See a ${(dayContent.label || 'service').toLowerCase()} day`}
                  />
                </div>
              )}
              {/* The full per-service design (Benefits + What's included +
                  Features) — moved here from the old standalone section at the
                  bottom of the page. */}
              <ServiceDayDetails content={dayContent} />
              {/* CLE-specific extras: class outline + state accreditation.
                  These used to render as standalone sections at the bottom of
                  the proposal; they belong with the class they describe. */}
              {isCLE && (
                <div
                  style={{
                    marginTop: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                  }}
                >
                  <CLEOutlineSection />
                  <CLEAccreditationSection />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ServiceCard;
