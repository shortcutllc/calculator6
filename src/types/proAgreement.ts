export type AgreementStatus = 'pending' | 'sent' | 'opened' | 'completed' | 'expired' | 'declined';
export type DocumentType = 'ica' | 'w9' | 'workers_comp' | 'custom';

export interface ProAgreementTemplate {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  documentType: DocumentType;
  docusealTemplateId: number;
  isActive: boolean;
  createdByUserId: string | null;
}

export interface ProAgreement {
  id: string;
  createdAt: string;
  updatedAt: string;
  templateId: string;
  proName: string;
  proEmail: string;
  status: AgreementStatus;
  docusealSubmissionId: number | null;
  signingSlug: string | null;
  signingUrl: string | null;
  completedAt: string | null;
  documentsUrl: string | null;
  sentAt: string | null;
  openedAt: string | null;
  createdByUserId: string | null;
  // Joined from template
  templateName?: string;
  documentType?: DocumentType;
}
