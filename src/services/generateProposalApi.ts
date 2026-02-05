/**
 * Frontend API client for the Generate Proposal API.
 * Handles Supabase auth token retrieval and request formatting.
 *
 * Usage:
 *   import { createProposal, editProposal, searchProposals } from './generateProposalApi';
 *
 *   const proposal = await createProposal({ clientName: 'Burberry', events: [...] });
 *   const updated = await editProposal('uuid', [{ op: 'set_gratuity', type: 'percentage', value: 20 }]);
 *   const results = await searchProposals('Burberry');
 */

import { supabase } from '../lib/supabaseClient';

// --- Types ---

export interface ServiceEvent {
  serviceType: string;
  location?: string;
  date?: string;
  totalHours?: number;
  numPros?: number;
  appTime?: number;
  proHourly?: number;
  hourlyRate?: number;
  earlyArrival?: number;
  retouchingCost?: number;
  discountPercent?: number;
  headshotTier?: 'basic' | 'premium' | 'executive';
  mindfulnessType?: 'intro' | 'drop-in' | 'mindful-movement';
  isRecurring?: boolean;
  recurringFrequency?: {
    type: 'quarterly' | 'monthly' | 'custom';
    occurrences: number;
  };
  classLength?: number;
  fixedPrice?: number;
  participants?: string | number;
}

export interface ProposalCustomizationInput {
  contactFirstName?: string;
  contactLastName?: string;
  customNote?: string;
  programIntroCopy?: string;
  includeSummary?: boolean;
  includeCalculations?: boolean;
  includeCalculator?: boolean;
}

export interface CreateProposalRequest {
  clientName: string;
  clientEmail?: string;
  clientLogoUrl?: string;
  locations?: string[];
  events: ServiceEvent[];
  customization?: ProposalCustomizationInput;
  gratuityType?: 'percentage' | 'dollar' | null;
  gratuityValue?: number | null;
  proposalType?: 'event' | 'mindfulness-program';
  notes?: string;
  storeLogoCopy?: boolean;
}

export interface EditOperation {
  op: string;
  location?: string;
  date?: string;
  serviceIndex?: number;
  service?: ServiceEvent;
  updates?: Record<string, unknown>;
  type?: string;
  value?: number;
  frequency?: { type: string; occurrences: number };
  discountPercent?: number;
  customization?: Partial<ProposalCustomizationInput>;
  clientName?: string;
  clientEmail?: string;
  clientLogoUrl?: string;
  status?: string;
}

export interface ProposalSummary {
  totalAppointments: number;
  totalEventCost: number;
  totalProRevenue: number;
  netProfit: number;
  profitMargin: number;
  gratuityAmount?: number;
  subtotalBeforeGratuity?: number;
}

export interface ProposalResponse {
  id: string;
  url: string;
  clientName: string;
  status: string;
  summary: ProposalSummary;
  eventCount: number;
  locations: string[];
  eventDates: string[];
  slackNotified: boolean;
}

export interface SearchResult {
  id: string;
  clientName: string;
  createdAt: string;
  updatedAt?: string;
  status: string;
  totalCost: number;
  totalAppointments: number;
  locations: string[];
  eventDates: string[];
  proposalType: string;
  serviceTypes: string[];
}

export interface CalculateOption {
  numPros: number;
  totalHours: number;
  actualAppointments: number;
  estimatedCost: number;
  exactMatch: boolean;
  note?: string;
}

export interface ClientInfo {
  name: string;
  email?: string | null;
  logoUrl?: string | null;
  locations?: string[];
  contacts?: string[];
  proposalCount?: number;
  lastProposalDate?: string;
  suggestedLogoUrl?: string | null;
  source?: string;
}

// --- API Error ---

export class ProposalApiError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = 'ProposalApiError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

// --- Internal Helpers ---

const API_BASE = '/.netlify/functions/generate-proposal';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new ProposalApiError('Not authenticated', 'AUTH_MISSING', 401);
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  };
}

