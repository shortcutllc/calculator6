/* =========================================================
   Slides 12-16: Ease → Scale → Proof → Punchline → Close
   ========================================================= */

// --- SLIDE 12: EASE — "You provide the space. We handle the rest." ---
function Slide12_Ease({ phase }) {
  const items = ['Scheduling', 'Sign-ups', 'Reminders', 'Setup', 'Cleanup', 'Everything'];
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
            transition: 'opacity 0.5s ease 0.15s',
          }}>Turn-key</p>
          <h1 style={{
            margin: 0, fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 800, fontSize: 170, lineHeight: 0.92,
            letterSpacing: '-0.045em', color: C.WHITE,
          }}>
            <span style={{
              display: 'block',
              opacity: phase === 'active' ? 1 : 0,
              transform: phase === 'active' ? 'translateY(0)' : 'translateY(36px)',
              transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.35s',
            }}>You provide</span>
            <span style={{
              display: 'block',
              opacity: phase === 'active' ? 1 : 0,
              transform: phase === 'active' ? 'translateY(0)' : 'translateY(36px)',
              transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.75s',
            }}>the space.</span>
            <span style={{
              display: 'block', color: C.NAVY, marginTop: 24,
              opacity: phase === 'active' ? 1 : 0,
              transform: phase === 'active' ? 'translateY(0)' : 'translateY(36px)',
              transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1) 1.25s',
            }}>We handle</span>
            <span style={{
              display: 'block', color: C.NAVY,
              opacity: phase === 'active' ? 1 : 0,
              transform: phase === 'active' ? 'translateY(0)' : 'translateY(36px)',
              transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1) 1.65s',
            }}>the rest.</span>
          </h1>
          {/* Chips row */}
          <div style={{
            marginTop: 80, display: 'flex', flexWrap: 'wrap', gap: 14,
          }}>
            {items.map((item, i) => (
              <span key={item} style={{
                fontFamily: 'Outfit, system-ui, sans-serif',
                fontWeight: 700, fontSize: 32, color: C.WHITE,
                letterSpacing: '-0.01em',
                padding: '14px 26px', borderRadius: 999,
                background: 'rgba(255,255,255,0.14)',
                border: '1.5px solid rgba(255,255,255,0.35)',
                opacity: phase === 'active' ? 1 : 0,
                transform: phase === 'active' ? 'scale(1)' : 'scale(0.9)',
                transition: `all 0.4s cubic-bezier(0.22, 1.3, 0.5, 1) ${2.15 + i * 0.15}s`,
              }}>{item}</span>
            ))}
          </div>
        </div>
      </SlideTransition>
      <CornerLogo theme="onDark" />
    </SlideFrame>
  );
}

