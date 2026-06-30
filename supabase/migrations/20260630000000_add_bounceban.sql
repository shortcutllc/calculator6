-- BounceBan = the SECOND-pass verifier for catch-all / unknown emails that
-- MillionVerifier can't resolve. It probes deliverability without sending, and
-- resolves a catch-all into deliverable / undeliverable / risky (97%+ accuracy).
-- We keep mv_status as the MV truth and add bounceban_status as the second signal:
-- a catch_all with bounceban_status='deliverable' becomes sendable.
alter table public.outreach_contacts add column if not exists bounceban_status text;
alter table public.outreach_contacts add column if not exists bounceban_checked_at timestamptz;
alter table public.outreach_contacts add column if not exists bounceban_score integer;

comment on column public.outreach_contacts.bounceban_status is 'BounceBan 2nd-pass result for MV catch_all/unknown: deliverable | undeliverable | risky | unknown. deliverable => sendable.';

-- Index so the cold pool can quickly find catch-all leads BounceBan promoted to deliverable.
create index if not exists idx_outreach_contacts_bounceban on public.outreach_contacts (bounceban_status) where bounceban_status is not null;
