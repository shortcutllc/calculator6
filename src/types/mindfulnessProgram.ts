// Mindfulness Program System Types

export interface Facilitator {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  bio?: string;
  photo_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MindfulnessProgram {
  id: string;
  proposal_id?: string;
  program_name: string;
  facilitator_id?: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  total_participants: number;
  client_logo_url?: string;
  created_at: string;
  updated_at: string;
  facilitator?: Facilitator;
}

export interface ParticipantFolder {
  id: string;
  program_id: string;
  participant_name: string;
  email: string;
  phone?: string;
  unique_token: string;
  status: 'pending' | 'enrolled' | 'active' | 'completed';
  notes?: string;
  created_at: string;
  updated_at: string;
  documents?: ProgramDocument[];
  program?: MindfulnessProgram;
}

export interface ProgramDocument {
  id: string;
  folder_id: string;
  document_url: string;
  document_name?: string;
  document_type: 'recording' | 'handout' | 'exercise' | 'other';
  uploaded_by?: string;
  uploaded_at: string;
}

export interface ProgramSession {
  id: string;
  program_id: string;
  session_number: number;
  session_date: string;
  session_time?: string;
  session_duration_minutes?: number;
  session_type: 'in-person' | 'virtual';
  session_title?: string;
  session_content?: string;
  location?: string;
  meeting_link?: string;
  created_at: string;
  updated_at: string;
}

export interface ProgramNotification {
  id: string;
  folder_id?: string;
  session_id?: string;
  notification_type: 'email' | 'sms' | 'calendar_invite' | 'document_uploaded';
  email_address?: string;
  phone_number?: string;
  message_content?: string;
  calendar_event_id?: string;
  status: 'pending' | 'sent' | 'failed' | 'delivered';
  sent_at: string;
}

export interface FacilitatorProgramAccess {
  id: string;
  facilitator_id: string;
  program_id: string;
  access_level: 'read' | 'write' | 'full';
  created_at: string;
}

export interface CSVParticipantData {
  name: string;
  email: string;
  phone?: string;
}

export interface MindfulnessProgramStats {
  total_participants: number;
  enrolled: number;
  active: number;
  completed: number;
}

export interface DocumentUploadProgress {
  folderId: string;
  participantName: string;
  totalDocuments: number;
  uploadedDocuments: number;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}



