import { useEffect, useState } from 'react';

// useIsMobile / useMediaQuery — tiny matchMedia wrapper used by the V2
// viewers to swap inline-style values between desktop + mobile/tablet
// breakpoints. Centralised here so every viewer + card uses the same
// query strings.
//
// Breakpoints follow Tailwind's defaults so it composes cleanly with the
// utility classes elsewhere in the app:
//   sm   → 640px   (compact phone)
//   md   → 768px   (large phone / portrait tablet)
//   lg   → 1024px  (landscape tablet / small laptop)

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
} as const;

export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(query);
    const update = (e: MediaQueryListEvent | MediaQueryList) =>
      setMatches(e.matches);
    // Initial sync in case the SSR default and client state diverged.
    update(mql);
    if (mql.addEventListener) mql.addEventListener('change', update);
    else mql.addListener(update as any); // Safari < 14
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', update);
      else mql.removeListener(update as any);
    };
  }, [query]);
  return matches;
};

/** True when the viewport is narrower than the `lg` breakpoint — i.e. the
 *  point at which the 2-col body grid stops fitting comfortably. The V2
 *  viewers use this to flip to a single-column layout (sidebar drops below
 *  the main column) and to shrink the hero. */
export const useIsMobile = (): boolean =>
  useMediaQuery(`(max-width: ${BREAKPOINTS.lg - 1}px)`);

/** True only on actual phones (sm and below) — used for tighter type sizes
 *  + padding on the smallest screens. */
export const useIsCompact = (): boolean =>
  useMediaQuery(`(max-width: ${BREAKPOINTS.md - 1}px)`);
