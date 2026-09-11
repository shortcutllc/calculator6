-- Drip sequences: rep-owned nurture drips sent from the rep's own Gmail,
-- outside Smartlead. One row per (campaign, lead).
--
-- State lives here rather than on saved_drafts.target_ref (how the founder lane
-- does it) because a drip has no hand-sent E1 to hang off: the runner owns every
-- touch including the first, and needs to query "who is due" cheaply across
-- hundreds of leads.

create table if not exists drip_campaigns (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  name             text not null,
  rep_email        text not null,                 -- the sending mailbox (gmail_accounts.email)
  status           text not null default 'draft', -- draft | active | paused | completed
  -- Per-mailbox pacing. Deliberately low defaults: this is a real person's
  -- mailbox on the primary domain, not a sacrificial cold domain.
  daily_cap        int  not null default 25,      -- total sends/day from this campaign
  ramp_start       int  not null default 10,      -- day-one cap, stepped up to daily_cap
  ramp_step        int  not null default 5,       -- added per sending day
  send_days        int[] not null default '{1,2,3,4,5}',  -- ISO dow, 1=Mon
  send_start_hour  int  not null default 9,       -- rep-local
  send_end_hour    int  not null default 16,
  timezone         text not null default 'America/New_York',
  -- Compliance. Both are required on every send; the runner refuses without them.
  unsubscribe_url  text,
  postal_address   text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists drip_leads (
  id             uuid primary key default gen_random_uuid(),
  campaign_id    uuid not null references drip_campaigns(id) on delete cascade,
  email          text not null,
  first_name     text,
  last_name      text,
  company_name   text,
  custom_fields  jsonb not null default '{}'::jsonb,
  -- Sequence state
  status         text not null default 'active',  -- active | paused | replied | bounced
                                                  -- | unsubscribed | completed | dormant | suppressed
  touches        jsonb not null default '[]'::jsonb, -- [{n, sent_at, subject, body, message_id}]
  thread_id      text,          -- Gmail thread, set on touch 1; follow-ups reply in-thread
  root_message_id text,         -- RFC Message-ID of touch 1, for In-Reply-To/References
  paused_until   timestamptz,
  pause_count    int not null default 0,
  paused_since_ms bigint,
  last_touch_at  timestamptz,
  halted_reason  text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (campaign_id, email)
);

-- "Who is due" is the hot path, run every cron tick.
create index if not exists drip_leads_due_idx
  on drip_leads (campaign_id, status, last_touch_at);
create index if not exists drip_leads_email_idx on drip_leads (lower(email));

-- One row per unsubscribe click. Kept separate from crm_suppression so we can
-- prove WHEN and HOW someone opted out; the runner writes crm_suppression too.
create table if not exists drip_unsubscribes (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  campaign_id   uuid references drip_campaigns(id) on delete set null,
  token         text,
  method        text not null default 'link',  -- link | one-click | reply
  user_agent    text,
  ip            text,
  created_at    timestamptz not null default now()
);
create index if not exists drip_unsub_email_idx on drip_unsubscribes (lower(email));

alter table drip_campaigns enable row level security;
alter table drip_leads enable row level security;
alter table drip_unsubscribes enable row level security;

-- Service role only: every writer is a serverless function. No anon access, and
-- in particular the unsubscribe endpoint writes with the service key rather than
-- exposing these tables to the browser.
create policy drip_campaigns_service on drip_campaigns for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy drip_leads_service on drip_leads for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy drip_unsub_service on drip_unsubscribes for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
