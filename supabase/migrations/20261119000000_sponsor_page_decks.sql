-- Sponsor decks: the page a conference organizer sends to its SPONSORS to
-- sell the lounge (src/components/sponsor/SponsorDeck.tsx), the next step
-- after the partner page at /sponsor/:slug that sold the lounge to them.
--
-- Each sponsor page row can carry one deck:
--   deck        The conference's own facts and the organizer's offer: venue,
--               about, audience, figures and their source, prices and
--               availability per sponsorship, and the organizer's sales
--               contact. Shape: SponsorDeckDetails in src/types/sponsorPage.ts.
--               NULL is fine: the deck then leaves those parts out.
--   deck_token  The deck's own link, /lounge/<token>. NULL until staff create
--               the link. Random, so the deck never leads a sponsor back to
--               the partner page (which shows the organizer's margin).
--
-- Access: staff read and write both columns through the existing table
-- policies. The public reads a deck only through get_sponsor_deck(token),
-- which returns what a sponsor may see: never the slug, the Shortcut
-- teammate the partner page is sent from, or the password.
--
-- Additive only: two nullable columns, an index, one function, and GCUC
-- Miami's deck moved here from code (it lived in sponsorDecks.ts).

ALTER TABLE sponsor_pages
  ADD COLUMN IF NOT EXISTS deck jsonb,
  ADD COLUMN IF NOT EXISTS deck_token text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sponsor_pages_deck_token_format') THEN
    ALTER TABLE sponsor_pages
      ADD CONSTRAINT sponsor_pages_deck_token_format CHECK (deck_token IS NULL OR deck_token ~ '^[a-z0-9]{10,32}$');
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS sponsor_pages_deck_token_key
  ON sponsor_pages (deck_token) WHERE deck_token IS NOT NULL;

-- The public read path for a deck. NULL when no deck has that link.
CREATE OR REPLACE FUNCTION get_sponsor_deck(p_token text)
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
  SELECT * INTO r FROM sponsor_pages WHERE deck_token = lower(p_token);
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
    'deck', COALESCE(r.deck, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION get_sponsor_deck(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_sponsor_deck(text) TO anon, authenticated;

-- GCUC Miami, from Marc's outline (2026-11-17, sources gcuc.co). No link
-- yet: staff create it from the Sponsor Pages tab when GCUC is ready.
UPDATE sponsor_pages
SET deck = $json${
  "venue": "Miami Ironside, Little River",
  "about": "GCUC Miami fills two full days with strategic and tactical tracks, roundtables and an exhibitor hall.",
  "audience": [
    "Coworking owners and operators",
    "Developers and landlords",
    "Investors, from single buildings to REITs",
    "Corporate real estate and workplace strategists",
    "HR and people leaders",
    "Service and technology providers"
  ],
  "stats": [
    { "fig": "50", "label": "GCUC events and gatherings around the world" },
    { "fig": "20,000+", "label": "people through GCUC’s doors" },
    { "fig": "$58B", "label": "projected size of the coworking market by 2033" }
  ],
  "statsSource": "gcuc.co, including its coworking market projection"
}$json$::jsonb
WHERE slug = 'gcuc-miami' AND deck IS NULL;
