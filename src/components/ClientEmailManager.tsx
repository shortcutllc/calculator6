import React, { useState, useMemo } from 'react';
import { Mail, Plus, Copy, Pencil, Trash2, Check, Search } from 'lucide-react';
import { useClientEmail } from '../contexts/ClientEmailContext';
import { ClientEmailDraft, EmailType } from '../types/clientEmail';
import { copyHtmlToClipboard } from '../utils/clipboardHtml';
import ClientEmailCreator from './ClientEmailCreator';

const ClientEmailManager: React.FC = () => {
  const { drafts, loading, deleteDraft } = useClientEmail();
  const [view, setView] = useState<'list' | 'creator'>('list');
  const [editingDraft, setEditingDraft] = useState<ClientEmailDraft | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<EmailType | 'all'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredDrafts = useMemo(() => {
    return drafts.filter(d => {
      if (filterType !== 'all' && d.emailType !== filterType) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const td = d.templateData as any;
        const searchable = `${td.companyName || ''} ${td.contactName || ''} ${d.subject || ''}`.toLowerCase();
        if (!searchable.includes(term)) return false;
      }
      return true;
    });
  }, [drafts, filterType, searchTerm]);

  const handleNew = () => {
    setEditingDraft(null);
    setView('creator');
  };

  const handleEdit = (draft: ClientEmailDraft) => {
    setEditingDraft(draft);
    setView('creator');
  };

  const handleCopy = async (draft: ClientEmailDraft) => {
    if (draft.generatedHtml) {
      const success = await copyHtmlToClipboard(draft.generatedHtml);
      if (success) {
        setCopiedId(draft.id);
        setTimeout(() => setCopiedId(null), 2500);
      }
    }
  };

  const handleDelete = async (draft: ClientEmailDraft) => {
    if (window.confirm(`Delete "${(draft.templateData as any).companyName || 'this'}" email draft?`)) {
      await deleteDraft(draft.id);
    }
  };

  const handleCreatorClose = () => {
    setView('list');
    setEditingDraft(null);
  };

  if (view === 'creator') {
    return <ClientEmailCreator editingDraft={editingDraft} onClose={handleCreatorClose} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#09364f] rounded-xl">
              <Mail size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Client Emails</h1>
              <p className="text-sm text-gray-500">Generate and manage client email templates</p>
            </div>
          </div>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#09364f] rounded-lg hover:bg-[#0a4060] transition-colors"
          >
            <Plus size={18} />
            New Email
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#09364f] focus:border-[#09364f]"
              placeholder="Search by company or contact..."
            />
          </div>
          <div className="flex gap-1">
            {(['all', 'post-call', 'key-info'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                  filterType === type
                    ? 'bg-[#09364f] text-white border-[#09364f]'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {type === 'all' ? 'All' : type === 'post-call' ? 'Post-Call' : 'Key Info'}
              </button>
            ))}
          </div>
        </div>

        {/* Drafts list */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : filteredDrafts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <Mail size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">
              {drafts.length === 0 ? 'No email drafts yet' : 'No matches found'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {drafts.length === 0 ? 'Click "New Email" to generate your first client email.' : 'Try adjusting your search or filters.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDrafts.map(draft => {
              const td = draft.templateData as any;
              return (
                <div
                  key={draft.id}
                  className="flex items-center justify-between px-5 py-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 truncate">
                        {td.companyName || 'Untitled'}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide ${
                        draft.emailType === 'post-call'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-green-50 text-green-700'
                      }`}>
                        {draft.emailType === 'post-call' ? 'Post-Call' : 'Key Info'}
                      </span>
                      {draft.serviceVariant && draft.emailType === 'key-info' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-600">
                          {draft.serviceVariant}
                        </span>
                      )}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                        draft.status === 'sent'
                          ? 'bg-emerald-50 text-emerald-700'
                          : draft.status === 'archived'
                          ? 'bg-gray-100 text-gray-500'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {draft.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 truncate">
                      {draft.subject || 'No subject'}
                      {td.contactName && ` — To: ${td.contactName}`}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(draft.createdAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <button
                      onClick={() => handleCopy(draft)}
                      className="p-2 text-gray-400 hover:text-[#09364f] hover:bg-gray-100 rounded-lg transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedId === draft.id ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                    </button>
                    <button
                      onClick={() => handleEdit(draft)}
                      className="p-2 text-gray-400 hover:text-[#09364f] hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(draft)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
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

export default ClientEmailManager;
