/*
  # Add expires_at column to proposals table

  1. Changes
    - Add `expires_at` column to `proposals` table
      - Type: timestamptz (timestamp with timezone)
      - Nullable: true
      - No default value
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'proposals' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE proposals ADD COLUMN expires_at timestamptz;
  END IF;
END $$;