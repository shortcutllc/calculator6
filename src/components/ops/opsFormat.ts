// Small formatting helpers for the ops staffing dashboard.
import type { OpsEvent, OpsNeed, OpsProposal } from '../../services/opsService';
import { SERVICE_IMAGE_PATH } from '../proposal/data';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Tue, Nov 17" from anything Date can read, else the input as is. */
export function dayLabel(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "Oct 28" (or "Oct 28, 2025" outside this year). */
export function shortDate(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return `${MONTHS[d.getMonth()]} ${d.getDate()}${sameYear ? '' : `, ${d.getFullYear()}`}`;
}

// Coordinator times are UTC with the event's own offset (minutes behind UTC, as
// getTimezoneOffset counts), so an event reads in its city's time wherever you are.
function eventLocal(iso: string | null, offset: number | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getTime() - (offset ?? d.getTimezoneOffset()) * 60000);
}

function clock(d: Date): string {
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const h12 = h % 12 || 12;
  return `${h12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`;
}

/** "Tue, Nov 17" in the event's own time zone. */
export function eventDay(event: Pick<OpsEvent, 'startTime' | 'timezoneOffset'>): string {
  const d = eventLocal(event.startTime, event.timezoneOffset);
  if (!d) return '';
  return `${DAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** "9 AM to 4 PM EST" in the event's own time zone. */
export function eventHours(event: Pick<OpsEvent, 'startTime' | 'endTime' | 'timezoneOffset' | 'timezoneAbbreviation'>): string {
  const s = eventLocal(event.startTime, event.timezoneOffset);
  const e = eventLocal(event.endTime, event.timezoneOffset);
  if (!s) return '';
  const tz = event.timezoneAbbreviation ? ` ${event.timezoneAbbreviation}` : '';
  return e ? `${clock(s)} to ${clock(e)}${tz}` : `${clock(s)}${tz}`;
}

/** The YYYY-MM-DD a value falls on (local reading), for matching a proposal date to an event. */
export function ymd(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function eventYmd(event: OpsEvent): string {
  const d = eventLocal(event.startTime, event.timezoneOffset);
  if (!d) return '';
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** "New York" from "155 6th Ave, 6th Floor, New York, NY 10010". */
export function cityFrom(address: string): string {
  const parts = String(address || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 3) return parts[parts.length - 2];
  if (parts.length === 2) return parts[1].replace(/\s+[A-Z]{2}(\s+\d{5})?$/, '') || parts[0];
  return parts[0] || '';
}

export function eventAddress(event: OpsEvent): string {
  const a = event.address;
  return [a.street, a.city, a.state].filter(Boolean).join(', ');
}

export function hoursText(hours: number): string {
  if (!hours) return '';
  const rounded = Math.round(hours * 100) / 100;
  return `${rounded}h`;
}

export function prosText(n: number): string {
  return `${n} Pro${n === 1 ? '' : 's'}`;
}

/** Pedro's ask for an existing Pro, filled in. {firstName} is filled per Pro when sent. */
export function outreachTemplate(p: { service: string; city: string; day: string; hours?: string; address: string }): string {
  const when = p.hours ? `${p.day}, ${p.hours}` : p.day;
  const where = p.address ? ` at ${p.address}` : '';
  return (
    `Hi {firstName}! It's Pedro from Shortcut. We have a ${p.service.toLowerCase()} event in ${p.city} on ${when}${where}. ` +
    `Are you available? Reply YES or NO and I'll send the details.`
  );
}

export function needSummary(need: OpsNeed): string {
  return need.services
    .map((s) => `${s.title}: ${prosText(s.numPros)}${s.totalHours ? ` (${hoursText(s.totalHours)})` : ''}`)
    .join(', ');
}

export function proposalStatusLabel(p: OpsProposal): { label: string; className: string } {
  if (p.status === 'approved') return { label: 'Approved', className: 'bg-green-100 text-green-800' };
  if (p.likely) return { label: 'Likely to close', className: 'bg-amber-100 text-amber-900' };
  return { label: p.status, className: 'bg-gray-100 text-gray-700' };
}

/** Seats filled by real Pros, out of what the event needs. */
export function staffedCount(event: OpsEvent): { staffed: number; needed: number } {
  const staffed = event.seats.filter((s) => !s.placeholder).length;
  const needed = Math.max(event.numBarbersRequired, event.seats.length);
  return { staffed, needed };
}

// The V2 proposal's service photo and dot colour, so a card reads like the proposal.
export function photoForService(serviceType: string | undefined): string | null {
  if (!serviceType) return null;
  const key = serviceType === 'chair-massage' ? 'massage' : serviceType;
  return SERVICE_IMAGE_PATH[key] || SERVICE_IMAGE_PATH[serviceType] || null;
}

const PRO_TYPE_SERVICE: Record<string, string> = {
  Massage: 'massage',
  Hair: 'hair',
  Nails: 'nails',
  Beauty: 'facial',
  Mindfulness: 'mindfulness',
  Photo: 'headshot',
};

export function photoForProType(proType: string | null | undefined): string | null {
  return photoForService(PRO_TYPE_SERVICE[proType || ''] || 'massage');
}

export function dotClassFor(serviceType: string | undefined): string {
  const t = serviceType || '';
  if (t === 'hair' || t === 'beard-trim') return 'is-yellow';
  if (t === 'facial' || t === 'nails' || t === 'nails-hand-massage' || t === 'makeup' || t.startsWith('mindfulness')) return 'is-pink';
  return 'is-aqua';
}

export function initials(name: string): string {
  const parts = String(name || '').replace(/\[.*?\]/g, '').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}
