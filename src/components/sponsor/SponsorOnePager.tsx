import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  Calendar, MapPin, Users, Eye, EyeOff, Play, Clock, Megaphone,
  ArrowUpRight, Camera, Radio,
} from 'lucide-react';
import { SPONSOR_PAGES, type SponsorPageConfig } from './sponsorPages';
import StationModal, { useGalleryByKey } from './StationModal';
import SponsorBento from './SponsorBento';
import { SPONSOR_SERVICES, serviceById, type SponsorServiceDef } from '../../utils/sponsorPackages';

/* ─────────────────────────────────────────────
   Conference partner page: the pitch to a CONFERENCE ORGANIZER.

   The organizer buys the lounge from us and sells it to one of their
   sponsors as a premium sponsorship. So the argument runs:
     1. Your sponsors want three things from your audience: time with them,
        their contact details, and to be remembered.
     2. The lounge gives a sponsor all three, with their name on every step
        from the invite to the follow up.
     3. You sell it. We run every part of it.
     4. Proof it draws: Workhuman Live 2026.
     5. What can go in the lounge.
     6. Next step.

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
const CARD_SHELL =
  'rounded-[28px] bg-white border border-[#E2E9E8] shadow-[0_1px_2px_rgba(3,34,50,.05),0_10px_30px_rgba(3,34,50,.06)]';
const CARD = `${CARD_SHELL} p-7 md:p-8`;

const PILL_FILLS = ['#9EFAFF', '#FFCBA6', '#FEDC64', '#F7BBFF'];

/* The problem and the fix, from both sides of the sale. This is the core
   of the page: organizers need more sponsor dollars, sponsors need more
   clients, and a booth delivers neither well. */
const TWO_SIDES = [
  {
    who: 'For your sponsors and exhibitors',
    today: 'They pay for a booth, then stand in it and wait. Attendees have to wander over, show interest and hand over a badge to scan. Most of them walk past.',
    fix: 'Attendees book time with them before the show. They get a massage, a headshot or a manicure they love, they remember who gave it to them, and they hand over their name, title, company and email to book it. The busiest spot on the floor, and a lead gen machine.',
  },
  {
    who: 'For you',
    today: 'Your revenue grows when sponsors spend more and come back. That is a hard sell when what you have to offer is another booth, a logo or a lanyard.',
    fix: 'A premium sponsorship with a result behind it: a line, a list and a report. You sell it at your price, sponsors renew because it worked, and your team runs none of it.',
  },
];

/* What a sponsor pays for, in their terms. Durations are the stations'
   own, from a headshot to a sound bath; never one number for all of them. */
const SPONSOR_WANTS = [
  {
    icon: Clock, title: 'Time with your attendees',
    body: 'Attendees stay in the sponsor’s space for the whole appointment or session, from an eight minute headshot to an hour long sound bath. The sponsor’s team is there before and after to talk.',
  },
  {
    icon: Megaphone, title: 'Recognition before the show',
    body: 'The invitation to book goes to every attendee on your list ahead of the conference, presenting the sponsor. Everyone on the list gets it, whether they book or not.',
  },
  {
    icon: Camera, title: 'Recognition after the show',
    body: 'When the lounge includes a headshot studio, the retouched photos arrive in each attendee’s inbox in the sponsor’s brand. They are the photos people put on LinkedIn.',
  },
  {
    icon: Radio, title: 'Reach beyond the appointment book',
    body: 'Add a group session, like a sound bath or a mindfulness break, and there is no cap. One session can seat a full ballroom under the sponsor’s name.',
  },
];

/* The attendee's path, as the sponsor experiences it. Rendered as the
   website's numbered step cards (shortcut/frontend/pages/solutions/
   conferences.vue, .sw-step): a tinted card, the numeral bled off the corner,
   and the detail behind a `+`. */
