import React from 'react';
import { CheckCircle } from 'lucide-react';
import { CardHeading, Eyebrow, T } from '../shared/primitives';
import { IconSwatch } from './SectionPrimitives';
import { SERVICE_CONTENT, ServiceSectionContent } from './serviceContent';

// ServiceDetailsSection — renders the V1 "Benefits" + "What's Included" + 4-
// item feature checklist for each unique service type in the proposal. For
// multi-service proposals we render one section per type; the heading uses
// the service label so they're easy to scan.

interface ServiceDetailsSectionProps {
  /** Unique service-type slugs to render details for */
  serviceTypes: string[];
}

const ServiceDetailsSection: React.FC<ServiceDetailsSectionProps> = ({
  serviceTypes,
}) => {
  // Map slugs → content + filter out anything we don't have copy for so we
  // never render a half-empty card.
  const blocks: Array<{ slug: string; content: ServiceSectionContent }> = [];
  serviceTypes.forEach((slug) => {
    const fallback =
      slug.startsWith('mindfulness-') && SERVICE_CONTENT.mindfulness
        ? SERVICE_CONTENT.mindfulness
        : null;
    const content = SERVICE_CONTENT[slug] || fallback;
    if (content) blocks.push({ slug, content });
  });
  if (blocks.length === 0) return null;

  return (
    <div>
      <Eyebrow style={{ marginBottom: 6 }}>Your services</Eyebrow>
      <CardHeading size="section" style={{ marginBottom: 24 }}>
        {blocks.length === 1
          ? `What ${blocks[0].content.label.toLowerCase()} day looks like`
          : 'What each service day looks like'}
      </CardHeading>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {blocks.map(({ slug, content }) => (
          <ServiceBlock key={slug} content={content} />
        ))}
      </div>
    </div>
  );
};

const ServiceBlock: React.FC<{ content: ServiceSectionContent }> = ({
  content,
}) => (
  <div
    style={{
      background: '#fff',
      border: '1px solid rgba(0,0,0,0.06)',
      borderRadius: 20,
      padding: '28px 30px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
    }}
  >
    <CardHeading size="card" style={{ marginBottom: 18 }}>
      {content.label}
    </CardHeading>

    {/* Benefits — 3-column card grid */}
    <Eyebrow style={{ marginBottom: 10 }}>{content.benefitsHeading}</Eyebrow>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 14,
        marginBottom: 24,
      }}
    >
      {content.benefits.map((b, i) => (
        <div
          key={i}
          style={{
            padding: '18px 18px 20px',
            background: T.beige,
            borderRadius: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <IconSwatch name={b.iconName as any} />
          <div
            style={{
              fontFamily: T.fontD,
              fontWeight: 700,
              fontSize: 16,
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

    {/* What's included — 2-column dense list */}
    <Eyebrow style={{ marginBottom: 10 }}>{content.whatsIncludedHeading}</Eyebrow>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 10,
        marginBottom: 20,
      }}
    >
      {content.whatsIncluded.map((it, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 14px',
            background: T.lightGray,
            borderRadius: 12,
          }}
        >
          {it.iconName === 'custom' && it.iconSrc ? (
            <img
              src={it.iconSrc}
              alt=""
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
              style={{
                width: 36,
                height: 36,
                flexShrink: 0,
                objectFit: 'contain',
              }}
            />
          ) : (
            <IconSwatch
              name={(it.iconName === 'custom' ? 'Sparkles' : it.iconName) as any}
              size={18}
              bg="#fff"
            />
          )}
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: T.fontD,
                fontWeight: 700,
                fontSize: 14,
                color: T.navy,
                letterSpacing: '-0.005em',
              }}
            >
              {it.title}
            </div>
            <div
              style={{
                fontFamily: T.fontD,
                fontSize: 12,
                color: T.fgMuted,
                lineHeight: 1.45,
              }}
            >
              {it.description}
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* Features checklist — 2-column compact rail */}
    <div
      style={{
        padding: '16px 18px',
        background: 'rgba(158,250,255,.18)',
        borderLeft: `4px solid ${T.aqua}`,
        borderRadius: 12,
      }}
    >
      <div
        style={{
          fontFamily: T.fontD,
          fontWeight: 800,
          fontSize: 14,
          color: T.navy,
          marginBottom: 10,
        }}
      >
        {content.featuresHeading}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 8,
        }}
      >
        {content.features.map((f, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: T.fontD,
              fontSize: 13,
              color: T.navy,
            }}
          >
            <CheckCircle size={16} color={T.success} strokeWidth={2.5} />
            <span>{f}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default ServiceDetailsSection;
