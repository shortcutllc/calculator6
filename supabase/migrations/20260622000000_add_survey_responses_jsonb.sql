-- Service-aware pre-event survey: per-service question blocks (hair, headshot,
-- nails, facial, …) are stored in a flexible JSONB map keyed by service type,
-- e.g. { "hair": { "hair_type": "Curly", ... }, "headshot": { ... } }.
-- The existing fixed columns (table_or_chair_preference, preferred_gender,
-- office_address, massage_space_name, point_of_contact, billing_contact,
-- coi_required) continue to hold the massage answers + shared logistics, so
-- this is additive and backward-compatible.
ALTER TABLE proposal_survey_responses
  ADD COLUMN IF NOT EXISTS responses JSONB DEFAULT '{}'::jsonb;
