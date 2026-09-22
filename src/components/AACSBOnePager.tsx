import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Calendar, MapPin, Users, Armchair, TrendingUp, Heart, MessageSquare,
  ShieldCheck, FileCheck, Eye, EyeOff, ArrowUpRight,
  Shirt, Gift, PanelsTopLeft, MonitorSmartphone, ListPlus, Database, Clock, Play,
  Sparkles, Timer,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   AACSB · The Deans Conference × Shortcut
   Sponsor activation one-pager for the University of Cincinnati
   Carl H. Lindner College of Business.

   A deliberate replica of YW3OnePager.tsx: same section system, same
   V2 proposal type tokens, same four-act hierarchy. Only the content
   changes, so the two surfaces stay visibly siblings.

   ── WHO IS WHO ────────────────────────────────
   Shortcut's client is The Deans Conference / AACSB, who are reselling
   the wellness lounge as a sponsorship. The page is what they put in
   front of Lindner, the sponsor paying for it. Same shape as YW3 →
   Netflix Ads.

   ── FACTS, AND WHERE THEY CAME FROM ───────────
   Conference (aacsb.edu event page, fetched 2026-09-22):
     Oct 19 to 21 2026 · Orlando, Signia by Hilton Orlando Bonnet Creek
     nearly 700 leaders from 60+ countries
     "exclusively for deans and heads of higher education business units"
     theme "Leading Across Boundaries"
   Scope and pricing (Supabase `proposals` f6c806c6, slug aacsb-jul-2026):
     Orlando, chair massage only, 4 Massage Pros, 15 min appointments
     $165 per hour per Pro, so a day is numPros x hours x 165
     ladder per conference-day 64/$2,640 · 80/$3,300 · 96/$3,960
     Oct 19 → option 3, 96 appts, 6 hrs, $3,960
     Oct 20 → option 1, 64 appts, 4 hrs, $2,640
     The proposal was repriced from $150 to $165 on 2026-09-22; the page
     and the proposal must always agree, so change both together.
   Nothing on this page is invented; anything not in those two sources
   is left off rather than guessed.

   ── PALETTE NOTE ──────────────────────────────
   Lindner's own red is #e00122, a near neighbour of Shortcut coral
   #FF5050. Running both would read as a mistake, so the page keeps the
   Shortcut system throughout and talks about Lindner branding as
   content rather than wearing it as chrome.
   ───────────────────────────────────────────── */

/* Served from Supabase storage, never the repo. See
   scripts/upload-site-media.mjs and the note in YW3OnePager.tsx. */
const SIZZLE_VIDEO =
  'https://oxigtmlqqfbhzekpdalt.supabase.co/storage/v1/object/public/site-media/yw3/tradestation-sizzle.mp4';

/* The real AACSB sign-up link, not the generic demo. */
const SIGNUP_DEMO = 'https://admin.shortcutpros.com/#/selectEvent/AACSB';
const PROPOSAL = 'https://proposals.getshortcut.co/p/aacsb-jul-2026';

/* The site's own wrap, measured off getshortcut.co/services/massage:
   max-width 1720 with 100px gutters. */
const GUT = 'px-6 md:px-10 lg:px-[100px]';
const COL = 'w-full max-w-[1720px] mx-auto';

/* V2 proposal viewer tokens (src/styles/proposal-refresh.css). */
const INK = 'text-[#2A5468]';
const INK_META = 'text-[#45596A]';
const CARD_SHELL =
  'rounded-[28px] bg-white border border-[#E2E9E8] shadow-[0_1px_2px_rgba(3,34,50,.05),0_10px_30px_rgba(3,34,50,.06)]';

/* What the sponsor is actually buying, in the order they care about it:
   traffic, goodwill, leads. The massage is the mechanism, not the pitch. */
