import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Sparkles, Download, Share2, Undo2, Redo2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { prepareProposalFromCalculation } from '../utils/proposalGenerator';
import { calculateServiceResults } from '../utils/proposalGenerator';
import { useNavigate } from 'react-router-dom';
import { generatePDF } from '../utils/pdf';

// Service preset packages (same as GenericLandingPage)
const SERVICE_PRESETS = {
  massage: [
    { appointments: 36, eventTime: 4, pros: 3, price: 1620 },
    { appointments: 48, eventTime: 4, pros: 4, price: 2160, popular: true },
    { appointments: 60, eventTime: 5, pros: 4, price: 2700 }
  ],
  'hair-makeup': [
    { appointments: 32, eventTime: 6, pros: 3, price: 2430 },
    { appointments: 48, eventTime: 6, pros: 4, price: 3240, popular: true },
    { appointments: 60, eventTime: 6, pros: 5, price: 4050 }
  ],
  headshot: [
    { appointments: 30, eventTime: 5, pros: 1, price: 3000 },
    { appointments: 60, eventTime: 6, pros: 2, price: 7200, popular: true },
    { appointments: 90, eventTime: 6, pros: 3, price: 10800 }
  ],
  nails: [
    { appointments: 32, eventTime: 6, pros: 3, price: 2430 },
    { appointments: 48, eventTime: 6, pros: 4, price: 3240, popular: true },
    { appointments: 60, eventTime: 6, pros: 5, price: 4050 }
  ],
  mindfulness: [
    { appointments: 1, eventTime: 0.5, pros: 1, price: 1225, name: 'Mindful Eating & Breathe Awareness', popular: true },
    { appointments: 1, eventTime: 0.5, pros: 1, price: 1225, name: 'Movement & Scan' },
    { appointments: 1, eventTime: 1, pros: 1, price: 1500, name: 'Speak & Listen' }
  ]
} as const;

// Service defaults for technical calculations
const SERVICE_DEFAULTS: { [key: string]: any } = {
  massage: {
    appTime: 20,
    proHourly: 50,
    hourlyRate: 135,
    earlyArrival: 25,
    retouchingCost: 0
  },
  'hair-makeup': {
    appTime: 20,
    proHourly: 50,
    hourlyRate: 135,
    earlyArrival: 25,
    retouchingCost: 0
  },
  headshot: {
    appTime: 12,
    proHourly: 400,
    hourlyRate: 0,
    earlyArrival: 0,
    retouchingCost: 50
  },
  nails: {
    appTime: 30,
    proHourly: 50,
    hourlyRate: 135,
    earlyArrival: 25,
    retouchingCost: 0
  },
  mindfulness: {
    appTime: 45,
    proHourly: 0,
    hourlyRate: 0,
    earlyArrival: 0,
    retouchingCost: 0,
    classLength: 45,
    participants: 'unlimited',
    fixedPrice: 1375
  }
};

// Service display names
const getServiceName = (serviceId: string) => {
  const names: { [key: string]: string } = {
    'massage': 'Massage',
    'hair-makeup': 'Glam',
    'headshot': 'Headshots',
    'nails': 'Nails',
    'mindfulness': 'Mindfulness'
  };
  return names[serviceId] || 'Service';
};

// Service colors
const getServiceColor = (serviceId: string) => {
  const colors: { [key: string]: string } = {
    'massage': '#9EFAFF',
    'hair-makeup': '#FEDC64',
    'headshot': '#9EFAFF',
    'nails': '#F9CDFF',
    'mindfulness': '#FEDC64'
  };
  return colors[serviceId] || '#9EFAFF';
};

interface ClientProposalBuilderProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Preset {
  appointments: number;
  eventTime: number;
  pros: number;
  price: number;
  name?: string;
  popular?: boolean;
}

interface EventConfig {
  id: string;
  service: string;
  packageIndex: number;
  preset: Preset | null;
  mode: 'package' | 'custom';
  location: string;
  customConfig?: {
    eventTime: number;
    pros: number;
    // appointments is calculated, not stored
  };
}

