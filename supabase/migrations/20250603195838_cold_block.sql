-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Give public access to brochures" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload brochures" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete brochures" ON storage.objects;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('brochures', 'brochures', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public access to files in the brochures bucket
CREATE POLICY "Give public access to brochures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'brochures');

-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload brochures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'brochures');

-- Allow authenticated users to delete files
CREATE POLICY "Allow authenticated users to delete brochures"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'brochures');