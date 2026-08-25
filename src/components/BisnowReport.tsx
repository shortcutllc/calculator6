import { useEffect, useRef, useState } from 'react';
import { Users, DollarSign, MapPin, Calendar, Scissors, Heart, Mail, Smartphone, Package, Award, Eye, EyeOff } from 'lucide-react';

/* ─────────────────────────────────────────────
   Bisnow × Shortcut — Escape + Ascent, by the numbers
   Five years at 1 Hotel South Beach (2021–2025)
   Shortcut design system — visual, card-based
   Data source: Shortcut Coordinator (Parse), pulled Aug 18 2026.
   All figures below are drawn directly from the 28 real (non-test,
   non-cancelled) Bisnow Escape + Ascent events on file.
   ───────────────────────────────────────────── */

const SERVICES = {
  Hair: { bg: '#FEDC64', tint: '#FFF6CC', deep: '#92750C', icon: Scissors, label: 'Hair' },
  Massage: { bg: '#9EFAFF', tint: '#E2FAFC', deep: '#015F6E', icon: Heart, label: 'Massage' },
} as const;

type ServiceKey = keyof typeof SERVICES;

// ── Per-year data, pulled from the coordinator ──
const YEARS = [
  {
    year: '2021', days: 4, services: ['Hair'] as ServiceKey[], pros: ['Eddie Montalvo', 'Sally Souffrant'],
    slots: 64, filled: null as number | null, fillPct: null as number | null,
    payment: 3840, barberPay: 1800, venue: 'Terra Ballroom',
    contact: 'Katie LaPerch',
  },
  {
    year: '2022', days: 4, services: ['Hair', 'Massage'] as ServiceKey[], pros: ['Cesar Brickell', 'Eddie Montalvo', 'Ray Edden'],
    slots: 104, filled: 96, fillPct: 92.3,
    payment: 5640, barberPay: 2450, venue: 'Terra Gallery',
    contact: 'Aly Vazquez',
  },
  {
    year: '2023', days: 4, services: ['Hair', 'Massage'] as ServiceKey[], pros: ['Cesar Brickell', 'Eddie Montalvo', 'Kirvin Shand'],
    slots: 96, filled: 93, fillPct: 96.9,
    payment: 5640, barberPay: 2300, venue: 'Terra Gallery',
    contact: 'Gretchen Severns',
  },
  {
    year: '2024', days: 4, services: ['Hair', 'Massage'] as ServiceKey[], pros: ['Cesar Brickell', 'Eddie Montalvo', 'Meryhec Lopez'],
    slots: 110, filled: 101, fillPct: 91.8,
    payment: 5520, barberPay: 2250, venue: 'Terra Gallery',
    contact: null,
  },
  {
    year: '2025', days: 4, services: ['Hair', 'Massage'] as ServiceKey[], pros: ['Cesar Brickell', 'Eddie Montalvo', 'Julia Gonzalez Angulo', 'Meryhec Lopez', 'Pedro Rosario'],
    slots: 120, filled: 112, fillPct: 93.3,
    payment: 6250, barberPay: 2625, venue: 'Terra Gallery + Garnet I & II',
    contact: 'Megan Harding & Ariel Fromm',
  },
];

type DayBooking = { day: string; svc: ServiceKey; booked: number; total: number; venue: string };

