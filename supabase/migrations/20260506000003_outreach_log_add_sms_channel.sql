-- Allow 'sms' as a value in lead_outreach_log.channel.
-- The Personal-Note Rapid Outreach panel adds an SMS quick-action so teammates
-- can copy a short follow-up text and tap-to-open Messages with the lead's
-- phone pre-filled. Each tap is logged via logOutreach() with channel='sms',
-- which the existing CHECK constraint would otherwise reject.

ALTER TABLE lead_outreach_log
  DROP CONSTRAINT IF EXISTS lead_outreach_log_channel_check;

ALTER TABLE lead_outreach_log
  ADD CONSTRAINT lead_outreach_log_channel_check
  CHECK (channel IN ('workhuman_dm', 'linkedin_connect', 'linkedin_dm', 'email', 'sms'));
