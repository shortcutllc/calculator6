import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  FileText,
  Users,
  Calendar,
  Upload,
  Eye,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertCircle,
  Mail,
  MessageSquare,
  Download
} from 'lucide-react';
import { MindfulnessProgramService } from '../services/MindfulnessProgramService';
import { MindfulnessProgram, ParticipantFolder } from '../types/mindfulnessProgram';
import { supabase } from '../lib/supabaseClient';
import { formatLocalDateShort } from '../utils/dateHelpers';
import { DocumentUploader } from './DocumentUploader';

const FacilitatorDashboard: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [programs, setPrograms] = useState<MindfulnessProgram[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<MindfulnessProgram | null>(null);
  const [participants, setParticipants] = useState<ParticipantFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facilitatorName, setFacilitatorName] = useState<string>('Facilitator');
  const [showDocumentUploader, setShowDocumentUploader] = useState(false);
  const [uploadingForParticipant, setUploadingForParticipant] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (token) {
      validateAccess();
    }
  }, [token]);

  const validateAccess = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get facilitator by token (we'll use facilitator_id as token for now)
      // In production, you'd have a separate facilitator_tokens table
      const { data: facilitator, error: facilitatorError } = await supabase
        .from('facilitators')
        .select('*')
        .eq('id', token)
        .single();

      if (facilitatorError || !facilitator) {
        setError('Invalid or expired facilitator access. Please contact support.');
        return;
      }

      setFacilitatorName(facilitator.name);
      await fetchPrograms();

    } catch (err) {
      console.error('Error validating facilitator access:', err);
      setError('Failed to validate access. Please try again or contact support.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPrograms = async () => {
    try {
      const programsData = await MindfulnessProgramService.getProgramsByFacilitator(token!);
      setPrograms(programsData);
    } catch (err) {
      console.error('Error fetching programs:', err);
      setError('Failed to load programs. Please try again.');
    }
  };

  const fetchParticipants = async (programId: string) => {
    try {
      const participantsData = await MindfulnessProgramService.getFoldersByProgram(programId);
      setParticipants(participantsData);
    } catch (err) {
      console.error('Error fetching participants:', err);
    }
  };

  const handleSelectProgram = (program: MindfulnessProgram) => {
    setSelectedProgram(program);
    fetchParticipants(program.id);
  };

  const handleUploadDocuments = (participantId: string, participantName: string) => {
    setUploadingForParticipant({ id: participantId, name: participantName });
    setShowDocumentUploader(true);
  };

  const getStatusIcon = (status: MindfulnessProgram['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'draft':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: MindfulnessProgram['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validating facilitator access...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <a
            href="mailto:hello@getshortcut.co"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
          >
            <Mail className="w-4 h-4 mr-2" />
            Contact Support
          </a>
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
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Facilitator Portal</h1>
              <p className="text-gray-600 mt-1">Welcome, {facilitatorName}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Programs List */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Programs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.map((program) => (
              <div
                key={program.id}
                className={`card-medium cursor-pointer transition-all ${
                  selectedProgram?.id === program.id
                    ? 'border-shortcut-blue bg-shortcut-blue/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleSelectProgram(program)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(program.status)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(program.status)}`}>
                      {program.status}
                    </span>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">{program.program_name}</h3>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>{formatLocalDateShort(program.start_date)} - {formatLocalDateShort(program.end_date)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4" />
                    <span>{program.total_participants} participants</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {programs.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Programs Assigned</h3>
              <p className="text-gray-600">
                You don't have any programs assigned yet. Contact an administrator to get started.
              </p>
            </div>
          )}
        </div>

        {/* Selected Program Participants */}
        {selectedProgram && (
          <div className="card-large">
            <h2 className="h2 mb-6">
              Participants: {selectedProgram.program_name}
            </h2>

            {participants.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Participant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Documents
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {participants.map((participant) => {
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
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              participant.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : participant.status === 'active'
                                ? 'bg-blue-100 text-blue-800'
                                : participant.status === 'enrolled'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {participant.status}
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
                                onClick={() => handleUploadDocuments(participant.id, participant.participant_name)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Upload documents"
                              >
                                <Upload className="w-4 h-4" />
                              </button>
                              <a
                                href={`/participant-folder/${participant.unique_token}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-800"
                                title="View participant folder"
                              >
                                <Eye className="w-4 h-4" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Participants</h3>
                <p className="text-gray-600">
                  This program doesn't have any participants yet.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Document Uploader Modal */}
      {showDocumentUploader && selectedProgram && (
        <DocumentUploader
          programId={selectedProgram.id}
          onClose={() => {
            setShowDocumentUploader(false);
            setUploadingForParticipant(null);
          }}
          onUploadComplete={() => {
            if (selectedProgram) {
              fetchParticipants(selectedProgram.id);
            }
            setShowDocumentUploader(false);
            setUploadingForParticipant(null);
          }}
          specificParticipant={uploadingForParticipant}
        />
      )}
    </div>
  );
};

export default FacilitatorDashboard;



