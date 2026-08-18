import { useEffect, useRef, useState } from 'react';
import { Users, DollarSign, MapPin, Calendar, Scissors, Heart, AlertTriangle, Mail, Smartphone, Package, Award } from 'lucide-react';

/* ─────────────────────────────────────────────
   Bisnow × Shortcut — The Escape, by the numbers
   Five years at 1 Hotel South Beach (2021–2025)
   Shortcut design system — visual, card-based
   Data source: Shortcut Coordinator (Parse), pulled Aug 18 2026.
   All figures below are drawn directly from the 28 real (non-test,
   non-cancelled) Bisnow Escape events on file. See Methodology.
   ───────────────────────────────────────────── */

const SERVICES = {
  Hair: { bg: '#FEDC64', tint: '#FFF6CC', deep: '#92750C', icon: Scissors, label: 'Hair' },
  Massage: { bg: '#9EFAFF', tint: '#E2FAFC', deep: '#015F6E', icon: Heart, label: 'Massage' },
} as const;

type ServiceKey = keyof typeof SERVICES;

// ── Per-year data, pulled from the coordinator (see Methodology for the
// fill-rate caveat on 2021/2023/2024) ──
const YEARS = [
  {
    year: '2021', days: 4, services: ['Hair'] as ServiceKey[], pros: ['Eddie Montalvo', 'Sally Souffrant'],
    slots: 64, filled: null as number | null, fillPct: null as number | null,
    payment: null as number | null, barberPay: 1800, venue: 'Terra Ballroom', waitlist: 0,
    contact: 'Katie LaPerch', note: 'Fill data unusable — every event this year shows an open-slot count above capacity (coordinator anomaly).',
  },
  {
    year: '2022', days: 4, services: ['Hair', 'Massage'] as ServiceKey[], pros: ['Cesar Brickell', 'Eddie Montalvo', 'Ray Edden'],
    slots: 104, filled: 96, fillPct: 92.3,
    payment: 5640, barberPay: 2450, venue: 'Terra Gallery', waitlist: 3,
    contact: 'Aly Vazquez', note: null,
  },
  {
    year: '2023', days: 4, services: ['Hair', 'Massage'] as ServiceKey[], pros: ['Cesar Brickell', 'Eddie Montalvo', 'Kirvin Shand'],
    slots: 104, filled: 80, fillPct: 97.6,
    payment: 5640, barberPay: 2300, venue: 'Terra Gallery', waitlist: 5,
    contact: 'Gretchen Severns', note: 'One Hair block (Nov 8) excluded from the fill-rate math — same open-slot anomaly as 2021.',
  },
  {
    year: '2024', days: 4, services: ['Hair', 'Massage'] as ServiceKey[], pros: ['Cesar Brickell', 'Eddie Montalvo', 'Meryhec Lopez'],
    slots: 100, filled: 80, fillPct: 90.9,
    payment: 5520, barberPay: 2250, venue: 'Terra Gallery', waitlist: 6,
    contact: null, note: 'One Hair block (Nov 7) excluded from the fill-rate math — same open-slot anomaly as 2021.',
  },
  {
    year: '2025', days: 4, services: ['Hair', 'Massage'] as ServiceKey[], pros: ['Cesar Brickell', 'Eddie Montalvo', 'Julia Gonzalez Angulo', 'Meryhec Lopez', 'Pedro Rosario'],
    slots: 120, filled: 94, fillPct: 78.3,
    payment: 6250, barberPay: 2625, venue: 'Terra Gallery + Garnet I & II', waitlist: 0,
    contact: 'Megan Harding & Ariel Fromm', note: null,
  },
];

// Waitlist entries by service, all 5 years — pulled straight from
// numWaitlistEntries per event block. Hair essentially never waitlists;
// Massage does, in 3 of the last 4 years it's run.
const WAITLIST_BY_SERVICE = [
  { year: '2022', day: 'Nov 9', svc: 'Massage' as ServiceKey, count: 1 },
  { year: '2022', day: 'Nov 9', svc: 'Hair' as ServiceKey, count: 1 },
  { year: '2022', day: 'Nov 10', svc: 'Hair' as ServiceKey, count: 1 },
  { year: '2023', day: 'Nov 6', svc: 'Hair' as ServiceKey, count: 1 },
  { year: '2023', day: 'Nov 6', svc: 'Massage' as ServiceKey, count: 1 },
  { year: '2023', day: 'Nov 8', svc: 'Massage' as ServiceKey, count: 3 },
  { year: '2024', day: 'Nov 4', svc: 'Massage' as ServiceKey, count: 5 },
  { year: '2024', day: 'Nov 6', svc: 'Massage' as ServiceKey, count: 1 },
];

