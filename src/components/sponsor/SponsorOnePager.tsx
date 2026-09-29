import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, MapPin, Users, Eye, EyeOff, Play, ArrowUpRight } from 'lucide-react';
import { SPONSOR_PAGES, type SponsorPageConfig } from './sponsorPages';
import StationModal, { useGalleryByKey } from './StationModal';
import SponsorBento from './SponsorBento';
import { SPONSOR_SERVICES, serviceById, type SponsorServiceDef } from '../../utils/sponsorPackages';

/* ─────────────────────────────────────────────
   Conference partner page: the pitch to a CONFERENCE ORGANIZER.

   The organizer buys the lounge from us and sells it to one of their
   sponsors as a premium sponsorship. One section per job, and each fact
   said once, in the section that owns it:
     Hero           the offer, "You sell it. We run it.", the price is theirs
     The problem    booth vs lounge, for the sponsor and for the organizer
     How it works   the bento: booking is the lead capture (owns the lead facts)
     What sponsors  six moments with attendees, before, at and after the
       get          show (owns the brand touchpoints)
     Who does what  the organizer's short list next to ours
     Proof          Workhuman Live 2026, and the numbers across every event
     Stations       what can go in the lounge
     Next step

   No prices. The organizer sets the sponsor's price and we quote our cost
   privately (Will, 2026-09-28). See sponsorPages.ts for who reads this.

   Layout, type tokens and section system are AACSBOnePager.tsx's, so the
   partner page and the sponsor-facing page that follows it look related.

   Proof on this page, and where it is recorded:
     Workhuman Live 2026: five chairs, three days, 400 fifteen minute
       massages, waitlist never below 200  (CLAIMS_VERIFICATION.md §2,
       confirmed by Will 2026-09-07)
     400 x 15 minutes = 100 hours of attendee time  (arithmetic on the above)
     90%+ of slots booked across every event we run  (same file, §2)
   ───────────────────────────────────────────── */

const SIZZLE_VIDEO =
  'https://oxigtmlqqfbhzekpdalt.supabase.co/storage/v1/object/public/site-media/yw3/tradestation-sizzle.mp4';

/* The AACSB rendering: a lounge built in one sponsor's brand, which is the
   product in a single picture. It carries the University of Cincinnati's
   branding, so confirm that is fine to show other organizers. */
const DEFAULT_HERO = {
  src: '/aacsb/lounge-rendering.jpg',
  alt: 'Rendering of a conference wellness lounge built in one sponsor’s brand, with a branded welcome desk, privacy screens and massage chairs',
};

const GUT = 'px-6 md:px-10 lg:px-[100px]';
const COL = 'w-full max-w-[1720px] mx-auto';

const INK = 'text-[#2A5468]';
const INK_META = 'text-[#45596A]';
/* One card system. Radius 28, padding 7/8, one title size. A card on a tint
   panel is white; a card on a white panel is tint. Navy marks the one card
   in a set that is ours or is the answer. */
const CARD_R = 'rounded-[28px]';
const CARD_PAD = 'p-7 md:p-8';
const CARD_ON_TINT = `${CARD_R} bg-white border border-[#E2E9E8] shadow-[0_1px_2px_rgba(3,34,50,.05),0_10px_30px_rgba(3,34,50,.06)]`;
const CARD_ON_WHITE = `${CARD_R} bg-neutral-light-gray`;
const CARD_NAVY = `${CARD_R} bg-shortcut-blue`;
const CARD_TITLE = 'm-0 text-[22px] md:text-[24px] font-bold leading-[1.15] tracking-[-.025em]';
const CARD_KICKER = 'm-0 text-[12px] font-extrabold uppercase tracking-[.09em]';
const CARD_BODY = 'm-0 text-[16px] font-medium leading-[1.55]';

const PILL_FILLS = ['#9EFAFF', '#FFCBA6', '#FEDC64', '#F7BBFF'];

/* Why it sells, from both sides of the sale. Warm, not a complaint about
   booths: the lounge is the thing attendees remember, and now they remember
   the sponsor with it. */
