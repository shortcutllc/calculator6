-- Fix RLS policies for holiday_pages table
-- This ensures only authenticated users can delete their own holiday pages

-- Enable RLS if not already enabled
ALTER TABLE holiday_pages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view their own holiday pages" ON holiday_pages;
DROP POLICY IF EXISTS "Users can create their own holiday pages" ON holiday_pages;
DROP POLICY IF EXISTS "Users can update their own holiday pages" ON holiday_pages;
DROP POLICY IF EXISTS "Users can delete their own holiday pages" ON holiday_pages;
DROP POLICY IF EXISTS "Public access to published holiday pages" ON holiday_pages;

-- Recreate policies with proper authentication checks
CREATE POLICY "Users can view their own holiday pages" ON holiday_pages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own holiday pages" ON holiday_pages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own holiday pages" ON holiday_pages
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own holiday pages" ON holiday_pages
  FOR DELETE USING (auth.uid() = user_id);

-- Allow public access to published holiday pages via unique token (read-only)
CREATE POLICY "Public access to published holiday pages" ON holiday_pages
  FOR SELECT USING (status = 'published' AND unique_token IS NOT NULL);
