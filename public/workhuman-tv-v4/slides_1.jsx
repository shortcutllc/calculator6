/* =========================================================
   Slides 1-6: Hero → Greeting → Pitch → Service stack
   ========================================================= */

// --- SLIDE 1: QR HERO — "Book your free massage." ---
function Slide01_QRHero({ phase }) {
  return (
    <SlideFrame bg={C.CORAL}>
      <SlideTransition phase={phase} direction="scale">
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '0 60px',
        }}>
          {/* Eyebrow */}
          <p style={{
            margin: 0, fontWeight: 700, color: 'rgba(255,255,255,0.7)',
            fontSize: 36, letterSpacing: '0.18em', textTransform: 'uppercase',
            fontFamily: 'Outfit, system-ui, sans-serif',
            opacity: phase === 'active' ? 1 : 0,
            transform: phase === 'active' ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.2s',
            marginBottom: 24,
          }}>
            Hi. You look tense.
          </p>
          {/* Main headline */}
          <h1 style={{
            margin: 0,
            fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 800,
            fontSize: 150,
            lineHeight: 0.95,
            letterSpacing: '-0.04em',
            color: C.WHITE,
            textAlign: 'center',
            marginBottom: 64,
          }}>
            Book your<br/>
            <span style={{ color: C.NAVY }}>free</span> massage.
          </h1>
          {/* QR */}
          <div style={{
            animation: phase === 'active' ? 'fade-scale-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.6s both' : 'none',
          }}>
            <QRCode size={400} fg={C.NAVY} bg={C.WHITE} />
          </div>
          <p style={{
            margin: '40px 0 0 0', fontWeight: 600,
            fontSize: 32, color: 'rgba(255,255,255,0.85)',
            fontFamily: 'Outfit, system-ui, sans-serif',
            letterSpacing: '-0.01em',
            opacity: phase === 'active' ? 1 : 0,
            transform: phase === 'active' ? 'translateY(0)' : 'translateY(16px)',
            transition: 'all 0.5s cubic-bezier(0.22, 1, 0.36, 1) 1.1s',
          }}>
            Scan. Walk over. Exhale.
          </p>
          {/* Logo at bottom */}
          <div style={{ position: 'absolute', bottom: 60 }}>
            <AnimatedLogo phase={phase} size={80} color={C.WHITE} wordColor={C.WHITE} delay={0.6} />
          </div>
        </div>
      </SlideTransition>
    </SlideFrame>
  );
}