const TWO_SIDES = [
  {
    who: 'For your sponsor',
    title: 'The best spot at the show, with their name on it.',
    body: 'Attendees book ahead, show up happy and spend real time in the sponsor’s space. It’s the easiest conversation starter on the floor.',
  },
  {
    who: 'For you',
    title: 'A sponsorship worth more than a booth.',
    body: 'Something new at the top of your package. Sponsors are proud to put their name on it, and glad to buy it again next year.',
  },
];

/* What the sponsor gets: one attendee's visit, told in order, with the
   sponsor as the host at every step and the list as the payoff. Each card
   is the next beat of the same story; nothing goes in that isn't a beat.
   Rendered as the website's numbered step cards (shortcut/frontend/pages/
   solutions/conferences.vue, .sw-step). */
const PATH = [
  { k: 'Before the show', title: 'The invite', fill: '#9EFAFF', ink: '#003756',
    body: 'Before the show, your attendees get an invite from the sponsor for a free massage, blowout or headshot.' },
  { k: 'Before the show', title: 'The booking', fill: '#FEDC64', ink: '#003756',
    body: 'They pick a time that works for them on the sponsor’s booking page.' },
  { k: 'Before the show', title: 'The reminder', fill: '#F7BBFF', ink: '#003756',
    body: 'On the day, they get a text with their time and where to find the lounge.' },
  { k: 'At the show', title: 'The welcome', fill: '#FF5050', ink: '#ffffff',
    body: 'They walk into a lounge in the sponsor’s colors, and the sponsor’s team is there to say hello.' },
  { k: 'At the show', title: 'The treatment', fill: '#C7CBFB', ink: '#003756',
    body: 'They get their massage, blowout or headshot, and head back to the conference feeling great.' },
  { k: 'After the show', title: 'The follow up', fill: '#003756', ink: '#ffffff',
    body: 'After the show, the sponsor gets a list of everyone who came, so they can follow up.' },
];

/* Workhuman Live 2026, from the website's conference gallery
   (conferences-data.js, CONF_GALLERY). Only this event's photos sit under
   the Workhuman headline. */
const PROOF_GALLERY = [
  { cap: 'Workhuman Live \u00b7 The Gratitude Garden', img: '/ds-assets/conference/zone-signage.jpeg', tint: '#9EFAFF' },
  { cap: 'Chair massage on the floor', img: '/ds-assets/conference/welcome-desk.jpeg', tint: '#C7CBFB' },
  { cap: 'The Zen Zone', img: '/ds-assets/conference/zen-zone.jpeg', tint: '#FFCBA6' },
];

/* What a sponsor's brand looks like on the booking page and on the floor.
   NOTE: YW3 x Netflix Ads is under an MNDA (2026-09-16); clear it before
   this ships. */
const BRAND_SHOTS = {
  booking: { cap: 'The booking page · Netflix Ads', img: '/yw3/booking-page.jpg',
    alt: 'A Shortcut booking page branded end to end for Netflix Ads' },
  side: [
    { cap: 'The signage · TradeStation', img: '/ds-assets/conference/glam-station.jpg',
      alt: 'A TradeStation banner reading Get a fresh look at TradeStation' },
    { cap: 'The uniforms · TradeStation', img: '/ds-assets/conference/massage-floor.jpg',
      alt: 'A stylist in a TradeStation apron styling an attendee’s hair' },
  ],
};

