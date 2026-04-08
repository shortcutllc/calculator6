export type EmailType = 'post-call' | 'key-info' | 'workhuman-outreach';
export type ServiceVariant = 'generic' | 'massage' | 'hair' | 'nails';
export type WorkhumanDirection = 'safe' | 'medium' | 'brave';
export type EmailDraftStatus = 'draft' | 'sent' | 'archived';

export interface ProInfo {
  name: string;
  type: string;
}

export interface PostCallTemplateData {
  contactName: string;
  companyName: string;
  eventType: string;
  proposalLink: string;
  testSignupLink: string;
}

export interface KeyInfoTemplateData {
  contactName: string;
  companyName: string;
  eventDate: string;
  eventType: string;
  bookingLink: string;
  managerPageLink: string;
  proInfo: ProInfo[];
  invoiceLink: string;
  paymentDueDate: string;
  qrCodeSignLink: string;
}

export interface WorkhumanOutreachTemplateData {
  contactName: string;
  companyName: string;
  bookingLink: string;
  direction: WorkhumanDirection;
}

export type ClientEmailTemplateData = PostCallTemplateData | KeyInfoTemplateData | WorkhumanOutreachTemplateData;

export interface ClientEmailDraft {
  id: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  proposalId: string | null;
  emailType: EmailType;
  serviceVariant: ServiceVariant | null;
  subject: string;
  templateData: ClientEmailTemplateData;
  generatedHtml: string | null;
  status: EmailDraftStatus;
  notes: string | null;
}
