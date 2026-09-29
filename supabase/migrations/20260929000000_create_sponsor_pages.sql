-- Conference partner pages at /sponsor/:slug, one row per conference
-- organizer. Staff create and edit them from /sponsor-pages. Before this
-- migration they lived in code (src/components/sponsor/sponsorPages.ts).
--
-- Access:
--   * Any signed-in staff member can list, create, edit and delete rows.
--   * The public never reads the table. The page loads through
--     get_sponsor_page(slug, password), which returns the page only when it
--     is published and the password (if any) matches. This way a password
--     is never sent to the browser.
--
-- Passwords: staff write the plain text to `new_password`. A trigger hashes
-- it into `password_hash` with bcrypt and clears `new_password`. An empty
-- string removes the password.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS sponsor_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  organizer_mark text NOT NULL,
  organizer_name text NOT NULL,
  conference_name text NOT NULL,
  date_label text NOT NULL DEFAULT '',
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  -- Station ids from src/utils/sponsorPackages.ts, in order. NULL shows all.
  services text[],
  password_hash text,
  new_password text,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION sponsor_pages_before_write()
RETURNS trigger
LANGUAGE plpgsql
-- Runs as the owner so staff don't need rights on the pgcrypto schema.
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.new_password IS NOT NULL THEN
    IF NEW.new_password = '' THEN
      NEW.password_hash := NULL;
    ELSE
      NEW.password_hash := crypt(NEW.new_password, gen_salt('bf'));
    END IF;
    NEW.new_password := NULL;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sponsor_pages_before_write ON sponsor_pages;
CREATE TRIGGER sponsor_pages_before_write
  BEFORE INSERT OR UPDATE ON sponsor_pages
  FOR EACH ROW EXECUTE FUNCTION sponsor_pages_before_write();

ALTER TABLE sponsor_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read sponsor pages" ON sponsor_pages;
CREATE POLICY "Staff can read sponsor pages" ON sponsor_pages
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff can create sponsor pages" ON sponsor_pages;
CREATE POLICY "Staff can create sponsor pages" ON sponsor_pages
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Staff can update sponsor pages" ON sponsor_pages;
CREATE POLICY "Staff can update sponsor pages" ON sponsor_pages
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Staff can delete sponsor pages" ON sponsor_pages;
CREATE POLICY "Staff can delete sponsor pages" ON sponsor_pages
  FOR DELETE TO authenticated USING (true);

-- The public read path. Returns NULL when there is no published page.
-- Returns {"locked": true, "organizer_mark": ...} when a password is set and
-- the one given is missing or wrong, which is enough to draw the gate.
-- Otherwise it returns the page, without the hash.
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
    RETURN jsonb_build_object('locked', true, 'organizer_mark', r.organizer_mark);
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
    'has_password', r.password_hash IS NOT NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION get_sponsor_page(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_sponsor_page(text, text) TO anon, authenticated;

-- The two pages that used to live in code.
INSERT INTO sponsor_pages
  (slug, organizer_mark, organizer_name, conference_name, date_label, contact_name, contact_email, new_password)
VALUES
  ('acme', 'ACME', 'Acme Events', 'Acme Conference', 'Nov 9 to 10, 2026', 'Will Newton', 'will@getshortcut.co', NULL),
  ('template', '[HOST]', '[Organizer]', '[Conference name]', '[Dates]', '[Contact name]', '[contact email]', 'SHORTCUTxSPONSOR')
ON CONFLICT (slug) DO NOTHING;
