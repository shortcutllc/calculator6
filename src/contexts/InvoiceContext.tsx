import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { StripeInvoice } from '../types/stripeInvoice';

interface InvoiceContextType {
  invoices: StripeInvoice[];
  loading: boolean;
  error: string | null;
  fetchInvoices: () => Promise<void>;
  syncInvoiceStatus: (stripeInvoiceId: string) => Promise<void>;
}

const InvoiceContext = createContext<InvoiceContextType | undefined>(undefined);

export const useInvoice = () => {
  const context = useContext(InvoiceContext);
  if (!context) {
    throw new Error('useInvoice must be used within an InvoiceProvider');
  }
  return context;
};

export const InvoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<StripeInvoice[]>([]);

  const transformRow = (row: any): StripeInvoice => ({
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    proposalId: row.proposal_id,
    stripeInvoiceId: row.stripe_invoice_id,
    stripeCustomerId: row.stripe_customer_id,
    invoiceUrl: row.invoice_url,
    status: row.status,
    amountCents: row.amount_cents,
    clientName: row.client_name,
    createdByUserId: row.created_by_user_id,
  });

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('stripe_invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Handle case where table doesn't exist yet
        if (error.code === 'PGRST204' || error.code === '42P01' || error.message?.includes('does not exist')) {
          setInvoices([]);
          setLoading(false);
          return;
        }
        throw error;
      }

      setInvoices((data || []).map(transformRow));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch invoices';
      setError(msg);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const syncInvoiceStatus = async (stripeInvoiceId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch('/.netlify/functions/create-stripe-invoice?action=sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ stripeInvoiceId })
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to sync status');
      }

      // Refresh the list to show updated status
      await fetchInvoices();
    } catch (err) {
      console.error('Failed to sync invoice status:', err);
      throw err;
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => { fetchInvoices().catch(() => {}); }, 0);
    return () => clearTimeout(timer);
  }, []);

  const value: InvoiceContextType = {
    invoices,
    loading,
    error,
    fetchInvoices,
    syncInvoiceStatus,
  };

  return (
    <InvoiceContext.Provider value={value}>
      {children}
    </InvoiceContext.Provider>
  );
};
