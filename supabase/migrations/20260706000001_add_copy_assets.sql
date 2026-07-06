-- COPY PROPOSAL LANE (Will approved 2026-07-06): the brain drafts, the gates
-- review, WILL ratifies, the engine ships ratified text verbatim. Copy iteration
-- has exactly one entrance — no human (or agent) edits approved copy directly.
create table if not exists copy_assets (
  id uuid primary key default gen_random_uuid(),
  segment text not null,                   -- direct | law | realestate | broker
  opener text not null,                    -- generic | rto | cle | wellness | building | portfolio
  label text,                              -- short human name for the proposal
  steps jsonb not null,                    -- [{step, delayDays, subjects[], body, abVariants?}]
  status text not null default 'proposed', -- proposed | approved | rejected | retired
  evaluator jsonb,                         -- deterministic gate report at proposal time
  judge jsonb,                             -- LLM judge report at proposal time
  note text,                               -- why this was proposed (evidence)
  created_at timestamptz default now(),
  approved_at timestamptz,
  approved_by text
);
create index if not exists copy_assets_lookup on copy_assets (segment, opener, status, approved_at desc);
