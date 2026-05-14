import React, { useState } from 'react';
import { Eyebrow, T } from '../shared/primitives';
import { FACILITATOR } from '../sections/serviceContent';

// FacilitatorCard — Courtney Schulnick bio for the right-rail sidebar on
// mindfulness proposals. Mirrors V1 StandaloneProposalViewer (lines ~2340+)
// but rebuilt with the V2 design tokens. Includes graceful fallback if the
// webp asset 404s.

const FacilitatorCard: React.FC = () => {
  const [src, setSrc] = useState<string>(FACILITATOR.photoSrc);
  const [hidePhoto, setHidePhoto] = useState(false);

  const onErr = () => {
    // Try the PNG fallback once, then hide the photo block entirely.
    if (src === FACILITATOR.photoSrc && FACILITATOR.photoFallbackSrc) {
      setSrc(FACILITATOR.photoFallbackSrc);
    } else {
      setHidePhoto(true);
    }
  };

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
      }}
    >
      {!hidePhoto && (
        <div
          style={{
            width: '100%',
            aspectRatio: '1 / 1',
            background:
              'linear-gradient(135deg, rgba(158,250,255,.30), rgba(159,91,178,.18))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <img
            src={src}
            alt={`${FACILITATOR.name} — ${FACILITATOR.title}`}
            onError={onErr}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </div>
      )}
      <div
        style={{
          padding: '20px 22px',
        }}
      >
        <Eyebrow style={{ marginBottom: 4 }}>Your facilitator</Eyebrow>
        <div
          style={{
            fontFamily: T.fontD,
            fontWeight: 800,
            fontSize: 20,
            color: T.navy,
            letterSpacing: '-0.01em',
            lineHeight: 1.1,
          }}
        >
          {FACILITATOR.name}
        </div>
        <div
          style={{
            fontFamily: T.fontUi,
            fontWeight: 700,
            fontSize: 11,
            color: T.fgMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginTop: 6,
          }}
        >
          {FACILITATOR.title}
        </div>
        <p
          style={{
            fontFamily: T.fontD,
            fontSize: 13,
            color: T.fgMuted,
            lineHeight: 1.6,
            marginTop: 14,
            marginBottom: 0,
          }}
        >
          {FACILITATOR.bio}
        </p>
      </div>
    </div>
  );
};

export default FacilitatorCard;
