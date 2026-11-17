/**
 * A proposal turned into coordinator event forms: one per (location, date), with the
 * services mapped to the coordinator's own, the post-approval survey's answers filled
 * in, and the coordinator Add Event form's defaults.
 *
 * Shared by the staff screen (src/components/CreateEventModal.tsx, where staff review
 * and edit each form before creating) and the AI tools (lib/signup-links.js,
 * create_signup_link), so both make the same event from the same proposal. Moved here
 * from the modal in Nov 2026; the rules are unchanged.
 *
 * No I/O. Types: coordinator-event-form.d.ts.
 */
import { effectiveService, clientIncluded } from './client-picks.js';
import { START_TIMES_KEY, addHours, isClock } from './survey-start-times.js';

// --- Real coordinator services from the Parse EventService table ---
// A hand-kept copy: a new coordinator service has to be added here too. addEvent
// rejects an id it doesn't know ("One or more services not found").

export const COORDINATOR_SERVICES = [
  // Massage
  { id: 'm_01', title: 'Compression Massage', type: 'Massage' },
  { id: 'm_02', title: 'Sports Massage', type: 'Massage' },
  { id: 'm_03', title: 'Chair Massage', type: 'Massage' },
  { id: 'm_04', title: 'Table Massage', type: 'Massage' },
  // Nails
  { id: 'mani_01', title: 'Classic Manicure', type: 'Nails' },
  { id: 'mani_02', title: 'Nail Clean Up', type: 'Nails' },
  { id: 'mani_03', title: 'Gel Manicure', type: 'Nails' },
  { id: 'mani_04', title: 'Gel Removal', type: 'Nails' },
  { id: 'nails_handmassage_01', title: 'Manicure + Hand Massage', type: 'Nails' },
  { id: 'pedi_01', title: 'Dry Pedicure', type: 'Nails' },
  // Hair
  { id: 'e_01', title: 'Haircut', type: 'Hair' },
  { id: 'e_02', title: 'Haircut and Beard Trim', type: 'Hair' },
  { id: 'e_03', title: 'Haircut with Styling', type: 'Hair' },
  { id: 'e_04', title: 'Blowout', type: 'Hair' },
  { id: 'e_05', title: 'Shave', type: 'Hair' },
  { id: 'e_06', title: "Men's Styling", type: 'Hair' },
  { id: 'e_07', title: 'Beard Trim', type: 'Hair' },
  { id: 'e_bb_01', title: 'Quick Clean Up', type: 'Hair' },
  { id: 'e_edc_01', title: 'Spray Color', type: 'Hair' },
  { id: 'e_k_01', title: 'Kids Cut', type: 'Hair' },
  { id: 'e_w_01', title: 'Quick Trim', type: 'Hair' },
  { id: 'e_w_02', title: "Women's Styling", type: 'Hair' },
  { id: 'hair_haircutblowout_01', title: 'Haircut with Blowout', type: 'Hair' },
  { id: 'hair_makeup_01', title: 'Hair + Makeup', type: 'Hair' },
  { id: 'med_nyc_01', title: 'Short Haircut', type: 'Hair' },
  { id: 'med_nyc_02', title: 'Long Haircut', type: 'Hair' },
  // Beauty
  { id: 'beauty_01', title: 'Brow Wax', type: 'Beauty' },
  { id: 'beauty_02', title: 'Brow Tweeze', type: 'Beauty' },
  { id: 'beauty_03', title: 'Brow Tint', type: 'Beauty' },
  { id: 'beauty_04', title: 'Eyelash Tint', type: 'Beauty' },
  { id: 'beauty_05', title: 'Lip Wax', type: 'Beauty' },
  { id: 'beauty_06', title: 'Facial', type: 'Beauty' },
  { id: 'makeup_01', title: 'Makeup', type: 'Beauty' },
  // Photo
  { id: 'headshot_01', title: 'Headshot, Hair + Make-up', type: 'Photo' },
  { id: 'headshot_02', title: 'Headshot + Make-up Only', type: 'Photo' },
  { id: 'headshot_03', title: 'Headshot + Hair Only', type: 'Photo' },
  { id: 'headshot_04', title: 'Headshot Only', type: 'Photo' },
  // Mindfulness
  { id: 'mindfulness_01', title: 'Introduction to Mindfulness', type: 'Mindfulness' },
  { id: 'mindfulness_02', title: 'Mindfulness Drop-in Session', type: 'Mindfulness' },
  { id: 'mindfulness_03', title: '6-Week Mindfulness Program', type: 'Mindfulness' },
  // Courtney's accredited CLE course for law firms (on prod since Nov 13 2026). The
  // coordinator sends its attendees the CLE version of her after-session text and email,
  // so a CLE line must use this, never a generic mindfulness service. Kept last so the
  // "first Mindfulness service" fallback below never lands on it.
  { id: 'mindfulness_cle', title: 'Mindfulness CLE: Ethics & Attorney Well-Being', type: 'Mindfulness' },
];

