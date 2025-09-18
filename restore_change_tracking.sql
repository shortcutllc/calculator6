-- Restore change tracking data for existing proposals
-- This will mark proposals as having changes and pending review so they appear in the history tab

-- First, let's see what proposals we have
SELECT id, client_name, has_changes, pending_review, created_at, updated_at 
FROM proposals 
ORDER BY created_at DESC 
LIMIT 10;

-- Update proposals to have change tracking data
-- Mark all proposals as having changes and pending review
UPDATE proposals 
SET 
  has_changes = true,
  pending_review = true,
  change_source = 'staff'  -- Assuming these were staff-created proposals
WHERE 
  has_changes IS NULL OR has_changes = false;

-- Show the results
SELECT id, client_name, has_changes, pending_review, change_source, created_at, updated_at 
FROM proposals 
ORDER BY created_at DESC 
LIMIT 10;
