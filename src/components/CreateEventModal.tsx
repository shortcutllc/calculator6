import React, { useState, useEffect, useMemo } from 'react';
import { X, AlertCircle, CheckCircle, ChevronDown, ChevronUp, Loader2, Zap } from 'lucide-react';
import { Proposal, Service } from '../types/proposal';
import { Button } from './Button';
import { createCoordinatorEvents } from '../services/generateProposalApi';
import { effectiveService, clientIncluded } from '../../netlify/functions/lib/client-picks.js';
import { START_TIMES_KEY, addHours, formatClock, isClock } from '../../netlify/functions/lib/survey-start-times.js';

// --- Types ---

interface CoordinatorService {
  id: string;
  title: string;
  type?: string; // Massage, Nails, Hair, Beauty, Photo, Mindfulness
  mainPhoto?: string;
}

interface EventFormAddress {
  street: string;
  unit: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface EventFormService {
  proposalServiceType: string;
  proposalNumPros: number;
  proposalTotalHours: number;
  proposalAppTime: number;
  coordinatorServiceId: string;
  coordinatorServiceTitle: string;
  coordinatorServiceType: string;
  price: number;
}

interface EventFormData {
  included: boolean;
  expanded: boolean;
  // Basic
  name: string;
  eventCode: string;
  category: string;
  description: string;
  /** The proposal's location label ("SoHo, NY"): the card header and the proposal record. */
  locationName: string;
  /** The room on site ("Banting conference room"), shown to attendees and Pros. */
  locationDescription: string;
  // Page copy (coordinator Add Event "Page copy"); blank keeps the automatic text
  signupTitle: string;
  signupHeadline: string;
  seriesIntro: string;
  attendeeInstructions: string;
  confirmationSubject: string;
  // Address
  address: EventFormAddress;
  /** Set when the survey's address differs from the proposal's (the survey wins). */
  addressNote?: string;
  /** Which fields were filled from the post-approval survey, for the "From the survey" hints. */
  fromSurvey: Partial<Record<'address' | 'locationDescription' | 'contact' | 'staffNotes' | 'adminNotes', boolean>>;
  // Contact
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  // Timing
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  /** The start time the client asked for in the survey, when they gave one. */
  surveyStartTime?: string;
  eventDate: string;  // YYYY-MM-DD or display string
  lengthPerService: number;
  /** Group class: several people book each time; signupsPerTimeslot is how many. */
  groupClass: boolean;
  signupsPerTimeslot: number;
  enableGuests: boolean;
  maxGuests: number;
  optionalContact: boolean;
  // Services
  services: EventFormService[];
  // Financial
  numPros: number;
  hourlyRate: number;
  payment: number;
  taxRate: string;
  // Optional fields
  legacyName: string;
  eventLinkURL: string;
  sponsorName: string;
  overrideNameCheck: boolean;
  isTestEvent: boolean;
  isSecret: boolean;
  doesNotRequireTimeslots: boolean;
  sendAutoEmailsManually: boolean;
  allowMultipleReservations: boolean;
  oneReservationPerEvent: boolean;
  managerPassword: string;
  staffNotes: string;
  adminNotes: string;
  clientLogoUrl: string;
}

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: Proposal;
  proposalId: string;
  surveyResponse?: any | null;
  onSuccess?: (events: any[]) => void;
}

// --- Real coordinator services from Parse EventService table ---

