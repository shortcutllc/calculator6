-- Create client-logos storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('client-logos', 'client-logos', true, 10485760)
ON CONFLICT (id) DO UPDATE 
SET file_size_limit = 10485760;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Give public access to client logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload client logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update client logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete client logos" ON storage.objects;

-- Create new policies
CREATE POLICY "Give public access to client logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'client-logos');

CREATE POLICY "Allow authenticated users to upload client logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-logos');

CREATE POLICY "Allow authenticated users to update client logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'client-logos');

CREATE POLICY "Allow authenticated users to delete client logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'client-logos');

-- Verify bucket exists
SELECT * FROM storage.buckets WHERE id = 'client-logos'; 