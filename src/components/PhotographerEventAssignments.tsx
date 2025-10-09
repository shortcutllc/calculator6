import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  X, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  User
} from 'lucide-react';
import { PhotographerService } from '../services/PhotographerService';
import { HeadshotService } from '../services/HeadshotService';
import { PhotographerToken, PhotographerEventAssignment } from '../types/photographer';
import { HeadshotEvent } from '../types/headshot';
import { Button } from './Button';

interface PhotographerEventAssignmentsProps {
  eventId: string;
  eventName: string;
  onClose: () => void;
}

export const PhotographerEventAssignments: React.FC<PhotographerEventAssignmentsProps> = ({
  eventId,
  eventName,
  onClose
}) => {
  const [photographers, setPhotographers] = useState<PhotographerToken[]>([]);
  const [assignments, setAssignments] = useState<PhotographerEventAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [photographersData, assignmentsData] = await Promise.all([
        PhotographerService.getPhotographerTokens(),
        PhotographerService.getEventAssignments(eventId)
      ]);
      
      setPhotographers(photographersData);
      setAssignments(assignmentsData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load photographer data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPhotographer = async (photographerTokenId: string) => {
    try {
      setAssigning(true);
      await PhotographerService.assignPhotographerToEvent(photographerTokenId, eventId);
      await fetchData(); // Refresh data
    } catch (err) {
      console.error('Error assigning photographer:', err);
      alert('Failed to assign photographer. Please try again.');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemovePhotographer = async (photographerTokenId: string) => {
    if (!confirm('Are you sure you want to remove this photographer from the event?')) {
      return;
    }

    try {
      setAssigning(true);
      await PhotographerService.removePhotographerFromEvent(photographerTokenId, eventId);
      await fetchData(); // Refresh data
    } catch (err) {
      console.error('Error removing photographer:', err);
      alert('Failed to remove photographer. Please try again.');
    } finally {
      setAssigning(false);
    }
  };

  const handleBulkAssign = async (photographerTokenIds: string[]) => {
    try {
      setAssigning(true);
      await Promise.all(
        photographerTokenIds.map(id => 
          PhotographerService.assignPhotographerToEvent(id, eventId)
        )
      );
      await fetchData(); // Refresh data
    } catch (err) {
      console.error('Error bulk assigning photographers:', err);
      alert('Failed to assign some photographers. Please try again.');
    } finally {
      setAssigning(false);
    }
  };

  const getAssignedPhotographerIds = () => {
    return assignments.map(assignment => assignment.photographer_token_id);
  };

  const getAvailablePhotographers = () => {
    const assignedIds = getAssignedPhotographerIds();
    return photographers.filter(photographer => 
      photographer.is_active && !assignedIds.includes(photographer.id)
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Manage Photographers</h2>
              <p className="text-sm text-gray-600 mt-1">Event: {eventName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Assigned Photographers */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              Assigned Photographers ({assignments.length})
            </h3>
            
            {assignments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No photographers assigned to this event</p>
                <p className="text-sm">Assign photographers below to give them access to this event</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <User className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium text-gray-900">
                          {assignment.photographer?.photographer_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {assignment.photographer?.photographer_email}
                        </p>
                        <p className="text-xs text-gray-500">
                          Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemovePhotographer(assignment.photographer_token_id)}
                      disabled={assigning}
                      className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available Photographers */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Plus className="w-5 h-5 text-blue-500 mr-2" />
                Available Photographers ({getAvailablePhotographers().length})
              </h3>
              {getAvailablePhotographers().length > 1 && (
                <Button
                  onClick={() => {
                    const availableIds = getAvailablePhotographers().map(p => p.id);
                    if (confirm(`Assign all ${availableIds.length} available photographers to this event?`)) {
                      handleBulkAssign(availableIds);
                    }
                  }}
                  disabled={assigning}
                  variant="secondary"
                  className="text-sm"
                >
                  Assign All
                </Button>
              )}
            </div>
            
            {getAvailablePhotographers().length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>All active photographers are already assigned to this event</p>
              </div>
            ) : (
              <div className="space-y-3">
                {getAvailablePhotographers().map((photographer) => (
                  <div
                    key={photographer.id}
                    className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <User className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">
                          {photographer.photographer_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {photographer.photographer_email}
                        </p>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-xs text-gray-500">
                            Token: {photographer.token}
                          </span>
                          <span className="text-xs text-gray-500">
                            Created: {new Date(photographer.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleAssignPhotographer(photographer.id)}
                      disabled={assigning}
                      className="flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Assign</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
            <Button onClick={onClose} variant="secondary">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
