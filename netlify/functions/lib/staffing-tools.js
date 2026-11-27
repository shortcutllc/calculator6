/**
 * The rest of the /ops Staffing page as AI tools (Will, 2026-11-27): Pro in Slack and
 * every teammate's AI (mcp.js) can now do what the page does, not only find Pros and
 * put one on an event (those stay in lib/signup-links.js).
 *
 *   get_staffing_board       the page's board: approved proposals and those flagged
 *                            likely to close, what each needs, its events' seats, plus
 *                            other upcoming events (made by hand) still short of Pros
 *   list_pending_proposals   proposals not yet approved with a date ahead, to flag
 *   set_likely_to_close      flag or unflag; the first flag alerts ops in Slack
 *   set_staffing_note        the ops note on a proposal's staffing
 *   text_pros                text Pros from the Pros line. Preview first, sends on confirm
 *   get_pro_replies          who was texted, their replies and yes / no / maybe
 *   set_pro_reply_outcome    record a Pro's answer by hand
 *   save_pro_group           make or edit a Pro group (city + service)
 *   set_pro_group_members    add Pros to a group in a tier, move or remove them
 *
 * Every action is the page's own (lib/ops-actions.js), so the tools and the page
 * cannot disagree. Who may call them: the same staff check as Pro's other staffing
 * tools (Slack workspace members; personal API keys on the connector). The page's
 * OPS_STAFF_EMAILS list is its sign-in check, because website signup is open; Pedro
 * has no Slack mapping, so gating by email would lock out the person who uses it
 * most. Anything that texts a Pro previews first.
 */
import { OPS_ACTIONS } from './ops-actions.js';
import { callParse, parseBackendLabel, queryParse } from './parse-admin.js';
import { describeWhen, eventLinks, PRO_TBD_IDS } from './coordinator-events.js';
import { needDay } from './ops-staffing.js';

const SITE = 'https://proposals.getshortcut.co';
const MAX_RECIPIENTS = 200; // the backend's own limits (SCCloudCode pro-staffing.ts)
const MAX_MESSAGE = 1000;
const MAX_TIER = 5;

const has = (o, k) => o && o[k] !== undefined && o[k] !== null && o[k] !== '';
const clean = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const userError = (message) => ({ error: message });

/** Run one of the page's actions as this caller; its thrown failures become { error }. */
async function run(action, body, supabase, caller) {
  try {
    return await OPS_ACTIONS[action](body, { supabase, user: { email: (caller && caller.email) || null } });
  } catch (e) {
    if (e && e.statusCode) return { error: e.message };
    throw e;
  }
}

// ---- formatting ----------------------------------------------------------------------

function whenOf(e) {
  return describeWhen(e.startTime, e.endTime, e.timezoneOffset, e.timezoneAbbreviation);
}

/** One coordinator event in a line or two: who is on it and what is open. */
function eventBrief(e) {
  const seats = e.seats || [];
  const real = seats.filter((s) => !s.placeholder);
  return {
    eventId: e.id,
    name: e.name,
    when: whenOf(e),
    prosNeeded: e.numBarbersRequired,
    pros: real.map((s) => `${s.fullName}${s.confirmedInApp ? '' : ' (not confirmed in the app)'}`),
    proTbdSeats: e.placeholderSeats || 0,
    emptySeats: e.emptySeats || 0,
    openSeats: e.openSeats || 0,
    links: eventLinks(e.id, e.mobileEventCode),
  };
}

function needLine(n) {
  const services = (n.services || [])
    .map((s) => `${s.numPros} ${s.title}${s.totalHours ? `, ${s.totalHours}h` : ''}`)
    .join('; ');
  return { location: n.location, date: n.date, address: n.address, services, pros: n.totalPros, eventIds: n.eventIDs || [] };
}

/** Today where it is latest in the US, as the page's pending list reads it: a date
 *  stays ahead until its day is over everywhere. */
const todayUS = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());

