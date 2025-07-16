import React, { useState } from 'react';
import { Plus, Trash, Calculator as CalculatorIcon, ArrowLeft, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from './Button';

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
  location: ''
};

const Calculator: React.FC = () => {
  const navigate = useNavigate();
  const [clientName, setClientName] = useState('');
  const [locations, setLocations] = useState(['']);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [currentLocation, setCurrentLocation] = useState('');
  const [clientData, setClientData] = useState<ClientData>({
    name: '',
    locations: [],
    events: {}
  });
  const [calculationResults, setCalculationResults] = useState<CalculationResults | null>(null);
  const [services, setServices] = useState<Service[]>([]);

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

      events.forEach(event => {
        event.services.forEach(service => {
          const serviceResults = calculateServiceResults(service);
          
          if (!results.locationBreakdown[location].dateBreakdown[service.date]) {
            results.locationBreakdown[location].dateBreakdown[service.date] = {
              totalAppointments: 0,
              totalCost: 0,
              services: []
            };
          }

          results.locationBreakdown[location].dateBreakdown[service.date].services.push({
            serviceType: service.serviceType,
            totalHours: service.totalHours,
            numPros: service.numPros,
            totalAppointments: serviceResults.totalAppointments,
            serviceCost: serviceResults.serviceCost
          });

          results.locationBreakdown[location].dateBreakdown[service.date].totalAppointments += serviceResults.totalAppointments;
          results.locationBreakdown[location].dateBreakdown[service.date].totalCost += serviceResults.serviceCost;
          
          results.locationBreakdown[location].totalAppointments += serviceResults.totalAppointments;
          results.locationBreakdown[location].totalCost += serviceResults.serviceCost;
          
          results.totalAppointments += serviceResults.totalAppointments;
          results.totalCost += serviceResults.serviceCost;
          results.totalProRevenue += serviceResults.proRevenue;
        });
      });
    });

    results.netProfit = results.totalCost - results.totalProRevenue;
    results.profitMargin = results.totalCost > 0 ? (results.netProfit / results.totalCost) * 100 : 0;

    setCalculationResults(results);
    setShowResults(true);
  };

  const handleSaveEvent = () => {
    if (!currentLocation || services.length === 0) {
      alert('Please add at least one service to this event.');
      return;
    }

    const events = services.map(service => ({
      clientName: clientData.name,
      date: service.date,
      services: [service]
    }));

    setClientData(prev => ({
      ...prev,
      events: {
        ...prev.events,
        [currentLocation]: events
      }
    }));

    setServices([]);
    setShowEventModal(false);
    setCurrentLocation('');
  };

  const addLocation = () => {
    setLocations([...locations, '']);
  };

  const removeLocation = (index: number) => {
    const newLocations = locations.filter((_, i) => i !== index);
    setLocations(newLocations);
  };

  const updateLocation = (index: number, value: string) => {
    const newLocations = [...locations];
    newLocations[index] = value;
    setLocations(newLocations);
  };

  const handleStartCalculation = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientName.trim()) {
      alert('Please enter a client name.');
      return;
    }

    const validLocations = locations.filter(loc => loc.trim() !== '');
    if (validLocations.length === 0) {
      alert('Please add at least one location.');
      return;
    }

    setClientData({
      name: clientName.trim(),
      locations: validLocations,
      events: {}
    });
  };

  const showEventModalForLocation = (location: string) => {
    setCurrentLocation(location);
    setServices([]);
    setShowEventModal(true);
  };

  const addService = (type: 'same-day' | 'new-day' = 'same-day') => {
    const newService = { ...DEFAULT_SERVICE };
    
    if (type === 'new-day') {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      newService.date = tomorrow.toISOString().split('T')[0];
    } else if (services.length > 0) {
      newService.date = services[0].date;
    } else {
      newService.date = new Date().toISOString().split('T')[0];
    }
    
    newService.location = currentLocation;
    setServices([...services, newService]);
  };

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const updateService = (index: number, updates: Partial<Service>) => {
    const updatedServices = services.map((service, i) => 
      i === index ? { ...service, ...updates } : service
    );
    setServices(updatedServices);
  };

  const applyHeadshotPreset = (index: number, preset: 'basic' | 'premium' | 'executive') => {
    const presetData = HEADSHOT_PRESETS[preset];
    updateService(index, {
      serviceType: 'headshot',
      ...presetData
    });
  };

  const applyServiceDefaults = (index: number, serviceType: string) => {
    const defaults = SERVICE_DEFAULTS[serviceType as keyof typeof SERVICE_DEFAULTS];
    if (defaults) {
      updateService(index, {
        serviceType,
        ...defaults
      });
    }
  };

  const resetCalculator = () => {
    setClientName('');
    setLocations(['']);
    setClientData({
      name: '',
      locations: [],
      events: {}
    });
    setCalculationResults(null);
    setShowResults(false);
    setServices([]);
    setShowEventModal(false);
    setCurrentLocation('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => navigate('/')}
              variant="secondary"
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <CalculatorIcon className="w-8 h-8 mr-3 text-shortcut-blue" />
                Wellness Calculator
              </h1>
              <p className="text-gray-600 mt-1">Calculate costs and appointments for wellness events</p>
            </div>
          </div>
        </div>

        {!showResults ? (
          <div className="space-y-8">
            {/* Client Setup */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Client Information</h2>
              <form onSubmit={handleStartCalculation} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client Name
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-shortcut-blue focus:border-transparent"
                    placeholder="Enter client name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Locations
                  </label>
                  {locations.map((location, index) => (
                    <div key={index} className="flex space-x-2 mb-2">
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => updateLocation(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-shortcut-blue focus:border-transparent"
                        placeholder="Enter location name"
                        required
                      />
                      {locations.length > 1 && (
                        <Button
                          onClick={() => removeLocation(index)}
                          variant="secondary"
                          className="px-3"
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    onClick={addLocation}
                    variant="secondary"
                    className="mt-2"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Location
                  </Button>
                </div>

                <Button type="submit" variant="primary" className="w-full">
                  Start Calculation
                </Button>
              </form>
            </div>

            {/* Events Setup */}
            {clientData.name && clientData.locations.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Event Setup</h2>
                <div className="space-y-4">
                  {clientData.locations.map((location, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <span className="font-medium">{location}</span>
                      <Button
                        onClick={() => showEventModalForLocation(location)}
                        variant="primary"
                      >
                        Add Event
                      </Button>
                    </div>
                  ))}
                </div>

                {Object.keys(clientData.events).length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-3">Current Events</h3>
                    {Object.entries(clientData.events).map(([location, events]) => (
                      <div key={location} className="mb-4 p-4 border border-gray-200 rounded-lg">
                        <h4 className="font-medium text-shortcut-blue">{location}</h4>
                        <p className="text-sm text-gray-600">
                          {events.length} event{events.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    ))}
                    <Button
                      onClick={calculateResults}
                      variant="primary"
                      className="w-full mt-4"
                    >
                      Calculate Results
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Results Display */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Calculation Results</h2>
              <Button onClick={resetCalculator} variant="secondary">
                New Calculation
              </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Appointments</h3>
                <p className="text-3xl font-bold text-shortcut-blue">
                  {calculationResults?.totalAppointments}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Cost</h3>
                <p className="text-3xl font-bold text-green-600">
                  ${calculationResults?.totalCost.toFixed(2)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Net Profit</h3>
                <p className="text-3xl font-bold text-blue-600">
                  ${calculationResults?.netProfit.toFixed(2)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Profit Margin</h3>
                <p className="text-3xl font-bold text-purple-600">
                  {calculationResults?.profitMargin.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Location Breakdown */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold mb-4">Location Breakdown</h3>
              <div className="space-y-4">
                {Object.entries(calculationResults?.locationBreakdown || {}).map(([location, data]) => (
                  <div key={location} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-lg text-shortcut-blue mb-2">{location}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Total Appointments:</span>
                        <span className="ml-2 font-medium">{data.totalAppointments}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Cost:</span>
                        <span className="ml-2 font-medium">${data.totalCost.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <Button onClick={() => setShowResults(false)} variant="secondary">
                Back to Calculator
              </Button>
              <Button onClick={() => navigate('/')} variant="primary">
                Create Proposal
              </Button>
            </div>
          </div>
        )}

        {/* Event Modal */}
        {showEventModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Add Event for {currentLocation}</h2>
                  <Button
                    onClick={() => setShowEventModal(false)}
                    variant="secondary"
                    className="p-2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="p-6">
                <div className="flex space-x-2 mb-4">
                  <Button onClick={() => addService('same-day')} variant="secondary">
                    Add Service (Same Day)
                  </Button>
                  <Button onClick={() => addService('new-day')} variant="secondary">
                    Add Service (New Day)
                  </Button>
                </div>

                {services.map((service, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Service {index + 1}</h3>
                      <Button
                        onClick={() => removeService(index)}
                        variant="secondary"
                        className="p-2"
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Service Type
                        </label>
                        <select
                          value={service.serviceType}
                          onChange={(e) => {
                            updateService(index, { serviceType: e.target.value });
                            applyServiceDefaults(index, e.target.value);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-shortcut-blue focus:border-transparent"
                        >
                          <option value="massage">Massage</option>
                          <option value="facial">Facial</option>
                          <option value="hair">Hair</option>
                          <option value="nails">Nails</option>
                          <option value="headshot">Headshot</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date
                        </label>
                        <input
                          type="date"
                          value={service.date}
                          onChange={(e) => updateService(index, { date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-shortcut-blue focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Total Hours
                        </label>
                        <input
                          type="number"
                          value={service.totalHours}
                          onChange={(e) => updateService(index, { totalHours: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-shortcut-blue focus:border-transparent"
                          min="0"
                          step="0.5"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Appointment Time (minutes)
                        </label>
                        <input
                          type="number"
                          value={service.appTime}
                          onChange={(e) => updateService(index, { appTime: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-shortcut-blue focus:border-transparent"
                          min="1"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Number of Professionals
                        </label>
                        <input
                          type="number"
                          value={service.numPros}
                          onChange={(e) => updateService(index, { numPros: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-shortcut-blue focus:border-transparent"
                          min="1"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Professional Hourly Rate
                        </label>
                        <input
                          type="number"
                          value={service.proHourly}
                          onChange={(e) => updateService(index, { proHourly: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-shortcut-blue focus:border-transparent"
                          min="0"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Service Hourly Rate
                        </label>
                        <input
                          type="number"
                          value={service.hourlyRate}
                          onChange={(e) => updateService(index, { hourlyRate: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-shortcut-blue focus:border-transparent"
                          min="0"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Early Arrival Fee
                        </label>
                        <input
                          type="number"
                          value={service.earlyArrival}
                          onChange={(e) => updateService(index, { earlyArrival: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-shortcut-blue focus:border-transparent"
                          min="0"
                          step="0.01"
                        />
                      </div>

                      {service.serviceType === 'headshot' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Retouching Cost per Photo
                          </label>
                          <input
                            type="number"
                            value={service.retouchingCost || 0}
                            onChange={(e) => updateService(index, { retouchingCost: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-shortcut-blue focus:border-transparent"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Discount Percentage
                        </label>
                        <input
                          type="number"
                          value={service.discountPercent}
                          onChange={(e) => updateService(index, { discountPercent: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-shortcut-blue focus:border-transparent"
                          min="0"
                          max="100"
                          step="0.1"
                        />
                      </div>
                    </div>

                    {service.serviceType === 'headshot' && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Headshot Presets
                        </label>
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => applyHeadshotPreset(index, 'basic')}
                            variant="secondary"
                            size="sm"
                          >
                            Basic
                          </Button>
                          <Button
                            onClick={() => applyHeadshotPreset(index, 'premium')}
                            variant="secondary"
                            size="sm"
                          >
                            Premium
                          </Button>
                          <Button
                            onClick={() => applyHeadshotPreset(index, 'executive')}
                            variant="secondary"
                            size="sm"
                          >
                            Executive
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Service Results Preview */}
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-sm mb-2">Preview Results:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Appointments:</span>
                          <span className="ml-2 font-medium">
                            {calculateServiceResults(service).totalAppointments}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Service Cost:</span>
                          <span className="ml-2 font-medium">
                            ${calculateServiceResults(service).serviceCost.toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Pro Revenue:</span>
                          <span className="ml-2 font-medium">
                            ${calculateServiceResults(service).proRevenue.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex justify-end space-x-4 mt-6">
                  <Button onClick={() => setShowEventModal(false)} variant="secondary">
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEvent} variant="primary">
                    Save Event
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Calculator; 