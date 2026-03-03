import { useEffect, useMemo, useRef, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';

/* ─────────────────────────────────────────────
   Lower Pyne Associates LP — Financial Dashboard
   Password-gated interactive financial analysis
   ───────────────────────────────────────────── */

// ── Intersection Observer fade-in hook ──
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
      data-toc
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`}
      style={{ transitionTimingFunction: 'cubic-bezier(.25,.46,.45,.94)' }}
    >
      {children}
    </div>
  );
}

function Table({ headers, rows, className = '', compact = false }: { headers: string[]; rows: (string | React.ReactNode)[][]; className?: string; compact?: boolean }) {
  return (
    <div className={`overflow-x-auto -mx-2 px-2 ${className}`}>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className={`${compact ? 'py-2 px-3 text-[11px]' : 'py-3 px-4 text-[12px]'} font-bold uppercase tracking-[.08em] text-[#334A46]/50 border-b border-[#334A46]/10 ${i > 0 ? 'text-right' : ''}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-[#334A46]/[.06] last:border-0 hover:bg-[#334A46]/[.02] transition-colors">
              {row.map((cell, ci) => (
                <td key={ci} className={`${compact ? 'py-2 px-3 text-[13px]' : 'py-3 px-4 text-[14px]'} text-[#3D4F5F] font-medium ${ci > 0 ? 'text-right' : ''}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Stat({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 overflow-hidden ${accent ? 'bg-[#334A46] text-white' : 'bg-[#FAFAFA] border border-[#334A46]/[.08]'}`}>
      <div className={`text-[1.4rem] md:text-[1.75rem] font-extrabold leading-none whitespace-nowrap ${accent ? 'text-[#FFFFFF]' : 'text-[#334A46]'}`}>{value}</div>
      <div className={`mt-2 text-[12px] font-semibold uppercase tracking-[.08em] ${accent ? 'text-white/70' : 'text-[#334A46]/50'}`}>{label}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-bold uppercase tracking-[.15em] text-[#334A46]/40 mb-3">{children}</div>;
}

// Formatting helpers
const fmt = (n: number) => {
  const neg = n < 0;
  const abs = Math.abs(n);
  const s = abs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return neg ? `($${s})` : `$${s}`;
};

const pct = (n: number) => (n * 100).toFixed(1) + '%';

const delta = (curr: number, prev: number) => {
  if (prev === 0) return null;
  return (curr - prev) / Math.abs(prev);
};

function DeltaCell({ value, invert = false }: { value: number | null; invert?: boolean }) {
  if (value === null) return <span className="text-[#666]">New</span>;
  const positive = invert ? value <= 0 : value >= 0;
  return <span className={positive ? 'text-[#2E7D32] font-semibold' : 'text-[#C62828] font-semibold'}>{pct(value)}</span>;
}

function SummaryRow({ cells, highlight = false }: { cells: React.ReactNode[]; highlight?: boolean }) {
  return (
    <tr className={highlight ? 'bg-[#E2EFDA]/60' : ''}>
      {cells.map((cell, i) => (
        <td key={i} className={`py-3 px-4 text-[14px] font-bold text-[#334A46] ${i > 0 ? 'text-right' : ''}`}>{cell}</td>
      ))}
    </tr>
  );
}

// ══════════════════════════════════════════════
// DATA
// ══════════════════════════════════════════════
const years = [2023, 2024, 2025];

const income = {
  baseRents:   [693082, 711323, 729970],
  escalators:  [125264, 128523, 140014],
  otherIncome: [6600, 6600, 6600],
  electricInc: [784, 414, 480],
  interestInc: [4298, 4193, 2830],
};
const totalIncome = years.map((_, i) =>
  income.baseRents[i] + income.escalators[i] + income.otherIncome[i] + income.electricInc[i] + income.interestInc[i]
);

const expenses = {
  electric:        [13485, 14718, 18345],
  waterSewer:      [5499, 5734, 6199],
  janitorial:      [20350, 21816, 23864],
  snowRemoval:     [5800, 6499, 15881],
  grounds:         [13988, 14419, 20358],
  propMgmt:        [33015, 33971, 35083],
  repairsAC:       [14720, 24636, 6115],
  repairsGeneral:  [33172, 54852, 37686],
  landlordWork:    [0, 0, 720],
  pestControl:     [2060, 2235, 2459],
  trashCollection: [3950, 4200, 4767],
  realEstateTax:   [116055, 121484, 124744],
  insurance:       [22310, 23603, 25699],
  profFeesAcctg:   [4980, 4980, 4980],
  profFeesArch:    [0, 0, 4050],
  profFeesLegal:   [0, 0, 117],
  nonEscMisc:      [1118, 1045, 373],
  bankFees:        [1912, 2049, 1976],
  swapPayment:     [-130117, -139615, -99859],
  officeSupplies:  [602, 556, 868],
  depreciation:    [24200, 24422, 25084],
  amortization:    [12400, 10930, 834],
  mortgageInt:     [292705, 299051, 255110],
};

const totalExpenses = [493068, 531584, 515452];
const operatingProfit = [336960, 319468, 364443];
const netProfit = [339935, 318233, 361829];

// Balance Sheet
const cashOnHand = [1711504, 1676355, 1575348];
const totalAssets = [3366838, 3180491, 3150228];
const mortgage = [4063196, 3970789, 3874209];
const totalLiabilities = [4095944, 4021414, 3909322];
const totalCapital = [-729106, -840923, -759094];

// Cash flow
const deprec = [24200, 24422, 25084];
const amort = [12400, 10930, 834];
const cashFromOps = years.map((_, i) => netProfit[i] + deprec[i] + amort[i]);
const principalPaid = [90000, 92407, 96580];
const cashBeforeDist = years.map((_, i) => cashFromOps[i] - principalPaid[i]);

// ── Historical Performance Data (2015–2025) ──
const historicalYears = [2015, 2016, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
const historicalRevenue = [701553, 723045, 759258, 790645, 810355, 797814, 786735, 830028, 851053, 879895];
const historicalNetProfit = [71919, 183038, 198280, 145699, 284725, 111060, 132508, 339935, 318233, 361829];
const historicalCash = [1066800, 1224215, 1418692, 2220528, 2362967, 2004203, 1794405, 1711504, 1676355, 1575348];
const historicalMortgage = [2903549, 2847476, 2726895, 4399584, 4320759, 4238271, 4152461, 4063196, 3970789, 3874209];
const historicalDistributions = [190000, 120000, 230000, 750000, 200000, 210000, 240000, 280000, 280000, 280000];
const historicalMR = [191983, 97822, 105299, 170768, 95162, 202738, 109318, 47892, 79488, 43801];

// ── Last Refinancing Data (2017–2018) ──
const lastRefi = {
  preRefiMortgage: 2847476,
  postRefiMortgage: 4399584,
  cashOutProceeds: 4399584 - 2847476, // ~$1,552K
  estimatedRevenueAtRefi: 770000, // interpolated
  estimatedNOIAtRefi: 470000, // interpolated
  loanCosts: 302996, // intangibles that appeared
  hadLongTermLeases: true, // ~10yr terms signed ~2017, winding down at refi
  interestRateStructure: 'Floating + swap',
  effectiveRate2020: 0.027, // ~2.7%
};

// ── Rent Roll Data ──
const rentRollTenants = [
  { name: 'Hamilton Jewelers', floor: '1st + Basements', sqft: 11003, base2025: 423939, escalations: 139911, total2025: 563850, expires: '02/28/2027', pctRevenue: 64.3 },
  { name: 'J Kerney Kuser', floor: '2nd Floor', sqft: 1172, base2025: 62116, escalations: 0, total2025: 62116, expires: '12/31/2026', pctRevenue: 7.1 },
  { name: 'GHO Ventures', floor: '2nd Floor', sqft: 1172, base2025: 58014, escalations: 420, total2025: 58434, expires: '06/30/2026', pctRevenue: 6.7 },
  { name: 'Rita Allen Foundation', floor: '3rd Floor', sqft: 2343, base2025: 103873, escalations: 0, total2025: 103873, expires: '08/31/2026', pctRevenue: 11.8 },
  { name: 'Mercator Management', floor: '4th Floor', sqft: 1750, base2025: 82028, escalations: 0, total2025: 82028, expires: '01/31/2027', pctRevenue: 9.4 },
];
const totalRentRollSqft = 17440;
const totalRentRollRevenue = 876901;

// ── Cash Reserve Optimization ──
const cashInChecking = 1575348;
const avgMonthlyExpenses = 43000; // ~$515K / 12
const avgMonthlyMortgage = 21000;
const sixMonthReserve = (avgMonthlyExpenses + avgMonthlyMortgage) * 6; // ~$384K
const conservativeReserve = 500000;
const investableAmount = cashInChecking - conservativeReserve; // ~$1,075K
const currentInterestIncome = 2830; // 2025
const currentYield = currentInterestIncome / cashInChecking; // ~0.18%

// Projections
const projYears = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035];
const baseRevenue2025 = 879895;
const projRevenue = projYears.map((_, i) => Math.round(baseRevenue2025 * Math.pow(1.03, i + 1)));
const otherOpEx2025 = 209539;
const reTax2025 = 124744;
const cashOpEx2025 = otherOpEx2025 + reTax2025; // 334,283
const projCashOpEx = projYears.map((_, i) => Math.round(otherOpEx2025 * Math.pow(1.03, i + 1)) + Math.round(reTax2025 * Math.pow(1.035, i + 1)));
const noi2025 = baseRevenue2025 - cashOpEx2025;
const projNOI = projYears.map((_, i) => projRevenue[i] - projCashOpEx[i]);

// Valuation cap rates
const capRates = [0.06, 0.065, 0.07, 0.075, 0.08];

// Debt service calculator
function annualDebtService(principal: number, annualRate: number) {
  const r = annualRate / 12;
  const n = 300; // 25-year amortization
  const monthly = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Math.round(monthly * 12);
}

// ══════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════

export default function LowerPyneDashboard() {
  const [authenticated, setAuthenticated] = useState(() => {
    return sessionStorage.getItem('lower-pyne-auth') === 'true';
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [activeTab, setActiveTab] = useState<'analysis' | 'projections'>('analysis');
  const [showExpenseDetail, setShowExpenseDetail] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'LouieLevi1!') {
      sessionStorage.setItem('lower-pyne-auth', 'true');
      setAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPassword('');
    }
  };

  // TOC tracking
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

  const tocGroups = [
    { group: 'Deal Overview', items: [
      { id: 'summary', label: 'Investment Thesis' },
      { id: 'rent-roll', label: 'Rent Roll & Tenants' },
      { id: 'historical', label: 'Historical Performance' },
    ]},
    { group: 'Financial Statements', items: [
      { id: 'revenue', label: 'Revenue' },
      { id: 'expenses', label: 'Expenses' },
      { id: 'profitability', label: 'Profitability' },
      { id: 'balance-sheet', label: 'Balance Sheet' },
      { id: 'cash-flow', label: 'Cash Flow' },
    ]},
    { group: 'Forward Analysis', items: [
      { id: 'revenue-projections', label: 'Revenue Projections' },
      { id: 'ten-year', label: '10-Year NOI & Scenarios' },
      { id: 'refinancing', label: 'Refinancing Analysis' },
      { id: 'valuation', label: 'Valuation' },
    ]},
    { group: 'Strategic Actions', items: [
      { id: 'distributions', label: 'Distributions' },
      { id: 'buyout', label: 'Partner Buyout' },
      { id: 'capital', label: 'Capital Improvements' },
      { id: 'cash-optimization', label: 'Cash Optimization' },
      { id: 'recommendations', label: 'Recommendations' },
    ]},
  ];

  // Password gate
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-white font-['Outfit',system-ui,sans-serif] flex items-center justify-center">
        <div className="w-full max-w-sm mx-auto px-6">
          <div className="text-center mb-8">
            <div className="text-[15px] font-extrabold text-[#334A46] mb-1">Lower Pyne Associates LP</div>
            <div className="text-[12px] text-[#334A46]/40 font-medium">Financial Analysis & Strategic Plan</div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(false); }}
                placeholder="Enter password"
                autoFocus
                className={`w-full px-4 py-3 rounded-xl border ${error ? 'border-[#FF5050] bg-red-50/30' : 'border-[#334A46]/[.12]'} text-[15px] text-[#334A46] font-medium placeholder:text-[#334A46]/30 focus:outline-none focus:border-[#334A46]/30 focus:ring-2 focus:ring-[#FFFFFF]/40 transition-colors`}
              />
              {error && <p className="mt-2 text-[13px] text-[#FF5050] font-medium">Incorrect password.</p>}
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#334A46] text-white text-[14px] font-bold hover:bg-[#334A46]/90 transition-colors"
            >
              View Document
            </button>
          </form>
          <div className="mt-6 text-center">
            <div className="text-[11px] font-bold uppercase tracking-[.12em] text-[#FF5050]">Confidential</div>
          </div>
        </div>
      </div>
    );
  }

  // Expense table rows
  const expenseRows: [string, number[]][] = [
    ['Electric', expenses.electric],
    ['Water & Sewer', expenses.waterSewer],
    ['Janitorial', expenses.janitorial],
    ['Snow Removal', expenses.snowRemoval],
    ['Grounds', expenses.grounds],
    ['Property Management', expenses.propMgmt],
    ['Repairs & Maintenance A/C', expenses.repairsAC],
    ['Repairs & Maintenance General', expenses.repairsGeneral],
    ['Landlord Work', expenses.landlordWork],
    ['Pest Control', expenses.pestControl],
    ['Trash Collection', expenses.trashCollection],
    ['Real Estate Tax', expenses.realEstateTax],
    ['Insurance', expenses.insurance],
    ['Professional Fees - Acctg.', expenses.profFeesAcctg],
    ['Professional Fees - Architect', expenses.profFeesArch],
    ['Professional Fees - Legal', expenses.profFeesLegal],
    ['Non-Esc. Miscellaneous', expenses.nonEscMisc],
    ['Bank Fees', expenses.bankFees],
    ['BMT Interest Rate Swap', expenses.swapPayment],
    ['Office Supplies', expenses.officeSupplies],
    ['Depreciation Expense', expenses.depreciation],
    ['Amortization Expense', expenses.amortization],
    ['Mortgage Interest', expenses.mortgageInt],
  ];

  // Revenue projection rows (2025-2029)
  const revProjection = [
    { year: 2025, revenue: 879895, yoy: 0, cumulative: 0, isBase: true },
    { year: 2026, revenue: 906292, yoy: 26397, cumulative: 26397 },
    { year: 2027, revenue: 933481, yoy: 27189, cumulative: 53586 },
    { year: 2028, revenue: 961485, yoy: 28004, cumulative: 81590 },
    { year: 2029, revenue: 990330, yoy: 28845, cumulative: 110435, isRefi: true },
  ];

  // Cash balance projection
  const cashProjection = [
    { year: 2025, ending: 1575000, nassau: 0, isBase: true },
    { year: 2026, ending: 1475000, nassau: -100000 },
    { year: 2027, ending: 1475000, nassau: 0 },
    { year: 2028, ending: 1475000, nassau: 0 },
    { year: 2029, ending: 1475000, nassau: 0, isRefi: true },
  ];

  // Distribution projection
  const distProjection = [
    { year: 2025, total: 280000, share60: 168000, isBase: true },
    { year: 2026, total: 300000, share60: 180000 },
    { year: 2027, total: 310000, share60: 186000 },
    { year: 2028, total: 320000, share60: 192000 },
    { year: 2029, total: 335000, share60: 201000, isRefi: true },
  ];

  // Refinancing scenarios
  const noi2029 = projNOI[3]; // 2029 NOI (~$611K from 3% rev / 3% opex + 3.5% tax growth)
  const loanScenarios = [
    { label: '$3.6M @ 5.00%', principal: 3600000, rate: 0.05 },
    { label: '$3.6M @ 5.75%', principal: 3600000, rate: 0.0575 },
    { label: '$3.6M @ 6.50%', principal: 3600000, rate: 0.065 },
    { label: '$5M @ 5.75%', principal: 5000000, rate: 0.0575 },
    { label: '$6M @ 5.75%', principal: 6000000, rate: 0.0575 },
    { label: '$6M @ 6.50%', principal: 6000000, rate: 0.065 },
  ];

  return (
    <div className="min-h-screen bg-white font-['Outfit',system-ui,sans-serif]">
      {/* Header */}
      <div className="border-b border-[#334A46]/[.08] bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-[15px] font-extrabold text-[#334A46]">Lower Pyne Associates LP</div>
            <div className="text-[11px] text-[#334A46]/40 font-medium">Financial Analysis & Strategic Plan &middot; 2023&ndash;2035</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-[#334A46]/[.06] rounded-lg p-0.5">
              {(['analysis', 'projections'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); window.scrollTo(0, 0); }}
                  className={`px-4 py-1.5 rounded-md text-[13px] font-semibold transition-all ${
                    activeTab === tab
                      ? 'bg-white text-[#334A46] shadow-sm'
                      : 'text-[#334A46]/50 hover:text-[#334A46]/70'
                  }`}
                >
                  {tab === 'analysis' ? 'Analysis' : 'Projections'}
                </button>
              ))}
            </div>
            <div className="text-[11px] font-bold uppercase tracking-[.12em] text-[#FF5050]">Confidential</div>
          </div>
        </div>
      </div>

      {activeTab === 'analysis' ? (
      <div className="max-w-7xl mx-auto px-6 py-10 flex gap-10">
        {/* Sidebar TOC */}
        <nav className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-24 space-y-1">
            {tocGroups.map((group) => (
              <div key={group.group} className="mb-3">
                <div className="text-[10px] font-bold uppercase tracking-[.15em] text-[#334A46]/30 mb-1 px-3">{group.group}</div>
                {group.items.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className={`block text-[13px] py-1.5 px-3 rounded-lg transition-colors ${
                      activeSection === item.id
                        ? 'bg-[#334A46]/[.06] text-[#334A46] font-semibold'
                        : 'text-[#334A46]/50 hover:text-[#334A46]/80 hover:bg-[#334A46]/[.03]'
                    }`}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-16">

          {/* ── 1. INVESTMENT THESIS ── */}
          <Section id="summary">
            <SectionLabel>Investment Thesis</SectionLabel>
            <h1 className="text-[2rem] md:text-[2.5rem] font-extrabold text-[#334A46] leading-tight mb-6">
              Lower Pyne Associates LP
            </h1>

            <div className="bg-[#334A46] rounded-2xl p-6 md:p-8 text-white mb-8">
              <p className="text-[16px] md:text-[17px] leading-relaxed opacity-95">
                Lower Pyne Associates LP owns <span className="font-bold text-[#FFFFFF]">17,440 SF</span> of
                prime Nassau Street retail and office space in Princeton, NJ. With all five tenants committed to
                lease renewals (Hamilton 10yr, others 5yr) at 3% annual escalators, the <span className="font-bold text-[#FFFFFF]">2029 mortgage
                maturity</span> presents a cash-out refinancing opportunity of <span className="font-bold text-[#FFFFFF]">$1.4M&ndash;$2.4M</span> at
                strong DSCR coverage. This memo analyzes the financial position, refinancing scenarios, and three near-term
                strategic decisions: partner buyout ($1.2&ndash;$2.2M), capital improvements ($750K), and treasury optimization ($215K+ in foregone income).
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              <Stat value="$880K" label="2025 Revenue" accent />
              <Stat value="$546K" label="2025 NOI" />
              <Stat value="2.17x" label="Debt Service Coverage" />
              <Stat value="$1.58M" label="Cash Reserves" accent />
              <Stat value="$3.87M" label="Mortgage Balance" />
              <Stat value="$611K" label="2029 Proj. NOI" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#FAFAFA] rounded-2xl p-5 border border-[#334A46]/[.06]">
                <div className="text-[12px] font-bold uppercase tracking-[.08em] text-[#2E7D32] mb-2">Strengths</div>
                <div className="space-y-2 text-[14px] text-[#3D4F5F] leading-relaxed">
                  <p>All leases assumed renewing (Hamilton 10yr, others 5yr) w/ 3% escalators</p>
                  <p>NOI growing at ~3% annually (revenue 3%, expenses 3%/3.5%)</p>
                  <p>DSCR consistently above 2.0x on current debt</p>
                  <p>Hamilton Jewelers anchor tenant</p>
                </div>
              </div>
              <div className="bg-[#FAFAFA] rounded-2xl p-5 border border-[#334A46]/[.06]">
                <div className="text-[12px] font-bold uppercase tracking-[.08em] text-[#C62828] mb-2">Action Required</div>
                <div className="space-y-2 text-[14px] text-[#3D4F5F] leading-relaxed">
                  <p>Execute all lease renewals in 2026&ndash;2027</p>
                  <p>File Section 754 elections with 2025 tax returns</p>
                  <p>Negotiate 20% partner buyout at minority discount</p>
                  <p>Deploy $1.08M idle cash into yield-bearing instruments</p>
                </div>
              </div>
            </div>
          </Section>

          {/* ── HISTORICAL PERFORMANCE ── */}
          <Section id="historical">
            <SectionLabel>10-Year Historical Performance</SectionLabel>
            <h2 className="text-[1.5rem] font-extrabold text-[#334A46] mb-4">2015&ndash;2025 Financial Trajectory</h2>
            <p className="text-[14px] text-[#3D4F5F] leading-relaxed mb-6">
              A decade of financial data reveals consistent revenue growth, a transformative 2018&ndash;2019 refinancing,
              and the partnership's ability to maintain strong cash reserves through multiple market cycles.
              Year 2017 is omitted (financials not available). The 2018 column is pre-refi; 2019 reflects the post-refi balance sheet.
            </p>

            <div className="bg-white rounded-2xl border border-[#334A46]/[.08] overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr>
                      <th className="py-3 px-3 text-[11px] font-bold uppercase tracking-[.08em] text-[#334A46]/50 border-b border-[#334A46]/10 sticky left-0 bg-white z-10"></th>
                      {historicalYears.map((yr) => (
                        <th key={yr} className={`py-3 px-3 text-[11px] font-bold uppercase tracking-[.08em] border-b border-[#334A46]/10 text-right whitespace-nowrap ${yr === 2019 ? 'text-[#2E7D32] bg-[#E2EFDA]/30' : yr === 2018 ? 'text-[#B26A00] bg-[#FFF8E1]/40' : yr <= 2016 ? 'text-[#334A46]/40 bg-[#FAFAFA]' : 'text-[#334A46]/50'}`}>
                          {yr === 2019 ? '2019 Post-Refi' : yr === 2018 ? '2018 Pre-Refi' : yr}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#334A46]/[.06]">
                      <td className="py-2.5 px-3 text-[13px] font-bold text-[#334A46] sticky left-0 bg-white z-10">Gross Revenue</td>
                      {historicalRevenue.map((v, i) => (
                        <td key={i} className={`py-2.5 px-3 text-[13px] text-right font-medium text-[#3D4F5F] ${historicalYears[i] === 2019 ? 'bg-[#E2EFDA]/30' : historicalYears[i] === 2018 ? 'bg-[#FFF8E1]/40' : historicalYears[i] <= 2016 ? 'bg-[#FAFAFA]' : ''}`}>{fmt(v)}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-[#334A46]/[.06]">
                      <td className="py-2.5 px-3 text-[13px] font-bold text-[#334A46] sticky left-0 bg-white z-10">Net Profit</td>
                      {historicalNetProfit.map((v, i) => (
                        <td key={i} className={`py-2.5 px-3 text-[13px] text-right font-medium ${v >= 250000 ? 'text-[#2E7D32] font-bold' : 'text-[#3D4F5F]'} ${historicalYears[i] === 2019 ? 'bg-[#E2EFDA]/30' : historicalYears[i] === 2018 ? 'bg-[#FFF8E1]/40' : historicalYears[i] <= 2016 ? 'bg-[#FAFAFA]' : ''}`}>{fmt(v)}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-[#334A46]/[.06]">
                      <td className="py-2.5 px-3 text-[13px] font-bold text-[#334A46] sticky left-0 bg-white z-10">Cash Reserves</td>
                      {historicalCash.map((v, i) => (
                        <td key={i} className={`py-2.5 px-3 text-[13px] text-right font-medium text-[#3D4F5F] ${historicalYears[i] === 2019 ? 'bg-[#E2EFDA]/30' : historicalYears[i] === 2018 ? 'bg-[#FFF8E1]/40' : historicalYears[i] <= 2016 ? 'bg-[#FAFAFA]' : ''}`}>{fmt(v)}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-[#334A46]/[.06] bg-[#FAFAFA]">
                      <td className="py-2.5 px-3 text-[13px] font-bold text-[#334A46] sticky left-0 bg-[#FAFAFA] z-10">Mortgage Balance</td>
                      {historicalMortgage.map((v, i) => (
                        <td key={i} className={`py-2.5 px-3 text-[13px] text-right font-medium text-[#3D4F5F] ${historicalYears[i] === 2019 ? 'bg-[#E2EFDA]/30 font-bold text-[#C62828]' : historicalYears[i] === 2018 ? 'bg-[#FFF8E1]/40' : ''}`}>{fmt(v)}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-[#334A46]/[.06]">
                      <td className="py-2.5 px-3 text-[13px] font-bold text-[#334A46] sticky left-0 bg-white z-10">Distributions</td>
                      {historicalDistributions.map((v, i) => (
                        <td key={i} className={`py-2.5 px-3 text-[13px] text-right font-medium ${v >= 500000 ? 'text-[#2E7D32] font-bold' : 'text-[#3D4F5F]'} ${historicalYears[i] === 2019 ? 'bg-[#E2EFDA]/30' : historicalYears[i] === 2018 ? 'bg-[#FFF8E1]/40' : historicalYears[i] <= 2016 ? 'bg-[#FAFAFA]' : ''}`}>{fmt(v)}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-[13px] font-bold text-[#334A46] sticky left-0 bg-white z-10">Repairs & Maint.</td>
                      {historicalMR.map((v, i) => (
                        <td key={i} className={`py-2.5 px-3 text-[13px] text-right font-medium ${v >= 150000 ? 'text-[#C62828] font-bold' : 'text-[#3D4F5F]'} ${historicalYears[i] === 2019 ? 'bg-[#E2EFDA]/30' : historicalYears[i] === 2018 ? 'bg-[#FFF8E1]/40' : historicalYears[i] <= 2016 ? 'bg-[#FAFAFA]' : ''}`}>{fmt(v)}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Refi event callout */}
              <div className="bg-[#334A46] rounded-2xl p-6 text-white">
                <div className="text-[12px] font-bold uppercase tracking-[.12em] text-[#FFFFFF] mb-3">2018 Refinancing Event</div>
                <div className="space-y-2 text-[14px] leading-relaxed">
                  <div className="flex justify-between"><span className="opacity-70">Old mortgage</span><span className="font-bold">{fmt(lastRefi.preRefiMortgage)}</span></div>
                  <div className="flex justify-between"><span className="opacity-70">New mortgage</span><span className="font-bold">{fmt(lastRefi.postRefiMortgage)}</span></div>
                  <div className="flex justify-between border-t border-white/20 pt-2"><span className="opacity-70">Cash-out proceeds</span><span className="font-bold text-[#FFFFFF]">{fmt(lastRefi.cashOutProceeds)}</span></div>
                  <div className="flex justify-between"><span className="opacity-70">Est. revenue at refi</span><span className="font-bold">~{fmt(lastRefi.estimatedRevenueAtRefi)}</span></div>
                  <div className="flex justify-between"><span className="opacity-70">Est. NOI at refi</span><span className="font-bold">~{fmt(lastRefi.estimatedNOIAtRefi)}</span></div>
                  <div className="flex justify-between"><span className="opacity-70">Structure</span><span className="font-bold">Floating + IR Swap</span></div>
                  <div className="flex justify-between"><span className="opacity-70">Long-term leases</span><span className="font-bold text-[#FFC107]">~10yr (winding down)</span></div>
                </div>
              </div>

              {/* Key observations */}
              <div className="bg-[#FAFAFA] rounded-2xl p-6 border border-[#334A46]/[.06]">
                <div className="text-[12px] font-bold uppercase tracking-[.08em] text-[#334A46]/50 mb-3">Key Observations</div>
                <div className="space-y-3 text-[14px] text-[#3D4F5F] leading-relaxed">
                  <p><span className="font-bold text-[#334A46]">Revenue growth:</span> $702K to $880K over 10 years (+25%), averaging ~2.5% annually through all market conditions.</p>
                  <p><span className="font-bold text-[#334A46]">COVID resilience:</span> Revenue dipped only 3% in 2021&ndash;2022 before recovering, demonstrating tenant stability.</p>
                  <p><span className="font-bold text-[#334A46]">R&amp;M volatility:</span> Swings from $44K to $203K year-to-year confirm aging HVAC and mechanical systems. This is the strongest argument for a planned capital program.</p>
                  <p><span className="font-bold text-[#334A46]">2019 mega-distribution:</span> The $750K payout was funded by refi cash-out proceeds, not operations. Sustainable distributions have been $200&ndash;$280K.</p>
                </div>
              </div>
            </div>

            {/* 2018→2019 Refi Cash Waterfall */}
            <div className="bg-white rounded-2xl border border-[#B26A00]/20 p-6 mb-6">
              <div className="text-[12px] font-bold uppercase tracking-[.08em] text-[#B26A00] mb-3">Where Did the Refi Cash Go? (2018 &rarr; 2019)</div>
              <p className="text-[13px] text-[#3D4F5F] leading-relaxed mb-4">
                Cash reserves rose only $802K despite a $1.67M net cash-out because proceeds were immediately deployed:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-[#E2EFDA]/40 rounded-xl p-3 text-center">
                  <div className="text-[18px] font-extrabold text-[#2E7D32]">+$1,673K</div>
                  <div className="text-[10px] font-bold uppercase text-[#2E7D32]/60 mt-1">Net Refi Proceeds</div>
                </div>
                <div className="bg-[#FFF8E1] rounded-xl p-3 text-center">
                  <div className="text-[18px] font-extrabold text-[#B26A00]">&minus;$750K</div>
                  <div className="text-[10px] font-bold uppercase text-[#B26A00]/60 mt-1">Partner Distribution</div>
                  <div className="text-[10px] text-[#B26A00]/50 mt-0.5">45% of proceeds</div>
                </div>
                <div className="bg-[#FFF8E1] rounded-xl p-3 text-center">
                  <div className="text-[18px] font-extrabold text-[#B26A00]">&minus;$147K</div>
                  <div className="text-[10px] font-bold uppercase text-[#B26A00]/60 mt-1">Outside Investments</div>
                  <div className="text-[10px] text-[#B26A00]/50 mt-0.5">Partnerships</div>
                </div>
                <div className="bg-[#FFF8E1] rounded-xl p-3 text-center">
                  <div className="text-[18px] font-extrabold text-[#B26A00]">&minus;$78K</div>
                  <div className="text-[10px] font-bold uppercase text-[#B26A00]/60 mt-1">Cap. Improvements</div>
                  <div className="text-[10px] text-[#B26A00]/50 mt-0.5">+ Closing costs</div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[13px]">
                <span className="text-[#3D4F5F]">Net cash change:</span>
                <span className="font-bold text-[#334A46]">$1,419K &rarr; $2,221K</span>
                <span className="text-[#2E7D32] font-bold">(+$802K retained)</span>
              </div>
            </div>

            {/* Revenue growth chart - simple bar visualization */}
            <div className="bg-white rounded-2xl border border-[#334A46]/[.08] p-6">
              <div className="text-[12px] font-bold uppercase tracking-[.08em] text-[#334A46]/50 mb-4">Revenue Growth Trajectory</div>
              <div className="flex items-end gap-2 h-40">
                {historicalRevenue.map((v, i) => {
                  const maxRev = Math.max(...historicalRevenue);
                  const minRev = 600000;
                  const heightPct = ((v - minRev) / (maxRev - minRev)) * 100;
                  const isRefiYear = historicalYears[i] === 2019;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="text-[10px] font-bold text-[#334A46]/60">{Math.round(v / 1000)}K</div>
                      <div
                        className={`w-full rounded-t-lg transition-all ${isRefiYear ? 'bg-[#2E7D32]' : historicalYears[i] === 2018 ? 'bg-[#B26A00]' : historicalYears[i] <= 2016 ? 'bg-[#334A46]/30' : 'bg-[#334A46]'}`}
                        style={{ height: `${heightPct}%`, minHeight: '8px' }}
                      />
                      <div className={`text-[10px] font-semibold ${isRefiYear ? 'text-[#2E7D32]' : 'text-[#334A46]/50'}`}>
                        {String(historicalYears[i]).slice(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Section>

          {/* ── REVENUE (3-YEAR) ── */}
          <Section id="revenue">
            <SectionLabel>Three-Year Income Statement</SectionLabel>
            <h2 className="text-[1.5rem] font-extrabold text-[#334A46] mb-6">Revenue</h2>

            <div className="bg-white rounded-2xl border border-[#334A46]/[.08] overflow-hidden">
              <Table
                headers={['', '2023', '2024', '2025', '3-Yr \u0394']}
                rows={[
                  ...([
                    ['Base Rents', income.baseRents],
                    ['Escalators', income.escalators],
                    ['Other Income - Easement', income.otherIncome],
                    ['Electric Income', income.electricInc],
                    ['Interest Income', income.interestInc],
                  ] as [string, number[]][]).map(([label, vals]) => [
                    label,
                    fmt(vals[0]),
                    fmt(vals[1]),
                    fmt(vals[2]),
                    <DeltaCell key={label} value={delta(vals[2], vals[0])} />,
                  ]),
                ]}
              />
              <table className="w-full">
                <tbody>
                  <SummaryRow highlight cells={[
                    'TOTAL INCOME',
                    fmt(totalIncome[0]),
                    fmt(totalIncome[1]),
                    fmt(totalIncome[2]),
                    <DeltaCell key="ti" value={delta(totalIncome[2], totalIncome[0])} />,
                  ]} />
                </tbody>
              </table>
            </div>
          </Section>

          {/* ── EXPENSES (3-YEAR) ── */}
          <Section id="expenses">
            <h2 className="text-[1.5rem] font-extrabold text-[#334A46] mb-6">Expenses</h2>

            <div className="bg-white rounded-2xl border border-[#334A46]/[.08] overflow-hidden">
              {/* Summary row always visible */}
              <table className="w-full">
                <tbody>
                  <SummaryRow highlight cells={[
                    'TOTAL EXPENSES',
                    fmt(totalExpenses[0]),
                    fmt(totalExpenses[1]),
                    fmt(totalExpenses[2]),
                    <DeltaCell key="te" value={delta(totalExpenses[2], totalExpenses[0])} invert />,
                  ]} />
                </tbody>
              </table>

              {/* Expand/collapse toggle */}
              <div className="border-t border-[#334A46]/[.06]">
                <button
                  onClick={() => setShowExpenseDetail(!showExpenseDetail)}
                  className="w-full px-4 py-2.5 text-[13px] font-semibold text-[#334A46]/50 hover:text-[#334A46]/80 hover:bg-[#334A46]/[.02] transition-colors flex items-center justify-center gap-2"
                >
                  {showExpenseDetail ? 'Hide' : 'Show'} {expenseRows.length} line items
                  <span className={`transition-transform ${showExpenseDetail ? 'rotate-180' : ''}`}>&#9662;</span>
                </button>
              </div>

              {/* Detailed line items (collapsible) */}
              {showExpenseDetail && (
                <div className="border-t border-[#334A46]/[.06]">
                  <Table
                    compact
                    headers={['', '2023', '2024', '2025', '3-Yr \u0394']}
                    rows={expenseRows.map(([label, vals]) => [
                      label,
                      fmt(vals[0]),
                      fmt(vals[1]),
                      fmt(vals[2]),
                      <DeltaCell key={label} value={vals[0] === 0 ? null : delta(vals[2], vals[0])} invert />,
                    ])}
                  />
                </div>
              )}
            </div>
          </Section>

          {/* ── PROFITABILITY SUMMARY ── */}
          <Section id="profitability">
            <h2 className="text-[1.5rem] font-extrabold text-[#334A46] mb-6">Profitability Summary</h2>

            <div className="bg-white rounded-2xl border border-[#334A46]/[.08] overflow-hidden">
              <Table
                headers={['', '2023', '2024', '2025', '3-Yr \u0394']}
                rows={[
                  [
                    <span key="op" className="font-bold text-[#334A46]">Operating Profit</span>,
                    fmt(operatingProfit[0]),
                    fmt(operatingProfit[1]),
                    fmt(operatingProfit[2]),
                    <DeltaCell key="opd" value={delta(operatingProfit[2], operatingProfit[0])} />,
                  ],
                  [
                    <span key="om" className="font-bold text-[#334A46]">Operating Margin</span>,
                    pct(operatingProfit[0] / totalIncome[0]),
                    pct(operatingProfit[1] / totalIncome[1]),
                    pct(operatingProfit[2] / totalIncome[2]),
                    <span key="omd" className="text-[#666]">&mdash;</span>,
                  ],
                  [
                    <span key="np" className="font-bold text-[#334A46]">Net Profit</span>,
                    fmt(netProfit[0]),
                    fmt(netProfit[1]),
                    fmt(netProfit[2]),
                    <DeltaCell key="npd" value={delta(netProfit[2], netProfit[0])} />,
                  ],
                  [
                    <span key="nm" className="font-bold text-[#334A46]">Net Margin</span>,
                    pct(netProfit[0] / totalIncome[0]),
                    pct(netProfit[1] / totalIncome[1]),
                    pct(netProfit[2] / totalIncome[2]),
                    <span key="nmd" className="text-[#666]">&mdash;</span>,
                  ],
                  [
                    <span key="opx" className="font-bold text-[#334A46]">Cash OpEx Ratio</span>,
                    ...years.map((_, i) => {
                      const cashOpEx = totalExpenses[i] - expenses.depreciation[i] - expenses.amortization[i] - expenses.mortgageInt[i] - expenses.swapPayment[i];
                      return pct(cashOpEx / totalIncome[i]);
                    }),
                    <span key="opxd" className="text-[#666]">&mdash;</span>,
                  ],
                  [
                    <span key="noi" className="font-bold text-[#334A46]">Net Operating Income</span>,
                    ...years.map((_, i) => {
                      const cashOpEx = totalExpenses[i] - expenses.depreciation[i] - expenses.amortization[i] - expenses.mortgageInt[i] - expenses.swapPayment[i];
                      return fmt(totalIncome[i] - cashOpEx);
                    }),
                    <DeltaCell key="noid" value={(() => {
                      const noi0 = totalIncome[0] - (totalExpenses[0] - expenses.depreciation[0] - expenses.amortization[0] - expenses.mortgageInt[0] - expenses.swapPayment[0]);
                      const noi2 = totalIncome[2] - (totalExpenses[2] - expenses.depreciation[2] - expenses.amortization[2] - expenses.mortgageInt[2] - expenses.swapPayment[2]);
                      return delta(noi2, noi0);
                    })()} />,
                  ],
                  [
                    <span key="dscr" className="font-bold text-[#334A46]">Debt Service Coverage</span>,
                    ...years.map((_, i) => {
                      const cashOpEx = totalExpenses[i] - expenses.depreciation[i] - expenses.amortization[i] - expenses.mortgageInt[i] - expenses.swapPayment[i];
                      const noi = totalIncome[i] - cashOpEx;
                      const ds = expenses.mortgageInt[i] + principalPaid[i] + expenses.swapPayment[i];
                      const dscr = noi / ds;
                      return <span key={`dscr${i}`} className={dscr >= 1.5 ? 'text-[#2E7D32] font-bold' : dscr >= 1.25 ? 'text-[#F57F17] font-bold' : 'text-[#C62828] font-bold'}>{dscr.toFixed(2)}x</span>;
                    }),
                    <span key="dscrd" className="text-[#666]">&mdash;</span>,
                  ],
                ]}
              />
            </div>
          </Section>

          {/* ── BALANCE SHEET ── */}
          <Section id="balance-sheet">
            <SectionLabel>Three-Year Balance Sheet Trends</SectionLabel>
            <h2 className="text-[1.5rem] font-extrabold text-[#334A46] mb-6">Balance Sheet</h2>

            <div className="bg-white rounded-2xl border border-[#334A46]/[.08] overflow-hidden mb-6">
              <Table
                headers={['', '2023', '2024', '2025', '3-Yr \u0394']}
                rows={([
                  ['Cash on Hand', cashOnHand],
                  ['Total Assets', totalAssets],
                  ['Mortgage Balance', mortgage],
                  ['Total Liabilities', totalLiabilities],
                  ['Total Capital (Equity)', totalCapital],
                  ['Net Profit', netProfit],
                ] as [string, number[]][]).map(([label, vals]) => [
                  <span key={label} className="font-bold text-[#334A46]">{label}</span>,
                  fmt(vals[0]),
                  fmt(vals[1]),
                  fmt(vals[2]),
                  <DeltaCell key={label + 'd'} value={delta(vals[2], vals[0])} />,
                ])}
              />
            </div>

            <div className="bg-[#FAFAFA] rounded-2xl p-6 border border-[#334A46]/[.06] space-y-3 text-[14px] text-[#3D4F5F] leading-relaxed">
              <p><span className="font-bold text-[#334A46]">Cash Reserves:</span> $1.58M in liquid reserves, down modestly from $1.71M in 2023. The position remains strong for a property of this size.</p>
              <p><span className="font-bold text-[#334A46]">Mortgage Paydown:</span> BMT/WSFS mortgage has declined from $4.06M to $3.87M through regular amortization. The balance at 2029 refinancing should be approximately $3.6&ndash;$3.7M.</p>
              <p><span className="font-bold text-[#334A46]">Depreciation Status:</span> Accumulated building depreciation ($3.95M) now exceeds original cost basis ($3.87M). Property is fully depreciated for tax purposes. New capital improvements will generate fresh depreciation.</p>
              <p><span className="font-bold text-[#334A46]">Negative Capital:</span> Total capital at ($759K) is common in mature real estate partnerships where cumulative distributions exceed contributed capital. Not a sign of distress.</p>
            </div>
          </Section>

          {/* ── CASH FLOW ANALYSIS ── */}
          <Section id="cash-flow">
            <SectionLabel>Cash Flow Analysis</SectionLabel>
            <h2 className="text-[1.5rem] font-extrabold text-[#334A46] mb-4">Where the Money Goes</h2>
            <p className="text-[14px] text-[#3D4F5F] leading-relaxed mb-6">
              Net profit includes non-cash charges (depreciation and amortization) that reduce taxable income but don't leave the bank account.
              Conversely, mortgage principal payments are a real cash outflow not on the P&amp;L.
            </p>

            <h3 className="text-[1.1rem] font-bold text-[#334A46] mb-4">Cash Generated from Operations</h3>
            <div className="bg-white rounded-2xl border border-[#334A46]/[.08] overflow-hidden mb-8">
              <Table
                headers={['', '2023', '2024', '2025', 'Avg.']}
                rows={[
                  ['Net Profit', fmt(netProfit[0]), fmt(netProfit[1]), fmt(netProfit[2]), fmt(Math.round((netProfit[0] + netProfit[1] + netProfit[2]) / 3))],
                  ['+ Depreciation (non-cash)', fmt(deprec[0]), fmt(deprec[1]), fmt(deprec[2]), fmt(Math.round((deprec[0] + deprec[1] + deprec[2]) / 3))],
                  ['+ Amortization (non-cash)', fmt(amort[0]), fmt(amort[1]), fmt(amort[2]), fmt(Math.round((amort[0] + amort[1] + amort[2]) / 3))],
                ]}
              />
              <table className="w-full">
                <tbody>
                  <SummaryRow highlight cells={[
                    'Cash from Operations',
                    fmt(cashFromOps[0]),
                    fmt(cashFromOps[1]),
                    fmt(cashFromOps[2]),
                    fmt(Math.round((cashFromOps[0] + cashFromOps[1] + cashFromOps[2]) / 3)),
                  ]} />
                </tbody>
              </table>
              <Table
                rows={[
                  ['- Mortgage Principal Paid', fmt(-principalPaid[0]), fmt(-principalPaid[1]), fmt(-principalPaid[2]), fmt(-Math.round((principalPaid[0] + principalPaid[1] + principalPaid[2]) / 3))],
                ]}
                headers={[]}
              />
              <table className="w-full">
                <tbody>
                  <SummaryRow highlight cells={[
                    'Cash Available Before Distributions',
                    fmt(cashBeforeDist[0]),
                    fmt(cashBeforeDist[1]),
                    fmt(cashBeforeDist[2]),
                    fmt(Math.round((cashBeforeDist[0] + cashBeforeDist[1] + cashBeforeDist[2]) / 3)),
                  ]} />
                </tbody>
              </table>
            </div>

            <h3 className="text-[1.1rem] font-bold text-[#334A46] mb-4">Distribution & Cash Retention</h3>
            <div className="bg-white rounded-2xl border border-[#334A46]/[.08] overflow-hidden mb-6">
              {(() => {
                const cbd = [287000, 261000, 291000];
                const dists = [280000, 280000, 280000];
                const netRetained = years.map((_, i) => cbd[i] - dists[i]);
                const otherOutflows = [0, 0, 96000];
                const netCashChange = years.map((_, i) => netRetained[i] - otherOutflows[i]);
                return (
                  <Table
                    headers={['', '2023', '2024', '2025', 'Avg.']}
                    rows={[
                      [<span key="cbd" className="font-bold">Cash Available</span>, fmt(cbd[0]), fmt(cbd[1]), fmt(cbd[2]), fmt(Math.round((cbd[0] + cbd[1] + cbd[2]) / 3))],
                      ['- Partner Distributions', fmt(-dists[0]), fmt(-dists[1]), fmt(-dists[2]), fmt(-Math.round((dists[0] + dists[1] + dists[2]) / 3))],
                      [<span key="nr" className="font-bold">Net Cash Retained</span>, fmt(netRetained[0]), fmt(netRetained[1]), fmt(netRetained[2]), fmt(Math.round((netRetained[0] + netRetained[1] + netRetained[2]) / 3))],
                      ['- Investments & Capex', otherOutflows[0] ? fmt(-otherOutflows[0]) : '\u2014', otherOutflows[1] ? fmt(-otherOutflows[1]) : '\u2014', fmt(-otherOutflows[2]), '\u2014'],
                      [<span key="ncc" className="font-bold">Net Cash Change</span>, fmt(netCashChange[0]), fmt(netCashChange[1]), fmt(netCashChange[2]), fmt(Math.round((netCashChange[0] + netCashChange[1] + netCashChange[2]) / 3))],
                    ]}
                  />
                );
              })()}
            </div>

            <div className="bg-[#FAFAFA] rounded-2xl p-6 border border-[#334A46]/[.06] text-[14px] text-[#3D4F5F] leading-relaxed">
              <p className="mb-2"><span className="font-bold text-[#334A46]">Key insight:</span> The property's operating cash flow fully supports the current $280K annual distribution level. Cash reserves decline only when the partnership makes discretionary investments beyond normal operations.</p>
              <p>The 2025 cash decline of $101K is attributable to the $80K investment in Nassau 211-213 LLC and approximately $16K in building improvements.</p>
            </div>
          </Section>

          {/* ── RENT ROLL & TENANT ANALYSIS ── */}
          <Section id="rent-roll">
            <SectionLabel>Rent Roll & Tenant Analysis</SectionLabel>
            <h2 className="text-[1.5rem] font-extrabold text-[#334A46] mb-4">2025 Rent Roll</h2>
            <p className="text-[14px] text-[#3D4F5F] leading-relaxed mb-6">
              Property address: 92 &amp; 98 Nassau Street, Princeton, NJ. Total leasable area: 17,440 sq ft across
              five commercial tenants, plus a month-to-month easement. Hamilton Jewelers is the anchor tenant,
              occupying 63% of the space and generating 64% of revenue.
            </p>

            <div className="bg-white rounded-2xl border border-[#334A46]/[.08] overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr>
                      {['Tenant', 'Floor', 'Sq Ft', '2025 Rent', '$/SF/yr', '% Revenue', 'Lease Expires'].map((h) => (
                        <th key={h} className="py-3 px-3 text-[11px] font-bold uppercase tracking-[.08em] text-[#334A46]/50 border-b border-[#334A46]/10">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rentRollTenants.map((t) => (
                      <tr key={t.name} className="border-b border-[#334A46]/[.06] hover:bg-[#334A46]/[.02]">
                        <td className="py-2.5 px-3 text-[13px] font-bold text-[#334A46]">{t.name}</td>
                        <td className="py-2.5 px-3 text-[13px] text-[#3D4F5F]">{t.floor}</td>
                        <td className="py-2.5 px-3 text-[13px] text-[#3D4F5F] text-right">{t.sqft.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-[13px] text-right font-bold text-[#334A46]">{fmt(t.total2025)}</td>
                        <td className="py-2.5 px-3 text-[13px] text-right text-[#3D4F5F]">${(t.total2025 / t.sqft).toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-[13px] text-right text-[#3D4F5F]">{t.pctRevenue.toFixed(1)}%</td>
                        <td className="py-2.5 px-3 text-[13px] text-right font-medium text-[#C62828]">{t.expires}</td>
                      </tr>
                    ))}
                    {/* Easement */}
                    <tr className="border-b border-[#334A46]/[.06]">
                      <td className="py-2.5 px-3 text-[13px] text-[#3D4F5F]">ML7 Witherspoon (Easement)</td>
                      <td className="py-2.5 px-3 text-[13px] text-[#666]">&mdash;</td>
                      <td className="py-2.5 px-3 text-[13px] text-[#666] text-right">&mdash;</td>
                      <td className="py-2.5 px-3 text-[13px] text-right text-[#3D4F5F]">{fmt(6600)}</td>
                      <td className="py-2.5 px-3 text-[13px] text-[#666] text-right">&mdash;</td>
                      <td className="py-2.5 px-3 text-[13px] text-right text-[#3D4F5F]">0.8%</td>
                      <td className="py-2.5 px-3 text-[13px] text-right text-[#666]">Mo-to-Mo</td>
                    </tr>
                    {/* Total */}
                    <tr className="bg-[#E2EFDA]/40">
                      <td className="py-3 px-3 text-[13px] font-bold text-[#334A46]">TOTAL</td>
                      <td className="py-3 px-3 text-[13px] text-[#3D4F5F]"></td>
                      <td className="py-3 px-3 text-[13px] text-right font-bold text-[#334A46]">{totalRentRollSqft.toLocaleString()}</td>
                      <td className="py-3 px-3 text-[13px] text-right font-bold text-[#334A46]">{fmt(totalRentRollRevenue)}</td>
                      <td className="py-3 px-3 text-[13px] text-right font-bold text-[#334A46]">${(totalRentRollRevenue / totalRentRollSqft).toFixed(2)}</td>
                      <td className="py-3 px-3 text-[13px] text-right font-bold text-[#334A46]">100%</td>
                      <td className="py-3 px-3 text-[13px]"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Lease renewal timeline */}
            <h3 className="text-[1.1rem] font-bold text-[#334A46] mb-4">Lease Renewal Timeline</h3>
            <p className="text-[14px] text-[#3D4F5F] leading-relaxed mb-4">
              All leases were originally signed around 2017, coinciding with the last refinancing.
              All five tenants are assumed to renew &mdash; Hamilton Jewelers on a 10-year term, the remaining four on 5-year terms &mdash; all with 3% annual escalators.
            </p>

            <div className="space-y-3 mb-6">
              {[
                { tenant: 'GHO Ventures', expires: 'Jun 2026', pct: 6.7, months: 4 },
                { tenant: 'Rita Allen Foundation', expires: 'Aug 2026', pct: 11.8, months: 6 },
                { tenant: 'J Kerney Kuser', expires: 'Dec 2026', pct: 7.1, months: 10 },
                { tenant: 'Mercator Management', expires: 'Jan 2027', pct: 9.4, months: 11 },
                { tenant: 'Hamilton Jewelers', expires: 'Feb 2027', pct: 64.3, months: 12 },
              ].map((t) => (
                <div key={t.tenant} className="flex items-center gap-4">
                  <div className="w-44 text-[13px] font-medium text-[#3D4F5F] shrink-0">{t.tenant}</div>
                  <div className="flex-1 h-8 bg-[#334A46]/[.06] rounded-lg overflow-hidden relative">
                    <div
                      className="h-full bg-[#334A46] rounded-lg flex items-center px-3"
                      style={{ width: `${(t.months / 12) * 100}%` }}
                    >
                      <span className="text-[11px] font-bold text-white whitespace-nowrap">{t.expires}</span>
                    </div>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#334A46]/40">
                      {t.pct}% of revenue
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-[#FAFAFA] rounded-2xl p-6 border border-[#334A46]/[.06] space-y-3 text-[14px] text-[#3D4F5F] leading-relaxed">
              <p><span className="font-bold text-[#334A46]">Concentration risk:</span> Hamilton Jewelers represents 64% of revenue. However, Hamilton is a Princeton institution (est. 1912), the premier jeweler in the market, and has occupied this space for decades. Their renewal is effectively certain.</p>
              <p><span className="font-bold text-[#334A46]">Renewal impact on 2029 refi:</span> If all tenants renew in 2026&ndash;2027, the lender in 2029 will see Hamilton locked in for 8+ more years and the other four tenants with 3&ndash;4 years remaining &mdash; all with contractual 3% annual escalators. This significantly de-risks the loan underwriting.</p>
              <p><span className="font-bold text-[#334A46]">Escalator structure:</span> Hamilton currently pays $139,911/yr in escalations on top of base rent. The new leases will formalize 3% annual increases for all tenants, replacing the current mixed escalation structure.</p>
            </div>
          </Section>

          {/* ── CASH RESERVE OPTIMIZATION ── */}
          <Section id="cash-optimization">
            <SectionLabel>Cash Reserve Strategy</SectionLabel>
            <h2 className="text-[1.5rem] font-extrabold text-[#334A46] mb-4">Treasury Optimization</h2>
            <p className="text-[14px] text-[#3D4F5F] leading-relaxed mb-6">
              The partnership currently holds <span className="font-bold text-[#334A46]">{fmt(cashInChecking)}</span> entirely
              in a non-interest-bearing checking account, earning a negligible yield of approximately {(currentYield * 100).toFixed(2)}%.
              A prudent cash management strategy would retain a 6-month operating reserve in liquid accounts and invest the
              balance in high-yield savings or short-term instruments.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Stat value={fmt(cashInChecking)} label="Current Cash (Checking)" />
              <Stat value={fmt(conservativeReserve)} label="Conservative Reserve" />
              <Stat value={fmt(investableAmount)} label="Investable Surplus" accent />
              <Stat value={`${(currentYield * 100).toFixed(2)}%`} label="Current Yield" />
            </div>

            <h3 className="text-[1.1rem] font-bold text-[#334A46] mb-4">Reserve Allocation Rationale</h3>
            <div className="bg-white rounded-2xl border border-[#334A46]/[.08] overflow-hidden mb-8">
              <Table
                headers={['Component', 'Monthly', '6-Month Reserve', 'Notes']}
                rows={[
                  ['Operating Expenses', fmt(avgMonthlyExpenses), fmt(avgMonthlyExpenses * 6), '3-yr avg: ~$515K/yr'],
                  ['Mortgage Payment', fmt(avgMonthlyMortgage), fmt(avgMonthlyMortgage * 6), 'P&I combined'],
                  [<span key="sub" className="font-bold text-[#334A46]">Subtotal (6-Month)</span>, fmt(avgMonthlyExpenses + avgMonthlyMortgage), <span key="subv" className="font-bold">{fmt(sixMonthReserve)}</span>, ''],
                  ['Emergency Cushion', '', fmt(conservativeReserve - sixMonthReserve), 'Round up + contingency'],
                  [<span key="tot" className="font-bold text-[#334A46]">Conservative Reserve</span>, '', <span key="totv" className="font-bold">{fmt(conservativeReserve)}</span>, 'Recommended minimum'],
                ]}
              />
            </div>

            <h3 className="text-[1.1rem] font-bold text-[#334A46] mb-4">Projected Investment Returns on Surplus</h3>
            <div className="bg-white rounded-2xl border border-[#334A46]/[.08] overflow-hidden mb-6">
              {(() => {
                const yields = [0.04, 0.045, 0.05, 0.055, 0.06];
                const amounts = [900000, 1000000, 1075000];
                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr>
                          <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-[.08em] text-[#334A46]/50 border-b border-[#334A46]/10">Yield</th>
                          {amounts.map((a) => (
                            <th key={a} className="py-3 px-4 text-[11px] font-bold uppercase tracking-[.08em] text-[#334A46]/50 border-b border-[#334A46]/10 text-right">{fmt(a)} Invested</th>
                          ))}
                          <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-[.08em] text-[#334A46]/50 border-b border-[#334A46]/10 text-right">4-Yr Total (at $1.075M)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {yields.map((y) => (
                          <tr key={y} className="border-b border-[#334A46]/[.06] hover:bg-[#334A46]/[.02]">
                            <td className="py-2.5 px-4 text-[13px] font-bold text-[#334A46]">{(y * 100).toFixed(1)}%</td>
                            {amounts.map((a) => (
                              <td key={a} className="py-2.5 px-4 text-[13px] text-right font-medium text-[#2E7D32]">{fmt(Math.round(a * y))}/yr</td>
                            ))}
                            <td className="py-2.5 px-4 text-[13px] text-right font-bold text-[#2E7D32]">{fmt(Math.round(1075000 * y * 4))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#334A46] rounded-2xl p-6 text-white">
                <div className="text-[12px] font-bold uppercase tracking-[.12em] text-[#FFFFFF] mb-3">Opportunity Cost</div>
                <div className="space-y-3 text-[14px] leading-relaxed">
                  <p className="opacity-90">
                    At a conservative <span className="font-bold text-[#FFFFFF]">5% yield</span> on <span className="font-bold text-[#FFFFFF]">{fmt(investableAmount)}</span> in
                    invested reserves, the partnership would earn approximately <span className="font-bold text-[#FFFFFF]">{fmt(Math.round(investableAmount * 0.05))}/year</span>.
                  </p>
                  <p className="opacity-90">
                    Over <span className="font-bold text-white">4 years to the 2029 refinancing</span>, this represents <span className="font-bold text-[#FFFFFF]">{fmt(Math.round(investableAmount * 0.05 * 4))}</span> in
                    foregone investment income &mdash; enough to fund a significant portion of the capital improvement program.
                  </p>
                  <p className="opacity-70 text-[13px]">
                    Current interest income: {fmt(currentInterestIncome)}/yr ({(currentYield * 100).toFixed(2)}% effective yield on {fmt(cashInChecking)}).
                  </p>
                </div>
              </div>

              <div className="bg-[#FAFAFA] rounded-2xl p-6 border border-[#334A46]/[.06]">
                <div className="text-[12px] font-bold uppercase tracking-[.08em] text-[#334A46]/50 mb-3">Investment Options</div>
                <div className="space-y-3 text-[14px] text-[#3D4F5F] leading-relaxed">
                  <p><span className="font-bold text-[#334A46]">High-Yield Savings:</span> FDIC-insured, 4.5&ndash;5.0% APY, immediate liquidity. Simplest option with no risk.</p>
                  <p><span className="font-bold text-[#334A46]">Treasury Bills (3&ndash;6 Mo.):</span> 4.5&ndash;5.2% yield, state tax exempt, highly liquid. Ladder maturities for regular cash access.</p>
                  <p><span className="font-bold text-[#334A46]">CD Ladder:</span> 4.5&ndash;5.5% yields, stagger 3/6/12-month terms. Slightly less liquid but modestly higher yields.</p>
                  <p><span className="font-bold text-[#334A46]">Money Market Fund:</span> 4.8&ndash;5.3% yields, daily liquidity, institutional-grade. Best for larger balances.</p>
                </div>
              </div>
            </div>
          </Section>

          {/* ── REVENUE PROJECTIONS 2025-2029 ── */}
          <Section id="revenue-projections">
            <SectionLabel>Revenue Growth Projections</SectionLabel>
            <h2 className="text-[1.5rem] font-extrabold text-[#334A46] mb-4">2025&ndash;2029 Revenue at 3% Growth</h2>
            <p className="text-[14px] text-[#3D4F5F] leading-relaxed mb-6">
              With all leases assumed renewing (Hamilton 10yr, others 5yr) at 3% annual increases, consistent with the property's demonstrated growth trajectory.
            </p>

            <div className="bg-white rounded-2xl border border-[#334A46]/[.08] overflow-hidden mb-6">
              <Table
                headers={['Year', 'Projected Revenue', 'YoY Increase', 'Cumulative vs. 2025', 'Growth']}
                rows={revProjection.map((r) => [
                  <span key={r.year} className={`font-bold ${r.isRefi ? 'text-[#2E7D32]' : 'text-[#334A46]'}`}>
                    {r.isBase ? '2025 (Actual)' : r.isRefi ? '2029 (Refi Year)' : String(r.year)}
                  </span>,
                  <span key={r.year + 'r'} className="font-bold">{fmt(r.revenue)}</span>,
                  r.isBase ? <span key="b1" className="text-[#666]">&mdash;</span> : <span key={r.year + 'y'} className="text-[#2E7D32]">+{fmt(r.yoy)}</span>,
                  r.isBase ? <span key="b2" className="text-[#666]">&mdash;</span> : <span key={r.year + 'c'} className="text-[#2E7D32]">+{fmt(r.cumulative)}</span>,
                  r.isBase ? <span key="b3" className="text-[#666]">&mdash;</span> : <span key={r.year + 'g'} className="text-[#2E7D32]">3.0%</span>,
                ])}
              />
            </div>

            <p className="text-[14px] text-[#3D4F5F] leading-relaxed">
              By 2029, projected revenue reaches approximately $990K &mdash; an increase of $110K over 2025.
              With expenses growing at 3%/3.5%, the incremental revenue flows largely to NOI growth.
            </p>
          </Section>

          {/* ── PROJECTED CASH BALANCE ── */}
          <Section id="cash-balance">
            <h2 className="text-[1.5rem] font-extrabold text-[#334A46] mb-4">Projected Cash Balance Through 2029</h2>
            <p className="text-[14px] text-[#3D4F5F] leading-relaxed mb-6">
              Since distributions approximately equal cash generated from operations, the cash balance remains essentially flat.
              The only known future impact is the committed $100K investment in Nassau 211-213 LLC in 2026.
            </p>

            <div className="bg-white rounded-2xl border border-[#334A46]/[.08] overflow-hidden mb-6">
              <Table
                headers={['Year', 'Operations Net', 'Nassau 211-213', 'Ending Cash']}
                rows={cashProjection.map((r) => [
                  <span key={r.year} className={`font-bold ${r.isRefi ? 'text-[#2E7D32]' : 'text-[#334A46]'}`}>
                    {r.isBase ? '2025 (Actual)' : r.isRefi ? '2029 (Pre-Refi)' : String(r.year)}
                  </span>,
                  <span key={r.year + 'o'} className="text-[#666] italic">{'\u2248'} Breakeven</span>,
                  r.nassau < 0 ? <span key={r.year + 'n'} className="text-[#C62828]">{fmt(r.nassau)}</span> : <span key={r.year + 'n'} className="text-[#666]">&mdash;</span>,
                  <span key={r.year + 'e'} className="font-bold">{fmt(r.ending)}</span>,
                ])}
              />
            </div>

            <p className="text-[14px] text-[#3D4F5F] leading-relaxed">
              The partnership is projected to hold approximately <span className="font-bold text-[#334A46]">$1,475,000</span> in cash reserves at the time of the 2029 refinancing.
              This cash is unaffected by the refinancing transaction.
            </p>
          </Section>

          {/* ── PARTNER DISTRIBUTIONS ── */}
          <Section id="distributions">
            <SectionLabel>Maximized Partner Distributions</SectionLabel>
            <h2 className="text-[1.5rem] font-extrabold text-[#334A46] mb-4">Distribution Projections Through 2029</h2>

            <div className="bg-white rounded-2xl border border-[#334A46]/[.08] overflow-hidden mb-6">
              {(() => {
                let cum60 = 0;
                return (
                  <Table
                    headers={['Year', 'Total Distributed', '60% Share', '20% Share (each)', 'Cumulative (60%)']}
                    rows={[
                      ...distProjection.map((r) => {
                        cum60 += r.share60;
                        return [
                          <span key={r.year} className={`font-bold ${r.isRefi ? 'text-[#2E7D32]' : 'text-[#334A46]'}`}>
                            {r.isBase ? '2025 (Actual)' : r.isRefi ? '2029 (Refi Year)' : String(r.year)}
                          </span>,
                          fmt(r.total),
                          <span key={r.year + '60'} className="font-bold">{fmt(r.share60)}</span>,
                          fmt(Math.round(r.total * 0.2)),
                          fmt(cum60),
                        ];
                      }),
                      // Totals row
                      [
                        <span key="total" className="font-bold text-[#334A46]">5-YEAR TOTAL</span>,
                        <span key="td" className="font-bold">{fmt(distProjection.reduce((s, r) => s + r.total, 0))}</span>,
                        <span key="60d" className="font-bold">{fmt(distProjection.reduce((s, r) => s + r.share60, 0))}</span>,
                        <span key="20d" className="font-bold">{fmt(Math.round(distProjection.reduce((s, r) => s + r.total, 0) * 0.2))}</span>,
                        '',
                      ],
                    ]}
                  />
                );
              })()}
            </div>

            <p className="text-[14px] text-[#3D4F5F] leading-relaxed">
              Over five years, the 60% majority partner is projected to receive <span className="font-bold text-[#334A46]">$933,600</span> in distributions,
              growing from $174,600 in 2025 to $201,000 in 2029.
            </p>
          </Section>

          {/* ── 2029 REFINANCING SCENARIOS ── */}
          <Section id="refinancing">
            <SectionLabel>2029 Refinancing Scenarios</SectionLabel>
            <h2 className="text-[1.5rem] font-extrabold text-[#334A46] mb-4">Refinancing Analysis</h2>
            <p className="text-[14px] text-[#3D4F5F] leading-relaxed mb-6">
              The existing mortgage balance at maturity is estimated at approximately $3,600,000.
              The following analysis models three interest rate scenarios across multiple loan sizes.
            </p>

            <h3 className="text-[1.1rem] font-bold text-[#334A46] mb-4">Rate Scenario Assumptions</h3>
            <div className="bg-white rounded-2xl border border-[#334A46]/[.08] overflow-hidden mb-8">
              <Table
                headers={['Scenario', '10-Yr Treasury', 'Lender Spread', 'All-In Rate']}
                rows={[
                  ['Optimistic', '3.25%', '175 bps', <span key="o" className="font-bold">5.00%</span>],
                  ['Base Case', '3.75%', '200 bps', <span key="b" className="font-bold">5.75%</span>],
                  ['Conservative', '4.25%', '225 bps', <span key="c" className="font-bold">6.50%</span>],
                ]}
              />
            </div>

            <h3 className="text-[1.1rem] font-bold text-[#334A46] mb-4">Cash Position After Refinancing</h3>
            <div className="bg-white rounded-2xl border border-[#334A46]/[.08] overflow-hidden mb-8">
              <Table
                headers={['Loan Amount', 'Pays Off Mortgage', 'New Cash from Refi', '+ Cash in Bank', 'Total Cash']}
                rows={[3600000, 4000000, 5000000, 6000000].map((loan) => {
                  const newCash = loan - 3600000;
                  const total = 1475000 + newCash;
                  return [
                    <span key={loan} className={loan === 5000000 ? 'font-bold text-[#2E7D32]' : ''}>
                      {fmt(loan)}{loan === 3600000 ? ' (Straight Refi)' : ''}
                    </span>,
                    fmt(-3600000),
                    newCash === 0 ? '$0' : fmt(newCash),
                    fmt(1475000),
                    <span key={loan + 't'} className="font-bold">{fmt(total)}</span>,
                  ];
                })}
              />
            </div>

            <h3 className="text-[1.1rem] font-bold text-[#334A46] mb-4">Annual Debt Service & Cash Flow by Scenario</h3>
            <p className="text-[13px] text-[#3D4F5F] mb-4">
              All scenarios assume 25-year amortization and projected 2029 NOI of ~$611K (3% revenue growth, 3% opex / 3.5% tax growth). DSCR above 1.25x is typical lender minimum; above 1.50x is strong.
            </p>
            <div className="bg-white rounded-2xl border border-[#334A46]/[.08] overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr>
                      <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-[.08em] text-[#334A46]/50 border-b border-[#334A46]/10"></th>
                      {loanScenarios.map((s) => (
                        <th key={s.label} className="py-3 px-3 text-[11px] font-bold uppercase tracking-[.08em] text-[#334A46]/50 border-b border-[#334A46]/10 text-right">{s.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#334A46]/[.06]">
                      <td className="py-3 px-4 text-[13px] font-bold text-[#334A46]">Annual Debt Service</td>
                      {loanScenarios.map((s) => (
                        <td key={s.label + 'ds'} className="py-3 px-3 text-[13px] text-right font-medium text-[#3D4F5F]">{fmt(annualDebtService(s.principal, s.rate))}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-[#334A46]/[.06] bg-[#FAFAFA]">
                      <td className="py-3 px-4 text-[13px] font-bold text-[#334A46]">DSCR</td>
                      {loanScenarios.map((s) => {
                        const dscr = noi2029 / annualDebtService(s.principal, s.rate);
                        return (
                          <td key={s.label + 'dscr'} className={`py-3 px-3 text-[13px] text-right font-bold ${dscr >= 1.5 ? 'text-[#2E7D32]' : dscr >= 1.25 ? 'text-[#F57F17]' : 'text-[#C62828]'}`}>
                            {dscr.toFixed(2)}x
                          </td>
                        );
                      })}
                    </tr>
                    <tr className="border-b border-[#334A46]/[.06] bg-[#E2EFDA]/40">
                      <td className="py-3 px-4 text-[13px] font-bold text-[#334A46]">Free Cash Flow</td>
                      {loanScenarios.map((s) => (
                        <td key={s.label + 'fcf'} className="py-3 px-3 text-[13px] text-right font-bold text-[#334A46]">{fmt(noi2029 - annualDebtService(s.principal, s.rate))}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-[13px] font-bold text-[#334A46]">Total Post-Refi Cash</td>
                      {loanScenarios.map((s) => {
                        const newCash = s.principal <= 3600000 ? 0 : s.principal - 3600000;
                        return (
                          <td key={s.label + 'cash'} className="py-3 px-3 text-[13px] text-right font-bold text-[#334A46]">{fmt(1475000 + newCash)}</td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-[#FAFAFA] rounded-2xl p-6 border border-[#334A46]/[.06] text-[14px] text-[#3D4F5F] leading-relaxed mb-8">
              <p className="mb-2">The straight refinancing at $3.6M is comfortable in every rate scenario, with DSCR above 2.0x across the board.</p>
              <p>The <span className="font-bold text-[#334A46]">$5M cash-out at base case rate</span> produces a strong 1.63x DSCR while generating $1.4M in new proceeds, leaving the partnership with $2.88M in total liquidity.</p>
            </div>

            {/* ── LAST REFI COMPARISON ── */}
            <h3 className="text-[1.1rem] font-bold text-[#334A46] mb-4">2018 vs. 2029: How the Position Has Strengthened</h3>
            <p className="text-[14px] text-[#3D4F5F] leading-relaxed mb-4">
              The partnership refinanced in 2018, taking the mortgage from $2.85M to $4.40M in a cash-out refinancing.
              The 2029 position is fundamentally stronger across every metric that lenders evaluate.
            </p>

            <div className="bg-white rounded-2xl border border-[#334A46]/[.08] overflow-hidden mb-6">
              <Table
                headers={['Metric', '2018 Refinancing', '2029 Projected', 'Improvement']}
                rows={[
                  [
                    <span key="rev" className="font-bold text-[#334A46]">Revenue</span>,
                    '~$770K (est.)',
                    <span key="rev29" className="font-bold">~$990K</span>,
                    <span key="revd" className="text-[#2E7D32] font-bold">+29%</span>,
                  ],
                  [
                    <span key="noi" className="font-bold text-[#334A46]">Net Operating Income</span>,
                    '~$470K (est.)',
                    <span key="noi29" className="font-bold">~$611K</span>,
                    <span key="noid" className="text-[#2E7D32] font-bold">+30%</span>,
                  ],
                  [
                    <span key="mort" className="font-bold text-[#334A46]">Mortgage Being Paid Off</span>,
                    fmt(lastRefi.preRefiMortgage),
                    '~$3,600,000',
                    <span key="mortd" className="text-[#666]">&mdash;</span>,
                  ],
                  [
                    <span key="loan" className="font-bold text-[#334A46]">Cash-Out Achieved</span>,
                    fmt(lastRefi.cashOutProceeds),
                    '$1.4M\u2013$2.4M (target)',
                    <span key="loand" className="text-[#2E7D32] font-bold">Similar or higher</span>,
                  ],
                  [
                    <span key="ltv" className="font-bold text-[#334A46]">Est. LTV (at 7% cap)</span>,
                    '~66%',
                    '57\u201368%',
                    <span key="ltvd" className="text-[#2E7D32] font-bold">Lower (safer)</span>,
                  ],
                  [
                    <span key="lease" className="font-bold text-[#334A46]">Long-Term Leases</span>,
                    <span key="leaseno" className="text-[#F57F17]">~10yr terms (8-9 yrs left)</span>,
                    <span key="leaseyes" className="text-[#2E7D32] font-bold">Fresh 10yr / 3% escalators (7-8 yrs left)</span>,
                    <span key="leased" className="text-[#2E7D32] font-bold">Stronger terms</span>,
                  ],
                  [
                    <span key="rate" className="font-bold text-[#334A46]">Interest Rate Structure</span>,
                    'Floating + IR Swap',
                    'Fixed or floating',
                    <span key="rated" className="text-[#666]">Swap expires</span>,
                  ],
                  [
                    <span key="cash" className="font-bold text-[#334A46]">Cash Reserves</span>,
                    '~$1.2M',
                    '~$1.5M',
                    <span key="cashd" className="text-[#2E7D32] font-bold">+25%</span>,
                  ],
                ]}
              />
            </div>

            <div className="bg-[#334A46] rounded-2xl p-6 text-white">
              <div className="text-[12px] font-bold uppercase tracking-[.12em] text-[#FFFFFF] mb-3">Strategic Advantage</div>
              <div className="space-y-3 text-[14px] leading-relaxed">
                <p className="opacity-90">
                  <span className="font-bold text-white">The lease commitments are the single biggest improvement over the last refi.</span> In 2018,
                  the lender underwrote to trailing revenue with no visibility into future income. In 2029, they'll see
                  Hamilton locked in for 8+ years and all tenants on contractual 3% annual escalators &mdash; significantly
                  de-risking the loan.
                </p>
                <p className="opacity-90">
                  This positions the partnership to push for a larger cash-out (70&ndash;75% LTV vs. the prior 66%), a lower spread,
                  and potentially an interest-only period during the first 2&ndash;3 years of the new loan, which would
                  significantly increase distributable cash flow post-refinancing.
                </p>
                <p className="opacity-70 text-[13px]">
                  <span className="font-bold text-[#FFFFFF]">Note on the swap:</span> The BMT interest rate swap benefited the partnership by an estimated $500K+ in avoided interest
                  during the 2022&ndash;2025 rate spike. However, the swap expires with the current loan. The 2029 refinancing
                  will need to price at prevailing fixed rates, which the scenario analysis above models at 5.00&ndash;6.50%.
                </p>
              </div>
            </div>
          </Section>

          {/* ── 10-YEAR REVENUE & NOI ── */}
          <Section id="ten-year">
            <SectionLabel>10-Year Projections</SectionLabel>
            <h2 className="text-[1.5rem] font-extrabold text-[#334A46] mb-4">Revenue & Net Operating Income</h2>
            <p className="text-[14px] text-[#3D4F5F] leading-relaxed mb-6">
              Revenue grows at 3% annually (lease escalators). Operating expenses grow at 2% (inflation) in
              this base-case view. The interactive Projections tab allows testing higher expense growth (default 3%)
              to stress-test outcomes.
            </p>

            <div className="bg-white rounded-2xl border border-[#334A46]/[.08] overflow-hidden mb-6">
              <Table
                compact
                headers={['Year', 'Projected Revenue', 'Est. Operating Exp.', 'Projected NOI', 'NOI Growth']}
                rows={[
                  // 2025 baseline
                  [
                    <span key="2025" className="font-bold text-[#334A46]">2025 (Actual)</span>,
                    fmt(baseRevenue2025),
                    fmt(cashOpEx2025),
                    <span key="noi25" className="font-bold">{fmt(noi2025)}</span>,
                    <span key="g25" className="text-[#666]">&mdash;</span>,
                  ],
                  ...projYears.map((yr, i) => {
                    const prevNOI = i === 0 ? noi2025 : projNOI[i - 1];
                    const growth = (projNOI[i] - prevNOI) / prevNOI;
                    const isRefi = yr === 2029;
                    return [
                      <span key={yr} className={`font-bold ${isRefi ? 'text-[#2E7D32]' : 'text-[#334A46]'}`}>
                        {isRefi ? `${yr} (Refi Year)` : String(yr)}
                      </span>,
                      fmt(projRevenue[i]),
                      fmt(projCashOpEx[i]),
                      <span key={yr + 'n'} className="font-bold">{fmt(projNOI[i])}</span>,
                      <span key={yr + 'g'} className="text-[#2E7D32]">{pct(growth)}</span>,
                    ];
                  }),
                ]}
              />
            </div>

            <div className="flex items-center gap-4 mb-2">
              <p className="text-[14px] text-[#3D4F5F] leading-relaxed">
                By 2035, revenue is projected at approximately <span className="font-bold text-[#334A46]">$1.18M</span> with NOI of <span className="font-bold text-[#334A46]">~$725K</span>.
                This represents cumulative NOI growth of approximately 33% over the projection period.
              </p>
            </div>
            <button
              onClick={() => { setActiveTab('projections'); window.scrollTo(0, 0); }}
              className="mb-8 px-5 py-2.5 text-[13px] font-semibold text-[#334A46] border border-[#334A46]/[.15] rounded-xl hover:bg-[#334A46]/[.04] transition-colors inline-flex items-center gap-2"
            >
              Adjust assumptions interactively <span className="text-[#334A46]/40">&rarr;</span> Projections Tab
            </button>

            <h3 className="text-[1.1rem] font-bold text-[#334A46] mb-4">Downside Scenarios: 2029 NOI Sensitivity</h3>
            <p className="text-[13px] text-[#3D4F5F] mb-4">
              What happens if revenue growth stalls or a tenant vacates? The table below stress-tests 2029 NOI under adverse conditions,
              alongside the DSCR at a $5M / 5.75% refinancing ({fmt(annualDebtService(5000000, 0.0575))}/yr debt service).
            </p>
            <div className="bg-white rounded-2xl border border-[#334A46]/[.08] overflow-hidden mb-6">
              {(() => {
                const ds5m = annualDebtService(5000000, 0.0575);
                const scenarios = [
                  { label: 'Base Case (3% rev / 3% exp)', noi: projNOI[3] },
                  { label: '2% Revenue Growth', noi: Math.round(879895 * Math.pow(1.02, 4)) - projCashOpEx[3] },
                  { label: '1% Revenue Growth', noi: Math.round(879895 * Math.pow(1.01, 4)) - projCashOpEx[3] },
                  { label: 'Flat Revenue (0%)', noi: 879895 - projCashOpEx[3] },
                  { label: '5% Vacancy (one small tenant lost)', noi: Math.round(projNOI[3] * 0.95) },
                  { label: '10% Vacancy (two tenants lost)', noi: Math.round(projNOI[3] * 0.90) },
                  { label: 'Worst Case: Flat Rev + 5% Vacancy', noi: Math.round((879895 - projCashOpEx[3]) * 0.95) },
                ];
                return (
                  <Table
                    compact
                    headers={['Scenario', '2029 Est. NOI', 'DSCR ($5M)', 'Cushion']}
                    rows={scenarios.map((s) => {
                      const dscr = s.noi / ds5m;
                      return [
                        s.label === 'Base Case (3% rev / 3% exp)' ? <span key={s.label} className="font-bold text-[#334A46]">{s.label}</span> : s.label,
                        fmt(s.noi),
                        <span key={s.label + 'd'} className={`font-bold ${dscr >= 1.5 ? 'text-[#2E7D32]' : dscr >= 1.25 ? 'text-[#F57F17]' : 'text-[#C62828]'}`}>{dscr.toFixed(2)}x</span>,
                        <span key={s.label + 'c'} className={s.noi - ds5m > 0 ? 'text-[#2E7D32]' : 'text-[#C62828]'}>{fmt(s.noi - ds5m)}</span>,
                      ];
                    })}
                  />
                );
              })()}
            </div>
            <div className="bg-[#FAFAFA] rounded-2xl p-5 border border-[#334A46]/[.06] text-[14px] text-[#3D4F5F] leading-relaxed">
              Even in the worst-case scenario (flat revenue + 5% vacancy), DSCR remains well above lender minimums.
              The property&rsquo;s low OpEx ratio and diversified tenant base provide significant downside protection.
            </div>
          </Section>

          {/* ── PROPERTY VALUATION ── */}
          <Section id="valuation">
            <SectionLabel>Property Valuation Analysis</SectionLabel>

            {/* ── Market Valuation ── */}
            <h2 className="text-[1.5rem] font-extrabold text-[#334A46] mb-4">Market Valuation</h2>
            <p className="text-[14px] text-[#3D4F5F] leading-relaxed mb-6">
              Based on comparable sales and the asset&rsquo;s prime Nassau Street location, estimated current market value is
              <span className="font-bold text-[#334A46]"> $10&ndash;$12M</span>.
              Projected forward at 2.5% annual appreciation (conservative, CPI-level).
            </p>

            <div className="bg-white rounded-2xl border border-[#334A46]/[.08] overflow-hidden mb-6">
              {(() => {
                const marketLow = 10000000;
                const marketHigh = 12000000;
                const appRate = 0.025;
                const milestoneYears = [2025, 2027, 2029, 2032, 2035];
                return (
                  <Table
                    headers={['', ...milestoneYears.map(y => String(y))]}
                    rows={[
                      [<span key="low" className="font-bold">Low ($10M)</span>, ...milestoneYears.map(y => {
                        const v = Math.round(marketLow * Math.pow(1 + appRate, y - 2025));
                        return <span key={y} className={y === 2025 ? 'font-bold' : ''}>{fmt(v)}</span>;
                      })],
                      [<span key="high" className="font-bold">High ($12M)</span>, ...milestoneYears.map(y => {
                        const v = Math.round(marketHigh * Math.pow(1 + appRate, y - 2025));
                        return <span key={y} className={y === 2025 ? 'font-bold' : ''}>{fmt(v)}</span>;
                      })],
                    ]}
                  />
                );
              })()}
            </div>

            {/* ── Bank / Refi Valuation ── */}
            <h2 className="text-[1.5rem] font-extrabold text-[#334A46] mb-4 mt-10">Bank Underwriting Valuation</h2>
            <p className="text-[14px] text-[#3D4F5F] leading-relaxed mb-6">
              Banks use the income capitalization approach with conservative cap rates (6&ndash;8%) to determine
              lending value &mdash; typically well below market value. Using projected 2029 NOI for refinancing purposes.
            </p>

            <div className="bg-white rounded-2xl border border-[#334A46]/[.08] overflow-hidden mb-6">
              {(() => {
                const noi29 = projNOI[3]; // 2029
                const estMortgage = 3650000;
                return (
                  <Table
                    headers={['Cap Rate', 'Bank Value', 'Est. Mortgage', 'Total Equity', '60% Share', '20% Share']}
                    rows={capRates.map((cr) => {
                      const val = Math.round(noi29 / cr);
                      const equity = val - estMortgage;
                      return [
                        <span key={cr} className="font-bold">{pct(cr)}</span>,
                        fmt(val),
                        fmt(estMortgage),
                        <span key={cr + 'e'} className="font-bold">{fmt(equity)}</span>,
                        fmt(Math.round(equity * 0.6)),
                        fmt(Math.round(equity * 0.2)),
                      ];
                    })}
                  />
                );
              })()}
            </div>

            <div className="bg-[#FFF8E1] rounded-2xl p-5 border border-[#B26A00]/20 text-[14px] text-[#3D4F5F] leading-relaxed">
              <span className="font-bold text-[#B26A00]">Key distinction:</span> The bank will lend based on their
              conservative underwriting value ($7.6&ndash;$10.2M at 6&ndash;8% cap), while the asset&rsquo;s true market
              value ($10&ndash;$12M+) is materially higher. This gap means the partners hold significantly more equity
              than a refinancing appraisal would suggest.
            </div>
          </Section>

          {/* ── PARTNER BUYOUT ── */}
          <Section id="buyout">
            <SectionLabel>20% Partner Buyout Strategy</SectionLabel>
            <h2 className="text-[1.5rem] font-extrabold text-[#334A46] mb-4">Estimated 20% Stake Value (Market Basis)</h2>

            <div className="bg-white rounded-2xl border border-[#334A46]/[.08] overflow-hidden mb-6">
              <Table
                headers={['Market Valuation', '20% Gross', 'Mortgage (20%)', '20% Net Equity', 'w/ 20% Discount']}
                rows={[10000000, 11000000, 12000000].map((v) => {
                  const gross20 = Math.round(v * 0.2);
                  const mort20 = Math.round(3874209 * 0.2);
                  const netEq = gross20 - mort20;
                  const discounted = Math.round(netEq * 0.8);
                  return [
                    fmt(v),
                    fmt(gross20),
                    fmt(mort20),
                    <span key={v + 'ne'} className="font-bold">{fmt(netEq)}</span>,
                    <span key={v + 'disc'} className="font-bold text-[#2E7D32]">{fmt(discounted)}</span>,
                  ];
                })}
              />
            </div>

            <div className="bg-[#FAFAFA] rounded-2xl p-6 border border-[#334A46]/[.06] space-y-3 text-[14px] text-[#3D4F5F] leading-relaxed">
              <p><span className="font-bold text-[#334A46]">Before Refinancing (2026&ndash;2028):</span> Stronger negotiating leverage. The estate is likely motivated to liquidate, and no fresh appraisal has established value. A 15&ndash;25% minority/illiquidity discount is defensible.</p>
              <p><span className="font-bold text-[#334A46]">After Refinancing (2029+):</span> A refinancing appraisal establishes FMV, simplifying negotiations but potentially setting a higher floor for the estate.</p>
              <p><span className="font-bold text-[#334A46]">Recommendation:</span> Pursue acquisition before refinancing, ideally 2026&ndash;2027. At a $11M market valuation with 20% minority discount, the purchase price would be approximately <span className="font-bold text-[#2E7D32]">$1.14M</span> &mdash; achievable with current cash reserves.</p>
            </div>
          </Section>

          {/* ── CAPITAL IMPROVEMENTS ── */}
          <Section id="capital">
            <SectionLabel>Capital Improvement Strategy</SectionLabel>
            <h2 className="text-[1.5rem] font-extrabold text-[#334A46] mb-4">Funding Options & Tax Impact</h2>
            <p className="text-[14px] text-[#3D4F5F] leading-relaxed mb-6">
              R&amp;M spending has been volatile ($43.8K to $79.5K), indicating aging systems.
              The building is fully depreciated &mdash; new capital improvements will generate fresh depreciation.
            </p>

            <h3 className="text-[1.1rem] font-bold text-[#334A46] mb-4">Funding Options</h3>
            <div className="bg-white rounded-2xl border border-[#334A46]/[.08] overflow-hidden mb-8">
              <Table
                compact
                headers={['Option', 'Advantages', 'Disadvantages', 'Best For']}
                rows={[
                  ['Cash Reserves', 'Immediate; no debt', 'Depletes $1.58M reserve', 'Small projects < $300K'],
                  ['Equipment Loan', 'Preserves cash; dedicated terms', 'Adds pre-refi debt service', 'Mid-range $300K\u2013$800K'],
                  ['2029 Refi Cash-Out', 'Favorable rates; large capacity', '3+ year delay', 'Major projects $500K+'],
                  ['Hybrid Approach', 'Start now, finish at refi', 'Complexity; two funding sources', 'Phased implementation'],
                ]}
              />
            </div>

            <h3 className="text-[1.1rem] font-bold text-[#334A46] mb-4">Tax Impact of $750K Capital Improvement Program</h3>
            <div className="bg-white rounded-2xl border border-[#334A46]/[.08] overflow-hidden mb-6">
              <Table
                compact
                headers={['Component', 'Estimated Cost', 'Depreciation Method', 'Year 1 Deduction', 'Ongoing Annual']}
                rows={[
                  ['HVAC System Replacement', '$350,000', 'Sec. 179', '$350,000', '$0/yr'],
                  ['Elevator Modernization', '$200,000', '39-yr / Cost Seg', '$40\u2013$80K', '$3\u2013$5K/yr'],
                  ['Common Area / Fa\u00E7ade', '$100,000', '39-yr / Cost Seg', '$20\u2013$40K', '$2\u2013$3K/yr'],
                  ['Tenant Improvements', '$100,000', '15-yr QIP', '$100,000', '$0/yr'],
                  [<span key="total" className="font-bold text-[#334A46]">TOTAL</span>, <span key="tc" className="font-bold">$750,000</span>, '', <span key="td" className="font-bold">$510\u2013$570K</span>, '$5\u2013$8K/yr'],
                ]}
              />
            </div>

            <div className="bg-[#FAFAFA] rounded-2xl p-6 border border-[#334A46]/[.06] text-[14px] text-[#3D4F5F] leading-relaxed">
              <p>A $550K first-year deduction translates to approximately <span className="font-bold text-[#334A46]">$165K&ndash;$200K in tax savings</span>, reducing the net after-tax cost of the $750K program to approximately $550K&ndash;$585K. 100% bonus depreciation is permanently restored under the OBBBA with no sunset date.</p>
            </div>
          </Section>

          {/* ── STRATEGIC RECOMMENDATIONS ── */}
          <Section id="recommendations">
            <SectionLabel>Strategic Recommendations</SectionLabel>
            <h2 className="text-[1.5rem] font-extrabold text-[#334A46] mb-6">Action Items by Timeline</h2>

            {/* Immediate */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-[#334A46] text-white text-[12px] font-bold uppercase tracking-[.08em] px-3 py-1.5 rounded-lg">Immediate &middot; 2026</div>
              </div>
              <div className="space-y-3 pl-4 border-l-2 border-[#334A46]/20">
                {[
                  { text: 'Confirm or file Section 754 elections at both Pyn LLC and Lower Pyne Associates LP with 2025 tax returns. This is the single highest-priority action.', priority: true },
                  { text: 'Engage estate counsel to begin 20% stake acquisition negotiations. Target a 15\u201320% minority discount on net equity value.' },
                  { text: 'Complete the committed $100,000 investment in Nassau 211-213 LLC.' },
                  { text: 'Complete architectural and engineering assessments for HVAC and elevator systems.' },
                  { text: 'Commission a cost segregation study to maximize depreciation benefits.' },
                  { text: 'Execute all lease renewals (Hamilton 10yr, others 5yr) with 3% annual escalators.' },
                ].map((item, i) => (
                  <div key={i} className={`py-3 px-4 rounded-xl ${item.priority ? 'bg-[#334A46]/[.06] border border-[#334A46]/[.12]' : 'bg-[#FAFAFA]'}`}>
                    <p className={`text-[14px] leading-relaxed ${item.priority ? 'font-bold text-[#334A46]' : 'text-[#3D4F5F]'}`}>
                      {i + 1}. {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Medium-Term */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-[#2E5A88] text-white text-[12px] font-bold uppercase tracking-[.08em] px-3 py-1.5 rounded-lg">Medium-Term &middot; 2027&ndash;2028</div>
              </div>
              <div className="space-y-3 pl-4 border-l-2 border-[#2E5A88]/20">
                {[
                  'Execute safety-critical capital improvements using cash reserves. Defer non-urgent work to refinancing. 100% bonus depreciation is permanent under the OBBBA.',
                  'Monitor the interest rate swap benefit and begin preliminary lender conversations about 2029 refinancing options.',
                  'Build the case for a cash-out refinancing by maintaining strong NOI growth, completing lease renewals, and documenting capital improvement plans.',
                ].map((text, i) => (
                  <div key={i} className="py-3 px-4 rounded-xl bg-[#FAFAFA]">
                    <p className="text-[14px] text-[#3D4F5F] leading-relaxed">{i + 1}. {text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Refinancing Year */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-[#2E7D32] text-white text-[12px] font-bold uppercase tracking-[.08em] px-3 py-1.5 rounded-lg">Refinancing Year &middot; 2029</div>
              </div>
              <div className="space-y-3 pl-4 border-l-2 border-[#2E7D32]/20">
                {[
                  'Secure refinancing with cash-out component sufficient to fund remaining capital improvements ($500K\u2013$1M) and, if not yet completed, the partner buyout.',
                  'Execute the $750K capital improvement program. Apply Section 179 to HVAC and 100% bonus depreciation to cost-segregated components.',
                  'Evaluate interest rate protection products (swap, cap, or fixed rate) for the new loan.',
                  'Target a property valuation appraisal of $10\u2013$15M to maximize refinancing proceeds.',
                ].map((text, i) => (
                  <div key={i} className="py-3 px-4 rounded-xl bg-[#FAFAFA]">
                    <p className="text-[14px] text-[#3D4F5F] leading-relaxed">{i + 1}. {text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Closing */}
            <div className="bg-[#334A46] rounded-2xl p-8 text-white">
              <p className="text-[15px] leading-relaxed opacity-90 italic">
                The partnership is in an enviable position: growing revenue, strong cash flow, declining debt, and long-term lease commitments on the horizon.
                The decisions made in 2026&ndash;2027 &mdash; particularly confirming the 754 elections and planning the capital program &mdash; will determine whether
                the 2029 refinancing is merely a debt rollover or a transformative capital event for the partnership.
              </p>
            </div>
          </Section>

          {/* Footer */}
          <div className="pt-10 pb-6 border-t border-[#334A46]/[.08] text-center">
            <div className="text-[11px] text-[#334A46]/30 font-medium">
              Lower Pyne Associates LP &middot; Confidential &middot; Prepared February 2026
            </div>
          </div>

        </main>
      </div>
      ) : (
        <ProjectionsView />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// INTERACTIVE PROJECTIONS VIEW
// ══════════════════════════════════════════════

const DEFAULTS = {
  revenueGrowth: 0.03,
  expenseGrowth: 0.03,
  taxGrowth: 0.035,
  vacancyRate: 0,
  capRate: 0.07,
  refiRate: 0.0575,
  refiLoanAmount: 5000000,
  distributions: 280000,
  newInvestments: 86667,
  refiDistPct: 0.45,        // 45% of net refi cash-out distributed (based on 2019 actual)
  reserveInvestPct: 0,       // % of cash reserves invested in yield-bearing instruments
  reserveReturnRate: 0.045,  // expected annual return on invested reserves
};

// Row type for projection data
interface ProjectionRow {
  year: number;
  grossRevenue: number;
  vacancyLoss: number;
  effectiveRevenue: number;
  otherOpEx: number;
  realEstateTax: number;
  totalExpenses: number;
  noi: number;
  debtService: number;
  freeCashFlow: number;
  refiDistribution: number;    // one-time distribution from refi cash-out (2029 only)
  refiProceeds: number;        // cash-out proceeds from refinancing (2029 only)
  investedReserves: number;    // cash deployed into yield-bearing instruments
  investmentIncome: number;    // annual return from invested reserves
  netToCash: number;           // net year-over-year change in cash position
  cashPosition: number;
  dscr: number;
  isPreRefi: boolean;
  isBaseline: boolean;
  isHistorical: boolean;
}

// Slider config
interface SliderConfig {
  key: keyof typeof DEFAULTS;
  label: string;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  isPercent: boolean;
}

const SLIDERS: SliderConfig[] = [
  { key: 'revenueGrowth', label: 'Revenue Growth', min: 0, max: 0.06, step: 0.0025, format: (v) => (v * 100).toFixed(2) + '%', isPercent: true },
  { key: 'expenseGrowth', label: 'Expense Growth', min: 0, max: 0.06, step: 0.0025, format: (v) => (v * 100).toFixed(2) + '%', isPercent: true },
  { key: 'taxGrowth', label: 'RE Tax Growth', min: 0, max: 0.06, step: 0.0025, format: (v) => (v * 100).toFixed(2) + '%', isPercent: true },
  { key: 'vacancyRate', label: 'Vacancy Rate', min: 0, max: 0.15, step: 0.01, format: (v) => (v * 100).toFixed(0) + '%', isPercent: true },
  { key: 'capRate', label: 'Cap Rate', min: 0.04, max: 0.10, step: 0.0025, format: (v) => (v * 100).toFixed(2) + '%', isPercent: true },
  { key: 'refiRate', label: 'Refi Interest Rate', min: 0.04, max: 0.08, step: 0.0025, format: (v) => (v * 100).toFixed(2) + '%', isPercent: true },
  { key: 'refiLoanAmount', label: 'Refi Loan Amount', min: 3600000, max: 8000000, step: 100000, format: (v) => '$' + (v / 1000000).toFixed(1) + 'M', isPercent: false },
  { key: 'distributions', label: 'Annual Distributions', min: 0, max: 500000, step: 10000, format: (v) => '$' + (v / 1000).toFixed(0) + 'K', isPercent: false },
  { key: 'newInvestments', label: 'Outside RE Investments / Yr', min: 0, max: 500000, step: 5000, format: (v) => '$' + (v / 1000).toFixed(0) + 'K', isPercent: false },
  { key: 'refiDistPct', label: 'Refi Cash-Out Distributed %', min: 0, max: 1, step: 0.05, format: (v) => (v * 100).toFixed(0) + '%', isPercent: true },
  { key: 'reserveInvestPct', label: 'Cash Reserves Invested %', min: 0, max: 1, step: 0.05, format: (v) => (v * 100).toFixed(0) + '%', isPercent: true },
  { key: 'reserveReturnRate', label: 'Return on Invested Reserves', min: 0.01, max: 0.10, step: 0.005, format: (v) => (v * 100).toFixed(1) + '%', isPercent: true },
];

// 2025 base values
const BASE_REVENUE_2025 = 879895;
const BASE_TAX_2025 = 124744;
const BASE_OTHER_OPEX_2025 = 334283 - 124744; // 209,539
const PRE_REFI_DEBT_SERVICE = 255000; // approx current annual mortgage + interest net of swap
const STARTING_CASH = 1575348;

// Historical actual data (2023–2024) for context in projection tables
const HISTORICAL_ROWS: ProjectionRow[] = [
  {
    year: 2023, grossRevenue: 830028, vacancyLoss: 0, effectiveRevenue: 830028,
    otherOpEx: 177825, realEstateTax: 116055, totalExpenses: 293880,
    noi: 536148, debtService: 252588, freeCashFlow: 283560,
    refiDistribution: 0, refiProceeds: 0, investedReserves: 0, investmentIncome: 0, netToCash: 0,
    cashPosition: 1711504, dscr: 2.12, isPreRefi: true, isBaseline: false, isHistorical: true,
  },
  {
    year: 2024, grossRevenue: 851053, vacancyLoss: 0, effectiveRevenue: 851053,
    otherOpEx: 215312, realEstateTax: 121484, totalExpenses: 336796,
    noi: 514257, debtService: 251843, freeCashFlow: 262414,
    refiDistribution: 0, refiProceeds: 0, investedReserves: 0, investmentIncome: 0, netToCash: 0,
    cashPosition: 1676355, dscr: 2.04, isPreRefi: true, isBaseline: false, isHistorical: true,
  },
];

// ── Slider Groups for Projections ──
const SLIDER_GROUPS = [
  {
    title: 'Growth Assumptions',
    note: 'Annual growth rates applied to 2025 base values.',
    keys: ['revenueGrowth', 'expenseGrowth', 'taxGrowth', 'vacancyRate'] as const,
  },
  {
    title: 'Refinancing Terms',
    note: 'Current mortgage (~$3.87M) matures 2029. Excess above ~$3.6M balance is cash-out proceeds.',
    keys: ['capRate', 'refiRate', 'refiLoanAmount', 'refiDistPct'] as const,
  },
  {
    title: 'Cash Management',
    note: 'Annual distributions to partners. RE investments and reserves are optional strategies.',
    keys: ['distributions', 'newInvestments', 'reserveInvestPct', 'reserveReturnRate'] as const,
  },
];

// ── Compute 2035 NOI for a given assumptions set (lightweight, no full projection) ──
function compute2035NOI(a: typeof DEFAULTS): number {
  const yearIndex = 10;
  const gross = Math.round(BASE_REVENUE_2025 * Math.pow(1 + a.revenueGrowth, yearIndex));
  const vacancy = Math.round(gross * a.vacancyRate);
  const effective = gross - vacancy;
  const tax = Math.round(BASE_TAX_2025 * Math.pow(1 + a.taxGrowth, yearIndex));
  const opex = Math.round(BASE_OTHER_OPEX_2025 * Math.pow(1 + a.expenseGrowth, yearIndex));
  return effective - tax - opex;
}

// ── Custom Tooltip for Projection Chart ──
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-[#334A46]/[.1] px-4 py-3">
      <div className="text-[12px] font-bold text-[#334A46] mb-2">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-[13px]">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.stroke }} />
          <span className="text-[#334A46]/60">{p.name}:</span>
          <span className="font-bold text-[#334A46]">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Projection Chart Component ──
function ProjectionChart({ rows }: { rows: ProjectionRow[] }) {
  const chartData = rows
    .filter(r => r.year >= 2025)
    .map(r => ({
      year: r.year.toString(),
      noi: r.noi,
      debtService: r.debtService,
      freeCashFlow: r.freeCashFlow,
    }));

  return (
    <div className="bg-white rounded-2xl border border-[#334A46]/[.08] p-6 mb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[11px] font-bold uppercase tracking-[.15em] text-[#334A46]/40">
          NOI, Debt Service & Free Cash Flow
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-[#334A46] rounded" />
            <span className="text-[10px] text-[#334A46]/50 font-medium">NOI</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-[#6B9E8A] rounded" />
            <span className="text-[10px] text-[#334A46]/50 font-medium">Free Cash Flow</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-[#9CA3AF] rounded border-t border-dashed border-[#9CA3AF]" />
            <span className="text-[10px] text-[#334A46]/50 font-medium">Debt Service</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <XAxis
            dataKey="year"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#334A46', opacity: 0.5, fontWeight: 600 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#334A46', opacity: 0.4 }}
            tickFormatter={(v: number) => '$' + (v / 1000).toFixed(0) + 'K'}
            width={60}
          />
          <Tooltip content={<ChartTooltip />} />
          <ReferenceLine
            x="2029"
            stroke="#334A46"
            strokeDasharray="4 4"
            strokeOpacity={0.3}
            label={{ value: 'Refi', position: 'top', fontSize: 11, fill: '#334A46', opacity: 0.5 }}
          />
          <Area
            type="monotone" dataKey="noi"
            stroke="#334A46" fill="#334A46" fillOpacity={0.08}
            strokeWidth={2.5} dot={false} name="NOI"
          />
          <Area
            type="monotone" dataKey="freeCashFlow"
            stroke="#6B9E8A" fill="#6B9E8A" fillOpacity={0.06}
            strokeWidth={2} dot={false} name="Free Cash Flow"
          />
          <Area
            type="monotone" dataKey="debtService"
            stroke="#9CA3AF" fill="none"
            strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="Debt Service"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ProjectionsView() {
  const [assumptions, setAssumptions] = useState({ ...DEFAULTS });
  const [assumptionsOpen, setAssumptionsOpen] = useState(true);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SLIDER_GROUPS.map(g => [g.title, true]))
  );
  const toggleGroup = (title: string) =>
    setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));

  const updateAssumption = (key: keyof typeof DEFAULTS, value: number) => {
    setAssumptions((prev) => ({ ...prev, [key]: value }));
  };

  const resetDefaults = () => setAssumptions({ ...DEFAULTS });

  const PRESETS = {
    base: { ...DEFAULTS },
    conservative: {
      ...DEFAULTS,
      revenueGrowth: 0.02,
      expenseGrowth: 0.035,
      taxGrowth: 0.04,
      vacancyRate: 0.03,
      refiRate: 0.065,
      refiLoanAmount: 4000000,
      refiDistPct: 0.30,
    },
    stress: {
      ...DEFAULTS,
      revenueGrowth: 0.01,
      expenseGrowth: 0.04,
      taxGrowth: 0.045,
      vacancyRate: 0.08,
      refiRate: 0.07,
      refiLoanAmount: 3600000,
      distributions: 200000,
      refiDistPct: 0,
      reserveInvestPct: 0,
    },
  };

  // ── Compute all projections ──
  const projections = useMemo(() => {
    const years = [2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035];
    const { revenueGrowth, expenseGrowth, taxGrowth, vacancyRate, refiRate, refiLoanAmount, distributions, capRate, newInvestments, refiDistPct, reserveInvestPct, reserveReturnRate } = assumptions;

    // Refi debt service (25-yr amortization)
    const r = refiRate / 12;
    const n = 300;
    const refiAnnualDS = Math.round((refiLoanAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)) * 12);

    // Estimated mortgage balance at 2029 maturity (~$3.6M)
    const MORTGAGE_AT_MATURITY = 3600000;

    let cashPosition = STARTING_CASH;
    const rows = years.map((year, i) => {
      const yearIndex = i; // 0 = 2025 (baseline)

      // Revenue
      const grossRevenue = Math.round(BASE_REVENUE_2025 * Math.pow(1 + revenueGrowth, yearIndex));
      const vacancyLoss = Math.round(grossRevenue * vacancyRate);
      const effectiveRevenue = grossRevenue - vacancyLoss;

      // Expenses
      const realEstateTax = Math.round(BASE_TAX_2025 * Math.pow(1 + taxGrowth, yearIndex));
      const otherOpEx = Math.round(BASE_OTHER_OPEX_2025 * Math.pow(1 + expenseGrowth, yearIndex));
      const totalExpenses = realEstateTax + otherOpEx;

      // NOI
      const noi = effectiveRevenue - totalExpenses;

      // Debt service
      const isPreRefi = year < 2029;
      const isBaseline = year === 2025;
      const debtService = isBaseline ? PRE_REFI_DEBT_SERVICE : (isPreRefi ? PRE_REFI_DEBT_SERVICE : refiAnnualDS);

      // Free cash flow
      const freeCashFlow = noi - debtService;

      // Refi one-time distribution (2029 only)
      const refiCashOut = Math.max(0, refiLoanAmount - MORTGAGE_AT_MATURITY);
      const refiDistribution = year === 2029 ? Math.round(refiCashOut * refiDistPct) : 0;

      // Investment income from cash reserves
      const investedReserves = isBaseline ? 0 : Math.round(cashPosition * reserveInvestPct);
      const investmentIncome = Math.round(investedReserves * reserveReturnRate);

      // Refi proceeds (explicit inflow in 2029)
      const refiProceeds = year === 2029 ? refiCashOut : 0;

      // Net change to cash position this year
      const netToCash = isBaseline ? 0 : (freeCashFlow - distributions - newInvestments - refiDistribution + investmentIncome + refiProceeds);

      // Cash position
      if (isBaseline) {
        cashPosition = STARTING_CASH;
      } else {
        cashPosition = cashPosition + netToCash;
      }

      // DSCR
      const dscr = debtService > 0 ? noi / debtService : 0;

      return {
        year, grossRevenue, vacancyLoss, effectiveRevenue,
        realEstateTax, otherOpEx, totalExpenses,
        noi, debtService, freeCashFlow, refiDistribution,
        refiProceeds, investedReserves, investmentIncome, netToCash,
        cashPosition: Math.round(cashPosition),
        dscr, isPreRefi, isBaseline, isHistorical: false,
      };
    });

    // Prepend historical rows
    const allRows: ProjectionRow[] = [...HISTORICAL_ROWS, ...rows];

    // Valuation based on year 10 (2035) NOI
    const noiYear10 = rows[rows.length - 1].noi;
    const propertyValue = Math.round(noiYear10 / capRate);
    const totalEquity = propertyValue - refiLoanAmount;
    const share60 = Math.round(totalEquity * 0.6);
    const share20 = Math.round(totalEquity * 0.2);
    const totalDist10yr = distributions * 10;
    const totalDist60 = Math.round(totalDist10yr * 0.6);

    return { rows: allRows, propertyValue, totalEquity, share60, share20, totalDist60, refiAnnualDS };
  }, [assumptions]);

  // ── Active preset detection ──
  const isActivePreset = (presetKey: string) => {
    const preset = PRESETS[presetKey as keyof typeof PRESETS];
    if (!preset) return false;
    return (Object.keys(preset) as (keyof typeof DEFAULTS)[]).every(
      (k) => Math.abs(assumptions[k] - preset[k]) < 0.0001
    );
  };

  // ── Min DSCR for health indicator ──
  const minDSCR = useMemo(() => {
    const projected = projections.rows.filter(r => !r.isHistorical && !r.isBaseline);
    return Math.min(...projected.map(r => r.dscr));
  }, [projections.rows]);
  const dscrColor = minDSCR >= 1.5 ? '#2E7D32' : minDSCR >= 1.25 ? '#F57F17' : '#C62828';
  const dscrLabel = minDSCR >= 1.5 ? 'Healthy' : minDSCR >= 1.25 ? 'Adequate' : 'At Risk';
  const dscrBg = minDSCR >= 1.5 ? 'bg-[#E2EFDA]' : minDSCR >= 1.25 ? 'bg-[#FFF8E1]' : 'bg-[#FFEBEE]';

  // ── Table helpers ──
  const yearHeader = (r: ProjectionRow) =>
    r.isHistorical ? `${r.year} Act.` : r.isBaseline ? '2025 Act.' : r.year === 2029 ? '2029 Refi' : String(r.year);
  const yearThClass = (r: ProjectionRow) =>
    `py-3 px-3 text-[11px] font-bold uppercase tracking-[.08em] border-b border-[#334A46]/10 text-right whitespace-nowrap ${r.year === 2029 ? 'text-[#2E7D32] bg-[#E2EFDA]/30' : (r.isBaseline || r.isHistorical) ? 'text-[#334A46]/70 bg-[#FAFAFA]' : 'text-[#334A46]/50'}`;
  const yearTdBg = (r: ProjectionRow) =>
    r.year === 2029 ? 'bg-[#E2EFDA]/30' : (r.isBaseline || r.isHistorical) ? 'bg-[#FAFAFA]' : '';

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* ── Intro ── */}
      <div className="mb-8">
        <SectionLabel>Interactive Model</SectionLabel>
        <h1 className="text-[1.8rem] font-extrabold text-[#334A46] mb-3">10-Year Projections</h1>
        <p className="text-[14px] text-[#3D4F5F] leading-relaxed max-w-3xl">
          Adjust any assumption below to see how it impacts NOI, debt service coverage, cash position, and
          property valuation over the next decade. Use the scenario presets for quick comparisons.
        </p>
      </div>

      {/* ── Scenario Presets (redesigned as larger cards) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {([
          { key: 'base' as const, label: 'Base Case', borderColor: 'border-l-[#2E7D32]', dotColor: 'bg-[#2E7D32]', params: ['3% revenue growth', '3% expense growth', '0% vacancy', '$5M refi'] },
          { key: 'conservative' as const, label: 'Conservative', borderColor: 'border-l-[#F57F17]', dotColor: 'bg-[#F57F17]', params: ['2% revenue growth', '3.5% expense growth', '3% vacancy', '$4M refi'] },
          { key: 'stress' as const, label: 'Stress Test', borderColor: 'border-l-[#C62828]', dotColor: 'bg-[#C62828]', params: ['1% revenue growth', '4% expense growth', '8% vacancy', '$3.6M refi'] },
        ]).map((preset) => {
          const active = isActivePreset(preset.key);
          const noiVal = compute2035NOI(PRESETS[preset.key]);
          return (
            <button
              key={preset.key}
              onClick={() => setAssumptions(PRESETS[preset.key])}
              className={`text-left p-5 rounded-2xl border-l-4 ${preset.borderColor} border border-[#334A46]/[.08] transition-all ${active ? 'bg-[#E2EFDA]/20 shadow-md ring-1 ring-[#334A46]/[.15]' : 'bg-white hover:shadow-sm'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2.5 h-2.5 rounded-full ${preset.dotColor}`} />
                <span className="text-[15px] font-extrabold text-[#334A46]">{preset.label}</span>
                {active && <span className="text-[10px] font-bold uppercase tracking-wider text-[#2E7D32] ml-auto">Active</span>}
              </div>
              <div className="space-y-0.5 mb-3">
                {preset.params.map((p) => (
                  <div key={p} className="text-[12px] text-[#334A46]/50">{p}</div>
                ))}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-[.08em] text-[#334A46]/40">2035 NOI</div>
              <div className="text-[1.1rem] font-extrabold text-[#334A46]">{fmt(noiVal)}</div>
            </button>
          );
        })}
      </div>

      {/* ── Hero Chart ── */}
      <ProjectionChart rows={projections.rows} />

      {/* ── Assumptions Panel (collapsible, grouped into 3 sections) ── */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setAssumptionsOpen(!assumptionsOpen)}
            className="flex items-center gap-2 group"
          >
            <svg className={`w-4 h-4 text-[#334A46]/40 transition-transform ${assumptionsOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            <SectionLabel>Model Assumptions</SectionLabel>
          </button>
          <div className="flex items-center gap-3">
            {!assumptionsOpen && (
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {SLIDERS.slice(0, 6).map((slider) => (
                  <span key={slider.key} className="text-[11px] text-[#334A46]/50">
                    <span className="font-medium text-[#334A46]/70">{slider.format(assumptions[slider.key])}</span> {slider.label.toLowerCase().replace('revenue ', 'rev ').replace('expense ', 'exp ').replace('re tax ', 'tax ').replace('refi interest ', 'refi ')}
                  </span>
                ))}
              </div>
            )}
            <button
              onClick={resetDefaults}
              className="px-4 py-2 text-[13px] font-semibold text-[#334A46]/60 border border-[#334A46]/[.12] rounded-lg hover:bg-[#334A46]/[.04] transition-colors shrink-0"
            >
              Reset to Defaults
            </button>
          </div>
        </div>

        {assumptionsOpen && (
          <div>
            {SLIDER_GROUPS.map((group) => (
              <div key={group.title} className="mb-6">
                <button
                  onClick={() => toggleGroup(group.title)}
                  className="flex items-center gap-2 mb-3 group w-full text-left"
                >
                  <svg className={`w-3.5 h-3.5 text-[#334A46]/50 transition-transform ${openGroups[group.title] ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  <h3 className="text-[14px] font-bold text-[#334A46] whitespace-nowrap">{group.title}</h3>
                  <p className="text-[12px] text-[#334A46]/50 leading-relaxed">{group.note}</p>
                </button>
                {openGroups[group.title] ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {group.keys.map((key) => {
                      const slider = SLIDERS.find(s => s.key === key)!;
                      return (
                        <div key={slider.key} className="bg-[#FAFAFA] rounded-2xl p-5 border border-[#334A46]/[.06]">
                          <div className="text-[12px] font-bold uppercase tracking-[.08em] text-[#334A46]/70 mb-1">{slider.label}</div>
                          <div className="text-[1.5rem] font-extrabold text-[#334A46] mb-3">{slider.format(assumptions[slider.key])}</div>
                          <input
                            type="range"
                            min={slider.min}
                            max={slider.max}
                            step={slider.step}
                            value={assumptions[slider.key]}
                            onChange={(e) => updateAssumption(slider.key, parseFloat(e.target.value))}
                            className="w-full h-2 bg-[#334A46]/[.12] rounded-lg appearance-none cursor-pointer accent-[#334A46]"
                          />
                          <div className="flex justify-between mt-1">
                            <span className="text-[11px] text-[#334A46]/50 font-medium">{slider.format(slider.min)}</span>
                            <span className="text-[11px] text-[#334A46]/50 font-medium">{slider.format(slider.max)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-x-5 gap-y-1 ml-5.5">
                    {group.keys.map((key) => {
                      const slider = SLIDERS.find(s => s.key === key)!;
                      return (
                        <span key={key} className="text-[12px] text-[#334A46]/60">
                          <span className="font-semibold text-[#334A46]/80">{slider.format(assumptions[key])}</span>{' '}
                          {slider.label.toLowerCase()}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Valuation Summary Cards (with DSCR health indicator) ── */}
      <div className="mb-10">
        <SectionLabel>Valuation Summary (Based on 2035 NOI)</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Stat value={fmt(projections.propertyValue)} label="Property Value" accent />
          <Stat value={fmt(projections.totalEquity)} label="Total Equity" />
          <Stat value={fmt(projections.share60)} label="60% Share" />
          <Stat value={fmt(projections.share20)} label="20% Share" />
          <Stat value={fmt(projections.totalDist60)} label="10-Yr Dist. (60%)" accent />
          {/* DSCR Health Indicator */}
          <div className={`rounded-2xl p-5 overflow-hidden ${dscrBg} border border-[#334A46]/[.06]`}>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dscrColor }} />
              <span className="text-[11px] font-bold uppercase tracking-[.08em]" style={{ color: dscrColor }}>{dscrLabel}</span>
            </div>
            <div className="text-[1.4rem] md:text-[1.75rem] font-extrabold leading-none text-[#334A46]">{minDSCR.toFixed(2)}x</div>
            <div className="mt-2 text-[12px] font-semibold uppercase tracking-[.08em] text-[#334A46]/50">Min DSCR</div>
          </div>
        </div>
      </div>

      {/* ── Unified 10-Year Projection Table ── */}
      <div className="mb-10">
        <SectionLabel>10-Year Projection</SectionLabel>
        <h2 className="text-[1.3rem] font-extrabold text-[#334A46] mb-4">Income, Cash Flow & Debt Service</h2>
        <div className="bg-white rounded-2xl border border-[#334A46]/[.08] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead>
                <tr>
                  <th className="py-3 px-3 text-[11px] font-bold uppercase tracking-[.08em] text-[#334A46]/50 border-b border-[#334A46]/10 sticky left-0 bg-white z-10"></th>
                  {projections.rows.map((r) => (
                    <th key={r.year} className={yearThClass(r)}>{yearHeader(r)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* ── Section 1: Revenue & NOI ── */}
                {([
                  { label: 'Gross Revenue', key: 'grossRevenue' as const },
                  { label: 'Vacancy Loss', key: 'vacancyLoss' as const },
                  { label: 'Effective Revenue', key: 'effectiveRevenue' as const, bold: true },
                  { label: 'Operating Expenses', key: 'otherOpEx' as const },
                  { label: 'Real Estate Tax', key: 'realEstateTax' as const },
                  { label: 'Total Expenses', key: 'totalExpenses' as const, bold: true },
                  { label: 'Net Operating Income', key: 'noi' as const, bold: true, highlight: true },
                ]).map(({ label, key, bold, highlight }) => (
                  <tr key={key} className={`border-b border-[#334A46]/[.06] ${highlight ? 'bg-[#E2EFDA]/30' : ''}`}>
                    <td className={`py-2.5 px-3 text-[13px] ${bold ? 'font-bold text-[#334A46]' : 'text-[#3D4F5F]'} sticky left-0 z-10 ${highlight ? 'bg-[#E2EFDA]/30' : 'bg-white'}`}>{label}</td>
                    {projections.rows.map((r) => (
                      <td key={r.year} className={`py-2.5 px-3 text-[13px] text-right ${bold ? 'font-bold text-[#334A46]' : 'text-[#3D4F5F]'} ${yearTdBg(r)}`}>
                        {key === 'vacancyLoss' ? (r[key] > 0 ? `(${fmt(r[key])})` : '\u2014') : fmt(r[key])}
                      </td>
                    ))}
                  </tr>
                ))}
                {/* ── Section 2: Cash Flow & Debt ── */}
                <tr className="border-b border-[#334A46]/10">
                  <td colSpan={projections.rows.length + 1} className="py-1.5 px-3 text-[10px] font-bold uppercase tracking-[.12em] text-[#334A46]/30 bg-white">Cash Flow &amp; Debt Service</td>
                </tr>
                {/* Debt Service with step-up annotation */}
                <tr className="border-b border-[#334A46]/[.06]">
                  <td className="py-2.5 px-3 text-[13px] text-[#3D4F5F] sticky left-0 bg-white z-10">Debt Service</td>
                  {projections.rows.map((r) => (
                    <td key={r.year} className={`py-2.5 px-3 text-[13px] text-right text-[#3D4F5F] ${yearTdBg(r)}`}>
                      <div>{fmt(-r.debtService)}</div>
                      {r.year === 2029 && !r.isHistorical && (
                        <div className="text-[10px] text-[#C62828] font-bold mt-0.5 whitespace-nowrap">+{fmt(r.debtService - PRE_REFI_DEBT_SERVICE)} step-up</div>
                      )}
                    </td>
                  ))}
                </tr>
                {/* Free Cash Flow */}
                <tr className="border-b border-[#334A46]/[.06]">
                  <td className="py-2.5 px-3 text-[13px] font-bold text-[#334A46] sticky left-0 bg-white z-10">Free Cash Flow</td>
                  {projections.rows.map((r) => (
                    <td key={r.year} className={`py-2.5 px-3 text-[13px] text-right font-bold text-[#334A46] ${yearTdBg(r)}`}>
                      {fmt(r.freeCashFlow)}
                    </td>
                  ))}
                </tr>
                {/* DSCR */}
                <tr className="border-b border-[#334A46]/[.06] bg-[#FAFAFA]">
                  <td className="py-2.5 px-3 text-[13px] font-bold text-[#334A46] sticky left-0 bg-[#FAFAFA] z-10">DSCR</td>
                  {projections.rows.map((r) => (
                    <td key={r.year} className={`py-2.5 px-3 text-[13px] text-right font-bold ${r.dscr >= 1.5 ? 'text-[#2E7D32]' : r.dscr >= 1.25 ? 'text-[#F57F17]' : 'text-[#C62828]'} ${r.year === 2029 ? 'bg-[#E2EFDA]/30' : ''}`}>
                      {r.dscr.toFixed(2)}x
                    </td>
                  ))}
                </tr>
                {/* ── Section 3: Outflows & Inflows ── */}
                <tr className="border-b border-[#334A46]/10">
                  <td colSpan={projections.rows.length + 1} className="py-1.5 px-3 text-[10px] font-bold uppercase tracking-[.12em] text-[#334A46]/30 bg-white">Outflows &amp; Inflows</td>
                </tr>
                {/* Distributions */}
                <tr className="border-b border-[#334A46]/[.06]">
                  <td className="py-2.5 px-3 text-[13px] text-[#3D4F5F] sticky left-0 bg-white z-10">Distributions</td>
                  {projections.rows.map((r) => (
                    <td key={r.year} className={`py-2.5 px-3 text-[13px] text-right text-[#3D4F5F] ${yearTdBg(r)}`}>
                      {(r.isHistorical || r.isBaseline) ? fmt(-280000) : fmt(-assumptions.distributions)}
                    </td>
                  ))}
                </tr>
                {/* Outside RE Investments */}
                <tr className="border-b border-[#334A46]/[.06]">
                  <td className="py-2.5 px-3 text-[13px] text-[#3D4F5F] sticky left-0 bg-white z-10">Outside RE Investments</td>
                  {projections.rows.map((r) => (
                    <td key={r.year} className={`py-2.5 px-3 text-[13px] text-right ${assumptions.newInvestments > 0 && !r.isHistorical && !r.isBaseline ? 'text-[#3D4F5F]' : 'text-[#3D4F5F]/30'} ${yearTdBg(r)}`}>
                      {(r.isHistorical || r.isBaseline) ? '\u2014' : (assumptions.newInvestments > 0 ? fmt(-assumptions.newInvestments) : '\u2014')}
                    </td>
                  ))}
                </tr>
                {/* Refi Cash-Out Distribution */}
                <tr className="border-b border-[#334A46]/[.06]">
                  <td className="py-2.5 px-3 text-[13px] text-[#3D4F5F] sticky left-0 bg-white z-10">Refi Cash-Out Distribution</td>
                  {projections.rows.map((r) => (
                    <td key={r.year} className={`py-2.5 px-3 text-[13px] text-right ${r.refiDistribution > 0 ? 'font-bold text-[#C62828]' : 'text-[#3D4F5F]/30'} ${yearTdBg(r)}`}>
                      {r.refiDistribution > 0 ? fmt(-r.refiDistribution) : '\u2014'}
                    </td>
                  ))}
                </tr>
                {/* Refi Proceeds */}
                <tr className="border-b border-[#334A46]/[.06]">
                  <td className="py-2.5 px-3 text-[13px] text-[#3D4F5F] sticky left-0 bg-white z-10">Refi Proceeds (Inflow)</td>
                  {projections.rows.map((r) => (
                    <td key={r.year} className={`py-2.5 px-3 text-[13px] text-right ${r.refiProceeds > 0 ? 'font-bold text-[#2E7D32]' : 'text-[#3D4F5F]/30'} ${yearTdBg(r)}`}>
                      {r.refiProceeds > 0 ? '+' + fmt(r.refiProceeds) : '\u2014'}
                    </td>
                  ))}
                </tr>
                {/* Invested Reserves */}
                <tr className="border-b border-[#334A46]/[.06]">
                  <td className="py-2.5 px-3 text-[13px] text-[#3D4F5F] sticky left-0 bg-white z-10">Invested Reserves</td>
                  {projections.rows.map((r) => (
                    <td key={r.year} className={`py-2.5 px-3 text-[13px] text-right ${r.investedReserves > 0 ? 'text-[#3D4F5F]' : 'text-[#3D4F5F]/30'} ${yearTdBg(r)}`}>
                      {(r.isHistorical || r.isBaseline) ? '\u2014' : (r.investedReserves > 0 ? fmt(r.investedReserves) : '\u2014')}
                    </td>
                  ))}
                </tr>
                {/* Investment Income */}
                <tr className="border-b border-[#334A46]/[.06]">
                  <td className="py-2.5 px-3 text-[13px] text-[#2E7D32] font-semibold sticky left-0 bg-white z-10">Investment Income</td>
                  {projections.rows.map((r) => (
                    <td key={r.year} className={`py-2.5 px-3 text-[13px] text-right ${r.investmentIncome > 0 ? 'text-[#2E7D32] font-semibold' : 'text-[#3D4F5F]/30'} ${yearTdBg(r)}`}>
                      {(r.isHistorical || r.isBaseline) ? '\u2014' : (r.investmentIncome > 0 ? '+' + fmt(r.investmentIncome) : '\u2014')}
                    </td>
                  ))}
                </tr>
                {/* ── Section 4: Net Position ── */}
                <tr className="border-b border-[#334A46]/10">
                  <td colSpan={projections.rows.length + 1} className="py-1.5 px-3 text-[10px] font-bold uppercase tracking-[.12em] text-[#334A46]/30 bg-white">Net Position</td>
                </tr>
                {/* Net to Cash Position */}
                <tr className="border-b border-[#334A46]/[.08] bg-[#334A46]/[.04]">
                  <td className="py-2.5 px-3 text-[13px] font-bold text-[#334A46] sticky left-0 bg-[#334A46]/[.04] z-10">Net to Cash Position</td>
                  {projections.rows.map((r) => (
                    <td key={r.year} className={`py-2.5 px-3 text-[13px] text-right font-bold ${r.netToCash > 0 ? 'text-[#2E7D32]' : r.netToCash < 0 ? 'text-[#C62828]' : 'text-[#3D4F5F]/30'} ${yearTdBg(r)}`}>
                      {(r.isHistorical || r.isBaseline) ? '\u2014' : (r.netToCash >= 0 ? '+' : '') + fmt(r.netToCash)}
                    </td>
                  ))}
                </tr>
                {/* Cash Position */}
                <tr className="bg-[#E2EFDA]/30">
                  <td className="py-2.5 px-3 text-[13px] font-bold text-[#334A46] sticky left-0 bg-[#E2EFDA]/30 z-10">Cash Position</td>
                  {projections.rows.map((r) => (
                    <td key={r.year} className={`py-2.5 px-3 text-[13px] text-right font-bold ${r.cashPosition < 0 ? 'text-[#C62828]' : 'text-[#334A46]'}`}>
                      {fmt(r.cashPosition)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-10 pb-6 border-t border-[#334A46]/[.08] text-center">
        <div className="text-[11px] text-[#334A46]/30 font-medium">
          Lower Pyne Associates LP &middot; Confidential &middot; Prepared February 2026
        </div>
      </div>
    </div>
  );
}
