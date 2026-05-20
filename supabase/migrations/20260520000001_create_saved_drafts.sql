-- Saved drafts: park a generated email without sending and reopen later.
-- Per-user (no shared inbox of drafts). target_ref is the original DraftTarget
-- (play+rank, followup payload, or contact email) so the modal can
-- reconstruct context on reopen without re-running the LLM.

create table if not exists public.saved_drafts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  recipient_email   text,
  subject           text not null,
  body              text not null,
  direction_label   text,                 -- 'safe' | 'medium' | 'brave' | 'followup' | etc.
  source_company    text,
  source_contact    text,
  source_title      text,
  target_kind       text,                 -- 'playA' | 'playB' | 'followup' | 'contact'
  target_ref        jsonb not null default '{}'::jsonb,  -- enough to reopen DraftModal
  preflight_reco    text,
  note              text,                 -- optional free-text label from the rep
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists saved_drafts_user_id_idx on public.saved_drafts (user_id, created_at desc);

alter table public.saved_drafts enable row level security;
-- Rep can only see / touch their own drafts.
create policy "saved_drafts own select" on public.saved_drafts
  for select to authenticated using (user_id = auth.uid());
create policy "saved_drafts own insert" on public.saved_drafts
  for insert to authenticated with check (user_id = auth.uid());
create policy "saved_drafts own update" on public.saved_drafts
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "saved_drafts own delete" on public.saved_drafts
  for delete to authenticated using (user_id = auth.uid());
