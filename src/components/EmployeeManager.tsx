import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, X, Save, User, Mail, Phone, Camera, Link, CheckCircle, Search, Send, MessageSquare, Download, MessageCircle } from 'lucide-react';
import { Card, CoralButton, OutlineButton, StatusPill, Field, SOFT, inputClass } from './headshot/brand';
import { HeadshotService } from '../services/HeadshotService';
import { NotificationService } from '../services/NotificationService';
import { SMSService } from '../services/SMSService';
import { EmployeeGallery } from '../types/headshot';
import { supabase } from '../lib/supabaseClient';
import { CustomUrlHelper } from '../utils/customUrlHelper';

interface EmployeeManagerProps {
  eventId: string;
  /** Bump to force a reload after employees are added outside this component (e.g. CSV import). */
  refreshKey?: number;
  onEmployeeUpdate: () => void;
  onUploadPhotos: (employeeId: string, employeeName: string) => void;
  onUploadFinal: (employeeId: string, employeeName: string) => void;
}

interface EmployeeFormData {
  name: string;
  email: string;
  phone: string;
}

export const EmployeeManager: React.FC<EmployeeManagerProps> = ({
  eventId,
  refreshKey,
  onEmployeeUpdate,
  onUploadPhotos,
  onUploadFinal
}) => {
  const [employees, setEmployees] = useState<EmployeeGallery[]>([]);
  const [eventName, setEventName] = useState<string>('Headshot Event');
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeGallery | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>({
    name: '',
    email: '',
    phone: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [copiedLinks, setCopiedLinks] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'no_photos' | 'photos_uploaded' | 'photo_selected' | 'final_ready' | 'has_notes'>('all');
  const [sendingEmails, setSendingEmails] = useState<Set<string>>(new Set());
  const [sendingSMS, setSendingSMS] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchEventName();
    fetchEmployees();
  }, [eventId, refreshKey]);

  const fetchEventName = async () => {
    try {
      const { data: event, error } = await supabase
        .from('headshot_events')
        .select('event_name')
        .eq('id', eventId)
        .single();

      if (!error && event) {
        setEventName(event.event_name);
      }
    } catch (err) {
      console.error('Error fetching event name:', err);
      // Keep default 'Headshot Event' if fetch fails
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const data = await HeadshotService.getGalleriesByEvent(eventId);
      setEmployees(data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };


  const copyGalleryLink = async (employee: EmployeeGallery) => {
    try {
      const customUrl = await CustomUrlHelper.getEmployeeGalleryUrl(employee.id, employee.unique_token);
      await navigator.clipboard.writeText(customUrl);
      setCopiedLinks(prev => new Set(prev).add(employee.id));
      setTimeout(() => {
        setCopiedLinks(prev => {
          const newSet = new Set(prev);
          newSet.delete(employee.id);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      // Fallback to original URL
      const galleryUrl = `${window.location.origin}/gallery/${employee.unique_token}`;
      try {
        await navigator.clipboard.writeText(galleryUrl);
        setCopiedLinks(prev => new Set(prev).add(employee.id));
        setTimeout(() => {
          setCopiedLinks(prev => {
            const newSet = new Set(prev);
            newSet.delete(employee.id);
            return newSet;
          });
        }, 2000);
      } catch (fallbackError) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = galleryUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    }
  };

  const handleSendGalleryReadyEmail = async (employee: EmployeeGallery) => {
    if (!employee.photos || employee.photos.length === 0) {
      alert('This employee has no photos uploaded yet. Please upload photos first.');
      return;
    }

    const confirmed = window.confirm(
      `Send gallery ready notification to ${employee.employee_name} (${employee.email})?`
    );
    
    if (!confirmed) return;

    try {
      setSendingEmails(prev => new Set(prev).add(employee.id));
      
      const galleryUrl = await CustomUrlHelper.getEmployeeGalleryUrl(employee.id, employee.unique_token);
      
      await NotificationService.sendGalleryReadyNotification(
        employee.employee_name,
        employee.email,
        galleryUrl,
        eventName,
        employee.id
      );
      
      alert(`Gallery ready notification sent to ${employee.employee_name}!`);
    } catch (error) {
      console.error('Error sending notification:', error);
      alert(`Failed to send notification to ${employee.employee_name}. Please try again.`);
    } finally {
      setSendingEmails(prev => {
        const newSet = new Set(prev);
        newSet.delete(employee.id);
        return newSet;
      });
    }
  };

  const handleSendFinalPhotoEmail = async (employee: EmployeeGallery) => {
    const hasFinalPhoto = employee.photos?.some(p => p.is_final);
    if (!hasFinalPhoto) {
      alert('This employee does not have a final photo uploaded yet.');
      return;
    }

    const confirmed = window.confirm(
      `Send final photo ready notification to ${employee.employee_name} (${employee.email})?`
    );
    
    if (!confirmed) return;

    try {
      setSendingEmails(prev => new Set(prev).add(employee.id));
      
      await NotificationService.sendFinalPhotoNotification(employee.id);
      
      alert(`Final photo notification sent to ${employee.employee_name}!`);
    } catch (error) {
      console.error('Error sending notification:', error);
      alert(`Failed to send notification to ${employee.employee_name}. Please try again.`);
    } finally {
      setSendingEmails(prev => {
        const newSet = new Set(prev);
        newSet.delete(employee.id);
        return newSet;
      });
    }
  };

  const handleDownloadSelectedPhoto = async (employee: EmployeeGallery) => {
    if (!employee.selected_photo_id) {
      alert('No photo selected by this employee yet.');
      return;
    }

    try {
      const selectedPhoto = employee.photos?.find(p => p.id === employee.selected_photo_id);
      if (!selectedPhoto) {
        alert('Could not find the selected photo.');
        return;
      }

      // Fetch the image and download it
      const response = await fetch(selectedPhoto.photo_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${employee.employee_name.replace(/\s+/g, '_')}_selected_photo.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading photo:', error);
      alert('Failed to download photo. Please try again.');
    }
  };

  const handleSendSMSReminder = async (employee: EmployeeGallery) => {
    if (!employee.phone) {
      alert('This employee does not have a phone number on file.');
      return;
    }

    const hasPhotos = employee.photos && employee.photos.length > 0;
    const hasSelection = employee.selected_photo_id;

    if (!hasPhotos) {
      alert('This employee does not have photos uploaded yet. Upload photos before sending a reminder.');
      return;
    }

    if (hasSelection) {
      const proceed = window.confirm(
        `${employee.employee_name} has already made a selection. Send reminder anyway?`
      );
      if (!proceed) return;
    }

    const confirmed = window.confirm(
      `Send SMS reminder to ${employee.employee_name} at ${employee.phone}?`
    );
    
    if (!confirmed) return;

    try {
      setSendingSMS(prev => new Set(prev).add(employee.id));
      
      // Get custom URL for the gallery
      const customUrl = await CustomUrlHelper.getCustomUrl(employee.unique_token, 'employee_gallery');
      const galleryUrl = customUrl 
        ? `${window.location.origin}/${customUrl}`
        : `${window.location.origin}/gallery/${employee.unique_token}`;

      // Get event details for deadline
      const { data: event } = await supabase
        .from('headshot_events')
        .select('selection_deadline')
        .eq('id', eventId)
        .single();

      await SMSService.sendGalleryReminderSMS(
        employee.phone,
        employee.employee_name,
        galleryUrl,
        eventName,
        event?.selection_deadline
      );
      
      alert(`SMS reminder sent to ${employee.employee_name}!`);
    } catch (error) {
      console.error('Error sending SMS:', error);
      alert(`Failed to send SMS to ${employee.employee_name}. Please check the phone number and try again.`);
    } finally {
      setSendingSMS(prev => {
        const newSet = new Set(prev);
        newSet.delete(employee.id);
        return newSet;
      });
    }
  };

  // Filter and search employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        employee.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (employee.phone && employee.phone.includes(searchTerm));

      // Status filter
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        const hasPhotos = employee.photos && employee.photos.length > 0;
        const hasSelection = employee.selected_photo_id;
        const hasFinal = employee.photos?.some(p => p.is_final);

        switch (statusFilter) {
          case 'no_photos':
            matchesStatus = !hasPhotos;
            break;
          case 'photos_uploaded':
            matchesStatus = hasPhotos && !hasSelection;
            break;
          case 'photo_selected':
            matchesStatus = hasSelection && !hasFinal;
            break;
          case 'final_ready':
            matchesStatus = hasFinal;
            break;
          case 'has_notes':
            matchesStatus = employee.notes && employee.notes.trim().length > 0;
            break;
        }
      }

      return matchesSearch && matchesStatus;
    });
  }, [employees, searchTerm, statusFilter]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    if (formData.phone && formData.phone.trim()) {
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      if (!phoneRegex.test(formData.phone)) {
        newErrors.phone = 'Please enter a valid phone number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddEmployee = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      await HeadshotService.createEmployeeGalleries(eventId, [{
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined
      }]);
      
      setFormData({ name: '', email: '', phone: '' });
      setShowAddForm(false);
      setErrors({});
      await fetchEmployees();
      onEmployeeUpdate();
    } catch (error) {
      console.error('Error adding employee:', error);
      alert('Failed to add employee. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditEmployee = async () => {
    if (!editingEmployee || !validateForm()) return;

    try {
      setSaving(true);
      await HeadshotService.updateEmployeeGallery(editingEmployee.id, {
        employee_name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined
      });
      
      setEditingEmployee(null);
      setFormData({ name: '', email: '', phone: '' });
      setErrors({});
      await fetchEmployees();
      onEmployeeUpdate();
    } catch (error) {
      console.error('Error updating employee:', error);
      alert('Failed to update employee. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEmployee = async (employeeId: string, employeeName: string) => {
    if (!confirm(`Are you sure you want to delete ${employeeName}? This will also delete all their photos.`)) {
      return;
    }

    try {
      await HeadshotService.deleteEmployeeGallery(employeeId);
      await fetchEmployees();
      onEmployeeUpdate();
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Failed to delete employee. Please try again.');
    }
  };

  const startEdit = (employee: EmployeeGallery) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.employee_name,
      email: employee.email,
      phone: employee.phone || ''
    });
    setErrors({});
  };

  const cancelEdit = () => {
    setEditingEmployee(null);
    setFormData({ name: '', email: '', phone: '' });
    setErrors({});
  };

  const cancelAdd = () => {
    setShowAddForm(false);
    setFormData({ name: '', email: '', phone: '' });
    setErrors({});
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#E2E9E8] border-t-[#FF5050]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[16px] font-extrabold text-[#003756]">
          People ({filteredEmployees.length} of {employees.length})
        </h3>
        <OutlineButton onClick={() => setShowAddForm(true)} className="px-5 py-2.5 text-[13.5px]">
          <Plus className="h-4 w-4" />
          Add person
        </OutlineButton>
      </div>

      {/* Search and filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#45596A]" />
          <input
            type="text"
            placeholder="Search by name, email or phone"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${inputClass} pl-11`}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className={`${inputClass} sm:w-60`}
        >
          <option value="all">Everyone</option>
          <option value="no_photos">Needs photos</option>
          <option value="photos_uploaded">Waiting on them</option>
          <option value="photo_selected">Picked a photo</option>
          <option value="final_ready">Final delivered</option>
          <option value="has_notes">Has notes</option>
        </select>
      </div>

      {/* Add or edit, one form for both */}
      {(showAddForm || editingEmployee) && (
        <Card tone="mist" className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-[15px] font-extrabold text-[#003756]">
              {editingEmployee ? 'Edit their details' : 'Add someone'}
            </h4>
            <button
              onClick={editingEmployee ? cancelEdit : cancelAdd}
              className={`${SOFT} transition-colors hover:text-[#003756]`}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {([
              { key: 'name', label: 'Name', type: 'text', placeholder: 'Jane Smith' },
              { key: 'email', label: 'Email', type: 'email', placeholder: 'jane@company.com' },
              { key: 'phone', label: 'Phone', type: 'tel', placeholder: 'For text reminders' },
            ] as const).map(f => (
              <Field key={f.key} label={f.label}>
                <input
                  type={f.type}
                  value={formData[f.key]}
                  onChange={(e) => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className={`${inputClass} ${errors[f.key] ? 'border-[#FF5050]' : ''}`}
                  placeholder={f.placeholder}
                />
                {errors[f.key] && (
                  <p className="mt-1.5 text-[13px] font-bold text-[#FF5050]">{errors[f.key]}</p>
                )}
              </Field>
            ))}
          </div>

          <div className="mt-5 flex gap-3">
            <CoralButton
              onClick={editingEmployee ? handleEditEmployee : handleAddEmployee}
              disabled={saving}
              className="px-5 py-2.5 text-[13.5px]"
            >
              {saving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? 'Saving...' : editingEmployee ? 'Save changes' : 'Add person'}
            </CoralButton>
            <OutlineButton
              onClick={editingEmployee ? cancelEdit : cancelAdd}
              className="px-5 py-2.5 text-[13.5px]"
            >
              Cancel
            </OutlineButton>
          </div>
        </Card>
      )}

      {/* People */}
      <div className="space-y-3">
        {employees.length === 0 ? (
          <Card tone="mist" className="px-6 py-12 text-center">
            <User className="mx-auto mb-3 h-9 w-9 text-[#45596A]" />
            <p className="text-[15px] font-bold text-[#003756]">Nobody here yet</p>
            <p className={`mt-1.5 text-[14px] ${SOFT}`}>Import a CSV, or add someone by hand.</p>
          </Card>
        ) : filteredEmployees.length === 0 ? (
          <Card tone="mist" className="px-6 py-12 text-center">
            <Search className="mx-auto mb-3 h-9 w-9 text-[#45596A]" />
            <p className="text-[15px] font-bold text-[#003756]">Nobody matches that</p>
            <p className={`mt-1.5 text-[14px] ${SOFT}`}>Try a different search, or clear the filter.</p>
          </Card>
        ) : (
          filteredEmployees.map((employee) => {
            const isLinkCopied = copiedLinks.has(employee.id);
            const hasPhotos = !!employee.photos && employee.photos.length > 0;
            const hasFinal = !!employee.photos?.some(p => p.is_final);
            const busy = sendingEmails.has(employee.id);

            return (
              <Card key={employee.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <h4 className="text-[15.5px] font-bold text-[#003756]">{employee.employee_name}</h4>
                      <StatusPill tone={hasFinal ? 'navy' : hasPhotos ? 'cyan' : 'mist'}>
                        {hasFinal
                          ? 'Final delivered'
                          : employee.selected_photo_id
                          ? 'Picked a photo'
                          : hasPhotos
                          ? 'Waiting on them'
                          : 'Needs photos'}
                      </StatusPill>
                    </div>

                    <div className={`mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px] ${SOFT}`}>
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" />
                        {employee.email}
                      </span>
                      {employee.phone && (
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" />
                          {employee.phone}
                        </span>
                      )}
                      {hasPhotos && (
                        <span>
                          {employee.photos!.length} photo{employee.photos!.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      {employee.notes && employee.notes.trim().length > 0 && (
                        <span className="flex items-center gap-1.5 font-bold text-[#003756]">
                          <MessageSquare className="h-3.5 w-3.5" />
                          Has notes
                        </span>
                      )}
                    </div>

                    {/* One primary action, then quiet secondaries */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      {(!hasPhotos || !employee.selected_photo_id) && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onUploadPhotos(employee.id, employee.employee_name);
                          }}
                          className="inline-flex items-center gap-2 rounded-full bg-[#FF5050] px-4 py-2 text-[13px] font-bold text-white shadow-[0_4px_14px_rgba(255,80,80,.3)] transition-transform hover:scale-[1.03]"
                        >
                          <Camera className="h-3.5 w-3.5" />
                          {hasPhotos ? 'Add more' : 'Upload photos'}
                        </button>
                      )}

                      {employee.selected_photo_id && !hasFinal && (
                        <button
                          onClick={() => onUploadFinal(employee.id, employee.employee_name)}
                          className="inline-flex items-center gap-2 rounded-full bg-[#FF5050] px-4 py-2 text-[13px] font-bold text-white shadow-[0_4px_14px_rgba(255,80,80,.3)] transition-transform hover:scale-[1.03]"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Upload final
                        </button>
                      )}

                      <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] font-medium ${SOFT}`}>
                        {employee.selected_photo_id && (
                          <button
                            onClick={() => handleDownloadSelectedPhoto(employee)}
                            className="flex items-center gap-1.5 hover:text-[#003756]"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download their pick
                          </button>
                        )}

                        <button
                          onClick={() => copyGalleryLink(employee)}
                          className={`flex items-center gap-1.5 ${isLinkCopied ? 'font-bold text-[#003756]' : 'hover:text-[#003756]'}`}
                        >
                          {isLinkCopied ? <CheckCircle className="h-3.5 w-3.5" /> : <Link className="h-3.5 w-3.5" />}
                          {isLinkCopied ? 'Copied' : 'Copy link'}
                        </button>

                        {hasPhotos && !hasFinal && (
                          <button
                            onClick={() => handleSendGalleryReadyEmail(employee)}
                            disabled={busy}
                            className="flex items-center gap-1.5 hover:text-[#003756] disabled:opacity-50"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            {busy ? 'Sending' : 'Email them the link'}
                          </button>
                        )}

                        {hasPhotos && !hasFinal && employee.phone && !employee.selected_photo_id && (
                          <button
                            onClick={() => handleSendSMSReminder(employee)}
                            disabled={sendingSMS.has(employee.id)}
                            className="flex items-center gap-1.5 hover:text-[#003756] disabled:opacity-50"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            {sendingSMS.has(employee.id) ? 'Sending' : 'Text a reminder'}
                          </button>
                        )}

                        {hasFinal && (
                          <button
                            onClick={() => handleSendFinalPhotoEmail(employee)}
                            disabled={busy}
                            className="flex items-center gap-1.5 hover:text-[#003756] disabled:opacity-50"
                          >
                            <Send className="h-3.5 w-3.5" />
                            {busy ? 'Sending' : 'Email the final'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={`flex flex-none items-center gap-3 text-[13px] font-bold ${SOFT}`}>
                    <button
                      onClick={() => startEdit(employee)}
                      className="transition-colors hover:text-[#003756]"
                      title="Edit their details"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteEmployee(employee.id, employee.employee_name)}
                      className="transition-colors hover:text-[#FF5050]"
                      title="Remove from this event"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
