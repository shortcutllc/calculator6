/**
 * Proposal Assembler — takes structured input from the API,
 * applies service defaults, builds the nested ProposalData structure,
 * and runs final calculations.
 *
 * Input: flat events array from API request
 * Output: complete ProposalData matching src/types/proposal.ts
 */

import {
  SERVICE_DEFAULTS,
  HEADSHOT_TIERS,
  MINDFULNESS_TYPES,
  isMindfulnessService,
  calculateServiceResults,
  recalculateProposalSummary
} from './pricing-engine.js';

/**
 * Apply service defaults to an event, filling in any missing fields.
 * Handles headshot tiers and mindfulness types as special cases.
 *
 * @param {object} event - Single event from the API input
 * @returns {object} Fully populated service object ready for calculation
 */
function applyServiceDefaults(event) {
  const serviceType = event.serviceType;
  const defaults = SERVICE_DEFAULTS[serviceType];

  if (!defaults) {
    throw new Error(`Unknown service type: "${serviceType}". Valid types: ${Object.keys(SERVICE_DEFAULTS).join(', ')}`);
  }

  // Start with defaults, then overlay user-provided values
  const service = {
    serviceType,
    appTime: defaults.appTime,
    totalHours: defaults.totalHours,
    numPros: defaults.numPros,
    proHourly: defaults.proHourly,
    hourlyRate: defaults.hourlyRate,
    earlyArrival: defaults.earlyArrival,
    retouchingCost: defaults.retouchingCost || 0,
    discountPercent: 0,
    isRecurring: false,
    // Carry through location name and date
    // locationName takes priority; fall back to location for backwards compatibility
    location: event.locationName || event.location || 'Main Office',
    date: normalizeDate(event.date || 'TBD'),
    // Store office address separately if provided
    officeAddress: event.officeAddress || null
  };

  // Apply headshot tier overrides
  if (serviceType === 'headshot' && event.headshotTier) {
    const tier = HEADSHOT_TIERS[event.headshotTier];
    if (tier) {
      service.appTime = tier.appTime;
      service.proHourly = tier.proHourly;
      service.retouchingCost = tier.retouchingCost;
      service.totalHours = tier.totalHours;
      service.numPros = tier.numPros;
      service.hourlyRate = tier.hourlyRate;
      service.earlyArrival = tier.earlyArrival;
    }
  }

  // Apply mindfulness type overrides
  if (isMindfulnessService(serviceType)) {
    // Copy mindfulness-specific defaults
    service.classLength = defaults.classLength;
    service.participants = defaults.participants || 'unlimited';
    service.fixedPrice = defaults.fixedPrice;

    // If a mindfulnessType is specified on the generic 'mindfulness' service type, apply it
    if (serviceType === 'mindfulness' && event.mindfulnessType) {
      const mindType = MINDFULNESS_TYPES[event.mindfulnessType];
      if (mindType) {
        service.classLength = mindType.classLength;
        service.fixedPrice = mindType.fixedPrice;
        service.appTime = mindType.appTime;
        service.totalHours = mindType.totalHours;
        service.mindfulnessType = event.mindfulnessType;
      }
    }
  }

  // Override with any user-provided values (these take precedence over defaults and tiers)
  if (event.totalHours !== undefined) service.totalHours = Number(event.totalHours);
  if (event.numPros !== undefined) service.numPros = Number(event.numPros);
  if (event.appTime !== undefined) service.appTime = Number(event.appTime);
  if (event.proHourly !== undefined) service.proHourly = Number(event.proHourly);
  if (event.hourlyRate !== undefined) service.hourlyRate = Number(event.hourlyRate);
  if (event.earlyArrival !== undefined) service.earlyArrival = Number(event.earlyArrival);
  if (event.retouchingCost !== undefined) service.retouchingCost = Number(event.retouchingCost);
  if (event.discountPercent !== undefined) service.discountPercent = Number(event.discountPercent);
  if (event.classLength !== undefined) service.classLength = Number(event.classLength);
  if (event.fixedPrice !== undefined) service.fixedPrice = Number(event.fixedPrice);
  if (event.participants !== undefined) service.participants = event.participants;

  // Massage type (chair, table, or general massage)
  if (serviceType === 'massage' && event.massageType) {
    service.massageType = event.massageType;
  }

  // Recurring settings
  if (event.isRecurring) {
    service.isRecurring = true;
    service.recurringFrequency = event.recurringFrequency || null;
  }

  return service;
}

/**
 * Normalize a date string to YYYY-MM-DD format.
 * Matches the normalizeDate function in proposalGenerator.ts
 */
