/* =========================================================
   App: slide order, durations, HUD, hotkeys, boot
   Revision 1: new order + persistent QR corner
   ========================================================= */

// corner: 'onDark' | 'onLight' | null (skip — slide has its own QR treatment)
const SLIDES = [
  { key: 'qr-hero',       dur: 8000, corner: null,      render: (p) => <Slide01_QRHero phase={p} /> },
  { key: 'hello-wh',      dur: 6000, corner: null,      render: (p) => <Slide02_HelloWorkhuman phase={p} /> },
  { key: 'were-shortcut', dur: 5500, corner: 'onDark',  render: (p) => <Slide03_WeAreShortcut phase={p} /> },
  { key: 'tagline',       dur: 5500, corner: 'onDark',  render: (p) => <Slide04_Tagline phase={p} /> },
  { key: 'benefits',      dur: 5000, corner: 'onDark',  render: (p) => <Slide05a_Benefits phase={p} /> },
  { key: 'buried',        dur: 8500, corner: null,      render: (p) => <Slide05b_Buried phase={p} /> },
  { key: 'the-gap',       dur: 6500, corner: 'onLight', render: (p) => <Slide05d_TheGap phase={p} /> },
  { key: 'what-we-do',    dur: 6000, corner: 'onDark',  render: (p) => <Slide05_WhatWeDo phase={p} /> },
  { key: 'plot-twist',    dur: 9500, corner: 'onDark',  render: (p) => <Slide05c_PlotTwist phase={p} /> },
  { key: 'service-list',  dur: 5500, corner: 'onDark',  render: (p) => <Slide06_ServiceList phase={p} /> },
  { key: 'massage',       dur: 6500, corner: 'onDark',  render: (p) => <Slide07_Massage phase={p} /> },
  { key: 'headshots',     dur: 6500, corner: 'onDark',  render: (p) => <Slide08_Headshots phase={p} /> },
  { key: 'manicure',      dur: 6500, corner: 'onLight', render: (p) => <Slide09_Manicure phase={p} /> },
  { key: 'haircut',       dur: 6500, corner: 'onLight', render: (p) => <Slide10_Haircut phase={p} /> },
  { key: 'mindfulness',   dur: 6500, corner: 'onDark',  render: (p) => <Slide11_Mindfulness phase={p} /> },
  { key: 'ease',          dur: 9500, corner: 'onDark',  render: (p) => <Slide12_Ease phase={p} /> },
  { key: 'scale',         dur: 7500, corner: 'onDark',  render: (p) => <Slide13_Scale phase={p} /> },
  { key: 'proof',         dur: 6000, corner: null,      render: (p) => <Slide14_Proof phase={p} /> },
  { key: 'punchline',     dur: 6500, corner: 'onDark',  render: (p) => <Slide15_Punchline phase={p} /> },
  { key: 'close',         dur: 8000, corner: null,      render: (p) => <Slide16_Close phase={p} /> },
];