// --- SLIDE 2: HELLO, WORKHUMAN ---
// Uses the real Workhuman Live SVG wordmark (from V3), not a type-based approximation.
function Slide02_HelloWorkhuman({ phase }) {
  // Workhuman co-brand slide. The ONE slide that defers to the conference brand.
  const WH_NAVY = '#0D173D';
  const WH_RASP = '#C1386A';
  return (
    <SlideFrame bg="#FFF3E2">
      <SlideTransition phase={phase} direction="fade">
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '0 80px',
        }}>
          {/* Real workhuman* live wordmark (SVG, from V3) */}
          <div style={{
            display: 'flex', justifyContent: 'center',
            opacity: phase === 'active' ? 1 : 0,
            transform: phase === 'active' ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.15s',
          }}>
            <svg style={{ width: 720, maxWidth: '80%', height: 'auto' }} viewBox="0 0 260 38" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g>
                <path d="M192.1,33.6c1,0,1.8.8,1.8,1.7h0c0,1.1-.7,1.9-1.6,1.9h-.1c-1,0-1.8-.9-1.8-1.9,0-1,.8-1.7,1.8-1.8M192.1,36.9c.8,0,1.4-.7,1.4-1.4h0c0-.8-.7-1.4-1.5-1.4s-1.4.7-1.4,1.5c0,.8.7,1.4,1.4,1.4M192.2,35.8h-.3v.7h-.5v-2h.8c.4,0,.8.2.8.7,0,.2,0,.5-.3.6l.3.7h-.6l-.2-.7h0ZM191.9,35.4h.3c.1,0,.3,0,.3-.2h0c0-.3-.1-.4-.3-.4h-.2v.6h0Z" fill={WH_NAVY}/>
                <path d="M5.1,17.4l2.4,15.3h.9l3-14.9h5.4l3,14.9h.9l2.4-15.3h5.2l-3.7,19.8h-8.2l-2.2-12.2-2.2,12.2H3.7L0,17.4h5.2,0Z" fill={WH_NAVY}/>
                <path d="M47.1,27.3c0,6.1-2.2,10.4-9,10.4s-9-4.3-9-10.4,2.2-10.4,9-10.4,9,4.2,9,10.4M41.8,27.3c0-3.8-.8-5.8-3.7-5.8s-3.7,2-3.7,5.8.8,5.9,3.7,5.9,3.7-2.1,3.7-5.9" fill={WH_NAVY}/>
                <path d="M49.5,17.4h5.2v2.1s3.3-2,6.2-2.6v5.4c-2.1.4-4.2,1-6.2,1.7v13.3h-5.2v-19.9Z" fill={WH_NAVY}/>
                <path d="M82.3,37.2V9.4h5.2v8.9s2.7-1.4,4.8-1.4c5.5,0,6.9,3.5,6.9,9.6v10.8h-5.2v-10.6c0-3-.4-4.9-2.9-4.9-1.2,0-2.4.2-3.6.6v14.9s-5.2,0-5.2,0Z" fill={WH_NAVY}/>
                <path d="M118.7,17.4v19.9h-5.2v-1.1s-2.8,1.6-4.9,1.6c-5.7,0-6.9-3.2-6.9-9.9v-10.4h5.2v10.5c0,3.5.2,5.1,2.7,5.1,1.3,0,2.6-.3,3.8-.7v-14.8h5.2Z" fill={WH_NAVY}/>
                <path d="M121.4,37.2v-19.8h5.2v1.1s2.7-1.6,4.6-1.6,3.7.6,4.9,1.9c0,0,3.6-1.9,6.6-1.9,5.3,0,6.9,3.2,6.9,9.6v10.8h-5.2v-10.6c0-3-.4-5-2.7-5-1.2,0-2.5.3-3.6.8,0,0,.2,3,.2,4.5v10.3h-5.2v-10.2c0-3.6-.3-5.4-2.7-5.4-1.2,0-2.4.3-3.5.7v14.8h-5.2Z" fill={WH_NAVY}/>
                <path d="M171.1,37.2v-19.8h5.2v1.1s2.6-1.6,4.9-1.6c5.5,0,6.9,3.5,6.9,9.6v10.8h-5.2v-10.6c0-3-.4-5-2.9-5-1.2,0-2.4.3-3.6.7v14.8h-5.2Z" fill={WH_NAVY}/>
                <path d="M80.3,17.4h-6.1l-5.9,9.1V9.4h-5.2v27.8h5.2v-9.1l5.9,9.1h6.1l-6.4-9.9s6.4-9.9,6.4-9.9Z" fill={WH_NAVY}/>
                <path d="M168.4,17.4h-5.2v1.1s-2.6-1.6-4.9-1.6c-5.5,0-6.8,5.2-6.8,11.2s1.4,9.6,6.9,9.6,4.4-1.3,4.8-1.5v1.1h5.3v-19.8h0ZM159.7,32.9c-2.5,0-2.9-1.9-2.9-5v-2.7c.1-2.3.7-3.7,2.9-3.7,1.2,0,2.4.3,3.6.7v9.9c-1.1.4-2.3.7-3.5.7" fill={WH_NAVY}/>
                <path d="M200.7,9.6c0-1.7-.5-3.3-1.3-4.8l-7.3,3.6,1.6-8c-1.8-.5-3.7-.5-5.5,0l1.6,8-7.3-3.6c-.9,1.5-1.3,3.1-1.3,4.8l7.9,1-4.7,4.7c1.5.3,2.8,1.2,3.8,2.4l2.8-5.7,3.4,6.9c1.5-.6,2.9-1.5,4-2.8l-5.5-5.5,7.9-1h0Z" fill={WH_NAVY}/>
                <rect x="208.3" y="9.4" width="5.3" height="27.7" fill={WH_RASP}/>
                <path d="M216.8,9.4h5.3v5.4h-5.3v-5.4ZM216.8,17.3h5.3v19.8h-5.3v-19.8Z" fill={WH_RASP}/>
                <path d="M229.1,17.3l3.2,15.3h1.1l3.3-15.3h5.4l-4.7,19.8h-9l-4.7-19.8h5.5,0Z" fill={WH_RASP}/>
                <path d="M258.9,32.6v3.9c-2.6.6-5.4,1-8.2,1.1-6,0-8.5-3-8.5-10.1s3-10.6,8.7-10.6,8.6,3,8.6,8.9l-.4,3.7h-11.6c0,2.4,1.1,3.4,4,3.4s7.3-.4,7.3-.4M254.4,25.4c0-3.2-.9-4.2-3.4-4.2s-3.4,1.2-3.4,4.2h6.8Z" fill={WH_RASP}/>
              </g>
            </svg>
          </div>

          {/* Hello 👋 */}
          <h1 style={{
            margin: '80px 0 0 0', fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 800, fontSize: 220, lineHeight: 0.95,
            letterSpacing: '-0.045em', color: WH_NAVY,
            textAlign: 'center',
            opacity: phase === 'active' ? 1 : 0,
            transform: phase === 'active' ? 'translateY(0)' : 'translateY(40px)',
            transition: 'all 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.5s',
          }}>
            Hello <span style={{ display: 'inline-block', animation: phase === 'active' ? 'wave-hand 1.2s ease-in-out 0.8s' : 'none' }}>👋</span>
          </h1>

          {/* Welcome copy */}
          <p style={{
            margin: '80px 0 0 0',
            fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 600, fontSize: 52, lineHeight: 1.22,
            color: WH_NAVY, textAlign: 'center',
            letterSpacing: '-0.015em',
            maxWidth: 840,
            opacity: phase === 'active' ? 1 : 0,
            transform: phase === 'active' ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1) 1.0s',
          }}>
            Welcome to your moment of zen.
          </p>
          <p style={{
            margin: '24px 0 0 0',
            fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 600, fontSize: 42, lineHeight: 1.22,
            color: WH_NAVY, textAlign: 'center',
            letterSpacing: '-0.01em',
            opacity: phase === 'active' ? 0.75 : 0,
            transform: phase === 'active' ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1) 1.3s',
          }}>
            Presented by Shortcut.
          </p>
        </div>
      </SlideTransition>
    </SlideFrame>
  );
}

