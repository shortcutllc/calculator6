import React, { useState } from 'react';
import { Receipt } from 'lucide-react';
import { Button } from './Button';
import { supabase } from '../lib/supabaseClient';

interface StripeInvoiceButtonProps {
  proposalData: any;
}

export const StripeInvoiceButton: React.FC<StripeInvoiceButtonProps> = ({ proposalData }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDevelopment = process.env.NODE_ENV === 'development';

  const handleCreateInvoice = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!proposalData || !proposalData.clientName) {
        throw new Error('Invalid proposal data: Missing client information');
      }

      // For development environment, simulate success
      if (isDevelopment) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
        window.alert('Development mode: Invoice creation simulated. This feature will work in production.');
        return;
      }

      // First create or get customer
      const { data: customerData, error: customerError } = await supabase
        .functions
        .invoke('create-customer', {
          body: { proposalData }
        });

      if (customerError) {
        console.error('Customer creation error:', customerError);
        throw new Error(
          customerError.message || 'Failed to create customer. Please try again.'
        );
      }

      if (!customerData?.customerId) {
        throw new Error('Customer creation failed: No customer ID returned');
      }

      // Then create invoice with customer ID
      const { data: invoiceData, error: invoiceError } = await supabase
        .functions
        .invoke('create-invoice', {
          body: { 
            proposalData,
            customerId: customerData.customerId
          }
        });

      if (invoiceError) {
        console.error('Invoice creation error:', invoiceError);
        throw new Error(
          invoiceError.message || 'Failed to create invoice. Please try again.'
        );
      }

      if (!invoiceData?.invoiceUrl) {
        throw new Error('Invoice creation failed: No invoice URL returned');
      }

      // Open invoice in new tab
      window.open(invoiceData.invoiceUrl, '_blank');
    } catch (error) {
      console.error('Error creating invoice:', error);
      setError(error instanceof Error ? error.message : 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button
        onClick={handleCreateInvoice}
        variant="primary"
        icon={<Receipt size={18} />}
        loading={loading}
        disabled={loading}
      >
        {isDevelopment ? 'Create Invoice (Dev Mode)' : 'Create Invoice'}
      </Button>
      {error && (
        <p className="text-red-600 text-sm mt-2">
          {error}
        </p>
      )}
      {isDevelopment && !loading && !error && (
        <p className="text-gray-500 text-xs mt-1">
          Note: Invoice creation is simulated in development mode
        </p>
      )}
    </div>
  );
};