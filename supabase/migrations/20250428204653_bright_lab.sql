/*
  # Add password protection to proposals

  1. Changes
    - Add `is_password_protected` column to `proposals` table
      - Boolean column with default value of false
      - Not nullable
    - Add index on `is_password_protected` column for faster queries

  2. Security
    - No changes to RLS policies needed
*/

ALTER TABLE proposals 
ADD COLUMN IF NOT EXISTS is_password_protected boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_proposals_password_protected 
ON proposals(is_password_protected) 
WHERE is_password_protected = true;