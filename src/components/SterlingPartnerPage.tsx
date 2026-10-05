import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { MENU_SERVICES, MENU_GALLERY_KEYS, MenuService } from '../utils/menuServices';
import StationModal, { useGalleryByKey, type ModalStation } from './sponsor/StationModal';
import '../styles/proposal-refresh.css';

/**
 * SterlingRisk partner one-pager — personalized broker page at /partners/sterling.
 * Duplicated from WellnessFundsOnePager (2026-08-21, deliberately a separate file
 * so the public /wellness-funds page stays untouched) and reframed to talk TO the
 * broker: help their clients deploy carrier funds, packages, partner benefits
 * (10% off non-fund services), CLE for law firm clients. CTA books Caren.
 *
 * Design (2026-10-05): the conference partner page's system
 * (sponsor/SponsorOnePager.tsx): navy hero with the partner mark, rounded
 * panels that overlap as you scroll, centered section heads, one card
 * system and the shared service pop-out (sponsor/StationModal.tsx).
 * Copy is unchanged.
 */

/* ── Design tokens (same values as SponsorOnePager) ── */
const GUT = 'px-6 md:px-10 lg:px-[100px]';
const COL = 'w-full max-w-[1720px] mx-auto';
const INK = 'text-[#2A5468]';
const INK_META = 'text-[#45596A]';
const CARD_R = 'rounded-[28px]';
const CARD_PAD = 'p-7 md:p-8';
const SHADOW = 'shadow-[0_1px_2px_rgba(3,34,50,.05),0_10px_30px_rgba(3,34,50,.06)]';
const CARD = `${CARD_R} bg-white border border-[#E2E9E8] ${SHADOW}`;
const CARD_TITLE = 'm-0 text-[22px] md:text-[24px] font-bold leading-[1.15] tracking-[-.025em]';
const CARD_KICKER = 'm-0 text-[12px] font-extrabold uppercase tracking-[.09em]';
const CARD_BODY = 'm-0 text-[16px] font-medium leading-[1.55]';
const CTA_BTN = 'h-[52px] inline-flex items-center gap-2.5 px-8 rounded-full bg-shortcut-coral text-white text-[17px] font-bold tracking-[-.01em] shadow-[0_4px_14px_rgba(255,80,80,.3)] transition-transform duration-500 hover:-translate-y-[3px]';

const MAILTO = 'mailto:caren@getshortcut.co';

// 19 coverage-map city dots, viewBox 960×593 (from the design spec).
const MAP_DOTS: [number, number][] = [
  [150.2, 77.6], [134.7, 114.7], [96.9, 259.7], [141, 345.7], [151.9, 374.7],
  [234.5, 376.7], [357.6, 270.2], [476.1, 411.1], [460.1, 459.3], [499.4, 469.3],
  [525.9, 174.6], [607.5, 229.7], [670.9, 213.8], [630.3, 338.9], [672.4, 381.2],
  [763.7, 522.9], [767.6, 264.6], [803.4, 221], [836.4, 179.8],
];

const A = '/wellness-funds';
// Gallery = real event media (Will 2026-07-11): Cencora massage photo (from the proposal
// gallery, Supabase storage), plus the DraftKings/BCG/Wix event tiles. All tagged
// "Service @ Company".
const CENCORA_PHOTO = 'https://oxigtmlqqfbhzekpdalt.supabase.co/storage/v1/object/public/proposal-gallery/massage/1778730425338-dhy6o2.jpg';

// Fund-eligible services ONLY (carrier_wellness_funds.md): massage, stretch,
// mind-body and group fitness — the carriers' "group exercise / stress
// management" categories. Beauty services and headshots are not fund-eligible
// and must never appear in the fund menu. Cards + pop-out reuse MENU_SERVICES
// from the service-menu page so the two surfaces share one copy source.
const FUND_SERVICE_IDS = [
  'massage', 'assisted-stretch', 'mindfulness', 'sound-bath',
  'yoga', 'strength-sculpt', 'dance-cardio', 'somatic-movement',
];
const FUND_SERVICES: MenuService[] = FUND_SERVICE_IDS
  .map(id => MENU_SERVICES.find(s => s.id === id))
  .filter((s): s is MenuService => !!s);
// Sound-bath card art is photographic; keep the menu page's framing.
const ART_POS: Record<string, string> = { 'sound-bath': 'center 42%' };
// Card tints: the conference page's station palette.
const TINT: Record<string, string> = {
  massage: '#9EFAFF', 'assisted-stretch': '#A9F0CC', mindfulness: '#C7CBFB', 'sound-bath': '#FFCBA6',
  yoga: '#FEDC64', 'strength-sculpt': '#F7BBFF', 'dance-cardio': '#FFCBA6', 'somatic-movement': '#A9F0CC',
};

/** A menu service in the shape the shared pop-out reads. */
const toStation = (s: MenuService): ModalStation => ({
  name: s.name,
  image: s.image,
  cropArt: !!s.cropArt,
  tint: TINT[s.id] || '#EAF7F8',
  imagePos: ART_POS[s.id] || s.imagePos,
  detail: {
    group: 'What the fund covers',
    desc: s.desc,
    bring: s.bring.map(b => [b.lead, b.rest] as [string, string]),
    colKind: s.columnKind,
    items: s.items.map(it => [it.lead || '', it.rest] as [string, string]),
    metaFooter: s.metaFooter,
    photos: s.photos || [],
    galleryKeys: MENU_GALLERY_KEYS[s.id] || [],
  },
});

// Hero pills: fund-eligible services only, each jumps to the menu.
const HERO_PILLS = [
  { label: 'Massage', fill: '#9EFAFF', delay: 0.4 },
  { label: 'Assisted stretch', fill: '#A9F0CC', delay: 0.58 },
  { label: 'Mindfulness', fill: '#C7CBFB', delay: 0.76 },
  { label: 'Sound baths', fill: '#FFCBA6', delay: 0.95 },
  { label: 'Yoga', fill: '#FEDC64', delay: 1.13 },
];

// Package lineup chips: which packages carrier funds pay for vs the 10% partner
// rate (beauty + headshots are never claimed as fund-payable — the claim rule).
const FUND_ELIGIBLE_PKGS = new Set(['reset-zone', 'mindful-reset', 'stretch-lab', 'movement-studio', 'sound-sanctuary']);

// Client logo marquee + testimonial assets shared with the conferences &
// retreats page (public/conference/onepager/*).
const C = '/conference/onepager';

