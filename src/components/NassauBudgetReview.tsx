import { useEffect, useRef, useState } from 'react';

/* ─────────────────────────────────────────────
   195 Nassau St — Marketing Budget Review
   Owner's Assessment — Confidential
   One-page scroller, Shortcut design system
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
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`}
      style={{ transitionTimingFunction: 'cubic-bezier(.25,.46,.45,.94)' }}
    >
      {children}
    </div>
  );
}

// ── Reusable table component ──
function Table({ headers, rows, className = '', compact = false }: { headers: string[]; rows: (string | React.ReactNode)[][]; className?: string; compact?: boolean }) {
  return (
    <div className={`overflow-x-auto -mx-2 px-2 ${className}`}>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className={`${compact ? 'py-2 px-3 text-[11px]' : 'py-3 px-4 text-[12px]'} font-bold uppercase tracking-[.08em] text-[#003756]/50 border-b border-[#003756]/10`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-[#003756]/[.06] last:border-0 hover:bg-[#003756]/[.02] transition-colors">
              {row.map((cell, ci) => (
                <td key={ci} className={`${compact ? 'py-2 px-3 text-[13px]' : 'py-3 px-4 text-[14px]'} text-[#3D4F5F] font-medium`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Stat card ──
function Stat({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-6 ${accent ? 'bg-[#003756] text-white' : 'bg-[#FAFAFA] border border-[#003756]/[.08]'}`}>
      <div className={`text-[2rem] md:text-[2.5rem] font-extrabold leading-none ${accent ? 'text-[#9EFAFF]' : 'text-[#003756]'}`}>{value}</div>
      <div className={`mt-2 text-[13px] font-semibold uppercase tracking-[.08em] ${accent ? 'text-white/70' : 'text-[#003756]/50'}`}>{label}</div>
    </div>
  );
}

// ── Section label (small caps) ──
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-bold uppercase tracking-[.15em] text-[#003756]/40 mb-3">{children}</div>;
}

// ── Callout box ──
function Callout({ children, type = 'info' }: { children: React.ReactNode; type?: 'info' | 'warning' | 'critical' }) {
  const styles = {
    info: 'bg-[#E0F2F7] border-[#003756]/10 text-[#003756]',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    critical: 'bg-red-50 border-red-200 text-red-900',
  };
  return (
    <div className={`rounded-xl border p-5 text-[14px] font-medium leading-relaxed ${styles[type]}`}>
      {children}
    </div>
  );
}

// ── Problem card ──
function ProblemCard({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#003756]/[.08] bg-white p-6 hover:shadow-lg transition-shadow duration-300">
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-8 h-8 rounded-full bg-[#FF5050]/10 text-[#FF5050] flex items-center justify-center text-[13px] font-bold">{number}</div>
        <div className="flex-1">
          <h4 className="text-[16px] font-bold text-[#003756] mb-2">{title}</h4>
          <div className="text-[14px] text-[#3D4F5F] leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}

// ── Question item ──
function QuestionItem({ number, children, internal = false }: { number: number; children: React.ReactNode; internal?: boolean }) {
  return (
    <div className={`py-4 border-b border-[#003756]/[.06] last:border-0 ${internal ? 'pl-4 border-l-2 border-amber-300' : ''}`}>
      <div className="flex items-start gap-3">
        <span className={`shrink-0 text-[12px] font-bold ${internal ? 'text-amber-500' : 'text-[#003756]/40'}`}>Q{number}</span>
        <div className="text-[14px] text-[#3D4F5F] leading-relaxed font-medium">{children}</div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════

export default function NassauBudgetReview() {
  const [authenticated, setAuthenticated] = useState(() => {
    return sessionStorage.getItem('nassau-auth') === 'true';
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '08540') {
      sessionStorage.setItem('nassau-auth', 'true');
      setAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPassword('');
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-white font-['Outfit',system-ui,sans-serif] flex items-center justify-center">
        <div className="w-full max-w-sm mx-auto px-6">
          <div className="text-center mb-8">
            <div className="text-[15px] font-extrabold text-[#003756] mb-1">195 Nassau</div>
            <div className="text-[12px] text-[#003756]/40 font-medium">Marketing Budget Review</div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(false); }}
                placeholder="Enter password"
                autoFocus
                className={`w-full px-4 py-3 rounded-xl border ${error ? 'border-[#FF5050] bg-red-50/30' : 'border-[#003756]/[.12]'} text-[15px] text-[#003756] font-medium placeholder:text-[#003756]/30 focus:outline-none focus:border-[#003756]/30 focus:ring-2 focus:ring-[#9EFAFF]/40 transition-colors`}
              />
              {error && <p className="mt-2 text-[13px] text-[#FF5050] font-medium">Incorrect password.</p>}
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#003756] text-white text-[14px] font-bold hover:bg-[#003756]/90 transition-colors"
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

  // Table of contents tracking
  useEffect(() => {
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
  }, []);

  const tocItems = [
    { id: 'opening', label: 'Opening Statement' },
    { id: 'property', label: 'Property Profile' },
    { id: 'affordable', label: 'Affordable Housing' },
    { id: 'submitted', label: 'Submitted Budget' },
    { id: 'critique', label: 'Strategic Critique' },
    { id: 'cac-ltv', label: 'CAC / LTV Analysis' },
    { id: 'outreach', label: 'Outreach Plan' },
    { id: 'absorption', label: 'Absorption Model' },
    { id: 'recommended', label: 'Revised Budget' },
    { id: 'reporting', label: 'Monthly Reporting' },
    { id: 'clarification', label: 'Greystar Clarification' },
    { id: 'vacancy', label: 'Vacancy vs. Marketing' },
    { id: 'bottom-line', label: 'Bottom Line' },
    { id: 'ab-test', label: 'Local Team Test' },
    { id: 'questions', label: 'Follow-Up Questions' },
  ];

  return (
    <div className="min-h-screen bg-white font-['Outfit',system-ui,sans-serif]">

      {/* ── Sticky nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#003756]/[.06]">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[15px] font-extrabold text-[#003756]">195 Nassau</span>
            <span className="text-[12px] text-[#003756]/40 font-medium hidden sm:inline">Marketing Budget Review</span>
          </div>
          <div className="text-[11px] font-bold uppercase tracking-[.12em] text-[#FF5050]">Confidential</div>
        </div>
      </nav>

      {/* ── Sidebar TOC (desktop) ── */}
      <aside className="hidden xl:block fixed left-0 top-14 bottom-0 w-56 border-r border-[#003756]/[.06] bg-[#FAFAFA] overflow-y-auto">
        <div className="p-5 pt-8">
          <div className="text-[10px] font-bold uppercase tracking-[.15em] text-[#003756]/30 mb-4">Contents</div>
          {tocItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`block py-1.5 text-[12px] font-medium transition-colors ${activeSection === item.id ? 'text-[#003756] font-semibold' : 'text-[#003756]/40 hover:text-[#003756]/70'}`}
            >
              {item.label}
            </a>
          ))}
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="xl:ml-56 pt-14">
        <div className="max-w-[860px] mx-auto px-6 lg:px-10">

          {/* ══════════ HERO ══════════ */}
          <Section className="pt-16 md:pt-24 pb-16">
            <SectionLabel>Owner's Assessment — February 2026</SectionLabel>
            <h1 className="text-[2.25rem] md:text-[3rem] lg:text-[3.5rem] font-extrabold text-[#003756] leading-[1.08] tracking-tight">
              195 Nassau Street
            </h1>
            <p className="text-[1.1rem] md:text-[1.25rem] text-[#3D4F5F] mt-4 font-medium leading-relaxed max-w-[640px]">
              Marketing Budget Review &amp; Recommendation for a 45-unit luxury lease-up in Princeton, NJ.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
              <Stat value="$111K" label="Greystar's Budget" />
              <Stat value="$182K" label="Recommended" accent />
              <Stat value="76%" label="Oct Occ. (Current)" />
              <Stat value="100%" label="Oct Occ. (Revised)" accent />
            </div>
          </Section>

          {/* ══════════ OPENING STATEMENT & TL;DR ══════════ */}
          <Section id="opening" className="pb-16">
            <div data-toc id="opening" />
            <div className="border-l-4 border-[#9EFAFF] pl-6 md:pl-8 space-y-4 text-[16px] md:text-[17px] text-[#3D4F5F] leading-relaxed font-medium max-w-[720px]">
              <p>
                Greystar submitted a <strong className="text-[#003756]">$110,991 marketing budget</strong> for our 45-unit luxury lease-up at $6,000/month rents in downtown Princeton. With pre-leasing starting in weeks, we took a close look to make sure the plan is calibrated to this asset and our <strong className="text-[#003756]">October 31 stabilization target</strong>.
              </p>
              <p>
                The budget provides a solid digital foundation — SEM, ILS, social media, creative production. Where we see an opportunity is in supplementing that digital base with the <strong className="text-[#003756]">relationship-driven channels</strong> that tend to reach the $6,000/month Princeton renter: university housing coordinators, employer relocation programs, and local broker networks. We'd also like to see explicit absorption targets tied to the spend curve.
              </p>
              <p>
                Greystar's submission did not include absorption projections or a stabilization timeline, so we built our own. Using their monthly spend curve, the size and price point of the asset, and Princeton's rental market characteristics, <strong className="text-[#003756]">our model projects the current budget reaches roughly 76% occupied by October</strong>. Closing that gap to 100% is worth approximately <strong className="text-[#003756]">$264,000 in avoided vacancy</strong> — which is why we're recommending a <strong className="text-[#003756]">$182,000 budget</strong>. The incremental $71K pays for itself if it accelerates lease-up by just 10 days.
              </p>
              <p>
                These projections are ownership's — not Greystar's. One of our first asks is for Greystar to provide their own absorption targets so we can compare. Critically, <strong className="text-[#003756]">the budget is not a fixed commitment — it's a starting position backed by hard numbers</strong>. We test across channels for the first 3-4 months, measure what's working, and pour fuel on the winners. If something isn't converting, we cut it. If a channel is outperforming, we amplify it. The point is to have enough budget allocated — based on industry benchmarks and unit economics — to cover the downside. This document walks through the full analysis along with <strong className="text-[#003756]">41 questions</strong> we'd like to align on with Greystar before finalizing.
              </p>
            </div>

            {/* ── TL;DR Box ── */}
            <div className="mt-10 rounded-2xl bg-[#003756] p-6 md:p-8">
              <div className="text-[11px] font-bold uppercase tracking-[.15em] text-white/40 mb-4">Executive Summary</div>
              <ul className="space-y-3">
                {[
                  ['Current budget projects', '~76% occupied by October. We believe we can close the gap to 100%.'],
                  ['Recommended budget: $182K', 'Adds relationship-driven channels alongside Greystar\'s digital plan.'],
                  ['Each tenant generates ~$170K', 'in lifetime value. At $4,800 to acquire, that\'s a 35-to-1 return.'],
                  ['The incremental $71K', 'pays for itself if it fills the building 10 days faster. We project 6 months.'],
                  ['Key additions:', 'University & employer outreach ($12.5K), local team — broker + marketing ($15K), contingency reserve ($14.5K).'],
                  ['Recommended reallocations:', 'ORM ($2.9K) and Digible ($2K) redirected to higher-impact channels. Brindle managed ownership-direct.'],
                  ['Test, measure, amplify.', 'Budget is a starting position, not a ceiling. 3-4 month test period, then pour fuel on what\'s working.'],
                ].map(([bold, rest], i) => (
                  <li key={i} className="flex items-start gap-3 text-[14px] md:text-[15px] text-white/90 font-medium leading-relaxed">
                    <span className="shrink-0 mt-1 text-[#9EFAFF]">{'\u2192'}</span>
                    <span><strong className="text-white">{bold}</strong> {rest}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Section>

          <hr className="border-[#003756]/[.06]" />

          {/* ══════════ I. PROPERTY PROFILE ══════════ */}
          <Section id="property" className="py-16 md:py-24">
            <div data-toc id="property" />
            <SectionLabel>Section I</SectionLabel>
            <h2 className="text-[1.75rem] md:text-[2.25rem] font-extrabold text-[#003756] mb-8">Property Profile</h2>

            <Table
              headers={['Detail', 'Value']}
              rows={[
                [<span className="font-semibold text-[#003756]">Address</span>, '195 Nassau Street, Princeton, NJ 08542'],
                [<span className="font-semibold text-[#003756]">Website</span>, <a href="https://195nassau.com" target="_blank" rel="noopener noreferrer" className="text-[#003756] underline decoration-[#9EFAFF] underline-offset-2 hover:decoration-[#003756] transition-colors">195nassau.com</a>],
                [<span className="font-semibold text-[#003756]">Units</span>, '45 (15 distinct layouts)'],
                [<span className="font-semibold text-[#003756]">Unit Mix</span>, '1BR, 2BR, 3BR'],
                [<span className="font-semibold text-[#003756]">Type</span>, 'Conventional Luxury, New Construction'],
                [<span className="font-semibold text-[#003756]">Construction</span>, '100% Electric, Zero Fossil Fuel'],
                [<span className="font-semibold text-[#003756]">Operator</span>, 'Greystar'],
                [<span className="font-semibold text-[#003756]">Pre-Leasing</span>, 'March–April 2026 (2 months)'],
                [<span className="font-semibold text-[#003756]">First Deliveries</span>, 'May 1, 2026'],
                [<span className="font-semibold text-[#003756]">Lease-Up Period</span>, 'May–October 2026 (6 months)'],
                [<span className="font-semibold text-[#003756]">Average Market Rent</span>, '$6,000/mo'],
                [<span className="font-semibold text-[#003756]">Target Stabilization</span>, <span className="font-bold text-[#003756]">October 31, 2026</span>],
              ]}
            />

            <div className="mt-10">
              <h3 className="text-[18px] font-bold text-[#003756] mb-3">The Product</h3>
              <p className="text-[14px] text-[#3D4F5F] leading-relaxed font-medium">
                195 Nassau is a boutique luxury asset at the intersection of Princeton University's campus and downtown Princeton. Unit finishes include LG Smart Appliances, Air Sous Vide induction ranges, Carrera Marmi waterfall countertops, Calacatta Vicenza tile, smart mirrors, Mortise smart locks, in-unit W/D, private balconies, and wide-plank flooring.
              </p>
              <p className="text-[14px] text-[#3D4F5F] leading-relaxed font-medium mt-3">
                Amenities: largest private fitness center in downtown Princeton, rooftop lounge with panoramic views, sports simulator, co-working spaces, pet spa, EV charging, infrared sauna, and raised herb gardens.
              </p>
              <Callout type="info">
                <strong>This is not a commodity apartment.</strong> It is a lifestyle product competing for a narrow, affluent renter demographic in one of the most prestigious zip codes in America.
              </Callout>
            </div>

            <div className="mt-10">
              <h3 className="text-[18px] font-bold text-[#003756] mb-3">The Target Renter</h3>
              <p className="text-[14px] text-[#3D4F5F] leading-relaxed font-medium mb-3">The person paying $72,000/year in rent at 195 Nassau is:</p>
              <ul className="space-y-2">
                {[
                  'Princeton University senior faculty, administrators, visiting scholars ($150K–$400K+ HHI)',
                  'Visiting scholars and fellows at Princeton-area research institutions (IAS, PPPL, CTI, ETS, and others — 500+ rotating annually)',
                  'Executives at Bristol-Myers Squibb, NRG Energy, ETS, Dow Jones',
                  'Partners at Princeton-area law and financial firms',
                  'Affluent empty nesters downsizing from $1.5M+ homes',
                  'High-income remote professionals seeking the Princeton address',
                  'Medical professionals from Penn Medicine Princeton Health',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[14px] text-[#3D4F5F] font-medium">
                    <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-[#9EFAFF]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Section>

          <hr className="border-[#003756]/[.06]" />

          {/* ══════════ II. AFFORDABLE HOUSING ══════════ */}
          <Section id="affordable" className="py-16 md:py-24">
            <div data-toc id="affordable" />
            <SectionLabel>Section II</SectionLabel>
            <h2 className="text-[1.75rem] md:text-[2.25rem] font-extrabold text-[#003756] mb-4">Affordable Housing Adjustment</h2>
            <p className="text-[14px] text-[#3D4F5F] leading-relaxed font-medium mb-8">
              Princeton requires a <strong>20% inclusionary affordable housing set-aside</strong> per Municipal Ordinance #2020-15. Affordable units split between moderate-income (80% AMI) and low-income (50% AMI) with rents capped at 30% of household income.
            </p>

            <Table
              headers={['Tier', 'Units', '% of Total', 'Est. Rent/Mo', 'Annual Rent']}
              rows={[
                ['Market Rate', '36', '80%', '$6,000', '$72,000'],
                ['Affordable — Moderate (80% AMI)', '5', '11%', '$1,800', '$21,600'],
                ['Affordable — Low (50% AMI)', '4', '9%', '$1,200', '$14,400'],
                [<strong>Total</strong>, <strong>45</strong>, <strong>100%</strong>, '—', '—'],
              ]}
              compact
            />

            <div className="mt-8">
              <h3 className="text-[18px] font-bold text-[#003756] mb-4">Revenue Impact</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl bg-[#FAFAFA] border border-[#003756]/[.08] p-5">
                  <div className="text-[11px] font-bold uppercase tracking-[.1em] text-[#003756]/40">Annual Gross (Market Only)</div>
                  <div className="text-[1.5rem] font-extrabold text-[#003756] mt-1">$3,240,000</div>
                </div>
                <div className="rounded-xl bg-[#FAFAFA] border border-[#003756]/[.08] p-5">
                  <div className="text-[11px] font-bold uppercase tracking-[.1em] text-[#003756]/40">Annual Gross (Adjusted)</div>
                  <div className="text-[1.5rem] font-extrabold text-[#003756] mt-1">$2,743,200</div>
                </div>
                <div className="rounded-xl bg-red-50 border border-red-200 p-5">
                  <div className="text-[11px] font-bold uppercase tracking-[.1em] text-red-400">Revenue Delta</div>
                  <div className="text-[1.5rem] font-extrabold text-[#FF5050] mt-1">-$496,800</div>
                </div>
              </div>
            </div>

            <Callout type="info">
              The 9 affordable units fill from Princeton's waitlist (500+ households deep). <strong>The entire marketing challenge is leasing 36 market-rate units at $6,000/month to a narrow, affluent demographic.</strong>
            </Callout>
          </Section>

          <hr className="border-[#003756]/[.06]" />

          {/* ══════════ III. SUBMITTED BUDGET ══════════ */}
          <Section id="submitted" className="py-16 md:py-24">
            <div data-toc id="submitted" />
            <SectionLabel>Section III</SectionLabel>
            <h2 className="text-[1.75rem] md:text-[2.25rem] font-extrabold text-[#003756] mb-4">Submitted Budget Summary</h2>
            <p className="text-[20px] font-bold text-[#003756] mb-8">What Greystar Submitted: <span className="text-[#FF5050]">$110,991</span></p>

            <Table
              headers={['Category', 'Start-Up', 'Pre-Leasing', 'Lease-Up', 'Grand Total']}
              rows={[
                ['Non-Recurring (Creative)', '$8,360', '$1,503', '$0', '$1,503'],
                ['Advertising (Digital + Traditional)', '$29,089', '$28,202', '$68,536', '$96,738'],
                ['On-Site Experience', '$500', '$200', '$800', '$1,000'],
                ['Resident Marketing', '$0', '$0', '$11,750', '$11,750'],
                [<strong>GRAND TOTAL</strong>, <strong>$37,949</strong>, <strong>$29,905</strong>, <strong>$81,086</strong>, <strong className="text-[#FF5050]">$110,991</strong>],
              ]}
              compact
            />

            <div className="mt-10">
              <h3 className="text-[18px] font-bold text-[#003756] mb-4">Spend by Line Item (Top 10)</h3>
              <Table
                headers={['#', 'Line Item', 'Total', 'Notes']}
                rows={[
                  ['1', 'SEM / PPC (Wpromote)', '$37,500', '$4,500/mo tapering to $2,000'],
                  ['2', 'Signage', '$20,000', 'Estimated — no bids'],
                  ['3', 'Broker / Locator Fees', '$19,500', '3 leases at ~1 month rent'],
                  ['4', 'Zillow (Signature Tier)', '$11,804', 'Signature through lease-up'],
                  ['5', 'Resident Retention', '$11,750', 'Move-in gifts + two undefined $4K events'],
                  ['6', 'Creative / Content', '$8,360', 'Photography, virtual tours, video'],
                  ['7', 'Social Media Mgmt (Envida)', '$7,250', 'Real Reach → Just Cool'],
                  ['8', 'Paid Social', '$3,500', '$500/mo'],
                  ['9', 'SEO (Greystar Standard)', '$3,500', '$350/mo'],
                  ['10', 'ORM / Reputation', '$2,888', 'Essentials Bundle'],
                ]}
                compact
              />
            </div>

            <div className="mt-10">
              <h3 className="text-[18px] font-bold text-[#003756] mb-4">Reading the Spend Curve</h3>
              <p className="text-[14px] text-[#3D4F5F] leading-relaxed font-medium mb-6">
                The submitted budget did not include absorption targets, an occupancy curve, or a stabilization date. To evaluate whether the spend is sufficient, we mapped Greystar's month-by-month allocation and looked at what the spend trajectory implies about their expected pace:
              </p>
              <Table
                headers={['Month', 'Spend', 'Signal']}
                rows={[
                  ['March', '$12,116', 'Launch — heavy setup'],
                  ['April', '$17,789', 'Peak pre-lease'],
                  ['May–Aug', '$11,649–$15,499', 'Sustained push'],
                  [<span className="text-[#FF5050] font-bold">September</span>, <span className="text-[#FF5050] font-bold">$8,999</span>, <span className="text-[#FF5050] font-bold">Sharp drop — taper begins</span>],
                  [<span className="text-[#FF5050] font-bold">October</span>, <span className="text-[#FF5050] font-bold">$3,839</span>, <span className="text-[#FF5050] font-bold">Near-maintenance level</span>],
                  ['Nov–Dec', '$4,368–$7,839', 'Maintenance + retention bump'],
                ]}
                compact
              />
              <Callout type="warning">
                <strong>Our target is 100% occupied by October 31, 2026.</strong> The spend curve begins tapering in September and drops to near-maintenance by October. This may reflect a longer lease-up assumption — possibly 10-12 months — whereas our timeline requires sustained momentum through October. We'd like Greystar to confirm their expected pace and whether this taper is intentional.
              </Callout>
            </div>
          </Section>

          <hr className="border-[#003756]/[.06]" />

          {/* ══════════ IV. STRATEGIC CRITIQUE ══════════ */}
          <Section id="critique" className="py-16 md:py-24">
            <div data-toc id="critique" />
            <SectionLabel>Section IV</SectionLabel>
            <h2 className="text-[1.75rem] md:text-[2.25rem] font-extrabold text-[#003756] mb-8">Strategic Critique</h2>

            <div className="grid gap-4">
              <ProblemCard number={1} title="Channel Mix Doesn't Match the Renter">
                <p>Over 70% of spend targets mass-market digital channels (SEM, ILS, SEO). The $6,000/month Princeton renter is found through university housing coordinators, employer relocation programs, and word of mouth. <strong>None of those channels appear in this budget.</strong></p>
              </ProblemCard>

              <ProblemCard number={2} title="SEM is NYC-Scaled for a Princeton Market">
                <p>$37,500 total / $4,500 per month is the largest line item. Princeton is not a high-volume search market. At $4,500/month, you'll hit diminishing returns. <strong>Position:</strong> Start at $3,000/mo, scale only if data supports it.</p>
              </ProblemCard>

              <ProblemCard number={3} title="Zillow Signature is Overweight">
                <p>$11,804 on Zillow's premium Signature tier for 45 units. The $6K renter uses Zillow for validation, not discovery. <strong>Position:</strong> Downgrade to Platinum or Gold. Save $3,000–$5,000.</p>
              </ProblemCard>

              <ProblemCard number={4} title="$0 on University & Employer Outreach">
                <p>The building is surrounded by Princeton University on three sides. Zero budgeted for university housing partnerships, research institution coordination, or employer relocation programs. <strong>Position:</strong> Allocate $12,000.</p>
              </ProblemCard>

              <ProblemCard number={5} title="Paid Social is Underweight">
                <p>$500/month for a visually stunning luxury product. Instagram, Facebook, and LinkedIn are ideal for this demographic. <strong>Position:</strong> Increase to $1,250/month peak. Add LinkedIn.</p>
              </ProblemCard>

              <ProblemCard number={6} title="Broker Budget Assumes Wrong Market">
                <p>$19,500 for 3 broker leases. Princeton doesn't have NYC's broker culture. <strong>Position:</strong> Reduce to $13,000 (2 leases).</p>
              </ProblemCard>

              <ProblemCard number={7} title="$8,000 Undefined">
                <p>Two $4,000 lump sums in "Resident Retention — Other" with no description. <strong>Position:</strong> Define specific activations or remove.</p>
              </ProblemCard>

              <ProblemCard number={8} title="No Contingency Reserve">
                <p>No mechanism to shift spend mid-lease-up. <strong>Position:</strong> Build $14,488 contingency reserve.</p>
              </ProblemCard>

              <ProblemCard number={9} title="Apartments.com Status Unclear">
                <p>Setup page shows Diamond Plus. Media schedule shows $0. <strong>Position:</strong> Clarify if covered corporately.</p>
              </ProblemCard>
            </div>

            {/* Problem 10 — Vendor Stack — expanded treatment */}
            <div className="mt-8 rounded-2xl border-2 border-[#FF5050]/20 bg-red-50/30 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-[#FF5050]/10 text-[#FF5050] flex items-center justify-center text-[13px] font-bold">10</div>
                <h4 className="text-[18px] font-bold text-[#003756]">Greystar's Vendor Stack Is Enterprise Boilerplate</h4>
              </div>
              <p className="text-[14px] text-[#3D4F5F] leading-relaxed font-medium mb-6">
                $16,428 flows to vendor services that are Greystar enterprise partnerships deployed across 800,000+ units. Efficient at scale — not calibrated for a 45-unit boutique luxury asset.
              </p>

              <div className="space-y-4">
                {[
                  { name: 'ORM ($2,888)', verdict: 'Cut', color: 'red', desc: 'Zero residents, zero reviews, zero reputation to manage. Listing management already covered by SEO ($3,500). Double-dipping.' },
                  { name: 'Brindle Website ($2,100)', verdict: 'Remove from GS budget', color: 'amber', desc: 'Ownership\'s vendor — we hired Brindle directly. Should not be a Greystar line item. Manage hosting relationship directly.' },
                  { name: 'Digible Paid Email ($2,000)', verdict: 'Cut', color: 'red', desc: 'Cold email blasts to purchased renter lists. Volume play for $1,500/mo apartments, not luxury. Wrong channel, wrong renter.' },
                  { name: 'Envida Social Media ($7,250)', verdict: 'Reallocate', color: 'amber', desc: 'Fair price, wrong approach. Templated content from Scottsdale, AZ for a boutique Princeton building. Replace with local freelancer.' },
                  { name: 'Hy.ly Email ($2,190)', verdict: 'Keep', color: 'green', desc: 'Legitimate platform, market-rate price ($189/mo). Arguably overkill for 45 units but integrates with Greystar\'s CRM.' },
                ].map((v, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl bg-white border border-[#003756]/[.06] p-4">
                    <span className={`shrink-0 mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${v.color === 'red' ? 'bg-red-100 text-red-600' : v.color === 'amber' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>{v.verdict}</span>
                    <div>
                      <div className="text-[14px] font-bold text-[#003756]">{v.name}</div>
                      <div className="text-[13px] text-[#3D4F5F] mt-1">{v.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-[14px] font-bold text-[#003756]">
                Net redeployable savings: <span className="text-[#FF5050]">$6,988–$11,100</span>
              </div>
            </div>

            <ProblemCard number={11} title="Website Floor Plans Don't Load">
              <p>Rent Fetch widget doesn't populate pricing or layouts. <strong>Position:</strong> Fix before March 1 launch.</p>
            </ProblemCard>

            {/* What's missing */}
            <div className="mt-10">
              <h3 className="text-[18px] font-bold text-[#003756] mb-4">What's Missing Entirely</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  ['University/Employer Outreach', 'Highest-ROI channel. $0 budgeted.'],
                  ['Resident Referral Program', 'Early residents are affluent and connected.'],
                  ['PR / Earned Media', '100% electric construction = editorial story.'],
                  ['LinkedIn Advertising', 'Only platform targeting by employer, title, income.'],
                  ['Private Preview Event', '3-5 leases from one $3,500 event.'],
                  ['Monthly Absorption Targets', 'No occupancy goals overlaid on spend.'],
                ].map(([gap, impact], i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                    <span className="shrink-0 mt-0.5 text-amber-400 text-[16px]">⚠</span>
                    <div>
                      <div className="text-[13px] font-bold text-[#003756]">{gap}</div>
                      <div className="text-[12px] text-[#3D4F5F]">{impact}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          <hr className="border-[#003756]/[.06]" />

          {/* ══════════ V. CAC / LTV ══════════ */}
          <Section id="cac-ltv" className="py-16 md:py-24">
            <div data-toc id="cac-ltv" />
            <SectionLabel>Section V</SectionLabel>
            <h2 className="text-[1.75rem] md:text-[2.25rem] font-extrabold text-[#003756] mb-4">CAC / LTV Analysis</h2>

            <Callout type="info">
              A tenant paying $6,000/month costs ~$3,000–$4,400 to acquire. That tenant is worth <strong>$170,000</strong> over their lifetime. For every $1 spent on marketing, you get back <strong>$39–$58 in rent</strong>. Even at our higher budget, you're under-spending relative to tenant value.
            </Callout>

            <div className="mt-10">
              <h3 className="text-[18px] font-bold text-[#003756] mb-4">Market-Rate LTV ($6,000/mo)</h3>
              <Table
                headers={['Year', 'Monthly Rent', 'Annual Rent', 'Prob. Remains', 'Expected Rev.', 'Cumulative LTV']}
                rows={[
                  ['1', '$6,000', '$72,000', '100%', '$72,000', '$72,000'],
                  ['2', '$6,180', '$74,160', '70%', '$51,912', '$123,912'],
                  ['3', '$6,365', '$76,385', '42%', '$32,082', '$155,994'],
                  ['4', '$6,556', '$78,677', '21%', '$16,522', '$172,516'],
                  ['5', '$6,753', '$81,037', '10.5%', '$8,509', '$181,025'],
                ]}
                compact
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <Stat value="$169,825" label="Net LTV Per Tenant" accent />
                <Stat value="26.4 mo" label="Avg. Tenancy" />
                <Stat value="$8,000" label="Turnover Cost" />
              </div>
            </div>

            <div className="mt-10">
              <h3 className="text-[18px] font-bold text-[#003756] mb-4">CAC Comparison</h3>
              <Table
                headers={['', 'Current ($111K)', 'Recommended ($182K)']}
                rows={[
                  [<strong>Budget (Market-Rate, 95%)</strong>, '$105,441', '$172,900'],
                  [<strong>CAC Per Lease</strong>, '$2,929', '$4,803'],
                  [<strong>Net LTV</strong>, '$169,825', '$169,825'],
                  [<strong className="text-[#003756]">LTV:CAC</strong>, <span className="text-[#FF5050] font-bold">58:1</span>, <span className="text-[#003756] font-bold">35:1</span>],
                ]}
              />

              <div className="mt-6">
                <h4 className="text-[15px] font-bold text-[#003756] mb-3">Industry Benchmarks</h4>
                <Table
                  headers={['Segment', 'Typical LTV:CAC']}
                  rows={[
                    ['SaaS Software', '3:1 to 5:1'],
                    ['E-Commerce', '3:1 to 4:1'],
                    ['Class A Multifamily', '30:1 to 50:1'],
                    ['Luxury Lease-Up', '20:1 to 40:1'],
                    [<strong>195 Nassau — Current</strong>, <span className="text-[#FF5050] font-bold">58:1 (under-spending)</span>],
                    [<strong>195 Nassau — Recommended</strong>, <span className="text-green-600 font-bold">35:1 (optimal range)</span>],
                  ]}
                  compact
                />
              </div>
            </div>

            <div className="mt-10">
              <h3 className="text-[18px] font-bold text-[#003756] mb-4">Maximum Defensible Budget</h3>
              <Table
                headers={['Target LTV:CAC', 'Implied Max CAC', 'Total Budget']}
                rows={[
                  ['50:1 (conservative)', '$3,397', '~$129,000'],
                  [<strong className="text-[#003756]">35:1 (recommended)</strong>, <strong>$4,852</strong>, <strong className="text-[#003756]">~$182,000</strong>],
                  ['30:1 (aggressive, justified)', '$5,661', '~$214,500'],
                  ['20:1 (maximum defensible)', '$8,491', '~$321,750'],
                ]}
                compact
              />
            </div>
          </Section>

          <hr className="border-[#003756]/[.06]" />

          {/* ══════════ VI. OUTREACH PLAN ══════════ */}
          <Section id="outreach" className="py-16 md:py-24">
            <div data-toc id="outreach" />
            <SectionLabel>Section VI</SectionLabel>
            <h2 className="text-[1.75rem] md:text-[2.25rem] font-extrabold text-[#003756] mb-8">University &amp; Employer Outreach Plan</h2>

            <div className="space-y-8">
              <div>
                <h3 className="text-[18px] font-bold text-[#003756] mb-3">Phase 1: Pre-Leasing (March–April) — $7,500</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { title: 'Princeton University Partnership', cost: '$1,500', items: ['University Housing Office off-campus list', 'Faculty Housing Coordinator outreach', 'Target heavy-hiring departments', '2-3 coordinator lunches'] },
                    { title: 'Research Institutions & Visiting Scholars', cost: '$1,000', items: ['IAS, PPPL, CTI, ETS, Mathematica — 500+ rotating scholars/fellows annually', 'Housing coordinator outreach at each institution', 'Potential: 5-8 leases/year'] },
                    { title: 'Employer Outreach', cost: '$2,000', items: ['Corporate partnerships deck', 'Target: BMS, NRG, ETS, Dow Jones, Penn Medicine', 'HR director meetings'] },
                    { title: 'Private Preview Event', cost: '$3,500', items: ['Invite-only, 30-40 people', 'University coordinators, agents, HR, press', 'Projected: 3-5 direct leases'] },
                  ].map((phase, i) => (
                    <div key={i} className="rounded-xl border border-[#003756]/[.08] p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-[14px] font-bold text-[#003756]">{phase.title}</h4>
                        <span className="text-[12px] font-bold text-[#9EFAFF] bg-[#003756] px-2 py-0.5 rounded">{phase.cost}</span>
                      </div>
                      <ul className="space-y-1.5">
                        {phase.items.map((item, j) => (
                          <li key={j} className="flex items-start gap-2 text-[13px] text-[#3D4F5F]">
                            <span className="shrink-0 mt-1.5 w-1 h-1 rounded-full bg-[#003756]/30" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Stat value="$12K" label="Total Outreach Budget" />
                <Stat value="8–12" label="Projected Leases" />
                <Stat value="$1,000–$1,500" label="CPL (Outreach)" />
                <Stat value="$6,500" label="CPL (Broker)" />
              </div>
            </div>
          </Section>

          <hr className="border-[#003756]/[.06]" />

          {/* ══════════ VII. ABSORPTION MODEL ══════════ */}
          <Section id="absorption" className="py-16 md:py-24">
            <div data-toc id="absorption" />
            <SectionLabel>Section VII</SectionLabel>
            <h2 className="text-[1.75rem] md:text-[2.25rem] font-extrabold text-[#003756] mb-8">Absorption Model — October Stabilization</h2>

            <Callout type="info">
              <strong>Note on methodology:</strong> Greystar did not provide absorption projections. The scenarios below are ownership's estimates based on Greystar's monthly spend curve, the asset's size and price point (45 units at $6,000/mo), Princeton's rental market characteristics, and standard luxury lease-up conversion benchmarks. We've asked Greystar to provide their own targets as part of our follow-up questions (Q1, Q2).
            </Callout>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
              {/* Scenario A */}
              <div className="rounded-2xl border-2 border-[#FF5050]/20 p-6">
                <h3 className="text-[16px] font-bold text-[#FF5050] mb-4">Scenario A: Current Budget ($111K)</h3>
                <Table
                  headers={['Month', 'MR Leases', 'Total', 'Occ.']}
                  rows={[
                    ['Mar', '3 signed', '3', '—'],
                    ['Apr', '3 signed', '6', '—'],
                    ['May', '4', '19', '42%'],
                    ['Jun', '4', '23', '51%'],
                    ['Jul', '3', '26', '58%'],
                    ['Aug', '3', '29', '64%'],
                    ['Sep', '3', '32', '71%'],
                    [<strong className="text-[#FF5050]">Oct</strong>, <strong className="text-[#FF5050]">2</strong>, <strong className="text-[#FF5050]">34</strong>, <strong className="text-[#FF5050]">76%</strong>],
                  ]}
                  compact
                />
                <div className="mt-4 text-[13px] font-bold text-[#FF5050]">
                  Projected result: 76% occupied. 11 vacant units.<br />
                  Est. stabilization: April 2027.<br />
                  Est. vacancy cost: ~$264,000.
                </div>
              </div>

              {/* Scenario B */}
              <div className="rounded-2xl border-2 border-[#003756]/20 bg-[#003756]/[.02] p-6">
                <h3 className="text-[16px] font-bold text-[#003756] mb-4">Scenario B: Recommended ($182K)</h3>
                <Table
                  headers={['Month', 'MR Leases', 'Total', 'Occ.']}
                  rows={[
                    ['Mar', '5 signed', '5', '—'],
                    ['Apr', '5 signed', '10', '—'],
                    ['May', '5', '24', '53%'],
                    ['Jun', '5', '29', '64%'],
                    ['Jul', '5', '34', '76%'],
                    ['Aug', '4', '38', '84%'],
                    ['Sep', '4', '42', '93%'],
                    [<strong className="text-[#003756]">Oct</strong>, <strong className="text-[#003756]">3</strong>, <strong className="text-[#003756]">45</strong>, <strong className="text-green-600">100%</strong>],
                  ]}
                  compact
                />
                <div className="mt-4 text-[13px] font-bold text-green-600">
                  Result: 100% occupied by October 31.<br />
                  Target met.<br />
                  Vacancy cost: $0.
                </div>
              </div>
            </div>

            {/* The Delta */}
            <div className="mt-10 rounded-2xl bg-[#003756] p-6 md:p-8">
              <h3 className="text-[18px] font-bold text-white mb-4">The Delta</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[.1em] text-white/40">Vacancy Cost Avoided</div>
                  <div className="text-[1.5rem] font-extrabold text-[#9EFAFF] mt-1">$264,000</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[.1em] text-white/40">Incremental Spend</div>
                  <div className="text-[1.5rem] font-extrabold text-white mt-1">$71,009</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[.1em] text-white/40">ROI</div>
                  <div className="text-[1.5rem] font-extrabold text-[#9EFAFF] mt-1">3.7:1</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[.1em] text-white/40">Breakeven</div>
                  <div className="text-[1.5rem] font-extrabold text-[#9EFAFF] mt-1">10 days</div>
                </div>
              </div>
              <p className="text-[13px] text-white/60 mt-4 font-medium">
                The incremental $71K pays for itself if it fills the building 10 days faster. Our model projects 6 months faster.
              </p>
            </div>
          </Section>

          <hr className="border-[#003756]/[.06]" />

          {/* ══════════ VIII. REVISED BUDGET ══════════ */}
          <Section id="recommended" className="py-16 md:py-24">
            <div data-toc id="recommended" />
            <SectionLabel>Section VIII</SectionLabel>
            <h2 className="text-[1.75rem] md:text-[2.25rem] font-extrabold text-[#003756] mb-8">Revised Budget Recommendation</h2>

            <div className="overflow-x-auto -mx-6 px-6">
              <Table
                headers={['Line Item', 'Current', 'Recommended', 'Change']}
                rows={[
                  ['SEM / PPC (Wpromote)', '$37,500', '$37,500', '—'],
                  ['Zillow (→ Platinum)', '$11,804', '$7,800', '-$4,004'],
                  ['Apartment List (PPL)', '$395', '$2,500', '+$2,105'],
                  ['Paid Social', '$3,500', '$10,000', '+$6,500'],
                  ['LinkedIn Advertising', '$0', '$3,500', '+$3,500'],
                  ['SEO', '$3,500', '$3,500', '—'],
                  ['Social Mgmt (Envida)', '$7,250', '$7,250', '—'],
                  ['Email (Hy.ly)', '$2,190', '$2,190', '—'],
                  [<span className="line-through text-[#003756]/40">Paid Email (Digible)</span>, '$2,000', <span className="text-[#FF5050] font-bold">$0</span>, <span className="text-[#FF5050]">Cut</span>],
                  [<span className="line-through text-[#003756]/40">Website (Brindle)</span>, '$2,100', <span className="text-[#FF5050] font-bold">$0</span>, <span className="text-amber-600">Ownership-direct</span>],
                  [<span className="line-through text-[#003756]/40">ORM / Reputation</span>, '$2,888', <span className="text-[#FF5050] font-bold">$0</span>, <span className="text-[#FF5050]">Cut</span>],
                  ['Creative / Content', '$8,360', '$10,360', '+$2,000'],
                  ['Signage', '$20,000', '$20,000', '—'],
                  ['Broker Fees', '$19,500', '$16,250', '-$3,250'],
                  [<strong className="text-[#003756]">University / Employer Outreach</strong>, '$0', <strong>$12,500</strong>, <span className="text-green-600 font-bold">+$12,500</span>],
                  [<strong className="text-[#003756]">PR / Earned Media</strong>, '$0', <strong>$3,000</strong>, <span className="text-green-600 font-bold">+$3,000</span>],
                  [<strong className="text-[#003756]">Private Preview Event</strong>, '$0', <strong>$3,500</strong>, <span className="text-green-600 font-bold">+$3,500</span>],
                  [<strong className="text-[#003756]">Referral Program</strong>, '$0', <strong>$3,750</strong>, <span className="text-green-600 font-bold">+$3,750</span>],
                  [<strong className="text-[#003756]">Local Team — Broker ($6K) + Marketing ($9K)</strong>, '$0', <strong>$15,000</strong>, <span className="text-green-600 font-bold">+$15,000</span>],
                  [<strong className="text-[#003756]">Contingency Reserve</strong>, '$0', <strong>$14,488</strong>, <span className="text-green-600 font-bold">+$14,488</span>],
                  [<strong className="text-[#003756] text-[16px]">GRAND TOTAL</strong>, <strong className="text-[#FF5050]">$110,991</strong>, <strong className="text-[#003756] text-[16px]">~$182,000</strong>, <strong className="text-[#003756]">+$71,009</strong>],
                ]}
                compact
              />
            </div>

            <div className="mt-10">
              <h3 className="text-[18px] font-bold text-[#003756] mb-4">Monthly Spend Curve — October Stabilization</h3>
              <Table
                headers={['Month', 'Spend', 'MR Target', 'Total Occ.', 'Key Activities']}
                rows={[
                  ['Mar', '$22,000', '5 signed', '—', 'Preview event, SEM launch, outreach blitz'],
                  ['Apr', '$21,000', '5 signed', '—', 'Full digital, university meetings, PR push'],
                  ['May', '$20,000', '5', '53%', 'Affordable fills, employer outreach'],
                  ['Jun', '$20,000', '5', '64%', 'Peak digital, Chamber event, referrals launch'],
                  ['Jul', '$19,000', '5', '76%', 'Sustained peak, local broker driving closings'],
                  ['Aug', '$18,000', '4', '84%', 'Second employer push, broker fees'],
                  ['Sep', '$16,000', '4', '93%', 'Faculty mixer — NO TAPER'],
                  [<strong>Oct</strong>, <strong>$10,000</strong>, <strong>3</strong>, <strong className="text-green-600">100%</strong>, <strong>Transition to retention</strong>],
                ]}
                compact
              />
              <Callout type="info">
                <strong>Critical difference vs. Greystar:</strong> Spend stays at $16K–$20K/month through September. No taper until the building is 93%+ leased.
              </Callout>
            </div>
          </Section>

          <hr className="border-[#003756]/[.06]" />

          {/* ══════════ IX. MONTHLY REPORTING ══════════ */}
          <Section id="reporting" className="py-16 md:py-24">
            <div data-toc id="reporting" />
            <SectionLabel>Section IX</SectionLabel>
            <h2 className="text-[1.75rem] md:text-[2.25rem] font-extrabold text-[#003756] mb-8">Required Monthly Reporting</h2>

            <p className="text-[14px] text-[#3D4F5F] font-medium mb-6">Greystar must deliver the following by the 5th of each month:</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
              {[
                'Leases Signed (Month) — by unit',
                'Cumulative Occupancy',
                'Leases vs. Absorption Target',
                'Leads by Channel',
                'CPL by Channel',
                'Cost Per Lease by Channel',
                'Website Traffic & Floor Plan Views',
                'Tour-to-Lease Conversion',
                'Budget vs. Actual',
                'Reallocation Recommendations',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-[#FAFAFA] border border-[#003756]/[.06] px-4 py-3">
                  <span className="text-[#9EFAFF] text-[14px]">✓</span>
                  <span className="text-[13px] font-medium text-[#3D4F5F]">{item}</span>
                </div>
              ))}
            </div>

            <h3 className="text-[18px] font-bold text-[#003756] mb-4">Amplification Strategy: Test → Measure → Pour Fuel</h3>
            <p className="text-[14px] text-[#3D4F5F] leading-relaxed font-medium mb-4">
              The budget is a starting allocation, not a fixed plan. Months 1-3 are a test period across all channels. At the June 1 decision point, we evaluate CPL and conversion by channel, then reallocate:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="rounded-xl border border-green-200 bg-green-50/50 p-4">
                <div className="text-[12px] font-bold uppercase tracking-[.08em] text-green-600 mb-2">Amplify</div>
                <p className="text-[13px] text-[#3D4F5F]">Channels outperforming on CPL and conversion get increased allocation. Pour fuel on what's working.</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                <div className="text-[12px] font-bold uppercase tracking-[.08em] text-amber-600 mb-2">Optimize</div>
                <p className="text-[13px] text-[#3D4F5F]">Channels performing at benchmark get refined — creative refresh, audience targeting, messaging tweaks.</p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
                <div className="text-[12px] font-bold uppercase tracking-[.08em] text-red-500 mb-2">Cut</div>
                <p className="text-[13px] text-[#3D4F5F]">Channels underperforming after 90 days get paused. Budget redirected to winners immediately.</p>
              </div>
            </div>

            <h3 className="text-[18px] font-bold text-[#003756] mb-4">Trigger Points</h3>
            <Table
              headers={['Condition', 'Action']}
              rows={[
                ['2+ leases behind pace', 'Mandatory strategy review within 5 days'],
                ['Any channel CPL > 2x assumption', 'Pause and reallocate within 10 days'],
                ['Channel outperforming by 2x+', 'Increase allocation from contingency or underperformers'],
                ['3+ behind by July 31', 'Deploy contingency, activate concessions'],
                ['5+ behind by August 31', 'Emergency reallocation, consider free month'],
                [<span className="text-green-600 font-bold">On pace by Aug 31</span>, 'Begin measured taper in September'],
              ]}
              compact
            />
          </Section>

          <hr className="border-[#003756]/[.06]" />

          {/* ══════════ X. CLARIFICATION ITEMS ══════════ */}
          <Section id="clarification" className="py-16 md:py-24">
            <div data-toc id="clarification" />
            <SectionLabel>Section X</SectionLabel>
            <h2 className="text-[1.75rem] md:text-[2.25rem] font-extrabold text-[#003756] mb-8">Items Requiring Greystar Clarification</h2>

            <Table
              headers={['#', 'Item', 'Deadline']}
              rows={[
                ['1', 'October stabilization target — confirm or counter-propose', 'Feb 21'],
                ['2', 'Month-by-month absorption targets overlaid on media schedule', 'Feb 21'],
                ['3', 'Apartments.com Diamond Plus — corporate deal or add to budget', 'Feb 21'],
                ['4', 'Resident Retention "Other" $8,000 — define or remove', 'Feb 21'],
                ['5', 'Creative production timeline — all content live by March 1', 'Feb 21'],
                ['6', 'Website floor plan page — fix Rent Fetch widget', 'ASAP'],
                ['7', 'Retargeting — confirm if in Wpromote scope', 'Feb 21'],
                ['8', 'Signage $20K — real bids; opex vs. capex', 'Feb 28'],
                ['9', 'Concession strategy — ownership-funded?', 'Feb 21'],
                ['10', 'Monthly reporting commitment (Section IX)', 'Feb 21'],
                ['11', 'Local broker engagement — designate coordination contact', 'Feb 21'],
              ]}
              compact
            />
          </Section>

          <hr className="border-[#003756]/[.06]" />

          {/* ══════════ XI. VACANCY vs MARKETING ══════════ */}
          <Section id="vacancy" className="py-16 md:py-24">
            <div data-toc id="vacancy" />
            <SectionLabel>Section XI</SectionLabel>
            <h2 className="text-[1.75rem] md:text-[2.25rem] font-extrabold text-[#003756] mb-8">Cost of Vacancy vs. Cost of Marketing</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Stat value="$6,000" label="1 Vacant Unit / 1 Month" />
              <Stat value="$72,000" label="1 Vacant Unit / 1 Year" />
              <Stat value="$228,600" label="Full Building / 1 Month" />
            </div>

            <div className="mt-6 rounded-2xl bg-[#003756] p-6 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[.1em] text-white/40">Vacancy Cost of Missing October</div>
                  <div className="text-[2rem] font-extrabold text-[#FF5050] mt-1">$264,000</div>
                  <div className="text-[12px] text-white/50 mt-1">11 units × 6 months</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[.1em] text-white/40">Incremental Marketing Spend</div>
                  <div className="text-[2rem] font-extrabold text-[#9EFAFF] mt-1">$71,009</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[.1em] text-white/40">Breakeven</div>
                  <div className="text-[2rem] font-extrabold text-[#9EFAFF] mt-1">10 days</div>
                  <div className="text-[12px] text-white/50 mt-1">of faster lease-up</div>
                </div>
              </div>
            </div>
          </Section>

          <hr className="border-[#003756]/[.06]" />

          {/* ══════════ XII. BOTTOM LINE ══════════ */}
          <Section id="bottom-line" className="py-16 md:py-24">
            <div data-toc id="bottom-line" />
            <SectionLabel>Section XII</SectionLabel>
            <h2 className="text-[1.75rem] md:text-[2.25rem] font-extrabold text-[#003756] mb-8">Bottom Line</h2>

            <div className="space-y-4 text-[15px] text-[#3D4F5F] leading-relaxed font-medium">
              <p>
                Greystar's $111K marketing budget provides a strong digital foundation. Our recommendation is to build on that foundation by adding the relationship-driven channels specific to Princeton — university housing coordinators, employer relocation programs, and local broker networks — that are likely to be the highest-converting lead sources for a $6,000/month renter.
              </p>
              <p>
                Because the submitted budget did not include absorption targets, we modeled two scenarios based on Greystar's spend curve and market fundamentals. Our projection suggests the current plan reaches approximately <strong className="text-[#003756]">76% occupied by October</strong>, with stabilization extending to approximately <strong className="text-[#003756]">April 2027</strong>. The estimated vacancy cost of that gap: <strong className="text-[#003756]">~$264,000</strong>. We've asked Greystar to share their own projections so we can compare.
              </p>
              <p>
                We also want to make sure the incentive structure supports our urgency. Our timeline requires sustained marketing spend through October — and we'd like to discuss with Greystar how to align the spend curve and reporting cadence to our 6-month target.
              </p>
              <p>
                Our recommended <strong className="text-[#003756]">$182K budget</strong> supplements Greystar's digital plan with a local broker and marketing team, targeted university and employer outreach, and sustained spend through October.
              </p>
              <p>
                At $6,000/month rents, each tenant is worth <strong className="text-[#003756]">$169,825</strong> in net LTV. Spending $4,803 to acquire them produces a <strong className="text-[#003756]">35:1</strong> LTV:CAC — well within industry benchmarks. The incremental $71K pays for itself if it fills the building <strong className="text-[#003756]">10 days faster</strong>. We project <strong className="text-[#003756]">6 months faster</strong>.
              </p>
            </div>

            <div className="mt-8 rounded-2xl bg-[#003756] p-6 md:p-8">
              <h3 className="text-[20px] font-extrabold text-white mb-3">Recommendation</h3>
              <ul className="space-y-2">
                {[
                  'Approve $182,000 marketing budget',
                  'Engage a local Princeton broker + marketing team (Section XIII)',
                  'Mandate monthly absorption reporting with trigger-based reallocation',
                  'Target: 100% occupied by October 31, 2026',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[15px] text-white font-medium">
                    <span className="shrink-0 mt-1 text-[#9EFAFF]">→</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Section>

          <hr className="border-[#003756]/[.06]" />

          {/* ══════════ XIII. LOCAL BROKER A/B TEST ══════════ */}
          <Section id="ab-test" className="py-16 md:py-24">
            <div data-toc id="ab-test" />
            <SectionLabel>Section XIII</SectionLabel>
            <h2 className="text-[1.75rem] md:text-[2.25rem] font-extrabold text-[#003756] mb-4">Local Team: Broker + Marketing</h2>

            <div className="space-y-4 text-[14px] text-[#3D4F5F] leading-relaxed font-medium mb-8">
              <p>
                Greystar excels at digital marketing at scale — SEM, ILS, CRM, leasing operations. What a national operator is not equipped to do is walk into a research institution's housing office, have lunch with the BMS relocation coordinator, or host a preview event with the right 30 people in the room. That's a local play, and it requires local people.
              </p>
              <p>
                We recommend engaging <strong>two local resources</strong> to complement Greystar's digital machine: a <strong>Princeton-area broker</strong> for relationship-driven lead generation, and a <strong>local marketing freelancer or small agency</strong> for PR, community events, and locally-rooted content. Three-month test, June 1 decision point.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="rounded-2xl border border-[#003756]/[.08] p-6">
                <h4 className="text-[15px] font-bold text-[#003756] mb-1">Local Broker</h4>
                <div className="text-[12px] font-bold text-[#9EFAFF] bg-[#003756] px-2 py-0.5 rounded inline-block mb-3">$2,000/mo retainer</div>
                <ul className="space-y-1.5">
                  {[
                    'Broker network activation — relocation attorneys, housing coordinators, HR directors',
                    'Private showings on 24 hours notice',
                    'In-person employer and institution outreach — BMS, Penn Medicine, ETS, IAS, PPPL',
                    'Weekend open houses via local channels',
                    'Commissions per closed lease from existing broker fees line item',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-[#3D4F5F]">
                      <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-[#9EFAFF]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-[#003756]/[.08] p-6">
                <h4 className="text-[15px] font-bold text-[#003756] mb-1">Local Marketing</h4>
                <div className="text-[12px] font-bold text-[#9EFAFF] bg-[#003756] px-2 py-0.5 rounded inline-block mb-3">$3,000/mo retainer</div>
                <ul className="space-y-1.5">
                  {[
                    'PR and earned media — 100% electric building is an editorial story',
                    'Community event coordination — Chamber, local partnerships',
                    'Locally-rooted social content (vs. templated from Scottsdale)',
                    'University and employer outreach support',
                    'Real-time competitive intel on Princeton rental market',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-[#3D4F5F]">
                      <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-[#9EFAFF]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-[#003756]/[.08] p-6">
                <h4 className="text-[15px] font-bold text-[#003756] mb-1">Greystar Retains</h4>
                <div className="text-[12px] font-bold text-[#003756]/40 bg-[#003756]/[.06] px-2 py-0.5 rounded inline-block mb-3">Digital + Operations</div>
                <ul className="space-y-1.5">
                  {[
                    'SEM, ILS, SEO, paid social, email marketing',
                    'Website management and CRM',
                    'Leasing office staffing and tours',
                    'Lead nurture and conversion',
                    'Vendor management and reporting',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-[#3D4F5F]">
                      <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-[#003756]/30" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <h3 className="text-[18px] font-bold text-[#003756] mb-4">Test Structure</h3>
            <Table
              headers={['Element', 'Greystar (Digital)', 'Local Team (Relationships)']}
              rows={[
                ['Budget', '~$137,000', '$15,000 (3 months)'],
                ['Composition', 'National platform + vendor stack', 'Local broker ($6K) + marketing ($9K)'],
                ['Channels', 'SEM, ILS, Social, SEO, Email', 'Broker network, university, employers, PR, events'],
                ['Tracking', 'Tagged "Digital" in CRM', 'Tagged "Local/Outreach" in CRM'],
                ['Period', 'March–October', 'March–May (extend if performing)'],
                [<strong>Decision Point</strong>, <span className="font-bold">June 1 — compare CPL and conversion by channel</span>, ''],
              ]}
              compact
            />

            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat value="$15K" label="Test Budget" />
              <Stat value="4–6" label="Projected Leases" />
              <Stat value="$2,500–$3,750" label="CPL Range" />
              <Stat value="8.2%" label="% of Total Budget" />
            </div>

            <Callout type="info">
              <strong>This is the single most important addition to the budget.</strong> It introduces what a national operator physically cannot provide: a hyperlocal, relationship-driven, Princeton-native team handling the channels that Greystar's digital playbook doesn't reach. Broker commissions per closed lease come from the existing broker fees line — the $15K covers retainers only.
            </Callout>
          </Section>

          <hr className="border-[#003756]/[.06]" />

          {/* ══════════ XIV. FOLLOW-UP QUESTIONS ══════════ */}
          <Section id="questions" className="py-16 md:py-24">
            <div data-toc id="questions" />
            <SectionLabel>Section XIV</SectionLabel>
            <h2 className="text-[1.75rem] md:text-[2.25rem] font-extrabold text-[#003756] mb-8">Follow-Up Questions for Greystar</h2>

            {/* A. Timeline */}
            <div className="mb-10">
              <h3 className="text-[16px] font-bold text-[#003756] mb-2">A. Timeline &amp; Accountability</h3>
              <div className="divide-y divide-[#003756]/[.06]">
                <QuestionItem number={1}>What is Greystar's projected stabilization date? The budget contains no absorption targets or stabilization date.</QuestionItem>
                <QuestionItem number={2}>Why does spend taper to $3,800/month by October — 5 months into an 8-month lease-up?</QuestionItem>
                <QuestionItem number={3}>What is the contingency plan if absorption falls below 3 leases/month?</QuestionItem>
                <QuestionItem number={4}>Will you commit to monthly performance reporting delivered by the 5th of each month?</QuestionItem>
                <QuestionItem number={5}>Is Greystar willing to tie any portion of the marketing fee to occupancy milestones?</QuestionItem>
              </div>
            </div>

            {/* B. Channel Strategy */}
            <div className="mb-10">
              <h3 className="text-[16px] font-bold text-[#003756] mb-2">B. Channel Strategy &amp; Rationale</h3>
              <div className="divide-y divide-[#003756]/[.06]">
                <QuestionItem number={6}>Why is 54% allocated to mass-market digital? What evidence that $6K renters use Google PPC?</QuestionItem>
                <QuestionItem number={7}>Why $0 on university/employer outreach? The building is surrounded by Princeton University.</QuestionItem>
                <QuestionItem number={8}>Justify Zillow Signature tier for a 45-unit building at $6K rents. Would Platinum suffice?</QuestionItem>
                <QuestionItem number={9}>Why is paid social only $500/month for a visually premium luxury product?</QuestionItem>
                <QuestionItem number={10}>What is the SEM keyword strategy for Princeton? At what CPL threshold would you reduce spend?</QuestionItem>
                <QuestionItem number={11}>Is retargeting included in Wpromote? If not, what is the plan?</QuestionItem>
              </div>
            </div>

            {/* C. Line Items */}
            <div className="mb-10">
              <h3 className="text-[16px] font-bold text-[#003756] mb-2">C. Specific Line Items</h3>
              <div className="divide-y divide-[#003756]/[.06]">
                <QuestionItem number={12}>What are the two $4,000 "Resident Retention — Other" expenditures?</QuestionItem>
                <QuestionItem number={13}>Apartments.com Diamond Plus — $0 in schedule. Covered corporately?</QuestionItem>
                <QuestionItem number={14}>Signage $20,000 — when will real bids be obtained? Opex or capex?</QuestionItem>
                <QuestionItem number={15}>Creative production timeline — confirm all content live by March 1.</QuestionItem>
                <QuestionItem number={16}>Floor plan page on 195nassau.com doesn't load. When will Rent Fetch be fixed?</QuestionItem>
                <QuestionItem number={17}>Why is Apartment List budgeted for only 2 leases ($395)?</QuestionItem>
                <QuestionItem number={18}>Why no Craigslist/Weblisters budget? It was selected on setup page.</QuestionItem>
              </div>
            </div>

            {/* D. Market Intel */}
            <div className="mb-10">
              <h3 className="text-[16px] font-bold text-[#003756] mb-2">D. Market &amp; Competitive Intelligence</h3>
              <div className="divide-y divide-[#003756]/[.06]">
                <QuestionItem number={19}>What is the competitive rental landscape in downtown Princeton for 2026?</QuestionItem>
                <QuestionItem number={20}>Provide 3-5 case studies of comparable Greystar lease-ups (30-60 units, $5K+ rents).</QuestionItem>
                <QuestionItem number={21}>Any Princeton-specific market data — search volume, ILS traffic, demographics?</QuestionItem>
                <QuestionItem number={22}>What is Greystar's recommendation on concessions at $6K/month?</QuestionItem>
              </div>
            </div>

            {/* E. Local Broker */}
            <div className="mb-10">
              <h3 className="text-[16px] font-bold text-[#003756] mb-2">E. Local Broker Engagement</h3>
              <div className="divide-y divide-[#003756]/[.06]">
                <QuestionItem number={23}>Ownership intends to engage a local Princeton broker. Who is Greystar's coordination contact?</QuestionItem>
                <QuestionItem number={24}>How will lead attribution be handled in the CRM? "Digital" vs. "Local/Outreach" tagging.</QuestionItem>
                <QuestionItem number={25}>Is Greystar willing to participate in a June 1 performance review?</QuestionItem>
              </div>
            </div>

            {/* F. Internal Vendor Review */}
            <div className="mb-10 rounded-2xl border-2 border-amber-200 bg-amber-50/30 p-6">
              <h3 className="text-[16px] font-bold text-[#003756] mb-1">F. Vendor Stack — Internal Review Items</h3>
              <p className="text-[12px] text-amber-600 font-semibold mb-4">FOR INTERNAL TEAM DISCUSSION — NOT FOR GREYSTAR</p>
              <div className="divide-y divide-amber-200/50">
                <QuestionItem number={31} internal>
                  <strong>ORM ($2,888)</strong> — Zero residents, zero reviews. Listing mgmt covered by SEO. <span className="text-[#FF5050] font-semibold">Internal position: Cut entirely.</span>
                </QuestionItem>
                <QuestionItem number={32} internal>
                  <strong>Brindle Website ($2,100)</strong> — Our vendor, not Greystar's. Do we have full credentials? Pull from Greystar's budget.
                </QuestionItem>
                <QuestionItem number={33} internal>
                  <strong>Envida Social ($7,250)</strong> — Templated content from Arizona. Replace with Princeton freelancer? <span className="text-amber-600 font-semibold">Options: Keep / Replace / Transition.</span>
                </QuestionItem>
                <QuestionItem number={34} internal>
                  <strong>Digible Paid Email ($2,000)</strong> — Cold email blasts. Wrong channel for luxury. <span className="text-[#FF5050] font-semibold">Internal position: Cut.</span>
                </QuestionItem>
                <QuestionItem number={35} internal>
                  <strong>Hy.ly Email ($2,190)</strong> — Legitimate platform, market-rate. <span className="text-green-600 font-semibold">Internal position: Keep for now.</span>
                </QuestionItem>
                <QuestionItem number={36} internal>
                  <strong>Vendor fee transparency</strong> — Ask Greystar verbally about volume discounts / rev-share from vendors. Do not put in writing.
                </QuestionItem>
              </div>
            </div>

            {/* G. Budget Structure */}
            <div className="mb-10">
              <h3 className="text-[16px] font-bold text-[#003756] mb-2">G. Budget Structure</h3>
              <div className="divide-y divide-[#003756]/[.06]">
                <QuestionItem number={37}>Why was this budget submitted without absorption targets?</QuestionItem>
                <QuestionItem number={38}>What is Greystar's position on a contingency reserve?</QuestionItem>
                <QuestionItem number={39}>How does this compare to Greystar's internal benchmarks for luxury assets?</QuestionItem>
                <QuestionItem number={40}>What budget does Greystar recommend if the target is October 31 stabilization?</QuestionItem>
                <QuestionItem number={41}>What is the process for mid-course budget reallocation?</QuestionItem>
              </div>
            </div>

            <Callout type="warning">
              These 41 questions are not rhetorical. Written responses required before budget approval. Deadline: <strong>February 21, 2026.</strong>
            </Callout>
          </Section>

          {/* ── Footer ── */}
          <div className="py-12 border-t border-[#003756]/[.06]">
            <p className="text-[11px] text-[#003756]/30 font-medium">
              Sources: Princeton Municipal Ordinance #2020-15 · NJ UHAC (NJHMFA) · 195nassau.com · Greystar Marketing Budget Tool v6.0.2
            </p>
            <p className="text-[11px] text-[#003756]/30 font-medium mt-1">
              Owner's Assessment — Confidential — February 2026
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}
