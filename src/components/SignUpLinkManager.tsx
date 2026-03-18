import React, { useState, useMemo } from 'react';
import { Plus, Search, Link2, Copy, Trash2, ExternalLink, Calendar, MapPin, CheckCircle, Clock, Archive, RefreshCw } from 'lucide-react';
import { useSignUpLinks } from '../contexts/SignUpLinkContext';
import { SignUpLink } from '../types/signUpLink';
import SignUpLinkCreator from './SignUpLinkCreator';

type StatusFilter = 'all' | 'active' | 'pending' | 'archived';
type SortOption = 'newest' | 'oldest' | 'client';

const SignUpLinkManager: React.FC = () => {
  const { signUpLinks, loading, error, fetchSignUpLinks, deleteSignUpLink, updateSignUpLink } = useSignUpLinks();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showCreator, setShowCreator] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredLinks = useMemo(() => {
    let result = signUpLinks.filter(link => {
      const matchesSearch = !searchTerm ||
        link.proposalClientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.eventName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.eventLocation?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || link.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    result.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return a.proposalClientName.localeCompare(b.proposalClientName);
    });

    return result;
  }, [signUpLinks, searchTerm, statusFilter, sortBy]);

  const handleCopyLink = async (link: SignUpLink) => {
    if (!link.signupUrl) return;
    await navigator.clipboard.writeText(link.signupUrl);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (link: SignUpLink) => {
    if (!confirm(`Delete sign-up link for ${link.proposalClientName}?`)) return;
    try {
      await deleteSignUpLink(link.id);
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleArchive = async (link: SignUpLink) => {
    try {
      await updateSignUpLink(link.id, { status: 'archived' });
    } catch (err) {
      console.error('Failed to archive:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3" /> Active
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500">
            <Archive className="w-3 h-3" /> Archived
          </span>
        );
      default:
        return null;
    }
  };

  const counts = useMemo(() => ({
    all: signUpLinks.length,
    active: signUpLinks.filter(l => l.status === 'active').length,
    pending: signUpLinks.filter(l => l.status === 'pending').length,
    archived: signUpLinks.filter(l => l.status === 'archived').length,
  }), [signUpLinks]);

  if (showCreator) {
    return (
      <SignUpLinkCreator
        onClose={() => setShowCreator(false)}
        onCreated={() => {
          setShowCreator(false);
          fetchSignUpLinks();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-[#09364f]">Sign-Up Links</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage coordinator event sign-up links tied to proposals
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchSignUpLinks()}
              className="p-2 text-gray-400 hover:text-[#09364f] transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowCreator(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#9EFAFF] text-[#09364f] font-bold text-sm rounded-full hover:bg-[#FEDC64] transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Sign-Up Link
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by client, event, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#09364f] focus:border-[#09364f]"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'active', 'pending', 'archived'] as StatusFilter[]).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 text-xs font-bold rounded-lg transition-colors ${
                  statusFilter === s
                    ? 'bg-[#09364f] text-white'
                    : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)} ({counts[s]})
              </button>
            ))}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#09364f]"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="client">Client A-Z</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        )}

        {/* Empty State */}
        {!loading && filteredLinks.length === 0 && (
          <div className="text-center py-16">
            <Link2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-500 mb-2">
              {searchTerm || statusFilter !== 'all' ? 'No matching links' : 'No sign-up links yet'}
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first sign-up link from an approved proposal'}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <button
                onClick={() => setShowCreator(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#9EFAFF] text-[#09364f] font-bold text-sm rounded-full hover:bg-[#FEDC64] transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Sign-Up Link
              </button>
            )}
          </div>
        )}

        {/* Link Cards */}
        <div className="space-y-3">
          {filteredLinks.map(link => (
            <div
              key={link.id}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Title row */}
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-extrabold text-[#09364f] text-lg truncate">
                      {link.proposalClientName}
                      {link.eventLocation && (
                        <span className="font-medium text-gray-500"> — {link.eventLocation}</span>
                      )}
                    </h3>
                    {statusBadge(link.status)}
                  </div>

                  {/* Details */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-gray-500 mb-3">
                    {link.eventDate && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(link.eventDate)}
                      </span>
                    )}
                    {link.eventLocation && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {link.eventLocation}
                      </span>
                    )}
                    {link.serviceTypes?.length > 0 && (
                      <span>{link.serviceTypes.join(', ')}</span>
                    )}
                  </div>

                  {/* Signup URL */}
                  {link.signupUrl ? (
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-gray-100 px-3 py-1.5 rounded-lg text-[#09364f] truncate max-w-md">
                        {link.signupUrl}
                      </code>
                      <button
                        onClick={() => handleCopyLink(link)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#09364f] bg-[#9EFAFF] rounded-lg hover:bg-[#FEDC64] transition-colors"
                      >
                        {copiedId === link.id ? (
                          <><CheckCircle className="w-3 h-3" /> Copied</>
                        ) : (
                          <><Copy className="w-3 h-3" /> Copy</>
                        )}
                      </button>
                      <a
                        href={link.signupUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-gray-400 hover:text-[#09364f] transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ) : (
                    <p className="text-xs text-yellow-600 font-medium">
                      Event not yet created — sign-up link will be generated after event creation
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {link.status !== 'archived' && (
                    <button
                      onClick={() => handleArchive(link)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Archive"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(link)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SignUpLinkManager;
