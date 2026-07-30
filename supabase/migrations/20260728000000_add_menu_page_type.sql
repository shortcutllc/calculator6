-- Allow 'menu' as a page_type on generic_landing_pages.
-- The Service Menu page ("Our Menu") reuses the generic landing page rail
-- (per-client logo, unique_token sharing, JSONB customization). Menu-specific
-- customization lives inside the customization JSONB:
--   bookingRep (string)      — whose calendar the Book a call modal embeds
--   hiddenServices (text[])  — service ids to omit for this client
ALTER TABLE generic_landing_pages
  DROP CONSTRAINT IF EXISTS generic_landing_pages_page_type_check;

ALTER TABLE generic_landing_pages
  ADD CONSTRAINT generic_landing_pages_page_type_check
  CHECK (page_type IN ('generic', 'workhuman', 'conference', 'menu'));
