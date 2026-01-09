import React, { useState, useEffect } from 'react';
import { X, Calendar, Users, Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from './Button';
import { MindfulnessProgram, Facilitator } from '../types/mindfulnessProgram';
import { MindfulnessProgramService } from '../services/MindfulnessProgramService';
import { supabase } from '../lib/supabaseClient';

interface MindfulnessProgramModalProps {
  onClose: () => void;
  onSubmit: (programData: Omit<MindfulnessProgram, 'id' | 'created_at' | 'updated_at' | 'total_participants'>) => void;
  editingProgram?: MindfulnessProgram | null;
}

export const MindfulnessProgramModal: React.FC<MindfulnessProgramModalProps> = ({
  onClose,
  onSubmit,
  editingProgram
}) => {

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [facilitators, setFacilitators] = useState<Facilitator[]>([]);
  const [loadingFacilitators, setLoadingFacilitators] = useState(true);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  // Clean up old logo URLs that point to wrong bucket
  const cleanLogoUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    // If URL contains old bucket path, return null to force re-upload
    if (url.includes('mindfulness-program-documents/client-logos')) {
      return null;
    }
    return url;
  };
  
  const initialLogoUrl = cleanLogoUrl(editingProgram?.client_logo_url);
  const [logoPreview, setLogoPreview] = useState<string | null>(initialLogoUrl);
  const [logoInputMethod, setLogoInputMethod] = useState<'upload' | 'url'>(initialLogoUrl ? 'url' : 'upload');
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl || '');
  
  // Update formData to use cleaned URL
  const [formData, setFormData] = useState({
    program_name: editingProgram?.program_name || '',
    facilitator_id: editingProgram?.facilitator_id || '',
    start_date: editingProgram?.start_date || '',
    end_date: editingProgram?.end_date || '',
    status: editingProgram?.status || 'draft' as MindfulnessProgram['status'],
    proposal_id: editingProgram?.proposal_id || '',
    client_logo_url: initialLogoUrl || ''
  });
  const [startDateTBD, setStartDateTBD] = useState(editingProgram?.start_date === 'TBD');
  const [endDateTBD, setEndDateTBD] = useState(editingProgram?.end_date === 'TBD');

  useEffect(() => {
    fetchFacilitators();
  }, []);

  const fetchFacilitators = async () => {
    try {
      setLoadingFacilitators(true);
      const data = await MindfulnessProgramService.getFacilitators();
      setFacilitators(data);
      
      // Auto-select Courtney if available and no facilitator selected
      if (!formData.facilitator_id && data.length > 0) {
        const courtney = data.find(f => f.name.includes('Courtney') || f.name.includes('Schulnick'));
        if (courtney) {
          setFormData(prev => ({ ...prev, facilitator_id: courtney.id }));
        }
      }
    } catch (error) {
      console.error('Error fetching facilitators:', error);
    } finally {
      setLoadingFacilitators(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.program_name.trim()) {
      newErrors.program_name = 'Program name is required';
    }

    if (!startDateTBD && !formData.start_date) {
      newErrors.start_date = 'Start date is required or select TBD';
    }

    if (!endDateTBD && !formData.end_date) {
      newErrors.end_date = 'End date is required or select TBD';
    }

    if (formData.start_date && formData.end_date && formData.start_date !== 'TBD' && formData.end_date !== 'TBD') {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      
      if (endDate < startDate) {
        newErrors.end_date = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // If user entered a URL but didn't click "Use This URL", use it anyway
    let finalLogoUrl = formData.client_logo_url;
    if (!finalLogoUrl && logoUrl.trim() && logoInputMethod === 'url') {
      // Validate the URL before using it
      try {
        new URL(logoUrl.trim());
        finalLogoUrl = logoUrl.trim();
      } catch {
        // Invalid URL, ignore it
      }
    }

    const programData = {
      ...formData,
      facilitator_id: formData.facilitator_id && formData.facilitator_id.trim() ? formData.facilitator_id : null,
      proposal_id: formData.proposal_id && formData.proposal_id.trim() ? formData.proposal_id : null,
      client_logo_url: finalLogoUrl && finalLogoUrl.trim() ? finalLogoUrl.trim() : null,
      start_date: startDateTBD ? 'TBD' : formData.start_date,
      end_date: endDateTBD ? 'TBD' : formData.end_date
    };

    console.log('🔍 MindfulnessProgramModal - Submitting program data:', {
      hasLogo: !!programData.client_logo_url,
      logoUrl: programData.client_logo_url,
      logoInputMethod,
      logoUrlState: logoUrl,
      formDataLogo: formData.client_logo_url,
      allData: programData
    });

    onSubmit(programData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Logo file must be less than 5MB');
      return;
    }
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('You must be logged in to upload files. Please log in and try again.');
      return;
    }
    
    setUploadingLogo(true);
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
      const publicUrl = publicUrlData.publicUrl;
      setFormData(prev => ({ ...prev, client_logo_url: publicUrl }));
      setLogoPreview(publicUrl);
    } catch (err: any) {
      console.error('Logo upload error:', err);
      alert(err.message || 'Failed to upload logo. Please try again.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const removeLogo = () => {
    setFormData(prev => ({ ...prev, client_logo_url: '' }));
    setLogoPreview(null);
    setLogoUrl('');
  };

  const handleLogoUrlSubmit = () => {
    if (!logoUrl.trim()) {
      alert('Please enter a valid image URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(logoUrl.trim());
    } catch {
      alert('Please enter a valid URL');
      return;
    }

    // Validate it's an image URL
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'];
    const trimmedUrl = logoUrl.trim();
    const isImageUrl = imageExtensions.some(ext => 
      trimmedUrl.toLowerCase().includes(ext) || 
      trimmedUrl.includes('image') ||
      trimmedUrl.includes('img')
    );

    if (!isImageUrl) {
      const confirm = window.confirm('This URL may not be an image. Continue anyway?');
      if (!confirm) return;
    }

    const finalUrl = trimmedUrl;
    setFormData(prev => ({ ...prev, client_logo_url: finalUrl }));
    setLogoPreview(finalUrl);
    console.log('✅ Logo URL set:', finalUrl);
  };

  const handleLogoUrlChange = (url: string) => {
    setLogoUrl(url);
    // Auto-update preview if URL looks valid
    if (url.trim() && url.startsWith('http')) {
      try {
        new URL(url);
        setLogoPreview(url.trim());
      } catch {
        // Invalid URL, don't update preview
      }
    } else {
      setLogoPreview(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4 overflow-y-auto">
      <div className="card-large max-w-md w-full max-h-[90vh] overflow-y-auto z-[200] relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="h2">
            {editingProgram ? 'Edit Mindfulness Program' : 'Create Mindfulness Program'}
          </h2>
          <button
            onClick={onClose}
            className="text-text-dark-60 hover:text-shortcut-blue transition-colors p-2 rounded-lg hover:bg-neutral-light-gray"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Program Name */}
          <div>
            <label className="block text-sm font-bold text-shortcut-blue mb-2">
              Program Name *
            </label>
            <input
              type="text"
              value={formData.program_name}
              onChange={(e) => handleInputChange('program_name', e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base ${
                errors.program_name ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder="e.g., Three-Month Mindfulness Program for Betterment"
            />
            {errors.program_name && (
              <p className="mt-2 text-sm text-red-600">{errors.program_name}</p>
            )}
          </div>

          {/* Facilitator */}
          <div>
            <label className="block text-sm font-bold text-shortcut-blue mb-2">
              Facilitator
            </label>
            {loadingFacilitators ? (
              <div className="text-sm text-gray-500">Loading facilitators...</div>
            ) : (
              <select
                value={formData.facilitator_id}
                onChange={(e) => handleInputChange('facilitator_id', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base"
              >
                <option value="">Select facilitator</option>
                {facilitators.map((facilitator) => (
                  <option key={facilitator.id} value={facilitator.id}>
                    {facilitator.name}
                  </option>
                ))}
              </select>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Default facilitator is Courtney Schulnick
            </p>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-bold text-shortcut-blue mb-2">
              Start Date *
            </label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="checkbox"
                  id="start-date-tbd"
                  checked={startDateTBD}
                  onChange={(e) => {
                    setStartDateTBD(e.target.checked);
                    if (e.target.checked) {
                      handleInputChange('start_date', '');
                    }
                  }}
                  className="w-4 h-4 text-shortcut-blue border-gray-300 rounded focus:ring-shortcut-teal"
                />
                <label htmlFor="start-date-tbd" className="text-sm text-gray-700">
                  Date TBD
                </label>
              </div>
            <div className="relative">
              <input
                type="date"
                value={formData.start_date}
                  onChange={(e) => {
                    handleInputChange('start_date', e.target.value);
                    if (e.target.value) setStartDateTBD(false);
                  }}
                  disabled={startDateTBD}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base ${
                  errors.start_date ? 'border-red-500' : 'border-gray-200'
                  } ${startDateTBD ? 'bg-neutral-light-gray text-text-dark-60 cursor-not-allowed' : ''}`}
              />
              <Calendar className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            {errors.start_date && (
              <p className="mt-2 text-sm text-red-600">{errors.start_date}</p>
            )}
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-bold text-shortcut-blue mb-2">
              End Date *
            </label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="checkbox"
                  id="end-date-tbd"
                  checked={endDateTBD}
                  onChange={(e) => {
                    setEndDateTBD(e.target.checked);
                    if (e.target.checked) {
                      handleInputChange('end_date', '');
                    }
                  }}
                  className="w-4 h-4 text-shortcut-blue border-gray-300 rounded focus:ring-shortcut-teal"
                />
                <label htmlFor="end-date-tbd" className="text-sm text-gray-700">
                  Date TBD
                </label>
              </div>
            <div className="relative">
              <input
                type="date"
                value={formData.end_date}
                  onChange={(e) => {
                    handleInputChange('end_date', e.target.value);
                    if (e.target.value) setEndDateTBD(false);
                  }}
                  disabled={endDateTBD}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base ${
                  errors.end_date ? 'border-red-500' : 'border-gray-200'
                  } ${endDateTBD ? 'bg-neutral-light-gray text-text-dark-60 cursor-not-allowed' : ''}`}
              />
              <Calendar className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            {errors.end_date && (
              <p className="mt-2 text-sm text-red-600">{errors.end_date}</p>
            )}
          </div>

          {/* Client Logo Upload */}
          <div>
            <label className="block text-sm font-bold text-shortcut-blue mb-2">
              Client Logo (Optional)
            </label>
            
            {logoPreview || formData.client_logo_url ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 border-2 border-gray-200 rounded-lg">
                  <img 
                    src={logoPreview || formData.client_logo_url} 
                    alt="Client logo preview" 
                    className="h-12 w-auto object-contain max-w-[200px]"
                    onError={(e) => {
                      const failedUrl = logoPreview || formData.client_logo_url;
                      console.error('Logo failed to load:', failedUrl);
                      // If it's an old URL, clear it
                      if (failedUrl && failedUrl.includes('mindfulness-program-documents/client-logos')) {
                        setFormData(prev => ({ ...prev, client_logo_url: '' }));
                        setLogoPreview(null);
                        setLogoUrl('');
                        alert('The previous logo URL is invalid. Please upload a new logo.');
                      }
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Client logo {logoInputMethod === 'url' ? 'URL' : 'uploaded'}</p>
                    <p className="text-xs text-gray-500">This will appear on program pages and proposals</p>
                  </div>
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Toggle between upload and URL */}
                <div className="flex space-x-2 border-b border-gray-200">
                  <button
                    type="button"
                    onClick={() => setLogoInputMethod('upload')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      logoInputMethod === 'upload'
                        ? 'text-shortcut-blue border-b-2 border-shortcut-blue'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogoInputMethod('url')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      logoInputMethod === 'url'
                        ? 'text-shortcut-blue border-b-2 border-shortcut-blue'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Paste URL
                  </button>
                </div>

                {logoInputMethod === 'upload' ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="cursor-pointer flex flex-col items-center space-y-2"
                    >
                      {uploadingLogo ? (
                        <>
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                          <span className="text-sm text-gray-600">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Upload Client Logo</p>
                            <p className="text-xs text-gray-500">PNG, JPG, or SVG up to 5MB</p>
                          </div>
                        </>
                      )}
                    </label>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <input
                        type="url"
                        value={logoUrl}
                        onChange={(e) => handleLogoUrlChange(e.target.value)}
                        placeholder="https://example.com/logo.png"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Enter the full URL of the image (must be publicly accessible)
                      </p>
                    </div>
                    {logoUrl.trim() && (
                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          onClick={handleLogoUrlSubmit}
                          variant="primary"
                          size="sm"
                          className="flex items-center space-x-2"
                        >
                          <ImageIcon className="w-4 h-4" />
                          <span>Use This URL</span>
                        </Button>
                        {logoPreview && (
                          <div className="flex-1 text-xs text-gray-500">
                            Preview available
                          </div>
                        )}
                      </div>
                    )}
                    {logoPreview && logoUrl.trim() && (
                      <div className="mt-3 p-3 border-2 border-gray-200 rounded-lg bg-gray-50">
                        <p className="text-xs font-bold text-shortcut-blue mb-2">Preview:</p>
                        <img 
                          src={logoPreview} 
                          alt="Logo preview" 
                          className="max-h-20 w-auto object-contain mx-auto"
                          onError={(e) => {
                            console.error('Preview failed to load:', logoPreview);
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-bold text-shortcut-blue mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value as MindfulnessProgram['status'])}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
            >
              {editingProgram ? 'Update Program' : 'Create Program'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