const PATH = [
  { k: 'Before the show', title: 'The invitation', fill: '#9EFAFF', ink: '#003756',
    body: 'Goes to your attendees from you, presenting the sponsor’s lounge.' },
  { k: 'Before the show', title: 'The booking page', fill: '#FEDC64', ink: '#003756',
    body: 'In the sponsor’s brand, with their form fields and their opt-in language.' },
  { k: 'Before the show', title: 'The reminder', fill: '#F7BBFF', ink: '#003756',
    body: 'A text on the day, with the sponsor’s name on it.' },
  { k: 'At the show', title: 'The lounge', fill: '#FF5050', ink: '#ffffff',
    body: 'Their appointment or session, in a space built in the sponsor’s brand: welcome counter, screens and uniforms. A branded gift on the way out, if the sponsor wants one.' },
  { k: 'At the show', title: 'The conversation', fill: '#C7CBFB', ink: '#003756',
    body: 'The sponsor’s team greets people on the way in and on the way out.' },
  { k: 'After the show', title: 'The follow up', fill: '#003756', ink: '#ffffff',
    body: 'Every booking, and who actually showed up, goes to the sponsor after the show.' },
];

/* The website's conference gallery (conferences-data.js, CONF_GALLERY), on
   its 12 column grid. */
const GALLERY = [
  { col: 'lg:col-span-7', cap: 'Workhuman Live 2026 \u00b7 The Gratitude Garden', img: '/ds-assets/conference/zone-signage.jpeg', tint: '#9EFAFF' },
  { col: 'lg:col-span-5', cap: 'TradeStation \u00b7 glam station', img: '/ds-assets/conference/glam-station.jpg', tint: '#FEDC64' },
  { col: 'lg:col-span-4', cap: 'Welcoming an attendee', img: '/ds-assets/conference/welcome-desk.jpeg', tint: '#C7CBFB' },
  { col: 'lg:col-span-4', cap: 'TradeStation \u00b7 massage floor', img: '/ds-assets/conference/massage-floor.jpg', tint: '#A9F0CC' },
  { col: 'lg:col-span-4', cap: 'A sponsored Zen Zone', img: '/ds-assets/conference/zen-zone.jpeg', tint: '#FFCBA6' },
];


/* Who does what. The point of the section is how short the first two
   lists are next to the third. */
const ROLES = [
  {
    who: 'You',
    items: [
      'Add the lounge to your sponsorship lineup and set the price',
      'Introduce us to the sponsor who buys it',
      'Give us a space on the floor, and send the booking invitation to your attendee list',
    ],
  },
  {
    who: 'The sponsor',
    items: [
      'Sends their logo, colors and opt-in language',
      'Puts their team at the lounge entrance, if they want the conversations',
      'Takes the list home',
    ],
  },
  {
    who: 'Shortcut',
    items: [
      'The branded booking page, confirmations, text reminders and calendar invites',
      'Lounge design, signage, screens and uniforms produced in the sponsor’s brand',
      'Licensed Pros, chairs, music, setup and cleanup',
      'Waitlist management and live booking updates',
      'Certificates of insurance naming your venue and the sponsor',
      'The attendee list and a results report after the show',
    ],
  },
];

