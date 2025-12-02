import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Edit, Save, Eye, Share2, ArrowLeft, Check, X, History as HistoryIcon, Globe, Copy, CheckCircle2, Download, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Send, AlertCircle, Clock, CheckCircle, XCircle, User, Mail, Calendar, Pencil, Briefcase } from 'lucide-react';
import { useProposal } from '../contexts/ProposalContext';
import { useAuth } from '../contexts/AuthContext';
import EditableField from './EditableField';
import { supabase } from '../lib/supabaseClient';
import { config } from '../config';
import { format } from 'date-fns';
import { recalculateServiceTotals, generatePricingOptionsForService, calculateServiceResults } from '../utils/proposalGenerator';
import { getProposalUrl } from '../utils/url';
import { generatePDF } from '../utils/pdf';
import { Button } from './Button';
import ServiceAgreement from './ServiceAgreement';
import LocationSummary from './LocationSummary';
import ShareProposalModal from './ShareProposalModal';
import { ProposalChangeSet, ProposalChange } from '../types/proposal';
import { ChangeSourceBadge } from './ChangeSourceBadge';
import { trackProposalChanges, getChangeDisplayInfo } from '../utils/changeTracker';

const formatCurrency = (value: number): string => {
  return value.toFixed(2);
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
    case 'makeup':
      return 'Makeup';
    default:
      // For other services, capitalize first letter and make rest lowercase
      return serviceType.charAt(0).toUpperCase() + serviceType.slice(1).toLowerCase();
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
    case 'makeup':
      return '/Facials Slider.png'; // Using facials image as fallback for makeup
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
    case 'makeup':
      return "Experience personalized makeup artistry that enhances natural beauty and creates stunning looks tailored to each individual.";
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

// Helper function to format date for display
const formatDate = (dateString: string): string => {
  try {
    if (!dateString) return 'No Date';
    if (dateString === 'TBD') return 'Date TBD';
    
    // If it's already in YYYY-MM-DD format, parse it directly
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return format(date, 'MMMM d, yyyy');
    }
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return format(date, 'MMMM d, yyyy');
  } catch (err) {
    console.error('Error formatting date:', err);
    return 'Invalid Date';
  }
};

// Helper function to format date for input (YYYY-MM-DD)
const formatDateForInput = (dateString: string): string => {
  try {
    if (!dateString) return '';
    if (dateString === 'TBD') return '';
    
    // If it's already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (err) {
    console.error('Error formatting date for input:', err);
    return '';
  }
};

const ProposalViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { getProposal, updateProposal, currentProposal, loading, error } = useProposal();
  const { user } = useAuth();
  const isSharedView = location.search.includes('shared=true');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<any>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [originalData, setOriginalData] = useState<any>(null);
  const [showingOriginal, setShowingOriginal] = useState(false);
  const [displayData, setDisplayData] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedLocations, setExpandedLocations] = useState<{[key: string]: boolean}>({});
  
  // Change tracking state
  const [changeSets, setChangeSets] = useState<ProposalChangeSet[]>([]);
  const [showChangeHistory, setShowChangeHistory] = useState(false);
  const [expandedDates, setExpandedDates] = useState<{[key: string]: boolean}>({});
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [showSendToClientModal, setShowSendToClientModal] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [shareNote, setShareNote] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [showShareSuccess, setShowShareSuccess] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [currentServiceImageIndex, setCurrentServiceImageIndex] = useState(0);
  const [updateCounter, setUpdateCounter] = useState(0);
  const [editingOfficeLocation, setEditingOfficeLocation] = useState<string | null>(null);

  useEffect(() => {
    if (displayData?.clientLogoUrl) {
      setLogoUrl(displayData.clientLogoUrl);
    } else {
      setLogoUrl('');
    }
  }, [displayData?.clientLogoUrl]);

  // Initialize Google Maps autocomplete for edit mode
  useEffect(() => {
    if (isEditing && editingOfficeLocation !== null) {
      const initializeGoogleMaps = () => {
        const inputId = `office-location-edit-input-${editingOfficeLocation}`;
        const input = document.getElementById(inputId) as HTMLInputElement;
        if (input && window.google && window.google.maps && window.google.maps.places) {
          try {
            // Initialize Places Autocomplete
            const autocomplete = new window.google.maps.places.Autocomplete(input, {
              types: ['address'],
              componentRestrictions: { country: 'us' }
            });

            // Handle place selection
            autocomplete.addListener('place_changed', () => {
              const place = autocomplete.getPlace();
              if (place.formatted_address) {
                if (displayData.officeLocations && Object.keys(displayData.officeLocations).length > 0) {
                  // Update officeLocations object
                  const updatedOfficeLocations = {
                    ...(editedData?.officeLocations || displayData.officeLocations),
                    [editingOfficeLocation]: place.formatted_address
                  };
                  handleFieldChange(['officeLocations'], updatedOfficeLocations);
                } else {
                  // Legacy: update single officeLocation
                  handleFieldChange(['officeLocation'], place.formatted_address);
                }
                setEditingOfficeLocation(null);
              }
            });

            console.log(`Google Maps Places Autocomplete initialized for ${editingOfficeLocation}`);
          } catch (error) {
            console.error(`Error initializing Google Maps Places Autocomplete for ${editingOfficeLocation}:`, error);
          }
        }
      };

      // Initialize Google Maps if not loaded
      if (!window.google || !window.google.maps) {
        if (window.initGoogleMaps) {
          window.initGoogleMaps();
        }
      }

      // Check for Google Maps availability and initialize
      const checkGoogleMaps = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
          initializeGoogleMaps();
          clearInterval(checkGoogleMaps);
        }
      }, 100);

      return () => {
        clearInterval(checkGoogleMaps);
      };
    }
  }, [isEditing, editingOfficeLocation]);

  // Auto-rotate service images
  useEffect(() => {
    const uniqueServiceTypes = getUniqueServiceTypes(displayData);
    if (uniqueServiceTypes.length > 1) {
      const interval = setInterval(() => {
        setCurrentServiceImageIndex(prev => 
          prev < uniqueServiceTypes.length - 1 ? prev + 1 : 0
        );
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [displayData]);

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setLogoUploadError('Please upload an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLogoUploadError('Logo file must be less than 5MB');
      return;
    }
    
    // Check if user is authenticated
    if (!user) {
      setLogoUploadError('You must be logged in to upload files. Please log in and try again.');
      return;
    }
    
    setLogoUploadError(null);
    setLogoUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${id}-${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('client-logos')
        .upload(fileName, file, { upsert: true });
      if (error) {
        console.error('Storage upload error:', error);
        if (error.message.includes('bucket')) {
          throw new Error('Storage bucket not found. Please contact support.');
        } else if (error.message.includes('policy')) {
          throw new Error('Upload permission denied. Please contact support.');
        } else {
          throw error;
        }
      }
      const { data: publicUrlData } = supabase.storage
        .from('client-logos')
        .getPublicUrl(fileName);
      setLogoUrl(publicUrlData.publicUrl);
      setLogoFile(file);
      setHasChanges(true);
      setEditedData((prev: any) => ({ ...prev, clientLogoUrl: publicUrlData.publicUrl }));
    } catch (err: any) {
      console.error('Logo upload error:', err);
      setLogoUploadError(err.message || 'Failed to upload logo. Please try again.');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleLogoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoUrl(e.target.value);
    setLogoFile(null);
    setLogoUploadError(null);
    setHasChanges(true);
    setEditedData((prev: any) => ({ ...prev, clientLogoUrl: e.target.value }));
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
    setLogoFile(null);
    setLogoUploadError(null);
    setHasChanges(true);
    setEditedData((prev: any) => ({ ...prev, clientLogoUrl: '' }));
  };

  const handleDateChange = (path: string[], newDate: string) => {
    if (!editedData || !isEditing) return;
    
    let updatedData = { ...editedData };
    
    // If updating a service date
    if (path.includes('services')) {
      const [_, location, oldDate, serviceIndex] = path;
      
      // If the new date is TBD, just update the service's date property
      if (newDate === 'TBD') {
        // Move the service to TBD key
        const serviceToMove = updatedData.services[location][oldDate].services[serviceIndex];
        
        // Create TBD entry if it doesn't exist
        if (!updatedData.services[location]['TBD']) {
          updatedData.services[location]['TBD'] = {
            services: [],
            totalCost: 0,
            totalAppointments: 0
          };
        }

        // Move the service to TBD
        updatedData.services[location]['TBD'].services.push({
          ...serviceToMove,
          date: 'TBD'
        });

        // Remove service from old date
        updatedData.services[location][oldDate].services.splice(serviceIndex, 1);

        // Clean up old date if no services remain
        if (updatedData.services[location][oldDate].services.length === 0) {
          delete updatedData.services[location][oldDate];
        }
      } else {
        // If we're changing from TBD to a real date, or between real dates
        const serviceToMove = updatedData.services[location][oldDate].services[serviceIndex];
        
        // Create new date entry if it doesn't exist
        if (!updatedData.services[location][newDate]) {
          updatedData.services[location][newDate] = {
            services: [],
            totalCost: 0,
            totalAppointments: 0
          };
        }

        // Move the service to the new date
        updatedData.services[location][newDate].services.push({
          ...serviceToMove,
          date: newDate
        });

        // Remove service from old date
        updatedData.services[location][oldDate].services.splice(serviceIndex, 1);

        // Clean up old date if no services remain
        if (updatedData.services[location][oldDate].services.length === 0) {
          delete updatedData.services[location][oldDate];
        }
      }
    } 
    // If updating event dates directly
    else if (path[0] === 'eventDates') {
      const index = parseInt(path[1]);
      updatedData.eventDates[index] = newDate;
    }

    // Update eventDates array to match all service dates
    const allDates = new Set<string>();
    Object.values(updatedData.services || {}).forEach((locationData: any) => {
      Object.keys(locationData).forEach(date => allDates.add(date));
    });
    updatedData.eventDates = Array.from(allDates).sort((a, b) => {
      // Handle TBD dates - put them at the end
      if (a === 'TBD' && b === 'TBD') return 0;
      if (a === 'TBD') return 1;
      if (b === 'TBD') return -1;
      
      // Sort actual dates normally
      return new Date(a).getTime() - new Date(b).getTime();
    });

    // Recalculate totals and update state
    const recalculatedData = recalculateServiceTotals(updatedData);
    setEditedData({ ...recalculatedData, customization: currentProposal?.customization });
    setDisplayData({ ...recalculatedData, customization: currentProposal?.customization });
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

  useEffect(() => {
    if (!id) {
      setLoadError('Proposal ID is required');
      return;
    }
    
    initializeProposal();
    fetchChangeSets();
  }, [id]);

  // Function to fetch change sets for this proposal
  const fetchChangeSets = async () => {
    if (!id) return;
    
    try {
      // Get the current proposal to see all changes
      const { data: proposalData, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching proposal:', error);
        return;
      }

      if (!proposalData || !proposalData.original_data || !proposalData.data) {
        setChangeSets([]);
        return;
      }

      // Check if there are actual changes
      if (JSON.stringify(proposalData.original_data) === JSON.stringify(proposalData.data)) {
        setChangeSets([]);
        return;
      }

      const changeSets: ProposalChangeSet[] = [];
      
      // Track client changes separately from staff changes
      // If client_data exists, it means client made changes
      // original_data = data before client changes
      // client_data = data after client changes
      // data = current data (after staff changes if staff made changes)
      
      // Track client changes (if client_data exists)
      if (proposalData.client_data) {
        const clientChanges = trackProposalChanges(
          proposalData.original_data,
          proposalData.client_data,
          proposalData.client_email,
          proposalData.client_name
        );
        
        if (clientChanges.length > 0) {
          changeSets.push({
            id: `${proposalData.id}-client`,
            proposalId: proposalData.id,
            changes: clientChanges,
            clientEmail: proposalData.client_email,
            clientName: proposalData.client_name,
            clientComment: proposalData.client_comment || '',
            status: proposalData.pending_review ? 'pending' : (proposalData.status === 'approved' ? 'approved' : 'pending'),
            submittedAt: proposalData.updated_at,
            reviewedBy: proposalData.reviewed_by,
            reviewedAt: proposalData.reviewed_at,
            adminComment: proposalData.admin_comment,
            changeSource: 'client',
            userId: null
          });
        }
      }
      
      // Track staff changes (if change_source is staff and data differs from client_data)
      if ((proposalData.change_source === 'staff' || proposalData.change_source === 'admin') && proposalData.client_data) {
        // Staff made changes after client changes
        // Compare client_data (after client changes) to current data (after staff changes)
        const staffChanges = trackProposalChanges(
          proposalData.client_data,
          proposalData.data,
          proposalData.client_email,
          proposalData.client_name
        );
        
        if (staffChanges.length > 0) {
          changeSets.push({
            id: `${proposalData.id}-staff`,
            proposalId: proposalData.id,
            changes: staffChanges,
            clientEmail: proposalData.client_email,
            clientName: proposalData.client_name,
            clientComment: proposalData.client_comment || '',
            status: proposalData.pending_review ? 'pending' : (proposalData.status === 'approved' ? 'approved' : 'pending'),
            submittedAt: proposalData.updated_at,
            reviewedBy: proposalData.reviewed_by,
            reviewedAt: proposalData.reviewed_at,
            adminComment: proposalData.admin_comment,
            changeSource: 'staff',
            userId: proposalData.user_id
          });
        }
      } else if (proposalData.change_source === 'staff' || proposalData.change_source === 'admin') {
        // Staff made changes but no client changes (or client_data not set)
        // Compare original_data to current data
        const staffChanges = trackProposalChanges(
          proposalData.original_data,
          proposalData.data,
          proposalData.client_email,
          proposalData.client_name
        );
        
        if (staffChanges.length > 0) {
          changeSets.push({
            id: `${proposalData.id}-staff`,
            proposalId: proposalData.id,
            changes: staffChanges,
            clientEmail: proposalData.client_email,
            clientName: proposalData.client_name,
            clientComment: proposalData.client_comment || '',
            status: proposalData.pending_review ? 'pending' : (proposalData.status === 'approved' ? 'approved' : 'pending'),
            submittedAt: proposalData.updated_at,
            reviewedBy: proposalData.reviewed_by,
            reviewedAt: proposalData.reviewed_at,
            adminComment: proposalData.admin_comment,
            changeSource: 'staff',
            userId: proposalData.user_id
          });
        }
      } else if (proposalData.change_source === 'client' && !proposalData.client_data) {
        // Client made changes (first time, client_data not set yet)
        // Compare original_data to current data
        const clientChanges = trackProposalChanges(
          proposalData.original_data,
          proposalData.data,
          proposalData.client_email,
          proposalData.client_name
        );
        
        if (clientChanges.length > 0) {
          changeSets.push({
            id: `${proposalData.id}-client`,
            proposalId: proposalData.id,
            changes: clientChanges,
            clientEmail: proposalData.client_email,
            clientName: proposalData.client_name,
            clientComment: proposalData.client_comment || '',
            status: proposalData.pending_review ? 'pending' : (proposalData.status === 'approved' ? 'approved' : 'pending'),
            submittedAt: proposalData.updated_at,
            reviewedBy: proposalData.reviewed_by,
            reviewedAt: proposalData.reviewed_at,
            adminComment: proposalData.admin_comment,
            changeSource: 'client',
            userId: null
          });
        }
      }
        
      setChangeSets(changeSets);
    } catch (error) {
      console.error('Error fetching change sets:', error);
    }
  };

  const initializeProposal = async () => {
    try {
      setLoadError(null);
      setIsLoading(true);
      
      const proposal = await getProposal(id!);
      if (!proposal) {
        throw new Error('Proposal not found');
      }
      
      const calculatedData = recalculateServiceTotals(proposal.data);
      
      // Load pricing options from the database
      if (proposal.pricingOptions && proposal.selectedOptions) {
        Object.entries(calculatedData.services || {}).forEach(([location, locationData]: [string, any]) => {
          Object.entries(locationData).forEach(([date, dateData]: [string, any]) => {
            dateData.services?.forEach((service: any, serviceIndex: number) => {
              const key = `${location}-${date}-${serviceIndex}`;
              if (proposal.pricingOptions?.[key]) {
                service.pricingOptions = proposal.pricingOptions[key];
                service.selectedOption = proposal.selectedOptions?.[key] || 0;
              }
            });
          });
        });
        calculatedData.hasPricingOptions = proposal.hasPricingOptions || false;
      }
      
      setEditedData({ ...calculatedData, customization: proposal.customization });
      setDisplayData({ ...calculatedData, customization: proposal.customization });
      setNotes(proposal.notes || '');
      setIsShared(proposal.isShared || false);
      
      if (proposal.originalData) {
        const originalCalculated = recalculateServiceTotals(proposal.originalData);
        setOriginalData({ ...originalCalculated, customization: proposal.customization });
        
        if (proposal.hasChanges) {
          setHasChanges(true);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load proposal';
      setLoadError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVersion = () => {
    if (showingOriginal) {
      // Going back to current view
      setDisplayData({ ...editedData, customization: currentProposal?.customization });
    } else {
      // Check if there are user edits to show
      if (currentProposal?.hasChanges && originalData) {
        // Show user's edits (the original data that was saved when user made changes)
        const originalCalculated = recalculateServiceTotals(originalData);
        setDisplayData({ ...originalCalculated, customization: currentProposal?.customization });
      } else {
        // No user edits exist, stay on current view
        return; // Don't toggle the state
      }
    }
    setShowingOriginal(!showingOriginal);
    setIsEditing(false);
  };

  const toggleEditMode = () => {
    if (showingOriginal) {
      setShowingOriginal(false);
      setDisplayData({ ...editedData, customization: currentProposal?.customization });
    }
    setIsEditing(!isEditing);
    if (!isEditing) {
      const currentData = currentProposal?.data || editedData;
      setEditedData(recalculateServiceTotals(JSON.parse(JSON.stringify(currentData))));
    }
  };

  const handleFieldChange = (path: string[], value: any) => {
    if (!editedData || !isEditing) return;
    
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
    setEditedData({ ...recalculatedData, customization: currentProposal?.customization });
    setDisplayData({ ...recalculatedData, customization: currentProposal?.customization });
    setUpdateCounter(prev => prev + 1);
  };

  const handleSaveChanges = async () => {
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
      
      await updateProposal(id, {
        data: recalculatedData,
        customization: editedData?.customization || currentProposal?.customization,
        pricingOptions,
        selectedOptions,
        hasPricingOptions: recalculatedData.hasPricingOptions || false,
        changeSource: 'staff' // Admin/staff changes made in ProposalViewer
        // The trigger will handle preserving client_data when staff makes changes
      });
      
      setIsEditing(false);
      const finalCustomization = editedData?.customization || currentProposal?.customization;
      setEditedData({ ...recalculatedData, customization: finalCustomization });
      setDisplayData({ ...recalculatedData, customization: finalCustomization });
      setHasChanges(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save changes';
      setLoadError(errorMessage);
      console.error(error);
    } finally {
      setIsSavingChanges(false);
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

      if (error) throw error;
    } catch (err) {
      console.error('Error saving notes:', err);
      setLoadError('Failed to save notes');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const toggleShared = async () => {
    if (!id) return;

    try {
      const { error } = await supabase
        .from('proposals')
        .update({ is_shared: !isShared })
        .eq('id', id);

      if (error) throw error;
      setIsShared(!isShared);
    } catch (err) {
      console.error('Error toggling share status:', err);
      alert('Failed to update sharing status');
    }
  };

  const copyShareLink = async () => {
    const shareUrl = getProposalUrl(id!, true);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      alert('Failed to copy link to clipboard');
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

  const handleSendToClient = async () => {
    if (!id || !clientEmail.trim()) {
      alert('Please enter a valid client email address.');
      return;
    }
    
    try {
      setIsSharing(true);
      
      // First, update the proposal with the client email if it's different
      if (clientEmail !== currentProposal?.clientEmail) {
        const { error: updateError } = await supabase
          .from('proposals')
          .update({ client_email: clientEmail })
          .eq('id', id);

        if (updateError) throw updateError;
        
        // Update local state
        if (currentProposal) {
          currentProposal.clientEmail = clientEmail;
        }
      }
      
      // Send the proposal email
      const response = await fetch(`${config.supabase.url}/functions/v1/proposal-share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.supabase.anonKey}`,
        },
        body: JSON.stringify({
          proposalId: id,
          clientEmail: clientEmail,
          clientName: clientName.trim() || displayData.clientName,
          shareNote: shareNote.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send proposal');
      }

      setShowSendToClientModal(false);
      setShowShareSuccess(true);
      setTimeout(() => setShowShareSuccess(false), 5000);
    } catch (err) {
      console.error('Error sending proposal:', err);
      alert('Failed to send proposal. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const openSendToClientModal = () => {
    setClientName(displayData.clientName || '');
    setClientEmail(currentProposal?.clientEmail || '');
    setShareNote(`Hi ${displayData.clientName || 'there'},

I'm excited to share your custom wellness proposal with you! This proposal has been carefully crafted based on your specific needs and requirements.

Please review the proposal and let me know if you have any questions or would like to make any adjustments.

Best regards,
The Shortcut Team`);
    setShowSendToClientModal(true);
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-neutral-light-gray flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-shortcut-navy-blue"></div>
      </div>
    );
  }

  if (loadError || error) {
    return (
      <div className="min-h-screen bg-neutral-light-gray flex items-center justify-center">
        <div className="card-medium text-center">
          <div className="text-red-500 mb-4">
            <X size={48} className="mx-auto" />
          </div>
          <p className="text-xl text-red-500 mb-4">{loadError || error}</p>
          <Button 
            onClick={() => navigate('/')}
            variant="primary"
          >
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  if (!displayData) {
    return (
      <div className="min-h-screen bg-neutral-light-gray flex items-center justify-center">
        <div className="text-xl text-red-500">No proposal data available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-light-gray">
      <header className="bg-white shadow-sm sticky top-0 z-50 rounded-b-3xl">
        {/* Action Buttons Section - Distinguished with background */}
        <div className="bg-neutral-light-gray py-3 px-4 sm:px-8">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
            <Button
              onClick={handleDownload}
              variant="secondary"
              icon={<Download size={18} />}
              loading={isDownloading}
            >
              {isDownloading ? 'Downloading...' : 'Download PDF'}
            </Button>
            {!isSharedView && (
              <Button
                onClick={openSendToClientModal}
                variant="secondary"
                icon={<Send size={18} />}
                loading={isSharing}
              >
                {isSharing ? 'Sending...' : 'Send to Client'}
              </Button>
            )}
            {originalData && currentProposal?.hasChanges && (
              <Button
                onClick={toggleVersion}
                variant="secondary"
                icon={<HistoryIcon size={18} />}
              >
                {showingOriginal ? 'View Current' : 'View Your Changes'}
              </Button>
            )}
            {!isSharedView && (
              <>
                {!showingOriginal && (
                  isEditing ? (
                    <Button
                      onClick={handleSaveChanges}
                      variant="primary"
                      icon={<Save size={18} />}
                      loading={isSavingChanges}
                    >
                      {isSavingChanges ? 'Saving...' : 'Save Changes'}
                    </Button>
                  ) : (
                    <Button
                      onClick={toggleEditMode}
                      variant="primary"
                      icon={<Edit size={18} />}
                    >
                      Edit
                    </Button>
                  )
                )}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={copyShareLink}
                    variant="secondary"
                    icon={showCopied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                  >
                    {showCopied ? 'Copied!' : 'Copy Link'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
      {/* Logo editing controls (edit mode only, not shared view) */}
      {isEditing && !isSharedView && (
        <div className="max-w-7xl mx-auto mt-6 px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Client Logo Card */}
            <div className="card-medium">
              <h3 className="text-lg font-extrabold text-shortcut-blue mb-4">Client Logo</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-shortcut-blue mb-2">Upload Logo File</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileChange}
                    disabled={logoUploading}
                    className="block w-full text-sm text-text-dark-60 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-shortcut-teal file:text-shortcut-navy-blue hover:file:bg-shortcut-teal hover:file:bg-opacity-80"
                  />
                  <p className="text-xs text-text-dark-60 mt-1">Max 5MB. PNG, JPG, SVG, etc.</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-shortcut-blue mb-2">Or Paste Image URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={logoUrl}
                    onChange={handleLogoUrlChange}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
                    disabled={logoUploading}
                  />
                </div>
                {logoUrl && (
                  <div className="mt-4">
                    <p className="text-sm font-bold text-shortcut-blue mb-2">Preview</p>
                    <div className="relative inline-block">
                      <img src={logoUrl} alt="Client Logo Preview" className="h-20 rounded shadow border border-gray-200" />
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                        disabled={logoUploading}
                        title="Remove logo"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}
                {logoUploadError && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                    {logoUploadError}
                  </div>
                )}
              </div>
            </div>

            {/* Office Location Card */}
            <div className="card-medium">
              <h3 className="text-lg font-extrabold text-shortcut-blue mb-4">
                {displayData.officeLocations && Object.keys(displayData.officeLocations).length > 1 
                  ? 'Office Locations' 
                  : 'Office Location'}
              </h3>
              <div className="space-y-4">
                {/* Multiple Office Locations - Show all locations from proposal */}
                {displayData.locations && displayData.locations.length > 1 ? (
                  displayData.locations.map((location) => {
                    const address = displayData.officeLocations?.[location] || displayData.officeLocation || '';
                    const isEditingThis = editingOfficeLocation === location;
                    
                    return (
                      <div key={location} className="border-2 border-gray-200 rounded-lg p-4 bg-white hover:border-shortcut-teal transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="text-sm font-bold text-shortcut-navy-blue">{location}</h4>
                            </div>
                            {isEditingThis ? (
                              <div className="relative">
                                <input
                                  type="text"
                                  value={editedData?.officeLocations?.[location] || address}
                                  onChange={(e) => {
                                    // Initialize officeLocations if it doesn't exist
                                    const currentOfficeLocations = editedData?.officeLocations || displayData.officeLocations || {};
                                    const updatedOfficeLocations = {
                                      ...currentOfficeLocations,
                                      [location]: e.target.value
                                    };
                                    handleFieldChange(['officeLocations'], updatedOfficeLocations);
                                  }}
                                  className="w-full px-3 py-2 pr-20 border-2 border-shortcut-teal rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
                                  placeholder="Enter office address..."
                                  id={`office-location-edit-input-${location}`}
                                  data-autocomplete="true"
                                  autoFocus
                                />
                                <div className="absolute right-2 top-2 flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const input = document.getElementById(`office-location-edit-input-${location}`) as HTMLInputElement;
                                      if (input && 'geolocation' in navigator) {
                                        navigator.geolocation.getCurrentPosition(
                                          (position) => {
                                            const { latitude, longitude } = position.coords;
                                            const apiKey = window.__ENV__?.VITE_GOOGLE_MAPS_API_KEY;
                                            
                                            if (apiKey && apiKey !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
                                              fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`)
                                                .then(response => response.json())
                                                .then(data => {
                                                  if (data.status === 'OK' && data.results && data.results[0]) {
                                                    const currentOfficeLocations = editedData?.officeLocations || displayData.officeLocations || {};
                                                    const updatedOfficeLocations = {
                                                      ...currentOfficeLocations,
                                                      [location]: data.results[0].formatted_address
                                                    };
                                                    handleFieldChange(['officeLocations'], updatedOfficeLocations);
                                                  } else {
                                                    alert('Could not find address for your location. Please enter manually.');
                                                  }
                                                })
                                                .catch(() => {
                                                  alert('Error getting address. Please enter manually.');
                                                });
                                            } else {
                                              alert('Google Maps API key not configured. Please enter the address manually.');
                                            }
                                          },
                                          () => {
                                            alert('Unable to get your location. Please enter the address manually.');
                                          }
                                        );
                                      } else {
                                        alert('Geolocation is not supported by your browser. Please enter the address manually.');
                                      }
                                    }}
                                    className="p-1.5 text-text-dark-60 hover:text-shortcut-blue hover:bg-neutral-light-gray rounded transition-colors"
                                    title="Use current location"
                                  >
                                    📍
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingOfficeLocation(null)}
                                    className="p-1.5 text-shortcut-navy-blue hover:bg-shortcut-teal hover:bg-opacity-20 rounded transition-colors"
                                    title="Save"
                                  >
                                    <Check size={18} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingOfficeLocation(null);
                                      // Revert to original value
                                      const updatedOfficeLocations = {
                                        ...(editedData?.officeLocations || displayData.officeLocations)
                                      };
                                      updatedOfficeLocations[location] = address;
                                      handleFieldChange(['officeLocations'], updatedOfficeLocations);
                                    }}
                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                                    title="Cancel"
                                  >
                                    <X size={18} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-base text-text-dark flex-1">
                                  {address || <span className="text-text-dark-60 italic">No address set</span>}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => setEditingOfficeLocation(location)}
                                  className="flex-shrink-0 p-2 text-shortcut-blue hover:bg-shortcut-teal hover:bg-opacity-20 rounded-lg transition-colors group"
                                  title="Edit address"
                                >
                                  <Pencil size={18} className="group-hover:scale-110 transition-transform" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  /* Single Office Location (Legacy) */
                  <div className="border-2 border-gray-200 rounded-lg p-4 bg-white hover:border-shortcut-teal transition-colors">
                    {editingOfficeLocation === 'single' ? (
                      <div className="relative">
                        <input
                          type="text"
                          value={editedData?.officeLocation || displayData.officeLocation || ''}
                          onChange={(e) => handleFieldChange(['officeLocation'], e.target.value)}
                          className="w-full px-3 py-2 pr-20 border-2 border-shortcut-teal rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
                          placeholder="Enter office address..."
                          id="office-location-edit-input-single"
                          data-autocomplete="true"
                          autoFocus
                        />
                        <div className="absolute right-2 top-2 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const input = document.getElementById('office-location-edit-input-single') as HTMLInputElement;
                              if (input && 'geolocation' in navigator) {
                                navigator.geolocation.getCurrentPosition(
                                  (position) => {
                                    const { latitude, longitude } = position.coords;
                                    const apiKey = window.__ENV__?.VITE_GOOGLE_MAPS_API_KEY;
                                    
                                    if (apiKey && apiKey !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
                                      fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`)
                                        .then(response => response.json())
                                        .then(data => {
                                          if (data.status === 'OK' && data.results && data.results[0]) {
                                            handleFieldChange(['officeLocation'], data.results[0].formatted_address);
                                          } else {
                                            alert('Could not find address for your location. Please enter manually.');
                                          }
                                        })
                                        .catch(() => {
                                          alert('Error getting address. Please enter manually.');
                                        });
                                    } else {
                                      alert('Google Maps API key not configured. Please enter the address manually.');
                                    }
                                  },
                                  () => {
                                    alert('Unable to get your location. Please enter the address manually.');
                                  }
                                );
                              } else {
                                alert('Geolocation is not supported by your browser. Please enter the address manually.');
                              }
                            }}
                            className="p-1.5 text-text-dark-60 hover:text-shortcut-blue hover:bg-neutral-light-gray rounded transition-colors"
                            title="Use current location"
                          >
                            📍
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingOfficeLocation(null)}
                            className="p-1.5 text-shortcut-navy-blue hover:bg-shortcut-teal hover:bg-opacity-20 rounded transition-colors"
                            title="Save"
                          >
                            <Check size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingOfficeLocation(null);
                              // Revert to original value
                              handleFieldChange(['officeLocation'], displayData.officeLocation || '');
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Cancel"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-base text-text-dark flex-1">
                          {displayData.officeLocation || <span className="text-text-dark-60 italic">No address set</span>}
                        </p>
                        <button
                          type="button"
                          onClick={() => setEditingOfficeLocation('single')}
                          className="flex-shrink-0 p-2 text-shortcut-blue hover:bg-shortcut-teal hover:bg-opacity-20 rounded-lg transition-colors group"
                          title="Edit address"
                        >
                          <Pencil size={18} className="group-hover:scale-110 transition-transform" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto py-6 px-4" id="proposal-content">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
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
                {(displayData.customization?.customNote || isEditing) && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-extrabold text-shortcut-blue mb-3">Note from Shortcut</h3>
                    {isEditing ? (
                      <textarea
                        value={editedData?.customization?.customNote || ''}
                        onChange={(e) => {
                          const updatedData = { ...editedData };
                          if (!updatedData.customization) {
                            updatedData.customization = {};
                          }
                          updatedData.customization.customNote = e.target.value;
                          setEditedData(updatedData);
                        }}
                        placeholder="Enter a note for the client..."
                        className="w-full min-h-[100px] p-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal resize-y font-medium text-base text-text-dark leading-relaxed"
                      />
                    ) : (
                      <p className="text-base text-text-dark leading-relaxed font-medium">
                        {displayData.customization?.customNote?.replace('above', 'below') || ''}
                      </p>
                    )}
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
                {/* Display multiple office locations if available, otherwise show single office location */}
                {(displayData.officeLocations && Object.keys(displayData.officeLocations).length > 0) || displayData.officeLocation ? (
                  <div className="md:col-span-3">
                    <p className="text-sm font-bold text-shortcut-blue mb-2">Office Location(s)</p>
                    {displayData.officeLocations && Object.keys(displayData.officeLocations).length > 0 ? (
                      <div className="space-y-2">
                        {Object.entries(displayData.officeLocations).map(([location, address]) => (
                          <div key={location} className="mb-2">
                            <p className="text-xs font-bold text-shortcut-navy-blue mb-1">{location}:</p>
                            <p className="text-base font-medium text-text-dark">{address}</p>
                          </div>
                        ))}
                      </div>
                    ) : displayData.officeLocation ? (
                      <p className="text-base font-medium text-text-dark">{displayData.officeLocation}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

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
                                    className="card-small mb-6"
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
                                            {isEditing ? (
                                              <select
                                                value={service.massageType}
                                                onChange={(e) => handleFieldChange(['services', location, date, 'services', serviceIndex, 'massageType'], e.target.value)}
                                                className="ml-2 px-2 py-1 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
                                              >
                                                <option value="massage">General Massage</option>
                                                <option value="chair">Chair Massage</option>
                                                <option value="table">Table Massage</option>
                                              </select>
                                            ) : (
                                              <span className="ml-2 text-text-dark capitalize">{service.massageType}</span>
                                            )}
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
                                      <div className="flex justify-between items-center py-3 border-b border-gray-200">
                                        <span className="text-base font-bold text-shortcut-blue">Appointment Time:</span>
                                        <div className="font-bold text-text-dark">
                                          <EditableField
                                            value={String(service.appTime ?? 20)}
                                            onChange={(value) => handleFieldChange(['services', location, date, 'services', serviceIndex, 'appTime'], typeof value === 'string' ? parseFloat(value) || 20 : value)}
                                            isEditing={isEditing}
                                            type="number"
                                            suffix=" min"
                                          />
                                        </div>
                                      </div>
                                      <div className="flex justify-between items-center py-3 border-b border-gray-200">
                                        <span className="text-base font-bold text-shortcut-blue">Professional Hourly Rate:</span>
                                        <div className="font-bold text-text-dark">
                                          <EditableField
                                            value={String(service.proHourly ?? 0)}
                                            onChange={(value) => handleFieldChange(['services', location, date, 'services', serviceIndex, 'proHourly'], typeof value === 'string' ? parseFloat(value) || 0 : value)}
                                            isEditing={isEditing}
                                            type="number"
                                            prefix="$"
                                          />
                                        </div>
                                      </div>
                                      <div className="flex justify-between items-center py-3 border-b border-gray-200">
                                        <span className="text-base font-bold text-shortcut-blue">Service Hourly Rate:</span>
                                        <div className="font-bold text-text-dark">
                                          <EditableField
                                            value={String(service.hourlyRate ?? 0)}
                                            onChange={(value) => handleFieldChange(['services', location, date, 'services', serviceIndex, 'hourlyRate'], typeof value === 'string' ? parseFloat(value) || 0 : value)}
                                            isEditing={isEditing}
                                            type="number"
                                            prefix="$"
                                          />
                                        </div>
                                      </div>
                                      <div className="flex justify-between items-center py-3 border-b border-gray-200">
                                        <span className="text-base font-bold text-shortcut-blue">Early Arrival Fee:</span>
                                        <div className="font-bold text-text-dark">
                                          <EditableField
                                            value={String(service.earlyArrival ?? 0)}
                                            onChange={(value) => handleFieldChange(['services', location, date, 'services', serviceIndex, 'earlyArrival'], typeof value === 'string' ? parseFloat(value) || 0 : value)}
                                            isEditing={isEditing}
                                            type="number"
                                            prefix="$"
                                          />
                                        </div>
                                      </div>
                                      {service.serviceType === 'headshot' && (
                                        <div className="flex justify-between items-center py-3 border-b border-gray-200">
                                          <span className="text-base font-bold text-shortcut-blue">Retouching Cost per Photo:</span>
                                          <div className="font-bold text-text-dark">
                                            <EditableField
                                              value={String(service.retouchingCost ?? 0)}
                                              onChange={(value) => handleFieldChange(['services', location, date, 'services', serviceIndex, 'retouchingCost'], typeof value === 'string' ? parseFloat(value) || 0 : value)}
                                              isEditing={isEditing}
                                              type="number"
                                              prefix="$"
                                            />
                                          </div>
                                        </div>
                                      )}
                                      <div className="flex justify-between items-center py-3 border-b border-gray-200">
                                        <span className="text-base font-bold text-shortcut-blue">Discount Percentage:</span>
                                        <div className="font-bold text-text-dark">
                                          <EditableField
                                            value={String(service.discountPercent ?? 0)}
                                            onChange={(value) => handleFieldChange(['services', location, date, 'services', serviceIndex, 'discountPercent'], typeof value === 'string' ? parseFloat(value) || 0 : value)}
                                            isEditing={isEditing}
                                            type="number"
                                            suffix="%"
                                          />
                                        </div>
                                      </div>
                                      
                                      {/* Add Options Button */}
                                      {isEditing && !isSharedView && (!service.pricingOptions || service.pricingOptions.length === 0) && (
                                        <div className="mt-4 pt-4 border-t-2 border-gray-200">
                                          <div className="flex items-center justify-between">
                                            <span className="text-base font-bold text-shortcut-blue">Pricing Options:</span>
                                            <button
                                              onClick={() => {
                                                const pricingOptions = generatePricingOptionsForService(service);
                                                handleFieldChange(['services', location, date, 'services', serviceIndex, 'pricingOptions'], pricingOptions);
                                                handleFieldChange(['services', location, date, 'services', serviceIndex, 'selectedOption'], 0);
                                                handleFieldChange(['hasPricingOptions'], true);
                                              }}
                                              className="px-4 py-2 bg-shortcut-navy-blue text-white hover:bg-shortcut-dark-blue rounded-md font-medium transition-colors"
                                            >
                                              Add Options
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                      
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
                                                className={`p-4 rounded-lg border-2 transition-all ${
                                                  service.selectedOption === optionIndex
                                                    ? 'border-shortcut-navy-blue bg-shortcut-navy-blue bg-opacity-5'
                                                    : 'border-gray-200 bg-neutral-light-gray hover:border-shortcut-teal'
                                                }`}
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
                                                {isEditing && !isSharedView && (
                                                  <div className="mt-3 space-y-2 border-t pt-3">
                                                    <div className="grid grid-cols-2 gap-2">
                                                      <div>
                                                        <label className="text-xs font-bold text-shortcut-blue">Total Hours:</label>
                                                        <EditableField
                                                          value={String(option.totalHours || service.totalHours)}
                                                          onChange={(value) => handleFieldChange(
                                                            ['services', location, date, 'services', serviceIndex, 'pricingOptions', optionIndex, 'totalHours'], 
                                                            parseFloat(value) || service.totalHours
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
                                                            parseFloat(value) || service.hourlyRate
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
                                                          parseFloat(value) || 1
                                                        )}
                                                        isEditing={isEditing}
                                                        type="number"
                                                      />
                                                    </div>
                                                  </div>
                                                )}
                                                
                                                {isEditing && !isSharedView && (
                                                  <div className="flex gap-2 mt-3">
                                                    <button
                                                      onClick={() => {
                                                        // Update the selected option
                                                        handleFieldChange(
                                                          ['services', location, date, 'services', serviceIndex, 'selectedOption'], 
                                                          optionIndex
                                                        );
                                                      }}
                                                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                                                        service.selectedOption === optionIndex
                                                          ? 'bg-shortcut-navy-blue text-white'
                                                          : 'bg-neutral-light-gray text-shortcut-navy-blue hover:bg-neutral-gray'
                                                      }`}
                                                    >
                                                      {service.selectedOption === optionIndex ? 'Selected' : 'Select'}
                                                    </button>
                                                    <button
                                                      onClick={() => {
                                                        // Remove this option
                                                        const newPricingOptions = [...service.pricingOptions];
                                                        newPricingOptions.splice(optionIndex, 1);
                                                        handleFieldChange(
                                                          ['services', location, date, 'services', serviceIndex, 'pricingOptions'],
                                                          newPricingOptions
                                                        );
                                                        // Adjust selected option if needed
                                                        if (service.selectedOption >= optionIndex && service.selectedOption > 0) {
                                                          handleFieldChange(
                                                            ['services', location, date, 'services', serviceIndex, 'selectedOption'],
                                                            service.selectedOption - 1
                                                          );
                                                        } else if (service.selectedOption === optionIndex && newPricingOptions.length > 0) {
                                                          handleFieldChange(
                                                            ['services', location, date, 'services', serviceIndex, 'selectedOption'],
                                                            0
                                                          );
                                                        }
                                                      }}
                                                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                                                    >
                                                      Remove
                                                    </button>
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                                                                     {isEditing && !isSharedView && (
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

            <ServiceAgreement />
          </div>

          <div className="lg:sticky lg:top-24 space-y-8 self-start">
            {/* Service Image Slider */}
            {(() => {
              const uniqueServiceTypes = getUniqueServiceTypes(displayData);
              return uniqueServiceTypes.length > 0 && (
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
              );
            })()}

            {Object.entries(displayData.services || {}).map(([location, locationData]) => (
              <LocationSummary 
                key={`${location}-${updateCounter}`}
                location={location}
                services={locationData}
              />
            ))}

            <div className="bg-shortcut-navy-blue text-white rounded-2xl shadow-lg border border-shortcut-navy-blue border-opacity-20 p-8">
              <h2 className="text-xl font-extrabold mb-6 text-white">Event Summary</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-white/20">
                  <span className="font-semibold">Total Appointments:</span>
                  <span className="font-bold text-lg">{displayData.summary?.totalAppointments}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-white/20">
                  <span className="font-semibold">Total Event Cost:</span>
                  <span className="font-bold text-lg">${formatCurrency(displayData.summary?.totalEventCost || 0)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-white/20">
                  <span className="font-semibold">Professional Revenue:</span>
                  <span className="font-bold text-lg">${formatCurrency(displayData.summary?.totalProRevenue || 0)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-white/20">
                  <span className="font-semibold">Net Profit:</span>
                  <span className="font-bold text-lg">${formatCurrency(displayData.summary?.netProfit || 0)}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="font-semibold">Profit Margin:</span>
                  <span className="font-bold text-lg">{(displayData.summary?.profitMargin || 0).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="card-large">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                <h2 className="text-xl font-extrabold text-shortcut-blue">Notes</h2>
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

        {/* Change History Section */}
        {changeSets.length > 0 && (
          <div className="mt-8 card-large">
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
              <div className="space-y-6">
                {/* Group changes by source */}
                {(() => {
                  const clientChanges = changeSets.filter(cs => cs.changeSource === 'client');
                  const staffChanges = changeSets.filter(cs => cs.changeSource === 'staff' || cs.changeSource === 'admin');
                  
                  return (
                    <>
                      {/* Client Changes Section */}
                      {clientChanges.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="h-px flex-1 bg-gray-200"></div>
                            <h3 className="text-lg font-extrabold text-shortcut-blue flex items-center gap-2">
                              <User size={20} className="text-shortcut-teal-blue" />
                              Client Changes
                            </h3>
                            <div className="h-px flex-1 bg-gray-200"></div>
                          </div>
                          {clientChanges.map((changeSet, index) => (
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
                      
                      {/* Staff Changes Section */}
                      {staffChanges.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="h-px flex-1 bg-gray-200"></div>
                            <h3 className="text-lg font-extrabold text-shortcut-blue flex items-center gap-2">
                              <Briefcase size={20} className="text-shortcut-teal-blue" />
                              Shortcut Staff Changes
                            </h3>
                            <div className="h-px flex-1 bg-gray-200"></div>
                          </div>
                          {staffChanges.map((changeSet, index) => (
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
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Send to Client Modal */}
      {showSendToClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card-large max-w-md w-full mx-4">
            <h3 className="h2 mb-4">
              Send Proposal to Client
            </h3>
            <div className="mb-4">
              <label htmlFor="clientName" className="block text-sm font-bold text-shortcut-blue mb-1">
                Client Name
              </label>
              <input
                type="text"
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="clientEmail" className="block text-sm font-bold text-shortcut-blue mb-1">
                Client Email
              </label>
              <input
                type="email"
                id="clientEmail"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="shareNote" className="block text-sm font-bold text-shortcut-blue mb-1">
                Custom Message (Optional)
              </label>
              <textarea
                id="shareNote"
                value={shareNote}
                onChange={(e) => setShareNote(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
              />
            </div>
            <div className="flex gap-4">
              <Button
                onClick={() => setShowSendToClientModal(false)}
                variant="secondary"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendToClient}
                variant="primary"
                className="flex-1 bg-shortcut-navy-blue hover:bg-shortcut-dark-blue text-white"
                loading={isSharing}
              >
                {isSharing ? 'Sending...' : 'Send Proposal'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {showShareSuccess && (
        <div className="fixed top-4 right-4 bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded-md shadow-lg z-50">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} />
            <span>Proposal sent to client successfully!</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProposalViewer;