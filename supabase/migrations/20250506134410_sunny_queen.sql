/*
  # Fix slug generation for proposals

  1. Changes
    - Drop existing trigger if it exists
    - Recreate functions and trigger
    - Update existing proposals with slugs
*/

-- Drop existing trigger and functions
DROP TRIGGER IF EXISTS proposals_set_slug ON proposals;
DROP FUNCTION IF EXISTS set_proposal_slug();
DROP FUNCTION IF EXISTS generate_proposal_slug(text, uuid);

-- Add slug column if it doesn't exist
ALTER TABLE proposals 
ADD COLUMN IF NOT EXISTS slug text;

-- Create unique index for slugs
CREATE UNIQUE INDEX IF NOT EXISTS idx_proposals_slug 
ON proposals(slug) 
WHERE slug IS NOT NULL;

-- Create function to generate slugs
CREATE OR REPLACE FUNCTION generate_proposal_slug(client_name text, id uuid)
RETURNS text AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 1;
BEGIN
  -- Convert client name to URL-friendly format
  base_slug := lower(regexp_replace(client_name, '[^a-zA-Z0-9]+', '-', 'g'));
  -- Remove leading/trailing hyphens
  base_slug := trim(both '-' from base_slug);
  -- Add first 6 characters of UUID
  base_slug := base_slug || '-' || substring(id::text, 1, 6);
  
  -- Try the base slug first
  final_slug := base_slug;
  
  -- If slug exists, append numbers until we find a unique one
  WHILE EXISTS (SELECT 1 FROM proposals WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically generate slugs
CREATE OR REPLACE FUNCTION set_proposal_slug()
RETURNS trigger AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := generate_proposal_slug(NEW.client_name, NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER proposals_set_slug
  BEFORE INSERT OR UPDATE
  ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION set_proposal_slug();

-- Update existing proposals with slugs
UPDATE proposals 
SET slug = generate_proposal_slug(client_name, id)
WHERE slug IS NULL;