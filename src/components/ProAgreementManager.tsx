import React, { useState, useMemo } from 'react';
import { useProAgreement } from '../contexts/ProAgreementContext';
import { ProAgreement, ProAgreementTemplate, AgreementStatus, DocumentType } from '../types/proAgreement';
import { LoadingSpinner } from './LoadingSpinner';
import { Search, ExternalLink, RefreshCw, FileSignature, Plus, Copy, Check, Send, RotateCcw, FileCheck, Settings, X, Eye } from 'lucide-react';
import { Button } from './Button';
import { format } from 'date-fns';

const STATUS_CONFIG: Record<AgreementStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-gray-100 text-gray-700' },
  sent: { label: 'Sent', className: 'bg-blue-100 text-blue-700' },
  opened: { label: 'Opened', className: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-700' },
  expired: { label: 'Expired', className: 'bg-red-100 text-red-700' },
  declined: { label: 'Declined', className: 'bg-red-100 text-red-700' },
};

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  ica: 'ICA',
  w9: 'W-9',
  workers_comp: 'Workers Comp',
  custom: 'Custom',
};

const ProAgreementManager: React.FC = () => {
  const {
    agreements, templates, loading, error,
    sendAgreement, syncAgreementStatus, resendEmail,
    createTemplate, updateTemplate,
  } = useProAgreement();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  // Action states
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Send modal
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendProName, setSendProName] = useState('');
  const [sendProEmail, setSendProEmail] = useState('');
  const [sendTemplateId, setSendTemplateId] = useState('');

  // Template modal
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDocType, setTemplateDocType] = useState<string>('ica');
  const [templateDocusealId, setTemplateDocusealId] = useState('');
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  const activeTemplates = templates.filter(t => t.isActive);

  const filteredAgreements = useMemo(() => {
    let filtered = agreements;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        a.proName.toLowerCase().includes(term) ||
        a.proEmail.toLowerCase().includes(term) ||
        (a.templateName && a.templateName.toLowerCase().includes(term))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(a => a.status === statusFilter);
    }

    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }, [agreements, searchTerm, statusFilter, sortBy]);

  // Handlers
  const handleSync = async (agreement: ProAgreement) => {
    try {
      setSyncingId(agreement.id);
      await syncAgreementStatus(agreement.id);
    } catch (err) {
      console.error('Failed to sync:', err);
    } finally {
      setSyncingId(null);
    }
  };

  const handleCopyLink = async (agreement: ProAgreement) => {
    const link = agreement.signingSlug
      ? `${window.location.origin}/sign/${agreement.signingSlug}`
      : agreement.signingUrl || '';
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(agreement.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      window.open(link, '_blank');
    }
  };

  const handleResend = async (agreement: ProAgreement) => {
    try {
      setResendingId(agreement.id);
      await resendEmail(agreement.id);
    } catch (err) {
      console.error('Failed to resend:', err);
    } finally {
      setResendingId(null);
    }
  };

  const handleSend = async (sendToClient: boolean) => {
    if (!sendTemplateId) {
      setSendError('Please select a template');
      return;
    }
    if (!sendProName.trim()) {
      setSendError('Pro name is required');
      return;
    }
    if (sendToClient && (!sendProEmail.trim() || !sendProEmail.includes('@'))) {
      setSendError('Valid email is required to send to Pro');
      return;
    }

    try {
      setSendLoading(true);
      setSendError(null);
      const result = await sendAgreement(sendTemplateId, sendProName.trim(), sendProEmail.trim(), sendToClient);

      setShowSendModal(false);
      setSendProName('');
      setSendProEmail('');
      setSendTemplateId('');

      // Copy link to clipboard
      if (result.signingUrl) {
        try {
          await navigator.clipboard.writeText(result.signingUrl);
        } catch { /* ok */ }
      }
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send agreement');
    } finally {
      setSendLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!templateName.trim() || !templateDocusealId.trim()) {
      setTemplateError('Name and DocuSeal Template ID are required');
      return;
    }

    const idNum = parseInt(templateDocusealId, 10);
    if (isNaN(idNum)) {
      setTemplateError('DocuSeal Template ID must be a number');
      return;
    }

    try {
      setTemplateLoading(true);
      setTemplateError(null);
      await createTemplate(templateName.trim(), templateDocType, idNum);
      setTemplateName('');
      setTemplateDocType('ica');
      setTemplateDocusealId('');
    } catch (err) {
      setTemplateError(err instanceof Error ? err.message : 'Failed to create template');
    } finally {
      setTemplateLoading(false);
    }
  };

  const handleToggleTemplate = async (template: ProAgreementTemplate) => {
    try {
      await updateTemplate(template.id, { isActive: !template.isActive });
    } catch (err) {
      console.error('Failed to toggle template:', err);
    }
  };

  const openSendModal = () => {
    setSendError(null);
    setSendProName('');
    setSendProEmail('');
    setSendTemplateId(activeTemplates.length === 1 ? activeTemplates[0].id : '');
    setShowSendModal(true);
  };

  if (loading && agreements.length === 0) {
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
            <FileSignature className="text-shortcut-blue" size={28} />
            Pro Agreements
            {agreements.length > 0 && (
              <span className="text-base font-medium bg-shortcut-blue/10 text-shortcut-blue px-3 py-1 rounded-full">
                {agreements.length}
              </span>
            )}
          </h1>
          <p className="text-text-dark-60 mt-1">Send and track agreements for Pros via DocuSeal</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowTemplateModal(true)}
            variant="secondary"
            icon={<Settings size={16} />}
          >
            Templates
          </Button>
          <button
            onClick={openSendModal}
            disabled={activeTemplates.length === 0}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-shortcut-blue hover:bg-shortcut-navy-blue text-white font-bold rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-shortcut-blue focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title={activeTemplates.length === 0 ? 'Add a template first' : ''}
          >
            <Plus size={18} />
            Send Agreement
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by pro name or email..."
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
          <option value="pending">Pending</option>
          <option value="sent">Sent</option>
          <option value="opened">Opened</option>
          <option value="completed">Completed</option>
          <option value="expired">Expired</option>
          <option value="declined">Declined</option>
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

      {/* Agreement List */}
      {filteredAgreements.length === 0 ? (
        <div className="text-center py-16 bg-neutral-light-gray rounded-2xl">
          <FileSignature size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-shortcut-navy-blue mb-2">
            {agreements.length === 0 ? 'No agreements yet' : 'No matching agreements'}
          </h3>
          <p className="text-text-dark-60 max-w-md mx-auto mb-4">
            {agreements.length === 0
              ? 'Send your first agreement to a Pro using the button above.'
              : 'Try adjusting your search or filters.'}
          </p>
          {agreements.length === 0 && activeTemplates.length === 0 && (
            <p className="text-amber-600 text-sm font-medium">
              First, add a template via the Templates button.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAgreements.map((agreement) => {
            const statusConfig = STATUS_CONFIG[agreement.status] || STATUS_CONFIG.pending;
            const isSyncing = syncingId === agreement.id;

            return (
              <div
                key={agreement.id}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  {/* Left: Pro info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold text-shortcut-navy-blue truncate">
                        {agreement.proName}
                      </h3>
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusConfig.className}`}>
                        {statusConfig.label}
                      </span>
                      {agreement.documentType && (
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-50 text-gray-600 border border-gray-200">
                          {DOC_TYPE_LABELS[agreement.documentType] || agreement.documentType}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-text-dark-60">
                      <span>{agreement.proEmail}</span>
                      {agreement.templateName && (
                        <span className="font-medium">{agreement.templateName}</span>
                      )}
                      <span>
                        {format(new Date(agreement.createdAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {agreement.status !== 'completed' && agreement.proEmail && (
                      <button
                        onClick={() => handleResend(agreement)}
                        disabled={resendingId === agreement.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors border border-blue-200"
                        title="Resend signing email"
                      >
                        <RotateCcw size={12} />
                        {resendingId === agreement.id ? 'Sending...' : 'Resend'}
                      </button>
                    )}
                    {agreement.signingSlug && (
                      <button
                        onClick={() => handleCopyLink(agreement)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-gray-200 transition-colors"
                        title="Copy signing link"
                      >
                        {copiedId === agreement.id ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                        {copiedId === agreement.id ? 'Copied!' : 'Copy Link'}
                      </button>
                    )}
                    {agreement.status === 'completed' && agreement.documentsUrl && (
                      <a
                        href={agreement.documentsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 transition-colors border border-green-200"
                        title="View signed document"
                      >
                        <FileCheck size={12} />
                        Signed Doc
                      </a>
                    )}
                    <Button
                      onClick={() => handleSync(agreement)}
                      variant="secondary"
                      icon={<RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />}
                      disabled={isSyncing}
                    >
                      {isSyncing ? 'Syncing...' : 'Sync'}
                    </Button>
                    {agreement.signingSlug && (
                      <a
                        href={`/sign/${agreement.signingSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-shortcut-blue text-white text-sm font-semibold hover:bg-shortcut-navy-blue transition-colors"
                      >
                        <Eye size={14} />
                        View
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Send Agreement Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FileSignature size={20} className="text-shortcut-blue" />
                Send Agreement
              </h2>
              <button onClick={() => setShowSendModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Template</label>
                <select
                  value={sendTemplateId}
                  onChange={(e) => setSendTemplateId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                >
                  <option value="">Select a template...</option>
                  {activeTemplates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({DOC_TYPE_LABELS[t.documentType]})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Pro Name</label>
                <input
                  type="text"
                  value={sendProName}
                  onChange={(e) => setSendProName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Pro Email</label>
                <input
                  type="email"
                  value={sendProEmail}
                  onChange={(e) => setSendProEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                />
              </div>

              {sendError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm">{sendError}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <Button onClick={() => setShowSendModal(false)} variant="secondary">
                Cancel
              </Button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSend(false)}
                  disabled={sendLoading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-full transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Create agreement without emailing — get the link to share yourself"
                >
                  <Copy size={16} />
                  {sendLoading ? 'Creating...' : 'Create Only'}
                </button>
                <button
                  onClick={() => handleSend(true)}
                  disabled={sendLoading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-shortcut-blue hover:bg-shortcut-navy-blue text-white font-bold rounded-full transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={16} />
                  {sendLoading ? 'Sending...' : 'Send to Pro'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Management Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Settings size={20} className="text-shortcut-blue" />
                Manage Templates
              </h2>
              <button onClick={() => setShowTemplateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Existing Templates */}
              {templates.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3">Existing Templates</h3>
                  <div className="space-y-2">
                    {templates.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
                        <div>
                          <p className="font-semibold text-sm text-gray-900">{t.name}</p>
                          <p className="text-xs text-gray-500">
                            {DOC_TYPE_LABELS[t.documentType]} &middot; DocuSeal ID: {t.docusealTemplateId}
                          </p>
                        </div>
                        <button
                          onClick={() => handleToggleTemplate(t)}
                          className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
                            t.isActive
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                          }`}
                        >
                          {t.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add New Template */}
              <div>
                <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3">Add New Template</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Template name (e.g., Independent Contractor Agreement)"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                  />
                  <select
                    value={templateDocType}
                    onChange={(e) => setTemplateDocType(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                  >
                    <option value="ica">ICA (Independent Contractor Agreement)</option>
                    <option value="w9">W-9</option>
                    <option value="workers_comp">Workers Comp Waiver</option>
                    <option value="custom">Custom</option>
                  </select>
                  <input
                    type="text"
                    placeholder="DocuSeal Template ID (numeric)"
                    value={templateDocusealId}
                    onChange={(e) => setTemplateDocusealId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                  />
                  <p className="text-xs text-gray-400">
                    Upload your PDF to DocuSeal first, then paste the numeric template ID here.
                  </p>

                  {templateError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-700 text-sm">{templateError}</p>
                    </div>
                  )}

                  <button
                    onClick={handleCreateTemplate}
                    disabled={templateLoading}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-shortcut-blue hover:bg-shortcut-navy-blue text-white font-bold rounded-full transition-colors text-sm disabled:opacity-50"
                  >
                    <Plus size={16} />
                    {templateLoading ? 'Adding...' : 'Add Template'}
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <Button
                onClick={() => setShowTemplateModal(false)}
                variant="secondary"
                className="w-full"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProAgreementManager;
