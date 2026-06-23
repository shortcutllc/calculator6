import React from 'react';
import { MapPin } from 'lucide-react';
import { Eyebrow, CardHeading, T } from './shared/primitives';
import { formatCurrency, SERVICE_DISPLAY } from './data';
import { ServiceSelectionRow } from './useServiceSelections';

// EventDaySummaryCard — at-a-glance card per location. Design refresh: three
// teal-tinted stat tiles (Dates / Services / Appointments) over a list of
// per-day rows (date · services · day total). Lives in the main column, below
// the per-location service blocks.

interface EventDaySummaryCardProps {
  /** Same shape as ProposalData.services */
  servicesByLocation: Record<string, Record<string, { services: any[] }>>;
  /** Pricing rows from useServiceSelections (reserved for future per-day totals) */
  rows: ServiceSelectionRow[];
}

// "2026-05-13" → "Wed, May 13"; passes through non-date keys like "Date TBD".
function formatDayLabel(key: string): string {
  const d = new Date(key);
  if (!isNaN(d.getTime()) && /\d{4}|\d{1,2}[/-]/.test(key)) {
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }
  return key;
}

const EventDaySummaryCard: React.FC<EventDaySummaryCardProps> = ({
  servicesByLocation,
}) => {
  const locations = Object.keys(servicesByLocation || {});
  if (locations.length === 0) return null;

  return (
    <div>
      <Eyebrow style={{ marginBottom: 6 }}>At-a-glance</Eyebrow>
      <CardHeading size="section" style={{ marginBottom: 18 }}>
        Event-day summary
      </CardHeading>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {locations.map((loc) => {
          const byDate = servicesByLocation[loc] || {};
          const dates = Object.keys(byDate);

          let serviceCount = 0;
          let appointmentCount = 0;
          const dayRows = dates.map((date) => {
            const ds: any[] = byDate[date]?.services || [];
            serviceCount += ds.length;
            let dayTotal = 0;
            const names = ds.map((s) => {
              appointmentCount += Number(s?.totalAppointments) || 0;
              dayTotal += Number(s?.serviceCost) || 0;
              return SERVICE_DISPLAY[s?.serviceType] || s?.serviceType || 'Service';
            });
            return { date, label: formatDayLabel(date), names, dayTotal };
          });

          const stats: [string, string][] = [
            ['Dates', dates.length.toString()],
            ['Services', serviceCount.toString()],
            ['Appointments', appointmentCount.toLocaleString('en-US')],
          ];

          return (
            <div
              key={loc}
              style={{
                background: '#fff',
                borderRadius: 16,
                padding: '22px 24px',
                border: '1px solid rgba(0,0,0,0.06)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <MapPin size={16} color={T.navy} />
                <CardHeading size="item">{loc}</CardHeading>
              </div>

              {/* Three teal-tinted stat tiles */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                {stats.map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      background: 'rgba(0,152,173,0.06)',
                      borderRadius: 14,
                      padding: '16px 18px',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: T.fontD,
                        fontWeight: 800,
                        fontSize: 28,
                        color: T.navy,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {v}
                    </div>
                    <div
                      style={{
                        fontFamily: T.fontUi,
                        fontWeight: 700,
                        fontSize: 10,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        color: 'rgba(3,34,50,0.45)',
                        marginTop: 4,
                      }}
                    >
                      {k}
                    </div>
                  </div>
                ))}
              </div>

              {/* Per-day rows */}
              {dayRows.map(({ date, label, names, dayTotal }, i) => (
                <div
                  key={date}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    fontSize: 13,
                    padding: '8px 0',
                    borderTop: i === 0 ? '1px solid rgba(0,0,0,0.07)' : 'none',
                  }}
                >
                  <span style={{ color: 'rgba(3,34,50,0.55)' }}>{label}</span>
                  <span style={{ fontWeight: 700, textAlign: 'right' }}>
                    {names.join(', ')}
                    {dayTotal > 0 ? ` · ${formatCurrency(dayTotal)}` : ''}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EventDaySummaryCard;
