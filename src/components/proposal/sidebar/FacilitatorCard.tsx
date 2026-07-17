import React, { useState } from 'react';
import { Eyebrow, T } from '../shared/primitives';
import { FACILITATOR, type Facilitator } from '../sections/serviceContent';

// FacilitatorCard — facilitator bio for the right-rail sidebar. Defaults to
// Courtney Schulnick (mindfulness); pass `facilitator` to show another (e.g.
// Kirsten Smits for the movement & sound services). Rebuilt with the V2 design
// tokens. Includes graceful fallback if the photo asset 404s.

const FacilitatorCard: React.FC<{ facilitator?: Facilitator }> = ({
  facilitator = FACILITATOR,
}) => {
  const [src, setSrc] = useState<string>(facilitator.photoSrc);
  const [hidePhoto, setHidePhoto] = useState(false);

  const onErr = () => {
    // Try the fallback once, then hide the photo block entirely.
    if (src === facilitator.photoSrc && facilitator.photoFallbackSrc) {
      setSrc(facilitator.photoFallbackSrc);
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
            alt={`${facilitator.name} — ${facilitator.title}`}
            onError={onErr}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: facilitator.photoPosition || 'center',
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
          {facilitator.name}
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
          {facilitator.title}
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
          {facilitator.bio}
        </p>
      </div>
    </div>
  );
};

export default FacilitatorCard;
