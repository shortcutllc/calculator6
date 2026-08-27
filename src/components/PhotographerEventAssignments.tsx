import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  CheckCircle, 
  AlertCircle,
  User
} from 'lucide-react';
import { PhotographerService } from '../services/PhotographerService';
import { PhotographerToken, PhotographerEventAssignment } from '../types/photographer';
import { Modal, Card, CoralButton, OutlineButton, SOFT, LINE } from './headshot/brand';

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
        PhotographerService.getAllTokens(),
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(3,34,50,.55)] p-4">
        <Card className="p-10">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#E2E9E8] border-t-[#FF5050]" />
        </Card>
      </div>
    );
  }

  const available = getAvailablePhotographers();

  return (
    <Modal
      onClose={onClose}
      title="Who is shooting this event?"
      sub={eventName}
      wide
    >
      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-[14px] border-2 border-[#FF5050] bg-white px-5 py-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-none text-[#FF5050]" />
          <p className="text-[14px] text-[#032232]">{error}</p>
        </div>
      )}

      {/* Assigned */}
      <div className="mb-8">
        <h3 className="mb-4 flex items-center gap-2 text-[15px] font-extrabold text-[#003756]">
          <CheckCircle className="h-4 w-4" />
          On this event ({assignments.length})
        </h3>

        {assignments.length === 0 ? (
          <Card tone="mist" className="px-6 py-10 text-center">
            <Users className="mx-auto mb-3 h-9 w-9 text-[#45596A]" />
            <p className="text-[15px] font-bold text-[#003756]">Nobody assigned yet</p>
            <p className={`mt-1.5 text-[14px] ${SOFT}`}>
              Add someone below and they can upload photos for this event.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between gap-4 rounded-[14px] border-2 border-[#9EFAFF] bg-[#9EFAFF]/20 p-4"
              >
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 flex-none text-[#003756]" />
                  <div>
                    <p className="text-[15px] font-bold text-[#003756]">
                      {assignment.photographer?.photographer_name}
                    </p>
                    <p className={`text-[13.5px] ${SOFT}`}>
                      {assignment.photographer?.photographer_email}
                    </p>
                    <p className={`text-[12.5px] ${SOFT}`}>
                      Added {new Date(assignment.assigned_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemovePhotographer(assignment.photographer_token_id)}
                  disabled={assigning}
                  className={`flex-none text-[13.5px] font-bold ${SOFT} transition-colors hover:text-[#FF5050] disabled:opacity-50`}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available */}
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-[15px] font-extrabold text-[#003756]">
            <Plus className="h-4 w-4" />
            Everyone else ({available.length})
          </h3>
          {available.length > 1 && (
            <OutlineButton
              onClick={() => {
                const availableIds = available.map(p => p.id);
                if (confirm(`Add all ${availableIds.length} photographers to this event?`)) {
                  handleBulkAssign(availableIds);
                }
              }}
              disabled={assigning}
              className="px-5 py-2 text-[13.5px]"
            >
              Add everyone
            </OutlineButton>
          )}
        </div>

        {available.length === 0 ? (
          <Card tone="mist" className="px-6 py-10 text-center">
            <Users className="mx-auto mb-3 h-9 w-9 text-[#45596A]" />
            <p className="text-[15px] font-bold text-[#003756]">Everyone is already on this event</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {available.map((photographer) => (
              <div
                key={photographer.id}
                className={`flex flex-wrap items-center justify-between gap-4 rounded-[14px] border-2 ${LINE} p-4`}
              >
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 flex-none text-[#45596A]" />
                  <div>
                    <p className="text-[15px] font-bold text-[#003756]">
                      {photographer.photographer_name}
                    </p>
                    <p className={`text-[13.5px] ${SOFT}`}>{photographer.photographer_email}</p>
                    <p className={`text-[12.5px] ${SOFT}`}>
                      Added {new Date(photographer.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <CoralButton
                  onClick={() => handleAssignPhotographer(photographer.id)}
                  disabled={assigning}
                  className="px-5 py-2.5 text-[13.5px]"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </CoralButton>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`mt-6 flex justify-end border-t ${LINE} pt-5`}>
        <OutlineButton onClick={onClose}>Close</OutlineButton>
      </div>
    </Modal>
  );
};
