import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGenericLandingPage } from '../contexts/GenericLandingPageContext';
import { GenericLandingPage } from '../types/genericLandingPage';
import { Button } from './Button';
import GenericLandingPageCreator from './GenericLandingPageCreator';
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

const GenericLandingPageManager: React.FC = () => {
  const navigate = useNavigate();
  const { genericLandingPages, loading, deleteGenericLandingPage } = useGenericLandingPage();
  const [showCreator, setShowCreator] = useState(false);
  const [editingPage, setEditingPage] = useState<GenericLandingPage | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedLinks, setCopiedLinks] = useState<Set<string>>(new Set());
  const [contactRequests, setContactRequests] = useState<Record<string, ContactRequest[]>>({});
  const [showContactRequests, setShowContactRequests] = useState<Record<string, boolean>>({});
  const [loadingRequests, setLoadingRequests] = useState<Set<string>>(new Set());
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');

  const fetchContactRequests = async (pageId: string) => {
    if (contactRequests[pageId]) return; // Already loaded
    
    setLoadingRequests(prev => new Set(prev).add(pageId));
    try {
      const { data, error } = await supabase
        .from('contact_requests')
        .select('*')
        .eq('generic_landing_page_id', pageId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching contact requests:', error);
        return;
      }

      setContactRequests(prev => ({
        ...prev,
        [pageId]: data || []
      }));
    } catch (error) {
      console.error('Error fetching contact requests:', error);
    } finally {
      setLoadingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(pageId);
        return newSet;
      });
    }
  };

  const toggleContactRequests = (pageId: string) => {
    setShowContactRequests(prev => ({
      ...prev,
      [pageId]: !prev[pageId]
    }));
    
    if (!showContactRequests[pageId]) {
      fetchContactRequests(pageId);
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
        Object.keys(newState).forEach(pageId => {
          newState[pageId] = newState[pageId].map(req => 
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
    if (!window.confirm('Are you sure you want to delete this landing page?')) {
      return;
    }

    try {
      setDeletingId(id);
      await deleteGenericLandingPage(id);
      console.log('✅ Landing page deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting landing page:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete landing page';
      alert(`Failed to delete landing page: ${errorMessage}`);
    } finally {
      setDeletingId(null);
    }
  };

  const copyPageLink = async (page: GenericLandingPage) => {
    try {
      const pageUrl = `${window.location.origin}/generic-landing-page/${page.uniqueToken}`;
      await navigator.clipboard.writeText(pageUrl);
      setCopiedLinks(prev => new Set(prev).add(page.id));
      setTimeout(() => {
        setCopiedLinks(prev => {
          const newSet = new Set(prev);
          newSet.delete(page.id);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      alert('Failed to copy link. Please try again.');
    }
  };

  const handleView = (page: GenericLandingPage) => {
    // Open in new tab using unique token
    window.open(`/generic-landing-page/${page.uniqueToken}`, '_blank');
  };

  const handleEdit = (page: GenericLandingPage) => {
    console.log('🔧 Edit button clicked for generic landing page:', page);
    console.log('🔧 Page data:', page.data);
    console.log('🔧 Partner logo URL:', page.data?.partnerLogoUrl);
    setEditingPage(page);
    setShowCreator(true);
  };
  
  const handleCloseCreator = () => {
    setShowCreator(false);
    setEditingPage(null);
  };

  // Filter and sort generic landing pages
  const filteredAndSortedPages = useMemo(() => {
    let filtered = genericLandingPages;

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
  }, [genericLandingPages, searchTerm, statusFilter, sortBy]);

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
          <p className="text-text-dark-60">Loading landing pages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="h1">Generic Landing Pages</h1>
          <p className="text-text-dark-60 mt-2">Manage your customizable generic landing pages</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={async () => {
              const url = `${window.location.origin}/holiday-generic`;
              await navigator.clipboard.writeText(url);
              alert('Generic page link copied to clipboard!');
            }}
            className="inline-flex items-center px-4 py-2 text-sm font-bold text-shortcut-blue bg-shortcut-teal bg-opacity-20 rounded-md hover:bg-shortcut-teal hover:bg-opacity-30 transition-colors"
            title="Copy generic landing page link"
          >
            <Link className="w-4 h-4 mr-2" />
            Copy Generic Link
          </button>
          <Button 
            variant="secondary"
            onClick={() => window.open('/corporatepartnerships', '_blank')}
          >
            View Generic Page
          </Button>
          <Button onClick={() => setShowCreator(true)}>
            Create Generic Landing Page
          </Button>
        </div>
      </div>

      {/* Filters Section */}
      {genericLandingPages.length > 0 && (
        <div className="card-medium mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-dark-60 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by partner name, email, or token..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
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
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
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
              <div className="text-sm text-text-dark-60">
                Showing {filteredAndSortedPages.length} of {genericLandingPages.length} pages
              </div>
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-3 py-1.5 text-sm font-bold text-shortcut-blue bg-neutral-light-gray rounded-md hover:bg-neutral-gray transition-colors"
              >
                <X className="w-4 h-4 mr-1" />
                Clear Filters
              </button>
            </div>
          )}
        </div>
      )}

      {genericLandingPages.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-text-dark-60 text-6xl mb-4">🤝</div>
          <h3 className="text-xl font-extrabold text-shortcut-blue mb-2">No Generic Landing Pages Yet</h3>
          <p className="text-text-dark-60 mb-6">Create your first customizable generic landing page for a partner</p>
          <Button onClick={() => setShowCreator(true)}>
            Create Your First Generic Landing Page
          </Button>
        </div>
      ) : filteredAndSortedPages.length === 0 ? (
        <div className="text-center py-12 card-medium">
          <div className="text-text-dark-60 text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-extrabold text-shortcut-blue mb-2">No Pages Found</h3>
          <p className="text-text-dark-60 mb-6">Try adjusting your filters to see more results</p>
          <Button
            onClick={clearFilters}
            variant="primary"
            icon={<X className="w-4 h-4" />}
            size="sm"
          >
            Clear All Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedPages.map((page) => (
            <div key={page.id} className="card-medium">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {page.data.partnerLogoUrl && (
                    <img 
                      src={page.data.partnerLogoUrl} 
                      alt={page.data.partnerName}
                      className="h-8 w-auto"
                    />
                  )}
                  <h3 className="text-lg font-extrabold text-shortcut-blue">
                    {page.data.partnerName}
                  </h3>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  page.status === 'published' 
                    ? 'bg-green-100 text-green-800'
                    : page.status === 'draft'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-neutral-light-gray text-shortcut-blue'
                }`}>
                  {page.status}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <p className="text-sm text-text-dark">
                  <span className="font-bold">Created:</span> {new Date(page.createdAt).toLocaleDateString()}
                </p>
                {page.data.clientEmail && (
                  <p className="text-sm text-text-dark">
                    <span className="font-bold">Client:</span> {page.data.clientEmail}
                  </p>
                )}
                
                {/* Contact Requests Section */}
                <div className="border-t pt-3 mt-3">
                  <button
                    onClick={() => toggleContactRequests(page.id)}
                    className="flex items-center gap-2 text-sm font-bold text-shortcut-blue hover:text-shortcut-navy-blue transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Contact Requests
                    {contactRequests[page.id] && (
                      <span className="bg-shortcut-teal bg-opacity-20 text-shortcut-blue text-xs px-2 py-1 rounded-full">
                        {contactRequests[page.id].length}
                      </span>
                    )}
                    {showContactRequests[page.id] ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                  
                  {showContactRequests[page.id] && (
                    <div className="mt-3 space-y-3 max-h-64 overflow-y-auto">
                      {loadingRequests.has(page.id) ? (
                        <div className="text-center py-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
                          <p className="text-xs text-text-dark-60 mt-1">Loading...</p>
                        </div>
                      ) : contactRequests[page.id]?.length > 0 ? (
                        contactRequests[page.id].map((request) => (
                          <div key={request.id} className="bg-neutral-light-gray rounded-lg p-3 text-xs">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-bold text-shortcut-blue">
                                  {request.first_name} {request.last_name}
                                </p>
                                <p className="text-text-dark">{request.email}</p>
                                {request.phone && (
                                  <p className="text-text-dark">{request.phone}</p>
                                )}
                              </div>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                request.status === 'new' 
                                  ? 'bg-red-100 text-red-800'
                                  : request.status === 'contacted'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : request.status === 'followed_up'
                                  ? 'bg-shortcut-teal bg-opacity-20 text-shortcut-blue'
                                  : 'bg-neutral-light-gray text-shortcut-blue'
                              }`}>
                                {request.status.replace('_', ' ')}
                              </span>
                            </div>
                            
                            {request.service_type && (
                              <p className="text-text-dark mb-1">
                                <span className="font-bold">Service:</span> {request.service_type}
                              </p>
                            )}
                            {request.appointment_count && (
                              <p className="text-text-dark mb-1">
                                <span className="font-bold">Appointments:</span> {request.appointment_count}
                              </p>
                            )}
                            {request.event_date && (
                              <p className="text-text-dark mb-1">
                                <span className="font-bold">Event Date:</span> {new Date(request.event_date).toLocaleDateString()}
                              </p>
                            )}
                            {request.message && (
                              <p className="text-text-dark mb-2">
                                <span className="font-bold">Message:</span> {request.message}
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
                                  className="px-2 py-1 bg-shortcut-teal bg-opacity-20 text-shortcut-blue text-xs rounded hover:bg-shortcut-teal hover:bg-opacity-30 transition-colors"
                                >
                                  Mark Followed Up
                                </button>
                              )}
                              <button
                                onClick={() => updateContactRequestStatus(request.id, 'closed')}
                                className="px-2 py-1 bg-neutral-light-gray text-shortcut-blue text-xs rounded hover:bg-neutral-gray transition-colors"
                              >
                                Close
                              </button>
                            </div>
                            
                            <p className="text-text-dark-60 text-xs mt-1">
                              {new Date(request.created_at).toLocaleString()}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-text-dark-60 text-center py-2">No contact requests yet</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleView(page)}
                >
                  View
                </Button>
                <button
                  onClick={() => copyPageLink(page)}
                  className={`inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                    copiedLinks.has(page.id)
                      ? 'text-green-700 bg-green-100'
                      : 'text-shortcut-blue bg-shortcut-teal bg-opacity-20 hover:bg-shortcut-teal hover:bg-opacity-30'
                  }`}
                  title="Copy generic landing page link"
                >
                  {copiedLinks.has(page.id) ? (
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
                  onClick={() => handleEdit(page)}
                >
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDelete(page.id)}
                  disabled={deletingId === page.id}
                >
                  {deletingId === page.id ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreator && (
        <>
          {console.log('🎭 Rendering GenericLandingPageCreator modal with editingPage:', editingPage)}
          <GenericLandingPageCreator onClose={handleCloseCreator} editingPage={editingPage} />
        </>
      )}
    </div>
  );
};

export default GenericLandingPageManager;
