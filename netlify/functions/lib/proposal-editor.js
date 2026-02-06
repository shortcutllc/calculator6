/**
 * Proposal Editor — applies an array of discrete operations to an existing proposal.
 * After all operations are applied, recalculateProposalSummary() runs to reflow totals.
 *
 * Supports: add_service, remove_service, update_service, set_gratuity, remove_gratuity,
 * set_recurring, remove_recurring, set_discount, add_pricing_options, remove_pricing_options,
 * update_customization, update_client_info, set_status, add_location, remove_location
 */

import {
  SERVICE_DEFAULTS,
  HEADSHOT_TIERS,
  MINDFULNESS_TYPES,
  isMindfulnessService,
  calculateServiceResults,
  recalculateProposalSummary
} from './pricing-engine.js';
import { applyServiceDefaults, normalizeDate } from './proposal-assembler.js';

/**
 * Apply an array of operations to a proposal's data.
 *
 * @param {object} proposalData - The current ProposalData (from Supabase `data` column)
 * @param {object} customization - The current customization (from Supabase `customization` column)
 * @param {object} proposalRecord - Full proposal record (for fields like client_email, status)
 * @param {Array} operations - Array of operation objects
 * @returns {object} { proposalData, customization, proposalRecord, changesSummary }
 */
function applyOperations(proposalData, customization, proposalRecord, operations) {
  if (!Array.isArray(operations) || operations.length === 0) {
    throw new Error('At least one operation is required');
  }

  const changesSummary = [];

  for (const operation of operations) {
    if (!operation.op) {
      throw new Error('Each operation must have an "op" field');
    }

    const handler = OPERATION_HANDLERS[operation.op];
    if (!handler) {
      throw new Error(`Unknown operation: "${operation.op}". Valid operations: ${Object.keys(OPERATION_HANDLERS).join(', ')}`);
    }

    const change = handler(proposalData, customization, proposalRecord, operation);
    if (change) {
      changesSummary.push(change);
    }
  }

  // Recalculate all totals after all operations
  proposalData = recalculateProposalSummary(proposalData);

  return {
    proposalData,
    customization,
    proposalRecord,
    changesSummary
  };
}

// --- Operation Handlers ---

const OPERATION_HANDLERS = {
  add_service: handleAddService,
  remove_service: handleRemoveService,
  update_service: handleUpdateService,
  set_gratuity: handleSetGratuity,
  remove_gratuity: handleRemoveGratuity,
  set_recurring: handleSetRecurring,
  remove_recurring: handleRemoveRecurring,
  set_discount: handleSetDiscount,
  add_pricing_options: handleAddPricingOptions,
  remove_pricing_options: handleRemovePricingOptions,
  update_customization: handleUpdateCustomization,
  update_client_info: handleUpdateClientInfo,
  set_status: handleSetStatus,
  add_location: handleAddLocation,
  remove_location: handleRemoveLocation,
  rename_location: handleRenameLocation,
  change_date: handleChangeDate
};

/**
 * Add a new service to a location/date.
 * If the location or date doesn't exist yet, creates it.
 */
function handleAddService(proposalData, customization, proposalRecord, op) {
  // Support location from op.location, op.service.locationName, or op.service.location
  const location = op.location || (op.service && (op.service.locationName || op.service.location));
  const date = normalizeDate(op.date || (op.service && op.service.date) || 'TBD');

  if (!op.service || !op.service.serviceType) {
    throw new Error('add_service requires a "service" object with "serviceType"');
  }

  // Apply defaults to the new service
  const service = applyServiceDefaults({
    ...op.service,
    location,
    date
  });

  // Calculate results
  const { totalAppointments, serviceCost, proRevenue } = calculateServiceResults(service);
  service.totalAppointments = totalAppointments;
  service.serviceCost = serviceCost;
  service.proRevenue = proRevenue;

  // Ensure location exists
  if (!proposalData.services[location]) {
    proposalData.services[location] = {};
    if (!proposalData.locations.includes(location)) {
      proposalData.locations.push(location);
    }
  }

  // Ensure date exists within location
  if (!proposalData.services[location][date]) {
    proposalData.services[location][date] = {
      services: [],
      totalCost: 0,
      totalAppointments: 0
    };
  }

  proposalData.services[location][date].services.push(service);

  // Update eventDates if new date
  if (!proposalData.eventDates.includes(date)) {
    proposalData.eventDates.push(date);
    proposalData.eventDates.sort((a, b) => {
      if (a === 'TBD' && b === 'TBD') return 0;
      if (a === 'TBD') return 1;
      if (b === 'TBD') return -1;
      return new Date(a).getTime() - new Date(b).getTime();
    });
  }

  return {
    op: 'add_service',
    description: `Added ${service.serviceType} at ${location} on ${date}`
  };
}

