import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useGenericLandingPage } from '../contexts/GenericLandingPageContext';
import { supabase } from '../lib/supabaseClient';
import { GenericLandingPage, ConferencePackageOverride } from '../types/genericLandingPage';
import { CONFERENCE_PACKAGES, CONFERENCE_BUNDLES, ConferencePkgBar } from '../utils/conferencePackages';

// ---------------------------------------------------------------------------
// Retreats & Conferences one-pager. Faithful recreation of the design handoff
// (design_handoff_retreats_conferences, production config: hero A gallery,
// services Showcase rail, packages Stations). Visual values mirror the
// reference CSS exactly: ink #032232, ink-soft #45596A, line #E2E9E8,
// cyan #9EFAFF, sun #FEDC64, brand #003756, coral #FF5050.
// Per-client customization (generic_landing_pages, page_type='conference'):
// client name + logo, package price overrides, pricing visibility,
// whole-section removal.
// ---------------------------------------------------------------------------

const A = '/conference'; // asset root in public/

const INK = 'text-[#032232]';
const SOFT = 'text-[#45596A]';
const LINE = 'border-[#E2E9E8]';

interface ServiceDef {
  id: string;
  title: string;
  sub: string;
  image: string;
  imagePos?: string;
  modalImages: string[];
  desc: string;
  bringHeading: string;
  bring: { t: string; d?: string }[];
  listHeading: string;
  list: { t: string; d?: string }[];
  meta: string;
}

const SERVICES: ServiceDef[] = [
  {
    id: 'massage', title: 'Massage', sub: 'Chair & table, 15–20-min resets',
    image: `${A}/services/massage.png`,
    modalImages: [`${A}/services/massage.png`, `${A}/onepager/svc/candid-massage.jpeg`],
    desc: 'Rejuvenating chair or table massage right at the venue. Our expert therapists create a spa-like ambiance with soothing scents, customized lighting and relaxing sounds, and rotate through your team on 15–20-minute appointments, about three an hour per therapist.',
    bringHeading: 'What we bring',
    bring: [
      { t: 'Chair or table setups', d: 'with optional privacy screens' },
      { t: 'Spa ambiance', d: 'music, aromatherapy & lighting' },
      { t: 'Therapist preference', d: 'attendees pick therapist gender' },
    ],
    listHeading: 'Service menu',
    list: [
      { t: 'Chair massage', d: 'neck, shoulders, back & arms' },
      { t: 'Table massage', d: 'deeper full-body work with oils' },
      { t: 'Sports', d: 'deep-tissue muscle recovery' },
      { t: 'Compression', d: 'rhythmic pressure for circulation' },
      { t: 'Reiki reset', d: 'grounding energy work, fully clothed' },
    ],
    meta: 'Chair & table · 15–20-min resets',
  },
  {
    id: 'hair', title: 'Hair', sub: 'Cuts & styling, 20–30-min slots',
    image: `${A}/services/hair-v3.png`,
    modalImages: [`${A}/services/hair-v3.png`, `${A}/onepager/svc/makeup-office.jpg`],
    desc: 'Precision cuts, professional styling and grooming essentials, right at the venue. Stylists experienced with all hair types and textures, brand-name products, and full sanitation between appointments. Space left pristine.',
    bringHeading: 'What we bring',
    bring: [
      { t: 'Inclusive styling', d: 'all hair types & textures' },
      { t: 'Premium products', d: 'brand-name, professional-grade' },
      { t: 'Clean & pristine', d: 'sanitation between every client' },
    ],
    listHeading: 'Service menu',
    list: [
      { t: 'Barber cut', d: 'quick cleanups included' },
      { t: 'Beard trim', d: 'shaping & grooming' },
      { t: 'Salon cut & style', d: 'all hair types & textures' },
      { t: 'Blowout', d: 'hot-tool styling & touch-ups' },
    ],
    meta: 'Cuts & styling · 20–30-min appointments',
  },
  {
    id: 'nails', title: 'Nails', sub: 'Mani & pedi, 20–30-min appointments',
    image: `${A}/services/nails.png`,
    modalImages: [`${A}/services/nails.png`],
    desc: 'Manicures and pedicures that blend relaxation with elegance. Licensed technicians, single-use kits for every appointment and sanitized metal tools between clients. A pampered escape that leaves attendees refreshed and polished.',
    bringHeading: 'What we bring',
    bring: [
      { t: 'Licensed technicians', d: 'insured for any venue' },
      { t: 'Hygiene first', d: 'single-use kits, sanitized tools' },
      { t: '20+ polish colors', d: 'classic, trendy & seasonal' },
    ],
    listHeading: 'Service menu',
    list: [
      { t: 'Classic manicure', d: 'shape, buff, cuticle care & polish' },
      { t: 'Gel manicure', d: 'long-lasting gel polish' },
      { t: 'Dry pedicure', d: 'waterless, venue-friendly' },
      { t: 'Hand treatment', d: 'moisturizer + hand massage' },
    ],
    meta: 'Mani & pedi · 20–30-min appointments',
  },
  {
    id: 'facials', title: 'Facials', sub: 'Express & signature, 20-min slots',
    image: `${A}/services/facial.png`,
    modalImages: [`${A}/services/facial.png`],
    desc: 'Professional facial treatments that provide deep cleansing, hydration and relaxation. Attendees walk out refreshed and rejuvenated mid-event. Express 20-minute slots, all skin types welcome.',
    bringHeading: 'What we bring',
    bring: [
      { t: 'Licensed estheticians', d: 'insured for any venue' },
      { t: 'Premium skincare', d: 'professional-grade, hypoallergenic' },
      { t: 'Spa atmosphere', d: 'soothing music & aromatherapy' },
    ],
    listHeading: 'Service menu',
    list: [
      { t: 'Express facial', d: 'quick cleanse & hydration' },
      { t: 'Signature facial', d: 'full treatment with extractions' },
      { t: 'LED light therapy', d: 'results-boosting add-on' },
      { t: 'Mask treatments', d: 'hydrating & detoxifying' },
    ],
    meta: 'Express facials · 20-min appointments',
  },
  {
    id: 'headshots', title: 'Headshots', sub: '8–12-min sessions, retouching included',
    image: `${A}/services/headshot.png`,
    modalImages: [`${A}/services/headshot.png`],
    desc: 'A consistent, professional look across the whole team. Experienced corporate photographers with expert posing guidance, optional hair and makeup touch-ups, and professionally retouched photos delivered within 5–7 business days.',
    bringHeading: 'What we bring',
    bring: [
      { t: 'Outfit guidance', d: 'pre-session consultation' },
      { t: 'Backdrop options', d: 'multiple looks to choose from' },
      { t: 'Pro retouching', d: 'included with every photo' },
    ],
    listHeading: 'Formats',
    list: [
      { t: '8–12-minute sessions' },
      { t: 'Optional 10–15-min hair & makeup touch-ups' },
      { t: 'Delivered in 5–7 business days' },
    ],
    meta: '8–12-min sessions · retouching included',
  },
  {
    id: 'mindfulness', title: 'Mindfulness', sub: 'Guided meditations & practical tools',
    image: `${A}/services/mindfulness.png`,
    modalImages: [`${A}/services/mindfulness.png`],
    desc: 'Guided meditations and practical tools to reduce stress and sharpen focus, led by Courtney Schulnick, an attorney with two decades of experience and extensive training from the Myrna Brind Center for Mindfulness. One dedicated facilitator across every session.',
    bringHeading: 'What we bring',
    bring: [
      { t: 'Dedicated facilitator', d: 'the same expert every session' },
      { t: 'Custom audio recordings', d: 'guided meditations to keep' },
      { t: 'Handouts & exercises', d: 'tools for daily practice' },
    ],
    listHeading: 'Formats',
    list: [
      { t: '30-min drop-ins & themed sessions' },
      { t: '40 or 60-min intro courses' },
      { t: 'Onstage, in breakouts, or on Zoom' },
    ],
    meta: 'Guided sessions · any group size',
  },
  {
    id: 'sound-bath', title: 'Sound bath', sub: 'Crystal bowls, 30 or 60 min',
    image: `${A}/services/crystal-sound-bath.png`,
    modalImages: [`${A}/services/crystal-sound-bath.png`, `${A}/onepager/svc/crystal-sound-bath-rooftop.webp`],
    desc: 'A group sound bath built around crystal singing bowls, led live by a facilitator with 200+ hours of sound-healing training. Your team settles in, eyes closed, and lets the tones do the work. A nervous-system reset, not theater.',
    bringHeading: 'What we bring',
    bring: [
      { t: 'Trained facilitator', d: '200+ hours of sound-healing training' },
      { t: 'Full instrument kit', d: 'bowls, gong, chimes, setup & breakdown' },
      { t: 'RSVP blurb', d: 'drop-in copy to drive sign-ups' },
    ],
    listHeading: 'Formats',
    list: [
      { t: '30 or 60-minute sessions' },
      { t: 'In-person, virtual or hybrid' },
      { t: 'Sit or lie down. No experience needed' },
    ],
    meta: 'Group session · any group size',
  },
  {
    id: 'yoga', title: 'Yoga', sub: 'Chair or mat, in person or virtual',
    image: `${A}/services/yoga.png`,
    modalImages: [`${A}/services/yoga.png`],
    desc: 'Live yoga classes led by RYT-200+ certified instructors. The same teacher every time, so the team builds a rhythm. Chair classes run in any conference room with zero equipment; mat classes range from gentle flow to restorative.',
    bringHeading: 'What we bring',
    bring: [
      { t: 'Certified instructor', d: 'modifications for every level' },
      { t: 'Tailored playlist', d: 'matched to the room' },
      { t: 'Early arrival', d: 'set up 15 minutes before start' },
    ],
    listHeading: 'Formats',
    list: [
      { t: 'Chair yoga', d: 'no mats, no changing' },
      { t: 'Vinyasa or restorative + yin (60 min)' },
      { t: 'Virtual livestream for remote teams' },
    ],
    meta: 'Group class · any group size',
  },
  {
    id: 'strength-sculpt', title: 'Strength & sculpt', sub: 'Bodyweight, bands or light weights',
    image: `${A}/services/strength-sculpt.png`,
    modalImages: [`${A}/services/strength-sculpt.png`],
    desc: 'A full-body strength class that meets every fitness level. Bodyweight, light dumbbells or bands build strength, posture and stability, scaled up or down on the spot so nobody feels behind.',
    bringHeading: 'What we bring',
    bring: [
      { t: 'Trained instructor', d: 'scales every move to the room' },
      { t: 'Ready-to-go class', d: 'equipment optional, not required' },
      { t: 'RSVP blurb', d: 'drop-in copy to drive sign-ups' },
    ],
    listHeading: 'Formats',
    list: [
      { t: '30 or 60-minute classes' },
      { t: 'In-person or live over video' },
      { t: 'Bodyweight, dumbbells or bands' },
    ],
    meta: 'Group class · any group size',
  },
  {
    id: 'dance-cardio', title: 'Dance cardio', sub: 'Simple moves, full-out to low-impact',
    image: `${A}/services/dance-cardio.png`,
    modalImages: [`${A}/services/dance-cardio.png`],
    desc: 'An upbeat, music-driven cardio class that reads more like a good playlist than a workout, led by a trained dancer who keeps every level moving. Simple moves anyone can follow, adaptable from full-out to low-impact.',
    bringHeading: 'What we bring',
    bring: [
      { t: 'Trained dancer-instructor', d: 'fun, not intimidating' },
      { t: 'Built-out playlist', d: 'plus the full guided class' },
      { t: 'RSVP blurb', d: 'drop-in copy to drive sign-ups' },
    ],
    listHeading: 'Formats',
    list: [
      { t: '30 or 60-minute classes' },
      { t: 'In-person or live over video' },
      { t: 'Comfortable clothes, no experience' },
    ],
    meta: 'Group class · any group size',
  },
  {
    id: 'somatic-movement', title: 'Somatic movement', sub: 'Guided movement + crystal sound bath',
    image: `${A}/services/somatic-movement.png`,
    modalImages: [`${A}/services/somatic-movement.png`],
    desc: 'Gentle somatic movement first, crystal sound bath second. One facilitator trained in both modalities. Slow, guided movement unwinds what the body has been holding, then the bowls carry it the rest of the way from wired to rested.',
    bringHeading: 'What we bring',
    bring: [
      { t: 'Dual-trained facilitator', d: 'somatic movement + sound healing' },
      { t: 'Movement + sound kit', d: 'bowls, instruments, setup & breakdown' },
      { t: 'RSVP blurb', d: 'drop-in copy to drive sign-ups' },
    ],
    listHeading: 'Formats',
    list: [
      { t: '30 or 60-minute sessions' },
      { t: 'In-person at your venue' },
      { t: 'Standing, seated or on the floor' },
    ],
    meta: 'Movement + bowls · any group size',
  },
  {
    id: 'assisted-stretch', title: 'Assisted stretch', sub: 'One-on-one, fully clothed, 10–20 min',
    image: `${A}/services/assisted-stretch.png`,
    modalImages: [`${A}/services/assisted-stretch.png`, `${A}/onepager/svc/stretch-mobility.webp`],
    desc: 'One-on-one assisted stretching with a certified specialist. Backgrounds in physical therapy, sports massage and PNF/FST. Targeted release for desk and travel tightness in the neck, shoulders, hips and lower back. Fully clothed, no oils, same sign-up model as a massage day.',
    bringHeading: 'What we bring',
    bring: [
      { t: 'Certified specialist', d: 'PNF/FST-trained, not a generalist' },
      { t: 'All equipment', d: 'chair or table, straps, mats, sanitizer' },
      { t: 'Sign-up kit', d: 'sheet plus a pre-event Slack blurb' },
    ],
    listHeading: 'Formats',
    list: [
      { t: 'Express chair', d: 'any open corner' },
      { t: 'Premium table', d: 'deeper work, curtained space' },
      { t: '10–20-minute rotating slots' },
    ],
    meta: 'One-on-one · 10–20-min appointments',
  },
];

