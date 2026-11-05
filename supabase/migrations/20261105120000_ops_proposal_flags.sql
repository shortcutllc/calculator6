-- Ops staffing dashboard (/ops, Nov 2026): what ops needs to know about a proposal
-- that the proposal itself doesn't carry.
--
--   likely_to_close     - sales flags a pending proposal so Pedro starts finding Pros
--                         before it is signed (Will: a manual flag, not a guess)
--   likely_alerted_at   - when Pedro was told about that flag
--   approved_alerted_at - when Pedro was told it was approved (ops-approval-watch);
--                         stamped once, so each approval alerts exactly once
--   staffing_note       - Pedro's own note on the staffing of it
--
-- Its own table, not columns on proposals: the proposals table is publicly writable
-- and every write to it can fire proposals_track_changes. This one has RLS on and
-- NO policies, so only the service role - the ops-api and ops-approval-watch
-- Netlify functions, which check the caller themselves - can read or write it.

create table if not exists public.ops_proposal_flags (
  proposal_id uuid primary key references public.proposals(id) on delete cascade,
  likely_to_close boolean not null default false,
  likely_set_by text,
  likely_set_at timestamptz,
  likely_alerted_at timestamptz,
  approved_alerted_at timestamptz,
  staffing_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ops_proposal_flags_likely_idx
  on public.ops_proposal_flags (likely_to_close)
  where likely_to_close;

alter table public.ops_proposal_flags enable row level security;
