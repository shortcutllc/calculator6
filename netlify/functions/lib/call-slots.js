/**
 * The call grid, as pure functions: which 15-minute starts exist, and which
 * the host is free for. No network here, so a test can pin `now`. Ported
 * unchanged from the website (shortcut repo,
 * frontend/netlify/functions/lib/call-slots.mjs). The rules live in
 * ./call-hours.js.
 */
import {
  CALL_TZ,
  CALL_WEEKDAYS,
  CALL_FIRST_START,
  CALL_LAST_START,
  CALL_MINUTES,
  CALL_NOTICE_MINUTES,
  CALL_BUFFER_MINUTES,
  CALL_WINDOW_DAYS,
  CALL_CLOSED_DATES,
} from './call-hours.js';

const MIN = 60_000;
export const CALL_MS = CALL_MINUTES * MIN;
export const BUFFER_MS = CALL_BUFFER_MINUTES * MIN;

const partsFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: CALL_TZ, hourCycle: 'h23',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
});

function zoned(ms) {
  const p = Object.fromEntries(partsFmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, s: +p.second };
}

/** Local-minus-UTC offset of CALL_TZ at instant `ms`. */
function offsetAt(ms) {
  const z = zoned(ms);
  return Date.UTC(z.y, z.m - 1, z.d, z.h, z.mi, z.s) - Math.floor(ms / 1000) * 1000;
}

/** An Eastern wall-clock time as a UTC instant. Calls never sit on a DST jump. */
export function easternToUtc(y, m, d, h, mi) {
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const first = guess - offsetAt(guess);
  const second = guess - offsetAt(first);
  return second;
}

/** 'YYYY-MM-DD' of instant `ms` in Eastern time. */
export function easternDate(ms) {
  const z = zoned(ms);
  return `${z.y}-${String(z.m).padStart(2, '0')}-${String(z.d).padStart(2, '0')}`;
}

const hm = (s) => s.split(':').map(Number);

/**
 * Every bookable start in the window, before the host's calendar is
 * consulted: Mon–Fri, not a closed date, FIRST_START..LAST_START every
 * CALL_MINUTES, and at least CALL_NOTICE_MINUTES from now.
 * [{ start, end, day }] in ms.
 */
export function candidateSlots(now = Date.now()) {
  const today = zoned(now);
  const [fh, fm] = hm(CALL_FIRST_START);
  const [lh, lm] = hm(CALL_LAST_START);
  const earliest = now + CALL_NOTICE_MINUTES * MIN;
  const out = [];
  for (let i = 0; i < CALL_WINDOW_DAYS; i++) {
    const cal = new Date(Date.UTC(today.y, today.m - 1, today.d + i));
    const y = cal.getUTCFullYear(), m = cal.getUTCMonth() + 1, d = cal.getUTCDate();
    const iso = cal.getUTCDay() || 7;
    const day = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (!CALL_WEEKDAYS.includes(iso) || CALL_CLOSED_DATES.includes(day)) continue;
    for (let t = fh * 60 + fm; t <= lh * 60 + lm; t += CALL_MINUTES) {
      const start = easternToUtc(y, m, d, Math.floor(t / 60), t % 60);
      if (start >= earliest) out.push({ start, end: start + CALL_MS, day });
    }
  }
  return out;
}

/** Google's busy list as ms pairs. */
export function busyMs(list) {
  return (list || [])
    .map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) }))
    .filter((b) => Number.isFinite(b.start) && Number.isFinite(b.end));
}

/** True when nothing on `busy` comes within BUFFER_MS of [start, end). */
export function isFree(busy, start, end) {
  return !busy.some((b) => b.start < end + BUFFER_MS && b.end > start - BUFFER_MS);
}

/** The span a free/busy query has to cover for these slots. */
export function querySpan(slots) {
  return { timeMin: slots[0].start - BUFFER_MS, timeMax: slots[slots.length - 1].end + BUFFER_MS };
}

const labelFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: CALL_TZ, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
});
/** 'Tue, Oct 13, 10:15 AM ET', for Slack and logs. */
export const easternLabel = (ms) => `${labelFmt.format(new Date(ms))} ET`;

export const slotJson = (s) => ({ start: new Date(s.start).toISOString(), day: s.day });