function boardCard(p) {
  // Only what is still ahead: a recurring proposal keeps its past dates, and "no
  // sign-up link yet" for a day already gone is noise.
  const today = todayUS();
  const needs = (p.needs || []).filter((n) => {
    const day = needDay(n.date);
    return !day || day >= today;
  });
  const events = (p.events || [])
    .filter((e) => !(Date.parse(e.endTime) < Date.now() - 12 * 3600 * 1000))
    .map(eventBrief);
  const noEvent = needs.filter((n) => !(n.eventIDs || []).length);
  const openSeats = events.reduce((sum, e) => sum + e.openSeats, 0);
  return {
    proposalId: p.id,
    client: p.clientName,
    option: p.optionName || undefined,
    status: p.status === 'approved' ? 'approved' : `${p.status}, flagged likely to close`,
    likelyToClose: p.likely,
    flaggedBy: p.likely ? p.likelySetBy || undefined : undefined,
    staffingNote: p.staffingNote || undefined,
    proposalUrl: `${SITE}/proposal/${p.id}`,
    needs: needs.map(needLine),
    events,
    // What is still to do, in plain words.
    toDo: [
      ...noEvent.map((n) => `No sign-up link (coordinator event) yet for ${n.location} on ${n.date}: create_signup_link with this proposalId.`),
      ...(openSeats ? [`${openSeats} seat${openSeats === 1 ? '' : 's'} still Pro TBD or empty: find_pros with the eventId.`] : []),
      ...((p.missingEventIDs || []).length ? [`${p.missingEventIDs.length} event(s) made from it are gone (deleted, cancelled or test).`] : []),
    ],
    fullyStaffed: !noEvent.length && !openSeats && events.length > 0,
  };
}

// ---- get_staffing_board ----------------------------------------------------------------

export async function getStaffingBoard(params, supabase, caller) {
  const res = await run('board', {}, supabase, caller);
  if (res.error) return res;
  const onlyShort = params.onlyShort === true;
  const client = clean(params.client, 80).toLowerCase();
  let cards = (res.proposals || []).map(boardCard);
  if (has(params, 'proposalId')) cards = cards.filter((c) => c.proposalId === String(params.proposalId));
  if (client) cards = cards.filter((c) => String(c.client || '').toLowerCase().includes(client));
  if (onlyShort) cards = cards.filter((c) => !c.fullyStaffed);

  let others = (res.otherEvents || []).map(eventBrief);
  if (client) others = others.filter((e) => String(e.name || '').toLowerCase().includes(client));
  if (onlyShort || params.includeStaffedEvents !== true) others = others.filter((e) => e.openSeats > 0);
  const limit = Math.min(Math.max(Number(params.limit) || 40, 1), 100);

  return {
    backend: res.backend,
    proposals: cards,
    otherEvents: others.slice(0, limit),
    otherEventsNote:
      'Upcoming coordinator events not made from a proposal on the board' +
      (params.includeStaffedEvents === true ? '.' : ', only those still short of Pros (includeStaffedEvents: true lists all).'),
    warnings: (res.warnings || []).length ? res.warnings : undefined,
    page: `${SITE}/ops`,
  };
}

// ---- list_pending_proposals ------------------------------------------------------------

export async function listPendingProposals(params, supabase, caller) {
  const res = await run('pendingProposals', { q: clean(params.client || params.q, 80) }, supabase, caller);
  if (res.error) return res;
  const rows = (res.proposals || []).slice(0, Math.min(Math.max(Number(params.limit) || 30, 1), 100));
  return {
    proposals: rows.map((r) => ({
      proposalId: r.id,
      client: r.clientName,
      option: r.optionName || undefined,
      status: r.status,
      changesSubmitted: r.changesSubmitted || undefined,
      nextDate: r.nextDate,
      dates: r.numDates,
      locations: r.locations,
      services: (r.services || []).map((s) => s.title).join(', '),
      pros: r.totalPros,
      total: r.totalCost ? `$${Math.round(r.totalCost).toLocaleString('en-US')}` : undefined,
      likelyToClose: r.likely,
      proposalUrl: `${SITE}/proposal/${r.id}`,
    })),
    message: rows.length ? undefined : 'No proposals waiting on approval with a date ahead.',
  };
}

// ---- set_likely_to_close / set_staffing_note ------------------------------------------

