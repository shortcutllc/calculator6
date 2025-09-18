-- Fix headshot storage bucket configuration
-- Migration: 20250120000000_fix_headshot_storage_bucket.sql

-- Update the storage bucket to be public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'headshot-photos';

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "headshot_photos_public_access" ON storage.objects;
DROP POLICY IF EXISTS "headshot_photos_admin_upload" ON storage.objects;
DROP POLICY IF EXISTS "headshot_photos_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "headshot_photos_admin_delete" ON storage.objects;

-- Create policy for public access
CREATE POLICY "headshot_photos_public_access" ON storage.objects
  FOR SELECT USING (bucket_id = 'headshot-photos');

-- Create policy for admin uploads
CREATE POLICY "headshot_photos_admin_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'headshot-photos' AND auth.role() = 'authenticated');

-- Create policy for admin updates
CREATE POLICY "headshot_photos_admin_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'headshot-photos' AND auth.role() = 'authenticated');

-- Create policy for admin deletes
CREATE POLICY "headshot_photos_admin_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'headshot-photos' AND auth.role() = 'authenticated');
