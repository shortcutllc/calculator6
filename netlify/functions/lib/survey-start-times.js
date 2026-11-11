/**
 * Start times on the post-approval event survey (ProposalSurveyForm).
 *
 * The client picks a start time for each event, one location on one date. The
 * buttons offer the windows our clients actually book for an event of that
 * length, and the client can type any other time. Answers live in
 * proposal_survey_responses.responses[START_TIMES_KEY] as
 * { "<location>|<date>": "HH:MM" }, 24-hour local time at that office, keyed
 * like data.optionsState. The staff Create Event window pre-fills from it, and
 * the Slack survey alert, History and the review window show it.
 * Types for the TypeScript side: survey-start-times.d.ts.
 */

import { clientIncluded, effectiveService } from './client-picks.js';

export const START_TIMES_KEY = 'start_times';

/**
 * The start times clients book most for an event of each length. Studied
 * 2026-11-11 from 2,035 real Coordinator events (2017 to the upcoming
 * calendar), counting each client once per start time so a weekly regular
 * (DraftKings Las Vegas, Wachtell's evening hair) does not outvote everyone.
 * Up to 3 hours: 1 PM leads, 10, 11 and noon close behind. 4 hours: 11 AM,
 * then noon and 1 PM. 5 hours: 10 and 11 tie. 6 hours: 10 AM. 7 hours: 9 and
 * 10 tie. 8 hours and up: 9 AM. `most` is left out where it is a tie.
 */
const COMMON_STARTS = [
  { maxHours: 3, starts: ['10:00', '11:00', '12:00', '13:00'], most: '13:00' },
  { maxHours: 4, starts: ['10:00', '11:00', '12:00', '13:00'], most: '11:00' },
  { maxHours: 5, starts: ['09:00', '10:00', '11:00', '12:00'], most: null },
  { maxHours: 6, starts: ['09:00', '10:00', '11:00', '12:00'], most: '10:00' },
  { maxHours: 7, starts: ['09:00', '10:00', '11:00'], most: null },
  { maxHours: Infinity, starts: ['08:00', '09:00', '10:00'], most: '09:00' },
];

/** Hours rounded to the nearest quarter hour (proposals carry 6.9, 4.17 and the like). */
export function roundHours(hours) {
  const h = Number(hours);
  return Number.isFinite(h) && h > 0 ? Math.round(h * 4) / 4 : 0;
}

