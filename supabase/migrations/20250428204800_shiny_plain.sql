/*
  # Add password column to proposals table

  1. Changes
    - Add password column for proposal access
    - Add index for efficient querying
*/

-- Add password column
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS password text,
ADD COLUMN IF NOT EXISTS is_password_protected boolean DEFAULT false;

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_proposals_password_protected 
ON proposals(is_password_protected) 
WHERE is_password_protected = true;