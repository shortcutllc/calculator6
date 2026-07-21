import { useState } from 'react';
import { DollarSign, Users, CalendarCheck, Hourglass, Scissors, Heart, Hand, Flower2 } from 'lucide-react';

/* ─────────────────────────────────────────────
   DraftKings — Spend by Month, by Location
   Abbreviated companion to /draftkings.
   Nov 13 2025 – Jul 2026 (Jul = expected: delivered + scheduled)
   Data source: coordinator event records (base $ paid to Shortcut per event).
   ───────────────────────────────────────────── */

const LOCATIONS = [
  { key: 'mainLV', name: 'Las Vegas', detail: 'Main LV program', dot: 'bg-shortcut-blue' },
  { key: 'trader', name: 'Las Vegas', detail: 'Trader Monthly Perks', dot: 'bg-shortcut-coral' },
  { key: 'ny', name: 'New York', detail: 'DraftKings NY', dot: 'bg-shortcut-teal' },
  { key: 'nj', name: 'New Jersey', detail: 'DraftKings NJ', dot: 'bg-accent-pink' },
] as const;

// Base $ paid to Shortcut per program per month. Dec Main LV includes the
// one-off holiday hair + beauty event ($1,260) held at the same LV office.
// njEst: billed amount not recorded on the coordinator event; standard rate
// for the event length used instead (6.5h and 6h at $129/hr).
// Jul = expected: 12 events delivered + 4 scheduled through month end.
const MONTHS = [
  { label: 'Nov 2025 *', partial: true, projected: false, njEst: false, mainLV: 2208, trader: 1008, ny: 756, nj: 882 },
  { label: 'Dec 2025', partial: false, projected: false, njEst: false, mainLV: 5040, trader: 1008, ny: 1512, nj: 882 },
  { label: 'Jan 2026', partial: false, projected: false, njEst: false, mainLV: 5796, trader: 1008, ny: 2142, nj: 882 },
  { label: 'Feb 2026', partial: false, projected: false, njEst: false, mainLV: 6951, trader: 1032, ny: 2193, nj: 1419 },
  { label: 'Mar 2026', partial: false, projected: false, njEst: false, mainLV: 5934, trader: 1032, ny: 2820, nj: 903 },
  { label: 'Apr 2026', partial: false, projected: false, njEst: false, mainLV: 5904, trader: 1032, ny: 2838, nj: 903 },
  { label: 'May 2026', partial: false, projected: false, njEst: true, mainLV: 5934, trader: 1032, ny: 2193, nj: 839 },
  { label: 'Jun 2026', partial: false, projected: false, njEst: true, mainLV: 4386, trader: 516, ny: 2193, nj: 774 },
  { label: 'Jul 2026', partial: false, projected: true, njEst: false, mainLV: 4386, trader: 516, ny: 2150, nj: 774 },
] as const;

const fmt = (n: number) => (n === 0 ? '—' : '$' + n.toLocaleString());

// ── Utilization: completed events Nov 13 2025 – Jul 21 2026, per program per
// service. Metric matches the original /draftkings report: fill AT BOOKING
// (delivered + cancelled-by-employee slots, capped at capacity). Every
// recurring event in these programs booked to 100%; appts = appointments
// actually delivered after last-minute cancellations and no-shows.
const SVC = {
  Hair: { bg: '#FEDC64', icon: Scissors },
  Massage: { bg: '#9EFAFF', icon: Heart },
  Nails: { bg: '#F7BBFF', icon: Hand },
  Beauty: { bg: '#FFB3B3', icon: Flower2 },
} as const;

const UTILIZATION = [
  {
    name: 'Las Vegas', detail: 'Main LV program', waitlist: 199,
    services: [
      { svc: 'Hair', appts: 297 },
      { svc: 'Massage', appts: 342 },
      { svc: 'Beauty', appts: 39 },
      { svc: 'Nails', appts: 102 },
    ],
  },
  {
    name: 'New York', detail: 'DraftKings NY', waitlist: 168,
    services: [
      { svc: 'Hair', appts: 95 },
      { svc: 'Massage', appts: 117 },
      { svc: 'Nails', appts: 43 },
      { svc: 'Beauty', appts: 27 },
    ],
  },
  {
    name: 'New Jersey', detail: 'DraftKings NJ', waitlist: 8,
    services: [
      { svc: 'Hair', appts: 101 },
      { svc: 'Beauty', appts: 8 },
    ],
  },
] as const;

