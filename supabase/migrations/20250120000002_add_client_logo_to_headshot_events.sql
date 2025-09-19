-- Add client logo field to headshot events
ALTER TABLE headshot_events 
ADD COLUMN client_logo_url TEXT;

-- Add comment for clarity
COMMENT ON COLUMN headshot_events.client_logo_url IS 'URL of the client logo to display on gallery pages and emails';
