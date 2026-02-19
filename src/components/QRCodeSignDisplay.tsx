import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQRCodeSign } from '../contexts/QRCodeSignContext';
import { QRCodeSign, ServiceType } from '../types/qrCodeSign';
import { generateQRCodeDataURL } from '../utils/qrCodeGenerator';
import { getServiceImagePath, getServiceDisplayName, getServiceIconPath, getMultiServiceDisplayName } from '../utils/qrCodeSignUtils';
import { LoadingSpinner } from './LoadingSpinner';
import { Button } from './Button';
import { ArrowRight } from 'lucide-react';

/**
 * Card color per service type — matches Figma design system.
 */
const CARD_COLORS: Record<ServiceType, { bg: string; text: string }> = {
  'massage': { bg: '#9EFAFF', text: '#09364f' },
  'hair-beauty': { bg: '#FF5050', text: '#FFFFFF' },
  'nails': { bg: '#FF5050', text: '#FFFFFF' },
  'headshot': { bg: '#003756', text: '#FFFFFF' },
  'mindfulness': { bg: '#9EFAFF', text: '#09364f' },
  'facial': { bg: '#FF5050', text: '#FFFFFF' },
};

/** Scale factor: Figma phone is 258px wide, we render at 140px on the sign */
const PHONE_SCALE = 140 / 258;

/**
 * A single service card inside the phone mockup.
 */
const ServiceCard: React.FC<{
  serviceType: ServiceType;
  colors: { bg: string; text: string };
}> = ({ serviceType, colors }) => (
  <div style={{ position: 'relative', width: 217, height: 224, borderRadius: 16, backgroundColor: colors.bg, overflow: 'hidden' }}>
    {/* "Book\n{Service}" title */}
    <div style={{
      position: 'absolute', left: 10, top: 11,
      fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 20,
      lineHeight: 0.85, letterSpacing: '-0.7px', color: colors.text,
      whiteSpace: 'nowrap',
    }}>
      <div>Book</div>
      <div>{getServiceDisplayName(serviceType)}</div>
    </div>
    {/* Service photo — rounded mask, oversized to crop baked-in border from PNGs */}
    <div style={{
      position: 'absolute', left: 10, top: 58, width: 197, height: 136,
      borderRadius: 12, overflow: 'hidden',
    }}>
      <img
        src={getServiceImagePath(serviceType)}
        alt={getServiceDisplayName(serviceType)}
        style={{ position: 'absolute', top: '-5%', left: '-5%', width: '110%', height: '110%', objectFit: 'cover', display: 'block' }}
      />
    </div>
    {/* Footer: "Choose a service" text — positioned from Figma absolute coords */}
    <span style={{
      position: 'absolute', left: 10, top: 201,
      fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 10,
      letterSpacing: '-0.2px', color: colors.text, lineHeight: 1.25,
    }}>
      Choose a service
    </span>
    {/* Arrow icon — positioned at right edge per Figma */}
    <img
      src="/QR Code Sign/Phone/arrow-right.svg"
      alt=""
      style={{
        position: 'absolute', left: 197, top: 204,
        width: 8, height: 8,
        filter: colors.text === '#FFFFFF' ? 'brightness(0) invert(1)' : 'brightness(0) saturate(100%) invert(14%) sepia(69%) saturate(1500%) hue-rotate(178deg) brightness(93%)',
      }}
    />
  </div>
);

/**
 * Phone mockup component — pixel-perfect from Figma node 50:620.
 * Built at 258px wide (Figma native) then scaled down to ~140px via transform.
 */