const PROOF_STATS = [
  { fig: '400', label: 'fifteen minute chair massages over three days' },
  { fig: '200+', label: 'on the waitlist, all three days' },
  { fig: '90%+', label: 'of appointment slots booked, across every event we run' },
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
    <div className="mx-auto w-full max-w-[900px] rounded-[28px] bg-white p-4 shadow-[0_30px_70px_rgba(3,34,50,.28)]">
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
            aria-label="Play a Shortcut event reel"
            className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-shortcut-blue/45 transition-colors hover:bg-shortcut-blue/35"
          >
            <span className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-shortcut-coral shadow-[0_10px_30px_rgba(255,80,80,.45)]">
              <Play size={30} className="ml-1 text-white" fill="currentColor" strokeWidth={0} />
            </span>
            <span className="rounded-full bg-white/[.94] px-5 py-2.5 text-[15px] font-extrabold tracking-[-.012em] text-shortcut-blue">
              A Shortcut event day
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, body, tint = 'bg-shortcut-teal' }: {
  icon: LucideIcon; title: string; body: string; tint?: string;
}) {
  return (
    <div className={`${CARD} flex flex-col`}>
      <span className={`w-11 h-11 rounded-full ${tint} flex items-center justify-center mb-5`}>
        <Icon size={19} className="text-shortcut-blue" strokeWidth={2.5} />
      </span>
      <h4 className="m-0 text-[19px] font-bold leading-[1.15] tracking-[-.02em] text-shortcut-blue">{title}</h4>
      <p className={`m-0 mt-2.5 text-[16px] font-medium leading-[1.55] ${INK}`}>{body}</p>
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
        <span className="absolute right-3.5 top-3.5 z-[2] grid h-9 w-9 place-items-center rounded-full bg-white text-[24px] font-medium leading-none text-shortcut-blue shadow-[0_2px_10px_rgba(3,34,50,.18)] transition-transform duration-300 group-hover:scale-110">
          +
        </span>
      </span>
      <span className="flex flex-col gap-1.5 px-0.5 pt-[18px]">
        <span className="text-[20px] font-semibold leading-[1.2] tracking-[-.015em] text-shortcut-blue">{s.name}</span>
        <span className={`text-[14px] font-semibold leading-[1.4] ${INK_META}`}>{s.meta}</span>
        <span className={`mt-1 text-[15.5px] font-medium leading-[1.55] ${INK}`}>{s.body}</span>
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
  const [openStep, setOpenStep] = useState<Record<number, boolean>>({});
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
    { id: 'problem', label: 'The problem' },
    { id: 'how', label: 'How it works' },
    { id: 'why', label: 'Why sponsors buy it' },
    { id: 'path', label: 'The attendee path' },
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

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,560px)_minmax(380px,1fr)] gap-10 xl:gap-16 items-start">
              <div className="min-w-0">
                <p className="m-0 text-[12px] font-extrabold uppercase tracking-[.09em] text-shortcut-teal mb-6">
                  For {conf.name} · A new sponsorship to sell
                </p>

                <h1 className="m-0 text-[34px] md:text-[48px] lg:text-[56px] font-semibold leading-[1.08] tracking-[-.03em] text-white max-w-[18ch] text-balance">
                  Sell your sponsors a branded wellness lounge.
                  <span className="block text-shortcut-teal">You sell it. We run it.</span>
                </h1>

                <p className="m-0 mt-[22px] text-[17px] md:text-[19px] font-medium leading-[1.5] text-white/[.86] max-w-[46ch]">
                  We build a wellness lounge on your conference floor in your sponsor&rsquo;s brand:
                  massage, headshots, manicures and more. Attendees book ahead on the
                  sponsor&rsquo;s booking page, and the sponsor leaves with every name, title,
                  company and email. You set the price.
                </p>

                <div className="flex flex-wrap items-center gap-6 mt-8">
                  <a
                    href="#problem"
                    className="h-[52px] inline-flex items-center px-8 rounded-full bg-shortcut-coral text-white text-[17px] font-bold tracking-[-.01em] shadow-[0_4px_14px_rgba(255,80,80,.3)] transition-transform duration-500 hover:-translate-y-[3px]"
                  >
                    See the problem we solve
                  </a>
                  <a href="#work" className="text-[15px] font-bold tracking-[-.012em] text-white hover:text-shortcut-teal transition-colors">
                    What you need to do &rarr;
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
                      A lounge built in one sponsor&rsquo;s brand
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ ABOUT ══════════ */}
        <Panel id="about">
          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4 lg:gap-12 items-baseline">
            <p className={`m-0 text-[12px] font-extrabold uppercase tracking-[.09em] ${INK_META}`}>
              About Shortcut
            </p>
            <div className="max-w-[62ch]">
              <p className="m-0 text-[24px] md:text-[32px] font-semibold leading-[1.3] tracking-[-.025em] text-shortcut-blue">
                Shortcut is one team that brings massage, headshots, beauty and group wellness
                sessions to more than 500 companies across the US.
              </p>
              <p className={`m-0 mt-5 text-[18px] md:text-[20px] font-medium leading-[1.5] ${INK}`}>
                For conferences, we turn that into a sponsorship: a wellness lounge built in your
                sponsor&rsquo;s brand, booked by your attendees and run entirely by us. You sell it
                at your price. We deliver it.
              </p>
            </div>
          </div>
        </Panel>

        {/* ══════════ THE PROBLEM WE SOLVE ══════════ */}
        <Panel id="problem" tone="tint">
          <SectionHead
            kicker="The problem we solve"
            title="Exhibitors pay for a booth, then wait."
            accent="We give them a line."
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {TWO_SIDES.map((side) => (
              <div key={side.who} className={`${CARD_SHELL} overflow-hidden flex flex-col`}>
                <div className="px-7 md:px-9 pt-7 md:pt-9">
                  <h3 className="m-0 text-[24px] md:text-[28px] font-bold leading-[1.1] tracking-[-.025em] text-shortcut-blue">
                    {side.who}
                  </h3>
                  <p className={`m-0 mt-6 text-[12px] font-extrabold uppercase tracking-[.09em] ${INK_META}`}>Today</p>
                  <p className={`m-0 mt-2 text-[17px] font-medium leading-[1.55] ${INK}`}>{side.today}</p>
                </div>
                <div className="mt-7 flex-1 bg-shortcut-blue px-7 md:px-9 py-7 md:py-8">
                  <p className="m-0 text-[12px] font-extrabold uppercase tracking-[.09em] text-shortcut-teal">With the lounge</p>
                  <p className="m-0 mt-2 text-[17px] font-medium leading-[1.55] text-white">{side.fix}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* ══════════ WHAT SETS SHORTCUT APART (the website's bento) ══════════ */}
        <Panel id="how">
          <SponsorBento conferenceName={conf.name} dateLabel={conf.dateLabel} />
        </Panel>

        {/* ══════════ WHY SPONSORS BUY IT ══════════ */}
        <Panel id="why" tone="tint">
          <SectionHead
            kicker="Why sponsors buy it"
            title="What your sponsors get."
            accent="Face time, leads and recognition."
            sub="Beyond the list, the lounge keeps the sponsor in front of your audience before, during and after the show."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {SPONSOR_WANTS.map((w) => (
              <FeatureCard key={w.title} icon={w.icon} title={w.title} body={w.body} tint="bg-accent-pink" />
            ))}
          </div>
        </Panel>

        {/* ══════════ THE ATTENDEE PATH ══════════ */}
        <Panel id="path">
          <SectionHead
            kicker="The attendee path"
            title="The sponsor's brand is on every step."
            sub="From the invitation to the list. Half of it happens before the doors open."
          />
          <ol className="m-0 p-0 list-none grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {PATH.map((p, i) => {
              const open = !!openStep[i];
              return (
                <li
                  key={p.title}
                  className="relative flex min-h-[280px] flex-col overflow-hidden rounded-[28px] px-7 pb-20 pt-9"
                  style={{ background: p.fill, color: p.ink }}
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-[46px] -right-1 text-[132px] font-extrabold leading-none tracking-[-.06em] opacity-[.14]"
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="relative m-0 text-[11px] font-extrabold uppercase tracking-[.09em] opacity-70">{p.k}</p>
                  <h4 className="relative m-0 mt-3 text-[24px] font-extrabold leading-[1.15] tracking-[-.028em] [color:inherit]">{p.title}</h4>
                  {open && (
                    <p className="relative m-0 mt-3 text-[15.5px] font-medium leading-[1.5] opacity-90">{p.body}</p>
                  )}
                  <button
                    type="button"
                    aria-label={open ? 'Hide details' : 'Show details'}
                    aria-expanded={open}
                    onClick={() => setOpenStep((o) => ({ ...o, [i]: !o[i] }))}
                    className="absolute bottom-6 left-7 grid h-10 w-10 place-items-center rounded-full bg-white text-[22px] font-semibold leading-none text-shortcut-blue shadow-[0_2px_10px_rgba(3,34,50,.18)]"
                  >
                    {open ? '\u2212' : '+'}
                  </button>
                </li>
              );
            })}
          </ol>

          {/* The booking page, branded end to end. NOTE: YW3 x Netflix Ads is
              under an MNDA (2026-09-16); clear it before this ships. */}
          <div className="mx-auto mt-14 md:mt-16 w-full max-w-[1100px] rounded-[28px] bg-white p-4 shadow-[0_30px_70px_rgba(3,34,50,.28)]">
            <img
              src="/yw3/booking-page.jpg"
              alt="A Shortcut booking page branded end to end for Netflix Ads, showing the stations, open times and event details"
              className="w-full h-auto rounded-[20px]"
            />
          </div>
          <p className={`mx-auto mt-5 max-w-[68ch] text-center text-[16px] font-medium leading-[1.55] ${INK}`}>
            A booking page we built for Netflix Ads. The sponsor&rsquo;s brand is the only one on it.
          </p>
        </Panel>

        {/* ══════════ WHO DOES WHAT ══════════ */}
        <Panel id="work" tone="tint">
          <SectionHead
            kicker="Who does what"
            title="You sell it."
            accent="We do everything else."
            sub="Your team puts it in the lineup and makes the introduction. From there, we run it."
          />
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1.4fr] gap-5">
            {ROLES.map((r) => {
              const us = r.who === 'Shortcut';
              return (
                <div
                  key={r.who}
                  className={us
                    ? 'rounded-[28px] bg-shortcut-blue p-7 md:p-8 shadow-[0_20px_50px_rgba(3,34,50,.22)]'
                    : `${CARD}`}
                >
                  <p className={`m-0 text-[12px] font-extrabold uppercase tracking-[.09em] ${us ? 'text-shortcut-teal' : INK_META}`}>
                    {r.who}
                  </p>
                  <ul className="m-0 mt-5 p-0 list-none flex flex-col gap-3.5">
                    {r.items.map((it) => (
                      <li key={it} className={`flex gap-3 text-[16px] font-medium leading-[1.5] ${us ? 'text-white' : INK}`}>
                        <span className={`mt-[9px] w-[6px] h-[6px] flex-none rounded-full ${us ? 'bg-shortcut-teal' : 'bg-shortcut-coral'}`} />
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* ══════════ PROOF ══════════ */}
        <Panel id="proof" tone="navy">
          <SectionHead
            dark
            kicker="Workhuman Live 2026"
            title="400 massages in three days."
            accent="A waitlist that never dropped below 200."
            sub="We ran the wellness zone: five chairs, open to close. One hundred hours of attendee time, spent in one space."
          />
          <div className="rounded-[28px] bg-white p-4 shadow-[0_30px_70px_rgba(0,0,0,.25)]">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:grid-rows-[300px_220px]">
              {GALLERY.map((g) => (
                <div
                  key={g.cap}
                  role="img"
                  aria-label={g.cap}
                  className={`relative min-h-[220px] overflow-hidden rounded-[20px] bg-cover bg-[center_30%] ${g.col}`}
                  style={{ backgroundColor: g.tint, backgroundImage: `url('${g.img}')` }}
                >
                  <span className="absolute bottom-3.5 left-3.5 inline-flex h-[30px] items-center rounded-full bg-white/[.92] px-3 text-[12.5px] font-extrabold text-shortcut-blue">
                    {g.cap}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {PROOF_STATS.map((st) => (
              <div key={st.label} className="border-t border-white/15 pt-6">
                <div className="text-[52px] md:text-[64px] font-bold leading-none tracking-[-.04em] text-shortcut-teal tabular-nums">
                  {st.fig}
                </div>
                <div className="mt-2 text-[17px] font-medium leading-[1.45] text-white/85">{st.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-16 md:mt-20">
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
          <div className="grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 xl:grid-cols-4">
            {services.map((s, i) => <StationCard key={s.id} s={s} onOpen={() => setOpenIdx(i)} />)}
          </div>
        </Panel>

        {/* ══════════ CLOSE ══════════ */}
        <section className="relative -mt-[50px] rounded-t-[50px] bg-shortcut-blue py-16 md:py-24">
          <div className={`${GUT} ${COL} text-center`}>
            <h2 className="m-0 text-[28px] md:text-[42px] font-bold leading-[1.08] tracking-[-.035em] text-white max-w-[22ch] mx-auto">
              Add the wellness lounge to your {conf.name} sponsorship packages.
            </h2>
            <p className="m-0 mt-4 text-[16px] md:text-[17px] font-medium leading-[1.5] text-white/75 max-w-[56ch] mx-auto">
              Send us your dates and expected attendance. We come back with our cost, and a
              sponsor-ready page in your brand that your team can send to buyers.
            </p>
            <a
              href={mailto}
              className="mt-9 h-[52px] inline-flex items-center gap-2.5 px-8 rounded-full bg-shortcut-coral text-white text-[17px] font-bold tracking-[-.01em] shadow-[0_4px_14px_rgba(255,80,80,.3)] transition-transform duration-500 hover:-translate-y-[3px]"
            >
              Email {contact.name}
              <ArrowUpRight size={19} strokeWidth={2.5} />
            </a>
            <div className="mt-12 pt-8 border-t border-white/15">
              <div className="text-[11px] font-bold uppercase tracking-[.12em] text-white/40">
                Prepared for {organizer.name}
              </div>
            </div>
          </div>
        </section>

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
