-- Add column to store all signed document URLs from DocuSeal (not just the first)
ALTER TABLE pro_agreements
ADD COLUMN IF NOT EXISTS all_documents_urls JSONB DEFAULT NULL;
