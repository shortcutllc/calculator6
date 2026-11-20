/* ─────────────────────────────────────────────
   Facts and pictures shared by the partner page (/sponsor/:slug) and the
   sponsor deck (/lounge/:token). Data only, no styles, so the deck can read
   it without pulling in the partner page's stylesheet.
   ───────────────────────────────────────────── */

/* The AACSB rendering: a lounge built in one sponsor's brand, which is the
   product in a single picture. It carries the University of Cincinnati's
   branding, so confirm that is fine to show other organizers. */
export const LOUNGE_RENDERING = {
  src: '/aacsb/lounge-rendering-uc.jpg',
  alt: 'Rendering of a conference wellness lounge built in one sponsor’s brand, with a branded welcome desk, privacy screens and massage chairs',
};

/* Workhuman Live 2026, from the website's conference gallery
   (conferences-data.js, CONF_GALLERY). Only this event's photos sit under
   the Workhuman headline. */
export const PROOF_GALLERY = [
  { cap: 'Workhuman Live · The Gratitude Garden', img: '/ds-assets/conference/zone-signage.jpeg', tint: '#9EFAFF' },
  { cap: 'Chair massage on the floor', img: '/ds-assets/conference/welcome-desk.jpeg', tint: '#C7CBFB' },
  { cap: 'The Zen Zone', img: '/ds-assets/conference/zen-zone.jpeg', tint: '#FFCBA6' },
];

/* The headline carries the 400 and the 200; these are the numbers it
   doesn't (live page, #9). Recorded in CLAIMS_VERIFICATION §2. */
export const PROOF_STATS = [
  { fig: '400', label: 'fifteen minute massages' },
  { fig: '100%', label: 'of slots booked' },
  { fig: '200+', label: 'on the waitlist, all three days' },
];
