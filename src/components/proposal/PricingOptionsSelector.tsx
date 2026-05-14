import React from 'react';
import { Check } from 'lucide-react';
import { Eyebrow, T } from './shared/primitives';
import { formatCurrency } from './data';

// Pricing options selector — renders the in-service variant tiles (e.g.
// Half day / Full day / Full day + extra therapist). Selected tile gets a
// coral border + glow + filled radio. Used inside ServiceCard.

export interface PricingOptionVariant {
  name: string;
  totalHours?: number;
  numPros?: number;
  totalAppointments?: number;
  serviceCost: number;
  discountPercent?: number;
  // mindfulness flavor
  classLength?: number;
}

interface PricingOptionsSelectorProps {
  options: PricingOptionVariant[];
  selected: number;
  onSelect?: (index: number) => void;
  disabled?: boolean;
}

const PricingOptionsSelector: React.FC<PricingOptionsSelectorProps> = ({
  options,
  selected,
  onSelect,
  disabled,
}) => {
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
          gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))`,
          gap: 10,
        }}
      >
        {options.map((opt, i) => {
          const on = i === selected;
          return (
            <button
              type="button"
              key={i}
              disabled={disabled}
              onClick={() => !disabled && onSelect && onSelect(i)}
              style={{
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
              {(opt.numPros || opt.totalHours || opt.totalAppointments) && (
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
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PricingOptionsSelector;
