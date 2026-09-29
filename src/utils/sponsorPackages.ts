// ---------------------------------------------------------------------------
// Sponsor activation stations: what the sponsor template lists, pops out and
// prices, before there is a proposal to link to.
//
// ── WHERE THE COPY COMES FROM ─────────────────────────────────────────────
// The stations, their names, meta lines, card copy and tints are the
// website's own, verbatim from getshortcut.co/solutions/conferences
// (shortcut repo: frontend/data/conferences-data.js, CONF_STATIONS). The
// pop-out detail is the website's service menu record for the same service
// (frontend/data/menu-data.js, MENU()), which the site's ServiceModal shows.
// The Glow Lounge and the Movement Studio each cover several menu services,
// so their detail is assembled from those records' own lines.
// Change the website first, then copy here, so the two cannot drift.
//
// ── WHERE THE PRICES COME FROM ────────────────────────────────────────────
// Computed from the proposal engine's own rules (proposalGenerator.ts +
// SERVICE_DEFAULTS in Home.tsx) rather than typed in:
//
//   hourly stations   day price = numPros x hours x hourlyRate
//                     appointments = floor(hours x numPros x 60 / appMinutes)
//   headshots         day price = hours x proHourly + appointments x retouching
//   group sessions    fixed price per session (Home.tsx / soundBathCatalog /
//                     yogaCatalog; 30 minute formats, matching
//                     conferencePackages.ts)
//
// The hourly rate is NOT the engine default ($150). Sponsor activations run at
// $165/hr/Pro, which is what the AACSB lounge was repriced to on 2026-09-22.
// A page can override it in its config.
//
// Ladders follow the AACSB shape: the Pro count stays fixed and the level
// changes how long the station stays open (4, 5 or 6 hours). Group sessions
// step by sessions a day instead (1, 2 or 3).
// ---------------------------------------------------------------------------

export const SPONSOR_HOURLY_RATE = 165;

export type SponsorServiceId =
  | 'reset'
  | 'glow'
  | 'polish'
  | 'studio'
  | 'mindful'
  | 'sound'
  | 'movement';

type Pricing =
  | { type: 'hourly' }
  | { type: 'headshot'; proHourly: number; retouching: number }
  | { type: 'session'; perSession: number };

/** The pop-out: the website ServiceModal's fields. `[lead, rest]` pairs; an
 *  empty lead renders the rest on its own. */
export interface StationDetail {
  group: 'One-on-one appointments' | 'Group sessions';
  desc: string;
  bring: [string, string][];
  colKind: string;
  items: [string, string][];
  metaFooter: string;
  /** Real event photos of THIS service, shown before the card art. */
  photos: string[];
  /** proposal_gallery service_type keys; published photos lead the carousel. */
  galleryKeys: string[];
}

export interface SponsorServiceDef {
  id: SponsorServiceId;
  /** Station name, as the website has it. */
  name: string;
  /** The service as it reads mid-sentence: "chair massage", "headshots". */
  lower: string;
  image: string;
  /** PNG art with a baked white margin needs the 1.1 crop. */
  cropArt: boolean;
  tint: string;
  meta: string;
  body: string;
  /** Hero booking-chip text, e.g. "Chair massage · 15 min". */
  chip: string;
  /** What one Pro is called: ["Massage Pro", "Massage Pros"]. */
  proNoun: [string, string];
  numPros: number;
  /** Appointment length the ladder counts with. Where the station runs a
   *  range, the longer end, so the page never promises more appointments
   *  than the day holds. */
  appMinutes: number;
  pricing: Pricing;
  detail: StationDetail;
}

const S = '/conference/services';
const G = '/conference/onepager';

