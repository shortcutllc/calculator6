-- Create client_email_drafts table for email template generation
CREATE TABLE IF NOT EXISTS client_email_drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  email_type TEXT NOT NULL CHECK (email_type IN ('post-call', 'key-info')),
  service_variant TEXT CHECK (service_variant IN ('generic', 'massage', 'hair', 'nails')),
  subject TEXT NOT NULL DEFAULT '',
  template_data JSONB NOT NULL DEFAULT '{}',
  generated_html TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'archived')),
  notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_email_drafts_user_id ON client_email_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_client_email_drafts_proposal_id ON client_email_drafts(proposal_id);
CREATE INDEX IF NOT EXISTS idx_client_email_drafts_status ON client_email_drafts(status);

-- RLS
ALTER TABLE client_email_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own email drafts" ON client_email_drafts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own email drafts" ON client_email_drafts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own email drafts" ON client_email_drafts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own email drafts" ON client_email_drafts
  FOR DELETE USING (auth.uid() = user_id);
