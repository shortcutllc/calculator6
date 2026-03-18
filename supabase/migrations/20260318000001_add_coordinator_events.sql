-- Add coordinator_events column to proposals table.
-- Stores an array of event creation records linking proposals to
-- coordinator events created via the Create Event flow.
--
-- Structure: jsonb array of objects, each with:
--   date, location, eventName, status, coordinatorEventId, createdAt

ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS coordinator_events jsonb DEFAULT NULL;

-- Index for querying proposals that have coordinator events
CREATE INDEX IF NOT EXISTS idx_proposals_coordinator_events
ON proposals USING gin (coordinator_events)
WHERE coordinator_events IS NOT NULL;