const COORDINATOR_SERVICES: CoordinatorService[] = [
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
const PROPOSAL_TO_COORDINATOR_TYPE: Record<string, string> = {
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
const DEFAULT_SERVICE_MATCH: Record<string, string> = {
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

function findBestServiceMatch(proposalServiceType: string, massageFormat?: 'chair' | 'table' | ''): CoordinatorService | null {
  const type = proposalServiceType.toLowerCase();

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
function getServicesForProposalType(proposalServiceType: string): CoordinatorService[] {
  const type = proposalServiceType.toLowerCase();
  const coordinatorType = PROPOSAL_TO_COORDINATOR_TYPE[type];
  if (coordinatorType) {
    return COORDINATOR_SERVICES.filter(s => s.type === coordinatorType);
  }
  // If no mapping, show all
  return COORDINATOR_SERVICES;
}

// --- Address parsing ---

function parseAddressString(addressStr: string): Partial<EventFormAddress> {
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

function parseProposalDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toISOString().split('T')[0];
}

function formatDisplayDate(dateStr: string): string {
  // "2027-06-10" read by new Date() is UTC midnight, which shows as Jun 9
  // anywhere west of UTC. Build date-only values in the local zone.
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  const d = iso ? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])) : new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function generateEventCode(clientName: string, location: string): string {
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
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const ten = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  return ten.length === 10 ? `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}` : raw.trim();
}

const EMAIL_RE = /[^\s@,;:<>()]+@[^\s@,;:<>()]+\.[a-z]{2,}/i;
const PHONE_RE = /(?:\+?1[\s.-]*)?\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}/;

/**
 * The survey's free-text "Point of contact (including phone number)", e.g.
 * "Emma Sharp: (415) 933 - 9437 \nOffice Manager, People Operations".
 * The email comes from the contact itself, else from the billing contact when
 * it names the same person.
 */
function parsePointOfContact(poc?: string | null, billing?: string | null): { name: string; phone: string; email: string } {
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
function surveyAddressFor(surveyResponse: any, location: string): string {
  const raw = surveyResponse?.office_address;
  if (!raw || typeof raw !== 'string') return '';
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed[location] || '';
  } catch { /* a plain address */ }
  return raw;
}

/** Entry and parking for a location; a one-location survey may key it differently. */
function surveyEntryFor(surveyResponse: any, location: string): string {
  const map = surveyResponse?.entry_and_parking;
  if (!map || typeof map !== 'object') return '';
  const values = Object.values(map).filter((v) => typeof v === 'string' && v.trim()) as string[];
  return (map[location] || (values.length === 1 ? values[0] : '') || '').trim();
}

/** Short labels for the per-service survey answers (serviceSurveyQuestions.ts ids). */
const SURVEY_ANSWER_LABELS: Record<string, string> = {
  hair_service_interest: 'Hair services the team wants',
  headshot_retouching: 'Retouching',
  headshot_background: 'Background',
  nails_service: 'Nail services',
  nails_polish: 'Color preferences',
  facial_skin_type: 'Most common skin type',
  facial_sensitivities: 'Allergies or sensitivities',
};

/** Per-service survey answers for the services in this event, one line each. */
function surveyServiceLines(surveyResponse: any, serviceTypes: string[]): string[] {
  const responses = surveyResponse?.responses;
  if (!responses || typeof responses !== 'object') return [];
  const wanted = new Set(serviceTypes.map((t) => t.toLowerCase()));
  const lines: string[] = [];
  for (const [serviceType, answers] of Object.entries(responses)) {
    if (serviceType === START_TIMES_KEY || !wanted.has(serviceType.toLowerCase())) continue;
    if (!answers || typeof answers !== 'object') continue;
    for (const [id, answer] of Object.entries(answers as Record<string, unknown>)) {
      const value = Array.isArray(answer) ? answer.join(', ') : String(answer ?? '').trim();
      if (value) lines.push(`${SURVEY_ANSWER_LABELS[id] || id}: ${value}`);
    }
  }
  return lines;
}

/** Collapse the survey's spacing: "Conference Room:  Banting" → "Conference Room: Banting". */
function cleanSpaceName(raw?: string | null): string {
  return (raw || '').replace(/\s+/g, ' ').trim().slice(0, 40);
}

/** What a service is called in the default description, or '' to leave it out. */
function serviceNoun(serviceType: string, massageFormat: string): string {
  const t = serviceType.toLowerCase();
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

/**
 * The sign-up page description, in the coordinator's house lines ("Enjoy
 * relaxing chair massage services from the Shortcut team") and fitting the
 * 80-character box. It used to be the same massage sentence for every event,
 * headshots and nails included, without a full stop.
 */
function defaultDescription(nouns: string[]): string {
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

function buildInitialEvents(proposal: Proposal, surveyResponse?: any): EventFormData[] {
  const data = proposal.data;
  if (!data?.services) return [];

  const events: EventFormData[] = [];
  const clientName = data.clientName || proposal.clientName || '';
  const clientEmail = data.clientEmail || proposal.clientEmail || '';

  // The on-site contact from the survey: name, phone, and an email if one goes with them.
  const poc = parsePointOfContact(surveyResponse?.point_of_contact, surveyResponse?.billing_contact);
  const surveyFormat = /table/i.test(surveyResponse?.table_or_chair_preference || '') && !/both/i.test(surveyResponse?.table_or_chair_preference || '')
    ? 'table'
    : /chair/i.test(surveyResponse?.table_or_chair_preference || '') ? 'chair' : '';
  const spaceName = cleanSpaceName(surveyResponse?.massage_space_name);

  // Admin-only notes from the survey: who to staff, COI, billing.
  const adminLines: string[] = [];
  const gender = (surveyResponse?.preferred_gender || '').trim();
  if (gender && !/no preference/i.test(gender)) adminLines.push(`Therapist preference: ${gender}.`);
  if (surveyResponse?.coi_required) {
    adminLines.push(surveyResponse?.coi_sample_files?.length
      ? 'COI required. The client uploaded a sample from their building (on the proposal page).'
      : 'COI required.');
  }
  if ((surveyResponse?.billing_contact || '').trim()) adminLines.push(`Billing contact: ${surveyResponse.billing_contact.trim()}`);

  for (const [location, dateMap] of Object.entries(data.services)) {
    for (const [dateStr, dateData] of Object.entries(dateMap as Record<string, any>)) {
      // Only what the client kept, staffed as they chose it: a guest-count
      // option's hours and Pros, not the base service's (client-picks.js).
      const services: Service[] = ((dateData.services || []) as Service[])
        .filter((svc, i) => clientIncluded(data, location, dateStr, i, svc))
        .map((svc) => effectiveService(svc));
      if (!services.length) continue;

      // Address: the survey's (the client confirmed it after approving), else
      // the proposal's. When both exist and differ, say so on the card: for
      // Forus the proposal said 73 Spring St and the survey 105 Wooster St.
      const proposalAddress = data.officeLocations?.[location] || data.officeLocation || '';
      const surveyAddress = surveyAddressFor(surveyResponse, location);
      const addressData: Partial<EventFormAddress> = parseAddressString(surveyAddress || proposalAddress);
      const sameStreet = (a: string, b: string) =>
        (parseAddressString(a).street || '').toLowerCase().replace(/[^a-z0-9]/g, '') ===
        (parseAddressString(b).street || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const addressNote = surveyAddress && proposalAddress && !sameStreet(surveyAddress, proposalAddress)
        ? `The survey gave this address. The proposal had ${proposalAddress}.`
        : undefined;

      // Map services with smart matching
      const formServices: EventFormService[] = services.map(s => {
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
      const staffLines: string[] = [];
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

interface ValidationIssue {
  eventIndex: number;
  field: string;
  message: string;
}

function validateEvents(events: EventFormData[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
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

// --- Component ---

/** Small label tag on a field the post-approval survey filled in. */
const SurveyHint: React.FC<{ show?: boolean }> = ({ show }) =>
  show ? <span className="ml-2 text-[10px] font-semibold text-text-dark-60">From the survey</span> : null;

const CATEGORIES = ['Office', 'Hospital', 'Retail', 'Wedding', 'Festival', 'Residential', 'School', 'Pop-Up', 'Other'];

const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  proposal,
  proposalId,
  surveyResponse,
  onSuccess
}) => {
  const [events, setEvents] = useState<EventFormData[]>([]);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen && proposal) {
      setEvents(buildInitialEvents(proposal, surveyResponse));
      setResult(null);
    }
  }, [isOpen, proposal, surveyResponse]);

  const validationIssues = useMemo(() => validateEvents(events), [events]);
  const includedCount = events.filter(e => e.included).length;
  const warningCount = validationIssues.filter(v => {
    const evt = events[v.eventIndex];
    return evt?.included;
  }).length;

  if (!isOpen) return null;

  const updateEvent = (index: number, updates: Partial<EventFormData>) => {
    setEvents(prev => prev.map((e, i) => i === index ? { ...e, ...updates } : e));
  };

  const updateEventAddress = (index: number, field: keyof EventFormAddress, value: string) => {
    setEvents(prev => prev.map((e, i) =>
      i === index ? { ...e, address: { ...e.address, [field]: value } } : e
    ));
  };

  const updateEventService = (eventIndex: number, serviceIndex: number, serviceId: string) => {
    const service = COORDINATOR_SERVICES.find(s => s.id === serviceId);
    setEvents(prev => prev.map((e, i) => {
      if (i !== eventIndex) return e;
      const newServices = [...e.services];
      newServices[serviceIndex] = {
        ...newServices[serviceIndex],
        coordinatorServiceId: serviceId,
        coordinatorServiceTitle: service?.title || '',
        coordinatorServiceType: service?.type || '',
      };
      return { ...e, services: newServices };
    }));
  };

  const handleCreate = async () => {
    setCreating(true);
    setResult(null);
    try {
      const includedEvents = events.filter(e => e.included);
      const apiResult = await createCoordinatorEvents(proposalId, includedEvents);
      setResult({ success: true, message: `${apiResult.eventsCreated} event(s) created` });
      if (onSuccess) {
        onSuccess(apiResult.events || []);
      }
    } catch (err: any) {
      setResult({ success: false, message: err.message || 'Failed to create events' });
    } finally {
      setCreating(false);
    }
  };

  const hasFieldIssue = (eventIndex: number, field: string) => {
    return validationIssues.some(v => v.eventIndex === eventIndex && v.field === field);
  };

  const inputClass = (eventIndex: number, field: string) =>
    `w-full px-3 py-2 border-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal ${
      hasFieldIssue(eventIndex, field) ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'
    }`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-xl font-extrabold text-shortcut-blue">Create Events from Proposal</h2>
            <p className="text-sm text-text-dark-60 mt-1">
              Creating events for <span className="font-semibold">{proposal.data.clientName}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-text-dark-60 hover:text-shortcut-blue transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ scrollbarWidth: 'thin' }}>
          {events.length === 0 && (
            <div className="text-center text-text-dark-60 py-12">
              No events could be generated from this proposal.
            </div>
          )}

          {events.map((evt, eventIndex) => (
            <div
              key={eventIndex}
              className={`border-2 rounded-xl overflow-hidden transition-colors ${
                evt.included ? 'border-gray-200' : 'border-gray-100 opacity-50'
              }`}
            >
              {/* Event Card Header */}
              <div
                className="flex items-center justify-between px-5 py-3 bg-neutral-light-gray cursor-pointer"
                onClick={() => updateEvent(eventIndex, { expanded: !evt.expanded })}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={evt.included}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateEvent(eventIndex, { included: !evt.included });
                    }}
                    className="w-4 h-4 accent-shortcut-teal"
                  />
                  <div>
                    <span className="font-bold text-shortcut-blue text-sm">
                      EVENT {eventIndex + 1}
                    </span>
                    <span className="text-text-dark-60 text-sm ml-2">
                      {evt.locationName} &middot; {formatDisplayDate(evt.eventDate)}
                    </span>
                  </div>
                  {validationIssues.some(v => v.eventIndex === eventIndex) && evt.included && (
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                  )}
                </div>
                {evt.expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>

              {/* Event Card Body */}
              {evt.expanded && (
                <div className="p-5 space-y-5">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">Event Name *</label>
                      <input
                        value={evt.name}
                        onChange={(e) => updateEvent(eventIndex, { name: e.target.value })}
                        className={inputClass(eventIndex, 'name')}
                        maxLength={40}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">Event Code</label>
                      <input
                        value={evt.eventCode}
                        onChange={(e) => updateEvent(eventIndex, { eventCode: e.target.value.toUpperCase() })}
                        className={inputClass(eventIndex, 'eventCode')}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">Category</label>
                      <select
                        value={evt.category}
                        onChange={(e) => updateEvent(eventIndex, { category: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-shortcut-blue mb-1">
                      Location Description *
                      <SurveyHint show={evt.fromSurvey.locationDescription} />
                    </label>
                    <input
                      value={evt.locationDescription}
                      onChange={(e) => updateEvent(eventIndex, { locationDescription: e.target.value })}
                      className={inputClass(eventIndex, 'locationDescription')}
                      maxLength={40}
                      placeholder="The room on site, e.g. Banting conference room"
                    />
                  </div>

                  {/* Sign-up page copy (the coordinator's "Page copy": this event) */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-shortcut-blue mb-1">Sign-up page title</label>
                        <input
                          value={evt.signupTitle}
                          onChange={(e) => updateEvent(eventIndex, { signupTitle: e.target.value })}
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                          placeholder="Blank shows the service name, or the list page title"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-shortcut-blue mb-1">
                          Description
                          <span className={`ml-2 text-[10px] font-normal ${evt.description.length >= 75 ? 'text-yellow-700' : 'text-text-dark-60'}`}>
                            {evt.description.length}/80
                          </span>
                        </label>
                        <textarea
                          value={evt.description}
                          onChange={(e) => updateEvent(eventIndex, { description: e.target.value })}
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal resize-y"
                          maxLength={80}
                          rows={2}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">"Before you come"</label>
                      <textarea
                        value={evt.attendeeInstructions}
                        onChange={(e) => updateEvent(eventIndex, { attendeeInstructions: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal resize-y"
                        rows={2}
                        placeholder={'Blank shows the usual tips for the service. For your own, e.g.\nJoining In Person\n\n1. Location: Training Room, 1st Floor.'}
                      />
                      <p className="text-xs text-text-dark-60 mt-1">
                        Shown on the sign-up and confirmation pages, in the confirmation email and the calendar invite. Leave a blank line between sections. A short line with no full stop becomes a heading.
                      </p>
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-xs font-bold text-shortcut-blue mb-2">
                      Address {hasFieldIssue(eventIndex, 'address.street') && <span className="text-yellow-500 ml-1">⚠️</span>}
                      <SurveyHint show={evt.fromSurvey.address} />
                    </label>
                    {evt.addressNote && (
                      <p className="flex items-start gap-1.5 text-xs text-shortcut-navy-blue bg-yellow-50 border border-yellow-300 rounded-lg px-3 py-2 mb-2">
                        <AlertCircle className="w-3.5 h-3.5 text-yellow-600 flex-shrink-0 mt-px" />
                        <span>{evt.addressNote} Check which one the Pros should go to.</span>
                      </p>
                    )}
                    <div className="grid grid-cols-1 gap-2">
                      <input
                        placeholder="Street address"
                        value={evt.address.street}
                        onChange={(e) => updateEventAddress(eventIndex, 'street', e.target.value)}
                        className={inputClass(eventIndex, 'address.street')}
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          placeholder="City"
                          value={evt.address.city}
                          onChange={(e) => updateEventAddress(eventIndex, 'city', e.target.value)}
                          className={inputClass(eventIndex, 'address.city')}
                        />
                        <input
                          placeholder="State"
                          value={evt.address.state}
                          onChange={(e) => updateEventAddress(eventIndex, 'state', e.target.value)}
                          className={inputClass(eventIndex, 'address.state')}
                          maxLength={2}
                        />
                        <input
                          placeholder="Zip"
                          value={evt.address.zip}
                          onChange={(e) => updateEventAddress(eventIndex, 'zip', e.target.value)}
                          className={inputClass(eventIndex, 'address.zip')}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">
                        Contact Name
                        <SurveyHint show={evt.fromSurvey.contact} />
                      </label>
                      <input
                        value={evt.contactName}
                        onChange={(e) => updateEvent(eventIndex, { contactName: e.target.value })}
                        className={inputClass(eventIndex, 'contactName')}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">Contact Email *</label>
                      <input
                        type="email"
                        value={evt.contactEmail}
                        onChange={(e) => updateEvent(eventIndex, { contactEmail: e.target.value })}
                        className={inputClass(eventIndex, 'contactEmail')}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">
                        Contact Phone {hasFieldIssue(eventIndex, 'contactPhone') && <span className="text-yellow-500">⚠️</span>}
                      </label>
                      <input
                        type="tel"
                        value={evt.contactPhone}
                        onChange={(e) => updateEvent(eventIndex, { contactPhone: e.target.value })}
                        className={inputClass(eventIndex, 'contactPhone')}
                        placeholder="Required"
                      />
                    </div>
                  </div>

                  {/* Event Sponsor */}
                  <div>
                    <label className="block text-xs font-bold text-shortcut-blue mb-1">
                      Event Sponsor <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={evt.sponsorName}
                      onChange={(e) => updateEvent(eventIndex, { sponsorName: e.target.value })}
                      className={inputClass(eventIndex, 'sponsorName')}
                      placeholder="Client name sponsoring the event"
                    />
                  </div>

                  {/* Timing */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">Event Date</label>
                      <input
                        type="date"
                        value={evt.eventDate}
                        onChange={(e) => updateEvent(eventIndex, { eventDate: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">Start Time</label>
                      <input
                        type="time"
                        value={evt.startTime}
                        onChange={(e) => updateEvent(eventIndex, { startTime: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                      />
                      {evt.surveyStartTime && (
                        <p className="text-xs text-text-dark-60 mt-1">Client asked for {formatClock(evt.surveyStartTime)}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">End Time</label>
                      <input
                        type="time"
                        value={evt.endTime}
                        onChange={(e) => updateEvent(eventIndex, { endTime: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">Appt Length (min)</label>
                      <input
                        type="number"
                        value={evt.lengthPerService}
                        onChange={(e) => updateEvent(eventIndex, { lengthPerService: parseInt(e.target.value) || 20 })}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                        min={5}
                        max={120}
                      />
                    </div>
                  </div>

                  {/* Services */}
                  <div>
                    <label className="block text-xs font-bold text-shortcut-blue mb-2">
                      Services {hasFieldIssue(eventIndex, 'services') && <span className="text-yellow-500">⚠️ Select coordinator service</span>}
                    </label>
                    <div className="space-y-2">
                      {evt.services.map((svc, svcIndex) => (
                        <div key={svcIndex} className="flex items-center gap-3 p-3 bg-neutral-light-gray rounded-lg">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-text-dark-60">
                              Proposal: <span className="font-semibold text-shortcut-blue">{svc.proposalServiceType}</span>
                              <span className="ml-2">({svc.proposalNumPros} pro{svc.proposalNumPros > 1 ? 's' : ''}, {svc.proposalTotalHours} hrs)</span>
                            </div>
                          </div>
                          <select
                            value={svc.coordinatorServiceId}
                            onChange={(e) => updateEventService(eventIndex, svcIndex, e.target.value)}
                            className={`px-3 py-1.5 border-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal ${
                              !svc.coordinatorServiceId ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'
                            }`}
                          >
                            <option value="">Select service...</option>
                            {/* Show filtered services matching the proposal type first, then all others */}
                            {(() => {
                              const filtered = getServicesForProposalType(svc.proposalServiceType);
                              const otherServices = COORDINATOR_SERVICES.filter(cs => !filtered.includes(cs));
                              return (
                                <>
                                  {filtered.map(cs => (
                                    <option key={cs.id} value={cs.id}>{cs.title}</option>
                                  ))}
                                  {otherServices.length > 0 && (
                                    <option disabled>── Other services ──</option>
                                  )}
                                  {otherServices.map(cs => (
                                    <option key={cs.id} value={cs.id}>{cs.title}</option>
                                  ))}
                                </>
                              );
                            })()}
                          </select>
                          <span className="w-16 px-2 py-1.5 text-sm text-center text-text-dark-60">$0</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial */}
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">Pros Required</label>
                      <input
                        type="number"
                        value={evt.numPros}
                        onChange={(e) => updateEvent(eventIndex, { numPros: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                        min={1}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">Hourly Rate ($)</label>
                      <input
                        type="number"
                        value={evt.hourlyRate}
                        onChange={(e) => updateEvent(eventIndex, { hourlyRate: parseInt(e.target.value) || 50 })}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                        min={30}
                        max={200}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">Payment ($)</label>
                      <input
                        type="number"
                        value={evt.payment}
                        onChange={(e) => updateEvent(eventIndex, { payment: parseInt(e.target.value) || 0 })}
                        className={inputClass(eventIndex, 'payment')}
                        min={0}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">Tax Rate %</label>
                      <input
                        type="text"
                        value={evt.taxRate}
                        onChange={(e) => updateEvent(eventIndex, { taxRate: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  {/* Notes: prefilled from the survey (entry, equipment, the client's answers) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">
                        Notes for Pros
                        <SurveyHint show={evt.fromSurvey.staffNotes} />
                      </label>
                      <textarea
                        value={evt.staffNotes}
                        onChange={(e) => updateEvent(eventIndex, { staffNotes: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal resize-y"
                        rows={3}
                        placeholder="Entry instructions, parking, what to bring"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">
                        Notes for Admins (private)
                        <SurveyHint show={evt.fromSurvey.adminNotes} />
                      </label>
                      <textarea
                        value={evt.adminNotes}
                        onChange={(e) => updateEvent(eventIndex, { adminNotes: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal resize-y"
                        rows={3}
                        placeholder="Staffing requirements?"
                      />
                    </div>
                  </div>

                  {/* Optional Settings (collapsible) */}
                  <details className="border-2 border-gray-100 rounded-lg">
                    <summary className="px-4 py-2.5 text-xs font-bold text-shortcut-blue cursor-pointer hover:bg-gray-50">
                      Additional Settings (optional)
                    </summary>
                    <div className="px-4 pb-4 pt-2 space-y-4">
                      {/* Names & Links */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-shortcut-blue mb-1">Previous Event Name</label>
                          <input
                            value={evt.legacyName}
                            onChange={(e) => updateEvent(eventIndex, { legacyName: e.target.value })}
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                            placeholder="Optional"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-shortcut-blue mb-1">Event Link URL</label>
                          <input
                            value={evt.eventLinkURL}
                            onChange={(e) => updateEvent(eventIndex, { eventLinkURL: e.target.value })}
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                            placeholder="e.g., https://zoom.us/123"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-shortcut-blue mb-1">Manager Password</label>
                          <input
                            value={evt.managerPassword}
                            onChange={(e) => updateEvent(eventIndex, { managerPassword: e.target.value })}
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                            placeholder="Optional"
                          />
                        </div>
                      </div>

                      {/* Logo */}
                      {evt.clientLogoUrl && (
                        <div className="flex items-center gap-3 p-3 bg-neutral-light-gray rounded-lg">
                          <img src={evt.clientLogoUrl} alt="Logo" className="w-10 h-10 object-contain rounded" />
                          <span className="text-xs text-text-dark-60">Logo from proposal (will be uploaded to coordinator)</span>
                        </div>
                      )}

                      {/* Event list page: shared by every event with this code */}
                      <div>
                        <p className="text-xs font-bold text-shortcut-blue">Event list page</p>
                        <p className="text-xs text-text-dark-60 mb-2">
                          The top box above all the events with this code, shared by every one of them. Leave blank to keep the automatic text.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            value={evt.signupHeadline}
                            onChange={(e) => updateEvent(eventIndex, { signupHeadline: e.target.value })}
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                            placeholder="Title, e.g. Wellness at [event name]"
                          />
                          <textarea
                            value={evt.seriesIntro}
                            onChange={(e) => updateEvent(eventIndex, { seriesIntro: e.target.value })}
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal resize-y"
                            rows={2}
                            placeholder="Description. Blank shows the sign-up page description."
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-shortcut-blue mb-1">Confirmation email subject</label>
                        <input
                          value={evt.confirmationSubject}
                          onChange={(e) => updateEvent(eventIndex, { confirmationSubject: e.target.value })}
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                          placeholder="Blank uses the standard subject"
                        />
                      </div>

                      {/* Who books, and how */}
                      <div className="space-y-2">
                        <label className="flex items-start gap-2 text-xs text-text-dark-60 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={evt.groupClass}
                            onChange={(e) => updateEvent(eventIndex, {
                              groupClass: e.target.checked,
                              signupsPerTimeslot: e.target.checked ? Math.max(2, evt.signupsPerTimeslot) : 1,
                            })}
                            className="w-3.5 h-3.5 mt-0.5 accent-shortcut-teal"
                          />
                          <span><span className="font-bold text-shortcut-blue">Group class.</span> Several people book each time, like a sound bath or a yoga class.</span>
                        </label>
                        {evt.groupClass && (
                          <input
                            type="number"
                            min={2}
                            max={500}
                            value={evt.signupsPerTimeslot}
                            onChange={(e) => updateEvent(eventIndex, { signupsPerTimeslot: parseInt(e.target.value, 10) || 0 })}
                            className={`${inputClass(eventIndex, 'signupsPerTimeslot')} max-w-[220px] ml-5`}
                            placeholder="Spots per time (e.g. 20)"
                          />
                        )}
                        <label className="flex items-start gap-2 text-xs text-text-dark-60 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={evt.enableGuests}
                            onChange={(e) => updateEvent(eventIndex, { enableGuests: e.target.checked, maxGuests: e.target.checked ? Math.max(1, evt.maxGuests) : 0 })}
                            className="w-3.5 h-3.5 mt-0.5 accent-shortcut-teal"
                          />
                          <span className="font-bold text-shortcut-blue">Let attendees bring additional guests</span>
                        </label>
                        {evt.enableGuests && (
                          <input
                            type="number"
                            min={1}
                            value={evt.maxGuests}
                            onChange={(e) => updateEvent(eventIndex, { maxGuests: parseInt(e.target.value, 10) || 0 })}
                            className={`${inputClass(eventIndex, 'maxGuests')} max-w-[220px] ml-5`}
                            placeholder="Most guests per booking"
                          />
                        )}
                        <label className="flex items-start gap-2 text-xs text-text-dark-60 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={evt.optionalContact}
                            onChange={(e) => updateEvent(eventIndex, { optionalContact: e.target.checked })}
                            className="w-3.5 h-3.5 mt-0.5 accent-shortcut-teal"
                          />
                          <span><span className="font-bold text-shortcut-blue">Let attendees book without an email or phone number.</span> For events where the contact belongs to a guardian rather than the attendee.</span>
                        </label>
                      </div>

                      {/* Checkboxes */}
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { key: 'isTestEvent', label: 'Test event' },
                          { key: 'isSecret', label: 'Hide from public' },
                          { key: 'doesNotRequireTimeslots', label: 'Do not require signups' },
                          { key: 'sendAutoEmailsManually', label: 'Send auto emails manually' },
                          { key: 'allowMultipleReservations', label: 'Allow multiple reservations' },
                          { key: 'oneReservationPerEvent', label: 'One booking per attendee in this event' },
                          { key: 'overrideNameCheck', label: 'Override name check' },
                        ].map(({ key, label }) => (
                          <label key={key} className="flex items-center gap-2 text-xs text-text-dark-60 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={(evt as any)[key]}
                              onChange={(e) => updateEvent(eventIndex, { [key]: e.target.checked })}
                              className="w-3.5 h-3.5 accent-shortcut-teal"
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </details>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-neutral-light-gray flex-shrink-0">
          <div className="flex items-center gap-2 text-sm">
            {warningCount > 0 && (
              <span className="flex items-center gap-1 text-yellow-600 font-medium">
                <AlertCircle className="w-4 h-4" />
                {warningCount} field{warningCount > 1 ? 's' : ''} need{warningCount === 1 ? 's' : ''} attention
              </span>
            )}
            {warningCount === 0 && includedCount > 0 && (
              <span className="flex items-center gap-1 text-green-600 font-medium">
                <CheckCircle className="w-4 h-4" />
                Ready to create
              </span>
            )}
            {result && (
              <span className={`font-medium ${result.success ? 'text-green-600' : 'text-red-500'}`}>
                {result.message}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={onClose} variant="secondary">
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              variant="primary"
              icon={creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              disabled={creating || includedCount === 0}
            >
              {creating ? 'Creating...' : `Create ${includedCount} Event${includedCount !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateEventModal;
