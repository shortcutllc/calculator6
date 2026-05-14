import React from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
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
}) => {
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
          gap: 10,
        }}
      >
        {options.map((opt, i) => {
          const on = i === selected;
          const handleSelect = () => {
            if (!disabled && onSelect) onSelect(i);
          };
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
                  : '1.5px solid rgba(0,0,0,0.08)',
                padding: '16px 18px',
                borderRadius: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                transition: 'border-color .2s, box-shadow .2s',
                boxShadow: on ? '0 4px 12px rgba(255,80,80,.12)' : 'none',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <Eyebrow>Option {i + 1}</Eyebrow>
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
              <div
                style={{
                  fontFamily: T.fontD,
                  fontWeight: 700,
                  fontSize: 17,
                  color: T.navy,
                  letterSpacing: '-.01em',
                  lineHeight: 1.2,
                }}
              >
                {opt.name}
              </div>
              {editing ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 6,
                    marginTop: 6,
                  }}
                  onClick={(e) => e.stopPropagation()}
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
                  <OptionInput
                    label="Discount %"
                    value={opt.discountPercent ?? ''}
                    onChange={(v) => onEditOption?.(i, 'discountPercent', v)}
                  />
                </div>
              ) : (
                (opt.numPros || opt.totalHours || opt.totalAppointments) && (
                  <div
                    style={{
                      fontFamily: T.fontD,
                      fontSize: 13,
                      color: T.fgMuted,
                      lineHeight: 1.4,
                    }}
                  >
                    {opt.numPros !== undefined &&
                      `${opt.numPros} pro${opt.numPros > 1 ? 's' : ''}`}
                    {opt.totalHours !== undefined && opt.numPros !== undefined && ' · '}
                    {opt.totalHours !== undefined && `${opt.totalHours}h`}
                    {opt.totalAppointments !== undefined && ` · ${opt.totalAppointments} appts`}
                  </div>
                )
              )}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                  marginTop: 'auto',
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
                  {formatCurrency(opt.serviceCost)}
                </span>
                {opt.discountPercent && opt.discountPercent > 0 && (
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
                    {opt.discountPercent}% off
                  </span>
                )}
              </div>
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
