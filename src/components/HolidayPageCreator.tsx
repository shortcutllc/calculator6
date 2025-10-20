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

  const [options, setOptions] = useState({
    partnerName: editingPage?.data?.partnerName || '',
    partnerLogoFile: null as File | null,
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
  const [existingLogoUrl, setExistingLogoUrl] = useState(editingPage?.data?.partnerLogoUrl || '');

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

      handleFieldChange('partnerLogoFile', file);
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
        
        // Upload new logo if provided
        if (options.partnerLogoFile) {
          logoUrl = await uploadPartnerLogo(options.partnerLogoFile);
        }
        
        // Update the page data
        await updateHolidayPage(editingPage.id, {
          data: {
            ...editingPage.data,
            partnerName: options.partnerName.trim(),
            partnerLogoUrl: logoUrl,
            clientEmail: options.clientEmail,
            customMessage: options.customMessage,
            updatedAt: new Date().toISOString()
          },
          customization: finalCustomization
        });
        
        holidayPageId = editingPage.id;
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
          <h2 className="text-2xl font-bold text-gray-900">Create Holiday Page</h2>
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
                Partner Logo (SVG preferred)
              </label>
              {existingLogoUrl && !options.partnerLogoFile && (
                <div className="mb-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">Current logo:</p>
                  <img src={existingLogoUrl} alt="Current logo" className="h-12 w-auto object-contain" />
                  <p className="text-xs text-gray-500 mt-2">Upload a new file to replace this logo</p>
                </div>
              )}
              <input
                type="file"
                accept=".svg,.png,.jpg,.jpeg"
                onChange={handleLogoFileChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.partnerLogoFile && (
                <p className="text-red-500 text-sm mt-1">{errors.partnerLogoFile}</p>
              )}
              <p className="text-gray-500 text-sm mt-1">
                SVG files are preferred for color customization. Max size: 5MB
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
