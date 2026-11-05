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
 *   pendingProposals {q}       recent proposals not yet approved, to flag
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
import { callParse, parseBackendLabel, queryParse } from './lib/parse-admin.js';
import { notifyOps } from './lib/ops-notify.js';
import {
  alertText,
  clientName,
  isOpsStaff,
  linkedEventIDs,
  matchEventsByName,
  staffingNeeds,
} from './lib/ops-staffing.js';

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const fail = (statusCode, message, code = 'BAD_REQUEST') => {
  throw { statusCode, message, code };
};

const DAY_MS = 24 * 3600 * 1000;
const PROPOSAL_FIELDS =
  'id, client_name, status, data, coordinator_events, created_at, updated_at, option_name, proposal_group_id, is_test';

function siteUrl() {
  return process.env.URL || 'https://proposals.getshortcut.co';
}

/** The last date a proposal's events fall on, or null when none of its dates parse. */
function lastEventDate(needs) {
  const times = needs.map((n) => Date.parse(n.date)).filter((t) => Number.isFinite(t));
  return times.length ? Math.max(...times) : null;
}

async function flagsFor(supabase, ids) {
  const map = new Map();
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase
      .from('ops_proposal_flags')
      .select('*')
      .in('proposal_id', ids.slice(i, i + 200));
    if (error) throw { statusCode: 500, message: `Flags: ${error.message}`, code: 'DB_ERROR' };
    (data || []).forEach((f) => map.set(f.proposal_id, f));
  }
  return map;
}

async function eventsByID(eventIDs, warnings) {
  const map = new Map();
  const unique = Array.from(new Set(eventIDs));
  for (let i = 0; i < unique.length; i += 100) {
    try {
      const res = await callParse('pullEventStaffing_Admin', { eventIDs: unique.slice(i, i + 100) });
      // Test events never count (Will): not as seats, not as staffing.
      (res.events || []).filter((e) => !e.isTestEvent && !e.cancelled).forEach((e) => map.set(e.id, e));
    } catch (e) {
      warnings.push(`Could not read event seats: ${e.message}`);
      break;
    }
  }
  return map;
}

// Every coordinator event from three days ago to eight months out, staffed or not, for
// finding the ones made by hand (the Upcoming Events page reads Event the same way).
async function horizonEvents(warnings) {
  const iso = (t) => ({ __type: 'Date', iso: new Date(t).toISOString() });
  try {
    return await queryParse('Event', {
      where: {
        endTime: { $gte: iso(Date.now() - 3 * DAY_MS) },
        startTime: { $lte: iso(Date.now() + 240 * DAY_MS) },
        cancelled: { $ne: true },
        isTestEvent: { $ne: true },
      },
      keys: ['name', 'startTime', 'endTime', 'timezoneOffset', 'address', 'mobileEventCode', 'isTestEvent', 'cancelled'],
      limit: 1000,
      order: 'startTime',
    });
  } catch (e) {
    warnings.push(`Could not look up events made in the coordinator: ${e.message}`);
    return [];
  }
}

function proposalCard(p, flag, events, needs, foundByName) {
  const ids = Array.from(new Set(needs.flatMap((n) => n.eventIDs || [])));
  const created = new Set(linkedEventIDs(p));
  return {
    id: p.id,
    clientName: clientName(p),
    status: p.status,
    optionName: p.option_name || null,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    likely: !!(flag && flag.likely_to_close),
    likelySetBy: (flag && flag.likely_set_by) || null,
    likelySetAt: (flag && flag.likely_set_at) || null,
    approvedAlertedAt: (flag && flag.approved_alerted_at) || null,
    staffingNote: (flag && flag.staffing_note) || '',
    needs: needs.map((n) => ({ ...n, eventIDs: (n.eventIDs || []).filter((id) => events.has(id)) })),
    totalPros: needs.reduce((sum, n) => sum + n.totalPros, 0),
    lastEventDate: lastEventDate(needs),
    eventIDs: ids.filter((id) => events.has(id)),
    events: ids
      .map((id) => events.get(id))
      .filter(Boolean)
      .map((e) => ({ ...e, matchedBy: created.has(e.id) ? 'created' : foundByName.has(e.id) ? 'name' : 'created' })),
    // Made with Create Event but gone (deleted, cancelled, a test event, or another backend).
    missingEventIDs: Array.from(created).filter((id) => !events.has(id)),
  };
}

