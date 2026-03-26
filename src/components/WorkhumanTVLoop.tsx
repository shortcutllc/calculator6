import { useState, useEffect, useCallback, useRef } from 'react';

// Brand colors
const NAVY = '#003756';
const CORAL = '#FF5050';
const TEAL = '#9EFAFF';
const YELLOW = '#FEDC64';
const PINK = '#F7BBFF';

// Copy lines from privacy screens
const COPY_LINES = [
  'That meeting could have been a massage.',
  'Employee Happiness Delivered.',
  'Wellness that works.',
  'Real wellness, right between meetings.',
  'We create space — to reset.',
];

const SERVICES = ['Massage', 'Nails', 'Haircut', 'Spa', 'Mindfulness', 'Headshots'];

const SERVICE_COLORS = [TEAL, PINK, YELLOW, TEAL, YELLOW, PINK];

// --- Reusable ShortcutLogo (same as WorkhumanBoothDesigns) ---
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

// --- Animated Counter ---
function AnimatedCounter({ target, duration = 2000, prefix = '', suffix = '' }: {
  target: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!started) return;
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [started, target, duration]);

  // Start when visible
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

// --- Floating particles (CSS-only feel, but via canvas-free divs) ---
function FloatingParticles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: 3 + Math.random() * 6,
    delay: Math.random() * 8,
    duration: 6 + Math.random() * 8,
    opacity: 0.1 + Math.random() * 0.2,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            backgroundColor: TEAL,
            opacity: p.opacity,
            animation: `float-particle ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}

// --- QR Code placeholder (simple SVG pattern) ---
function QRPlaceholder({ size = 280 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20 }}
    >
      {/* Grid pattern to simulate QR code */}
      <svg width={size - 40} height={size - 40} viewBox="0 0 21 21">
        {/* Corner squares */}
        <rect x="0" y="0" width="7" height="7" fill={NAVY} />
        <rect x="1" y="1" width="5" height="5" fill="white" />
        <rect x="2" y="2" width="3" height="3" fill={NAVY} />
        <rect x="14" y="0" width="7" height="7" fill={NAVY} />
        <rect x="15" y="1" width="5" height="5" fill="white" />
        <rect x="16" y="2" width="3" height="3" fill={NAVY} />
        <rect x="0" y="14" width="7" height="7" fill={NAVY} />
        <rect x="1" y="15" width="5" height="5" fill="white" />
        <rect x="2" y="16" width="3" height="3" fill={NAVY} />
        {/* Random data dots */}
        {[
          [8,0],[10,0],[8,2],[9,3],[10,2],[11,1],[12,3],
          [0,8],[2,8],[3,9],[4,8],[1,10],[3,10],[5,9],
          [8,8],[9,9],[10,8],[11,9],[12,10],[8,10],[10,10],
          [14,8],[15,9],[16,10],[17,8],[18,9],[19,10],[20,8],
          [8,14],[9,15],[10,14],[11,15],[12,16],[8,16],[10,16],
          [14,14],[16,15],[18,16],[15,17],[17,18],[19,19],[20,20],
        ].map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="1" height="1" fill={NAVY} />
        ))}
      </svg>
      <div className="absolute bottom-2 text-[10px] font-bold text-gray-400">SCAN TO BOOK</div>
    </div>
  );
}

// --- Slide definitions ---
interface Slide {
  id: string;
  duration: number; // ms
  render: (phase: 'enter' | 'active' | 'exit') => React.ReactNode;
}

function useSlideshow(slides: Slide[]) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<'enter' | 'active' | 'exit'>('enter');
  const slidesRef = useRef(slides);
  slidesRef.current = slides;

  useEffect(() => {
    const slide = slidesRef.current[currentIndex];
    if (!slide) return;

    // Enter phase: 800ms
    const enterTimer = setTimeout(() => setPhase('active'), 800);

    // Active phase: slide.duration - 800ms before end
    const activeTimer = setTimeout(() => setPhase('exit'), slide.duration - 800);

    // Transition to next slide
    const nextTimer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % slidesRef.current.length);
      setPhase('enter');
    }, slide.duration);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(activeTimer);
      clearTimeout(nextTimer);
    };
  }, [currentIndex]);

  return { currentIndex, phase };
}

// --- Main Component ---
export default function WorkhumanTVLoop() {
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

  // Keyboard: F for fullscreen
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleFullscreen]);

  // Hide cursor after 3s of inactivity
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
    return () => {
      window.removeEventListener('mousemove', show);
      clearTimeout(timer);
    };
  }, []);

  const slides: Slide[] = [
    // 1. Hero
    {
      id: 'hero',
      duration: 8000,
      render: (phase) => (
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ backgroundColor: NAVY }}>
          <FloatingParticles />
          <div
            className="relative z-10 text-center"
            style={{
              opacity: phase === 'enter' ? 0 : phase === 'exit' ? 0 : 1,
              transform: phase === 'enter' ? 'translateY(40px)' : phase === 'exit' ? 'translateY(-20px)' : 'translateY(0)',
              transition: 'all 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <p
              className="font-extrabold tracking-[-0.04em]"
              style={{
                fontSize: 140,
                lineHeight: 0.95,
                color: '#FFFFFF',
                fontFamily: 'Outfit, system-ui, sans-serif',
              }}
            >
              Recharge.
            </p>
            <p
              className="font-extrabold tracking-[-0.02em] mt-6"
              style={{
                fontSize: 32,
                color: TEAL,
                fontFamily: 'Outfit, system-ui, sans-serif',
                opacity: 0.8,
              }}
            >
              Slack. Zoom. Shortcut. One of these helps you relax.
            </p>
            <div className="mt-12">
              <ShortcutLogo variant="white" size={48} />
            </div>
          </div>
        </div>
      ),
    },

    // 2. Video/Ambient placeholder
    {
      id: 'video',
      duration: 10000,
      render: (phase) => (
        <div className="absolute inset-0" style={{ backgroundColor: NAVY }}>
          {/* Gradient placeholder — replace with <video> when ready */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${NAVY} 0%, #004d6d 30%, #006080 60%, ${NAVY} 100%)`,
              animation: 'gradient-shift 10s ease infinite',
            }}
          />
          {/* TODO: Replace above div with:
            <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover">
              <source src="/your-video.mp4" type="video/mp4" />
            </video>
          */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center z-10"
            style={{
              opacity: phase === 'enter' ? 0 : phase === 'exit' ? 0 : 1,
              transition: 'opacity 0.8s ease',
            }}
          >
            <p
              className="font-extrabold tracking-[-0.03em] text-center"
              style={{
                fontSize: 80,
                lineHeight: 1.05,
                color: '#FFFFFF',
                fontFamily: 'Outfit, system-ui, sans-serif',
                textShadow: '0 4px 40px rgba(0,0,0,0.5)',
                maxWidth: '80%',
              }}
            >
              Employee Happiness Delivered.
            </p>
            <div className="mt-10">
              <ShortcutLogo variant="white" size={56} />
            </div>
          </div>
        </div>
      ),
    },

    // 3. Services — animated reveal
    {
      id: 'services',
      duration: 10000,
      render: (phase) => (
        <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: NAVY }}>
          <div
            className="text-left"
            style={{
              opacity: phase === 'exit' ? 0 : 1,
              transition: 'opacity 0.8s ease',
            }}
          >
            {SERVICES.map((service, i) => (
              <p
                key={service}
                className="font-extrabold tracking-[-0.04em]"
                style={{
                  fontSize: 'clamp(48px, 7vw, 96px)',
                  lineHeight: 1.15,
                  color: SERVICE_COLORS[i],
                  fontFamily: 'Outfit, system-ui, sans-serif',
                  opacity: phase === 'enter' ? 0 : 1,
                  transform: phase === 'enter' ? 'translateX(-40px)' : 'translateX(0)',
                  transition: `all 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${i * 150}ms`,
                }}
              >
                {service}
              </p>
            ))}
            <div
              className="mt-8"
              style={{
                opacity: phase === 'enter' ? 0 : 1,
                transition: `opacity 0.6s ease ${SERVICES.length * 150}ms`,
              }}
            >
              <ShortcutLogo variant="white" size={40} />
            </div>
          </div>
        </div>
      ),
    },

    // 4. Stats — counter animations
    {
      id: 'stats',
      duration: 10000,
      render: (phase) => (
        <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: NAVY }}>
          <div
            className="text-center"
            style={{
              opacity: phase === 'enter' ? 0 : phase === 'exit' ? 0 : 1,
              transform: phase === 'enter' ? 'scale(0.95)' : 'scale(1)',
              transition: 'all 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <div className="flex gap-16 mb-16 px-12">
              {[
                { target: 500, suffix: '+', label: 'Companies', color: TEAL },
                { target: 50, suffix: '+', label: 'Cities', color: YELLOW },
                { target: 6, suffix: '', label: 'Services', color: PINK },
              ].map((stat, i) => (
                <div key={i} className="text-center flex-1">
                  <p
                    className="font-extrabold tracking-[-0.04em]"
                    style={{
                      fontSize: 'clamp(60px, 8vw, 120px)',
                      lineHeight: 1,
                      color: stat.color,
                      fontFamily: 'Outfit, system-ui, sans-serif',
                    }}
                  >
                    {phase === 'active' ? (
                      <AnimatedCounter target={stat.target} suffix={stat.suffix} duration={2500} />
                    ) : (
                      `${stat.target}${stat.suffix}`
                    )}
                  </p>
                  <p
                    className="font-bold tracking-[-0.01em] mt-2"
                    style={{
                      fontSize: 24,
                      color: '#FFFFFF',
                      fontFamily: 'Outfit, system-ui, sans-serif',
                      opacity: 0.7,
                    }}
                  >
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
            <p
              className="font-extrabold tracking-[-0.02em]"
              style={{
                fontSize: 36,
                color: '#FFFFFF',
                fontFamily: 'Outfit, system-ui, sans-serif',
              }}
            >
              One platform. One vendor. Zero hassle.
            </p>
          </div>
        </div>
      ),
    },

    // 5. Copy lines — rotating
    ...COPY_LINES.map((line, idx) => ({
      id: `copy-${idx}`,
      duration: 5000,
      render: (phase: 'enter' | 'active' | 'exit') => {
        const bgs = [CORAL, NAVY, TEAL, NAVY, CORAL];
        const textColors = ['#FFFFFF', '#FFFFFF', NAVY, TEAL, '#FFFFFF'];
        const bg = bgs[idx % bgs.length];
        const textColor = textColors[idx % textColors.length];
        return (
          <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: bg }}>
            <div
              className="text-center px-20"
              style={{
                opacity: phase === 'enter' ? 0 : phase === 'exit' ? 0 : 1,
                transform: phase === 'enter' ? 'translateY(30px)' : phase === 'exit' ? 'translateY(-15px)' : 'translateY(0)',
                transition: 'all 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <p
                className="font-extrabold tracking-[-0.03em]"
                style={{
                  fontSize: 80,
                  lineHeight: 1.1,
                  color: textColor,
                  fontFamily: 'Outfit, system-ui, sans-serif',
                  maxWidth: 1000,
                }}
              >
                {line}
              </p>
            </div>
            <div className="absolute" style={{ bottom: '5%', right: '5%' }}>
              <ShortcutLogo variant={bg === NAVY || bg === CORAL ? 'white' : 'navy'} size={40} />
            </div>
          </div>
        );
      },
    })),

    // 6. QR Code
    {
      id: 'qr',
      duration: 8000,
      render: (phase) => (
        <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: CORAL }}>
          <div
            className="text-center"
            style={{
              opacity: phase === 'enter' ? 0 : phase === 'exit' ? 0 : 1,
              transform: phase === 'enter' ? 'scale(0.9)' : 'scale(1)',
              transition: 'all 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <p
              className="font-extrabold tracking-[-0.03em] mb-10"
              style={{
                fontSize: 64,
                lineHeight: 1.1,
                color: '#FFFFFF',
                fontFamily: 'Outfit, system-ui, sans-serif',
              }}
            >
              Book Your Massage
            </p>
            <div className="flex justify-center">
              <QRPlaceholder size={320} />
            </div>
            <p
              className="font-bold mt-8"
              style={{
                fontSize: 28,
                color: '#FFFFFF',
                fontFamily: 'Outfit, system-ui, sans-serif',
                opacity: 0.8,
              }}
            >
              Scan to reserve your 15-minute session
            </p>
          </div>
        </div>
      ),
    },

    // 7. Closing
    {
      id: 'closing',
      duration: 8000,
      render: (phase) => (
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ backgroundColor: NAVY }}>
          <FloatingParticles />
          <div
            className="relative z-10 text-center"
            style={{
              opacity: phase === 'enter' ? 0 : phase === 'exit' ? 0 : 1,
              transition: 'all 1s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <p
              className="font-extrabold tracking-[-0.03em]"
              style={{
                fontSize: 72,
                lineHeight: 1.1,
                color: '#FFFFFF',
                fontFamily: 'Outfit, system-ui, sans-serif',
                maxWidth: 900,
              }}
            >
              Real wellness, right between meetings.
            </p>
            <div className="mt-14">
              <ShortcutLogo variant="coral" size={64} />
            </div>
          </div>
        </div>
      ),
    },
  ];

  const { currentIndex, phase } = useSlideshow(slides);

  return (
    <>
      {/* Global keyframe animations */}
      <style>{`
        @keyframes float-particle {
          0% { transform: translateY(0) translateX(0); }
          100% { transform: translateY(-30px) translateX(15px); }
        }
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      <div
        className="relative w-screen h-screen overflow-hidden"
        style={{
          fontFamily: 'Outfit, system-ui, sans-serif',
          cursor: cursorHidden ? 'none' : 'default',
          backgroundColor: NAVY,
        }}
      >
        {/* Current slide */}
        {slides[currentIndex]?.render(phase)}

        {/* Slide progress dots — bottom center, subtle */}
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20"
          style={{
            opacity: cursorHidden ? 0 : 0.5,
            transition: 'opacity 0.5s ease',
          }}
        >
          {slides.map((s, i) => (
            <div
              key={s.id}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === currentIndex ? 24 : 8,
                height: 8,
                backgroundColor: i === currentIndex ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
              }}
            />
          ))}
        </div>

        {/* Fullscreen hint — top right, fades with cursor */}
        {!isFullscreen && (
          <div
            className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{
              backgroundColor: 'rgba(0,0,0,0.4)',
              color: 'rgba(255,255,255,0.6)',
              opacity: cursorHidden ? 0 : 1,
              transition: 'opacity 0.5s ease',
            }}
          >
            Press F for fullscreen
          </div>
        )}
      </div>
    </>
  );
}
