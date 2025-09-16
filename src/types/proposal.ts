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
  officeLocation?: string;
  eventDates: string[];
  locations: string[];
  services: {
    [location: string]: LocationData;
  };
  summary: ProposalSummary;
  // New field for pricing options support
  hasPricingOptions?: boolean;
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
  changeSource?: string;
  // New fields for pricing options
  pricingOptions?: { [key: string]: any };
  selectedOptions?: { [key: string]: any };
  hasPricingOptions?: boolean;
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
}

export interface ChangeReviewData {
  originalData: ProposalData;
  proposedData: ProposalData;
  changeSet: ProposalChangeSet;
}

export type ProposalRow = Database['public']['Tables']['proposals']['Row'];