import React, { useEffect, useMemo, useRef, useState } from 'react';

/* ─────────────────────────────────────────────
   Sales Compensation Model — Caren Skutch
   Interactive financial model for sales rep comp plan
   ───────────────────────────────────────────── */

// ── Fade-in hook ──
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

function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { ref, visible } = useFadeIn();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`}
      style={{ transitionTimingFunction: 'cubic-bezier(.25,.46,.45,.94)' }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-bold uppercase tracking-[.15em] text-[#003756] mb-3">{children}</div>;
}

function Stat({ value, label, accent = false, sub }: { value: string; label: string; accent?: boolean; sub?: string }) {
  return (
    <div className={`rounded-2xl p-5 overflow-hidden ${accent ? 'bg-[#003756] text-white' : 'bg-[#FAFAFA] border border-[#003756]/[.08]'}`}>
      <div className={`text-[1.4rem] md:text-[1.75rem] font-extrabold leading-none whitespace-nowrap ${accent ? 'text-[#FFFFFF]' : 'text-[#003756]'}`}>{value}</div>
      <div className={`mt-2 text-[12px] font-semibold uppercase tracking-[.08em] ${accent ? 'text-white/70' : 'text-[#003756]'}`}>{label}</div>
      {sub && <div className={`mt-1 text-[11px] ${accent ? 'text-white/50' : 'text-[#003756]/50'}`}>{sub}</div>}
    </div>
  );
}

// ── Formatting ──
const fmt = (n: number) => {
  const abs = Math.abs(n);
  const s = abs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return n < 0 ? `($${s})` : `$${s}`;
};
const fmtK = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return fmt(n);
};

// ── Default tier structure ──
// Year 1 goal: $250K ARR
const DEFAULT_TIERS = [
  { label: '$10K', annualValue: 10_000, clients: 5 },
  { label: '$20K', annualValue: 20_000, clients: 5 },
  { label: '$30K', annualValue: 30_000, clients: 2 },
  { label: '$40K', annualValue: 40_000, clients: 1 },
];

const ARR_TARGETS = [250_000, 500_000, 750_000, 1_000_000, 1_500_000];

// ── Company revenue trajectory (from 2026 plan) ──
const COMPANY_TRAJECTORY = [
  { year: '2025 (Actual)', runRate: 825_000, growth: 19, grossRevenue: 750_000 },
  { year: '2026 Target', runRate: 1_155_000, growth: 40, grossRevenue: 1_039_000 },
  { year: '2027', runRate: 1_617_000, growth: 40, grossRevenue: 1_455_000 },
  { year: '2028', runRate: 2_100_000, growth: 30, grossRevenue: 1_891_000 },
];

// Projected metrics if growth targets are met by 2028
const EXIT_METRICS = {
  annualSales: 2_800_000,
  providerCost: 1_160_000,
  grossMargin: 0.65,
  grossProfit: 1_640_000,
  annualExpenses: 600_000,
  ebitda: 1_000_000,
  ebitdaMargin: 0.36,
  targetPurchaseLow: 20_000_000,
  targetPurchaseHigh: 40_000_000,
};

// ── Comp structure presets with accelerators ──
interface CompStructure {
  id: string;
  label: string;
  baseSalary: number;
  tiers: { upTo: number; rate: number }[]; // accelerator tiers, applied in order
  description: string;
}

// Calculate commission using tiered accelerators
function calcTieredCommission(arr: number, tiers: { upTo: number; rate: number }[]): number {
  let remaining = arr;
  let commission = 0;
  let prevCap = 0;
  for (const tier of tiers) {
    const bracket = Math.min(remaining, tier.upTo - prevCap);
    if (bracket <= 0) break;
    commission += bracket * (tier.rate / 100);
    remaining -= bracket;
    prevCap = tier.upTo;
  }
  // Anything above the last tier uses the last tier's rate
  if (remaining > 0) {
    commission += remaining * (tiers[tiers.length - 1].rate / 100);
  }
  return commission;
}

const COMP_STRUCTURES: CompStructure[] = [
  {
    id: 'all-commission',
    label: 'All Commission',
    baseSalary: 0,
    tiers: [{ upTo: Infinity, rate: 20 }],
    description: 'Flat 20% from dollar one',
  },
  {
    id: 'low-base',
    label: 'Low Base',
    baseSalary: 40_000,
    tiers: [
      { upTo: 500_000, rate: 12 },
      { upTo: 1_000_000, rate: 16 },
      { upTo: Infinity, rate: 20 },
    ],
    description: '$40K base + accelerators',
  },
  {
    id: 'mid-base',
    label: 'Mid Base',
    baseSalary: 60_000,
    tiers: [
      { upTo: 500_000, rate: 10 },
      { upTo: 1_000_000, rate: 15 },
      { upTo: Infinity, rate: 20 },
    ],
    description: '$60K base + accelerators',
  },
  {
    id: 'full-base',
    label: 'Full Base',
    baseSalary: 90_000,
    tiers: [
      { upTo: 500_000, rate: 8 },
      { upTo: 1_000_000, rate: 12 },
      { upTo: Infinity, rate: 18 },
    ],
    description: '$90K base + accelerators',
  },
];

export default function SalesCompModel() {
  const [authenticated, setAuthenticated] = useState(() => {
    return sessionStorage.getItem('sales-comp-auth') === 'true';
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [selectedStructure, setSelectedStructure] = useState('all-commission');
  const [tiers, setTiers] = useState(DEFAULT_TIERS.map(t => ({ ...t })));
  const sharePrice = 0.03;
  const quarterlyPrice = 2500;

  const activeStructure = COMP_STRUCTURES.find(s => s.id === selectedStructure) || COMP_STRUCTURES[0];
  const baseSalary = activeStructure.baseSalary;

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Shortcut2026!') {
      sessionStorage.setItem('sales-comp-auth', 'true');
      setAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPassword('');
    }
  };

  const updateTierClients = (idx: number, val: number) => {
    setTiers(prev => prev.map((t, i) => i === idx ? { ...t, clients: val } : t));
  };

  // ── Year 1 calculations (always flat 20%, no base) ──
  const YEAR1_RATE = 20;
  const year1 = useMemo(() => {
    const rows = tiers.map(t => {
      const totalArr = t.annualValue * t.clients;
      const commission = totalArr * (YEAR1_RATE / 100);
      return { ...t, totalArr, commission };
    });
    const totalClients = rows.reduce((s, r) => s + r.clients, 0);
    const totalArr = rows.reduce((s, r) => s + r.totalArr, 0);
    const totalCommission = rows.reduce((s, r) => s + r.commission, 0);
    const avgClientValue = totalClients > 0 ? totalArr / totalClients : 0;
    return { rows, totalClients, totalArr, totalCommission, avgClientValue };
  }, [tiers]);

  // ── ARR growth targets ──
  const arrTable = useMemo(() => {
    return ARR_TARGETS.map(target => {
      const avgClientValue = year1.totalClients > 0 ? year1.totalArr / year1.totalClients : 25_000;
      const clientsNeeded = Math.ceil(target / avgClientValue);
      const commission = calcTieredCommission(target, activeStructure.tiers);
      const effectiveRate = (commission / target) * 100;
      const totalComp = commission + baseSalary;
      return { target, clientsNeeded, avgClientValue, commission, effectiveRate, baseSalary, totalComp };
    });
  }, [year1, activeStructure, baseSalary]);

  // ── Equity valuations ──
  // Real company data: 409A = $1.7M, latest SAFE = $7M
  // Grant: 295,000 shares (1.00%), NSO, $0.03 strike, 10-year term, 4-year vest, 1-year cliff
  const VALUATION_409A = 1_700_000;
  const VALUATION_SAFE = 7_000_000;
  const TOTAL_SHARES = 29_500_000; // 295,000 = 1% → total outstanding
  const HER_SHARES = 295_000;
  const VEST_YEARS = 4;
  const CLIFF_YEARS = 1;

  const equityRows = useMemo(() => {
    const costBasis = HER_SHARES * sharePrice; // total exercise cost
    const pricePerShare409A = VALUATION_409A / TOTAL_SHARES;
    const pricePerShareSAFE = VALUATION_SAFE / TOTAL_SHARES;

    // Vesting schedule: 25% at cliff (year 1), then monthly over remaining 3 years
    const vestingSchedule = [
      { year: 1, sharesVested: Math.round(HER_SHARES * 0.25), pctVested: 25 },
      { year: 2, sharesVested: Math.round(HER_SHARES * 0.50), pctVested: 50 },
      { year: 3, sharesVested: Math.round(HER_SHARES * 0.75), pctVested: 75 },
      { year: 4, sharesVested: HER_SHARES, pctVested: 100 },
    ];

    // Revenue-multiple based valuations tied to company trajectory
    const revenueMultiple = VALUATION_SAFE / COMPANY_TRAJECTORY[0].runRate; // ~8.5x implied from SAFE
    const scenarios = [
      { label: '409A Valuation (current)', valuation: VALUATION_409A, equityValue: HER_SHARES * pricePerShare409A, gain: (HER_SHARES * pricePerShare409A) - costBasis },
      { label: 'SAFE Note (latest round)', valuation: VALUATION_SAFE, equityValue: HER_SHARES * pricePerShareSAFE, gain: (HER_SHARES * pricePerShareSAFE) - costBasis },
      ...COMPANY_TRAJECTORY.slice(1).map(t => {
        const futureVal = t.runRate * revenueMultiple;
        const pps = futureVal / TOTAL_SHARES;
        return { label: `${t.year} (${fmtK(t.runRate)} run rate)`, valuation: futureVal, equityValue: HER_SHARES * pps, gain: (HER_SHARES * pps) - costBasis };
      }),
      { label: `${fmtK(EXIT_METRICS.targetPurchaseLow)} valuation`, valuation: EXIT_METRICS.targetPurchaseLow, equityValue: HER_SHARES * (EXIT_METRICS.targetPurchaseLow / TOTAL_SHARES), gain: (HER_SHARES * (EXIT_METRICS.targetPurchaseLow / TOTAL_SHARES)) - costBasis },
      { label: `${fmtK(EXIT_METRICS.targetPurchaseHigh)} valuation`, valuation: EXIT_METRICS.targetPurchaseHigh, equityValue: HER_SHARES * (EXIT_METRICS.targetPurchaseHigh / TOTAL_SHARES), gain: (HER_SHARES * (EXIT_METRICS.targetPurchaseHigh / TOTAL_SHARES)) - costBasis },
    ];

    return { costBasis, vestingSchedule, scenarios };
  }, [sharePrice]);

  // Password gate
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-full max-w-sm mx-auto px-6">
          <div className="text-center mb-8">
            <div className="text-[15px] font-extrabold text-[#003756] mb-1">Caren Skutch — Chief Strategy Officer</div>
            <div className="text-[12px] text-[#003756] font-medium">Compensation & Equity Model</div>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(false); }}
                placeholder="Enter password"
                autoFocus
                className={`w-full px-4 py-3 rounded-xl border ${error ? 'border-[#FF5050] bg-red-50/30' : 'border-[#003756]/[.12]'} text-[15px] text-[#003756] font-medium placeholder:text-[#003756]/30 focus:outline-none focus:border-[#003756]/30 focus:ring-2 focus:ring-[#FFFFFF]/40 transition-colors`}
              />
              {error && <p className="mt-2 text-[13px] text-[#FF5050] font-medium">Incorrect password.</p>}
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#003756] text-white text-[14px] font-bold hover:bg-[#003756]/90 transition-colors"
            >
              View Model
            </button>
          </form>
          <div className="mt-6 text-center">
            <div className="text-[11px] font-bold uppercase tracking-[.12em] text-[#FF5050]">Confidential</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 md:py-16">

        {/* Header */}
        <Section>
          <div className="mb-12">
            <SectionLabel>Shortcut</SectionLabel>
            <h1 className="text-[2rem] md:text-[2.5rem] font-extrabold text-[#003756] leading-tight tracking-tight">
              Caren Skutch
            </h1>
            <p className="text-[16px] text-[#003756]/60 font-semibold -mt-1 mb-3">Chief Strategy Officer</p>
            <p className="text-[15px] text-[#032232]/70 max-w-2xl leading-relaxed">
              Interactive compensation and equity model. Your sales drive company growth — and your
              equity grows with it. Choose a comp structure and adjust client mix to see how it impacts total earnings.
            </p>
          </div>
        </Section>

        {/* ── Comp Structure Selector ── */}
        <Section className="mb-10">
          <SectionLabel>Year 2+ Compensation Structure</SectionLabel>
          <p className="text-[15px] text-[#032232]/60 mb-5 leading-relaxed">
            Year 1 is pure commission at 20%. Starting Year 2, choose a structure. Higher base means more stability; accelerators reward growth. Tables below update automatically.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {COMP_STRUCTURES.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedStructure(s.id)}
                className={`rounded-2xl p-5 text-left transition-all border-2 ${
                  selectedStructure === s.id
                    ? 'border-[#003756] bg-[#003756] text-white shadow-lg'
                    : 'border-[#003756]/10 bg-white hover:border-[#003756]/30'
                }`}
              >
                <div className={`text-[14px] font-bold ${selectedStructure === s.id ? 'text-white' : 'text-[#003756]'}`}>
                  {s.label}
                </div>
                <div className={`text-[20px] font-extrabold mt-1 ${selectedStructure === s.id ? 'text-white' : 'text-[#003756]'}`}>
                  {s.tiers.length === 1 ? `${s.tiers[0].rate}%` : `${s.tiers[0].rate}-${s.tiers[s.tiers.length - 1].rate}%`}
                </div>
                <div className={`text-[11px] mt-1 ${selectedStructure === s.id ? 'text-white/60' : 'text-[#032232]/50'}`}>
                  {s.baseSalary === 0 ? 'No base salary' : `${fmt(s.baseSalary)} base`}
                </div>
              </button>
            ))}
          </div>
        </Section>

        {/* ── Year 1 Summary Stats ── */}
        <Section className="mb-10">
          <SectionLabel>Year 1 — Commission Only (20%)</SectionLabel>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Stat value={`${year1.totalClients}`} label="Clients Closed" />
            <Stat value={fmtK(year1.totalArr)} label="Total ARR" accent />
            <Stat value={fmt(year1.totalCommission)} label="Commission @ 20%" />
            <Stat
              value={fmt(year1.totalCommission)}
              label="Year 1 Total Comp"
              sub="Pure commission, no base"
            />
          </div>
        </Section>

        {/* ── Year 1 Client Mix ── */}
        <Section className="mb-10">
          <SectionLabel>Year 1 Client Mix by Tier</SectionLabel>
          <p className="text-[15px] text-[#032232]/60 mb-5 leading-relaxed">
            Adjust client counts per tier to model different sales scenarios.
          </p>
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  {['Commitment Tier', 'Clients', 'Quarterly Price', 'Annual Value', 'Tier ARR', 'Commission'].map((h, i) => (
                    <th key={i} className={`py-3 px-4 text-[12px] font-bold uppercase tracking-[.08em] text-[#003756] border-b border-[#003756]/10 ${i > 0 ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {year1.rows.map((row, ri) => (
                  <tr key={ri} className="border-b border-[#003756]/[.06] hover:bg-[#003756]/[.02] transition-colors">
                    <td className="py-3 px-4 text-[14px] text-[#032232] font-semibold">{row.label} / year</td>
                    <td className="py-3 px-4 text-right">
                      <input
                        type="number"
                        value={row.clients}
                        onChange={e => updateTierClients(ri, Math.max(0, Number(e.target.value)))}
                        className="w-16 px-2 py-1 rounded-md border border-[#003756]/15 text-[#003756] font-bold text-[14px] text-right focus:outline-none focus:ring-2 focus:ring-[#003756]/20"
                      />
                    </td>
                    <td className="py-3 px-4 text-[14px] text-[#032232] font-medium text-right">{fmt(row.annualValue / 4)}</td>
                    <td className="py-3 px-4 text-[14px] text-[#032232] font-medium text-right">{fmt(row.annualValue)}</td>
                    <td className="py-3 px-4 text-[14px] text-[#032232] font-medium text-right">{fmt(row.totalArr)}</td>
                    <td className="py-3 px-4 text-[14px] text-[#018EA2] font-semibold text-right">{fmt(row.commission)}</td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="bg-[#003756]/[.04] font-bold">
                  <td className="py-3 px-4 text-[14px] text-[#003756]">Total</td>
                  <td className="py-3 px-4 text-[14px] text-[#003756] text-right">{year1.totalClients}</td>
                  <td className="py-3 px-4 text-[14px] text-[#003756] text-right">{fmt(Math.round(year1.avgClientValue / 4))}</td>
                  <td className="py-3 px-4 text-[14px] text-[#003756] text-right">{fmt(year1.avgClientValue)} avg</td>
                  <td className="py-3 px-4 text-[14px] text-[#003756] text-right">{fmt(year1.totalArr)}</td>
                  <td className="py-3 px-4 text-[14px] text-[#018EA2] font-bold text-right">{fmt(year1.totalCommission)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── ARR Growth Targets ── */}
        <Section className="mb-10">
          <SectionLabel>Year 2+ ARR Growth Targets</SectionLabel>
          <p className="text-[15px] text-[#032232]/60 mb-5 leading-relaxed">
            Compensation at each ARR level using your selected structure. Commission accelerators kick in as revenue grows.
          </p>
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  {['ARR Target', 'Clients Needed', 'Commission', 'Eff. Rate', 'Base Salary', 'Total Comp'].map((h, i) => (
                    <th key={i} className={`py-3 px-4 text-[12px] font-bold uppercase tracking-[.08em] text-[#003756] border-b border-[#003756]/10 ${i > 0 ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {arrTable.map((row, ri) => (
                  <tr key={ri} className={`border-b border-[#003756]/[.06] hover:bg-[#003756]/[.02] transition-colors ${ri === arrTable.length - 1 ? 'bg-[#9EFAFF]/30' : ''}`}>
                    <td className="py-3 px-4 text-[14px] text-[#003756] font-bold">{fmtK(row.target)}</td>
                    <td className="py-3 px-4 text-[14px] text-[#032232] font-medium text-right">{row.clientsNeeded}</td>
                    <td className="py-3 px-4 text-[14px] text-[#018EA2] font-semibold text-right">{fmt(Math.round(row.commission))}</td>
                    <td className="py-3 px-4 text-[14px] text-[#032232] font-medium text-right">{row.effectiveRate.toFixed(1)}%</td>
                    <td className="py-3 px-4 text-[14px] text-[#032232] font-medium text-right">{row.baseSalary === 0 ? <span className="text-[#003756]/30">Commission only</span> : fmt(row.baseSalary)}</td>
                    <td className="py-3 px-4 text-[14px] text-[#003756] font-bold text-right">{fmt(row.totalComp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── Company Revenue Trajectory ── */}
        <Section className="mb-10">
          <SectionLabel>Company Revenue Trajectory</SectionLabel>
          <p className="text-[15px] text-[#032232]/60 mb-5 leading-relaxed">
            Shortcut's growth plan. Your sales contribute directly to hitting these milestones — and each milestone increases the value of your equity.
          </p>
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  {['Year-End', 'Run Rate', 'Growth', 'Est. Gross Revenue', 'Your % Contribution'].map((h, i) => (
                    <th key={i} className={`py-3 px-4 text-[12px] font-bold uppercase tracking-[.08em] text-[#003756] border-b border-[#003756]/10 ${i > 0 ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPANY_TRAJECTORY.map((row, ri) => {
                  const herContribution = ri === 0 ? null : Math.round((year1.totalArr / row.grossRevenue) * 100);
                  return (
                    <tr key={ri} className={`border-b border-[#003756]/[.06] hover:bg-[#003756]/[.02] transition-colors ${ri === 1 ? 'bg-[#9EFAFF]/20' : ''}`}>
                      <td className="py-3 px-4 text-[14px] text-[#003756] font-semibold">{row.year}</td>
                      <td className="py-3 px-4 text-[14px] text-[#032232] font-medium text-right">{fmtK(row.runRate)}</td>
                      <td className="py-3 px-4 text-[14px] text-[#018EA2] font-semibold text-right">+{row.growth}%</td>
                      <td className="py-3 px-4 text-[14px] text-[#032232] font-medium text-right">{fmtK(row.grossRevenue)}</td>
                      <td className="py-3 px-4 text-[14px] text-[#003756] font-semibold text-right">
                        {herContribution === null ? <span className="text-[#003756]/30">—</span> : `${herContribution}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── Exit Strategy ── */}
        <Section className="mb-10">
          <SectionLabel>Potential Liquidity Event</SectionLabel>
          <p className="text-[15px] text-[#032232]/60 mb-5 leading-relaxed">
            If the company hits its growth targets, a liquidity event (acquisition, secondary sale, or similar) could become viable by 2028. These are illustrative scenarios, not guarantees.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Stat value="$20-40M" label="Potential Valuation Range" accent />
            <Stat value={fmtK(EXIT_METRICS.annualSales)} label="Projected Annual Sales" />
            <Stat value={fmtK(EXIT_METRICS.ebitda)} label="EBITDA" sub={`${Math.round(EXIT_METRICS.ebitdaMargin * 100)}% margin`} />
            <Stat value={`${Math.round(EXIT_METRICS.grossMargin * 100)}%`} label="Gross Margin" />
          </div>
          <div className="bg-[#003756] rounded-2xl p-6 text-white">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[.12em] text-white/50 mb-1">Your 1% at $20M Valuation</div>
                <div className="text-[1.75rem] font-extrabold">{fmt(200_000)}</div>
                <div className="text-[12px] text-white/50 mt-1">Gain: {fmt(200_000 - equityRows.costBasis)} over strike</div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[.12em] text-white/50 mb-1">Your 1% at $40M Valuation</div>
                <div className="text-[1.75rem] font-extrabold">{fmt(400_000)}</div>
                <div className="text-[12px] text-white/50 mt-1">Gain: {fmt(400_000 - equityRows.costBasis)} over strike</div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Equity Grant ── */}
        <Section className="mb-10">
          <SectionLabel>Equity Grant — 1% (NSO)</SectionLabel>
          <p className="text-[15px] text-[#032232]/60 mb-5 leading-relaxed">
            295,000 shares at ${sharePrice.toFixed(2)} strike price. 10-year term. 4-year vest with 1-year cliff.
          </p>

          {/* Grant summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Stat value="295,000" label="Shares Granted" sub="1.00% of company" />
            <Stat value={fmt(equityRows.costBasis)} label="Total Exercise Cost" sub={`295,000 x $${sharePrice.toFixed(2)}`} />
            <Stat value={fmt(VALUATION_409A * 0.01)} label="Value at 409A ($1.7M)" />
            <Stat value={fmt(VALUATION_SAFE * 0.01)} label="Value at SAFE ($7M)" accent />
          </div>

          {/* Vesting schedule */}
          <div className="mb-6">
            <div className="text-[12px] font-semibold text-[#003756]/60 uppercase tracking-wide mb-3">Vesting Schedule</div>
            <div className="overflow-x-auto -mx-2 px-2">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    {['Year', 'Shares Vested', '% Vested', 'Value at 409A', 'Value at SAFE'].map((h, i) => (
                      <th key={i} className={`py-2 px-4 text-[11px] font-bold uppercase tracking-[.08em] text-[#003756] border-b border-[#003756]/10 ${i > 0 ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {equityRows.vestingSchedule.map((v, vi) => (
                    <tr key={vi} className={`border-b border-[#003756]/[.06] ${vi === 0 ? 'bg-[#9EFAFF]/10' : ''}`}>
                      <td className="py-2 px-4 text-[13px] text-[#003756] font-semibold">Year {v.year}{vi === 0 ? ' (cliff)' : ''}</td>
                      <td className="py-2 px-4 text-[13px] text-[#032232] font-medium text-right">{v.sharesVested.toLocaleString()}</td>
                      <td className="py-2 px-4 text-[13px] text-[#032232] font-medium text-right">{v.pctVested}%</td>
                      <td className="py-2 px-4 text-[13px] text-[#032232] font-medium text-right">{fmt(Math.round(v.sharesVested * (VALUATION_409A / TOTAL_SHARES)))}</td>
                      <td className="py-2 px-4 text-[13px] text-[#018EA2] font-semibold text-right">{fmt(Math.round(v.sharesVested * (VALUATION_SAFE / TOTAL_SHARES)))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Valuation scenarios */}
          <div className="text-[12px] font-semibold text-[#003756]/60 uppercase tracking-wide mb-3">Equity Value by Scenario (fully vested)</div>
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  {['Scenario', 'Company Valuation', '295K Shares Value', 'Gain over Strike'].map((h, i) => (
                    <th key={i} className={`py-3 px-4 text-[12px] font-bold uppercase tracking-[.08em] text-[#003756] border-b border-[#003756]/10 ${i > 0 ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {equityRows.scenarios.map((row, ri) => (
                  <tr key={ri} className={`border-b border-[#003756]/[.06] hover:bg-[#003756]/[.02] transition-colors ${ri >= equityRows.scenarios.length - 1 ? 'bg-[#9EFAFF]/30' : ''}`}>
                    <td className="py-3 px-4 text-[14px] text-[#003756] font-semibold">{row.label}</td>
                    <td className="py-3 px-4 text-[14px] text-[#032232] font-medium text-right">{fmtK(row.valuation)}</td>
                    <td className="py-3 px-4 text-[14px] text-[#003756] font-bold text-right">{fmt(Math.round(row.equityValue))}</td>
                    <td className="py-3 px-4 text-[14px] text-[#018EA2] font-bold text-right">{fmt(Math.round(row.gain))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── Total Compensation Summary ── */}
        <Section className="mb-10">
          <SectionLabel>Total Compensation Summary</SectionLabel>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat
              value={fmt(year1.totalCommission)}
              label="Year 1 Commission"
              sub={`${year1.totalClients} clients at 20% commission`}
            />
            <Stat
              value={fmt(arrTable[arrTable.length - 1].totalComp)}
              label="At $1M ARR"
              sub={baseSalary > 0 ? `${fmt(Math.round(arrTable[arrTable.length - 1].commission))} commission + ${fmt(baseSalary)} base` : `${arrTable[arrTable.length - 1].effectiveRate.toFixed(0)}% effective rate`}
            />
            <Stat
              value="$200-400K"
              label="1% Equity Potential"
              accent
              sub="If growth targets met by 2028"
            />
            <Stat
              value={fmt(arrTable[arrTable.length - 1].totalComp + 300_000)}
              label="Total Comp + Equity"
              sub="Cash comp + equity midpoint"
            />
          </div>
        </Section>

        {/* ── Assumptions ── */}
        <Section>
          <div className="bg-[#F5F9FA] rounded-2xl p-6 border border-[#003756]/[.06]">
            <SectionLabel>Model Assumptions</SectionLabel>
            <ul className="text-[15px] text-[#032232]/70 space-y-2.5 mt-3 leading-relaxed">
              <li>Baseline pricing: {fmt(quarterlyPrice)} per quarterly event commitment ({fmt(quarterlyPrice * 4)}/yr minimum)</li>
              <li>Selected structure: {activeStructure.label} — {activeStructure.tiers.map(t => `${t.rate}%`).join(' → ')} commission{baseSalary > 0 ? ` + ${fmt(baseSalary)} base` : ', no base salary'}</li>
              <li>Commission paid monthly on collected revenue from prior month</li>
              <li>295,000 shares (1.00%), NSO, ${sharePrice.toFixed(2)} strike, 10-year term</li>
              <li>4-year vest with 1-year cliff (25% at cliff, monthly thereafter)</li>
              <li>409A valuation: $1.7M | Latest SAFE note: $7M</li>
              <li>Year 1: Pure commission at 20% of ARR, no base salary</li>
              <li>Year 2+: Choice of comp structure with base salary and commission accelerators</li>
              <li>Company trajectory: $825K (2025) → $1.155M (2026) → $1.617M (2027) → $2.1M (2028)</li>
              <li>Potential liquidity event viable by 2028 if growth targets are met</li>
              <li>Illustrative valuation range: $20-40M based on $2.8M annual sales, 65% gross margin, $1M EBITDA</li>
            </ul>
          </div>
        </Section>

        <div className="mt-8 text-center text-[11px] text-[#003756]/30 uppercase tracking-widest">
          Shortcut &middot; Prepared for Caren Skutch &middot; Confidential
        </div>
      </div>
    </div>
  );
}
