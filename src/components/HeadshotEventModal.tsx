import React, { useState } from 'react';
import { X, Calendar, Users, Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from './Button';
import { HeadshotEvent } from '../types/headshot';
import { supabase } from '../lib/supabaseClient';

interface HeadshotEventModalProps {
  onClose: () => void;
  onSubmit: (eventData: Omit<HeadshotEvent, 'id' | 'created_at' | 'updated_at'>) => void;
  editingEvent?: HeadshotEvent | null;
}

export const HeadshotEventModal: React.FC<HeadshotEventModalProps> = ({
  onClose,
  onSubmit,
  editingEvent
}) => {
  const [formData, setFormData] = useState({
    event_name: editingEvent?.event_name || '',
    event_date: editingEvent?.event_date || '',
    total_employees: editingEvent?.total_employees || 0,
    status: editingEvent?.status || 'draft' as HeadshotEvent['status'],
    client_logo_url: editingEvent?.client_logo_url || '',
    selection_deadline: editingEvent?.selection_deadline ? 
      editingEvent.selection_deadline.slice(0, 10) : ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(editingEvent?.client_logo_url || null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.event_name.trim()) {
      newErrors.event_name = 'Event name is required';
    }

    if (!formData.event_date) {
      newErrors.event_date = 'Event date is required';
    }

    if (formData.total_employees < 0) {
      newErrors.total_employees = 'Total employees cannot be negative';
    }

    if (formData.selection_deadline) {
      const deadlineDate = new Date(formData.selection_deadline);
      const eventDate = new Date(formData.event_date);
      
      if (deadlineDate < eventDate) {
        newErrors.selection_deadline = 'Selection deadline must be after the event date';
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

    // Store the date exactly as selected (treat as local date)
    const eventData = {
      ...formData,
      event_date: formData.event_date,
      total_employees: formData.total_employees || 0,
      selection_deadline: formData.selection_deadline ? 
        `${formData.selection_deadline}T00:00:00` : undefined
    };

    onSubmit(eventData);
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    try {
      setUploadingLogo(true);
      
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `client-logos/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('headshot-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Error uploading logo:', error);
        alert('Failed to upload logo. Please try again.');
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('headshot-photos')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, client_logo_url: publicUrl }));
      setLogoPreview(publicUrl);
      
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Failed to upload logo. Please try again.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const removeLogo = () => {
    setFormData(prev => ({ ...prev, client_logo_url: '' }));
    setLogoPreview(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingEvent ? 'Edit Headshot Event' : 'Create Headshot Event'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Event Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Name *
            </label>
            <input
              type="text"
              value={formData.event_name}
              onChange={(e) => handleInputChange('event_name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-shortcut-blue focus:border-shortcut-blue ${
                errors.event_name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Q4 2024 Headshots"
            />
            {errors.event_name && (
              <p className="mt-1 text-sm text-red-600">{errors.event_name}</p>
            )}
          </div>

          {/* Event Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Date *
            </label>
            <div className="relative">
              <input
                type="date"
                value={formData.event_date}
                onChange={(e) => handleInputChange('event_date', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-shortcut-blue focus:border-shortcut-blue ${
                  errors.event_date ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <Calendar className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {errors.event_date && (
              <p className="mt-1 text-sm text-red-600">{errors.event_date}</p>
            )}
          </div>

          {/* Total Employees */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expected Number of Employees
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                value={formData.total_employees}
                onChange={(e) => handleInputChange('total_employees', parseInt(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-shortcut-blue focus:border-shortcut-blue ${
                  errors.total_employees ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0"
              />
              <Users className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {errors.total_employees && (
              <p className="mt-1 text-sm text-red-600">{errors.total_employees}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              This is just an estimate. You can import the actual employee list later.
            </p>
          </div>

          {/* Selection Deadline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photo Selection Deadline
            </label>
            <div className="relative">
              <input
                type="date"
                value={formData.selection_deadline}
                onChange={(e) => handleInputChange('selection_deadline', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-shortcut-blue focus:border-shortcut-blue ${
                  errors.selection_deadline ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <Calendar className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {errors.selection_deadline && (
              <p className="mt-1 text-sm text-red-600">{errors.selection_deadline}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Optional: Set a deadline date for employees to select their photos. Leave blank for no deadline.
            </p>
          </div>

          {/* Client Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client Logo (Optional)
            </label>
            
            {logoPreview || formData.client_logo_url ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                  <img 
                    src={logoPreview || formData.client_logo_url} 
                    alt="Client logo preview" 
                    className="h-12 w-auto object-contain"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Client logo uploaded</p>
                    <p className="text-xs text-gray-500">This will appear on gallery pages and emails</p>
                  </div>
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
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
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value as HeadshotEvent['status'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-shortcut-blue focus:border-shortcut-blue"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
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
              {editingEvent ? 'Update Event' : 'Create Event'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