/**
 * Remove a service by index from a location/date.
 * Cleans up empty dates and locations.
 */
function handleRemoveService(proposalData, customization, proposalRecord, op) {
  const { location, date, serviceIndex } = op;
  const normalizedDate = normalizeDate(date);

  validateServicePath(proposalData, location, normalizedDate, serviceIndex);

  const removed = proposalData.services[location][normalizedDate].services.splice(serviceIndex, 1)[0];

  // Clean up empty date
  if (proposalData.services[location][normalizedDate].services.length === 0) {
    delete proposalData.services[location][normalizedDate];

    // Clean up empty location
    if (Object.keys(proposalData.services[location]).length === 0) {
      delete proposalData.services[location];
      proposalData.locations = proposalData.locations.filter(l => l !== location);
    }

    // Clean up eventDates
    const dateStillUsed = Object.values(proposalData.services).some(locData =>
      Object.keys(locData).includes(normalizedDate)
    );
    if (!dateStillUsed) {
      proposalData.eventDates = proposalData.eventDates.filter(d => d !== normalizedDate);
    }
  }

  return {
    op: 'remove_service',
    description: `Removed ${removed.serviceType} from ${location} on ${normalizedDate}`
  };
}

/**
 * Update fields on an existing service.
 */
function handleUpdateService(proposalData, customization, proposalRecord, op) {
  const { location, date, serviceIndex, updates } = op;
  const normalizedDate = normalizeDate(date);

  if (!updates || typeof updates !== 'object') {
    throw new Error('update_service requires an "updates" object');
  }

  validateServicePath(proposalData, location, normalizedDate, serviceIndex);

  const service = proposalData.services[location][normalizedDate].services[serviceIndex];

  // Normalize field aliases (user-friendly names → internal field names)
  const fieldAliases = {
    appointmentTime: 'appTime',
    appointmentLength: 'appTime',
    proRate: 'proHourly',
    rate: 'hourlyRate',
    discount: 'discountPercent',
    hours: 'totalHours',
    pros: 'numPros',
    professionals: 'numPros'
  };

  // Apply updates (only allowed fields)
  const allowedFields = [
    'totalHours', 'numPros', 'appTime', 'proHourly', 'hourlyRate',
    'earlyArrival', 'retouchingCost', 'discountPercent', 'classLength',
    'fixedPrice', 'participants', 'mindfulnessType', 'headshotTier',
    'massageType'
  ];

  const appliedUpdates = [];
  for (let [key, value] of Object.entries(updates)) {
    // Resolve aliases
    if (fieldAliases[key]) {
      key = fieldAliases[key];
    }
    if (allowedFields.includes(key)) {
      // Handle headshotTier by applying tier defaults
      if (key === 'headshotTier' && service.serviceType === 'headshot') {
        const tier = HEADSHOT_TIERS[value];
        if (tier) {
          service.proHourly = tier.proHourly;
          service.retouchingCost = tier.retouchingCost;
          appliedUpdates.push(`headshotTier → ${value}`);
        }
      }
      // Handle mindfulnessType by applying type defaults
      else if (key === 'mindfulnessType' && isMindfulnessService(service.serviceType)) {
        const mindType = MINDFULNESS_TYPES[value];
        if (mindType) {
          service.classLength = mindType.classLength;
          service.fixedPrice = mindType.fixedPrice;
          service.appTime = mindType.appTime;
          service.totalHours = mindType.totalHours;
          service.mindfulnessType = value;
          appliedUpdates.push(`mindfulnessType → ${value}`);
        }
      }
      else {
        service[key] = typeof value === 'number' ? value : Number(value) || value;
        appliedUpdates.push(`${key} → ${value}`);
      }
    }
  }

  // Recalculate this service
  const { totalAppointments, serviceCost, proRevenue } = calculateServiceResults(service);
  service.totalAppointments = totalAppointments;
  service.serviceCost = serviceCost;
  service.proRevenue = proRevenue;

  return {
    op: 'update_service',
    description: `Updated ${service.serviceType} at ${location} on ${normalizedDate}: ${appliedUpdates.join(', ')}`
  };
}

/**
 * Set gratuity type and value.
 */
