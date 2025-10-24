import React, { useState, useEffect } from 'react';
import { Plus, Copy, Trash2, Edit, User, Mail, Key, Calendar, UserMinus, UserPlus, ChevronDown, ChevronRight } from 'lucide-react';
import { PhotographerService } from '../services/PhotographerService';
import { HeadshotService } from '../services/HeadshotService';
import { PhotographerToken, PhotographerEventAssignment } from '../types/photographer';
import { HeadshotEvent } from '../types/headshot';
import { Button } from './Button';
import { CustomUrlHelper } from '../utils/customUrlHelper';
import { formatLocalDateShort } from '../utils/dateHelpers';

export const PhotographerManager: React.FC = () => {
  const [tokens, setTokens] = useState<PhotographerToken[]>([]);
  const [events, setEvents] = useState<HeadshotEvent[]>([]);
  const [assignments, setAssignments] = useState<PhotographerEventAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingToken, setEditingToken] = useState<PhotographerToken | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [expandedPhotographer, setExpandedPhotographer] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    photographer_name: '',
    photographer_email: '',
    permissions: {
      can_manage_events: true,
      can_upload_photos: true,
      can_manage_galleries: true
    }
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [tokensData, eventsData] = await Promise.all([
        PhotographerService.getAllTokens(),
        HeadshotService.getEvents()
      ]);
      setTokens(tokensData);
      setEvents(eventsData);
      
      // Fetch all assignments
      const allAssignments: PhotographerEventAssignment[] = [];
      for (const event of eventsData) {
        try {
          const eventAssignments = await PhotographerService.getEventAssignments(event.id);
          allAssignments.push(...eventAssignments);
        } catch (err) {
          console.error(`Error fetching assignments for event ${event.id}:`, err);
        }
      }
      setAssignments(allAssignments);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateToken = async () => {
    try {
      await PhotographerService.createToken(
        formData.photographer_name,
        formData.photographer_email,
        formData.permissions
      );
      setShowCreateModal(false);
      setFormData({
        photographer_name: '',
        photographer_email: '',
        permissions: {
          can_manage_events: true,
          can_upload_photos: true,
          can_manage_galleries: true
        }
      });
      await fetchData();
    } catch (error) {
      console.error('Error creating photographer token:', error);
    }
  };

  const handleDeactivateToken = async (id: string) => {
    if (window.confirm('Are you sure you want to deactivate this photographer access?')) {
      try {
        await PhotographerService.deactivateToken(id);
        await fetchData();
      } catch (error) {
        console.error('Error deactivating token:', error);
      }
    }
  };

  const handleDeleteToken = async (id: string) => {
    if (window.confirm('Are you sure you want to permanently delete this photographer access?')) {
      try {
        await PhotographerService.deleteToken(id);
        await fetchData();
      } catch (error) {
        console.error('Error deleting token:', error);
      }
    }
  };

  const copyPhotographerLink = async (token: string, tokenId: string) => {
    try {
      const customUrl = await CustomUrlHelper.getPhotographerUrl(tokenId, token);
      await navigator.clipboard.writeText(customUrl);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      // Fallback to original URL
      const photographerUrl = `${window.location.origin}/photographer/${token}`;
      await navigator.clipboard.writeText(photographerUrl);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    }
  };

  const getPhotographerAssignments = (photographerId: string) => {
    return assignments.filter(a => a.photographer_token_id === photographerId);
  };

  const getEventById = (eventId: string) => {
    return events.find(e => e.id === eventId);
  };

  const isAssignedToEvent = (photographerId: string, eventId: string) => {
    return assignments.some(a => a.photographer_token_id === photographerId && a.event_id === eventId);
  };

  const handleAssignToEvent = async (photographerId: string, eventId: string) => {
    setAssigning(prev => new Set(prev).add(photographerId));
    try {
      await PhotographerService.assignPhotographerToEvent(photographerId, eventId);
      await fetchData(); // Refresh data
    } catch (error) {
      console.error('Error assigning photographer to event:', error);
      alert('Failed to assign photographer to event. Please try again.');
    } finally {
      setAssigning(prev => {
        const newSet = new Set(prev);
        newSet.delete(photographerId);
        return newSet;
      });
    }
  };

  const handleRemoveFromEvent = async (photographerId: string, eventId: string) => {
    if (!confirm('Are you sure you want to remove this photographer from the event?')) {
      return;
    }

    setAssigning(prev => new Set(prev).add(photographerId));
    try {
      await PhotographerService.removePhotographerFromEvent(photographerId, eventId);
      await fetchData(); // Refresh data
    } catch (error) {
      console.error('Error removing photographer from event:', error);
      alert('Failed to remove photographer from event. Please try again.');
    } finally {
      setAssigning(prev => {
        const newSet = new Set(prev);
        newSet.delete(photographerId);
        return newSet;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Photographer Access</h2>
          <p className="text-gray-600 mt-1">Manage photographer portal access tokens</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Photographer</span>
        </Button>
      </div>

      {/* Tokens List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Active Photographer Tokens</h3>
        </div>
        
        {tokens.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No photographers added</h3>
            <p className="text-gray-600 mb-4">Get started by adding a photographer to give them access to the portal.</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Photographer
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Photographer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Token
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Permissions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Events
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tokens.map((token) => (
                  <React.Fragment key={token.id}>
                    <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {token.photographer_name}
                        </div>
                        {token.photographer_email && (
                          <div className="text-sm text-gray-500">
                            {token.photographer_email}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {token.token}
                        </code>
                        <button
                          onClick={() => copyPhotographerLink(token.token, token.id)}
                          className="text-gray-400 hover:text-gray-600"
                          title="Copy photographer link"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        {copiedToken === token.token && (
                          <span className="text-xs text-green-600">Copied!</span>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {token.permissions.can_manage_events && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Events
                          </span>
                        )}
                        {token.permissions.can_upload_photos && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Upload
                          </span>
                        )}
                        {token.permissions.can_manage_galleries && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Galleries
                          </span>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        token.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {token.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setExpandedPhotographer(
                            expandedPhotographer === token.id ? null : token.id
                          )}
                          className="flex items-center text-sm text-gray-600 hover:text-gray-800"
                        >
                          {expandedPhotographer === token.id ? (
                            <ChevronDown className="w-4 h-4 mr-1" />
                          ) : (
                            <ChevronRight className="w-4 h-4 mr-1" />
                          )}
                          <span>
                            {getPhotographerAssignments(token.id).length} assigned
                          </span>
                        </button>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => copyPhotographerLink(token.token, token.id)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Copy photographer link"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        
                        {token.is_active ? (
                          <button
                            onClick={() => handleDeactivateToken(token.id)}
                            className="text-yellow-600 hover:text-yellow-800"
                            title="Deactivate access"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDeleteToken(token.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete permanently"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                    </tr>
                    
                    {/* Expanded Event Assignments Row */}
                    {expandedPhotographer === token.id && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 bg-gray-50">
                          <div className="space-y-4">
                            <h4 className="text-sm font-medium text-gray-900 mb-3">
                              Event Assignments for {token.photographer_name}
                            </h4>
                            
                            {/* Assigned Events */}
                            <div>
                              <h5 className="text-xs font-medium text-gray-700 mb-2">Currently Assigned:</h5>
                              {getPhotographerAssignments(token.id).length === 0 ? (
                                <p className="text-sm text-gray-500">No events assigned</p>
                              ) : (
                                <div className="space-y-2">
                                  {getPhotographerAssignments(token.id).map((assignment) => {
                                    const event = getEventById(assignment.event_id);
                                    if (!event) return null;
                                    
                                    return (
                                      <div key={assignment.id} className="flex items-center justify-between bg-white p-3 rounded border">
                                        <div className="flex items-center space-x-3">
                                          <Calendar className="w-4 h-4 text-gray-400" />
                                          <div>
                                            <p className="text-sm font-medium text-gray-900">{event.event_name}</p>
                                            <p className="text-xs text-gray-500">
                                              {formatLocalDateShort(event.event_date)} • {event.status}
                                            </p>
                                          </div>
                                        </div>
                                        <button
                                          onClick={() => handleRemoveFromEvent(token.id, event.id)}
                                          disabled={assigning.has(token.id)}
                                          className="text-red-600 hover:text-red-800 disabled:opacity-50"
                                          title="Remove from event"
                                        >
                                          <UserMinus className="w-4 h-4" />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            
                            {/* Available Events */}
                            <div>
                              <h5 className="text-xs font-medium text-gray-700 mb-2">Available Events:</h5>
                              {events.filter(e => !isAssignedToEvent(token.id, e.id)).length === 0 ? (
                                <p className="text-sm text-gray-500">All events are already assigned</p>
                              ) : (
                                <div className="space-y-2">
                                  {events
                                    .filter(e => !isAssignedToEvent(token.id, e.id))
                                    .map((event) => (
                                      <div key={event.id} className="flex items-center justify-between bg-white p-3 rounded border">
                                        <div className="flex items-center space-x-3">
                                          <Calendar className="w-4 h-4 text-gray-400" />
                                          <div>
                                            <p className="text-sm font-medium text-gray-900">{event.event_name}</p>
                                            <p className="text-xs text-gray-500">
                                              {formatLocalDateShort(event.event_date)} • {event.status}
                                            </p>
                                          </div>
                                        </div>
                                        <button
                                          onClick={() => handleAssignToEvent(token.id, event.id)}
                                          disabled={assigning.has(token.id)}
                                          className="text-green-600 hover:text-green-800 disabled:opacity-50"
                                          title="Assign to event"
                                        >
                                          <UserPlus className="w-4 h-4" />
                                        </button>
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Photographer Access</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Photographer Name
                  </label>
                  <input
                    type="text"
                    value={formData.photographer_name}
                    onChange={(e) => setFormData({...formData, photographer_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter photographer name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={formData.photographer_email}
                    onChange={(e) => setFormData({...formData, photographer_email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter email address"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Permissions
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.permissions.can_manage_events}
                        onChange={(e) => setFormData({
                          ...formData, 
                          permissions: {...formData.permissions, can_manage_events: e.target.checked}
                        })}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Manage Events</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.permissions.can_upload_photos}
                        onChange={(e) => setFormData({
                          ...formData, 
                          permissions: {...formData.permissions, can_upload_photos: e.target.checked}
                        })}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Upload Photos</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.permissions.can_manage_galleries}
                        onChange={(e) => setFormData({
                          ...formData, 
                          permissions: {...formData.permissions, can_manage_galleries: e.target.checked}
                        })}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Manage Galleries</span>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateToken}
                  disabled={!formData.photographer_name}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Access
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
