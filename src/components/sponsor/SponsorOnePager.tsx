import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Eye, EyeOff, Play,
  ArrowUpRight,
} from 'lucide-react';
import { fetchPublicSponsorPage } from '../../services/sponsorPageService';
import type { SponsorPageConfig } from '../../types/sponsorPage';
import '../../styles/sponsor-page.css';
import StationModal, { useGalleryByKey } from './StationModal';
import SponsorBento from './SponsorBento';
import SponsorPricing from './SponsorPricing';
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
  src: '/aacsb/lounge-rendering-uc.jpg',
  alt: 'Rendering of a conference wellness lounge built in one sponsor’s brand, with a branded welcome desk, privacy screens and massage chairs',
};

const GUT = 'px-6 md:px-10 lg:px-[100px]';
const COL = 'w-full max-w-[1720px] mx-auto';

const INK = 'text-[#2A5468]';
const INK_META = 'text-[#45596A]';
const CARD_SHELL =
  'rounded-[28px] bg-white border border-[#E2E9E8] shadow-[0_1px_2px_rgba(3,34,50,.05),0_10px_30px_rgba(3,34,50,.06)]';

/* The hero's service pills: the holiday hero's six, with its colors, its
   hover words and its drop delays (the bottom row lands first). Each class
   string is written out whole so Tailwind can see it. */
const HERO_PILLS: { label: string; alt: string; emoji?: boolean; cls: string }[][] = [
  [
    { label: 'Massage', alt: 'aaaah', cls: 'bg-[#9EFAFF] [animation-delay:.95s]' },
    { label: 'Hair', alt: 'snip', cls: 'bg-[#FEDC64] [animation-delay:1.13s]' },
    { label: 'Beauty', alt: 'fresh', cls: 'bg-[#F7BBFF] [animation-delay:1.31s]' },
  ],
  [
    { label: 'Meditation', alt: 'shhh', cls: 'bg-[#C7CBFB] [animation-delay:.4s]' },
    { label: 'Movement', alt: '\u{1F4AA}', emoji: true, cls: 'bg-[#A9F0CC] [animation-delay:.58s]' },
    { label: 'Headshots', alt: '\u{1F4F8}', emoji: true, cls: 'bg-[#FFCBA6] [animation-delay:.76s]' },
  ],
];

/* About: committed client logos (the /conference one-pager's set). Teads is
   left out until its clearance is confirmed. */
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

/* How it works, as five slides in the order a sponsorship seller thinks:
   what they sell (a white labeled experience), what they make, why it draws,
   why sponsors pay, and who runs it (Will, 2026-10-16: the sales team is the
   second slide). Who runs it is the bento's job below, so the rail ends at
   the sponsor (2026-10-16). Each slide is one visual, a step label, a short title and
   one line. "Turnkey" is used at Will's request: the messaging spine's ban
   on the word covers HR-buyer pages, not partner pages. */
type HowVisual = 'invoice' | 'photo' | 'leads';
const HOW_STEPS: {
  who: string; title: string; body: string; visual: HowVisual;
  tint?: string; img?: string; cap?: string; pos?: string;
}[] = [
  {
    who: 'Your sponsor\u2019s lounge', title: 'A turnkey, white-labeled wellness experience', visual: 'photo',
    img: '/conference/tradestation/ts-event-51.jpg', cap: 'TradeStation \u00b7 Fresh Look activation', pos: 'bg-center',
    body: 'Everything carries your sponsor\u2019s brand: the lounge, the signage, the booking page, the emails and the Pros\u2019 uniforms. We design and build all of it.',
  },
  {
    who: 'Your sales team', title: 'Sell it at a premium and keep most of it', visual: 'invoice', tint: 'bg-[#9EFAFF]',
    body: 'You set the sponsor\u2019s price. Our fee is fixed and billed only after your sponsor signs.',
  },
  {
    who: 'Your attendees', title: 'Attendees book ahead and line up', visual: 'photo',
    img: '/conference/onepager/wh/booth-3.jpeg', cap: 'Workhuman Live 2026', pos: 'bg-[center_35%]',
    body: 'A free massage, headshot or manicure on a long conference day. Over 90% of slots get booked, and a waitlist fills any that open up.',
  },
  {
    who: 'Your sponsor', title: 'Guaranteed traffic, face time and leads', visual: 'leads', tint: 'bg-[#FEDC64]',
    body: 'Attendees come to the sponsor by appointment, all day long, and every booking is a lead.',
  },
];

