import React, { useState, useMemo, useEffect } from 'react';
import { Copy, Check, Mail, Send, Sparkles, StickyNote, Loader2, RefreshCw, CheckCircle2, Linkedin, ExternalLink, MessageSquare } from 'lucide-react';
import { WorkhumanLead } from '../types/workhumanLead';
import {
  PERSONAL_NOTE_FOLLOWUP_EMAIL,
  PERSONAL_NOTE_FOLLOWUP_SMS,
  PERSONAL_NOTE_FOLLOWUP_2_VARIATIONS,
  PERSONAL_NOTE_CAVEATS,
  PERSONAL_NOTE_SUBJECT_LINES,
  POST_EVENT_LINKEDIN_CONNECT,
  SENDER_TO_CALENDAR,
  SENDER_NAMES,
  SenderName,
  fillTemplate,
  calendarLineForSender,
  suggestCaveatForNotes,
} from '../utils/workhumanOutreachTemplates';
import { logOutreach, fetchOutreachLogForLead } from '../services/WorkhumanLeadService';
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

export type AiTone = 'warm' | 'friendly' | 'enthusiastic' | 'direct' | 'curious';

const AI_TONES: { id: AiTone; label: string; hint: string }[] = [
  { id: 'warm', label: 'Warm', hint: 'Default — conversational, friendly but measured' },
  { id: 'friendly', label: 'Friendly', hint: 'More casual, peer-to-peer' },
  { id: 'enthusiastic', label: 'Enthusiastic', hint: 'Real energy, earned through specifics' },
  { id: 'direct', label: 'Direct', hint: 'Minimal warmth padding, get to the point' },
  { id: 'curious', label: 'Curious', hint: 'Lead with a wondering, invite them in' },
];

/**
 * Post-event email panel for leads with a real booth conversation
 * (i.e. `lead.notes` contains a manual `[stamp · Name]` entry).
 *
 * Renders the lead's notes prominently so the teammate has full context,
 * then offers a subject + caveat picker that composes the master body.
 * The caveat dropdown auto-suggests based on keywords in the notes; a
 * "Generate AI" button replaces it with a live LLM-generated opener
 * tailored to the specific notes (with a tone selector).
 *
 * Default sender is the lead's `assigned_to`; falls back to the logged-in
 * user. Calendar line varies by sender — falls through to a "reply with
 * times" line for senders without a calendar link configured (Caren).
 *
 * `onSentStateChange` lets parents (e.g. the rapid outreach queue) know
 * when this lead's personal-note follow-up has been marked sent so the
 * card-level badge can update without a page refresh.
 */
