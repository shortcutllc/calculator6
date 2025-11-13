import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Edit, Save, Eye, Share2, ArrowLeft, Check, X, History as HistoryIcon, Globe, Copy, CheckCircle2, Download, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Mail, AlertCircle, Clock, CheckCircle, XCircle, User, Calendar, FileText, HelpCircle, Info } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { LoadingSpinner } from './LoadingSpinner';
import { usePageTitle } from '../hooks/usePageTitle';
import { config } from '../config';
import { recalculateServiceTotals, calculateServiceResults } from '../utils/proposalGenerator';
import { getServiceBorderClass } from '../utils/styleHelpers';
import EditableField from './EditableField';
import { format } from 'date-fns';
import { generatePDF } from '../utils/pdf';
import { Button } from './Button';
import InstructionalScroller from './InstructionalScroller';
import InstructionCard from './InstructionCard';
import ServiceAgreement from './ServiceAgreement';
import LocationSummary from './LocationSummary';
import ChangeConfirmationModal from './ChangeConfirmationModal';
import { trackProposalChanges, createChangeSet } from '../utils/changeTracker';
import { ProposalChangeSet, ProposalChange } from '../types/proposal';
import ProposalSurveyForm from './ProposalSurveyForm';

const formatCurrency = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(numValue) ? '0.00' : numValue.toFixed(2);
};

// Helper function to get display name for service type
const getServiceDisplayName = (serviceType: string): string => {
  if (!serviceType) return '';
  
  switch (serviceType.toLowerCase()) {
    case 'hair-makeup':
      return 'Hair + Makeup';
    case 'headshot-hair-makeup':
      return 'Hair + Makeup for Headshots';
    case 'headshot':
    case 'headshots':
      return 'Headshot';
    case 'mindfulness':
      return 'Mindfulness';
    default:
      // For other services, capitalize first letter and make rest lowercase
      return serviceType.charAt(0).toUpperCase() + serviceType.slice(1).toLowerCase();
  }
};

const formatDate = (dateString: string): string => {
  try {
    if (!dateString) return 'No Date';
    if (dateString === 'TBD') return 'Date TBD';
    
    // If it's already in YYYY-MM-DD format, parse it directly
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return format(date, 'MMM dd, yyyy');
    }
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return format(date, 'MMM dd, yyyy');
  } catch (err) {
    console.error('Error formatting date:', err);
    return 'Invalid Date';
  }
};

// Helper function to get unique service types from proposal data
const getUniqueServiceTypes = (displayData: any): string[] => {
  const serviceTypes = new Set<string>();
  
  if (displayData?.services) {
    Object.values(displayData.services).forEach((locationData: any) => {
      Object.values(locationData).forEach((dateData: any) => {
        dateData.services?.forEach((service: any) => {
          serviceTypes.add(service.serviceType);
        });
      });
    });
  }
  
  return Array.from(serviceTypes);
};

// Helper function to get service image path
const getServiceImagePath = (serviceType: string): string => {
  const type = serviceType?.toLowerCase() || '';
  switch (type) {
    case 'massage':
      return '/Massage Slider.png';
    case 'facial':
    case 'facials':
      return '/Facials Slider.png';
    case 'hair':
      return '/Hair Slider.png';
    case 'nails':
      return '/Nails Slider.png';
    case 'headshot':
    case 'headshots':
      return '/Headshot Slider.png';
    case 'mindfulness':
      return '/Mindfulness Slider.png';
    case 'hair-makeup':
      return '/Hair Slider.png';
    case 'headshot-hair-makeup':
      return '/Headshot Slider.png';
    default:
      return '/Massage Slider.png'; // fallback
  }
};

// Helper function to get mindfulness service description
const getMindfulnessDescription = (service: any): string => {
  if (service.serviceType !== 'mindfulness') return '';
  
  const classLength = service.classLength || 60;
  const participants = service.participants || 'unlimited';
  
  if (classLength === 60) {
    return "In just one 60 minute workshop your team will learn the fundamentals, experience guided meditations and gain practical tools to reduce stress and enhance focus.";
  } else if (classLength === 30) {
    return "Our 30-minute drop-in sessions offer a quick and easy way to step out of the \"doing mode\" and into a space of rest and rejuvenation.";
  }
  
  return "Mindfulness meditation session to help your team reduce stress and improve focus.";
};

// Helper function to get service descriptions
const getServiceDescription = (service: any): string => {
  const serviceType = service.serviceType?.toLowerCase();
  
  switch (serviceType) {
    case 'massage':
      const massageType = service.massageType || 'massage';
      if (massageType === 'chair') {
        return "Treat your team to rejuvenating chair massage sessions right in the workplace. Our expert therapists create a luxurious spa-like ambiance with soothing scents, customized lighting and relaxing sounds.";
      } else if (massageType === 'table') {
        return "Treat your team to rejuvenating table massage sessions right in the workplace. Our expert therapists create a luxurious spa-like ambiance with soothing scents, customized lighting and relaxing sounds.";
      } else {
        return "Treat your team to rejuvenating chair or table massage sessions right in the workplace. Our expert therapists create a luxurious spa-like ambiance with soothing scents, customized lighting and relaxing sounds.";
      }
    case 'nails':
      return "Experience manicures and pedicures that blend relaxation with elegance, offering a pampered escape that leaves employees refreshed and polished.";
    case 'hair':
      return "Our office hair services menu offers precision cuts, professional styling, and grooming essentials, designed to keep employees looking sharp and feeling confident right at the workplace.";
    case 'headshot':
    case 'headshots':
      return "Our in-office headshot experience, complete with hair and makeup touch-ups, helps employees present themselves confidently and creates a consistent, professional appearance for your company.";
    case 'facial':
      return "Professional facial treatments that provide deep cleansing, hydration, and relaxation, helping employees feel refreshed and rejuvenated during their workday.";
    case 'mindfulness':
      return getMindfulnessDescription(service);
    case 'hair-makeup':
      return "Enjoy a personalized makeup look, from natural to glamorous, paired with a quick hair touch-up using hot tools for a polished finish. Perfect for any occasion.";
    case 'headshot-hair-makeup':
      return "Capture your best self with our professional headshots, complemented by flawless hair styling and makeup application, ensuring you leave with a photo that speaks volumes.";
    default:
      return "";
  }
};

