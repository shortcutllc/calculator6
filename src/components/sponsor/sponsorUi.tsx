import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import type { SponsorServiceDef } from '../../utils/sponsorPackages';

/* ─────────────────────────────────────────────
   The conference partner page's design system, shared by both pages built
   on it:
     /sponsor/:slug       the pitch to the ORGANIZER (SponsorOnePager)
     /sponsor/:slug/deck  what the organizer sends their SPONSORS (SponsorDeck)

   Section system, type tokens, cards, photo tiles, the How it works rail,
   station cards, the step cards, proof and the close are the partner page's
   own (moved here as they were, 2026-11-17), so the two pages stay one
   family. Page copy lives with each page.

   Static mode (SponsorStatic) is for the PDF: sections show at once, the
   rail lays out as a grid and the reel shows its poster.
   ───────────────────────────────────────────── */

export const SponsorStatic = createContext(false);
export const useSponsorStatic = () => useContext(SponsorStatic);

export const GUT = 'px-6 mdp:px-10 lgp:px-[100px]';
export const COL = 'w-full max-w-[1720px] mx-auto';

export const INK = 'text-[#2A5468]';
export const INK_META = 'text-[#45596A]';
export const CARD_SHELL =
  'rounded-[28px] bg-white border border-[#E2E9E8] shadow-[0_1px_2px_rgba(3,34,50,.05),0_10px_30px_rgba(3,34,50,.06)]';

export const FRAME = 'rounded-[28px] bg-white p-3 mdp:p-4';

/* Step by step card tokens (the live page's). */
export const CARD_R = 'rounded-[28px]';
export const CARD_TITLE = 'm-0 text-[22px] mdp:text-[24px] font-bold leading-[1.15] tracking-[-.025em]';
export const CARD_KICKER = 'm-0 text-[12px] font-extrabold uppercase tracking-[.09em]';
export const CARD_BODY = 'm-0 text-[16px] font-medium leading-[1.55]';

/* The AACSB rendering: a lounge built in one sponsor's brand, which is the
   product in a single picture. It carries the University of Cincinnati's
   branding, so confirm that is fine to show other organizers. */
export const LOUNGE_RENDERING = {
  src: '/aacsb/lounge-rendering-uc.jpg',
  alt: 'Rendering of a conference wellness lounge built in one sponsor’s brand, with a branded welcome desk, privacy screens and massage chairs',
};

export const SIZZLE_VIDEO =
  'https://oxigtmlqqfbhzekpdalt.supabase.co/storage/v1/object/public/site-media/yw3/tradestation-sizzle.mp4';

/* The hero's service pills: the holiday hero's six, with its colors, its
   hover words and its drop delays (the bottom row lands first). Each class
   string is written out whole so Tailwind can see it. */
