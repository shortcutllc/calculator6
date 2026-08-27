-- How many photos each employee may pick for final retouching.
-- Existing events keep the previous behaviour of a single pick.
ALTER TABLE headshot_events
ADD COLUMN IF NOT EXISTS selections_allowed INTEGER NOT NULL DEFAULT 1;

ALTER TABLE headshot_events
ADD CONSTRAINT headshot_events_selections_allowed_positive
CHECK (selections_allowed >= 1);

COMMENT ON COLUMN headshot_events.selections_allowed IS
  'Maximum photos an employee may select for retouching. Default 1.';
