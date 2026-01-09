/*
  # Add proposal view tracking
  
  1. New Table
    - `proposal_views`
      - Tracks when clients view standalone proposals
      - Links to proposals table
      - Stores timestamp and client metadata
*/

-- Create proposal_views table
CREATE TABLE IF NOT EXISTS proposal_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES proposals(id) ON DELETE CASCADE NOT NULL,
  viewed_at timestamptz DEFAULT now() NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_proposal_views_proposal_id ON proposal_views(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_views_viewed_at ON proposal_views(viewed_at DESC);

-- Enable RLS
ALTER TABLE proposal_views ENABLE ROW LEVEL SECURITY;

-- Allow public to insert views (clients viewing proposals)
CREATE POLICY "Allow public to insert proposal views"
ON proposal_views
FOR INSERT
TO public
WITH CHECK (true);

-- Only authenticated users (staff) can read views
CREATE POLICY "Allow authenticated users to read proposal views"
ON proposal_views
FOR SELECT
TO authenticated
USING (true);

-- Grant necessary permissions
GRANT INSERT ON proposal_views TO public;
GRANT SELECT ON proposal_views TO authenticated;

-- Add comment explaining the table's purpose
COMMENT ON TABLE proposal_views IS 'Tracks when clients view standalone proposals for analytics and notification purposes';
