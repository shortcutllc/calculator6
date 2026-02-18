import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Edit, Save, Eye, Share2, ArrowLeft, Check, X, History as HistoryIcon, Globe, Copy, CheckCircle2, Download, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Send, AlertCircle, Clock, CheckCircle, XCircle, User, Mail, Calendar, Pencil, Briefcase, Plus, Trash2, Brain } from 'lucide-react';
import { useProposal } from '../contexts/ProposalContext';
import { useAuth } from '../contexts/AuthContext';
import EditableField from './EditableField';
import { supabase } from '../lib/supabaseClient';
import { config } from '../config';
import { format } from 'date-fns';
import { recalculateServiceTotals, generatePricingOptionsForService, calculateServiceResults, calculateOriginalPrice } from '../utils/proposalGenerator';
import { getProposalUrl } from '../utils/url';
import { generatePDF } from '../utils/pdf';
import { Button } from './Button';
import ServiceAgreement from './ServiceAgreement';
import LocationSummary from './LocationSummary';
import ShareProposalModal from './ShareProposalModal';
import { ProposalChangeSet, ProposalChange } from '../types/proposal';
import { ChangeSourceBadge } from './ChangeSourceBadge';
import { trackProposalChanges, getChangeDisplayInfo } from '../utils/changeTracker';

