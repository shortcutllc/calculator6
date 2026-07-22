-- Allow 'conference' as a page_type on generic_landing_pages.
-- The Retreats & Conferences one-pager reuses the generic landing page rail
-- (per-client logo, unique_token sharing, JSONB customization) with
-- conference-specific customization fields living inside the customization JSONB:
--   showPackages (bool), showPackagePricing (bool),
--   packageOverrides (Record<packageId, { price?, unit?, hidden? }>)
ALTER TABLE generic_landing_pages
  DROP CONSTRAINT IF EXISTS generic_landing_pages_page_type_check;

ALTER TABLE generic_landing_pages
  ADD CONSTRAINT generic_landing_pages_page_type_check
  CHECK (page_type IN ('generic', 'workhuman', 'conference'));
