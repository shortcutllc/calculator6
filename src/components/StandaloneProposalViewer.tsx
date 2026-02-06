import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Edit, Save, Eye, Share2, ArrowLeft, Check, X, History as HistoryIcon, Globe, Copy, CheckCircle2, Download, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Mail, AlertCircle, Clock, CheckCircle, XCircle, User, Calendar, FileText, HelpCircle, Info, Brain } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { LoadingSpinner } from './LoadingSpinner';
import { usePageTitle } from '../hooks/usePageTitle';
import { config } from '../config';
import { recalculateServiceTotals, calculateServiceResults, calculateOriginalPrice } from '../utils/proposalGenerator';
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
import { trackProposalChanges, createChangeSet, getChangeDisplayInfo } from '../utils/changeTracker';
import { ProposalChangeSet, ProposalChange } from '../types/proposal';
import ProposalSurveyForm from './ProposalSurveyForm';
import { ChangeSourceBadge } from './ChangeSourceBadge';
import {
  WhyShortcutSection,
  CLEWhyShortcutSection,
  ParticipantBenefitsSection,
  AdditionalResourcesSection
} from './MindfulnessProposalContent';
import { UnifiedServiceSections } from './UnifiedProposalSections';

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
    case 'mindfulness-soles':
      return 'Grounding Under Pressure: The Soles of the Feet Practice';
    case 'mindfulness-movement':
      return 'Ground & Reset: Cultivating Mindfulness Through Movement and Stillness';
    case 'mindfulness-pro':
      return 'Mindfulness: PRO Practice';
    case 'mindfulness-cle':
      return 'Mindfulness: CLE Ethics Program';
    case 'mindfulness-pro-reactivity':
      return 'Pause, Relax, Open: Mindfulness Tools to Step Out of Reactivity and Respond Wisely';
    case 'makeup':
      return 'Makeup';
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

// Helper function to check if proposal contains only mindfulness services
const isMindfulnessOnlyProposal = (displayData: any): boolean => {
  const uniqueServiceTypes = getUniqueServiceTypes(displayData);

  if (uniqueServiceTypes.length === 0) return false;

  const mindfulnessTypes = [
    'mindfulness',
    'mindfulness-soles',
    'mindfulness-movement',
    'mindfulness-pro',
    'mindfulness-cle',
    'mindfulness-pro-reactivity'
  ];

  return uniqueServiceTypes.every(type =>
    mindfulnessTypes.includes(type.toLowerCase())
  );
};

