// ---------------------------------------------------------------------------
// Service Menu page data (design_handoff_service_menu).
//
// The handoff's own instruction: "Source the copy from the production proposal
// app rather than duplicating it, so the two surfaces can't drift." That is the
// long-term goal, but SERVICE_DESC in src/components/proposal/data.ts is written
// for a booked client ("your team", office framing) while this page addresses a
// prospect browsing the catalogue. So this module holds the menu-facing copy and
// stays deliberately close to the proposal wording; when a service changes,
// update both (see docs/SERVICES.md for the source-of-truth list).
//
// Assets are reused from public/conference/* — the two pages ship the same
// service art and event photography, so nothing is duplicated on disk.
// ---------------------------------------------------------------------------

const A = '/conference';

export type MenuColumnKind = 'Service menu' | 'Formats';

export interface MenuService {
  id: string;
  name: string;
  /** Caption line under the card name. */
  meta: string;
  /** Card art. Stylized PNGs carry a baked white margin — the card crops it. */
  image: string;
  /** Whether the PNG needs the 1.1 crop to hide its baked margin. */
  cropArt?: boolean;
  /** object-position for photographic (non-PNG) card art. */
  imagePos?: string;
  /** Group sessions run in person, over Zoom or hybrid. */
  remote: boolean;
  desc: string;
  bring: { lead: string; rest: string }[];
  columnKind: MenuColumnKind;
  /** Right modal column: service menu items (lead + rest) or plain formats. */
  items: { lead?: string; rest: string }[];
  metaFooter: string;
  /**
   * Real event photos that genuinely depict THIS service, shown in the modal
   * after any published gallery images. Never borrow another service's photo.
   */
  photos?: string[];
}

