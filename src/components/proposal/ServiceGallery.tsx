import React, { useState, useEffect } from 'react';
import { Camera, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { T } from './shared/primitives';

// ServiceGallery — per-service image gallery (Option A): the card keeps a
// stable cover with a "N photos" pill, and the full photo strip lives inside
// the "What a … day looks like" dropdown.
//
//   • PhotoCountPill — small overlay on the cover; opens the dropdown strip.
//   • GalleryStrip   — horizontal scroll-strip of photos in the dropdown.

// ---------------------------------------------------------------------------
// "N photos" pill for the cover (signals the dropdown strip)
// ---------------------------------------------------------------------------
export const PhotoCountPill: React.FC<{
  count: number;
  onClick?: () => void;
}> = ({ count, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      position: 'absolute',
      bottom: 8,
      right: 8,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '4px 9px',
      borderRadius: 9999,
      border: 'none',
      background: 'rgba(0,0,0,0.55)',
      color: '#fff',
      cursor: 'pointer',
      fontFamily: T.fontUi,
      fontWeight: 700,
      fontSize: 11,
      backdropFilter: 'blur(2px)',
    }}
  >
    <Camera size={13} />
    {count} photos
  </button>
);

// ---------------------------------------------------------------------------
// Option A — horizontal photo strip for the dropdown
// ---------------------------------------------------------------------------
export const GalleryStrip: React.FC<{
  images: string[];
  label?: string;
}> = ({ images, label = 'See it in action' }) => {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  if (images.length === 0) return null;
  return (
    <div>
      <div
        style={{
          fontFamily: T.fontUi,
          fontWeight: 700,
          fontSize: 11,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: T.fgMuted,
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: 'flex',
          gap: 10,
          overflowX: 'auto',
          paddingBottom: 6,
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {images.map((src, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setLightboxIdx(i)}
            title="Click to enlarge"
            style={{
              flex: '0 0 auto',
              width: 200,
              height: 130,
              borderRadius: 12,
              overflow: 'hidden',
              scrollSnapAlign: 'start',
              background: T.lightGray,
              border: 'none',
              padding: 0,
              cursor: 'zoom-in',
            }}
          >
            <img
              src={src}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </button>
        ))}
      </div>

      {lightboxIdx !== null && (
        <ImageLightbox
          images={images}
          index={lightboxIdx}
          onIndex={setLightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// ImageLightbox — fullscreen pop-out for a clicked strip photo. Backdrop /
// X / Esc close; arrows + ← → keys page through the set.
// ---------------------------------------------------------------------------
const ImageLightbox: React.FC<{
  images: string[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}> = ({ images, index, onIndex, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft')
        onIndex((index - 1 + images.length) % images.length);
      else if (e.key === 'ArrowRight') onIndex((index + 1) % images.length);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [index, images.length, onClose, onIndex]);

  const nav = (dir: number) =>
    onIndex((index + dir + images.length) % images.length);

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(9,54,79,0.9)',
        zIndex: 95,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        style={{
          position: 'absolute',
          top: 18,
          right: 18,
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: 'none',
          background: 'rgba(255,255,255,0.14)',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <X size={20} />
      </button>

      {images.length > 1 &&
        ([-1, 1] as const).map((dir) => (
          <button
            key={dir}
            type="button"
            aria-label={dir === -1 ? 'Previous' : 'Next'}
            onClick={(e) => {
              e.stopPropagation();
              nav(dir);
            }}
            style={{
              position: 'absolute',
              top: '50%',
              transform: 'translateY(-50%)',
              [dir === -1 ? 'left' : 'right']: 18,
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255,255,255,0.14)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {dir === -1 ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
          </button>
        ))}

      <img
        src={images[index]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '92vw',
          maxHeight: '88vh',
          objectFit: 'contain',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      />
    </div>
  );
};