// --- SLIDE 3: WE ARE SHORTCUT (animated logo reveal) ---
function Slide03_WeAreShortcut({ phase }) {
  return (
    <SlideFrame bg={C.NAVY}>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 2,
      }}>
        <p style={{
          margin: 0, fontFamily: 'Outfit, system-ui, sans-serif',
          fontWeight: 500, fontSize: 40, color: 'rgba(255,255,255,0.55)',
          letterSpacing: '-0.01em',
          animation: phase === 'active' ? 'tagline-pan-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.2s forwards' : 'none',
          opacity: 0, transform: 'translateY(24px)',
          marginBottom: 40,
        }}>
          We're
        </p>
        <AnimatedLogo phase={phase} size={140} color={C.CORAL} wordColor={C.WHITE} delay={0.4} />
      </div>
    </SlideFrame>
  );
}

// --- SLIDE 4: TAGLINE — Employee Happiness Delivered. ---
function Slide04_Tagline({ phase }) {
  return (
    <SlideFrame bg={C.CORAL}>
      <SlideTransition phase={phase} direction="fade">
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', padding: '0 90px',
        }}>
          <p style={{
            margin: '0 0 48px 0', fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 700, fontSize: 32, color: 'rgba(255,255,255,0.75)',
            letterSpacing: '0.2em', textTransform: 'uppercase',
            opacity: phase === 'active' ? 1 : 0,
            transition: 'opacity 0.5s ease 0.2s',
          }}>Our promise</p>
          <h1 style={{
            margin: 0, fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 800, fontSize: 210, lineHeight: 0.92,
            letterSpacing: '-0.045em', textAlign: 'left', color: C.WHITE,
          }}>
            <span style={{
              display: 'block',
              opacity: phase === 'active' ? 1 : 0,
              transform: phase === 'active' ? 'translateY(0)' : 'translateY(40px)',
              transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.4s',
            }}>Employee</span>
            <span style={{
              display: 'block', color: C.NAVY,
              opacity: phase === 'active' ? 1 : 0,
              transform: phase === 'active' ? 'translateY(0)' : 'translateY(40px)',
              transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.8s',
            }}>happiness,</span>
            <span style={{
              display: 'block',
              opacity: phase === 'active' ? 1 : 0,
              transform: phase === 'active' ? 'translateY(0)' : 'translateY(40px)',
              transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1) 1.2s',
            }}>delivered.</span>
          </h1>
          <p style={{
            margin: '60px 0 0 0', fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 600, fontSize: 40, color: 'rgba(255,255,255,0.6)',
            letterSpacing: '-0.01em',
            opacity: phase === 'active' ? 1 : 0,
            transition: 'opacity 0.5s ease 1.7s',
          }}>
            Straight to your office. No portal required.
          </p>
        </div>
      </SlideTransition>
      <CornerLogo theme="onDark" />
    </SlideFrame>
  );
}

