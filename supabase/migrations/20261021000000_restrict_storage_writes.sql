-- Storage: close the anonymous write holes on storage.objects.
--
-- On 2026-10-21 a POST to client-logos with only the anon key created an
-- object. The live policies (none of these are in the repo migrations) were:
--
--   * "Manage brochure files 199w6a7_0".."_3": a dashboard template saved
--     without a bucket filter. SELECT, INSERT, UPDATE and DELETE for anon and
--     authenticated on EVERY bucket. This is the hole that let the probe in.
--   * "headshot_photos_admin_write": FOR ALL with no bucket filter, so any
--     signed-in user could write to every bucket, not only headshot-photos.
--   * "headshot_photos_photographer_*" (20250120000009): anon could insert,
--     overwrite and delete anything in headshot-photos.
--
-- After this migration:
--
--   * Every bucket stays publicly readable. Each already has its own SELECT
--     policy except site-media, which relied on the catch-all and gets one here.
--   * Writes need a signed-in user, bucket by bucket. Netlify functions and
--     scripts/upload-site-media.mjs use the service role key, which bypasses
--     RLS, so they need no policy.
--   * One anonymous flow stays. Photographers at /photographer/:token upload
--     and delete headshots without signing in (PhotoUploader calls
--     HeadshotService.uploadPhoto, deletePhoto and deleteEmployeeGallery).
--     Anon keeps INSERT and DELETE in headshot-photos, limited to the
--     <gallery-uuid>/<file> paths that flow writes. Every gallery_photos row
--     and every unowned object in the bucket matched that shape on 2026-10-21.
--     Anon overwrite (UPDATE) goes: that flow never upserts.
--
-- Note that "authenticated" is only as strong as signup: while Auth allows
-- open email signup with auto-confirm, anyone can get a signed-in session.

-- 1. The template catch-alls: every bucket, anon included.
DROP POLICY IF EXISTS "Manage brochure files 199w6a7_0" ON storage.objects;
DROP POLICY IF EXISTS "Manage brochure files 199w6a7_1" ON storage.objects;
DROP POLICY IF EXISTS "Manage brochure files 199w6a7_2" ON storage.objects;
DROP POLICY IF EXISTS "Manage brochure files 199w6a7_3" ON storage.objects;

-- 2. The signed-in catch-all: every bucket. headshot-photos keeps its own
--    headshot_photos_admin_upload, _update and _delete.
DROP POLICY IF EXISTS "headshot_photos_admin_write" ON storage.objects;

-- 3. What the catch-alls were silently providing.
DROP POLICY IF EXISTS "Give public access to site media" ON storage.objects;
CREATE POLICY "Give public access to site media"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'site-media');

DROP POLICY IF EXISTS "Allow authenticated users to update brochures" ON storage.objects;
CREATE POLICY "Allow authenticated users to update brochures"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'brochures')
  WITH CHECK (bucket_id = 'brochures');

-- 4. Photographers: upload and delete only, only under a gallery folder.
DROP POLICY IF EXISTS "headshot_photos_photographer_update" ON storage.objects;

DROP POLICY IF EXISTS "headshot_photos_photographer_upload" ON storage.objects;
CREATE POLICY "headshot_photos_photographer_upload"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (
    bucket_id = 'headshot-photos'
    AND name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
  );

DROP POLICY IF EXISTS "headshot_photos_photographer_delete" ON storage.objects;
CREATE POLICY "headshot_photos_photographer_delete"
  ON storage.objects FOR DELETE
  TO anon
  USING (
    bucket_id = 'headshot-photos'
    AND name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
  );

-- 5. Fail the whole migration if any other write policy still reaches anon.
--    Policies granted to "public" count, unless every expression they carry
--    requires auth.role() = 'authenticated'.
DO $$
DECLARE
  leftover text;
BEGIN
  SELECT string_agg(policyname, ', ') INTO leftover
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
    AND roles && ARRAY['public', 'anon']::name[]
    AND policyname NOT IN ('headshot_photos_photographer_upload', 'headshot_photos_photographer_delete')
    AND (
      (qual IS NOT NULL AND qual !~ 'auth\.role\(\) = ''authenticated''')
      OR (with_check IS NOT NULL AND with_check !~ 'auth\.role\(\) = ''authenticated''')
    );

  IF leftover IS NOT NULL THEN
    RAISE EXCEPTION 'storage.objects still lets anon write: %', leftover;
  END IF;
END $$;
