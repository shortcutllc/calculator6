import React from 'react';
import { MiniStat, T } from './shared/primitives';
import { formatCurrency } from './data';

// DaySummaryBox — per-date "Day N Summary" tile shown beneath each date's
// service list. Mirrors V1 StandaloneProposalViewer's pattern (lines ~2197+)
// but rebuilt with the V2 MiniStat primitive + design tokens.
//
// Always shows Appointments. Total cost shown unless `hideCost` is set (used
// for partnership proposals where there's no per-day price).
// If `discountedCost` and `originalCost` differ, the discounted value is
// emphasised with a `discountLabel` eyebrow underneath.

interface DaySummaryBoxProps {
  /** 1-based day index within the location (e.g. 1, 2, 3) */
  dayNumber: number;
  /** Total appointments for this date. Pass `'unlimited'` for mindfulness. */
  appointments: number | string;
  /** Total cost for this date (post-discount, what the client pays) */
  totalCost: number;
  /** Original cost before discount — if different, renders as strike-through */
  originalCost?: number;
  /** Short eyebrow shown under the cost when discountedCost < originalCost */
  discountLabel?: string;
  /** Hide the cost column entirely (used for partnership pricing) */
  hideCost?: boolean;
}

const DaySummaryBox: React.FC<DaySummaryBoxProps> = ({
  dayNumber,
  appointments,
  totalCost,
  originalCost,
  discountLabel,
  hideCost = false,
}) => {
  const apptValue =
    appointments === 'unlimited' || appointments === 0
      ? '∞'
      : appointments.toLocaleString
      ? (appointments as number).toLocaleString('en-US')
      : String(appointments);

  const hasDiscount =
    !hideCost &&
    originalCost !== undefined &&
    originalCost > totalCost &&
    discountLabel;

  return (
    <div
      style={{
        marginTop: 4,
        padding: '16px 18px',
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 14,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      <div
        style={{
          fontFamily: T.fontD,
          fontWeight: 700,
          fontSize: 14,
          color: T.navy,
          letterSpacing: '-0.005em',
          marginBottom: 10,
        }}
      >
        Day {dayNumber} summary
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: hideCost ? '1fr' : 'repeat(2, minmax(0, 1fr))',
          gap: 10,
        }}
      >
        <MiniStat label="Appointments" value={apptValue} accent="aqua" />
        {!hideCost && (
          <div>
            {hasDiscount ? (
              <div
                style={{
                  padding: '14px 16px',
                  background: 'var(--pv-aqua)',
                  borderRadius: 12,
                }}
              >
                <span
                  style={{
                    fontFamily: T.fontUi,
                    fontWeight: 700,
                    fontSize: 11,
                    color: T.fgMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: 4,
                    display: 'block',
                  }}
                >
                  Total cost
                </span>
                <span
                  style={{
                    fontFamily: T.fontD,
                    fontSize: 13,
                    color: T.fgMuted,
                    textDecoration: 'line-through',
                    marginRight: 8,
                  }}
                >
                  {formatCurrency(originalCost!)}
                </span>
                <span
                  style={{
                    fontFamily: T.fontD,
                    fontWeight: 800,
                    fontSize: 22,
                    color: T.success,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {formatCurrency(totalCost)}
                </span>
                <div
                  style={{
                    fontFamily: T.fontUi,
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.success,
                    marginTop: 4,
                    letterSpacing: '0.02em',
                  }}
                >
                  {discountLabel}
                </div>
              </div>
            ) : (
              <MiniStat
                label="Total cost"
                value={formatCurrency(totalCost)}
                accent="coral"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DaySummaryBox;
