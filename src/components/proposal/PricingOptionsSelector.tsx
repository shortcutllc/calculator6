import React from 'react';
import { Check, Plus, Star, Trash2 } from 'lucide-react';
import { Eyebrow, T } from './shared/primitives';
import { formatCurrency } from './data';

// Pricing options selector — renders the in-service variant tiles (e.g.
// Half day / Full day / Full day + extra therapist). Selected tile gets a
// coral border + glow + filled radio. Used inside ServiceCard.
//
// `editing` mode adds per-option inline editors (totalHours / numPros /
// hourlyRate / discountPercent) plus Add Option / Remove Option / Generate
// buttons so admins can configure variants without leaving the service card.

export interface PricingOptionVariant {
  name: string;
  totalHours?: number;
  numPros?: number;
  totalAppointments?: number;
  serviceCost: number;
  hourlyRate?: number;
  discountPercent?: number;
  originalPrice?: number;
  // mindfulness flavor
  classLength?: number;
  /** Staff-marked recommended tier. When no option carries the flag, the
   *  middle-priced option of a 3+ set is treated as recommended. */
  recommended?: boolean;
}

interface PricingOptionsSelectorProps {
  options: PricingOptionVariant[];
  selected: number;
  onSelect?: (index: number) => void;
  disabled?: boolean;
  /** Edit-mode controls (admin only) */
  editing?: boolean;
  /** Update a single field of a single option (passes index + field key + value) */
  onEditOption?: (index: number, field: keyof PricingOptionVariant, value: any) => void;
  onAddOption?: () => void;
  onRemoveOption?: (index: number) => void;
  onGenerateOptions?: () => void;
  /** Admin: mark an option as the recommended tier (exclusive across the set). */
  onSetRecommended?: (index: number) => void;
  /** Proposal-wide auto-recurring discount % (e.g. 10, 15, 20). Each option's
   *  stored `serviceCost` is the pre-recurring price; we apply this on the
   *  fly so the tile shows what the client actually pays if they pick it,
   *  with the pre-discount price struck through. Without this prop, tiles
   *  render exactly opt.serviceCost (the legacy behaviour). */
  autoRecurringDiscount?: number;
  /** Appointment length (minutes) from the parent service. Options don't carry
   *  their own appTime — length is constant across variants — so it's passed
   *  down to render "N min each" next to each tile's appointment count. */
  appTime?: number;
}