export const SPONSOR_SERVICES: SponsorServiceDef[] = [
  {
    id: 'reset', name: 'The Reset Zone', lower: 'the Reset Zone',
    image: `${S}/massage.png`, cropArt: true, tint: '#9EFAFF',
    meta: 'Chair massage · 15 to 20 min',
    body: 'We turn any space into a spa for the day. Chairs, screens, scents and setup, all ours.',
    chip: 'Chair massage · 15 min',
    proNoun: ['Massage Pro', 'Massage Pros'],
    numPros: 4, appMinutes: 15, pricing: { type: 'hourly' },
    detail: {
      group: 'One-on-one appointments',
      desc: 'Rejuvenating chair massage right where your attendees already are. Our expert therapists create a spa-like ambiance with soothing scents, customized lighting and relaxing sounds.',
      bring: [['Chair setups', 'with optional privacy screens'], ['Spa ambiance', 'music, aromatherapy and lighting'], ['Therapist preference', 'people pick therapist gender']],
      colKind: 'Service menu',
      items: [['Chair massage', 'neck, shoulders, back and arms'], ['Sports', 'deep-tissue muscle recovery'], ['Compression', 'rhythmic pressure for circulation'], ['Reiki reset', 'grounding energy work']],
      metaFooter: 'Chair massage · 15 to 20 minute resets',
      photos: [`${G}/svc/candid-massage.jpeg`, `${G}/gallery/massage-event.jpg`],
      galleryKeys: ['massage'],
    },
  },
  {
    id: 'glow', name: 'The Glow Lounge', lower: 'the Glow Lounge',
    image: `${S}/hair-v2.png`, cropArt: true, tint: '#F7BBFF',
    meta: 'Hair, makeup or facials · 20 to 30 min',
    body: 'Blowouts, makeup or express facials before the keynote, the photo or the reception.',
    chip: 'Blowout · 30 min',
    proNoun: ['Pro', 'Pros'],
    numPros: 2, appMinutes: 30, pricing: { type: 'hourly' },
    detail: {
      group: 'One-on-one appointments',
      desc: 'Precision cuts, professional styling and grooming essentials, delivered on site. Professional facial treatments that provide deep cleansing, hydration and relaxation. People walk out refreshed and rejuvenated.',
      bring: [['Inclusive styling', 'all hair types and textures'], ['Licensed estheticians', 'insured for any building'], ['Premium products', 'brand-name, professional-grade']],
      colKind: 'Service menu',
      items: [['Blowout', 'hot-tool styling and touch-ups'], ['Salon cut and style', 'all hair types and textures'], ['Barber cut', 'quick cleanups included'], ['Express facial', 'quick cleanse and hydration'], ['Mask treatments', 'hydrating and detoxifying']],
      metaFooter: 'Hair, makeup or facials · 20 to 30 minute appointments',
      photos: [`${G}/svc/makeup-office.jpg`, '/conference/tradestation/ts-hair-1.jpg'],
      galleryKeys: ['hair', 'facial', 'facials'],
    },
  },
  {
    id: 'polish', name: 'The Polish Bar', lower: 'the Polish Bar',
    image: `${S}/nails.png`, cropArt: true, tint: '#FEDC64',
    meta: 'Express manicures · 20 to 30 min',
    body: 'Express manicures without the salon trip. Dry service: no plumbing, no fumes, nothing for the venue to clean up.',
    chip: 'Manicure · 30 min',
    proNoun: ['Nail Pro', 'Nail Pros'],
    numPros: 2, appMinutes: 30, pricing: { type: 'hourly' },
    detail: {
      group: 'One-on-one appointments',
      desc: 'Manicures and pedicures that blend relaxation with elegance. Licensed technicians, single-use kits for every appointment and sanitized metal tools between clients.',
      bring: [['Licensed technicians', 'insured for any building'], ['Hygiene first', 'single-use kits, sanitized tools'], ['20+ polish colors', 'classic, trendy and seasonal']],
      colKind: 'Service menu',
      items: [['Classic manicure', 'shape, buff, cuticle care and polish'], ['Gel manicure', 'long-lasting gel polish'], ['Dry pedicure', 'waterless, office-friendly'], ['Hand treatment', 'moisturizer and hand massage']],
      metaFooter: 'Mani and pedi · 20 to 30 minute appointments',
      photos: [],
      galleryKeys: ['nails'],
    },
  },
  {
    id: 'studio', name: 'The Studio', lower: 'the Studio',
    image: `${S}/headshot.png`, cropArt: true, tint: '#9EFAFF',
    meta: 'Headshots · 8 to 12 min',
    body: 'A top notch photography team on site. Every attendee gets a personal gallery and expert retouching, and our tech makes final photo delivery a cinch.',
    chip: 'Headshot · 8 min',
    proNoun: ['Photographer', 'Photographers'],
    numPros: 1, appMinutes: 8, pricing: { type: 'headshot', proHourly: 400, retouching: 25 },
    detail: {
      group: 'One-on-one appointments',
      desc: 'A consistent, professional look across the whole team. Experienced corporate photographers with expert posing guidance, optional hair and makeup touch-ups, and professionally retouched photos delivered within 5 to 7 business days.',
      bring: [['Outfit guidance', 'pre-session consultation'], ['Backdrop options', 'multiple looks to choose from'], ['Pro retouching', 'included with every photo']],
      colKind: 'Formats',
      items: [['', '8 to 12 minute sessions'], ['', 'Optional 10 to 15 minute hair and makeup touch-ups'], ['', 'Delivered in 5 to 7 business days']],
      metaFooter: '8 to 12 minute sessions · retouching included',
      photos: [],
      galleryKeys: ['headshot', 'headshots'],
    },
  },
  {
    id: 'mindful', name: 'The Mindful Reset', lower: 'the Mindful Reset',
    image: `${S}/mindfulness.png`, cropArt: true, tint: '#C7CBFB',
    meta: 'Facilitated sessions · 30 to 60 min',
    body: 'Guided meditation threaded into the agenda where the day needs a breath. Ten people or a full ballroom, no cap.',
    chip: 'Mindfulness · 30 min',
    proNoun: ['Facilitator', 'Facilitators'],
    numPros: 1, appMinutes: 30, pricing: { type: 'session', perSession: 1250 },
    detail: {
      group: 'Group sessions',
      desc: 'Guided meditations and practical tools to reduce stress and sharpen focus, led by Courtney Schulnick. An attorney with two decades of experience and extensive training from the Myrna Brind Center for Mindfulness.',
      bring: [['Dedicated facilitator', 'the same expert every session'], ['Custom audio recordings', 'guided meditations to keep'], ['Handouts and exercises', 'tools for daily practice']],
      colKind: 'Formats',
      items: [['', '30-min drop-ins and themed sessions'], ['', '40 or 60-min intro courses'], ['', 'In a conference room or on Zoom']],
      metaFooter: 'Guided sessions · in person or virtual',
      photos: [],
      galleryKeys: ['mindfulness'],
    },
  },
  {
    id: 'sound', name: 'The Sound Sanctuary', lower: 'the Sound Sanctuary',
    image: `${G}/svc/crystal-sound-bath-rooftop.webp`, cropArt: false, tint: '#C7CBFB',
    meta: 'Crystal sound baths · 30 to 60 min',
    body: 'Crystal singing bowls, eyes closed, screens off. The quietest thirty minutes on the agenda.',
    chip: 'Sound bath · 30 min',
    proNoun: ['Practitioner', 'Practitioners'],
    numPros: 1, appMinutes: 30, pricing: { type: 'session', perSession: 1250 },
    detail: {
      group: 'Group sessions',
      desc: 'A group sound bath built around crystal singing bowls, led live by a facilitator with 200+ hours of sound-healing training. A nervous-system reset, not theater.',
      bring: [['Trained facilitator', '200+ hours of sound-healing training'], ['Full instrument kit', 'bowls, gong, chimes, setup and breakdown'], ['RSVP blurb', 'drop-in copy to drive sign-ups']],
      colKind: 'Formats',
      items: [['', '30 or 60-minute sessions'], ['', 'In-person, virtual or hybrid'], ['', 'Sit or lie down. No experience needed']],
      metaFooter: 'Group session · 30 or 60 min',
      photos: [`${S}/crystal-sound-bath.png`],
      galleryKeys: ['sound-bath', 'crystal-sound-bath'],
    },
  },
  {
    id: 'movement', name: 'The Movement Studio', lower: 'the Movement Studio',
    image: `${S}/yoga.png`, cropArt: true, tint: '#A9F0CC',
    meta: 'Group classes · 30 to 60 min',
    body: 'Yoga, dance cardio, strength or mobility. Ballroom, lawn or breakout room; mats, music and setup included.',
    chip: 'Chair yoga · 30 min',
    proNoun: ['Instructor', 'Instructors'],
    numPros: 1, appMinutes: 30, pricing: { type: 'session', perSession: 650 },
    detail: {
      group: 'Group sessions',
      desc: 'Live yoga classes led by RYT-200+ certified instructors. Chair classes run in any conference room with zero equipment. An upbeat, music-driven cardio class that reads more like a good playlist than a workout.',
      bring: [['Certified instructor', 'modifications for every level'], ['Tailored playlist', 'matched to the room'], ['Early arrival', 'set up 15 minutes before start']],
      colKind: 'Classes',
      items: [['Chair yoga', 'no mats, no changing'], ['Vinyasa or restorative and yin', '60 min'], ['Dance cardio', 'comfortable clothes, no experience'], ['Strength and sculpt', 'bodyweight, dumbbells or bands']],
      metaFooter: 'Group class · 30 or 60 min',
      photos: [`${G}/gallery/dance-cardio-gallery.jpg`, `${G}/gallery/movement-gallery.jpg`],
      galleryKeys: ['yoga', 'dance-cardio', 'strength-sculpt'],
    },
  },
];