export const HERO_PILLS: { label: string; alt: string; emoji?: boolean; cls: string }[][] = [
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

/* Committed client logos (the /conference one-pager's set). Teads is left
   out until its clearance is confirmed. */
export const CLIENT_LOGOS = [
  { src: '/conference/onepager/logos/draftkings.svg', alt: 'DraftKings' },
  { src: '/conference/onepager/logos/nfl.svg', alt: 'NFL', tall: true },
  { src: '/conference/onepager/logos/bcg.svg', alt: 'BCG' },
  { src: '/conference/onepager/logos/wix.svg', alt: 'Wix' },
  { src: '/conference/onepager/logos/tripadvisor.svg', alt: 'Tripadvisor' },
  { src: '/conference/onepager/logos/pwc.svg', alt: 'PwC' },
  { src: '/conference/onepager/logos/paramount.svg', alt: 'Paramount' },
  { src: '/conference/onepager/logos/warner-bros.svg', alt: 'Warner Bros.', tall: true },
  { src: '/conference/onepager/logos/white-case.svg', alt: 'White & Case', short: true },
  { src: '/conference/onepager/logos/mtv.svg', alt: 'MTV' },
];

/* The mock lead list on the rail's leads slide. Demo people, same set as the
   bento's live list. */
export const DEMO_LEADS = [
  { ini: 'MR', name: 'Maya R.', role: 'VP, People', av: 'bg-[#9EFAFF]' },
  { ini: 'DK', name: 'Devon K.', role: 'Head of Talent', av: 'bg-[#F7BBFF]' },
  { ini: 'PS', name: 'Priya S.', role: 'Benefits Director', av: 'bg-[#C7CBFB]' },
];

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

/* What a sponsor's brand looks like on the booking page and on the floor.
   The Netflix Ads booking page is cleared to use (Will, 2026-10-16). */
export const BRAND_SHOTS = {
  booking: { cap: 'The booking page · Netflix Ads', img: '/yw3/booking-page.jpg',
    alt: 'A Shortcut booking page branded end to end for Netflix Ads' },
  side: [
    { cap: 'The signage · TradeStation', img: '/ds-assets/conference/glam-station.jpg',
      alt: 'A TradeStation banner reading Get a fresh look at TradeStation' },
    { cap: 'The uniforms · TradeStation', img: '/ds-assets/conference/massage-floor.jpg',
      alt: 'A stylist in a TradeStation apron styling an attendee’s hair' },
  ],
};

/** Photo tile with the caption pill (the live page's Shot). */
export function Shot({ cap, img, alt, className = '', pos = 'center', inset = false }: {
  cap: string; img: string; alt?: string; className?: string; pos?: string; inset?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden rounded-[20px] ${inset ? 'bg-shortcut-teal/40' : 'bg-neutral-light-gray'} ${className}`}>
      {inset ? (
        <img src={img} alt={alt ?? cap} loading="lazy" className="absolute left-6 right-6 top-6 mdp:left-10 mdp:right-10 mdp:top-10 w-[calc(100%-48px)] mdp:w-[calc(100%-80px)] rounded-t-[14px] shadow-[0_12px_36px_rgba(3,34,50,.18)]" />
      ) : (
        <img src={img} alt={alt ?? cap} loading="lazy" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: pos }} />
      )}
      <span className="absolute bottom-3 left-3 max-w-[calc(100%-24px)] inline-flex min-h-[30px] items-center rounded-full bg-white/[.92] px-3 py-1 text-[12px] mdp:text-[12.5px] font-extrabold leading-tight text-shortcut-blue">
        {cap}
      </span>
    </div>
  );
}

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

export function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { ref, visible } = useFadeIn();
  const shown = useSponsorStatic() || visible;
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'} ${className}`}
      style={{ transitionTimingFunction: 'cubic-bezier(.22,1,.36,1)' }}
    >
      {children}
    </div>
  );
}

export function Panel({ id, children, tone = 'white' }: {
  id?: string; children: React.ReactNode; tone?: 'white' | 'tint' | 'navy';
}) {
  const bg = tone === 'white' ? 'bg-white' : tone === 'tint' ? 'bg-neutral-light-gray' : 'bg-shortcut-blue';
  return (
    <section className={`relative -mt-[50px] rounded-t-[50px] py-16 mdp:py-28 ${bg}`}>
      {id && <div data-toc id={id} className="absolute -top-20" />}
      <Reveal className={`${GUT} ${COL}`}>{children}</Reveal>
    </section>
  );
}

export function SectionHead({ kicker, title, accent, sub, dark = false }: {
  kicker: string; title: React.ReactNode; accent?: string; sub?: string; dark?: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-3.5 mb-12 mdp:mb-14">
      <p className={`m-0 text-[12px] font-extrabold uppercase tracking-[.09em] ${dark ? 'text-shortcut-teal' : INK_META}`}>
        {kicker}
      </p>
      <h2 className={`m-0 text-[30px] mdp:text-[44px] font-bold leading-[1.05] tracking-[-.035em] max-w-[22ch] text-balance ${dark ? 'text-white' : 'text-shortcut-blue'}`}>
        {title}
        {accent && <span className="block text-shortcut-coral">{accent}</span>}
      </h2>
      {sub && (
        <p className={`m-0 text-[16px] mdp:text-[17px] font-medium leading-[1.55] max-w-[58ch] ${dark ? 'text-white/80' : INK}`}>
          {sub}
        </p>
      )}
    </div>
  );
}

