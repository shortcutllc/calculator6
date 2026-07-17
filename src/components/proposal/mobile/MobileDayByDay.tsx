import React from 'react';
import { SERVICE_DISPLAY, SERVICE_IMAGE_PATH, formatCurrency } from '../data';
import { parseLocalDate } from '../../../utils/dateHelpers';

// MobileDayByDay — the `.pvm-day` rendering of the day-by-day breakdown: one
// stacked card per event day with service thumbnails + Services / Appointments
// / Day-total rows. Honors the live include-toggle (excluded services drop out;
// a day with nothing included disappears) via the `isIncluded` predicate —
// same contract as the desktop DayByDayCards.

interface MobileDayByDayProps {
  servicesByLocation: Record<string, Record<string, { services: any[] }>>;
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

const MobileDayByDay: React.FC<MobileDayByDayProps> = ({
  servicesByLocation,
  isIncluded,
}) => {
  const days: { date: string; services: any[] }[] = [];
  Object.entries(servicesByLocation || {}).forEach(([loc, byDate]) => {
    Object.entries(byDate || {}).forEach(([date, dd]: [string, any]) => {
      const ds = (dd?.services || []).filter((_s: any, idx: number) =>
        isIncluded ? isIncluded(loc, date, idx) : true
      );
      if (ds.length) days.push({ date, services: ds });
    });
  });
  if (days.length === 0) return null;

  return (
    <>
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
          <div className="pvm-day" key={`${day.date}-${i}`}>
            <h4>
              Day {i + 1} · {formatDayLabel(day.date)}
            </h4>
            <div className="pvm-day-thumbs">
              {day.services.slice(0, 4).map((s, j) => (
                <img
                  key={j}
                  src={SERVICE_IMAGE_PATH[s?.serviceType] || SERVICE_IMAGE_PATH.massage}
                  alt=""
                />
              ))}
            </div>
            <div className="pvm-row">
              <span className="k">Services</span>
              <span className="v">{names.join(', ')}</span>
            </div>
            <div className="pvm-row">
              <span className="k">Appointments</span>
              <span className="v">{appts.toLocaleString('en-US')}</span>
            </div>
            <div className="pvm-row">
              <span className="k">Day total</span>
              <span className="v">{formatCurrency(total)}</span>
            </div>
          </div>
        );
      })}
    </>
  );
};

export default MobileDayByDay;