// --- SLIDE 5: WHAT WE DO ---
function Slide05_WhatWeDo({ phase }) {
  return (
    <SlideFrame bg={C.NAVY}>
      <SlideTransition phase={phase} direction="up">
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', padding: '0 60px',
        }}>
          <p style={{
            margin: '0 0 48px 0', fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 700, fontSize: 32, color: C.AQUA,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            opacity: phase === 'active' ? 1 : 0,
            transition: 'opacity 0.5s ease 0.15s',
          }}>
            What we do
          </p>
          <h1 style={{
            margin: 0, fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 800, fontSize: 84, lineHeight: 1.02,
            letterSpacing: '-0.035em', color: C.WHITE,
          }}>
            <span style={{
              display: 'block',
              opacity: phase === 'active' ? 1 : 0,
              transform: phase === 'active' ? 'translateY(0)' : 'translateY(34px)',
              transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.35s',
            }}>We bring massage,</span>
            <span style={{
              display: 'block', color: C.CORAL,
              opacity: phase === 'active' ? 1 : 0,
              transform: phase === 'active' ? 'translateY(0)' : 'translateY(34px)',
              transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.75s',
            }}>beauty, and more wellness</span>
            <span style={{
              display: 'block',
              opacity: phase === 'active' ? 1 : 0,
              transform: phase === 'active' ? 'translateY(0)' : 'translateY(34px)',
              transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1) 1.15s',
            }}>directly to your office.</span>
          </h1>
        </div>
      </SlideTransition>
      <CornerLogo theme="onDark" />
    </SlideFrame>
  );
}

// --- SLIDE 5a: Your team has wellness benefits. ---
function Slide05a_Benefits({ phase }) {
  return (
    <SlideFrame bg={C.NAVY}>
      <SlideTransition phase={phase} direction="up">
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', padding: '0 90px',
        }}>
          <p style={{
            margin: '0 0 48px 0', fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 700, fontSize: 32, color: C.AQUA,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            opacity: phase === 'active' ? 1 : 0,
            transition: 'opacity 0.5s ease 0.15s',
          }}>Notice a pattern</p>
          <h1 style={{
            margin: 0, fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 800, fontSize: 170, lineHeight: 0.95,
            letterSpacing: '-0.045em', color: C.WHITE,
          }}>
            <span style={{
              display: 'block',
              opacity: phase === 'active' ? 1 : 0,
              transform: phase === 'active' ? 'translateY(0)' : 'translateY(36px)',
              transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.35s',
            }}>Every company</span>
            <span style={{
              display: 'block',
              opacity: phase === 'active' ? 1 : 0,
              transform: phase === 'active' ? 'translateY(0)' : 'translateY(36px)',
              transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.75s',
            }}>has wellness</span>
            <span style={{
              display: 'block', color: C.CORAL,
              opacity: phase === 'active' ? 1 : 0,
              transform: phase === 'active' ? 'translateY(0)' : 'translateY(36px)',
              transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1) 1.15s',
            }}>benefits.</span>
          </h1>
          <p style={{
            margin: '60px 0 0 0', fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 600, fontSize: 38, color: 'rgba(255,255,255,0.55)',
            letterSpacing: '-0.01em',
            opacity: phase === 'active' ? 1 : 0,
            transition: 'opacity 0.5s ease 1.7s',
          }}>
            Most go unused.
          </p>
        </div>
      </SlideTransition>
    </SlideFrame>
  );
}

