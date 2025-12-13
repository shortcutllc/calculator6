/*
  # Add Proposal Groups Support
  
  This migration adds support for linking multiple proposals together as options.
  This allows clients to view and compare different proposal scenarios (e.g., 2 events vs 3 events vs 4 events).
  
  1. Changes
    - Add proposal_group_id to link proposals together
    - Add option_name for display labels (e.g., "2 Events", "3 Events")
    - Add option_order for sorting options (1, 2, 3, etc.)
    - Add indexes for efficient queries
*/

-- Add proposal_group_id column to link proposals together
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS proposal_group_id uuid;

-- Add option_name for labeling (e.g., "Option 1: 2 Events", "Option 2: 3 Events")
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS option_name text;

-- Add option_order for sorting (1, 2, 3, etc.)
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS option_order integer;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_proposals_group_id ON proposals(proposal_group_id)
WHERE proposal_group_id IS NOT NULL;

-- Add comments explaining the columns' purpose
COMMENT ON COLUMN proposals.proposal_group_id IS 'Links proposals together as options. All proposals with the same group_id are part of the same option set. NULL means the proposal is standalone.';
COMMENT ON COLUMN proposals.option_name IS 'Display name for this option (e.g., "2 Events", "3 Events", "Quarterly"). Used in the option switcher UI.';
COMMENT ON COLUMN proposals.option_order IS 'Order in which options should be displayed in the switcher (1, 2, 3, etc.). Lower numbers appear first.';

