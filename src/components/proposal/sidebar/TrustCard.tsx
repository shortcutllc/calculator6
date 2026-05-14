import React from 'react';
import { Eyebrow, T } from '../shared/primitives';

// Trust card — big rebooking stat + client-logo grid. Logos are placeholders
// until you (Will) wire real client logos either via a static asset bundle
// or a `trusted_by` config table. Static for v1.

const PLACEHOLDER_LOGOS: { name: string; initials: string; bg: string }[] = [
  { name: 'DraftKings', initials: 'DK', bg: '#1F2937' },
  { name: 'Applecart', initials: 'AC', bg: '#0F766E' },
  { name: 'Burberry', initials: 'BB', bg: '#1F2937' },
  { name: 'Workhuman', initials: 'WH', bg: '#7C3AED' },
  { name: 'Pyninvestments', initials: 'PY', bg: '#0EA5E9' },
  { name: 'Meta', initials: 'M', bg: '#1877F2' },
];

const TrustCard: React.FC = () => {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        padding: '22px 24px',
        border: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      <Eyebrow style={{ marginBottom: 12 }}>Trusted by 500+ companies</Eyebrow>

      <div
        style={{
          background: 'rgba(158,250,255,.2)',
          borderRadius: 12,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          marginBottom: 16,
        }}
      >
        <span
          style={{
            fontFamily: T.fontD,
            fontWeight: 800,
            fontSize: 44,
            color: T.navy,
            letterSpacing: '-0.025em',
            lineHeight: 1,
          }}
        >
          87%
        </span>
        <span
          style={{
            fontFamily: T.fontD,
            fontWeight: 600,
            fontSize: 14,
            color: T.navy,
          }}
        >
          rebook within 6 months
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 8,
        }}
      >
        {PLACEHOLDER_LOGOS.map((logo) => (
          <div
            key={logo.name}
            title={logo.name}
            style={{
              aspectRatio: '16 / 9',
              borderRadius: 8,
              background: logo.bg,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: T.fontD,
              fontWeight: 800,
              fontSize: 14,
              letterSpacing: '0.04em',
            }}
          >
            {logo.initials}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrustCard;
