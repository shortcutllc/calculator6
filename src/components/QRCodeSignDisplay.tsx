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
 * Primary service gets teal, secondary gets coral, etc.
 */
const CARD_COLORS: Record<ServiceType, { bg: string; text: string }> = {
  'massage': { bg: '#9EFAFF', text: '#003756' },
  'hair-beauty': { bg: '#FF5050', text: '#FFFFFF' },
  'nails': { bg: '#FF5050', text: '#FFFFFF' },
  'headshot': { bg: '#003756', text: '#FFFFFF' },
  'mindfulness': { bg: '#9EFAFF', text: '#003756' },
  'facial': { bg: '#FF5050', text: '#FFFFFF' },
};

/**
 * Phone mockup component — recreated from Figma design.
 * Shows a realistic iPhone frame with service booking cards.
 */
const PhoneMockup: React.FC<{
  serviceTypes: ServiceType[];
  serviceImagePath: string;
}> = ({ serviceTypes, serviceImagePath }) => {
  const primary = serviceTypes[0];
  const secondary = serviceTypes[1];
  const primaryColor = CARD_COLORS[primary] || CARD_COLORS.massage;
  const secondaryColor = secondary ? (CARD_COLORS[secondary] || CARD_COLORS.nails) : null;

  return (
    <div
      style={{
        width: '140px',
        height: '280px',
        backgroundColor: '#E8E8E8',
        borderRadius: '28px',
        padding: '4px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      {/* Phone screen */}
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#FFF',
          borderRadius: '24px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Status bar — pink/blush like Figma */}
        <div
          style={{
            height: '28px',
            backgroundColor: '#F8E0E0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 10px',
            position: 'relative',
          }}
        >
          <span style={{ fontSize: '8px', fontWeight: 600, color: '#1A1A1A', fontFamily: 'system-ui' }}>9:41</span>
          {/* Dynamic Island */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '6px',
              transform: 'translateX(-50%)',
              width: '44px',
              height: '14px',
              backgroundColor: '#1A1A1A',
              borderRadius: '10px',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            {/* Signal bars */}
            <svg width="12" height="8" viewBox="0 0 12 8">
              <rect x="0" y="5" width="2" height="3" fill="#1A1A1A" />
              <rect x="3" y="3" width="2" height="5" fill="#1A1A1A" />
              <rect x="6" y="1" width="2" height="7" fill="#1A1A1A" />
              <rect x="9" y="0" width="2" height="8" fill="#1A1A1A" />
            </svg>
            {/* WiFi */}
            <svg width="10" height="8" viewBox="0 0 10 8">
              <path d="M5 7.5a0.8 0.8 0 1 0 0-1.6 0.8 0.8 0 0 0 0 1.6z" fill="#1A1A1A" />
              <path d="M2.5 5c1.4-1.4 3.6-1.4 5 0" stroke="#1A1A1A" strokeWidth="1" fill="none" />
              <path d="M0.8 3c2.3-2.3 6.1-2.3 8.4 0" stroke="#1A1A1A" strokeWidth="1" fill="none" />
            </svg>
            {/* Battery */}
            <div style={{ width: '16px', height: '7px', border: '1px solid #1A1A1A', borderRadius: '2px', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: '1px', backgroundColor: '#1A1A1A', borderRadius: '1px' }} />
              <div style={{ position: 'absolute', right: '-3px', top: '1.5px', width: '2px', height: '4px', backgroundColor: '#1A1A1A', borderRadius: '0 1px 1px 0' }} />
            </div>
          </div>
        </div>

        {/* Content area */}
        <div style={{ padding: '8px 8px 0', backgroundColor: '#FFF' }}>
          {/* "Choose a service" heading */}
          <p style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: '10px',
            fontWeight: 800,
            color: '#003756',
            textAlign: 'center',
            margin: '4px 0 8px',
            letterSpacing: '-0.02em',
          }}>
            Choose a service
          </p>

          {/* Primary service card */}
          <div
            style={{
              backgroundColor: primaryColor.bg,
              borderRadius: '10px',
              padding: '8px',
              marginBottom: secondary ? '6px' : '0',
            }}
          >
            <p style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: '10px',
              fontWeight: 800,
              color: primaryColor.text,
              lineHeight: '1.1',
              marginBottom: '4px',
            }}>
              Book<br />{getServiceDisplayName(primary)}
            </p>
            <div style={{ borderRadius: '6px', overflow: 'hidden', marginBottom: '4px' }}>
              <img
                src={serviceImagePath}
                alt={getServiceDisplayName(primary)}
                style={{ width: '100%', height: '48px', objectFit: 'cover', display: 'block' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '6px', fontFamily: 'Outfit, sans-serif', color: primaryColor.text, opacity: 0.8 }}>Choose a service</span>
              <ArrowRight size={7} style={{ color: primaryColor.text }} />
            </div>
          </div>

          {/* Secondary service card (if multi-service) */}
          {secondary && secondaryColor && (
            <div
              style={{
                backgroundColor: secondaryColor.bg,
                borderRadius: '10px',
                padding: '8px',
              }}
            >
              <p style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: '10px',
                fontWeight: 800,
                color: secondaryColor.text,
                lineHeight: '1.1',
                marginBottom: '4px',
              }}>
                Book<br />{getServiceDisplayName(secondary)}
              </p>
              <div style={{ borderRadius: '6px', overflow: 'hidden', marginBottom: '4px' }}>
                <img
                  src={getServiceImagePath(secondary)}
                  alt={getServiceDisplayName(secondary)}
                  style={{ width: '100%', height: '48px', objectFit: 'cover', display: 'block' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '6px', fontFamily: 'Outfit, sans-serif', color: secondaryColor.text, opacity: 0.8 }}>Choose a service</span>
                <ArrowRight size={7} style={{ color: secondaryColor.text }} />
              </div>
            </div>
          )}
        </div>
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
              lineHeight: '1.1',
              letterSpacing: '-0.02em',
              color: '#003756',
              maxWidth: '90%',
              margin: '0 auto 56px auto'
            }}
          >
            {qrCodeSign.data.title}
          </h1>

          {/* Two Column Section */}
          <div className="grid grid-cols-2" style={{ gap: '56px', marginBottom: '56px' }}>
            {/* Left Column: Hero Image */}
            <div className="flex items-center justify-center">
              <img
                src={serviceImagePath}
                alt={serviceDisplayName}
                style={{
                  display: 'block',
                  width: '100%',
                  maxWidth: '360px',
                  height: 'auto',
                  borderRadius: '24px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.06)',
                  border: 'none',
                  outline: 'none'
                }}
              />
            </div>

            {/* Right Column: Event Details with Icons */}
            <div className="flex flex-col justify-center" style={{ gap: '32px', display: 'flex' }}>
              {/* Service Type(s) */}
              <div className="flex items-center" style={{ gap: '16px' }}>
                <div className="flex-shrink-0 flex items-center" style={{ gap: '4px' }}>
                  {allServiceTypes.length > 1 ? (
                    // Show multiple service icons stacked/overlapping
                    allServiceTypes.map((st, i) => (
                      <img
                        key={st}
                        src={getServiceIconPath(st)}
                        alt={getServiceDisplayName(st)}
                        style={{
                          width: allServiceTypes.length > 2 ? '40px' : '48px',
                          height: allServiceTypes.length > 2 ? '40px' : '48px',
                          objectFit: 'contain',
                          marginLeft: i > 0 ? '-8px' : '0',
                        }}
                      />
                    ))
                  ) : (
                    <img
                      src={primaryIconPath}
                      alt="Service Icon"
                      style={{ width: '56px', height: '56px', objectFit: 'contain' }}
                    />
                  )}
                </div>
                <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 500, color: '#003756', lineHeight: '1.25', letterSpacing: '-0.01em' }}>
                  <div style={{ fontWeight: 700, marginBottom: '2px' }}>Service{allServiceTypes.length > 1 ? 's' : ''}</div>
                  <div>{eventInfo.serviceType || serviceDisplayName}</div>
                </div>
              </div>

              {/* Event Date */}
              {eventInfo.date && (
                <div className="flex items-center" style={{ gap: '16px' }}>
                  <div
                    className="flex-shrink-0 flex items-center justify-center"
                    style={{
                      width: '56px',
                      height: '56px'
                    }}
                  >
                    <img
                      src="/QR Code Sign/Icons/Calendar Icon.png"
                      alt="Calendar Icon"
                      style={{ width: '56px', height: '56px', objectFit: 'contain' }}
                    />
                  </div>
                  <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 500, color: '#003756', lineHeight: '1.25', letterSpacing: '-0.01em' }}>
                    <div style={{ fontWeight: 700, marginBottom: '2px' }}>Date</div>
                    <div>{eventInfo.date}</div>
                  </div>
                </div>
              )}

              {/* Event Time */}
              {eventInfo.time && (
                <div className="flex items-center" style={{ gap: '16px' }}>
                  <div
                    className="flex-shrink-0 flex items-center justify-center"
                    style={{
                      width: '56px',
                      height: '56px'
                    }}
                  >
                    <img
                      src="/QR Code Sign/Icons/Time Icon.png"
                      alt="Time Icon"
                      style={{ width: '56px', height: '56px', objectFit: 'contain' }}
                    />
                  </div>
                  <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 500, color: '#003756', lineHeight: '1.25', letterSpacing: '-0.01em' }}>
                    <div style={{ fontWeight: 700, marginBottom: '2px' }}>Time</div>
                    <div>{eventInfo.time}</div>
                  </div>
                </div>
              )}

              {/* Location */}
              {eventInfo.location && (
                <div className="flex items-center" style={{ gap: '16px' }}>
                  <div
                    className="flex-shrink-0 flex items-center justify-center"
                    style={{
                      width: '56px',
                      height: '56px'
                    }}
                  >
                    <img
                      src="/QR Code Sign/Icons/Location icon.png"
                      alt="Location Icon"
                      style={{ width: '56px', height: '56px', objectFit: 'contain' }}
                    />
                  </div>
                  <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 500, color: '#003756', lineHeight: '1.25', letterSpacing: '-0.01em' }}>
                    <div style={{ fontWeight: 700, marginBottom: '2px' }}>Location</div>
                    <div>{eventInfo.location}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Section: Phone Mockup + Scan to Book + QR Code */}
          <div
            style={{
              border: '4px dashed #9EFAFF',
              borderRadius: '24px',
              padding: '48px 48px',
              backgroundColor: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '32px'
            }}
          >
            {/* Left: Phone Mockup — matches Figma design */}
            <div style={{ flex: '0 0 auto' }}>
              <PhoneMockup
                serviceTypes={allServiceTypes}
                serviceImagePath={serviceImagePath}
              />
            </div>

            {/* Center: Scan to Book */}
            <div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '0' }}>
              <h2
                className="font-extrabold flex items-center whitespace-nowrap"
                style={{ fontFamily: 'Outfit, sans-serif', fontSize: '32px', fontWeight: 800, color: '#003756', letterSpacing: '-0.025em', lineHeight: '1' }}
              >
                Scan to book
                <ArrowRight
                  size={32}
                  style={{ color: '#FF5050', marginLeft: '8px', flexShrink: 0 }}
                  strokeWidth={3}
                />
              </h2>
            </div>

            {/* Right: QR Code */}
            <div style={{ flex: '0 0 auto' }}>
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="QR Code"
                  style={{ width: '160px', height: '160px', objectFit: 'contain', display: 'block' }}
                />
              ) : (
                <div
                  className="bg-gray-200 flex items-center justify-center rounded-lg"
                  style={{ width: '160px', height: '160px' }}
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
