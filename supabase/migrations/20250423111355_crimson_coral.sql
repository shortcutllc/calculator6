/*
  # Add proposal status and review fields

  1. Changes
    - Add status enum type for proposals
    - Add pending_review column for tracking client review status
    - Add has_changes column for tracking client modifications
    - Update existing status values to use the new enum type
    - Add RLS policies for status updates
*/

-- Create enum for proposal status
DO $$ BEGIN
  CREATE TYPE proposal_status AS ENUM ('draft', 'pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- First remove the default constraint
ALTER TABLE proposals 
  ALTER COLUMN status DROP DEFAULT;

-- Convert existing text values to the enum
UPDATE proposals 
SET status = CASE 
  WHEN status = 'draft' THEN 'draft'::proposal_status
  WHEN status = 'pending' THEN 'pending'::proposal_status
  WHEN status = 'approved' THEN 'approved'::proposal_status
  WHEN status = 'rejected' THEN 'rejected'::proposal_status
  ELSE 'draft'::proposal_status
END;

-- Now alter the column type and set the new default
ALTER TABLE proposals
  ALTER COLUMN status TYPE proposal_status USING status::proposal_status,
  ALTER COLUMN status SET DEFAULT 'draft'::proposal_status;

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_pending_review ON proposals(pending_review) WHERE pending_review = true;
CREATE INDEX IF NOT EXISTS idx_proposals_has_changes ON proposals(has_changes) WHERE has_changes = true;

-- Add RLS policies for status updates
CREATE POLICY "Clients can update proposal status"
  ON proposals
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    (status = 'pending' AND pending_review = true)
  )
  WITH CHECK (
    auth.uid() = user_id OR 
    (status IN ('approved', 'rejected'))
  );