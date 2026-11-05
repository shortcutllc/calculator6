// The ops staffing dashboard's one door to the server: netlify/functions/ops-api.js.
// Every call carries the staff sign-in token; the function checks the account is on
// the ops list before doing anything.
import { supabase } from '../lib/supabaseClient';

export interface OpsServiceNeed {
  serviceType: string;
  title: string;
  proType: string | null;
  numPros: number;
  totalHours: number;
  appTime: number | null;
}

export interface OpsNeed {
  location: string;
  address: string;
  date: string;
  services: OpsServiceNeed[];
  totalPros: number;
  // The coordinator events made for this location and date.
  eventIDs: string[];
}

export interface OpsSeat {
  barberID: string;
  fullName: string;
  placeholder: boolean;
  isLead: boolean;
  confirmedInApp: boolean;
  proType: string | null;
  startTime: string | null;
  endTime: string | null;
}

export interface OpsEvent {
  id: string;
  name: string;
  mobileEventCode: string | null;
  startTime: string | null;
  endTime: string | null;
  timezoneOffset: number | null;
  timezoneAbbreviation: string | null;
  cancelled: boolean;
  isTestEvent: boolean;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    coordinates: { latitude: number; longitude: number } | null;
  };
  locationDescription: string;
  numBarbersRequired: number;
  seats: OpsSeat[];
  placeholderSeats: number;
  emptySeats: number;
  openSeats: number;
  links: { addPro: string; swapPro: string; timeslots: string; editEvent: string };
  // On a proposal card: made with Create Event, or found by client name and date.
  matchedBy?: 'created' | 'name';
}

export interface OpsProposal {
  id: string;
  clientName: string;
  status: string;
  optionName: string | null;
  createdAt: string;
  updatedAt: string;
  likely: boolean;
  likelySetBy: string | null;
  likelySetAt: string | null;
  approvedAlertedAt: string | null;
  staffingNote: string;
  needs: OpsNeed[];
  totalPros: number;
  lastEventDate: number | null;
  eventIDs: string[];
  events: OpsEvent[];
  missingEventIDs: string[];
}

export interface OpsGroupMembership {
  groupID: string;
  name: string;
  tier: number;
}

export interface OpsPro {
  id: string;
  fullName: string;
  firstName: string;
  proType: string | null;
  pinLocation: string | null;
  phone: string;
  hasPhone: boolean;
  email: string | null;
  pic: string | null;
  active: boolean;
  eventsOnly: boolean;
  readyForEvents: boolean;
  optedOut: boolean;
  numCompletedEvents: number;
  lastEventDate: string | null;
  lastEventName: string | null;
  eventsLast90: number;
  eventsLast365: number;
  upcomingEvents: number;
  nextEventDate: string | null;
  groups: OpsGroupMembership[];
  distanceMiles?: number | null;
  // How the roster placed them: their service-area pin, or their home address when
  // they have no pin (some event Pros).
  locatedBy?: 'pin' | 'address' | null;
  // Past events for the client being staffed, and at its address (last three years).
  clientEvents?: number;
  lastClientEventDate?: string | null;
  lastClientEventName?: string | null;
  siteEvents?: number;
  lastSiteEventDate?: string | null;
}

export interface OpsGroupMember {
  tier: number;
  addedAt: string | null;
  missing: boolean;
  pro: OpsPro | null;
  barberID: string;
}

export interface OpsGroup {
  id: string;
  name: string;
  city: string;
  proType: string | null;
  center: { latitude: number; longitude: number } | null;
  radiusMiles: number | null;
  archived: boolean;
  numMembers: number;
  updatedAt: string | null;
  createdAt: string | null;
  members?: OpsGroupMember[];
}

export interface OpsOutreach {
  id: string;
  label: string;
  message: string;
  eventID: string | null;
  proposalID: string | null;
  groupID: string | null;
  fromPhone: string;
  status: string;
  numRecipients: number;
  numQueued: number;
  numSent: number;
  numSkipped: number;
  numFailed: number;
  createdByName: string;
  createdAt: string | null;
  finishedAt: string | null;
  results?: { yes: number; no: number; maybe: number; replied: number };
}

export type OpsOutcome = 'yes' | 'no' | 'maybe';

