-- Add manager token field to headshot_events table
-- This allows creating manager dashboard links for client oversight

ALTER TABLE headshot_events
ADD COLUMN manager_token TEXT UNIQUE;

-- Create an index for faster lookups
CREATE INDEX idx_headshot_events_manager_token ON headshot_events(manager_token);

-- Generate manager tokens for existing events (if any)
UPDATE headshot_events 
SET manager_token = 'mg_' || substr(md5(random()::text), 1, 20)
WHERE manager_token IS NULL;
