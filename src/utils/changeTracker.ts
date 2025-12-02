import { ProposalData, ProposalChange, ProposalChangeSet } from '../types/proposal';
import { format } from 'date-fns';

// Helper function to get service display name (copied from StandaloneProposalViewer)
const getServiceDisplayName = (serviceType: string): string => {
  if (!serviceType) return '';
  
  switch (serviceType.toLowerCase()) {
    case 'hair-makeup':
      return 'Hair + Makeup';
    case 'headshot-hair-makeup':
      return 'Hair + Makeup for Headshots';
    case 'headshot':
    case 'headshots':
      return 'Headshot';
    case 'mindfulness':
      return 'Mindfulness';
    case 'makeup':
      return 'Makeup';
    default:
      return serviceType.charAt(0).toUpperCase() + serviceType.slice(1).toLowerCase();
  }
};

// Helper function to generate a unique ID
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Helper function to get nested value from object using dot notation
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

// Helper function to set nested value in object using dot notation
const setNestedValue = (obj: any, path: string, value: any): void => {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
};

// Helper function to compare two values deeply
const isEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  
  if (typeof a === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      return a.every((item, index) => isEqual(item, b[index]));
    }
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(key => isEqual(a[key], b[key]));
  }
  
  return false;
};

// Helper function to get human-readable field names
const getFieldDisplayName = (field: string): string => {
  // Service-level field patterns
  if (field.includes('services.')) {
    const parts = field.split('.');
    if (parts.length >= 6) {
      const location = parts[1];
      const date = parts[2] === 'TBD' ? 'TBD Date' : formatDate(parts[2]);
      const serviceIndex = parseInt(parts[4]) + 1;
      const serviceField = parts[5];
      
      // Handle pricing options
      if (parts[5] === 'pricingOptions' && parts.length >= 8) {
        const optionIndex = parseInt(parts[6]) + 1;
        const optionField = parts[7];
        const fieldNames: { [key: string]: string } = {
          'totalHours': 'Total Hours',
          'hourlyRate': 'Hourly Rate',
          'numPros': 'Number of Professionals',
          'totalAppointments': 'Total Appointments',
          'serviceCost': 'Service Cost'
        };
        return `${location} - ${date} - Service ${serviceIndex} - Option ${optionIndex} - ${fieldNames[optionField] || optionField}`;
      }
      
      // Handle selected option
      if (parts[5] === 'selectedOption') {
        return `${location} - ${date} - Service ${serviceIndex} - Selected Pricing Option`;
      }
      
      // Handle service fields
      const fieldNames: { [key: string]: string } = {
        'totalHours': 'Total Hours',
        'numPros': 'Number of Professionals',
        'hourlyRate': 'Hourly Rate',
        'appTime': 'Appointment Time',
        'proHourly': 'Professional Hourly Rate',
        'earlyArrival': 'Early Arrival Fee',
        'retouchingCost': 'Retouching Cost per Photo',
        'discountPercent': 'Discount Percentage',
        'massageType': 'Massage Type',
        'classLength': 'Class Length',
        'participants': 'Participants',
        'serviceType': 'Service Type',
        'totalAppointments': 'Total Appointments',
        'serviceCost': 'Service Cost'
      };
      
      return `${location} - ${date} - Service ${serviceIndex} - ${fieldNames[serviceField] || serviceField}`;
    }
    return 'Service Details';
  }
  
  const fieldMap: { [key: string]: string } = {
    'clientName': 'Client Name',
    'clientEmail': 'Client Email',
    'eventDates': 'Event Dates',
    'locations': 'Locations',
    'officeLocation': 'Office Location',
    'officeLocations': 'Office Locations',
    'services': 'Services',
    'summary.totalAppointments': 'Total Appointments',
    'summary.totalEventCost': 'Total Event Cost',
    'summary.totalProRevenue': 'Professional Revenue',
    'summary.netProfit': 'Net Profit',
    'summary.profitMargin': 'Profit Margin',
    'customization.contactFirstName': 'Contact First Name',
    'customization.contactLastName': 'Contact Last Name',
    'customization.customNote': 'Custom Note',
    'customization.includeSummary': 'Include Summary',
    'customization.includeCalculations': 'Include Calculations',
    'customization.includeCalculator': 'Include Calculator'
  };
  
  return fieldMap[field] || field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
};

// Helper to format date for display in field names
const formatDate = (dateString: string): string => {
  if (!dateString || dateString === 'TBD') return 'TBD';
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return format(date, 'MMM d, yyyy');
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return format(date, 'MMM d, yyyy');
  } catch {
    return dateString;
  }
};