/** Photo tile with the caption pill every gallery on the page uses. */
function Shot({ cap, img, alt, className = '', pos = 'center', inset = false }: {
  cap: string; img: string; alt?: string; className?: string; pos?: string; inset?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden rounded-[20px] ${inset ? 'bg-shortcut-teal/40' : 'bg-neutral-light-gray'} ${className}`}>
      {inset ? (
        <img src={img} alt={alt ?? cap} loading="lazy" className="absolute left-6 right-6 top-6 md:left-10 md:right-10 md:top-10 w-[calc(100%-48px)] md:w-[calc(100%-80px)] rounded-t-[14px] shadow-[0_12px_36px_rgba(3,34,50,.18)]" />
      ) : (
        <img src={img} alt={alt ?? cap} loading="lazy" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: pos }} />
      )}
      <span className="absolute bottom-3 left-3 max-w-[calc(100%-24px)] inline-flex min-h-[30px] items-center rounded-full bg-white/[.92] px-3 py-1 text-[12px] md:text-[12.5px] font-extrabold leading-tight text-shortcut-blue">
        {cap}
      </span>
    </div>
  );
}

const FRAME = 'rounded-[28px] bg-white p-3 md:p-4';

/* Who does what. The point of the section is how short the first two
   lists are next to the third. Tasks only: on-site operations are in the
   bento's checklist and the list handover is in its payload card, so
   neither is repeated here. */
const ROLES = [
  {
    who: 'You',
    items: [
      'Add the lounge to your sponsorship lineup',
      'Introduce us to the sponsor who buys it',
      'Give us space on the floor, and send our invitation to your attendee list',
    ],
  },
  {
    who: 'The sponsor',
    items: [
      'Sends their logo, colors and opt-in wording',
    ],
  },
  {
    who: 'Shortcut',
    items: [
      'The booking page, confirmations and calendar invites',
      'Lounge design, screens and uniforms',
      'The Pros, scheduled and briefed',
      'Waitlist management',
      'A results report for you and the sponsor after the show',
    ],
  },
];

/* The headline carries the 400 and the 200; these are the numbers it
   doesn't. */
const PROOF_STATS = [
  { fig: '100', label: 'hours of attendee time at Workhuman Live, in one space' },
  { fig: '90%+', label: 'of appointment slots booked, across every event we run' },
  { fig: '500+', label: 'companies we bring wellness to across the US' },
];

function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.06 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { ref, visible } = useFadeIn();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'} ${className}`}
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
  kicker: string; title: string; accent?: string; sub?: string; dark?: boolean;
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

function SizzleReel() {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  const start = () => {
    setPlaying(true);
    ref.current?.play();
  };

  return (
    <div className="mx-auto w-full max-w-[900px] rounded-[28px] bg-white p-3 md:p-4 shadow-[0_30px_70px_rgba(0,0,0,.25)]">
      <div className="relative aspect-video overflow-hidden rounded-[20px] bg-shortcut-blue">
        <video
          ref={ref}
          src={SIZZLE_VIDEO}
          poster="/yw3/tradestation-poster.jpg"
          controls={playing}
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
          onPlay={() => setPlaying(true)}
          onPause={() => { if (ref.current && ref.current.ended) setPlaying(false); }}
        />
        {!playing && (
          <button
            type="button"
            onClick={start}
            aria-label="Play the TradeStation event reel"
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 md:gap-5 bg-shortcut-blue/45 transition-colors hover:bg-shortcut-blue/35"
          >
            <span className="flex h-[56px] w-[56px] md:h-[76px] md:w-[76px] items-center justify-center rounded-full bg-shortcut-coral shadow-[0_10px_30px_rgba(255,80,80,.45)]">
              <Play size={30} className="ml-1 text-white" fill="currentColor" strokeWidth={0} />
            </span>
            <span className="max-w-[calc(100%-32px)] rounded-full bg-white/[.94] px-4 md:px-5 py-2 md:py-2.5 text-[13px] md:text-[15px] font-extrabold leading-tight tracking-[-.012em] text-shortcut-blue">
              A Shortcut event day for TradeStation
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

function RoleCard({ r, us = false }: { r: { who: string; items: string[] }; us?: boolean }) {
  return (
    <div className={`${us ? CARD_NAVY : CARD_ON_WHITE} ${CARD_PAD} ${us ? 'lg:h-full' : ''}`}>
      <h3 className={`${CARD_TITLE} ${us ? 'text-white' : 'text-shortcut-blue'}`}>{r.who}</h3>
      <ul className="m-0 mt-5 p-0 list-none flex flex-col gap-3.5">
        {r.items.map((it) => (
          <li key={it} className={`flex gap-3 ${CARD_BODY} ${us ? 'text-white' : INK}`}>
            <span className={`mt-[9px] w-[6px] h-[6px] flex-none rounded-full ${us ? 'bg-shortcut-teal' : 'bg-shortcut-coral'}`} />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A station card, shaped like the website's service rail card: tinted art
 *  tile with a `+` in the corner, name and meta under it. The whole card
 *  opens the pop-out. PNG art carries a baked white margin, hence the 1.1
 *  crop. */
function StationCard({ s, onOpen }: { s: SponsorServiceDef; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`More about ${s.name}`}
      className="group flex flex-col text-left"
    >
      <span
        className="relative block aspect-[4/3] w-full overflow-hidden rounded-[22px] shadow-[0_1px_2px_rgba(3,34,50,.05),0_10px_30px_rgba(3,34,50,.06)]"
        style={{ background: s.tint }}
      >
        <img
          src={s.image}
          alt=""
          loading="lazy"
          className={`absolute inset-0 h-full w-full object-cover transition-transform duration-500 ${s.cropArt ? 'scale-110 group-hover:scale-[1.14]' : 'group-hover:scale-[1.04]'}`}
        />
        <span className="absolute right-2.5 top-2.5 sm:right-3.5 sm:top-3.5 z-[2] grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full bg-white text-[24px] font-medium leading-none text-shortcut-blue shadow-[0_2px_10px_rgba(3,34,50,.18)] transition-transform duration-300 group-hover:scale-110">
          +
        </span>
      </span>
      <span className="flex flex-col gap-1.5 px-0.5 pt-3.5 sm:pt-[18px]">
        <span className="text-[17px] sm:text-[20px] font-semibold leading-[1.2] tracking-[-.015em] text-shortcut-blue">{s.name}</span>
        <span className={`text-[13px] sm:text-[14px] font-semibold leading-[1.4] ${INK_META}`}>{s.meta}</span>
        <span className={`mt-1 hidden sm:block text-[15.5px] font-medium leading-[1.55] ${INK}`}>{s.body}</span>
      </span>
    </button>
  );
}

function Gate({ cfg, storageKey, onPass }: {
  cfg: SponsorPageConfig; storageKey: string; onPass: () => void;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === cfg.password) {
      sessionStorage.setItem(storageKey, 'true');
      onPass();
    } else {
      setError(true);
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-light-gray font-['Outfit',system-ui,sans-serif] flex items-center justify-center">
      <div className="w-full max-w-sm mx-auto px-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-4 mb-4">
            <div className="text-[22px] font-extrabold tracking-tight text-shortcut-blue">{cfg.organizer.mark}</div>
            <div className="h-6 w-px bg-shortcut-blue/15" aria-hidden="true" />
            <img src="/shortcut-logo-blue.svg" alt="Shortcut" className="h-5 w-auto" />
          </div>
          <div className="text-[12px] text-shortcut-blue/50 font-medium">Sponsorship partner</div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              placeholder="Enter password"
              autoFocus
              className={`w-full px-4 py-3 pr-11 rounded-xl border ${error ? 'border-shortcut-coral bg-red-50/30' : 'border-shortcut-blue/[.12]'} text-[15px] text-shortcut-blue font-medium placeholder:text-shortcut-blue/30 focus:outline-none focus:border-shortcut-blue/30 focus:ring-2 focus:ring-shortcut-teal/40 transition-colors`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-shortcut-blue/40 hover:text-shortcut-blue/70 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {error && <p className="text-[13px] text-shortcut-coral font-medium">Incorrect password.</p>}
          <button type="submit" className="w-full py-3 rounded-full bg-shortcut-blue text-white text-[15px] font-bold hover:bg-shortcut-blue/90 transition-colors">
            View
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SponsorOnePager() {
  const { slug = '' } = useParams<{ slug: string }>();
  const cfg = SPONSOR_PAGES[slug];
  const storageKey = `sponsor-auth-${slug}`;

  const [authenticated, setAuthenticated] = useState(
    () => !cfg?.password || sessionStorage.getItem(storageKey) === 'true'
  );
  const [activeSection, setActiveSection] = useState('');
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const gallery = useGalleryByKey();

  const services = useMemo(
    () => (cfg?.services ? cfg.services.map(serviceById) : SPONSOR_SERVICES),
    [cfg]
  );

  useEffect(() => {
    if (!authenticated) return;
    const sections = document.querySelectorAll('[data-toc]');
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActiveSection(e.target.id); }),
      { rootMargin: '-15% 0px -70% 0px' }
    );
    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, [authenticated]);

  if (!cfg) {
    return (
      <div className="min-h-screen bg-neutral-light-gray font-['Outfit',system-ui,sans-serif] flex items-center justify-center">
        <p className={`text-[16px] font-medium ${INK}`}>This page does not exist.</p>
      </div>
    );
  }

  if (!authenticated) {
    return <Gate cfg={cfg} storageKey={storageKey} onPass={() => setAuthenticated(true)} />;
  }

  const { organizer, conference: conf, contact } = cfg;
  const hero = cfg.heroPhoto ?? DEFAULT_HERO;
  const mailto = `mailto:${contact.email}?subject=${encodeURIComponent(`Wellness lounge sponsorship at ${conf.name}`)}`;

  const tocItems = [
    { id: 'how', label: 'How it works' },
    { id: 'gets', label: 'What sponsors get' },
    { id: 'work', label: 'Who does what' },
    { id: 'proof', label: 'Proof' },
    { id: 'stations', label: 'Stations' },
  ];

  return (
    <div className="min-h-screen bg-neutral-light-gray font-['Outfit',system-ui,sans-serif]">

      {/* ── Sticky bar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-shortcut-blue/[.06]">
        <div className={`${GUT} ${COL} h-14 flex items-center justify-between`}>
          <div className="flex items-center gap-3 md:gap-4">
            <div className="text-[16px] font-extrabold tracking-tight text-shortcut-blue">{organizer.mark}</div>
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
          <a
            href={mailto}
            className="h-9 inline-flex items-center px-4 rounded-full bg-shortcut-coral text-white text-[13.5px] font-bold"
          >
            Talk to us
          </a>
        </div>
      </nav>

      <main className="pt-14">

        {/* ══════════ HERO ══════════ */}
        <section className="relative bg-shortcut-blue pt-14 md:pt-24 lg:pt-[120px] pb-20 md:pb-28 lg:pb-[146px]">
          <div className={`${GUT} ${COL} relative z-10`}>
            <div className="flex items-center gap-5 md:gap-7 mb-10 md:mb-14 pb-7 border-b border-white/15">
              <div className="text-[22px] md:text-[28px] font-extrabold tracking-tight text-white">{organizer.mark}</div>
              <div className="h-7 md:h-10 w-px bg-white/25" aria-hidden="true" />
              <img src="/conference/shortcut-logo-white.svg" alt="Shortcut" className="h-6 md:h-8 w-auto" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,560px)_minmax(380px,1fr)] gap-10 xl:gap-16 items-center">
              <div className="min-w-0">
                <p className="m-0 text-[12px] font-extrabold uppercase tracking-[.09em] text-shortcut-teal mb-6">
                  A premium sponsorship for {conf.name}
                </p>

                <h1 className="m-0 text-[34px] md:text-[48px] lg:text-[56px] font-semibold leading-[1.08] tracking-[-.03em] text-white max-w-[18ch] text-balance">
                  A wellness lounge in your sponsor&rsquo;s name.
                  <span className="block text-shortcut-teal">You sell it. We run it.</span>
                </h1>

                <p className="m-0 mt-[22px] text-[17px] md:text-[19px] font-medium leading-[1.5] text-white/[.86] max-w-[46ch]">
                  Massage, headshots, manicures and more, on your conference floor. You set
                  the sponsor&rsquo;s price and keep the margin.
                </p>

                <div className="flex flex-wrap items-center gap-6 mt-8">
                  <a
                    href="#problem"
                    className="h-[52px] inline-flex items-center px-8 rounded-full bg-shortcut-coral text-white text-[17px] font-bold tracking-[-.01em] shadow-[0_4px_14px_rgba(255,80,80,.3)] transition-transform duration-500 hover:-translate-y-[3px]"
                  >
                    Why sponsors buy it
                  </a>
                  <a href="#work" className="text-[15px] font-bold tracking-[-.012em] text-white hover:text-shortcut-teal transition-colors">
                    What your team does &rarr;
                  </a>
                </div>

                <div className="flex flex-wrap gap-2 mt-9 max-w-[560px]">
                  {conf.facts.slice(0, 4).map((label, i) => (
                    <span
                      key={label}
                      className="h-10 inline-flex items-center px-4 rounded-full text-shortcut-blue text-[14.5px] font-extrabold tracking-[-.01em] whitespace-nowrap"
                      style={{ background: PILL_FILLS[i % PILL_FILLS.length] }}
                    >
                      {label}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3 mt-4">
                  {[
                    { icon: Calendar, label: conf.dateLabel },
                    { icon: MapPin, label: conf.venue },
                    { icon: Users, label: conf.audienceLabel },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2.5">
                      <Icon size={14} className="text-shortcut-teal" strokeWidth={2.5} />
                      <span className="text-[13.5px] font-bold text-white">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] bg-white p-4 shadow-[0_30px_70px_rgba(3,34,50,.28)]">
                <div className="relative aspect-[3/2] overflow-hidden rounded-[20px] bg-shortcut-teal">
                  <img src={hero.src} alt={hero.alt} className="h-full w-full object-cover" />
                  <span className="absolute left-[18px] bottom-[18px] h-10 inline-flex items-center rounded-full bg-white/[.94] px-4">
                    <span className="text-[14px] font-extrabold tracking-[-.012em] text-shortcut-blue">
                      Our rendering for a conference lounge
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ THE PROBLEM ══════════ */}
        <Panel id="problem" tone="tint">
          <SectionHead
            kicker="Why it sells"
            title="Everyone remembers the massage."
            accent="Now they’ll remember who gave it."
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {TWO_SIDES.map((side) => (
              <div key={side.who} className={`${CARD_ON_TINT} ${CARD_PAD}`}>
                <p className={`${CARD_KICKER} ${INK_META}`}>{side.who}</p>
                <h3 className={`${CARD_TITLE} mt-3 text-shortcut-blue`}>{side.title}</h3>
                <p className={`${CARD_BODY} mt-3 ${INK}`}>{side.body}</p>
              </div>
            ))}
          </div>
        </Panel>

        {/* ══════════ HOW IT WORKS (the website's bento) ══════════ */}
        <Panel id="how">
          <SponsorBento conferenceName={conf.name} dateLabel={conf.dateLabel} />
        </Panel>

        {/* ══════════ WHAT SPONSORS GET (the attendee path) ══════════ */}
        <Panel id="gets" tone="tint">
          <SectionHead
            kicker="What sponsors get"
            title="The sponsor hosts the whole visit."
            accent="Here’s how it goes."
          />
          <ol className="m-0 p-0 list-none grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {PATH.map((p, i) => (
              <li
                key={p.title}
                className={`relative flex min-h-[240px] flex-col overflow-hidden ${CARD_R} px-7 md:px-8 pt-7 md:pt-8 pb-[104px]`}
                style={{ background: p.fill, color: p.ink }}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-[46px] -right-1 text-[132px] font-extrabold leading-none tracking-[-.06em] opacity-[.14]"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className={`${CARD_KICKER} relative opacity-70`}>{p.k}</p>
                <h3 className={`${CARD_TITLE} relative mt-3 [color:inherit]`}>{p.title}</h3>
                <p className={`${CARD_BODY} relative mt-3 opacity-90`}>{p.body}</p>
              </li>
            ))}
          </ol>

          <div className={`${FRAME} mt-5 shadow-[0_1px_2px_rgba(3,34,50,.05),0_10px_30px_rgba(3,34,50,.06)]`}>
            <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-2">
              <Shot {...BRAND_SHOTS.booking} inset className="h-[300px] md:h-[440px] lg:h-full lg:min-h-[480px]" />
              <div className="grid grid-cols-1 gap-3 md:gap-4">
                {BRAND_SHOTS.side.map((sh) => (
                  <Shot key={sh.cap} {...sh} className="h-[220px] md:h-[232px]" />
                ))}
              </div>
            </div>
          </div>
        </Panel>

        {/* ══════════ WHO DOES WHAT ══════════ */}
        <Panel id="work">
          <SectionHead
            kicker="Who does what"
            title="Your part is short."
            accent="Ours is everything else."
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="flex flex-col gap-5">
              {ROLES.filter((r) => r.who !== 'Shortcut').map((r) => <RoleCard key={r.who} r={r} />)}
            </div>
            {ROLES.filter((r) => r.who === 'Shortcut').map((r) => <RoleCard key={r.who} r={r} us />)}
          </div>
        </Panel>

        {/* ══════════ PROOF ══════════ */}
        <Panel id="proof" tone="navy">
          <SectionHead
            dark
            kicker="Proof"
            title="400 massages in three days."
            accent="A waitlist that never dropped below 200."
            sub="At Workhuman Live 2026 we ran the wellness zone with five chairs, open to close."
          />
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {PROOF_STATS.map((st) => (
              <div key={st.label} className="border-t border-white/15 pt-6">
                <div className="text-[52px] md:text-[64px] font-bold leading-none tracking-[-.04em] text-shortcut-teal tabular-nums">
                  {st.fig}
                </div>
                <div className="mt-2 text-[17px] font-medium leading-[1.45] text-white/85">{st.label}</div>
              </div>
            ))}
          </div>
          <div className={`${FRAME} mt-12 md:mt-14 shadow-[0_30px_70px_rgba(0,0,0,.25)]`}>
            <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-[1.25fr_1fr_1fr]">
              {PROOF_GALLERY.map((g, i) => (
                <Shot key={g.cap} cap={g.cap} img={g.img} pos="center 30%" className={`${i === 0 ? 'col-span-2 md:col-span-1 h-[260px]' : 'h-[240px]'} md:h-[440px]`} />
              ))}
            </div>
          </div>
          <div className="mt-12 md:mt-14">
            <SizzleReel />
          </div>
        </Panel>

        {/* ══════════ STATIONS ══════════ */}
        <Panel id="stations">
          <SectionHead
            kicker="What goes in the lounge"
            title="Sell the whole lounge to one sponsor, or each station separately."
            sub="Every station can carry the sponsor's name and a line from their campaign. Tap any station for the detail."
          />
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 sm:gap-y-10 xl:grid-cols-4">
            {services.map((s, i) => <StationCard key={s.id} s={s} onOpen={() => setOpenIdx(i)} />)}
          </div>
        </Panel>

        {/* ══════════ NEXT STEP ══════════ */}
        <Panel tone="navy">
          <div className="flex flex-col items-center text-center">
            <SectionHead
              dark
              kicker="Next step"
              title={`Add the lounge to your ${conf.name} sponsorship packages.`}
              sub="Send us your dates and expected attendance. We come back with our cost, and a page in your brand that your team can send to sponsors."
            />
            <a
              href={mailto}
              className="-mt-2 h-[52px] inline-flex items-center gap-2.5 px-8 rounded-full bg-shortcut-coral text-white text-[17px] font-bold tracking-[-.01em] shadow-[0_4px_14px_rgba(255,80,80,.3)] transition-transform duration-500 hover:-translate-y-[3px]"
            >
              Email {contact.name}
              <ArrowUpRight size={19} strokeWidth={2.5} />
            </a>
            <div className="mt-12 pt-8 w-full border-t border-white/15">
              <div className="text-[11px] font-bold uppercase tracking-[.12em] text-white/40">
                Prepared for {organizer.name}
              </div>
            </div>
          </div>
        </Panel>

      </main>

      {openIdx !== null && (
        <StationModal
          stations={services}
          index={openIdx}
          gallery={gallery}
          onClose={() => setOpenIdx(null)}
          onGo={setOpenIdx}
        />
      )}
    </div>
  );
}
