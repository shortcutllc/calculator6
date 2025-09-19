import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, X, Save, User, Mail, Phone, Camera, Link, Copy, CheckCircle, Clock, AlertCircle, Search, Filter, Send } from 'lucide-react';
import { Button } from './Button';
import { HeadshotService } from '../services/HeadshotService';
import { NotificationService } from '../services/NotificationService';
import { EmployeeGallery } from '../types/headshot';
import { supabase } from '../lib/supabaseClient';

interface EmployeeManagerProps {
  eventId: string;
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
  onEmployeeUpdate,
  onUploadPhotos,
  onUploadFinal
}) => {
  const [employees, setEmployees] = useState<EmployeeGallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeGallery | null>(null);
  const [eventName, setEventName] = useState<string>('Headshot Event');
  const [formData, setFormData] = useState<EmployeeFormData>({
    name: '',
    email: '',
    phone: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [copiedLinks, setCopiedLinks] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'no_photos' | 'photos_uploaded' | 'photo_selected' | 'final_ready'>('all');
  const [sendingEmails, setSendingEmails] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchEventName();
    fetchEmployees();
  }, [eventId]);

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

  const getStatusBadge = (employee: EmployeeGallery) => {
    const hasPhotos = employee.photos && employee.photos.length > 0;
    const hasSelection = employee.selected_photo_id;
    const hasFinal = employee.photos?.some(p => p.is_final);

    if (hasFinal) {
      return {
        text: 'Final Photo Ready',
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: CheckCircle
      };
    } else if (hasSelection) {
      return {
        text: 'Photo Selected',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle
      };
    } else if (hasPhotos) {
      return {
        text: 'Photos Added',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: Camera
      };
    } else {
      return {
        text: 'No Photos',
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: AlertCircle
      };
    }
  };

  const copyGalleryLink = async (employee: EmployeeGallery) => {
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
    } catch (error) {
      console.error('Failed to copy link:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = galleryUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
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
      
      const galleryUrl = `${window.location.origin}/gallery/${employee.unique_token}`;
      
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
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Employees ({filteredEmployees.length} of {employees.length})
        </h3>
        <Button
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Employee</span>
        </Button>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Bar */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search employees by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="no_photos">No Photos</option>
            <option value="photos_uploaded">Photos Uploaded</option>
            <option value="photo_selected">Photo Selected</option>
            <option value="final_ready">Final Photo Ready</option>
          </select>
        </div>
      </div>

      {/* Add Employee Form */}
      {showAddForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-blue-900">Add New Employee</h4>
            <button
              onClick={cancelAdd}
              className="text-blue-600 hover:text-blue-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Employee name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="employee@company.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="(555) 123-4567"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
            </div>
          </div>

          <div className="flex space-x-3 mt-4">
            <Button
              onClick={handleAddEmployee}
              disabled={saving}
              className="flex items-center space-x-2"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saving ? 'Adding...' : 'Add Employee'}</span>
            </Button>
            <Button
              onClick={cancelAdd}
              variant="secondary"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Edit Employee Form */}
      {editingEmployee && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-yellow-900">Edit Employee</h4>
            <button
              onClick={cancelEdit}
              className="text-yellow-600 hover:text-yellow-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Employee name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="employee@company.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="(555) 123-4567"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
            </div>
          </div>

          <div className="flex space-x-3 mt-4">
            <Button
              onClick={handleEditEmployee}
              disabled={saving}
              className="flex items-center space-x-2"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </Button>
            <Button
              onClick={cancelEdit}
              variant="secondary"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Employees List */}
      <div className="space-y-2">
        {employees.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No employees added yet</p>
            <p className="text-sm">Click "Add Employee" to get started</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No employees match your search criteria</p>
            <p className="text-sm">Try adjusting your search or filter</p>
          </div>
        ) : (
          filteredEmployees.map((employee) => {
            const statusBadge = getStatusBadge(employee);
            const isLinkCopied = copiedLinks.has(employee.id);
            
            return (
              <div
                key={employee.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Employee Info */}
                    <div className="flex items-center space-x-3 mb-3">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{employee.employee_name}</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusBadge.color}`}>
                        <statusBadge.icon className="w-3 h-3 mr-1" />
                        {statusBadge.text}
                      </span>
                    </div>
                    
                    {/* Contact Info */}
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center space-x-1">
                        <Mail className="w-3 h-3" />
                        <span>{employee.email}</span>
                      </div>
                      {employee.phone && (
                        <div className="flex items-center space-x-1">
                          <Phone className="w-3 h-3" />
                          <span>{employee.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Photo Count */}
                    {employee.photos && employee.photos.length > 0 && (
                      <div className="text-xs text-gray-500 mb-3">
                        {employee.photos.length} photo{employee.photos.length !== 1 ? 's' : ''} uploaded
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {/* Upload Photos Button - only show if no photos or photos but no selection */}
                      {(!employee.photos || employee.photos.length === 0 || !employee.selected_photo_id) && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onUploadPhotos(employee.id, employee.employee_name);
                          }}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors"
                          title="Upload photos for this employee"
                        >
                          <Camera className="w-3 h-3 mr-1" />
                          {!employee.photos || employee.photos.length === 0 ? 'Upload Photos' : 'Add More Photos'}
                        </button>
                      )}
                      
                      {/* Upload Final Button - only show if photo is selected but no final photo */}
                      {employee.selected_photo_id && !employee.photos?.some(p => p.is_final) && (
                        <button
                          onClick={() => onUploadFinal(employee.id, employee.employee_name)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-md transition-colors"
                          title="Upload final retouched photo"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Upload Final
                        </button>
                      )}
                      
                      <button
                        onClick={() => copyGalleryLink(employee)}
                        className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          isLinkCopied 
                            ? 'text-green-700 bg-green-100' 
                            : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                        }`}
                        title="Copy gallery link"
                      >
                        {isLinkCopied ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Link className="w-3 h-3 mr-1" />
                            Copy Link
                          </>
                        )}
                      </button>

                      {/* Email Buttons */}
                      {employee.photos && employee.photos.length > 0 && !employee.photos.some(p => p.is_final) && (
                        <button
                          onClick={() => handleSendGalleryReadyEmail(employee)}
                          disabled={sendingEmails.has(employee.id)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
                          title="Send gallery ready notification"
                        >
                          {sendingEmails.has(employee.id) ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600 mr-1"></div>
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="w-3 h-3 mr-1" />
                              Send Gallery Email
                            </>
                          )}
                        </button>
                      )}

                      {employee.photos?.some(p => p.is_final) && (
                        <button
                          onClick={() => handleSendFinalPhotoEmail(employee)}
                          disabled={sendingEmails.has(employee.id)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-pink-700 bg-pink-100 hover:bg-pink-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
                          title="Send final photo ready notification"
                        >
                          {sendingEmails.has(employee.id) ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-pink-600 mr-1"></div>
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="w-3 h-3 mr-1" />
                              Send Final Email
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Edit/Delete Actions */}
                  <div className="flex items-center space-x-1 ml-4">
                    <button
                      onClick={() => startEdit(employee)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit employee"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteEmployee(employee.id, employee.employee_name)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete employee"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