const ClientProposalBuilder: React.FC<ClientProposalBuilderProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventConfig[]>([
    { id: '1', service: 'massage', packageIndex: 1, preset: null, mode: 'package', location: 'Main Office' }
  ]);
  const [locations, setLocations] = useState<string[]>(['Main Office']);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [history, setHistory] = useState<EventConfig[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [editingLocation, setEditingLocation] = useState<string | null>(null);
  const [locationEditValue, setLocationEditValue] = useState('');

  // Load draft from localStorage on mount
  useEffect(() => {
    if (isOpen) {
      const savedDraft = localStorage.getItem('proposalBuilderDraft');
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          setEvents(draft.events || [{ id: '1', service: 'massage', packageIndex: 1, preset: null, mode: 'package' }]);
          setClientName(draft.clientName || '');
          setClientEmail(draft.clientEmail || '');
          setCompanyName(draft.companyName || '');
        } catch (e) {
          console.error('Error loading draft:', e);
        }
      } else {
        setEvents([{ id: '1', service: 'massage', packageIndex: 1, preset: null, mode: 'package', location: 'Main Office' }]);
        setLocations(['Main Office']);
        setClientName('');
        setClientEmail('');
        setCompanyName('');
      }
      setCurrentEventIndex(0);
      setError(null);
      setShowPreview(false);
      setHistory([]);
      setHistoryIndex(-1);
    }
  }, [isOpen]);

  // Auto-save draft to localStorage
  useEffect(() => {
    if (isOpen && (events.length > 0 || clientName || clientEmail || companyName)) {
      const draft = {
        events,
        clientName,
        clientEmail,
        companyName,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('proposalBuilderDraft', JSON.stringify(draft));
    }
  }, [events, clientName, clientEmail, companyName, isOpen]);

  // Update preset for current event
  const currentEvent = events[currentEventIndex];
  const currentPreset = currentEvent && currentEvent.mode === 'package'
    ? SERVICE_PRESETS[currentEvent.service as keyof typeof SERVICE_PRESETS]?.[currentEvent.packageIndex] || null
    : null;

  // Calculate appointments from hours and pros
  const calculateAppointments = (service: string, eventTime: number, pros: number): number => {
    const defaults = SERVICE_DEFAULTS[service] || SERVICE_DEFAULTS.massage;
    const appTime = defaults.appTime || 20; // minutes per appointment
    
    // Calculate: (hours * 60 minutes / appTime per appointment) * numPros
    const appointmentsPerHourPerPro = 60 / appTime;
    const totalAppointmentsPerHour = appointmentsPerHourPerPro * pros;
    const totalAppointments = Math.floor(eventTime * totalAppointmentsPerHour);
    
    return totalAppointments;
  };

  // Calculate custom preset if in custom mode
  const calculateCustomPreset = (event: EventConfig): Preset | null => {
    if (event.mode !== 'custom' || !event.customConfig) return null;
    
    const defaults = SERVICE_DEFAULTS[event.service] || SERVICE_DEFAULTS.massage;
    const { eventTime, pros } = event.customConfig;
    
    // Calculate appointments automatically from hours and pros
    const appointments = calculateAppointments(event.service, eventTime, pros);
    
    // Calculate price based on service type
    let price = 0;
    if (event.service === 'mindfulness') {
      // Mindfulness uses fixed pricing based on event time
      if (eventTime === 0.5) {
        price = 1225;
      } else if (eventTime === 1) {
        price = 1500;
      } else {
        price = 1350;
      }
    } else {
      // Calculate based on hours, pros, and hourly rate
      price = eventTime * defaults.hourlyRate * pros;
    }
    
    return {
      appointments,
      eventTime,
      pros,
      price: Math.round(price)
    };
  };

  // Get effective preset (package or custom) - must be defined before calculateTotals
  const getEffectivePreset = (event: EventConfig): Preset | null => {
    if (event.mode === 'package') {
      const preset = SERVICE_PRESETS[event.service as keyof typeof SERVICE_PRESETS]?.[event.packageIndex];
      return preset ? { ...preset } : null;
    } else {
      return calculateCustomPreset(event);
    }
  };

  const currentCustomPreset = currentEvent && currentEvent.mode === 'custom'
    ? calculateCustomPreset(currentEvent)
    : null;

  // Update preset in events array
  useEffect(() => {
    if (currentEvent) {
      if (currentEvent.mode === 'package' && currentPreset) {
        setEvents(prev => prev.map((event, idx) => 
          idx === currentEventIndex 
            ? { ...event, preset: currentPreset }
            : event
        ));
      } else if (currentEvent.mode === 'custom') {
        const customPreset = calculateCustomPreset(currentEvent);
        if (customPreset) {
          setEvents(prev => prev.map((event, idx) => 
            idx === currentEventIndex 
              ? { ...event, preset: customPreset }
              : event
          ));
        }
      }
    }
  }, [currentPreset, currentCustomPreset, currentEventIndex, currentEvent]);

  // Calculate totals across all events
  const calculateTotals = () => {
    const totals = {
      totalAppointments: 0,
      totalCost: 0,
      totalEvents: events.length,
      eventCounts: [] as number[],
      eventCosts: [] as number[],
      uniqueLocations: new Set<string>()
    };

    events.forEach(event => {
      const preset = getEffectivePreset(event);
      if (preset) {
        totals.totalAppointments += preset.appointments;
        totals.totalCost += preset.price;
        totals.eventCounts.push(preset.appointments);
        totals.eventCosts.push(preset.price);
        totals.uniqueLocations.add(event.location);
      } else {
        totals.eventCounts.push(0);
        totals.eventCosts.push(0);
      }
    });

    // Apply discount based on total events (across all locations)
    // 4 events = 15% discount, 9+ events = 20% discount
    let discountPercent = 0;
    if (totals.totalEvents >= 9) {
      discountPercent = 20;
    } else if (totals.totalEvents >= 4) {
      discountPercent = 15;
    }
    
    const discountAmount = totals.totalCost * (discountPercent / 100);
    const finalCost = totals.totalCost - discountAmount;

    return {
      ...totals,
      discountPercent,
      discountAmount,
      finalCost,
      locationCount: totals.uniqueLocations.size
    };
  };

  const totals = calculateTotals();

  // Save state to history for undo/redo
  const saveToHistory = (newEvents: EventConfig[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(newEvents))); // Deep copy
      return newHistory.slice(-50); // Keep last 50 states
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  };

  // Undo function
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setEvents(JSON.parse(JSON.stringify(prevState)));
      setHistoryIndex(prev => prev - 1);
    }
  };

  // Redo function
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setEvents(JSON.parse(JSON.stringify(nextState)));
      setHistoryIndex(prev => prev + 1);
    }
  };

  // Add new event (no max limit, but show progress toward 9)
  const addEvent = () => {
    const newEvent: EventConfig = {
      id: String(events.length + 1),
      service: 'massage',
      packageIndex: 1,
      preset: null,
      mode: 'package',
      location: locations[0] || 'Main Office'
    };
    const newEvents = [...events, newEvent];
    saveToHistory(newEvents);
    setEvents(newEvents);
    setCurrentEventIndex(events.length);
  };

  // Toggle mode for current event
  const toggleEventMode = (mode: 'package' | 'custom') => {
    const newEvents = events.map((event, idx) => 
      idx === currentEventIndex 
        ? { 
            ...event, 
            mode,
            // Initialize custom config if switching to custom mode
            customConfig: mode === 'custom' && !event.customConfig
              ? { eventTime: 4, pros: 4 } // No appointments - will be calculated
              : event.customConfig,
            preset: null // Reset preset when switching modes
          }
        : event
    );
    saveToHistory(newEvents);
    setEvents(newEvents);
  };

  // Update custom config for current event (only eventTime and pros)
  const updateCustomConfig = (field: 'eventTime' | 'pros', value: number) => {
    const newEvents = events.map((event, idx) => 
      idx === currentEventIndex 
        ? { 
            ...event, 
            customConfig: {
              ...(event.customConfig || { eventTime: 4, pros: 4 }),
              [field]: value
            },
            preset: null // Reset preset to recalculate (appointments will be auto-calculated)
          }
        : event
    );
    saveToHistory(newEvents);
    setEvents(newEvents);
  };

  // Remove event
  const removeEvent = (index: number) => {
    if (events.length <= 1) return;
    const newEvents = events.filter((_, idx) => idx !== index);
    saveToHistory(newEvents);
    setEvents(newEvents);
    if (currentEventIndex >= newEvents.length) {
      setCurrentEventIndex(newEvents.length - 1);
    }
  };

  // Update current event service
  const updateCurrentEventService = (service: string) => {
    const newEvents = events.map((event, idx) => 
      idx === currentEventIndex 
        ? { 
            ...event, 
            service, 
            packageIndex: 1, 
            preset: null,
            // Reset custom config when changing service
            customConfig: event.mode === 'custom' 
              ? { eventTime: 4, pros: 4 } // Appointments will be calculated
              : event.customConfig
          }
        : event
    );
    saveToHistory(newEvents);
    setEvents(newEvents);
  };

  // Update current event package
  const updateCurrentEventPackage = (packageIndex: number) => {
    const newEvents = events.map((event, idx) => 
      idx === currentEventIndex 
        ? { ...event, packageIndex, preset: null }
        : event
    );
    saveToHistory(newEvents);
    setEvents(newEvents);
  };

  // Update current event location
  const updateCurrentEventLocation = (location: string) => {
    const newEvents = events.map((event, idx) => 
      idx === currentEventIndex 
        ? { ...event, location }
        : event
    );
    saveToHistory(newEvents);
    setEvents(newEvents);
    
    // Add location to locations list if new
    if (!locations.includes(location)) {
      setLocations([...locations, location]);
    }
  };

  // Add new location
  const addLocation = () => {
    const newLocation = `Location ${locations.length + 1}`;
    setLocations([...locations, newLocation]);
    // Update current event to use new location
    updateCurrentEventLocation(newLocation);
  };

  // Edit location name
  const startEditingLocation = (location: string) => {
    setEditingLocation(location);
    setLocationEditValue(location);
  };

  const saveLocationEdit = () => {
    if (!editingLocation || !locationEditValue.trim()) return;
    
    const newLocations = locations.map(loc => 
      loc === editingLocation ? locationEditValue.trim() : loc
    );
    setLocations(newLocations);
    
    // Update all events using this location
    const newEvents = events.map(event => 
      event.location === editingLocation 
        ? { ...event, location: locationEditValue.trim() }
        : event
    );
    saveToHistory(newEvents);
    setEvents(newEvents);
    
    setEditingLocation(null);
    setLocationEditValue('');
  };

  const cancelLocationEdit = () => {
    setEditingLocation(null);
    setLocationEditValue('');
  };

  // Calculate service data from preset for a given event
  const calculateServiceData = (event: EventConfig) => {
    const effectivePreset = getEffectivePreset(event);
    if (!effectivePreset) return null;

    const defaults = SERVICE_DEFAULTS[event.service] || SERVICE_DEFAULTS.massage;
    
    // For mindfulness, use fixed price
    if (event.service === 'mindfulness') {
      // Determine mindfulness type based on event time
      let mindfulnessType = 'intro';
      let classLength = 40;
      
      if (effectivePreset.eventTime === 0.5) {
        classLength = 30;
        mindfulnessType = 'drop-in';
      } else if (effectivePreset.eventTime === 1) {
        classLength = 60;
        mindfulnessType = 'mindful-movement';
      }
      
      const serviceData = {
        serviceType: event.service,
        totalHours: effectivePreset.eventTime,
        numPros: effectivePreset.pros,
        appTime: defaults.appTime,
        hourlyRate: defaults.hourlyRate,
        proHourly: defaults.proHourly,
        earlyArrival: defaults.earlyArrival,
        retouchingCost: defaults.retouchingCost,
        discountPercent: 0,
        date: 'TBD',
        fixedPrice: effectivePreset.price,
        classLength: classLength,
        participants: defaults.participants || 'unlimited',
        mindfulnessType: mindfulnessType
      };

      // Calculate results for consistency
      const results = calculateServiceResults(serviceData);
      return {
        ...serviceData,
        totalAppointments: results.totalAppointments,
        serviceCost: results.serviceCost
      };
    }

    // For other services, calculate based on preset
    const serviceData = {
      serviceType: event.service,
      totalHours: effectivePreset.eventTime,
      numPros: effectivePreset.pros,
      appTime: defaults.appTime,
      hourlyRate: defaults.hourlyRate,
      proHourly: defaults.proHourly,
      earlyArrival: defaults.earlyArrival,
      retouchingCost: defaults.retouchingCost,
      discountPercent: 0,
      date: 'TBD'
    };

    // Calculate actual results to verify
    const results = calculateServiceResults(serviceData);
    return {
      ...serviceData,
      totalAppointments: results.totalAppointments,
      serviceCost: results.serviceCost
    };
  };

  // Validate all events
  const validateEvents = (): string | null => {
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const preset = getEffectivePreset(event);
      
      if (!preset) {
        return `Event ${i + 1} is not fully configured. Please select a package or complete custom configuration.`;
      }
      
      if (event.mode === 'custom' && event.customConfig) {
        const { eventTime, pros } = event.customConfig;
        if (eventTime < 0.5 || eventTime > 12) {
          return `Event ${i + 1}: Event time must be between 0.5 and 12 hours.`;
        }
        if (pros < 1 || pros > 10) {
          return `Event ${i + 1}: Number of professionals must be between 1 and 10.`;
        }
        // Appointments are calculated automatically, so no need to validate them
      }
    }
    return null;
  };


  const handleGenerateProposal = async () => {
    if (!clientName.trim() || !clientEmail.trim()) {
      setError('Please fill in your name and email');
      return;
    }

    const validationError = validateEvents();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Calculate service data for all events
      // Discount: 4 events = 15%, 9+ events = 20%
      let discountPercent = 0;
      if (events.length >= 9) {
        discountPercent = 20;
      } else if (events.length >= 4) {
        discountPercent = 15;
      }
      
      const allServices = events.map(event => {
        const serviceData = calculateServiceData(event);
        if (!serviceData) {
          throw new Error(`Failed to calculate service data for event ${event.id}`);
        }
        // Apply discount if applicable
        if (discountPercent > 0) {
          serviceData.discountPercent = discountPercent;
          // Recalculate service cost with discount applied
          if (serviceData.serviceType === 'mindfulness' && 'fixedPrice' in serviceData) {
            // Mindfulness uses fixed price - apply discount
            const originalPrice = serviceData.fixedPrice || 0;
            serviceData.serviceCost = originalPrice * (1 - discountPercent / 100);
          } else {
            // Other services - calculateServiceResults will apply discount automatically
            const results = calculateServiceResults(serviceData);
            serviceData.serviceCost = results.serviceCost;
            serviceData.totalAppointments = results.totalAppointments;
          }
        }
        return serviceData;
      });

      // Group services by location
      const eventsByLocation: { [location: string]: any[] } = {};
      events.forEach((event, index) => {
        const location = event.location || 'Main Office';
        if (!eventsByLocation[location]) {
          eventsByLocation[location] = [];
        }
        eventsByLocation[location].push(allServices[index]);
      });

      // Create client data structure with all events grouped by location
      const locationEvents: { [location: string]: any[] } = {};
      Object.keys(eventsByLocation).forEach(location => {
        locationEvents[location] = eventsByLocation[location].map(service => ({
          services: [service]
        }));
      });

      const clientData = {
        name: clientName,
        locations: Object.keys(locationEvents),
        events: locationEvents
      };

      // Generate proposal data
      const proposalData = prepareProposalFromCalculation(clientData);
      
      // Add client email
      proposalData.clientEmail = clientEmail;

      // Create proposal in database
      const { data: proposal, error: proposalError } = await supabase
        .from('proposals')
        .insert({
          data: proposalData,
          client_name: clientName,
          client_email: clientEmail,
          proposal_type: 'event',
          status: 'draft',
          is_editable: true,
          change_source: 'client',
          // Mark as mock/client-generated
          notes: 'Mock proposal generated by client through proposal builder'
        })
        .select()
        .single();

      if (proposalError) {
        console.error('Error creating proposal:', proposalError);
        throw new Error('Failed to create proposal. Please try again.');
      }

      // Close modal and navigate to proposal
      onClose();
      navigate(`/proposal/${proposal.id}?shared=true`);
    } catch (err) {
      console.error('Error generating proposal:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate proposal. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle sharing with Shortcut (saves to admin section)
  const handleShareWithShortcut = async () => {
    if (!clientName.trim() || !clientEmail.trim()) {
      setError('Please fill in your name and email');
      return;
    }

    const validationError = validateEvents();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSharing(true);
    setError(null);

    try {
      // Calculate service data for all events
      let discountPercent = 0;
      if (events.length >= 9) {
        discountPercent = 20;
      } else if (events.length >= 4) {
        discountPercent = 15;
      }
      
      const allServices = events.map(event => {
        const serviceData = calculateServiceData(event);
        if (!serviceData) {
          throw new Error(`Failed to calculate service data for event ${event.id}`);
        }
        // Apply discount
        if (discountPercent > 0) {
          serviceData.discountPercent = discountPercent;
          if (serviceData.serviceType === 'mindfulness' && 'fixedPrice' in serviceData) {
            const originalPrice = serviceData.fixedPrice || 0;
            serviceData.serviceCost = originalPrice * (1 - discountPercent / 100);
          } else {
            const results = calculateServiceResults(serviceData);
            serviceData.serviceCost = results.serviceCost;
            serviceData.totalAppointments = results.totalAppointments;
          }
        }
        return serviceData;
      });

      // Group services by location
      const eventsByLocation: { [location: string]: any[] } = {};
      events.forEach((event, index) => {
        const location = event.location || 'Main Office';
        if (!eventsByLocation[location]) {
          eventsByLocation[location] = [];
        }
        eventsByLocation[location].push(allServices[index]);
      });

      const locationEvents: { [location: string]: any[] } = {};
      Object.keys(eventsByLocation).forEach(location => {
        locationEvents[location] = eventsByLocation[location].map(service => ({
          services: [service]
        }));
      });

      const clientData = {
        name: clientName,
        locations: Object.keys(locationEvents),
        events: locationEvents
      };

      // Generate proposal data
      const proposalData = prepareProposalFromCalculation(clientData);
      proposalData.clientEmail = clientEmail;

      // Create proposal marked for admin review (Share with Shortcut)
      const { error: proposalError } = await supabase
        .from('proposals')
        .insert({
          data: proposalData,
          client_name: clientName,
          client_email: clientEmail,
          proposal_type: 'event',
          status: 'draft',
          is_editable: true,
          change_source: 'client',
          pending_review: true, // Mark for admin review
          has_changes: true, // Indicates it needs review
          notes: `Shared with Shortcut from proposal builder. ${events.length} event${events.length !== 1 ? 's' : ''} across ${Object.keys(locationEvents).length} location${Object.keys(locationEvents).length !== 1 ? 's' : ''}.`
        })
        .select()
        .single();

      if (proposalError) {
        console.error('Error sharing proposal:', proposalError);
        throw new Error('Failed to share proposal. Please try again.');
      }

      // Clear draft from localStorage
      localStorage.removeItem('proposalBuilderDraft');

      // Show success and close
      setShowPreview(false);
      onClose();
      
      // Show success message (could be a toast notification)
      alert(`Thank you! Your proposal has been shared with Shortcut. We'll review it and get back to you soon.`);
    } catch (err) {
      console.error('Error sharing proposal:', err);
      setError(err instanceof Error ? err.message : 'Failed to share proposal. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  // Handle PDF download
  const handleDownloadPDF = async () => {
    const validationError = validateEvents();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsDownloading(true);
    setError(null);

    try {
      // Create a temporary preview element for PDF generation
      const previewContent = document.createElement('div');
      previewContent.id = 'proposal-preview-pdf';
      previewContent.style.position = 'absolute';
      previewContent.style.left = '-9999px';
      previewContent.style.width = '1200px';
      previewContent.style.backgroundColor = 'white';
      previewContent.style.padding = '48px';
      previewContent.style.fontFamily = "'Outfit', sans-serif";
      
      // Build preview HTML
      previewContent.innerHTML = `
        <div style="margin-bottom: 32px;">
          <h1 style="font-size: 48px; font-weight: 800; color: #003756; margin-bottom: 16px;">Quarterly Proposal Preview</h1>
          <p style="font-size: 18px; color: #003756; margin-bottom: 24px;">${clientName || 'Client Name'}</p>
          ${companyName ? `<p style="font-size: 16px; color: #6b7280;">${companyName}</p>` : ''}
        </div>
        <div style="margin-bottom: 32px;">
          <h2 style="font-size: 32px; font-weight: 800; color: #003756; margin-bottom: 16px;">Events Summary</h2>
          ${events.map((event, index) => {
            const preset = getEffectivePreset(event);
            if (!preset) return '';
            return `
              <div style="margin-bottom: 24px; padding: 24px; border: 2px solid #E5E7EB; border-radius: 16px;">
                <h3 style="font-size: 24px; font-weight: 800; color: #003756; margin-bottom: 8px;">Event ${index + 1}: ${getServiceName(event.service)}</h3>
                <p style="font-size: 14px; color: #6b7280; margin-bottom: 16px;">${event.location}</p>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
                  <div>
                    <p style="font-size: 12px; font-weight: 700; color: #003756; text-transform: uppercase; margin-bottom: 4px;">Appointments</p>
                    <p style="font-size: 24px; font-weight: 800; color: #003756;">${preset.appointments}</p>
                  </div>
                  <div>
                    <p style="font-size: 12px; font-weight: 700; color: #003756; text-transform: uppercase; margin-bottom: 4px;">Duration</p>
                    <p style="font-size: 24px; font-weight: 800; color: #003756;">${preset.eventTime} ${preset.eventTime === 1 ? 'hr' : 'hrs'}</p>
                  </div>
                  <div>
                    <p style="font-size: 12px; font-weight: 700; color: #003756; text-transform: uppercase; margin-bottom: 4px;">Cost</p>
                    <p style="font-size: 24px; font-weight: 800; color: #003756;">$${preset.price.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <div style="margin-top: 48px; padding: 32px; background: linear-gradient(to bottom right, #9EFAFF10, #9EFAFF05); border: 2px solid #9EFAFF30; border-radius: 16px;">
          <h2 style="font-size: 32px; font-weight: 800; color: #003756; margin-bottom: 24px;">Quarterly Summary</h2>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin-bottom: 24px;">
            <div>
              <p style="font-size: 12px; font-weight: 700; color: #003756; text-transform: uppercase; margin-bottom: 8px;">Total Events</p>
              <p style="font-size: 36px; font-weight: 800; color: #003756;">${totals.totalEvents}</p>
            </div>
            <div>
              <p style="font-size: 12px; font-weight: 700; color: #003756; text-transform: uppercase; margin-bottom: 8px;">Total Appointments</p>
              <p style="font-size: 36px; font-weight: 800; color: #003756;">${totals.totalAppointments}</p>
            </div>
          </div>
          <div style="padding-top: 24px; border-top: 2px solid #E5E7EB;">
            <p style="font-size: 12px; font-weight: 700; color: #003756; text-transform: uppercase; margin-bottom: 8px;">Subtotal</p>
            <p style="font-size: 32px; font-weight: 800; color: #003756;">$${totals.totalCost.toLocaleString()}</p>
          </div>
          ${totals.discountPercent > 0 ? `
            <div style="margin-top: 24px; padding-top: 24px; border-top: 2px solid #E5E7EB;">
              <p style="font-size: 12px; font-weight: 700; color: #FF5050; text-transform: uppercase; margin-bottom: 8px;">Discount (${totals.discountPercent}%)</p>
              <p style="font-size: 24px; font-weight: 800; color: #FF5050;">-$${totals.discountAmount.toLocaleString()}</p>
            </div>
            <div style="margin-top: 24px; padding: 24px; background: #003756; border-radius: 12px;">
              <p style="font-size: 12px; font-weight: 700; color: #9EFAFF; text-transform: uppercase; margin-bottom: 8px;">Total Cost</p>
              <p style="font-size: 48px; font-weight: 800; color: #9EFAFF;">$${totals.finalCost.toLocaleString()}</p>
            </div>
          ` : ''}
        </div>
      `;
      
      document.body.appendChild(previewContent);
      
      // Generate PDF
      const filename = `${clientName.replace(/\s+/g, '-').toLowerCase()}-quarterly-proposal.pdf`;
      await generatePDF('proposal-preview-pdf', filename);
      
      // Clean up
      document.body.removeChild(previewContent);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      setError('Failed to download PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Z for undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y for redo
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
      // Escape to close
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, historyIndex, history.length]);

  if (!isOpen) return null;

  const currentEventService = currentEvent?.service || 'massage';
  const presets = SERVICE_PRESETS[currentEventService as keyof typeof SERVICE_PRESETS] || [];
  const serviceColor = getServiceColor(currentEventService);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4"
      onClick={onClose}
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      <div 
        className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl touch-pan-y"
        onClick={(e) => e.stopPropagation()}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b-2 border-shortcut-teal border-opacity-20 px-8 py-6 flex justify-between items-center z-10">
          <div>
            <h2 className="h1 mb-2" style={{ color: '#003756' }}>
              Build Your Quarterly Proposal
            </h2>
            <p className="text-base lg:text-lg font-medium max-w-2xl" style={{ color: '#003756', lineHeight: '1.1', letterSpacing: '-0.01em' }}>
              Build your quarterly proposal and unlock savings: 15% off for 4 events, 20% off for 9+ events
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Undo/Redo buttons */}
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-2 rounded-lg hover:bg-neutral-light-gray transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Undo"
              title="Undo (Cmd/Ctrl+Z)"
            >
              <Undo2 size={20} className="text-shortcut-blue" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 rounded-lg hover:bg-neutral-light-gray transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Redo"
              title="Redo (Cmd/Ctrl+Shift+Z)"
            >
              <Redo2 size={20} className="text-shortcut-blue" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-neutral-light-gray transition-colors"
              aria-label="Close"
            >
              <X size={24} className="text-shortcut-blue" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-8">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
              <p className="text-sm font-bold text-red-700">{error}</p>
            </div>
          )}

          {/* Events List & Summary Sidebar */}
          <div className="grid md:grid-cols-3 gap-6 md:gap-8 mb-8">
            {/* Left: Events List */}
            <div className="md:col-span-2 space-y-4">
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-extrabold" style={{ color: '#003756' }}>
                    Your Events ({events.length})
                  </h3>
                  <button
                    onClick={addEvent}
                    className="px-4 py-2 rounded-full font-bold text-sm border-2 transition-all hover:bg-shortcut-blue hover:text-white"
                    style={{ 
                      borderColor: '#003756', 
                      color: '#003756', 
                      backgroundColor: 'transparent' 
                    }}
                  >
                    + Add Event
                  </button>
                </div>
                
                {/* Progress Bar for Discount Milestones */}
                <div className="space-y-3">
                  {/* 4 Events Progress (15% discount) */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold" style={{ color: '#003756' }}>
                        4 Events = 15% Discount
                      </span>
                      <span className="text-sm font-extrabold" style={{ color: events.length >= 4 ? '#FF5050' : '#6b7280' }}>
                        {Math.min(events.length, 4)}/4
                      </span>
                    </div>
                    <div className="w-full h-3 bg-neutral-light-gray rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all duration-500 rounded-full"
                        style={{ 
                          width: `${Math.min((events.length / 4) * 100, 100)}%`,
                          backgroundColor: events.length >= 4 ? '#FF5050' : '#003756'
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* 9 Events Progress (20% discount) */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold" style={{ color: '#003756' }}>
                        9 Events = 20% Discount
                      </span>
                      <span className="text-sm font-extrabold" style={{ color: events.length >= 9 ? '#FF5050' : '#6b7280' }}>
                        {Math.min(events.length, 9)}/9
                      </span>
                    </div>
                    <div className="w-full h-3 bg-neutral-light-gray rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all duration-500 rounded-full"
                        style={{ 
                          width: `${Math.min((events.length / 9) * 100, 100)}%`,
                          backgroundColor: events.length >= 9 ? '#FF5050' : '#003756'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Cards */}
              {events.map((event, index) => {
                const eventColor = getServiceColor(event.service);
                const isActive = index === currentEventIndex;
                
                return (
                  <div
                    key={event.id}
                    className={`card-small cursor-pointer transition-all ${
                      isActive ? 'ring-2 ring-offset-2' : ''
                    }`}
                    style={{
                      borderColor: isActive ? eventColor : undefined,
                      borderWidth: isActive ? '2px' : undefined,
                      backgroundColor: isActive ? `${eventColor}15` : undefined,
                    }}
                    onClick={() => setCurrentEventIndex(index)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-lg font-extrabold" style={{ color: '#003756' }}>
                            Event {index + 1}
                          </span>
                          {event.preset && (
                            <span 
                              className="text-xs px-3 py-1 rounded-full font-bold"
                              style={{ backgroundColor: eventColor, color: '#003756' }}
                            >
                              {getServiceName(event.service)}
                            </span>
                          )}
                        </div>
                        {event.preset ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ 
                                backgroundColor: event.mode === 'custom' ? '#FEDC64' : eventColor,
                                color: '#003756'
                              }}>
                                {event.mode === 'custom' ? 'Custom' : 'Package'}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-neutral-light-gray" style={{ color: '#003756' }}>
                                📍 {event.location}
                              </span>
                            </div>
                            <div className="text-base font-semibold" style={{ color: '#003756' }}>
                              {event.preset.appointments} {event.preset.appointments === 1 ? 'appointment' : 'appointments'}
                            </div>
                            <div className="text-lg font-extrabold" style={{ color: '#003756' }}>
                              ${event.preset.price.toLocaleString()}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm font-medium" style={{ color: '#6b7280' }}>
                            {event.mode === 'custom' ? 'Configure custom settings' : 'Select service and package'}
                          </div>
                        )}
                      </div>
                      {events.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeEvent(index);
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors ml-4 flex-shrink-0"
                          aria-label="Remove event"
                        >
                          <X size={18} className="text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: Running Summary */}
            <div className="md:col-span-1">
              <div className="md:sticky md:top-24 card-medium">
                <h3 className="text-xl font-extrabold mb-6" style={{ color: '#003756' }}>
                  Quarterly Summary
                </h3>
                <div className="space-y-6">
                  <div className="p-6 bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 rounded-xl border-2 border-shortcut-teal border-opacity-30">
                    <p className="text-xs font-bold text-shortcut-blue mb-3 uppercase tracking-wider">Total Events</p>
                    <p className="text-3xl font-extrabold text-shortcut-navy-blue">
                      {totals.totalEvents}
                    </p>
                    {totals.locationCount > 1 && (
                      <p className="text-xs font-medium mt-2" style={{ color: '#6b7280' }}>
                        Across {totals.locationCount} location{totals.locationCount !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <div className="p-6 bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 rounded-xl border-2 border-shortcut-teal border-opacity-30">
                    <p className="text-xs font-bold text-shortcut-blue mb-3 uppercase tracking-wider">Total Appointments</p>
                    <p className="text-3xl font-extrabold text-shortcut-navy-blue">
                      {totals.totalAppointments}
                    </p>
                  </div>
                  <div className="p-6 bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 rounded-xl border-2 border-shortcut-teal border-opacity-30">
                    <p className="text-xs font-bold text-shortcut-blue mb-3 uppercase tracking-wider">Subtotal</p>
                    <p className="text-3xl font-extrabold text-shortcut-navy-blue">
                      ${totals.totalCost.toLocaleString()}
                    </p>
                  </div>
                  {totals.discountPercent > 0 && (
                    <>
                      <div className="p-6 bg-gradient-to-br from-shortcut-coral/10 to-shortcut-coral/5 rounded-xl border-2 border-shortcut-coral border-opacity-30">
                        <p className="text-xs font-bold text-shortcut-coral mb-3 uppercase tracking-wider">
                          Quarterly Discount ({totals.discountPercent}%)
                        </p>
                        <p className="text-2xl font-extrabold text-shortcut-coral">
                          -${totals.discountAmount.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-6 bg-gradient-to-br from-shortcut-navy-blue to-shortcut-dark-blue rounded-xl border-2 border-shortcut-teal border-opacity-30">
                        <p className="text-xs font-bold text-white mb-3 uppercase tracking-wider">Total Cost</p>
                        <p className="text-4xl font-extrabold text-shortcut-teal">
                          ${totals.finalCost.toLocaleString()}
                        </p>
                      </div>
                    </>
                  )}
                  {totals.totalEvents < 4 && (
                    <div className="p-4 bg-gradient-to-br from-shortcut-service-yellow/20 to-shortcut-service-yellow/10 rounded-xl border-2 border-shortcut-service-yellow border-opacity-30">
                      <p className="text-xs font-bold text-center" style={{ color: '#003756' }}>
                        Add {4 - totals.totalEvents} more event{4 - totals.totalEvents !== 1 ? 's' : ''} to unlock 15% savings
                      </p>
                    </div>
                  )}
                  {totals.totalEvents >= 4 && totals.totalEvents < 9 && (
                    <div className="p-4 bg-gradient-to-br from-shortcut-service-yellow/20 to-shortcut-service-yellow/10 rounded-xl border-2 border-shortcut-service-yellow border-opacity-30">
                      <p className="text-xs font-bold text-center" style={{ color: '#003756' }}>
                        Add {9 - totals.totalEvents} more event{9 - totals.totalEvents !== 1 ? 's' : ''} to unlock 20% savings
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Current Event Configuration */}
          {currentEvent && (
            <>
              {/* Step 1: Service Selection for Current Event */}
              <div className="mb-8">
                <h3 className="text-xl font-extrabold mb-6" style={{ color: '#003756' }}>
                  Configure Event {currentEventIndex + 1}
                </h3>
                
                {/* Mode Toggle */}
                <div className="mb-6">
                  <div className="flex gap-4 p-1 bg-neutral-light-gray rounded-xl inline-flex">
                    <button
                      onClick={() => toggleEventMode('package')}
                      className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${
                        currentEvent.mode === 'package'
                          ? 'bg-white shadow-md text-shortcut-blue'
                          : 'text-text-dark-60'
                      }`}
                    >
                      Package Mode
                    </button>
                    <button
                      onClick={() => toggleEventMode('custom')}
                      className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${
                        currentEvent.mode === 'custom'
                          ? 'bg-white shadow-md text-shortcut-blue'
                          : 'text-text-dark-60'
                      }`}
                    >
                      Custom Mode
                    </button>
                  </div>
                </div>

                <h4 className="text-lg font-extrabold mb-4" style={{ color: '#003756' }}>
                  1. Choose Service
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
                  {[
                    { id: 'massage', name: 'Massage', icon: '💆‍♀️' },
                    { id: 'hair-makeup', name: 'Glam', icon: '✨' },
                    { id: 'headshot', name: 'Headshots', icon: '📸' },
                    { id: 'nails', name: 'Nails', icon: '💅' },
                    { id: 'mindfulness', name: 'Mindfulness', icon: '🧘‍♀️' }
                  ].map((service) => {
                    const svcColor = getServiceColor(service.id);
                    return (
                      <button
                        key={service.id}
                        onClick={() => updateCurrentEventService(service.id)}
                        className={`card-small text-center transition-all duration-300 ${
                          currentEventService === service.id 
                            ? 'ring-2 ring-offset-2' 
                            : ''
                        }`}
                        style={{
                          backgroundColor: currentEventService === service.id ? `${svcColor}20` : undefined,
                          borderColor: currentEventService === service.id ? svcColor : undefined,
                          borderWidth: currentEventService === service.id ? '2px' : undefined,
                        }}
                      >
                        <div className="text-3xl mb-3">{service.icon}</div>
                        <div className="font-extrabold text-base" style={{ color: '#003756' }}>{service.name}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Package or Custom Configuration */}
              <div className="mb-8">
                {currentEvent.mode === 'package' ? (
                  <>
                    <h4 className="text-lg font-extrabold mb-4" style={{ color: '#003756' }}>
                      2. Select Package
                    </h4>
                    <div className="grid md:grid-cols-3 gap-6">
                  {presets.map((preset, index) => (
                    <div key={index} className="relative">
                      {(preset as any).popular && (
                        <div className="absolute -top-3 -right-3 bg-gradient-to-r from-[#FF5050] to-[#175071] text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg z-20">
                          MOST POPULAR
                        </div>
                      )}
                      <button
                        onClick={() => updateCurrentEventPackage(index)}
                        className={`relative card-small text-center transition-all duration-300 ${
                          currentEvent.packageIndex === index 
                            ? 'ring-2 ring-offset-2' 
                            : ''
                        }`}
                        style={{
                          borderColor: currentEvent.packageIndex === index ? serviceColor : undefined,
                          borderWidth: currentEvent.packageIndex === index ? '2px' : undefined,
                          backgroundColor: currentEvent.packageIndex === index ? `${serviceColor}15` : undefined,
                        }}
                      >
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-xl font-extrabold mb-2" style={{ color: '#003756' }}>
                            {(preset as any).name || `${preset.appointments} Appointments`}
                          </h4>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-center gap-2 text-sm font-medium" style={{ color: '#003756' }}>
                            <span>⏱️</span>
                            <span>{preset.eventTime} {preset.eventTime === 1 ? 'hour' : 'hours'}</span>
                          </div>
                          <div className="flex items-center justify-center gap-2 text-sm font-medium" style={{ color: '#003756' }}>
                            <span>👥</span>
                            <span>{preset.pros} {getServiceName(currentEventService).toLowerCase()} {preset.pros === 1 ? 'pro' : 'pros'}</span>
                          </div>
                        </div>
                        <div className="pt-4 border-t-2 border-shortcut-teal border-opacity-20">
                          <div className="text-3xl font-extrabold mb-1" style={{ color: '#003756' }}>
                            ${preset.price.toLocaleString()}
                          </div>
                          <div className="text-sm font-medium" style={{ color: '#6b7280' }}>
                            per session
                          </div>
                        </div>
                      </div>
                      </button>
                    </div>
                  ))}
                    </div>
                  </>
                ) : (
                  <>
                    <h4 className="text-lg font-extrabold mb-4" style={{ color: '#003756' }}>
                      2. Custom Configuration
                    </h4>
                    <div className="card-medium space-y-6">
                      {/* Event Time */}
                      <div>
                        <label className="block text-sm font-bold mb-3 text-shortcut-blue">
                          Event Duration (hours)
                        </label>
                        <div className="space-y-2">
                          <input
                            type="range"
                            min="0.5"
                            max="12"
                            step="0.5"
                            value={currentEvent.customConfig?.eventTime || 4}
                            onChange={(e) => updateCustomConfig('eventTime', parseFloat(e.target.value))}
                            className="w-full h-3 md:h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-shortcut-teal touch-manipulation"
                            style={{ WebkitAppearance: 'none', touchAction: 'pan-y' }}
                          />
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-text-dark-60">0.5</span>
                            <span className="text-lg font-extrabold text-shortcut-navy-blue">
                              {currentEvent.customConfig?.eventTime || 4} {currentEvent.customConfig?.eventTime === 1 ? 'hour' : 'hours'}
                            </span>
                            <span className="text-sm font-medium text-text-dark-60">12</span>
                          </div>
                        </div>
                      </div>

                      {/* Number of Professionals */}
                      <div>
                        <label className="block text-sm font-bold mb-3 text-shortcut-blue">
                          Number of Professionals
                        </label>
                        <div className="space-y-2">
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={currentEvent.customConfig?.pros || 4}
                            onChange={(e) => updateCustomConfig('pros', parseInt(e.target.value))}
                            className="w-full h-3 md:h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-shortcut-teal touch-manipulation"
                            style={{ WebkitAppearance: 'none', touchAction: 'pan-y' }}
                          />
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-text-dark-60">1</span>
                            <span className="text-lg font-extrabold text-shortcut-navy-blue">
                              {currentEvent.customConfig?.pros || 4} {currentEvent.customConfig?.pros === 1 ? 'professional' : 'professionals'}
                            </span>
                            <span className="text-sm font-medium text-text-dark-60">10</span>
                          </div>
                        </div>
                      </div>

                      {/* Calculated Appointments (Display Only) */}
                      {currentCustomPreset && (
                        <div className="p-4 bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 rounded-xl border-2 border-shortcut-teal border-opacity-30">
                          <p className="text-xs font-bold text-shortcut-blue mb-2 uppercase tracking-wider">Calculated Appointments</p>
                          <p className="text-2xl font-extrabold text-shortcut-navy-blue">
                            {currentCustomPreset.appointments} {currentCustomPreset.appointments === 1 ? 'appointment' : 'appointments'}
                          </p>
                          <p className="text-xs font-medium text-text-dark-60 mt-2">
                            Based on {currentCustomPreset.eventTime} {currentCustomPreset.eventTime === 1 ? 'hour' : 'hours'} × {currentCustomPreset.pros} {currentCustomPreset.pros === 1 ? 'professional' : 'professionals'}
                          </p>
                        </div>
                      )}

                      {/* Estimated Cost */}
                      {currentCustomPreset && (
                        <div className="pt-4 border-t-2 border-shortcut-teal border-opacity-20">
                          <div className="p-4 bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 rounded-xl border-2 border-shortcut-teal border-opacity-30">
                            <p className="text-xs font-bold text-shortcut-blue mb-3 uppercase tracking-wider">Estimated Cost</p>
                            <p className="text-3xl font-extrabold text-shortcut-navy-blue">
                              ${currentCustomPreset.price.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* Step 3: Location Selection */}
          {currentEvent && (
            <div className="mb-8">
              <h4 className="text-lg font-extrabold mb-4" style={{ color: '#003756' }}>
                3. Select Location for Event {currentEventIndex + 1}
              </h4>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-3">
                  {locations.map((location) => (
                    <div key={location} className="relative group">
                      {editingLocation === location ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={locationEditValue}
                            onChange={(e) => setLocationEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                saveLocationEdit();
                              } else if (e.key === 'Escape') {
                                cancelLocationEdit();
                              }
                            }}
                            className="px-4 py-2 rounded-xl border-2 border-shortcut-blue focus:outline-none focus:ring-2 focus:ring-shortcut-teal font-bold text-sm"
                            style={{ color: '#003756' }}
                            autoFocus
                          />
                          <button
                            onClick={saveLocationEdit}
                            className="px-3 py-2 rounded-lg bg-shortcut-blue text-white font-bold text-sm hover:opacity-90"
                          >
                            ✓
                          </button>
                          <button
                            onClick={cancelLocationEdit}
                            className="px-3 py-2 rounded-lg bg-gray-200 text-shortcut-blue font-bold text-sm hover:opacity-90"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => updateCurrentEventLocation(location)}
                            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all border-2 ${
                              currentEvent.location === location
                                ? 'bg-shortcut-blue text-white border-shortcut-blue'
                                : 'bg-white text-shortcut-blue border-shortcut-blue border-opacity-30 hover:border-opacity-60'
                            }`}
                          >
                            📍 {location}
                          </button>
                          <button
                            onClick={() => startEditingLocation(location)}
                            className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-shortcut-blue text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-shortcut-dark-blue"
                            title="Edit location name"
                          >
                            ✎
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addLocation}
                    className="px-6 py-3 rounded-xl font-bold text-sm transition-all border-2 border-dashed border-shortcut-blue border-opacity-30 hover:border-opacity-60 text-shortcut-blue"
                  >
                    + Add Location
                  </button>
                </div>
                {locations.length > 0 && (
                  <div className="mt-4 p-4 bg-neutral-light-gray rounded-xl">
                    <p className="text-xs font-medium" style={{ color: '#6b7280' }}>
                      💡 Tip: Events across different locations count toward your discount total.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Contact Information */}
          <div className="mb-8">
            <div className="card-medium">
              <h3 className="text-xl font-extrabold mb-6" style={{ color: '#003756' }}>
                4. Your Information
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold mb-2 text-shortcut-blue">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal font-medium transition-all"
                    placeholder="John Doe"
                    style={{ color: '#003756' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 text-shortcut-blue">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal font-medium transition-all"
                    placeholder="john@company.com"
                    style={{ color: '#003756' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 text-shortcut-blue">
                    Company Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal font-medium transition-all"
                    placeholder="Acme Corp"
                    style={{ color: '#003756' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={onClose}
              className="px-6 py-4 rounded-full font-bold text-base border-2 transition-all"
              style={{ 
                borderColor: '#003756', 
                color: '#003756', 
                backgroundColor: 'transparent' 
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading || !clientName.trim() || !clientEmail.trim()}
              className="px-6 py-4 rounded-full font-bold text-base border-2 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                borderColor: '#9EFAFF', 
                color: '#003756', 
                backgroundColor: '#9EFAFF' 
              }}
            >
              {isDownloading ? (
                <>
                  <Sparkles className="animate-spin" size={20} />
                  Downloading...
                </>
              ) : (
                <>
                  <Download size={20} />
                  Download PDF
                </>
              )}
            </button>
            <button
              onClick={handleShareWithShortcut}
              disabled={isSharing || !clientName.trim() || !clientEmail.trim()}
              className="px-6 py-4 rounded-full font-bold text-base border-2 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                borderColor: '#FF5050', 
                color: '#FFFFFF', 
                backgroundColor: '#FF5050' 
              }}
            >
              {isSharing ? (
                <>
                  <Sparkles className="animate-spin" size={20} />
                  Sharing...
                </>
              ) : (
                <>
                  <Share2 size={20} />
                  Share with Shortcut
                </>
              )}
            </button>
            <button
              onClick={handleGenerateProposal}
              disabled={isGenerating || !clientName.trim() || !clientEmail.trim()}
              className="px-6 py-4 rounded-full font-bold text-base shadow-soft hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                backgroundColor: '#003756', 
                color: '#FFFFFF' 
              }}
            >
              {isGenerating ? (
                <>
                  <Sparkles className="animate-spin" size={20} />
                  Generating...
                </>
              ) : (
                <>
                  <CheckCircle2 size={20} />
                  Generate Proposal
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[300] p-4"
          onClick={() => setShowPreview(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b-2 border-shortcut-teal border-opacity-20 px-8 py-6 flex justify-between items-center z-10">
              <h2 className="h1" style={{ color: '#003756' }}>Proposal Preview</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 rounded-lg hover:bg-neutral-light-gray transition-colors"
              >
                <X size={24} className="text-shortcut-blue" />
              </button>
            </div>
            
            <div className="px-8 py-8">
              <div className="card-medium mb-6">
                <h3 className="text-xl font-extrabold mb-4" style={{ color: '#003756' }}>
                  Client Information
                </h3>
                <div className="space-y-2">
                  <p className="text-base font-medium" style={{ color: '#003756' }}>
                    <span className="font-bold">Name:</span> {clientName}
                  </p>
                  <p className="text-base font-medium" style={{ color: '#003756' }}>
                    <span className="font-bold">Email:</span> {clientEmail}
                  </p>
                  {companyName && (
                    <p className="text-base font-medium" style={{ color: '#003756' }}>
                      <span className="font-bold">Company:</span> {companyName}
                    </p>
                  )}
                </div>
              </div>

              <div className="card-medium mb-6">
                <h3 className="text-xl font-extrabold mb-4" style={{ color: '#003756' }}>
                  Events Summary
                </h3>
                <div className="space-y-4">
                  {events.map((event, index) => {
                    const preset = getEffectivePreset(event);
                    const eventColor = getServiceColor(event.service);
                    return (
                      <div
                        key={event.id}
                        className="p-4 bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 rounded-xl border-2 border-shortcut-teal border-opacity-30"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="text-lg font-extrabold mb-1" style={{ color: '#003756' }}>
                              Event {index + 1}: {getServiceName(event.service)}
                            </h4>
                            <p className="text-sm font-medium" style={{ color: '#6b7280' }}>
                              {event.mode === 'custom' ? 'Custom Configuration' : 'Package Mode'}
                            </p>
                          </div>
                          <span 
                            className="text-xs px-3 py-1 rounded-full font-bold"
                            style={{ backgroundColor: eventColor, color: '#003756' }}
                          >
                            {getServiceName(event.service)}
                          </span>
                        </div>
                        {preset && (
                          <div className="grid grid-cols-3 gap-4 mt-4">
                            <div>
                              <p className="text-xs font-bold text-shortcut-blue mb-1 uppercase tracking-wider">Appointments</p>
                              <p className="text-xl font-extrabold text-shortcut-navy-blue">{preset.appointments}</p>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-shortcut-blue mb-1 uppercase tracking-wider">Duration</p>
                              <p className="text-xl font-extrabold text-shortcut-navy-blue">{preset.eventTime} {preset.eventTime === 1 ? 'hr' : 'hrs'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-shortcut-blue mb-1 uppercase tracking-wider">Cost</p>
                              <p className="text-xl font-extrabold text-shortcut-navy-blue">${preset.price.toLocaleString()}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="card-medium mb-6">
                <h3 className="text-xl font-extrabold mb-4" style={{ color: '#003756' }}>
                  Quarterly Summary
                </h3>
                <div className="space-y-4">
                  <div className="p-6 bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 rounded-xl border-2 border-shortcut-teal border-opacity-30">
                    <p className="text-xs font-bold text-shortcut-blue mb-3 uppercase tracking-wider">Total Events</p>
                    <p className="text-3xl font-extrabold text-shortcut-navy-blue">{totals.totalEvents}/4</p>
                  </div>
                  <div className="p-6 bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 rounded-xl border-2 border-shortcut-teal border-opacity-30">
                    <p className="text-xs font-bold text-shortcut-blue mb-3 uppercase tracking-wider">Total Appointments</p>
                    <p className="text-3xl font-extrabold text-shortcut-navy-blue">{totals.totalAppointments}</p>
                  </div>
                  <div className="p-6 bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 rounded-xl border-2 border-shortcut-teal border-opacity-30">
                    <p className="text-xs font-bold text-shortcut-blue mb-3 uppercase tracking-wider">Subtotal</p>
                    <p className="text-3xl font-extrabold text-shortcut-navy-blue">${totals.totalCost.toLocaleString()}</p>
                  </div>
                  {totals.discountPercent > 0 && (
                    <>
                      <div className="p-6 bg-gradient-to-br from-shortcut-coral/10 to-shortcut-coral/5 rounded-xl border-2 border-shortcut-coral border-opacity-30">
                        <p className="text-xs font-bold text-shortcut-coral mb-3 uppercase tracking-wider">
                          Quarterly Discount ({totals.discountPercent}%)
                        </p>
                        <p className="text-2xl font-extrabold text-shortcut-coral">-${totals.discountAmount.toLocaleString()}</p>
                      </div>
                      <div className="p-6 bg-gradient-to-br from-shortcut-navy-blue to-shortcut-dark-blue rounded-xl border-2 border-shortcut-teal border-opacity-30">
                        <p className="text-xs font-bold text-white mb-3 uppercase tracking-wider">Total Cost</p>
                        <p className="text-4xl font-extrabold text-shortcut-teal">${totals.finalCost.toLocaleString()}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowPreview(false)}
                  className="flex-1 px-6 py-4 rounded-full font-bold text-base border-2 transition-all"
                  style={{ 
                    borderColor: '#003756', 
                    color: '#003756', 
                    backgroundColor: 'transparent' 
                  }}
                >
                  Back to Edit
                </button>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    handleGenerateProposal();
                  }}
                  disabled={isGenerating}
                  className="flex-1 px-6 py-4 rounded-full font-bold text-base shadow-soft hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ 
                    backgroundColor: '#003756', 
                    color: '#FFFFFF' 
                  }}
                >
                  {isGenerating ? (
                    <>
                      <Sparkles className="animate-spin" size={20} />
                      Generating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={20} />
                      Generate Proposal
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientProposalBuilder;
