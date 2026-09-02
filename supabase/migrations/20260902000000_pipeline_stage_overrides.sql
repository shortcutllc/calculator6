-- Pipeline stage overrides: a rep's manual placement of a lead on their
-- /sales-intelligence Pipeline board. The board derives a SUGGESTED stage
-- from signals (replies, proposals, Workhuman notes, client graph); a row
-- here wins over the suggestion. Keyed per rep so one person's move never
-- changes another rep's board. Service-role only; written via the
-- `pipeline` Netlify function after the caller's JWT is verified.
create table if not exists public.pipeline_stage_overrides (
  rep_name    text not null,            -- assignee name, e.g. 'Marc Levitan'
  lead_key    text not null,            -- contact email, or 'co~<normalized company>' for company-only rows
  stage       text not null check (stage in (
                'discovery','active','proposal_sent','negotiation','closing','won',
                'future','account','cold','no_for_now','hidden')),
  suggested   text,                     -- what the system suggested at the time of the move
  company     text,
  contact     text,
  email       text,
  set_by      text,                     -- email of the user who moved it
  set_at      timestamptz not null default now(),
  primary key (rep_name, lead_key)
);
comment on table public.pipeline_stage_overrides is
  'Manual pipeline-stage placements per rep; overrides the signal-derived suggestion on the Pipeline board.';
create index if not exists pipeline_stage_overrides_rep_idx on public.pipeline_stage_overrides (rep_name);
alter table public.pipeline_stage_overrides enable row level security;
-- No policies on purpose: only the service role (Netlify functions) reads/writes.
