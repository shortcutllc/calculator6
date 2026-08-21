import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MENU_SERVICES, MenuService } from '../utils/menuServices';

/**
 * SterlingRisk partner one-pager — personalized broker page at /partners/sterling.
 * Duplicated from WellnessFundsOnePager (2026-08-21, deliberately a separate file
 * so the public /wellness-funds page stays untouched) and reframed to talk TO the
 * broker: help their clients deploy carrier funds, packages, partner benefits
 * (10% off non-fund services), CLE for law firm clients. CTA books Caren.
 */

// 19 coverage-map city dots, viewBox 960×593 (from the design spec).
const MAP_DOTS: [number, number][] = [
  [150.2, 77.6], [134.7, 114.7], [96.9, 259.7], [141, 345.7], [151.9, 374.7],
  [234.5, 376.7], [357.6, 270.2], [476.1, 411.1], [460.1, 459.3], [499.4, 469.3],
  [525.9, 174.6], [607.5, 229.7], [670.9, 213.8], [630.3, 338.9], [672.4, 381.2],
  [763.7, 522.9], [767.6, 264.6], [803.4, 221], [836.4, 179.8],
];

const A = '/wellness-funds';
// Gallery = real event media (Will 2026-07-11): Cencora massage photo (from the proposal
// gallery, Supabase storage), Courtney's mindfulness video (Sanity CDN, same as book-a-call),
// plus the DraftKings/BCG/Wix event tiles. All tagged "Service @ Company".
const CENCORA_PHOTO = 'https://oxigtmlqqfbhzekpdalt.supabase.co/storage/v1/object/public/proposal-gallery/massage/1778730425338-dhy6o2.jpg';
const MINDFULNESS_VIDEO = 'https://cdn.sanity.io/files/7qf1r87p/production/e94281566161c5674ab843b72e54b5ea39364609.mp4';

// Fund-eligible services ONLY (carrier_wellness_funds.md): massage, stretch,
// mind-body and group fitness — the carriers' "group exercise / stress
// management" categories. Beauty services and headshots are not fund-eligible
// and must never appear on this page. Cards + modal reuse MENU_SERVICES from
// the service-menu page so the two surfaces share one copy source.
const FUND_SERVICE_IDS = [
  'massage', 'assisted-stretch', 'mindfulness', 'sound-bath',
  'yoga', 'strength-sculpt', 'dance-cardio', 'somatic-movement',
];
const FUND_SERVICES: MenuService[] = FUND_SERVICE_IDS
  .map(id => MENU_SERVICES.find(s => s.id === id))
  .filter((s): s is MenuService => !!s);
// Sound-bath card art is photographic; keep the menu page's framing.
const ART_POS: Record<string, string> = { 'sound-bath': 'center 42%' };

// Packages reuse the conference lineup (shared util, same approved copy).
// Chips mark which packages carrier funds pay for vs the 10% partner rate
// (beauty + headshots are never claimed as fund-payable — the claim rule).
const FUND_ELIGIBLE_PKGS = new Set(['reset-zone', 'mindful-reset', 'stretch-lab', 'movement-studio', 'sound-sanctuary']);

// Client logo marquee + hero tiles + testimonial assets shared with the
// conferences & retreats page (public/conference/onepager/*).
const C = '/conference/onepager';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Scroll-reveal (mirrors the conference page's Reveal: fade + 16px rise, .6s).
const useReveal = () => {
  const ref = useRef<any>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (prefersReducedMotion()) { setShown(true); return; }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } },
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, shown };
};

const RevSection: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { ref, shown } = useReveal();
  return <section ref={ref} className={`rev${shown ? ' in' : ''}`}>{children}</section>;
};

const Rev: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { ref, shown } = useReveal();
  return <div ref={ref} className={`rev${shown ? ' in' : ''}`}>{children}</div>;
};

