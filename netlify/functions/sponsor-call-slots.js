/**
 * POST /.netlify/functions/sponsor-call-slots — open call times on a sponsor
 * page's teammate's calendar (SponsorCallSheet.tsx).
 *
 * Body: { slug, password }. POST, not GET, so the page password never sits in
 * a URL or a log.
 *
 * Every 15-minute start from lib/call-hours.js where the page's teammate
 * (sponsor_pages.contact_email) is free, with the buffer either side. It reads
 * free/busy only: no event titles, nothing written.
 *
 * 200 { tz, minutes, host: { name }, slots: [{ start: ISO, day: 'YYYY-MM-DD' (Eastern) }] }
 * 503 not configured · 502 the calendar can't be read · 404 / 403 / 409 the
 * page is missing, locked or sent from someone off the team. The sheet shows
 * its email line for all of them.
 */
import { CALL_TZ, CALL_MINUTES } from './lib/call-hours.js';
import { calendarConfigured } from './lib/gcal.js';
import { slotJson } from './lib/call-slots.js';
import { json, CORS, pageAndHost, openSlots } from './lib/sponsor-call.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'method' });
  if (!calendarConfigured()) return json(503, { error: 'not configured' });
  let body;
  try { body = JSON.parse((await req.text()) || '{}'); } catch { return json(400, { error: 'bad json' }); }

  const found = await pageAndHost(body.slug, body.password);
  if (found.error) return json(found.status, { error: found.error });
  const { slots, readable } = await openSlots(found.host);
  if (!readable) return json(502, { error: 'calendar unavailable' });
  return json(200, { tz: CALL_TZ, minutes: CALL_MINUTES, host: { name: found.host.name }, slots: slots.map(slotJson) });
};
