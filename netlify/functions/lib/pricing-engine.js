/**
 * Pricing Engine — ported from src/utils/proposalGenerator.ts
 * Calculates service costs, appointments, and proposal summaries.
 * ESM module for use in Netlify serverless functions.
 */

import { holidayComboActive, holidayComboSavings, COMBINE_PCT } from './holiday-packages.js';
import { OPTION_FIELDS } from './client-picks.js';

// Service defaults matching src/components/Calculator.tsx SERVICE_DEFAULTS
const SERVICE_DEFAULTS = {
  massage: {
    appTime: 20,
    totalHours: 4,
    numPros: 2,
    proHourly: 50,
    hourlyRate: 150,
    earlyArrival: 25,
    retouchingCost: 0
  },
  facial: {
    appTime: 20,
    totalHours: 4,
    numPros: 2,
    proHourly: 50,
    hourlyRate: 150,
    earlyArrival: 25,
    retouchingCost: 0
  },
  hair: {
    appTime: 30,
    totalHours: 6,
    numPros: 2,
    proHourly: 50,
    hourlyRate: 150,
    earlyArrival: 25,
    retouchingCost: 0
  },
  nails: {
    appTime: 30,
    totalHours: 6,
    numPros: 2,
    proHourly: 50,
    hourlyRate: 150,
    earlyArrival: 25,
    retouchingCost: 0
  },
  'nails-hand-massage': {
    appTime: 35,
    totalHours: 6,
    numPros: 2,
    proHourly: 50,
    hourlyRate: 150,
    earlyArrival: 25,
    retouchingCost: 0
  },
  makeup: {
    appTime: 30,
    totalHours: 4,
    numPros: 2,
    proHourly: 50,
    hourlyRate: 150,
    earlyArrival: 25,
    retouchingCost: 0
  },
  headshot: {
    appTime: 8,
    totalHours: 5,
    numPros: 1,
    proHourly: 400,
    hourlyRate: 0,
    earlyArrival: 0,
    retouchingCost: 25
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
    hourlyRate: 150,
    earlyArrival: 25,
    retouchingCost: 0
  },
  'headshot-hair-makeup': {
    appTime: 20,
    totalHours: 4,
    numPros: 2,
    proHourly: 50,
    hourlyRate: 150,
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
  },
  // Assisted stretch: one-on-one appointments, priced like massage.
  stretch: {
    appTime: 20,
    totalHours: 4,
    numPros: 2,
    proHourly: 50,
    hourlyRate: 150,
    earlyArrival: 25,
    retouchingCost: 0
  },
  // Flat-price group classes, at their 60 minute catalog price
  // (src/utils/soundBathCatalog, yogaCatalog, movementCatalog). They were
  // missing here, so Pro and the API could not add one and a class priced
  // at $0. A 30 minute class passes its own classLength and fixedPrice.
  'sound-bath': {
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
  yoga: {
    appTime: 60,
    totalHours: 1,
    numPros: 1,
    proHourly: 0,
    hourlyRate: 0,
    earlyArrival: 0,
    retouchingCost: 0,
    classLength: 60,
    participants: 'unlimited',
    fixedPrice: 1250
  },
  'crystal-sound-bath': {
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
  'somatic-sound-bath': {
    appTime: 60,
    totalHours: 1,
    numPros: 1,
    proHourly: 0,
    hourlyRate: 0,
    earlyArrival: 0,
    retouchingCost: 0,
    classLength: 60,
    participants: 'unlimited',
    fixedPrice: 1750
  },
  'stretch-mobility': {
    appTime: 60,
    totalHours: 1,
    numPros: 1,
    proHourly: 0,
    hourlyRate: 0,
    earlyArrival: 0,
    retouchingCost: 0,
    classLength: 60,
    participants: 'unlimited',
    fixedPrice: 1250
  },
  'dance-cardio': {
    appTime: 60,
    totalHours: 1,
    numPros: 1,
    proHourly: 0,
    hourlyRate: 0,
    earlyArrival: 0,
    retouchingCost: 0,
    classLength: 60,
    participants: 'unlimited',
    fixedPrice: 1250
  },
  'strength-sculpt': {
    appTime: 60,
    totalHours: 1,
    numPros: 1,
    proHourly: 0,
    hourlyRate: 0,
    earlyArrival: 0,
    retouchingCost: 0,
    classLength: 60,
    participants: 'unlimited',
    fixedPrice: 1250
  }
};

const HEADSHOT_TIERS = {
  basic: {
    appTime: 8,
    proHourly: 400,
    retouchingCost: 25,
    totalHours: 5,
    numPros: 1,
    hourlyRate: 0,
    earlyArrival: 0
  },
  premium: {
    appTime: 8,
    proHourly: 500,
    retouchingCost: 50,
    totalHours: 5,
    numPros: 1,
    hourlyRate: 0,
    earlyArrival: 0
  },
  executive: {
    appTime: 8,
    proHourly: 600,
    retouchingCost: 60,
    totalHours: 5,
    numPros: 1,
    hourlyRate: 0,
    earlyArrival: 0
  }
};

const MINDFULNESS_TYPES = {
  'intro': { classLength: 45, fixedPrice: 1375, appTime: 45, totalHours: 0.75 },
  'drop-in': { classLength: 30, fixedPrice: 1250, appTime: 30, totalHours: 0.5 },
  'mindful-movement': { classLength: 60, fixedPrice: 1500, appTime: 60, totalHours: 1 }
};

function isMindfulnessService(serviceType) {
  return serviceType === 'mindfulness' ||
    serviceType === 'mindfulness-soles' ||
    serviceType === 'mindfulness-movement' ||
    serviceType === 'mindfulness-pro' ||
    serviceType === 'mindfulness-cle' ||
    serviceType === 'mindfulness-pro-reactivity';
}

/** The 2026 movement and sound classes (src/utils/movementCatalog.ts). */
const MOVEMENT_SERVICE_TYPES = ['crystal-sound-bath', 'somatic-sound-bath', 'stretch-mobility', 'dance-cardio', 'strength-sculpt'];

/**
 * Group classes priced at one flat `fixedPrice` with unlimited attendance.
 * Mirrors isFlatPriceService in src/utils/proposalGenerator.ts.
 */
function isFlatPriceService(serviceType) {
  return isMindfulnessService(serviceType) ||
    serviceType === 'sound-bath' ||
    serviceType === 'yoga' ||
    MOVEMENT_SERVICE_TYPES.includes(serviceType);
}

/**
 * Re-prices every guest-count option against the service as it stands (the
 * service's discount wins over any stored on an option), then mirrors the
 * selected option's price onto the service. Same rules as the client engine,
 * so an edit from Pro or the API never moves a price the client view shows.
 */
function priceOptions(service) {
  const discountPercent = service.discountPercent || 0;
  service.pricingOptions = service.pricingOptions.map((option) => {
    const optionService = { ...service, discountPercent };
    for (const k of OPTION_FIELDS) if (option[k] !== undefined) optionService[k] = option[k];
    const r = calculateServiceResults(optionService);
    return {
      ...option,
      totalAppointments: r.totalAppointments,
      serviceCost: r.serviceCost,
      originalPrice: r.originalPrice || option.originalPrice,
      discountPercent,
      proRevenue: r.proRevenue,
    };
  });
  const chosen = service.pricingOptions[service.selectedOption || 0];
  if (!chosen) return;
  service.totalAppointments = chosen.totalAppointments;
  service.serviceCost = chosen.serviceCost;
  service.proRevenue = chosen.proRevenue;
  service.originalPrice = chosen.originalPrice;
}

/**
 * How many portraits a headshot service bills retouching for: `retouchCount`
 * when set (holiday packages bill per person, like the www page), otherwise
 * every bookable slot. Mirrors retouchedPortraits in proposalGenerator.ts.
 */
function retouchedPortraits(service, totalAppts) {
  if (service.retouchCount != null && Number.isFinite(Number(service.retouchCount))) return Number(service.retouchCount);
  return typeof totalAppts === 'number' ? totalAppts : 0;
}

/**
 * Calculate recurring discount based on frequency.
 * Matches proposalGenerator.ts calculateRecurringDiscount
 */
function calculateRecurringDiscount(frequency) {
  if (!frequency) return 0;
  const occurrences = frequency.occurrences;
  if (occurrences >= 9) return 15;
  if (occurrences >= 4) return 10;
  return 0;
}

/**
 * Calculate results for a single service.
 * Ported from proposalGenerator.ts calculateServiceResults (lines 49-108)
 */
function calculateServiceResults(service) {
  const isMindfulness = isFlatPriceService(service.serviceType);

  if (!isMindfulness && (!service.appTime || !service.numPros || !service.totalHours)) {
    return { totalAppointments: 0, serviceCost: 0, proRevenue: 0, originalPrice: 0, recurringDiscount: 0, recurringSavings: 0 };
  }

  const apptsPerHourPerPro = service.appTime ? 60 / service.appTime : 0;
  const totalApptsPerHour = apptsPerHourPerPro * (service.numPros || 0);
  const totalAppts = isMindfulness ? 'unlimited' : Math.floor((service.totalHours || 0) * totalApptsPerHour);

  let serviceCost = 0;
  let proRevenue = 0;

  if (service.serviceType === 'headshot') {
    const photographerCost = service.totalHours * service.numPros * (service.proHourly || 0);
    const retouchingTotal = retouchedPortraits(service, totalAppts) * (service.retouchingCost || 0);
    serviceCost = photographerCost + retouchingTotal;
    proRevenue = serviceCost * 0.80; // 80% to Pro, 20% to Shortcut
  } else if (isMindfulness) {
    serviceCost = service.fixedPrice || 1375;
    proRevenue = serviceCost * 0.3;
  } else {
    serviceCost = service.totalHours * (service.hourlyRate || 0) * service.numPros;
    proRevenue = (service.totalHours * service.numPros * (service.proHourly || 0)) +
                 ((service.earlyArrival || 0) * service.numPros);
  }

  const originalPrice = serviceCost;

  if (service.discountPercent > 0) {
    serviceCost = serviceCost * (1 - (service.discountPercent / 100));
  }

  let recurringDiscount = 0;
  let recurringSavings = 0;
  if (service.isRecurring && service.recurringFrequency) {
    recurringDiscount = calculateRecurringDiscount(service.recurringFrequency);
    if (recurringDiscount > 0) {
      recurringSavings = serviceCost * (recurringDiscount / 100);
      serviceCost = serviceCost * (1 - (recurringDiscount / 100));
    }
  }

  return {
    totalAppointments: totalAppts,
    serviceCost: Number(serviceCost.toFixed(2)),
    proRevenue: Number(proRevenue.toFixed(2)),
    originalPrice: Number(originalPrice.toFixed(2)),
    recurringDiscount,
    recurringSavings: Number(recurringSavings.toFixed(2))
  };
}

/**
 * Recalculate all totals for a ProposalData structure.
 * Simplified port of proposalGenerator.ts recalculateServiceTotals (lines 439-775)
 * Handles the standard { [location]: { [date]: { services, totalCost, totalAppointments } } } structure.
 */

/** A conference or multi-day event: data.eventType 'conference', or every
 *  location named "..., Day N". Mirrors src/components/proposal/summaryGroups.ts. */
function isMultiDayEvent(proposalData) {
  if (proposalData && proposalData.eventType === 'conference') return true;
  const locations = Object.keys((proposalData && proposalData.services) || {});
  return locations.length > 1 && locations.every((l) => /(?:^|[,·|–-]\s*|\s)day\s*(\d+)\s*$/i.test(l));
}

function recalculateProposalSummary(proposalData) {
  const summary = {
    totalAppointments: 0,
    totalEventCost: 0,
    totalProRevenue: 0,
    netProfit: 0,
    profitMargin: 0,
    gratuityAmount: 0,
    subtotalBeforeGratuity: 0
  };

  Object.entries(proposalData.services || {}).forEach(([location, locationData]) => {
    Object.entries(locationData).forEach(([date, dayData]) => {
      let dayTotalCost = 0;
      let dayTotalAppointments = 0;
      let dayTotalProRevenue = 0;

      dayData.services.forEach((service) => {
        // Sync mindfulness fields
        if (service.serviceType === 'mindfulness') {
          if (service.mindfulnessType === 'drop-in') {
            service.classLength = 30;
            service.fixedPrice = 1250;
          } else if (service.mindfulnessType === 'mindful-movement') {
            service.classLength = 60;
            service.fixedPrice = 1500;
          } else {
            service.classLength = service.classLength || 45;
            service.fixedPrice = service.fixedPrice || 1375;
            service.mindfulnessType = service.mindfulnessType || 'intro';
          }
        }

        const { totalAppointments, serviceCost, proRevenue, originalPrice, recurringDiscount, recurringSavings } = calculateServiceResults(service);
        service.totalAppointments = totalAppointments;
        service.serviceCost = serviceCost;
        service.proRevenue = proRevenue;
        service.originalPrice = originalPrice;
        service.recurringDiscount = recurringDiscount;
        service.recurringSavings = recurringSavings;
        service.date = date;
        // A guest-count option the client chose sets the price, not the base.
        if (Array.isArray(service.pricingOptions) && service.pricingOptions.length > 0) priceOptions(service);

        dayTotalCost += service.serviceCost;
        if (typeof service.totalAppointments === 'number') {
          dayTotalAppointments += service.totalAppointments;
        }
        dayTotalProRevenue += service.proRevenue;
      });

      dayData.totalCost = Number(dayTotalCost.toFixed(2));
      dayData.totalAppointments = dayTotalAppointments;

      summary.totalAppointments += dayTotalAppointments;
      summary.totalEventCost += dayTotalCost;
      summary.totalProRevenue += dayTotalProRevenue;
    });
  });

  // Update eventDates from services
  const allDates = new Set();
  Object.values(proposalData.services || {}).forEach((locationData) => {
    Object.keys(locationData).forEach(date => allDates.add(date));
  });
  proposalData.eventDates = Array.from(allDates).sort((a, b) => {
    const aIsTBD = a === 'TBD' || (typeof a === 'string' && a.startsWith('TBD-'));
    const bIsTBD = b === 'TBD' || (typeof b === 'string' && b.startsWith('TBD-'));
    if (aIsTBD && bIsTBD) return a.localeCompare(b);
    if (aIsTBD) return 1;
    if (bIsTBD) return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  });

  // Calculate gratuity
  let gratuityAmount = 0;
  const subtotalBeforeGratuity = summary.totalEventCost;

  if (proposalData.gratuityType && proposalData.gratuityValue) {
    if (proposalData.gratuityType === 'percentage') {
      gratuityAmount = subtotalBeforeGratuity * (proposalData.gratuityValue / 100);
    } else if (proposalData.gratuityType === 'dollar') {
      gratuityAmount = proposalData.gratuityValue;
    }
    gratuityAmount = Number(gratuityAmount.toFixed(2));
    summary.totalEventCost = Number((subtotalBeforeGratuity + gratuityAmount).toFixed(2));
  }

  summary.gratuityAmount = gratuityAmount;
  summary.subtotalBeforeGratuity = subtotalBeforeGratuity;

  // Net profit based on subtotal (gratuity doesn't affect profit)
  const netProfitBeforeGratuity = subtotalBeforeGratuity - summary.totalProRevenue;
  summary.netProfit = Number(netProfitBeforeGratuity.toFixed(2));
  summary.profitMargin = subtotalBeforeGratuity > 0
    ? Number(((netProfitBeforeGratuity / subtotalBeforeGratuity) * 100).toFixed(2))
    : 0;

  proposalData.summary = summary;

  // Auto-recurring: Apply recurring discount when 4+ unique dates exist
  // Only apply if no services are already manually marked as recurring
  const uniqueDateCount = (proposalData.eventDates || []).filter(d => d !== 'TBD').length;
  let hasManualRecurring = false;

  Object.values(proposalData.services || {}).forEach((locationData) => {
    Object.values(locationData).forEach((dateData) => {
      (dateData.services || []).forEach((service) => {
        if (service.isRecurring && service.recurringFrequency) {
          hasManualRecurring = true;
        }
      });
    });
  });

  const isExplicitlyDisabled = proposalData.isAutoRecurring === false && proposalData.autoRecurringDiscount === undefined;
  const hasManualAutoRecurring = proposalData.isAutoRecurring === true && proposalData.autoRecurringDiscount !== undefined;

  let autoRecurringDiscount;
  if (isExplicitlyDisabled) {
    autoRecurringDiscount = undefined;
  } else if (hasManualAutoRecurring) {
    autoRecurringDiscount = proposalData.autoRecurringDiscount;
  } else if (!hasManualRecurring && isMultiDayEvent(proposalData)) {
    // Conference or multi-day event: flat 10%, the same rule as the client
    // viewer (src/utils/proposalGenerator.ts, proposal/summaryGroups.ts).
    autoRecurringDiscount = 10;
  } else if (uniqueDateCount >= 4 && !hasManualRecurring) {
    autoRecurringDiscount = uniqueDateCount >= 9 ? 15 : 10;
  }

  if (autoRecurringDiscount && autoRecurringDiscount > 0 && !hasManualRecurring) {
    const discountMultiplier = autoRecurringDiscount / 100;
    const originalSubtotalBeforeGratuity = subtotalBeforeGratuity;
    let totalSavings = 0;
    let newTotalProRevenue = 0;

    // Apply per-service discounts with headshot-specific logic
    Object.entries(proposalData.services || {}).forEach(([location, locationData]) => {
      Object.entries(locationData).forEach(([date, dayData]) => {
        let discountedDayCost = 0;
        let dayProRevenue = 0;

        (dayData.services || []).forEach((service) => {
          service.originalServiceCost = service.serviceCost;

          if (service.serviceType === 'headshot') {
            // For headshots: only discount photographer hourly, NOT retouching
            // Derive photographer cost from existing serviceCost (not base params)
            // because pricing options may override totalHours/numPros
            const retouchingTotal = retouchedPortraits(service, service.totalAppointments) * (service.retouchingCost || 0);
            const photographerCost = service.serviceCost - retouchingTotal;
            const discountedPhotographerCost = photographerCost * (1 - discountMultiplier);
            service.serviceCost = Number((discountedPhotographerCost + retouchingTotal).toFixed(2));
            service.discountedProHourly = Number(((service.proHourly || 0) * (1 - discountMultiplier)).toFixed(2));
            // Recalculate proRevenue on discounted cost (80/20 split)
            const newProRevenue = Number((service.serviceCost * 0.80).toFixed(2));
            dayProRevenue += newProRevenue;
          } else {
            service.serviceCost = Number((service.originalServiceCost * (1 - discountMultiplier)).toFixed(2));
            dayProRevenue += service.proRevenue || 0;
          }

          totalSavings += service.originalServiceCost - service.serviceCost;
          discountedDayCost += service.serviceCost;
        });

        dayData.originalTotalCost = dayData.totalCost;
        dayData.totalCost = Number(discountedDayCost.toFixed(2));
        newTotalProRevenue += dayProRevenue;
      });
    });

    const autoRecurringSavings = Number(totalSavings.toFixed(2));
    const discountedSubtotal = Number((originalSubtotalBeforeGratuity - autoRecurringSavings).toFixed(2));

    let newGratuityAmount = 0;
    if (proposalData.gratuityType && proposalData.gratuityValue) {
      if (proposalData.gratuityType === 'percentage') {
        newGratuityAmount = discountedSubtotal * (proposalData.gratuityValue / 100);
      } else if (proposalData.gratuityType === 'dollar') {
        newGratuityAmount = proposalData.gratuityValue;
      }
      newGratuityAmount = Number(newGratuityAmount.toFixed(2));
    }

    summary.subtotalBeforeGratuity = discountedSubtotal;
    summary.gratuityAmount = newGratuityAmount;
    summary.totalEventCost = Number((discountedSubtotal + newGratuityAmount).toFixed(2));
    summary.totalProRevenue = Number(newTotalProRevenue.toFixed(2));
    summary.originalSubtotalBeforeGratuity = originalSubtotalBeforeGratuity;
    summary.originalTotalEventCost = Number((originalSubtotalBeforeGratuity + gratuityAmount).toFixed(2));

    const newNetProfit = discountedSubtotal - summary.totalProRevenue;
    summary.netProfit = Number(newNetProfit.toFixed(2));
    summary.profitMargin = discountedSubtotal > 0
      ? Number(((newNetProfit / discountedSubtotal) * 100).toFixed(2))
      : 0;

    proposalData.isAutoRecurring = true;
    proposalData.autoRecurringDiscount = autoRecurringDiscount;
    proposalData.autoRecurringSavings = autoRecurringSavings;
  } else {
    proposalData.isAutoRecurring = false;
    proposalData.autoRecurringDiscount = undefined;
    proposalData.autoRecurringSavings = undefined;

    Object.values(proposalData.services || {}).forEach((locationData) => {
      Object.values(locationData).forEach((dayData) => {
        delete dayData.originalTotalCost;
        (dayData.services || []).forEach((service) => {
          delete service.originalServiceCost;
          delete service.discountedProHourly;
        });
      });
    });
  }


  applyHolidayCombo(proposalData);

  return proposalData;
}

/**
 * Holiday packages: combine-and-save, 10% of each visit with two or more
 * services (lib/holiday-packages.js). Unlike the volume discount it is not
 * baked into the service prices, because the client viewer recomputes it as
 * services are switched on and off (Create Your Own drops it below two). So
 * the services keep their full price and the saving is a summary line.
 * Mirrors applyHolidayCombo in src/utils/proposalGenerator.ts.
 */
function applyHolidayCombo(proposalData) {
  if (!holidayComboActive(proposalData)) return;
  const summary = proposalData.summary;
  const visits = [];
  Object.values(proposalData.services || {}).forEach((byDate) => {
    Object.values(byDate || {}).forEach((day) => {
      const services = day.services || [];
      visits.push({
        serviceTypes: services.map((s) => s.serviceType),
        subtotal: services.reduce((a, s) => a + (Number(s.serviceCost) || 0), 0),
      });
    });
  });
  const percent = proposalData.holidayPackage.combinePercent ?? COMBINE_PCT;
  const savings = holidayComboSavings(visits, percent);
  if (!(savings > 0)) return;

  const before = summary.subtotalBeforeGratuity;
  const discounted = Number((before - savings).toFixed(2));
  let gratuityAmount = 0;
  if (proposalData.gratuityType === 'percentage' && proposalData.gratuityValue) {
    gratuityAmount = Number((discounted * (proposalData.gratuityValue / 100)).toFixed(2));
  } else if (proposalData.gratuityType === 'dollar' && proposalData.gratuityValue) {
    gratuityAmount = proposalData.gratuityValue;
  }
  summary.holidayDiscountPercent = percent;
  summary.holidayDiscountAmount = savings;
  summary.originalSubtotalBeforeGratuity = before;
  summary.subtotalBeforeGratuity = discounted;
  summary.gratuityAmount = gratuityAmount;
  summary.totalEventCost = Number((discounted + gratuityAmount).toFixed(2));
  summary.netProfit = Number((discounted - summary.totalProRevenue).toFixed(2));
  summary.profitMargin = discounted > 0 ? Number(((summary.netProfit / discounted) * 100).toFixed(2)) : 0;
}

export {
  SERVICE_DEFAULTS,
  HEADSHOT_TIERS,
  MINDFULNESS_TYPES,
  isMindfulnessService,
  isFlatPriceService,
  calculateRecurringDiscount,
  calculateServiceResults,
  recalculateProposalSummary
};
