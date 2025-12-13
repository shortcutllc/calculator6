/*
  # Preserve client changes when staff makes changes
  
  1. Changes
    - Update track_proposal_changes() function to preserve client changes when staff makes changes
    - When staff makes changes after client changes, update original_data to the current data
    - This allows us to track staff changes separately from client changes
*/

-- Update the change tracking function to preserve client changes
CREATE OR REPLACE FUNCTION track_proposal_changes()
RETURNS trigger AS $$
BEGIN
  -- Only track changes if data has been modified
  IF NEW.data IS DISTINCT FROM OLD.data THEN
    -- If staff is making changes (user_id is present) and there are already changes (has_changes = true),
    -- preserve the current data as the new original_data so we can track staff changes separately
    IF NEW.user_id IS NOT NULL AND OLD.has_changes = true AND OLD.original_data IS NOT NULL THEN
      -- Staff is making changes after client changes
      -- Update original_data to the current data (which includes client changes)
      -- This way, when we compare original_data to NEW.data, we only see staff changes
      NEW.original_data = OLD.data;
    ELSIF OLD.original_data IS NULL OR NOT OLD.has_changes THEN
      -- First time tracking changes, or no previous changes
      NEW.original_data = OLD.data;
    END IF;
    -- If original_data is already set and this is a client change, keep it as is
    
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



