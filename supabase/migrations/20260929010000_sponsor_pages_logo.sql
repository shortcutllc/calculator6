-- Sponsor pages: an optional partner logo, shown in the page's nav bar,
-- hero and password gate in place of the organizer's name.
--
-- The organizer's short name is no longer asked for: staff enter the
-- conference name and the organizer name only, and organizer_mark is kept
-- equal to organizer_name by the app.

ALTER TABLE sponsor_pages ADD COLUMN IF NOT EXISTS logo_url text;

CREATE OR REPLACE FUNCTION get_sponsor_page(p_slug text, p_password text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  r sponsor_pages%ROWTYPE;
BEGIN
  SELECT * INTO r FROM sponsor_pages WHERE slug = lower(p_slug) AND status = 'published';
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF r.password_hash IS NOT NULL
     AND (p_password IS NULL OR crypt(p_password, r.password_hash) <> r.password_hash) THEN
    RETURN jsonb_build_object('locked', true, 'organizer_mark', r.organizer_mark, 'logo_url', r.logo_url);
  END IF;

  RETURN jsonb_build_object(
    'locked', false,
    'slug', r.slug,
    'organizer_mark', r.organizer_mark,
    'organizer_name', r.organizer_name,
    'conference_name', r.conference_name,
    'date_label', r.date_label,
    'contact_name', r.contact_name,
    'contact_email', r.contact_email,
    'services', to_jsonb(r.services),
    'logo_url', r.logo_url,
    'has_password', r.password_hash IS NOT NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION get_sponsor_page(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_sponsor_page(text, text) TO anon, authenticated;
