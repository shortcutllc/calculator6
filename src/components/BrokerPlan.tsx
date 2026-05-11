import { useState, useEffect } from 'react';

export default function BrokerPlan() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    'title',
    'opportunity',
    'pivot',
    'two-tracks',
    'broker-landscape',
    'top-10-start',
    'role-hierarchy',
    'carrier-hec',
    'broker-money',
    'our-wedge',
    'value-props',
    'ethics-intro',
    'regulatory',
    'three-options',
    'why-passthrough',
    'disclosure-language',
    'cold-email-cadence',
    'subject-openers',
    'what-works',
    'apollo-toolkit',
    'apollo-filters',
    'adjacent-channels',
    'conferences',
    'thirty-day-plan',
    'open-decisions',
    'appendix-top-30',
    'appendix-templates',
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

      <div className="pt-20">

        {/* ==================== SLIDE 1: TITLE ==================== */}
        {currentSlide === 0 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: 'white' }}>
            <div className="max-w-6xl mx-auto px-6 text-center">
              <p className="text-sm font-semibold uppercase tracking-wider mb-6" style={{ color: '#FF5050' }}>
                Internal Team Document — Confidential
              </p>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-semibold mb-8" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                Broker Channel Strategy
              </h1>
              <p className="text-xl md:text-2xl font-normal max-w-4xl mx-auto mb-12" style={{ color: '#003756', opacity: 0.7, lineHeight: '1.5' }}>
                Direct outreach to benefits brokers + carrier wellness consultants to <strong>unlock employer wellness fund dollars</strong> at scale
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 max-w-4xl mx-auto">
                {[
                  { icon: '🎯', label: 'Two Tracks', desc: 'Brokers + Carrier HECs' },
                  { icon: '💰', label: 'Ethical Rev Share', desc: 'Three-option menu' },
                  { icon: '✉️', label: 'Cold Outbound', desc: '7-touch / 21-day cadence' },
                  { icon: '🔌', label: 'Apollo Ready', desc: 'Toolkit pre-built' },
                ].map((item, idx) => (
                  <div key={idx} className="p-4 rounded-2xl" style={{ backgroundColor: '#F8F9FA' }}>
                    <div className="text-2xl mb-2">{item.icon}</div>
                    <p className="font-semibold text-sm" style={{ color: '#003756' }}>{item.label}</p>
                    <p className="text-xs" style={{ color: '#003756', opacity: 0.6 }}>{item.desc}</p>
                  </div>
                ))}
              </div>

              <p className="text-base" style={{ color: '#003756', opacity: 0.5 }}>
                Use arrow keys or click Next to navigate — {slides.length} slides total
              </p>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 2: THE OPPORTUNITY ==================== */}
        {currentSlide === 1 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: 'white' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-12">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#003756', opacity: 0.6 }}>
                  Why This Channel
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  The Opportunity
                </h2>
              </div>

              <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-10">
                {[
                  { stat: '$1.6B', label: 'Cigna alone — diverse wellness spend target', sub: 'Real, allocated, often under-utilized' },
                  { stat: '85K+', label: 'OneDigital alone — employer clients', sub: 'One broker yes = whole book' },
                  { stat: '12-18mo', label: 'Tier 1 sales cycle', sub: 'Why we start mid-market' },
                ].map((item, idx) => (
                  <div key={idx} className="p-6 rounded-3xl text-center" style={{ backgroundColor: '#E0F2F7' }}>
                    <p className="text-4xl font-semibold mb-2" style={{ color: '#003756' }}>{item.stat}</p>
                    <p className="text-sm font-medium mb-2" style={{ color: '#003756' }}>{item.label}</p>
                    <p className="text-xs" style={{ color: '#018EA2' }}>{item.sub}</p>
                  </div>
                ))}
              </div>

              <div className="max-w-4xl mx-auto p-8 rounded-3xl" style={{ backgroundColor: '#F8F9FA', border: '1px solid rgba(0,55,86,0.1)' }}>
                <p className="text-lg leading-relaxed" style={{ color: '#003756' }}>
                  Burberry already pays for Shortcut massage through their <strong>Aetna Wellness Allowance</strong>. The dollars exist at most carriers (Cigna HIF, Aetna Wellness Allowance, Anthem Wellness Fund). Brokers know they exist — <strong>but few actively help clients deploy them</strong>. That gap is our wedge.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 3: THE PIVOT ==================== */}
        {currentSlide === 2 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: '#F8F9FA' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-12">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#003756', opacity: 0.6 }}>
                  Why Not SupplierOne
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  We ruled out the easy path
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                <div className="rounded-3xl p-8" style={{ backgroundColor: 'white', border: '2px solid #FF5050' }}>
                  <p className="text-xs uppercase tracking-wide font-semibold mb-3" style={{ color: '#FF5050' }}>SupplierOne — Skip</p>
                  <ul className="space-y-3 text-sm" style={{ color: '#003756' }}>
                    <li>• Tier-2 spend <strong>reporting</strong> tool, not sourcing</li>
                    <li>• Most of $1.6B = Tier-1 BPO/IT passthrough</li>
                    <li>• Zero documented wellness vendor wins via portal</li>
                    <li>• Requires diversity cert ($350-$1.5K + 30-90d)</li>
                    <li>• 2025-26 DEI rollback hollowing it out further</li>
                  </ul>
                </div>

                <div className="rounded-3xl p-8" style={{ backgroundColor: 'white', border: '2px solid #018EA2' }}>
                  <p className="text-xs uppercase tracking-wide font-semibold mb-3" style={{ color: '#018EA2' }}>Direct Broker Outbound — Run</p>
                  <ul className="space-y-3 text-sm" style={{ color: '#003756' }}>
                    <li>• Brokers actively sourcing wellness vendors</li>
                    <li>• Apollo toolkit already built (.openclaw)</li>
                    <li>• Burberry/Aetna proof gives us a real case</li>
                    <li>• Carrier HECs are virtually unprospected</li>
                    <li>• Mid-market Tier 2/3 brokers = faster cycle</li>
                  </ul>
                </div>
              </div>

              <p className="text-center mt-10 text-sm italic" style={{ color: '#003756', opacity: 0.6 }}>
                Free SAM.gov SBA self-cert is still worth doing as a $0 checkbox — but it's not a lead source.
              </p>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 4: TWO TRACKS ==================== */}
        {currentSlide === 3 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: 'white' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-12">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#003756', opacity: 0.6 }}>
                  Strategy
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Two parallel tracks
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                <div className="rounded-3xl p-8" style={{ backgroundColor: '#E0F2F7' }}>
                  <div className="text-4xl mb-4">🎯</div>
                  <h3 className="text-2xl font-semibold mb-3" style={{ color: '#003756' }}>Track A — Benefits Brokers</h3>
                  <p className="text-sm mb-4" style={{ color: '#003756', opacity: 0.8 }}>
                    Wellness consultants, H&W practice leaders, producers at mid-market firms
                  </p>
                  <ul className="space-y-2 text-sm" style={{ color: '#003756' }}>
                    <li>• Top 30 NYC tri-state firms</li>
                    <li>• 80 high-priority contacts pre-vetted</li>
                    <li>• White-label / wellness-fund deployment pitch</li>
                    <li>• 7-touch cadence over 21 days</li>
                  </ul>
                </div>

                <div className="rounded-3xl p-8" style={{ backgroundColor: '#FFE8E8', border: '2px solid #FF5050' }}>
                  <div className="text-4xl mb-4">🥷</div>
                  <h3 className="text-2xl font-semibold mb-3" style={{ color: '#003756' }}>Track B — Carrier HECs <span className="text-xs uppercase ml-2" style={{ color: '#FF5050' }}>Stealth</span></h3>
                  <p className="text-sm mb-4" style={{ color: '#003756', opacity: 0.8 }}>
                    Cigna Health Engagement Consultants, Aetna Designated Consultants, Anthem Wellness Consultants
                  </p>
                  <ul className="space-y-2 text-sm" style={{ color: '#003756' }}>
                    <li>• They manage the wellness fund directly</li>
                    <li>• Sit alongside broker in client meetings</li>
                    <li>• <strong>Virtually unprospected by vendors</strong></li>
                    <li>• ~50 contacts per carrier in NYC tri-state</li>
                  </ul>
                </div>
              </div>

              <div className="max-w-3xl mx-auto mt-8 p-6 rounded-2xl text-center" style={{ backgroundColor: '#F8F9FA' }}>
                <p className="text-sm font-medium" style={{ color: '#003756' }}>
                  Carrier HECs are the highest-leverage cold target nobody's talking to. <strong>Run this in parallel, not after.</strong>
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 5: BROKER LANDSCAPE ==================== */}
        {currentSlide === 4 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: '#F8F9FA' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#003756', opacity: 0.6 }}>
                  The Landscape
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Three tiers of brokers
                </h2>
              </div>

              <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {[
                  { tier: 'Tier 1', label: 'National Mega', color: '#003756', items: ['Marsh McLennan / Mercer / MMA', 'Aon (incl. NFP)', 'Gallagher (incl. AssuredPartners)', 'WTW', 'Lockton', 'USI · Alliant · HUB'], note: 'F500/F1000 clients. 12-18mo cycles. Consultant-led RFPs. Fiduciary policies against vendor fees.', verdict: 'Slow but big' },
                  { tier: 'Tier 2', label: 'Mid-Market', color: '#018EA2', items: ['OneDigital', 'NFP (Aon-owned)', 'EPIC Insurance Brokers', 'Risk Strategies', 'Corporate Synergies', 'Holmes Murphy · IMA · Hilb'], note: '100-2,500 EE clients. Wellness-forward culture. Flexible on revenue share. Faster decisions.', verdict: 'Sweet spot' },
                  { tier: 'Tier 3', label: 'Modern/Tech', color: '#FF5050', items: ['Sequoia (tech ICP overlap)', 'Newfront (AI-enabled)', 'Nava Benefits (NYC)', 'Woodruff Sawyer', 'Patriot Growth', 'Savoy · Cross Insurance'], note: 'Tech-forward. VC-backed startup clients overlap directly with Shortcut book.', verdict: 'Warmest reception' },
                ].map((tier, idx) => (
                  <div key={idx} className="rounded-3xl p-6" style={{ backgroundColor: 'white', border: `2px solid ${tier.color}` }}>
                    <p className="text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: tier.color }}>{tier.tier}</p>
                    <h3 className="text-xl font-semibold mb-4" style={{ color: '#003756' }}>{tier.label}</h3>
                    <ul className="space-y-1 text-sm mb-4" style={{ color: '#003756' }}>
                      {tier.items.map((item, i) => <li key={i}>• {item}</li>)}
                    </ul>
                    <p className="text-xs mb-3" style={{ color: '#003756', opacity: 0.7, lineHeight: '1.5' }}>{tier.note}</p>
                    <p className="text-xs font-semibold uppercase" style={{ color: tier.color }}>{tier.verdict}</p>
                  </div>
                ))}
              </div>

              <p className="text-center mt-8 text-sm italic" style={{ color: '#003756', opacity: 0.6 }}>
                M&A context: NFP→Aon (Apr 2024), AssuredPartners→Gallagher (Aug 2025) — wellness practice gaps at acquired offices = warm leads
              </p>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 6: TOP 10 START ==================== */}
        {currentSlide === 5 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: 'white' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#003756', opacity: 0.6 }}>
                  Where We Start
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Top 10 to start with
                </h2>
                <p className="text-base max-w-3xl mx-auto" style={{ color: '#003756', opacity: 0.7 }}>
                  Best ratio of warm + responsive + mid-market. Full top 30 in appendix.
                </p>
              </div>

              <div className="max-w-5xl mx-auto rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(0,55,86,0.1)' }}>
                <div className="grid grid-cols-12 px-6 py-3 text-xs font-semibold uppercase tracking-wider" style={{ backgroundColor: '#003756', color: 'white' }}>
                  <div className="col-span-1">#</div>
                  <div className="col-span-4">Firm</div>
                  <div className="col-span-3">NYC Presence</div>
                  <div className="col-span-4">Why</div>
                </div>
                {[
                  { rank: 1, firm: 'NFP (Aon-owned)', loc: '340 Madison NYC HQ', why: 'NYC-HQ, mid-market, PeopleFirst wellness brand' },
                  { rank: 2, firm: 'OneDigital', loc: 'NYC + NJ offices', why: 'Wellness-forward by design, 85K clients' },
                  { rank: 3, firm: 'Sequoia Consulting', loc: 'SF HQ, NYC office', why: 'Tech ICP overlap — Stripe, Airbnb, Brex clients' },
                  { rank: 4, firm: 'Newfront', loc: 'SF HQ, NYC', why: 'AI-enabled, tech-friendly, modern broker' },
                  { rank: 5, firm: 'Corporate Synergies', loc: 'Mt. Laurel NJ', why: 'NJ-native, strong wellness focus, mid-market' },
                  { rank: 6, firm: 'Holmes Murphy', loc: 'Des Moines + NYC', why: 'Wellness-strong culture' },
                  { rank: 7, firm: 'EPIC Insurance Brokers', loc: 'Madison Ave (ex-Frenkel)', why: 'Explicit Wellbeing & Health Mgmt practice' },
                  { rank: 8, firm: 'USI Insurance Services', loc: 'Valhalla NY HQ', why: 'NY-HQ, mid-market book' },
                  { rank: 9, firm: 'Risk Strategies', loc: 'NYC office', why: 'Growing through acquisition' },
                  { rank: 10, firm: 'Alliant', loc: '1301 6th Ave', why: 'Growing fast in NYC, tech/media book' },
                ].map((f, idx) => (
                  <div key={idx} className="grid grid-cols-12 px-6 py-3 text-sm items-center" style={{ backgroundColor: idx % 2 ? '#F8F9FA' : 'white', borderTop: '1px solid rgba(0,55,86,0.05)' }}>
                    <div className="col-span-1 font-semibold" style={{ color: '#018EA2' }}>{f.rank}</div>
                    <div className="col-span-4 font-medium" style={{ color: '#003756' }}>{f.firm}</div>
                    <div className="col-span-3 text-xs" style={{ color: '#003756', opacity: 0.7 }}>{f.loc}</div>
                    <div className="col-span-4 text-xs" style={{ color: '#003756', opacity: 0.7 }}>{f.why}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 7: ROLE HIERARCHY ==================== */}
        {currentSlide === 6 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: '#F8F9FA' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#003756', opacity: 0.6 }}>
                  Who to Email
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Roles ranked by influence
                </h2>
              </div>

              <div className="max-w-5xl mx-auto rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(0,55,86,0.1)' }}>
                <div className="grid grid-cols-12 px-6 py-3 text-xs font-semibold uppercase tracking-wider" style={{ backgroundColor: '#003756', color: 'white' }}>
                  <div className="col-span-1">#</div>
                  <div className="col-span-4">Title</div>
                  <div className="col-span-5">Why they matter</div>
                  <div className="col-span-2">Channel</div>
                </div>
                {[
                  { rank: 1, title: 'Wellness/Wellbeing Consultant', why: 'Their literal job is sourcing vendors like us', ch: 'LinkedIn + email' },
                  { rank: 2, title: 'H&W Practice Leader', why: 'Sets vendor strategy for the whole practice', ch: 'LinkedIn + intro' },
                  { rank: 3, title: 'VP Employee Benefits', why: 'Decision-maker, P&L owner', ch: 'LinkedIn + warm intro' },
                  { rank: 4, title: 'Senior Producer / Partner', why: 'Owns client book, makes referrals stick', ch: 'LinkedIn DM + conf' },
                  { rank: 5, title: 'Senior Account Executive', why: 'Day-to-day client owner, drives renewal recs', ch: 'LinkedIn + email' },
                  { rank: 6, title: 'Strategic Wellness Advisor', why: 'Premium framing at Gallagher etc.', ch: 'LinkedIn' },
                  { rank: 7, title: 'Population Health Lead', why: 'Clinical/data lens, slower cycle', ch: 'Case studies' },
                  { rank: 8, title: 'Account Manager', why: 'Junior gatekeeper — gets us on shortlists', ch: 'Email only' },
                ].map((r, idx) => (
                  <div key={idx} className="grid grid-cols-12 px-6 py-3 text-sm items-center" style={{ backgroundColor: idx % 2 ? '#F8F9FA' : 'white', borderTop: '1px solid rgba(0,55,86,0.05)' }}>
                    <div className="col-span-1 font-semibold" style={{ color: '#018EA2' }}>{r.rank}</div>
                    <div className="col-span-4 font-medium" style={{ color: '#003756' }}>{r.title}</div>
                    <div className="col-span-5 text-xs" style={{ color: '#003756', opacity: 0.7 }}>{r.why}</div>
                    <div className="col-span-2 text-xs" style={{ color: '#003756', opacity: 0.6 }}>{r.ch}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 8: CARRIER HEC ==================== */}
        {currentSlide === 7 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: 'white' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#FF5050' }}>
                  The Stealth Track
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Carrier wellness consultants
                </h2>
                <p className="text-base max-w-3xl mx-auto" style={{ color: '#003756', opacity: 0.7 }}>
                  They manage the wellness fund. They recommend vendors. <strong>Nobody is prospecting them.</strong>
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-8">
                {[
                  { carrier: 'Cigna', title: 'Health Engagement Consultant', count: '~50 in NYC tri-state', note: 'Bundled free 51-2,999 EE accounts. Manages HIF allocation.' },
                  { carrier: 'Aetna', title: 'Designated Consultant', count: '~30 in NYC tri-state', note: 'Sits at Enhanced/Premier tier. Manages Wellness Allowance.' },
                  { carrier: 'Anthem', title: 'Wellness Consultant', count: '~25 in NYC', note: 'Routes Wellness Fund requests to Underwriting.' },
                ].map((c, idx) => (
                  <div key={idx} className="rounded-3xl p-6" style={{ backgroundColor: '#E0F2F7' }}>
                    <p className="text-xs uppercase font-semibold mb-2" style={{ color: '#018EA2' }}>{c.carrier}</p>
                    <h3 className="text-lg font-semibold mb-2" style={{ color: '#003756' }}>{c.title}</h3>
                    <p className="text-xs font-medium mb-3" style={{ color: '#003756' }}>{c.count}</p>
                    <p className="text-xs leading-relaxed" style={{ color: '#003756', opacity: 0.7 }}>{c.note}</p>
                  </div>
                ))}
              </div>

              <div className="max-w-3xl mx-auto p-6 rounded-2xl" style={{ backgroundColor: '#F8F9FA', border: '1px solid rgba(0,55,86,0.1)' }}>
                <p className="text-sm font-semibold mb-2" style={{ color: '#003756' }}>The Pitch:</p>
                <p className="text-sm italic" style={{ color: '#003756', opacity: 0.8 }}>
                  "Hi [Name] — I want to be on your approved vendor list for clients deploying wellness fund dollars on onsite experiences. Burberry recently used their Aetna Wellness Allowance for our chair massage program. Worth a 12-min Loom?"
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 9: BROKER MONEY ==================== */}
        {currentSlide === 8 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: '#F8F9FA' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#003756', opacity: 0.6 }}>
                  Understand the Incentive
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  How brokers make money
                </h2>
              </div>

              <div className="max-w-4xl mx-auto space-y-3">
                {[
                  { rank: 1, source: 'Carrier commissions', detail: '2-10% of premium PEPM — biggest source', impact: 'Drives carrier loyalty' },
                  { rank: 2, source: 'Override/contingent comms', detail: 'Bonuses for hitting volume tiers with carrier', impact: 'Same — carrier favor' },
                  { rank: 3, source: 'Service/consulting fees', detail: 'Flat client fees (rising post-CAA)', impact: 'Transparency-friendly' },
                  { rank: 4, source: 'Vendor referral fees', detail: 'Legal but disclosable under CAA. Tier 1 often have no-take policies. Tier 2/3 flexible.', impact: 'Our lever (carefully)' },
                  { rank: 5, source: 'Bundled wellness platforms', detail: 'Gallagher Better Works, OneDigital Wellbeing — broker monetizes wellness directly', impact: 'Potential conflict' },
                ].map((row, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-4 p-4 rounded-2xl items-center" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                    <div className="col-span-1 text-center font-bold text-xl" style={{ color: '#018EA2' }}>#{row.rank}</div>
                    <div className="col-span-3 font-semibold text-sm" style={{ color: '#003756' }}>{row.source}</div>
                    <div className="col-span-6 text-xs" style={{ color: '#003756', opacity: 0.7 }}>{row.detail}</div>
                    <div className="col-span-2 text-xs italic" style={{ color: '#FF5050' }}>{row.impact}</div>
                  </div>
                ))}
              </div>

              <div className="max-w-3xl mx-auto mt-8 p-6 rounded-2xl text-center" style={{ backgroundColor: '#E0F2F7' }}>
                <p className="text-sm font-medium" style={{ color: '#003756' }}>
                  We're <strong>allies, not competitors</strong> for 80% of brokers — we deliver in-person; their wellness platforms are digital.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 10: OUR WEDGE ==================== */}
        {currentSlide === 9 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: 'white' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#FF5050' }}>
                  The Unfair Advantage
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold mb-6" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Wellness fund deployment
                </h2>
                <p className="text-lg max-w-3xl mx-auto" style={{ color: '#003756', opacity: 0.7 }}>
                  Aetna/Cigna/Anthem funds exist. Brokers know. Few help clients use them. <strong>That gap is the pitch.</strong>
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-8">
                {[
                  { carrier: 'Cigna', fund: 'Health Improvement Fund', detail: 'Level Funded 51-2,999 EE. $1-5 PEPM. HEC manages. Use-it-or-lose-it.' },
                  { carrier: 'Aetna', fund: 'Wellness Allowance', detail: 'Well-Being Essentials Core/Enhanced/Premier. Self-funded gets most. Aetna pays vendor direct by check.' },
                  { carrier: 'Anthem', fund: 'Wellness Fund', detail: '100+ EE Large Group. 12-mo plan period. 30-day-before-end deadline. Massage explicitly recognized.' },
                ].map((c, idx) => (
                  <div key={idx} className="rounded-3xl p-6" style={{ backgroundColor: '#E0F2F7' }}>
                    <p className="text-xs uppercase font-semibold mb-2" style={{ color: '#018EA2' }}>{c.carrier}</p>
                    <h3 className="text-lg font-semibold mb-3" style={{ color: '#003756' }}>{c.fund}</h3>
                    <p className="text-xs leading-relaxed" style={{ color: '#003756', opacity: 0.8 }}>{c.detail}</p>
                  </div>
                ))}
              </div>

              <div className="max-w-3xl mx-auto p-6 rounded-2xl" style={{ backgroundColor: '#003756' }}>
                <p className="text-sm font-medium mb-2" style={{ color: '#9EFAFF' }}>Talk track:</p>
                <p className="text-base italic" style={{ color: 'white', lineHeight: '1.6' }}>
                  "We're the only vendor that hands you a turnkey kit for your client to deploy their Cigna/Aetna/Anthem wellness fund. Pre-drafted email, pre-formatted invoice, pre-filled W-9, positioning language. Your client gets a wellness event, you get a quick win at renewal."
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 11: VALUE PROPS ==================== */}
        {currentSlide === 10 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: '#F8F9FA' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#003756', opacity: 0.6 }}>
                  Pitch Language
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Four value props, ranked
                </h2>
              </div>

              <div className="max-w-4xl mx-auto space-y-3">
                {[
                  { rank: 1, prop: 'White-label / co-branded wellness offering for your book', best: 'Producer / Practice Leader', why: 'Strongest hook. Brokers fear commoditization. You give them differentiation.' },
                  { rank: 2, prop: 'Help deploy unused Cigna/Aetna/UHC wellness fund dollars before year-end', best: 'Any title, Q3/Q4 specific', why: 'Time-bound urgency. Brokers know funds exist; few help clients use them. Our differentiator.' },
                  { rank: 3, prop: 'Co-sell to your Q4 renewing clients — we do the lift', best: 'Senior Account Executive', why: 'AEs want low-effort value-adds. Renewal-conversation gold.' },
                  { rank: 4, prop: 'Case study: [Named broker-referred client]', best: 'Universal', why: 'Single highest-converting line — IF we have a real broker-referred client to name.' },
                ].map((row, idx) => (
                  <div key={idx} className="p-5 rounded-2xl" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                    <div className="flex items-start gap-4">
                      <div className="text-2xl font-bold flex-shrink-0" style={{ color: '#018EA2' }}>#{row.rank}</div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm mb-1" style={{ color: '#003756' }}>"{row.prop}"</p>
                        <p className="text-xs mb-2" style={{ color: '#FF5050' }}>Best for: {row.best}</p>
                        <p className="text-xs" style={{ color: '#003756', opacity: 0.7 }}>{row.why}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-center mt-8 text-sm italic" style={{ color: '#003756', opacity: 0.6 }}>
                What doesn't land: "Mental health crisis" framing · "ROI of wellness" decks · Emails over 150 words
              </p>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 12: ETHICS INTRO ==================== */}
        {currentSlide === 11 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: 'white' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#FF5050' }}>
                  Ethics
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold mb-6" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Revenue share — the right way
                </h2>
                <p className="text-lg max-w-3xl mx-auto" style={{ color: '#003756', opacity: 0.7 }}>
                  In a post-CAA, post-Schlichter world, careless rev share creates fiduciary risk for our partners. We build the program so brokers can recommend us <strong>without ever ending up in a deposition</strong>.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                <div className="rounded-3xl p-8" style={{ backgroundColor: '#FFE8E8', border: '2px solid #FF5050' }}>
                  <p className="text-xs uppercase font-semibold mb-3" style={{ color: '#FF5050' }}>What we never do</p>
                  <ul className="space-y-2 text-sm" style={{ color: '#003756' }}>
                    <li>✗ Tiered or contingent bonuses</li>
                    <li>✗ Volume overrides</li>
                    <li>✗ Renewal-tail commissions past Year 1</li>
                    <li>✗ Off-invoice or undocumented payments</li>
                    <li>✗ Different rates for different brokers</li>
                    <li>✗ "Earn passive income" marketing</li>
                  </ul>
                </div>
                <div className="rounded-3xl p-8" style={{ backgroundColor: '#E0F2F7', border: '2px solid #018EA2' }}>
                  <p className="text-xs uppercase font-semibold mb-3" style={{ color: '#018EA2' }}>What we always do</p>
                  <ul className="space-y-2 text-sm" style={{ color: '#003756' }}>
                    <li>✓ Three-option menu, broker elects</li>
                    <li>✓ Same rate to all brokers (no favored partners)</li>
                    <li>✓ Capped at 7% Year 1, no renewal tail</li>
                    <li>✓ Provide CAA disclosure template at signing</li>
                    <li>✓ Pass-through discount offered every time</li>
                    <li>✓ Quarterly Client Savings Statement to broker</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 13: REGULATORY ==================== */}
        {currentSlide === 12 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: '#F8F9FA' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#003756', opacity: 0.6 }}>
                  The Regulatory Reality
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  CAA + Schlichter changed the game
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                <div className="rounded-3xl p-8" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                  <p className="text-xs uppercase font-semibold mb-3" style={{ color: '#018EA2' }}>CAA Section 202(a)</p>
                  <p className="text-sm font-semibold mb-3" style={{ color: '#003756' }}>Effective Dec 27, 2021</p>
                  <p className="text-sm leading-relaxed" style={{ color: '#003756', opacity: 0.8 }}>
                    Brokers expecting <strong>$1,000+</strong> direct or indirect compensation tied to an ERISA group health plan must disclose in writing to the employer before contract or renewal. Indirect comp includes service fees, finder's fees, bonuses, awards — and <strong>vendor referral fees</strong>.
                  </p>
                  <p className="text-xs italic mt-3" style={{ color: '#FF5050' }}>
                    Note: Shortcut services are typically non-ERISA fringe benefits — but disciplined brokers disclose anyway.
                  </p>
                </div>

                <div className="rounded-3xl p-8" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                  <p className="text-xs uppercase font-semibold mb-3" style={{ color: '#FF5050' }}>Schlichter Lawsuits</p>
                  <p className="text-sm font-semibold mb-3" style={{ color: '#003756' }}>Dec 2025 - Feb 2026</p>
                  <p className="text-sm leading-relaxed" style={{ color: '#003756', opacity: 0.8 }}>
                    Schlichter Bogard & Denton filed against <strong>Gallagher, WTW, Mercer, Lockton</strong> + their employer clients. Theory: brokers as functional fiduciaries breach duty by accepting dual comp (from employer AND from vendors). Voluntary benefits suits in early 2026 extended this beyond medical plans.
                  </p>
                  <p className="text-xs italic mt-3" style={{ color: '#FF5050' }}>
                    Dual-compensation = the new litigation theory.
                  </p>
                </div>
              </div>

              <p className="text-center mt-8 text-sm" style={{ color: '#003756', opacity: 0.7 }}>
                <strong>The fiduciary doctrine is behavior-based, not contract-based.</strong> A broker who exercises discretion in vendor selection can be deemed a fiduciary even when the engagement letter disclaims it.
              </p>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 14: THREE OPTIONS ==================== */}
        {currentSlide === 13 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: 'white' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#FF5050' }}>
                  Our Offer
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold mb-4" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  The three-option menu
                </h2>
                <p className="text-base max-w-3xl mx-auto" style={{ color: '#003756', opacity: 0.7 }}>
                  Every broker partner elects ONE option in writing per deal. Documented in the partner agreement.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                <div className="rounded-3xl p-6" style={{ backgroundColor: '#E0F2F7', border: '3px solid #018EA2' }}>
                  <p className="text-xs uppercase font-semibold mb-2" style={{ color: '#018EA2' }}>Option A — Recommended</p>
                  <h3 className="text-2xl font-semibold mb-3" style={{ color: '#003756' }}>Client Pass-Through</h3>
                  <p className="text-sm mb-4" style={{ color: '#003756', opacity: 0.8 }}>
                    Broker elects <strong>0% commission</strong>. Client receives <strong>7% off list</strong>.
                  </p>
                  <p className="text-xs font-semibold mb-2" style={{ color: '#003756' }}>Broker gets:</p>
                  <ul className="space-y-1 text-xs mb-4" style={{ color: '#003756' }}>
                    <li>• Quarterly Client Savings Statement</li>
                    <li>• Renewal-conversation story</li>
                    <li>• Zero CAA disclosure burden</li>
                    <li>• Zero Schlichter exposure</li>
                  </ul>
                  <p className="text-xs italic" style={{ color: '#018EA2' }}>The cleanest, most defensible model.</p>
                </div>

                <div className="rounded-3xl p-6" style={{ backgroundColor: '#F8F9FA', border: '1px solid rgba(0,55,86,0.2)' }}>
                  <p className="text-xs uppercase font-semibold mb-2" style={{ color: '#003756', opacity: 0.6 }}>Option B</p>
                  <h3 className="text-2xl font-semibold mb-3" style={{ color: '#003756' }}>Co-Marketing</h3>
                  <p className="text-sm mb-4" style={{ color: '#003756', opacity: 0.8 }}>
                    Flat annual retainer <strong>$5K-$25K</strong> against documented co-marketing plan.
                  </p>
                  <p className="text-xs font-semibold mb-2" style={{ color: '#003756' }}>Deliverables:</p>
                  <ul className="space-y-1 text-xs mb-4" style={{ color: '#003756' }}>
                    <li>• Broker newsletter inclusion</li>
                    <li>• Webinar co-host</li>
                    <li>• Conference booth co-sponsorship</li>
                    <li>• Case study collaboration</li>
                  </ul>
                  <p className="text-xs italic" style={{ color: '#003756', opacity: 0.6 }}>Tied to deliverables, not deals.</p>
                </div>

                <div className="rounded-3xl p-6" style={{ backgroundColor: '#F8F9FA', border: '1px solid rgba(0,55,86,0.2)' }}>
                  <p className="text-xs uppercase font-semibold mb-2" style={{ color: '#003756', opacity: 0.6 }}>Option C</p>
                  <h3 className="text-2xl font-semibold mb-3" style={{ color: '#003756' }}>Disclosed Referral</h3>
                  <p className="text-sm mb-4" style={{ color: '#003756', opacity: 0.8 }}>
                    Flat <strong>7% of Year 1</strong> contract value. Single-tier. No escalation.
                  </p>
                  <p className="text-xs font-semibold mb-2" style={{ color: '#003756' }}>Broker responsibilities:</p>
                  <ul className="space-y-1 text-xs mb-4" style={{ color: '#003756' }}>
                    <li>• Disclose under CAA 202(a)</li>
                    <li>• Use Shortcut's fill-in template</li>
                    <li>• Paid 30d after client payment</li>
                    <li>• No renewal tail</li>
                  </ul>
                  <p className="text-xs italic" style={{ color: '#003756', opacity: 0.6 }}>Transparent and capped.</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 15: WHY PASSTHROUGH ==================== */}
        {currentSlide === 14 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: '#F8F9FA' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#018EA2' }}>
                  Why Pass-Through Wins
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Defensibility &gt; commission
                </h2>
              </div>

              <div className="max-w-4xl mx-auto space-y-4">
                {[
                  { num: 1, title: 'Removes the Schlichter theory entirely', detail: 'No dual compensation = no fiduciary conflict to litigate. Broker can stand up in a deposition and say "I took zero from the vendor."' },
                  { num: 2, title: 'Proves alignment to skeptical employers', detail: '"I chose to lower your cost rather than take the commission" — this is the line that wins renewals at Schlichter-aware clients.' },
                  { num: 3, title: 'Even when broker takes commission, the existence of the alternative matters', detail: 'Evidence that the arrangement is arm\'s-length and not a kickback. Strengthens the partner agreement.' },
                  { num: 4, title: 'Cleaner CAA disclosure when commission IS elected', detail: 'Disclosure reads "$X flat referral fee, alternative was $X off your invoice" — fully transparent to the employer.' },
                ].map((p, idx) => (
                  <div key={idx} className="p-6 rounded-2xl flex items-start gap-4" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                    <div className="text-3xl font-bold flex-shrink-0" style={{ color: '#018EA2' }}>{p.num}</div>
                    <div>
                      <p className="font-semibold mb-1" style={{ color: '#003756' }}>{p.title}</p>
                      <p className="text-sm" style={{ color: '#003756', opacity: 0.7 }}>{p.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="max-w-3xl mx-auto mt-8 p-6 rounded-2xl text-center" style={{ backgroundColor: '#003756' }}>
                <p className="text-base font-medium italic" style={{ color: 'white' }}>
                  "Most of our partners pick pass-through" — sets a social proof anchor that nudges brokers toward the cleanest model.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 16: DISCLOSURE LANGUAGE ==================== */}
        {currentSlide === 15 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: 'white' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#003756', opacity: 0.6 }}>
                  Exact Language
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  What we put in writing
                </h2>
              </div>

              <div className="max-w-4xl mx-auto space-y-6">
                <div className="p-6 rounded-2xl" style={{ backgroundColor: '#F8F9FA', border: '1px solid rgba(0,55,86,0.1)' }}>
                  <p className="text-xs uppercase font-semibold mb-2" style={{ color: '#018EA2' }}>Partner Agreement Disclosure Clause</p>
                  <p className="text-sm italic leading-relaxed" style={{ color: '#003756' }}>
                    "Broker acknowledges that any compensation received from Shortcut in connection with services to an ERISA-covered group health plan, or where Broker reasonably believes such disclosure obligation may apply, must be disclosed in writing to the plan fiduciary under CAA Section 202(a) prior to contract, renewal, or extension. Shortcut will provide Broker with a CAA-compliant disclosure statement on request. Broker is solely responsible for determining the applicability of disclosure obligations to each client engagement."
                  </p>
                </div>

                <div className="p-6 rounded-2xl" style={{ backgroundColor: '#E0F2F7', border: '1px solid #018EA2' }}>
                  <p className="text-xs uppercase font-semibold mb-2" style={{ color: '#018EA2' }}>50-Word Email Script (When Rev Share Comes Up)</p>
                  <p className="text-sm italic leading-relaxed" style={{ color: '#003756' }}>
                    "Quick note on our partnership model: we offer three options — client pass-through discount, documented co-marketing, or a disclosed 7% Year-1 referral fee. If you elect the referral fee and your client has an ERISA plan you advise, CAA 202(a) disclosure applies — happy to share our template. <strong>Most partners pick pass-through.</strong>"
                  </p>
                </div>

                <div className="p-6 rounded-2xl" style={{ backgroundColor: '#FFE8E8', border: '1px solid #FF5050' }}>
                  <p className="text-xs uppercase font-semibold mb-2" style={{ color: '#FF5050' }}>Rules on When to Mention Rev Share</p>
                  <ul className="space-y-2 text-sm" style={{ color: '#003756' }}>
                    <li><strong>Never</strong> in the opening email or first call</li>
                    <li><strong>Only</strong> after broker has expressed interest or asked</li>
                    <li><strong>Lead</strong> with value-to-client, monetization second</li>
                    <li><strong>Never</strong> imply rev share is THE reason to recommend us</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 17: COLD EMAIL CADENCE ==================== */}
        {currentSlide === 16 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: '#F8F9FA' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#003756', opacity: 0.6 }}>
                  The Outreach
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  7 touches over 21 days
                </h2>
              </div>

              <div className="max-w-5xl mx-auto space-y-2">
                {[
                  { t: 'T1', d: 'Day 0 — Tue 9-10am ET', ch: 'Email', what: 'Short. Specific. 1-sentence ask. Reference their client.' },
                  { t: 'T2', d: 'Day 3 — Fri AM', ch: 'Email', what: 'Soft bump with one proof point (Burberry / Aetna)' },
                  { t: 'T3', d: 'Day 5 — Wed AM', ch: 'LinkedIn', what: 'Connect request, no message' },
                  { t: 'T4', d: 'Day 7', ch: 'Email', what: 'Case study link (named client + outcome)' },
                  { t: 'T5', d: 'Day 10', ch: 'LinkedIn DM', what: '2 sentences. Cite something they posted.' },
                  { t: 'T6', d: 'Day 14', ch: 'Email + Loom', what: 'Pattern interrupt — 90-sec video or 1-line "still interested?"' },
                  { t: 'T7', d: 'Day 21', ch: 'Email', what: 'Breakup. "Closing your file." Often best reply rate.' },
                ].map((step, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-4 items-center p-4 rounded-2xl" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                    <div className="col-span-1 text-center font-bold text-2xl" style={{ color: '#018EA2' }}>{step.t}</div>
                    <div className="col-span-3 text-xs font-medium" style={{ color: '#003756' }}>{step.d}</div>
                    <div className="col-span-2 text-xs uppercase font-semibold" style={{ color: '#FF5050' }}>{step.ch}</div>
                    <div className="col-span-6 text-sm" style={{ color: '#003756', opacity: 0.8 }}>{step.what}</div>
                  </div>
                ))}
              </div>

              <div className="max-w-3xl mx-auto mt-8 grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl" style={{ backgroundColor: '#E0F2F7' }}>
                  <p className="text-xs uppercase font-semibold mb-1" style={{ color: '#018EA2' }}>Best send times</p>
                  <p className="text-sm" style={{ color: '#003756' }}>Tue 9-10am ET · Thu 7-8am ET<br /><span className="text-xs opacity-60">Pre-client-call windows</span></p>
                </div>
                <div className="p-4 rounded-2xl" style={{ backgroundColor: '#FFE8E8' }}>
                  <p className="text-xs uppercase font-semibold mb-1" style={{ color: '#FF5050' }}>Avoid</p>
                  <p className="text-sm" style={{ color: '#003756' }}>Monday AM (full inbox)<br />Friday PM (mentally checked out)</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 18: SUBJECT LINES + OPENERS ==================== */}
        {currentSlide === 17 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: 'white' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#003756', opacity: 0.6 }}>
                  Mechanics
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Subject lines + openers
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                <div className="rounded-3xl p-6" style={{ backgroundColor: '#E0F2F7' }}>
                  <p className="text-xs uppercase font-semibold mb-3" style={{ color: '#018EA2' }}>Subjects that work</p>
                  <ul className="space-y-3 text-sm" style={{ color: '#003756' }}>
                    <li className="p-3 rounded-xl" style={{ backgroundColor: 'white' }}>
                      <span className="font-mono">Quick question — [Client] renewal</span>
                    </li>
                    <li className="p-3 rounded-xl" style={{ backgroundColor: 'white' }}>
                      <span className="font-mono">[Broker] — chair massage at [Client]</span>
                    </li>
                    <li className="p-3 rounded-xl" style={{ backgroundColor: 'white' }}>
                      <span className="font-mono">Cigna wellness fund — your Q4 renewals</span>
                    </li>
                    <li className="p-3 rounded-xl" style={{ backgroundColor: 'white' }}>
                      <span className="font-mono">Re: your HBLC panel</span>
                    </li>
                  </ul>
                  <p className="text-xs italic mt-4" style={{ color: '#018EA2' }}>
                    2-4 words = ~46% open rate. Personalized = +11pts.
                  </p>
                </div>

                <div className="rounded-3xl p-6" style={{ backgroundColor: '#FFE8E8' }}>
                  <p className="text-xs uppercase font-semibold mb-3" style={{ color: '#FF5050' }}>Subjects that don't</p>
                  <ul className="space-y-3 text-sm" style={{ color: '#003756' }}>
                    <li className="p-3 rounded-xl" style={{ backgroundColor: 'white', opacity: 0.6 }}>
                      <span className="font-mono line-through">Improve employee wellness ROI</span>
                    </li>
                    <li className="p-3 rounded-xl" style={{ backgroundColor: 'white', opacity: 0.6 }}>
                      <span className="font-mono line-through">Partnership Opportunity</span>
                    </li>
                    <li className="p-3 rounded-xl" style={{ backgroundColor: 'white', opacity: 0.6 }}>
                      <span className="font-mono line-through">Wellness solutions for your book</span>
                    </li>
                    <li className="p-3 rounded-xl" style={{ backgroundColor: 'white', opacity: 0.6 }}>
                      <span className="font-mono line-through">Mental health crisis at work</span>
                    </li>
                  </ul>
                  <p className="text-xs italic mt-4" style={{ color: '#FF5050' }}>
                    "Wellness" alone = vendor-spam pattern. Generic = ignored.
                  </p>
                </div>
              </div>

              <div className="max-w-4xl mx-auto mt-8 p-6 rounded-2xl" style={{ backgroundColor: '#F8F9FA' }}>
                <p className="text-xs uppercase font-semibold mb-2" style={{ color: '#003756', opacity: 0.6 }}>Opener rule</p>
                <p className="text-sm" style={{ color: '#003756' }}>
                  Show research into their <strong>book of business</strong>, not just their LinkedIn. Reference a specific client of theirs (case studies on their site, BenefitsPro coverage, BrokerTech awards) or a recent panel/podcast/post. <strong>One strong personalized line beats three generic.</strong>
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 19: WHAT WORKS ==================== */}
        {currentSlide === 18 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: '#F8F9FA' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#003756', opacity: 0.6 }}>
                  Email Body
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Body length + CTA
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                <div className="rounded-3xl p-8" style={{ backgroundColor: 'white', border: '2px solid #018EA2' }}>
                  <p className="text-xs uppercase font-semibold mb-3" style={{ color: '#018EA2' }}>What works</p>
                  <ul className="space-y-3 text-sm" style={{ color: '#003756' }}>
                    <li><strong>Length:</strong> 50-90 words. Under 90 always beats over 150.</li>
                    <li><strong>CTA:</strong> "Worth a 12-min Loom?" beats "Worth a 30-min demo?"</li>
                    <li><strong>CTA:</strong> "Want me to send the [Client] case study?" 2x better than meeting ask.</li>
                    <li><strong>Personalization:</strong> 1 strong named-client line.</li>
                    <li><strong>Proof:</strong> Burberry → Aetna check is our best line.</li>
                  </ul>
                </div>

                <div className="rounded-3xl p-8" style={{ backgroundColor: 'white', border: '2px solid #FF5050' }}>
                  <p className="text-xs uppercase font-semibold mb-3" style={{ color: '#FF5050' }}>What doesn't</p>
                  <ul className="space-y-3 text-sm" style={{ color: '#003756' }}>
                    <li><strong>"Mental health crisis"</strong> framing — too generic, brokers saturated.</li>
                    <li><strong>"ROI of wellness" decks</strong> — they've seen 100 of these.</li>
                    <li><strong>Long emails</strong> — under 90 words always wins.</li>
                    <li><strong>"30-min demo"</strong> — too much ask for cold.</li>
                    <li><strong>"Earn passive income"</strong> language — sleazy, blocks fiduciary brokers.</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 20: APOLLO TOOLKIT ==================== */}
        {currentSlide === 19 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: 'white' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#018EA2' }}>
                  Tooling — Already Built
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Apollo at .openclaw
                </h2>
              </div>

              <div className="max-w-4xl mx-auto p-6 rounded-2xl mb-6" style={{ backgroundColor: '#003756' }}>
                <p className="text-xs uppercase font-semibold mb-2" style={{ color: '#9EFAFF' }}>Location</p>
                <p className="font-mono text-sm" style={{ color: 'white' }}>/Users/willnewton/.openclaw/workspace/</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 max-w-5xl mx-auto mb-6">
                {[
                  { script: 'count_apollo_leads.js', purpose: 'Estimate scope (free)' },
                  { script: 'enrich_companies_by_domain.js', purpose: '1 credit / domain match' },
                  { script: 'enrich_people_by_match.js', purpose: '1 credit / email lookup' },
                  { script: 'reference/apollo-lead-search-guide.md', purpose: 'Full API guide (750 lines)' },
                ].map((s, idx) => (
                  <div key={idx} className="p-4 rounded-2xl" style={{ backgroundColor: '#F8F9FA' }}>
                    <p className="font-mono text-xs font-semibold mb-1" style={{ color: '#003756' }}>{s.script}</p>
                    <p className="text-xs" style={{ color: '#018EA2' }}>{s.purpose}</p>
                  </div>
                ))}
              </div>

              <div className="max-w-4xl mx-auto p-6 rounded-2xl" style={{ backgroundColor: '#FFE8E8' }}>
                <p className="text-xs uppercase font-semibold mb-3" style={{ color: '#FF5050' }}>Critical API Gotcha</p>
                <p className="text-sm leading-relaxed" style={{ color: '#003756' }}>
                  Default Apollo search uses fuzzy title matching → returns ~19% accurate. <strong>Set <span className="font-mono">include_similar_titles: false</span></strong> for 100% accuracy. Also: combining multiple employee ranges returns MIN, not union — search each range separately and dedupe.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 21: APOLLO FILTERS ==================== */}
        {currentSlide === 20 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: '#F8F9FA' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#003756', opacity: 0.6 }}>
                  Apollo Search
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  The filter recipe
                </h2>
              </div>

              <div className="max-w-5xl mx-auto space-y-4">
                <div className="p-5 rounded-2xl" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                  <p className="text-xs uppercase font-semibold mb-2" style={{ color: '#018EA2' }}>Firm-level (OR logic)</p>
                  <p className="text-sm font-mono" style={{ color: '#003756' }}>Industries: Insurance + Employee Benefits + Health Wellness Fitness + HR Services + Mgmt Consulting</p>
                  <p className="text-sm font-mono mt-1" style={{ color: '#FF5050' }}>Exclude: P&C + Auto + Captive</p>
                  <p className="text-sm font-mono mt-1" style={{ color: '#003756' }}>Employees: 100-1,000 (Tier B) or 1,000+ (Tier A)</p>
                  <p className="text-sm font-mono mt-1" style={{ color: '#003756' }}>Location: NY · NJ · CT (HQ or office)</p>
                </div>

                <div className="p-5 rounded-2xl" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                  <p className="text-xs uppercase font-semibold mb-2" style={{ color: '#018EA2' }}>Person-level title string (paste this into Apollo)</p>
                  <p className="text-xs font-mono leading-relaxed" style={{ color: '#003756' }}>
                    Wellbeing Consultant, Wellness Consultant, Wellbeing Strategist, Health and Welfare Practice Leader, VP Employee Benefits, VP Benefits, Senior Producer, Benefits Producer, Senior Account Executive, Employee Benefits Account Executive, Voluntary Benefits Director, Wellbeing Lead, Wellness Practice Lead, Director of Wellbeing
                  </p>
                </div>

                <div className="p-5 rounded-2xl" style={{ backgroundColor: '#FFE8E8', border: '1px solid #FF5050' }}>
                  <p className="text-xs uppercase font-semibold mb-2" style={{ color: '#FF5050' }}>Carrier HEC track (separate search)</p>
                  <p className="text-sm font-mono" style={{ color: '#003756' }}>Company: Cigna · Aetna · Anthem · Elevance</p>
                  <p className="text-sm font-mono mt-1" style={{ color: '#003756' }}>Title: Health Engagement Consultant OR Designated Consultant OR Health & Wellness Consultant OR Wellness Account Manager</p>
                  <p className="text-sm font-mono mt-1" style={{ color: '#003756' }}>Location: NY · NJ · CT</p>
                </div>
              </div>

              <p className="text-center mt-6 text-sm" style={{ color: '#003756', opacity: 0.7 }}>
                Expected output: <strong>800-1,500 raw contacts</strong> → verified-email layer → ~500 → manual Tier A scoring → <strong>top 80 contacts</strong>
              </p>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 22: ADJACENT CHANNELS ==================== */}
        {currentSlide === 21 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: 'white' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#003756', opacity: 0.6 }}>
                  Beyond Brokers
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Top 5 adjacent channels
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-4 max-w-5xl mx-auto">
                {[
                  { rank: 1, ch: 'Wellness Marketplaces', who: 'Wellable + Wellhub', why: 'Direct listings, distribution to thousands of HR buyers, free or pay-per-visit', start: 'This month' },
                  { rank: 2, ch: 'EAP Partners', who: 'Spring Health (not Lyra — they compete)', why: 'Explicit channel program, mental-health adjacency = mindfulness fit', start: 'Q1' },
                  { rank: 3, ch: 'Class-A Building Amenities', who: 'SL Green · RXR · Brookfield · Tishman Speyer · Industrious (CBRE)', why: 'Proven at 195 Nassau. Recurring per-building revenue.', start: 'Now' },
                  { rank: 4, ch: 'Captive Insurance Cooperatives', who: 'ParetoHealth (1,800 employers)', why: 'Sophisticated mid-market buyers, one approval = many-employer access', start: 'Q2' },
                  { rank: 5, ch: 'CHRO Dinners', who: 'Evanta CHRO Executive Summits, Chief', why: '$25-50K sponsorship buys ~30 CHROs in one room. Beats booths.', start: 'Q2' },
                ].map((c, idx) => (
                  <div key={idx} className="p-5 rounded-2xl" style={{ backgroundColor: '#F8F9FA', border: '1px solid rgba(0,55,86,0.1)' }}>
                    <div className="flex items-start gap-3 mb-2">
                      <span className="text-2xl font-bold" style={{ color: '#018EA2' }}>#{c.rank}</span>
                      <div className="flex-1">
                        <p className="font-semibold text-sm" style={{ color: '#003756' }}>{c.ch}</p>
                        <p className="text-xs" style={{ color: '#018EA2' }}>{c.who}</p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#003756', color: 'white' }}>{c.start}</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: '#003756', opacity: 0.7 }}>{c.why}</p>
                  </div>
                ))}
              </div>

              <p className="text-center mt-6 text-sm italic" style={{ color: '#003756', opacity: 0.6 }}>
                Skip: TPAs (wrong product fit) · PEOs (wrong customer size) · Awardco/Fringe points (model mismatch)
              </p>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 23: CONFERENCES ==================== */}
        {currentSlide === 22 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: '#F8F9FA' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#003756', opacity: 0.6 }}>
                  In-Person
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Conference strategy
                </h2>
              </div>

              <div className="max-w-5xl mx-auto rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(0,55,86,0.1)' }}>
                <div className="grid grid-cols-12 px-6 py-3 text-xs font-semibold uppercase tracking-wider" style={{ backgroundColor: '#003756', color: 'white' }}>
                  <div className="col-span-3">Event</div>
                  <div className="col-span-2">When</div>
                  <div className="col-span-3">Who</div>
                  <div className="col-span-4">ROI Play</div>
                </div>
                {[
                  { event: 'NABIP State Chapters (NY/NJ/IL)', when: 'Year-round', who: 'Local brokers', roi: '$2-8K sponsorships — start here, year 1', highlight: true },
                  { event: 'BenefitsPRO Broker Expo', when: 'Apr 28-30, 2026 Chicago', who: '150+ exhibitors, broker-focused', roi: 'Year 2, after references built' },
                  { event: 'HBLC (Health & Benefits Leadership)', when: 'Annual, Las Vegas', who: 'HR + brokers mix', roi: 'Good dual-track pitch' },
                  { event: 'NABIP Annual', when: 'Jun 27-30, 2026 Atlantic City', who: '800+ pros, 70+ exhibitors', roi: 'Smaller floor = quality time' },
                  { event: 'HERO Forum', when: 'Sept', who: 'Clinical/wellness depth', roi: 'Credibility, not pipeline' },
                  { event: 'Evanta CHRO Summits', when: 'Multiple cities', who: 'Invite-only CHRO dinners', roi: 'Best $/lead for direct enterprise', highlight: true },
                ].map((c, idx) => (
                  <div key={idx} className="grid grid-cols-12 px-6 py-3 text-sm items-center" style={{ backgroundColor: c.highlight ? '#E0F2F7' : (idx % 2 ? '#F8F9FA' : 'white'), borderTop: '1px solid rgba(0,55,86,0.05)' }}>
                    <div className="col-span-3 font-medium" style={{ color: '#003756' }}>{c.event}</div>
                    <div className="col-span-2 text-xs" style={{ color: '#003756', opacity: 0.7 }}>{c.when}</div>
                    <div className="col-span-3 text-xs" style={{ color: '#003756', opacity: 0.7 }}>{c.who}</div>
                    <div className="col-span-4 text-xs" style={{ color: c.highlight ? '#018EA2' : '#003756', fontWeight: c.highlight ? 600 : 400 }}>{c.roi}</div>
                  </div>
                ))}
              </div>

              <p className="text-center mt-6 text-sm" style={{ color: '#003756', opacity: 0.7 }}>
                <strong>Start with 3 NABIP state chapters in NY/NJ/IL.</strong> Save BPRO and HBLC for year 2 once we have referenceable broker partners.
              </p>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 24: 30-DAY PLAN ==================== */}
        {currentSlide === 23 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: 'white' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#FF5050' }}>
                  Execution
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  30-day plan
                </h2>
              </div>

              <div className="max-w-5xl mx-auto space-y-4">
                {[
                  { week: 'Week 1', label: 'Foundation', items: ['Build Apollo saved search (filter recipe) → ~800 contacts', 'Verify emails → ~500. Score Tier A → top 80', 'Pull HBLC 2026 + HERO 2025 speaker lists for warm angle', 'Build /for-brokers page (WellSteps + Compt model)', 'Decide: rev share offer policy (3-option menu confirmed)'] },
                  { week: 'Week 2', label: 'Pilot Launch', items: ['30 firms × 2 contacts = 60-contact pilot', '7-touch cadence over 21 days starts', 'A/B test: "wellness fund deployment" vs "white-label" subjects', 'Parallel: 20-contact Cigna/Aetna HEC track', 'List on Wellable + Wellhub marketplaces'] },
                  { week: 'Week 3-4', label: 'Measure + Iterate', items: ['Track reply rate by title, value prop, firm tier', 'Refine subject lines + openers based on early signal', 'Goal: land first broker-referred event = single biggest unlock for case study', 'Approach Spring Health for EAP content partnership', 'Sign first NABIP state chapter sponsorship'] },
                ].map((wk, idx) => (
                  <div key={idx} className="p-6 rounded-3xl" style={{ backgroundColor: '#F8F9FA', border: '1px solid rgba(0,55,86,0.1)' }}>
                    <div className="flex items-center gap-4 mb-3">
                      <span className="text-xs uppercase font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: '#003756', color: 'white' }}>{wk.week}</span>
                      <p className="font-semibold" style={{ color: '#003756' }}>{wk.label}</p>
                    </div>
                    <ul className="space-y-1 text-sm pl-2" style={{ color: '#003756', opacity: 0.8 }}>
                      {wk.items.map((item, i) => <li key={i}>• {item}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 25: OPEN DECISIONS ==================== */}
        {currentSlide === 24 && (
          <section className="min-h-screen flex items-center py-20" style={{ backgroundColor: '#F8F9FA' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#FF5050' }}>
                  Before We Launch
                </p>
                <h2 className="text-4xl md:text-6xl font-semibold" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Open decisions
                </h2>
              </div>

              <div className="max-w-4xl mx-auto space-y-4">
                {[
                  { q: 'Do we have any broker-referred clients today?', impact: 'Single biggest message unlock. If yes — name in T1 subject. If no — Burberry/Aetna is our anchor.' },
                  { q: 'Confirm: rev share offer policy', impact: 'Three-option menu (Pass-through / Co-marketing / 7% disclosed) — confirm before drafting partner agreement.' },
                  { q: 'Where does /for-brokers page live?', impact: 'getshortcut.co or proposals.getshortcut.co? Who builds it? Modeled on WellSteps + Compt.' },
                  { q: 'Founder-led outreach or hire Director of Broker Partnerships?', impact: 'Nivati VP of Partnerships JD is a public template if hiring.' },
                  { q: 'Apollo credit budget for the pilot?', impact: '60 contacts × 1 credit/enrichment = 60 credits minimum. Plus organization enrichment.' },
                ].map((d, idx) => (
                  <div key={idx} className="p-5 rounded-2xl" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                    <p className="font-semibold mb-1" style={{ color: '#003756' }}>{idx + 1}. {d.q}</p>
                    <p className="text-sm" style={{ color: '#003756', opacity: 0.7 }}>{d.impact}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 26: APPENDIX TOP 30 ==================== */}
        {currentSlide === 25 && (
          <section className="min-h-screen flex items-start py-20" style={{ backgroundColor: 'white' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-8">
                <p className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: '#003756', opacity: 0.6 }}>
                  Appendix
                </p>
                <h2 className="text-3xl md:text-5xl font-semibold" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Top 30 NYC tri-state targets
                </h2>
              </div>

              <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-3 text-xs">
                {[
                  '1. NFP (Aon-owned) — Madison Ave NYC HQ',
                  '2. OneDigital — NYC + NJ offices',
                  '3. Sequoia Consulting — NYC office',
                  '4. Newfront — NYC office',
                  '5. Corporate Synergies — Mt. Laurel NJ',
                  '6. Holmes Murphy — Des Moines + NYC',
                  '7. EPIC Insurance Brokers — Madison Ave',
                  '8. USI Insurance — Valhalla NY HQ',
                  '9. Risk Strategies — NYC office',
                  '10. Alliant — 1301 6th Ave',
                  '11. Marsh McLennan Agency (MMA)',
                  '12. Mercer — 1166 6th Ave',
                  '13. Aon — 199 Water St',
                  '14. WTW — 200 Liberty St',
                  '15. Gallagher — 2 WTC',
                  '16. HUB Northeast — 55 Water St',
                  '17. Lockton — 48th & Lex',
                  '18. AssuredPartners (now Gallagher)',
                  '19. Acrisure — office-by-office',
                  '20. Alera Group — regional federation',
                  '21. Savoy Associates — Florham Park NJ',
                  '22. The Hilb Group — NY/NJ',
                  '23. Cross Insurance — CT/NY corridor',
                  '24. Cowan Insurance — NJ + NY',
                  '25. Heffernan Insurance — NYC',
                  '26. IMA Financial — Denver + NYC',
                  '27. PSA Insurance — MD-NY corridor',
                  '28. Bolton & Company — boutique',
                  '29. AHT Insurance — boutique',
                  '30. Woodruff Sawyer — NYC',
                ].map((firm, idx) => (
                  <div key={idx} className="p-2 rounded-lg" style={{ backgroundColor: idx < 10 ? '#E0F2F7' : '#F8F9FA' }}>
                    <p style={{ color: '#003756' }}>{firm}</p>
                  </div>
                ))}
              </div>

              <p className="text-center mt-6 text-xs italic" style={{ color: '#003756', opacity: 0.6 }}>
                Highlighted = top 10 priority. Full target list with contacts in Apollo workspace after Week 1 enrichment.
              </p>
            </div>
          </section>
        )}

        {/* ==================== SLIDE 27: EMAIL TEMPLATES ==================== */}
        {currentSlide === 26 && (
          <section className="min-h-screen flex items-start py-20" style={{ backgroundColor: '#F8F9FA' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-8">
                <p className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: '#003756', opacity: 0.6 }}>
                  Appendix
                </p>
                <h2 className="text-3xl md:text-5xl font-semibold" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                  Cold email templates
                </h2>
              </div>

              <div className="max-w-4xl mx-auto space-y-4">
                <div className="p-5 rounded-2xl" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                  <p className="text-xs uppercase font-semibold mb-2" style={{ color: '#018EA2' }}>Template A — Wellness Consultant (Tier B/3 firm)</p>
                  <p className="text-xs font-mono mb-2" style={{ color: '#003756', opacity: 0.6 }}>Subject: Quick question — [Client Name] Q4</p>
                  <p className="text-sm leading-relaxed" style={{ color: '#003756' }}>
                    Hi [Name] — saw you ran the wellness review at [Client] last year. We just shipped chair massage at Burberry — paid through their Aetna Wellness Allowance, no invoice friction for the HR team. Would the same setup land with [Client] or [Other Client]? Happy to share the 1-pager.
                  </p>
                </div>

                <div className="p-5 rounded-2xl" style={{ backgroundColor: 'white', border: '1px solid rgba(0,55,86,0.1)' }}>
                  <p className="text-xs uppercase font-semibold mb-2" style={{ color: '#018EA2' }}>Template B — Senior Producer (Tier 2 firm)</p>
                  <p className="text-xs font-mono mb-2" style={{ color: '#003756', opacity: 0.6 }}>Subject: White-label wellness offering for your book?</p>
                  <p className="text-sm leading-relaxed" style={{ color: '#003756' }}>
                    Hi [Name] — onsite chair massage, headshots, mindfulness — the in-person engagement piece your digital platform doesn't cover. We co-brand for brokers, handle every logistic, and clients can deploy their Cigna/Aetna wellness fund to pay for it. Worth a 12-min Loom?
                  </p>
                </div>

                <div className="p-5 rounded-2xl" style={{ backgroundColor: '#FFE8E8', border: '1px solid #FF5050' }}>
                  <p className="text-xs uppercase font-semibold mb-2" style={{ color: '#FF5050' }}>Template C — Cigna Health Engagement Consultant (Carrier HEC track)</p>
                  <p className="text-xs font-mono mb-2" style={{ color: '#003756', opacity: 0.6 }}>Subject: Approved vendor for HIF clients</p>
                  <p className="text-sm leading-relaxed" style={{ color: '#003756' }}>
                    Hi [Name] — I want to be on your approved vendor list for clients deploying Health Improvement Fund dollars on onsite experiences. Burberry recently ran our chair massage through their Aetna Wellness Allowance — same playbook fits Cigna's HIF. Worth a 12-min walkthrough?
                  </p>
                </div>
              </div>

              <p className="text-center mt-6 text-xs italic" style={{ color: '#003756', opacity: 0.6 }}>
                All templates: 50-90 words · personalized opener · soft CTA · zero rev-share mention in T1
              </p>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
