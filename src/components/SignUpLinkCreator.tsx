import React, { useState, useMemo } from 'react';
import { ArrowLeft, Search, CheckCircle, Calendar, MapPin, DollarSign } from 'lucide-react';
import { useProposal } from '../contexts/ProposalContext';
import { useSignUpLinks } from '../contexts/SignUpLinkContext';
import { Proposal } from '../types/proposal';
import CreateEventModal from './CreateEventModal';

interface SignUpLinkCreatorProps {
  onClose: () => void;
  onCreated: () => void;
}

const SignUpLinkCreator: React.FC<SignUpLinkCreatorProps> = ({ onClose, onCreated }) => {
  const { proposals } = useProposal();
  const { createSignUpLink } = useSignUpLinks();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved'>('approved');
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);

  const filteredProposals = useMemo(() => {
    return proposals
      .filter(p => {
        if (!p.data?.clientName) return false;
        const matchesSearch = !searchTerm ||
          p.data.clientName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [proposals, searchTerm, statusFilter]);

  const handleSelectProposal = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setShowEventModal(true);
  };

  const handleEventCreated = async (events: any[]) => {
    if (!selectedProposal) return;

    // Create a sign-up link record for each event created
    for (const evt of events) {
      try {
        await createSignUpLink({
          proposalId: selectedProposal.id,
          proposalClientName: selectedProposal.data.clientName,
          eventDate: evt.date || evt.eventDate || '',
          eventLocation: evt.location || evt.locationName || '',
          eventName: evt.eventName || evt.name || selectedProposal.data.clientName,
          serviceTypes: evt.payload?.serviceOfferings?.map((s: any) => s.serviceTitle) || [],
          coordinatorEventId: evt.coordinatorEventId || null,
          signupUrl: evt.coordinatorEventId
            ? `https://admin.shortcutpros.com/#/signup/${evt.coordinatorEventId}`
            : null,
          eventPayload: evt.payload || null,
        });
      } catch (err) {
        console.error('Failed to create sign-up link record:', err);
      }
    }

    onCreated();
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#09364f] transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign-Up Links
          </button>
          <h1 className="text-3xl font-extrabold text-[#09364f]">New Sign-Up Link</h1>
          <p className="text-sm text-gray-500 mt-1">
            Select a proposal to create a coordinator event and generate a sign-up link
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search proposals by client name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#09364f]"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('approved')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
                statusFilter === 'approved'
                  ? 'bg-[#09364f] text-white'
                  : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
                statusFilter === 'all'
                  ? 'bg-[#09364f] text-white'
                  : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              All
            </button>
          </div>
        </div>

        {/* Proposal List */}
        {filteredProposals.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg font-medium mb-1">No proposals found</p>
            <p className="text-sm">
              {statusFilter === 'approved'
                ? 'No approved proposals yet. Try showing all proposals.'
                : 'Try a different search term.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProposals.map(proposal => (
              <button
                key={proposal.id}
                onClick={() => handleSelectProposal(proposal)}
                className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-[#09364f] hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <h3 className="font-extrabold text-[#09364f] truncate">
                        {proposal.data.clientName}
                      </h3>
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                        proposal.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : proposal.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {proposal.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      {proposal.data.eventDates?.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {proposal.data.eventDates.slice(0, 3).map(d => formatDate(d)).join(', ')}
                          {proposal.data.eventDates.length > 3 && ` +${proposal.data.eventDates.length - 3} more`}
                        </span>
                      )}
                      {proposal.data.locations?.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {proposal.data.locations.join(', ')}
                        </span>
                      )}
                      {proposal.data.summary?.totalEventCost > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {formatCurrency(proposal.data.summary.totalEventCost)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-gray-300 group-hover:text-[#09364f] transition-colors pl-4">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      {selectedProposal && (
        <CreateEventModal
          isOpen={showEventModal}
          onClose={() => {
            setShowEventModal(false);
            setSelectedProposal(null);
          }}
          proposal={selectedProposal}
          proposalId={selectedProposal.id}
          onSuccess={handleEventCreated}
        />
      )}
    </div>
  );
};

export default SignUpLinkCreator;
