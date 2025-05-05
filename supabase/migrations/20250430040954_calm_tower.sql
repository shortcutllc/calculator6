/*
  # Initial schema setup for proposals

  1. New Tables
    - `proposals`
      - `id` (uuid, primary key)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `client_name` (text)
      - `data` (jsonb)
      - `customization` (jsonb)
      - `is_editable` (boolean)
      - `user_id` (uuid, references auth.users)
      - `status` (text)
      - `pending_review` (boolean)
      - `has_changes` (boolean)
      - `original_data` (jsonb)

  2. Security
    - Enable RLS on `proposals` table
    - Add policies for public access and updates
*/

-- Create proposals table
CREATE TABLE IF NOT EXISTS proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  client_name text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  customization jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_editable boolean DEFAULT true,
  user_id uuid REFERENCES auth.users,
  status text DEFAULT 'draft',
  pending_review boolean DEFAULT false,
  has_changes boolean DEFAULT false,
  original_data jsonb
);

-- Enable RLS
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users"
ON proposals
FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON proposals
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for owners and shared proposals"
ON proposals
FOR UPDATE
TO public
USING (
  auth.uid() = user_id OR
  (is_editable = true)
);

CREATE POLICY "Enable delete for owners"
ON proposals
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Add function to track changes
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
    
    -- Update the updated_at timestamp
    NEW.updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for change tracking
CREATE TRIGGER proposals_track_changes
  BEFORE UPDATE
  ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION track_proposal_changes();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_proposals_shared_access 
ON proposals(is_editable)
WHERE is_editable = true;

CREATE INDEX IF NOT EXISTS idx_proposals_changes 
ON proposals(has_changes, pending_review, updated_at)
WHERE has_changes = true;

CREATE INDEX IF NOT EXISTS idx_proposals_original_data 
ON proposals USING gin (original_data jsonb_path_ops)
WHERE original_data IS NOT NULL;