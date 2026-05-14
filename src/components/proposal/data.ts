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
};

// Production photo asset paths (when present). Falls back to gradient if
// the image isn't found.
export const SERVICE_IMAGE_PATH: Record<string, string> = {
  massage: '/Massage Slider.png',
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
