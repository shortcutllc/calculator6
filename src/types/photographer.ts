// Photographer Portal Types

export interface PhotographerToken {
  id: string;
  token: string;
  photographer_name: string;
  photographer_email?: string;
  permissions: {
    can_manage_events: boolean;
    can_upload_photos: boolean;
    can_manage_galleries: boolean;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PhotographerAccess {
  token: string;
  photographer_name: string;
  permissions: PhotographerToken['permissions'];
}

export interface PhotographerEventAssignment {
  id: string;
  photographer_token_id: string;
  event_id: string;
  assigned_at: string;
  assigned_by?: string;
  // Joined data
  event?: {
    id: string;
    event_name: string;
    event_date: string;
    status: string;
  };
  photographer?: {
    id: string;
    photographer_name: string;
    photographer_email?: string;
    token: string;
  };
}
