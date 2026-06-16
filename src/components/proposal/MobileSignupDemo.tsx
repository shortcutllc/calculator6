// MobileSignupDemo — a self-playing animated demo of the redesigned mobile
// employee sign-up flow. Renders bare (no iPhone bezel, no card chrome) and
// fills its slot as a rounded portrait "phone screen". Autoplays, loops, and
// freezes on a static frame when the user prefers reduced motion.
//
// Ported from the design handoff (signup_demo/mobile-demo.jsx — MobileSignupDemoCore
// + useMdTimeline). Styling lives in mobile-signup-demo.css (lt-/md- classes).
// The dynamic camera-zoom wrapper (module-v2.jsx) and the iPhone frame are
// intentionally omitted — this is the phone-screen demo only.

import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import './mobile-signup-demo.css';

// Content is the BCG "Massage Day" sample from the design.
const MD_NAME = 'Jordan Patel';
const MD_EMAIL = 'jordan@bcg.com';

const MD_SERVICES = [
  { id: 'chair', name: 'Chair massage', sub: '15 minutes. Free.' },
  { id: 'neck', name: 'Neck & shoulders', sub: '10 minutes. Free.' },
  { id: 'back', name: 'Full back', sub: '20 minutes. Free.' },
  { id: 'deep', name: 'Deep tissue', sub: '20 minutes. Free.' },
];

const MD_SLOTS: { t: string; taken?: boolean }[] = [
  { t: '11:00' }, { t: '11:20', taken: true }, { t: '11:40' },
  { t: '12:00', taken: true }, { t: '12:20' }, { t: '12:40' },
  { t: '1:00' }, { t: '1:20' },
];

type DotState = { target: string; tap: boolean } | null;

export interface MdState {
  scroll: string;
  service: string | null;
  slot: string | null;
  name: string;
  email: string;
  focus: string | null;
  consent: boolean;
  screen: 'page' | 'confirmed';
  dot: DotState;
  leaving: boolean;
}

function mdInitial(): MdState {
  return {
    scroll: 'top', service: null, slot: null,
    name: '', email: '', focus: null, consent: false,
    screen: 'page', dot: null, leaving: false,
  };
}

interface MdStep { dur: number; set: Partial<MdState> }

function mdBuildSteps(): MdStep[] {
  const s: MdStep[] = [];
  const push = (dur: number, set: Partial<MdState>) => s.push({ dur, set });

  push(1600, {});                                                   // hero hold
  push(1000, { scroll: 'services' });
  push(650, { dot: { target: 'svc-chair', tap: false } });
  push(320, { dot: { target: 'svc-chair', tap: true } });
  push(750, { service: 'chair', dot: { target: 'svc-chair', tap: false } });
  push(1000, { scroll: 'times', dot: null });
  push(650, { dot: { target: 'slot-12:40', tap: false } });
  push(320, { dot: { target: 'slot-12:40', tap: true } });
  push(750, { slot: '12:40', dot: { target: 'slot-12:40', tap: false } });
  push(1000, { scroll: 'details', dot: null });
  MD_NAME.split('').forEach((_, i) =>
    push(i ? 65 : 400, { name: MD_NAME.slice(0, i + 1), focus: 'name' }));
  MD_EMAIL.split('').forEach((_, i) =>
    push(i ? 55 : 400, { email: MD_EMAIL.slice(0, i + 1), focus: 'email' }));
  push(420, { focus: null });
  push(550, { dot: { target: 'consent', tap: false } });
  push(300, { dot: { target: 'consent', tap: true } });
  push(500, { consent: true, dot: { target: 'consent', tap: false } });
  push(550, { dot: { target: 'cta', tap: false } });
  push(320, { dot: { target: 'cta', tap: true } });
  push(450, { dot: null });
  push(500, { screen: 'confirmed' });
  push(2800, {});
  push(700, { leaving: true });
  return s;
}
const MD_STEPS = mdBuildSteps();

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

