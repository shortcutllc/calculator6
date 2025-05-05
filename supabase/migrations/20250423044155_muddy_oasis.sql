/*
  # Initial schema setup for proposals

  1. New Tables
    - `proposals`
      - `id` (uuid, primary key)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `client_name` (text)
      - `data` (jsonb)
      - `customization` (jsonb)
      - `is_password_protected` (boolean)
      - `password` (text, nullable)
      - `is_editable` (boolean)
      - `user_id` (uuid, references auth.users)
      - `status` (text)
      - `pending_review` (boolean)
      - `has_changes` (boolean)

  2. Security
    - Enable RLS on `proposals` table
    - Add policies for authenticated users to:
      - Read their own proposals
      - Create new proposals
      - Update their own proposals
      - Delete their own proposals
*/

-- Create proposals table
CREATE TABLE IF NOT EXISTS proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  client_name text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  customization jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_password_protected boolean DEFAULT false,
  password text,
  is_editable boolean DEFAULT true,
  user_id uuid REFERENCES auth.users NOT NULL,
  status text DEFAULT 'draft',
  pending_review boolean DEFAULT false,
  has_changes boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own proposals"
  ON proposals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create proposals"
  ON proposals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own proposals"
  ON proposals
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own proposals"
  ON proposals
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_proposals_updated_at
  BEFORE UPDATE
  ON proposals
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();