const PhoneMockup: React.FC<{
  serviceTypes: ServiceType[];
}> = ({ serviceTypes }) => {
  const primary = serviceTypes[0];
  const secondary = serviceTypes.length > 1 ? serviceTypes[1] : null;
  const primaryColor = CARD_COLORS[primary] || CARD_COLORS.massage;
  const secondaryColor = secondary ? (CARD_COLORS[secondary] || CARD_COLORS.nails) : null;

  // Phone height depends on number of cards: 1 card = ~400px, 2 cards = ~584px
  const phoneHeight = secondary ? 584 : 370;

  // Shadow extends ~20px left and ~17px below at rendered scale
  const shadowPadLeft = 20;
  const shadowPadBottom = 20;

  return (
    <div style={{
      width: 258 * PHONE_SCALE + shadowPadLeft,
      height: phoneHeight * PHONE_SCALE + shadowPadBottom,
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute',
        left: shadowPadLeft,
        top: 0,
        width: 258,
        height: phoneHeight,
        transform: `scale(${PHONE_SCALE})`,
        transformOrigin: 'top left',
        backgroundColor: 'white',
        borderRadius: 23.889,
        boxShadow: '-35.833px 31.056px 14.333px 0px rgba(0,0,0,0.14)',
        overflow: 'hidden',
      }}>
        {/* Dynamic Island area */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: 258, height: 45.389 }}>
          {/* Time "9:41" */}
          <span style={{
            position: 'absolute', left: 17.86, top: 16.04,
            width: 35.723, height: 13.231,
            fontFamily: '"SF Pro Text", system-ui, sans-serif', fontWeight: 600,
            fontSize: 11.246, lineHeight: '14.554px', textAlign: 'center',
            color: '#09364f', letterSpacing: '-0.27px',
          }}>
            9:41
          </span>
          {/* Right status icons (signal, wifi, battery) */}
          <img
            src="/QR Code Sign/Phone/status-icons-right.svg"
            alt=""
            style={{
              position: 'absolute',
              left: 'calc(83.33% - 0.2px)', top: 18.03,
              width: 51.204, height: 8.6,
              transform: 'translateX(-50%)',
            }}
          />
          {/* Dynamic Island pill */}
          <div style={{
            position: 'absolute', left: '50%', top: 10.75,
            transform: 'translateX(-50%)',
            width: 80.708, height: 23.815,
            backgroundColor: '#09364f', borderRadius: 21.169,
            overflow: 'hidden',
          }} />
          {/* Lens dot */}
          <div style={{
            position: 'absolute',
            left: 'calc(33.33% + 68.14px)', top: 18.69,
            width: 7.277, height: 7.277,
            borderRadius: '50%', backgroundColor: '#011723',
          }} />
        </div>

        {/* "Choose a service" heading */}
        <p style={{
          position: 'absolute', left: '50%', top: 70,
          transform: 'translateX(-50%)',
          fontFamily: 'Outfit, sans-serif', fontWeight: 800,
          fontSize: 16, lineHeight: 1.25, textAlign: 'center',
          color: '#09364f', letterSpacing: '-0.32px',
          margin: 0, whiteSpace: 'nowrap',
        }}>
          Choose a service
        </p>

        {/* Primary card */}
        <div style={{ position: 'absolute', left: 21, top: 114.19 }}>
          <ServiceCard serviceType={primary} colors={primaryColor} />
        </div>

        {/* Secondary card */}
        {secondary && secondaryColor && (
          <div style={{ position: 'absolute', left: 21, top: 348 }}>
            <ServiceCard serviceType={secondary} colors={secondaryColor} />
          </div>
        )}
      </div>
    </div>
  );
};

