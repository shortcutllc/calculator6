-- Create proposal_survey_responses table
-- Migration: 20250128000000_create_proposal_survey_responses.sql

CREATE TABLE IF NOT EXISTS proposal_survey_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  table_or_chair_preference TEXT,
  preferred_gender TEXT,
  office_address TEXT,
  massage_space_name TEXT,
  point_of_contact TEXT,
  billing_contact TEXT,
  coi_required BOOLEAN,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(proposal_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_survey_responses_proposal_id ON proposal_survey_responses(proposal_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_submitted_at ON proposal_survey_responses(submitted_at);

-- Enable RLS
ALTER TABLE proposal_survey_responses ENABLE ROW LEVEL SECURITY;

-- RLS policies (drop if exists to allow re-running)
DROP POLICY IF EXISTS "survey_responses_public_read" ON proposal_survey_responses;
CREATE POLICY "survey_responses_public_read" ON proposal_survey_responses
  FOR SELECT USING (true);

-- Allow public insert/update for approved proposals (clients can submit surveys)
DROP POLICY IF EXISTS "survey_responses_public_insert" ON proposal_survey_responses;
CREATE POLICY "survey_responses_public_insert" ON proposal_survey_responses
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "survey_responses_public_update" ON proposal_survey_responses;
CREATE POLICY "survey_responses_public_update" ON proposal_survey_responses
  FOR UPDATE USING (true);

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_survey_response_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at (drop if exists to allow re-running)
DROP TRIGGER IF EXISTS update_survey_response_updated_at ON proposal_survey_responses;
CREATE TRIGGER update_survey_response_updated_at
  BEFORE UPDATE ON proposal_survey_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_survey_response_updated_at();

