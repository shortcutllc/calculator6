import React, { useState, useMemo, useEffect } from 'react';
import { Copy, Check, Mail, Send, Sparkles, StickyNote } from 'lucide-react';
import { WorkhumanLead } from '../types/workhumanLead';
import {
  PERSONAL_NOTE_FOLLOWUP_EMAIL,
  PERSONAL_NOTE_CAVEATS,
  PERSONAL_NOTE_SUBJECT_LINES,
  SENDER_TO_CALENDAR,
  SENDER_NAMES,
  SenderName,
  fillTemplate,
  calendarLineForSender,
  suggestCaveatForNotes,
} from '../utils/workhumanOutreachTemplates';
import { logOutreach } from '../services/WorkhumanLeadService';
import { useAuth } from '../contexts/AuthContext';

// Auth email → sender name. Mirrors the mapping in WorkhumanMessagingPanel.
const EMAIL_TO_SENDER: Record<string, SenderName> = {
  'will@getshortcut.co': 'Will Newton',
  'jaimie@getshortcut.co': 'Jaimie Pritchard',
  'marc@getshortcut.co': 'Marc Levitan',
  'caren@getshortcut.co': 'Caren Skutch',
};

const HONORIFIC_RE = /^(Mr|Mrs|Ms|Mx|Dr|Prof|Sir|Madam|Miss|Mister|Mister\.|Mr\.|Mrs\.|Ms\.|Mx\.|Dr\.|Prof\.)\.?\s+/i;
function cleanFirstName(fullName: string | null | undefined): string {
  if (!fullName) return '';
  const stripped = fullName.replace(HONORIFIC_RE, '').trim();
  return (stripped.split(/\s+/)[0] || '').trim();
}

/**
 * Post-event email panel for leads with a real booth conversation
 * (i.e. `lead.notes` contains a manual `[stamp · Name]` entry).
 *
 * Renders the lead's notes prominently so the teammate has full context,
 * then offers a subject + caveat picker that composes the master body.
 * The caveat dropdown auto-suggests based on keywords in the notes.
 *
 * Default sender is the lead's `assigned_to`; falls back to the logged-in
 * user. Calendar line varies by sender — falls through to a "reply with
 * times" line for senders without a calendar link configured (Caren).
 */
