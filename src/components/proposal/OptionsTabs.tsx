import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Eyebrow, T } from './shared/primitives';
import { formatCurrency } from './data';
import { selectionKey } from './useServiceSelections';

// Whether a service counts toward the option's price, mirroring
// useServiceSelections: persisted client pick wins, then per-service
// `optionsSelectedDefault === false`, then the proposal-wide "let the client
// build it" flag (`startUnselected`), else on by default.
const serviceIncluded = (option: ProposalOption, service: any, key: string): boolean => {
  const persisted = option.data?.optionsState?.[key];
  if (persisted && typeof persisted.included === 'boolean') return persisted.included;
  if (service?.optionsSelectedDefault === false) return false;
  if (option.data?.startUnselected === true) return false;
  return true;
};

const serviceFrequency = (option: ProposalOption, service: any, key: string): number => {
  const persisted = option.data?.optionsState?.[key];
  if (persisted && typeof persisted.frequency === 'number' && persisted.frequency > 0) {
    return persisted.frequency;
  }
  if (typeof service?.optionsFrequency === 'number' && service.optionsFrequency > 0) {
    return service.optionsFrequency;
  }
  if (
    service?.isRecurring &&
    typeof service?.recurringFrequency?.occurrences === 'number' &&
    service.recurringFrequency.occurrences > 0
  ) {
    return service.recurringFrequency.occurrences;
  }
  return 1;
};

// OptionsTabs — large comparison grid for multi-option proposals.
// When a proposal belongs to a `proposal_group_id`, sibling proposals (one
// per "option" like Light / Standard / Full) are fetched and rendered as
// pickable comparison cards. Clicking a card navigates to that option's URL.
// The active option gets a navy border + "Viewing" pill; approved options
// get a green status callout.

export interface ProposalOption {
  id: string;
  option_name: string | null;
  option_order: number | null;
  status: string | null;
  data?: any;
}

interface OptionsTabsProps {
  options: ProposalOption[];
  currentId: string;
  /** Append-to-current-query-string preserver: we need to keep ?shared=true&redesign=1 */
  queryString: string;
  /** Live selection-aware total for the currently-viewed option, so its card
   *  reflects the client's picks in real time (the other cards fall back to
   *  each option's persisted selection state). */
  currentTotal?: number;
}

// Selection-aware metrics: only services the client has (or would by default)
// select count toward the price + appointments. So a "let the client build it"
// option with nothing selected reads $0, not the full menu price.
const optionMetrics = (option: ProposalOption) => {
  const services = option.data?.services || {};
  let dateCount = 0;
  let appointmentCount = 0;
  let subtotal = 0;
  let totalEvents = 0;
  Object.entries(services).forEach(([loc, byDate]: [string, any]) => {
    Object.entries(byDate || {}).forEach(([date, dd]: [string, any]) => {
      dateCount += 1;
      (dd?.services || []).forEach((s: any, idx: number) => {
        const key = selectionKey(loc, date, idx);
        if (!serviceIncluded(option, s, key)) return;
        const freq = Math.max(1, serviceFrequency(option, s, key));
        subtotal += (Number(s?.serviceCost) || 0) * freq;
        totalEvents += freq;
        appointmentCount += Number(s?.totalAppointments) || 0;
      });
    });
  });
  // Volume discount mirrors the hook: 15% at 4+ events, 20% at 9+.
  const discountPercent = totalEvents >= 9 ? 20 : totalEvents >= 4 ? 15 : 0;
  const cost = subtotal - (subtotal * discountPercent) / 100;
  const locationCount = Object.keys(services).length;
  return { locationCount, dateCount, appointmentCount, cost };
};

