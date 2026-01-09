// Reuse the same structure as holiday pages since they're identical
export interface GenericLandingPageData {
  partnerName: string;
  partnerLogoUrl?: string;
  partnerLogoColor?: string; // For SVG color customization
  clientEmail?: string;
  customMessage?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GenericLandingPageCustomization {
  contactFirstName?: string;
  contactLastName?: string;
  customNote?: string;
  includePricingCalculator: boolean;
  includeTestimonials: boolean;
  includeFAQ: boolean;
  theme?: 'default' | 'corporate';
}

export interface GenericLandingPage {
  id: string;
  createdAt: string;
  updatedAt: string;
  data: GenericLandingPageData;
  customization: GenericLandingPageCustomization;
  isEditable: boolean;
  status: 'draft' | 'published' | 'archived';
  userId?: string;
  uniqueToken?: string; // For public access
  customUrl?: string; // For custom URL system
}

export interface GenericLandingPageOptions {
  partnerName: string;
  partnerLogoFile?: File;
  partnerLogoUrl?: string;
  clientEmail?: string;
  contactFirstName?: string;
  contactLastName?: string;
  customMessage?: string;
  customization: GenericLandingPageCustomization;
}