// --- SLIDE 13: SCALE — One vendor. Every office. ---
function Slide13_Scale({ phase }) {
  // Re-render when the real US map finishes loading
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    if (window.US_MAP_READY === true) return;
    const h = () => forceUpdate();
    window.addEventListener('us-map-ready', h);
    return () => window.removeEventListener('us-map-ready', h);
  }, []);

  // City coords come from us_map.js (real Albers-USA projection) so the
  // dots land on their actual geographic positions within the silhouette.
  const cities = window.US_CITIES || [];

  return (
    <SlideFrame bg={C.NAVY}>
      <SlideTransition phase={phase} direction="left">
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
          }}>Coverage</p>
          <h1 style={{
            margin: 0, fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 800, fontSize: 170, lineHeight: 0.92,
            letterSpacing: '-0.045em', color: C.WHITE,
          }}>
            <span style={{
              display: 'block',
              opacity: phase === 'active' ? 1 : 0,
              transform: phase === 'active' ? 'translateX(0)' : 'translateX(-30px)',
              transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.35s',
            }}>One vendor.</span>
            <span style={{
              display: 'block', color: C.AQUA,
              opacity: phase === 'active' ? 1 : 0,
              transform: phase === 'active' ? 'translateX(0)' : 'translateX(-30px)',
              transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.75s',
            }}>Every office.</span>
          </h1>

          {/* Real US map */}
          <div style={{
            position: 'relative', marginTop: 80,
            width: '100%', aspectRatio: '960 / 593',
          }}>
            <svg viewBox="0 0 960 593" preserveAspectRatio="xMidYMid meet"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
              <path d={window.US_MAP_PATH}
                fill="rgba(158,250,255,0.08)"
                stroke={C.AQUA}
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={phase === 'active' ? 1 : 0}
                style={{ transition: 'opacity 0.8s ease 0.4s' }}
              />
            </svg>

            {/* City dots overlay — positioned in same viewBox coords via SVG */}
            <svg viewBox="0 0 960 593" preserveAspectRatio="xMidYMid meet"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
              {cities.map((ct, i) => (
                <g key={ct.name + i}
                  style={{
                    transform: phase === 'active' ? 'scale(1)' : 'scale(0)',
                    transformOrigin: `${ct.x}px ${ct.y}px`,
                    transition: `transform 0.5s cubic-bezier(0.22, 1.5, 0.5, 1) ${1.0 + i * 0.08}s`,
                  }}>
                  <circle cx={ct.x} cy={ct.y} r="16" fill={C.CORAL} opacity="0.25" />
                  <circle cx={ct.x} cy={ct.y} r="7" fill={C.CORAL} />
                </g>
              ))}
            </svg>
          </div>

          <p style={{
            margin: '60px 0 0 0', fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 600, fontSize: 40, color: 'rgba(255,255,255,0.55)',
            letterSpacing: '-0.01em',
            opacity: phase === 'active' ? 1 : 0,
            transition: 'opacity 0.5s ease 2.0s',
          }}>
            Coast to coast, one team to call.
          </p>
        </div>
      </SlideTransition>
      <CornerLogo theme="onDark" />
    </SlideFrame>
  );
}

// --- SLIDE 14: SOCIAL PROOF — 500+ companies ---
function Slide14_Proof({ phase }) {
  const logos = ['BCG', 'DraftKings', 'PwC', 'Paramount', 'Tripadvisor', 'Wix', 'Vimeo', 'Hulu', 'Datadog'];
  return (
    <SlideFrame bg={C.BEIGE}>
      <SlideTransition phase={phase} direction="fade">
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '0 60px',
        }}>
          <p style={{
            margin: 0, fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 700, fontSize: 32, color: 'rgba(9,54,79,0.5)',
            letterSpacing: '0.2em', textTransform: 'uppercase',
            marginBottom: 30,
            opacity: phase === 'active' ? 1 : 0,
            transition: 'opacity 0.5s ease 0.2s',
          }}>
            Trusted by
          </p>
          {/* 500+ */}
          <h1 style={{
            margin: 0, fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 800, fontSize: 380, lineHeight: 0.9,
            letterSpacing: '-0.055em', color: C.CORAL,
            textAlign: 'center',
            opacity: phase === 'active' ? 1 : 0,
            transform: phase === 'active' ? 'scale(1)' : 'scale(0.8)',
            transition: 'all 0.7s cubic-bezier(0.22, 1.3, 0.5, 1) 0.5s',
          }}>
            500+
          </h1>
          <p style={{
            margin: '8px 0 0 0', fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 700, fontSize: 72, color: C.NAVY,
            letterSpacing: '-0.03em', textAlign: 'center',
            opacity: phase === 'active' ? 1 : 0,
            transition: 'opacity 0.5s ease 1.0s',
          }}>companies.</p>
          {/* logos strip */}
          <div style={{
            marginTop: 100, width: '90%',
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
            gap: '18px 36px',
          }}>
            {logos.map((name, i) => (
              <span key={name} style={{
                fontFamily: 'Outfit, system-ui, sans-serif',
                fontWeight: 700, fontSize: 36,
                color: 'rgba(9,54,79,0.45)',
                letterSpacing: '-0.01em',
                opacity: phase === 'active' ? 1 : 0,
                transform: phase === 'active' ? 'translateY(0)' : 'translateY(14px)',
                transition: `all 0.4s cubic-bezier(0.22, 1, 0.36, 1) ${1.4 + i * 0.07}s`,
              }}>{name}</span>
            ))}
          </div>
        </div>
      </SlideTransition>
      <CornerLogo theme="onLight" />
    </SlideFrame>
  );
}