export function SizzleReel() {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  const isStatic = useSponsorStatic();

  const start = () => {
    setPlaying(true);
    ref.current?.play();
  };

  return (
    <div className="mx-auto w-full max-w-[900px] rounded-[28px] bg-white p-4 shadow-[0_30px_70px_rgba(3,34,50,.28)]">
      <div className="relative aspect-video overflow-hidden rounded-[20px] bg-shortcut-blue">
        {isStatic ? (
          <img src="/yw3/tradestation-poster.jpg" alt="A TradeStation event day run by Shortcut" className="h-full w-full object-cover" />
        ) : (
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
        )}
        {!playing && !isStatic && (
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

/** One scrolling row of client logos, tinted teal (the Shortcut box). */
export function LogoRow({ logos, reverse = false }: { logos: typeof CLIENT_LOGOS; reverse?: boolean }) {
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
                className={`${logo.tall ? 'h-[38px]' : 'short' in logo ? 'h-[16px]' : 'h-[28px]'} w-auto flex-none [filter:grayscale(1)_sepia(1)_saturate(4)_hue-rotate(165deg)_brightness(.85)]`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── How it works rail ── */

export type HowVisual = 'logos' | 'invoice' | 'photo' | 'leads' | 'invite';
export interface HowStep {
  label: string; title: string; body: string; visual: HowVisual;
  tint?: string; img?: string; cap?: string; pos?: string;
}

/** The visual on top of each how-it-works slide. */
function HowVisualBlock({ step, confName, leadsTitle }: { step: HowStep; confName: string; leadsTitle: string }) {
  if (step.visual === 'logos') {
    return (
      <div className="aspect-[4/3] flex flex-col justify-center gap-7 bg-[#EAF7F8]">
        <LogoRow logos={CLIENT_LOGOS.slice(0, 5)} />
        <LogoRow logos={CLIENT_LOGOS.slice(5)} reverse />
      </div>
    );
  }
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
    <div className={`aspect-[4/3] ${step.tint} flex items-center justify-center p-5 smp:p-6`} aria-hidden="true">
      {step.visual === 'invoice' && (
        /* The V2 proposal's pricing summary card (.pv-price): navy, white
           rows, aqua total. Illustrative numbers (Will, 2026-10-15). */
        <div className="w-full rounded-[20px] bg-shortcut-blue p-5 shadow-[0_20px_50px_rgba(3,34,50,.28)]">
          <div className="flex items-baseline justify-between gap-2 mb-3.5">
            <span className="text-[17px] font-bold tracking-[-.02em] text-white">Sponsorship summary</span>
            <span className="text-[10.5px] font-bold uppercase tracking-[.08em] text-white/55">Example</span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[13px] font-semibold text-white">Massage Wellness Zone sponsorship</span>
            <span className="text-[13px] font-bold text-white whitespace-nowrap">$50,000</span>
          </div>
          <div className="h-px bg-white/[.12] my-2.5" />
          <div className="flex justify-between gap-2 text-[12.5px] text-white/75">
            <span>Your cost</span>
            <span className="text-white">&minus;$10,000</span>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-white/[.12] flex items-baseline justify-between gap-2">
            <span className="text-[14px] font-bold text-white whitespace-nowrap">Your margin</span>
            <span className="text-[26px] font-extrabold leading-none tracking-[-.02em] text-shortcut-teal tabular-nums">$40,000</span>
          </div>
        </div>
      )}
      {step.visual === 'invite' && (
        /* The attendee invite, drawn like the leads card: the organizer's
           email with the sponsor's offer and the booking button. Demo copy. */
        <div className="w-full rounded-[18px] bg-white p-4 shadow-[0_12px_36px_rgba(3,34,50,.16)]">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#E2E9E8]">
            <span className="text-[13.5px] font-extrabold text-shortcut-blue">From {confName}</span>
            <span className="h-6 inline-flex items-center px-2.5 rounded-full bg-[#EEF2F1] text-[10.5px] font-extrabold uppercase tracking-[.06em] text-[#45596A]">Example</span>
          </div>
          <p className={`m-0 mt-3.5 text-[10.5px] font-extrabold uppercase tracking-[.08em] ${INK_META}`}>You&rsquo;re invited</p>
          <p className="m-0 mt-1 text-[16px] font-bold leading-[1.25] tracking-[-.015em] text-shortcut-blue">A free chair massage at the wellness lounge</p>
          <p className={`m-0 mt-1.5 text-[12.5px] font-semibold leading-[1.4] ${INK_META}`}>Courtesy of your brand. Pick a time before the show.</p>
          <span className="mt-3.5 inline-flex h-8 items-center rounded-full bg-shortcut-coral px-3.5 text-[12.5px] font-bold text-white">Book my spot</span>
        </div>
      )}
      {step.visual === 'leads' && (
        <div className="w-full rounded-[18px] bg-white p-4 shadow-[0_12px_36px_rgba(3,34,50,.16)]">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#E2E9E8]">
            <span className="text-[13.5px] font-extrabold text-shortcut-blue">{leadsTitle}</span>
            <span className="h-6 inline-flex items-center px-2.5 rounded-full bg-[#EEF2F1] text-[10.5px] font-extrabold uppercase tracking-[.06em] text-[#45596A]">Example</span>
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
 *  The rail bleeds to the page edge (Apple style) and snaps to each card.
 *  In static mode (the PDF) the cards wrap into a grid instead. */
export function HowRail({ steps, confName, leadsTitle = 'Your sponsor’s leads' }: {
  steps: HowStep[]; confName: string; leadsTitle?: string;
}) {
  const ref = useRef<HTMLOListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [active, setActive] = useState(0);
  const isStatic = useSponsorStatic();

  const sync = () => {
    const el = ref.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('[data-slide]');
    const step = card ? card.offsetWidth + 20 : 1;
    const end = el.scrollLeft >= el.scrollWidth - el.clientWidth - 2;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(end);
    setActive(end ? steps.length - 1 : Math.round(el.scrollLeft / step));
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

  if (isStatic) {
    return (
      <ol className={`m-0 p-0 list-none grid gap-5 ${steps.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
        {steps.map((step) => (
          <li key={step.title} className="flex">
            <article className={`${CARD_SHELL} flex flex-1 flex-col overflow-hidden`}>
              <HowVisualBlock step={step} confName={confName} leadsTitle={leadsTitle} />
              <div className="flex flex-1 flex-col px-7 pt-6 pb-7">
                <p className={`m-0 text-[12px] font-extrabold uppercase tracking-[.09em] ${INK_META}`}>{step.label}</p>
                <h3 className="m-0 mt-2.5 text-[23px] font-bold leading-[1.15] tracking-[-.025em] text-shortcut-blue">{step.title}</h3>
                <p className={`m-0 mt-2.5 text-[15.5px] font-medium leading-[1.55] ${INK}`}>{step.body}</p>
              </div>
            </article>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <div>
      <div className="-mx-6 mdp:-mx-10 lgp:-mx-[100px]">
        <ol
          ref={ref}
          onScroll={sync}
          className="sp-rail m-0 list-none flex gap-5 overflow-x-auto snap-x snap-mandatory px-6 mdp:px-10 lgp:px-[100px] scroll-px-6 mdp:scroll-px-10 lgp:scroll-px-[100px] pb-4"
        >
          {steps.map((step) => (
            <li key={step.title} data-slide className="snap-start flex-none w-[82vw] smp:w-[380px] xlp:w-[400px] flex">
              <article className={`${CARD_SHELL} flex flex-1 flex-col overflow-hidden`}>
                <HowVisualBlock step={step} confName={confName} leadsTitle={leadsTitle} />
                <div className="flex flex-1 flex-col px-7 pt-6 pb-7">
                  <p className={`m-0 text-[12px] font-extrabold uppercase tracking-[.09em] ${INK_META}`}>
                    {step.label}
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
          {steps.map((step, i) => (
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
export function StationCard({ s, onOpen, body }: { s: SponsorServiceDef; onOpen: () => void; body?: string }) {
  const isStatic = useSponsorStatic();
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
        {!isStatic && (
          <span className="absolute right-3.5 top-3.5 z-[2] grid h-9 w-9 place-items-center rounded-full bg-white text-[24px] font-medium leading-none text-shortcut-blue shadow-[0_2px_10px_rgba(3,34,50,.18)] transition-transform duration-300 group-hover:scale-110">
            +
          </span>
        )}
      </span>
      <span className="flex flex-col gap-1.5 px-0.5 pt-[18px]">
        <span className="text-[20px] font-semibold leading-[1.2] tracking-[-.015em] text-shortcut-blue">{s.name}</span>
        <span className={`text-[14px] font-semibold leading-[1.4] ${INK_META}`}>{s.meta}</span>
        <span className={`mt-1 text-[15.5px] font-medium leading-[1.55] ${INK}`}>{body ?? s.body}</span>
      </span>
    </button>
  );
}

/* ── Hero ── */

/** The hero, laid out like the getshortcut.co holiday hero (shortcut repo,
 *  frontend/components/HolidayDesktop.vue): headline, line and buttons on
 *  the left; on the right a chip on top and the service pills at the
 *  bottom; the image module full width underneath. Pill motion is in
 *  src/styles/sponsor-page.css. */
export function SponsorHero({ title, accent, sub, primary, secondary, confName, dateLabel, image, caption, heroGo, pills = HERO_PILLS }: {
  title: string; accent: string; sub: string;
  primary: { label: string; href: string }; secondary: { label: string; href: string };
  confName: string; dateLabel?: string;
  image: { src: string; alt: string }; caption: string; heroGo: boolean;
  pills?: typeof HERO_PILLS;
}) {
  return (
    <section className="sp-hero relative overflow-hidden bg-shortcut-blue pt-14 mdp:pt-24 lgp:pt-[120px] pb-20 mdp:pb-28 lgp:pb-[146px]">
      <div className={`${GUT} ${COL} relative z-10`}>
        <div className="grid grid-cols-1 lgp:grid-cols-[minmax(0,1fr)_auto] gap-10 items-stretch">
          <div className="min-w-0">
            <h1 className="sp-rise [animation-delay:.05s] m-0 text-[40px] mdp:text-[56px] lgp:text-[64px] xlp:text-[72px] font-semibold leading-[1.02] tracking-[-.04em] text-white text-balance">
              {title}
              <span className="block text-shortcut-teal">{accent}</span>
            </h1>

            <p className="sp-rise [animation-delay:.12s] m-0 mt-8 text-[18px] mdp:text-[22px] font-medium leading-[1.5] text-white/[.88] max-w-[34ch] text-pretty">
              {sub}
            </p>

            <div data-pdf-hide className="sp-rise [animation-delay:.2s] mt-11 flex flex-wrap items-center gap-3.5">
              <a
                href={primary.href}
                className="h-[52px] inline-flex items-center px-[30px] rounded-full bg-shortcut-coral text-white text-[17px] font-bold tracking-[-.01em] whitespace-nowrap shadow-[0_4px_14px_rgba(255,80,80,.3)] transition-[transform,box-shadow] duration-300 hover:-translate-y-[3px] hover:shadow-[0_12px_30px_rgba(255,80,80,.42)]"
              >
                {primary.label}
              </a>
              <a
                href={secondary.href}
                className="text-[16px] font-bold text-white underline underline-offset-4 decoration-white/50 hover:text-shortcut-teal transition-colors"
              >
                {secondary.label}
              </a>
            </div>
          </div>

          <div className="flex flex-col items-start justify-between gap-7">
            <div className="sp-rise [animation-delay:.16s] lgp:pt-2.5">
              <span className="inline-flex flex-col items-start gap-2 smp:flex-row smp:items-center smp:gap-2.5 min-h-[38px] py-2 smp:py-[7px] pl-2 pr-4 smp:pr-[18px] rounded-[18px] smp:rounded-[22px] bg-[rgba(254,220,100,.14)] border border-[rgba(254,220,100,.5)] text-white text-[14px] font-bold tracking-[-.01em]">
                <span className="h-6 inline-flex flex-none items-center px-2.5 rounded-full bg-[#FEDC64] text-shortcut-blue text-[11px] font-extrabold tracking-[.07em] uppercase">
                  {confName}
                </span>
                {dateLabel && <span className="leading-[1.3] pl-1 smp:pl-0">{dateLabel}</span>}
              </span>
            </div>

            <div className={`hb-pile flex flex-col items-start gap-2 pb-0.5 ${heroGo ? 'hb-go' : ''}`} aria-label="Services">
              {pills.map((row, r) => (
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
          <div className="relative aspect-[4/3] mdp:aspect-[2/1] overflow-hidden rounded-[20px] bg-shortcut-teal">
            <img src={image.src} alt={image.alt} className="h-full w-full object-cover" />
            <span className="absolute left-[18px] bottom-[18px] h-10 inline-flex items-center rounded-full bg-white/[.94] px-4">
              <span className="text-[14px] font-extrabold tracking-[-.012em] text-shortcut-blue">
                {caption}
              </span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Step by step ── */

export interface PathStep { k: string; who: string; title: string; fill: string; ink: string; body: string }

/** The website's numbered step cards (shortcut/frontend/pages/solutions/
 *  conferences.vue, .sw-step), then the booking page and floor photos. */
export function StepByStep({ steps }: { steps: PathStep[] }) {
  return (
    <>
      <ol className="m-0 p-0 list-none grid grid-cols-1 smp:grid-cols-2 xlp:grid-cols-3 gap-5">
        {steps.map((p, i) => (
          <li
            key={p.title}
            className={`relative flex min-h-[240px] flex-col overflow-hidden ${CARD_R} px-7 mdp:px-8 pt-7 mdp:pt-8 pb-[104px]`}
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
            <span className="absolute bottom-7 left-7 mdp:left-8 inline-flex h-7 items-center rounded-full bg-white/90 px-3 text-[12px] font-extrabold text-shortcut-blue">
              {p.who}
            </span>
          </li>
        ))}
      </ol>

      <div className={`${FRAME} mt-5 shadow-[0_1px_2px_rgba(3,34,50,.05),0_10px_30px_rgba(3,34,50,.06)]`}>
        <div className="grid grid-cols-1 gap-3 mdp:gap-4 lgp:grid-cols-2">
          <Shot {...BRAND_SHOTS.booking} inset className="h-[300px] mdp:h-[440px] lgp:h-full lgp:min-h-[480px]" />
          <div className="grid grid-cols-1 gap-3 mdp:gap-4">
            {BRAND_SHOTS.side.map((sh) => (
              <Shot key={sh.cap} {...sh} className="h-[220px] mdp:h-[232px]" />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Proof, the TradeStation reel and the close ── */

/** Workhuman Live 2026, exactly as on the live page (origin/main, #9).
 *  `sub` lets the sponsor deck name Shortcut where the partner page says we. */
export function ProofPanel({ sub = 'We ran the wellness zone with five massage chairs, fully booked all three days.' }: { sub?: string }) {
  return (
    <Panel id="proof" tone="navy">
      <SectionHead
        dark
        kicker="Proof"
        title="Workhuman Live 2026."
        accent="A three-day HR conference."
        sub={sub}
      />
      <div className="grid grid-cols-3 gap-3 mdp:gap-5">
        {PROOF_STATS.map((st) => (
          <div key={st.label} className="rounded-[20px] mdp:rounded-[28px] bg-white/[.06] border border-white/10 px-2 py-5 mdp:p-8 text-center">
            <div className="text-[30px] smp:text-[44px] mdp:text-[64px] font-bold leading-none tracking-[-.04em] text-shortcut-teal tabular-nums">
              {st.fig}
            </div>
            <div className="mt-2 mdp:mt-3 text-[13px] mdp:text-[17px] font-medium leading-[1.35] mdp:leading-[1.45] text-white/85">{st.label}</div>
          </div>
        ))}
      </div>
      <div className={`${FRAME} mt-5 shadow-[0_30px_70px_rgba(0,0,0,.25)]`}>
        <div className="grid grid-cols-2 gap-3 mdp:gap-4 mdp:grid-cols-[1.25fr_1fr_1fr]">
          {PROOF_GALLERY.map((g, i) => (
            <Shot key={g.cap} cap={g.cap} img={g.img} pos="center 30%" className={`${i === 0 ? 'col-span-2 mdp:col-span-1 h-[260px]' : 'h-[240px]'} mdp:h-[440px]`} />
          ))}
        </div>
      </div>
    </Panel>
  );
}

/** A branded event day, on video. */
export function TradeStationPanel({ sub = 'Haircuts and styling under TradeStation’s own signage, run by our team.' }: { sub?: string }) {
  return (
    <Panel tone="tint">
      <SectionHead
        kicker="TradeStation"
        title="A branded event day, start to finish."
        sub={sub}
      />
      <SizzleReel />
    </Panel>
  );
}

/** The close: a heading, three numbered cards, the call to action and a
 *  footer line. */
export function NextStepsPanel({ title, steps, cta, footer }: {
  title: string; steps: string[]; cta: React.ReactNode; footer: React.ReactNode;
}) {
  return (
    <section className="relative -mt-[50px] rounded-t-[50px] bg-shortcut-blue py-16 mdp:py-24">
      <div data-toc id="next" className="absolute -top-20" />
      <div className={`${GUT} ${COL}`}>
        <div className="flex flex-col items-center text-center gap-3.5">
          <p className="m-0 text-[12px] font-extrabold uppercase tracking-[.09em] text-shortcut-teal">Next steps</p>
          <h2 className="m-0 text-[30px] mdp:text-[44px] font-bold leading-[1.05] tracking-[-.035em] text-white max-w-[22ch] text-balance">
            {title}
          </h2>
        </div>
        <ol className="m-0 mt-12 p-0 list-none grid grid-cols-1 mdp:grid-cols-3 gap-5">
          {steps.map((step, i) => (
            <li key={step} className="rounded-[28px] bg-white/[.08] border border-white/[.12] p-7 flex flex-col gap-4">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-shortcut-teal text-[16px] font-extrabold text-shortcut-blue">{i + 1}</span>
              <h3 className="m-0 text-[20px] mdp:text-[22px] font-bold leading-[1.2] tracking-[-.02em] text-white text-balance">{step}</h3>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex justify-center">{cta}</div>
        <div className="mt-12 pt-8 border-t border-white/15 text-center">
          <div className="text-[11px] font-bold uppercase tracking-[.12em] text-white/40">
            {footer}
          </div>
        </div>
      </div>
    </section>
  );
}