// --- Service matching: proposal serviceType → coordinator service type ---

// Maps proposal service types to coordinator service types for filtering dropdowns
export const PROPOSAL_TO_COORDINATOR_TYPE = {
  'massage': 'Massage',
  'chair-massage': 'Massage',
  'table-massage': 'Massage',
  'facial': 'Beauty',
  'hair': 'Hair',
  'beard-trim': 'Hair',
  'nails': 'Nails',
  'nails-hand-massage': 'Nails',
  'headshot': 'Photo',
  'mindfulness': 'Mindfulness',
  'mindfulness-cle': 'Mindfulness',
  'mindfulness-soles': 'Mindfulness',
  'mindfulness-movement': 'Mindfulness',
  'mindfulness-pro': 'Mindfulness',
  'mindfulness-pro-reactivity': 'Mindfulness',
  'makeup': 'Beauty',
};

// Default auto-select for each proposal service type (best initial match)
const DEFAULT_SERVICE_MATCH = {
  'massage': 'm_03',           // Chair Massage
  'chair-massage': 'm_03',    // Chair Massage
  'table-massage': 'm_04',    // Table Massage
  'facial': 'beauty_06',      // Facial
  'hair': 'e_01',             // Haircut
  'beard-trim': 'e_07',       // Beard Trim
  'nails': 'mani_01',         // Classic Manicure
  'nails-hand-massage': 'nails_handmassage_01',
  'headshot': 'headshot_04',  // Headshot Only
  'mindfulness': 'mindfulness_01', // Introduction to Mindfulness
  'mindfulness-cle': 'mindfulness_cle', // Mindfulness CLE: Ethics & Attorney Well-Being
  // One themed session each (Soles of the Feet, Movement & Stillness, PRO Practice,
  // Stepping Out of Reactivity): a drop-in, not an introduction.
  'mindfulness-soles': 'mindfulness_02',
  'mindfulness-movement': 'mindfulness_02',
  'mindfulness-pro': 'mindfulness_02',
  'mindfulness-pro-reactivity': 'mindfulness_02',
  'makeup': 'makeup_01',      // Makeup
};

export function findBestServiceMatch(proposalServiceType, massageFormat) {
  const type = String(proposalServiceType || '').toLowerCase();

  // A plain "massage" line is chair or table by the proposal's massageType, else
  // the survey's preference; chair when neither says.
  const defaultId = type === 'massage' && massageFormat === 'table' ? 'm_04' : DEFAULT_SERVICE_MATCH[type];
  if (defaultId) {
    const match = COORDINATOR_SERVICES.find(s => s.id === defaultId);
    if (match) return match;
  }

  // Fall back to type-based filter and pick first
  const coordinatorType = PROPOSAL_TO_COORDINATOR_TYPE[type];
  if (coordinatorType) {
    const match = COORDINATOR_SERVICES.find(s => s.type === coordinatorType);
    if (match) return match;
  }

  // Last resort: title keyword match
  const titleMatch = COORDINATOR_SERVICES.find(s =>
    s.title.toLowerCase().includes(type) || type.includes(s.title.toLowerCase())
  );
  return titleMatch || null;
}

/** Get filtered services for a proposal service type dropdown */
export function getServicesForProposalType(proposalServiceType) {
  const type = String(proposalServiceType || '').toLowerCase();
  const coordinatorType = PROPOSAL_TO_COORDINATOR_TYPE[type];
  if (coordinatorType) {
    return COORDINATOR_SERVICES.filter(s => s.type === coordinatorType);
  }
  // If no mapping, show all
  return COORDINATOR_SERVICES;
}

