import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eyebrow, T } from './shared/primitives';
import { formatCurrency } from './data';

// OptionsTabs — top-of-body tabs for multi-option proposals.
// When a proposal belongs to a `proposal_group_id`, sibling proposals (one
// per "option" like Light / Standard / Full) are fetched and rendered as
// pickable tabs. Clicking a tab navigates to that sibling proposal's URL.

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

  return (
    <div style={{ marginBottom: 32 }}>
      <Eyebrow style={{ marginBottom: 12 }}>Choose an option to view</Eyebrow>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(options.length, 3)}, minmax(0, 1fr))`,
          gap: 12,
        }}
      >
        {options.map((opt) => {
          const active = opt.id === currentId;
          const m = optionMetrics(opt);
          return (
            <button
              type="button"
              key={opt.id}
              onClick={() => navigate(`/proposal/${opt.id}${queryString}`)}
              style={{
                textAlign: 'left',
                background: '#fff',
                border: active
                  ? `2px solid ${T.navy}`
                  : '1.5px solid rgba(0,0,0,0.08)',
                borderRadius: 16,
                padding: '18px 20px',
                cursor: 'pointer',
                transition: 'border-color .15s, box-shadow .15s',
                boxShadow: active ? '0 4px 16px rgba(9,54,79,0.10)' : 'none',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                minWidth: 0,
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
                <Eyebrow>
                  {opt.option_name || `Option ${opt.option_order ?? ''}`}
                </Eyebrow>
                {active && (
                  <span
                    style={{
                      fontFamily: T.fontUi,
                      fontWeight: 700,
                      fontSize: 10,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: T.navy,
                      background: T.aqua,
                      padding: '2px 8px',
                      borderRadius: 9999,
                    }}
                  >
                    Viewing
                  </span>
                )}
              </div>
              <div
                style={{
                  fontFamily: T.fontD,
                  fontSize: 13,
                  color: T.fgMuted,
                }}
              >
                {m.locationCount} location{m.locationCount === 1 ? '' : 's'} ·{' '}
                {m.dateCount} date{m.dateCount === 1 ? '' : 's'} ·{' '}
                {m.appointmentCount.toLocaleString('en-US')} appts
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                <span
                  style={{
                    fontFamily: T.fontD,
                    fontWeight: 700,
                    fontSize: 22,
                    color: T.navy,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {formatCurrency(m.cost)}
                </span>
                <span
                  style={{
                    fontFamily: T.fontUi,
                    fontWeight: 700,
                    fontSize: 10,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: T.fgMuted,
                  }}
                >
                  total
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default OptionsTabs;
