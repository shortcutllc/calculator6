/*
  Sample COIs a client uploads with the post-approval event survey
  (src/components/ProposalSurveyForm.tsx): the building's own sample
  certificate or insurance requirements, so ours can match them.

  1. Bucket `coi-samples`: PRIVATE. No storage policies are added, so anon
     and authenticated users can neither read nor write it directly. Uploads
     go through one-time signed upload links and staff open files through
     short-lived signed links, both issued by netlify/functions/coi-sample.js
     with the service role. (Email signup is open, so "authenticated" is not
     proof of staff.) 10 MB per file; PDF, Word and common images.

  2. Column `proposal_survey_responses.coi_sample_files`: the uploaded files,
     [{ path, name, size, contentType, uploadedAt }]. Its own column rather
     than a key in `responses`, which staff screens read as one block per
     service.

  3. Column `proposal_survey_responses.entry_and_parking`: how the team gets
     into each building and where they can park, keyed by location
     ({ "New York": "Check in at the lobby desk..." }). Optional.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'coi-samples',
  'coi-samples',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE proposal_survey_responses
  ADD COLUMN IF NOT EXISTS coi_sample_files jsonb,
  ADD COLUMN IF NOT EXISTS entry_and_parking jsonb;
