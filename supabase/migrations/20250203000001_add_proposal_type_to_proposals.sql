-- Add proposal_type field to proposals table
-- Migration: 20250203000001_add_proposal_type_to_proposals.sql

-- Add proposal_type column (defaults to 'event' for backward compatibility)
ALTER TABLE proposals 
ADD COLUMN IF NOT EXISTS proposal_type text DEFAULT 'event';

-- Add comment
COMMENT ON COLUMN proposals.proposal_type IS 'Type of proposal: ''event'' for standard event proposals, ''mindfulness-program'' for structured mindfulness program proposals';

-- Create index for filtering by proposal type
CREATE INDEX IF NOT EXISTS idx_proposals_proposal_type ON proposals(proposal_type);