export async function setLikelyToClose(params, supabase, caller) {
  const proposalId = clean(params.proposalId, 64);
  if (!proposalId) return userError('Which proposal? (proposalId)');
  const likely = params.likely !== false;
  const res = await run('setLikely', { proposalId, likely }, supabase, caller);
  if (res.error) return res;
  if (has(params, 'note')) {
    const noted = await run('setNote', { proposalId, note: clean(params.note, 2000) }, supabase, caller);
    if (noted.error) return noted;
  }
  return {
    success: true,
    proposalId,
    likelyToClose: likely,
    message: likely
      ? `Flagged likely to close. It is on the staffing board now${res.alerted ? ', and ops got a Slack alert to start lining up Pros' : ' (ops were already alerted for it once, or the alert did not go through)'}.`
      : 'Unflagged. It leaves the staffing board unless it is approved.',
    page: `${SITE}/ops`,
  };
}

export async function setStaffingNote(params, supabase, caller) {
  const proposalId = clean(params.proposalId, 64);
  if (!proposalId) return userError('Which proposal? (proposalId)');
  const res = await run('setNote', { proposalId, note: clean(params.note, 2000) }, supabase, caller);
  if (res.error) return res;
  return { success: true, proposalId, staffingNote: res.note || '', message: res.note ? 'Note saved on the staffing board.' : 'Note cleared.' };
}

// ---- text_pros -------------------------------------------------------------------------

const render = (message, pro) =>
  message.replace(/\{firstName\}/g, pro.firstName || (pro.fullName || '').split(' ')[0] || '').replace(/\{fullName\}/g, pro.fullName || '');

export async function textPros(params, supabase, caller) {
  const ids = Array.from(new Set((Array.isArray(params.barberIds) ? params.barberIds : []).map((x) => clean(x, 40)).filter(Boolean)));
  if (!ids.length) return userError('Which Pros? Pass barberIds from find_pros, list_pro_groups or get_event_staffing.');
  if (ids.length > MAX_RECIPIENTS) return userError(`At most ${MAX_RECIPIENTS} Pros in one send.`);
  const message = String(params.message ?? '').trim();
  if (!message) return userError('Write the message (message). {firstName} and {fullName} are filled in for each Pro.');
  if (message.length > MAX_MESSAGE) return userError(`Keep the message under ${MAX_MESSAGE} characters (it is ${message.length}).`);

  const rows = await queryParse('Barber', {
    where: { objectId: { $in: ids } },
    keys: ['fullName', 'firstName', 'isoPhoneNumber', 'deleted', 'onboarding_removed'],
    limit: MAX_RECIPIENTS,
  });
  const byId = new Map(rows.map((r) => [r.objectId, r]));
  const unknown = ids.filter((id) => !byId.has(id) || byId.get(id).deleted);
  const placeholders = ids.filter((id) => PRO_TBD_IDS.includes(id) || /^\s*pro tbd\b/i.test(String(byId.get(id)?.fullName || '')));
  const noPhone = ids.filter((id) => byId.has(id) && !byId.get(id).isoPhoneNumber && !placeholders.includes(id));
  const texted = ids.filter((id) => byId.has(id) && !unknown.includes(id) && !placeholders.includes(id) && !noPhone.includes(id));
  if (!texted.length) return userError('None of those can be texted (unknown, Pro TBD placeholders, or no phone number).');

  let event = null;
  if (has(params, 'eventId')) {
    const ev = ((await callParse('pullEventStaffing_Admin', { eventIDs: [clean(params.eventId, 40)] })).events || [])[0];
    if (!ev) return userError('No event has that eventId.');
    event = ev;
  }
  const label = clean(params.label, 120) || (event ? `${event.name}, ${whenOf(event)}` : '');
  const names = texted.map((id) => byId.get(id).fullName);
  const sample = byId.get(texted[0]);

  if (params.confirm !== true) {
    return {
      preview: true,
      willDo: `Text ${texted.length} Pro${texted.length === 1 ? '' : 's'} from the Pros line${label ? ` (logged as "${label}")` : ''}: ${names.join(', ')}.`,
      sampleText: { to: sample.fullName, text: render(message, sample) },
      skipped: [
        ...unknown.map((id) => `${id}: no such Pro`),
        ...placeholders.map((id) => `${byId.get(id)?.fullName || id}: a Pro TBD placeholder`),
        ...noPhone.map((id) => `${byId.get(id).fullName}: no phone number`),
      ],
      notes: [
        'Pros who opted out of texts from the Pros line are skipped when it sends.',
        'Replies come back to the Pros line and are read as yes, no or maybe; get_pro_replies shows them.',
        ...(parseBackendLabel() === 'dev' ? ['This is the dev backend: only test Pros, nothing reaches a real phone.'] : []),
      ],
      next: 'Show the user exactly this (who gets it and the sample text). Only when they say send, call text_pros again with the same arguments plus confirm: true.',
    };
  }

  const res = await run(
    'send',
    {
      barberIDs: texted,
      message,
      label,
      eventID: event ? event.id : undefined,
      proposalID: clean(params.proposalId, 64) || undefined,
      groupID: clean(params.groupId, 40) || undefined,
    },
    supabase,
    caller
  );
  if (res.error) return res;
  return {
    success: true,
    outreachId: res.outreachID,
    sending: res.numQueued,
    skipped: (res.skipped || []).map((s) => `${byId.get(s.barberID)?.fullName || s.barberID}: ${s.reason}`),
    message: `Sending to ${res.numQueued} Pro${res.numQueued === 1 ? '' : 's'} now. Their replies and answers: get_pro_replies with outreachId ${res.outreachID}.`,
  };
}

