import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Calendar, MapPin, Users, Camera, Scissors, Sparkles, Heart,
  ShieldCheck, FileCheck, Eye, EyeOff, ArrowUpRight, Image,
  Shirt, Gift, PanelsTopLeft, Smartphone, ListPlus, Database, Clock,
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
const PROPOSAL_LA = 'https://proposals.getshortcut.co/p/yw3-brand-experience-sep-2026-6';

/* Gutter + column, matching the homepage's --hp-gut ladder. */
const GUT = 'px-6 md:px-12 lg:px-[100px]';
const COL = 'max-w-[1280px] mx-auto';

const STATIONS = [
  {
    service: 'Headshots', station: 'GET SEEN', pillar: 'Audience reach',
    icon: Camera, bg: '#9EFAFF',
    body: 'A photographer, lights and a backdrop. Everyone who sits down gets their own shot retouched and emailed afterwards.',
  },
  {
    service: 'Chair massage', station: 'NO FRICTION', pillar: 'Removing friction',
    icon: Heart, bg: '#A9F0CC',
    body: 'We turn a conference room into a spa. Massage therapists, chairs, privacy screens. Fifteen minutes in the chair, fully clothed.',
  },
  {
    service: 'Hair', station: 'THE FIT', pillar: 'Creative fit',
    icon: Scissors, bg: '#FEDC64',
    body: 'Barbers and stylists at a chair on the floor. Cuts, trims, beard work and styling.',
  },
  {
    service: 'Nails', station: 'NAILED IT', pillar: 'Results',
    icon: Sparkles, bg: '#F7BBFF',
    body: 'Manicurists at a table. Express manicures, about fifteen minutes each.',
  },
];

const BRANDING = [
  {
    icon: Shirt, title: 'Our staff wear your apparel',
    body: 'The team works the floor in Netflix Ads apparel you supply, not Shortcut black. You send it to us and we get it to every Pro before the first day.',
  },
  {
    icon: PanelsTopLeft, title: 'Your artwork on the privacy screens',
    body: 'The screens that turn a conference room into a treatment space carry your artwork. They are the backdrop in every photo anyone takes that day.',
  },
  {
    icon: Gift, title: 'A gift at each station',
    body: 'One takeaway per station, matched to the service. What a planner leaves holding lines up with what they just sat down for.',
  },
];

const SIGNUP_ANSWERS = [
  {
    icon: Smartphone, title: 'It works on a phone',
    body: 'Planners book from the hallway. The page is built for a phone first, not a desktop form shrunk down.',
  },
  {
    icon: Users, title: 'Name, title, company, work email',
    body: 'The four fields you asked for, set as required custom fields. Captured at booking, not guessed at the door.',
  },
  {
    icon: ListPlus, title: 'A waitlist when a station fills',
    body: 'Once a station is full the page takes names instead of turning people away, and promotes them automatically when a slot opens.',
  },
  {
    icon: FileCheck, title: 'Your opt-in language on the form',
    body: 'You write the consent line and we put it on the form. Every address on the list agreed to hear from Netflix Ads.',
  },
];

