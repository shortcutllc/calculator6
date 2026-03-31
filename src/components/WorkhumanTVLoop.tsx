import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================
// Workhuman TV Content Loop — Portrait (9:16) vertical screen
// Story flow: QR → Problem → Pivot → Logo → Services → Platform → Ease → Close
// QR persists in bottom-left after initial full-screen display
// ============================================================

// Brand colors
const NAVY = '#003756';
const CORAL = '#FF5050';
const TEAL = '#9EFAFF';
const YELLOW = '#FEDC64';
const PINK = '#F7BBFF';

// Service definitions with video paths, copy, and explicit word split points
// Split points match the HomeHero.vue pattern (e.g. "mass" + "age")
const SERVICES = [
  { splitLeft: 'mass', splitRight: 'age', video: '/workhuman-tv/massage.mp4', tagline: 'Stress leaves. Focus returns.', color: TEAL, textColor: CORAL },
  { splitLeft: 'head', splitRight: 'shots', video: '/workhuman-tv/headshot.mp4', tagline: 'Looking sharp without leaving the office.', color: NAVY, textColor: '#FFFFFF' },
  { splitLeft: 'mani', splitRight: 'cure', video: '/workhuman-tv/manicure.mp4', tagline: 'A little self care between meetings.', color: PINK, textColor: NAVY },
  { splitLeft: 'hair', splitRight: 'cut', video: '/workhuman-tv/haircut.mp4', tagline: 'Fresh cuts. Zero commute.', color: YELLOW, textColor: NAVY },
  { splitLeft: 'mind', splitRight: 'fulness', video: '/workhuman-tv/mindfulness.mp4', tagline: 'Calm minds. Better decisions.', color: CORAL, textColor: '#FFFFFF' },
];

// --- Shortcut Logo SVG ---
function ShortcutLogo({ variant, size }: { variant: 'coral' | 'navy' | 'white'; size: number }) {
  const iconColor = variant === 'coral' ? '#FF5050' : variant === 'white' ? '#FFFFFF' : '#003756';
  const wordmarkColor = variant === 'coral' ? '#FF5050' : variant === 'white' ? '#FFFFFF' : '#003C5E';
  const scale = size / 192;
  const width = 1162 * scale;

  return (
    <svg width={width} height={size} viewBox="0 0 1162 192" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g>
        <path fillRule="evenodd" clipRule="evenodd" d="M180.085 123.273C178.523 136.95 174.332 150.363 166.404 161.789C147.666 188.794 115.391 197.809 83.505 187.975C52.0357 178.27 21.5169 150.798 0 106.28L29.4336 92.0535C48.1724 130.823 72.6235 150.408 93.1396 156.736C113.239 162.935 129.965 156.958 139.545 143.152C141.253 140.691 142.721 137.91 143.935 134.846C142.091 134.947 140.246 134.979 138.402 134.945C117.189 134.548 97.7708 125.343 83.1568 112.659C68.6417 100.062 57.4983 82.8406 54.2488 64.5611C50.855 45.4703 56.3132 25.3828 74.6228 11.3512C83.191 4.78496 92.5896 0.887791 102.475 0.134123C112.334 -0.61748 121.541 1.84316 129.627 6.17627C145.351 14.6033 157.577 30.4138 165.925 47.3746C171.212 58.1174 175.313 70.0533 177.861 82.3164C192.547 66.6019 208.52 57.2563 222.041 52.0055C229.027 49.2927 235.456 47.6337 240.848 46.7633C245.575 46.0002 251.284 45.5405 256.04 46.6381L248.689 78.4922C249.256 78.6231 249.56 78.669 249.56 78.669C249.558 78.6929 248.483 78.6453 246.058 79.0368C243.004 79.5298 238.792 80.5701 233.876 82.4796C224.082 86.2829 211.873 93.3814 200.548 105.942C194.094 113.1 187.222 118.845 180.085 123.273ZM147.727 101.517C146.5 87.8421 142.494 73.7985 136.594 61.8105C129.869 48.148 121.609 38.9693 114.185 34.9907C110.696 33.1211 107.663 32.5248 104.96 32.7309C102.284 32.9349 98.8002 34.0099 94.5082 37.2992C87.0974 42.9785 84.9004 50.2039 86.4355 58.8393C88.1148 68.2858 94.4842 79.2038 104.585 87.9699C114.586 96.6501 126.886 102.033 139.013 102.259C141.841 102.312 144.754 102.088 147.727 101.517Z" fill={iconColor}/>
        <path fillRule="evenodd" clipRule="evenodd" d="M227.95 60.6342C212.285 55.7034 200.552 45.6102 190.79 34.575L215.742 12.5006C223.559 21.3371 230.444 26.4925 237.953 28.8562C245.287 31.1646 255.432 31.4939 271.035 26.2883L284.604 56.5339C273.057 63.1664 266.67 73.9685 263.648 85.1433C262.14 90.7193 261.573 96.0733 261.599 100.426C261.625 104.815 262.24 107.049 262.315 107.323C262.322 107.346 262.322 107.35 262.322 107.35L231.654 120.365C229.232 114.657 228.325 107.44 228.284 100.627C228.241 93.4035 229.161 85.049 231.488 76.4463C232.7 71.9629 234.323 67.3261 236.435 62.7047C233.55 62.1969 230.724 61.5071 227.95 60.6342Z" fill={iconColor}/>
      </g>
      <g transform="translate(319.6,17.5)">
        <path d="M47.1577 156.768C41.0683 156.768 35.0497 155.989 29.1019 154.431C23.2956 152.874 17.8435 150.679 12.7453 147.846C7.78882 144.872 3.54037 141.474 2.6537e-06 137.65L18.4807 118.957C21.8795 122.639 25.9155 125.542 30.5888 127.666C35.2621 129.649 40.3602 130.64 45.8832 130.64C49.7068 130.64 52.6099 130.074 54.5925 128.941C56.7167 127.808 57.7789 126.25 57.7789 124.268C57.7789 121.718 56.5043 119.807 53.9552 118.532C51.5478 117.116 48.4323 115.912 44.6087 114.921C40.7851 113.788 36.749 112.584 32.5006 111.31C28.2522 110.035 24.2161 108.265 20.3925 105.999C16.5689 103.733 13.4534 100.618 11.046 96.6526C8.63851 92.5458 7.43478 87.3768 7.43478 81.1458C7.43478 74.4899 9.13416 68.7545 12.5329 63.9396C15.9317 58.9831 20.7466 55.0887 26.9776 52.2564C33.2087 49.4241 40.5018 48.0079 48.8571 48.0079C57.6372 48.0079 65.7093 49.5657 73.0732 52.6812C80.5788 55.6551 86.6683 60.116 91.3416 66.0638L72.8608 84.757C69.6037 80.9334 65.9217 78.2427 61.8149 76.6849C57.8497 75.1272 53.9553 74.3483 50.1316 74.3483C46.4497 74.3483 43.6882 74.9147 41.8472 76.0477C40.0062 77.039 39.0857 78.5259 39.0857 80.5085C39.0857 82.6328 40.2894 84.3321 42.6969 85.6067C45.1043 86.8812 48.2198 88.0141 52.0434 89.0054C55.867 89.9967 59.9031 91.2004 64.1515 92.6166C68.4 94.0327 72.436 95.9445 76.2596 98.352C80.0832 100.759 83.1987 104.017 85.6062 108.123C88.0136 112.089 89.2173 117.328 89.2173 123.843C89.2173 133.897 85.3937 141.899 77.7465 147.846C70.241 153.794 60.0447 156.768 47.1577 156.768Z" fill={wordmarkColor}/>
        <path d="M176.517 154.219V95.3776C176.517 89.9962 174.817 85.677 171.419 82.4198C168.161 79.0211 163.984 77.3217 158.886 77.3217C155.345 77.3217 152.23 78.1006 149.539 79.6583C146.848 81.0745 144.724 83.1987 143.166 86.031C141.609 88.7217 140.83 91.8372 140.83 95.3776L128.297 89.2173C128.297 81.1453 129.996 74.0646 133.395 67.9751C136.794 61.8857 141.538 57.2124 147.627 53.9552C153.717 50.5565 160.727 48.8571 168.657 48.8571C176.729 48.8571 183.81 50.5565 189.899 53.9552C195.989 57.2124 200.662 61.8149 203.919 67.7627C207.318 73.5689 209.017 80.3664 209.017 88.1552V154.219H176.517ZM108.329 154.219V1.06148e-05H140.83V154.219H108.329Z" fill={wordmarkColor}/>
        <path d="M281.818 156.555C271.197 156.555 261.567 154.218 252.929 149.545C244.432 144.73 237.705 138.216 232.749 130.002C227.792 121.788 225.314 112.583 225.314 102.387C225.314 92.1908 227.792 83.0566 232.749 74.9846C237.705 66.9126 244.432 60.5399 252.929 55.8666C261.426 51.0517 271.056 48.6442 281.818 48.6442C292.581 48.6442 302.211 50.9809 310.708 55.6542C319.205 60.3275 325.931 66.7709 330.888 74.9846C335.844 83.0566 338.323 92.1908 338.323 102.387C338.323 112.583 335.844 121.788 330.888 130.002C325.931 138.216 319.205 144.73 310.708 149.545C302.211 154.218 292.581 156.555 281.818 156.555ZM281.818 127.028C286.492 127.028 290.598 126.037 294.139 124.054C297.679 121.93 300.37 119.027 302.211 115.345C304.193 111.521 305.185 107.202 305.185 102.387C305.185 97.5722 304.193 93.3945 302.211 89.8542C300.228 86.1722 297.467 83.3399 293.926 81.3573C290.528 79.233 286.492 78.1709 281.818 78.1709C277.287 78.1709 273.251 79.233 269.71 81.3573C266.17 83.3399 263.408 86.1722 261.426 89.8542C259.443 93.5361 258.452 97.7846 258.452 102.599C258.452 107.273 259.443 111.521 261.426 115.345C263.408 119.027 266.17 121.93 269.71 124.054C273.251 126.037 277.287 127.028 281.818 127.028Z" fill={wordmarkColor}/>
        <path d="M354.503 154.219V50.9814H387.004V154.219H354.503ZM387.004 97.5019L373.409 86.8808C376.1 74.8435 380.631 65.4969 387.004 58.841C393.377 52.1851 402.228 48.8572 413.557 48.8572C418.513 48.8572 422.833 49.636 426.515 51.1938C430.338 52.61 433.666 54.8758 436.498 57.9913L417.168 82.4199C415.752 80.8621 413.982 79.6584 411.857 78.8087C409.733 77.959 407.326 77.5342 404.635 77.5342C399.254 77.5342 394.934 79.2335 391.677 82.6323C388.562 85.8894 387.004 90.846 387.004 97.5019Z" fill={wordmarkColor}/>
        <path d="M469.727 154.219V8.28468H502.227V154.219H469.727ZM446.36 78.5964V50.9816H525.594V78.5964H446.36Z" fill={wordmarkColor}/>
        <path d="M592.198 156.555C581.577 156.555 571.947 154.218 563.309 149.545C554.67 144.872 547.873 138.428 542.916 130.214C537.96 122.001 535.481 112.796 535.481 102.599C535.481 92.2616 537.96 83.0566 542.916 74.9846C548.014 66.7709 554.883 60.3275 563.521 55.6542C572.16 50.9809 581.86 48.6442 592.623 48.6442C600.695 48.6442 608.059 50.0604 614.715 52.8927C621.512 55.5834 627.531 59.6902 632.771 65.2132L611.953 86.0306C609.546 83.3399 606.714 81.3573 603.456 80.0827C600.341 78.8082 596.73 78.1709 592.623 78.1709C587.95 78.1709 583.772 79.233 580.09 81.3573C576.55 83.3399 573.717 86.1722 571.593 89.8542C569.611 93.3945 568.619 97.5722 568.619 102.387C568.619 107.202 569.611 111.45 571.593 115.132C573.717 118.814 576.62 121.717 580.302 123.842C583.984 125.966 588.091 127.028 592.623 127.028C596.871 127.028 600.624 126.32 603.881 124.904C607.28 123.346 610.183 121.222 612.591 118.531L633.196 139.349C627.814 145.013 621.725 149.332 614.927 152.306C608.13 155.139 600.553 156.555 592.198 156.555Z" fill={wordmarkColor}/>
        <path d="M697.243 156.556C687.755 156.556 679.329 154.644 671.965 150.82C664.742 146.855 659.078 141.474 654.971 134.676C650.864 127.737 648.811 119.807 648.811 110.885V50.9818H681.311V110.46C681.311 114 681.878 117.045 683.011 119.594C684.285 122.143 686.126 124.126 688.534 125.542C690.941 126.958 693.844 127.666 697.243 127.666C702.058 127.666 705.882 126.179 708.714 123.205C711.546 120.09 712.962 115.841 712.962 110.46V50.9818H745.463V110.672C745.463 119.736 743.409 127.737 739.303 134.676C735.196 141.474 729.531 146.855 722.309 150.82C715.086 154.644 706.731 156.556 697.243 156.556Z" fill={wordmarkColor}/>
        <path d="M786.444 154.219V8.28468H818.945V154.219H786.444ZM763.078 78.5964V50.9816H842.311V78.5964H763.078Z" fill={wordmarkColor}/>
      </g>
    </svg>
  );
}

