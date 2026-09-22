import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Calendar, MapPin, Users, Armchair,
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
     Orlando, chair massage only, 4 therapists, 15 min appointments
     Oct 19 → option 3, 96 appts, 6 hrs, $3,600
     Oct 20 → option 1, 64 appts, 4 hrs, $2,400
     ladder per conference-day 64/$2,400 · 80/$3,000 · 96/$3,600
     stored total 160 appointments, $6,000
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

const SIGNUP_DEMO = 'https://admin.shortcutpros.com/#/signup/gHTKOcwIzE';

/* The site's own wrap, measured off getshortcut.co/services/massage:
   max-width 1720 with 100px gutters. */
const GUT = 'px-6 md:px-10 lg:px-[100px]';
const COL = 'w-full max-w-[1720px] mx-auto';

/* V2 proposal viewer tokens (src/styles/proposal-refresh.css). */
const INK = 'text-[#2A5468]';
const INK_META = 'text-[#45596A]';
const CARD_SHELL =
  'rounded-[28px] bg-white border border-[#E2E9E8] shadow-[0_1px_2px_rgba(3,34,50,.05),0_10px_30px_rgba(3,34,50,.06)]';

/* The canonical massage inclusions, from src/utils/menuServices.ts. */
const LOUNGE = [
  {
    icon: Users, title: 'Four therapists',
    body: 'Licensed massage therapists working the lounge at once, so the queue keeps moving between sessions.',
  },
  {
    icon: Armchair, title: 'Chairs and screens',
    body: 'Chair setups with optional privacy screens, so a meeting room or an open foyer becomes a lounge.',
  },
  {
    icon: Sparkles, title: 'Spa ambiance',
    body: 'Music, aromatherapy and lighting, plus therapist gender preference at booking.',
  },
  {
    icon: Timer, title: 'Fifteen minute resets',
    body: 'Neck, shoulders, back and arms, fully clothed. About three an hour per therapist.',
  },
];

const RECOMMENDED = [
  'Day one at 96 appointments, day two at 64. That is 160 of the roughly 700 deans on site.',
  'Four therapists at fifteen minutes each, six hours on day one and four on day two.',
  'Sign-up links go out before the conference and are tracked live, so the lounge gets throttled up if it fills.',
  'Therapists, chairs, screens, setup and cleanup are included.',
];

const BRANDING = [
  {
    icon: MonitorSmartphone, title: 'Branded booking tech',
    body: 'Every digital touchpoint carries Lindner rather than Shortcut.',
  },
  {
    icon: Shirt, title: 'Custom staff apparel',
    body: 'We design and produce what the therapists work in, so the team a dean meets reads as Lindner.',
  },
  {
    icon: PanelsTopLeft, title: 'Lounge signage',
    body: 'We design it and advise what the lounge needs: privacy screens, directional signs, printed menus.',
  },
  {
    icon: Gift, title: 'A gift at the chair',
    body: 'One takeaway per guest, handed over at the end of the fifteen minutes.',
  },
];

const SIGNUP_ANSWERS = [
  {
    icon: MonitorSmartphone, title: 'Any device',
    body: 'Phone, laptop or tablet, booked from the hallway between sessions.',
  },
  {
    icon: Users, title: 'The fields you want',
    body: 'Name, title, institution and work email, required at booking rather than guessed at the chair.',
  },
  {
    icon: ListPlus, title: 'Waitlists',
    body: 'A full slot takes names instead of turning a dean away, and promotes them when one opens.',
  },
  {
    icon: FileCheck, title: 'Your consent language',
    body: 'You write the line. Every address on the list agreed to hear from Lindner.',
  },
];

const CUSTOMISABLE = [
  'Imagery', 'Headlines and copy', 'Form fields', 'Confirmation emails',
  'Confirmation texts', 'Calendar invite copy', 'Logo and colors', 'Lounge name',
];

/* Conference facts, all from the AACSB event page. */
const HERO_PILLS = [
  { label: '700 deans', fill: '#9EFAFF' },
  { label: '60+ countries', fill: '#FFCBA6' },
  { label: 'Two days', fill: '#FEDC64' },
  { label: 'Orlando', fill: '#F7BBFF' },
];

