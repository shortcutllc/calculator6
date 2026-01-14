import React, { useState, useEffect } from 'react';
import { Plus, Trash, X, Calculator } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProposal } from '../contexts/ProposalContext';
import ProposalOptionsModal from './ProposalOptionsModal';
import { Button } from './Button';
import { prepareProposalFromCalculation } from '../utils/proposalGenerator';

interface Service {
  serviceType: string;
  totalHours: number;
  appTime: number;
  numPros: number;
  proHourly: number;
  hourlyRate: number;
  earlyArrival: number;
  retouchingCost?: number;
  discountPercent: number;
  date: string;
  location: string;
  // Mindfulness-specific fields
  classLength?: number;
  participants?: string | number;
  fixedPrice?: number;
  // Massage-specific fields
  massageType?: 'chair' | 'table' | 'massage';
}

interface Event {
  clientName: string;
  date: string;
  services: Service[];
}

interface ClientData {
  name: string;
  locations: string[];
  events: { [key: string]: Event[] };
}

interface CalculationResults {
  totalAppointments: number;
  totalCost: number;
  totalProRevenue: number;
  netProfit: number;
  profitMargin: number;
  locationBreakdown: {
    [key: string]: {
      totalAppointments: number;
      totalCost: number;
      dateBreakdown: {
        [key: string]: {
          totalAppointments: number;
          totalCost: number;
          services: Array<{
            serviceType: string;
            totalHours: number;
            numPros: number;
            totalAppointments: number;
            serviceCost: number;
          }>;
        };
      };
    };
  };
}

const HEADSHOT_PRESETS = {
  basic: {
    appTime: 12,
    proHourly: 400,
    retouchingCost: 40,
    totalHours: 5,
    numPros: 1,
    hourlyRate: 0,
    earlyArrival: 0,
    discountPercent: 0
  },
  premium: {
    appTime: 12,
    proHourly: 500,
    retouchingCost: 50,
    totalHours: 5,
    numPros: 1,
    hourlyRate: 0,
    earlyArrival: 0,
    discountPercent: 0
  },
  executive: {
    appTime: 12,
    proHourly: 600,
    retouchingCost: 60,
    totalHours: 5,
    numPros: 1,
    hourlyRate: 0,
    earlyArrival: 0,
    discountPercent: 0
  }
};