// --- QR Code placeholder ---
function QRPlaceholder({ size = 200 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center"
      style={{ width: size, height: size, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16 }}
    >
      <svg width={size - 32} height={size - 32} viewBox="0 0 21 21">
        <rect x="0" y="0" width="7" height="7" fill={NAVY} />
        <rect x="1" y="1" width="5" height="5" fill="white" />
        <rect x="2" y="2" width="3" height="3" fill={NAVY} />
        <rect x="14" y="0" width="7" height="7" fill={NAVY} />
        <rect x="15" y="1" width="5" height="5" fill="white" />
        <rect x="16" y="2" width="3" height="3" fill={NAVY} />
        <rect x="0" y="14" width="7" height="7" fill={NAVY} />
        <rect x="1" y="15" width="5" height="5" fill="white" />
        <rect x="2" y="16" width="3" height="3" fill={NAVY} />
        {[
          [8,0],[10,0],[8,2],[9,3],[10,2],[11,1],[12,3],
          [0,8],[2,8],[3,9],[4,8],[1,10],[3,10],[5,9],
          [8,8],[9,9],[10,8],[11,9],[12,10],[8,10],[10,10],
          [14,8],[15,9],[16,10],[17,8],[18,9],[19,10],[20,8],
          [8,14],[9,15],[10,14],[11,15],[12,16],[8,16],[10,16],
        ].map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="1" height="1" fill={NAVY} />
        ))}
      </svg>
    </div>
  );
}

// --- Slideshow engine (stable ref, no infinite re-render) ---
function useSlideshow(slideCount: number, durations: number[]) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<'enter' | 'active' | 'exit'>('enter');
  const [paused, setPaused] = useState(false);
  const durationsRef = useRef(durations);
  durationsRef.current = durations;
  const countRef = useRef(slideCount);
  countRef.current = slideCount;

  useEffect(() => {
    if (paused) return; // Don't set timers when paused
    const duration = durationsRef.current[currentIndex] || 6000;

    const enterTimer = setTimeout(() => setPhase('active'), 600);
    const exitTimer = setTimeout(() => setPhase('exit'), duration - 600);
    const nextTimer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % countRef.current);
      setPhase('enter');
    }, duration);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(nextTimer);
    };
  }, [currentIndex, paused]);

  const goTo = useCallback((index: number) => {
    setCurrentIndex(((index % countRef.current) + countRef.current) % countRef.current);
    setPhase('enter');
    // When navigating while paused, briefly unpause to trigger enter→active + animations, then re-pause
    if (paused) {
      setPaused(false);
      setTimeout(() => setPaused(true), 2500);
    }
  }, [paused]);

  const togglePause = useCallback(() => setPaused(p => !p), []);

  return { currentIndex, phase, goTo, paused, togglePause };
}

// --- Persistent QR badge (bottom-left after slide 1) ---
function QRBadge({ visible }: { visible: boolean }) {
  return (
    <div
      className="absolute z-30 flex items-center gap-3"
      style={{
        bottom: 32,
        left: 32,
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : 'scale(0.5)',
        transition: 'all 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
        pointerEvents: 'none',
      }}
    >
      <QRPlaceholder size={100} />
      <div>
        <p className="font-extrabold text-white" style={{ fontSize: 14, fontFamily: 'Outfit, system-ui, sans-serif' }}>
          Book your
        </p>
        <p className="font-extrabold text-white" style={{ fontSize: 14, fontFamily: 'Outfit, system-ui, sans-serif' }}>
          free massage
        </p>
      </div>
    </div>
  );
}

