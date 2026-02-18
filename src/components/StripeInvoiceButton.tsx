import React, { useState } from 'react';
import { Receipt, ExternalLink, CheckCircle } from 'lucide-react';
import { Button } from './Button';
import { supabase } from '../lib/supabaseClient';

interface StripeInvoiceButtonProps {
  proposalId: string;
  proposalData: any;
  pricingOptions?: any;
  selectedOptions?: any;
  clientEmail?: string;
  existingInvoiceUrl?: string | null;
  onSuccess?: (invoiceUrl: string) => void;
}

export const StripeInvoiceButton: React.FC<StripeInvoiceButtonProps> = ({
  proposalId,
  proposalData,
  pricingOptions,
  selectedOptions,
  clientEmail,
  existingInvoiceUrl,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(existingInvoiceUrl || null);

  // If already invoiced, show view-only state
  if (invoiceUrl) {
    return (
      <div className="flex items-center gap-2">
        <CheckCircle size={16} className="text-green-600 shrink-0" />
        <a
          href={invoiceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-semibold text-shortcut-blue hover:text-shortcut-teal transition-colors"
        >
          View Invoice
          <ExternalLink size={14} />
        </a>
      </div>
    );
  }

  const handleCreateInvoice = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch('/.netlify/functions/create-stripe-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          proposalId,
          proposalData,
          pricingOptions: pricingOptions || null,
          selectedOptions: selectedOptions || null,
          clientEmail: clientEmail || null
        })
      });

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        throw new Error(`Server returned invalid response (${response.status}): ${text.slice(0, 200)}`);
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to create invoice');
      }

      setInvoiceUrl(result.invoiceUrl);
      onSuccess?.(result.invoiceUrl);

      // Open Stripe hosted invoice in new tab
      window.open(result.invoiceUrl, '_blank');
    } catch (err) {
      console.error('Error creating invoice:', err);
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button
        onClick={handleCreateInvoice}
        variant="secondary"
        icon={<Receipt size={18} />}
        loading={loading}
        disabled={loading}
      >
        {loading ? 'Creating Invoice...' : 'Create Invoice'}
      </Button>
      {error && (
        <p className="text-red-600 text-sm mt-1">{error}</p>
      )}
    </div>
  );
};
