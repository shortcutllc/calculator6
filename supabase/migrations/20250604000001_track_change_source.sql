/*
  # Add change source tracking to proposals

  1. Changes
    - Add change_source column to track where changes were made
    - Update change tracking function to set the source
    - Add index for efficient querying
*/

-- Add change_source column
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS change_source text DEFAULT 'staff';

-- Add comment explaining the column's purpose
COMMENT ON COLUMN proposals.change_source IS 'Tracks where changes were made: "staff" for ProposalViewer, "client" for StandaloneProposalViewer';

-- Update the change tracking function to accept and set the change source
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
    
    -- Set change source based on whether user_id is present (staff) or not (client)
    -- If user_id is present, it's a staff edit, otherwise it's a client edit
    IF NEW.user_id IS NOT NULL THEN
      NEW.change_source = 'staff';
    ELSE
      NEW.change_source = 'client';
    END IF;
    
    -- Update the updated_at timestamp
    NEW.updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add index for change source queries
CREATE INDEX IF NOT EXISTS idx_proposals_change_source 
ON proposals(change_source, has_changes)
WHERE has_changes = true; 