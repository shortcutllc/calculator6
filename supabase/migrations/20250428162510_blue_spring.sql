/*
  # Fix change tracking and comparison functionality

  1. Changes
    - Add timestamp tracking for changes
    - Ensure original data is preserved
    - Fix trigger function to handle null cases
*/

-- Drop existing trigger first
DROP TRIGGER IF EXISTS proposals_track_changes ON proposals;

-- Improve change tracking function
CREATE OR REPLACE FUNCTION track_proposal_changes()
RETURNS trigger AS $$
BEGIN
  -- Only track changes if data has been modified
  IF NEW.data IS DISTINCT FROM OLD.data THEN
    -- Store original data if not already stored
    IF OLD.original_data IS NULL OR NOT OLD.has_changes THEN
      NEW.original_data = OLD.data;
    END IF;
    
    -- Always mark as having changes and pending review
    NEW.has_changes = true;
    NEW.pending_review = true;
    
    -- Update the updated_at timestamp
    NEW.updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger with improved function
CREATE TRIGGER proposals_track_changes
  BEFORE UPDATE
  ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION track_proposal_changes();

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_proposals_changes 
ON proposals(has_changes, pending_review, updated_at)
WHERE has_changes = true;