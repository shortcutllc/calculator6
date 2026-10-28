/**
 * Holiday packages: the 2026 offer on www.getshortcut.co/holiday, as
 * proposals. One module for every way a proposal gets made: the staff
 * calculator and the client viewer import it (holiday-packages.d.ts gives
 * them types), and so do Pro, the MCP connector and the HTTP API.
 *
 * SOURCE: the shortcut repo, frontend/data/holiday-data.js (PACKS, build(),
 * APPT_RATE, HEADSHOT_RATE, GROUP_PRICES, COMBINE_PCT, COMBINED_SERVICES,
 * FREE_CLASS_VALUE). A proposal must quote what the page quoted, so the
 * package contents and the math are transcribed from there, and
 * scripts/check-holiday-parity.mjs prices every package with both files
 * and fails on any difference. Change the page first, then this file.
 *
 * THE MATH (the page's build()). Every visit is 4 hours. An appointment
 * service gets max(1, ceil(people / ((60 / minutes) x 4))) Pros at $150 a Pro
 * hour. Headshots are $450 a photographer hour plus $25 per PERSON (not per
 * bookable slot, which is how other proposals bill retouching). A group class
 * is one flat price. Two or more services in one visit save 10% of the visit,
 * rounded to the dollar; hair + makeup is one line that counts as two.
 *
 * THE OFFER on every holiday booking: the 10%, a free 30 minute group mind or
 * body class worth $1,250 to use by March 2027, and a special holiday treat.
 * A proposal stores a snapshot of it (holidayPackageRecord), so next year's
 * offer never rewrites this year's proposals.
 *
 * The basic headshot tier stays $400 for every other proposal (Will,
 * 2026-10-28); only holiday packages use the page's $450.
 */

export const HOLIDAY_SEASON = '2026';
export const VISIT_HOURS = 4;
export const APPT_RATE = 150;
export const HEADSHOT_RATE = 450;
export const HEADSHOT_RETOUCH = 25;
export const COMBINE_PCT = 10;
export const FREE_CLASS = { minutes: 30, value: 1250, useBy: 'March 2027' };

/* What a Pro is paid, for the internal margin figures only. The same numbers
   as SERVICE_DEFAULTS in pricing-engine.js for a $150 appointment service. */
const PRO_HOURLY = 50;
const EARLY_ARRIVAL = 25;

/**
 * Proposal service types that count as two services for combine-and-save
 * (the page's COMBINED_SERVICES, keyed by proposal serviceType).
 */
export const COMBINED_SERVICE_TYPES = { 'hair-makeup': 2 };

/** How many services a set of proposal service types counts as. */
export function comboCount(serviceTypes) {
  return (serviceTypes || []).reduce((n, t) => n + (COMBINED_SERVICE_TYPES[t] || 1), 0);
}

/* Appointment services: the page's line key -> the proposal service. */
const APPOINTMENT = {
  massage: { serviceType: 'massage', massageType: 'chair' },
  'hair-makeup': { serviceType: 'hair-makeup' },
  hair: { serviceType: 'hair' },
  nails: { serviceType: 'nails', nailsType: 'nails' },
  facials: { serviceType: 'facial' },
  headshots: { serviceType: 'headshot' },
  touchup: { serviceType: 'headshot-hair-makeup' },
  'assisted-stretch': { serviceType: 'stretch' },
};

/* Group classes, by length: the page's GROUP_PRICES, as the proposal
   catalogs store them (mindfulnessCatalog, movementCatalog, yogaCatalog). */
