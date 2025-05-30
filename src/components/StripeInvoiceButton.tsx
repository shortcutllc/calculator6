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

  const handleCreateInvoice = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!proposalData || !proposalData.clientName) {
        throw new Error('Invalid proposal data: Missing client information');
      }

      console.log('Creating customer for proposal:', proposalData.id);
      
      // First create or get customer
      const { data: customerData, error: customerError } = await supabase
        .functions
        .invoke('create-customer', {
          body: { proposalData }
        });

      if (customerError) {
        console.error('Customer creation error:', customerError);
        throw new Error('Failed to create customer');
      }

      if (!customerData?.customerId) {
        throw new Error('Customer creation failed: No customer ID returned');
      }

      console.log('Customer created successfully:', customerData.customerId);

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
        throw new Error('Failed to create invoice');
      }

      if (!invoiceData?.invoiceUrl) {
        throw new Error('Invoice creation failed: No invoice URL returned');
      }

      console.log('Invoice created successfully:', invoiceData.invoiceId);

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
        {loading ? 'Creating Invoice...' : 'Create Invoice'}
      </Button>
      {error && (
        <p className="text-red-600 text-sm mt-2">
          {error}
        </p>
      )}
    </div>
  );
};