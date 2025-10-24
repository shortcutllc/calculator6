import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHolidayPage } from '../contexts/HolidayPageContext';
import { HolidayPage } from '../types/holidayPage';
import { Button } from './Button';
import HolidayPageCreator from './HolidayPageCreator';
import { Link, CheckCircle, MessageSquare, Eye, EyeOff, Search, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface ContactRequest {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  service_type?: string;
  event_date?: string;
  appointment_count?: string;
  message?: string;
  status: 'new' | 'contacted' | 'followed_up' | 'closed';
  created_at: string;
}

const HolidayPageManager: React.FC = () => {
  const navigate = useNavigate();
  const { holidayPages, loading, deleteHolidayPage } = useHolidayPage();
  const [showCreator, setShowCreator] = useState(false);
  const [editingPage, setEditingPage] = useState<HolidayPage | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedLinks, setCopiedLinks] = useState<Set<string>>(new Set());
  const [contactRequests, setContactRequests] = useState<Record<string, ContactRequest[]>>({});
  const [showContactRequests, setShowContactRequests] = useState<Record<string, boolean>>({});
  const [loadingRequests, setLoadingRequests] = useState<Set<string>>(new Set());
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');

  const fetchContactRequests = async (holidayPageId: string) => {
    if (contactRequests[holidayPageId]) return; // Already loaded
    
    setLoadingRequests(prev => new Set(prev).add(holidayPageId));
    try {
      const { data, error } = await supabase
        .from('contact_requests')
        .select('*')
        .eq('holiday_page_id', holidayPageId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching contact requests:', error);
        return;
      }

      setContactRequests(prev => ({
        ...prev,
        [holidayPageId]: data || []
      }));
    } catch (error) {
      console.error('Error fetching contact requests:', error);
    } finally {
      setLoadingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(holidayPageId);
        return newSet;
      });
    }
  };

  const toggleContactRequests = (holidayPageId: string) => {
    setShowContactRequests(prev => ({
      ...prev,
      [holidayPageId]: !prev[holidayPageId]
    }));
    
    if (!showContactRequests[holidayPageId]) {
      fetchContactRequests(holidayPageId);
    }
  };

  const updateContactRequestStatus = async (requestId: string, newStatus: ContactRequest['status']) => {
    try {
      const { error } = await supabase
        .from('contact_requests')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (error) {
        console.error('Error updating contact request status:', error);
        return;
      }

      // Update local state
      setContactRequests(prev => {
        const newState = { ...prev };
        Object.keys(newState).forEach(holidayPageId => {
          newState[holidayPageId] = newState[holidayPageId].map(req => 
            req.id === requestId ? { ...req, status: newStatus } : req
          );
        });
        return newState;
      });
    } catch (error) {
      console.error('Error updating contact request status:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this holiday page?')) {
      return;
    }

    try {
      setDeletingId(id);
      await deleteHolidayPage(id);
      console.log('✅ Holiday page deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting holiday page:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete holiday page';
      alert(`Failed to delete holiday page: ${errorMessage}`);
    } finally {
      setDeletingId(null);
    }
  };

  const copyHolidayPageLink = async (holidayPage: HolidayPage) => {
    try {
      const holidayPageUrl = `${window.location.origin}/holiday-page/${holidayPage.uniqueToken}`;
      await navigator.clipboard.writeText(holidayPageUrl);
      setCopiedLinks(prev => new Set(prev).add(holidayPage.id));
      setTimeout(() => {
        setCopiedLinks(prev => {
          const newSet = new Set(prev);
          newSet.delete(holidayPage.id);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      alert('Failed to copy link. Please try again.');
    }
  };

  const handleView = (holidayPage: HolidayPage) => {
    // Open in new tab using unique token
    window.open(`/holiday-page/${holidayPage.uniqueToken}`, '_blank');
  };

  const handleEdit = (holidayPage: HolidayPage) => {
    console.log('🔧 Edit button clicked for holiday page:', holidayPage);
    console.log('🔧 Holiday page data:', holidayPage.data);
    console.log('🔧 Partner logo URL:', holidayPage.data?.partnerLogoUrl);
    setEditingPage(holidayPage);
    setShowCreator(true);
  };
  
  const handleCloseCreator = () => {
    setShowCreator(false);
    setEditingPage(null);
  };

  // Filter and sort holiday pages
  const filteredAndSortedPages = useMemo(() => {
    let filtered = holidayPages;

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(page => 
        page.data.partnerName?.toLowerCase().includes(search) ||
        page.data.clientEmail?.toLowerCase().includes(search) ||
        page.uniqueToken?.toLowerCase().includes(search)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(page => page.status === statusFilter);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name':
          return (a.data.partnerName || '').localeCompare(b.data.partnerName || '');
        default:
          return 0;
      }
    });

    return sorted;
  }, [holidayPages, searchTerm, statusFilter, sortBy]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSortBy('newest');
  };

  const hasActiveFilters = searchTerm.trim() !== '' || statusFilter !== 'all' || sortBy !== 'newest';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading holiday pages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Holiday Pages</h1>
          <p className="text-gray-600 mt-2">Manage your customizable holiday proposal pages</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={async () => {
              const url = `${window.location.origin}/holiday-generic`;
              await navigator.clipboard.writeText(url);
              alert('Generic page link copied to clipboard!');
            }}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
            title="Copy generic holiday page link"
          >
            <Link className="w-4 h-4 mr-2" />
            Copy Generic Link
          </button>
          <Button 
            variant="secondary"
            onClick={() => window.open('/holiday-generic', '_blank')}
          >
            View Generic Page
          </Button>
          <Button onClick={() => setShowCreator(true)}>
            Create Holiday Page
          </Button>
        </div>
      </div>

      {/* Filters Section */}
      {holidayPages.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by partner name, email, or token..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'name')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Partner Name (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Active Filters Display & Clear Button */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Showing {filteredAndSortedPages.length} of {holidayPages.length} pages
              </div>
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4 mr-1" />
                Clear Filters
              </button>
            </div>
          )}
        </div>
      )}

      {holidayPages.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🎄</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Holiday Pages Yet</h3>
          <p className="text-gray-600 mb-6">Create your first customizable holiday page for a partner</p>
          <Button onClick={() => setShowCreator(true)}>
            Create Your First Holiday Page
          </Button>
        </div>
      ) : filteredAndSortedPages.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <div className="text-gray-400 text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Pages Found</h3>
          <p className="text-gray-600 mb-6">Try adjusting your filters to see more results</p>
          <button
            onClick={clearFilters}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            <X className="w-4 h-4 mr-2" />
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedPages.map((holidayPage) => (
            <div key={holidayPage.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {holidayPage.data.partnerLogoUrl && (
                    <img 
                      src={holidayPage.data.partnerLogoUrl} 
                      alt={holidayPage.data.partnerName}
                      className="h-8 w-auto"
                    />
                  )}
                  <h3 className="text-lg font-semibold text-gray-900">
                    {holidayPage.data.partnerName}
                  </h3>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  holidayPage.status === 'published' 
                    ? 'bg-green-100 text-green-800'
                    : holidayPage.status === 'draft'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {holidayPage.status}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Created:</span> {new Date(holidayPage.createdAt).toLocaleDateString()}
                </p>
                {holidayPage.data.clientEmail && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Client:</span> {holidayPage.data.clientEmail}
                  </p>
                )}
                
                {/* Contact Requests Section */}
                <div className="border-t pt-3 mt-3">
                  <button
                    onClick={() => toggleContactRequests(holidayPage.id)}
                    className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Contact Requests
                    {contactRequests[holidayPage.id] && (
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        {contactRequests[holidayPage.id].length}
                      </span>
                    )}
                    {showContactRequests[holidayPage.id] ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                  
                  {showContactRequests[holidayPage.id] && (
                    <div className="mt-3 space-y-3 max-h-64 overflow-y-auto">
                      {loadingRequests.has(holidayPage.id) ? (
                        <div className="text-center py-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
                          <p className="text-xs text-gray-500 mt-1">Loading...</p>
                        </div>
                      ) : contactRequests[holidayPage.id]?.length > 0 ? (
                        contactRequests[holidayPage.id].map((request) => (
                          <div key={request.id} className="bg-gray-50 rounded-lg p-3 text-xs">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {request.first_name} {request.last_name}
                                </p>
                                <p className="text-gray-600">{request.email}</p>
                                {request.phone && (
                                  <p className="text-gray-600">{request.phone}</p>
                                )}
                              </div>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                request.status === 'new' 
                                  ? 'bg-red-100 text-red-800'
                                  : request.status === 'contacted'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : request.status === 'followed_up'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {request.status.replace('_', ' ')}
                              </span>
                            </div>
                            
                            {request.service_type && (
                              <p className="text-gray-700 mb-1">
                                <span className="font-medium">Service:</span> {request.service_type}
                              </p>
                            )}
                            {request.appointment_count && (
                              <p className="text-gray-700 mb-1">
                                <span className="font-medium">Appointments:</span> {request.appointment_count}
                              </p>
                            )}
                            {request.event_date && (
                              <p className="text-gray-700 mb-1">
                                <span className="font-medium">Event Date:</span> {new Date(request.event_date).toLocaleDateString()}
                              </p>
                            )}
                            {request.message && (
                              <p className="text-gray-700 mb-2">
                                <span className="font-medium">Message:</span> {request.message}
                              </p>
                            )}
                            
                            <div className="flex gap-1 flex-wrap">
                              {request.status === 'new' && (
                                <button
                                  onClick={() => updateContactRequestStatus(request.id, 'contacted')}
                                  className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded hover:bg-yellow-200 transition-colors"
                                >
                                  Mark Contacted
                                </button>
                              )}
                              {request.status === 'contacted' && (
                                <button
                                  onClick={() => updateContactRequestStatus(request.id, 'followed_up')}
                                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded hover:bg-blue-200 transition-colors"
                                >
                                  Mark Followed Up
                                </button>
                              )}
                              <button
                                onClick={() => updateContactRequestStatus(request.id, 'closed')}
                                className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded hover:bg-gray-200 transition-colors"
                              >
                                Close
                              </button>
                            </div>
                            
                            <p className="text-gray-500 text-xs mt-1">
                              {new Date(request.created_at).toLocaleString()}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-center py-2">No contact requests yet</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleView(holidayPage)}
                >
                  View
                </Button>
                <button
                  onClick={() => copyHolidayPageLink(holidayPage)}
                  className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    copiedLinks.has(holidayPage.id)
                      ? 'text-green-700 bg-green-100'
                      : 'text-blue-700 bg-blue-100 hover:bg-blue-200'
                  }`}
                  title="Copy holiday page link"
                >
                  {copiedLinks.has(holidayPage.id) ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Link className="w-3 h-3 mr-1" />
                      Copy Link
                    </>
                  )}
                </button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleEdit(holidayPage)}
                >
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDelete(holidayPage.id)}
                  disabled={deletingId === holidayPage.id}
                >
                  {deletingId === holidayPage.id ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreator && (
        <>
          {console.log('🎭 Rendering HolidayPageCreator modal with editingPage:', editingPage)}
          <HolidayPageCreator onClose={handleCloseCreator} editingPage={editingPage} />
        </>
      )}
    </div>
  );
};

export default HolidayPageManager;
