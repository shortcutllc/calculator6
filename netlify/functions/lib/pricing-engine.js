/**
 * Pricing Engine — ported from src/utils/proposalGenerator.ts
 * Calculates service costs, appointments, and proposal summaries.
 * ESM module for use in Netlify serverless functions.
 */

// Service defaults matching src/components/Calculator.tsx SERVICE_DEFAULTS
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
    fixedPrice: 1875
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

const HEADSHOT_TIERS = {
  basic: {
    appTime: 12,
    proHourly: 400,
    retouchingCost: 40,
    totalHours: 5,
    numPros: 1,
    hourlyRate: 0,
    earlyArrival: 0
  },
  premium: {
    appTime: 12,
    proHourly: 500,
    retouchingCost: 50,
    totalHours: 5,
    numPros: 1,
    hourlyRate: 0,
    earlyArrival: 0
  },
  executive: {
    appTime: 12,
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

/**
 * Calculate recurring discount based on frequency.
 * Matches proposalGenerator.ts calculateRecurringDiscount
 */
function calculateRecurringDiscount(frequency) {
  if (!frequency) return 0;
  const occurrences = frequency.occurrences;
  if (occurrences >= 9) return 20;
  if (occurrences >= 4) return 15;
  return 0;
}

/**
 * Calculate results for a single service.
 * Ported from proposalGenerator.ts calculateServiceResults (lines 49-108)
 */
function calculateServiceResults(service) {
  const isMindfulness = isMindfulnessService(service.serviceType);

  if (!isMindfulness && (!service.appTime || !service.numPros || !service.totalHours)) {
    return { totalAppointments: 0, serviceCost: 0, proRevenue: 0, originalPrice: 0, recurringDiscount: 0, recurringSavings: 0 };
  }

  const apptsPerHourPerPro = service.appTime ? 60 / service.appTime : 0;
  const totalApptsPerHour = apptsPerHourPerPro * (service.numPros || 0);
  const totalAppts = isMindfulness ? 'unlimited' : Math.floor((service.totalHours || 0) * totalApptsPerHour);

  let serviceCost = 0;
  let proRevenue = 0;

  if (service.serviceType === 'headshot') {
    proRevenue = service.totalHours * service.numPros * (service.proHourly || 0);
    const retouchingTotal = (typeof totalAppts === 'number' ? totalAppts : 0) * (service.retouchingCost || 0);
    serviceCost = proRevenue + retouchingTotal;
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

        dayTotalCost += serviceCost;
        if (typeof totalAppointments === 'number') {
          dayTotalAppointments += totalAppointments;
        }
        dayTotalProRevenue += proRevenue;
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
    if (a === 'TBD' && b === 'TBD') return 0;
    if (a === 'TBD') return 1;
    if (b === 'TBD') return -1;
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
  return proposalData;
}

export {
  SERVICE_DEFAULTS,
  HEADSHOT_TIERS,
  MINDFULNESS_TYPES,
  isMindfulnessService,
  calculateRecurringDiscount,
  calculateServiceResults,
  recalculateProposalSummary
};
