import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHolidayPage } from '../contexts/HolidayPageContext';
import { HolidayPageCustomization } from '../types/holidayPage';
import { Button } from './Button';

interface HolidayPageCreatorProps {
  onClose?: () => void;
  editingPage?: any; // Holiday page to edit (if provided)
}

const HolidayPageCreator: React.FC<HolidayPageCreatorProps> = ({ onClose, editingPage }) => {
  const navigate = useNavigate();
  const { createHolidayPage, updateHolidayPage, uploadPartnerLogo } = useHolidayPage();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  console.log('🎨 HolidayPageCreator rendered with editingPage:', editingPage);
  console.log('🎨 Is editing mode:', !!editingPage);
  console.log('🎨 Editing page data:', editingPage?.data);

  const [options, setOptions] = useState({
    partnerName: editingPage?.data?.partnerName || '',
    partnerLogoFile: null as File | null,
    partnerLogoUrl: editingPage?.data?.partnerLogoUrl || '',
    clientEmail: editingPage?.data?.clientEmail || '',
    contactFirstName: editingPage?.customization?.contactFirstName || '',
    contactLastName: editingPage?.customization?.contactLastName || '',
    customMessage: editingPage?.data?.customMessage || '',
    customization: {
      contactFirstName: editingPage?.customization?.contactFirstName || '',
      contactLastName: editingPage?.customization?.contactLastName || '',
      customNote: editingPage?.customization?.customNote || '',
      includePricingCalculator: editingPage?.customization?.includePricingCalculator ?? true,
      includeTestimonials: editingPage?.customization?.includeTestimonials ?? true,
      includeFAQ: editingPage?.customization?.includeFAQ ?? true,
      theme: (editingPage?.customization?.theme || 'default') as const
    }
  });

  // Update options when editingPage changes
  React.useEffect(() => {
    if (editingPage) {
      console.log('🔄 Updating options for editing page:', editingPage);
      setOptions({
        partnerName: editingPage.data?.partnerName || '',
        partnerLogoFile: null,
        partnerLogoUrl: editingPage.data?.partnerLogoUrl || '',
        clientEmail: editingPage.data?.clientEmail || '',
        contactFirstName: editingPage.customization?.contactFirstName || '',
        contactLastName: editingPage.customization?.contactLastName || '',
        customMessage: editingPage.data?.customMessage || '',
        customization: {
          contactFirstName: editingPage.customization?.contactFirstName || '',
          contactLastName: editingPage.customization?.contactLastName || '',
          customNote: editingPage.customization?.customNote || '',
          includePricingCalculator: editingPage.customization?.includePricingCalculator ?? true,
          includeTestimonials: editingPage.customization?.includeTestimonials ?? true,
          includeFAQ: editingPage.customization?.includeFAQ ?? true,
          theme: (editingPage.customization?.theme || 'default') as const
        }
      });
      // Reset updated logo URL when opening for editing
      setUpdatedLogoUrl(null);
    }
  }, [editingPage]);
  const [logoInputType, setLogoInputType] = useState<'file' | 'url'>('file');
  const [updatedLogoUrl, setUpdatedLogoUrl] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!options.partnerName.trim()) {
      newErrors.partnerName = 'Partner name is required';
    }

    if (!options.contactFirstName.trim()) {
      newErrors.contactFirstName = 'Contact first name is required';
    }

    if (!options.contactLastName.trim()) {
      newErrors.contactLastName = 'Contact last name is required';
    }

    if (options.clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(options.clientEmail)) {
      newErrors.clientEmail = 'Please enter a valid email address';
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
      
      // Update customization with contact info
      const finalCustomization: HolidayPageCustomization = {
        ...options.customization,
        contactFirstName: options.contactFirstName,
        contactLastName: options.contactLastName
      };

      const holidayPageOptions = {
        partnerName: options.partnerName,
        partnerLogoFile: options.partnerLogoFile || undefined,
        partnerLogoUrl: options.partnerLogoUrl || undefined,
        clientEmail: options.clientEmail || undefined,
        contactFirstName: options.contactFirstName,
        contactLastName: options.contactLastName,
        customMessage: options.customMessage || undefined,
        customization: finalCustomization
      };

      let holidayPageId;
      
      if (editingPage) {
        // Update existing page
        let logoUrl = editingPage.data.partnerLogoUrl || '';
        
        console.log('🔍 Logo update debug:', {
          originalLogoUrl: editingPage.data.partnerLogoUrl,
          hasNewFile: !!options.partnerLogoFile,
          hasNewUrl: !!options.partnerLogoUrl,
          newUrlValue: options.partnerLogoUrl
        });
        
        // Upload new logo if provided (file takes precedence over URL)
        if (options.partnerLogoFile) {
          console.log('📁 Uploading new logo file...');
          logoUrl = await uploadPartnerLogo(options.partnerLogoFile);
          console.log('✅ New logo uploaded:', logoUrl);
        } else if (options.partnerLogoUrl && options.partnerLogoUrl !== editingPage.data.partnerLogoUrl) {
          console.log('🔗 Using new logo URL:', options.partnerLogoUrl);
          logoUrl = options.partnerLogoUrl;
        } else {
          // Keep existing logo if no new one provided
          logoUrl = editingPage.data.partnerLogoUrl || '';
        }
        
        console.log('🎯 Final logo URL to save:', logoUrl);
        
        // Update the page data
        const updateData = {
          ...editingPage.data,
          partnerName: options.partnerName.trim(),
          partnerLogoUrl: logoUrl,
          clientEmail: options.clientEmail,
          customMessage: options.customMessage,
          updatedAt: new Date().toISOString()
        };
        
        console.log('💾 Updating holiday page with data:', updateData);
        
        await updateHolidayPage(editingPage.id, {
          data: updateData,
          customization: finalCustomization
        });
        
        console.log('✅ Holiday page updated successfully');
        holidayPageId = editingPage.id;
        
        // Update the logo display state
        setUpdatedLogoUrl(logoUrl);
      } else {
        // Create new page
        holidayPageId = await createHolidayPage(holidayPageOptions);
      }
      
      if (onClose) {
        onClose();
      }
      
      navigate(`/holiday-page/${holidayPageId}`);
    } catch (error) {
      console.error('Error creating holiday page:', error);
      alert('Failed to create holiday page. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {editingPage ? 'Edit Holiday Page' : 'Create Holiday Page'}
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
          {/* Partner Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Partner Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Partner Name *
              </label>
              <input
                type="text"
                value={options.partnerName}
                onChange={(e) => handleFieldChange('partnerName', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.partnerName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Burberry, Microsoft, etc."
              />
              {errors.partnerName && (
                <p className="text-red-500 text-sm mt-1">{errors.partnerName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Partner Logo
              </label>
              
              {/* Current logo display */}
              {(() => {
                // Show logo if we have a URL (either from new input, updated logo, or existing page)
                const currentLogoUrl = updatedLogoUrl || options.partnerLogoUrl || editingPage?.data?.partnerLogoUrl;
                const shouldShowLogo = currentLogoUrl && !options.partnerLogoFile;
                
                console.log('🖼️ Logo display debug:', {
                  shouldShowLogo,
                  updatedLogoUrl,
                  optionsPartnerLogoUrl: options.partnerLogoUrl,
                  editingPageLogoUrl: editingPage?.data?.partnerLogoUrl,
                  hasPartnerLogoFile: !!options.partnerLogoFile,
                  currentLogoUrl
                });
                
                return shouldShowLogo && (
                  <div className="mb-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600 mb-2">Current logo:</p>
                    <img 
                      src={currentLogoUrl} 
                      alt="Current logo" 
                      className="h-12 w-auto object-contain" 
                      onError={(e) => console.error('❌ Logo image failed to load:', currentLogoUrl)}
                      onLoad={() => console.log('✅ Logo image loaded successfully:', currentLogoUrl)}
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              )}

              {/* URL input */}
              {logoInputType === 'url' && (
                <input
                  type="url"
                  value={options.partnerLogoUrl}
                  onChange={handleLogoUrlChange}
                  placeholder="https://example.com/logo.png"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.partnerLogoUrl ? 'border-red-500' : 'border-gray-300'
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Email
              </label>
              <input
                type="email"
                value={options.clientEmail}
                onChange={(e) => handleFieldChange('clientEmail', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.clientEmail ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="client@company.com"
              />
              {errors.clientEmail && (
                <p className="text-red-500 text-sm mt-1">{errors.clientEmail}</p>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  value={options.contactFirstName}
                  onChange={(e) => handleFieldChange('contactFirstName', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.contactFirstName ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.contactFirstName && (
                  <p className="text-red-500 text-sm mt-1">{errors.contactFirstName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={options.contactLastName}
                  onChange={(e) => handleFieldChange('contactLastName', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.contactLastName ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.contactLastName && (
                  <p className="text-red-500 text-sm mt-1">{errors.contactLastName}</p>
                )}
              </div>
            </div>
          </div>

          {/* Custom Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Message (Optional)
            </label>
            <textarea
              value={options.customMessage}
              onChange={(e) => handleFieldChange('customMessage', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Any special message for this partner..."
            />
          </div>

          {/* Page Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Page Options</h3>
            
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.customization.includePricingCalculator}
                  onChange={(e) => handleFieldChange('customization.includePricingCalculator', e.target.checked)}
                  className="mr-3"
                />
                <span className="text-sm text-gray-700">Include Pricing Calculator</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.customization.includeTestimonials}
                  onChange={(e) => handleFieldChange('customization.includeTestimonials', e.target.checked)}
                  className="mr-3"
                />
                <span className="text-sm text-gray-700">Include Testimonials</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.customization.includeFAQ}
                  onChange={(e) => handleFieldChange('customization.includeFAQ', e.target.checked)}
                  className="mr-3"
                />
                <span className="text-sm text-gray-700">Include FAQ Section</span>
              </label>
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
              {loading ? (editingPage ? 'Updating...' : 'Creating...') : (editingPage ? 'Update Holiday Page' : 'Create Holiday Page')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HolidayPageCreator;