const CLIENT_LOGOS = [
  { src: `${A}/onepager/logos/draftkings.svg`, alt: 'DraftKings' },
  { src: `${A}/onepager/logos/nfl.svg`, alt: 'NFL', tall: true },
  { src: `${A}/onepager/logos/bcg.svg`, alt: 'BCG' },
  { src: `${A}/onepager/logos/wix.svg`, alt: 'Wix' },
  { src: `${A}/onepager/logos/tripadvisor.svg`, alt: 'Tripadvisor' },
  { src: `${A}/onepager/logos/pwc.svg`, alt: 'PwC' },
  { src: `${A}/onepager/logos/paramount.svg`, alt: 'Paramount' },
  { src: `${A}/onepager/logos/warner-bros.svg`, alt: 'Warner Bros.', tall: true },
  { src: `${A}/onepager/logos/white-case.svg`, alt: 'White & Case' },
  { src: `${A}/onepager/logos/mtv.svg`, alt: 'MTV' },
];

const HERO_TILES = [
  { src: `${A}/onepager/hero-massage-clean.png`, tag: 'Massage', main: true, scale: 'scale-[1.3]' },
  { src: `${A}/onepager/hero-mindfulness-clean.png`, tag: 'Mindfulness', scale: 'scale-[1.35]' },
  { src: `${A}/onepager/hero-headshots-clean.png`, tag: 'Headshots', scale: 'scale-[1.5]' },
  { src: `${A}/onepager/hero-hair-clean.png`, tag: 'Hair & makeup', scale: 'scale-[1.5]' },
  { src: `${A}/onepager/hero-nails-clean.png`, tag: 'Nails', scale: 'scale-[1.15]' },
];

const CASE_SLIDES = [
  { src: `${A}/onepager/wh/booth-signage.jpeg`, alt: 'Chair massage at the Shortcut booth, Workhuman Live', pos: 'object-[center_20%]' },
  { src: `${A}/onepager/wh/booth-2.jpeg`, alt: 'Shortcut massage therapist welcoming an attendee', pos: 'object-[center_30%]' },
  { src: `${A}/onepager/wh/booth-3.jpeg`, alt: 'Massage stations on the expo floor', pos: 'object-[center_40%]' },
];

const GOOD_TO_KNOW: { t: string; d: React.ReactNode }[] = [
  { t: 'We bring everything.', d: 'Chairs, tables, gear, products and signage. You supply the space and a standard outlet.' },
  { t: 'In and out on your schedule.', d: 'Set up before doors open, packed up and gone by close. No disruption to your program.' },
  { t: 'Paperwork, ready.', d: 'Licensed, vetted, insured pros. Certificate of insurance for your venue on request.' },
  { t: 'One point of contact.', d: 'A dedicated onsite lead runs the floor from load-in to teardown. You never manage a vendor mid-event.' },
  { t: 'Any venue, anywhere in the US.', d: 'Hotels, convention centers, offices and offsites. One team, coast to coast.' },
  { t: 'Dates fill fast.', d: <>Share your date early. 4+ events a year unlocks <b className={`${INK} font-semibold`}>15% off</b>, 9+ unlocks <b className={`${INK} font-semibold`}>20%</b>.</> },
];

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Scroll-reveal wrapper (mirrors .rev/.rev.in: fade + 16px rise, .6s).
const Reveal: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);
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
  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-[600ms] ease-[cubic-bezier(.2,.6,.2,1)] ${shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      {children}
    </div>
  );
};