export const StandaloneProposalViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<any>(null);
  const [displayData, setDisplayData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<any>(null);
  const [originalData, setOriginalData] = useState<any>(null);
  const [showingOriginal, setShowingOriginal] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [showChangesSaved, setShowChangesSaved] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [expandedLocations, setExpandedLocations] = useState<{[key: string]: boolean}>({});
  const [expandedDates, setExpandedDates] = useState<{[key: string]: boolean}>({});
  const [isCustomNoteExpanded, setIsCustomNoteExpanded] = useState(false);
  
  // Change tracking state
  const [changeSets, setChangeSets] = useState<ProposalChangeSet[]>([]);
  const [showChangeHistory, setShowChangeHistory] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [showApprovalSuccess, setShowApprovalSuccess] = useState(false);
  const [showApprovalConfirm, setShowApprovalConfirm] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showUpdateIndicator, setShowUpdateIndicator] = useState(false);
  const [currentServiceImageIndex, setCurrentServiceImageIndex] = useState(0);
  
  // Change tracking state
  const [pendingChanges, setPendingChanges] = useState<ProposalChange[]>([]);
  const [showChangeConfirmation, setShowChangeConfirmation] = useState(false);
  const [clientComment, setClientComment] = useState('');
  const [isSubmittingChanges, setIsSubmittingChanges] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasSurveyResponse, setHasSurveyResponse] = useState(false);
  const [showSurveyCTA, setShowSurveyCTA] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  usePageTitle('View Proposal');

  const toggleVersion = () => {
    if (showingOriginal) {
      // Going back to current view
      setDisplayData({ ...editedData, customization: proposal?.customization });
    } else {
      // Check if there are user edits to show
      if (proposal?.has_changes && originalData) {
        // Show user's edits (the original data that was saved when user made changes)
        const originalCalculated = recalculateServiceTotals(originalData);
        setDisplayData({ ...originalCalculated, customization: proposal?.customization });
      } else {
        // No user edits exist, stay on current view
        return; // Don't toggle the state
      }
    }
    setShowingOriginal(!showingOriginal);
    setIsEditing(false);
  };

  useEffect(() => {
    if (displayData?.services) {
      const initialLocations: {[key: string]: boolean} = {};
      const initialDates: {[key: string]: boolean} = {};
      
      Object.keys(displayData.services).forEach(location => {
        initialLocations[location] = true;
        Object.keys(displayData.services[location]).forEach(date => {
          initialDates[date] = true;
        });
      });
      
      setExpandedLocations(initialLocations);
      setExpandedDates(initialDates);
    }
  }, [displayData]);

  // Function to fetch change sets for this proposal
  const fetchChangeSets = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', id)
        .eq('pending_review', true)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching change sets:', error);
        return;
      }

      if (data && data.length > 0) {
        // Convert proposal data to change sets
        const changeSets: ProposalChangeSet[] = data.map(proposal => ({
          id: proposal.id,
          proposalId: proposal.id,
          changes: [], // We'll populate this with actual changes if needed
          clientEmail: proposal.client_email,
          clientName: proposal.client_name,
          clientComment: proposal.client_comment || '',
          status: 'pending' as const,
          submittedAt: proposal.updated_at,
          reviewedBy: proposal.reviewed_by,
          reviewedAt: proposal.reviewed_at,
          adminComment: proposal.admin_comment
        }));
        
        setChangeSets(changeSets);
      }
    } catch (error) {
      console.error('Error fetching change sets:', error);
    }
  };

  useEffect(() => {
    const fetchProposal = async () => {
      if (!id) return;

      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('proposals')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        if (!data) throw new Error('Proposal not found');

        const calculatedData = recalculateServiceTotals(data.data);
        
        // Load pricing options from the database
        if (data.pricing_options && data.selected_options) {
          Object.entries(calculatedData.services || {}).forEach(([location, locationData]: [string, any]) => {
            Object.entries(locationData).forEach(([date, dateData]: [string, any]) => {
              dateData.services?.forEach((service: any, serviceIndex: number) => {
                const key = `${location}-${date}-${serviceIndex}`;
                if (data.pricing_options[key]) {
                  service.pricingOptions = data.pricing_options[key];
                  service.selectedOption = data.selected_options[key] || 0;
                }
              });
            });
          });
          calculatedData.hasPricingOptions = data.has_pricing_options || false;
        }
        
        // Check if this is an update (not initial load)
        const isUpdate = proposal !== null;
        setProposal(data);
        setDisplayData({ ...calculatedData, customization: data.customization });
        setEditedData({ ...calculatedData, customization: data.customization });
        setNotes(data.notes || '');
        if (data.original_data) {
          const originalCalculated = recalculateServiceTotals(data.original_data);
          setOriginalData({ ...originalCalculated, customization: data.customization });
        }
        // Show update indicator if this was a refresh
        if (isUpdate) {
          setLastUpdated(new Date());
          setShowUpdateIndicator(true);
          setTimeout(() => setShowUpdateIndicator(false), 3000);
        }
      } catch (err) {
        console.error('Error fetching proposal:', err);
        setError(err instanceof Error ? err.message : 'Failed to load proposal');
      } finally {
        setLoading(false);
      }
    };

    fetchProposal();
    fetchChangeSets();

    // Set up periodic refresh every 5 minutes to catch updates (only when needed)
    // Removed aggressive focus refresh to prevent constant refreshing
    const refreshInterval = setInterval(() => {
      fetchProposal();
      fetchChangeSets();
    }, 300000); // 5 minutes - less aggressive refresh

    return () => {
      clearInterval(refreshInterval);
    };
  }, [id]);

  const handleFieldChange = (path: string[], value: string | number | undefined) => {
    if (!editedData) return;
    
    let updatedData = { ...editedData };
    let target = updatedData;
    
    for (let i = 0; i < path.length - 1; i++) {
      target = target[path[i]];
    }
    
    target[path[path.length - 1]] = value;
    
    // If we're changing a service parameter, recalculate service totals
    if (path.length >= 5 && path[0] === 'services' && path[3] === 'services') {
      const service = target;
      
      if (service.pricingOptions && service.pricingOptions.length > 0) {
        // If we're editing a specific pricing option parameter
        if (path.includes('pricingOptions') && path.length >= 7) {
          const optionIndex = parseInt(path[path.length - 3]);
          const option = service.pricingOptions[optionIndex];
          if (option) {
            // Update the specific option parameter
            const paramName = path[path.length - 1];
            option[paramName] = value;
            
            // Recalculate this specific option
            const optionService = { ...service };
            optionService.totalHours = option.totalHours || service.totalHours;
            optionService.hourlyRate = option.hourlyRate || service.hourlyRate;
            optionService.numPros = option.numPros || service.numPros;
            const { totalAppointments, serviceCost } = calculateServiceResults(optionService);
            option.totalAppointments = totalAppointments;
            option.serviceCost = serviceCost;
          }
        } else if (path.includes('selectedOption')) {
          // We're just changing the selected option
          const selectedOption = service.pricingOptions[service.selectedOption || 0];
          if (selectedOption) {
            service.totalAppointments = selectedOption.totalAppointments;
            service.serviceCost = selectedOption.serviceCost;
          }
        } else {
          // We're editing a base service parameter (totalHours, numPros, etc.)
          // Update all pricing options with the new base parameters
          service.pricingOptions = service.pricingOptions.map((option: any) => {
            const optionService = { ...service };
            // Preserve option-specific values if they exist
            if (option.totalHours !== undefined) optionService.totalHours = option.totalHours;
            if (option.hourlyRate !== undefined) optionService.hourlyRate = option.hourlyRate;
            if (option.numPros !== undefined) optionService.numPros = option.numPros;
            
            const { totalAppointments, serviceCost } = calculateServiceResults(optionService);
            return {
              ...option,
              totalAppointments,
              serviceCost
            };
          });
          
          // Update the service totals based on the selected option
          const selectedOption = service.pricingOptions[service.selectedOption || 0];
          if (selectedOption) {
            service.totalAppointments = selectedOption.totalAppointments;
            service.serviceCost = selectedOption.serviceCost;
          }
        }
      } else {
        // No pricing options, recalculate normally
        const { totalAppointments, serviceCost } = calculateServiceResults(service);
        service.totalAppointments = totalAppointments;
        service.serviceCost = serviceCost;
      }
    }
    
    const recalculatedData = recalculateServiceTotals(updatedData);
    setEditedData({ ...recalculatedData, customization: proposal?.customization });
    setDisplayData({ ...recalculatedData, customization: proposal?.customization });
    
    // Track changes
    trackChanges(recalculatedData);
  };

  // Function to track changes between original and edited data
  const trackChanges = (newData: any) => {
    if (!originalData || !newData) return;
    
    const changes = trackProposalChanges(
      originalData,
      newData,
      proposal?.clientEmail,
      proposal?.clientName
    );
    
    setPendingChanges(changes);
    setHasUnsavedChanges(changes.length > 0);
  };

  const handleSaveChanges = async () => {
    if (!id || !editedData) return;
    
    // Show change confirmation modal if there are pending changes
    if (pendingChanges.length > 0) {
      setShowChangeConfirmation(true);
      return;
    }
    
    // If no changes, just save normally
    await saveChanges();
  };

  const saveChanges = async () => {
    if (!id || !editedData) return;
    
    try {
      setIsSavingChanges(true);
      
      const { error } = await supabase
        .from('proposals')
        .update({
          data: editedData,
          has_changes: true,
          pending_review: true,
          original_data: originalData || proposal.data,
          customization: proposal.customization,
          change_source: 'client'
        })
        .eq('id', id);

      if (error) throw error;

      setDisplayData({ ...editedData, customization: proposal.customization });
      setIsEditing(false);
      setHasUnsavedChanges(false);
      setPendingChanges([]);

      setShowChangesSaved(true);
      setTimeout(() => setShowChangesSaved(false), 3000);
    } catch (err) {
      console.error('Error saving changes:', err);
      setError('Failed to save changes');
    } finally {
      setIsSavingChanges(false);
    }
  };

  const handleSubmitChanges = async () => {
    if (!id || !editedData || pendingChanges.length === 0) return;
    
    try {
      setIsSubmittingChanges(true);
      
      // Create change set
      const changeSet = createChangeSet(
        id,
        pendingChanges,
        proposal?.clientEmail,
        proposal?.clientName,
        clientComment
      );
      
      // Save changes to database with change tracking
      console.log('Saving changes to database:', {
        id,
        has_changes: true,
        pending_review: true,
        change_source: 'client',
        changesCount: pendingChanges.length
      });
      
      // Try a direct update first
      const { error } = await supabase
        .from('proposals')
        .update({
          data: editedData,
          has_changes: true,
          pending_review: true,
          original_data: originalData || proposal.data,
          customization: proposal.customization,
          change_source: 'client'
        })
        .eq('id', id);

      if (error) {
        console.error('Database update error:', error);
        throw error;
      }
      
      console.log('✅ Changes saved successfully to database');
      alert('Changes saved successfully! Check admin dashboard.');

      setDisplayData({ ...editedData, customization: proposal.customization });
      setIsEditing(false);
      setHasUnsavedChanges(false);
      setPendingChanges([]);
      setClientComment('');
      setShowChangeConfirmation(false);

      setShowChangesSaved(true);
      setTimeout(() => setShowChangesSaved(false), 3000);
    } catch (err) {
      console.error('Error submitting changes:', err);
      setError('Failed to submit changes for review');
    } finally {
      setIsSubmittingChanges(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!id) return;

    try {
      setIsSavingNotes(true);
      
      const { error } = await supabase
        .from('proposals')
        .update({
          notes,
          has_changes: true,
          pending_review: true
        })
        .eq('id', id);

      if (error)
        throw error;

      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving notes:', err);
      setError('Failed to save notes');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const filename = `${displayData.clientName.replace(/\s+/g, '-').toLowerCase()}-proposal.pdf`;
      await generatePDF('proposal-content', filename);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleApproval = async () => {
    if (!id || !displayData) return;
    
    try {
      setIsApproving(true);
      
      // First, update the proposal status in the database
      const { error: updateError } = await supabase
        .from('proposals')
        .update({
          status: 'approved',
          pending_review: false,
          has_changes: false
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Then, send the approval notification
      const response = await fetch(`${config.supabase.url}/functions/v1/proposal-approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.supabase.anonKey}`,
        },
        body: JSON.stringify({
          proposalId: id,
          clientName: displayData.clientName,
          totalCost: displayData.summary?.totalEventCost || 0,
          eventDates: displayData.eventDates,
          locations: displayData.locations
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send approval notification');
      }

      // Update local proposal state to reflect approval
      setProposal((prev: typeof proposal) => prev ? { ...prev, status: 'approved' } : null);

      setShowApprovalSuccess(true);
      setTimeout(() => setShowApprovalSuccess(false), 5000);

      // Scroll to survey form after a short delay
      setTimeout(() => {
        const surveyElement = document.getElementById('proposal-survey-form');
        if (surveyElement) {
          surveyElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 1000);
    } catch (err) {
      console.error('Error approving proposal:', err);
      alert('Failed to approve proposal. Please try again.');
    } finally {
      setIsApproving(false);
    }
  };

  const toggleLocation = (location: string) => {
    setExpandedLocations(prev => ({
      ...prev,
      [location]: !prev[location]
    }));
  };

  const toggleDate = (date: string) => {
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  // Check if survey response exists
  const checkSurveyResponse = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('proposal_survey_responses')
        .select('id')
        .eq('proposal_id', id)
        .single();

      if (error) {
        // PGRST116 = no rows returned (this is expected if no survey exists yet)
        // PGRST301 = relation does not exist (table hasn't been created yet)
        if (error.code === 'PGRST116') {
          // No survey exists yet, this is fine
          setHasSurveyResponse(false);
          if (proposal?.status === 'approved') {
            setShowSurveyCTA(true);
          }
          return;
        }
        if (error.code === 'PGRST301' || error.message?.includes('does not exist')) {
          console.warn('Survey table does not exist. Migration may not have been applied yet.');
          // Don't show CTA if table doesn't exist
          setShowSurveyCTA(false);
          return;
        }
        console.error('Error checking survey response:', error);
        return;
      }

      setHasSurveyResponse(!!data);
      // Show CTA if approved but no survey response
      if (proposal?.status === 'approved' && !data) {
        setShowSurveyCTA(true);
      } else {
        setShowSurveyCTA(false);
      }
    } catch (err) {
      console.error('Error checking survey response:', err);
    }
  };

  // Check survey when proposal status changes or proposal loads
  useEffect(() => {
    if (proposal?.status === 'approved' && id) {
      checkSurveyResponse();
    }
  }, [proposal?.status, id, proposal]);

  // Auto-rotate service images
  useEffect(() => {
    const uniqueServiceTypes = getUniqueServiceTypes(displayData);
    if (uniqueServiceTypes.length > 1) {
      const interval = setInterval(() => {
        setCurrentServiceImageIndex(prev => 
          prev < uniqueServiceTypes.length - 1 ? prev + 1 : 0
        );
      }, 3000); // Change every 3 seconds

      return () => clearInterval(interval);
    }
  }, [displayData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error || !displayData) {
    return (
      <div className="min-h-screen bg-neutral-light-gray flex items-center justify-center p-4">
        <div className="card-medium max-w-md w-full text-center">
          <h2 className="h2 mb-4">Error Loading Proposal</h2>
          <p className="text-text-dark-60 mb-6">{error || 'No proposal data available'}</p>
          <Button
            onClick={() => navigate(config.app.routes.home)}
            variant="primary"
          >
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  const uniqueServiceTypes = getUniqueServiceTypes(displayData);

  return (
    <div className="min-h-screen bg-neutral-light-gray">
      {showUpdateIndicator && (
        <div className="fixed top-0 left-0 w-full z-50 flex justify-center">
          <div className="bg-green-500 text-white px-4 py-2 rounded-b-lg shadow-md mt-0 text-center text-sm">
            Proposal updated{lastUpdated ? ` (${lastUpdated.toLocaleTimeString()})` : ''}
          </div>
        </div>
      )}
      {showSurveyCTA && proposal?.status === 'approved' && !hasSurveyResponse && (
        <div className="fixed top-0 left-0 w-full z-50 bg-blue-600 text-white px-4 py-3 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5" />
              <div>
                <p className="font-semibold">Complete the Event Details Survey</p>
                <p className="text-sm text-blue-100">Please fill out the survey below to help us prepare for your event</p>
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
      <header className={`bg-white shadow-sm sticky ${showSurveyCTA ? 'top-16' : 'top-0'} z-40 rounded-b-3xl`}>
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img 
                src="/shortcut-logo blue.svg" 
                alt="Shortcut Logo" 
                className="h-8 w-auto"
              />
            </div>
            <div className="flex items-center gap-4">
              {showChangesSaved && (
                <div className="flex items-center text-green-600 bg-green-50 px-3 py-1 rounded-full">
                  <CheckCircle2 size={18} className="mr-2" />
                  <span>Changes saved!</span>
                </div>
              )}
              {showApprovalSuccess ? (
                <div className="flex items-center text-green-600 bg-green-50 px-3 py-1 rounded-full">
                  <CheckCircle2 size={18} className="mr-2" />
                  <span>Proposal approved! Team notified.</span>
                </div>
              ) : proposal?.status === 'approved' && (
                <div className="flex items-center text-green-600 bg-green-50 px-3 py-1 rounded-full">
                  <CheckCircle2 size={18} className="mr-2" />
                  <span>Proposal approved! Team notified.</span>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setShowHelpModal(true)}
                  className="p-2 rounded-lg hover:bg-neutral-light-gray transition-colors"
                  aria-label="How to edit this proposal"
                  title="How to edit this proposal"
                >
                  <HelpCircle size={20} className="text-shortcut-blue" />
                </button>
                {proposal?.status === 'approved' ? (
                  <div className="flex items-center text-green-600 bg-green-50 px-4 rounded-lg border border-green-200">
                    <CheckCircle2 size={18} className="mr-2" />
                    <span className="font-semibold">Proposal Approved</span>
                  </div>
                ) : (
                  <Button
                    onClick={() => setShowApprovalConfirm(true)}
                    variant="green"
                    icon={<Check size={18} />}
                    loading={isApproving}
                  >
                    {isApproving ? 'Approving...' : 'Approve Proposal'}
                  </Button>
                )}
                {proposal?.is_editable && !showingOriginal && (
                  isEditing ? (
                    <Button
                      onClick={handleSaveChanges}
                      variant="primary"
                      icon={<Save size={18} />}
                      loading={isSavingChanges}
                      className={hasUnsavedChanges ? 'bg-orange-600 hover:bg-orange-700' : ''}
                    >
                      {isSavingChanges ? 'Saving...' : 
                       hasUnsavedChanges ? `Save Changes (${pendingChanges.length})` : 
                       'Save Changes'}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setIsEditing(true)}
                      variant="secondary"
                      icon={<Edit size={18} />}
                    >
                      Edit Proposal
                    </Button>
                  )
                )}
                <Button
                  onClick={handleDownload}
                  variant="secondary"
                  icon={<Download size={18} />}
                  loading={isDownloading}
                >
                  {isDownloading ? 'Downloading...' : 'Download PDF'}
                </Button>

                {originalData && proposal?.has_changes && proposal?.change_source === 'client' && (
                  <Button
                    onClick={toggleVersion}
                    variant="secondary"
                    icon={<HistoryIcon size={18} />}
                  >
                    {showingOriginal ? 'View Current' : 'View Your Changes'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-12 px-4" id="proposal-content">
        {/* Summary-First Layout - Key Metrics at Top */}
        <div className="card-large mb-8">
          <div className="mb-8">
            {displayData.clientLogoUrl ? (
              <div className="flex justify-start mb-6">
                <img
                  src={displayData.clientLogoUrl}
                  alt={`${displayData.clientName} Logo`}
                  className="max-h-20 max-w-full object-contain rounded shadow-sm"
                  style={{ maxWidth: '300px' }}
                  onError={(e) => {
                    console.error('Logo failed to load:', displayData.clientLogoUrl);
                    e.currentTarget.style.display = 'none';
                    const fallbackElement = e.currentTarget.nextElementSibling;
                    if (fallbackElement) {
                      (fallbackElement as HTMLElement).style.display = 'block';
                    }
                  }}
                />
                <h1 className="h1 mb-4 hidden">
                  {displayData.clientName}
                </h1>
              </div>
            ) : (
              <h1 className="h1 mb-6">
                {displayData.clientName}
              </h1>
            )}
            
            {/* Note from Shortcut - Clean, readable design */}
            {displayData.customization?.customNote && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-extrabold text-shortcut-blue mb-3">Note from Shortcut</h3>
                <p className="text-base text-text-dark leading-relaxed font-medium">
                  {displayData.customization.customNote.replace('above', 'below')}
                </p>
              </div>
            )}
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-gray-200">
            <div>
              <p className="text-sm font-bold text-shortcut-blue mb-1">Event Dates</p>
              <p className="text-base font-medium text-text-dark">
                {Array.isArray(displayData.eventDates) ? 
                  displayData.eventDates.map((date: string) => formatDate(date)).join(', ') :
                  'No dates available'
                }
              </p>
            </div>
            <div>
              <p className="text-sm font-bold text-shortcut-blue mb-1">Locations</p>
              <p className="text-base font-medium text-text-dark">{displayData.locations?.join(', ') || 'No locations available'}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-shortcut-blue mb-1">Total Appointments</p>
              <p className="text-base font-medium text-text-dark">{displayData.summary?.totalAppointments || 0}</p>
            </div>
            {displayData.officeLocation && (
              <div className="md:col-span-3">
                <p className="text-sm font-bold text-shortcut-blue mb-1">Office Location</p>
                <p className="text-base font-medium text-text-dark">{displayData.officeLocation}</p>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Layout: Single column with specific order */}
        <div className="lg:grid lg:grid-cols-3 gap-12">
          {/* Main Content - Services (Day summary + Location Section) - shown first on mobile after top box */}
          <div className="lg:col-span-2 space-y-8 order-1 lg:order-1">

            <div className="space-y-8">
              {Object.entries(displayData.services || {}).map(([location, locationData]: [string, any]) => (
                <div key={location} className="card-large">
                  <button
                    onClick={() => toggleLocation(location)}
                    className="w-full flex justify-between items-center mb-6 hover:opacity-80 transition-opacity"
                  >
                    <h2 className="text-2xl font-extrabold text-shortcut-blue">
                      {location}
                    </h2>
                    {expandedLocations[location] ? <ChevronUp size={24} className="text-shortcut-blue" /> : <ChevronDown size={24} className="text-shortcut-blue" />}
                  </button>
                  
                  {expandedLocations[location] && (
                    <div className="pt-6 border-t border-gray-200 space-y-6">
                      {Object.entries(locationData)
                        .sort(([dateA], [dateB]) => {
                          // Handle TBD dates - put them at the end
                          if (dateA === 'TBD' && dateB === 'TBD') return 0;
                          if (dateA === 'TBD') return 1;
                          if (dateB === 'TBD') return -1;
                          
                          // Sort actual dates normally
                          return new Date(dateA).getTime() - new Date(dateB).getTime();
                        })
                        .map(([date, dateData]: [string, any], dateIndex: number) => (
                          <div key={date} className="border-2 border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            <button
                              onClick={() => toggleDate(date)}
                              className="w-full px-6 py-4 flex justify-between items-center bg-white hover:bg-neutral-light-gray transition-colors border-b border-gray-200"
                            >
                              <h3 className="text-lg font-extrabold text-shortcut-blue">
                                Day {dateIndex + 1} - {formatDate(date)}
                              </h3>
                              {expandedDates[date] ? <ChevronUp size={16} className="text-shortcut-blue" /> : <ChevronDown size={16} className="text-shortcut-blue" />}
                            </button>

                            {expandedDates[date] && (
                              <div className="p-6 bg-white">
                                {dateData.services.map((service: any, serviceIndex: number) => (
                                  <div 
                                    key={serviceIndex} 
                                    className={`card-small mb-6 border-2 ${getServiceBorderClass(service.serviceType)}`}
                                  >
                                    <h4 className="text-lg font-extrabold text-shortcut-blue mb-4 flex items-center">
                                      <span className="w-3 h-3 rounded-full bg-shortcut-teal mr-3"></span>
                                      Service Type: {getServiceDisplayName(service.serviceType)}
                                    </h4>
                                    
                                    {/* Service Description */}
                                    {getServiceDescription(service) && (
                                      <div className="mb-4 p-4 bg-white rounded-lg border-2 border-shortcut-teal shadow-sm">
                                        <p className="text-text-dark text-sm leading-relaxed">
                                          {getServiceDescription(service)}
                                        </p>
                                        {service.serviceType === 'mindfulness' && (
                                          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                              <span className="font-bold text-shortcut-navy-blue">Event Time:</span>
                                              <span className="ml-2 text-text-dark">{service.classLength || 60} Min</span>
                                            </div>
                                            <div>
                                              <span className="font-bold text-shortcut-navy-blue">Participants:</span>
                                              <span className="ml-2 text-text-dark">
                                                {service.participants === 'unlimited' ? 'Unlimited' : service.participants}
                                              </span>
                                            </div>
                                          </div>
                                        )}
                                        {service.serviceType === 'massage' && service.massageType && (
                                          <div className="mt-3 text-sm">
                                            <span className="font-bold text-shortcut-navy-blue">Massage Type:</span>
                                            <span className="ml-2 text-text-dark capitalize">{service.massageType}</span>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    <div className="grid gap-0">
                                      <div className="flex justify-between items-center py-3 border-b border-gray-200">
                                        <span className="text-base font-bold text-shortcut-blue">Total Hours:</span>
                                        <div className="font-bold text-text-dark">
                                          <EditableField
                                            value={String(service.totalHours || 0)}
                                            onChange={(value) => handleFieldChange(['services', location, date, 'services', serviceIndex, 'totalHours'], typeof value === 'string' ? parseFloat(value) || 0 : value)}
                                            isEditing={isEditing}
                                            type="number"
                                            suffix=" hours"
                                          />
                                        </div>
                                      </div>
                                      <div className="flex justify-between items-center py-3 border-b border-gray-200">
                                        <span className="text-base font-bold text-shortcut-blue">Number of Professionals:</span>
                                        <div className="font-bold text-text-dark">
                                          <EditableField
                                            value={String(service.numPros || 0)}
                                            onChange={(value) => handleFieldChange(['services', location, date, 'services', serviceIndex, 'numPros'], typeof value === 'string' ? parseFloat(value) || 0 : value)}
                                            isEditing={isEditing}
                                            type="number"
                                          />
                                        </div>
                                      </div>
                                      <div className="flex justify-between items-center py-3 border-b border-gray-200">
                                        <span className="text-base font-bold text-shortcut-blue">Total Appointments:</span>
                                        <span className="font-bold text-text-dark">{service.totalAppointments}</span>
                                      </div>
                                      <div className="flex justify-between items-center py-3 border-b border-gray-200">
                                        <span className="text-base font-bold text-shortcut-blue">Service Cost:</span>
                                        <span className="font-bold text-shortcut-blue text-lg">${formatCurrency(service.serviceCost)}</span>
                                      </div>
                                      
                                      {/* Pricing Options Section */}
                                      {displayData.hasPricingOptions && service.pricingOptions && service.pricingOptions.length > 0 && (
                                        <div className="mt-4 pt-4 border-t-2 border-shortcut-navy-blue border-opacity-20">
                                          <h5 className="text-lg font-bold text-shortcut-blue mb-3 flex items-center">
                                            <span className="w-2 h-2 rounded-full bg-shortcut-teal mr-2"></span>
                                            Pricing Options
                                          </h5>
                                          <div className="space-y-3">
                                            {service.pricingOptions.map((option: any, optionIndex: number) => (
                                              <div 
                                                key={optionIndex}
                                                className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                                                  service.selectedOption === optionIndex
                                                    ? 'border-shortcut-navy-blue bg-shortcut-navy-blue bg-opacity-5'
                                                    : 'border-gray-200 bg-neutral-light-gray hover:border-shortcut-teal'
                                                }`}
                                                onClick={() => {
                                                  // Update the selected option
                                                  handleFieldChange(
                                                    ['services', location, date, 'services', serviceIndex, 'selectedOption'], 
                                                    optionIndex
                                                  );
                                                  
                                                  // Update service totals based on the selected option
                                                  const selectedOption = service.pricingOptions[optionIndex];
                                                  if (selectedOption) {
                                                    service.totalAppointments = selectedOption.totalAppointments;
                                                    service.serviceCost = selectedOption.serviceCost;
                                                  }
                                                }}
                                              >
                                                <div className="flex justify-between items-start mb-2">
                                                  <div className="flex-1">
                                                    <h6 className="font-extrabold text-shortcut-blue">
                                                      Option {optionIndex + 1}
                                                    </h6>
                                                    <p className="text-sm text-text-dark-60">
                                                      {option.totalAppointments} appointments
                                                    </p>
                                                  </div>
                                                  <div className="text-right">
                                                    <div className="text-lg font-bold text-shortcut-blue">
                                                      ${formatCurrency(option.serviceCost)}
                                                    </div>
                                                    {service.selectedOption === optionIndex && (
                                                      <div className="text-xs text-shortcut-navy-blue font-semibold">
                                                        SELECTED
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                                
                                                {/* Editable fields for each option */}
                                                {isEditing && (
                                                  <div className="mt-3 space-y-2 border-t pt-3">
                                                    <div className="grid grid-cols-2 gap-2">
                                                      <div>
                                                        <label className="text-xs font-bold text-shortcut-blue">Total Hours:</label>
                                                        <EditableField
                                                          value={String(option.totalHours || service.totalHours)}
                                                          onChange={(value) => handleFieldChange(
                                                            ['services', location, date, 'services', serviceIndex, 'pricingOptions', optionIndex, 'totalHours'], 
                                                            typeof value === 'string' ? parseFloat(value) || service.totalHours : value
                                                          )}
                                                          isEditing={isEditing}
                                                          type="number"
                                                        />
                                                      </div>
                                                      <div>
                                                        <label className="text-xs font-bold text-shortcut-blue">Hourly Rate:</label>
                                                        <EditableField
                                                          value={String(option.hourlyRate || service.hourlyRate)}
                                                          onChange={(value) => handleFieldChange(
                                                            ['services', location, date, 'services', serviceIndex, 'pricingOptions', optionIndex, 'hourlyRate'], 
                                                            typeof value === 'string' ? parseFloat(value) || service.hourlyRate : value
                                                          )}
                                                          isEditing={isEditing}
                                                          type="number"
                                                          prefix="$"
                                                        />
                                                      </div>
                                                    </div>
                                                    <div>
                                                      <label className="text-xs font-bold text-shortcut-blue">Number of Pros:</label>
                                                      <EditableField
                                                        value={String(option.numPros || service.numPros || 1)}
                                                        onChange={(value) => handleFieldChange(
                                                          ['services', location, date, 'services', serviceIndex, 'pricingOptions', optionIndex, 'numPros'], 
                                                          typeof value === 'string' ? parseFloat(value) || 1 : value
                                                        )}
                                                        isEditing={isEditing}
                                                        type="number"
                                                      />
                                                    </div>
                                                  </div>
                                                )}
                                                
                                                {isEditing && (
                                                  <div className="mt-3">
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleFieldChange(
                                                          ['services', location, date, 'services', serviceIndex, 'selectedOption'], 
                                                          optionIndex
                                                        );
                                                      }}
                                                      className={`w-full px-3 py-2 text-sm rounded-md transition-colors ${
                                                        service.selectedOption === optionIndex
                                                          ? 'bg-shortcut-navy-blue text-white'
                                                          : 'bg-neutral-light-gray text-shortcut-navy-blue hover:bg-neutral-gray'
                                                      }`}
                                                    >
                                                      {service.selectedOption === optionIndex ? 'Selected' : 'Select This Option'}
                                                    </button>
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                          {isEditing && (
                                            <div className="mt-4 p-3 bg-shortcut-light-blue rounded-lg border border-shortcut-teal">
                                              <p className="text-sm text-shortcut-dark-blue">
                                                💡 <strong>Tip:</strong> Click on any option above to select it. The selected option will be used for cost calculations.
                                              </p>
                                            </div>
                                          )}
                                          {isEditing && (
                                            <button
                                              onClick={() => {
                                                // Add new pricing option with current service values
                                                const newOption = {
                                                  name: `Option ${service.pricingOptions.length + 1}`,
                                                  totalHours: service.totalHours,
                                                  hourlyRate: service.hourlyRate,
                                                  numPros: service.numPros,
                                                  totalAppointments: service.totalAppointments,
                                                  serviceCost: service.serviceCost
                                                };
                                                const newPricingOptions = [...service.pricingOptions, newOption];
                                                handleFieldChange(
                                                  ['services', location, date, 'services', serviceIndex, 'pricingOptions'],
                                                  newPricingOptions
                                                );
                                              }}
                                              className="mt-3 w-full px-4 py-2 bg-shortcut-navy-blue bg-opacity-10 text-shortcut-navy-blue border border-shortcut-navy-blue border-opacity-20 rounded-md hover:bg-shortcut-navy-blue hover:bg-opacity-20 transition-colors font-medium"
                                            >
                                              + Add New Option
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}

                                <div className="mt-6 bg-white rounded-xl p-6 border-2 border-shortcut-navy-blue shadow-md">
                                  <h4 className="text-xl font-extrabold mb-4 text-shortcut-navy-blue">Day {dateIndex + 1} Summary</h4>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-shortcut-teal bg-opacity-10 rounded-lg p-4 border border-shortcut-teal">
                                      <div className="text-sm font-bold text-shortcut-navy-blue mb-1">Total Appointments</div>
                                      <div className="text-2xl font-extrabold text-shortcut-navy-blue">{dateData.totalAppointments || 0}</div>
                                    </div>
                                    <div className="bg-shortcut-teal bg-opacity-10 rounded-lg p-4 border border-shortcut-teal">
                                      <div className="text-sm font-bold text-shortcut-navy-blue mb-1">Total Cost</div>
                                      <div className="text-2xl font-extrabold text-shortcut-navy-blue">${formatCurrency(dateData.totalCost || 0)}</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Summary Sections - Mobile: shown after services, Desktop: right sidebar */}
          <div className="lg:sticky lg:top-24 space-y-8 self-start order-2 lg:order-2">
            {/* Service Image Slider - Hidden on mobile */}
            {uniqueServiceTypes.length > 0 && (
              <div className="hidden lg:block">
                <div className="card-large overflow-hidden p-0">
                  <div className="relative flex flex-col">
                    <div className="w-full aspect-[4/3] relative overflow-hidden">
                      <img
                        src={getServiceImagePath(uniqueServiceTypes[currentServiceImageIndex])}
                        alt={`${getServiceDisplayName(uniqueServiceTypes[currentServiceImageIndex])} service`}
                        className="w-full h-full object-cover transition-opacity duration-500"
                        onError={(e) => {
                          console.error('Service image failed to load:', (e.target as HTMLImageElement).src);
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      {uniqueServiceTypes.length > 1 && (
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                          {uniqueServiceTypes.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentServiceImageIndex(index)}
                              className={`w-2 h-2 rounded-full transition-colors ${
                                index === currentServiceImageIndex 
                                  ? 'bg-white' 
                                  : 'bg-white/50 hover:bg-white/75'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="p-4 bg-shortcut-navy-blue rounded-b-2xl">
                      <h3 className="text-lg font-bold text-white text-center">
                        {uniqueServiceTypes.length === 1 
                          ? getServiceDisplayName(uniqueServiceTypes[0])
                          : `${uniqueServiceTypes.length} Services`
                        }
                      </h3>
                      {uniqueServiceTypes.length > 1 && (
                        <p className="text-white/90 text-sm text-center mt-1">
                          {uniqueServiceTypes.map(type => getServiceDisplayName(type)).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* City Summary (LocationSummary) - Light Blue */}
            {Object.entries(displayData.services || {}).map(([location, locationData]) => (
              <LocationSummary 
                key={location}
                location={location}
                services={locationData}
              />
            ))}

            {/* Event Summary - Dark Blue */}
            <div className="bg-shortcut-navy-blue text-white rounded-2xl shadow-lg border border-shortcut-navy-blue border-opacity-20 p-8">
              <h2 className="text-xl font-extrabold mb-6 text-white">Event Summary</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-white/20">
                  <span className="font-semibold">Total Appointments:</span>
                  <span className="font-bold text-lg">{displayData.summary?.totalAppointments}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="font-semibold">Total Event Cost:</span>
                  <span className="font-bold text-lg">${formatCurrency(displayData.summary?.totalEventCost || 0)}</span>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="card-large">
              <div className="mb-4">
                <h2 className="text-xl font-extrabold text-shortcut-blue mb-3">Notes</h2>
                {notes && (
                  <Button
                    onClick={handleSaveNotes}
                    disabled={isSavingNotes}
                    variant="primary"
                    icon={<Save size={18} />}
                    className="w-full sm:w-auto"
                  >
                    {isSavingNotes ? 'Saving...' : 'Save Notes'}
                  </Button>
                )}
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes or comments about the proposal here..."
                className="w-full min-h-[120px] p-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal resize-y font-medium"
              />
            </div>
          </div>
        </div>

        {/* Mobile: Service Agreement, Survey, Shortcut Difference, Change History - in specific order */}
        <div className="space-y-8 mt-8 lg:mt-0">
          <ServiceAgreement />

          {/* Survey Form - Show only when proposal is approved */}
          {proposal?.status === 'approved' && id && (
            <div id="proposal-survey-form" className="scroll-mt-24">
              <ProposalSurveyForm 
                proposalId={id}
                onSuccess={() => {
                  setHasSurveyResponse(true);
                  setShowSurveyCTA(false);
                  checkSurveyResponse();
                }}
              />
            </div>
          )}

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

          {/* Change History Section */}
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
                {changeSets.map((changeSet, index) => (
                  <div key={changeSet.id} className="card-small">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <User size={16} className="text-text-dark-60" />
                          <span className="font-bold text-shortcut-blue">{changeSet.clientName || 'Unknown Client'}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Mail size={16} className="text-text-dark-60" />
                          <span className="text-sm text-text-dark-60">{changeSet.clientEmail || 'No email'}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar size={16} className="text-text-dark-60" />
                          <span className="text-sm text-text-dark-60">
                            {new Date(changeSet.submittedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          changeSet.status === 'pending' ? 'bg-accent-yellow bg-opacity-20 text-shortcut-dark-blue' :
                          changeSet.status === 'approved' ? 'bg-shortcut-teal bg-opacity-20 text-shortcut-navy-blue' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {changeSet.status === 'pending' ? 'Pending' :
                           changeSet.status === 'approved' ? 'Approved' : 'Rejected'}
                        </span>
                      </div>
                    </div>

                    {changeSet.clientComment && (
                      <div className="mb-3 p-3 bg-shortcut-light-blue rounded border-l-4 border-shortcut-teal">
                        <p className="text-sm text-shortcut-dark-blue">
                          <strong>Client Comment:</strong> {changeSet.clientComment}
                        </p>
                      </div>
                    )}

                    {changeSet.adminComment && (
                      <div className="mb-3 p-3 bg-neutral-light-gray rounded border-l-4 border-shortcut-navy-blue">
                        <p className="text-sm text-text-dark">
                          <strong>Admin Comment:</strong> {changeSet.adminComment}
                        </p>
                      </div>
                    )}

                    <div className="text-sm text-text-dark-60">
                      <strong>Changes:</strong> {changeSet.changes.length} modification(s) submitted
                    </div>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card-large max-w-md w-full mx-4">
            <h3 className="h2 mb-4">
              Approve Proposal
            </h3>
            <p className="text-text-dark-60 mb-6">
              Are you sure you want to approve this proposal? This will notify our team and mark the proposal as approved.
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
                onClick={() => {
                  setShowApprovalConfirm(false);
                  handleApproval();
                }}
                variant="green"
                className="flex-1"
                loading={isApproving}
              >
                {isApproving ? 'Approving...' : 'Yes, Approve'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Change Confirmation Modal */}
      <ChangeConfirmationModal
        isOpen={showChangeConfirmation}
        onClose={() => setShowChangeConfirmation(false)}
        onConfirm={handleSubmitChanges}
        changes={pendingChanges}
        clientName={proposal?.clientName}
        clientEmail={proposal?.clientEmail}
        clientComment={clientComment}
        onCommentChange={setClientComment}
        isSubmitting={isSubmittingChanges}
      />

      {/* Help Modal - How to Edit this Proposal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowHelpModal(false)}>
          <div className="card-large max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="h2">How to Edit this Proposal</h2>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-2 rounded-lg hover:bg-neutral-light-gray transition-colors"
                aria-label="Close"
              >
                <X size={24} className="text-shortcut-blue" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InstructionCard
                title="Review"
                description="Take a peek! Double-check all event details, services, and pricing. Make sure it's all looking sharp and just right for you."
                icon="review"
                borderColorClass="border-accent-pink"
              />
              <InstructionCard
                title="Edit"
                description="Need a tweak? Easily adjust service hours or pro numbers. You can also jot down any notes for our team right here."
                icon="edit"
                borderColorClass="border-accent-yellow"
              />
              <InstructionCard
                title="Confirm"
                description="All set? Hit 'Save Changes' to lock it in. We'll get a heads-up with your updates and finalize everything smoothly."
                icon="confirm"
                borderColorClass="border-shortcut-teal"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StandaloneProposalViewer;