// Helper function to check if proposal contains CLE service
const hasCLEService = (displayData: any): boolean => {
  const uniqueServiceTypes = getUniqueServiceTypes(displayData);
  return uniqueServiceTypes.some(type =>
    type.toLowerCase() === 'mindfulness-cle'
  );
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
    case 'makeup':
      return '/Facials Slider.png'; // Using facials image as fallback for makeup
    case 'headshot':
    case 'headshots':
      return '/Headshot Slider.png';
    case 'mindfulness':
    case 'mindfulness-soles':
    case 'mindfulness-movement':
    case 'mindfulness-pro':
    case 'mindfulness-cle':
    case 'mindfulness-pro-reactivity':
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
  
  // Check if it's Mindful Movement variant
  if (service.mindfulnessType === 'mindful-movement') {
    return "Mindful movement is a wonderful way to connect more fully with the present moment by resting attention on sensations that arise within the body moment to moment.";
  }
  
  const classLength = service.classLength || 40;
  const participants = service.participants || 'unlimited';
  
  if (classLength === 40 || classLength === 60) {
    return "In just one initial course your team will learn the fundamentals, experience guided meditations and gain practical tools to reduce stress and enhance focus.";
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
    case 'makeup':
      return "Experience personalized makeup artistry that enhances natural beauty and creates stunning looks tailored to each individual.";
    case 'mindfulness':
      return getMindfulnessDescription(service);
    case 'mindfulness-soles':
      return "This session introduces a powerful, body-based mindfulness practice designed to help attorneys manage stress, pressure, and emotional reactivity in real time. Participants learn the Soles of the Feet meditation, a grounding practice that helps calm the nervous system and invite both body and mind to relax. Particularly helpful in court, before high-stakes appearances, or during moments of emotional escalation.";
    case 'mindfulness-movement':
      return "This session emphasizes body-based mindfulness practices that help release tension and cultivate steadiness - especially effective for attorneys who feel mentally overloaded or physically depleted. Participants practice gentle, accessible mindful movement to release tension and awaken body awareness, followed by a Body Scan meditation to promote relaxation and presence.";
    case 'mindfulness-pro':
      return "This deeper-dive session focuses on helping attorneys step out of automatic reactivity and respond more wisely - especially in high-stakes, emotionally charged interactions. Participants learn the PRO (Pause-Relax-Open) practice and an informal \"On-the-Spot\" practice that can be used in the moment - before difficult conversations, emails, or decisions. Includes exploration of the neuroscience of stress, reactivity, and emotional regulation.";
    case 'mindfulness-cle':
      return "This one-hour CLE introduces mindfulness as an evidence-based skill set that supports ethical decision-making, professional responsibility, and sound judgment in legal practice. Participants will understand how stress impacts attention and ethical awareness, learn how mindfulness supports competence and clarity, and practice tools to pause, regulate stress, and respond intentionally. Shortcut manages the full CLE process including accreditation, attendance tracking, and credit reporting.";
    case 'mindfulness-pro-reactivity':
      return "This deeper-dive session focuses on helping attorneys step out of automatic reactivity and respond more wisely - especially in high-stakes, emotionally charged interactions. Participants will learn what mindfulness is, explore the neuroscience of stress and emotional regulation, and practice formal PRO (Pause-Relax-Open) techniques alongside informal 'On-the-Spot' practices for everyday legal work.";
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
  
  // Proposal options state (for grouped proposals)
  const [proposalOptions, setProposalOptions] = useState<any[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  
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
            proposalType: proposalData.proposal_type || 'event',
            totalCost: proposalData.data?.summary?.totalEventCost || proposalData.data?.mindfulnessProgram?.pricing?.totalCost || 0,
            eventDates: proposalData.data?.eventDates || [],
            locations: proposalData.data?.locations || []
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
          proposalType: dataToUse.proposal_type || 'event',
          totalCost: displayDataToUse?.summary?.totalEventCost || displayDataToUse?.mindfulnessProgram?.pricing?.totalCost || 0,
          eventDates: displayDataToUse?.eventDates || [],
          locations: displayDataToUse?.locations || []
        })
      });
    } catch (error) {
      console.error('Error sending Slack notification:', error);
      // Don't block the UI if Slack notification fails
    }
  };

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

          // Check if this is a mindfulness-only proposal
          const isMindfulness = isMindfulnessOnlyProposal(option.data);

          // For mindfulness proposals, use 'unlimited' for totalAppointments
          let totalAppointments = summary.totalAppointments;
          if (isMindfulness) {
            totalAppointments = 'unlimited';
          } else if (totalAppointments === undefined || totalAppointments === null) {
            totalAppointments = 0;
          }

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
        // Convert proposal data to change sets with actual changes
        // Filter out proposals where original_data equals data (initial generation)
        const changeSets: ProposalChangeSet[] = data
          .filter(proposal => {
            // Only include proposals that have actual changes (original_data != data)
            if (!proposal.original_data || !proposal.data) return false;
            // Use JSON comparison to check if they're different
            return JSON.stringify(proposal.original_data) !== JSON.stringify(proposal.data);
          })
          .map(proposal => {
            let changes: ProposalChange[] = [];
            if (proposal.original_data && proposal.data) {
              changes = trackProposalChanges(
                proposal.original_data,
                proposal.data,
                proposal.client_email,
                proposal.client_name
              );
            }
            
            return {
          id: proposal.id,
          proposalId: proposal.id,
              changes,
          clientEmail: proposal.client_email,
          clientName: proposal.client_name,
          clientComment: proposal.client_comment || '',
          status: 'pending' as const,
          submittedAt: proposal.updated_at,
          reviewedBy: proposal.reviewed_by,
          reviewedAt: proposal.reviewed_at,
              adminComment: proposal.admin_comment,
              changeSource: proposal.change_source,
              userId: proposal.user_id
            };
          })
          .filter(changeSet => changeSet.changeSource === 'client'); // Only show client changes
        
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

        // Check if this is a mindfulness proposal - if so, redirect to mindfulness viewer
        if (data.proposal_type === 'mindfulness-program' || data.data?.mindfulnessProgram) {
          navigate(`/proposal/${id}${location.search}`, { replace: true });
          return;
        }

        // Ensure data has required structure for regular proposals
        if (!data.data) {
          console.error('[StandaloneProposalViewer] ERROR: data.data is missing');
          throw new Error('Invalid proposal data structure - no data');
        }

        if (!data.data.services) {
          console.error('[StandaloneProposalViewer] ERROR: data.data.services is missing');
          console.error('[StandaloneProposalViewer] data.data:', JSON.stringify(data.data, null, 2));
          throw new Error('Invalid proposal data structure - no services');
        }

        const serviceCount = Object.values(data.data.services).reduce((count: number, locationData: any) => {
          return count + Object.values(locationData).reduce((locCount: number, dateData: any) => {
            return locCount + (dateData.services?.length || 0);
          }, 0);
        }, 0);
        console.log(`[StandaloneProposalViewer] Total services in data.data: ${serviceCount}`);

        // Preserve gratuity fields from proposal data before recalculation
        const gratuityType = data.data?.gratuityType || null;
        const gratuityValue = data.data?.gratuityValue || null;

        const calculatedData = recalculateServiceTotals(data.data);

        // Restore gratuity fields after recalculation
        if (gratuityType) calculatedData.gratuityType = gratuityType;
        if (gratuityValue !== null) calculatedData.gratuityValue = gratuityValue;

        // Ensure classLength and mindfulnessType are set correctly for mindfulness services
        if (calculatedData.services) {
          Object.values(calculatedData.services).forEach((locationData: any) => {
            Object.values(locationData).forEach((dateData: any) => {
              dateData.services?.forEach((service: any) => {
                if (service.serviceType === 'mindfulness') {
                  // Determine correct values: prioritize mindfulnessType if it exists, otherwise use classLength
                  let targetClassLength = 45;
                  let targetFixedPrice = 1375;
                  let targetMindfulnessType = 'intro';

                  // If mindfulnessType exists, use it to determine classLength
                  if (service.mindfulnessType === 'drop-in') {
                    targetClassLength = 30;
                    targetFixedPrice = 1250;
                    targetMindfulnessType = 'drop-in';
                  } else if (service.mindfulnessType === 'mindful-movement') {
                    targetClassLength = 60;
                    targetFixedPrice = 1500;
                    targetMindfulnessType = 'mindful-movement';
                  } else if (service.mindfulnessType === 'intro') {
                    targetClassLength = 45;
                    targetFixedPrice = 1375;
                    targetMindfulnessType = 'intro';
                  } else if (service.classLength) {
                    // No mindfulnessType, infer from classLength
                    if (service.classLength === 30) {
                      targetClassLength = 30;
                      targetFixedPrice = 1250;
                      targetMindfulnessType = 'drop-in';
                    } else if (service.classLength === 60) {
                      targetClassLength = 60;
                      targetFixedPrice = 1500;
                      targetMindfulnessType = 'mindful-movement';
                    } else {
                      // Default to intro (45 minutes)
                      targetClassLength = 45;
                      targetFixedPrice = 1375;
                      targetMindfulnessType = 'intro';
                    }
                  } else {
                    // No mindfulnessType and no classLength, default to intro
                    targetClassLength = 45;
                    targetFixedPrice = 1375;
                    targetMindfulnessType = 'intro';
                  }

                  // Apply the determined values
                  service.classLength = targetClassLength;
                  service.mindfulnessType = targetMindfulnessType;
                  service.fixedPrice = targetFixedPrice;
                }
              });
            });
          });
        }
        
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
        // Ensure clientLogoUrl is mapped from DB column if not present in nested data
        const logoUrl = calculatedData.clientLogoUrl || data.client_logo_url || null;
        setDisplayData({ ...calculatedData, customization: data.customization, clientLogoUrl: logoUrl });
        setEditedData({ ...calculatedData, customization: data.customization, clientLogoUrl: logoUrl });
        setNotes(data.notes || '');
        if (data.original_data) {
          const originalCalculated = recalculateServiceTotals(data.original_data);
          setOriginalData({ ...originalCalculated, customization: data.customization, clientLogoUrl: logoUrl });
        }
        
        // Fetch proposal options if this proposal is part of a group
        if (data.proposal_group_id) {
          fetchProposalOptions(data.proposal_group_id);
        } else {
          setProposalOptions([]);
        }
        
        // Show update indicator if this was a refresh
        if (isUpdate) {
          setLastUpdated(new Date());
          setShowUpdateIndicator(true);
          setTimeout(() => setShowUpdateIndicator(false), 3000);
        } else {
          // Track view only on initial load, not on refresh
          // The trackProposalView function will check if it's a client view
          if (!hasTrackedView) {
            trackProposalView(id, data);
            setHasTrackedView(true);
          }
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
      
      // If we're changing classLength for a mindfulness service, update mindfulnessType to match
      if (path[path.length - 1] === 'classLength' && service.serviceType === 'mindfulness') {
        const classLengthValue = typeof value === 'string' ? parseFloat(value) || 45 : (value || 45);
        let mindfulnessType = 'intro';
        let fixedPrice = 1375;

        if (classLengthValue === 30) {
          mindfulnessType = 'drop-in';
          fixedPrice = 1250;
        } else if (classLengthValue === 60) {
          mindfulnessType = 'mindful-movement';
          fixedPrice = 1500;
        } else {
          // Default to intro for 45 or any other value
          mindfulnessType = 'intro';
          fixedPrice = 1375;
        }
        
        service.mindfulnessType = mindfulnessType;
        service.fixedPrice = fixedPrice;
      }
      
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
            // Preserve discountPercent from option or service
            if (option.discountPercent !== undefined) {
              optionService.discountPercent = option.discountPercent;
            } else {
              optionService.discountPercent = service.discountPercent || 0;
            }
            const { totalAppointments, serviceCost, originalPrice } = calculateServiceResults(optionService);
            option.totalAppointments = totalAppointments;
            option.serviceCost = serviceCost;
            option.originalPrice = originalPrice || option.originalPrice;
            option.discountPercent = optionService.discountPercent;
          }
        } else if (path.includes('selectedOption')) {
          // We're just changing the selected option
          const selectedOption = service.pricingOptions[value !== undefined ? value : (service.selectedOption || 0)];
          if (selectedOption) {
            service.totalAppointments = selectedOption.totalAppointments;
            service.serviceCost = selectedOption.serviceCost;
            // Update totalHours, numPros, and hourlyRate to match the selected option
            if (selectedOption.totalHours !== undefined) {
              service.totalHours = selectedOption.totalHours;
            }
            if (selectedOption.numPros !== undefined) {
              service.numPros = selectedOption.numPros;
            }
            if (selectedOption.hourlyRate !== undefined) {
              service.hourlyRate = selectedOption.hourlyRate;
            }
            // Preserve discountPercent from selected option
            if (selectedOption.discountPercent !== undefined) {
              service.discountPercent = selectedOption.discountPercent;
            }
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
            // Preserve discountPercent from option or service
            if (option.discountPercent !== undefined) {
              optionService.discountPercent = option.discountPercent;
            } else {
              optionService.discountPercent = service.discountPercent || 0;
            }
            
            const { totalAppointments, serviceCost, originalPrice } = calculateServiceResults(optionService);
            return {
              ...option,
              totalAppointments,
              serviceCost,
              originalPrice: originalPrice || option.originalPrice,
              discountPercent: optionService.discountPercent
            };
          });
          
          // Update the service totals based on the selected option
          const selectedOption = service.pricingOptions[service.selectedOption || 0];
          if (selectedOption) {
            service.totalAppointments = selectedOption.totalAppointments;
            service.serviceCost = selectedOption.serviceCost;
            // Update totalHours, numPros, and hourlyRate to match the selected option
            if (selectedOption.totalHours !== undefined) {
              service.totalHours = selectedOption.totalHours;
            }
            if (selectedOption.numPros !== undefined) {
              service.numPros = selectedOption.numPros;
            }
            if (selectedOption.hourlyRate !== undefined) {
              service.hourlyRate = selectedOption.hourlyRate;
            }
            // Preserve discountPercent from selected option
            if (selectedOption.discountPercent !== undefined) {
              service.discountPercent = selectedOption.discountPercent;
            }
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
      
      const recalculatedData = recalculateServiceTotals(editedData);
      
      // Extract pricing options and selected options from the data
      const pricingOptions: any = {};
      const selectedOptions: any = {};
      
      Object.entries(recalculatedData.services || {}).forEach(([location, locationData]: [string, any]) => {
        Object.entries(locationData).forEach(([date, dateData]: [string, any]) => {
          dateData.services?.forEach((service: any, serviceIndex: number) => {
            if (service.pricingOptions && service.pricingOptions.length > 0) {
              const key = `${location}-${date}-${serviceIndex}`;
              pricingOptions[key] = service.pricingOptions;
              selectedOptions[key] = service.selectedOption || 0;
            }
          });
        });
      });
      
      // Build update object
      // Note: client_data column may not exist if migration not applied yet
      // The database trigger will handle it if the column exists
      const updateData: any = {
        data: recalculatedData,
        has_changes: true,
        pending_review: true,
        original_data: originalData || proposal.data,
        customization: proposal.customization,
        change_source: 'client',
        pricing_options: Object.keys(pricingOptions).length > 0 ? pricingOptions : null,
        selected_options: Object.keys(selectedOptions).length > 0 ? selectedOptions : null,
        has_pricing_options: recalculatedData.hasPricingOptions || false
      };

      const { error } = await supabase
        .from('proposals')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('Error saving changes:', JSON.stringify({
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        }, null, 2));
        throw error;
      }

      setDisplayData({ ...recalculatedData, customization: proposal.customization });
      setEditedData({ ...recalculatedData, customization: proposal.customization });
      setIsEditing(false);
      setHasUnsavedChanges(false);
      setPendingChanges([]);

      setShowChangesSaved(true);
      setTimeout(() => setShowChangesSaved(false), 5000);
    } catch (err) {
      console.error('Error saving changes:', err);
      setError('We encountered an issue saving your changes. Please try again in a moment.');
      setTimeout(() => setError(null), 5000);
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
      
      const recalculatedData = recalculateServiceTotals(editedData);
      
      // Extract pricing options and selected options from the data
      const pricingOptions: any = {};
      const selectedOptions: any = {};
      
      Object.entries(recalculatedData.services || {}).forEach(([location, locationData]: [string, any]) => {
        Object.entries(locationData).forEach(([date, dateData]: [string, any]) => {
          dateData.services?.forEach((service: any, serviceIndex: number) => {
            if (service.pricingOptions && service.pricingOptions.length > 0) {
              const key = `${location}-${date}-${serviceIndex}`;
              pricingOptions[key] = service.pricingOptions;
              selectedOptions[key] = service.selectedOption || 0;
            }
          });
        });
      });
      
      // Save changes to database with change tracking
      console.log('Saving changes to database:', {
        id,
        has_changes: true,
        pending_review: true,
        change_source: 'client',
        changesCount: pendingChanges.length
      });
      
      // Build update object
      // Note: client_data column may not exist if migration not applied yet
      // The database trigger will handle it if the column exists
      const updateData: any = {
        data: recalculatedData,
        has_changes: true,
        pending_review: true,
        original_data: originalData || proposal.data,
        customization: proposal.customization,
        change_source: 'client',
        pricing_options: Object.keys(pricingOptions).length > 0 ? pricingOptions : null,
        selected_options: Object.keys(selectedOptions).length > 0 ? selectedOptions : null,
        has_pricing_options: recalculatedData.hasPricingOptions || false
      };

      const { error } = await supabase
        .from('proposals')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('Error submitting changes:', JSON.stringify({
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        }, null, 2));
        throw error;
      }
      
      console.log('✅ Changes saved successfully to database');

      setDisplayData({ ...recalculatedData, customization: proposal.customization });
      setEditedData({ ...recalculatedData, customization: proposal.customization });
      setIsEditing(false);
      setHasUnsavedChanges(false);
      setPendingChanges([]);
      setClientComment('');
      setShowChangeConfirmation(false);

      setShowChangesSaved(true);
      setTimeout(() => setShowChangesSaved(false), 5000);

      // Send Slack notification for changes submitted
      sendProposalEventNotification('changes_submitted');
    } catch (err) {
      console.error('Error submitting changes:', err);
      setError('We encountered an issue submitting your changes. Please try again in a moment.');
      setTimeout(() => setError(null), 5000);
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
          pending_review: true,
          change_source: 'client' // Client changes made in StandaloneProposalViewer
        })
        .eq('id', id);

      if (error)
        throw error;

      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving notes:', err);
      setError('We encountered an issue saving your notes. Please try again in a moment.');
      setTimeout(() => setError(null), 5000);
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
      setError('We encountered an issue downloading your PDF. Please try again in a moment.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleApproval = async () => {
    if (!id || !displayData) return;
    
    try {
      setIsApproving(true);
      
      // Get the current data (use editedData if in edit mode, otherwise displayData)
      const dataToSave = editedData || displayData;
      const recalculatedData = recalculateServiceTotals(dataToSave);
      
      // Extract pricing options and selected options from the data
      const pricingOptions: any = {};
      const selectedOptions: any = {};
      
      Object.entries(recalculatedData.services || {}).forEach(([location, locationData]: [string, any]) => {
        Object.entries(locationData).forEach(([date, dateData]: [string, any]) => {
          dateData.services?.forEach((service: any, serviceIndex: number) => {
            if (service.pricingOptions && service.pricingOptions.length > 0) {
              const key = `${location}-${date}-${serviceIndex}`;
              pricingOptions[key] = service.pricingOptions;
              selectedOptions[key] = service.selectedOption || 0;
            }
          });
        });
      });
      
      // First, save any changes (including pricing option selections) with change_source
      const updateData: any = {
        data: recalculatedData,
        status: 'approved',
        pending_review: false,
        has_changes: false,
        change_source: 'client', // Mark as client change
        pricing_options: Object.keys(pricingOptions).length > 0 ? pricingOptions : null,
        selected_options: Object.keys(selectedOptions).length > 0 ? selectedOptions : null,
        has_pricing_options: recalculatedData.hasPricingOptions || false
      };

      // Try update - skip client_data initially since migration may not be applied
      // The database trigger will handle client_data if the column exists
      const { error: updateError } = await supabase
        .from('proposals')
        .update(updateData)
        .eq('id', id);

      if (updateError) {
        console.error('Proposal approval update error:', JSON.stringify({
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint
        }, null, 2));
        throw updateError;
      }

      // Update local state to reflect saved data
      setDisplayData({ ...recalculatedData, customization: proposal?.customization });
      setEditedData({ ...recalculatedData, customization: proposal?.customization });
      
      // Reload proposal to get updated pricing options
      const { data: updatedProposal, error: fetchError } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', id)
        .single();
      
      if (!fetchError && updatedProposal) {
        const updatedCalculatedData = recalculateServiceTotals(updatedProposal.data);
        
        // Reload pricing options
        if (updatedProposal.pricing_options && updatedProposal.selected_options) {
          Object.entries(updatedCalculatedData.services || {}).forEach(([location, locationData]: [string, any]) => {
            Object.entries(locationData).forEach(([date, dateData]: [string, any]) => {
              dateData.services?.forEach((service: any, serviceIndex: number) => {
                const key = `${location}-${date}-${serviceIndex}`;
                if (updatedProposal.pricing_options[key]) {
                  service.pricingOptions = updatedProposal.pricing_options[key];
                  service.selectedOption = updatedProposal.selected_options[key] || 0;
                }
              });
            });
          });
        }
        
        setProposal(updatedProposal);
        setDisplayData({ ...updatedCalculatedData, customization: updatedProposal.customization });
        setEditedData({ ...updatedCalculatedData, customization: updatedProposal.customization });
      } else {
        // Fallback: just update status
        setProposal((prev: typeof proposal) => prev ? { ...prev, status: 'approved' } : null);
      }

      // Send email approval notification (existing)
      const response = await fetch(`${config.supabase.url}/functions/v1/proposal-approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.supabase.anonKey}`,
        },
        body: JSON.stringify({
          proposalId: id,
          clientName: displayData.clientName,
          totalCost: recalculatedData.summary?.totalEventCost || 0,
          eventDates: recalculatedData.eventDates,
          locations: recalculatedData.locations
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to send email approval notification:', errorData);
      }

      // Send Slack notification for approval
      sendProposalEventNotification('approved', {
        ...proposal,
        data: recalculatedData
      });

      setShowApprovalSuccess(true);
      setTimeout(() => setShowApprovalSuccess(false), 8000); // Show longer for multiple options

      // Scroll to survey form after a short delay
      setTimeout(() => {
        const surveyElement = document.getElementById('proposal-survey-form');
        if (surveyElement) {
          surveyElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 1000);
    } catch (err) {
      console.error('Error approving proposal:', err);
      setError('We encountered an issue approving your proposal. Please try again in a moment.');
      setTimeout(() => setError(null), 5000);
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
        .maybeSingle(); // Use maybeSingle instead of single to handle no rows gracefully

      if (error) {
        // PGRST116 = no rows returned (this is expected if no survey exists yet)
        // PGRST301 = relation does not exist (table hasn't been created yet)
        // 406 = Not Acceptable (may indicate RLS or schema issue)
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
        // Handle 406 errors gracefully - table might exist but have permission issues
        if (error.code === 'PGRST406' || error.message?.includes('406')) {
          console.warn('Survey table access issue (406). This may indicate a migration needs to be applied.');
          setShowSurveyCTA(false);
          return;
        }
        console.error('Error checking survey response:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
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
      // On any error, don't show the CTA to avoid confusion
      setShowSurveyCTA(false);
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

  // Get current option details for approval clarity
  const currentOption = proposalOptions.find((opt: any) => opt.id === id);
  const currentOptionName = currentOption?.option_name || proposal?.option_name;
  const currentOptionIndex = proposalOptions.findIndex((opt: any) => opt.id === id);

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
        <div className="fixed top-0 left-0 w-full z-[98] bg-blue-600 text-white px-4 py-3 shadow-lg">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between">
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
      
      <header className={`bg-white shadow-sm sticky ${proposalOptions.length > 1 ? (showSurveyCTA ? 'top-16' : 'top-0') : (showSurveyCTA ? 'top-16' : 'top-0')} z-[99] rounded-b-3xl`}>
        <div className="max-w-[1600px] mx-auto px-4 py-4 sm:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img 
                src="/shortcut-logo-blue.svg" 
                alt="Shortcut Logo" 
                className="h-8 w-auto"
              />
            </div>
            <div className="flex items-center gap-4">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-full shadow-sm">
                  <AlertCircle size={18} className="text-red-600" />
                  <span className="font-bold text-sm">{error}</span>
                </div>
              )}
              {showChangesSaved && (
                <div className="flex items-center gap-2 bg-shortcut-teal bg-opacity-20 text-shortcut-navy-blue px-4 py-2.5 rounded-full border border-shortcut-teal shadow-sm">
                  <CheckCircle2 size={18} className="text-shortcut-teal-blue" />
                  <span className="font-bold text-sm">Your changes have been saved successfully!</span>
                </div>
              )}
              {showApprovalSuccess ? (
                <div className="flex items-center gap-2 bg-shortcut-teal bg-opacity-20 text-shortcut-navy-blue px-4 py-2.5 rounded-full border border-shortcut-teal shadow-sm">
                  <CheckCircle2 size={18} className="text-shortcut-teal-blue" />
                  <span className="font-bold text-sm">
                    {proposalOptions.length > 1 && currentOptionName
                      ? `Thank you! "${currentOptionName}" has been approved and our team has been notified.`
                      : 'Thank you! Your proposal has been approved and our team has been notified.'
                    }
                  </span>
                </div>
              ) : proposal?.status === 'approved' && (
                <div className="flex items-center gap-2 bg-shortcut-teal bg-opacity-20 text-shortcut-navy-blue px-4 py-2.5 rounded-full border border-shortcut-teal shadow-sm">
                  <CheckCircle2 size={18} className="text-shortcut-teal-blue" />
                  <span className="font-bold text-sm">
                    {proposalOptions.length > 1 && currentOptionName
                      ? `"${currentOptionName}" approved! Our team has been notified.`
                      : 'Proposal approved! Our team has been notified.'
                    }
                  </span>
                </div>
              )}

              <div className="flex flex-wrap gap-2 sm:gap-4 items-center">
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
                    <span className="font-semibold">
                      {proposalOptions.length > 1 && currentOptionName
                        ? `${currentOptionName} Approved`
                        : 'Proposal Approved'
                      }
                    </span>
                  </div>
                ) : (
                  <Button
                    onClick={() => setShowApprovalConfirm(true)}
                    variant="green"
                    icon={<Check size={18} />}
                    loading={isApproving}
                  >
                    {isApproving 
                      ? 'Approving...' 
                      : proposalOptions.length > 1 && currentOptionName
                        ? `Approve ${currentOptionName}`
                        : 'Approve Proposal'
                    }
                  </Button>
                )}
                {proposal?.is_editable && !showingOriginal && (
                  isEditing ? (
                    <Button
                      onClick={handleSaveChanges}
                      variant={hasUnsavedChanges ? 'green' : 'primary'}
                      icon={<Save size={18} />}
                      loading={isSavingChanges}
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
                      <div className="flex items-center gap-2 flex-wrap">
                        {isMindfulness && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                            isActive
                              ? 'bg-shortcut-pink/30 text-white border border-shortcut-pink/50'
                              : 'bg-shortcut-pink/20 text-shortcut-navy-blue border border-shortcut-pink/30'
                          }`}>
                            <Brain size={12} />
                            Mindfulness
                          </span>
                        )}
                        {!isMindfulness && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                            isActive
                              ? 'bg-shortcut-teal/30 text-white border border-shortcut-teal/50'
                              : 'bg-shortcut-teal/20 text-shortcut-navy-blue border border-shortcut-teal/30'
                          }`}>
                            Event
                          </span>
                        )}
                        {isMindfulness && sessionCount > 0 && (
                          <span className={`text-sm font-medium ${isActive ? 'text-blue-100' : 'text-text-dark-60'}`}>
                            {sessionCount} {sessionCount === 1 ? 'Session' : 'Sessions'}
                          </span>
                        )}
                        {!isMindfulness && eventCount > 0 && (
                          <span className={`text-sm font-medium ${isActive ? 'text-blue-100' : 'text-text-dark-60'}`}>
                            {eventCount} {eventCount === 1 ? 'Event Date' : 'Event Dates'}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Key Metrics - Prominent Display */}
                    <div className="mt-auto space-y-4 pt-6 border-t" style={{ borderColor: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.1)' }}>
                      <div className="flex justify-between items-baseline">
                        <span className={`text-xs font-bold uppercase tracking-wide ${isActive ? 'text-blue-100' : 'text-text-dark-60'}`}>
                          Total Cost
                        </span>
                        <span className={`text-2xl font-extrabold ${isActive ? 'text-white' : 'text-shortcut-navy-blue'}`}>
                          ${formatCurrency(option.totalCost || 0)}
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

      <main className={`max-w-[1600px] mx-auto px-4 scroll-mt-24 ${
        proposalOptions.length > 1 
          ? (showSurveyCTA ? 'pt-8' : 'pt-8') 
          : (showSurveyCTA ? 'pt-24' : 'pt-16')
      } pb-12`} id="proposal-content">
        {/* Safety check: Don't render if this is a mindfulness proposal */}
        {displayData?.mindfulnessProgram ? (
          <div className="text-center py-12">
            <p className="text-lg text-text-dark-60">Redirecting to mindfulness proposal viewer...</p>
          </div>
        ) : (
          <>
        {/* Compact Hero Header - Inspired by GenericLandingPage */}
        <div className="relative overflow-hidden rounded-2xl md:rounded-3xl mb-6 md:mb-8 scroll-mt-24" style={{ backgroundColor: '#F0F0FF' }}>
          <div className="relative z-10 px-4 py-6 md:px-10 md:py-12">
            {/* Top Row: Logo/Name + Total Cost */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-6 mb-5 md:mb-6">
              {/* Client Identity */}
              <div className="flex items-center gap-4">
                {displayData.clientLogoUrl && (
                  <img
                    src={displayData.clientLogoUrl}
                    alt={`${displayData.clientName} Logo`}
                    className="h-10 md:h-16 max-w-[160px] md:max-w-[200px] object-contain"
                    onError={(e) => {
                      // Hide broken logo images gracefully
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                <h1 className="text-xl md:text-3xl font-extrabold text-shortcut-navy-blue">
                  {displayData.clientName}
                </h1>
              </div>

              {/* Total Cost - Prominent Display */}
              <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl px-4 py-2.5 md:px-5 md:py-3 shadow-sm border border-white/50">
                <div className="text-right">
                  <p className="text-[10px] md:text-xs font-bold text-shortcut-blue uppercase tracking-wider mb-0.5 md:mb-1">Total Investment</p>
                  <p className="text-xl md:text-3xl font-extrabold text-shortcut-navy-blue">${formatCurrency(displayData.summary?.totalEventCost || 0)}</p>
                </div>
              </div>
            </div>

            {/* Inline Metrics Row */}
            <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:gap-4 mb-5 md:mb-6">
              {/* Event Dates */}
              <div className="inline-flex items-center gap-1.5 md:gap-2 bg-white/60 backdrop-blur-sm rounded-full px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm">
                <Calendar size={14} className="text-shortcut-blue flex-shrink-0" />
                <span className="font-semibold text-shortcut-navy-blue truncate">
                  {Array.isArray(displayData.eventDates)
                    ? displayData.eventDates.map((date: string) => formatDate(date)).join(', ')
                    : 'TBD'}
                </span>
              </div>

              {/* Locations */}
              <div className="inline-flex items-center gap-1.5 md:gap-2 bg-white/60 backdrop-blur-sm rounded-full px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm">
                <Globe size={14} className="text-shortcut-blue flex-shrink-0" />
                <span className="font-semibold text-shortcut-navy-blue truncate">
                  {Array.isArray(displayData.locations)
                    ? displayData.locations.join(', ')
                    : displayData.locations || 'TBD'}
                </span>
              </div>

              {/* Total Appointments */}
              <div className="inline-flex items-center gap-1.5 md:gap-2 bg-white/60 backdrop-blur-sm rounded-full px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm">
                <User size={14} className="text-shortcut-blue flex-shrink-0" />
                <span className="font-semibold text-shortcut-navy-blue">
                  {displayData.summary?.totalAppointments || 0} appts
                </span>
              </div>

              {/* Office Location - Show actual address */}
              {((displayData.officeLocations && Object.keys(displayData.officeLocations).length > 0) || displayData.officeLocation) && (
                <div className="inline-flex items-center gap-1.5 md:gap-2 bg-white/60 backdrop-blur-sm rounded-full px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm col-span-2 md:col-span-1">
                  <FileText size={14} className="text-shortcut-blue flex-shrink-0" />
                  <span className="font-semibold text-shortcut-navy-blue truncate">
                    {displayData.officeLocations && Object.keys(displayData.officeLocations).length > 0
                      ? Object.entries(displayData.officeLocations).map(([loc, addr]: [string, any]) =>
                          Object.keys(displayData.officeLocations).length > 1 ? `${loc}: ${addr}` : addr
                        ).join(' · ')
                      : displayData.officeLocation}
                  </span>
                </div>
              )}
            </div>

            {/* Custom Note - From Shortcut */}
            {displayData.customization?.customNote && (
              <div className="bg-white/70 backdrop-blur-sm rounded-xl px-4 py-3 md:px-5 md:py-4 border border-white/50">
                <div className="flex items-start gap-2.5 md:gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <img src="/shortcut-icon.svg" alt="" className="w-4 h-4 md:w-5 md:h-5" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  </div>
                  <div>
                    <p className="text-[10px] md:text-xs font-bold text-shortcut-blue uppercase tracking-wider mb-1">Note from Shortcut</p>
                    <p className="text-sm md:text-base text-shortcut-navy-blue leading-relaxed font-medium">
                      {displayData.customization.customNote.replace('above', 'below')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Subtle decorative element */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-shortcut-teal/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
        </div>

        {/* Mobile Layout: Single column with specific order */}
        <div className="lg:grid lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Main Content - Services (Day summary + Location Section) - shown first on mobile after top box */}
          <div className="lg:col-span-8 space-y-6 md:space-y-8 order-1 lg:order-1">

            <div className="space-y-6 md:space-y-8">
              {displayData.services && Object.entries(displayData.services).map(([location, locationData]: [string, any]) => (
                <div key={location} className="card-large">
                    <button
                      onClick={() => toggleLocation(location)}
                    className="w-full flex justify-between items-center mb-4 md:mb-8 hover:opacity-80 transition-opacity"
                    >
                    <h2 className="text-xl md:text-3xl font-extrabold text-shortcut-blue">
                        {location}
                      </h2>
                    {expandedLocations[location] ? <ChevronUp size={24} className="text-shortcut-blue" /> : <ChevronDown size={24} className="text-shortcut-blue" />}
                    </button>

                  {expandedLocations[location] && (
                    <div className="pt-4 md:pt-8 border-t-2 border-gray-200 space-y-6 md:space-y-8">
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
                              className="w-full px-4 py-3 md:px-8 md:py-5 flex justify-between items-center bg-white hover:bg-neutral-light-gray transition-colors border-b-2 border-gray-200"
                            >
                              <h3 className="text-base md:text-xl font-extrabold text-shortcut-blue">
                                Day {dateIndex + 1} - {formatDate(date)}
                              </h3>
                              {expandedDates[date] ? <ChevronUp size={20} className="text-shortcut-blue" /> : <ChevronDown size={20} className="text-shortcut-blue" />}
                            </button>

                            {expandedDates[date] && (
                              <div className="p-3 md:p-8 bg-white">
                                {dateData.services.map((service: any, serviceIndex: number) => (
                                  <div
                                    key={serviceIndex}
                                    className={`card-small mb-4 md:mb-8 border-2 ${getServiceBorderClass(service.serviceType)}`}
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 md:mb-5">
                                      <h4 className="text-base md:text-xl font-extrabold text-shortcut-blue flex items-center">
                                        <span className="w-3 h-3 md:w-3.5 md:h-3.5 rounded-full bg-shortcut-teal mr-2 md:mr-3 flex-shrink-0"></span>
                                        {getServiceDisplayName(service.serviceType)}
                                      </h4>
                                      {service.isRecurring && service.recurringFrequency && (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-indigo-500 text-white self-start sm:self-auto">
                                          Recurring
                                          <span className="opacity-80">
                                            ({service.recurringFrequency.type === 'quarterly' ? 'Quarterly' :
                                              service.recurringFrequency.type === 'monthly' ? 'Monthly' :
                                              `${service.recurringFrequency.occurrences}x`})
                                          </span>
                                          {service.recurringFrequency.occurrences >= 4 && (
                                            <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[10px]">
                                              {service.recurringFrequency.occurrences >= 9 ? '20%' : '15%'} off
                                            </span>
                                          )}
                                        </span>
                                      )}
                                    </div>

                                    {/* Recurring Event Details */}
                                    {service.isRecurring && service.recurringFrequency && (() => {
                                      const occurrences = service.recurringFrequency.occurrences;
                                      const discountRate = occurrences >= 9 ? 0.20 : occurrences >= 4 ? 0.15 : 0;
                                      // service.serviceCost is THIS event's cost (already discounted)
                                      const thisEventDiscounted = service.serviceCost;
                                      const thisEventOriginal = discountRate > 0 ? thisEventDiscounted / (1 - discountRate) : thisEventDiscounted;
                                      const thisEventSavings = thisEventOriginal - thisEventDiscounted;

                                      return (
                                        <div className="mb-4 md:mb-5 p-2.5 md:p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
                                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                            <div className="flex items-center gap-1.5 md:gap-2">
                                              <span className="text-sm md:text-base">🔄</span>
                                              <span className="font-semibold text-purple-800 text-xs md:text-sm">Recurring Partner</span>
                                              <span className="text-purple-600 text-xs md:text-sm">({occurrences} events)</span>
                                            </div>
                                            {discountRate > 0 && (
                                              <span className="text-green-700 font-semibold text-xs md:text-sm">
                                                ✨ {discountRate * 100}% discount applied
                                              </span>
                                            )}
                                          </div>
                                          {discountRate > 0 && (
                                            <div className="mt-2 pt-2 border-t border-purple-200 flex justify-between text-sm">
                                              <span className="text-purple-700">This event savings:</span>
                                              <span className="font-bold text-green-700">-${formatCurrency(thisEventSavings)}</span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}

                                    {/* Service Description */}
                                    {getServiceDescription(service) && (
                                      <div className="mb-5 p-6 bg-white rounded-xl border-2 border-shortcut-teal shadow-sm">
                                        <p className="text-text-dark text-base leading-relaxed font-medium">
                                          {getServiceDescription(service)}
                                        </p>
                                        {service.serviceType === 'mindfulness' && (
                                          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                              <span className="font-bold text-shortcut-navy-blue">Event Time:</span>
                                              <span className="ml-2 text-text-dark">{service.classLength || 40} Min</span>
                                            </div>
                                            <div>
                                              <span className="font-bold text-shortcut-navy-blue">Participants:</span>
                                              <span className="ml-2 text-text-dark">
                                                {service.participants === 'unlimited' ? '∞' : service.participants}
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
                                      {service.serviceType === 'mindfulness' ? (
                                        <div className="flex justify-between items-center py-3 md:py-4 border-b-2 border-gray-200">
                                          <span className="text-base md:text-lg font-bold text-shortcut-blue">Class Length:</span>
                                          <div className="font-bold text-text-dark text-base md:text-lg">
                                            {isEditing ? (
                                              <EditableField
                                                value={String(service.classLength || 40)}
                                                onChange={(value) => handleFieldChange(['services', location, date, 'services', serviceIndex, 'classLength'], typeof value === 'string' ? parseFloat(value) || 40 : value)}
                                                isEditing={isEditing}
                                                type="number"
                                                suffix=" minutes"
                                              />
                                            ) : (
                                              <span>{service.classLength || 40} minutes</span>
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex justify-between items-center py-3 md:py-4 border-b-2 border-gray-200">
                                          <span className="text-base md:text-lg font-bold text-shortcut-blue">Total Hours:</span>
                                          <div className="font-bold text-text-dark text-base md:text-lg">
                                            <EditableField
                                              value={String(service.totalHours || 0)}
                                              onChange={(value) => handleFieldChange(['services', location, date, 'services', serviceIndex, 'totalHours'], typeof value === 'string' ? parseFloat(value) || 0 : value)}
                                              isEditing={isEditing}
                                              type="number"
                                              suffix=" hours"
                                            />
                                          </div>
                                        </div>
                                      )}
                                      <div className="flex justify-between items-center py-3 md:py-4 border-b-2 border-gray-200">
                                        <span className="text-base md:text-lg font-bold text-shortcut-blue">Professionals:</span>
                                        <div className="font-bold text-text-dark text-base md:text-lg">
                                          <EditableField
                                            value={String(service.numPros || 0)}
                                            onChange={(value) => handleFieldChange(['services', location, date, 'services', serviceIndex, 'numPros'], typeof value === 'string' ? parseFloat(value) || 0 : value)}
                                            isEditing={isEditing}
                                            type="number"
                                          />
                                        </div>
                                      </div>
                                      <div className="flex justify-between items-center py-3 md:py-4 border-b-2 border-gray-200">
                                        <span className="text-base md:text-lg font-bold text-shortcut-blue">Appointments:</span>
                                        <span className="font-bold text-text-dark text-base md:text-lg">{service.totalAppointments === 'unlimited' ? '∞' : service.totalAppointments}</span>
                                      </div>
                                      <div className="flex justify-between items-center py-3 md:py-4 border-b-2 border-gray-200">
                                        <span className="text-base md:text-lg font-bold text-shortcut-blue">Service Cost:</span>
                                        <div className="text-right">
                                          {service.discountPercent > 0 ? (
                                            <div className="space-y-1">
                                              <div className="flex items-center gap-1.5 md:gap-2">
                                                <span className="text-xs md:text-sm text-text-dark-60 line-through">${formatCurrency(calculateOriginalPrice(service))}</span>
                                                <span className="font-bold text-shortcut-blue text-base md:text-lg">${formatCurrency(service.serviceCost)}</span>
                                              </div>
                                              <div className="text-xs font-semibold text-green-600">
                                                {service.discountPercent}% discount applied
                                              </div>
                                            </div>
                                          ) : (
                                            <span className="font-bold text-shortcut-blue text-base md:text-lg">${formatCurrency(service.serviceCost)}</span>
                                          )}
                                        </div>
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
                                                  // Update the selected option - handleFieldChange will update all totals including totalHours
                                                  handleFieldChange(
                                                    ['services', location, date, 'services', serviceIndex, 'selectedOption'], 
                                                    optionIndex
                                                  );
                                                }}
                                              >
                                                <div className="flex justify-between items-start mb-2">
                                                  <div className="flex-1">
                                                    <h6 className="font-extrabold text-shortcut-blue">
                                                      Option {optionIndex + 1}
                                                    </h6>
                                                    <p className="text-sm text-text-dark-60">
                                                      {option.totalAppointments === 'unlimited' ? '∞' : option.totalAppointments} appointments
                                                    </p>
                                                  </div>
                                                  <div className="text-right">
                                                    {(option.discountPercent > 0 || service.discountPercent > 0) ? (
                                                      <div className="space-y-1">
                                                        <div className="flex items-center gap-2 justify-end">
                                                          <span className="text-sm text-text-dark-60 line-through">${formatCurrency(option.originalPrice || calculateOriginalPrice({ ...service, totalHours: option.totalHours || service.totalHours, hourlyRate: option.hourlyRate || service.hourlyRate, numPros: option.numPros || service.numPros }))}</span>
                                                          <span className="text-lg font-bold text-shortcut-blue">${formatCurrency(option.serviceCost)}</span>
                                                        </div>
                                                        <div className="text-xs font-semibold text-green-600">
                                                          {(option.discountPercent || service.discountPercent || 0)}% discount
                                                        </div>
                                                      </div>
                                                    ) : (
                                                      <div className="text-lg font-bold text-shortcut-blue">
                                                        ${formatCurrency(option.serviceCost)}
                                                      </div>
                                                    )}
                                                    {service.selectedOption === optionIndex && (
                                                      <div className="text-xs text-shortcut-navy-blue font-semibold mt-1">
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
                                                    <div>
                                                      <label className="text-xs font-bold text-shortcut-blue">Discount %:</label>
                                                      <EditableField
                                                        value={String(option.discountPercent !== undefined ? option.discountPercent : (service.discountPercent || 0))}
                                                        onChange={(value) => {
                                                          const discountValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
                                                          handleFieldChange(
                                                            ['services', location, date, 'services', serviceIndex, 'pricingOptions', optionIndex, 'discountPercent'], 
                                                            discountValue
                                                          );
                                                        }}
                                                        isEditing={isEditing}
                                                        type="number"
                                                        suffix="%"
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
                                            <div className="mt-4 p-3 bg-neutral-light-gray rounded-lg border border-shortcut-teal">
                                              <p className="text-sm text-text-dark">
                                                💡 <strong>Tip:</strong> Click on any option above to select it. The selected option will be used for cost calculations.
                                              </p>
                                            </div>
                                          )}
                                          {isEditing && (
                                            <button
                                              onClick={() => {
                                                // Add new pricing option with current service values
                                                const optionService = {
                                                  ...service,
                                                  totalHours: service.totalHours,
                                                  hourlyRate: service.hourlyRate,
                                                  numPros: service.numPros,
                                                  discountPercent: service.discountPercent || 0
                                                };
                                                const { totalAppointments, serviceCost, originalPrice } = calculateServiceResults(optionService);
                                                const newOption = {
                                                  name: `Option ${service.pricingOptions.length + 1}`,
                                                  totalHours: service.totalHours,
                                                  hourlyRate: service.hourlyRate,
                                                  numPros: service.numPros,
                                                  discountPercent: service.discountPercent || 0,
                                                  totalAppointments,
                                                  serviceCost,
                                                  originalPrice
                                                };
                                                const newPricingOptions = [...service.pricingOptions, newOption];
                                                handleFieldChange(
                                                  ['services', location, date, 'services', serviceIndex, 'pricingOptions'],
                                                  newPricingOptions
                                                );
                                              }}
                                              className="mt-3 w-full px-4 py-2 bg-shortcut-navy-blue bg-opacity-10 text-text-dark border border-shortcut-navy-blue border-opacity-20 rounded-md hover:bg-shortcut-navy-blue hover:bg-opacity-20 transition-colors font-medium"
                                            >
                                              + Add New Option
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}

                                <div className="mt-4 md:mt-8 bg-white rounded-xl p-4 md:p-8 border-2 border-shortcut-navy-blue shadow-md">
                                  <h4 className="text-lg md:text-2xl font-extrabold mb-4 md:mb-6 text-shortcut-navy-blue">Day {dateIndex + 1} Summary</h4>
                                  <div className="grid grid-cols-2 gap-3 md:gap-6">
                                    <div className="bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 rounded-xl p-3 md:p-6 border-2 border-shortcut-teal border-opacity-30">
                                      <div className="text-[10px] md:text-xs font-bold text-shortcut-blue mb-2 md:mb-3 uppercase tracking-wider">Appointments</div>
                                      <div className="text-xl md:text-3xl font-extrabold text-shortcut-navy-blue">
                                        {dateData.totalAppointments === 0 || dateData.totalAppointments === 'unlimited' ? '∞' : (dateData.totalAppointments || 0)}
                                      </div>
                                    </div>
                                    <div className="bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 rounded-xl p-3 md:p-6 border-2 border-shortcut-teal border-opacity-30">
                                      <div className="text-[10px] md:text-xs font-bold text-shortcut-blue mb-2 md:mb-3 uppercase tracking-wider">Total Cost</div>
                                      {displayData.isAutoRecurring && displayData.autoRecurringDiscount ? (
                                        <div>
                                          <div className="text-sm md:text-xl font-semibold text-shortcut-navy-blue/60 line-through">
                                            ${formatCurrency(dateData.totalCost || 0)}
                                          </div>
                                          <div className="text-xl md:text-3xl font-extrabold text-green-600">
                                            ${formatCurrency((dateData.totalCost || 0) * (1 - displayData.autoRecurringDiscount / 100))}
                                          </div>
                                          <div className="text-[10px] md:text-xs text-green-600 font-bold mt-1">
                                            {displayData.autoRecurringDiscount}% discount
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="text-xl md:text-3xl font-extrabold text-shortcut-navy-blue">${formatCurrency(dateData.totalCost || 0)}</div>
                                      )}
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

            {/* Why Shortcut Section - Show CLE version if CLE present, otherwise regular */}
            {isMindfulnessOnlyProposal(displayData) && (
              hasCLEService(displayData) ? <CLEWhyShortcutSection /> : <WhyShortcutSection />
            )}

            {/* Participant Benefits - Show for mindfulness-only proposals in left column */}
            {isMindfulnessOnlyProposal(displayData) && (
              <ParticipantBenefitsSection />
            )}

            {/* Additional Resources - Show for mindfulness-only proposals in left column */}
            {isMindfulnessOnlyProposal(displayData) && (
              <AdditionalResourcesSection />
            )}

            {/* Unified Service Sections - Why Shortcut + Collapsible Service Details */}
            {/* Only show for non-mindfulness proposals (mindfulness has its own sections above) */}
            {!isMindfulnessOnlyProposal(displayData) && uniqueServiceTypes.length > 0 && (
              <UnifiedServiceSections
                serviceTypes={uniqueServiceTypes}
                showWhyShortcut={true}
              />
            )}
              </div>

          {/* Summary Sections - Mobile: shown after services, Desktop: right sidebar */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-8 self-start order-2 lg:order-2">
            {/* Service Image Slider - Hidden on mobile */}
            {uniqueServiceTypes.length > 0 && (
              <div className="hidden lg:block">
                <div className="card-large overflow-hidden p-0 shadow-xl">
                  <div className="relative flex flex-col">
                    <div className="w-full aspect-[4/3] relative overflow-hidden bg-gradient-to-br from-shortcut-teal/20 to-shortcut-navy-blue/20">
                    <img
                      src={getServiceImagePath(uniqueServiceTypes[currentServiceImageIndex])}
                      alt={`${getServiceDisplayName(uniqueServiceTypes[currentServiceImageIndex])} service`}
                      className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                      onError={(e) => {
                        console.error('Service image failed to load:', (e.target as HTMLImageElement).src);
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-shortcut-navy-blue/40 to-transparent"></div>
                    {uniqueServiceTypes.length > 1 && (
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                        {uniqueServiceTypes.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentServiceImageIndex(index)}
                            className={`w-2.5 h-2.5 rounded-full transition-colors ${
                              index === currentServiceImageIndex 
                                ? 'bg-white shadow-lg' 
                                : 'bg-white/50 hover:bg-white/75'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                    <div className="p-6 bg-gradient-to-r from-shortcut-navy-blue to-shortcut-dark-blue rounded-b-2xl">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-shortcut-teal animate-pulse"></div>
                      <h3 className="text-lg font-extrabold text-white text-center">
                        {uniqueServiceTypes.length === 1 
                          ? getServiceDisplayName(uniqueServiceTypes[0])
                          : `${uniqueServiceTypes.length} Services`
                        }
                      </h3>
                    </div>
                    {uniqueServiceTypes.length > 1 && (
                      <p className="text-white/90 text-sm text-center mt-2">
                        {uniqueServiceTypes.map(type => getServiceDisplayName(type)).join(', ')}
                      </p>
                    )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Courtney's Bio - Show if proposal is mindfulness-only */}
            {isMindfulnessOnlyProposal(displayData) && (
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
                    Courtney Schulnick
                  </p>
                  <div className="pt-4 border-t-2 border-gray-200">
                    <p className="text-base text-text-dark leading-relaxed font-medium">
                      Courtney Schulnick, an attorney with two decades of experience, now leads mindfulness programs at Shortcut. With extensive training from the Myrna Brind Center for Mindfulness, she brings a unique perspective to corporate wellness. Her workshops help employees achieve balance and vitality, transforming workplace well-being and productivity.
                    </p>
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
                isAutoRecurring={displayData.isAutoRecurring}
                autoRecurringDiscount={displayData.autoRecurringDiscount}
                officeAddress={displayData.officeLocations?.[location] || displayData.officeLocation}
              />
            ))}

            {/* Event Summary - Dark Blue */}
            <div className="bg-gradient-to-br from-shortcut-navy-blue to-shortcut-dark-blue text-white rounded-2xl shadow-xl border-2 border-shortcut-teal border-opacity-30 p-5 md:p-8">
              <div className="flex items-center justify-between mb-6 md:mb-8">
                <div className="flex items-center space-x-2 md:space-x-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-shortcut-teal bg-opacity-20 flex items-center justify-center">
                    <FileText className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  </div>
                  <h2 className="text-lg md:text-xl font-extrabold text-white">Event Summary</h2>
                </div>
                {/* Check for recurring services or auto-recurring */}
                {(() => {
                  let recurringCount = 0;
                  Object.values(displayData.services || {}).forEach((locationData: any) => {
                    Object.values(locationData || {}).forEach((dateData: any) => {
                      (dateData.services || []).forEach((service: any) => {
                        if (service.isRecurring && service.recurringFrequency) {
                          recurringCount++;
                        }
                      });
                    });
                  });

                  // Show auto-recurring badge if applicable
                  if (displayData.isAutoRecurring && displayData.autoRecurringDiscount) {
                    return (
                      <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-indigo-500 text-white whitespace-nowrap">
                        <span>✨</span>
                        <span>{displayData.autoRecurringDiscount}% Recurring Discount</span>
                      </span>
                    );
                  }

                  return recurringCount > 0 ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                      🔄 {recurringCount} Recurring
                    </span>
                  ) : null;
                })()}
              </div>
              <div className="space-y-4 md:space-y-6">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-white/90 text-base md:text-lg">Appointments:</span>
                  <span className="font-extrabold text-xl md:text-2xl text-white">
                    {displayData.summary?.totalAppointments === 0 || displayData.summary?.totalAppointments === 'unlimited' ? '∞' : (displayData.summary?.totalAppointments || 0)}
                  </span>
                </div>
                {displayData.summary?.subtotalBeforeGratuity !== undefined && displayData.summary?.gratuityAmount !== undefined && displayData.summary.gratuityAmount > 0 && (
                  <>
                    <div className="flex justify-between items-center pt-4 border-t-2 border-shortcut-teal/30">
                      <span className="font-semibold text-white/90 text-base md:text-lg">Subtotal:</span>
                      <span className="font-extrabold text-lg md:text-xl text-white">${formatCurrency(displayData.summary.subtotalBeforeGratuity || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-white/90 text-base md:text-lg">
                        Gratuity {displayData.gratuityType === 'percentage' ? `(${displayData.gratuityValue}%)` : ''}:
                      </span>
                      <span className="font-extrabold text-lg md:text-xl text-white">${formatCurrency(displayData.summary.gratuityAmount || 0)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center pt-4 border-t-2 border-shortcut-teal">
                  <span className="font-extrabold text-base md:text-lg text-white">Total Event Cost:</span>
                  <span className="font-extrabold text-xl md:text-2xl text-shortcut-teal">${formatCurrency(displayData.summary?.totalEventCost || 0)}</span>
                </div>
                {/* Recurring Savings Display (manual or auto) */}
                {(() => {
                  // Check for auto-recurring savings first
                  if (displayData.isAutoRecurring && displayData.autoRecurringSavings && displayData.autoRecurringSavings > 0) {
                    return (
                      <div className="mt-4 pt-4 border-t-2 border-shortcut-teal/30">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-white/90 text-sm md:text-lg flex items-center gap-1.5 md:gap-2">
                            <span className="text-sm md:text-lg">✨</span>
                            Recurring ({displayData.autoRecurringDiscount}%):
                          </span>
                          <span className="font-extrabold text-lg md:text-xl text-green-300">-${formatCurrency(displayData.autoRecurringSavings)}</span>
                        </div>
                        <p className="text-sm text-white/60 mt-2">
                          Applied automatically for {displayData.eventDates?.filter((d: string) => d !== 'TBD').length}+ event dates
                        </p>
                      </div>
                    );
                  }

                  // Check for manual recurring savings
                  let totalSavings = 0;
                  let hasRecurring = false;
                  Object.values(displayData.services || {}).forEach((locationData: any) => {
                    Object.values(locationData || {}).forEach((dateData: any) => {
                      (dateData.services || []).forEach((service: any) => {
                        if (service.isRecurring && service.recurringFrequency && service.recurringFrequency.occurrences >= 4) {
                          hasRecurring = true;
                          const discount = service.recurringFrequency.occurrences >= 9 ? 0.20 : 0.15;
                          // Estimate savings based on service cost
                          const originalCost = service.serviceCost / (1 - discount);
                          totalSavings += originalCost - service.serviceCost;
                        }
                      });
                    });
                  });
                  return hasRecurring && totalSavings > 0 ? (
                    <div className="mt-4 pt-4 border-t-2 border-shortcut-teal/30">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-white/90 text-sm md:text-lg flex items-center gap-1.5 md:gap-2">
                          <span className="text-sm md:text-lg">✨</span>
                          Recurring Savings:
                        </span>
                        <span className="font-extrabold text-lg md:text-xl text-green-300">-${formatCurrency(totalSavings)}</span>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            </div>

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
                    icon={<Save size={18} />}
                    className="w-full"
                  >
                    {isSavingNotes ? 'Saving...' : 'Save Notes'}
                  </Button>
                )}
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes or comments about the proposal here..."
                className="w-full min-h-[140px] p-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal resize-y font-medium text-base leading-relaxed transition-all"
              />
            </div>
          </div>
        </div>

        {/* Mobile: Survey, Service Agreement, Shortcut Difference, Change History - in specific order */}
        <div className="space-y-8 mt-12 lg:mt-16">
          {/* Survey Form - Show only when proposal is approved */}
          {proposal?.status === 'approved' && id && (
            <div id="proposal-survey-form" className="scroll-mt-24">
              <ProposalSurveyForm 
                proposalId={id}
                includesMassage={uniqueServiceTypes.some(type => type.toLowerCase() === 'massage')}
                locations={displayData?.locations || []}
                officeLocation={displayData?.officeLocation}
                officeLocations={displayData?.officeLocations}
                onSuccess={() => {
                  setHasSurveyResponse(true);
                  setShowSurveyCTA(false);
                  checkSurveyResponse();
                }}
              />
            </div>
          )}

          <ServiceAgreement />

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
              <div className="card-medium min-w-[280px] sm:min-w-[360px] max-w-[420px] flex-none overflow-hidden flex flex-col p-0">
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

              <div className="card-medium min-w-[280px] sm:min-w-[360px] max-w-[420px] flex-none overflow-hidden flex flex-col p-0">
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

              <div className="card-medium min-w-[280px] sm:min-w-[360px] max-w-[420px] flex-none overflow-hidden flex flex-col p-0">
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

                    {/* Show actual changes */}
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
                    
                    {(!changeSet.changes || changeSet.changes.length === 0) && (
                      <div className="text-sm text-text-dark-60 italic">
                        Changes detected but details not available
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
        </>
        )}
      </main>

      {/* Approval Confirmation Modal */}
      {showApprovalConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4">
          <div className="card-large max-w-2xl w-full mx-4">
            <h3 className="h2 mb-4">
              Approve Proposal
            </h3>
            
            {/* Show which option is being approved if there are multiple options */}
            {proposalOptions.length > 1 && proposal && (
              <div className="mb-6 p-4 bg-shortcut-navy-blue bg-opacity-10 rounded-xl border-2 border-shortcut-navy-blue border-opacity-20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-shortcut-navy-blue text-white flex items-center justify-center text-sm font-extrabold">
                    {currentOptionIndex + 1}
                  </div>
                  <div>
                    <h4 className="text-lg font-extrabold text-shortcut-navy-blue">
                      {currentOptionName || `Option ${currentOptionIndex + 1}`}
                    </h4>
                    <p className="text-sm text-text-dark-60">
                      You are approving this specific option
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-shortcut-navy-blue border-opacity-20">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-text-dark-60 mb-1">Total Cost</p>
                    <p className="text-xl font-extrabold text-shortcut-navy-blue">
                      ${formatCurrency(displayData?.summary?.totalEventCost || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-text-dark-60 mb-1">Total Appointments</p>
                    <p className="text-xl font-extrabold text-shortcut-navy-blue">
                      {displayData?.summary?.totalAppointments === 0 || displayData?.summary?.totalAppointments === 'unlimited' ? '∞' : (displayData?.summary?.totalAppointments || 0)}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <p className="text-base text-text-dark-60 font-medium mb-6">
              {proposalOptions.length > 1 
                ? 'Are you sure you want to approve this option? This will notify our team and mark this specific proposal option as approved.'
                : 'Are you sure you want to approve this proposal? This will notify our team and mark the proposal as approved.'
              }
            </p>
            
            {proposalOptions.length > 1 && (
              <div className="mb-6 p-3 bg-shortcut-service-yellow bg-opacity-20 rounded-lg border border-shortcut-service-yellow border-opacity-30">
                <p className="text-sm font-semibold text-shortcut-dark-blue">
                  💡 Note: Only this option will be approved. Other options will remain available for comparison.
                </p>
              </div>
            )}
            
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
                {isApproving ? 'Approving...' : 'Yes, Approve This Option'}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4" onClick={() => setShowHelpModal(false)}>
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