import React, { useState, useMemo } from 'react';
import { useInvoice } from '../contexts/InvoiceContext';
import { StripeInvoice, StripeInvoiceStatus } from '../types/stripeInvoice';
import { LoadingSpinner } from './LoadingSpinner';
import { Search, ExternalLink, RefreshCw, Receipt, FileText } from 'lucide-react';
import { Button } from './Button';
import { format } from 'date-fns';

const STATUS_CONFIG: Record<StripeInvoiceStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
  open: { label: 'Open', className: 'bg-blue-100 text-blue-700' },
  sent: { label: 'Sent', className: 'bg-blue-100 text-blue-700' },
  paid: { label: 'Paid', className: 'bg-green-100 text-green-700' },
  uncollectible: { label: 'Uncollectible', className: 'bg-red-100 text-red-700' },
  void: { label: 'Void', className: 'bg-gray-100 text-gray-500' },
};

const formatDollars = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

const InvoiceManager: React.FC = () => {
  const { invoices, loading, error, fetchInvoices, syncInvoiceStatus } = useInvoice();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const filteredInvoices = useMemo(() => {
    let filtered = invoices;

    // Search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(inv =>
        inv.clientName.toLowerCase().includes(term) ||
        inv.stripeInvoiceId.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(inv => inv.status === statusFilter);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [invoices, searchTerm, statusFilter, sortBy]);

  const handleSync = async (invoice: StripeInvoice) => {
    try {
      setSyncingId(invoice.id);
      await syncInvoiceStatus(invoice.stripeInvoiceId);
    } catch (err) {
      console.error('Failed to sync:', err);
    } finally {
      setSyncingId(null);
    }
  };

  const handleSyncAll = async () => {
    for (const invoice of invoices) {
      if (invoice.status !== 'paid' && invoice.status !== 'void') {
        try {
          await syncInvoiceStatus(invoice.stripeInvoiceId);
        } catch {
          // Continue syncing others
        }
      }
    }
  };

  if (loading && invoices.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-shortcut-navy-blue flex items-center gap-3">
            <Receipt className="text-shortcut-teal" size={28} />
            Invoices
            {invoices.length > 0 && (
              <span className="text-base font-medium bg-shortcut-teal bg-opacity-10 text-shortcut-teal px-3 py-1 rounded-full">
                {invoices.length}
              </span>
            )}
          </h1>
          <p className="text-text-dark-60 mt-1">Stripe invoices generated from approved proposals</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSyncAll}
            variant="secondary"
            icon={<RefreshCw size={16} />}
            disabled={invoices.length === 0}
          >
            Sync All
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by client name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
        >
          <option value="all">All Statuses</option>
          <option value="sent">Sent</option>
          <option value="open">Open</option>
          <option value="paid">Paid</option>
          <option value="void">Void</option>
          <option value="uncollectible">Uncollectible</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
          className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Invoice List */}
      {filteredInvoices.length === 0 ? (
        <div className="text-center py-16 bg-neutral-light-gray rounded-2xl">
          <Receipt size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-shortcut-navy-blue mb-2">
            {invoices.length === 0 ? 'No invoices yet' : 'No matching invoices'}
          </h3>
          <p className="text-text-dark-60 max-w-md mx-auto">
            {invoices.length === 0
              ? 'Invoices are created from approved proposals. Open a proposal and click "Create Invoice" to get started.'
              : 'Try adjusting your search or filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInvoices.map((invoice) => {
            const statusConfig = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.draft;
            const isSyncing = syncingId === invoice.id;

            return (
              <div
                key={invoice.id}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  {/* Left: Client info + amount */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold text-shortcut-navy-blue truncate">
                        {invoice.clientName}
                      </h3>
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusConfig.className}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-text-dark-60">
                      <span className="font-semibold text-shortcut-blue text-base">
                        {formatDollars(invoice.amountCents)}
                      </span>
                      <span>
                        {format(new Date(invoice.createdAt), 'MMM d, yyyy')}
                      </span>
                      {invoice.proposalId && (
                        <a
                          href={`/proposals/${invoice.proposalId}`}
                          className="inline-flex items-center gap-1 text-shortcut-blue hover:text-shortcut-teal transition-colors"
                        >
                          <FileText size={14} />
                          View Proposal
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      onClick={() => handleSync(invoice)}
                      variant="secondary"
                      icon={<RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />}
                      disabled={isSyncing}
                    >
                      {isSyncing ? 'Syncing...' : 'Sync'}
                    </Button>
                    <a
                      href={invoice.invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-shortcut-blue text-white text-sm font-semibold hover:bg-shortcut-navy-blue transition-colors"
                    >
                      View Invoice
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InvoiceManager;