export const serviceById = (id: SponsorServiceId): SponsorServiceDef => {
  const s = SPONSOR_SERVICES.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown sponsor station: ${id}`);
  return s;
};

export const isSession = (s: SponsorServiceDef) => s.pricing.type === 'session';

export const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
export const numberWord = (n: number) => WORDS[n] ?? String(n);
export const capWord = (n: number) => {
  const w = numberWord(n);
  return w.charAt(0).toUpperCase() + w.slice(1);
};

export interface LadderLevel {
  name: string;
  /** Appointments (or sessions) a day. */
  perDay: number;
  /** "4 hours", or the session length for group sessions. */
  hoursLabel: string;
  dayPrice: number;
  total: number;
  /** Across every conference day. */
  totalCount: number;
  recommended?: boolean;
}

const HOUR_LEVELS = [4, 5, 6];
const SESSION_LEVELS = [1, 2, 3];

/** Three levels for one station across `days` conference days. */
export function buildLadder(
  s: SponsorServiceDef,
  days: number,
  hourlyRate = SPONSOR_HOURLY_RATE,
  numPros = s.numPros,
): LadderLevel[] {
  const p = s.pricing;
  if (p.type === 'session') {
    return SESSION_LEVELS.map((n, i) => ({
      name: `Option ${i + 1}`,
      perDay: n,
      hoursLabel: `${s.appMinutes} minutes`,
      dayPrice: n * p.perSession,
      total: n * p.perSession * days,
      totalCount: n * days,
      recommended: i === 1,
    }));
  }
  return HOUR_LEVELS.map((h, i) => {
    const perDay = Math.floor(h * numPros * (60 / s.appMinutes));
    const dayPrice = p.type === 'headshot'
      ? h * numPros * p.proHourly + perDay * p.retouching
      : numPros * h * hourlyRate;
    return {
      name: `Option ${i + 1}`,
      perDay,
      hoursLabel: `${h} hours`,
      dayPrice,
      total: dayPrice * days,
      totalCount: perDay * days,
      recommended: i === 1,
    };
  });
}
