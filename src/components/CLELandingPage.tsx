import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { CLE_STATE_CONFIGS } from '../config/cleStateConfigs';

interface CLELandingPageProps {
  stateCode?: string;
}

const CLELandingPage: React.FC<CLELandingPageProps> = ({ stateCode = 'NY' }) => {
  const cfg = CLE_STATE_CONFIGS[stateCode] || CLE_STATE_CONFIGS.NY;
  const [activePackage, setActivePackage] = useState<'cle' | 'wellness'>('wellness');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [scheduleExpanded, setScheduleExpanded] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    teamSize: '',
    preferredDate: '',
    packageInterest: 'cle',
    message: '',
  });

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
          <button onClick={() => { setFormData(prev => ({ ...prev, packageInterest: 'cle' })); setShowContactForm(true); }} className="btn-primary !py-2 !px-5 !min-w-0 !text-[13px]">
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
                <span className="text-[11px] font-bold text-shortcut-blue tracking-wide uppercase">{cfg.creditLabel}</span>
              </div>

              <h1 className="text-[2.5rem] md:text-[3.25rem] lg:text-[3.75rem] font-extrabold text-shortcut-blue leading-[1.06] tracking-[-0.025em] mb-4">
                Your attorneys need ethics credits. Make this the one they thank you for.
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
                Approved for {cfg.creditDesc}. Shortcut is the accredited provider — we handle material submission, attendance tracking, and credit reporting. Zero admin burden on your firm.
              </p>
              <div className="space-y-3">
                {[
                  `Material submission to ${cfg.boardName}`,
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
                  <img src={cfg.sealImage} alt={cfg.sealAlt} className="w-full max-w-[260px] lg:max-w-[300px] h-auto" loading="lazy" />
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
              Start with the CLE. Add wellness services to make it a full day your team looks forward to.
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
                  `1.0 ${cfg.abbr} Ethics & Professionalism credit`,
                  'Led by Courtney Schulnick',
                  'Full CLE Board administration',
                  'Attendance tracking & reporting',
                  'Custom audio recordings & handouts',
                  'Guided breathwork & meditation tools',
                ].map((item,i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <Check />
                    <span className="text-[13px] font-medium text-[#3D4F5F]">{item}</span>
                  </div>
                ))}
              </div>

              <button onClick={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, packageInterest: 'cle' })); setShowContactForm(true); }} className={activePackage === 'cle' ? 'btn-primary w-full !text-[13px]' : 'btn-secondary w-full !text-[13px]'}>
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
              <span className="text-[2.5rem] font-extrabold text-shortcut-blue tracking-[-0.03em] leading-none block">Let's Build Yours</span>
              <p className="text-[13px] font-medium text-[#5A6F7F] mt-1 mb-7">CLE + massage, catering & more — priced by team size</p>

              <div className="space-y-3 mb-7">
                {[
                  { text: 'Everything in CLE Session', bold: true },
                  { text: 'On-site chair massage' },
                  { text: 'Licensed, insured therapists' },
                  { text: 'Full spa ambiance setup' },
                  { text: 'Catered food & refreshments' },
                  { text: 'Flexible add-ons by team size' },
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

              <button onClick={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, packageInterest: 'wellness' })); setShowContactForm(true); }} className={activePackage === 'wellness' ? 'btn-primary w-full !text-[13px]' : 'btn-secondary w-full !text-[13px]'}>
                <span>Get a Quote</span>
              </button>
            </div>
          </div>

          <p className="text-center text-[11px] font-medium text-shortcut-blue/30 mt-5 max-w-sm mx-auto">
            Wellness day pricing depends on team size and services. We'll build a custom package for your firm.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          PROGRAM SCHEDULE & ACCREDITATION
      ═══════════════════════════════════════════ */}
      <section className="pb-20 lg:pb-28">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10">

          <div className="cle-fade-in text-center mb-14 lg:mb-20">
            <p className="text-[11px] font-bold uppercase tracking-[.15em] text-shortcut-blue/40 mb-4">Details</p>
            <h2 className="text-3xl md:text-[2.5rem] lg:text-[2.75rem] font-extrabold text-shortcut-blue leading-[1.08] tracking-[-0.025em] max-w-xl mx-auto">
              Program schedule & accreditation
            </h2>
          </div>

          <div className="cle-fade-in grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">

            {/* Left — 60-minute agenda */}
            <div>
              <h3 className="text-xl md:text-2xl font-extrabold text-shortcut-blue leading-[1.15] tracking-[-0.02em] mb-6">
                60-minute timed agenda
              </h3>

              {(() => {
                const agenda = [
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
                ];
                const visible = scheduleExpanded ? agenda : agenda.slice(0, 5);
                return (
                  <>
                    <div className="space-y-0">
                      {visible.map(([time, title], i) => (
                        <div key={i} className={`flex items-center gap-5 py-3.5 px-4 ${i % 2 === 0 ? 'bg-[#F8F8FA]' : ''} ${i === 0 ? 'rounded-t-xl' : ''} ${(scheduleExpanded && i === 10) || (!scheduleExpanded && i === 4) ? 'rounded-b-xl' : ''}`}>
                          <span className="text-[13px] font-semibold text-shortcut-blue/30 w-[88px] flex-shrink-0 tabular-nums">{time}</span>
                          <span className="text-[15px] font-medium text-[#3D4F5F]">{title}</span>
                        </div>
                      ))}
                    </div>
                    {!scheduleExpanded && (
                      <button
                        onClick={() => setScheduleExpanded(true)}
                        className="mt-4 text-[13px] font-semibold text-shortcut-blue/60 hover:text-shortcut-blue transition-colors flex items-center gap-1.5"
                      >
                        View full agenda
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M5 8L10 13L15 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    )}
                    {scheduleExpanded && (
                      <button
                        onClick={() => setScheduleExpanded(false)}
                        className="mt-4 text-[13px] font-semibold text-shortcut-blue/60 hover:text-shortcut-blue transition-colors flex items-center gap-1.5"
                      >
                        Show less
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="rotate-180"><path d="M5 8L10 13L15 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Right — Accreditation */}
            <div>
              <h3 className="text-xl md:text-2xl font-extrabold text-shortcut-blue leading-[1.15] tracking-[-0.02em] mb-6">
                Accreditation
              </h3>

              <div className="bg-shortcut-teal/[.06] rounded-xl p-6 border border-shortcut-teal/10 mb-8">
                <p className="text-[15px] font-medium text-[#3D4F5F] leading-[1.7]">
                  Approved for <strong className="text-shortcut-blue font-bold">{cfg.creditDesc}</strong>. Shortcut is the accredited provider — your firm handles nothing.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  ['Material submission', `to ${cfg.boardName}`],
                  ['Attendance tracking', 'for all participants'],
                  ['Credit reporting', 'no admin burden on your firm'],
                ].map(([bold, rest], i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Check />
                    <p className="text-[15px] font-medium text-[#3D4F5F] leading-snug"><strong className="text-shortcut-blue font-semibold">{bold}</strong> — {rest}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-5 bg-[#F8F8FA] rounded-xl">
                <p className="text-[13px] font-medium text-[#5A6F7F] leading-[1.65]">
                  Every attendee receives custom audio recordings and handouts to continue their practice after the session.
                </p>
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
          <button onClick={() => { setFormData(prev => ({ ...prev, packageInterest: 'cle' })); setShowContactForm(true); }} className="btn-primary inline-flex !text-[13px]">
            <span>Request a Date</span>
          </button>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          CONTACT FORM MODAL
      ═══════════════════════════════════════════ */}
      {showContactForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4" onClick={() => { if (!formSubmitting) { setShowContactForm(false); setFormSuccess(false); } }}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ boxShadow: '0 24px 60px rgba(0,55,86,.18)' }} onClick={(e) => e.stopPropagation()}>

            {formSuccess ? (
              <div className="p-8 lg:p-10 text-center">
                <div className="w-14 h-14 rounded-full bg-shortcut-teal/10 flex items-center justify-center mx-auto mb-5">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M5 13L9 17L19 7" stroke="#003756" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <h3 className="text-2xl font-extrabold text-shortcut-blue mb-2">Thank you!</h3>
                <p className="text-[14px] font-medium text-[#5A6F7F] leading-[1.65] mb-6">We'll be in touch within 24 hours with a proposal tailored to your firm.</p>
                <button onClick={() => { setShowContactForm(false); setFormSuccess(false); }} className="btn-primary !text-[13px]">
                  <span>Close</span>
                </button>
              </div>
            ) : (
              <form onSubmit={async (e) => {
                e.preventDefault();
                setFormSubmitting(true);
                try {
                  const contactData: Record<string, unknown> = {
                    first_name: formData.firstName,
                    last_name: formData.lastName,
                    email: formData.email,
                    company: formData.company,
                    service_type: formData.packageInterest === 'wellness' ? `cle-wellness-${cfg.code}` : `cle-${cfg.code}`,
                    event_date: formData.preferredDate || null,
                    message: [
                      formData.teamSize ? `Team size: ${formData.teamSize}` : '',
                      formData.packageInterest === 'wellness' ? 'Package: CLE + Wellness Day' : 'Package: CLE Session',
                      formData.message || '',
                    ].filter(Boolean).join(' | '),
                    created_at: new Date().toISOString(),
                  };

                  const { error } = await supabase
                    .from('contact_requests')
                    .insert([contactData]);

                  if (error) {
                    console.error('Error saving contact request:', error);
                    alert('There was an error submitting your request. Please try again.');
                  } else {
                    setFormSuccess(true);
                    setFormData({ firstName: '', lastName: '', email: '', company: '', teamSize: '', preferredDate: '', packageInterest: 'cle', message: '' });
                  }
                } catch (err) {
                  console.error('Error:', err);
                  alert('There was an error submitting your request. Please try again.');
                } finally {
                  setFormSubmitting(false);
                }
              }}>
                <div className="p-8 lg:p-10">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-2xl font-extrabold text-shortcut-blue leading-[1.1] tracking-[-0.02em]">
                        {formData.packageInterest === 'wellness' ? 'Get a Custom Quote' : 'Request a Date'}
                      </h3>
                      <p className="text-[13px] font-medium text-[#5A6F7F] mt-1.5">We'll respond within 24 hours.</p>
                    </div>
                    <button type="button" onClick={() => setShowContactForm(false)} className="text-[#5A6F7F] hover:text-shortcut-blue transition-colors p-1 -mr-1 -mt-1">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[12px] font-bold text-shortcut-blue/60 uppercase tracking-wider mb-1.5">First Name *</label>
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-black/[.08] bg-[#F8F8FA] text-[14px] text-shortcut-blue placeholder-[#5A6F7F]/40 focus:outline-none focus:ring-2 focus:ring-shortcut-teal/30 focus:border-shortcut-teal/40 transition-all"
                          placeholder="Jane"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-bold text-shortcut-blue/60 uppercase tracking-wider mb-1.5">Last Name *</label>
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-black/[.08] bg-[#F8F8FA] text-[14px] text-shortcut-blue placeholder-[#5A6F7F]/40 focus:outline-none focus:ring-2 focus:ring-shortcut-teal/30 focus:border-shortcut-teal/40 transition-all"
                          placeholder="Smith"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[12px] font-bold text-shortcut-blue/60 uppercase tracking-wider mb-1.5">Work Email *</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-black/[.08] bg-[#F8F8FA] text-[14px] text-shortcut-blue placeholder-[#5A6F7F]/40 focus:outline-none focus:ring-2 focus:ring-shortcut-teal/30 focus:border-shortcut-teal/40 transition-all"
                        placeholder="jane@firm.com"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[12px] font-bold text-shortcut-blue/60 uppercase tracking-wider mb-1.5">Firm / Company *</label>
                      <input
                        type="text"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-black/[.08] bg-[#F8F8FA] text-[14px] text-shortcut-blue placeholder-[#5A6F7F]/40 focus:outline-none focus:ring-2 focus:ring-shortcut-teal/30 focus:border-shortcut-teal/40 transition-all"
                        placeholder="Your firm name"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[12px] font-bold text-shortcut-blue/60 uppercase tracking-wider mb-1.5">Team Size</label>
                        <select
                          value={formData.teamSize}
                          onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-black/[.08] bg-[#F8F8FA] text-[14px] text-shortcut-blue focus:outline-none focus:ring-2 focus:ring-shortcut-teal/30 focus:border-shortcut-teal/40 transition-all"
                        >
                          <option value="">Select</option>
                          <option value="10-25">10–25</option>
                          <option value="25-50">25–50</option>
                          <option value="50-100">50–100</option>
                          <option value="100-200">100–200</option>
                          <option value="200+">200+</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[12px] font-bold text-shortcut-blue/60 uppercase tracking-wider mb-1.5">Preferred Date</label>
                        <input
                          type="date"
                          value={formData.preferredDate}
                          onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-black/[.08] bg-[#F8F8FA] text-[14px] text-shortcut-blue focus:outline-none focus:ring-2 focus:ring-shortcut-teal/30 focus:border-shortcut-teal/40 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[12px] font-bold text-shortcut-blue/60 uppercase tracking-wider mb-1.5">Package</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, packageInterest: 'cle' })}
                          className={`px-3.5 py-2.5 rounded-lg border text-[13px] font-semibold transition-all ${formData.packageInterest === 'cle' ? 'border-shortcut-teal bg-shortcut-teal/[.06] text-shortcut-blue' : 'border-black/[.08] bg-[#F8F8FA] text-[#5A6F7F] hover:border-black/[.15]'}`}
                        >
                          CLE Session
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, packageInterest: 'wellness' })}
                          className={`px-3.5 py-2.5 rounded-lg border text-[13px] font-semibold transition-all ${formData.packageInterest === 'wellness' ? 'border-shortcut-teal bg-shortcut-teal/[.06] text-shortcut-blue' : 'border-black/[.08] bg-[#F8F8FA] text-[#5A6F7F] hover:border-black/[.15]'}`}
                        >
                          CLE + Wellness Day
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[12px] font-bold text-shortcut-blue/60 uppercase tracking-wider mb-1.5">Message <span className="font-medium normal-case tracking-normal">(optional)</span></label>
                      <textarea
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        rows={3}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-black/[.08] bg-[#F8F8FA] text-[14px] text-shortcut-blue placeholder-[#5A6F7F]/40 focus:outline-none focus:ring-2 focus:ring-shortcut-teal/30 focus:border-shortcut-teal/40 transition-all resize-none"
                        placeholder="Anything else we should know?"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="btn-primary w-full !text-[13px] mt-6 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span>{formSubmitting ? 'Submitting…' : formData.packageInterest === 'wellness' ? 'Get a Quote' : 'Request a Date'}</span>
                  </button>

                  <p className="text-[11px] font-medium text-[#5A6F7F]/50 text-center mt-4">
                    We'll respond within 24 hours. No spam, ever.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

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
