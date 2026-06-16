// MobileSignupModule — the proposals-page right-column module that plays the
// employee sign-up demo inside an iPhone frame, with a dynamic camera that
// zooms into wherever the action is. Square card titled "The employee sign-up".
//
// Ported from the design handoff (signup_demo/module-v2.jsx + ios-frame.jsx).
// The camera math (mv2Camera + the layout effect) is verbatim from module-v2.
// Styling (bm- card, frame) lives in mobile-signup-demo.css.

import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';
import { ExternalLink, Link as LinkIcon, Check } from 'lucide-react';
import {
  MobileSignupDemoCore,
  useMdTimeline,
  usePrefersReducedMotion,
  type MdState,
} from './MobileSignupDemo';
import './mobile-signup-demo.css';

// Accept a pasted test-event URL the same way SignupLinkCard did: an http(s)
// URL, or a bare domain we can safely prefix.
const isProbablyValidUrl = (raw?: string | null): boolean => {
  if (!raw) return false;
  const trimmed = raw.trim();
  if (!trimmed) return false;
  try {
    const u = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return !!u.host;
  } catch {
    return false;
  }
};
const normaliseUrl = (raw: string): string =>
  /^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`;

// ── iPhone frame ────────────────────────────────────────────
// Outer dims match the design (402 x 874). The screen clips its children;
// the demo's own md-viewport fills it. The whole frame (bezel included) is
// what the camera scales, so the camera focal coordinates stay in this space.
function IOSDevice({
  width = 402,
  height = 874,
  children,
}: {
  width?: number;
  height?: number;
  children: React.ReactNode;
}) {
  const bezel = 12;
  const radius = 56;
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: '#0c0d12',
        padding: bezel,
        position: 'relative',
        boxShadow:
          '0 1px 0 1px rgba(255,255,255,0.06) inset, 0 20px 50px rgba(9,54,79,0.28)',
        flexShrink: 0,
      }}
    >
      {/* dynamic island */}
      <div
        style={{
          position: 'absolute',
          top: bezel + 9,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 108,
          height: 30,
          borderRadius: 9999,
          background: '#0c0d12',
          zIndex: 50,
        }}
      />
      {/* screen */}
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: radius - bezel,
          overflow: 'hidden',
          background: '#fff',
          position: 'relative',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Camera presets: where to look for a given demo state.
// fy = focal y in device coords (0 = top of phone), s = zoom scale.
function mv2Camera(
  state: MdState
): { fit: true } | { fit?: false; s: number; fy: number } {
  if (state.screen === 'confirmed') return { fit: true };
  if (state.dot && state.dot.target === 'cta') return { s: 0.62, fy: 770 };
  if (state.scroll === 'services') return { s: 0.58, fy: 350 };
  if (state.scroll === 'times') return { s: 0.58, fy: 360 };
  if (state.scroll === 'details') return { s: 0.6, fy: 330 };
  return { fit: true }; // hero / top
}

interface MobileSignupModuleProps {
  speed?: number;
  zoom?: boolean;
  size?: number;
  /** Admin-pasted test-event URL. When set, the Copy link + Try it yourself
   *  CTAs render below the demo. When absent, only the demo shows. */
  url?: string | null;
  /** CTA copy. Defaults match the brand voice (mirrors the old SignupLinkCard). */
  title?: string;
  description?: string;
}

const MobileSignupModule: React.FC<MobileSignupModuleProps> = ({
  speed = 1,
  zoom = true,
  size = 340,
  url,
  title = "Pick a time. That's the whole thing.",
  description = 'No app to download. No account to make. Book a sample appointment and see how little your team has to do. You do even less.',
}) => {
  const reduced = usePrefersReducedMotion();
  const state = useMdTimeline(speed, reduced);
  // The phone stage keeps the design's ~square proportion; the CTA footer (if
  // any) grows the card below it.
  const areaH = Math.round(size * 0.87);
  const showCta = isProbablyValidUrl(url);
  const [copied, setCopied] = useState(false);
  const copyLink = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(normaliseUrl(url));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — no-op, the Try it yourself link still works */
    }
  };
  const areaRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState<{ W: number; H: number; dw: number; dh: number } | null>(null);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const a = areaRef.current, p = phoneRef.current;
    if (a && p) {
      setDims({
        W: a.clientWidth, H: a.clientHeight,
        dw: p.offsetWidth, dh: p.offsetHeight,
      });
    }
  }, []);

  // Enable transitions only AFTER the first fitted frame has painted,
  // otherwise the browser latches the pre-paint opacity:0/identity state
  // and the declared transition never advances (module stays invisible).
  useEffect(() => {
    if (!dims || ready) return;
    let raf2: number;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setReady(true));
    });
    return () => { cancelAnimationFrame(raf1); if (raf2) cancelAnimationFrame(raf2); };
  }, [dims, ready]);

  // Honor reduced motion: hold a static fitted frame, no camera moves.
  const useZoom = zoom && !reduced;

  let style: React.CSSProperties = { opacity: 0 };
  if (dims) {
    const { W, H, dw, dh } = dims;
    const fitS = Math.min(W / dw, H / dh) * 0.94;
    const cam = useZoom ? mv2Camera(state) : ({ fit: true } as const);
    const s = cam.fit ? fitS : cam.s;
    const fy = cam.fit ? dh / 2 : cam.fy;
    const tx = (W - dw * s) / 2;
    let ty = H / 2 - fy * s;
    ty = Math.min(0 + (cam.fit ? (H - dh * s) / 2 : 0), ty);
    ty = Math.max(H - dh * s - (cam.fit ? (H - dh * s) / 2 : 0), ty);
    if (cam.fit) ty = (H - dh * s) / 2;
    style = {
      opacity: 1,
      transform: 'translate(' + tx + 'px, ' + ty + 'px) scale(' + s + ')',
      transformOrigin: 'top left',
      transition:
        ready && !reduced
          ? 'transform 1100ms cubic-bezier(0.22, 1, 0.36, 1)'
          : 'none',
    };
  }

  return (
    <div className="bm-card msd-host" style={{ width: size }}>
      <div className="bm-card-head">
        <div className="bm-eyebrow">The employee sign-up</div>
        <div className="bm-live-pill">Demo</div>
      </div>
      <div ref={areaRef} className="bm-area" style={{ height: areaH }}>
        <div ref={phoneRef} style={{ position: 'absolute', top: 0, left: 0, ...style }}>
          <IOSDevice width={402} height={874}>
            <MobileSignupDemoCore state={state} />
          </IOSDevice>
        </div>
      </div>
      {showCta && (
        <div className="bm-foot">
          {title && <div className="bm-foot-title">{title}</div>}
          {description && <p className="bm-foot-copy">{description}</p>}
          <div className="bm-foot-actions">
            <button type="button" className="bm-btn bm-btn-secondary" onClick={copyLink}>
              {copied ? <><Check size={14} /> Copied</> : <><LinkIcon size={14} /> Copy link</>}
            </button>
            <a
              className="bm-btn bm-btn-coral"
              href={normaliseUrl(url as string)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Try it yourself <ExternalLink size={14} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileSignupModule;
