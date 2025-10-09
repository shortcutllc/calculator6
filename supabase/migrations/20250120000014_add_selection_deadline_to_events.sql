-- Add selection deadline to headshot events
ALTER TABLE headshot_events 
ADD COLUMN selection_deadline TIMESTAMP WITH TIME ZONE;