// --- SLIDE 5b: "Buried" — rendered as an actual portal UI mock ---
function Slide05b_Buried({ phase }) {
  // Beige backdrop, navy chrome — visually IS the portal.
  const dividerColor = 'rgba(9,54,79,0.1)';
  const labelColor = 'rgba(9,54,79,0.42)';

  // Fake portal list. The wellness entry is item 7 of 8 — literally buried.
  const items = [
    { label: 'Medical · BlueCross PPO',         status: 'Active' },
    { label: 'Dental · Delta PPO',              status: 'Active' },
    { label: 'Vision · VSP Signature',          status: 'Active' },
    { label: '401(k) · Fidelity',               status: 'Contributing' },
    { label: 'HSA · Optum Bank',                status: 'Enrolled' },
    { label: 'Commuter · WageWorks',            status: 'Active' },
    { label: 'Wellness Stipend · $75/mo',       status: '$0 used', highlight: true },
    { label: 'Life · MetLife Basic',            status: 'Active' },
  ];

  return (
    <SlideFrame bg={C.BEIGE}>
      <SlideTransition phase={phase} direction="up">
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          padding: '140px 90px 120px 90px',
        }}>
          {/* Headline */}
          <h1 style={{
            margin: 0, fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 800, fontSize: 130, lineHeight: 0.95,
            letterSpacing: '-0.04em', color: C.NAVY,
          }}>
            <span style={{
              display: 'block',
              opacity: phase === 'active' ? 1 : 0,
              transform: phase === 'active' ? 'translateY(0)' : 'translateY(28px)',
              transition: 'all 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.15s',
            }}>And easy</span>
            <span style={{
              display: 'block', color: C.CORAL,
              opacity: phase === 'active' ? 1 : 0,
              transform: phase === 'active' ? 'translateY(0)' : 'translateY(28px)',
              transition: 'all 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.5s',
            }}>to miss.</span>
          </h1>

          {/* Portal mock — one big "window" */}
          <div style={{
            marginTop: 70, flex: 1,
            background: C.WHITE, borderRadius: 28,
            boxShadow: '0 24px 60px rgba(9,54,79,0.18)',
            border: '1px solid rgba(9,54,79,0.08)',
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            opacity: phase === 'active' ? 1 : 0,
            transform: phase === 'active' ? 'translateY(0)' : 'translateY(30px)',
            transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.9s',
          }}>
            {/* Window top */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '18px 24px',
              borderBottom: `1px solid ${dividerColor}`,
              background: 'rgba(9,54,79,0.03)',
            }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e' }} />
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c940' }} />
              <span style={{
                marginLeft: 28, fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: 20, fontWeight: 600, color: labelColor,
                letterSpacing: '0.02em',
              }}>benefits.yourcompany.com / my-benefits</span>
            </div>

            {/* Column header */}
            <div style={{
              padding: '30px 44px 14px 44px',
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            }}>
              <p style={{
                margin: 0, fontFamily: 'Outfit, system-ui, sans-serif',
                fontWeight: 800, fontSize: 44, color: C.NAVY, letterSpacing: '-0.02em',
              }}>My Benefits</p>
              <p style={{
                margin: 0, fontFamily: 'Inter, system-ui, sans-serif',
                fontWeight: 700, fontSize: 16, color: labelColor,
                letterSpacing: '0.14em', textTransform: 'uppercase',
              }}>8 of 8 plans</p>
            </div>

            {/* Rows */}
            <div style={{ flex: 1, padding: '0 12px 12px 12px', overflow: 'hidden' }}>
              {items.map((it, i) => {
                const rowDelay = 1.25 + i * 0.1;
                const highlight = it.highlight;
                return (
                  <div key={it.label} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '20px 32px',
                    margin: '0 0 4px 0',
                    borderRadius: 14,
                    // Soft coral border draws the eye to the row without screaming.
                    // The "$0 used" pill carries the message; no arrow, no red badge.
                    background: highlight ? 'rgba(255,80,80,0.05)' : 'transparent',
                    border: highlight ? '2px solid rgba(255,80,80,0.35)' : '2px solid transparent',
                    position: 'relative',
                    opacity: phase === 'active' ? 1 : 0,
                    transform: phase === 'active' ? 'translateX(0)' : 'translateX(-20px)',
                    transition: `all 0.4s cubic-bezier(0.22, 1, 0.36, 1) ${rowDelay}s`,
                  }}>
                    {/* Left — icon + label */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'rgba(9,54,79,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: labelColor,
                        fontFamily: 'Outfit, system-ui, sans-serif', fontWeight: 800, fontSize: 18,
                      }}>{i + 1}</div>
                      <span style={{
                        fontFamily: 'Inter, system-ui, sans-serif',
                        fontWeight: highlight ? 700 : 600, fontSize: 26,
                        color: highlight ? C.NAVY : 'rgba(9,54,79,0.72)',
                        letterSpacing: '-0.005em',
                      }}>{it.label}</span>
                    </div>
                    {/* Right — status pill (muted gray on the wellness row, same as inactive plans) */}
                    <span style={{
                      fontFamily: 'Inter, system-ui, sans-serif',
                      fontWeight: 700, fontSize: 14, letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      padding: '8px 14px', borderRadius: 999,
                      background: 'rgba(9,54,79,0.06)',
                      color: labelColor,
                    }}>{it.status}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <p style={{
            margin: '40px 0 0 0', fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 600, fontSize: 38, color: 'rgba(9,54,79,0.6)',
            letterSpacing: '-0.01em',
            opacity: phase === 'active' ? 1 : 0,
            transition: 'opacity 0.5s ease 2.4s',
          }}>
            Between the 401(k) and the dental plan.
          </p>
        </div>
      </SlideTransition>
      <CornerLogo theme="onLight" />
    </SlideFrame>
  );
}