function handleSetGratuity(proposalData, customization, proposalRecord, op) {
  if (!op.type || !['percentage', 'dollar'].includes(op.type)) {
    throw new Error('set_gratuity requires "type" (percentage or dollar)');
  }
  if (op.value === undefined || op.value === null) {
    throw new Error('set_gratuity requires "value"');
  }

  proposalData.gratuityType = op.type;
  proposalData.gratuityValue = Number(op.value);

  return {
    op: 'set_gratuity',
    description: `Set gratuity to ${op.type === 'percentage' ? op.value + '%' : '$' + op.value}`
  };
}

/**
 * Remove gratuity.
 */
function handleRemoveGratuity(proposalData) {
  proposalData.gratuityType = null;
  proposalData.gratuityValue = null;

  return {
    op: 'remove_gratuity',
    description: 'Removed gratuity'
  };
}

/**
 * Set a service as recurring with a frequency.
 */
function handleSetRecurring(proposalData, customization, proposalRecord, op) {
  const { location, date, serviceIndex, frequency } = op;
  const normalizedDate = normalizeDate(date);

  if (!frequency || !frequency.type || !frequency.occurrences) {
    throw new Error('set_recurring requires "frequency" with "type" and "occurrences"');
  }

  validateServicePath(proposalData, location, normalizedDate, serviceIndex);

  const service = proposalData.services[location][normalizedDate].services[serviceIndex];
  service.isRecurring = true;
  service.recurringFrequency = {
    type: frequency.type,
    occurrences: Number(frequency.occurrences)
  };

  return {
    op: 'set_recurring',
    description: `Set ${service.serviceType} as recurring ${frequency.type} (${frequency.occurrences} events)`
  };
}

/**
 * Remove recurring designation from a service.
 */
function handleRemoveRecurring(proposalData, customization, proposalRecord, op) {
  const { location, date, serviceIndex } = op;
  const normalizedDate = normalizeDate(date);

  validateServicePath(proposalData, location, normalizedDate, serviceIndex);

  const service = proposalData.services[location][normalizedDate].services[serviceIndex];
  service.isRecurring = false;
  service.recurringFrequency = null;
  service.recurringDiscount = 0;

  return {
    op: 'remove_recurring',
    description: `Removed recurring from ${service.serviceType} at ${location}`
  };
}

/**
 * Set discount percentage on a service.
 */
function handleSetDiscount(proposalData, customization, proposalRecord, op) {
  const { location, date, serviceIndex, discountPercent } = op;
  const normalizedDate = normalizeDate(date);

  if (discountPercent === undefined || discountPercent === null) {
    throw new Error('set_discount requires "discountPercent"');
  }

  validateServicePath(proposalData, location, normalizedDate, serviceIndex);

  const service = proposalData.services[location][normalizedDate].services[serviceIndex];
  service.discountPercent = Number(discountPercent);

  return {
    op: 'set_discount',
    description: `Set ${discountPercent}% discount on ${service.serviceType} at ${location}`
  };
}

/**
 * Generate 3-tier pricing options for a service.
 * Mirrors generatePricingOptionsForService from proposalGenerator.ts
 */
function handleAddPricingOptions(proposalData, customization, proposalRecord, op) {
  const { location, date, serviceIndex } = op;
  const normalizedDate = normalizeDate(date);

  validateServicePath(proposalData, location, normalizedDate, serviceIndex);

  const service = proposalData.services[location][normalizedDate].services[serviceIndex];

  // Generate 3 options: standard, extended (125%), premium (150%)
  const baseResults = calculateServiceResults(service);

  const options = [];

  // Option 1: Standard (current config)
  options.push({
    name: 'Option 1',
    totalAppointments: baseResults.totalAppointments,
    totalHours: service.totalHours,
    numPros: service.numPros,
    hourlyRate: service.hourlyRate,
    serviceCost: baseResults.serviceCost,
    originalPrice: baseResults.originalPrice,
    discountPercent: service.discountPercent || 0
  });

  // Option 2: Extended (25% more hours)
  const extendedService = { ...service, totalHours: service.totalHours * 1.25 };
  const extendedResults = calculateServiceResults(extendedService);
  options.push({
    name: 'Option 2',
    totalAppointments: extendedResults.totalAppointments,
    totalHours: extendedService.totalHours,
    numPros: service.numPros,
    hourlyRate: service.hourlyRate,
    serviceCost: extendedResults.serviceCost,
    originalPrice: extendedResults.originalPrice,
    discountPercent: service.discountPercent || 0
  });

  // Option 3: Premium (50% more hours)
  const premiumService = { ...service, totalHours: service.totalHours * 1.5 };
  const premiumResults = calculateServiceResults(premiumService);
  options.push({
    name: 'Option 3',
    totalAppointments: premiumResults.totalAppointments,
    totalHours: premiumService.totalHours,
    numPros: service.numPros,
    hourlyRate: service.hourlyRate,
    serviceCost: premiumResults.serviceCost,
    originalPrice: premiumResults.originalPrice,
    discountPercent: service.discountPercent || 0
  });

  service.pricingOptions = options;
  service.selectedOption = 0; // Default to first option

  return {
    op: 'add_pricing_options',
    description: `Added 3 pricing options to ${service.serviceType} at ${location}`
  };
}

