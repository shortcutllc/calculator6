import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQRCodeSign } from '../contexts/QRCodeSignContext';
import { QRCodeSign } from '../types/qrCodeSign';
import { generateQRCodeDataURL } from '../utils/qrCodeGenerator';
import { getServiceIconPath, getServiceImagePath, getServiceDisplayName } from '../utils/qrCodeSignUtils';
import { LoadingSpinner } from './LoadingSpinner';
import { Button } from './Button';

const QRCodeSignDisplay: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getQRCodeSign, loading } = useQRCodeSign();
  const [qrCodeSign, setQRCodeSign] = useState<QRCodeSign | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [qrCodeLoading, setQrCodeLoading] = useState(true);
  const svgRef = useRef<HTMLDivElement>(null);

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
  }, [id]); // Only depend on id, not getQRCodeSign to avoid infinite loops

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
          size: 400,
          margin: 1,
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="h2 mb-4">QR Code Sign Not Found</h2>
          <p className="text-text-dark-60">The sign you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const serviceIconPath = getServiceIconPath(qrCodeSign.data.serviceType);
  const serviceImagePath = getServiceImagePath(qrCodeSign.data.serviceType);
  const serviceDisplayName = getServiceDisplayName(qrCodeSign.data.serviceType);

  return (
    <div className="min-h-screen bg-neutral-light-gray py-8">
      <div className="container mx-auto px-4">
        {/* Printable Sign Container */}
        <div className="card-large max-w-4xl mx-auto">
          <div className="flex justify-between items-start mb-6 print:hidden">
            <div>
              <h1 className="h1">QR Code Sign Preview</h1>
              <p className="text-text-dark-60 mt-1">{serviceDisplayName} - {qrCodeSign.data.title}</p>
            </div>
            <Button
              onClick={() => window.print()}
              variant="primary"
            >
              Print / Save as PDF
            </Button>
          </div>

          {/* Sign Content */}
          <div 
            ref={svgRef}
            className="bg-white border-2 border-gray-200 rounded-lg p-8"
            style={{ aspectRatio: '8.5/11' }} // Standard sign proportions
          >
            {/* Partner Logo (if provided) */}
            {qrCodeSign.data.partnerLogoUrl && (
              <div className="mb-6 text-center">
                <img
                  src={qrCodeSign.data.partnerLogoUrl}
                  alt={qrCodeSign.data.partnerName || 'Partner logo'}
                  className="h-16 mx-auto object-contain"
                />
                {qrCodeSign.data.partnerName && (
                  <p className="text-sm text-text-dark-60 mt-2">{qrCodeSign.data.partnerName}</p>
                )}
              </div>
            )}

            {/* Title */}
            <div className="text-center mb-6">
              <h2 className="h2 mb-2">
                {qrCodeSign.data.title}
              </h2>
            </div>

            {/* Service Image */}
            <div className="flex justify-center mb-6">
              <img
                src={serviceImagePath}
                alt={serviceDisplayName}
                className="h-48 w-auto object-contain"
                onError={(e) => {
                  console.error('Service image failed to load:', serviceImagePath);
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>

            {/* Service Icon */}
            <div className="flex justify-center mb-6">
              <img
                src={serviceIconPath}
                alt={serviceDisplayName}
                className="h-16 w-auto object-contain"
                onError={(e) => {
                  console.error('Service icon failed to load:', serviceIconPath);
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>

            {/* Event Details */}
            {qrCodeSign.data.eventDetails && (
              <div className="mb-6 text-center">
                <p className="text-lg text-text-dark whitespace-pre-line">
                  {qrCodeSign.data.eventDetails}
                </p>
              </div>
            )}

            {/* QR Code */}
            <div className="flex justify-center mb-4">
              {qrCodeDataUrl ? (
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code"
                    className="w-64 h-64"
                  />
                </div>
              ) : (
                <div className="w-64 h-64 bg-neutral-gray rounded-lg flex items-center justify-center">
                  <p className="text-text-dark-60">Loading QR Code...</p>
                </div>
              )}
            </div>

            {/* QR Code URL (small text below) */}
            <div className="text-center">
              <p className="text-xs text-text-dark-60">
                Scan to visit: {qrCodeSign.data.qrCodeUrl}
              </p>
            </div>
          </div>

          {/* Info Section (hidden when printing) */}
          <div className="mt-6 text-sm text-text-dark-60 print:hidden">
            <p><strong>Service Type:</strong> {serviceDisplayName}</p>
            <p><strong>Created:</strong> {new Date(qrCodeSign.createdAt).toLocaleDateString()}</p>
            {qrCodeSign.data.qrCodeUrl && (
              <p><strong>QR Code Links To:</strong> <a href={qrCodeSign.data.qrCodeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{qrCodeSign.data.qrCodeUrl}</a></p>
            )}
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .container, .container * {
            visibility: visible;
          }
          .container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default QRCodeSignDisplay;