// Drives the timeline. When `paused` (reduced motion), it freezes on the hero
// frame and never advances — the screen is static, no motion.
export function useMdTimeline(speed: number, paused: boolean): MdState {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (paused) {
      setI(0);
      return;
    }
    const t = setTimeout(
      () => setI((v) => (v + 1) % MD_STEPS.length),
      MD_STEPS[i].dur / speed
    );
    return () => clearTimeout(t);
  }, [i, speed, paused]);

  return useMemo(() => {
    const st = mdInitial();
    for (let k = 0; k <= i; k++) Object.assign(st, MD_STEPS[k].set);
    return st;
  }, [i]);
}

// ── tiny icon set (Lucide-style strokes) ────────────────────
const MD_PATHS: Record<string, React.ReactNode> = {
  calendar: <g><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4M8 2v4M3 10h18"></path></g>,
  pin: <g><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></g>,
  user: <g><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></g>,
  check: <path d="M20 6 9 17l-5-5"></path>,
  back: <path d="m15 18-6-6 6-6"></path>,
};

function MdIcon({ name, size = 18, stroke = 'currentColor', sw = 1.5 }: {
  name: string; size?: number; stroke?: string; sw?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
         style={{ flexShrink: 0 }}>
      {MD_PATHS[name]}
    </svg>
  );
}

function MdField({ label, value, placeholder, focused }: {
  label: string; value: string; placeholder: string; focused: boolean;
}) {
  return (
    <div className="lt-field" style={{ marginBottom: 12 }}>
      <span className="lt-label">{label}</span>
      <div className={'lt-input' + (focused ? ' focus' : '')}>
        {value
          ? <span style={{ color: 'var(--sc-navy)' }}>{value}</span>
          : <span style={{ color: 'rgba(3,34,50,0.35)' }}>{placeholder}</span>}
        {focused && <span className="md-caret"></span>}
      </div>
    </div>
  );
}

type RegFn = (k: string, el: HTMLElement | null) => void;

