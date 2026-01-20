-- =============================================
-- Rosie AI - Database Migration
-- Baby tracking app tables
-- =============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. User Profiles Table
-- =============================================
-- Extends Supabase auth.users with Rosie-specific data
CREATE TABLE IF NOT EXISTS rosie_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE rosie_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only see and edit their own profile
CREATE POLICY "Users can view own profile"
  ON rosie_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON rosie_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON rosie_profiles FOR UPDATE
  USING (auth.uid() = id);

-- =============================================
-- 2. Babies Table
-- =============================================
-- One user can have multiple babies
CREATE TABLE IF NOT EXISTS rosie_babies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES rosie_profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries by user
CREATE INDEX IF NOT EXISTS idx_rosie_babies_user_id ON rosie_babies(user_id);

-- Enable RLS
ALTER TABLE rosie_babies ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own babies
CREATE POLICY "Users can view own babies"
  ON rosie_babies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own babies"
  ON rosie_babies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own babies"
  ON rosie_babies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own babies"
  ON rosie_babies FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- 3. Activities Table
-- =============================================
-- Tracks feeds, sleeps, diapers, etc.
CREATE TABLE IF NOT EXISTS rosie_activities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  baby_id UUID REFERENCES rosie_babies(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('feed', 'sleep', 'diaper', 'note')),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  -- Type-specific data stored as JSONB:
  -- feed: { feedType: 'breast' | 'bottle' | 'solid', side?: 'left' | 'right' | 'both', amount?: string }
  -- sleep: { quality?: string, location?: string }
  -- diaper: { wet: boolean, dirty: boolean }
  -- note: { text: string }
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_rosie_activities_baby_id ON rosie_activities(baby_id);
CREATE INDEX IF NOT EXISTS idx_rosie_activities_type ON rosie_activities(type);
CREATE INDEX IF NOT EXISTS idx_rosie_activities_started_at ON rosie_activities(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_rosie_activities_baby_date ON rosie_activities(baby_id, started_at DESC);

-- Enable RLS
ALTER TABLE rosie_activities ENABLE ROW LEVEL SECURITY;

-- Users can only see activities for babies they own
CREATE POLICY "Users can view activities for own babies"
  ON rosie_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rosie_babies
      WHERE rosie_babies.id = rosie_activities.baby_id
      AND rosie_babies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert activities for own babies"
  ON rosie_activities FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rosie_babies
      WHERE rosie_babies.id = rosie_activities.baby_id
      AND rosie_babies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update activities for own babies"
  ON rosie_activities FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM rosie_babies
      WHERE rosie_babies.id = rosie_activities.baby_id
      AND rosie_babies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete activities for own babies"
  ON rosie_activities FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM rosie_babies
      WHERE rosie_babies.id = rosie_activities.baby_id
      AND rosie_babies.user_id = auth.uid()
    )
  );

-- =============================================
-- 4. Auto-update timestamps trigger
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all Rosie tables
DROP TRIGGER IF EXISTS update_rosie_profiles_updated_at ON rosie_profiles;
CREATE TRIGGER update_rosie_profiles_updated_at
  BEFORE UPDATE ON rosie_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rosie_babies_updated_at ON rosie_babies;
CREATE TRIGGER update_rosie_babies_updated_at
  BEFORE UPDATE ON rosie_babies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rosie_activities_updated_at ON rosie_activities;
CREATE TRIGGER update_rosie_activities_updated_at
  BEFORE UPDATE ON rosie_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 5. Helper function to auto-create profile on signup
-- =============================================
-- This creates a rosie_profile when a user signs up
CREATE OR REPLACE FUNCTION handle_new_rosie_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.rosie_profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Note: To auto-create profiles on signup, run this in Supabase SQL editor:
-- CREATE TRIGGER on_auth_user_created_rosie
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION handle_new_rosie_user();
--
-- However, this is OPTIONAL - the app handles profile creation manually

-- =============================================
-- Summary of tables created:
-- =============================================
-- rosie_profiles - User profiles (linked to auth.users)
-- rosie_babies - Baby profiles (multiple per user)
-- rosie_activities - Activity logs (feeds, sleeps, diapers)
--
-- All tables have RLS enabled so users can only access their own data.
-- =============================================