/**
 * A coordinator service from whatever someone typed: its id ("m_03"), its title
 * ("Chair Massage"), or a proposal service type ("chair-massage", "nails"). Null when
 * nothing fits.
 */
export function resolveCoordinatorService(value, massageFormat) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  const byID = COORDINATOR_SERVICES.find(s => s.id.toLowerCase() === lower);
  if (byID) return byID;
  const byTitle = COORDINATOR_SERVICES.find(s => s.title.toLowerCase() === lower);
  if (byTitle) return byTitle;
  const asType = lower.replace(/\s+/g, '-');
  if (DEFAULT_SERVICE_MATCH[asType] || PROPOSAL_TO_COORDINATOR_TYPE[asType]) {
    return findBestServiceMatch(asType, massageFormat);
  }
  // "massages", "facials", "headshots"
  const singular = asType.replace(/s$/, '');
  if (DEFAULT_SERVICE_MATCH[singular]) return findBestServiceMatch(singular, massageFormat);
  return null;
}

// --- Address parsing ---

export function parseAddressString(addressStr) {
  if (!addressStr) return {};

  let parts = addressStr.split(',').map(p => p.trim()).filter(p => p);

  // Strip trailing country code (US, USA, United States)
  const last = parts[parts.length - 1];
  if (/^(US|USA|United\s+States)$/i.test(last)) {
    parts = parts.slice(0, -1);
  }

  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1].trim();

    // Check if last part is just a zip code: "street, city, state, 10001"
    const isZipOnly = /^\d{5}(-\d{4})?$/.test(lastPart);
    if (isZipOnly && parts.length >= 4) {
      return {
        street: parts.slice(0, parts.length - 3).join(', '),
        city: parts[parts.length - 3],
        state: parts[parts.length - 2].replace(/\d/g, '').trim().substring(0, 2).toUpperCase(),
        zip: lastPart,
      };
    }

    // Check if last part is "state, zip" as separate parts: "street, city, NY, 10001"
    if (isZipOnly && parts.length >= 3) {
      const statePart = parts[parts.length - 2].trim();
      if (/^[A-Za-z]{2}$/.test(statePart)) {
        return {
          street: parts.slice(0, parts.length - 3).join(', '),
          city: parts[parts.length - 3],
          state: statePart.toUpperCase(),
          zip: lastPart,
        };
      }
    }

    // "street, city, NY 10001" or "street, city, New York, NY 10001"
    const stateZipMatch = lastPart.match(/^([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
    if (stateZipMatch) {
      return {
        street: parts.slice(0, parts.length - 2).join(', '),
        city: parts[parts.length - 2],
        state: stateZipMatch[1].toUpperCase(),
        zip: stateZipMatch[2],
      };
    }

    // "street, city, NY" (no zip)
    if (/^[A-Za-z]{2}$/.test(lastPart)) {
      return {
        street: parts.slice(0, parts.length - 2).join(', '),
        city: parts[parts.length - 2],
        state: lastPart.toUpperCase(),
        zip: '',
      };
    }

    // Fallback: try to extract state and zip from last part more aggressively
    const fallbackMatch = lastPart.match(/([A-Za-z]{2})\s*(\d{5}(?:-\d{4})?)?/);
    if (fallbackMatch) {
      return {
        street: parts.slice(0, parts.length - 2).join(', '),
        city: parts[parts.length - 2],
        state: fallbackMatch[1].toUpperCase(),
        zip: fallbackMatch[2] || '',
      };
    }

    // Last resort: 2 parts = street, city
    if (parts.length === 2) {
      return { street: parts[0], city: parts[1] };
    }

    return {
      street: parts.slice(0, parts.length - 2).join(', '),
      city: parts[parts.length - 2],
      state: lastPart.substring(0, 2).toUpperCase(),
      zip: '',
    };
  }
  return { street: addressStr };
}

// --- Date helpers ---

export function parseProposalDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toISOString().split('T')[0];
}

