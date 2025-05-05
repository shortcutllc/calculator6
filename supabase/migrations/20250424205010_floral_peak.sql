/*
  # Add client portal functionality

  1. Changes
    - Add client users table
    - Add client access permissions
    - Update proposal sharing system
*/

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  company text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create client_proposals table
CREATE TABLE IF NOT EXISTS client_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  proposal_id uuid REFERENCES proposals(id) ON DELETE CASCADE,
  permissions jsonb DEFAULT '{"can_view": true, "can_comment": false}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(client_id, proposal_id)
);

-- Add RLS policies
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_proposals ENABLE ROW LEVEL SECURITY;

-- Client access policies
CREATE POLICY "Clients can view own data"
  ON clients
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Clients can view assigned proposals"
  ON proposals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_proposals cp
      JOIN clients c ON cp.client_id = c.id
      WHERE cp.proposal_id = proposals.id
      AND c.user_id = auth.uid()
    )
  );