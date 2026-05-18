-- crm_events: full historical + upcoming Shortcut events, backfilled read-only
-- from Parse Coordinator (Event class). Revenue ground truth for the
-- sales-companion / education-corpus project.
--
-- Written ONLY by the backfill script via the Supabase service role (which
-- bypasses RLS). Authenticated staff get read access. The /education page's
-- Will/Jaimie/Caren allowlist is enforced in the app layer.

create extension if not exists pg_trgm;

create table if not exists public.crm_events (
  id                     uuid primary key default gen_random_uuid(),
  parse_object_id        text not null unique,

  -- Identity
  client_name            text,   -- sponsorName -> name -> legacyName
  event_name             text,   -- name -> legacyName
  description            text,

  -- Buyer contact (first contact promoted; full array kept in contacts_raw)
  contact_name           text,
  contact_email          text,
  contact_phone          text,
  contacts_raw           jsonb,

  -- Geography (structured from Parse address)
  address_street         text,
  address_city           text,
  address_state          text,
  address_zip            text,
  address_coords         jsonb,

  -- Service mix
  category               text,
  service_offerings      jsonb,  -- [{ id, serviceTitle }]
  service_categories     jsonb,  -- [string]

  -- Timing
  start_time             timestamptz,
  end_time               timestamptz,
  parse_created_at       timestamptz,
  parse_updated_at       timestamptz,

  -- Outcome / value
  status                 text,
  paid                   boolean,
  cancelled              boolean,
  is_test_event          boolean,
  barber_hourly_rate     numeric,
  payment                numeric,
  mobile_revenue         numeric,
  total_barber_payments  numeric,

  -- Identifiers
  mobile_event_code      text,
  event_link_url         text,

  -- UNRELIABLE: team rarely populates these. Hint only, never a source of
  -- truth for channel/rep attribution. See memory/parse_data_reliability.md.
  is_outbound            boolean,
  lead_salesperson       text,

  -- Derived
  normalized_client      text,   -- lowercased client_name, Inc/LLC/Corp/punct stripped

  raw                    jsonb,  -- full Parse object snapshot (future-proof)
  ingested_at            timestamptz not null default now()
);

create index if not exists crm_events_normalized_client_idx
  on public.crm_events (normalized_client);
create index if not exists crm_events_normalized_client_trgm_idx
  on public.crm_events using gin (normalized_client gin_trgm_ops);
create index if not exists crm_events_start_time_idx
  on public.crm_events (start_time);
create index if not exists crm_events_parse_created_at_idx
  on public.crm_events (parse_created_at);

alter table public.crm_events enable row level security;

create policy "crm_events authenticated read"
  on public.crm_events for select
  to authenticated
  using (true);
