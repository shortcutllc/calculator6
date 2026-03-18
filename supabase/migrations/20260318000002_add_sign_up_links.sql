-- Sign-Up Links table
-- Tracks coordinator event sign-up links tied to proposals

CREATE TABLE IF NOT EXISTS sign_up_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users,
  proposal_id uuid REFERENCES proposals(id) ON DELETE SET NULL,
  proposal_client_name text NOT NULL,
  event_date text,
  event_location text,
  event_name text,
  service_types jsonb DEFAULT '[]'::jsonb,
  coordinator_event_id text,
  signup_url text,
  status text DEFAULT 'pending',
  event_payload jsonb
);

-- Enable RLS
ALTER TABLE sign_up_links ENABLE ROW LEVEL SECURITY;

-- Read access for all authenticated users
CREATE POLICY "Enable read for authenticated users" ON sign_up_links
FOR SELECT TO authenticated USING (true);

-- Insert for authenticated users
CREATE POLICY "Enable insert for authenticated users" ON sign_up_links
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Update for owners
CREATE POLICY "Enable update for owners" ON sign_up_links
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Delete for owners
CREATE POLICY "Enable delete for owners" ON sign_up_links
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Index for proposal lookups
CREATE INDEX IF NOT EXISTS idx_sign_up_links_proposal_id ON sign_up_links(proposal_id);
CREATE INDEX IF NOT EXISTS idx_sign_up_links_status ON sign_up_links(status);
