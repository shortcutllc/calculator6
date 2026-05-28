-- Restructure outreach_sends so each Gmail message gets its own row.
--
-- Before: unique (email, campaign_id) meant every Gmail message to the same
-- contact under the same campaign collapsed into ONE row. The crawl + the
-- historical sweep both upserted under (email, campaign_id), incrementing
-- touch_count and overwriting message_id with whatever message was processed
-- last. Result: a contact like Larcy showed touch_count=5 in workhuman-
-- historical (only the May-5 message_id stored, four other message_ids lost)
-- and Jen showed touch_count=7 in gmail-sent-crawl (only the most recent
-- message_id stored, three others lost). The follow-ups aggregator summed
-- inflated counts across campaign rows and would falsely mark contacts as
-- "maxed" (over cadence cap).
--
-- After: (email, message_id) is unique when message_id is present, so each
-- real Gmail message gets its own row. The aggregator can now count actual
-- messages per email in window. Legacy rows with null message_id (Smartlead
-- historical) keep the old (email, campaign_id) unique semantics — those
-- rows have no message-level history to recover.

alter table public.outreach_sends drop constraint if exists outreach_sends_email_campaign_id_key;

create unique index if not exists outreach_sends_email_message_id_unique
  on public.outreach_sends (email, message_id)
  where message_id is not null;

create unique index if not exists outreach_sends_email_campaign_id_no_msg_unique
  on public.outreach_sends (email, campaign_id)
  where message_id is null;