function normalizeDate(dateInput) {
  if (!dateInput) return 'TBD';
  if (dateInput === 'TBD') return 'TBD';

  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return dateInput;
  }

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) {
    console.warn('Invalid date, using TBD:', dateInput);
    return 'TBD';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Build the nested ProposalData structure from a flat events array.
 *
 * Input shape (from API):
 * {
 *   clientName: "Burberry",
 *   clientEmail: "jane@burberry.com",
 *   clientLogoUrl: "https://...",
 *   locations: ["NYC Office"],
 *   events: [{ serviceType, location, date, totalHours, numPros, ... }],
 *   customization: { ... },
 *   gratuityType, gratuityValue,
 *   proposalType
 * }
 *
 * Output shape (ProposalData):
 * {
 *   clientName, clientEmail, clientLogoUrl,
 *   eventDates: ["2026-03-15"],
 *   locations: ["NYC Office"],
 *   services: {
 *     "NYC Office": {
 *       "2026-03-15": {
 *         services: [{ serviceType, totalHours, numPros, serviceCost, totalAppointments, ... }],
 *         totalCost: 1350,
 *         totalAppointments: 30
 *       }
 *     }
 *   },
 *   summary: { totalAppointments, totalEventCost, totalProRevenue, netProfit, profitMargin },
 *   gratuityType, gratuityValue
 * }
 */
function buildProposalData(input) {
  const { clientName, clientEmail, clientLogoUrl, events, gratuityType, gratuityValue } = input;

  if (!clientName) {
    throw new Error('clientName is required');
  }
  if (!events || !Array.isArray(events) || events.length === 0) {
    throw new Error('At least one event is required');
  }

  // Apply defaults and build full service objects
  const services = events.map(event => applyServiceDefaults(event));

  // Group services by location → date
  const servicesByLocation = {};
  const allLocations = new Set();
  const allDates = new Set();
  const officeLocations = {}; // Map of locationName → officeAddress

  services.forEach(service => {
    const location = service.location;
    const date = service.date;

    allLocations.add(location);
    allDates.add(date);

    // Track office addresses keyed by location name
    if (service.officeAddress && !officeLocations[location]) {
      officeLocations[location] = service.officeAddress;
    }

    if (!servicesByLocation[location]) {
      servicesByLocation[location] = {};
    }
    if (!servicesByLocation[location][date]) {
      servicesByLocation[location][date] = {
        services: [],
        totalCost: 0,
        totalAppointments: 0
      };
    }

    // Calculate this service's results
    const { totalAppointments, serviceCost, proRevenue } = calculateServiceResults(service);
    service.totalAppointments = totalAppointments;
    service.serviceCost = serviceCost;
    service.proRevenue = proRevenue;

    servicesByLocation[location][date].services.push(service);
  });

  // Sort dates (TBD at end)
  const sortedDates = Array.from(allDates).sort((a, b) => {
    if (a === 'TBD' && b === 'TBD') return 0;
    if (a === 'TBD') return 1;
    if (b === 'TBD') return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  });

  // Build the ProposalData structure
  const proposalData = {
    clientName,
    clientEmail: clientEmail || null,
    clientLogoUrl: clientLogoUrl || null,
    eventDates: sortedDates,
    locations: Array.from(allLocations),
    services: servicesByLocation,
    // Store office addresses mapped to location names (e.g., { "NYC": "350 5th Ave, New York NY" })
    officeLocations: Object.keys(officeLocations).length > 0 ? officeLocations : undefined,
    summary: {
      totalAppointments: 0,
      totalEventCost: 0,
      totalProRevenue: 0,
      netProfit: 0,
      profitMargin: 0
    },
    gratuityType: gratuityType || null,
    gratuityValue: gratuityValue || null
  };

  // Run full recalculation to ensure all totals are consistent
  return recalculateProposalSummary(proposalData);
}

/**
 * Full assembly pipeline: validate → defaults → build → calculate.
 *
 * @param {object} input - API request body for proposal creation
 * @returns {object} { proposalData, customization, proposalType }
 */
function assembleProposal(input) {
  // Validate required fields
  if (!input.clientName) {
    throw new Error('clientName is required');
  }
  if (!input.events || !Array.isArray(input.events) || input.events.length === 0) {
    throw new Error('At least one event is required in the events array');
  }

  // Validate each event has a serviceType
  input.events.forEach((event, index) => {
    if (!event.serviceType) {
      throw new Error(`Event at index ${index} is missing serviceType`);
    }
    if (!SERVICE_DEFAULTS[event.serviceType]) {
      throw new Error(`Event at index ${index} has invalid serviceType: "${event.serviceType}". Valid types: ${Object.keys(SERVICE_DEFAULTS).join(', ')}`);
    }
  });

  // Build the proposal data
  const proposalData = buildProposalData(input);

  // Build customization (with sensible defaults)
  const customization = {
    contactFirstName: '',
    contactLastName: '',
    customNote: '',
    programIntroCopy: '',
    includeSummary: true,
    includeCalculations: false,
    includeCalculator: false,
    ...(input.customization || {})
  };

  // Determine proposal type
  const hasMindfulness = input.events.some(e => isMindfulnessService(e.serviceType));
  const proposalType = input.proposalType || (hasMindfulness ? 'mindfulness-program' : 'event');

  return {
    proposalData,
    customization,
    proposalType
  };
}

export {
  applyServiceDefaults,
  buildProposalData,
  assembleProposal,
  normalizeDate
};
