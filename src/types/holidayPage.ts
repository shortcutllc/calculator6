export interface HolidayPageData {
  partnerName: string;
  partnerLogoUrl?: string;
  partnerLogoColor?: string; // For SVG color customization
  clientEmail?: string;
  customMessage?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HolidayPageCustomization {
  contactFirstName?: string;
  contactLastName?: string;
  customNote?: string;
  includePricingCalculator: boolean;
  includeTestimonials: boolean;
  includeFAQ: boolean;
  theme?: 'default' | 'winter' | 'corporate';
}

export interface HolidayPage {
  id: string;
  createdAt: string;
  updatedAt: string;
  data: HolidayPageData;
  customization: HolidayPageCustomization;
  isEditable: boolean;
  status: 'draft' | 'published' | 'archived';
  userId?: string;
  uniqueToken?: string; // For public access
  customUrl?: string; // For custom URL system
}

export interface HolidayPageOptions {
  partnerName: string;
  partnerLogoFile?: File;
  partnerLogoUrl?: string;
  clientEmail?: string;
  contactFirstName?: string;
  contactLastName?: string;
  customMessage?: string;
  customization: HolidayPageCustomization;
}

