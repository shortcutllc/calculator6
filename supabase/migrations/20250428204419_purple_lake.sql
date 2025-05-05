/*
  # Add password protection to proposals

  1. Changes
    - Add `is_password_protected` boolean column to proposals table with default value of false
    - Add `password` text column to store encrypted passwords (nullable)

  2. Security
    - No changes to RLS policies needed
*/

-- Add is_password_protected column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'proposals' AND column_name = 'is_password_protected'
  ) THEN
    ALTER TABLE proposals 
    ADD COLUMN is_password_protected boolean DEFAULT false;
  END IF;
END $$;

-- Add password column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'proposals' AND column_name = 'password'
  ) THEN
    ALTER TABLE proposals 
    ADD COLUMN password text;
  END IF;
END $$;