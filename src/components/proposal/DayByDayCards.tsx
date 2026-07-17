import React from 'react';
import { Eyebrow, T } from './shared/primitives';
import { SERVICE_DISPLAY, SERVICE_IMAGE_PATH, formatCurrency } from './data';
import { parseLocalDate } from '../../utils/dateHelpers';

// DayByDayCards — design refresh "Day-by-day" block: one small card per event
// day, each with service thumbnails and Services / Appointments / Day-total
// rows. Additive, sits above the Event-day summary in the main column.

interface DayByDayCardsProps {
  servicesByLocation: Record<string, Record<string, { services: any[] }>>;
  /**
   * Predicate from the viewer's live selection state. When provided, services
   * the client has toggled OFF are excluded from the day rollups (and a day
   * with no included services is dropped entirely), so the breakdown matches
   * what's actually in the proposal.
   */
  isIncluded?: (location: string, date: string, serviceIndex: number) => boolean;
}

// Date keys are date-only ("2026-05-13"), so parse them as local — `new Date(key)`
// is UTC midnight and would render the previous day west of UTC.
function formatDayLabel(key: string): string {
  const d = parseLocalDate(key);
  if (!isNaN(d.getTime()) && /\d{4}|\d{1,2}[/-]/.test(key)) {
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }
  return key;
}

const Row: React.FC<{ k: string; v: string }> = ({ k, v }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
    <span style={{ color: 'rgba(3,34,50,0.55)' }}>{k}</span>
    <span style={{ fontWeight: 700, textAlign: 'right' }}>{v}</span>
  </div>
);

const DayByDayCards: React.FC<DayByDayCardsProps> = ({
  servicesByLocation,
  isIncluded,
}) => {
  const days: { date: string; services: any[] }[] = [];
  Object.entries(servicesByLocation || {}).forEach(([loc, byDate]) => {
    Object.entries(byDate || {}).forEach(([date, dd]: [string, any]) => {
      const ds = (dd?.services || []).filter((_s: any, idx: number) =>
        isIncluded ? isIncluded(loc, date, idx) : true
      );
      // Drop days where every service was toggled off.
      if (ds.length) days.push({ date, services: ds });
    });
  });
  // Render for any proposal with at least one day (single-day included).
  if (days.length === 0) return null;

  return (
    <div>
      <p className="pv-sec-label">Day-by-day breakdown</p>
      <div className="pv-daysum">
        {days.map((day, i) => {
          const names = day.services.map(
            (s) => SERVICE_DISPLAY[s?.serviceType] || s?.serviceType || 'Service'
          );
          const appts = day.services.reduce(
            (a, s) => a + (Number(s?.totalAppointments) || 0),
            0
          );
          const total = day.services.reduce(
            (a, s) => a + (Number(s?.serviceCost) || 0),
            0
          );
          return (
            <div className="pv-daysum-card" key={`${day.date}-${i}`}>
              <h4>
                Day {i + 1} · {formatDayLabel(day.date)}
              </h4>
              <div className="pv-daysum-thumbs">
                {day.services.slice(0, 4).map((s, j) => (
                  <img
                    key={j}
                    src={SERVICE_IMAGE_PATH[s?.serviceType] || SERVICE_IMAGE_PATH.massage}
                    alt=""
                  />
                ))}
              </div>
              <div className="pv-daysum-row">
                <span className="k">Services</span>
                <span className="v">{names.join(', ')}</span>
              </div>
              <div className="pv-daysum-row">
                <span className="k">Appointments</span>
                <span className="v">{appts.toLocaleString('en-US')}</span>
              </div>
              <div className="pv-daysum-row">
                <span className="k">Day total</span>
                <span className="v">{formatCurrency(total)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DayByDayCards;
