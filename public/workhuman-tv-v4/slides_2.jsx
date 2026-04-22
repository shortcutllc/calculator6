/* =========================================================
   Slides 7-11: Split-word service beats
   Each word opens like a door. A real 1:1 service video slides in.
   Matches V3 ServiceSlide pattern: video width animates 0% -> 35%
   with 18px inline margin, 3:4 aspect, rounded corners.
   Easing: cubic-bezier(0.16, 1, 0.3, 1) (expo.out approximation).
   Video paths are /workhuman-tv/*.mp4 (served from public/ at repo root).
   ========================================================= */

// A service tile that plays the real service video when the slide is active.
function ServiceTile({ service, isOpen, phase }) {
  const videoRef = React.useRef(null);

  React.useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (phase === 'active') {
      try { el.currentTime = 0; } catch (e) {}
      el.play().catch(() => {});
    } else {
      try { el.pause(); } catch (e) {}
    }
  }, [phase]);

  return (
    <div style={{
      position: 'relative',
      width: isOpen ? 'clamp(240px, 35%, 36%)' : '0%',
      aspectRatio: '3 / 4',
      borderRadius: 28,
      marginInline: isOpen ? 18 : 0,
      overflow: 'hidden',
      flexShrink: 0,
      background: service.tileBg,
      transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1), margin 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
    }}>
      <video
        ref={videoRef}
        src={service.video}
        muted
        loop
        playsInline
        preload="auto"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
      {/* Soft sweep highlight */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.10) 50%, transparent 70%)',
        animation: isOpen ? 'scan-sweep 2.8s ease-in-out 0.6s infinite' : 'none',
        pointerEvents: 'none',
      }} />
    </div>
  );
}

function SplitWordServiceSlide({ phase, service }) {
  const isOpen = phase === 'active';
  return (
    <SlideFrame bg={service.bg}>
      <SlideTransition phase={phase} direction="fade" duration={500}>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '0 50px',
        }}>
          {/* Split-word row */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', height: 520,
            overflow: 'visible',
          }}>
            <span style={{
              flex: 1, textAlign: 'right',
              fontFamily: 'Outfit, system-ui, sans-serif',
              fontWeight: 800, fontSize: 110, lineHeight: 1,
              letterSpacing: '-0.04em',
              color: service.textColor,
              transform: 'translateY(-6px)',
            }}>{service.splitLeft}</span>

            <ServiceTile service={service} isOpen={isOpen} phase={phase} />

            <span style={{
              flex: 1, textAlign: 'left',
              fontFamily: 'Outfit, system-ui, sans-serif',
              fontWeight: 800, fontSize: 110, lineHeight: 1,
              letterSpacing: '-0.04em',
              color: service.textColor,
              transform: 'translateY(-6px)',
            }}>{service.splitRight}</span>
          </div>

          {/* Tagline */}
          <p style={{
            margin: '80px 0 0 0',
            fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 700, fontSize: 56, lineHeight: 1.1,
            letterSpacing: '-0.02em',
            color: service.textColor,
            textAlign: 'center',
            maxWidth: 820,
            opacity: phase === 'active' ? 1 : 0,
            transform: phase === 'active' ? 'translateY(0)' : 'translateY(24px)',
            transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.5s',
          }}>
            {service.tagline}
          </p>
        </div>
      </SlideTransition>
    </SlideFrame>
  );
}

const SERVICES = [
  {
    splitLeft: 'mass', splitRight: 'age',
    bg: C.AQUA, textColor: C.CORAL,
    tileBg: `linear-gradient(180deg, ${C.AQUA} 0%, #C9F7FA 100%)`,
    video: '/workhuman-tv/massage.mp4',
    tagline: 'Stress leaves. Focus returns.',
  },
  {
    splitLeft: 'head', splitRight: 'shots',
    bg: C.NAVY, textColor: C.WHITE,
    tileBg: `linear-gradient(180deg, ${C.BEIGE} 0%, ${C.AQUA} 100%)`,
    video: '/workhuman-tv/headshot.mp4',
    tagline: 'Looking sharp without leaving the office.',
  },
  {
    splitLeft: 'mani', splitRight: 'cure',
    bg: C.PINK, textColor: C.NAVY,
    tileBg: `linear-gradient(180deg, #FFE5FC 0%, ${C.PINK} 100%)`,
    video: '/workhuman-tv/manicure.mp4',
    tagline: 'A little self care between meetings.',
  },
  {
    splitLeft: 'hair', splitRight: 'cut',
    bg: C.YELLOW, textColor: C.NAVY,
    tileBg: `linear-gradient(180deg, #FFF3C0 0%, ${C.YELLOW} 100%)`,
    video: '/workhuman-tv/haircut.mp4',
    tagline: 'Fresh cuts. Zero commute.',
  },
  {
    splitLeft: 'mind', splitRight: 'fulness',
    bg: C.CORAL, textColor: C.WHITE,
    tileBg: `linear-gradient(180deg, ${C.CORAL} 0%, #E83B3B 100%)`,
    video: '/workhuman-tv/mindfulness.mp4',
    tagline: 'Calm minds. Better decisions.',
  },
];

// Exported single-service slides (slides 7-11)
function Slide07_Massage({ phase })     { return <SplitWordServiceSlide phase={phase} service={SERVICES[0]} />; }
function Slide08_Headshots({ phase })   { return <SplitWordServiceSlide phase={phase} service={SERVICES[1]} />; }
function Slide09_Manicure({ phase })    { return <SplitWordServiceSlide phase={phase} service={SERVICES[2]} />; }
function Slide10_Haircut({ phase })     { return <SplitWordServiceSlide phase={phase} service={SERVICES[3]} />; }
function Slide11_Mindfulness({ phase }) { return <SplitWordServiceSlide phase={phase} service={SERVICES[4]} />; }

Object.assign(window, {
  Slide07_Massage, Slide08_Headshots, Slide09_Manicure, Slide10_Haircut, Slide11_Mindfulness,
  SERVICES,
});