export function generateEventCode(clientName, location) {
  const name = (clientName || 'EVT')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
  const loc = (location || '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
  // Use short versions: up to 6 chars of client name + up to 4 chars of location
  const prefix = name.substring(0, 6);
  const suffix = loc.substring(0, 4);
  return suffix ? `${prefix}${suffix}` : prefix;
}

// --- Post-approval survey → event fields ---
//
// The survey (ProposalSurveyForm → proposal_survey_responses) is the client's
// own word after approval, so it beats what the proposal was drafted with.

/** "(415) 933 - 9437" / "+1 415.933.9437" → "(415) 933-9437"; anything else as typed. */
export function normalizePhone(raw) {
  const text = String(raw || '');
  const digits = text.replace(/\D/g, '');
  const ten = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  return ten.length === 10 ? `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}` : text.trim();
}

const EMAIL_RE = /[^\s@,;:<>()]+@[^\s@,;:<>()]+\.[a-z]{2,}/i;
const PHONE_RE = /(?:\+?1[\s.-]*)?\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}/;

/**
 * The survey's free-text "Point of contact (including phone number)", e.g.
 * "Emma Sharp: (415) 933 - 9437 \nOffice Manager, People Operations".
 * The email comes from the contact itself, else from the billing contact when
 * it names the same person.
 */
export function parsePointOfContact(poc, billing) {
  const text = poc || '';
  const phoneMatch = text.match(PHONE_RE);
  const emailMatch = text.match(EMAIL_RE);
  const firstLine = text.split(/\n/)[0]
    .replace(EMAIL_RE, '')
    .replace(PHONE_RE, '');
  const name = (firstLine.split(/[:,(|]/)[0] || '').replace(/[\s.-]+$/, '').trim();
  const usableName = /[a-z]/i.test(name) && name.length <= 40 ? name : '';
  let email = emailMatch ? emailMatch[0] : '';
  if (!email && usableName && billing) {
    const first = usableName.split(/\s+/)[0].toLowerCase();
    if (billing.toLowerCase().includes(first)) email = (billing.match(EMAIL_RE) || [''])[0];
  }
  return { name: usableName, phone: phoneMatch ? normalizePhone(phoneMatch[0]) : '', email };
}

/** The survey's address for a location: one string, or a JSON map by location. */
export function surveyAddressFor(surveyResponse, location) {
  const raw = surveyResponse?.office_address;
  if (!raw || typeof raw !== 'string') return '';
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed[location] || '';
  } catch { /* a plain address */ }
  return raw;
}

/** Entry and parking for a location; a one-location survey may key it differently. */
export function surveyEntryFor(surveyResponse, location) {
  const map = surveyResponse?.entry_and_parking;
  if (!map || typeof map !== 'object') return '';
  const values = Object.values(map).filter((v) => typeof v === 'string' && v.trim());
  return (map[location] || (values.length === 1 ? values[0] : '') || '').trim();
}

/** Short labels for the per-service survey answers (serviceSurveyQuestions.ts ids). */
const SURVEY_ANSWER_LABELS = {
  hair_service_interest: 'Hair services the team wants',
  headshot_retouching: 'Retouching',
  headshot_background: 'Background',
  nails_service: 'Nail services',
  nails_polish: 'Color preferences',
  facial_skin_type: 'Most common skin type',
  facial_sensitivities: 'Allergies or sensitivities',
};

/** Per-service survey answers for the services in this event, one line each. */
export function surveyServiceLines(surveyResponse, serviceTypes) {
  const responses = surveyResponse?.responses;
  if (!responses || typeof responses !== 'object') return [];
  const wanted = new Set(serviceTypes.map((t) => t.toLowerCase()));
  const lines = [];
  for (const [serviceType, answers] of Object.entries(responses)) {
    if (serviceType === START_TIMES_KEY || !wanted.has(serviceType.toLowerCase())) continue;
    if (!answers || typeof answers !== 'object') continue;
    for (const [id, answer] of Object.entries(answers)) {
      const value = Array.isArray(answer) ? answer.join(', ') : String(answer ?? '').trim();
      if (value) lines.push(`${SURVEY_ANSWER_LABELS[id] || id}: ${value}`);
    }
  }
  return lines;
}

/** Collapse the survey's spacing: "Conference Room:  Banting" → "Conference Room: Banting". */
export function cleanSpaceName(raw) {
  return (raw || '').replace(/\s+/g, ' ').trim().slice(0, 40);
}

