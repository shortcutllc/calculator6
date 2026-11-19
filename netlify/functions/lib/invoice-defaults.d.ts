// Types for invoice-defaults.js, so the staff invoice windows share the server's rules.

export interface InvoiceLine {
  description: string;
  amount: number;
}

export type PaymentDueReason =
  | 'before-event'
  | 'event-soon'
  | 'event-passed'
  | 'no-event-date'
  | 'no-proposal';

export interface PaymentDueDefault {
  dueDate: string;
  reason: PaymentDueReason;
  eventDate: string | null;
}

export interface InvoiceRecipient {
  name: string;
  email: string;
  nameFrom: 'billing-contact' | 'proposal-contact' | 'company' | null;
  emailFrom: 'billing-contact' | 'proposal' | 'point-of-contact' | null;
}

export const DAYS_BEFORE_EVENT: number;
export const FALLBACK_DUE_DAYS: number;
export function parseIsoDate(iso: string | null | undefined): Date | null;
export function toIsoDate(d: Date): string;
export function addDays(iso: string, days: number): string | null;
export function monthDayOrdinal(iso: string | null | undefined): string | null;
export function longDate(iso: string | null | undefined): string;
export function stripeDueTimestamp(iso: string | null | undefined): number | null;
export function proposalEventDates(data: any): string[];
export function defaultPaymentDue(data: any, todayIso?: string): PaymentDueDefault;
export function paymentDueNote(due: PaymentDueDefault | null | undefined): string | null;
export function invoiceServiceName(service: any): string;
export function invoiceLineDescription(args: {
  companyName?: string;
  date?: string | null;
  service: any;
  location?: string;
  withLocation?: boolean;
}): string;
export function buildInvoiceLineItems(data: any, pricingOptions?: any, selectedOptions?: any): InvoiceLine[];
export function personFromContactText(text: string | null | undefined, companyName?: string): { name: string; email: string };
export function invoiceRecipient(args: {
  companyName?: string | null;
  customization?: { contactFirstName?: string; contactLastName?: string } | null;
  clientEmail?: string | null;
  billingContact?: string | null;
  pointOfContact?: string | null;
}): InvoiceRecipient;