const OptionsTabs: React.FC<OptionsTabsProps> = ({
  options,
  currentId,
  queryString,
  currentTotal,
}) => {
  const navigate = useNavigate();
  if (!options || options.length < 2) return null;

  return (
    <div style={{ marginBottom: 32 }}>
      <Eyebrow style={{ marginBottom: 6 }}>Multi-option proposal</Eyebrow>
      <div
        style={{
          fontFamily: T.fontD,
          fontWeight: 700,
          fontSize: 20,
          color: T.navy,
          letterSpacing: '-0.01em',
          marginBottom: 16,
        }}
      >
        Pick the option that fits — compare side by side
      </div>
      <div
        style={{
          display: 'grid',
          // auto-fit collapses 3-up to 2-up to 1-up as the viewport
          // shrinks below the minmax floor, so the option tabs reflow
          // cleanly on phones/tablets without a JS breakpoint.
          gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))`,
          gap: 14,
        }}
      >
        {options.map((opt) => {
          const active = opt.id === currentId;
          const approved = opt.status === 'approved';
          const m = optionMetrics(opt);
          // The viewed option uses the live selection-aware total so its card
          // tracks the client's picks; others use their persisted-state total.
          const displayCost =
            active && typeof currentTotal === 'number' ? currentTotal : m.cost;
          return (
            <button
              type="button"
              key={opt.id}
              onClick={() => navigate(`/proposal/${opt.id}${queryString}`)}
              style={{
                textAlign: 'left',
                background: active ? T.navy : '#fff',
                color: active ? '#fff' : T.navy,
                border: active
                  ? `2px solid ${T.navy}`
                  : approved
                  ? `2px solid ${T.success}`
                  : '1.5px solid rgba(0,0,0,0.08)',
                borderRadius: 18,
                padding: '24px 24px',
                cursor: 'pointer',
                transition: 'border-color .15s, box-shadow .15s, transform .15s',
                boxShadow: active
                  ? '0 8px 24px rgba(9,54,79,0.18)'
                  : '0 2px 8px rgba(0,0,0,0.04)',
                transform: active ? 'translateY(-2px)' : 'none',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                minWidth: 0,
              }}
            >
              {/* Top row — option name + status callouts */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <Eyebrow color={active ? 'rgba(255,255,255,0.65)' : T.fgMuted}>
                  {opt.option_name || `Option ${opt.option_order ?? ''}`}
                </Eyebrow>
                <div style={{ display: 'flex', gap: 6 }}>
                  {approved && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontFamily: T.fontUi,
                        fontWeight: 700,
                        fontSize: 10,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: T.success,
                        background: 'rgba(30,158,106,.14)',
                        padding: '3px 8px',
                        borderRadius: 9999,
                      }}
                    >
                      <CheckCircle2 size={11} strokeWidth={3} />
                      Approved
                    </span>
                  )}
                  {active && (
                    <span
                      style={{
                        fontFamily: T.fontUi,
                        fontWeight: 700,
                        fontSize: 10,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: T.navy,
                        background: T.aqua,
                        padding: '3px 8px',
                        borderRadius: 9999,
                      }}
                    >
                      Viewing
                    </span>
                  )}
                </div>
              </div>

              {/* Big price */}
              <div>
                <div
                  style={{
                    fontFamily: T.fontD,
                    fontWeight: 800,
                    fontSize: 36,
                    color: active ? T.aqua : T.navy,
                    letterSpacing: '-0.025em',
                    lineHeight: 1,
                  }}
                >
                  {formatCurrency(displayCost)}
                </div>
                <div
                  style={{
                    fontFamily: T.fontUi,
                    fontWeight: 700,
                    fontSize: 10,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: active ? 'rgba(255,255,255,0.55)' : T.fgMuted,
                    marginTop: 4,
                  }}
                >
                  Total locked in
                </div>
              </div>

              {/* Stats row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 10,
                  borderTop: active
                    ? '1px solid rgba(255,255,255,0.12)'
                    : '1px solid rgba(0,0,0,0.06)',
                  paddingTop: 14,
                }}
              >
                <Stat
                  active={active}
                  label="Locations"
                  value={m.locationCount}
                />
                <Stat active={active} label="Dates" value={m.dateCount} />
                <Stat
                  active={active}
                  label="Appts"
                  value={m.appointmentCount.toLocaleString('en-US')}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const Stat: React.FC<{
  active: boolean;
  label: string;
  value: React.ReactNode;
}> = ({ active, label, value }) => (
  <div style={{ minWidth: 0 }}>
    <div
      style={{
        fontFamily: T.fontUi,
        fontWeight: 700,
        fontSize: 10,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: active ? 'rgba(255,255,255,0.55)' : T.fgMuted,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontFamily: T.fontD,
        fontWeight: 700,
        fontSize: 17,
        color: active ? '#fff' : T.navy,
        letterSpacing: '-0.01em',
        marginTop: 2,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {value}
    </div>
  </div>
);

export default OptionsTabs;
