-- Workhuman massage sign-ups (from Shortcut's booker system)
-- Captures attendees who booked appointments, cross-referenced to workhuman_leads
-- when possible (unmatched sign-ups get a fresh workhuman_leads row created by
-- the importer). Populated via CSV upload in the booth view.
-- 2026-04-22

-- Also add 'source' column to workhuman_leads to tag where each lead came from
-- (so we can distinguish Apollo-imported leads from booth walk-ins)
alter table public.workhuman_leads
  add column if not exists source text;

comment on column public.workhuman_leads.source is
  'Where this lead entered the CRM: apollo_enrichment, whl_booth_signup, manual, etc.';

create table if not exists public.workhuman_signups (
  id uuid primary key default gen_random_uuid(),
  external_id text,
  full_name text,
  first_name text,
  last_name text,
  email text,
  phone text,
  company text,
  appointment_at timestamptz,
  service_type text,
  day_label text,
  time_slot text,
  raw_notes text,
  raw_row jsonb,
  matched_lead_id uuid references public.workhuman_leads(id) on delete set null,
  match_method text,
  match_confidence numeric,
  team_notes text,
  team_status text default 'scheduled',
  uploaded_batch_id uuid,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists workhuman_signups_external_id_unique
  on public.workhuman_signups (external_id) where external_id is not null;
create index if not exists workhuman_signups_email_idx
  on public.workhuman_signups (lower(email));
create index if not exists workhuman_signups_appointment_at_idx
  on public.workhuman_signups (appointment_at);
create index if not exists workhuman_signups_matched_lead_idx
  on public.workhuman_signups (matched_lead_id);

create or replace function public.tg_workhuman_signups_touch()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'workhuman_signups_touch') then
    create trigger workhuman_signups_touch
      before update on public.workhuman_signups
      for each row execute function public.tg_workhuman_signups_touch();
  end if;
end $$;

alter table public.workhuman_signups enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'workhuman_signups' and policyname = 'Allow select for anon users') then
    create policy "Allow select for anon users" on public.workhuman_signups for select to anon using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'workhuman_signups' and policyname = 'Allow insert for anon users') then
    create policy "Allow insert for anon users" on public.workhuman_signups for insert to anon with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'workhuman_signups' and policyname = 'Allow update for anon users') then
    create policy "Allow update for anon users" on public.workhuman_signups for update to anon using (true) with check (true);
  end if;
end $$;

comment on table public.workhuman_signups is
  'Conference massage sign-ups imported from Shortcut booker CSV. Cross-referenced to workhuman_leads by email/name; unmatched sign-ups auto-create a new workhuman_leads row so every walk-in has a lead profile.';
