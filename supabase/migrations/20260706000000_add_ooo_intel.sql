-- OOO intelligence (task #10): what each out-of-office reply actually said
-- (return date, leave type, alternate contacts, departure), and when the lead
-- becomes eligible to re-enter a weekly cold build (one-shot resurface).
alter table outreach_replies add column if not exists ooo_intel jsonb;
alter table outreach_contacts add column if not exists resurface_after timestamptz;
