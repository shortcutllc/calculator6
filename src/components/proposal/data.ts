// Service display names + descriptions — single source of truth used by the
// redesigned proposal viewer components. Mirrors the strings already in
// production (ProposalViewer.tsx, StandaloneProposalViewer.tsx) so swapping
// in the new components doesn't change visible copy.

export const SERVICE_DISPLAY: Record<string, string> = {
  massage: 'Massage',
  headshot: 'Headshot',
  headshots: 'Headshot',
  mindfulness: 'Mindfulness',
  // Legacy mindfulness program slugs from V1 (kept so old proposals still
  // render correctly in V2). The Phase 1 rewrite consolidated these under
  // `mindfulness` + a `mindfulnessType` field, but live proposals in the
  // database may still use the old `mindfulness-*` slug.
  'mindfulness-soles': 'Mindfulness · Soles of the Feet',
  'mindfulness-movement': 'Mindfulness · Movement & Stillness',
  'mindfulness-pro': 'Mindfulness · PRO Practice',
  'mindfulness-cle': 'Mindfulness · CLE Ethics',
  'mindfulness-pro-reactivity': 'Mindfulness · Stepping Out of Reactivity',
  facial: 'Facial',
  facials: 'Facial',
  nails: 'Nails',
  hair: 'Hair',
  'hair-makeup': 'Hair + Makeup',
  'headshot-hair-makeup': 'Hair + Makeup for Headshots',
  makeup: 'Makeup',
  'sound-bath': 'Sound Bath',
  yoga: 'Yoga',
  stretch: 'Assisted Stretch',
  // 2026 movement & sound services.
  reiki: 'Reiki Reset',
  'crystal-sound-bath': 'Crystal Sound Bath',
  'somatic-sound-bath': 'Somatic Movement + Crystal Sound Bath',
  'stretch-mobility': 'Stretch, Mobility & Somatic Recovery',
  'dance-cardio': 'Dance Cardio',
  'strength-sculpt': 'Strength & Sculpt',
};

export const SERVICE_DESC: Record<string, string> = {
  massage:
    'Treat your team to rejuvenating chair or table massage sessions right in the workplace. Our expert therapists create a luxurious spa-like ambiance with soothing scents, customized lighting and relaxing sounds.',
  headshot:
    'Our in-office headshot experience creates a consistent, professional appearance across your team. Elevate the experience with optional hair and makeup touch-ups so employees feel confident and camera-ready.',
  mindfulness:
    'In just one initial course your team will learn the fundamentals, experience guided meditations and gain practical tools to reduce stress and enhance focus.',
  facial:
    'Professional facial treatments that provide deep cleansing, hydration, and relaxation, helping employees feel refreshed and rejuvenated during their workday.',
  nails:
    'Experience manicures and pedicures that blend relaxation with elegance, offering a pampered escape that leaves employees refreshed and polished.',
  hair:
    'Our office hair services menu offers precision cuts, professional styling, and grooming essentials, designed to keep employees looking sharp and feeling confident right at the workplace.',
  'hair-makeup':
    'Enjoy a personalized makeup look, from natural to glamorous, paired with a quick hair touch-up using hot tools for a polished finish. Perfect for any occasion.',
  'headshot-hair-makeup':
    'Capture your best self with our professional headshots, complemented by flawless hair styling and makeup application, ensuring you leave with a photo that speaks volumes.',
  makeup:
    'Experience personalized makeup artistry that enhances natural beauty and creates stunning looks tailored to each individual.',
  'sound-bath':
    'A live sound experience using crystal singing bowls, gong, and chimes. Your team lies down or sits, eyes closed, and lets the sound carry them out of their heads and back into their bodies. A nervous-system reset, not theater. In-person at your office or live over video.',
  yoga:
    'Live yoga classes for your team at the office or over video. Chair classes need no mats or floor clearance; mat classes run from gentle flow to restorative. Same certified instructors every time, so the team builds a rhythm.',
  stretch:
    'One-on-one assisted stretching with a certified specialist. Ten to twenty-minute appointments, rotating through your team like a massage day. Targeted release for desk-related tightness in the neck, shoulders, hips, and lower back. Fully clothed, no oils.',
  // 2026 movement & sound services (approved copy, gated via brand voice guide).
  reiki:
    'One-on-one Reiki sessions, right in the office. A trained practitioner guides each person through fifteen or sixty minutes of grounding and deep rest that calms the nervous system, fully clothed, seated or lying down. A real reset, no talking or performing required.',
  'crystal-sound-bath':
    'A group sound bath built around crystal singing bowls. Your team settles in, eyes closed, and lets the tones do the work while a facilitator holds the room. Thirty or sixty minutes of stillness, no experience or gear required.',
  'somatic-sound-bath':
    'Gentle somatic movement first, crystal sound bath second. The team loosens up with slow, guided movement that releases tension, then lies back and lets the bowls carry it out. Thirty or sixty minutes, in-person.',
  'stretch-mobility':
    'A guided group class for bodies that sit all day, and a reset after conferences, travel, or long stretches at a desk. A specialist leads stretching, mobility, and somatic movement that undoes tightness in the neck, shoulders, hips, and back. In-person at the office or live over video.',
  'dance-cardio':
    'An upbeat, music-driven cardio class that reads more like a good playlist than a workout. Simple moves anyone can follow, adaptable from full-out to low-impact. In-person or live over video.',
  'strength-sculpt':
    'A full-body strength class that meets every fitness level. Bodyweight, light dumbbells, or bands build strength, posture, and stability, scaled up or down on the spot. In-person or live over video.',
};