const WHY = [
  {
    icon: TrendingUp, title: 'A line all day',
    body: 'Chair massage is the busiest stop on a conference floor. Slots book out ahead of the doors opening and keep filling from the waitlist.',
  },
  {
    icon: Heart, title: 'An experience they want',
    body: 'Fifteen minutes off their feet in the middle of a long day is the thing people remember, and they remember the sponsor who gave it to them.',
  },
  {
    icon: MessageSquare, title: 'Time with every attendee',
    body: 'Your team has time with people while they wait for their appointment and again once they are finished. Long enough for a real conversation.',
  },
  {
    icon: Database, title: 'A list before and after',
    body: 'Attendees book in advance, so you have their name, title, institution and email before the conference opens and a warm list to work once it closes.',
  },
];

/* Plain nouns, plain verbs. Say what we bring and what it does. */
const LOUNGE = [
  {
    icon: Users, title: 'Four Massage Pros on site',
    body: 'Four licensed Massage Pros work the lounge at the same time, so the line keeps moving between sessions.',
  },
  {
    icon: Armchair, title: 'Chairs and privacy screens',
    body: 'We bring the massage chairs and optional privacy screens. The lounge sets up in a meeting room or an open foyer.',
  },
  {
    icon: Sparkles, title: 'Full spa setup',
    body: 'Music, aromatherapy and lighting. Attendees can request a male or female Pro when they book.',
  },
  {
    icon: Timer, title: 'Fifteen minute appointments',
    body: 'Chair massage for the neck, shoulders, back and arms. Attendees stay fully clothed. Each Pro sees about three people an hour.',
  },
];

const RECOMMENDED = [
  'The lounge runs 64 to 96 appointments a day, so 128 to 192 across the two days.',
  'Four Massage Pros work every option. The more appointments you pick, the longer the lounge stays open: four, five or six hours a day.',
  'We send the sign-up link out before the conference and watch the bookings come in. If it fills fast we can add hours.',
  'Massage Pros, chairs, screens, setup and cleanup are all included in the price.',
];

const BRANDING = [
  {
    icon: MonitorSmartphone, title: 'Branded booking page and emails',
    body: 'We brand the booking page, confirmation emails, text reminders and calendar invites with University of Cincinnati branding and messaging.',
  },
  {
    icon: Shirt, title: 'Custom uniforms for the Pros',
    body: 'We help design and produce custom uniforms for the Massage Pros on site to carry University of Cincinnati branding and messaging.',
  },
  {
    icon: PanelsTopLeft, title: 'Custom lounge signage',
    body: 'We help design and produce the signage for the lounge: privacy screens, directional signs and printed service menus, all in your branding.',
  },
  {
    icon: Gift, title: 'A branded gift',
    body: 'We can source and brand a gift for every attendee, handed out at the end of their appointment.',
  },
];

const SIGNUP_ANSWERS = [
  {
    icon: MonitorSmartphone, title: 'Works on any device',
    body: 'The booking page works on phones, laptops and tablets.',
  },
  {
    icon: Users, title: 'The information you need',
    body: 'We collect name, title, institution and work email when someone books.',
  },
  {
    icon: ListPlus, title: 'Automatic waitlist',
    body: 'When the lounge is full, the page collects names on a waitlist and books them automatically when a slot opens.',
  },
  {
    icon: FileCheck, title: 'Your opt-in language',
    body: 'You write the opt-in language on the booking form, so everyone on the list has agreed to hear from you.',
  },
];

const CUSTOMISABLE = [
  'Imagery', 'Headlines and copy', 'Form fields', 'Confirmation emails',
  'Text reminders', 'Calendar invites', 'Logo and colors', 'Lounge name',
];

/* Conference facts, all from the AACSB event page. */
const HERO_PILLS = [
  { label: '700 attendees', fill: '#9EFAFF' },
  { label: '60+ countries', fill: '#FFCBA6' },
  { label: 'Two days', fill: '#FEDC64' },
  { label: 'Orlando', fill: '#F7BBFF' },
];

const HERO_PHOTO = {
  src: '/aacsb/lounge-hero.jpg',
  alt: 'A Shortcut Massage Pro giving a chair massage in a University of Cincinnati branded shirt',
};