export function UtilizationSection() {
  return (
    <div>
      {/* Headline strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
        {[
          { Icon: CalendarCheck, value: '100%', label: 'Of recurring events fully booked', tint: 'bg-accent-yellow/40' },
          { Icon: Users, value: '1,185', label: 'Appointments delivered', tint: 'bg-shortcut-teal/30' },
          { Icon: Hourglass, value: '375', label: 'Waitlist signups after events filled', tint: 'bg-accent-pink/30' },
        ].map((s, i) => {
          const { Icon } = s;
          return (
            <div key={i} className="rounded-2xl border border-shortcut-blue/[.06] bg-white p-5 flex items-center gap-4">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center shadow-sm shrink-0 ${s.tint}`}>
                <Icon size={19} className="text-shortcut-blue" strokeWidth={2.25} />
              </div>
              <div>
                <div className="text-[1.6rem] font-extrabold text-shortcut-blue leading-none tabular-nums">{s.value}</div>
                <div className="text-[12px] font-semibold text-shortcut-blue/50 mt-1 leading-tight">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Location cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        {UTILIZATION.map((loc, i) => (
          <div key={i} className="rounded-2xl border border-shortcut-blue/[.08] bg-white p-5 md:p-6">
            <div className="flex items-baseline justify-between gap-2 mb-4 flex-wrap">
              <div>
                <div className="text-[15px] md:text-[16px] font-extrabold text-shortcut-blue leading-tight">{loc.name}</div>
                <div className="text-[12px] text-shortcut-blue/50 font-medium mt-0.5">{loc.detail}</div>
              </div>
              {loc.waitlist >= 20 && (
                <div className="text-[11px] font-extrabold text-shortcut-blue bg-accent-yellow/40 px-2.5 py-1 rounded-full whitespace-nowrap">
                  +{loc.waitlist} waitlisted
                </div>
              )}
            </div>
            <div className="space-y-3">
              {loc.services.map((row) => {
                const s = SVC[row.svc];
                const Icon = s.icon;
                return (
                  <div key={row.svc} className="grid grid-cols-[auto_72px_1fr_76px] items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm shrink-0" style={{ backgroundColor: s.bg }}>
                      <Icon size={15} className="text-shortcut-blue" strokeWidth={2.25} />
                    </div>
                    <div>
                      <div className="text-[13px] font-extrabold text-shortcut-blue leading-tight">{row.svc}</div>
                      <div className="text-[11px] font-semibold text-shortcut-blue/50 tabular-nums">{row.appts} appts</div>
                    </div>
                    <div className="h-2.5 rounded-full bg-shortcut-blue/[.06] overflow-hidden">
                      <div
                        className="h-full w-full rounded-full"
                        style={{ backgroundColor: s.bg }}
                      />
                    </div>
                    <div className="text-right">
                      <div className="text-[13px] font-extrabold text-shortcut-blue tabular-nums leading-tight">100%</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-shortcut-blue/40">booked</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-5 text-[12px] text-shortcut-blue/50 font-medium leading-relaxed">
        Completed events through Jul 21, 2026, covering the Main LV, New York, and New Jersey programs. Trader Monthly Perks is shown in the spend table above but not included here. Booked reflects the share of capacity reserved at peak: every recurring event across these programs booked to 100%. The gap between capacity and appointments delivered reflects last-minute employee cancellations and day-of no-shows that were not rebooked in time. Waitlist counts are employees who tried to book after an event was fully reserved. The Dec one-off holiday event (14 appointments) is included in the totals but not in the per-service rows.
      </p>
    </div>
  );
}

export function SpendByMonthTable() {
  const monthTotal = (m: (typeof MONTHS)[number]) => m.mainLV + m.trader + m.ny + m.nj;
  const colTotal = (key: (typeof LOCATIONS)[number]['key']) =>
    MONTHS.reduce((a, m) => a + m[key], 0);
  const grandTotal = MONTHS.reduce((a, m) => a + monthTotal(m), 0);

  return (
    <div>
      {/* Gratuity callout pill */}
      <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full bg-accent-yellow/25 border border-accent-yellow/50">
        <DollarSign size={13} className="text-shortcut-blue" strokeWidth={2.5} />
        <span className="text-[11px] md:text-[12px] font-extrabold text-shortcut-blue uppercase tracking-wider">
          Base figures shown. DraftKings adds 20% gratuity to every event
        </span>
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-b-2 border-shortcut-blue/[.12]">
              <th className="text-left py-3 px-3 text-[10px] font-extrabold uppercase tracking-[.1em] text-shortcut-blue/40">Month</th>
              {LOCATIONS.map((loc) => (
                <th key={loc.key} className="text-right py-3 px-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${loc.dot}`} />
                    <span className="text-[10px] font-extrabold uppercase tracking-[.08em] text-shortcut-blue/60">{loc.name}</span>
                  </div>
                  <div className="text-[10px] font-semibold text-shortcut-blue/40 mt-0.5">{loc.detail}</div>
                </th>
              ))}
              <th className="text-right py-3 px-3 text-[10px] font-extrabold uppercase tracking-[.1em] text-shortcut-blue">Total</th>
              <th className="text-right py-3 px-3 text-[10px] font-extrabold uppercase tracking-[.1em] text-shortcut-blue/60">All-in <span className="text-shortcut-blue/40 font-bold">(+20%)</span></th>
            </tr>
          </thead>
          <tbody>
            {MONTHS.map((m) => {
              const tot = monthTotal(m);
              const dim = m.partial || m.projected ? 'text-shortcut-blue/50' : 'text-shortcut-blue';
              return (
                <tr key={m.label} className={`border-b border-shortcut-blue/[.06] ${m.projected ? 'bg-shortcut-teal/[.07]' : ''}`}>
                  <td className={`py-3.5 px-3 text-[13px] font-extrabold tabular-nums ${dim}`}>
                    {m.label}
                    {m.projected && (
                      <span className="ml-2 inline-block px-2 py-0.5 rounded-full bg-shortcut-teal/30 text-[10px] font-extrabold uppercase tracking-wider text-shortcut-blue align-middle">expected</span>
                    )}
                  </td>
                  {LOCATIONS.map((loc) => (
                    <td key={loc.key} className={`py-3.5 px-3 text-right text-[14px] font-semibold tabular-nums ${m[loc.key] === 0 ? 'text-shortcut-blue/30' : dim}`}>
                      {fmt(m[loc.key])}
                      {m.njEst && loc.key === 'nj' && m[loc.key] > 0 && (
                        <span className="ml-1 text-[10px] font-bold text-shortcut-blue/40 align-top">est.</span>
                      )}
                    </td>
                  ))}
                  <td className={`py-3.5 px-3 text-right text-[14px] font-extrabold tabular-nums ${dim}`}>{fmt(tot)}</td>
                  <td className={`py-3.5 px-3 text-right text-[13px] font-semibold tabular-nums ${m.partial || m.projected ? 'text-shortcut-blue/40' : 'text-shortcut-blue/60'}`}>
                    {fmt(Math.round(tot * 1.2))}
                  </td>
                </tr>
              );
            })}
            {/* Program-to-date total row */}
            <tr className="bg-shortcut-blue">
              <td className="py-4 px-3 text-[13px] font-extrabold text-white rounded-l-xl">Program total</td>
              {LOCATIONS.map((loc) => (
                <td key={loc.key} className="py-4 px-3 text-right text-[14px] font-extrabold text-white tabular-nums">
                  {fmt(colTotal(loc.key))}
                </td>
              ))}
              <td className="py-4 px-3 text-right text-[15px] font-extrabold text-shortcut-teal tabular-nums">{fmt(grandTotal)}</td>
              <td className="py-4 px-3 text-right text-[13px] font-extrabold text-white/70 tabular-nums rounded-r-xl">{fmt(Math.round(grandTotal * 1.2))}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-5 text-[12px] text-shortcut-blue/50 font-medium leading-relaxed">
        * Partial month. The reporting window starts Nov 13, 2025. Jul 2026 is expected spend: 12 events already delivered plus 4 scheduled through month end. The May and Jun New Jersey events were delivered, and the figures marked est. reflect the standard rate for those event lengths while the final billed amount is confirmed. Dec Main LV includes the one-off holiday hair and beauty event ($1,260) at the same Las Vegas office. One-off Boston photo events (Feb, Apr) are billed separately and not part of the recurring perks program, so they are excluded here.
      </p>
    </div>
  );
}

