import React, { useEffect, useRef, useState } from 'react';

/* ─────────────────────────────────────────────
   Scroll reveals and count-ups for the SterlingRisk partner page.

   A port of the handoff's sw-web.js behaviour (reveals, [data-count-to]).
   An element "arrives" once its TOP passes a line in the viewport (88% for
   reveals, 85% for count-ups). Top-above-the-line only, so a section jumped
   past by an in-page link still resolves rather than staying hidden.

   The CSS does the animating: `.sw-in-rise` / `.sw-in-fade` children sit
   paused until their `[data-sw-reveal]` ancestor gains `.sw-in`.
   ───────────────────────────────────────────── */

type Watcher = { el: HTMLElement; line: number; fire: () => void };
const watchers = new Set<Watcher>();
let bound = false;

/** Re-test every pending element. Safe to call any time (e.g. after a tab
 *  switch reveals something that was display:none). */
export function swCheck() {
  if (typeof window === 'undefined') return;
  const vh = window.innerHeight || 800;
  watchers.forEach((w) => {
    if (!w.el.isConnected) return;
    const r = w.el.getBoundingClientRect();
    if ((r.height || r.width) && r.top < vh * w.line) {
      watchers.delete(w);
      w.fire();
    }
  });
}

function bind() {
  if (bound) return;
  bound = true;
  window.addEventListener('scroll', swCheck, { passive: true });
  window.addEventListener('resize', swCheck);
  window.addEventListener('load', swCheck);
}

/** True once the element's top has passed `line` of the viewport height. */
export function useSwIn<T extends HTMLElement>(line = 0.88): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w: Watcher = { el, line, fire: () => setOn(true) };
    watchers.add(w);
    bind();
    swCheck();
    return () => { watchers.delete(w); };
  }, [line]);
  return [ref, on];
}

const reducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A number that counts up from 0 over 1.6s once it scrolls into view. The
 *  real figure is on screen until the count starts, so a count that never
 *  runs still reads correctly. */
export function CountTo({ to }: { to: number }) {
  const [ref, on] = useSwIn<HTMLSpanElement>(0.85);
  const [v, setV] = useState(to);
  useEffect(() => {
    if (!on || reducedMotion()) return;
    const t0 = Date.now();
    setV(0);
    const iv = window.setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / 1600);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p >= 1) window.clearInterval(iv);
    }, 16);
    return () => window.clearInterval(iv);
  }, [on, to]);
  return <span ref={ref}>{v}</span>;
}

/** A full-bleed page section that reveals its `.sw-in-*` children on arrival.
 *  `className` carries the section's own class (background, padding, z-index). */
export function Sec({ id, className, label, children }: {
  id?: string;
  className: string;
  label: string;
  children: React.ReactNode;
}) {
  const [ref, on] = useSwIn<HTMLDivElement>();
  return (
    <div
      ref={ref}
      id={id}
      data-sw-reveal=""
      data-screen-label={label}
      className={`sw-sec ${className}${on ? ' sw-in' : ''}`}
    >
      {children}
    </div>
  );
}

/** Any other `[data-sw-reveal]` element (e.g. the sticky "apart" cards, whose
 *  pins and ticks wait for their own card to arrive). */
export function Reveal<T extends keyof JSX.IntrinsicElements = 'div'>({ as, className, children }: {
  as?: T;
  className: string;
  children: React.ReactNode;
}) {
  const [ref, on] = useSwIn<HTMLElement>();
  const Tag = (as || 'div') as any;
  return (
    <Tag ref={ref} data-sw-reveal="" className={`${className}${on ? ' sw-in' : ''}`}>
      {children}
    </Tag>
  );
}
