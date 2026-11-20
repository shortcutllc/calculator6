-- Organizer preview links for sponsor decks (Will, 2026-11-20).
--
-- A sponsor deck has two audiences. Sponsors open /lounge/<deck_token>,
-- which never shows sample prices or notes. Before that link goes out, the
-- ORGANIZER reviews the deck. Staff preview it at /sponsor/<slug>/deck, but
-- that needs a staff sign-in. This gives each deck a second link the
-- organizer can open without signing in:
--
--   deck_preview_token  /lounge/preview/<token>. NULL until staff make it.
--                       Random, separate from deck_token, so holding the
--                       sponsor link never reveals the preview (and its
--                       sample prices) and the preview link can be shared
--                       with the organizer only.
--
-- The preview shows the same deck with the staff preview's labeled sample
-- prices, the note that the conference figures are editable examples, and a
-- banner telling the organizer which link to send sponsors.
--
-- Access: staff read and write the column through the existing table
-- policies. The public reads a preview only through
-- get_sponsor_deck_preview(token), which returns what the deck shows plus
-- the sponsor link's token (the banner shows it): never the slug, the
-- Shortcut teammate the partner page is sent from, or the password.
--
-- Additive only: one nullable column, a check, an index and one function.
-- No data changes.

ALTER TABLE sponsor_pages
  ADD COLUMN IF NOT EXISTS deck_preview_token text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sponsor_pages_deck_preview_token_format') THEN
    ALTER TABLE sponsor_pages
      ADD CONSTRAINT sponsor_pages_deck_preview_token_format CHECK (deck_preview_token IS NULL OR deck_preview_token ~ '^[a-z0-9]{10,32}$');
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS sponsor_pages_deck_preview_token_key
  ON sponsor_pages (deck_preview_token) WHERE deck_preview_token IS NOT NULL;

-- The organizer's read path for a deck preview. NULL when no deck has that
-- preview link.
CREATE OR REPLACE FUNCTION get_sponsor_deck_preview(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r sponsor_pages%ROWTYPE;
BEGIN
  IF p_token IS NULL OR p_token = '' THEN
    RETURN NULL;
  END IF;
  SELECT * INTO r FROM sponsor_pages WHERE deck_preview_token = lower(p_token);
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'organizer_mark', r.organizer_mark,
    'organizer_name', r.organizer_name,
    'logo_url', r.logo_url,
    'conference_name', r.conference_name,
    'date_label', r.date_label,
    'services', to_jsonb(r.services),
    'deck', COALESCE(r.deck, '{}'::jsonb),
    'deck_token', r.deck_token
  );
END;
$$;

REVOKE ALL ON FUNCTION get_sponsor_deck_preview(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_sponsor_deck_preview(text) TO anon, authenticated;
