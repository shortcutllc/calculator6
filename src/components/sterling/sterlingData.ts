// ---------------------------------------------------------------------------
// SterlingRisk partner page (/partners/sterling): copy, packages and pricing.
//
// Source: design_handoff_sterling_partner (2026-10-06), `Sterling Partner 1280
// D.dc.html`. Copy and package data are transcribed from its `renderVals()`.
// Every departure from the handoff is called out where it is made. Three come
// from decisions Will's team made on the www holiday page after the handoff
// was cut (shortcut repo, frontend/data/holiday-data.js), confirmed by Will
// for this page on 2026-10-06:
//   1. The booking cutoff is Dec 7, not Nov 20.
//   2. The free group class is replaced by "a special holiday treat".
//   3. Prices: headshots use the proposal formula, and group sessions use the
//      calculator6 catalog prices instead of the handoff's blank placeholder.
// ---------------------------------------------------------------------------

import { MINDFULNESS_CATALOG_BY_ID } from '../../utils/mindfulnessCatalog';
import { MOVEMENT_CATALOG_BY_ID } from '../../utils/movementCatalog';

/* ── Holiday offer ─────────────────────────────────────────────────────── */

/** Booking cutoff. Every "Book by …" on the page reads this one value. */
export const CUTOFF = '2026-12-07';

