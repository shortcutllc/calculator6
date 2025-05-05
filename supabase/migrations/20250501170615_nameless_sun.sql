/*
  # Add customization column to proposals table

  1. Changes
    - Add customization column to store proposal customization options
    - Set default value to empty JSON object
    - Add index for efficient querying
*/

-- Add customization column if it doesn't exist
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS customization jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_proposals_customization 
ON proposals USING gin (customization jsonb_path_ops);