const PricingOptionsSelector: React.FC<PricingOptionsSelectorProps> = ({
  options,
  selected,
  onSelect,
  disabled,
  editing = false,
  onEditOption,
  onAddOption,
  onRemoveOption,
  onGenerateOptions,
  onSetRecommended,
  autoRecurringDiscount,
  appTime,
}) => {
  // Clamp to a sane range; treat 0/undefined/negative as "no recurring".
  const recurringPct = Math.max(0, Math.min(99, Number(autoRecurringDiscount) || 0));
  // Final per-option price (post-recurring) drives both display order and the
  // recommended-tier fallback, so compute it once up front. `i` is the STORED
  // index — selection + edit callbacks must always use it, never the display
  // position.
  const computed = options.map((opt, i) => ({
    opt,
    i,
    finalPrice: opt.serviceCost * (1 - recurringPct / 100),
  }));
  // Recommended tier: an explicit staff flag wins; otherwise the middle-priced
  // option of a 3+ set. Two-option sets get no implicit recommendation.
  let recommendedIndex = options.findIndex((o) => o.recommended);
  if (recommendedIndex < 0 && options.length >= 3) {
    const byPrice = [...computed].sort((a, b) => a.finalPrice - b.finalPrice);
    recommendedIndex = byPrice[Math.floor(byPrice.length / 2)].i;
  }
  // Clients see options priciest-first (anchor high, everything after feels
  // moderate). Editing keeps stored order so admin index-based controls stay
  // predictable.
  const display = editing
    ? computed
    : [...computed].sort((a, b) => b.finalPrice - a.finalPrice);
  // Per-employee chips only earn their place when the rate actually differs
  // across options — a flat ladder shows three identical prices that tell no
  // story and invite retail-price comparisons. Compare on rounded dollars
  // (what the client would see).
  const perEmployeeRates = computed
    .filter(({ opt }) => (opt.totalAppointments || 0) > 0)
    .map(({ opt, finalPrice }) =>
      Math.round(finalPrice / (opt.totalAppointments as number))
    );
  const showPerEmployee =
    perEmployeeRates.length > 1 &&
    new Set(perEmployeeRates).size > 1;
  // Empty-options state in editing mode — show a Generate prompt
  if (editing && options.length === 0) {
    return (
      <div
        style={{
          background: '#FCFAF7',
          border: '1px dashed rgba(0,0,0,0.18)',
          borderRadius: 16,
          padding: '22px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <Eyebrow color={T.navy}>Pricing options</Eyebrow>
          <div
            style={{
              fontFamily: T.fontD,
              fontSize: 13,
              color: T.fgMuted,
              marginTop: 4,
            }}
          >
            Add Half day / Full day variants so the client can compare and pick.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {onGenerateOptions && (
            <button
              type="button"
              onClick={onGenerateOptions}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                background: T.navy,
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                fontFamily: T.fontUi,
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              <Plus size={13} />
              Generate options
            </button>
          )}
          {onAddOption && (
            <button
              type="button"
              onClick={onAddOption}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                background: '#fff',
                color: T.navy,
                border: '1.5px solid rgba(0,0,0,0.12)',
                borderRadius: 10,
                cursor: 'pointer',
                fontFamily: T.fontUi,
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              <Plus size={13} />
              Add blank
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#FCFAF7',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 16,
        padding: '22px 24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <Eyebrow color={T.navy}>Pricing options</Eyebrow>
        <span style={{ fontFamily: T.fontD, fontSize: 13, color: T.fgMuted }}>
          Select one to continue
        </span>
      </div>
      <div
        style={{
          display: 'grid',
          // auto-fit collapses to fewer columns on narrow viewports —
          // 1 to N options reflow without crushing the cells below
          // readability.
          gridTemplateColumns: `repeat(auto-fit, minmax(180px, 1fr))`,
          columnGap: 10,
          // Extra row gap so the "Most popular" badge (-10px overhang) never
          // collides with a tile above it when the grid wraps.
          rowGap: 16,
        }}
      >
        {display.map(({ opt, i, finalPrice }) => {
          const on = i === selected;
          const isRecommended = i === recommendedIndex;
          const handleSelect = () => {
            if (!disabled && onSelect) onSelect(i);
          };
          // `finalPrice` is the price the client actually pays for this
          // option: stored serviceCost (post-per-service-discount,
          // pre-recurring) with the recurring multiplier applied on top.
          // The strike-through "original" is whatever the option's
          // originalPrice was at generation time (pre-per-service-discount).
          const perServicePct = opt.discountPercent || 0;
          const baseCost = opt.serviceCost;
          const originalPrice =
            typeof opt.originalPrice === 'number' && opt.originalPrice > 0
              ? opt.originalPrice
              : baseCost;
          // True total discount = (originalPrice − finalPrice) / originalPrice
          // — covers both per-service AND recurring. Shown as "X% off" pill.
          const totalSavings = originalPrice - finalPrice;
          const totalPct =
            originalPrice > 0 && totalSavings > 0.01
              ? Math.round((totalSavings / originalPrice) * 100)
              : 0;
          const hasAnyDiscount = totalPct > 0 || perServicePct > 0 || recurringPct > 0;
          return (
            <div
              key={i}
              role="button"
              tabIndex={disabled ? -1 : 0}
              aria-pressed={on}
              aria-disabled={disabled}
              onClick={handleSelect}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelect();
                }
              }}
              style={{
                position: 'relative',
                cursor: disabled ? 'not-allowed' : 'pointer',
                background: '#fff',
                textAlign: 'left',
                minWidth: 0,
                border: on
                  ? `2px solid ${T.coral}`
                  : isRecommended && !editing
                  ? `2px solid ${T.navy}`
                  : '1.5px solid rgba(0,0,0,0.08)',
                padding: '16px 18px',
                borderRadius: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                transition: 'border-color .2s, box-shadow .2s',
                boxShadow: on
                  ? '0 4px 12px rgba(255,80,80,.12)'
                  : isRecommended && !editing
                  ? '0 4px 12px rgba(9,54,79,.10)'
                  : 'none',
              }}
            >
              {isRecommended && !editing && (
                <span
                  style={{
                    position: 'absolute',
                    top: -10,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: T.coral,
                    color: '#fff',
                    fontFamily: T.fontUi,
                    fontWeight: 700,
                    fontSize: 10,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    padding: '3px 10px',
                    borderRadius: 9999,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Most popular
                </span>
              )}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                {/* Single bold name — the old light "OPTION N" eyebrow above
                    it just duplicated this, so it's gone. */}
                <div
                  style={{
                    fontFamily: T.fontD,
                    fontWeight: 700,
                    fontSize: 16,
                    color: T.navy,
                    letterSpacing: '-.01em',
                    lineHeight: 1.2,
                    minWidth: 0,
                  }}
                >
                  {opt.name}
                </div>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    border: on ? 'none' : '2px solid #D1D5DB',
                    background: on ? T.coral : 'transparent',
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                  }}
                >
                  {on && <Check size={11} strokeWidth={3} />}
                </div>
              </div>
              {editing ? (
                <div onClick={(e) => e.stopPropagation()}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 6,
                      marginTop: 6,
                    }}
                  >
                    <OptionInput
                      label="Hours"
                      value={opt.totalHours ?? ''}
                      onChange={(v) => onEditOption?.(i, 'totalHours', v)}
                    />
                    <OptionInput
                      label="Pros"
                      value={opt.numPros ?? ''}
                      onChange={(v) => onEditOption?.(i, 'numPros', v)}
                    />
                    <OptionInput
                      label="$/hr"
                      value={opt.hourlyRate ?? ''}
                      onChange={(v) => onEditOption?.(i, 'hourlyRate', v)}
                    />
                    {/* Per-option discount editor removed — the service-level
                        "Discount %" field is now the single source of truth.
                        All options inherit it automatically on recalc. */}
                  </div>
                  {/* Read-only appointments — derived from hours/pros and
                      recomputed on every input change so admin sees the
                      slot count update in real time. */}
                  {opt.totalAppointments !== undefined && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: '6px 10px',
                        background: 'rgba(0,0,0,0.04)',
                        borderRadius: 6,
                        fontFamily: T.fontD,
                        fontSize: 12,
                        color: T.fgMuted,
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: T.fontUi,
                          fontWeight: 700,
                          fontSize: 10,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                        }}
                      >
                        Appts
                      </span>
                      <span
                        style={{
                          fontFamily: T.fontD,
                          fontWeight: 700,
                          fontSize: 14,
                          color: T.navy,
                        }}
                      >
                        {opt.totalAppointments}
                      </span>
                    </div>
                  )}
                  {onSetRecommended && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetRecommended(i);
                      }}
                      style={{
                        marginTop: 8,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '4px 10px',
                        background: opt.recommended ? T.navy : '#fff',
                        color: opt.recommended ? '#fff' : T.navy,
                        border: opt.recommended
                          ? `1.5px solid ${T.navy}`
                          : '1.5px solid rgba(0,0,0,0.12)',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontFamily: T.fontUi,
                        fontWeight: 700,
                        fontSize: 11,
                      }}
                    >
                      <Star
                        size={11}
                        fill={opt.recommended ? 'currentColor' : 'none'}
                      />
                      {opt.recommended ? 'Recommended' : 'Mark recommended'}
                    </button>
                  )}
                </div>
              ) : (
                Boolean(
                  opt.numPros ||
                    opt.totalHours ||
                    opt.totalAppointments ||
                    opt.classLength
                ) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* Appointments leads the tile — same hero treatment as the
                        ServiceCard face. Flat-rate classes lead with class
                        length instead (no appointment count). */}
                    {opt.totalAppointments !== undefined ? (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                        <span
                          style={{
                            fontFamily: T.fontD,
                            fontWeight: 800,
                            fontSize: 22,
                            lineHeight: 1,
                            color: T.navy,
                          }}
                        >
                          {opt.totalAppointments}
                        </span>
                        <span
                          style={{
                            fontFamily: T.fontUi,
                            fontWeight: 700,
                            fontSize: 10,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            color: T.fgMuted,
                          }}
                        >
                          appointments
                        </span>
                      </div>
                    ) : opt.classLength !== undefined ? (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                        <span
                          style={{
                            fontFamily: T.fontD,
                            fontWeight: 800,
                            fontSize: 22,
                            lineHeight: 1,
                            color: T.navy,
                          }}
                        >
                          {opt.classLength}
                          <span style={{ fontSize: 12, fontWeight: 700, marginLeft: 2 }}>
                            min
                          </span>
                        </span>
                        <span
                          style={{
                            fontFamily: T.fontUi,
                            fontWeight: 700,
                            fontSize: 10,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            color: T.fgMuted,
                          }}
                        >
                          per session
                        </span>
                      </div>
                    ) : null}
                    {/* Appointment length — the only supporting detail now.
                        Pros + total hours were removed: appointments + length
                        are what clients compare across options. */}
                    {appTime != null && opt.totalAppointments !== undefined && (
                      <div
                        style={{
                          fontFamily: T.fontD,
                          fontSize: 12,
                          color: T.fgMuted,
                          lineHeight: 1.4,
                        }}
                      >
                        {appTime} min each
                      </div>
                    )}
                  </div>
                )
              )}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                  marginTop: 'auto',
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    fontFamily: T.fontD,
                    fontWeight: 700,
                    fontSize: 22,
                    color: T.navy,
                    letterSpacing: '-.02em',
                  }}
                >
                  {formatCurrency(finalPrice)}
                </span>
                {/* Strike-through pre-discount price + total "% off" pill
                    when ANY discount (per-service or auto-recurring) applies.
                    Both numbers update per option, so flipping tiles makes
                    the saving visibly different from option to option. */}
                {hasAnyDiscount && originalPrice > finalPrice + 0.01 && (
                  <span
                    style={{
                      fontFamily: T.fontD,
                      fontWeight: 600,
                      fontSize: 14,
                      color: T.fgMuted,
                      textDecoration: 'line-through',
                      textDecorationThickness: '1.5px',
                    }}
                  >
                    {formatCurrency(originalPrice)}
                  </span>
                )}
                {hasAnyDiscount && totalPct > 0 && (
                  <span
                    style={{
                      fontFamily: T.fontUi,
                      fontWeight: 700,
                      fontSize: 11,
                      color: T.success,
                      background: 'rgba(30,158,106,.12)',
                      padding: '2px 8px',
                      borderRadius: 9999,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {totalPct}% off
                  </span>
                )}
              </div>
              {/* Per-employee cost — the number a buyer can defend upward.
                  Appointment-based services only, and only when the rate
                  differs across options (a flat ladder has no story). */}
              {!editing &&
                showPerEmployee &&
                (opt.totalAppointments || 0) > 0 &&
                finalPrice > 0 && (
                  <div>
                    <span
                      style={{
                        fontFamily: T.fontUi,
                        fontWeight: 600,
                        fontSize: 11,
                        color: T.teal,
                        background: 'rgba(0,152,173,.10)',
                        padding: '2px 8px',
                        borderRadius: 9999,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatCurrency(finalPrice / (opt.totalAppointments as number))} per employee
                    </span>
                  </div>
                )}
              {/* Recurrence seed — quietly shows what quarterly earns on the
                  recommended tier (4 events = the 15% volume tier). Dollar
                  amount, not a rate: above $100 absolute savings read bigger
                  than percentages. Suppressed when a recurring discount is
                  already applied — the price on the tile already reflects it. */}
              {!editing &&
                isRecommended &&
                recurringPct === 0 &&
                finalPrice > 0 && (
                  <div
                    style={{
                      fontFamily: T.fontD,
                      fontSize: 11.5,
                      color: T.fgMuted,
                      lineHeight: 1.45,
                    }}
                  >
                    Book it quarterly and save about{' '}
                    <span style={{ fontWeight: 700, color: T.teal }}>
                      {formatCurrency(finalPrice * 0.15)} per event
                    </span>
                  </div>
                )}
              {editing && options.length > 1 && onRemoveOption && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveOption(i);
                  }}
                  title="Remove option"
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: T.coral,
                    padding: 4,
                    borderRadius: 6,
                    display: 'inline-flex',
                  }}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {/* No-ask guardrail (admin only): approval rates drop sharply above
          $2,500 — the typical champion's no-ask budget line for a NEW client.
          Interim stand-in for a real new-vs-returning client flag. */}
      {editing &&
        onSetRecommended &&
        recommendedIndex >= 0 &&
        (options[recommendedIndex]?.serviceCost || 0) > 2500 && (
          <div
            style={{
              marginTop: 12,
              padding: '8px 12px',
              background: 'rgba(254,220,100,.25)',
              borderRadius: 8,
              fontFamily: T.fontD,
              fontSize: 12,
              color: '#8C5A07',
              lineHeight: 1.45,
            }}
          >
            The recommended tier is over $2,500 — above the typical no-ask
            approval line. Fine for a returning client; consider sizing down
            for a first-time buyer.
          </div>
        )}
      {editing && onAddOption && (
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onAddOption}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              background: '#fff',
              color: T.navy,
              border: '1.5px solid rgba(0,0,0,0.12)',
              borderRadius: 8,
              cursor: 'pointer',
              fontFamily: T.fontUi,
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            <Plus size={12} />
            Add option
          </button>
        </div>
      )}
    </div>
  );
};

// Compact inline editor used for per-option params in editing mode.
const OptionInput: React.FC<{
  label: string;
  value: number | string;
  onChange: (v: number) => void;
}> = ({ label, value, onChange }) => (
  <label
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
    }}
  >
    <span
      style={{
        fontFamily: T.fontUi,
        fontWeight: 700,
        fontSize: 10,
        color: T.fgMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}
    >
      {label}
    </span>
    <input
      type="number"
      value={value as any}
      onChange={(e) => {
        const next = parseFloat(e.target.value);
        onChange(Number.isFinite(next) ? next : 0);
      }}
      onClick={(e) => e.stopPropagation()}
      style={{
        width: '100%',
        padding: '5px 8px',
        fontFamily: T.fontD,
        fontWeight: 600,
        fontSize: 13,
        color: T.navy,
        border: '1.5px solid rgba(0,0,0,0.1)',
        borderRadius: 6,
        background: '#fff',
        outline: 'none',
      }}
    />
  </label>
);

export default PricingOptionsSelector;