// Hero slides: static real event photos only, massage in action first, from the
// proposal gallery (Supabase storage). Portrait photos (Cencora 3:4, Wix 2:3) are
// `fit` slides: letterboxed over a blurred cover copy instead of hard-cropping.
const GAL = 'https://oxigtmlqqfbhzekpdalt.supabase.co/storage/v1/object/public/proposal-gallery';
const STAGE_SLIDES: { src: string; tag: string; fit?: boolean; pos?: string }[] = [
  { src: CENCORA_PHOTO, tag: 'Massage @ Cencora', fit: true },
  { src: `${GAL}/massage/1784325356154-vhti6y.jpg`, tag: 'Massage @ BCG' },
  { src: `${GAL}/nails/1784325589704-cw5v3l.jpg`, tag: 'Manicures @ DraftKings' },
  { src: '/wellness-funds/gallery/wix.png', tag: 'Massage @ Wix.com', fit: true },
  { src: `${C}/svc/crystal-sound-bath-rooftop.webp`, tag: 'Sound bath', pos: 'center 45%' },
  { src: `${C}/svc/stretch-mobility.webp`, tag: 'Assisted stretch', pos: 'center 40%' },
];

// Package lineup: conference package names, images and prices, with the copy
// re-grounded in the proposal system's office framing (SERVICE_DESC in
// src/components/proposal/data.ts). Regular corporate services, not
// conference or express services. Capacity figures confirmed by Will
// (2026-07-22, see conferencePackages.ts).
const BAR: Record<string, string> = {
  navy: 'bg-shortcut-blue text-[#9EFAFF]', cyan: 'bg-[#9EFAFF] text-shortcut-blue',
  pink: 'bg-[#F7BBFF] text-shortcut-blue', sun: 'bg-[#FEDC64] text-shortcut-blue',
};
const STERLING_PACKAGES = [
  {
    id: 'reset-zone', name: 'The Reset Zone', bar: 'cyan',
    image: `${GAL}/massage/1778730995486-9l9d6z.jpeg`,
    meta: 'Chair or table massage · 15–20 min/appointment',
    desc: 'We turn a conference room into a spa for the day. Expert therapists, soothing scents, and the break their people line up for.',
    bullets: ['Licensed therapists, insured for any building', 'Two chairs or twenty, up to 150 appointments a day', 'Chairs, tables, screens, scents and setup, all ours'],
  },
  {
    id: 'glow-lounge', name: 'The Glow Lounge', bar: 'pink',
    image: `${GAL}/hair/1784325543659-edz1yh.jpg`,
    meta: 'Hair, makeup or facials · 20–30 min/appointment',
    desc: 'Blowouts, makeup or express facials right at the office. People step out of a meeting and walk back in polished and camera ready.',
    bullets: ['Licensed stylists and estheticians', 'One station or six, up to 100 appointments a day', 'Pick the service that fits the day'],
  },
  {
    id: 'polish-bar', name: 'The Polish Bar', bar: 'sun',
    image: `${GAL}/nails/1784325589704-cw5v3l.jpg`,
    meta: 'Manicures · 20–30 min/appointment',
    desc: 'Manicures without the salon trip. Twenty quiet minutes away from the desk, then back to work looking sharp.',
    bullets: ['Licensed nail technicians, single-use kits', 'An intimate setup or 100 appointments a day', 'Dry service. No plumbing, no fumes, no cleanup for the office'],
  },
  {
    id: 'mindful-reset', name: 'The Mindful Reset', bar: 'navy',
    image: '/conference/services/mindfulness.png',
    meta: 'Facilitated sessions · 30–60 min',
    desc: 'Guided meditation and practical tools for stress and focus, dropped into the workday right where the team needs a breath.',
    bullets: ['Ten people or the whole floor, no cap', 'Morning drop-ins, midday resets, end-of-week wind-downs', 'In a conference room or over Zoom for the people at home'],
  },
  {
    id: 'studio', name: 'The Studio', bar: 'navy',
    image: '/conference/services/headshot.png',
    meta: 'Headshots · 8–12 min/session',
    desc: 'A pop-up studio at the office with real lighting and a photographer who directs the shot. A consistent, professional look across the whole team.',
    bullets: ['Pro photographer, lighting rig and posing direction', 'Retouched gallery back in five to seven days', 'Add hair and makeup touch-ups before the shot'],
  },
  {
    id: 'stretch-lab', name: 'The Stretch Lab', bar: 'cyan',
    image: `${C}/svc/stretch-mobility.webp`,
    meta: 'Assisted stretch · 10–20 min/appointment',
    desc: 'A specialist walks each person through a targeted stretch, one on one. Relief for the necks, shoulders and backs a desk produces.',
    bullets: ['Certified specialists, one on one, fully clothed', 'From a single table to 150 appointments a day', 'We bring the tables. Nothing needed from the office'],
  },
  {
    id: 'movement-studio', name: 'The Movement Studio', bar: 'pink',
    image: `${C}/gallery/dance-cardio-gallery.jpg`,
    meta: 'Group classes · 30–60 min',
    desc: 'Yoga, dance cardio, strength or mobility. A gentle morning reset or a real workout, whichever the team needs.',
    bullets: ['Certified instructors who read the room', 'A dozen people or the whole office, no cap', 'Mats, music and setup included. Any conference room, or over video'],
  },
  {
    id: 'sound-sanctuary', name: 'The Sound Sanctuary', bar: 'sun',
    image: `${C}/svc/crystal-sound-bath-rooftop.webp`,
    meta: 'Crystal sound baths · 30–60 min',
    desc: 'Crystal singing bowls, eyes closed, screens off. The quietest thirty minutes of the workweek, and the one people ask about after.',
    bullets: ['Trained sound practitioners', 'An intimate circle or the whole team, no cap', 'Bowls, mats and setup included. Nothing from the office'],
  },
];
// PNG package art carries a baked white margin; photos do not.
const PKG_PNG = (src: string) => src.endsWith('.png');

const PKG_GROUPS = [
  { key: 'fund', chip: 'Fund eligible', chipClass: 'bg-[#9EFAFF] text-shortcut-blue', line: 'Paid through your client’s carrier wellness fund.', pkgs: STERLING_PACKAGES.filter(p => FUND_ELIGIBLE_PKGS.has(p.id)) },
  { key: 'rate', chip: 'Partner rate · 10% off', chipClass: 'bg-shortcut-coral text-white', line: 'Beauty and headshots, at the SterlingRisk partner rate.', pkgs: STERLING_PACKAGES.filter(p => !FUND_ELIGIBLE_PKGS.has(p.id)) },
];

