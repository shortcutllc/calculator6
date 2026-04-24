import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSurvey } from '../contexts/SurveyContext';
import type { Survey } from '../types/survey';
import { Button } from './Button';
import SurveyCreator from './SurveyCreator';
import SurveyResponsesViewer from './SurveyResponsesViewer';
import { Link as LinkIcon, CheckCircle, Search, X, BarChart3 } from 'lucide-react';

const SurveyManager: React.FC = () => {
  const navigate = useNavigate();
  const { surveys, loading, deleteSurvey } = useSurvey();
  const [showCreator, setShowCreator] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [viewingResponsesFor, setViewingResponsesFor] = useState<Survey | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedLinks, setCopiedLinks] = useState<Set<string>>(new Set());

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this survey? All responses will also be deleted.')) return;
    try {
      setDeletingId(id);
      await deleteSurvey(id);
    } catch (err) {
      alert(`Failed to delete survey: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const copySurveyLink = async (s: Survey) => {
    try {
      const url = `${window.location.origin}/survey/${s.uniqueToken}`;
      await navigator.clipboard.writeText(url);
      setCopiedLinks(prev => new Set(prev).add(s.id));
      setTimeout(() => {
        setCopiedLinks(prev => {
          const n = new Set(prev);
          n.delete(s.id);
          return n;
        });
      }, 2000);
    } catch {
      alert('Failed to copy link. Please try again.');
    }
  };

  const handleView = (s: Survey) => {
    window.open(`/survey/${s.uniqueToken}`, '_blank');
  };

  const handleEdit = (s: Survey) => {
    setEditingSurvey(s);
    setShowCreator(true);
  };

  const handleCloseCreator = () => {
    setShowCreator(false);
    setEditingSurvey(null);
  };

  const filteredAndSorted = useMemo(() => {
    let filtered = surveys;
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(
        x =>
          x.data.title?.toLowerCase().includes(s) ||
          x.data.description?.toLowerCase().includes(s) ||
          x.data.partnerName?.toLowerCase().includes(s) ||
          x.uniqueToken?.toLowerCase().includes(s)
      );
    }
    if (statusFilter !== 'all') filtered = filtered.filter(x => x.status === statusFilter);

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'title':
          return (a.data.title || '').localeCompare(b.data.title || '');
      }
    });
  }, [surveys, searchTerm, statusFilter, sortBy]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSortBy('newest');
  };

  const hasActiveFilters = searchTerm.trim() !== '' || statusFilter !== 'all' || sortBy !== 'newest';

  if (loading && surveys.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-text-dark-60">Loading surveys...</p>
        </div>
      </div>
    );
  }

  if (viewingResponsesFor) {
    return (
      <SurveyResponsesViewer
        survey={viewingResponsesFor}
        onClose={() => setViewingResponsesFor(null)}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="h1">Surveys</h1>
          <p className="text-text-dark-60 mt-2">
            Create pre-event surveys to send to your clients' employees
          </p>
        </div>
        <Button onClick={() => setShowCreator(true)}>Create Survey</Button>
      </div>

      {surveys.length > 0 && (
        <div className="card-medium mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-dark-60 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by title, partner, or token..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>
          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="text-sm text-text-dark-60">
                Showing {filteredAndSorted.length} of {surveys.length} surveys
              </div>
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-shortcut-blue bg-neutral-light-gray rounded-md hover:bg-neutral-gray transition-colors"
              >
                <X className="w-4 h-4 mr-1" />
                Clear Filters
              </button>
            </div>
          )}
        </div>
      )}

      {surveys.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-text-dark-60 text-6xl mb-4">📝</div>
          <h3 className="text-xl font-extrabold text-shortcut-blue mb-2">No Surveys Yet</h3>
          <p className="text-text-dark-60 mb-6">
            Start with a template to spin up your first pre-event survey
          </p>
          <Button onClick={() => setShowCreator(true)}>Create Your First Survey</Button>
        </div>
      ) : filteredAndSorted.length === 0 ? (
        <div className="text-center py-12 card-medium">
          <div className="text-text-dark-60 text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-extrabold text-shortcut-blue mb-2">No Surveys Found</h3>
          <p className="text-text-dark-60 mb-6">Try adjusting your filters.</p>
          <Button onClick={clearFilters} variant="primary" icon={<X className="w-4 h-4" />} size="sm">
            Clear All Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSorted.map(s => (
            <div key={s.id} className="card-medium">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  {s.data.partnerLogoUrl && (
                    <img
                      src={s.data.partnerLogoUrl}
                      alt={s.data.partnerName || 'Partner logo'}
                      className="h-8 w-auto flex-shrink-0"
                    />
                  )}
                  <h3 className="text-lg font-extrabold text-shortcut-blue truncate">
                    {s.data.title || 'Untitled Survey'}
                  </h3>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ml-2 ${
                    s.status === 'published'
                      ? 'bg-green-100 text-green-800'
                      : s.status === 'draft'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-neutral-light-gray text-shortcut-blue'
                  }`}
                >
                  {s.status}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <p className="text-sm text-text-dark">
                  <span className="font-bold">Questions:</span> {s.data.questions?.length || 0}
                </p>
                <p className="text-sm text-text-dark">
                  <span className="font-bold">Created:</span>{' '}
                  {new Date(s.createdAt).toLocaleDateString()}
                </p>
                {s.data.partnerName && (
                  <p className="text-sm text-text-dark">
                    <span className="font-bold">Partner:</span> {s.data.partnerName}
                  </p>
                )}
                {s.data.description && (
                  <p className="text-sm text-text-dark-60 line-clamp-2">{s.data.description}</p>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button variant="secondary" size="sm" onClick={() => handleView(s)}>
                  View
                </Button>
                <button
                  onClick={() => copySurveyLink(s)}
                  className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    copiedLinks.has(s.id)
                      ? 'text-green-700 bg-green-100'
                      : 'text-blue-700 bg-blue-100 hover:bg-blue-200'
                  }`}
                  title="Copy survey link"
                >
                  {copiedLinks.has(s.id) ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-3 h-3 mr-1" />
                      Copy Link
                    </>
                  )}
                </button>
                <button
                  onClick={() => setViewingResponsesFor(s)}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-shortcut-blue bg-neutral-light-gray hover:bg-neutral-gray transition-colors"
                  title="View responses"
                >
                  <BarChart3 className="w-3 h-3 mr-1" />
                  Responses
                </button>
                <Button variant="secondary" size="sm" onClick={() => handleEdit(s)}>
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDelete(s.id)}
                  disabled={deletingId === s.id}
                >
                  {deletingId === s.id ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreator && (
        <SurveyCreator onClose={handleCloseCreator} editingSurvey={editingSurvey} />
      )}
    </div>
  );
};

export default SurveyManager;
