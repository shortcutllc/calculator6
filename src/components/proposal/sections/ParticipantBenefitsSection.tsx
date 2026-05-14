import React from 'react';
import { CardHeading, Eyebrow, T } from '../shared/primitives';
import { IconSwatch } from './SectionPrimitives';
import { SERVICE_CONTENT } from './serviceContent';

// ParticipantBenefitsSection — 3-card outcomes grid that V1 renders for every
// mindfulness proposal (CLE or otherwise). Sourced from SERVICE_CONTENT.mindfulness.benefits
// so the copy is in one place.

const ParticipantBenefitsSection: React.FC = () => {
  const benefits = SERVICE_CONTENT.mindfulness.benefits;
  return (
    <div>
      <Eyebrow style={{ marginBottom: 6 }}>For your team</Eyebrow>
      <CardHeading size="section" style={{ marginBottom: 18 }}>
        Participant benefits
      </CardHeading>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
        }}
      >
        {benefits.map((b, i) => (
          <div
            key={i}
            style={{
              padding: '22px 22px 24px',
              background:
                'linear-gradient(135deg, rgba(158,250,255,.20), rgba(158,250,255,.06))',
              border: '1px solid rgba(0,152,173,.20)',
              borderRadius: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <IconSwatch name={b.iconName as any} />
            <div
              style={{
                fontFamily: T.fontD,
                fontWeight: 700,
                fontSize: 17,
                color: T.navy,
                letterSpacing: '-0.01em',
              }}
            >
              {b.title}
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
              {b.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParticipantBenefitsSection;
