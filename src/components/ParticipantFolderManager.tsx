import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, X, Save, User, Users, Mail, Phone, FileText, Link, Copy, CheckCircle, Clock, AlertCircle, Search, Filter, Send, MessageSquare, Download, MessageCircle, Calendar } from 'lucide-react';
import { Button } from './Button';
import { MindfulnessProgramService } from '../services/MindfulnessProgramService';
import { ParticipantFolder, ProgramDocument } from '../types/mindfulnessProgram';
import { supabase } from '../lib/supabaseClient';
import { CustomUrlHelper } from '../utils/customUrlHelper';

interface ParticipantFolderManagerProps {
  programId: string;
  onParticipantUpdate: () => void;
  onUploadDocuments?: (participantId: string, participantName: string) => void;
}

interface ParticipantFormData {
  name: string;
  email: string;
  phone: string;
}

export const ParticipantFolderManager: React.FC<ParticipantFolderManagerProps> = ({
  programId,
  onParticipantUpdate,
  onUploadDocuments
}) => {
  const [participants, setParticipants] = useState<ParticipantFolder[]>([]);
  const [programName, setProgramName] = useState<string>('Mindfulness Program');
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<ParticipantFolder | null>(null);
  const [formData, setFormData] = useState<ParticipantFormData>({
    name: '',
    email: '',
    phone: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [copiedLinks, setCopiedLinks] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'enrolled' | 'active' | 'completed'>('all');
  const [sendingEmails, setSendingEmails] = useState<Set<string>>(new Set());
  const [sendingSMS, setSendingSMS] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchProgramName();
    fetchParticipants();
  }, [programId]);

  const fetchProgramName = async () => {
    try {
      const { data: program, error } = await supabase
        .from('mindfulness_programs')
        .select('program_name')
        .eq('id', programId)
        .single();

      if (!error && program) {
        setProgramName(program.program_name);
      }
    } catch (err) {
      console.error('Error fetching program name:', err);
    }
  };

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      const data = await MindfulnessProgramService.getFoldersByProgram(programId);
      setParticipants(data);
    } catch (error) {
      console.error('Error fetching participants:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (participant: ParticipantFolder) => {
    const status = participant.status;
    const hasDocuments = participant.documents && participant.documents.length > 0;

    switch (status) {
      case 'completed':
        return {
          text: 'Completed',
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircle
        };
      case 'active':
        return {
          text: 'Active',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: Clock
        };
      case 'enrolled':
        return {
          text: 'Enrolled',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: User
        };
      case 'pending':
      default:
        return {
          text: hasDocuments ? 'Has Documents' : 'Pending',
          color: hasDocuments ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-gray-100 text-gray-800 border-gray-200',
          icon: hasDocuments ? FileText : AlertCircle
        };
    }
  };

  const copyToClipboard = async (text: string, token: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLinks(prev => new Set(prev).add(token));
      setTimeout(() => {
        setCopiedLinks(prev => {
          const newSet = new Set(prev);
          newSet.delete(token);
          return newSet;
        });
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getFolderUrl = async (participantToken: string) => {
    try {
      const customUrl = await CustomUrlHelper.getCustomUrl(participantToken, 'participant_folder');
      return customUrl
        ? `${window.location.origin}/${customUrl}`
        : `${window.location.origin}/participant-folder/${participantToken}`;
    } catch (error) {
      console.error('Failed to get custom URL:', error);
      return `${window.location.origin}/participant-folder/${participantToken}`;
    }
  };

  const handleSendEmail = async (participant: ParticipantFolder) => {
    const confirmed = window.confirm(
      `Send enrollment email to ${participant.participant_name}?`
    );

    if (!confirmed) return;

    try {
      setSendingEmails(prev => new Set(prev).add(participant.id));

      const folderUrl = await getFolderUrl(participant.unique_token);

      // TODO: Implement email sending via NotificationService
      // await NotificationService.sendProgramEnrollmentEmail(...);

      alert(`Enrollment email sent to ${participant.participant_name}!`);
    } catch (error) {
      console.error('Error sending email:', error);
      alert(`Failed to send email to ${participant.participant_name}. Please try again.`);
    } finally {
      setSendingEmails(prev => {
        const newSet = new Set(prev);
        newSet.delete(participant.id);
        return newSet;
      });
    }
  };

  const handleSendSMS = async (participant: ParticipantFolder) => {
    if (!participant.phone) {
      alert('This participant does not have a phone number on file.');
      return;
    }

    const confirmed = window.confirm(
      `Send SMS to ${participant.participant_name} at ${participant.phone}?`
    );

    if (!confirmed) return;

    try {
      setSendingSMS(prev => new Set(prev).add(participant.id));

      const folderUrl = await getFolderUrl(participant.unique_token);

      // TODO: Implement SMS sending via SMSService
      // await SMSService.sendProgramReminderSMS(...);

      alert(`SMS sent to ${participant.participant_name}!`);
    } catch (error) {
      console.error('Error sending SMS:', error);
      alert(`Failed to send SMS to ${participant.participant_name}. Please check the phone number and try again.`);
    } finally {
      setSendingSMS(prev => {
        const newSet = new Set(prev);
        newSet.delete(participant.id);
        return newSet;
      });
    }
  };

  const handleSendCalendarInvite = async (participant: ParticipantFolder) => {
    // TODO: Implement calendar invite sending
    alert('Calendar invite functionality coming soon!');
  };

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

  const handleAddParticipant = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      await MindfulnessProgramService.createParticipantFolders(programId, [{
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined
      }]);

      setFormData({ name: '', email: '', phone: '' });
      setShowAddForm(false);
      setErrors({});
      await fetchParticipants();
      onParticipantUpdate();
    } catch (error) {
      console.error('Error adding participant:', error);
      alert('Failed to add participant. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditParticipant = async () => {
    if (!editingParticipant || !validateForm()) return;

    try {
      setSaving(true);
      await MindfulnessProgramService.updateParticipantFolder(editingParticipant.id, {
        participant_name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined
      });

      setEditingParticipant(null);
      setFormData({ name: '', email: '', phone: '' });
      setErrors({});
      await fetchParticipants();
      onParticipantUpdate();
    } catch (error) {
      console.error('Error updating participant:', error);
      alert('Failed to update participant. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteParticipant = async (participantId: string, participantName: string) => {
    if (!confirm(`Are you sure you want to delete ${participantName}? This will also delete all their documents.`)) {
      return;
    }

    try {
      await MindfulnessProgramService.deleteParticipantFolder(participantId);
      await fetchParticipants();
      onParticipantUpdate();
    } catch (error) {
      console.error('Error deleting participant:', error);
      alert('Failed to delete participant. Please try again.');
    }
  };

  const startEdit = (participant: ParticipantFolder) => {
    setEditingParticipant(participant);
    setFormData({
      name: participant.participant_name,
      email: participant.email,
      phone: participant.phone || ''
    });
    setErrors({});
  };

  const cancelEdit = () => {
    setEditingParticipant(null);
    setFormData({ name: '', email: '', phone: '' });
    setErrors({});
  };

  const cancelAdd = () => {
    setShowAddForm(false);
    setFormData({ name: '', email: '', phone: '' });
    setErrors({});
  };

  // Filter and search participants
  const filteredParticipants = useMemo(() => {
    return participants.filter(participant => {
      // Search filter
      const matchesSearch = searchTerm === '' ||
        participant.participant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        participant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (participant.phone && participant.phone.includes(searchTerm));

      // Status filter
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        matchesStatus = participant.status === statusFilter;
      }

      return matchesSearch && matchesStatus;
    });
  }, [participants, searchTerm, statusFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-extrabold text-shortcut-navy-blue">
          Participants ({filteredParticipants.length} of {participants.length})
        </h3>
        <Button
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Participant</span>
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
              placeholder="Search participants by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="enrolled">Enrolled</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Add Participant Form */}
      {showAddForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-blue-900">Add New Participant</h4>
            <button
              onClick={cancelAdd}
              className="text-blue-600 hover:text-blue-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-shortcut-blue mb-2">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base ${
                  errors.name ? 'border-red-500' : 'border-gray-200'
                }`}
                placeholder="Participant name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-shortcut-blue mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base ${
                  errors.email ? 'border-red-500' : 'border-gray-200'
                }`}
                placeholder="participant@company.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-shortcut-blue mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base ${
                  errors.phone ? 'border-red-500' : 'border-gray-200'
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
              onClick={handleAddParticipant}
              disabled={saving}
              className="flex items-center space-x-2"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saving ? 'Adding...' : 'Add Participant'}</span>
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

      {/* Edit Participant Form */}
      {editingParticipant && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-yellow-900">Edit Participant</h4>
            <button
              onClick={cancelEdit}
              className="text-yellow-600 hover:text-yellow-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-shortcut-blue mb-2">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base ${
                  errors.name ? 'border-red-500' : 'border-gray-200'
                }`}
                placeholder="Participant name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-shortcut-blue mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base ${
                  errors.email ? 'border-red-500' : 'border-gray-200'
                }`}
                placeholder="participant@company.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-shortcut-blue mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base ${
                  errors.phone ? 'border-red-500' : 'border-gray-200'
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
              onClick={handleEditParticipant}
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

      {/* Participants List */}
      <div className="card-medium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b-2 border-shortcut-navy-blue">
                <th className="px-6 py-3 text-left text-xs font-bold text-shortcut-navy-blue uppercase tracking-wider">
                  Participant
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-shortcut-navy-blue uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-shortcut-navy-blue uppercase tracking-wider">
                  Documents
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-shortcut-navy-blue uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredParticipants.map((participant) => {
                const status = getStatusBadge(participant);
                const StatusIcon = status.icon;
                const documentCount = participant.documents?.length || 0;

                return (
                  <tr key={participant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {participant.participant_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {participant.email}
                        </div>
                        {participant.phone && (
                          <div className="text-sm text-gray-500">
                            {participant.phone}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${status.color}`}>
                        <StatusIcon className="w-4 h-4 mr-1" />
                        {status.text}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {documentCount} {documentCount === 1 ? 'document' : 'documents'}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={async () => {
                            const folderUrl = await getFolderUrl(participant.unique_token);
                            copyToClipboard(folderUrl, participant.unique_token);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="Copy folder link"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        {copiedLinks.has(participant.unique_token) && (
                          <span className="text-xs text-green-600">Copied!</span>
                        )}
                        <button
                          onClick={() => handleSendEmail(participant)}
                          disabled={sendingEmails.has(participant.id)}
                          className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                          title="Send email"
                        >
                          {sendingEmails.has(participant.id) ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          ) : (
                            <Mail className="w-4 h-4" />
                          )}
                        </button>
                        {participant.phone && (
                          <button
                            onClick={() => handleSendSMS(participant)}
                            disabled={sendingSMS.has(participant.id)}
                            className="text-green-600 hover:text-green-800 disabled:opacity-50"
                            title="Send SMS"
                          >
                            {sendingSMS.has(participant.id) ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                            ) : (
                              <MessageSquare className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleSendCalendarInvite(participant)}
                          className="text-purple-600 hover:text-purple-800"
                          title="Send calendar invite"
                        >
                          <Calendar className="w-4 h-4" />
                        </button>
                        {onUploadDocuments && (
                          <button
                            onClick={() => onUploadDocuments(participant.id, participant.participant_name)}
                            className="text-orange-600 hover:text-orange-800"
                            title="Upload documents"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => startEdit(participant)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit participant"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteParticipant(participant.id, participant.participant_name)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete participant"
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

          {filteredParticipants.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Participants Found</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Add participants to get started.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};



