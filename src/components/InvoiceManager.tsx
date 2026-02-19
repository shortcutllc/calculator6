import React, { useState, useMemo } from 'react';
import { useInvoice } from '../contexts/InvoiceContext';
import { useProposal } from '../contexts/ProposalContext';
import { StripeInvoice, StripeInvoiceStatus } from '../types/stripeInvoice';
import { LoadingSpinner } from './LoadingSpinner';
import { Search, ExternalLink, RefreshCw, Receipt, FileText, Plus, Link, FileEdit } from 'lucide-react';
import { Button } from './Button';
import { format } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import { InvoiceConfirmationModal, InvoiceLineItem } from './InvoiceConfirmationModal';
import { generateLineItems } from './StripeInvoiceButton';

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
  const { proposals } = useProposal();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Create invoice modal state
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showProposalPicker, setShowProposalPicker] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [proposalSearch, setProposalSearch] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [modalInitialName, setModalInitialName] = useState('');
  const [modalInitialEmail, setModalInitialEmail] = useState('');
  const [modalInitialItems, setModalInitialItems] = useState<InvoiceLineItem[]>([]);
  const [modalProposalId, setModalProposalId] = useState<string | undefined>(undefined);

  const filteredInvoices = useMemo(() => {
    let filtered = invoices;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(inv =>
        inv.clientName.toLowerCase().includes(term) ||
        inv.stripeInvoiceId.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(inv => inv.status === statusFilter);
    }

    filtered = [...filtered].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [invoices, searchTerm, statusFilter, sortBy]);

  const filteredProposals = useMemo(() => {
    if (!proposalSearch.trim()) return proposals.slice(0, 20);
    const term = proposalSearch.toLowerCase();
    return proposals.filter(p =>
      p.data.clientName?.toLowerCase().includes(term)
    ).slice(0, 20);
  }, [proposals, proposalSearch]);

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

  const handleCreateFresh = () => {
    setModalInitialName('');
    setModalInitialEmail('');
    setModalInitialItems([]);
    setModalProposalId(undefined);
    setCreateError(null);
    setShowCreateMenu(false);
    setShowCreateModal(true);
  };

  const handleCreateFromProposal = () => {
    setShowCreateMenu(false);
    setProposalSearch('');
    setShowProposalPicker(true);
  };

  const handleSelectProposal = async (proposalId: string) => {
    const proposal = proposals.find(p => p.id === proposalId);
    if (!proposal) return;

    // Fetch full proposal data including pricing options
    try {
      const { data: fullProposal } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', proposalId)
        .single();

      const proposalData = fullProposal?.data || proposal.data;
      const pricingOptions = fullProposal?.pricing_options || null;
      const selectedOptions = fullProposal?.selected_options || null;

      const items = generateLineItems(proposalData, pricingOptions, selectedOptions);

      setModalInitialName(proposalData.clientName || '');
      setModalInitialEmail(fullProposal?.client_email || '');
      setModalInitialItems(items);
      setModalProposalId(proposalId);
      setCreateError(null);
      setShowProposalPicker(false);
      setShowCreateModal(true);
    } catch {
      setModalInitialName(proposal.data.clientName || '');
      setModalInitialEmail('');
      setModalInitialItems([]);
      setModalProposalId(proposalId);
      setCreateError(null);
      setShowProposalPicker(false);
      setShowCreateModal(true);
    }
  };

  const handleSendInvoice = async (data: {
    clientName: string;
    clientEmail: string;
    lineItems: InvoiceLineItem[];
    daysUntilDue: number;
    proposalId?: string;
  }) => {
    try {
      setCreateLoading(true);
      setCreateError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch('/.netlify/functions/create-stripe-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          proposalId: data.proposalId || null,
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

      setShowCreateModal(false);
      await fetchInvoices();
      window.open(result.invoiceUrl, '_blank');
    } catch (err) {
      console.error('Error creating invoice:', err);
      setCreateError(err instanceof Error ? err.message : 'Failed to create invoice');
    } finally {
      setCreateLoading(false);
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
            <Receipt className="text-[#635BFF]" size={28} />
            Invoices
            {invoices.length > 0 && (
              <span className="text-base font-medium bg-[#635BFF]/10 text-[#635BFF] px-3 py-1 rounded-full">
                {invoices.length}
              </span>
            )}
          </h1>
          <p className="text-text-dark-60 mt-1">Manage Stripe invoices for proposals and custom billing</p>
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
          <div className="relative">
            <button
              onClick={() => setShowCreateMenu(!showCreateMenu)}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#635BFF] hover:bg-[#4B45C6] text-white font-bold rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#635BFF] focus:ring-offset-2"
            >
              <Plus size={18} />
              Create Invoice
            </button>
            {showCreateMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <button
                  onClick={handleCreateFromProposal}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <Link size={16} className="text-[#635BFF]" />
                  From Existing Proposal
                </button>
                <button
                  onClick={handleCreateFresh}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <FileEdit size={16} className="text-[#635BFF]" />
                  Fresh Invoice
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Proposal Picker Modal */}
      {showProposalPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Select a Proposal</h2>
              <div className="relative mt-3">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by client name..."
                  value={proposalSearch}
                  onChange={(e) => setProposalSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#635BFF] focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filteredProposals.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-8">No proposals found</p>
              ) : (
                filteredProposals.map(proposal => (
                  <button
                    key={proposal.id}
                    onClick={() => handleSelectProposal(proposal.id)}
                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{proposal.data.clientName}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(proposal.createdAt), 'MMM d, yyyy')}
                        {proposal.status === 'approved' && (
                          <span className="ml-2 text-green-600 font-semibold">Approved</span>
                        )}
                      </p>
                    </div>
                    <FileText size={16} className="text-gray-400" />
                  </button>
                ))
              )}
            </div>
            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <Button
                onClick={() => setShowProposalPicker(false)}
                variant="secondary"
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice Confirmation Modal */}
      <InvoiceConfirmationModal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setCreateError(null); }}
        onSend={handleSendInvoice}
        initialName={modalInitialName}
        initialEmail={modalInitialEmail}
        initialItems={modalInitialItems}
        proposalId={modalProposalId}
        loading={createLoading}
        error={createError}
      />

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
          <p className="text-text-dark-60 max-w-md mx-auto mb-4">
            {invoices.length === 0
              ? 'Create an invoice from a proposal or start a fresh one using the button above.'
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
                          href={`/proposal/${invoice.proposalId}`}
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
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#635BFF] text-white text-sm font-semibold hover:bg-[#4B45C6] transition-colors"
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
