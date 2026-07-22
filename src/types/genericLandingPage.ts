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

// Conference pages: per-package display overrides, keyed by package id
// (reset-zone, glow-lounge, polish-bar, studio, stretch-lab, mindful-reset,
// sound-sanctuary, movement-studio). Prices are display strings so staff can
// write anything ("$1,500", "Custom").
export interface ConferencePackageOverride {
  price?: string;
  unit?: string;
  hidden?: boolean;
}

export interface GenericLandingPageCustomization {
  contactFirstName?: string;
  contactLastName?: string;
  customNote?: string;
  includePricingCalculator: boolean;
  includeTestimonials: boolean;
  includeFAQ: boolean;
  theme?: 'default' | 'corporate';
  // For Book-a-Call pages: which team member owns this page. Drives which
  // Google Calendar booking link is embedded. Value is a SenderName from
  // workhumanOutreachTemplates (e.g. 'Will Newton'). Defaults to Will if unset.
  bookingRep?: string;
  // Info-only variant: hides the booking card/modal/CTAs, shows a service-video
  // montage + soft "learn more" link instead. Served at /info/:token.
  infoOnly?: boolean;
  // Conference pages only (page_type='conference'):
  showPackages?: boolean;        // default true — render the packages section at all
  showPackagePricing?: boolean;  // default true — render "Starting at $X" rows
  packageOverrides?: Record<string, ConferencePackageOverride>;
  // Per-section design variants (mirror the design file's switcher):
  heroVariant?: 'editorial' | 'cover' | 'stage';       // default 'editorial'
  servicesVariant?: 'rail' | 'grid';                   // default 'rail'
  packagesVariant?: 'stations' | 'bundles';            // default 'stations'
  goodToKnowVariant?: 'list' | 'cards';                // default 'list'
}

export type LandingPageType = 'generic' | 'workhuman' | 'conference';

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
  isReturningClient?: boolean; // Whether this is for a returning client (shows personalized messaging)
  pageType?: LandingPageType; // 'generic' (default) or 'workhuman'
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
  isReturningClient?: boolean; // Whether this is for a returning client
  pageType?: LandingPageType; // 'generic' (default) or 'workhuman'
}



