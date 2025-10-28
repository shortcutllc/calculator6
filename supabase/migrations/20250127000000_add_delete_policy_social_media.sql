-- Add DELETE policy for social_media_contact_requests table
-- Allow authenticated users to delete contact requests

CREATE POLICY "Authenticated users can delete social media contact requests" ON social_media_contact_requests
  FOR DELETE USING (auth.role() = 'authenticated');
