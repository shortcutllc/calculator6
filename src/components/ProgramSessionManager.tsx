import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, X, Save, Calendar, Clock, MapPin, Video, Link as LinkIcon, Upload, FileText, CheckCircle, AlertCircle, ChevronUp, ChevronDown, CheckSquare, Square } from 'lucide-react';
import { Button } from './Button';
import { MindfulnessProgramService } from '../services/MindfulnessProgramService';
import { ProgramSession } from '../types/mindfulnessProgram';

interface ProgramSessionManagerProps {
  programId: string;
  onSessionsUpdate?: () => void;
}

interface SessionFormData {
  session_number: number;
  session_date: string;
  session_time: string;
  session_duration_minutes: number;
  session_type: 'in-person' | 'virtual';
  session_title: string;
  session_content: string;
  location: string;
  meeting_link: string;
}

export const ProgramSessionManager: React.FC<ProgramSessionManagerProps> = ({
  programId,
  onSessionsUpdate
}) => {
  const [sessions, setSessions] = useState<ProgramSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSession, setEditingSession] = useState<ProgramSession | null>(null);
  const [formData, setFormData] = useState<SessionFormData>({
    session_number: 1,
    session_date: '',
    session_time: '11:30',
    session_duration_minutes: 30,
    session_type: 'virtual',
    session_title: '',
    session_content: '',
    location: '',
    meeting_link: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [dateTBD, setDateTBD] = useState(false);
  const [timeTBD, setTimeTBD] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvParsedSessions, setCsvParsedSessions] = useState<Omit<ProgramSession, 'id' | 'program_id' | 'created_at' | 'updated_at'>[]>([]);
  const [csvError, setCsvError] = useState<string>('');
  const [uploadingCSV, setUploadingCSV] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [reorderingSession, setReorderingSession] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, [programId]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await MindfulnessProgramService.getSessionsByProgram(programId);
      setSessions(data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!dateTBD && !formData.session_date) {
      newErrors.session_date = 'Session date is required or select TBD';
    }

    if (formData.session_duration_minutes <= 0) {
      newErrors.session_duration_minutes = 'Duration must be greater than 0';
    }

    if (formData.session_type === 'in-person' && !formData.location.trim()) {
      newErrors.location = 'Location is required for in-person sessions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddSession = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      await MindfulnessProgramService.createSessions(programId, [{
        session_number: formData.session_number,
        session_date: dateTBD ? 'TBD' : formData.session_date,
        session_time: timeTBD ? 'TBD' : (formData.session_time || undefined),
        session_duration_minutes: formData.session_duration_minutes,
        session_type: formData.session_type,
        session_title: formData.session_title || undefined,
        session_content: formData.session_content || undefined,
        location: formData.location || undefined,
        meeting_link: formData.meeting_link || undefined
      }]);
      
      resetForm();
      setShowAddForm(false);
      await fetchSessions();
      if (onSessionsUpdate) {
        onSessionsUpdate();
      }
    } catch (error) {
      console.error('Error adding session:', error);
      alert('Failed to add session. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSession = async () => {
    if (!editingSession || !validateForm()) return;

    try {
      setSaving(true);
      await MindfulnessProgramService.updateSession(editingSession.id, {
        session_date: dateTBD ? 'TBD' : formData.session_date,
        session_time: timeTBD ? 'TBD' : (formData.session_time || undefined),
        session_duration_minutes: formData.session_duration_minutes,
        session_type: formData.session_type,
        session_title: formData.session_title || undefined,
        session_content: formData.session_content || undefined,
        location: formData.location || undefined,
        meeting_link: formData.meeting_link || undefined
      });
      
      resetForm();
      setEditingSession(null);
      await fetchSessions();
      if (onSessionsUpdate) {
        onSessionsUpdate();
      }
    } catch (error) {
      console.error('Error updating session:', error);
      alert('Failed to update session. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) {
      return;
    }

    try {
      await MindfulnessProgramService.deleteSession(sessionId);
      await fetchSessions();
      if (onSessionsUpdate) {
        onSessionsUpdate();
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete session. Please try again.');
    }
  };

  const startEdit = (session: ProgramSession) => {
    setEditingSession(session);
    setFormData({
      session_number: session.session_number,
      session_date: session.session_date === 'TBD' ? '' : session.session_date,
      session_time: session.session_time === 'TBD' ? '11:30' : (session.session_time || '11:30'),
      session_duration_minutes: session.session_duration_minutes || 30,
      session_type: session.session_type,
      session_title: session.session_title || '',
      session_content: session.session_content || '',
      location: session.location || '',
      meeting_link: session.meeting_link || ''
    });
    setDateTBD(session.session_date === 'TBD');
    setTimeTBD(session.session_time === 'TBD');
    setErrors({});
  };

  const resetForm = () => {
    const nextSessionNumber = sessions.length > 0 
      ? Math.max(...sessions.map(s => s.session_number)) + 1
      : 1;
    
    setFormData({
      session_number: nextSessionNumber,
      session_date: '',
      session_time: '11:30',
      session_duration_minutes: 30,
      session_type: 'virtual',
      session_title: '',
      session_content: '',
      location: '',
      meeting_link: ''
    });
    setDateTBD(false);
    setTimeTBD(false);
    setErrors({});
  };

  const cancelEdit = () => {
    setEditingSession(null);
    resetForm();
  };

  const handleBulkDelete = async () => {
    if (selectedSessions.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedSessions.size} session(s)?`)) {
      return;
    }

    try {
      const deletePromises = Array.from(selectedSessions).map(sessionId =>
        MindfulnessProgramService.deleteSession(sessionId)
      );
      await Promise.all(deletePromises);
      setSelectedSessions(new Set());
      await fetchSessions();
      onSessionsUpdate?.();
      alert(`Successfully deleted ${selectedSessions.size} session(s)!`);
    } catch (error) {
      console.error('Error deleting sessions:', error);
      alert('Failed to delete sessions. Please try again.');
    }
  };

  const handleMoveSession = async (sessionId: string, direction: 'up' | 'down') => {
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    if (sessionIndex === -1) return;

    const targetIndex = direction === 'up' ? sessionIndex - 1 : sessionIndex + 1;
    if (targetIndex < 0 || targetIndex >= sessions.length) return;

    const session = sessions[sessionIndex];
    const targetSession = sessions[targetIndex];

    // Swap session numbers
    const tempNumber = session.session_number;
    const newNumber = targetSession.session_number;

    try {
      setReorderingSession(sessionId);
      // Update both sessions
      await Promise.all([
        MindfulnessProgramService.updateSession(sessionId, { session_number: newNumber }),
        MindfulnessProgramService.updateSession(targetSession.id, { session_number: tempNumber })
      ]);
      await fetchSessions();
      if (onSessionsUpdate) {
        onSessionsUpdate();
      }
    } catch (error) {
      console.error('Error reordering sessions:', error);
      alert('Failed to reorder sessions. Please try again.');
    } finally {
      setReorderingSession(null);
    }
  };

  const toggleSessionSelection = (sessionId: string) => {
    const newSelected = new Set(selectedSessions);
    if (newSelected.has(sessionId)) {
      newSelected.delete(sessionId);
    } else {
      newSelected.add(sessionId);
    }
    setSelectedSessions(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedSessions.size === sessions.length) {
      setSelectedSessions(new Set());
    } else {
      setSelectedSessions(new Set(sessions.map(s => s.id)));
    }
  };

  const handleCSVFileSelect = (file: File) => {
    setCsvFile(file);
    setCsvError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        const parsed = MindfulnessProgramService.parseSessionsCSV(content);
        setCsvParsedSessions(parsed);
        if (parsed.length === 0) {
          setCsvError('No valid sessions found in CSV');
        }
      } catch (err) {
        setCsvError('Failed to parse CSV file');
        console.error('CSV parse error:', err);
      }
    };
    reader.readAsText(file);
  };

  const handleCSVUpload = async () => {
    if (csvParsedSessions.length === 0) {
      setCsvError('No sessions to upload');
      return;
    }

    setUploadingCSV(true);
    try {
      await MindfulnessProgramService.createSessions(programId, csvParsedSessions);
      await fetchSessions();
      onSessionsUpdate?.();
      setShowCSVUpload(false);
      setCsvFile(null);
      setCsvParsedSessions([]);
      setCsvError('');
      alert(`Successfully imported ${csvParsedSessions.length} sessions!`);
      
      // Trigger proposal update if linked
      if (onSessionsUpdate) {
        onSessionsUpdate();
      }
    } catch (error: any) {
      console.error('Error uploading CSV:', error);
      let errorMessage = 'Failed to upload sessions. Please try again.';
      
      if (error?.code === '23505' || error?.message?.includes('duplicate') || error?.message?.includes('unique')) {
        errorMessage = 'Some sessions with these numbers already exist. They have been updated instead.';
      } else if (error?.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      setCsvError(errorMessage);
      
      // If it's just a conflict that was handled, still refresh the sessions
      if (error?.code === '23505') {
        await fetchSessions();
        onSessionsUpdate?.();
      }
    } finally {
      setUploadingCSV(false);
    }
  };

  const cancelAdd = () => {
    setShowAddForm(false);
    resetForm();
  };

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
          Program Sessions ({sessions.length})
        </h3>
        <div className="flex items-center space-x-2">
          {selectedSessions.size > 0 && (
            <Button
              onClick={handleBulkDelete}
              variant="secondary"
              className="flex items-center space-x-2 text-red-600 hover:text-red-800"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({selectedSessions.size})</span>
            </Button>
          )}
          <Button
            onClick={() => setShowCSVUpload(true)}
            variant="secondary"
            className="flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>Upload CSV</span>
          </Button>
        <Button
          onClick={() => {
            resetForm();
            setShowAddForm(true);
          }}
          className="flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Session</span>
        </Button>
        </div>
      </div>

      {/* Add Session Form */}
      {showAddForm && (
        <div className="card-medium bg-shortcut-teal/5 border-2 border-shortcut-teal/20">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-extrabold text-shortcut-blue">Add New Session</h4>
            <button
              onClick={cancelAdd}
              className="text-text-dark-60 hover:text-shortcut-blue p-1.5 rounded-lg hover:bg-shortcut-teal/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-shortcut-blue mb-2">
                Session Number *
              </label>
              <input
                type="number"
                min="1"
                value={formData.session_number}
                onChange={(e) => setFormData(prev => ({ ...prev, session_number: parseInt(e.target.value) || 1 }))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-shortcut-blue mb-2">
                Session Date *
              </label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 mb-2">
                  <input
                    type="checkbox"
                    id="add-session-date-tbd"
                    checked={dateTBD}
                    onChange={(e) => {
                      setDateTBD(e.target.checked);
                      if (e.target.checked) {
                        setFormData(prev => ({ ...prev, session_date: '' }));
                      }
                    }}
                    className="w-4 h-4 text-shortcut-blue border-gray-300 rounded focus:ring-shortcut-teal"
                  />
                  <label htmlFor="add-session-date-tbd" className="text-sm text-gray-700">
                    Date TBD
                  </label>
                </div>
              <input
                type="date"
                value={formData.session_date}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, session_date: e.target.value }));
                    if (e.target.value) setDateTBD(false);
                  }}
                  disabled={dateTBD}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base ${
                  errors.session_date ? 'border-red-500' : 'border-gray-200'
                  } ${dateTBD ? 'bg-neutral-light-gray text-text-dark-60 cursor-not-allowed' : ''}`}
              />
              </div>
              {errors.session_date && (
                <p className="mt-1 text-sm text-red-600">{errors.session_date}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-shortcut-blue">
                Session Time
              </label>
                <label className="flex items-center space-x-2 text-sm text-shortcut-blue cursor-pointer">
                  <input
                    type="checkbox"
                    checked={timeTBD}
                    onChange={(e) => {
                      setTimeTBD(e.target.checked);
                      if (e.target.checked) {
                        setFormData(prev => ({ ...prev, session_time: '11:30' }));
                      }
                    }}
                    className="w-4 h-4 text-shortcut-teal focus:ring-shortcut-teal border-gray-300 rounded"
                  />
                  <span>Time TBD</span>
                </label>
              </div>
              <input
                type="time"
                value={formData.session_time}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, session_time: e.target.value }));
                  if (e.target.value) setTimeTBD(false);
                }}
                disabled={timeTBD}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base ${
                  timeTBD ? 'bg-neutral-light-gray text-text-dark-60 cursor-not-allowed' : 'border-gray-200'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-shortcut-blue mb-2">
                Duration (minutes) *
              </label>
              <input
                type="number"
                min="1"
                value={formData.session_duration_minutes}
                onChange={(e) => setFormData(prev => ({ ...prev, session_duration_minutes: parseInt(e.target.value) || 30 }))}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base ${
                  errors.session_duration_minutes ? 'border-red-500' : 'border-gray-200'
                }`}
              />
              {errors.session_duration_minutes && (
                <p className="mt-1 text-sm text-red-600">{errors.session_duration_minutes}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-shortcut-blue mb-2">
                Session Type *
              </label>
              <select
                value={formData.session_type}
                onChange={(e) => setFormData(prev => ({ ...prev, session_type: e.target.value as 'in-person' | 'virtual' }))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base"
              >
                <option value="virtual">Virtual</option>
                <option value="in-person">In-Person</option>
              </select>
            </div>

            {formData.session_type === 'in-person' && (
              <div>
                <label className="block text-sm font-bold text-shortcut-blue mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base ${
                    errors.location ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="Office address or room"
                />
                {errors.location && (
                  <p className="mt-1 text-sm text-red-600">{errors.location}</p>
                )}
              </div>
            )}

            {formData.session_type === 'virtual' && (
              <div>
                <label className="block text-sm font-bold text-shortcut-blue mb-2">
                  Meeting Link
                </label>
                <input
                  type="url"
                  value={formData.meeting_link}
                  onChange={(e) => setFormData(prev => ({ ...prev, meeting_link: e.target.value }))}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base ${
                    errors.meeting_link ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="https://zoom.us/j/..."
                />
                {errors.meeting_link && (
                  <p className="mt-1 text-sm text-red-600">{errors.meeting_link}</p>
                )}
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-shortcut-blue mb-2">
                Session Title
              </label>
              <input
                type="text"
                value={formData.session_title}
                onChange={(e) => setFormData(prev => ({ ...prev, session_title: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base"
                placeholder="e.g., Introduction to Mindfulness"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-shortcut-blue mb-2">
                Session Content
              </label>
              <textarea
                value={formData.session_content}
                onChange={(e) => setFormData(prev => ({ ...prev, session_content: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base resize-y"
                rows={4}
                placeholder="e.g., Body Scan meditation, Awareness of Breath meditation"
              />
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <Button
              onClick={handleAddSession}
              disabled={saving}
              className="flex items-center space-x-2"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saving ? 'Adding...' : 'Add Session'}</span>
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

      {/* Edit Session Form */}
      {editingSession && (
        <div className="card-medium bg-yellow-50/50 border-2 border-yellow-200/60">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-extrabold text-shortcut-blue">Edit Session</h4>
            <button
              onClick={cancelEdit}
              className="text-text-dark-60 hover:text-shortcut-blue p-1.5 rounded-lg hover:bg-yellow-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-shortcut-blue mb-2">
                Session Date *
              </label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 mb-2">
                  <input
                    type="checkbox"
                    id="edit-session-date-tbd"
                    checked={dateTBD}
                    onChange={(e) => {
                      setDateTBD(e.target.checked);
                      if (e.target.checked) {
                        setFormData(prev => ({ ...prev, session_date: '' }));
                      }
                    }}
                    className="w-4 h-4 text-shortcut-blue border-gray-300 rounded focus:ring-shortcut-teal"
                  />
                  <label htmlFor="edit-session-date-tbd" className="text-sm text-gray-700">
                    Date TBD
                  </label>
                </div>
              <input
                type="date"
                value={formData.session_date}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, session_date: e.target.value }));
                    if (e.target.value) setDateTBD(false);
                  }}
                  disabled={dateTBD}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base ${
                  errors.session_date ? 'border-red-500' : 'border-gray-200'
                  } ${dateTBD ? 'bg-neutral-light-gray text-text-dark-60 cursor-not-allowed' : ''}`}
              />
              </div>
              {errors.session_date && (
                <p className="mt-1 text-sm text-red-600">{errors.session_date}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-shortcut-blue">
                Session Time
              </label>
                <label className="flex items-center space-x-2 text-sm text-shortcut-blue cursor-pointer">
                  <input
                    type="checkbox"
                    checked={timeTBD}
                    onChange={(e) => {
                      setTimeTBD(e.target.checked);
                      if (e.target.checked) {
                        setFormData(prev => ({ ...prev, session_time: '11:30' }));
                      }
                    }}
                    className="w-4 h-4 text-shortcut-teal focus:ring-shortcut-teal border-gray-300 rounded"
                  />
                  <span>Time TBD</span>
                </label>
              </div>
              <input
                type="time"
                value={formData.session_time}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, session_time: e.target.value }));
                  if (e.target.value) setTimeTBD(false);
                }}
                disabled={timeTBD}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base ${
                  timeTBD ? 'bg-neutral-light-gray text-text-dark-60 cursor-not-allowed' : 'border-gray-200'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-shortcut-blue mb-2">
                Duration (minutes) *
              </label>
              <input
                type="number"
                min="1"
                value={formData.session_duration_minutes}
                onChange={(e) => setFormData(prev => ({ ...prev, session_duration_minutes: parseInt(e.target.value) || 30 }))}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base ${
                  errors.session_duration_minutes ? 'border-red-500' : 'border-gray-200'
                }`}
              />
              {errors.session_duration_minutes && (
                <p className="mt-1 text-sm text-red-600">{errors.session_duration_minutes}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-shortcut-blue mb-2">
                Session Type *
              </label>
              <select
                value={formData.session_type}
                onChange={(e) => setFormData(prev => ({ ...prev, session_type: e.target.value as 'in-person' | 'virtual' }))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base"
              >
                <option value="virtual">Virtual</option>
                <option value="in-person">In-Person</option>
              </select>
            </div>

            {formData.session_type === 'in-person' && (
              <div>
                <label className="block text-sm font-bold text-shortcut-blue mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base ${
                    errors.location ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="Office address or room"
                />
                {errors.location && (
                  <p className="mt-1 text-sm text-red-600">{errors.location}</p>
                )}
              </div>
            )}

            {formData.session_type === 'virtual' && (
              <div>
                <label className="block text-sm font-bold text-shortcut-blue mb-2">
                  Meeting Link
                </label>
                <input
                  type="url"
                  value={formData.meeting_link}
                  onChange={(e) => setFormData(prev => ({ ...prev, meeting_link: e.target.value }))}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base ${
                    errors.meeting_link ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="https://zoom.us/j/..."
                />
                {errors.meeting_link && (
                  <p className="mt-1 text-sm text-red-600">{errors.meeting_link}</p>
                )}
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-shortcut-blue mb-2">
                Session Title
              </label>
              <input
                type="text"
                value={formData.session_title}
                onChange={(e) => setFormData(prev => ({ ...prev, session_title: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base"
                placeholder="e.g., Introduction to Mindfulness"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-shortcut-blue mb-2">
                Session Content
              </label>
              <textarea
                value={formData.session_content}
                onChange={(e) => setFormData(prev => ({ ...prev, session_content: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base resize-y"
                rows={4}
                placeholder="e.g., Body Scan meditation, Awareness of Breath meditation"
              />
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <Button
              onClick={handleEditSession}
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

      {/* Sessions List */}
      {sessions.length > 0 ? (
        <div className="card-medium">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b-2 border-gray-200 bg-neutral-light-gray/30">
                  <th className="text-left py-4 px-4 text-sm font-extrabold text-shortcut-navy-blue" style={{ width: '40px' }}>
                    <button
                      onClick={toggleSelectAll}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="Select all"
                    >
                      {selectedSessions.size === sessions.length && sessions.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-shortcut-blue" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </th>
                  <th className="text-left py-4 px-4 text-sm font-extrabold text-shortcut-navy-blue" style={{ width: '60px' }}>Order</th>
                  <th className="text-left py-4 px-4 text-sm font-extrabold text-shortcut-navy-blue">Class</th>
                  <th className="text-left py-4 px-4 text-sm font-extrabold text-shortcut-navy-blue">Session Length</th>
                  <th className="text-left py-4 px-4 text-sm font-extrabold text-shortcut-navy-blue">Delivery Type</th>
                  <th className="text-left py-4 px-4 text-sm font-extrabold text-shortcut-navy-blue">Session Title</th>
                  <th className="text-left py-4 px-4 text-sm font-extrabold text-shortcut-navy-blue">Session Description</th>
                  <th className="text-left py-4 px-4 text-sm font-extrabold text-shortcut-navy-blue">Session Time</th>
                  <th className="text-left py-4 px-4 text-sm font-extrabold text-shortcut-navy-blue">Location</th>
                  <th className="text-left py-4 px-4 text-sm font-extrabold text-shortcut-navy-blue">Meeting Link</th>
                  <th className="text-left py-4 px-4 text-sm font-extrabold text-shortcut-navy-blue">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session, index) => (
                  <tr key={session.id} className="border-b border-gray-100 hover:bg-shortcut-teal/5 transition-colors">
                    <td className="py-4 px-4">
                      <button
                        onClick={() => toggleSessionSelection(session.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {selectedSessions.has(session.id) ? (
                          <CheckSquare className="w-4 h-4 text-shortcut-blue" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col space-y-1">
                        <button
                          onClick={() => handleMoveSession(session.id, 'up')}
                          disabled={index === 0 || reorderingSession === session.id}
                          className="p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Move up"
                        >
                          <ChevronUp className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleMoveSession(session.id, 'down')}
                          disabled={index === sessions.length - 1 || reorderingSession === session.id}
                          className="p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Move down"
                        >
                          <ChevronDown className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm font-extrabold text-shortcut-blue">Class {session.session_number}</span>
                    </td>
                    <td className="py-4 px-4 text-sm font-medium text-text-dark">
                      {session.session_duration_minutes}m {session.session_type === 'in-person' ? 'in-person' : 'virtual'}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold ${
                        session.session_type === 'in-person'
                          ? 'bg-shortcut-teal/20 text-shortcut-navy-blue border border-shortcut-teal/40'
                          : 'bg-purple-100 text-purple-700 border border-purple-200'
                      }`}>
                        {session.session_type === 'in-person' ? (
                          <MapPin className="w-3 h-3 mr-1" />
                        ) : (
                          <Video className="w-3 h-3 mr-1" />
                        )}
                        {session.session_type === 'in-person' ? 'In-Person' : 'Virtual'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm font-medium text-text-dark">
                      {session.session_title || <span className="text-text-dark-60">-</span>}
                    </td>
                    <td className="py-4 px-4 text-sm text-text-dark-60 max-w-xs">
                      {session.session_content ? (
                        <span className="line-clamp-2">{session.session_content}</span>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-sm text-text-dark">
                      {session.session_time === 'TBD' ? (
                        <span className="text-gray-500 italic">TBD</span>
                      ) : session.session_time ? (
                        new Date(`2000-01-01T${session.session_time}`).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-4 px-4 text-sm text-text-dark">
                      {session.location || <span className="text-text-dark-60">-</span>}
                    </td>
                    <td className="py-4 px-4 text-sm">
                      {session.meeting_link ? (
                        <a 
                          href={session.meeting_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-shortcut-blue hover:text-shortcut-navy-blue underline truncate block max-w-xs font-medium transition-colors"
                          title={session.meeting_link}
                        >
                          {session.meeting_link.length > 30 ? `${session.meeting_link.substring(0, 30)}...` : session.meeting_link}
                        </a>
                      ) : (
                        <span className="text-text-dark-60">-</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => startEdit(session)}
                          className="text-shortcut-blue hover:text-shortcut-navy-blue p-1.5 rounded-lg hover:bg-shortcut-teal/10 transition-colors"
                          title="Edit session"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete session"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card-medium text-center py-16">
          <Calendar className="w-16 h-16 text-text-dark-60 mx-auto mb-4" />
          <h3 className="text-lg font-extrabold text-shortcut-blue mb-3">No Sessions Added</h3>
          <p className="text-text-dark-60 text-base">
            Add sessions to create the program schedule.
          </p>
        </div>
      )}

      {/* CSV Upload Modal */}
      {showCSVUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b-2 border-gray-200">
              <h2 className="text-xl font-extrabold text-shortcut-blue">Import Sessions from CSV</h2>
              <button
                onClick={() => {
                  setShowCSVUpload(false);
                  setCsvFile(null);
                  setCsvParsedSessions([]);
                  setCsvError('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">CSV Format Requirements</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• First row should contain headers (see template below)</li>
                  <li>• Each row represents one session</li>
                  <li>• Required: session_number, session_date (or "TBD"), session_type (in-person/virtual)</li>
                  <li>• Column order: Class, Session Length, Delivery Type, Session Title, Session Description, Session Time, Location, Meeting Link</li>
                  <li>• Alternative column names accepted: session_number (Class), duration_minutes (Session Length), session_type (Delivery Type), session_title (Session Title), session_content (Session Description), session_time (Session Time), location (Location), meeting_link (Meeting Link)</li>
                </ul>
                <button
                  onClick={() => {
                    const template = 'Class,Session Length,Delivery Type,Session Title,Session Description,Session Time,Location,Meeting Link\n1,30,virtual,Introduction to Mindfulness,Body scan meditation,11:30,,https://zoom.us/j/123\n2,30,virtual,Awareness of Breath,Breathing exercises,11:30,,https://zoom.us/j/456';
                    const blob = new Blob([template], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'sessions_template.csv';
                    a.click();
                    window.URL.revokeObjectURL(url);
                  }}
                  className="mt-3 text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Download CSV template
                </button>
              </div>

              {/* File Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  csvFile
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file && file.name.toLowerCase().endsWith('.csv')) {
                    handleCSVFileSelect(file);
                  } else {
                    setCsvError('Please drop a CSV file');
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
              >
                {csvFile ? (
                  <div className="space-y-4">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                    <div>
                      <p className="text-lg font-medium text-gray-900">{csvFile.name}</p>
                      <p className="text-sm text-gray-600">
                        {csvParsedSessions.length} sessions found
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setCsvFile(null);
                        setCsvParsedSessions([]);
                        setCsvError('');
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                    >
                      Choose Different File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-lg font-medium text-gray-900">
                        Drop your CSV file here, or click to browse
                      </p>
                      <p className="text-sm text-gray-600">
                        Supports CSV files with session data
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Choose File
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleCSVFileSelect(file);
                      }}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              {/* Error Display */}
              {csvError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-800">{csvError}</p>
                </div>
              )}

              {/* Preview */}
              {csvParsedSessions.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900 flex items-center space-x-2">
                    <Calendar className="w-5 h-5" />
                    <span>Preview ({csvParsedSessions.length} sessions)</span>
                  </h3>

                  <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <div className="space-y-2">
                      {csvParsedSessions.slice(0, 10).map((session, index) => (
                        <div key={index} className="flex items-center space-x-4 text-sm bg-white p-2 rounded">
                          <div className="w-8 h-8 bg-shortcut-blue text-white rounded-full flex items-center justify-center text-xs font-medium">
                            {session.session_number}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {session.session_title || `Session ${session.session_number}`}
                            </div>
                            <div className="text-gray-600">
                              {session.session_date} • {session.session_type} • {session.session_duration_minutes}m
                            </div>
                          </div>
                        </div>
                      ))}
                      {csvParsedSessions.length > 10 && (
                        <div className="text-sm text-gray-500 text-center py-2">
                          ... and {csvParsedSessions.length - 10} more sessions
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowCSVUpload(false);
                    setCsvFile(null);
                    setCsvParsedSessions([]);
                    setCsvError('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCSVUpload}
                  disabled={csvParsedSessions.length === 0 || uploadingCSV}
                  className="flex-1"
                >
                  {uploadingCSV ? 'Uploading...' : `Upload ${csvParsedSessions.length} Sessions`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

