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
  // Mindfulness-specific fields
  classLength?: number;
  participants?: string | number;
  fixedPrice?: number;
  // Massage-specific fields
  massageType?: 'chair' | 'table' | 'massage';
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
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <Button
            onClick={() => navigate('/')}
            variant="secondary"
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Button>
        </div>

        {/* Centered Title Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-shortcut-blue flex items-center justify-center mb-2">
            <CalculatorIcon className="w-8 h-8 mr-3 text-red-500" />
            Wellness Calculator
          </h1>
          <p className="text-gray-600">Play with numbers and see real-time calculations</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Input Panel */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-bold mb-8 text-shortcut-blue">Service Configuration</h2>
            
            <div className="space-y-6">
              {/* Service Type */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  Service Type
                </label>
                <select
                  value={config.serviceType}
                  onChange={(e) => applyServiceDefaults(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-blue focus:border-transparent font-medium"
                >
                  <option value="massage">Massage</option>
                  <option value="facial">Facial</option>
                  <option value="hair">Hair</option>
                  <option value="nails">Nails</option>
                  <option value="headshot">Headshot</option>
                  <option value="mindfulness">Mindfulness Meditation</option>
                  <option value="mindfulness-soles">Grounding Under Pressure: The Soles of the Feet Practice</option>
                  <option value="mindfulness-movement">Ground & Reset: Cultivating Mindfulness Through Movement and Stillness</option>
                  <option value="mindfulness-pro">Mindfulness: PRO Practice</option>
                  <option value="mindfulness-cle">Mindfulness: CLE Ethics Program</option>
                  <option value="mindfulness-pro-reactivity">Pause, Relax, Open: Mindfulness Tools to Step Out of Reactivity and Response Wisely</option>
                  <option value="hair-makeup">Hair + Makeup</option>
                  <option value="headshot-hair-makeup">Hair + Makeup for Headshots</option>
                </select>
              </div>

              {/* Headshot Presets */}
              {config.serviceType === 'headshot' && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <label className="block text-sm font-semibold text-gray-600 mb-3">
                    Headshot Presets
                  </label>
                  <div className="flex space-x-3">
                    <Button
                      onClick={() => applyHeadshotPreset('basic')}
                      variant="secondary"
                      size="sm"
                      className="bg-white hover:bg-gray-50 border border-gray-300"
                    >
                      Basic
                    </Button>
                    <Button
                      onClick={() => applyHeadshotPreset('premium')}
                      variant="secondary"
                      size="sm"
                      className="bg-white hover:bg-gray-50 border border-gray-300"
                    >
                      Premium
                    </Button>
                    <Button
                      onClick={() => applyHeadshotPreset('executive')}
                      variant="secondary"
                      size="sm"
                      className="bg-white hover:bg-gray-50 border border-gray-300"
                    >
                      Executive
                    </Button>
                  </div>
                </div>
              )}

              {/* Massage Type */}
              {config.serviceType === 'massage' && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <label className="block text-sm font-semibold text-gray-600 mb-2">
                    Massage Type
                  </label>
                  <select
                    value={config.massageType || 'massage'}
                    onChange={(e) => updateConfig({ massageType: e.target.value as 'chair' | 'table' | 'massage' })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-blue focus:border-transparent font-medium"
                  >
                    <option value="massage">General Massage</option>
                    <option value="chair">Chair Massage</option>
                    <option value="table">Table Massage</option>
                  </select>
                </div>
              )}

              {/* Total Hours */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  Total Hours
                </label>
                <input
                  type="number"
                  value={config.totalHours}
                  onChange={(e) => updateConfig({ totalHours: Number(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-blue focus:border-transparent font-medium"
                  min="0"
                  step="0.5"
                />
              </div>

              {/* Appointment Time */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  Appointment Time (minutes)
                </label>
                <input
                  type="number"
                  value={config.appTime}
                  onChange={(e) => updateConfig({ appTime: Number(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-blue focus:border-transparent font-medium"
                  min="1"
                />
              </div>

              {/* Number of Professionals */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  Number of Professionals
                </label>
                <input
                  type="number"
                  value={config.numPros}
                  onChange={(e) => updateConfig({ numPros: Number(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-blue focus:border-transparent font-medium"
                  min="1"
                />
              </div>

              {/* Professional Hourly Rate */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  Professional Hourly Rate
                </label>
                <input
                  type="number"
                  value={config.proHourly}
                  onChange={(e) => updateConfig({ proHourly: Number(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-blue focus:border-transparent font-medium"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Service Hourly Rate */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  Service Hourly Rate
                </label>
                <input
                  type="number"
                  value={config.hourlyRate}
                  onChange={(e) => updateConfig({ hourlyRate: Number(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-blue focus:border-transparent font-medium"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Early Arrival Fee */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  Early Arrival Fee
                </label>
                <input
                  type="number"
                  value={config.earlyArrival}
                  onChange={(e) => updateConfig({ earlyArrival: Number(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-blue focus:border-transparent font-medium"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Retouching Cost (Headshot only) */}
              {config.serviceType === 'headshot' && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <label className="block text-sm font-semibold text-gray-600 mb-2">
                    Retouching Cost per Photo
                  </label>
                  <input
                    type="number"
                    value={config.retouchingCost || 0}
                    onChange={(e) => updateConfig({ retouchingCost: Number(e.target.value) })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-blue focus:border-transparent font-medium"
                    min="0"
                    step="0.01"
                  />
                </div>
              )}

              {/* Discount Percentage */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  Discount Percentage
                </label>
                <input
                  type="number"
                  value={config.discountPercent}
                  onChange={(e) => updateConfig({ discountPercent: Number(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-blue focus:border-transparent font-medium"
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="space-y-8">
            {/* Main Results - Matching ProposalViewer Event Summary styling */}
            <div className="bg-shortcut-blue text-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold mb-6 text-white">Calculation Results</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-white/20">
                  <span>Total Appointments:</span>
                  <span className="font-semibold">{results.totalAppointments}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-white/20">
                  <span>Service Cost:</span>
                  <span className="font-semibold">${results.serviceCost}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-white/20">
                  <span>Professional Revenue:</span>
                  <span className="font-semibold">${results.proRevenue}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-white/20">
                  <span>Net Profit:</span>
                  <span className="font-semibold">${results.netProfit}</span>
                </div>
                
                <div className="flex justify-between items-center py-2">
                  <span>Profit Margin:</span>
                  <span className="font-semibold">{results.profitMargin}%</span>
                </div>
              </div>
            </div>

            {/* Calculation Details - Matching ProposalViewer Notes styling */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h3 className="text-2xl font-bold mb-6 text-shortcut-blue">Calculation Details</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-base text-gray-700">Appointments per hour per pro:</span>
                  <span className="font-semibold text-gray-900">{Math.round(60 / config.appTime * 100) / 100}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-base text-gray-700">Total appointments per hour:</span>
                  <span className="font-semibold text-gray-900">{Math.round((60 / config.appTime) * config.numPros * 100) / 100}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-base text-gray-700">Professional cost per hour:</span>
                  <span className="font-semibold text-gray-900">${config.proHourly * config.numPros}</span>
                </div>
                
                {config.serviceType !== 'headshot' && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-base text-gray-700">Early arrival total:</span>
                    <span className="font-semibold text-gray-900">${config.earlyArrival * config.numPros}</span>
                  </div>
                )}
                
                {config.serviceType === 'headshot' && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-base text-gray-700">Retouching total:</span>
                    <span className="font-semibold text-gray-900">${(config.retouchingCost || 0) * results.totalAppointments}</span>
                  </div>
                )}
                
                {config.discountPercent > 0 && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-base text-gray-700">Discount applied:</span>
                    <span className="font-semibold text-green-600">-{config.discountPercent}%</span>
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