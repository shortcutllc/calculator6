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

  const [options, setOptions] = useState({
    title: editingSign?.data?.title || '',
    eventDetails: editingSign?.data?.eventDetails || '',
    qrCodeUrl: editingSign?.data?.qrCodeUrl || '',
    serviceType: editingSign?.data?.serviceType || 'massage',
    partnerLogoFile: null as File | null,
    partnerLogoUrl: editingSign?.data?.partnerLogoUrl || '',
    partnerName: editingSign?.data?.partnerName || '',
    customization: editingSign?.customization || {}
  });

  // Update options when editingSign changes
  React.useEffect(() => {
    if (editingSign) {
      setOptions({
        title: editingSign.data?.title || '',
        eventDetails: editingSign.data?.eventDetails || '',
        qrCodeUrl: editingSign.data?.qrCodeUrl || '',
        serviceType: editingSign.data?.serviceType || 'massage',
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

      const qrCodeSignOptions = {
        title: options.title.trim(),
        eventDetails: options.eventDetails.trim(),
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
          eventDetails: options.eventDetails.trim(),
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
      <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {editingSign ? 'Edit QR Code Sign' : 'Create QR Code Sign'}
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sign Content */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Sign Content</h3>
            
            <div>
              <label className="block text-sm font-bold text-shortcut-blue mb-2">
                Title *
              </label>
              <input
                type="text"
                value={options.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal ${
                  errors.title ? 'border-red-500' : 'border-gray-200'
                }`}
                placeholder="e.g., Book Your Appointment"
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-shortcut-blue mb-2">
                Event Details
              </label>
              <textarea
                value={options.eventDetails}
                onChange={(e) => handleFieldChange('eventDetails', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
                placeholder="Enter event details, location, time, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-shortcut-blue mb-2">
                QR Code URL *
              </label>
              <input
                type="url"
                value={options.qrCodeUrl}
                onChange={(e) => handleFieldChange('qrCodeUrl', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.qrCodeUrl ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="https://example.com/book-appointment"
              />
              {errors.qrCodeUrl && (
                <p className="text-red-500 text-sm mt-1">{errors.qrCodeUrl}</p>
              )}
              <p className="text-gray-500 text-sm mt-1">
                This URL will be encoded in the QR code
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-shortcut-blue mb-2">
                Service Type *
              </label>
              <select
                value={options.serviceType}
                onChange={(e) => handleFieldChange('serviceType', e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal ${
                  errors.serviceType ? 'border-red-500' : 'border-gray-200'
                }`}
              >
                {serviceTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {errors.serviceType && (
                <p className="text-red-500 text-sm mt-1">{errors.serviceType}</p>
              )}
              <p className="text-gray-500 text-sm mt-1">
                This determines which icons and images appear on the sign
              </p>
            </div>
          </div>

          {/* Partner Information (Optional) */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Partner Information (Optional)</h3>
            
            <div>
              <label className="block text-sm font-bold text-shortcut-blue mb-2">
                Partner Name
              </label>
              <input
                type="text"
                value={options.partnerName}
                onChange={(e) => handleFieldChange('partnerName', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
                placeholder="e.g., Company Name"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-shortcut-blue mb-2">
                Partner Logo
              </label>
              
              {/* Current logo display */}
              {(() => {
                const currentLogoUrl = updatedLogoUrl || options.partnerLogoUrl || editingSign?.data?.partnerLogoUrl;
                const shouldShowLogo = currentLogoUrl && !options.partnerLogoFile;
                
                return shouldShowLogo && (
                  <div className="mb-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600 mb-2">Current logo:</p>
                    <img 
                      src={currentLogoUrl} 
                      alt="Current logo" 
                      className="h-12 w-auto object-contain" 
                      onError={(e) => console.error('❌ Logo image failed to load:', currentLogoUrl)}
                    />
                    <p className="text-xs text-gray-500 mt-2">Upload a new file or paste a URL to replace this logo</p>
                  </div>
                );
              })()}

              {/* Input type toggle */}
              <div className="mb-3">
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="logoInputType"
                      value="file"
                      checked={logoInputType === 'file'}
                      onChange={(e) => setLogoInputType(e.target.value as 'file' | 'url')}
                      className="mr-2"
                    />
                    Upload File
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="logoInputType"
                      value="url"
                      checked={logoInputType === 'url'}
                      onChange={(e) => setLogoInputType(e.target.value as 'file' | 'url')}
                      className="mr-2"
                    />
                    Paste URL
                  </label>
                </div>
              </div>

              {/* File upload input */}
              {logoInputType === 'file' && (
                <input
                  type="file"
                  accept=".svg,.png,.jpg,.jpeg,.webp"
                  onChange={handleLogoFileChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
                />
              )}

              {/* URL input */}
              {logoInputType === 'url' && (
                <input
                  type="url"
                  value={options.partnerLogoUrl}
                  onChange={handleLogoUrlChange}
                  placeholder="https://example.com/logo.png"
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal ${
                    errors.partnerLogoUrl ? 'border-red-500' : 'border-gray-200'
                  }`}
                />
              )}

              {/* Error messages */}
              {errors.partnerLogoFile && (
                <p className="text-red-500 text-sm mt-1">{errors.partnerLogoFile}</p>
              )}
              {errors.partnerLogoUrl && (
                <p className="text-red-500 text-sm mt-1">{errors.partnerLogoUrl}</p>
              )}

              <p className="text-gray-500 text-sm mt-1">
                {logoInputType === 'file' 
                  ? 'SVG files are preferred for color customization. Max size: 5MB'
                  : 'Paste a direct link to an image (PNG, JPG, SVG, etc.)'
                }
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6">
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