// Day-by-day booking detail. 2021 isn't shown here — no day-level detail on
// file for that year, only the year totals above.
const BOOKINGS_BY_YEAR: Record<string, DayBooking[]> = {
  '2022': [
    { day: 'Mon · Nov 7', svc: 'Massage', booked: 14, total: 16, venue: 'Terra Gallery' },
    { day: 'Mon · Nov 7', svc: 'Hair', booked: 20, total: 22, venue: 'Terra Gallery' },
    { day: 'Tue · Nov 8', svc: 'Hair', booked: 13, total: 14, venue: 'Terra Gallery' },
    { day: 'Wed · Nov 9', svc: 'Massage', booked: 16, total: 16, venue: 'Terra Gallery' },
    { day: 'Wed · Nov 9', svc: 'Hair', booked: 21, total: 22, venue: 'Terra Gallery' },
    { day: 'Thu · Nov 10', svc: 'Hair', booked: 12, total: 14, venue: 'Terra Gallery' },
  ],
  '2023': [
    { day: 'Mon · Nov 6', svc: 'Hair', booked: 22, total: 22, venue: 'Terra Gallery' },
    { day: 'Mon · Nov 6', svc: 'Massage', booked: 16, total: 16, venue: 'Terra Gallery' },
    { day: 'Tue · Nov 7', svc: 'Hair', booked: 14, total: 14, venue: 'Terra Gallery' },
    { day: 'Wed · Nov 8', svc: 'Hair', booked: 13, total: 14, venue: 'Terra Gallery' },
    { day: 'Wed · Nov 8', svc: 'Massage', booked: 16, total: 16, venue: 'Terra Gallery' },
    { day: 'Thu · Nov 9', svc: 'Hair', booked: 12, total: 14, venue: 'Terra Gallery' },
  ],
  '2024': [
    { day: 'Mon · Nov 4', svc: 'Hair', booked: 21, total: 22, venue: 'Terra Gallery' },
    { day: 'Mon · Nov 4', svc: 'Massage', booked: 16, total: 16, venue: 'Terra Gallery' },
    { day: 'Tue · Nov 5', svc: 'Hair', booked: 11, total: 12, venue: 'Terra Gallery' },
    { day: 'Wed · Nov 6', svc: 'Hair', booked: 17, total: 22, venue: 'Terra Gallery' },
    { day: 'Wed · Nov 6', svc: 'Massage', booked: 16, total: 16, venue: 'Terra Gallery' },
    { day: 'Thu · Nov 7', svc: 'Hair', booked: 20, total: 22, venue: 'Terra Gallery' },
  ],
  '2025': [
    { day: 'Mon · Nov 3', svc: 'Massage', booked: 30, total: 30, venue: 'Garnet I + II' },
    { day: 'Mon · Nov 3', svc: 'Hair', booked: 18, total: 20, venue: 'Terra Gallery' },
    { day: 'Tue · Nov 4', svc: 'Hair', booked: 9, total: 10, venue: 'Terra Gallery' },
    { day: 'Wed · Nov 5', svc: 'Hair', booked: 17, total: 20, venue: 'Terra Gallery' },
    { day: 'Wed · Nov 5', svc: 'Massage', booked: 30, total: 30, venue: 'Garnet I + II' },
    { day: 'Thu · Nov 6', svc: 'Hair', booked: 8, total: 10, venue: 'Terra Gallery' },
  ],
};

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

