import { useEffect, useRef, useState } from 'react';
import { Users, MapPin, Calendar, Heart, Mail, Smartphone, Package, Award } from 'lucide-react';

/* ─────────────────────────────────────────────
   Kepler Group × Shortcut — by the numbers
   3 cities, 1 day — August 20, 2026
   Shortcut design system — visual, card-based
   Data source: Shortcut Coordinator (Parse), pulled Aug 25 2026.
   All figures below are drawn directly from the 3 real (non-test)
   Kepler Group events on file — New York City, Philadelphia, Chicago.
   ───────────────────────────────────────────── */

const SERVICE = { bg: '#9EFAFF', tint: '#E2FAFC', deep: '#015F6E', icon: Heart, label: 'Massage' };

// ── Per-city data, pulled from the coordinator ──
const CITIES = [
  {
    city: 'New York City', venue: 'Astro, Pegasus & Ursa', pros: ['Karen Singer', 'Calin Fernandez', 'Keiko Pratt'],
    slots: 40, filled: 40, fillPct: 100.0, payment: 1689, waitlist: 3,
  },
  {
    city: 'Philadelphia', venue: 'Boys II Men & Wooder Ice', pros: ['Gianni Voltaire', 'Isaiah Graham-Mobley'],
    slots: 24, filled: 19, fillPct: 79.2, payment: 1001,
  },
  {
    city: 'Chicago', venue: 'Resnik', pros: ['Aleena Husain'],
    slots: 15, filled: 12, fillPct: 80.0, payment: 626,
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

// ── City bars: event cost ──
function CityBars() {
  const maxPaid = Math.max(...CITIES.map(c => c.payment));
  return (
    <div className="card-large">
      <div className="mb-6 md:mb-7">
        <div className="text-[11px] font-bold uppercase tracking-[.12em] text-shortcut-blue/40 mb-1">City by city</div>
        <h2 className="text-[1.75rem] md:text-[2.25rem] font-extrabold text-shortcut-blue leading-tight">
          Event cost,
          <span className="text-shortcut-teal-blue"> by city.</span>
        </h2>
      </div>
      <div className="space-y-3">
        {CITIES.map((c) => {
          const pct = (c.payment / maxPaid) * 100;
          const barColor = c.city === 'New York City' ? 'bg-accent-yellow' : 'bg-shortcut-teal';
          return (
            <div key={c.city} className="grid grid-cols-[110px_1fr_150px] md:grid-cols-[140px_1fr_190px] gap-3 md:gap-4 items-center">
              <div className="text-[13px] md:text-[14px] font-bold text-shortcut-blue">{c.city}</div>
              <div className="relative h-9 rounded-lg bg-shortcut-blue/[.04]">
                <div
                  className={`absolute inset-y-0 left-0 rounded-lg ${barColor} transition-all duration-700 ease-out flex items-center px-3`}
                  style={{ width: `${pct}%` }}
                >
                  <span className="text-[11px] md:text-[12px] font-extrabold tabular-nums text-shortcut-blue">
                    ${c.payment.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="text-[11px] md:text-[12px] text-shortcut-blue/60 font-semibold text-right tabular-nums">
                {c.pros.length} {c.pros.length === 1 ? 'pro' : 'pros'} · {c.slots} slots offered
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-[12px] text-shortcut-blue/50 font-medium">* Yellow = highest-cost city that day.</p>
    </div>
  );
}

// ── Per-city table ──
function CityTable() {
  const totalSlots = CITIES.reduce((a, c) => a + c.slots, 0);
  const totalFilled = CITIES.reduce((a, c) => a + c.filled, 0);
  const totalPayment = CITIES.reduce((a, c) => a + c.payment, 0);
  const totalPros = CITIES.reduce((a, c) => a + c.pros.length, 0);
  const totalFillPct = Math.round((totalFilled / totalSlots) * 1000) / 10;
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full min-w-[720px] border-collapse">
        <thead>
          <tr className="border-b-2 border-shortcut-blue/[.12]">
            <th className="text-left py-3 px-3 text-[10px] font-extrabold uppercase tracking-[.1em] text-shortcut-blue/40">City</th>
            <th className="text-right py-3 px-3 text-[10px] font-extrabold uppercase tracking-[.1em] text-shortcut-blue/40">Pros</th>
            <th className="text-right py-3 px-3 text-[10px] font-extrabold uppercase tracking-[.1em] text-shortcut-blue/40">Slots Offered</th>
            <th className="text-right py-3 px-3 text-[10px] font-extrabold uppercase tracking-[.1em] text-shortcut-blue/40">Fill Rate</th>
            <th className="text-right py-3 px-3 text-[10px] font-extrabold uppercase tracking-[.1em] text-shortcut-blue">Event Cost</th>
          </tr>
        </thead>
        <tbody>
          {CITIES.map((c) => (
            <tr key={c.city} className="border-b border-shortcut-blue/[.06]">
              <td className="py-3.5 px-3 text-[13px] font-extrabold text-shortcut-blue">{c.city}</td>
              <td className="py-3.5 px-3 text-right text-[14px] font-semibold tabular-nums text-shortcut-blue">{c.pros.length}</td>
              <td className="py-3.5 px-3 text-right text-[14px] font-semibold tabular-nums text-shortcut-blue">{c.slots}</td>
              <td className="py-3.5 px-3 text-right text-[14px] font-semibold tabular-nums text-shortcut-blue">{c.fillPct}%</td>
              <td className="py-3.5 px-3 text-right text-[14px] font-extrabold tabular-nums text-shortcut-blue">${c.payment.toLocaleString()}</td>
            </tr>
          ))}
          <tr className="bg-shortcut-blue">
            <td className="py-4 px-3 text-[13px] font-extrabold text-white rounded-l-xl">3-city total</td>
            <td className="py-4 px-3 text-right text-[14px] font-extrabold text-white tabular-nums">{totalPros} unique</td>
            <td className="py-4 px-3 text-right text-[14px] font-extrabold text-white tabular-nums">{totalSlots}</td>
            <td className="py-4 px-3 text-right text-[14px] font-extrabold text-shortcut-teal tabular-nums">{totalFillPct}%</td>
            <td className="py-4 px-3 text-right text-[15px] font-extrabold text-shortcut-teal tabular-nums rounded-r-xl">${totalPayment.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Booking stats, by city ──
function BookingStatsByCity() {
  return (
    <div className="card-large">
      <div className="space-y-3">
        {CITIES.map((c) => {
          const pct = (c.filled / c.slots) * 100;
          return (
            <div key={c.city} className="grid grid-cols-[110px_1fr_80px] md:grid-cols-[140px_1fr_100px] gap-3 items-center">
              <div className="text-[12px] md:text-[13px] font-bold text-shortcut-blue">{c.city}</div>
              <div className="relative h-8 rounded-lg bg-shortcut-blue/[.04]">
                <div
                  className="absolute inset-y-0 left-0 rounded-lg flex items-center px-3"
                  style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: SERVICE.bg }}
                >
                  <span className="text-[11px] font-extrabold tabular-nums text-shortcut-blue">{c.filled}/{c.slots}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-semibold text-shortcut-blue/50">{c.venue}</div>
                {c.waitlist ? (
                  <div className="text-[10px] font-extrabold text-shortcut-coral mt-0.5">+{c.waitlist} waitlisted</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════

export default function KeplerReport() {
  const [authenticated, setAuthenticated] = useState(() => {
    return sessionStorage.getItem('kepler-auth') === 'true';
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'KEPLERSC2026') {
      sessionStorage.setItem('kepler-auth', 'true');
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
              <div className="text-[22px] font-extrabold tracking-tight text-shortcut-blue">KEPLER GROUP</div>
              <div className="h-6 w-px bg-shortcut-blue/15" aria-hidden="true" />
              <img
                src="/shortcut-logo-blue.svg"
                alt="Shortcut"
                className="h-5 w-auto"
              />
            </div>
            <div className="text-[12px] text-shortcut-blue/50 font-medium">Event Report</div>
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
    { id: 'cities', label: 'City by City' },
    { id: 'table', label: 'Per-City Detail' },
    { id: 'locations', label: 'Where It Happened' },
    { id: 'booking', label: 'Booking Stats' },
  ];

  return (
    <div className="min-h-screen bg-neutral-light-gray font-['Outfit',system-ui,sans-serif]">

      {/* ── Sticky nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-shortcut-blue/[.06]">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="text-[16px] font-extrabold tracking-tight text-shortcut-blue">KEPLER GROUP</div>
            <div className="h-4 w-px bg-shortcut-blue/15" aria-hidden="true" />
            <img
              src="/shortcut-logo-blue.svg"
              alt="Shortcut"
              className="h-4 w-auto"
            />
            <div className="hidden sm:block ml-1 md:ml-2 pl-3 md:pl-4 border-l border-shortcut-blue/[.12] text-[10px] font-semibold uppercase tracking-wider text-shortcut-blue/40">
              Event Report
            </div>
          </div>
          <div className="hidden md:block text-[11px] font-bold uppercase tracking-[.12em] text-shortcut-blue/40">Aug 20, 2026</div>
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
                  <div className="text-[22px] md:text-[28px] font-extrabold tracking-tight text-shortcut-blue">KEPLER GROUP</div>
                  <div className="h-7 md:h-10 w-px bg-shortcut-blue/15" aria-hidden="true" />
                  <img
                    src="/shortcut-logo-blue.svg"
                    alt="Shortcut"
                    className="h-6 md:h-8 w-auto"
                  />
                </div>
                <div className="text-[11px] font-extrabold uppercase tracking-[.18em] text-shortcut-blue/50 mb-3">
                  3 Cities · 1 Day
                </div>
                <h1 className="text-[2.5rem] md:text-[4rem] lg:text-[4.5rem] font-extrabold text-shortcut-blue leading-[1.02] tracking-tight">
                  Kepler Group,
                  <span className="block text-shortcut-teal-blue">by the numbers.</span>
                </h1>
                <p className="text-[16px] md:text-[19px] text-text-dark/70 mt-5 font-medium leading-relaxed max-w-[680px]">
                  Every chair massage appointment we ran for Kepler Group's New York, Philadelphia, and Chicago offices — all on the same day.
                </p>

                <div className="flex flex-wrap gap-3 mt-7">
                  <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm border border-white/60">
                    <Calendar size={14} className="text-shortcut-blue" strokeWidth={2.5} />
                    <span className="text-[13px] font-bold text-shortcut-blue">August 20, 2026</span>
                  </div>
                  <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm border border-white/60">
                    <MapPin size={14} className="text-shortcut-blue" strokeWidth={2.5} />
                    <span className="text-[13px] font-bold text-shortcut-blue">New York · Philadelphia · Chicago</span>
                  </div>
                  <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm border border-white/60">
                    <Users size={14} className="text-shortcut-blue" strokeWidth={2.5} />
                    <span className="text-[13px] font-bold text-shortcut-blue">3 events across 3 cities</span>
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
                  What that day
                  <span className="block text-shortcut-teal-blue">included.</span>
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {[
                  { Icon: Award, tint: 'bg-shortcut-teal/30', title: 'Three cities, one day', body: 'New York, Philadelphia, and Chicago all ran the same afternoon.' },
                  { Icon: Mail, tint: 'bg-accent-yellow/40', title: 'Light lift on your side', body: "Kepler's team didn't run scheduling, communications, or day-of logistics. We did." },
                  { Icon: Smartphone, tint: 'bg-accent-pink/30', title: 'Technology built in', body: 'Employees booked with automated reminders and confirmations.' },
                  { Icon: Package, tint: 'bg-shortcut-coral/15', title: 'One team, six pros', body: 'Six Shortcut massage therapists worked across the three offices.' },
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
              <HeroStat value="3" label="Cities Activated" sublabel="same day" color="navy" />
              <HeroStat value="6" label="Pros Deployed" sublabel="across 3 offices" color="teal" />
              <HeroStat value="90%" label="of timeslots filled" sublabel="79 slots offered" color="yellow" />
              <HeroStat value="$3,316" label="Total Event Cost" sublabel="Aug 20, 2026" color="pink" />
            </div>
          </Section>

          {/* ══════════════════════════════════════════
              CITY BY CITY
              ══════════════════════════════════════════ */}
          <Section id="cities">
            <div data-toc id="cities" />
            <CityBars />
          </Section>

          {/* ══════════════════════════════════════════
              PER-CITY TABLE
              ══════════════════════════════════════════ */}
          <Section id="table">
            <div data-toc id="table" />
            <div className="card-large">
              <div className="mb-6 md:mb-7">
                <div className="text-[11px] font-bold uppercase tracking-[.12em] text-shortcut-blue/40 mb-1">The full picture</div>
                <h2 className="text-[1.75rem] md:text-[2.25rem] font-extrabold text-shortcut-blue leading-tight">
                  Every city,
                  <span className="text-shortcut-teal-blue"> side by side.</span>
                </h2>
              </div>
              <CityTable />
            </div>
          </Section>

          {/* ══════════════════════════════════════════
              WHERE IT HAPPENED
              ══════════════════════════════════════════ */}
          <Section id="locations">
            <div data-toc id="locations" />
            <SectionLabel>Section I · Where it happened</SectionLabel>
            <SectionHeading subtitle="Same service, same day, three very different rooms.">
              Three offices,
              <span className="block text-shortcut-teal-blue">one afternoon.</span>
            </SectionHeading>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
              {CITIES.map((c) => (
                <div key={c.city} className="card-medium">
                  <div className="text-[11px] font-bold uppercase tracking-[.12em] text-shortcut-blue/40 mb-1">{c.city}</div>
                  <h3 className="text-[18px] font-extrabold text-shortcut-blue mb-3">{c.venue}</h3>
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shadow-sm" style={{ backgroundColor: SERVICE.bg }}>
                      <Heart size={16} className="text-shortcut-blue" strokeWidth={2.25} />
                    </div>
                    <div className="text-[13px] font-bold text-shortcut-blue">{c.pros.length} {c.pros.length === 1 ? 'pro' : 'pros'} · {c.fillPct}% filled</div>
                  </div>
                  <p className="text-[13px] text-text-dark/70 font-medium leading-relaxed">
                    {c.pros.join(', ')}.
                  </p>
                </div>
              ))}
            </div>
          </Section>

          {/* ══════════════════════════════════════════
              BOOKING STATS
              ══════════════════════════════════════════ */}
          <Section id="booking">
            <div data-toc id="booking" />
            <SectionLabel>Section II · Booking Stats</SectionLabel>
            <SectionHeading subtitle="Booked vs. offered, by city — pre-booked sign-ups only, doesn't include walk-ups.">
              Where the bookings
              <span className="block text-shortcut-teal-blue">actually landed.</span>
            </SectionHeading>
            <BookingStatsByCity />
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