const LOGISTICS = [
  {
    icon: ShieldCheck, title: 'Certificates of insurance',
    body: 'Naming the building and Netflix Ads as additional insured, sent to building management before each day.',
  },
  {
    icon: FileCheck, title: 'Licensed Pros in every state',
    body: 'Licensure on file for every Pro who works the floor, in whichever states the five offices land in.',
  },
  {
    icon: Clock, title: 'A conference room or open floor',
    body: 'Every station is built to set up in either, so a room change on the morning of day three is not a problem.',
  },
  {
    icon: Calendar, title: 'Reschedules are free',
    body: 'Floor access pulled, snow in New York. Tell us and we move that day rather than charge for it.',
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

/** Centred section head: coral-dot eyebrow, 40px title, 17px sub at 52ch.
 *  56px to whatever follows. */
function SectionHead({ kicker, title, accent, sub }: {
  kicker: string; title: string; accent?: string; sub?: string;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-3.5 mb-12 md:mb-14">
      <p className="m-0 flex items-center gap-2.5 text-[12px] font-extrabold uppercase tracking-[.09em] text-shortcut-blue">
        <span className="w-[7px] h-[7px] flex-none rounded-full bg-shortcut-coral" />
        {kicker}
      </p>
      <h2 className="m-0 text-[28px] md:text-[40px] font-bold leading-[1.1] tracking-[-.03em] text-shortcut-blue max-w-[20ch]">
        {title}
        {accent && <span className="block text-shortcut-teal-blue">{accent}</span>}
      </h2>
      {sub && (
        <p className="m-0 text-[16px] md:text-[17px] font-medium leading-[1.5] text-[#45596A] max-w-[52ch]">
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
    <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-2 pb-5 mb-8 border-b border-shortcut-blue/[.12]">
      <h3 className="m-0 text-[20px] md:text-[24px] font-bold leading-tight tracking-[-.025em] text-shortcut-blue">
        {children}
      </h3>
      {note && <p className="m-0 text-[15px] font-medium text-[#45596A] md:text-right md:max-w-[42ch]">{note}</p>}
    </div>
  );
}

const CARD = 'rounded-[28px] bg-white border border-black/[.06] shadow-[0_6px_20px_rgba(0,0,0,0.10)] p-[26px] md:p-[30px]';

function FeatureCard({ icon: Icon, title, body, tint = 'bg-shortcut-teal' }: {
  icon: LucideIcon; title: string; body: string; tint?: string;
}) {
  return (
    <div className={`${CARD} flex flex-col`}>
      <span className={`w-11 h-11 rounded-full ${tint} flex items-center justify-center mb-5`}>
        <Icon size={19} className="text-shortcut-blue" strokeWidth={2.5} />
      </span>
      <h4 className="m-0 text-[18px] font-bold leading-tight tracking-[-.02em] text-shortcut-blue">{title}</h4>
      <p className="m-0 mt-2.5 text-[15px] font-medium leading-[1.55] text-[#45596A]">{body}</p>
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
        <section className="relative overflow-hidden pb-[110px]" style={{ backgroundColor: '#F0F0FF' }}>
          <div className={`${GUT} ${COL} relative z-10 pt-14 md:pt-24`}>
            <div className="flex items-center gap-5 md:gap-7 mb-10 pb-7 border-b border-shortcut-blue/[.1]">
              <div className="text-[22px] md:text-[28px] font-extrabold tracking-tight text-shortcut-blue">YW3</div>
              <div className="h-7 md:h-10 w-px bg-shortcut-blue/15" aria-hidden="true" />
              <img src="/shortcut-logo-blue.svg" alt="Shortcut" className="h-6 md:h-8 w-auto" />
            </div>

            <p className="m-0 flex items-center gap-2.5 text-[12px] font-extrabold uppercase tracking-[.09em] text-shortcut-blue mb-5">
              <span className="w-[7px] h-[7px] flex-none rounded-full bg-shortcut-coral" />
              Vendor response · Netflix Ads
            </p>

            <h1 className="m-0 text-[36px] md:text-[56px] font-bold leading-[1.04] tracking-[-.038em] text-shortcut-blue max-w-[16ch]">
              Four stations in your office.
              <span className="block text-shortcut-teal-blue">Five offices in one week.</span>
            </h1>

            <p className="m-0 mt-6 text-[17px] md:text-[19px] font-medium leading-[1.55] text-[#45596A] max-w-[58ch]">
              We set up four wellness stations inside each agency office: headshots, chair massage,
              hair and nails. Media planners book a fifteen minute slot on a Netflix Ads branded
              page and walk down the hall. We bring the Pros, the equipment, the booking page and a
              lead who runs the day. You get a list of everyone who came.
            </p>

            <div className="flex flex-wrap gap-3 mt-9">
              {[
                { icon: Calendar, label: 'Week of Jan 11, 2027' },
                { icon: MapPin, label: 'Five offices, one holding company' },
                { icon: Users, label: 'Mid level media planners' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="inline-flex items-center gap-2 bg-white/85 backdrop-blur-sm rounded-full px-4 py-2.5 shadow-sm border border-white/60">
                  <Icon size={14} className="text-shortcut-blue" strokeWidth={2.5} />
                  <span className="text-[13.5px] font-bold text-shortcut-blue">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-shortcut-teal/40 to-transparent rounded-full -translate-y-1/3 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-accent-pink/30 to-transparent rounded-full translate-y-1/3 -translate-x-1/3" />
        </section>

        {/* ══════════ ACT 1 · THE DAY ══════════ */}
        <Panel id="day">
          <SectionHead
            kicker="Act one"
            title="What happens in the office"
            sub="Four stations, open all day, in a conference room or on the open floor. Each one is themed to one of the four Netflix Ads pitch pillars. Nobody is told which pillar they are in. They just book a slot and sit down."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STATIONS.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.service} className={`${CARD} flex flex-col`}>
                  <span className="w-11 h-11 rounded-full flex items-center justify-center mb-5" style={{ background: s.bg }}>
                    <Icon size={19} className="text-shortcut-blue" strokeWidth={2.5} />
                  </span>
                  <h4 className="m-0 text-[20px] font-bold leading-tight tracking-[-.025em] text-shortcut-blue">{s.service}</h4>
                  <p className="m-0 mt-2.5 text-[15px] font-medium leading-[1.55] text-[#45596A] flex-1">{s.body}</p>
                  <div className="mt-6 pt-5 border-t border-shortcut-blue/[.12]">
                    <div className="text-[11px] font-extrabold uppercase tracking-[.1em] text-shortcut-blue/45">
                      Station name
                    </div>
                    <div className="text-[15px] font-extrabold tracking-[-.015em] text-shortcut-blue mt-1">{s.station}</div>
                    <div className="text-[13.5px] font-semibold text-[#45596A] mt-2">Pillar: {s.pillar}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[15px] font-medium leading-[1.55] text-[#45596A] max-w-[70ch] mx-auto text-center mt-8">
            Pros, equipment, setup and cleanup are included at every station. Happy to swap hair or
            nails for facials, mindfulness, a sound bath or yoga. Both sample days carry a sound bath
            and a mindfulness session as optional extras, priced separately from the four stations.
          </p>

          {/* Branding sits inside the day, because it is what the day looks like. */}
          <div className="mt-20 md:mt-24">
            <SubHead note="Everything a planner sees on the floor carries the campaign, not our logo.">
              Branded to Netflix Ads, not to us
            </SubHead>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
            sub="This is the part of the brief with the most asks in it, so here is a straight answer to each one and a working page you can book yourself a slot on."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {SIGNUP_ANSWERS.map((a) => (
              <FeatureCard key={a.title} icon={a.icon} title={a.title} body={a.body} />
            ))}
          </div>

          {/* The single loudest call to action on the page. */}
          <a
            href={SIGNUP_DEMO}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-5 block rounded-[28px] bg-shortcut-blue p-8 md:p-12 shadow-[0_6px_20px_rgba(0,0,0,0.10)] transition-transform duration-500 hover:-translate-y-1"
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
                  A real Shortcut booking page, working right now. Pick a service, pick a time, and
                  see exactly what a planner sees on the day.
                </p>
              </div>
              <span className="flex-none w-16 h-16 rounded-full bg-shortcut-coral flex items-center justify-center shadow-[0_6px_20px_rgba(255,80,80,.4)] transition-transform duration-500 group-hover:scale-110">
                <ArrowUpRight size={26} className="text-white" strokeWidth={2.5} />
              </span>
            </div>
          </a>

          {/* What you get back. The deliverable, not another feature grid. */}
          <div className="mt-20 md:mt-24">
            <SubHead note="Two things outlast the week: the portraits and the list.">
              What you get back
            </SubHead>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className={`${CARD}`}>
                <span className="w-11 h-11 rounded-full bg-accent-yellow flex items-center justify-center mb-5">
                  <Image size={19} className="text-shortcut-blue" strokeWidth={2.5} />
                </span>
                <h4 className="m-0 text-[20px] font-bold leading-tight tracking-[-.025em] text-shortcut-blue">
                  A retouched portrait, in their inbox
                </h4>
                <p className="m-0 mt-2.5 text-[15px] font-medium leading-[1.55] text-[#45596A]">
                  Everyone who sits for a headshot gets a private link to their own shots. They pick
                  the one they want, we retouch it, and we email it to them branded to Netflix Ads.
                  Nobody browses anybody else&rsquo;s photos, and nobody is stuck with the frame the
                  photographer liked. It is the piece that keeps working on LinkedIn months later.
                </p>
              </div>
              <div className={`${CARD}`}>
                <span className="w-11 h-11 rounded-full bg-shortcut-teal flex items-center justify-center mb-5">
                  <Database size={19} className="text-shortcut-blue" strokeWidth={2.5} />
                </span>
                <h4 className="m-0 text-[20px] font-bold leading-tight tracking-[-.025em] text-shortcut-blue">
                  A Salesforce ready list, per office
                </h4>
                <p className="m-0 mt-2.5 text-[15px] font-medium leading-[1.55] text-[#45596A]">
                  Name, title, company, work email and whether they actually showed up, handed back
                  office by office in a shape you can load straight into Salesforce and attribute Q1
                  pipeline against. A manager view shows you every guest and where each portrait
                  stands while the week is still running.
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
            sub="You pay per station, per office-day, based on how many appointments you want at that station. Below is the actual rate card. Two sample days are live in one proposal, and you can change the numbers yourself."
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
            <p className="m-0 px-7 py-5 text-[14px] font-medium leading-[1.55] text-[#45596A] border-t border-shortcut-blue/[.1]">
              Nails runs in a different size ladder because a manicure takes longer than a massage.
              The same rate card applies in New York and Los Angeles. Volume pricing applies across
              the week once you pass five office-days, and again past nine in a year, so the five day
              week comes in under the sum of five separate days.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                href: PROPOSAL_NY, city: 'New York', total: '$13,917', appts: '250 appointments',
                detail: 'A full day. Headshots at 50, chair massage at 100, hair at 50 and nails at 50.',
              },
              {
                href: PROPOSAL_LA, city: 'Los Angeles', total: '$5,396', appts: '91 appointments',
                detail: 'A lighter day. Headshots, chair massage and hair at 25 each, nails at 16.',
              },
            ].map((d) => (
              <a
                key={d.city}
                href={d.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`${CARD} group flex flex-col transition-transform duration-500 hover:-translate-y-1`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[12px] font-extrabold uppercase tracking-[.09em] text-shortcut-blue/45">
                      Sample office-day
                    </div>
                    <div className="text-[22px] font-bold tracking-[-.025em] text-shortcut-blue mt-1.5">{d.city}</div>
                  </div>
                  <span className="flex-none w-11 h-11 rounded-full bg-shortcut-blue/[.06] group-hover:bg-shortcut-coral flex items-center justify-center transition-colors">
                    <ArrowUpRight size={19} className="text-shortcut-blue group-hover:text-white transition-colors" strokeWidth={2.5} />
                  </span>
                </div>
                <div className="mt-6 pt-5 border-t border-shortcut-blue/[.12]">
                  <div className="text-[34px] font-extrabold tracking-[-.03em] text-shortcut-blue tabular-nums leading-none">{d.total}</div>
                  <div className="text-[13.5px] font-bold text-[#45596A] mt-2">{d.appts}</div>
                  <p className="m-0 mt-3 text-[15px] font-medium leading-[1.55] text-[#45596A]">{d.detail}</p>
                </div>
                <p className="m-0 mt-5 text-[14px] font-semibold text-shortcut-blue">
                  Opens on this day. Switch between the two and change any
                  appointment count. The total moves with you.
                </p>
              </a>
            ))}
          </div>
        </Panel>

        {/* ══════════ ACT 4 · LOGISTICS ══════════ */}
        <Panel id="logistics" tone="tint">
          <SectionHead
            kicker="Act four"
            title="The boring part, handled"
            sub="Four things a producer has to chase with most vendors. You do not have to chase them here."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-9">
            {LOGISTICS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="pt-6 border-t-2 border-shortcut-blue/15">
                <Icon size={20} className="text-shortcut-blue mb-3.5" strokeWidth={2.5} />
                <h4 className="m-0 text-[16.5px] font-bold leading-tight tracking-[-.02em] text-shortcut-blue">{title}</h4>
                <p className="m-0 mt-2 text-[14.5px] font-medium leading-[1.55] text-[#45596A]">{body}</p>
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
              Ninety percent or more of slots get booked on a typical office day, and eighty seven
              percent of companies book us again after the first one. Tell us which five offices and
              we will build the running order.
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
