import React from 'react';
import { CardHeading, Eyebrow, T } from '../shared/primitives';
import { DotBullet } from './SectionPrimitives';
import {
  CLE_WHY_SHORTCUT,
  SERVICE_CONTENT,
  UNIFIED_WHY_SHORTCUT,
  WhyShortcutBullet,
} from './serviceContent';

// WhyShortcutSection — bullet-point value-prop card that sits high in the
// proposal viewer. Variant logic mirrors V1:
//   - Single service type → that service's bullets
//   - Multiple service types → UNIFIED_WHY_SHORTCUT
//   - Any CLE-mindfulness slug present → CLE_WHY_SHORTCUT
// Mindfulness sits between: when the only service is mindfulness, use the
// mindfulness service block; CLE wins outright when present.

interface WhyShortcutSectionProps {
  /** Unique service-type slugs (lowercased) present in this proposal */
  serviceTypes: string[];
  /** Optional override — surface a specific variant regardless of slugs */
  forcedVariant?: 'unified' | 'cle' | 'mindfulness';
}

const isCleSlug = (slug: string) =>
  slug === 'mindfulness-cle' || slug.startsWith('mindfulness-cle');

const resolveBullets = (
  types: string[],
  forced?: WhyShortcutSectionProps['forcedVariant']
): { bullets: WhyShortcutBullet[]; variantNote?: string } => {
  if (forced === 'cle' || types.some(isCleSlug)) {
    return {
      bullets: CLE_WHY_SHORTCUT,
      variantNote: 'CLE-accredited program',
    };
  }
  if (forced === 'unified' || types.length > 1) {
    return { bullets: UNIFIED_WHY_SHORTCUT };
  }
  if (forced === 'mindfulness') {
    return {
      bullets: SERVICE_CONTENT.mindfulness.whyShortcut,
    };
  }
  const sole = types[0];
  const content =
    (sole && SERVICE_CONTENT[sole]) ||
    SERVICE_CONTENT[sole?.replace(/^mindfulness-.*/, 'mindfulness') || ''] ||
    null;
  if (content) {
    return { bullets: content.whyShortcut };
  }
  return { bullets: UNIFIED_WHY_SHORTCUT };
};

const WhyShortcutSection: React.FC<WhyShortcutSectionProps> = ({
  serviceTypes,
  forcedVariant,
}) => {
  const { bullets, variantNote } = resolveBullets(serviceTypes, forcedVariant);
  if (bullets.length === 0) return null;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(158,250,255,.22), rgba(158,250,255,.06))',
        border: '1px solid rgba(0,152,173,.18)',
        borderRadius: 20,
        padding: '32px 36px',
      }}
    >
      <Eyebrow>Why Shortcut</Eyebrow>
      <CardHeading size="section" style={{ marginTop: 6, marginBottom: 4 }}>
        Built for in-office wellness that actually shows up
      </CardHeading>
      <p
        style={{
          fontFamily: T.fontD,
          fontSize: 15,
          color: T.fgMuted,
          lineHeight: 1.55,
          margin: '0 0 24px',
          maxWidth: 640,
        }}
      >
        With Shortcut, you can count on
        {variantNote ? ` — ${variantNote}:` : ':'}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {bullets.map((b, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 14,
            }}
          >
            <DotBullet />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: T.fontD,
                  fontWeight: 800,
                  fontSize: 16,
                  color: T.navy,
                  letterSpacing: '-0.01em',
                  marginBottom: 4,
                }}
              >
                {b.title}
              </div>
              <div
                style={{
                  fontFamily: T.fontD,
                  fontSize: 14,
                  color: T.fgMuted,
                  lineHeight: 1.55,
                  maxWidth: 580,
                }}
              >
                {b.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WhyShortcutSection;