// Variant-specific copy for service sub-types. Lookups are keyed by the
// service's sub-type field — `massageType` for massage rows, `nailsType` for
// nails. ServiceCard falls back to SERVICE_DESC[serviceType] when no variant
// match is found, so it's safe to leave sub-types out of these maps.
export const MASSAGE_TYPE_DESC: Record<string, string> = {
  chair:
    'Recharge during the workday with a seated massage focused on relieving tension in the neck, shoulders, back, and arms.',
  table:
    'Table massage offers a deeper, longer experience in a quiet space we set up at your office. Therapists work through full-body tension with oils and aromatherapy. Best for half-day and full-day wellness events.',
};

export const NAILS_TYPE_DESC: Record<string, string> = {
  'nails-hand-massage':
    'Classic in-office manicures paired with a relaxing hand massage. Employees get a full reset — shape, buff, polish, plus a quick tension-release in the wrists and forearms.',
};

// Assisted-stretch sub-type copy, keyed by `stretchType`.
export const STRETCH_TYPE_DESC: Record<string, string> = {
  chair:
    'Express chair stretch in any open corner, fully clothed. A certified specialist works through neck, shoulder, and back tightness in a quick 20-minute slot. The fastest, highest-throughput format.',
  table:
    'Premium table stretch in a private or curtained space. Deeper, hands-on assisted stretching for hips, hamstrings, and lower back over a 20-minute appointment. The functional fix for desk-bound bodies.',
};

// Color palette for service-type chips — preserves existing brand colors per
// service. Designed to be visually distinct without screaming.
export const SERVICE_CHIP_COLORS: Record<string, { bg: string; color: string }> = {
  massage: { bg: 'rgba(255,80,80,.10)', color: '#C73A3A' },
  headshot: { bg: 'rgba(158,250,255,.40)', color: '#005066' },
  headshots: { bg: 'rgba(158,250,255,.40)', color: '#005066' },
  mindfulness: { bg: 'rgba(247,187,255,.35)', color: '#6B2D80' },
  // Legacy mindfulness slugs — same color treatment as base mindfulness.
  'mindfulness-soles': { bg: 'rgba(247,187,255,.35)', color: '#6B2D80' },
  'mindfulness-movement': { bg: 'rgba(247,187,255,.35)', color: '#6B2D80' },
  'mindfulness-pro': { bg: 'rgba(247,187,255,.35)', color: '#6B2D80' },
  'mindfulness-cle': { bg: 'rgba(247,187,255,.35)', color: '#6B2D80' },
  'mindfulness-pro-reactivity': { bg: 'rgba(247,187,255,.35)', color: '#6B2D80' },
  facial: { bg: 'rgba(255,176,136,.30)', color: '#9F4517' },
  facials: { bg: 'rgba(255,176,136,.30)', color: '#9F4517' },
  nails: { bg: 'rgba(254,220,100,.40)', color: '#7A5400' },
  hair: { bg: 'rgba(201,232,255,.50)', color: '#1A4F7A' },
  'hair-makeup': { bg: 'rgba(251,194,235,.40)', color: '#7A2E6B' },
  'headshot-hair-makeup': { bg: 'rgba(251,194,235,.40)', color: '#7A2E6B' },
  makeup: { bg: 'rgba(251,194,235,.40)', color: '#7A2E6B' },
  'sound-bath': { bg: 'rgba(124,131,253,.20)', color: '#3B3E9E' },
  yoga: { bg: 'rgba(146,241,246,.35)', color: '#0B6B73' },
  stretch: { bg: 'rgba(120,180,255,.22)', color: '#1A4F8A' },
  // 2026 movement & sound services.
  reiki: { bg: 'rgba(214,188,250,.30)', color: '#5B3B8C' },
  'crystal-sound-bath': { bg: 'rgba(124,131,253,.20)', color: '#3B3E9E' },
  'somatic-sound-bath': { bg: 'rgba(129,170,255,.22)', color: '#2E4E9E' },
  'stretch-mobility': { bg: 'rgba(120,180,255,.22)', color: '#1A4F8A' },
  'dance-cardio': { bg: 'rgba(255,120,150,.18)', color: '#B03A5B' },
  'strength-sculpt': { bg: 'rgba(120,210,190,.25)', color: '#0B6B5A' },
};