/** What a service is called in the default description, or '' to leave it out. */
export function serviceNoun(serviceType, massageFormat) {
  const t = String(serviceType || '').toLowerCase();
  if (t === 'chair-massage' || (t === 'massage' && massageFormat === 'chair')) return 'chair massage';
  if (t === 'table-massage' || (t === 'massage' && massageFormat === 'table')) return 'table massage';
  if (t === 'massage') return 'massage';
  if (t === 'hair' || t === 'beard-trim' || t === 'grooming' || t === 'blowout') return 'hair';
  if (t === 'nails' || t === 'nails-hand-massage') return 'nail';
  if (t === 'facial' || t === 'facials') return 'facial';
  if (t === 'makeup') return 'makeup';
  if (t === 'headshot' || t === 'headshots') return 'headshot';
  if (t === 'mindfulness' || t.startsWith('mindfulness-')) return 'mindfulness';
  return '';
}

/** The default-description noun for a coordinator service type ("Massage" → "massage"). */
export function nounForCoordinatorService(service) {
  if (!service) return '';
  if (service.id === 'm_03') return 'chair massage';
  if (service.id === 'm_04') return 'table massage';
  switch (service.type) {
    case 'Massage': return 'massage';
    case 'Hair': return 'hair';
    case 'Nails': return 'nail';
    case 'Photo': return 'headshot';
    case 'Mindfulness': return 'mindfulness';
    case 'Beauty': return service.id === 'beauty_06' ? 'facial' : service.id === 'makeup_01' ? 'makeup' : 'beauty';
    default: return '';
  }
}

/**
 * The sign-up page description, in the coordinator's house lines ("Enjoy
 * relaxing chair massage services from the Shortcut team") and fitting the
 * 80-character box. It used to be the same massage sentence for every event,
 * headshots and nails included, without a full stop.
 */
export function defaultDescription(nouns) {
  const unique = Array.from(new Set(nouns.filter(Boolean)));
  const fallback = 'Enjoy wellness services from the Shortcut team.';
  if (!unique.length) return fallback;
  if (unique.length === 1) {
    const n = unique[0];
    if (n.endsWith('massage')) return `Enjoy relaxing ${n} services from the Shortcut team.`;
    if (n === 'headshot') return 'Enjoy professional headshots from the Shortcut team.';
    if (n === 'mindfulness') return 'Enjoy a guided mindfulness session with the Shortcut team.';
    return `The Shortcut team is here to help you look and feel great with ${n} services.`;
  }
  const list = unique.length === 2
    ? unique.join(' and ')
    : `${unique.slice(0, -1).join(', ')} and ${unique[unique.length - 1]}`;
  const line = `Enjoy ${list} services from the Shortcut team.`;
  return line.length <= 80 ? line : fallback;
}

// --- Build initial form data from proposal ---

/**
 * One form per (location, date) the client kept. `proposal` is the staff screens'
 * shape: { data, clientName?, clientEmail?, clientLogoUrl? } (a database row passes
 * its client_name etc. as those).
 */
