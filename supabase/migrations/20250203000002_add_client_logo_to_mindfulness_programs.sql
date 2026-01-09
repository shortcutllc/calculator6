-- Add client_logo_url field to mindfulness_programs table
-- Migration: 20250203000002_add_client_logo_to_mindfulness_programs.sql

ALTER TABLE mindfulness_programs 
ADD COLUMN IF NOT EXISTS client_logo_url TEXT;

COMMENT ON COLUMN mindfulness_programs.client_logo_url IS 'URL of the client logo to display on program pages and proposals';



