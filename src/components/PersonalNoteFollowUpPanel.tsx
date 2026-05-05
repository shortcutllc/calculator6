import React, { useState, useMemo, useEffect } from 'react';
import { Copy, Check, Mail, Send, Sparkles, StickyNote, Loader2, RefreshCw } from 'lucide-react';
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
  // Manual edits to the body persist across caveat/sender changes — but
  // there's a "Reset to suggested" button that drops them. The flag
  // tracks whether the user has typed in the body textarea.
  const [bodyEdits, setBodyEdits] = useState<string | null>(null);

  // Live-LLM AI-generated opener. When set, becomes a selectable option in
  // the caveat dropdown (top of the list). Cleared on lead change.
  const [aiCaveat, setAiCaveat] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const AI_CAVEAT_ID = '__ai_generated__';

  // Re-suggest when the lead changes (different notes), and clear any
  // body edits + AI cache — those are per-lead and shouldn't carry across.
  useEffect(() => {
    setSelectedCaveatId(suggestCaveatForNotes(lead.notes));
    setBodyEdits(null);
    setServiceInput('');
    setPainPointInput('');
    setAiCaveat(null);
    setAiError(null);
  }, [lead.id, lead.notes]);

  /** Hit the Netlify function and use the result as the active caveat. */
  const generateAi = async () => {
    if (!lead.notes) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/.netlify/functions/generate-personal-caveat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: lead.notes,
          firstName: cleanFirstName(lead.name),
          company: lead.company,
          senderName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || data?.error || 'AI generation failed');
      const caveat = (data.caveat || '').trim();
      if (!caveat) throw new Error('Empty AI response');
      setAiCaveat(caveat);
      setSelectedCaveatId(AI_CAVEAT_ID);
      // Drop any prior body edits so the body recomposes with the new AI caveat.
      setBodyEdits(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setAiError(msg);
    } finally {
      setAiLoading(false);
    }
  };

  const suggestedCaveatId = useMemo(() => suggestCaveatForNotes(lead.notes), [lead.notes]);
  const isAiSelected = selectedCaveatId === AI_CAVEAT_ID;
  const currentCaveat = isAiSelected
    ? null
    : PERSONAL_NOTE_CAVEATS.find(c => c.id === selectedCaveatId) || PERSONAL_NOTE_CAVEATS[0];

  const vars = useMemo(() => {
    const baseVars = {
      firstName: cleanFirstName(lead.name),
      company: lead.company || 'your team',
      senderName,
      service: serviceInput.trim(),
      painPoint: painPointInput.trim(),
    };
    // The active caveat is either the AI-generated text (used verbatim — no
    // template substitution since the AI was already given the lead context)
    // OR a templated caveat with `{service}` / `{pain_point}` filled in.
    const personalCaveat = isAiSelected && aiCaveat
      ? aiCaveat
      : fillTemplate(currentCaveat?.body || '', baseVars);
    return {
      ...baseVars,
      personalCaveat,
      calendarLine: calendarLineForSender(senderName),
    };
  }, [lead.name, lead.company, senderName, serviceInput, painPointInput, currentCaveat, isAiSelected, aiCaveat]);

  const suggestedBody = useMemo(() => fillTemplate(PERSONAL_NOTE_FOLLOWUP_EMAIL.body, vars), [vars]);
  const filledBody = bodyEdits ?? suggestedBody;
  const filledSubject = useMemo(
    () => fillTemplate(PERSONAL_NOTE_SUBJECT_LINES[subjectIdx], vars),
    [subjectIdx, vars]
  );

  /**
   * Build an HTML version of the body with the calendar link as a real
   * `<a href>`. Used for the Copy-as-HTML button so the email pastes into
   * Gmail compose with the calendar URL hyperlinked behind anchor text.
   */
  const buildHtmlBody = (): string => {
    const link = SENDER_TO_CALENDAR[senderName];
    let html = filledBody
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
    if (link) {
      // Replace "Grab a time that works for you: <url>" with a hyperlinked phrase.
      // The URL has been HTML-escaped by the previous step (& → &amp;), undo for href.
      const hrefSafe = link.replace(/&amp;/g, '&');
      const escapedLinkInBody = link.replace(/&/g, '&amp;');
      const phrase = 'Grab a time that works for you';
      html = html.replace(
        `${phrase}: ${escapedLinkInBody}`,
        `<a href="${hrefSafe}">${phrase}</a>`
      );
    }
    return `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #1a1a1a;">${html}</div>`;
  };

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

  /**
   * Copy the body in BOTH plain-text and rich HTML formats. When pasted
   * into Gmail compose, the HTML wins and the calendar URL renders as
   * "Grab a time that works for you" anchor text. Falls back to plain
   * text-only on browsers that don't support the rich Clipboard API.
   */
  const copyAsHtml = async () => {
    try {
      const html = buildHtmlBody();
      const plain = filledBody;
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([plain], { type: 'text/plain' }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(plain);
      }
      setCopiedField('html');
      setTimeout(() => setCopiedField(null), 1500);
    } catch (e) {
      console.error('Rich copy failed, falling back to plain:', e);
      copy(filledBody, 'html');
    }
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

  // Variable-input visibility depends on the chosen caveat. AI-generated
  // openers don't have placeholder vars (the model already has the notes).
  const needsService = !isAiSelected && !!currentCaveat?.requiresService;
  const needsPainPoint = !isAiSelected && !!currentCaveat?.requiresPainPoint;
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

      {/* Caveat scenario picker — AI-generated opener (when present)
          appears at the top, then the 8 templated scenarios. */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-xs text-gray-500 font-medium">Opener</label>
          {isAiSelected ? (
            <span className="text-[11px] text-purple-700 inline-flex items-center gap-0.5" title="Generated live from the booth notes">
              <Sparkles size={10} /> AI-generated
            </span>
          ) : selectedCaveatId === suggestedCaveatId && (
            <span className="text-[11px] text-purple-700 inline-flex items-center gap-0.5" title="Suggested based on keywords in the notes">
              <Sparkles size={10} /> auto-suggested
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <select
            value={selectedCaveatId}
            onChange={e => { setSelectedCaveatId(e.target.value); setBodyEdits(null); }}
            className="flex-1 text-sm border border-gray-200 rounded px-2 py-1.5 bg-white"
          >
            {aiCaveat && (
              <option value={AI_CAVEAT_ID}>✨ AI-generated opener (tailored to your notes)</option>
            )}
            {PERSONAL_NOTE_CAVEATS.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <button
            onClick={generateAi}
            disabled={aiLoading || !lead.notes}
            className="px-3 py-1.5 text-sm rounded font-medium inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            title="Generate a personalized opener live from the booth notes via Claude"
          >
            {aiLoading ? <><Loader2 size={14} className="animate-spin" /> Generating</>
              : aiCaveat ? <><RefreshCw size={14} /> Regenerate</>
              : <><Sparkles size={14} /> Generate AI</>}
          </button>
        </div>
        {aiError && (
          <div className="text-[11px] text-red-600 mt-1">⚠ {aiError}</div>
        )}
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

      {/* Body — editable so the teammate can weave specifics from the booth
          notes (above) into the email beyond what the caveat covers. The
          notes are the raw material; the caveat is just a starting frame. */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-xs text-gray-500 font-medium">Body — edit freely to incorporate specifics from the conversation</label>
          {bodyEdits !== null && (
            <button
              onClick={() => setBodyEdits(null)}
              className="text-[11px] text-gray-500 hover:text-gray-700 underline"
              title="Discard edits and restore the auto-composed body"
            >
              Reset to suggested
            </button>
          )}
        </div>
        <textarea
          value={filledBody}
          onChange={e => setBodyEdits(e.target.value)}
          rows={14}
          className="w-full text-xs font-mono border border-gray-200 rounded px-3 py-2 bg-white leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300"
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        <button
          onClick={copyAsHtml}
          disabled={missingRequired}
          className="px-3 py-1.5 text-sm rounded font-medium inline-flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          title="Copy with the calendar URL hyperlinked behind 'Grab a time that works for you'. Paste straight into Gmail compose."
        >
          {copiedField === 'html' ? <><Check size={14} /> Copied (rich)</> : <><Copy size={14} /> Copy for Gmail</>}
        </button>
        <button
          onClick={() => copy(filledBody, 'body')}
          disabled={missingRequired}
          className="px-3 py-1.5 text-sm rounded font-medium inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Copy as plain text — calendar URL stays as a raw link"
        >
          {copiedField === 'body' ? <><Check size={14} /> Copied plain</> : <><Copy size={14} /> Copy plain</>}
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

      <div className="text-[11px] text-gray-500 pt-1 leading-relaxed">
        <strong>Recommended flow:</strong> Read the booth notes above. Edit the body to weave in something specific you actually talked about. Then "Copy for Gmail" → paste into Gmail compose → send. Hit "Mark sent" here so we log it.
      </div>
    </div>
  );
}
