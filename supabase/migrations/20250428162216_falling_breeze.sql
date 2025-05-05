-- Add index for change tracking
CREATE INDEX IF NOT EXISTS idx_proposals_has_changes 
ON proposals(has_changes, pending_review)
WHERE has_changes = true AND pending_review = true;

-- Add function to track changes
CREATE OR REPLACE FUNCTION track_proposal_changes()
RETURNS trigger AS $$
BEGIN
  -- Only track changes if data has been modified
  IF NEW.data IS DISTINCT FROM OLD.data THEN
    -- Store original data if not already stored
    IF OLD.original_data IS NULL THEN
      NEW.original_data = OLD.data;
    END IF;
    
    -- Mark as having changes
    NEW.has_changes = true;
    NEW.pending_review = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for change tracking
DROP TRIGGER IF EXISTS proposals_track_changes ON proposals;
CREATE TRIGGER proposals_track_changes
  BEFORE UPDATE
  ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION track_proposal_changes();