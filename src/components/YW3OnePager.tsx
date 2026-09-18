import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Calendar, MapPin, Users, Camera,
  ShieldCheck, FileCheck, Eye, EyeOff, ArrowUpRight, Image,
  Shirt, Gift, PanelsTopLeft, MonitorSmartphone, ListPlus, Database, Clock,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   YW3 Brand Experience × Shortcut — vendor response
   Netflix Ads "Break In Case of Planning Emergency"
   Five office-days, week of Jan 11 2027.

   ── LAYOUT ────────────────────────────────────
   Rebuilt 2026-09-18 onto the getshortcut.co homepage section system
   (frontend/assets/web-home.css), because the old build used none of it:

     gutter        100px desktop, 1280 content column
     section       112px top / 112px bottom  (was a 32-48px flex gap)
     section head  CENTRED, 14px stack gap, coral-dot eyebrow
     eyebrow       12px / 800 / .09em / uppercase
     h2            40px / 1.1 / 700 / -.03em / #003756
     sub           17px / 1.5 / 500 / #45596A / max 52ch
     head→body     56px
     card          28px radius, 34/30 padding, 1px rgba(0,0,0,.06),
                   shadow 0 6px 20px rgba(0,0,0,.10)
     grid gap      20px
     ladder        white panels, radius 50px 50px 0 0, margin-top -50px

   The old page also nested cards inside `card-large` shells, which the
   site never does: a section panel holds cards directly.

   ── HIERARCHY ─────────────────────────────────
   Was nine peer sections, every one an eyebrow + two-tone heading + an
   N-up card grid: 26 boxes of identical weight and no reading order.
   Now four acts, weighted, in the order a producer needs them:

     1  THE DAY            what physically happens in an office
     2  THE PAGE AND LIST  the booking page, the fields, what you get back
     3  PRICING            real numbers
     4  LOGISTICS          a quiet strip, deliberately the lightest thing

   ── PRICING IS REAL ───────────────────────────
   Every figure below is read from the two live proposals this page links
   to (Supabase `proposals`, f87ce793 = LA, 5dac68dc = NY), so clicking
   through confirms the page instead of contradicting it. The previous
   copy claimed LA was "priced for the LA market" (the two ladders are
   identical), that nails ran 25/50/75/100 (it runs 16/33/50/66), and
   that massage and headshots were both sized at 100 (neither proposal
   does that). Those claims are gone.

   CONFIDENTIAL under the MNDA signed 2026-09-16.
   ───────────────────────────────────────────── */

const SIGNUP_DEMO = 'https://admin.shortcutpros.com/#/signup/gHTKOcwIzE';
const PROPOSAL_NY = 'https://proposals.getshortcut.co/p/yw3-brand-experience-sep-2026-5';
/* The same proposal opening on option B (Los Angeles). One link is enough:
   PROPOSAL_NY opens on option A and the viewer switches between them. */
// const PROPOSAL_LA = 'https://proposals.getshortcut.co/p/yw3-brand-experience-sep-2026-6';

/* Full bleed: gutters only, no content cap. */
const GUT = 'px-6 md:px-10 lg:px-16 2xl:px-24';
const COL = 'w-full';

/* Type + surface tokens lifted from the V2 proposal viewer
   (src/styles/proposal-refresh.css). Named the same as the .lt-* classes so
   the two surfaces stay legible together.
     ink-soft #2A5468  body copy      (was wrongly on ink-meta, too light)
     ink-meta #45596A  eyebrows, captions only
     rule     #E2E9E8  card borders
     h2 44/700/-.035em · h3 24/700/-.025em · accent = coral, not teal   */
const INK = 'text-[#2A5468]';
const INK_META = 'text-[#45596A]';
const CARD_SHELL =
  'rounded-[28px] bg-white border border-[#E2E9E8] shadow-[0_1px_2px_rgba(3,34,50,.05),0_10px_30px_rgba(3,34,50,.06)]';

