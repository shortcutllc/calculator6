-- Create stripe_invoices table for tracking Stripe invoice lifecycle
CREATE TABLE IF NOT EXISTS stripe_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  stripe_invoice_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  invoice_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'open', 'sent', 'paid', 'uncollectible', 'void')),
  amount_cents INTEGER NOT NULL DEFAULT 0,
  client_name TEXT NOT NULL,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_proposal_id ON stripe_invoices(proposal_id);
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_stripe_invoice_id ON stripe_invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_status ON stripe_invoices(status);

-- Enable RLS (staff-only access)
ALTER TABLE stripe_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view invoices" ON stripe_invoices;
DROP POLICY IF EXISTS "Authenticated users can create invoices" ON stripe_invoices;
DROP POLICY IF EXISTS "Authenticated users can update invoices" ON stripe_invoices;

CREATE POLICY "Authenticated users can view invoices" ON stripe_invoices
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create invoices" ON stripe_invoices
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update invoices" ON stripe_invoices
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Add stripe_invoice_id to proposals table for quick reference
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT;
CREATE INDEX IF NOT EXISTS idx_proposals_stripe_invoice_id ON proposals(stripe_invoice_id);

-- updated_at trigger (reuse existing function)
DROP TRIGGER IF EXISTS update_stripe_invoices_updated_at ON stripe_invoices;
CREATE TRIGGER update_stripe_invoices_updated_at BEFORE UPDATE
    ON stripe_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
