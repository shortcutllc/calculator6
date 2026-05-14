import React from 'react';
import { Play, ImageIcon, ArrowUpRight } from 'lucide-react';
import { Eyebrow, T } from '../shared/primitives';

// GalleryCard — Phase 2C placeholder.
//
// Real implementation lands in Phase 6 along with the proposal_gallery table
// + storage bucket. The component currently renders 4:3 placeholder tiles +
// a 2x2 thumbnail grid, filtered by the service types in the current proposal.
// When real media is wired, the placeholders become <img>/<video> elements.

interface GalleryCardProps {
  /** Service types present in this proposal — used to drive caption + later */
  /** to filter the real media set to only relevant clips/photos. */
  serviceTypes: string[];
}

const GalleryCard: React.FC<GalleryCardProps> = ({ serviceTypes }) => {
  // Pick the "feature" service for the headline (massage if present, else
  // first available — mostly cosmetic for v1).
  const feature = serviceTypes.includes('massage')
    ? 'massage'
    : serviceTypes[0] || 'massage';

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        padding: '22px 24px',
        border: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      <Eyebrow style={{ marginBottom: 12 }}>From recent events</Eyebrow>

      {/* Featured 4:3 tile */}
      <div
        style={{
          aspectRatio: '4 / 3',
          borderRadius: 12,
          background: 'linear-gradient(135deg, #F8D7C7, #E07A5F)',
          marginBottom: 8,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.92)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
            }}
          >
            <Play size={20} color={T.navy} strokeWidth={2.5} fill={T.navy} />
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            background: 'rgba(0,0,0,0.65)',
            color: '#fff',
            padding: '2px 8px',
            borderRadius: 6,
            fontFamily: T.fontUi,
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: '0.04em',
          }}
        >
          0:42
        </div>
      </div>

      {/* 2x2 thumbnails */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 6,
          marginBottom: 12,
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              aspectRatio: '4 / 3',
              borderRadius: 8,
              background:
                i % 2 === 0
                  ? 'linear-gradient(135deg, #FBC2EB, #A18CD1)'
                  : 'linear-gradient(135deg, #C9E8FF, #5A91C2)',
            }}
          />
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 8,
          borderTop: '1px dashed rgba(0,0,0,0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: T.fontD,
            fontSize: 12,
            color: T.fgMuted,
          }}
        >
          <ImageIcon size={13} color={T.fgMuted} />
          <span>Photos & videos coming soon</span>
        </div>
        <button
          type="button"
          disabled
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: 'transparent',
            border: 'none',
            padding: 0,
            fontFamily: T.fontUi,
            fontWeight: 700,
            fontSize: 12,
            color: T.fgMuted,
            cursor: 'not-allowed',
            opacity: 0.6,
          }}
        >
          View all
          <ArrowUpRight size={12} />
        </button>
      </div>
      <div
        style={{
          fontFamily: T.fontD,
          fontSize: 11,
          color: T.fgMuted,
          marginTop: 8,
          fontStyle: 'italic',
        }}
      >
        Real {feature} media wires up in Phase 6 (gallery table).
      </div>
    </div>
  );
};

export default GalleryCard;
