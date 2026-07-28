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
    desc: 'We turn a room at your venue into a spa for the day. Expert therapists, soothing scents, and the break attendees line up for.',
    bullets: ['Licensed therapists who know how to work a room', 'Two chairs or twenty, up to 150 appointments a day', 'Chairs, screens, scents and setup, all ours'],
    price: '$1,200', unit: 'per day · 2 therapists × 4 hrs',
  },
  {
    id: 'glow-lounge', name: 'The Glow Lounge', image: 'https://oxigtmlqqfbhzekpdalt.supabase.co/storage/v1/object/public/proposal-gallery/hair/1784325543659-edz1yh.jpg', bar: 'pink',
    meta: 'Hair, hair & makeup, or facials · 20–30 min/service',
    desc: 'Blowouts, makeup or express facials before the keynote, the photo or the evening reception. Attendees walk back out camera ready.',
    bullets: ['Licensed stylists and estheticians', 'One station or six, up to 100 appointments a day', 'Pick the service that fits your agenda'],
    price: '$1,200', unit: 'per day · 2 pros × 4 hrs',
  },
  {
    id: 'polish-bar', name: 'The Polish Bar', image: 'https://oxigtmlqqfbhzekpdalt.supabase.co/storage/v1/object/public/proposal-gallery/nails/1784325589704-cw5v3l.jpg', bar: 'sun',
    meta: 'Express manicures · 20–30 min/service',
    desc: 'Express manicures without the salon trip. Twenty quiet minutes off the floor, then back to the sessions looking sharp.',
    bullets: ['Licensed nail technicians', 'Scales from an intimate suite to 100 appointments a day', 'Dry service. No plumbing, no fumes, no cleanup for the venue'],
    price: '$1,200', unit: 'per day · 2 techs × 4 hrs',
  },
  {
    id: 'mindful-reset', name: 'The Mindful Reset', image: `${A}/services/mindfulness.png`, bar: 'navy',
    meta: 'Facilitated sessions · 30–60 min',
    desc: 'Guided meditation and practical tools for stress and focus, threaded into your agenda where the day needs a breath.',
    bullets: ['Ten people or a full ballroom, no cap either way', 'Arrival drop-ins, mid-day resets, closing reflections', 'Onstage, in a breakout, or over Zoom for the people at home'],
    price: '$1,250', unit: 'per 30-min session',
  },
  {
    id: 'studio', name: 'The Studio', image: `${A}/services/headshot.png`, bar: 'navy',
    meta: 'Headshots · 8–12 min/session',
    desc: 'A pop-up studio with real lighting and a photographer who directs the shot. Headshots attendees actually put on LinkedIn.',
    bullets: ['Pro photographer, lighting rig and posing direction', 'Retouched gallery back in five to seven days', 'Add hair and makeup touch-ups before the shot'],
    price: '$3,000', unit: 'per day · 25 headshots, retouching included',
  },
  {
    id: 'stretch-lab', name: 'The Stretch Lab', image: `${A}/onepager/svc/stretch-mobility.webp`, bar: 'cyan',
    meta: 'Assisted stretch · 10–20 min/service',
    desc: 'A specialist walks each person through a targeted stretch, one on one. Relief for the necks, shoulders and backs three days of sessions produce.',
    bullets: ['Licensed stretch specialists, one on one', 'From a single table to 150 appointments a day', 'We bring the tables. Nothing needed from the venue'],
    price: '$1,200', unit: 'per day · 2 specialists × 4 hrs',
  },
  {
    id: 'movement-studio', name: 'The Movement Studio', image: `${A}/onepager/gallery/dance-cardio-gallery.jpg`, bar: 'pink',
    meta: 'Group classes · 30–60 min',
    desc: 'Yoga, dance cardio, strength or mobility. A gentle morning reset or a real workout, whichever the agenda needs.',
    bullets: ['Certified instructors who read the room', 'A dozen people or the whole conference, no cap', 'Mats, music and setup included. Ballroom, lawn or breakout room'],
    price: '$650', unit: 'per 30-min chair yoga class',
  },
  {
    id: 'sound-sanctuary', name: 'The Sound Sanctuary', image: `${A}/onepager/svc/crystal-sound-bath-rooftop.webp`, bar: 'sun',
    meta: 'Crystal sound baths · 30–60 min',
    desc: 'Crystal singing bowls, eyes closed, screens off. The quietest thirty minutes on the agenda, and the one people ask about after.',
    bullets: ['Certified sound practitioners', 'An intimate circle or a full ballroom, no cap', 'Bowls, mats and setup included. Nothing from the venue'],
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
    desc: 'One station, your pick. Massage, nails or glam for a half day. The easiest thing you will add to the agenda.',
    bullets: ['Up to 75 appointments in a half day', 'Two to three pros plus an onsite lead', 'Self-serve booking and signage, handled'],
    price: '$1,350', unit: 'per event',
  },
  {
    id: 'signature', name: 'The Signature', image: `${A}/services/hair-v2.png`, bar: 'pink', popular: true,
    meta: 'Full day · two stations + a session',
    desc: 'Two stations running all day plus a facilitated session. Enough wellness that it shows up in the recap, not just the schedule.',
    bullets: ['Up to 300 appointments across two stations', 'Four to six pros plus an onsite lead', 'A guided mindfulness session, included'],
    price: '$5,500', unit: 'per event · $6,050 booked separately',
  },
  {
    id: 'full-takeover', name: 'The Full Takeover', image: `${A}/services/massage.png`, bar: 'navy',
    meta: 'Multi-day · every station',
    desc: 'The whole menu across your conference. Every station, mindfulness threaded through each day, and a headshot studio running alongside.',
    bullets: ['Any mix of stations, two to five days', 'A dedicated event producer, start to finish', 'Wrap report with participation numbers'],
    price: '$15,000', unit: 'per event',
  },
];
