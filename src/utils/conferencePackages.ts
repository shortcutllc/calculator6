// Conference one-pager package lineup, shared by the public page
// (ConferenceOnePager) and the admin creator (per-client price overrides).
// Copy is tied to the proposal system's approved service descriptions
// (SERVICE_DESC in src/components/proposal/data.ts) with the conference and
// retreat angle layered on. Capacity stats confirmed by Will (2026-07-22):
// massage, reiki and stretch run 30 to 150 appointments per day; hair and
// nails run 30 to 100 per day; group classes have no participant cap.

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
    id: 'reset-zone', name: 'The Reset Zone', image: 'https://oxigtmlqqfbhzekpdalt.supabase.co/storage/v1/object/public/proposal-gallery/massage/1778730995486-9l9d6z.jpeg', bar: 'cyan', popular: true,
    meta: 'Chair or table massage · 15–20 min/service',
    desc: 'Expert therapists, soothing scents and a spa-like calm in the middle of the show. The break everyone lines up for.',
    bullets: ['Licensed therapists, 2 chairs to 40+', '30 to 150 appointments per day', 'Privacy screens, scents and setup included'],
    price: '$1,200', unit: 'per day · 2 therapists × 4 hrs',
  },
  {
    id: 'glow-lounge', name: 'The Glow Lounge', image: 'https://oxigtmlqqfbhzekpdalt.supabase.co/storage/v1/object/public/proposal-gallery/hair/1784325543659-edz1yh.jpg', bar: 'pink',
    meta: 'Hair, hair & makeup, or facials · 20–30 min/service',
    desc: 'Professional styling, makeup or express facials. Attendees walk out looking sharp and camera-ready for the conference floor.',
    bullets: ['Choose one service per station', 'Licensed stylists and estheticians', '30 to 100 appointments per day'],
    price: '$1,200', unit: 'per day · 2 pros × 4 hrs',
  },
  {
    id: 'polish-bar', name: 'The Polish Bar', image: 'https://oxigtmlqqfbhzekpdalt.supabase.co/storage/v1/object/public/proposal-gallery/nails/1784325589704-cw5v3l.jpg', bar: 'sun',
    meta: 'Express manicures · 20–30 min/service',
    desc: 'Express manicures that blend relaxation with elegance. A pampered escape that sends people back to the floor refreshed and polished.',
    bullets: ['Licensed nail technicians', '30 to 100 appointments per day', 'Dry service, no plumbing, no fumes'],
    price: '$1,200', unit: 'per day · 2 techs × 4 hrs',
  },
  {
    id: 'mindful-reset', name: 'The Mindful Reset', image: `${A}/services/mindfulness.png`, bar: 'navy',
    meta: 'Facilitated sessions · 30–60 min',
    desc: 'Guided meditations and practical tools to reduce stress and sharpen focus, threaded through your agenda where they land best.',
    bullets: ['Any group size, an intimate room or the full ballroom', 'Arrival drop-ins, resets and closing reflections', 'Onstage, in breakouts, or over Zoom'],
    price: '$1,250', unit: 'per 30-min session',
  },
  {
    id: 'studio', name: 'The Studio', image: `${A}/services/headshot.png`, bar: 'navy',
    meta: 'Headshots · 8–12 min/session',
    desc: 'A pop-up studio with pro lighting and direction. Consistent, polished headshots your attendees will actually use.',
    bullets: ['Pro photographer and lighting rig', 'Retouched gallery in 5 to 7 days', 'Optional hair and makeup touch-ups'],
    price: '$3,000', unit: 'per day · 25 headshots, retouching included',
  },
  {
    id: 'stretch-lab', name: 'The Stretch Lab', image: `${A}/onepager/svc/stretch-mobility.webp`, bar: 'cyan',
    meta: 'Assisted stretch · 10–20 min/service',
    desc: 'One-on-one assisted stretch, fully clothed, no oils. Targeted release for the necks, shoulders and backs a conference produces.',
    bullets: ['Licensed stretch specialists', '30 to 150 appointments per day', 'No equipment needed from the venue'],
    price: '$1,200', unit: 'per day · 2 specialists × 4 hrs',
  },
  {
    id: 'movement-studio', name: 'The Movement Studio', image: `${A}/onepager/gallery/dance-cardio-gallery.jpg`, bar: 'pink',
    meta: 'Group classes · 30–60 min',
    desc: 'Yoga, dance cardio, strength or mobility. Simple moves anyone can follow, scaled from a small group to the whole conference.',
    bullets: ['Certified instructors, any group size', 'Mats, music and setup included', 'Ballroom, lawn or breakout room'],
    price: '$650', unit: 'per 30-min chair yoga class',
  },
  {
    id: 'sound-sanctuary', name: 'The Sound Sanctuary', image: `${A}/onepager/svc/crystal-sound-bath-rooftop.webp`, bar: 'sun',
    meta: 'Crystal sound baths · 30–60 min',
    desc: 'Crystal singing bowls, eyes closed, deep rest. A nervous-system reset, not theater. The quietest room at the conference.',
    bullets: ['Certified sound practitioners', 'Any group size, intimate to ballroom', 'No equipment needed from the venue'],
    price: '$1,250', unit: 'per 30-min session',
  },
];

// Bundles variant (the design's "tiers"): three commitment rungs. Default
// prices carry Will's approved corrections vs the design file ($4,500 →
// $5,500 anchored against $6,050 of parts; $9,500 → $15,000 minimum real
// config). Appointment ceilings derive from the per-station capacity above.
export const CONFERENCE_BUNDLES: ConferencePackageDef[] = [
  {
    id: 'recharge', name: 'The Recharge', image: 'https://oxigtmlqqfbhzekpdalt.supabase.co/storage/v1/object/public/proposal-gallery/massage/1784325356154-vhti6y.jpg', bar: 'cyan',
    meta: 'Half day · one station',
    desc: 'One wellness station of your choice. Massage, nails or glam. For a half-day pop-up your attendees will talk about.',
    bullets: ['Up to 75 appointments', '2 to 3 pros plus an onsite lead', 'Self-serve booking and signage'],
    price: '$1,350', unit: 'per event',
  },
  {
    id: 'signature', name: 'The Signature', image: `${A}/services/hair-v2.png`, bar: 'pink', popular: true,
    meta: 'Full day · two stations + a session',
    desc: 'Two stations running all day plus a facilitated mindfulness session. A full wellness layer for a one-day offsite or summit.',
    bullets: ['Up to 300 appointments across two stations', '4 to 6 pros plus an onsite lead', 'Guided mindfulness session included'],
    price: '$5,500', unit: 'per event · $6,050 booked separately',
  },
  {
    id: 'full-takeover', name: 'The Full Takeover', image: `${A}/services/massage.png`, bar: 'navy',
    meta: 'Multi-day · every station',
    desc: 'The whole menu across your conference. All stations, daily mindfulness threaded through the agenda, and a headshot studio.',
    bullets: ['Unlimited station mix, 2 to 5 days', 'Dedicated event producer', 'Wrap report with participation stats'],
    price: '$15,000', unit: 'per event',
  },
];