export function PersonalNoteFollowUpPanel({ lead }: { lead: WorkhumanLead }) {
  const { user } = useAuth();

  const defaultSender: SenderName = useMemo(() => {
    // Prefer the lead's assignee — they're the one who had the conversation.
    if (lead.assigned_to && SENDER_NAMES.includes(lead.assigned_to as SenderName)) {
      return lead.assigned_to as SenderName;
    }
    const email = user?.email?.toLowerCase() || '';
    return EMAIL_TO_SENDER[email] || SENDER_NAMES[0];
  }, [lead.assigned_to, user]);

  const [senderName, setSenderName] = useState<SenderName>(defaultSender);
  useEffect(() => { setSenderName(defaultSender); }, [defaultSender]);

  const [subjectIdx, setSubjectIdx] = useState(0);
  const [selectedCaveatId, setSelectedCaveatId] = useState<string>(() => suggestCaveatForNotes(lead.notes));
  const [serviceInput, setServiceInput] = useState('');
  const [painPointInput, setPainPointInput] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Re-suggest when the lead changes (different notes).
  useEffect(() => { setSelectedCaveatId(suggestCaveatForNotes(lead.notes)); }, [lead.id, lead.notes]);

  const suggestedCaveatId = useMemo(() => suggestCaveatForNotes(lead.notes), [lead.notes]);
  const currentCaveat = PERSONAL_NOTE_CAVEATS.find(c => c.id === selectedCaveatId)!;

  const vars = useMemo(() => ({
    firstName: cleanFirstName(lead.name),
    company: lead.company || 'your team',
    senderName,
    service: serviceInput.trim(),
    painPoint: painPointInput.trim(),
    personalCaveat: fillTemplate(currentCaveat.body, {
      firstName: cleanFirstName(lead.name),
      company: lead.company || 'your team',
      senderName,
      service: serviceInput.trim(),
      painPoint: painPointInput.trim(),
    }),
    calendarLine: calendarLineForSender(senderName),
  }), [lead.name, lead.company, senderName, serviceInput, painPointInput, currentCaveat]);

  const filledBody = useMemo(() => fillTemplate(PERSONAL_NOTE_FOLLOWUP_EMAIL.body, vars), [vars]);
  const filledSubject = useMemo(
    () => fillTemplate(PERSONAL_NOTE_SUBJECT_LINES[subjectIdx], vars),
    [subjectIdx, vars]
  );

  const calendarLink = SENDER_TO_CALENDAR[senderName];
  const recipientEmail = lead.email && !lead.email.includes('@no-email.placeholder')
    ? lead.email
    : (lead.personal_email || null);

  const copy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch (e) { console.error('Copy failed:', e); }
  };

  const openInEmailClient = () => {
    if (!recipientEmail) return;
    const url = `mailto:${recipientEmail}?subject=${encodeURIComponent(filledSubject)}&body=${encodeURIComponent(filledBody)}`;
    window.open(url, '_blank');
  };

  const markSent = async () => {
    await logOutreach({
      leadId: lead.id,
      channel: 'email',
      templateId: PERSONAL_NOTE_FOLLOWUP_EMAIL.id + ':' + selectedCaveatId,
      senderName,
      messagePreview: filledBody.substring(0, 500),
    });
  };

  // Variable-input visibility depends on the chosen caveat
  const needsService = !!currentCaveat.requiresService;
  const needsPainPoint = !!currentCaveat.requiresPainPoint;
  // Greys out actions if a required input is empty
  const missingRequired = (needsService && !serviceInput.trim()) || (needsPainPoint && !painPointInput.trim());

  return (
    <div className="bg-white border-2 border-orange-200 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <StickyNote size={16} className="text-orange-600" />
          <span className="font-medium text-gray-900 text-sm">Personal Note Follow-Up</span>
          <span className="text-[11px] text-gray-500 italic">Hand-written, post-event email</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <label className="text-gray-500">From:</label>
          <select
            value={senderName}
            onChange={e => setSenderName(e.target.value as SenderName)}
            className="text-sm border border-gray-200 rounded px-2 py-1 bg-white"
          >
            {SENDER_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          {!calendarLink && (
            <span className="text-[11px] text-amber-700" title="No calendar link configured for this sender — using reply-with-times fallback">
              ⚠ no calendar link
            </span>
          )}
        </div>
      </div>

      {/* Lead notes display — primary context for the teammate */}
      {lead.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded p-3">
          <div className="text-[10px] uppercase tracking-wide text-amber-700 mb-1 font-medium">Booth conversation notes</div>
          <div className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{lead.notes}</div>
        </div>
      )}

      {/* Subject line */}
      <div className="space-y-1">
        <label className="text-xs text-gray-500 font-medium">Subject</label>
        <div className="flex items-center gap-2">
          <select
            value={subjectIdx}
            onChange={e => setSubjectIdx(Number(e.target.value))}
            className="flex-1 text-sm border border-gray-200 rounded px-2 py-1.5 bg-white"
          >
            {PERSONAL_NOTE_SUBJECT_LINES.map((s, i) => (
              <option key={i} value={i}>{fillTemplate(s, vars)}</option>
            ))}
          </select>
          <button
            onClick={() => copy(filledSubject, 'subject')}
            className="px-2.5 py-1.5 text-xs border border-gray-200 rounded hover:bg-gray-50 inline-flex items-center gap-1"
            title="Copy subject"
          >
            {copiedField === 'subject' ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
          </button>
        </div>
      </div>

      {/* Caveat scenario picker */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-xs text-gray-500 font-medium">Conversation scenario</label>
          {selectedCaveatId === suggestedCaveatId && (
            <span className="text-[11px] text-purple-700 inline-flex items-center gap-0.5" title="Suggested based on keywords in the notes">
              <Sparkles size={10} /> auto-suggested
            </span>
          )}
        </div>
        <select
          value={selectedCaveatId}
          onChange={e => setSelectedCaveatId(e.target.value)}
          className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 bg-white"
        >
          {PERSONAL_NOTE_CAVEATS.map(c => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Conditional variable inputs */}
      {needsService && (
        <div className="space-y-1">
          <label className="text-xs text-gray-500 font-medium">Service they mentioned</label>
          <input
            type="text"
            value={serviceInput}
            onChange={e => setServiceInput(e.target.value)}
            placeholder="e.g. chair massage, headshots, mindfulness"
            className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 bg-white"
          />
        </div>
      )}
      {needsPainPoint && (
        <div className="space-y-1">
          <label className="text-xs text-gray-500 font-medium">Pain point they mentioned</label>
          <input
            type="text"
            value={painPointInput}
            onChange={e => setPainPointInput(e.target.value)}
            placeholder="e.g. burnout in your support team, post-RTO morale dip"
            className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 bg-white"
          />
        </div>
      )}

      {/* Body preview */}
      <div className="space-y-1">
        <label className="text-xs text-gray-500 font-medium">Body</label>
        <textarea
          value={filledBody}
          readOnly
          rows={14}
          className="w-full text-xs font-mono border border-gray-200 rounded px-3 py-2 bg-gray-50 leading-relaxed resize-y"
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        <button
          onClick={() => copy(filledBody, 'body')}
          disabled={missingRequired}
          className="px-3 py-1.5 text-sm rounded font-medium inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {copiedField === 'body' ? <><Check size={14} /> Copied body</> : <><Copy size={14} /> Copy body</>}
        </button>
        <button
          onClick={openInEmailClient}
          disabled={!recipientEmail || missingRequired}
          className="px-3 py-1.5 text-sm rounded font-medium inline-flex items-center gap-1.5 bg-[#09364f] hover:bg-[#0c4d6e] text-white disabled:opacity-50 disabled:cursor-not-allowed"
          title={recipientEmail ? `Open in your email client (mailto:${recipientEmail})` : 'No recipient email on this lead'}
        >
          <Mail size={14} /> Open in email client
        </button>
        <button
          onClick={markSent}
          disabled={missingRequired}
          className="px-3 py-1.5 text-sm rounded font-medium inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          title="Log this send to the outreach history"
        >
          <Send size={14} /> Mark sent
        </button>
        {missingRequired && (
          <span className="text-[11px] text-amber-700">
            {needsService && !serviceInput.trim() && 'Fill in the service '}
            {needsPainPoint && !painPointInput.trim() && 'Fill in the pain point '}
            to enable
          </span>
        )}
      </div>
    </div>
  );
}
