export type StripeInvoiceStatus = 'draft' | 'open' | 'sent' | 'paid' | 'uncollectible' | 'void';

export interface StripeInvoice {
  id: string;
  createdAt: string;
  updatedAt: string;
  proposalId: string | null;
  stripeInvoiceId: string;
  stripeCustomerId: string;
  invoiceUrl: string;
  status: StripeInvoiceStatus;
  amountCents: number;
  clientName: string;
  createdByUserId: string | null;
}
