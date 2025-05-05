import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { FileText, Trash2, Eye, Search, Calendar, DollarSign, Share2, CheckCircle2, XCircle as XCircle2, Clock, Lock, Copy, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProposal } from '../contexts/ProposalContext';
import { Button } from './Button';
import { getProposalUrl } from '../utils/url';

interface FilterOptions {
  startDate: string;
  endDate: string;
  minCost: string;
  maxCost: string;
  location: string;
  status: string;
}

const History: React.FC = () => {
  const navigate = useNavigate();
  const { proposals, deleteProposal } = useProposal();
  const [sortBy, setSortBy] = useState('date-desc');
  const [filters, setFilters] = useState<FilterOptions>({
    startDate: '',
    endDate: '',
    minCost: '',
    maxCost: '',
    location: '',
    status: ''
  });
  const [locations, setLocations] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const uniqueLocations = new Set<string>();
    proposals.forEach(proposal => {
      Object.keys(proposal.data.services || {}).forEach(location => {
        uniqueLocations.add(location);
      });
    });
    setLocations(Array.from(uniqueLocations).sort());
  }, [proposals]);

  const calculateTotalCost = (proposal: any) => {
    return proposal.data.summary?.totalEventCost || 0;
  };

  const calculateTotalEvents = (proposal: any) => {
    let total = 0;
    Object.values(proposal.data.services || {}).forEach((locationData: any) => {
      Object.values(locationData).forEach((dateData: any) => {
        total += dateData.services.length;
      });
    });
    return total;
  };

  const getShareableLink = (id: string) => {
    return getProposalUrl(id, true);
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getStatusBadge = (status: string, hasChanges: boolean, pendingReview: boolean) => {
    if (status === 'approved') {
      return (
        <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-sm">
          <CheckCircle2 size={14} />
          Approved
        </span>
      );
    }
    
    if (hasChanges && pendingReview) {
      return (
        <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-full text-sm">
          <Clock size={14} />
          Changes Submitted
        </span>
      );
    }
    
    if (status === 'rejected') {
      return (
        <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full text-sm">
          <XCircle2 size={14} />
          Rejected
        </span>
      );
    }

    return (
      <span className="flex items-center gap-1 text-gray-600 bg-gray-50 px-2 py-1 rounded-full text-sm">
        <FileText size={14} />
        Draft
      </span>
    );
  };

  const filterProposals = () => {
    return proposals.filter(proposal => {
      const proposalDate = new Date(proposal.createdAt);
      const totalCost = calculateTotalCost(proposal);
      const proposalLocations = Object.keys(proposal.data.services || {});

      if (filters.startDate && proposalDate < new Date(filters.startDate)) return false;
      if (filters.endDate && proposalDate > new Date(filters.endDate)) return false;
      if (filters.minCost && totalCost < parseFloat(filters.minCost)) return false;
      if (filters.maxCost && totalCost > parseFloat(filters.maxCost)) return false;
      if (filters.location && !proposalLocations.includes(filters.location)) return false;
      if (filters.status && proposal.status !== filters.status) return false;

      return true;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'date-asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name-asc':
          return a.data.clientName.localeCompare(b.data.clientName);
        case 'name-desc':
          return b.data.clientName.localeCompare(a.data.clientName);
        case 'cost-desc':
          return calculateTotalCost(b) - calculateTotalCost(a);
        case 'cost-asc':
          return calculateTotalCost(a) - calculateTotalCost(b);
        case 'events-desc':
          return calculateTotalEvents(b) - calculateTotalEvents(a);
        case 'events-asc':
          return calculateTotalEvents(a) - calculateTotalEvents(b);
        default:
          return 0;
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this proposal? This action cannot be undone.')) {
      setIsDeleting(id);
      try {
        await deleteProposal(id);
      } catch (error) {
        console.error('Failed to delete proposal:', error);
        alert('Failed to delete proposal. Please try again.');
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      minCost: '',
      maxCost: '',
      location: '',
      status: ''
    });
  };

  const filteredProposals = filterProposals();

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-8 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-2xl font-semibold text-shortcut-blue">Calculation History</h2>
          <Button
            onClick={() => navigate('/')}
            variant="primary"
          >
            New Calculation
          </Button>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 sm:p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#175071]"
              >
                <option value="date-desc">Date (Newest First)</option>
                <option value="date-asc">Date (Oldest First)</option>
                <option value="name-asc">Client Name (A-Z)</option>
                <option value="name-desc">Client Name (Z-A)</option>
                <option value="cost-desc">Total Cost (High-Low)</option>
                <option value="cost-asc">Total Cost (Low-High)</option>
                <option value="events-desc">Events (Most-Least)</option>
                <option value="events-asc">Events (Least-Most)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#175071]"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <select
                value={filters.location}
                onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#175071]"
              >
                <option value="">All Locations</option>
                {locations.map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#175071]"
                />
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#175071]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cost Range
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minCost}
                  onChange={(e) => setFilters(prev => ({ ...prev, minCost: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#175071]"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxCost}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxCost: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#175071]"
                />
              </div>
            </div>
          </div>

          {(filters.startDate || filters.endDate || filters.minCost || filters.maxCost || filters.location || filters.status) && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-gray-600">Active Filters:</span>
              <button
                onClick={clearFilters}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {filteredProposals.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No calculations found</h3>
            <p className="mt-2 text-sm text-gray-500">
              {Object.values(filters).some(Boolean)
                ? 'Try adjusting your filters or create a new calculation'
                : 'Your saved calculations will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredProposals.map((proposal) => {
              const totalCost = calculateTotalCost(proposal);
              const totalEvents = calculateTotalEvents(proposal);
              const locations = Object.keys(proposal.data.services || {});
              const shareableLink = getShareableLink(proposal.id);

              return (
                <div key={proposal.id} className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="space-y-1">
                      <h3 className="text-xl font-semibold text-[#175071]">
                        {proposal.data.clientName}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Created {format(parseISO(proposal.createdAt), 'MMM d, yyyy h:mm a')}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {getStatusBadge(proposal.status, proposal.hasChanges, proposal.pendingReview)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => navigate(`/proposal/${proposal.id}`)}
                        variant="primary"
                        icon={<Eye size={20} />}
                      >
                        View
                      </Button>
                      <Button
                        onClick={() => copyToClipboard(shareableLink, proposal.id)}
                        variant="secondary"
                        icon={copiedId === proposal.id ? <CheckCircle2 size={20} /> : <Share2 size={20} />}
                      >
                        {copiedId === proposal.id ? 'Copied!' : 'Share'}
                      </Button>
                      <Button
                        onClick={() => handleDelete(proposal.id)}
                        variant="secondary"
                        icon={<Trash2 size={20} />}
                        disabled={isDeleting === proposal.id}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {proposal.data.eventDates?.length || 0} {proposal.data.eventDates?.length === 1 ? 'Date' : 'Dates'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {totalEvents} {totalEvents === 1 ? 'Event' : 'Events'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-sm text-gray-600">
                      Locations: {locations.join(', ')}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <p className="text-sm text-gray-600 truncate">
                        Share Link: <span className="font-mono text-xs">{shareableLink}</span>
                      </p>
                      <button
                        onClick={() => copyToClipboard(shareableLink, `${proposal.id}-link`)}
                        className="p-1 text-gray-500 hover:text-gray-700"
                        title={copiedId === `${proposal.id}-link` ? 'Copied!' : 'Copy Link'}
                      >
                        {copiedId === `${proposal.id}-link` ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;