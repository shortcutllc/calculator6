-- Follow-up sequencing support. We keep one row per (email, campaign_id)
-- (existing unique constraint), so a re-send to the same person can't add a
-- row — instead we track cadence on the row:
--   touch_count : how many times we've emailed them on this campaign
--   thread_id   : Gmail thread (so a follow-up lands in the same thread)
--   message_id  : Gmail message id of the latest send
-- These are only ever set by send-as-rep for companion sends; legacy
-- Smartlead rows stay touch_count=1, thread_id null (never followed up here).

alter table public.outreach_sends
  add column if not exists touch_count int not null default 1,
  add column if not exists thread_id   text,
  add column if not exists message_id  text;
