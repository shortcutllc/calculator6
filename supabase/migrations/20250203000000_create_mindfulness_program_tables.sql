-- Add Mindfulness Program System Tables
-- Migration: 20250203000000_create_mindfulness_program_tables.sql

-- Create facilitators table
CREATE TABLE IF NOT EXISTS facilitators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  bio TEXT,
  photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create mindfulness_programs table
CREATE TABLE IF NOT EXISTS mindfulness_programs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  program_name VARCHAR(255) NOT NULL,
  facilitator_id UUID REFERENCES facilitators(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  total_participants INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create participant_folders table
CREATE TABLE IF NOT EXISTS participant_folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES mindfulness_programs(id) ON DELETE CASCADE,
  participant_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  unique_token VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'enrolled', 'active', 'completed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create program_documents table
CREATE TABLE IF NOT EXISTS program_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id UUID NOT NULL REFERENCES participant_folders(id) ON DELETE CASCADE,
  document_url TEXT NOT NULL,
  document_name VARCHAR(255),
  document_type VARCHAR(50) CHECK (document_type IN ('recording', 'handout', 'exercise', 'other')),
  uploaded_by UUID REFERENCES auth.users,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create program_sessions table
CREATE TABLE IF NOT EXISTS program_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES mindfulness_programs(id) ON DELETE CASCADE,
  session_number INTEGER NOT NULL,
  session_date DATE NOT NULL,
  session_time TIME,
  session_duration_minutes INTEGER,
  session_type VARCHAR(50) CHECK (session_type IN ('in-person', 'virtual')),
  session_title TEXT,
  session_content TEXT,
  location TEXT,
  meeting_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(program_id, session_number)
);

-- Create program_notifications table
CREATE TABLE IF NOT EXISTS program_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id UUID REFERENCES participant_folders(id) ON DELETE CASCADE,
  session_id UUID REFERENCES program_sessions(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) CHECK (notification_type IN ('email', 'sms', 'calendar_invite', 'document_uploaded')),
  email_address VARCHAR(255),
  phone_number VARCHAR(50),
  message_content TEXT,
  calendar_event_id TEXT,
  status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create facilitator_program_access table
CREATE TABLE IF NOT EXISTS facilitator_program_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facilitator_id UUID NOT NULL REFERENCES facilitators(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES mindfulness_programs(id) ON DELETE CASCADE,
  access_level VARCHAR(50) DEFAULT 'full' CHECK (access_level IN ('read', 'write', 'full')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(facilitator_id, program_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mindfulness_programs_status ON mindfulness_programs(status);
CREATE INDEX IF NOT EXISTS idx_mindfulness_programs_dates ON mindfulness_programs(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_mindfulness_programs_proposal_id ON mindfulness_programs(proposal_id);
CREATE INDEX IF NOT EXISTS idx_participant_folders_program_id ON participant_folders(program_id);
CREATE INDEX IF NOT EXISTS idx_participant_folders_token ON participant_folders(unique_token);
CREATE INDEX IF NOT EXISTS idx_participant_folders_status ON participant_folders(status);
CREATE INDEX IF NOT EXISTS idx_program_documents_folder_id ON program_documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_program_documents_type ON program_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_program_sessions_program_id ON program_sessions(program_id);
CREATE INDEX IF NOT EXISTS idx_program_sessions_date ON program_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_program_notifications_folder_id ON program_notifications(folder_id);
CREATE INDEX IF NOT EXISTS idx_program_notifications_type ON program_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_facilitator_program_access_facilitator ON facilitator_program_access(facilitator_id);
CREATE INDEX IF NOT EXISTS idx_facilitator_program_access_program ON facilitator_program_access(program_id);

-- Create triggers for updated_at
CREATE TRIGGER update_facilitators_updated_at
  BEFORE UPDATE ON facilitators
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mindfulness_programs_updated_at
  BEFORE UPDATE ON mindfulness_programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_participant_folders_updated_at
  BEFORE UPDATE ON participant_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_program_sessions_updated_at
  BEFORE UPDATE ON program_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies for security
ALTER TABLE facilitators ENABLE ROW LEVEL SECURITY;
ALTER TABLE mindfulness_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilitator_program_access ENABLE ROW LEVEL SECURITY;

-- Policy for facilitators (admin only)
CREATE POLICY "facilitators_admin_only" ON facilitators
  FOR ALL USING (auth.role() = 'authenticated');

-- Policy for mindfulness_programs (admin + facilitator access)
CREATE POLICY "mindfulness_programs_admin_access" ON mindfulness_programs
  FOR ALL USING (auth.role() = 'authenticated');

-- Policy for participant_folders (admin + facilitator + public read via token)
CREATE POLICY "participant_folders_admin_access" ON participant_folders
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "participant_folders_public_read" ON participant_folders
  FOR SELECT USING (true);

-- Policy for program_documents (admin + facilitator + public read via token)
CREATE POLICY "program_documents_admin_access" ON program_documents
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "program_documents_public_read" ON program_documents
  FOR SELECT USING (true);

-- Policy for program_sessions (admin + facilitator + public read)
CREATE POLICY "program_sessions_admin_access" ON program_sessions
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "program_sessions_public_read" ON program_sessions
  FOR SELECT USING (true);

-- Policy for program_notifications (admin only)
CREATE POLICY "program_notifications_admin_only" ON program_notifications
  FOR ALL USING (auth.role() = 'authenticated');

-- Policy for facilitator_program_access (admin only)
CREATE POLICY "facilitator_program_access_admin_only" ON facilitator_program_access
  FOR ALL USING (auth.role() = 'authenticated');

-- Create storage bucket for program documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('mindfulness-program-documents', 'mindfulness-program-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for program documents (admin + facilitator access)
CREATE POLICY "program_documents_storage_admin_access" ON storage.objects
  FOR ALL USING (bucket_id = 'mindfulness-program-documents' AND auth.role() = 'authenticated');

-- Create storage policy for public read access to documents (for participant folders)
CREATE POLICY "program_documents_storage_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'mindfulness-program-documents');

-- Insert default facilitator (Courtney Schulnick)
INSERT INTO facilitators (name, email, bio, is_active)
VALUES (
  'Courtney Schulnick',
  'courtney@getshortcut.co',
  'Shortcut''s Mindfulness Meditation Leader, specializing in guiding high-performing teams through punctual, engaging, and impactful mindfulness sessions.',
  true
)
ON CONFLICT DO NOTHING;