export const MENU_SERVICES: MenuService[] = [
  {
    id: 'massage',
    name: 'Massage',
    meta: 'Chair & table · 15–20 min',
    image: `${A}/services/massage.png`,
    cropArt: true,
    remote: false,
    desc:
      'Rejuvenating chair or table massage right where your team already is. Our expert therapists create a spa-like ambiance with soothing scents, customized lighting and relaxing sounds. And rotate through the team on 15–20-minute appointments, about three an hour per therapist.',
    bring: [
      { lead: 'Chair or table setups', rest: 'with optional privacy screens' },
      { lead: 'Spa ambiance', rest: 'music, aromatherapy & lighting' },
      { lead: 'Therapist preference', rest: 'people pick therapist gender' },
    ],
    columnKind: 'Service menu',
    items: [
      { lead: 'Chair massage', rest: 'neck, shoulders, back & arms' },
      { lead: 'Table massage', rest: 'deeper full-body work with oils' },
      { lead: 'Sports', rest: 'deep-tissue muscle recovery' },
      { lead: 'Compression', rest: 'rhythmic pressure for circulation' },
      { lead: 'Reiki reset', rest: 'grounding energy work' },
    ],
    metaFooter: 'Chair & table · 15–20-min resets',
    photos: [`${A}/onepager/svc/candid-massage.jpeg`, `${A}/onepager/gallery/massage-event.jpg`],
  },
  {
    id: 'hair',
    name: 'Hair',
    meta: 'Cuts & styling · 20–30 min',
    image: `${A}/services/hair-v3.png`,
    cropArt: true,
    remote: false,
    desc:
      'Precision cuts, professional styling and grooming essentials, delivered on site. Stylists experienced with all hair types and textures, brand-name products, and full sanitation between appointments. Space left pristine.',
    bring: [
      { lead: 'Inclusive styling', rest: 'all hair types & textures' },
      { lead: 'Premium products', rest: 'brand-name, professional-grade' },
      { lead: 'Clean & pristine', rest: 'sanitation between every client' },
    ],
    columnKind: 'Service menu',
    items: [
      { lead: 'Barber cut', rest: 'quick cleanups included' },
      { lead: 'Beard trim', rest: 'shaping & grooming' },
      { lead: 'Salon cut & style', rest: 'all hair types & textures' },
      { lead: 'Blowout', rest: 'hot-tool styling & touch-ups' },
    ],
    metaFooter: 'Cuts & styling · 20–30-min appointments',
    photos: [
      `${A}/tradestation/ts-hair-1.jpg`,
      `${A}/tradestation/ts-hair-2.jpg`,
      `${A}/onepager/svc/makeup-office.jpg`,
    ],
  },
  {
    id: 'nails',
    name: 'Nails',
    meta: 'Mani & pedi · 20–30 min',
    image: `${A}/services/nails.png`,
    cropArt: true,
    remote: false,
    desc:
      'Manicures and pedicures that blend relaxation with elegance. Licensed technicians, single-use kits for every appointment and sanitized metal tools between clients. A pampered escape that leaves people refreshed and polished.',
    bring: [
      { lead: 'Licensed technicians', rest: 'insured for any building' },
      { lead: 'Hygiene first', rest: 'single-use kits, sanitized tools' },
      { lead: '20+ polish colors', rest: 'classic, trendy & seasonal' },
    ],
    columnKind: 'Service menu',
    items: [
      { lead: 'Classic manicure', rest: 'shape, buff, cuticle care & polish' },
      { lead: 'Gel manicure', rest: 'long-lasting gel polish' },
      { lead: 'Dry pedicure', rest: 'waterless, office-friendly' },
      { lead: 'Hand treatment', rest: 'moisturizer + hand massage' },
    ],
    metaFooter: 'Mani & pedi · 20–30-min appointments',
  },
  {
    id: 'facials',
    name: 'Facials',
    meta: 'Express · 20 min',
    image: `${A}/services/facial.png`,
    cropArt: true,
    remote: false,
    desc:
      'Professional facial treatments that provide deep cleansing, hydration and relaxation. People walk out refreshed and rejuvenated. Express 20-minute slots, all skin types welcome.',
    bring: [
      { lead: 'Licensed estheticians', rest: 'insured for any building' },
      { lead: 'Premium skincare', rest: 'professional-grade, hypoallergenic' },
      { lead: 'Spa atmosphere', rest: 'soothing music & aromatherapy' },
    ],
    columnKind: 'Service menu',
    items: [
      { lead: 'Express facial', rest: 'quick cleanse & hydration' },
      { lead: 'Signature facial', rest: 'full treatment with extractions' },
      { lead: 'LED light therapy', rest: 'results-boosting add-on' },
      { lead: 'Mask treatments', rest: 'hydrating & detoxifying' },
    ],
    metaFooter: 'Express facials · 20-min appointments',
  },
  {
    id: 'headshots',
    name: 'Headshots',
    meta: '8–12 min · retouching included',
    image: `${A}/services/headshot.png`,
    cropArt: true,
    remote: false,
    desc:
      'A consistent, professional look across the whole team. Experienced corporate photographers with expert posing guidance, optional hair and makeup touch-ups, and professionally retouched photos delivered within 5–7 business days.',
    bring: [
      { lead: 'Outfit guidance', rest: 'pre-session consultation' },
      { lead: 'Backdrop options', rest: 'multiple looks to choose from' },
      { lead: 'Pro retouching', rest: 'included with every photo' },
    ],
    columnKind: 'Formats',
    items: [
      { rest: '8–12-minute sessions' },
      { rest: 'Optional 10–15-min hair & makeup touch-ups' },
      { rest: 'Delivered in 5–7 business days' },
    ],
    metaFooter: '8–12-min sessions · retouching included',
  },
  {
    id: 'mindfulness',
    name: 'Mindfulness',
    meta: 'Guided sessions · 30–60 min',
    image: `${A}/services/mindfulness.png`,
    cropArt: true,
    remote: true,
    desc:
      'Guided meditations and practical tools to reduce stress and sharpen focus, led by Courtney Schulnick. An attorney with two decades of experience and extensive training from the Myrna Brind Center for Mindfulness. One dedicated facilitator across every session.',
    bring: [
      { lead: 'Dedicated facilitator', rest: 'the same expert every session' },
      { lead: 'Custom audio recordings', rest: 'guided meditations to keep' },
      { lead: 'Handouts & exercises', rest: 'tools for daily practice' },
    ],
    columnKind: 'Formats',
    items: [
      { rest: '30-min drop-ins & themed sessions' },
      { rest: '40 or 60-min intro courses' },
      { rest: 'In a conference room or on Zoom' },
    ],
    metaFooter: 'Guided sessions · in person or virtual',
  },
  {
    id: 'sound-bath',
    name: 'Sound bath',
    meta: 'Group session · 30 or 60 min',
    image: `${A}/onepager/svc/crystal-sound-bath-rooftop.webp`,
    imagePos: 'object-[center_42%]',
    remote: true,
    desc:
      'A group sound bath built around crystal singing bowls, led live by a facilitator with 200+ hours of sound-healing training. Your team settles in, eyes closed, and lets the tones do the work. A nervous-system reset, not theater.',
    bring: [
      { lead: 'Trained facilitator', rest: '200+ hours of sound-healing training' },
      { lead: 'Full instrument kit', rest: 'bowls, gong, chimes, setup & breakdown' },
      { lead: 'RSVP blurb', rest: 'drop-in copy to drive sign-ups' },
    ],
    columnKind: 'Formats',
    items: [
      { rest: '30 or 60-minute sessions' },
      { rest: 'In-person, virtual or hybrid' },
      { rest: 'Sit or lie down. No experience needed' },
    ],
    metaFooter: 'Group session · 30 or 60 min',
    photos: [`${A}/services/crystal-sound-bath.png`],
  },
  {
    id: 'yoga',
    name: 'Yoga',
    meta: 'Group class · chair or mat',
    image: `${A}/services/yoga.png`,
    cropArt: true,
    remote: true,
    desc:
      'Live yoga classes led by RYT-200+ certified instructors. The same teacher every time, so the team builds a rhythm. Chair classes run in any conference room with zero equipment; mat classes range from gentle flow to restorative.',
    bring: [
      { lead: 'Certified instructor', rest: 'modifications for every level' },
      { lead: 'Tailored playlist', rest: 'matched to the room' },
      { lead: 'Early arrival', rest: 'set up 15 minutes before start' },
    ],
    columnKind: 'Formats',
    items: [
      { rest: 'Chair yoga. No mats, no changing' },
      { rest: 'Vinyasa or restorative + yin (60 min)' },
      { rest: 'Virtual livestream for remote teams' },
    ],
    metaFooter: 'Group class · chair or mat',
  },
  {
    id: 'strength-sculpt',
    name: 'Strength & sculpt',
    meta: 'Group class · 30 or 60 min',
    image: `${A}/services/strength-sculpt.png`,
    cropArt: true,
    remote: true,
    desc:
      'A full-body strength class that meets every fitness level. Bodyweight, light dumbbells or bands build strength, posture and stability. Scaled up or down on the spot so nobody feels behind.',
    bring: [
      { lead: 'Trained instructor', rest: 'scales every move to the room' },
      { lead: 'Ready-to-go class', rest: 'equipment optional, not required' },
      { lead: 'RSVP blurb', rest: 'drop-in copy to drive sign-ups' },
    ],
    columnKind: 'Formats',
    items: [
      { rest: '30 or 60-minute classes' },
      { rest: 'In-person or live over video' },
      { rest: 'Bodyweight, dumbbells or bands' },
    ],
    metaFooter: 'Group class · 30 or 60 min',
  },
  {
    id: 'dance-cardio',
    name: 'Dance cardio',
    meta: 'Group class · 30 or 60 min',
    image: `${A}/services/dance-cardio.png`,
    cropArt: true,
    remote: true,
    desc:
      'An upbeat, music-driven cardio class that reads more like a good playlist than a workout. Led by a trained dancer who keeps every level moving. Simple moves anyone can follow, adaptable from full-out to low-impact.',
    bring: [
      { lead: 'Trained dancer-instructor', rest: 'fun, not intimidating' },
      { lead: 'Built-out playlist', rest: 'plus the full guided class' },
      { lead: 'RSVP blurb', rest: 'drop-in copy to drive sign-ups' },
    ],
    columnKind: 'Formats',
    items: [
      { rest: '30 or 60-minute classes' },
      { rest: 'In-person or live over video' },
      { rest: 'Comfortable clothes, no experience' },
    ],
    metaFooter: 'Group class · 30 or 60 min',
    photos: [`${A}/onepager/gallery/dance-cardio-gallery.jpg`],
  },
  {
    id: 'somatic-movement',
    name: 'Somatic movement',
    meta: 'Movement + bowls · 30 or 60 min',
    image: `${A}/services/somatic-movement.png`,
    cropArt: true,
    remote: true,
    desc:
      'Gentle somatic movement first, crystal sound bath second. One facilitator trained in both modalities. Slow, guided movement unwinds what the body has been holding, then the bowls carry it the rest of the way from wired to rested.',
    bring: [
      { lead: 'Dual-trained facilitator', rest: 'somatic movement + sound healing' },
      { lead: 'Movement + sound kit', rest: 'bowls, instruments, setup & breakdown' },
      { lead: 'RSVP blurb', rest: 'drop-in copy to drive sign-ups' },
    ],
    columnKind: 'Formats',
    items: [
      { rest: '30 or 60-minute sessions' },
      { rest: 'In-person or live over video' },
      { rest: 'Standing, seated or on the floor' },
    ],
    metaFooter: 'Movement + bowls · 30 or 60 min',
    photos: [`${A}/onepager/gallery/somatic-event.webp`, `${A}/onepager/gallery/movement-gallery.jpg`],
  },
  {
    id: 'assisted-stretch',
    name: 'Assisted stretch',
    meta: 'One-on-one · 10–20 min',
    image: `${A}/services/assisted-stretch.png`,
    cropArt: true,
    remote: false,
    // Attire caveat dropped (Will, 2026-07-28): a stretch appointment is
    // obviously clothed, so calling it out reads like a massage disclaimer.
    desc:
      'One-on-one assisted stretching with a certified specialist. Backgrounds in physical therapy, sports massage and PNF/FST. Targeted release for desk and travel tightness in the neck, shoulders, hips and lower back. Same sign-up model as a massage day.',
    bring: [
      { lead: 'Certified specialist', rest: 'PNF/FST-trained, not a generalist' },
      { lead: 'All equipment', rest: 'chair or table, straps, mats, sanitizer' },
      { lead: 'Sign-up kit', rest: 'sheet plus a pre-event Slack blurb' },
    ],
    columnKind: 'Formats',
    items: [
      { rest: 'Express chair. Any open corner' },
      { rest: 'Premium table. Deeper work, curtained space' },
      { rest: '10–20-minute rotating slots' },
    ],
    metaFooter: 'One-on-one · 10–20-min appointments',
    photos: [`${A}/onepager/svc/stretch-mobility.webp`],
  },
];