// Count-up stat (0 → end over 1.1s), from the conference page — but gated on
// the reader actually scrolling to the strip: if the stats are already inside
// the viewport at page load, the count waits for the first real scroll.
const useCountUp = (end: number) => {
  const ref = useRef<HTMLElement>(null);
  const [value, setValue] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) { setValue(end); return; }
    const start = () => {
      if (started.current) return;
      started.current = true;
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / 1100);
        setValue(Math.round(end * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    let scrolled = false;
    let inView = false;
    const onScroll = () => {
      scrolled = true;
      if (inView) start();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    const io = new IntersectionObserver(
      ([e]) => {
        inView = e.isIntersecting;
        if (e.isIntersecting && scrolled) start();
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => { io.disconnect(); window.removeEventListener('scroll', onScroll); };
  }, [end]);
  return { ref, value };
};

const StatN: React.FC<{ end: number; suffix: string; label: string; first?: boolean }> = ({ end, suffix, label, first }) => {
  const { ref, value } = useCountUp(end);
  return (
    <div className={`stat${first ? ' first' : ''}`}>
      <b ref={ref as React.RefObject<HTMLElement>}>{value}<em className="sfx">{suffix}</em></b>
      <span>{label}</span>
    </div>
  );
};

// Stage hero slides (conference stage design): static real event photos only,
// massage in action first, from the proposal gallery (Supabase storage).
const GAL = 'https://oxigtmlqqfbhzekpdalt.supabase.co/storage/v1/object/public/proposal-gallery';
// Portrait photos (Cencora 3:4, Wix 2:3) are `fit` slides: letterboxed over a
// blurred cover copy instead of hard-cropping in the wide stage.
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
const STERLING_PACKAGES = [
  {
    id: 'reset-zone', name: 'The Reset Zone', bar: 'cyan',
    image: `${GAL}/massage/1778730995486-9l9d6z.jpeg`,
    meta: 'Chair or table massage · 15–20 min/appointment',
    desc: 'We turn a conference room into a spa for the day. Expert therapists, soothing scents, and the break their people line up for.',
    bullets: ['Licensed therapists, insured for any building', 'Two chairs or twenty, up to 150 appointments a day', 'Chairs, tables, screens, scents and setup, all ours'],
    price: '$1,200',
  },
  {
    id: 'glow-lounge', name: 'The Glow Lounge', bar: 'pink',
    image: `${GAL}/hair/1784325543659-edz1yh.jpg`,
    meta: 'Hair, makeup or facials · 20–30 min/appointment',
    desc: 'Blowouts, makeup or express facials right at the office. People step out of a meeting and walk back in polished and camera ready.',
    bullets: ['Licensed stylists and estheticians', 'One station or six, up to 100 appointments a day', 'Pick the service that fits the day'],
    price: '$1,200',
  },
  {
    id: 'polish-bar', name: 'The Polish Bar', bar: 'sun',
    image: `${GAL}/nails/1784325589704-cw5v3l.jpg`,
    meta: 'Manicures · 20–30 min/appointment',
    desc: 'Manicures without the salon trip. Twenty quiet minutes away from the desk, then back to work looking sharp.',
    bullets: ['Licensed nail technicians, single-use kits', 'An intimate setup or 100 appointments a day', 'Dry service. No plumbing, no fumes, no cleanup for the office'],
    price: '$1,200',
  },
  {
    id: 'mindful-reset', name: 'The Mindful Reset', bar: 'navy',
    image: '/conference/services/mindfulness.png',
    meta: 'Facilitated sessions · 30–60 min',
    desc: 'Guided meditation and practical tools for stress and focus, dropped into the workday right where the team needs a breath.',
    bullets: ['Ten people or the whole floor, no cap', 'Morning drop-ins, midday resets, end-of-week wind-downs', 'In a conference room or over Zoom for the people at home'],
    price: '$1,250',
  },
  {
    id: 'studio', name: 'The Studio', bar: 'navy',
    image: '/conference/services/headshot.png',
    meta: 'Headshots · 8–12 min/session',
    desc: 'A pop-up studio at the office with real lighting and a photographer who directs the shot. A consistent, professional look across the whole team.',
    bullets: ['Pro photographer, lighting rig and posing direction', 'Retouched gallery back in five to seven days', 'Add hair and makeup touch-ups before the shot'],
    price: '$3,000',
  },
  {
    id: 'stretch-lab', name: 'The Stretch Lab', bar: 'cyan',
    image: `${C}/svc/stretch-mobility.webp`,
    meta: 'Assisted stretch · 10–20 min/appointment',
    desc: 'A specialist walks each person through a targeted stretch, one on one. Relief for the necks, shoulders and backs a desk produces.',
    bullets: ['Certified specialists, one on one, fully clothed', 'From a single table to 150 appointments a day', 'We bring the tables. Nothing needed from the office'],
    price: '$1,200',
  },
  {
    id: 'movement-studio', name: 'The Movement Studio', bar: 'pink',
    image: `${C}/gallery/dance-cardio-gallery.jpg`,
    meta: 'Group classes · 30–60 min',
    desc: 'Yoga, dance cardio, strength or mobility. A gentle morning reset or a real workout, whichever the team needs.',
    bullets: ['Certified instructors who read the room', 'A dozen people or the whole office, no cap', 'Mats, music and setup included. Any conference room, or over video'],
    price: '$650',
  },
  {
    id: 'sound-sanctuary', name: 'The Sound Sanctuary', bar: 'sun',
    image: `${C}/svc/crystal-sound-bath-rooftop.webp`,
    meta: 'Crystal sound baths · 30–60 min',
    desc: 'Crystal singing bowls, eyes closed, screens off. The quietest thirty minutes of the workweek, and the one people ask about after.',
    bullets: ['Trained sound practitioners', 'An intimate circle or the whole team, no cap', 'Bowls, mats and setup included. Nothing from the office'],
    price: '$1,250',
  },
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

const CSS = `
.wfop { --brand:#003756; --brand-deep:#003C5E; --teal:#018EA2; --cyan:#9EFAFF; --coral:#FF5050;
  --ink:#032232; --ink-soft:#45596A; --ground:#FFFFFF; --panel:#FFFFFF; --tint:#F1F6F5; --line:#E2E9E8;
  --shadow:0 1px 2px rgba(3,34,50,.05),0 10px 30px rgba(3,34,50,.06);
  --font:'Outfit',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  background:var(--ground); color:var(--ink); font-family:var(--font); line-height:1.55;
  -webkit-font-smoothing:antialiased; min-height:100vh; }
.wfop *{ box-sizing:border-box; }
.wfop .sheet{ max-width:1140px; margin:0 auto; padding:52px 48px 40px; }
.wfop .pnav{ position:sticky; top:0; z-index:40; height:64px; background:#fff; border-bottom:1px solid rgba(0,0,0,.08); }
.wfop .pnav .in{ max-width:1140px; margin:0 auto; height:100%; display:flex; align-items:center; justify-content:space-between; gap:16px; padding:0 28px; }
.wfop .pnav .lft{ display:flex; align-items:center; gap:14px; }
.wfop .pnav .plogo{ height:34px; width:auto; display:block; }
.wfop .pnav .ndiv{ width:1px; height:24px; background:rgba(0,0,0,.1); }
.wfop .pnav .with{ display:flex; align-items:center; gap:7px; font-size:11px; font-weight:700; color:rgba(3,34,50,.45); }
.wfop .pnav .slogo{ display:flex; } .wfop .pnav .slogo svg{ height:16px; width:auto; display:block; }
.wfop .pnav .cta-btn{ background:#FF5050; color:#fff; font-size:14px; font-weight:700; border-radius:999px; padding:10px 20px; text-decoration:none; box-shadow:0 4px 14px rgba(255,80,80,.3); flex:none; }
.wfop .sec{ display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:14px 24px; margin:0 0 18px; }
.wfop .sec h2{ margin:0; font-size:26px; font-weight:800; line-height:1.05; letter-spacing:-.03em; color:#003756; }
.wfop .sec .sub{ margin:8px 0 0; max-width:44ch; font-size:14.5px; color:var(--ink-soft); }
.wfop .sec .pill{ border:1px solid var(--line); border-radius:999px; padding:7px 14px; font-size:11.5px; font-weight:800; text-transform:uppercase; letter-spacing:.08em; color:var(--ink-soft); flex:none; }
@media (min-width:768px){ .wfop .sec h2{ font-size:34px; } .wfop .stmt{ font-size:34px; } }
.wfop .eyebrow{ font-size:12px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:var(--coral); margin:0 0 16px; }
.wfop h1{ font-weight:800; font-size:clamp(32px,5vw,46px); line-height:1.03; letter-spacing:-.035em; text-wrap:balance; margin:0 0 18px; color:var(--brand); }
.wfop .lede{ font-size:18px; line-height:1.5; color:var(--ink-soft); max-width:60ch; margin:0; }
.wfop .lede strong{ color:var(--ink); font-weight:600; }
.wfop .divider{ height:1px; background:var(--line); margin:40px 0; border:0; }
.wfop section{ margin:60px 0; }
.wfop .stmt{ margin:0 0 12px; font-size:27px; font-weight:800; line-height:1.12; letter-spacing:-.03em; color:#003756; text-wrap:pretty; }
.wfop .stmt .dim{ color:var(--ink-soft); font-weight:700; }
.wfop .label{ font-family:var(--font); font-size:12px; font-weight:700; letter-spacing:.09em; text-transform:uppercase; color:var(--ink-soft); margin:0 0 16px; display:flex; align-items:center; gap:9px; }
.wfop .label::before{ content:""; width:7px; height:7px; border-radius:50%; background:var(--coral); flex:none; }
.wfop h2{ font-weight:800; font-size:24px; letter-spacing:-.02em; margin:0 0 12px; color:var(--brand); }
.wfop p{ margin:0 0 12px; color:var(--ink-soft); font-size:16px; }
.wfop .note{ font-size:18px; line-height:1.5; color:var(--ink-soft); max-width:60ch; }
.wfop .note b{ color:var(--ink); font-weight:600; }
.wfop .funds{ display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin:30px 0 16px; }
.wfop .fund{ display:flex; align-items:center; justify-content:center; background:var(--panel); border:1px solid var(--line); border-top:3px solid var(--coral); border-radius:16px; padding:30px 20px; box-shadow:var(--shadow); }
.wfop .fund img{ width:auto; display:block; }
.wfop .fund img.lg-cigna{ height:36px; }
.wfop .fund img.lg-aetna{ height:27px; }
.wfop .fund img.lg-anthem{ height:30px; }
.wfop .statement{ font-size:34px; font-weight:800; letter-spacing:-.03em; line-height:1.05; margin:0; color:var(--brand); }
/* Stage hero, reveal animations, stats strip, logo marquee, GTK cards and
   quotes — design ported from ConferenceOnePager (conferences & retreats). */
.wfop .rev{ opacity:0; transform:translateY(16px); transition:opacity .6s cubic-bezier(.2,.6,.2,1), transform .6s cubic-bezier(.2,.6,.2,1); }
.wfop .rev.in{ opacity:1; transform:none; }
.wfop .hero-c{ text-align:center; }
.wfop .hero-c h1{ margin-left:auto; margin-right:auto; }
.wfop .hero-c .lede{ margin:0 auto; }
.wfop .stage{ position:relative; margin-top:34px; height:480px; border-radius:24px; overflow:hidden; background:#fff; text-align:left; box-shadow:var(--shadow); }
.wfop .stage .sl{ position:absolute; inset:0; opacity:0; transition:opacity .7s; }
.wfop .stage .sl.on{ opacity:1; }
.wfop .stage .sl img, .wfop .stage .sl video{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.wfop .stage .sl img.fbg{ filter:blur(18px) brightness(.92); transform:scale(1.12); }
.wfop .stage .sl img.ffg{ object-fit:contain; }
.wfop .stage .stag{ position:absolute; bottom:18px; left:18px; z-index:2; border-radius:999px; background:#fff; padding:9px 16px; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.08em; color:#003756; box-shadow:0 3px 12px rgba(3,34,50,.22); }
.wfop .stage .sdots{ position:absolute; left:0; right:0; bottom:22px; z-index:3; display:flex; justify-content:center; gap:8px; }
.wfop .stage .sdots button{ width:9px; height:9px; border-radius:50%; border:0; padding:0; background:rgba(255,255,255,.5); cursor:pointer; transition:transform .2s; }
.wfop .stage .sdots button.on{ background:#fff; transform:scale(1.25); }
.wfop .stats{ margin-top:48px; display:grid; grid-template-columns:repeat(3,1fr); border-top:1px solid var(--line); border-bottom:1px solid var(--line); padding:26px 0; }
.wfop .stat{ padding:2px 32px 2px; border-left:1px solid var(--line); }
.wfop .stat.first{ border-left:0; padding-left:2px; }
.wfop .stat b{ display:block; font-size:42px; font-weight:800; letter-spacing:-.03em; line-height:1; color:#003756; }
.wfop .stat b .sfx{ font-style:normal; color:#FF5050; }
.wfop .stat span{ display:block; margin-top:9px; font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:var(--ink-soft); }
.wfop .lgm{ margin-top:26px; overflow:hidden; -webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent); mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent); }
.wfop .lgm .track{ display:flex; width:max-content; animation:wfop-marquee 30s linear infinite; will-change:transform; }
.wfop .lgm .track:hover{ animation-play-state:paused; }
.wfop .lgm .set{ display:flex; align-items:center; gap:56px; padding-right:56px; }
.wfop .lgm img{ height:22px; width:auto; flex:none; opacity:.9; filter:grayscale(1) sepia(1) saturate(4) hue-rotate(165deg) brightness(.85); }
.wfop .lgm img.tall{ height:30px; }
@keyframes wfop-marquee{ to{ transform:translateX(-50%); } }
.wfop .gtk{ margin-top:26px; display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
.wfop .gtk .gc{ position:relative; overflow:hidden; border-radius:20px; padding:22px 20px; min-height:340px; text-align:left; border:0; cursor:pointer; font-family:var(--font); color:#003756; display:block; width:100%; }
.wfop .gtk .gc.g1{ background:linear-gradient(155deg,#9EFAFF,#4FD4E4); }
.wfop .gtk .gc.g2{ background:linear-gradient(155deg,#FEDC64,#FFC93C); }
.wfop .gtk .gc.g3{ background:linear-gradient(155deg,#F7BBFF,#E49BF7); }
.wfop .gtk .gc.g4{ background:linear-gradient(155deg,#083650,#041D2C); color:#fff; }
.wfop .gtk .kick{ font-size:10.5px; font-weight:800; text-transform:uppercase; letter-spacing:.12em; }
.wfop .gtk .gc.g4 .kick{ color:#9EFAFF; }
.wfop .gtk .gt{ margin-top:9px; max-width:10ch; font-size:23px; font-weight:800; line-height:1.1; letter-spacing:-.015em; }
.wfop .gtk .gd{ margin-top:12px; max-width:26ch; font-size:14.5px; font-weight:600; line-height:1.5; opacity:0; transform:translateY(6px); transition:opacity .3s,transform .3s; }
.wfop .gtk .gc.open .gd{ opacity:1; transform:none; }
.wfop .gtk .num{ position:absolute; bottom:4px; right:14px; font-size:118px; font-weight:800; letter-spacing:-.05em; line-height:1; opacity:.13; pointer-events:none; transition:opacity .3s; }
.wfop .gtk .gc.open .num{ opacity:.05; }
.wfop .gtk .plus2{ position:absolute; left:13px; bottom:13px; z-index:4; width:36px; height:36px; border-radius:50%; background:rgba(255,255,255,.94); color:#003756; display:grid; place-items:center; font-size:22px; font-weight:500; box-shadow:0 2px 10px rgba(3,34,50,.22); }
.wfop .quotes{ margin-top:24px; display:grid; grid-template-columns:1.15fr 1fr; gap:14px; }
.wfop .q1{ border-radius:20px; background:linear-gradient(160deg,#0A3E5C,#06293D); padding:30px 32px; box-shadow:var(--shadow); }
.wfop .q1 .ql{ display:block; height:22px; width:auto; margin-bottom:16px; filter:brightness(0) invert(1); opacity:.92; }
.wfop .q1 p{ margin:0; font-size:21px; font-weight:700; line-height:1.32; letter-spacing:-.02em; color:#fff; text-wrap:balance; }
.wfop .qwho{ display:flex; align-items:center; gap:13px; margin-top:20px; }
.wfop .qwho img{ width:44px; height:44px; border-radius:50%; object-fit:cover; flex:none; }
.wfop .q1 .qwho img{ border:2px solid rgba(158,250,255,.4); }
.wfop .q1 .qwho b{ display:block; font-size:14.5px; color:#fff; }
.wfop .q1 .qwho span{ display:block; margin-top:2px; font-size:12.5px; color:rgba(255,255,255,.7); }
.wfop .q2{ display:flex; flex-direction:column; border-radius:20px; background:#9EFAFF; padding:30px 32px; box-shadow:var(--shadow); }
.wfop .q2 .ql{ display:block; height:30px; width:auto; margin-bottom:14px; align-self:flex-start; }
.wfop .q2 p{ margin:0; font-size:17px; font-weight:700; line-height:1.42; letter-spacing:-.01em; color:#003756; }
.wfop .q2 .qwho{ margin-top:auto; padding-top:20px; }
.wfop .q2 .qwho img{ border:2px solid #fff; box-shadow:0 3px 10px rgba(3,34,50,.14); }
.wfop .q2 .qwho b{ display:block; font-size:14.5px; color:#003756; }
.wfop .q2 .qwho span{ display:block; margin-top:2px; font-size:12.5px; color:#175071; }
.wfop .op-gallery{ display:grid; grid-template-columns:1.5fr 1fr 1fr; grid-template-rows:1fr 1fr; gap:8px; height:512px; border-radius:20px; overflow:hidden; margin:26px 0 34px; box-shadow:var(--shadow); }
.wfop .op-gtile{ position:relative; overflow:hidden; background:var(--tint); }
.wfop .op-gtile img, .wfop .op-gtile video{ width:100%; height:100%; object-fit:cover; object-position:66% center; display:block; transition:transform 600ms ease; }
.wfop .op-gtile.mind video{ object-position:center 22%; }
.wfop .op-gtile:hover img, .wfop .op-gtile:hover video{ transform:scale(1.04); }
.wfop .op-gtile.main{ grid-row:1 / 3; grid-column:1; }
.wfop .op-gtag{ position:absolute; left:12px; bottom:12px; background:#fff; color:var(--brand); font-weight:700; font-size:12px; border-radius:999px; padding:6px 13px; box-shadow:0 2px 8px rgba(9,54,79,.18); }
/* Service cards + detail modal — design ported from ServiceMenuPage (/menu) */
.wfop .sm-filter{ display:flex; align-items:center; gap:14px; margin:0 0 16px; }
.wfop .sm-pills{ display:flex; gap:4px; background:var(--tint); border-radius:999px; padding:4px; }
.wfop .sm-pills button{ border:0; background:transparent; border-radius:999px; padding:8px 15px; font-size:13px; font-weight:700; color:var(--ink-soft); cursor:pointer; font-family:var(--font); transition:color .18s,background .18s; }
.wfop .sm-pills button:hover{ color:var(--brand); }
.wfop .sm-pills button.on{ background:var(--brand); color:#fff; }
.wfop .sm-count{ margin-left:auto; font-size:13px; font-weight:600; color:var(--ink-soft); }
.wfop .srail{ margin:2px 0 0; display:flex; gap:12px; overflow-x:auto; scroll-snap-type:x mandatory; padding-bottom:6px; scrollbar-width:none; }
.wfop .srail::-webkit-scrollbar{ display:none; }
.wfop .srail .sc{ position:relative; flex:none; scroll-snap-align:start; width:258px; height:430px; border-radius:20px; overflow:hidden; background:#fff; border:0; padding:0; cursor:pointer; text-align:left; font-family:var(--font); }
.wfop .srail .sc.static{ cursor:default; }
.wfop .srail .sc img.art{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; }
.wfop .srail .sc.crop img.art{ transform:scale(1.1); }
.wfop .srail .sc.nutri{ background:#55BA90; }
.wfop .srail .sc.nutri img.art{ object-fit:contain; padding:34% 20%; }
.wfop .srail .sc .scrimT{ position:absolute; inset:0; z-index:1; background:linear-gradient(180deg,rgba(3,34,50,.55),rgba(3,34,50,0) 46%); }
.wfop .srail .sc .ttl{ position:absolute; left:16px; right:16px; top:15px; z-index:2; font-size:19px; font-weight:800; line-height:1.15; letter-spacing:-.01em; color:#fff; }
.wfop .srail .sc .plus{ position:absolute; left:13px; bottom:13px; z-index:4; width:36px; height:36px; border-radius:50%; background:rgba(255,255,255,.94); color:#003756; display:grid; place-items:center; font-size:22px; font-weight:500; box-shadow:0 2px 10px rgba(3,34,50,.22); transition:transform .25s; }
.wfop .srail .sc:hover .plus{ transform:scale(1.1); }
.wfop .rail-nav{ margin-top:14px; display:flex; justify-content:flex-end; gap:8px; }
.wfop .rail-nav button{ width:40px; height:40px; border-radius:50%; border:1px solid var(--line); background:#fff; color:#003756; font-size:16px; cursor:pointer; transition:opacity .2s; }
.wfop .rail-nav button:disabled{ opacity:.3; }
.wfop .sm-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin:2px 0 14px; }
.wfop .sm-card{ position:relative; overflow:hidden; border-radius:18px; background:var(--tint); min-height:300px; box-shadow:var(--shadow); border:0; padding:0; text-align:left; cursor:pointer; font-family:var(--font); display:block; width:100%; }
.wfop .sm-card .art{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; }
.wfop .sm-card.crop .art{ transform:scale(1.1); }
.wfop .sm-card .scrim{ position:absolute; inset:0; background:linear-gradient(0deg,rgba(3,34,50,.82) 0%,rgba(3,34,50,.34) 46%,rgba(3,34,50,0) 78%); }
.wfop .sm-card .cap2{ position:absolute; left:20px; bottom:20px; z-index:2; }
.wfop .sm-card .cap2 b{ display:block; font-size:19px; font-weight:800; letter-spacing:-.01em; color:#fff; }
.wfop .sm-card .cap2 span{ display:block; margin-top:3px; font-size:12px; font-weight:600; color:rgba(255,255,255,.86); }
.wfop .sm-card .plus{ position:absolute; right:14px; top:14px; z-index:3; width:36px; height:36px; border-radius:50%; background:rgba(255,255,255,.94); color:var(--brand); display:grid; place-items:center; font-size:22px; font-weight:500; box-shadow:0 2px 10px rgba(3,34,50,.22); transition:background .15s; }
.wfop .sm-card:hover .plus{ background:#fff; }
.wfop .sm-card .rchip{ position:absolute; right:62px; top:22px; z-index:3; background:var(--cyan); color:var(--brand); border-radius:999px; padding:6px 11px; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.07em; }
.wfop .sm-card.static{ cursor:default; }
.wfop .sm-card.nutri{ background:#55BA90; }
.wfop .sm-card.nutri .art{ object-fit:contain; padding:12% 24% 30%; }
.wfop .sm-card.nutri .rchip{ right:22px; }
.wfop .sm-overlay{ position:fixed; inset:0; z-index:100; display:flex; align-items:center; justify-content:center; background:rgba(3,34,50,.58); padding:16px; }
.wfop .sm-modal{ position:relative; display:grid; grid-template-columns:44% 56%; width:min(960px,100%); height:min(520px,calc(100vh - 56px)); border-radius:24px; overflow:hidden; background:#fff; box-shadow:0 30px 80px rgba(3,34,50,.4); }
.wfop .sm-close{ position:absolute; right:16px; top:16px; z-index:20; width:38px; height:38px; border-radius:50%; background:var(--brand); color:#fff; font-size:20px; line-height:1; border:0; display:grid; place-items:center; cursor:pointer; }
.wfop .sm-media{ position:relative; background:#EAF7F9; overflow:hidden; }
.wfop .sm-media img{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; opacity:0; transition:opacity .3s; }
.wfop .sm-media img.on{ opacity:1; }
.wfop .sm-media img.crop{ transform:scale(1.1); }
.wfop .sm-dots{ position:absolute; left:16px; bottom:16px; z-index:3; display:flex; gap:8px; }
.wfop .sm-dots button{ width:9px; height:9px; border-radius:50%; border:0; padding:0; background:rgba(255,255,255,.5); cursor:pointer; }
.wfop .sm-dots button.on{ background:#fff; }
.wfop .sm-body{ display:flex; flex-direction:column; overflow-y:auto; padding:34px 36px 28px; }
.wfop .sm-pos{ margin:0; font-size:11px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--ink-soft); }
.wfop .sm-name{ margin:6px 0 0; font-size:27px; font-weight:800; letter-spacing:-.02em; line-height:1.1; color:var(--brand); }
.wfop .sm-desc{ margin:10px 0 22px; font-size:14px; line-height:1.6; color:var(--ink); }
.wfop .sm-cols{ display:grid; grid-template-columns:1.15fr 1fr; gap:24px; border-top:1px solid var(--line); padding-top:18px; }
.wfop .sm-colh{ margin:0; font-size:11px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--ink-soft); }
.wfop .sm-cols ul{ list-style:none; margin:10px 0 0; padding:0; display:grid; gap:8px; }
.wfop .sm-cols li{ display:flex; gap:10px; font-size:13px; line-height:1.45; color:var(--ink-soft); }
.wfop .sm-cols li::before{ content:""; margin-top:7px; width:6px; height:6px; border-radius:50%; background:var(--cyan); flex:none; }
.wfop .sm-cols li b{ font-weight:600; color:var(--ink); }
.wfop .sm-foot{ margin-top:auto; display:flex; align-items:flex-end; justify-content:space-between; gap:16px; padding-top:24px; }
.wfop .sm-meta{ margin:0; font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--ink-soft); }
.wfop .sm-nav{ display:flex; gap:8px; flex:none; }
.wfop .sm-nav button{ width:38px; height:38px; border-radius:50%; border:1px solid var(--line); background:#fff; color:var(--brand); font-size:15px; display:grid; place-items:center; cursor:pointer; }
.wfop ol.steps{ list-style:none; counter-reset:s; margin:2px 0 0; padding:0; display:grid; gap:15px; }
.wfop ol.steps li{ counter-increment:s; display:grid; grid-template-columns:38px 1fr; gap:15px; align-items:start; }
.wfop ol.steps li::before{ content:counter(s); font-weight:700; font-size:16px; color:#fff; background:var(--coral); width:38px; height:38px; display:grid; place-items:center; border-radius:10px; font-variant-numeric:tabular-nums; }
.wfop ol.steps .st{ font-size:18px; line-height:1.5; padding-top:5px; } .wfop ol.steps .st b{ color:var(--ink); font-weight:600; } .wfop ol.steps .st span{ color:var(--ink-soft); }
.wfop .feat4{ display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-top:24px; }
.wfop .feat{ border-radius:20px; padding:26px 28px 0; min-height:360px; display:flex; flex-direction:column; overflow:hidden; box-shadow:var(--shadow); }
.wfop .feat-kick{ font-size:11px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; margin:0 0 10px; }
.wfop .feat-h{ font-size:23px; font-weight:800; letter-spacing:-.02em; line-height:1.04; margin:0 0 8px; }
.wfop .feat-p{ font-size:13.5px; line-height:1.5; margin:0; }
.wfop .feat.sky{ background:#9EFBFF; } .wfop .feat.sky .feat-kick{ color:#018EA2; } .wfop .feat.sky .feat-h{ color:#003756; } .wfop .feat.sky .feat-p{ color:rgba(3,34,50,.72); }
.wfop .feat.sky .guy{ width:100%; height:215px; object-fit:contain; object-position:center bottom; display:block; margin-top:auto; }
.wfop .feat.coralg{ background:linear-gradient(160deg,#FF6A5A,#FF5050); } .wfop .feat.coralg .feat-kick{ color:rgba(255,255,255,.85); } .wfop .feat.coralg .feat-h{ color:#fff; } .wfop .feat.coralg .feat-p{ color:rgba(255,255,255,.88); }
.wfop .feat.navy{ background:linear-gradient(160deg,#0A3E5C,#06293D); padding-bottom:20px; }
.wfop .feat.navy .feat-kick{ color:#9EFAFF; } .wfop .feat.navy .feat-h{ color:#fff; } .wfop .feat.navy .feat-h span{ color:#9EFAFF; } .wfop .feat.navy .feat-p{ color:rgba(255,255,255,.72); }
.wfop .mapwrap{ position:relative; margin-top:auto; padding-top:12px; }
.wfop .feat.navy .usmap{ width:100%; height:auto; display:block; }
.wfop .mapdots{ position:absolute; left:0; right:0; bottom:0; top:12px; width:100%; height:calc(100% - 12px); overflow:visible; }
.wfop .mapdots g{ transform:scale(0); transition:transform .55s cubic-bezier(.22,1.5,.5,1); }
.wfop .feat.navy.in .mapdots g{ transform:scale(1); }
.wfop .feat.aquag{ background:linear-gradient(160deg,#9EFAFF,#6FE9F0); padding-bottom:22px; }
.wfop .feat.aquag .feat-kick{ color:#018EA2; } .wfop .feat.aquag .feat-h{ color:#003756; } .wfop .feat.aquag .feat-p{ color:rgba(3,34,50,.72); }
.wfop .phonewrap{ display:flex; justify-content:center; margin-top:auto; padding-top:16px; }
.wfop .mini-phone{ width:192px; background:#fff; border-radius:18px 18px 0 0; padding:12px 12px 14px; box-shadow:0 -6px 24px rgba(3,34,50,.18); }
.wfop .mp-bar{ font-size:10.5px; font-weight:700; color:#032232; display:flex; align-items:center; gap:6px; padding-bottom:8px; border-bottom:1px solid #eef2f4; margin-bottom:8px; }
.wfop .mp-logo{ width:16px; height:16px; border-radius:50%; background:#FF5050; color:#fff; display:grid; place-items:center; font-size:9px; font-weight:700; }
.wfop .mp-step{ margin-left:auto; color:#9ab1ba; font-weight:600; }
.wfop .mp-opt{ display:flex; justify-content:space-between; align-items:center; font-size:11px; font-weight:600; color:#032232; border:1.5px solid #E2E9E8; border-radius:9px; padding:7px 9px; margin-bottom:6px; }
.wfop .mp-opt i{ width:12px; height:12px; border-radius:50%; border:1.5px solid #cfd9d8; }
.wfop .mp-opt.sel{ border-color:#FF5050; background:rgba(255,80,80,.06); }
.wfop .mp-opt.sel i{ border-color:#FF5050; background:#FF5050; box-shadow:inset 0 0 0 2.5px #fff; }
.wfop .mp-cta{ background:#FF5050; color:#fff; text-align:center; font-size:11px; font-weight:700; border-radius:9px; padding:8px; margin-top:2px; }
.wfop .mp-eyebrow{ font-size:9.5px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#9ab1ba; margin:0 0 6px; }
.wfop .mp-stage{ position:relative; height:114px; }
.wfop .mp-screen{ position:absolute; inset:0; opacity:0; transition:opacity .45s ease; pointer-events:none; }
.wfop .mp-screen.on{ opacity:1; }
.wfop .mp-slots{ display:grid; grid-template-columns:1fr 1fr; gap:5px; margin-bottom:6px; }
.wfop .mp-slots span{ font-size:10.5px; font-weight:700; color:#032232; border:1.5px solid #E2E9E8; border-radius:8px; padding:6px 0; text-align:center; }
.wfop .mp-slots span.taken{ opacity:.35; text-decoration:line-through; }
.wfop .mp-slots span.sel{ background:#FF5050; border-color:#FF5050; color:#fff; }
.wfop .mp-check{ width:30px; height:30px; border-radius:50%; background:#55BA90; margin:10px auto 9px; display:flex; align-items:center; justify-content:center; }
.wfop .mp-check svg{ width:14px; height:14px; stroke:#fff; stroke-width:3; fill:none; }
.wfop .mp-done{ text-align:center; font-size:13px; font-weight:800; color:#032232; }
.wfop .mp-sub2{ text-align:center; font-size:10px; color:#7d939e; margin-top:3px; }
.wfop .stat-big{ font-size:46px; font-weight:800; letter-spacing:-.03em; color:#003756; line-height:1; }
.wfop .stat-lbl{ font-size:13px; font-weight:600; color:#175071; margin-top:4px; }
.wfop .stat-bar{ height:10px; border-radius:999px; background:rgba(3,34,50,.14); overflow:hidden; margin-top:10px; }
.wfop .stat-bar i{ display:block; height:100%; width:92%; border-radius:999px; background:#FF5050; }
.wfop .stat-wrap{ margin-top:auto; padding-top:18px; }
.wfop .stat-mini{ display:flex; gap:10px; margin-top:14px; }
.wfop .stat-mini > div{ flex:1; background:rgba(255,255,255,.6); border-radius:12px; padding:10px 12px; }
.wfop .stat-mini b{ font-size:20px; font-weight:800; color:#003756; display:block; }
.wfop .stat-mini span{ font-size:11px; font-weight:600; color:#175071; }
.wfop .pk-gh{ display:flex; align-items:center; gap:12px; margin:28px 0 0; }
.wfop .pk-gh .gchip{ flex:none; border-radius:999px; padding:7px 14px; font-size:11px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; }
.wfop .pk-gh .gchip.fund{ background:#9EFAFF; color:#003756; }
.wfop .pk-gh .gchip.rate{ background:#FF5050; color:#fff; }
.wfop .pk-gh p{ margin:0; font-size:14px; color:var(--ink-soft); }
.wfop .cpk-grid{ display:grid; grid-template-columns:repeat(2,1fr); gap:14px; margin-top:14px; }
.wfop .cpk{ position:relative; display:flex; flex-direction:column; overflow:hidden; border-radius:18px; border:1px solid var(--line); background:#fff; box-shadow:var(--shadow); }
.wfop .cpk .ph{ height:164px; overflow:hidden; }
.wfop .cpk .ph img{ width:100%; height:100%; object-fit:cover; transform:scale(1.1); display:block; }
.wfop .cpk .chip{ position:absolute; right:12px; top:12px; z-index:2; border-radius:999px; padding:7px 13px; font-size:11px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; border:2px solid #fff; box-shadow:0 2px 10px rgba(9,54,79,.3); }
.wfop .cpk .chip.fund{ background:#9EFAFF; color:#003756; }
.wfop .cpk .chip.rate{ background:#FF5050; color:#fff; }
.wfop .cpk .nb{ padding:11px 20px 12px; font-size:17px; font-weight:800; line-height:1.2; letter-spacing:-.015em; }
.wfop .cpk .nb.navy{ background:#003756; color:#9EFAFF; } .wfop .cpk .nb.cyan{ background:#9EFAFF; color:#003756; }
.wfop .cpk .nb.pink{ background:#F7BBFF; color:#003756; } .wfop .cpk .nb.sun{ background:#FEDC64; color:#003756; }
.wfop .cpk .bd{ display:flex; flex:1; flex-direction:column; padding:16px 20px 18px; }
.wfop .cpk .pmeta{ margin:0 0 8px; font-size:12px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--ink-soft); }
.wfop .cpk .pdesc{ margin:0 0 14px; font-size:14px; line-height:1.5; color:var(--ink-soft); }
.wfop .cpk ul{ list-style:none; margin:0 0 18px; padding:0; display:grid; gap:7px; }
.wfop .cpk li{ display:flex; align-items:baseline; gap:9px; font-size:13.5px; color:var(--ink); }
.wfop .cpk li::before{ content:"✓"; flex:none; font-size:12px; font-weight:800; color:#018EA2; }
.wfop .cpk .prow{ margin-top:auto; display:flex; align-items:flex-end; justify-content:space-between; gap:12px; border-top:1px solid var(--line); padding-top:12px; }
.wfop .cpk .pfrom{ display:block; margin-bottom:3px; font-size:10.5px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--ink-soft); }
.wfop .cpk .pval{ font-size:25px; font-weight:800; line-height:1; letter-spacing:-.02em; color:#003756; }
.wfop .cpk .punit{ max-width:15ch; text-align:right; font-size:12.5px; line-height:1.35; color:var(--ink-soft); }
.wfop .pkgs{ display:grid; grid-template-columns:repeat(2,1fr); gap:14px; margin-top:20px; }
.wfop .pkg{ position:relative; background:var(--panel); border:1px solid var(--line); border-radius:16px; padding:22px 24px; box-shadow:var(--shadow); }
.wfop .pkg.rec{ border:2px solid var(--coral); }
.wfop .pkg .badge{ position:absolute; top:-11px; right:16px; background:var(--coral); color:#fff; font-size:10.5px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; border-radius:999px; padding:5px 12px; }
.wfop .pkg h3{ margin:0 0 6px; font-size:19px; font-weight:800; letter-spacing:-.015em; color:var(--brand); }
.wfop .pkg p{ margin:0; font-size:14px; line-height:1.55; color:var(--ink-soft); }
.wfop .receipt{ background:linear-gradient(160deg,#0A3E5C,#06293D); border:0; border-radius:20px; padding:32px 34px; box-shadow:var(--shadow); }
.wfop .receipt .rc-logo{ height:24px; width:auto; filter:brightness(0) invert(1); opacity:.92; margin:0 0 18px; display:block; }
.wfop .receipt p{ font-weight:700; font-size:23px; line-height:1.32; letter-spacing:-.02em; color:#fff; margin:0; text-wrap:balance; }
.wfop .receipt .rc-who{ display:flex; align-items:center; gap:13px; margin-top:22px; }
.wfop .receipt .rc-av{ width:46px; height:46px; border-radius:50%; object-fit:cover; border:2px solid rgba(158,250,255,.4); flex:none; }
.wfop .receipt .rc-who b{ display:block; color:#fff; font-size:15px; font-weight:700; }
.wfop .receipt .rc-who span{ display:block; color:rgba(255,255,255,.7); font-size:13px; margin-top:2px; }
.wfop .ask{ background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:20px 24px; box-shadow:var(--shadow); }
.wfop .ask .q{ font-weight:600; font-size:18px; line-height:1.45; color:var(--ink); margin:8px 0 0; }
.wfop h2.cta-h{ margin-bottom:8px; }
.wfop .cta-band{ background:linear-gradient(160deg,#FF6A5A,#FF5050); border-radius:24px; padding:38px 40px; box-shadow:var(--shadow); }
.wfop .cta-band h2{ color:#fff; }
.wfop .cta-band .note{ color:rgba(255,255,255,.92); max-width:52ch; } .wfop .cta-band .note b{ color:#fff; }
.wfop .cta{ display:flex; flex-wrap:wrap; align-items:center; gap:14px 22px; margin-top:18px; }
.wfop .cta .primary{ display:inline-block; background:var(--cyan); color:#003756; text-decoration:none; font-weight:700; font-size:15px; padding:13px 26px; border-radius:12px; }
.wfop .cta .alt{ font-size:15px; color:rgba(255,255,255,.85); }
.wfop footer{ margin-top:34px; padding-top:18px; border-top:1px solid var(--line); display:flex; flex-wrap:wrap; justify-content:space-between; gap:10px; font-size:13px; color:var(--ink-soft); }
.wfop footer .trust b{ color:var(--ink); font-weight:600; }
.wfop footer a{ color:var(--teal); text-decoration:none; font-weight:600; }
@media (max-width:560px){ .wfop .sheet{ padding:34px 22px; } .wfop .pnav .in{ padding:0 18px; } .wfop .pnav .plogo{ height:26px; } .wfop .pnav .ndiv, .wfop .pnav .with{ display:none; } .wfop .funds{ grid-template-columns:1fr; } .wfop .pkgs{ grid-template-columns:1fr; } .wfop .cpk-grid{ grid-template-columns:1fr; } .wfop .stage{ height:320px; } .wfop .stats{ grid-template-columns:1fr; gap:18px; } .wfop .stat{ border-left:0; padding:0; } .wfop .gtk{ display:flex; overflow-x:auto; padding-bottom:6px; } .wfop .gtk .gc{ flex:none; width:258px; } .wfop .quotes{ grid-template-columns:1fr; } .wfop .sm-grid{ grid-template-columns:repeat(2,1fr); } .wfop .sm-card{ min-height:200px; } .wfop .sm-card .cap2{ left:14px; bottom:14px; } .wfop .sm-card .cap2 b{ font-size:15px; } .wfop .sm-card .rchip{ display:none; } .wfop .sm-modal{ grid-template-columns:1fr; height:auto; max-height:calc(100vh - 40px); overflow-y:auto; } .wfop .sm-media{ height:220px; flex:none; } .wfop .sm-body{ overflow-y:visible; padding:26px 24px 22px; } .wfop .sm-cols{ grid-template-columns:1fr; } .wfop .feat4{ grid-template-columns:1fr; } .wfop .op-gallery{ height:auto; grid-template-columns:1fr 1fr; grid-template-rows:auto; } .wfop .op-gtile{ height:150px; } .wfop .op-gtile.main{ grid-column:1 / 3; grid-row:auto; height:200px; } .wfop .statement{ font-size:27px; } .wfop .top .tag{ display:none; } }
@media print{ .wfop{ background:#fff; } .wfop .sheet{ max-width:100%; padding:22px; } .wfop .fund,.wfop .chip,.wfop .ask,.wfop .cta .primary{ box-shadow:none; } .wfop .mapdots g{ transform:scale(1) !important; } }
@media (prefers-reduced-motion:reduce){ .wfop .mapdots g{ transition:none; transform:scale(1); } .wfop .op-gtile img{ transition:none; } }
`;

export default function SterlingPartnerPage() {
  const navyRef = useRef<HTMLDivElement>(null);
  const modalBodyRef = useRef<HTMLDivElement>(null);
  const [modalId, setModalId] = useState<string | null>(null);
  const [imgIdx, setImgIdx] = useState(0);
  const [mode, setMode] = useState<'all' | 'remote'>('all');
  const [gtkOpen, setGtkOpen] = useState<Record<number, boolean>>({});
  const [stageIdx, setStageIdx] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);
  const [railAt, setRailAt] = useState<'start' | 'mid' | 'end'>('start');

  const onRailScroll = () => {
    const el = railRef.current;
    if (!el) return;
    if (el.scrollLeft <= 10) setRailAt('start');
    else if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 10) setRailAt('end');
    else setRailAt('mid');
  };
  const scrollRail = (dir: 1 | -1) =>
    railRef.current?.scrollBy({ left: dir * 540, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });

  // Stage hero auto-rotate (conference page behaviour: 4.5s per slide).
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const t = setInterval(() => setStageIdx(i => (i + 1) % STAGE_SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);

  // "On-site or remote" filters like /menu: remote-capable services only.
  const visibleServices = mode === 'remote' ? FUND_SERVICES.filter(s => s.remote) : FUND_SERVICES;
  const nutritionVisible = true; // nutrition runs remote too — shown in both modes
  const visibleCount = visibleServices.length + (nutritionVisible ? 1 : 0);

  const modalIdx = modalId ? visibleServices.findIndex(s => s.id === modalId) : -1;
  const modalSvc = modalIdx >= 0 ? visibleServices[modalIdx] : null;
  const modalImages = modalSvc
    ? Array.from(new Set([...(modalSvc.photos || []), modalSvc.image])).slice(0, 6)
    : [];

  const navModal = useCallback((dir: 1 | -1) => {
    setModalId(cur => {
      const list = mode === 'remote' ? FUND_SERVICES.filter(s => s.remote) : FUND_SERVICES;
      const i = list.findIndex(s => s.id === cur);
      if (i < 0) return cur;
      return list[(i + dir + list.length) % list.length].id;
    });
  }, [mode]);

  // Reset media + scroll on every service change (same behaviour as /menu).
  useEffect(() => {
    setImgIdx(0);
    modalBodyRef.current?.scrollTo({ top: 0 });
  }, [modalId]);

  useEffect(() => {
    if (!modalId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalId(null);
      if (e.key === 'ArrowRight') navModal(1);
      if (e.key === 'ArrowLeft') navModal(-1);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = prev;
    };
  }, [modalId, navModal]);

  useEffect(() => {
    document.title = 'Shortcut × SterlingRisk';
    // Kick muted autoplay on the gallery videos (some browsers hold it until nudged).
    document.querySelectorAll<HTMLVideoElement>('.wfop .stage video').forEach((v) => {
      v.muted = true;
      v.play().catch(() => { /* autoplay blocked — poster/first frame still shows */ });
    });
    // Phone: cycle the 3 booking screens + step counter
    const screens = Array.from(document.querySelectorAll('.wfop .mp-screen'));
    const step = document.querySelector('.wfop .mp-step');
    let i = 0;
    const timer = window.setInterval(() => {
      i = (i + 1) % screens.length;
      screens.forEach((s, j) => s.classList.toggle('on', j === i));
      if (step) step.textContent = `${i + 1}/${screens.length}`;
    }, 2400);
    // Coverage map: pop dots in when the box enters the viewport
    const nb = navyRef.current;
    let io: IntersectionObserver | undefined;
    if (nb && 'IntersectionObserver' in window) {
      io = new IntersectionObserver((es) => {
        es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io?.unobserve(e.target); } });
      }, { threshold: 0.3 });
      io.observe(nb);
    } else if (nb) { nb.classList.add('in'); }
    return () => { window.clearInterval(timer); io?.disconnect(); };
  }, []);

  return (
    <div className="wfop">
      <style>{CSS}</style>
      <nav className="pnav">
        <div className="in">
          <div className="lft">
            <img className="plogo" src="/partners/sterlingrisk-logo.png" alt="SterlingRisk" />
            <span className="ndiv" />
            <span className="with">with
              <span className="slogo">
            <svg width="300" height="60" viewBox="0 0 300 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M66.3655 36.0468C66.0413 38.8847 65.1718 41.6677 63.5267 44.0384C59.6388 49.6416 52.9422 51.5122 46.3263 49.4718C39.7968 47.458 33.4645 41.7578 29 32.5209L35.1071 29.5692C38.9952 37.6134 44.0685 41.6771 48.3253 42.99C52.4957 44.2761 55.9662 43.0361 57.9539 40.1715C58.3082 39.6609 58.6128 39.0838 58.8647 38.4481C58.4821 38.469 58.0993 38.4758 57.7167 38.4686C53.3154 38.3863 49.2862 36.4763 46.254 33.8446C43.2423 31.2308 40.9302 27.6576 40.256 23.8648C39.5518 19.9037 40.6843 15.7358 44.4833 12.8244C46.2611 11.462 48.2112 10.6534 50.2623 10.497C52.3079 10.3411 54.2183 10.8516 55.8959 11.7507C59.1586 13.4992 61.6954 16.7797 63.4274 20.2988C64.5244 22.5278 65.3754 25.0044 65.9039 27.5488C68.9511 24.2883 72.2654 22.3492 75.0708 21.2597C76.5203 20.6968 77.8542 20.3526 78.973 20.172C79.9539 20.0137 81.1383 19.9183 82.1251 20.146L80.5999 26.7554C80.7176 26.7825 80.7806 26.792 80.7806 26.792C80.7802 26.797 80.5573 26.7871 80.054 26.8684C79.4204 26.9706 78.5465 27.1865 77.5263 27.5827C75.4942 28.3718 72.9611 29.8447 70.6113 32.4508C69.2721 33.9361 67.8462 35.1281 66.3655 36.0468ZM59.6515 31.5327C59.397 28.6954 58.5657 25.7815 57.3415 23.2941C55.9463 20.4593 54.2323 18.5548 52.6919 17.7293C51.968 17.3414 51.3388 17.2177 50.778 17.2604C50.2228 17.3028 49.4998 17.5258 48.6093 18.2083C47.0716 19.3867 46.6158 20.8859 46.9343 22.6776C47.2827 24.6377 48.6043 26.903 50.7 28.7219C52.7752 30.5229 55.3272 31.6397 57.8435 31.6867C58.4302 31.6977 59.0348 31.6513 59.6515 31.5327Z" fill="#FF5050" />
              <path fillRule="evenodd" clipRule="evenodd" d="M76.2969 23.05C73.0466 22.027 70.6121 19.9327 68.5865 17.6431L73.7638 13.0629C75.3858 14.8964 76.8142 15.9661 78.3723 16.4565C79.894 16.9354 81.999 17.0038 85.2365 15.9237L88.0518 22.1993C85.656 23.5754 84.3307 25.8167 83.7037 28.1354C83.3908 29.2923 83.2731 30.4032 83.2786 31.3063C83.2841 32.2171 83.4116 32.6805 83.4272 32.7373C83.4285 32.7422 83.4286 32.7431 83.4286 32.7431L77.0654 35.4434C76.5629 34.2592 76.3747 32.7616 76.3662 31.348C76.3572 29.8493 76.5482 28.1158 77.0309 26.3309C77.2825 25.4006 77.6191 24.4385 78.0574 23.4796C77.4588 23.3743 76.8723 23.2312 76.2969 23.05Z" fill="#FF5050" />
              <path d="M258.576 46.1066V15.827H265.319V46.1066H258.576ZM253.727 30.4159V24.6861H270.167V30.4159H253.727Z" fill="#175071" />
              <path d="M240.067 46.5908C238.098 46.5908 236.35 46.1941 234.822 45.4007C233.324 44.578 232.148 43.4614 231.296 42.051C230.444 40.6113 230.018 38.9658 230.018 37.1146V24.6855H236.762V37.0265C236.762 37.7611 236.879 38.3928 237.114 38.9217C237.379 39.4506 237.761 39.862 238.26 40.1558C238.76 40.4497 239.362 40.5966 240.067 40.5966C241.066 40.5966 241.86 40.288 242.447 39.671C243.035 39.0246 243.329 38.1431 243.329 37.0265V24.6855H250.072V37.0706C250.072 38.9511 249.646 40.6113 248.794 42.051C247.942 43.4614 246.767 44.578 245.268 45.4007C243.769 46.1941 242.036 46.5908 240.067 46.5908Z" fill="#175071" />
              <path d="M218.272 46.591C216.068 46.591 214.07 46.1062 212.277 45.1366C210.485 44.1669 209.075 42.83 208.046 41.1257C207.018 39.4215 206.504 37.5116 206.504 35.396C206.504 33.251 207.018 31.3411 208.046 29.6662C209.104 27.962 210.529 26.6251 212.322 25.6554C214.114 24.6858 216.127 24.2009 218.36 24.2009C220.035 24.2009 221.563 24.4948 222.944 25.0824C224.354 25.6407 225.603 26.4928 226.69 27.6388L222.371 31.9581C221.871 31.3998 221.283 30.9885 220.608 30.724C219.961 30.4596 219.212 30.3274 218.36 30.3274C217.39 30.3274 216.523 30.5477 215.759 30.9885C215.025 31.3998 214.437 31.9875 213.996 32.7515C213.585 33.4861 213.379 34.3529 213.379 35.3519C213.379 36.3509 213.585 37.2324 213.996 37.9964C214.437 38.7604 215.04 39.3627 215.803 39.8035C216.567 40.2442 217.42 40.4646 218.36 40.4646C219.241 40.4646 220.02 40.3177 220.696 40.0239C221.401 39.7006 222.003 39.2599 222.503 38.7016L226.778 43.021C225.662 44.1963 224.398 45.0925 222.988 45.7095C221.577 46.2972 220.005 46.591 218.272 46.591Z" fill="#175071" />
              <path d="M192.861 46.1066V15.827H199.605V46.1066H192.861ZM188.013 30.4159V24.6861H204.453V30.4159H188.013Z" fill="#175071" />
              <path d="M168.953 46.1061V24.6856H175.696V46.1061H168.953ZM175.696 34.3381L172.875 32.1343C173.434 29.6367 174.374 27.6974 175.696 26.3164C177.018 24.9354 178.855 24.2449 181.206 24.2449C182.234 24.2449 183.13 24.4065 183.894 24.7297C184.687 25.0235 185.378 25.4937 185.966 26.1401L181.955 31.2087C181.661 30.8855 181.294 30.6358 180.853 30.4595C180.412 30.2832 179.913 30.195 179.354 30.195C178.238 30.195 177.342 30.5476 176.666 31.2528C176.019 31.9286 175.696 32.957 175.696 34.3381Z" fill="#175071" />
              <path d="M153.871 46.591C151.668 46.591 149.67 46.1062 147.877 45.1366C146.114 44.1375 144.719 42.7859 143.69 41.0817C142.662 39.3774 142.147 37.4675 142.147 35.3519C142.147 33.2363 142.662 31.3411 143.69 29.6662C144.719 27.9914 146.114 26.6691 147.877 25.6995C149.64 24.7004 151.638 24.2009 153.871 24.2009C156.105 24.2009 158.103 24.6858 159.866 25.6554C161.629 26.6251 163.024 27.962 164.053 29.6662C165.081 31.3411 165.595 33.2363 165.595 35.3519C165.595 37.4675 165.081 39.3774 164.053 41.0817C163.024 42.7859 161.629 44.1375 159.866 45.1366C158.103 46.1062 156.105 46.591 153.871 46.591ZM153.871 40.4646C154.841 40.4646 155.693 40.2589 156.428 39.8476C157.162 39.4068 157.721 38.8045 158.103 38.0405C158.514 37.2471 158.72 36.3509 158.72 35.3519C158.72 34.3529 158.514 33.4861 158.103 32.7515C157.691 31.9875 157.118 31.3998 156.384 30.9885C155.678 30.5477 154.841 30.3274 153.871 30.3274C152.931 30.3274 152.094 30.5477 151.359 30.9885C150.625 31.3998 150.052 31.9875 149.64 32.7515C149.229 33.5154 149.023 34.3969 149.023 35.396C149.023 36.3656 149.229 37.2471 149.64 38.0405C150.052 38.8045 150.625 39.4068 151.359 39.8476C152.094 40.2589 152.931 40.4646 153.871 40.4646Z" fill="#175071" />
              <path d="M132.023 46.106V33.8972C132.023 32.7807 131.671 31.8845 130.966 31.2087C130.29 30.5035 129.423 30.1509 128.365 30.1509C127.631 30.1509 126.984 30.3125 126.426 30.6357C125.868 30.9295 125.427 31.3703 125.104 31.9579C124.78 32.5162 124.619 33.1626 124.619 33.8972L122.018 32.6191C122.018 30.9442 122.371 29.475 123.076 28.2116C123.781 26.9481 124.766 25.9784 126.029 25.3026C127.293 24.5974 128.747 24.2448 130.393 24.2448C132.068 24.2448 133.537 24.5974 134.8 25.3026C136.064 25.9784 137.033 26.9334 137.709 28.1675C138.414 29.3722 138.767 30.7826 138.767 32.3987V46.106H132.023ZM117.875 46.106V14.1075H124.619V46.106H117.875Z" fill="#175071" />
              <path d="M105.182 46.6348C103.919 46.6348 102.67 46.4732 101.436 46.15C100.231 45.8268 99.1001 45.3713 98.0423 44.7837C97.0139 44.1666 96.1324 43.4614 95.3978 42.6681L99.2324 38.7895C99.9376 39.5534 100.775 40.1558 101.745 40.5966C102.714 41.0079 103.772 41.2136 104.918 41.2136C105.711 41.2136 106.314 41.0961 106.725 40.861C107.166 40.6259 107.386 40.3027 107.386 39.8914C107.386 39.3625 107.122 38.9658 106.593 38.7013C106.093 38.4075 105.447 38.1577 104.654 37.9521C103.86 37.717 103.023 37.4672 102.141 37.2028C101.26 36.9383 100.422 36.571 99.629 36.1009C98.8357 35.6308 98.1892 34.9843 97.6897 34.1616C97.1902 33.3095 96.9405 32.237 96.9405 30.9441C96.9405 29.5631 97.2931 28.3731 97.9983 27.374C98.7035 26.3456 99.7025 25.5376 100.995 24.9499C102.288 24.3623 103.801 24.0684 105.535 24.0684C107.357 24.0684 109.032 24.3916 110.56 25.0381C112.117 25.6551 113.38 26.5807 114.35 27.8148L110.516 31.6934C109.84 30.9 109.076 30.3418 108.224 30.0185C107.401 29.6953 106.593 29.5337 105.8 29.5337C105.036 29.5337 104.463 29.6513 104.081 29.8863C103.699 30.092 103.508 30.4005 103.508 30.8119C103.508 31.2526 103.757 31.6052 104.257 31.8697C104.756 32.1341 105.403 32.3692 106.196 32.5749C106.99 32.7806 107.827 33.0303 108.708 33.3242C109.59 33.618 110.427 34.0147 111.221 34.5142C112.014 35.0137 112.661 35.6895 113.16 36.5417C113.66 37.3644 113.909 38.4516 113.909 39.8032C113.909 41.8894 113.116 43.5496 111.529 44.7837C109.972 46.0178 107.856 46.6348 105.182 46.6348Z" fill="#175071" />
            </svg>
              </span>
            </span>
          </div>
        </div>
      </nav>

      <div className="sheet">
        <Rev>
          <div className="hero-c">
            <p className="eyebrow">A Shortcut partnership for SterlingRisk</p>
            <h1>Let&rsquo;s put your clients&rsquo; wellness funds to work.</h1>
            <p className="lede">The wellness vendor you, your clients, and their people will thank you for.</p>
            <div className="stage">
              {STAGE_SLIDES.map((s, i) => (
                <div key={s.src} className={`sl${i === stageIdx ? ' on' : ''}`} aria-hidden={i !== stageIdx}>
                  {s.fit ? (
                    <>
                      <img className="fbg" src={s.src} alt="" aria-hidden />
                      <img className="ffg" src={s.src} alt={s.tag} />
                    </>
                  ) : (
                    <img src={s.src} alt={s.tag} style={s.pos ? { objectPosition: s.pos } : undefined} />
                  )}
                  <span className="stag">{s.tag}</span>
                </div>
              ))}
              <div className="sdots">
                {STAGE_SLIDES.map((_, i) => (
                  <button key={i} className={i === stageIdx ? 'on' : ''} onClick={() => setStageIdx(i)} aria-label={`Slide ${i + 1}`} />
                ))}
              </div>
            </div>
          </div>
        </Rev>

        <Rev>
          <div className="stats">
            <StatN end={500} suffix="+" label="companies served" first />
            <StatN end={92} suffix="%" label="of booked slots get used, across all events" />
            <StatN end={87} suffix="%" label="of companies rebook" />
          </div>

          <div className="lgm" aria-label="Clients including DraftKings, the NFL, BCG, Wix, Tripadvisor, PwC, Paramount, Warner Bros., White &amp; Case and MTV">
            <div className="track">
              {[false, true].map(dup => (
                <div key={String(dup)} className="set" aria-hidden={dup}>
                  {CLIENT_LOGOS.map(logo => (
                    <img key={`${logo.src}${dup}`} src={logo.src} alt={dup ? '' : logo.alt} className={logo.tall ? 'tall' : ''} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </Rev>

        <RevSection>
          <p className="label">The funds</p>
          <h2 className="stmt">Three carriers, three wellness funds. <span className="dim">We know how to put them to work.</span></h2>
          <div className="funds">
            <div className="fund"><img className="lg-cigna" src="/partners/carriers/cigna.svg" alt="Cigna" /></div>
            <div className="fund"><img className="lg-aetna" src="/partners/carriers/aetna.svg" alt="Aetna" /></div>
            <div className="fund"><img className="lg-anthem" src="/partners/carriers/anthem.svg" alt="Anthem" /></div>
          </div>
          <p className="note">Your clients are sitting on unused wellness funds, either because they do not know the funds exist or because they cannot find a reliable partner to deploy them with. <b>We are that partner.</b> Pre-approval language, carrier paperwork, the day itself, all handled. You bring the win to renewal.</p>
        </RevSection>

        <RevSection>
          <p className="label">The menu</p>
          <h2 className="stmt">What the fund covers. <span className="dim">Massage to mindfulness, all fund eligible.</span></h2>
          <div className="sm-filter">
            <div className="sm-pills" role="radiogroup" aria-label="Where">
              {([
                { v: 'all' as const, l: 'All services' },
                { v: 'remote' as const, l: 'On-site or remote' },
              ]).map(opt => (
                <button
                  key={opt.v}
                  role="radio"
                  aria-checked={mode === opt.v}
                  className={mode === opt.v ? 'on' : ''}
                  onClick={() => setMode(opt.v)}
                >
                  {opt.l}
                </button>
              ))}
            </div>
            <span className="sm-count">{visibleCount} service{visibleCount === 1 ? '' : 's'}</span>
          </div>
          <div ref={railRef} onScroll={onRailScroll} className="srail">
            {visibleServices.map(svc => (
              <button
                key={svc.id}
                className={`sc${svc.cropArt ? ' crop' : ''}`}
                onClick={() => setModalId(svc.id)}
                aria-label={`More about ${svc.name.toLowerCase()}`}
              >
                <img
                  className="art"
                  src={svc.image}
                  alt={svc.name}
                  style={ART_POS[svc.id] ? { objectPosition: ART_POS[svc.id] } : undefined}
                />
                <span className="scrimT" />
                <span className="ttl">{svc.name}</span>
                <span className="plus">+</span>
              </button>
            ))}
            <div className="sc nutri static">
              <img className="art" src={`${A}/onepager/nutrition-avocado.png`} alt="Nutrition coaching" />
              <span className="scrimT" />
              <span className="ttl">Nutrition coaching</span>
            </div>
          </div>
          <div className="rail-nav">
            <button onClick={() => scrollRail(-1)} disabled={railAt === 'start'} aria-label="Previous">←</button>
            <button onClick={() => scrollRail(1)} disabled={railAt === 'end'} aria-label="Next">→</button>
          </div>
          <p className="note">Delivered onsite by <b>licensed, vetted pros</b>, one team running the whole day, and your clients&rsquo; remote employees are covered too.</p>
        </RevSection>

        <RevSection>
          <p className="label">Packages</p>
          <h2 className="stmt">Our most popular packages. <span className="dim">Pick one, or combine.</span></h2>
          {([
            { key: 'fund', chip: 'Fund eligible', chipClass: 'fund', line: 'Paid through your client’s carrier wellness fund.', pkgs: STERLING_PACKAGES.filter(p => FUND_ELIGIBLE_PKGS.has(p.id)) },
            { key: 'rate', chip: 'Partner rate · 10% off', chipClass: 'rate', line: 'Beauty and headshots, at the SterlingRisk partner rate.', pkgs: STERLING_PACKAGES.filter(p => !FUND_ELIGIBLE_PKGS.has(p.id)) },
          ]).map(group => (
            <React.Fragment key={group.key}>
              <div className="pk-gh">
                <span className={`gchip ${group.chipClass}`}>{group.chip}</span>
                <p>{group.line}</p>
              </div>
              <div className="cpk-grid">
                {group.pkgs.map(pkg => (
                  <div key={pkg.id} className="cpk">
                    <div className="ph"><img src={pkg.image} alt="" /></div>
                    <div className={`nb ${pkg.bar}`}>{pkg.name}</div>
                    <div className="bd">
                      <p className="pmeta">{pkg.meta}</p>
                      <p className="pdesc">{pkg.desc}</p>
                      <ul>
                        {pkg.bullets.map(b => <li key={b}>{b}</li>)}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </React.Fragment>
          ))}
          <p className="note" style={{ marginTop: 16 }}>Every package includes <b>pros, gear, setup, self-serve booking, digital invites and onsite signage</b>. Fund eligible packages can be paid through your client&rsquo;s carrier wellness fund. Everything else carries the 10% partner rate.</p>
        </RevSection>

        {modalSvc && (
          <div className="sm-overlay" onClick={() => setModalId(null)} role="dialog" aria-modal="true" aria-label={modalSvc.name}>
            <div className="sm-modal" onClick={e => e.stopPropagation()}>
              <button className="sm-close" onClick={() => setModalId(null)} aria-label="Close">×</button>
              <div className="sm-media">
                {modalImages.map((src, i) => (
                  <img
                    key={src}
                    src={src}
                    alt={i === imgIdx ? modalSvc.name : ''}
                    aria-hidden={i !== imgIdx}
                    className={`${i === imgIdx ? 'on' : ''}${src === modalSvc.image && modalSvc.cropArt ? ' crop' : ''}`}
                    style={src === modalSvc.image && ART_POS[modalSvc.id] ? { objectPosition: ART_POS[modalSvc.id] } : undefined}
                  />
                ))}
                {modalImages.length > 1 && (
                  <div className="sm-dots">
                    {modalImages.map((_, i) => (
                      <button key={i} className={i === imgIdx ? 'on' : ''} onClick={() => setImgIdx(i)} aria-label={`Photo ${i + 1}`} />
                    ))}
                  </div>
                )}
              </div>
              <div className="sm-body" ref={modalBodyRef}>
                <p className="sm-pos">What the fund covers · {modalIdx + 1} of {visibleServices.length}</p>
                <h3 className="sm-name">{modalSvc.name}</h3>
                <p className="sm-desc">{modalSvc.desc}</p>
                <div className="sm-cols">
                  <div>
                    <p className="sm-colh">What we bring</p>
                    <ul>
                      {modalSvc.bring.map(b => (
                        <li key={b.lead}><span><b>{b.lead}</b>, {b.rest}</span></li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="sm-colh">{modalSvc.columnKind}</p>
                    <ul>
                      {modalSvc.items.map(it => (
                        <li key={it.rest}><span>{it.lead ? <><b>{it.lead}</b>, {it.rest}</> : it.rest}</span></li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="sm-foot">
                  <p className="sm-meta">{modalSvc.metaFooter}</p>
                  <div className="sm-nav">
                    <button onClick={() => navModal(-1)} aria-label="Previous service">←</button>
                    <button onClick={() => navModal(1)} aria-label="Next service">→</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <RevSection>
          <p className="label">Partner benefits</p>
          <h2 className="stmt">Why partner with Shortcut. <span className="dim">For you and your clients.</span></h2>
          <div className="pkgs">
            <div className="pkg">
              <h3>Fund deployment, done.</h3>
              <p>Pre-approval language, carrier-ready invoices, W-9, participation summaries. Your team never touches the paperwork, and neither does your client.</p>
            </div>
            <div className="pkg rec">
              <span className="badge">Partner rate</span>
              <h3>10% off the rest of the menu.</h3>
              <p>Carrier funds do not cover beauty services or headshots. SterlingRisk clients get 10% off hair, nails, facials and headshots.</p>
            </div>
            <div className="pkg">
              <h3>A renewal story.</h3>
              <p>Value found inside a plan your client already pays for. A concrete win to bring to the negotiation, with the participation numbers to back it up.</p>
            </div>
            <div className="pkg">
              <h3>The whole team, wherever they work.</h3>
              <p>Mindfulness, sound baths, yoga and nutrition coaching run in person or over Zoom, so remote employees are covered too. One vendor across your book, nationwide.</p>
            </div>
            <div className="pkg">
              <h3>CLE for your law firm clients.</h3>
              <p>Pause, Breathe, Lead is a New York accredited 1.0 Law Practice Management CLE. We manage the accreditation, attendance tracking and credit reporting.</p>
            </div>
            <div className="pkg">
              <h3>Programming built around each client.</h3>
              <p>Self-funded, 100 plus lives, a brutal busy season. We shape the program to the client, not the other way around.</p>
            </div>
          </div>
        </RevSection>

        <RevSection>
          <p className="label">What sets us apart</p>
          <h2 className="stmt">Wellness their people show up for. <span className="dim">Loved by their teams. All handled for you.</span></h2>
          <div className="feat4">
            <div className="feat sky">
              <p className="feat-kick">The Shortcut pros</p>
              <h3 className="feat-h">Pros you&rsquo;d<br />book yourself.</h3>
              <p className="feat-p">Licensed, vetted and insured, professional, personal, reliable.</p>
              <img className="guy" src={`${A}/onepager/pros-guy-flush.png`} alt="A Shortcut pro" />
            </div>
            <div className="feat coralg">
              <p className="feat-kick">Seamless tech</p>
              <h3 className="feat-h">Booking in<br />three taps.</h3>
              <p className="feat-p">Employees pick their own slot, no spreadsheets, no chasing.</p>
              <div className="phonewrap">
                <div className="mini-phone">
                  <div className="mp-bar"><span className="mp-logo">A</span>Wellness Day<span className="mp-step">1/3</span></div>
                  <div className="mp-stage">
                    <div className="mp-screen on">
                      <p className="mp-eyebrow" style={{ marginTop: 0 }}>Pick your service</p>
                      <div className="mp-opt sel">Chair massage<i></i></div>
                      <div className="mp-opt">Table massage<i></i></div>
                      <div className="mp-cta">Next</div>
                    </div>
                    <div className="mp-screen">
                      <p className="mp-eyebrow" style={{ marginTop: 0 }}>Pick your time</p>
                      <div className="mp-slots"><span>11:00</span><span className="taken">11:20</span><span className="sel">11:40</span><span>12:00</span></div>
                      <div className="mp-cta">Book my slot</div>
                    </div>
                    <div className="mp-screen">
                      <div className="mp-check"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" /></svg></div>
                      <div className="mp-done">You&rsquo;re booked!</div>
                      <div className="mp-sub2">Chair massage · 11:40 AM</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="feat navy" ref={navyRef}>
              <p className="feat-kick">Nationwide coverage</p>
              <h3 className="feat-h">One vendor. <span>Every office.</span></h3>
              <p className="feat-p">One vetted network across all 50 states, one team to call.</p>
              <div className="mapwrap">
                <img className="usmap" src={`${A}/onepager/us-map.svg`} alt="Shortcut coverage across the US" />
                <svg className="mapdots" viewBox="0 0 960 593" aria-hidden="true">
                  {MAP_DOTS.map(([cx, cy], idx) => (
                    <g key={idx} style={{ transformOrigin: `${cx}px ${cy}px`, transitionDelay: `${(0.4 + idx * 0.06).toFixed(2)}s` }}>
                      <circle cx={cx} cy={cy} r="16" fill="#FF5050" opacity=".25" />
                      <circle cx={cx} cy={cy} r="7" fill="#FF5050" />
                    </g>
                  ))}
                </svg>
              </div>
            </div>
            <div className="feat aquag">
              <p className="feat-kick">We fill every slot</p>
              <h3 className="feat-h">Turnout.<br />Solved.</h3>
              <p className="feat-p">Digital invites and onsite signage fill the calendar for you.</p>
              <div className="stat-wrap">
                <div className="stat-big">92%</div>
                <div className="stat-lbl">of booked slots get used</div>
                <div className="stat-bar"><i></i></div>
                <div className="stat-mini">
                  <div><b>87%</b><span>of companies rebook</span></div>
                  <div><b>0</b><span>admin work for you</span></div>
                </div>
              </div>
            </div>
          </div>
        </RevSection>

        <RevSection>
          <p className="label">How it works</p>
          <h2 className="stmt">We handle the paperwork. <span className="dim">Four steps. None of them yours.</span></h2>
          <div className="gtk">
            {[
              { kick: 'Step one', title: 'Pre-approval.', desc: 'We send your client’s carrier consultant the event details before the day, in the language they approve.', grad: 'g1' },
              { kick: 'Step two', title: 'The day.', desc: 'We run it onsite, open to their whole team. Your client approves a date and does nothing else.', grad: 'g2' },
              { kick: 'Step three', title: 'Documentation.', desc: 'We format the invoice and the participation summary exactly the way the carrier needs.', grad: 'g3' },
              { kick: 'Step four', title: 'Reimbursed.', desc: 'The fund pays. With Aetna, it often pays us directly, so your client never fronts the cash.', grad: 'g4' },
            ].map((card, i) => (
              <button
                key={card.kick}
                onClick={() => setGtkOpen(o => ({ ...o, [i]: !o[i] }))}
                className={`gc ${card.grad}${gtkOpen[i] ? ' open' : ''}`}
              >
                <div className="kick">{card.kick}</div>
                <div className="gt">{card.title}</div>
                <div className="gd">{card.desc}</div>
                <span className="num">{String(i + 1).padStart(2, '0')}</span>
                <span className="plus2">+</span>
              </button>
            ))}
          </div>
        </RevSection>

        <RevSection>
          <p className="label">What clients say</p>
          <h2 className="stmt">Booked once, kept forever. <span className="dim">BCG and DraftKings use us at every US office.</span></h2>
          <div className="quotes">
            <div className="q1">
              <img className="ql" src={`${C}/draftkings.svg`} alt="DraftKings" />
              <p>Shortcut has become an extension of the DraftKings family.</p>
              <div className="qwho">
                <img src={`${C}/christian.jpeg`} alt="" />
                <div><b>Christian W.</b><span>Employee Experience Specialist, DraftKings</span></div>
              </div>
            </div>
            <div className="q2">
              <img className="ql" src={`${C}/logos/teads.svg`} alt="Teads" />
              <p>They go above and beyond to make each event tailored to our team. An atmosphere that&rsquo;s both relaxing and enjoyable.</p>
              <div className="qwho">
                <img src={`${C}/allison.png`} alt="" />
                <div><b>Allison B.</b><span>Sr. Manager, Compensation &amp; Benefits, Teads</span></div>
              </div>
            </div>
          </div>
        </RevSection>

        <RevSection>
          <div className="ask">
            <p className="label" style={{ margin: 0 }}>One question for your next client call</p>
            <p className="q">Who is your medical carrier, and when does your plan year end? If the answer is Cigna, Aetna, or Anthem, there is probably money waiting.</p>
          </div>
        </RevSection>

        <RevSection>
          <div className="cta-band">
            <h2 className="cta-h">Let&rsquo;s deploy your clients&rsquo; unused funds before the end of 2026.</h2>
            <p className="note">Most plan years reset in December, and whatever is left goes back to the carrier. Tell us which clients come to mind and we&rsquo;ll map the first events together.</p>
            <div className="cta">
              <a className="primary" href="mailto:caren@getshortcut.co">Email Caren</a>
            </div>
          </div>
        </RevSection>

        <footer>
          <span className="trust">Trusted by <b>500+ companies</b>, including BCG and DraftKings. <b>87%</b> rebook, and <b>92%</b> of booked slots get used.</span>
          <a href="https://getshortcut.co">getshortcut.co</a>
        </footer>
      </div>
    </div>
  );
}