// Service image gradient placeholders + which lucide glyph to overlay.
// Real production code uses /Massage Slider.png etc. when available;
// these gradients are a fallback when image assets aren't ready.
export const SERVICE_GRAPHIC: Record<
  string,
  { bg: string; glyph: string; accent: string }
> = {
  massage: { bg: 'linear-gradient(135deg,#F8D7C7,#E07A5F)', glyph: 'Heart', accent: '#fff' },
  headshot: { bg: 'linear-gradient(135deg,#9EFAFF,#3DAFB8)', glyph: 'Camera', accent: '#003C5E' },
  headshots: { bg: 'linear-gradient(135deg,#9EFAFF,#3DAFB8)', glyph: 'Camera', accent: '#003C5E' },
  mindfulness: { bg: 'linear-gradient(135deg,#F7BBFF,#9F5BB2)', glyph: 'Sparkles', accent: '#fff' },
  'mindfulness-soles': { bg: 'linear-gradient(135deg,#F7BBFF,#9F5BB2)', glyph: 'Sparkles', accent: '#fff' },
  'mindfulness-movement': { bg: 'linear-gradient(135deg,#F7BBFF,#9F5BB2)', glyph: 'Sparkles', accent: '#fff' },
  'mindfulness-pro': { bg: 'linear-gradient(135deg,#F7BBFF,#9F5BB2)', glyph: 'Sparkles', accent: '#fff' },
  'mindfulness-cle': { bg: 'linear-gradient(135deg,#F7BBFF,#9F5BB2)', glyph: 'Sparkles', accent: '#fff' },
  'mindfulness-pro-reactivity': { bg: 'linear-gradient(135deg,#F7BBFF,#9F5BB2)', glyph: 'Sparkles', accent: '#fff' },
  facial: { bg: 'linear-gradient(135deg,#FFE4D6,#FFB088)', glyph: 'Sparkles', accent: '#7A2E0F' },
  facials: { bg: 'linear-gradient(135deg,#FFE4D6,#FFB088)', glyph: 'Sparkles', accent: '#7A2E0F' },
  nails: { bg: 'linear-gradient(135deg,#FEDC64,#EFA31E)', glyph: 'Sparkles', accent: '#5A3700' },
  hair: { bg: 'linear-gradient(135deg,#C9E8FF,#5A91C2)', glyph: 'Sparkles', accent: '#fff' },
  'hair-makeup': { bg: 'linear-gradient(135deg,#FBC2EB,#A18CD1)', glyph: 'Sparkles', accent: '#fff' },
  'headshot-hair-makeup': {
    bg: 'linear-gradient(135deg,#9EFAFF,#A18CD1)',
    glyph: 'Camera',
    accent: '#fff',
  },
  makeup: { bg: 'linear-gradient(135deg,#FBC2EB,#A18CD1)', glyph: 'Sparkles', accent: '#fff' },
  'sound-bath': { bg: 'linear-gradient(135deg,#A5A8FF,#5B5FCB)', glyph: 'Sparkles', accent: '#fff' },
  yoga: { bg: 'linear-gradient(135deg,#9EF5DF,#3DAE8E)', glyph: 'Heart', accent: '#0B3B30' },
  stretch: { bg: 'linear-gradient(135deg,#BCD8FF,#5A91C2)', glyph: 'Heart', accent: '#fff' },
  // 2026 movement & sound services.
  reiki: { bg: 'linear-gradient(135deg,#E6D6FF,#9F7BD1)', glyph: 'Sparkles', accent: '#fff' },
  'crystal-sound-bath': { bg: 'linear-gradient(135deg,#A5A8FF,#5B5FCB)', glyph: 'Sparkles', accent: '#fff' },
  'somatic-sound-bath': { bg: 'linear-gradient(135deg,#9FB6FF,#4E5FCB)', glyph: 'Sparkles', accent: '#fff' },
  'stretch-mobility': { bg: 'linear-gradient(135deg,#BCD8FF,#5A91C2)', glyph: 'Heart', accent: '#fff' },
  'dance-cardio': { bg: 'linear-gradient(135deg,#FFC2D1,#E0607F)', glyph: 'Heart', accent: '#fff' },
  'strength-sculpt': { bg: 'linear-gradient(135deg,#9EF5DF,#2E9E8E)', glyph: 'Heart', accent: '#0B3B30' },
};

