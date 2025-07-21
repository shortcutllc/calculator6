/*
  # Add pricing options support to proposals

  This migration adds support for multiple pricing options per proposal.
  
  New columns:
  - `pricing_options` (jsonb) - stores the pricing options structure
  - `selected_options` (jsonb) - tracks which options clients select
  - `has_pricing_options` (boolean) - flag to indicate if proposal uses options
*/

-- Add new columns to proposals table
ALTER TABLE proposals 
ADD COLUMN IF NOT EXISTS pricing_options jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS selected_options jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS has_pricing_options boolean DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN proposals.pricing_options IS 'JSON structure containing pricing options for each service date';
COMMENT ON COLUMN proposals.selected_options IS 'JSON structure tracking which options clients have selected';
COMMENT ON COLUMN proposals.has_pricing_options IS 'Flag indicating if this proposal uses pricing options instead of single services';

-- Create index for better query performance on pricing options
CREATE INDEX IF NOT EXISTS idx_proposals_pricing_options ON proposals USING gin (pricing_options);
CREATE INDEX IF NOT EXISTS idx_proposals_has_pricing_options ON proposals (has_pricing_options);

-- Update the updated_at trigger to include new columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Ensure the trigger exists and is applied
DROP TRIGGER IF EXISTS update_proposals_updated_at ON proposals;
CREATE TRIGGER update_proposals_updated_at
    BEFORE UPDATE ON proposals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
