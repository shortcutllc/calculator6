/*
  # Fix change source trigger to respect explicitly set values

  1. Changes
    - Update track_proposal_changes() function to only set change_source if it's NULL
    - This allows explicit change_source values from the application to be preserved
*/

-- Update the change tracking function to respect explicitly set change_source
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
    
    -- Only set change source if it's NULL (not explicitly set)
    -- This allows the application to explicitly set change_source and have it preserved
    IF NEW.change_source IS NULL THEN
      -- Set change source based on whether user_id is present (staff) or not (client)
      -- If user_id is present, it's a staff edit, otherwise it's a client edit
      IF NEW.user_id IS NOT NULL THEN
        NEW.change_source = 'staff';
      ELSE
        NEW.change_source = 'client';
      END IF;
    END IF;
    -- If change_source is already set, we respect that value (it was explicitly set by the application)
    
    -- Update the updated_at timestamp
    NEW.updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

