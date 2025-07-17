-- Add client_email field to proposals table
ALTER TABLE proposals 
ADD COLUMN IF NOT EXISTS client_email text;

-- Add index for client_email for performance
CREATE INDEX IF NOT EXISTS idx_proposals_client_email 
ON proposals(client_email)
WHERE client_email IS NOT NULL; 