const SERVICE_DEFAULTS = {
  massage: {
    appTime: 20,
    totalHours: 4,
    numPros: 2,
    proHourly: 50,
    hourlyRate: 135,
    earlyArrival: 25,
    retouchingCost: 0
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
    fixedPrice: 1375
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
    fixedPrice: 1500
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

const DEFAULT_SERVICE: Service = {
  serviceType: 'massage',
  totalHours: 4,
  appTime: 20,
  numPros: 2,
  proHourly: 50,
  hourlyRate: 135,
  earlyArrival: 25,
  discountPercent: 0,
  date: '',
  location: '',
  massageType: 'massage'
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { createProposal } = useProposal();
  const [clientName, setClientName] = useState('');
  const [locations, setLocations] = useState(['']);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [currentLocation, setCurrentLocation] = useState('');
  const [clientData, setClientData] = useState<ClientData>({
    name: '',
    locations: [],
    events: {}
  });
  const [calculationResults, setCalculationResults] = useState<CalculationResults | null>(null);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewResults, setPreviewResults] = useState<CalculationResults | null>(null);

  // Clear preview when services or client data changes
  useEffect(() => {
    if (showPreview) {
      setShowPreview(false);
      setPreviewResults(null);
    }
  }, [clientData.events, clientData.name, clientData.locations]);

  const calculateServiceResults = (service: Service) => {
    const apptsPerHourPerPro = 60 / service.appTime;
    const totalApptsPerHour = apptsPerHourPerPro * service.numPros;
    const totalAppts = Math.floor(service.totalHours * totalApptsPerHour);

    let serviceCost = 0;
    let proRevenue = 0;

    if (service.serviceType === 'headshot') {
      proRevenue = service.totalHours * service.numPros * service.proHourly;
      const retouchingTotal = totalAppts * (service.retouchingCost || 0);
      serviceCost = proRevenue + retouchingTotal;
    } else if (service.serviceType === 'mindfulness' ||
               service.serviceType === 'mindfulness-soles' ||
               service.serviceType === 'mindfulness-movement' ||
               service.serviceType === 'mindfulness-pro' ||
               service.serviceType === 'mindfulness-cle' ||
               service.serviceType === 'mindfulness-pro-reactivity') {
      // Mindfulness services use fixed pricing
      serviceCost = service.fixedPrice || 1350;
      proRevenue = serviceCost * 0.3; // 30% profit margin for mindfulness
    } else {
      const totalEarlyArrival = service.earlyArrival * service.numPros;
      proRevenue = (service.totalHours * service.numPros * service.proHourly) + totalEarlyArrival;
      serviceCost = service.totalHours * service.hourlyRate * service.numPros;
    }

    if (service.discountPercent > 0) {
      serviceCost = serviceCost * (1 - (service.discountPercent / 100));
    }

    return {
      totalAppointments: totalAppts,
      serviceCost,
      proRevenue
    };
  };

  const calculateResults = () => {
    if (!clientData.name || clientData.locations.length === 0) {
      alert('Please enter a client name and at least one location.');
      return;
    }

    // If we have preview results, use them and sync the clientData
    if (previewResults) {
      // Update clientData.events to match the preview modifications
      const updatedClientData = { ...clientData };
      updatedClientData.events = {};
      
      // Rebuild events from preview results
      Object.entries(previewResults.locationBreakdown).forEach(([location, locationData]) => {
        updatedClientData.events[location] = [];
        
        Object.entries(locationData.dateBreakdown).forEach(([date, dateData]) => {
          // Find the original event for this date/location
          const originalEvent = clientData.events[location]?.find(event => event.date === date);
          
          if (originalEvent) {
            // Create a new event with only the services that remain in the preview
            const remainingServices: Service[] = [];
            
            dateData.services.forEach((serviceData) => {
              // Find the original service with all its data
              const originalService = originalEvent.services.find(service => 
                service.serviceType === serviceData.serviceType &&
                service.totalHours === serviceData.totalHours &&
                service.numPros === serviceData.numPros
              );
              
              if (originalService) {
                remainingServices.push(originalService);
              }
            });
            
            if (remainingServices.length > 0) {
              updatedClientData.events[location].push({
                clientName: clientData.name,
                date: date,
                services: remainingServices
              });
            }
          }
        });
      });
      
      setClientData(updatedClientData);
      setCalculationResults(previewResults);
      setShowResults(true);
      setShowPreview(false);
      setPreviewResults(null);
      return;
    }

    const performCalculation = () => {
      const results: CalculationResults = {
        totalAppointments: 0,
        totalCost: 0,
        totalProRevenue: 0,
        netProfit: 0,
        profitMargin: 0,
        locationBreakdown: {}
      };

      Object.entries(clientData.events).forEach(([location, events]) => {
        results.locationBreakdown[location] = {
          totalAppointments: 0,
          totalCost: 0,
          dateBreakdown: {}
        };

        events.forEach((event) => {
          const dateKey = event.date || 'TBD';
          if (!results.locationBreakdown[location].dateBreakdown[dateKey]) {
            results.locationBreakdown[location].dateBreakdown[dateKey] = {
              totalAppointments: 0,
              totalCost: 0,
              services: []
            };
          }

          event.services.forEach((service) => {
            const serviceResults = calculateServiceResults(service);
            results.totalAppointments += serviceResults.totalAppointments;
            results.totalCost += serviceResults.serviceCost;
            results.totalProRevenue += serviceResults.proRevenue;

            results.locationBreakdown[location].totalAppointments += serviceResults.totalAppointments;
            results.locationBreakdown[location].totalCost += serviceResults.serviceCost;

            results.locationBreakdown[location].dateBreakdown[dateKey].totalAppointments += serviceResults.totalAppointments;
            results.locationBreakdown[location].dateBreakdown[dateKey].totalCost += serviceResults.serviceCost;
            results.locationBreakdown[location].dateBreakdown[dateKey].services.push({
              serviceType: service.serviceType,
              totalHours: service.totalHours,
              numPros: service.numPros,
              totalAppointments: serviceResults.totalAppointments,
              serviceCost: serviceResults.serviceCost
            });
          });
        });
      });

      results.netProfit = results.totalCost - results.totalProRevenue;
      results.profitMargin = results.totalCost > 0 ? ((results.totalCost - results.totalProRevenue) / results.totalCost) * 100 : 0;

      return results;
    };

    const results = performCalculation();
    setCalculationResults(results);
    setShowResults(true);
  };

  const handleSaveEvent = () => {
    if (services.length === 0) {
      alert('Please add at least one service');
      return;
    }

    const missingDates = services.some(service => !service.date);
    if (missingDates) {
      alert('Please select a date for all services');
      return;
    }

    const updatedClientData = { ...clientData };
    if (!updatedClientData.events[currentLocation]) {
      updatedClientData.events[currentLocation] = [];
    }

    const event: Event = {
      clientName: clientData.name,
      date: services[0].date,
      services: services
    };

    updatedClientData.events[currentLocation].push(event);
    setClientData(updatedClientData);
    setShowEventModal(false);
    
    // Automatically generate preview after saving event
    setTimeout(() => {
      generatePreview();
    }, 100); // Small delay to ensure state is updated
  };

  const handleGenerateProposal = async (options: any) => {
    try {
      if (!calculationResults) {
        throw new Error('Calculation results are required to generate a proposal');
      }

      if (!clientData.name || clientData.name.trim() === '') {
        throw new Error('Client name is required');
      }

      if (!options.customization.customNote?.trim()) {
        options.customization.customNote = `We are so excited to service the incredible staff at ${clientData.name}! Our team is looking forward to providing an exceptional experience for everyone involved. Please review the details above and let us know if you need any adjustments.`;
      }

      // Create the client data structure expected by prepareProposalFromCalculation
      const currentClient = {
        name: clientData.name.trim(),
        locations: clientData.locations,
        events: clientData.events
      };

      // Use the proper proposal generation function
      const proposalData = prepareProposalFromCalculation(currentClient);
      
      // Add client email and logo if provided
      if (options.clientEmail) {
        proposalData.clientEmail = options.clientEmail;
      }
      if (options.clientLogoUrl) {
        proposalData.clientLogoUrl = options.clientLogoUrl;
      }
      // Handle office locations - support both new (multiple) and legacy (single) formats
      if (options.officeLocations && Object.keys(options.officeLocations).length > 0) {
        proposalData.officeLocations = options.officeLocations;
      } else if (options.officeLocation) {
        // Legacy support: if single officeLocation is provided, use it for the first location
        proposalData.officeLocation = options.officeLocation;
      }

      const proposalId = await createProposal(proposalData, options.customization, options.clientEmail, options.isTest);
      if (!proposalId) {
        throw new Error('Failed to create proposal');
      }

      setShowProposalModal(false);
      navigate(`/proposal/${proposalId}`);
    } catch (error) {
      console.error('Proposal generation error:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate proposal. Please try again.');
    }
  };

  const addLocation = () => {
    setLocations([...locations, '']);
  };

  const removeLocation = (index: number) => {
    setLocations(locations.filter((_, i) => i !== index));
  };

  const updateLocation = (index: number, value: string) => {
    const newLocations = [...locations];
    newLocations[index] = value;
    setLocations(newLocations);
  };

  const handleStartCalculation = (e: React.FormEvent) => {
    e.preventDefault();
    const validLocations = locations.filter(loc => loc.trim() !== '');
    
    if (!clientName.trim()) {
      alert('Please enter a client name');
      return;
    }

    if (validLocations.length === 0) {
      alert('Please enter at least one location');
      return;
    }

    setClientData({
      name: clientName,
      locations: validLocations,
      events: {}
    });
    setShowDashboard(true);
  };

  const showEventModalForLocation = (location: string) => {
    setCurrentLocation(location);
    setServices([{
      ...DEFAULT_SERVICE,
      location: location,
      date: ''
    }]);
    setShowEventModal(true);
  };

  const addService = (type: 'same-day' | 'new-day' = 'same-day') => {
    const newService: Service = {
      ...DEFAULT_SERVICE,
      date: type === 'same-day' && services.length > 0 ? services[0].date : '',
      location: currentLocation
    };
    setServices([...services, newService]);
  };

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const updateService = (index: number, updates: Partial<Service>) => {
    const updatedServices = [...services];
    
    if (updates.serviceType) {
      const serviceDefaults = SERVICE_DEFAULTS[updates.serviceType as keyof typeof SERVICE_DEFAULTS];
      
      if (updates.serviceType === 'headshot') {
        updatedServices[index] = {
          ...updatedServices[index],
          ...HEADSHOT_PRESETS.basic,
          serviceType: 'headshot',
          date: updatedServices[index].date,
          location: updatedServices[index].location
        };
      } else if (updates.serviceType === 'mindfulness') {
        // Set mindfulness defaults
        updatedServices[index] = {
          ...updatedServices[index],
          ...serviceDefaults,
          serviceType: 'mindfulness',
          date: updatedServices[index].date,
          location: updatedServices[index].location,
          discountPercent: updatedServices[index].discountPercent || 0
        };
      } else {
        // Reset all fields to proper defaults for non-headshot services
        updatedServices[index] = {
          ...updatedServices[index],
          ...serviceDefaults,
          serviceType: updates.serviceType,
          date: updatedServices[index].date,
          location: updatedServices[index].location,
          discountPercent: updatedServices[index].discountPercent || 0,
          // Preserve massageType if switching to massage, otherwise clear it
          massageType: updates.serviceType === 'massage' ? (updatedServices[index].massageType || 'massage') : undefined
        };
      }
    } else {
      updatedServices[index] = { ...updatedServices[index], ...updates };
    }
    
    setServices(updatedServices);
  };

  const applyHeadshotPreset = (index: number, preset: 'basic' | 'premium' | 'executive') => {
    const updatedServices = [...services];
    updatedServices[index] = {
      ...updatedServices[index],
      ...HEADSHOT_PRESETS[preset],
      serviceType: 'headshot',
      date: updatedServices[index].date,
      location: updatedServices[index].location
    };
    setServices(updatedServices);
  };

  const generatePreview = () => {
    if (!clientData.name || clientData.locations.length === 0) {
      alert('Please enter a client name and at least one location.');
      return;
    }

    const performCalculation = () => {
      const results: CalculationResults = {
        totalAppointments: 0,
        totalCost: 0,
        totalProRevenue: 0,
        netProfit: 0,
        profitMargin: 0,
        locationBreakdown: {}
      };

      Object.entries(clientData.events).forEach(([location, events]) => {
        results.locationBreakdown[location] = {
          totalAppointments: 0,
          totalCost: 0,
          dateBreakdown: {}
        };

        events.forEach((event) => {
          const dateKey = event.date || 'TBD';
          if (!results.locationBreakdown[location].dateBreakdown[dateKey]) {
            results.locationBreakdown[location].dateBreakdown[dateKey] = {
              totalAppointments: 0,
              totalCost: 0,
              services: []
            };
          }

          event.services.forEach((service) => {
            const serviceResults = calculateServiceResults(service);
            results.totalAppointments += serviceResults.totalAppointments;
            results.totalCost += serviceResults.serviceCost;
            results.totalProRevenue += serviceResults.proRevenue;

            results.locationBreakdown[location].totalAppointments += serviceResults.totalAppointments;
            results.locationBreakdown[location].totalCost += serviceResults.serviceCost;

            results.locationBreakdown[location].dateBreakdown[dateKey].totalAppointments += serviceResults.totalAppointments;
            results.locationBreakdown[location].dateBreakdown[dateKey].totalCost += serviceResults.serviceCost;
            results.locationBreakdown[location].dateBreakdown[dateKey].services.push({
              serviceType: service.serviceType,
              totalHours: service.totalHours,
              numPros: service.numPros,
              totalAppointments: serviceResults.totalAppointments,
              serviceCost: serviceResults.serviceCost
            });
          });
        });
      });

      results.netProfit = results.totalCost - results.totalProRevenue;
      results.profitMargin = results.totalCost > 0 ? ((results.totalCost - results.totalProRevenue) / results.totalCost) * 100 : 0;

      return results;
    };

    const results = performCalculation();
    setPreviewResults(results);
    setShowPreview(true);
  };

  const clearPreview = () => {
    setShowPreview(false);
    setPreviewResults(null);
  };

  const removeServiceFromPreview = (location: string, date: string, serviceIndex: number) => {
    if (!previewResults) return;
    
    console.log('Removing service from preview:', { location, date, serviceIndex });
    console.log('Before removal:', previewResults);
    
    const updatedResults = { ...previewResults };
    if (updatedResults.locationBreakdown) {
      const locationData = updatedResults.locationBreakdown[location];
      if (locationData?.dateBreakdown) {
        const dateData = locationData.dateBreakdown[date];
        if (dateData?.services) {
          dateData.services.splice(serviceIndex, 1);
          
          // If no services left, remove the entire date
          if (dateData.services.length === 0) {
            delete locationData.dateBreakdown[date];
          } else {
            // Recalculate totals for the date
            dateData.totalAppointments = dateData.services.reduce((sum, s) => sum + s.totalAppointments, 0);
            dateData.totalCost = dateData.services.reduce((sum, s) => sum + s.serviceCost, 0);
          }
        }
      }
      
      // If no dates left, remove the entire location
      if (Object.keys(locationData.dateBreakdown).length === 0) {
        delete updatedResults.locationBreakdown[location];
      } else {
        // Recalculate totals for the location
        locationData.totalAppointments = Object.values(locationData.dateBreakdown).reduce((sum, d) => sum + d.totalAppointments, 0);
        locationData.totalCost = Object.values(locationData.dateBreakdown).reduce((sum, d) => sum + d.totalCost, 0);
      }
    }
    
    // Recalculate overall totals
    updatedResults.totalAppointments = Object.values(updatedResults.locationBreakdown).reduce((sum, l) => sum + l.totalAppointments, 0);
    updatedResults.totalCost = Object.values(updatedResults.locationBreakdown).reduce((sum, l) => sum + l.totalCost, 0);
    updatedResults.netProfit = updatedResults.totalCost - updatedResults.totalProRevenue;
    updatedResults.profitMargin = updatedResults.totalCost > 0 ? ((updatedResults.totalCost - updatedResults.totalProRevenue) / updatedResults.totalCost) * 100 : 0;
    
    console.log('After removal:', updatedResults);
    setPreviewResults(updatedResults);
  };

  const removeEventFromPreview = (location: string, date: string) => {
    if (!previewResults) return;
    
    const updatedResults = { ...previewResults };
    if (updatedResults.locationBreakdown) {
      const locationData = updatedResults.locationBreakdown[location];
      if (locationData?.dateBreakdown) {
        delete locationData.dateBreakdown[date];
        
        // If no dates left, remove the entire location
        if (Object.keys(locationData.dateBreakdown).length === 0) {
          delete updatedResults.locationBreakdown[location];
        } else {
          // Recalculate totals for the location
          locationData.totalAppointments = Object.values(locationData.dateBreakdown).reduce((sum, d) => sum + d.totalAppointments, 0);
          locationData.totalCost = Object.values(locationData.dateBreakdown).reduce((sum, d) => sum + d.totalCost, 0);
        }
      }
    }
    
    // Recalculate overall totals
    updatedResults.totalAppointments = Object.values(updatedResults.locationBreakdown).reduce((sum, l) => sum + l.totalAppointments, 0);
    updatedResults.totalCost = Object.values(updatedResults.locationBreakdown).reduce((sum, l) => sum + l.totalCost, 0);
    updatedResults.netProfit = updatedResults.totalCost - updatedResults.totalProRevenue;
    updatedResults.profitMargin = updatedResults.totalCost > 0 ? ((updatedResults.totalCost - updatedResults.totalProRevenue) / updatedResults.totalCost) * 100 : 0;
    
    setPreviewResults(updatedResults);
  };

  return (
    <div className="min-h-screen bg-neutral-light-gray">
      {!showDashboard ? (
        <div className="max-w-2xl mx-auto px-5 lg:px-[90px] py-8 lg:py-12">
          <div className="card-large">
            <h1 className="h1 mb-8">Create New Proposal</h1>
            <form onSubmit={handleStartCalculation} className="space-y-6">
              <div>
                <label className="block text-shortcut-blue text-sm font-bold mb-2">
                  Client Name
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base"
                  placeholder="Enter client name"
                />
              </div>
              
              <div>
                <label className="block text-shortcut-blue text-sm font-bold mb-2">
                  Locations
                </label>
                <div className="space-y-3">
                  {locations.map((location, index) => (
                    <div key={index} className="flex gap-3 items-center">
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => updateLocation(index, e.target.value)}
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base"
                        placeholder="Enter location"
                      />
                      {locations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLocation(index)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label="Remove location"
                        >
                          <X size={20} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addLocation}
                  className="flex items-center text-shortcut-blue hover:text-shortcut-navy-blue mt-3 font-bold text-sm transition-colors"
                >
                  <Plus size={20} className="mr-2" />
                  Add Location
                </button>
              </div>
              
              <div className="pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                >
                  Start Calculation
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : showResults ? (
        <div className="max-w-7xl mx-auto px-5 lg:px-[90px] py-8 lg:py-12">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setShowResults(false)}
                variant="secondary"
              >
                Back to Calculator
              </Button>
              <h1 className="h1">
                {clientData.name}'s Calculation
              </h1>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowProposalModal(true)}
                variant="primary"
              >
                Generate Proposal
              </Button>
            </div>
          </div>

          <div className="card-large mb-8">
            <h2 className="h2 mb-6">Event Details</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-sm font-bold text-shortcut-blue">Client Name:</span>
                <span className="font-bold text-text-dark">{clientData.name}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-sm font-bold text-shortcut-blue">Total Appointments:</span>
                <span className="font-bold text-text-dark">{calculationResults?.totalAppointments}</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-sm font-bold text-shortcut-blue">Total Event Cost:</span>
                <span className="font-bold text-shortcut-navy-blue text-lg">${calculationResults?.totalCost.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {Object.entries(calculationResults?.locationBreakdown || {}).map(([location, locationData]) => (
            <div key={location} className="card-large mb-8">
              <h2 className="h2 mb-8">{location}</h2>
              
              <div className="space-y-8">
                {Object.entries(locationData.dateBreakdown).map(([date, dateData], dateIndex) => (
                  <div key={date} className="space-y-6">
                    <h3 className="text-xl font-extrabold text-shortcut-navy-blue">Day {dateIndex + 1} - {date}</h3>
                    
                    <div className="space-y-4">
                      {dateData.services.map((service, serviceIndex) => (
                        <div key={serviceIndex} className="card-small">
                          <h4 className="text-lg font-extrabold text-shortcut-blue mb-4">Service {serviceIndex + 1}: {service.serviceType}</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex justify-between items-center py-2 border-b border-gray-200">
                              <span className="text-sm font-bold text-shortcut-blue">Total Hours:</span>
                              <span className="font-bold text-text-dark">{service.totalHours} hours</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-200">
                              <span className="text-sm font-bold text-shortcut-blue">Number of Professionals:</span>
                              <span className="font-bold text-text-dark">{service.numPros}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-200">
                              <span className="text-sm font-bold text-shortcut-blue">Total Appointments:</span>
                              <span className="font-bold text-text-dark">{service.totalAppointments}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-200">
                              <span className="text-sm font-bold text-shortcut-blue">Service Cost:</span>
                              <span className="font-bold text-shortcut-blue">${service.serviceCost.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 bg-white rounded-xl p-6 border-2 border-shortcut-navy-blue shadow-md">
                      <h4 className="text-xl font-extrabold mb-4 text-shortcut-navy-blue">Day {dateIndex + 1} Summary</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-shortcut-teal bg-opacity-10 rounded-lg p-4 border border-shortcut-teal">
                          <div className="text-sm font-bold text-shortcut-navy-blue mb-1">Total Appointments</div>
                          <div className="text-2xl font-extrabold text-shortcut-navy-blue">{dateData.totalAppointments}</div>
                        </div>
                        <div className="bg-shortcut-teal bg-opacity-10 rounded-lg p-4 border border-shortcut-teal">
                          <div className="text-sm font-bold text-shortcut-navy-blue mb-1">Total Cost</div>
                          <div className="text-2xl font-extrabold text-shortcut-navy-blue">${dateData.totalCost.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 card-medium bg-neutral-light-gray">
                <h4 className="text-lg font-extrabold text-shortcut-blue mb-4">{location} Totals</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm font-bold text-shortcut-blue">Total Appointments:</span>
                    <span className="font-bold text-text-dark">{locationData.totalAppointments}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm font-bold text-shortcut-blue">Total Cost:</span>
                    <span className="font-bold text-shortcut-blue">${locationData.totalCost.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="card-large bg-shortcut-navy-blue text-white">
            <h2 className="text-xl font-extrabold mb-6 text-white">Event Summary</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-white/20">
                <span className="font-semibold">Total Appointments:</span>
                <span className="font-bold text-lg">{calculationResults?.totalAppointments}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/20">
                <span className="font-semibold">Total Event Cost:</span>
                <span className="font-bold text-lg">${calculationResults?.totalCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/20">
                <span className="font-semibold">Professional Revenue:</span>
                <span className="font-bold text-lg">${calculationResults?.totalProRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/20">
                <span className="font-semibold">Net Profit:</span>
                <span className="font-bold text-lg">${calculationResults?.netProfit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="font-semibold">Profit Margin:</span>
                <span className="font-bold text-lg">{calculationResults?.profitMargin.toFixed(1)}%</span>
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-5 lg:px-[90px] py-8 lg:py-12">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <h1 className="h1">
              {clientData.name}'s Calculation
            </h1>
            <div className="flex gap-3">
              {showPreview ? (
                <>
                  <Button
                    onClick={clearPreview}
                    variant="secondary"
                  >
                    Clear Preview
                  </Button>
                  <Button
                    onClick={calculateResults}
                    variant="primary"
                    icon={<Calculator size={20} />}
                  >
                    Use This Calculation
                  </Button>
                </>
              ) : (
                <Button
                  onClick={calculateResults}
                  variant="primary"
                  icon={<Calculator size={20} />}
                >
                  Calculate
                </Button>
              )}
            </div>
          </div>

          {showPreview && previewResults && (
            <div key={`preview-${JSON.stringify(previewResults)}`} className="card-medium mb-8">
              <div className="flex items-center gap-3 mb-6">
                <Calculator size={24} className="text-shortcut-blue" />
                <h3 className="text-xl font-extrabold text-shortcut-blue">Calculation Preview</h3>
              </div>
              <p className="text-text-dark-60 text-base mb-6 leading-relaxed">
                Your calculation preview appears automatically after adding events. You can remove specific services or events, then click "Use This Calculation" to proceed or "Clear Preview" to start over.
              </p>
              
              <div className="card-small bg-neutral-light-gray mb-6">
                <h4 className="text-lg font-extrabold text-shortcut-blue mb-4">Quick Summary</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  <div>
                    <span className="text-sm font-bold text-shortcut-blue block mb-1">Total Appointments:</span>
                    <div className="font-bold text-text-dark text-lg">{previewResults.totalAppointments}</div>
                  </div>
                  <div>
                    <span className="text-sm font-bold text-shortcut-blue block mb-1">Total Cost:</span>
                    <div className="font-bold text-text-dark text-lg">${previewResults.totalCost.toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-sm font-bold text-shortcut-blue block mb-1">Net Profit:</span>
                    <div className="font-bold text-text-dark text-lg">${previewResults.netProfit.toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-sm font-bold text-shortcut-blue block mb-1">Profit Margin:</span>
                    <div className="font-bold text-text-dark text-lg">{previewResults.profitMargin.toFixed(1)}%</div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {Object.entries(previewResults.locationBreakdown).map(([location, locationData]) => (
                  <div key={location} className="card-small bg-neutral-light-gray">
                    <h4 className="text-lg font-extrabold text-shortcut-blue mb-4">{location}</h4>
                    <div className="space-y-3">
                      {Object.entries(locationData.dateBreakdown).map(([date, dateData]) => (
                        <div key={date} className="card-small bg-white">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <span className="font-bold text-shortcut-blue">{date === 'TBD' ? 'TBD' : date}:</span>
                              <span className="ml-2 text-text-dark-60 text-sm">
                                {dateData.services.length} service{dateData.services.length !== 1 ? 's' : ''} • 
                                {dateData.totalAppointments} appointments • 
                                ${dateData.totalCost.toFixed(2)}
                              </span>
                            </div>
                            <button
                              onClick={() => removeEventFromPreview(location, date)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove this event"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          {dateData.services.length > 0 && (
                            <div className="ml-4 space-y-2 pt-2 border-t border-gray-200">
                              {dateData.services.map((service, serviceIndex) => (
                                <div key={serviceIndex} className="flex justify-between items-center text-sm py-1.5">
                                  <span className="text-text-dark">
                                    {service.serviceType} • {service.totalHours}h • {service.numPros} pros • ${service.serviceCost.toFixed(2)}
                                  </span>
                                  <button
                                    onClick={() => removeServiceFromPreview(location, date, serviceIndex)}
                                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                    title="Remove this service"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {clientData.locations.map((location) => (
              <div
                key={location}
                className="card-medium"
              >
                <h3 className="text-xl font-extrabold mb-6 text-shortcut-blue">{location}</h3>
                <Button
                  onClick={() => showEventModalForLocation(location)}
                  variant="primary"
                  icon={<Plus size={20} />}
                  className="w-full"
                >
                  Add Event
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[200]">
          <div className="card-large max-w-4xl w-full max-h-[90vh] overflow-y-auto z-[200] relative">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[32px] md:text-[40px] font-extrabold text-shortcut-blue leading-tight" style={{ fontWeight: 800 }}>Add Event In {currentLocation}</h2>
              <button
                onClick={() => setShowEventModal(false)}
                className="text-text-dark-60 hover:text-shortcut-blue transition-colors p-2 rounded-lg hover:bg-neutral-light-gray"
                aria-label="Close modal"
              >
                <X size={28} />
              </button>
            </div>

            {/* Add Service Section - Prominent at top */}
            <div className="mb-8 p-5 bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 rounded-[24px] border-2 border-shortcut-teal/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-shortcut-teal rounded-full flex items-center justify-center flex-shrink-0">
                  <Plus size={24} className="text-shortcut-navy-blue" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-shortcut-blue" style={{ fontWeight: 700 }}>Add Services to This Event</h3>
                  <p className="text-sm text-text-dark-60 font-medium">Choose whether services happen on the same day or different days</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => addService('same-day')}
                  variant="primary"
                  className="flex-1"
                  icon={<Plus size={20} />}
                >
                  Same Day Service
                </Button>
                <Button
                  onClick={() => addService('new-day')}
                  variant="green"
                  className="flex-1"
                  icon={<Plus size={20} />}
                >
                  Different Day Service
                </Button>
              </div>
              <p className="text-xs text-text-dark-60 mt-3 font-medium">
                💡 <strong>Same Day:</strong> Multiple services on one date (e.g., massage + nails). <strong>Different Day:</strong> Services on separate dates.
              </p>
            </div>

            {services.map((service, index) => {
              const serviceResults = calculateServiceResults(service);
              const totalAppointments = serviceResults.totalAppointments;
              const serviceCost = serviceResults.serviceCost;
              
              return (
                <div
                  key={index}
                  className="card-medium mb-6"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-extrabold text-shortcut-blue">
                      Service #{index + 1}
                    </h3>
                    <div className="flex items-center gap-3">
                      <div className="bg-shortcut-teal bg-opacity-20 text-shortcut-navy-blue px-3 py-1.5 rounded-full text-sm font-bold">
                        Total Appointments: {totalAppointments}
                      </div>
                      <div className="bg-shortcut-teal bg-opacity-20 text-shortcut-navy-blue px-3 py-1.5 rounded-full text-sm font-bold">
                        Total Cost: ${serviceCost.toFixed(2)}
                      </div>
                      <button
                        onClick={() => removeService(index)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="Remove service"
                      >
                        <Trash size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-shortcut-blue text-sm font-bold mb-2">
                      Service Date
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="date"
                        value={service.date === 'TBD' ? '' : service.date}
                        onChange={(e) => {
                          // Prevent clearing the date - if empty, keep the current date
                          if (!e.target.value) {
                            return;
                          }
                          updateService(index, { date: e.target.value });
                        }}
                        disabled={service.date === 'TBD'}
                        className={`flex-1 px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal ${
                          service.date === 'TBD' ? 'bg-neutral-light-gray text-text-dark-60' : 'border-gray-200'
                        }`}
                      />
                      <label className="flex items-center gap-2 text-sm font-bold text-shortcut-blue">
                        <input
                          type="checkbox"
                          checked={service.date === 'TBD'}
                          onChange={(e) => {
                            if (e.target.checked) {
                              updateService(index, { date: 'TBD' });
                            } else {
                              // When unchecking TBD, set to today's date as default
                              const today = new Date().toISOString().split('T')[0];
                              updateService(index, { date: today });
                            }
                          }}
                          className="w-4 h-4 text-shortcut-teal border-gray-300 rounded focus:ring-shortcut-teal"
                        />
                        TBD
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-shortcut-blue text-sm font-bold mb-2">
                        Service Type
                      </label>
                      <select
                        value={service.serviceType}
                        onChange={(e) =>
                          updateService(index, { serviceType: e.target.value })
                        }
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
                      >
                        <option value="massage">Massage</option>
                        <option value="facial">Facial</option>
                        <option value="hair">Hair</option>
                        <option value="nails">Nails</option>
                        <option value="makeup">Makeup</option>
                        <option value="headshot">Headshots</option>
                        <option value="mindfulness">Mindfulness</option>
                        <option value="mindfulness-soles">Grounding Under Pressure: The Soles of the Feet Practice</option>
                        <option value="mindfulness-movement">Ground & Reset: Cultivating Mindfulness Through Movement and Stillness</option>
                        <option value="mindfulness-pro">Mindfulness: PRO Practice</option>
                        <option value="mindfulness-cle">Mindfulness: CLE Ethics Program</option>
                        <option value="mindfulness-pro-reactivity">Pause, Relax, Open: Mindfulness Tools to Step Out of Reactivity and Response Wisely</option>
                        <option value="hair-makeup">Hair + Makeup</option>
                        <option value="headshot-hair-makeup">Hair + Makeup for Headshots</option>
                      </select>
                    </div>

                    {service.serviceType === 'headshot' && (
                      <div>
                        <label className="block text-shortcut-blue text-sm font-bold mb-2">
                          Headshot Package
                        </label>
                        <div className="flex gap-2">
                          {['basic', 'premium', 'executive'].map((preset) => (
                            <button
                              key={preset}
                              onClick={() =>
                                applyHeadshotPreset(
                                  index,
                                  preset as 'basic' | 'premium' | 'executive'
                                )
                              }
                              className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                                service.proHourly ===
                                HEADSHOT_PRESETS[preset as keyof typeof HEADSHOT_PRESETS]
                                  .proHourly
                                  ? 'bg-shortcut-navy-blue text-white border-shortcut-navy-blue'
                                  : 'bg-white text-shortcut-blue border-gray-200 hover:bg-neutral-light-gray hover:border-shortcut-teal'
                              }`}
                            >
                              {preset.charAt(0).toUpperCase() + preset.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {service.serviceType === 'massage' && (
                      <div>
                        <label className="block text-shortcut-blue text-sm font-bold mb-2">
                          Massage Type
                        </label>
                        <select
                          value={service.massageType || 'massage'}
                          onChange={(e) =>
                            updateService(index, { massageType: e.target.value as 'chair' | 'table' | 'massage' })
                          }
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
                        >
                          <option value="massage">General Massage</option>
                          <option value="chair">Chair Massage</option>
                          <option value="table">Table Massage</option>
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-shortcut-blue text-sm font-bold mb-2">
                        Total Hours
                      </label>
                      <input
                        type="number"
                        value={service.totalHours}
                        onChange={(e) =>
                          updateService(index, {
                            totalHours: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
                        step="0.25"
                        min="0"
                      />
                    </div>

                    <div>
                      <label className="block text-shortcut-blue text-sm font-bold mb-2">
                        Number of Professionals
                      </label>
                      <input
                        type="number"
                        value={service.numPros}
                        onChange={(e) =>
                          updateService(index, {
                            numPros: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
                      />
                    </div>

                    <div>
                      <label className="block text-shortcut-blue text-sm font-bold mb-2">
                        Professional Hourly Rate
                      </label>
                      <input
                        type="number"
                        value={service.proHourly}
                        onChange={(e) =>
                          updateService(index, {
                            proHourly: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
                      />
                    </div>

                    {service.serviceType !== 'headshot' && (
                      <div>
                        <label className="block text-shortcut-blue text-sm font-bold mb-2">
                          Hourly Rate
                        </label>
                        <input
                          type="number"
                          value={service.hourlyRate}
                          onChange={(e) =>
                            updateService(index, {
                              hourlyRate: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
                        />
                      </div>
                    )}

                    {service.serviceType === 'headshot' && (
                      <div>
                        <label className="block text-shortcut-blue text-sm font-bold mb-2">
                          Retouching Cost
                        </label>
                        <input
                          type="number"
                          value={service.retouchingCost || 0}
                          onChange={(e) =>
                            updateService(index, {
                              retouchingCost: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
                        />
                      </div>
                    )}

                    {service.serviceType !== 'headshot' && (
                      <div>
                        <label className="block text-shortcut-blue text-sm font-bold mb-2">
                          Early Arrival Fee
                        </label>
                        <input
                          type="number"
                          value={service.earlyArrival}
                          onChange={(e) =>
                            updateService(index, {
                              earlyArrival: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-shortcut-blue text-sm font-bold mb-2">
                        Discount Percentage
                      </label>
                      <input
                        type="number"
                        value={service.discountPercent}
                        onChange={(e) =>
                          updateService(index, {
                            discountPercent: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
                      />
                    </div>

                    <div>
                      <label className="block text-shortcut-blue text-sm font-bold mb-2">
                        Appointment Time (minutes)
                      </label>
                      <input
                        type="number"
                        value={service.appTime}
                        onChange={(e) =>
                          updateService(index, {
                            appTime: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
                      />
                    </div>

                    {/* Mindfulness-specific fields */}
                    {service.serviceType === 'mindfulness' && (
                      <>
                        <div>
                          <label className="block text-shortcut-blue text-sm font-bold mb-2">
                            Class Length (minutes)
                          </label>
                          <select
                            value={service.mindfulnessType || (service.classLength === 30 ? 'drop-in' : service.classLength === 60 ? 'mindful-movement' : 'intro')}
                            onChange={(e) => {
                              const selectedType = e.target.value;
                              let classLength = 40;
                              let fixedPrice = 1350;
                              
                              if (selectedType === 'drop-in') {
                                classLength = 30;
                                fixedPrice = 1125;
                              } else if (selectedType === 'intro') {
                                classLength = 40;
                                fixedPrice = 1350;
                              } else {
                                classLength = 60; // mindful-movement
                                fixedPrice = 1350;
                              }
                              
                              updateService(index, {
                                classLength,
                                fixedPrice,
                                mindfulnessType: selectedType
                              });
                            }}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
                          >
                            <option value="intro">40 minutes - Intro to Mindfulness ($1,350)</option>
                            <option value="drop-in">30 minutes - Drop-in Session ($1,125)</option>
                            <option value="mindful-movement">60 minutes - Mindful Movement ($1,350)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-shortcut-blue text-sm font-bold mb-2">
                            Participants
                          </label>
                          <div className="flex gap-4 mb-3">
                            <label className="flex items-center text-text-dark font-medium">
                              <input
                                type="radio"
                                name={`participants-${index}`}
                                value="unlimited"
                                checked={service.participants === 'unlimited'}
                                onChange={(e) =>
                                  updateService(index, {
                                    participants: e.target.value
                                  })
                                }
                                className="mr-2 w-4 h-4 text-shortcut-teal border-gray-300 focus:ring-shortcut-teal"
                              />
                              Unlimited
                            </label>
                            <label className="flex items-center text-text-dark font-medium">
                              <input
                                type="radio"
                                name={`participants-${index}`}
                                value="custom"
                                checked={service.participants !== 'unlimited'}
                                onChange={() =>
                                  updateService(index, {
                                    participants: 50
                                  })
                                }
                                className="mr-2 w-4 h-4 text-shortcut-teal border-gray-300 focus:ring-shortcut-teal"
                              />
                              Custom
                            </label>
                          </div>
                          {service.participants !== 'unlimited' && (
                            <input
                              type="number"
                              value={typeof service.participants === 'number' ? service.participants : 50}
                              onChange={(e) =>
                                updateService(index, {
                                  participants: parseInt(e.target.value) || 50
                                })
                              }
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
                              placeholder="Number of participants"
                            />
                          )}
                        </div>

                        <div>
                          <label className="block text-shortcut-blue text-sm font-bold mb-2">
                            Fixed Price ($)
                          </label>
                          <input
                            type="number"
                            value={service.fixedPrice || 1350}
                            onChange={(e) =>
                              updateService(index, {
                                fixedPrice: parseInt(e.target.value) || 1350
                              })
                            }
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            <div className="mt-8 pt-6 border-t-2 border-gray-200">
              <Button
                onClick={handleSaveEvent}
                variant="primary"
                className="w-full text-lg py-4"
              >
                Save Event
              </Button>
            </div>
          </div>
        </div>
      )}

      {showProposalModal && (
        <ProposalOptionsModal
          onClose={() => setShowProposalModal(false)}
          onGenerate={handleGenerateProposal}
          locations={clientData.locations}
        />
      )}
    </div>
  );
};

export default Home;