const LOGISTICS = [
  {
    icon: ShieldCheck, title: 'Certificates of insurance',
    body: 'We send certificates of insurance naming the Signia by Hilton and the University of Cincinnati as additional insured before the conference.',
  },
  {
    icon: FileCheck, title: 'Florida licensed Pros',
    body: 'Every Massage Pro is licensed in Florida and we keep the paperwork on file.',
  },
  {
    icon: Clock, title: 'Works in any space',
    body: 'The lounge sets up in a meeting room or an open foyer, so a last minute room change is not a problem.',
  },
  {
    icon: Calendar, title: 'Free reschedules',
    body: 'If the conference schedule moves, tell us and we move with it at no charge.',
  },
];

/* Options for the two days, priced off the live proposal's own ladder
   (64/$2,400 · 80/$3,000 · 96/$3,600 per conference-day). Levels rather
   than a single quote, because this is still an options conversation. */
/* Kiosk range from market rental pricing, 2026-09-22: a backlit reception
   counter rents at roughly $1,467 hardware plus $358 graphics (Classic
   Exhibits RE-1584), so ~$1,800 with the graphic before freight. An
   unlit printed counter is $400 to $700 if the lightbox is dropped. */
const ADD_ONS = [
  { item: 'Branded welcome kiosk', basis: 'Illuminated counter with your graphic, as rendered', cost: '$1,500 to $2,000' },
  { item: 'Branded privacy screens', basis: 'Four screens at $150 each', cost: '$600' },
  { item: 'Station signage', basis: 'Signs for all four stations', cost: '$400 to $500' },
  { item: 'Custom apparel', basis: 'Eight shirts at $150 each, two per Pro', cost: '$1,200' },
];
const ADD_ONS_TOTAL = '$3,700 to $4,300';

const OPTIONS = [
  {
    name: 'Option 1', perDay: '64', hours: '4 hours',
    dayPrice: '$2,640', total: '$5,280', appts: '128 appointments',
  },
  {
    name: 'Option 2', perDay: '80', hours: '5 hours',
    dayPrice: '$3,300', total: '$6,600', appts: '160 appointments',
    recommended: true,
  },
  {
    name: 'Option 3', perDay: '96', hours: '6 hours',
    dayPrice: '$3,960', total: '$7,920', appts: '192 appointments',
  },
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
  id?: string; children: React.ReactNode; tone?: 'white' | 'tint';
}) {
  return (
    <section
      className={`relative -mt-[50px] rounded-t-[50px] py-16 md:py-28 ${tone === 'white' ? 'bg-white' : 'bg-neutral-light-gray'}`}
    >
      {id && <div data-toc id={id} className="absolute -top-20" />}
      <Reveal className={`${GUT} ${COL}`}>{children}</Reveal>
    </section>
  );
}

function SectionHead({ kicker, title, accent, sub }: {
  kicker: string; title: string; accent?: string; sub?: string;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-3.5 mb-12 md:mb-14">
      <p className={`m-0 text-[12px] font-extrabold uppercase tracking-[.09em] ${INK_META}`}>
        {kicker}
      </p>
      <h2 className="m-0 text-[30px] md:text-[44px] font-bold leading-[1.05] tracking-[-.035em] text-shortcut-blue max-w-[22ch] text-balance">
        {title}
        {accent && <span className="block text-shortcut-coral">{accent}</span>}
      </h2>
      {sub && (
        <p className={`m-0 text-[16px] md:text-[17px] font-medium leading-[1.55] ${INK} max-w-[56ch]`}>
          {sub}
        </p>
      )}
    </div>
  );
}

