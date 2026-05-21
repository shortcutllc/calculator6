import { useEffect, useRef, useState } from 'react';
import { Users, DollarSign, MapPin, Calendar, Scissors, Heart, Hand, Flower2, AlertTriangle, Mail, Smartphone, Package } from 'lucide-react';

/* ─────────────────────────────────────────────
   DraftKings × Shortcut — Las Vegas Restructure
   LV-only viewer (Main LV + Trader Monthly Perks)
   Trailing 6 months: Nov 13 2025 – May 13 2026
   ───────────────────────────────────────────── */

const SERVICES = {
  Hair: { bg: '#FEDC64', tint: '#FFF6CC', deep: '#92750C', icon: Scissors, label: 'Hair' },
  Massage: { bg: '#9EFAFF', tint: '#E2FAFC', deep: '#015F6E', icon: Heart, label: 'Massage' },
  Nails: { bg: '#F7BBFF', tint: '#FBE0FF', deep: '#7A3490', icon: Hand, label: 'Nails' },
  Beauty: { bg: '#FFB3B3', tint: '#FFE0E0', deep: '#A23535', icon: Flower2, label: 'Beauty · Facial' },
} as const;

type ServiceKey = keyof typeof SERVICES;

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

function SectionHeading({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <div className="mb-8 md:mb-10">
      <h2 className="text-[1.75rem] md:text-[2.5rem] font-extrabold text-shortcut-blue leading-[1.05] tracking-tight">
        {children}
      </h2>
      {subtitle && (
        <p className="text-[15px] md:text-[17px] text-text-dark/70 mt-3 font-medium leading-relaxed max-w-[680px]">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function HeroStat({ value, label, sublabel, color = 'navy' }: {
  value: string;
  label: string;
  sublabel?: string;
  color?: 'navy' | 'teal' | 'coral' | 'yellow' | 'pink';
}) {
  const styles = {
    navy: 'bg-shortcut-blue text-white',
    teal: 'bg-shortcut-teal text-shortcut-blue',
    coral: 'bg-shortcut-coral text-white',
    yellow: 'bg-accent-yellow text-shortcut-blue',
    pink: 'bg-accent-pink text-shortcut-blue',
  };
  const valueColor = {
    navy: 'text-shortcut-teal',
    teal: 'text-shortcut-blue',
    coral: 'text-white',
    yellow: 'text-shortcut-blue',
    pink: 'text-shortcut-blue',
  };
  return (
    <div className={`rounded-3xl p-6 md:p-7 shadow-lg ${styles[color]}`}>
      <div className={`text-[2.5rem] md:text-[3.25rem] font-extrabold leading-none tracking-tight tabular-nums ${valueColor[color]}`}>
        {value}
      </div>
      <div className="text-[13px] md:text-[14px] font-bold uppercase tracking-[.08em] mt-3 opacity-90">{label}</div>
      {sublabel && (
        <div className="text-[12px] font-medium mt-1.5 opacity-60 leading-relaxed">{sublabel}</div>
      )}
    </div>
  );
}

// Service summary card: events, employees served, fill rate, waitlist
function ServiceSnapshot({
  service,
  scope,
  events,
  employees,
  fillRate,
  waitlistAvg,
  isUnderfill,
}: {
  service: ServiceKey;
  scope: string;
  events: number;
  employees: string;
  fillRate: string;
  waitlistAvg: string;
  isUnderfill?: boolean;
}) {
  const s = SERVICES[service];
  const Icon = s.icon;
  return (
    <div
      className="rounded-2xl p-5 md:p-6 border border-white/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
      style={{ backgroundColor: s.tint }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full flex items-center justify-center shadow-sm" style={{ backgroundColor: s.bg }}>
            <Icon size={18} className="text-shortcut-blue" strokeWidth={2.25} />
          </div>
          <div>
            <div className="text-[13px] font-extrabold text-shortcut-blue tracking-tight">{s.label}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-shortcut-blue/50 mt-0.5">{scope}</div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[.1em] text-shortcut-blue/50 mb-0.5">Events</div>
            <div className="text-[1.4rem] font-extrabold text-shortcut-blue leading-none tabular-nums">{events}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[.1em] text-shortcut-blue/50 mb-0.5">Avg fill</div>
            <div className={`text-[1.4rem] font-extrabold leading-none tabular-nums ${isUnderfill ? 'text-shortcut-coral' : 'text-shortcut-blue'}`}>{fillRate}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-shortcut-blue/[.08]">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[.1em] text-shortcut-blue/50 mb-0.5">Employees / mo</div>
            <div className="text-[15px] font-bold text-shortcut-blue tabular-nums">{employees}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[.1em] text-shortcut-blue/50 mb-0.5">Avg waitlist</div>
            <div className="text-[15px] font-bold text-shortcut-blue tabular-nums">{waitlistAvg}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// LV monthly bar visualization (combined Main LV + Trader)
function LVMonthlyBars() {
  // Combined LV spend per month (Main LV + Trader, base $ paid to Shortcut)
  const months = [
    { label: 'Nov *', events: 4, paid: 3024, partial: true },
    { label: 'Dec', events: 6, paid: 4032, peak: false },
    { label: 'Jan', events: 7, paid: 4500, peak: false },
    { label: 'Feb', events: 8, paid: 5547, peak: true },
    { label: 'Mar', events: 7, paid: 5079, peak: false },
    { label: 'Apr', events: 7, paid: 5174, peak: false },
    { label: 'May *', events: 2, paid: 1806, partial: true },
  ];
  const maxPaid = Math.max(...months.map(m => m.paid));

  return (
    <div className="card-large">
      <div className="flex items-baseline justify-between mb-7 flex-wrap gap-2">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[.12em] text-shortcut-blue/40 mb-1">Monthly LV spend</div>
          <h3 className="text-[20px] md:text-[22px] font-extrabold text-shortcut-blue">Combined Main LV + Trader, by month</h3>
        </div>
        <div className="text-[12px] font-semibold text-shortcut-blue/50">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-accent-yellow mr-1.5 align-middle" />
          peak month
        </div>
      </div>

      <div className="space-y-3">
        {months.map(m => {
          const pct = (m.paid / maxPaid) * 100;
          const barColor = m.peak ? 'bg-accent-yellow' : m.partial ? 'bg-shortcut-blue/20' : 'bg-shortcut-teal';
          const allIn = Math.round(m.paid * 1.20);
          return (
            <div key={m.label} className="grid grid-cols-[60px_1fr_140px] md:grid-cols-[80px_1fr_200px] gap-3 md:gap-4 items-center">
              <div className="text-[13px] md:text-[14px] font-bold text-shortcut-blue tabular-nums">{m.label}</div>
              <div className="relative h-9 rounded-lg bg-shortcut-blue/[.04]">
                <div
                  className={`absolute inset-y-0 left-0 rounded-lg ${barColor} transition-all duration-700 ease-out flex items-center px-3`}
                  style={{ width: `${pct}%` }}
                >
                  <span className={`text-[11px] md:text-[12px] font-extrabold tabular-nums ${m.peak ? 'text-shortcut-blue' : m.partial ? 'text-shortcut-blue/70' : 'text-shortcut-blue'}`}>
                    ${m.paid.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="text-[11px] md:text-[12px] text-shortcut-blue/60 font-semibold text-right tabular-nums">
                {m.events} events · <span className="text-shortcut-blue/40">${allIn.toLocaleString()} all-in</span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-[12px] text-shortcut-blue/50 font-medium">* Partial months — window starts Nov 13, ends May 13. Base figures shown on bars; all-in (with 20% gratuity) at right.</p>
    </div>
  );
}

// ══════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════

export default function DraftKingsLVReport() {
  const [authenticated, setAuthenticated] = useState(() => {
    return sessionStorage.getItem('draftkings-auth') === 'true';
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'DKSC2026') {
      sessionStorage.setItem('draftkings-auth', 'true');
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
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActiveSection(e.target.id);
        });
      },
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
            <div className="inline-flex items-center gap-3 mb-4">
              <img src="/Holiday Proposal/Parnter Logos/DraftKings.svg" alt="DraftKings" className="h-7 w-auto" />
              <div className="h-5 w-px bg-shortcut-blue/15" aria-hidden="true" />
              <img src="/shortcut-logo-blue.svg" alt="Shortcut" className="h-5 w-auto" />
            </div>
            <div className="text-[12px] text-shortcut-blue/50 font-medium">Las Vegas Restructure</div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(false); }}
                placeholder="Enter password"
                autoFocus
                className={`w-full px-4 py-3 rounded-xl border ${error ? 'border-shortcut-coral bg-red-50/30' : 'border-shortcut-blue/[.12]'} text-[15px] text-shortcut-blue font-medium placeholder:text-shortcut-blue/30 focus:outline-none focus:border-shortcut-blue/30 focus:ring-2 focus:ring-shortcut-teal/40 transition-colors`}
              />
              {error && <p className="mt-2 text-[13px] text-shortcut-coral font-medium">Incorrect password.</p>}
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-shortcut-blue text-white text-[14px] font-bold hover:bg-shortcut-blue/90 transition-colors"
            >
              View Report
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
    { id: 'spend', label: 'Current Spend' },
    { id: 'snapshot', label: 'Six-Month Snapshot' },
    { id: 'trader', label: 'Trader Perks Detail' },
    { id: 'timeline', label: 'Monthly Timeline' },
    { id: 'waitlist', label: 'Waitlist Demand' },
    { id: 'restructure', label: 'The Restructure' },
    { id: 'methodology', label: 'Methodology' },
  ];

  return (
    <div className="min-h-screen bg-neutral-light-gray font-['Outfit',system-ui,sans-serif]">

      {/* ── Sticky nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-shortcut-blue/[.06]">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <img src="/Holiday Proposal/Parnter Logos/DraftKings.svg" alt="DraftKings" className="h-6 w-auto" />
            <div className="h-4 w-px bg-shortcut-blue/15" aria-hidden="true" />
            <img src="/shortcut-logo-blue.svg" alt="Shortcut" className="h-4 w-auto" />
            <div className="hidden sm:block ml-1 md:ml-2 pl-3 md:pl-4 border-l border-shortcut-blue/[.12] text-[10px] font-semibold uppercase tracking-wider text-shortcut-blue/40">
              Las Vegas Restructure
            </div>
          </div>
          <div className="hidden md:block text-[11px] font-bold uppercase tracking-[.12em] text-shortcut-blue/40">Nov 2025 – May 2026</div>
        </div>
      </nav>

      {/* ── Sidebar TOC (desktop) ── */}
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

      {/* ── Main content ── */}
      <main className="xl:ml-56 pt-14">
        <div className="max-w-[1080px] mx-auto px-4 md:px-6 lg:px-10 py-8 md:py-12 space-y-8 md:space-y-12">

          {/* ══════════════════════════════════════════
              HERO
              ══════════════════════════════════════════ */}
          <Section>
            <div className="relative overflow-hidden rounded-3xl" style={{ backgroundColor: '#F0F0FF' }}>
              <div className="relative z-10 px-6 py-10 md:px-12 md:py-14">
                {/* Co-branded logo lockup */}
                <div className="flex items-center gap-5 md:gap-7 mb-8 pb-6 border-b border-shortcut-blue/[.1]">
                  <img src="/Holiday Proposal/Parnter Logos/DraftKings.svg" alt="DraftKings" className="h-9 md:h-12 w-auto" />
                  <div className="h-7 md:h-10 w-px bg-shortcut-blue/15" aria-hidden="true" />
                  <img src="/shortcut-logo-blue.svg" alt="Shortcut" className="h-6 md:h-8 w-auto" />
                </div>
                <div className="text-[11px] font-extrabold uppercase tracking-[.18em] text-shortcut-blue/50 mb-3">
                  Las Vegas · trailing 6 months
                </div>
                <h1 className="text-[2.5rem] md:text-[4rem] lg:text-[4.5rem] font-extrabold text-shortcut-blue leading-[1.02] tracking-tight">
                  An LV restructure,
                  <span className="block text-shortcut-teal-blue">built on the data.</span>
                </h1>
                <p className="text-[16px] md:text-[19px] text-text-dark/70 mt-5 font-medium leading-relaxed max-w-[680px]">
                  Six months of Las Vegas event history, followed by two options to hit your monthly LV budget. Numbers reflect Main LV and Trader Monthly Perks combined.
                </p>

                <div className="flex flex-wrap gap-3 mt-7">
                  <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm border border-white/60">
                    <MapPin size={14} className="text-shortcut-blue" strokeWidth={2.5} />
                    <span className="text-[13px] font-bold text-shortcut-blue">Las Vegas, NV</span>
                  </div>
                  <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm border border-white/60">
                    <Calendar size={14} className="text-shortcut-blue" strokeWidth={2.5} />
                    <span className="text-[13px] font-bold text-shortcut-blue">47 events delivered</span>
                  </div>
                  <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm border border-white/60">
                    <Users size={14} className="text-shortcut-blue" strokeWidth={2.5} />
                    <span className="text-[13px] font-bold text-shortcut-blue">655 employees served</span>
                  </div>
                </div>
              </div>

              <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-shortcut-teal/40 to-transparent rounded-full -translate-y-1/3 translate-x-1/3" />
              <div className="absolute bottom-0 left-0 w-56 h-56 bg-gradient-to-tr from-accent-pink/30 to-transparent rounded-full translate-y-1/3 -translate-x-1/3" />
            </div>
          </Section>

          {/* ══════════════════════════════════════════
              HEADLINE STATS
              ══════════════════════════════════════════ */}
          <Section>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
              <HeroStat value="99%" label="Main LV Peak Fill" sublabel="100% across every service" color="teal" />
              <HeroStat value="47" label="Events Delivered" sublabel="34 Main · 13 Trader" color="navy" />
              <HeroStat value="655" label="Appointments Served" sublabel="~109 / month" color="yellow" />
              <HeroStat value="$7,952" label="Current All-In / mo" sublabel="includes 20% gratuity" color="pink" />
            </div>
          </Section>

          {/* ══════════════════════════════════════════
              CURRENT SPEND
              ══════════════════════════════════════════ */}
          <Section id="spend">
            <div data-toc id="spend" />
            <div className="card-large">
              <div className="mb-6 md:mb-7">
                <div className="text-[11px] font-bold uppercase tracking-[.12em] text-shortcut-blue/40 mb-1">Current Vegas spend</div>
                <h2 className="text-[1.75rem] md:text-[2.25rem] font-extrabold text-shortcut-blue leading-tight">
                  What Vegas costs
                  <span className="text-shortcut-teal-blue"> today.</span>
                </h2>
                <p className="mt-2 text-[14px] md:text-[15px] text-text-dark/70 font-medium leading-relaxed max-w-[640px]">
                  Both Vegas programs, averaged across the trailing 6 months. Two figures per row: what was paid to Shortcut, and the all-in cost including DraftKings' 20% gratuity per event.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full bg-accent-yellow/25 border border-accent-yellow/50">
                <DollarSign size={13} className="text-shortcut-blue" strokeWidth={2.5} />
                <span className="text-[11px] md:text-[12px] font-extrabold text-shortcut-blue uppercase tracking-wider">
                  DraftKings adds 20% gratuity to every event
                </span>
              </div>

              <div className="hidden md:grid grid-cols-[auto_1fr_1fr_1fr] gap-6 items-end pb-3 border-b border-shortcut-blue/[.1]">
                <div className="w-2.5" />
                <div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-shortcut-blue/40">Program</div>
                <div className="text-right text-[10px] font-extrabold uppercase tracking-[.1em] text-shortcut-blue/40">Paid to Shortcut</div>
                <div className="text-right text-[10px] font-extrabold uppercase tracking-[.1em] text-shortcut-blue">All-in <span className="text-shortcut-blue/50 font-bold">(+ 20% grat)</span></div>
              </div>

              <div className="space-y-1">
                {[
                  { dot: 'bg-shortcut-blue', name: 'Main LV program', detail: 'Hair · Massage · Nails · Beauty', avgBase: 5521, total6Base: 33123 },
                  { dot: 'bg-shortcut-coral', name: 'Trader Monthly Perks', detail: 'Hair · Massage', avgBase: 1106, total6Base: 6636 },
                ].map((row, i) => {
                  const avgAllIn = Math.round(row.avgBase * 1.20);
                  const total6AllIn = Math.round(row.total6Base * 1.20);
                  const fmt = (n: number) => '$' + n.toLocaleString();
                  return (
                    <div
                      key={i}
                      className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1fr_1fr_1fr] gap-3 md:gap-6 items-center py-4 border-b border-shortcut-blue/[.06]"
                    >
                      <div className={`w-2.5 h-2.5 rounded-full ${row.dot}`} />
                      <div>
                        <div className="text-[15px] md:text-[16px] font-extrabold text-shortcut-blue leading-tight">{row.name}</div>
                        <div className="text-[12px] md:text-[13px] text-shortcut-blue/50 font-medium mt-0.5">{row.detail}</div>
                      </div>
                      <div className="hidden md:block text-right">
                        <div className="text-[16px] font-bold text-shortcut-blue/70 tabular-nums leading-tight">{fmt(row.avgBase)} <span className="text-[11px] font-semibold text-shortcut-blue/40">/ mo</span></div>
                        <div className="text-[11px] text-shortcut-blue/40 font-medium tabular-nums mt-0.5">{fmt(row.total6Base)} over 6 mo</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[18px] md:text-[20px] font-extrabold text-shortcut-blue tabular-nums leading-tight">{fmt(avgAllIn)} <span className="text-[11px] font-semibold text-shortcut-blue/50">/ mo</span></div>
                        <div className="text-[11px] text-shortcut-blue/50 font-semibold tabular-nums mt-0.5 md:hidden">vs. {fmt(row.avgBase)} paid · base</div>
                        <div className="hidden md:block text-[11px] text-shortcut-blue/50 font-medium tabular-nums mt-0.5">{fmt(total6AllIn)} over 6 mo</div>
                      </div>
                    </div>
                  );
                })}

                {/* Total row */}
                <div className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1fr_1fr_1fr] gap-3 md:gap-6 items-center py-5 mt-2 rounded-2xl bg-shortcut-blue px-4 md:px-5">
                  <div className="w-2.5 h-2.5 rounded-full bg-shortcut-teal" />
                  <div>
                    <div className="text-[15px] md:text-[16px] font-extrabold text-white leading-tight">Las Vegas total</div>
                    <div className="text-[12px] md:text-[13px] text-white/50 font-medium mt-0.5">Both programs combined</div>
                  </div>
                  <div className="hidden md:block text-right">
                    <div className="text-[16px] font-bold text-white/70 tabular-nums leading-tight">$6,627 <span className="text-[11px] font-semibold text-white/40">/ mo</span></div>
                    <div className="text-[11px] text-white/40 font-medium tabular-nums mt-0.5">$39,759 over 6 mo</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[18px] md:text-[22px] font-extrabold text-shortcut-teal tabular-nums leading-tight">$7,952 <span className="text-[11px] font-semibold text-white/60">/ mo</span></div>
                    <div className="text-[11px] text-white/60 font-semibold tabular-nums mt-0.5 md:hidden">vs. $6,627 paid · base</div>
                    <div className="hidden md:block text-[11px] text-white/60 font-medium tabular-nums mt-0.5">$47,711 over 6 mo</div>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* ══════════════════════════════════════════
              WHAT'S IN THE NUMBER (caveat)
              ══════════════════════════════════════════ */}
          <Section>
            <div className="rounded-3xl bg-white border border-shortcut-blue/[.08] p-7 md:p-10 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
              <div className="mb-7 md:mb-8">
                <div className="text-[11px] font-extrabold uppercase tracking-[.15em] text-shortcut-blue/40 mb-2">What's in the number</div>
                <h2 className="text-[1.75rem] md:text-[2.25rem] font-extrabold text-shortcut-blue leading-tight">
                  What every event
                  <span className="block text-shortcut-teal-blue">includes.</span>
                </h2>
                <p className="mt-3 text-[14px] md:text-[15px] text-text-dark/70 font-medium leading-relaxed max-w-[680px]">
                  Every per-employee number in this report reflects the full service Shortcut delivers at every event.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {[
                  { Icon: Users, tint: 'bg-shortcut-teal/30', title: 'Consistent pros', body: 'Same trusted barbers, LMTs, and technicians at each location. No rotating cast.' },
                  { Icon: Mail, tint: 'bg-accent-yellow/40', title: 'Light lift on your side', body: 'Your team doesn\'t run scheduling, communications, or day-of logistics. We do.' },
                  { Icon: Smartphone, tint: 'bg-accent-pink/30', title: 'Technology built in', body: 'Employees book through our platform with automated reminders and confirmations.' },
                  { Icon: Package, tint: 'bg-shortcut-coral/15', title: 'Supplies always stocked', body: 'Equipment, products, and setup arrive with every event. We keep things replenished between visits.' },
                ].map((tile, i) => {
                  const { Icon } = tile;
                  return (
                    <div
                      key={i}
                      className="rounded-2xl p-5 md:p-6 border border-shortcut-blue/[.06] bg-white hover:-translate-y-1 hover:shadow-md transition-all duration-300"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm mb-4 ${tile.tint}`}>
                        <Icon size={18} className="text-shortcut-blue" strokeWidth={2.25} />
                      </div>
                      <h4 className="text-[15px] md:text-[16px] font-extrabold text-shortcut-blue leading-tight mb-1.5">{tile.title}</h4>
                      <p className="text-[13px] text-text-dark/70 font-medium leading-relaxed">{tile.body}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </Section>

          {/* ══════════════════════════════════════════
              SIX-MONTH SNAPSHOT (by service, no $)
              ══════════════════════════════════════════ */}
          <Section id="snapshot">
            <div data-toc id="snapshot" />
            <SectionLabel>Section I · Six-Month Snapshot</SectionLabel>
            <SectionHeading subtitle="Every Vegas event we ran, grouped by service. No-cost view — focus on volume, fill, and waitlist.">
              How Vegas actually
              <span className="block text-shortcut-teal-blue">used the program.</span>
            </SectionHeading>

            <div className="mb-5">
              <div className="text-[11px] font-extrabold uppercase tracking-[.12em] text-shortcut-blue/40 mb-2">Main LV program</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
              <ServiceSnapshot service="Hair" scope="Main LV" events={11} employees="36.5" fillRate="100%" waitlistAvg="5.6" />
              <ServiceSnapshot service="Massage" scope="Main LV" events={10} employees="36.5" fillRate="100%" waitlistAvg="3.4" />
              <ServiceSnapshot service="Nails" scope="Main LV" events={8} employees="12.5" fillRate="100%" waitlistAvg="4.5" />
              <ServiceSnapshot service="Beauty" scope="Main LV" events={4} employees="6.5" fillRate="100%" waitlistAvg="3.5" />
            </div>

            {/* Monthly cadence table for Main LV */}
            <div className="card-large mb-8">
              <div className="mb-6">
                <div className="text-[11px] font-bold uppercase tracking-[.12em] text-shortcut-blue/40 mb-1">Main LV · month by month</div>
                <h3 className="text-[18px] md:text-[20px] font-extrabold text-shortcut-blue leading-tight">
                  Events run and appointments served, per service, per month.
                </h3>
                <p className="mt-2 text-[13px] md:text-[14px] text-text-dark/70 font-medium leading-relaxed max-w-[640px]">
                  Each cell shows <strong>events run · appointments served</strong>. Bi-weekly cadence holds for Hair and Massage every month; Nails and Beauty rotate.
                </p>
              </div>

              <div className="overflow-x-auto -mx-2 px-2">
                <table className="w-full text-left border-collapse min-w-[760px]">
                  <thead>
                    <tr>
                      <th className="py-3 px-3 text-[10px] font-extrabold uppercase tracking-[.1em] text-shortcut-blue/40 border-b border-shortcut-blue/10">Month</th>
                      {(['Hair', 'Massage', 'Nails', 'Beauty'] as ServiceKey[]).map(svc => {
                        const s = SERVICES[svc];
                        const Icon = s.icon;
                        return (
                          <th key={svc} className="py-3 px-3 text-center border-b border-shortcut-blue/10">
                            <div className="flex items-center justify-center gap-1.5">
                              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: s.bg }}>
                                <Icon size={11} className="text-shortcut-blue" strokeWidth={2.5} />
                              </div>
                              <span className="text-[10px] font-extrabold uppercase tracking-[.05em] text-shortcut-blue/70">{svc}</span>
                            </div>
                          </th>
                        );
                      })}
                      <th className="py-3 px-3 text-right text-[10px] font-extrabold uppercase tracking-[.1em] text-shortcut-blue/40 border-b border-shortcut-blue/10">Events</th>
                      <th className="py-3 px-3 text-right text-[10px] font-extrabold uppercase tracking-[.1em] text-shortcut-blue/40 border-b border-shortcut-blue/10">Appts</th>
                      <th className="py-3 px-3 text-right text-[10px] font-extrabold uppercase tracking-[.1em] text-shortcut-blue border-b border-shortcut-blue/10">Paid <span className="text-shortcut-blue/50 font-bold">/ All-in</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { month: 'Nov 2025 *', partial: true,  peak: false, Hair: null,             Massage: { ev: 1, sv: 24 }, Nails: { ev: 2, sv: 20 }, Beauty: null,             totalEv: 3, totalAp: 44,  paid: 2208 },
                      { month: 'Dec 2025',   partial: false, peak: false, Hair: { ev: 2, sv: 40 }, Massage: null,             Nails: { ev: 2, sv: 18 }, Beauty: null,             totalEv: 4, totalAp: 58,  paid: 3780 },
                      { month: 'Jan 2026',   partial: false, peak: false, Hair: { ev: 2, sv: 40 }, Massage: { ev: 2, sv: 44 }, Nails: null,             Beauty: { ev: 2, sv: 20 }, totalEv: 6, totalAp: 104, paid: 5796 },
                      { month: 'Feb 2026',   partial: false, peak: true,  Hair: { ev: 2, sv: 40 }, Massage: { ev: 3, sv: 59 }, Nails: { ev: 2, sv: 19 }, Beauty: null,             totalEv: 7, totalAp: 118, paid: 6951 },
                      { month: 'Mar 2026',   partial: false, peak: false, Hair: { ev: 2, sv: 40 }, Massage: { ev: 2, sv: 44 }, Nails: { ev: 2, sv: 17 }, Beauty: null,             totalEv: 6, totalAp: 101, paid: 5934 },
                      { month: 'Apr 2026',   partial: false, peak: false, Hair: { ev: 2, sv: 38 }, Massage: { ev: 2, sv: 48 }, Nails: null,             Beauty: { ev: 2, sv: 19 }, totalEv: 6, totalAp: 105, paid: 5904 },
                      { month: 'May 2026 *', partial: true,  peak: false, Hair: { ev: 1, sv: 21 }, Massage: null,             Nails: null,             Beauty: null,             totalEv: 1, totalAp: 21,  paid: 1290 },
                    ].map((row, i) => {
                      const allIn = Math.round(row.paid * 1.20);
                      return (
                        <tr key={i} className={`border-b border-shortcut-blue/[.06] ${row.peak ? 'bg-accent-yellow/15' : 'hover:bg-shortcut-blue/[.02]'} transition-colors`}>
                          <td className="py-3 px-3">
                            <span className={`text-[13px] font-extrabold tabular-nums ${row.partial ? 'text-shortcut-blue/50' : 'text-shortcut-blue'}`}>{row.month}</span>
                            {row.peak && <span className="ml-2 text-[10px] font-extrabold uppercase tracking-wider text-shortcut-blue bg-accent-yellow px-1.5 py-0.5 rounded">Peak</span>}
                          </td>
                          {(['Hair', 'Massage', 'Nails', 'Beauty'] as ServiceKey[]).map(svc => {
                            const cell = row[svc];
                            return (
                              <td key={svc} className="py-3 px-3 text-center">
                                {cell ? (
                                  <div>
                                    <div className="text-[14px] font-extrabold text-shortcut-blue tabular-nums leading-tight">{cell.ev}</div>
                                    <div className="text-[10px] text-shortcut-blue/50 font-semibold tabular-nums">{cell.sv} served</div>
                                  </div>
                                ) : (
                                  <span className="text-[14px] text-shortcut-blue/20 font-medium">—</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="py-3 px-3 text-right">
                            <span className={`text-[14px] font-extrabold tabular-nums ${row.partial ? 'text-shortcut-blue/50' : 'text-shortcut-blue'}`}>{row.totalEv}</span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className={`text-[14px] font-extrabold tabular-nums ${row.partial ? 'text-shortcut-blue/50' : 'text-shortcut-blue'}`}>{row.totalAp}</span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className={`text-[14px] font-extrabold tabular-nums leading-tight ${row.partial ? 'text-shortcut-blue/50' : 'text-shortcut-blue'}`}>${row.paid.toLocaleString()}</div>
                            <div className={`text-[10px] font-semibold tabular-nums leading-tight mt-0.5 ${row.partial ? 'text-shortcut-blue/30' : 'text-shortcut-blue/50'}`}>${allIn.toLocaleString()} all-in</div>
                          </td>
                        </tr>
                      );
                    })}
                    {/* 6-month total */}
                    <tr className="bg-shortcut-blue">
                      <td className="py-4 px-3 text-[13px] font-extrabold text-white">6-month total</td>
                      <td className="py-4 px-3 text-center">
                        <div className="text-[14px] font-extrabold text-shortcut-teal tabular-nums">11</div>
                        <div className="text-[10px] text-white/60 font-semibold tabular-nums">219 served</div>
                      </td>
                      <td className="py-4 px-3 text-center">
                        <div className="text-[14px] font-extrabold text-shortcut-teal tabular-nums">10</div>
                        <div className="text-[10px] text-white/60 font-semibold tabular-nums">219 served</div>
                      </td>
                      <td className="py-4 px-3 text-center">
                        <div className="text-[14px] font-extrabold text-shortcut-teal tabular-nums">8</div>
                        <div className="text-[10px] text-white/60 font-semibold tabular-nums">74 served</div>
                      </td>
                      <td className="py-4 px-3 text-center">
                        <div className="text-[14px] font-extrabold text-shortcut-teal tabular-nums">4</div>
                        <div className="text-[10px] text-white/60 font-semibold tabular-nums">39 served</div>
                      </td>
                      <td className="py-4 px-3 text-right text-[15px] font-extrabold text-shortcut-teal tabular-nums">33</td>
                      <td className="py-4 px-3 text-right text-[15px] font-extrabold text-shortcut-teal tabular-nums">551</td>
                      <td className="py-4 px-3 text-right">
                        <div className="text-[15px] font-extrabold text-shortcut-teal tabular-nums leading-tight">$31,863</div>
                        <div className="text-[10px] text-white/60 font-semibold tabular-nums leading-tight mt-0.5">$38,236 all-in</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="mt-5 text-[12px] text-shortcut-blue/50 font-medium">* Partial months — window starts Nov 13, ends May 13. Bi-weekly cadence on Hair and Massage; Nails / Beauty alternate roughly monthly. "Paid" is what was billed to Shortcut; "All-in" adds DraftKings' 20% gratuity.</p>
            </div>

            <div className="mb-5">
              <div className="text-[11px] font-extrabold uppercase tracking-[.12em] text-shortcut-blue/40 mb-2">Trader Monthly Perks</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <ServiceSnapshot service="Hair" scope="Trader" events={7} employees="9.3" fillRate="100%" waitlistAvg="1.6" />
              <ServiceSnapshot service="Massage" scope="Trader" events={6} employees="5.7" fillRate="54%" waitlistAvg="0.2" isUnderfill />
            </div>

            <div className="mt-6 card-medium" style={{ backgroundColor: '#F0F0FF' }}>
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-9 h-9 rounded-full bg-shortcut-teal/40 flex items-center justify-center mt-0.5">
                  <Users size={16} className="text-shortcut-blue" strokeWidth={2.5} />
                </div>
                <div className="text-[14px] text-text-dark/75 font-medium leading-relaxed">
                  <strong className="text-shortcut-blue">Across Main LV, every service fills 100%.</strong> Hair, Massage, Nails, and Beauty events all reach capacity at booking. The one consistently underfilled program is <strong className="text-shortcut-blue">Trader Massage</strong> at 54% average fill — covered separately in the next section.
                </div>
              </div>
            </div>
          </Section>

          {/* ══════════════════════════════════════════
              TRADER PERKS DETAIL — Hair vs Massage
              ══════════════════════════════════════════ */}
          <Section id="trader">
            <div data-toc id="trader" />
            <SectionLabel>Section II · Trader Perks Detail</SectionLabel>
            <SectionHeading subtitle="Within the Trader Monthly Perks sub-program in Vegas, the two service types have radically different demand profiles. Main LV is not affected — every Main LV service fills 100%.">
              Trader Hair fills the room.
              <span className="block text-shortcut-teal-blue">Trader Massage doesn't.</span>
            </SectionHeading>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              {/* Hair */}
              <div className="rounded-3xl p-7 md:p-9 shadow-lg" style={{ backgroundColor: SERVICES.Hair.tint }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-sm" style={{ backgroundColor: SERVICES.Hair.bg }}>
                    <Scissors size={22} className="text-shortcut-blue" strokeWidth={2.25} />
                  </div>
                  <div>
                    <div className="text-[11px] font-extrabold uppercase tracking-[.12em] text-shortcut-blue/50">Trader · Hair</div>
                    <h3 className="text-[20px] font-extrabold text-shortcut-blue">Filling 100% every time</h3>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[.1em] text-shortcut-blue/50 mb-1">Events</div>
                    <div className="text-[2.5rem] font-extrabold text-shortcut-blue leading-none">7</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[.1em] text-shortcut-blue/50 mb-1">Reached 100%</div>
                    <div className="text-[2.5rem] font-extrabold text-shortcut-blue leading-none">100%</div>
                  </div>
                  <div className="col-span-2 pt-4 border-t border-shortcut-blue/[.1]">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-shortcut-blue/60 font-medium">Slots filled</span>
                      <span className="text-[15px] font-extrabold text-shortcut-blue tabular-nums">56 / 56</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Massage */}
              <div className="rounded-3xl p-7 md:p-9 shadow-lg" style={{ backgroundColor: '#FFE0E0' }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-sm bg-shortcut-coral">
                    <AlertTriangle size={22} className="text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="text-[11px] font-extrabold uppercase tracking-[.12em] text-shortcut-coral/70">Trader · Massage</div>
                    <h3 className="text-[20px] font-extrabold text-shortcut-blue">Consistently underfilling</h3>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[.1em] text-shortcut-blue/50 mb-1">Events</div>
                    <div className="text-[2.5rem] font-extrabold text-shortcut-blue leading-none">6</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[.1em] text-shortcut-blue/50 mb-1">Reached 100%</div>
                    <div className="text-[2.5rem] font-extrabold text-shortcut-coral leading-none">0%</div>
                  </div>
                  <div className="col-span-2 pt-4 border-t border-shortcut-blue/[.1]">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-shortcut-blue/60 font-medium">Slots filled</span>
                      <span className="text-[15px] font-extrabold text-shortcut-blue tabular-nums">39 / 72</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[13px] text-shortcut-blue/60 font-medium">Avg peak fill</span>
                      <span className="text-[15px] font-extrabold text-shortcut-blue tabular-nums">54.2%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* ══════════════════════════════════════════
              MONTHLY TIMELINE
              ══════════════════════════════════════════ */}
          <Section id="timeline">
            <div data-toc id="timeline" />
            <SectionLabel>Section III · Monthly Timeline</SectionLabel>
            <SectionHeading subtitle="Combined Vegas spend month by month. Steady growth into a February peak ($5,547 base / $6,656 all-in), then a comfortable cadence around $5,000 base.">
              Vegas spend
              <span className="block text-shortcut-teal-blue">by month.</span>
            </SectionHeading>

            <LVMonthlyBars />
          </Section>

          {/* ══════════════════════════════════════════
              WAITLIST DEMAND
              ══════════════════════════════════════════ */}
          <Section id="waitlist">
            <div data-toc id="waitlist" />
            <SectionLabel>Section IV · Waitlist</SectionLabel>
            <SectionHeading subtitle="Each number below counts employees who tried to book a service after the event was already full.">
              Vegas waitlist
              <span className="block text-shortcut-teal-blue">demand.</span>
            </SectionHeading>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <div className="rounded-3xl bg-white p-7 md:p-8 shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-black/5">
                <div className="text-[10px] font-extrabold uppercase tracking-[.15em] text-shortcut-blue/50 mb-2">Main LV program</div>
                <div className="flex items-baseline gap-2">
                  <div className="text-[4.5rem] font-extrabold text-shortcut-blue leading-none">3.6</div>
                  <div className="text-[14px] font-bold text-shortcut-blue/50">/ event</div>
                </div>
                <div className="text-[15px] font-bold text-shortcut-blue mt-3">avg waitlist</div>
                <div className="text-[12px] text-shortcut-blue/50 font-medium mt-1">122 employees queued across 34 events</div>
              </div>

              <div className="rounded-3xl bg-white p-7 md:p-8 shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-black/5">
                <div className="text-[10px] font-extrabold uppercase tracking-[.15em] text-shortcut-blue/50 mb-2">Trader Monthly Perks</div>
                <div className="flex items-baseline gap-2">
                  <div className="text-[4.5rem] font-extrabold text-shortcut-blue leading-none">1.2</div>
                  <div className="text-[14px] font-bold text-shortcut-blue/50">/ event</div>
                </div>
                <div className="text-[15px] font-bold text-shortcut-blue mt-3">avg waitlist</div>
                <div className="text-[12px] text-shortcut-blue/50 font-medium mt-1">16 employees queued across 13 events (Hair-heavy)</div>
              </div>
            </div>

            <div className="mt-6 card-medium bg-accent-yellow/15">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-10 h-10 rounded-full bg-accent-yellow/50 flex items-center justify-center mt-0.5">
                  <Users size={18} className="text-shortcut-blue" strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="text-[16px] font-extrabold text-shortcut-blue mb-1.5">Steady, healthy demand</h4>
                  <p className="text-[14px] text-text-dark/75 font-medium leading-relaxed">
                    Vegas waitlists are present but not deep. Main LV averages between 3 and 4 employees on the waitlist per event. Trader Perks averages just over 1 per event, almost entirely on the Hair side.
                  </p>
                </div>
              </div>
            </div>
          </Section>

          {/* ══════════════════════════════════════════
              THE RESTRUCTURE
              ══════════════════════════════════════════ */}
          <Section id="restructure">
            <div data-toc id="restructure" />
            <SectionLabel>Section V · Looking Ahead</SectionLabel>
            <SectionHeading subtitle="Below is how we'd structure LV to land at your $5,400 monthly target — built around the fill data above and operational efficiency, not uniform cuts.">
              A Las Vegas restructure
              <span className="block text-shortcut-teal-blue">to hit $5,400 / month.</span>
            </SectionHeading>

            {/* Budget target card — no hourly rate */}
            <div className="rounded-3xl bg-[#F0F0FF] p-7 md:p-10 mb-6 md:mb-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-shortcut-teal/30 to-transparent rounded-full -translate-y-1/3 translate-x-1/3" />
              <div className="relative">
                <div className="text-[11px] font-extrabold uppercase tracking-[.15em] text-shortcut-blue/50 mb-2">DraftKings LV target</div>
                <div className="grid grid-cols-3 gap-5 md:gap-6">
                  <div>
                    <div className="text-[2.25rem] md:text-[3rem] font-extrabold text-shortcut-blue leading-none tabular-nums">$5,400</div>
                    <div className="text-[12px] font-bold uppercase tracking-wider text-shortcut-blue/50 mt-2">All-in / mo</div>
                  </div>
                  <div>
                    <div className="text-[2.25rem] md:text-[3rem] font-extrabold text-shortcut-blue leading-none tabular-nums">$7,952</div>
                    <div className="text-[12px] font-bold uppercase tracking-wider text-shortcut-blue/50 mt-2">Current / mo</div>
                  </div>
                  <div>
                    <div className="text-[2.25rem] md:text-[3rem] font-extrabold text-shortcut-coral leading-none tabular-nums">−32%</div>
                    <div className="text-[12px] font-bold uppercase tracking-wider text-shortcut-blue/50 mt-2">Reduction needed</div>
                  </div>
                </div>
                <p className="mt-6 text-[14px] md:text-[15px] text-shortcut-blue/70 font-medium leading-relaxed max-w-[680px]">
                  Current LV burn is <strong className="text-shortcut-blue">~$7,952 all-in / month</strong>, combining Main LV and Trader Monthly Perks. Hitting $5,400 means trimming roughly <strong className="text-shortcut-blue">$2,550 / month</strong> from the program.
                </p>
              </div>
            </div>

            {/* Approach card — trim duration, keep cadence */}
            <div className="card-large mb-6 md:mb-8">
              <div className="mb-6">
                <div className="text-[11px] font-bold uppercase tracking-[.12em] text-shortcut-blue/40 mb-1">Our approach</div>
                <h3 className="text-[20px] md:text-[24px] font-extrabold text-shortcut-blue leading-tight">
                  Trim each event.
                  <span className="text-shortcut-teal-blue"> Keep the cadence.</span>
                </h3>
                <p className="mt-2 text-[14px] md:text-[15px] text-text-dark/70 font-medium leading-relaxed max-w-[680px]">
                  Every Main LV service fills 100%. Dropping events leaves real demand on the table. Instead, we'd shave an hour off each event and drop the one program that consistently underfills.
                </p>
              </div>

              {/* Trim breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-6">
                {[
                  { svc: 'Hair' as ServiceKey, label: 'Main Hair', from: '5hr · 2 barbers', to: '4hr · 2 barbers', cut: '−1 hour' },
                  { svc: 'Massage' as ServiceKey, label: 'Main Massage', from: '4hr · 2 LMTs', to: '3hr · 2 LMTs', cut: '−1 hour' },
                  { svc: 'Nails' as ServiceKey, label: 'Main Nails', from: '5hr · 1 tech', to: '4hr · 1 tech', cut: '−1 hour' },
                  { svc: 'Beauty' as ServiceKey, label: 'Facials', from: '5hr · 1 esti', to: '4hr · 1 esti', cut: '−1 hour' },
                ].map((row, i) => {
                  const s = SERVICES[row.svc];
                  const Icon = s.icon;
                  return (
                    <div key={i} className="rounded-2xl p-4 md:p-5 border border-shortcut-blue/[.08] bg-white">
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: s.bg }}>
                          <Icon size={15} className="text-shortcut-blue" strokeWidth={2.25} />
                        </div>
                        <div className="text-[13px] font-extrabold text-shortcut-blue">{row.label}</div>
                      </div>
                      <div className="flex items-center gap-3 text-[12px]">
                        <div className="flex-1">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-shortcut-blue/40 mb-0.5">Was</div>
                          <div className="text-shortcut-blue/60 font-semibold line-through decoration-shortcut-coral/40">{row.from}</div>
                        </div>
                        <div className="text-shortcut-blue/40 text-[14px]">→</div>
                        <div className="flex-1">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-shortcut-blue/40 mb-0.5">Becomes</div>
                          <div className="text-shortcut-blue font-extrabold">{row.to}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Trader treatment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="rounded-2xl p-4 md:p-5 bg-emerald-50 border border-emerald-200/60">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: SERVICES.Hair.bg }}>
                      <Scissors size={15} className="text-shortcut-blue" strokeWidth={2.25} />
                    </div>
                    <div>
                      <div className="text-[13px] font-extrabold text-shortcut-blue">Trader Hair</div>
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">Untouched · 100% fill</div>
                    </div>
                  </div>
                  <p className="text-[12px] text-text-dark/70 font-medium leading-relaxed">Already a tight 4hr event with a waitlist. Cutting it would create more friction, not less.</p>
                </div>
                <div className="rounded-2xl p-4 md:p-5 bg-red-50 border border-red-200/60">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-shortcut-coral/20">
                      <AlertTriangle size={15} className="text-shortcut-coral" strokeWidth={2.5} />
                    </div>
                    <div>
                      <div className="text-[13px] font-extrabold text-shortcut-coral">Trader Massage</div>
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-shortcut-coral/80">Drop entirely · 54% fill</div>
                    </div>
                  </div>
                  <p className="text-[12px] text-text-dark/70 font-medium leading-relaxed">The only program with consistent underfill. Removing it saves ~$612/mo all-in with no waitlist impact.</p>
                </div>
              </div>

              {/* Operational floor note */}
              <div className="mt-6 pt-5 border-t border-shortcut-blue/[.06] flex items-start gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-accent-yellow/40 flex items-center justify-center mt-0.5">
                  <Scissors size={15} className="text-shortcut-blue" strokeWidth={2.5} />
                </div>
                <div>
                  <div className="text-[13px] font-extrabold text-shortcut-blue mb-1">Why we stop at 3-4 hours, not shorter</div>
                  <p className="text-[13px] text-text-dark/75 font-medium leading-relaxed">
                    Every event has ~30-45 min of fixed setup and teardown. A 4hr Hair event spends 80% on cuts; a 2hr event spends only 60%. Our best barbers also decline short bookings — same travel and setup effort, less guaranteed income. <strong className="text-shortcut-blue">3 hours is the floor for Massage</strong>; <strong className="text-shortcut-blue">3.5-4 hours for Hair</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Two scenarios intro */}
            <div className="mb-5">
              <div className="text-[11px] font-bold uppercase tracking-[.12em] text-shortcut-blue/40 mb-1">Two ways to land the trim</div>
              <h3 className="text-[20px] md:text-[24px] font-extrabold text-shortcut-blue leading-tight">
                A clean trim
                <span className="text-shortcut-teal-blue"> or a target hit.</span>
              </h3>
              <p className="mt-2 text-[14px] md:text-[15px] text-text-dark/70 font-medium leading-relaxed max-w-[760px]">
                Both options preserve every service. The only difference is how aggressively Main Hair is trimmed.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5 mb-6 md:mb-8">

              {/* OPTION A: LIGHT TRIM (recommended) */}
              <div className="rounded-3xl bg-white border-2 border-shortcut-teal/50 shadow-[0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col relative">
                <div className="absolute top-3 right-3 z-10 text-[10px] font-extrabold uppercase tracking-[.1em] bg-accent-yellow text-shortcut-blue px-2.5 py-1 rounded-full shadow-sm">
                  Our recommendation
                </div>
                <div className="bg-shortcut-teal/25 px-6 py-5 md:px-7 md:py-6 border-b border-shortcut-teal/30">
                  <div className="flex items-end justify-between flex-wrap gap-2 mt-4">
                    <div>
                      <div className="text-[10px] font-extrabold uppercase tracking-[.15em] text-shortcut-blue/60 mb-1">Option A</div>
                      <h4 className="text-[20px] md:text-[22px] font-extrabold text-shortcut-blue leading-tight">Light trim</h4>
                      <div className="text-[12px] text-shortcut-blue/60 font-medium mt-1">Trim 1hr off each event</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-shortcut-blue/50 mb-0.5">All-in / mo</div>
                      <div className="text-[24px] md:text-[28px] font-extrabold text-shortcut-blue tabular-nums leading-none">$5,882</div>
                      <div className="text-[11px] text-shortcut-blue/60 font-semibold mt-1">$482 over target</div>
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-7 flex-1 flex flex-col">
                  <div className="space-y-2 mb-5">
                    {[
                      { svc: 'Hair' as ServiceKey, label: 'Main Hair', cadence: 'Bi-weekly · 4hr · 2 barbers', appts: '~32' },
                      { svc: 'Massage' as ServiceKey, label: 'Main Massage', cadence: 'Bi-weekly · 3hr · 2 LMTs', appts: '~28' },
                      { svc: 'Nails' as ServiceKey, label: 'Main Nails', cadence: 'Monthly · 4hr · 1 tech', appts: '~10' },
                      { svc: 'Beauty' as ServiceKey, label: 'Facials', cadence: 'Quarterly · 4hr · 1 esti', appts: '~5' },
                      { svc: 'Hair' as ServiceKey, label: 'Trader Hair', cadence: 'Monthly · 4hr · 1 barber', appts: '~8' },
                    ].map((row, i) => {
                      const s = SERVICES[row.svc];
                      const Icon = s.icon;
                      return (
                        <div key={i} className="flex items-center gap-3 py-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: s.bg }}>
                            <Icon size={13} className="text-shortcut-blue" strokeWidth={2.25} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-extrabold text-shortcut-blue leading-tight">{row.label}</div>
                            <div className="text-[11px] text-shortcut-blue/60 font-medium">{row.cadence}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-[12px] font-bold text-shortcut-blue tabular-nums">{row.appts} appts</div>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center gap-3 py-2 bg-shortcut-coral/[.06] rounded-lg px-2.5 -mx-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-shortcut-coral/20">
                        <AlertTriangle size={13} className="text-shortcut-coral" strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-extrabold text-shortcut-coral leading-tight">Trader Massage</div>
                        <div className="text-[11px] text-shortcut-blue/60 font-medium italic">dropped · 54% fill</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[12px] font-bold text-shortcut-coral tabular-nums">0 appts</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-shortcut-blue/[.08] grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-shortcut-blue/40">Employees / mo</div>
                      <div className="text-[18px] font-extrabold text-shortcut-blue tabular-nums leading-tight">~83</div>
                      <div className="text-[10px] text-shortcut-blue/60 font-semibold">~24% reduction</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-shortcut-blue/40">vs. $5,400 target</div>
                      <div className="text-[18px] font-extrabold text-shortcut-blue tabular-nums leading-tight">+$482</div>
                      <div className="text-[10px] text-shortcut-blue/50 font-semibold">over budget</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* OPTION B: TARGET HIT */}
              <div className="rounded-3xl bg-white border border-shortcut-blue/10 shadow-[0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col">
                <div className="bg-shortcut-blue px-6 py-5 md:px-7 md:py-6">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="text-[10px] font-extrabold uppercase tracking-[.15em] text-shortcut-teal mb-1">Option B</div>
                      <h4 className="text-[20px] md:text-[22px] font-extrabold text-white leading-tight">Target hit</h4>
                      <div className="text-[12px] text-white/60 font-medium mt-1">Trim Hair another 30 minutes</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-0.5">All-in / mo</div>
                      <div className="text-[24px] md:text-[28px] font-extrabold text-shortcut-teal tabular-nums leading-none">$5,573</div>
                      <div className="text-[11px] text-shortcut-teal/80 font-semibold mt-1">$173 over target</div>
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-7 flex-1 flex flex-col">
                  <div className="space-y-2 mb-5">
                    {[
                      { svc: 'Hair' as ServiceKey, label: 'Main Hair', cadence: 'Bi-weekly · 3.5hr · 2 barbers', appts: '~28', highlight: true },
                      { svc: 'Massage' as ServiceKey, label: 'Main Massage', cadence: 'Bi-weekly · 3hr · 2 LMTs', appts: '~28' },
                      { svc: 'Nails' as ServiceKey, label: 'Main Nails', cadence: 'Monthly · 4hr · 1 tech', appts: '~10' },
                      { svc: 'Beauty' as ServiceKey, label: 'Facials', cadence: 'Quarterly · 4hr · 1 esti', appts: '~5' },
                      { svc: 'Hair' as ServiceKey, label: 'Trader Hair', cadence: 'Monthly · 4hr · 1 barber', appts: '~8' },
                    ].map((row, i) => {
                      const s = SERVICES[row.svc];
                      const Icon = s.icon;
                      return (
                        <div key={i} className={`flex items-center gap-3 py-2 ${row.highlight ? 'bg-accent-yellow/20 rounded-lg px-2.5 -mx-2.5' : ''}`}>
                          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: s.bg }}>
                            <Icon size={13} className="text-shortcut-blue" strokeWidth={2.25} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-extrabold text-shortcut-blue leading-tight">{row.label}</div>
                            <div className="text-[11px] text-shortcut-blue/60 font-medium">{row.cadence}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-[12px] font-bold text-shortcut-blue tabular-nums">{row.appts} appts</div>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center gap-3 py-2 bg-shortcut-coral/[.06] rounded-lg px-2.5 -mx-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-shortcut-coral/20">
                        <AlertTriangle size={13} className="text-shortcut-coral" strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-extrabold text-shortcut-coral leading-tight">Trader Massage</div>
                        <div className="text-[11px] text-shortcut-blue/60 font-medium italic">dropped · 54% fill</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[12px] font-bold text-shortcut-coral tabular-nums">0 appts</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-shortcut-blue/[.08] grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-shortcut-blue/40">Employees / mo</div>
                      <div className="text-[18px] font-extrabold text-shortcut-blue tabular-nums leading-tight">~79</div>
                      <div className="text-[10px] text-shortcut-blue/60 font-semibold">~28% reduction</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-shortcut-blue/40">vs. $5,400 target</div>
                      <div className="text-[18px] font-extrabold text-shortcut-teal tabular-nums leading-tight">+$173</div>
                      <div className="text-[10px] text-shortcut-blue/50 font-semibold">over budget</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Closing summary */}
            <div className="card-medium" style={{ backgroundColor: '#F0F0FF' }}>
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-10 h-10 rounded-full bg-shortcut-teal/40 flex items-center justify-center mt-0.5">
                  <DollarSign size={18} className="text-shortcut-blue" strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="text-[16px] md:text-[17px] font-extrabold text-shortcut-blue mb-2">The decision: <span className="text-shortcut-teal-blue">how much to trim Hair.</span></h4>
                  <p className="text-[14px] text-text-dark/75 font-medium leading-relaxed">
                    Both options preserve every service on its current cadence, drop the underfilled Trader Massage, and protect the 100%-filling Trader Hair. Massage stays bi-weekly with two LMTs. Nails and Facials stay on their current rotation. The only variable is Hair event length: <strong className="text-shortcut-blue">4 hours (Option A)</strong> keeps service quality strong but lands $482 over budget; <strong className="text-shortcut-blue">3.5 hours (Option B)</strong> hits the target nearly on the nose.
                  </p>
                  <p className="mt-3 text-[14px] text-text-dark/75 font-medium leading-relaxed">
                    Worth knowing: a true $5,400 ceiling means about a 32% revenue reduction in a program where every event currently fills. There's no clean way to get all the way to target without either trimming Hair into the 3-3.5hr range or trading some volume elsewhere. The $173 in Option B is the smallest sacrifice we can find.
                  </p>
                </div>
              </div>
            </div>
          </Section>

          {/* ══════════════════════════════════════════
              METHODOLOGY
              ══════════════════════════════════════════ */}
          <Section id="methodology">
            <div data-toc id="methodology" />
            <SectionLabel>Appendix · Methodology</SectionLabel>
            <SectionHeading subtitle="How we calculated the numbers in this report.">
              The fine print.
            </SectionHeading>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              {[
                { title: 'Peak Fill', body: 'The highest share of slots booked at any single moment, capped at event capacity. This is the metric used for the "Main LV at 100%" claim.' },
                { title: 'Employees / month', body: 'Average appointments served per month, by service. For partial months (Nov, May), the window starts Nov 13 and ends May 13.' },
                { title: 'Beauty vs. Facial', body: '"Beauty" is the category label in our system. The service title within Beauty is "Facial." Same thing — different label.' },
                { title: '20% Gratuity', body: 'DraftKings adds a 20% gratuity to every event. Most numbers in this report show "Paid to Shortcut" — the base. "All-in" figures include the +20% gratuity, matching DraftKings\' internal ledger.' },
                { title: 'Trader Monthly Perks', body: 'A separate Vegas sub-program (code DRAFTKINGSVEGAS) running alongside the main LV program. Reported separately because its fill profile is very different.' },
                { title: 'Source data', body: 'Pulled directly from the Shortcut Coordinator (Parse) backend on May 14, 2026. Per-event CSV available on request.' },
              ].map((item, i) => (
                <div key={i} className="card-small">
                  <h4 className="text-[14px] font-extrabold text-shortcut-blue mb-2">{item.title}</h4>
                  <p className="text-[13px] text-text-dark/70 font-medium leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* ══════════════════════════════════════════
              SIGN-OFF
              ══════════════════════════════════════════ */}
          <Section>
            <div className="rounded-2xl border border-shortcut-blue/[.08] bg-white p-6 md:p-7 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="text-[11px] font-extrabold uppercase tracking-[.15em] text-shortcut-blue/40 mb-1">Prepared by</div>
                <div className="text-[16px] font-extrabold text-shortcut-blue">Jaimie Pritchard · Shortcut</div>
                <div className="text-[12px] text-shortcut-blue/60 font-medium mt-1">Per-event CSV and additional cuts available on request.</div>
              </div>
              <a
                href="mailto:jaimie@getshortcut.co"
                className="inline-flex items-center gap-2 bg-shortcut-blue text-white px-5 py-2.5 rounded-full text-[13px] font-extrabold hover:bg-shortcut-blue/90 transition-colors w-fit"
              >
                jaimie@getshortcut.co
              </a>
            </div>
          </Section>

          <div className="h-8" />
        </div>
      </main>
    </div>
  );
}
