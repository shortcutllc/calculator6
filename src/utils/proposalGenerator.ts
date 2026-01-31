import { v4 as uuidv4 } from 'uuid';
import { Proposal, ProposalData, ProposalCustomization, PricingOption, DateDataWithOptions, RecurringFrequency } from '../types/proposal';
import { getProposalUrl } from './url';

// Helper function to calculate recurring discount based on occurrences
export const calculateRecurringDiscount = (frequency: RecurringFrequency | undefined): number => {
  if (!frequency) return 0;
  const occurrences = frequency.occurrences;
  if (occurrences >= 9) return 20;
  if (occurrences >= 4) return 15;
  return 0;
};

// Helper function to get the frequency label
export const getFrequencyLabel = (frequency: RecurringFrequency | undefined): string => {
  if (!frequency) return '';
  switch (frequency.type) {
    case 'quarterly':
      return 'Quarterly (4 events)';
    case 'monthly':
      return 'Monthly (12 events)';
    case 'custom':
      return `Custom (${frequency.occurrences} events)`;
    default:
      return `${frequency.occurrences} events`;
  }
};

// Helper function to calculate original price (before discount)
export const calculateOriginalPrice = (service: any): number => {
  if (!service.appTime || !service.numPros || !service.totalHours) {
    return 0;
  }

  if (service.serviceType === 'headshot') {
    const proRevenue = service.totalHours * service.numPros * (service.proHourly || 0);
    const apptsPerHourPerPro = 60 / service.appTime;
    const totalApptsPerHour = apptsPerHourPerPro * service.numPros;
    const totalAppts = Math.floor(service.totalHours * totalApptsPerHour);
    const retouchingTotal = totalAppts * (service.retouchingCost || 0);
    return proRevenue + retouchingTotal;
  } else if (service.serviceType === 'mindfulness') {
    return service.fixedPrice || 1375;
  } else {
    return service.totalHours * (service.hourlyRate || 0) * service.numPros;
  }
};

export const calculateServiceResults = (service: any) => {
  const isMindfulness = service.serviceType === 'mindfulness' ||
                        service.serviceType === 'mindfulness-soles' ||
                        service.serviceType === 'mindfulness-movement' ||
                        service.serviceType === 'mindfulness-pro' ||
                        service.serviceType === 'mindfulness-cle' ||
                        service.serviceType === 'mindfulness-pro-reactivity';

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
    // Mindfulness services use fixed pricing
    serviceCost = service.fixedPrice || 1375;
    proRevenue = serviceCost * 0.3; // 30% profit margin for mindfulness
  } else {
    serviceCost = service.totalHours * (service.hourlyRate || 0) * service.numPros;
    proRevenue = (service.totalHours * service.numPros * (service.proHourly || 0)) +
                 ((service.earlyArrival || 0) * service.numPros);
  }

  const originalPrice = serviceCost;

  // Apply regular discount if present
  if (service.discountPercent > 0) {
    serviceCost = serviceCost * (1 - (service.discountPercent / 100));
  }

  // Calculate and apply recurring discount
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
};

// New function to create pricing options from a base service
export const createPricingOptions = (
  baseService: any, 
  optionConfigs: Array<{ name: string; description?: string; multiplier: number }>
): PricingOption[] => {
  return optionConfigs.map((config, index) => {
    // Create a copy of the base service with adjusted quantities
    const optionService = {
      ...baseService,
      totalHours: baseService.totalHours * config.multiplier,
      // Adjust other quantities proportionally if needed
    };

    const { totalAppointments, serviceCost, proRevenue: optionProRevenue } = calculateServiceResults(optionService);

    return {
      id: `option-${index + 1}`,
      name: config.name,
      description: config.description,
      services: [{
        ...optionService,
        totalAppointments,
        serviceCost
      }],
      totalCost: serviceCost,
      totalAppointments,
      isSelected: index === 0 // First option is selected by default
    };
  });
};

