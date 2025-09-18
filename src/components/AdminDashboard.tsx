import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock } from 'lucide-react';
import { Button } from './Button';
import { supabase } from '../lib/supabaseClient';
import { ProposalChangeSet } from '../types/proposal';
import AdminChangeDashboard from './AdminChangeDashboard';
import ChangeReviewModal from './ChangeReviewModal';

type TabType = 'pending' | 'approved';

const AdminDashboard: React.FC = () => {
  const [changeSets, setChangeSets] = useState<ProposalChangeSet[]>([]);
  const [tabCounts, setTabCounts] = useState({ pending: 0, approved: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedChangeSet, setSelectedChangeSet] = useState<ProposalChangeSet | null>(null);
  const [showChangeReview, setShowChangeReview] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('pending');

  // Helper functions for formatting
  const getFieldDisplayName = (field: string): string => {
    const fieldMap: { [key: string]: string } = {
      'numPros': 'Number of Professionals',
      'totalHours': 'Total Hours',
      'hourlyRate': 'Hourly Rate',
      'serviceType': 'Service Type',
      'selectedOption': 'Selected Option'
    };
    return fieldMap[field] || field;
  };

  const formatFieldValue = (value: any, field: string): string => {
    if (value === null || value === undefined) return 'None';
    
    if (field === 'hourlyRate') {
      return `$${value}`;
    }
    
    if (field === 'serviceType') {
      const serviceMap: { [key: string]: string } = {
        'hair-makeup': 'Hair + Makeup',
        'headshot-hair-makeup': 'Hair + Makeup for Headshots',
        'headshot': 'Headshot',
        'mindfulness': 'Mindfulness',
        'massage': 'Massage',
        'nails': 'Nails',
        'facials': 'Facials'
      };
      return serviceMap[value] || value;
    }
    
    return String(value);
  };

  // Function to extract only client-relevant changes
  const extractClientChanges = (originalData: any, currentData: any, clientEmail?: string, clientName?: string, proposalId?: string) => {
    const changes = [];
    const timestamp = new Date().toISOString();

    // Check for changes in client-editable fields
    if (originalData?.services && currentData?.services) {
      Object.keys(currentData.services).forEach(location => {
        if (originalData.services[location]) {
          Object.keys(currentData.services[location]).forEach(date => {
            if (originalData.services[location][date]) {
              const originalServices = originalData.services[location][date].services || [];
              const currentServices = currentData.services[location][date].services || [];
              
              // Compare services
              originalServices.forEach((originalService: any, index: number) => {
                const currentService = currentServices[index];
                if (currentService) {
                  // Check key client-editable fields
                  const fieldsToCheck = ['numPros', 'totalHours', 'hourlyRate', 'serviceType', 'selectedOption'];
                  
                  fieldsToCheck.forEach(field => {
                    if (originalService[field] !== currentService[field]) {
                      const fieldDisplayName = getFieldDisplayName(field);
                      changes.push({
                        id: `${proposalId}-${location}-${date}-${index}-${field}`,
                        proposalId: proposalId || '',
                        field: `${location} - ${date} - Service ${index + 1} - ${fieldDisplayName}`,
                        oldValue: formatFieldValue(originalService[field], field),
                        newValue: formatFieldValue(currentService[field], field),
                        changeType: 'update' as const,
                        timestamp,
                        clientEmail,
                        clientName,
                        status: 'pending' as const
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
    }

    // Check for changes in customization fields
    if (originalData?.customization?.customNote !== currentData?.customization?.customNote) {
      changes.push({
        id: `${proposalId}-customNote`,
        proposalId: proposalId || '',
        field: 'Custom Note',
        oldValue: originalData?.customization?.customNote || 'None',
        newValue: currentData?.customization?.customNote || 'None',
        changeType: 'update' as const,
        timestamp,
        clientEmail,
        clientName,
        status: 'pending' as const
      });
    }

    return changes;
  };

  useEffect(() => {
    console.log('🚀 AdminDashboard: Component mounted, fetching change sets...');
    fetchChangeSets();
  }, []);

  useEffect(() => {
    console.log(`🔄 AdminDashboard: Tab changed to ${activeTab}, refetching change sets...`);
    fetchChangeSets();
  }, [activeTab]);

  const fetchChangeSets = async () => {
    try {
      setLoading(true);
      console.log(`🔍 AdminDashboard: Starting to fetch ALL change sets`);
      
      // Always fetch all proposals (both pending and approved)
      const { data: allProposals, error } = await supabase
        .from('proposals')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching proposals:', error);
        alert(`Database error: ${error.message}`);
        throw error;
      }

    console.log(`📊 Raw proposals from database: ${allProposals?.length || 0} total`);

    // Calculate tab counts from all data
    const pendingCount = allProposals?.filter(p => p.pending_review === true).length || 0;
    const approvedCount = allProposals?.filter(p => p.status === 'approved').length || 0;
    
    console.log(`📊 Tab counts - Pending: ${pendingCount}, Approved: ${approvedCount}`);
    
    // Set the tab counts
    setTabCounts({
      pending: pendingCount,
      approved: approvedCount
    });

    // Apply tab-specific filtering for display
    let proposals;
    if (activeTab === 'pending') {
      proposals = allProposals?.filter(p => p.pending_review === true) || [];
      console.log(`📋 Filtered to ${proposals.length} pending proposals`);
    } else if (activeTab === 'approved') {
      proposals = allProposals?.filter(p => p.status === 'approved') || [];
      console.log(`📋 Filtered to ${proposals.length} approved proposals`);
      console.log('✅ Approved proposals details:', proposals.map(p => ({ id: p.id, status: p.status, client_name: p.client_name })));
    } else {
      proposals = allProposals || [];
    }

      if (error) throw error;

      console.log('✅ Proposals with changes (pending or approved):', proposals);
      
      // For pending tab, filter to only show proposals with actual client-relevant changes
      // For approved tab, show all approved proposals regardless of changes
      if (proposals && proposals.length > 0) {
        if (activeTab === 'pending') {
          console.log('🔍 Filtering pending proposals to show only those with client changes...');
          const proposalsWithChanges = [];
          
          for (const proposal of proposals) {
            const clientChanges = extractClientChanges(
              proposal.original_data,
              proposal.data,
              proposal.client_email,
              proposal.client_name,
              proposal.id
            );
            
            if (clientChanges.length > 0) {
              proposalsWithChanges.push(proposal);
              console.log(`✅ Proposal ${proposal.id} has ${clientChanges.length} client changes`);
            } else {
              console.log(`⚠️ Proposal ${proposal.id} has no client-relevant changes`);
            }
          }
          
          proposals = proposalsWithChanges;
          console.log(`📊 Filtered to ${proposals.length} pending proposals with client changes`);
          
          // If no client changes found, show all pending proposals as fallback
          if (proposals.length === 0) {
            console.log('⚠️ No proposals with client changes found, showing all pending proposals...');
            const { data: allPendingProposals, error: allPendingError } = await supabase
              .from('proposals')
              .select('*')
              .eq('pending_review', true)
              .order('updated_at', { ascending: false });
              
            if (allPendingError) {
              console.error('❌ Error fetching all pending proposals:', allPendingError);
            } else {
              proposals = allPendingProposals || [];
              console.log(`📊 Showing all ${proposals.length} pending proposals as fallback`);
            }
          }
        } else if (activeTab === 'approved') {
          console.log(`📊 Showing all ${proposals.length} approved proposals`);
          console.log('✅ Approved proposals before change set creation:', proposals.map(p => ({ id: p.id, status: p.status, client_name: p.client_name, has_original_data: !!p.original_data, has_data: !!p.data })));
        }
      }

      
      // Convert proposals to change sets
      const changeSetsData: ProposalChangeSet[] = await Promise.all((proposals || []).map(async (proposal) => {
        // Extract only client-relevant changes
        const changes = [];
        if (proposal.original_data && proposal.data) {
          // Focus on key client-editable fields
          const clientRelevantChanges = extractClientChanges(
            proposal.original_data,
            proposal.data,
            proposal.client_email,
            proposal.client_name,
            proposal.id
          );
          
          console.log(`🔍 Client changes for proposal ${proposal.id}:`, clientRelevantChanges);
          
          // Add the client-relevant changes
          changes.push(...clientRelevantChanges);
        }
        
        // For approved proposals, always ensure we have at least one change to display
        if (activeTab === 'approved' && changes.length === 0) {
          changes.push({
            id: `${proposal.id}-approved`,
            proposalId: proposal.id,
            field: 'Proposal Status',
            oldValue: 'Draft',
            newValue: 'Approved by Client',
            changeType: 'update' as const,
            timestamp: proposal.updated_at,
            clientEmail: proposal.client_email,
            clientName: proposal.client_name,
            status: 'approved' as const
          });
        }
        
        return {
          id: proposal.id,
          proposalId: proposal.id,
          changes: changes,
          clientEmail: proposal.client_email,
          clientName: proposal.client_name,
          clientComment: proposal.change_comment || '',
          status: proposal.status === 'approved' ? 'approved' as const : 
                  proposal.status === 'rejected' ? 'rejected' as const : 'pending' as const,
          submittedAt: proposal.updated_at,
          reviewedBy: proposal.reviewed_by,
          reviewedAt: proposal.reviewed_at,
          adminComment: proposal.admin_comment
        };
      }));

      console.log('📊 Final change sets:', changeSetsData);
      console.log(`📊 Total change sets created: ${changeSetsData.length}`);
      console.log(`📊 Change sets by status:`, {
        pending: changeSetsData.filter(cs => cs.status === 'pending' || !cs.status).length,
        approved: changeSetsData.filter(cs => cs.status === 'approved').length
      });
      
      // Set the filtered change sets for display
      setChangeSets(changeSetsData);
    } catch (error) {
      console.error('Error fetching change sets:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleViewDetails = (changeSet: ProposalChangeSet) => {
    console.log('Viewing details for changeSet:', changeSet);
    console.log('ProposalId:', changeSet.proposalId);
    setSelectedChangeSet(changeSet);
    setShowChangeReview(true);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-2">
                Review and manage {activeTab} client changes to proposals
              </p>
            </div>
            <Button
              onClick={() => fetchChangeSets()}
              variant="secondary"
              className="flex items-center space-x-2"
            >
              <span>Refresh</span>
            </Button>
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
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                    activeTab === tab.key
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>


        {/* Content based on active tab */}
        {(() => {
            const filteredChangeSets = changeSets.filter(cs => {
              if (activeTab === 'pending') {
                return cs.status === 'pending' || !cs.status;
              } else if (activeTab === 'approved') {
                return cs.status === 'approved';
              }
              return true;
            });

            if (loading) {
              return (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Loading {activeTab} changes...</span>
                </div>
              );
            }

            if (filteredChangeSets.length === 0) {
              return (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    {activeTab === 'pending' && <Clock size={48} className="mx-auto" />}
                    {activeTab === 'approved' && <CheckCircle size={48} className="mx-auto" />}
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No {activeTab} changes found
                  </h3>
                  <p className="text-gray-500">
                    {activeTab === 'pending' && "There are no pending changes to review at this time."}
                    {activeTab === 'approved' && "There are no approved proposals to view at this time."}
                  </p>
                </div>
              );
            }

            return (
              <AdminChangeDashboard
                changeSets={filteredChangeSets}
                onViewDetails={handleViewDetails}
                isLoading={false}
                totalCounts={tabCounts as { pending: number; approved: number }}
              />
            );
          })()}

        {/* Change Review Modal */}
        <ChangeReviewModal
          isOpen={showChangeReview}
          onClose={() => setShowChangeReview(false)}
          changeSet={selectedChangeSet}
          proposalId={selectedChangeSet?.proposalId}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;
