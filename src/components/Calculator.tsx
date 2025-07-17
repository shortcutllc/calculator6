import React, { useState } from 'react';
import { Calculator as CalculatorIcon, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from './Button';

interface ServiceConfig {
  serviceType: string;
  totalHours: number;
  appTime: number;
  numPros: number;
  proHourly: number;
  hourlyRate: number;
  earlyArrival: number;
  retouchingCost?: number;
  discountPercent: number;
}

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

const Calculator: React.FC = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<ServiceConfig>({
    serviceType: 'massage',
    totalHours: 4,
    appTime: 20,
    numPros: 2,
    proHourly: 50,
    hourlyRate: 135,
    earlyArrival: 25,
    discountPercent: 0
  });

  const calculateResults = (service: ServiceConfig) => {
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

    const netProfit = serviceCost - proRevenue;
    const profitMargin = serviceCost > 0 ? (netProfit / serviceCost) * 100 : 0;

    return {
      totalAppointments: totalAppts,
      serviceCost: Number(serviceCost.toFixed(2)),
      proRevenue: Number(proRevenue.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
      profitMargin: Number(profitMargin.toFixed(1))
    };
  };

  const updateConfig = (updates: Partial<ServiceConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const applyServiceDefaults = (serviceType: string) => {
    const defaults = SERVICE_DEFAULTS[serviceType as keyof typeof SERVICE_DEFAULTS];
    if (defaults) {
      setConfig(prev => ({
        ...prev,
        serviceType,
        ...defaults
      }));
    }
  };

  const applyHeadshotPreset = (preset: 'basic' | 'premium' | 'executive') => {
    const presetData = HEADSHOT_PRESETS[preset];
    setConfig(prev => ({
      ...prev,
      serviceType: 'headshot',
      ...presetData
    }));
  };

  const results = calculateResults(config);

  return (
    <div className="min-h-screen bg-neutral-gray">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              <h1 className="text-3xl font-bold text-shortcut-blue flex items-center">
                <CalculatorIcon className="w-8 h-8 mr-3 text-shortcut-coral" />
                Wellness Calculator
              </h1>
              <p className="text-neutral-dark mt-1">Play with numbers and see real-time calculations</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Panel */}
          <div className="bg-neutral-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6 text-shortcut-blue">Service Configuration</h2>
            
            <div className="space-y-4">
              {/* Service Type */}
              <div>
                <label className="block text-sm font-medium text-neutral-dark mb-2">
                  Service Type
                </label>
                <select
                  value={config.serviceType}
                  onChange={(e) => applyServiceDefaults(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-coral focus:border-transparent"
                >
                  <option value="massage">Massage</option>
                  <option value="facial">Facial</option>
                  <option value="hair">Hair</option>
                  <option value="nails">Nails</option>
                  <option value="headshot">Headshot</option>
                </select>
              </div>

              {/* Headshot Presets */}
              {config.serviceType === 'headshot' && (
                <div>
                  <label className="block text-sm font-medium text-neutral-dark mb-2">
                    Headshot Presets
                  </label>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => applyHeadshotPreset('basic')}
                      variant="secondary"
                      size="sm"
                    >
                      Basic
                    </Button>
                    <Button
                      onClick={() => applyHeadshotPreset('premium')}
                      variant="secondary"
                      size="sm"
                    >
                      Premium
                    </Button>
                    <Button
                      onClick={() => applyHeadshotPreset('executive')}
                      variant="secondary"
                      size="sm"
                    >
                      Executive
                    </Button>
                  </div>
                </div>
              )}

              {/* Total Hours */}
              <div>
                <label className="block text-sm font-medium text-neutral-dark mb-2">
                  Total Hours
                </label>
                <input
                  type="number"
                  value={config.totalHours}
                  onChange={(e) => updateConfig({ totalHours: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-coral focus:border-transparent"
                  min="0"
                  step="0.5"
                />
              </div>

              {/* Appointment Time */}
              <div>
                <label className="block text-sm font-medium text-neutral-dark mb-2">
                  Appointment Time (minutes)
                </label>
                <input
                  type="number"
                  value={config.appTime}
                  onChange={(e) => updateConfig({ appTime: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-coral focus:border-transparent"
                  min="1"
                />
              </div>

              {/* Number of Professionals */}
              <div>
                <label className="block text-sm font-medium text-neutral-dark mb-2">
                  Number of Professionals
                </label>
                <input
                  type="number"
                  value={config.numPros}
                  onChange={(e) => updateConfig({ numPros: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-coral focus:border-transparent"
                  min="1"
                />
              </div>

              {/* Professional Hourly Rate */}
              <div>
                <label className="block text-sm font-medium text-neutral-dark mb-2">
                  Professional Hourly Rate
                </label>
                <input
                  type="number"
                  value={config.proHourly}
                  onChange={(e) => updateConfig({ proHourly: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-coral focus:border-transparent"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Service Hourly Rate */}
              <div>
                <label className="block text-sm font-medium text-neutral-dark mb-2">
                  Service Hourly Rate
                </label>
                <input
                  type="number"
                  value={config.hourlyRate}
                  onChange={(e) => updateConfig({ hourlyRate: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-coral focus:border-transparent"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Early Arrival Fee */}
              <div>
                <label className="block text-sm font-medium text-neutral-dark mb-2">
                  Early Arrival Fee
                </label>
                <input
                  type="number"
                  value={config.earlyArrival}
                  onChange={(e) => updateConfig({ earlyArrival: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-coral focus:border-transparent"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Retouching Cost (Headshot only) */}
              {config.serviceType === 'headshot' && (
                <div>
                  <label className="block text-sm font-medium text-neutral-dark mb-2">
                    Retouching Cost per Photo
                  </label>
                  <input
                    type="number"
                    value={config.retouchingCost || 0}
                    onChange={(e) => updateConfig({ retouchingCost: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-coral focus:border-transparent"
                    min="0"
                    step="0.01"
                  />
                </div>
              )}

              {/* Discount Percentage */}
              <div>
                <label className="block text-sm font-medium text-neutral-dark mb-2">
                  Discount Percentage
                </label>
                <input
                  type="number"
                  value={config.discountPercent}
                  onChange={(e) => updateConfig({ discountPercent: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-coral focus:border-transparent"
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="space-y-6">
            {/* Main Results */}
            <div className="bg-neutral-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-6 text-shortcut-blue">Calculation Results</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-neutral-dark">Total Appointments:</span>
                  <span className="text-2xl font-bold text-shortcut-blue">{results.totalAppointments}</span>
                </div>
                
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-neutral-dark">Service Cost:</span>
                  <span className="text-2xl font-bold text-shortcut-coral">${results.serviceCost}</span>
                </div>
                
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-neutral-dark">Professional Revenue:</span>
                  <span className="text-2xl font-bold text-shortcut-teal">${results.proRevenue}</span>
                </div>
                
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-neutral-dark">Net Profit:</span>
                  <span className={`text-2xl font-bold ${results.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${results.netProfit}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-3">
                  <span className="text-neutral-dark">Profit Margin:</span>
                  <span className={`text-2xl font-bold ${results.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {results.profitMargin}%
                  </span>
                </div>
              </div>
            </div>

            {/* Calculation Details */}
            <div className="bg-neutral-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4 text-shortcut-blue">Calculation Details</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-dark">Appointments per hour per pro:</span>
                  <span className="font-medium text-shortcut-blue">{Math.round(60 / config.appTime * 100) / 100}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-neutral-dark">Total appointments per hour:</span>
                  <span className="font-medium text-shortcut-blue">{Math.round((60 / config.appTime) * config.numPros * 100) / 100}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-neutral-dark">Professional cost per hour:</span>
                  <span className="font-medium text-shortcut-blue">${config.proHourly * config.numPros}</span>
                </div>
                
                {config.serviceType !== 'headshot' && (
                  <div className="flex justify-between">
                    <span className="text-neutral-dark">Early arrival total:</span>
                    <span className="font-medium text-shortcut-blue">${config.earlyArrival * config.numPros}</span>
                  </div>
                )}
                
                {config.serviceType === 'headshot' && (
                  <div className="flex justify-between">
                    <span className="text-neutral-dark">Retouching total:</span>
                    <span className="font-medium text-shortcut-blue">${(config.retouchingCost || 0) * results.totalAppointments}</span>
                  </div>
                )}
                
                {config.discountPercent > 0 && (
                  <div className="flex justify-between">
                    <span className="text-neutral-dark">Discount applied:</span>
                    <span className="font-medium text-green-600">-{config.discountPercent}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calculator; 