// 2025 day-by-day — the cleanest, most recent year (no anomalies)
const DAYS_2025 = [
  { day: 'Mon · Nov 3', svc: 'Massage' as ServiceKey, booked: 27, total: 30, venue: 'Garnet I + II' },
  { day: 'Mon · Nov 3', svc: 'Hair' as ServiceKey, booked: 15, total: 20, venue: 'Terra Gallery' },
  { day: 'Tue · Nov 4', svc: 'Hair' as ServiceKey, booked: 0, total: 10, venue: 'Terra Gallery', flag: true },
  { day: 'Wed · Nov 5', svc: 'Hair' as ServiceKey, booked: 17, total: 20, venue: 'Terra Gallery' },
  { day: 'Wed · Nov 5', svc: 'Massage' as ServiceKey, booked: 29, total: 30, venue: 'Garnet I + II' },
  { day: 'Thu · Nov 6', svc: 'Hair' as ServiceKey, booked: 6, total: 10, venue: 'Terra Gallery' },
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

// ── Year-over-year bars: $ paid to Shortcut ──
function YearlyBars() {
  const maxPaid = Math.max(...YEARS.map(y => y.payment || 0));
  return (
    <div className="card-large">
      <div className="mb-6 md:mb-7">
        <div className="text-[11px] font-bold uppercase tracking-[.12em] text-shortcut-blue/40 mb-1">Year over year</div>
        <h2 className="text-[1.75rem] md:text-[2.25rem] font-extrabold text-shortcut-blue leading-tight">
          $ paid to Shortcut,
          <span className="text-shortcut-teal-blue"> by year.</span>
        </h2>
        <p className="mt-2 text-[14px] md:text-[15px] text-text-dark/70 font-medium leading-relaxed max-w-[640px]">
          2021 billing wasn't recorded on the coordinator event — the bar shown is what we paid the pros that year, not what Bisnow was billed, and is marked separately below.
        </p>
      </div>
      <div className="space-y-3">
        {YEARS.map((y) => {
          const hasPayment = y.payment !== null;
          const pct = hasPayment ? ((y.payment as number) / maxPaid) * 100 : ((y.barberPay / maxPaid) * 100);
          const barColor = !hasPayment ? 'bg-shortcut-blue/15' : y.year === '2025' ? 'bg-accent-yellow' : 'bg-shortcut-teal';
          return (
            <div key={y.year} className="grid grid-cols-[52px_1fr_150px] md:grid-cols-[64px_1fr_190px] gap-3 md:gap-4 items-center">
              <div className="text-[13px] md:text-[14px] font-bold text-shortcut-blue tabular-nums">{y.year}</div>
              <div className="relative h-9 rounded-lg bg-shortcut-blue/[.04]">
                <div
                  className={`absolute inset-y-0 left-0 rounded-lg ${barColor} transition-all duration-700 ease-out flex items-center px-3`}
                  style={{ width: `${pct}%` }}
                >
                  <span className="text-[11px] md:text-[12px] font-extrabold tabular-nums text-shortcut-blue">
                    {hasPayment ? `$${(y.payment as number).toLocaleString()}` : `$${y.barberPay.toLocaleString()} (payout only)`}
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
      <p className="mt-5 text-[12px] text-shortcut-blue/50 font-medium">* 2025 is a yellow bar because it's the peak year on record — both in what was billed and in capacity offered.</p>
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
            <th className="text-right py-3 px-3 text-[10px] font-extrabold uppercase tracking-[.1em] text-shortcut-blue/40">Waitlisted</th>
            <th className="text-right py-3 px-3 text-[10px] font-extrabold uppercase tracking-[.1em] text-shortcut-blue">Paid to Shortcut</th>
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
              <td className={`py-3.5 px-3 text-right text-[14px] font-semibold tabular-nums ${y.waitlist > 0 ? 'text-shortcut-coral' : 'text-shortcut-blue/30'}`}>
                {y.waitlist > 0 ? `+${y.waitlist}` : '—'}
              </td>
              <td className="py-3.5 px-3 text-right text-[14px] font-extrabold tabular-nums text-shortcut-blue">
                {y.payment !== null ? `$${y.payment.toLocaleString()}` : <span className="text-shortcut-blue/40 font-semibold">not recorded</span>}
              </td>
            </tr>
          ))}
          <tr className="bg-shortcut-blue">
            <td className="py-4 px-3 text-[13px] font-extrabold text-white rounded-l-xl" colSpan={2}>5-year total</td>
            <td className="py-4 px-3 text-right text-[14px] font-extrabold text-white tabular-nums">8 unique</td>
            <td className="py-4 px-3 text-right text-[14px] font-extrabold text-white tabular-nums">492</td>
            <td className="py-4 px-3 text-right text-[14px] font-extrabold text-shortcut-teal tabular-nums">88.8%*</td>
            <td className="py-4 px-3 text-right text-[14px] font-extrabold text-shortcut-teal tabular-nums">+14</td>
            <td className="py-4 px-3 text-right text-[15px] font-extrabold text-shortcut-teal tabular-nums rounded-r-xl">$23,050*</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-5 text-[12px] text-shortcut-blue/50 font-medium leading-relaxed">
        * Fill rate and 5-year total exclude 2021 (unusable data) and the 6 individual event blocks flagged with the open-slot anomaly. Paid-to-Shortcut total covers 2022–2025 only — 2021 billing wasn't recorded on the coordinator event. Waitlisted counts people who tried to book after a service filled — see the breakdown below.
      </p>
    </div>
  );
}

// ── Waitlist demand breakdown ──
function WaitlistDemand() {
  const totalByService = WAITLIST_BY_SERVICE.reduce(
    (acc, w) => { acc[w.svc] += w.count; return acc; },
    { Hair: 0, Massage: 0 } as Record<ServiceKey, number>
  );
  return (
    <div className="card-large">
      <div className="mb-6 md:mb-7">
        <div className="text-[11px] font-bold uppercase tracking-[.12em] text-shortcut-blue/40 mb-1">Demand signal</div>
        <h2 className="text-[1.75rem] md:text-[2.25rem] font-extrabold text-shortcut-blue leading-tight">
          14 people waitlisted
          <span className="text-shortcut-teal-blue"> over 5 years — 11 for Massage.</span>
        </h2>
        <p className="mt-2 text-[14px] md:text-[15px] text-text-dark/70 font-medium leading-relaxed max-w-[640px]">
          Zero waitlist activity in 2021 (Massage didn't exist yet) and 2025 (fill rate dropped to 78%, so there was slack instead of overflow). Every year Massage has run, it's waitlisted people at least once — Hair has only done it on 3 of 20 event-days, one person each time.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {(['Massage', 'Hair'] as ServiceKey[]).map((svc) => {
          const s = SERVICES[svc];
          const Icon = s.icon;
          return (
            <div key={svc} className="rounded-2xl p-5 border border-shortcut-blue/[.06] flex items-center gap-4" style={{ backgroundColor: s.tint }}>
              <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-sm shrink-0" style={{ backgroundColor: s.bg }}>
                <Icon size={19} className="text-shortcut-blue" strokeWidth={2.25} />
              </div>
              <div>
                <div className="text-[1.6rem] font-extrabold text-shortcut-blue leading-none tabular-nums">+{totalByService[svc]}</div>
                <div className="text-[12px] font-semibold text-shortcut-blue/60 mt-1 leading-tight">{svc} waitlist signups, 5-year total</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-1">
        {WAITLIST_BY_SERVICE.map((w, i) => {
          const s = SERVICES[w.svc];
          const Icon = s.icon;
          return (
            <div key={i} className="flex items-center gap-3 py-2.5 border-b border-shortcut-blue/[.06] last:border-0">
              <div className="text-[12px] font-bold text-shortcut-blue/40 tabular-nums w-16">{w.year}</div>
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: s.bg }}>
                <Icon size={13} className="text-shortcut-blue" strokeWidth={2.25} />
              </div>
              <div className="text-[13px] font-semibold text-shortcut-blue flex-1">{w.svc} · {w.day}</div>
              <div className="text-[13px] font-extrabold text-shortcut-coral tabular-nums">+{w.count}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 2025 day-by-day bars ──
function DayByDayBars() {
  return (
    <div className="card-large">
      <div className="mb-6 md:mb-7">
        <div className="text-[11px] font-bold uppercase tracking-[.12em] text-shortcut-blue/40 mb-1">2025 · day by day</div>
        <h2 className="text-[1.75rem] md:text-[2.25rem] font-extrabold text-shortcut-blue leading-tight">
          Where the bookings
          <span className="text-shortcut-teal-blue"> actually landed.</span>
        </h2>
        <p className="mt-2 text-[14px] md:text-[15px] text-text-dark/70 font-medium leading-relaxed max-w-[640px]">
          2025 is the cleanest year on file — no open-slot anomalies — so it's the best lens on which conference days actually drive demand.
        </p>
      </div>
      <div className="space-y-3">
        {DAYS_2025.map((d, i) => {
          const s = SERVICES[d.svc];
          const pct = (d.booked / d.total) * 100;
          return (
            <div key={i} className="grid grid-cols-[110px_60px_1fr_70px] md:grid-cols-[130px_90px_1fr_90px] gap-3 items-center">
              <div className="text-[12px] md:text-[13px] font-bold text-shortcut-blue">{d.day}</div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.bg }} />
                <span className="text-[11px] font-semibold text-shortcut-blue/60">{d.svc}</span>
              </div>
              <div className="relative h-8 rounded-lg bg-shortcut-blue/[.04]">
                <div
                  className={`absolute inset-y-0 left-0 rounded-lg transition-all duration-700 ease-out flex items-center px-3 ${d.flag ? 'bg-shortcut-coral' : ''}`}
                  style={!d.flag ? { width: `${Math.max(pct, 4)}%`, backgroundColor: s.bg } : { width: '100%' }}
                >
                  {!d.flag && (
                    <span className="text-[11px] font-extrabold tabular-nums text-shortcut-blue">{d.booked}/{d.total}</span>
                  )}
                </div>
                {d.flag && (
                  <span className="absolute inset-0 flex items-center px-3 text-[11px] font-extrabold tabular-nums text-white">0/{d.total} booked</span>
                )}
              </div>
              <div className="text-[11px] font-semibold text-shortcut-blue/50 text-right">{d.venue}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl p-5 md:p-6 border border-shortcut-coral/20 bg-shortcut-coral/[.05] flex items-start gap-3">
        <AlertTriangle size={18} className="text-shortcut-coral shrink-0 mt-0.5" strokeWidth={2.25} />
        <div>
          <div className="text-[14px] font-extrabold text-shortcut-blue mb-1">Tuesday's Hair line went completely unbooked.</div>
          <p className="text-[13px] text-text-dark/70 font-medium leading-relaxed">
            Zero of 10 slots filled on the second conference day, while Monday and Wednesday ran 75–97%. This is a single-year observation, not an established pattern — 2023 and 2024's second days actually filled well. Worth watching next year before changing the schedule, but the 10 idle slots on Nov 4 are the clearest single opportunity in this dataset.
          </p>
        </div>
      </div>
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
            <div className="text-[12px] text-shortcut-blue/50 font-medium">The Escape Report</div>
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
    { id: 'yearly', label: 'Year over Year' },
    { id: 'table', label: 'Per-Year Detail' },
    { id: 'waitlist', label: 'Waitlist Demand' },
    { id: 'services', label: 'Service Mix' },
    { id: 'days', label: '2025 Day by Day' },
    { id: 'relationship', label: 'The Relationship' },
    { id: 'methodology', label: 'Methodology' },
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
              The Escape Report
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
                  The Bisnow Escape,
                  <span className="block text-shortcut-teal-blue">by the numbers.</span>
                </h1>
                <p className="text-[16px] md:text-[19px] text-text-dark/70 mt-5 font-medium leading-relaxed max-w-[680px]">
                  Every grooming and massage appointment we've run at the Bisnow Escape in Miami Beach since the relationship launched in November 2021 — grown from a single hair line to two simultaneous service rooms.
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
                  What every Escape
                  <span className="block text-shortcut-teal-blue">includes.</span>
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {[
                  { Icon: Award, tint: 'bg-shortcut-teal/30', title: 'A returning crew', body: "Eddie Montalvo has cut hair at every Bisnow Escape since it started in 2021 — five years running." },
                  { Icon: Mail, tint: 'bg-accent-yellow/40', title: 'Light lift on your side', body: "Bisnow's team doesn't run scheduling, communications, or day-of logistics. We do." },
                  { Icon: Smartphone, tint: 'bg-accent-pink/30', title: 'Technology built in', body: 'Attendees book through our platform with automated reminders and confirmations.' },
                  { Icon: Package, tint: 'bg-shortcut-coral/15', title: 'Two rooms, one team', body: 'Since 2025, Hair and Massage run simultaneously in separate rooms — same crew, same setup discipline.' },
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
              <HeroStat value="89%" label="of clean timeslots filled" sublabel="2022–2025, excludes 6 flagged blocks" color="yellow" />
              <HeroStat value="$23,050" label="Paid to Shortcut" sublabel="2022–2025 · 2021 not recorded" color="pink" />
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
              WAITLIST DEMAND
              ══════════════════════════════════════════ */}
          <Section id="waitlist">
            <div data-toc id="waitlist" />
            <WaitlistDemand />
          </Section>

          {/* ══════════════════════════════════════════
              SERVICE MIX EVOLUTION
              ══════════════════════════════════════════ */}
          <Section id="services">
            <div data-toc id="services" />
            <SectionLabel>Section I · How the program grew</SectionLabel>
            <SectionHeading subtitle="From one hair line in a single ballroom to two service rooms running at once.">
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
                  The relationship's real start — a first attempt in April 2020 (2 events, hair only, Miami Beach) was cancelled before it ran, almost certainly a COVID casualty. The Escape didn't actually launch until November 2021.
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
                  Massage joined in 2022, sharing Terra Gallery with Hair for three years. In 2025 the two lines split into separate rooms — Terra Gallery for Hair, Garnet I &amp; II for Massage — running in parallel for the first time.
                </p>
              </div>
            </div>
          </Section>

          {/* ══════════════════════════════════════════
              2025 DAY BY DAY
              ══════════════════════════════════════════ */}
          <Section id="days">
            <div data-toc id="days" />
            <DayByDayBars />
          </Section>

          {/* ══════════════════════════════════════════
              THE RELATIONSHIP
              ══════════════════════════════════════════ */}
          <Section id="relationship">
            <div data-toc id="relationship" />
            <SectionLabel>Section II · The Relationship</SectionLabel>
            <SectionHeading subtitle="Same venue, five different Bisnow contacts, and one pro who's never missed a year.">
              The people
              <span className="block text-shortcut-teal-blue">behind the Escape.</span>
            </SectionHeading>

            <div className="card-large">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                {YEARS.map((y) => (
                  <div key={y.year} className="flex items-center justify-between gap-3 py-3.5 border-b border-shortcut-blue/[.06]">
                    <div className="flex items-center gap-3">
                      <div className="text-[13px] font-extrabold text-shortcut-blue/40 tabular-nums w-10">{y.year}</div>
                      <div>
                        <div className="text-[14px] font-bold text-shortcut-blue">{y.contact || <span className="text-shortcut-blue/30 font-medium">Not captured</span>}</div>
                        <div className="text-[11px] text-shortcut-blue/50 font-medium">{y.venue}</div>
                      </div>
                    </div>
                    <div className="text-[11px] font-semibold text-shortcut-blue/50 text-right shrink-0">{y.pros.length} pros</div>
                  </div>
                ))}
              </div>
              <p className="mt-5 pt-4 border-t border-shortcut-blue/[.06] text-[13px] text-text-dark/70 font-medium leading-relaxed">
                Eight different Shortcut pros have worked an Escape over five years. <strong className="text-shortcut-blue">Eddie Montalvo</strong> has worked every single one since 2021, and <strong className="text-shortcut-blue">Cesar Brickell</strong> has worked every year since Massage was added in 2022.
              </p>
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
                {
                  title: 'Which events count',
                  body: '28 real events across 2021–2025. Excludes 2 cancelled 2020 attempts (Bisnow Escape Retreat, likely COVID) and 2 internal test events run in New York in March 2023.',
                },
                {
                  title: 'Fill Rate',
                  body: 'Booked slots ÷ total slots offered, per event block. Six blocks (all of 2021, plus one each in 2023 and 2024) show an open-slot count higher than total capacity — a coordinator data quirk, not a real negative fill rate — so those blocks are excluded from fill-rate math but still counted in slots-offered and spend.',
                },
                {
                  title: '2021 billing gap',
                  body: 'The "payment" field (what Bisnow was billed) is empty on all four 2021 events. Only what Shortcut paid its pros ($1,800) was recorded that year, so 2021 is shown separately and excluded from the 5-year Paid-to-Shortcut total.',
                },
                {
                  title: 'Slots vs. appointments',
                  body: 'A slot is a bookable appointment window (30 min for Hair, 20 min for Massage). "Slots offered" is total capacity across all pros and days that year — not unique attendees.',
                },
                {
                  title: 'Venue',
                  body: 'Every real event has run at 1 Hotel South Beach (2341 Collins Avenue, Miami Beach, FL). Room names on file have varied — Terra Ballroom in 2021, Terra Gallery from 2022 on, with Garnet I & II added for Massage in 2025.',
                },
                {
                  title: 'Source data',
                  body: 'Pulled directly from the Shortcut Coordinator (Parse) on Aug 18, 2026, cross-checked against sponsorName, name, and legacyName to confirm no Bisnow events were missed. Per-event detail available on request.',
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
