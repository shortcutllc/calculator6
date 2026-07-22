// Conference one-pager package lineup, shared by the public page
// (ConferenceOnePager) and the admin creator (per-client price overrides).
// Default prices mirror the proposal pricing engine defaults (docs/SERVICES.md):
// appointment services 2 pros × 4 hrs × $150/hr; flat classes from the
// catalogs; headshots 5 hrs × $400 + 25 × $40 retouching.

export type ConferencePkgBar = 'navy' | 'cyan' | 'pink' | 'sun';

export interface ConferencePackageDef {
  id: string;
  name: string;
  image: string;
  bar: ConferencePkgBar;
  popular?: boolean;
  meta: string;
  desc: string;
  bullets: string[];
  price: string;
  unit: string;
}

const A = '/conference';

export const CONFERENCE_PACKAGES: ConferencePackageDef[] = [
  {
    id: 'reset-zone', name: 'The Reset Zone', image: `${A}/services/massage-v2.png`, bar: 'navy', popular: true,
    meta: 'Chair massage · 15–20 min/service',
    desc: 'A calm corner with relaxing chair massage and soothing scents. The quick recharge between sessions everyone lines up for.',
    bullets: ['Licensed therapists, 2 chairs to 40+', '24–32 appointments per day at this size, scales to 1,100+', 'Privacy screens, scents & setup included'],
    price: '$1,200', unit: 'per day · 2 therapists × 4 hrs',
  },
  {
    id: 'glow-lounge', name: 'The Glow Lounge', image: `${A}/services/hair-v2.png`, bar: 'cyan',
    meta: 'Hair, hair & makeup, or facials · 20–30 min/service',
    desc: 'Pick your glow. Hair styling, hair & makeup, or express facials. A mid-event reset that shows.',
    bullets: ['Choose one service per station', 'Licensed stylists & estheticians', '16–24 appointments per day'],
    price: '$1,200', unit: 'per day · 2 pros × 4 hrs',
  },
  {
    id: 'polish-bar', name: 'The Polish Bar', image: `${A}/services/nails.png`, bar: 'pink',
    meta: 'Express manicures · 20–30 min/service',
    desc: 'A clean, polished touch. Express manicures that feel like a treat. Simple, elevated, and always appreciated.',
    bullets: ['Licensed nail technicians', '16–24 appointments per day', 'Dry service, no plumbing, no fumes'],
    price: '$1,200', unit: 'per day · 2 techs × 4 hrs',
  },
  {
    id: 'mindful-reset', name: 'The Mindful Reset', image: `${A}/services/mindfulness.png`, bar: 'sun',
    meta: 'Facilitated sessions · 30–60 min',
    desc: 'Live guided sessions threaded through your agenda. An arrival drop-in, a post-keynote reset, a closing reflection your team takes home.',
    bullets: ['Expert facilitator, up to 100 participants', 'Breathwork, body scans & mindful movement', 'Works onstage, in breakouts, or on Zoom'],
    price: '$1,250', unit: 'per 30-min session',
  },
  {
    id: 'studio', name: 'The Studio', image: `${A}/services/headshot.png`, bar: 'navy',
    meta: 'Headshots · 8–12 min/session',
    desc: 'A pop-up photo studio with pro lighting. Polished, consistent headshots the whole team will actually use.',
    bullets: ['Pro photographer + lighting rig', 'Retouched gallery in 5–7 days', 'Optional 10–15-min hair & makeup touch-ups'],
    price: '$3,000', unit: 'per day · 25 headshots, retouching included',
  },
  {
    id: 'stretch-lab', name: 'The Stretch Lab', image: `${A}/services/assisted-stretch.png`, bar: 'cyan',
    meta: 'Assisted stretch · 10–20 min/service',
    desc: 'One-on-one assisted stretch that undoes travel days, long sessions and hotel beds. Energizing, not sweaty.',
    bullets: ['Licensed stretch therapists', '24–48 appointments per day', 'No equipment needed from the venue'],
    price: '$1,200', unit: 'per day · 2 specialists × 4 hrs',
  },
  {
    id: 'movement-studio', name: 'The Movement Studio', image: `${A}/services/yoga.png`, bar: 'pink',
    meta: 'Group classes · 30–60 min',
    desc: 'Choose one. Yoga, dance cardio, strength & sculpt or stretch & mobility. Or combine classes for extended programming.',
    bullets: ['Certified instructors, up to 40 per class', 'Mats, music & setup included', 'Ballroom, lawn or breakout room'],
    price: '$650', unit: 'per 30-min chair yoga class',
  },
  {
    id: 'sound-sanctuary', name: 'The Sound Sanctuary', image: `${A}/services/sound-bath.png`, bar: 'sun',
    meta: 'Crystal sound baths · 30–60 min',
    desc: 'A room of crystal singing bowls and deep, screens-off rest. The quietest 30 minutes on the agenda.',
    bullets: ['Certified sound practitioners', 'Up to 60 participants per session', 'No equipment needed from the venue'],
    price: '$1,250', unit: 'per 30-min session',
  },
];

// Bundles variant (the design's "tiers"): three commitment rungs. Default
// prices carry Will's approved corrections vs the design file ($4,500 →
// $5,500 anchored against $6,050 of parts; $9,500 → $15,000 minimum real
// config; Recharge count 40 → 36). Per-client overrides apply as usual.
export const CONFERENCE_BUNDLES: ConferencePackageDef[] = [
  {
    id: 'recharge', name: 'The Recharge', image: `${A}/services/massage-v2.png`, bar: 'cyan',
    meta: 'Half day · one station',
    desc: 'One wellness station of your choice. Massage, nails or glam. For a half-day pop-up your attendees will talk about.',
    bullets: ['Up to 36 appointments', '2–3 pros + onsite lead', 'Self-serve booking & signage'],
    price: '$1,350', unit: 'per event',
  },
  {
    id: 'signature', name: 'The Signature', image: `${A}/services/hair-v2.png`, bar: 'pink', popular: true,
    meta: 'Full day · two stations + a session',
    desc: 'Two stations running all day plus a facilitated mindfulness session. A full wellness layer for a one-day offsite or summit.',
    bullets: ['Up to 120 appointments', '4–6 pros + onsite lead', 'Guided mindfulness session included'],
    price: '$5,500', unit: 'per event · $6,050 booked separately',
  },
  {
    id: 'full-takeover', name: 'The Full Takeover', image: `${A}/services/massage.png`, bar: 'navy',
    meta: 'Multi-day · every station',
    desc: 'The whole menu across your conference. All stations, daily mindfulness threaded through the agenda, and a headshot studio.',
    bullets: ['Unlimited station mix, 2–5 days', 'Dedicated event producer', 'Wrap report with participation stats'],
    price: '$15,000', unit: 'per event',
  },
];
