import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Eyebrow, T } from './shared/primitives';
import { formatCurrency } from './data';

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
}

const optionMetrics = (option: ProposalOption) => {
  const services = option.data?.services || {};
  let dateCount = 0;
  let appointmentCount = 0;
  let cost = option.data?.summary?.totalEventCost || 0;
  Object.values(services).forEach((byDate: any) => {
    Object.values(byDate || {}).forEach((dd: any) => {
      dateCount += 1;
      (dd?.services || []).forEach((s: any) => {
        const apt = Number(s?.totalAppointments) || 0;
        appointmentCount += apt;
      });
    });
  });
  const locationCount = Object.keys(services).length;
  return { locationCount, dateCount, appointmentCount, cost };
};

const OptionsTabs: React.FC<OptionsTabsProps> = ({ options, currentId, queryString }) => {
  const navigate = useNavigate();
  if (!options || options.length < 2) return null;

  // Show the cheapest "Most affordable" hint to help the client compare
  const cheapest = options.reduce(
    (best, o) => {
      const m = optionMetrics(o);
      if (!best || m.cost < best.cost) return { id: o.id, cost: m.cost };
      return best;
    },
    null as { id: string; cost: number } | null
  );

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
          const cheapestHere = cheapest && cheapest.id === opt.id && options.length > 1;
          const m = optionMetrics(opt);
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
                  {cheapestHere && !active && (
                    <span
                      style={{
                        fontFamily: T.fontUi,
                        fontWeight: 700,
                        fontSize: 10,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: T.coral,
                        background: 'rgba(255,80,80,0.10)',
                        padding: '3px 8px',
                        borderRadius: 9999,
                      }}
                    >
                      Best value
                    </span>
                  )}
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
                  {formatCurrency(m.cost)}
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