// Helper function to format value for display
const formatValue = (value: any, field: string): string => {
  if (value === null || value === undefined) return 'None';
  
  if (field.includes('Cost') || field.includes('Revenue') || field.includes('Profit')) {
    return `$${typeof value === 'number' ? value.toFixed(2) : value}`;
  }
  
  if (field.includes('Margin')) {
    return `${typeof value === 'number' ? value.toFixed(1) : value}%`;
  }
  
  if (Array.isArray(value)) {
    // If it's an array of objects (like services), format each one
    if (value.length > 0 && typeof value[0] === 'object') {
      return `${value.length} item${value.length !== 1 ? 's' : ''}`;
    }
    return value.join(', ');
  }
  
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  if (typeof value === 'object') {
    // Handle service objects specifically
    if (value.serviceType) {
      const serviceName = getServiceDisplayName(value.serviceType);
      const details = [];
      if (value.numPros) details.push(`${value.numPros} pros`);
      if (value.totalHours) details.push(`${value.totalHours} hours`);
      if (value.hourlyRate) details.push(`$${value.hourlyRate}/hr`);
      return `${serviceName}${details.length > 0 ? ` (${details.join(', ')})` : ''}`;
    }
    // For other objects, try to stringify meaningfully
    if (Object.keys(value).length === 0) {
      return 'Empty';
    }
    // For complex objects, show a count or key info
    const keys = Object.keys(value);
    if (keys.length <= 3) {
      return keys.map(key => `${key}: ${formatValue(value[key], key)}`).join(', ');
    }
    return `${keys.length} properties`;
  }
  
  return String(value);
};