function App() {
  const initial = (() => {
    try {
      const qp = new URLSearchParams(location.search).get('slide');
      if (qp !== null) {
        const q = parseInt(qp, 10);
        if (Number.isFinite(q) && q >= 0 && q < SLIDES.length) return q;
      }
      const v = parseInt(localStorage.getItem('workhuman-tv-idx') || '0', 10);
      return Number.isFinite(v) && v >= 0 && v < SLIDES.length ? v : 0;
    } catch (e) { return 0; }
  })();
  // Also support ?pause=1 to freeze auto-advance for screenshotting
  const pauseOnBoot = (() => {
    try { return new URLSearchParams(location.search).get('pause') === '1'; }
    catch (e) { return false; }
  })();

  const { currentIndex, phase, goTo, next, prev, paused, togglePause } =
    useSlideshow(SLIDES.length, SLIDES.map(s => s.dur), initial);

  // Freeze on ?pause=1 for screenshotting / inspection — wait a beat so
  // the first slide reaches its 'active' phase before we halt.
  React.useEffect(() => {
    if (pauseOnBoot && !paused) {
      const t = setTimeout(() => togglePause(), 700);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [hintVisible, setHintVisible] = React.useState(true);
  React.useEffect(() => {
    const t = setTimeout(() => setHintVisible(false), 4000);
    return () => clearTimeout(t);
  }, []);

  // Fullscreen toggle (F key + visible button)
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const toggleFullscreen = React.useCallback(() => {
    const el = document.documentElement;
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (el.requestFullscreen) el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  }, []);
  React.useEffect(() => {
    const onFs = () => setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('webkitfullscreenchange', onFs);
    };
  }, []);

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'j') next();
      else if (e.key === 'ArrowLeft' || e.key === 'k') prev();
      else if (e.key === ' ') { e.preventDefault(); togglePause(); }
      else if (e.key === 'r') { try { localStorage.removeItem('workhuman-tv-idx'); } catch (e) {} goTo(0); }
      else if (e.key === 'g') { document.body.classList.toggle('shot-mode'); }
      else if (e.key === 'f' || e.key === 'F') { toggleFullscreen(); }
      else if (e.key >= '1' && e.key <= '9') {
        const i = parseInt(e.key, 10) - 1;
        if (i < SLIDES.length) goTo(i);
      } else if (e.key === '0') { goTo(9); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, togglePause, goTo, toggleFullscreen]);

  const scale = useStageScale();
  const currentDur = SLIDES[currentIndex].dur;
  const currentCorner = SLIDES[currentIndex].corner;

  return (
    <React.Fragment>
      <div className="tv-stage">
        <div className="tv-screen" style={{ transform: `scale(${scale})` }}>
          {SLIDES.map((s, i) => (
            <div key={s.key} style={{
              position: 'absolute', inset: 0,
              visibility: i === currentIndex ? 'visible' : 'hidden',
              pointerEvents: i === currentIndex ? 'auto' : 'none',
            }}>
              {i === currentIndex ? s.render(phase) : null}
            </div>
          ))}
          {/* Persistent QR corner — always on, skipped on slides that own the QR */}
          {currentCorner ? <QRCorner theme={currentCorner} /> : null}
        </div>
      </div>

      <div className="hud">
        <div className="count">
          {String(currentIndex + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
          {paused ? ' · paused' : ''}
        </div>
        <div className="progress">
          <div
            className="progress-bar"
            key={`${currentIndex}-${phase}-${paused}`}
            style={{
              width: paused ? `${phase === 'active' ? 50 : 0}%` : undefined,
              animation: paused ? 'none' : `progress-fill ${currentDur}ms linear forwards`,
            }}
          />
        </div>
      </div>

      {/* Fullscreen toggle button (always visible, bottom-right) */}
      <button
        type="button"
        onClick={toggleFullscreen}
        title={isFullscreen ? 'Exit fullscreen (F)' : 'Enter fullscreen (F)'}
        style={{
          position: 'fixed', right: 16, bottom: 16, zIndex: 60,
          padding: '10px 14px', borderRadius: 10,
          background: 'rgba(0,0,0,0.6)', color: '#fff',
          border: 'none', cursor: 'pointer',
          fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12, fontWeight: 700,
          letterSpacing: '0.04em', textTransform: 'uppercase',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', gap: 8,
          opacity: 0.85,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {isFullscreen ? (
            <React.Fragment>
              <path d="M8 3v3a2 2 0 0 1-2 2H3" />
              <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
              <path d="M3 16h3a2 2 0 0 1 2 2v3" />
              <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
            </React.Fragment>
          ) : (
            <React.Fragment>
              <path d="M3 7V5a2 2 0 0 1 2-2h2" />
              <path d="M17 3h2a2 2 0 0 1 2 2v2" />
              <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
              <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            </React.Fragment>
          )}
        </svg>
        {isFullscreen ? 'Exit' : 'Fullscreen'}
      </button>

      <div className={`hint ${hintVisible ? '' : 'hidden'}`}>
        ← → nav · space pause · 1–9 jump · f fullscreen · g grid · r reset
      </div>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
