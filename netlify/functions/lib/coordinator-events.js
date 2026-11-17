/**
 * Coordinator events (the employee sign-up links) made from this app: the Parse
 * payload, the office's timezone, the checks that keep a retry from making a second
 * event, Pro TBD seats, and the record kept on the proposal.
 *
 * Used by create-event.js (staff Create Event modal) and lib/signup-links.js (the
 * AI tools). Every Parse call is the coordinator admin account's (lib/parse-admin.js).
 */
import { callParse, queryParse, parseBackendLabel } from './parse-admin.js';
import { eventInstants, fallbackTimezone, wallClockToDate } from './event-time.js';

/** Placeholder Pros, the backend's own list (SCCloudCode config/constants.ts
 *  PRO_TBD_IDS). A Pro TBD seat makes bookable times before a real Pro is found;
 *  swapBarberForEvent later moves its bookings to the real Pro. */
export const PRO_TBD_IDS = ['FaLRExUlgE', 'kRw9YDqgXV', 'OPMNK3sHwj', '5CPyO4UlVN', '6qHJuH90Ed'];

export const isPlaceholder = (seat) =>
  !!seat && (PRO_TBD_IDS.includes(seat.id || seat.barberID) || /^\s*pro tbd\b/i.test(String(seat.fullName || '')));

/** The admin site that reads the same backend as this function. */
export function adminSiteUrl() {
  return parseBackendLabel() === 'dev' ? 'https://dev-admin.shortcutpros.com' : 'https://admin.shortcutpros.com';
}

/** Every link worth handing out for one event. */
export function eventLinks(eventId, code) {
  const site = adminSiteUrl();
  const c = code ? encodeURIComponent(code) : '';
  return {
    signupUrl: `${site}/#/signup/${eventId}`,
    seriesUrl: c ? `${site}/#/selectEvent/${c}` : null,
    managerUrl: c ? `${site}/#/manage/${c}` : null,
    signUrl: `${site}/#/sign/${eventId}`,
    editUrl: `${site}/#/editEvent/${eventId}`,
    timeslotsUrl: `${site}/#/timeslots/${eventId}`,
  };
}

// --- Timezone ---

/**
 * The office's offset and abbreviation on the event's day, the way the
 * coordinator's Add Event form gets them: Parse's timezoneInfoForAddress, which
 * geocodes the address. Falls back to the state's zone (lib/event-time.js).
 */
export async function resolveTimezone(eventForm) {
  try {
    const result = await callParse('timezoneInfoForAddress', {
      address: eventForm.address,
      apptDate: { __type: 'Date', iso: wallClockToDate(eventForm.eventDate, eventForm.startTime, 0).toISOString() },
    });
    if (result && Number.isFinite(result.timezoneOffset) && result.abbreviation) {
      return { timezoneOffset: result.timezoneOffset, timezoneAbbreviation: result.abbreviation, source: 'address' };
    }
    console.warn('timezoneInfoForAddress returned no offset, using the state fallback:', result);
  } catch (err) {
    console.warn('timezoneInfoForAddress failed, using the state fallback:', err.message || err);
  }
  const fb = fallbackTimezone(eventForm.address?.state, eventForm.eventDate, eventForm.startTime);
  return { timezoneOffset: fb.timezoneOffset, timezoneAbbreviation: fb.abbreviation, source: 'state' };
}

// --- Event form → addEvent payload ---