// Function to calculate totals for pricing options
export const calculatePricingOptionsTotals = (options: PricingOption[]) => {
  return options.reduce((totals, option) => ({
    totalAppointments: totals.totalAppointments + (typeof option.totalAppointments === 'number' ? option.totalAppointments : 0),
    totalCost: totals.totalCost + option.totalCost,
    totalProRevenue: totals.totalProRevenue + (option.services[0]?.proRevenue || 0)
  }), {
    totalAppointments: 0,
    totalCost: 0,
    totalProRevenue: 0
  });
};

// Function to generate pricing options for a service
export const generatePricingOptionsForService = (service: any): any[] => {
  const baseService = { ...service };
  const { totalAppointments, serviceCost, originalPrice } = calculateServiceResults(baseService);
  
  // Create different pricing options based on service type and quantities
  const options = [];
  
  // Option 1: Standard (current configuration)
  options.push({
    name: 'Option 1',
    totalAppointments: totalAppointments,
    totalHours: baseService.totalHours,
    numPros: baseService.numPros,
    hourlyRate: baseService.hourlyRate,
    serviceCost: serviceCost,
    originalPrice: originalPrice,
    discountPercent: baseService.discountPercent || 0
  });
  
  // Option 2: Extended (25% more appointments)
  const extendedAppointments = Math.floor(totalAppointments * 1.25);
  const extendedService = {
    ...baseService,
    totalHours: baseService.totalHours * 1.25
  };
  const { serviceCost: extendedCost, originalPrice: extendedOriginalPrice } = calculateServiceResults(extendedService);
  options.push({
    name: 'Option 2',
    totalAppointments: extendedAppointments,
    totalHours: extendedService.totalHours,
    numPros: baseService.numPros,
    hourlyRate: baseService.hourlyRate,
    serviceCost: extendedCost,
    originalPrice: extendedOriginalPrice,
    discountPercent: baseService.discountPercent || 0
  });
  
  // Option 3: Premium (50% more appointments)
  const premiumAppointments = Math.floor(totalAppointments * 1.5);
  const premiumService = {
    ...baseService,
    totalHours: baseService.totalHours * 1.5
  };
  const { serviceCost: premiumCost, originalPrice: premiumOriginalPrice } = calculateServiceResults(premiumService);
  options.push({
    name: 'Option 3',
    totalAppointments: premiumAppointments,
    totalHours: premiumService.totalHours,
    numPros: baseService.numPros,
    hourlyRate: baseService.hourlyRate,
    serviceCost: premiumCost,
    originalPrice: premiumOriginalPrice,
    discountPercent: baseService.discountPercent || 0
  });
  
  return options;
};



// Function to transform legacy proposal data to include pricing options
export const transformToPricingOptions = (proposalData: ProposalData): ProposalData => {
  const transformedData = { ...proposalData };
  
  Object.entries(proposalData.services).forEach(([location, locationData]) => {
    Object.entries(locationData).forEach(([date, dateData]) => {
      // Create pricing options from existing services
      const options: PricingOption[] = dateData.services.map((service, index) => {
        const { totalAppointments, serviceCost, proRevenue: serviceProRevenue } = calculateServiceResults(service);
        
        return {
          id: `option-${index + 1}`,
          name: `${service.serviceType} - ${totalAppointments} appointments`,
          description: `${service.totalHours} hours with ${service.numPros} professionals`,
          services: [{
            ...service,
            totalAppointments,
            serviceCost,
            proRevenue: serviceProRevenue
          }],
          totalCost: serviceCost,
          totalAppointments,
          isSelected: index === 0
        };
      });

      // Replace the date data with options structure
      (transformedData.services as any)[location][date] = {
        options,
        selectedOptionId: options[0]?.id,
        totalCost: dateData.totalCost,
        totalAppointments: dateData.totalAppointments,
        services: dateData.services // Keep for backward compatibility
      };
    });
  });

  transformedData.hasPricingOptions = true;
  return transformedData;
};

