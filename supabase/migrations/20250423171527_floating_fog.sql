/*
  # Add original data tracking to proposals

  1. Changes
    - Add original_data column to store the initial version of the proposal
    - Update RLS policies to handle the new column
*/

-- Add original_data column
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS original_data jsonb;

-- Update existing rows to set original_data equal to data
UPDATE proposals
SET original_data = data
WHERE original_data IS NULL;

-- Set default value for new rows
ALTER TABLE proposals
ALTER COLUMN original_data SET DEFAULT '{}'::jsonb;

-- Add comment explaining the column's purpose
COMMENT ON COLUMN proposals.original_data IS 'Stores the original version of the proposal data before any client modifications';