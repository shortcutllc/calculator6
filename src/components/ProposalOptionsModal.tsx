import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Button } from './Button';

interface ProposalOptionsModalProps {
  onClose: () => void;
  onGenerate: (options: ProposalOptions) => void;
  locations?: string[];
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
  officeLocation?: string; // Legacy support
  officeLocations?: { [location: string]: string }; // New: multiple office locations
  isTest?: boolean; // Test proposal flag
}

interface ValidationErrors {
  contactFirstName?: string;
  contactLastName?: string;
  clientEmail?: string;
}

const ProposalOptionsModal: React.FC<ProposalOptionsModalProps> = ({ onClose, onGenerate, locations = [] }) => {
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
    clientLogoUrl: '',
    officeLocations: {},
    isTest: false
  });
  
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  const handleOfficeLocationChange = (location: string, address: string) => {
    setOptions(prev => ({
      ...prev,
      officeLocations: {
        ...prev.officeLocations,
        [location]: address
      }
    }));
  };

  // Initialize Google Maps autocomplete for all office location inputs
  useEffect(() => {
    const initializeGoogleMaps = () => {
      locations.forEach((location, index) => {
        const inputId = `office-location-input-${index}`;
        const input = document.getElementById(inputId) as HTMLInputElement;
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
                handleOfficeLocationChange(location, place.formatted_address);
            }
          });

            console.log(`Google Maps Places Autocomplete initialized for ${location}`);
        } catch (error) {
            console.error(`Error initializing Google Maps Places Autocomplete for ${location}:`, error);
          }
        }
      });
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
  }, [locations]);

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4">
      <div className="card-large max-w-2xl w-full max-h-[90vh] overflow-y-auto z-[200] relative">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-[32px] md:text-[40px] font-extrabold text-shortcut-blue leading-tight" style={{ fontWeight: 800 }}>Generate Proposal</h2>
          <button
            onClick={onClose}
            className="text-text-dark-60 hover:text-shortcut-blue transition-colors rounded-lg p-2 hover:bg-neutral-light-gray"
            disabled={loading}
          >
            <X size={28} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Contact Information Section */}
            <div className="card-small bg-gradient-to-br from-shortcut-teal/5 to-shortcut-teal/10 border-2 border-shortcut-teal/20">
              <h3 className="text-xl md:text-2xl font-bold text-shortcut-blue mb-6" style={{ fontWeight: 700 }}>Contact Information</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-shortcut-blue mb-2" style={{ fontWeight: 700 }}>First Name</label>
                  <input
                    type="text"
                    value={options.customization.contactFirstName}
                    onChange={(e) => handleFieldChange('customization.contactFirstName', e.target.value)}
                    onBlur={() => handleBlur('contactFirstName')}
                    className={`block w-full px-4 py-3 border-2 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all ${
                      getFieldError('contactFirstName') ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white'
                    }`}
                    disabled={loading}
                  />
                  {getFieldError('contactFirstName') && (
                    <p className="mt-2 text-sm text-red-600 font-medium">{getFieldError('contactFirstName')}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-shortcut-blue mb-2" style={{ fontWeight: 700 }}>Last Name</label>
                  <input
                    type="text"
                    value={options.customization.contactLastName}
                    onChange={(e) => handleFieldChange('customization.contactLastName', e.target.value)}
                    onBlur={() => handleBlur('contactLastName')}
                    className={`block w-full px-4 py-3 border-2 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all ${
                      getFieldError('contactLastName') ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white'
                    }`}
                    disabled={loading}
                  />
                  {getFieldError('contactLastName') && (
                    <p className="mt-2 text-sm text-red-600 font-medium">{getFieldError('contactLastName')}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Client Email Section */}
            <div className="card-small bg-white border-2 border-gray-200">
              <label className="block text-sm font-bold text-shortcut-blue mb-2" style={{ fontWeight: 700 }}>Client Email (Optional)</label>
              <input
                type="email"
                value={options.clientEmail}
                onChange={(e) => handleFieldChange('clientEmail', e.target.value)}
                onBlur={() => handleBlur('clientEmail')}
                className={`block w-full px-4 py-3 border-2 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all ${
                  getFieldError('clientEmail') ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white'
                }`}
                placeholder="Enter client email to share proposal later"
                disabled={loading}
              />
              {getFieldError('clientEmail') && (
                <p className="mt-2 text-sm text-red-600 font-medium">{getFieldError('clientEmail')}</p>
              )}
            </div>

            {/* Office Locations - Show one input per location if multiple locations exist */}
            {locations.length > 1 ? (
              <div className="card-small bg-white border-2 border-gray-200">
                <h3 className="text-xl md:text-2xl font-bold text-shortcut-blue mb-6" style={{ fontWeight: 700 }}>Office Locations (Optional)</h3>
                <div className="space-y-6">
                  {locations.map((location, index) => (
                    <div key={location}>
                      <label className="block text-sm font-bold text-shortcut-blue mb-2">
                        Office Address for {location}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={options.officeLocations?.[location] || ''}
                          onChange={(e) => handleOfficeLocationChange(location, e.target.value)}
                          className="block w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal pr-12"
                          placeholder={`Search for office address for ${location}...`}
                          disabled={loading}
                          id={`office-location-input-${index}`}
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                          <button
                            type="button"
                            onClick={() => {
                              const inputId = `office-location-input-${index}`;
                              const input = document.getElementById(inputId) as HTMLInputElement;
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
                                            handleOfficeLocationChange(location, data.results[0].formatted_address);
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
                            className="text-text-dark-60 hover:text-shortcut-blue transition-colors p-1.5 rounded-lg hover:bg-neutral-light-gray"
                            title="Use current location"
                            disabled={loading}
                          >
                            📍
                          </button>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-text-dark-60">
                        Enter the office address for {location} or click the location icon to use your current location
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
            <div>
                <label className="block text-sm font-bold text-shortcut-blue mb-2">Office Location (Optional)</label>
              <div className="relative">
                <input
                  type="text"
                    value={options.officeLocation || options.officeLocations?.[locations[0] || ''] || ''}
                    onChange={(e) => {
                      if (locations.length === 1) {
                        handleOfficeLocationChange(locations[0], e.target.value);
                      } else {
                        handleFieldChange('officeLocation', e.target.value);
                      }
                    }}
                    className="block w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal pr-12"
                  placeholder="Search for office address..."
                  disabled={loading}
                    id="office-location-input-0"
                />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                  <button
                    type="button"
                    onClick={() => {
                        const input = document.getElementById('office-location-input-0') as HTMLInputElement;
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
                                      if (locations.length === 1) {
                                        handleOfficeLocationChange(locations[0], data.results[0].formatted_address);
                                      } else {
                                    handleFieldChange('officeLocation', data.results[0].formatted_address);
                                      }
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
                      className="text-text-dark-60 hover:text-shortcut-blue transition-colors p-1.5 rounded-lg hover:bg-neutral-light-gray"
                    title="Use current location"
                    disabled={loading}
                  >
                    📍
                  </button>
                </div>
              </div>
                <p className="mt-2 text-xs text-text-dark-60">
                Enter the office address or click the location icon to use your current location
              </p>
            </div>
            )}

            <div>
              <label className="block text-sm font-bold text-shortcut-blue mb-2">Client Logo (Optional)</label>
              <div className="space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFileChange}
                  disabled={logoUploading || loading}
                  className="block w-full text-sm text-text-dark-60 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-shortcut-teal file:text-shortcut-navy-blue hover:file:bg-shortcut-teal hover:file:bg-opacity-80"
                />
                <span className="text-xs text-text-dark-60 block">Max 5MB. PNG, JPG, SVG, etc.</span>
                <input
                  type="url"
                  placeholder="Paste image URL (https://...)"
                  value={logoUrl}
                  onChange={handleLogoUrlChange}
                  className="block w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
                  disabled={logoUploading || loading}
                />
                {logoUrl && (
                  <div className="mt-3">
                    <img src={logoUrl} alt="Client Logo Preview" className="h-20 rounded-lg shadow border border-gray-200" />
                  </div>
                )}
                {logoUploadError && <p className="text-sm text-red-600 mt-2">{logoUploadError}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-shortcut-blue mb-2">Note from Shortcut</label>
              <textarea
                value={options.customization.customNote}
                onChange={(e) => handleFieldChange('customization.customNote', e.target.value)}
                rows={4}
                className="block w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal resize-y"
                placeholder="We are so excited to service your incredible staff! Our team is looking forward to providing an exceptional experience..."
                disabled={loading}
              />
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.isTest || false}
                  onChange={(e) => setOptions(prev => ({ ...prev, isTest: e.target.checked }))}
                  className="w-5 h-5 border-2 border-gray-200 rounded focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-shortcut-teal"
                  disabled={loading}
                />
                <span className="text-sm font-bold text-shortcut-blue">
                  Mark as Test Proposal
                </span>
              </label>
              <p className="mt-2 text-xs text-text-dark-60 ml-8">
                Test proposals can be filtered separately on the History page
              </p>
            </div>
          </div>

          {Object.keys(errors).length > 0 && touched.contactFirstName && (
            <div className="mt-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-600">
                Please complete all required fields before generating your proposal
              </p>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end gap-4">
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              disabled={loading || Object.keys(errors).length > 0}
            >
              {loading ? 'Generating...' : 'Generate Proposal'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProposalOptionsModal;