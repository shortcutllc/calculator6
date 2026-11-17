/**
 * Sign-up links and staffing for the AI tools (Pro in Slack, and every teammate's AI
 * through mcp.js), Nov 2026:
 *
 *   create_signup_link   a coordinator event (the employee booking link) from a
 *                        proposal or from scratch, with Pro TBD seats so it takes
 *                        bookings at once. Shows a preview; creates only on confirm.
 *   find_signup_links    the events (and their links) for a client, code or proposal
 *   get_event_staffing   who is on an event, which seats are Pro TBD or empty
 *   find_pros            Pros for an event, ranked the way the Staffing tab ranks them:
 *                        worked for this client, then at this address, then Pedro's
 *                        groups by tier, then most recent work, then distance
 *   list_pro_groups      Pedro's groups (city + service, Pros in tiers)
 *   add_pro_to_event     put a Pro on an event: into a Pro TBD seat (their bookings move
 *                        to the Pro) or an empty one. Texts the Pro. Preview first.
 *
 * Everything coordinator-side is the backend's own functions, called as the admin
 * account (lib/parse-admin.js) - the same ones the coordinator's pages and the
 * Staffing tab call. Errors are plain sentences, returned as { error }.
 */
import { callParse, parseBackendLabel, queryParse } from './parse-admin.js';
import {
  addCoordinatorEvent,
  codeUsage,
  describeWhen,
  eventCard,
  eventLinks,
  fillProTbdSeats,
  findSameEvent,
  freeCode,
  isPlaceholder,
  PRO_TBD_IDS,
  readEvent,
  recordOnProposal,
  recordSignUpLink,
  resolveTimezone,
  seatSummary,
  transformToCoordinatorPayload,
} from './coordinator-events.js';
import {
  COORDINATOR_SERVICES,
  buildInitialEvents,
  defaultDescription,
  generateEventCode,
  nounForCoordinatorService,
  parseAddressString,
  resolveCoordinatorService,
} from './coordinator-event-form.js';
import { eventInstants } from './event-time.js';
import { eventDay, looksLikeTest, nameTokens } from './ops-staffing.js';
import { agreementsByEmail, seatsWithPaperwork, withPaperwork } from './pro-paperwork.js';

const DAY_MS = 24 * 3600 * 1000;
// Netlify ends a function at 10 seconds: stop starting slow steps after this long.
const TIME_BUDGET_MS = 5500;

/** Parse's message without the stack trace a dev server appends. */
export const plainMessage = (m) => String((m && m.message) || m || '').split(/\s*Stack trace:/)[0].trim();
const userError = (message, extra = {}) => ({ error: plainMessage(message), ...extra });

// ---- Small readers ---------------------------------------------------------------------