// Production photo asset paths (when present). Falls back to gradient if
// the image isn't found.
export const SERVICE_IMAGE_PATH: Record<string, string> = {
  massage: '/Massage Slider.png',
  // Table massage gets its own slider photo (deeper, lying-down experience).
  // Chair massage + the generic "massage" type keep the default image above.
  // Resolved in ServiceImage via the massageType prop, not serviceType alone.
  'table-massage': '/Table Massage Slider.png',
  headshot: '/Headshot Slider.png',
  headshots: '/Headshot Slider.png',
  facial: '/Facials Slider.png',
  facials: '/Facials Slider.png',
  hair: '/Hair Slider.png',
  nails: '/Nails Slider.png',
  mindfulness: '/Mindfulness Slider.png',
  'mindfulness-soles': '/Mindfulness Slider.png',
  'mindfulness-movement': '/Mindfulness Slider.png',
  'mindfulness-pro': '/Mindfulness Slider.png',
  'mindfulness-cle': '/Mindfulness Slider.png',
  'mindfulness-pro-reactivity': '/Mindfulness Slider.png',
  'hair-makeup': '/Hair Slider.png',
  'headshot-hair-makeup': '/Headshot Slider.png',
  // New services — Will is providing these slider images; until they're in
  // public/, the gradient+glyph fallback in SERVICE_GRAPHIC renders instead.
  'sound-bath': '/Sound Bath Slider.png',
  yoga: '/Yoga Slider.png',
  stretch: '/Stretch Slider.png',
  // 2026 movement & sound services — dedicated Kirsten photos. Stretch/Mobility
  // uses the Assisted Stretch slider as its main image (not the group-class photo).
  reiki: '/reiki-reset.png',
  'crystal-sound-bath': '/crystal-sound-bath.png',
  'somatic-sound-bath': '/somatic-movement.png',
  'stretch-mobility': '/Stretch Slider.png',
  'dance-cardio': '/dance-cardio.png',
  'strength-sculpt': '/strength-sculpt.png',
};

// SERVICE_GALLERY — multiple photos per service type for the per-card image
// gallery (prototype). Populated with real assets already in /public so the
// two gallery treatments can be judged live. Long-term this would be sourced
// from `proposal_gallery` filtered by service type (same table the sidebar
// GalleryCard already reads). Services without an entry fall back to the
// single SERVICE_IMAGE_PATH cover.
export const SERVICE_GALLERY: Record<string, string[]> = {
  massage: [
    '/Massage Slider.png',
    '/massage-guy-shortcut.jpg',
    '/Landing Page Hero Images/Massage Hero.png',
    '/QR Code Sign/Service Images/Massage.png',
  ],
  nails: [
    '/Nails Slider.png',
    '/Landing Page Hero Images/Nails Hero.png',
    '/QR Code Sign/Service Images/Nails.png',
    '/Holiday Proposal/Hero Images/Nails 2x.png',
  ],
  // 2026 movement & sound services. First entry is the cover (matches
  // SERVICE_IMAGE_PATH), followed by additional Kirsten photos so the card
  // shows a multi-photo gallery when the service is on a proposal.
  'crystal-sound-bath': [
    '/crystal-sound-bath.png',
    '/crystal-sound-bath-rooftop.webp',
  ],
  reiki: [
    '/reiki-reset.png',
    '/reiki-reset-session.webp',
  ],
  'somatic-sound-bath': [
    '/somatic-movement.png',
    '/somatic-movement-2.webp',
  ],
  // Stretch/Mobility has one dedicated photo (its cover), so no separate
  // gallery — the old Assisted Stretch slider is a different service.
};

// SERVICE_EVENT_PHOTOS — REAL event/session photos only (people at actual
// events), NOT the studio/slider cover images that have a flat color
// background. These are what the top-of-proposal gallery mosaic assembles
// from, and what the gallery admin offers in its standard library. Covers are
// deliberately excluded — they're the service card's main image, not gallery
// photos.
export const SERVICE_EVENT_PHOTOS: Record<string, string[]> = {
  massage: ['/massage-guy-shortcut.jpg'],
  'sound-bath': ['/crystal-sound-bath-rooftop.webp'],
  'crystal-sound-bath': ['/crystal-sound-bath-rooftop.webp'],
  'somatic-sound-bath': ['/somatic-movement-2.webp'],
  reiki: ['/reiki-reset-session.webp'],
  'stretch-mobility': ['/stretch-mobility.webp'],
};

// Frequency presets used by the FrequencyPicker. README question 2: user
// confirmed "Add a custom entry too." Custom isn't a preset value — it's a
// sentinel handled in the picker UI.
export const FREQ_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 1, label: 'One-time' },
  { value: 2, label: 'Twice a year' },
  { value: 4, label: 'Quarterly' },
  { value: 12, label: 'Monthly' },
];

export const formatCurrency = (n: number): string =>
  '$' +
  (n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export const formatCurrencyCents = (n: number): string =>
  '$' +
  (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
