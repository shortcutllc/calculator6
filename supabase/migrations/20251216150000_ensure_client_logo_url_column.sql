-- Ensure client_logo_url column exists on proposals table
-- This migration ensures the column exists even if previous migrations haven't been applied

ALTER TABLE proposals 
ADD COLUMN IF NOT EXISTS client_logo_url text;

COMMENT ON COLUMN proposals.client_logo_url IS 'URL of the client logo to display on proposal pages';

-- Add index for client_logo_url for performance (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_proposals_client_logo_url 
ON proposals(client_logo_url)
WHERE client_logo_url IS NOT NULL;
