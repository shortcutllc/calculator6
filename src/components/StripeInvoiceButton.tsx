import React, { useMemo, useState } from 'react';
import { Receipt, ExternalLink, CheckCircle, Copy, Download, Check } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { InvoiceConfirmationModal, InvoiceLineItem } from './InvoiceConfirmationModal';
import { buildInvoiceLineItems, defaultPaymentDue } from '../../netlify/functions/lib/invoice-defaults.js';
import { loadInvoiceRecipient, LoadedInvoiceRecipient } from '../utils/invoiceRecipient';

// --- Line items: the shared invoice rules (also used by create-stripe-invoice) ---

/**
 * Line items for an invoice made from a proposal, named like
 * "Atmosphere TV December 17th Manicure Event".
 */
export function generateLineItems(
  proposalData: any,
  pricingOptions?: any,
  selectedOptions?: any
): InvoiceLineItem[] {
  return buildInvoiceLineItems(proposalData, pricingOptions, selectedOptions);
}

// --- Invoice Status Config ---

const INVOICE_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
  open: { label: 'Open', className: 'bg-blue-100 text-blue-700' },
  sent: { label: 'Sent', className: 'bg-[#635BFF]/10 text-[#635BFF]' },
  paid: { label: 'Paid', className: 'bg-green-100 text-green-700' },
  uncollectible: { label: 'Uncollectible', className: 'bg-red-100 text-red-700' },
  void: { label: 'Void', className: 'bg-gray-100 text-gray-500' },
};

// --- Component ---

interface StripeInvoiceButtonProps {
  proposalId: string;
  proposalData: any;
  pricingOptions?: any;
  selectedOptions?: any;
  clientEmail?: string;
  existingInvoiceUrl?: string | null;
  existingInvoicePdf?: string | null;
  invoiceStatus?: string | null;
  onSuccess?: (invoiceUrl: string) => void;
}

export const StripeInvoiceButton: React.FC<StripeInvoiceButtonProps> = ({
  proposalId,
  proposalData,
  pricingOptions,
  selectedOptions,
  clientEmail,
  existingInvoiceUrl,
  existingInvoicePdf,
  invoiceStatus,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(existingInvoiceUrl || null);
  const [invoicePdf, setInvoicePdf] = useState<string | null>(existingInvoicePdf || null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recipient, setRecipient] = useState<LoadedInvoiceRecipient | null>(null);
  const [opening, setOpening] = useState(false);
  // Stable between renders, so the modal keeps staff edits while it sends.
  const initialItems = useMemo(
    () => generateLineItems(proposalData, pricingOptions, selectedOptions),
    [proposalData, pricingOptions, selectedOptions]
  );
  const paymentDue = useMemo(() => defaultPaymentDue(proposalData), [proposalData]);

  // If already invoiced, show view-only state with status
  if (invoiceUrl) {
    const statusConfig = invoiceStatus ? INVOICE_STATUS_CONFIG[invoiceStatus] : null;

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(invoiceUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        window.open(invoiceUrl, '_blank');
      }
    };

    return (
      <div className="flex items-center gap-2 flex-wrap">
        <CheckCircle size={16} className="text-green-600 shrink-0" />
        <a
          href={invoiceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#635BFF] hover:text-[#4B45C6] transition-colors"
        >
          View Invoice
          <ExternalLink size={14} />
        </a>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
          title="Copy shareable link"
        >
          {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy Link'}
        </button>
        {invoicePdf && (
          <a
            href={invoicePdf}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
            title="Download PDF"
          >
            <Download size={12} />
            PDF
          </a>
        )}
        {statusConfig && (
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${statusConfig.className}`}>
            {statusConfig.label}
          </span>
        )}
      </div>
    );
  }

  const openConfirmation = async () => {
    setError(null);
    setOpening(true);
    setRecipient(await loadInvoiceRecipient(proposalId));
    setOpening(false);
    setShowConfirmation(true);
  };

  const handleSendInvoice = async (data: {
    clientName: string;
    clientEmail: string;
    lineItems: InvoiceLineItem[];
    dueDate: string;
    sendToClient?: boolean;
  }) => {
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
          clientName: data.clientName,
          clientEmail: data.clientEmail,
          lineItems: data.lineItems.map(item => ({
            description: item.description,
            amount: item.amount
          })),
          dueDate: data.dueDate,
          sendToClient: data.sendToClient ?? true
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
      setInvoicePdf(result.invoicePdf || null);
      setShowConfirmation(false);
      onSuccess?.(result.invoiceUrl);

      window.open(result.invoiceUrl, '_blank');
    } catch (err) {
      console.error('Error creating invoice:', err);
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };


  return (
    <>
      <button
        onClick={openConfirmation}
        disabled={opening}
        className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#635BFF] hover:bg-[#4B45C6] text-white font-bold rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#635BFF] focus:ring-offset-2"
      >
        <Receipt size={18} />
        Create Invoice
      </button>

      <InvoiceConfirmationModal
        isOpen={showConfirmation}
        onClose={() => { setShowConfirmation(false); setError(null); }}
        onSend={handleSendInvoice}
        initialName={recipient?.name || proposalData?.clientName || ''}
        initialEmail={recipient?.email || clientEmail || ''}
        initialItems={initialItems}
        paymentDue={paymentDue}
        billingContactText={recipient?.billingContactText}
        proposalId={proposalId}
        loading={loading}
        error={error}
      />
    </>
  );
};
