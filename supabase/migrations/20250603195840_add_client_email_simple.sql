-- Add client_email field to proposals table
ALTER TABLE proposals 
ADD COLUMN IF NOT EXISTS client_email text; 