/**
 * What a Stripe invoice made from a proposal starts with: who it goes to, what
 * each line is called, and when payment is due. The staff Review Invoice
 * windows (Invoices page, both proposal viewers) fill their fields from here,
 * and create-stripe-invoice builds lines with it when a caller sends none, so
 * every surface names and dates an invoice the same way.
 * Types for the TypeScript side: invoice-defaults.d.ts.
 *
 * Rules (ops, 2026-11-19):
 * - Payment is due 48 hours before the event.
 * - A line reads "Company + date + service + Event", e.g.
 *   "Atmosphere TV December 17th Manicure Event".
 * - The invoice goes to a person, not the company. The survey's billing
 *   contact is who ops has been invoicing, then the proposal's contact.
 */

import { clientIncluded } from './client-picks.js';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Payment is due this many days before the event (48 hours). */
export const DAYS_BEFORE_EVENT = 2;
/** When there is no upcoming event to count back from. */
export const FALLBACK_DUE_DAYS = 30;

// ---------------------------------------------------------------- dates ----

/**
 * "2026-12-17" as a local date. `new Date("2026-12-17")` is midnight UTC,
 * which is the 16th anywhere west of London.
 */
export function parseIsoDate(iso) {
  const m = ISO_DATE.exec(String(iso || '').trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toIsoDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(iso, days) {
  const d = parseIsoDate(iso);
  if (!d) return null;
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

function ordinal(n) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'}`;
}

/** "December 17th": month and ordinal day, no year. Null for "TBD". */
export function monthDayOrdinal(iso) {
  const d = parseIsoDate(iso);
  if (!d) return null;
  return `${d.toLocaleDateString('en-US', { month: 'long' })} ${ordinal(d.getDate())}`;
}

/** "Thursday, December 17" for staff-facing notes. */
export function longDate(iso) {
  const d = parseIsoDate(iso);
  if (!d) return iso || '';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

/**
 * Stripe's due_date for a calendar day: noon UTC that day, which is the same
 * calendar day from Hawaii to New Zealand, so the invoice shows the day staff
 * picked whatever time zone Stripe renders it in.
 */
export function stripeDueTimestamp(iso) {
  const m = ISO_DATE.exec(String(iso || '').trim());
  if (!m) return null;
  return Math.floor(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12) / 1000);
}

/** Every dated event the client has in the proposal, earliest first. */
export function proposalEventDates(data) {
  const dates = new Set();
  const services = (data && data.services) || {};
  for (const [location, byDate] of Object.entries(services)) {
    if (!byDate || Array.isArray(byDate)) continue;
    for (const [dateKey, day] of Object.entries(byDate)) {
      (day?.services || []).forEach((service, index) => {
        if (!clientIncluded(data, location, dateKey, index, service)) return;
        const iso = parseIsoDate(dateKey) ? dateKey : parseIsoDate(service?.date) ? service.date : null;
        if (iso) dates.add(iso);
      });
    }
  }
  return [...dates].sort();
}

/**
 * The due date a new invoice starts with. Counts back 48 hours from the next
 * event (a past date in a series is skipped). Stripe only takes due dates
 * after today, so an event less than 48 hours out starts at tomorrow.
 *
 * reason: 'before-event' | 'event-soon' | 'event-passed' | 'no-event-date' | 'no-proposal'
 */
export function defaultPaymentDue(data, todayIso) {
  const today = todayIso || toIsoDate(new Date());
  const tomorrow = addDays(today, 1);
  const thirtyOut = addDays(today, FALLBACK_DUE_DAYS);
  if (!data) return { dueDate: thirtyOut, reason: 'no-proposal', eventDate: null };
  const dates = proposalEventDates(data);
  if (dates.length === 0) return { dueDate: thirtyOut, reason: 'no-event-date', eventDate: null };
  const next = dates.find((d) => d >= today);
  if (!next) return { dueDate: thirtyOut, reason: 'event-passed', eventDate: dates[dates.length - 1] };
  const beforeEvent = addDays(next, -DAYS_BEFORE_EVENT);
  if (beforeEvent >= tomorrow) return { dueDate: beforeEvent, reason: 'before-event', eventDate: next };
  return { dueDate: tomorrow, reason: 'event-soon', eventDate: next };
}

/** One line for staff under the due date field: where the starting date came from. */
export function paymentDueNote(due) {
  if (!due) return null;
  const event = longDate(due.eventDate);
  switch (due.reason) {
    case 'before-event':
      return `Filled in as 48 hours before the event on ${event}.`;
    case 'event-soon':
      return `The event on ${event} is less than 48 hours away, so this is filled in as tomorrow, the earliest date Stripe takes.`;
    case 'event-passed':
      return `The event on ${event} has passed, so this is filled in as ${FALLBACK_DUE_DAYS} days from today.`;
    case 'no-event-date':
      return `This proposal has no event date yet, so this is filled in as ${FALLBACK_DUE_DAYS} days from today.`;
    default:
      return null;
  }
}

// ------------------------------------------------------------ line items ----

/** What a line calls each service, read as "<name> Event". */
const SERVICE_NAMES = {
  massage: 'Massage',
  chair: 'Chair Massage',
  'table-massage': 'Table Massage',
  nails: 'Manicure',
  'nails-hand-massage': 'Manicure & Hand Massage',
  facial: 'Facial',
  facials: 'Facial',
  hair: 'Hair & Styling',
  'beard-trim': 'Beard Trim',
  makeup: 'Makeup',
  'hair-makeup': 'Hair & Makeup',
  headshot: 'Headshot',
  headshots: 'Headshot',
  'headshot-hair-makeup': 'Headshot Hair & Makeup',
  mindfulness: 'Mindfulness',
  'mindfulness-soles': 'Mindfulness',
  'mindfulness-movement': 'Mindfulness',
  'mindfulness-pro': 'Mindfulness',
  'mindfulness-pro-reactivity': 'Mindfulness',
  'mindfulness-cle': 'CLE Mindfulness',
  'sound-bath': 'Sound Bath',
  'crystal-sound-bath': 'Crystal Sound Bath',
  'somatic-sound-bath': 'Somatic Movement & Crystal Sound Bath',
  yoga: 'Yoga',
  stretch: 'Assisted Stretch',
  'stretch-mobility': 'Stretch & Mobility',
  reiki: 'Reiki',
  'dance-cardio': 'Dance Cardio',
  'strength-sculpt': 'Strength & Sculpt',
};

export function invoiceServiceName(service) {
  const type = String(service?.serviceType || '').trim();
  if (type === 'massage') {
    if (service.massageType === 'chair') return 'Chair Massage';
    if (service.massageType === 'table') return 'Table Massage';
  }
  if (type === 'nails' && service.nailsType === 'nails-hand-massage') return SERVICE_NAMES['nails-hand-massage'];
  if (SERVICE_NAMES[type]) return SERVICE_NAMES[type];
  if (!type) return 'Wellness';
  return type
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * "Atmosphere TV December 17th Manicure Event". The date is left out while it
 * is TBD. With more than one location the location goes on the end, so two
 * offices on one day still read as two lines.
 */
export function invoiceLineDescription({ companyName, date, service, location, withLocation }) {
  const parts = [String(companyName || '').trim(), monthDayOrdinal(date), `${invoiceServiceName(service)} Event`];
  let text = parts.filter(Boolean).join(' ');
  if (withLocation && location) text += ` at ${location}`;
  return text;
}

/**
 * Line items (amounts in dollars) for an invoice built from a proposal:
 * one per service, then the holiday combine-and-save credit, custom lines and
 * gratuity. pricingOptions/selectedOptions are the proposal's legacy
 * per-service option columns.
 */
export function buildInvoiceLineItems(data, pricingOptions, selectedOptions) {
  const items = [];
  if (!data) return items;
  const services = data.services || {};
  const locations = Object.keys(services).filter((l) => services[l] && !Array.isArray(services[l]));
  const withLocation = locations.length > 1;

  for (const location of locations) {
    for (const [date, day] of Object.entries(services[location])) {
      (day?.services || []).forEach((service, serviceIndex) => {
        let amount = Number(service.serviceCost) || 0;
        if (pricingOptions && selectedOptions) {
          const key = `${location}-${date}-${serviceIndex}`;
          const options = pricingOptions[key];
          const picked = selectedOptions[key];
          if (options && picked !== undefined && options[picked] && options[picked].serviceCost != null) {
            amount = options[picked].serviceCost;
          }
        }
        items.push({
          description: invoiceLineDescription({
            companyName: data.clientName,
            date: parseIsoDate(date) ? date : service.date,
            service,
            location,
            withLocation,
          }),
          amount,
        });
      });
    }
  }

  // Holiday package combine-and-save: the services above are at full price
  // and the saving goes on as a credit.
  const holidaySavings = Number(data.summary?.holidayDiscountAmount) || 0;
  if (holidaySavings > 0) {
    items.push({
      description: `${data.holidayPackage?.name || 'Holiday package'}: combine and save (${data.summary?.holidayDiscountPercent || 10}%)`,
      amount: -holidaySavings,
    });
  }

  if (Array.isArray(data.customLineItems)) {
    for (const item of data.customLineItems) {
      if (item && item.amount) {
        items.push({ description: item.name || item.description || 'Custom item', amount: item.amount });
      }
    }
  }

  if (data.gratuityType && data.summary) {
    let gratuity = 0;
    if (data.gratuityType === 'percentage' && data.gratuityValue) {
      gratuity = (data.summary.subtotalBeforeGratuity || data.summary.totalEventCost || 0) * (data.gratuityValue / 100);
    } else if (data.gratuityType === 'dollar' && data.gratuityValue) {
      gratuity = data.gratuityValue;
    }
    if (gratuity > 0) {
      items.push({
        description: `Gratuity (${data.gratuityType === 'percentage' ? `${data.gratuityValue}%` : 'flat'})`,
        amount: gratuity,
      });
    }
  }

  return items;
}

// ------------------------------------------------------------- recipient ----

const EMAIL = /[A-Z0-9._%+'-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE = /\+?\(?\d[\d\s().-]{5,}\d/g;
const PERSON = /^[A-Za-z][A-Za-z.'’-]*(\s+[A-Za-z][A-Za-z.'’-]*){1,3}$/;
const NOT_A_PERSON = /\b(team|inc|llc|llp|ltd|corp|corporation|company|companies|group|department|dept|accounts?|payable|billing|finance|benefits|hr|office|international|partners|services|tbc|tbd|n\/a)\b/i;

/**
 * The person and email in a free-text contact answer from the survey, e.g.
 * "Eric Schwartz\nAtmosphere TV\neric.schwartz@atmosphere.tv" or
 * "Lauren Cohen lauren.cohen@smartly.io". Only the first line or comma part
 * is read as a name, and only when it looks like one (two to four words, no
 * company words), since the rest is usually an address.
 */
export function personFromContactText(text, companyName) {
  const raw = String(text || '');
  const email = (raw.match(EMAIL) || [])[0] || '';
  const first = raw.split(/[\n,;]+/).map((s) => s.trim()).find(Boolean) || '';
  const company = String(companyName || '').trim().toLowerCase();
  // "Forter - Vincent Tortora": either side of a spaced dash can be the name.
  for (const piece of first.split(/\s[-–—]\s/)) {
    let candidate = piece.replace(EMAIL, ' ').replace(PHONE, ' ');
    if (candidate.includes(':')) {
      const [before, ...rest] = candidate.split(':');
      const after = rest.join(':').trim();
      candidate = /[A-Za-z]/.test(after) ? after : before;
    }
    candidate = candidate.replace(/[\s:–—-]+$/, '').replace(/\s+/g, ' ').trim();
    if (PERSON.test(candidate) && !NOT_A_PERSON.test(candidate) && candidate.toLowerCase() !== company) {
      return { name: candidate, email };
    }
  }
  return { name: '', email };
}

/** An email address, or '' (client_email holds the string "NULL" on some rows). */
function validEmail(value) {
  const match = String(value || '').match(EMAIL);
  return match ? match[0] : '';
}

/**
 * Who a proposal's invoice goes to. Name: the survey's billing contact, then
 * the proposal's contact (customization.contactFirstName/LastName), then the
 * company. Email: the billing contact's, then the proposal's client_email,
 * then the survey's point of contact.
 */
export function invoiceRecipient({ companyName, customization, clientEmail, billingContact, pointOfContact }) {
  const billing = personFromContactText(billingContact, companyName);
  const contactName = [customization?.contactFirstName, customization?.contactLastName]
    .map((s) => String(s || '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ');
  const company = String(companyName || '').trim();
  const name = billing.name || contactName || company;
  const proposalEmail = validEmail(clientEmail);
  const email = billing.email || proposalEmail || personFromContactText(pointOfContact, companyName).email;
  return {
    name,
    email,
    nameFrom: billing.name ? 'billing-contact' : contactName ? 'proposal-contact' : company ? 'company' : null,
    emailFrom: billing.email ? 'billing-contact' : proposalEmail ? 'proposal' : email ? 'point-of-contact' : null,
  };
}