/**
 * Remove pricing options from a service.
 */
function handleRemovePricingOptions(proposalData, customization, proposalRecord, op) {
  const { location, date, serviceIndex } = op;
  const normalizedDate = normalizeDate(date);

  validateServicePath(proposalData, location, normalizedDate, serviceIndex);

  const service = proposalData.services[location][normalizedDate].services[serviceIndex];
  delete service.pricingOptions;
  delete service.selectedOption;

  return {
    op: 'remove_pricing_options',
    description: `Removed pricing options from ${service.serviceType} at ${location}`
  };
}

/**
 * Update proposal customization fields.
 */
function handleUpdateCustomization(proposalData, customization, proposalRecord, op) {
  if (!op.customization || typeof op.customization !== 'object') {
    throw new Error('update_customization requires a "customization" object');
  }

  const allowedFields = [
    'contactFirstName', 'contactLastName', 'customNote',
    'programIntroCopy', 'includeSummary', 'includeCalculations', 'includeCalculator'
  ];

  const appliedUpdates = [];
  for (const [key, value] of Object.entries(op.customization)) {
    if (allowedFields.includes(key)) {
      customization[key] = value;
      appliedUpdates.push(key);
    }
  }

  return {
    op: 'update_customization',
    description: `Updated customization: ${appliedUpdates.join(', ')}`
  };
}

/**
 * Update client info (email, logo, name).
 */
function handleUpdateClientInfo(proposalData, customization, proposalRecord, op) {
  const updates = [];

  if (op.clientName !== undefined) {
    proposalData.clientName = op.clientName;
    proposalRecord.client_name = op.clientName.trim();
    updates.push(`name → ${op.clientName}`);
  }
  if (op.clientEmail !== undefined) {
    proposalData.clientEmail = op.clientEmail;
    proposalRecord.client_email = op.clientEmail;
    updates.push(`email → ${op.clientEmail}`);
  }
  if (op.clientLogoUrl !== undefined) {
    proposalData.clientLogoUrl = op.clientLogoUrl;
    proposalRecord.client_logo_url = op.clientLogoUrl;
    updates.push('logo updated');
  }

  return {
    op: 'update_client_info',
    description: `Updated client info: ${updates.join(', ')}`
  };
}

/**
 * Change proposal status.
 */
function handleSetStatus(proposalData, customization, proposalRecord, op) {
  const validStatuses = ['draft', 'pending', 'approved', 'rejected'];
  if (!op.status || !validStatuses.includes(op.status)) {
    throw new Error(`set_status requires "status" to be one of: ${validStatuses.join(', ')}`);
  }

  proposalRecord.status = op.status;

  return {
    op: 'set_status',
    description: `Status changed to ${op.status}`
  };
}

/**
 * Add a new empty location to the proposal.
 */
function handleAddLocation(proposalData, customization, proposalRecord, op) {
  if (!op.location) {
    throw new Error('add_location requires "location"');
  }

  if (!proposalData.services[op.location]) {
    proposalData.services[op.location] = {};
  }
  if (!proposalData.locations.includes(op.location)) {
    proposalData.locations.push(op.location);
  }

  // Store office address if provided
  if (op.officeAddress) {
    if (!proposalData.officeLocations) {
      proposalData.officeLocations = {};
    }
    proposalData.officeLocations[op.location] = op.officeAddress;
  }

  return {
    op: 'add_location',
    description: `Added location: ${op.location}${op.officeAddress ? ` (${op.officeAddress})` : ''}`
  };
}

/**
 * Remove a location and all its services.
 */
function handleRemoveLocation(proposalData, customization, proposalRecord, op) {
  if (!op.location) {
    throw new Error('remove_location requires "location"');
  }

  if (!proposalData.services[op.location]) {
    throw new Error(`Location "${op.location}" not found in proposal`);
  }

  // Count what's being removed
  let servicesRemoved = 0;
  Object.values(proposalData.services[op.location]).forEach(dateData => {
    servicesRemoved += dateData.services.length;
  });

  // Remove location
  delete proposalData.services[op.location];
  proposalData.locations = proposalData.locations.filter(l => l !== op.location);

  // Clean up eventDates that may no longer be used
  const allDatesStillUsed = new Set();
  Object.values(proposalData.services).forEach(locData => {
    Object.keys(locData).forEach(date => allDatesStillUsed.add(date));
  });
  proposalData.eventDates = proposalData.eventDates.filter(d => allDatesStillUsed.has(d));

  return {
    op: 'remove_location',
    description: `Removed location "${op.location}" (${servicesRemoved} service${servicesRemoved !== 1 ? 's' : ''} removed)`
  };
}