export function bookByLabel(iso = CUTOFF): string {
  const d = new Date(iso + 'T12:00:00');
  return 'Book by ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ── Pricing ───────────────────────────────────────────────────────────── */

/** Appointment services: $150 per Pro, per hour (the handoff's `rateAppt`). */
export const APPT_RATE = 150;

/** Headshots follow the proposal engine (netlify/functions/lib/pricing-engine.js,
 *  HEADSHOT_TIERS.basic): $400 per photographer hour plus $25 per retouched
 *  portrait. The handoff priced them at $150 an hour, which undercuts the
 *  proposal a client would receive by about 3x. */
export const HEADSHOT_RATE = 400;
export const HEADSHOT_RETOUCH = 25;

/** One 30 minute group session, by kind, from the calculator6 catalogs. The
 *  handoff left `priceGroup30` blank and showed "Flat price". "Group class"
 *  (The Movement Studio: yoga, dance cardio or strength) uses the dance cardio
 *  and strength & sculpt price. */
export const GROUP_PRICE_30 = {
  mindfulness: MINDFULNESS_CATALOG_BY_ID['drop-in'].fixedPrice,
  'sound-bath': MOVEMENT_CATALOG_BY_ID['crystal-sound-bath-30'].fixedPrice,
  'group-class': MOVEMENT_CATALOG_BY_ID['dance-cardio-30'].fixedPrice,
} as const;
type GroupKind = keyof typeof GROUP_PRICE_30;

type Billing = 'fund' | 'rate';

interface ApptService { n: string; appt: true; len: number; b: Billing; headshots?: boolean }
interface GroupService { n: string; appt: false; b: Billing; kind: GroupKind }
type PkgService = ApptService | GroupService;

const A = (n: string, len: number, b: Billing, headshots = false): ApptService => ({ n, appt: true, len, b, headshots });
const G = (n: string, b: Billing, kind: GroupKind): GroupService => ({ n, appt: false, b, kind });

/** The handoff's `price()`: appointments sized to headcount (capped at 150 a
 *  visit, up to 6 hours), group sessions at 40 people a session (capped at 400). */
export function priceService(s: PkgService, g: number): { scope: string; cost: number } {
  if (s.appt) {
    const perHour = 60 / s.len;
    const gg = Math.min(g, 150);
    const pros = Math.max(1, Math.ceil(gg / (perHour * 6)));
    const hrs = Math.max(1, Math.min(6, Math.ceil(gg / (perHour * pros))));
    const cost = s.headshots
      ? pros * hrs * HEADSHOT_RATE + gg * HEADSHOT_RETOUCH
      : pros * hrs * APPT_RATE;
    return { scope: `${pros} ${pros === 1 ? 'Pro' : 'Pros'} · ${hrs} ${hrs === 1 ? 'hr' : 'hrs'}`, cost };
  }
  const n = Math.max(1, Math.ceil(Math.min(g, 400) / 40));
  return { scope: `${n} ${n === 1 ? 'session' : 'sessions'}`, cost: n * GROUP_PRICE_30[s.kind] };
}

export const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

/* ── Packages ──────────────────────────────────────────────────────────── */

export type PkgGroup = 'fund' | 'rate' | 'hol';

export interface Pkg {
  id: string;
  grp: PkgGroup;
  name: string;
  /** The coral label under the art (after "Fund eligible · " or "10% off · "). */
  inside: string;
  /** Art strip panels: service image file + pastel ground. */
  art: [string, string][];
  svcs: PkgService[];
  /** Quote sheet service chips this package maps to. */
  quote: string[];
}

export const PACKAGES: Pkg[] = [
  { id: 'reset', grp: 'fund', name: 'The Reset Zone', inside: 'Chair or table massage', art: [['massage.png', '#9EFAFF']], svcs: [A('Massage', 20, 'fund')], quote: ['massage'] },
  { id: 'mindful', grp: 'fund', name: 'The Mindful Reset', inside: 'Facilitated sessions', art: [['mindfulness.png', '#C7CBFB']], svcs: [G('Mindfulness', 'fund', 'mindfulness')], quote: ['mindfulness'] },
  { id: 'stretch', grp: 'fund', name: 'The Stretch Lab', inside: 'Assisted stretch', art: [['assisted-stretch.png', '#FFCBA6']], svcs: [A('Assisted stretch', 20, 'fund')], quote: ['assisted-stretch'] },
  { id: 'move', grp: 'fund', name: 'The Movement Studio', inside: 'Group classes', art: [['yoga.png', '#A9F0CC'], ['dance-cardio.png', '#A9F0CC']], svcs: [G('Group class', 'fund', 'group-class')], quote: ['yoga', 'dance-cardio', 'strength-sculpt'] },
  { id: 'sound', grp: 'fund', name: 'The Sound Sanctuary', inside: 'Crystal sound baths', art: [['sound-bath.png', '#C7CBFB']], svcs: [G('Sound bath', 'fund', 'sound-bath')], quote: ['sound-bath'] },
  { id: 'glow', grp: 'rate', name: 'The Glow Lounge', inside: 'Hair, makeup or facials', art: [['hair-v3.png', '#FEDC64'], ['facial.png', '#F7BBFF']], svcs: [A('Hair, makeup or facials', 30, 'rate')], quote: ['hair', 'facials'] },
  { id: 'polish', grp: 'rate', name: 'The Polish Bar', inside: 'Manicures', art: [['nails.png', '#F7BBFF']], svcs: [A('Manicures', 30, 'rate')], quote: ['nails'] },
  { id: 'studio', grp: 'rate', name: 'The Studio', inside: 'Headshots', art: [['headshot.png', '#9EFAFF']], svcs: [A('Headshots', 12, 'rate', true)], quote: ['headshots'] },
  { id: 'sleigh', grp: 'hol', name: 'Sleigh the Stress', inside: 'Massage + Meditation', art: [['massage.png', '#9EFAFF'], ['mindfulness.png', '#C7CBFB']], svcs: [A('Chair massage', 20, 'fund'), G('Group meditation', 'fund', 'mindfulness')], quote: ['massage', 'mindfulness'] },
  { id: 'grinch', grp: 'hol', name: 'Resting Grinch Face', inside: 'Hair + Makeup', art: [['hair-v3.png', '#FEDC64'], ['facial.png', '#F7BBFF']], svcs: [A('Hair', 30, 'rate'), A('Makeup', 30, 'rate')], quote: ['hair'] },
  { id: 'styled', grp: 'hol', name: 'Tis the Season to Be Styled', inside: 'Hair + Manicures', art: [['hair-v3.png', '#FEDC64'], ['nails.png', '#F7BBFF']], svcs: [A('Hair', 30, 'rate'), A('Manicures', 30, 'rate')], quote: ['hair', 'nails'] },
  { id: 'bright', grp: 'hol', name: 'Merry and Bright', inside: 'Headshots + Hair & Makeup', art: [['headshot.png', '#9EFAFF'], ['facial.png', '#F7BBFF']], svcs: [A('Headshots', 10, 'rate', true), A('Hair and makeup touch-up', 10, 'rate')], quote: ['headshots'] },
];

export const PKG_TABS: { key: PkgGroup; label: string; dot: string }[] = [
  { key: 'fund', label: 'Fund eligible', dot: '#9EFAFF' },
  { key: 'rate', label: '10% partner rate', dot: '#FF5050' },
  { key: 'hol', label: 'Holiday packages', dot: '#FEDC64' },
];

export type Cadence = 'once' | 'q' | 'm';
export const CADENCES: { k: Cadence; label: string; sub: string; save: string; bg?: string; pct: number }[] = [
  { k: 'once', label: 'One visit', sub: 'A single year-end visit', save: '', pct: 0 },
  { k: 'q', label: 'Quarterly', sub: '4+ visits a year', save: 'Save 10%', bg: '#9EFAFF', pct: 0.10 },
  { k: 'm', label: 'Monthly', sub: '9+ visits a year', save: 'Save 15%', bg: '#FEDC64', pct: 0.15 },
];

/** One package alone at this headcount: cost, and the partner-rate share. */
export function pkgPrice(p: Pkg, g: number) {
  let c = 0, rc = 0;
  p.svcs.forEach((s) => { const r = priceService(s, g); c += r.cost; if (s.b === 'rate') rc += r.cost; });
  return { c, rc };
}

/** "From $X" on a card: the package alone, after its own partner and combine discounts. */
export function pkgFrom(p: Pkg, g: number) {
  const r = pkgPrice(p, g);
  return (r.c - r.rc * 0.1) * (p.svcs.length > 1 ? 0.9 : 1);
}

const dotFor = (p: Pkg) =>
  p.svcs.every((s) => s.b === 'fund') ? '#9EFAFF' : p.svcs.every((s) => s.b === 'rate') ? '#FF5050' : '#FEDC64';

/**
 * The summary rail. Discounts apply in the handoff's order: 10% partner rate on
 * rate-billed services, then combine-and-save 10% with two or more services in
 * the visit, then the cadence discount. The fund / partner-rate split is taken
 * after all of them.
 */
export function buildSummary(sel: Record<string, boolean>, g: number, cad: Cadence) {
  const cadO = CADENCES.find((c) => c.k === cad) || CADENCES[0];
  const chosen = PACKAGES.filter((p) => sel[p.id]);
  let sub = 0, rateSub = 0, nSvc = 0;
  chosen.forEach((p) => p.svcs.forEach((s) => {
    const r = priceService(s, g);
    nSvc++;
    sub += r.cost;
    if (s.b === 'rate') rateSub += r.cost;
  }));
  const partner = rateSub * 0.10;
  const combine = nSvc >= 2 ? (sub - partner) * 0.10 : 0;
  const program = (sub - partner - combine) * cadO.pct;
  const total = sub - partner - combine - program;
  const atRate = (rateSub - partner) * (1 - (nSvc >= 2 ? 0.10 : 0)) * (1 - cadO.pct);
  const toFund = total - atRate;

  const saves: { k: string; v: string }[] = [];
  if (partner) saves.push({ k: 'SterlingRisk partner rate', v: money(partner) });
  if (combine) saves.push({ k: 'Combine and save 10%', v: money(combine) });
  if (program) saves.push({ k: `${cadO.label} program`, v: money(program) });

  return {
    cadO,
    chosen,
    nSvc,
    total,
    name: chosen.length ? (chosen.length === 1 ? chosen[0].name : `${chosen.length} packages, one visit`) : 'Nothing picked yet',
    meta: `${g} people · ${cadO.label}${cadO.pct ? ' · ' + cadO.sub : ''}`,
    lines: chosen.map((p) => ({ id: p.id, k: p.name, v: money(pkgPrice(p, g).c), dot: dotFor(p) })),
    saves,
    split: chosen.length ? `${money(toFund)} to the fund · ${money(atRate)} at the partner rate` : '',
    quoteServices: [...new Set(chosen.flatMap((p) => p.quote))],
  };
}

/* ── The menu rail ─────────────────────────────────────────────────────── */

export interface RailService {
  id: string;
  name: string;
  meta: string;
  art: string;
  billing: Billing;
  remote: boolean;
}

/** Metas and quips are the handoff's (verbatim from the www homepage data). The
 *  pop-out content comes from MENU_SERVICES (src/utils/menuServices.ts). */
export const RAIL_SERVICES: RailService[] = [
  { id: 'massage', name: 'Massage', meta: 'Chair or table · 15–20 min', art: 'massage.png', billing: 'fund', remote: false },
  { id: 'mindfulness', name: 'Mindfulness', meta: 'Guided session · 30 or 60 min', art: 'mindfulness.png', billing: 'fund', remote: true },
  { id: 'sound-bath', name: 'Sound bath', meta: 'Group session · 30 or 60 min', art: 'crystal-sound-bath.png', billing: 'fund', remote: true },
  { id: 'yoga', name: 'Yoga', meta: 'Group class · 30 or 60 min', art: 'yoga.png', billing: 'fund', remote: true },
  { id: 'strength-sculpt', name: 'Strength & sculpt', meta: 'Group class · 30 or 60 min', art: 'strength-sculpt.png', billing: 'fund', remote: true },
  { id: 'dance-cardio', name: 'Dance cardio', meta: 'Group class · 30 or 60 min', art: 'dance-cardio.png', billing: 'fund', remote: true },
  { id: 'somatic-movement', name: 'Somatic movement', meta: 'Group session · 30 or 60 min', art: 'somatic-movement.png', billing: 'fund', remote: true },
  { id: 'assisted-stretch', name: 'Assisted stretch', meta: 'One-on-one · 10–20 min', art: 'assisted-stretch.png', billing: 'fund', remote: false },
  { id: 'hair', name: 'Hair', meta: 'Cuts and styling · 20–30 min', art: 'hair-v3.png', billing: 'rate', remote: false },
  { id: 'nails', name: 'Nails', meta: 'Manicure or pedicure · 20–30 min', art: 'nails.png', billing: 'rate', remote: false },
  { id: 'facials', name: 'Facials', meta: 'Express facial · 20 min', art: 'facial.png', billing: 'rate', remote: false },
  { id: 'headshots', name: 'Headshots', meta: 'Retouched portrait · 8–12 min', art: 'headshot.png', billing: 'rate', remote: false },
];

export const QUIP: Record<string, string> = {
  massage: 'That meeting could have been a massage.',
  hair: 'Hair that survives back-to-back calls.',
  nails: 'All hands meetings.',
  facials: 'Skin that could carry a 9am camera-on.',
  headshots: 'Retire the 2019 LinkedIn photo.',
  mindfulness: 'Do not disturb, but for your brain.',
  'sound-bath': 'Mute everything. Except the gongs.',
  yoga: 'Finally, a standing meeting.',
  'strength-sculpt': 'Move fast and lift things.',
  'dance-cardio': 'Team building, minus the trust falls.',
  'somatic-movement': 'Circle back to your body.',
  'assisted-stretch': 'Stretch goals.',
};

export const TINT: Record<string, string> = {
  massage: '#9EFAFF', headshots: '#9EFAFF', hair: '#FEDC64', nails: '#F7BBFF', facials: '#F7BBFF',
  mindfulness: '#C7CBFB', 'sound-bath': '#C7CBFB', 'somatic-movement': '#C7CBFB',
  yoga: '#A9F0CC', 'dance-cardio': '#A9F0CC', 'strength-sculpt': '#FFCBA6', 'assisted-stretch': '#FFCBA6',
};

export const RAIL_CATS: { key: 'all' | Billing; label: string; dot: string }[] = [
  { key: 'all', label: 'All', dot: '#FEDC64' },
  { key: 'fund', label: 'Fund eligible', dot: '#9EFAFF' },
  { key: 'rate', label: '10% partner rate', dot: '#FF5050' },
];

/* ── Hero ──────────────────────────────────────────────────────────────── */

export const HERO_PILLS: { label: string; fill: string; delay: number }[][] = [
  [{ label: 'Massage', fill: '#9EFAFF', delay: 0.95 }, { label: 'Assisted stretch', fill: '#FFCBA6', delay: 1.13 }, { label: 'Mindfulness', fill: '#C7CBFB', delay: 1.31 }],
  [{ label: 'Sound baths', fill: '#C7CBFB', delay: 0.4 }, { label: 'Yoga', fill: '#A9F0CC', delay: 0.58 }],
];

/* ── Logos ─────────────────────────────────────────────────────────────── */

/** White client logos: file, alt, rendered height in an 84px slot. */
export const LOGOS: { file: string; alt: string; h: number }[] = [
  { file: 'draftkings', alt: 'DraftKings', h: 22 },
  { file: 'nfl', alt: 'NFL', h: 30 },
  { file: 'bcg', alt: 'BCG', h: 16 },
  { file: 'wix', alt: 'Wix', h: 18 },
  { file: 'tripadvisor', alt: 'Tripadvisor', h: 18 },
  { file: 'pwc', alt: 'PwC', h: 22 },
  { file: 'paramount', alt: 'Paramount', h: 26 },
  { file: 'warner-bros', alt: 'Warner Bros.', h: 30 },
  { file: 'white-case', alt: 'White & Case', h: 14 },
  { file: 'mtv', alt: 'MTV', h: 24 },
];

/* ── Where we plug in ──────────────────────────────────────────────────── */

export const CARRIERS = [
  { name: 'Cigna', color: '#0E7C3A', fund: 'Health Improvement Fund' },
  { name: 'Aetna', color: '#7D3F98', fund: 'Wellness Allowance' },
  { name: 'Anthem', color: '#1A4FA3', fund: 'Wellness Fund' },
];

/* ── Partner benefits ──────────────────────────────────────────────────── */

export interface Benefit { who: string; title: string; body: string; chip: string; dark?: boolean }

export const BENEFITS: Benefit[] = [
  { who: 'For you', title: 'Nothing lands on your desk.', body: 'Pre-approval, carrier invoices, W-9 and participation reports go straight from us. Your team stays out of it.', chip: '#9EFAFF' },
  { who: 'For your clients', title: '10% off everything off-fund.', body: 'Hair, nails, facials and headshots at the SterlingRisk partner rate.', chip: '#FF5050', dark: true },
  { who: 'For you', title: 'Something to show at renewal.', body: 'Real participation numbers from a program people actually used.', chip: '#FEDC64' },
  { who: 'For your book', title: 'One vendor, every office.', body: 'On site nationwide, with mindfulness, sound baths and yoga on Zoom for remote teams.', chip: '#C7CBFB' },
  { who: 'For your law firm clients', title: 'Ethics CLE in the same pitch.', body: 'A one-hour accredited Ethics CLE, led by an attorney, in NY, PA and FL. We file and report the credits.', chip: '#F7BBFF' },
  { who: 'For your clients', title: 'Built to the account.', body: 'Self-funded, 100+ lives, a brutal busy season. We shape the program to the client.', chip: '#A9F0CC' },
];

/* ── The handoff ───────────────────────────────────────────────────────── */

export const HANDOFF = [
  { n: '01', title: 'Intro.', body: 'Forward the client or cc Caren. That’s your whole part.', who: 'You', fill: '#9EFAFF' },
  { n: '02', title: 'Program.', body: 'We scope it with the client, file pre-approval with the carrier and lock a date.', who: 'Shortcut', fill: '#FEDC64' },
  { n: '03', title: 'The visit.', body: 'We run it on site, start to finish. The client approves a date and nothing else.', who: 'Shortcut', fill: '#F7BBFF' },
  { n: '04', title: 'Reporting.', body: 'Carrier invoice out, participation summary to you and the client. With Aetna we’re often paid direct.', who: 'Shortcut → you', fill: '#9EFAFF', dark: true },
];

/* ── Proof ─────────────────────────────────────────────────────────────── */

/** 92% is the utilization claim (booked slots that get used), confirmed by Will
 *  2026-08-21: "it should be 92% everywhere". */
export const STATS = [
  { n: '500', suf: '+', label: 'companies served' },
  { n: '92', suf: '%', label: 'of booked slots get used, across all events' },
  { n: '87', suf: '%', label: 'of companies rebook' },
];

const GAL = 'https://oxigtmlqqfbhzekpdalt.supabase.co/storage/v1/object/public/proposal-gallery';
export const GALLERY = [
  { cap: 'Massage @ BCG', img: `${GAL}/massage/1784325356154-vhti6y.jpg`, col: 'sp-gal-a', pos: 'center 30%' },
  { cap: 'Manicures @ DraftKings', img: `${GAL}/nails/1784325589704-cw5v3l.jpg`, col: 'sp-gal-b', pos: 'center 30%' },
  { cap: 'Massage @ Wix.com', img: '/wellness-funds/gallery/wix.png', col: 'sp-gal-c', pos: 'center 25%' },
];

/* ── "What sets Shortcut apart" ────────────────────────────────────────── */

export const ROSTER = [
  { name: 'Maya R.', ini: 'MR', av: '#9EFAFF', slot: '11:00 am' },
  { name: 'Devon K.', ini: 'DK', av: '#FEDC64', slot: '11:20 am' },
  { name: 'Priya S.', ini: 'PS', av: '#F7BBFF', slot: '11:40 am' },
  { name: 'Tom B.', ini: 'TB', av: '#C7CBFB', slot: '12:00 pm' },
  { name: 'Alex N.', ini: 'AN', av: '#A9F0CC', slot: '12:20 pm' },
];

/** US map pins: left/top in % of the map, entrance delay, pulse delay. */
export const MAP_PINS: [string, number, number, number, number][] = [
  ['Seattle', 15.646, 13.086, 0.350, 0.90], ['Portland', 14.031, 19.342, 0.405, 1.01],
  ['SF', 10.094, 43.794, 0.460, 1.12], ['LA', 14.688, 58.297, 0.515, 1.23],
  ['San Diego', 15.823, 63.187, 0.570, 1.34], ['Phoenix', 24.427, 63.524, 0.625, 1.45],
  ['Denver', 37.250, 45.565, 0.680, 1.56], ['Dallas', 49.594, 69.325, 0.735, 1.67],
  ['Austin', 47.927, 77.454, 0.790, 1.78], ['Houston', 52.021, 79.140, 0.845, 1.89],
  ['Minneapolis', 54.781, 29.444, 0.900, 2.00], ['Chicago', 63.281, 38.735, 0.955, 2.11],
  ['Detroit', 69.885, 36.054, 1.010, 2.22], ['Nashville', 65.656, 57.150, 1.065, 2.33],
  ['Atlanta', 70.042, 64.283, 1.120, 2.44], ['Miami', 79.552, 88.179, 1.175, 2.55],
  ['DC', 79.958, 44.621, 1.230, 2.66], ['NYC', 83.687, 37.268, 1.285, 2.77],
  ['Boston', 87.125, 30.320, 1.340, 2.88],
];

export const TURNOUT = [
  'Invite sent to the whole team',
  'Calendar hold on every desk',
  'Signage up at reception',
  'Reminder the day before',
  'Every slot filled',
];
