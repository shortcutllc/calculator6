-- Add is_test column to proposals table
-- Migration: 20250202000000_add_is_test_to_proposals.sql

ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT false;

COMMENT ON COLUMN proposals.is_test IS 'Marks a proposal as a test proposal, allowing it to be filtered separately from production proposals.';

-- Create an index for faster filtering
CREATE INDEX IF NOT EXISTS idx_proposals_is_test ON proposals(is_test);