async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const result = await response.json();

  if (!result.success) {
    throw new ProposalApiError(
      result.error || 'API request failed',
      result.code || 'UNKNOWN_ERROR',
      response.status
    );
  }

  return result;
}

// --- Public API ---

/**
 * Create a new proposal.
 */
export async function createProposal(
  request: CreateProposalRequest
): Promise<ProposalResponse> {
  const result = await apiRequest<{ success: boolean; proposal: ProposalResponse }>(
    'POST',
    '',
    request
  );
  return result.proposal;
}

/**
 * Edit an existing proposal using an operations array.
 */
export async function editProposal(
  proposalId: string,
  operations: EditOperation[]
): Promise<{ proposal: ProposalResponse; changesSummary: Array<{ op: string; description: string }> }> {
  const result = await apiRequest<{
    success: boolean;
    proposal: ProposalResponse;
    changesSummary: Array<{ op: string; description: string }>;
  }>('PATCH', '', { proposalId, operations });

  return {
    proposal: result.proposal,
    changesSummary: result.changesSummary
  };
}

/**
 * Search proposals by client name.
 */
export async function searchProposals(
  searchTerm: string
): Promise<SearchResult[]> {
  const result = await apiRequest<{ success: boolean; results: SearchResult[] }>(
    'GET',
    `?search=${encodeURIComponent(searchTerm)}`
  );
  return result.results;
}

/**
 * Get a single proposal by ID.
 */
export async function getProposal(proposalId: string): Promise<unknown> {
  const result = await apiRequest<{ success: boolean; proposal: unknown }>(
    'GET',
    `?id=${encodeURIComponent(proposalId)}`
  );
  return result.proposal;
}

/**
 * Calculate staffing options for a target number of appointments.
 */
export async function calculateOptions(
  serviceType: string,
  targetAppointments: number,
  overrides?: Record<string, unknown>
): Promise<{
  serviceType: string;
  targetAppointments: number;
  appointmentTime: number;
  apptsPerProPerHour: number;
  options: CalculateOption[];
  constraints: { maxHoursPerDay: number; validHourIncrements: number[] };
}> {
  return await apiRequest('POST', '?action=calculate', {
    serviceType,
    targetAppointments,
    overrides
  });
}

/**
 * Look up client info from past proposals.
 */
export async function lookupClient(
  clientName: string
): Promise<{
  found: boolean;
  client: ClientInfo;
  alternateMatches?: ClientInfo[];
}> {
  return await apiRequest(
    'GET',
    `?action=client&name=${encodeURIComponent(clientName)}`
  );
}

// ============================================================
// PROPOSAL DUPLICATION
// ============================================================

export interface DuplicateProposalRequest {
  proposalId: string;
  newTitle?: string;
  notes?: string;
  recalculate?: boolean;
}

export interface DuplicateProposalResponse {
  id: string;
  url: string;
  clientName: string;
  status: string;
  summary: ProposalSummary | null;
  duplicatedFrom: string;
  slackNotified: boolean;
}

/**
 * Duplicate an existing proposal.
 */
export async function duplicateProposal(
  request: DuplicateProposalRequest
): Promise<DuplicateProposalResponse> {
  const result = await apiRequest<{ success: boolean; proposal: DuplicateProposalResponse }>(
    'POST',
    '?action=duplicate',
    request
  );
  return result.proposal;
}

// ============================================================
// PROPOSAL LINKING (GROUPS)
// ============================================================

export interface ProposalOption {
  id: string;
  clientName: string;
  optionName: string;
  optionOrder: number;
  status: string;
  summary?: ProposalSummary | null;
}

/**
 * Create a new option by duplicating a proposal into a group.
 */
export async function createOption(
  proposalId: string,
  optionName?: string
): Promise<{
  newProposal: { id: string; url: string; clientName: string; optionName: string; optionOrder: number };
  groupId: string;
  optionCount: number;
}> {
  return await apiRequest('POST', '?action=create-option', { proposalId, optionName });
}

/**
 * Link existing proposals together into a group.
 */