// --- SLIDE 5d: THE GAP — "3 in 4 don't use wellness benefits." ---
// Sits between Slide05b_Buried and Slide05_WhatWeDo. Beige bg keeps the
// data-world rhythm with the portal mock; coral hero number gives it punch.
// Backs the soft "Most go unused" claim with hard data — Gallup wellness
// program participation, broadly defined (covers stipends, apps, gym, etc.).
function Slide05d_TheGap({ phase }) {
  return (
    <SlideFrame bg={C.BEIGE}>
      <SlideTransition phase={phase} direction="fade">
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '0 60px',
        }}>
          {/* Eyebrow */}
          <p style={{
            margin: 0, fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 700, fontSize: 32, color: 'rgba(9,54,79,0.5)',
            letterSpacing: '0.2em', textTransform: 'uppercase',
            marginBottom: 30,
            opacity: phase === 'active' ? 1 : 0,
            transition: 'opacity 0.5s ease 0.2s',
          }}>The gap</p>

          {/* Hero number — scale-in for impact */}
          <h1 style={{
            margin: 0, fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 800, fontSize: 360, lineHeight: 0.92,
            letterSpacing: '-0.055em', color: C.CORAL,
            textAlign: 'center',
            opacity: phase === 'active' ? 1 : 0,
            transform: phase === 'active' ? 'scale(1)' : 'scale(0.85)',
            transition: 'all 0.7s cubic-bezier(0.22, 1.3, 0.5, 1) 0.5s',
          }}>3 in 4</h1>

          {/* Subline */}
          <p style={{
            margin: '60px 0 0 0', fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 600, fontSize: 50, lineHeight: 1.18,
            color: C.NAVY,
            letterSpacing: '-0.015em',
            textAlign: 'center',
            maxWidth: 880,
            opacity: phase === 'active' ? 1 : 0,
            transition: 'opacity 0.5s ease 1.1s',
          }}>
            Don't use the wellness benefits<br/>
            their company offers.
          </p>

          {/* Source attribution */}
          <p style={{
            position: 'absolute', bottom: 90, left: 0, right: 0,
            margin: 0, fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 700, fontSize: 18, letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(9,54,79,0.4)',
            textAlign: 'center',
            opacity: phase === 'active' ? 1 : 0,
            transition: 'opacity 0.5s ease 1.6s',
          }}>
            Source: Gallup
          </p>
        </div>
      </SlideTransition>
      <CornerLogo theme="onLight" />
    </SlideFrame>
  );
}

