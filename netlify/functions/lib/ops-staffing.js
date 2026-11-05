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
};

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
};

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
          title: SERVICE_TITLE[type] || svc.serviceType || 'Service',
          proType: SERVICE_PRO_TYPE[type] || null,
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
      });
    }
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
