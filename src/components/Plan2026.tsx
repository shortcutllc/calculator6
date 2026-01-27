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
    'investment-overview',
    'content-strategy',
    'content-assets',
    'conference-strategy',
    'conference-leads',
    'h1-conferences',
    'h1-conference-details',
    'h2-conferences',
    'h2-conference-details',
    'conference-playbook',
    'conference-metrics',
    'healthcare-cigna',
    'healthcare-targets',
    'healthcare-brokers',
    'healthcare-action-plan',
    'cle-lawyers',
    'cle-revenue',
    'shortcut-sessions',
    'shortcut-invitation',
    'client-entertainment',
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
            src="/Holiday Proposal/Shortcut Logo Social Nav Bar.svg"
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
                    { client: 'Wix', rev: '$15,600' },
                    { client: 'Teads', rev: '$13,480' },
                    { client: 'BCG LA', rev: '$12,285' },
                    { client: 'BISNOW', rev: '$11,770' },
                    { client: 'Wachtell Lipton', rev: '$11,730' },
                    { client: 'BCG Seattle', rev: '$11,411' },
                    { client: 'DraftKings Boston', rev: '$10,872' },
                    { client: 'Barstool Sports', rev: '$9,666' },
                    { client: 'Datadog', rev: '$9,555' },
                    { client: 'Culture Amp', rev: '$8,903' },
                    { client: 'Lockton', rev: '$8,082' },
                    { client: 'USSA', rev: '$6,085' },
                    { client: 'Schrödinger Portland', rev: '$4,800' },
                    { client: 'DeepIntent', rev: '$3,845' },
                    { client: 'Wigdor', rev: '$3,228' },
                    { client: 'BCG Brooklyn', rev: '$3,140' },
                    { client: 'Phoenix AC', rev: '$2,944' },
                    { client: 'UiPath', rev: '$2,830' },
                    { client: 'Forter', rev: '$2,760' },
                    { client: 'Ballard Spahr', rev: '$2,580' },
                    { client: 'Powin', rev: '$1,972' },
                    { client: 'Tonal', rev: '$1,890' },
                    { client: 'Nanolumens', rev: '$1,728' },
                    { client: 'Archetype', rev: '$1,701' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex justify-between p-2" style={{ borderBottom: '1px solid rgba(0,55,86,0.1)', borderRight: idx % 4 !== 3 ? '1px solid rgba(0,55,86,0.1)' : 'none' }}>
                      <span style={{ color: '#003756' }}>{item.client}</span>
                      <span className="font-semibold" style={{ color: '#018EA2' }}>{item.rev}</span>
                    </div>
                  ))}
                </div>
                <div className="p-2 text-center text-xs" style={{ backgroundColor: '#F8F9FA', color: '#003756', opacity: 0.7 }}>
                  Pattern: Multi-location expansion (BCG 5 cities, DraftKings 4 locations) is working.
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
                    title: 'Employer Wellness Funds',
                    subtitle: 'Unlock corporate wellness dollars already allocated',
                    desc: 'Health insurers provide company-level wellness funds that HR can use for group events like massage days. Q1 focus: research and understand the market.',
                    items: ['Insurer wellness funds (Cigna, Aetna, BCBS)', 'Benefits broker referral partnerships', 'Massage confirmed as eligible expense'],
                    color: '#9EFAFF'
                  },
                  {
                    num: '4',
                    title: 'Hosted Events',
                    subtitle: 'Q1 design, Q2-Q4 execute 3 events',
                    desc: 'We host our own curated events for HR leaders. Q1: design experience + secure sponsors. Launch first event late Q2.',
                    items: ['3 "Shortcut Sessions" in 2026', 'Sponsors offset costs (venue, drinks)', '40-60 qualified HR leaders per event'],
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

        {/* ==================== SLIDE 8: INVESTMENT OVERVIEW ==================== */}
        {currentSlide === 7 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: '#003756' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-12">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#9EFAFF' }}>
                  2026 Capitalization Plan
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold mb-4 text-white" style={{ letterSpacing: '-0.02em' }}>
                  Investment Overview
                </h2>
                <p className="text-lg max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  $200K minimum capital required to execute across all four levers
                </p>
              </div>

              {/* Budget Breakdown */}
              <div className="rounded-3xl overflow-hidden mb-8 max-w-4xl mx-auto" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                      <th className="text-left p-4 text-sm font-semibold text-white">Category</th>
                      <th className="text-right p-4 text-sm font-semibold text-white">H1</th>
                      <th className="text-right p-4 text-sm font-semibold text-white">H2</th>
                      <th className="text-right p-4 text-sm font-semibold text-white">Year Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { cat: 'Team Compensation & Growth', h1: '$35K', h2: '$55K', total: '$90K', note: 'Merit increases for existing team and strategic new hires; subject to adjustment based on H2 performance' },
                      { cat: 'Conferences (7 total)', h1: '$33K', h2: '$36K', total: '~$60K', note: '3 in H1, 4 in H2' },
                      { cat: 'Content & Ad Spend', h1: '$32K', h2: '$18K', total: '$50K', note: 'Marketing investment' },
                    ].map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <td className="p-4 text-sm text-white">
                          {item.cat}
                          <span className="block text-xs" style={{ opacity: 0.5 }}>{item.note}</span>
                        </td>
                        <td className="p-4 text-sm text-right font-semibold" style={{ color: '#9EFAFF' }}>{item.h1}</td>
                        <td className="p-4 text-sm text-right font-semibold" style={{ color: '#9EFAFF' }}>{item.h2}</td>
                        <td className="p-4 text-sm text-right font-bold text-white">{item.total}</td>
                      </tr>
                    ))}
                    <tr style={{ backgroundColor: 'rgba(158,250,255,0.2)' }}>
                      <td className="p-4 text-sm font-bold text-white">Total Required Capital</td>
                      <td className="p-4 text-sm text-right font-bold" style={{ color: '#9EFAFF' }}>$100K</td>
                      <td className="p-4 text-sm text-right font-bold" style={{ color: '#9EFAFF' }}>$100K</td>
                      <td className="p-4 text-sm text-right font-bold" style={{ color: '#9EFAFF' }}>$200K</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Team Investment Detail */}
              <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto mb-8">
                <div className="rounded-2xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                  <h4 className="font-semibold text-white mb-2">Existing Team</h4>
                  <p className="text-sm" style={{ color: '#9EFAFF' }}>Merit-based increases</p>
                  <p className="text-xs text-white" style={{ opacity: 0.6 }}>Competitive adjustments to retain and reward top performers</p>
                </div>
                <div className="rounded-2xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                  <h4 className="font-semibold text-white mb-2">Strategic New Hires</h4>
                  <p className="text-sm" style={{ color: '#9EFAFF' }}>Sales & Account Management</p>
                  <p className="text-xs text-white" style={{ opacity: 0.6 }}>Allocation subject to increase based on year-end performance</p>
                </div>
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

        {/* ==================== SLIDE 9: CONTENT STRATEGY ==================== */}
        {currentSlide === 8 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: 'white' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{ backgroundColor: '#E0F2F7' }}>
                  <span>📝</span>
                  <span className="text-sm font-semibold" style={{ color: '#003756' }}>Lever 1</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Content Strategy
                </h2>
                <p className="text-lg max-w-2xl mx-auto" style={{ color: '#003756', opacity: 0.7 }}>
                  Happiness-First. Proof-Driven. Sales-Accelerating.
                </p>
              </div>

              {/* Philosophy */}
              <div className="max-w-4xl mx-auto mb-8">
                <div className="rounded-3xl p-6" style={{ backgroundColor: '#E0F2F7', border: '1px solid rgba(0,55,86,0.1)' }}>
                  <p className="text-center text-lg mb-4" style={{ color: '#003756' }}>
                    We're selling <strong>feel-good moments that make work better</strong> — for employees <em>and</em> the people responsible for them.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                    {[
                      'Never purchased this category',
                      "Don't know what good looks like",
                      'Worry about effort & risk',
                      'Unsure if employees will care'
                    ].map((item, idx) => (
                      <div key={idx} className="p-2 rounded-xl" style={{ backgroundColor: 'white' }}>
                        <p className="text-xs" style={{ color: '#003756' }}>{item}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-center text-sm mt-4" style={{ color: '#003756', opacity: 0.8 }}>
                    This creates a <strong>confidence gap</strong>. Our content strategy exists to close it.
                  </p>
                </div>
              </div>

              {/* Three Pillars */}
              <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-8">
                <div className="rounded-3xl overflow-hidden" style={{ border: '2px solid #9EFAFF' }}>
                  <div className="p-4" style={{ backgroundColor: '#003756' }}>
                    <h3 className="font-semibold text-white text-sm">Pillar 1</h3>
                    <p className="text-white text-lg font-semibold">Make the Happiness Visible</p>
                  </div>
                  <div className="p-4" style={{ backgroundColor: 'white' }}>
                    <p className="text-xs mb-3" style={{ color: '#003756', opacity: 0.7 }}>Buyers need to <em>see</em> the experience to believe it.</p>
                    <div className="space-y-1 text-xs" style={{ color: '#003756' }}>
                      <p>• Real events, real offices</p>
                      <p>• Real employees, real reactions</p>
                      <p>• Credible, human proof</p>
                    </div>
                    <div className="mt-3 p-2 rounded-lg" style={{ backgroundColor: '#E0F2F7' }}>
                      <p className="text-xs" style={{ color: '#018EA2' }}><strong>Outcome:</strong> Removes imagination risk</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl overflow-hidden" style={{ border: '2px solid #018EA2' }}>
                  <div className="p-4" style={{ backgroundColor: '#018EA2' }}>
                    <h3 className="font-semibold text-white text-sm">Pillar 2</h3>
                    <p className="text-white text-lg font-semibold">Make the Ease Undeniable</p>
                  </div>
                  <div className="p-4" style={{ backgroundColor: 'white' }}>
                    <p className="text-xs mb-3" style={{ color: '#003756', opacity: 0.7 }}>HR doesn't fear cost — they fear complexity.</p>
                    <div className="space-y-1 text-xs" style={{ color: '#003756' }}>
                      <p>• How little HR actually does</p>
                      <p>• How signups & execution work</p>
                      <p>• How scale happens smoothly</p>
                    </div>
                    <div className="mt-3 p-2 rounded-lg" style={{ backgroundColor: '#F8F9FA' }}>
                      <p className="text-xs" style={{ color: '#018EA2' }}><strong>Outcome:</strong> "This feels handled"</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl overflow-hidden" style={{ border: '2px solid #FF5050' }}>
                  <div className="p-4" style={{ backgroundColor: '#FF5050' }}>
                    <h3 className="font-semibold text-white text-sm">Pillar 3</h3>
                    <p className="text-white text-lg font-semibold">Make the Difference Obvious</p>
                  </div>
                  <div className="p-4" style={{ backgroundColor: 'white' }}>
                    <p className="text-xs mb-3" style={{ color: '#003756', opacity: 0.7 }}>Differentiation must be <em>explicit</em>, not implied.</p>
                    <div className="space-y-1 text-xs" style={{ color: '#003756' }}>
                      <p>• All-in-one, operationally excellent</p>
                      <p>• Consistent, scalable</p>
                      <p>• Hospitality-driven, tech-enabled</p>
                    </div>
                    <div className="mt-3 p-2 rounded-lg" style={{ backgroundColor: '#F8F9FA' }}>
                      <p className="text-xs" style={{ color: '#FF5050' }}><strong>Outcome:</strong> Stop comparing, start choosing</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Voice */}
              <div className="max-w-4xl mx-auto">
                <div className="rounded-2xl p-4" style={{ backgroundColor: '#003756' }}>
                  <h4 className="font-semibold text-white text-sm mb-3">Our Voice (Non-Negotiable)</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-white mb-2" style={{ opacity: 0.6 }}>We sound like:</p>
                      <div className="space-y-1">
                        {['Light, human, optimistic', 'Happiness-forward', 'Confident without salesy', 'Simple, not corporate'].map((item, idx) => (
                          <p key={idx} className="text-xs text-white flex items-center gap-2">
                            <span style={{ color: '#9EFAFF' }}>✓</span> {item}
                          </p>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-white mb-2" style={{ opacity: 0.6 }}>We don't sound like:</p>
                      <div className="space-y-1">
                        {['A benefits provider', 'A wellness consultant', 'A mental health platform', 'Corporate or heavy'].map((item, idx) => (
                          <p key={idx} className="text-xs text-white flex items-center gap-2">
                            <span style={{ color: '#FF5050' }}>✗</span> {item}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-center mt-4 italic" style={{ color: '#9EFAFF' }}>
                    "The easiest, happiest decision an HR or Workplace leader can make."
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 10: CONTENT ASSETS ==================== */}
        {currentSlide === 9 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: '#E0F2F7' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-8">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#003756', opacity: 0.6 }}>
                  Content Strategy
                </p>
                <h2 className="text-4xl md:text-5xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  The 10 Assets That Matter Most
                </h2>
                <p className="text-base max-w-2xl mx-auto" style={{ color: '#003756', opacity: 0.7 }}>
                  Anything not on this list is secondary. Goal: shorter sales cycles, faster "yes" decisions.
                </p>
              </div>

              {/* Assets Grid */}
              <div className="grid md:grid-cols-2 gap-3 max-w-5xl mx-auto mb-6">
                {[
                  { num: '1', name: 'Real Event Recap Videos', desc: '30-60 sec, iPhone fine. Visual proof of happiness.', stage: 'Awareness → Decision', h1: true },
                  { num: '2', name: '"What Happens When Shortcut Shows Up"', desc: 'Photos + clips, event timeline. Remove uncertainty.', stage: 'Awareness → Consideration', h1: true },
                  { num: '3', name: 'Employee Reaction Clips', desc: '"This made my day." Emotional validation.', stage: 'Awareness', h1: false },
                  { num: '4', name: 'HR/Manager Testimonials (Ease-Focused)', desc: '"We didn\'t lift a finger." Risk reduction.', stage: 'Consideration → Decision', h1: true },
                  { num: '5', name: 'All-in-One vs Vendor Sprawl One-Pager', desc: 'One partner, one platform, one invoice.', stage: 'Decision', h1: true },
                  { num: '6', name: '"How Scaling Works" Explainer', desc: 'One → multiple offices. Enterprise confidence.', stage: 'Consideration → Decision', h1: false },
                  { num: '7', name: 'Multi-Location Case Study', desc: 'BCG/DraftKings. Rollout, consistency, scale.', stage: 'Decision', h1: false },
                  { num: '8', name: 'Signup & Admin Flow Visuals', desc: 'Screenshots, recordings. Ease + tech credibility.', stage: 'Consideration', h1: true },
                  { num: '9', name: '"Why Companies Renew" Page', desc: 'Retention stats, quotes. Long-term trust.', stage: 'Decision', h1: false },
                  { num: '10', name: 'Event Experience Photo Library', desc: 'Clean, categorized. Sales acceleration.', stage: 'All stages', h1: false },
                ].map((item, idx) => (
                  <div key={idx} className="rounded-xl p-3 flex gap-3" style={{ backgroundColor: 'white', border: item.h1 ? '2px solid #9EFAFF' : '1px solid rgba(0,55,86,0.1)' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold" style={{ backgroundColor: item.h1 ? '#003756' : '#F8F9FA', color: item.h1 ? 'white' : '#003756' }}>
                      {item.num}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm" style={{ color: '#003756' }}>{item.name}</p>
                      <p className="text-xs" style={{ color: '#003756', opacity: 0.7 }}>{item.desc}</p>
                      <p className="text-xs mt-1" style={{ color: '#018EA2' }}>{item.stage}</p>
                    </div>
                    {item.h1 && (
                      <span className="text-xs font-semibold px-2 py-1 rounded-full h-fit" style={{ backgroundColor: '#E0F2F7', color: '#003756' }}>H1</span>
                    )}
                  </div>
                ))}
              </div>

              {/* H1 vs H2 and Success Metrics */}
              <div className="grid md:grid-cols-2 gap-4 max-w-5xl mx-auto">
                <div className="rounded-2xl p-4" style={{ backgroundColor: '#003756' }}>
                  <h4 className="font-semibold text-white text-sm mb-3">H1 2026 — Must Ship</h4>
                  <div className="space-y-1">
                    {['Event recap videos', 'Visual experience page', 'HR testimonials', 'Vendor sprawl comparison', 'Signup flow visuals'].map((item, idx) => (
                      <p key={idx} className="text-xs text-white flex items-center gap-2">
                        <span style={{ color: '#9EFAFF' }}>→</span> {item}
                      </p>
                    ))}
                  </div>
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                    <p className="text-xs text-white" style={{ opacity: 0.6 }}>H2: Multi-location case study, scaling explainer, renewal proof, enterprise testimonials</p>
                  </div>
                </div>

                <div className="rounded-2xl p-4" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                  <h4 className="font-semibold text-sm mb-3" style={{ color: '#003756' }}>How We Measure Success</h4>
                  <div className="space-y-2">
                    {[
                      'Sales calls get shorter',
                      'Fewer questions are asked',
                      'Buyers say "this feels easy"',
                      'Buyers reference content unprompted',
                      'Time-to-yes decreases'
                    ].map((item, idx) => (
                      <p key={idx} className="text-xs flex items-center gap-2" style={{ color: '#003756' }}>
                        <span style={{ color: '#018EA2' }}>✓</span> {item}
                      </p>
                    ))}
                  </div>
                  <p className="text-xs mt-3 pt-3" style={{ color: '#FF5050', borderTop: '1px solid rgba(0,55,86,0.1)' }}>
                    If content doesn't do that, it doesn't matter.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 11: CONFERENCE STRATEGY ==================== */}
        {currentSlide === 10 && (
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
                  7 conferences across the year - H1 for pipeline creation, H2 for budget capture
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
                {/* H1 Conferences */}
                <div className="rounded-3xl overflow-hidden" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                  <div className="p-4" style={{ backgroundColor: '#003756' }}>
                    <h3 className="font-semibold text-white">H1: Pipeline Creation (Jan–Jun)</h3>
                    <p className="text-xs text-white" style={{ opacity: 0.7 }}>~$33K budget | 3 conferences</p>
                  </div>
                  <div className="p-3 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(0,55,86,0.1)' }}>
                          <th className="text-left py-2 font-semibold" style={{ color: '#003756' }}>#</th>
                          <th className="text-left py-2 font-semibold" style={{ color: '#003756' }}>Conference</th>
                          <th className="text-center py-2 font-semibold" style={{ color: '#003756' }}>Date</th>
                          <th className="text-center py-2 font-semibold" style={{ color: '#003756' }}>Cost</th>
                          <th className="text-center py-2 font-semibold" style={{ color: '#003756' }}>Leads</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { rank: '1', name: 'Wellbeing at Work', loc: 'NYC', date: 'Mar 3-5', cost: '$5K', leads: '15-25' },
                          { rank: '2', name: 'Total Rewards', loc: 'San Antonio', date: 'Apr 19-22', cost: '$20K', leads: '20-30' },
                          { rank: '3', name: 'Workhuman Live', loc: 'Austin', date: 'Apr 28-May 1', cost: '$8K', leads: '15-25' },
                        ].map((conf, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(0,55,86,0.1)', backgroundColor: '#E0F2F7' }}>
                            <td className="py-2 font-bold" style={{ color: '#018EA2' }}>{conf.rank}</td>
                            <td className="py-2" style={{ color: '#003756' }}>
                              <div className="font-medium">{conf.name}</div>
                              <div style={{ opacity: 0.6 }}>{conf.loc}</div>
                            </td>
                            <td className="py-2 text-center" style={{ color: '#003756' }}>{conf.date}</td>
                            <td className="py-2 text-center" style={{ color: '#018EA2' }}>{conf.cost}</td>
                            <td className="py-2 text-center" style={{ color: '#003756' }}>{conf.leads}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-3 text-xs" style={{ backgroundColor: '#F8F9FA', color: '#003756' }}>
                    <strong>H1 Goal:</strong> 50+ qualified leads, 20+ demos, build brand awareness
                  </div>
                </div>

                {/* H2 Conferences */}
                <div className="rounded-3xl overflow-hidden" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                  <div className="p-4" style={{ backgroundColor: '#018EA2' }}>
                    <h3 className="font-semibold text-white">H2: Budget Capture (Jul–Dec)</h3>
                    <p className="text-xs text-white" style={{ opacity: 0.7 }}>~$36K budget | 4 conferences</p>
                  </div>
                  <div className="p-3 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(0,55,86,0.1)' }}>
                          <th className="text-left py-2 font-semibold" style={{ color: '#003756' }}>#</th>
                          <th className="text-left py-2 font-semibold" style={{ color: '#003756' }}>Conference</th>
                          <th className="text-center py-2 font-semibold" style={{ color: '#003756' }}>Date</th>
                          <th className="text-center py-2 font-semibold" style={{ color: '#003756' }}>Cost</th>
                          <th className="text-center py-2 font-semibold" style={{ color: '#003756' }}>Leads</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { rank: '1', name: 'Benefits Forum & Expo', loc: 'Las Vegas', date: 'Sep 14-17', cost: '$7K', leads: '15-25' },
                          { rank: '2', name: 'Conference Board Fall', loc: 'NYC', date: 'Oct 27-28', cost: '$6K', leads: '10-20' },
                          { rank: '3', name: 'WORKTECH26', loc: 'NYC', date: 'Nov TBD', cost: '$18K', leads: '20-30' },
                          { rank: '4', name: 'LinkedIn Talent Connect', loc: 'TBD', date: 'Fall TBD', cost: '$5K', leads: '10-15' },
                        ].map((conf, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(0,55,86,0.1)', backgroundColor: '#E0F2F7' }}>
                            <td className="py-2 font-bold" style={{ color: '#018EA2' }}>{conf.rank}</td>
                            <td className="py-2" style={{ color: '#003756' }}>
                              <div className="font-medium">{conf.name}</div>
                              <div style={{ opacity: 0.6 }}>{conf.loc}</div>
                            </td>
                            <td className="py-2 text-center" style={{ color: '#003756' }}>{conf.date}</td>
                            <td className="py-2 text-center" style={{ color: '#018EA2' }}>{conf.cost}</td>
                            <td className="py-2 text-center" style={{ color: '#003756' }}>{conf.leads}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-3 text-xs" style={{ backgroundColor: '#F8F9FA', color: '#003756' }}>
                    <strong>H2 Goal:</strong> Convert 30%+ of H1 pipeline, close $150K+ new ARR
                  </div>
                </div>
              </div>

              {/* Budget Summary */}
              <div className="max-w-6xl mx-auto mt-6 p-4 rounded-2xl" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold" style={{ color: '#003756' }}>~$60K</p>
                    <p className="text-xs" style={{ color: '#003756', opacity: 0.6 }}>Total Conference Budget</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold" style={{ color: '#018EA2' }}>105-170</p>
                    <p className="text-xs" style={{ color: '#003756', opacity: 0.6 }}>Expected Qualified Leads</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold" style={{ color: '#FF5050' }}>$450K+</p>
                    <p className="text-xs" style={{ color: '#003756', opacity: 0.6 }}>Pipeline Target</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 12: LEAD ESTIMATION METHODOLOGY ==================== */}
        {currentSlide === 11 && (
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

        {/* ==================== SLIDE 13: CONFERENCE RECOMMENDATIONS ==================== */}
        {currentSlide === 12 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: 'white' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#FF5050' }}>
                  H1 2026 Priority
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  H1 Conferences — Pipeline Creation
                </h2>
                <p className="text-lg max-w-2xl mx-auto" style={{ color: '#003756', opacity: 0.7 }}>
                  Meet buyers early in their fiscal year. Build relationships. Generate 50+ qualified leads.
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
                        <span className="font-medium" style={{ color: '#003756' }}>NYC</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Size</span>
                        <span className="font-medium" style={{ color: '#003756' }}>500+</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Est. Cost</span>
                        <span className="font-medium" style={{ color: '#018EA2' }}>$5K</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Expected Leads</span>
                        <span className="font-medium" style={{ color: '#003756' }}>15-25</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#E0F2F7' }}>
                      <p className="text-xs" style={{ color: '#003756' }}>
                        <strong>Why #1:</strong> NYC home turf. No travel cost. Intimate (500ish). Literally called "Wellbeing at Work." Lowest friction, highest alignment.
                      </p>
                    </div>
                  </div>
                </div>

                {/* #2 Total Rewards */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '2px solid #018EA2' }}>
                  <div className="p-4 flex items-center justify-between" style={{ backgroundColor: '#018EA2' }}>
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: 'white', color: '#018EA2' }}>
                        #2
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
                        <span className="font-medium" style={{ color: '#018EA2' }}>$20K</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Expected Leads</span>
                        <span className="font-medium" style={{ color: '#003756' }}>20-30</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#F8F9FA' }}>
                      <p className="text-xs" style={{ color: '#003756' }}>
                        <strong>Why #2:</strong> Compensation & Benefits pros — the budget holders. Higher investment ($20K) but these are the decision-makers who sign checks.
                      </p>
                    </div>
                  </div>
                </div>

                {/* #3 Workhuman */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(0,55,86,0.2)' }}>
                  <div className="p-4 flex items-center justify-between" style={{ backgroundColor: '#FF5050' }}>
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: 'white', color: '#FF5050' }}>
                        #3
                      </span>
                      <h3 className="font-semibold text-white">Workhuman Live</h3>
                    </div>
                  </div>
                  <div className="p-5" style={{ backgroundColor: 'white' }}>
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Date</span>
                        <span className="font-medium" style={{ color: '#003756' }}>April 28-May 1</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Location</span>
                        <span className="font-medium" style={{ color: '#003756' }}>Austin</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Size</span>
                        <span className="font-medium" style={{ color: '#003756' }}>3,000+</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Est. Cost</span>
                        <span className="font-medium" style={{ color: '#018EA2' }}>$8K</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Expected Leads</span>
                        <span className="font-medium" style={{ color: '#003756' }}>15-25</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#F8F9FA' }}>
                      <p className="text-xs" style={{ color: '#003756' }}>
                        <strong>Why #3:</strong> Best audience-to-noise ratio. Employee Experience, Culture, Engagement leaders — exactly who buys Shortcut.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Budget Summary */}
              <div className="max-w-5xl mx-auto p-4 rounded-2xl" style={{ backgroundColor: '#E0F2F7', border: '1px solid rgba(0,55,86,0.1)' }}>
                <p className="text-sm text-center" style={{ color: '#003756' }}>
                  <strong>H1 Budget:</strong> ~$33K for 3 conferences | <strong>Expected:</strong> 50-80 qualified leads | <strong>Full Year:</strong> ~$60K for 7 conferences
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 14: H2 CONFERENCES ==================== */}
        {currentSlide === 13 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: '#E0F2F7' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#018EA2' }}>
                  H2 2026 Priority
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  H2 Conferences — Budget Capture
                </h2>
                <p className="text-lg max-w-2xl mx-auto" style={{ color: '#003756', opacity: 0.7 }}>
                  Re-engage H1 leads when budgets finalize. Convert 30%+ of pipeline. Close $150K+ new ARR.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-8">
                {/* #1 Benefits Forum & Expo */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '3px solid #9EFAFF' }}>
                  <div className="p-4 flex items-center justify-between" style={{ backgroundColor: '#003756' }}>
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: '#9EFAFF', color: '#003756' }}>
                        #1
                      </span>
                      <h3 className="font-semibold text-white">Benefits Forum & Expo</h3>
                    </div>
                  </div>
                  <div className="p-5" style={{ backgroundColor: 'white' }}>
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Date</span>
                        <span className="font-medium" style={{ color: '#003756' }}>September 14-17</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Location</span>
                        <span className="font-medium" style={{ color: '#003756' }}>Las Vegas</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Est. Cost</span>
                        <span className="font-medium" style={{ color: '#018EA2' }}>$7K</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Expected Leads</span>
                        <span className="font-medium" style={{ color: '#003756' }}>15-25</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#E0F2F7' }}>
                      <p className="text-xs" style={{ color: '#003756' }}>
                        <strong>Why #1:</strong> Benefits buyers making final decisions. Perfect timing for Q4 budget discussions. 3,000+ highly targeted attendees.
                      </p>
                    </div>
                  </div>
                </div>

                {/* #2 Conference Board Fall */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '2px solid #018EA2' }}>
                  <div className="p-4 flex items-center justify-between" style={{ backgroundColor: '#018EA2' }}>
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: 'white', color: '#018EA2' }}>
                        #2
                      </span>
                      <h3 className="font-semibold text-white">Conference Board Fall HR</h3>
                    </div>
                  </div>
                  <div className="p-5" style={{ backgroundColor: 'white' }}>
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Date</span>
                        <span className="font-medium" style={{ color: '#003756' }}>October 27-28</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Location</span>
                        <span className="font-medium" style={{ color: '#003756' }}>NYC</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Est. Cost</span>
                        <span className="font-medium" style={{ color: '#018EA2' }}>$6K</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Expected Leads</span>
                        <span className="font-medium" style={{ color: '#003756' }}>10-20</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#F8F9FA' }}>
                      <p className="text-xs" style={{ color: '#003756' }}>
                        <strong>Why #2:</strong> Blue-chip credibility. Enterprise HR & benefits leaders. NYC home turf. Last chance for Q4 closes.
                      </p>
                    </div>
                  </div>
                </div>

                {/* #3 WORKTECH26 */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(0,55,86,0.2)' }}>
                  <div className="p-4 flex items-center justify-between" style={{ backgroundColor: '#FF5050' }}>
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: 'white', color: '#FF5050' }}>
                        #3
                      </span>
                      <h3 className="font-semibold text-white">WORKTECH26</h3>
                    </div>
                  </div>
                  <div className="p-5" style={{ backgroundColor: 'white' }}>
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Date</span>
                        <span className="font-medium" style={{ color: '#003756' }}>November TBD</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Location</span>
                        <span className="font-medium" style={{ color: '#003756' }}>NYC</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Est. Cost</span>
                        <span className="font-medium" style={{ color: '#018EA2' }}>$18K</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Expected Leads</span>
                        <span className="font-medium" style={{ color: '#003756' }}>20-30</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#F8F9FA' }}>
                      <p className="text-xs" style={{ color: '#003756' }}>
                        <strong>Why #3:</strong> Workplace Experience + HR intersection. Future of work, hybrid workplace sweet spot. Higher cost but premium audience.
                      </p>
                    </div>
                  </div>
                </div>

                {/* #4 LinkedIn Talent Connect */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(0,55,86,0.2)' }}>
                  <div className="p-4 flex items-center justify-between" style={{ backgroundColor: '#003756', opacity: 0.8 }}>
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: 'white', color: '#003756' }}>
                        #4
                      </span>
                      <h3 className="font-semibold text-white">LinkedIn Talent Connect</h3>
                    </div>
                  </div>
                  <div className="p-5" style={{ backgroundColor: 'white' }}>
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Date</span>
                        <span className="font-medium" style={{ color: '#003756' }}>Fall TBD</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Location</span>
                        <span className="font-medium" style={{ color: '#003756' }}>TBD</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Est. Cost</span>
                        <span className="font-medium" style={{ color: '#018EA2' }}>$5K</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#003756', opacity: 0.6 }}>Expected Leads</span>
                        <span className="font-medium" style={{ color: '#003756' }}>10-15</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#F8F9FA' }}>
                      <p className="text-xs" style={{ color: '#003756' }}>
                        <strong>Why #4:</strong> Different buyer persona — TA leaders who influence benefits decisions. Lower cost, good for diversifying lead sources.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Budget Summary */}
              <div className="max-w-5xl mx-auto p-4 rounded-2xl" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                <p className="text-sm text-center" style={{ color: '#003756' }}>
                  <strong>H2 Budget:</strong> ~$36K for 4 conferences | <strong>Expected:</strong> 55-90 qualified leads | <strong>H2 Goal:</strong> Close $150K+ new ARR from conference leads
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 15: H1 CONFERENCE DETAILS ==================== */}
        {currentSlide === 14 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: 'white' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-8">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#003756', opacity: 0.6 }}>
                  H1 Deep Dive
                </p>
                <h2 className="text-4xl md:text-5xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  H1 Conference Details
                </h2>
              </div>

              <div className="space-y-6 max-w-5xl mx-auto">
                {/* Wellbeing at Work */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '2px solid #9EFAFF' }}>
                  <div className="p-4 flex items-center justify-between" style={{ backgroundColor: '#003756' }}>
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: '#9EFAFF', color: '#003756' }}>#1</span>
                      <h3 className="font-semibold text-white text-lg">Wellbeing at Work Summit</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white">March 3-5, NYC</p>
                      <p className="text-xs" style={{ color: '#9EFAFF' }}>$5K total (no travel)</p>
                    </div>
                  </div>
                  <div className="p-4 grid md:grid-cols-2 gap-4" style={{ backgroundColor: 'white' }}>
                    <div>
                      <h4 className="font-semibold text-sm mb-2" style={{ color: '#003756' }}>Conference Profile</h4>
                      <div className="space-y-1 text-xs" style={{ color: '#003756' }}>
                        <p><strong>Size:</strong> 500+ attendees (intimate)</p>
                        <p><strong>Audience:</strong> Senior HR, Wellness, Reward leaders — self-selected for this topic</p>
                        <p><strong>Theme:</strong> Literally called "Wellbeing at Work" — perfect alignment</p>
                        <p><strong>Expected Leads:</strong> 15-25 qualified</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-2" style={{ color: '#003756' }}>Strategy & Costs</h4>
                      <div className="space-y-1 text-xs" style={{ color: '#003756' }}>
                        <p><strong>Booth:</strong> Yes — sponsor booth package</p>
                        <p><strong>Registration:</strong> ~$3K</p>
                        <p><strong>Travel:</strong> $0 (NYC home turf)</p>
                        <p><strong>Activation:</strong> Live demos, QR lead capture</p>
                      </div>
                    </div>
                    <div className="md:col-span-2 p-3 rounded-xl" style={{ backgroundColor: '#E0F2F7' }}>
                      <p className="text-xs" style={{ color: '#003756' }}>
                        <strong>Why #1:</strong> Lowest friction, highest alignment, home field advantage. If we can only do one conference, this is it. NYC means easy to activate your network and meet everyone who matters.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Total Rewards */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '2px solid #018EA2' }}>
                  <div className="p-4 flex items-center justify-between" style={{ backgroundColor: '#018EA2' }}>
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: 'white', color: '#018EA2' }}>#2</span>
                      <h3 className="font-semibold text-white text-lg">Total Rewards (WorldatWork)</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white">April 19-22, San Antonio</p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>$20K total (incl. travel)</p>
                    </div>
                  </div>
                  <div className="p-4 grid md:grid-cols-2 gap-4" style={{ backgroundColor: 'white' }}>
                    <div>
                      <h4 className="font-semibold text-sm mb-2" style={{ color: '#003756' }}>Conference Profile</h4>
                      <div className="space-y-1 text-xs" style={{ color: '#003756' }}>
                        <p><strong>Size:</strong> 2,000+ attendees</p>
                        <p><strong>Audience:</strong> Compensation & Benefits professionals — the people who control wellness budgets</p>
                        <p><strong>Theme:</strong> Total rewards = salary + benefits + perks + wellness</p>
                        <p><strong>Expected Leads:</strong> 20-30 qualified</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-2" style={{ color: '#003756' }}>Strategy & Costs</h4>
                      <div className="space-y-1 text-xs" style={{ color: '#003756' }}>
                        <p><strong>Booth:</strong> Yes — exhibitor package</p>
                        <p><strong>Registration/Booth:</strong> ~$12K</p>
                        <p><strong>Travel (2 ppl):</strong> ~$4K (flights + hotel)</p>
                        <p><strong>Meals/Misc:</strong> ~$4K</p>
                      </div>
                    </div>
                    <div className="md:col-span-2 p-3 rounded-xl" style={{ backgroundColor: '#F8F9FA' }}>
                      <p className="text-xs" style={{ color: '#003756' }}>
                        <strong>Why #2:</strong> Higher investment ($20K) but higher ROI potential — these are decision-makers who sign checks. Workhuman gets you the "culture champion." Total Rewards gets you the "budget holder." You need both.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Workhuman */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '2px solid #FF5050' }}>
                  <div className="p-4 flex items-center justify-between" style={{ backgroundColor: '#FF5050' }}>
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: 'white', color: '#FF5050' }}>#3</span>
                      <h3 className="font-semibold text-white text-lg">Workhuman Live</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white">April 28-May 1, Austin</p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>$8K total (incl. travel)</p>
                    </div>
                  </div>
                  <div className="p-4 grid md:grid-cols-2 gap-4" style={{ backgroundColor: 'white' }}>
                    <div>
                      <h4 className="font-semibold text-sm mb-2" style={{ color: '#003756' }}>Conference Profile</h4>
                      <div className="space-y-1 text-xs" style={{ color: '#003756' }}>
                        <p><strong>Size:</strong> 3,000+ attendees</p>
                        <p><strong>Audience:</strong> Employee Experience, Culture, Engagement leaders — exactly who buys Shortcut</p>
                        <p><strong>Theme:</strong> Human-centered workplace strategies. Wellbeing is a core track.</p>
                        <p><strong>Expected Leads:</strong> 15-25 qualified</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-2" style={{ color: '#003756' }}>Strategy & Costs</h4>
                      <div className="space-y-1 text-xs" style={{ color: '#003756' }}>
                        <p><strong>Booth:</strong> Optional — networking focus</p>
                        <p><strong>Registration:</strong> ~$3K</p>
                        <p><strong>Travel (2 ppl):</strong> ~$3K (flights + hotel)</p>
                        <p><strong>Meals/Misc:</strong> ~$2K</p>
                      </div>
                    </div>
                    <div className="md:col-span-2 p-3 rounded-xl" style={{ backgroundColor: '#F8F9FA' }}>
                      <p className="text-xs" style={{ color: '#003756' }}>
                        <strong>Why #3:</strong> Best audience-to-noise ratio of any national conference. Mid-size (3K) means you can actually connect — not lost in a 25K crowd. High-energy, values-driven vibe matches Shortcut's brand.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 16: H2 CONFERENCE DETAILS ==================== */}
        {currentSlide === 15 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: '#E0F2F7' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-8">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#018EA2' }}>
                  H2 Deep Dive
                </p>
                <h2 className="text-4xl md:text-5xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  H2 Conference Details
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-4 max-w-5xl mx-auto">
                {/* Benefits Forum */}
                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                  <div className="p-3 flex items-center justify-between" style={{ backgroundColor: '#003756' }}>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: '#9EFAFF', color: '#003756' }}>#1</span>
                      <h3 className="font-semibold text-white text-sm">Benefits Forum & Expo</h3>
                    </div>
                    <span className="text-xs" style={{ color: '#9EFAFF' }}>$7K</span>
                  </div>
                  <div className="p-3 text-xs" style={{ color: '#003756' }}>
                    <p><strong>Sept 14-17, Las Vegas</strong> | 3,000+ attendees</p>
                    <p className="mt-1"><strong>Audience:</strong> Benefits professionals, HR leaders, brokers</p>
                    <p className="mt-1"><strong>Booth:</strong> Yes — exhibitor package (~$4K)</p>
                    <p><strong>Travel:</strong> ~$3K (flights + hotel for 2)</p>
                    <p className="mt-2 p-2 rounded" style={{ backgroundColor: '#E0F2F7' }}>
                      <strong>Why #1:</strong> Benefits buyers making final Q4 decisions. This is where you close.
                    </p>
                  </div>
                </div>

                {/* Conference Board */}
                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                  <div className="p-3 flex items-center justify-between" style={{ backgroundColor: '#018EA2' }}>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'white', color: '#018EA2' }}>#2</span>
                      <h3 className="font-semibold text-white text-sm">Conference Board Fall HR</h3>
                    </div>
                    <span className="text-xs text-white">$6K</span>
                  </div>
                  <div className="p-3 text-xs" style={{ color: '#003756' }}>
                    <p><strong>Oct 27-28, NYC</strong> | Enterprise-focused</p>
                    <p className="mt-1"><strong>Audience:</strong> Enterprise HR & benefits leaders focused on workforce strategy</p>
                    <p className="mt-1"><strong>Booth:</strong> No — networking/sponsorship focus</p>
                    <p><strong>Travel:</strong> $0 (NYC home turf)</p>
                    <p className="mt-2 p-2 rounded" style={{ backgroundColor: '#F8F9FA' }}>
                      <strong>Why #2:</strong> Blue-chip credibility. Senior attendees. Last chance for Q4 closes.
                    </p>
                  </div>
                </div>

                {/* WORKTECH26 */}
                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                  <div className="p-3 flex items-center justify-between" style={{ backgroundColor: '#FF5050' }}>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'white', color: '#FF5050' }}>#3</span>
                      <h3 className="font-semibold text-white text-sm">WORKTECH26</h3>
                    </div>
                    <span className="text-xs text-white">$18K</span>
                  </div>
                  <div className="p-3 text-xs" style={{ color: '#003756' }}>
                    <p><strong>November TBD, NYC</strong> | Premium event</p>
                    <p className="mt-1"><strong>Audience:</strong> Workplace Experience, Real Estate, HR leaders — intersection of space + people</p>
                    <p className="mt-1"><strong>Booth:</strong> Yes — premium sponsorship (~$15K)</p>
                    <p><strong>Travel:</strong> ~$3K (activations + setup)</p>
                    <p className="mt-2 p-2 rounded" style={{ backgroundColor: '#F8F9FA' }}>
                      <strong>Why #3:</strong> Future of work, hybrid workplace sweet spot. Higher cost but premium audience. Worth it if H1 results are strong.
                    </p>
                  </div>
                </div>

                {/* LinkedIn Talent Connect */}
                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                  <div className="p-3 flex items-center justify-between" style={{ backgroundColor: '#003756', opacity: 0.85 }}>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'white', color: '#003756' }}>#4</span>
                      <h3 className="font-semibold text-white text-sm">LinkedIn Talent Connect</h3>
                    </div>
                    <span className="text-xs text-white">$5K</span>
                  </div>
                  <div className="p-3 text-xs" style={{ color: '#003756' }}>
                    <p><strong>Fall TBD, TBD</strong> | Talent-focused</p>
                    <p className="mt-1"><strong>Audience:</strong> Talent Acquisition, Employer Branding, HR leaders</p>
                    <p className="mt-1"><strong>Booth:</strong> No — networking focus</p>
                    <p><strong>Travel:</strong> ~$2K (if outside NYC)</p>
                    <p className="mt-2 p-2 rounded" style={{ backgroundColor: '#F8F9FA' }}>
                      <strong>Why #4:</strong> Different buyer persona — TA leaders who influence benefits. Lower cost, good for diversifying lead sources.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 17: CONFERENCE EXECUTION PLAYBOOK ==================== */}
        {currentSlide === 16 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: 'white' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#003756', opacity: 0.6 }}>
                  Conference Strategy
                </p>
                <h2 className="text-4xl md:text-5xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Conference Execution Playbook
                </h2>
                <p className="text-lg max-w-2xl mx-auto" style={{ color: '#003756', opacity: 0.7 }}>
                  Standardized process for every conference to maximize ROI
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {/* Pre-Conference */}
                <div className="rounded-3xl overflow-hidden" style={{ backgroundColor: '#003756' }}>
                  <div className="p-4">
                    <h3 className="font-semibold text-white mb-1">Pre-Conference</h3>
                    <p className="text-xs" style={{ color: '#9EFAFF' }}>4-6 weeks before</p>
                  </div>
                  <div className="p-4" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                    <div className="space-y-2">
                      {[
                        'Register and book sponsorship/booth',
                        'Identify target accounts attending',
                        'Send pre-conference outreach to target list',
                        'Prepare collateral (one-pagers, demo videos, swag)',
                        'Schedule on-site meetings with key prospects'
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded border border-white/30 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-white">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* During Conference */}
                <div className="rounded-3xl overflow-hidden" style={{ backgroundColor: '#018EA2' }}>
                  <div className="p-4">
                    <h3 className="font-semibold text-white mb-1">During Conference</h3>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>On-site execution</p>
                  </div>
                  <div className="p-4" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                    <div className="space-y-2">
                      {[
                        'Staff booth with 2+ people at all times',
                        'Capture leads with consistent qualification criteria',
                        'Host or attend networking events',
                        'Post daily on LinkedIn with conference content',
                        'Book follow-up demos on-site'
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded border border-white/30 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-white">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Post-Conference */}
                <div className="rounded-3xl overflow-hidden" style={{ backgroundColor: '#FF5050' }}>
                  <div className="p-4">
                    <h3 className="font-semibold text-white mb-1">Post-Conference</h3>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>1-2 weeks after</p>
                  </div>
                  <div className="p-4" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                    <div className="space-y-2">
                      {[
                        'Send personalized follow-up emails within 48 hours',
                        'Add all leads to CRM with conference source',
                        'Schedule demos for qualified leads',
                        'Calculate cost per lead and ROI',
                        'Document learnings for next event'
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded border border-white/30 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-white">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Booth Activation Strategy */}
              <div className="max-w-5xl mx-auto mt-8">
                <div className="rounded-2xl p-5" style={{ backgroundColor: '#E0F2F7', border: '1px solid rgba(0,55,86,0.1)' }}>
                  <h4 className="font-semibold mb-3" style={{ color: '#003756' }}>Booth Activation Strategy</h4>
                  <div className="grid md:grid-cols-4 gap-4">
                    {[
                      { icon: '💆', title: 'Live Chair Massage Demos', desc: 'Draw traffic and demonstrate service quality' },
                      { icon: '📸', title: 'Express Headshot Station', desc: 'High-value giveaway that creates engagement' },
                      { icon: '📱', title: 'QR Code Lead Capture', desc: 'Instant form fill, syncs to CRM' },
                      { icon: '🎁', title: 'Branded Swag', desc: 'Stress balls, wellness items with logo' }
                    ].map((item, idx) => (
                      <div key={idx} className="text-center">
                        <div className="text-2xl mb-2">{item.icon}</div>
                        <p className="font-medium text-sm" style={{ color: '#003756' }}>{item.title}</p>
                        <p className="text-xs" style={{ color: '#003756', opacity: 0.6 }}>{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 18: CONFERENCE SUCCESS METRICS ==================== */}
        {currentSlide === 17 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: '#003756' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#9EFAFF' }}>
                  Conference Strategy
                </p>
                <h2 className="text-4xl md:text-5xl font-semibold mb-4 text-white" style={{ letterSpacing: '-0.02em' }}>
                  Success Metrics & Scale Logic
                </h2>
                <p className="text-lg max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  How we measure success and decide when to scale up or down
                </p>
              </div>

              {/* Success Metrics Table */}
              <div className="rounded-3xl overflow-hidden mb-8 max-w-4xl mx-auto" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                      <th className="text-left p-4 text-sm font-semibold text-white">Metric</th>
                      <th className="text-center p-4 text-sm font-semibold text-white">H1 Target</th>
                      <th className="text-center p-4 text-sm font-semibold text-white">H2 Target</th>
                      <th className="text-center p-4 text-sm font-semibold text-white">Full Year</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { metric: 'Qualified Leads', h1: '50-80', h2: '55-90', year: '105-170' },
                      { metric: 'Demos Booked', h1: '20-30', h2: '25-35', year: '45-65' },
                      { metric: 'Pipeline Generated', h1: '$200K', h2: '$250K', year: '$450K' },
                      { metric: 'Closed Revenue', h1: '—', h2: '$100K+', year: '$150K+' },
                      { metric: 'Cost per Lead', h1: '<$600', h2: '<$600', year: '<$600' },
                      { metric: 'Conference ROI', h1: '—', h2: '—', year: '3x+' },
                    ].map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <td className="p-4 text-sm text-white font-medium">{row.metric}</td>
                        <td className="p-4 text-sm text-center" style={{ color: '#9EFAFF' }}>{row.h1}</td>
                        <td className="p-4 text-sm text-center" style={{ color: '#9EFAFF' }}>{row.h2}</td>
                        <td className="p-4 text-sm text-center font-bold text-white">{row.year}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Scale Logic */}
              <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {/* Strong Results */}
                <div className="rounded-2xl p-5" style={{ backgroundColor: 'rgba(158,250,255,0.2)' }}>
                  <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <span style={{ color: '#9EFAFF' }}>📈</span> If H1 Results Are Strong
                  </h4>
                  <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.6)' }}>50+ qualified leads, 20+ demos</p>
                  <div className="space-y-2">
                    {[
                      'Increase H2 budget by $5-10K',
                      'Upgrade WORKTECH26 to premium sponsorship',
                      'Add one additional H2 conference (e.g., HR Tech)'
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span style={{ color: '#9EFAFF' }}>+</span>
                        <p className="text-sm text-white">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Weak Results */}
                <div className="rounded-2xl p-5" style={{ backgroundColor: 'rgba(255,80,80,0.2)' }}>
                  <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <span style={{ color: '#FF5050' }}>📉</span> If H1 Results Are Weak
                  </h4>
                  <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.6)' }}>&lt;30 leads, &lt;10 demos</p>
                  <div className="space-y-2">
                    {[
                      'Reduce H2 conference spend by $10K',
                      'Focus on smaller, higher-touch events',
                      'Shift budget to content marketing or SDR outreach'
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span style={{ color: '#FF5050' }}>−</span>
                        <p className="text-sm text-white">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Revenue Signals */}
              <div className="max-w-4xl mx-auto mt-6">
                <div className="rounded-2xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                  <h4 className="font-semibold text-white text-sm mb-3">Revenue Signals to Watch</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    {[
                      { signal: 'Conference demos', threshold: '20+ in H1', action: 'Increase H2 spend' },
                      { signal: 'Pipeline', threshold: '$200K+ in H1', action: 'Upgrade sponsorships' },
                      { signal: 'Close rate', threshold: '>20%', action: 'Double down same events' },
                      { signal: 'Cost per lead', threshold: '<$500', action: 'Scale that conference' },
                    ].map((item, idx) => (
                      <div key={idx} className="text-center">
                        <p className="text-white font-medium">{item.signal}</p>
                        <p style={{ color: '#9EFAFF' }}>{item.threshold}</p>
                        <p style={{ color: 'rgba(255,255,255,0.5)' }}>{item.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 19: HEALTHCARE - CIGNA ==================== */}
        {currentSlide === 18 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: '#E0F2F7' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{ backgroundColor: 'white' }}>
                  <span>🏥</span>
                  <span className="text-sm font-semibold" style={{ color: '#003756' }}>Lever 3</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Employer Wellness Funds
                </h2>
                <p className="text-lg max-w-2xl mx-auto" style={{ color: '#003756', opacity: 0.7 }}>
                  Proven channel — clients have already used Cigna and Aetna funds to pay for Shortcut services
                </p>
              </div>

              {/* PROVEN Validation Box */}
              <div className="max-w-4xl mx-auto mb-8">
                <div className="rounded-2xl p-5" style={{ backgroundColor: '#DCFCE7', border: '3px solid #22C55E' }}>
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">✅</span>
                    <div>
                      <p className="font-bold text-lg" style={{ color: '#166534' }}>ALREADY VALIDATED — This Is Real Revenue</p>
                      <p className="text-sm" style={{ color: '#166534' }}>Corporate partners have successfully used Cigna and Aetna wellness funds to pay for massage and mindfulness events. Funds expire at plan year-end — use-it-or-lose-it urgency.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 max-w-6xl mx-auto mb-6">
                {/* Current Services - PROVEN */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '2px solid #22C55E' }}>
                  <div className="p-4" style={{ backgroundColor: '#166534' }}>
                    <h3 className="font-semibold text-white text-sm">Current Services — PROVEN</h3>
                    <p className="text-xs text-white" style={{ opacity: 0.8 }}>Already reimbursed via Cigna/Aetna</p>
                  </div>
                  <div className="p-4" style={{ backgroundColor: 'white' }}>
                    <div className="space-y-3">
                      {[
                        { service: 'Chair & Table Massage', eligible: '"Onsite group exercise classes"', icon: '💆' },
                        { service: 'Mindfulness Workshops', eligible: '"Guest speakers on wellness topics"', icon: '🧘' },
                      ].map((item, idx) => (
                        <div key={idx} className="p-3 rounded-xl" style={{ backgroundColor: '#F0FDF4' }}>
                          <div className="flex items-center gap-2 mb-1">
                            <span>{item.icon}</span>
                            <p className="font-semibold text-sm" style={{ color: '#166534' }}>{item.service}</p>
                          </div>
                          <p className="text-xs" style={{ color: '#166534', opacity: 0.8 }}>Cigna category: {item.eligible}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 p-2 rounded-lg text-center" style={{ backgroundColor: '#DCFCE7' }}>
                      <p className="text-xs font-bold" style={{ color: '#166534' }}>✅ Clients already using these</p>
                    </div>
                  </div>
                </div>

                {/* New Services to Add */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '2px solid #F59E0B' }}>
                  <div className="p-4" style={{ backgroundColor: '#92400E' }}>
                    <h3 className="font-semibold text-white text-sm">New Services to Add</h3>
                    <p className="text-xs text-white" style={{ opacity: 0.8 }}>Expand reimbursable offerings</p>
                  </div>
                  <div className="p-4" style={{ backgroundColor: 'white' }}>
                    <div className="space-y-3">
                      {[
                        { service: 'Onsite Yoga Classes', eligible: '"Onsite group exercise classes (yoga, pilates)"', icon: '🧘‍♀️', priority: 'HIGH' },
                        { service: 'Assisted Stretch / Recovery', eligible: '"Activities to promote healthy living"', icon: '🤸', priority: 'HIGH' },
                        { service: 'Nutrition Workshops', eligible: '"Guest speakers (nutrition, behavioral health)"', icon: '🥗', priority: 'MED' },
                      ].map((item, idx) => (
                        <div key={idx} className="p-3 rounded-xl" style={{ backgroundColor: '#FEF3C7' }}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span>{item.icon}</span>
                              <p className="font-semibold text-sm" style={{ color: '#92400E' }}>{item.service}</p>
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: item.priority === 'HIGH' ? '#FEE2E2' : '#E0F2F7', color: item.priority === 'HIGH' ? '#DC2626' : '#018EA2' }}>{item.priority}</span>
                          </div>
                          <p className="text-xs" style={{ color: '#92400E', opacity: 0.8 }}>{item.eligible}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 p-2 rounded-lg text-center" style={{ backgroundColor: '#FEF3C7' }}>
                      <p className="text-xs font-bold" style={{ color: '#92400E' }}>🎯 Q2 launch target</p>
                    </div>
                  </div>
                </div>

                {/* Provider Status */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '2px solid #003756' }}>
                  <div className="p-4" style={{ backgroundColor: '#003756' }}>
                    <h3 className="font-semibold text-white text-sm">Provider Status</h3>
                    <p className="text-xs text-white" style={{ opacity: 0.8 }}>Insurer validation progress</p>
                  </div>
                  <div className="p-3" style={{ backgroundColor: 'white' }}>
                    <table className="w-full text-xs">
                      <tbody>
                        {[
                          { name: 'Cigna', status: '✅ USING', color: '#22C55E' },
                          { name: 'Aetna', status: '✅ USING', color: '#22C55E' },
                          { name: 'Anthem', status: '🎯 HIGH', color: '#F59E0B' },
                          { name: 'BCBS', status: '🔍 Q1', color: '#6B7280' },
                          { name: 'UHC', status: '🔍 Q1', color: '#6B7280' },
                        ].map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(0,55,86,0.1)' }}>
                            <td className="py-2 font-medium" style={{ color: '#003756' }}>{item.name}</td>
                            <td className="py-2 text-right font-bold" style={{ color: item.color }}>{item.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-3" style={{ backgroundColor: '#E0F2F7' }}>
                    <p className="text-xs text-center" style={{ color: '#003756' }}>
                      <strong>⏰ KEY:</strong> Funds expire at plan year-end
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom: Additional Services Worth Exploring */}
              <div className="max-w-5xl mx-auto p-4 rounded-2xl" style={{ backgroundColor: '#F8F9FA', border: '1px solid rgba(0,55,86,0.1)' }}>
                <p className="text-sm text-center mb-3" style={{ color: '#003756' }}>
                  <strong>Other Eligible Services to Consider:</strong>
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {['Flu Shot Clinics', 'Biometric Screenings', 'CPR/First Aid Training', 'Financial Wellness Speakers', 'Ergonomic Assessments'].map((item, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: 'white', color: '#003756', border: '1px solid rgba(0,55,86,0.2)' }}>{item}</span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 20: HOW IT WORKS ==================== */}
        {currentSlide === 19 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: 'white' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#018EA2' }}>
                  Employer Wellness Funds
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  How It Works
                </h2>
                <p className="text-lg max-w-2xl mx-auto" style={{ color: '#003756', opacity: 0.7 }}>
                  Company-level funds for group wellness events — not individual employee spending
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-8">
                {/* The Flow */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '2px solid #9EFAFF' }}>
                  <div className="p-4" style={{ backgroundColor: '#003756' }}>
                    <h3 className="font-semibold text-white">The Reimbursement Flow</h3>
                  </div>
                  <div className="p-5" style={{ backgroundColor: 'white' }}>
                    <div className="space-y-4">
                      {[
                        { step: '1', title: 'HR Books Shortcut', desc: 'Company decides to bring in Shortcut for a wellness day, massage event, or ongoing program' },
                        { step: '2', title: 'Shortcut Delivers & Invoices', desc: 'We deliver the service and invoice the company directly (B2B transaction)' },
                        { step: '3', title: 'Company Pays Shortcut', desc: 'Company pays our invoice from their operating budget' },
                        { step: '4', title: 'Company Submits for Reimbursement', desc: 'HR submits invoice/receipt to their insurer wellness fund' },
                        { step: '5', title: 'Insurer Reimburses Company', desc: 'Company gets reimbursed (typically 45-60 days)' },
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ backgroundColor: '#E0F2F7', color: '#003756' }}>{item.step}</span>
                          <div>
                            <p className="font-medium text-sm" style={{ color: '#003756' }}>{item.title}</p>
                            <p className="text-xs" style={{ color: '#003756', opacity: 0.6 }}>{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Key Distinctions */}
                <div className="space-y-4">
                  <div className="rounded-3xl p-5" style={{ backgroundColor: '#DCFCE7' }}>
                    <h3 className="font-semibold mb-3" style={{ color: '#166534' }}>✓ This IS Our Model</h3>
                    <div className="space-y-2 text-sm" style={{ color: '#166534' }}>
                      <p>• <strong>Company-level decision</strong> — HR/benefits team books us</p>
                      <p>• <strong>Group service delivery</strong> — massage day for the office</p>
                      <p>• <strong>B2B invoice</strong> — we bill the company directly</p>
                      <p>• <strong>Pooled corporate funds</strong> — not individual employee accounts</p>
                      <p>• <strong>Massage is eligible</strong> — confirmed as qualifying wellness activity</p>
                    </div>
                  </div>

                  <div className="rounded-3xl p-5" style={{ backgroundColor: '#FEF2F2' }}>
                    <h3 className="font-semibold mb-3" style={{ color: '#DC2626' }}>✗ This is NOT Our Model</h3>
                    <div className="space-y-2 text-sm" style={{ color: '#DC2626' }}>
                      <p>• Individual employee LSA/HSA/FSA spending</p>
                      <p>• Employees browsing a marketplace to book</p>
                      <p>• Per-employee reimbursement or cards</p>
                      <p>• Consumer-facing transactions</p>
                    </div>
                  </div>

                  <div className="rounded-3xl p-4" style={{ backgroundColor: '#003756' }}>
                    <h4 className="font-semibold text-white text-sm mb-2">Why This Matters</h4>
                    <p className="text-xs text-white" style={{ opacity: 0.8 }}>
                      LSA platforms like Forma and Benepass are for individual employee spending — not relevant to our B2B model. Our focus should be on helping companies access their <strong>insurer wellness funds</strong> and connecting with <strong>benefits brokers</strong> who recommend vendors.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 21: HEALTHCARE BROKERS ==================== */}
        {currentSlide === 20 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: '#E0F2F7' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#003756', opacity: 0.6 }}>
                  Employer Wellness Funds
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Channel 2: Benefits Brokers
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

        {/* ==================== SLIDE 22: HEALTHCARE ACTION PLAN ==================== */}
        {currentSlide === 21 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: 'white' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#22C55E' }}>
                  Employer Wellness Funds — Systematic Capture Strategy
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Three Attack Vectors
                </h2>
                <p className="text-lg max-w-2xl mx-auto" style={{ color: '#003756', opacity: 0.7 }}>
                  We know Cigna and Aetna work. Now systematically capture revenue across ALL major insurers.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4 max-w-6xl mx-auto mb-6">
                {/* Attack Vector 1: Provider Direct */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '2px solid #22C55E' }}>
                  <div className="p-4" style={{ backgroundColor: '#166534' }}>
                    <h3 className="font-semibold text-white text-sm">Vector 1: Provider Direct</h3>
                    <p className="text-xs text-white" style={{ opacity: 0.7 }}>Get on insurer vendor lists</p>
                  </div>
                  <div className="p-4" style={{ backgroundColor: 'white' }}>
                    <div className="space-y-2 text-xs">
                      <p style={{ color: '#166534' }}><strong>Goal:</strong> Become an approved vendor that insurers recommend to employer clients</p>
                      <div className="mt-3 space-y-1">
                        <p style={{ color: '#003756' }}>• Contact Health Engagement teams at each insurer</p>
                        <p style={{ color: '#003756' }}>• Apply to vendor/partner programs</p>
                        <p style={{ color: '#003756' }}>• Get listed in their wellness directories</p>
                      </div>
                      <div className="mt-3 p-2 rounded-lg" style={{ backgroundColor: '#DCFCE7' }}>
                        <p style={{ color: '#166534' }}><strong>Targets:</strong> Cigna, Aetna, Anthem, BCBS, UHC</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attack Vector 2: HR Direct */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '2px solid #018EA2' }}>
                  <div className="p-4" style={{ backgroundColor: '#018EA2' }}>
                    <h3 className="font-semibold text-white text-sm">Vector 2: HR Direct</h3>
                    <p className="text-xs text-white" style={{ opacity: 0.7 }}>Help clients unlock their existing funds</p>
                  </div>
                  <div className="p-4" style={{ backgroundColor: 'white' }}>
                    <div className="space-y-2 text-xs">
                      <p style={{ color: '#018EA2' }}><strong>Goal:</strong> Proactively tell every client/prospect they may have wellness funds available</p>
                      <div className="mt-3 space-y-1">
                        <p style={{ color: '#003756' }}>• Audit all clients for insurer coverage</p>
                        <p style={{ color: '#003756' }}>• Create "Did You Know?" one-pager</p>
                        <p style={{ color: '#003756' }}>• Add wellness fund question to sales process</p>
                      </div>
                      <div className="mt-3 p-2 rounded-lg" style={{ backgroundColor: '#E0F2F7' }}>
                        <p style={{ color: '#018EA2' }}><strong>Key:</strong> "Funds expire end of plan year — use or lose it"</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attack Vector 3: Broker Channel */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '2px solid #003756' }}>
                  <div className="p-4" style={{ backgroundColor: '#003756' }}>
                    <h3 className="font-semibold text-white text-sm">Vector 3: Broker Channel</h3>
                    <p className="text-xs text-white" style={{ opacity: 0.7 }}>Brokers recommend us to their clients</p>
                  </div>
                  <div className="p-4" style={{ backgroundColor: 'white' }}>
                    <div className="space-y-2 text-xs">
                      <p style={{ color: '#003756' }}><strong>Goal:</strong> Become preferred vendor for benefits brokers who advise employer clients</p>
                      <div className="mt-3 space-y-1">
                        <p style={{ color: '#003756' }}>• Target Gallagher, Lockton, USI, Mercer</p>
                        <p style={{ color: '#003756' }}>• Position: "Help your clients use their funds"</p>
                        <p style={{ color: '#003756' }}>• Attend BenefitsPRO Broker Expo (April)</p>
                      </div>
                      <div className="mt-3 p-2 rounded-lg" style={{ backgroundColor: '#F8F9FA' }}>
                        <p style={{ color: '#003756' }}><strong>Pitch:</strong> "90% of your clients have unused wellness $"</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Revenue Target + Insurer Map */}
              <div className="grid md:grid-cols-2 gap-4 max-w-5xl mx-auto">
                <div className="rounded-3xl p-5" style={{ backgroundColor: '#003756' }}>
                  <h4 className="font-semibold text-white mb-3">2026 Revenue Target</h4>
                  <p className="text-3xl font-bold mb-2" style={{ color: '#9EFAFF' }}>$30-40K</p>
                  <div className="space-y-1 text-xs text-white" style={{ opacity: 0.8 }}>
                    <p>• 6-8 clients actively using wellness funds @ ~$5K avg</p>
                    <p>• Proven with Cigna/Aetna — replicate across insurers</p>
                    <p>• Q4 urgency play: "Use your funds before year-end"</p>
                  </div>
                </div>

                <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(0,55,86,0.1)' }}>
                  <div className="p-3" style={{ backgroundColor: '#E0F2F7' }}>
                    <h4 className="font-semibold text-sm" style={{ color: '#003756' }}>Insurer Program Status (Research Findings)</h4>
                  </div>
                  <div className="p-3" style={{ backgroundColor: 'white' }}>
                    <div className="space-y-1 text-xs">
                      {[
                        { name: 'Cigna', program: 'Health Improvement Fund', status: '✅ PROVEN', note: 'Reimbursement confirmed' },
                        { name: 'Aetna/CVS', program: 'Wellness Fund', status: '✅ PROVEN', note: 'Clients already using' },
                        { name: 'Anthem', program: 'Wellness Fund', status: '🎯 HIGH', note: 'Has formal reimbursement process' },
                        { name: 'BCBS', program: 'Varies by state', status: '🔍 RESEARCH', note: 'Well onTarget, state-specific' },
                        { name: 'UHC', program: 'Wellness Programs', status: '🔍 RESEARCH', note: 'Rewards-focused, vendor network' },
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1" style={{ borderBottom: '1px solid rgba(0,55,86,0.05)' }}>
                          <span className="font-medium" style={{ color: '#003756' }}>{item.name}</span>
                          <span style={{ color: '#003756', opacity: 0.5 }}>{item.note}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 23: CLE FOR LAWYERS ==================== */}
        {currentSlide === 22 && (
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

        {/* ==================== SLIDE 24: CLE REVENUE POTENTIAL ==================== */}
        {currentSlide === 23 && (
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

        {/* ==================== SLIDE 25: SHORTCUT SESSIONS ==================== */}
        {currentSlide === 24 && (
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
                  Q1: Design the experience. Q2-Q4: Launch 3 unforgettable events.
                </p>
              </div>

              {/* Timeline: Q1 Design → Q2-Q4 Execute */}
              <div className="max-w-5xl mx-auto mb-8">
                <div className="grid md:grid-cols-4 gap-3">
                  {/* Q1: Design Phase */}
                  <div className="rounded-3xl overflow-hidden" style={{ border: '2px solid #F59E0B' }}>
                    <div className="p-3 text-center" style={{ backgroundColor: '#F59E0B' }}>
                      <p className="font-bold text-white">Q1: DESIGN</p>
                    </div>
                    <div className="p-4" style={{ backgroundColor: '#FEF3C7' }}>
                      <div className="space-y-2 text-xs" style={{ color: '#92400E' }}>
                        <p>• Finalize event concept & brand</p>
                        <p>• Scout venue partners</p>
                        <p>• Secure 2-3 sponsors</p>
                        <p>• Build invite list (200+ targets)</p>
                        <p>• Design registration flow</p>
                      </div>
                    </div>
                  </div>

                  {/* Q2: Event 1 */}
                  <div className="rounded-3xl overflow-hidden" style={{ border: '2px solid #22C55E' }}>
                    <div className="p-3 text-center" style={{ backgroundColor: '#22C55E' }}>
                      <p className="font-bold text-white">Q2: EVENT #1</p>
                      <p className="text-xs text-white" style={{ opacity: 0.8 }}>Late May / Early June</p>
                    </div>
                    <div className="p-4" style={{ backgroundColor: '#DCFCE7' }}>
                      <p className="font-semibold text-sm mb-2" style={{ color: '#166534' }}>"Summer Ready"</p>
                      <div className="space-y-1 text-xs" style={{ color: '#166534' }}>
                        <p>🎯 40-50 HR leaders</p>
                        <p>🍹 Rooftop venue + drinks</p>
                        <p>💆 Massage + headshot stations</p>
                        <p>🎤 Panel: "Wellness That Works"</p>
                      </div>
                    </div>
                  </div>

                  {/* Q3: Event 2 */}
                  <div className="rounded-3xl overflow-hidden" style={{ border: '2px solid #018EA2' }}>
                    <div className="p-3 text-center" style={{ backgroundColor: '#018EA2' }}>
                      <p className="font-bold text-white">Q3: EVENT #2</p>
                      <p className="text-xs text-white" style={{ opacity: 0.8 }}>Mid-September</p>
                    </div>
                    <div className="p-4" style={{ backgroundColor: '#E0F2F7' }}>
                      <p className="font-semibold text-sm mb-2" style={{ color: '#003756' }}>"The Recharge"</p>
                      <div className="space-y-1 text-xs" style={{ color: '#003756' }}>
                        <p>🎯 50-60 HR leaders</p>
                        <p>🍷 Wine tasting + wellness</p>
                        <p>🧘 Live mindfulness demo</p>
                        <p>🎤 Fireside: Q4 planning tips</p>
                      </div>
                    </div>
                  </div>

                  {/* Q4: Event 3 */}
                  <div className="rounded-3xl overflow-hidden" style={{ border: '2px solid #003756' }}>
                    <div className="p-3 text-center" style={{ backgroundColor: '#003756' }}>
                      <p className="font-bold text-white">Q4: EVENT #3</p>
                      <p className="text-xs text-white" style={{ opacity: 0.8 }}>Early November</p>
                    </div>
                    <div className="p-4" style={{ backgroundColor: '#F8F9FA' }}>
                      <p className="font-semibold text-sm mb-2" style={{ color: '#003756' }}>"The Thank You"</p>
                      <div className="space-y-1 text-xs" style={{ color: '#003756' }}>
                        <p>🎯 60+ HR leaders</p>
                        <p>🎄 Holiday cocktail vibes</p>
                        <p>💅 Full service stations</p>
                        <p>🎤 Client success stories</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-6">
                {/* Event Format */}
                <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(0,55,86,0.1)' }}>
                  <div className="p-4" style={{ backgroundColor: '#003756' }}>
                    <h3 className="font-semibold text-white">Event Format (2.5-3 hours)</h3>
                  </div>
                  <div className="p-4" style={{ backgroundColor: 'white' }}>
                    <div className="space-y-2">
                      {[
                        { time: '6:00-6:30', activity: '🍸 Arrival, signature cocktails, networking' },
                        { time: '6:30-7:00', activity: '🎤 20-min panel or fireside chat' },
                        { time: '7:00-8:00', activity: '💆 Wellness stations (massage, nails, headshots)' },
                        { time: '8:00-8:30', activity: '🍰 Dessert, open networking, soft close' },
                      ].map((item, idx) => (
                        <div key={idx} className="flex gap-3 py-2 border-b" style={{ borderColor: 'rgba(0,55,86,0.1)' }}>
                          <span className="text-xs font-mono px-2 py-1 rounded flex-shrink-0" style={{ backgroundColor: '#E0F2F7', color: '#003756' }}>
                            {item.time}
                          </span>
                          <p className="text-sm" style={{ color: '#003756' }}>{item.activity}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sponsor Strategy */}
                <div className="space-y-4">
                  <div className="rounded-3xl p-5" style={{ backgroundColor: '#FEF3C7', border: '2px solid #F59E0B' }}>
                    <h3 className="font-semibold mb-3" style={{ color: '#92400E' }}>🤝 Sponsor & Partner Strategy</h3>
                    <div className="space-y-2 text-sm" style={{ color: '#92400E' }}>
                      <p><strong>Venue Partner:</strong> Trade services for space (WeWork, Convene, hotel rooftops)</p>
                      <p><strong>Beverage Sponsor:</strong> $1-2K to cover drinks (wine brand, spirits co)</p>
                      <p><strong>Co-Host Partner:</strong> Complementary HR tech (benefits platform, HRIS)</p>
                      <p><strong>Content Partner:</strong> HR media outlet for amplification</p>
                    </div>
                    <div className="mt-3 p-2 rounded-lg text-center" style={{ backgroundColor: 'white' }}>
                      <p className="text-xs font-bold" style={{ color: '#92400E' }}>Goal: Reduce event cost to $2-3K net</p>
                    </div>
                  </div>

                  <div className="rounded-3xl p-4" style={{ backgroundColor: '#003756' }}>
                    <h3 className="font-semibold mb-2 text-white text-sm">Event Economics (per event)</h3>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                        <p className="text-lg font-bold text-white">$4-6K</p>
                        <p className="text-xs text-white" style={{ opacity: 0.7 }}>gross cost</p>
                      </div>
                      <div className="p-2 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                        <p className="text-lg font-bold text-white">40-60</p>
                        <p className="text-xs text-white" style={{ opacity: 0.7 }}>attendees</p>
                      </div>
                      <div className="p-2 rounded-xl" style={{ backgroundColor: 'rgba(158,250,255,0.2)' }}>
                        <p className="text-lg font-bold" style={{ color: '#9EFAFF' }}>3-5</p>
                        <p className="text-xs" style={{ color: '#9EFAFF' }}>new clients</p>
                      </div>
                    </div>
                    <div className="mt-3 p-2 rounded-xl text-center" style={{ backgroundColor: 'rgba(158,250,255,0.2)' }}>
                      <p className="text-sm font-semibold" style={{ color: '#9EFAFF' }}>3 events × 4 clients × $12K avg = $144K pipeline</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Why This Works + Invite Strategy */}
              <div className="grid md:grid-cols-2 gap-4 max-w-5xl mx-auto">
                <div className="rounded-2xl p-4" style={{ backgroundColor: '#E0F2F7' }}>
                  <h4 className="font-semibold mb-2 text-sm" style={{ color: '#003756' }}>Why This Works</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: '#003756' }}>
                    <p>✓ We control the room</p>
                    <p>✓ Experience IS the pitch</p>
                    <p>✓ Lower CAC than conferences</p>
                    <p>✓ Content engine (photos, video)</p>
                    <p>✓ Referral flywheel</p>
                    <p>✓ Sponsors offset costs</p>
                  </div>
                </div>
                <div className="rounded-2xl p-4" style={{ backgroundColor: '#F8F9FA', border: '1px solid rgba(0,55,86,0.1)' }}>
                  <h4 className="font-semibold mb-2 text-sm" style={{ color: '#003756' }}>Invite Strategy</h4>
                  <p className="text-xs" style={{ color: '#003756' }}>
                    "You're invited because you're a senior HR leader at a company we admire" — <strong>exclusivity + free $200+ wellness services + peer networking + drinks = 60%+ attendance rate</strong>
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 26: SAMPLE INVITATION ==================== */}
        {currentSlide === 25 && (
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

        {/* ==================== SLIDE 27: CLIENT ENTERTAINMENT ==================== */}
        {currentSlide === 26 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: '#E0F2F7' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-8">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#003756', opacity: 0.6 }}>
                  New Revenue Vertical
                </p>
                <h2 className="text-4xl md:text-5xl font-semibold mb-2" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Client Entertainment
                </h2>
                <p className="text-lg max-w-3xl mx-auto" style={{ color: '#003756', opacity: 0.7 }}>
                  Repositioning Shortcut from employee wellness to premium client hospitality
                </p>
              </div>

              {/* The Opportunity */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="rounded-3xl p-6" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: '#003756' }}>
                    <span className="text-xl">🎯</span> The Opportunity
                  </h3>
                  <p className="text-sm mb-4" style={{ color: '#003756', opacity: 0.8 }}>
                    Wall Street firms spend millions on client entertainment—steakhouses, box seats, golf outings. These are expensive, undifferentiated, and rarely memorable.
                  </p>
                  <p className="text-sm font-medium" style={{ color: '#018EA2' }}>
                    Shortcut offers a differentiated, memorable, and wellness-focused alternative that creates genuine connection.
                  </p>
                </div>

                <div className="rounded-3xl p-6" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: '#003756' }}>
                    <span className="text-xl">🏢</span> Target Accounts
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {[
                      { type: 'Investment Banks', examples: 'Deal teams, ECM/DCM' },
                      { type: 'PE & Hedge Funds', examples: 'LP relations, IR teams' },
                      { type: 'Wealth Management', examples: 'Private client groups' },
                      { type: 'Law & Consulting', examples: 'Partner client events' },
                    ].map((item, idx) => (
                      <div key={idx} className="p-2 rounded-xl" style={{ backgroundColor: '#F8F9FA' }}>
                        <p className="font-semibold" style={{ color: '#003756' }}>{item.type}</p>
                        <p className="text-xs" style={{ color: '#003756', opacity: 0.6 }}>{item.examples}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Packages */}
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                {[
                  { name: 'The Closer', price: '$15-25K', desc: 'Deal celebration or client appreciation', items: ['Full-service spa experience', 'Champagne & catering', 'Branded amenities', 'Photography'] },
                  { name: 'The LP Experience', price: '$20-40K', desc: 'Investor day wellness component', items: ['Pre-conference relaxation', 'Healthy catering', 'Mindfulness session', 'Networking lounge'], highlight: true },
                  { name: 'The Cultivator', price: '$8-15K', desc: 'Prospect relationship building', items: ['Intimate 6-10 person', 'Premium services', 'Private setting', 'Follow-up touches'] },
                ].map((pkg, idx) => (
                  <div key={idx} className="rounded-2xl p-5" style={{ backgroundColor: pkg.highlight ? 'white' : '#F8F9FA', border: pkg.highlight ? '2px solid #9EFAFF' : '1px solid rgba(0,55,86,0.1)' }}>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold" style={{ color: '#003756' }}>{pkg.name}</h4>
                      <span className="text-sm font-bold" style={{ color: '#018EA2' }}>{pkg.price}</span>
                    </div>
                    <p className="text-xs mb-3" style={{ color: '#003756', opacity: 0.6 }}>{pkg.desc}</p>
                    <ul className="space-y-1">
                      {pkg.items.map((item, i) => (
                        <li key={i} className="text-xs flex items-center gap-1" style={{ color: '#003756', opacity: 0.8 }}>
                          <span style={{ color: '#018EA2' }}>✓</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Timeline & Revenue */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-2xl p-4" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                  <h4 className="font-semibold text-sm mb-2" style={{ color: '#003756' }}>Timeline</h4>
                  <div className="flex gap-4 text-xs">
                    <div className="flex-1 p-2 rounded-lg" style={{ backgroundColor: '#F8F9FA' }}>
                      <span className="font-semibold" style={{ color: '#018EA2' }}>Q1</span>
                      <p style={{ color: '#003756', opacity: 0.7 }}>Design packages & identify targets</p>
                    </div>
                    <div className="flex-1 p-2 rounded-lg" style={{ backgroundColor: '#F8F9FA' }}>
                      <span className="font-semibold" style={{ color: '#018EA2' }}>Q2</span>
                      <p style={{ color: '#003756', opacity: 0.7 }}>Launch & execute first events</p>
                    </div>
                    <div className="flex-1 p-2 rounded-lg" style={{ backgroundColor: '#F8F9FA' }}>
                      <span className="font-semibold" style={{ color: '#018EA2' }}>Q3-Q4</span>
                      <p style={{ color: '#003756', opacity: 0.7 }}>Scale & refine</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl p-4" style={{ backgroundColor: '#003756' }}>
                  <h4 className="font-semibold text-sm mb-2 text-white">Revenue Potential</h4>
                  <div className="flex justify-between text-sm">
                    <div>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Conservative (10 events)</p>
                      <p className="font-bold text-white">$150K</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Aggressive (60+ events)</p>
                      <p className="font-bold" style={{ color: '#9EFAFF' }}>$2.4M</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 28: INVESTMENT SUMMARY ==================== */}
        {currentSlide === 27 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: '#003756' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-12">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#9EFAFF' }}>
                  2026 Capitalization Plan
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold mb-4 text-white" style={{ letterSpacing: '-0.02em' }}>
                  Investment Summary
                </h2>
                <p className="text-lg max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  $200K minimum capital required to achieve growth targets
                </p>
              </div>

              {/* Budget Breakdown */}
              <div className="rounded-3xl overflow-hidden mb-8 max-w-4xl mx-auto" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                      <th className="text-left p-4 text-sm font-semibold text-white">Category</th>
                      <th className="text-right p-4 text-sm font-semibold text-white">H1</th>
                      <th className="text-right p-4 text-sm font-semibold text-white">H2</th>
                      <th className="text-right p-4 text-sm font-semibold text-white">Year Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { cat: 'Team Compensation & Growth', h1: '$35K', h2: '$55K', total: '$90K', note: 'Merit increases for existing team and strategic new hires; subject to adjustment based on H2 performance' },
                      { cat: 'Conferences (7 total)', h1: '$33K', h2: '$36K', total: '~$60K', note: '3 in H1, 4 in H2' },
                      { cat: 'Content & Ad Spend', h1: '$32K', h2: '$18K', total: '$50K', note: 'Marketing investment' },
                    ].map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <td className="p-4 text-sm text-white">
                          {item.cat}
                          <span className="block text-xs" style={{ opacity: 0.5 }}>{item.note}</span>
                        </td>
                        <td className="p-4 text-sm text-right font-semibold" style={{ color: '#9EFAFF' }}>{item.h1}</td>
                        <td className="p-4 text-sm text-right font-semibold" style={{ color: '#9EFAFF' }}>{item.h2}</td>
                        <td className="p-4 text-sm text-right font-bold text-white">{item.total}</td>
                      </tr>
                    ))}
                    <tr style={{ backgroundColor: 'rgba(158,250,255,0.2)' }}>
                      <td className="p-4 text-sm font-bold text-white">Total Required Capital</td>
                      <td className="p-4 text-sm text-right font-bold" style={{ color: '#9EFAFF' }}>$100K</td>
                      <td className="p-4 text-sm text-right font-bold" style={{ color: '#9EFAFF' }}>$100K</td>
                      <td className="p-4 text-sm text-right font-bold" style={{ color: '#9EFAFF' }}>$200K</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Team Investment Detail */}
              <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto mb-8">
                <div className="rounded-2xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                  <h4 className="font-semibold text-white mb-2">Existing Team</h4>
                  <p className="text-sm" style={{ color: '#9EFAFF' }}>Merit-based increases</p>
                  <p className="text-xs text-white" style={{ opacity: 0.6 }}>Competitive adjustments to retain and reward top performers</p>
                </div>
                <div className="rounded-2xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                  <h4 className="font-semibold text-white mb-2">Strategic New Hires</h4>
                  <p className="text-sm" style={{ color: '#9EFAFF' }}>Sales & Account Management</p>
                  <p className="text-xs text-white" style={{ opacity: 0.6 }}>Allocation subject to increase based on year-end performance</p>
                </div>
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

        {/* ==================== SLIDE 29: Q1 ACTION ITEMS ==================== */}
        {currentSlide === 28 && (
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

        {/* ==================== SLIDE 30: NEXT STEPS ==================== */}
        {currentSlide === 29 && (
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

        {/* ==================== SLIDE 31: APPENDIX - CONFERENCES ==================== */}
        {currentSlide === 30 && (
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

        {/* ==================== SLIDE 32: APPENDIX - INSURERS ==================== */}
        {currentSlide === 31 && (
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

        {/* ==================== SLIDE 33: APPENDIX - BROKERS ==================== */}
        {currentSlide === 32 && (
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
