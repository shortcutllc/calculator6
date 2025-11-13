import React, { useState, useMemo, useEffect } from 'react';
import { CheckCircle, Clock, Search, Filter, Calendar, DollarSign, User, MapPin, Eye, RefreshCw, AlertCircle, FileText } from 'lucide-react';
import { Button } from './Button';
import { useProposal } from '../contexts/ProposalContext';
import { Proposal } from '../types/proposal';
import ChangeReviewModal from './ChangeReviewModal';
import { format, parseISO } from 'date-fns';
import { supabase } from '../lib/supabaseClient';

type TabType = 'pending' | 'approved';

const AdminDashboard: React.FC = () => {
  const { proposals, loading, fetchProposals } = useProposal();
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [showChangeReview, setShowChangeReview] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [surveyResponses, setSurveyResponses] = useState<Record<string, any>>({});

  // Calculate tab counts
  const tabCounts = useMemo(() => {
    const pending = proposals.filter(p => p.status !== 'approved' && (p.pendingReview === true || p.hasChanges === true)).length;
    const approved = proposals.filter(p => p.status === 'approved').length;
    return { pending, approved };
  }, [proposals]);

  // Filter and search proposals
  const filteredProposals = useMemo(() => {
    return proposals.filter(proposal => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        proposal.data.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proposal.data.clientEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proposal.data.officeLocation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proposal.data.locations?.some(loc => loc.toLowerCase().includes(searchTerm.toLowerCase()));

      // Status filter
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending') {
          matchesStatus = proposal.status !== 'approved' && (proposal.pendingReview === true || proposal.hasChanges === true);
        } else if (statusFilter === 'approved') {
          matchesStatus = proposal.status === 'approved';
        }
      }

      // Date filter
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const proposalDate = new Date(proposal.createdAt);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        switch (dateFilter) {
          case 'today':
            matchesDate = proposalDate >= today;
            break;
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = proposalDate >= weekAgo;
            break;
          case 'month':
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchesDate = proposalDate >= monthAgo;
            break;
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [proposals, searchTerm, statusFilter, dateFilter]);

  // Get proposals for current tab
  const currentTabProposals = useMemo(() => {
    if (activeTab === 'pending') {
      // Show proposals that are pending or have changes submitted (not approved)
      return filteredProposals.filter(p => p.status !== 'approved' && (p.pendingReview === true || p.hasChanges === true));
    } else if (activeTab === 'approved') {
      return filteredProposals.filter(p => p.status === 'approved');
    }
    return filteredProposals;
  }, [filteredProposals, activeTab]);

  const calculateTotalCost = (proposal: Proposal) => {
    return proposal.data.summary?.totalEventCost || 0;
  };

  const handleViewDetails = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setShowChangeReview(true);
  };

  const handleRefresh = () => {
    fetchProposals();
    fetchSurveyResponses();
  };

  // Fetch survey responses for approved proposals
  const fetchSurveyResponses = async () => {
    const approvedProposalIds = proposals
      .filter(p => p.status === 'approved')
      .map(p => p.id);

    if (approvedProposalIds.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('proposal_survey_responses')
        .select('*')
        .in('proposal_id', approvedProposalIds);

      if (error) {
        console.error('Error fetching survey responses:', error);
        return;
      }

      const responsesMap: Record<string, any> = {};
      data?.forEach((response) => {
        responsesMap[response.proposal_id] = response;
      });

      setSurveyResponses(responsesMap);
    } catch (err) {
      console.error('Error fetching survey responses:', err);
    }
  };

  useEffect(() => {
    if (proposals.length > 0) {
      fetchSurveyResponses();
    }
  }, [proposals]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-light-gray flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-text-dark-60">Loading proposals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-light-gray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="h1">Admin Dashboard</h1>
              <p className="text-text-dark-60 mt-2">
                Review and manage {activeTab} proposals
              </p>
            </div>
            <Button
              onClick={handleRefresh}
              variant="secondary"
              className="flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="mb-6 card-medium">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Bar */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-dark-60 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by client name, email, event name, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-text-dark-60" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
              </select>
            </div>
          </div>

          {/* Date Filter */}
          <div className="mt-4 flex items-center space-x-4">
            <Calendar className="w-4 h-4 text-text-dark-60" />
            <div className="flex space-x-2">
              {[
                { key: 'all', label: 'All Time' },
                { key: 'today', label: 'Today' },
                { key: 'week', label: 'This Week' },
                { key: 'month', label: 'This Month' }
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setDateFilter(filter.key as typeof dateFilter)}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    dateFilter === filter.key
                      ? 'bg-shortcut-teal bg-opacity-20 text-shortcut-blue border border-shortcut-teal'
                      : 'bg-neutral-light-gray text-text-dark hover:bg-neutral-gray'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'pending', label: 'Pending', count: tabCounts.pending },
                { key: 'approved', label: 'Approved', count: tabCounts.approved }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as TabType)}
                  className={`py-2 px-1 border-b-2 font-bold text-sm ${
                    activeTab === tab.key
                      ? 'border-shortcut-teal text-shortcut-blue'
                      : 'border-transparent text-text-dark-60 hover:text-shortcut-blue hover:border-shortcut-teal'
                  }`}
                >
                  {tab.label}
                  <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                    activeTab === tab.key
                      ? 'bg-shortcut-teal bg-opacity-20 text-shortcut-blue'
                      : 'bg-neutral-light-gray text-text-dark'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Proposals List */}
        <div className="card-large">
          {currentTabProposals.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-text-dark-60 mb-4">
                {activeTab === 'pending' ? (
                  <Clock className="w-12 h-12 mx-auto" />
                ) : (
                  <CheckCircle className="w-12 h-12 mx-auto" />
                )}
              </div>
              <h3 className="text-lg font-extrabold text-shortcut-blue mb-2">
                No {activeTab} proposals found
              </h3>
              <p className="text-text-dark-60">
                {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : `No proposals are currently ${activeTab}`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {currentTabProposals.map((proposal) => (
                <div key={proposal.id} className="card-medium">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-extrabold text-shortcut-blue">
                          {proposal.data.clientName || 'Unnamed Client'}
                        </h3>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          proposal.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : proposal.hasChanges
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {proposal.status === 'approved' 
                            ? 'Approved' 
                            : proposal.hasChanges 
                            ? 'Changes Submitted' 
                            : 'Pending'
                          }
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-text-dark">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-text-dark-60" />
                          <span>{format(parseISO(proposal.createdAt), 'MMM d, yyyy')}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <DollarSign className="w-4 h-4 text-text-dark-60" />
                          <span>${calculateTotalCost(proposal).toLocaleString()}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-text-dark-60" />
                          <span>{proposal.data.officeLocation || proposal.data.locations?.[0] || 'No location'}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-text-dark-60" />
                          <span>{proposal.data.clientEmail || 'No email'}</span>
                        </div>
                      </div>

                      {proposal.data.eventDates && proposal.data.eventDates.length > 0 && (
                        <div className="mt-2 text-sm text-text-dark-60">
                          Event Dates: {proposal.data.eventDates.join(', ')}
                        </div>
                      )}

                      {/* Show survey response indicator for approved proposals */}
                      {proposal.status === 'approved' && surveyResponses[proposal.id] && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <FileText className="w-4 h-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-800">Survey Completed</span>
                              <span className="text-xs text-blue-600">
                                ({format(parseISO(surveyResponses[proposal.id].submitted_at), 'MMM d, yyyy')})
                              </span>
                            </div>
                            <Button
                              onClick={() => handleViewDetails(proposal)}
                              variant="secondary"
                              size="sm"
                              className="text-xs"
                            >
                              View Full Survey
                            </Button>
                          </div>
                          <div className="text-sm text-blue-700 space-y-1">
                            {surveyResponses[proposal.id].table_or_chair_preference && (
                              <div><strong>Preference:</strong> {surveyResponses[proposal.id].table_or_chair_preference}</div>
                            )}
                            {surveyResponses[proposal.id].office_address && (
                              <div><strong>Address:</strong> {surveyResponses[proposal.id].office_address.substring(0, 50)}...</div>
                            )}
                            {surveyResponses[proposal.id].coi_required !== null && (
                              <div><strong>COI Required:</strong> {surveyResponses[proposal.id].coi_required ? 'Yes' : 'No'}</div>
                            )}
                          </div>
                        </div>
                      )}
                      {proposal.status === 'approved' && !surveyResponses[proposal.id] && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <AlertCircle className="w-4 h-4 text-yellow-600" />
                            <span className="text-sm font-medium text-yellow-800">Survey Not Yet Completed</span>
                          </div>
                        </div>
                      )}

                      {/* Show change details if there are changes */}
                      {proposal.hasChanges && proposal.originalData && (
                        <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <AlertCircle className="w-4 h-4 text-orange-600" />
                            <span className="text-sm font-medium text-orange-800">Changes Submitted</span>
                          </div>
                          <div className="text-sm text-orange-700">
                            {proposal.changeSource === 'client' ? 'Client has submitted changes for review' : 'Staff has made changes'}
                            {proposal.clientComment && (
                              <div className="mt-2 p-2 bg-white rounded border">
                                <strong>Client Comment:</strong> {proposal.clientComment}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="ml-4">
                      <Button
                        onClick={() => handleViewDetails(proposal)}
                        variant="secondary"
                        className="flex items-center space-x-2"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View Details</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Change Review Modal */}
        {showChangeReview && selectedProposal && (
          <ChangeReviewModal
            isOpen={showChangeReview}
            onClose={() => {
              setShowChangeReview(false);
              setSelectedProposal(null);
            }}
            proposalId={selectedProposal.id}
            proposalData={selectedProposal}
            surveyResponse={surveyResponses[selectedProposal.id] || null}
          />
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;