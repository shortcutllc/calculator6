import { useState, useEffect } from 'react';

export default function Plan2026() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    'title',
    '2025-summary',
    'customer-base',
    '2025-challenges',
    '2026-targets',
    'exit-strategy',
    'four-levers',
    'content-strategy',
    'content-distribution',
    'conference-strategy',
    'conference-leads',
    'conference-recommendations',
    'nyc-conferences',
    'healthcare-cigna',
    'healthcare-targets',
    'healthcare-brokers',
    'healthcare-action-plan',
    'cle-lawyers',
    'cle-revenue',
    'shortcut-sessions',
    'shortcut-invitation',
    'investment-summary',
    'q1-action-items',
    'next-steps',
    'appendix-conferences',
    'appendix-insurers',
    'appendix-brokers'
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

        {/* ==================== SLIDE 4: 2025 CHALLENGES ==================== */}
        {currentSlide === 3 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: 'white' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-12">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#FF5050' }}>
                  The 2026 Question
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  2025 Challenges
                </h2>
                <p className="text-lg max-w-2xl mx-auto" style={{ color: '#003756', opacity: 0.7 }}>
                  These are go-to-market tuning issues, not product or execution failures. The model works.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-8">
                {/* Quarterly Breakdown */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(0,55,86,0.1)' }}>
                  <div className="p-4" style={{ backgroundColor: '#003756' }}>
                    <h3 className="font-semibold text-white">Quarterly Breakdown</h3>
                  </div>
                  <div className="p-4" style={{ backgroundColor: 'white' }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '2px solid rgba(0,55,86,0.1)' }}>
                          <th className="text-left py-2 font-semibold" style={{ color: '#003756' }}>Quarter</th>
                          <th className="text-right py-2 font-semibold" style={{ color: '#003756' }}>Revenue</th>
                          <th className="text-right py-2 font-semibold" style={{ color: '#003756' }}>QoQ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { q: 'Q1', rev: '$175,172', change: '—' },
                          { q: 'Q2', rev: '$160,369', change: '-8.5%', down: true },
                          { q: 'Q3', rev: '$179,104', change: '+11.7%' },
                          { q: 'Q4', rev: '$206,194', change: '+15.1%', highlight: true },
                        ].map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(0,55,86,0.1)', backgroundColor: item.highlight ? '#E0F2F7' : 'transparent' }}>
                            <td className="py-2" style={{ color: '#003756' }}>{item.q}</td>
                            <td className="py-2 text-right font-medium" style={{ color: '#003756' }}>{item.rev}</td>
                            <td className="py-2 text-right" style={{ color: item.down ? '#DC2626' : item.highlight ? '#018EA2' : '#003756' }}>{item.change}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-4 p-3 rounded-xl" style={{ backgroundColor: '#E0F2F7' }}>
                      <p className="text-xs" style={{ color: '#003756' }}>
                        <strong>Holiday season (Nov 1 - Dec 25):</strong> $112,922 — validating Shortcut as a "pressure valve" for high-stress periods.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Challenges List */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '2px solid #FF5050' }}>
                  <div className="p-4" style={{ backgroundColor: '#FF5050' }}>
                    <h3 className="font-semibold text-white">Key Challenges</h3>
                  </div>
                  <div className="p-5" style={{ backgroundColor: 'white' }}>
                    <div className="space-y-4">
                      {[
                        { challenge: 'Missed $1M exit goal', impact: 'Ended at $825K run rate vs $1M target' },
                        { challenge: 'Slow partner acquisition', impact: 'Net-new recurring partners didn\'t compound quickly enough' },
                        { challenge: 'Revenue quality', impact: 'Some growth was one-time events vs recurring contracts' },
                        { challenge: 'Visibility gaps', impact: 'Revenue timing made forecasting difficult' },
                        { challenge: 'Concentration risk', impact: 'DraftKings LV = 15%+ of gross revenue' },
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-start gap-3 pb-3" style={{ borderBottom: idx < 4 ? '1px solid rgba(0,55,86,0.1)' : 'none' }}>
                          <span className="text-lg">⚠️</span>
                          <div>
                            <p className="font-medium text-sm" style={{ color: '#003756' }}>{item.challenge}</p>
                            <p className="text-xs" style={{ color: '#003756', opacity: 0.7 }}>{item.impact}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* The Big Question */}
              <div className="max-w-3xl mx-auto text-center p-6 rounded-3xl" style={{ backgroundColor: '#003756' }}>
                <p className="text-lg text-white mb-2">The story is no longer "can this work?"</p>
                <p className="text-2xl font-semibold" style={{ color: '#9EFAFF' }}>
                  It's how quickly Shortcut compounds what already works.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 5: 2026 TARGETS ==================== */}
        {currentSlide === 4 && (
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

        {/* ==================== SLIDE 6: EXIT STRATEGY ==================== */}
        {currentSlide === 5 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: '#E0F2F7' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-12">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#003756', opacity: 0.6 }}>
                  Long-Term Vision
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Exit Strategy
                </h2>
                <p className="text-lg max-w-2xl mx-auto" style={{ color: '#003756', opacity: 0.7 }}>
                  Start acquirer search mid-2028, close by end of 2028
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                {/* Acquisition Metrics */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '2px solid #9EFAFF' }}>
                  <div className="p-4" style={{ backgroundColor: '#003756' }}>
                    <h3 className="font-semibold text-white">Acquisition Metrics at Exit</h3>
                  </div>
                  <div className="p-5" style={{ backgroundColor: 'white' }}>
                    <table className="w-full text-sm">
                      <tbody>
                        {[
                          { metric: 'Annual Sales', value: '$2.8M' },
                          { metric: 'Service Provider Cost', value: '$1.16M' },
                          { metric: 'Gross Margin', value: '65%', highlight: true },
                          { metric: 'Gross Profit', value: '$1.64M' },
                          { metric: 'Annual Expenses', value: '$600K' },
                          { metric: 'EBITDA', value: '$1.0M', highlight: true },
                          { metric: 'EBITDA Margin', value: '36%' },
                        ].map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(0,55,86,0.1)' }}>
                            <td className="py-2" style={{ color: '#003756' }}>{item.metric}</td>
                            <td className="py-2 text-right font-semibold" style={{ color: item.highlight ? '#018EA2' : '#003756' }}>{item.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Target Value & Timeline */}
                <div className="space-y-4">
                  <div className="rounded-3xl p-6 text-center" style={{ backgroundColor: '#003756' }}>
                    <p className="text-sm text-white mb-2" style={{ opacity: 0.7 }}>Target Purchase Value</p>
                    <p className="text-5xl font-bold" style={{ color: '#9EFAFF' }}>$15-20M</p>
                  </div>

                  <div className="rounded-3xl p-5" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                    <h4 className="font-semibold mb-4" style={{ color: '#003756' }}>Timeline to Exit</h4>
                    <div className="space-y-3">
                      {[
                        { year: '2026', milestone: 'Hit $1.155M run rate (+40%)' },
                        { year: '2027', milestone: 'Scale to $1.617M run rate (+40%)' },
                        { year: '2028 H1', milestone: 'Reach $2.1M run rate (+30%)' },
                        { year: '2028 H2', milestone: 'Start acquirer search, close deal' },
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <span className="px-2 py-1 rounded text-xs font-mono" style={{ backgroundColor: '#E0F2F7', color: '#003756' }}>
                            {item.year}
                          </span>
                          <p className="text-sm" style={{ color: '#003756' }}>{item.milestone}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 7: FOUR LEVERS ==================== */}
        {currentSlide === 6 && (
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

        {/* ==================== SLIDE 8: CONTENT STRATEGY ==================== */}
        {currentSlide === 7 && (
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

        {/* ==================== SLIDE 9: CONTENT DISTRIBUTION ==================== */}
        {currentSlide === 8 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: '#E0F2F7' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-12">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#003756', opacity: 0.6 }}>
                  Content Strategy
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Distribution Strategy
                </h2>
                <p className="text-lg max-w-2xl mx-auto" style={{ color: '#003756', opacity: 0.7 }}>
                  Where and how we'll share content to reach target buyers
                </p>
              </div>

              <div className="max-w-4xl mx-auto">
                <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(0,55,86,0.1)' }}>
                  <div className="p-4" style={{ backgroundColor: '#003756' }}>
                    <h3 className="font-semibold text-white">Distribution Channels</h3>
                  </div>
                  <div className="p-5" style={{ backgroundColor: 'white' }}>
                    <table className="w-full">
                      <thead>
                        <tr style={{ borderBottom: '2px solid rgba(0,55,86,0.1)' }}>
                          <th className="text-left py-3 text-sm font-semibold" style={{ color: '#003756' }}>Channel</th>
                          <th className="text-left py-3 text-sm font-semibold" style={{ color: '#003756' }}>Content Type</th>
                          <th className="text-left py-3 text-sm font-semibold" style={{ color: '#003756' }}>Frequency</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { channel: 'LinkedIn (company + personal)', content: 'Thought leadership, client wins, behind-the-scenes', freq: '3-5x/week' },
                          { channel: 'Email newsletter', content: 'Curated insights for HR/Workplace leaders', freq: 'Bi-weekly' },
                          { channel: 'Website / SEO', content: 'Evergreen guides, case studies', freq: 'Ongoing' },
                          { channel: 'Conference follow-up', content: 'Targeted content based on conversation', freq: 'Event-driven' },
                        ].map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(0,55,86,0.1)' }}>
                            <td className="py-3 text-sm font-medium" style={{ color: '#003756' }}>{item.channel}</td>
                            <td className="py-3 text-sm" style={{ color: '#003756', opacity: 0.8 }}>{item.content}</td>
                            <td className="py-3 text-sm" style={{ color: '#018EA2' }}>{item.freq}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-2xl" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                  <p className="text-sm text-center" style={{ color: '#003756' }}>
                    <strong>Key insight:</strong> We're selling something they didn't know they needed. That's an education problem, not a sales problem.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 10: CONFERENCE STRATEGY ==================== */}
        {currentSlide === 9 && (
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

        {/* ==================== SLIDE 11: LEAD ESTIMATION METHODOLOGY ==================== */}
        {currentSlide === 10 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: 'white' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#018EA2' }}>
                  Conference Strategy
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Lead Estimation
                </h2>
                <p className="text-lg max-w-2xl mx-auto" style={{ color: '#003756', opacity: 0.7 }}>
                  How we calculate expected leads from each conference
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                {/* Methodology */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(0,55,86,0.1)' }}>
                  <div className="p-4" style={{ backgroundColor: '#003756' }}>
                    <h3 className="font-semibold text-white">Calculation Variables</h3>
                  </div>
                  <div className="p-5" style={{ backgroundColor: 'white' }}>
                    <div className="space-y-3">
                      {[
                        { variable: 'Attendees in target persona', assumption: '30-50% of total (HR, Benefits, Workplace Exp)' },
                        { variable: 'Booth traffic rate', assumption: '10-15% of relevant attendees visit a given booth' },
                        { variable: 'Conversation-to-lead conversion', assumption: '50-70% of booth conversations = qualified lead' },
                        { variable: 'Speaking/session bonus', assumption: '+20-30% leads if you have a speaking slot' },
                      ].map((item, idx) => (
                        <div key={idx} className="py-2" style={{ borderBottom: '1px solid rgba(0,55,86,0.1)' }}>
                          <p className="font-medium text-sm" style={{ color: '#003756' }}>{item.variable}</p>
                          <p className="text-xs" style={{ color: '#018EA2' }}>{item.assumption}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Examples */}
                <div className="space-y-4">
                  <div className="rounded-3xl p-5" style={{ backgroundColor: '#E0F2F7' }}>
                    <h4 className="font-semibold mb-3" style={{ color: '#003756' }}>Example: Workhuman (3,000 attendees)</h4>
                    <div className="space-y-1 text-sm" style={{ color: '#003756' }}>
                      <p>• Target personas: ~60% = 1,800 relevant</p>
                      <p>• Booth traffic: 10% = 180 visits</p>
                      <p>• Qualified: 60% = ~108 leads at top end</p>
                      <p>• <strong>Conservative (no speaking slot): 20-30 leads</strong></p>
                    </div>
                  </div>

                  <div className="rounded-3xl p-5" style={{ backgroundColor: '#E0F2F7' }}>
                    <h4 className="font-semibold mb-3" style={{ color: '#003756' }}>Example: Wellbeing at Work NYC (500 attendees)</h4>
                    <div className="space-y-1 text-sm" style={{ color: '#003756' }}>
                      <p>• Target personas: ~80% = 400 relevant (highly curated)</p>
                      <p>• Booth/networking capture: 15% = 60 conversations</p>
                      <p>• Qualified: 70% = ~40 leads at top end</p>
                      <p>• <strong>Conservative: 15-25 leads</strong></p>
                    </div>
                  </div>

                  <div className="rounded-3xl p-4" style={{ backgroundColor: '#003756' }}>
                    <h4 className="font-semibold mb-2 text-white text-sm">Lead Multipliers</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs text-white">
                      <div>Speaking slot: <span style={{ color: '#9EFAFF' }}>+50-100%</span></div>
                      <div>Sponsored session: <span style={{ color: '#9EFAFF' }}>+30%</span></div>
                      <div>Pre-conference outreach: <span style={{ color: '#9EFAFF' }}>+20%</span></div>
                      <div>On-site activation: <span style={{ color: '#9EFAFF' }}>+25%</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 12: CONFERENCE RECOMMENDATIONS ==================== */}
        {currentSlide === 11 && (
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

        {/* ==================== SLIDE 13: NYC/LOCAL CONFERENCES ==================== */}
        {currentSlide === 12 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: '#E0F2F7' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#003756', opacity: 0.6 }}>
                  Conference Strategy
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  NYC/Local Conferences
                </h2>
                <p className="text-lg max-w-2xl mx-auto" style={{ color: '#003756', opacity: 0.7 }}>
                  Lower cost, higher efficiency events on home turf
                </p>
              </div>

              <div className="rounded-3xl overflow-hidden mb-6" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                <div className="p-4" style={{ backgroundColor: '#003756' }}>
                  <h3 className="font-semibold text-white">NYC/Local Event Priority List</h3>
                </div>
                <div className="p-3 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(0,55,86,0.1)' }}>
                        <th className="text-left py-2 font-semibold" style={{ color: '#003756' }}>#</th>
                        <th className="text-left py-2 font-semibold" style={{ color: '#003756' }}>Event</th>
                        <th className="text-center py-2 font-semibold" style={{ color: '#003756' }}>Timing</th>
                        <th className="text-center py-2 font-semibold" style={{ color: '#003756' }}>Cost</th>
                        <th className="text-center py-2 font-semibold" style={{ color: '#003756' }}>Fit</th>
                        <th className="text-center py-2 font-semibold" style={{ color: '#003756' }}>Priority</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { rank: '1', name: 'Wellbeing at Work NYC', timing: 'March 3-5', cost: '$3-5K', fit: '⭐⭐⭐⭐⭐', priority: 'TOP PICK', highlight: true },
                        { rank: '2', name: 'Conference Board Employee Health Care', timing: 'March 17-18', cost: '$3-5K', fit: '⭐⭐⭐⭐⭐', priority: 'TOP PICK', highlight: true },
                        { rank: '3', name: 'From Day One NYC Benefits', timing: 'TBD 2026', cost: '$2-3K', fit: '⭐⭐⭐⭐⭐', priority: 'TOP PICK', highlight: true },
                        { rank: '4', name: 'From Day One Manhattan Full-Day', timing: 'TBD 2026', cost: '$2-3K', fit: '⭐⭐⭐⭐', priority: 'Tier 2' },
                        { rank: '5', name: 'NYC SHRM Global Wellbeing', timing: 'Jan 29', cost: '$500-1K', fit: '⭐⭐⭐⭐⭐', priority: 'Quick win' },
                        { rank: '6', name: 'NYC SHRM Monthly', timing: 'Ongoing', cost: '$50-150/ea', fit: '⭐⭐⭐', priority: 'Relationship building' },
                        { rank: '7', name: 'HR Vision New York', timing: 'Jan 14-15', cost: '$2-3K', fit: '⭐⭐⭐', priority: 'Broad HR' },
                        { rank: '8', name: 'LinkedIn Talent Connect', timing: 'Sept 2026', cost: 'TBD', fit: '⭐⭐⭐', priority: 'Talent focus' },
                        { rank: '9', name: 'CoreNet Global NYC', timing: 'Varies', cost: '$1-2K', fit: '⭐⭐⭐⭐', priority: 'Workplace Exp buyers' },
                      ].map((event, idx) => (
                        <tr key={idx} style={{
                          borderBottom: '1px solid rgba(0,55,86,0.1)',
                          backgroundColor: event.highlight ? '#E0F2F7' : 'transparent'
                        }}>
                          <td className="py-2 font-bold" style={{ color: event.highlight ? '#018EA2' : '#003756' }}>{event.rank}</td>
                          <td className="py-2 font-medium" style={{ color: '#003756' }}>{event.name}</td>
                          <td className="py-2 text-center" style={{ color: '#003756' }}>{event.timing}</td>
                          <td className="py-2 text-center" style={{ color: '#018EA2' }}>{event.cost}</td>
                          <td className="py-2 text-center">{event.fit}</td>
                          <td className="py-2 text-center text-xs" style={{ color: event.highlight ? '#018EA2' : '#003756' }}>{event.priority}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="rounded-2xl p-4" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                  <h4 className="font-semibold text-sm mb-2" style={{ color: '#003756' }}>#2: Conference Board NYC</h4>
                  <p className="text-xs" style={{ color: '#003756', opacity: 0.7 }}>
                    Enterprise HR & benefits leaders focused on workforce wellbeing. The Conference Board is blue-chip — attendees are senior. This is where you find your next BCG or DraftKings.
                  </p>
                </div>
                <div className="rounded-2xl p-4" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                  <h4 className="font-semibold text-sm mb-2" style={{ color: '#003756' }}>#3: From Day One Benefits</h4>
                  <p className="text-xs" style={{ color: '#003756', opacity: 0.7 }}>
                    Benefits & Total Rewards leaders — budget holders. Half-day format. Efficient. 5 min from Grand Central. High efficiency play. Get in, meet buyers, get out.
                  </p>
                </div>
                <div className="rounded-2xl p-4" style={{ backgroundColor: '#003756' }}>
                  <h4 className="font-semibold text-sm mb-2 text-white">Location Advantage</h4>
                  <p className="text-xs text-white" style={{ opacity: 0.8 }}>
                    NYC events = no travel cost, easy to activate your network, can meet everyone who matters. Home field advantage.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 14: HEALTHCARE - CIGNA ==================== */}
        {currentSlide === 13 && (
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

        {/* ==================== SLIDE 15: HEALTHCARE - LSA TARGETS ==================== */}
        {currentSlide === 14 && (
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

        {/* ==================== SLIDE 16: HEALTHCARE BROKERS ==================== */}
        {currentSlide === 15 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: '#E0F2F7' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#003756', opacity: 0.6 }}>
                  Healthcare Channel
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Benefits Broker Targets
                </h2>
                <p className="text-lg max-w-2xl mx-auto" style={{ color: '#003756', opacity: 0.7 }}>
                  Brokers recommend wellness vendors to their employer clients
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                {/* Broker List */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(0,55,86,0.1)' }}>
                  <div className="p-4" style={{ backgroundColor: '#003756' }}>
                    <h3 className="font-semibold text-white">Target Broker/Consultant Firms</h3>
                  </div>
                  <div className="p-4" style={{ backgroundColor: 'white' }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '2px solid rgba(0,55,86,0.1)' }}>
                          <th className="text-left py-2 font-semibold" style={{ color: '#003756' }}>Firm</th>
                          <th className="text-left py-2 font-semibold" style={{ color: '#003756' }}>Focus</th>
                          <th className="text-left py-2 font-semibold" style={{ color: '#003756' }}>Why Target</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { firm: 'Gallagher', focus: 'Mid-market to enterprise', why: 'Holistic wellbeing focus' },
                          { firm: 'Lockton', focus: 'Mid-market', why: '"Mind Your Health" program' },
                          { firm: 'USI', focus: 'Mid-market', why: 'Extensive wellness vendor networks' },
                          { firm: 'Mercer', focus: 'Enterprise', why: 'Workplace Health practice' },
                          { firm: 'WTW', focus: 'Enterprise', why: '"Integrated Wellbeing Solution"' },
                          { firm: 'Aon', focus: 'Enterprise', why: 'Health Solutions practice' },
                        ].map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(0,55,86,0.1)' }}>
                            <td className="py-2 font-medium" style={{ color: '#003756' }}>{item.firm}</td>
                            <td className="py-2" style={{ color: '#003756', opacity: 0.7 }}>{item.focus}</td>
                            <td className="py-2 text-xs" style={{ color: '#018EA2' }}>{item.why}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Value Prop & Event */}
                <div className="space-y-4">
                  <div className="rounded-3xl p-5" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                    <h4 className="font-semibold mb-3" style={{ color: '#003756' }}>Broker Value Proposition</h4>
                    <div className="p-4 rounded-xl" style={{ backgroundColor: '#E0F2F7' }}>
                      <p className="text-sm italic" style={{ color: '#003756' }}>
                        "90% of your clients don't have decent wellness programming. We can help you fill that gap — and you get the credit for bringing them a solution."
                      </p>
                    </div>
                  </div>

                  <div className="rounded-3xl p-5" style={{ backgroundColor: '#003756' }}>
                    <h4 className="font-semibold mb-3 text-white">Event to Target</h4>
                    <div className="p-3 rounded-xl mb-3" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                      <p className="font-medium text-white">BenefitsPRO Broker Expo</p>
                      <p className="text-xs text-white" style={{ opacity: 0.7 }}>April 28-30, Chicago</p>
                    </div>
                    <div className="space-y-1 text-xs text-white" style={{ opacity: 0.8 }}>
                      <p>• 700+ benefits brokers and advisors</p>
                      <p>• 8.5 hours dedicated networking</p>
                      <p>• Good if pursuing broker channel seriously</p>
                    </div>
                  </div>

                  <div className="rounded-3xl p-4" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                    <h4 className="font-semibold text-sm mb-2" style={{ color: '#003756' }}>Who to Target Within Insurers</h4>
                    <div className="space-y-1 text-xs" style={{ color: '#003756' }}>
                      <p>• Health Engagement Consultant</p>
                      <p>• Director of Wellness Programs</p>
                      <p>• VP of Health Engagement</p>
                      <p>• Vendor Relations Manager</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 17: HEALTHCARE ACTION PLAN ==================== */}
        {currentSlide === 16 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: 'white' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#FF5050' }}>
                  Healthcare Channel
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Action Plan
                </h2>
                <p className="text-lg max-w-2xl mx-auto" style={{ color: '#003756', opacity: 0.7 }}>
                  Tiered approach to unlocking healthcare channel revenue
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                {/* Tier 1 & 2 */}
                <div className="space-y-4">
                  <div className="rounded-3xl overflow-hidden" style={{ border: '2px solid #9EFAFF' }}>
                    <div className="p-4" style={{ backgroundColor: '#003756' }}>
                      <h3 className="font-semibold text-white">Tier 1: Fastest Path (Now)</h3>
                    </div>
                    <div className="p-4" style={{ backgroundColor: 'white' }}>
                      <div className="space-y-2 text-sm">
                        {[
                          { action: 'Create "How to Use Your Wellness Dollars" one-pager', timeline: '2 weeks' },
                          { action: 'Train sales to ask "Who is your health insurance provider?"', timeline: 'Immediate' },
                          { action: 'Build list of Cigna/Aetna/BCBS employer clients', timeline: '2 weeks' },
                          { action: 'Outreach to existing clients re: Health Improvement Fund', timeline: '2 weeks' },
                        ].map((item, idx) => (
                          <div key={idx} className="flex justify-between py-2" style={{ borderBottom: '1px solid rgba(0,55,86,0.1)' }}>
                            <span style={{ color: '#003756' }}>{item.action}</span>
                            <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#E0F2F7', color: '#018EA2' }}>{item.timeline}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(0,55,86,0.1)' }}>
                    <div className="p-4" style={{ backgroundColor: '#018EA2' }}>
                      <h3 className="font-semibold text-white">Tier 2: Broker Channel (Q1-Q2)</h3>
                    </div>
                    <div className="p-4" style={{ backgroundColor: 'white' }}>
                      <div className="space-y-2 text-sm">
                        {[
                          { action: 'Identify top 10 benefits brokers in NYC', timeline: '4 weeks' },
                          { action: 'Create broker partnership deck', timeline: '6 weeks' },
                          { action: 'Consider BenefitsPRO Broker Expo (April, Chicago)', timeline: 'April' },
                        ].map((item, idx) => (
                          <div key={idx} className="flex justify-between py-2" style={{ borderBottom: '1px solid rgba(0,55,86,0.1)' }}>
                            <span style={{ color: '#003756' }}>{item.action}</span>
                            <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#E0F2F7', color: '#018EA2' }}>{item.timeline}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tier 3 & 4 */}
                <div className="space-y-4">
                  <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(0,55,86,0.1)' }}>
                    <div className="p-4" style={{ backgroundColor: '#FF5050' }}>
                      <h3 className="font-semibold text-white">Tier 3: Direct Insurer Registration (Q2)</h3>
                    </div>
                    <div className="p-4" style={{ backgroundColor: 'white' }}>
                      <div className="space-y-2 text-sm">
                        {[
                          { action: 'Register on Cigna Supplier Portal', timeline: 'Q2' },
                          { action: 'Register on CVS/Aetna Supplier Portal', timeline: 'Q2' },
                          { action: 'Connect with Health Engagement Consultants via LinkedIn', timeline: 'Q2' },
                        ].map((item, idx) => (
                          <div key={idx} className="flex justify-between py-2" style={{ borderBottom: '1px solid rgba(0,55,86,0.1)' }}>
                            <span style={{ color: '#003756' }}>{item.action}</span>
                            <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>{item.timeline}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(0,55,86,0.1)' }}>
                    <div className="p-4" style={{ backgroundColor: '#003756' }}>
                      <h3 className="font-semibold text-white">Tier 4: LSA Platform Integration (Q2-Q3)</h3>
                    </div>
                    <div className="p-4" style={{ backgroundColor: 'white' }}>
                      <div className="space-y-2 text-sm">
                        {[
                          { action: 'Apply to Forma vendor network', timeline: 'Q2' },
                          { action: 'Apply to Benepass vendor network', timeline: 'Q2' },
                          { action: 'Apply to Compt vendor network', timeline: 'Q2' },
                        ].map((item, idx) => (
                          <div key={idx} className="flex justify-between py-2" style={{ borderBottom: '1px solid rgba(0,55,86,0.1)' }}>
                            <span style={{ color: '#003756' }}>{item.action}</span>
                            <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#E0F2F7', color: '#018EA2' }}>{item.timeline}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl" style={{ backgroundColor: '#E0F2F7' }}>
                    <p className="text-xs text-center" style={{ color: '#003756' }}>
                      <strong>Key insight:</strong> This is NOT individual HSA/FSA. This is pooled corporate money that HR can use to pay for Shortcut services.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 18: CLE FOR LAWYERS ==================== */}
        {currentSlide === 17 && (
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

        {/* ==================== SLIDE 19: CLE REVENUE POTENTIAL ==================== */}
        {currentSlide === 18 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: 'white' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#018EA2' }}>
                  CLE for Lawyers
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Path to Market & Revenue
                </h2>
                <p className="text-lg max-w-2xl mx-auto" style={{ color: '#003756', opacity: 0.7 }}>
                  The CLE credit gets you in the door. The services make you unforgettable.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-8">
                {/* Path to Market */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(0,55,86,0.1)' }}>
                  <div className="p-4" style={{ backgroundColor: '#003756' }}>
                    <h3 className="font-semibold text-white">Path to Market</h3>
                  </div>
                  <div className="p-5" style={{ backgroundColor: 'white' }}>
                    <div className="space-y-3">
                      {[
                        { step: '1', action: 'Get CLE accreditation in NY, CA, FL, IL, TX', note: '45-60 day process per state' },
                        { step: '2', action: 'Partner with bar associations for distribution', note: 'NYC Bar, state bars' },
                        { step: '3', action: 'Target Am Law 200 firms with existing wellness budgets', note: 'Already spending on wellness' },
                        { step: '4', action: 'Pilot with Wachtell or similar existing client', note: 'Leverage existing relationship' },
                        { step: '5', action: 'Bundle with existing services', note: 'CLE + massage + headshots' },
                      ].map((item, idx) => (
                        <div key={idx} className="flex gap-3 py-2" style={{ borderBottom: '1px solid rgba(0,55,86,0.1)' }}>
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: '#E0F2F7', color: '#003756' }}>
                            {item.step}
                          </span>
                          <div>
                            <p className="text-sm font-medium" style={{ color: '#003756' }}>{item.action}</p>
                            <p className="text-xs" style={{ color: '#018EA2' }}>{item.note}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Revenue Potential */}
                <div className="space-y-4">
                  <div className="rounded-3xl overflow-hidden" style={{ border: '2px solid #9EFAFF' }}>
                    <div className="p-4" style={{ backgroundColor: '#003756' }}>
                      <h3 className="font-semibold text-white">Revenue Potential</h3>
                    </div>
                    <div className="p-4" style={{ backgroundColor: 'white' }}>
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ borderBottom: '2px solid rgba(0,55,86,0.1)' }}>
                            <th className="text-left py-2 font-semibold" style={{ color: '#003756' }}>Scenario</th>
                            <th className="text-left py-2 font-semibold" style={{ color: '#003756' }}>Math</th>
                            <th className="text-right py-2 font-semibold" style={{ color: '#003756' }}>Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { scenario: 'Conservative', math: '10 firms × $10K/year', revenue: '$100K' },
                            { scenario: 'Moderate', math: '25 firms × $15K/year', revenue: '$375K', highlight: true },
                            { scenario: 'Aggressive', math: '50 firms × $15K/year', revenue: '$750K' },
                          ].map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(0,55,86,0.1)', backgroundColor: item.highlight ? '#E0F2F7' : 'transparent' }}>
                              <td className="py-2" style={{ color: '#003756' }}>{item.scenario}</td>
                              <td className="py-2 text-xs" style={{ color: '#003756', opacity: 0.7 }}>{item.math}</td>
                              <td className="py-2 text-right font-bold" style={{ color: item.highlight ? '#018EA2' : '#003756' }}>{item.revenue}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-3xl p-5" style={{ backgroundColor: '#E0F2F7' }}>
                    <h4 className="font-semibold mb-3" style={{ color: '#003756' }}>The Shortcut CLE Bundle</h4>
                    <div className="space-y-2 text-sm">
                      {[
                        { component: 'Mindfulness workshop (60-90 min)', cle: '1-1.5 credits', value: 'Continuing education' },
                        { component: 'Chair massage (during breaks)', cle: 'No', value: 'Experiential differentiation' },
                        { component: 'Headshots (optional)', cle: 'No', value: 'Practical takeaway' },
                      ].map((item, idx) => (
                        <div key={idx} className="flex justify-between py-1" style={{ borderBottom: '1px solid rgba(0,55,86,0.1)' }}>
                          <span style={{ color: '#003756' }}>{item.component}</span>
                          <span className="text-xs" style={{ color: item.cle === 'No' ? '#DC2626' : '#018EA2' }}>{item.cle === 'No' ? '❌' : '✅'} {item.cle}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="max-w-3xl mx-auto p-4 rounded-2xl text-center" style={{ backgroundColor: '#003756' }}>
                <p className="text-sm text-white">
                  <strong style={{ color: '#9EFAFF' }}>Positioning:</strong> "CLE-accredited wellness day — mindfulness training that counts toward CLE, plus chair massage and headshots to make it memorable."
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 20: SHORTCUT SESSIONS ==================== */}
        {currentSlide === 19 && (
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

        {/* ==================== SLIDE 21: SAMPLE INVITATION ==================== */}
        {currentSlide === 20 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: '#E0F2F7' }}>
            <div className="max-w-4xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#003756', opacity: 0.6 }}>
                  Shortcut Sessions
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Sample Invitation
                </h2>
                <p className="text-lg max-w-2xl mx-auto" style={{ color: '#003756', opacity: 0.7 }}>
                  How we'll reach out to prospective attendees
                </p>
              </div>

              <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(0,55,86,0.1)', boxShadow: '0 10px 40px rgba(0,55,86,0.1)' }}>
                <div className="p-4" style={{ backgroundColor: '#003756' }}>
                  <p className="text-sm text-white" style={{ opacity: 0.7 }}>Subject:</p>
                  <p className="font-semibold text-white">You're invited: An evening for HR leaders who actually care about their people</p>
                </div>
                <div className="p-6" style={{ backgroundColor: 'white' }}>
                  <div className="space-y-4 text-sm" style={{ color: '#003756' }}>
                    <p>[Name],</p>

                    <p>We're hosting a small gathering of senior HR and Workplace Experience leaders in NYC — <strong>40 people, max</strong>.</p>

                    <p>The evening includes:</p>
                    <ul className="space-y-2 ml-4">
                      <li className="flex items-start gap-2">
                        <span style={{ color: '#018EA2' }}>→</span>
                        <span>A 20-minute conversation with [Client Name] on what's actually working in employee wellness</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span style={{ color: '#018EA2' }}>→</span>
                        <span>Complimentary chair massage, professional headshots, and express manicures</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span style={{ color: '#018EA2' }}>→</span>
                        <span>Good drinks, good food, and a room full of people who get it</span>
                      </li>
                    </ul>

                    <p className="font-medium" style={{ color: '#003756' }}>No pitch. No PowerPoints. Just an evening designed the way we think work should feel.</p>

                    <div className="p-4 rounded-xl my-4" style={{ backgroundColor: '#E0F2F7' }}>
                      <p className="font-medium" style={{ color: '#003756' }}>[Date] | 6-8:30pm | [Venue]</p>
                    </div>

                    <p>Space is limited. Let me know if you'd like to join.</p>

                    <p className="mt-6">— Will</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl text-center" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                  <p className="text-2xl font-bold" style={{ color: '#003756' }}>$200+</p>
                  <p className="text-xs" style={{ color: '#003756', opacity: 0.7 }}>value of free services</p>
                </div>
                <div className="p-4 rounded-2xl text-center" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                  <p className="text-2xl font-bold" style={{ color: '#003756' }}>40 max</p>
                  <p className="text-xs" style={{ color: '#003756', opacity: 0.7 }}>exclusivity drives attendance</p>
                </div>
                <div className="p-4 rounded-2xl text-center" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                  <p className="text-2xl font-bold" style={{ color: '#003756' }}>No pitch</p>
                  <p className="text-xs" style={{ color: '#003756', opacity: 0.7 }}>relationship building first</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 22: INVESTMENT SUMMARY ==================== */}
        {currentSlide === 21 && (
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

        {/* ==================== SLIDE 23: Q1 ACTION ITEMS ==================== */}
        {currentSlide === 22 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: 'white' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#FF5050' }}>
                  Execution Plan
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Q1 2026 Action Items
                </h2>
                <p className="text-lg max-w-2xl mx-auto" style={{ color: '#003756', opacity: 0.7 }}>
                  Specific deliverables with owners and deadlines
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                {/* Content & Conferences */}
                <div className="space-y-4">
                  <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(0,55,86,0.1)' }}>
                    <div className="p-3" style={{ backgroundColor: '#003756' }}>
                      <h3 className="font-semibold text-white text-sm">Content</h3>
                    </div>
                    <div className="p-3" style={{ backgroundColor: 'white' }}>
                      <table className="w-full text-xs">
                        <tbody>
                          {[
                            { action: '"In-Person Wellness Playbook" + 3 client video clips', deadline: 'Feb 28' },
                            { action: 'BCG case study + "What to Expect" email sequence', deadline: 'March 31' },
                          ].map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(0,55,86,0.1)' }}>
                              <td className="py-2" style={{ color: '#003756' }}>{item.action}</td>
                              <td className="py-2 text-right" style={{ color: '#018EA2' }}>{item.deadline}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(0,55,86,0.1)' }}>
                    <div className="p-3" style={{ backgroundColor: '#018EA2' }}>
                      <h3 className="font-semibold text-white text-sm">Conferences</h3>
                    </div>
                    <div className="p-3" style={{ backgroundColor: 'white' }}>
                      <table className="w-full text-xs">
                        <tbody>
                          {[
                            { action: 'Wellbeing at Work NYC', deadline: 'March 3-5' },
                            { action: 'Conference Board NYC', deadline: 'March 17-18' },
                            { action: 'Workhuman Live', deadline: 'April 27-30' },
                          ].map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(0,55,86,0.1)' }}>
                              <td className="py-2" style={{ color: '#003756' }}>{item.action}</td>
                              <td className="py-2 text-right" style={{ color: '#018EA2' }}>{item.deadline}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(0,55,86,0.1)' }}>
                    <div className="p-3" style={{ backgroundColor: '#FF5050' }}>
                      <h3 className="font-semibold text-white text-sm">CLE</h3>
                    </div>
                    <div className="p-3" style={{ backgroundColor: 'white' }}>
                      <table className="w-full text-xs">
                        <tbody>
                          {[
                            { action: 'State accreditation applications (NY, CA, FL, IL, TX)', deadline: 'Feb 15' },
                            { action: 'First law firm pilot', deadline: 'March 31' },
                          ].map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(0,55,86,0.1)' }}>
                              <td className="py-2" style={{ color: '#003756' }}>{item.action}</td>
                              <td className="py-2 text-right" style={{ color: '#FF5050' }}>{item.deadline}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Healthcare & Events */}
                <div className="space-y-4">
                  <div className="rounded-3xl overflow-hidden" style={{ border: '2px solid #9EFAFF' }}>
                    <div className="p-3" style={{ backgroundColor: '#003756' }}>
                      <h3 className="font-semibold text-white text-sm">Healthcare Channels</h3>
                    </div>
                    <div className="p-3" style={{ backgroundColor: 'white' }}>
                      <table className="w-full text-xs">
                        <tbody>
                          {[
                            { action: '"How to Use Your Wellness Dollars" one-pager', deadline: 'Feb 15' },
                            { action: 'Train sales on insurance discovery questions', deadline: 'Immediate' },
                            { action: 'Register on Cigna/Aetna supplier portals', deadline: 'Q2' },
                            { action: 'Apply to Forma, Benepass, Compt', deadline: 'Q2' },
                          ].map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(0,55,86,0.1)' }}>
                              <td className="py-2" style={{ color: '#003756' }}>{item.action}</td>
                              <td className="py-2 text-right" style={{ color: item.deadline === 'Immediate' ? '#FF5050' : '#018EA2' }}>{item.deadline}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(0,55,86,0.1)' }}>
                    <div className="p-3" style={{ backgroundColor: '#FEF3C7' }}>
                      <h3 className="font-semibold text-sm" style={{ color: '#92400E' }}>Hosted Events</h3>
                    </div>
                    <div className="p-3" style={{ backgroundColor: 'white' }}>
                      <table className="w-full text-xs">
                        <tbody>
                          <tr style={{ borderBottom: '1px solid rgba(0,55,86,0.1)' }}>
                            <td className="py-2" style={{ color: '#003756' }}>Q1 "The Reset" event</td>
                            <td className="py-2 text-right" style={{ color: '#92400E' }}>Late January</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-3xl p-4" style={{ backgroundColor: '#E0F2F7' }}>
                    <h4 className="font-semibold text-sm mb-2" style={{ color: '#003756' }}>Owner Assignments Needed</h4>
                    <div className="space-y-1 text-xs" style={{ color: '#003756' }}>
                      <p>• Content production — freelancer/agency or in-house?</p>
                      <p>• LSA platform vendor applications</p>
                      <p>• Broker outreach and insurer registration</p>
                      <p>• CLE state accreditation filings</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 24: NEXT STEPS ==================== */}
        {currentSlide === 23 && (
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
                <h3 className="font-semibold mb-3" style={{ color: '#92400E' }}>Open Questions for Team</h3>
                <div className="grid md:grid-cols-2 gap-3 text-sm" style={{ color: '#92400E' }}>
                  <p>1. <strong>Content ownership:</strong> Who leads production? Hire freelancer/agency or build in-house?</p>
                  <p>2. <strong>Conference attendance:</strong> Who goes to Workhuman? Just Will, or bring someone?</p>
                  <p>3. <strong>CLE pilot:</strong> Which law firm first? Wachtell? New target?</p>
                  <p>4. <strong>Hosted events:</strong> Ready for Q1, or start Q2?</p>
                  <p>5. <strong>LSA platforms:</strong> Who owns vendor applications?</p>
                  <p>6. <strong>Healthcare channel:</strong> Who owns broker outreach and insurer registration?</p>
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

        {/* ==================== SLIDE 25: APPENDIX - CONFERENCES ==================== */}
        {currentSlide === 24 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: '#F8F9FA' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#003756', opacity: 0.6 }}>
                  Appendix A
                </p>
                <h2 className="text-4xl md:text-5xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Full Conference Reference
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* National */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(0,55,86,0.1)' }}>
                  <div className="p-3" style={{ backgroundColor: '#003756' }}>
                    <h3 className="font-semibold text-white text-sm">National Conferences</h3>
                  </div>
                  <div className="p-2 overflow-x-auto" style={{ backgroundColor: 'white' }}>
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(0,55,86,0.1)' }}>
                          <th className="text-left py-1 font-semibold" style={{ color: '#003756' }}>Conference</th>
                          <th className="text-center py-1 font-semibold" style={{ color: '#003756' }}>Date</th>
                          <th className="text-center py-1 font-semibold" style={{ color: '#003756' }}>Cost</th>
                          <th className="text-center py-1 font-semibold" style={{ color: '#003756' }}>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { name: 'Wellbeing at Work', date: 'Mar 3-5', cost: '$3-8K', notes: 'TOP PICK', top: true },
                          { name: 'Workhuman Live', date: 'Apr 27-30', cost: '$8-15K', notes: 'TOP PICK', top: true },
                          { name: 'Total Rewards', date: 'Apr 19-22', cost: '$5-10K', notes: 'TOP PICK', top: true },
                          { name: 'Business Group Health', date: 'Apr 22-24', cost: '$5-10K', notes: 'Enterprise' },
                          { name: 'Transform', date: 'Mar 23-25', cost: '$5-10K', notes: 'Innovation' },
                          { name: 'SHRM Annual', date: 'Jun 16-19', cost: '$8-15K', notes: 'Broad, noisy' },
                          { name: 'ATD International', date: 'May 17-20', cost: '$15-25K', notes: 'L&D focus' },
                          { name: 'UNLEASH America', date: 'Mar 17-19', cost: '$8-15K', notes: 'Strategic' },
                          { name: 'HR Tech', date: 'Oct 20-22', cost: '$10-20K', notes: 'Skip', skip: true },
                          { name: 'GCUC', date: 'Apr 13-16', cost: '$5-8K', notes: 'SKIP', skip: true },
                        ].map((conf, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(0,55,86,0.1)', backgroundColor: conf.top ? '#E0F2F7' : conf.skip ? '#FEF2F2' : 'transparent' }}>
                            <td className="py-1" style={{ color: '#003756' }}>{conf.name}</td>
                            <td className="py-1 text-center" style={{ color: '#003756' }}>{conf.date}</td>
                            <td className="py-1 text-center" style={{ color: '#018EA2' }}>{conf.cost}</td>
                            <td className="py-1 text-center" style={{ color: conf.top ? '#018EA2' : conf.skip ? '#DC2626' : '#003756' }}>{conf.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* NYC/Local */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(0,55,86,0.1)' }}>
                  <div className="p-3" style={{ backgroundColor: '#018EA2' }}>
                    <h3 className="font-semibold text-white text-sm">NYC/Local Conferences</h3>
                  </div>
                  <div className="p-2 overflow-x-auto" style={{ backgroundColor: 'white' }}>
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(0,55,86,0.1)' }}>
                          <th className="text-left py-1 font-semibold" style={{ color: '#003756' }}>Event</th>
                          <th className="text-center py-1 font-semibold" style={{ color: '#003756' }}>Timing</th>
                          <th className="text-center py-1 font-semibold" style={{ color: '#003756' }}>Cost</th>
                          <th className="text-center py-1 font-semibold" style={{ color: '#003756' }}>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { name: 'Wellbeing at Work NYC', timing: 'Mar 3-5', cost: '$3-5K', notes: 'TOP PICK', top: true },
                          { name: 'Conference Board NYC', timing: 'Mar 17-18', cost: '$3-5K', notes: 'TOP PICK', top: true },
                          { name: 'From Day One Benefits', timing: 'TBD', cost: '$2-3K', notes: 'TOP PICK', top: true },
                          { name: 'From Day One Full-Day', timing: 'TBD', cost: '$2-3K', notes: 'Broader HR' },
                          { name: 'NYC SHRM Wellbeing', timing: 'Jan 29', cost: '$500-1K', notes: 'Quick win' },
                          { name: 'NYC SHRM Monthly', timing: 'Ongoing', cost: '$50-150', notes: 'Relationships' },
                          { name: 'HR Vision NY', timing: 'Jan 14-15', cost: '$2-3K', notes: 'Broad' },
                          { name: 'LinkedIn Talent', timing: 'Sept', cost: 'TBD', notes: 'Talent' },
                          { name: 'CoreNet NYC', timing: 'Varies', cost: '$1-2K', notes: 'Workplace Exp' },
                        ].map((event, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(0,55,86,0.1)', backgroundColor: event.top ? '#E0F2F7' : 'transparent' }}>
                            <td className="py-1" style={{ color: '#003756' }}>{event.name}</td>
                            <td className="py-1 text-center" style={{ color: '#003756' }}>{event.timing}</td>
                            <td className="py-1 text-center" style={{ color: '#018EA2' }}>{event.cost}</td>
                            <td className="py-1 text-center" style={{ color: event.top ? '#018EA2' : '#003756' }}>{event.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 26: APPENDIX - INSURERS ==================== */}
        {currentSlide === 25 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: '#F8F9FA' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#003756', opacity: 0.6 }}>
                  Appendix B
                </p>
                <h2 className="text-4xl md:text-5xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Insurer Contact Reference
                </h2>
              </div>

              <div className="rounded-3xl overflow-hidden max-w-4xl mx-auto" style={{ border: '1px solid rgba(0,55,86,0.1)' }}>
                <div className="p-4" style={{ backgroundColor: '#003756' }}>
                  <h3 className="font-semibold text-white">Healthcare Provider Contact Information</h3>
                </div>
                <div className="p-4" style={{ backgroundColor: 'white' }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '2px solid rgba(0,55,86,0.1)' }}>
                        <th className="text-left py-2 font-semibold" style={{ color: '#003756' }}>Insurer</th>
                        <th className="text-left py-2 font-semibold" style={{ color: '#003756' }}>Program</th>
                        <th className="text-left py-2 font-semibold" style={{ color: '#003756' }}>Registration Portal</th>
                        <th className="text-left py-2 font-semibold" style={{ color: '#003756' }}>Key Contact</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { insurer: 'Cigna', program: 'Health Improvement Fund', portal: 'cigna.supplierone.co', contact: 'Health Engagement Consultants' },
                        { insurer: 'Aetna/CVS', program: 'Premier Wellness', portal: 'cvshealth.supplierone.co', contact: 'SupplierEngagement@CVSHealth.com' },
                        { insurer: 'Elevance/Anthem', program: 'Wellbeing Solutions', portal: 'Ariba Network', contact: 'Global Supply Chain' },
                        { insurer: 'UnitedHealthcare', program: 'UHC Hub', portal: 'No public portal', contact: 'UHC Hub team' },
                        { insurer: 'BCBS', program: 'Varies', portal: 'Regional', contact: 'Regional wellness team' },
                      ].map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(0,55,86,0.1)' }}>
                          <td className="py-2 font-medium" style={{ color: '#003756' }}>{item.insurer}</td>
                          <td className="py-2" style={{ color: '#003756' }}>{item.program}</td>
                          <td className="py-2 text-xs" style={{ color: '#018EA2' }}>{item.portal}</td>
                          <td className="py-2 text-xs" style={{ color: '#003756', opacity: 0.7 }}>{item.contact}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-6 max-w-4xl mx-auto p-4 rounded-2xl" style={{ backgroundColor: '#E0F2F7' }}>
                <h4 className="font-semibold text-sm mb-2" style={{ color: '#003756' }}>Requirements to Qualify as Vendor</h4>
                <div className="grid md:grid-cols-3 gap-4 text-xs" style={{ color: '#003756' }}>
                  <div>
                    <p>• General Liability Insurance: $1-2M</p>
                    <p>• Professional Liability (E&O): $1M</p>
                  </div>
                  <div>
                    <p>• Workers' Comp: State-required</p>
                    <p>• HIPAA Compliance: Documented</p>
                  </div>
                  <div>
                    <p>• Background Checks: All staff</p>
                    <p>• References: 3+ employer clients</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 27: APPENDIX - BROKERS ==================== */}
        {currentSlide === 26 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: '#F8F9FA' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#003756', opacity: 0.6 }}>
                  Appendix C
                </p>
                <h2 className="text-4xl md:text-5xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Broker Reference
                </h2>
              </div>

              <div className="rounded-3xl overflow-hidden max-w-4xl mx-auto mb-6" style={{ border: '1px solid rgba(0,55,86,0.1)' }}>
                <div className="p-4" style={{ backgroundColor: '#003756' }}>
                  <h3 className="font-semibold text-white">Benefits Broker/Consultant Target List</h3>
                </div>
                <div className="p-4" style={{ backgroundColor: 'white' }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '2px solid rgba(0,55,86,0.1)' }}>
                        <th className="text-left py-2 font-semibold" style={{ color: '#003756' }}>Firm</th>
                        <th className="text-left py-2 font-semibold" style={{ color: '#003756' }}>Focus</th>
                        <th className="text-left py-2 font-semibold" style={{ color: '#003756' }}>Entry Point</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { firm: 'Gallagher', focus: 'Mid-market to enterprise', entry: 'Holistic Wellbeing team' },
                        { firm: 'Lockton', focus: 'Mid-market', entry: 'Mind Your Health program' },
                        { firm: 'USI', focus: 'Mid-market', entry: 'Wellness vendor network' },
                        { firm: 'Mercer', focus: 'Enterprise', entry: 'Workplace Health practice' },
                        { firm: 'WTW', focus: 'Enterprise', entry: 'Integrated Wellbeing Solution' },
                        { firm: 'Aon', focus: 'Enterprise', entry: 'Health Solutions practice' },
                      ].map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(0,55,86,0.1)' }}>
                          <td className="py-2 font-medium" style={{ color: '#003756' }}>{item.firm}</td>
                          <td className="py-2" style={{ color: '#003756', opacity: 0.7 }}>{item.focus}</td>
                          <td className="py-2" style={{ color: '#018EA2' }}>{item.entry}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="max-w-4xl mx-auto text-center">
                <p className="text-lg font-semibold mb-6" style={{ color: '#003756' }}>
                  End of Document
                </p>
                <button
                  onClick={() => goToSlide(0)}
                  className="inline-block px-8 py-4 rounded-full text-lg font-medium transition-all hover:scale-105"
                  style={{ backgroundColor: '#003756', color: 'white' }}
                >
                  Back to Start
                </button>
              </div>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
