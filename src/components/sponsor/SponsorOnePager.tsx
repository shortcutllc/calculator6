import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Eye, EyeOff, Play, ArrowUpRight } from 'lucide-react';
import { SPONSOR_PAGES, type SponsorPageConfig } from './sponsorPages';
import StationModal, { useGalleryByKey } from './StationModal';
import SponsorBento from './SponsorBento';
import { SPONSOR_SERVICES, serviceById, type SponsorServiceDef } from '../../utils/sponsorPackages';

/* ─────────────────────────────────────────────
   Conference partner page: the pitch to a CONFERENCE ORGANIZER.

   The organizer buys the lounge from us and sells it to one of their
   sponsors as a white label sponsorship. The page runs:
     Hero           a wellness lounge in your sponsor's name
     Services       what goes in the lounge
     Why it sells   who we are, and what it does for the sponsor and for you
     How it works   their name on everything, our team behind all of it
     Step by step   from the custom proposal to the follow up, and who
                    does each step
     Proof          Workhuman Live 2026
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
/* One card system. Radius 28, padding 7/8, one title size. Cards on a tint
   panel are white. */
const CARD_R = 'rounded-[28px]';
const CARD_PAD = 'p-7 md:p-8';
const CARD_ON_TINT = `${CARD_R} bg-white border border-[#E2E9E8] shadow-[0_1px_2px_rgba(3,34,50,.05),0_10px_30px_rgba(3,34,50,.06)]`;
const CARD_TITLE = 'm-0 text-[22px] md:text-[24px] font-bold leading-[1.15] tracking-[-.025em]';
const CARD_KICKER = 'm-0 text-[12px] font-extrabold uppercase tracking-[.09em]';
const CARD_BODY = 'm-0 text-[16px] font-medium leading-[1.55]';

/* The website hero's falling service pills (.pv-hero-pill in
   proposal-refresh.css, from getshortcut.co). The same set on every
   conference page; each pill jumps to the services. */
const HERO_PILLS = [
  { label: 'Massage', fill: '#9EFAFF', tilt: 0, delay: 0.95 },
  { label: 'Headshots', fill: '#FEDC64', tilt: 0, delay: 1.13 },
  { label: 'Hair and makeup', fill: '#F7BBFF', tilt: 0, delay: 1.31 },
  { label: 'Nails', fill: '#FFCBA6', tilt: 0, delay: 0.4 },
  { label: 'Mindfulness', fill: '#C7CBFB', tilt: 0, delay: 0.58 },
  { label: 'Sound baths', fill: '#A9F0CC', tilt: 0, delay: 0.76 },
];

/* Why it sells: who we are (the website's client logo scroll), then what
   the white label lounge does for each side of the sale. */

/* The website's client logos, as ConferenceOnePager's marquee runs them. */
const CLIENT_LOGOS = [
  { src: '/conference/onepager/logos/draftkings.svg', alt: 'DraftKings' },
  { src: '/conference/onepager/logos/nfl.svg', alt: 'NFL', tall: true },
  { src: '/conference/onepager/logos/bcg.svg', alt: 'BCG' },
  { src: '/conference/onepager/logos/wix.svg', alt: 'Wix' },
  { src: '/conference/onepager/logos/tripadvisor.svg', alt: 'Tripadvisor' },
  { src: '/conference/onepager/logos/pwc.svg', alt: 'PwC' },
  { src: '/conference/onepager/logos/paramount.svg', alt: 'Paramount' },
  { src: '/conference/onepager/logos/warner-bros.svg', alt: 'Warner Bros.', tall: true },
  { src: '/conference/onepager/logos/white-case.svg', alt: 'White & Case' },
  { src: '/conference/onepager/logos/mtv.svg', alt: 'MTV' },
];

