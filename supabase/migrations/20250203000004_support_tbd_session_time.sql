-- Support TBD session time for mindfulness program sessions
-- Migration: 20250203000004_support_tbd_session_time.sql

-- Change session_time to TEXT to support "TBD"
ALTER TABLE program_sessions 
ALTER COLUMN session_time TYPE TEXT;

COMMENT ON COLUMN program_sessions.session_time IS 'Session time (HH:MM format) or "TBD" for times to be determined';