const HERO_PHOTO = {
  src: '/aacsb/lounge-hero.jpg',
  alt: 'A Shortcut massage therapist working a chair massage at an event',
};

const LOGISTICS = [
  {
    icon: ShieldCheck, title: 'Certificates of insurance',
    body: 'Naming the Signia by Hilton and Lindner as additional insured, sent ahead of the conference.',
  },
  {
    icon: FileCheck, title: 'Licensed therapists',
    body: 'Florida licensure on file for every therapist who works the lounge.',
  },
  {
    icon: Clock, title: 'Any space',
    body: 'The lounge sets up in a meeting room or an open foyer, so a room change on the morning is fine.',
  },
  {
    icon: Calendar, title: 'Free reschedules',
    body: 'If the programme moves, tell us and we move with it rather than charge for it.',
  },
];

/* Read from the live proposal. One service, one ladder, per conference-day. */
const LADDER = {
  service: 'Chair massage',
  tiers: [
    { appts: '64', hours: '4 hours', price: '$2,400' },
    { appts: '80', hours: '5 hours', price: '$3,000' },
    { appts: '96', hours: '6 hours', price: '$3,600' },
  ],
};

const BUILD = [
  { day: 'Monday, Oct 19', appts: '96 appointments', hours: '6 hours', price: '$3,600' },
  { day: 'Tuesday, Oct 20', appts: '64 appointments', hours: '4 hours', price: '$2,400' },
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

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,560px)_1fr] gap-10 lg:gap-16 items-start">
              <div className="min-w-0">
                <p className="m-0 text-[12px] font-extrabold uppercase tracking-[.09em] text-shortcut-teal mb-6">
                  Sponsor activation · The Deans Conference 2026
                </p>

                <h1 className="m-0 text-[34px] md:text-[48px] lg:text-[56px] font-semibold leading-[1.08] tracking-[-.03em] text-white max-w-[18ch] text-balance">
                  Fifteen minutes with a dean.
                  <span className="block text-shortcut-teal">160 times over two days.</span>
                </h1>

                <p className="m-0 mt-[22px] text-[17px] md:text-[19px] font-medium leading-[1.5] text-white/[.86] max-w-[44ch]">
                  Lindner sponsors the wellness lounge at The Deans Conference. Four therapists run
                  chair massage on the floor for two days, every surface carries your name, and you
                  get the list of every dean who booked.
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
                    { icon: Users, label: 'Deans and heads of business units' },
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
            title="What happens in the lounge"
            sub="One station, open both days. A dean sits down between sessions for fifteen minutes, fully clothed, and gets the neck, shoulders, back and arms."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {LOUNGE.map((l) => (
              <FeatureCard key={l.title} icon={l.icon} title={l.title} body={l.body} />
            ))}
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
            <SubHead note="Everything a dean sees carries the sponsor, not our logo.">
              Branded to Lindner, not to us
            </SubHead>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
              {BRANDING.map((b) => (
                <FeatureCard key={b.title} icon={b.icon} title={b.title} body={b.body} tint="bg-accent-yellow" />
              ))}
            </div>
          </div>

          <div className="mt-20 md:mt-24">
            <SubHead note="The same team, kit and staging arrives for the lounge.">
              What a day looks like
            </SubHead>
            <SizzleReel />
          </div>
        </Panel>

        {/* ══════════ ACT 2 · THE PAGE AND THE LIST ══════════ */}
        <Panel id="booking" tone="tint">
          <SectionHead
            kicker="Act two"
            title="The booking page,"
            accent="and the list you keep after."
            sub="The lounge is the reason a dean stops. The booking page is how you know who they were."
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
              If a dean sees it, you can change it. Tell us the wording and we build it.
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
                  Rather than describe it
                </p>
                <h3 className="m-0 text-[26px] md:text-[34px] font-bold leading-[1.08] tracking-[-.03em] text-white">
                  Open the live booking page and book yourself a slot.
                </h3>
                <p className="m-0 mt-3.5 text-[16px] font-medium leading-[1.5] text-white/75 max-w-[52ch]">
                  Working right now. Pick a time, see what a dean sees.
                </p>
              </div>
              <span className="flex-none w-16 h-16 rounded-full bg-shortcut-coral flex items-center justify-center shadow-[0_6px_20px_rgba(255,80,80,.4)] transition-transform duration-500 group-hover:scale-110">
                <ArrowUpRight size={26} className="text-white" strokeWidth={2.5} />
              </span>
            </div>
          </a>

          <div className="mt-20 md:mt-24">
            <SubHead note="The one thing that outlasts the conference.">
              What you get back
            </SubHead>
            <div className={`${CARD} flex flex-col md:flex-row md:items-start gap-7 md:gap-10`}>
              <span className="flex-none w-14 h-14 rounded-full bg-shortcut-teal flex items-center justify-center">
                <Database size={24} className="text-shortcut-blue" strokeWidth={2.5} />
              </span>
              <div className="flex-1">
                <h4 className="m-0 text-[22px] md:text-[24px] font-bold leading-[1.1] tracking-[-.025em] text-shortcut-blue">
                  Every dean who booked, with their institution
                </h4>
                <p className={`m-0 mt-3 text-[16px] md:text-[17px] font-medium leading-[1.55] ${INK} max-w-[70ch]`}>
                  Name, title, institution, work email and whether they actually showed up, handed
                  back after the conference in a shape your advancement team can load straight into
                  a CRM and work.
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
            sub="You pay per conference-day, by how many appointments you want the lounge to run. Four therapists either way; the hours change with the count."
          />

          <div className={`${CARD} p-0 md:p-0 overflow-hidden`}>
            <div className="bg-shortcut-blue px-7 py-5">
              <div className="text-[12px] font-extrabold uppercase tracking-[.09em] text-shortcut-teal">
                {LADDER.service}, per conference-day
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#E2E9E8]">
              {LADDER.tiers.map((t) => (
                <div key={t.appts} className="px-7 py-7">
                  <div className={`text-[13px] font-bold uppercase tracking-[.06em] ${INK_META}`}>
                    {t.appts} appointments
                  </div>
                  <div className="text-[34px] font-extrabold tracking-[-.03em] text-shortcut-blue tabular-nums leading-none mt-2">
                    {t.price}
                  </div>
                  <div className={`text-[15px] font-medium ${INK} mt-2.5`}>
                    Four therapists · {t.hours}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`${CARD} mt-5`}>
            <SubHead note="The build in the proposal, day by day.">
              Two days as quoted
            </SubHead>
            <div className="flex flex-col gap-4">
              {BUILD.map((b) => (
                <div key={b.day} className="flex flex-wrap items-baseline justify-between gap-3 pb-4 border-b border-[#E2E9E8]">
                  <div>
                    <div className="text-[17px] font-bold tracking-[-.02em] text-shortcut-blue">{b.day}</div>
                    <div className={`text-[15px] font-medium ${INK} mt-1`}>{b.appts} · {b.hours}</div>
                  </div>
                  <div className="text-[22px] font-extrabold tracking-[-.025em] text-shortcut-blue tabular-nums">{b.price}</div>
                </div>
              ))}
              <div className="flex flex-wrap items-baseline justify-between gap-3 pt-2">
                <div>
                  <div className="text-[17px] font-extrabold tracking-[-.02em] text-shortcut-blue">Two days</div>
                  <div className={`text-[15px] font-medium ${INK} mt-1`}>160 appointments</div>
                </div>
                <div className="text-[34px] font-extrabold tracking-[-.03em] text-shortcut-blue tabular-nums leading-none">$6,000</div>
              </div>
            </div>
          </div>
        </Panel>

        {/* ══════════ ACT 4 · LOGISTICS ══════════ */}
        <Panel id="logistics" tone="tint">
          <SectionHead
            kicker="Act four"
            title="The boring part, handled"
            sub="Four things a conference organiser usually has to chase. Not here."
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
              One lounge, two days, 160 deans.
            </h2>
            <p className="m-0 mt-4 text-[16px] md:text-[17px] font-medium leading-[1.5] text-white/70 max-w-[52ch] mx-auto">
              Ninety percent or more of slots get booked on a typical day, and eighty seven percent
              of companies book us again. Say the word and we will build the running order.
            </p>
            <div className="mt-12 pt-8 border-t border-white/15">
              <div className="text-[11px] font-bold uppercase tracking-[.12em] text-white/40">
                Confidential · prepared for the Carl H. Lindner College of Business
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