// --- SLIDE 5c: PLOT TWIST — "We're not just a massage company." ---
// Sits between Slide05_WhatWeDo and Slide06_ServiceList. Coral bg, navy
// callout on "not just" so the pivot lands. Italic "Surprise." beat below.
function Slide05c_PlotTwist({ phase }) {
  return (
    <SlideFrame bg={C.CORAL}>
      <SlideTransition phase={phase} direction="up">
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'flex-start', padding: '200px 90px 0 90px',
        }}>
          <p style={{
            margin: '0 0 48px 0', fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 700, fontSize: 32, color: C.NAVY,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            opacity: phase === 'active' ? 1 : 0,
            transition: 'opacity 0.5s ease 0.15s',
          }}>Plot twist</p>
          <h1 style={{
            margin: 0, fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 800, fontSize: 170, lineHeight: 0.96,
            letterSpacing: '-0.045em', color: C.WHITE,
          }}>
            {[
              // Spoken cadence: deliberate, like someone reading the line aloud.
              // "not just" lands tighter (single phrase); "company." gets a bit
              // more space so the punchline has weight before "Surprise." closes.
              { word: "We're",    color: C.WHITE, delay: 0.4 },
              { word: 'not',      color: C.NAVY,  delay: 0.95 },
              { word: 'just',     color: C.NAVY,  delay: 1.4 },
              { word: 'a',        color: C.WHITE, delay: 1.95 },
              { word: 'massage',  color: C.WHITE, delay: 2.5 },
              { word: 'company.', color: C.WHITE, delay: 3.15 },
            ].map(({ word, color, delay }) => (
              <span key={word} style={{
                display: 'block', color,
                opacity: phase === 'active' ? 1 : 0,
                transform: phase === 'active' ? 'translateY(0)' : 'translateY(36px)',
                transition: `all 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s`,
              }}>{word}</span>
            ))}
          </h1>
          <p style={{
            margin: '60px 0 0 0', fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 600, fontSize: 48, color: 'rgba(255,255,255,0.9)',
            letterSpacing: '-0.01em', fontStyle: 'italic',
            opacity: phase === 'active' ? 1 : 0,
            transition: 'opacity 0.6s ease 4.0s',
          }}>
            Surprise.
          </p>
        </div>
      </SlideTransition>
    </SlideFrame>
  );
}

// --- SLIDE 6: SERVICE STACK — glide in, hold, glide out ---
function Slide06_ServiceList({ phase }) {
  const items = [
    { name: 'Massage.',     color: C.AQUA },
    { name: 'Headshots.',   color: C.PINK },
    { name: 'Manicures.',   color: C.YELLOW },
    { name: 'Haircuts.',    color: C.AQUA },
    { name: 'Facials.',     color: C.PINK },
    { name: 'Mindfulness.', color: C.YELLOW },
  ];
  return (
    <SlideFrame bg={C.NAVY}>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center',
        padding: '120px 0 120px 100px',
      }}>
        <div style={{ width: '100%' }}>
          {items.map((it, i) => (
            <p key={it.name} style={{
              margin: 0,
              fontFamily: 'Outfit, system-ui, sans-serif',
              fontWeight: 800, fontSize: 140, lineHeight: 1.0,
              letterSpacing: '-0.04em', color: it.color,
              animation: phase === 'active'
                ? `glide-in-right 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${0.1 + i * 0.1}s forwards`
                : 'none',
              transform: 'translateX(-120%)', opacity: 0,
            }}>{it.name}</p>
          ))}
        </div>
      </div>
      <CornerLogo theme="onDark" />
    </SlideFrame>
  );
}

Object.assign(window, {
  Slide01_QRHero, Slide02_HelloWorkhuman, Slide03_WeAreShortcut,
  Slide04_Tagline, Slide05a_Benefits, Slide05b_Buried,
  Slide05_WhatWeDo, Slide05c_PlotTwist, Slide05d_TheGap, Slide06_ServiceList,
});
