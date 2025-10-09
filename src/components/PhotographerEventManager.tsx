import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Users, 
  Camera, 
  Upload, 
  Eye, 
  Mail, 
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  MessageCircle
} from 'lucide-react';
import { PhotographerService } from '../services/PhotographerService';
import { HeadshotService } from '../services/HeadshotService';
import { NotificationService } from '../services/NotificationService';
import { SMSService } from '../services/SMSService';
import { EmployeeGallery, HeadshotEvent, HeadshotEventStats } from '../types/headshot';
import { PhotographerAccess } from '../types/photographer';
import { Button } from './Button';
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
    const hasPhotos = gallery.photos && gallery.photos.length > 0;
    const hasSelection = gallery.selected_photo_id;
    const hasFinal = gallery.photos?.some(p => p.is_final);

    if (hasFinal) {
      return {
        text: 'Final Photo Ready',
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: <CheckCircle className="w-4 h-4" />
      };
    } else if (hasSelection) {
      return {
        text: 'Photo Selected',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: <CheckCircle className="w-4 h-4" />
      };
    } else if (hasPhotos) {
      return {
        text: 'Photos Added',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <Camera className="w-4 h-4" />
      };
    } else {
      return {
        text: 'No Photos',
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: <AlertCircle className="w-4 h-4" />
      };
    }
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
      const hasPhotos = gallery.photos && gallery.photos.length > 0;
      const hasSelection = gallery.selected_photo_id;
      const hasFinal = gallery.photos?.some(p => p.is_final);

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading event data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate(`/photographer/${token}`)}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!event || !access) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h1>
          <p className="text-gray-600">The requested event could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(`/photographer/${token}`)}
                className="text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{event.event_name}</h1>
                <p className="text-gray-600 mt-1">Event Management - {access.photographer_name}</p>
              </div>
            </div>
            {event.client_logo_url && (
              <div className="flex-shrink-0">
                <img 
                  src={event.client_logo_url} 
                  alt="Client Logo" 
                  className="h-12 w-auto object-contain"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Event Stats */}
        {eventStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Employees</p>
                  <p className="text-2xl font-bold text-gray-900">{eventStats.total_employees}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Camera className="w-8 h-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Photos Uploaded</p>
                  <p className="text-2xl font-bold text-gray-900">{eventStats.photos_uploaded}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Selections Made</p>
                  <p className="text-2xl font-bold text-gray-900">{eventStats.selections_made}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Download className="w-8 h-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Final Photos</p>
                  <p className="text-2xl font-bold text-gray-900">{eventStats.final_photos}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search employees by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="No Photos">No Photos</option>
                <option value="Photos Added">Photos Added</option>
                <option value="Photo Selected">Photo Selected</option>
                <option value="Final Photo Ready">Final Photo Ready</option>
              </select>
            </div>
          </div>
        </div>

        {/* Employee List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Employee Galleries</h2>
                <p className="text-sm text-gray-600">Manage photos and galleries for each employee</p>
              </div>
              <Button
                onClick={handleAddEmployee}
                className="flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Employee</span>
              </Button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gallery
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredGalleries.map((gallery) => {
                  const status = getStatusBadge(gallery);
                  const galleryUrl = `${window.location.origin}/gallery/${gallery.unique_token}`;
                  
                  return (
                    <tr key={gallery.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {gallery.employee_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {gallery.email}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${status.color}`}>
                          {status.icon}
                          <span className="ml-1">{status.text}</span>
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <a
                          href={galleryUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View Gallery
                        </a>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleUploadPhotos(gallery)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            <Upload className="w-4 h-4 inline mr-1" />
                            Upload Photos
                          </button>
                          
                          {gallery.photos && gallery.photos.length > 0 && (
                            <button
                              onClick={() => handleUploadFinal(gallery)}
                              className="text-green-600 hover:text-green-800 text-sm font-medium"
                            >
                              <Upload className="w-4 h-4 inline mr-1" />
                              Upload Final
                            </button>
                          )}

                          {gallery.selected_photo_id && (
                            <button
                              onClick={() => handleDownloadSelectedPhoto(gallery)}
                              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                            >
                              <Download className="w-4 h-4 inline mr-1" />
                              Download Selected
                            </button>
                          )}
                          
                          {gallery.photos && gallery.photos.length > 0 && !gallery.photos.some(p => p.is_final) && (
                            <button
                              onClick={() => handleSendGalleryReadyEmail(gallery)}
                              className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                            >
                              <Mail className="w-4 h-4 inline mr-1" />
                              Send Gallery Email
                            </button>
                          )}
                          
                          {gallery.photos?.some(p => p.is_final) && (
                            <button
                              onClick={() => handleSendFinalPhotoEmail(gallery)}
                              className="text-pink-600 hover:text-pink-800 text-sm font-medium"
                            >
                              <Mail className="w-4 h-4 inline mr-1" />
                              Send Final Email
                            </button>
                          )}

                          {gallery.phone && gallery.photos && gallery.photos.length > 0 && !gallery.selected_photo_id && (
                            <button
                              onClick={() => handleSendSMSReminder(gallery)}
                              disabled={sendingSMS.has(gallery.id)}
                              className="text-teal-600 hover:text-teal-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {sendingSMS.has(gallery.id) ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600 inline mr-1"></div>
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <MessageCircle className="w-4 h-4 inline mr-1" />
                                  Send SMS Reminder
                                </>
                              )}
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleEditEmployee(gallery)}
                            className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                            title="Edit employee info"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => handleDeleteEmployee(gallery)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                            title="Delete employee"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              <div className="flex items-center justify-center mb-3">
                <span className="text-gray-600 font-medium">Powered by</span>
                <img 
                  src="/shortcut-logo blue.svg" 
                  alt="Shortcut" 
                  className="h-6 w-auto ml-1"
                />
              </div>
              <p className="text-gray-600 mb-2">
                Photographer Portal - Need help or have questions?
              </p>
              <a 
                href="mailto:hello@getshortcut.co" 
                className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                hello@getshortcut.co
              </a>
            </div>
          </div>
        </div>
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

      {/* Add/Edit Employee Modal */}
      {showAddEmployeeModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingEmployee ? 'Edit Employee' : 'Add Employee'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee Name *
                  </label>
                  <input
                    type="text"
                    value={employeeFormData.employee_name}
                    onChange={(e) => setEmployeeFormData({...employeeFormData, employee_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter employee name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={employeeFormData.email}
                    onChange={(e) => setEmployeeFormData({...employeeFormData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter email address"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={employeeFormData.phone}
                    onChange={(e) => setEmployeeFormData({...employeeFormData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddEmployeeModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEmployee}
                  disabled={!employeeFormData.employee_name.trim() || !employeeFormData.email.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingEmployee ? 'Update Employee' : 'Add Employee'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotographerEventManager;