export function PersonalNoteFollowUpPanel({
  lead,
  onSentStateChange,
}: {
  lead: WorkhumanLead;
  onSentStateChange?: (sent: boolean) => void;
}) {
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
  // there's a "Reset to suggested" button that drops them. Drafts also
  // autosave to localStorage per-lead so a teammate can close the tab
  // and come back to where they left off (see effect below).
  const draftKey = `workhuman_pn_draft_${lead.id}`;
  const [bodyEdits, setBodyEdits] = useState<string | null>(() => {
    try { return localStorage.getItem(draftKey); } catch { return null; }
  });
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(() => {
    try {
      const raw = localStorage.getItem(`${draftKey}_savedAt`);
      return raw ? new Date(raw) : null;
    } catch { return null; }
  });

  // Live-LLM AI-generated FULL email body. When set, becomes a selectable
  // option in the caveat dropdown (top of the list) and replaces the
  // entire templated body (greeting through sign-off). Cleared on lead
  // change. The 8 templated caveats still slot into the templated body
  // — only the AI option swaps the whole thing.
  const [aiCaveat, setAiCaveat] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiMissing, setAiMissing] = useState<string[]>([]);
  const [aiTone, setAiTone] = useState<AiTone>('warm');

  const AI_CAVEAT_ID = '__ai_generated__';

  // Tracks whether THIS template has been marked as sent for this lead
  // (either earlier in the same session or in a prior session — the
  // outreach log is the source of truth on lead-change).
  const [sentAt, setSentAt] = useState<string | null>(null);
  const [sendingMark, setSendingMark] = useState(false);
  const [liSentAt, setLiSentAt] = useState<string | null>(null);
  const [smsSentAt, setSmsSentAt] = useState<string | null>(null);

  // Re-suggest when the lead changes (different notes), and load any
  // previously-saved draft from localStorage so the teammate picks up
  // where they left off. AI cache + sent state are per-lead and don't
  // carry across.
  useEffect(() => {
    setSelectedCaveatId(suggestCaveatForNotes(lead.notes));
    setServiceInput('');
    setPainPointInput('');
    setAiCaveat(null);
    setAiError(null);
    setAiMissing([]);
    setSentAt(null);
    setLiSentAt(null);
    setSmsSentAt(null);
    // Load draft from localStorage if one exists for this lead
    try {
      const draft = localStorage.getItem(`workhuman_pn_draft_${lead.id}`);
      const savedAtRaw = localStorage.getItem(`workhuman_pn_draft_${lead.id}_savedAt`);
      setBodyEdits(draft);
      setDraftSavedAt(savedAtRaw ? new Date(savedAtRaw) : null);
    } catch {
      setBodyEdits(null);
      setDraftSavedAt(null);
    }
    // Check the outreach log to see if either template was already sent
    // for this lead in a prior session — if so, surface that state.
    fetchOutreachLogForLead(lead.id).then(log => {
      const emailSend = log.find(entry =>
        entry.template_id?.startsWith(PERSONAL_NOTE_FOLLOWUP_EMAIL.id)
      );
      if (emailSend) setSentAt(emailSend.sent_at);
      const liSend = log.find(entry =>
        entry.template_id === POST_EVENT_LINKEDIN_CONNECT.id
      );
      if (liSend) setLiSentAt(liSend.sent_at);
      const smsSend = log.find(entry =>
        entry.template_id === PERSONAL_NOTE_FOLLOWUP_SMS.id
      );
      if (smsSend) setSmsSentAt(smsSend.sent_at);
    }).catch(() => { /* non-fatal */ });
    if (onSentStateChange) onSentStateChange(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id, lead.notes]);

  // Autosave drafts to localStorage as the teammate types. Debounced 500ms
  // so we're not hammering localStorage on every keystroke. Cleared
  // automatically on Mark Sent (the email's been sent, no draft to keep)
  // and on Reset to suggested (user explicitly threw away their edits).
  useEffect(() => {
    if (bodyEdits === null) {
      try {
        localStorage.removeItem(`workhuman_pn_draft_${lead.id}`);
        localStorage.removeItem(`workhuman_pn_draft_${lead.id}_savedAt`);
      } catch { /* non-fatal */ }
      setDraftSavedAt(null);
      return;
    }
    const t = setTimeout(() => {
      try {
        const now = new Date();
        localStorage.setItem(`workhuman_pn_draft_${lead.id}`, bodyEdits);
        localStorage.setItem(`workhuman_pn_draft_${lead.id}_savedAt`, now.toISOString());
        setDraftSavedAt(now);
      } catch { /* localStorage might be full or disabled */ }
    }, 500);
    return () => clearTimeout(t);
  }, [bodyEdits, lead.id]);

  /**
   * Hit the Netlify function and use the result as the FULL email body.
   * The AI generates greeting through sign-off — replaces the templated
   * body entirely when AI option is selected. Slot-based caveats are
   * unaffected.
   */
  const generateAi = async () => {
    if (!lead.notes) return;
    setAiLoading(true);
    setAiError(null);
    setAiMissing([]);
    try {
      const res = await fetch('/.netlify/functions/generate-personal-caveat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: lead.notes,
          firstName: cleanFirstName(lead.name),
          company: lead.company,
          senderName,
          tone: aiTone,
          calendarLink: SENDER_TO_CALENDAR[senderName] || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || data?.error || 'AI generation failed');
      const aiBody = (data.body || '').trim();
      if (!aiBody) throw new Error('Empty AI response');
      setAiCaveat(aiBody);
      setAiMissing(Array.isArray(data.missing) ? data.missing : []);
      setSelectedCaveatId(AI_CAVEAT_ID);
      // Drop any prior body edits so the body recomposes with the AI body.
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

  // When AI option is selected, the AI's body REPLACES the entire templated
  // body (greeting through sign-off). For the 8 templated caveats, we slot
  // the caveat into the templated body as before.
  const suggestedBody = useMemo(() => {
    if (isAiSelected && aiCaveat) return aiCaveat;
    return fillTemplate(PERSONAL_NOTE_FOLLOWUP_EMAIL.body, vars);
  }, [isAiSelected, aiCaveat, vars]);
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
      // The canonical CTA pattern is:
      //   "...grab a time from my calendar that works for you: {URL}"
      // For Gmail paste, we hyperlink "grab a time from my calendar"
      // in-place and drop the trailing ": {URL}". Falls back to a
      // line-level replace if the canonical pattern isn't found
      // (e.g. AI deviated, or the user edited the body).
      const hrefSafe = link.replace(/&amp;/g, '&');
      const escapedLinkInBody = link.replace(/&/g, '&amp;');
      const phrase = 'grab a time from my calendar';
      const canonicalPattern = `${phrase} that works for you: ${escapedLinkInBody}`;
      if (html.includes(canonicalPattern)) {
        html = html.replace(
          canonicalPattern,
          `<a href="${hrefSafe}">${phrase}</a> that works for you.`
        );
      } else {
        // Fallback: line-based replace. Anchor text = prose preceding URL
        // on its line; defaults to the phrase if line is just a bare URL.
        const lines = html.split('<br>');
        const updatedLines = lines.map(line => {
          if (!line.includes(escapedLinkInBody)) return line;
          const before = line.replace(escapedLinkInBody, '').trim().replace(/[:?]$/, '').trim();
          const anchorText = before || phrase;
          return `<a href="${hrefSafe}">${anchorText}</a>`;
        });
        html = updatedLines.join('<br>');
      }
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

  // LinkedIn connect note + URL — composed once per render, not memoized
  // because it's a fast string concat.
  const liNote = fillTemplate(POST_EVENT_LINKEDIN_CONNECT.body, vars);
  const liProfileUrl = lead.linkedin_url
    ? (lead.linkedin_url.startsWith('http') ? lead.linkedin_url : `https://${lead.linkedin_url}`)
    : (lead.name
      ? `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(lead.name + (lead.company ? ' ' + lead.company : ''))}`
      : null);

  // SMS follow-up — short text the teammate copies and sends from their
  // own phone via Messages. Pick the best phone we have, in priority order:
  // signup_phone (entered at booth, almost always cell) > mobile_phone
  // (enrichment) > phone (general). Skip work_phone — that's an office line.
  const smsPhoneRaw = lead.signup_phone || lead.mobile_phone || lead.phone || null;
  const smsPhoneDigits = smsPhoneRaw ? (smsPhoneRaw.match(/\d/g) || []).join('') : '';
  // Format for sms: link. iOS expects E.164 (+1XXXXXXXXXX), works on macOS too.
  const smsPhoneE164 = smsPhoneDigits.length === 10
    ? `+1${smsPhoneDigits}`
    : smsPhoneDigits.length === 11 && smsPhoneDigits.startsWith('1')
      ? `+${smsPhoneDigits}`
      : smsPhoneDigits.length >= 10 ? `+${smsPhoneDigits}` : null;
  // Pretty display: (415) 555-1234 for 10-digit US, raw otherwise.
  const smsPhoneDisplay = smsPhoneDigits.length === 10
    ? `(${smsPhoneDigits.slice(0, 3)}) ${smsPhoneDigits.slice(3, 6)}-${smsPhoneDigits.slice(6)}`
    : smsPhoneRaw;
  const senderFirstName = (senderName || '').split(/\s+/)[0] || senderName;
  const smsBody = fillTemplate(PERSONAL_NOTE_FOLLOWUP_SMS.body, {
    ...vars,
    senderFirstName,
  });

  // sms: URL scheme — Apple uses `&body=` per their docs; iOS and macOS both
  // accept it. Android also accepts `&body=` in modern versions. Rendered as
  // an actual <a href> below so macOS hands the URL to Messages.app reliably
  // (assigning to window.location is sometimes silently blocked by the
  // browser when the click isn't part of a same-tick user gesture).
  const smsHref = smsPhoneE164
    ? `sms:${smsPhoneE164}&body=${encodeURIComponent(smsBody)}`
    : null;

  // Click handler runs synchronously BEFORE the browser hands the sms: URL
  // off to Messages.app, so the clipboard write and outreach log fire even
  // if the OS swallows the protocol invocation.
  const handleSmsClick = async () => {
    if (!smsHref) return;
    try { await navigator.clipboard.writeText(smsBody); } catch (_) { /* non-fatal */ }
    setCopiedField('sms_action');
    setTimeout(() => setCopiedField(null), 1500);
    const ok = await logOutreach({
      leadId: lead.id,
      channel: 'sms',
      templateId: PERSONAL_NOTE_FOLLOWUP_SMS.id,
      senderName,
      messagePreview: smsBody.substring(0, 500),
    });
    if (ok) setSmsSentAt(new Date().toISOString());
    // Don't call preventDefault — let the <a href="sms:..."> navigate so
    // macOS routes the URL to Messages.app via the registered handler.
  };

  const sendLinkedInConnect = async () => {
    if (!liProfileUrl) return;
    // Copy the connection note to clipboard, then open the profile.
    // LinkedIn's connection-request dialog doesn't accept a pre-filled
    // note via URL — the teammate pastes it after clicking "Add a note".
    try { await navigator.clipboard.writeText(liNote); } catch (_) { /* non-fatal */ }
    setCopiedField('li_note');
    setTimeout(() => setCopiedField(null), 1500);
    window.open(liProfileUrl, '_blank', 'noopener');
    // Optimistically log it. If they didn't actually send the LI invite
    // there's no harm — they can re-click and we'll log a duplicate
    // entry, which is fine for now.
    const ok = await logOutreach({
      leadId: lead.id,
      channel: 'linkedin_connect',
      templateId: POST_EVENT_LINKEDIN_CONNECT.id,
      senderName,
      messagePreview: liNote.substring(0, 500),
    });
    if (ok) setLiSentAt(new Date().toISOString());
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
    setSendingMark(true);
    const ok = await logOutreach({
      leadId: lead.id,
      channel: 'email',
      templateId: PERSONAL_NOTE_FOLLOWUP_EMAIL.id + ':' + selectedCaveatId,
      senderName,
      messagePreview: filledBody.substring(0, 500),
    });
    if (ok) {
      const now = new Date().toISOString();
      setSentAt(now);
      // Clear the draft — the email's been sent, no reason to keep editing it.
      setBodyEdits(null);
      try {
        localStorage.removeItem(`workhuman_pn_draft_${lead.id}`);
        localStorage.removeItem(`workhuman_pn_draft_${lead.id}_savedAt`);
      } catch { /* non-fatal */ }
      if (onSentStateChange) onSentStateChange(true);
    }
    setSendingMark(false);
  };

  // Variable-input visibility depends on the chosen caveat. AI-generated
  // openers don't have placeholder vars (the model already has the notes).
  const needsService = !isAiSelected && !!currentCaveat?.requiresService;
  const needsPainPoint = !isAiSelected && !!currentCaveat?.requiresPainPoint;
  // Source of truth for "is this email ready to send" is the BODY itself,
  // not the input fields. If the teammate prefers to edit the body
  // directly (replacing [pain point] / [service] inline) instead of using
  // the input fields above, that should unlock the action buttons too.
  const bodyPlaceholderMatch = filledBody.match(/\[(pain point|service)\]/i);
  const missingRequired = !!bodyPlaceholderMatch;

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

      {/* LinkedIn quick-connect — copies the connection note to clipboard
          and opens the lead's profile. Falls back to a name+company
          search URL when linkedin_url is missing. */}
      <div className="bg-blue-50 border border-blue-200 rounded p-2.5 flex items-center gap-2 flex-wrap">
        <Linkedin size={16} className="text-[#0a66c2] shrink-0" />
        <div className="flex-1 min-w-[120px]">
          <div className="text-xs font-medium text-gray-900">LinkedIn connection request</div>
          <div className="text-[11px] text-gray-600 truncate" title={liNote}>{liNote}</div>
        </div>
        <button
          onClick={() => copy(liNote, 'li_note_only')}
          className="text-[11px] text-gray-700 hover:text-gray-900 inline-flex items-center gap-1 px-2 py-1 border border-gray-200 rounded hover:bg-white"
          title="Copy just the connection note"
        >
          {copiedField === 'li_note_only' ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy note</>}
        </button>
        <button
          onClick={sendLinkedInConnect}
          disabled={!liProfileUrl}
          className={`text-xs font-medium inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-white whitespace-nowrap ${liSentAt ? 'bg-green-600 hover:bg-green-700' : 'bg-[#0a66c2] hover:bg-[#0855a3]'} disabled:opacity-50 disabled:cursor-not-allowed`}
          title={liProfileUrl
            ? (lead.linkedin_url
              ? 'Copy the note and open this lead\'s LinkedIn profile in a new tab'
              : 'No LinkedIn URL on file — opens a name+company search instead')
            : 'No LinkedIn URL or name to search by'}
        >
          {liSentAt ? <><CheckCircle2 size={12} /> Sent {new Date(liSentAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</>
            : <><ExternalLink size={12} /> {lead.linkedin_url ? 'Connect on LinkedIn' : 'Search LinkedIn'}</>}
        </button>
      </div>

      {/* SMS follow-up — quick text nudge after the email goes out.
          Same shape as the LinkedIn block above: shows the body, copy
          button, and a tap-to-Messages action. Disabled when we have
          no phone for the lead. */}
      <div className="bg-emerald-50 border border-emerald-200 rounded p-2.5 flex items-center gap-2 flex-wrap">
        <MessageSquare size={16} className="text-emerald-700 shrink-0" />
        <div className="flex-1 min-w-[120px]">
          <div className="text-xs font-medium text-gray-900">
            Text follow-up
            {smsPhoneDisplay && (
              <span className="ml-1.5 text-[11px] font-normal text-gray-600">to {smsPhoneDisplay}</span>
            )}
            {!smsPhoneDisplay && (
              <span className="ml-1.5 text-[11px] font-normal text-amber-700">no phone on file</span>
            )}
          </div>
          <div className="text-[11px] text-gray-600 truncate" title={smsBody}>{smsBody}</div>
        </div>
        <button
          onClick={() => copy(smsBody, 'sms')}
          className="text-[11px] text-gray-700 hover:text-gray-900 inline-flex items-center gap-1 px-2 py-1 border border-gray-200 rounded hover:bg-white"
          title="Copy just the message body"
        >
          {copiedField === 'sms' ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy text</>}
        </button>
        {smsHref ? (
          <a
            href={smsHref}
            onClick={handleSmsClick}
            className={`text-xs font-medium inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-white whitespace-nowrap ${smsSentAt ? 'bg-green-600 hover:bg-green-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            title="Opens Messages.app on macOS (or the system SMS app on iOS) with this lead's number and the message body pre-filled"
          >
            {smsSentAt ? <><CheckCircle2 size={12} /> Sent {new Date(smsSentAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</>
              : <><ExternalLink size={12} /> Open in Messages</>}
          </a>
        ) : (
          <span
            className="text-xs font-medium inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-white whitespace-nowrap bg-emerald-600 opacity-50 cursor-not-allowed"
            title="No phone on file — add one to the lead to enable SMS"
          >
            <ExternalLink size={12} /> Open in Messages
          </span>
        )}
      </div>

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
        <div className="flex gap-2 flex-wrap">
          <select
            value={selectedCaveatId}
            onChange={e => { setSelectedCaveatId(e.target.value); setBodyEdits(null); }}
            className="flex-1 min-w-[200px] text-sm border border-gray-200 rounded px-2 py-1.5 bg-white"
          >
            {aiCaveat && (
              <option value={AI_CAVEAT_ID}>✨ AI-generated opener (tailored to your notes)</option>
            )}
            {PERSONAL_NOTE_CAVEATS.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <select
            value={aiTone}
            onChange={e => setAiTone(e.target.value as AiTone)}
            className="text-sm border border-gray-200 rounded px-2 py-1.5 bg-white"
            title="Tone for the AI-generated opener"
          >
            {AI_TONES.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
          <button
            onClick={generateAi}
            disabled={aiLoading || !lead.notes}
            className="px-3 py-1.5 text-sm rounded font-medium inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            title={`Generate a ${aiTone} opener live from the booth notes via Claude`}
          >
            {aiLoading ? <><Loader2 size={14} className="animate-spin" /> Generating</>
              : aiCaveat ? <><RefreshCw size={14} /> Regenerate</>
              : <><Sparkles size={14} /> Generate AI</>}
          </button>
        </div>
        {aiError && (
          <div className="text-[11px] text-red-600 mt-1">⚠ {aiError}</div>
        )}
        {aiMissing.length > 0 && isAiSelected && (
          <div className="text-[11px] text-amber-700 mt-1">
            ⚠ AI output is missing: {aiMissing.join(', ').replace(/_/g, ' ')}. Edit the body or regenerate.
          </div>
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
          notes are the raw material; the caveat is just a starting frame.
          Edits autosave to localStorage per-lead so closing the tab and
          coming back picks up where you left off. */}
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <label className="text-xs text-gray-500 font-medium">Body — edit freely to incorporate specifics from the conversation</label>
          <div className="flex items-center gap-2">
            {bodyEdits !== null && draftSavedAt && (
              <span className="text-[11px] text-green-700 inline-flex items-center gap-1" title={`Draft autosaved at ${draftSavedAt.toLocaleString()}`}>
                <CheckCircle2 size={10} /> Draft saved {draftSavedAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              </span>
            )}
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
        {sentAt ? (
          <button
            onClick={markSent}
            disabled={sendingMark}
            className="px-3 py-1.5 text-sm rounded font-medium inline-flex items-center gap-1.5 bg-green-100 text-green-800 border border-green-300 hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title={`Personal-note follow-up was marked sent on ${new Date(sentAt).toLocaleString()}. Click to log another send.`}
          >
            <CheckCircle2 size={14} /> Sent {new Date(sentAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </button>
        ) : (
          <button
            onClick={markSent}
            disabled={missingRequired || sendingMark}
            className="px-3 py-1.5 text-sm rounded font-medium inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            title="Log this send to the outreach history"
          >
            {sendingMark ? <><Loader2 size={14} className="animate-spin" /> Logging</> : <><Send size={14} /> Mark sent</>}
          </button>
        )}
        {missingRequired && bodyPlaceholderMatch && (
          <span className="text-[11px] text-amber-700">
            Body contains a [{bodyPlaceholderMatch[1]}] placeholder. Fill in the field above, or edit the body to replace it.
          </span>
        )}
      </div>

      <div className="text-[11px] text-gray-500 pt-1 leading-relaxed">
        <strong>Recommended flow:</strong> Read the booth notes above. Edit the body to weave in something specific you actually talked about. Then "Copy for Gmail" → paste into Gmail compose → send. Hit "Mark sent" here so we log it.
      </div>

      {/* Follow-up #2 — only relevant if the first email got no reply.
          Reply ON the original Gmail thread (no new subject). These are
          deliberately tiny; our SmartLead data shows the simple seq-2
          bump out-replies every other touch. Copy-only, additive — does
          not touch the main email's subject/caveat/AI/send machinery. */}
      <div className="border-t border-gray-200 pt-3 mt-1 space-y-2">
        <div className="flex items-center gap-1.5">
          <RefreshCw size={13} className="text-gray-500" />
          <span className="text-xs font-semibold text-gray-700">
            No reply after a few days? Follow-up 2
          </span>
        </div>
        <p className="text-[11px] text-gray-500 leading-relaxed">
          Reply on the <strong>same Gmail thread</strong> — no new subject. Keep it as short as these are; the simple bump is our highest-reply touch.
        </p>
        {PERSONAL_NOTE_FOLLOWUP_2_VARIATIONS.map(v => {
          const fu2Body = fillTemplate(v.body, vars);
          const fieldKey = `fu2_${v.id}`;
          return (
            <div key={v.id} className="border border-gray-200 rounded p-2.5 bg-gray-50 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-gray-700">{v.label}</span>
                <button
                  onClick={() => copy(fu2Body, fieldKey)}
                  className="px-2 py-1 text-[11px] border border-gray-300 rounded bg-white hover:bg-gray-100 inline-flex items-center gap-1 shrink-0"
                  title={v.description}
                >
                  {copiedField === fieldKey ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                </button>
              </div>
              <div className="text-[11px] text-gray-600 whitespace-pre-line leading-relaxed">{fu2Body}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
