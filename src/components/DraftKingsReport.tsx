import { useEffect, useRef, useState } from 'react';
import { Users, DollarSign, MapPin, Calendar, Scissors, Heart, Hand, Flower2, AlertTriangle, Mail, Smartphone, Package } from 'lucide-react';
import { SpendByMonthTable } from './DraftKingsSpendReport';

/* ─────────────────────────────────────────────
   DraftKings — Perks Program Report
   Trailing 6 months: Nov 13 2025 – May 13 2026
   Shortcut design system — visual, card-based
   ───────────────────────────────────────────── */

// ── Service color tokens (matches brand palette) ──
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

// ── Service tile (the visual centerpiece for cost/emp data) ──
function ServiceTile({
  service,
  employees,
  costPerEmp,
  costPerMo,
}: {
  service: ServiceKey;
  employees: string;
  costPerEmp: string;
  costPerMo: string;
}) {
  const s = SERVICES[service];
  const Icon = s.icon;
  return (
    <div
      className="rounded-2xl p-5 md:p-6 border border-white/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
      style={{ backgroundColor: s.tint }}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shadow-sm"
          style={{ backgroundColor: s.bg }}
        >
          <Icon size={18} className="text-shortcut-blue" strokeWidth={2.25} />
        </div>
        <div className="text-[13px] font-extrabold text-shortcut-blue tracking-tight">{s.label}</div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[.1em] text-shortcut-blue/50 mb-0.5">
            Employees / month
          </div>
          <div className="text-[1.6rem] md:text-[1.85rem] font-extrabold text-shortcut-blue leading-none tabular-nums">
            {employees}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-shortcut-blue/[.08]">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[.1em] text-shortcut-blue/50 mb-0.5">
              Cost / emp
            </div>
            <div className="text-[15px] font-bold text-shortcut-blue tabular-nums">{costPerEmp}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[.1em] text-shortcut-blue/50 mb-0.5">
              Total / mo
            </div>
            <div className="text-[15px] font-bold text-shortcut-blue tabular-nums">{costPerMo}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Big metric stat ──
function HeroStat({
  value,
  label,
  sublabel,
  color = 'navy',
}: {
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
      <div className="text-[13px] md:text-[14px] font-bold uppercase tracking-[.08em] mt-3 opacity-90">
        {label}
      </div>
      {sublabel && (
        <div className="text-[12px] font-medium mt-1.5 opacity-60 leading-relaxed">
          {sublabel}
        </div>
      )}
    </div>
  );
}

// ── Site comparison card (replaces the long table) ──
function SiteCard({
  site,
  state,
  events,
  fillRate,
  hairFill,
  massageFill,
  totalPaid,
  avgPerMonth,
  appts,
  capacity,
  highlight,
  accent = 'navy',
  note,
}: {
  site: string;
  state: string;
  events: number;
  fillRate: string;
  hairFill?: string;
  massageFill?: string;
  totalPaid: string;
  avgPerMonth: string;
  appts: number;
  capacity: number;
  highlight?: string;
  accent?: 'navy' | 'teal' | 'coral' | 'pink' | 'yellow';
  note?: string;
}) {
  const accentBg = {
    navy: 'bg-shortcut-blue text-white',
    teal: 'bg-shortcut-teal/30 text-shortcut-blue',
    coral: 'bg-shortcut-coral/15 text-shortcut-coral',
    pink: 'bg-accent-pink/20 text-shortcut-blue',
    yellow: 'bg-accent-yellow/30 text-shortcut-blue',
  };
  const showServiceBreakdown = hairFill !== undefined && massageFill !== undefined;
  const isMassageUnderfill = showServiceBreakdown && massageFill !== '—' && parseFloat(massageFill!) < 90;
  return (
    <div className="rounded-3xl bg-white p-6 md:p-7 border border-black/5 shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[.12em] text-shortcut-blue/40">{state}</div>
          <h3 className="text-[20px] md:text-[22px] font-extrabold text-shortcut-blue leading-tight mt-0.5">{site}</h3>
        </div>
        {highlight && (
          <div className={`text-[10px] font-extrabold uppercase tracking-[.1em] px-2.5 py-1 rounded-full ${accentBg[accent]}`}>
            {highlight}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[.1em] text-shortcut-blue/50 mb-0.5">Events</div>
          <div className="text-[1.75rem] font-extrabold text-shortcut-blue leading-none tabular-nums">{events}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[.1em] text-shortcut-blue/50 mb-0.5">Overall fill</div>
          <div className="text-[1.75rem] font-extrabold text-shortcut-blue leading-none tabular-nums">{fillRate}</div>
        </div>
      </div>

      {/* Service-level fill breakdown — only when explicitly requested */}
      {showServiceBreakdown && (
        <div className="grid grid-cols-2 gap-2 mb-5">
          <div className="rounded-xl p-3" style={{ backgroundColor: SERVICES.Hair.tint }}>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: SERVICES.Hair.bg }}>
                <Scissors size={9} className="text-shortcut-blue" strokeWidth={2.5} />
              </div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-shortcut-blue/60">Hair fill</div>
            </div>
            <div className="text-[18px] font-extrabold text-shortcut-blue tabular-nums leading-none">{hairFill}</div>
          </div>
          <div className="rounded-xl p-3" style={{ backgroundColor: isMassageUnderfill ? '#FFE0E0' : SERVICES.Massage.tint }}>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: isMassageUnderfill ? '#FF9C9C' : SERVICES.Massage.bg }}>
                <Heart size={9} className="text-shortcut-blue" strokeWidth={2.5} />
              </div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-shortcut-blue/60">Massage fill</div>
            </div>
            <div className={`text-[18px] font-extrabold tabular-nums leading-none ${isMassageUnderfill ? 'text-shortcut-coral' : 'text-shortcut-blue'}`}>{massageFill}</div>
          </div>
        </div>
      )}

      <div className={`space-y-2 py-4 ${showServiceBreakdown ? 'border-t' : ''} border-shortcut-blue/[.06]`}>
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-shortcut-blue/60 font-medium">Total paid</span>
          <span className="font-bold text-shortcut-blue tabular-nums">{totalPaid}</span>
        </div>
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-shortcut-blue/60 font-medium">Avg / month</span>
          <span className="font-bold text-shortcut-blue tabular-nums">{avgPerMonth}</span>
        </div>
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-shortcut-blue/60 font-medium">Appts / capacity</span>
          <span className="font-bold text-shortcut-blue tabular-nums">{appts.toLocaleString()} / {capacity.toLocaleString()}</span>
        </div>
      </div>

      {note && (
        <p className="mt-4 text-[12px] text-shortcut-blue/60 font-medium italic leading-relaxed">
          {note}
        </p>
      )}
    </div>
  );
}

