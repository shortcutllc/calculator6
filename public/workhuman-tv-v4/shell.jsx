/* =========================================================
   Shell: slideshow engine + transition wrapper + persistent QR
   ========================================================= */

// Slide orchestration — cycles through slides with enter/active/exit phases.
function useSlideshow(slideCount, durations, initialIndex = 0) {
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);
  const [phase, setPhase] = React.useState('enter');
  const [paused, setPaused] = React.useState(false);
  const countRef = React.useRef(slideCount); countRef.current = slideCount;
  const dursRef  = React.useRef(durations);  dursRef.current  = durations;

  React.useEffect(() => {
    if (paused) {
      // Still advance enter → active so the slide actually appears when
      // we navigate while paused. Just skip the exit → next cycle.
      const enterT = setTimeout(() => setPhase('active'), 500);
      return () => clearTimeout(enterT);
    }
    const dur = dursRef.current[currentIndex] || 6000;
    const enterT = setTimeout(() => setPhase('active'), 500);
    const exitT  = setTimeout(() => setPhase('exit'), dur - 500);
    const nextT  = setTimeout(() => {
      setCurrentIndex(i => (i + 1) % countRef.current);
      setPhase('enter');
    }, dur);
    return () => { clearTimeout(enterT); clearTimeout(exitT); clearTimeout(nextT); };
  }, [currentIndex, paused]);

  // Persist last viewed index
  React.useEffect(() => {
    try { localStorage.setItem('workhuman-tv-idx', String(currentIndex)); } catch (e) {}
  }, [currentIndex]);

  const goTo = React.useCallback((i) => {
    const n = countRef.current;
    setCurrentIndex(((i % n) + n) % n);
    setPhase('enter');
  }, []);
  const next = React.useCallback(() => goTo((currentIndex + 1) % countRef.current), [currentIndex, goTo]);
  const prev = React.useCallback(() => goTo((currentIndex - 1 + countRef.current) % countRef.current), [currentIndex, goTo]);
  const togglePause = React.useCallback(() => setPaused(p => !p), []);

  return { currentIndex, phase, goTo, next, prev, paused, togglePause };
}

// Transition wrapper — fades/slides slide content based on phase
function SlideTransition({ phase, children, direction = 'fade', duration = 600 }) {
  const t = {
    fade:  { enter: 'scale(1.02)',        active: 'scale(1)',       exit: 'scale(0.98)' },
    up:    { enter: 'translateY(60px)',   active: 'translateY(0)',  exit: 'translateY(-40px)' },
    down:  { enter: 'translateY(-60px)',  active: 'translateY(0)',  exit: 'translateY(40px)' },
    left:  { enter: 'translateX(60px)',   active: 'translateX(0)',  exit: 'translateX(-60px)' },
    right: { enter: 'translateX(-60px)',  active: 'translateX(0)',  exit: 'translateX(60px)' },
    scale: { enter: 'scale(0.9)',         active: 'scale(1)',       exit: 'scale(1.05)' },
  }[direction];
  return (
    <div style={{
      position: 'absolute', inset: 0,
      opacity: phase === 'active' ? 1 : 0,
      transform: t[phase],
      transition: `all ${duration}ms cubic-bezier(0.22, 1, 0.36, 1)`,
    }}>
      {children}
    </div>
  );
}

// Base frame — sets background color and ensures full-bleed
function SlideFrame({ bg, children, style }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      backgroundColor: bg,
      display: 'flex',
      overflow: 'hidden',
      ...style,
    }}>
      {children}
    </div>
  );
}

// Persistent QR badge (bottom-left on most slides after the opening hero)
function QRBadge({ visible, theme = 'onDark' }) {
  // theme: 'onDark' (dark bg), 'onCoral' (coral bg), 'onLight' (beige/aqua bg)
  const textColor = theme === 'onLight' ? C.NAVY : C.WHITE;
  return (
    <div style={{
      position: 'absolute', zIndex: 30,
      bottom: 40, left: 40,
      display: 'flex', alignItems: 'center', gap: 20,
      opacity: visible ? 1 : 0,
      transform: visible ? 'scale(1)' : 'scale(0.5)',
      transition: 'all 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
      pointerEvents: 'none',
    }}>
      <QRCode size={170} />
      <div>
        <p style={{
          margin: 0, fontWeight: 800, color: textColor,
          fontSize: 30, lineHeight: 1.05, letterSpacing: '-0.02em',
          fontFamily: 'Outfit, system-ui, sans-serif',
        }}>Book your</p>
        <p style={{
          margin: 0, fontWeight: 800, color: textColor,
          fontSize: 30, lineHeight: 1.05, letterSpacing: '-0.02em',
          fontFamily: 'Outfit, system-ui, sans-serif',
        }}>free massage.</p>
      </div>
    </div>
  );
}

// Small corner logo for non-hero slides
function CornerLogo({ theme = 'onDark' }) {
  const v = theme === 'onLight' ? 'coral-navy' : 'white';
  return (
    <div style={{ position: 'absolute', top: 40, right: 40, zIndex: 30 }}>
      <ShortcutLogo variant={v} size={44} />
    </div>
  );
}

// Persistent small QR for the bottom-left of most slides. Always on.
function QRCorner({ theme = 'onDark' }) {
  const textColor = theme === 'onLight' ? C.NAVY : C.WHITE;
  return (
    <div style={{
      position: 'absolute', zIndex: 40,
      bottom: 40, left: 40,
      display: 'flex', alignItems: 'center', gap: 18,
      pointerEvents: 'none',
    }}>
      <QRCode size={120} fg={C.NAVY} bg={C.WHITE} />
      <p style={{
        margin: 0, fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: 700, fontSize: 20, lineHeight: 1.15,
        color: textColor, letterSpacing: '-0.005em',
        maxWidth: 200,
      }}>Book your<br/>free massage</p>
    </div>
  );
}

Object.assign(window, { useSlideshow, SlideTransition, SlideFrame, QRBadge, CornerLogo, QRCorner });
