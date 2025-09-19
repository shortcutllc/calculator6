-- Add manager tokens to existing events that don't have them
-- This ensures all existing events get manager dashboard access

UPDATE headshot_events 
SET manager_token = 'mg_' || substr(md5(random()::text), 1, 20)
WHERE manager_token IS NULL;
