/**
 * Ops staffing (the /ops dashboard, Nov 2026): what a proposal needs staffed, in the
 * terms Pedro works in - city, date, service, how many Pros, for how long - plus who may
 * use the dashboard and the text of his Slack alerts. No I/O here; ops-api.js and
 * ops-approval-watch.js do the reading and sending.
 */
import { effectiveService, clientIncluded } from './client-picks.js';

/** Who can open /ops and call ops-api. Email signup is open, so a sign-in alone
 *  proves nothing: the account must be on this list (env OPS_STAFF_EMAILS, comma
 *  separated, replaces the default). */
export const DEFAULT_OPS_EMAILS = ['will@getshortcut.co', 'pedro@getshortcut.co'];

export function opsEmails() {
  const fromEnv = (process.env.OPS_STAFF_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return fromEnv.length ? fromEnv : DEFAULT_OPS_EMAILS;
}

export function isOpsStaff(user) {
  const email = String((user && user.email) || '').trim().toLowerCase();
  return !!email && opsEmails().includes(email);
}

/** Proposal service type -> the coordinator's Pro type (Barber.proType). */
export const SERVICE_PRO_TYPE = {
  massage: 'Massage',
  'chair-massage': 'Massage',
  'table-massage': 'Massage',
  facial: 'Beauty',
  makeup: 'Beauty',
  hair: 'Hair',
  'beard-trim': 'Hair',
  nails: 'Nails',
  'nails-hand-massage': 'Nails',
  headshot: 'Photo',
  mindfulness: 'Mindfulness',
  yoga: 'Mindfulness',
  'sound-bath': 'Mindfulness',
  meditation: 'Mindfulness',
  breathwork: 'Mindfulness',
  reiki: 'Mindfulness',
  stretch: 'Massage',
};

/** The Pro type for any proposal service, including the class families. */
export function proTypeFor(serviceType) {
  const t = String(serviceType || '').toLowerCase();
  if (SERVICE_PRO_TYPE[t]) return SERVICE_PRO_TYPE[t];
  if (t.startsWith('mindfulness') || t.startsWith('movement')) return 'Mindfulness';
  return null;
}

export const SERVICE_TITLE = {
  massage: 'Massage',
  'chair-massage': 'Chair massage',
  'table-massage': 'Table massage',
  facial: 'Facials',
  makeup: 'Makeup',
  hair: 'Hair',
  'beard-trim': 'Beard trims',
  nails: 'Nails',
  'nails-hand-massage': 'Nails and hand massage',
  headshot: 'Headshots',
  mindfulness: 'Mindfulness',
  'mindfulness-cle': 'Mindfulness CLE',
  yoga: 'Yoga',
  'sound-bath': 'Sound bath',
  stretch: 'Assisted stretch',
  reiki: 'Reiki',
  meditation: 'Meditation',
  breathwork: 'Breathwork',
};

/** "Sound bath" from "sound-bath" for anything not in the list above. */
export function serviceTitle(serviceType) {
  const t = String(serviceType || '').toLowerCase();
  if (SERVICE_TITLE[t]) return SERVICE_TITLE[t];
  if (t.startsWith('mindfulness')) return 'Mindfulness';
  const words = t.replace(/[-_]+/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Service';
}

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * What the client bought, per location and date, with only the services they kept and
 * each at the guest-count option they picked (same rules as Create Event):
 *   [{ location, address, date, services: [{ serviceType, title, proType, numPros,
 *      totalHours, appTime }], totalPros }]
 */
export function staffingNeeds(proposal) {
  const data = (proposal && proposal.data) || {};
  const services = data.services || {};
  const officeLocations = data.officeLocations || {};
  const needs = [];
  for (const [location, dateMap] of Object.entries(services)) {
    for (const [date, dateData] of Object.entries(dateMap || {})) {
      const kept = ((dateData && dateData.services) || [])
        .map((svc, i) => ({ svc, i }))
        .filter(({ svc, i }) => clientIncluded(data, location, date, i, svc))
        .map(({ svc }) => effectiveService(svc));
      if (!kept.length) continue;
      const rows = kept.map((svc) => {
        const type = String(svc.serviceType || '').toLowerCase();
        return {
          serviceType: type,
          title: serviceTitle(type),
          proType: proTypeFor(type),
          numPros: num(svc.numPros) || 1,
          totalHours: num(svc.totalHours),
          appTime: num(svc.appTime) || null,
        };
      });
      needs.push({
        location,
        address: officeLocations[location] || data.officeLocation || location,
        date,
        services: rows,
        totalPros: rows.reduce((sum, r) => sum + r.numPros, 0),
        eventIDs: [],
      });
    }
  }
  // Which coordinator event is which: Create Event records each one's location and
  // date (create-event.js). Match on the location, then the date when a location has
  // several. The date can differ from the proposal's when the event was moved later.
  const entries = (Array.isArray(proposal && proposal.coordinator_events) ? proposal.coordinator_events : []).filter(
    (e) => e && e.coordinatorEventId
  );
  for (const need of needs) {
    const atLocation = entries.filter((e) => e.location === need.location);
    const sameDay = atLocation.filter((e) => e.date === need.date);
    const chosen = atLocation.length > 1 && sameDay.length ? sameDay : atLocation;
    need.eventIDs = chosen.map((e) => e.coordinatorEventId);
  }
  // One place and one date: every event made from the proposal is for it.
  if (needs.length === 1 && !needs[0].eventIDs.length) {
    needs[0].eventIDs = entries.map((e) => e.coordinatorEventId);
  }
  return needs;
}

/** The coordinator events made from this proposal (create-event.js wrote them). */
export function linkedEventIDs(proposal) {
  const list = Array.isArray(proposal && proposal.coordinator_events) ? proposal.coordinator_events : [];
  return list.map((e) => e && e.coordinatorEventId).filter(Boolean);
}

export function clientName(proposal) {
  return (proposal && ((proposal.data && proposal.data.clientName) || proposal.client_name)) || 'Unknown client';
}

/** "Massage x4 Pros (7h), Mindfulness x1 Pro" for one location/date. */
export function needLine(need) {
  return need.services
    .map((s) => {
      const pros = `${s.numPros} Pro${s.numPros === 1 ? '' : 's'}`;
      const hours = s.totalHours ? ` (${+s.totalHours.toFixed(2)}h)` : '';
      return `${s.title}: ${pros}${hours}`;
    })
    .join(', ');
}

/**
 * The Slack message Pedro gets. kind: 'approved' | 'likely'.
 * Plain text with Slack link syntax; no dashes between clauses (UI copy rule).
 */
export function alertText(kind, proposal, { siteUrl, flaggedBy } = {}) {
  const name = clientName(proposal);
  const head =
    kind === 'approved'
      ? `:white_check_mark: *${name}* approved their proposal. Time to staff it.`
      : `:large_yellow_circle: *${name}* is likely to close${flaggedBy ? ` (flagged by ${flaggedBy})` : ''}. Start lining up Pros.`;
  const needs = staffingNeeds(proposal);
  const lines = needs.slice(0, 8).map((n) => `• ${n.date} at ${n.address}: ${needLine(n)}`);
  if (needs.length > 8) lines.push(`• and ${needs.length - 8} more`);
  const base = (siteUrl || 'https://proposals.getshortcut.co').replace(/\/+$/, '');
  const link = `<${base}/ops?proposal=${proposal.id}|Open it in the staffing dashboard>`;
  return [head, ...lines, link].join('\n');
}

/** A test event or proposal by its name ("TEST", "[test] Staffing", "Test proposal"),
 *  for the ones nobody flagged. The whole word only: "Contest" and "Testa" are real. */
export function looksLikeTest(name) {
  return /(^|[^a-z])test(ing)?([^a-z]|$)/i.test(String(name || ''));
}

// ---- Events made by hand in the coordinator -----------------------------------------
// Most events aren't made with Create Event, so the proposal never learns their ids
// (Bisnow, DraftKings). Those are found by client name on the same calendar day.

const GENERIC_WORDS = new Set([
  'inc', 'llc', 'llp', 'ltd', 'lp', 'co', 'corp', 'corporation', 'company', 'companies',
  'solutions', 'group', 'the', 'and', 'of', 'holdings', 'technologies', 'technology', 'tech',
  'partners', 'io', 'international', 'global', 'event', 'events', 'wellness', 'day', 'days',
  'retreat', 'office', 'offices', 'team', 'nyc', 'ny', 'usa', 'us', 'hq',
]);

/** The words in a client or event name that identify it ("draftkings", "bcg"). */
export function nameTokens(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w.length >= 3 && !GENERIC_WORDS.has(w));
}

/** Whether an event looks like it's for this client. */
export function namesMatch(client, eventName) {
  const tokens = nameTokens(client);
  if (!tokens.length) return false;
  const squashedEvent = String(eventName || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  return tokens.some((t) => squashedEvent.includes(t));
}

/** YYYY-MM-DD for a proposal date ("2026-11-17" or "November 17, 2026"), or null. */
export function needDay(date) {
  const s = String(date || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const t = Date.parse(s);
  if (!Number.isFinite(t)) return null;
  // A date with no time parses as local midnight: read it back the same way.
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** YYYY-MM-DD an event falls on in its own city (timezoneOffset = minutes behind UTC). */
export function eventDay(event) {
  const iso = event && event.startTime && (event.startTime.iso || event.startTime);
  const t = Date.parse(iso || '');
  if (!Number.isFinite(t)) return null;
  const local = new Date(t - (Number(event.timezoneOffset) || 0) * 60000);
  return local.toISOString().slice(0, 10);
}

const squash = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

/** Whether an event's city is this need's place ("New York" in "New York City"). */
function sameCity(event, need) {
  const city = squash(event && event.address && event.address.city);
  if (!city) return false;
  return squash(`${need.location} ${need.address}`).includes(city);
}

/**
 * Adds to each need the coordinator events on its day whose name matches the client:
 * the ones made by hand, and any the Create Event link missed (a second service's event).
 * An event Create Event linked to one location is never added to another, and events in
 * the need's own city are preferred (see below).
 * Mutates need.eventIDs; returns the ids it added.
 * events: Parse Event rows ({ objectId, name, startTime, timezoneOffset, address, isTestEvent }).
 */
export function matchEventsByName(needs, client, events) {
  const found = new Set();
  const claimed = new Set(needs.flatMap((n) => n.eventIDs || []));
  const places = new Set(needs.map((n) => n.location));
  const byDay = new Map();
  for (const e of events || []) {
    if (!e || e.isTestEvent || e.cancelled || looksLikeTest(e.name)) continue;
    const day = eventDay(e);
    if (!day) continue;
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(e);
  }
  for (const need of needs) {
    const day = needDay(need.date);
    if (!day) continue;
    const own = new Set(need.eventIDs || []);
    const candidates = (byDay.get(day) || [])
      .filter((e) => namesMatch(client, e.name))
      .filter((e) => !own.has(e.objectId) && !claimed.has(e.objectId));
    // Events in this need's own city win (BCG Boston vs Women@BCG in Seattle, the same
    // day). When none are, a one-place proposal takes the name match alone - its place
    // can be a venue ("Ascent & Escape") - and a several-place one takes nothing rather
    // than guess between its cities.
    const inCity = candidates.filter((e) => sameCity(e, need));
    const chosen = inCity.length ? inCity : places.size < 2 ? candidates : [];
    const extra = chosen.map((e) => e.objectId);
    need.eventIDs = [...(need.eventIDs || []), ...extra];
    extra.forEach((id) => found.add(id));
  }
  return found;
}