const GROUP = {
  meditation: {
    serviceType: 'mindfulness',
    30: { mindfulnessType: 'drop-in', mindfulnessServiceId: 'drop-in', fixedPrice: 1250 },
    60: { mindfulnessType: 'mindful-movement', mindfulnessServiceId: 'mindful-movement', fixedPrice: 1500 },
  },
  'sound-bath': {
    serviceType: 'crystal-sound-bath',
    30: { movementServiceId: 'crystal-sound-bath-30', fixedPrice: 1250 },
    60: { movementServiceId: 'crystal-sound-bath-60', fixedPrice: 1500 },
  },
  'somatic-movement': {
    serviceType: 'somatic-sound-bath',
    30: { movementServiceId: 'somatic-sound-bath-30', fixedPrice: 1500 },
    60: { movementServiceId: 'somatic-sound-bath-60', fixedPrice: 1750 },
  },
  'dance-cardio': {
    serviceType: 'dance-cardio',
    30: { movementServiceId: 'dance-cardio-30', fixedPrice: 1000 },
    60: { movementServiceId: 'dance-cardio-60', fixedPrice: 1250 },
  },
  'strength-sculpt': {
    serviceType: 'strength-sculpt',
    30: { movementServiceId: 'strength-sculpt-30', fixedPrice: 1000 },
    60: { movementServiceId: 'strength-sculpt-60', fixedPrice: 1250 },
  },
  yoga: {
    serviceType: 'yoga',
    30: { yogaServiceId: 'chair-yoga-30', fixedPrice: 650 },
    60: { yogaServiceId: 'restorative-60', fixedPrice: 1250 },
  },
};
GROUP.mindfulness = GROUP.meditation;

/**
 * The packages, in the page's order. A line is { key, label, minutes,
 * group? }: `key` is the page's builder key, `minutes` the appointment
 * length (group classes default to 30 and can be 60).
 */
export const HOLIDAY_PACKAGES = [
  {
    id: 'sleigh', name: 'Sleigh the Stress', inside: 'Massage + Meditation',
    lines: [
      { key: 'massage', label: 'Chair massage', minutes: 20 },
      { key: 'meditation', label: 'Group meditation', minutes: 30, group: true },
    ],
  },
  {
    id: 'grinch', name: 'Resting Grinch Face', inside: 'Hair + Makeup',
    lines: [{ key: 'hair-makeup', label: 'Hair + makeup', minutes: 30 }],
  },
  {
    id: 'styled', name: 'Tis the Season to Be Styled', inside: 'Hair + Manicures',
    lines: [
      { key: 'hair', label: 'Hair', minutes: 30 },
      { key: 'nails', label: 'Manicures', minutes: 30 },
    ],
  },
  {
    id: 'bright', name: 'Merry and Bright', inside: 'Headshots + Hair & Makeup',
    lines: [
      { key: 'headshots', label: 'Headshots', minutes: 10 },
      { key: 'touchup', label: 'Hair and makeup touch-up', minutes: 10 },
    ],
  },
  {
    id: 'custom', name: 'Create Your Own Holiday Magic', inside: 'Customize your Shortcut experience', custom: true,
    lines: [
      { key: 'massage', label: 'Massage', minutes: 20 },
      { key: 'hair', label: 'Hair', minutes: 30 },
      { key: 'nails', label: 'Nails', minutes: 30 },
      { key: 'facials', label: 'Facials', minutes: 20 },
      { key: 'headshots', label: 'Headshots', minutes: 10 },
      { key: 'assisted-stretch', label: 'Assisted stretch', minutes: 20 },
      { key: 'mindfulness', label: 'Mindfulness', minutes: 30, group: true },
      { key: 'sound-bath', label: 'Sound bath', minutes: 30, group: true },
      { key: 'yoga', label: 'Yoga', minutes: 30, group: true },
      { key: 'strength-sculpt', label: 'Strength & sculpt', minutes: 30, group: true },
      { key: 'dance-cardio', label: 'Dance cardio', minutes: 30, group: true },
      { key: 'somatic-movement', label: 'Somatic movement', minutes: 30, group: true },
    ],
  },
];

export class HolidayPackageError extends Error {}

const norm = (s) => String(s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '');

/** A package by id ("sleigh") or name ("Sleigh the Stress"), or null. */
export function getHolidayPackage(ref) {
  const n = norm(ref);
  if (!n) return null;
  return HOLIDAY_PACKAGES.find((p) => p.id === n || norm(p.name) === n)
    || HOLIDAY_PACKAGES.find((p) => norm(p.name).startsWith(n) || (n.length > 4 && norm(p.name).includes(n)))
    || (/^(createyourown|buildyourown|custom)/.test(n) ? HOLIDAY_PACKAGES.find((p) => p.custom) : null);
}