const QRCodeSignDisplay: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getQRCodeSign, loading } = useQRCodeSign();
  const [qrCodeSign, setQRCodeSign] = useState<QRCodeSign | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [qrCodeLoading, setQrCodeLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSign = async () => {
      if (!id) return;

      try {
        const sign = await getQRCodeSign(id);
        if (sign) {
          setQRCodeSign(sign);
        }
      } catch (error) {
        console.error('Error fetching QR code sign:', error);
      }
    };

    fetchSign();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Generate QR code when sign is loaded
  useEffect(() => {
    const generateQR = async () => {
      if (!qrCodeSign?.data.qrCodeUrl) {
        setQrCodeLoading(false);
        return;
      }

      try {
        setQrCodeLoading(true);
        const dataUrl = await generateQRCodeDataURL(qrCodeSign.data.qrCodeUrl, {
          size: 512,
          margin: 2,
          color: '#000000',
          backgroundColor: '#FFFFFF'
        });
        setQrCodeDataUrl(dataUrl);
      } catch (error) {
        console.error('Error generating QR code:', error);
      } finally {
        setQrCodeLoading(false);
      }
    };

    generateQR();
  }, [qrCodeSign]);

  if (loading || qrCodeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!qrCodeSign) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-white">
        <div className="text-center">
          <h2 className="text-4xl lg:text-6xl font-extrabold text-shortcut-navy-blue mb-4">QR Code Sign Not Found</h2>
          <p className="text-base lg:text-lg font-medium text-shortcut-navy-blue opacity-60">The sign you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  // Resolve service types — use serviceTypes array if available, fall back to single serviceType
  const allServiceTypes: ServiceType[] = qrCodeSign.data.serviceTypes?.length
    ? qrCodeSign.data.serviceTypes
    : [qrCodeSign.data.serviceType];
  const primaryServiceType = allServiceTypes[0];

  const serviceImagePath = getServiceImagePath(primaryServiceType);
  const serviceDisplayName = allServiceTypes.length > 1
    ? getMultiServiceDisplayName(allServiceTypes)
    : getServiceDisplayName(primaryServiceType);
  const primaryIconPath = getServiceIconPath(primaryServiceType);

  // Parse event details
  const parseEventDetails = (details: string): { date?: string, time?: string, location?: string, serviceType?: string } => {
    const lines = details.split('\n').map(l => l.trim()).filter(l => l);
    const result: { date?: string, time?: string, location?: string, serviceType?: string } = {};

    lines.forEach(line => {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes('service') || lowerLine.includes('type')) {
        result.serviceType = line.replace(/^[^:]+:\s*/, '');
      } else if (lowerLine.includes('date:') || lowerLine.includes('when:')) {
        result.date = line.replace(/^[^:]+:\s*/, '');
      } else if (lowerLine.includes('time:')) {
        result.time = line.replace(/^[^:]+:\s*/, '');
      } else if (lowerLine.includes('location:') || lowerLine.includes('where:')) {
        result.location = line.replace(/^[^:]+:\s*/, '');
      }
    });

    return result;
  };

  const eventInfo = parseEventDetails(qrCodeSign.data.eventDetails || '');

  return (
    <div className="min-h-screen bg-neutral-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header Controls - Hidden on Print */}
        <div className="flex justify-between items-start mb-8 print:hidden">
          <div>
            <h1 className="text-4xl lg:text-5xl font-extrabold text-shortcut-navy-blue mb-2">QR Code Sign Preview</h1>
            <p className="text-base lg:text-lg font-medium text-shortcut-navy-blue opacity-60">{serviceDisplayName} - {qrCodeSign.data.title}</p>
          </div>
          <Button onClick={() => window.print()} variant="primary">
            Print / Save as PDF
          </Button>
        </div>

        {/* Sign Content - Letter Size (8.5" x 11") */}
        <div
          ref={containerRef}
          className="mx-auto shadow-lg"
          style={{
            width: '8.5in',
            minHeight: '11in',
            padding: '0.65in',
            backgroundColor: '#F2F8FB'
          }}
        >
          {/* Header: Two Logos */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px', gap: '32px' }}>
            <div style={{ flex: '0 0 auto', maxWidth: '35%' }}>
              <img
                src="/shortcut-logo-blue.svg"
                alt="Shortcut Logo"
                style={{ display: 'block', height: '44px', width: 'auto', maxWidth: '100%', objectFit: 'contain', objectPosition: 'left center' }}
              />
            </div>
            {qrCodeSign.data.partnerLogoUrl && (
              <div style={{ flex: '0 0 auto', maxWidth: '35%' }}>
                <img
                  src={qrCodeSign.data.partnerLogoUrl}
                  alt={qrCodeSign.data.partnerName || 'Partner Logo'}
                  style={{ display: 'block', height: '44px', width: 'auto', maxWidth: '100%', objectFit: 'contain', objectPosition: 'right center', marginLeft: 'auto' }}
                />
              </div>
            )}
          </div>

          {/* Main Title - Centered */}
          <h1
            className="text-center font-extrabold"
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: '52px',
              fontWeight: 800,
              lineHeight: '1.3',
              letterSpacing: '-0.01em',
              color: '#175071',
              maxWidth: '90%',
              margin: '0 auto 48px auto'
            }}
          >
            {qrCodeSign.data.title}
          </h1>

          {/* Hero Image + Event Details — layered per Figma group 50:598 */}
          <div style={{ position: 'relative', marginBottom: '48px' }}>
            {/* Event Details Frame (node 50:600) — full-width rounded container */}
            <div style={{
              padding: '32px 40px 32px 260px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '28px',
              minHeight: '220px',
            }}>
              {/* Service Type */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '36px', height: '36px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {allServiceTypes.length > 1 ? (
                    <div style={{ display: 'flex', gap: 0 }}>
                      {allServiceTypes.slice(0, 2).map((st, i) => (
                        <img
                          key={st}
                          src={getServiceIconPath(st)}
                          alt={getServiceDisplayName(st)}
                          style={{ width: '28px', height: '28px', objectFit: 'contain', marginLeft: i > 0 ? '-6px' : 0 }}
                        />
                      ))}
                    </div>
                  ) : (
                    <img
                      src={primaryIconPath}
                      alt="Service Icon"
                      style={{ width: '36px', height: '36px', objectFit: 'contain' }}
                    />
                  )}
                </div>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '22px', color: '#003c5e', lineHeight: 1.2, letterSpacing: '-0.44px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <span style={{ fontWeight: 700 }}>Service Type: </span>
                  <span style={{ fontWeight: 400 }}>{eventInfo.serviceType || serviceDisplayName}</span>
                </p>
              </div>

              {/* Event Date */}
              {eventInfo.date && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '36px', height: '36px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img
                      src="/QR Code Sign/Icons/Calendar Icon.png"
                      alt="Calendar"
                      style={{ width: '36px', height: '36px', objectFit: 'contain' }}
                    />
                  </div>
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '22px', color: '#003c5e', lineHeight: 1.2, letterSpacing: '-0.44px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <span style={{ fontWeight: 700 }}>Event Date: </span>
                    <span style={{ fontWeight: 400 }}>{eventInfo.date}</span>
                  </p>
                </div>
              )}

              {/* Event Time */}
              {eventInfo.time && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '36px', height: '36px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img
                      src="/QR Code Sign/Icons/Time Icon.png"
                      alt="Clock"
                      style={{ width: '36px', height: '36px', objectFit: 'contain' }}
                    />
                  </div>
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '22px', color: '#003c5e', lineHeight: 1.2, letterSpacing: '-0.44px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <span style={{ fontWeight: 700 }}>Event Time: </span>
                    <span style={{ fontWeight: 400 }}>{eventInfo.time}</span>
                  </p>
                </div>
              )}

              {/* Location */}
              {eventInfo.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '36px', height: '36px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img
                      src="/QR Code Sign/Icons/Location icon.png"
                      alt="Location"
                      style={{ width: '36px', height: '36px', objectFit: 'contain' }}
                    />
                  </div>
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '22px', color: '#003c5e', lineHeight: 1.2, letterSpacing: '-0.44px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <span style={{ fontWeight: 700 }}>Location: </span>
                    <span style={{ fontWeight: 400 }}>{eventInfo.location}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Hero Image (nodes 50:580 + 50:581) — teal rect with photo, overlaps left side */}
            {/* Service images have a baked-in dark border/stroke in the PNG.
                We scale the image 10% larger than the container so overflow:hidden
                crops off that border, leaving only the clean interior. */}
            <div style={{
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              width: '203px',
              height: '209px',
              backgroundColor: '#9EFAFF',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 2px 2px rgba(0,0,0,0.25)',
            }}>
              <img
                src={serviceImagePath}
                alt={serviceDisplayName}
                style={{
                  position: 'absolute',
                  top: '-5%',
                  left: '-5%',
                  width: '110%',
                  height: '110%',
                  objectFit: 'cover',
                  objectPosition: 'center center',
                  display: 'block',
                }}
              />
            </div>
          </div>

          {/* Bottom Section: Phone Mockup + Scan to Book + QR Code */}
          <div
            style={{
              border: '3px dashed #9EFAFF',
              borderRadius: '32px',
              padding: '36px 40px',
              backgroundColor: 'white',
              boxShadow: '0 4px 4px rgba(0,0,0,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '24px',
              overflow: 'hidden',
            }}
          >
            {/* Left: Phone Mockup — matches Figma design */}
            <div style={{ flex: '0 0 auto' }}>
              <PhoneMockup
                serviceTypes={allServiceTypes}
              />
            </div>

            {/* Center: Scan to Book */}
            <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: '0' }}>
              <h2
                className="flex items-center whitespace-nowrap"
                style={{ fontFamily: 'Outfit, sans-serif', fontSize: '32px', fontWeight: 700, color: '#003c5e', letterSpacing: '-0.64px', lineHeight: 1.05, margin: 0 }}
              >
                Scan to book
              </h2>
              <ArrowRight
                size={28}
                style={{ color: '#FF5050', marginTop: '4px', flexShrink: 0 }}
                strokeWidth={2.5}
              />
            </div>

            {/* Right: QR Code */}
            <div style={{ flex: '0 0 auto' }}>
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="QR Code"
                  style={{ width: '180px', height: '180px', objectFit: 'contain', display: 'block' }}
                />
              ) : (
                <div
                  className="bg-gray-200 flex items-center justify-center rounded-lg"
                  style={{ width: '180px', height: '180px' }}
                >
                  <p className="text-sm font-medium text-gray-500">Loading...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info Section - Hidden on Print */}
        <div className="mt-8 text-base font-medium print:hidden max-w-[8.5in] mx-auto">
          <div className="card-small">
            <p className="text-shortcut-navy-blue mb-2"><span className="font-bold">Service{allServiceTypes.length > 1 ? 's' : ''}:</span> {serviceDisplayName}</p>
            <p className="text-shortcut-navy-blue mb-2"><span className="font-bold">Created:</span> {new Date(qrCodeSign.createdAt).toLocaleDateString()}</p>
            {qrCodeSign.data.qrCodeUrl && (
              <p className="text-shortcut-navy-blue">
                <span className="font-bold">QR Code Links To:</span>{' '}
                <a href={qrCodeSign.data.qrCodeUrl} target="_blank" rel="noopener noreferrer" className="text-shortcut-teal hover:opacity-80 transition-opacity underline">
                  {qrCodeSign.data.qrCodeUrl}
                </a>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: letter portrait;
            margin: 0;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          html, body {
            width: 8.5in;
            height: 11in;
            margin: 0;
            padding: 0;
            overflow: hidden;
          }

          body * {
            visibility: hidden;
          }

          div[style*="8.5in"],
          div[style*="8.5in"] * {
            visibility: visible;
          }

          div[style*="8.5in"] {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            margin: 0 !important;
            width: 8.5in !important;
            height: 11in !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
          }

          .print\\:hidden {
            display: none !important;
            visibility: hidden !important;
          }
        }
      `}</style>
    </div>
  );
};

export default QRCodeSignDisplay;