// --- SLIDE 15: PUNCHLINE — "This meeting could have been a massage." ---
function Slide15_Punchline({ phase }) {
  return (
    <SlideFrame bg={C.NAVY}>
      <SlideTransition phase={phase} direction="fade">
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', padding: '0 90px',
        }}>
          {/* Quote mark */}
          <div style={{
            fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 800, fontSize: 340, lineHeight: 0.6,
            color: C.CORAL,
            opacity: phase === 'active' ? 1 : 0,
            transform: phase === 'active' ? 'translateY(0)' : 'translateY(-30px)',
            transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.1s',
            marginBottom: 20,
          }}>“</div>
          <h1 style={{
            margin: 0, fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 800, fontSize: 130, lineHeight: 0.98,
            letterSpacing: '-0.04em', color: C.WHITE,
          }}>
            <span style={{
              display: 'inline',
              opacity: phase === 'active' ? 1 : 0,
              transition: 'opacity 0.5s ease 0.4s',
            }}>This meeting </span>
            <span style={{
              display: 'inline',
              opacity: phase === 'active' ? 1 : 0,
              transition: 'opacity 0.5s ease 0.8s',
            }}>could have </span>
            <span style={{
              display: 'inline',
              opacity: phase === 'active' ? 1 : 0,
              transition: 'opacity 0.5s ease 1.2s',
            }}>been a </span>
            <span style={{
              display: 'inline', color: C.AQUA,
              opacity: phase === 'active' ? 1 : 0,
              transition: 'opacity 0.5s ease 1.7s',
            }}>massage.</span>
          </h1>
          <p style={{
            margin: '60px 0 0 0',
            fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 600, fontSize: 38, color: 'rgba(255,255,255,0.55)',
            letterSpacing: '-0.01em',
            opacity: phase === 'active' ? 1 : 0,
            transition: 'opacity 0.5s ease 2.2s',
          }}>
            Just saying. The chair's right over there.
          </p>
        </div>
      </SlideTransition>
      <CornerLogo theme="onDark" />
    </SlideFrame>
  );
}

// --- SLIDE 16: CLOSE — Big QR, logo, "See you at the chair." ---
function Slide16_Close({ phase }) {
  return (
    <SlideFrame bg={C.CORAL}>
      <SlideTransition phase={phase} direction="scale">
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '0 60px',
        }}>
          <p style={{
            margin: 0, fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 700, fontSize: 32,
            color: 'rgba(255,255,255,0.8)',
            letterSpacing: '0.2em', textTransform: 'uppercase',
            marginBottom: 30,
            opacity: phase === 'active' ? 1 : 0,
            transition: 'opacity 0.5s ease 0.2s',
          }}>Gratitude Garden · Workhuman Live</p>

          <h1 style={{
            margin: 0, fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 800, fontSize: 140, lineHeight: 0.95,
            letterSpacing: '-0.04em', color: C.WHITE,
            textAlign: 'center',
            opacity: phase === 'active' ? 1 : 0,
            transform: phase === 'active' ? 'translateY(0)' : 'translateY(30px)',
            transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.4s',
            marginBottom: 56,
          }}>
            See you<br/>at the chair.
          </h1>

          <div style={{
            opacity: phase === 'active' ? 1 : 0,
            transform: phase === 'active' ? 'scale(1)' : 'scale(0.85)',
            transition: 'all 0.6s cubic-bezier(0.22, 1.3, 0.5, 1) 0.9s',
            animation: phase === 'active' ? 'qr-pulse 2.4s ease-out 1.6s infinite' : 'none',
            borderRadius: 28,
          }}>
            <QRCode size={460} fg={C.NAVY} bg={C.WHITE} />
          </div>

          <p style={{
            margin: '44px 0 0 0',
            fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 700, fontSize: 42, color: C.NAVY,
            letterSpacing: '-0.02em', textAlign: 'center',
            opacity: phase === 'active' ? 1 : 0,
            transition: 'opacity 0.5s ease 1.4s',
          }}>
            Scan. Book. Relax.
          </p>

          <div style={{ marginTop: 60 }}>
            <ShortcutLogo variant="navy" size={68} />
          </div>
        </div>
      </SlideTransition>
    </SlideFrame>
  );
}

Object.assign(window, {
  Slide12_Ease, Slide13_Scale, Slide14_Proof, Slide15_Punchline, Slide16_Close,
});