function LogoRow({ logos, reverse = false }: { logos: typeof CLIENT_LOGOS; reverse?: boolean }) {
  return (
    <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
      <div className={`flex w-max animate-logo-marquee will-change-transform motion-reduce:animate-none ${reverse ? '[animation-direction:reverse]' : ''}`}>
        {[false, true].map((dup) => (
          <div key={String(dup)} className="flex items-center gap-10 pr-10" aria-hidden={dup}>
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
const TWO_SIDES = [
  {
    who: 'Shortcut',
    title: 'Trusted by 500+ companies.',
    body: 'One team for massage, headshots, beauty and group wellness across the US. We bring the Pros, the setup and the tech.',
    img: '',
    alt: '',
  },
  {
    who: 'For your sponsor',
    title: 'Guaranteed traffic. Guaranteed leads.',
    body: 'Attendees book before the show. The sponsor walks in with a full schedule and a contact list to engage before, during and after.',
    img: '/proposal-refresh/yw3-hero.jpg',
    alt: 'The same Pro giving a chair massage in a sponsor’s branded shirt',
  },
  {
    who: 'For you',
    title: 'The easiest upsell in your prospectus.',
    body: 'A premium package your team can sell right away. Attendees love it, sponsors see results, and we run every part of it.',
    img: '/conference/tradestation/ts-event-26.jpg',
    alt: 'A branded wellness activation on a busy event floor',
  },
];

/* What the sponsor gets: one attendee's visit, told in order, with the
   sponsor as the host at every step and the list as the payoff. Each card
   is the next beat of the same story; nothing goes in that isn't a beat.
   Rendered as the website's numbered step cards (shortcut/frontend/pages/
   solutions/conferences.vue, .sw-step). */
const PATH = [
  { k: 'Before the show', who: 'You and Shortcut', title: 'A custom proposal.', fill: '#9EFAFF', ink: '#003756',
    body: 'We work with your sales team to design a package for your sponsors.' },
  { k: 'Before the show', who: 'You', title: 'Sold at your price.', fill: '#FEDC64', ink: '#003756',
    body: 'Your team offers it to sponsors. The sponsor sends us their logo and colors.' },
  { k: 'Before the show', who: 'You', title: 'In every invite.', fill: '#F7BBFF', ink: '#003756',
    body: 'The booking link goes into your conference emails and app.' },
  { k: 'Before the show', who: 'Shortcut', title: 'Booked and reminded.', fill: '#C7CBFB', ink: '#003756',
    body: 'Attendees pick their slot, and every confirmed appointment gets a custom reminder.' },
  { k: 'At the show', who: 'Shortcut and the sponsor', title: 'Welcomed.', fill: '#FF5050', ink: '#ffffff',
    body: 'A lounge in the sponsor’s colors, their team at the door, and a massage, blowout or headshot.' },
  { k: 'After the show', who: 'Shortcut', title: 'Followed up.', fill: '#003756', ink: '#ffffff',
    body: 'The sponsor gets every name. You get a results report.' },
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

/* The headline carries the 400 and the 200; these are the numbers it
   doesn't. */
const PROOF_STATS = [
  { fig: '400', label: 'fifteen minute massages' },
  { fig: '100%', label: 'of slots booked' },
  { fig: '200+', label: 'on the waitlist, all three days' },
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

function SizzleReel({ bare = false, className = '' }: { bare?: boolean; className?: string }) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  const start = () => {
    setPlaying(true);
    ref.current?.play();
  };

  return (
    <div className={bare ? className : `mx-auto w-full max-w-[900px] rounded-[28px] bg-white p-3 md:p-4 shadow-[0_30px_70px_rgba(0,0,0,.25)] ${className}`}>
      <div className={`relative overflow-hidden rounded-[20px] bg-shortcut-blue ${bare ? 'h-full min-h-[220px]' : 'aspect-video'}`}>
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
              Watch the day
            </span>
          </button>
        )}
      </div>
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
  const mailto = `mailto:${contact.email}?subject=${encodeURIComponent(`A call about the wellness lounge at ${conf.name}`)}`;

  const tocItems = [
    { id: 'stations', label: 'Services' },
    { id: 'how', label: 'How it works' },
    { id: 'gets', label: 'Step by step' },
    { id: 'proof', label: 'Proof' },
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

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,620px)_minmax(380px,1fr)] gap-10 xl:gap-16 items-center">
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
                    href="#stations"
                    className="h-[52px] inline-flex items-center px-8 rounded-full bg-shortcut-coral text-white text-[17px] font-bold tracking-[-.01em] shadow-[0_4px_14px_rgba(255,80,80,.3)] transition-transform duration-500 hover:-translate-y-[3px]"
                  >
                    See the services
                  </a>
                  <a href="#gets" className="text-[15px] font-bold tracking-[-.012em] text-white hover:text-shortcut-teal transition-colors">
                    How it runs &rarr;
                  </a>
                </div>

                <div className="pv-root !bg-transparent mt-9 flex max-w-[620px] flex-wrap gap-2.5">
                  {HERO_PILLS.map((p) => (
                    <a
                      key={p.label}
                      href="#stations"
                      className="pv-hero-pill"
                      style={{ ['--tilt' as string]: `${p.tilt}deg`, ['--dx' as string]: '0px', background: p.fill, animationDelay: `${p.delay}s` } as React.CSSProperties}
                    >
                      {p.label}
                    </a>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] bg-white p-4 shadow-[0_30px_70px_rgba(3,34,50,.28)]">
                <div className="relative aspect-[3/2] overflow-hidden rounded-[20px] bg-shortcut-teal">
                  <img src={hero.src} alt={hero.alt} className="h-full w-full object-cover" />
                  <span className="absolute left-[18px] bottom-[18px] h-10 inline-flex items-center rounded-full bg-white/[.94] px-4">
                    <span className="text-[14px] font-extrabold tracking-[-.012em] text-shortcut-blue">
                      University of Cincinnati @ AACSB 2026
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ STATIONS ══════════ */}
        <Panel id="stations">
          <SectionHead
            kicker="What goes in the lounge"
            title="Services attendees line up for."
            sub="Sponsors can pick one or multiple services."
          />
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 sm:gap-y-10 xl:grid-cols-4">
            {services.map((s, i) => <StationCard key={s.id} s={s} onOpen={() => setOpenIdx(i)} />)}
          </div>
        </Panel>

        {/* ══════════ THE PROBLEM ══════════ */}
        <Panel id="problem" tone="tint">
          <SectionHead
            kicker="Why it sells"
            title="Your sponsors win. So do you."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TWO_SIDES.map((side) => (
              <div key={side.who} className={`${CARD_ON_TINT} overflow-hidden flex flex-col`}>
                {side.img ? (
                  <div className="relative aspect-[4/3] bg-neutral-light-gray">
                    <img src={side.img} alt={side.alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="aspect-[4/3] flex flex-col justify-center gap-7 bg-[#EAF7F8]">
                    <LogoRow logos={CLIENT_LOGOS.slice(0, 5)} />
                    <LogoRow logos={CLIENT_LOGOS.slice(5)} reverse />
                  </div>
                )}
                <div className={CARD_PAD}>
                  <p className={`${CARD_KICKER} ${INK_META}`}>{side.who}</p>
                  <h3 className={`${CARD_TITLE} mt-3 text-shortcut-blue`}>{side.title}</h3>
                  <p className={`${CARD_BODY} mt-3 ${INK}`}>{side.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* ══════════ HOW IT WORKS (the website's bento) ══════════ */}
        <Panel id="how">
          <SectionHead
            kicker="How it works"
            title="Their name on everything."
            accent="Our team behind all of it."
          />
          <SponsorBento conferenceName={conf.name} dateLabel={conf.dateLabel} />
        </Panel>

        {/* ══════════ STEP BY STEP (with who does each step) ══════════ */}
        <Panel id="gets" tone="tint">
          <SectionHead
            kicker="Step by step"
            title="How it runs, start to finish."
            accent="Your team does three things. We do the rest."
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
                <span className="absolute bottom-7 left-7 md:left-8 inline-flex h-7 items-center rounded-full bg-white/90 px-3 text-[12px] font-extrabold text-shortcut-blue">
                  {p.who}
                </span>
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

        {/* ══════════ PROOF ══════════ */}
        <Panel id="proof" tone="navy">
          <SectionHead
            dark
            kicker="Proof"
            title="Workhuman Live 2026."
            accent="Every slot booked, all three days."
            sub="We ran the wellness zone with five chairs, open to close."
          />
          <div className="grid grid-cols-3 gap-3 md:gap-5">
            {PROOF_STATS.map((st) => (
              <div key={st.label} className="rounded-[20px] md:rounded-[28px] bg-white/[.06] border border-white/10 px-2 py-5 md:p-8 text-center">
                <div className="text-[30px] sm:text-[44px] md:text-[64px] font-bold leading-none tracking-[-.04em] text-shortcut-teal tabular-nums">
                  {st.fig}
                </div>
                <div className="mt-2 md:mt-3 text-[13px] md:text-[17px] font-medium leading-[1.35] md:leading-[1.45] text-white/85">{st.label}</div>
              </div>
            ))}
          </div>
          <div className={`${FRAME} mt-5 shadow-[0_30px_70px_rgba(0,0,0,.25)]`}>
            <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-[1.25fr_1fr_1fr]">
              {PROOF_GALLERY.map((g, i) => (
                <Shot key={g.cap} cap={g.cap} img={g.img} pos="center 30%" className={`${i === 0 ? 'col-span-2 md:col-span-1 h-[260px]' : 'h-[240px]'} md:h-[440px]`} />
              ))}
            </div>
          </div>
        </Panel>

        {/* ══════════ TRADESTATION (a branded day, on video) ══════════ */}
        <Panel tone="tint">
          <SectionHead
            kicker="TradeStation"
            title="A branded event day, start to finish."
            sub="Haircuts and styling under TradeStation’s own signage, run by our team."
          />
          <SizzleReel />
        </Panel>

        {/* ══════════ NEXT STEP ══════════ */}
        <Panel>
          <div className="flex flex-col items-center text-center">
            <SectionHead
              kicker="Next step"
              title="Let’s talk through the details."
              sub={`A short call about ${conf.name}: your dates, your sponsors and what you want to offer them. We come back with a proposal your team can sell.`}
            />
            <a
              href={mailto}
              className="-mt-2 h-[52px] inline-flex items-center gap-2.5 px-8 rounded-full bg-shortcut-coral text-white text-[17px] font-bold tracking-[-.01em] shadow-[0_4px_14px_rgba(255,80,80,.3)] transition-transform duration-500 hover:-translate-y-[3px]"
            >
              Set up a call with {contact.name.split(' ')[0]}
              <ArrowUpRight size={19} strokeWidth={2.5} />
            </a>
            <div className="mt-12 pt-8 w-full border-t border-[#E2E9E8]">
              <div className={`text-[11px] font-bold uppercase tracking-[.12em] ${INK_META}`}>
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