const STATIONS = [
  {
    service: 'Massage', station: 'NO FRICTION', pillar: 'Removing friction',
    image: '/conference/services/massage.png', volume: 'Full volume',
    meta: 'Chair or table · 15 to 20 min',
    body: 'A conference room becomes a spa, run by licensed therapists.',
    menu: [
      'Chair or table setups',
      'Optional privacy screens',
      'Music, aromatherapy and lighting',
      'Therapist gender preference',
      'Fully insured professionals',
    ],
  },
  {
    service: 'Headshots', station: 'GET SEEN', pillar: 'Audience reach',
    image: '/conference/services/headshot.png', volume: 'Full volume',
    meta: '5 to 8 min · retouching included',
    body: 'Corporate photographer, lights, backdrop and posing guidance. Everyone leaves with a retouched shot.',
    menu: [
      '5 to 8 minute sessions',
      'Hair and makeup touch ups',
      'Multiple backdrop options',
      'Expert posing guidance',
      'Retouching included',
    ],
  },
  {
    service: 'Hair', station: 'THE FIT', pillar: 'Creative fit',
    image: '/conference/services/hair-v3.png', volume: 'Half volume',
    meta: 'Cuts and styling · 30 min',
    body: 'Barbers and stylists on the floor, experienced with every hair type and texture.',
    menu: [
      'Barber cut',
      'Beard trim and shaping',
      'Hot towel shaves',
      'Salon cut and style',
      'Blowout',
      'Optional classic barber chairs',
    ],
  },
  {
    service: 'Nails', station: 'NAILED IT', pillar: 'Results',
    image: '/conference/services/nails.png', volume: 'Half volume',
    meta: 'Manicures · 30 min',
    body: 'Licensed technicians at a table, with sanitized tools between every guest.',
    menu: [
      'Classic manicure',
      'Gel manicure',
      'Hand treatment and massage',
      'Twenty plus polish colors',
      'Single use kits',
    ],
  },
];

/* Replaces the grey "we would run massage and headshots at full volume" block.
   Same content, read as a list instead of a paragraph. */
const RECOMMENDED = [
  'Massage and headshots at full volume. They move the most people, so they reach the most planners.',
  'Hair and nails at half that, and either can be swapped for facials, mindfulness, a sound bath or yoga.',
  'Sign-ups are tracked live, so a station that is filling fast gets throttled up before the day, not after.',
  'Pros, equipment, setup and cleanup are included at every station.',
  'Both sample proposals also carry a sound bath and a mindfulness session, priced separately.',
];

const BRANDING = [
  {
    icon: MonitorSmartphone, title: 'The booking tech, branded to you',
    body: 'The sign-up page, confirmation emails, texts and calendar invites all carry Netflix Ads. It is the first thing a planner sees and the last thing they get.',
  },
  {
    icon: Shirt, title: 'Staff apparel, customized with you',
    body: 'We help design and produce the apparel the team works in, matched to each station: Netflix Ads pro tops for the massage therapists, aprons for the beauty Pros, and whatever else the floor calls for. Not Shortcut black.',
  },
  {
    icon: PanelsTopLeft, title: 'Signage, designed and advised per station',
    body: 'We help customize the signage and tell you what each station actually needs: branded privacy screens at massage, backdrops at headshots, directional signage through the space, printed menus at every chair.',
  },
  {
    icon: Gift, title: 'A gift at each station',
    body: 'One takeaway per station, matched to the service a planner just sat down for.',
  },
];

const SIGNUP_ANSWERS = [
  {
    icon: MonitorSmartphone, title: 'Works on any device',
    body: 'Phone, laptop or tablet. Planners book from the hallway or from their desk.',
  },
  {
    icon: Users, title: 'Name, title, company, work email',
    body: 'The four fields you asked for, required at booking rather than guessed at the door.',
  },
  {
    icon: ListPlus, title: 'A waitlist when a station fills',
    body: 'A full station takes names instead of turning people away, and promotes them when a slot opens.',
  },
  {
    icon: FileCheck, title: 'Your opt-in language on the form',
    body: 'You write the consent line. Every address on the list agreed to hear from Netflix Ads.',
  },
  {
    icon: Image, title: 'Photo delivery, handled by the same system',
    body: 'Everyone who sits for a headshot gets a private gallery link to their own shots. They pick the one they want, we retouch it, and it lands in their inbox branded to Netflix Ads within five to seven business days. No memory card handed to anyone.',
  },
  {
    icon: Camera, title: 'You watch the galleries fill',
    body: 'A manager view shows every guest, whether they have picked yet and where each portrait stands, per office, while the week is still running.',
  },
];