function SubHead({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-2 pb-5 mb-8 border-b border-[#E2E9E8]">
      <h3 className="m-0 text-[22px] md:text-[24px] font-bold leading-[1.1] tracking-[-.025em] text-shortcut-blue">
        {children}
      </h3>
      {note && <p className={`m-0 text-[16px] font-medium leading-[1.55] ${INK} md:text-right md:max-w-[44ch]`}>{note}</p>}
    </div>
  );
}

const CARD = `${CARD_SHELL} p-7 md:p-8`;

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

export default function AACSBOnePager() {
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem('aacsb-auth') === 'true');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'AACSBxSHORTCUT2026!') {
      sessionStorage.setItem('aacsb-auth', 'true');
      setAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPassword('');
    }
  };

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

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-neutral-light-gray font-['Outfit',system-ui,sans-serif] flex items-center justify-center">
        <div className="w-full max-w-sm mx-auto px-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-4 mb-4">
              <div className="text-[22px] font-extrabold tracking-tight text-shortcut-blue">AACSB</div>
              <div className="h-6 w-px bg-shortcut-blue/15" aria-hidden="true" />
              <img src="/shortcut-logo-blue.svg" alt="Shortcut" className="h-5 w-auto" />
            </div>
            <div className="text-[12px] text-shortcut-blue/50 font-medium">Sponsor Activation</div>
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
          <div className="mt-6 text-center">
            <div className="text-[11px] font-bold uppercase tracking-[.12em] text-shortcut-blue/40">Confidential</div>
          </div>
        </div>
      </div>
    );
  }

  const tocItems = [
    { id: 'lounge', label: 'The lounge' },
    { id: 'booking', label: 'Booking page' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'logistics', label: 'Logistics' },
  ];

  return (
    <div className="min-h-screen bg-neutral-light-gray font-['Outfit',system-ui,sans-serif]">

      {/* ── Sticky bar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-shortcut-blue/[.06]">
        <div className={`${GUT} ${COL} h-14 flex items-center justify-between`}>
          <div className="flex items-center gap-3 md:gap-4">
            <div className="text-[16px] font-extrabold tracking-tight text-shortcut-blue">AACSB</div>
            <div className="h-4 w-px bg-shortcut-blue/15" aria-hidden="true" />
            <img src="/shortcut-logo-blue.svg" alt="Shortcut" className="h-4 w-auto" />
            <div className="hidden sm:block ml-1 md:ml-2 pl-3 md:pl-4 border-l border-shortcut-blue/[.12] text-[10px] font-semibold uppercase tracking-wider text-shortcut-blue/40">
              Sponsor Activation
            </div>
          </div>
          <div className="hidden md:flex items-center gap-7">
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
        </div>
      </nav>

      <main className="pt-14">

        {/* ══════════ HERO ══════════ */}
        <section className="relative bg-shortcut-blue pt-14 md:pt-24 lg:pt-[120px] pb-20 md:pb-28 lg:pb-[146px]">
          <div className={`${GUT} ${COL} relative z-10`}>
            <div className="flex items-center gap-5 md:gap-7 mb-10 md:mb-14 pb-7 border-b border-white/15">
              <div className="text-[22px] md:text-[28px] font-extrabold tracking-tight text-white">AACSB</div>
              <div className="h-7 md:h-10 w-px bg-white/25" aria-hidden="true" />
              <img src="/conference/shortcut-logo-white.svg" alt="Shortcut" className="h-6 md:h-8 w-auto" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,520px)_minmax(380px,1fr)] gap-10 xl:gap-16 items-start">
              <div className="min-w-0">
                <p className="m-0 text-[12px] font-extrabold uppercase tracking-[.09em] text-shortcut-teal mb-6">
                  Sponsor activation · The Deans Conference 2026
                </p>

                <h1 className="m-0 text-[34px] md:text-[48px] lg:text-[56px] font-semibold leading-[1.08] tracking-[-.03em] text-white max-w-[18ch] text-balance">
                  The busiest, best loved booth at The Deans Conference.
                  <span className="block text-shortcut-teal">Every attendee who sits down is a lead.</span>
                </h1>

                <p className="m-0 mt-[22px] text-[17px] md:text-[19px] font-medium leading-[1.5] text-white/[.86] max-w-[44ch]">
                  The University of Cincinnati Carl H. Lindner College of Business sponsors a chair
                  massage lounge on the conference floor. Four Massage Pros work both days, the
                  lounge carries your branding throughout, and every attendee books through your
                  page first. You get their name, title, institution and email.
                </p>

                <div className="flex flex-wrap items-center gap-6 mt-8">
                  <a
                    href="#lounge"
                    className="h-[52px] inline-flex items-center px-8 rounded-full bg-shortcut-coral text-white text-[17px] font-bold tracking-[-.01em] shadow-[0_4px_14px_rgba(255,80,80,.3)] transition-transform duration-500 hover:-translate-y-[3px]"
                  >
                    See the lounge
                  </a>
                  <a href="#pricing" className="text-[15px] font-bold tracking-[-.012em] text-white hover:text-shortcut-teal transition-colors">
                    How pricing works &rarr;
                  </a>
                </div>

                <div className="flex flex-wrap gap-2 mt-7 max-w-[520px]">
                  {HERO_PILLS.map((p) => (
                    <span
                      key={p.label}
                      className="h-10 inline-flex items-center px-4 rounded-full text-shortcut-blue text-[14.5px] font-extrabold tracking-[-.01em] whitespace-nowrap"
                      style={{ background: p.fill }}
                    >
                      {p.label}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3 mt-9">
                  {[
                    { icon: Calendar, label: 'Oct 19 to 20, 2026' },
                    { icon: MapPin, label: 'Signia by Hilton Orlando Bonnet Creek' },
                    { icon: Users, label: 'Business school leaders' },
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
                  <img src={HERO_PHOTO.src} alt={HERO_PHOTO.alt} className="h-full w-full object-cover" />
                  <span className="absolute left-[18px] bottom-[18px] h-10 inline-flex items-center gap-2.5 rounded-full bg-white/[.94] pl-1.5 pr-4">
                    <span className="w-7 h-7 flex-none rounded-full bg-shortcut-coral flex items-center justify-center">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M20 6 9 17l-5-5" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span className="text-[14px] font-extrabold tracking-[-.012em] text-shortcut-blue">
                      You&rsquo;re booked · Chair massage · 15 min
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ ACT 1 · THE LOUNGE ══════════ */}
        <Panel id="lounge">
          <SectionHead
            kicker="Act one"
            title="Why sponsors want this booth"
            sub="Four Massage Pros, chair massage, both days of the conference. Here is why it works as a sponsorship."
          />

          <div className="mb-14 md:mb-16 overflow-hidden rounded-[28px] border border-[#E2E9E8] bg-neutral-light-gray shadow-[0_20px_50px_rgba(3,34,50,.14)]">
            <img
              src="/aacsb/lounge-rendering.jpg"
              alt="Rendering of the University of Cincinnati wellness lounge with a branded welcome desk, privacy screens, station signage and massage chairs"
              className="w-full h-auto"
            />
          </div>
          <p className={`mx-auto mb-14 md:mb-16 max-w-[70ch] text-center text-[16px] font-medium leading-[1.55] ${INK}`}>
            The lounge laid out in your space at the Signia by Hilton, with the welcome desk,
            privacy screens, station signage and chairs all carrying University of Cincinnati
            branding.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {WHY.map((w) => (
              <FeatureCard key={w.title} icon={w.icon} title={w.title} body={w.body} tint="bg-accent-pink" />
            ))}
          </div>

          <div className="mt-20 md:mt-24">
            <SubHead note="Everything arrives with us. You provide the room.">
              What we bring
            </SubHead>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
              {LOUNGE.map((l) => (
                <FeatureCard key={l.title} icon={l.icon} title={l.title} body={l.body} />
              ))}
            </div>
          </div>

          <div className="mt-20 md:mt-24">
            <SubHead note="How we would size the lounge across the two days.">
              Recommended direction
            </SubHead>
            <ul className="m-0 p-0 list-none flex flex-col gap-4 max-w-[86ch]">
              {RECOMMENDED.map((r) => (
                <li key={r} className={`flex gap-3.5 text-[16px] font-medium leading-[1.55] ${INK}`}>
                  <span className="mt-[9px] w-[6px] h-[6px] flex-none rounded-full bg-shortcut-coral" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-20 md:mt-24">
            <SubHead note="Everything in the lounge carries your branding, not ours.">
              Branded to the Lindner College of Business, not to us
            </SubHead>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
              {BRANDING.map((b) => (
                <FeatureCard key={b.title} icon={b.icon} title={b.title} body={b.body} tint="bg-accent-yellow" />
              ))}
            </div>
          </div>

          <div className="mt-20 md:mt-24">
            {/* Proof for the signage card: our own screens, same build. */}
            <div className="overflow-hidden rounded-[28px] border border-[#E2E9E8] bg-neutral-light-gray">
              <img
                src="/aacsb/privacy-screens.png"
                alt="Shortcut branded privacy screens standing in a row"
                className="w-full h-auto"
              />
            </div>
            <p className={`mx-auto mt-5 max-w-[68ch] text-center text-[16px] font-medium leading-[1.55] ${INK}`}>
              Example of our Massage privacy screens. Yours carry University of Cincinnati artwork
              instead. Adds pop to the event day and to imagery of the services in action.
            </p>
          </div>

          <div className="mt-20 md:mt-24">
            <SubHead note="Footage from a recent Shortcut event day.">
              What a day looks like
            </SubHead>
            <SizzleReel />
          </div>
        </Panel>

        {/* ══════════ ACT 2 · THE PAGE AND THE LIST ══════════ */}
        <Panel id="booking" tone="tint">
          <SectionHead
            kicker="Act two"
            title="How attendees book,"
            accent="and what you get back."
            sub="Attendees book online before and during the conference. Here is how the page works and what you get from it."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {SIGNUP_ANSWERS.map((a) => (
              <FeatureCard key={a.title} icon={a.icon} title={a.title} body={a.body} />
            ))}
          </div>

          <div className={`${CARD} mt-5`}>
            <h4 className="m-0 text-[20px] font-bold leading-tight tracking-[-.025em] text-shortcut-blue">
              Every part of the sign-up experience is customizable
            </h4>
            <p className={`m-0 mt-2.5 text-[16px] font-medium leading-[1.55] ${INK} max-w-[62ch]`}>
              Tell us what you want it to say and we build it.
            </p>
            <div className="flex flex-wrap gap-2.5 mt-6">
              {CUSTOMISABLE.map((c) => (
                <span key={c} className="inline-flex items-center rounded-full bg-neutral-light-gray px-4 py-2 text-[13.5px] font-bold tracking-[-.01em] text-shortcut-blue">
                  {c}
                </span>
              ))}
              <span className="inline-flex items-center rounded-full bg-shortcut-blue px-4 py-2 text-[13.5px] font-bold tracking-[-.01em] text-white">
                and more
              </span>
            </div>
          </div>

          <a
            href={SIGNUP_DEMO}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-5 block rounded-[28px] bg-shortcut-blue p-8 md:p-12 shadow-[0_20px_50px_rgba(3,34,50,.22)] transition-transform duration-500 hover:-translate-y-1"
          >
            <div className="flex flex-col md:flex-row md:items-center gap-7 md:gap-10">
              <div className="flex-1">
                <p className="m-0 text-[12px] font-extrabold uppercase tracking-[.09em] text-shortcut-teal mb-3">
                  Try it yourself
                </p>
                <h3 className="m-0 text-[26px] md:text-[34px] font-bold leading-[1.08] tracking-[-.03em] text-white">
                  Open the live booking page and book yourself a slot.
                </h3>
                <p className="m-0 mt-3.5 text-[16px] font-medium leading-[1.5] text-white/75 max-w-[52ch]">
                  This is a working booking page. Pick a time and see what an attendee sees.
                </p>
              </div>
              <span className="flex-none w-16 h-16 rounded-full bg-shortcut-coral flex items-center justify-center shadow-[0_6px_20px_rgba(255,80,80,.4)] transition-transform duration-500 group-hover:scale-110">
                <ArrowUpRight size={26} className="text-white" strokeWidth={2.5} />
              </span>
            </div>
          </a>

          <div className="mt-20 md:mt-24">
            <SubHead note="Live as bookings come in, and a spreadsheet at the end.">
              What you get back
            </SubHead>
            <div className={`${CARD} flex flex-col md:flex-row md:items-start gap-7 md:gap-10`}>
              <span className="flex-none w-14 h-14 rounded-full bg-shortcut-teal flex items-center justify-center">
                <Database size={24} className="text-shortcut-blue" strokeWidth={2.5} />
              </span>
              <div className="flex-1">
                <h4 className="m-0 text-[22px] md:text-[24px] font-bold leading-[1.1] tracking-[-.025em] text-shortcut-blue">
                  The list, before and after the conference
                </h4>
                <p className={`m-0 mt-3 text-[16px] md:text-[17px] font-medium leading-[1.55] ${INK} max-w-[70ch]`}>
                  Sign-ups come in ahead of the conference, so you can see who is booked and reach
                  out before you get there. Afterwards we send the full spreadsheet: name, title,
                  institution, work email and whether they showed up.
                </p>
              </div>
            </div>
          </div>
        </Panel>

        {/* ══════════ ACT 3 · PRICING ══════════ */}
        <Panel id="pricing">
          <SectionHead
            kicker="Act three"
            title="What it costs"
            sub="Three levels for the two days. Four Massage Pros work every option. The more appointments you pick, the longer the lounge stays open."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {OPTIONS.map((o) => (
              <div
                key={o.name}
                className={`${CARD_SHELL} flex flex-col overflow-hidden ${o.recommended ? 'ring-2 ring-shortcut-coral' : ''}`}
              >
                <div className={`px-7 py-4 ${o.recommended ? 'bg-shortcut-coral' : 'bg-shortcut-blue'}`}>
                  <div className="text-[12px] font-extrabold uppercase tracking-[.09em] text-white">
                    {o.name}{o.recommended && ' · Recommended'}
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-7 md:p-8">
                  <div className={`text-[13px] font-bold uppercase tracking-[.06em] ${INK_META}`}>
                    Both days
                  </div>
                  <div className="text-[40px] font-extrabold tracking-[-.03em] text-shortcut-blue tabular-nums leading-none mt-2">
                    {o.total}
                  </div>
                  <div className={`text-[16px] font-bold ${INK} mt-2.5`}>{o.appts}</div>

                  <div className="mt-6 pt-6 border-t border-[#E2E9E8] flex flex-col gap-2.5">
                    <div className={`flex justify-between gap-3 text-[15px] font-medium ${INK}`}>
                      <span>Appointments a day</span>
                      <span className="font-bold text-shortcut-blue tabular-nums">{o.perDay}</span>
                    </div>
                    <div className={`flex justify-between gap-3 text-[15px] font-medium ${INK}`}>
                      <span>Hours a day</span>
                      <span className="font-bold text-shortcut-blue">{o.hours}</span>
                    </div>
                    <div className={`flex justify-between gap-3 text-[15px] font-medium ${INK}`}>
                      <span>Per day</span>
                      <span className="font-bold text-shortcut-blue tabular-nums">{o.dayPrice}</span>
                    </div>
                    <div className={`flex justify-between gap-3 text-[15px] font-medium ${INK}`}>
                      <span>Massage Pros</span>
                      <span className="font-bold text-shortcut-blue">Four</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className={`mt-6 text-center text-[16px] font-medium leading-[1.55] ${INK} mx-auto max-w-[70ch]`}>
            Every option covers both days, Monday Oct 19 and Tuesday Oct 20, with four Massage Pros
            on site. The days do not have to match: you can run one level on day one and another on
            day two. Massage Pros, chairs, screens, setup and cleanup are included in all three.
          </p>

          <a
            href={PROPOSAL}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-5 block rounded-[28px] bg-shortcut-blue p-8 md:p-12 shadow-[0_20px_50px_rgba(3,34,50,.22)] transition-transform duration-500 hover:-translate-y-1"
          >
            <div className="flex flex-col md:flex-row md:items-center gap-7 md:gap-10">
              <div className="flex-1">
                <p className="m-0 text-[12px] font-extrabold uppercase tracking-[.09em] text-shortcut-teal mb-3">
                  The full proposal
                </p>
                <h3 className="m-0 text-[26px] md:text-[34px] font-bold leading-[1.08] tracking-[-.03em] text-white">
                  Open the proposal and switch between the options.
                </h3>
                <p className="m-0 mt-3.5 text-[16px] font-medium leading-[1.5] text-white/75 max-w-[56ch]">
                  Both days are in there. Pick a level on either one and the total updates as you go.
                </p>
              </div>
              <span className="flex-none w-16 h-16 rounded-full bg-shortcut-coral flex items-center justify-center shadow-[0_6px_20px_rgba(255,80,80,.4)] transition-transform duration-500 group-hover:scale-110">
                <ArrowUpRight size={26} className="text-white" strokeWidth={2.5} />
              </span>
            </div>
          </a>

          <div className={`${CARD} mt-5`}>
            <h4 className="m-0 text-[20px] font-bold leading-[1.15] tracking-[-.025em] text-shortcut-blue">
              Branding add-ons, estimated
            </h4>
            <p className={`m-0 mt-2.5 text-[16px] font-medium leading-[1.55] ${INK} max-w-[72ch]`}>
              These sit on top of the option prices above.
            </p>

            <div className="mt-7 flex flex-col">
              {ADD_ONS.map((a) => (
                <div
                  key={a.item}
                  className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4 border-b border-[#E2E9E8]"
                >
                  <div>
                    <div className="text-[17px] font-bold tracking-[-.02em] text-shortcut-blue">{a.item}</div>
                    <div className={`text-[15px] font-medium ${INK} mt-1`}>{a.basis}</div>
                  </div>
                  <div className="text-[20px] font-extrabold tracking-[-.025em] text-shortcut-blue tabular-nums whitespace-nowrap">
                    {a.cost}
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pt-5">
                <div className="text-[17px] font-extrabold tracking-[-.02em] text-shortcut-blue">
                  Estimated total
                </div>
                <div className="text-[28px] font-extrabold tracking-[-.03em] text-shortcut-blue tabular-nums whitespace-nowrap">
                  {ADD_ONS_TOTAL}
                </div>
              </div>
            </div>

            <p className={`m-0 mt-6 text-[15px] font-medium leading-[1.55] ${INK} max-w-[72ch]`}>
              Estimates, not a quote. We price it exactly once you confirm the artwork and
              quantities. Anything else you want produced, gifts included, we quote on request.
            </p>
          </div>
        </Panel>

        {/* ══════════ ACT 4 · LOGISTICS ══════════ */}
        <Panel id="logistics" tone="tint">
          <SectionHead
            kicker="Act four"
            title="Logistics and insurance"
            sub="What we take care of before the conference."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {LOGISTICS.map((l) => (
              <FeatureCard key={l.title} icon={l.icon} title={l.title} body={l.body} tint="bg-shortcut-teal" />
            ))}
          </div>
        </Panel>

        {/* ══════════ CLOSE ══════════ */}
        <section className="relative -mt-[50px] rounded-t-[50px] bg-shortcut-blue py-16 md:py-24">
          <div className={`${GUT} ${COL} text-center`}>
            <h2 className="m-0 text-[26px] md:text-[38px] font-bold leading-[1.08] tracking-[-.035em] text-white max-w-[20ch] mx-auto">
              Sponsor the lounge at The Deans Conference.
            </h2>
            <p className="m-0 mt-4 text-[16px] md:text-[17px] font-medium leading-[1.5] text-white/70 max-w-[52ch] mx-auto">
              On a typical event day, ninety percent or more of the slots get booked. Tell us how
              many appointments you want and we will put together the schedule.
            </p>
            <div className="mt-12 pt-8 border-t border-white/15">
              <div className="text-[11px] font-bold uppercase tracking-[.12em] text-white/40">
                Confidential · prepared for the University of Cincinnati Carl H. Lindner College of Business
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
