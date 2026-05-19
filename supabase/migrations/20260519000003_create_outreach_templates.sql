-- Template-grounding corpus: the actual email bodies Shortcut has sent,
-- joined to their measured reply rate (from outreach_sends already in
-- Supabase). draft-outreach.js reads the top performers so Claude grounds
-- new drafts in "what historically earned replies", not just brand voice.
--
-- Performance is attributed at the CAMPAIGN level (per-step lead attribution
-- isn't reliably available from Smartlead's recurring stats path), so every
-- sequence step of a campaign carries that campaign's reply_rate.

create table if not exists public.outreach_templates (
  campaign_id    text not null,
  seq_number     int  not null,
  campaign_name  text,
  subject        text,
  body           text,            -- HTML stripped to readable text; spintax/merge tags kept
  variant_count  int,             -- A/B variants on this step (Smartlead sequence_variants)
  sent           int,             -- campaign-level send count (from outreach_sends)
  replied        int,             -- campaign-level reply count
  reply_rate     numeric,         -- replied / NULLIF(sent,0)
  ingested_at    timestamptz not null default now(),
  primary key (campaign_id, seq_number)
);

create index if not exists outreach_templates_reply_rate_idx
  on public.outreach_templates (reply_rate desc);

alter table public.outreach_templates enable row level security;
create policy "outreach_templates auth read" on public.outreach_templates
  for select to authenticated using (true);