/* Everything a planner touches is editable. Listed as chips because the
   point is the length of the list, not any one item on it. */
const CUSTOMISABLE = [
  'Imagery', 'Headlines and copy', 'Form fields', 'Confirmation emails',
  'Confirmation texts', 'Calendar invite copy', 'Logo and colors', 'Service names',
];

/* Pill fills come from the V2 viewer's hero FILL map so a station reads the
   same colour here and inside the proposal. */
const HERO_PILLS = [
  { label: 'Massage', fill: '#9EFAFF' },
  { label: 'Headshots', fill: '#FFCBA6' },
  { label: 'Hair', fill: '#FEDC64' },
  { label: 'Nails', fill: '#F7BBFF' },
];

/* One image on the right, as on getshortcut.co/services/*: a white 28px card
   with 16px padding holding a single 520px cover frame. */
const HERO_PHOTO = {
  src: '/proposal-refresh/massage-office.png',
  alt: 'Massage running in an office',
};

const LOGISTICS = [
  {
    icon: ShieldCheck, title: 'Certificates of insurance',
    body: 'Naming the building and Netflix Ads as additional insured, sent to building management before each day.',
  },
  {
    icon: FileCheck, title: 'Licensed Pros in every state',
    body: 'Licensure on file for every Pro, in whichever states the five offices land in.',
  },
  {
    icon: Clock, title: 'A conference room or open floor',
    body: 'Every station sets up in either, so a room change on the morning of day three is fine.',
  },
  {
    icon: Calendar, title: 'Reschedules are free',
    body: 'Floor access pulled, snow in New York. Tell us and we move the day rather than charge for it.',
  },
];

/* Read from the live proposals. Identical in both cities: there is no
   separate LA rate card, and nails sizes at 16/33/50/66, not 25/50/75/100. */
