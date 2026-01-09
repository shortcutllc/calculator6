import React, { useState, useEffect } from 'react';
import {
  Plus,
  Calendar,
  Users,
  FileText,
  Upload,
  Eye,
  Trash2,
  Edit,
  CheckCircle,
  Clock,
  AlertCircle,
  Link,
  Mail,
  ExternalLink,
  X
} from 'lucide-react';
import { Button } from './Button';
import { MindfulnessProgramService } from '../services/MindfulnessProgramService';
import { MindfulnessProgram, MindfulnessProgramStats, CSVParticipantData } from '../types/mindfulnessProgram';
import { MindfulnessProgramModal } from './MindfulnessProgramModal';
import { CSVUploader } from './CSVUploader';
import { ParticipantFolderManager } from './ParticipantFolderManager';
import { ProgramSessionManager } from './ProgramSessionManager';
import { formatLocalDateShort } from '../utils/dateHelpers';
import { useProposal } from '../contexts/ProposalContext';
import { useNavigate } from 'react-router-dom';
import { generateMindfulnessProposalData } from '../utils/mindfulnessProposalGenerator';
import { ProgramSession } from '../types/mindfulnessProgram';
import { supabase } from '../lib/supabaseClient';

const MindfulnessProgramManager: React.FC = () => {
  const { createProposal, updateProposal } = useProposal();
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<MindfulnessProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState<MindfulnessProgram | null>(null);
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<MindfulnessProgram | null>(null);
  const [showCSVUploader, setShowCSVUploader] = useState(false);
  const [programStats, setProgramStats] = useState<MindfulnessProgramStats | null>(null);
  const [activeTab, setActiveTab] = useState<'participants' | 'sessions' | 'documents'>('participants');
  const [sessions, setSessions] = useState<ProgramSession[]>([]);
  const [showGenerateProposalModal, setShowGenerateProposalModal] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [generatingProposal, setGeneratingProposal] = useState(false);

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const data = await MindfulnessProgramService.getPrograms();
      setPrograms(data);
    } catch (error) {
      console.error('Error fetching programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProgramStats = async (programId: string) => {
    try {
      const stats = await MindfulnessProgramService.getProgramStats(programId);
      setProgramStats(stats);
    } catch (error) {
      console.error('Error fetching program stats:', error);
    }
  };

  const fetchSessions = async (programId: string) => {
    try {
      const sessionsData = await MindfulnessProgramService.getSessionsByProgram(programId);
      setSessions(sessionsData);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  // Auto-update linked proposal when program or sessions change
  const updateLinkedProposal = async (programId: string, proposalId: string) => {
    try {
      const latestProgram = await MindfulnessProgramService.getProgram(programId);
      const latestSessions = await MindfulnessProgramService.getSessionsByProgram(programId);
      
      if (latestSessions.length === 0) {
        console.log('No sessions to update proposal with');
        return;
      }

      // Get the existing proposal to preserve client name/email and customization
      const { data: existingProposal } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', proposalId)
        .single();

      if (!existingProposal) {
        console.warn('Proposal not found for auto-update');
        return;
      }

      // Preserve pricing BEFORE regeneration (critical for persistence)
      const existingPricing = existingProposal.data?.mindfulnessProgram?.pricing ? {
        inPersonPricePerSession: existingProposal.data.mindfulnessProgram.pricing.inPersonPricePerSession,
        virtualPricePerSession: existingProposal.data.mindfulnessProgram.pricing.virtualPricePerSession,
        resourcesPrice: existingProposal.data.mindfulnessProgram.pricing.resourcesPrice,
        discountPercent: existingProposal.data.mindfulnessProgram.pricing.discountPercent ?? 0
      } : undefined;

      console.log('💾 Auto-updating proposal - preserving pricing:', existingPricing);

      // Regenerate proposal data with latest program and sessions
      // Preserve the original client name/email from the proposal
      const regeneratedData = generateMindfulnessProposalData(
        latestProgram,
        latestSessions,
        existingProposal.data?.clientName || existingProposal.client_name || 'Client',
        existingProposal.data?.clientEmail || existingProposal.client_email,
        existingPricing // Pass existing pricing to preserve it
      );

      // Update the proposal with regenerated data, preserving customization
      await updateProposal(proposalId, {
        data: regeneratedData,
        customization: existingProposal.customization, // Preserve customization
        clientLogoUrl: latestProgram.client_logo_url || existingProposal.client_logo_url,
        clientEmail: existingProposal.client_email // Preserve client email
      });

      console.log('✅ Auto-updated proposal with preserved pricing:', regeneratedData.mindfulnessProgram?.pricing);

      console.log('✅ Auto-updated proposal with latest program and sessions', {
        programName: latestProgram.program_name,
        sessionCount: latestSessions.length
      });
    } catch (error) {
      console.error('Error auto-updating proposal:', error);
      throw error;
    }
  };

  const handleGenerateProposal = async () => {
    if (!selectedProgram || !clientName.trim()) {
      alert('Please enter a client name');
      return;
    }

    if (sessions.length === 0) {
      alert('Please add at least one session before generating a proposal');
      return;
    }

    try {
      setGeneratingProposal(true);

      // Extract client name from program name (e.g., "Three-Month Mindfulness Program for Betterment" -> "Betterment")
      const extractedClientName = clientName.trim() || selectedProgram.program_name.split(' for ').pop() || 'Client';

      // Fetch the latest program data to ensure we have the most recent logo
      const latestProgram = await MindfulnessProgramService.getProgram(selectedProgram.id);
      
      // Generate proposal data with latest program (including logo)
      const proposalData = generateMindfulnessProposalData(
        latestProgram,
        sessions,
        extractedClientName,
        clientEmail.trim() || undefined
      );

      // Create proposal with default customization
      const customization = {
        includeSummary: true,
        includeCalculations: false,
        includeCalculator: false,
        customNote: `We're thrilled to partner with ${extractedClientName} and look forward to helping your team enhance focus, build resilience, and achieve greater balance.`,
        programIntroCopy: `This comprehensive mindfulness program is derived from the evidence-based eight-week Mindfulness-Based Stress Reduction (MBSR) program developed by Jon Kabat-Zinn. We've designed this program to be tailored to ${extractedClientName}'s team, blending proven practices with a flexible approach that can be delivered over three months or a custom, extended schedule to fit seamlessly into your workplace culture.

We understand the importance of offering impactful wellness solutions that respect your team's time and maintain consistency.`
      };

      const proposalId = await createProposal(
        proposalData,
        customization,
        clientEmail.trim() || undefined,
        false
      );

      // Link proposal to program
      await MindfulnessProgramService.updateProgram(selectedProgram.id, {
        proposal_id: proposalId
      });

      // Navigate to proposal
      navigate(`/proposal/${proposalId}`);
    } catch (error) {
      console.error('Error generating proposal:', error);
      alert('Failed to generate proposal. Please try again.');
    } finally {
      setGeneratingProposal(false);
      setShowGenerateProposalModal(false);
    }
  };

  const handleCreateProgram = async (programData: Omit<MindfulnessProgram, 'id' | 'created_at' | 'updated_at' | 'total_participants'>) => {
    try {
      const newProgram = await MindfulnessProgramService.createProgram(programData);
      setPrograms([newProgram, ...programs]);
      setShowProgramModal(false);
    } catch (error) {
      console.error('Error creating program:', error);
      alert('Failed to create program. Please try again.');
    }
  };

  const handleEditProgram = (program: MindfulnessProgram) => {
    setEditingProgram(program);
    setShowProgramModal(true);
  };

  const handleUpdateProgram = async (programData: Omit<MindfulnessProgram, 'id' | 'created_at' | 'updated_at' | 'total_participants'>) => {
    if (!editingProgram) return;

    console.log('🔍 MindfulnessProgramManager - Updating program with data:', {
      programId: editingProgram.id,
      hasLogo: !!programData.client_logo_url,
      logoUrl: programData.client_logo_url,
      allData: programData
    });

    try {
      const updatedProgram = await MindfulnessProgramService.updateProgram(editingProgram.id, programData);
      
      console.log('✅ MindfulnessProgramManager - Program updated, received:', {
        hasLogo: !!updatedProgram.client_logo_url,
        logoUrl: updatedProgram.client_logo_url
      });
      
      const updatedPrograms = programs.map(p => p.id === editingProgram.id ? updatedProgram : p);
      setPrograms(updatedPrograms);
      
      // Auto-update linked proposal if it exists
      if (updatedProgram.proposal_id) {
        try {
          await updateLinkedProposal(updatedProgram.id, updatedProgram.proposal_id);
        } catch (err) {
          console.warn('Failed to auto-update proposal:', err);
        }
      }
      
      // Update selectedProgram if it's the one being edited
      if (selectedProgram?.id === editingProgram.id) {
        setSelectedProgram(updatedProgram);
        // Refresh sessions if program was updated
        await fetchSessions(updatedProgram.id);
      }
      
      setShowProgramModal(false);
      setEditingProgram(null);
      
      // Auto-update linked proposal if it exists
      if (updatedProgram.proposal_id) {
        try {
          await updateLinkedProposal(updatedProgram.id, updatedProgram.proposal_id);
          alert('Program and linked proposal updated successfully!');
        } catch (err) {
          console.warn('Failed to auto-update proposal:', err);
          alert('Program updated successfully, but failed to update linked proposal.');
        }
      } else {
      alert('Program updated successfully!');
      }
    } catch (error) {
      console.error('Error updating program:', error);
      alert('Failed to update program. Please try again.');
    }
  };

  const handleDeleteProgram = async (programId: string) => {
    if (!confirm('Are you sure you want to delete this program? This will also delete all associated participant folders and documents.')) {
      return;
    }

    try {
      await MindfulnessProgramService.deleteProgram(programId);
      setPrograms(programs.filter(p => p.id !== programId));
      if (selectedProgram?.id === programId) {
        setSelectedProgram(null);
        setProgramStats(null);
      }
    } catch (error) {
      console.error('Error deleting program:', error);
      alert('Failed to delete program. Please try again.');
    }
  };

  const handleCSVUpload = async (participants: CSVParticipantData[]) => {
    if (!selectedProgram) return;

    try {
      console.log('Creating folders for program:', selectedProgram.id, 'with participants:', participants);
      const folders = await MindfulnessProgramService.createParticipantFolders(selectedProgram.id, participants);
      console.log('Created folders:', folders);
      await fetchProgramStats(selectedProgram.id);
      setShowCSVUploader(false);
      alert(`Successfully imported ${participants.length} participants!`);
    } catch (error) {
      console.error('Error uploading CSV:', error);
      alert('Failed to upload CSV. Please try again.');
    }
  };

  const getStatusIcon = (status: MindfulnessProgram['status']) => {
    switch (status) {
      case 'draft':
        return <Edit className="w-4 h-4 text-gray-500" />;
      case 'active':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'archived':
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: MindfulnessProgram['status']) => {
    switch (status) {
      case 'draft':
        return 'bg-neutral-light-gray text-text-dark-60 border-gray-300';
      case 'active':
        return 'bg-shortcut-teal/20 text-shortcut-navy-blue border-shortcut-teal/40';
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'archived':
        return 'bg-gray-100 text-text-dark-60 border-gray-300';
      default:
        return 'bg-neutral-light-gray text-text-dark-60 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-light-gray">
      <div className="max-w-7xl mx-auto px-5 lg:px-[90px] py-8 lg:py-12">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="h1">Mindfulness Program Management</h1>
              <p className="text-text-dark-60 mt-3 text-base">Manage mindfulness programs and participant folders</p>
            </div>
            <Button
              onClick={() => setShowProgramModal(true)}
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Program</span>
            </Button>
          </div>

          {/* Programs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.map((program) => (
              <div
                key={program.id}
                className={`card-medium transition-all cursor-pointer ${
                  selectedProgram?.id === program.id
                    ? 'border-shortcut-blue bg-shortcut-blue/5'
                    : ''
                }`}
            onClick={() => {
              setSelectedProgram(program);
              fetchProgramStats(program.id);
              fetchSessions(program.id);
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2">
                {getStatusIcon(program.status)}
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(program.status)}`}>
                  {program.status.charAt(0).toUpperCase() + program.status.slice(1)}
                </span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditProgram(program);
                  }}
                  className="text-shortcut-blue hover:text-shortcut-navy-blue p-1.5 rounded-lg hover:bg-shortcut-teal/10 transition-colors"
                  title="Edit program"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProgram(program.id);
                  }}
                  className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  title="Delete program"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h3 className="text-xl font-extrabold text-shortcut-blue mb-3">{program.program_name}</h3>

            <div className="space-y-2.5 text-sm text-text-dark-60">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>{formatLocalDateShort(program.start_date)} - {formatLocalDateShort(program.end_date)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>{program.total_participants} participants</span>
              </div>
              {program.facilitator && (
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-shortcut-teal" />
                  <span className="text-shortcut-blue font-bold">{program.facilitator.name}</span>
                </div>
              )}
            </div>

            {selectedProgram?.id === program.id && programStats && (
              <div className="mt-5 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <div className="text-lg font-extrabold text-shortcut-blue">{programStats.enrolled}</div>
                    <div className="text-xs text-text-dark-60 mt-1">Enrolled</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-extrabold text-shortcut-teal">{programStats.active}</div>
                    <div className="text-xs text-text-dark-60 mt-1">Active</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-extrabold text-green-600">{programStats.completed}</div>
                    <div className="text-xs text-text-dark-60 mt-1">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-extrabold text-shortcut-navy-blue">{programStats.total_participants}</div>
                    <div className="text-xs text-text-dark-60 mt-1">Total</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Selected Program Content */}
      {selectedProgram && (
        <div className="card-large mt-6">
          {/* Program Header */}
          <div className="mb-8 pb-6 border-b border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                {selectedProgram.client_logo_url && !selectedProgram.client_logo_url.includes('mindfulness-program-documents/client-logos') && (
                  <div className="mb-4">
                    <img
                      src={selectedProgram.client_logo_url}
                      alt="Client logo"
                      className="max-h-16 max-w-full object-contain"
                      onError={(e) => {
                        console.error('Logo failed to load:', selectedProgram.client_logo_url);
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <h2 className="h2">
                  Program: {selectedProgram.program_name}
                </h2>
              </div>
              <Button
                onClick={() => handleEditProgram(selectedProgram)}
                variant="secondary"
                className="flex items-center space-x-2"
              >
                <Edit className="w-4 h-4" />
                <span>Edit Program</span>
              </Button>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {[
                  { key: 'participants', label: 'Participants', icon: Users },
                  { key: 'sessions', label: 'Sessions', icon: Calendar },
                  { key: 'documents', label: 'Documents', icon: FileText }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as 'participants' | 'sessions' | 'documents')}
                    className={`py-3 px-1 border-b-2 font-bold text-sm flex items-center space-x-2 transition-colors ${
                      activeTab === tab.key
                        ? 'border-shortcut-teal text-shortcut-blue'
                        : 'border-transparent text-text-dark-60 hover:text-shortcut-blue hover:border-shortcut-teal/30'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === 'participants' && (
              <div className="space-y-6">
                <div className="flex flex-wrap gap-4">
                  <Button
                    onClick={() => setShowCSVUploader(true)}
                    variant="secondary"
                    className="flex items-center space-x-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Import Participants (CSV)</span>
                  </Button>
                </div>

                <ParticipantFolderManager
                  programId={selectedProgram.id}
                  onParticipantUpdate={() => fetchProgramStats(selectedProgram.id)}
                  onUploadDocuments={(participantId, participantName) => {
                    // TODO: Open DocumentUploader modal
                    console.log('Upload documents for:', participantId, participantName);
                  }}
                />
              </div>
            )}

            {activeTab === 'sessions' && (
              <div className="space-y-6">
                <ProgramSessionManager
                  programId={selectedProgram.id}
                  onSessionsUpdate={async () => {
                    await fetchSessions(selectedProgram.id);
                    // Auto-update linked proposal if it exists
                    if (selectedProgram.proposal_id) {
                      try {
                        await updateLinkedProposal(selectedProgram.id, selectedProgram.proposal_id);
                      } catch (err) {
                        console.warn('Failed to auto-update proposal:', err);
                      }
                    }
                  }}
                />
                
                {sessions.length > 0 && (
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    {selectedProgram.proposal_id ? (
                        <Button
                          onClick={() => navigate(`/proposal/${selectedProgram.proposal_id}`)}
                          className="flex items-center space-x-2"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View Proposal</span>
                        </Button>
                    ) : (
                      <Button
                        onClick={() => {
                          // Extract client name from program name
                          const nameParts = selectedProgram.program_name.split(' for ');
                          setClientName(nameParts.length > 1 ? nameParts[nameParts.length - 1] : '');
                          setShowGenerateProposalModal(true);
                        }}
                        className="flex items-center space-x-2"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Generate Proposal</span>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-extrabold text-shortcut-blue">Program Documents</h3>
                  <p className="text-text-dark-60 text-sm">
                    Documents are managed per participant folder.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
        </div>
      </div>

      {/* Modals */}
      {showProgramModal && (
        <MindfulnessProgramModal
          onClose={() => {
            setShowProgramModal(false);
            setEditingProgram(null);
          }}
          onSubmit={editingProgram ? handleUpdateProgram : handleCreateProgram}
          editingProgram={editingProgram}
        />
      )}

      {showCSVUploader && selectedProgram && (
        <CSVUploader
          onClose={() => setShowCSVUploader(false)}
          onUpload={handleCSVUpload}
          type="mindfulness"
          label="participants"
        />
      )}

      {/* Generate Proposal Modal */}
      {showGenerateProposalModal && selectedProgram && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4">
          <div className="card-large max-w-md w-full z-[200] relative">
            <div className="flex items-center justify-between mb-8">
              <h2 className="h2">Generate Proposal</h2>
              <button
                onClick={() => setShowGenerateProposalModal(false)}
                className="text-text-dark-60 hover:text-shortcut-blue transition-colors p-2 rounded-lg hover:bg-neutral-light-gray"
                aria-label="Close modal"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-shortcut-blue mb-2">
                  Client Name *
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base"
                  placeholder="e.g., Betterment"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-shortcut-blue mb-2">
                  Client Email (Optional)
                </label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base"
                  placeholder="client@company.com"
                />
              </div>

              <div className="bg-shortcut-light-blue border border-shortcut-teal rounded-lg p-4">
                <p className="text-sm text-text-dark">
                  This will create a proposal matching the structure of the mindfulness program document, including:
                </p>
                <ul className="text-sm text-text-dark mt-2 space-y-1 list-disc list-inside">
                  <li>Program overview and schedule</li>
                  <li>Session details ({sessions.length} sessions)</li>
                  <li>Cost breakdown</li>
                  <li>Resources and benefits</li>
                </ul>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowGenerateProposalModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerateProposal}
                  disabled={generatingProposal || !clientName.trim()}
                  className="flex-1"
                >
                  {generatingProposal ? 'Generating...' : 'Generate Proposal'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MindfulnessProgramManager;

