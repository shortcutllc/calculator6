-- SmartLead webhook event log for idempotency and audit trail
create table if not exists smartlead_webhook_events (
  id uuid primary key default gen_random_uuid(),
  request_id text unique,
  event_type text not null,
  lead_email text not null,
  campaign_id integer,
  stage_assigned text,
  created_at timestamptz default now()
);

-- Index for fast idempotency lookups
create index if not exists idx_smartlead_webhook_request_id
  on smartlead_webhook_events (request_id);

-- Index for querying by lead
create index if not exists idx_smartlead_webhook_lead_email
  on smartlead_webhook_events (lead_email);
