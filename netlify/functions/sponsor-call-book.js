/**
 * POST /.netlify/functions/sponsor-call-book — book a call from a sponsor
 * page onto its teammate's Google Calendar (SponsorCallSheet.tsx).
 *
 * Works like the website's intro-call booking (shortcut repo,
 * frontend/netlify/functions/call-book.mjs), with one host instead of a
 * round robin: the teammate the page is sent from.
 *
 * Body (strings): { slug, password, start, firstName, lastName, email, phone,
 *   organization, notes, picked: ['Package: Signature', ...] }
 *   start   an ISO time from sponsor-call-slots
 *   picked  the visitor's choices in the pricing section, if they came from it
 *
 * 1. The page must be published and unlocked by `password`, and sent from a
 *    teammate in lib/call-hours.js CALL_HOSTS.
 * 2. `start` must be a start the rules allow right now: on the grid, in hours,
 *    Mon–Fri, at least 2 hours away.
 * 3. One upcoming call per email per teammate, and at most 5 a day from one
 *    address: the invite is an email Google sends from the teammate's
 *    account, so this must not become a way to send them to strangers. Both
 *    are counted from private properties on the teammate's own calendar
 *    events, so there is no store to run.
 * 4. The teammate's calendar is read again for that slot, then the event goes
 *    on it, as them, with a Meet link and the visitor as the guest. Google
 *    emails the invite (sendUpdates=all).
 * 5. Posted to the proposals Slack channel.
 *
 * 200 { ok, start, end, host, meet }
 * 409 { error: 'taken', slots }   the time went; fresh slots attached
 * 409 { error: 'already', start } this email already has a call coming up
 * 429 { error: 'limit' } · 400 bad input · 404/403 page · 503 not configured
 * 502 Google failed
 *
 * The invite description is written for the visitor, who sees it too: their
 * own answers, nothing internal.
 */
import { createHash, randomUUID } from 'node:crypto';
import { CALL_TZ, CALL_MINUTES } from './lib/call-hours.js';
import { calendarConfigured, insertEvent, eventsWithProperty } from './lib/gcal.js';
import { candidateSlots, easternLabel, isFree, querySpan, slotJson } from './lib/call-slots.js';
import { json, CORS, str, pageAndHost, hostBusy, openSlots } from './lib/sponsor-call.js';

const MAX_BYTES = 10_000;
const PER_IP_PER_DAY = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIELDS = ['firstName', 'lastName', 'email', 'phone', 'organization'];
const PAGE_BASE = 'https://proposals.getshortcut.co/sponsor';

const hash = (v) => createHash('sha256').update(v).digest('hex').slice(0, 24);
const first = (name) => String(name || '').split(' ')[0];

/** The visitor's details, cleaned: known fields, strings, bounded. */
export function normaliseBooking(body) {
  const lead = {};
  for (const k of FIELDS) lead[k] = str(body?.[k]);
  lead.email = lead.email.toLowerCase();
  lead.notes = String(body?.notes ?? '').trim().slice(0, 1500);
  lead.picked = (Array.isArray(body?.picked) ? body.picked : []).map((p) => str(p, 200)).filter(Boolean).slice(0, 12);
  const start = Date.parse(str(body?.start, 40));
  return { lead, start };
}

export function eventBody(lead, page, host, start, props) {
  const name = [lead.firstName, lead.lastName].filter(Boolean).join(' ');
  const org = lead.organization || page.organizer_name;
  const told = [
    lead.organization && `Organization: ${lead.organization}`,
    lead.phone && `Phone: ${lead.phone}`,
    ...lead.picked,
    lead.notes && `Notes: ${lead.notes}`,
  ].filter(Boolean);
  const description = [
    `Thanks for booking a call with ${first(host.name)}. It’s ${CALL_MINUTES} minutes on Google Meet (the link is in this invite). We’ll go over how the wellness lounge would work at ${page.conference_name} and answer your questions.`,
    ...(told.length ? ['', 'What you sent us', ...told] : []),
    '',
    `Need a different time? Reply to this invite or email ${host.email}.`,
    '',
    `Your page: ${PAGE_BASE}/${page.slug}`,
  ].join('\n');
  return {
    summary: `Shortcut x ${org}`,
    description,
    start: { dateTime: new Date(start).toISOString(), timeZone: CALL_TZ },
    end: { dateTime: new Date(start + CALL_MINUTES * 60_000).toISOString(), timeZone: CALL_TZ },
    attendees: [{ email: lead.email, displayName: name || undefined }],
    conferenceData: { createRequest: { requestId: randomUUID(), conferenceSolutionKey: { type: 'hangoutsMeet' } } },
    reminders: { useDefault: true },
    extendedProperties: { private: { source: 'sponsor-page', sponsorPage: page.slug, ...props } },
  };
}