// Service defaults for applying when changing service type
const SERVICE_DEFAULTS: { [key: string]: any } = {
  massage: {
    appTime: 20,
    totalHours: 4,
    numPros: 2,
    proHourly: 50,
    hourlyRate: 135,
    earlyArrival: 25,
    retouchingCost: 0,
    massageType: 'massage'
  },
  facial: {
    appTime: 20,
    totalHours: 4,
    numPros: 2,
    proHourly: 50,
    hourlyRate: 135,
    earlyArrival: 25,
    retouchingCost: 0
  },
  hair: {
    appTime: 30,
    totalHours: 6,
    numPros: 2,
    proHourly: 50,
    hourlyRate: 135,
    earlyArrival: 25,
    retouchingCost: 0
  },
  nails: {
    appTime: 30,
    totalHours: 6,
    numPros: 2,
    proHourly: 50,
    hourlyRate: 135,
    earlyArrival: 25,
    retouchingCost: 0
  },
  makeup: {
    appTime: 30,
    totalHours: 4,
    numPros: 2,
    proHourly: 50,
    hourlyRate: 135,
    earlyArrival: 25,
    retouchingCost: 0
  },
  headshot: {
    appTime: 12,
    totalHours: 5,
    numPros: 1,
    proHourly: 400,
    hourlyRate: 0,
    earlyArrival: 0,
    retouchingCost: 40
  },
  mindfulness: {
    appTime: 45,
    totalHours: 0.75,
    numPros: 1,
    proHourly: 0,
    hourlyRate: 0,
    earlyArrival: 0,
    retouchingCost: 0,
    classLength: 45,
    participants: 'unlimited',
    fixedPrice: 1375,
    mindfulnessType: 'intro'
  },
  'hair-makeup': {
    appTime: 20,
    totalHours: 4,
    numPros: 2,
    proHourly: 50,
    hourlyRate: 135,
    earlyArrival: 25,
    retouchingCost: 0
  },
  'headshot-hair-makeup': {
    appTime: 20,
    totalHours: 4,
    numPros: 2,
    proHourly: 50,
    hourlyRate: 135,
    earlyArrival: 25,
    retouchingCost: 0
  },
  'mindfulness-soles': {
    appTime: 30,
    totalHours: 0.5,
    numPros: 1,
    proHourly: 0,
    hourlyRate: 0,
    earlyArrival: 0,
    retouchingCost: 0,
    classLength: 30,
    participants: 'unlimited',
    fixedPrice: 1250
  },
  'mindfulness-movement': {
    appTime: 30,
    totalHours: 0.5,
    numPros: 1,
    proHourly: 0,
    hourlyRate: 0,
    earlyArrival: 0,
    retouchingCost: 0,
    classLength: 30,
    participants: 'unlimited',
    fixedPrice: 1250
  },
  'mindfulness-pro': {
    appTime: 45,
    totalHours: 0.75,
    numPros: 1,
    proHourly: 0,
    hourlyRate: 0,
    earlyArrival: 0,
    retouchingCost: 0,
    classLength: 45,
    participants: 'unlimited',
    fixedPrice: 1375
  },
  'mindfulness-cle': {
    appTime: 60,
    totalHours: 1,
    numPros: 1,
    proHourly: 0,
    hourlyRate: 0,
    earlyArrival: 0,
    retouchingCost: 0,
    classLength: 60,
    participants: 'unlimited',
    fixedPrice: 3000
  },
  'mindfulness-pro-reactivity': {
    appTime: 45,
    totalHours: 0.75,
    numPros: 1,
    proHourly: 0,
    hourlyRate: 0,
    earlyArrival: 0,
    retouchingCost: 0,
    classLength: 45,
    participants: 'unlimited',
    fixedPrice: 1375
  }
};

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
      const nailsType = service.nailsType || 'nails';
      if (nailsType === 'nails-hand-massage') {
        return "Experience a manicure and hand massage that combine expert care with calming touch, leaving employees relaxed, refreshed, and confidently polished.";
      }
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
      return "Grounding Under Pressure: The Soles of the Feet Practice offers a powerful technique to stay present and composed during high-stress moments, helping attorneys manage pressure with calm and focus.";
    case 'mindfulness-movement':
      return "Ground & Reset: Cultivating Mindfulness Through Movement and Stillness combines gentle movement and stillness practices to help attorneys reconnect with the present moment and reduce stress.";
    case 'mindfulness-pro':
      return "Mindfulness: PRO Practice introduces the Pause-Relax-Open framework, a practical approach for attorneys to step out of reactivity and respond more skillfully in high-stakes situations.";
    case 'mindfulness-cle':
      return "Mindfulness: CLE Ethics Program is an ethics-approved course exploring how mindfulness supports ethical decision-making, emotional regulation, and professional wellbeing for legal professionals.";
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
  
  // Proposal options state
  const [proposalOptions, setProposalOptions] = useState<any[]>([]);
  const [isCreatingOption, setIsCreatingOption] = useState(false);
  const [editingOptionName, setEditingOptionName] = useState<string | null>(null);
  const [optionNameInput, setOptionNameInput] = useState('');
  
  // Link existing proposals state
  const [showLinkProposalsModal, setShowLinkProposalsModal] = useState(false);
  const [availableProposals, setAvailableProposals] = useState<any[]>([]);
  const [selectedProposalsToLink, setSelectedProposalsToLink] = useState<string[]>([]);
  const [isLinkingProposals, setIsLinkingProposals] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Delete option state
  const [deletingOptionId, setDeletingOptionId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

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
    fetchProposalOptions();
  }, [id]);

  // Fetch all proposals in the same group
  const fetchProposalOptions = async () => {
    if (!id) return;
    
    try {
      // First, get the current proposal to check if it's part of a group
      const { data: currentProposal, error: currentError } = await supabase
        .from('proposals')
        .select('id, proposal_group_id')
        .eq('id', id)
        .single();

      if (currentError || !currentProposal) {
        setProposalOptions([]);
        return;
      }

      const groupId = currentProposal.proposal_group_id || currentProposal.id;

      // Fetch all proposals in the group
      // If proposal_group_id is set, fetch by that. Otherwise, fetch proposals where id equals groupId (the current proposal is the anchor)
      const { data: options, error } = await supabase
        .from('proposals')
        .select('id, option_name, option_order, status, client_name, created_at, proposal_group_id')
        .or(`proposal_group_id.eq.${groupId},id.eq.${groupId}`)
        .order('option_order', { ascending: true, nullsFirst: false });

      if (error) {
        console.error('Error fetching proposal options:', error);
        setProposalOptions([]);
        return;
      }

      // Sort by option_order, with nulls last, then by created_at
      const sortedOptions = (options || []).sort((a, b) => {
        if (a.option_order !== null && b.option_order !== null) {
          return a.option_order - b.option_order;
        }
        if (a.option_order !== null) return -1;
        if (b.option_order !== null) return 1;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      setProposalOptions(sortedOptions);
    } catch (err) {
      console.error('Error fetching proposal options:', err);
      setProposalOptions([]);
    }
  };

  // Create a duplicate proposal as a new option
  const handleCreateOption = async () => {
    if (!id || !currentProposal || !displayData) return;

    setIsCreatingOption(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to create a proposal');

      // Determine the group ID - use existing group_id or current proposal ID as the group anchor
      const { data: currentProposalData } = await supabase
        .from('proposals')
        .select('proposal_group_id')
        .eq('id', id)
        .single();

      const groupId = currentProposalData?.proposal_group_id || id;

      // Get the next option order
      const { data: existingOptions } = await supabase
        .from('proposals')
        .select('option_order')
        .or(`proposal_group_id.eq.${groupId},id.eq.${groupId}`);

      const maxOrder = existingOptions?.reduce((max, opt) => 
        opt.option_order !== null && opt.option_order > max ? opt.option_order : max, 0
      ) || 0;
      const nextOrder = maxOrder + 1;

      // Create duplicate proposal data
      const duplicateData = {
        data: displayData,
        customization: currentProposal.customization,
        is_editable: true,
        user_id: user.id,
        status: 'draft',
        pending_review: false,
        has_changes: false,
        original_data: displayData,
        client_name: displayData.clientName?.trim() || currentProposal.data?.clientName?.trim() || '',
        notes: '',
        proposal_group_id: groupId,
        option_name: `Option ${nextOrder}`,
        option_order: nextOrder,
        client_email: currentProposal.clientEmail,
        client_logo_url: currentProposal.clientLogoUrl
      };

      // If this is the first option (current proposal doesn't have a group), update it too
      if (!currentProposalData?.proposal_group_id) {
        await supabase
          .from('proposals')
          .update({
            proposal_group_id: groupId,
            option_name: 'Option 1',
            option_order: 1
          })
          .eq('id', id);
      }

      const { data: newProposal, error } = await supabase
        .from('proposals')
        .insert(duplicateData)
        .select()
        .single();

      if (error) throw error;
      if (!newProposal) throw new Error('No proposal data returned after creation');

      // Refresh options list
      await fetchProposalOptions();
      
      // Navigate to the new proposal
      navigate(`/proposal/${newProposal.id}`);
    } catch (err) {
      console.error('Error creating option:', err);
      alert(err instanceof Error ? err.message : 'Failed to create option');
    } finally {
      setIsCreatingOption(false);
    }
  };

  // Update option name
  const handleUpdateOptionName = async (optionId: string, newName: string) => {
    if (!newName.trim()) return;

    try {
      const { error } = await supabase
        .from('proposals')
        .update({ option_name: newName.trim() })
        .eq('id', optionId);

      if (error) throw error;

      await fetchProposalOptions();
      setEditingOptionName(null);
      setOptionNameInput('');
    } catch (err) {
      console.error('Error updating option name:', err);
      alert(err instanceof Error ? err.message : 'Failed to update option name');
    }
  };

  // Reorder options
  const handleReorderOption = async (optionId: string, newOrder: number) => {
    try {
      const { error } = await supabase
        .from('proposals')
        .update({ option_order: newOrder })
        .eq('id', optionId);

      if (error) throw error;

      await fetchProposalOptions();
    } catch (err) {
      console.error('Error reordering option:', err);
      alert(err instanceof Error ? err.message : 'Failed to reorder option');
    }
  };

  // Fetch available proposals to link (exclude current proposal and proposals already in a different group)
  const fetchAvailableProposals = async () => {
    if (!id) return;

    try {
      // Get current proposal's group ID
      const { data: currentProposal } = await supabase
        .from('proposals')
        .select('id, proposal_group_id')
        .eq('id', id)
        .single();

      const currentGroupId = currentProposal?.proposal_group_id || currentProposal?.id;

      // Fetch all proposals except the current one (both regular and mindfulness)
      const { data: allProposals, error } = await supabase
        .from('proposals')
        .select('id, client_name, created_at, proposal_group_id, option_name, status, proposal_type')
        .neq('id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter proposals that can be linked:
      // 1. Not already in a different group, OR
      // 2. Already in the same group (shouldn't happen, but handle it)
      const available = (allProposals || []).filter((p: any) => {
        // If proposal has no group, it can be linked
        if (!p.proposal_group_id) return true;
        // If proposal is in the same group, it's already linked (shouldn't show)
        if (p.proposal_group_id === currentGroupId) return false;
        // If proposal is in a different group, show it but indicate it's in another group
        return true;
      });

      setAvailableProposals(available);
    } catch (err) {
      console.error('Error fetching available proposals:', err);
      setAvailableProposals([]);
    }
  };

  // Open link proposals modal
  const handleOpenLinkProposalsModal = async () => {
    setShowLinkProposalsModal(true);
    setSelectedProposalsToLink([]);
    setSearchTerm('');
    await fetchAvailableProposals();
  };

  // Link selected proposals to current group
  const handleLinkProposals = async () => {
    if (!id || selectedProposalsToLink.length === 0) return;

    setIsLinkingProposals(true);
    try {
      // Get current proposal's group ID
      const { data: currentProposal } = await supabase
        .from('proposals')
        .select('id, proposal_group_id')
        .eq('id', id)
        .single();

      const groupId = currentProposal?.proposal_group_id || currentProposal?.id;

      // If current proposal doesn't have a group, create one
      if (!currentProposal?.proposal_group_id) {
        await supabase
          .from('proposals')
          .update({
            proposal_group_id: groupId,
            option_name: 'Option 1',
            option_order: 1
          })
          .eq('id', id);
      }

      // Get current max order in the group
      const { data: existingOptions } = await supabase
        .from('proposals')
        .select('option_order')
        .or(`proposal_group_id.eq.${groupId},id.eq.${groupId}`);

      const maxOrder = existingOptions?.reduce((max, opt) => 
        opt.option_order !== null && opt.option_order > max ? opt.option_order : max, 0
      ) || 0;

      // Link each selected proposal
      for (let i = 0; i < selectedProposalsToLink.length; i++) {
        const proposalId = selectedProposalsToLink[i];
        const newOrder = maxOrder + i + 1;

        // Check if proposal is already in another group
        const { data: proposal } = await supabase
          .from('proposals')
          .select('proposal_group_id, option_name')
          .eq('id', proposalId)
          .single();

        if (proposal?.proposal_group_id && proposal.proposal_group_id !== groupId) {
          // Proposal is in another group - ask for confirmation or just proceed
          // For now, we'll proceed and move it to this group
        }

        await supabase
          .from('proposals')
          .update({
            proposal_group_id: groupId,
            option_name: proposal?.option_name || `Option ${newOrder}`,
            option_order: newOrder
          })
          .eq('id', proposalId);
      }

      // Refresh options list
      await fetchProposalOptions();
      setShowLinkProposalsModal(false);
      setSelectedProposalsToLink([]);
    } catch (err) {
      console.error('Error linking proposals:', err);
      alert(err instanceof Error ? err.message : 'Failed to link proposals');
    } finally {
      setIsLinkingProposals(false);
    }
  };

  // Filter proposals based on search term
  const filteredAvailableProposals = availableProposals.filter((p: any) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      p.client_name?.toLowerCase().includes(search) ||
      p.id?.toLowerCase().includes(search) ||
      p.option_name?.toLowerCase().includes(search)
    );
  });

  // Remove option from group (unlink it, don't delete the proposal)
  const handleRemoveOption = async (optionId: string, optionName: string) => {
    if (!id || !optionId) return;

    // Confirm deletion
    if (!window.confirm(`Are you sure you want to remove "${optionName || 'this option'}" from the group? The proposal will remain but will no longer be part of this option set.`)) {
      return;
    }

    setDeletingOptionId(optionId);
    try {
      // If removing the current proposal, we need to handle it differently
      if (optionId === id) {
        // Get the group ID
        const { data: currentProposal } = await supabase
          .from('proposals')
          .select('proposal_group_id')
          .eq('id', id)
          .single();

        const groupId = currentProposal?.proposal_group_id;

        // Unlink this proposal from the group
        await supabase
          .from('proposals')
          .update({
            proposal_group_id: null,
            option_name: null,
            option_order: null
          })
          .eq('id', optionId);

        // If there are other proposals in the group, navigate to the first one
        if (groupId) {
          const { data: remainingOptions } = await supabase
            .from('proposals')
            .select('id, option_order')
            .eq('proposal_group_id', groupId)
            .order('option_order', { ascending: true })
            .limit(1);

          if (remainingOptions && remainingOptions.length > 0) {
            navigate(`/proposal/${remainingOptions[0].id}`);
          } else {
            // No other options, just refresh to show this proposal standalone
            window.location.reload();
          }
        }
      } else {
        // Removing another option - just unlink it
        await supabase
          .from('proposals')
          .update({
            proposal_group_id: null,
            option_name: null,
            option_order: null
          })
          .eq('id', optionId);

        // Reorder remaining options
        await fetchProposalOptions();
        
        // Recalculate option orders for remaining options
        const { data: currentProposal } = await supabase
          .from('proposals')
          .select('id, proposal_group_id')
          .eq('id', id)
          .single();

        const groupId = currentProposal?.proposal_group_id || id;
        const { data: remainingOptions } = await supabase
          .from('proposals')
          .select('id, option_order')
          .or(`proposal_group_id.eq.${groupId},id.eq.${groupId}`)
          .order('option_order', { ascending: true, nullsFirst: false });

        if (remainingOptions) {
          // Update option orders sequentially
          for (let i = 0; i < remainingOptions.length; i++) {
            await supabase
              .from('proposals')
              .update({ option_order: i + 1 })
              .eq('id', remainingOptions[i].id);
          }
        }

        await fetchProposalOptions();
      }
    } catch (err) {
      console.error('Error removing option:', err);
      alert(err instanceof Error ? err.message : 'Failed to remove option');
    } finally {
      setDeletingOptionId(null);
      setShowDeleteConfirm(null);
    }
  };

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

      // Check if this is a mindfulness proposal - if so, redirect to mindfulness viewer
      if (proposal.proposal_type === 'mindfulness-program' || proposal.data?.mindfulnessProgram) {
        navigate(`/proposal/${id}${location.search}`, { replace: true });
        return;
      }

      // Ensure data has required structure for regular proposals
      if (!proposal.data) {
        console.error('[ProposalViewer] ERROR: proposal.data is missing');
        throw new Error('Invalid proposal data structure - no data');
      }

      if (!proposal.data.services) {
        console.error('[ProposalViewer] ERROR: proposal.data.services is missing');
        console.error('[ProposalViewer] proposal.data:', JSON.stringify(proposal.data, null, 2));
        throw new Error('Invalid proposal data structure - no services');
      }

      const serviceCount = Object.values(proposal.data.services).reduce((count: number, locationData: any) => {
        return count + Object.values(locationData).reduce((locCount: number, dateData: any) => {
          return locCount + (dateData.services?.length || 0);
        }, 0);
      }, 0);
      console.log(`[ProposalViewer] Total services in proposal.data: ${serviceCount}`);
      
      // Attach pricing options to proposal.data BEFORE recalculation so
      // recalculateServiceTotals uses the selected option's cost in the summary.
      if (proposal.pricingOptions && proposal.selectedOptions && proposal.data?.services) {
        Object.entries(proposal.data.services).forEach(([location, locationData]: [string, any]) => {
          if (Array.isArray(locationData)) return; // skip array-format (handled by recalc transform)
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
        proposal.data.hasPricingOptions = proposal.hasPricingOptions || false;
      }

      // Preserve gratuity fields and custom line items from proposal data before recalculation
      const gratuityType = proposal.data?.gratuityType || null;
      const gratuityValue = proposal.data?.gratuityValue || null;
      const customLineItems = proposal.data?.customLineItems || [];

      const calculatedData = recalculateServiceTotals(proposal.data);

      // Restore gratuity fields and custom line items after recalculation
      if (gratuityType) calculatedData.gratuityType = gratuityType;
      if (gratuityValue !== null) calculatedData.gratuityValue = gratuityValue;
      if (customLineItems.length > 0) calculatedData.customLineItems = customLineItems;

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
      
      // Clean up officeLocations to only include addresses for current locations
      if (calculatedData.officeLocations && calculatedData.locations) {
        const cleanedOfficeLocations: { [key: string]: string } = {};
        calculatedData.locations.forEach((location: string) => {
          if (calculatedData.officeLocations?.[location]) {
            cleanedOfficeLocations[location] = calculatedData.officeLocations[location];
          }
        });
        calculatedData.officeLocations = Object.keys(cleanedOfficeLocations).length > 0 
          ? cleanedOfficeLocations 
          : undefined;
      }
      
      // Pricing options were already attached before recalculation above.
      // Just ensure hasPricingOptions is set on calculatedData.
      if (proposal.hasPricingOptions) {
        calculatedData.hasPricingOptions = true;
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

  // Handle changing service type - apply defaults
  const handleServiceTypeChange = (location: string, date: string, serviceIndex: number, newServiceType: string) => {
    if (!editedData || !isEditing) return;
    
    const defaults = SERVICE_DEFAULTS[newServiceType] || {};
    const currentService = editedData.services[location][date].services[serviceIndex];
    
    // Create new service with defaults, preserving date and location
    const newService = {
      ...currentService,
      serviceType: newServiceType,
      ...defaults,
      date: currentService.date || date,
      location: currentService.location || location,
      // Preserve discountPercent if it exists
      discountPercent: currentService.discountPercent || 0,
      // Set service-specific fields based on type
      massageType: newServiceType === 'massage' ? (currentService.massageType || 'massage') : undefined,
      nailsType: newServiceType === 'nails' ? (currentService.nailsType || 'nails') : undefined,
      mindfulnessType: newServiceType === 'mindfulness' ? (currentService.mindfulnessType || 'intro') : undefined,
      classLength: newServiceType === 'mindfulness' ? (currentService.classLength || 45) : undefined,
      participants: newServiceType === 'mindfulness' ? (currentService.participants || 'unlimited') : undefined,
      fixedPrice: newServiceType === 'mindfulness' ? (currentService.fixedPrice || 1375) : undefined
    };
    
    // Recalculate service totals
    const { totalAppointments, serviceCost, proRevenue } = calculateServiceResults(newService);
    newService.totalAppointments = totalAppointments;
    newService.serviceCost = serviceCost;
    newService.proRevenue = proRevenue;
    
    // Update the service
    handleFieldChange(['services', location, date, 'services', serviceIndex], newService);
  };

  // Handle changing massage type sub-category
  const handleMassageTypeChange = (location: string, date: string, serviceIndex: number, newMassageType: string) => {
    if (!editedData || !isEditing) return;
    handleFieldChange(['services', location, date, 'services', serviceIndex, 'massageType'], newMassageType);
  };

  // Handle changing nails type sub-category
  const handleNailsTypeChange = (location: string, date: string, serviceIndex: number, newNailsType: string) => {
    if (!editedData || !isEditing) return;
    const currentService = editedData.services[location][date].services[serviceIndex];
    const newAppTime = newNailsType === 'nails-hand-massage' ? 35 : 30;
    const updatedService = {
      ...currentService,
      nailsType: newNailsType,
      appTime: newAppTime
    };
    const { totalAppointments, serviceCost, proRevenue } = calculateServiceResults(updatedService);
    updatedService.totalAppointments = totalAppointments;
    updatedService.serviceCost = serviceCost;
    updatedService.proRevenue = proRevenue;
    handleFieldChange(['services', location, date, 'services', serviceIndex], updatedService);
  };

  // Handle changing mindfulness type sub-category
  const handleMindfulnessTypeChange = (location: string, date: string, serviceIndex: number, newMindfulnessType: string) => {
    if (!editedData || !isEditing) return;
    
    const currentService = editedData.services[location][date].services[serviceIndex];
    let classLength = 45;
    let fixedPrice = 1375;

    if (newMindfulnessType === 'drop-in') {
      classLength = 30;
      fixedPrice = 1250;
    } else if (newMindfulnessType === 'intro') {
      classLength = 45;
      fixedPrice = 1375;
    } else {
      classLength = 60; // mindful-movement
      fixedPrice = 1500;
    }
    
    const updatedService = {
      ...currentService,
      mindfulnessType: newMindfulnessType,
      classLength,
      fixedPrice
    };
    
    // Recalculate service totals
    const { totalAppointments, serviceCost, proRevenue } = calculateServiceResults(updatedService);
    updatedService.totalAppointments = totalAppointments;
    updatedService.serviceCost = serviceCost;
    updatedService.proRevenue = proRevenue;
    
    handleFieldChange(['services', location, date, 'services', serviceIndex], updatedService);
  };

  // Handle adding a new service
  const handleAddService = (location: string, date: string) => {
    if (!editedData || !isEditing) return;
    
    // Create a new service with massage defaults (most common)
    const newService = {
      serviceType: 'massage',
      ...SERVICE_DEFAULTS.massage,
      date: date,
      location: location,
      discountPercent: 0,
      totalAppointments: 0,
      serviceCost: 0,
      proRevenue: 0
    };
    
    // Recalculate service totals
    const { totalAppointments, serviceCost, proRevenue } = calculateServiceResults(newService);
    newService.totalAppointments = totalAppointments;
    newService.serviceCost = serviceCost;
    newService.proRevenue = proRevenue;
    
    // Add the service to the date
    const updatedData = { ...editedData };
    if (!updatedData.services[location][date].services) {
      updatedData.services[location][date].services = [];
    }
    updatedData.services[location][date].services.push(newService);
    
    // Recalculate totals
    const recalculatedData = recalculateServiceTotals(updatedData);
    setEditedData({ ...recalculatedData, customization: currentProposal?.customization });
    setDisplayData({ ...recalculatedData, customization: currentProposal?.customization });
    setUpdateCounter(prev => prev + 1);
  };

  // Handle removing a service
  const handleRemoveService = (location: string, date: string, serviceIndex: number) => {
    if (!editedData || !isEditing) return;
    if (!window.confirm('Are you sure you want to remove this service?')) return;
    
    const updatedData = { ...editedData };
    updatedData.services[location][date].services.splice(serviceIndex, 1);
    
    // If no services remain, we could remove the date, but for now just leave it empty
    if (updatedData.services[location][date].services.length === 0) {
      updatedData.services[location][date].services = [];
      updatedData.services[location][date].totalCost = 0;
      updatedData.services[location][date].totalAppointments = 0;
    }
    
    // Recalculate totals
    const recalculatedData = recalculateServiceTotals(updatedData);
    setEditedData({ ...recalculatedData, customization: currentProposal?.customization });
    setDisplayData({ ...recalculatedData, customization: currentProposal?.customization });
    setUpdateCounter(prev => prev + 1);
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
      
      // If we're changing classLength for a mindfulness service, update mindfulnessType to match
      if (path[path.length - 1] === 'classLength' && service.serviceType === 'mindfulness') {
        const classLengthValue = typeof value === 'string' ? parseFloat(value) || 45 : value;
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
            if (selectedOption.discountPercent !== undefined) {
              service.discountPercent = selectedOption.discountPercent;
            }
            // DO NOT copy totalHours/numPros/hourlyRate — they are option-specific
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
            if (selectedOption.discountPercent !== undefined) {
              service.discountPercent = selectedOption.discountPercent;
            }
          }
        }
      } else {
        // No pricing options, recalculate normally
        // Make sure we use the updated service object with the new discountPercent
        const serviceToCalculate = { ...service };
        // If we just changed discountPercent, make sure it's set
        if (path[path.length - 1] === 'discountPercent') {
          serviceToCalculate.discountPercent = value;
        }
        const { totalAppointments, serviceCost } = calculateServiceResults(serviceToCalculate);
        service.totalAppointments = totalAppointments;
        service.serviceCost = serviceCost;
        // Ensure discountPercent is set on the service
        if (path[path.length - 1] === 'discountPercent') {
          service.discountPercent = value;
        }
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
      // Preserve gratuity fields and custom line items before recalculation
      const gratuityType = editedData?.gratuityType || null;
      const gratuityValue = editedData?.gratuityValue || null;
      const customLineItems = editedData?.customLineItems || [];

      const recalculatedData = recalculateServiceTotals(editedData);

      // Restore gratuity fields and custom line items after recalculation
      if (gratuityType) recalculatedData.gratuityType = gratuityType;
      if (gratuityValue !== null) recalculatedData.gratuityValue = gratuityValue;
      if (customLineItems.length > 0) recalculatedData.customLineItems = customLineItems;
      
      // Clean up officeLocations to only include addresses for current locations
      if (recalculatedData.officeLocations && recalculatedData.locations) {
        const cleanedOfficeLocations: { [key: string]: string } = {};
        recalculatedData.locations.forEach((location: string) => {
          if (recalculatedData.officeLocations?.[location]) {
            cleanedOfficeLocations[location] = recalculatedData.officeLocations[location];
          }
        });
        recalculatedData.officeLocations = Object.keys(cleanedOfficeLocations).length > 0 
          ? cleanedOfficeLocations 
          : undefined;
      }
      
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

  // Safety check: Don't render if this is a mindfulness proposal or missing required data
  if (!displayData || displayData.mindfulnessProgram || !displayData.services) {
    return (
      <div className="min-h-screen bg-neutral-light-gray flex items-center justify-center">
        <div className="card-medium text-center">
          <div className="text-shortcut-blue mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-shortcut-navy-blue mx-auto"></div>
          </div>
          <p className="text-lg text-text-dark-60">Redirecting to correct proposal viewer...</p>
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
        <div className="bg-neutral-light-gray py-2 md:py-3 px-3 sm:px-8">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-2 md:gap-3">
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
      
      {/* Proposal Options Management Section */}
      {!isSharedView && proposalOptions.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6">
          <div className="card-medium">
            <h3 className="text-lg font-extrabold text-shortcut-blue mb-4">Proposal Options</h3>
            <div className="space-y-3">
              {proposalOptions.map((option, index) => {
                const isCurrent = option.id === id;
                return (
                  <div
                    key={option.id}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                      isCurrent
                        ? 'border-shortcut-teal bg-shortcut-teal bg-opacity-10'
                        : 'border-gray-200 bg-white hover:border-shortcut-teal hover:bg-neutral-light-gray'
                    } transition-colors`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-sm font-bold text-shortcut-blue min-w-[60px]">
                        {option.option_name || `Option ${index + 1}`}
                      </span>
                      {isCurrent && (
                        <span className="text-xs font-semibold text-shortcut-navy-blue bg-shortcut-teal bg-opacity-20 px-2 py-1 rounded-full">
                          Current
                        </span>
                      )}
                      {option.status === 'approved' && (
                        <span className="text-xs font-semibold text-shortcut-navy-blue bg-shortcut-teal bg-opacity-20 px-2 py-1 rounded-full">
                          Approved
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isCurrent ? (
                        <>
                          {editingOptionName === option.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={optionNameInput}
                                onChange={(e) => setOptionNameInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleUpdateOptionName(option.id, optionNameInput);
                                  } else if (e.key === 'Escape') {
                                    setEditingOptionName(null);
                                    setOptionNameInput('');
                                  }
                                }}
                                className="px-2 py-1 text-sm border-2 border-shortcut-teal rounded focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                                autoFocus
                              />
                              <button
                                onClick={() => handleUpdateOptionName(option.id, optionNameInput)}
                                className="p-1 text-shortcut-blue hover:bg-shortcut-teal hover:bg-opacity-20 rounded transition-colors"
                                title="Save"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingOptionName(null);
                                  setOptionNameInput('');
                                }}
                                className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                                title="Cancel"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingOptionName(option.id);
                                setOptionNameInput(option.option_name || `Option ${index + 1}`);
                              }}
                              className="p-1.5 text-shortcut-blue hover:bg-shortcut-teal hover:bg-opacity-20 rounded transition-colors"
                              title="Edit name"
                            >
                              <Pencil size={16} />
                            </button>
                          )}
                        </>
                      ) : (
                        <Button
                          onClick={() => navigate(`/proposal/${option.id}`)}
                          variant="secondary"
                          size="sm"
                        >
                          View
                        </Button>
                      )}
                      {index > 0 && (
                        <button
                          onClick={() => handleReorderOption(option.id, option.option_order! - 1)}
                          className="p-1.5 text-shortcut-blue hover:bg-shortcut-teal hover:bg-opacity-20 rounded transition-colors"
                          title="Move up"
                        >
                          <ChevronUp size={16} />
                        </button>
                      )}
                      {index < proposalOptions.length - 1 && (
                        <button
                          onClick={() => handleReorderOption(option.id, option.option_order! + 1)}
                          className="p-1.5 text-shortcut-blue hover:bg-shortcut-teal hover:bg-opacity-20 rounded transition-colors"
                          title="Move down"
                        >
                          <ChevronDown size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (showDeleteConfirm === option.id) {
                            handleRemoveOption(option.id, option.option_name || `Option ${index + 1}`);
                          } else {
                            setShowDeleteConfirm(option.id);
                          }
                        }}
                        disabled={deletingOptionId === option.id}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                        title={showDeleteConfirm === option.id ? "Confirm removal" : "Remove from group"}
                      >
                        {showDeleteConfirm === option.id ? (
                          <Check size={16} />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                      {showDeleteConfirm === option.id && (
                        <button
                          onClick={() => setShowDeleteConfirm(null)}
                          className="p-1.5 text-text-dark-60 hover:bg-gray-100 rounded transition-colors"
                          title="Cancel"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 flex gap-3">
              <Button
                onClick={handleCreateOption}
                variant="primary"
                icon={<Plus size={18} />}
                loading={isCreatingOption}
                size="md"
              >
                {isCreatingOption ? 'Creating...' : 'Add Another Option'}
              </Button>
              <Button
                onClick={handleOpenLinkProposalsModal}
                variant="secondary"
                size="md"
              >
                Link Existing Proposal
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Another Option Button (when no options exist yet) */}
      {!isSharedView && proposalOptions.length === 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6">
          <div className="card-medium">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-shortcut-blue mb-2">Create Proposal Options</h3>
                <p className="text-sm text-text-dark-60">
                  Create multiple proposal variations for your client to compare and choose from.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleCreateOption}
                  variant="primary"
                  icon={<Plus size={18} />}
                  loading={isCreatingOption}
                  size="md"
                >
                  {isCreatingOption ? 'Creating...' : 'Add Another Option'}
                </Button>
                <Button
                  onClick={handleOpenLinkProposalsModal}
                  variant="secondary"
                  size="md"
                >
                  Link Existing Proposal
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                {/* Office Locations - Show per-location editor when officeLocations map exists or multiple locations */}
                {displayData.locations && (displayData.locations.length > 1 || displayData.officeLocations) ? (
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
                                  value={editedData?.officeLocations?.[location] ?? (displayData.officeLocations?.[location] ?? displayData.officeLocation ?? '')}
                                  onChange={(e) => {
                                    // Get current locations from editedData or displayData
                                    const currentLocations = editedData?.locations || displayData.locations || [];
                                    // Build officeLocations object with only addresses for current locations
                                    const currentOfficeLocations: { [key: string]: string } = {};
                                    
                                    // For each current location, get its address (prioritize editedData, then displayData)
                                    currentLocations.forEach((loc: string) => {
                                      // Only check displayData if this location is in displayData.locations
                                      let address: string | undefined;
                                      if (editedData?.officeLocations?.[loc]) {
                                        address = editedData.officeLocations[loc];
                                      } else if (displayData.locations?.includes(loc) && displayData.officeLocations?.[loc]) {
                                        // Only use displayData if location is in current proposal
                                        address = displayData.officeLocations[loc];
                                      }
                                      
                                      if (address) {
                                        currentOfficeLocations[loc] = address;
                                      }
                                    });
                                    
                                    // Update the address for the location being edited
                                    currentOfficeLocations[location] = e.target.value;
                                    
                                    handleFieldChange(['officeLocations'], currentOfficeLocations);
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
                                                    // Get current locations from editedData or displayData
                                                    const currentLocations = editedData?.locations || displayData.locations || [];
                                                    // Build officeLocations object with only addresses for current locations
                                                    const currentOfficeLocations: { [key: string]: string } = {};
                                                    
                                                    // For each current location, get its address (prioritize editedData, then displayData)
                                                    currentLocations.forEach((loc: string) => {
                                                      // Only check displayData if this location is in displayData.locations
                                                      let address: string | undefined;
                                                      if (editedData?.officeLocations?.[loc]) {
                                                        address = editedData.officeLocations[loc];
                                                      } else if (displayData.locations?.includes(loc) && displayData.officeLocations?.[loc]) {
                                                        // Only use displayData if location is in current proposal
                                                        address = displayData.officeLocations[loc];
                                                      }
                                                      
                                                      if (address) {
                                                        currentOfficeLocations[loc] = address;
                                                      }
                                                    });
                                                    
                                                    // Update the address for the location being edited
                                                    currentOfficeLocations[location] = data.results[0].formatted_address;
                                                    
                                                    handleFieldChange(['officeLocations'], currentOfficeLocations);
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

      <main className="max-w-7xl mx-auto py-4 md:py-6 px-3 md:px-4" id="proposal-content">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-12">
          <div className="lg:col-span-2 space-y-6 md:space-y-8">
            {/* Summary-First Layout - Key Metrics at Top */}
            <div className="card-large mb-4 md:mb-8">
              <div className="mb-6 md:mb-8">
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
                  isEditing && !isSharedView ? (
                    <input
                      type="text"
                      defaultValue={displayData.clientName}
                      onBlur={(e) => {
                        const newName = e.target.value.trim();
                        if (!newName || !editedData) return;
                        const updatedData = { ...editedData, clientName: newName };
                        setEditedData(updatedData);
                        setDisplayData({ ...updatedData, customization: currentProposal?.customization });
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                      className="h1 mb-6 w-full border-b-2 border-gray-300 focus:border-shortcut-teal focus:outline-none bg-transparent"
                    />
                  ) : (
                    <h1 className="h1 mb-6">
                      {displayData.clientName}
                    </h1>
                  )
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 pt-4 md:pt-6 border-t border-gray-200">
                <div>
                  <p className="text-xs md:text-sm font-bold text-shortcut-blue mb-1">Event Dates</p>
                  <p className="text-sm md:text-base font-medium text-text-dark">
                    {Array.isArray(displayData.eventDates) ? 
                      displayData.eventDates.map((date: string) => formatDate(date)).join(', ') :
                      'No dates available'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-xs md:text-sm font-bold text-shortcut-blue mb-1">Locations</p>
                  <p className="text-sm md:text-base font-medium text-text-dark">
                    {Array.isArray(displayData.locations) 
                      ? displayData.locations.join(', ') 
                      : displayData.locations || 'No locations available'}
                  </p>
                </div>
                <div>
                  <p className="text-xs md:text-sm font-bold text-shortcut-blue mb-1">Total Appointments</p>
                  <p className="text-sm md:text-base font-medium text-text-dark">
                    {displayData.summary?.totalAppointments === 0 || displayData.summary?.totalAppointments === 'unlimited' ? '∞' : (displayData.summary?.totalAppointments || 0)}
                  </p>
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
                    <div className="w-full flex justify-between items-center mb-4 md:mb-6">
                      <div className="flex items-center gap-2 md:gap-3">
                        <button
                          onClick={() => toggleLocation(location)}
                          className="hover:opacity-80 transition-opacity"
                        >
                          <h2 className="text-xl md:text-2xl font-extrabold text-shortcut-blue">
                            {location}
                          </h2>
                        </button>
                        {isEditing && !isSharedView && (
                          <input
                            type="text"
                            defaultValue={location}
                            onBlur={(e) => {
                              const newName = e.target.value.trim();
                              if (!newName || newName === location || !editedData) return;
                              const updatedData = { ...editedData };
                              // Rename the location key in services
                              updatedData.services[newName] = updatedData.services[location];
                              delete updatedData.services[location];
                              // Update location name on each service object
                              Object.values(updatedData.services[newName]).forEach((dateData: any) => {
                                dateData.services.forEach((s: any) => { s.location = newName; });
                              });
                              // Update locations array
                              updatedData.locations = (updatedData.locations || []).map((l: string) => l === location ? newName : l);
                              // Update officeLocations map
                              if (updatedData.officeLocations && updatedData.officeLocations[location]) {
                                updatedData.officeLocations[newName] = updatedData.officeLocations[location];
                                delete updatedData.officeLocations[location];
                              }
                              const recalculatedData = recalculateServiceTotals(updatedData);
                              setEditedData({ ...recalculatedData, customization: currentProposal?.customization });
                              setDisplayData({ ...recalculatedData, customization: currentProposal?.customization });
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                            className="px-2 py-1 text-lg font-bold border border-gray-300 rounded-md focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
                          />
                        )}
                      </div>
                      <button onClick={() => toggleLocation(location)} className="hover:opacity-80 transition-opacity">
                        {expandedLocations[location] ? <ChevronUp size={24} className="text-shortcut-blue" /> : <ChevronDown size={24} className="text-shortcut-blue" />}
                      </button>
                    </div>
                  
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
                            <div className="w-full px-4 md:px-6 py-3 md:py-4 flex justify-between items-center bg-white border-b border-gray-200">
                              <div className="flex items-center gap-2 md:gap-3">
                                <button
                                  onClick={() => toggleDate(date)}
                                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                                >
                                  <h3 className="text-base md:text-lg font-extrabold text-shortcut-blue">
                                    Day {dateIndex + 1} - {formatDate(date)}
                                  </h3>
                                </button>
                                {isEditing && !isSharedView && (
                                  <input
                                    type="date"
                                    value={formatDateForInput(date)}
                                    onChange={(e) => {
                                      if (!editedData) return;
                                      const newDate = e.target.value || 'TBD';
                                      if (newDate === date) return;

                                      const updatedData = { ...editedData };

                                      // Create new date entry if needed
                                      if (!updatedData.services[location][newDate]) {
                                        updatedData.services[location][newDate] = {
                                          services: [],
                                          totalCost: 0,
                                          totalAppointments: 0
                                        };
                                      }

                                      // Move ALL services from old date to new date
                                      const movingServices = updatedData.services[location][date].services.map(
                                        (s: any) => ({ ...s, date: newDate })
                                      );
                                      updatedData.services[location][newDate].services.push(...movingServices);

                                      // Remove old date entry
                                      delete updatedData.services[location][date];

                                      // Rebuild eventDates
                                      const allDates = new Set<string>();
                                      Object.values(updatedData.services || {}).forEach((locData: any) => {
                                        Object.keys(locData).forEach((d: string) => allDates.add(d));
                                      });
                                      updatedData.eventDates = Array.from(allDates).sort((a, b) => {
                                        if (a === 'TBD' && b === 'TBD') return 0;
                                        if (a === 'TBD') return 1;
                                        if (b === 'TBD') return -1;
                                        return new Date(a).getTime() - new Date(b).getTime();
                                      });

                                      const recalculatedData = recalculateServiceTotals(updatedData);
                                      setEditedData({ ...recalculatedData, customization: currentProposal?.customization });
                                      setDisplayData({ ...recalculatedData, customization: currentProposal?.customization });
                                    }}
                                    className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
                                  />
                                )}
                              </div>
                              <button onClick={() => toggleDate(date)} className="hover:opacity-80 transition-opacity">
                                {expandedDates[date] ? <ChevronUp size={16} className="text-shortcut-blue" /> : <ChevronDown size={16} className="text-shortcut-blue" />}
                              </button>
                            </div>

                            {expandedDates[date] && (
                              <div className="p-6 bg-white">
                                {isEditing && !isSharedView && (
                                  <div className="mb-4 pb-4 border-b border-gray-200">
                                    <Button
                                      onClick={() => handleAddService(location, date)}
                                      variant="secondary"
                                      icon={<Plus size={18} />}
                                      size="sm"
                                    >
                                      Add Service
                                    </Button>
                                  </div>
                                )}
                                {dateData.services.map((service: any, serviceIndex: number) => (
                                  <div
                                    key={serviceIndex}
                                    className="card-small mb-6"
                                  >
                                    <div className="flex items-center justify-between mb-4">
                                      <div className="flex items-center gap-3">
                                        <h4 className="text-lg font-extrabold text-shortcut-blue flex items-center">
                                          <span className="w-3 h-3 rounded-full bg-shortcut-teal mr-3"></span>
                                          Service Type: {getServiceDisplayName(service.serviceType)}
                                        </h4>
                                        {service.isRecurring && service.recurringFrequency && (
                                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                                            Recurring
                                            <span className="opacity-80">
                                              ({service.recurringFrequency.type === 'quarterly' ? 'Quarterly' :
                                                service.recurringFrequency.type === 'monthly' ? 'Monthly' :
                                                `${service.recurringFrequency.occurrences}x`})
                                            </span>
                                            {service.recurringDiscount > 0 && (
                                              <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[10px]">
                                                {service.recurringDiscount}% off
                                              </span>
                                            )}
                                          </span>
                                        )}
                                      </div>
                                      {isEditing && !isSharedView && (
                                        <div className="flex items-center gap-2">
                                          <select
                                            value={service.serviceType}
                                            onChange={(e) => handleServiceTypeChange(location, date, serviceIndex, e.target.value)}
                                            className="px-3 py-1.5 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal font-medium"
                                          >
                                            <option value="massage">Massage</option>
                                            <option value="facial">Facial</option>
                                            <option value="hair">Hair</option>
                                            <option value="nails">Nails</option>
                                            <option value="makeup">Makeup</option>
                                            <option value="headshot">Headshots</option>
                                            <option value="mindfulness">Mindfulness</option>
                                            <option value="mindfulness-soles">Mindfulness: Soles of the Feet</option>
                                            <option value="mindfulness-movement">Mindfulness: Ground & Reset</option>
                                            <option value="mindfulness-pro">Mindfulness: PRO Practice</option>
                                            <option value="mindfulness-cle">Mindfulness: CLE Ethics Program</option>
                                            <option value="mindfulness-pro-reactivity">Pause, Relax, Open: Mindfulness Tools to Step Out of Reactivity and Respond Wisely</option>
                                            <option value="hair-makeup">Hair + Makeup</option>
                                            <option value="headshot-hair-makeup">Hair + Makeup for Headshots</option>
                                          </select>
                                          <button
                                            onClick={() => handleRemoveService(location, date, serviceIndex)}
                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                                            title="Remove service"
                                          >
                                            <Trash2 size={18} />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Service Description */}
                                    {getServiceDescription(service) && (
                                      <div className="mb-4 p-4 bg-white rounded-lg border-2 border-shortcut-teal shadow-sm">
                                        <p className="text-text-dark text-sm leading-relaxed">
                                          {getServiceDescription(service)}
                                        </p>
                                        {service.serviceType === 'mindfulness' && (
                                          <div className="mt-3 space-y-3">
                                            {isEditing ? (
                                              <div>
                                                <label className="block text-sm font-bold text-shortcut-navy-blue mb-2">
                                                  Mindfulness Type:
                                                </label>
                                                <select
                                                  value={service.mindfulnessType || 'intro'}
                                                  onChange={(e) => handleMindfulnessTypeChange(location, date, serviceIndex, e.target.value)}
                                                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
                                                >
                                                  <option value="intro">40 minutes - Intro to Mindfulness ($1,350)</option>
                                                  <option value="drop-in">30 minutes - Drop-in Session ($1,125)</option>
                                                  <option value="mindful-movement">60 minutes - Mindful Movement ($1,350)</option>
                                                </select>
                                              </div>
                                            ) : (
                                              <div className="grid grid-cols-2 gap-4 text-sm">
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
                                                {service.mindfulnessType && (
                                                  <div className="col-span-2">
                                                    <span className="font-bold text-shortcut-navy-blue">Type:</span>
                                                    <span className="ml-2 text-text-dark">
                                                      {service.mindfulnessType === 'intro' ? 'Intro to Mindfulness' :
                                                       service.mindfulnessType === 'drop-in' ? 'Drop-in Session' :
                                                       service.mindfulnessType === 'mindful-movement' ? 'Mindful Movement' :
                                                       'Mindfulness'}
                                                    </span>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        {service.serviceType === 'massage' && (
                                          <div className="mt-3 text-sm">
                                            <span className="font-bold text-shortcut-navy-blue">Massage Type:</span>
                                            {isEditing ? (
                                              <select
                                                value={service.massageType || 'massage'}
                                                onChange={(e) => handleMassageTypeChange(location, date, serviceIndex, e.target.value)}
                                                className="ml-2 px-2 py-1 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
                                              >
                                                <option value="massage">General Massage</option>
                                                <option value="chair">Chair Massage</option>
                                                <option value="table">Table Massage</option>
                                              </select>
                                            ) : (
                                              <span className="ml-2 text-text-dark capitalize">
                                                {service.massageType === 'massage' ? 'General' :
                                                 service.massageType === 'chair' ? 'Chair' :
                                                 service.massageType === 'table' ? 'Table' :
                                                 'Massage'}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                        {service.serviceType === 'nails' && (
                                          <div className="mt-3 text-sm">
                                            <span className="font-bold text-shortcut-navy-blue">Nails Type:</span>
                                            {isEditing ? (
                                              <select
                                                value={service.nailsType || 'nails'}
                                                onChange={(e) => handleNailsTypeChange(location, date, serviceIndex, e.target.value)}
                                                className="ml-2 px-2 py-1 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
                                              >
                                                <option value="nails">Classic Nails</option>
                                                <option value="nails-hand-massage">Nails + Hand Massages</option>
                                              </select>
                                            ) : (
                                              <span className="ml-2 text-text-dark">
                                                {service.nailsType === 'nails-hand-massage' ? 'Nails + Hand Massages' : 'Classic Nails'}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Recurring Event Details */}
                                    {service.isRecurring && service.recurringFrequency && (() => {
                                      const occurrences = service.recurringFrequency.occurrences;
                                      const discountRate = occurrences >= 9 ? 0.20 : occurrences >= 4 ? 0.15 : 0;
                                      // service.serviceCost is THIS event's cost (already discounted)
                                      const thisEventDiscounted = service.serviceCost;
                                      const thisEventOriginal = discountRate > 0 ? thisEventDiscounted / (1 - discountRate) : thisEventDiscounted;
                                      const thisEventSavings = thisEventOriginal - thisEventDiscounted;

                                      return (
                                        <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <span className="text-base">🔄</span>
                                              <span className="font-semibold text-purple-800 text-sm">Recurring Partner</span>
                                              <span className="text-purple-600 text-sm">({occurrences} events total)</span>
                                            </div>
                                            {discountRate > 0 && (
                                              <span className="text-green-700 font-semibold text-sm">
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

                                    <div className="grid gap-0">
                                      {service.serviceType === 'mindfulness' ? (
                                        <div className="flex justify-between items-center py-3 border-b border-gray-200">
                                          <span className="text-sm md:text-base font-bold text-shortcut-blue">Class Length:</span>
                                          <div className="font-bold text-text-dark">
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
                                        <div className="flex justify-between items-center py-3 border-b border-gray-200">
                                          <span className="text-sm md:text-base font-bold text-shortcut-blue">Total Hours:</span>
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
                                      )}
                                      <div className="flex justify-between items-center py-3 border-b border-gray-200">
                                        <span className="text-sm md:text-base font-bold text-shortcut-blue">Professionals:</span>
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
                                        <span className="text-sm md:text-base font-bold text-shortcut-blue">Appointments:</span>
                                        <span className="font-bold text-text-dark">{service.totalAppointments === 'unlimited' ? '∞' : service.totalAppointments}</span>
                                      </div>
                                      <div className="flex justify-between items-center py-3 border-b border-gray-200">
                                        <span className="text-sm md:text-base font-bold text-shortcut-blue">Service Cost:</span>
                                        <div className="text-right">
                                          {(service.serviceType === 'mindfulness' ||
                                            service.serviceType === 'mindfulness-soles' ||
                                            service.serviceType === 'mindfulness-movement' ||
                                            service.serviceType === 'mindfulness-pro' ||
                                            service.serviceType === 'mindfulness-cle' ||
                                            service.serviceType === 'mindfulness-pro-reactivity') && isEditing ? (
                                            <div className="flex items-center gap-2">
                                              <span className="font-bold text-shortcut-blue">$</span>
                                              <input
                                                type="number"
                                                value={service.serviceCost}
                                                onChange={(e) => {
                                                  const newCost = parseFloat(e.target.value) || 0;
                                                  handleFieldChange(['services', location, date, 'services', serviceIndex, 'serviceCost'], newCost);
                                                  // Also update fixedPrice to match
                                                  handleFieldChange(['services', location, date, 'services', serviceIndex, 'fixedPrice'], newCost);
                                                }}
                                                className="w-32 px-3 py-2 border-2 border-shortcut-blue rounded-lg font-bold text-shortcut-blue text-lg text-right"
                                              />
                                            </div>
                                          ) : service.discountPercent > 0 ? (
                                            <div className="space-y-1">
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm text-text-dark-60 line-through">${formatCurrency(calculateOriginalPrice(service))}</span>
                                                <span className="font-bold text-shortcut-blue text-lg">${formatCurrency(service.serviceCost)}</span>
                                              </div>
                                              <div className="text-xs font-semibold text-green-600">
                                                {service.discountPercent}% discount applied
                                              </div>
                                            </div>
                                          ) : (
                                            <span className="font-bold text-shortcut-blue text-lg">${formatCurrency(service.serviceCost)}</span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex justify-between items-center py-3 border-b border-gray-200">
                                        <span className="text-sm md:text-base font-bold text-shortcut-blue">Appt Time:</span>
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
                                        <span className="text-sm md:text-base font-bold text-shortcut-blue">Pro Hourly:</span>
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
                                        <span className="text-sm md:text-base font-bold text-shortcut-blue">Hourly Rate:</span>
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
                                        <span className="text-sm md:text-base font-bold text-shortcut-blue">Early Arrival:</span>
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
                                          <span className="text-sm md:text-base font-bold text-shortcut-blue">Retouching/Photo:</span>
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
                                        <span className="text-sm md:text-base font-bold text-shortcut-blue">Discount:</span>
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
                                                if (!editedData || !isEditing) return;
                                                const updatedData = { ...editedData };
                                                const pricingOptions = generatePricingOptionsForService(service);
                                                updatedData.services[location][date].services[serviceIndex].pricingOptions = pricingOptions;
                                                updatedData.services[location][date].services[serviceIndex].selectedOption = 0;
                                                updatedData.hasPricingOptions = true;
                                                const recalculated = recalculateServiceTotals(updatedData);
                                                setEditedData({ ...recalculated, customization: currentProposal?.customization });
                                                setDisplayData({ ...recalculated, customization: currentProposal?.customization });
                                                setUpdateCounter(prev => prev + 1);
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
                                                {isEditing && !isSharedView && (
                                                  <div className="mt-3 border-t pt-3">
                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                                      <div>
                                                        <label className="block text-xs font-bold text-shortcut-blue mb-1">Total Hours:</label>
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
                                                        <label className="block text-xs font-bold text-shortcut-blue mb-1">Hourly Rate:</label>
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
                                                      <div>
                                                        <label className="block text-xs font-bold text-shortcut-blue mb-1">Number of Pros:</label>
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
                                                      <div>
                                                        <label className="block text-xs font-bold text-shortcut-blue mb-1">Discount %:</label>
                                                        <EditableField
                                                          value={String(option.discountPercent !== undefined ? option.discountPercent : (service.discountPercent || 0))}
                                                          onChange={(value) => {
                                                            const discountValue = parseFloat(value) || 0;
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

                                <div className="mt-4 md:mt-6 bg-white rounded-xl p-4 md:p-6 border-2 border-shortcut-navy-blue shadow-md">
                                  <h4 className="text-lg md:text-xl font-extrabold mb-3 md:mb-4 text-shortcut-navy-blue">Day {dateIndex + 1} Summary</h4>
                                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                                    <div className="bg-shortcut-teal bg-opacity-10 rounded-lg p-3 md:p-4 border border-shortcut-teal">
                                      <div className="text-[10px] md:text-sm font-bold text-shortcut-navy-blue mb-1">Appointments</div>
                                      <div className="text-xl md:text-2xl font-extrabold text-shortcut-navy-blue">
                                        {dateData.totalAppointments === 0 || dateData.totalAppointments === 'unlimited' ? '∞' : (dateData.totalAppointments || 0)}
                                      </div>
                                    </div>
                                    <div className="bg-shortcut-teal bg-opacity-10 rounded-lg p-3 md:p-4 border border-shortcut-teal">
                                      <div className="text-[10px] md:text-sm font-bold text-shortcut-navy-blue mb-1">Total Cost</div>
                                      {displayData.isAutoRecurring && displayData.autoRecurringDiscount ? (
                                        <div>
                                          <div className="text-sm md:text-lg font-semibold text-shortcut-navy-blue/60 line-through">
                                            ${formatCurrency(dateData.totalCost || 0)}
                                          </div>
                                          <div className="text-xl md:text-2xl font-extrabold text-green-600">
                                            ${formatCurrency((dateData.totalCost || 0) * (1 - displayData.autoRecurringDiscount / 100))}
                                          </div>
                                          <div className="text-xs text-green-600 font-bold mt-1">
                                            {displayData.autoRecurringDiscount}% discount
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="text-xl md:text-2xl font-extrabold text-shortcut-navy-blue">${formatCurrency(dateData.totalCost || 0)}</div>
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

            <ServiceAgreement />
          </div>

          <div className="lg:sticky lg:top-24 space-y-6 md:space-y-8 self-start">
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
                isAutoRecurring={displayData.isAutoRecurring}
                autoRecurringDiscount={displayData.autoRecurringDiscount}
              />
            ))}

            {/* Gratuity Section - Only show in edit mode */}
            {isEditing && !isSharedView && (
              <div className="card-large">
                <h2 className="text-lg md:text-xl font-extrabold text-shortcut-blue mb-3 md:mb-4">Gratuity</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-shortcut-blue mb-2">Gratuity Type</label>
                    <select
                      value={editedData?.gratuityType || ''}
                      onChange={(e) => {
                        const newData = { ...editedData };
                        newData.gratuityType = e.target.value || null;
                        if (!e.target.value) {
                          newData.gratuityValue = null;
                        }
                        const recalculated = recalculateServiceTotals(newData);
                        setEditedData({ ...recalculated, customization: currentProposal?.customization });
                        setDisplayData({ ...recalculated, customization: currentProposal?.customization });
                      }}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
                    >
                      <option value="">No Gratuity</option>
                      <option value="percentage">Percentage</option>
                      <option value="dollar">Dollar Amount</option>
                    </select>
                  </div>
                  {editedData?.gratuityType && (
                    <div>
                      <label className="block text-sm font-bold text-shortcut-blue mb-2">
                        {editedData.gratuityType === 'percentage' ? 'Gratuity Percentage' : 'Gratuity Amount'}
                      </label>
                      <div className="flex items-center gap-2">
                        {editedData.gratuityType === 'percentage' ? (
                          <>
                            <EditableField
                              value={String(editedData.gratuityValue || 0)}
                              onChange={(value) => {
                                const newData = { ...editedData };
                                newData.gratuityValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
                                const recalculated = recalculateServiceTotals(newData);
                                setEditedData({ ...recalculated, customization: currentProposal?.customization });
                                setDisplayData({ ...recalculated, customization: currentProposal?.customization });
                              }}
                              isEditing={isEditing}
                              type="number"
                              suffix="%"
                            />
                          </>
                        ) : (
                          <>
                            <span className="text-shortcut-blue font-bold">$</span>
                            <EditableField
                              value={String(editedData.gratuityValue || 0)}
                              onChange={(value) => {
                                const newData = { ...editedData };
                                newData.gratuityValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
                                const recalculated = recalculateServiceTotals(newData);
                                setEditedData({ ...recalculated, customization: currentProposal?.customization });
                                setDisplayData({ ...recalculated, customization: currentProposal?.customization });
                              }}
                              isEditing={isEditing}
                              type="number"
                              prefix="$"
                            />
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Auto-Recurring Discount Section - Only show in edit mode */}
            {isEditing && !isSharedView && (
              <div className="card-large">
                <h2 className="text-lg md:text-xl font-extrabold text-shortcut-blue mb-3 md:mb-4">Recurring Discount</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-shortcut-blue mb-2">
                      Discount Amount
                      <span className="font-normal text-gray-500 ml-2">
                        (Auto-applied: 15% for 4-8 dates, 20% for 9+ dates)
                      </span>
                    </label>
                    <select
                      value={editedData?.isAutoRecurring ? String(editedData.autoRecurringDiscount || 0) : '0'}
                      onChange={(e) => {
                        const discountValue = parseInt(e.target.value) || 0;
                        const newData = { ...editedData };

                        if (discountValue === 0) {
                          // Clear auto-recurring
                          newData.isAutoRecurring = false;
                          newData.autoRecurringDiscount = undefined;
                          newData.autoRecurringSavings = undefined;
                        } else {
                          // Set manual auto-recurring discount
                          newData.isAutoRecurring = true;
                          newData.autoRecurringDiscount = discountValue;
                          // Savings will be calculated by recalculateServiceTotals
                        }

                        const recalculated = recalculateServiceTotals(newData);
                        setEditedData({ ...recalculated, customization: currentProposal?.customization });
                        setDisplayData({ ...recalculated, customization: currentProposal?.customization });
                      }}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
                    >
                      <option value="0">No Recurring Discount</option>
                      <option value="15">15% Recurring Discount</option>
                      <option value="20">20% Recurring Discount</option>
                    </select>
                  </div>
                  {editedData?.isAutoRecurring && editedData.autoRecurringDiscount && (
                    <div className="flex items-center gap-2 text-green-600 font-semibold">
                      <span>✨</span>
                      <span>
                        {editedData.autoRecurringDiscount}% discount will save ${((editedData.autoRecurringSavings || 0)).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Custom Line Items Section - Only show in edit mode */}
            {isEditing && !isSharedView && (
              <div className="card-large">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg md:text-xl font-extrabold text-shortcut-blue">Custom Line Items</h2>
                  <button
                    onClick={() => {
                      const newData = { ...editedData };
                      const newItems = [...(newData.customLineItems || [])];
                      newItems.push({
                        id: crypto.randomUUID(),
                        name: '',
                        description: '',
                        amount: 0,
                      });
                      newData.customLineItems = newItems;
                      const recalculated = recalculateServiceTotals(newData);
                      setEditedData({ ...recalculated, customization: currentProposal?.customization });
                      setDisplayData({ ...recalculated, customization: currentProposal?.customization });
                    }}
                    className="px-3 py-1.5 bg-shortcut-teal text-shortcut-blue rounded-lg text-sm font-bold hover:bg-shortcut-teal/90 transition-colors"
                  >
                    + Add Item
                  </button>
                </div>
                {(!editedData?.customLineItems || editedData.customLineItems.length === 0) && (
                  <p className="text-sm text-gray-500">No custom line items. Add catering, equipment rental, or other charges.</p>
                )}
                {editedData?.customLineItems && editedData.customLineItems.length > 0 && (
                  <div className="space-y-3">
                    {editedData.customLineItems.map((item, idx) => (
                      <div key={item.id} className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-1 w-full space-y-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => {
                              const newData = { ...editedData };
                              const newItems = [...(newData.customLineItems || [])];
                              newItems[idx] = { ...newItems[idx], name: e.target.value };
                              newData.customLineItems = newItems;
                              setEditedData({ ...newData, customization: currentProposal?.customization });
                              setDisplayData({ ...newData, customization: currentProposal?.customization });
                            }}
                            placeholder="Item name (e.g. Catering)"
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
                          />
                          <input
                            type="text"
                            value={item.description || ''}
                            onChange={(e) => {
                              const newData = { ...editedData };
                              const newItems = [...(newData.customLineItems || [])];
                              newItems[idx] = { ...newItems[idx], description: e.target.value };
                              newData.customLineItems = newItems;
                              setEditedData({ ...newData, customization: currentProposal?.customization });
                              setDisplayData({ ...newData, customization: currentProposal?.customization });
                            }}
                            placeholder="Description (optional)"
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
                          />
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <div className="flex items-center flex-1 sm:flex-none">
                            <span className="text-sm font-bold text-gray-500 mr-1">$</span>
                            <input
                              type="number"
                              value={item.amount || ''}
                              onChange={(e) => {
                                const newData = { ...editedData };
                                const newItems = [...(newData.customLineItems || [])];
                                newItems[idx] = { ...newItems[idx], amount: parseFloat(e.target.value) || 0 };
                                newData.customLineItems = newItems;
                                const recalculated = recalculateServiceTotals(newData);
                                setEditedData({ ...recalculated, customization: currentProposal?.customization });
                                setDisplayData({ ...recalculated, customization: currentProposal?.customization });
                              }}
                              placeholder="0"
                              className="w-full sm:w-24 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-bold text-right focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
                            />
                          </div>
                          <button
                            onClick={() => {
                              const newData = { ...editedData };
                              const newItems = [...(newData.customLineItems || [])];
                              newItems.splice(idx, 1);
                              newData.customLineItems = newItems;
                              const recalculated = recalculateServiceTotals(newData);
                              setEditedData({ ...recalculated, customization: currentProposal?.customization });
                              setDisplayData({ ...recalculated, customization: currentProposal?.customization });
                            }}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove item"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="bg-shortcut-navy-blue text-white rounded-2xl shadow-lg border border-shortcut-navy-blue border-opacity-20 p-5 md:p-8">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h2 className="text-lg md:text-xl font-extrabold text-white">Event Summary</h2>
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
                      🔄 {recurringCount} Recurring Service{recurringCount !== 1 ? 's' : ''}
                    </span>
                  ) : null;
                })()}
              </div>
              <div className="space-y-3 md:space-y-4">
                <div className="flex justify-between items-center py-2 md:py-3 border-b border-white/20">
                  <span className="font-semibold text-sm md:text-base">Appointments:</span>
                  <span className="font-bold text-base md:text-lg">
                    {displayData.summary?.totalAppointments === 0 || displayData.summary?.totalAppointments === 'unlimited' ? '∞' : (displayData.summary?.totalAppointments || 0)}
                  </span>
                </div>
                {/* Custom Line Items in summary */}
                {displayData.customLineItems && displayData.customLineItems.length > 0 && displayData.customLineItems.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center py-2 md:py-3 border-b border-white/20">
                    <span className="font-semibold text-sm md:text-base">{item.name || 'Custom Item'}:</span>
                    <span className="font-bold text-base md:text-lg">${formatCurrency(item.amount || 0)}</span>
                  </div>
                ))}
                {displayData.gratuityType && displayData.gratuityValue !== null && displayData.gratuityValue !== undefined && (
                  <>
                    <div className="flex justify-between items-center py-2 md:py-3 border-b border-white/20">
                      <span className="font-semibold text-sm md:text-base">Subtotal:</span>
                      <span className="font-bold text-base md:text-lg">${formatCurrency(displayData.summary?.subtotalBeforeGratuity ?? displayData.summary?.totalEventCost ?? 0)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 md:py-3 border-b border-white/20">
                      <span className="font-semibold text-sm md:text-base">
                        Gratuity {displayData.gratuityType === 'percentage' ? `(${displayData.gratuityValue}%)` : ''}:
                      </span>
                      <span className="font-bold text-base md:text-lg">${formatCurrency(displayData.summary?.gratuityAmount || 0)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center py-2 md:py-3 border-b border-white/20">
                  <span className="font-semibold text-sm md:text-base">Total Event Cost:</span>
                  <span className="font-bold text-base md:text-lg">${formatCurrency(displayData.summary?.totalEventCost || 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 md:py-3 border-b border-white/20">
                  <span className="font-semibold text-sm md:text-base">Pro Revenue:</span>
                  <span className="font-bold text-base md:text-lg">${formatCurrency(displayData.summary?.totalProRevenue || 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 md:py-3 border-b border-white/20">
                  <span className="font-semibold text-sm md:text-base">Net Profit:</span>
                  <span className="font-bold text-base md:text-lg">${formatCurrency(displayData.summary?.netProfit || 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 md:py-3">
                  <span className="font-semibold text-sm md:text-base">Profit Margin:</span>
                  <span className="font-bold text-base md:text-lg">{(displayData.summary?.profitMargin || 0).toFixed(1)}%</span>
                </div>
                {/* Recurring Savings Display (manual or auto) */}
                {(() => {
                  // Check for auto-recurring savings first
                  if (displayData.isAutoRecurring && displayData.autoRecurringSavings && displayData.autoRecurringSavings > 0) {
                    return (
                      <div className="mt-4 pt-4 border-t border-white/20">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold flex items-center gap-2">
                            <span className="text-lg">✨</span>
                            Recurring Discount ({displayData.autoRecurringDiscount}%):
                          </span>
                          <span className="font-bold text-lg text-green-300">-${formatCurrency(displayData.autoRecurringSavings)}</span>
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
                    <div className="mt-4 pt-4 border-t border-white/20">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold flex items-center gap-2">
                          <span className="text-lg">✨</span>
                          Recurring Savings:
                        </span>
                        <span className="font-bold text-lg text-green-300">-${formatCurrency(totalSavings)}</span>
                      </div>
                    </div>
                  ) : null;
                })()}
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

      {/* Link Existing Proposals Modal */}
      {showLinkProposalsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4">
          <div className="card-large max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="mb-6 pb-4 border-b-2 border-shortcut-teal border-opacity-20">
              <h3 className="text-2xl font-extrabold text-shortcut-navy-blue mb-2">
                Link Existing Proposals
              </h3>
              <p className="text-base text-text-dark-60">
                Select one or more existing proposals to link to this group. They will become options that clients can switch between.
              </p>
            </div>

            {/* Search */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="Search by client name, proposal ID, or option name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base"
              />
            </div>

            {/* Proposal List */}
            <div className="flex-1 overflow-y-auto mb-6 space-y-3 border-2 border-gray-200 rounded-xl p-4 bg-neutral-light-gray max-h-96">
              {filteredAvailableProposals.length === 0 ? (
                <div className="text-center text-text-dark-60 py-8">
                  {searchTerm ? 'No proposals found matching your search.' : 'No available proposals to link.'}
                </div>
              ) : (
                filteredAvailableProposals.map((proposal: any) => {
                  const isSelected = selectedProposalsToLink.includes(proposal.id);
                  const isInAnotherGroup = proposal.proposal_group_id && proposal.proposal_group_id !== id;
                  
                  return (
                    <div
                      key={proposal.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedProposalsToLink(prev => prev.filter(id => id !== proposal.id));
                        } else {
                          setSelectedProposalsToLink(prev => [...prev, proposal.id]);
                        }
                      }}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'border-shortcut-teal bg-shortcut-teal bg-opacity-10 shadow-md'
                          : 'border-gray-200 bg-white hover:border-shortcut-teal hover:bg-white hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-bold text-shortcut-blue">
                              {proposal.client_name || 'Unnamed Client'}
                            </span>
                            {proposal.proposal_type === 'mindfulness-program' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-shortcut-pink/20 text-shortcut-navy-blue border border-shortcut-pink/30">
                                <Brain size={12} />
                                Mindfulness
                              </span>
                            )}
                            {proposal.proposal_type !== 'mindfulness-program' && proposal.proposal_type && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-shortcut-teal/20 text-shortcut-navy-blue border border-shortcut-teal/30">
                                Event
                              </span>
                            )}
                            {proposal.option_name && (
                              <span className="text-xs text-text-dark-60">
                                ({proposal.option_name})
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-text-dark-60">
                            Created: {format(new Date(proposal.created_at), 'MMM d, yyyy')}
                            {isInAnotherGroup && (
                              <span className="ml-2 text-shortcut-service-yellow font-semibold">
                                (Currently in another group)
                              </span>
                            )}
                          </div>
                          {proposal.status && (
                            <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-semibold ${
                              proposal.status === 'approved' 
                                ? 'bg-shortcut-teal bg-opacity-20 text-shortcut-navy-blue'
                                : 'bg-gray-200 text-text-dark-60'
                            }`}>
                              {proposal.status}
                            </span>
                          )}
                        </div>
                        <div className="ml-4">
                          {isSelected ? (
                            <CheckCircle2 size={20} className="text-shortcut-teal" />
                          ) : (
                            <div className="w-5 h-5 border-2 border-gray-300 rounded" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex gap-3 pt-6 border-t-2 border-shortcut-teal border-opacity-20">
              <Button
                onClick={() => {
                  setShowLinkProposalsModal(false);
                  setSelectedProposalsToLink([]);
                  setSearchTerm('');
                }}
                variant="secondary"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleLinkProposals}
                variant="primary"
                className="flex-1"
                loading={isLinkingProposals}
                disabled={selectedProposalsToLink.length === 0}
              >
                {isLinkingProposals 
                  ? 'Linking...' 
                  : `Link ${selectedProposalsToLink.length} Proposal${selectedProposalsToLink.length !== 1 ? 's' : ''}`
                }
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProposalViewer;