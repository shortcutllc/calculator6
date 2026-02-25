-- Add invoice_pdf URL and sent_to_client flag to stripe_invoices
ALTER TABLE stripe_invoices ADD COLUMN IF NOT EXISTS invoice_pdf TEXT;
ALTER TABLE stripe_invoices ADD COLUMN IF NOT EXISTS sent_to_client BOOLEAN NOT NULL DEFAULT true;
