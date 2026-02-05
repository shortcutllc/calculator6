/**
 * Reverse Calculator — given a target number of appointments,
 * calculate valid (hours, pros) combinations that fit within business constraints.
 *
 * Constraints:
 * - Max 8 hours per day (standard working day)
 * - Hours must land on 0.5-hour increments
 * - Minimum 0.5 hours, minimum 1 professional
 * - Appointments per pro per hour = 60 / appTime
 */

import { SERVICE_DEFAULTS, HEADSHOT_TIERS, MINDFULNESS_TYPES, calculateServiceResults } from './pricing-engine.js';

const MAX_HOURS_PER_DAY = 8;
const HOUR_INCREMENT = 0.5;
const MAX_PROS = 10;

/**
 * Round a number UP to the nearest 0.5 increment.
 * e.g., 3.33 → 3.5, 5.0 → 5.0, 2.1 → 2.5
 */
function roundUpToHalfHour(hours) {
  return Math.ceil(hours / HOUR_INCREMENT) * HOUR_INCREMENT;
}

/**
 * Calculate valid staffing options for a target number of appointments.
 *
 * @param {string} serviceType - Service type (massage, headshot, facial, etc.)
 * @param {number} targetAppointments - Desired number of appointments
 * @param {object} [overrides] - Optional overrides for service defaults (appTime, hourlyRate, etc.)
 * @returns {object} Result with options array and metadata
 */
function calculateEventOptions(serviceType, targetAppointments, overrides = {}) {
  // Mindfulness doesn't have a meaningful appointment count — return fixed-price options
  if (serviceType === 'mindfulness' || serviceType.startsWith('mindfulness-')) {
    return calculateMindfulnessOptions(serviceType);
  }

  const defaults = SERVICE_DEFAULTS[serviceType];
  if (!defaults) {
    return {
      success: false,
      error: `Unknown service type: ${serviceType}`,
      code: 'INVALID_SERVICE_TYPE'
    };
  }

  const appTime = overrides.appTime || defaults.appTime;
  const hourlyRate = overrides.hourlyRate || defaults.hourlyRate;
  const proHourly = overrides.proHourly || defaults.proHourly;
  const earlyArrival = overrides.earlyArrival || defaults.earlyArrival;
  const retouchingCost = overrides.retouchingCost || defaults.retouchingCost || 0;
  const apptsPerProPerHour = 60 / appTime;

  const options = [];

  for (let numPros = 1; numPros <= MAX_PROS; numPros++) {
    const exactHours = targetAppointments / (numPros * apptsPerProPerHour);

    // Skip if it would exceed max day or be too short
    if (exactHours > MAX_HOURS_PER_DAY) continue;
    if (exactHours < HOUR_INCREMENT) continue;

    const roundedHours = roundUpToHalfHour(exactHours);

    // After rounding, check we're still within max
    if (roundedHours > MAX_HOURS_PER_DAY) continue;

    const actualAppointments = Math.floor(roundedHours * numPros * apptsPerProPerHour);
    const exactMatch = actualAppointments === targetAppointments;

    // Calculate cost using the pricing engine's logic
    let estimatedCost;
    if (serviceType === 'headshot') {
      const proRevenue = roundedHours * numPros * proHourly;
      const retouchingTotal = actualAppointments * retouchingCost;
      estimatedCost = proRevenue + retouchingTotal;
    } else {
      estimatedCost = roundedHours * hourlyRate * numPros;
    }
    estimatedCost = Number(estimatedCost.toFixed(2));

    const option = {
      numPros,
      totalHours: roundedHours,
      actualAppointments,
      estimatedCost,
      exactMatch
    };

    // Add a note for non-exact matches
    if (!exactMatch) {
      const diff = actualAppointments - targetAppointments;
      if (diff > 0) {
        option.note = `${diff} extra appointment${diff !== 1 ? 's' : ''} (buffer)`;
      } else {
        option.note = `${Math.abs(diff)} fewer appointment${Math.abs(diff) !== 1 ? 's' : ''} than target`;
      }
    }

    options.push(option);
  }

  // Sort: exact matches first, then by fewest pros (simpler logistics)
  options.sort((a, b) => {
    if (a.exactMatch !== b.exactMatch) return a.exactMatch ? -1 : 1;
    return a.numPros - b.numPros;
  });

  // Deduplicate by cost — if two options have same cost and appointments, keep the one with fewer pros
  const seen = new Set();
  const deduped = options.filter(opt => {
    const key = `${opt.actualAppointments}-${opt.estimatedCost}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Return top 5 options
  const topOptions = deduped.slice(0, 5);

  return {
    success: true,
    serviceType,
    targetAppointments,
    appointmentTime: appTime,
    apptsPerProPerHour,
    options: topOptions,
    constraints: {
      maxHoursPerDay: MAX_HOURS_PER_DAY,
      validHourIncrements: generateHourIncrements()
    }
  };
}

/**
 * For mindfulness services, return the fixed-price options by type.
 * No reverse calculation needed — appointments are "unlimited."
 */
function calculateMindfulnessOptions(serviceType) {
  // If a specific mindfulness subtype was requested, return just that one
  const specificDefaults = SERVICE_DEFAULTS[serviceType];
  if (specificDefaults && serviceType !== 'mindfulness') {
    return {
      success: true,
      serviceType,
      targetAppointments: 'unlimited',
      options: [{
        name: serviceType,
        classLength: specificDefaults.classLength,
        fixedPrice: specificDefaults.fixedPrice,
        participants: 'unlimited',
        numPros: 1
      }],
      note: 'Mindfulness services have unlimited participants and fixed pricing.'
    };
  }

  // Return all mindfulness type options
  const options = Object.entries(MINDFULNESS_TYPES).map(([type, config]) => ({
    name: type,
    classLength: config.classLength,
    fixedPrice: config.fixedPrice,
    participants: 'unlimited',
    numPros: 1
  }));

  return {
    success: true,
    serviceType: 'mindfulness',
    targetAppointments: 'unlimited',
    options,
    note: 'Mindfulness services have unlimited participants and fixed pricing. Choose a type.'
  };
}

/**
 * Generate the list of valid hour increments (0.5 to 8 in 0.5 steps).
 */
function generateHourIncrements() {
  const increments = [];
  for (let h = HOUR_INCREMENT; h <= MAX_HOURS_PER_DAY; h += HOUR_INCREMENT) {
    increments.push(h);
  }
  return increments;
}

export {
  calculateEventOptions,
  MAX_HOURS_PER_DAY,
  HOUR_INCREMENT,
  MAX_PROS
};