/** "13:30", "1:30 pm", "1pm", "9" → "HH:MM", or null. */
export function parseClock(value) {
  const m = /^\s*(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\s*$/i.exec(String(value ?? ''));
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] || 0);
  const ampm = (m[3] || '').toLowerCase().replace(/\./g, '');
  if (min > 59) return null;
  if (ampm) {
    if (h < 1 || h > 12) return null;
    if (ampm === 'pm' && h !== 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
  } else if (h > 23) {
    return null;
  }
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** "2026-12-10" or "December 10, 2026" → "2026-12-10", or null. */
export function parseDay(value) {
  const s = String(value ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const t = Date.parse(s);
  if (!Number.isFinite(t)) return null;
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const clean = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const has = (params, key) => params[key] !== undefined && params[key] !== null && params[key] !== '';
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isoDate = (t) => ({ __type: 'Date', iso: new Date(t).toISOString() });
const fmtDay = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : null;

/** The proposal row and its latest post-approval survey. */
async function loadProposal(supabase, proposalId) {
  const { data: proposal, error } = await supabase
    .from('proposals')
    .select('id, client_name, client_email, status, data, coordinator_events, is_test')
    .eq('id', proposalId)
    .maybeSingle();
  if (error) throw new Error(`Could not read the proposal: ${error.message}`);
  if (!proposal) return { proposal: null, survey: null };
  const { data: surveys } = await supabase
    .from('proposal_survey_responses')
    .select('*')
    .eq('proposal_id', proposalId)
    .order('submitted_at', { ascending: false })
    .limit(1);
  return { proposal, survey: (surveys && surveys[0]) || null };
}

const blankForm = () => ({
  included: true,
  name: '',
  eventCode: '',
  category: 'Office',
  description: '',
  locationName: '',
  locationDescription: '',
  signupTitle: '',
  signupHeadline: '',
  seriesIntro: '',
  attendeeInstructions: '',
  confirmationSubject: '',
  address: { street: '', unit: '', city: '', state: '', zip: '', country: 'US' },
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  startTime: '',
  endTime: '',
  eventDate: '',
  lengthPerService: 20,
  groupClass: false,
  signupsPerTimeslot: 1,
  enableGuests: false,
  maxGuests: 0,
  optionalContact: false,
  services: [],
  numPros: 0,
  // The proposals app's own default Pro rate (pricing-engine.js proHourly).
  hourlyRate: 50,
  payment: 0,
  taxRate: '',
  legacyName: '',
  eventLinkURL: '',
  sponsorName: '',
  overrideNameCheck: false,
  isTestEvent: false,
  isSecret: false,
  doesNotRequireTimeslots: false,
  sendAutoEmailsManually: false,
  allowMultipleReservations: true,
  oneReservationPerEvent: true,
  managerPassword: '',
  staffNotes: '',
  adminNotes: '',
  clientLogoUrl: '',
});

const SERVICE_NAMES = COORDINATOR_SERVICES.map((s) => `${s.title} (${s.id})`).join(', ');

/**
 * The event form for this call: from the proposal (one of its location + date pairs)
 * when there is one, else blank; then whatever the caller set. Returns { form, issues,
 * warnings, choose? } - choose lists the proposal's events when it has several and the
 * caller didn't say which.
 */
async function planForm(params, supabase) {
  const issues = [];
  const warnings = [];
  let form = blankForm();
  let proposal = null;
  let alreadyMade = [];

  if (has(params, 'proposalId')) {
    const loaded = await loadProposal(supabase, String(params.proposalId));
    proposal = loaded.proposal;
    if (!proposal) return { error: 'No proposal has that id. Use search_proposals to find it.' };
    const forms = buildInitialEvents(
      {
        data: proposal.data || {},
        clientName: proposal.client_name,
        clientEmail: proposal.client_email,
        clientLogoUrl: proposal.data?.clientLogoUrl,
      },
      loaded.survey
    );
    if (!forms.length) return { error: 'This proposal has no services the client kept, so there is no event to make.' };
    const made = (Array.isArray(proposal.coordinator_events) ? proposal.coordinator_events : []).filter(
      (e) => e && e.status === 'created' && e.coordinatorEventId
    );
    const wantLocation = clean(params.location).toLowerCase();
    const wantDate = has(params, 'date') ? parseDay(params.date) : null;
    let matches = forms;
    if (wantLocation) matches = matches.filter((f) => f.locationName.toLowerCase().includes(wantLocation));
    // A date can be the proposal's, or a new one for an event that moved: only filter
    // by it when it picks out one of the proposal's.
    if (wantDate && matches.some((f) => f.eventDate === wantDate)) matches = matches.filter((f) => f.eventDate === wantDate);
    if (matches.length !== 1) {
      return {
        choose: forms.map((f) => ({
          location: f.locationName,
          date: f.eventDate,
          services: f.services.map((s) => s.coordinatorServiceTitle || s.proposalServiceType),
          pros: f.numPros,
          alreadyMade: made
            .filter((e) => e.location === f.locationName && e.date === f.eventDate)
            .map((e) => e.signupUrl || e.coordinatorEventId),
        })),
        proposal,
      };
    }
    form = { ...matches[0] };
    alreadyMade = made.filter((e) => e.location === form.locationName && e.date === form.eventDate);
    if (form.addressNote) warnings.push(form.addressNote);
    if (!form.fromSurvey?.address && proposal.status === 'approved') {
      warnings.push('The client has not filled in the post-approval survey, so the address and contact are from the proposal.');
    }
    if (!has(params, 'startTime') && !form.surveyStartTime) {
      warnings.push(`The start time is the ${form.startTime === '09:00' ? '9 AM default' : 'default'}: neither the proposal nor the survey says when it starts. Confirm the real time with the user.`);
    }
    if (proposal.status !== 'approved') warnings.push(`This proposal is ${proposal.status || 'not approved'} yet.`);
  }

  // --- What the caller set ---
  if (has(params, 'clientName')) form.name = clean(params.clientName, 120);
  if (has(params, 'sponsorName')) form.sponsorName = clean(params.sponsorName, 120);
  if (!form.sponsorName) form.sponsorName = form.name;
  if (has(params, 'date')) {
    const day = parseDay(params.date);
    if (!day) issues.push('The date must be a calendar date like 2026-12-10.');
    else form.eventDate = day;
  }
  for (const key of ['startTime', 'endTime']) {
    if (has(params, key)) {
      const clock = parseClock(params[key]);
      if (!clock) issues.push(`${key === 'startTime' ? 'Start' : 'End'} time must be a time like 12:00 or 1:30 PM.`);
      else form[key] = clock;
    }
  }
  if (has(params, 'address')) {
    const parsed = parseAddressString(clean(params.address, 300));
    form.address = {
      street: parsed.street || '',
      unit: form.address?.unit || '',
      city: parsed.city || '',
      state: parsed.state || '',
      zip: parsed.zip || '',
      country: 'US',
    };
    delete form.addressNote;
  }
  if (has(params, 'unit')) form.address.unit = clean(params.unit, 60);
  if (has(params, 'room')) form.locationDescription = clean(params.room, 80);
  if (has(params, 'services')) {
    const wanted = Array.isArray(params.services) ? params.services : [params.services];
    const resolved = [];
    for (const raw of wanted) {
      const svc = resolveCoordinatorService(String(raw));
      if (!svc) issues.push(`"${raw}" is not a coordinator service. Use one of: ${SERVICE_NAMES}.`);
      else if (!resolved.some((r) => r.coordinatorServiceId === svc.id)) {
        resolved.push({
          proposalServiceType: String(raw),
          coordinatorServiceId: svc.id,
          coordinatorServiceTitle: svc.title,
          coordinatorServiceType: svc.type,
          price: 0,
        });
      }
    }
    if (resolved.length) {
      form.services = resolved;
      if (!has(params, 'description')) {
        form.description = defaultDescription(resolved.map((r) => nounForCoordinatorService(COORDINATOR_SERVICES.find((s) => s.id === r.coordinatorServiceId))));
      }
    }
  }
  if (has(params, 'numPros')) form.numPros = Math.round(Number(params.numPros));
  if (has(params, 'appointmentMinutes')) form.lengthPerService = Math.round(Number(params.appointmentMinutes));
  if (has(params, 'proHourlyRate')) form.hourlyRate = Math.round(Number(params.proHourlyRate));
  if (has(params, 'clientPrice')) form.payment = Math.round(Number(params.clientPrice) || 0);
  if (has(params, 'contactName')) form.contactName = clean(params.contactName, 80);
  if (has(params, 'contactEmail')) form.contactEmail = clean(params.contactEmail, 120);
  if (has(params, 'contactPhone')) form.contactPhone = clean(params.contactPhone, 40);
  for (const key of ['description', 'signupTitle', 'signupHeadline', 'seriesIntro', 'attendeeInstructions', 'confirmationSubject', 'staffNotes', 'adminNotes', 'managerPassword']) {
    if (has(params, key)) form[key] = clean(params[key], 2000);
  }
  if (has(params, 'logoUrl')) form.clientLogoUrl = clean(params.logoUrl, 500);
  if (has(params, 'groupClass')) form.groupClass = params.groupClass === true;
  if (has(params, 'spotsPerTime')) {
    form.groupClass = true;
    form.signupsPerTimeslot = Math.round(Number(params.spotsPerTime));
  }
  if (has(params, 'maxGuests')) {
    form.maxGuests = Math.round(Number(params.maxGuests)) || 0;
    form.enableGuests = form.maxGuests > 0;
  }
  if (has(params, 'optionalContact')) form.optionalContact = params.optionalContact === true;
  if (has(params, 'isTestEvent')) form.isTestEvent = params.isTestEvent === true;
  if (has(params, 'isSecret')) form.isSecret = params.isSecret === true;
  if (has(params, 'eventCode')) form.eventCode = clean(params.eventCode, 30).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!form.eventCode && form.name) form.eventCode = generateEventCode(form.name, form.address.city || form.locationName);
  if (!form.locationName) form.locationName = form.address.city || '';
  if (!form.contactName) form.contactName = form.name;

  // --- What must be right before anything is made ---
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
  if (!form.name) issues.push('Give the client name (clientName): it is the event name attendees see.');
  if (!form.eventDate) issues.push('Give the date (date, like 2026-12-10).');
  else if (form.eventDate < today) issues.push(`${form.eventDate} has already passed.`);
  if (!form.startTime || !form.endTime) issues.push('Give the start and end times (startTime, endTime).');
  else if (form.endTime <= form.startTime) issues.push(`The end time (${form.endTime}) is not after the start time (${form.startTime}). Use 24-hour times or say AM/PM.`);
  const a = form.address;
  if (!a.street || !a.city || !/^[A-Za-z]{2}$/.test(a.state || '') || !/^\d{5}(-\d{4})?$/.test(a.zip || '')) {
    issues.push('Give the full office address with street, city, state and zip, like "350 5th Ave, New York, NY 10118". The timezone comes from it, so a partial address can put the event at the wrong time.');
  }
  if (!form.services.length && !issues.some((i) => i.includes('is not a coordinator service'))) {
    issues.push(`Say which services (services). Coordinator services: ${SERVICE_NAMES}.`);
  }
  if (!(form.numPros >= 1 && form.numPros <= 50)) issues.push('Say how many Pros (numPros, 1 to 50).');
  if (!(form.lengthPerService >= 5 && form.lengthPerService <= 480)) issues.push('Appointment length (appointmentMinutes) must be 5 to 480 minutes.');
  if (!(form.hourlyRate >= 30 && form.hourlyRate <= 200)) issues.push('Pro pay (proHourlyRate) must be $30 to $200 an hour, the coordinator\'s own limit.');
  if (form.groupClass && !(form.signupsPerTimeslot >= 2 && form.signupsPerTimeslot <= 500)) issues.push('A group class needs 2 to 500 spots per time (spotsPerTime).');
  if (!form.contactEmail || !/@/.test(form.contactEmail)) issues.push('Give the on-site contact\'s email (contactEmail).');
  if (!/^[A-Z0-9]{3,30}$/.test(form.eventCode || '')) issues.push('The event code (eventCode) must be 3 to 30 letters and digits.');
  if (!form.contactPhone) warnings.push('No on-site contact phone. Pros use it to find the room on the day.');
  if (!form.locationDescription && (form.locationName || a.city)) {
    warnings.push(`No room given (room). Attendees will see "${form.locationName || a.city}" as the location.`);
  }
  if (!proposal && !has(params, 'proHourlyRate')) warnings.push(`Pro pay is the default $${form.hourlyRate} an hour.`);
  if (form.isTestEvent) warnings.push('This is a TEST event: Pros get no texts, and it stays out of reports.');
  if (form.numPros > PRO_TBD_IDS.length && params.addProTbdSeats !== false) {
    warnings.push(`Only ${PRO_TBD_IDS.length} Pro TBD placeholders exist, so ${form.numPros - PRO_TBD_IDS.length} seat(s) take bookings only once real Pros are added.`);
  }

  return { form, issues, warnings, proposal, alreadyMade };
}

function formSummary(form, tz, startIso, endIso) {
  const a = form.address;
  const minutes = (Date.parse(endIso) - Date.parse(startIso)) / 60000;
  const perPro = Math.floor(minutes / form.lengthPerService);
  const spots = form.groupClass ? form.signupsPerTimeslot : 1;
  return {
    name: form.name,
    code: form.eventCode,
    when: describeWhen(startIso, endIso, tz.timezoneOffset, tz.timezoneAbbreviation),
    timezone: `${tz.timezoneAbbreviation}${tz.source === 'state' ? ' (from the state: the address lookup failed)' : ''}`,
    address: [a.street, a.unit, a.city, `${a.state} ${a.zip}`.trim()].filter(Boolean).join(', '),
    room: form.locationDescription || null,
    services: form.services.map((s) => s.coordinatorServiceTitle),
    prosNeeded: form.numPros,
    appointmentMinutes: form.lengthPerService,
    bookableTimes: perPro * form.numPros * spots,
    groupClass: form.groupClass ? `${form.signupsPerTimeslot} people per time` : null,
    guests: form.enableGuests ? `up to ${form.maxGuests} per booking` : null,
    proPayPerHour: form.hourlyRate,
    clientPrice: form.payment || null,
    sponsor: form.sponsorName,
    contact: [form.contactName, form.contactEmail, form.contactPhone].filter(Boolean).join(', '),
    description: form.description || `Event for ${form.name}`,
    signupTitle: form.signupTitle || null,
    attendeeInstructions: form.attendeeInstructions || null,
    staffNotes: form.staffNotes || null,
    adminNotes: form.adminNotes || null,
    testEvent: form.isTestEvent,
    hiddenFromSeriesPage: form.isSecret,
    logo: form.clientLogoUrl || null,
  };
}

/** Live events on this calendar day (in their own city) whose name matches the client. */
async function clientEventsOnDay(client, day, includeTests) {
  const midnight = Date.parse(`${day}T00:00:00Z`);
  // Offsets run from UTC-10 to UTC+0 here: a 14-hour margin each side covers them.
  const rows = await queryParse('Event', {
    where: {
      startTime: { $gte: isoDate(midnight - 14 * 3600000), $lt: isoDate(midnight + 38 * 3600000) },
      cancelled: { $ne: true },
    },
    keys: ['name', 'mobileEventCode', 'startTime', 'endTime', 'timezoneOffset', 'timezoneAbbreviation', 'isTestEvent'],
    limit: 1000,
  });
  // Every distinctive word of the client's name, not just one ("Signup Tool Test" is not
  // "TEST"); a real event ignores test events (the demo day is all test events).
  const tokens = nameTokens(client);
  const squash = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  return rows.filter(
    (e) =>
      eventDay(e) === day &&
      (includeTests || !e.isTestEvent) &&
      tokens.length > 0 &&
      tokens.every((t) => squash(e.name).includes(t))
  );
}

// ---- create_signup_link --------------------------------------------------------------

export async function createSignupLink(params, supabase, userId, ctx = {}) {
  const startedAt = ctx.startedAt || Date.now();
  const plan = await planForm(params, supabase);
  if (plan.error) return userError(plan.error);
  if (plan.choose) {
    return {
      needsChoice: true,
      message: `${plan.proposal.client_name || 'This proposal'} has ${plan.choose.length} events (one per location and date). Ask which one, then call create_signup_link again with its location and date. Each event gets its own sign-up link; one call makes one.`,
      events: plan.choose,
    };
  }
  const { form, issues, warnings, proposal, alreadyMade } = plan;

  let tz = null;
  let instants = null;
  if (!issues.length) {
    tz = await resolveTimezone(form);
    const { start, end } = eventInstants(form.eventDate, form.startTime, form.endTime, tz.timezoneOffset);
    instants = { start: start.toISOString(), end: end.toISOString() };
  }

  // The same event already made (a retry, or a call cut off by the time limit).
  const same = instants ? await findSameEvent(form.eventCode, instants.start) : null;

  if (!same && !issues.length) {
    const usage = await codeUsage(form.eventCode, form.name);
    if (usage.clash) {
      const suggestion = await freeCode(form.eventCode.replace(/\d+$/, '') || form.eventCode);
      issues.push(`The code ${form.eventCode} belonged to a past event named "${usage.clash.name}", and events that share a code must share a name. Use another code, for example eventCode: "${suggestion}".`);
    } else if (usage.upcoming) {
      warnings.push(`The code ${form.eventCode} already has ${usage.upcoming} upcoming event(s), so this joins that series: its page lists them together.`);
    }
    if (alreadyMade.length && params.createAnother !== true) {
      issues.push(`A sign-up link was already made from this proposal for ${form.locationName} on ${form.eventDate}: ${alreadyMade.map((e) => e.signupUrl || e.coordinatorEventId).join(', ')}. Use find_signup_links to see it. Pass createAnother: true only if the user wants a second event.`);
    } else if (params.createAnother !== true) {
      // Most events are made by hand in the coordinator, so the proposal never hears of
      // them: look for one for this client on this day (the Staffing tab's name rule).
      const sameDay = await clientEventsOnDay(form.name, form.eventDate, form.isTestEvent);
      if (sameDay.length) {
        issues.push(`The coordinator already has ${sameDay.length === 1 ? 'an event' : `${sameDay.length} events`} for this client that day: ${sameDay.slice(0, 3).map((e) => `"${e.name}" ${describeWhen(e.startTime?.iso, e.endTime?.iso, e.timezoneOffset, e.timezoneAbbreviation)} ${eventLinks(e.objectId, e.mobileEventCode).signupUrl}`).join('; ')}. Check with the user that this is a different event; pass createAnother: true only if it is.`);
      }
    }
  }

  const proTbdSeats = params.addProTbdSeats === false ? 0 : Math.min(form.numPros || 0, PRO_TBD_IDS.length);

  if (params.confirm !== true) {
    return {
      preview: true,
      ready: !issues.length,
      event: tz ? formSummary(form, tz, instants.start, instants.end) : null,
      proTbdSeats,
      issues,
      warnings,
      existingEvent: same ? eventCard(same) : null,
      next: issues.length
        ? 'Not ready: tell the user what is missing (issues) and ask for it.'
        : same
          ? 'This event already exists (existingEvent). Call again with confirm: true to finish its Pro TBD seats, or just share its links.'
          : 'Show the user this event (date, time, address, services, Pros) and the warnings. Only when they say yes, call create_signup_link again with the same arguments plus confirm: true.',
    };
  }

  if (issues.length) return userError(`Not created. ${issues.join(' ')}`, { issues, warnings });

  let eventId = same ? same.objectId : null;
  const created = !same;
  if (!eventId) {
    const who = ctx.callerEmail || null;
    const note = `Created by ${who || 'a teammate'} with the AI sign-up link tool${proposal ? ` from proposal ${proposal.id}` : ''}.`;
    const payload = transformToCoordinatorPayload(
      { ...form, adminNotes: [form.adminNotes, note].filter(Boolean).join('\n') },
      tz
    );
    try {
      eventId = await addCoordinatorEvent(payload);
    } catch (err) {
      return userError(`The coordinator did not create the event: ${err.message || err}`);
    }
  }

  const links = eventLinks(eventId, form.eventCode);
  if (created) {
    const entry = {
      date: form.eventDate,
      location: form.locationName,
      eventName: form.name,
      status: 'created',
      coordinatorEventId: eventId,
      signupUrl: links.signupUrl,
      error: null,
      createdAt: new Date().toISOString(),
      createdVia: 'ai',
    };
    await Promise.all([
      proposal ? recordOnProposal(supabase, proposal.id, [entry]) : null,
      recordSignUpLink(supabase, {
        userId,
        proposalId: proposal?.id,
        clientName: proposal?.client_name || form.name,
        eventDate: form.eventDate,
        location: form.locationName,
        eventName: form.name,
        services: form.services.map((s) => s.coordinatorServiceTitle),
        eventId,
        signupUrl: links.signupUrl,
      }),
    ]);
  }

  let seats = null;
  if (proTbdSeats > 0) {
    try {
      seats = await fillProTbdSeats(eventId, { deadline: startedAt + TIME_BUDGET_MS });
    } catch (err) {
      seats = { added: 0, error: err.message || String(err), stoppedForTime: false, emptySeats: null };
    }
  }

  const event = eventCard(await readEvent(eventId));
  const pending = seats && seats.stoppedForTime;
  return {
    success: true,
    created,
    event,
    url: links.signupUrl,
    seriesUrl: links.seriesUrl,
    proTbdSeatsAdded: seats ? seats.added : 0,
    warnings: [
      ...warnings,
      ...(seats && seats.error && !warnings.some((w) => w.includes('Pro TBD placeholders exist')) ? [plainMessage(seats.error)] : []),
    ],
    next: pending
      ? `The event exists and some Pro TBD seats are still to add (the call ran out of time). Call create_signup_link again with the same arguments and confirm: true to finish; it will not make a second event.`
      : `Share url (this event's booking page) or seriesUrl (every event with code ${form.eventCode}). Pro TBD seats hold the times until real Pros are found: use find_pros with eventId ${eventId}, then add_pro_to_event.`,
  };
}

// ---- find_signup_links ---------------------------------------------------------------

export async function findSignupLinks(params, supabase) {
  const limit = Math.min(Math.max(Number(params.limit) || 10, 1), 50);
  const includePast = params.includePast === true;
  const where = {};
  let proposalEntries = [];

  if (has(params, 'eventId')) {
    where.objectId = String(params.eventId);
  } else if (has(params, 'eventCode')) {
    where.mobileEventCode = clean(params.eventCode, 30).toUpperCase();
  } else if (has(params, 'proposalId')) {
    const { data: proposal } = await supabase
      .from('proposals')
      .select('id, client_name, coordinator_events')
      .eq('id', String(params.proposalId))
      .maybeSingle();
    if (!proposal) return userError('No proposal has that id.');
    proposalEntries = Array.isArray(proposal.coordinator_events) ? proposal.coordinator_events : [];
    const ids = proposalEntries.map((e) => e && e.coordinatorEventId).filter(Boolean);
    if (!ids.length) {
      return {
        events: [],
        message: `No sign-up link has been made from this proposal yet. create_signup_link with proposalId makes one.`,
        failedAttempts: proposalEntries.filter((e) => e && e.status === 'error'),
      };
    }
    where.objectId = { $in: ids };
  } else if (has(params, 'clientName')) {
    const name = clean(params.clientName, 80);
    if (name.length < 2) return userError('Give at least two letters of the client name.');
    where.name = { $regex: escapeRegex(name), $options: 'i' };
  } else {
    return userError('Say which client (clientName), event code (eventCode), proposal (proposalId) or event (eventId).');
  }
  where.cancelled = { $ne: true };
  if (!includePast && !where.objectId) where.endTime = { $gte: isoDate(Date.now() - DAY_MS) };

  const rows = await queryParse('Event', {
    where,
    keys: [
      'name', 'mobileEventCode', 'startTime', 'endTime', 'timezoneOffset', 'timezoneAbbreviation', 'address',
      'locationDescription', 'serviceOfferings', 'numBarbersRequired', 'barberList', 'numTotalTimeslots',
      'numOpenTimeslots', 'isTestEvent', 'cancelled', 'isSecret',
    ],
    limit: 200,
    order: includePast ? '-startTime' : 'startTime',
  });
  const events = rows.slice(0, limit).map(eventCard);
  const codes = Array.from(new Set(events.map((e) => e.code).filter(Boolean)));
  return {
    events,
    seriesLinks: codes.map((code) => ({ code, url: eventLinks('x', code).seriesUrl })),
    more: rows.length > limit ? rows.length - limit : 0,
    message: events.length
      ? undefined
      : includePast
        ? 'No events found.'
        : 'No upcoming events found. Pass includePast: true to look at past ones.',
  };
}

// ---- get_event_staffing --------------------------------------------------------------

async function eventIDsFrom(params, supabase) {
  if (has(params, 'eventId')) return [String(params.eventId)];
  if (Array.isArray(params.eventIds) && params.eventIds.length) return params.eventIds.map(String).slice(0, 50);
  if (has(params, 'eventCode')) {
    const rows = await queryParse('Event', {
      where: { mobileEventCode: clean(params.eventCode, 30).toUpperCase(), cancelled: { $ne: true }, endTime: { $gte: isoDate(Date.now() - DAY_MS) } },
      keys: ['name'],
      limit: 50,
      order: 'startTime',
    });
    return rows.map((r) => r.objectId);
  }
  if (has(params, 'proposalId')) {
    const { data: proposal } = await supabase
      .from('proposals')
      .select('coordinator_events')
      .eq('id', String(params.proposalId))
      .maybeSingle();
    return ((proposal && proposal.coordinator_events) || []).map((e) => e && e.coordinatorEventId).filter(Boolean);
  }
  return [];
}

export async function getEventStaffing(params, supabase) {
  const ids = await eventIDsFrom(params, supabase);
  if (!ids.length) return userError('Say which event (eventId, eventIds, eventCode or proposalId). find_signup_links finds them by client name.');
  const [res, index] = await Promise.all([
    callParse('pullEventStaffing_Admin', { eventIDs: ids }),
    agreementsByEmail(supabase),
  ]);
  const events = await seatsWithPaperwork(res.events || [], index);
  return {
    events: events.map((e) => ({
      eventId: e.id,
      name: e.name,
      code: e.mobileEventCode,
      when: describeWhen(e.startTime, e.endTime, e.timezoneOffset, e.timezoneAbbreviation),
      address: [e.address?.street, e.address?.city, e.address?.state].filter(Boolean).join(', '),
      cancelled: e.cancelled,
      isTestEvent: e.isTestEvent,
      prosNeeded: e.numBarbersRequired,
      openSeats: e.openSeats,
      proTbdSeats: e.placeholderSeats,
      emptySeats: e.emptySeats,
      seats: e.seats.map((s) => ({
        barberId: s.barberID,
        name: s.fullName,
        proTbd: s.placeholder,
        confirmedInApp: s.placeholder ? null : s.confirmedInApp,
        paperwork: s.placeholder ? undefined : s.agreements,
        orientation: s.placeholder ? undefined : s.orientation,
      })),
      links: { ...eventLinks(e.id, e.mobileEventCode), ...e.links },
    })),
  };
}

// ---- find_pros -----------------------------------------------------------------------

/** Coordinator Pro types (Barber.proType) for whatever services were named. */
function proTypesFor(services) {
  const types = new Set();
  for (const raw of services || []) {
    const svc = resolveCoordinatorService(String(raw));
    if (svc && svc.type) types.add(svc.type);
    else if (['Massage', 'Nails', 'Hair', 'Beauty', 'Photo', 'Mindfulness'].includes(String(raw))) types.add(String(raw));
  }
  return Array.from(types);
}

/** Pro id → the other events they're on that overlap this window (an hour each side). */
async function busyPros(startIso, endIso, excludeEventId) {
  const hour = 3600 * 1000;
  const rows = await queryParse('Event', {
    where: {
      startTime: { $lt: isoDate(Date.parse(endIso) + hour) },
      endTime: { $gt: isoDate(Date.parse(startIso) - hour) },
      cancelled: { $ne: true },
    },
    keys: ['name', 'barberList', 'startTime', 'endTime', 'timezoneOffset', 'timezoneAbbreviation'],
    limit: 1000,
  });
  const map = new Map();
  for (const e of rows) {
    if (e.objectId === excludeEventId) continue;
    for (const b of e.barberList || []) {
      if (!b || !b.id || isPlaceholder(b)) continue;
      const list = map.get(b.id) || [];
      list.push(`${e.name} (${describeWhen(e.startTime?.iso, e.endTime?.iso, e.timezoneOffset, e.timezoneAbbreviation)})`);
      map.set(b.id, list);
    }
  }
  return map;
}

export async function findPros(params, supabase) {
  const limit = Math.min(Math.max(Number(params.limit) || 12, 1), 40);
  let event = null;
  let proTypes = has(params, 'services') ? proTypesFor(Array.isArray(params.services) ? params.services : [params.services]) : [];
  let clientName = clean(params.clientName, 80);
  const roster = { radiusMiles: Number(params.radiusMiles) || undefined, includeInactive: params.includeInactive === true };

  if (has(params, 'eventId')) {
    event = await readEvent(String(params.eventId));
    if (!event) return userError('No event has that id. find_signup_links finds events by client name.');
    const coords = event.address && event.address.coordinates;
    if (coords && Number.isFinite(Number(coords.latitude))) {
      roster.coordinates = { latitude: Number(coords.latitude), longitude: Number(coords.longitude) };
      roster.siteCoordinates = roster.coordinates;
    } else {
      const a = event.address || {};
      roster.addressString = [a.street, a.city, a.state, a.zip].filter(Boolean).join(', ');
      roster.atSite = true;
    }
    if (!proTypes.length) {
      proTypes = Array.from(new Set((event.serviceOfferings || [])
        .map((s) => (COORDINATOR_SERVICES.find((c) => c.id === s.id) || {}).type)
        .filter(Boolean)));
    }
    if (!clientName) clientName = event.name || '';
  } else if (has(params, 'address')) {
    roster.addressString = clean(params.address, 300);
    roster.atSite = true;
  } else if (!has(params, 'name')) {
    return userError('Say where: an event (eventId) or an address, plus the services.');
  }

  const live = parseBackendLabel() !== 'dev';
  const [res, index, groupRows, busy] = await Promise.all([
    callParse('pullStaffingRoster_Admin', {
      ...roster,
      proTypes,
      clientName: clientName || undefined,
      q: has(params, 'name') ? clean(params.name, 60) : undefined,
      // On the dev backend the test Pros are the ones to try things on (as the Staffing tab).
      includeTestPros: !live,
    }),
    agreementsByEmail(supabase),
    queryParse('ProGroup', { where: { archived: { $ne: true } }, keys: ['name', 'city', 'proType'], limit: 1000 }),
    event ? busyPros(event.startTime.iso, event.endTime.iso, event.objectId) : Promise.resolve(new Map()),
  ]);
  const groupByID = new Map(groupRows.map((g) => [g.objectId, g]));
  const onEvent = new Set(((event && event.barberList) || []).map((b) => b.id));

  const relevantGroups = (pro) =>
    (pro.groups || [])
      .map((m) => ({ ...m, proType: (groupByID.get(m.groupID) || {}).proType || null, city: (groupByID.get(m.groupID) || {}).city || '' }))
      .filter((m) => !proTypes.length || !m.proType || proTypes.includes(m.proType))
      .sort((x, y) => x.tier - y.tier);

  const time = (v) => (v ? Date.parse(v) : 0);
  const pros = (res.pros || [])
    .filter((p) => !live || !looksLikeTest(p.fullName))
    .map((p) => withPaperwork(p, index))
    .map((p) => ({ p, groups: relevantGroups(p) }));

  // The Staffing tab's order (worked for this client, then at this address), then
  // Pedro's tiers, then the most recent work, then the nearest.
  pros.sort((x, y) => {
    const a = x.p;
    const b = y.p;
    if (!!a.clientEvents !== !!b.clientEvents) return a.clientEvents ? -1 : 1;
    if (a.clientEvents && b.clientEvents && time(a.lastClientEventDate) !== time(b.lastClientEventDate)) {
      return time(b.lastClientEventDate) - time(a.lastClientEventDate);
    }
    if (!!a.siteEvents !== !!b.siteEvents) return a.siteEvents ? -1 : 1;
    const ta = x.groups.length ? x.groups[0].tier : 99;
    const tb = y.groups.length ? y.groups[0].tier : 99;
    if (ta !== tb) return ta - tb;
    if (time(a.lastEventDate) !== time(b.lastEventDate)) return time(b.lastEventDate) - time(a.lastEventDate);
    return (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity);
  });

  const shown = pros.slice(0, limit).map(({ p, groups }) => {
    const reasons = [];
    if (p.clientEvents) reasons.push(`Worked ${p.clientEvents} event${p.clientEvents === 1 ? '' : 's'} for this client, last ${fmtDay(p.lastClientEventDate)}`);
    if (p.siteEvents) reasons.push(`Worked at this address ${p.siteEvents} time${p.siteEvents === 1 ? '' : 's'}`);
    for (const g of groups.slice(0, 2)) reasons.push(`Tier ${g.tier} in the "${g.name}" group`);
    if (p.lastEventDate) reasons.push(`Last event ${fmtDay(p.lastEventDate)}${p.lastEventName ? ` (${p.lastEventName})` : ''}`);
    else reasons.push('No events in the last year');
    if (p.distanceMiles != null) reasons.push(`${p.distanceMiles} miles away`);
    const cautions = [];
    const busyOn = busy.get(p.id);
    if (onEvent.has(p.id)) cautions.push('Already on this event');
    if (busyOn) cautions.push(`Already booked then: ${busyOn.join('; ')}`);
    if (p.agreements && p.agreements.contractor !== 'signed') cautions.push(`Contractor agreement ${p.agreements.contractor || 'never sent'}`);
    if (p.orientation === 'new') cautions.push('New: has never worked an event, needs orientation');
    if (p.optedOut) cautions.push('Texted STOP to the Pros line, so gets no texts');
    if (!p.hasPhone) cautions.push('No phone number');
    return {
      barberId: p.id,
      name: p.fullName,
      proType: p.proType,
      distanceMiles: p.distanceMiles,
      groups: groups.map((g) => ({ name: g.name, tier: g.tier })),
      eventsLast90: p.eventsLast90,
      eventsLast365: p.eventsLast365,
      upcomingEvents: p.upcomingEvents,
      onThisEvent: onEvent.has(p.id),
      available: !busyOn && !onEvent.has(p.id),
      paperwork: p.agreements,
      orientation: p.orientation,
      why: reasons,
      cautions,
    };
  });

  return {
    event: event ? { eventId: event.objectId, name: event.name, when: describeWhen(event.startTime?.iso, event.endTime?.iso, event.timezoneOffset, event.timezoneAbbreviation), staffing: seatSummary(event) } : null,
    searchedFor: { proTypes, clientName: clientName || null, radiusMiles: res.radiusMiles },
    totalFound: pros.length,
    pros: shown,
    next: event
      ? 'Suggest the top few with their reasons and cautions. To put one on the event, call add_pro_to_event with eventId and their barberId (it previews first).'
      : 'Suggest the top few with their reasons and cautions.',
  };
}

// ---- list_pro_groups -----------------------------------------------------------------

export async function listProGroups(params) {
  const res = await callParse('pullProGroups_Admin', { groupID: has(params, 'groupId') ? String(params.groupId) : undefined });
  const city = clean(params.city, 60).toLowerCase();
  const types = has(params, 'services') ? proTypesFor(Array.isArray(params.services) ? params.services : [params.services]) : [];
  const live = parseBackendLabel() !== 'dev';
  const groups = (res.groups || [])
    .filter((g) => !live || !/^\[test\]/i.test(g.name || ''))
    .filter((g) => !city || `${g.city} ${g.name}`.toLowerCase().includes(city))
    .filter((g) => !types.length || !g.proType || types.includes(g.proType));
  return {
    groups: groups.map((g) => ({
      groupId: g.id,
      name: g.name,
      city: g.city,
      service: g.proType,
      radiusMiles: g.radiusMiles,
      members: (g.members || [])
        .filter((m) => !m.missing && m.pro)
        .map((m) => ({
          barberId: m.barberID,
          name: m.pro.fullName,
          tier: m.tier,
          lastEvent: fmtDay(m.pro.lastEventDate),
          eventsLast90: m.pro.eventsLast90,
          optedOutOfTexts: m.pro.optedOut || undefined,
        })),
    })),
    message: groups.length ? undefined : 'No groups match. Groups are made on the Staffing page (proposals.getshortcut.co/ops).',
  };
}

// ---- add_pro_to_event ----------------------------------------------------------------

export async function addProToEvent(params, supabase) {
  const eventId = clean(params.eventId, 40);
  if (!eventId) return userError('Which event? (eventId)');
  const wantTbd = params.proTbd === true;
  const barberId = clean(params.barberId, 40);
  if (!wantTbd && !barberId) return userError('Which Pro? Pass their barberId from find_pros, or proTbd: true for a placeholder seat.');

  const res = await callParse('pullEventStaffing_Admin', { eventIDs: [eventId] });
  const ev = (res.events || [])[0];
  if (!ev) return userError('No event has that id.');
  if (ev.cancelled) return userError('That event is cancelled.');
  if (Date.parse(ev.endTime) < Date.now()) return userError('That event is over.');
  const when = describeWhen(ev.startTime, ev.endTime, ev.timezoneOffset, ev.timezoneAbbreviation);

  let pro = null;
  let targetID = barberId;
  if (wantTbd) {
    const free = PRO_TBD_IDS.filter((id) => !ev.seats.some((s) => s.barberID === id));
    if (!free.length) return userError('Every Pro TBD placeholder is already on this event.');
    targetID = free[0];
  } else {
    const rows = await queryParse('Barber', {
      where: { objectId: barberId },
      keys: ['fullName', 'email', 'numCompletedEvents', 'proType', 'deleted', 'onboarding_removed', 'isoPhoneNumber', 'isTest'],
      limit: 1,
    });
    pro = rows[0];
    if (!pro || pro.deleted || pro.onboarding_removed) return userError('No active Pro has that barberId. Use find_pros.');
    if (ev.seats.some((s) => s.barberID === barberId)) return userError(`${pro.fullName} is already on this event.`);
  }

  // Into a Pro TBD seat when there is one (its bookings move to the Pro), else an
  // empty seat; or the seat the caller named.
  let action;
  let replace = null;
  if (has(params, 'replaceBarberId')) {
    replace = ev.seats.find((s) => s.barberID === String(params.replaceBarberId));
    if (!replace) return userError('The Pro to replace (replaceBarberId) is not on this event.');
    action = 'swap';
  } else if (!wantTbd && ev.placeholderSeats > 0) {
    replace = ev.seats.find((s) => s.placeholder);
    action = 'swap';
  } else if (ev.emptySeats > 0) {
    action = 'add';
  } else {
    return userError(
      `All ${ev.numBarbersRequired} seats on this event have real Pros. To add another, raise the number of Pros on the event first (${eventLinks(ev.id, ev.mobileEventCode).editUrl}), or pass replaceBarberId to swap someone out.`
    );
  }

  const name = wantTbd ? 'a Pro TBD placeholder' : pro.fullName;
  const warnings = [];
  if (!wantTbd) {
    const busy = await busyPros(ev.startTime, ev.endTime, ev.id);
    if (busy.get(barberId)) warnings.push(`${pro.fullName} is already on: ${busy.get(barberId).join('; ')}. The coordinator may refuse an overlap.`);
    const index = await agreementsByEmail(supabase);
    const withDocs = withPaperwork({ id: barberId, fullName: pro.fullName, email: pro.email, numCompletedEvents: pro.numCompletedEvents || 0 }, index);
    if (withDocs.agreements.contractor !== 'signed') warnings.push(`${pro.fullName}'s contractor agreement is ${withDocs.agreements.contractor || 'not on file'}.`);
    if (withDocs.orientation === 'new') warnings.push(`${pro.fullName} has never worked an event, so needs orientation first.`);
    if (!ev.isTestEvent) warnings.push(`${pro.fullName} gets a text from the Pros line saying they are on ${ev.name}, ${when}, and is asked to confirm in the app.`);
  }
  const doing =
    action === 'swap'
      ? `Put ${name} in ${replace.placeholder ? 'a Pro TBD seat' : `${replace.fullName}'s seat`} on ${ev.name}, ${when}${replace.placeholder ? ': any bookings on that seat move to them' : `: ${replace.fullName} comes off the event and their bookings move to ${name}`}.`
      : `Add ${name} to an empty seat on ${ev.name}, ${when}, which opens their appointment times for booking.`;

  if (params.confirm !== true) {
    return {
      preview: true,
      willDo: doing,
      warnings,
      next: 'Tell the user exactly this (and the warnings). Only when they say yes, call add_pro_to_event again with the same arguments plus confirm: true.',
    };
  }

  try {
    if (action === 'swap') {
      await callParse('swapBarberForEvent', { eventID: ev.id, barberID: replace.barberID, newBarberID: targetID, isLeadBarber: false });
    } else {
      await callParse('addBarberToEvent', { eventID: ev.id, barberID: targetID, isLeadBarber: false });
    }
  } catch (err) {
    return userError(`The coordinator refused: ${err.message || err}`);
  }
  const after = await readEvent(ev.id);
  return { success: true, done: doing, staffing: seatSummary(after), links: eventLinks(ev.id, ev.mobileEventCode) };
}
