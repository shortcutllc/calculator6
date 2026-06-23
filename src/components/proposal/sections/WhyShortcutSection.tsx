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

  // Design refresh: lt-card + pv-why-block with teal-dot bullets.
  return (
    <div className="lt-card pv-why-block">
      <p className="lt-eyebrow">Why Shortcut</p>
      <h2 className="lt-h2">Wellness that works.</h2>
      <p className="lt-body pv-why-lead">
        With Shortcut, you can count on{variantNote ? ` (${variantNote})` : ''}:
      </p>
      <div className="pv-why">
        {bullets.map((b, i) => (
          <div className="pv-bullet" key={i}>
            <span className="bd-ic" />
            <div>
              <h4>{b.title}</h4>
              <p>{b.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WhyShortcutSection;