/* Plain names an AI or a teammate might use for a build-your-own service. */
const ALIASES = {
  chairmassage: 'massage', massages: 'massage',
  manicure: 'nails', manicures: 'nails', nail: 'nails',
  facial: 'facials',
  headshot: 'headshots', photos: 'headshots',
  stretch: 'assisted-stretch', assistedstretch: 'assisted-stretch', stretching: 'assisted-stretch',
  meditation: 'mindfulness', groupmeditation: 'mindfulness',
  soundbath: 'sound-bath', crystalsoundbath: 'sound-bath',
  chairyoga: 'yoga',
  strengthandsculpt: 'strength-sculpt', strengthsculpt: 'strength-sculpt', strength: 'strength-sculpt',
  dancecardio: 'dance-cardio', dance: 'dance-cardio',
  somaticmovement: 'somatic-movement', somatic: 'somatic-movement',
  haircut: 'hair', hairstyling: 'hair', blowouts: 'hair',
};

function customLine(pkg, ref) {
  const n = norm(ref);
  const key = pkg.lines.find((l) => norm(l.key) === n || norm(l.label) === n)?.key || ALIASES[n];
  return pkg.lines.find((l) => l.key === key) || null;
}

/** Pros for one appointment service: the page's build() formula. */
export function prosFor(headcount, minutes) {
  return Math.max(1, Math.ceil(headcount / ((60 / minutes) * VISIT_HOURS)));
}

function classMinutesFor(line, classMinutes) {
  const m = classMinutes && typeof classMinutes === 'object' ? classMinutes[line.key] : classMinutes;
  return Number(m) === 60 ? 60 : 30;
}

/**
 * The lines a package is made of for this booking: the ready-made set, or
 * the chosen services of Create Your Own. Throws HolidayPackageError with a
 * sentence an AI can act on.
 */
function linesFor(pkg, services) {
  if (!pkg.custom) return pkg.lines;
  const list = Array.isArray(services) ? services : services ? [services] : [];
  if (!list.length) {
    throw new HolidayPackageError(`Create Your Own needs at least one service. Choose from: ${pkg.lines.map((l) => l.label).join(', ')}.`);
  }
  const lines = [];
  for (const ref of list) {
    const line = customLine(pkg, ref);
    if (!line) throw new HolidayPackageError(`"${ref}" is not a holiday service. Choose from: ${pkg.lines.map((l) => l.label).join(', ')}.`);
    if (!lines.includes(line)) lines.push(line);
  }
  return lines;
}

function resolve({ packageId, headcount, services }) {
  const pkg = getHolidayPackage(packageId);
  if (!pkg) {
    throw new HolidayPackageError(`No holiday package called "${packageId}". The packages are: ${HOLIDAY_PACKAGES.map((p) => p.name).join(', ')}.`);
  }
  const g = Math.round(Number(headcount));
  if (!Number.isFinite(g) || g < 1) {
    throw new HolidayPackageError('headcount is required: how many people the visit is for.');
  }
  return { pkg, g, lines: linesFor(pkg, services) };
}

/**
 * The price of a package for a headcount, exactly as the page shows it.
 * { package, headcount, hours, lines: [{ key, name, pros, cost }], subtotal,
 *   savings, total, combinePercent, freeClass, treat }
 */
export function quoteHolidayPackage({ packageId, headcount, services, classMinutes } = {}) {
  const { pkg, g, lines } = resolve({ packageId, headcount, services });
  const priced = lines.map((l) => {
    if (l.group) {
      const len = classMinutesFor(l, classMinutes);
      return { key: l.key, name: `${l.label} (${len} min)`, pros: 0, minutes: len, cost: GROUP[l.key][len].fixedPrice };
    }
    const pros = prosFor(g, l.minutes);
    const cost = l.key === 'headshots'
      ? pros * VISIT_HOURS * HEADSHOT_RATE + g * HEADSHOT_RETOUCH
      : pros * VISIT_HOURS * APPT_RATE;
    return { key: l.key, name: l.label, pros, minutes: l.minutes, cost };
  });
  const subtotal = priced.reduce((a, l) => a + l.cost, 0);
  const types = lines.map((l) => (l.group ? GROUP[l.key].serviceType : APPOINTMENT[l.key].serviceType));
  const savings = comboCount(types) > 1 ? Math.round(subtotal * (COMBINE_PCT / 100)) : 0;
  return {
    package: { id: pkg.id, name: pkg.name, inside: pkg.inside, custom: !!pkg.custom },
    headcount: g,
    hours: VISIT_HOURS,
    lines: priced,
    subtotal,
    savings,
    total: subtotal - savings,
    combinePercent: savings ? COMBINE_PCT : 0,
    freeClass: { ...FREE_CLASS },
    treat: true,
  };
}

