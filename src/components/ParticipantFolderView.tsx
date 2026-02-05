import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Download, Mail, Calendar, AlertCircle, CheckCircle, Clock, User } from 'lucide-react';
import { MindfulnessProgramService } from '../services/MindfulnessProgramService';
import { ParticipantFolder, ProgramDocument, ProgramSession } from '../types/mindfulnessProgram';
import { supabase } from '../lib/supabaseClient';

const ParticipantFolderView: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [folder, setFolder] = useState<ParticipantFolder | null>(null);
  const [documents, setDocuments] = useState<ProgramDocument[]>([]);
  const [sessions, setSessions] = useState<ProgramSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchFolder();
    }
  }, [token]);

  const fetchFolder = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const folderData = await MindfulnessProgramService.getFolderByToken(token!);
      if (folderData) {
        setFolder(folderData);
        setDocuments(folderData.documents || []);

        // Fetch sessions for the program
        if (folderData.program) {
          const sessionsData = await MindfulnessProgramService.getSessionsByProgram(folderData.program.id);
          setSessions(sessionsData);
        }
      } else {
        setError('Folder not found. Please check your link or contact support.');
      }
    } catch (err) {
      console.error('Error fetching folder:', err);
      setError('Failed to load your folder. Please try again or contact support.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (documentUrl: string, documentName: string) => {
    try {
      // Fetch the document as a blob
      const response = await fetch(documentUrl);
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = documentName || 'document';
      document.body.appendChild(link);
      link.click();

      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      // Fallback to opening in new tab
      window.open(documentUrl, '_blank');
    }
  };

  const groupDocumentsByType = (docs: ProgramDocument[]) => {
    const grouped: Record<string, ProgramDocument[]> = {
      recording: [],
      handout: [],
      exercise: [],
      other: []
    };

    docs.forEach(doc => {
      if (grouped[doc.document_type]) {
        grouped[doc.document_type].push(doc);
      } else {
        grouped.other.push(doc);
      }
    });

    return grouped;
  };

  const getDocumentTypeLabel = (type: ProgramDocument['document_type']) => {
    switch (type) {
      case 'recording':
        return 'Recordings';
      case 'handout':
        return 'Handouts';
      case 'exercise':
        return 'Exercises';
      default:
        return 'Other Documents';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your folder...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500">
            If you have any questions, please contact hello@getshortcut.co
          </p>
        </div>
      </div>
    );
  }

  if (!folder) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Folder Not Found</h1>
          <p className="text-gray-600 mb-6">The folder you're looking for doesn't exist or has expired.</p>
          <p className="text-sm text-gray-500">
            If you have any questions, please contact hello@getshortcut.co
          </p>
        </div>
      </div>
    );
  }

  const groupedDocuments = groupDocumentsByType(documents);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-1">Your Mindfulness Program Folder</h1>
              <p className="text-lg text-gray-600">Welcome back, {folder.participant_name}</p>
              {folder.program && (
                <p className="text-sm text-gray-500">{folder.program.program_name}</p>
              )}
            </div>

            {/* Status Badge */}
            <div className="flex-shrink-0">
              <span className={`px-4 py-2 rounded-full text-sm font-medium border ${
                folder.status === 'completed'
                  ? 'bg-green-100 text-green-800 border-green-200'
                  : folder.status === 'active'
                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                  : folder.status === 'enrolled'
                  ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                  : 'bg-gray-100 text-gray-800 border-gray-200'
              }`}>
                {folder.status.charAt(0).toUpperCase() + folder.status.slice(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Program Sessions */}
        {sessions.length > 0 && (
          <div className="mb-8 card-medium">
            <h2 className="text-xl font-extrabold text-shortcut-navy-blue mb-4">Program Schedule</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-bold text-shortcut-navy-blue">Class</th>
                    <th className="text-center py-3 px-4 text-sm font-bold text-shortcut-navy-blue">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-bold text-shortcut-navy-blue">Duration</th>
                    <th className="text-left py-3 px-4 text-sm font-bold text-shortcut-navy-blue">Content</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.id} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        Class {session.session_number}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 text-center">
                        {new Date(session.session_date).toLocaleDateString('en-US', {
                          month: '2-digit',
                          day: '2-digit'
                        })}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {session.session_duration_minutes}m {session.session_type}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {session.session_content || session.session_title || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Documents Section */}
        <div className="card-large">
          <h2 className="h2 mb-6">Your Program Documents</h2>

          {documents.length > 0 ? (
            <div className="space-y-8">
              {Object.entries(groupedDocuments).map(([type, docs]) => {
                if (docs.length === 0) return null;

                return (
                  <div key={type} className="space-y-4">
                    <h3 className="text-xl font-extrabold text-shortcut-navy-blue">
                      {getDocumentTypeLabel(type as ProgramDocument['document_type'])}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {docs.map((document) => (
                        <div
                          key={document.id}
                          className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-shortcut-blue transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 flex-1">
                              <FileText className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {document.document_name || 'Untitled Document'}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {new Date(document.uploaded_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDownload(document.document_url, document.document_name || 'document')}
                              className="ml-4 text-blue-600 hover:text-blue-800 flex-shrink-0"
                              title="Download document"
                            >
                              <Download className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Available</h3>
              <p className="text-gray-600">
                Documents will appear here once your facilitator uploads them.
              </p>
            </div>
          )}
        </div>

        {/* Contact Information */}
        <div className="mt-16 pt-8 border-t border-gray-200">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              <div className="flex items-center justify-center mb-3">
                <span className="text-gray-600 font-medium">Powered by</span>
                <img
                  src="/shortcut-logo-blue.svg"
                  alt="Shortcut"
                  className="h-6 w-auto ml-1"
                />
              </div>
              <p className="text-gray-600 mb-2">
                Need help or have questions about your program?
              </p>
              <a
                href="mailto:hello@getshortcut.co"
                className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                <Mail className="w-4 h-4 mr-2" />
                hello@getshortcut.co
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantFolderView;



