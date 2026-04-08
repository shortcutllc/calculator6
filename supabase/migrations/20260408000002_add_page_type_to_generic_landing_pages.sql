-- Add page_type column to support different landing page variants (generic, workhuman)
ALTER TABLE generic_landing_pages
  ADD COLUMN page_type TEXT NOT NULL DEFAULT 'generic'
  CHECK (page_type IN ('generic', 'workhuman'));

CREATE INDEX idx_generic_landing_pages_page_type ON generic_landing_pages(page_type);
