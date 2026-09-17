import { useEffect, useRef, useState } from 'react';
import {
  Calendar, MapPin, Users, Camera, Scissors, Sparkles, Heart,
  Link2, ShieldCheck, Clock, FileCheck, Eye, EyeOff, ArrowUpRight, Image,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   YW3 Brand Experience × Shortcut — vendor response
   Netflix Ads "Break In Case of Planning Emergency"
   NYC + LA, week of Jan 11 2027.

   Layout follows KeplerReport / DraftKingsReport: password gate,
   sticky co-brand bar, sidebar contents, hero card, white card
   sections, colour stat tiles.

   CONFIDENTIAL under the MNDA signed 2026-09-16.
   ───────────────────────────────────────────── */

const SIGNUP_DEMO = 'https://admin.shortcutpros.com/#/signup/gHTKOcwIzE';
const PROPOSAL_NY = 'https://proposals.getshortcut.co/p/yw3-brand-experience-sep-2026-5';
const PROPOSAL_LA = 'https://proposals.getshortcut.co/p/yw3-brand-experience-sep-2026-6';

const STATIONS = [
  { name: 'GET SEEN', service: 'Headshots', icon: Camera, bg: '#9EFAFF', note: 'Retouched portrait, emailed after the day.' },
  { name: 'THE FIT', service: 'Hair', icon: Scissors, bg: '#FEDC64', note: 'Cuts, trims and styling at the chair.' },
  { name: 'NAILED IT', service: 'Nails', icon: Sparkles, bg: '#F7BBFF', note: 'Express manicures, fifteen minutes each.' },
  { name: 'NO FRICTION', service: 'Chair massage', icon: Heart, bg: '#A9F0CC', note: 'A conference room turned into a spa.' },
];

const SIGNUP_ANSWERS = [
  { icon: Link2, title: 'Branded to Netflix Ads', body: 'Your logo, your colours and the four station headlines on the page guests actually see.' },
  { icon: Users, title: 'The fields you asked for', body: 'Name, title, company and work email, captured at sign-up rather than guessed at the door.' },
  { icon: FileCheck, title: 'Consent in your words', body: 'Your follow-up language sits on the form, so every address on the list opted in to hear from Netflix Ads.' },
  { icon: ShieldCheck, title: 'The list, after each day', body: 'Name, email and confirmed attendance, handed back per office so you know who booked and who showed.' },
];

function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function Section({ children, id, className = '' }: { children: React.ReactNode; id?: string; className?: string }) {
  const { ref, visible } = useFadeIn();
  return (
    <div
      ref={ref}
      id={id}
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`}
      style={{ transitionTimingFunction: 'cubic-bezier(.25,.46,.45,.94)' }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-bold uppercase tracking-[.15em] text-shortcut-blue/50 mb-3">{children}</div>;
}

function Heading({ children, accent, subtitle }: { children: React.ReactNode; accent?: string; subtitle?: string }) {
  return (
    <div className="mb-8 md:mb-10">
      <h2 className="text-[1.75rem] md:text-[2.5rem] font-extrabold text-shortcut-blue leading-[1.05] tracking-tight">
        {children}
        {accent && <span className="block text-shortcut-teal-blue">{accent}</span>}
      </h2>
      {subtitle && (
        <p className="text-[15px] md:text-[17px] text-text-dark/70 mt-3 font-medium leading-relaxed max-w-[680px]">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function StatTile({ value, label, sublabel, color }: {
  value: string; label: string; sublabel?: string;
  color: 'navy' | 'teal' | 'yellow' | 'pink';
}) {
  const shell = {
    navy: 'bg-shortcut-blue text-white',
    teal: 'bg-shortcut-teal text-shortcut-blue',
    yellow: 'bg-accent-yellow text-shortcut-blue',
    pink: 'bg-accent-pink text-shortcut-blue',
  }[color];
  const val = {
    navy: 'text-shortcut-teal',
    teal: 'text-shortcut-blue',
    yellow: 'text-shortcut-blue',
    pink: 'text-shortcut-blue',
  }[color];
  return (
    <div className={`rounded-3xl p-6 md:p-7 shadow-lg ${shell}`}>
      <div className={`text-[2.5rem] md:text-[3.25rem] font-extrabold leading-none tracking-tight tabular-nums ${val}`}>{value}</div>
      <div className="text-[13px] md:text-[14px] font-bold uppercase tracking-[.08em] mt-3 opacity-90">{label}</div>
      {sublabel && <div className="text-[12px] font-medium mt-1.5 opacity-60 leading-relaxed">{sublabel}</div>}
    </div>
  );
}

function LinkCard({ href, kicker, title, body }: { href: string; kicker: string; title: string; body: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-2xl border border-shortcut-blue/[.12] bg-white p-6 md:p-7 transition-all hover:border-shortcut-blue/30 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[.12em] text-shortcut-blue/40 mb-2">{kicker}</div>
          <div className="text-[19px] md:text-[21px] font-extrabold text-shortcut-blue leading-tight tracking-tight">{title}</div>
          <p className="text-[14px] text-text-dark/70 mt-2 font-medium leading-relaxed">{body}</p>
        </div>
        <span className="flex-none w-10 h-10 rounded-full bg-shortcut-blue/[.06] group-hover:bg-shortcut-coral flex items-center justify-center transition-colors">
          <ArrowUpRight size={18} className="text-shortcut-blue group-hover:text-white transition-colors" strokeWidth={2.5} />
        </span>
      </div>
    </a>
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
      { rootMargin: '-20% 0px -60% 0px' }
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
            <button type="submit" className="w-full py-3 rounded-xl bg-shortcut-blue text-white text-[14px] font-bold hover:bg-shortcut-blue/90 transition-colors">
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
    { id: 'headline', label: 'The Day' },
    { id: 'stations', label: 'Four Stations' },
    { id: 'signup', label: 'Sign-Up Page' },
    { id: 'gallery', label: 'Headshot Gallery' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'logistics', label: 'Logistics' },
  ];

  return (
    <div className="min-h-screen bg-neutral-light-gray font-['Outfit',system-ui,sans-serif]">

      {/* ── Sticky nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-shortcut-blue/[.06]">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="text-[16px] font-extrabold tracking-tight text-shortcut-blue">YW3</div>
            <div className="h-4 w-px bg-shortcut-blue/15" aria-hidden="true" />
            <img src="/shortcut-logo-blue.svg" alt="Shortcut" className="h-4 w-auto" />
            <div className="hidden sm:block ml-1 md:ml-2 pl-3 md:pl-4 border-l border-shortcut-blue/[.12] text-[10px] font-semibold uppercase tracking-wider text-shortcut-blue/40">
              Vendor Response
            </div>
          </div>
          <div className="hidden md:block text-[11px] font-bold uppercase tracking-[.12em] text-shortcut-blue/40">Sep 19, 2026</div>
        </div>
      </nav>

      {/* ── Sidebar contents ── */}
      <aside className="hidden xl:block fixed left-0 top-14 bottom-0 w-56 border-r border-shortcut-blue/[.06] bg-white overflow-y-auto z-40">
        <div className="p-5 pt-8">
          <div className="text-[10px] font-bold uppercase tracking-[.15em] text-shortcut-blue/30 mb-4">Contents</div>
          {tocItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`block py-1.5 text-[12px] font-medium transition-colors ${activeSection === item.id ? 'text-shortcut-blue font-semibold' : 'text-shortcut-blue/40 hover:text-shortcut-blue/70'}`}
            >
              {item.label}
            </a>
          ))}
        </div>
      </aside>

      <main className="xl:ml-56 pt-14">
        <div className="max-w-[1080px] mx-auto px-4 md:px-6 lg:px-10 py-8 md:py-12 space-y-8 md:space-y-12">

          {/* ══ HERO ══ */}
          <Section id="headline">
            <div data-toc id="headline" />
            <div className="relative overflow-hidden rounded-3xl" style={{ backgroundColor: '#F0F0FF' }}>
              <div className="relative z-10 px-6 py-10 md:px-12 md:py-14">
                <div className="flex items-center gap-5 md:gap-7 mb-8 pb-6 border-b border-shortcut-blue/[.1]">
                  <div className="text-[22px] md:text-[28px] font-extrabold tracking-tight text-shortcut-blue">YW3</div>
                  <div className="h-7 md:h-10 w-px bg-shortcut-blue/15" aria-hidden="true" />
                  <img src="/shortcut-logo-blue.svg" alt="Shortcut" className="h-6 md:h-8 w-auto" />
                </div>
                <div className="text-[11px] font-extrabold uppercase tracking-[.18em] text-shortcut-blue/50 mb-3">
                  Netflix Ads · New York + Los Angeles
                </div>
                <h1 className="text-[2.5rem] md:text-[4rem] lg:text-[4.5rem] font-extrabold text-shortcut-blue leading-[1.02] tracking-tight">
                  Four stations.
                  <span className="block text-shortcut-teal-blue">One floor.</span>
                </h1>
                <p className="text-[16px] md:text-[19px] text-text-dark/70 mt-5 font-medium leading-relaxed max-w-[680px]">
                  The day the kit lands, planners walk past four Netflix Ads stations on their own floor and book fifteen minutes each. We bring the Pros, the equipment, the sign-up page and someone to run the day.
                </p>
                <div className="flex flex-wrap gap-3 mt-7">
                  <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm border border-white/60">
                    <Calendar size={14} className="text-shortcut-blue" strokeWidth={2.5} />
                    <span className="text-[13px] font-bold text-shortcut-blue">Week of Jan 11, 2027</span>
                  </div>
                  <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm border border-white/60">
                    <MapPin size={14} className="text-shortcut-blue" strokeWidth={2.5} />
                    <span className="text-[13px] font-bold text-shortcut-blue">New York · Los Angeles</span>
                  </div>
                  <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm border border-white/60">
                    <Clock size={14} className="text-shortcut-blue" strokeWidth={2.5} />
                    <span className="text-[13px] font-bold text-shortcut-blue">One four hour window</span>
                  </div>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-shortcut-teal/40 to-transparent rounded-full -translate-y-1/3 translate-x-1/3" />
              <div className="absolute bottom-0 left-0 w-56 h-56 bg-gradient-to-tr from-accent-pink/30 to-transparent rounded-full translate-y-1/3 -translate-x-1/3" />
            </div>
          </Section>

          {/* ══ STAT TILES ══ */}
          <Section>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
              <StatTile color="navy" value="500+" label="Companies served" sublabel="offices we do not run ourselves" />
              <StatTile color="teal" value="90%+" label="Of slots booked" sublabel="typical fill on an office day" />
              <StatTile color="yellow" value="87%" label="Rebook with Shortcut" sublabel="after the first event" />
              <StatTile color="pink" value="4" label="Stations, one floor" sublabel="one team, one contact, one invoice" />
            </div>
          </Section>

          {/* ══ STATIONS ══ */}
          <Section id="stations">
            <div data-toc id="stations" />
            <div className="card-large">
              <SectionLabel>The floor</SectionLabel>
              <Heading accent="fifteen minutes each.">Four stations,</Heading>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {STATIONS.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.name} className="rounded-2xl border border-shortcut-blue/[.1] p-5 flex flex-col">
                      <span className="w-10 h-10 rounded-full flex items-center justify-center mb-4" style={{ background: s.bg }}>
                        <Icon size={18} className="text-shortcut-blue" strokeWidth={2.5} />
                      </span>
                      <div className="text-[11px] font-extrabold uppercase tracking-[.12em] text-shortcut-blue/40">{s.name}</div>
                      <div className="text-[17px] font-extrabold text-shortcut-blue leading-tight tracking-tight mt-1">{s.service}</div>
                      <p className="text-[13.5px] text-text-dark/70 mt-2 font-medium leading-relaxed">{s.note}</p>
                    </div>
                  );
                })}
              </div>
              <p className="text-[14px] text-text-dark/70 mt-6 font-medium leading-relaxed max-w-[720px]">
                Happy to swap any of the four for facials, mindfulness, a sound bath or yoga. Pros, equipment, setup and cleanup are included at every station.
              </p>
            </div>
          </Section>

          {/* ══ SIGN-UP PAGE ══ */}
          <Section id="signup">
            <div data-toc id="signup" />
            <div className="card-large">
              <SectionLabel>Sign-up page</SectionLabel>
              <Heading
                accent="Here is a live one."
                subtitle="Everything you asked for on the booking link, we can cover. Rather than describe it, open the demo below and book yourself a slot."
              >
                We can do all of it.
              </Heading>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {SIGNUP_ANSWERS.map((a) => {
                  const Icon = a.icon;
                  return (
                    <div key={a.title} className="rounded-2xl border border-shortcut-blue/[.1] p-5 flex gap-4">
                      <span className="flex-none w-10 h-10 rounded-full bg-shortcut-teal/20 flex items-center justify-center">
                        <Icon size={18} className="text-shortcut-blue" strokeWidth={2.5} />
                      </span>
                      <div>
                        <div className="text-[15.5px] font-extrabold text-shortcut-blue leading-tight tracking-tight">{a.title}</div>
                        <p className="text-[13.5px] text-text-dark/70 mt-1.5 font-medium leading-relaxed">{a.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <LinkCard
                href={SIGNUP_DEMO}
                kicker="Try it yourself"
                title="Open the live sign-up demo"
                body="A working Shortcut sign-up page. Pick a service, pick a time, and see exactly what a planner sees on the day."
              />
            </div>
          </Section>

          {/* ══ HEADSHOT GALLERY ══ */}
          <Section id="gallery">
            <div data-toc id="gallery" />
            <div className="card-large">
              <SectionLabel>Get seen</SectionLabel>
              <Heading
                accent="lands in a private gallery."
                subtitle="Headshots are the one station where the value shows up after everybody has gone home. Ours does not end with a memory card handed to the agency."
              >
                Every portrait
              </Heading>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-shortcut-blue/[.1] p-5">
                  <span className="w-10 h-10 rounded-full bg-accent-yellow flex items-center justify-center mb-4">
                    <Camera size={18} className="text-shortcut-blue" strokeWidth={2.5} />
                  </span>
                  <div className="text-[17px] font-extrabold text-shortcut-blue leading-tight tracking-tight">They pick their own</div>
                  <p className="text-[13.5px] text-text-dark/70 mt-2 font-medium leading-relaxed">
                    Each guest gets a private link to their own shots. Nobody browses anybody else&rsquo;s, and nobody is stuck with the frame the photographer liked.
                  </p>
                </div>
                <div className="rounded-2xl border border-shortcut-blue/[.1] p-5">
                  <span className="w-10 h-10 rounded-full bg-shortcut-teal/30 flex items-center justify-center mb-4">
                    <Image size={18} className="text-shortcut-blue" strokeWidth={2.5} />
                  </span>
                  <div className="text-[17px] font-extrabold text-shortcut-blue leading-tight tracking-tight">We retouch the pick</div>
                  <p className="text-[13.5px] text-text-dark/70 mt-2 font-medium leading-relaxed">
                    The selected frame comes back retouched and emailed to them, branded to Netflix Ads, which is the piece that keeps working on LinkedIn long after the kit is off the desk.
                  </p>
                </div>
                <div className="rounded-2xl border border-shortcut-blue/[.1] p-5">
                  <span className="w-10 h-10 rounded-full bg-accent-pink flex items-center justify-center mb-4">
                    <Users size={18} className="text-shortcut-blue" strokeWidth={2.5} />
                  </span>
                  <div className="text-[17px] font-extrabold text-shortcut-blue leading-tight tracking-tight">You see the whole room</div>
                  <p className="text-[13.5px] text-text-dark/70 mt-2 font-medium leading-relaxed">
                    A manager view shows every guest, what they picked and where each portrait stands, so you can tell Netflix Ads exactly what the day produced.
                  </p>
                </div>
              </div>
            </div>
          </Section>

          {/* ══ PRICING ══ */}
          <Section id="pricing">
            <div data-toc id="pricing" />
            <div className="card-large">
              <SectionLabel>Pricing</SectionLabel>
              <Heading
                accent="priced separately."
                subtitle="One office-day, four stations, sized by how many appointments you want at each. Open either proposal and change the numbers; the total moves with you."
              >
                New York and Los Angeles,
              </Heading>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <LinkCard
                  href={PROPOSAL_NY}
                  kicker="Scenario A · New York"
                  title="New York office day"
                  body="Four stations at 25, 50, 75 or 100 appointments each. Pick per station and watch the total update."
                />
                <LinkCard
                  href={PROPOSAL_LA}
                  kicker="Scenario A · Los Angeles"
                  title="Los Angeles office day"
                  body="The same four stations, priced for the LA market and the same set of sizes."
                />
              </div>
              <div className="mt-5 rounded-2xl bg-shortcut-blue p-6 md:p-7">
                <div className="text-[11px] font-extrabold uppercase tracking-[.14em] text-shortcut-teal mb-2">Scenario B · the week</div>
                <div className="text-[19px] md:text-[22px] font-extrabold text-white leading-tight tracking-tight">
                  Five office-days in one week counts as a program.
                </div>
                <p className="text-[14.5px] text-white/70 mt-2.5 font-medium leading-relaxed max-w-[640px]">
                  Ten percent comes off Pro time on every day of the week. Nine or more office-days in a year moves the whole program to fifteen percent off.
                </p>
              </div>
            </div>
          </Section>

          {/* ══ LOGISTICS ══ */}
          <Section id="logistics">
            <div data-toc id="logistics" />
            <div className="card-large">
              <SectionLabel>The boring, important part</SectionLabel>
              <Heading accent="before you have to ask.">Handled</Heading>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: ShieldCheck, t: 'COI, named the way the building wants it', b: 'Certificates naming the agency building and Netflix Ads as additional insured, sent to building management ahead of the day.' },
                  { icon: FileCheck, t: 'Licensed Pros in both states', b: 'New York and California licensure on file for every Pro who works the floor.' },
                  { icon: Clock, t: 'Space that moves', b: 'Stations are built for a conference room or an open floor, so a late room change is not a problem.' },
                  { icon: Calendar, t: 'Reschedules happen', b: 'Floor access pulled, snow in New York. Tell us and we move the day rather than charge for it.' },
                ].map((x) => {
                  const Icon = x.icon;
                  return (
                    <div key={x.t} className="rounded-2xl border border-shortcut-blue/[.1] p-5 flex gap-4">
                      <span className="flex-none w-10 h-10 rounded-full bg-shortcut-blue/[.06] flex items-center justify-center">
                        <Icon size={18} className="text-shortcut-blue" strokeWidth={2.5} />
                      </span>
                      <div>
                        <div className="text-[15.5px] font-extrabold text-shortcut-blue leading-tight tracking-tight">{x.t}</div>
                        <p className="text-[13.5px] text-text-dark/70 mt-1.5 font-medium leading-relaxed">{x.b}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Section>

          <Section>
            <div className="text-center py-6">
              <div className="text-[11px] font-bold uppercase tracking-[.14em] text-shortcut-blue/40">
                Confidential · prepared for YW3 Brand Experience
              </div>
            </div>
          </Section>

        </div>
      </main>
    </div>
  );
}
