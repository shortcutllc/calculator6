-- Personal API keys, so a teammate's own AI (Claude, ChatGPT, Cursor, a
-- script) can create proposals, landing pages, sponsor pages and QR signs as
-- that teammate, through the MCP endpoint (netlify/functions/mcp.js) or the
-- HTTP API (netlify/functions/generate-proposal.js). See
-- docs/AI_INTEGRATION.md.
--
-- Why not the staff sign-in token: it expires after an hour, so an AI
-- platform can't hold one. A key lasts until it is revoked.
--
-- Only a SHA-256 of each key is stored. The key itself is shown once, when
-- scripts/api-keys.mjs issues it. Keys are issued by hand, which is also the
-- staff check: email signup is open, so being signed in proves nothing.
--
-- Access: RLS on with no policies, so only the service role (the functions
-- and the script) can read or write the table.

CREATE TABLE IF NOT EXISTS staff_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Whose AI this is for, as it reads in a list: 'Marc, Claude desktop'.
  label text NOT NULL,
  -- The first characters of the key, to recognise it in a list.
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS staff_api_keys_user_id_idx ON staff_api_keys (user_id);

ALTER TABLE staff_api_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON staff_api_keys FROM anon, authenticated;
