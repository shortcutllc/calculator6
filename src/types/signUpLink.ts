export interface SignUpLink {
  id: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  // Proposal
  proposalId: string;
  proposalClientName: string;
  // Event
  eventDate: string;
  eventLocation: string;
  eventName: string;
  serviceTypes: string[];
  // Coordinator
  coordinatorEventId: string | null;
  signupUrl: string | null;
  // Status
  status: 'pending' | 'active' | 'archived';
  // Full event payload for re-creating if needed
  eventPayload: Record<string, any> | null;
}

export interface CreateSignUpLinkOptions {
  proposalId: string;
  proposalClientName: string;
  eventDate: string;
  eventLocation: string;
  eventName: string;
  serviceTypes: string[];
  coordinatorEventId?: string | null;
  signupUrl?: string | null;
  eventPayload?: Record<string, any> | null;
}
