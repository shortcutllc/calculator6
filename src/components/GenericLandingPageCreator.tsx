import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGenericLandingPage } from '../contexts/GenericLandingPageContext';
import { GenericLandingPageCustomization, ConferencePackageOverride, LandingPageType } from '../types/genericLandingPage';
import { SENDER_TO_CALENDAR } from '../utils/workhumanOutreachTemplates';
import { CONFERENCE_PACKAGES, CONFERENCE_BUNDLES } from '../utils/conferencePackages';
import { Button } from './Button';

// Team members who have a Google Calendar booking link. The selected rep's
// link is embedded on the Book-a-Call landing page.
const BOOKING_REPS = Object.keys(SENDER_TO_CALENDAR);

interface GenericLandingPageCreatorProps {
  onClose?: () => void;
  editingPage?: any; // Generic landing page to edit (if provided)
}

const GenericLandingPageCreator: React.FC<GenericLandingPageCreatorProps> = ({ onClose, editingPage }) => {
  const navigate = useNavigate();
  const { createGenericLandingPage, updateGenericLandingPage, uploadPartnerLogo } = useGenericLandingPage();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  console.log('🎨 GenericLandingPageCreator rendered with editingPage:', editingPage);
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
    isReturningClient: editingPage?.isReturningClient || false,
    pageType: (editingPage?.pageType || 'generic') as LandingPageType,
    customization: {
      contactFirstName: editingPage?.customization?.contactFirstName || '',
      contactLastName: editingPage?.customization?.contactLastName || '',
      customNote: editingPage?.customization?.customNote || '',
      bookingRep: editingPage?.customization?.bookingRep || 'Will Newton',
      infoOnly: editingPage?.customization?.infoOnly || false,
      includePricingCalculator: editingPage?.customization?.includePricingCalculator ?? true,
      includeTestimonials: editingPage?.customization?.includeTestimonials ?? true,
      includeFAQ: editingPage?.customization?.includeFAQ ?? true,
      theme: (editingPage?.customization?.theme || 'default') as const,
      showPackages: editingPage?.customization?.showPackages ?? true,
      showPackagePricing: editingPage?.customization?.showPackagePricing ?? true,
      packageOverrides: (editingPage?.customization?.packageOverrides || {}) as Record<string, ConferencePackageOverride>,
      heroVariant: editingPage?.customization?.heroVariant || 'editorial',
      servicesVariant: editingPage?.customization?.servicesVariant || 'rail',
      packagesVariant: editingPage?.customization?.packagesVariant || 'stations',
      goodToKnowVariant: editingPage?.customization?.goodToKnowVariant || 'list'
    }
  });

  // Update options when editingPage changes
  React.useEffect(() => {
    if (editingPage) {
      console.log('🔄 Updating options for editing page:', editingPage);
      console.log('🔍 editingPage.isReturningClient:', editingPage.isReturningClient, typeof editingPage.isReturningClient);
      const isReturningClientValue = editingPage.isReturningClient === true || editingPage.isReturningClient === 'true' || editingPage.isReturningClient === 1;
      console.log('🔍 Parsed isReturningClient value:', isReturningClientValue);
      
      setOptions({
        partnerName: editingPage.data?.partnerName || '',
        partnerLogoFile: null,
        partnerLogoUrl: editingPage.data?.partnerLogoUrl || '',
        clientEmail: editingPage.data?.clientEmail || '',
        contactFirstName: editingPage.customization?.contactFirstName || '',
        contactLastName: editingPage.customization?.contactLastName || '',
        customMessage: editingPage.data?.customMessage || '',
        isReturningClient: isReturningClientValue,
        pageType: (editingPage.pageType || 'generic') as LandingPageType,
        customization: {
          contactFirstName: editingPage.customization?.contactFirstName || '',
          contactLastName: editingPage.customization?.contactLastName || '',
          customNote: editingPage.customization?.customNote || '',
          bookingRep: editingPage.customization?.bookingRep || 'Will Newton',
          infoOnly: editingPage.customization?.infoOnly || false,
          includePricingCalculator: editingPage.customization?.includePricingCalculator ?? true,
          includeTestimonials: editingPage.customization?.includeTestimonials ?? true,
          includeFAQ: editingPage.customization?.includeFAQ ?? true,
          theme: (editingPage.customization?.theme || 'default') as const,
          showPackages: editingPage.customization?.showPackages ?? true,
          showPackagePricing: editingPage.customization?.showPackagePricing ?? true,
          packageOverrides: (editingPage.customization?.packageOverrides || {}) as Record<string, ConferencePackageOverride>,
          heroVariant: editingPage.customization?.heroVariant || 'editorial',
          servicesVariant: editingPage.customization?.servicesVariant || 'rail',
          packagesVariant: editingPage.customization?.packagesVariant || 'stations',
          goodToKnowVariant: editingPage.customization?.goodToKnowVariant || 'list'
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

    // Conference pages only show the client name/logo, no contact block.
    if (options.pageType !== 'conference') {
      if (!options.contactFirstName.trim()) {
        newErrors.contactFirstName = 'Contact first name is required';
      }

      if (!options.contactLastName.trim()) {
        newErrors.contactLastName = 'Contact last name is required';
      }
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
      const finalCustomization: GenericLandingPageCustomization = {
        ...options.customization,
        contactFirstName: options.contactFirstName,
        contactLastName: options.contactLastName
      };

      const genericLandingPageOptions = {
        partnerName: options.partnerName,
        partnerLogoFile: options.partnerLogoFile || undefined,
        partnerLogoUrl: options.partnerLogoUrl || undefined,
        clientEmail: options.clientEmail || undefined,
        contactFirstName: options.contactFirstName,
        contactLastName: options.contactLastName,
        customMessage: options.customMessage || undefined,
        customization: finalCustomization,
        isReturningClient: options.isReturningClient,
        pageType: options.pageType
      };

      let pageId;
      
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
        
        console.log('💾 Updating generic landing page with data:', updateData);
        console.log('🔍 isReturningClient being sent:', options.isReturningClient, typeof options.isReturningClient);
        console.log('🔍 Current options state:', JSON.stringify({ isReturningClient: options.isReturningClient }, null, 2));
        
        // Ensure isReturningClient is explicitly set as a boolean
        const isReturningClientValue = options.isReturningClient === true || options.isReturningClient === 'true';
        
        const updatePayload = {
          data: updateData,
          customization: finalCustomization,
          isReturningClient: isReturningClientValue // Explicitly convert to boolean
        };
        
        console.log('🔍 Update payload:', JSON.stringify(updatePayload, null, 2));
        console.log('🔍 options.isReturningClient original:', options.isReturningClient, typeof options.isReturningClient);
        console.log('🔍 isReturningClientValue converted:', isReturningClientValue, typeof isReturningClientValue);
        
        await updateGenericLandingPage(editingPage.id, updatePayload);
        
        console.log('✅ Generic landing page updated successfully');
        pageId = editingPage.id;
        
        // Update the logo display state
        setUpdatedLogoUrl(logoUrl);
      } else {
        // Create new page
        console.log('🔍 Creating new page with isReturningClient:', genericLandingPageOptions.isReturningClient);
        pageId = await createGenericLandingPage(genericLandingPageOptions);
      }
      
      if (onClose) {
        onClose();
      }
      
      // Navigate to the correct page based on type
      if (options.pageType === 'workhuman') {
        const base = options.customization.infoOnly ? '/info' : '/book-a-call';
        navigate(`${base}/${pageId}?refresh=${Date.now()}`);
      } else if (options.pageType === 'conference') {
        navigate(`/conference/${pageId}?refresh=${Date.now()}`);
      } else {
        navigate(`/generic-landing-page/${pageId}?refresh=${Date.now()}`);
      }
    } catch (error) {
      console.error('Error creating generic landing page:', error);
      alert('Failed to create generic landing page. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto z-[200] relative">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {(() => {
              const label = options.pageType === 'workhuman' ? 'Book a Call' : options.pageType === 'conference' ? 'Conference One-Pager' : 'Generic';
              return editingPage ? `Edit ${label} Landing Page` : `Create ${label} Landing Page`;
            })()}
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
          {/* Page Type Selector */}
          <div>
            <label className="block text-sm font-bold text-shortcut-blue mb-2">Page Type</label>
            <div className="flex gap-2">
              {([
                { value: 'generic' as const, label: 'Generic Landing Page' },
                { value: 'workhuman' as const, label: 'Book a Call' },
                { value: 'conference' as const, label: 'Conference One-Pager' },
              ]).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleFieldChange('pageType', value)}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-colors ${
                    options.pageType === value
                      ? 'bg-[#09364f] text-white border-[#09364f]'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Booking Rep (Book-a-Call pages only) — drives which Google
              Calendar link is embedded on the page. */}
          {options.pageType === 'workhuman' && (
          <div>
            <label className="block text-sm font-bold text-shortcut-blue mb-2">
              Booking Rep *
            </label>
            <select
              value={options.customization.bookingRep}
              onChange={(e) => handleFieldChange('customization.bookingRep', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal bg-white"
            >
              {BOOKING_REPS.map((rep) => (
                <option key={rep} value={rep}>{rep}</option>
              ))}
            </select>
            <p className="text-gray-500 text-sm mt-1">
              Whoever owns this page — their Google Calendar booking link is embedded so prospects book directly with them.
            </p>
          </div>
          )}

          {/* Info-only toggle (Book a Call pages) */}
          {options.pageType === 'workhuman' && (
          <div style={{ backgroundColor: '#F1F6F5', padding: '16px', borderRadius: '8px', border: '2px solid #E5E7EB' }}>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={options.customization.infoOnly}
                onChange={(e) => handleFieldChange('customization.infoOnly', e.target.checked)}
                style={{ marginRight: '12px', width: '20px', height: '20px' }}
              />
              <div>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#003756' }}>
                  Info only (no booking)
                </span>
                <p style={{ fontSize: '14px', fontWeight: '500', color: '#003756', marginTop: '4px' }}>
                  Hides the booking card and call CTAs. Shows a rotating service-video montage and a soft "learn more" link instead. Served at /info/...
                </p>
              </div>
            </label>
          </div>
          )}

          {/* Partner Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Partner Information</h3>
            
            <div>
              <label className="block text-sm font-bold text-shortcut-blue mb-2">
                Partner Name *
              </label>
              <input
                type="text"
                value={options.partnerName}
                onChange={(e) => handleFieldChange('partnerName', e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal ${
                  errors.partnerName ? 'border-red-500' : 'border-gray-200'
                }`}
                placeholder="e.g., Burberry, Microsoft, etc."
              />
              {errors.partnerName && (
                <p className="text-red-500 text-sm mt-1">{errors.partnerName}</p>
              )}
            </div>

            {/* Returning Client Checkbox (generic pages only) */}
            {options.pageType === 'generic' && (
            <div style={{ backgroundColor: '#F1F6F5', padding: '16px', borderRadius: '8px', border: '2px solid #E5E7EB' }}>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.isReturningClient}
                  onChange={(e) => handleFieldChange('isReturningClient', e.target.checked)}
                  style={{ marginRight: '12px', width: '20px', height: '20px' }}
                />
                <div>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#003756' }}>
                    This is for a returning client
                  </span>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#003756', marginTop: '4px' }}>
                    Shows personalized "Welcome back" messaging and simplified contact form
                  </p>
                </div>
              </label>
            </div>
            )}

            <div>
              <label className="block text-sm font-bold text-shortcut-blue mb-2">
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

            <div>
              <label className="block text-sm font-bold text-shortcut-blue mb-2">
                Client Email
              </label>
              <input
                type="email"
                value={options.clientEmail}
                onChange={(e) => handleFieldChange('clientEmail', e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal ${
                  errors.clientEmail ? 'border-red-500' : 'border-gray-200'
                }`}
                placeholder="client@company.com"
              />
              {errors.clientEmail && (
                <p className="text-red-500 text-sm mt-1">{errors.clientEmail}</p>
              )}
            </div>
          </div>

          {/* Contact Information (not shown on conference pages) */}
          {options.pageType !== 'conference' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-shortcut-blue mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  value={options.contactFirstName}
                  onChange={(e) => handleFieldChange('contactFirstName', e.target.value)}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal ${
                    errors.contactFirstName ? 'border-red-500' : 'border-gray-200'
                  }`}
                />
                {errors.contactFirstName && (
                  <p className="text-red-500 text-sm mt-1">{errors.contactFirstName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-shortcut-blue mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={options.contactLastName}
                  onChange={(e) => handleFieldChange('contactLastName', e.target.value)}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal ${
                    errors.contactLastName ? 'border-red-500' : 'border-gray-200'
                  }`}
                />
                {errors.contactLastName && (
                  <p className="text-red-500 text-sm mt-1">{errors.contactLastName}</p>
                )}
              </div>
            </div>
          </div>
          )}

          {/* Custom Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Message (Optional)
            </label>
            <textarea
              value={options.customMessage}
              onChange={(e) => handleFieldChange('customMessage', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
              placeholder="Any special message for this partner..."
            />
          </div>

          {/* Conference salesperson — owns the Book a call calendar on the page */}
          {options.pageType === 'conference' && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">Salesperson</h3>
            <p className="text-sm text-gray-500">Book a call opens this person's calendar, right on the page.</p>
            <select
              value={options.customization.bookingRep || 'Will Newton'}
              onChange={(e) => handleFieldChange('customization.bookingRep', e.target.value)}
              className="w-full max-w-xs px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
            >
              {Object.keys(SENDER_TO_CALENDAR).map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          )}

          {/* Conference section design variants */}
          {options.pageType === 'conference' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Section Designs</h3>
            {([
              { key: 'heroVariant', label: 'Hero', opts: [{ v: 'editorial', l: 'Editorial' }, { v: 'cover', l: 'Cover' }, { v: 'stage', l: 'Stage' }] },
              { key: 'servicesVariant', label: 'Services', opts: [{ v: 'grid', l: 'Grid' }, { v: 'rail', l: 'Showcase' }] },
              { key: 'packagesVariant', label: 'Packages', opts: [{ v: 'stations', l: 'Stations' }, { v: 'bundles', l: 'Bundles' }] },
              { key: 'goodToKnowVariant', label: 'Good to know', opts: [{ v: 'list', l: 'List' }, { v: 'cards', l: 'Cards' }] },
            ] as const).map(row => (
              <div key={row.key} className="flex items-center gap-3">
                <span className="w-28 text-sm font-bold text-shortcut-blue">{row.label}</span>
                <div className="flex gap-2">
                  {row.opts.map(opt => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => handleFieldChange(`customization.${row.key}`, opt.v)}
                      className={`rounded-full border-2 px-4 py-1.5 text-sm font-medium transition-colors ${
                        (options.customization as any)[row.key] === opt.v
                          ? 'border-[#09364f] bg-[#09364f] text-white'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          )}

          {/* Conference package options */}
          {options.pageType === 'conference' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Packages & Pricing</h3>

            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.customization.showPackages}
                  onChange={(e) => handleFieldChange('customization.showPackages', e.target.checked)}
                  className="mr-3"
                />
                <span className="text-sm text-gray-700">Show the packages section</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.customization.showPackagePricing}
                  onChange={(e) => handleFieldChange('customization.showPackagePricing', e.target.checked)}
                  disabled={!options.customization.showPackages}
                  className="mr-3"
                />
                <span className={`text-sm ${options.customization.showPackages ? 'text-gray-700' : 'text-gray-400'}`}>
                  Show package pricing ("Starting at" rows)
                </span>
              </label>
            </div>

            {options.customization.showPackages && (
              <div className="rounded-lg border-2 border-gray-200">
                <div className="grid grid-cols-[1fr_110px_1fr_56px] items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                  <span>Package</span>
                  <span>Price</span>
                  <span>Price unit</span>
                  <span className="text-center">Hide</span>
                </div>
                {(options.customization.packagesVariant === 'bundles' ? CONFERENCE_BUNDLES : CONFERENCE_PACKAGES).map((pkg) => {
                  const ov = options.customization.packageOverrides?.[pkg.id] || {};
                  const setOverride = (patch: Partial<ConferencePackageOverride>) => {
                    handleFieldChange('customization.packageOverrides', {
                      ...options.customization.packageOverrides,
                      [pkg.id]: { ...ov, ...patch }
                    });
                  };
                  return (
                    <div key={pkg.id} className={`grid grid-cols-[1fr_110px_1fr_56px] items-center gap-2 border-b border-gray-100 px-3 py-2 last:border-b-0 ${ov.hidden ? 'opacity-50' : ''}`}>
                      <span className="text-sm font-medium text-gray-800">{pkg.name}</span>
                      <input
                        type="text"
                        value={ov.price ?? ''}
                        placeholder={pkg.price}
                        onChange={(e) => setOverride({ price: e.target.value || undefined })}
                        className="rounded-md border border-gray-200 px-2 py-1.5 text-sm focus:border-shortcut-teal focus:outline-none"
                      />
                      <input
                        type="text"
                        value={ov.unit ?? ''}
                        placeholder={pkg.unit}
                        onChange={(e) => setOverride({ unit: e.target.value || undefined })}
                        className="rounded-md border border-gray-200 px-2 py-1.5 text-sm focus:border-shortcut-teal focus:outline-none"
                      />
                      <input
                        type="checkbox"
                        checked={!!ov.hidden}
                        onChange={(e) => setOverride({ hidden: e.target.checked || undefined })}
                        className="justify-self-center"
                      />
                    </div>
                  );
                })}
                <p className="px-3 py-2 text-xs text-gray-500">
                  Leave price and unit blank to use the defaults shown. Hide removes that package card from this client's page.
                </p>
              </div>
            )}
          </div>
          )}

          {/* Page Options (generic pages only — Workhuman and Conference have fixed sections) */}
          {options.pageType === 'generic' && (
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
          )}

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
              {loading ? (editingPage ? 'Updating...' : 'Creating...') : (editingPage ? 'Update Landing Page' : 'Create Landing Page')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GenericLandingPageCreator;
