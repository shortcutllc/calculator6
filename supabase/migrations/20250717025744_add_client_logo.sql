-- Add client_logo_url field to proposals table
ALTER TABLE proposals 
ADD COLUMN IF NOT EXISTS client_logo_url text;

-- Create client-logos storage bucket (fix typo)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('client-logos', 'client-logos', true, 10485760)
ON CONFLICT (id) DO UPDATE 
SET file_size_limit = 10485760;

-- Drop old policies if needed
DROP POLICY IF EXISTS "Give public access to client logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload client logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update client logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete client logos" ON storage.objects;

-- Add correct policies
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

-- Add index for client_logo_url for performance
CREATE INDEX IF NOT EXISTS idx_proposals_client_logo_url 
ON proposals(client_logo_url)
WHERE client_logo_url IS NOT NULL; 