const ACTIONS = {
  async me(_body, { user }) {
    return { email: user.email, backend: parseBackendLabel() };
  },

  async board(_body, { supabase }) {
    const warnings = [];
    const since = new Date(Date.now() - 150 * DAY_MS).toISOString();
    const { data: approved, error } = await supabase
      .from('proposals')
      .select(PROPOSAL_FIELDS)
      .eq('status', 'approved')
      .gte('updated_at', since)
      .order('updated_at', { ascending: false })
      .limit(150);
    if (error) fail(500, `Proposals: ${error.message}`, 'DB_ERROR');

    const { data: likelyFlags, error: lfErr } = await supabase
      .from('ops_proposal_flags')
      .select('*')
      .eq('likely_to_close', true)
      .limit(200);
    if (lfErr) fail(500, `Flags: ${lfErr.message}`, 'DB_ERROR');
    const approvedIDs = new Set((approved || []).map((p) => p.id));
    const likelyIDs = (likelyFlags || []).map((f) => f.proposal_id).filter((id) => !approvedIDs.has(id));
    let likely = [];
    if (likelyIDs.length) {
      const { data, error: lErr } = await supabase.from('proposals').select(PROPOSAL_FIELDS).in('id', likelyIDs);
      if (lErr) fail(500, `Proposals: ${lErr.message}`, 'DB_ERROR');
      likely = data || [];
    }

    // Only what is still ahead (or ended in the last two days).
    const cutoff = Date.now() - 2 * DAY_MS;
    const proposals = [...(approved || []), ...likely].filter((p) => {
      if (p.is_test) return false;
      const last = lastEventDate(staffingNeeds(p));
      return last === null || last >= cutoff;
    });

    const flags = await flagsFor(supabase, proposals.map((p) => p.id));
    const horizon = await horizonEvents(warnings);
    const needsByID = new Map();
    const foundByName = new Set();
    for (const p of proposals) {
      const needs = staffingNeeds(p);
      matchEventsByName(needs, clientName(p), horizon).forEach((id) => foundByName.add(id));
      needsByID.set(p.id, needs);
    }
    const linked = Array.from(new Set([...needsByID.values()].flatMap((needs) => needs.flatMap((n) => n.eventIDs || []))));
    const events = await eventsByID(linked, warnings);

    let otherEvents = [];
    try {
      const res = await callParse('pullEventStaffing_Admin', { upcomingDays: 60 });
      const linkedSet = new Set(linked);
      otherEvents = (res.events || []).filter((e) => !linkedSet.has(e.id) && !e.isTestEvent);
    } catch (e) {
      warnings.push(`Could not read upcoming events: ${e.message}`);
    }

    const cards = proposals
      .map((p) => proposalCard(p, flags.get(p.id), events, needsByID.get(p.id), foundByName))
      .sort((a, b) => (a.lastEventDate ?? Infinity) - (b.lastEventDate ?? Infinity));

    return { backend: parseBackendLabel(), proposals: cards, otherEvents, warnings };
  },

  async pendingProposals(body, { supabase }) {
    const since = new Date(Date.now() - 120 * DAY_MS).toISOString();
    let query = supabase
      .from('proposals')
      .select('id, client_name, status, option_name, updated_at, is_test')
      .neq('status', 'approved')
      .gte('updated_at', since)
      .order('updated_at', { ascending: false })
      .limit(30);
    const q = String(body.q || '').trim().replace(/[%,()]/g, ' ');
    if (q) query = query.ilike('client_name', `%${q}%`);
    const { data, error } = await query;
    if (error) fail(500, `Proposals: ${error.message}`, 'DB_ERROR');
    const rows = (data || []).filter((p) => !p.is_test);
    const flags = await flagsFor(supabase, rows.map((p) => p.id));
    return {
      proposals: rows.map((p) => ({
        id: p.id,
        clientName: p.client_name || 'Unknown client',
        status: p.status,
        optionName: p.option_name || null,
        updatedAt: p.updated_at,
        likely: !!(flags.get(p.id) && flags.get(p.id).likely_to_close),
      })),
    };
  },

  async setLikely(body, { supabase, user }) {
    const proposalId = String(body.proposalId || '');
    if (!proposalId) fail(400, 'Which proposal?');
    const likely = !!body.likely;
    const { data: proposal, error } = await supabase
      .from('proposals')
      .select(PROPOSAL_FIELDS)
      .eq('id', proposalId)
      .maybeSingle();
    if (error) fail(500, `Proposal: ${error.message}`, 'DB_ERROR');
    if (!proposal) fail(404, 'That proposal no longer exists.', 'NOT_FOUND');

    const existing = (await flagsFor(supabase, [proposalId])).get(proposalId);
    const now = new Date().toISOString();
    const row = {
      proposal_id: proposalId,
      likely_to_close: likely,
      likely_set_by: user.email,
      likely_set_at: now,
      updated_at: now,
    };
    let alerted = false;
    if (likely && !(existing && existing.likely_alerted_at) && proposal.status !== 'approved') {
      const who = String(user.email || '').split('@')[0];
      const sent = await notifyOps(
        alertText('likely', proposal, { siteUrl: siteUrl(), flaggedBy: who.charAt(0).toUpperCase() + who.slice(1) })
      );
      if (sent.reached) {
        row.likely_alerted_at = now;
        alerted = true;
      }
    }
    const { error: upErr } = await supabase.from('ops_proposal_flags').upsert(row, { onConflict: 'proposal_id' });
    if (upErr) fail(500, `Flag: ${upErr.message}`, 'DB_ERROR');
    return { proposalId, likely, alerted };
  },

  async setNote(body, { supabase }) {
    const proposalId = String(body.proposalId || '');
    if (!proposalId) fail(400, 'Which proposal?');
    const note = String(body.note || '').slice(0, 2000);
    const { error } = await supabase
      .from('ops_proposal_flags')
      .upsert({ proposal_id: proposalId, staffing_note: note, updated_at: new Date().toISOString() }, { onConflict: 'proposal_id' });
    if (error) fail(500, `Note: ${error.message}`, 'DB_ERROR');
    return { proposalId, note };
  },

  roster(body) {
    return callParse('pullStaffingRoster_Admin', {
      addressString: body.addressString || undefined,
      coordinates: body.coordinates || undefined,
      proTypes: Array.isArray(body.proTypes) ? body.proTypes : [],
      radiusMiles: body.radiusMiles || undefined,
      includeInactive: !!body.includeInactive,
      // On the dev backend the test Pros (reserved numbers nothing can text) are the
      // ones to try things on; the live roster never shows them.
      includeTestPros: parseBackendLabel() === 'dev',
    });
  },

  groups(body) {
    return callParse('pullProGroups_Admin', {
      groupID: body.groupID || undefined,
      includeArchived: !!body.includeArchived,
    });
  },

  async saveGroup(body) {
    const params = {
      groupID: body.groupID || undefined,
      name: body.name,
      city: body.city,
      proType: body.proType,
      radiusMiles: body.radiusMiles,
      archived: body.archived,
    };
    if (body.center) {
      params.center = body.center;
    } else if (body.addressString) {
      // The backend geocodes for the roster; reuse that to place the group.
      const found = await callParse('pullStaffingRoster_Admin', {
        addressString: body.addressString,
        radiusMiles: 1,
        proTypes: body.proType ? [body.proType] : [],
      });
      params.center = found.center;
    }
    Object.keys(params).forEach((k) => params[k] === undefined && delete params[k]);
    return callParse('saveProGroup_Admin', params);
  },

  setGroupMembers(body) {
    return callParse('setProGroupMembers_Admin', { groupID: body.groupID, changes: body.changes });
  },

  send(body) {
    return callParse('sendProOutreach_Admin', {
      barberIDs: body.barberIDs,
      message: body.message,
      label: body.label,
      eventID: body.eventID || undefined,
      proposalID: body.proposalID || undefined,
      groupID: body.groupID || undefined,
    });
  },

  outreach(body) {
    return callParse('pullProOutreach_Admin', { outreachID: body.outreachID });
  },

  outreaches(body) {
    return callParse('pullProOutreaches_Admin', {
      eventID: body.eventID || undefined,
      proposalID: body.proposalID || undefined,
      limit: body.limit || undefined,
    });
  },

  setOutcome(body) {
    return callParse('setProOutreachOutcome_Admin', {
      outreachID: body.outreachID,
      barberID: body.barberID,
      outcome: body.outcome ?? null,
    });
  },

  eventStaffing(body) {
    return callParse('pullEventStaffing_Admin', { eventIDs: body.eventIDs || [] });
  },

  async putOnEvent(body) {
    const eventID = String(body.eventID || '');
    const barberID = String(body.barberID || '');
    if (!eventID || !barberID) fail(400, 'Which event and which Pro?');
    if (body.replaceBarberID) {
      await callParse('swapBarberForEvent', {
        eventID,
        barberID: String(body.replaceBarberID),
        newBarberID: barberID,
        isLeadBarber: false,
      });
    } else {
      await callParse('addBarberToEvent', { eventID, barberID, isLeadBarber: false });
    }
    const res = await callParse('pullEventStaffing_Admin', { eventIDs: [eventID] });
    return { event: (res.events || [])[0] || null };
  },
};

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