// Helper function to normalize date to YYYY-MM-DD format without timezone issues
const normalizeDate = (dateInput: string | Date): string => {
  if (!dateInput) return '';
  
  // Handle TBD dates
  if (dateInput === 'TBD') {
    return 'TBD';
  }
  
  let date: Date;
  
  if (typeof dateInput === 'string') {
    // If it's already in YYYY-MM-DD format, use it directly
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return dateInput;
    }
    
    // Parse the date string
    date = new Date(dateInput);
  } else {
    date = dateInput;
  }
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    console.warn('Invalid date:', dateInput);
    return '';
  }
  
  // Get the date components in local timezone to avoid UTC conversion issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

export const prepareProposalFromCalculation = (currentClient: any): ProposalData => {
  const proposalData: ProposalData = {
    clientName: currentClient.name,
    eventDates: [],
    locations: currentClient.locations,
    services: {},
    summary: {
      totalAppointments: 0,
      totalEventCost: 0,
      totalProRevenue: 0,
      netProfit: 0,
      profitMargin: 0
    }
  };

  // First, collect and sort all unique dates
  const allDates = new Set<string>();

  Object.values(currentClient.events).forEach((locationEvents: any) => {
    locationEvents.forEach((event: any) => {
      event.services.forEach((service: any) => {
        if (service.date) {
          const normalizedDate = normalizeDate(service.date);
          if (normalizedDate) {
            allDates.add(normalizedDate);
          }
        }
      });
    });
  });

  proposalData.eventDates = Array.from(allDates)
    .sort((a, b) => {
      if (a === 'TBD' && b === 'TBD') return 0;
      if (a === 'TBD') return 1;
      if (b === 'TBD') return -1;
      return new Date(a).getTime() - new Date(b).getTime();
    });

  // Process each location
  Object.entries(currentClient.events).forEach(([location, locationEvents]: [string, any]) => {
    proposalData.services[location] = {};

    // Create a flat list of all services for this location
    const allLocationServices: any[] = [];

    locationEvents.forEach((event: any) => {
      event.services.forEach((service: any) => {
        if (service.date) {
          const normalizedDate = normalizeDate(service.date);

          if (normalizedDate) {
            // Push each service individually with normalized date
            allLocationServices.push({
              ...service,
              location,
              date: normalizedDate,
              totalHours: Number(service.totalHours),
              numPros: Number(service.numPros),
              proHourly: Number(service.proHourly),
              hourlyRate: Number(service.hourlyRate),
              earlyArrival: Number(service.earlyArrival),
              discountPercent: Number(service.discountPercent),
              // Preserve mindfulness-specific fields
              classLength: service.classLength ? Number(service.classLength) : (service.serviceType === 'mindfulness' ? 40 : undefined),
              participants: service.participants,
              fixedPrice: service.fixedPrice ? Number(service.fixedPrice) : undefined,
              mindfulnessType: service.mindfulnessType
            });
          }
        }
      });
    });
    
    // Group services by date
    const servicesByDate: { [date: string]: any[] } = {};

    allLocationServices.forEach((service: any) => {
      const date = service.date;
      if (!servicesByDate[date]) {
        servicesByDate[date] = [];
      }
      servicesByDate[date].push(service);
    });
    
    // Sort dates and create day data
    Object.keys(servicesByDate)
      .sort((a, b) => {
        // Handle TBD dates - put them at the end
        if (a === 'TBD' && b === 'TBD') return 0;
        if (a === 'TBD') return 1;
        if (b === 'TBD') return -1;
        
        // Sort actual dates normally
        return new Date(a).getTime() - new Date(b).getTime();
      })
      .forEach(date => {
        const services = servicesByDate[date].map(service => {
          const { totalAppointments, serviceCost, proRevenue: serviceProRevenue } = calculateServiceResults(service);
          return {
            ...service,
            totalAppointments,
            serviceCost,
            proRevenue: serviceProRevenue
          };
        });

        proposalData.services[location][date] = {
          services,
          totalCost: services.reduce((sum, service) => sum + service.serviceCost, 0),
          totalAppointments: services.reduce((sum, service) => sum + (typeof service.totalAppointments === 'number' ? service.totalAppointments : 0), 0)
        };
      });
  });

  return recalculateServiceTotals(proposalData);
};

