/*
  # Add client_data column to preserve client changes when staff makes changes
  
  1. Changes
    - Add client_data column to store the data state after client changes
    - Update trigger to preserve client changes when staff makes changes
    - This allows us to track client and staff changes separately
*/

-- Add client_data column to store data after client changes
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS client_data jsonb;

-- Add comment explaining the column's purpose
COMMENT ON COLUMN proposals.client_data IS 'Stores the proposal data after client changes, before staff changes. Used to track client and staff changes separately.';

-- Update the change tracking function to preserve client changes
CREATE OR REPLACE FUNCTION track_proposal_changes()
RETURNS trigger AS $$
BEGIN
  -- Only track changes if data has been modified
  IF NEW.data IS DISTINCT FROM OLD.data THEN
    -- If staff is making changes (user_id is present) and client_data exists,
    -- it means client already made changes. Preserve client_data and update original_data
    IF NEW.user_id IS NOT NULL AND OLD.client_data IS NOT NULL THEN
      -- Staff is making changes after client changes
      -- Keep client_data as is (it has the post-client-change state)
      -- Update original_data to client_data so we can track staff changes separately
      NEW.original_data = OLD.client_data;
    ELSIF NEW.user_id IS NULL AND OLD.original_data IS NOT NULL THEN
      -- Client is making changes
      -- Store the current data (before client changes) in original_data if not already set
      -- Store the new data (after client changes) in client_data
      IF OLD.client_data IS NULL THEN
        -- First client change - preserve the original data
        NEW.client_data = NEW.data;
      ELSE
        -- Client making additional changes - update client_data
        NEW.client_data = NEW.data;
      END IF;
    ELSIF OLD.original_data IS NULL OR NOT OLD.has_changes THEN
      -- First time tracking changes
      NEW.original_data = OLD.data;
      IF NEW.user_id IS NULL THEN
        -- Client making first change
        NEW.client_data = NEW.data;
      END IF;
    END IF;
    
    -- Always mark as having changes and pending review
    NEW.has_changes = true;
    NEW.pending_review = true;
    
    -- Only set change source if it's NULL (not explicitly set)
    IF NEW.change_source IS NULL THEN
      IF NEW.user_id IS NOT NULL THEN
        NEW.change_source = 'staff';
      ELSE
        NEW.change_source = 'client';
      END IF;
    END IF;
    
    -- Update the updated_at timestamp
    NEW.updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;