/** Sections group by billing format (the handoff's live "b" grouping). */
export const MENU_SECTIONS: { name: string; sub?: string; ids: string[] }[] = [
  {
    name: 'One-on-one appointments',
    ids: ['massage', 'assisted-stretch', 'hair', 'nails', 'facials', 'headshots'],
  },
  {
    // The first id is the section's hero (2-column card), so mindfulness leads
    // here and yoga sits in a standard cell (Will, 2026-07-30).
    name: 'Group sessions',
    ids: ['mindfulness', 'strength-sculpt', 'dance-cardio', 'somatic-movement', 'sound-bath', 'yoga'],
  },
];

export type MenuInfoTone = 'coral' | 'navy' | 'teal' | 'cyan' | 'sun' | 'pink';

export interface MenuInfoCard {
  tone: MenuInfoTone;
  kicker: string;
  headline: string;
  body: string;
}

// Cycled to fill grid gaps so each row ends flush.
// NOTE: the handoff's "92% of slots get booked" is not a real receipt. The
// confirmed figure is 90%+ of appointment slots booked across ALL events
// (memory/proof_points.md) — same correction already applied to the conference
// one-pager. Never restore the 92%.
export const MENU_INFO_CARDS: Record<string, MenuInfoCard[]> = {
  'One-on-one appointments': [
    {
      tone: 'navy',
      kicker: 'How it prices',
      headline: 'Per pro, per hour.',
      body: 'About three appointments an hour. Add pros to add capacity.',
    },
    {
      tone: 'coral',
      kicker: 'Turnout',
      headline: '90%+ of slots get booked.',
      body: 'Sign-ups close themselves. You never chase anyone down.',
    },
    {
      tone: 'cyan',
      kicker: 'Setup',
      headline: 'A room and an outlet.',
      body: 'We bring chairs, tables, linens, products and signage.',
    },
  ],
  'Group sessions': [
    {
      tone: 'sun',
      kicker: 'How it prices',
      headline: 'One flat price per session.',
      body: 'Unlimited attendance. Invite the whole floor.',
    },
    {
      tone: 'teal',
      kicker: 'Reach',
      headline: 'In person, virtual or both.',
      body: 'One vendor covers the building and the people at home.',
    },
    {
      tone: 'navy',
      kicker: 'Facilitators',
      headline: 'The same expert, every time.',
      body: 'Trained, insured, and briefed on your team.',
    },
  ],
};

