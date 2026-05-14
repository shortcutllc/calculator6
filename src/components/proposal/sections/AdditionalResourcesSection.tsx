import React from 'react';
import { CardHeading, Eyebrow, T } from '../shared/primitives';
import { IconSwatch } from './SectionPrimitives';
import { SERVICE_CONTENT } from './serviceContent';

// AdditionalResourcesSection — 2-card grid that V1 shows for every
// mindfulness proposal. Audio recording + handouts. Uses the same copy stored
// in SERVICE_CONTENT.mindfulness.whatsIncluded (Phase-5 dual-purposes that
// field for the "additional resources" rail).

const AdditionalResourcesSection: React.FC = () => {
  const items = SERVICE_CONTENT.mindfulness.whatsIncluded;
  return (
    <div>
      <Eyebrow style={{ marginBottom: 6 }}>What participants take with them</Eyebrow>
      <CardHeading size="section" style={{ marginBottom: 18 }}>
        Additional resources
      </CardHeading>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 14,
        }}
      >
        {items.map((it, i) => (
          <div
            key={i}
            style={{
              padding: '20px 22px',
              background: '#fff',
              border: '1px solid rgba(0,152,173,.18)',
              borderRadius: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <IconSwatch
              name={(it.iconName === 'custom' ? 'FileText' : it.iconName) as any}
              bg="rgba(158,250,255,.30)"
            />
            <div
              style={{
                fontFamily: T.fontD,
                fontWeight: 700,
                fontSize: 16,
                color: T.navy,
                letterSpacing: '-0.01em',
              }}
            >
              {it.title}
            </div>
            <p
              style={{
                fontFamily: T.fontD,
                fontSize: 13,
                color: T.fgMuted,
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              {it.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdditionalResourcesSection;