const LADDER = [
  { service: 'Headshots', sizes: ['25', '50', '75', '100'], prices: ['$1,958', '$3,917', '$5,875', '$7,833'] },
  { service: 'Chair massage', sizes: ['25', '50', '75', '100'], prices: ['$938', '$1,875', '$2,813', '$3,750'] },
  { service: 'Hair', sizes: ['25', '50', '75', '100'], prices: ['$1,250', '$2,500', '$3,750', '$5,000'] },
  { service: 'Nails', sizes: ['16', '33', '50', '66'], prices: ['$1,250', '$2,500', '$3,750', '$5,000'] },
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

/** A white act panel on the light page, with the homepage's overlapping
 *  rounded-top ladder. */
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

/** Centred section head on the V2 scale: .lt-eyebrow (no dot), .lt-h2 at
 *  44px with a coral trailing phrase, .lt-body sub. 56px to what follows. */
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

/** A sub-head inside an act, so the acts read as a document with parts
 *  rather than as more peer sections. */
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

export default function YW3OnePager() {
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem('yw3-auth') === 'true');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'YW3SC2027') {
      sessionStorage.setItem('yw3-auth', 'true');
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
              <div className="text-[22px] font-extrabold tracking-tight text-shortcut-blue">YW3</div>
              <div className="h-6 w-px bg-shortcut-blue/15" aria-hidden="true" />
              <img src="/shortcut-logo-blue.svg" alt="Shortcut" className="h-5 w-auto" />
            </div>
            <div className="text-[12px] text-shortcut-blue/50 font-medium">Vendor Response</div>
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
    { id: 'day', label: 'The day' },
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
            <div className="text-[16px] font-extrabold tracking-tight text-shortcut-blue">YW3</div>
            <div className="h-4 w-px bg-shortcut-blue/15" aria-hidden="true" />
            <img src="/shortcut-logo-blue.svg" alt="Shortcut" className="h-4 w-auto" />
            <div className="hidden sm:block ml-1 md:ml-2 pl-3 md:pl-4 border-l border-shortcut-blue/[.12] text-[10px] font-semibold uppercase tracking-wider text-shortcut-blue/40">
              Vendor Response
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
        {/* getshortcut.co/services/* hero: navy band, a 1fr / 520px grid with
            copy and pills on the left and one image card on the right. The
            site's own numbers: 56px h1 with an aqua trailing phrase, 19px lead,
            coral button beside a plain text link, 40px drop pills, and a white
            28px media card holding a 520px cover frame with a booked badge. */}
        <section className="relative bg-shortcut-blue pt-14 md:pt-24 pb-20 md:pb-36">
          <div className={`${GUT} ${COL} relative z-10`}>
            <div className="flex items-center gap-5 md:gap-7 mb-10 md:mb-14 pb-7 border-b border-white/15">
              <div className="text-[22px] md:text-[28px] font-extrabold tracking-tight text-white">YW3</div>
              <div className="h-7 md:h-10 w-px bg-white/25" aria-hidden="true" />
              <img src="/conference/shortcut-logo-white.svg" alt="Shortcut" className="h-6 md:h-8 w-auto" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_520px] gap-10 lg:gap-16 items-start">
              {/* ── Left: copy, CTA, pills ── */}
              <div className="min-w-0">
                <p className="m-0 text-[12px] font-extrabold uppercase tracking-[.09em] text-shortcut-teal mb-6">
                  Vendor response · Netflix Ads
                </p>

                <h1 className="m-0 text-[34px] md:text-[48px] lg:text-[56px] font-semibold leading-[1.08] tracking-[-.03em] text-white max-w-[18ch] text-balance">
                  {['Break', 'In', 'Case', 'of', 'Planning', 'Emergency.'].map((w, i) => (
                    <span
                      key={w}
                      className="inline-block animate-word-rise"
                      style={{ animationDelay: `${0.05 + i * 0.055}s` }}
                    >
                      {w}&nbsp;
                    </span>
                  ))}
                  <span className="block text-shortcut-teal">
                    {['Four', 'stations', 'on', 'their', 'floor.'].map((w, i) => (
                      <span
                        key={w + i}
                        className="inline-block animate-word-rise"
                        style={{ animationDelay: `${0.4 + i * 0.05}s` }}
                      >
                        {w}&nbsp;
                      </span>
                    ))}
                  </span>
                </h1>

                <p className="m-0 mt-[22px] text-[17px] md:text-[19px] font-medium leading-[1.5] text-white/[.86] max-w-[44ch]">
                  Netflix Ads drops the kit on media planners&rsquo; desks. The same day, four
                  Netflix Ads stations open on their own floor and they book a fifteen minute slot.
                  We bring the Pros, the equipment and a lead who runs each day.
                </p>

                <div className="flex flex-wrap items-center gap-6 mt-8">
                  <a
                    href="#day"
                    className="h-[52px] inline-flex items-center px-8 rounded-full bg-shortcut-coral text-white text-[17px] font-bold tracking-[-.01em] shadow-[0_4px_14px_rgba(255,80,80,.3)] transition-transform duration-500 hover:-translate-y-[3px]"
                  >
                    See the four stations
                  </a>
                  <a href="#pricing" className="text-[15px] font-bold tracking-[-.012em] text-white hover:text-shortcut-teal transition-colors">
                    How pricing works &rarr;
                  </a>
                </div>

                <div className="flex flex-wrap gap-2 mt-7 max-w-[520px]">
                  {HERO_PILLS.map((p, i) => (
                    <span
                      key={p.label}
                      className="h-10 inline-flex items-center px-4 rounded-full text-shortcut-blue text-[14.5px] font-extrabold tracking-[-.01em] whitespace-nowrap animate-pill-drop"
                      style={{ background: p.fill, animationDelay: `${0.3 + i * 0.07}s` }}
                    >
                      {p.label}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3 mt-9">
                  {[
                    { icon: Calendar, label: 'Week of Jan 11, 2027' },
                    { icon: MapPin, label: 'Five offices, one holding company' },
                    { icon: Users, label: 'Mid level media planners' },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2.5">
                      <Icon size={14} className="text-shortcut-teal" strokeWidth={2.5} />
                      <span className="text-[13.5px] font-bold text-white">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Right: one image ── */}
              <div className="rounded-[28px] bg-white p-4 shadow-[0_30px_70px_rgba(3,34,50,.28)]">
                <div className="relative h-[360px] lg:h-[520px] overflow-hidden rounded-[20px] bg-shortcut-teal">
                  <img src={HERO_PHOTO.src} alt={HERO_PHOTO.alt} className="h-full w-full object-cover" />
                  <span className="absolute left-[18px] bottom-[18px] h-10 inline-flex items-center gap-2.5 rounded-full bg-white/[.94] pl-1.5 pr-4">
                    <span className="w-7 h-7 flex-none rounded-full bg-shortcut-coral flex items-center justify-center">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M20 6 9 17l-5-5" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span className="text-[14px] font-extrabold tracking-[-.012em] text-shortcut-blue">
                      You&rsquo;re booked · Massage · 15 min
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ ACT 1 · THE DAY ══════════ */}
        <Panel id="day">
          <SectionHead
            kicker="Act one"
            title="What happens in the office"
            sub="Four stations, open all day, in a conference room or on the open floor. Each is themed to one of your four pitch pillars. Nobody is told which. They book a slot and sit down."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {STATIONS.map((s) => {
              return (
                <div key={s.service} className={`${CARD_SHELL} flex flex-col overflow-hidden`}>
                  {/* Art bleeds to the card's top, left and right edges. Same
                      1.1 crop the service menu uses: the PNGs carry a baked
                      white margin that has to be cropped off. */}
                  <div className="relative h-[210px] bg-[#EAF7F9]">
                    <img src={s.image} alt={s.service} className="absolute inset-0 h-full w-full scale-110 object-cover" />
                    <span className={`absolute top-4 right-4 inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[.08em] shadow-sm ${s.volume === 'Full volume' ? 'bg-shortcut-blue text-white' : 'bg-white text-shortcut-blue'}`}>
                      {s.volume}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-7 md:p-8">
                    <h4 className="m-0 text-[22px] font-bold leading-[1.1] tracking-[-.025em] text-shortcut-blue">{s.service}</h4>
                    <div className={`mt-1.5 text-[13px] font-bold uppercase tracking-[.06em] ${INK_META}`}>{s.meta}</div>
                    <p className={`m-0 mt-3 text-[16px] font-medium leading-[1.55] ${INK}`}>{s.body}</p>

                    {/* 6. What is actually on the menu at this station. */}
                    <ul className="m-0 mt-5 p-0 list-none flex flex-col gap-1.5">
                      {s.menu.map((m) => (
                        <li key={m} className={`flex gap-2.5 text-[15px] font-medium leading-[1.45] ${INK}`}>
                          <span className="mt-[8px] w-[5px] h-[5px] flex-none rounded-full bg-shortcut-teal-blue" />
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-auto pt-6">
                      <div className="pt-5 border-t border-[#E2E9E8]">
                        <div className={`text-[11px] font-extrabold uppercase tracking-[.1em] ${INK_META}`}>
                          Station name
                        </div>
                        <div className="text-[16px] font-extrabold tracking-[-.015em] text-shortcut-blue mt-1">{s.station}</div>
                        <div className={`text-[14px] font-semibold ${INK} mt-2`}>Pillar: {s.pillar}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-16 md:mt-20">
            <SubHead note="How we would size the four stations for a 50 to 100 person floor.">
              Recommended direction
            </SubHead>
            <ul className="m-0 p-0 list-none flex flex-col max-w-[92ch]">
              {RECOMMENDED.map((r) => (
                <li
                  key={r}
                  className={`flex gap-4 py-4 border-b border-[#E2E9E8] last:border-b-0 text-[17px] md:text-[18px] font-medium leading-[1.6] ${INK}`}
                >
                  <span className="mt-[11px] w-[8px] h-[8px] flex-none rounded-full bg-shortcut-coral" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Branding sits inside the day, because it is what the day looks like. */}
          <div className="mt-20 md:mt-24">
            <SubHead note="Everything a planner sees carries the campaign, not our logo.">
              Branded to Netflix Ads, not to us
            </SubHead>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
              {BRANDING.map((b) => (
                <FeatureCard key={b.title} icon={b.icon} title={b.title} body={b.body} tint="bg-accent-yellow" />
              ))}
            </div>
          </div>
        </Panel>

        {/* ══════════ ACT 2 · THE PAGE AND THE LIST ══════════ */}
        <Panel id="booking" tone="tint">
          <SectionHead
            kicker="Act two"
            title="The booking page,"
            accent="and the list you keep after."
            sub="The part of the brief with the most asks in it. A straight answer to each, and a working page you can book on."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {SIGNUP_ANSWERS.map((a) => (
              <FeatureCard key={a.title} icon={a.icon} title={a.title} body={a.body} />
            ))}
          </div>

          {/* The biggest capability claim in this act, so it gets a full row. */}
          <div className={`${CARD} mt-5`}>
            <h4 className="m-0 text-[20px] font-bold leading-tight tracking-[-.025em] text-shortcut-blue">
              Every part of the sign-up experience is customizable
            </h4>
            <p className="m-0 mt-2.5 text-[16px] font-medium leading-[1.55] text-[#2A5468] max-w-[62ch]">
              If a planner sees it, you can change it. Tell us the wording and we build it.
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

          {/* The single loudest call to action on the page. */}
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
                  Working right now. Pick a service, pick a time, see what a planner sees.
                </p>
              </div>
              <span className="flex-none w-16 h-16 rounded-full bg-shortcut-coral flex items-center justify-center shadow-[0_6px_20px_rgba(255,80,80,.4)] transition-transform duration-500 group-hover:scale-110">
                <ArrowUpRight size={26} className="text-white" strokeWidth={2.5} />
              </span>
            </div>
          </a>

          {/* What you get back: the list. Photo delivery lives with the tech
              above, because it is the same system doing it. */}
          <div className="mt-20 md:mt-24">
            <SubHead note="The one thing that outlasts the week.">
              What you get back
            </SubHead>
            <div className={`${CARD} flex flex-col md:flex-row md:items-start gap-7 md:gap-10`}>
              <span className="flex-none w-14 h-14 rounded-full bg-shortcut-teal flex items-center justify-center">
                <Database size={24} className="text-shortcut-blue" strokeWidth={2.5} />
              </span>
              <div className="flex-1">
                <h4 className="m-0 text-[22px] md:text-[24px] font-bold leading-[1.1] tracking-[-.025em] text-shortcut-blue">
                  A Salesforce ready list, per office
                </h4>
                <p className={`m-0 mt-3 text-[16px] md:text-[17px] font-medium leading-[1.55] ${INK} max-w-[70ch]`}>
                  Name, title, company, work email and whether they actually showed up, handed back
                  office by office in a shape you can load straight into Salesforce and attribute Q1
                  pipeline against.
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
            sub="You pay per station, per office-day, by how many appointments you want. Here is the rate card. The same rates apply in New York and Los Angeles."
          />

          {/* The rate card. Straight answer, no session required. */}
          <div className={`${CARD} p-0 md:p-0 overflow-hidden`}>
            {/* On a phone only the first size column fits, and nothing else says
                the rest are one swipe away. */}
            <p className="md:hidden m-0 px-7 pt-6 pb-1 text-[12px] font-bold uppercase tracking-[.09em] text-shortcut-blue/50">
              Swipe the table for every size
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr className="bg-shortcut-blue">
                    <th className="text-left text-[12px] font-extrabold uppercase tracking-[.09em] text-shortcut-teal px-7 py-5">
                      Station
                    </th>
                    <th colSpan={4} className="text-left text-[12px] font-extrabold uppercase tracking-[.09em] text-white/60 px-7 py-5">
                      Price for that station, by number of appointments
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {LADDER.map((row, i) => (
                    <tr key={row.service} className={i % 2 ? 'bg-neutral-light-gray/60' : 'bg-white'}>
                      <td className="px-7 py-5 text-[16px] font-bold tracking-[-.02em] text-shortcut-blue whitespace-nowrap">
                        {row.service}
                      </td>
                      {row.prices.map((p, j) => (
                        <td key={p} className="px-7 py-5">
                          <div className="text-[12px] font-bold text-[#45596A]">{row.sizes[j]} appointments</div>
                          <div className="text-[20px] font-extrabold tracking-[-.025em] text-shortcut-blue tabular-nums mt-0.5">{p}</div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <a
            href={PROPOSAL_NY}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-5 block rounded-[28px] bg-shortcut-blue p-8 md:p-12 shadow-[0_20px_50px_rgba(3,34,50,.22)] transition-transform duration-500 hover:-translate-y-1"
          >
            <div className="flex flex-col md:flex-row md:items-center gap-7 md:gap-10">
              <div className="flex-1">
                <p className="m-0 text-[12px] font-extrabold uppercase tracking-[.09em] text-shortcut-teal mb-3">
                  Priced live, not in a deck
                </p>
                <h3 className="m-0 text-[26px] md:text-[34px] font-bold leading-[1.08] tracking-[-.03em] text-white">
                  Open the proposal and change the numbers yourself.
                </h3>
                <p className="m-0 mt-3.5 text-[16px] font-medium leading-[1.5] text-white/75 max-w-[56ch]">
                  Set how many appointments you want at each station and the total updates as you
                  go. New York and Los Angeles are priced the same.
                </p>
              </div>
              <span className="flex-none w-16 h-16 rounded-full bg-shortcut-coral flex items-center justify-center shadow-[0_6px_20px_rgba(255,80,80,.4)] transition-transform duration-500 group-hover:scale-110">
                <ArrowUpRight size={26} className="text-white" strokeWidth={2.5} />
              </span>
            </div>
          </a>
        </Panel>

        {/* ══════════ ACT 4 · LOGISTICS ══════════ */}
        <Panel id="logistics" tone="tint">
          <SectionHead
            kicker="Act four"
            title="The boring part, handled"
            sub="Four things a producer usually has to chase. Not here."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-10 gap-y-9">
            {LOGISTICS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="pt-6 border-t-2 border-[#E2E9E8]">
                <Icon size={20} className="text-shortcut-blue mb-3.5" strokeWidth={2.5} />
                <h4 className="m-0 text-[16.5px] font-bold leading-tight tracking-[-.02em] text-shortcut-blue">{title}</h4>
                <p className="m-0 mt-2 text-[15.5px] font-medium leading-[1.55] text-[#2A5468]">{body}</p>
              </div>
            ))}
          </div>
        </Panel>

        {/* ══════════ CLOSE ══════════ */}
        <section className="relative -mt-[50px] rounded-t-[50px] bg-shortcut-blue py-16 md:py-24">
          <div className={`${GUT} ${COL} text-center`}>
            <h2 className="m-0 text-[26px] md:text-[38px] font-bold leading-[1.08] tracking-[-.035em] text-white max-w-[20ch] mx-auto">
              Five office-days, one team, one invoice.
            </h2>
            <p className="m-0 mt-4 text-[16px] md:text-[17px] font-medium leading-[1.5] text-white/70 max-w-[52ch] mx-auto">
              Ninety percent or more of slots get booked on a typical day, and eighty seven percent
              of companies book us again. Tell us the five offices and we will build the running order.
            </p>
            <div className="mt-12 pt-8 border-t border-white/15">
              <div className="text-[11px] font-bold uppercase tracking-[.12em] text-white/40">
                Confidential · prepared for YW3 Brand Experience · Sep 18, 2026
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
