-- Support TBD dates for mindfulness programs and sessions
-- Migration: 20250203000003_support_tbd_dates.sql

-- Change start_date and end_date to TEXT to support "TBD"
ALTER TABLE mindfulness_programs 
ALTER COLUMN start_date TYPE TEXT,
ALTER COLUMN end_date TYPE TEXT;

-- Change session_date to TEXT to support "TBD"
ALTER TABLE program_sessions 
ALTER COLUMN session_date TYPE TEXT;

COMMENT ON COLUMN mindfulness_programs.start_date IS 'Program start date (YYYY-MM-DD format) or "TBD" for dates to be determined';
COMMENT ON COLUMN mindfulness_programs.end_date IS 'Program end date (YYYY-MM-DD format) or "TBD" for dates to be determined';
COMMENT ON COLUMN program_sessions.session_date IS 'Session date (YYYY-MM-DD format) or "TBD" for dates to be determined';
