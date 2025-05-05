/*
  # Add is_shared column to proposals table

  1. Changes
    - Add is_shared boolean column with default value of false
    - Add index for efficient querying of shared proposals
*/

-- Add is_shared column if it doesn't exist
ALTER TABLE proposals 
ADD COLUMN IF NOT EXISTS is_shared boolean DEFAULT false;

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_proposals_is_shared 
ON proposals(is_shared) 
WHERE is_shared = true;