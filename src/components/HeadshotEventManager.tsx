import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Calendar, 
  Users, 
  Camera, 
  Upload, 
  Download,
  Eye,
  Trash2,
  Edit,
  CheckCircle,
  Clock,
  AlertCircle,
  Link,
  Mail,
  Image as ImageIcon,
  ExternalLink
} from 'lucide-react';
import { Button } from './Button';
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
      setShowCSVUploader(false);
      alert(`Successfully imported ${employees.length} employees!`);
    } catch (error) {
      console.error('Error uploading CSV:', error);
      alert('Failed to upload CSV. Please try again.');
    }
  };

  const handleSendNotifications = async () => {
    if (!selectedEvent) return;
    
    const confirmed = window.confirm(
      `Send gallery ready notifications to all ${eventStats?.total_employees || 0} employees in "${selectedEvent.event_name}"?`
    );
    
    if (!confirmed) return;

    try {
      setSendingNotifications(true);
      await NotificationService.sendBulkGalleryReadyNotifications(selectedEvent.id);
      alert('Gallery ready notifications sent successfully!');
    } catch (error) {
      console.error('Error sending notifications:', error);
      alert('Failed to send notifications. Please try again.');
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

  const getStatusIcon = (status: HeadshotEvent['status']) => {
    switch (status) {
      case 'draft':
        return <Edit className="w-4 h-4 text-gray-500" />;
      case 'active':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'archived':
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: HeadshotEvent['status']) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'active':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'archived':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Headshot Gallery Management</h1>
          <p className="text-gray-600 mt-2">Manage headshot events and employee galleries</p>
        </div>
        <Button
          onClick={() => setShowEventModal(true)}
          className="flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create Event</span>
        </Button>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <div
            key={event.id}
            className={`bg-white rounded-2xl shadow-lg p-6 border-2 transition-all cursor-pointer ${
              selectedEvent?.id === event.id
                ? 'border-shortcut-blue bg-shortcut-blue/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => {
              setSelectedEvent(event);
              fetchEventStats(event.id);
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2">
                {getStatusIcon(event.status)}
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(event.status)}`}>
                  {event.status}
                </span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditEvent(event);
                  }}
                  className="text-blue-500 hover:text-blue-700 p-1"
                  title="Edit event"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteEvent(event.id);
                  }}
                  className="text-red-500 hover:text-red-700 p-1"
                  title="Delete event"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-900 mb-2">{event.event_name}</h3>
            
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>{formatLocalDateShort(event.event_date)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>{event.total_employees} employees</span>
              </div>
              {event.client_logo_url && (
                <div className="flex items-center space-x-2">
                  <ImageIcon className="w-4 h-4 text-blue-500" />
                  <span className="text-blue-600 font-medium">Client logo added</span>
                </div>
              )}
              {event.manager_token && (
                <div className="flex items-center space-x-2">
                  <ExternalLink className="w-4 h-4 text-green-500" />
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        const customUrl = await CustomUrlHelper.getManagerUrl(event.id, event.manager_token!);
                        navigator.clipboard.writeText(customUrl);
                        alert('Manager link copied to clipboard!');
                      } catch (error) {
                        console.error('Failed to get custom manager URL:', error);
                        // Fallback to original URL
                        const managerUrl = `${window.location.origin}/manager/${event.manager_token}`;
                        navigator.clipboard.writeText(managerUrl);
                        alert('Manager link copied to clipboard!');
                      }
                    }}
                    className="text-green-600 hover:text-green-800 font-medium text-xs"
                    title="Click to copy manager link"
                  >
                    Copy Manager Link
                  </button>
                </div>
              )}
            </div>

            {selectedEvent?.id === event.id && eventStats && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-center">
                    <div className="font-semibold text-blue-600">{eventStats.photos_uploaded}</div>
                    <div className="text-gray-500">Photos Uploaded</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-green-600">{eventStats.selections_made}</div>
                    <div className="text-gray-500">Selections Made</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-orange-600">{eventStats.retouching_in_progress}</div>
                    <div className="text-gray-500">Retouching</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-purple-600">{eventStats.completed}</div>
                    <div className="text-gray-500">Completed</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Selected Event Content */}
      {selectedEvent && (
        <div className="bg-white rounded-2xl shadow-lg">
          {/* Event Header */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Event: {selectedEvent.event_name}
            </h2>
            
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {[
                  { key: 'employees', label: 'Employees', icon: Users },
                  { key: 'photos', label: 'Photos', icon: Camera },
                  { key: 'links', label: 'Links', icon: Link },
                  { key: 'photographers', label: 'Photographers', icon: Users }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as 'employees' | 'photos' | 'links' | 'photographers')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === tab.key
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'employees' && (
              <div className="space-y-6">
                <div className="flex flex-wrap gap-4">
                  <Button
                    onClick={() => setShowCSVUploader(true)}
                    variant="secondary"
                    className="flex items-center space-x-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Import Employees (CSV)</span>
                  </Button>
                  
                  <Button
                    onClick={handleSendNotifications}
                    disabled={sendingNotifications || !eventStats?.total_employees}
                    className="flex items-center space-x-2"
                  >
                    {sendingNotifications ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        <span>Send Notifications</span>
                      </>
                    )}
                  </Button>
                </div>
                
                <EmployeeManager
                  eventId={selectedEvent.id}
                  onEmployeeUpdate={() => fetchEventStats(selectedEvent.id)}
                  onUploadPhotos={handleUploadPhotosForEmployee}
                  onUploadFinal={handleUploadFinalForEmployee}
                />
              </div>
            )}

            {activeTab === 'photos' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Photo Management</h3>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => setShowPhotoUploader(true)}
                      className="flex items-center space-x-2"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Upload Photos</span>
                    </Button>
                    <Button
                      onClick={() => setShowPhotoUploader(true)}
                      variant="secondary"
                      className="flex items-center space-x-2"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Galleries</span>
                    </Button>
                  </div>
                </div>
                <p className="text-gray-600">
                  Use the buttons above to manage photos for employees in this event.
                </p>
              </div>
            )}

            {activeTab === 'links' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Employee Links</h3>
                  <Button
                    onClick={() => setShowEmployeeLinks(true)}
                    className="flex items-center space-x-2"
                  >
                    <Link className="w-4 h-4" />
                    <span>View Employee Links</span>
                  </Button>
                </div>
                <p className="text-gray-600">
                  View and copy employee gallery links for this event.
                </p>
              </div>
            )}

            {activeTab === 'photographers' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Photographer Access</h3>
                  <Button
                    onClick={() => setShowPhotographerAssignments(true)}
                    className="flex items-center space-x-2"
                  >
                    <Users className="w-4 h-4" />
                    <span>Manage Photographers</span>
                  </Button>
                </div>
                <p className="text-gray-600">
                  Assign photographers to this event to give them access to manage photos and galleries.
                </p>
              </div>
            )}
          </div>
        </div>
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
