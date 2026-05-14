import React from 'react';
import { MapPin } from 'lucide-react';
import { Eyebrow, CardHeading, MiniStat, ServiceTypeChip, T } from './shared/primitives';
import { formatCurrency } from './data';
import { ServiceSelectionRow } from './useServiceSelections';

// EventDaySummaryCard — at-a-glance card per location showing 4 mini stats
// + the service chips. Lives in the main column, below the per-location
// service blocks. Mirrors V1's "location summary" with the new design.

interface EventDaySummaryCardProps {
  /** Same shape as ProposalData.services */
  servicesByLocation: Record<string, Record<string, { services: any[] }>>;
  /** Pricing rows from useServiceSelections — used to subtotal per location */
  rows: ServiceSelectionRow[];
}

const EventDaySummaryCard: React.FC<EventDaySummaryCardProps> = ({
  servicesByLocation,
  rows,
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
          // Count + sum across the location
          let serviceCount = 0;
          let appointmentCount = 0;
          const types = new Set<string>();
          Object.values(byDate).forEach((dd: any) => {
            (dd?.services || []).forEach((s: any) => {
              serviceCount += 1;
              appointmentCount += Number(s?.totalAppointments) || 0;
              if (s?.serviceType) types.add(s.serviceType);
            });
          });
          // Subtotal from active selections in this location
          const subtotal = rows
            .filter((r) => r.included && r.location === loc)
            .reduce((sum, r) => sum + r.lineCost, 0);

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

              <div
                style={{
                  display: 'grid',
                  // auto-fit reflows 4 mini-stats into 2-up or 1-up
                  // on narrower viewports.
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <MiniStat
                  label="Dates"
                  value={dates.length.toString()}
                  accent="neutral"
                />
                <MiniStat
                  label="Services"
                  value={serviceCount.toString()}
                  accent="neutral"
                />
                <MiniStat
                  label="Appointments"
                  value={appointmentCount.toLocaleString('en-US')}
                  accent="neutral"
                />
                <MiniStat label="Subtotal" value={formatCurrency(subtotal)} accent="coral" />
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  flexWrap: 'wrap',
                }}
              >
                {Array.from(types).map((t) => (
                  <ServiceTypeChip key={t} serviceType={t} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EventDaySummaryCard;
