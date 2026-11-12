/**
 * Event times for coordinator events created from a proposal.
 *
 * Staff type a wall-clock time ("12:00") for the event's own office. The
 * coordinator stores the real instant plus the office's offset, so "12:00" at a
 * New York office in November is 17:00 UTC with timezoneOffset 300 (EST).
 *
 * The bug this replaces: create-event.js built `new Date("2026-11-16T12:00:00")`
 * inside a Netlify function, which runs in UTC, so a noon start reached the
 * coordinator as 7 AM in New York. Its DST check read the server's own (UTC)
 * clock too, so summer events got winter offsets.
 *
 * The coordinator's own Add Event form asks Parse for the office's timezone
 * (`timezoneInfoForAddress`, from the geocoded address) and converts with it.
 * create-event.js does the same; `fallbackTimezone` below is only for when that
 * lookup fails, and works out the offset from the state with Intl.
 */

/** "2026-11-16" + "12:00" at an office `offsetMinutes` west of UTC → the real Date. */
export function wallClockToDate(dateStr, hhmm, offsetMinutes) {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || '');
  const t = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
  if (!d || !t) throw new Error(`Bad event date or time: "${dateStr}" "${hhmm}"`);
  const asIfUtc = Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(t[1]), Number(t[2]));
  return new Date(asIfUtc + offsetMinutes * 60000);
}

/**
 * Start and end instants for an event. An end at or before the start runs past
 * midnight, like the coordinator form (`if (endTime < startTime) addHours 24`).
 */
export function eventInstants(dateStr, startHHMM, endHHMM, offsetMinutes) {
  const start = wallClockToDate(dateStr, startHHMM, offsetMinutes);
  let end = wallClockToDate(dateStr, endHHMM, offsetMinutes);
  if (end <= start) end = new Date(end.getTime() + 24 * 3600000);
  return { start, end };
}

const ZONE_BY_STATE = {
  // Pacific
  CA: 'America/Los_Angeles', WA: 'America/Los_Angeles', OR: 'America/Los_Angeles', NV: 'America/Los_Angeles',
  // Mountain (Arizona keeps standard time all year)
  AZ: 'America/Phoenix',
  CO: 'America/Denver', UT: 'America/Denver', MT: 'America/Denver', WY: 'America/Denver', NM: 'America/Denver', ID: 'America/Denver',
  // Central
  IL: 'America/Chicago', TX: 'America/Chicago', MN: 'America/Chicago', WI: 'America/Chicago', IA: 'America/Chicago',
  MO: 'America/Chicago', AR: 'America/Chicago', LA: 'America/Chicago', MS: 'America/Chicago', AL: 'America/Chicago',
  TN: 'America/Chicago', KY: 'America/Chicago', IN: 'America/Chicago', KS: 'America/Chicago', NE: 'America/Chicago',
  SD: 'America/Chicago', ND: 'America/Chicago', OK: 'America/Chicago',
  // Alaska, Hawaii
  AK: 'America/Anchorage', HI: 'Pacific/Honolulu',
};

/** IANA zone for a US state, Eastern when unknown. */
export function zoneForState(state) {
  return ZONE_BY_STATE[(state || '').toUpperCase().trim()] || 'America/New_York';
}

/**
 * Offset (minutes west of UTC, like Date#getTimezoneOffset) and abbreviation
 * ("EST", "PDT") of `timeZone` at the moment `at`.
 */
export function zoneInfoAt(timeZone, at) {
  const parts = (opts) => new Intl.DateTimeFormat('en-US', { timeZone, ...opts }).formatToParts(at);
  const name = (opts) => (parts(opts).find((p) => p.type === 'timeZoneName') || {}).value || '';
  const m = /^GMT(?:([+-])(\d{1,2})(?::(\d{2}))?)?$/.exec(name({ timeZoneName: 'shortOffset' }));
  const east = m && m[1] ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] || 0)) : 0;
  return { timezoneOffset: -east, abbreviation: name({ timeZoneName: 'short' }) };
}

/**
 * Timezone for an event when Parse's lookup is unavailable: the state's zone,
 * evaluated at the event's own date and start (so DST is right for that day).
 */
export function fallbackTimezone(state, dateStr, startHHMM) {
  const zone = zoneForState(state);
  // First guess with the zone's offset at noon UTC that day, then re-check at
  // the start itself, which only matters within an hour of a DST switch.
  const guess = zoneInfoAt(zone, wallClockToDate(dateStr, '12:00', 0));
  const atStart = zoneInfoAt(zone, wallClockToDate(dateStr, startHHMM || '12:00', guess.timezoneOffset));
  return atStart;
}