const slackEscape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function bookingSlackText(lead, page, host, { start, meet }) {
  const e = slackEscape;
  const name = [lead.firstName, lead.lastName].filter(Boolean).join(' ') || '(no name)';
  const org = lead.organization || page.organizer_name;
  return [
    `:calendar: Sponsor page call booked with ${host.name}: ${easternLabel(start)}`,
    `${e(name)}${org ? ` at ${e(org)}` : ''} · ${e(lead.email)}${lead.phone ? ` · ${e(lead.phone)}` : ''}`,
    `Page: ${PAGE_BASE}/${page.slug} (${e(page.conference_name)})`,
    ...(lead.picked.length ? [`Picked: ${e(lead.picked.join(' · '))}`] : []),
    ...(lead.notes ? [`Notes: ${e(lead.notes)}`] : []),
    ...(meet ? [`Meet: ${meet}`] : []),
  ].join('\n');
}

async function postSlack(text) {
  const url = process.env.SLACK_WEBHOOK_URL_PROPOSALS;
  if (!url) return;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error(`slack ${res.status}`);
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'method' });
  if (!calendarConfigured()) return json(503, { error: 'not configured' });
  const raw = event.body || '';
  if (Buffer.byteLength(raw) > MAX_BYTES) return json(413, { error: 'too large' });
  let body;
  try { body = JSON.parse(raw); } catch { return json(400, { error: 'bad json' }); }

  const { lead, start } = normaliseBooking(body);
  if (!lead.firstName || !EMAIL_RE.test(lead.email)) return json(400, { error: 'name and email' });

  const found = await pageAndHost(body.slug, body.password);
  if (found.error) return json(found.status, { error: found.error });
  const { page, host } = found;

  const now = Date.now();
  const fresh = async () => (await openSlots(host, now)).slots.map(slotJson);
  const slot = candidateSlots(now).find((c) => c.start === start);
  if (!slot) return json(409, { error: 'taken', slots: await fresh() });

  const ip = (event.headers || {})['x-nf-client-connection-ip'] || '';
  const booker = hash(`${page.slug}|${lead.email}`);
  const ipDay = hash(`${ip || 'none'}|${new Date(now).toISOString().slice(0, 10)}`);
  let prior, fromIp;
  try {
    [prior, fromIp] = await Promise.all([
      eventsWithProperty(host.email, 'sponsorCallBooker', booker, now),
      eventsWithProperty(host.email, 'sponsorCallIp', ipDay, now),
    ]);
  } catch (err) {
    console.error('sponsor call limits', err?.message);
    return json(502, { error: 'calendar' });
  }
  if (prior.length) return json(409, { error: 'already', start: prior[0].start?.dateTime || '' });
  if (fromIp.length >= PER_IP_PER_DAY) return json(429, { error: 'limit' });

  const { timeMin, timeMax } = querySpan([slot]);
  const busy = await hostBusy(host, timeMin, timeMax);
  if (!busy) return json(502, { error: 'calendar' });
  if (!isFree(busy, slot.start, slot.end)) return json(409, { error: 'taken', slots: await fresh() });

  let created;
  try {
    created = await insertEvent(host.email, eventBody(lead, page, host, slot.start, { sponsorCallBooker: booker, sponsorCallIp: ipDay }));
  } catch (err) {
    console.error('sponsor call book', err?.message);
    return json(502, { error: 'calendar' });
  }
  const meet = created.hangoutLink || created.conferenceData?.entryPoints?.find((p) => p.entryPointType === 'video')?.uri || '';

  /* The event exists now; a Slack failure is logged, never returned. */
  try {
    await postSlack(bookingSlackText(lead, page, host, { start: slot.start, meet }));
  } catch (err) {
    console.error('sponsor call slack', err?.message);
  }

  return json(200, {
    ok: true,
    start: new Date(slot.start).toISOString(),
    end: new Date(slot.end).toISOString(),
    host: host.name,
    meet,
  });
};
