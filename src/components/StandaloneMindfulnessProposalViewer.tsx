import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Check, X, History as HistoryIcon, Download, ChevronLeft, ChevronRight, Mail, User, Calendar, FileText, HelpCircle, CheckCircle2, Clock, MapPin, Video, Heart, Brain, Sparkles, ExternalLink, Infinity } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { LoadingSpinner } from './LoadingSpinner';
import { usePageTitle } from '../hooks/usePageTitle';
import { config } from '../config';
import { format } from 'date-fns';
import { generatePDF } from '../utils/pdf';
import { Button } from './Button';
import ServiceAgreement from './ServiceAgreement';
import ChangeConfirmationModal from './ChangeConfirmationModal';
import { trackProposalChanges, getChangeDisplayInfo } from '../utils/changeTracker';
import { ProposalChangeSet } from '../types/proposal';
import ProposalSurveyForm from './ProposalSurveyForm';
import { ChangeSourceBadge } from './ChangeSourceBadge';
import { MindfulnessProposalContent } from './MindfulnessProposalContent';
import { generateMindfulnessProposalData } from '../utils/mindfulnessProposalGenerator';
import { MindfulnessProgramService } from '../services/MindfulnessProgramService';

const formatCurrency = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '0';
  // Format with commas for thousands
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numValue);
};

const formatDate = (dateString: string): string => {
  try {
    if (!dateString) return 'TBD';
    if (dateString === 'TBD' || dateString === 'Date TBD' || dateString.toLowerCase().includes('tbd')) return 'TBD';
    
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return format(date, 'MMM dd, yyyy');
    }
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'TBD';
    return format(date, 'MMM dd, yyyy');
  } catch (err) {
    console.error('Error formatting date:', err);
    return 'TBD';
  }
};

export const StandaloneMindfulnessProposalViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  usePageTitle('View Mindfulness Program Proposal');

  const [proposal, setProposal] = useState<any>(null);
  const [displayData, setDisplayData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<any>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<any[]>([]);
  const [showChangeConfirmation, setShowChangeConfirmation] = useState(false);
  const [clientComment, setClientComment] = useState('');
  const [isSubmittingChanges, setIsSubmittingChanges] = useState(false);
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [showChangesSaved, setShowChangesSaved] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [showApprovalSuccess, setShowApprovalSuccess] = useState(false);
  const [showApprovalConfirm, setShowApprovalConfirm] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [changeSets, setChangeSets] = useState<ProposalChangeSet[]>([]);
  const [showChangeHistory, setShowChangeHistory] = useState(false);
  const [hasSurveyResponse, setHasSurveyResponse] = useState(false);
  const [showSurveyCTA, setShowSurveyCTA] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [proposalOptions, setProposalOptions] = useState<any[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [programData, setProgramData] = useState<any>(null);
  
  // View tracking state
  const [hasTrackedView, setHasTrackedView] = useState(false);

  // Function to track proposal view
  const trackProposalView = async (proposalId: string, proposalData: any) => {
    try {
      // Check if current user is authenticated (logged in)
      // If they are authenticated, they're a team member - don't track (skip notifications)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // Only track if it's a client view (not authenticated = client)
      if (currentUser) {
        console.log('Skipping view tracking - authenticated team member view');
        return;
      }

      // Insert view record into database
      const { error: viewError } = await supabase
        .from('proposal_views')
        .insert({
          proposal_id: proposalId,
          user_agent: navigator.userAgent || null,
          viewed_at: new Date().toISOString()
        });

      if (viewError) {
        console.error('Error tracking proposal view:', viewError);
      }

      // Send Slack notification for view
      try {
        const response = await fetch('/.netlify/functions/proposal-event-notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventType: 'view',
            proposalId: proposalId,
            clientName: proposalData.client_name || proposalData.data?.clientName || 'Unknown',
            clientEmail: proposalData.client_email || proposalData.data?.clientEmail,
            proposalType: proposalData.proposal_type || 'mindfulness-program',
            totalCost: proposalData.data?.mindfulnessProgram?.pricing?.totalCost || 0,
            eventDates: proposalData.data?.mindfulnessProgram?.sessions?.map((s: any) => s.date) || [],
            locations: []
          })
        });

        if (!response.ok) {
          console.error('Failed to send view notification to Slack');
        }
      } catch (slackError) {
        console.error('Error sending Slack notification:', slackError);
        // Don't fail view tracking if Slack fails
      }
    } catch (error) {
      console.error('Error tracking proposal view:', error);
      // Don't block the UI if tracking fails
    }
  };

  // Function to send Slack notification for proposal events
  const sendProposalEventNotification = async (
    eventType: 'view' | 'edit' | 'changes_submitted' | 'approve' | 'approved',
    proposalData?: any
  ) => {
    if (!id || !proposal) return;

    try {
      const dataToUse = proposalData || proposal;
      const displayDataToUse = displayData || dataToUse.data;
      const mindfulnessProgram = displayDataToUse?.mindfulnessProgram;

      await fetch('/.netlify/functions/proposal-event-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType: eventType,
          proposalId: id,
          clientName: dataToUse.client_name || displayDataToUse?.clientName || 'Unknown',
          clientEmail: dataToUse.client_email || displayDataToUse?.clientEmail,
          proposalType: 'mindfulness-program',
          totalCost: mindfulnessProgram?.pricing?.totalCost || 0,
          eventDates: mindfulnessProgram?.sessions?.map((s: any) => s.date) || [],
          locations: []
        })
      });
    } catch (error) {
      console.error('Error sending Slack notification:', error);
      // Don't block the UI if Slack notification fails
    }
  };

  useEffect(() => {
    if (!id) {
      setError('Proposal ID is required');
      setLoading(false);
      return;
    }

    const fetchProposal = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('proposals')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error('Proposal not found');

        // Verify this is a mindfulness program proposal
        if (data.proposal_type !== 'mindfulness-program' && !data.data?.mindfulnessProgram) {
          // Redirect to regular proposal viewer
          navigate(`/proposal/${id}${location.search}`, { replace: true });
          return;
        }

        setProposal(data);
        
        // Fetch linked mindfulness program to get latest data (logo, name, sessions)
        let programLogoUrl = null;
        let latestProgramData = null;
        let latestSessions = [];
        
        if (data.proposal_type === 'mindfulness-program' && data.data?.mindfulnessProgram?.programId) {
          try {
            // Fetch latest program data using the service to ensure proper structure
            const programId = data.data.mindfulnessProgram.programId;
            latestProgramData = await MindfulnessProgramService.getProgram(programId);
            
            if (latestProgramData) {
              programLogoUrl = latestProgramData.client_logo_url;
              setProgramData(latestProgramData); // Store program data for participant check
              
              // Fetch latest sessions
              latestSessions = await MindfulnessProgramService.getSessionsByProgram(programId);
            }
          } catch (err) {
            console.warn('Could not fetch program data:', err);
          }
        }
        
        // Preserve pricing BEFORE regeneration (critical for persistence)
        const existingPricing = data.data?.mindfulnessProgram?.pricing ? {
          inPersonPricePerSession: data.data.mindfulnessProgram.pricing.inPersonPricePerSession,
          virtualPricePerSession: data.data.mindfulnessProgram.pricing.virtualPricePerSession,
          resourcesPrice: data.data.mindfulnessProgram.pricing.resourcesPrice,
          discountPercent: data.data.mindfulnessProgram.pricing.discountPercent ?? 0
        } : undefined;

        // Regenerate proposal data with latest program and sessions if available
        // Always regenerate if we have program data to ensure we get the latest name and sessions
        let displayDataToUse = data.data;
        if (latestProgramData) {
          try {
            // Use latest sessions if available, otherwise fall back to stored sessions
            const sessionsToUse = latestSessions.length > 0 
              ? latestSessions 
              : (data.data?.mindfulnessProgram?.sessions || []);
            
            const regeneratedData = generateMindfulnessProposalData(
              latestProgramData,
              sessionsToUse,
              data.data?.clientName || data.client_name || 'Client',
              data.data?.clientEmail || data.client_email,
              existingPricing // Pass existing pricing to preserve it
            );
            // Use the regenerated data which has the latest program name and sessions
            // This completely replaces the old data, ensuring no duplicates
            // Make sure we're using ONLY the regenerated data, not merging with old data
            displayDataToUse = {
              ...regeneratedData,
              // Preserve client name/email from proposal if they exist
              clientName: data.data?.clientName || data.client_name || regeneratedData.clientName,
              clientEmail: data.data?.clientEmail || data.client_email || regeneratedData.clientEmail
            };
            console.log('✅ Regenerated proposal data with latest program and sessions (shared view)', {
              newProgramName: regeneratedData.mindfulnessProgram?.programName,
              sessionCount: regeneratedData.mindfulnessProgram?.sessions?.length,
              preservedPricing: existingPricing,
              regeneratedPricing: regeneratedData.mindfulnessProgram?.pricing
            });
          } catch (err) {
            console.warn('Could not regenerate proposal data:', err);
            // Fall back to stored data if regeneration fails
          }
        }
        
        // Ensure customization object exists and has default intro copy if missing
        const customization = data.customization || {};
        if (!customization.programIntroCopy && (data.client_name || displayDataToUse?.clientName)) {
          const clientName = data.client_name || displayDataToUse?.clientName || 'your team';
          // Add default intro copy template if it doesn't exist
          customization.programIntroCopy = `This comprehensive mindfulness program is derived from the evidence-based eight-week Mindfulness-Based Stress Reduction (MBSR) program developed by Jon Kabat-Zinn. We've designed this program to be tailored to ${clientName}'s team, blending proven practices with a flexible approach that can be delivered over three months or a custom, extended schedule to fit seamlessly into your workplace culture.

We understand the importance of offering impactful wellness solutions that respect your team's time and maintain consistency.`;
        }
        
        // Ensure pricing is properly set (should already be preserved from regeneration, but verify)
        if (displayDataToUse.mindfulnessProgram && !displayDataToUse.mindfulnessProgram.pricing) {
          // If no pricing exists, initialize with defaults
          const inPersonSessions = displayDataToUse.mindfulnessProgram.inPersonSessions || 0;
          const virtualSessions = displayDataToUse.mindfulnessProgram.virtualSessions || 0;
          const subtotal = (inPersonSessions * 1500) + (virtualSessions * 1250) + 2000;
          displayDataToUse.mindfulnessProgram.pricing = {
            inPersonPricePerSession: 1500,
            virtualPricePerSession: 1250,
            resourcesPrice: 2000,
            discountPercent: 0,
            inPersonTotal: inPersonSessions * 1500,
            virtualTotal: virtualSessions * 1250,
            subtotal: subtotal,
            discountAmount: 0,
            totalCost: subtotal,
            costPerParticipant: 0,
            costPerSession: 0
          };
          console.warn('⚠️ Pricing was missing after regeneration (shared view), initialized with defaults');
        } else if (displayDataToUse.mindfulnessProgram?.pricing) {
          // Ensure all pricing fields are present and recalculate totals
          const pricing = displayDataToUse.mindfulnessProgram.pricing;
          const inPersonSessions = displayDataToUse.mindfulnessProgram.inPersonSessions || 0;
          const virtualSessions = displayDataToUse.mindfulnessProgram.virtualSessions || 0;
          const inPersonPrice = pricing.inPersonPricePerSession || 1500;
          const virtualPrice = pricing.virtualPricePerSession || 1250;
          const resourcesPrice = pricing.resourcesPrice || 2000;
          const discountPercent = pricing.discountPercent ?? 0;
          
          const inPersonTotal = inPersonSessions * inPersonPrice;
          const virtualTotal = virtualSessions * virtualPrice;
          const subtotal = inPersonTotal + virtualTotal + resourcesPrice;
          const discountAmount = subtotal * (discountPercent / 100);
          const totalCost = subtotal - discountAmount;
          
          displayDataToUse.mindfulnessProgram.pricing.inPersonTotal = inPersonTotal;
          displayDataToUse.mindfulnessProgram.pricing.virtualTotal = virtualTotal;
          displayDataToUse.mindfulnessProgram.pricing.subtotal = subtotal;
          displayDataToUse.mindfulnessProgram.pricing.discountPercent = discountPercent;
          displayDataToUse.mindfulnessProgram.pricing.discountAmount = discountAmount;
          displayDataToUse.mindfulnessProgram.pricing.totalCost = totalCost;
          
          // Update summary
          if (displayDataToUse.summary) {
            displayDataToUse.summary.totalEventCost = totalCost;
          }
          
          console.log('✅ Pricing loaded and recalculated (shared view):', displayDataToUse.mindfulnessProgram.pricing);
        }
        
        // Merge client_logo_url from proposal record, or fallback to program logo
        // Use regenerated data which already has the latest mindfulnessProgram
        const displayDataWithLogo = {
          ...displayDataToUse,
          customization: customization,
          clientLogoUrl: displayDataToUse?.clientLogoUrl || data.client_logo_url || programLogoUrl || null
        };
        setDisplayData(displayDataWithLogo);
        setEditedData(displayDataWithLogo);
        setNotes(data.notes || '');

        if (data.original_data) {
          setChangeSets([{
            id: data.id,
            proposalId: data.id,
            changes: trackProposalChanges(data.original_data, data.data, data.client_email, data.client_name),
            clientEmail: data.client_email,
            clientName: data.client_name,
            clientComment: data.client_comment || '',
            status: data.pending_review ? 'pending' : (data.status === 'approved' ? 'approved' : 'pending'),
            submittedAt: data.updated_at,
            reviewedBy: data.reviewed_by,
            reviewedAt: data.reviewed_at,
            adminComment: data.admin_comment,
            changeSource: data.change_source,
            userId: data.user_id
          }]);
        }

        // Track view (only once, not on refresh)
        // The trackProposalView function will check if it's a client view
        if (!hasTrackedView) {
          trackProposalView(id, data);
          setHasTrackedView(true);
        }

        // Check survey response
        if (data.status === 'approved') {
          const { data: surveyData } = await supabase
            .from('proposal_survey_responses')
            .select('id')
            .eq('proposal_id', id)
            .maybeSingle();
          
          setHasSurveyResponse(!!surveyData);
          if (!surveyData) {
            setShowSurveyCTA(true);
          }
        }

        // Fetch proposal options if this proposal is part of a group
        if (data.proposal_group_id) {
          fetchProposalOptions(data.proposal_group_id);
        }
      } catch (err) {
        console.error('Error fetching proposal:', err);
        setError(err instanceof Error ? err.message : 'Failed to load proposal');
      } finally {
        setLoading(false);
      }
    };

    fetchProposal();
  }, [id, navigate, location.search]);

  // Fetch proposal options if this proposal is part of a group
  const fetchProposalOptions = async (groupId: string | null) => {
    if (!groupId || !id) return;
    
    try {
      setIsLoadingOptions(true);
      const { data, error } = await supabase
        .from('proposals')
        .select('id, option_name, option_order, status, client_name, data, proposal_type')
        .eq('proposal_group_id', groupId)
        .order('option_order', { ascending: true, nullsFirst: false });

      if (error) {
        console.error('Error fetching proposal options:', error);
        return;
      }

      if (data && data.length > 1) {
        // Calculate summary metrics for each option
        const optionsWithMetrics = data.map((option: any) => {
          const summary = option.data?.summary || {};
          const mindfulnessProgram = option.data?.mindfulnessProgram;

          // For mindfulness proposals, always use 'unlimited' for totalAppointments
          let totalAppointments = 'unlimited';

          return {
            ...option,
            totalCost: summary.totalEventCost || mindfulnessProgram?.pricing?.totalCost || 0,
            totalAppointments: totalAppointments,
            eventDates: option.data?.eventDates || [],
            proposal_type: option.proposal_type || null,
            totalSessions: mindfulnessProgram?.totalSessions || 0
          };
        });
        setProposalOptions(optionsWithMetrics);
      } else {
        setProposalOptions([]);
      }
    } catch (err) {
      console.error('Error fetching proposal options:', err);
      setProposalOptions([]);
    } finally {
      setIsLoadingOptions(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!id) return;

    try {
      setIsSavingNotes(true);
      const { error } = await supabase
        .from('proposals')
        .update({ notes })
        .eq('id', id);

      if (error) throw error;
      setShowChangesSaved(true);
      setTimeout(() => setShowChangesSaved(false), 3000);
    } catch (err) {
      console.error('Error saving notes:', err);
      alert('Failed to save notes. Please try again.');
    } finally {
      setIsSavingNotes(false);
    }
  };


  const handleDownload = async () => {
    if (!displayData) return;

    try {
      setIsDownloading(true);
      const filename = `${displayData.clientName?.replace(/\s+/g, '-').toLowerCase() || 'mindfulness-program'}-proposal.pdf`;
      await generatePDF('proposal-content', filename);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleApproval = async () => {
    if (!id || !displayData) return;
    
    try {
      setIsApproving(true);
      
      const updateData: any = {
        data: displayData,
        status: 'approved',
        pending_review: false,
        has_changes: false,
        change_source: 'client'
      };

      const { error: updateError } = await supabase
        .from('proposals')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      setProposal((prev: typeof proposal) => prev ? { ...prev, status: 'approved' } : null);

      // Send email approval notification (existing)
      const response = await fetch(`${config.supabase.url}/functions/v1/proposal-approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.supabase.anonKey}`,
        },
        body: JSON.stringify({
          proposalId: id,
          clientEmail: displayData.clientEmail,
          clientName: displayData.clientName
        })
      });

      if (!response.ok) {
        console.error('Failed to send email approval notification');
      }

      // Send Slack notification for approval
      sendProposalEventNotification('approved', {
        ...proposal,
        data: displayData
      });

      setShowApprovalSuccess(true);
      setShowApprovalConfirm(false);
      setTimeout(() => setShowApprovalSuccess(false), 5000);
    } catch (err) {
      console.error('Error approving proposal:', err);
      alert('Failed to approve proposal. Please try again.');
    } finally {
      setIsApproving(false);
    }
  };

  const checkSurveyResponse = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('proposal_survey_responses')
      .select('id')
      .eq('proposal_id', id)
      .maybeSingle();
    setHasSurveyResponse(!!data);
    setShowSurveyCTA(!data);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-light-gray flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error || !displayData) {
    return (
      <div className="min-h-screen bg-neutral-light-gray flex items-center justify-center">
        <div className="card-medium text-center">
          <div className="text-red-500 mb-4">
            <X size={48} className="mx-auto" />
          </div>
          <p className="text-xl text-red-500 mb-4">{error || 'Proposal not found'}</p>
          <Button onClick={() => navigate('/')} variant="primary">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  // Get program from displayData - this should be the regenerated data with latest name
  const program = displayData.mindfulnessProgram;
  if (!program) {
    return (
      <div className="min-h-screen bg-neutral-light-gray flex items-center justify-center">
        <div className="card-medium text-center">
          <p className="text-xl text-red-500 mb-4">This proposal is not a mindfulness program</p>
          <Button onClick={() => navigate(`/proposal/${id}${location.search}`)} variant="primary">
            View as Regular Proposal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-light-gray">
      {/* Update Indicator */}
      {showChangesSaved && (
        <div className="fixed top-0 left-0 w-full z-50 flex justify-center">
          <div className="bg-green-500 text-white px-4 py-2 rounded-b-lg shadow-md mt-0 text-center text-sm">
            Changes saved successfully!
          </div>
        </div>
      )}

      {/* Survey CTA Banner */}
      {showSurveyCTA && proposal?.status === 'approved' && !hasSurveyResponse && (
        <div className="fixed top-0 left-0 w-full z-[98] bg-blue-600 text-white px-4 py-3 shadow-lg">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5" />
              <div>
                <p className="font-semibold">Complete the Program Details Survey</p>
                <p className="text-sm text-blue-100">Please fill out the survey below to help us prepare for your program</p>
              </div>
            </div>
            <button
              onClick={() => {
                const surveyElement = document.getElementById('proposal-survey-form');
                if (surveyElement) {
                  surveyElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              Go to Survey ↓
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`bg-white shadow-sm sticky ${showSurveyCTA ? 'top-16' : 'top-0'} z-[99] rounded-b-3xl`}>
        <div className="max-w-[1600px] mx-auto px-4 py-3 sm:py-4 sm:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-4">
              <img 
                src="/shortcut-logo blue.svg" 
                alt="Shortcut Logo" 
                className="h-7 sm:h-8 w-auto"
              />
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 rounded-full shadow-sm text-xs sm:text-sm">
                  <X size={16} className="text-red-600 flex-shrink-0" />
                  <span className="font-bold truncate">{error}</span>
                </div>
              )}
              {showChangesSaved && (
                <div className="flex items-center gap-2 bg-shortcut-teal bg-opacity-20 text-shortcut-navy-blue px-3 sm:px-4 py-2 rounded-full border border-shortcut-teal shadow-sm text-xs sm:text-sm">
                  <CheckCircle2 size={16} className="text-shortcut-teal-blue flex-shrink-0" />
                  <span className="font-bold hidden sm:inline">Your changes have been saved successfully!</span>
                  <span className="font-bold sm:hidden">Changes saved!</span>
                </div>
              )}
              {showApprovalSuccess ? (
                <div className="flex items-center gap-2 bg-shortcut-teal bg-opacity-20 text-shortcut-navy-blue px-3 sm:px-4 py-2 rounded-full border border-shortcut-teal shadow-sm text-xs sm:text-sm">
                  <CheckCircle2 size={16} className="text-shortcut-teal-blue flex-shrink-0" />
                  <span className="font-bold hidden sm:inline">Thank you! Your program proposal has been approved and our team has been notified.</span>
                  <span className="font-bold sm:hidden">Proposal approved!</span>
                </div>
              ) : proposal?.status === 'approved' && (
                <div className="flex items-center gap-2 bg-shortcut-teal bg-opacity-20 text-shortcut-navy-blue px-3 sm:px-4 py-2 rounded-full border border-shortcut-teal shadow-sm text-xs sm:text-sm">
                  <CheckCircle2 size={16} className="text-shortcut-teal-blue flex-shrink-0" />
                  <span className="font-bold hidden sm:inline">Program approved! Our team has been notified.</span>
                  <span className="font-bold sm:hidden">Program approved!</span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setShowHelpModal(true)}
                  className="p-2 rounded-lg hover:bg-neutral-light-gray transition-colors flex-shrink-0"
                  aria-label="How to view this proposal"
                  title="Help"
                >
                  <HelpCircle size={18} className="text-shortcut-blue sm:w-5 sm:h-5" />
                </button>
                {proposal?.status === 'approved' ? (
                  <div className="flex items-center text-green-600 bg-green-50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-green-200 text-xs sm:text-sm">
                    <CheckCircle2 size={16} className="mr-1.5 sm:mr-2 flex-shrink-0" />
                    <span className="font-semibold whitespace-nowrap">Program Approved</span>
                  </div>
                ) : (
                  <Button
                    onClick={() => setShowApprovalConfirm(true)}
                    variant="green"
                    icon={<Check size={16} />}
                    loading={isApproving}
                    className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2"
                  >
                    <span className="hidden sm:inline">{isApproving ? 'Approving...' : 'Approve Program'}</span>
                    <span className="sm:hidden">{isApproving ? 'Approving...' : 'Approve'}</span>
                  </Button>
                )}
                <Button
                  onClick={handleDownload}
                  variant="secondary"
                  icon={<Download size={16} />}
                  loading={isDownloading}
                  className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2"
                >
                  <span className="hidden sm:inline">{isDownloading ? 'Downloading...' : 'Download PDF'}</span>
                  <span className="sm:hidden">{isDownloading ? 'Downloading...' : 'Download'}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Proposal Options Switcher - Style Guide Compliant Design */}
      {proposalOptions.length > 1 && (
        <div className={`bg-white border-b-2 border-shortcut-navy-blue border-opacity-10 sticky ${showSurveyCTA ? 'top-[80px]' : 'top-[64px]'} z-[98] shadow-lg`}>
          <div className="max-w-[1600px] mx-auto px-5 lg:px-[90px] py-8 lg:py-12">
            {/* Section Header - Following Typography System */}
            <div className="mb-8">
              <h2 className="h2 mb-3">Compare Your Options</h2>
              <p className="text-base text-text-dark-60 font-medium">Select an option below to view full details and pricing</p>
            </div>
            
            {/* Options Grid - Using Card System */}
            <div className="flex items-stretch gap-6 overflow-x-auto pb-6 pt-4 px-6 hide-scrollbar">
              {proposalOptions.map((option, index) => {
                const isActive = option.id === id;
                const optionLabel = option.option_name || `Option ${index + 1}`;
                const isApproved = option.status === 'approved';
                const isMindfulness = option.proposal_type === 'mindfulness-program';
                const eventCount = option.eventDates?.length || 0;
                const sessionCount = option.totalSessions || 0;
                
                return (
                  <button
                    key={option.id}
                    onClick={() => {
                      navigate(`/proposal/${option.id}?shared=true`);
                    }}
                    className={`relative flex flex-col min-w-[280px] sm:min-w-[320px] card-small flex-shrink-0 group transition-all duration-300 ${
                      isActive
                        ? 'bg-shortcut-navy-blue text-white shadow-2xl scale-[1.02] ring-4 ring-shortcut-teal ring-opacity-30'
                        : 'hover:translate-y-[-2px]'
                    }`}
                    style={isActive ? {
                      background: '#003756',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.06)'
                    } : {}}
                  >
                    {/* Approved Badge - Top Right */}
                    {isApproved && (
                      <div className={`absolute -top-2 -right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg z-10 ${
                        isActive
                          ? 'bg-shortcut-teal text-shortcut-navy-blue'
                          : 'bg-shortcut-teal text-shortcut-navy-blue'
                      }`}>
                        <CheckCircle2 size={14} />
                        Approved
                      </div>
                    )}
                    
                    {/* Option Number Badge - Top Left */}
                    <div className={`absolute -top-2 -left-2 w-10 h-10 rounded-full flex items-center justify-center text-sm font-extrabold shadow-md z-10 ${
                      isActive
                        ? 'bg-shortcut-teal text-shortcut-navy-blue'
                        : 'bg-shortcut-navy-blue text-white'
                    }`}>
                      {index + 1}
                    </div>
                    
                    {/* Option Header - Following Typography System */}
                    <div className="mb-6 mt-4">
                      <h3 className={`text-xl font-extrabold mb-2 ${isActive ? 'text-white' : 'text-shortcut-navy-blue'}`}>
                        {optionLabel}
                      </h3>
                      {isMindfulness && sessionCount > 0 && (
                        <p className={`text-sm font-medium ${isActive ? 'text-blue-100' : 'text-text-dark-60'}`}>
                          {sessionCount} {sessionCount === 1 ? 'Session' : 'Sessions'}
                        </p>
                      )}
                      {!isMindfulness && eventCount > 0 && (
                        <p className={`text-sm font-medium ${isActive ? 'text-blue-100' : 'text-text-dark-60'}`}>
                          {eventCount} {eventCount === 1 ? 'Event Date' : 'Event Dates'}
                        </p>
                      )}
                    </div>
                    
                    {/* Key Metrics - Prominent Display */}
                    <div className="mt-auto space-y-4 pt-6 border-t" style={{ borderColor: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.1)' }}>
                      <div className="flex justify-between items-baseline">
                        <span className={`text-xs font-bold uppercase tracking-wide ${isActive ? 'text-blue-100' : 'text-text-dark-60'}`}>
                          Total Cost
                        </span>
                        <span className={`text-2xl font-extrabold ${isActive ? 'text-white' : 'text-shortcut-navy-blue'}`}>
                          ${(option.totalCost || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm font-semibold ${isActive ? 'text-blue-100' : 'text-text-dark-60'}`}>
                          Total Appointments
                        </span>
                        <span className={`text-lg font-bold ${isActive ? 'text-white' : 'text-shortcut-blue'}`}>
                          {option.totalAppointments === 0 || option.totalAppointments === 'unlimited' ? '∞' : option.totalAppointments}
                        </span>
                      </div>
                    </div>
                    
                    {/* Active Indicator Bar */}
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-2 bg-shortcut-teal rounded-b-[20px]"></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={`max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24 ${
        proposalOptions.length > 1 
          ? (showSurveyCTA ? 'pt-8' : 'pt-8') 
          : (showSurveyCTA ? 'pt-24' : 'pt-16')
      } pb-12`} id="proposal-content">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Main Content - Left Column (wider) */}
          <div className="lg:col-span-8 space-y-10">
            {/* Top Summary Card */}
            <div className="card-large scroll-mt-24">
              <div className="mb-12">
                {/* Header with Logo and Program Title */}
                <div className="mb-8">
                  {displayData.clientLogoUrl ? (
                    <div className="flex justify-start mb-6">
                      <img
                        src={displayData.clientLogoUrl}
                        alt={`${displayData.clientName} Logo`}
                        className="max-h-16 sm:max-h-20 max-w-full object-contain rounded-lg shadow-sm"
                        style={{ maxWidth: '280px' }}
                        onError={(e) => {
                          console.error('Logo failed to load:', displayData.clientLogoUrl);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : null}
                  <div className="flex-1">
                    <h1 className="h1 mb-3">
                      {displayData.clientName}
                    </h1>
                    {/* Only show program name if it's different from client name and not already included */}
                    {program?.programName && 
                     program.programName !== displayData.clientName && 
                     !displayData.clientName.includes(program.programName) &&
                     program.programName.trim() !== '' && (
                      <h2 className="text-xl sm:text-2xl font-bold text-shortcut-navy-blue">
                        {program.programName}
                      </h2>
                    )}
                  </div>
                </div>
                
                {/* Program Intro Copy - Enhanced Design */}
                {displayData.customization?.programIntroCopy && (
                  <div className="mt-8 lg:mt-10 pt-8 lg:pt-10">
                    <div className="relative overflow-hidden bg-gradient-to-br from-shortcut-teal/10 via-white to-shortcut-teal/5 rounded-2xl p-6 lg:p-8 border-2 border-shortcut-teal border-opacity-20 shadow-sm hover:shadow-md transition-all">
                      {/* Decorative accent line */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-shortcut-teal via-shortcut-teal/50 to-transparent"></div>
                      {/* Content */}
                      <div className="relative">
                        <p className="text-base lg:text-lg text-text-dark leading-relaxed font-medium whitespace-pre-line">
                          {displayData.customization.programIntroCopy}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 border-t-2 border-shortcut-teal border-opacity-20">
                <div className="p-8 bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 rounded-xl border-2 border-shortcut-teal border-opacity-30 hover:border-opacity-50 transition-all hover:shadow-md">
                  <p className="text-xs font-bold text-shortcut-blue mb-4 uppercase tracking-wider">Program Dates</p>
                  <p className="text-xl font-extrabold text-shortcut-navy-blue leading-tight">
                    {formatDate(program.startDate)} – {formatDate(program.endDate)}
                  </p>
                </div>
                <div className="p-8 bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 rounded-xl border-2 border-shortcut-teal border-opacity-30 hover:border-opacity-50 transition-all hover:shadow-md">
                  <p className="text-xs font-bold text-shortcut-blue mb-4 uppercase tracking-wider">Total Sessions</p>
                  <p className="text-4xl font-extrabold text-shortcut-navy-blue">
                    {program.totalSessions || 0}
                  </p>
                </div>
                <div className="p-8 bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 rounded-xl border-2 border-shortcut-teal border-opacity-30 hover:border-opacity-50 transition-all hover:shadow-md">
                  <p className="text-xs font-bold text-shortcut-blue mb-4 uppercase tracking-wider">Participants</p>
                  {(() => {
                    // Check if participants are specifically set (greater than 0) in the program
                    // Use programData.total_participants if available, otherwise fall back to displayData
                    const participantCount = programData?.total_participants ?? displayData.summary?.totalAppointments ?? 0;
                    const hasSpecificCount = participantCount > 0;
                    
                    return hasSpecificCount ? (
                      <p className="text-4xl font-extrabold text-shortcut-navy-blue">
                        {participantCount}
                      </p>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <Infinity className="w-10 h-10 lg:w-12 lg:h-12 text-shortcut-navy-blue" strokeWidth={2.5} />
                        <span className="text-2xl lg:text-3xl font-extrabold text-shortcut-navy-blue">Unlimited</span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Mindfulness Proposal Content */}
            <MindfulnessProposalContent
              data={displayData}
              customization={displayData.customization}
            />
          </div>

          {/* Sidebar - Right Column */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-8 self-start">
            {/* Service Image Card - Hidden on mobile */}
            <div className="hidden lg:block card-large overflow-hidden p-0 shadow-xl">
              <div className="relative flex flex-col">
                <div className="w-full aspect-[4/3] relative overflow-hidden bg-gradient-to-br from-shortcut-teal/20 to-shortcut-navy-blue/20">
                  <img
                    src="/Mindfulness Slider.png"
                    alt="Mindfulness Program"
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                    onError={(e) => {
                      console.error('Service image failed to load');
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-shortcut-navy-blue/40 to-transparent"></div>
                </div>
                <div className="p-6 bg-gradient-to-r from-shortcut-navy-blue to-shortcut-dark-blue rounded-b-2xl">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-shortcut-teal animate-pulse"></div>
                    <h3 className="text-lg font-extrabold text-white text-center">
                      Mindfulness Program
                    </h3>
                  </div>
                </div>
              </div>
            </div>

            {/* Facilitator Card */}
            {program.facilitatorName && (
              <div className="card-large bg-gradient-to-br from-white to-neutral-light-gray overflow-hidden">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-shortcut-teal/20 to-shortcut-teal/10 flex items-center justify-center border-2 border-shortcut-teal border-opacity-30">
                    <User className="w-6 h-6 text-shortcut-blue" />
                  </div>
                  <h2 className="text-xl font-extrabold text-shortcut-navy-blue">Facilitator</h2>
                </div>
                
                {/* Courtney's Image */}
                <div className="mb-6 -mx-6 -mt-2">
                  <img
                    src="/Holiday Proposal/Our Services/Mindfulness/Courtney Frame 2x.webp"
                    alt="Courtney Schulnick - Mindfulness Leader"
                    className="w-full h-auto object-cover"
                    onError={(e) => {
                      console.error('Courtney image failed to load');
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                
                <div className="space-y-4">
                  <p className="text-xl font-extrabold text-shortcut-navy-blue">
                    {program.facilitatorName}
                  </p>
                  <div className="pt-4 border-t-2 border-gray-200">
                    <p className="text-base text-text-dark leading-relaxed font-medium">
                      Courtney Schulnick, an attorney with two decades of experience, now leads mindfulness programs at Shortcut. With extensive training from the Myrna Brind Center for Mindfulness, she brings a unique perspective to corporate wellness. Her workshops help employees achieve balance and vitality, transforming workplace well-being and productivity.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Program Summary Card - Dark Blue */}
            <div className="bg-gradient-to-br from-shortcut-navy-blue to-shortcut-dark-blue text-white rounded-2xl shadow-xl border-2 border-shortcut-teal border-opacity-30 p-8">
              <div className="flex items-center space-x-3 mb-8">
                <div className="w-10 h-10 rounded-full bg-shortcut-teal bg-opacity-20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-extrabold text-white">Program Summary</h2>
              </div>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-white/90 text-lg">Total Sessions:</span>
                  <span className="font-extrabold text-2xl text-white">{program.totalSessions || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-white/90 text-lg">In-Person:</span>
                  <span className="font-extrabold text-xl text-shortcut-teal">{program.inPersonSessions || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-white/90 text-lg">Virtual:</span>
                  <span className="font-extrabold text-xl text-shortcut-teal">{program.virtualSessions || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-white/90 text-lg">Participants:</span>
                  <span className="font-extrabold text-xl text-white">
                    {displayData.summary?.totalAppointments === 0 || displayData.summary?.totalAppointments === 'unlimited' ? '∞' : (displayData.summary?.totalAppointments || 0)}
                  </span>
                </div>
                {(program.pricing?.discountPercent || 0) > 0 && (
                  <>
                    <div className="flex justify-between items-center pt-4 border-t-2 border-shortcut-teal">
                      <span className="font-semibold text-white/90 text-lg">Subtotal:</span>
                      <span className="font-extrabold text-xl text-white">
                        ${formatCurrency(program.pricing?.subtotal || displayData.summary?.totalEventCost || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-white/90 text-lg">Discount ({program.pricing?.discountPercent || 0}%):</span>
                      <span className="font-extrabold text-xl text-red-300">
                        -${formatCurrency(program.pricing?.discountAmount || 0)}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center pt-4 border-t-2 border-shortcut-teal">
                  <span className="font-extrabold text-lg text-white">Total Cost:</span>
                  <span className="font-extrabold text-2xl text-shortcut-teal">
                    ${formatCurrency(displayData.mindfulnessProgram?.pricing?.totalCost || displayData.summary?.totalEventCost || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Note from Shortcut Card */}
            {displayData.customization?.customNote && (
              <div className="card-large bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 border-2 border-shortcut-teal border-opacity-20">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-3 h-3 rounded-full bg-shortcut-teal"></div>
                  <h2 className="text-xl font-extrabold text-shortcut-navy-blue">Note from Shortcut</h2>
                </div>
                <p className="text-base text-text-dark leading-relaxed font-medium">
                  {displayData.customization.customNote.replace('above', 'below')}
                </p>
              </div>
            )}

            {/* Notes Section */}
            <div className="card-large">
              <div className="mb-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-shortcut-teal bg-opacity-10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-shortcut-blue" />
                  </div>
                  <h2 className="text-xl font-extrabold text-shortcut-blue">Notes</h2>
                </div>
                {notes && (
                  <Button
                    onClick={handleSaveNotes}
                    disabled={isSavingNotes}
                    variant="primary"
                    icon={<FileText size={18} />}
                    className="w-full"
                  >
                    {isSavingNotes ? 'Saving...' : 'Save Notes'}
                  </Button>
                )}
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes or comments about the program here..."
                className="w-full min-h-[140px] p-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal resize-y font-medium text-base leading-relaxed transition-all"
              />
            </div>
          </div>
        </div>

        {/* Footer Sections */}
        <div className="space-y-8 mt-12 lg:mt-16">
          {/* Survey Form */}
          {proposal?.status === 'approved' && id && (
            <div id="proposal-survey-form" className="scroll-mt-24">
              <ProposalSurveyForm 
                proposalId={id}
                includesMassage={false}
                locations={[]}
                onSuccess={() => {
                  setHasSurveyResponse(true);
                  setShowSurveyCTA(false);
                  checkSurveyResponse();
                }}
              />
            </div>
          )}

          <ServiceAgreement />

          {/* Shortcut Difference */}
          <div className="mt-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-shortcut-blue">
                The Shortcut Difference
              </h2>
              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    const container = document.getElementById('carousel');
                    if (container) {
                      container.scrollBy({ left: -400, behavior: 'smooth' });
                    }
                  }}
                  className="p-2 rounded-full bg-white shadow-md hover:bg-neutral-light-gray transition-colors border border-gray-200"
                  aria-label="Scroll left"
                >
                  <ChevronLeft size={24} className="text-shortcut-blue" />
                </button>
                <button 
                  onClick={() => {
                    const container = document.getElementById('carousel');
                    if (container) {
                      container.scrollBy({ left: 400, behavior: 'smooth' });
                    }
                  }}
                  className="p-2 rounded-full bg-white shadow-md hover:bg-neutral-light-gray transition-colors border border-gray-200"
                  aria-label="Scroll right"
                >
                  <ChevronRight size={24} className="text-shortcut-blue" />
                </button>
              </div>
            </div>
            
            <div id="carousel" className="flex overflow-x-auto pb-6 gap-8 hide-scrollbar">
              <div className="card-medium min-w-[360px] max-w-[420px] flex-none overflow-hidden flex flex-col p-0">
                <div className="w-full aspect-[4/3] relative overflow-hidden">
                  <img 
                    src="/Seamless Experience.png"
                    alt="Seamless wellness experiences by Shortcut"
                    className="w-full h-full object-cover"
                    onError={(e) => console.error('Image failed to load:', (e.target as HTMLImageElement).src)}
                  />
                </div>
                <div className="p-6 flex-grow flex flex-col">
                  <h3 className="text-xl font-bold text-shortcut-blue mb-3">
                    Seamless Experiences
                  </h3>
                  <p className="text-base text-text-dark leading-relaxed flex-grow">
                    We make wellness effortless. Easily integrate our services and create experiences your team will love.
                  </p>
                </div>
              </div>

              <div className="card-medium min-w-[360px] max-w-[420px] flex-none overflow-hidden flex flex-col p-0">
                <div className="w-full aspect-[4/3] relative overflow-hidden">
                  <img 
                    src="/Revitalizing Impact.png"
                    alt="Revitalizing impact of Shortcut's wellness services"
                    className="w-full h-full object-cover"
                    onError={(e) => console.error('Image failed to load:', (e.target as HTMLImageElement).src)}
                  />
                </div>
                <div className="p-6 flex-grow flex flex-col">
                  <h3 className="text-xl font-bold text-shortcut-blue mb-3">
                    Revitalizing Impact
                  </h3>
                  <p className="text-base text-text-dark leading-relaxed flex-grow">
                    Transform office days into feel-good moments. Boost engagement and watch your team thrive with our revitalizing services.
                  </p>
                </div>
              </div>

              <div className="card-medium min-w-[360px] max-w-[420px] flex-none overflow-hidden flex flex-col p-0">
                <div className="w-full aspect-[4/3] relative overflow-hidden">
                  <img 
                    src="/All-in-One Wellness.png"
                    alt="All-in-one corporate wellness solutions by Shortcut"
                    className="w-full h-full object-cover"
                    onError={(e) => console.error('Image failed to load:', (e.target as HTMLImageElement).src)}
                  />
                </div>
                <div className="p-6 flex-grow flex flex-col">
                  <h3 className="text-xl font-bold text-shortcut-blue mb-3">
                    All-in-One Wellness
                  </h3>
                  <p className="text-base text-text-dark leading-relaxed flex-grow">
                    All your corporate wellness needs, simplified. Discover inspiring services that energize your team, all in one place.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Change History */}
          {changeSets.length > 0 && (
            <div className="card-large">
              <div className="flex items-center justify-between mb-6">
                <h2 className="h2 flex items-center">
                  <HistoryIcon size={24} className="mr-3 text-shortcut-blue" />
                  Change History
                </h2>
                <Button
                  onClick={() => setShowChangeHistory(!showChangeHistory)}
                  variant="secondary"
                  size="sm"
                >
                  {showChangeHistory ? 'Hide' : 'Show'} Changes
                </Button>
              </div>

              {showChangeHistory && (
                <div className="space-y-4">
                  {changeSets.map((changeSet) => (
                    <div key={changeSet.id} className="card-small border-2 border-gray-200">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2">
                            <User size={16} className="text-text-dark-60" />
                            <span className="text-sm font-extrabold text-shortcut-blue">{changeSet.clientName || 'Unknown Client'}</span>
                          </div>
                          {changeSet.clientEmail && (
                            <div className="flex items-center gap-2">
                              <Mail size={16} className="text-text-dark-60" />
                              <span className="text-xs text-text-dark-60">{changeSet.clientEmail}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-text-dark-60" />
                            <span className="text-xs text-text-dark-60">
                              {format(new Date(changeSet.submittedAt), 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <ChangeSourceBadge 
                            changeSource={changeSet.changeSource} 
                            userId={changeSet.userId}
                            size="sm"
                          />
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            changeSet.status === 'pending' ? 'bg-shortcut-service-yellow bg-opacity-20 text-shortcut-dark-blue' :
                            changeSet.status === 'approved' ? 'bg-shortcut-teal bg-opacity-20 text-shortcut-navy-blue' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {changeSet.status === 'pending' ? 'Pending Review' :
                             changeSet.status === 'approved' ? 'Approved' : 'Rejected'}
                          </span>
                        </div>
                      </div>

                      {changeSet.clientComment && (
                        <div className="mb-3 p-3 bg-white rounded border-l-4 border-shortcut-teal shadow-sm">
                          <div className="text-xs font-extrabold text-shortcut-navy-blue mb-1 uppercase tracking-wide">Client Comment</div>
                          <p className="text-sm text-text-dark font-medium">{changeSet.clientComment}</p>
                        </div>
                      )}

                      {changeSet.adminComment && (
                        <div className="mb-3 p-3 bg-neutral-light-gray rounded border-l-4 border-shortcut-navy-blue">
                          <div className="text-xs font-extrabold text-shortcut-navy-blue mb-1 uppercase tracking-wide">Admin Comment</div>
                          <p className="text-sm text-text-dark font-medium">{changeSet.adminComment}</p>
                        </div>
                      )}

                      {changeSet.changes && changeSet.changes.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="text-xs font-extrabold text-shortcut-navy-blue mb-3 uppercase tracking-wide">
                            Changes Made ({changeSet.changes.length})
                          </div>
                          <div className="space-y-2">
                            {changeSet.changes.slice(0, 5).map((change) => {
                              const displayInfo = getChangeDisplayInfo(change);
                              return (
                                <div key={change.id} className="p-2 bg-neutral-light-gray rounded-lg">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <div className="text-xs font-extrabold text-shortcut-blue flex-1">{displayInfo.fieldName}</div>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0 ${
                                      displayInfo.changeType === 'add' ? 'bg-shortcut-teal bg-opacity-20 text-shortcut-navy-blue' :
                                      displayInfo.changeType === 'remove' ? 'bg-red-100 text-red-700' :
                                      'bg-neutral-light-gray text-shortcut-blue'
                                    }`}>
                                      {displayInfo.changeType === 'add' ? 'Added' : displayInfo.changeType === 'remove' ? 'Removed' : 'Updated'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs flex-wrap">
                                    {displayInfo.changeType === 'add' && (
                                      <>
                                        <span className="text-text-dark-60 italic">No previous value</span>
                                        <span className="text-shortcut-navy-blue font-bold">→</span>
                                        <span className="font-bold text-shortcut-navy-blue">{displayInfo.newValueDisplay}</span>
                                      </>
                                    )}
                                    {displayInfo.changeType === 'remove' && (
                                      <>
                                        <span className="line-through text-text-dark-60">{displayInfo.oldValueDisplay}</span>
                                        <span className="text-shortcut-navy-blue font-bold">→</span>
                                        <span className="text-text-dark-60 italic">Removed</span>
                                      </>
                                    )}
                                    {displayInfo.changeType === 'update' && (
                                      <>
                                        <span className="line-through text-text-dark-60">{displayInfo.oldValueDisplay}</span>
                                        <span className="text-shortcut-teal-blue font-bold">→</span>
                                        <span className="font-bold text-shortcut-navy-blue">{displayInfo.newValueDisplay}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                            {changeSet.changes.length > 5 && (
                              <div className="text-xs text-text-dark-60 text-center py-1">
                                ... and {changeSet.changes.length - 5} more change{changeSet.changes.length - 5 !== 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Link to view proposal */}
                      {changeSet.proposalId && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <Button
                            onClick={() => navigate(`/proposal/${changeSet.proposalId}`)}
                            variant="secondary"
                            size="sm"
                            className="w-full sm:w-auto"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View Proposal
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Approval Confirmation Modal */}
      {showApprovalConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4">
          <div className="card-large max-w-2xl w-full mx-4">
            <h3 className="h2 mb-4">Approve Program Proposal</h3>
            <p className="text-base text-text-dark mb-6">
              Are you sure you want to approve this mindfulness program proposal? Once approved, our team will be notified and the program will be confirmed.
            </p>
            <div className="flex gap-4">
              <Button
                onClick={() => setShowApprovalConfirm(false)}
                variant="secondary"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleApproval}
                variant="green"
                className="flex-1"
                loading={isApproving}
              >
                {isApproving ? 'Approving...' : 'Approve Program'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4">
          <div className="card-large max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="h2">How to View This Proposal</h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-text-dark-60 hover:text-shortcut-blue transition-colors p-2 rounded-lg hover:bg-neutral-light-gray"
              >
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4 text-base text-text-dark leading-relaxed">
              <p>This is a read-only view of your mindfulness program proposal. You can review all program details, session schedules, and pricing.</p>
              <p>If you need to make changes, please contact your Shortcut representative.</p>
            </div>
            <div className="mt-6">
              <Button onClick={() => setShowHelpModal(false)} variant="primary">
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Change Confirmation Modal */}
      {showChangeConfirmation && (
        <ChangeConfirmationModal
          pendingChanges={pendingChanges}
          clientComment={clientComment}
          setClientComment={setClientComment}
          onConfirm={async () => {
            setIsSubmittingChanges(true);
            try {
              // Handle change submission if needed
              setShowChangeConfirmation(false);
              setPendingChanges([]);
              setClientComment('');
            } catch (err) {
              console.error('Error submitting changes:', err);
            } finally {
              setIsSubmittingChanges(false);
            }
          }}
          onCancel={() => {
            setShowChangeConfirmation(false);
            setPendingChanges([]);
            setClientComment('');
          }}
          isSubmitting={isSubmittingChanges}
        />
      )}
    </div>
  );
};

export default StandaloneMindfulnessProposalViewer;