const BENEFITS = [
  { title: 'Fund deployment, done.', body: 'Pre-approval language, carrier-ready invoices, W-9, participation summaries. Your team never touches the paperwork, and neither does your client.' },
  { title: '10% off the rest of the menu.', body: 'Carrier funds do not cover beauty services or headshots. SterlingRisk clients get 10% off hair, nails, facials and headshots.', badge: 'Partner rate' },
  { title: 'A renewal story.', body: 'Value found inside a plan your client already pays for. A concrete win to bring to the negotiation, with the participation numbers to back it up.' },
  { title: 'The whole team, wherever they work.', body: 'Mindfulness, sound baths, yoga and nutrition coaching run in person or over Zoom, so remote employees are covered too. One vendor across your book, nationwide.' },
  { title: 'CLE for your law firm clients.', body: 'Pause, Breathe, Lead is a New York accredited 1.0 Law Practice Management CLE. We manage the accreditation, attendance tracking and credit reporting.' },
  { title: 'Programming built around each client.', body: 'Self-funded, 100 plus lives, a brutal busy season. We shape the program to the client, not the other way around.' },
];

// How it works: the conference page's numbered step cards.
const STEPS = [
  { k: 'Step one', title: 'Pre-approval.', body: 'We send your client’s carrier consultant the event details before the day, in the language they approve.', fill: '#9EFAFF', ink: '#003756' },
  { k: 'Step two', title: 'The day.', body: 'We run it onsite, open to their whole team. Your client approves a date and does nothing else.', fill: '#FEDC64', ink: '#003756' },
  { k: 'Step three', title: 'Documentation.', body: 'We format the invoice and the participation summary exactly the way the carrier needs.', fill: '#F7BBFF', ink: '#003756' },
  { k: 'Step four', title: 'Reimbursed.', body: 'The fund pays. With Aetna, it often pays us directly, so your client never fronts the cash.', fill: '#003756', ink: '#ffffff' },
];

const CLIENT_LOGOS = [
  { src: `${C}/logos/draftkings.svg`, alt: 'DraftKings' },
  { src: `${C}/logos/nfl.svg`, alt: 'NFL', tall: true },
  { src: `${C}/logos/bcg.svg`, alt: 'BCG' },
  { src: `${C}/logos/wix.svg`, alt: 'Wix' },
  { src: `${C}/logos/tripadvisor.svg`, alt: 'Tripadvisor' },
  { src: `${C}/logos/pwc.svg`, alt: 'PwC' },
  { src: `${C}/logos/paramount.svg`, alt: 'Paramount' },
  { src: `${C}/logos/warner-bros.svg`, alt: 'Warner Bros.', tall: true },
  { src: `${C}/logos/white-case.svg`, alt: 'White & Case' },
  { src: `${C}/logos/mtv.svg`, alt: 'MTV' },
];

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** True once the element has scrolled into view. */
function useInView<T extends HTMLElement>(threshold = 0.06) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) { setInView(true); return; }
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect(); } },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'} ${className}`}
      style={{ transitionTimingFunction: 'cubic-bezier(.22,1,.36,1)' }}
    >
      {children}
    </div>
  );
}

function Panel({ id, children, tone = 'white' }: {
  id?: string; children: React.ReactNode; tone?: 'white' | 'tint' | 'navy';
}) {
  const bg = tone === 'white' ? 'bg-white' : tone === 'tint' ? 'bg-neutral-light-gray' : 'bg-shortcut-blue';
  return (
    <section className={`relative -mt-[50px] rounded-t-[50px] py-16 md:py-28 ${bg}`}>
      {id && <div data-toc id={id} className="absolute -top-20" />}
      <Reveal className={`${GUT} ${COL}`}>{children}</Reveal>
    </section>
  );
}

function SectionHead({ kicker, title, accent, sub, dark = false }: {
  kicker: string; title: string; accent?: string; sub?: React.ReactNode; dark?: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-3.5 mb-12 md:mb-14">
      <p className={`m-0 text-[12px] font-extrabold uppercase tracking-[.09em] ${dark ? 'text-shortcut-teal' : INK_META}`}>
        {kicker}
      </p>
      <h2 className={`m-0 text-[30px] md:text-[44px] font-bold leading-[1.05] tracking-[-.035em] max-w-[22ch] text-balance ${dark ? 'text-white' : 'text-shortcut-blue'}`}>
        {title}
        {accent && <span className="block text-shortcut-coral">{accent}</span>}
      </h2>
      {sub && (
        <p className={`m-0 text-[16px] md:text-[17px] font-medium leading-[1.55] max-w-[58ch] ${dark ? 'text-white/80' : INK}`}>
          {sub}
        </p>
      )}
    </div>
  );
}