// ══════════════════════════════════════════════
//  STANDALONE PAGE
// ══════════════════════════════════════════════

export default function DraftKingsSpendReport() {
  const [authenticated, setAuthenticated] = useState(() => {
    return sessionStorage.getItem('draftkings-auth') === 'true';
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

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
            <div className="text-[12px] text-shortcut-blue/50 font-medium">Monthly Spend Summary</div>
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
              View Summary
            </button>
          </form>
          <div className="mt-6 text-center">
            <div className="text-[11px] font-bold uppercase tracking-[.12em] text-shortcut-blue/40">Confidential</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-light-gray font-['Outfit',system-ui,sans-serif]">
      {/* ── Sticky nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-shortcut-blue/[.06]">
        <div className="max-w-[1080px] mx-auto px-6 lg:px-10 h-14 flex items-center justify-between">
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
              Monthly Spend Summary
            </div>
          </div>
          <div className="hidden md:block text-[11px] font-bold uppercase tracking-[.12em] text-shortcut-blue/40">Nov 2025 – Jul 2026</div>
        </div>
      </nav>

      {/* ── Content ── */}
      <main className="pt-14">
        <div className="max-w-[1080px] mx-auto px-4 md:px-6 lg:px-10 py-8 md:py-12 space-y-6 md:space-y-8">

          <div className="relative overflow-hidden rounded-3xl" style={{ backgroundColor: '#F0F0FF' }}>
            <div className="relative z-10 px-6 py-8 md:px-10 md:py-10">
              <div className="text-[11px] font-extrabold uppercase tracking-[.18em] text-shortcut-blue/50 mb-3">
                Program to Date · Nov 13 2025 – Jul 2026
              </div>
              <h1 className="text-[2rem] md:text-[2.75rem] font-extrabold text-shortcut-blue leading-[1.05] tracking-tight">
                Spend per month,
                <span className="block text-shortcut-teal-blue">per location.</span>
              </h1>
              <p className="text-[15px] md:text-[16px] text-text-dark/70 mt-4 font-medium leading-relaxed max-w-[640px]">
                What was paid to Shortcut each month, broken out by program, through July 2026. July is shown as expected spend, combining events already delivered with those scheduled through month end. The full report with fill rates, service detail, and waitlist demand lives at the main report link.
              </p>
            </div>
            <div className="absolute top-0 right-0 w-56 h-56 bg-gradient-to-br from-shortcut-teal/40 to-transparent rounded-full -translate-y-1/3 translate-x-1/3" />
          </div>

          <div className="card-large">
            <SpendByMonthTable />
          </div>

          <div className="card-large">
            <div className="mb-6 md:mb-7">
              <div className="text-[11px] font-bold uppercase tracking-[.12em] text-shortcut-blue/40 mb-1">Attendance</div>
              <h2 className="text-[1.6rem] md:text-[2rem] font-extrabold text-shortcut-blue leading-tight">
                Utilization,
                <span className="text-shortcut-teal-blue"> by location and service.</span>
              </h2>
              <p className="mt-2 text-[14px] md:text-[15px] text-text-dark/70 font-medium leading-relaxed max-w-[640px]">
                Every recurring event across these programs booked to 100% of capacity, with waitlists forming once events fill. Delivered appointment counts sit below capacity only where employees cancelled late or no-showed.
              </p>
            </div>
            <UtilizationSection />
          </div>

          <div className="text-center pb-6">
            <a
              href="/draftkings"
              className="inline-flex items-center gap-2 text-[13px] font-bold text-shortcut-blue hover:text-shortcut-blue/70 transition-colors"
            >
              View the full report
            </a>
          </div>

        </div>
      </main>
    </div>
  );
}
