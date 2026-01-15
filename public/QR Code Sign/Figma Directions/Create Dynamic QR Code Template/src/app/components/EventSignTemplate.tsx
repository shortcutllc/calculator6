import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { TemplateConfig } from '@/app/types/template-config';
import { Calendar, Clock, MapPin, Droplet } from 'lucide-react';

interface EventSignTemplateProps {
  config: TemplateConfig;
}

/**
 * Main Event Sign Template Component
 * 
 * This component takes a configuration object and renders a fully customized
 * event sign/poster with branding, event details, images, and QR code.
 */
export function EventSignTemplate({ config }: EventSignTemplateProps) {
  const { branding, event, heroImage, phonePreview, qrCode, colors, typography, layout } = config;

  return (
    <div
      style={{
        backgroundColor: layout.backgroundColor,
        maxWidth: layout.maxWidth,
        padding: layout.padding,
        margin: '0 auto',
        fontFamily: typography.fontFamily.primary,
      }}
      className="min-h-screen"
    >
      {/* Header with Logos */}
      <header className="flex justify-between items-center mb-12">
        <div className="flex-shrink-0">
          <img
            src={branding.leftLogo.src}
            alt={branding.leftLogo.alt}
            className="h-16 object-contain"
          />
        </div>
        <div className="flex-shrink-0">
          <img
            src={branding.rightLogo.src}
            alt={branding.rightLogo.alt}
            className="h-16 object-contain"
          />
        </div>
      </header>

      {/* Main Title */}
      <h1
        style={{
          color: colors.text.primary,
          fontSize: typography.sizes.headline,
          fontWeight: 'bold',
          lineHeight: 1.1,
          marginBottom: '3rem',
          textAlign: 'center',
        }}
      >
        {event.title}
        {event.subtitle && (
          <span style={{ display: 'block', marginTop: '1rem', opacity: 0.8 }}>
            {event.subtitle}
          </span>
        )}
      </h1>

      {/* Content Grid: Hero Image + Event Details */}
      <div className="grid md:grid-cols-2 gap-12 mb-16">
        {/* Hero Image Section */}
        <div className="flex items-center justify-center">
          <div
            style={{
              backgroundColor: heroImage.backgroundColor,
              borderRadius: heroImage.borderRadius,
              overflow: 'hidden',
              width: '100%',
              maxWidth: '500px',
            }}
            className="shadow-lg"
          >
            <img
              src={heroImage.src}
              alt={heroImage.alt}
              className="w-full h-auto object-cover"
              style={{ aspectRatio: '1/1' }}
            />
          </div>
        </div>

        {/* Event Details Section */}
        <div className="flex flex-col justify-center space-y-8">
          {/* Service Type */}
          <EventDetail
            icon={<Droplet size={32} color={event.serviceType.iconColor} />}
            label={event.serviceType.label}
            value={event.serviceType.value}
            colors={colors}
            typography={typography}
          />

          {/* Event Date */}
          <EventDetail
            icon={<Calendar size={32} color={event.date.iconColor} />}
            label={event.date.label}
            value={event.date.value}
            colors={colors}
            typography={typography}
          />

          {/* Event Time */}
          <EventDetail
            icon={<Clock size={32} color={event.time.iconColor} />}
            label={event.time.label}
            value={event.time.value}
            colors={colors}
            typography={typography}
          />

          {/* Location */}
          <EventDetail
            icon={<MapPin size={32} color={event.location.iconColor} />}
            label={event.location.label}
            value={event.location.value}
            colors={colors}
            typography={typography}
          />
        </div>
      </div>

      {/* Phone Preview + QR Code Section */}
      {phonePreview.enabled && (
        <div
          style={{
            border: `3px dashed ${colors.accent}`,
            borderRadius: '1rem',
            padding: '3rem',
            backgroundColor: colors.background.card,
          }}
          className="shadow-lg"
        >
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Phone Screenshot */}
            <div className="flex flex-col items-center space-y-4">
              <div
                style={{
                  backgroundColor: phonePreview.screenshots.primary.backgroundColor,
                  borderRadius: '2rem',
                  overflow: 'hidden',
                  maxWidth: '300px',
                  width: '100%',
                }}
                className="shadow-2xl"
              >
                <img
                  src={phonePreview.screenshots.primary.src}
                  alt="App Screenshot"
                  className="w-full h-auto"
                />
              </div>
            </div>

            {/* CTA + QR Code */}
            <div className="flex flex-col items-center space-y-6">
              <h2
                style={{
                  color: colors.text.primary,
                  fontSize: typography.sizes.title,
                  fontWeight: 'bold',
                }}
              >
                {phonePreview.ctaText}
              </h2>

              {/* QR Code */}
              <div
                style={{
                  padding: '1.5rem',
                  backgroundColor: 'white',
                  borderRadius: '1rem',
                }}
                className="shadow-lg"
              >
                <QRCodeSVG
                  value={qrCode.url}
                  size={qrCode.size / 2} // Adjust size for reasonable display
                  level="H"
                  includeMargin={false}
                />
              </div>

              {/* Arrow Indicator */}
              <div className="text-center">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={colors.secondary}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Event Detail Component
 * Renders a single event detail row with icon, label, and value
 */
interface EventDetailProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  colors: TemplateConfig['colors'];
  typography: TemplateConfig['typography'];
}

function EventDetail({ icon, label, value, colors, typography }: EventDetailProps) {
  return (
    <div className="flex items-start space-x-4">
      <div className="flex-shrink-0 mt-1">{icon}</div>
      <div className="flex-1">
        <p
          style={{
            color: colors.text.primary,
            fontSize: typography.sizes.body,
            fontWeight: 'bold',
            marginBottom: '0.25rem',
          }}
        >
          {label}{' '}
          <span style={{ fontWeight: 'normal' }}>{value}</span>
        </p>
      </div>
    </div>
  );
}
