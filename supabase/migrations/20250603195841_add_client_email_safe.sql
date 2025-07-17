-- Add client_email field to proposals table safely
ALTER TABLE proposals 
ADD COLUMN IF NOT EXISTS client_email text; 