// ── Year-over-year bars: event cost ──
function YearlyBars() {
  const maxPaid = Math.max(...YEARS.map(y => y.payment || 0));
  return (
    <div className="card-large">
      <div className="mb-6 md:mb-7">
        <div className="text-[11px] font-bold uppercase tracking-[.12em] text-shortcut-blue/40 mb-1">Year over year</div>
        <h2 className="text-[1.75rem] md:text-[2.25rem] font-extrabold text-shortcut-blue leading-tight">
          Event cost,
          <span className="text-shortcut-teal-blue"> by year.</span>
        </h2>
      </div>
      <div className="space-y-3">
        {YEARS.map((y) => {
          const pct = (y.payment / maxPaid) * 100;
          const barColor = y.year === '2025' ? 'bg-accent-yellow' : 'bg-shortcut-teal';
          return (
            <div key={y.year} className="grid grid-cols-[52px_1fr_150px] md:grid-cols-[64px_1fr_190px] gap-3 md:gap-4 items-center">
              <div className="text-[13px] md:text-[14px] font-bold text-shortcut-blue tabular-nums">{y.year}</div>
              <div className="relative h-9 rounded-lg bg-shortcut-blue/[.04]">
                <div
                  className={`absolute inset-y-0 left-0 rounded-lg ${barColor} transition-all duration-700 ease-out flex items-center px-3`}
                  style={{ width: `${pct}%` }}
                >
                  <span className="text-[11px] md:text-[12px] font-extrabold tabular-nums text-shortcut-blue">
                    ${y.payment.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="text-[11px] md:text-[12px] text-shortcut-blue/60 font-semibold text-right tabular-nums">
                {y.pros.length} pros · {y.slots} slots offered
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-[12px] text-shortcut-blue/50 font-medium">* Yellow = peak year, in billing and capacity.</p>
    </div>
  );
}

// ── Per-year table ──
function YearlyTable() {
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full min-w-[860px] border-collapse">
        <thead>
          <tr className="border-b-2 border-shortcut-blue/[.12]">
            <th className="text-left py-3 px-3 text-[10px] font-extrabold uppercase tracking-[.1em] text-shortcut-blue/40">Year</th>
            <th className="text-left py-3 px-3 text-[10px] font-extrabold uppercase tracking-[.1em] text-shortcut-blue/40">Services</th>
            <th className="text-right py-3 px-3 text-[10px] font-extrabold uppercase tracking-[.1em] text-shortcut-blue/40">Pros</th>
            <th className="text-right py-3 px-3 text-[10px] font-extrabold uppercase tracking-[.1em] text-shortcut-blue/40">Slots Offered</th>
            <th className="text-right py-3 px-3 text-[10px] font-extrabold uppercase tracking-[.1em] text-shortcut-blue/40">Fill Rate</th>
            <th className="text-right py-3 px-3 text-[10px] font-extrabold uppercase tracking-[.1em] text-shortcut-blue">Event Cost</th>
          </tr>
        </thead>
        <tbody>
          {YEARS.map((y) => (
            <tr key={y.year} className="border-b border-shortcut-blue/[.06]">
              <td className="py-3.5 px-3 text-[13px] font-extrabold text-shortcut-blue tabular-nums">{y.year}</td>
              <td className="py-3.5 px-3 text-[13px] font-semibold text-shortcut-blue/70">{y.services.join(' + ')}</td>
              <td className="py-3.5 px-3 text-right text-[14px] font-semibold tabular-nums text-shortcut-blue">{y.pros.length}</td>
              <td className="py-3.5 px-3 text-right text-[14px] font-semibold tabular-nums text-shortcut-blue">{y.slots}</td>
              <td className="py-3.5 px-3 text-right text-[14px] font-semibold tabular-nums text-shortcut-blue">
                {y.fillPct !== null ? `${y.fillPct}%` : <span className="text-shortcut-blue/30">n/a</span>}
              </td>
              <td className="py-3.5 px-3 text-right text-[14px] font-extrabold tabular-nums text-shortcut-blue">
                ${y.payment.toLocaleString()}
              </td>
            </tr>
          ))}
          <tr className="bg-shortcut-blue">
            <td className="py-4 px-3 text-[13px] font-extrabold text-white rounded-l-xl" colSpan={2}>5-year total</td>
            <td className="py-4 px-3 text-right text-[14px] font-extrabold text-white tabular-nums">8 unique</td>
            <td className="py-4 px-3 text-right text-[14px] font-extrabold text-white tabular-nums">494</td>
            <td className="py-4 px-3 text-right text-[14px] font-extrabold text-shortcut-teal tabular-nums">93.5%*</td>
            <td className="py-4 px-3 text-right text-[15px] font-extrabold text-shortcut-teal tabular-nums rounded-r-xl">$26,890</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-5 text-[12px] text-shortcut-blue/50 font-medium leading-relaxed">
        * Fill rate excludes 2021 — no day-level booking detail on file that year.
      </p>
    </div>
  );
}

// ── Booking stats, day by day, every year with detail on file ──
function BookingStatsByYear() {
  return (
    <div className="space-y-6">
      {YEARS.filter((y) => BOOKINGS_BY_YEAR[y.year]).map((y) => {
        const bookings = BOOKINGS_BY_YEAR[y.year];
        return (
          <div key={y.year} className="card-large">
            <div className="flex items-baseline justify-between mb-5 flex-wrap gap-2">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[.12em] text-shortcut-blue/40 mb-1">{y.year}</div>
                <h3 className="text-[20px] md:text-[22px] font-extrabold text-shortcut-blue leading-tight">{y.fillPct}% filled</h3>
              </div>
              <div className="text-[12px] font-semibold text-shortcut-blue/50">{y.venue}</div>
            </div>

            <div className="space-y-3">
              {bookings.map((d, i) => {
                const s = SERVICES[d.svc];
                const pct = (d.booked / d.total) * 100;
                const isZero = d.booked === 0;
                return (
                  <div key={i} className="grid grid-cols-[110px_60px_1fr_70px] md:grid-cols-[130px_90px_1fr_90px] gap-3 items-center">
                    <div className="text-[12px] md:text-[13px] font-bold text-shortcut-blue">{d.day}</div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.bg }} />
                      <span className="text-[11px] font-semibold text-shortcut-blue/60">{d.svc}</span>
                    </div>
                    <div className="relative h-8 rounded-lg bg-shortcut-blue/[.04]">
                      <div
                        className={`absolute inset-y-0 left-0 rounded-lg flex items-center px-3 ${isZero ? 'bg-shortcut-coral' : ''}`}
                        style={{ width: isZero ? '100%' : `${Math.max(pct, 4)}%`, backgroundColor: isZero ? undefined : s.bg }}
                      >
                        <span className={`text-[11px] font-extrabold tabular-nums ${isZero ? 'text-white' : 'text-shortcut-blue'}`}>
                          {d.booked}/{d.total}
                        </span>
                      </div>
                    </div>
                    <div className="text-[11px] font-semibold text-shortcut-blue/50 text-right">{d.venue}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════

export default function BisnowReport() {
  const [authenticated, setAuthenticated] = useState(() => {
    return sessionStorage.getItem('bisnow-auth') === 'true';
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'BISNOWSC2026') {
      sessionStorage.setItem('bisnow-auth', 'true');
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
              <div className="text-[22px] font-extrabold tracking-tight text-shortcut-blue">BISNOW</div>
              <div className="h-6 w-px bg-shortcut-blue/15" aria-hidden="true" />
              <img
                src="/shortcut-logo-blue.svg"
                alt="Shortcut"
                className="h-5 w-auto"
              />
            </div>
            <div className="text-[12px] text-shortcut-blue/50 font-medium">Escape + Ascent Report</div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
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
    { id: 'yearly', label: 'Year over Year' },
    { id: 'table', label: 'Per-Year Detail' },
    { id: 'services', label: 'Service Mix' },
    { id: 'days', label: 'Booking Stats by Year' },
  ];

  return (
    <div className="min-h-screen bg-neutral-light-gray font-['Outfit',system-ui,sans-serif]">

      {/* ── Sticky nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-shortcut-blue/[.06]">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="text-[16px] font-extrabold tracking-tight text-shortcut-blue">BISNOW</div>
            <div className="h-4 w-px bg-shortcut-blue/15" aria-hidden="true" />
            <img
              src="/shortcut-logo-blue.svg"
              alt="Shortcut"
              className="h-4 w-auto"
            />
            <div className="hidden sm:block ml-1 md:ml-2 pl-3 md:pl-4 border-l border-shortcut-blue/[.12] text-[10px] font-semibold uppercase tracking-wider text-shortcut-blue/40">
              Escape + Ascent Report
            </div>
          </div>
          <div className="hidden md:block text-[11px] font-bold uppercase tracking-[.12em] text-shortcut-blue/40">2021 – 2025</div>
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
              HERO CARD
              ══════════════════════════════════════════ */}
          <Section>
            <div className="relative overflow-hidden rounded-3xl" style={{ backgroundColor: '#F0F0FF' }}>
              <div className="relative z-10 px-6 py-10 md:px-12 md:py-14">
                <div className="flex items-center gap-5 md:gap-7 mb-8 pb-6 border-b border-shortcut-blue/[.1]">
                  <div className="text-[26px] md:text-[32px] font-extrabold tracking-tight text-shortcut-blue">BISNOW</div>
                  <div className="h-7 md:h-10 w-px bg-shortcut-blue/15" aria-hidden="true" />
                  <img
                    src="/shortcut-logo-blue.svg"
                    alt="Shortcut"
                    className="h-6 md:h-8 w-auto"
                  />
                </div>
                <div className="text-[11px] font-extrabold uppercase tracking-[.18em] text-shortcut-blue/50 mb-3">
                  Five Years at 1 Hotel South Beach
                </div>
                <h1 className="text-[2.5rem] md:text-[4rem] lg:text-[4.5rem] font-extrabold text-shortcut-blue leading-[1.02] tracking-tight">
                  Bisnow Escape + Ascent,
                  <span className="block text-shortcut-teal-blue">by the numbers.</span>
                </h1>
                <p className="text-[16px] md:text-[19px] text-text-dark/70 mt-5 font-medium leading-relaxed max-w-[680px]">
                  Every grooming and massage appointment at Bisnow Escape + Ascent in Miami Beach since 2021 — one hair line grown into two service rooms.
                </p>

                <div className="flex flex-wrap gap-3 mt-7">
                  <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm border border-white/60">
                    <Calendar size={14} className="text-shortcut-blue" strokeWidth={2.5} />
                    <span className="text-[13px] font-bold text-shortcut-blue">Nov 2021 – Nov 2025</span>
                  </div>
                  <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm border border-white/60">
                    <MapPin size={14} className="text-shortcut-blue" strokeWidth={2.5} />
                    <span className="text-[13px] font-bold text-shortcut-blue">1 Hotel South Beach · Miami Beach, FL</span>
                  </div>
                  <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm border border-white/60">
                    <Users size={14} className="text-shortcut-blue" strokeWidth={2.5} />
                    <span className="text-[13px] font-bold text-shortcut-blue">28 events across 20 event-days</span>
                  </div>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-shortcut-teal/40 to-transparent rounded-full -translate-y-1/3 translate-x-1/3" />
              <div className="absolute bottom-0 left-0 w-56 h-56 bg-gradient-to-tr from-accent-pink/30 to-transparent rounded-full translate-y-1/3 -translate-x-1/3" />
            </div>
          </Section>

          {/* ══════════════════════════════════════════
              WHAT'S IN THE NUMBER
              ══════════════════════════════════════════ */}
          <Section>
            <div className="rounded-3xl bg-white border border-shortcut-blue/[.08] p-7 md:p-10 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
              <div className="mb-7 md:mb-8">
                <div className="text-[11px] font-extrabold uppercase tracking-[.15em] text-shortcut-blue/40 mb-2">What's in the number</div>
                <h2 className="text-[1.75rem] md:text-[2.25rem] font-extrabold text-shortcut-blue leading-tight">
                  What every Escape + Ascent
                  <span className="block text-shortcut-teal-blue">includes.</span>
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {[
                  { Icon: Award, tint: 'bg-shortcut-teal/30', title: 'A returning crew', body: 'Eddie Montalvo has cut hair at every Escape + Ascent since 2021.' },
                  { Icon: Mail, tint: 'bg-accent-yellow/40', title: 'Light lift on your side', body: 'We run scheduling, communications, and day-of logistics — not your team.' },
                  { Icon: Smartphone, tint: 'bg-accent-pink/30', title: 'Technology built in', body: 'Attendees book with automated reminders and confirmations.' },
                  { Icon: Package, tint: 'bg-shortcut-coral/15', title: 'Two rooms, one team', body: 'Since 2025, Hair and Massage run at once in separate rooms.' },
                ].map((tile, i) => {
                  const { Icon } = tile;
                  return (
                    <div key={i} className="rounded-2xl p-5 md:p-6 border border-shortcut-blue/[.06] bg-white hover:-translate-y-1 hover:shadow-md transition-all duration-300">
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
              HEADLINE STATS
              ══════════════════════════════════════════ */}
          <Section id="headline">
            <div data-toc id="headline" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
              <HeroStat value="5" label="Years Running" sublabel="since Nov 2021" color="navy" />
              <HeroStat value="28" label="Events Delivered" sublabel="across 20 event-days" color="teal" />
              <HeroStat value="94%" label="of timeslots filled" sublabel="2022–2025" color="yellow" />
              <HeroStat value="$26,890" label="Total Event Cost" sublabel="since 2021" color="pink" />
            </div>
          </Section>

          {/* ══════════════════════════════════════════
              YEAR OVER YEAR
              ══════════════════════════════════════════ */}
          <Section id="yearly">
            <div data-toc id="yearly" />
            <YearlyBars />
          </Section>

          {/* ══════════════════════════════════════════
              PER-YEAR TABLE
              ══════════════════════════════════════════ */}
          <Section id="table">
            <div data-toc id="table" />
            <div className="card-large">
              <div className="mb-6 md:mb-7">
                <div className="text-[11px] font-bold uppercase tracking-[.12em] text-shortcut-blue/40 mb-1">The full picture</div>
                <h2 className="text-[1.75rem] md:text-[2.25rem] font-extrabold text-shortcut-blue leading-tight">
                  Every year,
                  <span className="text-shortcut-teal-blue"> side by side.</span>
                </h2>
              </div>
              <YearlyTable />
            </div>
          </Section>

          {/* ══════════════════════════════════════════
              SERVICE MIX EVOLUTION
              ══════════════════════════════════════════ */}
          <Section id="services">
            <div data-toc id="services" />
            <SectionLabel>Section I · How the program grew</SectionLabel>
            <SectionHeading subtitle="From one hair line to two service rooms running at once.">
              Service mix,
              <span className="block text-shortcut-teal-blue">year by year.</span>
            </SectionHeading>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <div className="card-medium">
                <div className="text-[11px] font-bold uppercase tracking-[.12em] text-shortcut-blue/40 mb-1">2021 · Year one</div>
                <h3 className="text-[20px] font-extrabold text-shortcut-blue mb-3">Hair only, Terra Ballroom</h3>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shadow-sm" style={{ backgroundColor: SERVICES.Hair.bg }}>
                    <Scissors size={16} className="text-shortcut-blue" strokeWidth={2.25} />
                  </div>
                  <div className="text-[13px] font-bold text-shortcut-blue">2 pros · 4 days · 64 slots offered</div>
                </div>
                <p className="text-[13px] text-text-dark/70 font-medium leading-relaxed">
                  A first attempt in April 2020 was cancelled before it ran, likely COVID — Escape + Ascent actually launched in November 2021.
                </p>
              </div>
              <div className="card-medium">
                <div className="text-[11px] font-bold uppercase tracking-[.12em] text-shortcut-blue/40 mb-1">2022–2025 · Massage added</div>
                <h3 className="text-[20px] font-extrabold text-shortcut-blue mb-3">Hair + Massage, two rooms by 2025</h3>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="flex -space-x-1.5">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shadow-sm border-2 border-white" style={{ backgroundColor: SERVICES.Hair.bg }}>
                      <Scissors size={16} className="text-shortcut-blue" strokeWidth={2.25} />
                    </div>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shadow-sm border-2 border-white" style={{ backgroundColor: SERVICES.Massage.bg }}>
                      <Heart size={16} className="text-shortcut-blue" strokeWidth={2.25} />
                    </div>
                  </div>
                  <div className="text-[13px] font-bold text-shortcut-blue">Up to 5 pros · 120 slots offered in 2025</div>
                </div>
                <p className="text-[13px] text-text-dark/70 font-medium leading-relaxed">
                  Massage joined in 2022, sharing Terra Gallery with Hair. In 2025 the two split into separate rooms, running in parallel for the first time.
                </p>
              </div>
            </div>
          </Section>

          {/* ══════════════════════════════════════════
              BOOKING STATS BY YEAR
              ══════════════════════════════════════════ */}
          <Section id="days">
            <div data-toc id="days" />
            <SectionLabel>Section II · Booking Stats</SectionLabel>
            <SectionHeading subtitle="Booked vs. offered, day by day — pre-booked sign-ups only, doesn't include walk-ups.">
              Where the bookings
              <span className="block text-shortcut-teal-blue">actually landed.</span>
            </SectionHeading>
            <BookingStatsByYear />
          </Section>

          {/* ══════════════════════════════════════════
              MINIMAL SIGN-OFF
              ══════════════════════════════════════════ */}
          <Section>
            <div className="rounded-2xl border border-shortcut-blue/[.08] bg-white p-6 md:p-7 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="text-[11px] font-extrabold uppercase tracking-[.15em] text-shortcut-blue/40 mb-1">Prepared by</div>
                <div className="text-[16px] font-extrabold text-shortcut-blue">The Shortcut Team</div>
                <div className="text-[12px] text-shortcut-blue/60 font-medium mt-1">Per-event detail and additional cuts available on request.</div>
              </div>
              <a
                href="mailto:will@getshortcut.co"
                className="inline-flex items-center gap-2 bg-shortcut-blue text-white px-5 py-2.5 rounded-full text-[13px] font-extrabold hover:bg-shortcut-blue/90 transition-colors w-fit"
              >
                will@getshortcut.co
              </a>
            </div>
          </Section>

          <div className="h-8" />
        </div>
      </main>
    </div>
  );
}