// ---- get_pro_replies / set_pro_reply_outcome -------------------------------------------

export async function getProReplies(params, supabase, caller) {
  if (has(params, 'outreachId')) {
    const res = await run('outreach', { outreachID: clean(params.outreachId, 40) }, supabase, caller);
    if (res.error) return res;
    const o = res.outreach || {};
    return {
      outreachId: o.id,
      label: o.label || undefined,
      message: o.message,
      sentBy: o.createdByName || undefined,
      sentAt: o.createdAt,
      eventId: o.eventID || undefined,
      proposalId: o.proposalID || undefined,
      counts: { recipients: o.numRecipients, sent: o.numSent, skipped: o.numSkipped, failed: o.numFailed, status: o.status },
      pros: (res.recipients || []).map((r) => ({
        barberId: r.barberID,
        name: r.fullName,
        status: r.status,
        skipped: r.skipReason || undefined,
        error: r.error || undefined,
        answer: r.outcome || undefined,
        answerSetBy: r.outcome ? (r.outcomeSetBy === 'staff' ? 'staff' : 'read from their reply') : undefined,
        replies: (r.replies || []).map((x) => ({ text: x.body, at: x.receivedAt })),
      })),
    };
  }
  const res = await run(
    'outreaches',
    {
      eventID: clean(params.eventId, 40) || undefined,
      proposalID: clean(params.proposalId, 64) || undefined,
      limit: Math.min(Math.max(Number(params.limit) || 10, 1), 50),
    },
    supabase,
    caller
  );
  if (res.error) return res;
  return {
    sends: (res.outreaches || []).map((o) => ({
      outreachId: o.id,
      label: o.label || undefined,
      message: o.message,
      sentBy: o.createdByName || undefined,
      sentAt: o.createdAt,
      eventId: o.eventID || undefined,
      proposalId: o.proposalID || undefined,
      recipients: o.numRecipients,
      results: o.results,
    })),
    next: 'Pass one outreachId to see each Pro\'s replies and answer.',
  };
}

const OUTCOMES = ['yes', 'no', 'maybe'];

export async function setProReplyOutcome(params, supabase, caller) {
  const outreachId = clean(params.outreachId, 40);
  const barberId = clean(params.barberId, 40);
  if (!outreachId || !barberId) return userError('Which send and which Pro? (outreachId, barberId from get_pro_replies)');
  const raw = clean(params.outcome, 10).toLowerCase();
  const outcome = raw === 'clear' || raw === '' ? null : raw;
  if (outcome !== null && !OUTCOMES.includes(outcome)) return userError('outcome is yes, no, maybe, or clear.');
  const res = await run('setOutcome', { outreachID: outreachId, barberID: barberId, outcome }, supabase, caller);
  if (res.error) return res;
  return { success: true, barberId: res.barberID, answer: res.outcome || null };
}

