/*
  # Add storage policies for brochures bucket

  1. Changes
    - Create brochures bucket if it doesn't exist
    - Add policy for public read access
    - Add policy for authenticated uploads
*/

-- Enable storage by creating the storage schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS storage;

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('brochures', 'brochures', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to files in the brochures bucket
CREATE POLICY "Give public access to brochures" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'brochures');

-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload brochures" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'brochures' AND
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to delete their own files
CREATE POLICY "Allow authenticated users to delete brochures" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'brochures' AND
    auth.role() = 'authenticated'
  );