/** Info-card tone → background + text classes. Body copy is always solid. */
export const MENU_TONES: Record<MenuInfoTone, string> = {
  coral: 'bg-[#FF5050] text-white',
  navy: 'bg-[#003756] text-white',
  teal: 'bg-[#018EA2] text-white',
  cyan: 'bg-[#9EFAFF] text-[#003756]',
  sun: 'bg-[#FEDC64] text-[#003756]',
  pink: 'bg-[#F7BBFF] text-[#003756]',
};

/** Wide-angle (≥1.5:1) event photos for the promo gallery card, per handoff. */
export const MENU_PROMO_PHOTOS = [
  `${A}/onepager/gallery/massage-event.jpg`,
  `${A}/onepager/gallery/somatic-event.webp`,
  `${A}/onepager/svc/crystal-sound-bath-rooftop.webp`,
  `${A}/onepager/svc/stretch-mobility.webp`,
];

/**
 * Service id → proposal_gallery service_type keys. The gallery admin
 * (/proposal-gallery-admin) stays the source of truth: published images there
 * flow into the matching service's modal automatically.
 */
export const MENU_GALLERY_KEYS: Record<string, string[]> = {
  massage: ['massage'],
  hair: ['hair'],
  nails: ['nails'],
  facials: ['facial', 'facials'],
  headshots: ['headshot', 'headshots'],
  mindfulness: ['mindfulness'],
  'sound-bath': ['sound-bath', 'crystal-sound-bath'],
  yoga: ['yoga'],
  'strength-sculpt': ['strength-sculpt'],
  'dance-cardio': ['dance-cardio'],
  'somatic-movement': ['somatic-movement', 'somatic-sound-bath'],
  'assisted-stretch': ['assisted-stretch', 'stretch-mobility'],
};