/* The sponsor slide's mock lead list. Demo people, same set as the bento's live list. */
const DEMO_LEADS = [
  { ini: 'MR', name: 'Maya R.', role: 'VP, People', av: 'bg-[#9EFAFF]' },
  { ini: 'DK', name: 'Devon K.', role: 'Head of Talent', av: 'bg-[#F7BBFF]' },
  { ini: 'PS', name: 'Priya S.', role: 'Benefits Director', av: 'bg-[#C7CBFB]' },
];



/* Workhuman Live 2026, from the website's conference gallery
   (conferences-data.js, CONF_GALLERY). Only this event's photos sit under
   the Workhuman headline. Ported verbatim from the live page (origin/main,
   #9) at Will's request, 2026-10-16. */
const PROOF_GALLERY = [
  { cap: 'Workhuman Live \u00b7 The Gratitude Garden', img: '/ds-assets/conference/zone-signage.jpeg', tint: '#9EFAFF' },
  { cap: 'Chair massage on the floor', img: '/ds-assets/conference/welcome-desk.jpeg', tint: '#C7CBFB' },
  { cap: 'The Zen Zone', img: '/ds-assets/conference/zen-zone.jpeg', tint: '#FFCBA6' },
];

/** Photo tile with the caption pill (the live page's Shot). */
function Shot({ cap, img, alt, className = '', pos = 'center' }: {
  cap: string; img: string; alt?: string; className?: string; pos?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-[20px] bg-neutral-light-gray ${className}`}>
      <img src={img} alt={alt ?? cap} loading="lazy" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: pos }} />
      <span className="absolute bottom-3 left-3 max-w-[calc(100%-24px)] inline-flex min-h-[30px] items-center rounded-full bg-white/[.92] px-3 py-1 text-[12px] md:text-[12.5px] font-extrabold leading-tight text-shortcut-blue">
        {cap}
      </span>
    </div>
  );
}

const FRAME = 'rounded-[28px] bg-white p-3 md:p-4';



/* Next steps: the organizer's whole part, in order. */
const NEXT_STEPS = [
  'Send us your dates and expected attendance.',
  'We send our fixed fee and a sponsor-ready page in your brand.',
  'You sell it, give us a space on the floor, and send your attendees the invitation we write.',
];

/* The headline carries the 400 and the 200; these are the numbers it
   doesn't (live page, #9). */
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

/** The visual on top of each how-it-works slide. */
function HowVisualBlock({ step, confName }: { step: (typeof HOW_STEPS)[number]; confName: string }) {
  if (step.visual === 'photo') {
    return (
      <div
        role="img"
        aria-label={step.cap}
        className={`relative aspect-[4/3] bg-cover bg-no-repeat bg-[#E2E9E8] ${step.pos ?? 'bg-center'}`}
        style={{ backgroundImage: `url('${step.img}')` }}
      >
        <span className="absolute left-3.5 bottom-3.5 inline-flex h-[30px] items-center rounded-full bg-white/[.92] px-3 text-[12.5px] font-extrabold text-shortcut-blue">
          {step.cap}
        </span>
      </div>
    );
  }
  return (
    <div className={`aspect-[4/3] ${step.tint} flex items-center justify-center p-5 sm:p-6`} aria-hidden="true">
      {step.visual === 'invoice' && (
        /* The V2 proposal's pricing summary card (.pv-price): navy, white
           rows, aqua total. Illustrative numbers (Will, 2026-10-15). */
        <div className="w-full rounded-[20px] bg-shortcut-blue p-5 shadow-[0_20px_50px_rgba(3,34,50,.28)]">
          <div className="flex items-baseline justify-between gap-2 mb-3.5">
            <span className="text-[17px] font-bold tracking-[-.02em] text-white">Sponsorship summary</span>
            <span className="text-[10.5px] font-bold uppercase tracking-[.08em] text-white/55">Example</span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[13px] font-semibold text-white">Massage Zen Zone sponsorship</span>
            <span className="text-[13px] font-bold text-white whitespace-nowrap">$50,000</span>
          </div>
          <div className="h-px bg-white/[.12] my-2.5" />
          <div className="flex justify-between gap-2 text-[12.5px] text-white/75">
            <span>Shortcut costs</span>
            <span className="text-white">&minus;$10,000</span>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-white/[.12] flex items-baseline justify-between gap-2">
            <span className="text-[14px] font-bold text-white whitespace-nowrap">Conference net</span>
            <span className="text-[26px] font-extrabold leading-none tracking-[-.02em] text-shortcut-teal tabular-nums">$40,000</span>
          </div>
        </div>
      )}
      {step.visual === 'leads' && (
        <div className="w-full rounded-[18px] bg-white p-4 shadow-[0_12px_36px_rgba(3,34,50,.16)]">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#E2E9E8]">
            <span className="text-[13.5px] font-extrabold text-shortcut-blue">Your sponsor&rsquo;s leads</span>
            <span className="h-6 inline-flex items-center px-2.5 rounded-full bg-[#E6F6EF] text-[10.5px] font-extrabold uppercase tracking-[.06em] text-[#137A52]">Live</span>
          </div>
          <div className="mt-1">
            {DEMO_LEADS.map((l) => (
              <div key={l.ini} className="flex items-center gap-2.5 py-2 border-b border-[#E2E9E8] last:border-b-0">
                <span className={`w-8 h-8 flex-none rounded-full ${l.av} grid place-items-center text-[10.5px] font-extrabold text-shortcut-blue`}>{l.ini}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-bold leading-tight text-shortcut-blue">{l.name}</span>
                  <span className={`block text-[11.5px] font-semibold leading-tight ${INK_META}`}>{l.role} · {confName}</span>
                </span>
                <span className="flex-none text-[10.5px] font-bold text-[#137A52]">Opted in</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** How it works as a horizontal rail: swipe, scroll or step with the arrows.
 *  The rail bleeds to the page edge (Apple style) and snaps to each card. */
function HowRail({ confName }: { confName: string }) {
  const ref = useRef<HTMLOListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [active, setActive] = useState(0);

  const sync = () => {
    const el = ref.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('[data-slide]');
    const step = card ? card.offsetWidth + 20 : 1;
    const end = el.scrollLeft >= el.scrollWidth - el.clientWidth - 2;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(end);
    setActive(end ? HOW_STEPS.length - 1 : Math.round(el.scrollLeft / step));
  };
  useEffect(() => {
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  /* Scroll to an exact card, not by a relative amount: relative smooth
     scrolls get dropped while scroll snap is settling. */
  const go = (dir: number) => {
    const el = ref.current;
    const card = el?.querySelector<HTMLElement>('[data-slide]');
    if (!el || !card) return;
    const step = card.offsetWidth + 20;
    const max = el.scrollWidth - el.clientWidth;
    // At the end the last stop is shorter than a full card, so count it as its own step.
    const current = el.scrollLeft >= max - 2 ? Math.ceil(max / step) : Math.round(el.scrollLeft / step);
    el.scrollTo({ left: Math.min(max, Math.max(0, (current + dir) * step)), behavior: 'smooth' });
  };

  const arrow = 'grid h-12 w-12 place-items-center rounded-full bg-shortcut-blue text-white shadow-[0_4px_14px_rgba(3,34,50,.24)] transition-opacity disabled:opacity-30 disabled:cursor-default';

  return (
    <div>
      <div className="-mx-6 md:-mx-10 lg:-mx-[100px]">
        <ol
          ref={ref}
          onScroll={sync}
          className="sp-rail m-0 list-none flex gap-5 overflow-x-auto snap-x snap-mandatory px-6 md:px-10 lg:px-[100px] scroll-px-6 md:scroll-px-10 lg:scroll-px-[100px] pb-4"
        >
          {HOW_STEPS.map((step, i) => (
            <li key={step.title} data-slide className="snap-start flex-none w-[82vw] sm:w-[380px] xl:w-[400px] flex">
              <article className={`${CARD_SHELL} flex flex-1 flex-col overflow-hidden`}>
                <HowVisualBlock step={step} confName={confName} />
                <div className="flex flex-1 flex-col px-7 pt-6 pb-7">
                  <p className={`m-0 text-[12px] font-extrabold uppercase tracking-[.09em] ${INK_META}`}>
                    {String(i + 1).padStart(2, '0')} · {step.who}
                  </p>
                  <h3 className="m-0 mt-2.5 text-[23px] font-bold leading-[1.15] tracking-[-.025em] text-shortcut-blue">{step.title}</h3>
                  <p className={`m-0 mt-2.5 text-[15.5px] font-medium leading-[1.55] ${INK}`}>{step.body}</p>
                </div>
              </article>
            </li>
          ))}
        </ol>
      </div>
      <div className="mt-6 flex items-center justify-center gap-5">
        <button type="button" aria-label="Previous step" onClick={() => go(-1)} disabled={atStart} className={arrow}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M19 12H6M11.5 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="flex items-center gap-2" aria-hidden="true">
          {HOW_STEPS.map((step, i) => (
            <span key={step.title} className={`h-2 rounded-full transition-all duration-300 ${i === active ? 'w-6 bg-shortcut-blue' : 'w-2 bg-shortcut-blue/20'}`} />
          ))}
        </div>
        <button type="button" aria-label="Next step" onClick={() => go(1)} disabled={atEnd} className={arrow}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h13M12.5 6l6 6-6 6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
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

/** The organizer beside the Shortcut logo: their logo when there is one,
 *  otherwise their name. On the navy hero the logo sits on a white chip so
 *  a dark logo still reads. */
function PartnerMark({ mark, logoUrl, size, onDark = false }: {
  mark: string; logoUrl?: string; size: 'nav' | 'hero' | 'gate'; onDark?: boolean;
}) {
  if (logoUrl) {
    const h = size === 'hero' ? 'h-8 md:h-10 max-w-[200px]' : size === 'gate' ? 'h-8 max-w-[180px]' : 'h-7 max-w-[150px]';
    const img = <img src={logoUrl} alt={mark} className={`${h} w-auto object-contain`} />;
    return onDark ? <span className="inline-flex items-center rounded-xl bg-white px-3 py-2">{img}</span> : img;
  }
  const text = size === 'hero' ? 'text-[22px] md:text-[28px]' : size === 'gate' ? 'text-[22px]' : 'text-[16px]';
  return <div className={`${text} font-extrabold tracking-tight ${onDark ? 'text-white' : 'text-shortcut-blue'}`}>{mark}</div>;
}

function Gate({ mark, logoUrl, onSubmit }: {
  mark: string; logoUrl?: string; onSubmit: (password: string) => Promise<boolean>;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    const ok = await onSubmit(password);
    setChecking(false);
    if (!ok) {
      setError(true);
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-light-gray font-['Outfit',system-ui,sans-serif] flex items-center justify-center">
      <div className="w-full max-w-sm mx-auto px-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-4 mb-4">
            <PartnerMark mark={mark} logoUrl={logoUrl} size="gate" />
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
          <button type="submit" disabled={checking} className="w-full py-3 rounded-full bg-shortcut-blue text-white text-[15px] font-bold hover:bg-shortcut-blue/90 transition-colors disabled:opacity-60">
            {checking ? 'Checking…' : 'View'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SponsorOnePager() {
  const { slug = '' } = useParams<{ slug: string }>();
  const storageKey = `sponsor-pw-${slug}`;

  /* The page loads from sponsor_pages through a server check of the
     password, remembered for the tab so a refresh stays unlocked. */
  const [state, setState] = useState<
    { kind: 'loading' } | { kind: 'missing' } | { kind: 'locked'; mark: string; logoUrl?: string } | { kind: 'page'; cfg: SponsorPageConfig }
  >({ kind: 'loading' });

  useEffect(() => {
    let live = true;
    setState({ kind: 'loading' });
    let saved: string | undefined;
    try { saved = sessionStorage.getItem(storageKey) || undefined; } catch { saved = undefined; }
    fetchPublicSponsorPage(slug, saved).then((res) => { if (live) setState(res); });
    return () => { live = false; };
  }, [slug, storageKey]);

  const unlock = async (password: string) => {
    const res = await fetchPublicSponsorPage(slug, password);
    if (res.kind !== 'page') return false;
    try { sessionStorage.setItem(storageKey, password); } catch { /* private window */ }
    setState(res);
    return true;
  };

  const cfg = state.kind === 'page' ? state.cfg : null;
  const authenticated = !!cfg;
  const [activeSection, setActiveSection] = useState('');
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [heroGo, setHeroGo] = useState(false);
  const gallery = useGalleryByKey();

  const services = useMemo(
    () => (cfg?.services ? cfg.services.map(serviceById) : SPONSOR_SERVICES),
    [cfg]
  );

  /* The pills wait for fonts (at most 0.7s, 1.2s on phones), like the
     holiday page's heroGo. */
  useEffect(() => {
    if (!authenticated) return;
    let done = false;
    const go = () => { if (!done) { done = true; setHeroGo(true); } };
    const t = window.setTimeout(go, window.innerWidth <= 767 ? 1200 : 700);
    document.fonts?.ready.then(() => window.setTimeout(go, 60)).catch(() => {});
    return () => window.clearTimeout(t);
  }, [authenticated]);

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

  if (state.kind === 'loading') {
    return <div className="min-h-screen bg-shortcut-blue" aria-busy="true" />;
  }

  if (state.kind === 'locked') {
    return <Gate mark={state.mark} logoUrl={state.logoUrl} onSubmit={unlock} />;
  }

  if (!cfg) {
    return (
      <div className="min-h-screen bg-neutral-light-gray font-['Outfit',system-ui,sans-serif] flex items-center justify-center">
        <p className={`text-[16px] font-medium ${INK}`}>This page does not exist.</p>
      </div>
    );
  }

  const { organizer, conference: conf, contact } = cfg;
  const hero = cfg.heroPhoto ?? DEFAULT_HERO;
  const mailto = `mailto:${contact.email}?subject=${encodeURIComponent(`A call about the wellness lounge at ${conf.name}`)}`;

  const tocItems = [
    { id: 'how-it-works', label: 'How it works' },
    { id: 'how', label: 'What sets us apart' },
    { id: 'stations', label: 'Services' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'proof', label: 'Proof' },
    { id: 'next', label: 'Next steps' },
  ];

  return (
    <div className="min-h-screen bg-neutral-light-gray font-['Outfit',system-ui,sans-serif]">

      {/* ── Sticky bar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-shortcut-blue/[.06]">
        <div className={`${GUT} ${COL} h-14 flex items-center justify-between`}>
          <div className="flex items-center gap-3 md:gap-4">
            <PartnerMark mark={organizer.mark} logoUrl={organizer.logoUrl} size="nav" />
            <div className="h-4 w-px bg-shortcut-blue/15" aria-hidden="true" />
            <img src="/shortcut-logo-blue.svg" alt="Shortcut" className="h-4 w-auto" />
          </div>
          <div className="hidden xl:flex items-center gap-7">
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

        {/* ══════════ HERO ══════════
            Laid out like the getshortcut.co holiday hero (shortcut repo,
            frontend/components/HolidayDesktop.vue): headline, line and buttons
            on the left; on the right a chip on top and the service pills at
            the bottom; the image module full width underneath. Pill motion is
            in src/styles/sponsor-page.css. */}
        <section className="sp-hero relative overflow-hidden bg-shortcut-blue pt-14 md:pt-24 lg:pt-[120px] pb-20 md:pb-28 lg:pb-[146px]">
          <div className={`${GUT} ${COL} relative z-10`}>
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-10 items-stretch">
              <div className="min-w-0">
                <h1 className="sp-rise [animation-delay:.05s] m-0 text-[40px] md:text-[56px] lg:text-[64px] xl:text-[72px] font-semibold leading-[1.02] tracking-[-.04em] text-white text-balance">
                  Sell your sponsors a branded wellness lounge.
                  <span className="block text-shortcut-teal">You sell it. We run it.</span>
                </h1>

                <p className="sp-rise [animation-delay:.12s] m-0 mt-8 text-[18px] md:text-[22px] font-medium leading-[1.5] text-white/[.88] max-w-[34ch] text-pretty">
                  Add a powerful new sponsorship opportunity that delivers traffic for your
                  sponsors and sells at a premium.
                </p>

                <div className="sp-rise [animation-delay:.2s] mt-11 flex flex-wrap items-center gap-3.5">
                  <a
                    href="#how-it-works"
                    className="h-[52px] inline-flex items-center px-[30px] rounded-full bg-shortcut-coral text-white text-[17px] font-bold tracking-[-.01em] whitespace-nowrap shadow-[0_4px_14px_rgba(255,80,80,.3)] transition-[transform,box-shadow] duration-300 hover:-translate-y-[3px] hover:shadow-[0_12px_30px_rgba(255,80,80,.42)]"
                  >
                    See how it works
                  </a>
                  <a
                    href="#work"
                    className="text-[16px] font-bold text-white underline underline-offset-4 decoration-white/50 hover:text-shortcut-teal transition-colors"
                  >
                    What you need to do
                  </a>
                </div>
              </div>

              <div className="flex flex-col items-start justify-between gap-7">
                <div className="sp-rise [animation-delay:.16s] lg:pt-2.5">
                  <span className="inline-flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-2.5 min-h-[38px] py-2 sm:py-[7px] pl-2 pr-4 sm:pr-[18px] rounded-[18px] sm:rounded-[22px] bg-[rgba(254,220,100,.14)] border border-[rgba(254,220,100,.5)] text-white text-[14px] font-bold tracking-[-.01em]">
                    <span className="h-6 inline-flex flex-none items-center px-2.5 rounded-full bg-[#FEDC64] text-shortcut-blue text-[11px] font-extrabold tracking-[.07em] uppercase">
                      {conf.name}
                    </span>
                    {conf.dateLabel && <span className="leading-[1.3] pl-1 sm:pl-0">{conf.dateLabel}</span>}
                  </span>
                </div>

                <div className={`hb-pile flex flex-col items-start gap-2 pb-0.5 ${heroGo ? 'hb-go' : ''}`} aria-label="Services">
                  {HERO_PILLS.map((row, r) => (
                    <div key={r} className="flex flex-wrap gap-2">
                      {row.map((p) => (
                        <a
                          key={p.label}
                          href="#stations"
                          className={`hb-pill inline-flex items-center gap-2 h-10 px-[18px] rounded-full text-[15px] font-bold tracking-[-.01em] whitespace-nowrap no-underline text-shortcut-blue shadow-[0_6px_16px_rgba(3,34,50,.18)] ${p.cls}`}
                        >
                          <span className="hb-pill-in inline-flex items-center gap-2">
                            <span className="hb-w">
                              <span className="hb-w1">{p.label}</span>
                              <span className={`hb-w2${p.emoji ? ' is-emoji' : ''}`} aria-hidden="true">{p.alt}</span>
                            </span>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <path d="M5 12h13M12.5 6l6 6-6 6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                        </a>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="sp-rise [animation-delay:.24s] mt-11 rounded-[28px] bg-neutral-light-gray p-4 shadow-[0_30px_70px_rgba(3,34,50,.28)]">
              <div className="relative aspect-[4/3] md:aspect-[2/1] overflow-hidden rounded-[20px] bg-shortcut-teal">
                <img src={hero.src} alt={hero.alt} className="h-full w-full object-cover" />
                <span className="absolute left-[18px] bottom-[18px] h-10 inline-flex items-center rounded-full bg-white/[.94] px-4">
                  <span className="text-[14px] font-extrabold tracking-[-.012em] text-shortcut-blue">
                    A lounge built in the sponsor&rsquo;s brand
                  </span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ HOW IT WORKS ══════════
            One section, talking to the sales team: the five steps from the
            sale to the floor as a horizontal rail, then the client logos. It
            replaces the old About band and the three audience cards. */}
        <Panel id="how-it-works">
          <SectionHead
            kicker="How it works"
            title="How your sales team turns the lounge into revenue"
            sub="At your conference, we give your sales team a premium sponsorship to sell, and we work with your events team to run it from load-in to teardown."
          />
          <HowRail confName={conf.name} />

          <div className="mt-14 md:mt-16 pt-10 border-t border-[#E2E9E8] flex flex-col items-center gap-8">
            <p className={`m-0 text-[12px] font-extrabold uppercase tracking-[.09em] ${INK_META}`}>
              Trusted by more than 500 companies, including
            </p>
            <div className="sp-logos w-full">
              <div className="sp-logo-track">
                {[...CLIENT_LOGOS, ...CLIENT_LOGOS].map((l, i) => (
                  <img
                    key={`${l.alt}-${i}`}
                    src={l.src}
                    alt={i < CLIENT_LOGOS.length ? l.alt : ''}
                    aria-hidden={i >= CLIENT_LOGOS.length ? true : undefined}
                    className={`block flex-none w-[112px] object-contain ${l.tall ? 'h-10' : 'h-8'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </Panel>

        {/* ══════════ WHAT SETS SHORTCUT APART (the website's bento) ══════════ */}
        <Panel id="how">
          <SponsorBento conferenceName={conf.name} dateLabel={conf.dateLabel} />
        </Panel>

        {/* ══════════ SERVICES ══════════
            Straight after the bento (Will, 2026-10-16). Selling stations to
            different sponsors is a revenue lever, so the sub says so. */}
        <Panel id="stations" tone="tint">
          <SectionHead
            kicker="Services"
            title="Build the lounge from any of our services"
            sub="Sell it as one sponsorship, or sell each station to a different sponsor. Tap any service for the detail."
          />
          <div className="grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 xl:grid-cols-4">
            {services.map((s, i) => <StationCard key={s.id} s={s} onOpen={() => setOpenIdx(i)} />)}
          </div>
        </Panel>

        {/* ══════════ PRICING ══════════
            The holiday builder, priced like the approved AACSB proposal. See
            SponsorPricing.tsx. Above the proof (Will, 2026-10-16). */}
        <Panel id="pricing">
          <SectionHead
            kicker="Pricing"
            title="Price your sponsorship"
            accent="in three steps."
          />
          <SponsorPricing confName={conf.name} contactEmail={contact.email} />
        </Panel>

        {/* ══════════ PROOF ══════════
            Exactly as it is on the live page (origin/main, #9), Will
            2026-10-16. The reel sits in its own TradeStation section below,
            as it does there. */}
        <Panel id="proof" tone="navy">
          <SectionHead
            dark
            kicker="Proof"
            title="Workhuman Live 2026."
            accent="A three-day HR conference."
            sub="We ran the wellness zone with five massage chairs, fully booked all three days."
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
            sub="Haircuts and styling under TradeStation\u2019s own signage, run by our team."
          />
          <SizzleReel />
        </Panel>

        {/* ══════════ NEXT STEPS ══════════
            The organizer's own part, which is the answer to "our team would
            have to manage it": three steps, then the email. */}
        <section className="relative -mt-[50px] rounded-t-[50px] bg-shortcut-blue py-16 md:py-24">
          <div data-toc id="next" className="absolute -top-20" />
          <div className={`${GUT} ${COL}`}>
            <div className="flex flex-col items-center text-center gap-3.5">
              <p className="m-0 text-[12px] font-extrabold uppercase tracking-[.09em] text-shortcut-teal">Next steps</p>
              <h2 className="m-0 text-[30px] md:text-[44px] font-bold leading-[1.05] tracking-[-.035em] text-white max-w-[22ch] text-balance">
                Add the lounge to your {conf.name} sponsorship lineup
              </h2>
            </div>
            <ol className="m-0 mt-12 p-0 list-none grid grid-cols-1 md:grid-cols-3 gap-5 max-w-[1100px] mx-auto">
              {NEXT_STEPS.map((step, i) => (
                <li key={step} className="rounded-[28px] bg-white/[.08] border border-white/[.12] p-7 flex flex-col gap-4">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-shortcut-teal text-[16px] font-extrabold text-shortcut-blue">{i + 1}</span>
                  <p className="m-0 text-[18px] font-semibold leading-[1.4] text-white">{step}</p>
                </li>
              ))}
            </ol>
            <div className="mt-10 flex justify-center">
              <a
                href={mailto}
                className="h-[52px] inline-flex items-center gap-2.5 px-8 rounded-full bg-shortcut-coral text-white text-[17px] font-bold tracking-[-.01em] shadow-[0_4px_14px_rgba(255,80,80,.3)] transition-transform duration-500 hover:-translate-y-[3px]"
              >
                Email {contact.name}
                <ArrowUpRight size={19} strokeWidth={2.5} />
              </a>
            </div>
            <div className="mt-12 pt-8 border-t border-white/15 text-center">
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