// Main function to track changes between two proposal data objects
export const trackProposalChanges = (
  originalData: ProposalData,
  newData: ProposalData,
  clientEmail?: string,
  clientName?: string
): ProposalChange[] => {
  const changes: ProposalChange[] = [];
  
  // Fields to track for changes
  const fieldsToTrack = [
    'clientName',
    'clientEmail',
    'eventDates',
    'locations',
    'customization.contactFirstName',
    'customization.contactLastName',
    'customization.customNote',
    'customization.includeSummary',
    'customization.includeCalculations',
    'customization.includeCalculator'
  ];
  
  // Track basic fields
  fieldsToTrack.forEach(field => {
    const oldValue = getNestedValue(originalData, field);
    const newValue = getNestedValue(newData, field);
    
    if (!isEqual(oldValue, newValue)) {
      changes.push({
        id: generateId(),
        proposalId: originalData.clientName, // We'll use clientName as proposalId for now
        field,
        oldValue,
        newValue,
        changeType: oldValue === undefined ? 'add' : newValue === undefined ? 'remove' : 'update',
        timestamp: new Date().toISOString(),
        clientEmail,
        clientName,
        status: 'pending'
      });
    }
  });
  
  // Track services changes
  const originalServices = originalData.services || {};
  const newServices = newData.services || {};
  
  // Get all unique locations
  const allLocations = new Set([
    ...Object.keys(originalServices),
    ...Object.keys(newServices)
  ]);
  
  allLocations.forEach(location => {
    const originalLocationData = originalServices[location] || {};
    const newLocationData = newServices[location] || {};
    
    // Get all unique dates
    const allDates = new Set([
      ...Object.keys(originalLocationData),
      ...Object.keys(newLocationData)
    ]);
    
    allDates.forEach(date => {
      const originalDateData = originalLocationData[date] || {};
      const newDateData = newLocationData[date] || {};
      
      // Track service changes for this date/location - compare individual services
      const originalServices = originalDateData.services || [];
      const newServices = newDateData.services || [];
      
      // Track individual service field changes instead of entire arrays
      const maxServices = Math.max(originalServices.length, newServices.length);
      
      for (let i = 0; i < maxServices; i++) {
        const originalService = originalServices[i];
        const newService = newServices[i];
        
        // Service was added
        if (!originalService && newService) {
          changes.push({
            id: generateId(),
            proposalId: originalData.clientName,
            field: `services.${location}.${date}.services.${i}.serviceType`,
            oldValue: undefined,
            newValue: newService.serviceType,
            changeType: 'add',
            timestamp: new Date().toISOString(),
            clientEmail,
            clientName,
            status: 'pending'
          });
          // Track key fields of the new service
          const fieldsToTrack = ['totalHours', 'numPros', 'hourlyRate', 'appTime', 'proHourly', 'earlyArrival', 'discountPercent', 'massageType', 'classLength', 'participants', 'selectedOption'];
          fieldsToTrack.forEach(field => {
            if (newService[field] !== undefined) {
              changes.push({
                id: generateId(),
                proposalId: originalData.clientName,
                field: `services.${location}.${date}.services.${i}.${field}`,
                oldValue: undefined,
                newValue: newService[field],
                changeType: 'add',
                timestamp: new Date().toISOString(),
                clientEmail,
                clientName,
                status: 'pending'
              });
            }
          });
        }
        // Service was removed
        else if (originalService && !newService) {
          changes.push({
            id: generateId(),
            proposalId: originalData.clientName,
            field: `services.${location}.${date}.services.${i}.serviceType`,
            oldValue: originalService.serviceType,
            newValue: undefined,
            changeType: 'remove',
            timestamp: new Date().toISOString(),
            clientEmail,
            clientName,
            status: 'pending'
          });
        }
        // Service exists in both - compare individual fields
        else if (originalService && newService) {
          const fieldsToTrack = ['serviceType', 'totalHours', 'numPros', 'hourlyRate', 'appTime', 'proHourly', 'earlyArrival', 'discountPercent', 'massageType', 'classLength', 'participants', 'selectedOption'];
          fieldsToTrack.forEach(field => {
            const oldVal = originalService[field];
            const newVal = newService[field];
            if (!isEqual(oldVal, newVal)) {
              changes.push({
                id: generateId(),
                proposalId: originalData.clientName,
                field: `services.${location}.${date}.services.${i}.${field}`,
                oldValue: oldVal,
                newValue: newVal,
                changeType: 'update',
                timestamp: new Date().toISOString(),
                clientEmail,
                clientName,
                status: 'pending'
              });
            }
          });
          
          // Track pricing options changes
          if (originalService.pricingOptions || newService.pricingOptions) {
            const originalOptions = originalService.pricingOptions || [];
            const newOptions = newService.pricingOptions || [];
            if (!isEqual(originalOptions, newOptions)) {
              // Track selected option change
              if (originalService.selectedOption !== newService.selectedOption) {
                changes.push({
                  id: generateId(),
                  proposalId: originalData.clientName,
                  field: `services.${location}.${date}.services.${i}.selectedOption`,
                  oldValue: originalService.selectedOption,
                  newValue: newService.selectedOption,
                  changeType: 'update',
                  timestamp: new Date().toISOString(),
                  clientEmail,
                  clientName,
                  status: 'pending'
                });
              }
            }
          }
        }
      }
      
      // Track cost changes (only if not just a recalculation from service changes)
      // Skip if this is just a summary recalculation
      const hasServiceChanges = changes.some(c => c.field.includes(`services.${location}.${date}.services`));
      if (!hasServiceChanges && originalDateData.totalCost !== newDateData.totalCost) {
        changes.push({
          id: generateId(),
          proposalId: originalData.clientName,
          field: `services.${location}.${date}.totalCost`,
          oldValue: originalDateData.totalCost,
          newValue: newDateData.totalCost,
          changeType: 'update',
          timestamp: new Date().toISOString(),
          clientEmail,
          clientName,
          status: 'pending'
        });
      }
      
      // Track appointment changes (only if not just a recalculation)
      if (!hasServiceChanges && originalDateData.totalAppointments !== newDateData.totalAppointments) {
        changes.push({
          id: generateId(),
          proposalId: originalData.clientName,
          field: `services.${location}.${date}.totalAppointments`,
          oldValue: originalDateData.totalAppointments,
          newValue: newDateData.totalAppointments,
          changeType: 'update',
          timestamp: new Date().toISOString(),
          clientEmail,
          clientName,
          status: 'pending'
        });
      }
    });
  });
  
  return changes;
};

// Function to create a change set from changes
export const createChangeSet = (
  proposalId: string,
  changes: ProposalChange[],
  clientEmail?: string,
  clientName?: string,
  clientComment?: string
): ProposalChangeSet => {
  return {
    id: generateId(),
    proposalId,
    changes,
    clientEmail,
    clientName,
    clientComment,
    status: 'pending',
    submittedAt: new Date().toISOString()
  };
};

// Function to get display information for a change
export const getChangeDisplayInfo = (change: ProposalChange) => {
  return {
    fieldName: getFieldDisplayName(change.field),
    oldValueDisplay: formatValue(change.oldValue, change.field),
    newValueDisplay: formatValue(change.newValue, change.field),
    changeType: change.changeType
  };
};

// Function to apply changes to a proposal data object
export const applyChanges = (originalData: ProposalData, changes: ProposalChange[]): ProposalData => {
  const newData = JSON.parse(JSON.stringify(originalData)); // Deep clone
  
  changes.forEach(change => {
    if (change.status === 'approved') {
      setNestedValue(newData, change.field, change.newValue);
    }
  });
  
  return newData;
};
