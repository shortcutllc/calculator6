-- Native click tracking for Workhuman landing pages.
-- Records view_count + last_viewed_at on both generic_landing_pages and the
-- matching workhuman_leads row (if any) via a SECURITY DEFINER RPC that
-- can be called from anon clients.

ALTER TABLE generic_landing_pages
  ADD COLUMN IF NOT EXISTS view_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_viewed_at timestamptz;

ALTER TABLE workhuman_leads
  ADD COLUMN IF NOT EXISTS page_view_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS page_last_viewed_at timestamptz;

CREATE OR REPLACE FUNCTION track_landing_page_view(page_unique_token text)
RETURNS void AS $$
DECLARE
  page_id_var uuid;
  new_count int;
  new_time timestamptz := NOW();
BEGIN
  UPDATE generic_landing_pages
  SET view_count = COALESCE(view_count, 0) + 1,
      last_viewed_at = new_time
  WHERE unique_token = page_unique_token
    AND status = 'published'
  RETURNING id, view_count INTO page_id_var, new_count;

  IF page_id_var IS NOT NULL THEN
    UPDATE workhuman_leads
    SET page_view_count = new_count,
        page_last_viewed_at = new_time
    WHERE landing_page_id = page_id_var;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION track_landing_page_view(text) TO anon, authenticated;