function LogoRow({ logos, reverse = false }: { logos: typeof CLIENT_LOGOS; reverse?: boolean }) {
  return (
    <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
      <div className={`flex w-max animate-logo-marquee will-change-transform motion-reduce:animate-none ${reverse ? '[animation-direction:reverse]' : ''}`}>
        {[false, true].map((dup) => (
          <div key={String(dup)} className="flex items-center gap-12 pr-12" aria-hidden={dup}>
            {logos.map((logo) => (
              <img
                key={`${logo.src}${dup}`}
                src={logo.src}
                alt={dup ? '' : logo.alt}
                className={`${logo.tall ? 'h-[38px]' : 'h-[28px]'} w-auto flex-none [filter:grayscale(1)_sepia(1)_saturate(4)_hue-rotate(165deg)_brightness(.85)]`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Count-up stat (0 → end over 1.1s), started when the tile scrolls into view.
function CountUp({ end, suffix }: { end: number; suffix: string }) {
  const { ref, inView } = useInView<HTMLSpanElement>(0.5);
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion()) { setValue(end); return; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 1100);
      setValue(Math.round(end * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, end]);
  return <span ref={ref}>{value}<span className="text-shortcut-coral">{suffix}</span></span>;
}

const STATS = [
  { end: 500, suffix: '+', label: 'companies served' },
  { end: 92, suffix: '%', label: 'of booked slots get used, across all events' },
  { end: 87, suffix: '%', label: 'of companies rebook' },
];

/** The menu card: the conference page's station card (tinted art, `+` corner,
 *  name and meta under it). */
function ServiceCard({ s, onOpen }: { s: MenuService; onOpen?: () => void }) {
  const Tag = onOpen ? 'button' : 'div';
  return (
    <Tag
      {...(onOpen ? { type: 'button' as const, onClick: onOpen, 'aria-label': `More about ${s.name.toLowerCase()}` } : {})}
      className="group flex flex-col text-left"
    >
      <span
        className={`relative block aspect-[4/3] w-full overflow-hidden rounded-[22px] ${SHADOW}`}
        style={{ background: TINT[s.id] || '#55BA90' }}
      >
        <img
          src={s.image}
          alt=""
          loading="lazy"
          className={`absolute inset-0 h-full w-full object-cover transition-transform duration-500 ${s.cropArt ? 'scale-110 group-hover:scale-[1.14]' : 'group-hover:scale-[1.04]'}`}
          style={ART_POS[s.id] || s.imagePos ? { objectPosition: ART_POS[s.id] || s.imagePos } : undefined}
        />
        {onOpen && (
          <span className="absolute right-2.5 top-2.5 sm:right-3.5 sm:top-3.5 z-[2] grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full bg-white text-[24px] font-medium leading-none text-shortcut-blue shadow-[0_2px_10px_rgba(3,34,50,.18)] transition-transform duration-300 group-hover:scale-110">
            +
          </span>
        )}
      </span>
      <span className="flex flex-col gap-1.5 px-0.5 pt-3.5 sm:pt-[18px]">
        <span className="text-[17px] sm:text-[20px] font-semibold leading-[1.2] tracking-[-.015em] text-shortcut-blue">{s.name}</span>
        <span className={`text-[13px] sm:text-[14px] font-semibold leading-[1.4] ${INK_META}`}>{s.meta}</span>
      </span>
    </Tag>
  );
}

/* Nutrition closes the menu grid. It widens to fill whatever the last row
   leaves open, so the grid never ends on a lone card: across both columns
   on phones when the count is odd, and across two or three columns on
   desktop. Spelled out in full so Tailwind keeps the classes. */
const NUTRI_SPAN: Record<string, string> = {
  'odd-0': 'col-span-2 xl:col-span-1', 'odd-1': 'col-span-2 xl:col-span-3', 'odd-2': 'col-span-2 xl:col-span-2',
  'even-0': 'col-span-1 xl:col-span-1', 'even-1': 'col-span-1 xl:col-span-3', 'even-2': 'col-span-1 xl:col-span-2',
};
const NUTRI_ART: Record<string, string> = {
  'odd-0': 'aspect-[8/3] xl:aspect-[4/3]', 'odd-1': 'aspect-[8/3] xl:aspect-[4/1]', 'odd-2': 'aspect-[8/3] xl:aspect-[8/3]',
  'even-0': 'aspect-[4/3]', 'even-1': 'aspect-[4/3] xl:aspect-[4/1]', 'even-2': 'aspect-[4/3] xl:aspect-[8/3]',
};

/** Nutrition coaching runs remote too, but has no pop-out of its own.
 *  `total` is the number of cards in the grid, this one included. */
function NutritionCard({ total }: { total: number }) {
  const key = `${total % 2 ? 'odd' : 'even'}-${total % 3}`;
  return (
    <div className={`flex flex-col text-left ${NUTRI_SPAN[key]}`}>
      <span className={`relative block w-full overflow-hidden rounded-[22px] bg-[#55BA90] ${NUTRI_ART[key]} ${SHADOW}`}>
        <img src={`${A}/onepager/nutrition-avocado.png`} alt="" loading="lazy" className="absolute inset-0 m-auto h-[76%] w-auto max-w-[60%] object-contain" />
      </span>
      <span className="flex flex-col gap-1.5 px-0.5 pt-3.5 sm:pt-[18px]">
        <span className="text-[17px] sm:text-[20px] font-semibold leading-[1.2] tracking-[-.015em] text-shortcut-blue">Nutrition coaching</span>
        <span className={`text-[13px] sm:text-[14px] font-semibold leading-[1.4] ${INK_META}`}>In person or virtual</span>
      </span>
    </div>
  );
}

/** "Booking in three taps": the three booking screens, cycling. */
function MiniPhone() {
  const [screen, setScreen] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const t = window.setInterval(() => setScreen(i => (i + 1) % 3), 2400);
    return () => window.clearInterval(t);
  }, []);
  const show = (i: number) => `absolute inset-0 transition-opacity duration-500 ${screen === i ? 'opacity-100' : 'opacity-0 pointer-events-none'}`;
  const opt = 'flex items-center justify-between rounded-[9px] border-[1.5px] px-2.5 py-[7px] mb-1.5 text-[11px] font-semibold text-[#032232]';
  return (
    <div className="w-[200px] rounded-t-[18px] bg-white px-3 pt-3 pb-3.5 shadow-[0_-6px_24px_rgba(3,34,50,.18)]">
      <div className="mb-2 flex items-center gap-1.5 border-b border-[#eef2f4] pb-2 text-[10.5px] font-bold text-[#032232]">
        <span className="grid h-4 w-4 place-items-center rounded-full bg-shortcut-coral text-[9px] font-bold text-white">A</span>
        Wellness Day
        <span className="ml-auto font-semibold text-[#9ab1ba]">{screen + 1}/3</span>
      </div>
      <div className="relative h-[114px]">
        <div className={show(0)}>
          <p className="m-0 mb-1.5 text-[9.5px] font-bold uppercase tracking-[.08em] text-[#9ab1ba]">Pick your service</p>
          <div className={`${opt} border-shortcut-coral bg-shortcut-coral/[.06]`}>Chair massage<i className="h-3 w-3 rounded-full border-[1.5px] border-shortcut-coral bg-shortcut-coral shadow-[inset_0_0_0_2.5px_#fff]" /></div>
          <div className={`${opt} border-[#E2E9E8]`}>Table massage<i className="h-3 w-3 rounded-full border-[1.5px] border-[#cfd9d8]" /></div>
          <div className="rounded-[9px] bg-shortcut-coral py-2 text-center text-[11px] font-bold text-white">Next</div>
        </div>
        <div className={show(1)}>
          <p className="m-0 mb-1.5 text-[9.5px] font-bold uppercase tracking-[.08em] text-[#9ab1ba]">Pick your time</p>
          <div className="mb-1.5 grid grid-cols-2 gap-[5px] text-center text-[10.5px] font-bold text-[#032232]">
            <span className="rounded-lg border-[1.5px] border-[#E2E9E8] py-1.5">11:00</span>
            <span className="rounded-lg border-[1.5px] border-[#E2E9E8] py-1.5 line-through opacity-35">11:20</span>
            <span className="rounded-lg border-[1.5px] border-shortcut-coral bg-shortcut-coral py-1.5 text-white">11:40</span>
            <span className="rounded-lg border-[1.5px] border-[#E2E9E8] py-1.5">12:00</span>
          </div>
          <div className="rounded-[9px] bg-shortcut-coral py-2 text-center text-[11px] font-bold text-white">Book my slot</div>
        </div>
        <div className={show(2)}>
          <div className="mx-auto mb-2 mt-2.5 grid h-[30px] w-[30px] place-items-center rounded-full bg-[#55BA90]">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-white [stroke-width:3]"><path d="M20 6 9 17l-5-5" /></svg>
          </div>
          <div className="text-center text-[13px] font-extrabold text-[#032232]">You&rsquo;re booked!</div>
          <div className="mt-[3px] text-center text-[10px] text-[#7d939e]">Chair massage · 11:40 AM</div>
        </div>
      </div>
    </div>
  );
}

/** "One vendor. Every office.": the coverage map, dots popping in on view. */
function CoverageMap() {
  const { ref, inView } = useInView<HTMLDivElement>(0.3);
  return (
    <div ref={ref} className="relative mt-auto pt-3">
      <img className="block h-auto w-full" src={`${A}/onepager/us-map.svg`} alt="Shortcut coverage across the US" />
      <svg className="absolute inset-x-0 bottom-0 top-3 h-[calc(100%-12px)] w-full overflow-visible" viewBox="0 0 960 593" aria-hidden="true">
        {MAP_DOTS.map(([cx, cy], idx) => (
          <g
            key={idx}
            className={`transition-transform duration-[550ms] ease-[cubic-bezier(.22,1.5,.5,1)] ${inView ? 'scale-100' : 'scale-0'}`}
            style={{ transformOrigin: `${cx}px ${cy}px`, transitionDelay: `${(0.4 + idx * 0.06).toFixed(2)}s` }}
          >
            <circle cx={cx} cy={cy} r="16" fill="#FF5050" opacity=".25" />
            <circle cx={cx} cy={cy} r="7" fill="#FF5050" />
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function SterlingPartnerPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [mode, setMode] = useState<'all' | 'remote'>('all');
  const [stageIdx, setStageIdx] = useState(0);
  const [activeSection, setActiveSection] = useState('');
  const gallery = useGalleryByKey();

  // "On-site or remote" filters like /menu: remote-capable services only.
  const visibleServices = mode === 'remote' ? FUND_SERVICES.filter(s => s.remote) : FUND_SERVICES;
  const visibleCount = visibleServices.length + 1; // + nutrition, which runs remote too
  const stations = useMemo(() => visibleServices.map(toStation), [visibleServices]);

  useEffect(() => {
    document.title = 'Shortcut × SterlingRisk';
  }, []);

  // Hero slideshow auto-rotate (4.5s per slide).
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const t = setInterval(() => setStageIdx(i => (i + 1) % STAGE_SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const sections = document.querySelectorAll('[data-toc]');
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActiveSection(e.target.id); }),
      { rootMargin: '-15% 0px -70% 0px' }
    );
    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  const tocItems = [
    { id: 'funds', label: 'The funds' },
    { id: 'menu', label: 'The menu' },
    { id: 'packages', label: 'Packages' },
    { id: 'benefits', label: 'Partner benefits' },
    { id: 'how', label: 'How it works' },
  ];

  return (
    <div className="min-h-screen bg-neutral-light-gray font-['Outfit',system-ui,sans-serif]">

      {/* ── Sticky bar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-shortcut-blue/[.06]">
        <div className={`${GUT} ${COL} h-14 flex items-center justify-between`}>
          <div className="flex items-center gap-3 md:gap-4">
            <img src="/partners/sterlingrisk-logo.png" alt="SterlingRisk" className="h-7 w-auto" />
            <div className="h-4 w-px bg-shortcut-blue/15" aria-hidden="true" />
            <img src="/shortcut-logo-blue.svg" alt="Shortcut" className="h-4 w-auto" />
          </div>
          <div className="hidden lg:flex items-center gap-7">
            {tocItems.map((t) => (
              <a
                key={t.id}
                href={`#${t.id}`}
                className={`text-[13px] font-semibold tracking-[-.01em] transition-colors ${activeSection === t.id ? 'text-shortcut-blue' : 'text-shortcut-blue/40 hover:text-shortcut-blue/70'}`}
              >
                {t.label}
              </a>
            ))}
          </div>
          <a href={MAILTO} className="h-9 inline-flex items-center px-4 rounded-full bg-shortcut-coral text-white text-[13.5px] font-bold">
            Email Caren
          </a>
        </div>
      </nav>

      <main className="pt-14">

        {/* ══════════ HERO ══════════ */}
        <section className="relative bg-shortcut-blue pt-14 md:pt-24 lg:pt-[120px] pb-20 md:pb-28 lg:pb-[146px]">
          <div className={`${GUT} ${COL} relative z-10`}>
            <div className="flex items-center gap-5 md:gap-7 mb-10 md:mb-14 pb-7 border-b border-white/15">
              <span className="inline-flex items-center rounded-xl bg-white px-3 py-2">
                <img src="/partners/sterlingrisk-logo.png" alt="SterlingRisk" className="h-8 md:h-10 w-auto" />
              </span>
              <div className="h-7 md:h-10 w-px bg-white/25" aria-hidden="true" />
              <img src="/conference/shortcut-logo-white.svg" alt="Shortcut" className="h-6 md:h-8 w-auto" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,620px)_minmax(380px,1fr)] gap-10 xl:gap-16 items-center">
              <div className="min-w-0">
                <p className="m-0 text-[12px] font-extrabold uppercase tracking-[.09em] text-shortcut-teal mb-6">
                  A Shortcut partnership for SterlingRisk
                </p>
                <h1 className="m-0 text-[34px] md:text-[48px] lg:text-[56px] font-semibold leading-[1.08] tracking-[-.03em] text-white max-w-[18ch] text-balance">
                  Let&rsquo;s put your clients&rsquo; <span className="text-shortcut-teal">wellness funds to work.</span>
                </h1>
                <p className="m-0 mt-[22px] text-[17px] md:text-[19px] font-medium leading-[1.5] text-white/[.86] max-w-[46ch] text-balance">
                  The wellness vendor you, your clients, and their people will thank you for.
                </p>

                <div className="flex flex-wrap items-center gap-6 mt-8">
                  <a href="#menu" className={CTA_BTN}>See what the fund covers</a>
                  <a href="#how" className="text-[15px] font-bold tracking-[-.012em] text-white hover:text-shortcut-teal transition-colors">
                    How it works &rarr;
                  </a>
                </div>

                <div className="pv-root !bg-transparent mt-9 flex max-w-[620px] flex-wrap gap-2.5">
                  {HERO_PILLS.map((p) => (
                    <a
                      key={p.label}
                      href="#menu"
                      className="pv-hero-pill"
                      style={{ ['--tilt' as string]: '0deg', ['--dx' as string]: '0px', background: p.fill, animationDelay: `${p.delay}s` } as React.CSSProperties}
                    >
                      {p.label}
                    </a>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] bg-white p-4 shadow-[0_30px_70px_rgba(3,34,50,.28)]">
                <div className="relative aspect-[3/2] overflow-hidden rounded-[20px] bg-shortcut-teal">
                  {STAGE_SLIDES.map((s, i) => (
                    <div key={s.src} className={`absolute inset-0 transition-opacity duration-700 ${i === stageIdx ? 'opacity-100' : 'opacity-0'}`} aria-hidden={i !== stageIdx}>
                      {s.fit ? (
                        <>
                          <img src={s.src} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover scale-[1.12] blur-[18px] brightness-[.92]" />
                          <img src={s.src} alt={s.tag} className="absolute inset-0 h-full w-full object-contain" />
                        </>
                      ) : (
                        <img src={s.src} alt={s.tag} className="absolute inset-0 h-full w-full object-cover" style={s.pos ? { objectPosition: s.pos } : undefined} />
                      )}
                      <span className="absolute left-[18px] bottom-[18px] z-[2] h-10 inline-flex items-center rounded-full bg-white/[.94] px-4 text-[14px] font-extrabold tracking-[-.012em] text-shortcut-blue">
                        {s.tag}
                      </span>
                    </div>
                  ))}
                  <div className="absolute right-[18px] bottom-[31px] z-[3] flex gap-2">
                    {STAGE_SLIDES.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setStageIdx(i)}
                        aria-label={`Slide ${i + 1}`}
                        className={`h-[9px] w-[9px] rounded-full transition-transform ${i === stageIdx ? 'bg-white scale-125' : 'bg-white/50'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ THE FUNDS ══════════ */}
        <Panel id="funds">
          <SectionHead
            kicker="The funds"
            title="Three carriers, three wellness funds."
            accent="We know how to put them to work."
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { src: '/partners/carriers/cigna.svg', alt: 'Cigna', h: 'h-12' },
              { src: '/partners/carriers/aetna.svg', alt: 'Aetna', h: 'h-8' },
              { src: '/partners/carriers/anthem.svg', alt: 'Anthem', h: 'h-[34px]' },
            ].map(c => (
              <div key={c.alt} className={`${CARD} flex h-[150px] items-center justify-center`}>
                <img src={c.src} alt={c.alt} className={`${c.h} w-auto`} />
              </div>
            ))}
          </div>
          <p className={`m-0 mx-auto mt-10 max-w-[60ch] text-center text-[17px] md:text-[19px] font-medium leading-[1.55] ${INK}`}>
            Your clients are sitting on unused wellness funds, either because they do not know the funds exist or because they cannot find a reliable partner to deploy them with. <b className="font-bold text-shortcut-blue">We are that partner.</b> Pre-approval language, carrier paperwork, the day itself, all handled. You bring the win to renewal.
          </p>
        </Panel>

        {/* ══════════ THE MENU ══════════ */}
        <Panel id="menu" tone="tint">
          <SectionHead
            kicker="The menu"
            title="What the fund covers."
            accent="Massage to mindfulness, all fund eligible."
          />
          <div className="mb-8 flex flex-wrap items-center justify-center gap-4">
            <div className="flex gap-1 rounded-full bg-white p-1 shadow-[0_1px_2px_rgba(3,34,50,.05)]" role="radiogroup" aria-label="Where">
              {([
                { v: 'all' as const, l: 'All services' },
                { v: 'remote' as const, l: 'On-site or remote' },
              ]).map(opt => (
                <button
                  key={opt.v}
                  type="button"
                  role="radio"
                  aria-checked={mode === opt.v}
                  onClick={() => { setMode(opt.v); setOpenIdx(null); }}
                  className={`rounded-full px-4 py-2 text-[13.5px] font-bold transition-colors ${mode === opt.v ? 'bg-shortcut-blue text-white' : `${INK_META} hover:text-shortcut-blue`}`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
            <span className={`text-[13.5px] font-semibold ${INK_META}`}>{visibleCount} service{visibleCount === 1 ? '' : 's'}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 sm:gap-y-10 xl:grid-cols-3">
            {visibleServices.map((s, i) => <ServiceCard key={s.id} s={s} onOpen={() => setOpenIdx(i)} />)}
            <NutritionCard total={visibleCount} />
          </div>
          <p className={`m-0 mx-auto mt-12 max-w-[58ch] text-center text-[16px] md:text-[17px] font-medium leading-[1.55] ${INK}`}>
            Delivered onsite by <b className="font-bold text-shortcut-blue">licensed, vetted pros</b>, one team running the whole day, and your clients&rsquo; remote employees are covered too.
          </p>
        </Panel>

        {/* ══════════ PACKAGES ══════════ */}
        <Panel id="packages">
          <SectionHead
            kicker="Packages"
            title="Our most popular packages."
            accent="Pick one, or combine."
          />
          <div className="mb-8 flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-6 sm:gap-y-3">
            {PKG_GROUPS.map(group => (
              <div key={group.key} className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-2.5">
                <span className={`inline-flex h-7 flex-none items-center whitespace-nowrap rounded-full px-3 text-[11.5px] font-extrabold uppercase tracking-[.06em] ${group.chipClass}`}>{group.chip}</span>
                <span className={`text-[14.5px] font-medium ${INK}`}>{group.line}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {PKG_GROUPS.flatMap(group => group.pkgs.map(pkg => (
              <div key={pkg.id} className={`${CARD} row-span-5 grid grid-rows-subgrid gap-0 overflow-hidden`}>
                <div className="relative aspect-[16/10] overflow-hidden bg-neutral-light-gray">
                  <img src={pkg.image} alt="" loading="lazy" className={`absolute inset-0 h-full w-full object-cover ${PKG_PNG(pkg.image) ? 'scale-110' : ''}`} />
                  <span className={`absolute right-3 top-3 inline-flex h-7 items-center rounded-full border-2 border-white px-2.5 text-[10.5px] font-extrabold uppercase tracking-[.06em] shadow-[0_2px_10px_rgba(3,34,50,.25)] ${group.chipClass}`}>
                    {group.key === 'fund' ? 'Fund eligible' : '10% off'}
                  </span>
                </div>
                <div className={`px-6 py-3 text-[17px] font-bold tracking-[-.015em] ${BAR[pkg.bar]}`}>{pkg.name}</div>
                <p className={`m-0 px-6 pt-5 text-[13.5px] font-semibold leading-[1.4] ${INK_META}`}>{pkg.meta}</p>
                <p className={`m-0 px-6 pt-2.5 text-[15px] font-medium leading-[1.55] ${INK}`}>{pkg.desc}</p>
                <div className="px-6 pb-7 pt-5">
                  <ul className="m-0 grid list-none gap-2.5 border-t border-[#E2E9E8] p-0 pt-5">
                    {pkg.bullets.map(b => (
                      <li key={b} className="flex gap-2.5 text-[14px] font-medium leading-[1.45] text-shortcut-blue">
                        <span className="mt-[1px] grid h-[18px] w-[18px] flex-none place-items-center rounded-full bg-[#9EFAFF] text-[10px] font-extrabold text-shortcut-blue">✓</span>{b}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )))}
          </div>
          <p className={`m-0 mx-auto mt-12 max-w-[62ch] text-center text-[16px] md:text-[17px] font-medium leading-[1.55] ${INK}`}>
            Every package includes <b className="font-bold text-shortcut-blue">pros, gear, setup, self-serve booking, digital invites and onsite signage</b>. Fund eligible packages can be paid through your client&rsquo;s carrier wellness fund. Everything else carries the 10% partner rate.
          </p>
        </Panel>

        {/* ══════════ PARTNER BENEFITS ══════════ */}
        <Panel id="benefits" tone="tint">
          <SectionHead
            kicker="Partner benefits"
            title="Why partner with Shortcut."
            accent="For you and your clients."
          />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {BENEFITS.map(b => (
              <div key={b.title} className={`${CARD} ${CARD_PAD} relative ${b.badge ? '!border-2 !border-shortcut-coral' : ''}`}>
                {b.badge && (
                  <span className="absolute -top-3 right-6 inline-flex h-6 items-center rounded-full bg-shortcut-coral px-3 text-[11px] font-extrabold uppercase tracking-[.08em] text-white">
                    {b.badge}
                  </span>
                )}
                <h3 className={`${CARD_TITLE} text-shortcut-blue`}>{b.title}</h3>
                <p className={`${CARD_BODY} mt-3 ${INK}`}>{b.body}</p>
              </div>
            ))}
          </div>
        </Panel>

        {/* ══════════ WHAT SETS US APART (the website's bento) ══════════ */}
        <Panel id="apart">
          <SectionHead
            kicker="What sets us apart"
            title="Wellness their people show up for."
            accent="Loved by their teams. All handled for you."
          />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className={`${CARD_R} flex md:min-h-[400px] flex-col overflow-hidden bg-[#9EFBFF] px-7 md:px-8 pt-7 md:pt-8 ${SHADOW}`}>
              <p className={`${CARD_KICKER} text-[#018EA2]`}>The Shortcut pros</p>
              <h3 className={`${CARD_TITLE} mt-3 text-shortcut-blue`}>Pros you&rsquo;d book yourself.</h3>
              <p className={`${CARD_BODY} mt-3 text-[#032232]/75`}>Licensed, vetted and insured, professional, personal, reliable.</p>
              {/* The PNG carries a hairline about 1% from its top edge; the clip hides it. */}
              <img className="mx-auto mt-auto block h-[240px] md:h-[290px] w-auto [clip-path:inset(1.6%_0_0_0)]" src={`${A}/onepager/pros-guy-flush.png`} alt="A Shortcut pro" />
            </div>
            <div className={`${CARD_R} flex md:min-h-[400px] flex-col overflow-hidden bg-[linear-gradient(160deg,#FF6A5A,#FF5050)] px-7 md:px-8 pt-7 md:pt-8 ${SHADOW}`}>
              <p className={`${CARD_KICKER} text-white/85`}>Seamless tech</p>
              <h3 className={`${CARD_TITLE} mt-3 text-white`}>Booking in three taps.</h3>
              <p className={`${CARD_BODY} mt-3 text-white/90`}>Employees pick their own slot, no spreadsheets, no chasing.</p>
              <div className="mt-auto flex justify-center pt-8 md:pt-16"><div className="origin-bottom md:scale-[1.3]"><MiniPhone /></div></div>
            </div>
            <div className={`${CARD_R} flex md:min-h-[400px] flex-col overflow-hidden bg-[linear-gradient(160deg,#0A3E5C,#06293D)] px-7 md:px-8 pt-7 md:pt-8 pb-6 ${SHADOW}`}>
              <p className={`${CARD_KICKER} text-shortcut-teal`}>Nationwide coverage</p>
              <h3 className={`${CARD_TITLE} mt-3 text-white`}>One vendor. <span className="text-shortcut-teal">Every office.</span></h3>
              <p className={`${CARD_BODY} mt-3 text-white/75`}>One vetted network across all 50 states, one team to call.</p>
              <CoverageMap />
            </div>
            <div className={`${CARD_R} flex md:min-h-[400px] flex-col overflow-hidden bg-[linear-gradient(160deg,#9EFAFF,#6FE9F0)] px-7 md:px-8 pt-7 md:pt-8 pb-7 ${SHADOW}`}>
              <p className={`${CARD_KICKER} text-[#018EA2]`}>We fill every slot</p>
              <h3 className={`${CARD_TITLE} mt-3 text-shortcut-blue`}>Turnout. Solved.</h3>
              <p className={`${CARD_BODY} mt-3 text-[#032232]/75`}>Digital invites and onsite signage fill the calendar for you.</p>
              <div className="mt-auto pt-6">
                <div className="text-[52px] font-bold leading-none tracking-[-.04em] text-shortcut-blue">92%</div>
                <div className="mt-1.5 text-[14px] font-semibold text-[#175071]">of booked slots get used</div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#032232]/[.14]"><i className="block h-full w-[92%] rounded-full bg-shortcut-coral" /></div>
                <div className="mt-4 flex gap-2.5">
                  <div className="flex-1 rounded-xl bg-white/60 px-3 py-2.5"><b className="block text-[20px] font-bold text-shortcut-blue">87%</b><span className="text-[12px] font-semibold text-[#175071]">of companies rebook</span></div>
                  <div className="flex-1 rounded-xl bg-white/60 px-3 py-2.5"><b className="block text-[20px] font-bold text-shortcut-blue">0</b><span className="text-[12px] font-semibold text-[#175071]">admin work for you</span></div>
                </div>
              </div>
            </div>
          </div>
        </Panel>

        {/* ══════════ HOW IT WORKS ══════════ */}
        <Panel id="how" tone="tint">
          <SectionHead
            kicker="How it works"
            title="We handle the paperwork."
            accent="Four steps. None of them yours."
          />
          <ol className="m-0 p-0 list-none grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {STEPS.map((p, i) => (
              <li
                key={p.title}
                className={`relative flex min-h-[260px] flex-col overflow-hidden ${CARD_R} px-7 md:px-8 pt-7 md:pt-8 pb-[92px]`}
                style={{ background: p.fill, color: p.ink }}
              >
                <span aria-hidden="true" className="pointer-events-none absolute -bottom-[46px] -right-1 text-[132px] font-extrabold leading-none tracking-[-.06em] opacity-[.14]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className={`${CARD_KICKER} relative opacity-70`}>{p.k}</p>
                <h3 className={`${CARD_TITLE} relative mt-3 [color:inherit]`}>{p.title}</h3>
                <p className={`${CARD_BODY} relative mt-3 opacity-90`}>{p.body}</p>
              </li>
            ))}
          </ol>
        </Panel>

        {/* ══════════ PROOF ══════════ */}
        <Panel id="proof" tone="navy">
          <SectionHead
            dark
            kicker="What clients say"
            title="Booked once, kept forever."
            sub="BCG and DraftKings use us at every US office."
          />
          <div className="grid grid-cols-3 gap-3 md:gap-5">
            {STATS.map(st => (
              <div key={st.label} className="rounded-[20px] md:rounded-[28px] bg-white/[.06] border border-white/10 px-2 py-5 md:p-8 text-center">
                <div className="text-[30px] sm:text-[44px] md:text-[64px] font-bold leading-none tracking-[-.04em] text-shortcut-teal tabular-nums">
                  <CountUp end={st.end} suffix={st.suffix} />
                </div>
                <div className="mt-2 md:mt-3 text-[13px] md:text-[17px] font-medium leading-[1.35] md:leading-[1.45] text-white/85">{st.label}</div>
              </div>
            ))}
          </div>

          <div className={`mt-5 flex flex-col gap-7 ${CARD_R} bg-white py-9`} aria-label="Clients including DraftKings, the NFL, BCG, Wix, Tripadvisor, PwC, Paramount, Warner Bros., White & Case and MTV">
            <LogoRow logos={CLIENT_LOGOS.slice(0, 5)} />
            <LogoRow logos={CLIENT_LOGOS.slice(5)} reverse />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_1fr]">
            <div className={`${CARD_R} ${CARD_PAD} flex flex-col bg-white`}>
              <img className="mb-5 block h-[30px] w-auto self-start" src={`${C}/draftkings.svg`} alt="DraftKings" />
              <p className="m-0 text-[22px] md:text-[26px] font-bold leading-[1.28] tracking-[-.02em] text-shortcut-blue text-balance">Shortcut has become an extension of the DraftKings family.</p>
              <div className="mt-auto flex items-center gap-3.5 pt-6">
                <img src={`${C}/christian.jpeg`} alt="" className="h-11 w-11 flex-none rounded-full object-cover" />
                <div><b className="block text-[15px] text-shortcut-blue">Christian W.</b><span className={`block text-[13px] ${INK_META}`}>Employee Experience Specialist, DraftKings</span></div>
              </div>
            </div>
            <div className={`${CARD_R} ${CARD_PAD} flex flex-col bg-shortcut-teal`}>
              <img className="mb-5 block h-[30px] w-auto self-start" src={`${C}/logos/teads.svg`} alt="Teads" />
              <p className="m-0 text-[18px] md:text-[20px] font-bold leading-[1.4] tracking-[-.01em] text-shortcut-blue">They go above and beyond to make each event tailored to our team. An atmosphere that&rsquo;s both relaxing and enjoyable.</p>
              <div className="mt-auto flex items-center gap-3.5 pt-6">
                <img src={`${C}/allison.png`} alt="" className="h-11 w-11 flex-none rounded-full border-2 border-white object-cover" />
                <div><b className="block text-[15px] text-shortcut-blue">Allison B.</b><span className="block text-[13px] text-[#175071]">Sr. Manager, Compensation &amp; Benefits, Teads</span></div>
              </div>
            </div>
          </div>
        </Panel>

        {/* ══════════ NEXT STEP ══════════ */}
        <Panel>
          <div className="flex flex-col items-center text-center">
            <div className={`${CARD} ${CARD_PAD} mb-14 w-full max-w-[760px] text-left`}>
              <p className={`${CARD_KICKER} flex items-center gap-2 ${INK_META}`}>
                <span className="h-[7px] w-[7px] flex-none rounded-full bg-shortcut-coral" />
                One question for your next client call
              </p>
              <p className="m-0 mt-3 text-[18px] md:text-[20px] font-semibold leading-[1.45] text-shortcut-blue">
                Who is your medical carrier, and when does your plan year end? If the answer is Cigna, Aetna, or Anthem, there is probably money waiting.
              </p>
            </div>
            <SectionHead
              kicker="Next step"
              title="Let’s deploy your clients’ unused funds before the end of 2026."
              sub="Most plan years reset in December, and whatever is left goes back to the carrier. Tell us which clients come to mind and we’ll map the first events together."
            />
            <a href={MAILTO} className={`-mt-2 ${CTA_BTN}`}>
              Email Caren
              <ArrowUpRight size={19} strokeWidth={2.5} />
            </a>
            <div className={`mt-12 pt-8 w-full border-t border-[#E2E9E8] flex flex-col items-center gap-3 text-center text-[13px] sm:flex-row sm:justify-between sm:text-left ${INK_META}`}>
              <span>Trusted by <b className="font-semibold text-shortcut-blue">500+ companies</b>, including BCG and DraftKings. <b className="font-semibold text-shortcut-blue">87%</b> rebook, and <b className="font-semibold text-shortcut-blue">92%</b> of booked slots get used.</span>
              <span className="text-[11px] font-bold uppercase tracking-[.12em]">Prepared for SterlingRisk</span>
            </div>
          </div>
        </Panel>

      </main>

      {openIdx !== null && stations[openIdx] && (
        <StationModal
          stations={stations}
          index={openIdx}
          gallery={gallery}
          onClose={() => setOpenIdx(null)}
          onGo={setOpenIdx}
        />
      )}
    </div>
  );
}
