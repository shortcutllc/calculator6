/*
  # Clean up database schema
  
  1. Changes
    - Drop all custom tables
    - Drop custom types
    - Drop custom functions
    - Remove indexes
*/

-- First drop dependent tables
DROP TABLE IF EXISTS access_logs CASCADE;
DROP TABLE IF EXISTS client_proposals CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS proposals CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS proposal_status CASCADE;

-- Drop custom functions
DROP FUNCTION IF EXISTS check_proposal_access CASCADE;
DROP FUNCTION IF EXISTS log_proposal_access CASCADE;
DROP FUNCTION IF EXISTS track_proposal_changes CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS verify_proposal_access CASCADE;
DROP FUNCTION IF EXISTS verify_proposal_password CASCADE;

-- Clean up any remaining indexes
DROP INDEX IF EXISTS idx_proposals_changes;
DROP INDEX IF EXISTS idx_proposals_expires_at;
DROP INDEX IF EXISTS idx_proposals_has_changes;
DROP INDEX IF EXISTS idx_proposals_original_data;
DROP INDEX IF EXISTS idx_proposals_pending_review;
DROP INDEX IF EXISTS idx_proposals_shared_access;
DROP INDEX IF EXISTS idx_proposals_status;
DROP INDEX IF EXISTS idx_access_logs_proposal_id;
DROP INDEX IF EXISTS idx_access_logs_accessed_at;