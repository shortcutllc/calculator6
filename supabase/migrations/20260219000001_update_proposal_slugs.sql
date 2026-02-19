/*
  # Update proposal slugs to client-name + creation-month format

  Changes slug format from `acme-corp-0ed57e` to `acme-corp-feb-2026`.

  1. Adds month_abbrev() helper
  2. Replaces generate_proposal_slug() — uses client_name + NOW() only (no data dependency)
  3. Trigger fires on INSERT only — slugs are permanent, never change on UPDATE
  4. Backfills all existing proposals with new slugs
*/

-- Month abbreviation helper
CREATE OR REPLACE FUNCTION month_abbrev(m integer)
RETURNS text AS $$
BEGIN
  RETURN CASE m
    WHEN 1 THEN 'jan' WHEN 2 THEN 'feb' WHEN 3 THEN 'mar'
    WHEN 4 THEN 'apr' WHEN 5 THEN 'may' WHEN 6 THEN 'jun'
    WHEN 7 THEN 'jul' WHEN 8 THEN 'aug' WHEN 9 THEN 'sep'
    WHEN 10 THEN 'oct' WHEN 11 THEN 'nov' WHEN 12 THEN 'dec'
    ELSE 'unk'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Drop old 2-param version to avoid ambiguity with new 3-param signature
DROP FUNCTION IF EXISTS generate_proposal_slug(text, uuid);

-- Replace slug generation: client-name-mon-yyyy
CREATE OR REPLACE FUNCTION generate_proposal_slug(client_name text, id uuid, proposal_data jsonb DEFAULT NULL)
RETURNS text AS $$
DECLARE
  base_slug text;
  date_part text;
  final_slug text;
  counter integer := 1;
BEGIN
  -- Slugify client name
  base_slug := lower(regexp_replace(client_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);

  -- Use creation month (NOW)
  date_part := month_abbrev(EXTRACT(MONTH FROM NOW())::integer) || '-' || EXTRACT(YEAR FROM NOW())::integer;

  -- Combine
  base_slug := base_slug || '-' || date_part;

  -- Dedup
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM proposals WHERE slug = final_slug AND proposals.id != generate_proposal_slug.id) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Trigger: INSERT only — slug is permanent, never changes on UPDATE
CREATE OR REPLACE FUNCTION set_proposal_slug()
RETURNS trigger AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := generate_proposal_slug(NEW.client_name, NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS proposals_set_slug ON proposals;
CREATE TRIGGER proposals_set_slug
  BEFORE INSERT
  ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION set_proposal_slug();

-- Backfill existing proposals with new slug format
UPDATE proposals
SET slug = generate_proposal_slug(client_name, id);