// Optional text: trimmed, or undefined so the coordinator keeps its automatic text.
const optionalText = (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

export function transformToCoordinatorPayload(eventForm, tz) {
  // The times are the office's wall clock; turn them into real instants with
  // the office's offset on that day (see lib/event-time.js for the old bug).
  const { start, end } = eventInstants(eventForm.eventDate, eventForm.startTime, eventForm.endTime, tz.timezoneOffset);
  const groupClass = eventForm.groupClass === true;
  const taxRate = parseFloat(eventForm.taxRate);

  return {
    // Basic info
    name: eventForm.name,
    category: eventForm.category,
    description: eventForm.description || `Event for ${eventForm.name}`,
    mobileEventCode: eventForm.eventCode,
    // The room on site; blank (or an older modal build without the field) falls
    // back to the proposal's location label, as before.
    locationDescription: (eventForm.locationDescription || '').trim() || eventForm.locationName,

    // Page copy, like the coordinator's Add Event form. Blank keeps the
    // automatic text; the list-page title and intro apply to every event with
    // this code (addEvent only copies them across when they are not blank).
    signupTitle: optionalText(eventForm.signupTitle),
    signupHeadline: optionalText(eventForm.signupHeadline),
    seriesIntro: optionalText(eventForm.seriesIntro),
    applyToSeries: true,
    attendeeInstructions: optionalText(eventForm.attendeeInstructions),
    confirmationSubject: optionalText(eventForm.confirmationSubject),

    // Who books and how
    enableGuests: eventForm.enableGuests === true,
    maxGuests: eventForm.enableGuests === true ? (parseInt(eventForm.maxGuests, 10) || 0) : 0,
    optionalContact: eventForm.optionalContact === true,

    // Address
    address: {
      street: eventForm.address.street,
      unit: eventForm.address.unit || '',
      city: eventForm.address.city,
      state: eventForm.address.state,
      zip: eventForm.address.zip,
      country: eventForm.address.country || 'US',
    },

    // Contact
    contacts: [{
      name: eventForm.contactName,
      phone: eventForm.contactPhone,
      email: eventForm.contactEmail,
    }],

    // Financial
    payment: eventForm.payment,
    barberHourlyRate: eventForm.hourlyRate,
    numBarbersRequired: eventForm.numPros,
    taxRate: Number.isFinite(taxRate) ? taxRate : undefined,

    // Services: the coordinator service ids. Never a `price`: addEvent makes any
    // event with a priced service (even $0) a paid one.
    serviceOfferings: eventForm.services
      .filter(s => s.coordinatorServiceId)
      .map(s => ({
        id: s.coordinatorServiceId,
        serviceTitle: s.coordinatorServiceTitle,
      })),

    // Timing — Parse Cloud Functions expect Date objects in {__type, iso} format
    startTime: { __type: 'Date', iso: start.toISOString() },
    endTime: { __type: 'Date', iso: end.toISOString() },
    lengthPerService: eventForm.lengthPerService,
    // Group class: several people book each time (a sound bath, a yoga class).
    signupsPerTimeslot: groupClass ? Math.min(500, Math.max(2, parseInt(eventForm.signupsPerTimeslot, 10) || 2)) : 1,

    timezoneOffset: tz.timezoneOffset,
    timezoneAbbreviation: tz.timezoneAbbreviation,

    // Settings
    isSecret: eventForm.isSecret || false,
    doesNotRequireTimeslots: eventForm.doesNotRequireTimeslots || false,
    sendAutoEmailsManually: eventForm.sendAutoEmailsManually || false,
    // Both default ON, like the coordinator's Add Event form: only an explicit
    // false (the admin unticked the box) turns them off. With multiple
    // reservations off, an attendee can book one event in the whole series.
    // The backend reads a missing oneReservationPerEvent as false.
    allowMultipleReservations: eventForm.allowMultipleReservations !== false,
    oneReservationPerEvent: eventForm.oneReservationPerEvent !== false,
    overrideNameCheck: eventForm.overrideNameCheck || false,
    isTestEvent: eventForm.isTestEvent || false,
    isOutbound: false,

    // Optional fields — match coordinator's exact field names
    legacyName: eventForm.legacyName || '',
    eventLinkURL: eventForm.eventLinkURL || null,
    sponsorName: eventForm.sponsorName || undefined,
    managerPassword: eventForm.managerPassword || null,
    staffNotes: eventForm.staffNotes || '',
    adminNotes: eventForm.adminNotes || '',
    delayUntilSpecificDayBefore: null,
    delayUntilNumDaysBefore: null,

    // Logo URL (coordinator expects 'logo' field)
    logo: eventForm.clientLogoUrl || undefined,
  };
}

/** addEvent as the admin; the new event's id. */
export async function addCoordinatorEvent(payload) {
  const result = await callParse('addEvent', payload);
  // Parse returns { result: "eventId" }; callParse hands back the result.
  const eventId = typeof result === 'string' ? result : result?.id || result?.objectId;
  if (!eventId) throw { statusCode: 502, message: 'The coordinator made no event id', code: 'NO_EVENT_ID' };
  return eventId;
}

// --- Checks before creating ---

const EVENT_KEYS = [
  'name', 'mobileEventCode', 'startTime', 'endTime', 'timezoneOffset', 'timezoneAbbreviation', 'address',
  'locationDescription', 'serviceOfferings', 'numBarbersRequired', 'barberList', 'numTotalTimeslots',
  'numOpenTimeslots', 'isTestEvent', 'cancelled', 'isSecret', 'signupsPerTimeslot', 'lengthPerService',
];

const parseDate = (d) => ({ __type: 'Date', iso: new Date(d).toISOString() });

/** A live event with this code that starts at this exact moment: the one an earlier
 *  call already made (an AI retry, or a call cut off by the function's time limit). */
export async function findSameEvent(code, startIso) {
  const rows = await queryParse('Event', {
    where: { mobileEventCode: code, startTime: parseDate(startIso), cancelled: { $ne: true } },
    keys: EVENT_KEYS,
    limit: 5,
  });
  return rows[0] || null;
}

/** What the code is already used for: its past events under another name (addEvent
 *  refuses those: "Names must match"), and every event in the series. */
export async function codeUsage(code, name) {
  const rows = await queryParse('Event', {
    where: { mobileEventCode: code },
    keys: ['name', 'startTime', 'endTime', 'cancelled', 'isTestEvent'],
    limit: 200,
    order: '-startTime',
  });
  const now = Date.now();
  const past = rows.filter((e) => Date.parse(e.endTime?.iso || '') <= now);
  return {
    total: rows.length,
    upcoming: rows.filter((e) => !e.cancelled && Date.parse(e.endTime?.iso || '') > now).length,
    clash: past.find((e) => e.name !== name) || null,
  };
}

/** A free code starting with `base`: BASE, BASE2, BASE3... none used before. */
export async function freeCode(base) {
  for (let n = 1; n < 30; n++) {
    const code = n === 1 ? base : `${base}${n}`;
    const used = await queryParse('Event', { where: { mobileEventCode: code }, keys: ['name'], limit: 1 });
    if (!used.length) return code;
  }
  return `${base}${Date.now().toString(36).slice(-3).toUpperCase()}`;
}

/** One event as the tools describe it. */
export async function readEvent(eventId) {
  const rows = await queryParse('Event', { where: { objectId: eventId }, keys: EVENT_KEYS, limit: 1 });
  return rows[0] || null;
}

// --- Pro TBD seats ---

/**
 * Fills the event's empty Pro seats with Pro TBD placeholders, one at a time (the
 * backend rewrites the event's whole Pro list on each add, so two at once would lose
 * one). Stops before `deadline` (ms) so the function answers inside its time limit;
 * calling again carries on. The backend has five placeholders, so five seats at most.
 */
export async function fillProTbdSeats(eventId, { deadline = Date.now() + 6000 } = {}) {
  const event = await readEvent(eventId);
  if (!event) throw { statusCode: 404, message: 'That event no longer exists.', code: 'NOT_FOUND' };
  const list = event.barberList || [];
  const required = Number(event.numBarbersRequired) || 0;
  const onEvent = new Set(list.map((b) => b.id));
  const free = PRO_TBD_IDS.filter((id) => !onEvent.has(id));
  const wanted = Math.max(required - list.length, 0);
  const result = { added: 0, emptySeats: wanted, stoppedForTime: false, error: null };
  for (const barberID of free.slice(0, wanted)) {
    if (Date.now() > deadline) {
      result.stoppedForTime = true;
      break;
    }
    try {
      await callParse('addBarberToEvent', { eventID: eventId, barberID, isLeadBarber: false });
      result.added += 1;
      result.emptySeats -= 1;
    } catch (err) {
      // "Pro already added" means a cut-off earlier call got there first.
      if (!/already added/i.test(err.message || '')) {
        result.error = err.message || 'Could not add a Pro TBD seat';
        break;
      }
      result.emptySeats -= 1;
    }
  }
  if (!result.stoppedForTime && !result.error && result.emptySeats > 0 && free.length < wanted) {
    result.error = `Only ${PRO_TBD_IDS.length} Pro TBD placeholders exist, so ${result.emptySeats} seat${result.emptySeats === 1 ? '' : 's'} stay empty until real Pros are added.`;
  }
  return result;
}

// --- Seats and times, as people read them ---

/** Who is on an event: real Pros, placeholders, and seats nobody holds. */
export function seatSummary(event) {
  const list = event?.barberList || [];
  const required = Number(event?.numBarbersRequired) || 0;
  const placeholders = list.filter(isPlaceholder);
  const real = list.filter((b) => !isPlaceholder(b));
  const total = Number(event?.numTotalTimeslots) || 0;
  const open = Number(event?.numOpenTimeslots) || 0;
  return {
    prosNeeded: required,
    pros: real.map((b) => ({ id: b.id, name: b.fullName || '', confirmedInApp: !!b.approved })),
    proTbdSeats: placeholders.length,
    emptySeats: Math.max(required - list.length, 0),
    bookableTimes: total,
    booked: Math.max(total - open, 0),
  };
}

/** "Tue, Dec 10, 2026, 12:00 PM to 4:00 PM EST", in the office's own time. */
export function describeWhen(startIso, endIso, offsetMinutes, abbreviation) {
  const local = (iso) => new Date(Date.parse(iso) - (Number(offsetMinutes) || 0) * 60000);
  const s = local(startIso);
  const e = local(endIso);
  if (Number.isNaN(s.getTime())) return '';
  const day = s.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const clock = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
  return `${day}, ${clock(s)} to ${clock(e)}${abbreviation ? ` ${abbreviation}` : ''}`;
}

/** The event as the tools hand it back. */
export function eventCard(event) {
  if (!event) return null;
  const a = event.address || {};
  return {
    eventId: event.objectId,
    name: event.name || '',
    code: event.mobileEventCode || null,
    when: describeWhen(event.startTime?.iso, event.endTime?.iso, event.timezoneOffset, event.timezoneAbbreviation),
    date: event.startTime?.iso
      ? new Date(Date.parse(event.startTime.iso) - (Number(event.timezoneOffset) || 0) * 60000).toISOString().slice(0, 10)
      : null,
    address: [a.street, a.unit, a.city, [a.state, a.zip].filter(Boolean).join(' ')].filter(Boolean).join(', '),
    room: event.locationDescription || '',
    services: (event.serviceOfferings || []).map((s) => s.serviceTitle || s.id),
    isTestEvent: !!event.isTestEvent,
    cancelled: !!event.cancelled,
    staffing: seatSummary(event),
    links: eventLinks(event.objectId, event.mobileEventCode),
  };
}

// --- The record on the proposal ---

/**
 * Adds events to proposals.coordinator_events (the Staffing tab and Create Event read
 * it). It used to be overwritten on every create, which forgot the events made before.
 * An entry for the same event replaces the old one; a failed attempt at the same
 * location and date is replaced by a success.
 */
export async function recordOnProposal(supabase, proposalId, entries) {
  if (!proposalId || !entries.length) return;
  const { data: row, error } = await supabase
    .from('proposals')
    .select('coordinator_events')
    .eq('id', proposalId)
    .single();
  if (error) {
    console.error('coordinator_events read failed:', error.message);
    return;
  }
  let list = Array.isArray(row?.coordinator_events) ? row.coordinator_events.slice() : [];
  for (const e of entries) {
    list = list.filter((old) => {
      if (e.coordinatorEventId && old.coordinatorEventId === e.coordinatorEventId) return false;
      if (e.status === 'created' && old.status === 'error' && old.location === e.location && old.date === e.date) return false;
      return true;
    });
    list.push(e);
  }
  const { error: upErr } = await supabase.from('proposals').update({ coordinator_events: list }).eq('id', proposalId);
  if (upErr) console.error('Failed to update proposal with event data:', upErr.message);
}

/** A row on the Sign-up links page (sign_up_links), once per event. */
export async function recordSignUpLink(supabase, { userId, proposalId, clientName, eventDate, location, eventName, services, eventId, signupUrl }) {
  const { data: existing } = await supabase
    .from('sign_up_links')
    .select('id')
    .eq('coordinator_event_id', eventId)
    .limit(1);
  if (existing && existing.length) return;
  const { error } = await supabase.from('sign_up_links').insert({
    user_id: userId || null,
    proposal_id: proposalId || null,
    proposal_client_name: clientName || eventName || 'Event',
    event_date: eventDate || null,
    event_location: location || null,
    event_name: eventName || null,
    service_types: services || [],
    coordinator_event_id: eventId,
    signup_url: signupUrl,
    status: 'active',
  });
  if (error) console.warn('sign_up_links insert failed:', error.message);
}
