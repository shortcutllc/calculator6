import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, Users, CheckCircle, AlertCircle, XCircle, Trash2, Plus, Eye, Download } from 'lucide-react';
import { Button } from './Button';
import { MindfulnessProgramService } from '../services/MindfulnessProgramService';
import { ParticipantFolder, ProgramDocument, DocumentUploadProgress } from '../types/mindfulnessProgram';
import { supabase } from '../lib/supabaseClient';

interface DocumentUploaderProps {
  programId: string;
  onClose: () => void;
  onUploadComplete: () => void;
  specificParticipant?: { id: string; name: string } | null;
  documentType?: 'recording' | 'handout' | 'exercise' | 'other';
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  programId,
  onClose,
  onUploadComplete,
  specificParticipant,
  documentType = 'other'
}) => {
  const [folders, setFolders] = useState<ParticipantFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<ParticipantFolder | null>(null);
  const [uploadProgress, setUploadProgress] = useState<DocumentUploadProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [viewingDocuments, setViewingDocuments] = useState<ParticipantFolder | null>(null);
  const [programName, setProgramName] = useState<string>('Mindfulness Program');
  const [selectedDocumentType, setSelectedDocumentType] = useState<ProgramDocument['document_type']>(documentType);

  useEffect(() => {
    fetchProgramName();
    fetchFolders();
  }, [programId, specificParticipant]);

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

  const fetchFolders = async () => {
    try {
      setLoading(true);
      console.log('Fetching folders for programId:', programId);
      const data = await MindfulnessProgramService.getFoldersByProgram(programId);
      console.log('Fetched folders:', data);
      setFolders(data);

      // Auto-select specific participant if provided
      if (specificParticipant) {
        const targetFolder = data.find(folder => folder.id === specificParticipant.id);
        if (targetFolder) {
          setSelectedFolder(targetFolder);
        }
      }
    } catch (err) {
      console.error('Error fetching folders:', err);
      setError('Failed to load participant folders');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFolder = async (folderId: string, participantName: string) => {
    if (!confirm(`Are you sure you want to delete the folder for ${participantName}? This will also delete all associated documents.`)) {
      return;
    }

    try {
      await MindfulnessProgramService.deleteParticipantFolder(folderId);
      await fetchFolders();

      // Clear selection if it was the deleted folder
      if (selectedFolder?.id === folderId) {
        setSelectedFolder(null);
      }

      alert(`Successfully deleted folder for ${participantName}`);
    } catch (err) {
      console.error('Error deleting folder:', err);
      setError('Failed to delete folder');
    }
  };

  const handleDeleteDocument = async (documentId: string, documentName: string) => {
    if (!confirm(`Are you sure you want to delete this document?`)) {
      return;
    }

    try {
      await MindfulnessProgramService.deleteDocument(documentId);
      await fetchFolders();

      // Update viewing documents if we're viewing that folder
      if (viewingDocuments) {
        const updatedFolder = folders.find(f => f.id === viewingDocuments.id);
        if (updatedFolder) {
          setViewingDocuments(updatedFolder);
        }
      }

      alert('Document deleted successfully');
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Failed to delete document');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !selectedFolder) return;

    setUploading(true);
    setError('');

    try {
      // Initialize progress tracking
      const progress: DocumentUploadProgress = {
        folderId: selectedFolder.id,
        participantName: selectedFolder.participant_name,
        totalDocuments: files.length,
        uploadedDocuments: 0,
        progress: 0,
        status: 'uploading'
      };
      setUploadProgress([progress]);

      // Upload documents one by one
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        try {
          await MindfulnessProgramService.uploadDocument(
            selectedFolder.id,
            file,
            selectedDocumentType,
            file.name
          );

          // Update progress
          const updatedProgress = {
            ...progress,
            uploadedDocuments: i + 1,
            progress: Math.round(((i + 1) / files.length) * 100)
          };
          setUploadProgress([updatedProgress]);

        } catch (uploadError) {
          console.error(`Failed to upload ${file.name}:`, uploadError);
          setUploadProgress([{
            ...progress,
            status: 'error',
            error: `Failed to upload ${file.name}`
          }]);
          return;
        }
      }

      // Mark as completed
      setUploadProgress([{
        ...progress,
        status: 'completed'
      }]);

      // Refresh folders
      await fetchFolders();

      // Reset selection
      setSelectedFolder(null);

      // Clear file input
      e.target.value = '';

      alert(`Successfully uploaded ${files.length} document(s)!`);

    } catch (err) {
      setError('Failed to upload documents');
    } finally {
      setUploading(false);
    }
  };

  const getStatusIcon = (status: ParticipantFolder['status']) => {
    switch (status) {
      case 'pending':
        return <XCircle className="w-4 h-4 text-gray-400" />;
      case 'enrolled':
        return <CheckCircle className="w-4 h-4 text-yellow-500" />;
      case 'active':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <XCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: ParticipantFolder['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-600';
      case 'enrolled':
        return 'bg-yellow-100 text-yellow-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getDocumentTypeLabel = (type: ProgramDocument['document_type']) => {
    switch (type) {
      case 'recording':
        return 'Recording';
      case 'handout':
        return 'Handout';
      case 'exercise':
        return 'Exercise';
      default:
        return 'Other';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4">
        <div className="card-medium p-8">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-600">Loading participant folders...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4">
      <div className="card-large max-w-4xl w-full max-h-[90vh] overflow-y-auto z-[200] relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="h2">Upload Program Documents</h2>
          <button
            onClick={onClose}
            className="text-text-dark-60 hover:text-shortcut-blue transition-colors p-2 rounded-lg hover:bg-neutral-light-gray"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Instructions */}
          <div className="bg-shortcut-light-blue border border-shortcut-teal rounded-lg p-4">
            <h3 className="font-medium text-text-dark mb-2">Upload Instructions</h3>
            <ul className="text-sm text-text-dark space-y-1">
              <li>• Select a participant from the list below</li>
              <li>• Choose document type (recording, handout, exercise, other)</li>
              <li>• Upload one or multiple files</li>
              <li>• Documents will be organized by type in participant folders</li>
            </ul>
          </div>

          {/* Document Type Selection */}
          <div>
            <label className="block text-sm font-bold text-shortcut-blue mb-2">
              Document Type
            </label>
            <select
              value={selectedDocumentType}
              onChange={(e) => setSelectedDocumentType(e.target.value as ProgramDocument['document_type'])}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base"
            >
              <option value="recording">Recording</option>
              <option value="handout">Handout</option>
              <option value="exercise">Exercise</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Participant Selection */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Select Participant ({folders.length} total)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-64 overflow-y-auto">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all relative group ${
                    selectedFolder?.id === folder.id
                      ? 'border-shortcut-blue bg-shortcut-blue/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedFolder(folder)}
                >
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFolder(folder.id, folder.participant_name);
                    }}
                    className="absolute top-2 right-2 p-1 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete folder"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-center space-x-3 mb-2">
                    {getStatusIcon(folder.status)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(folder.status)}`}>
                      {folder.status}
                    </span>
                  </div>
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">{folder.participant_name}</div>
                    <div className="text-gray-600">{folder.email}</div>
                    {folder.documents && (
                      <div className="text-gray-500 mt-1">
                        {folder.documents.length} document{folder.documents.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {folder.documents && folder.documents.length > 0 && (
                    <div className="mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingDocuments(folder);
                        }}
                        className="w-full text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 px-2 py-1 rounded transition-colors"
                      >
                        <Eye className="w-3 h-3 inline mr-1" />
                        View Documents
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* File Upload */}
          {selectedFolder && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">
                Upload {getDocumentTypeLabel(selectedDocumentType)} for {selectedFolder.participant_name}
              </h3>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <div className="space-y-2">
                  <p className="text-lg font-medium text-gray-900">
                    Select documents to upload
                  </p>
                  <p className="text-sm text-gray-600">
                    Choose one or multiple files (PDF, MP3, MP4, etc.)
                  </p>
                </div>
                <input
                  type="file"
                  accept=".pdf,.mp3,.mp4,.doc,.docx,.txt"
                  multiple
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="mt-4"
                />
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploadProgress.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Upload Progress</h3>
              {uploadProgress.map((progress, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      {progress.participantName}
                    </span>
                    <span className="text-sm text-gray-600">
                      {progress.uploadedDocuments} / {progress.totalDocuments}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        progress.status === 'completed'
                          ? 'bg-green-500'
                          : progress.status === 'error'
                          ? 'bg-red-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${progress.progress}%` }}
                    />
                  </div>
                  {progress.status === 'completed' && (
                    <div className="mt-2 flex items-center text-green-600 text-sm">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Upload complete!
                    </div>
                  )}
                  {progress.status === 'error' && progress.error && (
                    <div className="mt-2 flex items-center text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {progress.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Viewing Documents Modal */}
          {viewingDocuments && (
            <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">
                  Documents for {viewingDocuments.participant_name}
                </h3>
                <button
                  onClick={() => setViewingDocuments(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {viewingDocuments.documents && viewingDocuments.documents.length > 0 ? (
                <div className="space-y-2">
                  {viewingDocuments.documents.map((document) => (
                    <div
                      key={document.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-blue-500" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {document.document_name || 'Untitled Document'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {getDocumentTypeLabel(document.document_type)} • {new Date(document.uploaded_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <a
                          href={document.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                          title="View document"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                        <a
                          href={document.document_url}
                          download
                          className="text-green-600 hover:text-green-800"
                          title="Download document"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleDeleteDocument(document.id, document.document_name || 'document')}
                          className="text-red-600 hover:text-red-800"
                          title="Delete document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p>No documents uploaded yet</p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Close
            </Button>
            {uploadProgress.length > 0 && uploadProgress[0].status === 'completed' && (
              <Button
                onClick={onUploadComplete}
                className="flex-1"
              >
                Done
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};



