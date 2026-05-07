import React, { useMemo, useState } from 'react';
import { X, Pencil, Loader2 } from 'lucide-react';
import { updateLead } from '../services/WorkhumanLeadService';
import { WorkhumanLead, ASSIGNEE_NAMES, AssigneeName } from '../types/workhumanLead';
import { ensureStampedNote } from '../utils/notes';
import { useAuth } from '../contexts/AuthContext';

// Auth email → first name for stamping notes saved via this modal.
// Mirrors EMAIL_TO_ASSIGNEE in WorkhumanLeads.tsx.
const EMAIL_TO_FIRST_NAME: Record<string, string> = {
  'will@getshortcut.co': 'Will',
  'jaimie@getshortcut.co': 'Jaimie',
  'marc@getshortcut.co': 'Marc',
  'caren@getshortcut.co': 'Caren',
};

interface Props {
  lead: WorkhumanLead;
  onClose: () => void;
  onSaved: (updatedFields: Partial<WorkhumanLead>) => void;
}

type TierChoice = 'standard' | 'tier_1a' | 'tier_1b';

function tierFromLead(lead: WorkhumanLead): TierChoice {
  if (lead.tier_1a) return 'tier_1a';
  if (lead.tier_1b) return 'tier_1b';
  return 'standard';
}

export const WorkhumanEditLeadModal: React.FC<Props> = ({ lead, onClose, onSaved }) => {
  const { user } = useAuth();
  const myFirstName = useMemo(
    () => EMAIL_TO_FIRST_NAME[(user?.email || '').toLowerCase()] || 'Team',
    [user]
  );
  const [name, setName] = useState(lead.name || '');
  const [email, setEmail] = useState(lead.email || '');
  const [company, setCompany] = useState(lead.company || '');
  const [companyUrl, setCompanyUrl] = useState(lead.company_url || '');
  const [title, setTitle] = useState(lead.title || '');
  const [phone, setPhone] = useState(lead.phone || '');
  const [mobilePhone, setMobilePhone] = useState(lead.mobile_phone || '');
  const [workPhone, setWorkPhone] = useState(lead.work_phone || '');
  const [linkedinUrl, setLinkedinUrl] = useState(lead.linkedin_url || '');
  const [industry, setIndustry] = useState(lead.industry || '');
  const [companySize, setCompanySize] = useState(lead.company_size || '');
  const [hqLocation, setHqLocation] = useState(lead.hq_location || '');
  const [tierChoice, setTierChoice] = useState<TierChoice>(tierFromLead(lead));
  const [assignedTo, setAssignedTo] = useState<AssigneeName | ''>((lead.assigned_to as AssigneeName) || '');
  const [notes, setNotes] = useState(lead.notes || '');
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

    // Build partial payload — only include fields that changed to reduce surface
    const trimOrNull = (s: string) => s.trim() || null;
    const patch: Parameters<typeof updateLead>[1] = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      company: trimOrNull(company),
      company_url: trimOrNull(companyUrl),
      title: trimOrNull(title),
      phone: trimOrNull(phone),
      mobile_phone: trimOrNull(mobilePhone),
      work_phone: trimOrNull(workPhone),
      linkedin_url: trimOrNull(linkedinUrl),
      industry: trimOrNull(industry),
      company_size: trimOrNull(companySize),
      hq_location: trimOrNull(hqLocation),
      tier_1a: tierChoice === 'tier_1a',
      tier_1b: tierChoice === 'tier_1b',
      assigned_to: assignedTo || null,
      // Auto-stamp notes that were typed without an author tag, so the
      // Rapid Outreach queue's manual-note regex still picks them up.
      // Existing stamped content is preserved unchanged.
      notes: ensureStampedNote(notes, myFirstName),
    };

    const result = await updateLead(lead.id, patch);
    if (!result.ok) {
      setError(result.error || 'Update failed');
      setSubmitting(false);
      return;
    }
    onSaved(patch as Partial<WorkhumanLead>);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <Pencil size={18} className="text-amber-600" />
            <h2 className="text-lg font-semibold text-gray-900">Edit Lead</h2>
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
          {/* Identity */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Identity</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full name *" value={name} onChange={setName} required />
              <Field label="Email *" value={email} onChange={setEmail} type="email" required />
              <Field label="Title" value={title} onChange={setTitle} />
              <Field label="LinkedIn URL" value={linkedinUrl} onChange={setLinkedinUrl} type="url" />
            </div>
          </div>

          {/* Phone numbers */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Phone</h3>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Primary phone" value={phone} onChange={setPhone} type="tel" />
              <Field label="Mobile" value={mobilePhone} onChange={setMobilePhone} type="tel" />
              <Field label="Work phone" value={workPhone} onChange={setWorkPhone} type="tel" />
            </div>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Company</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Company name" value={company} onChange={setCompany} />
              <Field label="Company URL" value={companyUrl} onChange={setCompanyUrl} type="url" />
              <Field label="Industry" value={industry} onChange={setIndustry} />
              <Field label="Company size" value={companySize} onChange={setCompanySize} placeholder="e.g. 5000 or 1-50" />
              <div className="col-span-2">
                <Field label="HQ location" value={hqLocation} onChange={setHqLocation} placeholder="e.g. New York, NY" />
              </div>
            </div>
          </div>

          {/* CRM attributes */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">CRM</h3>
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
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 sticky bottom-0 bg-white">
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
              {submitting ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Pencil size={14} /> Save changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

function Field({
  label, value, onChange, type = 'text', required = false, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
      />
    </div>
  );
}