export function buildInitialEvents(proposal, surveyResponse) {
  const data = proposal.data;
  if (!data?.services) return [];

  const events = [];
  const clientName = data.clientName || proposal.clientName || '';
  const clientEmail = data.clientEmail || proposal.clientEmail || '';

  // The on-site contact from the survey: name, phone, and an email if one goes with them.
  const poc = parsePointOfContact(surveyResponse?.point_of_contact, surveyResponse?.billing_contact);
  const surveyFormat = /table/i.test(surveyResponse?.table_or_chair_preference || '') && !/both/i.test(surveyResponse?.table_or_chair_preference || '')
    ? 'table'
    : /chair/i.test(surveyResponse?.table_or_chair_preference || '') ? 'chair' : '';
  const spaceName = cleanSpaceName(surveyResponse?.massage_space_name);

  // Admin-only notes from the survey: who to staff, COI, billing.
  const adminLines = [];
  const gender = (surveyResponse?.preferred_gender || '').trim();
  if (gender && !/no preference/i.test(gender)) adminLines.push(`Therapist preference: ${gender}.`);
  if (surveyResponse?.coi_required) {
    adminLines.push(surveyResponse?.coi_sample_files?.length
      ? 'COI required. The client uploaded a sample from their building (on the proposal page).'
      : 'COI required.');
  }
  if ((surveyResponse?.billing_contact || '').trim()) adminLines.push(`Billing contact: ${surveyResponse.billing_contact.trim()}`);

  for (const [location, dateMap] of Object.entries(data.services)) {
    for (const [dateStr, dateData] of Object.entries(dateMap)) {
      // Only what the client kept, staffed as they chose it: a guest-count
      // option's hours and Pros, not the base service's (client-picks.js).
      const services = ((dateData.services || []))
        .filter((svc, i) => clientIncluded(data, location, dateStr, i, svc))
        .map((svc) => effectiveService(svc));
      if (!services.length) continue;

      // Address: the survey's (the client confirmed it after approving), else
      // the proposal's. When both exist and differ, say so on the card: for
      // Forus the proposal said 73 Spring St and the survey 105 Wooster St.
      const proposalAddress = data.officeLocations?.[location] || data.officeLocation || '';
      const surveyAddress = surveyAddressFor(surveyResponse, location);
      const addressData = parseAddressString(surveyAddress || proposalAddress);
      const sameStreet = (a, b) =>
        (parseAddressString(a).street || '').toLowerCase().replace(/[^a-z0-9]/g, '') ===
        (parseAddressString(b).street || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const addressNote = surveyAddress && proposalAddress && !sameStreet(surveyAddress, proposalAddress)
        ? `The survey gave this address. The proposal had ${proposalAddress}.`
        : undefined;

      // Map services with smart matching
      const formServices = services.map(s => {
        const format = s.massageType === 'table' || s.massageType === 'chair' ? s.massageType : surveyFormat;
        const match = findBestServiceMatch(s.serviceType || '', format);
        return {
          proposalServiceType: s.serviceType || '',
          proposalNumPros: s.numPros || 1,
          proposalTotalHours: s.totalHours || 4,
          proposalAppTime: s.appTime || 20,
          coordinatorServiceId: match?.id || '',
          coordinatorServiceTitle: match?.title || '',
          coordinatorServiceType: match?.type || '',
          price: 0, // Events are sponsor-covered; employees don't pay per service
        };
      });

      const maxHours = Math.max(...services.map(s => s.totalHours || 4));
      // The client's start time from the survey, else 9 AM. The end time adds
      // the event's hours as minutes, so 6.9 or 4.5 hours still makes a valid time.
      const surveyStart = surveyResponse?.responses?.[START_TIMES_KEY]?.[`${location}|${dateStr}`];
      const startTime = isClock(surveyStart) ? surveyStart : '09:00';
      const totalPros = services.reduce((sum, s) => sum + (s.numPros || 1), 0);
      const avgRate = Math.round(
        services.reduce((sum, s) => sum + (s.proHourly || 50), 0) / services.length
      );
      const totalPayment = Math.round(
        services.reduce((sum, s) => sum + (s.serviceCost || 0), 0)
      );
      const avgAppTime = Math.round(
        services.reduce((sum, s) => sum + (s.appTime || 20), 0) / services.length
      );

      // Notes for Pros, in the coordinator's usual shape ("Please bring your
      // massage chair." then "Entry instructions: …"), plus the client's
      // per-service answers (nail services, retouching, skin type…).
      const entry = surveyEntryFor(surveyResponse, location);
      const staffLines = [];
      if (formServices.some((s) => s.coordinatorServiceId === 'm_03')) staffLines.push('Please bring your massage chair.');
      if (formServices.some((s) => s.coordinatorServiceId === 'm_04')) staffLines.push('Please bring your massage table.');
      // Clients write these in the first person ("I will greet you downstairs"),
      // so say who wrote it.
      if (entry) staffLines.push(`Entry instructions${poc.name ? ` (from ${poc.name})` : ''}: ${entry}`);
      const serviceLines = surveyServiceLines(surveyResponse, services.map((s) => s.serviceType || ''));
      staffLines.push(...serviceLines);

      const nouns = services.map((s) => {
        const format = s.massageType === 'table' || s.massageType === 'chair' ? s.massageType : surveyFormat;
        return serviceNoun(s.serviceType || '', format);
      });

      events.push({
        included: true,
        expanded: events.length === 0,
        name: clientName,
        eventCode: generateEventCode(clientName, location),
        category: 'Office',
        description: defaultDescription(nouns),
        locationName: location,
        locationDescription: spaceName,
        signupTitle: '',
        signupHeadline: '',
        seriesIntro: '',
        attendeeInstructions: '',
        confirmationSubject: '',
        address: {
          street: addressData.street || '',
          unit: '',
          city: addressData.city || '',
          state: addressData.state || '',
          zip: addressData.zip || '',
          country: 'US',
        },
        addressNote,
        fromSurvey: {
          address: !!surveyAddress,
          locationDescription: !!spaceName,
          contact: !!(poc.name || poc.phone),
          staffNotes: !!(entry || serviceLines.length),
          adminNotes: adminLines.length > 0,
        },
        contactName: poc.name || clientName,
        contactEmail: poc.email || clientEmail,
        contactPhone: poc.phone,
        startTime,
        endTime: addHours(startTime, maxHours),
        surveyStartTime: isClock(surveyStart) ? surveyStart : undefined,
        eventDate: parseProposalDate(dateStr),
        lengthPerService: avgAppTime,
        groupClass: false,
        signupsPerTimeslot: 1,
        enableGuests: false,
        maxGuests: 0,
        optionalContact: false,
        services: formServices,
        numPros: totalPros,
        hourlyRate: Math.max(30, Math.min(200, avgRate)),
        payment: totalPayment,
        taxRate: '',
        // Optional fields
        legacyName: '',
        eventLinkURL: '',
        sponsorName: clientName,
        overrideNameCheck: false,
        isTestEvent: false,
        isSecret: false,
        doesNotRequireTimeslots: false,
        sendAutoEmailsManually: false,
        // Same defaults as the coordinator's Add Event form. With multiple
        // reservations off, an attendee can book only ONE event in the whole
        // series (a massage blocks the mindfulness class). One booking per
        // event still stops one person taking several slots in an event.
        allowMultipleReservations: true,
        oneReservationPerEvent: true,
        managerPassword: '',
        staffNotes: staffLines.join('\n'),
        adminNotes: adminLines.join('\n'),
        clientLogoUrl: data.clientLogoUrl || proposal.clientLogoUrl || '',
      });
    }
  }

  return events;
}

// --- Validation ---

export function validateEvents(events) {
  const issues = [];
  events.forEach((evt, i) => {
    if (!evt.included) return;
    if (!evt.name.trim()) issues.push({ eventIndex: i, field: 'name', message: 'Event name required' });
    if (!evt.locationDescription.trim()) issues.push({ eventIndex: i, field: 'locationDescription', message: 'Location description required' });
    if (evt.groupClass && !(evt.signupsPerTimeslot >= 2 && evt.signupsPerTimeslot <= 500)) {
      issues.push({ eventIndex: i, field: 'signupsPerTimeslot', message: 'Group class needs 2 to 500 spots per time' });
    }
    if (evt.enableGuests && !(evt.maxGuests >= 1)) {
      issues.push({ eventIndex: i, field: 'maxGuests', message: 'Enter the most guests one booking can bring' });
    }
    if (!evt.contactEmail.trim()) issues.push({ eventIndex: i, field: 'contactEmail', message: 'Contact email required' });
    if (!evt.contactPhone.trim()) issues.push({ eventIndex: i, field: 'contactPhone', message: 'Contact phone missing' });
    if (!evt.address.street.trim()) issues.push({ eventIndex: i, field: 'address.street', message: 'Street address missing' });
    if (!evt.address.city.trim()) issues.push({ eventIndex: i, field: 'address.city', message: 'City missing' });
    if (!evt.address.state.trim()) issues.push({ eventIndex: i, field: 'address.state', message: 'State missing' });
    if (!evt.address.zip.trim()) issues.push({ eventIndex: i, field: 'address.zip', message: 'Zip code missing' });
    if (evt.services.some(s => !s.coordinatorServiceId)) {
      issues.push({ eventIndex: i, field: 'services', message: 'Service selection incomplete' });
    }
    if (!evt.sponsorName.trim()) {
      issues.push({ eventIndex: i, field: 'sponsorName', message: 'Event sponsor required' });
    }
  });
  return issues;
}

export const CATEGORIES = ['Office', 'Hospital', 'Retail', 'Wedding', 'Festival', 'Residential', 'School', 'Pop-Up', 'Other'];
