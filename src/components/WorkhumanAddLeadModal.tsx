import React, { useMemo, useState } from 'react';
import { X, UserPlus, Loader2 } from 'lucide-react';
import { createLead } from '../services/WorkhumanLeadService';
import { WorkhumanLead, ASSIGNEE_NAMES, AssigneeName } from '../types/workhumanLead';
import { ensureStampedNote } from '../utils/notes';
import { useAuth } from '../contexts/AuthContext';

// Auth email → first name for stamping notes saved via this modal.
const EMAIL_TO_FIRST_NAME: Record<string, string> = {
  'will@getshortcut.co': 'Will',
  'jaimie@getshortcut.co': 'Jaimie',
  'marc@getshortcut.co': 'Marc',
  'caren@getshortcut.co': 'Caren',
};

interface Props {
  onClose: () => void;
  onCreated: (lead: WorkhumanLead) => void;
}

type TierChoice = 'standard' | 'tier_1a' | 'tier_1b';

export const WorkhumanAddLeadModal: React.FC<Props> = ({ onClose, onCreated }) => {
  const { user } = useAuth();
  const myFirstName = useMemo(
    () => EMAIL_TO_FIRST_NAME[(user?.email || '').toLowerCase()] || 'Team',
    [user]
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [assignedTo, setAssignedTo] = useState<AssigneeName | ''>('');
  const [tierChoice, setTierChoice] = useState<TierChoice>('standard');
  const [leadNotes, setLeadNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await createLead({
        name: name.trim(),
        email: email.trim(),
        company: company.trim() || undefined,
        title: title.trim() || undefined,
        phone: phone.trim() || undefined,
        linkedin_url: linkedinUrl.trim() || undefined,
        tier_1a: tierChoice === 'tier_1a',
        tier_1b: tierChoice === 'tier_1b',
        assigned_to: assignedTo || null,
        // Stamp on save so the lead surfaces in Rapid Outreach. If the
        // teammate already typed a [stamp · Name] tag, we leave it alone.
        notes: ensureStampedNote(leadNotes, myFirstName) || undefined,
      });
      if (!created) {
        setError('Could not create lead. Email may already exist or the request failed.');
        setSubmitting(false);
        return;
      }
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <UserPlus size={20} className="text-amber-600" />
            <h2 className="text-lg font-semibold text-gray-900">Add Lead</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Full name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="Jane Smith"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email <span className="text-red-500">*</span></label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="jane@acme.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
              <input
                type="text"
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="Acme Corp"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="VP People"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+1 555 123 4567"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">LinkedIn URL</label>
              <input
                type="url"
                value={linkedinUrl}
                onChange={e => setLinkedinUrl(e.target.value)}
                placeholder="linkedin.com/in/..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tier</label>
              <select
                value={tierChoice}
                onChange={e => setTierChoice(e.target.value as TierChoice)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
              >
                <option value="standard">Standard Tier 1</option>
                <option value="tier_1a">Tier 1A (VIP)</option>
                <option value="tier_1b">Tier 1B</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Assigned to</label>
              <select
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value as AssigneeName | '')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
              >
                <option value="">Unassigned</option>
                {ASSIGNEE_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
            <textarea
              value={leadNotes}
              onChange={e => setLeadNotes(e.target.value)}
              rows={2}
              placeholder="Any context about this lead..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim() || !email.trim()}
              className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 text-white text-sm font-medium px-4 py-2 rounded-lg inline-flex items-center gap-1.5"
            >
              {submitting ? <><Loader2 size={14} className="animate-spin" /> Creating...</> : <><UserPlus size={14} /> Create lead</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
