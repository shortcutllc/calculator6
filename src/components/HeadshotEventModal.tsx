import React, { useState } from 'react';
import { Calendar, Users, Upload } from 'lucide-react';
import { Modal, Field, CoralButton, OutlineButton, SOFT, LINE, inputClass } from './headshot/brand';
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

  const fieldClass = (bad?: string) =>
    `${inputClass} ${bad ? 'border-[#FF5050]' : ''}`;

  const Err: React.FC<{ msg?: string }> = ({ msg }) =>
    msg ? <p className="mt-1.5 text-[13px] font-bold text-[#FF5050]">{msg}</p> : null;

  return (
    <Modal
      onClose={onClose}
      title={editingEvent ? 'Edit this event' : 'New headshot event'}
      sub={editingEvent ? undefined : 'You can import the roster once it exists.'}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Event name">
          <input
            type="text"
            value={formData.event_name}
            onChange={(e) => handleInputChange('event_name', e.target.value)}
            className={fieldClass(errors.event_name)}
            placeholder="DraftKings Raleigh"
          />
          <Err msg={errors.event_name} />
        </Field>

        <Field label="Event date">
          <div className="relative">
            <input
              type="date"
              value={formData.event_date}
              onChange={(e) => handleInputChange('event_date', e.target.value)}
              className={fieldClass(errors.event_date)}
            />
            <Calendar className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#45596A]" />
          </div>
          <Err msg={errors.event_date} />
        </Field>

        <Field
          label="How many people"
          hint="A rough number is fine. Import the real list later."
        >
          <div className="relative">
            <input
              type="number"
              min="0"
              value={formData.total_employees}
              onChange={(e) => handleInputChange('total_employees', parseInt(e.target.value) || 0)}
              className={fieldClass(errors.total_employees)}
              placeholder="0"
            />
            <Users className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#45596A]" />
          </div>
          <Err msg={errors.total_employees} />
        </Field>

        <Field
          label="Deadline to pick a photo"
          hint="Optional. Leave blank for no deadline."
        >
          <div className="relative">
            <input
              type="date"
              value={formData.selection_deadline}
              onChange={(e) => handleInputChange('selection_deadline', e.target.value)}
              className={fieldClass(errors.selection_deadline)}
            />
            <Calendar className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#45596A]" />
          </div>
          <Err msg={errors.selection_deadline} />
        </Field>

        <Field label="Client logo" hint="Optional. Shows on their gallery pages and emails.">
          {logoPreview || formData.client_logo_url ? (
            <div className={`flex items-center gap-3 rounded-[14px] border-2 ${LINE} p-3`}>
              <img
                src={logoPreview || formData.client_logo_url}
                alt="Client logo"
                className="h-11 w-auto max-w-[140px] object-contain"
              />
              <p className={`flex-1 text-[13.5px] ${SOFT}`}>Logo added</p>
              <button
                type="button"
                onClick={removeLogo}
                className={`text-[13.5px] font-bold ${SOFT} transition-colors hover:text-[#FF5050]`}
              >
                Remove
              </button>
            </div>
          ) : (
            <div className={`rounded-[14px] border-2 border-dashed ${LINE} p-6 text-center transition-colors hover:border-[#003756]`}>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploadingLogo}
                className="hidden"
                id="logo-upload"
              />
              <label htmlFor="logo-upload" className="flex cursor-pointer flex-col items-center gap-2">
                {uploadingLogo ? (
                  <>
                    <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-[#E2E9E8] border-t-[#FF5050]" />
                    <span className={`text-[13.5px] ${SOFT}`}>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-7 w-7 text-[#45596A]" />
                    <div>
                      <p className="text-[14.5px] font-bold text-[#003756]">Add a logo</p>
                      <p className={`text-[13px] ${SOFT}`}>PNG, JPG or SVG, up to 5MB</p>
                    </div>
                  </>
                )}
              </label>
            </div>
          )}
        </Field>

        <Field label="Status">
          <select
            value={formData.status}
            onChange={(e) => handleInputChange('status', e.target.value as HeadshotEvent['status'])}
            className={inputClass}
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </Field>

        <div className={`flex gap-3 border-t ${LINE} pt-5`}>
          <OutlineButton type="button" onClick={onClose} className="flex-1 justify-center">
            Cancel
          </OutlineButton>
          <CoralButton type="submit" className="flex-1 justify-center">
            {editingEvent ? 'Save changes' : 'Create event'}
          </CoralButton>
        </div>
      </form>
    </Modal>
  );
};
