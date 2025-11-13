import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQRCodeSign } from '../contexts/QRCodeSignContext';
import { QRCodeSign } from '../types/qrCodeSign';
import { Button } from './Button';
import QRCodeSignCreator from './QRCodeSignCreator';
import { Link, CheckCircle, Eye, EyeOff, Search, X } from 'lucide-react';

const QRCodeSignManager: React.FC = () => {
  const navigate = useNavigate();
  const { qrCodeSigns, loading: qrCodeSignsLoading, deleteQRCodeSign } = useQRCodeSign();
  const [loading, setLoading] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const [editingSign, setEditingSign] = useState<QRCodeSign | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedLinks, setCopiedLinks] = useState<Set<string>>(new Set());
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('all');

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this QR code sign?')) {
      return;
    }

    try {
      setDeletingId(id);
      await deleteQRCodeSign(id);
      console.log('✅ QR code sign deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting QR code sign:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete QR code sign';
      alert(`Failed to delete QR code sign: ${errorMessage}`);
    } finally {
      setDeletingId(null);
    }
  };

  const copyQRCodeSignLink = async (sign: QRCodeSign) => {
    try {
      const signUrl = `${window.location.origin}/qr-code-sign/${sign.uniqueToken}`;
      await navigator.clipboard.writeText(signUrl);
      setCopiedLinks(prev => new Set(prev).add(sign.id));
      setTimeout(() => {
        setCopiedLinks(prev => {
          const newSet = new Set(prev);
          newSet.delete(sign.id);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      alert('Failed to copy link. Please try again.');
    }
  };

  const handleView = (sign: QRCodeSign) => {
    // Open in new tab using unique token
    window.open(`/qr-code-sign/${sign.uniqueToken}`, '_blank');
  };

  const handleEdit = (sign: QRCodeSign) => {
    console.log('🔧 Edit button clicked for QR code sign:', sign);
    setEditingSign(sign);
    setShowCreator(true);
  };
  
  const handleCloseCreator = () => {
    setShowCreator(false);
    setEditingSign(null);
  };

  // Filter and sort QR code signs
  const filteredAndSortedSigns = useMemo(() => {
    let filtered = qrCodeSigns;

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(sign => 
        sign.data.title?.toLowerCase().includes(search) ||
        sign.data.eventDetails?.toLowerCase().includes(search) ||
        sign.data.partnerName?.toLowerCase().includes(search) ||
        sign.uniqueToken?.toLowerCase().includes(search)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sign => sign.status === statusFilter);
    }

    // Apply service type filter
    if (serviceTypeFilter !== 'all') {
      filtered = filtered.filter(sign => sign.data.serviceType === serviceTypeFilter);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'title':
          return (a.data.title || '').localeCompare(b.data.title || '');
        default:
          return 0;
      }
    });

    return sorted;
  }, [qrCodeSigns, searchTerm, statusFilter, sortBy, serviceTypeFilter]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSortBy('newest');
    setServiceTypeFilter('all');
  };

  const hasActiveFilters = searchTerm.trim() !== '' || statusFilter !== 'all' || sortBy !== 'newest' || serviceTypeFilter !== 'all';

  const serviceTypes = [
    { value: 'massage', label: 'Massage' },
    { value: 'hair-beauty', label: 'Hair + Beauty' },
    { value: 'headshot', label: 'Headshots' },
    { value: 'nails', label: 'Nails' },
    { value: 'mindfulness', label: 'Mindfulness' },
    { value: 'facial', label: 'Facials' }
  ];

  const getServiceTypeLabel = (serviceType: string) => {
    const service = serviceTypes.find(s => s.value === serviceType);
    return service?.label || serviceType;
  };

  if (qrCodeSignsLoading && qrCodeSigns.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-text-dark-60">Loading QR code signs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="h1">QR Code Signs</h1>
          <p className="text-text-dark-60 mt-2">Manage your customizable QR code signs</p>
        </div>
        <Button onClick={() => setShowCreator(true)}>
          Create QR Code Sign
        </Button>
      </div>

      {/* Filters Section */}
      {qrCodeSigns.length > 0 && (
        <div className="card-medium mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-dark-60 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by title, details, or token..."
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

            {/* Service Type Filter */}
            <div>
              <select
                value={serviceTypeFilter}
                onChange={(e) => setServiceTypeFilter(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
              >
                <option value="all">All Service Types</option>
                {serviceTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'title')}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="title">Title (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Active Filters Display & Clear Button */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="text-sm text-text-dark-60">
                Showing {filteredAndSortedSigns.length} of {qrCodeSigns.length} signs
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

      {qrCodeSigns.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-text-dark-60 text-6xl mb-4">📱</div>
          <h3 className="text-xl font-extrabold text-shortcut-blue mb-2">No QR Code Signs Yet</h3>
          <p className="text-text-dark-60 mb-6">Create your first customizable QR code sign</p>
          <Button onClick={() => setShowCreator(true)}>
            Create Your First QR Code Sign
          </Button>
        </div>
      ) : filteredAndSortedSigns.length === 0 ? (
        <div className="text-center py-12 card-medium">
          <div className="text-text-dark-60 text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-extrabold text-shortcut-blue mb-2">No Signs Found</h3>
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
          {filteredAndSortedSigns.map((sign) => (
            <div key={sign.id} className="card-medium">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {sign.data.partnerLogoUrl && (
                    <img 
                      src={sign.data.partnerLogoUrl} 
                      alt={sign.data.partnerName || 'Partner logo'}
                      className="h-8 w-auto"
                    />
                  )}
                  <h3 className="text-lg font-extrabold text-shortcut-blue">
                    {sign.data.title || 'Untitled Sign'}
                  </h3>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  sign.status === 'published' 
                    ? 'bg-green-100 text-green-800'
                    : sign.status === 'draft'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-neutral-light-gray text-shortcut-blue'
                }`}>
                  {sign.status}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <p className="text-sm text-text-dark">
                  <span className="font-bold">Service:</span> {getServiceTypeLabel(sign.data.serviceType)}
                </p>
                <p className="text-sm text-text-dark">
                  <span className="font-bold">Created:</span> {new Date(sign.createdAt).toLocaleDateString()}
                </p>
                {sign.data.partnerName && (
                  <p className="text-sm text-text-dark">
                    <span className="font-bold">Partner:</span> {sign.data.partnerName}
                  </p>
                )}
                {sign.data.eventDetails && (
                  <p className="text-sm text-text-dark-60 line-clamp-2">
                    {sign.data.eventDetails}
                  </p>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleView(sign)}
                >
                  View
                </Button>
                <button
                  onClick={() => copyQRCodeSignLink(sign)}
                  className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    copiedLinks.has(sign.id)
                      ? 'text-green-700 bg-green-100'
                      : 'text-blue-700 bg-blue-100 hover:bg-blue-200'
                  }`}
                  title="Copy QR code sign link"
                >
                  {copiedLinks.has(sign.id) ? (
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
                  onClick={() => handleEdit(sign)}
                >
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDelete(sign.id)}
                  disabled={deletingId === sign.id}
                >
                  {deletingId === sign.id ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreator && (
        <QRCodeSignCreator onClose={handleCloseCreator} editingSign={editingSign} />
      )}
    </div>
  );
};

export default QRCodeSignManager;

