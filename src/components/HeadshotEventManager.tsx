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
  Mail
} from 'lucide-react';
import { Button } from './Button';
import { HeadshotService } from '../services/HeadshotService';
import { NotificationService } from '../services/NotificationService';
import { HeadshotEvent, HeadshotEventStats, CSVEmployeeData } from '../types/headshot';
import { HeadshotEventModal } from './HeadshotEventModal';
import { CSVUploader } from './CSVUploader';
import { PhotoUploader } from './PhotoUploader';
import { EmployeeLinksModal } from './EmployeeLinksModal';

export const HeadshotEventManager: React.FC = () => {
  const [events, setEvents] = useState<HeadshotEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<HeadshotEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showCSVUploader, setShowCSVUploader] = useState(false);
  const [showPhotoUploader, setShowPhotoUploader] = useState(false);
  const [showEmployeeLinks, setShowEmployeeLinks] = useState(false);
  const [eventStats, setEventStats] = useState<HeadshotEventStats | null>(null);
  const [sendingNotifications, setSendingNotifications] = useState(false);

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
                    handleDeleteEvent(event.id);
                  }}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-900 mb-2">{event.event_name}</h3>
            
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>{new Date(event.event_date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>{event.total_employees} employees</span>
              </div>
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

      {/* Selected Event Actions */}
      {selectedEvent && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Event: {selectedEvent.event_name}
          </h2>
          
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
              onClick={() => setShowPhotoUploader(true)}
              variant="secondary"
              className="flex items-center space-x-2"
            >
              <Camera className="w-4 h-4" />
              <span>Upload Photos</span>
            </Button>
            
            <Button
              onClick={() => setShowEmployeeLinks(true)}
              variant="secondary"
              className="flex items-center space-x-2"
            >
              <Link className="w-4 h-4" />
              <span>View Employee Links</span>
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
            
            <Button
              onClick={() => setShowPhotoUploader(true)}
              className="flex items-center space-x-2"
            >
              <Eye className="w-4 h-4" />
              <span>View Galleries</span>
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showEventModal && (
        <HeadshotEventModal
          onClose={() => setShowEventModal(false)}
          onSubmit={handleCreateEvent}
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
          onClose={() => setShowPhotoUploader(false)}
          onUploadComplete={() => {
            fetchEventStats(selectedEvent.id);
            setShowPhotoUploader(false);
          }}
        />
      )}

      {showEmployeeLinks && selectedEvent && (
        <EmployeeLinksModal
          isOpen={showEmployeeLinks}
          onClose={() => setShowEmployeeLinks(false)}
          eventId={selectedEvent.id}
        />
      )}
    </div>
  );
};