export function isClock(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

const toMinutes = (clock) => {
  const [h, m] = clock.split(':').map(Number);
  return h * 60 + m;
};

const fromMinutes = (total) => {
  const m = ((Math.round(total) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/** "10:00" plus 4.5 hours is "14:30". Wraps past midnight. */
export function addHours(clock, hours) {
  if (!isClock(clock)) return clock;
  return fromMinutes(toMinutes(clock) + roundHours(hours) * 60);
}

/** "13:30" reads "1:30 PM", "12:00" reads "12 PM". */
export function formatClock(clock) {
  if (!isClock(clock)) return clock || '';
  const [h, m] = clock.split(':').map(Number);
  const suffix = h < 12 ? 'AM' : 'PM';
  const hour = ((h + 11) % 12) + 1;
  return m ? `${hour}:${String(m).padStart(2, '0')} ${suffix}` : `${hour} ${suffix}`;
}

/** "10 AM to 2 PM" for a start and a length; just the start when the length is unknown. */
export function formatWindow(start, hours) {
  if (!isClock(start)) return '';
  const h = roundHours(hours);
  return h ? `${formatClock(start)} to ${formatClock(addHours(start, h))}` : formatClock(start);
}

/** "4 hours", "30 minutes", "4 hours and 15 minutes". */
export function formatDuration(hours) {
  const total = Math.round(roundHours(hours) * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  const hPart = h ? `${h} hour${h === 1 ? '' : 's'}` : '';
  const mPart = m ? `${m} minutes` : '';
  return hPart && mPart ? `${hPart} and ${mPart}` : hPart || mPart;
}

/** The windows to offer as buttons for an event of this length. */
export function startWindows(hours) {
  const h = roundHours(hours) || 4;
  const row = COMMON_STARTS.find((r) => h <= r.maxHours);
  return row.starts.map((start) => ({ start, end: addHours(start, h), most: start === row.most }));
}

/** Date keys are "2026-07-24" (sometimes "TBD" or a written date). Read as a local date. */
function parseDateKey(raw) {
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw || '');
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "Tue, Dec 4" for a date key; TBD and unreadable keys pass through. */
export function formatDateKey(raw) {
  if (!raw || raw === 'TBD') return 'Date to be set';
  const d = parseDateKey(raw);
  return d ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : raw;
}

/** Length of one event: the longest service the client kept that day. */
function eventHours(services) {
  const hours = services.map((s) => {
    const h = Number(s.totalHours);
    if (h > 0) return h;
    const minutes = Number(s.classLength);
    return minutes > 0 ? minutes / 60 : 0;
  });
  return roundHours(Math.max(0, ...hours)) || 4;
}

/**
 * One slot per event (location and date) the client kept, in the order the
 * proposal lists locations, dates ascending with TBD last. Same rules as the
 * staff Create Event window (client-picks.js).
 */
export function getSurveyEventSlots(data) {
  const slots = [];
  if (!data || !data.services || typeof data.services !== 'object') return slots;
  for (const [location, byDate] of Object.entries(data.services)) {
    const dates = Object.keys(byDate || {}).sort((a, b) => {
      const da = parseDateKey(a);
      const db = parseDateKey(b);
      if (!da || !db) return da ? -1 : db ? 1 : 0;
      return da.getTime() - db.getTime();
    });
    for (const date of dates) {
      const services = ((byDate[date] && byDate[date].services) || [])
        .filter((svc, i) => clientIncluded(data, location, date, i, svc))
        .map(effectiveService);
      if (!services.length) continue;
      slots.push({ key: `${location}|${date}`, location, date, hours: eventHours(services) });
    }
  }
  return slots;
}

/** The saved start times, keeping only well formed entries. */
export function readStartTimes(responses) {
  const raw = responses && typeof responses === 'object' ? responses[START_TIMES_KEY] : null;
  if (!raw || typeof raw !== 'object') return {};
  return Object.fromEntries(Object.entries(raw).filter(([k, v]) => typeof k === 'string' && isClock(v)));
}

/**
 * Readable lines for staff: [{ label, text }]. One "Every day" line when every
 * event starts at the same time; otherwise one line per event, naming the
 * location only when there is more than one. `slots` (from the proposal) adds
 * the end time; without them the line gives the start alone.
 */
export function describeStartTimes(startTimes, slots) {
  const chosen = startTimes && typeof startTimes === 'object' ? startTimes : {};
  const known = Array.isArray(slots) ? slots.filter((s) => s && typeof s.key === 'string') : [];
  const rows = known.length
    ? known.map((s) => ({ ...s, start: chosen[s.key] }))
    : Object.keys(chosen).map((key) => {
        const cut = key.lastIndexOf('|');
        return { key, location: key.slice(0, cut), date: key.slice(cut + 1), hours: 0, start: chosen[key] };
      });
  const picked = rows.filter((r) => isClock(r.start));
  if (!picked.length) return [];

  const sameStart = new Set(picked.map((r) => r.start)).size === 1;
  const sameHours = new Set(picked.map((r) => roundHours(r.hours))).size === 1;
  if (rows.length === 1 || (picked.length === rows.length && sameStart && sameHours)) {
    return [{ label: rows.length === 1 ? '' : 'Every day', text: formatWindow(picked[0].start, picked[0].hours) }];
  }
  const multiLoc = new Set(rows.map((r) => r.location)).size > 1;
  return rows.map((r) => ({
    label: multiLoc ? `${r.location}, ${formatDateKey(r.date)}` : formatDateKey(r.date),
    text: isClock(r.start) ? formatWindow(r.start, r.hours) : 'Not chosen',
  }));
}