// Hero Cover (variant B) tilted cards
const HERO_COVER_CARDS = [
  { src: `${A}/onepager/hero-massage-card.png`, cap: 'Stress-melting massage', color: 'navy', tilt: 'rotate-[-3deg]' },
  { src: `${A}/onepager/hero-nails-card.png`, cap: 'Rejuvenating nail care', color: 'cyan', tilt: 'rotate-[2deg] -translate-y-3' },
  { src: `${A}/onepager/hero-mindfulness-card.png`, cap: 'Grounding mindfulness', color: 'pink', tilt: 'rotate-[-1.5deg]' },
  { src: `${A}/onepager/hero-headshots-card.png`, cap: 'Picture-perfect headshots', color: 'navy', tilt: 'rotate-[2.5deg] -translate-y-2.5' },
  { src: `${A}/onepager/hero-hair-card.png`, cap: 'Refreshing hair & beauty', color: 'cyan', tilt: 'rotate-[-2deg]' },
];
const COVER_CARD_COLORS: Record<string, { bg: string; cap: string }> = {
  navy: { bg: 'bg-shortcut-blue', cap: 'text-[#9EFAFF]' },
  cyan: { bg: 'bg-[#9EFAFF]', cap: 'text-[#003756]' },
  pink: { bg: 'bg-[#F7BBFF]', cap: 'text-[#003756]' },
};

// Hero Stage (variant C) slides: real event photos; 'fit' slides letterbox the
// photo over a blurred copy.
const STAGE_SLIDES = [
  { src: `${A}/onepager/gallery/massage-event.jpg`, tag: 'Massage', pos: '' },
  { src: `${A}/onepager/gallery/somatic-event.webp`, tag: 'Movement', pos: '' },
  { src: `${A}/onepager/svc/crystal-sound-bath-rooftop.webp`, tag: 'Sound bath', pos: 'object-[center_45%]' },
  { src: `${A}/onepager/svc/stretch-mobility.webp`, tag: 'Assisted stretch', pos: 'object-[center_40%]' },
];

const ROT_WORDS = ['conference', 'retreat', 'offsite'];

// Good-to-know Cards (rail variant): 6 gradient cards, desc reveals on tap.
const GTK_CARDS = [
  { kick: 'Setup', title: 'We bring everything.', desc: 'Chairs, tables, gear, products and signage. You supply the space and a standard outlet.', grad: 'bg-[linear-gradient(155deg,#9EFAFF,#4FD4E4)]', dk: false },
  { kick: 'Schedule', title: 'In and out on your schedule.', desc: 'Set up before doors open, packed up and gone by close. No disruption to your program.', grad: 'bg-[linear-gradient(155deg,#FEDC64,#FFC93C)]', dk: false },
  { kick: 'Insurance', title: 'Paperwork, ready.', desc: 'Licensed, vetted, insured pros. Certificate of insurance for your venue on request.', grad: 'bg-[linear-gradient(155deg,#F7BBFF,#E49BF7)]', dk: false },
  { kick: 'Support', title: 'One point of contact.', desc: 'A dedicated onsite lead runs the floor from load-in to teardown.', grad: 'bg-[linear-gradient(155deg,#083650,#041D2C)]', dk: true },
  { kick: 'Coverage', title: 'Any venue, anywhere in the US.', desc: 'Hotels, convention centers, offices and offsites. One team wherever your event lands.', grad: 'bg-[linear-gradient(155deg,#01879C,#015565)]', dk: true },
  { kick: 'Booking', title: 'Dates fill fast.', desc: 'Share your date early. And 4+ events a year unlock 15–20% off.', grad: 'bg-[linear-gradient(155deg,#FA5648,#DE2B2B)]', dk: true },
];

// Hero C rotating word: 3D cube flip through ROT_WORDS every 3s (.55s flip),
// mirroring the design's hc-rot/hc-cube behavior.
const RotatingWord: React.FC = () => {
  const [idx, setIdx] = useState(0);
  const [going, setGoing] = useState(false);
  const [noAnim, setNoAnim] = useState(false);
  const measRef = useRef<HTMLSpanElement>(null);
  const [w, setW] = useState<number | undefined>(undefined);
  const next = (idx + 1) % ROT_WORDS.length;
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const t = setInterval(() => setGoing(true), 3000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const el = measRef.current;
    if (!el) return;
    el.textContent = ROT_WORDS[going ? next : idx];
    setW(el.offsetWidth);
  }, [idx, going, next]);
  const onEnd = (e: React.TransitionEvent) => {
    if (e.propertyName !== 'transform' || !going) return;
    setNoAnim(true);
    setIdx(next);
    setGoing(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setNoAnim(false)));
  };
  return (
    <span
      className="relative inline-block text-left align-baseline text-shortcut-coral [perspective:800px] transition-[width] duration-[550ms]"
      style={{ width: w }}
    >
      <span
        onTransitionEnd={onEnd}
        className={`relative block [transform-style:preserve-3d] ${noAnim ? '' : 'transition-transform duration-[550ms] ease-[cubic-bezier(.45,.05,.18,1)]'} ${going ? '[transform:translateZ(-.515em)_rotateX(-90deg)]' : '[transform:translateZ(-.515em)]'}`}
      >
        {/* current word stays in flow so the h1 baseline comes from real text */}
        <span className="inline-block whitespace-pre [backface-visibility:hidden] [transform:translateZ(.515em)]">{ROT_WORDS[idx]}</span>
        <span aria-hidden className="absolute left-0 top-0 inline-block whitespace-pre [backface-visibility:hidden] [transform:rotateX(90deg)_translateZ(.515em)]">{ROT_WORDS[next]}</span>
      </span>
      <span ref={measRef} aria-hidden className="pointer-events-none invisible absolute left-0 top-0 whitespace-pre" />
    </span>
  );
};

// Good-to-know Cards rail: 258×340 gradient cards, ghost number, tap to
// reveal the description (.rc-c.open in the design).
const GtkCardsRail: React.FC = () => {
  const railRef = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<'start' | 'mid' | 'end'>('start');
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const onScroll = () => {
    const el = railRef.current;
    if (!el) return;
    if (el.scrollLeft <= 10) setAt('start');
    else if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 10) setAt('end');
    else setAt('mid');
  };
  const scroll = (dir: 1 | -1) => railRef.current?.scrollBy({ left: dir * 540, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  return (
    <>
      <div
        ref={railRef}
        onScroll={onScroll}
        className="mt-[26px] flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {GTK_CARDS.map((card, i) => (
          <button
            key={card.kick}
            onClick={() => setOpen(o => ({ ...o, [i]: !o[i] }))}
            className={`relative h-[340px] w-[258px] flex-none snap-start overflow-hidden rounded-[20px] px-5 py-[22px] text-left ${card.grad} ${card.dk ? 'text-white' : 'text-[#003756]'}`}
          >
            <div className={`text-[10.5px] font-extrabold uppercase tracking-[.12em] ${card.dk ? 'text-[#9EFAFF]' : ''}`}>{card.kick}</div>
            <div className="mt-[9px] max-w-[10ch] text-[23px] font-extrabold leading-[1.1] tracking-[-.015em]">{card.title}</div>
            <div className={`mt-3 max-w-[26ch] text-[14.5px] font-semibold leading-[1.5] transition-all duration-300 ${card.dk ? 'text-white' : 'text-[#003756]'} ${open[i] ? 'translate-y-0 opacity-100' : 'translate-y-1.5 opacity-0'}`}>
              {card.desc}
            </div>
            <span className={`pointer-events-none absolute bottom-1 right-[14px] text-[118px] font-extrabold leading-none tracking-[-.05em] transition-opacity duration-300 ${open[i] ? 'opacity-[.05]' : 'opacity-[.13]'}`}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span
              aria-hidden
              className="absolute bottom-[13px] left-[13px] z-[4] flex h-9 w-9 items-center justify-center rounded-full bg-white/[.94] text-[22px] font-medium leading-none text-shortcut-blue shadow-[0_2px_10px_rgba(3,34,50,.22)]"
            >
              +
            </span>
          </button>
        ))}
      </div>
      <div className="mt-[14px] flex justify-end gap-2">
        <button onClick={() => scroll(-1)} disabled={at === 'start'} aria-label="Previous" className={`h-10 w-10 rounded-full border ${LINE} bg-white text-[16px] text-shortcut-blue transition-opacity disabled:opacity-30`}>←</button>
        <button onClick={() => scroll(1)} disabled={at === 'end'} aria-label="Next" className={`h-10 w-10 rounded-full border ${LINE} bg-white text-[16px] text-shortcut-blue transition-opacity disabled:opacity-30`}>→</button>
      </div>
    </>
  );
};

