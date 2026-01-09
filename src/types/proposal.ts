import { Database } from './database';

export interface Service {
  serviceType: string;
  totalHours: number;
  numPros: number;
  totalAppointments: number;
  serviceCost: number;
  retouchingCost?: number;
  discountPercent?: number;
  appTime?: number;
  proHourly?: number;
  hourlyRate?: number;
  earlyArrival?: number;
  date?: string;
  location?: string;
  proRevenue?: number;
  // Mindfulness-specific fields
  classLength?: number;
  participants?: string | number;
  fixedPrice?: number;
  mindfulnessType?: 'intro' | 'drop-in' | 'mindful-movement';
  // Massage-specific fields
  massageType?: 'chair' | 'table' | 'massage';
}

export interface DateData {
  services: Service[];
  totalCost: number;
  totalAppointments: number;
}

// New interfaces for pricing options
export interface PricingOption {
  id: string;
  name: string; // e.g., "24 Services", "36 Services"
  description?: string;
  services: Service[];
  totalCost: number;
  totalAppointments: number;
  isSelected?: boolean; // for client selection
}

export interface DateDataWithOptions {
  options: PricingOption[];
  selectedOptionId?: string; // tracks which option client selected
  totalCost: number;
  totalAppointments: number;
  // Legacy support - for backward compatibility
  services?: Service[];
}

export interface LocationData {
  [date: string]: DateData;
}

export interface LocationDataWithOptions {
  [date: string]: DateDataWithOptions;
}

export interface ProposalSummary {
  totalAppointments: number;
  totalEventCost: number;
  totalProRevenue: number;
  netProfit: number;
  profitMargin: number;
}

export interface ProposalData {
  clientName: string;
  clientEmail?: string;
  clientLogoUrl?: string;
  officeLocation?: string; // Legacy support
  officeLocations?: { [location: string]: string }; // New: multiple office locations
  eventDates: string[];
  locations: string[];
  services: {
    [location: string]: LocationData;
  };
  summary: ProposalSummary;
  // New field for pricing options support
  hasPricingOptions?: boolean;
  // Mindfulness program specific data
  mindfulnessProgram?: {
    programId: string;
    programName: string;
    facilitatorName: string;
    startDate: string;
    endDate: string;
    totalSessions: number;
    inPersonSessions: number;
    virtualSessions: number;
    sessions: Array<{
      sessionNumber: number;
      date: string;
      time?: string;
      duration: number;
      type: 'in-person' | 'virtual';
      title?: string;
      content?: string;
      location?: string;
      meetingLink?: string;
    }>;
    pricing: {
      inPersonPricePerSession: number;
      virtualPricePerSession: number;
      resourcesPrice: number;
      discountPercent?: number;
      inPersonTotal: number;
      virtualTotal: number;
      subtotal?: number;
      discountAmount?: number;
      totalCost: number;
      costPerParticipant: number;
      costPerSession: number;
    };
  };
}

export interface ProposalDataWithOptions {
  clientName: string;
  clientEmail?: string;
  clientLogoUrl?: string;
  eventDates: string[];
  locations: string[];
  services: {
    [location: string]: LocationDataWithOptions;
  };
  summary: ProposalSummary;
  hasPricingOptions: boolean;
}

export interface ProposalCustomization {
  contactFirstName?: string;
  contactLastName?: string;
  customNote?: string;
  programIntroCopy?: string;
  includeSummary: boolean;
  includeCalculations: boolean;
  includeCalculator: boolean;
}

export interface Proposal {
  id: string;
  createdAt: string;
  updatedAt: string;
  data: ProposalData;
  customization: ProposalCustomization;
  isEditable: boolean;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  pendingReview: boolean;
  hasChanges: boolean;
  userId?: string;
  originalData?: ProposalData;
  notes?: string;
  isShared?: boolean;
  clientEmail?: string;
  clientLogoUrl?: string;
  clientName?: string;
  changeSource?: string;
  // New fields for pricing options
  pricingOptions?: { [key: string]: any };
  selectedOptions?: { [key: string]: any };
  hasPricingOptions?: boolean;
  // New fields for proposal groups/options
  proposalGroupId?: string | null;
  optionName?: string | null;
  optionOrder?: number | null;
  // Test proposal flag
  isTest?: boolean;
  // Proposal type
  proposal_type?: 'event' | 'mindfulness-program';
}

// Change tracking interfaces
export interface ProposalChange {
  id: string;
  proposalId: string;
  field: string;
  oldValue: any;
  newValue: any;
  changeType: 'add' | 'update' | 'remove';
  timestamp: string;
  clientEmail?: string;
  clientName?: string;
  adminComment?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface ProposalChangeSet {
  id: string;
  proposalId: string;
  changes: ProposalChange[];
  clientEmail?: string;
  clientName?: string;
  clientComment?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  adminComment?: string;
  changeSource?: string | null;
  userId?: string | null;
}

export interface ChangeReviewData {
  originalData: ProposalData;
  proposedData: ProposalData;
  changeSet: ProposalChangeSet;
}

export type ProposalRow = Database['public']['Tables']['proposals']['Row'];