export async function linkProposalsApi(
  sourceProposalId: string,
  proposalIds: string[]
): Promise<{
  groupId: string;
  linkedCount: number;
  options: ProposalOption[];
}> {
  return await apiRequest('POST', '?action=link', { sourceProposalId, proposalIds });
}

/**
 * Remove a proposal from its group.
 */
export async function unlinkProposal(
  proposalId: string
): Promise<{
  unlinked: boolean;
  remainingOptions: ProposalOption[];
}> {
  return await apiRequest('POST', '?action=unlink', { proposalId });
}

/**
 * Rename an option in a group.
 */
export async function renameOption(
  proposalId: string,
  optionName: string
): Promise<{ updated: ProposalOption }> {
  return await apiRequest('POST', '?action=rename-option', { proposalId, optionName });
}

/**
 * Reorder an option in a group.
 */
export async function reorderOption(
  proposalId: string,
  optionOrder: number
): Promise<{ updated: ProposalOption }> {
  return await apiRequest('POST', '?action=reorder-option', { proposalId, optionOrder });
}

/**
 * Get all options in a proposal's group.
 */
export async function getGroupOptions(
  proposalId: string
): Promise<{
  groupId: string | null;
  options: ProposalOption[];
}> {
  return await apiRequest('GET', `?action=group-options&id=${encodeURIComponent(proposalId)}`);
}

// ============================================================
// LANDING PAGES
// ============================================================

export interface LandingPageCustomization {
  contactFirstName?: string;
  contactLastName?: string;
  customNote?: string;
  includePricingCalculator?: boolean;
  includeTestimonials?: boolean;
  includeFAQ?: boolean;
  theme?: 'default' | 'corporate';
}

export interface CreateLandingPageRequest {
  partnerName: string;
  partnerLogoUrl?: string;
  partnerLogoColor?: string;
  clientEmail?: string;
  customMessage?: string;
  customization?: LandingPageCustomization;
  isReturningClient?: boolean;
  status?: 'draft' | 'published';
  storeLogoCopy?: boolean;
}

export interface LandingPageResponse {
  id: string;
  url: string;
  uniqueToken?: string;
  partnerName: string;
  status: string;
}

export interface LandingPageDetail {
  id: string;
  url: string;
  data: {
    partnerName: string;
    partnerLogoUrl?: string;
    partnerLogoColor?: string;
    clientEmail?: string;
    customMessage?: string;
    isActive: boolean;
  };
  customization: LandingPageCustomization;
  status: string;
  isReturningClient: boolean;
  uniqueToken: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create a new generic landing page.
 */
export async function createLandingPage(
  request: CreateLandingPageRequest
): Promise<LandingPageResponse> {
  const result = await apiRequest<{ success: boolean; landingPage: LandingPageResponse }>(
    'POST',
    '?action=create-landing-page',
    request
  );
  return result.landingPage;
}

/**
 * Update an existing landing page.
 */
export async function updateLandingPage(
  pageId: string,
  updates: Partial<CreateLandingPageRequest> & {
    data?: Record<string, unknown>;
    isEditable?: boolean;
  }
): Promise<LandingPageResponse> {
  const result = await apiRequest<{ success: boolean; landingPage: LandingPageResponse }>(
    'PATCH',
    '?action=update-landing-page',
    { pageId, ...updates }
  );
  return result.landingPage;
}

/**
 * Get a landing page by ID.
 */
export async function getLandingPage(
  pageId: string
): Promise<LandingPageDetail> {
  const result = await apiRequest<{ success: boolean; landingPage: LandingPageDetail }>(
    'GET',
    `?action=landing-page&id=${encodeURIComponent(pageId)}`
  );
  return result.landingPage;
}

/**
 * Search landing pages by partner name.
 */
export async function searchLandingPages(
  searchTerm: string
): Promise<LandingPageResponse[]> {
  const result = await apiRequest<{ success: boolean; results: LandingPageResponse[] }>(
    'GET',
    `?action=search-landing-pages&search=${encodeURIComponent(searchTerm)}`
  );
  return result.results;
}
