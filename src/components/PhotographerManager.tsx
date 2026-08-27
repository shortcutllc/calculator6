import React, { useState, useEffect } from 'react';
import { Plus, Copy, Trash2, User, Key, Calendar, UserMinus, UserPlus, ChevronDown, ChevronRight } from 'lucide-react';
import { PhotographerService } from '../services/PhotographerService';
import { HeadshotService } from '../services/HeadshotService';
import { PhotographerToken, PhotographerEventAssignment } from '../types/photographer';
import { HeadshotEvent } from '../types/headshot';
import { Card, Modal, Field, CoralButton, OutlineButton, SectionHead, StatusPill, SOFT, LINE, inputClass } from './headshot/brand';
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
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#E2E9E8] border-t-[#FF5050]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-extrabold tracking-[-.02em] text-[#003756]">Photographer access</h2>
          <p className={`mt-1 text-[14.5px] ${SOFT}`}>
            Each photographer gets a private link. No password, no account.
          </p>
        </div>
        <CoralButton onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" />
          Add photographer
        </CoralButton>
      </div>

      {/* Tokens */}
      <Card className="overflow-hidden">
        <SectionHead title="Everyone with access" />

        {tokens.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <User className="mx-auto mb-4 h-10 w-10 text-[#45596A]" />
            <p className="text-[16px] font-bold text-[#003756]">No photographers yet</p>
            <p className={`mx-auto mt-1.5 max-w-[42ch] text-[14.5px] ${SOFT}`}>
              Add one and send them their link. They can upload straight into an event.
            </p>
            <div className="mt-5 flex justify-center">
              <CoralButton onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4" />
                Add the first one
              </CoralButton>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-[#003756]">
                  {['Photographer', 'Their link', 'Can do', 'Status', 'Events', ''].map((label, i) => (
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
                {tokens.map((token) => (
                  <React.Fragment key={token.id}>
                    <tr className="border-b border-[#E2E9E8] transition-colors hover:bg-[#9EFAFF]/20">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-[15px] font-bold text-[#003756]">
                          {token.photographer_name}
                        </div>
                        {token.photographer_email && (
                          <div className="text-[13.5px] text-[#45596A]">
                            {token.photographer_email}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <code className="rounded-[8px] bg-[#F1F6F5] px-2 py-1 font-mono text-[12px] text-[#003756]">
                          {token.token}
                        </code>
                        <button
                          onClick={() => copyPhotographerLink(token.token, token.id)}
                          className="text-[#45596A] transition-colors hover:text-[#003756]"
                          title="Copy photographer link"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        {copiedToken === token.token && (
                          <span className="text-[12px] font-bold text-[#003756]">Copied</span>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {token.permissions.can_manage_events && (
                          <span className="inline-flex items-center rounded-full bg-[#F1F6F5] px-3 py-1 text-[11.5px] font-bold text-[#003756]">
                            Events
                          </span>
                        )}
                        {token.permissions.can_upload_photos && (
                          <span className="inline-flex items-center rounded-full bg-[#F1F6F5] px-3 py-1 text-[11.5px] font-bold text-[#003756]">
                            Upload
                          </span>
                        )}
                        {token.permissions.can_manage_galleries && (
                          <span className="inline-flex items-center rounded-full bg-[#F1F6F5] px-3 py-1 text-[11.5px] font-bold text-[#003756]">
                            Galleries
                          </span>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusPill tone={token.is_active ? 'cyan' : 'mist'}>
                        {token.is_active ? 'Active' : 'Switched off'}
                      </StatusPill>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setExpandedPhotographer(
                            expandedPhotographer === token.id ? null : token.id
                          )}
                          className="flex items-center text-[13.5px] font-medium text-[#45596A] transition-colors hover:text-[#003756]"
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
                          className="text-[13.5px] font-bold text-[#003756] transition-opacity hover:opacity-70"
                          title="Copy photographer link"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        
                        {token.is_active ? (
                          <button
                            onClick={() => handleDeactivateToken(token.id)}
                            className="text-[13.5px] font-bold text-[#45596A] transition-colors hover:text-[#FF5050]"
                            title="Deactivate access"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDeleteToken(token.id)}
                            className="text-[13.5px] font-bold text-[#45596A] transition-colors hover:text-[#FF5050]"
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
                        <td colSpan={6} className="bg-[#F1F6F5] px-6 py-4">
                          <div className="space-y-4">
                            <h4 className="mb-3 text-[14.5px] font-extrabold text-[#003756]">
                              Event Assignments for {token.photographer_name}
                            </h4>
                            
                            {/* Assigned Events */}
                            <div>
                              <h5 className="mb-2 text-[11px] font-bold uppercase tracking-[.08em] text-[#45596A]">On these events</h5>
                              {getPhotographerAssignments(token.id).length === 0 ? (
                                <p className="text-[13.5px] text-[#45596A]">Not on any events yet</p>
                              ) : (
                                <div className="space-y-2">
                                  {getPhotographerAssignments(token.id).map((assignment) => {
                                    const event = getEventById(assignment.event_id);
                                    if (!event) return null;
                                    
                                    return (
                                      <div key={assignment.id} className="flex items-center justify-between bg-white p-3 rounded border">
                                        <div className="flex items-center space-x-3">
                                          <Calendar className="h-4 w-4 text-[#45596A]" />
                                          <div>
                                            <p className="text-[14px] font-bold text-[#003756]">{event.event_name}</p>
                                            <p className="text-[12.5px] text-[#45596A]">
                                              {formatLocalDateShort(event.event_date)} • {event.status}
                                            </p>
                                          </div>
                                        </div>
                                        <button
                                          onClick={() => handleRemoveFromEvent(token.id, event.id)}
                                          disabled={assigning.has(token.id)}
                                          className="text-[13px] font-bold text-[#45596A] transition-colors hover:text-[#FF5050] disabled:opacity-50"
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
                              <h5 className="mb-2 text-[11px] font-bold uppercase tracking-[.08em] text-[#45596A]">Could be added to</h5>
                              {events.filter(e => !isAssignedToEvent(token.id, e.id)).length === 0 ? (
                                <p className="text-[13.5px] text-[#45596A]">Already on every event</p>
                              ) : (
                                <div className="space-y-2">
                                  {events
                                    .filter(e => !isAssignedToEvent(token.id, e.id))
                                    .map((event) => (
                                      <div key={event.id} className="flex items-center justify-between bg-white p-3 rounded border">
                                        <div className="flex items-center space-x-3">
                                          <Calendar className="h-4 w-4 text-[#45596A]" />
                                          <div>
                                            <p className="text-[14px] font-bold text-[#003756]">{event.event_name}</p>
                                            <p className="text-[12.5px] text-[#45596A]">
                                              {formatLocalDateShort(event.event_date)} • {event.status}
                                            </p>
                                          </div>
                                        </div>
                                        <button
                                          onClick={() => handleAssignToEvent(token.id, event.id)}
                                          disabled={assigning.has(token.id)}
                                          className="text-[13px] font-bold text-[#003756] transition-opacity hover:opacity-70 disabled:opacity-50"
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
      </Card>

      {/* Add photographer */}
      {showCreateModal && (
        <Modal
          onClose={() => setShowCreateModal(false)}
          title="Add a photographer"
          sub="They get a private link. No account or password needed."
        >
          <div className="space-y-5">
            <Field label="Name">
              <input
                type="text"
                value={formData.photographer_name}
                onChange={(e) => setFormData({ ...formData, photographer_name: e.target.value })}
                className={inputClass}
                placeholder="Susan Beard"
              />
            </Field>

            <Field label="Email (optional)">
              <input
                type="email"
                value={formData.photographer_email}
                onChange={(e) => setFormData({ ...formData, photographer_email: e.target.value })}
                className={inputClass}
                placeholder="susan@example.com"
              />
            </Field>

            <Field label="What they can do">
              <div className="space-y-2.5">
                {([
                  ['can_upload_photos', 'Upload photos'],
                  ['can_manage_galleries', 'Manage galleries'],
                  ['can_manage_events', 'Manage events'],
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={formData.permissions[key]}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          permissions: { ...formData.permissions, [key]: e.target.checked },
                        })
                      }
                      className="h-4 w-4 accent-[#FF5050]"
                    />
                    <span className="text-[14.5px] text-[#032232]">{label}</span>
                  </label>
                ))}
              </div>
            </Field>

            <div className={`flex justify-end gap-3 border-t ${LINE} pt-5`}>
              <OutlineButton onClick={() => setShowCreateModal(false)}>Cancel</OutlineButton>
              <CoralButton onClick={handleCreateToken} disabled={!formData.photographer_name}>
                Create their link
              </CoralButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