// Hero Stage (variant C): rotating-word headline + auto-rotating event stage.
const HeroStage: React.FC = () => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const t = setInterval(() => setIdx(i => (i + 1) % STAGE_SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="text-center">
      <p className="mb-[14px] text-[12px] font-bold uppercase tracking-[.14em] text-shortcut-coral">Retreats · Offsites · Conferences</p>
      <h1 className="mb-4 text-[34px] font-extrabold leading-[1.03] tracking-[-.035em] text-shortcut-blue md:whitespace-nowrap md:text-[46px]">
        Bring wellness to life at your next <RotatingWord />.
      </h1>
      <p className={`mx-auto max-w-[62ch] text-[18px] leading-[1.5] ${SOFT}`}>The break your attendees will thank you for.</p>
      <div className="relative mt-[34px] h-[320px] overflow-hidden rounded-[24px] bg-white text-left shadow-[0_1px_2px_rgba(3,34,50,.05),0_10px_30px_rgba(3,34,50,.06)] md:h-[480px]">
        {STAGE_SLIDES.map((s, i) => (
          <div key={s.src} className={`absolute inset-0 transition-opacity duration-700 ${i === idx ? 'opacity-100' : 'opacity-0'}`} aria-hidden={i !== idx}>
            <img src={s.src} alt={s.tag} className={`absolute inset-0 h-full w-full object-cover ${s.pos}`} />
            <span className="absolute bottom-[18px] left-[18px] z-[2] rounded-full bg-white px-4 py-[9px] text-[12px] font-extrabold uppercase tracking-[.08em] text-[#003756] shadow-[0_3px_12px_rgba(3,34,50,.22)]">{s.tag}</span>
          </div>
        ))}
        <div className="absolute bottom-[22px] left-0 right-0 z-[3] flex justify-center gap-2">
          {STAGE_SLIDES.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} aria-label={`Slide ${i + 1}`} className={`h-[9px] w-[9px] rounded-full transition-transform ${i === idx ? 'scale-125 bg-white' : 'bg-white/50'}`} />
          ))}
        </div>
      </div>
    </div>
  );
};

// Hero Cover (variant B): coral band with tilted service cards.
const HeroCover: React.FC = () => (
  <div>
    <div className="mb-[30px] overflow-hidden rounded-[26px] bg-[linear-gradient(160deg,#FF6A5A,#FF5050)] px-6 pb-11 pt-[52px] shadow-[0_1px_2px_rgba(3,34,50,.05),0_10px_30px_rgba(3,34,50,.06)] md:px-12">
      <p className="mb-[14px] text-center text-[12px] font-bold uppercase tracking-[.14em] text-[#9EFAFF]">Retreats · Offsites · Conferences</p>
      <h1 className="mx-auto mb-[14px] max-w-[16ch] text-center text-[36px] font-extrabold leading-[1.03] tracking-[-.035em] text-white [text-wrap:balance] md:text-[52px]">
        Bring wellness to life at your next event.
      </h1>
      <p className="mx-auto max-w-[52ch] text-center text-[17.5px] text-white/[.92]">Massage, glow and mindfulness. A thank-you your people can feel.</p>
      <div className="mt-9 flex flex-wrap items-end justify-center gap-2.5">
        {HERO_COVER_CARDS.map(card => (
          <div key={card.cap} className={`w-[150px] flex-none overflow-hidden rounded-[16px] shadow-[0_10px_26px_rgba(120,10,10,.28)] ${card.tilt} ${COVER_CARD_COLORS[card.color].bg}`}>
            <img src={card.src} alt="" className="h-[108px] w-full object-cover" />
            <span className={`block px-3 pb-[11px] pt-2.5 text-[13.5px] font-extrabold leading-[1.15] tracking-[-.01em] ${COVER_CARD_COLORS[card.color].cap}`}>{card.cap}</span>
          </div>
        ))}
      </div>
    </div>
    <p className={`max-w-[62ch] text-[18px] leading-[1.5] ${SOFT}`}>The break your attendees will thank you for.</p>
  </div>
);

// Count-up stat number (0 → end over 1.1s once 50% visible).
const useCountUp = (end: number) => {
  const ref = useRef<HTMLElement>(null);
  const [value, setValue] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) { setValue(end); return; }
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || started.current) return;
        started.current = true;
        io.disconnect();
        const t0 = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / 1100);
          setValue(Math.round(end * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [end]);
  return { ref, value };
};

// Stats strip entry (.stat: 42px numeral, coral suffix, hairline separators).
const Stat: React.FC<{ end: number; suffix: string; label: string; first?: boolean }> = ({ end, suffix, label, first }) => {
  const { ref, value } = useCountUp(end);
  return (
    <div className={`py-0.5 ${first ? 'pl-0.5' : `sm:border-l ${LINE} sm:px-8`}`}>
      <b ref={ref as React.RefObject<HTMLElement>} className="block text-[42px] font-extrabold leading-none tracking-[-.03em] text-shortcut-blue">
        {value}
        <em className="not-italic text-shortcut-coral">{suffix}</em>
      </b>
      <span className={`mt-[9px] block text-[11.5px] font-bold uppercase tracking-[.08em] ${SOFT}`}>{label}</span>
    </div>
  );
};

// Case-study stat (31px cyan numeral).
const CsStat: React.FC<{ end: number; suffix?: string; label: string }> = ({ end, suffix = '', label }) => {
  const { ref, value } = useCountUp(end);
  return (
    <div>
      <b ref={ref as React.RefObject<HTMLElement>} className="block text-[31px] font-extrabold leading-none tracking-[-.02em] text-[#9EFAFF]">
        {value}{suffix}
      </b>
      <span className="mt-[7px] block text-[12.5px] leading-[1.35] text-white/65">{label}</span>
    </div>
  );
};

// .label — coral-dot section kicker
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className={`mb-4 flex items-center gap-[9px] text-[12px] font-bold uppercase tracking-[.09em] ${SOFT}`}>
    <span className="h-[7px] w-[7px] flex-none rounded-full bg-shortcut-coral" />
    {children}
  </p>
);

// .statement — 34px section headline with dim clause
const Statement: React.FC<{ main: string; dim?: string }> = ({ main, dim }) => (
  <h2 className="text-[27px] font-extrabold leading-[1.12] tracking-[-.03em] text-shortcut-blue [text-wrap:pretty] md:text-[34px]">
    {main} {dim && <span className={`${SOFT} font-bold`}>{dim}</span>}
  </h2>
);

// .pk .nb — package name bar colors (navy bar text is cyan, per reference)
const BAR_CLASSES: Record<ConferencePkgBar, string> = {
  navy: 'bg-shortcut-blue text-[#9EFAFF]',
  cyan: 'bg-[#9EFAFF] text-[#003756]',
  pink: 'bg-[#F7BBFF] text-[#003756]',
  sun: 'bg-[#FEDC64] text-[#003756]',
};

// Animated booking mini-phone (.mini-phone, 3 screens on a 2.4s cycle).
const MiniPhone: React.FC<{ eventName: string }> = ({ eventName }) => {
  const [screen, setScreen] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) { setScreen(2); return; }
    const t = setInterval(() => setScreen(s => (s + 1) % 3), 2400);
    return () => clearInterval(t);
  }, []);
  const screenCls = (i: number) =>
    `absolute inset-0 transition-opacity duration-[450ms] ${screen === i ? 'opacity-100' : 'opacity-0'} pointer-events-none`;
  return (
    <div className="w-[192px] rounded-t-[18px] bg-white px-3 pb-3.5 pt-3 shadow-[0_-6px_24px_rgba(3,34,50,.18)]">
      <div className="mb-2 flex items-center gap-1.5 border-b border-[#eef2f4] pb-2 text-[10.5px] font-bold text-[#032232]">
        <span className="grid h-4 w-4 flex-none place-items-center rounded-full bg-shortcut-coral text-[9px] font-bold text-white">
          {eventName.charAt(0).toUpperCase()}
        </span>
        {eventName}
        <span className="ml-auto font-semibold text-[#9ab1ba]">{screen + 1}/3</span>
      </div>
      <div className="relative h-[114px]">
        <div className={screenCls(0)}>
          <p className="mb-1.5 text-[9.5px] font-bold uppercase tracking-[.08em] text-[#9ab1ba]">Pick your service</p>
          <div className="mb-1.5 flex items-center justify-between rounded-[9px] border-[1.5px] border-shortcut-coral bg-shortcut-coral/[.06] px-[9px] py-[7px] text-[11px] font-semibold text-[#032232]">
            Chair massage
            <i className="h-3 w-3 rounded-full border-[1.5px] border-shortcut-coral bg-shortcut-coral shadow-[inset_0_0_0_2.5px_#fff]" />
          </div>
          <div className="mb-1.5 flex items-center justify-between rounded-[9px] border-[1.5px] border-[#E2E9E8] px-[9px] py-[7px] text-[11px] font-semibold text-[#032232]">
            Express manicure
            <i className="h-3 w-3 rounded-full border-[1.5px] border-[#cfd9d8]" />
          </div>
          <div className="mt-0.5 rounded-[9px] bg-shortcut-coral p-2 text-center text-[11px] font-bold text-white">Next</div>
        </div>
        <div className={screenCls(1)}>
          <p className="mb-1.5 text-[9.5px] font-bold uppercase tracking-[.08em] text-[#9ab1ba]">Pick your time</p>
          <div className="mb-1.5 grid grid-cols-2 gap-[5px]">
            <span className="rounded-[8px] border-[1.5px] border-[#E2E9E8] py-1.5 text-center text-[10.5px] font-bold text-[#032232]">11:00</span>
            <span className="rounded-[8px] border-[1.5px] border-[#E2E9E8] py-1.5 text-center text-[10.5px] font-bold text-[#032232] line-through opacity-35">11:20</span>
            <span className="rounded-[8px] border-[1.5px] border-shortcut-coral bg-shortcut-coral py-1.5 text-center text-[10.5px] font-bold text-white">11:40</span>
            <span className="rounded-[8px] border-[1.5px] border-[#E2E9E8] py-1.5 text-center text-[10.5px] font-bold text-[#032232]">12:00</span>
          </div>
          <div className="mt-0.5 rounded-[9px] bg-shortcut-coral p-2 text-center text-[11px] font-bold text-white">Book my slot</div>
        </div>
        <div className={screenCls(2)}>
          <div className="mx-auto mb-[9px] mt-2.5 flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#55BA90]">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-white [stroke-width:3]"><path d="M20 6 9 17l-5-5" /></svg>
          </div>
          <div className="text-center text-[13px] font-extrabold text-[#032232]">You're booked!</div>
          <div className="mt-[3px] text-center text-[10px] text-[#7d939e]">Chair massage · 11:40 AM</div>
        </div>
      </div>
    </div>
  );
};

