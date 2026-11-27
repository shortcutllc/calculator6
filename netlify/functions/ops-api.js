/**
 * Ops staffing API, behind the /ops dashboard (Pedro + Will, Nov 2026).
 *
 * POST { action, ...params } with the staff sign-in token (Authorization: Bearer).
 * Only accounts in OPS_STAFF_EMAILS (lib/ops-staffing.js) get in: email signup is open,
 * so a sign-in alone proves nothing.
 *
 * Proposals and the "likely to close" flag come from Supabase (service role; the
 * ops_proposal_flags table has no public policies). Everything about Pros, groups,
 * texts and event seats is the Shortcut backend's (SCCloudCode
 * cloud/modules/events/pro-staffing.ts), called as the coordinator admin account via
 * lib/parse-admin.js. Texts go from the Pros line; nothing here sends one itself.
 *
 * Actions:
 *   me                         who you are, which backend (dev / live)
 *   board                      proposals to staff (approved + flagged likely) with what
 *                              each needs and its coordinator events' seats, plus other
 *                              upcoming events still short of Pros
 *   pendingProposals {q}       proposals not yet approved with a date ahead, to flag
 *   setLikely {proposalId, likely}   flag / unflag; first flag alerts ops in Slack
 *   setNote {proposalId, note}
 *   roster {addressString | coordinates, proTypes, radiusMiles, includeInactive}
 *   groups {groupID?, includeArchived?}
 *   saveGroup {groupID?, name, city, proType, addressString | center, radiusMiles, archived}
 *   setGroupMembers {groupID, changes: [{barberID, tier | null}]}
 *   send {barberIDs, message, label, eventID?, proposalID?, groupID?}
 *   outreach {outreachID}      outreaches {eventID? | proposalID?}
 *   setOutcome {outreachID, barberID, outcome}
 *   eventStaffing {eventIDs}
 *   putOnEvent {eventID, barberID, replaceBarberID?}   into a Pro TBD seat (swap) or an
 *                              empty one (add), with the coordinator's own functions
 */
import { authenticate } from './lib/staff-auth.js';
import { isOpsStaff } from './lib/ops-staffing.js';
import { OPS_ACTIONS as ACTIONS } from './lib/ops-actions.js';

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });


export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'POST only' });

  let auth;
  try {
    auth = await authenticate(req);
  } catch (e) {
    return json(e.statusCode || 401, { error: e.message, code: e.code });
  }
  if (!isOpsStaff(auth.user)) {
    return json(403, { error: 'The staffing dashboard is for the ops team. Ask Will for access.', code: 'NOT_OPS' });
  }

  const raw = await req.text();
  let body = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return json(400, { error: 'Send JSON.' });
  }

  const handler = ACTIONS[body.action];
  if (!handler) return json(400, { error: `Unknown action: ${body.action}` });
  try {
    return json(200, await handler(body, auth));
  } catch (e) {
    if (!e || !e.statusCode) console.error('[ops-api]', body.action, e);
    return json((e && e.statusCode) || 500, { error: (e && e.message) || 'Something went wrong.', code: e && e.code });
  }
};