function MdPage({ state, reg }: { state: MdState; reg: RegFn }) {
  return (
    <div>
      {/* Hero */}
      <div className="lt-m-hero" style={{ height: 330 }}>
        <img src="/signup-demo/massage.png" alt="Massage day" />
        <div className="lt-m-hero-chrome" style={{ top: 62 }}>
          <span className="lt-m-circle"><MdIcon name="back" size={18} stroke="#032232" sw={2} /></span>
          <span className="lt-m-brand-pill">
            <img src="/signup-demo/bcg-logo.webp" alt="BCG" style={{ height: 16, width: 'auto' }} />
            <span style={{ color: 'rgba(3,34,50,0.4)' }}>with</span>
            <img src="/signup-demo/shortcut-logo-rgb.svg" alt="Shortcut" />
          </span>
        </div>
      </div>

      {/* Sheet */}
      <div className="lt-m-sheet" style={{ paddingBottom: 150 }}>
        <p className="lt-eyebrow" style={{ marginBottom: 8 }}>You're invited</p>
        <h1 className="lt-m-h1">Massage Day at BCG</h1>
        <p className="lt-body" style={{ fontSize: 15, marginTop: 8 }}>
          Seated massage with a licensed therapist. Free for employees.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
          <span className="lt-meta"><MdIcon name="calendar" stroke="var(--sc-teal)" />Thursday, June 18 · 11:00 am to 4:00 pm</span>
          <span className="lt-meta"><MdIcon name="pin" stroke="var(--sc-teal)" />11th floor lounge</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
          <div className="lt-bar" style={{ flex: 1 }}><span style={{ width: '70%' }}></span></div>
          <span className="lt-small" style={{ whiteSpace: 'nowrap' }}>28 of 40 taken</span>
        </div>

        <hr className="lt-divider" style={{ margin: '22px 0' }} />

        {/* Services */}
        <div ref={(el) => { if (el) reg('sec-services', el); }} data-cap="sec-services">
          <h2 className="lt-h2" style={{ fontSize: 20 }}>Pick your service</h2>
          <div className="lt-m-service-stack" style={{ marginTop: 14 }}>
            {MD_SERVICES.map((svc) => (
              <div key={svc.id}
                   ref={(el) => { if (el) reg('svc-' + svc.id, el); }}
                   data-cap={'svc-' + svc.id}
                   className={'lt-service-card' + (state.service === svc.id ? ' selected' : '')}>
                <div className="lt-service-name">{svc.name}<span className="lt-radio"></span></div>
                <div className="lt-service-sub">{svc.sub}</div>
              </div>
            ))}
          </div>
          {state.service && (
            <div style={{ background: 'rgba(0,152,173,0.08)', borderRadius: 14, padding: '14px 16px', marginTop: 12 }}>
              <div className="lt-h3" style={{ fontSize: 14 }}>Chair massage</div>
              <p className="lt-body" style={{ fontSize: 13.5, marginTop: 4 }}>
                A 15-minute seated massage focusing on neck, shoulders, and back. Performed over clothing.
              </p>
            </div>
          )}
        </div>

        <hr className="lt-divider" style={{ margin: '22px 0' }} />

        {/* Times */}
        <div ref={(el) => { if (el) reg('sec-times', el); }} data-cap="sec-times">
          <h2 className="lt-h2" style={{ fontSize: 20 }}>Pick your time</h2>
          <div className="lt-pro" style={{ margin: '14px 0 10px' }}>
            <div className="lt-avatar" style={{ width: 40, height: 40, fontSize: 13 }}>MR</div>
            <div>
              <div className="lt-pro-name" style={{ fontSize: 15 }}>Maya Rivera</div>
              <span className="lt-tag" style={{ background: 'rgba(254,220,100,0.4)', marginTop: 3, display: 'inline-flex' }}>Massage</span>
            </div>
          </div>
          <div className="lt-slot-grid">
            {MD_SLOTS.map((s) => (
              <span key={s.t}
                    ref={(el) => { if (el) reg('slot-' + s.t, el); }}
                    data-cap={'slot-' + s.t}
                    className={'lt-slot' + (s.taken ? ' taken' : '') + (state.slot === s.t ? ' selected' : '')}>
                {s.t}
              </span>
            ))}
          </div>
        </div>

        <hr className="lt-divider" style={{ margin: '22px 0' }} />

        {/* Details */}
        <div ref={(el) => { if (el) reg('sec-details', el); }} data-cap="sec-details">
          <h2 className="lt-h2" style={{ fontSize: 20, marginBottom: 14 }}>Your details</h2>
          <MdField label="Full name" value={state.name} placeholder="Your name" focused={state.focus === 'name'} />
          <MdField label="Work email" value={state.email} placeholder="you@company.com" focused={state.focus === 'email'} />
          <div className="lt-consent" style={{ marginTop: 14 }}>
            <span ref={(el) => { if (el) reg('consent', el); }}
                  data-cap="consent"
                  className={'lt-checkbox' + (state.consent ? ' checked' : '')}>
              {state.consent && <MdIcon name="check" size={13} stroke="#fff" sw={2.5} />}
            </span>
            <p className="lt-body" style={{ fontSize: 13 }}>
              I agree to the <a href="#">terms of service</a> and <a href="#">privacy policy</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MdConfirmed() {
  return (
    <div className="md-screen" style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '0 26px', textAlign: 'center',
    }}>
      <div className="lt-check-circle md-check"><MdIcon name="check" size={30} stroke="#fff" sw={2.5} /></div>
      <h1 className="lt-m-h1" style={{ marginTop: 18 }}>You're booked.</h1>
      <p className="lt-body" style={{ fontSize: 14, marginTop: 6 }}>
        A confirmation is on its way to jordan@bcg.com.
      </p>
      <div style={{ background: 'var(--sc-light-gray)', borderRadius: 16, padding: '18px 20px', marginTop: 22, textAlign: 'left', alignSelf: 'stretch' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="lt-meta" style={{ fontSize: 13.5 }}><MdIcon name="calendar" stroke="var(--sc-teal)" />Thu, June 18 · 12:40 pm EST</span>
          <span className="lt-meta" style={{ fontSize: 13.5 }}><MdIcon name="user" stroke="var(--sc-teal)" />Chair massage with Maya Rivera</span>
          <span className="lt-meta" style={{ fontSize: 13.5 }}><MdIcon name="pin" stroke="var(--sc-teal)" />350 5th Ave, 11th floor lounge</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <span className="lt-btn lt-btn-secondary lt-btn-sm">Google</span>
        <span className="lt-btn lt-btn-secondary lt-btn-sm">Apple</span>
        <span className="lt-btn lt-btn-secondary lt-btn-sm">Outlook</span>
      </div>
    </div>
  );
}

export function MobileSignupDemoCore({ state }: { state: MdState }) {
  const targets = useRef<Record<string, HTMLElement | null>>({});
  const viewRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const reg = useCallback<RegFn>((k, el) => { targets.current[k] = el; }, []);

  // scroll
  useLayoutEffect(() => {
    const v = viewRef.current, c = contentRef.current;
    if (!v || !c) return;
    let y = 0;
    if (state.scroll !== 'top') {
      const el = targets.current['sec-' + state.scroll];
      if (el) y = Math.max(0, el.offsetTop - 86);
      const max = Math.max(0, c.scrollHeight - v.clientHeight);
      y = Math.min(y, max);
    }
    c.style.transform = 'translateY(' + (-y) + 'px)';
  }, [state.scroll, state.screen]);

  // dot
  useLayoutEffect(() => {
    const dot = dotRef.current, v = viewRef.current;
    if (!dot || !v) return;
    const el = state.dot ? targets.current[state.dot.target] : null;
    if (!el || !el.isConnected) { dot.style.opacity = '0'; return; }
    const vr = v.getBoundingClientRect();
    const sc = vr.width / v.offsetWidth || 1;
    const tr = el.getBoundingClientRect();
    const x = (tr.left + tr.width / 2 - vr.left) / sc;
    const yy = (tr.top + tr.height / 2 - vr.top) / sc;
    dot.style.opacity = '1';
    dot.style.transform = 'translate(' + (x - 13) + 'px, ' + (yy - 13) + 'px)';
  }, [state]);

  return (
    <div ref={viewRef} className="md-viewport md-fade" style={{ opacity: state.leaving ? 0 : 1 }}>
      {state.screen === 'page' ? (
        <React.Fragment>
          <div ref={contentRef} className="md-content">
            <MdPage state={state} reg={reg} />
          </div>
          <div className="lt-m-cta-bar" style={{ paddingBottom: 30 }}>
            <div>
              <div className="lt-m-slot-note">{state.slot ? 'Thu, Jun 18 · 12:40 pm' : 'Massage Day at BCG'}</div>
              <div className="lt-m-slot-sub">{state.slot ? 'Chair massage · Free' : 'Free for BCG employees'}</div>
            </div>
            <span ref={(el) => { if (el) reg('cta', el); }}
                  data-cap="cta"
                  className={'lt-btn ' + (state.slot ? 'lt-btn-coral' : 'lt-btn-disabled')}
                  style={{ padding: '15px 24px' }}>
              Book my spot
            </span>
          </div>
        </React.Fragment>
      ) : (
        <MdConfirmed />
      )}
      <div ref={dotRef} className={'md-dot' + (state.dot && state.dot.tap ? ' tap' : '')}>
        <div className="md-dot-inner"></div>
      </div>
    </div>
  );
}

interface MobileSignupDemoProps {
  /** Playback speed multiplier (1 = design default). */
  speed?: number;
}

const MobileSignupDemo: React.FC<MobileSignupDemoProps> = ({ speed = 1 }) => {
  const reduced = usePrefersReducedMotion();
  const state = useMdTimeline(speed, reduced);
  return (
    <div className="msd-host">
      <div className="msd-screen">
        <MobileSignupDemoCore state={state} />
      </div>
    </div>
  );
};

export default MobileSignupDemo;
