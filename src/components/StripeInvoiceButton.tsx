import React, { useState } from 'react';
import { Receipt, ExternalLink, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { InvoiceConfirmationModal, InvoiceLineItem } from './InvoiceConfirmationModal';

// --- Client-side line item generation (mirrors server buildLineItems) ---

const SERVICE_DISPLAY_NAMES: Record<string, string> = {
  massage: 'Chair Massage',
  facial: 'Facial',
  hair: 'Hair Services',
  nails: 'Nail Services',
  makeup: 'Makeup Services',
  headshot: 'Corporate Headshots',
  'hair-makeup': 'Hair + Makeup',
  'headshot-hair-makeup': 'Hair + Makeup for Headshots',
  mindfulness: 'Mindfulness Session',
  'mindfulness-soles': 'Mindfulness: Soles of the Feet',
  'mindfulness-movement': 'Mindfulness: Movement & Stillness',
  'mindfulness-pro': 'Mindfulness: PRO Practice',
  'mindfulness-cle': 'CLE Ethics: Mindfulness',
  'mindfulness-pro-reactivity': 'Mindfulness: Stepping Out of Reactivity'
};

function formatServiceName(serviceType: string): string {
  return SERVICE_DISPLAY_NAMES[serviceType] ||
    serviceType.charAt(0).toUpperCase() + serviceType.slice(1);
}

function formatDate(dateStr: string): string {
  if (!dateStr || dateStr === 'TBD') return dateStr || 'TBD';
  try {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function generateLineItems(
  proposalData: any,
  pricingOptions?: any,
  selectedOptions?: any
): InvoiceLineItem[] {
  const items: InvoiceLineItem[] = [];
  const services = proposalData?.services || {};

  Object.entries(services).forEach(([location, locationData]: [string, any]) => {
    if (Array.isArray(locationData)) return;
    Object.entries(locationData).forEach(([date, dateData]: [string, any]) => {
      const serviceList = dateData?.services || [];
      serviceList.forEach((service: any, serviceIndex: number) => {
        let effectiveCost = service.serviceCost || 0;

        if (pricingOptions && selectedOptions) {
          const optionKey = `${location}-${date}-${serviceIndex}`;
          const options = pricingOptions[optionKey];
          const selectedIdx = selectedOptions[optionKey];
          if (options && selectedIdx !== undefined && options[selectedIdx]) {
            const selectedOption = options[selectedIdx];
            if (selectedOption.serviceCost != null) {
              effectiveCost = selectedOption.serviceCost;
            }
          }
        }

        items.push({
          description: `${formatServiceName(service.serviceType)} at ${location} on ${formatDate(date)}`,
          amount: effectiveCost
        });
      });
    });
  });

  // Custom line items
  if (proposalData?.customLineItems && Array.isArray(proposalData.customLineItems)) {
    proposalData.customLineItems.forEach((item: any) => {
      if (item.amount) {
        items.push({
          description: item.name || item.description || 'Custom item',
          amount: item.amount
        });
      }
    });
  }

  // Gratuity
  if (proposalData?.gratuityType && proposalData?.summary) {
    const summary = proposalData.summary;
    let gratuityAmount = 0;
    if (proposalData.gratuityType === 'percentage' && proposalData.gratuityValue) {
      gratuityAmount = (summary.subtotalBeforeGratuity || summary.totalEventCost || 0) * (proposalData.gratuityValue / 100);
    } else if (proposalData.gratuityType === 'dollar' && proposalData.gratuityValue) {
      gratuityAmount = proposalData.gratuityValue;
    }
    if (gratuityAmount > 0) {
      items.push({
        description: `Gratuity (${proposalData.gratuityType === 'percentage' ? `${proposalData.gratuityValue}%` : 'flat'})`,
        amount: gratuityAmount
      });
    }
  }

  return items;
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
  invoiceStatus,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(existingInvoiceUrl || null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // If already invoiced, show view-only state with status
  if (invoiceUrl) {
    const statusConfig = invoiceStatus ? INVOICE_STATUS_CONFIG[invoiceStatus] : null;
    return (
      <div className="flex items-center gap-2">
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
        {statusConfig && (
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${statusConfig.className}`}>
            {statusConfig.label}
          </span>
        )}
      </div>
    );
  }

  const openConfirmation = () => {
    setError(null);
    setShowConfirmation(true);
  };

  const handleSendInvoice = async (data: {
    clientName: string;
    clientEmail: string;
    lineItems: InvoiceLineItem[];
    daysUntilDue: number;
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
          daysUntilDue: data.daysUntilDue
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

  const initialItems = generateLineItems(proposalData, pricingOptions, selectedOptions);

  return (
    <>
      <button
        onClick={openConfirmation}
        className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#635BFF] hover:bg-[#4B45C6] text-white font-bold rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#635BFF] focus:ring-offset-2"
      >
        <Receipt size={18} />
        Create Invoice
      </button>

      <InvoiceConfirmationModal
        isOpen={showConfirmation}
        onClose={() => { setShowConfirmation(false); setError(null); }}
        onSend={handleSendInvoice}
        initialName={proposalData?.clientName || ''}
        initialEmail={clientEmail || ''}
        initialItems={initialItems}
        proposalId={proposalId}
        loading={loading}
        error={error}
      />
    </>
  );
};
