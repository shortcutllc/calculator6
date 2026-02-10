import React, { useEffect, useState } from 'react';

const CLELandingPage: React.FC = () => {
  const [activePackage, setActivePackage] = useState<'cle' | 'wellness'>('wellness');
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            setTimeout(() => { (entry.target as HTMLElement).style.willChange = 'auto'; }, 600);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.cle-fade-in').forEach((el) => observer.observe(el));
    return () => document.querySelectorAll('.cle-fade-in').forEach((el) => observer.unobserve(el));
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const start = window.pageYOffset;
    const end = el.getBoundingClientRect().top + start - 72;
    const dist = end - start;
    let t0: number | null = null;
    const ease = (t: number) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t;
    const step = (now: number) => {
      if (!t0) t0 = now;
      const p = Math.min((now - t0) / 700, 1);
      window.scrollTo(0, start + dist * ease(p));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  /* shared check icon */
  const Check = () => (
    <div className="w-[18px] h-[18px] rounded-full bg-shortcut-teal/15 flex items-center justify-center flex-shrink-0">
      <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="#003756" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        .cle-fade-in{opacity:0;transform:translate3d(0,24px,0);transition:opacity .6s cubic-bezier(.25,.46,.45,.94),transform .6s cubic-bezier(.25,.46,.45,.94);will-change:transform,opacity}
        .cle-fade-in.is-visible{opacity:1;transform:translate3d(0,0,0)}
        @keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        .logo-track{display:flex;width:max-content;animation:marquee 28s linear infinite}
        .logo-track:hover{animation-play-state:paused}
        .logo-set{display:flex;align-items:center;gap:2.5rem}
        .logo-set img{height:1.75rem;width:7.5rem;flex-shrink:0;object-fit:contain;filter:brightness(0) invert(15%) sepia(60%) saturate(800%) hue-rotate(185deg) brightness(.45);opacity:.45;transition:opacity .3s}
        .logo-set img:hover{opacity:.75}
        .logo-set img[alt="Betterment"]{transform:scale(1.35)}
        .pkg-glow{box-shadow:0 0 0 2px #FEDC64,0 6px 20px rgba(0,0,0,.08)!important;transform:translateY(-2px)}
        .details-body{max-height:0;overflow:hidden;transition:max-height .5s cubic-bezier(.4,0,.2,1)}
        .details-body.open{max-height:4000px}
      `}</style>

      {/* ─── NAV ─── */}
      <header className="fixed top-0 z-50 w-full bg-white/95 backdrop-blur-sm border-b border-black/[.04]">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10 h-[60px] flex items-center justify-between">
          <a href="https://getshortcut.co" target="_blank" rel="noopener noreferrer">
            <img src="/shortcut-logo-blue.svg" alt="Shortcut" className="h-[22px] w-auto" />
          </a>
          <nav className="hidden md:flex items-center gap-1">
            {['Program','Facilitator','Packages'].map((label) => (
              <button key={label} onClick={() => scrollTo(label.toLowerCase())} className="px-3.5 py-1.5 text-[13px] font-semibold text-shortcut-blue/70 hover:text-shortcut-blue rounded-lg hover:bg-black/[.03] transition-all">
                {label}
              </button>
            ))}
          </nav>
          <button onClick={() => scrollTo('contact')} className="btn-primary !py-2 !px-5 !min-w-0 !text-[13px]">
            <span>Request a Date</span>
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════
          HERO  — soft lavender bg, 60/40 split
      ═══════════════════════════════════════════ */}
      <section className="pt-[60px]" style={{ background: 'linear-gradient(180deg, #EEEDF8 0%, #F5F4FA 100%)' }}>
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10 pt-14 md:pt-20 lg:pt-24 pb-16 lg:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">

            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 bg-white/60 px-3.5 py-1.5 rounded-full mb-5 border border-shortcut-blue/[.08]">
                <span className="w-1.5 h-1.5 rounded-full bg-shortcut-teal" />
                <span className="text-[11px] font-bold text-shortcut-blue tracking-wide uppercase">1.0 NY Ethics & Professionalism Credit</span>
              </div>

              <h1 className="text-[2.5rem] md:text-[3.25rem] lg:text-[3.75rem] font-extrabold text-shortcut-blue leading-[1.06] tracking-[-0.025em] mb-4">
                Your attorneys need ethics credits. Make one actually matter.
              </h1>

              <p className="text-[15px] lg:text-base font-medium text-[#3D4F5F] leading-[1.65] mb-7 max-w-[480px]">
                A one-hour accredited CLE that gives your team real tools for stress, judgment, and ethical clarity — not another checkbox.
              </p>

              <div className="flex items-center gap-3 mb-10 lg:mb-12">
                <button onClick={() => scrollTo('packages')} className="btn-primary !text-[13px]">
                  <span>View Packages</span>
                </button>
                <button onClick={() => scrollTo('program')} className="btn-secondary !text-[13px]">
                  Learn More
                </button>
              </div>

              {/* Stats — inline proof points beneath CTAs */}
              <div className="flex items-start gap-6 md:gap-8">
                {[
                  { num: '28%', label: 'of attorneys struggle\nwith depression' },
                  { num: '$6', label: 'returned for every\n$1 in wellness' },
                  { num: '$1M+', label: 'cost of losing one\nmid-level associate' },
                ].map((s,i) => (
                  <div key={i} className={`${i > 0 ? 'border-l border-shortcut-blue/[.08] pl-6 md:pl-8' : ''}`}>
                    <p className="text-2xl md:text-[1.75rem] font-extrabold text-shortcut-blue tracking-[-0.03em] leading-none">{s.num}</p>
                    <p className="text-[11px] md:text-[12px] font-medium text-[#5A6F7F] mt-1.5 leading-snug whitespace-pre-line">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 flex justify-center">
              <div className="w-[280px] md:w-[300px] lg:w-[320px] rounded-2xl overflow-hidden" style={{ boxShadow: '0 16px 40px rgba(0,55,86,.12)' }}>
                <video
                  src="/courtney-schulnick-corporate-mindfulness-shortcut.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-auto object-cover"
                  style={{ aspectRatio: '9/14' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Logo bar — tighter, inside hero */}
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10 pb-10">
          <p className="text-[11px] font-bold uppercase tracking-[.15em] text-shortcut-blue/25 text-center mb-5">Trusted by leading organizations</p>
          <div className="overflow-hidden">
            <div className="logo-track">
              {[0,1].map(s=>(
                <div key={s} className="logo-set" aria-hidden={s===1?true:undefined}>
                  {['White & Case','BCG','PwC','DraftKings','Viacom','Paramount'].map(n=>(
                    <img key={n} src={`/Holiday Proposal/Parnter Logos/${n}.svg`} alt={n} loading="lazy"/>
                  ))}
                  <img src="/Holiday Proposal/Parnter Logos/betterment-logo-vector-2023.svg" alt="Betterment" loading="lazy"/>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          PROGRAM — white bg, crisp text, 3 alternating modules
      ═══════════════════════════════════════════ */}
      <section id="program" className="py-20 lg:py-28 bg-white">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10">

          {/* Section header */}
          <div className="cle-fade-in text-center mb-16 lg:mb-24">
            <p className="text-[11px] font-bold uppercase tracking-[.15em] text-shortcut-blue/40 mb-4">The Program</p>
            <h2 className="text-3xl md:text-[2.5rem] lg:text-[2.75rem] font-extrabold text-shortcut-blue leading-[1.08] tracking-[-0.025em] max-w-xl mx-auto">
              One hour that changes how your team handles pressure
            </h2>
          </div>

          {/* Module 1 — image left, copy right: Mindfulness */}
          <div className="cle-fade-in grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center mb-20 lg:mb-28">
            <div className="rounded-2xl overflow-hidden" style={{ boxShadow: '0 16px 40px rgba(0,55,86,.08)' }}>
              <img src="/Mindfulness Slider.png" alt="Guided mindfulness session" className="w-full aspect-[4/3] object-cover" loading="lazy" />
            </div>
            <div>
              <h3 className="text-2xl md:text-[1.75rem] font-extrabold text-shortcut-blue leading-[1.15] tracking-[-0.02em] mb-3">
                Sharper judgment under stress
              </h3>
              <p className="text-[15px] font-medium text-[#3D4F5F] leading-[1.7] mb-6">
                Grounded in neuroscience and legal ethics, this session helps attorneys recognize when stress is driving their decisions — and gives them a reliable way to pause before reacting. Built for skeptics, not just the already-converted.
              </p>
              <div className="space-y-3">
                {[
                  'Repeatable PRO technique (Pause – Relax – Open)',
                  'Applies to depositions, negotiations, client calls',
                  'Backed by cognitive behavioral research',
                ].map((item,i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <Check />
                    <span className="text-[14px] font-medium text-[#3D4F5F]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Module 2 — copy left, image right: CLE Credit + NY Seal */}
          <div className="cle-fade-in grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center mb-20 lg:mb-28">
            <div className="order-2 lg:order-1">
              <h3 className="text-2xl md:text-[1.75rem] font-extrabold text-shortcut-blue leading-[1.15] tracking-[-0.02em] mb-3">
                CLE credit that actually counts
              </h3>
              <p className="text-[15px] font-medium text-[#3D4F5F] leading-[1.7] mb-6">
                Approved for 1.0 New York Ethics & Professionalism credit. Shortcut is the accredited provider — we handle material submission, attendance tracking, and credit reporting. Zero admin burden on your firm.
              </p>
              <div className="space-y-3">
                {[
                  'Material submission to the NY CLE Board',
                  'Attendance tracking for all participants',
                  'Credit reporting — your firm handles nothing',
                ].map((item,i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <Check />
                    <span className="text-[14px] font-medium text-[#3D4F5F]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="rounded-2xl overflow-hidden bg-[#F7F6F3] flex items-center justify-center" style={{ boxShadow: '0 16px 40px rgba(0,55,86,.08)' }}>
                <div className="aspect-[4/3] w-full flex items-center justify-center p-10 lg:p-14">
                  <img src="/ny-state-seal.png" alt="Seal of the State of New York" className="w-full max-w-[260px] lg:max-w-[300px] h-auto" loading="lazy" />
                </div>
              </div>
            </div>
          </div>

          {/* Module 3 — image left, copy right: Wellness Day */}
          <div className="cle-fade-in grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="rounded-2xl overflow-hidden" style={{ boxShadow: '0 16px 40px rgba(0,55,86,.08)' }}>
              <img src="/massage-guy-shortcut.jpg" alt="On-site chair massage" className="w-full aspect-[4/3] object-cover" loading="lazy" />
            </div>
            <div>
              <h3 className="text-2xl md:text-[1.75rem] font-extrabold text-shortcut-blue leading-[1.15] tracking-[-0.02em] mb-3">
                While you have their attention, make it a full day
              </h3>
              <p className="text-[15px] font-medium text-[#3D4F5F] leading-[1.7] mb-6">
                Pair the CLE with on-site chair massage. One vendor, one day, zero logistics on your end. Shortcut handles therapists, ambiance, and scheduling so your firm doesn't lift a finger.
              </p>
              <div className="space-y-3">
                {[
                  'Licensed, insured massage therapists',
                  'Spa ambiance — music, aromatherapy, lighting',
                  'Flexible scheduling before, during, or after CLE',
                  'Choose therapist gender preference',
                ].map((item,i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <Check />
                    <span className="text-[14px] font-medium text-[#3D4F5F]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          FACILITATOR  — dark section, Typeform-style
      ═══════════════════════════════════════════ */}
      <section id="facilitator" className="bg-shortcut-blue rounded-[20px] mx-3 lg:mx-6 my-3">
        <div className="cle-fade-in max-w-[1200px] mx-auto px-6 lg:px-10 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">

            <div className="flex justify-center lg:justify-start">
              <img
                src="/Holiday Proposal/Our Services/Mindfulness/Courtney Frame 2x.webp"
                alt="Courtney Schulnick"
                className="w-56 h-56 md:w-64 md:h-64 lg:w-[320px] lg:h-[400px] object-cover object-center rounded-2xl"
                style={{ boxShadow: '0 16px 40px rgba(0,0,0,.20)' }}
                loading="lazy"
              />
            </div>

            <div className="text-center lg:text-left">
              <p className="text-[11px] font-bold uppercase tracking-[.15em] text-white/30 mb-3">Your Facilitator</p>
              <h2 className="text-3xl md:text-[2.5rem] font-extrabold text-white leading-[1.08] tracking-[-0.025em] mb-4">
                Courtney Schulnick
              </h2>
              <p className="text-[14px] lg:text-[15px] font-medium text-white/65 leading-[1.7] mb-6">
                An attorney with two decades of experience, Courtney now leads mindfulness programs at Shortcut. With extensive training from the Myrna Brind Center for Mindfulness, she brings a unique perspective to corporate wellness — she's been in your attorneys' seats. Her sessions for Ballard Spahr, Cencora, The PA Bar Association and dozens of top firms are meticulously planned, start on time, and run to a timed 60-minute agenda.
              </p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-2">
                {['10+ Years','Corporate Specialist','CLE Certified'].map((tag,i) => (
                  <span key={i} className="bg-white/[.07] text-shortcut-service-yellow px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          PACKAGES
      ═══════════════════════════════════════════ */}
      <section id="packages" className="py-20 lg:py-28">
        <div className="cle-fade-in max-w-[1200px] mx-auto px-6 lg:px-10">

          <div className="text-center mb-10 lg:mb-14">
            <p className="text-[11px] font-bold uppercase tracking-[.15em] text-shortcut-blue/35 mb-4">Packages</p>
            <h2 className="text-3xl md:text-[2.5rem] lg:text-[2.75rem] font-extrabold text-shortcut-blue leading-[1.08] tracking-[-0.025em] mb-3">
              Choose what works for your firm
            </h2>
            <p className="text-[14px] font-medium text-[#3D4F5F] leading-[1.65] max-w-md mx-auto">
              Both include full accreditation, attendance tracking, and credit reporting. The only question is how much of an impact you want to make.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5 max-w-[820px] mx-auto">

            {/* CLE Only */}
            <div
              className={`bg-white border border-black/[.06] rounded-2xl p-7 lg:p-8 cursor-pointer transition-all duration-400 ${activePackage === 'cle' ? 'pkg-glow' : 'hover:border-black/[.12]'}`}
              onClick={() => setActivePackage('cle')}
            >
              <p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#5A6F7F] mb-3">CLE Session</p>
              <span className="text-[2.5rem] font-extrabold text-shortcut-blue tracking-[-0.03em] leading-none block">$3,000</span>
              <p className="text-[13px] font-medium text-[#5A6F7F] mt-1 mb-7">Flat rate — any team size</p>

              <div className="space-y-3 mb-7">
                {[
                  '60-minute accredited session',
                  '1.0 NY Ethics & Professionalism credit',
                  'Led by Courtney Schulnick',
                  'Full CLE Board administration',
                  'Attendance tracking & reporting',
                  'Custom audio recordings & handouts',
                  'Catered food & refreshments',
                ].map((item,i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <Check />
                    <span className="text-[13px] font-medium text-[#3D4F5F]">{item}</span>
                  </div>
                ))}
              </div>

              <button onClick={(e) => { e.stopPropagation(); scrollTo('contact'); }} className={activePackage === 'cle' ? 'btn-primary w-full !text-[13px]' : 'btn-secondary w-full !text-[13px]'}>
                <span>Request a Date</span>
              </button>
            </div>

            {/* CLE + Wellness */}
            <div
              className={`bg-white border border-black/[.06] rounded-2xl p-7 lg:p-8 cursor-pointer transition-all duration-400 relative ${activePackage === 'wellness' ? 'pkg-glow' : 'hover:border-black/[.12]'}`}
              onClick={() => setActivePackage('wellness')}
            >
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-shortcut-coral text-white px-3.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase">
                Recommended
              </div>

              <p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#5A6F7F] mb-3">CLE + Wellness Day</p>
              <span className="text-[2.5rem] font-extrabold text-shortcut-blue tracking-[-0.03em] leading-none block">$5,000</span>
              <p className="text-[13px] font-medium text-[#5A6F7F] mt-1 mb-7">Flat rate — CLE, massage & catering</p>

              <div className="space-y-3 mb-7">
                {[
                  { text: 'Everything in CLE Session', bold: true },
                  { text: 'On-site chair massage on CLE day' },
                  { text: 'Licensed, insured therapists' },
                  { text: 'Full spa ambiance setup' },
                  { text: 'Catered food & refreshments' },
                  { text: 'One vendor, one day, zero logistics' },
                ].map((item,i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <Check />
                    <span className="text-[13px] font-medium text-[#3D4F5F]">
                      {item.bold ? <strong className="text-shortcut-navy-blue font-bold">{item.text}</strong> : item.text}
                    </span>
                  </div>
                ))}
              </div>

              <button onClick={(e) => { e.stopPropagation(); scrollTo('contact'); }} className={activePackage === 'wellness' ? 'btn-primary w-full !text-[13px]' : 'btn-secondary w-full !text-[13px]'}>
                <span>Request a Date</span>
              </button>
            </div>
          </div>

          <p className="text-center text-[11px] font-medium text-shortcut-blue/30 mt-5 max-w-sm mx-auto">
            Both packages include catered food and refreshments for your team.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          DETAILS ACCORDION  — clean, readable
      ═══════════════════════════════════════════ */}
      <section className="pb-20 lg:pb-28">
        <div className="cle-fade-in max-w-[780px] mx-auto px-6 lg:px-10">

          <div className="text-center mb-10">
            <p className="text-[11px] font-bold uppercase tracking-[.15em] text-shortcut-blue/40 mb-4">Details</p>
            <h2 className="text-2xl md:text-[2rem] font-extrabold text-shortcut-blue leading-[1.1] tracking-[-0.02em]">
              Program schedule & accreditation
            </h2>
          </div>

          <div className="border border-black/[.06] rounded-2xl overflow-hidden">
            <button onClick={() => setDetailsOpen(!detailsOpen)} className="w-full text-left px-6 lg:px-8 py-5 flex items-center justify-between hover:bg-black/[.015] transition-colors">
              <span className="text-[15px] font-bold text-shortcut-blue">60-Minute Timed Agenda</span>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className={`transition-transform duration-300 flex-shrink-0 ml-4 ${detailsOpen ? 'rotate-180' : ''}`}>
                <path d="M5 8L10 13L15 8" stroke="#003756" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".4"/>
              </svg>
            </button>

            <div className={`details-body ${detailsOpen ? 'open' : ''}`}>
              <div className="px-6 lg:px-8 pb-8">
                <div className="border-t border-black/[.06] pt-6">

                  <div className="space-y-0 mb-10">
                    {[
                      ['0:00 – 4:00', 'Welcome & Course Overview'],
                      ['4:00 – 8:00', 'What Is Mindfulness?'],
                      ['8:00 – 13:00', 'Distraction, Autopilot & Ethical Risk'],
                      ['13:00 – 18:00', 'Competence, Ethics & Well-Being'],
                      ['18:00 – 24:00', 'The Overextended Lawyer'],
                      ['24:00 – 30:00', 'Mindfulness & Ethical Decision-Making'],
                      ['30:00 – 36:00', 'Stress, Perception & Choice'],
                      ['36:00 – 46:00', 'PRO Practice (Pause – Relax – Open)'],
                      ['46:00 – 52:00', 'On-the-Spot Practices'],
                      ['52:00 – 58:00', 'Ethical Application & Integration'],
                      ['58:00 – 60:00', 'Closing & Key Takeaways'],
                    ].map(([time, title], i) => (
                      <div key={i} className={`flex items-center gap-5 py-3 px-4 ${i % 2 === 0 ? 'bg-[#F8F8FA]' : ''} ${i === 0 ? 'rounded-t-lg' : ''} ${i === 10 ? 'rounded-b-lg' : ''}`}>
                        <span className="text-[12px] font-semibold text-shortcut-blue/35 w-[80px] flex-shrink-0 tabular-nums tracking-tight">{time}</span>
                        <span className="text-[14px] font-medium text-[#3D4F5F]">{title}</span>
                      </div>
                    ))}
                  </div>

                  <div className="h-px bg-black/[.06] mb-8" />

                  <p className="text-[12px] font-bold uppercase tracking-[.15em] text-shortcut-blue/35 mb-5">Accreditation</p>
                  <div className="bg-shortcut-teal/[.06] rounded-xl p-6 border border-shortcut-teal/10 mb-6">
                    <p className="text-[14px] font-medium text-[#3D4F5F] leading-relaxed">
                      Approved for <strong className="text-shortcut-blue font-bold">1.0 New York CLE credit in Ethics & Professionalism</strong>. Shortcut is the accredited provider — your firm handles nothing.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {[
                      ['Material submission', 'to the New York CLE Board'],
                      ['Attendance tracking', 'for all participants'],
                      ['Credit reporting', 'no admin burden on your firm'],
                    ].map(([bold, rest], i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-shortcut-teal/50 flex-shrink-0" />
                        <p className="text-[14px] font-medium text-[#3D4F5F]"><strong className="text-shortcut-blue font-semibold">{bold}</strong> — {rest}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          CTA  — dark rounded section
      ═══════════════════════════════════════════ */}
      <section id="contact" className="bg-shortcut-blue rounded-[20px] mx-3 lg:mx-6 mb-3">
        <div className="cle-fade-in max-w-[1200px] mx-auto px-6 lg:px-10 py-16 lg:py-24 text-center">
          <h2 className="text-3xl md:text-[2.5rem] lg:text-[2.75rem] font-extrabold text-white leading-[1.08] tracking-[-0.025em] mb-3">
            Ready to book a session<br className="hidden md:block" /> for your team?
          </h2>
          <p className="text-[14px] font-medium text-white/60 leading-[1.65] mb-7 max-w-sm mx-auto">
            Tell us your preferred date and team size. We'll send a proposal within 24 hours.
          </p>
          <a href="mailto:wellness@getshortcut.co?subject=CLE%20Program%20Inquiry" className="btn-primary inline-flex !text-[13px]" style={{ textDecoration: 'none' }}>
            <span>Request a Date</span>
          </a>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-7">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src="/shortcut-logo-blue.svg" alt="Shortcut" className="h-3.5 w-auto opacity-35" />
            <span className="text-[11px] font-medium text-shortcut-blue/30">Corporate Wellness, Simplified</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="mailto:wellness@getshortcut.co" className="text-[11px] font-medium text-shortcut-blue/30 hover:text-shortcut-blue/60 transition-colors">wellness@getshortcut.co</a>
            <a href="https://getshortcut.co" target="_blank" rel="noopener noreferrer" className="text-[11px] font-medium text-shortcut-blue/30 hover:text-shortcut-blue/60 transition-colors">getshortcut.co</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CLELandingPage;
