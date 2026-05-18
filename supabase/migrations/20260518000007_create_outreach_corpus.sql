-- Track B: the cold-outreach corpus (openclaw Smartlead + positive responders
-- + Sheet CRM) joined to the CRM graph. Adds the response funnel + the
-- job-title dimension (title is the #1 lookalike signal per the openclaw ICP
-- analysis — Office Manager / HR-People-Ops convert, "Workplace Experience"
-- barely does). Service-role write; authenticated read.

create table if not exists public.outreach_campaigns (
  campaign_id   text primary key,           -- Smartlead campaign id
  name          text,
  status        text,
  leads         int,
  src_updated_at timestamptz,
  ingested_at   timestamptz not null default now()
);
alter table public.outreach_campaigns enable row level security;
create policy "outreach_campaigns auth read" on public.outreach_campaigns
  for select to authenticated using (true);

create table if not exists public.outreach_contacts (
  email                  text primary key,   -- lowercased; universal join key
  name                   text,
  title                  text,               -- the #1 lookalike feature
  company                text,
  email_domain           text,
  normalized_company     text,
  -- link to the CRM graph (domain primary, normalized-name fallback)
  crm_company_id         uuid references public.crm_companies(id) on delete set null,
  company_match_method   text,               -- domain | name | none
  company_match_confidence numeric,
  -- firmographics from the Sheet (per-lead, richest source)
  headcount              text,
  industry               text,
  location               text,
  linkedin_url           text,
  years_in_role          text,
  email_status           text,               -- Apollo/MillionVerifier validity
  stage                  text,               -- Sheet pipeline stage
  source                 text,               -- cache | positive_responders | sheet:<tab>
  first_seen             timestamptz,
  ingested_at            timestamptz not null default now()
);
create index if not exists outreach_contacts_domain_idx  on public.outreach_contacts (email_domain);
create index if not exists outreach_contacts_company_idx  on public.outreach_contacts (crm_company_id);
create index if not exists outreach_contacts_title_idx    on public.outreach_contacts (title);
create index if not exists outreach_contacts_normco_idx   on public.outreach_contacts (normalized_company);
alter table public.outreach_contacts enable row level security;
create policy "outreach_contacts auth read" on public.outreach_contacts
  for select to authenticated using (true);

create table if not exists public.outreach_sends (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  campaign_id  text,
  sent_time    timestamptz,
  reply_time   timestamptz,            -- null => no reply
  is_bounced   boolean,
  ingested_at  timestamptz not null default now(),
  unique (email, campaign_id)
);
create index if not exists outreach_sends_email_idx on public.outreach_sends (email);
alter table public.outreach_sends enable row level security;
create policy "outreach_sends auth read" on public.outreach_sends
  for select to authenticated using (true);

create table if not exists public.outreach_replies (
  id              uuid primary key default gen_random_uuid(),
  email           text not null,
  campaign_id     text,
  reply_date      timestamptz,
  reply_content   text,
  reply_sentiment text,               -- positive|negative|neutral|ooo ; 'unknown' stored as NULL
  is_ooo          boolean,
  manual_category text,
  sentiment_source text not null,     -- automated | manual  (kept separate, reconciled — never trust one)
  ingested_at     timestamptz not null default now(),
  unique (email, campaign_id, sentiment_source)
);
create index if not exists outreach_replies_email_idx     on public.outreach_replies (email);
create index if not exists outreach_replies_sentiment_idx  on public.outreach_replies (reply_sentiment);
alter table public.outreach_replies enable row level security;
create policy "outreach_replies auth read" on public.outreach_replies
  for select to authenticated using (true);