export const recalculateServiceTotals = (proposalData: ProposalData): ProposalData => {
  // Preserve gratuity fields
  const gratuityType = proposalData.gratuityType || null;
  const gratuityValue = proposalData.gratuityValue || null;

  const updatedData = { ...proposalData };

  updatedData.summary = {
    totalAppointments: 0,
    totalEventCost: 0,
    totalProRevenue: 0,
    netProfit: 0,
    profitMargin: 0
  };

  // Transform the services structure if needed
  if (updatedData.services) {
    const transformedServices: any = {};

    Object.entries(updatedData.services).forEach(([location, locationData]: [string, any]) => {
      transformedServices[location] = {};
      
      if (Array.isArray(locationData)) {
        console.log(`Transforming array data for location: ${location}`);
        
        locationData.forEach((dayEntry: any) => {
          if (Array.isArray(dayEntry.services)) {
            dayEntry.services.forEach((service: any) => {
              if (!service.date) {
                console.error('Service missing date:', service);
                return;
              }

              const normalizedDate = normalizeDate(service.date);
              if (!normalizedDate) {
                console.error('Failed to normalize date in service:', service.date);
                return;
              }
              
              if (!transformedServices[location][normalizedDate]) {
                transformedServices[location][normalizedDate] = {
                  services: [],
                  totalCost: 0,
                  totalAppointments: 0
                };
              }
              
              transformedServices[location][normalizedDate].services.push({
                ...service,
                date: normalizedDate,
                // Ensure classLength is set for mindfulness services if missing
                classLength: service.classLength || (service.serviceType === 'mindfulness' ? 40 : service.classLength)
              });
            });
          }
        });
      } else {
        // Regroup services by their individual dates (fixes old proposals with incorrect grouping)
        // First, collect all services and map them with correct dates
        const allServicesForLocation: any[] = [];

        Object.entries(locationData).forEach(([structureDate, dateData]: [string, any]) => {
          const fallbackDate = normalizeDate(structureDate);

          dateData.services?.forEach((service: any) => {
            // Use the service's own date if it has one, otherwise use the structure date
            const serviceDate = service.date ? normalizeDate(service.date) || fallbackDate : fallbackDate;

            const mappedService = {
              ...service,
              date: serviceDate
            };

            // Ensure classLength and mindfulnessType are synced for mindfulness services
            if (mappedService.serviceType === 'mindfulness') {
              let targetClassLength = 45;
              let targetFixedPrice = 1375;
              let targetMindfulnessType = 'intro';

              if (mappedService.mindfulnessType === 'drop-in') {
                targetClassLength = 30;
                targetFixedPrice = 1250;
                targetMindfulnessType = 'drop-in';
              } else if (mappedService.mindfulnessType === 'mindful-movement') {
                targetClassLength = 60;
                targetFixedPrice = 1500;
                targetMindfulnessType = 'mindful-movement';
              } else if (mappedService.mindfulnessType === 'intro') {
                targetClassLength = 45;
                targetFixedPrice = 1375;
                targetMindfulnessType = 'intro';
              } else if (mappedService.classLength) {
                if (mappedService.classLength === 30) {
                  targetClassLength = 30;
                  targetFixedPrice = 1250;
                  targetMindfulnessType = 'drop-in';
                } else if (mappedService.classLength === 60) {
                  targetClassLength = 60;
                  targetFixedPrice = 1500;
                  targetMindfulnessType = 'mindful-movement';
                } else {
                  targetClassLength = 45;
                  targetFixedPrice = 1375;
                  targetMindfulnessType = 'intro';
                }
              }

              mappedService.classLength = targetClassLength;
              mappedService.mindfulnessType = targetMindfulnessType;
              mappedService.fixedPrice = targetFixedPrice;
            }

            allServicesForLocation.push(mappedService);
          });
        });

        // Now group services by their actual dates
        allServicesForLocation.forEach((service: any) => {
          const serviceDate = service.date;
          if (!serviceDate) return;

          if (!transformedServices[location][serviceDate]) {
            transformedServices[location][serviceDate] = {
              services: [],
              totalCost: 0,
              totalAppointments: 0
            };
          }

          transformedServices[location][serviceDate].services.push(service);
        });
      }
    });
    
    updatedData.services = transformedServices;
  }

  // Process each location
  Object.entries(updatedData.services || {}).forEach(([location, dates]) => {
    // Sort dates within each location
    const sortedDates = Object.entries(dates)
      .sort(([dateA], [dateB]) => {
        // Handle TBD dates - put them at the end
        if (dateA === 'TBD' && dateB === 'TBD') return 0;
        if (dateA === 'TBD') return 1;
        if (dateB === 'TBD') return -1;
        
        // Sort actual dates normally
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      })
      .reduce((acc, [date, data]) => ({
        ...acc,
        [date]: {
          ...data,
          services: [...(data as any).services]
        }
      }), {});

    updatedData.services[location] = sortedDates;

    // Process each date
    Object.entries(sortedDates).forEach(([date, dayData]) => {
      let dayTotalCost = 0;
      let dayTotalAppointments = 0;
      let dayTotalProRevenue = 0;

      (dayData as any).services.forEach((service: any) => {
        // Ensure classLength and mindfulnessType are synced for mindfulness services
        if (service.serviceType === 'mindfulness') {
          // Determine correct values: prioritize mindfulnessType if it exists, otherwise use classLength
          let targetClassLength = 45;
          let targetFixedPrice = 1375;
          let targetMindfulnessType = 'intro';

          // If mindfulnessType exists, use it to determine classLength
          if (service.mindfulnessType === 'drop-in') {
            targetClassLength = 30;
            targetFixedPrice = 1250;
            targetMindfulnessType = 'drop-in';
          } else if (service.mindfulnessType === 'mindful-movement') {
            targetClassLength = 60;
            targetFixedPrice = 1500;
            targetMindfulnessType = 'mindful-movement';
          } else if (service.mindfulnessType === 'intro') {
            targetClassLength = 45;
            targetFixedPrice = 1375;
            targetMindfulnessType = 'intro';
          } else if (service.classLength) {
            // No mindfulnessType, infer from classLength
            if (service.classLength === 30) {
              targetClassLength = 30;
              targetFixedPrice = 1250;
              targetMindfulnessType = 'drop-in';
            } else if (service.classLength === 60) {
              targetClassLength = 60;
              targetFixedPrice = 1500;
              targetMindfulnessType = 'mindful-movement';
            } else {
              // Default to intro (45 minutes)
              targetClassLength = 45;
              targetFixedPrice = 1375;
              targetMindfulnessType = 'intro';
            }
          } else {
            // No mindfulnessType and no classLength, default to intro
            targetClassLength = 45;
            targetFixedPrice = 1375;
            targetMindfulnessType = 'intro';
          }

          // Apply the determined values
          (service as any).classLength = targetClassLength;
          (service as any).mindfulnessType = targetMindfulnessType;
          (service as any).fixedPrice = targetFixedPrice;
        }
        
        let { totalAppointments, serviceCost, proRevenue: baseProRevenue } = calculateServiceResults(service);

        (service as any).totalAppointments = totalAppointments;
        (service as any).serviceCost = serviceCost;
        // Keep service.date as-is - don't overwrite with structure date
        
        // Handle pricing options if they exist
        if (service.pricingOptions && service.pricingOptions.length > 0) {
          // Recalculate each pricing option to ensure they're up to date
          service.pricingOptions = service.pricingOptions.map((option: any) => {
            const optionService = { ...service };
            // Use option-specific values if they exist, otherwise use service values
            if (option.totalHours !== undefined) optionService.totalHours = option.totalHours;
            if (option.hourlyRate !== undefined) optionService.hourlyRate = option.hourlyRate;
            if (option.numPros !== undefined) optionService.numPros = option.numPros;
            // Preserve discountPercent from option or service
            if (option.discountPercent !== undefined) {
              optionService.discountPercent = option.discountPercent;
            } else {
              optionService.discountPercent = service.discountPercent || 0;
            }
            
            const { totalAppointments, serviceCost, proRevenue: optionProRevenue, originalPrice } = calculateServiceResults(optionService);
            return {
              ...option,
              totalAppointments,
              serviceCost,
              originalPrice: originalPrice || option.originalPrice,
              discountPercent: optionService.discountPercent,
              proRevenue: optionProRevenue
            };
          });
          
          // Use selected option's cost if available
          const selectedOption = service.pricingOptions[service.selectedOption || 0];
          if (selectedOption) {
            (service as any).serviceCost = selectedOption.serviceCost;
            (service as any).totalAppointments = selectedOption.totalAppointments;
            // Update totalHours, numPros, and hourlyRate to match the selected option
            if (selectedOption.totalHours !== undefined) {
              (service as any).totalHours = selectedOption.totalHours;
            }
            if (selectedOption.numPros !== undefined) {
              (service as any).numPros = selectedOption.numPros;
            }
            if (selectedOption.hourlyRate !== undefined) {
              (service as any).hourlyRate = selectedOption.hourlyRate;
            }
            // Preserve discountPercent from selected option
            if (selectedOption.discountPercent !== undefined) {
              (service as any).discountPercent = selectedOption.discountPercent;
            }
            // Use the selected option's proRevenue
            dayTotalProRevenue += selectedOption.proRevenue || baseProRevenue;
          } else {
            dayTotalProRevenue += baseProRevenue;
          }
        } else {
          // No pricing options, use the calculated proRevenue
          dayTotalProRevenue += baseProRevenue;
        }
        
        dayTotalCost += (service as any).serviceCost;
        // Only add numeric appointments, skip 'unlimited'
        if (typeof (service as any).totalAppointments === 'number') {
          dayTotalAppointments += (service as any).totalAppointments;
        }
        // proRevenue is already added in the pricing options logic above
      });

      updatedData.services[location][date].totalCost = Number(dayTotalCost.toFixed(2));
      updatedData.services[location][date].totalAppointments = dayTotalAppointments;

      updatedData.summary.totalAppointments += dayTotalAppointments;
      updatedData.summary.totalEventCost += dayTotalCost;
      updatedData.summary.totalProRevenue += dayTotalProRevenue;
    });
  });

  // Update eventDates array to match all service dates
  const allDates = new Set<string>();
  Object.values(updatedData.services || {}).forEach((locationData: any) => {
    Object.keys(locationData).forEach(date => allDates.add(date));
  });
  updatedData.eventDates = Array.from(allDates).sort((a, b) => {
    // Handle TBD dates - put them at the end
    if (a === 'TBD' && b === 'TBD') return 0;
    if (a === 'TBD') return 1;
    if (b === 'TBD') return -1;
    
    // Sort actual dates normally
    return new Date(a).getTime() - new Date(b).getTime();
  });

  // Calculate gratuity if specified
  let gratuityAmount = 0;
  const subtotalBeforeGratuity = updatedData.summary.totalEventCost;
  
  if (updatedData.gratuityType && updatedData.gratuityValue) {
    if (updatedData.gratuityType === 'percentage') {
      gratuityAmount = subtotalBeforeGratuity * (updatedData.gratuityValue / 100);
    } else if (updatedData.gratuityType === 'dollar') {
      gratuityAmount = updatedData.gratuityValue;
    }
    gratuityAmount = Number(gratuityAmount.toFixed(2));
    updatedData.summary.totalEventCost = Number((subtotalBeforeGratuity + gratuityAmount).toFixed(2));
  }
  
  updatedData.summary.gratuityAmount = gratuityAmount;
  updatedData.summary.subtotalBeforeGratuity = subtotalBeforeGratuity;

  // Calculate net profit based on subtotal (before gratuity) - gratuity doesn't affect profit
  const netProfitBeforeGratuity = subtotalBeforeGratuity - updatedData.summary.totalProRevenue;
  updatedData.summary.netProfit = Number(netProfitBeforeGratuity.toFixed(2));
  
  // Profit margin should be calculated based on subtotal (before gratuity), not total (after gratuity)
  updatedData.summary.profitMargin = subtotalBeforeGratuity > 0 
    ? Number(((netProfitBeforeGratuity / subtotalBeforeGratuity) * 100).toFixed(2))
    : 0;

  // Preserve gratuity fields in the returned data
  if (gratuityType) updatedData.gratuityType = gratuityType;
  if (gratuityValue !== null) updatedData.gratuityValue = gratuityValue;

  // Auto-recurring: Apply recurring discount when 4+ unique dates exist
  // Only apply if no services are already manually marked as recurring
  const uniqueDateCount = updatedData.eventDates.filter(d => d !== 'TBD').length;
  let hasManualRecurring = false;

  // Check if any service is already marked as recurring
  Object.values(updatedData.services || {}).forEach((locationData: any) => {
    Object.values(locationData || {}).forEach((dateData: any) => {
      (dateData.services || []).forEach((service: any) => {
        if (service.isRecurring && service.recurringFrequency) {
          hasManualRecurring = true;
        }
      });
    });
  });

  // Apply auto-recurring if 4+ dates and no manual recurring
  if (uniqueDateCount >= 4 && !hasManualRecurring) {
    // Calculate discount rate: 15% for 4-8 dates, 20% for 9+ dates
    const autoRecurringDiscount = uniqueDateCount >= 9 ? 20 : 15;
    const discountMultiplier = autoRecurringDiscount / 100;

    // Calculate savings from auto-recurring discount
    // The discount applies to the subtotal before gratuity
    const autoRecurringSavings = Number((subtotalBeforeGratuity * discountMultiplier).toFixed(2));
    const discountedSubtotal = Number((subtotalBeforeGratuity - autoRecurringSavings).toFixed(2));

    // Recalculate gratuity based on discounted subtotal
    let newGratuityAmount = 0;
    if (updatedData.gratuityType && updatedData.gratuityValue) {
      if (updatedData.gratuityType === 'percentage') {
        newGratuityAmount = discountedSubtotal * (updatedData.gratuityValue / 100);
      } else if (updatedData.gratuityType === 'dollar') {
        newGratuityAmount = updatedData.gratuityValue;
      }
      newGratuityAmount = Number(newGratuityAmount.toFixed(2));
    }

    // Update totals with discount applied
    updatedData.summary.subtotalBeforeGratuity = discountedSubtotal;
    updatedData.summary.gratuityAmount = newGratuityAmount;
    updatedData.summary.totalEventCost = Number((discountedSubtotal + newGratuityAmount).toFixed(2));

    // Recalculate profit margin based on discounted amounts
    const newNetProfit = discountedSubtotal - updatedData.summary.totalProRevenue;
    updatedData.summary.netProfit = Number(newNetProfit.toFixed(2));
    updatedData.summary.profitMargin = discountedSubtotal > 0
      ? Number(((newNetProfit / discountedSubtotal) * 100).toFixed(2))
      : 0;

    // Store auto-recurring info
    updatedData.isAutoRecurring = true;
    updatedData.autoRecurringDiscount = autoRecurringDiscount;
    updatedData.autoRecurringSavings = autoRecurringSavings;
  } else {
    // Clear auto-recurring flags if not applicable
    updatedData.isAutoRecurring = false;
    updatedData.autoRecurringDiscount = undefined;
    updatedData.autoRecurringSavings = undefined;
  }

  return updatedData;
};