// Service detail modal (.svcm — 44%/56% split, crossfade media, prev/next).
// galleryImages: real event photos from the proposal gallery system, appended
// after the design's own media so each service cycles through live photos too.
const ServiceModal: React.FC<{ index: number; galleryImages: string[]; onClose: () => void; onNav: (dir: 1 | -1) => void }> = ({ index, galleryImages, onClose, onNav }) => {
  const service = SERVICES[index];
  const [imgIdx, setImgIdx] = useState(0);
  const images = useMemo(() => {
    const base = (u: string) => u.split('/').pop() || u;
    const seen = new Set(service.modalImages.map(base));
    return [...service.modalImages, ...galleryImages.filter(u => !seen.has(base(u)))];
  }, [service, galleryImages]);
  useEffect(() => { setImgIdx(0); }, [index]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  useEffect(() => {
    if (images.length < 2 || prefersReducedMotion()) return;
    const t = setInterval(() => setImgIdx(i => (i + 1) % images.length), 3500);
    return () => clearInterval(t);
  }, [images]);
  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-[rgba(3,34,50,.58)] p-7"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${service.title} details`}
    >
      <div
        className="relative max-h-[calc(100vh-56px)] w-[min(960px,100%)] overflow-hidden rounded-[24px] bg-white shadow-[0_30px_80px_rgba(3,34,50,.4)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="grid max-h-[calc(100vh-56px)] grid-cols-1 md:min-h-[520px] md:grid-cols-[44%_56%]">
          <div className="relative h-[200px] bg-[#EAF7F9] md:h-auto">
            {images.map((src, i) => (
              <img
                key={src}
                src={src}
                alt={i === imgIdx ? service.title : ''}
                aria-hidden={i !== imgIdx}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${src.includes('/services/') ? 'scale-110' : ''} ${i === imgIdx ? 'opacity-100' : 'opacity-0'}`}
              />
            ))}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-4 z-[4] flex gap-[7px]">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIdx(i)}
                    aria-label={`Photo ${i + 1}`}
                    className={`h-[9px] w-[9px] rounded-full ${i === imgIdx ? 'bg-white' : 'bg-white/50'}`}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="flex max-h-[calc(100vh-56px)] flex-col overflow-y-auto px-7 pb-16 pt-8 md:px-9 md:pb-7 md:pt-[34px]">
            <p className="mb-[10px] text-[11px] font-bold uppercase tracking-[.14em] text-shortcut-coral">
              {String(index + 1).padStart(2, '0')} · The service menu
            </p>
            <h3 className="mb-3 text-[27px] font-extrabold leading-[1.05] tracking-[-.02em] text-shortcut-blue">{service.title}</h3>
            <p className={`mb-[22px] text-[14px] leading-[1.6] ${INK}`}>{service.desc}</p>

            <div className={`grid grid-cols-1 gap-6 border-t ${LINE} pt-[18px] sm:grid-cols-[1.15fr_1fr]`}>
              {[{ h: service.bringHeading, items: service.bring }, { h: service.listHeading, items: service.list }].map(col => (
                <div key={col.h}>
                  <p className={`mb-[10px] text-[11px] font-bold uppercase tracking-[.1em] ${SOFT}`}>{col.h}</p>
                  <ul className="grid gap-[9px]">
                    {col.items.map(item => (
                      <li key={item.t} className={`relative pl-4 text-[13px] leading-[1.45] ${SOFT}`}>
                        <span className="absolute left-0 top-[7px] h-1.5 w-1.5 rounded-full bg-[#9EFAFF]" />
                        <b className={`${INK} font-semibold`}>{item.t}</b>{item.d ? `, ${item.d}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <p className={`mt-auto pt-[18px] text-[11px] font-bold uppercase tracking-[.08em] ${SOFT}`}>{service.meta}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-[14px] top-[14px] z-[5] h-[38px] w-[38px] rounded-full bg-shortcut-blue text-[20px] leading-none text-white"
        >
          ×
        </button>
        <div className="absolute bottom-[14px] right-[14px] z-[5] flex gap-2">
          <button
            onClick={() => onNav(-1)}
            aria-label="Previous service"
            className={`h-[38px] w-[38px] rounded-full border ${LINE} bg-white text-[15px] text-shortcut-blue`}
          >
            ←
          </button>
          <button
            onClick={() => onNav(1)}
            aria-label="Next service"
            className={`h-[38px] w-[38px] rounded-full border ${LINE} bg-white text-[15px] text-shortcut-blue`}
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
};

// Conference service id → proposal_gallery service_type keys. The gallery
// admin (/proposal-gallery-admin) stays the source of truth: published images
// there flow into the matching service's modal automatically.
const GALLERY_KEYS: Record<string, string[]> = {
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

const useServiceGallery = (): Record<string, string[]> => {
  const [byService, setByService] = useState<Record<string, string[]>>({});
  useEffect(() => {
    let live = true;
    supabase
      .from('proposal_gallery')
      .select('service_type,media_url,sort_order')
      .eq('media_type', 'image')
      .eq('is_published', true)
      .order('sort_order')
      .then(({ data, error }) => {
        if (!live || error || !data) return;
        const byKey: Record<string, string[]> = {};
        data.forEach(r => { (byKey[r.service_type] = byKey[r.service_type] || []).push(r.media_url); });
        const out: Record<string, string[]> = {};
        Object.entries(GALLERY_KEYS).forEach(([svcId, keys]) => {
          out[svcId] = keys.flatMap(k => byKey[k] || []);
        });
        setByService(out);
      });
    return () => { live = false; };
  }, []);
  return byService;
};

const ConferenceOnePager: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { getGenericLandingPage } = useGenericLandingPage();
  const [page, setPage] = useState<GenericLandingPage | null>(null);
  const [loaded, setLoaded] = useState(!token);
  const [modalIdx, setModalIdx] = useState<number | null>(null);
  const serviceGallery = useServiceGallery();
  const [caseIdx, setCaseIdx] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);
  const [railAt, setRailAt] = useState<'start' | 'mid' | 'end'>('start');

  useEffect(() => {
    document.title = 'Shortcut · Retreats & Conferences';
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getGenericLandingPage(token).then(p => {
      if (!cancelled) {
        setPage(p);
        setLoaded(true);
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const t = setInterval(() => setCaseIdx(i => (i + 1) % CASE_SLIDES.length), 6000);
    return () => clearInterval(t);
  }, []);

  const updateRailState = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    if (el.scrollLeft <= 10) setRailAt('start');
    else if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 10) setRailAt('end');
    else setRailAt('mid');
  }, []);

  const scrollRail = (dir: 1 | -1) => {
    railRef.current?.scrollBy({ left: dir * 540, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  const cz = page?.customization;
  const showPackages = cz?.showPackages ?? true;
  const showPricing = cz?.showPackagePricing ?? true;
  const overrides: Record<string, ConferencePackageOverride> = cz?.packageOverrides ?? {};
  const heroVariant = cz?.heroVariant ?? 'editorial';
  const servicesVariant = cz?.servicesVariant ?? 'rail';
  const packagesVariant = cz?.packagesVariant ?? 'stations';
  const gtkVariant = cz?.goodToKnowVariant ?? 'list';

  const packages = useMemo(
    () =>
      (packagesVariant === 'bundles' ? CONFERENCE_BUNDLES : CONFERENCE_PACKAGES)
        .filter(p => !overrides[p.id]?.hidden)
        .map(p => ({
          ...p,
          price: overrides[p.id]?.price || p.price,
          unit: overrides[p.id]?.unit || p.unit,
        })),
    [overrides, packagesVariant]
  );

  const clientName = page?.data?.partnerName;
  const clientLogo = page?.data?.partnerLogoUrl;
  const phoneEventName = clientName ? `${clientName.split(' ')[0]} Summit` : 'Acme Summit';

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-shortcut-blue" />
      </div>
    );
  }

  const divider = <hr className="my-14 h-px border-0 bg-[#E2E9E8]" />;

  return (
    <div className={`min-h-screen bg-white font-sans leading-[1.55] ${INK}`}>
      {/* Sticky partner nav (.pn) */}
      <nav className="sticky top-0 z-40 h-16 border-b border-black/[.08] bg-white">
        <div className="mx-auto flex h-full max-w-[1020px] items-center justify-between px-5 md:px-8">
          <div className="flex items-center gap-3.5">
            {clientName ? (
              <>
                <span className="flex items-center gap-2 text-[20px] font-extrabold tracking-[-.02em] text-shortcut-blue">
                  {clientLogo ? (
                    <img src={clientLogo} alt="" className="h-7 w-auto object-contain" />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-shortcut-blue text-[13px] font-extrabold text-white">
                      {clientName.charAt(0).toUpperCase()}
                    </span>
                  )}
                  {clientName}
                </span>
                <span className="h-6 w-px bg-black/10" />
                <span className="flex items-center gap-[7px] text-[11px] font-bold text-[rgba(3,34,50,.45)]">
                  <span>with</span>
                  <img src={`${A}/shortcut-logo-rgb.svg`} alt="Shortcut" className="block h-4 w-auto" />
                </span>
              </>
            ) : (
              <img src={`${A}/shortcut-logo-rgb.svg`} alt="Shortcut" className="block h-[26px] w-auto" />
            )}
          </div>
          <a
            href="/book-a-call"
            className="rounded-full bg-shortcut-coral px-5 py-2.5 text-[14px] font-bold text-white shadow-[0_4px_14px_rgba(255,80,80,.3)]"
          >
            Book a call
          </a>
        </div>
      </nav>
      <div className="mx-auto max-w-[1020px] px-[22px] py-[34px] md:px-14 md:pb-12 md:pt-16">
        {/* Hero (variant-driven: editorial / cover / stage) */}
        <Reveal>
          {heroVariant === 'stage' ? (
            <HeroStage />
          ) : heroVariant === 'cover' ? (
            <HeroCover />
          ) : (
            <div>
              <p className="mb-4 text-[12px] font-bold uppercase tracking-[.14em] text-shortcut-coral">Retreats · Offsites · Conferences</p>
              <h1 className="mb-[18px] text-[32px] font-extrabold leading-[1.03] tracking-[-.035em] text-shortcut-blue [text-wrap:balance] md:text-[46px]">
                Bring wellness to life at your next event.
              </h1>
              <div className="mb-[30px] mt-[26px] grid grid-cols-2 gap-2 overflow-hidden rounded-[20px] shadow-[0_1px_2px_rgba(3,34,50,.05),0_10px_30px_rgba(3,34,50,.06)] md:h-[440px] md:grid-cols-[1.5fr_1fr_1fr] md:grid-rows-2">
                <div className="relative col-span-2 h-[200px] overflow-hidden bg-[#F1F6F5] md:col-span-1 md:col-start-1 md:row-span-2 md:h-auto">
                  <img src={HERO_TILES[0].src} alt={HERO_TILES[0].tag} className={`h-full w-full object-cover ${HERO_TILES[0].scale} origin-[50%_85%]`} />
                  <span className="absolute bottom-3 left-3 rounded-full bg-white px-[13px] py-1.5 text-[12px] font-bold text-shortcut-blue shadow-[0_2px_8px_rgba(9,54,79,.18)]">{HERO_TILES[0].tag}</span>
                </div>
                {HERO_TILES.slice(1).map(tile => (
                  <div key={tile.tag} className="relative h-[150px] overflow-hidden bg-[#F1F6F5] md:h-auto">
                    <img src={tile.src} alt={tile.tag} className={`h-full w-full object-cover ${tile.scale} origin-[50%_85%]`} />
                    <span className="absolute bottom-3 left-3 rounded-full bg-white px-[13px] py-1.5 text-[12px] font-bold text-shortcut-blue shadow-[0_2px_8px_rgba(9,54,79,.18)]">{tile.tag}</span>
                  </div>
                ))}
              </div>
              <p className={`max-w-[62ch] text-[18px] leading-[1.5] ${SOFT}`}>
                The touch on the agenda attendees love, <strong className={`${INK} font-semibold`}>and actually show up for.</strong>{' '}
                Massage, glow and mindfulness, fully managed by one team: you approve a date and do nothing else.
              </p>
            </div>
          )}
        </Reveal>

        {/* Stats strip (.stats) */}
        <Reveal>
          <div className={`mt-12 grid grid-cols-1 gap-6 border-y ${LINE} py-[26px] sm:grid-cols-3 sm:gap-0`}>
            <Stat end={500} suffix="+" label="companies served" first />
            <Stat end={90} suffix="%+" label="of appointment slots booked, across all events" />
            <Stat end={87} suffix="%" label="of companies rebook" />
          </div>
        </Reveal>

        {/* Logo marquee */}
        <Reveal>
          <div className="mt-[26px] overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
            <div className="flex w-max animate-logo-marquee will-change-transform hover:[animation-play-state:paused] motion-reduce:animate-none">
              {[false, true].map(dup => (
                <div key={String(dup)} className="flex items-center gap-14 pr-14" aria-hidden={dup}>
                  {CLIENT_LOGOS.map(logo => (
                    <img
                      key={`${logo.src}${dup}`}
                      src={logo.src}
                      alt={dup ? '' : logo.alt}
                      className={`${logo.tall ? 'h-[30px]' : 'h-[22px]'} w-auto flex-none opacity-90 [filter:grayscale(1)_sepia(1)_saturate(4)_hue-rotate(165deg)_brightness(.85)]`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {divider}

        {/* Services: showcase rail or grid */}
        <section className="my-[60px]">
          <Reveal>
            <SectionLabel>The service menu</SectionLabel>
            {servicesVariant === 'grid' ? (
              <Statement main="Twelve services." dim="Everything attendees line up for, delivered by one vetted team." />
            ) : (
              <Statement main="Explore the menu." dim="Over a dozen ways to recharge." />
            )}
          </Reveal>
          {servicesVariant === 'grid' ? (
          <Reveal>
            <div className="mt-[30px] grid grid-cols-2 gap-2.5 md:grid-cols-4">
              {SERVICES.map((svc, i) => (
                <div
                  key={svc.id}
                  className={`flex flex-col overflow-hidden rounded-[16px] border ${LINE} bg-white shadow-[0_1px_2px_rgba(3,34,50,.05),0_10px_30px_rgba(3,34,50,.06)] ${i === 0 ? 'col-span-2 row-span-2' : ''}`}
                >
                  <div className={`relative overflow-hidden ${i === 0 ? 'flex-1' : 'aspect-[725/487]'}`}>
                    <img src={svc.image} alt={svc.title} className={`h-full w-full object-cover ${i === 0 ? 'object-[center_30%]' : ''}`} />
                    <button
                      onClick={() => setModalIdx(i)}
                      aria-label={`More about ${svc.title.toLowerCase()}`}
                      className="absolute bottom-[13px] left-[13px] flex h-[30px] w-[30px] items-center justify-center rounded-full bg-white/[.94] text-[18px] font-medium leading-none text-shortcut-blue shadow-[0_2px_10px_rgba(3,34,50,.22)] transition-transform duration-[250ms] hover:scale-110"
                    >
                      +
                    </button>
                  </div>
                  <div className={`px-[13px] pb-3 pt-[11px] font-bold text-shortcut-blue ${i === 0 ? 'text-[16px]' : 'text-[14px]'}`}>
                    {svc.title}
                    <span className={`mt-[3px] block text-[12px] font-normal leading-[1.4] ${SOFT}`}>{svc.sub}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className={`mt-[14px] max-w-[62ch] text-[15.5px] ${SOFT}`}>
              Don't see it? <b className={`${INK} font-semibold`}>Wellness workshops, ergonomics clinics and custom requests</b>, just ask.
            </p>
          </Reveal>
          ) : (
          <Reveal>
            <div
              ref={railRef}
              onScroll={updateRailState}
              className="mt-[26px] flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {SERVICES.map((svc, i) => (
                <div key={svc.id} className="relative h-[430px] w-[258px] flex-none snap-start overflow-hidden rounded-[20px] bg-white">
                  <img src={svc.image} alt={svc.title} className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(3,34,50,.55),rgba(3,34,50,0)_46%)]" />
                  <div className="absolute left-4 right-4 top-[15px] z-[2] text-[19px] font-extrabold leading-[1.15] tracking-[-.01em] text-white">{svc.title}</div>
                  <button
                    onClick={() => setModalIdx(i)}
                    aria-label={`More about ${svc.title.toLowerCase()}`}
                    className="absolute bottom-[13px] left-[13px] z-[4] flex h-9 w-9 items-center justify-center rounded-full bg-white/[.94] text-[22px] font-medium leading-none text-shortcut-blue shadow-[0_2px_10px_rgba(3,34,50,.22)] transition-transform duration-[250ms] hover:scale-110"
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-[14px] flex justify-end gap-2">
              <button
                onClick={() => scrollRail(-1)}
                disabled={railAt === 'start'}
                aria-label="Previous"
                className={`h-10 w-10 rounded-full border ${LINE} bg-white text-[16px] text-shortcut-blue transition-opacity disabled:opacity-30`}
              >
                ←
              </button>
              <button
                onClick={() => scrollRail(1)}
                disabled={railAt === 'end'}
                aria-label="Next"
                className={`h-10 w-10 rounded-full border ${LINE} bg-white text-[16px] text-shortcut-blue transition-opacity disabled:opacity-30`}
              >
                →
              </button>
            </div>
            <p className={`mt-3 max-w-[62ch] text-[15.5px] ${SOFT}`}>
              Don't see it? <b className={`${INK} font-semibold`}>Wellness workshops, ergonomics clinics and custom requests</b>, just ask.
            </p>
          </Reveal>
          )}
        </section>

        {/* Packages: stations (.pk-grid, 2-up) */}
        {showPackages && packages.length > 0 && (
          <>
            {divider}
            <section className="my-[60px]">
              <Reveal>
                <SectionLabel>Packages</SectionLabel>
                <Statement main="Our most popular packages." dim="Pick one, or combine." />
              </Reveal>
              <div className={`mb-4 grid grid-cols-1 gap-[14px] ${packagesVariant === 'bundles' ? 'mt-6 sm:grid-cols-2 lg:grid-cols-3' : 'mt-[30px] sm:grid-cols-2'}`}>
                {packages.map(pkg => (
                  <Reveal key={pkg.id} className="flex">
                    <div className={`relative flex w-full flex-col overflow-hidden rounded-[18px] border bg-white ${pkg.popular && packagesVariant === 'bundles' ? 'border-shortcut-coral shadow-[0_1px_2px_rgba(3,34,50,.05),0_12px_34px_rgba(255,80,80,.14)]' : `${LINE} shadow-[0_1px_2px_rgba(3,34,50,.05),0_10px_30px_rgba(3,34,50,.06)]`}`}>
                      {pkg.popular && (
                        <span className="absolute right-3 top-3 z-10 rounded-full bg-shortcut-blue px-[13px] py-[7px] text-[11px] font-extrabold tracking-[.06em] text-white shadow-[0_2px_8px_rgba(9,54,79,.3)]">
                          MOST POPULAR
                        </span>
                      )}
                      <div className={`overflow-hidden ${packagesVariant === 'bundles' ? 'h-[140px]' : 'h-[164px]'}`}>
                        {/* stylized service PNGs carry a baked white margin + rounded corners; 1.1 crop hides them (same trick as the proposal cards) */}
                        <img src={pkg.image} alt="" className="h-full w-full scale-110 object-cover" />
                      </div>
                      <div className={`px-5 pb-3 pt-[11px] text-[17px] font-extrabold leading-[1.2] tracking-[-.015em] ${BAR_CLASSES[pkg.bar]}`}>{pkg.name}</div>
                      <div className="flex flex-1 flex-col px-5 pb-[18px] pt-4">
                        <p className={`mb-2 text-[12px] font-bold uppercase tracking-[.08em] ${SOFT}`}>{pkg.meta}</p>
                        <p className={`mb-[14px] text-[14px] leading-[1.5] ${SOFT} ${packagesVariant === 'bundles' ? 'min-h-[63px]' : ''}`}>{pkg.desc}</p>
                        <ul className="mb-[18px] grid gap-[7px]">
                          {pkg.bullets.map(b => (
                            <li key={b} className={`flex items-baseline gap-[9px] text-[13.5px] ${INK}`}>
                              <span className="flex-none text-[12px] font-extrabold text-[#018EA2]">✓</span>
                              {b}
                            </li>
                          ))}
                        </ul>
                        {showPricing && (
                          <div className={`mt-auto flex items-end justify-between gap-3 border-t ${LINE} pt-3`}>
                            <div>
                              <span className={`mb-[3px] block text-[10.5px] font-bold uppercase tracking-[.08em] ${SOFT}`}>Starting at</span>
                              <b className="text-[25px] font-extrabold leading-none tracking-[-.02em] text-shortcut-blue">{pkg.price}</b>
                            </div>
                            <span className={`max-w-[15ch] text-right text-[12.5px] leading-[1.35] ${SOFT}`}>{pkg.unit}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
              {showPricing && (
                <Reveal>
                  <p className={`text-[14px] ${SOFT}`}>
                    Every package includes <b className={`${INK} font-semibold`}>pros, gear, setup, self-serve booking, digital invites and onsite signage</b>. Pricing scales with headcount, hours and cities.
                  </p>
                </Reveal>
              )}
            </section>
          </>
        )}

        {divider}

        {/* Booking (.book: steps card + coral phone panel) */}
        <section className="my-[60px]">
          <Reveal>
            <SectionLabel>Booking, handled</SectionLabel>
            <Statement main="We handle the details." dim="Sign-ups run themselves, lines never form, and it all plugs into your conference stack." />
          </Reveal>
          <div className="mt-[30px] grid grid-cols-1 items-stretch gap-[14px] md:grid-cols-[1.25fr_1fr]">
            <Reveal className="flex">
              <div className="w-full rounded-[20px] bg-[linear-gradient(155deg,#9EFAFF,#4FD4E4)] px-7 py-[26px] text-[#003756] shadow-[0_1px_2px_rgba(3,34,50,.05),0_10px_30px_rgba(3,34,50,.06)]">
                <p className="mb-[18px] text-[10.5px] font-extrabold uppercase tracking-[.12em] text-[#003756]">How it works</p>
                <ol className="grid gap-4">
                  {[
                    { t: 'Share the agenda.', d: 'We map stations and sessions to your schedule, space and headcount.' },
                    { t: 'Attendees self-book.', d: 'From a link or QR in your event app. By name, zone or time slot. No lines, ever.' },
                    { t: 'We run the day.', d: 'Pros, gear, signage and a wrap report with participation stats. You do nothing else.' },
                  ].map((step, i) => (
                    <li key={step.t} className="grid grid-cols-[34px_1fr] items-start gap-[14px]">
                      <span className="grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-shortcut-blue text-[15px] font-extrabold text-white [font-variant-numeric:tabular-nums]">
                        {i + 1}
                      </span>
                      <p className="pt-[5px] text-[15px] text-[#0A4560]">
                        <b className="font-bold text-[#003756]">{step.t}</b> {step.d}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            </Reveal>
            <Reveal className="flex">
              <div className="flex w-full flex-col overflow-hidden rounded-[20px] bg-[linear-gradient(160deg,#FF6A5A,#FF5050)] px-7 pt-[26px] shadow-[0_1px_2px_rgba(3,34,50,.05),0_10px_30px_rgba(3,34,50,.06)]">
                <p className="mb-[10px] text-[11px] font-bold uppercase tracking-[.14em] text-white/85">Self-serve booking</p>
                <h3 className="mb-2 text-[23px] font-extrabold leading-[1.04] tracking-[-.02em] text-white">Booking in three taps.</h3>
                <p className="text-[13.5px] leading-[1.5] text-white/[.88]">No spreadsheets, no chasing. Attendees grab their own slot.</p>
                <div className="mt-auto flex justify-center pt-[18px]">
                  <MiniPhone eventName={phoneEventName} />
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {divider}

        {/* Case study (.cs) */}
        <section className="my-[60px]">
          <Reveal>
            <SectionLabel>Case study</SectionLabel>
            <Statement main="Five chairs, three days." dim="The massages never stopped at Workhuman Live 2026." />
          </Reveal>
          <Reveal>
            <div className="mt-[30px] grid grid-cols-1 overflow-hidden rounded-[22px] shadow-[0_1px_2px_rgba(3,34,50,.05),0_10px_30px_rgba(3,34,50,.06)] md:grid-cols-[.85fr_1.15fr]">
              <div className="relative min-h-[280px] bg-[#EAF7F9] md:min-h-[400px]">
                {CASE_SLIDES.map((slide, i) => (
                  <img
                    key={slide.src}
                    src={slide.src}
                    alt={i === caseIdx ? slide.alt : ''}
                    aria-hidden={i !== caseIdx}
                    className={`absolute inset-0 h-full w-full object-cover ${slide.pos} transition-opacity duration-500 ${i === caseIdx ? 'opacity-100' : 'opacity-0'}`}
                  />
                ))}
                <div className="absolute bottom-[14px] left-0 right-0 z-[3] flex justify-center gap-[7px]">
                  {CASE_SLIDES.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCaseIdx(i)}
                      aria-label={`Photo ${i + 1}`}
                      className={`h-2 w-2 rounded-full ${i === caseIdx ? 'bg-white' : 'bg-white/45'}`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex flex-col bg-[linear-gradient(160deg,#0A3E5C,#06293D)] px-[38px] pb-8 pt-9 text-white">
                <p className="mb-4 text-[11px] font-bold uppercase tracking-[.14em] text-[#9EFAFF]">Workhuman Live 2026 · The Gratitude Garden</p>
                <h3 className="mb-3 text-[31px] font-extrabold leading-[1.04] tracking-[-.02em] text-white">Fifteen minutes that feel like an hour off.</h3>
                <p className="max-w-[46ch] text-[14.5px] leading-[1.6] text-white/[.78]">
                  We ran the wellness zone at Workhuman Live 2026. <b className="font-semibold text-white">Five chairs, doors to close, 400 massages.</b>{' '}
                  The waitlist never dropped below 200.
                </p>
                <div className="mt-auto flex gap-[34px] border-t border-white/[.18] pt-6">
                  <CsStat end={400} label="fifteen-minute massages" />
                  <CsStat end={200} suffix="+" label="on the waitlist" />
                  <CsStat end={5} label="chairs running, all three days" />
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {divider}

        {/* Testimonials (.quotes: navy receipt + cyan quote2) */}
        <section className="my-[60px]">
          <Reveal>
            <SectionLabel>What clients say</SectionLabel>
            <Statement main="Booked once, kept forever." dim="BCG and DraftKings use us at every US office." />
          </Reveal>
          <div className="mt-[30px] grid grid-cols-1 gap-[14px] md:grid-cols-[1.15fr_1fr]">
            <Reveal className="flex">
              <div className="w-full rounded-[20px] bg-[linear-gradient(160deg,#0A3E5C,#06293D)] px-8 py-[30px] shadow-[0_1px_2px_rgba(3,34,50,.05),0_10px_30px_rgba(3,34,50,.06)]">
                <img src={`${A}/onepager/draftkings.svg`} alt="DraftKings" className="mb-4 block h-[22px] w-auto opacity-[.92] brightness-0 invert" />
                <p className="text-[21px] font-bold leading-[1.32] tracking-[-.02em] text-white [text-wrap:balance]">
                  Shortcut has become an extension of the DraftKings family.
                </p>
                <div className="mt-5 flex items-center gap-[13px]">
                  <img src={`${A}/onepager/christian.jpeg`} alt="" className="h-11 w-11 flex-none rounded-full border-2 border-[rgba(158,250,255,.4)] object-cover" />
                  <div>
                    <b className="block text-[14.5px] font-bold text-white">Christian W.</b>
                    <span className="mt-0.5 block text-[12.5px] text-white/70">Employee Experience Specialist, DraftKings</span>
                  </div>
                </div>
              </div>
            </Reveal>
            <Reveal className="flex">
              <div className="flex w-full flex-col rounded-[20px] bg-[#9EFAFF] px-8 py-[30px] shadow-[0_1px_2px_rgba(3,34,50,.05),0_10px_30px_rgba(3,34,50,.06)]">
                <img src={`${A}/onepager/logos/teads.svg`} alt="Teads" className="mb-[14px] block h-[30px] w-auto self-start" />
                <p className="text-[17px] font-bold leading-[1.42] tracking-[-.01em] text-[#003756]">
                  They go above and beyond to make each event tailored to our team. An atmosphere that's both relaxing and enjoyable.
                </p>
                <div className="mt-auto flex items-center gap-[13px] pt-5">
                  <img src={`${A}/onepager/allison.png`} alt="" className="h-11 w-11 flex-none rounded-full border-2 border-white object-cover shadow-[0_3px_10px_rgba(3,34,50,.14)]" />
                  <div>
                    <b className="block text-[14.5px] font-bold text-[#003756]">Allison B.</b>
                    <span className="mt-0.5 block text-[12.5px] text-[#175071]">Sr. Manager, Compensation & Benefits, Teads</span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {divider}

        {/* Good to know (.gtk) */}
        <section className="my-[60px]">
          <Reveal>
            <SectionLabel>Good to know</SectionLabel>
            <Statement main="Everything else." dim="What you'd ask on the first call." />
          </Reveal>
          {gtkVariant === 'cards' ? (
            <Reveal>
              <GtkCardsRail />
            </Reveal>
          ) : (
            <div className="mt-[30px] grid grid-cols-1 gap-x-10 md:grid-cols-2">
              {GOOD_TO_KNOW.map(item => (
                <Reveal key={item.t}>
                  <div className={`border-t ${LINE} py-[15px] text-[14px] leading-[1.55] ${SOFT}`}>
                    <b className={`${INK} font-semibold`}>{item.t}</b> {item.d}
                  </div>
                </Reveal>
              ))}
            </div>
          )}
        </section>

        {divider}

        {/* Sponsorships (.spon) */}
        <section className="my-[60px]">
          <Reveal>
            <SectionLabel>Sponsorships</SectionLabel>
            <Statement main="Make it pay for itself." dim="A sponsor picks up the tab." />
          </Reveal>
          <Reveal>
            <div className="mt-[30px] grid grid-cols-1 overflow-hidden rounded-[22px] shadow-[0_1px_2px_rgba(3,34,50,.05),0_10px_30px_rgba(3,34,50,.06)] md:grid-cols-2">
              <div className="flex flex-col bg-[#FEDC64] px-[34px] pb-5 pt-[30px] text-[#003756]">
                <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[.14em]">For your sponsor prospectus</p>
                <h3 className="mb-[22px] max-w-[16ch] text-[26px] font-extrabold leading-[1.12] tracking-[-.02em]">
                  10x the conversations. Every sign-up a lead.
                </h3>
                <div className="flex flex-1 flex-col">
                  {[
                    { t: 'Maximum engagement', d: "A booth with a waitlist. Attendees spend 15 relaxed minutes with the sponsor's brand." },
                    { t: '10x the leads', d: 'Every booking captures a contact and flows straight to their sales team.' },
                    { t: 'Their name on all of it', d: 'Zone, signage, booking flow and follow-up, fully branded.' },
                  ].map((row, i) => (
                    <div key={row.t} className="flex flex-1 items-center gap-[18px] border-t border-[rgba(0,55,86,.25)] py-[14px]">
                      <span className="text-[12px] font-extrabold tracking-[.06em]">{String(i + 1).padStart(2, '0')}</span>
                      <div>
                        <b className="block text-[16px] font-extrabold tracking-[-.01em]">{row.t}</b>
                        <span className="mt-0.5 block text-[13.5px] leading-[1.45]">{row.d}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative min-h-[280px] md:min-h-[380px]">
                <img
                  src={`${A}/onepager/wh/booth-zen.jpeg`}
                  alt="A sponsored Zen Zone wellness activation on the expo floor"
                  className="absolute inset-0 h-full w-full object-cover object-[center_25%]"
                />
                <span className="absolute bottom-4 left-4 rounded-full bg-white px-[14px] py-2 text-[10.5px] font-extrabold uppercase tracking-[.1em] text-[#003756] shadow-[0_3px_12px_rgba(3,34,50,.22)]">
                  Zen Zone · Workhuman Live
                </span>
              </div>
            </div>
          </Reveal>
        </section>

        {divider}

        {/* CTA band */}
        <section className="my-[60px]">
          <Reveal>
            <div className="rounded-[24px] bg-[linear-gradient(160deg,#FF6A5A,#FF5050)] px-10 py-[38px] shadow-[0_1px_2px_rgba(3,34,50,.05),0_10px_30px_rgba(3,34,50,.06)]">
              <h2 className="mb-3 text-[24px] font-extrabold tracking-[-.02em] text-white">The best thing on the agenda</h2>
              <p className="max-w-[54ch] text-[15.5px] text-white/[.92]">
                Tell us your dates, headcount and city. We'll send a package shaped to your event <b className="font-semibold text-white">within one business day.</b>
              </p>
              <div className="mt-[18px] flex flex-wrap items-center gap-x-[22px] gap-y-[14px]">
                <a
                  href="/book-a-call"
                  className="inline-block rounded-[12px] bg-[#9EFAFF] px-[26px] py-[13px] text-[15px] font-bold text-[#003756]"
                >
                  Book a 15-min call
                </a>
                <span className="text-[15px] font-normal text-white/85">or reply with your dates and we'll take it from there.</span>
              </div>
            </div>
          </Reveal>
        </section>

        {/* Footer */}
        <footer className={`mt-[42px] flex flex-wrap justify-between gap-2.5 border-t ${LINE} pt-[18px] text-[13px] ${SOFT}`}>
          <span>
            Trusted by <b className={`${INK} font-semibold`}>500+ companies</b>, including BCG, the NFL and DraftKings. One team, any venue, coast to coast.
          </span>
          <a href="https://getshortcut.co" className="font-semibold text-[#018EA2] hover:text-shortcut-blue">getshortcut.co</a>
        </footer>
      </div>

      {modalIdx !== null && (
        <ServiceModal
          index={modalIdx}
          galleryImages={serviceGallery[SERVICES[modalIdx].id] ?? []}
          onClose={() => setModalIdx(null)}
          onNav={dir => setModalIdx(i => (i === null ? 0 : (i + dir + SERVICES.length) % SERVICES.length))}
        />
      )}
    </div>
  );
};

export default ConferenceOnePager;
