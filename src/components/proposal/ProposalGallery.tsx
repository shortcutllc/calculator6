// ProposalGallery — the Airbnb-style hero photo mosaic + lightbox that sits at
// the top of the client proposal viewer. Ported from the design refresh
// (Proposal V2 Refresh - Full.html, .pv-gallery / .pv-lightbox).
//
// Data-driven: pass real `proposal_gallery` photos for the proposal's services.
// When there aren't enough to fill the 5-tile mosaic, it tops up from a curated
// office-photo fallback so the hero always reads full. Renders nothing if there
// are no photos at all.

import React, { useState, useEffect, useCallback } from 'react';

export interface GalleryPhoto {
  src: string;
  cap?: string;
}

// Curated office stock shipped with the design refresh (public/proposal-refresh).
// Used only to top up a thin real-photo set so the mosaic never looks sparse.
const FALLBACK: GalleryPhoto[] = [
  { src: '/proposal-refresh/massage-office.png', cap: 'Chair massage' },
  { src: '/proposal-refresh/hair-office.png', cap: 'Hair styling' },
  { src: '/proposal-refresh/nails-office.png', cap: 'Manicures' },
  { src: '/proposal-refresh/barber-office.png', cap: "Men's grooming" },
  { src: '/proposal-refresh/makeup-office.jpg', cap: 'Makeup touch-ups' },
  { src: '/proposal-refresh/candid-massage.jpeg', cap: 'On-site massage' },
];

const NAVY = '#09364F';
const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

function Icon({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
const GRID_ICON = (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
  </svg>
);

interface ProposalGalleryProps {
  photos: GalleryPhoto[];
  /** Fill out to 5 tiles from curated stock when the real set is thin. Default true. */
  topUp?: boolean;
}

const ProposalGallery: React.FC<ProposalGalleryProps> = ({ photos, topUp = true }) => {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  // Merge real photos with curated fallback (deduped), enough to fill 5 tiles.
  const seen = new Set<string>();
  const merged: GalleryPhoto[] = [];
  for (const p of [...photos, ...(topUp ? FALLBACK : [])]) {
    if (!p.src || seen.has(p.src)) continue;
    seen.add(p.src);
    merged.push(p);
  }

  const tiles = merged.slice(0, 5);
  const total = merged.length;

  const close = useCallback(() => setOpen(false), []);
  const step = useCallback(
    (d: number) => setIdx((i) => (i + d + total) % total),
    [total]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close, step]);

  if (total === 0) return null;

  const openAt = (i: number) => { setIdx(i); setOpen(true); };

  const tileImg: React.CSSProperties = {
    width: '100%', height: '100%', objectFit: 'cover',
    transition: `transform 600ms ${EASE}`,
  };

  return (
    <>
      {/* Uses the design's .pv-gallery classes so the 980px responsive
          collapse (2-col, auto height, full-width hero tile) applies. */}
      <div className="pv-gallery" style={{ marginTop: 24 }}>
        {tiles.map((p, i) => (
          <button
            key={p.src}
            onClick={() => openAt(i)}
            className={'pv-gtile' + (i === 0 ? ' pv-gtile-main' : '')}
            style={{ border: 'none', padding: 0, font: 'inherit' }}
          >
            <img src={p.src} alt={p.cap || ''} />
            {i === 0 && p.cap && <span className="pv-gtag">{p.cap}</span>}
          </button>
        ))}

        <button className="pv-show-all" onClick={() => openAt(0)}>
          {GRID_ICON}
          Show all photos
        </button>
      </div>

      {/* Lightbox */}
      {open && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(3,34,50,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <button onClick={close} aria-label="Close" style={lbBtn(22, 26, 'tr')}>
            <Icon d="M18 6 6 18M6 6l12 12" size={22} />
          </button>
          <button onClick={() => step(-1)} aria-label="Previous" style={lbNav('left')}>
            <Icon d="m15 18-6-6 6-6" size={24} />
          </button>
          <img
            src={merged[idx].src} alt={merged[idx].cap || ''}
            style={{ maxWidth: '84vw', maxHeight: '80vh', borderRadius: 16,
              boxShadow: '0 30px 80px rgba(0,0,0,0.5)', objectFit: 'contain' }}
          />
          <button onClick={() => step(1)} aria-label="Next" style={lbNav('right')}>
            <Icon d="m9 18 6-6-6-6" size={24} />
          </button>
          <div style={{
            position: 'absolute', bottom: 26, left: '50%', transform: 'translateX(-50%)',
            fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13,
            color: 'rgba(255,255,255,0.85)', letterSpacing: '0.04em',
          }}>
            {idx + 1} / {total}{merged[idx].cap ? `  ·  ${merged[idx].cap}` : ''}
          </div>
        </div>
      )}
    </>
  );
};

function lbBtn(_s: number, _o: number, _pos: 'tr'): React.CSSProperties {
  return {
    position: 'absolute', top: 22, right: 26, width: 44, height: 44, borderRadius: 9999,
    border: 'none', background: 'rgba(255,255,255,0.14)', color: '#fff', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
}
function lbNav(side: 'left' | 'right'): React.CSSProperties {
  return {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    [side]: 26, width: 52, height: 52, borderRadius: 9999, border: 'none',
    background: 'rgba(255,255,255,0.92)', color: NAVY, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  } as React.CSSProperties;
}

export default ProposalGallery;
