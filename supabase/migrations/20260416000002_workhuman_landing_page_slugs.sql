/*
  # Short slugs for Workhuman landing pages

  Adds slug column to generic_landing_pages scoped to workhuman pages.
  Slug format: slugified partner name, e.g. "nbcuniversal"
  Routes: /r/:slug resolves to /workhuman/recharge/{unique_token}
*/

-- Add slug column (nullable — only populated for page_type='workhuman')
ALTER TABLE generic_landing_pages
  ADD COLUMN IF NOT EXISTS slug text;

-- Unique constraint scoped to workhuman pages (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_workhuman_slug_unique
  ON generic_landing_pages(slug)
  WHERE page_type = 'workhuman' AND slug IS NOT NULL;

-- Helper: generate a unique slug from partner name
CREATE OR REPLACE FUNCTION generate_workhuman_slug(partner_name text, page_id uuid)
RETURNS text AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 1;
BEGIN
  IF partner_name IS NULL OR partner_name = '' THEN
    RETURN NULL;
  END IF;

  -- Slugify: lowercase, alphanumeric + dashes only
  base_slug := lower(regexp_replace(partner_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);

  IF base_slug = '' THEN
    RETURN NULL;
  END IF;

  -- Dedup within workhuman pages
  final_slug := base_slug;
  WHILE EXISTS (
    SELECT 1 FROM generic_landing_pages
    WHERE slug = final_slug
      AND page_type = 'workhuman'
      AND generic_landing_pages.id != page_id
  ) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Trigger: auto-populate slug on INSERT for workhuman pages
CREATE OR REPLACE FUNCTION set_workhuman_slug()
RETURNS trigger AS $$
DECLARE
  partner_name_value text;
BEGIN
  IF NEW.page_type = 'workhuman' AND NEW.slug IS NULL THEN
    partner_name_value := NEW.data->>'partnerName';
    NEW.slug := generate_workhuman_slug(partner_name_value, NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workhuman_landing_pages_set_slug ON generic_landing_pages;
CREATE TRIGGER workhuman_landing_pages_set_slug
  BEFORE INSERT
  ON generic_landing_pages
  FOR EACH ROW
  EXECUTE FUNCTION set_workhuman_slug();

-- Backfill existing workhuman pages
UPDATE generic_landing_pages
SET slug = generate_workhuman_slug(data->>'partnerName', id)
WHERE page_type = 'workhuman' AND slug IS NULL;
