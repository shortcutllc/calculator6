import { useState, useEffect } from 'react';

export default function Plan2026() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    'title',
    '2025-summary',
    'customer-base',
    '2026-targets',
    'four-levers',
    'content-strategy',
    'conference-strategy',
    'conference-recommendations',
    'healthcare-cigna',
    'healthcare-targets',
    'cle-lawyers',
    'shortcut-sessions',
    'investment-summary',
    'next-steps'
  ];

  const goToSlide = (index: number) => {
    setCurrentSlide(Math.max(0, Math.min(index, slides.length - 1)));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        goToSlide(currentSlide + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToSlide(currentSlide - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAFAFA' }}>
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 py-4 px-6" style={{ backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(0,55,86,0.1)' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <img
            src="/Holiday Proposal/Logo/shortcut logo transparent.png"
            alt="Shortcut"
            className="h-8"
          />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: '#003756', opacity: 0.6 }}>
              {currentSlide + 1} / {slides.length}
            </span>
            <div className="flex gap-1 ml-4">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goToSlide(idx)}
                  className="w-2 h-2 rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: idx === currentSlide ? '#003756' : 'rgba(0,55,86,0.2)',
                    transform: idx === currentSlide ? 'scale(1.2)' : 'scale(1)'
                  }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => goToSlide(currentSlide - 1)}
              disabled={currentSlide === 0}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={{
                backgroundColor: currentSlide === 0 ? '#F3F4F6' : '#E0F2F7',
                color: currentSlide === 0 ? '#9CA3AF' : '#003756'
              }}
            >
              Previous
            </button>
            <button
              onClick={() => goToSlide(currentSlide + 1)}
              disabled={currentSlide === slides.length - 1}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={{
                backgroundColor: currentSlide === slides.length - 1 ? '#F3F4F6' : '#003756',
                color: currentSlide === slides.length - 1 ? '#9CA3AF' : 'white'
              }}
            >
              Next
            </button>
          </div>
        </div>
      </header>

      {/* Slides Container */}
      <div className="pt-20">

        {/* ==================== SLIDE 1: TITLE ==================== */}
        {currentSlide === 0 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: 'white' }}>
            <div className="max-w-6xl mx-auto px-6 text-center">
              <p className="text-sm font-semibold uppercase tracking-wider mb-6" style={{ color: '#FF5050' }}>
                Internal Team Document - Confidential
              </p>
              <h1
                className="text-5xl md:text-7xl lg:text-8xl font-semibold mb-8"
                style={{ color: '#003756', letterSpacing: '-0.02em' }}
              >
                2026 Growth Plan
              </h1>
              <p
                className="text-xl md:text-2xl font-normal max-w-4xl mx-auto mb-12"
                style={{ color: '#003756', opacity: 0.7, lineHeight: '1.5' }}
              >
                Four levers to accelerate qualified leads and reach <strong>$1.155M run rate</strong> by year-end
              </p>

              {/* Strategic Pillars - THE FOUR GROWTH LEVERS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 max-w-4xl mx-auto">
                {[
                  { icon: '📝', label: 'Content', desc: 'Lower education barrier for new clients' },
                  { icon: '🎪', label: 'Conferences', desc: 'Accelerate qualified leads' },
                  { icon: '🏥', label: 'Healthcare Channels', desc: 'Unlock employer wellness dollars' },
                  { icon: '🍸', label: 'Hosted Events', desc: 'Build our own lead-gen machine' },
                ].map((item, idx) => (
                  <div key={idx} className="p-4 rounded-2xl" style={{ backgroundColor: '#F8F9FA' }}>
                    <div className="text-2xl mb-2">{item.icon}</div>
                    <p className="font-semibold text-sm" style={{ color: '#003756' }}>{item.label}</p>
                    <p className="text-xs" style={{ color: '#003756', opacity: 0.6 }}>{item.desc}</p>
                  </div>
                ))}
              </div>

              <p className="text-base" style={{ color: '#003756', opacity: 0.5 }}>
                Use arrow keys or click Next to navigate - {slides.length} slides total
              </p>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 2: 2025 SUMMARY ==================== */}
        {currentSlide === 1 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: 'white' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-12">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#003756', opacity: 0.6 }}>
                  Where We Are
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  2025 Summary
                </h2>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10 max-w-5xl mx-auto">
                {[
                  { value: '$752K', label: 'Gross Revenue', sub: '+19% YoY' },
                  { value: '$825K', label: 'Exit Run Rate', sub: 'Q4 pace' },
                  { value: '~$920K', label: 'Normalized', sub: 'With late onboards', highlight: true },
                  { value: '~$78K', label: 'Gap to $1M', sub: 'Goal miss' },
                  { value: '$206K', label: 'Q4 Revenue', sub: '+15.1% vs Q3' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl text-center"
                    style={{
                      backgroundColor: item.highlight ? '#E0F2F7' : '#F8F9FA',
                      border: item.highlight ? '2px solid #9EFAFF' : '1px solid rgba(0,55,86,0.1)'
                    }}
                  >
                    <p className="text-2xl md:text-3xl font-semibold mb-1" style={{ color: '#003756' }}>{item.value}</p>
                    <p className="text-xs font-medium" style={{ color: '#003756', opacity: 0.8 }}>{item.label}</p>
                    <p className="text-xs" style={{ color: item.highlight ? '#018EA2' : '#003756', opacity: item.highlight ? 1 : 0.5 }}>{item.sub}</p>
                  </div>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                {/* Highlights */}
                <div className="rounded-3xl p-6" style={{ backgroundColor: '#E0F2F7', border: '1px solid rgba(0,55,86,0.1)' }}>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#003756' }}>
                    <span className="text-xl">✅</span> What Worked
                  </h3>
                  <div className="space-y-3">
                    {[
                      { title: 'Q4 Momentum', desc: 'Strongest quarter ($206K), +15.1% vs Q3' },
                      { title: 'Enterprise Expansion', desc: 'BCG multi-city, DraftKings multi-location' },
                      { title: 'High-Value Retention', desc: '35 clients, 15 spending $10K+/year' },
                      { title: 'Ops Scaled Cleanly', desc: 'Holiday execution without issues' },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span style={{ color: '#018EA2' }}>✓</span>
                        <p className="text-sm" style={{ color: '#003756' }}>
                          <strong>{item.title}:</strong> {item.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Challenges */}
                <div className="rounded-3xl p-6" style={{ backgroundColor: '#FEF2F2', border: '1px solid rgba(220,38,38,0.2)' }}>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#003756' }}>
                    <span className="text-xl">⚠️</span> What Didn't
                  </h3>
                  <div className="space-y-3">
                    {[
                      { title: 'Missed $1M exit goal', desc: 'Ended at $825K run rate vs $1M target' },
                      { title: 'Slow partner acquisition', desc: 'Net-new recurring partners didn\'t compound quickly enough' },
                      { title: 'Revenue quality', desc: 'Some growth was one-time events vs recurring contracts' },
                      { title: 'Visibility gaps', desc: 'Revenue timing made forecasting difficult' },
                      { title: 'Concentration risk', desc: 'DraftKings LV = 15%+ of gross revenue' },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span style={{ color: '#DC2626' }}>!</span>
                        <p className="text-sm" style={{ color: '#003756' }}>
                          <strong>{item.title}:</strong> {item.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 3: CUSTOMER BASE ==================== */}
        {currentSlide === 2 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: '#E0F2F7' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-12">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#003756', opacity: 0.6 }}>
                  Current State
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Customer Base
                </h2>
              </div>

              <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-8">
                {/* Client Breakdown */}
                <div className="rounded-3xl p-6" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                  <h3 className="font-semibold mb-4" style={{ color: '#003756' }}>35 Active Clients</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'rgba(0,55,86,0.1)' }}>
                      <span className="text-sm" style={{ color: '#003756' }}>Spending $10K+/year</span>
                      <span className="text-lg font-semibold" style={{ color: '#018EA2' }}>15</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'rgba(0,55,86,0.1)' }}>
                      <span className="text-sm" style={{ color: '#003756' }}>Spending $5-10K/year</span>
                      <span className="text-lg font-semibold" style={{ color: '#003756' }}>8</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm" style={{ color: '#003756' }}>Spending {"<"}$5K/year</span>
                      <span className="text-lg font-semibold" style={{ color: '#003756', opacity: 0.5 }}>12</span>
                    </div>
                  </div>
                </div>

                {/* Target Profile */}
                <div className="rounded-3xl p-6" style={{ backgroundColor: '#003756' }}>
                  <h3 className="font-semibold mb-4 text-white">Ideal Client Profile</h3>
                  <div className="space-y-3">
                    {[
                      '200-2,000 employees',
                      'NYC HQ or major presence',
                      'In-office 3+ days/week',
                      'Values employee experience',
                      'HR/People team in place',
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span style={{ color: '#9EFAFF' }}>✓</span>
                        <p className="text-sm text-white">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Revenue by Service */}
                <div className="rounded-3xl p-6" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                  <h3 className="font-semibold mb-4" style={{ color: '#003756' }}>Revenue by Service</h3>
                  <div className="space-y-3">
                    {[
                      { service: 'Corporate Massage', pct: '55%', color: '#003756' },
                      { service: 'Headshots', pct: '25%', color: '#018EA2' },
                      { service: 'Grooming', pct: '12%', color: '#9EFAFF' },
                      { service: 'Mindfulness', pct: '8%', color: '#FF5050' },
                    ].map((item, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-sm mb-1">
                          <span style={{ color: '#003756' }}>{item.service}</span>
                          <span style={{ color: item.color }}>{item.pct}</span>
                        </div>
                        <div className="h-2 rounded-full" style={{ backgroundColor: '#F3F4F6' }}>
                          <div className="h-full rounded-full" style={{ width: item.pct, backgroundColor: item.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Accounts Table */}
              <div className="max-w-5xl mx-auto rounded-3xl overflow-hidden" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                <div className="p-3" style={{ backgroundColor: '#003756' }}>
                  <h3 className="font-semibold text-white text-sm text-center">Top Accounts by 2025 Revenue</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-0 text-xs">
                  {[
                    { client: 'DraftKings LV', rev: '$115,200' },
                    { client: 'Betterment', rev: '$31,190' },
                    { client: 'DraftKings NY', rev: '$29,908' },
                    { client: 'BCG NYC', rev: '$26,725' },
                    { client: 'Celonis', rev: '$23,895' },
                    { client: 'BCG Boston', rev: '$20,880' },
                    { client: 'Cencora', rev: '$19,105' },
                    { client: 'DraftKings NJ', rev: '$18,348' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex justify-between p-2" style={{ borderBottom: '1px solid rgba(0,55,86,0.1)', borderRight: idx % 4 !== 3 ? '1px solid rgba(0,55,86,0.1)' : 'none' }}>
                      <span style={{ color: '#003756' }}>{item.client}</span>
                      <span className="font-semibold" style={{ color: '#018EA2' }}>{item.rev}</span>
                    </div>
                  ))}
                </div>
                <div className="p-2 text-center text-xs" style={{ backgroundColor: '#F8F9FA', color: '#003756', opacity: 0.7 }}>
                  Pattern: Multi-location expansion (BCG 4 cities, DraftKings 3 locations) is working.
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 4: 2026 TARGETS ==================== */}
        {currentSlide === 3 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: 'white' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-12">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#FF5050' }}>
                  Financial Projections
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  2026 Targets
                </h2>
                <p className="text-lg" style={{ color: '#003756', opacity: 0.7 }}>
                  +40% growth = $330K incremental revenue needed
                </p>
              </div>

              {/* Revenue Trajectory Table */}
              <div className="rounded-3xl overflow-hidden mb-8 max-w-4xl mx-auto" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: '#003756' }}>
                      <th className="text-left p-4 text-sm font-semibold text-white">Year-End</th>
                      <th className="text-right p-4 text-sm font-semibold text-white">Run Rate</th>
                      <th className="text-right p-4 text-sm font-semibold text-white">Growth</th>
                      <th className="text-right p-4 text-sm font-semibold text-white">Est. Gross Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid rgba(0,55,86,0.1)' }}>
                      <td className="p-4 text-sm font-medium" style={{ color: '#003756' }}>2025 (Actual)</td>
                      <td className="p-4 text-sm text-right" style={{ color: '#003756' }}>$825K</td>
                      <td className="p-4 text-sm text-right" style={{ color: '#003756' }}>+19%</td>
                      <td className="p-4 text-sm text-right" style={{ color: '#003756' }}>$750K</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(0,55,86,0.1)', backgroundColor: '#E0F2F7' }}>
                      <td className="p-4 text-sm font-bold" style={{ color: '#003756' }}>2026 Target</td>
                      <td className="p-4 text-sm text-right font-bold" style={{ color: '#003756' }}>$1,155K</td>
                      <td className="p-4 text-sm text-right font-bold" style={{ color: '#018EA2' }}>+40%</td>
                      <td className="p-4 text-sm text-right font-bold" style={{ color: '#003756' }}>$1,039K</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(0,55,86,0.1)' }}>
                      <td className="p-4 text-sm" style={{ color: '#003756', opacity: 0.6 }}>2027</td>
                      <td className="p-4 text-sm text-right" style={{ color: '#003756', opacity: 0.6 }}>$1,617K</td>
                      <td className="p-4 text-sm text-right" style={{ color: '#003756', opacity: 0.6 }}>+40%</td>
                      <td className="p-4 text-sm text-right" style={{ color: '#003756', opacity: 0.6 }}>$1,455K</td>
                    </tr>
                    <tr>
                      <td className="p-4 text-sm" style={{ color: '#003756', opacity: 0.6 }}>2028 (Exit)</td>
                      <td className="p-4 text-sm text-right" style={{ color: '#003756', opacity: 0.6 }}>$2,100K</td>
                      <td className="p-4 text-sm text-right" style={{ color: '#003756', opacity: 0.6 }}>+30%</td>
                      <td className="p-4 text-sm text-right" style={{ color: '#003756', opacity: 0.6 }}>$1,891K</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* What $330K looks like */}
              <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                {[
                  { metric: '~$27.5K', label: 'per month incremental', desc: 'or $6.3K/week new business' },
                  { metric: '15-20', label: 'new $15K+ clients', desc: 'at average $18K/year' },
                  { metric: '~$1K/day', label: 'in new business', desc: 'consistent lead flow needed' },
                ].map((item, idx) => (
                  <div key={idx} className="text-center p-5 rounded-2xl" style={{ backgroundColor: '#F8F9FA' }}>
                    <p className="text-2xl font-bold" style={{ color: '#003756' }}>{item.metric}</p>
                    <p className="text-sm font-medium" style={{ color: '#003756' }}>{item.label}</p>
                    <p className="text-xs" style={{ color: '#003756', opacity: 0.5 }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 5: FOUR LEVERS ==================== */}
        {currentSlide === 4 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: '#003756' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-12">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#9EFAFF' }}>
                  Growth Strategy
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold mb-4 text-white" style={{ letterSpacing: '-0.02em' }}>
                  Four Levers
                </h2>
                <p className="text-lg max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  Each lever addresses a different part of the funnel
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                {[
                  {
                    num: '1',
                    title: 'Content',
                    subtitle: 'Lower the education barrier for new clients',
                    desc: 'Most prospects have never bought this category. We need to educate them on what corporate wellness actually means.',
                    items: ['In-Person Wellness Playbook', 'Client case studies & video clips', 'LinkedIn thought leadership'],
                    color: '#9EFAFF'
                  },
                  {
                    num: '2',
                    title: 'Conferences',
                    subtitle: 'Accelerate qualified leads at national + local level',
                    desc: 'Get in front of decision-makers at scale. HR/Benefits conferences are our highest-intent channel.',
                    items: ['6 conferences/year ($60K budget)', 'Target HR, Benefits, Workplace Exp.', 'Live demos at booth'],
                    color: '#FF5050'
                  },
                  {
                    num: '3',
                    title: 'Healthcare Channels',
                    subtitle: 'Unlock employer wellness dollars (Cigna, Aetna, BCBS)',
                    desc: 'Companies fund wellness through health improvement funds, wellness packages, and LSAs. This is pooled corporate money.',
                    items: ['Cigna Health Improvement Fund', 'Benefits broker partnerships', 'LSA platform integration'],
                    color: '#9EFAFF'
                  },
                  {
                    num: '4',
                    title: 'Hosted Events',
                    subtitle: 'Build our own lead-gen machine in NYC',
                    desc: 'Instead of only attending conferences, we host our own. Small, curated networking events with Shortcut services embedded.',
                    items: ['Quarterly "Shortcut Sessions"', '40-50 qualified HR leaders per event', '$5K event vs $15K conference booth'],
                    color: '#FF5050'
                  },
                ].map((lever, idx) => (
                  <div key={idx} className="rounded-3xl overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                    <div className="p-5" style={{ borderBottom: `3px solid ${lever.color}` }}>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: lever.color, color: '#003756' }}>
                          {lever.num}
                        </span>
                        <div>
                          <h3 className="font-semibold text-white">{lever.title}</h3>
                          <p className="text-xs" style={{ color: lever.color }}>{lever.subtitle}</p>
                        </div>
                      </div>
                      <p className="text-sm text-white mt-3" style={{ opacity: 0.8 }}>{lever.desc}</p>
                    </div>
                    <div className="p-4">
                      {lever.items.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 py-1">
                          <span style={{ color: lever.color }}>→</span>
                          <span className="text-sm text-white">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 6: CONTENT STRATEGY ==================== */}
        {currentSlide === 5 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: 'white' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{ backgroundColor: '#E0F2F7' }}>
                  <span>📝</span>
                  <span className="text-sm font-semibold" style={{ color: '#003756' }}>Lever 1</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Content Strategy
                </h2>
                <p className="text-lg max-w-2xl mx-auto" style={{ color: '#003756', opacity: 0.7 }}>
                  Lower the education barrier - most companies have never provided this type of wellness
                </p>
              </div>

              {/* Funnel Stages */}
              <div className="space-y-6 max-w-5xl mx-auto">
                {/* Awareness Stage */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(0,55,86,0.1)' }}>
                  <div className="p-4" style={{ backgroundColor: '#003756' }}>
                    <h3 className="font-semibold text-white">Awareness Stage — "What is this?"</h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 p-5" style={{ backgroundColor: 'white' }}>
                    {[
                      { asset: '"The In-Person Wellness Playbook"', purpose: 'Define the category. Position Shortcut as the authority.', format: 'PDF / landing page' },
                      { asset: '"Why Digital Perks Aren\'t Working"', purpose: 'Challenge the status quo (apps, stipends with low usage).', format: 'Blog / LinkedIn' },
                      { asset: '"What Happens When Shortcut Shows Up"', purpose: 'Visual, visceral — show the experience.', format: '60-90 sec video' },
                      { asset: 'Client testimonial clips', purpose: 'Social proof from recognizable logos.', format: '30-sec video snippets' },
                    ].map((item, idx) => (
                      <div key={idx} className="p-3 rounded-xl" style={{ backgroundColor: '#F8F9FA' }}>
                        <p className="font-medium text-sm mb-1" style={{ color: '#003756' }}>{item.asset}</p>
                        <p className="text-xs mb-1" style={{ color: '#003756', opacity: 0.7 }}>{item.purpose}</p>
                        <p className="text-xs" style={{ color: '#018EA2' }}>{item.format}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Consideration Stage */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(0,55,86,0.1)' }}>
                  <div className="p-4" style={{ backgroundColor: '#018EA2' }}>
                    <h3 className="font-semibold text-white">Consideration Stage — "How does it work?"</h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 p-5" style={{ backgroundColor: 'white' }}>
                    {[
                      { asset: '"The HR Leader\'s Buying Guide"', purpose: 'Walk through procurement, budgeting, internal sell.', format: 'PDF / interactive guide' },
                      { asset: '"How BCG Runs Wellness Across 4 Offices"', purpose: 'Case study showing multi-location model.', format: 'Written + video' },
                      { asset: '"What to Expect: Your First Shortcut Event"', purpose: 'Reduce uncertainty. Show the process.', format: 'Email sequence' },
                      { asset: 'ROI Calculator', purpose: 'Let them build their own business case.', format: 'Interactive web tool' },
                    ].map((item, idx) => (
                      <div key={idx} className="p-3 rounded-xl" style={{ backgroundColor: '#F8F9FA' }}>
                        <p className="font-medium text-sm mb-1" style={{ color: '#003756' }}>{item.asset}</p>
                        <p className="text-xs mb-1" style={{ color: '#003756', opacity: 0.7 }}>{item.purpose}</p>
                        <p className="text-xs" style={{ color: '#018EA2' }}>{item.format}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Decision Stage */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(0,55,86,0.1)' }}>
                  <div className="p-4" style={{ backgroundColor: '#FF5050' }}>
                    <h3 className="font-semibold text-white">Decision Stage — "Why Shortcut?"</h3>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4 p-5" style={{ backgroundColor: 'white' }}>
                    {[
                      { asset: '"Single Vendor vs. Vendor Sprawl"', purpose: 'Competitive positioning.', format: 'Comparison one-pager' },
                      { asset: 'Service menu + pricing transparency', purpose: 'Remove friction.', format: 'PDF / web page' },
                      { asset: '"Ask Us Anything" recorded Q&A', purpose: 'Address objections preemptively.', format: 'Video / podcast' },
                    ].map((item, idx) => (
                      <div key={idx} className="p-3 rounded-xl" style={{ backgroundColor: '#F8F9FA' }}>
                        <p className="font-medium text-sm mb-1" style={{ color: '#003756' }}>{item.asset}</p>
                        <p className="text-xs mb-1" style={{ color: '#003756', opacity: 0.7 }}>{item.purpose}</p>
                        <p className="text-xs" style={{ color: '#018EA2' }}>{item.format}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 7: CONFERENCE STRATEGY ==================== */}
        {currentSlide === 6 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: '#E0F2F7' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{ backgroundColor: 'white' }}>
                  <span>🎪</span>
                  <span className="text-sm font-semibold" style={{ color: '#003756' }}>Lever 2</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Conference Strategy
                </h2>
                <p className="text-lg max-w-2xl mx-auto" style={{ color: '#003756', opacity: 0.7 }}>
                  6 conferences per year - direct access to decision-makers
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {/* National Conference Universe */}
                <div className="md:col-span-2 rounded-3xl overflow-hidden" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                  <div className="p-4" style={{ backgroundColor: '#003756' }}>
                    <h3 className="font-semibold text-white">National Conferences — Priority Ranked</h3>
                    <p className="text-xs text-white" style={{ opacity: 0.7 }}>H1/H2: $30K budget each</p>
                  </div>
                  <div className="p-3 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(0,55,86,0.1)' }}>
                          <th className="text-left py-2 font-semibold" style={{ color: '#003756' }}>#</th>
                          <th className="text-left py-2 font-semibold" style={{ color: '#003756' }}>Conference</th>
                          <th className="text-center py-2 font-semibold" style={{ color: '#003756' }}>Date</th>
                          <th className="text-center py-2 font-semibold" style={{ color: '#003756' }}>Size</th>
                          <th className="text-center py-2 font-semibold" style={{ color: '#003756' }}>Cost</th>
                          <th className="text-center py-2 font-semibold" style={{ color: '#003756' }}>Fit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { rank: '1', name: 'Wellbeing at Work', loc: 'NYC/Austin', date: 'Mar 3-5', size: '500+', cost: '$3-8K', fit: '⭐⭐⭐⭐⭐', highlight: true },
                          { rank: '2', name: 'Workhuman Live', loc: 'Orlando', date: 'Apr 27-30', size: '3K+', cost: '$8-15K', fit: '⭐⭐⭐⭐⭐', highlight: true },
                          { rank: '3', name: 'Total Rewards', loc: 'San Antonio', date: 'Apr 19-22', size: '2K+', cost: '$5-10K', fit: '⭐⭐⭐⭐⭐', highlight: true },
                          { rank: '4', name: 'Business Group on Health', loc: 'New Orleans', date: 'Apr 22-24', size: '1K+', cost: '$5-10K', fit: '⭐⭐⭐⭐' },
                          { rank: '5', name: 'Transform', loc: 'Las Vegas', date: 'Mar 23-25', size: '2K+', cost: '$5-10K', fit: '⭐⭐⭐⭐' },
                          { rank: 'T2', name: 'SHRM Annual', loc: 'Orlando', date: 'Jun 16-19', size: '25K+', cost: '$8-15K', fit: '⭐⭐⭐' },
                          { rank: '—', name: 'HR Tech', loc: 'Las Vegas', date: 'Oct 20-22', size: '10K+', cost: '$10-20K', fit: '⭐⭐', skip: true },
                        ].map((conf, idx) => (
                          <tr key={idx} style={{
                            borderBottom: '1px solid rgba(0,55,86,0.1)',
                            backgroundColor: conf.highlight ? '#E0F2F7' : conf.skip ? '#FEF2F2' : 'transparent'
                          }}>
                            <td className="py-2 font-bold" style={{ color: conf.highlight ? '#018EA2' : '#003756' }}>{conf.rank}</td>
                            <td className="py-2" style={{ color: '#003756' }}>
                              <div className="font-medium">{conf.name}</div>
                              <div style={{ opacity: 0.6 }}>{conf.loc}</div>
                            </td>
                            <td className="py-2 text-center" style={{ color: '#003756' }}>{conf.date}</td>
                            <td className="py-2 text-center" style={{ color: '#003756' }}>{conf.size}</td>
                            <td className="py-2 text-center" style={{ color: '#018EA2' }}>{conf.cost}</td>
                            <td className="py-2 text-center">{conf.fit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Target Buyers */}
                <div className="space-y-4">
                  <div className="rounded-3xl p-5" style={{ backgroundColor: '#003756' }}>
                    <h3 className="font-semibold mb-3 text-white">Target Attendees</h3>
                    <div className="space-y-2">
                      {[
                        'Head of Workplace Experience',
                        'Head of People/People Ops',
                        'Director of HR',
                        'Total Rewards Leaders',
                        'Employee Experience Manager',
                        'Benefits Leaders'
                      ].map((role, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span style={{ color: '#9EFAFF' }}>→</span>
                          <p className="text-sm text-white">{role}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl p-5" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                    <h3 className="font-semibold mb-3" style={{ color: '#003756' }}>Booth Strategy</h3>
                    <div className="space-y-2 text-sm" style={{ color: '#003756' }}>
                      <p>• Live chair massage demos</p>
                      <p>• Express headshot station</p>
                      <p>• Lead capture with QR codes</p>
                      <p>• Branded stress balls/items</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 8: CONFERENCE RECOMMENDATIONS ==================== */}
        {currentSlide === 7 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: 'white' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#FF5050' }}>
                  H1 2026 Priority
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Conference Recommendations
                </h2>
                <p className="text-lg max-w-2xl mx-auto" style={{ color: '#003756', opacity: 0.7 }}>
                  Top 3 picks for H1 based on buyer fit, cost, and timing
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-8">
                {/* #1 Wellbeing at Work */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '3px solid #9EFAFF' }}>
                  <div className="p-4 flex items-center justify-between" style={{ backgroundColor: '#003756' }}>
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: '#9EFAFF', color: '#003756' }}>
                        #1
                      </span>
                      <h3 className="font-semibold text-white">Wellbeing at Work</h3>
                    </div>
                  </div>
                  <div className="p-5" style={{ backgroundColor: 'white' }}>
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Date</span>
                        <span className="font-medium" style={{ color: '#003756' }}>March 3-5</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Location</span>
                        <span className="font-medium" style={{ color: '#003756' }}>NYC + Austin</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Size</span>
                        <span className="font-medium" style={{ color: '#003756' }}>500+</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Est. Cost</span>
                        <span className="font-medium" style={{ color: '#018EA2' }}>$5K</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#E0F2F7' }}>
                      <p className="text-xs" style={{ color: '#003756' }}>
                        <strong>Why #1:</strong> NYC home turf. Intimate (500ish). Literally called "Wellbeing at Work." Lowest friction, highest alignment.
                      </p>
                    </div>
                  </div>
                </div>

                {/* #2 Workhuman */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '2px solid #018EA2' }}>
                  <div className="p-4 flex items-center justify-between" style={{ backgroundColor: '#018EA2' }}>
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: 'white', color: '#018EA2' }}>
                        #2
                      </span>
                      <h3 className="font-semibold text-white">Workhuman Live</h3>
                    </div>
                  </div>
                  <div className="p-5" style={{ backgroundColor: 'white' }}>
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Date</span>
                        <span className="font-medium" style={{ color: '#003756' }}>April 27-30</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Location</span>
                        <span className="font-medium" style={{ color: '#003756' }}>Orlando</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Size</span>
                        <span className="font-medium" style={{ color: '#003756' }}>3,000+</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Est. Cost</span>
                        <span className="font-medium" style={{ color: '#018EA2' }}>$12K (incl. travel)</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#F8F9FA' }}>
                      <p className="text-xs" style={{ color: '#003756' }}>
                        <strong>Why #2:</strong> Best audience-to-noise ratio. Employee Experience, Culture, Engagement leaders — exactly who buys Shortcut.
                      </p>
                    </div>
                  </div>
                </div>

                {/* #3 Total Rewards */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(0,55,86,0.2)' }}>
                  <div className="p-4 flex items-center justify-between" style={{ backgroundColor: '#FF5050' }}>
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: 'white', color: '#FF5050' }}>
                        #3
                      </span>
                      <h3 className="font-semibold text-white">Total Rewards</h3>
                    </div>
                  </div>
                  <div className="p-5" style={{ backgroundColor: 'white' }}>
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Date</span>
                        <span className="font-medium" style={{ color: '#003756' }}>April 19-22</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Location</span>
                        <span className="font-medium" style={{ color: '#003756' }}>San Antonio</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Size</span>
                        <span className="font-medium" style={{ color: '#003756' }}>2,000+</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Est. Cost</span>
                        <span className="font-medium" style={{ color: '#018EA2' }}>$5K</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#F8F9FA' }}>
                      <p className="text-xs" style={{ color: '#003756' }}>
                        <strong>Why #3:</strong> Compensation & Benefits pros — the budget holders. Workhuman gets the "culture champion," Total Rewards gets the "budget holder."
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Budget Summary */}
              <div className="max-w-5xl mx-auto p-4 rounded-2xl" style={{ backgroundColor: '#E0F2F7', border: '1px solid rgba(0,55,86,0.1)' }}>
                <p className="text-sm text-center" style={{ color: '#003756' }}>
                  <strong>H1 Budget:</strong> $22K total for 3 conferences | <strong>Expected:</strong> 45-75 qualified leads | <strong>Buffer:</strong> $8K for From Day One or opportunistic events
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 9: HEALTHCARE - CIGNA ==================== */}
        {currentSlide === 8 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: '#E0F2F7' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{ backgroundColor: 'white' }}>
                  <span>🏥</span>
                  <span className="text-sm font-semibold" style={{ color: '#003756' }}>Lever 3</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Healthcare Channel: Cigna
                </h2>
                <p className="text-lg max-w-2xl mx-auto" style={{ color: '#003756', opacity: 0.7 }}>
                  Tap into existing employer wellness budgets through insurance programs
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                {/* Cigna Health Improvement Fund - The Model */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '2px solid #9EFAFF' }}>
                  <div className="p-4" style={{ backgroundColor: '#003756' }}>
                    <h3 className="font-semibold text-white">Cigna Health Improvement Fund</h3>
                    <p className="text-xs text-white" style={{ opacity: 0.7 }}>Company-level wellness budget provided to employer clients</p>
                  </div>
                  <div className="p-4" style={{ backgroundColor: 'white' }}>
                    <h4 className="font-semibold text-sm mb-3" style={{ color: '#003756' }}>How It Works</h4>
                    <div className="space-y-2 text-xs mb-4">
                      {[
                        'Health Engagement team meets with employer to personalize strategy',
                        'Employer discusses expense requests BEFORE spending',
                        'Employer makes purchase, submits invoices/receipts',
                        'Cigna reimburses the employer (45-60 days)',
                      ].map((step, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="font-bold" style={{ color: '#018EA2' }}>{idx + 1}.</span>
                          <p style={{ color: '#003756' }}>{step}</p>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#DCFCE7' }}>
                      <p className="text-xs font-semibold mb-1" style={{ color: '#166534' }}>✅ ELIGIBLE — Shortcut Services Fit:</p>
                      <p className="text-xs" style={{ color: '#166534' }}>
                        "Activities and challenges to promote healthy living" • "Guest speakers on wellness" • "Onsite group classes (yoga, mindfulness)"
                      </p>
                    </div>
                  </div>
                </div>

                {/* Insurer Target List & The Play */}
                <div className="space-y-4">
                  <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(0,55,86,0.1)' }}>
                    <div className="p-3" style={{ backgroundColor: '#003756' }}>
                      <h3 className="font-semibold text-white text-sm">Healthcare Provider Target List</h3>
                    </div>
                    <div className="p-3" style={{ backgroundColor: 'white' }}>
                      <table className="w-full text-xs">
                        <tbody>
                          {[
                            { rank: '1', name: 'Cigna', program: 'Health Improvement Fund', status: '✅ Confirmed' },
                            { rank: '2', name: 'BCBS TX/IL/OK', program: 'Wellbeing Network', status: '✅ Lists massage' },
                            { rank: '3', name: 'Aetna', program: 'Premier Wellness', status: '✅ Group events' },
                            { rank: '4', name: 'UnitedHealthcare', program: 'UHC Hub', status: '⚠️ Vendor network' },
                            { rank: '5', name: 'Anthem/Elevance', program: 'Wellbeing Solutions', status: '⚠️ Preventive focus' },
                          ].map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(0,55,86,0.1)' }}>
                              <td className="py-1.5 font-bold" style={{ color: '#018EA2' }}>{item.rank}</td>
                              <td className="py-1.5 font-medium" style={{ color: '#003756' }}>{item.name}</td>
                              <td className="py-1.5 text-right" style={{ color: '#003756', opacity: 0.7 }}>{item.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-3xl p-4" style={{ backgroundColor: '#E0F2F7' }}>
                    <h4 className="font-semibold text-sm mb-2" style={{ color: '#003756' }}>The Shortcut Play</h4>
                    <p className="text-xs mb-2" style={{ color: '#003756' }}>Package services as "wellness events" — not standalone massage:</p>
                    <div className="flex flex-wrap gap-2">
                      {['"Employee Appreciation Wellness Day"', '"Health Awareness Event"', '"Stress Reduction Program"'].map((item, idx) => (
                        <span key={idx} className="px-2 py-1 rounded-full text-xs" style={{ backgroundColor: 'white', color: '#003756' }}>{item}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 10: HEALTHCARE - LSA TARGETS ==================== */}
        {currentSlide === 9 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: 'white' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#018EA2' }}>
                  Healthcare Channel
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  LSA Platform Partnerships
                </h2>
                <p className="text-lg max-w-2xl mx-auto" style={{ color: '#003756', opacity: 0.7 }}>
                  Lifestyle Spending Accounts are the fastest-growing benefits category
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-8">
                {/* LSA Platforms */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(0,55,86,0.1)' }}>
                  <div className="p-4" style={{ backgroundColor: '#003756' }}>
                    <h3 className="font-semibold text-white">Target LSA Platforms</h3>
                  </div>
                  <div className="p-5" style={{ backgroundColor: 'white' }}>
                    <div className="space-y-3">
                      {[
                        { name: 'Forma', desc: '300+ customers, 110+ countries' },
                        { name: 'Benepass', desc: 'Card-first, zero out-of-pocket' },
                        { name: 'Espresa', desc: 'Wellness challenges + ERGs' },
                        { name: 'Fringe', desc: 'Powers Alight Marketplace' },
                        { name: 'Compt', desc: '90% participation rate' },
                        { name: 'Truemed', desc: 'HSA/FSA enablement via LMN' },
                      ].map((platform, idx) => (
                        <div key={idx} className="flex items-start gap-3 py-2 border-b" style={{ borderColor: 'rgba(0,55,86,0.1)' }}>
                          <span style={{ color: '#9EFAFF' }}>→</span>
                          <div>
                            <p className="font-medium text-sm" style={{ color: '#003756' }}>{platform.name}</p>
                            <p className="text-xs" style={{ color: '#003756', opacity: 0.6 }}>{platform.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Market Stats */}
                <div className="space-y-4">
                  <div className="rounded-3xl p-5" style={{ backgroundColor: '#E0F2F7' }}>
                    <h3 className="font-semibold mb-4" style={{ color: '#003756' }}>Market Opportunity</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { stat: '$1,029', label: 'Avg LSA/employee', sub: '2025 average' },
                        { stat: '99%', label: 'LSAs include wellness', sub: 'Category coverage' },
                        { stat: '74%', label: 'Companies increasing', sub: 'Wellness spending' },
                        { stat: '38%', label: 'Considering LSAs', sub: 'New adopters' },
                      ].map((item, idx) => (
                        <div key={idx} className="text-center p-3 rounded-xl" style={{ backgroundColor: 'white' }}>
                          <p className="text-xl font-bold" style={{ color: '#003756' }}>{item.stat}</p>
                          <p className="text-xs font-medium" style={{ color: '#003756' }}>{item.label}</p>
                          <p className="text-xs" style={{ color: '#003756', opacity: 0.5 }}>{item.sub}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl p-5" style={{ backgroundColor: '#003756' }}>
                    <h3 className="font-semibold mb-3 text-white">Action Items</h3>
                    <div className="space-y-2">
                      {[
                        'Apply to Forma vendor marketplace',
                        'Contact Benepass partnership team',
                        'Explore Truemed HSA enablement',
                        'Build API for platform integration',
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <input type="checkbox" className="mt-1" style={{ accentColor: '#9EFAFF' }} />
                          <p className="text-sm text-white">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 11: CLE FOR LAWYERS ==================== */}
        {currentSlide === 10 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: '#E0F2F7' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{ backgroundColor: 'white' }}>
                  <span>⚖️</span>
                  <span className="text-sm font-semibold" style={{ color: '#003756' }}>Lever 4</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  CLE Mindfulness for Lawyers
                </h2>
                <p className="text-lg max-w-2xl mx-auto" style={{ color: '#003756', opacity: 0.7 }}>
                  9+ states now REQUIRE mental health/wellness CLE credits
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-8">
                {/* Important Distinction */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '2px solid #FF5050' }}>
                  <div className="p-5" style={{ backgroundColor: '#FF5050' }}>
                    <h3 className="font-semibold text-white">Important: What Qualifies</h3>
                  </div>
                  <div className="p-5" style={{ backgroundColor: 'white' }}>
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl" style={{ backgroundColor: '#DCFCE7' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">✅</span>
                          <h4 className="font-semibold text-sm" style={{ color: '#166534' }}>QUALIFIES: Mindfulness</h4>
                        </div>
                        <p className="text-xs" style={{ color: '#166534' }}>
                          Mindfulness workshops with educational component qualify for CLE wellness credits. Must include instruction on techniques, not just practice.
                        </p>
                      </div>
                      <div className="p-4 rounded-xl" style={{ backgroundColor: '#FEF2F2' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">❌</span>
                          <h4 className="font-semibold text-sm" style={{ color: '#DC2626' }}>DOES NOT QUALIFY: Massage</h4>
                        </div>
                        <p className="text-xs" style={{ color: '#DC2626' }}>
                          Massage is a passive service, not educational. It cannot be counted toward CLE credit requirements.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* States & Product Suite */}
                <div className="space-y-4">
                  <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(0,55,86,0.1)' }}>
                    <div className="p-3" style={{ backgroundColor: '#003756' }}>
                      <h3 className="font-semibold text-white text-sm">CLE Requirements by State</h3>
                    </div>
                    <div className="p-3" style={{ backgroundColor: 'white' }}>
                      <table className="w-full text-xs">
                        <tbody>
                          {[
                            { state: 'Florida', req: '5 hrs / 3 yrs (mandatory)' },
                            { state: 'Illinois', req: '1 hr / 2 yrs (mandatory)' },
                            { state: 'New York', req: 'Wellness → competence credits' },
                            { state: 'California', req: '1 hr "Wellness Competence"' },
                            { state: 'Texas', req: 'Counts toward ethics' },
                            { state: 'Iowa', req: '1 hr mandatory' },
                            { state: 'Oregon', req: '1 hr / 3 yrs' },
                            { state: 'Minnesota', req: '1 hr mandatory' },
                            { state: 'Vermont', req: '1 hr mandatory' },
                          ].map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(0,55,86,0.1)' }}>
                              <td className="py-1.5" style={{ color: '#003756' }}>{item.state}</td>
                              <td className="py-1.5 text-right" style={{ color: '#018EA2' }}>{item.req}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* CLE Product Suite */}
                  <div className="rounded-3xl p-4" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                    <h4 className="font-semibold text-sm mb-3" style={{ color: '#003756' }}>CLE Product Suite</h4>
                    <div className="space-y-2 text-xs">
                      {[
                        { product: 'Mindfulness CLE Session', format: '60-90 min', price: '$3-5K' },
                        { product: 'Wellness Half-Day', format: 'CLE + massage', price: '$8-12K' },
                        { product: 'Wellness Full-Day', format: 'CLE + massage + headshots', price: '$15-20K' },
                        { product: 'Annual Program', format: 'Quarterly sessions', price: '$40-60K' },
                      ].map((item, idx) => (
                        <div key={idx} className="flex justify-between py-1" style={{ borderBottom: '1px solid rgba(0,55,86,0.1)' }}>
                          <span style={{ color: '#003756' }}>{item.product}</span>
                          <span style={{ color: '#018EA2' }}>{item.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Next Steps */}
              <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-4">
                <div className="rounded-2xl p-4" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                  <h4 className="font-semibold text-sm mb-2" style={{ color: '#003756' }}>Action Items</h4>
                  <div className="space-y-1 text-xs" style={{ color: '#003756' }}>
                    <p>• Apply for CLE provider status (FL, IL, CA, NY)</p>
                    <p>• Partner with bar associations</p>
                    <p>• Certify mindfulness instructors (CWMF)</p>
                    <p>• Price at $50-75/credit hour</p>
                  </div>
                </div>
                <div className="rounded-2xl p-4" style={{ backgroundColor: '#003756' }}>
                  <h4 className="font-semibold text-sm mb-2 text-white">Market Size</h4>
                  <div className="space-y-1 text-xs text-white" style={{ opacity: 0.9 }}>
                    <p>• 21% of lawyers are problem drinkers</p>
                    <p>• 28% experience depression</p>
                    <p>• 19% experience anxiety</p>
                    <p>• Mandatory credits = guaranteed demand</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 12: SHORTCUT SESSIONS ==================== */}
        {currentSlide === 11 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: 'white' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{ backgroundColor: '#FEF3C7' }}>
                  <span>🍸</span>
                  <span className="text-sm font-semibold" style={{ color: '#92400E' }}>Bonus Lever</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  The Shortcut Sessions
                </h2>
                <p className="text-lg max-w-2xl mx-auto" style={{ color: '#003756', opacity: 0.7 }}>
                  Quarterly evening events for HR leaders - our own lead-gen machine
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-8">
                {/* Event Format */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '2px solid #9EFAFF' }}>
                  <div className="p-5" style={{ backgroundColor: '#003756' }}>
                    <h3 className="font-semibold text-white">Event Format (2.5-3 hours)</h3>
                  </div>
                  <div className="p-5" style={{ backgroundColor: 'white' }}>
                    <div className="space-y-3">
                      {[
                        { time: '6:00-6:30', activity: 'Arrival, drinks, networking' },
                        { time: '6:30-7:00', activity: 'Short panel or fireside chat (client + industry speaker)' },
                        { time: '7:00-8:00', activity: 'Wellness stations rotate (chair massage, express manicures, headshot booth)' },
                        { time: '8:00-8:30', activity: 'Open networking, dessert' },
                      ].map((item, idx) => (
                        <div key={idx} className="flex gap-4 py-2 border-b" style={{ borderColor: 'rgba(0,55,86,0.1)' }}>
                          <span className="text-xs font-mono px-2 py-1 rounded" style={{ backgroundColor: '#E0F2F7', color: '#003756' }}>
                            {item.time}
                          </span>
                          <p className="text-sm flex-1" style={{ color: '#003756' }}>{item.activity}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Why It Works */}
                <div className="space-y-4">
                  <div className="rounded-3xl p-5" style={{ backgroundColor: '#E0F2F7' }}>
                    <h3 className="font-semibold mb-3" style={{ color: '#003756' }}>Why This Works</h3>
                    <div className="space-y-2">
                      {[
                        { title: 'We control the room', desc: 'Only qualified buyers, no noise' },
                        { title: 'Experience IS the pitch', desc: 'They feel what we do, not just hear' },
                        { title: 'Lower CAC', desc: '$5K event vs $15K conference booth' },
                        { title: 'Content engine', desc: 'Photos, testimonials, relationships' },
                        { title: 'Referral flywheel', desc: 'Attendees invite peers' },
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span style={{ color: '#018EA2' }}>✓</span>
                          <p className="text-sm" style={{ color: '#003756' }}>
                            <strong>{item.title}:</strong> {item.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl p-5" style={{ backgroundColor: '#003756' }}>
                    <h3 className="font-semibold mb-3 text-white">Event Economics</h3>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="text-center p-2 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                        <p className="text-xl font-semibold text-white">$4-6K</p>
                        <p className="text-xs text-white" style={{ opacity: 0.7 }}>per event</p>
                      </div>
                      <div className="text-center p-2 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                        <p className="text-xl font-semibold text-white">40-50</p>
                        <p className="text-xs text-white" style={{ opacity: 0.7 }}>attendees</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-center text-white" style={{ opacity: 0.8 }}>
                      <div>15-20 leads</div>
                      <div>8-10 meetings</div>
                      <div>3-4 clients</div>
                    </div>
                    <div className="mt-3 p-2 rounded-xl text-center" style={{ backgroundColor: 'rgba(158,250,255,0.2)' }}>
                      <p className="text-sm font-semibold" style={{ color: '#9EFAFF' }}>ROI: $5K → $45K+ = 9x return</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Calendar */}
              <div className="max-w-5xl mx-auto grid md:grid-cols-4 gap-3 mb-4">
                {[
                  { q: 'Q1', theme: '"The Reset"', desc: 'New year wellness strategy', time: 'Late January' },
                  { q: 'Q2', theme: '"Summer Ready"', desc: 'Pre-busy-season self-care', time: 'Late May' },
                  { q: 'Q3', theme: '"The Recharge"', desc: 'Back from summer, prep for Q4', time: 'Mid-September' },
                  { q: 'Q4', theme: '"The Thank You"', desc: 'Employee appreciation season', time: 'Early November' },
                ].map((item, idx) => (
                  <div key={idx} className="p-3 rounded-2xl text-center" style={{ backgroundColor: '#F8F9FA', border: '1px solid rgba(0,55,86,0.1)' }}>
                    <p className="font-bold text-sm" style={{ color: '#003756' }}>{item.q}</p>
                    <p className="text-xs font-medium" style={{ color: '#018EA2' }}>{item.theme}</p>
                    <p className="text-xs" style={{ color: '#003756', opacity: 0.6 }}>{item.time}</p>
                  </div>
                ))}
              </div>

              {/* Guest List Strategy */}
              <div className="max-w-5xl mx-auto p-4 rounded-2xl" style={{ backgroundColor: '#E0F2F7', border: '1px solid rgba(0,55,86,0.1)' }}>
                <p className="text-sm text-center" style={{ color: '#003756' }}>
                  <strong>Invite strategy:</strong> "You're invited because you're a senior HR leader at a company we respect" — exclusivity + free $200+ services + peer networking = high attendance
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 13: INVESTMENT SUMMARY ==================== */}
        {currentSlide === 12 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: '#003756' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-12">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#9EFAFF' }}>
                  H1 2026
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold mb-4 text-white" style={{ letterSpacing: '-0.02em' }}>
                  Investment Summary
                </h2>
                <p className="text-lg max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  $40K budget to execute all four levers
                </p>
              </div>

              {/* Budget Breakdown */}
              <div className="rounded-3xl overflow-hidden mb-8 max-w-3xl mx-auto" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                      <th className="text-left p-4 text-sm font-semibold text-white">Category</th>
                      <th className="text-right p-4 text-sm font-semibold text-white">Budget</th>
                      <th className="text-right p-4 text-sm font-semibold text-white">Expected Return</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { cat: 'Conferences (3)', budget: '$22K', notes: '45-75 leads' },
                      { cat: 'Content production', budget: '$5K', notes: 'Evergreen asset library' },
                      { cat: 'Hosted events (2)', budget: '$10K', notes: '30-40 leads, 6-8 clients' },
                      { cat: 'CLE development', budget: '$3K', notes: 'New revenue channel' },
                      { cat: 'LSA integration', budget: '$0 (time only)', notes: 'New distribution channel' },
                    ].map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <td className="p-4 text-sm text-white">{item.cat}</td>
                        <td className="p-4 text-sm text-right font-semibold" style={{ color: '#9EFAFF' }}>{item.budget}</td>
                        <td className="p-4 text-sm text-right text-white" style={{ opacity: 0.6 }}>{item.notes}</td>
                      </tr>
                    ))}
                    <tr style={{ backgroundColor: 'rgba(158,250,255,0.2)' }}>
                      <td className="p-4 text-sm font-bold text-white">Total H1 Investment</td>
                      <td className="p-4 text-sm text-right font-bold" style={{ color: '#9EFAFF' }}>$40K</td>
                      <td className="p-4 text-sm text-right text-white" style={{ opacity: 0.6 }}>Foundation for +$330K growth</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* H1 Success Metrics */}
              <div className="grid grid-cols-4 gap-4 max-w-4xl mx-auto">
                {[
                  { metric: '150+', label: 'Qualified Leads', sub: 'generated' },
                  { metric: '8-12', label: 'New Clients', sub: 'closed' },
                  { metric: '$150K+', label: 'New Recurring', sub: 'revenue added' },
                  { metric: '$975K+', label: 'Run Rate', sub: 'by June 30' },
                ].map((item, idx) => (
                  <div key={idx} className="text-center p-4 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                    <p className="text-2xl font-bold text-white">{item.metric}</p>
                    <p className="text-sm font-medium" style={{ color: '#9EFAFF' }}>{item.label}</p>
                    <p className="text-xs text-white" style={{ opacity: 0.5 }}>{item.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 14: NEXT STEPS ==================== */}
        {currentSlide === 13 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: 'white' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <h2 className="text-4xl md:text-6xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Next Steps
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                {/* Immediate (This Week) */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(0,55,86,0.1)' }}>
                  <div className="p-4 flex items-center justify-between" style={{ backgroundColor: '#FF5050' }}>
                    <h3 className="font-semibold text-white">This Week</h3>
                    <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'white', color: '#FF5050' }}>
                      Priority
                    </span>
                  </div>
                  <div className="p-5 space-y-4" style={{ backgroundColor: 'white' }}>
                    {[
                      'Validate assumptions in this plan',
                      'Finalize H1 conference selections',
                      'Begin CLE provider applications',
                      'Schedule Shortcut Sessions venue scouting',
                      'Draft first blog post outline',
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <input type="checkbox" className="mt-1" style={{ accentColor: '#FF5050' }} />
                        <p className="text-sm" style={{ color: '#003756' }}>{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* This Month */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(0,55,86,0.1)' }}>
                  <div className="p-4 flex items-center justify-between" style={{ backgroundColor: '#003756' }}>
                    <h3 className="font-semibold text-white">This Month</h3>
                    <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#9EFAFF', color: '#003756' }}>
                      January
                    </span>
                  </div>
                  <div className="p-5 space-y-4" style={{ backgroundColor: 'white' }}>
                    {[
                      'Book first conference booth',
                      'Contact Forma + Benepass re: vendor partnerships',
                      'Publish first HR blog post',
                      'Identify CWMF certification path',
                      'Create conference booth design brief',
                      'Plan first Shortcut Sessions guest list',
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <input type="checkbox" className="mt-1" style={{ accentColor: '#003756' }} />
                        <p className="text-sm" style={{ color: '#003756' }}>{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Open Questions */}
              <div className="mt-8 max-w-5xl mx-auto p-5 rounded-3xl" style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D' }}>
                <h3 className="font-semibold mb-3" style={{ color: '#92400E' }}>Open Questions to Resolve</h3>
                <div className="grid md:grid-cols-2 gap-3 text-sm" style={{ color: '#92400E' }}>
                  <p>• Which 3 conferences for H1? (Need final picks)</p>
                  <p>• Shortcut Sessions venue - rooftop vs. private space?</p>
                  <p>• Who writes blog content - in-house or freelance?</p>
                  <p>• CLE pricing model - per credit or subscription?</p>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-10 text-center">
                <p className="text-lg font-semibold mb-6" style={{ color: '#003756' }}>
                  Let's execute.
                </p>
                <div className="flex gap-4 justify-center">
                  <a
                    href="mailto:will@getshortcut.co"
                    className="inline-block px-8 py-4 rounded-full text-lg font-medium transition-all hover:scale-105"
                    style={{ backgroundColor: '#003756', color: 'white' }}
                  >
                    Schedule Review
                  </a>
                  <button
                    onClick={() => goToSlide(0)}
                    className="inline-block px-8 py-4 rounded-full text-lg font-medium transition-all hover:scale-105"
                    style={{ backgroundColor: '#E0F2F7', color: '#003756' }}
                  >
                    Back to Start
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