/**
 * The proposal services for a package: complete service objects (every
 * field set, so no engine default can move the price), without location or
 * date. Each is one holiday visit, so the "Repeats" picker is hidden.
 */
export function holidayServices({ packageId, headcount, services, classMinutes } = {}) {
  const { g, lines } = resolve({ packageId, headcount, services });
  return lines.map((l) => {
    if (l.group) {
      const len = classMinutesFor(l, classMinutes);
      const g2 = GROUP[l.key];
      return {
        serviceType: g2.serviceType,
        ...g2[len],
        classLength: len,
        appTime: len,
        totalHours: len / 60,
        numPros: 1,
        proHourly: 0,
        hourlyRate: 0,
        earlyArrival: 0,
        retouchingCost: 0,
        participants: 'unlimited',
        hideRepeats: true,
      };
    }
    const base = {
      ...APPOINTMENT[l.key],
      appTime: l.minutes,
      totalHours: VISIT_HOURS,
      numPros: prosFor(g, l.minutes),
      hideRepeats: true,
    };
    if (l.key === 'headshots') {
      return { ...base, proHourly: HEADSHOT_RATE, hourlyRate: 0, earlyArrival: 0, retouchingCost: HEADSHOT_RETOUCH, retouchCount: g };
    }
    return { ...base, proHourly: PRO_HOURLY, hourlyRate: APPT_RATE, earlyArrival: EARLY_ARRIVAL, retouchingCost: 0 };
  });
}

/** What a proposal stores as `data.holidayPackage`: a snapshot of the offer. */
export function holidayPackageRecord({ packageId, headcount } = {}) {
  const pkg = getHolidayPackage(packageId);
  if (!pkg) return null;
  return {
    id: pkg.id,
    name: pkg.name,
    inside: pkg.inside,
    custom: !!pkg.custom,
    headcount: Math.round(Number(headcount)) || null,
    season: HOLIDAY_SEASON,
    combinePercent: COMBINE_PCT,
    freeClass: { ...FREE_CLASS },
    treat: true,
  };
}

/**
 * Whether combine-and-save applies to a proposal. A volume or conference
 * discount already baked into the service prices wins instead (never both;
 * it is 10% or more whenever it applies).
 */
export function holidayComboActive(data) {
  return !!(data && data.holidayPackage) && !(Number(data.autoRecurringSavings) > 0);
}

/**
 * Combine-and-save across visits: 10% of each visit (location + date) with
 * two or more services, rounded to the dollar like the page.
 * `visits`: [{ serviceTypes: string[], subtotal: number }]
 */
export function holidayComboSavings(visits, percent = COMBINE_PCT) {
  return (visits || []).reduce(
    (sum, v) => sum + (comboCount(v.serviceTypes) > 1 ? Math.round((Number(v.subtotal) || 0) * (percent / 100)) : 0),
    0
  );
}

/**
 * The Create Your Own choices behind a visit's existing services, so a
 * headcount change can re-staff them: { services: [line keys], classMinutes }.
 */
export function holidaySelectionFrom(services) {
  const byType = {};
  for (const [key, a] of Object.entries(APPOINTMENT)) if (key !== 'touchup' && key !== 'hair-makeup') byType[a.serviceType] = key;
  for (const [key, g] of Object.entries(GROUP)) if (key !== 'meditation') byType[g.serviceType] = key;
  const keys = [];
  const classMinutes = {};
  for (const s of services || []) {
    const key = byType[s.serviceType];
    if (!key || keys.includes(key)) continue;
    keys.push(key);
    if (GROUP[key]) classMinutes[key] = Number(s.classLength) === 60 ? 60 : 30;
  }
  return { services: keys, classMinutes };
}

/** The package names with what is inside, for prompts and errors. */
export function holidayPackageMenu() {
  return HOLIDAY_PACKAGES.map((p) => `${p.name} (${p.custom ? 'any of: ' + p.lines.map((l) => l.label).join(', ') : p.inside})`).join('; ');
}
