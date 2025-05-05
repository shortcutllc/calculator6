import { Database } from './database';

export interface Service {
  serviceType: string;
  totalHours: number;
  numPros: number;
  totalAppointments: number;
  serviceCost: number;
  retouchingCost?: number;
  discountPercent?: number;
}

export interface DateData {
  services: Service[];
  totalCost: number;
  totalAppointments: number;
}

export interface LocationData {
  [date: string]: DateData;
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
  eventDates: string[];
  locations: string[];
  services: {
    [location: string]: LocationData;
  };
  summary: ProposalSummary;
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
}

export type ProposalRow = Database['public']['Tables']['proposals']['Row'];