// ── Monthly bar visualization ──
function MonthlyBars() {
  const months = [
    { label: 'Nov *', events: 7, appts: 84, paid: 4854, partial: true },
    { label: 'Dec', events: 10, appts: 128, paid: 8442 },
    { label: 'Jan', events: 12, appts: 173, paid: 9828 },
    { label: 'Feb', events: 14, appts: 189, paid: 11595, peak: true },
    { label: 'Mar', events: 13, appts: 175, paid: 10689 },
    { label: 'Apr', events: 13, appts: 171, paid: 10677 },
    { label: 'May *', events: 2, appts: 29, paid: 1806, partial: true },
  ];
  const maxPaid = Math.max(...months.map(m => m.paid));

  return (
    <div className="card-large">
      <div className="flex items-baseline justify-between mb-7 flex-wrap gap-2">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[.12em] text-shortcut-blue/40 mb-1">Monthly Volume</div>
          <h3 className="text-[20px] md:text-[22px] font-extrabold text-shortcut-blue">$ paid to Shortcut, by month</h3>
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
          return (
            <div key={m.label} className="grid grid-cols-[60px_1fr_120px] md:grid-cols-[80px_1fr_180px] gap-3 md:gap-4 items-center">
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
                {m.events} events · {m.appts} appts
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-[12px] text-shortcut-blue/50 font-medium">* Partial months — window starts Nov 13, ends May 13.</p>
    </div>
  );
}

// ── Top service row (for the per-site featured services) ──
function ServiceRow({ name, category, appts, cost, rank }: { name: string; category: ServiceKey; appts: number; cost: string; rank: number }) {
  const s = SERVICES[category];
  const Icon = s.icon;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-shortcut-blue/[.06] last:border-0">
      <div className="text-[11px] font-extrabold text-shortcut-blue/30 tabular-nums w-5">{rank}</div>
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm"
        style={{ backgroundColor: s.bg }}
      >
        <Icon size={14} className="text-shortcut-blue" strokeWidth={2.25} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-bold text-shortcut-blue truncate">{name}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[15px] font-extrabold text-shortcut-blue tabular-nums">{appts}</div>
        <div className="text-[10px] text-shortcut-blue/50 font-semibold uppercase tracking-wider">{cost}</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════

export default function DraftKingsReport() {
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
            <div className="inline-flex items-center gap-4 mb-4">
              <img
                src="/Holiday Proposal/Parnter Logos/DraftKings.svg"
                alt="DraftKings"
                className="h-8 w-auto"
              />
              <div className="h-6 w-px bg-shortcut-blue/15" aria-hidden="true" />
              <img
                src="/shortcut-logo-blue.svg"
                alt="Shortcut"
                className="h-5 w-auto"
              />
            </div>
            <div className="text-[12px] text-shortcut-blue/50 font-medium">Perks Program Report</div>
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
    { id: 'headline', label: 'Headline' },
    { id: 'monthly-spend', label: 'Spend per Month' },
    { id: 'requested', label: 'Your Requested Data' },
    { id: 'sites', label: 'Site Comparison' },
    { id: 'trader', label: 'Trader Perks Detail' },
    { id: 'waitlist', label: 'Waitlist Demand' },
    { id: 'services', label: 'Top Services' },
    { id: 'timeline', label: 'Monthly Timeline' },
    { id: 'restructure', label: 'LV Restructure' },
    { id: 'methodology', label: 'Methodology' },
  ];

  return (
    <div className="min-h-screen bg-neutral-light-gray font-['Outfit',system-ui,sans-serif]">

      {/* ── Sticky nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-shortcut-blue/[.06]">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <img
              src="/Holiday Proposal/Parnter Logos/DraftKings.svg"
              alt="DraftKings"
              className="h-6 w-auto"
            />
            <div className="h-4 w-px bg-shortcut-blue/15" aria-hidden="true" />
            <img
              src="/shortcut-logo-blue.svg"
              alt="Shortcut"
              className="h-4 w-auto"
            />
            <div className="hidden sm:block ml-1 md:ml-2 pl-3 md:pl-4 border-l border-shortcut-blue/[.12] text-[10px] font-semibold uppercase tracking-wider text-shortcut-blue/40">
              Perks Program Report
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
              HERO CARD — pastel background, big stats
              ══════════════════════════════════════════ */}
          <Section>
            <div className="relative overflow-hidden rounded-3xl" style={{ backgroundColor: '#F0F0FF' }}>
              <div className="relative z-10 px-6 py-10 md:px-12 md:py-14">
                {/* Co-branded logo lockup */}
                <div className="flex items-center gap-5 md:gap-7 mb-8 pb-6 border-b border-shortcut-blue/[.1]">
                  <img
                    src="/Holiday Proposal/Parnter Logos/DraftKings.svg"
                    alt="DraftKings"
                    className="h-9 md:h-12 w-auto"
                  />
                  <div className="h-7 md:h-10 w-px bg-shortcut-blue/15" aria-hidden="true" />
                  <img
                    src="/shortcut-logo-blue.svg"
                    alt="Shortcut"
                    className="h-6 md:h-8 w-auto"
                  />
                </div>
                <div className="text-[11px] font-extrabold uppercase tracking-[.18em] text-shortcut-blue/50 mb-3">
                  Trailing 6 Months · Prepared for Jaime Cortina
                </div>
                <h1 className="text-[2.5rem] md:text-[4rem] lg:text-[4.5rem] font-extrabold text-shortcut-blue leading-[1.02] tracking-tight">
                  DraftKings Perks,
                  <span className="block text-shortcut-teal-blue">by the numbers.</span>
                </h1>
                <p className="text-[16px] md:text-[19px] text-text-dark/70 mt-5 font-medium leading-relaxed max-w-[680px]">
                  Every event we've run for DraftKings in Vegas, New York, and New Jersey over the last 6 months — with the per-site, per-service breakdown you asked about.
                </p>

                {/* Inline metric chips */}
                <div className="flex flex-wrap gap-3 mt-7">
                  <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm border border-white/60">
                    <Calendar size={14} className="text-shortcut-blue" strokeWidth={2.5} />
                    <span className="text-[13px] font-bold text-shortcut-blue">Nov 13 2025 – May 13 2026</span>
                  </div>
                  <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm border border-white/60">
                    <MapPin size={14} className="text-shortcut-blue" strokeWidth={2.5} />
                    <span className="text-[13px] font-bold text-shortcut-blue">3 sites · 4 service categories</span>
                  </div>
                  <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm border border-white/60">
                    <Users size={14} className="text-shortcut-blue" strokeWidth={2.5} />
                    <span className="text-[13px] font-bold text-shortcut-blue">71 events delivered</span>
                  </div>
                </div>
              </div>

              {/* Decorative blobs */}
              <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-shortcut-teal/40 to-transparent rounded-full -translate-y-1/3 translate-x-1/3" />
              <div className="absolute bottom-0 left-0 w-56 h-56 bg-gradient-to-tr from-accent-pink/30 to-transparent rounded-full translate-y-1/3 -translate-x-1/3" />
            </div>
          </Section>

          {/* ══════════════════════════════════════════
              CAVEAT — what's in the number
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
                  The per-employee figures in this report reflect the full service Shortcut delivers at every event.
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
              HEADLINE STATS — 4 color-coded cards
              ══════════════════════════════════════════ */}
          <Section id="headline">
            <div data-toc id="headline" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
              <HeroStat value="71" label="Events Delivered" sublabel="across 3 sites" color="navy" />
              <HeroStat value="746" label="Appointments Served" sublabel="6-month window" color="teal" />
              <HeroStat value="98%" label="of timeslots filled" sublabel="across main programs" color="yellow" />
              <HeroStat value="$58K+" label="Paid to Shortcut" sublabel="~$9.7K / month avg" color="pink" />
            </div>
          </Section>

          {/* ══════════════════════════════════════════
              MONTHLY SPEND AT A GLANCE — by location
              ══════════════════════════════════════════ */}
          <Section>
            <div className="card-large">
              <div className="mb-6 md:mb-7">
                <div className="text-[11px] font-bold uppercase tracking-[.12em] text-shortcut-blue/40 mb-1">At a glance</div>
                <h2 className="text-[1.75rem] md:text-[2.25rem] font-extrabold text-shortcut-blue leading-tight">
                  Monthly spend,
                  <span className="text-shortcut-teal-blue"> by location.</span>
                </h2>
                <p className="mt-2 text-[14px] md:text-[15px] text-text-dark/70 font-medium leading-relaxed max-w-[640px]">
                  Average monthly cost and total spend over the trailing 6 months for each program. Two figures per row: what was paid to Shortcut, and the all-in cost including DraftKings' 20% gratuity per event.
                </p>
              </div>

              {/* Gratuity callout pill */}
              <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full bg-accent-yellow/25 border border-accent-yellow/50">
                <DollarSign size={13} className="text-shortcut-blue" strokeWidth={2.5} />
                <span className="text-[11px] md:text-[12px] font-extrabold text-shortcut-blue uppercase tracking-wider">
                  DraftKings adds 20% gratuity to every event
                </span>
              </div>

              {/* Column headers (desktop) */}
              <div className="hidden md:grid grid-cols-[auto_1fr_1fr_1fr] gap-6 items-end pb-3 border-b border-shortcut-blue/[.1]">
                <div className="w-2.5" />
                <div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-shortcut-blue/40">Location</div>
                <div className="text-right text-[10px] font-extrabold uppercase tracking-[.1em] text-shortcut-blue/40">Paid to Shortcut</div>
                <div className="text-right text-[10px] font-extrabold uppercase tracking-[.1em] text-shortcut-blue">All-in <span className="text-shortcut-blue/50 font-bold">(+ 20% grat)</span></div>
              </div>

              {/* Spend rows */}
              <div className="space-y-1">
                {[
                  { dot: 'bg-shortcut-blue', name: 'Las Vegas', detail: 'Main LV program', avgBase: 5521, total6Base: 33123 },
                  { dot: 'bg-shortcut-coral', name: 'Las Vegas', detail: 'Trader Monthly Perks', avgBase: 1106, total6Base: 6636 },
                  { dot: 'bg-shortcut-teal', name: 'New York', detail: 'DraftKings NY', avgBase: 2044, total6Base: 12261 },
                  { dot: 'bg-accent-pink', name: 'New Jersey', detail: 'DraftKings NJ', avgBase: 979, total6Base: 5871 },
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

                      {/* Mobile: stacked single column. Desktop: paid column */}
                      <div className="hidden md:block text-right">
                        <div className="text-[16px] font-bold text-shortcut-blue/70 tabular-nums leading-tight">{fmt(row.avgBase)} <span className="text-[11px] font-semibold text-shortcut-blue/40">/ mo</span></div>
                        <div className="text-[11px] text-shortcut-blue/40 font-medium tabular-nums mt-0.5">{fmt(row.total6Base)} over 6 mo</div>
                      </div>

                      {/* All-in column (primary) */}
                      <div className="text-right">
                        <div className="text-[18px] md:text-[20px] font-extrabold text-shortcut-blue tabular-nums leading-tight">{fmt(avgAllIn)} <span className="text-[11px] font-semibold text-shortcut-blue/50">/ mo</span></div>
                        <div className="text-[11px] text-shortcut-blue/50 font-semibold tabular-nums mt-0.5 md:hidden">vs. {fmt(row.avgBase)} paid · base</div>
                        <div className="hidden md:block text-[11px] text-shortcut-blue/50 font-medium tabular-nums mt-0.5">{fmt(total6AllIn)} over 6 mo</div>
                      </div>
                    </div>
                  );
                })}

                {/* Total row — accented */}
                <div className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1fr_1fr_1fr] gap-3 md:gap-6 items-center py-5 mt-2 rounded-2xl bg-shortcut-blue px-4 md:px-5">
                  <div className="w-2.5 h-2.5 rounded-full bg-shortcut-teal" />
                  <div>
                    <div className="text-[15px] md:text-[16px] font-extrabold text-white leading-tight">All locations</div>
                    <div className="text-[12px] md:text-[13px] text-white/50 font-medium mt-0.5">Program-wide total</div>
                  </div>

                  <div className="hidden md:block text-right">
                    <div className="text-[16px] font-bold text-white/70 tabular-nums leading-tight">~$9,650 <span className="text-[11px] font-semibold text-white/40">/ mo</span></div>
                    <div className="text-[11px] text-white/40 font-medium tabular-nums mt-0.5">$57,891 over 6 mo</div>
                  </div>

                  <div className="text-right">
                    <div className="text-[18px] md:text-[22px] font-extrabold text-shortcut-teal tabular-nums leading-tight">~$11,580 <span className="text-[11px] font-semibold text-white/60">/ mo</span></div>
                    <div className="text-[11px] text-white/60 font-semibold tabular-nums mt-0.5 md:hidden">vs. ~$9,650 paid · base</div>
                    <div className="hidden md:block text-[11px] text-white/60 font-medium tabular-nums mt-0.5">~$69,469 over 6 mo</div>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* ══════════════════════════════════════════
              SPEND PER MONTH PER LOCATION — matrix
              ══════════════════════════════════════════ */}
          <Section id="monthly-spend">
            <div data-toc id="monthly-spend" />
            <div className="card-large">
              <div className="mb-6 md:mb-7">
                <div className="text-[11px] font-bold uppercase tracking-[.12em] text-shortcut-blue/40 mb-1">Month by month</div>
                <h2 className="text-[1.75rem] md:text-[2.25rem] font-extrabold text-shortcut-blue leading-tight">
                  Spend per month,
                  <span className="text-shortcut-teal-blue"> per location.</span>
                </h2>
                <p className="mt-2 text-[14px] md:text-[15px] text-text-dark/70 font-medium leading-relaxed max-w-[640px]">
                  What was paid to Shortcut each month, broken out by program, through July 2026. July is shown as expected spend, combining events already delivered with those scheduled through month end. The Total column sums all four programs; All-in adds DraftKings' 20% gratuity.
                </p>
              </div>
              <SpendByMonthTable />
            </div>
          </Section>

          {/* ══════════════════════════════════════════
              YOUR DIRECT ASK — per-site service tiles
              ══════════════════════════════════════════ */}
          <Section id="requested">
            <div data-toc id="requested" />
            <SectionLabel>Section I · Your Direct Ask</SectionLabel>
            <SectionHeading subtitle='Average employees serviced, cost per employee, and total monthly spend — broken out by site and service category. A quick note on labels: we track "Beauty" in our system rather than "Facials" — same service, different label.'>
              Employees, cost, and spend
              <span className="block text-shortcut-teal-blue">by site &amp; service.</span>
            </SectionHeading>

            {/* Las Vegas */}
            <div className="card-large mb-6">
              <div className="flex items-baseline justify-between mb-6 flex-wrap gap-2">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[.12em] text-shortcut-blue/40 mb-1">Las Vegas · NV</div>
                  <h3 className="text-[22px] md:text-[26px] font-extrabold text-shortcut-blue leading-tight">Main LV program</h3>
                </div>
                <div className="text-[12px] font-extrabold text-shortcut-blue bg-shortcut-teal/40 px-3 py-1.5 rounded-full">
                  97.1% fill · highest volume
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <ServiceTile service="Hair" employees="46.8" costPerEmp="$66.37" costPerMo="$3,106" />
                <ServiceTile service="Massage" employees="39.8" costPerEmp="$55.73" costPerMo="$2,218" />
                <ServiceTile service="Nails" employees="12.3" costPerEmp="$68.09" costPerMo="$838" />
                <ServiceTile service="Beauty" employees="7.0" costPerEmp="$66.43" costPerMo="$465" />
              </div>
              <p className="mt-5 pt-4 border-t border-shortcut-blue/[.06] text-[12px] text-shortcut-blue/50 font-medium italic">
                Excludes the Trader Monthly Perks sub-program — reported separately below.
              </p>
            </div>

            {/* New York */}
            <div className="card-large mb-6">
              <div className="flex items-baseline justify-between mb-6 flex-wrap gap-2">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[.12em] text-shortcut-blue/40 mb-1">New York · NY</div>
                  <h3 className="text-[22px] md:text-[26px] font-extrabold text-shortcut-blue leading-tight">DraftKings NY</h3>
                </div>
                <div className="text-[12px] font-extrabold text-shortcut-blue bg-shortcut-teal/40 px-3 py-1.5 rounded-full">
                  100% fill · deepest waitlist
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <ServiceTile service="Hair" employees="11.2" costPerEmp="$68.30" costPerMo="$765" />
                <ServiceTile service="Massage" employees="14.2" costPerEmp="$44.79" costPerMo="$636" />
                <ServiceTile service="Nails" employees="5.7" costPerEmp="$75.00" costPerMo="$428" />
                <ServiceTile service="Beauty" employees="3.3" costPerEmp="$65.15" costPerMo="$215" />
              </div>
            </div>

            {/* New Jersey */}
            <div className="card-large">
              <div className="flex items-baseline justify-between mb-6 flex-wrap gap-2">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[.12em] text-shortcut-blue/40 mb-1">New Jersey · NJ</div>
                  <h3 className="text-[22px] md:text-[26px] font-extrabold text-shortcut-blue leading-tight">DraftKings NJ</h3>
                </div>
                <div className="text-[12px] font-extrabold text-shortcut-blue bg-shortcut-teal/40 px-3 py-1.5 rounded-full">
                  100% fill · one event / mo
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <ServiceTile service="Hair" employees="12.7" costPerEmp="$70.28" costPerMo="$893" />
                <ServiceTile service="Beauty" employees="1.3" costPerEmp="$66.15" costPerMo="$86" />
                <div className="rounded-2xl p-5 md:p-6 border-2 border-dashed border-shortcut-blue/15 flex items-center justify-center text-center">
                  <div>
                    <div className="text-[12px] font-bold text-shortcut-blue/40 uppercase tracking-wide">No Massage</div>
                    <div className="text-[11px] text-shortcut-blue/40 mt-1">Room to add</div>
                  </div>
                </div>
                <div className="rounded-2xl p-5 md:p-6 border-2 border-dashed border-shortcut-blue/15 flex items-center justify-center text-center">
                  <div>
                    <div className="text-[12px] font-bold text-shortcut-blue/40 uppercase tracking-wide">No Nails</div>
                    <div className="text-[11px] text-shortcut-blue/40 mt-1">Room to add</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-shortcut-teal/15 border border-shortcut-teal/40 p-5 md:p-6">
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-shortcut-teal/50 flex items-center justify-center mt-0.5">
                  <DollarSign size={16} className="text-shortcut-blue" strokeWidth={2.5} />
                </div>
                <div className="text-[14px] text-shortcut-blue leading-relaxed font-medium">
                  <strong>How "Cost / employee" works:</strong> DraftKings pays a flat per-event fee — cost per employee is a derived number (event payment ÷ appointments served). Variation between sites mostly comes from per-event capacity and how many employees show up.
                </div>
              </div>
            </div>
          </Section>

          {/* ══════════════════════════════════════════
              SITE COMPARISON — 4-card grid
              ══════════════════════════════════════════ */}
          <Section id="sites">
            <div data-toc id="sites" />
            <SectionLabel>Section II · Site Comparison</SectionLabel>
            <SectionHeading subtitle="How each of the four programs performed across the window.">
              How each site
              <span className="block text-shortcut-teal-blue">performed.</span>
            </SectionHeading>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <SiteCard
                site="Main LV Program"
                state="Las Vegas · NV"
                events={34}
                fillRate="97.1%"
                totalPaid="$33,123"
                avgPerMonth="$5,521"
                appts={565}
                capacity={598}
                highlight="Highest volume"
                accent="navy"
                note="Every recurring event filled to 100% at booking. The 33-slot gap between capacity and served reflects last-minute employee cancellations and day-of no-shows."
              />
              <SiteCard
                site="DraftKings NY"
                state="New York · NY"
                events={17}
                fillRate="100%"
                totalPaid="$12,261"
                avgPerMonth="$2,044"
                appts={210}
                capacity={220}
                highlight="100% fill"
                accent="teal"
                note="Every event filled to 100% at booking. The 10-slot gap between capacity and served reflects last-minute employee cancellations and day-of no-shows."
              />
              <SiteCard
                site="DraftKings NJ"
                state="New Jersey · NJ"
                events={7}
                fillRate="100%"
                totalPaid="$5,871"
                avgPerMonth="$979"
                appts={84}
                capacity={92}
                highlight="100% fill"
                accent="teal"
                note="Every event filled to 100% at booking. The 8-slot gap between capacity and served reflects last-minute employee cancellations and day-of no-shows."
              />
              <SiteCard
                site="Trader Monthly Perks"
                state="Las Vegas · NV"
                events={13}
                fillRate="53.8%"
                hairFill="100%"
                massageFill="54.2%"
                totalPaid="$6,636"
                avgPerMonth="$1,106"
                appts={90}
                capacity={128}
                highlight="Mixed"
                accent="coral"
                note="Hair fills 100% every time. Massage averages 54%."
              />
            </div>
          </Section>

          {/* ══════════════════════════════════════════
              TRADER PERKS DETAIL — Hair vs Massage
              ══════════════════════════════════════════ */}
          <Section id="trader">
            <div data-toc id="trader" />
            <SectionLabel>Section III · Trader Perks Detail</SectionLabel>
            <SectionHeading subtitle="Across every main DraftKings program — Vegas, New York, New Jersey — both Hair and Massage events run at 100% fill. The one exception is the Trader Monthly Perks sub-program in Vegas, where Hair still fills every time but Massage averages 54%.">
              Trader Perks is the one area
              <span className="block text-shortcut-teal-blue">where the numbers don't align.</span>
            </SectionHeading>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              {/* Hair card — accent yellow */}
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

              {/* Massage card — coral underfill */}
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
              WAITLIST DEMAND — 3 hero cards
              ══════════════════════════════════════════ */}
          <Section id="waitlist">
            <div data-toc id="waitlist" />
            <SectionLabel>Section IV · Waitlist</SectionLabel>
            <SectionHeading subtitle="Each number below is the average count of employees per event who joined the waitlist after the event filled up — meaning they wanted to book a service but there weren't enough slots available for them.">
              Employees on the waitlist
              <span className="block text-shortcut-teal-blue">per event.</span>
            </SectionHeading>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
              {/* NY — hero treatment */}
              <div className="rounded-3xl bg-shortcut-blue text-white p-7 md:p-8 shadow-xl md:transform md:scale-[1.02] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-shortcut-teal/30 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative">
                  <div className="text-[10px] font-extrabold uppercase tracking-[.15em] text-shortcut-teal mb-2">New York · NY</div>
                  <div className="flex items-baseline gap-2">
                    <div className="text-[4.5rem] font-extrabold text-shortcut-teal leading-none">8.1</div>
                    <div className="text-[14px] font-bold text-white/70">/ event</div>
                  </div>
                  <div className="text-[15px] font-bold text-white mt-3">avg waitlist</div>
                  <div className="text-[12px] text-white/60 font-medium mt-1">137 employees queued across 17 events</div>
                </div>
              </div>

              {/* LV */}
              <div className="rounded-3xl bg-white p-7 md:p-8 shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-black/5">
                <div className="text-[10px] font-extrabold uppercase tracking-[.15em] text-shortcut-blue/50 mb-2">Las Vegas · NV</div>
                <div className="flex items-baseline gap-2">
                  <div className="text-[4.5rem] font-extrabold text-shortcut-blue leading-none">2.9</div>
                  <div className="text-[14px] font-bold text-shortcut-blue/50">/ event</div>
                </div>
                <div className="text-[15px] font-bold text-shortcut-blue mt-3">avg waitlist</div>
                <div className="text-[12px] text-shortcut-blue/50 font-medium mt-1">138 employees queued across 47 events</div>
              </div>

              {/* NJ */}
              <div className="rounded-3xl bg-white p-7 md:p-8 shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-black/5">
                <div className="text-[10px] font-extrabold uppercase tracking-[.15em] text-shortcut-blue/50 mb-2">New Jersey · NJ</div>
                <div className="flex items-baseline gap-2">
                  <div className="text-[4.5rem] font-extrabold text-shortcut-blue leading-none">0.7</div>
                  <div className="text-[14px] font-bold text-shortcut-blue/50">/ event</div>
                </div>
                <div className="text-[15px] font-bold text-shortcut-blue mt-3">avg waitlist</div>
                <div className="text-[12px] text-shortcut-blue/50 font-medium mt-1">5 employees queued across 7 events</div>
              </div>
            </div>

            <div className="mt-6 card-medium bg-accent-yellow/15">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-10 h-10 rounded-full bg-accent-yellow/50 flex items-center justify-center mt-0.5">
                  <Users size={18} className="text-shortcut-blue" strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="text-[16px] font-extrabold text-shortcut-blue mb-1.5">What the waitlist counts</h4>
                  <p className="text-[14px] text-text-dark/75 font-medium leading-relaxed">
                    Over the six-month window, <strong>280 employees across all three sites</strong> joined a waitlist — meaning they tried to book a service after the event was already full. New York events averaged more than 8 employees on the waitlist per event, Vegas averaged about 3, and New Jersey averaged under 1.
                  </p>
                </div>
              </div>
            </div>
          </Section>

          {/* ══════════════════════════════════════════
              TOP SERVICES — colorful service rows
              ══════════════════════════════════════════ */}
          <Section id="services">
            <div data-toc id="services" />
            <SectionLabel>Section V · Top Services by Volume</SectionLabel>
            <SectionHeading subtitle="Specific services your employees are choosing most often — ranked by appointment volume.">
              What employees are
              <span className="block text-shortcut-teal-blue">actually picking.</span>
            </SectionHeading>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">

              {/* Las Vegas */}
              <div className="card-medium">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-[.12em] text-shortcut-blue/40">Las Vegas</div>
                    <h3 className="text-[18px] font-extrabold text-shortcut-blue">Top services</h3>
                  </div>
                  <div className="text-[11px] font-bold text-shortcut-blue/40">Appts / Cost</div>
                </div>
                <div className="space-y-0">
                  <ServiceRow rank={1} name="Sports Massage" category="Massage" appts={223} cost="$52.36" />
                  <ServiceRow rank={2} name="Short Haircut" category="Hair" appts={122} cost="$63.79" />
                  <ServiceRow rank={3} name="Quick Clean Up" category="Hair" appts={89} cost="$65.26" />
                  <ServiceRow rank={4} name="Facial" category="Beauty" appts={39} cost="$64.62" />
                  <ServiceRow rank={5} name="Beard Trim" category="Hair" appts={35} cost="$63.78" />
                  <ServiceRow rank={6} name="Compression Massage" category="Massage" appts={30} cost="$54.40" />
                  <ServiceRow rank={7} name="Classic Manicure" category="Nails" appts={25} cost="$69.88" />
                  <ServiceRow rank={8} name="Nail Clean Up" category="Nails" appts={20} cost="$69.58" />
                </div>
              </div>

              {/* New York */}
              <div className="card-medium">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-[.12em] text-shortcut-blue/40">New York</div>
                    <h3 className="text-[18px] font-extrabold text-shortcut-blue">Top services</h3>
                  </div>
                  <div className="text-[11px] font-bold text-shortcut-blue/40">Appts / Cost</div>
                </div>
                <div className="space-y-0">
                  <ServiceRow rank={1} name="Sports Massage" category="Massage" appts={73} cost="$44.49" />
                  <ServiceRow rank={2} name="Short Haircut" category="Hair" appts={43} cost="$66.60" />
                  <ServiceRow rank={3} name="Facial" category="Beauty" appts={20} cost="$64.50" />
                  <ServiceRow rank={4} name="Nail Clean Up" category="Nails" appts={15} cost="$77.64" />
                  <ServiceRow rank={5} name="Blowout" category="Hair" appts={14} cost="$66.68" />
                  <ServiceRow rank={6} name="Classic Manicure" category="Nails" appts={13} cost="$69.09" />
                  <ServiceRow rank={7} name="Compression Massage" category="Massage" appts={13} cost="$43.68" />
                  <ServiceRow rank={8} name="Long Haircut" category="Hair" appts={7} cost="$66.16" />
                </div>
              </div>

              {/* New Jersey */}
              <div className="card-medium">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-[.12em] text-shortcut-blue/40">New Jersey</div>
                    <h3 className="text-[18px] font-extrabold text-shortcut-blue">Top services</h3>
                  </div>
                  <div className="text-[11px] font-bold text-shortcut-blue/40">Appts / Cost</div>
                </div>
                <div className="space-y-0">
                  <ServiceRow rank={1} name="Short Haircut" category="Hair" appts={54} cost="$69.77" />
                  <ServiceRow rank={2} name="Quick Clean Up" category="Hair" appts={15} cost="$73.54" />
                  <ServiceRow rank={3} name="Facial" category="Beauty" appts={8} cost="$64.50" />
                  <ServiceRow rank={4} name="Long Haircut" category="Hair" appts={4} cost="$67.77" />
                  <ServiceRow rank={5} name="Beard Trim" category="Hair" appts={3} cost="$70.98" />
                </div>
                <p className="mt-5 pt-4 border-t border-shortcut-blue/[.06] text-[12px] text-shortcut-blue/50 font-medium italic">
                  NJ is currently Hair + Beauty only — a clear opportunity to add Massage or Nails.
                </p>
              </div>
            </div>
          </Section>

          {/* ══════════════════════════════════════════
              MONTHLY TIMELINE — bar chart
              ══════════════════════════════════════════ */}
          <Section id="timeline">
            <div data-toc id="timeline" />
            <SectionLabel>Section VI · Monthly Timeline</SectionLabel>
            <SectionHeading subtitle="Steady growth from launch through a February peak (14 events, $11.6K). March and April settled into a comfortable cadence of ~13 events and ~$10.7K each.">
              Program-wide volume
              <span className="block text-shortcut-teal-blue">over the window.</span>
            </SectionHeading>

            <MonthlyBars />
          </Section>

          {/* ══════════════════════════════════════════
              LV RESTRUCTURE PROPOSAL
              ══════════════════════════════════════════ */}
          <Section id="restructure">
            <div data-toc id="restructure" />
            <SectionLabel>Section VII · Looking Ahead</SectionLabel>
            <SectionHeading subtitle="Below is how we'd structure LV to hit that target — built around our actual fill data and operational efficiency, not uniform cuts.">
              A Las Vegas restructure
              <span className="block text-shortcut-teal-blue">to hit $5,400 / month.</span>
            </SectionHeading>

            {/* ── Budget target card ── */}
            <div className="rounded-3xl bg-[#F0F0FF] p-7 md:p-10 mb-6 md:mb-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-shortcut-teal/30 to-transparent rounded-full -translate-y-1/3 translate-x-1/3" />
              <div className="relative">
                <div className="text-[11px] font-extrabold uppercase tracking-[.15em] text-shortcut-blue/50 mb-2">DraftKings target</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
                  <div>
                    <div className="text-[2.25rem] md:text-[3rem] font-extrabold text-shortcut-blue leading-none tabular-nums">$5,400</div>
                    <div className="text-[12px] font-bold uppercase tracking-wider text-shortcut-blue/50 mt-2">All-in / mo</div>
                  </div>
                  <div>
                    <div className="text-[2.25rem] md:text-[3rem] font-extrabold text-shortcut-blue leading-none tabular-nums">$4,500</div>
                    <div className="text-[12px] font-bold uppercase tracking-wider text-shortcut-blue/50 mt-2">Base / mo</div>
                  </div>
                  <div>
                    <div className="text-[2.25rem] md:text-[3rem] font-extrabold text-shortcut-blue leading-none tabular-nums">35</div>
                    <div className="text-[12px] font-bold uppercase tracking-wider text-shortcut-blue/50 mt-2">Pro-hours / mo</div>
                  </div>
                  <div>
                    <div className="text-[2.25rem] md:text-[3rem] font-extrabold text-shortcut-blue leading-none tabular-nums">$154</div>
                    <div className="text-[12px] font-bold uppercase tracking-wider text-shortcut-blue/50 mt-2">Rate / hr (all-in)</div>
                  </div>
                </div>
                <p className="mt-6 text-[14px] md:text-[15px] text-shortcut-blue/70 font-medium leading-relaxed max-w-[680px]">
                  Current LV burn is <strong className="text-shortcut-blue">~$7,952 all-in / month</strong>, combining Main LV ($6,625) and Trader Monthly Perks ($1,327). Hitting $5,400 requires a <strong className="text-shortcut-blue">32% reduction</strong>.
                </p>
              </div>
            </div>

            {/* ── The 2-hour problem card ── */}
            <div className="card-large mb-6 md:mb-8">
              <div className="mb-6">
                <div className="text-[11px] font-bold uppercase tracking-[.12em] text-shortcut-blue/40 mb-1">Why event length matters</div>
                <h3 className="text-[20px] md:text-[24px] font-extrabold text-shortcut-blue leading-tight">
                  Short events look cheap.
                  <span className="text-shortcut-teal-blue"> They aren't.</span>
                </h3>
                <p className="mt-2 text-[14px] md:text-[15px] text-text-dark/70 font-medium leading-relaxed max-w-[680px]">
                  Every event has fixed setup and teardown — about 30-45 minutes of pro time before and after, regardless of duration. The shorter the event, the worse the throughput ratio gets.
                </p>
              </div>

              {/* Visual comparison */}
              <div className="space-y-4 md:space-y-5">
                {/* 2-hour event */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[13px] font-extrabold text-shortcut-blue">2-hour Hair event</div>
                    <div className="text-[12px] font-bold text-shortcut-coral">~3 cuts max</div>
                  </div>
                  <div className="relative h-9 rounded-lg overflow-hidden flex">
                    <div className="bg-shortcut-blue/15 flex items-center px-2.5" style={{ width: '20%' }}>
                      <span className="text-[10px] font-bold text-shortcut-blue/70 uppercase tracking-wider">Setup</span>
                    </div>
                    <div className="bg-shortcut-coral/20 flex items-center px-3" style={{ width: '60%' }}>
                      <span className="text-[11px] font-extrabold text-shortcut-blue">~75 min cutting time</span>
                    </div>
                    <div className="bg-shortcut-blue/15 flex items-center px-2.5" style={{ width: '20%' }}>
                      <span className="text-[10px] font-bold text-shortcut-blue/70 uppercase tracking-wider">Tear-down</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-shortcut-blue/50 font-medium mt-1.5">40% of pro time is setup/teardown · cost-per-appt rises sharply</div>
                </div>

                {/* 4-hour event */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[13px] font-extrabold text-shortcut-blue">4-hour Hair event</div>
                    <div className="text-[12px] font-bold text-emerald-700">~7 cuts</div>
                  </div>
                  <div className="relative h-9 rounded-lg overflow-hidden flex">
                    <div className="bg-shortcut-blue/15 flex items-center px-2.5" style={{ width: '10%' }}>
                      <span className="text-[10px] font-bold text-shortcut-blue/70 uppercase tracking-wider">Set</span>
                    </div>
                    <div className="bg-accent-yellow flex items-center px-3" style={{ width: '80%' }}>
                      <span className="text-[11px] font-extrabold text-shortcut-blue">~3 hr 15 min cutting time</span>
                    </div>
                    <div className="bg-shortcut-blue/15 flex items-center px-2.5" style={{ width: '10%' }}>
                      <span className="text-[10px] font-bold text-shortcut-blue/70 uppercase tracking-wider">T-D</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-shortcut-blue/50 font-medium mt-1.5">~80% productive time · 2.3× the appts for 2× the cost</div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-shortcut-blue/[.06] grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-shortcut-teal/30 flex items-center justify-center mt-0.5">
                    <DollarSign size={15} className="text-shortcut-blue" strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="text-[13px] font-extrabold text-shortcut-blue mb-1">The cost angle</div>
                    <p className="text-[13px] text-text-dark/75 font-medium leading-relaxed">
                      A weekly 4-hour Hair event delivers <strong className="text-shortcut-blue">~28 appts/month</strong> — about the same as four scattered 2-hour events, with simpler ops and a predictable booking rhythm.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-accent-yellow/40 flex items-center justify-center mt-0.5">
                    <Scissors size={15} className="text-shortcut-blue" strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="text-[13px] font-extrabold text-shortcut-blue mb-1">The staffing angle</div>
                    <p className="text-[13px] text-text-dark/75 font-medium leading-relaxed">
                      Hair pros consistently <strong className="text-shortcut-blue">prefer fewer, longer days</strong> over multiple short events. Travel and setup are the same effort either way — they'd rather lock in one solid 4-hour booking than juggle two 2-hour ones, and our best barbers decline short bookings.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Two side-by-side scenarios intro ── */}
            <div className="mb-5">
              <div className="text-[11px] font-bold uppercase tracking-[.12em] text-shortcut-blue/40 mb-1">Two options to consider</div>
              <h3 className="text-[20px] md:text-[24px] font-extrabold text-shortcut-blue leading-tight">
                Strict $5,400 hit
                <span className="text-shortcut-teal-blue"> or light-touch preservation.</span>
              </h3>
              <p className="mt-2 text-[14px] md:text-[15px] text-text-dark/70 font-medium leading-relaxed max-w-[760px]">
                Both options share the same operational logic: weekly Hair, drop Trader Massage, move Facials to quarterly. The difference is one decision &mdash; what to do with Main LV Massage.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5 mb-6 md:mb-8">

              {/* ===== SCENARIO A: STRICT ===== */}
              <div className="rounded-3xl bg-white border border-shortcut-blue/10 shadow-[0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col">
                <div className="bg-shortcut-blue px-6 py-5 md:px-7 md:py-6">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="text-[10px] font-extrabold uppercase tracking-[.15em] text-shortcut-teal mb-1">Scenario A</div>
                      <h4 className="text-[20px] md:text-[22px] font-extrabold text-white leading-tight">Strict hit</h4>
                      <div className="text-[12px] text-white/60 font-medium mt-1">Lands under $5,400 target</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-0.5">All-in / mo</div>
                      <div className="text-[24px] md:text-[28px] font-extrabold text-shortcut-teal tabular-nums leading-none">$5,212</div>
                      <div className="text-[11px] text-emerald-300 font-semibold mt-1">$188 under target</div>
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-7 flex-1 flex flex-col">
                  <div className="space-y-2 mb-5">
                    {[
                      { svc: 'Hair' as ServiceKey, label: 'Main Hair', cadence: 'Weekly · 4hr', hrs: 16, appts: '~28' },
                      { svc: 'Massage' as ServiceKey, label: 'Main Massage', cadence: 'Bi-weekly · 4hr', hrs: 8, appts: '~12', highlight: true },
                      { svc: 'Nails' as ServiceKey, label: 'Main Nails', cadence: 'Monthly · 4hr', hrs: 4, appts: '~6' },
                      { svc: 'Beauty' as ServiceKey, label: 'Facials', cadence: 'Quarterly · 5hr', hrs: 1.67, appts: '~2' },
                      { svc: 'Hair' as ServiceKey, label: 'Trader Hair', cadence: 'Monthly · 4hr', hrs: 4, appts: '~8' },
                    ].map((row, i) => {
                      const s = SERVICES[row.svc];
                      const Icon = s.icon;
                      return (
                        <div key={i} className={`flex items-center gap-3 py-2 ${row.highlight ? 'bg-shortcut-teal/15 rounded-lg px-2.5 -mx-2.5' : ''}`}>
                          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: s.bg }}>
                            <Icon size={13} className="text-shortcut-blue" strokeWidth={2.25} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-extrabold text-shortcut-blue leading-tight">{row.label}</div>
                            <div className="text-[11px] text-shortcut-blue/60 font-medium">{row.cadence}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-[13px] font-extrabold text-shortcut-blue tabular-nums">{row.hrs} hr</div>
                            <div className="text-[10px] text-shortcut-blue/50 font-semibold uppercase tracking-wide">{row.appts} appts</div>
                          </div>
                        </div>
                      );
                    })}
                    {/* Trader Massage dropped */}
                    <div className="flex items-center gap-3 py-2 bg-shortcut-coral/[.06] rounded-lg px-2.5 -mx-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-shortcut-coral/20">
                        <AlertTriangle size={13} className="text-shortcut-coral" strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-extrabold text-shortcut-coral leading-tight">Trader Massage</div>
                        <div className="text-[11px] text-shortcut-blue/60 font-medium italic">dropped · 54% fill</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[13px] font-extrabold text-shortcut-coral tabular-nums">0 hr</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-shortcut-blue/[.08] grid grid-cols-3 gap-3">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-shortcut-blue/40">Pro-hrs / mo</div>
                      <div className="text-[18px] font-extrabold text-shortcut-blue tabular-nums leading-tight">33.67</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-shortcut-blue/40">Appts / mo</div>
                      <div className="text-[18px] font-extrabold text-shortcut-blue tabular-nums leading-tight">~56</div>
                      <div className="text-[10px] text-shortcut-coral font-semibold">~47% cut</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-shortcut-blue/40">Base $ / mo</div>
                      <div className="text-[18px] font-extrabold text-shortcut-blue tabular-nums leading-tight">$4,343</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ===== SCENARIO B: LIGHT TOUCH ===== */}
              <div className="rounded-3xl bg-white border-2 border-shortcut-teal/50 shadow-[0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col relative">
                <div className="absolute top-3 right-3 z-10 text-[10px] font-extrabold uppercase tracking-[.1em] bg-accent-yellow text-shortcut-blue px-2.5 py-1 rounded-full shadow-sm">
                  Our recommendation
                </div>
                <div className="bg-shortcut-teal/25 px-6 py-5 md:px-7 md:py-6 border-b border-shortcut-teal/30">
                  <div className="flex items-end justify-between flex-wrap gap-2 mt-4">
                    <div>
                      <div className="text-[10px] font-extrabold uppercase tracking-[.15em] text-shortcut-blue/60 mb-1">Scenario B</div>
                      <h4 className="text-[20px] md:text-[22px] font-extrabold text-shortcut-blue leading-tight">Light touch</h4>
                      <div className="text-[12px] text-shortcut-blue/60 font-medium mt-1">Preserves Massage cadence</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-shortcut-blue/50 mb-0.5">All-in / mo</div>
                      <div className="text-[24px] md:text-[28px] font-extrabold text-shortcut-blue tabular-nums leading-none">$6,450</div>
                      <div className="text-[11px] text-shortcut-blue/60 font-semibold mt-1">$1,050 over target</div>
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-7 flex-1 flex flex-col">
                  <div className="space-y-2 mb-5">
                    {[
                      { svc: 'Hair' as ServiceKey, label: 'Main Hair', cadence: 'Weekly · 4hr', hrs: 16, appts: '~28' },
                      { svc: 'Massage' as ServiceKey, label: 'Main Massage', cadence: 'Weekly · 4hr', hrs: 16, appts: '~24', highlight: true },
                      { svc: 'Nails' as ServiceKey, label: 'Main Nails', cadence: 'Monthly · 4hr', hrs: 4, appts: '~6' },
                      { svc: 'Beauty' as ServiceKey, label: 'Facials', cadence: 'Quarterly · 5hr', hrs: 1.67, appts: '~2' },
                      { svc: 'Hair' as ServiceKey, label: 'Trader Hair', cadence: 'Monthly · 4hr', hrs: 4, appts: '~8' },
                    ].map((row, i) => {
                      const s = SERVICES[row.svc];
                      const Icon = s.icon;
                      return (
                        <div key={i} className={`flex items-center gap-3 py-2 ${row.highlight ? 'bg-accent-yellow/25 rounded-lg px-2.5 -mx-2.5' : ''}`}>
                          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: s.bg }}>
                            <Icon size={13} className="text-shortcut-blue" strokeWidth={2.25} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-extrabold text-shortcut-blue leading-tight">{row.label}</div>
                            <div className="text-[11px] text-shortcut-blue/60 font-medium">{row.cadence}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-[13px] font-extrabold text-shortcut-blue tabular-nums">{row.hrs} hr</div>
                            <div className="text-[10px] text-shortcut-blue/50 font-semibold uppercase tracking-wide">{row.appts} appts</div>
                          </div>
                        </div>
                      );
                    })}
                    {/* Trader Massage dropped */}
                    <div className="flex items-center gap-3 py-2 bg-shortcut-coral/[.06] rounded-lg px-2.5 -mx-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-shortcut-coral/20">
                        <AlertTriangle size={13} className="text-shortcut-coral" strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-extrabold text-shortcut-coral leading-tight">Trader Massage</div>
                        <div className="text-[11px] text-shortcut-blue/60 font-medium italic">dropped · 54% fill</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[13px] font-extrabold text-shortcut-coral tabular-nums">0 hr</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-shortcut-blue/[.08] grid grid-cols-3 gap-3">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-shortcut-blue/40">Pro-hrs / mo</div>
                      <div className="text-[18px] font-extrabold text-shortcut-blue tabular-nums leading-tight">41.67</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-shortcut-blue/40">Appts / mo</div>
                      <div className="text-[18px] font-extrabold text-shortcut-blue tabular-nums leading-tight">~68</div>
                      <div className="text-[10px] text-shortcut-blue/60 font-semibold">~36% cut</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-shortcut-blue/40">Base $ / mo</div>
                      <div className="text-[18px] font-extrabold text-shortcut-blue tabular-nums leading-tight">$5,375</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── The decision in one number ── */}
            <div className="card-medium" style={{ backgroundColor: '#F0F0FF' }}>
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-10 h-10 rounded-full bg-shortcut-teal/40 flex items-center justify-center mt-0.5">
                  <DollarSign size={18} className="text-shortcut-blue" strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="text-[16px] md:text-[17px] font-extrabold text-shortcut-blue mb-2">The decision in one number: <span className="text-shortcut-teal-blue">$1,238 / month.</span></h4>
                  <p className="text-[14px] text-text-dark/75 font-medium leading-relaxed">
                    That's the all-in cost difference between the two scenarios &mdash; the price of keeping Main LV Massage weekly instead of bi-weekly. It buys back <strong className="text-shortcut-blue">~12 additional appointments per month</strong> and lifts Massage coverage from ~12 employees back up to ~24. Massage runs at 100% fill today, so the demand is there.
                  </p>
                  <p className="mt-3 text-[14px] text-text-dark/75 font-medium leading-relaxed">
                    Strict hits the target precisely. Light touch preserves more service for the cost of one over-budget line item. Both options drop the underfilled Trader Massage and keep the 100%-filling Trader Hair untouched.
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-6 text-[13px] text-shortcut-blue/60 font-medium leading-relaxed">
              Worth noting: NY and NJ are running at 100% fill with a 137-employee NY waitlist over the same six months. If LV does scale back, any unspent budget there could meaningfully expand cadence or capacity in NY without overshooting.
            </p>
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
                {
                  title: 'Peak Fill',
                  body: 'The highest share of slots booked at any single moment, even if some bookings were cancelled later. Counts (currently reserved) + (cancelled-by-customer slots), capped at event capacity. This is the metric used for the "90% reached 100%" headline.',
                },
                {
                  title: 'Actually Served',
                  body: 'Appointments delivered on the day. Equal to currently-reserved slots (cancellations subtracted).',
                },
                {
                  title: 'Cost / Appointment',
                  body: 'Event payment ÷ appointments served. DraftKings pays a flat per-event fee — cost per appointment is a derived metric, not a per-unit charge.',
                },
                {
                  title: '20% Gratuity',
                  body: 'DraftKings adds a 20% gratuity to every event across all cities. Most numbers in this report show "Paid to Shortcut" — the base. The "All-in" figures in the Monthly Spend card include the +20% gratuity, matching DraftKings\' internal ledger.',
                },
                {
                  title: 'Beauty vs. Facial',
                  body: '"Beauty" is the category label in our system. The service title within Beauty is "Facial." Same thing — different label.',
                },
                {
                  title: 'Trader Monthly Perks',
                  body: 'A separate Vegas sub-program (code DRAFTKINGSVEGAS) running alongside the main LV program. We\'ve reported it on its own line where relevant because its fill profile is very different from the main program.',
                },
                {
                  title: 'Source data',
                  body: 'Pulled directly from the Shortcut Coordinator (Parse) backend on May 13, 2026. Per-event CSV available on request — covers 71 events with peak fill, served, cancellations, payment, and waitlist count.',
                },
              ].map((item, i) => (
                <div key={i} className="card-small">
                  <h4 className="text-[14px] font-extrabold text-shortcut-blue mb-2">{item.title}</h4>
                  <p className="text-[13px] text-text-dark/70 font-medium leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* ══════════════════════════════════════════
              MINIMAL SIGN-OFF
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

          {/* ── Bottom spacer ── */}
          <div className="h-8" />
        </div>
      </main>
    </div>
  );
}
