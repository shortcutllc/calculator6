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
    appTime: 60,
    totalHours: 1,
    numPros: 1,
    proHourly: 0,
    hourlyRate: 0,
    earlyArrival: 0,
    retouchingCost: 0,
    classLength: 60,
    participants: 'unlimited',
    fixedPrice: 1350
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
    } else if (service.serviceType === 'mindfulness') {
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
      if (options.officeLocation) {
        proposalData.officeLocation = options.officeLocation;
      }

      const proposalId = await createProposal(proposalData, options.customization, options.clientEmail);
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
    <div className="min-h-screen bg-gray-100">
      {!showDashboard ? (
        <div className="max-w-2xl mx-auto p-4 sm:p-8">
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-shortcut-blue">Create New Proposal</h1>
            <form onSubmit={handleStartCalculation}>
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Client Name
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter client name"
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Locations
                </label>
                {locations.map((location, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => updateLocation(index, e.target.value)}
                      className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter location"
                    />
                    {locations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLocation(index)}
                        className="p-2 text-red-600 hover:text-red-800"
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addLocation}
                  className="flex items-center text-blue-600 hover:text-blue-800 mt-2"
                >
                  <Plus size={20} className="mr-1" />
                  Add Location
                </button>
              </div>
              
              <button
                type="submit"
                className="w-full px-6 py-3 bg-[#FF5050] text-white font-bold rounded-full hover:bg-[#E84848] transition-colors"
              >
                Start Calculation
              </button>
            </form>
          </div>
        </div>
      ) : showResults ? (
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setShowResults(false)}
                variant="secondary"
              >
                Back to Calculator
              </Button>
              <h1 className="text-2xl sm:text-3xl font-bold text-shortcut-blue">
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

          <div className="bg-white rounded-lg shadow-md p-4 sm:p-8 mb-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-6 text-gray-800">Event Details</h2>
            <div className="grid gap-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Client Name:</span>
                <span className="font-semibold">{clientData.name}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Total Appointments:</span>
                <span className="font-semibold">{calculationResults?.totalAppointments}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Total Event Cost:</span>
                <span className="font-semibold">${calculationResults?.totalCost.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {Object.entries(calculationResults?.locationBreakdown || {}).map(([location, locationData]) => (
            <div key={location} className="bg-white rounded-lg shadow-md p-4 sm:p-8 mb-8">
              <h2 className="text-xl sm:text-2xl font-bold mb-6 text-gray-800">{location}</h2>
              
              {Object.entries(locationData.dateBreakdown).map(([date, dateData], dateIndex) => (
                <div key={date} className="mb-8">
                  <h3 className="text-lg sm:text-xl font-semibold mb-4">Day {dateIndex + 1} - {date}</h3>
                  
                  {dateData.services.map((service, serviceIndex) => (
                    <div key={serviceIndex} className="bg-gray-50 rounded-lg p-4 sm:p-6 mb-4">
                      <h4 className="font-semibold mb-3">Service {serviceIndex + 1}: {service.serviceType}</h4>
                      <div className="grid gap-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Hours:</span>
                          <span>{service.totalHours} hours</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Number of Professionals:</span>
                          <span>{service.numPros}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Appointments:</span>
                          <span>{service.totalAppointments}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Service Cost:</span>
                          <span>${service.serviceCost.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="bg-blue-50 rounded-lg p-4 sm:p-6">
                    <h4 className="font-semibold mb-3">Day {dateIndex + 1} Totals</h4>
                    <div className="grid gap-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Appointments:</span>
                        <span>{dateData.totalAppointments}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Cost:</span>
                        <span>${dateData.totalCost.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="bg-gray-100 rounded-lg p-4 sm:p-6">
                <h4 className="font-semibold mb-3">{location} Totals</h4>
                <div className="grid gap-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Appointments:</span>
                    <span>{locationData.totalAppointments}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Cost:</span>
                    <span>${locationData.totalCost.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="bg-shortcut-blue text-white rounded-lg shadow-md p-4 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-white">Event Summary</h2>
            <div className="grid gap-4 text-white">
              <div className="flex justify-between items-center py-2 border-b border-white/20">
                <span>Total Appointments:</span>
                <span className="font-semibold">{calculationResults?.totalAppointments}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/20">
                <span>Total Event Cost:</span>
                <span className="font-semibold">${calculationResults?.totalCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/20">
                <span>Professional Revenue:</span>
                <span className="font-semibold">${calculationResults?.totalProRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/20">
                <span>Net Profit:</span>
                <span className="font-semibold">${calculationResults?.netProfit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span>Profit Margin:</span>
                <span className="font-semibold">{calculationResults?.profitMargin.toFixed(1)}%</span>
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-shortcut-blue">
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
            <div key={`preview-${JSON.stringify(previewResults)}`} className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Calculator size={20} className="text-shortcut-blue" />
                <h3 className="text-xl font-semibold text-shortcut-blue">Calculation Preview</h3>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                Your calculation preview appears automatically after adding events. You can remove specific services or events, then click "Use This Calculation" to proceed or "Clear Preview" to start over.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-gray-800 mb-3">Quick Summary</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total Appointments:</span>
                    <div className="font-semibold text-gray-800">{previewResults.totalAppointments}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Cost:</span>
                    <div className="font-semibold text-gray-800">${previewResults.totalCost.toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Net Profit:</span>
                    <div className="font-semibold text-gray-800">${previewResults.netProfit.toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Profit Margin:</span>
                    <div className="font-semibold text-gray-800">{previewResults.profitMargin.toFixed(1)}%</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {Object.entries(previewResults.locationBreakdown).map(([location, locationData]) => (
                  <div key={location} className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-3">{location}</h4>
                    <div className="space-y-2">
                      {Object.entries(locationData.dateBreakdown).map(([date, dateData]) => (
                        <div key={date} className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="font-medium text-gray-800">{date === 'TBD' ? 'TBD' : date}:</span>
                              <span className="ml-2 text-gray-600">
                                {dateData.services.length} service{dateData.services.length !== 1 ? 's' : ''} • 
                                {dateData.totalAppointments} appointments • 
                                ${dateData.totalCost.toFixed(2)}
                              </span>
                            </div>
                            <button
                              onClick={() => removeEventFromPreview(location, date)}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                              title="Remove this event"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          {dateData.services.length > 0 && (
                            <div className="ml-4 space-y-1">
                              {dateData.services.map((service, serviceIndex) => (
                                <div key={serviceIndex} className="flex justify-between items-center text-sm py-1">
                                  <span className="text-gray-700">
                                    {service.serviceType} • {service.totalHours}h • {service.numPros} pros • ${service.serviceCost.toFixed(2)}
                                  </span>
                                  <button
                                    onClick={() => removeServiceFromPreview(location, date, serviceIndex)}
                                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                    title="Remove this service"
                                  >
                                    <X size={12} />
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
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <h3 className="text-xl font-semibold mb-4 text-shortcut-blue">{location}</h3>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Add Event In {currentLocation}
              </h2>
              <button
                onClick={() => setShowEventModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            {services.map((service, index) => {
              const serviceResults = calculateServiceResults(service);
              const totalAppointments = serviceResults.totalAppointments;
              const serviceCost = serviceResults.serviceCost;
              
              return (
                <div
                  key={index}
                  className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Service #{index + 1}
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                        Total Appointments: {totalAppointments}
                      </div>
                      <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                        Total Cost: ${serviceCost.toFixed(2)}
                      </div>
                      <button
                        onClick={() => removeService(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
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
                        className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          service.date === 'TBD' ? 'bg-gray-100 text-gray-500' : ''
                        }`}
                      />
                      <label className="flex items-center gap-2 text-sm text-gray-700">
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
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        TBD
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">
                        Service Type
                      </label>
                      <select
                        value={service.serviceType}
                        onChange={(e) =>
                          updateService(index, { serviceType: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="massage">Massage</option>
                        <option value="facial">Facial</option>
                        <option value="hair">Hair</option>
                        <option value="nails">Nails</option>
                        <option value="headshot">Headshots</option>
                        <option value="mindfulness">Mindfulness</option>
                        <option value="hair-makeup">Hair + Makeup</option>
                        <option value="headshot-hair-makeup">Hair + Makeup for Headshots</option>
                      </select>
                    </div>

                    {service.serviceType === 'headshot' && (
                      <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">
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
                              className={`flex-1 px-3 py-2 rounded-lg border ${
                                service.proHourly ===
                                HEADSHOT_PRESETS[preset as keyof typeof HEADSHOT_PRESETS]
                                  .proHourly
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white text-gray-700 hover:bg-gray-50'
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
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                          Massage Type
                        </label>
                        <select
                          value={service.massageType || 'massage'}
                          onChange={(e) =>
                            updateService(index, { massageType: e.target.value as 'chair' | 'table' | 'massage' })
                          }
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="massage">General Massage</option>
                          <option value="chair">Chair Massage</option>
                          <option value="table">Table Massage</option>
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">
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
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        step="0.25"
                        min="0"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">
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
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">
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
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {service.serviceType !== 'headshot' && (
                      <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">
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
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    {service.serviceType === 'headshot' && (
                      <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">
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
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    {service.serviceType !== 'headshot' && (
                      <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">
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
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">
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
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">
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
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Mindfulness-specific fields */}
                    {service.serviceType === 'mindfulness' && (
                      <>
                        <div>
                          <label className="block text-gray-700 text-sm font-bold mb-2">
                            Class Length (minutes)
                          </label>
                          <select
                            value={service.classLength || 60}
                            onChange={(e) =>
                              updateService(index, {
                                classLength: parseInt(e.target.value) || 60,
                                fixedPrice: e.target.value === '60' ? 1350 : 1125
                              })
                            }
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value={60}>60 minutes - Intro to Mindfulness ($1,350)</option>
                            <option value={30}>30 minutes - Drop-in Session ($1,125)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-gray-700 text-sm font-bold mb-2">
                            Participants
                          </label>
                          <div className="flex gap-2">
                            <label className="flex items-center">
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
                                className="mr-2"
                              />
                              Unlimited
                            </label>
                            <label className="flex items-center">
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
                                className="mr-2"
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
                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
                              placeholder="Number of participants"
                            />
                          )}
                        </div>

                        <div>
                          <label className="block text-gray-700 text-sm font-bold mb-2">
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
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            <div className="flex gap-4">
              <button
                onClick={() => addService('same-day')}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus size={20} className="mr-2" />
                Add Same Day Service
              </button>
              <button
                onClick={() => addService('new-day')}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Plus size={20} className="mr-2" />
                Add New Day Service
              </button>
            </div>

            <div className="mt-6">
              <button
                onClick={handleSaveEvent}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Event
              </button>
            </div>
          </div>
        </div>
      )}

      {showProposalModal && (
        <ProposalOptionsModal
          onClose={() => setShowProposalModal(false)}
          onGenerate={handleGenerateProposal}
        />
      )}
    </div>
  );
};

export default Home;