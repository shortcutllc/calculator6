import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Eyebrow, T } from './shared/primitives';
import { formatCurrency, SERVICE_DISPLAY } from './data';
import { selectionKey, resolveVolumeDiscount } from './useServiceSelections';

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
  // Volume discount mirrors the hook exactly: the staff setting (or a
  // discount already baked into serviceCost) wins; only with no opinion do
  // the automatic tiers apply (10% at 4+ events, 15% at 9+). Without this a
  // sibling card re-discounted an already-discounted option and showed a
  // four-service one-day option at 4+ "events".
  const override = resolveVolumeDiscount(option.data);
  const discountPercent =
    typeof override === 'number' ? override : totalEvents >= 9 ? 15 : totalEvents >= 4 ? 10 : 0;
  const cost = subtotal - (subtotal * discountPercent) / 100;
  const locationCount = Object.keys(services).length;
  return { locationCount, dateCount, appointmentCount, cost };
};

// Services an option includes (unique, in first-seen order), for the card's
// sub-line: "Chair massage · Headshots · 2 visits".
const optionServiceNames = (option: ProposalOption): string[] => {
  const seen: string[] = [];
  Object.values(option.data?.services || {}).forEach((byDate: any) => {
    Object.values(byDate || {}).forEach((dd: any) => {
      (dd?.services || []).forEach((s: any) => {
        const name = SERVICE_DISPLAY[s?.serviceType] || s?.serviceType;
        if (name && !seen.includes(name)) seen.push(name);
      });
    });
  });
  return seen;
};

const OptionsTabs: React.FC<OptionsTabsProps> = ({
  options,
  currentId,
  queryString,
  currentTotal,
}) => {
  const navigate = useNavigate();
  if (!options || options.length < 2) return null;

  // Website option-card anatomy (design "Three ways to start"): kicker, then a
  // 16px grid of 28px cards. Each card: letter circle + status badge, 22px
  // title, service sub-line, then a bottom block pinned to the card's foot
  // with a hairline, PROGRAM TOTAL label, the total, and the per-visit price.
  return (
    <div style={{ marginBottom: 80 }}>
      <Eyebrow>Multi-option proposal</Eyebrow>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))`,
          gap: 16,
          marginTop: 20,
        }}
      >
        {options.map((opt, i) => {
          const active = opt.id === currentId;
          const approved = opt.status === 'approved';
          const m = optionMetrics(opt);
          const displayCost =
            active && typeof currentTotal === 'number' ? currentTotal : m.cost;
          const names = optionServiceNames(opt);
          const visits = Math.max(1, m.dateCount);
          const perVisit = visits > 1 ? displayCost / visits : null;
          const letter = String.fromCharCode(65 + (typeof opt.option_order === 'number' && opt.option_order > 0 ? opt.option_order - 1 : i));
          const ink = active ? '#fff' : T.navy;
          return (
            <button
              type="button"
              key={opt.id}
              onClick={() => navigate(`/proposal/${opt.id}${queryString}`)}
              style={{
                textAlign: 'left',
                background: active ? T.navy : '#fff',
                color: ink,
                border: active
                  ? `1px solid ${T.navy}`
                  : approved
                  ? `2px solid ${T.success}`
                  : '1px solid #E2E9E8',
                borderRadius: 28,
                padding: '26px 28px 28px',
                cursor: 'pointer',
                transition: 'box-shadow .15s, transform .15s',
                boxShadow: active
                  ? '0 20px 50px rgba(3,34,50,0.22)'
                  : '0 1px 2px rgba(3,34,50,0.05), 0 10px 30px rgba(3,34,50,0.06)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
                minHeight: 300,
                fontFamily: T.fontD,
              }}
            >
              {/* Top row: letter circle + status badge */}
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, height: 36 }}>
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 9999,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: active ? T.aqua : 'var(--pv-light-gray)',
                    color: T.navy,
                    fontWeight: 800,
                    fontSize: 15,
                    flexShrink: 0,
                  }}
                >
                  {letter}
                </span>
                {approved && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      height: 28,
                      padding: '0 12px',
                      borderRadius: 9999,
                      background: 'rgba(30,158,106,.14)',
                      color: active ? '#9FE9C4' : T.success,
                      fontWeight: 800,
                      fontSize: 12,
                      letterSpacing: '0.02em',
                    }}
                  >
                    <CheckCircle2 size={12} strokeWidth={3} />
                    Approved
                  </span>
                )}
                {active && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      height: 28,
                      padding: '0 12px',
                      borderRadius: 9999,
                      background: T.yellow,
                      color: T.navy,
                      fontWeight: 800,
                      fontSize: 12,
                      letterSpacing: '0.02em',
                    }}
                  >
                    Viewing
                  </span>
                )}
              </span>

              {/* Title */}
              <span
                style={{
                  display: 'block',
                  marginTop: 22,
                  fontWeight: 700,
                  fontSize: 22,
                  lineHeight: 1.15,
                  letterSpacing: '-0.025em',
                  color: ink,
                }}
              >
                {opt.option_name || `Option ${opt.option_order ?? i + 1}`}
              </span>

              {/* Services included · visits */}
              <span
                style={{
                  display: 'block',
                  marginTop: 10,
                  fontWeight: 500,
                  fontSize: 14.5,
                  lineHeight: 1.45,
                  color: ink,
                  opacity: 0.82,
                }}
              >
                {[...names, `${visits} visit${visits === 1 ? '' : 's'}`].join(' · ')}
              </span>

              {/* Bottom block, pinned to the foot of the card */}
              <span style={{ display: 'block', marginTop: 'auto', paddingTop: 22 }}>
                <span
                  style={{
                    display: 'block',
                    height: 1,
                    background: active ? 'rgba(255,255,255,0.14)' : 'rgba(0,55,86,0.12)',
                  }}
                />
                <span
                  style={{
                    display: 'block',
                    marginTop: 18,
                    fontWeight: 800,
                    fontSize: 12,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: ink,
                    opacity: 0.75,
                  }}
                >
                  Program total
                </span>
                <span
                  style={{
                    display: 'block',
                    marginTop: 8,
                    fontWeight: 800,
                    fontSize: 30,
                    lineHeight: 1,
                    letterSpacing: '-0.03em',
                    color: active ? T.aqua : T.navy,
                  }}
                >
                  {formatCurrency(displayCost)}
                </span>
                <span
                  style={{
                    display: 'block',
                    marginTop: 8,
                    fontWeight: 600,
                    fontSize: 14,
                    color: ink,
                    opacity: 0.8,
                  }}
                >
                  {perVisit !== null
                    ? `${formatCurrency(perVisit)} per visit`
                    : `${m.appointmentCount.toLocaleString('en-US')} appointments · ${m.locationCount} location${m.locationCount === 1 ? '' : 's'}`}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default OptionsTabs;
