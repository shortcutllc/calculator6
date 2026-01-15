import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQRCodeSign } from '../contexts/QRCodeSignContext';
import { QRCodeSignCustomization } from '../types/qrCodeSign';
import { Button } from './Button';

interface QRCodeSignCreatorProps {
  onClose?: () => void;
  editingSign?: any; // QR code sign to edit (if provided)
}

const QRCodeSignCreator: React.FC<QRCodeSignCreatorProps> = ({ onClose, editingSign }) => {
  const navigate = useNavigate();
  const { createQRCodeSign, updateQRCodeSign, uploadPartnerLogo } = useQRCodeSign();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Parse existing event details if editing
  const parseEventDetails = (details: string) => {
    const lines = details?.split('\n').map(l => l.trim()).filter(l => l) || [];
    const result = { serviceTypeText: '', date: '', time: '', location: '' };

    lines.forEach(line => {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes('service') || lowerLine.includes('type')) {
        result.serviceTypeText = line.replace(/^[^:]+:\s*/, '');
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

  const existingDetails = editingSign ? parseEventDetails(editingSign.data?.eventDetails) : null;

  const [options, setOptions] = useState({
    title: editingSign?.data?.title || '',
    serviceType: editingSign?.data?.serviceType || 'massage',
    serviceTypeText: existingDetails?.serviceTypeText || '',
    eventDate: existingDetails?.date || '',
    eventTime: existingDetails?.time || '',
    location: existingDetails?.location || '',
    qrCodeUrl: editingSign?.data?.qrCodeUrl || '',
    partnerLogoFile: null as File | null,
    partnerLogoUrl: editingSign?.data?.partnerLogoUrl || '',
    partnerName: editingSign?.data?.partnerName || '',
    customization: editingSign?.customization || {}
  });

  // Update options when editingSign changes
  React.useEffect(() => {
    if (editingSign) {
      const details = parseEventDetails(editingSign.data?.eventDetails);
      setOptions({
        title: editingSign.data?.title || '',
        serviceType: editingSign.data?.serviceType || 'massage',
        serviceTypeText: details.serviceTypeText || '',
        eventDate: details.date || '',
        eventTime: details.time || '',
        location: details.location || '',
        qrCodeUrl: editingSign.data?.qrCodeUrl || '',
        partnerLogoFile: null,
        partnerLogoUrl: editingSign.data?.partnerLogoUrl || '',
        partnerName: editingSign.data?.partnerName || '',
        customization: editingSign.customization || {}
      });
      setUpdatedLogoUrl(null);
    }
  }, [editingSign]);

  const [logoInputType, setLogoInputType] = useState<'file' | 'url'>('file');
  const [updatedLogoUrl, setUpdatedLogoUrl] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!options.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!options.qrCodeUrl.trim()) {
      newErrors.qrCodeUrl = 'QR code URL is required';
    } else {
      // Basic URL validation
      try {
        new URL(options.qrCodeUrl);
      } catch {
        newErrors.qrCodeUrl = 'Please enter a valid URL';
      }
    }

    if (!options.serviceType) {
      newErrors.serviceType = 'Service type is required';
    }

    // Validate logo URL if provided
    if (options.partnerLogoUrl && !validateLogoUrl(options.partnerLogoUrl)) {
      // Error already set in validateLogoUrl function
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setOptions(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev],
          [child]: value
        }
      }));
    } else {
      setOptions(prev => ({
        ...prev,
        [field]: value
      }));
    }

    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.includes('svg') && !file.type.includes('image/')) {
        setErrors(prev => ({
          ...prev,
          partnerLogoFile: 'Please upload an SVG or image file'
        }));
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          partnerLogoFile: 'File size must be less than 5MB'
        }));
        return;
      }

      // Clear any previous errors and reset URL when uploading file
      setErrors(prev => ({ ...prev, partnerLogoFile: '', partnerLogoUrl: '' }));
      setOptions(prev => ({
        ...prev,
        partnerLogoFile: file,
        partnerLogoUrl: '' // Clear URL when uploading file
      }));
    }
  };

  const handleLogoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setOptions(prev => ({
      ...prev,
      partnerLogoUrl: url,
      partnerLogoFile: null // Clear file when using URL
    }));
    setErrors(prev => ({ ...prev, partnerLogoUrl: '' }));
  };

  const validateLogoUrl = (url: string): boolean => {
    if (!url) return true; // URL is optional

    try {
      new URL(url);
      // Check if it's an image URL
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'];
      const hasImageExtension = imageExtensions.some(ext =>
        url.toLowerCase().includes(ext)
      );

      if (!hasImageExtension && !url.includes('data:image/')) {
        setErrors(prev => ({
          ...prev,
          partnerLogoUrl: 'Please enter a valid image URL'
        }));
        return false;
      }

      return true;
    } catch {
      setErrors(prev => ({
        ...prev,
        partnerLogoUrl: 'Please enter a valid URL'
      }));
      return false;
    }
  };

  // Build event details string from individual fields
  const buildEventDetails = () => {
    const parts = [];
    if (options.serviceTypeText) parts.push(`Service Type: ${options.serviceTypeText}`);
    if (options.eventDate) parts.push(`Date: ${options.eventDate}`);
    if (options.eventTime) parts.push(`Time: ${options.eventTime}`);
    if (options.location) parts.push(`Location: ${options.location}`);
    return parts.join('\n');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const finalCustomization: QRCodeSignCustomization = {
        ...options.customization
      };

      const eventDetails = buildEventDetails();

      const qrCodeSignOptions = {
        title: options.title.trim(),
        eventDetails: eventDetails,
        qrCodeUrl: options.qrCodeUrl.trim(),
        serviceType: options.serviceType,
        partnerLogoFile: options.partnerLogoFile || undefined,
        partnerLogoUrl: options.partnerLogoUrl || undefined,
        partnerName: options.partnerName.trim() || undefined,
        customization: finalCustomization
      };

      let qrCodeSignId;

      if (editingSign) {
        // Update existing sign
        let logoUrl = editingSign.data.partnerLogoUrl || '';

        // Upload new logo if provided (file takes precedence over URL)
        if (options.partnerLogoFile) {
          logoUrl = await uploadPartnerLogo(options.partnerLogoFile);
        } else if (options.partnerLogoUrl && options.partnerLogoUrl !== editingSign.data.partnerLogoUrl) {
          logoUrl = options.partnerLogoUrl;
        }

        // Update the sign data
        const updateData = {
          ...editingSign.data,
          title: options.title.trim(),
          eventDetails: eventDetails,
          qrCodeUrl: options.qrCodeUrl.trim(),
          serviceType: options.serviceType,
          partnerLogoUrl: logoUrl,
          partnerName: options.partnerName.trim() || undefined,
          updatedAt: new Date().toISOString()
        };

        await updateQRCodeSign(editingSign.id, {
          data: updateData,
          customization: finalCustomization
        });

        qrCodeSignId = editingSign.id;
        setUpdatedLogoUrl(logoUrl);
      } else {
        // Create new sign
        qrCodeSignId = await createQRCodeSign(qrCodeSignOptions);
      }

      if (onClose) {
        onClose();
      }

      navigate(`/qr-code-sign/${qrCodeSignId}`);
    } catch (error) {
      console.error('Error creating QR code sign:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create QR code sign. Please try again.';
      alert(errorMessage);
      setLoading(false);
    }
  };

  const serviceTypes = [
    { value: 'massage', label: 'Massage' },
    { value: 'hair-beauty', label: 'Hair + Beauty' },
    { value: 'headshot', label: 'Headshots' },
    { value: 'nails', label: 'Nails' },
    { value: 'mindfulness', label: 'Mindfulness' },
    { value: 'facial', label: 'Facials' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 lg:p-12 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-shortcut-navy-blue">
            {editingSign ? 'Edit QR Code Sign' : 'Create QR Code Sign'}
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-shortcut-navy-blue opacity-40 hover:opacity-60 text-3xl leading-none transition-opacity"
            >
              ×
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Sign Content */}
          <div className="space-y-6">
            <h3 className="text-xl lg:text-2xl font-extrabold text-shortcut-navy-blue">Sign Content</h3>

            <div>
              <label className="block text-sm font-bold text-shortcut-navy-blue mb-2">
                Event Title *
              </label>
              <input
                type="text"
                value={options.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                className={`w-full px-4 py-3 text-base font-medium border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all ${
                  errors.title ? 'border-accent-coral' : 'border-gray-300'
                }`}
                placeholder="e.g., Complimentary Massage Services for Powin PDX Employees"
              />
              {errors.title && (
                <p className="text-accent-coral text-sm font-medium mt-2">{errors.title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-shortcut-navy-blue mb-2">
                Service Type (Category) *
              </label>
              <select
                value={options.serviceType}
                onChange={(e) => handleFieldChange('serviceType', e.target.value)}
                className={`w-full px-4 py-3 text-base font-medium border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all ${
                  errors.serviceType ? 'border-accent-coral' : 'border-gray-300'
                }`}
              >
                {serviceTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {errors.serviceType && (
                <p className="text-accent-coral text-sm font-medium mt-2">{errors.serviceType}</p>
              )}
              <p className="text-shortcut-navy-blue opacity-60 text-sm font-medium mt-2">
                This determines which image appears on the sign
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-shortcut-navy-blue mb-2">
                QR Code URL *
              </label>
              <input
                type="url"
                value={options.qrCodeUrl}
                onChange={(e) => handleFieldChange('qrCodeUrl', e.target.value)}
                className={`w-full px-4 py-3 text-base font-medium border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all ${
                  errors.qrCodeUrl ? 'border-accent-coral' : 'border-gray-300'
                }`}
                placeholder="https://example.com/book-appointment"
              />
              {errors.qrCodeUrl && (
                <p className="text-accent-coral text-sm font-medium mt-2">{errors.qrCodeUrl}</p>
              )}
              <p className="text-shortcut-navy-blue opacity-60 text-sm font-medium mt-2">
                This URL will be encoded in the QR code (booking/signup link)
              </p>
            </div>
          </div>

          {/* Event Details */}
          <div className="space-y-6">
            <h3 className="text-xl lg:text-2xl font-extrabold text-shortcut-navy-blue">Event Details</h3>

            <div>
              <label className="block text-sm font-bold text-shortcut-navy-blue mb-2">
                Service Type (Display Text)
              </label>
              <input
                type="text"
                value={options.serviceTypeText}
                onChange={(e) => handleFieldChange('serviceTypeText', e.target.value)}
                className="w-full px-4 py-3 text-base font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
                placeholder="e.g., Compression & Sports"
              />
              <p className="text-shortcut-navy-blue opacity-60 text-sm font-medium mt-2">
                Optional custom text for service type (will use category if left blank)
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-shortcut-navy-blue mb-2">
                Event Date
              </label>
              <input
                type="text"
                value={options.eventDate}
                onChange={(e) => handleFieldChange('eventDate', e.target.value)}
                className="w-full px-4 py-3 text-base font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
                placeholder="e.g., March 5th"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-shortcut-navy-blue mb-2">
                Event Time
              </label>
              <input
                type="text"
                value={options.eventTime}
                onChange={(e) => handleFieldChange('eventTime', e.target.value)}
                className="w-full px-4 py-3 text-base font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
                placeholder="e.g., 1:00 PM - 5:00 PM"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-shortcut-navy-blue mb-2">
                Location
              </label>
              <input
                type="text"
                value={options.location}
                onChange={(e) => handleFieldChange('location', e.target.value)}
                className="w-full px-4 py-3 text-base font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
                placeholder="e.g., Quiet Room"
              />
            </div>
          </div>

          {/* Partner Information (Optional) */}
          <div className="space-y-6">
            <h3 className="text-xl lg:text-2xl font-extrabold text-shortcut-navy-blue">Partner Information (Optional)</h3>

            <div>
              <label className="block text-sm font-bold text-shortcut-navy-blue mb-2">
                Partner Name
              </label>
              <input
                type="text"
                value={options.partnerName}
                onChange={(e) => handleFieldChange('partnerName', e.target.value)}
                className="w-full px-4 py-3 text-base font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
                placeholder="e.g., Powin"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-shortcut-navy-blue mb-2">
                Partner Logo
              </label>

              {/* Current logo display */}
              {(() => {
                const currentLogoUrl = updatedLogoUrl || options.partnerLogoUrl || editingSign?.data?.partnerLogoUrl;
                const shouldShowLogo = currentLogoUrl && !options.partnerLogoFile;

                return shouldShowLogo && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg border-2 border-gray-300">
                    <p className="text-sm font-medium text-shortcut-navy-blue mb-2">Current logo:</p>
                    <img
                      src={currentLogoUrl}
                      alt="Current logo"
                      className="h-12 w-auto object-contain"
                      onError={(e) => console.error('❌ Logo image failed to load:', currentLogoUrl)}
                    />
                    <p className="text-xs font-medium text-shortcut-navy-blue opacity-60 mt-2">Upload a new file or paste a URL to replace this logo</p>
                  </div>
                );
              })()}

              {/* Input type toggle */}
              <div className="mb-4">
                <div className="flex space-x-6">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="logoInputType"
                      value="file"
                      checked={logoInputType === 'file'}
                      onChange={(e) => setLogoInputType(e.target.value as 'file' | 'url')}
                      className="mr-2 w-4 h-4"
                    />
                    <span className="text-sm font-bold text-shortcut-navy-blue">Upload File</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="logoInputType"
                      value="url"
                      checked={logoInputType === 'url'}
                      onChange={(e) => setLogoInputType(e.target.value as 'file' | 'url')}
                      className="mr-2 w-4 h-4"
                    />
                    <span className="text-sm font-bold text-shortcut-navy-blue">Paste URL</span>
                  </label>
                </div>
              </div>

              {/* File upload input */}
              {logoInputType === 'file' && (
                <input
                  type="file"
                  accept=".svg,.png,.jpg,.jpeg,.webp"
                  onChange={handleLogoFileChange}
                  className="w-full px-4 py-3 text-base font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
                />
              )}

              {/* URL input */}
              {logoInputType === 'url' && (
                <input
                  type="url"
                  value={options.partnerLogoUrl}
                  onChange={handleLogoUrlChange}
                  placeholder="https://example.com/logo.png"
                  className={`w-full px-4 py-3 text-base font-medium border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all ${
                    errors.partnerLogoUrl ? 'border-accent-coral' : 'border-gray-300'
                  }`}
                />
              )}

              {/* Error messages */}
              {errors.partnerLogoFile && (
                <p className="text-accent-coral text-sm font-medium mt-2">{errors.partnerLogoFile}</p>
              )}
              {errors.partnerLogoUrl && (
                <p className="text-accent-coral text-sm font-medium mt-2">{errors.partnerLogoUrl}</p>
              )}

              <p className="text-shortcut-navy-blue opacity-60 text-sm font-medium mt-2">
                {logoInputType === 'file'
                  ? 'SVG files are preferred for color customization. Max size: 5MB'
                  : 'Paste a direct link to an image (PNG, JPG, SVG, etc.)'
                }
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-8">
            {onClose && (
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? (editingSign ? 'Updating...' : 'Creating...') : (editingSign ? 'Update QR Code Sign' : 'Create QR Code Sign')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QRCodeSignCreator;
