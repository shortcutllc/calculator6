/**
 * create-event-booking-defaults.test.mjs: what the create-event function sends
 * to the coordinator's Parse `addEvent` for the two booking limits.
 *   node scripts/lib/create-event-booking-defaults.test.mjs
 *
 * Proposal-made events used to arrive with allowMultipleReservations off, so on
 * a series (massage + mindfulness) an attendee could book only ONE event across
 * the whole series. Both limits now default ON, like the coordinator's Add
 * Event form: several events per person, one slot per event.
 *
 * Runs the real handler with fetch stubbed. Nothing leaves this machine:
 * Supabase and Parse are fakes that record what they were sent.
 */

const SUPABASE = 'https://supabase.test';
const PARSE = 'https://parse.test/parse';
process.env.VITE_SUPABASE_URL = SUPABASE;
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role';
process.env.PARSE_SERVER_URL = PARSE;
process.env.PARSE_APP_ID = 'test-app';
process.env.PARSE_ADMIN_USERNAME = 'test-admin';
process.env.PARSE_ADMIN_PASSWORD = 'test-password';

const sentToAddEvent = [];
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url;
  const method = (init.method || 'GET').toUpperCase();
  if (url.startsWith(`${SUPABASE}/auth/v1/user`)) {
    return json({ id: 'admin-user', aud: 'authenticated', role: 'authenticated', email: 'admin@test' });
  }
  if (url.startsWith(`${SUPABASE}/rest/v1/proposals`)) {
    if (method === 'GET') return json({ id: 'proposal-1', client_name: 'Acme' });
    return new Response(null, { status: 204 });
  }
  if (url === `${PARSE}/login`) return json({ sessionToken: 'r:test' });
  if (url === `${PARSE}/functions/addEvent`) {
    sentToAddEvent.push(JSON.parse(init.body));
    return json({ result: `event-${sentToAddEvent.length}` });
  }
  throw new Error(`Unexpected request in test: ${method} ${url}`);
};

const modulePath = process.env.CREATE_EVENT_MODULE || '../../netlify/functions/create-event.js';
const { default: handler } = await import(modulePath);

// The fields CreateEventModal sends, minus the two booking limits.
const baseForm = {
  included: true,
  name: 'Acme',
  eventCode: 'ACME',
  category: 'Office',
  description: 'Wellness day',
  locationName: 'HQ',
  address: { street: '1 Main St', unit: '', city: 'New York', state: 'NY', zip: '10001', country: 'US' },
  contactName: 'Pat',
  contactEmail: 'pat@acme.test',
  contactPhone: '555-0100',
  startTime: '09:00',
  endTime: '13:00',
  eventDate: '2026-11-17',
  lengthPerService: 20,
  signupsPerTimeslot: 1,
  services: [{ coordinatorServiceId: 'm_03', coordinatorServiceTitle: 'Chair Massage' }],
  numPros: 2,
  hourlyRate: 50,
  payment: 1000,
  sponsorName: 'Acme',
  isTestEvent: true,
  isSecret: false,
  doesNotRequireTimeslots: false,
  sendAutoEmailsManually: false,
  overrideNameCheck: false,
};

async function createAndCapture(form) {
  const before = sentToAddEvent.length;
  const res = await handler(new Request('https://proposals.test/.netlify/functions/create-event', {
    method: 'POST',
    headers: { Authorization: 'Bearer test-jwt', 'Content-Type': 'application/json' },
    body: JSON.stringify({ proposalId: 'proposal-1', events: [form] }),
  }));
  const body = await res.json();
  if (res.status !== 200 || !body.success) throw new Error(`create-event failed: ${res.status} ${JSON.stringify(body)}`);
  if (sentToAddEvent.length !== before + 1) throw new Error('addEvent was not called exactly once');
  return sentToAddEvent[sentToAddEvent.length - 1];
}

let pass = 0; let fail = 0;
const eq = (got, want, msg) => {
  if (got === want) { pass += 1; } else { fail += 1; console.error(`FAIL: ${msg}: got ${got}, want ${want}`); }
};

// 1. The modal's defaults (both boxes ticked).
let sent = await createAndCapture({ ...baseForm, allowMultipleReservations: true, oneReservationPerEvent: true });
eq(sent.allowMultipleReservations, true, 'ticked: several events per person');
eq(sent.oneReservationPerEvent, true, 'ticked: one slot per event');

// 2. A form without either field (an older bundle, or another caller) gets the defaults.
sent = await createAndCapture({ ...baseForm });
eq(sent.allowMultipleReservations, true, 'missing: allowMultipleReservations defaults on');
eq(sent.oneReservationPerEvent, true, 'missing: oneReservationPerEvent defaults on');

// 3. The admin unticked both boxes: the choice is kept.
sent = await createAndCapture({ ...baseForm, allowMultipleReservations: false, oneReservationPerEvent: false });
eq(sent.allowMultipleReservations, false, 'unticked: allowMultipleReservations stays off');
eq(sent.oneReservationPerEvent, false, 'unticked: oneReservationPerEvent stays off');

// 4. Mixed: one booking across the series on purpose.
sent = await createAndCapture({ ...baseForm, allowMultipleReservations: false, oneReservationPerEvent: true });
eq(sent.allowMultipleReservations, false, 'mixed: allowMultipleReservations off');
eq(sent.oneReservationPerEvent, true, 'mixed: oneReservationPerEvent on');

// The rest of the payload is untouched.
eq(sent.isTestEvent, true, 'isTestEvent passes through');
eq(sent.mobileEventCode, 'ACME', 'mobileEventCode passes through');

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
