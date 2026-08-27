import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Calendar, 
  Users, 
  Camera, 
  Upload, 
  Eye,
  Trash2,
  Edit,
  Link,
  Mail,
  Image as ImageIcon,
  ExternalLink
} from 'lucide-react';
import { Card, Tabs, CoralButton, OutlineButton, StatusPill, SOFT, LINE, SHADOW } from './headshot/brand';
import { HeadshotService } from '../services/HeadshotService';
import { NotificationService } from '../services/NotificationService';
import { HeadshotEvent, HeadshotEventStats, CSVEmployeeData } from '../types/headshot';
import { HeadshotEventModal } from './HeadshotEventModal';
import { CSVUploader } from './CSVUploader';
import { PhotoUploader } from './PhotoUploader';
import { EmployeeLinksModal } from './EmployeeLinksModal';
import { EmployeeManager } from './EmployeeManager';
import { PhotographerEventAssignments } from './PhotographerEventAssignments';
import { CustomUrlHelper } from '../utils/customUrlHelper';
import { formatLocalDateShort } from '../utils/dateHelpers';

export const HeadshotEventManager: React.FC = () => {
  const [events, setEvents] = useState<HeadshotEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<HeadshotEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<HeadshotEvent | null>(null);
  const [showCSVUploader, setShowCSVUploader] = useState(false);
  const [showPhotoUploader, setShowPhotoUploader] = useState(false);
  const [showEmployeeLinks, setShowEmployeeLinks] = useState(false);
  const [showPhotographerAssignments, setShowPhotographerAssignments] = useState(false);
  const [eventStats, setEventStats] = useState<HeadshotEventStats | null>(null);
  const [sendingNotifications, setSendingNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState<'employees' | 'photos' | 'links' | 'photographers'>('employees');
  const [uploadingForEmployee, setUploadingForEmployee] = useState<{id: string, name: string} | null>(null);
  const [uploadMode, setUploadMode] = useState<'photos' | 'final'>('photos');
  const [employeeRefreshKey, setEmployeeRefreshKey] = useState(0);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await HeadshotService.getEvents();
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEventStats = async (eventId: string) => {
    try {
      const stats = await HeadshotService.getEventStats(eventId);
      setEventStats(stats);
    } catch (error) {
      console.error('Error fetching event stats:', error);
    }
  };

  const handleCreateEvent = async (eventData: Omit<HeadshotEvent, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newEvent = await HeadshotService.createEvent(eventData);
      setEvents([newEvent, ...events]);
      setShowEventModal(false);
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event. Please try again.');
    }
  };

  const handleEditEvent = (event: HeadshotEvent) => {
    setEditingEvent(event);
    setShowEventModal(true);
  };

  const handleUpdateEvent = async (eventData: Omit<HeadshotEvent, 'id' | 'created_at' | 'updated_at'>) => {
    if (!editingEvent) return;
    
    try {
      const updatedEvent = await HeadshotService.updateEvent(editingEvent.id, eventData);
      setEvents(events.map(e => e.id === editingEvent.id ? updatedEvent : e));
      setShowEventModal(false);
      setEditingEvent(null);
      alert('Event updated successfully!');
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Failed to update event. Please try again.');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event? This will also delete all associated galleries and photos.')) {
      return;
    }

    try {
      await HeadshotService.deleteEvent(eventId);
      setEvents(events.filter(e => e.id !== eventId));
      if (selectedEvent?.id === eventId) {
        setSelectedEvent(null);
        setEventStats(null);
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
    }
  };

  const handleCSVUpload = async (employees: CSVEmployeeData[]) => {
    if (!selectedEvent) return;

    try {
      console.log('Creating galleries for event:', selectedEvent.id, 'with employees:', employees);
      const galleries = await HeadshotService.createEmployeeGalleries(selectedEvent.id, employees);
      console.log('Created galleries:', galleries);
      await fetchEventStats(selectedEvent.id);
      setEmployeeRefreshKey(k => k + 1);
      setShowCSVUploader(false);
      alert(`Successfully imported ${employees.length} employees!`);
    } catch (error) {
      console.error('Error uploading CSV:', error);
      alert('Failed to upload CSV. Please try again.');
    }
  };

  const handleSendNotifications = async () => {
    if (!selectedEvent) return;
    
    // Only people with photos get an email, so promise that number, not the roster size.
    const willReceive = eventStats?.photos_uploaded || 0;
    const confirmed = window.confirm(
      `Email the ${willReceive} ${willReceive === 1 ? 'person' : 'people'} who have photos in "${selectedEvent.event_name}"?\n\n` +
      `Anyone without photos yet is skipped.`
    );
    
    if (!confirmed) return;

    try {
      setSendingNotifications(true);
      const { sent, failed, skipped } = await NotificationService.sendBulkGalleryReadyNotifications(selectedEvent.id);

      const parts = [`Emailed ${sent} ${sent === 1 ? 'person' : 'people'}.`];
      if (failed > 0) parts.push(`${failed} failed to send, check the console for which.`);
      if (skipped > 0) parts.push(`${skipped} skipped because they have no photos yet.`);
      alert(parts.join('\n'));
    } catch (error) {
      console.error('Error sending notifications:', error);
      const code = error instanceof Error ? error.message : '';
      if (code === 'NO_PHOTOS') {
        alert('Nobody has photos uploaded yet, so there is nothing to tell them about. Upload photos first, then send.');
      } else if (code === 'NO_EMPLOYEES') {
        alert('There is nobody on this event yet. Import the roster first.');
      } else {
        alert('Could not send the emails. Please try again.');
      }
    } finally {
      setSendingNotifications(false);
    }
  };

  const handleUploadPhotosForEmployee = (employeeId: string, employeeName: string) => {
    setUploadingForEmployee({ id: employeeId, name: employeeName });
    setUploadMode('photos');
    setShowPhotoUploader(true);
  };

  const handleUploadFinalForEmployee = (employeeId: string, employeeName: string) => {
    setUploadingForEmployee({ id: employeeId, name: employeeName });
    setUploadMode('final');
    setShowPhotoUploader(true);
  };

  const statusTone = (status: HeadshotEvent['status']) =>
    status === 'completed' ? 'navy' : status === 'active' ? 'cyan' : 'mist';

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#E2E9E8] border-t-[#FF5050]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-extrabold tracking-[-.02em] text-[#003756]">Events</h2>
          <p className={`mt-1 text-[14.5px] ${SOFT}`}>Pick an event to manage its roster and photos.</p>
        </div>
        <CoralButton onClick={() => setShowEventModal(true)}>
          <Plus className="h-4 w-4" />
          New event
        </CoralButton>
      </div>

      {/* Events */}
      {events.length === 0 ? (
        <Card tone="mist" className="px-6 py-16 text-center">
          <Calendar className="mx-auto mb-4 h-10 w-10 text-[#45596A]" />
          <p className="text-[16px] font-bold text-[#003756]">No events yet</p>
          <p className={`mt-1.5 text-[14.5px] ${SOFT}`}>Create one and import the roster.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <div
              key={event.id}
              className={`cursor-pointer rounded-[18px] border-2 bg-white p-6 transition-all ${SHADOW} ${
                selectedEvent?.id === event.id
                  ? 'border-[#FF5050]'
                  : `${LINE} hover:border-[#003756]`
              }`}
              onClick={() => {
                setSelectedEvent(event);
                fetchEventStats(event.id);
              }}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <StatusPill tone={statusTone(event.status)}>{event.status}</StatusPill>
                <div className={`flex flex-none gap-3 text-[13px] font-bold ${SOFT}`}>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEditEvent(event); }}
                    className="transition-colors hover:text-[#003756]"
                    title="Edit event"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }}
                    className="transition-colors hover:text-[#FF5050]"
                    title="Delete event"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <h3 className="mb-3 text-[18px] font-extrabold tracking-[-.02em] text-[#003756]">
                {event.event_name}
              </h3>

              <div className={`space-y-1.5 text-[14px] ${SOFT}`}>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatLocalDateShort(event.event_date)}
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {event.total_employees} people
                </div>
                {event.client_logo_url && (
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Client logo added
                  </div>
                )}
                {event.manager_token && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        const customUrl = await CustomUrlHelper.getManagerUrl(event.id, event.manager_token!);
                        navigator.clipboard.writeText(customUrl);
                      } catch (error) {
                        console.error('Failed to get custom manager URL:', error);
                        navigator.clipboard.writeText(`${window.location.origin}/manager/${event.manager_token}`);
                      }
                      alert('Copied. Send this to the client contact, not the photographer.');
                    }}
                    className="flex items-center gap-2 font-bold text-[#003756] transition-opacity hover:opacity-70"
                    title="For the employer point of contact"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Copy client contact link
                  </button>
                )}
              </div>

              {selectedEvent?.id === event.id && eventStats && (
                <div className={`mt-4 grid grid-cols-2 gap-3 border-t ${LINE} pt-4`}>
                  {([
                    ['Photos in', eventStats.photos_uploaded],
                    ['Picked', eventStats.selections_made],
                    ['Retouching', eventStats.retouching_in_progress],
                    ['Done', eventStats.completed],
                  ] as const).map(([label, value]) => (
                    <div key={label} className="text-center">
                      <div className="text-[19px] font-extrabold leading-none text-[#003756]">{value}</div>
                      <div className={`mt-1 text-[11.5px] font-bold uppercase tracking-[.06em] ${SOFT}`}>{label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Selected event */}
      {selectedEvent && (
        <Card className="overflow-hidden">
          <div className={`border-b ${LINE} px-6 pt-5`}>
            <h2 className="mb-4 text-[17px] font-extrabold tracking-[-.02em] text-[#003756]">
              {selectedEvent.event_name}
            </h2>
            <Tabs
              active={activeTab}
              onChange={(k) => setActiveTab(k as 'employees' | 'photos' | 'links' | 'photographers')}
              tabs={[
                { key: 'employees', label: 'People', icon: <Users className="h-4 w-4" /> },
                { key: 'photos', label: 'Photos', icon: <Camera className="h-4 w-4" /> },
                { key: 'links', label: 'Links', icon: <Link className="h-4 w-4" /> },
                { key: 'photographers', label: 'Photographers', icon: <Camera className="h-4 w-4" /> },
              ]}
            />
          </div>

          {/* Tab content */}
          <div className="p-6">
            {activeTab === 'employees' && (
              <div className="space-y-6">
                <div className="flex flex-wrap gap-3">
                  <OutlineButton onClick={() => setShowCSVUploader(true)}>
                    <Upload className="h-4 w-4" />
                    Import from CSV
                  </OutlineButton>

                  <CoralButton
                    onClick={handleSendNotifications}
                    disabled={sendingNotifications || !eventStats?.photos_uploaded}
                    title={
                      !eventStats?.photos_uploaded
                        ? 'Nobody has photos yet, so there is nothing to send'
                        : undefined
                    }
                  >
                    {sendingNotifications ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4" />
                        Email everyone with photos
                      </>
                    )}
                  </CoralButton>
                </div>

                <EmployeeManager
                  eventId={selectedEvent.id}
                  refreshKey={employeeRefreshKey}
                  onEmployeeUpdate={() => fetchEventStats(selectedEvent.id)}
                  onUploadPhotos={handleUploadPhotosForEmployee}
                  onUploadFinal={handleUploadFinalForEmployee}
                />
              </div>
            )}

            {activeTab === 'photos' && (
              <div>
                <h3 className="text-[16px] font-extrabold text-[#003756]">Photos</h3>
                <p className={`mt-1.5 text-[14.5px] ${SOFT}`}>
                  Upload into a person's gallery, or look at what is already there.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <CoralButton onClick={() => setShowPhotoUploader(true)}>
                    <Camera className="h-4 w-4" />
                    Upload photos
                  </CoralButton>
                  <OutlineButton onClick={() => setShowPhotoUploader(true)}>
                    <Eye className="h-4 w-4" />
                    Browse galleries
                  </OutlineButton>
                </div>
              </div>
            )}

            {activeTab === 'links' && (
              <div>
                <h3 className="text-[16px] font-extrabold text-[#003756]">Gallery links</h3>
                <p className={`mt-1.5 text-[14.5px] ${SOFT}`}>
                  Every person has a private link. Copy one if their email bounced.
                </p>
                <div className="mt-4">
                  <CoralButton onClick={() => setShowEmployeeLinks(true)}>
                    <Link className="h-4 w-4" />
                    See everyone's links
                  </CoralButton>
                </div>
              </div>
            )}

            {activeTab === 'photographers' && (
              <div>
                <h3 className="text-[16px] font-extrabold text-[#003756]">Photographers</h3>
                <p className={`mt-1.5 text-[14.5px] ${SOFT}`}>
                  Whoever you add here can upload photos for this event.
                </p>
                <div className="mt-4">
                  <CoralButton onClick={() => setShowPhotographerAssignments(true)}>
                    <Users className="h-4 w-4" />
                    Choose photographers
                  </CoralButton>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Modals */}
      {showEventModal && (
        <HeadshotEventModal
          onClose={() => {
            setShowEventModal(false);
            setEditingEvent(null);
          }}
          onSubmit={editingEvent ? handleUpdateEvent : handleCreateEvent}
          editingEvent={editingEvent}
        />
      )}

      {showCSVUploader && selectedEvent && (
        <CSVUploader
          onClose={() => setShowCSVUploader(false)}
          onUpload={handleCSVUpload}
        />
      )}

      {showPhotoUploader && selectedEvent && (
        <PhotoUploader
          eventId={selectedEvent.id}
          onClose={() => {
            setShowPhotoUploader(false);
            setUploadingForEmployee(null);
            setUploadMode('photos');
          }}
          onUploadComplete={() => {
            fetchEventStats(selectedEvent.id);
            setShowPhotoUploader(false);
            setUploadingForEmployee(null);
            setUploadMode('photos');
          }}
          specificEmployee={uploadingForEmployee}
          uploadMode={uploadMode}
        />
      )}

      {showEmployeeLinks && selectedEvent && (
        <EmployeeLinksModal
          isOpen={showEmployeeLinks}
          onClose={() => setShowEmployeeLinks(false)}
          eventId={selectedEvent.id}
        />
      )}

      {showPhotographerAssignments && selectedEvent && (
        <PhotographerEventAssignments
          eventId={selectedEvent.id}
          eventName={selectedEvent.event_name}
          onClose={() => setShowPhotographerAssignments(false)}
        />
      )}
    </div>
  );
};