// --- Transition wrapper ---
function SlideTransition({ phase, children, direction = 'up' }: {
  phase: 'enter' | 'active' | 'exit';
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'fade' | 'scale' | 'left';
}) {
  const transforms: Record<string, Record<string, string>> = {
    up: { enter: 'translateY(60px)', active: 'translateY(0)', exit: 'translateY(-40px)' },
    down: { enter: 'translateY(-60px)', active: 'translateY(0)', exit: 'translateY(40px)' },
    left: { enter: 'translateX(60px)', active: 'translateX(0)', exit: 'translateX(-60px)' },
    fade: { enter: 'scale(1.02)', active: 'scale(1)', exit: 'scale(0.98)' },
    scale: { enter: 'scale(0.85)', active: 'scale(1)', exit: 'scale(1.05)' },
  };

  return (
    <div
      className="absolute inset-0"
      style={{
        opacity: phase === 'active' ? 1 : 0,
        transform: transforms[direction][phase],
        transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {children}
    </div>
  );
}

// --- Service video slide with split-word reveal ---
// Matches HomeHero.vue from getshortcut.co exactly:
// - Horizontal flex row: leftText + video + rightText
// - Video starts width:0, expands to 30% with 10px margin
// - 3:4 portrait aspect ratio, rounded-[20px]
// - Text: Outfit ExtraBold, coral (#FF5050), tracking -0.03em
// - Container: rounded-[33px], teal bg per original
// - Easing: expo.out (CSS approximation: cubic-bezier(0.16, 1, 0.3, 1))
function ServiceSlide({ service, phase }: {
  service: typeof SERVICES[0];
  phase: 'enter' | 'active' | 'exit';
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (phase === 'active' && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [phase]);

  const isOpen = phase === 'active';

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ backgroundColor: service.color }}>
      {/* Wrapper: split-word row + tagline share the same centering context */}
      <div className="flex flex-col items-center" style={{ width: '85%' }}>
        {/* Split-word row */}
        <div
          className="flex items-center justify-center overflow-hidden"
          style={{
            borderRadius: 33,
            width: '100%',
            height: '45vh',
            backgroundColor: service.color,
          }}
        >
          {/* Left half of word */}
          <span
            className="font-extrabold tracking-[-0.03em] block"
            style={{
              fontSize: 'clamp(52px, 10vh, 96px)',
              lineHeight: 1,
              color: service.textColor,
              fontFamily: 'Outfit, system-ui, sans-serif',
              transform: 'translateY(-4px)',
              flex: 1,
              textAlign: 'right',
            }}
          >
            {service.splitLeft}
          </span>

          {/* Video — width animates from 0 to 30%, 3:4 aspect, rounded-20 */}
          <video
            ref={videoRef}
            muted
            loop
            playsInline
            className="object-cover block"
            src={service.video}
            style={{
              width: isOpen ? '30%' : '0%',
              aspectRatio: '3 / 4',
              borderRadius: 20,
              marginInline: isOpen ? 10 : 0,
              transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1), margin 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
              flexShrink: 0,
            }}
          />

          {/* Right half of word */}
          <span
            className="font-extrabold tracking-[-0.03em] block"
            style={{
              fontSize: 'clamp(52px, 10vh, 96px)',
              lineHeight: 1,
              color: service.textColor,
              fontFamily: 'Outfit, system-ui, sans-serif',
              transform: 'translateY(-4px)',
              flex: 1,
              textAlign: 'left',
            }}
          >
            {service.splitRight}
          </span>
        </div>

        {/* Tagline — same parent width as split-word row, centers within that shared box */}
        <p
          className="font-bold"
          style={{
            fontSize: 'clamp(18px, 3vh, 30px)',
            color: service.textColor,
            fontFamily: 'Outfit, system-ui, sans-serif',
            textAlign: 'center',
            width: '100%',
            marginTop: 'clamp(16px, 3vh, 32px)',
            opacity: phase === 'active' ? 1 : 0,
            transform: phase === 'active' ? 'translateY(0)' : 'translateY(16px)',
            transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.3s',
          }}
        >
          {service.tagline}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

// ============================================================
// V2 — Refined narrative (8 slides)
// ============================================================
function V2Loop({ phase, currentIndex }: { phase: 'enter' | 'active' | 'exit'; currentIndex: number }) {
  return (
    <>
      {/* ====== SLIDE 0: QR HERO ====== */}
      {currentIndex === 0 && (
        <SlideTransition phase={phase} direction="scale">
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ backgroundColor: CORAL }}>
            <p
              className="font-extrabold text-center tracking-[-0.03em] mb-12"
              style={{ fontSize: 'clamp(36px, 6vh, 64px)', color: '#FFFFFF', fontFamily: 'Outfit, system-ui, sans-serif' }}
            >
              Book Your<br />Free Massage
            </p>
            <QRPlaceholder size={280} />
            <p
              className="font-bold mt-8"
              style={{ fontSize: 'clamp(16px, 2.5vh, 24px)', color: '#FFFFFF', opacity: 0.8, fontFamily: 'Outfit, system-ui, sans-serif' }}
            >
              Scan to reserve your spot
            </p>
            {/* Animated logo — same Jitter sequence, white on coral */}
            <div className="flex items-center mt-12">
              <div
                style={{
                  flexShrink: 0,
                  animation: phase === 'active'
                    ? 'logo-overshoot 0.4s cubic-bezier(0.22, 1, 0.36, 1) 1.0s forwards, logo-slide-left 0.6s cubic-bezier(0.22, 1, 0.36, 1) 1.1s forwards'
                    : 'none',
                  transform: 'translateX(100px) scale(1.1)',
                }}
              >
                <svg width="56" height="42" viewBox="0 0 285 192" fill="none"
                  style={{
                    animation: phase === 'active' ? 'logo-icon-scale 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.5s forwards' : 'none',
                    transform: 'scale(0)', opacity: 0,
                  }}
                >
                  <path fillRule="evenodd" clipRule="evenodd" d="M180.085 123.273C178.523 136.95 174.332 150.363 166.404 161.789C147.666 188.794 115.391 197.809 83.505 187.975C52.0357 178.27 21.5169 150.798 0 106.28L29.4336 92.0535C48.1724 130.823 72.6235 150.408 93.1396 156.736C113.239 162.935 129.965 156.958 139.545 143.152C141.253 140.691 142.721 137.91 143.935 134.846C142.091 134.947 140.246 134.979 138.402 134.945C117.189 134.548 97.7708 125.343 83.1568 112.659C68.6417 100.062 57.4983 82.8406 54.2488 64.5611C50.855 45.4703 56.3132 25.3828 74.6228 11.3512C83.191 4.78496 92.5896 0.887791 102.475 0.134123C112.334 -0.61748 121.541 1.84316 129.627 6.17627C145.351 14.6033 157.577 30.4138 165.925 47.3746C171.212 58.1174 175.313 70.0533 177.861 82.3164C192.547 66.6019 208.52 57.2563 222.041 52.0055C229.027 49.2927 235.456 47.6337 240.848 46.7633C245.575 46.0002 251.284 45.5405 256.04 46.6381L248.689 78.4922C249.256 78.6231 249.56 78.669 249.56 78.669C249.558 78.6929 248.483 78.6453 246.058 79.0368C243.004 79.5298 238.792 80.5701 233.876 82.4796C224.082 86.2829 211.873 93.3814 200.548 105.942C194.094 113.1 187.222 118.845 180.085 123.273ZM147.727 101.517C146.5 87.8421 142.494 73.7985 136.594 61.8105C129.869 48.148 121.609 38.9693 114.185 34.9907C110.696 33.1211 107.663 32.5248 104.96 32.7309C102.284 32.9349 98.8002 34.0099 94.5082 37.2992C87.0974 42.9785 84.9004 50.2039 86.4355 58.8393C88.1148 68.2858 94.4842 79.2038 104.585 87.9699C114.586 96.6501 126.886 102.033 139.013 102.259C141.841 102.312 144.754 102.088 147.727 101.517Z" fill="#FFFFFF"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M227.95 60.6342C212.285 55.7034 200.552 45.6102 190.79 34.575L215.742 12.5006C223.559 21.3371 230.444 26.4925 237.953 28.8562C245.287 31.1646 255.432 31.4939 271.035 26.2883L284.604 56.5339C273.057 63.1664 266.67 73.9685 263.648 85.1433C262.14 90.7193 261.573 96.0733 261.599 100.426C261.625 104.815 262.24 107.049 262.315 107.323C262.322 107.346 262.322 107.35 262.322 107.35L231.654 120.365C229.232 114.657 228.325 107.44 228.284 100.627C228.241 93.4035 229.161 85.049 231.488 76.4463C232.7 71.9629 234.323 67.3261 236.435 62.7047C233.55 62.1969 230.724 61.5071 227.95 60.6342Z" fill="#FFFFFF"/>
                </svg>
              </div>
              <div className="flex items-center overflow-visible" style={{ marginLeft: 10, height: 36 }}>
                {['s','h','o','r','t','c','u','t'].map((letter, i) => (
                  <span key={i} className="inline-block overflow-hidden" style={{ height: 36 }}>
                    <span className="inline-block font-extrabold" style={{
                      fontSize: 36, lineHeight: 1, color: '#FFFFFF', fontFamily: 'Outfit, system-ui, sans-serif',
                      letterSpacing: '-0.02em',
                      animation: phase === 'active' ? `word-mask-up 0.3s cubic-bezier(0.22, 1, 0.36, 1) ${1.6 + i * 0.04}s forwards` : 'none',
                      transform: 'translateY(100%)', opacity: 0,
                    }}>{letter}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </SlideTransition>
      )}

      {/* ====== SLIDE 1: WELCOME + LOGO REVEAL ====== */}
      {currentIndex === 1 && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{
            backgroundColor: NAVY,
            opacity: phase === 'enter' ? 0 : phase === 'exit' ? 0 : 1,
            transition: 'opacity 0.4s ease',
          }}
        >
          <p
            className="font-bold tracking-[-0.01em] mb-8"
            style={{
              fontSize: 'clamp(18px, 2.5vh, 28px)', color: 'rgba(255,255,255,0.5)',
              fontFamily: 'Outfit, system-ui, sans-serif',
              animation: phase === 'active' ? 'tagline-pan-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.2s forwards' : 'none',
              opacity: 0, transform: 'translateY(20px)',
            }}
          >
            Welcome to
          </p>
          {/* Jitter logo animation */}
          <div className="flex items-center" style={{ marginTop: 0 }}>
            <div style={{
              flexShrink: 0,
              animation: phase === 'active'
                ? 'logo-overshoot 0.4s cubic-bezier(0.22, 1, 0.36, 1) 0.7s forwards, logo-slide-left 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.8s forwards'
                : 'none',
              transform: 'translateX(140px) scale(1.1)',
            }}>
              <svg width="80" height="60" viewBox="0 0 285 192" fill="none" style={{
                animation: phase === 'active' ? 'logo-icon-scale 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.3s forwards' : 'none',
                transform: 'scale(0)', opacity: 0,
              }}>
                <path fillRule="evenodd" clipRule="evenodd" d="M180.085 123.273C178.523 136.95 174.332 150.363 166.404 161.789C147.666 188.794 115.391 197.809 83.505 187.975C52.0357 178.27 21.5169 150.798 0 106.28L29.4336 92.0535C48.1724 130.823 72.6235 150.408 93.1396 156.736C113.239 162.935 129.965 156.958 139.545 143.152C141.253 140.691 142.721 137.91 143.935 134.846C142.091 134.947 140.246 134.979 138.402 134.945C117.189 134.548 97.7708 125.343 83.1568 112.659C68.6417 100.062 57.4983 82.8406 54.2488 64.5611C50.855 45.4703 56.3132 25.3828 74.6228 11.3512C83.191 4.78496 92.5896 0.887791 102.475 0.134123C112.334 -0.61748 121.541 1.84316 129.627 6.17627C145.351 14.6033 157.577 30.4138 165.925 47.3746C171.212 58.1174 175.313 70.0533 177.861 82.3164C192.547 66.6019 208.52 57.2563 222.041 52.0055C229.027 49.2927 235.456 47.6337 240.848 46.7633C245.575 46.0002 251.284 45.5405 256.04 46.6381L248.689 78.4922C249.256 78.6231 249.56 78.669 249.56 78.669C249.558 78.6929 248.483 78.6453 246.058 79.0368C243.004 79.5298 238.792 80.5701 233.876 82.4796C224.082 86.2829 211.873 93.3814 200.548 105.942C194.094 113.1 187.222 118.845 180.085 123.273ZM147.727 101.517C146.5 87.8421 142.494 73.7985 136.594 61.8105C129.869 48.148 121.609 38.9693 114.185 34.9907C110.696 33.1211 107.663 32.5248 104.96 32.7309C102.284 32.9349 98.8002 34.0099 94.5082 37.2992C87.0974 42.9785 84.9004 50.2039 86.4355 58.8393C88.1148 68.2858 94.4842 79.2038 104.585 87.9699C114.586 96.6501 126.886 102.033 139.013 102.259C141.841 102.312 144.754 102.088 147.727 101.517Z" fill={CORAL}/>
                <path fillRule="evenodd" clipRule="evenodd" d="M227.95 60.6342C212.285 55.7034 200.552 45.6102 190.79 34.575L215.742 12.5006C223.559 21.3371 230.444 26.4925 237.953 28.8562C245.287 31.1646 255.432 31.4939 271.035 26.2883L284.604 56.5339C273.057 63.1664 266.67 73.9685 263.648 85.1433C262.14 90.7193 261.573 96.0733 261.599 100.426C261.625 104.815 262.24 107.049 262.315 107.323C262.322 107.346 262.322 107.35 262.322 107.35L231.654 120.365C229.232 114.657 228.325 107.44 228.284 100.627C228.241 93.4035 229.161 85.049 231.488 76.4463C232.7 71.9629 234.323 67.3261 236.435 62.7047C233.55 62.1969 230.724 61.5071 227.95 60.6342Z" fill={CORAL}/>
              </svg>
            </div>
            <div className="flex items-center overflow-visible" style={{ marginLeft: 14, height: 50 }}>
              {['s','h','o','r','t','c','u','t'].map((letter, i) => (
                <span key={i} className="inline-block overflow-hidden" style={{ height: 50 }}>
                  <span className="inline-block font-extrabold" style={{
                    fontSize: 50, lineHeight: 1, color: '#FFFFFF', fontFamily: 'Outfit, system-ui, sans-serif',
                    letterSpacing: '-0.02em',
                    animation: phase === 'active' ? `word-mask-up 0.3s cubic-bezier(0.22, 1, 0.36, 1) ${1.3 + i * 0.04}s forwards` : 'none',
                    transform: 'translateY(100%)', opacity: 0,
                  }}>{letter}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ====== SLIDE 2: WHAT WE DO ====== */}
      {currentIndex === 2 && (
        <SlideTransition phase={phase} direction="up">
          <div className="absolute inset-0 flex items-center justify-center px-10" style={{ backgroundColor: NAVY }}>
            <p
              className="font-extrabold text-center tracking-[-0.03em]"
              style={{ fontSize: 'clamp(32px, 6vh, 60px)', lineHeight: 1.1, color: '#FFFFFF', fontFamily: 'Outfit, system-ui, sans-serif' }}
            >
              We bring massage, beauty, and wellness directly to your office.
            </p>
          </div>
        </SlideTransition>
      )}

      {/* ====== SLIDE 3: SERVICE LIST GLIDE ====== */}
      {currentIndex === 3 && (
        <div
          className="absolute inset-0 flex items-center"
          style={{
            backgroundColor: NAVY,
            opacity: phase === 'enter' ? 0 : phase === 'exit' ? 0 : 1,
            transition: 'opacity 0.4s ease',
          }}
        >
          <div className="w-full" style={{ paddingLeft: '7%', paddingTop: '6%' }}>
            {[
              { name: 'Massage', color: TEAL },
              { name: 'Nails', color: PINK },
              { name: 'Haircut', color: YELLOW },
              { name: 'Beauty', color: PINK },
              { name: 'Mindfulness', color: YELLOW },
              { name: 'Headshots', color: TEAL },
            ].map((service, i) => (
              <p
                key={service.name}
                className="font-bold tracking-[-0.01em]"
                style={{
                  fontSize: 'clamp(40px, 8vh, 80px)', lineHeight: 1.0, color: service.color,
                  fontFamily: 'Outfit, system-ui, sans-serif',
                  animation: phase === 'active'
                    ? `glide-in-right 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${i * 0.12}s forwards, glide-back-left 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${0.9 + i * 0.08}s forwards`
                    : 'none',
                  transform: 'translateX(-120%)', opacity: 0,
                }}
              >
                {service.name}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* ====== SLIDE 4: THE EXPERIENCE (video + copy) ====== */}
      {currentIndex === 4 && (
        <SlideTransition phase={phase} direction="fade">
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ backgroundColor: NAVY }}>
            {/* Video placeholder — gradient for now */}
            <div
              className="relative overflow-hidden mx-8 mb-8"
              style={{
                width: '80%', aspectRatio: '3 / 4', borderRadius: 20,
                background: `linear-gradient(135deg, ${NAVY} 0%, #004d6d 50%, #006080 100%)`,
              }}
            >
              {/* TODO: Replace with cycling <video> of services */}
              <div className="absolute inset-0 flex items-center justify-center">
                <ShortcutLogo variant="white" size={40} />
              </div>
            </div>
            <p
              className="font-extrabold text-center tracking-[-0.03em] px-8"
              style={{
                fontSize: 'clamp(24px, 4vh, 44px)', lineHeight: 1.15, color: '#FFFFFF',
                fontFamily: 'Outfit, system-ui, sans-serif',
                animation: phase === 'active' ? 'tagline-pan-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.4s forwards' : 'none',
                opacity: 0, transform: 'translateY(30px)',
              }}
            >
              We transform a conference room into something your team actually looks forward to.
            </p>
          </div>
        </SlideTransition>
      )}

      {/* ====== SLIDE 5: THE EASE ====== */}
      {currentIndex === 5 && (
        <SlideTransition phase={phase} direction="up">
          <div className="absolute inset-0 flex flex-col items-center justify-center px-10" style={{ backgroundColor: CORAL }}>
            <p
              className="font-extrabold text-center tracking-[-0.03em]"
              style={{ fontSize: 'clamp(28px, 5vh, 52px)', lineHeight: 1.15, color: '#FFFFFF', fontFamily: 'Outfit, system-ui, sans-serif' }}
            >
              You provide the space.
            </p>
            <p
              className="font-extrabold text-center tracking-[-0.03em] mt-2"
              style={{ fontSize: 'clamp(28px, 5vh, 52px)', lineHeight: 1.15, color: NAVY, fontFamily: 'Outfit, system-ui, sans-serif' }}
            >
              We handle the rest.
            </p>
            <div className="mt-10 space-y-2">
              {['Scheduling.', 'Sign ups.', 'Reminders.', 'Setup.', 'Cleanup.', 'Everything.'].map((item, i) => (
                <p
                  key={item}
                  className="font-bold text-center"
                  style={{
                    fontSize: 'clamp(18px, 3vh, 30px)', color: 'rgba(255,255,255,0.7)',
                    fontFamily: 'Outfit, system-ui, sans-serif',
                    animation: phase === 'active'
                      ? `tagline-pan-up 0.4s cubic-bezier(0.22, 1, 0.36, 1) ${0.5 + i * 0.15}s forwards`
                      : 'none',
                    opacity: 0, transform: 'translateY(20px)',
                  }}
                >
                  {item}
                </p>
              ))}
            </div>
          </div>
        </SlideTransition>
      )}

      {/* ====== SLIDE 6: THE SCALE ====== */}
      {currentIndex === 6 && (
        <SlideTransition phase={phase} direction="left">
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8" style={{ backgroundColor: NAVY }}>
            <p
              className="font-extrabold text-center tracking-[-0.04em]"
              style={{ fontSize: 'clamp(36px, 7vh, 76px)', lineHeight: 1.05, color: '#FFFFFF', fontFamily: 'Outfit, system-ui, sans-serif' }}
            >
              One vendor.
            </p>
            <p
              className="font-extrabold text-center tracking-[-0.04em] mt-2"
              style={{ fontSize: 'clamp(36px, 7vh, 76px)', lineHeight: 1.05, color: TEAL, fontFamily: 'Outfit, system-ui, sans-serif' }}
            >
              Every office.
            </p>
            <p
              className="font-bold text-center tracking-[-0.02em] mt-8"
              style={{ fontSize: 'clamp(18px, 3vh, 32px)', lineHeight: 1.3, color: 'rgba(255,255,255,0.5)', fontFamily: 'Outfit, system-ui, sans-serif' }}
            >
              From New York to wherever your team sits.
            </p>
          </div>
        </SlideTransition>
      )}

      {/* ====== SLIDE 7: SOCIAL PROOF ====== */}
      {currentIndex === 7 && (
        <SlideTransition phase={phase} direction="scale">
          <div className="absolute inset-0 flex flex-col items-center justify-center px-10" style={{ backgroundColor: NAVY }}>
            <p
              className="font-bold text-center tracking-[-0.01em] mb-8"
              style={{ fontSize: 'clamp(16px, 2.5vh, 24px)', color: 'rgba(255,255,255,0.4)', fontFamily: 'Outfit, system-ui, sans-serif' }}
            >
              Trusted by
            </p>
            <p
              className="font-extrabold text-center tracking-[-0.04em]"
              style={{ fontSize: 'clamp(40px, 8vh, 84px)', lineHeight: 1.0, color: TEAL, fontFamily: 'Outfit, system-ui, sans-serif' }}
            >
              500+
            </p>
            <p
              className="font-extrabold text-center tracking-[-0.03em] mt-1"
              style={{ fontSize: 'clamp(28px, 4.5vh, 48px)', lineHeight: 1.1, color: '#FFFFFF', fontFamily: 'Outfit, system-ui, sans-serif' }}
            >
              companies
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-3 px-4">
              {['BCG', 'DraftKings', 'PwC', 'Paramount', 'Tripadvisor', 'Wix'].map((name, i) => (
                <p
                  key={name}
                  className="font-bold"
                  style={{
                    fontSize: 'clamp(14px, 2vh, 20px)', color: 'rgba(255,255,255,0.35)',
                    fontFamily: 'Outfit, system-ui, sans-serif',
                    animation: phase === 'active'
                      ? `tagline-pan-up 0.3s cubic-bezier(0.22, 1, 0.36, 1) ${0.6 + i * 0.1}s forwards`
                      : 'none',
                    opacity: 0, transform: 'translateY(15px)',
                  }}
                >
                  {name}
                </p>
              ))}
            </div>
          </div>
        </SlideTransition>
      )}

      {/* ====== SLIDE 8: CLOSE ====== */}
      {currentIndex === 8 && (
        <SlideTransition phase={phase} direction="fade">
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ backgroundColor: NAVY }}>
            {Array.from({ length: 12 }, (_, i) => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  left: `${10 + (i * 37) % 80}%`,
                  top: `${5 + (i * 43) % 85}%`,
                  width: 3 + (i % 3) * 2,
                  height: 3 + (i % 3) * 2,
                  backgroundColor: TEAL,
                  opacity: 0.12 + (i % 4) * 0.04,
                  animation: `float-particle ${7 + (i % 4)}s ease-in-out ${(i % 5) * 0.8}s infinite alternate`,
                }}
              />
            ))}
            <div className="relative z-10 text-center">
              <p
                className="font-extrabold tracking-[-0.03em]"
                style={{ fontSize: 'clamp(36px, 6vh, 64px)', lineHeight: 1.1, color: '#FFFFFF', fontFamily: 'Outfit, system-ui, sans-serif' }}
              >
                Employee<br />Happiness<br />Delivered.
              </p>
              <div className="mt-10">
                <ShortcutLogo variant="coral" size={52} />
              </div>
            </div>
          </div>
        </SlideTransition>
      )}
    </>
  );
}

// ============================================================
// V3 — Coherent brand story (13 slides: greeting → intro → services → TBD)
// ============================================================
// --- Jitter-style stacked card carousel for slide 4 ---
const CARD_SERVICES = [
  { name: 'Massage', icon: '/workhuman-tv/icon-massage.png' },
  { name: 'Headshots', icon: '/workhuman-tv/icon-headshots.png' },
  { name: 'Nails', icon: '/workhuman-tv/icon-nails.png' },
  { name: 'Hair', icon: '/workhuman-tv/icon-hair.png' },
  { name: 'Beauty', icon: '/workhuman-tv/icon-beauty.png' },
  { name: 'Mindfulness', icon: '/workhuman-tv/icon-mindfulness.png' },
];

function ServiceCardSlide({ phase }: { phase: 'enter' | 'active' | 'exit' }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const count = CARD_SERVICES.length;

  // Simple interval: advance every 2s
  useEffect(() => {
    if (phase !== 'active') return;
    const interval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % count);
    }, 2000);
    return () => clearInterval(interval);
  }, [phase, count]);

  // Reset when slide re-enters
  useEffect(() => {
    if (phase === 'enter') setActiveIndex(0);
  }, [phase]);

  // For each card, determine its position relative to active (0=front, 1=behind, 2=further back)
  function getCardPosition(cardIndex: number): number {
    const diff = (cardIndex - activeIndex + count) % count;
    return diff; // 0=front, 1=next behind, 2=two behind, etc.
  }

  return (
    <SlideTransition phase={phase} direction="left">
      <div className="absolute inset-0" style={{ backgroundColor: NAVY }}>
        {/* Header text */}
        <p
          className="font-extrabold tracking-[-0.03em]"
          style={{
            fontSize: 'clamp(28px, 6vh, 56px)', lineHeight: 1.1, color: '#FFFFFF',
            fontFamily: 'Outfit, system-ui, sans-serif',
            position: 'absolute', top: '5%', left: '6%', right: '6%',
          }}
        >
          From{' '}
          <span style={{ color: TEAL }}>massage</span>{' '}and{' '}
          <span style={{ color: YELLOW }}>mindfulness</span>{' '}to{' '}
          <span style={{ color: PINK }}>beauty</span>{' '}and corporate{' '}
          <span style={{ color: TEAL }}>headshots</span>.
        </p>

        {/* Centered card stack */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ top: '15%' }}
        >
          <div style={{ position: 'relative', width: 'min(360px, 45vh)', height: 'min(360px, 45vh)' }}>
            {CARD_SERVICES.map((svc, i) => {
              const pos = getCardPosition(i);
              // Show max 3 cards (front + 2 behind). Hide the rest.
              const visible = pos <= 2;
              // Front card: scale 1, y 0, full opacity, highest z
              // 1 behind: scale 0.92, y -16px, z-1
              // 2 behind: scale 0.84, y -32px, z-2
              const scale = pos === 0 ? 1 : pos === 1 ? 0.9 : 0.8;
              const translateY = pos === 0 ? 0 : pos === 1 ? -40 : -72;
              const zIndex = visible ? (30 - pos * 10) : 0;
              const opacity = visible ? 1 : 0;

              return (
                <div
                  key={svc.name}
                  className="absolute inset-0"
                  style={{
                    borderRadius: 'clamp(16px, 3vh, 28px)',
                    overflow: 'hidden',
                    transform: `scale(${scale}) translateY(${translateY}px)`,
                    opacity,
                    zIndex,
                    transition: 'transform 1.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.6s ease',
                  }}
                >
                  <img
                    src={svc.icon}
                    alt={svc.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="absolute" style={{ bottom: '3%', right: '5%' }}>
          <ShortcutLogo variant="white" size={36} />
        </div>
      </div>
    </SlideTransition>
  );
}

function V3Loop({ phase, currentIndex }: { phase: 'enter' | 'active' | 'exit'; currentIndex: number }) {
  return (
    <>
      {/* ====== SLIDE 0: QR HERO (reuse V2 design) ====== */}
      {currentIndex === 0 && (
        <SlideTransition phase={phase} direction="scale">
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ backgroundColor: CORAL }}>
            <p
              className="font-extrabold text-center tracking-[-0.03em] mb-12"
              style={{ fontSize: 'clamp(36px, 6vh, 64px)', color: '#FFFFFF', fontFamily: 'Outfit, system-ui, sans-serif' }}
            >
              Book Your<br />Free Massage
            </p>
            <QRPlaceholder size={280} />
            <p
              className="font-bold mt-8"
              style={{ fontSize: 'clamp(16px, 2.5vh, 24px)', color: '#FFFFFF', opacity: 0.8, fontFamily: 'Outfit, system-ui, sans-serif' }}
            >
              Scan to reserve your spot
            </p>
            {/* Animated logo — white on coral */}
            <div className="flex items-center mt-12">
              <div
                style={{
                  flexShrink: 0,
                  animation: phase === 'active'
                    ? 'logo-overshoot 0.4s cubic-bezier(0.22, 1, 0.36, 1) 1.0s forwards, logo-slide-left 0.6s cubic-bezier(0.22, 1, 0.36, 1) 1.1s forwards'
                    : 'none',
                  transform: 'translateX(100px) scale(1.1)',
                }}
              >
                <svg width="56" height="42" viewBox="0 0 285 192" fill="none"
                  style={{
                    animation: phase === 'active' ? 'logo-icon-scale 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.5s forwards' : 'none',
                    transform: 'scale(0)', opacity: 0,
                  }}
                >
                  <path fillRule="evenodd" clipRule="evenodd" d="M180.085 123.273C178.523 136.95 174.332 150.363 166.404 161.789C147.666 188.794 115.391 197.809 83.505 187.975C52.0357 178.27 21.5169 150.798 0 106.28L29.4336 92.0535C48.1724 130.823 72.6235 150.408 93.1396 156.736C113.239 162.935 129.965 156.958 139.545 143.152C141.253 140.691 142.721 137.91 143.935 134.846C142.091 134.947 140.246 134.979 138.402 134.945C117.189 134.548 97.7708 125.343 83.1568 112.659C68.6417 100.062 57.4983 82.8406 54.2488 64.5611C50.855 45.4703 56.3132 25.3828 74.6228 11.3512C83.191 4.78496 92.5896 0.887791 102.475 0.134123C112.334 -0.61748 121.541 1.84316 129.627 6.17627C145.351 14.6033 157.577 30.4138 165.925 47.3746C171.212 58.1174 175.313 70.0533 177.861 82.3164C192.547 66.6019 208.52 57.2563 222.041 52.0055C229.027 49.2927 235.456 47.6337 240.848 46.7633C245.575 46.0002 251.284 45.5405 256.04 46.6381L248.689 78.4922C249.256 78.6231 249.56 78.669 249.56 78.669C249.558 78.6929 248.483 78.6453 246.058 79.0368C243.004 79.5298 238.792 80.5701 233.876 82.4796C224.082 86.2829 211.873 93.3814 200.548 105.942C194.094 113.1 187.222 118.845 180.085 123.273ZM147.727 101.517C146.5 87.8421 142.494 73.7985 136.594 61.8105C129.869 48.148 121.609 38.9693 114.185 34.9907C110.696 33.1211 107.663 32.5248 104.96 32.7309C102.284 32.9349 98.8002 34.0099 94.5082 37.2992C87.0974 42.9785 84.9004 50.2039 86.4355 58.8393C88.1148 68.2858 94.4842 79.2038 104.585 87.9699C114.586 96.6501 126.886 102.033 139.013 102.259C141.841 102.312 144.754 102.088 147.727 101.517Z" fill="#FFFFFF"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M227.95 60.6342C212.285 55.7034 200.552 45.6102 190.79 34.575L215.742 12.5006C223.559 21.3371 230.444 26.4925 237.953 28.8562C245.287 31.1646 255.432 31.4939 271.035 26.2883L284.604 56.5339C273.057 63.1664 266.67 73.9685 263.648 85.1433C262.14 90.7193 261.573 96.0733 261.599 100.426C261.625 104.815 262.24 107.049 262.315 107.323C262.322 107.346 262.322 107.35 262.322 107.35L231.654 120.365C229.232 114.657 228.325 107.44 228.284 100.627C228.241 93.4035 229.161 85.049 231.488 76.4463C232.7 71.9629 234.323 67.3261 236.435 62.7047C233.55 62.1969 230.724 61.5071 227.95 60.6342Z" fill="#FFFFFF"/>
                </svg>
              </div>
              <div className="flex items-center overflow-visible" style={{ marginLeft: 10, height: 36 }}>
                {['s','h','o','r','t','c','u','t'].map((letter, i) => (
                  <span key={i} className="inline-block overflow-hidden" style={{ height: 36 }}>
                    <span className="inline-block font-extrabold" style={{
                      fontSize: 36, lineHeight: 1, color: '#FFFFFF', fontFamily: 'Outfit, system-ui, sans-serif',
                      letterSpacing: '-0.02em',
                      animation: phase === 'active' ? `word-mask-up 0.3s cubic-bezier(0.22, 1, 0.36, 1) ${1.6 + i * 0.04}s forwards` : 'none',
                      transform: 'translateY(100%)', opacity: 0,
                    }}>{letter}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </SlideTransition>
      )}

      {/* ====== SLIDE 1: HELLO WORKHUMAN ====== */}
      {currentIndex === 1 && (
        <SlideTransition phase={phase} direction="fade">
          <div className="absolute inset-0 flex flex-col items-center justify-center px-10" style={{ backgroundColor: '#FFF3E2' }}>
            <div className="text-center">
              {/* Workhuman Live logo */}
              {/* Workhuman Live logo — main wordmark only, no sub-copy */}
              <div className="flex justify-center mb-8">
                <svg style={{ width: 'min(420px, 80vw)' }} viewBox="0 0 260 38" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g>
                    <path d="M192.1,33.6c1,0,1.8.8,1.8,1.7h0c0,1.1-.7,1.9-1.6,1.9h-.1c-1,0-1.8-.9-1.8-1.9,0-1,.8-1.7,1.8-1.8M192.1,36.9c.8,0,1.4-.7,1.4-1.4h0c0-.8-.7-1.4-1.5-1.4s-1.4.7-1.4,1.5c0,.8.7,1.4,1.4,1.4M192.2,35.8h-.3v.7h-.5v-2h.8c.4,0,.8.2.8.7,0,.2,0,.5-.3.6l.3.7h-.6l-.2-.7h0ZM191.9,35.4h.3c.1,0,.3,0,.3-.2h0c0-.3-.1-.4-.3-.4h-.2v.6h0Z" fill="#0d173d"/>
                    <path d="M5.1,17.4l2.4,15.3h.9l3-14.9h5.4l3,14.9h.9l2.4-15.3h5.2l-3.7,19.8h-8.2l-2.2-12.2-2.2,12.2H3.7L0,17.4h5.2,0Z" fill="#0d173d"/>
                    <path d="M47.1,27.3c0,6.1-2.2,10.4-9,10.4s-9-4.3-9-10.4,2.2-10.4,9-10.4,9,4.2,9,10.4M41.8,27.3c0-3.8-.8-5.8-3.7-5.8s-3.7,2-3.7,5.8.8,5.9,3.7,5.9,3.7-2.1,3.7-5.9" fill="#0d173d"/>
                    <path d="M49.5,17.4h5.2v2.1s3.3-2,6.2-2.6v5.4c-2.1.4-4.2,1-6.2,1.7v13.3h-5.2v-19.9Z" fill="#0d173d"/>
                    <path d="M82.3,37.2V9.4h5.2v8.9s2.7-1.4,4.8-1.4c5.5,0,6.9,3.5,6.9,9.6v10.8h-5.2v-10.6c0-3-.4-4.9-2.9-4.9-1.2,0-2.4.2-3.6.6v14.9s-5.2,0-5.2,0Z" fill="#0d173d"/>
                    <path d="M118.7,17.4v19.9h-5.2v-1.1s-2.8,1.6-4.9,1.6c-5.7,0-6.9-3.2-6.9-9.9v-10.4h5.2v10.5c0,3.5.2,5.1,2.7,5.1,1.3,0,2.6-.3,3.8-.7v-14.8h5.2Z" fill="#0d173d"/>
                    <path d="M121.4,37.2v-19.8h5.2v1.1s2.7-1.6,4.6-1.6,3.7.6,4.9,1.9c0,0,3.6-1.9,6.6-1.9,5.3,0,6.9,3.2,6.9,9.6v10.8h-5.2v-10.6c0-3-.4-5-2.7-5-1.2,0-2.5.3-3.6.8,0,0,.2,3,.2,4.5v10.3h-5.2v-10.2c0-3.6-.3-5.4-2.7-5.4-1.2,0-2.4.3-3.5.7v14.8h-5.2Z" fill="#0d173d"/>
                    <path d="M171.1,37.2v-19.8h5.2v1.1s2.6-1.6,4.9-1.6c5.5,0,6.9,3.5,6.9,9.6v10.8h-5.2v-10.6c0-3-.4-5-2.9-5-1.2,0-2.4.3-3.6.7v14.8h-5.2Z" fill="#0d173d"/>
                    <path d="M80.3,17.4h-6.1l-5.9,9.1V9.4h-5.2v27.8h5.2v-9.1l5.9,9.1h6.1l-6.4-9.9s6.4-9.9,6.4-9.9Z" fill="#0d173d"/>
                    <path d="M168.4,17.4h-5.2v1.1s-2.6-1.6-4.9-1.6c-5.5,0-6.8,5.2-6.8,11.2s1.4,9.6,6.9,9.6,4.4-1.3,4.8-1.5v1.1h5.3v-19.8h0ZM159.7,32.9c-2.5,0-2.9-1.9-2.9-5v-2.7c.1-2.3.7-3.7,2.9-3.7,1.2,0,2.4.3,3.6.7v9.9c-1.1.4-2.3.7-3.5.7" fill="#0d173d"/>
                    <path d="M200.7,9.6c0-1.7-.5-3.3-1.3-4.8l-7.3,3.6,1.6-8c-1.8-.5-3.7-.5-5.5,0l1.6,8-7.3-3.6c-.9,1.5-1.3,3.1-1.3,4.8l7.9,1-4.7,4.7c1.5.3,2.8,1.2,3.8,2.4l2.8-5.7,3.4,6.9c1.5-.6,2.9-1.5,4-2.8l-5.5-5.5,7.9-1h0Z" fill="#0d173d"/>
                    <rect x="208.3" y="9.4" width="5.3" height="27.7" fill="#c1386a"/>
                    <path d="M216.8,9.4h5.3v5.4h-5.3v-5.4ZM216.8,17.3h5.3v19.8h-5.3v-19.8Z" fill="#c1386a"/>
                    <path d="M229.1,17.3l3.2,15.3h1.1l3.3-15.3h5.4l-4.7,19.8h-9l-4.7-19.8h5.5,0Z" fill="#c1386a"/>
                    <path d="M258.9,32.6v3.9c-2.6.6-5.4,1-8.2,1.1-6,0-8.5-3-8.5-10.1s3-10.6,8.7-10.6,8.6,3,8.6,8.9l-.4,3.7h-11.6c0,2.4,1.1,3.4,4,3.4s7.3-.4,7.3-.4M254.4,25.4c0-3.2-.9-4.2-3.4-4.2s-3.4,1.2-3.4,4.2h6.8Z" fill="#c1386a"/>
                  </g>
                </svg>
              </div>
              <p
                className="font-extrabold tracking-[-0.03em]"
                style={{
                  fontSize: 'clamp(40px, 7vh, 72px)', lineHeight: 1.1, color: '#000000',
                  fontFamily: 'Outfit, system-ui, sans-serif',
                }}
              >
                Hello{' '}
                <span
                  className="inline-block"
                  style={{
                    animation: phase === 'active' ? 'wave-hand 1.2s ease-in-out 0.3s' : 'none',
                  }}
                >
                  👋
                </span>
              </p>
              <p
                className="font-bold tracking-[-0.01em] mt-6"
                style={{
                  fontSize: 'clamp(18px, 3vh, 28px)', lineHeight: 1.3,
                  color: '#000000',
                  fontFamily: 'Outfit, system-ui, sans-serif',
                  animation: phase === 'active' ? 'tagline-pan-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.8s forwards' : 'none',
                  opacity: 0, transform: 'translateY(20px)',
                }}
              >
                Welcome to your moment of zen.<br />Presented by Shortcut.
              </p>
            </div>
          </div>
        </SlideTransition>
      )}

      {/* ====== SLIDE 2: WE'RE SHORTCUT ====== */}
      {currentIndex === 2 && (
        <SlideTransition phase={phase} direction="scale">
          <div className="absolute inset-0 flex flex-col items-center justify-center px-10" style={{ backgroundColor: CORAL }}>
            {/* "We're" + animated Shortcut logo inline */}
            <div className="flex items-center flex-wrap justify-center gap-x-4">
              <p
                className="font-extrabold tracking-[-0.03em]"
                style={{
                  fontSize: 'clamp(36px, 6vh, 64px)', lineHeight: 1.1, color: '#FFFFFF',
                  fontFamily: 'Outfit, system-ui, sans-serif',
                }}
              >
                We're
              </p>
              {/* Animated logo — icon + wordmark, Jitter sequence */}
              <div className="flex items-center">
                <div
                  style={{
                    flexShrink: 0,
                    animation: phase === 'active'
                      ? 'logo-overshoot 0.4s cubic-bezier(0.22, 1, 0.36, 1) 0.7s forwards, logo-slide-left 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.8s forwards'
                      : 'none',
                    transform: 'translateX(100px) scale(1.1)',
                  }}
                >
                  <svg width="56" height="42" viewBox="0 0 285 192" fill="none"
                    style={{
                      animation: phase === 'active' ? 'logo-icon-scale 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.3s forwards' : 'none',
                      transform: 'scale(0)', opacity: 0,
                    }}
                  >
                    <path fillRule="evenodd" clipRule="evenodd" d="M180.085 123.273C178.523 136.95 174.332 150.363 166.404 161.789C147.666 188.794 115.391 197.809 83.505 187.975C52.0357 178.27 21.5169 150.798 0 106.28L29.4336 92.0535C48.1724 130.823 72.6235 150.408 93.1396 156.736C113.239 162.935 129.965 156.958 139.545 143.152C141.253 140.691 142.721 137.91 143.935 134.846C142.091 134.947 140.246 134.979 138.402 134.945C117.189 134.548 97.7708 125.343 83.1568 112.659C68.6417 100.062 57.4983 82.8406 54.2488 64.5611C50.855 45.4703 56.3132 25.3828 74.6228 11.3512C83.191 4.78496 92.5896 0.887791 102.475 0.134123C112.334 -0.61748 121.541 1.84316 129.627 6.17627C145.351 14.6033 157.577 30.4138 165.925 47.3746C171.212 58.1174 175.313 70.0533 177.861 82.3164C192.547 66.6019 208.52 57.2563 222.041 52.0055C229.027 49.2927 235.456 47.6337 240.848 46.7633C245.575 46.0002 251.284 45.5405 256.04 46.6381L248.689 78.4922C249.256 78.6231 249.56 78.669 249.56 78.669C249.558 78.6929 248.483 78.6453 246.058 79.0368C243.004 79.5298 238.792 80.5701 233.876 82.4796C224.082 86.2829 211.873 93.3814 200.548 105.942C194.094 113.1 187.222 118.845 180.085 123.273ZM147.727 101.517C146.5 87.8421 142.494 73.7985 136.594 61.8105C129.869 48.148 121.609 38.9693 114.185 34.9907C110.696 33.1211 107.663 32.5248 104.96 32.7309C102.284 32.9349 98.8002 34.0099 94.5082 37.2992C87.0974 42.9785 84.9004 50.2039 86.4355 58.8393C88.1148 68.2858 94.4842 79.2038 104.585 87.9699C114.586 96.6501 126.886 102.033 139.013 102.259C141.841 102.312 144.754 102.088 147.727 101.517Z" fill="#FFFFFF"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M227.95 60.6342C212.285 55.7034 200.552 45.6102 190.79 34.575L215.742 12.5006C223.559 21.3371 230.444 26.4925 237.953 28.8562C245.287 31.1646 255.432 31.4939 271.035 26.2883L284.604 56.5339C273.057 63.1664 266.67 73.9685 263.648 85.1433C262.14 90.7193 261.573 96.0733 261.599 100.426C261.625 104.815 262.24 107.049 262.315 107.323C262.322 107.346 262.322 107.35 262.322 107.35L231.654 120.365C229.232 114.657 228.325 107.44 228.284 100.627C228.241 93.4035 229.161 85.049 231.488 76.4463C232.7 71.9629 234.323 67.3261 236.435 62.7047C233.55 62.1969 230.724 61.5071 227.95 60.6342Z" fill="#FFFFFF"/>
                  </svg>
                </div>
                <div className="flex items-center overflow-visible" style={{ marginLeft: 10, height: 42 }}>
                  {['s','h','o','r','t','c','u','t'].map((letter, i) => (
                    <span key={i} className="inline-block overflow-hidden" style={{ height: 42 }}>
                      <span className="inline-block font-extrabold" style={{
                        fontSize: 42, lineHeight: 1, color: '#FFFFFF', fontFamily: 'Outfit, system-ui, sans-serif',
                        letterSpacing: '-0.02em',
                        animation: phase === 'active' ? `word-mask-up 0.3s cubic-bezier(0.22, 1, 0.36, 1) ${1.3 + i * 0.04}s forwards` : 'none',
                        transform: 'translateY(100%)', opacity: 0,
                      }}>{letter}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            {/* Subtitle — white */}
            <p
              className="font-bold text-center tracking-[-0.01em] mt-6"
              style={{
                fontSize: 'clamp(18px, 3vh, 28px)', lineHeight: 1.3, color: '#FFFFFF',
                fontFamily: 'Outfit, system-ui, sans-serif',
                animation: phase === 'active' ? 'tagline-pan-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) 1.8s forwards' : 'none',
                opacity: 0, transform: 'translateY(20px)',
              }}
            >
              A wellness vendor that shows up. Literally.
            </p>
          </div>
        </SlideTransition>
      )}

      {/* ====== SLIDE 3: WHAT WE DELIVER — privacy screen style ====== */}
      {currentIndex === 3 && (
        <SlideTransition phase={phase} direction="up">
          <div className="absolute inset-0" style={{ backgroundColor: NAVY }}>
            <p
              className="font-extrabold tracking-[-0.03em]"
              style={{
                fontSize: 'clamp(36px, 8vh, 80px)', lineHeight: 1.05, color: '#FFFFFF',
                fontFamily: 'Outfit, system-ui, sans-serif',
                position: 'absolute', top: '6%', left: '6%', right: '6%',
              }}
            >
              We deliver feel good, on-site{' '}
              <span style={{ color: TEAL }}>moments</span>{' '}
              to hundreds of companies across the US.
            </p>
            <div className="absolute" style={{ bottom: '4%', right: '5%' }}>
              <ShortcutLogo variant="white" size={36} />
            </div>
          </div>
        </SlideTransition>
      )}

      {/* ====== SLIDE 4: THE RANGE — navy bg, Jitter-style stacked card carousel ====== */}
      {currentIndex === 4 && <ServiceCardSlide phase={phase} />}

      {/* ====== SLIDE 5: ONE VENDOR — privacy screen style ====== */}
      {currentIndex === 5 && (
        <SlideTransition phase={phase} direction="up">
          <div className="absolute inset-0" style={{ backgroundColor: NAVY }}>
            <div style={{ position: 'absolute', top: '6%', left: '6%', right: '6%' }}>
              <p
                className="font-extrabold tracking-[-0.03em]"
                style={{
                  fontSize: 'clamp(36px, 8vh, 80px)', lineHeight: 1.05, color: '#FFFFFF',
                  fontFamily: 'Outfit, system-ui, sans-serif',
                  animation: phase === 'active'
                    ? 'tagline-pan-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.2s forwards'
                    : 'none',
                  opacity: 0, transform: 'translateY(30px)',
                }}
              >
                One vendor.
              </p>
              <p
                className="font-extrabold tracking-[-0.03em]"
                style={{
                  fontSize: 'clamp(36px, 8vh, 80px)', lineHeight: 1.05, color: TEAL,
                  fontFamily: 'Outfit, system-ui, sans-serif',
                  animation: phase === 'active'
                    ? 'tagline-pan-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.5s forwards'
                    : 'none',
                  opacity: 0, transform: 'translateY(30px)',
                }}
              >
                Zero hassle.
              </p>
              <p
                className="font-extrabold tracking-[-0.03em]"
                style={{
                  fontSize: 'clamp(28px, 6vh, 60px)', lineHeight: 1.05, color: '#FFFFFF',
                  fontFamily: 'Outfit, system-ui, sans-serif',
                  marginTop: 'clamp(12px, 2vh, 24px)',
                  animation: phase === 'active'
                    ? 'tagline-pan-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.8s forwards'
                    : 'none',
                  opacity: 0, transform: 'translateY(30px)',
                }}
              >
                A dozen ways to breathe easier.
              </p>
            </div>
            <div className="absolute" style={{ bottom: '4%', right: '5%' }}>
              <ShortcutLogo variant="white" size={36} />
            </div>
          </div>
        </SlideTransition>
      )}

      {/* ====== SLIDE 6: SERVICE + TECH — privacy screen style ====== */}
      {currentIndex === 6 && (
        <SlideTransition phase={phase} direction="fade">
          <div className="absolute inset-0" style={{ backgroundColor: CORAL }}>
            <p
              className="font-extrabold tracking-[-0.03em]"
              style={{
                fontSize: 'clamp(36px, 8vh, 80px)', lineHeight: 1.05, color: '#FFFFFF',
                fontFamily: 'Outfit, system-ui, sans-serif',
                position: 'absolute', top: '6%', left: '6%', right: '6%',
              }}
            >
              The highest level of{' '}
              <span style={{ color: NAVY }}>service</span>{' '}
              paired with seamless technology.
            </p>
            <div className="absolute" style={{ bottom: '4%', right: '5%' }}>
              <ShortcutLogo variant="white" size={36} />
            </div>
          </div>
        </SlideTransition>
      )}

      {/* ====== SLIDE 7: SERVICE LIST GLIDE ====== */}
      {currentIndex === 7 && (
        <div
          className="absolute inset-0 flex items-center"
          style={{
            backgroundColor: NAVY,
            opacity: phase === 'enter' ? 0 : phase === 'exit' ? 0 : 1,
            transition: 'opacity 0.4s ease',
          }}
        >
          <div className="w-full" style={{ paddingLeft: '7%', paddingTop: '6%' }}>
            {[
              { name: 'Massage', color: TEAL },
              { name: 'Nails', color: PINK },
              { name: 'Haircut', color: YELLOW },
              { name: 'Beauty', color: PINK },
              { name: 'Mindfulness', color: YELLOW },
              { name: 'Headshots', color: TEAL },
            ].map((service, i) => (
              <p
                key={service.name}
                className="font-bold tracking-[-0.01em]"
                style={{
                  fontSize: 'clamp(40px, 8vh, 80px)', lineHeight: 1.0, color: service.color,
                  fontFamily: 'Outfit, system-ui, sans-serif',
                  animation: phase === 'active'
                    ? `glide-in-right 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${i * 0.12}s forwards, glide-back-left 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${0.9 + i * 0.08}s forwards`
                    : 'none',
                  transform: 'translateX(-120%)', opacity: 0,
                }}
              >
                {service.name}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* ====== SLIDES 8-12: SERVICE VIDEO SPOTLIGHTS ====== */}
      {currentIndex >= 8 && currentIndex <= 12 && (
        <ServiceSlide
          service={SERVICES[currentIndex - 8]}
          phase={phase}
        />
      )}
    </>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function WorkhumanTVLoop() {
  // Version toggle: ?v=2 for refined narrative, ?v=3 for brand story
  const vParam = new URLSearchParams(window.location.search).get('v');
  const version = vParam === '3' ? 3 : vParam === '2' ? 2 : 1;
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleFullscreen]);

  // Hide cursor after 3s
  const [cursorHidden, setCursorHidden] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const show = () => {
      setCursorHidden(false);
      clearTimeout(timer);
      timer = setTimeout(() => setCursorHidden(true), 3000);
    };
    window.addEventListener('mousemove', show);
    timer = setTimeout(() => setCursorHidden(true), 3000);
    return () => { window.removeEventListener('mousemove', show); clearTimeout(timer); };
  }, []);

  // Slide definitions:
  // 0: QR Hero (full screen)
  // 1: Problem line 1
  // 2: Problem line 2
  // 3: Pivot (aaaah)
  // 4: Logo reveal
  // 5-9: Services (5 services)
  // 10: Platform
  // 11: Ease
  // 12: Close
  const v1Durations = [
    8000,  // 0: QR hero
    4000,  // 1: problem 1
    5000,  // 2: problem 2
    6000,  // 3: pivot
    7000,  // 4: logo reveal (Jitter-matched)
    5000,  // 5: service list glide (Jitter "Glide" style)
    7000,  // 6: massage video
    7000,  // 7: headshots video
    7000,  // 8: nails video
    7000,  // 9: hair video
    7000,  // 10: mindfulness video
    6000,  // 11: platform
    6000,  // 12: ease
    6000,  // 13: close
  ];
  const v2Durations = [
    8000,  // 0: QR hero
    7000,  // 1: welcome + logo reveal
    6000,  // 2: what we do
    5000,  // 3: service list glide
    8000,  // 4: the experience (video)
    7000,  // 5: the ease
    6000,  // 6: the scale
    6000,  // 7: social proof
    6000,  // 8: close
  ];
  const v3Durations = [
    8000,  // 0: QR hero
    6000,  // 1: Hello Workhuman
    7000,  // 2: We're Shortcut
    6000,  // 3: What we deliver
    14000, // 4: The range (card carousel needs time to cycle)
    6000,  // 5: One vendor
    6000,  // 6: Service + tech
    5000,  // 7: Service glide
    7000,  // 8: massage
    7000,  // 9: headshots
    7000,  // 10: nails
    7000,  // 11: hair
    7000,  // 12: mindfulness
  ];
  const totalSlides = version === 3 ? 13 : version === 2 ? 9 : 14;
  const durations = version === 3 ? v3Durations : version === 2 ? v2Durations : v1Durations;

  const { currentIndex, phase, goTo, paused, togglePause } = useSlideshow(totalSlides, durations);

  // Arrow keys to navigate slides
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goTo(currentIndex + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(currentIndex - 1); }
      if (e.key === 'p' || e.key === 'P') { e.preventDefault(); togglePause(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goTo, currentIndex, togglePause]);

  // QR badge shows after slide 0
  const showQRBadge = currentIndex > 0;

  return (
    <>
      <style>{`
        @keyframes float-particle {
          0% { transform: translateY(0) translateX(0); }
          100% { transform: translateY(-30px) translateX(10px); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        @keyframes text-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes logo-icon-scale {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes logo-overshoot {
          0% { transform: translateX(140px) scale(1.1); }
          100% { transform: translateX(140px) scale(1); }
        }
        @keyframes logo-slide-left {
          0% { transform: translateX(140px) scale(1); }
          100% { transform: translateX(0) scale(1); }
        }
        @keyframes word-mask-up {
          0% { transform: translateY(100%); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes tagline-pan-up {
          0% { opacity: 0; transform: translateY(40px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes glide-in-right {
          0% { transform: translateX(-120%); opacity: 0; }
          40% { opacity: 1; }
          100% { transform: translateX(60%); opacity: 1; }
        }
        @keyframes glide-back-left {
          0% { transform: translateX(60%); }
          100% { transform: translateX(0); }
        }
        @keyframes card-flip-in {
          0% { transform: perspective(800px) rotateY(90deg) scale(0.85); opacity: 0; }
          60% { transform: perspective(800px) rotateY(-8deg) scale(1.02); opacity: 1; }
          80% { transform: perspective(800px) rotateY(3deg) scale(1); }
          100% { transform: perspective(800px) rotateY(0deg) scale(1); opacity: 1; }
        }
        /* Card stack: 6 cards, each visible for ~16.67% of cycle.
           Transition in: scale 80%→90%, translateY(20px→0).
           Hold: scale 90%, translateY(0).
           Transition out: scale 90%→85%, translateY(0→-30px), opacity→0.
           Based on Jitter "Screens 4" animation: 1.25s transitions, smooth easing. */
        @keyframes card-stack-in {
          0% { opacity: 0; transform: scale(0.8) translateY(20px); }
          100% { opacity: 1; transform: scale(0.9) translateY(0); }
        }
        @keyframes card-stack-out {
          0% { opacity: 1; transform: scale(0.9) translateY(0); }
          100% { opacity: 0; transform: scale(0.85) translateY(-30px); }
        }
        @keyframes wave-hand {
          0%, 100% { transform: rotate(0deg); transform-origin: 70% 70%; }
          10% { transform: rotate(14deg); }
          20% { transform: rotate(-8deg); }
          30% { transform: rotate(14deg); }
          40% { transform: rotate(-4deg); }
          50% { transform: rotate(10deg); }
          60% { transform: rotate(0deg); }
        }
      `}</style>

      <div
        className="relative overflow-hidden"
        style={{
          width: '100vw',
          height: '100vh',
          fontFamily: 'Outfit, system-ui, sans-serif',
          cursor: cursorHidden ? 'none' : 'default',
          backgroundColor: NAVY,
        }}
      >

        {/* ====== VERSION SWITCH ====== */}
        {version === 3 && <V3Loop phase={phase} currentIndex={currentIndex} />}
        {version === 2 && <V2Loop phase={phase} currentIndex={currentIndex} />}

        {/* ====== V1 SLIDES BELOW ====== */}
        {version === 1 && <>
        {/* ====== SLIDE 0: QR HERO (full screen) ====== */}
        {currentIndex === 0 && (
          <SlideTransition phase={phase} direction="scale">
            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ backgroundColor: CORAL }}>
              <p
                className="font-extrabold text-center tracking-[-0.03em] mb-12"
                style={{ fontSize: 'clamp(36px, 6vh, 64px)', color: '#FFFFFF' }}
              >
                Book Your<br />Free Massage
              </p>
              <QRPlaceholder size={280} />
              <p
                className="font-bold mt-8"
                style={{ fontSize: 'clamp(16px, 2.5vh, 24px)', color: '#FFFFFF', opacity: 0.8 }}
              >
                Scan to reserve your spot
              </p>
              {/* Animated logo — same Jitter sequence, white on coral */}
              <div className="flex items-center mt-12">
                <div
                  style={{
                    flexShrink: 0,
                    animation: phase === 'active'
                      ? 'logo-overshoot 0.4s cubic-bezier(0.22, 1, 0.36, 1) 1.0s forwards, logo-slide-left 0.6s cubic-bezier(0.22, 1, 0.36, 1) 1.1s forwards'
                      : 'none',
                    transform: 'translateX(100px) scale(1.1)',
                  }}
                >
                  <svg
                    width="56"
                    height="42"
                    viewBox="0 0 285 192"
                    fill="none"
                    style={{
                      animation: phase === 'active'
                        ? 'logo-icon-scale 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.5s forwards'
                        : 'none',
                      transform: 'scale(0)',
                      opacity: 0,
                    }}
                  >
                    <path fillRule="evenodd" clipRule="evenodd" d="M180.085 123.273C178.523 136.95 174.332 150.363 166.404 161.789C147.666 188.794 115.391 197.809 83.505 187.975C52.0357 178.27 21.5169 150.798 0 106.28L29.4336 92.0535C48.1724 130.823 72.6235 150.408 93.1396 156.736C113.239 162.935 129.965 156.958 139.545 143.152C141.253 140.691 142.721 137.91 143.935 134.846C142.091 134.947 140.246 134.979 138.402 134.945C117.189 134.548 97.7708 125.343 83.1568 112.659C68.6417 100.062 57.4983 82.8406 54.2488 64.5611C50.855 45.4703 56.3132 25.3828 74.6228 11.3512C83.191 4.78496 92.5896 0.887791 102.475 0.134123C112.334 -0.61748 121.541 1.84316 129.627 6.17627C145.351 14.6033 157.577 30.4138 165.925 47.3746C171.212 58.1174 175.313 70.0533 177.861 82.3164C192.547 66.6019 208.52 57.2563 222.041 52.0055C229.027 49.2927 235.456 47.6337 240.848 46.7633C245.575 46.0002 251.284 45.5405 256.04 46.6381L248.689 78.4922C249.256 78.6231 249.56 78.669 249.56 78.669C249.558 78.6929 248.483 78.6453 246.058 79.0368C243.004 79.5298 238.792 80.5701 233.876 82.4796C224.082 86.2829 211.873 93.3814 200.548 105.942C194.094 113.1 187.222 118.845 180.085 123.273ZM147.727 101.517C146.5 87.8421 142.494 73.7985 136.594 61.8105C129.869 48.148 121.609 38.9693 114.185 34.9907C110.696 33.1211 107.663 32.5248 104.96 32.7309C102.284 32.9349 98.8002 34.0099 94.5082 37.2992C87.0974 42.9785 84.9004 50.2039 86.4355 58.8393C88.1148 68.2858 94.4842 79.2038 104.585 87.9699C114.586 96.6501 126.886 102.033 139.013 102.259C141.841 102.312 144.754 102.088 147.727 101.517Z" fill="#FFFFFF"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M227.95 60.6342C212.285 55.7034 200.552 45.6102 190.79 34.575L215.742 12.5006C223.559 21.3371 230.444 26.4925 237.953 28.8562C245.287 31.1646 255.432 31.4939 271.035 26.2883L284.604 56.5339C273.057 63.1664 266.67 73.9685 263.648 85.1433C262.14 90.7193 261.573 96.0733 261.599 100.426C261.625 104.815 262.24 107.049 262.315 107.323C262.322 107.346 262.322 107.35 262.322 107.35L231.654 120.365C229.232 114.657 228.325 107.44 228.284 100.627C228.241 93.4035 229.161 85.049 231.488 76.4463C232.7 71.9629 234.323 67.3261 236.435 62.7047C233.55 62.1969 230.724 61.5071 227.95 60.6342Z" fill="#FFFFFF"/>
                  </svg>
                </div>
                <div className="flex items-center overflow-visible" style={{ marginLeft: 10, height: 36 }}>
                  {['s','h','o','r','t','c','u','t'].map((letter, i) => (
                    <span
                      key={i}
                      className="inline-block overflow-hidden"
                      style={{ height: 36 }}
                    >
                      <span
                        className="inline-block font-extrabold"
                        style={{
                          fontSize: 36,
                          lineHeight: 1,
                          color: '#FFFFFF',
                          fontFamily: 'Outfit, system-ui, sans-serif',
                          letterSpacing: '-0.02em',
                          animation: phase === 'active'
                            ? `word-mask-up 0.3s cubic-bezier(0.22, 1, 0.36, 1) ${1.6 + i * 0.04}s forwards`
                            : 'none',
                          transform: 'translateY(100%)',
                          opacity: 0,
                        }}
                      >
                        {letter}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </SlideTransition>
        )}

        {/* ====== SLIDE 1: PROBLEM LINE 1 ====== */}
        {currentIndex === 1 && (
          <SlideTransition phase={phase} direction="up">
            <div className="absolute inset-0 flex items-center justify-center px-10" style={{ backgroundColor: NAVY }}>
              <p
                className="font-extrabold text-center tracking-[-0.03em]"
                style={{ fontSize: 'clamp(36px, 7vh, 72px)', lineHeight: 1.1, color: '#FFFFFF' }}
              >
                Your team has wellness benefits.
              </p>
            </div>
          </SlideTransition>
        )}

        {/* ====== SLIDE 2: PROBLEM LINE 2 ====== */}
        {currentIndex === 2 && (
          <SlideTransition phase={phase} direction="up">
            <div className="absolute inset-0 flex items-center justify-center px-10" style={{ backgroundColor: NAVY }}>
              <div className="text-center">
                <p
                  className="font-extrabold tracking-[-0.03em]"
                  style={{ fontSize: 'clamp(28px, 5vh, 56px)', lineHeight: 1.15, color: 'rgba(255,255,255,0.4)' }}
                >
                  Buried in a portal.
                </p>
                <p
                  className="font-extrabold tracking-[-0.03em] mt-2"
                  style={{ fontSize: 'clamp(28px, 5vh, 56px)', lineHeight: 1.15, color: 'rgba(255,255,255,0.4)' }}
                >
                  Behind a login.
                </p>
                <p
                  className="font-extrabold tracking-[-0.03em] mt-2"
                  style={{ fontSize: 'clamp(28px, 5vh, 56px)', lineHeight: 1.15, color: 'rgba(255,255,255,0.4)' }}
                >
                  Next to the dental plan.
                </p>
              </div>
            </div>
          </SlideTransition>
        )}

        {/* ====== SLIDE 3: THE PIVOT ====== */}
        {currentIndex === 3 && (
          <SlideTransition phase={phase} direction="scale">
            <div className="absolute inset-0 flex items-center justify-center px-8" style={{ backgroundColor: TEAL }}>
              <p
                className="font-extrabold text-center tracking-[-0.04em]"
                style={{ fontSize: 'clamp(32px, 6.5vh, 68px)', lineHeight: 1.1, color: NAVY }}
              >
                The kind of perk that makes your team stop and say "aaaah."
              </p>
            </div>
          </SlideTransition>
        )}

        {/* ====== SLIDE 4: LOGO REVEAL (matched to Jitter "Logo 2" exactly) ====== */}
        {/* Timeline: 0s ellipse scale → 0.15s icon scale → 0.5s group overshoot → 0.6s group slide left → 1.1s wordmark mask-up word-by-word → 1.8s tagline pan up */}
        {currentIndex === 4 && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{
              backgroundColor: NAVY,
              opacity: phase === 'enter' ? 0 : phase === 'exit' ? 0 : 1,
              transition: 'opacity 0.4s ease',
            }}
          >
            {/* Logo lockup — icon slides from center to left, wordmark masks up beside it */}
            <div className="flex items-center" style={{ marginTop: '-6vh' }}>
              {/* Icon group — starts centered (translateX 140px), overshoots scale, then slides to final position */}
              <div
                style={{
                  flexShrink: 0,
                  animation: phase === 'active'
                    ? 'logo-overshoot 0.4s cubic-bezier(0.22, 1, 0.36, 1) 0.5s forwards, logo-slide-left 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.6s forwards'
                    : 'none',
                  transform: 'translateX(140px) scale(1.1)',
                }}
              >
                {/* Shortcut icon — coral, scales from 0 */}
                <svg
                  width="80"
                  height="60"
                  viewBox="0 0 285 192"
                  fill="none"
                  style={{
                    animation: phase === 'active'
                      ? 'logo-icon-scale 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.15s forwards'
                      : 'none',
                    transform: 'scale(0)',
                    opacity: 0,
                  }}
                >
                  <path fillRule="evenodd" clipRule="evenodd" d="M180.085 123.273C178.523 136.95 174.332 150.363 166.404 161.789C147.666 188.794 115.391 197.809 83.505 187.975C52.0357 178.27 21.5169 150.798 0 106.28L29.4336 92.0535C48.1724 130.823 72.6235 150.408 93.1396 156.736C113.239 162.935 129.965 156.958 139.545 143.152C141.253 140.691 142.721 137.91 143.935 134.846C142.091 134.947 140.246 134.979 138.402 134.945C117.189 134.548 97.7708 125.343 83.1568 112.659C68.6417 100.062 57.4983 82.8406 54.2488 64.5611C50.855 45.4703 56.3132 25.3828 74.6228 11.3512C83.191 4.78496 92.5896 0.887791 102.475 0.134123C112.334 -0.61748 121.541 1.84316 129.627 6.17627C145.351 14.6033 157.577 30.4138 165.925 47.3746C171.212 58.1174 175.313 70.0533 177.861 82.3164C192.547 66.6019 208.52 57.2563 222.041 52.0055C229.027 49.2927 235.456 47.6337 240.848 46.7633C245.575 46.0002 251.284 45.5405 256.04 46.6381L248.689 78.4922C249.256 78.6231 249.56 78.669 249.56 78.669C249.558 78.6929 248.483 78.6453 246.058 79.0368C243.004 79.5298 238.792 80.5701 233.876 82.4796C224.082 86.2829 211.873 93.3814 200.548 105.942C194.094 113.1 187.222 118.845 180.085 123.273ZM147.727 101.517C146.5 87.8421 142.494 73.7985 136.594 61.8105C129.869 48.148 121.609 38.9693 114.185 34.9907C110.696 33.1211 107.663 32.5248 104.96 32.7309C102.284 32.9349 98.8002 34.0099 94.5082 37.2992C87.0974 42.9785 84.9004 50.2039 86.4355 58.8393C88.1148 68.2858 94.4842 79.2038 104.585 87.9699C114.586 96.6501 126.886 102.033 139.013 102.259C141.841 102.312 144.754 102.088 147.727 101.517Z" fill={CORAL}/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M227.95 60.6342C212.285 55.7034 200.552 45.6102 190.79 34.575L215.742 12.5006C223.559 21.3371 230.444 26.4925 237.953 28.8562C245.287 31.1646 255.432 31.4939 271.035 26.2883L284.604 56.5339C273.057 63.1664 266.67 73.9685 263.648 85.1433C262.14 90.7193 261.573 96.0733 261.599 100.426C261.625 104.815 262.24 107.049 262.315 107.323C262.322 107.346 262.322 107.35 262.322 107.35L231.654 120.365C229.232 114.657 228.325 107.44 228.284 100.627C228.241 93.4035 229.161 85.049 231.488 76.4463C232.7 71.9629 234.323 67.3261 236.435 62.7047C233.55 62.1969 230.724 61.5071 227.95 60.6342Z" fill={CORAL}/>
                </svg>
              </div>

              {/* Wordmark "shortcut" — each letter group masks up from bottom, word-by-word with 100ms stagger */}
              <div className="flex items-center overflow-visible" style={{ marginLeft: 14, height: 50 }}>
                {['s','h','o','r','t','c','u','t'].map((letter, i) => (
                  <span
                    key={i}
                    className="inline-block overflow-hidden"
                    style={{ height: 50 }}
                  >
                    <span
                      className="inline-block font-extrabold"
                      style={{
                        fontSize: 50,
                        lineHeight: 1,
                        color: '#FFFFFF',
                        fontFamily: 'Outfit, system-ui, sans-serif',
                        letterSpacing: '-0.02em',
                        animation: phase === 'active'
                          ? `word-mask-up 0.3s cubic-bezier(0.22, 1, 0.36, 1) ${1.1 + i * 0.04}s forwards`
                          : 'none',
                        transform: 'translateY(100%)',
                        opacity: 0,
                      }}
                    >
                      {letter}
                    </span>
                  </span>
                ))}
              </div>
            </div>

            {/* "Employee Happiness Delivered." — pans up after full logo animation */}
            <p
              className="font-extrabold text-center tracking-[-0.03em] mt-10"
              style={{
                fontSize: 'clamp(32px, 5.5vh, 56px)',
                lineHeight: 1.1,
                color: '#FFFFFF',
                fontFamily: 'Outfit, system-ui, sans-serif',
                animation: phase === 'active'
                  ? 'tagline-pan-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) 1.8s forwards'
                  : 'none',
                opacity: 0,
                transform: 'translateY(40px)',
              }}
            >
              Employee<br />Happiness<br />Delivered.
            </p>
          </div>
        )}

        {/* ====== SLIDE 5: SERVICE LIST GLIDE (Jitter "Glide" style, G — Service Colors design) ====== */}
        {currentIndex === 5 && (
          <div
            className="absolute inset-0 flex items-center"
            style={{
              backgroundColor: NAVY,
              opacity: phase === 'enter' ? 0 : phase === 'exit' ? 0 : 1,
              transition: 'opacity 0.4s ease',
            }}
          >
            <div className="w-full" style={{ paddingLeft: '7%', paddingTop: '6%' }}>
              {[
                { name: 'Massage', color: TEAL },
                { name: 'Nails', color: PINK },
                { name: 'Haircut', color: YELLOW },
                { name: 'Beauty', color: PINK },
                { name: 'Mindfulness', color: YELLOW },
                { name: 'Headshots', color: TEAL },
              ].map((service, i) => (
                <p
                  key={service.name}
                  className="font-bold tracking-[-0.01em]"
                  style={{
                    fontSize: 'clamp(40px, 8vh, 80px)',
                    lineHeight: 1.0,
                    color: service.color,
                    fontFamily: 'Outfit, system-ui, sans-serif',
                    animation: phase === 'active'
                      ? `glide-in-right 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${i * 0.12}s forwards, glide-back-left 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${0.9 + i * 0.08}s forwards`
                      : 'none',
                    transform: 'translateX(-120%)',
                    opacity: 0,
                  }}
                >
                  {service.name}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* ====== SLIDES 6-10: SERVICE VIDEO SHOWCASE ====== */}
        {currentIndex >= 6 && currentIndex <= 10 && (
          <ServiceSlide
            service={SERVICES[currentIndex - 6]}
            phase={phase}
          />
        )}

        {/* ====== SLIDE 11: THE PLATFORM ====== */}
        {currentIndex === 11 && (
          <SlideTransition phase={phase} direction="up">
            <div className="absolute inset-0 flex flex-col items-center justify-center px-8" style={{ backgroundColor: NAVY }}>
              <p
                className="font-extrabold text-center tracking-[-0.04em]"
                style={{ fontSize: 'clamp(36px, 7vh, 76px)', lineHeight: 1.05, color: '#FFFFFF' }}
              >
                One vendor.
              </p>
              <p
                className="font-extrabold text-center tracking-[-0.04em] mt-2"
                style={{ fontSize: 'clamp(36px, 7vh, 76px)', lineHeight: 1.05, color: TEAL }}
              >
                Every office.
              </p>
              <p
                className="font-bold text-center tracking-[-0.02em] mt-8"
                style={{ fontSize: 'clamp(18px, 3vh, 32px)', lineHeight: 1.3, color: 'rgba(255,255,255,0.6)' }}
              >
                A dozen ways to breathe easier.
              </p>
            </div>
          </SlideTransition>
        )}

        {/* ====== SLIDE 12: EASE ====== */}
        {currentIndex === 12 && (
          <SlideTransition phase={phase} direction="left">
            <div className="absolute inset-0 flex items-center justify-center px-10" style={{ backgroundColor: CORAL }}>
              <div className="text-center">
                <p
                  className="font-extrabold tracking-[-0.03em]"
                  style={{ fontSize: 'clamp(28px, 5vh, 52px)', lineHeight: 1.15, color: '#FFFFFF' }}
                >
                  We handle scheduling, sign ups, and reminders.
                </p>
                <p
                  className="font-extrabold tracking-[-0.03em] mt-6"
                  style={{ fontSize: 'clamp(36px, 6.5vh, 68px)', lineHeight: 1.05, color: NAVY }}
                >
                  You handle nothing.
                </p>
              </div>
            </div>
          </SlideTransition>
        )}

        {/* ====== SLIDE 13: CLOSE ====== */}
        {currentIndex === 13 && (
          <SlideTransition phase={phase} direction="fade">
            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ backgroundColor: NAVY }}>
              {Array.from({ length: 12 }, (_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    width: 3 + Math.random() * 5,
                    height: 3 + Math.random() * 5,
                    backgroundColor: TEAL,
                    opacity: 0.12 + Math.random() * 0.12,
                    animation: `float-particle ${7 + Math.random() * 5}s ease-in-out ${Math.random() * 3}s infinite alternate`,
                  }}
                />
              ))}
              <div className="relative z-10 text-center">
                <p
                  className="font-extrabold tracking-[-0.03em]"
                  style={{ fontSize: 'clamp(36px, 6vh, 64px)', lineHeight: 1.1, color: '#FFFFFF' }}
                >
                  Employee<br />Happiness<br />Delivered.
                </p>
                <div className="mt-10">
                  <ShortcutLogo variant="coral" size={52} />
                </div>
              </div>
            </div>
          </SlideTransition>
        )}

        </>}
        {/* ====== END V1 SLIDES ====== */}

        {/* ====== PERSISTENT QR BADGE (after slide 0) ====== */}
        <QRBadge visible={showQRBadge} />

        {/* Progress dots */}
        <div
          className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-20"
          style={{
            opacity: cursorHidden ? 0 : 0.4,
            transition: 'opacity 0.5s ease',
          }}
        >
          {Array.from({ length: totalSlides }, (_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: 6,
                height: i === currentIndex ? 18 : 6,
                backgroundColor: i === currentIndex ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
              }}
            />
          ))}
        </div>

        {/* Fullscreen hint */}
        {!isFullscreen && (
          <div
            className="absolute top-3 right-3 z-20 px-2 py-1 rounded text-xs font-bold"
            style={{
              backgroundColor: 'rgba(0,0,0,0.4)',
              color: 'rgba(255,255,255,0.5)',
              opacity: cursorHidden ? 0 : 1,
              transition: 'opacity 0.5s ease',
              fontSize: 10,
            }}
          >
            Press F for fullscreen
          </div>
        )}

        {/* Version toggle — top left, fades with cursor */}
        <div
          className="absolute top-3 left-3 z-20 flex gap-1"
          style={{
            opacity: cursorHidden ? 0 : 0.6,
            transition: 'opacity 0.5s ease',
          }}
        >
          {[1, 2, 3].map(v => (
            <button
              key={v}
              onClick={() => {
                const url = new URL(window.location.href);
                if (v === 1) url.searchParams.delete('v');
                else url.searchParams.set('v', String(v));
                window.location.href = url.toString();
              }}
              className="font-bold"
              style={{
                fontSize: 10,
                padding: '3px 8px',
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: version === v ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                color: version === v ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
              }}
            >
              V{v}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
