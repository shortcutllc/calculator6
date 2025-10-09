-- Create photographer tokens table for photographer access management
-- This allows photographers to access headshot admin without full user accounts

CREATE TABLE photographer_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  photographer_name TEXT NOT NULL,
  photographer_email TEXT,
  permissions JSONB DEFAULT '{"can_manage_events": true, "can_upload_photos": true, "can_manage_galleries": true}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster token lookups
CREATE INDEX idx_photographer_tokens_token ON photographer_tokens(token);
CREATE INDEX idx_photographer_tokens_active ON photographer_tokens(is_active);

-- Add RLS policies for photographer tokens
ALTER TABLE photographer_tokens ENABLE ROW LEVEL SECURITY;

-- Allow public read access for token validation
CREATE POLICY "photographer_tokens_public_read" ON photographer_tokens
  FOR SELECT USING (is_active = true);

-- Allow admin full access
CREATE POLICY "photographer_tokens_admin_all" ON photographer_tokens
  FOR ALL USING (auth.role() = 'authenticated');

