-- Add is_returning_client field to generic_landing_pages table
-- This allows admins to mark landing pages as for returning vs new clients
-- and show personalized messaging accordingly

ALTER TABLE generic_landing_pages
ADD COLUMN IF NOT EXISTS is_returning_client BOOLEAN DEFAULT false;

-- Add index for faster queries (optional but good practice)
CREATE INDEX IF NOT EXISTS idx_generic_landing_pages_returning
ON generic_landing_pages(is_returning_client);

-- Add comment for documentation
COMMENT ON COLUMN generic_landing_pages.is_returning_client IS
'Whether this landing page is for a returning client (true) or new client (false). Affects personalization and messaging.';
