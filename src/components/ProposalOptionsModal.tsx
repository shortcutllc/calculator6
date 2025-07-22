import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface ProposalOptionsModalProps {
  onClose: () => void;
  onGenerate: (options: ProposalOptions) => void;
}

interface ProposalOptions {
  customization: {
    contactFirstName: string;
    contactLastName: string;
    customNote: string;
    includeSummary: boolean;
    includeCalculations: boolean;
    includeCalculator: boolean;
  };
  clientEmail: string;
  clientLogoUrl?: string;
  officeLocation?: string;
}

interface ValidationErrors {
  contactFirstName?: string;
  contactLastName?: string;
  clientEmail?: string;
}

const ProposalOptionsModal: React.FC<ProposalOptionsModalProps> = ({ onClose, onGenerate }) => {
  const [options, setOptions] = useState<ProposalOptions>({
    customization: {
      contactFirstName: '',
      contactLastName: '',
      customNote: '',
      includeSummary: true,
      includeCalculations: true,
      includeCalculator: true
    },
    clientEmail: '',
    clientLogoUrl: ''
  });
  
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  // Initialize Google Maps autocomplete
  useEffect(() => {
    const initializeGoogleMaps = () => {
      const input = document.getElementById('office-location-input') as HTMLInputElement;
      if (input && window.google && window.google.maps && window.google.maps.places) {
        try {
          // Initialize Places Autocomplete
          const autocomplete = new window.google.maps.places.Autocomplete(input, {
            types: ['address'],
            componentRestrictions: { country: 'us' }
          });

          // Handle place selection
          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place.formatted_address) {
              handleFieldChange('officeLocation', place.formatted_address);
            }
          });

          console.log('Google Maps Places Autocomplete initialized successfully');
        } catch (error) {
          console.error('Error initializing Google Maps Places Autocomplete:', error);
        }
      }
    };

    // Initialize Google Maps if not loaded
    if (!window.google || !window.google.maps) {
      if (window.initGoogleMaps) {
        window.initGoogleMaps();
      }
    }

    // Check for Google Maps availability and initialize
    const checkGoogleMaps = setInterval(() => {
      if (window.google && window.google.maps && window.google.maps.places) {
        initializeGoogleMaps();
        clearInterval(checkGoogleMaps);
      }
    }, 100);

    return () => {
      clearInterval(checkGoogleMaps);
    };
  }, []);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    
    if (!options.customization.contactFirstName) {
      newErrors.contactFirstName = 'First name is required';
    }

    if (!options.customization.contactLastName) {
      newErrors.contactLastName = 'Last name is required';
    }

    if (options.clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(options.clientEmail)) {
      newErrors.clientEmail = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const allTouched = ['contactFirstName', 'contactLastName'].reduce((acc, field) => ({
      ...acc,
      [field]: true
    }), {});
    setTouched(allTouched);

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      await onGenerate(options);
    } catch (error) {
      console.error('Error generating proposal:', error);
      alert('Failed to generate proposal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setOptions(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof ProposalOptions],
          [child]: value
        }
      }));
    } else {
      setOptions(prev => ({
        ...prev,
        [field]: value
      }));
    }

    if (errors[field as keyof ValidationErrors]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));
    validateForm();
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setLogoUploadError('Please upload an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLogoUploadError('Logo file must be less than 5MB');
      return;
    }
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLogoUploadError('You must be logged in to upload files. Please log in and try again.');
      return;
    }
    
    setLogoUploadError(null);
    setLogoUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('client-logos')
        .upload(fileName, file, { upsert: true });
      if (error) {
        console.error('Storage upload error:', error);
        if (error.message.includes('bucket')) {
          throw new Error('Storage bucket not found. Please contact support.');
        } else if (error.message.includes('policy')) {
          throw new Error('Upload permission denied. Please contact support.');
        } else {
          throw error;
        }
      }
      const { data: publicUrlData } = supabase.storage
        .from('client-logos')
        .getPublicUrl(fileName);
      setLogoUrl(publicUrlData.publicUrl);
      setLogoFile(file);
      // @ts-expect-error: prev is always ProposalOptions object
      setOptions((prev: ProposalOptions) => (prev && typeof prev === 'object' ? { ...prev, clientLogoUrl: publicUrlData.publicUrl } : { clientLogoUrl: publicUrlData.publicUrl, customization: { contactFirstName: '', contactLastName: '', customNote: '', includeSummary: true, includeCalculations: true, includeCalculator: true }, clientEmail: '' }));
    } catch (err: any) {
      console.error('Logo upload error:', err);
      setLogoUploadError(err.message || 'Failed to upload logo. Please try again.');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleLogoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoUrl(e.target.value);
    setLogoFile(null);
    setLogoUploadError(null);
    // @ts-expect-error: prev is always ProposalOptions object
    setOptions((prev: ProposalOptions) => (prev && typeof prev === 'object' ? { ...prev, clientLogoUrl: e.target.value } : { clientLogoUrl: e.target.value, customization: { contactFirstName: '', contactLastName: '', customNote: '', includeSummary: true, includeCalculations: true, includeCalculator: true }, clientEmail: '' }));
  };

  const getFieldError = (field: string): string | undefined => {
    return touched[field] ? errors[field as keyof ValidationErrors] : undefined;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-8 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-[#175071]">Generate Proposal</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input
                    type="text"
                    value={options.customization.contactFirstName}
                    onChange={(e) => handleFieldChange('customization.contactFirstName', e.target.value)}
                    onBlur={() => handleBlur('contactFirstName')}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#175071] ${
                      getFieldError('contactFirstName') ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={loading}
                  />
                  {getFieldError('contactFirstName') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('contactFirstName')}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    type="text"
                    value={options.customization.contactLastName}
                    onChange={(e) => handleFieldChange('customization.contactLastName', e.target.value)}
                    onBlur={() => handleBlur('contactLastName')}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#175071] ${
                      getFieldError('contactLastName') ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={loading}
                  />
                  {getFieldError('contactLastName') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('contactLastName')}</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Client Email (Optional)</label>
              <input
                type="email"
                value={options.clientEmail}
                onChange={(e) => handleFieldChange('clientEmail', e.target.value)}
                onBlur={() => handleBlur('clientEmail')}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#175071] ${
                  getFieldError('clientEmail') ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter client email to share proposal later"
                disabled={loading}
              />
              {getFieldError('clientEmail') && (
                <p className="mt-1 text-sm text-red-600">{getFieldError('clientEmail')}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Office Location (Optional)</label>
              <div className="relative">
                <input
                  type="text"
                  value={options.officeLocation || ''}
                  onChange={(e) => handleFieldChange('officeLocation', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#175071] pr-10"
                  placeholder="Search for office address..."
                  disabled={loading}
                  id="office-location-input"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('office-location-input') as HTMLInputElement;
                      if (input && 'geolocation' in navigator) {
                        navigator.geolocation.getCurrentPosition(
                          (position) => {
                            const { latitude, longitude } = position.coords;
                            const apiKey = window.__ENV__?.VITE_GOOGLE_MAPS_API_KEY;
                            
                            if (apiKey && apiKey !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
                              // Use reverse geocoding to get address
                              fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`)
                                .then(response => response.json())
                                .then(data => {
                                  if (data.status === 'OK' && data.results && data.results[0]) {
                                    handleFieldChange('officeLocation', data.results[0].formatted_address);
                                  } else {
                                    alert('Could not find address for your location. Please enter manually.');
                                  }
                                })
                                .catch(() => {
                                  alert('Error getting address. Please enter manually.');
                                });
                            } else {
                              alert('Google Maps API key not configured. Please enter the address manually.');
                            }
                          },
                          () => {
                            alert('Unable to get your location. Please enter the address manually.');
                          }
                        );
                      } else {
                        alert('Geolocation is not supported by your browser. Please enter the address manually.');
                      }
                    }}
                    className="text-gray-400 hover:text-gray-600"
                    title="Use current location"
                    disabled={loading}
                  >
                    📍
                  </button>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Enter the office address or click the location icon to use your current location
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Client Logo (Optional)</label>
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFileChange}
                  disabled={logoUploading || loading}
                />
                <span className="text-xs text-gray-500">Max 5MB. PNG, JPG, SVG, etc.</span>
                <input
                  type="url"
                  placeholder="Paste image URL (https://...)"
                  value={logoUrl}
                  onChange={handleLogoUrlChange}
                  className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#175071] border-gray-300"
                  disabled={logoUploading || loading}
                />
                {logoUrl && (
                  <img src={logoUrl} alt="Client Logo Preview" className="h-16 mt-2 rounded shadow border" />
                )}
                {logoUploadError && <p className="text-xs text-red-600">{logoUploadError}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Note from Shortcut</label>
              <textarea
                value={options.customization.customNote}
                onChange={(e) => handleFieldChange('customization.customNote', e.target.value)}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#175071]"
                placeholder="We are so excited to service your incredible staff! Our team is looking forward to providing an exceptional experience..."
                disabled={loading}
              />
            </div>
          </div>

          {Object.keys(errors).length > 0 && touched.contactFirstName && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">
                Please complete all required fields before generating your proposal
              </p>
            </div>
          )}

          <div className="mt-8 flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#175071] text-white rounded-md hover:bg-[#134660] disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || Object.keys(errors).length > 0}
            >
              {loading ? 'Generating...' : 'Generate Proposal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProposalOptionsModal;