-- Phase 4B: per-rep Gmail OAuth tokens for send-as-rep + reply tracking.
--
-- Holds refresh tokens, so this table is service-role ONLY. There is no
-- "authenticated read" policy on purpose: the browser must never see a
-- refresh token. Every Gmail Netlify function uses the service-role key
-- and bypasses RLS; the frontend only ever asks "am I connected?" via a
-- dedicated function that returns a boolean, never the row.

create table if not exists public.gmail_accounts (
  email             text primary key,           -- the rep's gmail address (lowercased)
  supabase_user_id  uuid,                        -- auth.users id that connected it
  refresh_token     text not null,               -- long-lived; used to mint access tokens
  access_token      text,                        -- transient cache
  token_expiry      timestamptz,                 -- access_token expiry
  history_id        text,                        -- Gmail watch incremental cursor
  watch_expiration  timestamptz,                 -- users.watch() mailbox expiry (~7d, must re-arm)
  connected_at      timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.gmail_accounts enable row level security;
-- No SELECT/INSERT/UPDATE policy for `authenticated` — service role only.