export interface OpsRecipient {
  barberID: string;
  fullName: string;
  toPhone: string;
  body: string;
  status: 'queued' | 'sent' | 'skipped' | 'failed';
  skipReason: string | null;
  error: string | null;
  sentAt: string | null;
  outcome: OpsOutcome | null;
  outcomeSetBy: 'reply' | 'staff' | null;
  lastReplyAt: string | null;
  replies: { body: string; receivedAt: string | null; replyClass: string }[];
}

export interface OpsBoard {
  backend: 'dev' | 'live' | 'unset';
  proposals: OpsProposal[];
  otherEvents: OpsEvent[];
  warnings: string[];
}

export interface OpsRoster {
  // Null for a search by name alone.
  center: { latitude: number; longitude: number } | null;
  radiusMiles: number | null;
  truncated: boolean;
  pros: OpsPro[];
}

export class OpsError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function opsCall<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new OpsError('Please sign in again.', 401);
  const res = await fetch('/.netlify/functions/ops-api', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action, ...params }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new OpsError(body.error || `Something went wrong (${res.status}).`, res.status, body.code);
  }
  return body as T;
}

export const ops = {
  me: () => opsCall<{ email: string; backend: OpsBoard['backend'] }>('me'),
  board: () => opsCall<OpsBoard>('board'),
  pendingProposals: (q: string) =>
    opsCall<{
      proposals: { id: string; clientName: string; status: string; optionName: string | null; updatedAt: string; likely: boolean }[];
    }>('pendingProposals', { q }),
  setLikely: (proposalId: string, likely: boolean) =>
    opsCall<{ proposalId: string; likely: boolean; alerted: boolean }>('setLikely', { proposalId, likely }),
  setNote: (proposalId: string, note: string) => opsCall<{ proposalId: string; note: string }>('setNote', { proposalId, note }),
  roster: (params: {
    addressString?: string;
    coordinates?: { latitude: number; longitude: number };
    proTypes: string[];
    radiusMiles?: number;
    q?: string;
    clientName?: string;
    atSite?: boolean;
    includeInactive?: boolean;
  }) =>
    opsCall<OpsRoster>('roster', params),
  groups: (params: { groupID?: string; includeArchived?: boolean } = {}) => opsCall<{ groups: OpsGroup[] }>('groups', params),
  saveGroup: (params: {
    groupID?: string;
    name?: string;
    city?: string;
    proType?: string | null;
    addressString?: string;
    center?: { latitude: number; longitude: number } | null;
    radiusMiles?: number | null;
    archived?: boolean;
  }) => opsCall<{ group: OpsGroup }>('saveGroup', params),
  setGroupMembers: (groupID: string, changes: { barberID: string; tier: number | null }[]) =>
    opsCall<{ group: OpsGroup }>('setGroupMembers', { groupID, changes }),
  send: (params: { barberIDs: string[]; message: string; label: string; eventID?: string; proposalID?: string; groupID?: string }) =>
    opsCall<{ outreachID: string; numRecipients: number; numQueued: number; skipped: { barberID: string; reason: string }[] }>('send', params),
  outreach: (outreachID: string) => opsCall<{ outreach: OpsOutreach; recipients: OpsRecipient[] }>('outreach', { outreachID }),
  outreaches: (params: { eventID?: string; proposalID?: string }) => opsCall<{ outreaches: OpsOutreach[] }>('outreaches', params),
  setOutcome: (outreachID: string, barberID: string, outcome: OpsOutcome | null) =>
    opsCall<{ barberID: string; outcome: OpsOutcome | null }>('setOutcome', { outreachID, barberID, outcome }),
  putOnEvent: (eventID: string, barberID: string, replaceBarberID?: string) =>
    opsCall<{ event: OpsEvent | null }>('putOnEvent', { eventID, barberID, replaceBarberID }),
};

export const PRO_TYPES = ['Massage', 'Hair', 'Nails', 'Beauty', 'Mindfulness', 'Photo', 'Events'];

export const SKIP_REASON_TEXT: Record<string, string> = {
  'opted-out': 'Opted out of texts',
  'no-phone': 'No phone number',
  placeholder: 'A Pro TBD placeholder',
  'not-found': 'Pro not found',
};