// ---- save_pro_group / set_pro_group_members --------------------------------------------

const PRO_TYPE_WORDS = [
  ['Massage', /massage/],
  ['Nails', /nail|manicure|pedicure/],
  ['Hair', /hair|barber|blowout|beard|cut/],
  ['Beauty', /beauty|facial|makeup|make-up|glam/],
  ['Photo', /photo|headshot/],
  ['Mindfulness', /mindful|meditat|yoga|sound|breath|movement/],
];

function proTypeOf(value) {
  const s = String(value || '').trim().toLowerCase();
  if (!s) return null;
  const hit = PRO_TYPE_WORDS.find(([, re]) => re.test(s));
  return hit ? hit[0] : undefined;
}

export async function saveProGroup(params, supabase, caller) {
  const isNew = !has(params, 'groupId');
  const body = { groupID: isNew ? undefined : clean(params.groupId, 40) };
  if (has(params, 'name')) body.name = clean(params.name, 80);
  if (has(params, 'city')) body.city = clean(params.city, 80);
  if (has(params, 'service')) {
    const t = proTypeOf(params.service);
    if (t === undefined) return userError('service is one of Massage, Nails, Hair, Beauty, Photo, Mindfulness.');
    body.proType = t;
  }
  if (has(params, 'radiusMiles')) body.radiusMiles = Number(params.radiusMiles);
  if (has(params, 'address')) body.addressString = clean(params.address, 200);
  if (params.archived === true || params.archived === false) body.archived = params.archived;
  if (isNew && (!body.name || !body.city || !body.proType || !body.addressString)) {
    return userError('A new group needs a name, city, service and an address (its center, for distances). radiusMiles defaults to the page\'s.');
  }
  const res = await run('saveGroup', body, supabase, caller);
  if (res.error) return res;
  const g = res.group || {};
  return {
    success: true,
    groupId: g.id,
    name: g.name,
    city: g.city,
    service: g.proType,
    radiusMiles: g.radiusMiles,
    archived: !!g.archived,
    members: (g.members || []).length,
    message: isNew ? 'Group made. Add Pros with set_pro_group_members.' : 'Group saved.',
  };
}

export async function setProGroupMembers(params, supabase, caller) {
  const groupId = clean(params.groupId, 40);
  if (!groupId) return userError('Which group? (groupId from list_pro_groups)');
  const changes = [];
  for (const a of Array.isArray(params.add) ? params.add : []) {
    const tier = Number(a && a.tier);
    if (!a || !clean(a.barberId, 40)) return userError('Every Pro to add needs a barberId.');
    if (!(Number.isInteger(tier) && tier >= 1 && tier <= MAX_TIER)) return userError(`A tier is a whole number from 1 (first call) to ${MAX_TIER}.`);
    changes.push({ barberID: clean(a.barberId, 40), tier });
  }
  for (const id of Array.isArray(params.remove) ? params.remove : []) {
    if (clean(id, 40)) changes.push({ barberID: clean(id, 40), tier: null });
  }
  if (!changes.length) return userError('Pass add: [{ barberId, tier }] and/or remove: [barberId].');
  const res = await run('setGroupMembers', { groupID: groupId, changes }, supabase, caller);
  if (res.error) return res;
  const g = res.group || {};
  return {
    success: true,
    groupId: g.id,
    name: g.name,
    added: changes.filter((c) => c.tier !== null).length,
    removed: changes.filter((c) => c.tier === null).length,
    members: (g.members || []).length,
    next: 'list_pro_groups with this groupId shows the tiers.',
  };
}

export const STAFFING_TOOL_HANDLERS = {
  get_staffing_board: getStaffingBoard,
  list_pending_proposals: listPendingProposals,
  set_likely_to_close: setLikelyToClose,
  set_staffing_note: setStaffingNote,
  text_pros: textPros,
  get_pro_replies: getProReplies,
  set_pro_reply_outcome: setProReplyOutcome,
  save_pro_group: saveProGroup,
  set_pro_group_members: setProGroupMembers,
};
