// Types for coordinator-event-form.js, shared by Create Event (the staff modal) and
// the AI's create_signup_link tool.

export interface CoordinatorService {
  id: string;
  title: string;
  /** Massage, Nails, Hair, Beauty, Photo, Mindfulness */
  type?: string;
}

export const COORDINATOR_SERVICES: CoordinatorService[];
export const PROPOSAL_TO_COORDINATOR_TYPE: Record<string, string>;
export const CATEGORIES: string[];

export function findBestServiceMatch(proposalServiceType: string, massageFormat?: 'chair' | 'table' | ''): CoordinatorService | null;
export function getServicesForProposalType(proposalServiceType: string): CoordinatorService[];
export function resolveCoordinatorService(value: string, massageFormat?: 'chair' | 'table' | ''): CoordinatorService | null;
export function parseAddressString(addressStr: string): { street?: string; city?: string; state?: string; zip?: string };
export function parseProposalDate(dateStr: string): string;
export function generateEventCode(clientName: string, location: string): string;
export function normalizePhone(raw: string): string;
export function parsePointOfContact(poc?: string | null, billing?: string | null): { name: string; phone: string; email: string };
export function surveyAddressFor(surveyResponse: any, location: string): string;
export function surveyEntryFor(surveyResponse: any, location: string): string;
export function surveyServiceLines(surveyResponse: any, serviceTypes: string[]): string[];
export function cleanSpaceName(raw?: string | null): string;
export function serviceNoun(serviceType: string, massageFormat: string): string;
export function nounForCoordinatorService(service: CoordinatorService | null): string;
export function defaultDescription(nouns: string[]): string;
/** One form per (location, date); the modal types the result as its EventFormData. */
export function buildInitialEvents(proposal: any, surveyResponse?: any): any[];
export function validateEvents(events: any[]): Array<{ eventIndex: number; field: string; message: string }>;
