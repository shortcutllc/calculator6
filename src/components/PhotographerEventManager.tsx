import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Camera, 
  Upload, 
  Mail, 
  Search,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  AlertCircle,
  Download,
  MessageCircle
} from 'lucide-react';
import { PhotographerService } from '../services/PhotographerService';
import { HeadshotService } from '../services/HeadshotService';
import { NotificationService } from '../services/NotificationService';
import { SMSService } from '../services/SMSService';
import { EmployeeGallery, HeadshotEvent, HeadshotEventStats } from '../types/headshot';
import { BrandNav, Kicker, Headline, Sub, Card, Stat, StatusPill, OutlineButton, INK, SOFT, LINE } from './headshot/brand';
import { PhotographerAccess } from '../types/photographer';
import { PhotoUploader } from './PhotoUploader';

const PhotographerEventManager: React.FC = () => {
  const { token, eventId } = useParams<{ token: string; eventId: string }>();
  const navigate = useNavigate();
  
  const [access, setAccess] = useState<PhotographerAccess | null>(null);
  const [event, setEvent] = useState<HeadshotEvent | null>(null);
  const [galleries, setGalleries] = useState<EmployeeGallery[]>([]);
  const [eventStats, setEventStats] = useState<HeadshotEventStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sendingSMS, setSendingSMS] = useState<Set<string>>(new Set());
  const [showPhotoUploader, setShowPhotoUploader] = useState(false);
  const [uploadingForEmployee, setUploadingForEmployee] = useState<{ id: string; name: string } | null>(null);
  const [uploadMode, setUploadMode] = useState<'photos' | 'final'>('photos');
  
  // Employee management states
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeGallery | null>(null);
  const [employeeFormData, setEmployeeFormData] = useState({
    employee_name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    if (token && eventId) {
      validateAccess();
    }
  }, [token, eventId]);

  const validateAccess = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const photographerAccess = await PhotographerService.validateToken(token!);
      if (!photographerAccess) {
        setError('Invalid or expired photographer access. Please contact support.');
        return;
      }

      setAccess(photographerAccess);
      await fetchEventData();
      
    } catch (err) {
      console.error('Error validating photographer access:', err);
      setError('Failed to validate access. Please try again or contact support.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEventData = async () => {
    try {
      const [eventData, galleriesData, statsData] = await Promise.all([
        HeadshotService.getEvent(eventId!),
        HeadshotService.getGalleriesByEvent(eventId!),
        HeadshotService.getEventStats(eventId!)
      ]);

      setEvent(eventData);
      setGalleries(galleriesData);
      setEventStats(statsData);
    } catch (err) {
      console.error('Error fetching event data:', err);
      setError('Failed to load event data. Please try again.');
    }
  };

  const handleUploadPhotos = (gallery: EmployeeGallery) => {
    setUploadingForEmployee({ id: gallery.id, name: gallery.employee_name });
    setUploadMode('photos');
    setShowPhotoUploader(true);
  };

  const handleUploadFinal = (gallery: EmployeeGallery) => {
    setUploadingForEmployee({ id: gallery.id, name: gallery.employee_name });
    setUploadMode('final');
    setShowPhotoUploader(true);
  };

  const handleSendGalleryReadyEmail = async (gallery: EmployeeGallery) => {
    if (!gallery.photos || gallery.photos.length === 0) {
      alert('This employee has no photos uploaded yet. Please upload photos first.');
      return;
    }

    const confirmed = window.confirm(
      `Send gallery ready notification to ${gallery.employee_name} (${gallery.email})?`
    );
    
    if (!confirmed) return;

    try {
      const galleryUrl = `${window.location.origin}/gallery/${gallery.unique_token}`;
      
      await NotificationService.sendGalleryReadyNotification(
        gallery.employee_name,
        gallery.email,
        galleryUrl,
        event?.event_name || 'Headshot Event',
        gallery.id
      );
      
      alert(`Gallery ready notification sent to ${gallery.employee_name}!`);
    } catch (error) {
      console.error('Error sending notification:', error);
      alert(`Failed to send notification to ${gallery.employee_name}. Please try again.`);
    }
  };

  const handleSendFinalPhotoEmail = async (gallery: EmployeeGallery) => {
    const hasFinalPhoto = gallery.photos?.some(p => p.is_final);
    if (!hasFinalPhoto) {
      alert('This employee does not have a final photo uploaded yet.');
      return;
    }

    const confirmed = window.confirm(
      `Send final photo ready notification to ${gallery.employee_name} (${gallery.email})?`
    );
    
    if (!confirmed) return;

    try {
      await NotificationService.sendFinalPhotoNotification(gallery.id);
      
      alert(`Final photo notification sent to ${gallery.employee_name}!`);
    } catch (error) {
      console.error('Error sending notification:', error);
      alert(`Failed to send notification to ${gallery.employee_name}. Please try again.`);
    }
  };

  // Employee management functions
  const handleAddEmployee = () => {
    setEmployeeFormData({
      employee_name: '',
      email: '',
      phone: ''
    });
    setEditingEmployee(null);
    setShowAddEmployeeModal(true);
  };

  const handleEditEmployee = (gallery: EmployeeGallery) => {
    setEmployeeFormData({
      employee_name: gallery.employee_name,
      email: gallery.email,
      phone: gallery.phone || ''
    });
    setEditingEmployee(gallery);
    setShowAddEmployeeModal(true);
  };

  const handleSaveEmployee = async () => {
    if (!employeeFormData.employee_name.trim()) {
      alert('Employee name is required.');
      return;
    }

    if (!employeeFormData.email.trim()) {
      alert('Email is required.');
      return;
    }

    try {
      if (editingEmployee) {
        // Update existing employee
        await HeadshotService.updateEmployeeGallery(editingEmployee.id, {
          employee_name: employeeFormData.employee_name.trim(),
          email: employeeFormData.email.trim(),
          phone: employeeFormData.phone.trim() || undefined
        });
        alert('Employee updated successfully!');
      } else {
        // Add new employee using the same method as admin
        await HeadshotService.createEmployeeGalleries(eventId!, [{
          name: employeeFormData.employee_name.trim(),
          email: employeeFormData.email.trim(),
          phone: employeeFormData.phone.trim() || undefined
        }]);
        alert('Employee added successfully!');
      }

      setShowAddEmployeeModal(false);
      await fetchEventData(); // Refresh data
    } catch (error) {
      console.error('Error saving employee:', error);
      alert('Failed to save employee. Please try again.');
    }
  };

  const handleDeleteEmployee = async (gallery: EmployeeGallery) => {
    if (!window.confirm(`Are you sure you want to delete ${gallery.employee_name}? This will also delete all their photos and cannot be undone.`)) {
      return;
    }

    try {
      await HeadshotService.deleteEmployeeGallery(gallery.id);
      alert('Employee deleted successfully!');
      await fetchEventData(); // Refresh data
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Failed to delete employee. Please try again.');
    }
  };

  const getStatusBadge = (gallery: EmployeeGallery) => {
    const hasPhotos = !!gallery.photos && gallery.photos.length > 0;
    const hasSelection = !!gallery.selected_photo_id;
    const hasFinal = !!gallery.photos?.some(p => p.is_final);

    if (hasFinal) return { text: 'Final delivered' };
    if (hasSelection) return { text: 'Picked a photo' };
    if (hasPhotos) return { text: 'Waiting on them' };
    return { text: 'Needs photos' };
  };

  const handleDownloadSelectedPhoto = async (gallery: EmployeeGallery) => {
    if (!gallery.selected_photo_id) {
      alert('No photo selected by this employee yet.');
      return;
    }

    try {
      const selectedPhoto = gallery.photos?.find(p => p.id === gallery.selected_photo_id);
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
      a.download = `${gallery.employee_name.replace(/\s+/g, '_')}_selected_photo.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading photo:', error);
      alert('Failed to download photo. Please try again.');
    }
  };

  const handleSendSMSReminder = async (gallery: EmployeeGallery) => {
    if (!gallery.phone) {
      alert('This employee does not have a phone number on file.');
      return;
    }

    const hasPhotos = gallery.photos && gallery.photos.length > 0;
    const hasSelection = gallery.selected_photo_id;

    if (!hasPhotos) {
      alert('This employee does not have photos uploaded yet. Upload photos before sending a reminder.');
      return;
    }

    if (hasSelection) {
      const proceed = window.confirm(
        `${gallery.employee_name} has already made a selection. Send reminder anyway?`
      );
      if (!proceed) return;
    }

    const confirmed = window.confirm(
      `Send SMS reminder to ${gallery.employee_name} at ${gallery.phone}?`
    );
    
    if (!confirmed) return;

    try {
      setSendingSMS(prev => new Set(prev).add(gallery.id));
      
      const galleryUrl = `${window.location.origin}/gallery/${gallery.unique_token}`;

      await SMSService.sendGalleryReminderSMS(
        gallery.phone,
        gallery.employee_name,
        galleryUrl,
        event?.event_name || 'Headshot Event',
        event?.selection_deadline
      );
      
      alert(`SMS reminder sent to ${gallery.employee_name}!`);
    } catch (error) {
      console.error('Error sending SMS:', error);
      alert(`Failed to send SMS to ${gallery.employee_name}. Please check the phone number and try again.`);
    } finally {
      setSendingSMS(prev => {
        const newSet = new Set(prev);
        newSet.delete(gallery.id);
        return newSet;
      });
    }
  };

  const filteredGalleries = galleries.filter(gallery => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      gallery.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gallery.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (gallery.phone && gallery.phone.includes(searchTerm));

    // Status filter
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      const hasPhotos = !!gallery.photos && gallery.photos.length > 0;
      const hasSelection = !!gallery.selected_photo_id;
      const hasFinal = !!gallery.photos?.some(p => p.is_final);

      switch (statusFilter) {
        case 'No Photos':
          matchesStatus = !hasPhotos;
          break;
        case 'Photos Added':
          matchesStatus = hasPhotos && !hasSelection;
          break;
        case 'Photo Selected':
          matchesStatus = hasSelection && !hasFinal;
          break;
        case 'Final Photo Ready':
          matchesStatus = hasFinal;
          break;
      }
    }

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className={`flex min-h-screen items-center justify-center bg-white font-sans ${INK}`}>
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-[3px] border-[#E2E9E8] border-t-[#FF5050]" />
          <p className={`text-[15px] ${SOFT}`}>Loading your event...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex min-h-screen items-center justify-center bg-white px-5 font-sans ${INK}`}>
        <Card className="max-w-md p-8 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-[#FF5050]" />
          <h1 className="text-[22px] font-extrabold tracking-[-.02em] text-[#003756]">Something went wrong</h1>
          <p className={`mt-2 text-[15px] ${SOFT}`}>{error}</p>
          <OutlineButton onClick={() => navigate(`/photographer/${token}`)} className="mt-5">
            Back to your events
          </OutlineButton>
        </Card>
      </div>
    );
  }

  if (!event || !access) {
    return (
      <div className={`flex min-h-screen items-center justify-center bg-white px-5 font-sans ${INK}`}>
        <Card className="max-w-md p-8 text-center">
          <h1 className="text-[22px] font-extrabold tracking-[-.02em] text-[#003756]">We could not find this event</h1>
          <p className={`mt-2 text-[15px] ${SOFT}`}>Check the link in your email, or contact us for a fresh one.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-white font-sans leading-[1.55] ${INK}`}>
      <BrandNav logoUrl={event.client_logo_url} name={event.event_name} />

      <div className="mx-auto max-w-[1140px] px-5 pb-16 md:px-7">
        {/* Page head */}
        <div className="pb-8 pt-10 md:pt-12">
          <button
            onClick={() => navigate(`/photographer/${token}`)}
            className={`mb-5 inline-flex items-center gap-1.5 text-[13.5px] font-bold ${SOFT} transition-colors hover:text-[#003756]`}
          >
            <ArrowLeft className="h-4 w-4" />
            All events
          </button>
          <Kicker>{event.event_name}</Kicker>
          <Headline>Upload each person's photos.</Headline>
          <Sub>
            Find someone below and add their photos. They get an email with a link to pick their
            favorite, and you upload the retouched final when it is ready.
          </Sub>
        </div>

        {/* Stats */}
        {eventStats && (
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat label="People" value={eventStats.total_employees} />
            <Stat label="Photos uploaded" value={eventStats.photos_uploaded} />
            <Stat label="Picked a photo" value={eventStats.selections_made} />
            <Stat label="Finals delivered" value={eventStats.completed} />
          </div>
        )}

        {/* Search and filter */}
        <Card className="mb-6 p-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#45596A]" />
              <input
                type="text"
                placeholder="Search by name or email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full rounded-[14px] border-2 ${LINE} py-2.5 pl-11 pr-4 text-[14.5px] focus:border-[#003756] focus:outline-none`}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`rounded-[14px] border-2 ${LINE} px-4 py-2.5 text-[14.5px] font-medium text-[#003756] focus:border-[#003756] focus:outline-none sm:w-56`}
            >
              <option value="all">Everyone</option>
              <option value="No Photos">Needs photos</option>
              <option value="Photos Added">Photos added</option>
              <option value="Photo Selected">Picked a photo</option>
              <option value="Final Photo Ready">Final delivered</option>
            </select>
          </div>
        </Card>

        {/* Employee List */}
        <Card className="overflow-hidden">
          <div className={`flex flex-wrap items-center justify-between gap-3 border-b ${LINE} px-6 py-5`}>
            <div>
              <h2 className="text-[17px] font-extrabold tracking-[-.02em] text-[#003756]">Everyone at this event</h2>
              <p className={`mt-1 text-[14px] ${SOFT}`}>Add photos to a person's gallery, or add someone who is not on the list.</p>
            </div>
            <OutlineButton onClick={handleAddEmployee}>
              <Plus className="h-4 w-4" />
              Add person
            </OutlineButton>
          </div>
          
          {filteredGalleries.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Camera className="mx-auto mb-4 h-10 w-10 text-[#45596A]" />
              <p className="text-[16px] font-bold text-[#003756]">
                {galleries.length === 0 ? 'Nobody on the list yet' : 'Nobody matches that search'}
              </p>
              <p className={`mt-1.5 text-[14.5px] ${SOFT}`}>
                {galleries.length === 0
                  ? 'Add someone with the button above, or ask us to import the roster.'
                  : 'Try a different name, or clear the filter.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-[#003756]">
                    {['Person', 'Where they are', 'Add photos', ''].map((label, i) => (
                      <th
                        key={i}
                        className="px-6 py-3 text-left text-[11px] font-extrabold uppercase tracking-[.08em] text-white"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredGalleries.map((gallery, i) => {
                    const status = getStatusBadge(gallery);
                    const galleryUrl = `${window.location.origin}/gallery/${gallery.unique_token}`;
                    const hasPhotos = !!gallery.photos && gallery.photos.length > 0;
                    const hasFinal = !!gallery.photos?.some(p => p.is_final);

                    return (
                      <tr
                        key={gallery.id}
                        className={`${i % 2 ? 'bg-[#F1F6F5]' : 'bg-white'} align-top transition-colors hover:bg-[#9EFAFF]/25`}
                      >
                        {/* Person */}
                        <td className="px-6 py-4">
                          <div className="text-[15px] font-bold text-[#003756]">{gallery.employee_name}</div>
                          <div className={`text-[13.5px] ${SOFT}`}>{gallery.email}</div>
                          <a
                            href={galleryUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1.5 inline-flex items-center gap-1.5 text-[13px] font-bold text-[#003756] underline underline-offset-2 hover:opacity-70"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            See their gallery
                          </a>
                        </td>

                        {/* Status */}
                        <td className="whitespace-nowrap px-6 py-4">
                          <StatusPill tone={hasFinal ? 'navy' : hasPhotos ? 'cyan' : 'mist'}>
                            {status.text}
                          </StatusPill>
                        </td>

                        {/* Primary action */}
                        <td className="whitespace-nowrap px-6 py-4">
                          <button
                            onClick={() => handleUploadPhotos(gallery)}
                            className="inline-flex items-center gap-2 rounded-full bg-[#FF5050] px-5 py-2.5 text-[13.5px] font-bold text-white shadow-[0_4px_14px_rgba(255,80,80,.3)] transition-transform hover:scale-[1.03]"
                          >
                            <Upload className="h-4 w-4" />
                            {hasPhotos ? 'Add more' : 'Upload photos'}
                          </button>
                          {hasPhotos && !hasFinal && (
                            <button
                              onClick={() => handleUploadFinal(gallery)}
                              className="mt-2 flex items-center gap-1.5 text-[13px] font-bold text-[#003756] hover:opacity-70"
                            >
                              <Upload className="h-3.5 w-3.5" />
                              Upload retouched final
                            </button>
                          )}
                        </td>

                        {/* Everything else, deliberately quiet */}
                        <td className="px-6 py-4">
                          <div className={`flex flex-col items-start gap-1.5 text-[13px] font-medium ${SOFT}`}>
                            {gallery.selected_photo_id && (
                              <button
                                onClick={() => handleDownloadSelectedPhoto(gallery)}
                                className="flex items-center gap-1.5 hover:text-[#003756]"
                              >
                                <Download className="h-3.5 w-3.5" />
                                Download their pick
                              </button>
                            )}
                            {hasPhotos && !hasFinal && (
                              <button
                                onClick={() => handleSendGalleryReadyEmail(gallery)}
                                className="flex items-center gap-1.5 hover:text-[#003756]"
                              >
                                <Mail className="h-3.5 w-3.5" />
                                Email them the link
                              </button>
                            )}
                            {hasFinal && (
                              <button
                                onClick={() => handleSendFinalPhotoEmail(gallery)}
                                className="flex items-center gap-1.5 hover:text-[#003756]"
                              >
                                <Mail className="h-3.5 w-3.5" />
                                Email the final
                              </button>
                            )}
                            {gallery.phone && hasPhotos && !gallery.selected_photo_id && (
                              <button
                                onClick={() => handleSendSMSReminder(gallery)}
                                disabled={sendingSMS.has(gallery.id)}
                                className="flex items-center gap-1.5 hover:text-[#003756] disabled:opacity-50"
                              >
                                {sendingSMS.has(gallery.id) ? (
                                  <>
                                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#E2E9E8] border-t-[#003756]" />
                                    Sending
                                  </>
                                ) : (
                                  <>
                                    <MessageCircle className="h-3.5 w-3.5" />
                                    Text a reminder
                                  </>
                                )}
                              </button>
                            )}
                            <div className="mt-1 flex items-center gap-3">
                              <button
                                onClick={() => handleEditEmployee(gallery)}
                                className="flex items-center gap-1.5 hover:text-[#003756]"
                                title="Edit their details"
                              >
                                <Edit className="h-3.5 w-3.5" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteEmployee(gallery)}
                                className="flex items-center gap-1.5 hover:text-[#FF5050]"
                                title="Remove from this event"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Remove
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Footer */}
        <Card tone="mist" className="mt-10 px-6 py-8 text-center">
          <p className="text-[16px] font-bold text-[#003756]">Need a hand?</p>
          <p className={`mt-1.5 text-[14.5px] ${SOFT}`}>We answer fast during a shoot.</p>
          <a
            href="mailto:hello@getshortcut.co"
            className="mt-4 inline-flex items-center rounded-full border-2 border-[#003756] bg-white px-6 py-2.5 text-[14px] font-bold text-[#003756] transition-colors hover:bg-white/70"
          >
            hello@getshortcut.co
          </a>
        </Card>
      </div>

      {/* Photo Uploader Modal */}
      {showPhotoUploader && (
        <PhotoUploader
          eventId={eventId!}
          onClose={() => {
            setShowPhotoUploader(false);
            setUploadingForEmployee(null);
            setUploadMode('photos');
          }}
          onUploadComplete={() => {
            fetchEventData();
            setShowPhotoUploader(false);
            setUploadingForEmployee(null);
            setUploadMode('photos');
          }}
          specificEmployee={uploadingForEmployee}
          uploadMode={uploadMode}
        />
      )}

      {/* Add / edit person */}
      {showAddEmployeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(3,34,50,.55)] p-4">
          <Card className="w-full max-w-md p-7">
            <h3 className="text-[20px] font-extrabold tracking-[-.02em] text-[#003756]">
              {editingEmployee ? 'Edit their details' : 'Add someone'}
            </h3>
            <p className={`mt-1.5 text-[14px] ${SOFT}`}>
              They get their own gallery link once you upload photos.
            </p>

            <div className="mt-6 space-y-4">
              {([
                { key: 'employee_name', label: 'Name', type: 'text', placeholder: 'Jane Smith', required: true },
                { key: 'email', label: 'Email', type: 'email', placeholder: 'jane@company.com', required: true },
                { key: 'phone', label: 'Phone (optional)', type: 'tel', placeholder: 'For text reminders', required: false },
              ] as const).map(f => (
                <div key={f.key}>
                  <label className="mb-1.5 block text-[12.5px] font-bold uppercase tracking-[.06em] text-[#45596A]">
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    value={employeeFormData[f.key]}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, [f.key]: e.target.value })}
                    className={`w-full rounded-[14px] border-2 ${LINE} px-4 py-2.5 text-[14.5px] focus:border-[#003756] focus:outline-none`}
                    placeholder={f.placeholder}
                  />
                </div>
              ))}
            </div>

            <div className="mt-7 flex justify-end gap-3">
              <OutlineButton onClick={() => setShowAddEmployeeModal(false)}>Cancel</OutlineButton>
              <button
                onClick={handleSaveEmployee}
                disabled={!employeeFormData.employee_name.trim() || !employeeFormData.email.trim()}
                className="inline-flex items-center gap-2 rounded-full bg-[#FF5050] px-6 py-3 text-[14.5px] font-bold text-white shadow-[0_4px_14px_rgba(255,80,80,.3)] transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                {editingEmployee ? 'Save changes' : 'Add person'}
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PhotographerEventManager;
