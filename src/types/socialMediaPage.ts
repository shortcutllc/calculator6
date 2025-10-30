export interface SocialMediaContactRequest {
  id: string;
  createdAt: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  location?: string;
  serviceType?: string;
  eventDate?: string;
  appointmentCount?: string;
  message?: string;
  platform: 'linkedin' | 'meta';
  campaignId?: string;
  adSetId?: string;
  adId?: string;
  status: 'new' | 'contacted' | 'followed_up' | 'closed';
  // UTM Tracking
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  referrer?: string;
  userAgent?: string;
  ipAddress?: string;
  leadScore: number;
  conversionValue: number;
}

export interface SocialMediaPageData {
  platform: 'linkedin' | 'meta';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SocialMediaPage {
  id: string;
  createdAt: string;
  updatedAt: string;
  data: SocialMediaPageData;
  isEditable: boolean;
  status: 'draft' | 'published' | 'archived';
  uniqueToken?: string;
  customUrl?: string;
}

export interface SocialMediaFormData {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  location: string;
  employees?: string;
  serviceType: string;
  eventDate: string;
  appointmentCount: string;
  customAppointmentCount: string;
  message: string;
}
