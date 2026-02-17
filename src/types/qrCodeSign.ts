export type ServiceType = 'massage' | 'hair-beauty' | 'headshot' | 'nails' | 'mindfulness' | 'facial';

export interface QRCodeSignData {
  title: string;
  eventDetails: string;
  qrCodeUrl: string;
  serviceType: ServiceType;
  serviceTypes?: ServiceType[]; // Multi-service support (up to 3)
  proposalId?: string; // Linked proposal ID
  partnerName?: string;
  partnerLogoUrl?: string;
  partnerLogoColor?: string; // For SVG color customization
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QRCodeSignCustomization {
  // Placeholder for future customization options
  // e.g., theme, font choices, layout adjustments
}

export interface QRCodeSign {
  id: string;
  createdAt: string;
  updatedAt: string;
  data: QRCodeSignData;
  customization: QRCodeSignCustomization;
  isEditable: boolean;
  status: 'draft' | 'published' | 'archived';
  userId?: string;
  uniqueToken?: string; // For public access
  customUrl?: string; // For custom URL system
}

export interface QRCodeSignOptions {
  title: string;
  eventDetails: string;
  qrCodeUrl: string;
  serviceType: ServiceType;
  serviceTypes?: ServiceType[]; // Multi-service support
  proposalId?: string; // Linked proposal ID
  partnerName?: string;
  partnerLogoFile?: File;
  partnerLogoUrl?: string;
  customization: QRCodeSignCustomization;
}