/**
 * Rename a location (move all services to new key).
 */
function handleRenameLocation(proposalData, customization, proposalRecord, op) {
  const oldName = op.oldName || op.location;
  const newName = op.newName;

  if (!oldName || !newName) {
    throw new Error('rename_location requires "oldName" (or "location") and "newName"');
  }

  if (!proposalData.services[oldName]) {
    throw new Error(`Location "${oldName}" not found in proposal. Available: ${Object.keys(proposalData.services).join(', ')}`);
  }

  if (proposalData.services[newName]) {
    throw new Error(`Location "${newName}" already exists in proposal`);
  }

  // Move all services from old key to new key
  proposalData.services[newName] = proposalData.services[oldName];
  delete proposalData.services[oldName];

  // Update the location name on each service object
  Object.values(proposalData.services[newName]).forEach(dateData => {
    dateData.services.forEach(service => {
      service.location = newName;
    });
  });

  // Update locations array
  proposalData.locations = proposalData.locations.map(l => l === oldName ? newName : l);

  // Update officeLocations map if it exists
  if (proposalData.officeLocations && proposalData.officeLocations[oldName]) {
    proposalData.officeLocations[newName] = proposalData.officeLocations[oldName];
    delete proposalData.officeLocations[oldName];
  }

  return {
    op: 'rename_location',
    description: `Renamed location "${oldName}" to "${newName}"`
  };
}

/**
 * Change the date for all services at a location from oldDate to newDate.
 */
function handleChangeDate(proposalData, customization, proposalRecord, op) {
  const location = op.location;
  const oldDate = normalizeDate(op.oldDate || op.date);
  const newDate = normalizeDate(op.newDate);

  if (!location || !oldDate || !newDate) {
    throw new Error('change_date requires "location", "oldDate" (or "date"), and "newDate"');
  }

  if (!proposalData.services[location]) {
    throw new Error(`Location "${location}" not found in proposal. Available: ${Object.keys(proposalData.services).join(', ')}`);
  }

  if (!proposalData.services[location][oldDate]) {
    throw new Error(`Date "${oldDate}" not found at location "${location}". Available: ${Object.keys(proposalData.services[location]).join(', ')}`);
  }

  // Move all services from old date to new date
  const movingServices = proposalData.services[location][oldDate];

  if (proposalData.services[location][newDate]) {
    // Merge into existing date entry
    proposalData.services[location][newDate].services.push(...movingServices.services);
  } else {
    // Create new date entry
    proposalData.services[location][newDate] = movingServices;
  }

  // Update date on each service object
  proposalData.services[location][newDate].services.forEach(service => {
    service.date = newDate;
  });

  // Remove old date entry
  delete proposalData.services[location][oldDate];

  // Rebuild eventDates array
  const allDates = new Set();
  Object.values(proposalData.services).forEach(locData => {
    Object.keys(locData).forEach(date => allDates.add(date));
  });
  proposalData.eventDates = Array.from(allDates).sort((a, b) => {
    if (a === 'TBD' && b === 'TBD') return 0;
    if (a === 'TBD') return 1;
    if (b === 'TBD') return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  });

  return {
    op: 'change_date',
    description: `Changed date from ${oldDate} to ${newDate} at ${location}`
  };
}

// --- Helpers ---

/**
 * Validate that a location/date/serviceIndex path exists in the proposal.
 */
function validateServicePath(proposalData, location, date, serviceIndex) {
  if (!proposalData.services[location]) {
    throw new Error(`Location "${location}" not found in proposal. Available: ${Object.keys(proposalData.services).join(', ')}`);
  }
  if (!proposalData.services[location][date]) {
    throw new Error(`Date "${date}" not found at location "${location}". Available: ${Object.keys(proposalData.services[location]).join(', ')}`);
  }
  const services = proposalData.services[location][date].services;
  if (serviceIndex === undefined || serviceIndex === null) {
    throw new Error('serviceIndex is required');
  }
  if (serviceIndex < 0 || serviceIndex >= services.length) {
    throw new Error(`serviceIndex ${serviceIndex} is out of bounds. Location "${location}" date "${date}" has ${services.length} service(s) (indices 0-${services.length - 1})`);
  }
}

export {
  applyOperations
};
