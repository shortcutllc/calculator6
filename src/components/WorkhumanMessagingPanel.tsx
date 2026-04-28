import React, { useState, useMemo, useEffect } from 'react';
import {
  Copy, Check, ExternalLink, MessageSquare, Mail, Linkedin, Send, History,
} from 'lucide-react';
import { WorkhumanLead, LeadOutreachLog, OutreachChannel } from '../types/workhumanLead';
import {
  WORKHUMAN_DM, LINKEDIN_CONNECT, LINKEDIN_DM_AFTER_ACCEPT,
  DM_REPLY_FOLLOWUP_EMAIL, COLD_EMAIL,
  BOOKING_CONFIRMATION_A, BOOKING_CONFIRMATION_B,
  NO_SHOW_RECOVERY,
  EMAIL_SUBJECT_LINES, SENDER_NAMES, SenderName,
  fillTemplate, workhumanDmUrl, slugFromLandingUrl, Template,
} from '../utils/workhumanOutreachTemplates';
import { logOutreach, fetchOutreachLogForLead } from '../services/WorkhumanLeadService';
import { useAuth } from '../contexts/AuthContext';

// Map logged-in user email → sender name so emails get attributed to
// the right person automatically (no manual dropdown required).
const EMAIL_TO_SENDER: Record<string, SenderName> = {
  'will@getshortcut.co': 'Will Newton',
  'jaimie@getshortcut.co': 'Jaimie Pritchard',
  'marc@getshortcut.co': 'Marc Levitan',
  'caren@getshortcut.co': 'Caren Skutch',
};

const CHANNEL_ICONS: Record<OutreachChannel, React.ReactNode> = {
  workhuman_dm: <MessageSquare size={13} />,
  linkedin_connect: <Linkedin size={13} />,
  linkedin_dm: <Linkedin size={13} />,
  email: <Mail size={13} />,
};

const CHANNEL_LABELS: Record<OutreachChannel, string> = {
  workhuman_dm: 'Workhuman DM',
  linkedin_connect: 'LinkedIn Connect',
  linkedin_dm: 'LinkedIn DM',
  email: 'Email',
};

type TabId = 'whdm' | 'li_connect' | 'li_dm' | 'dm_reply_email' | 'email_body' | 'booking_a' | 'booking_b' | 'no_show';

const TABS: Array<{ id: TabId; label: string; template: Template; channel: OutreachChannel }> = [
  { id: 'whdm', label: 'WH DM', template: WORKHUMAN_DM, channel: 'workhuman_dm' },
  { id: 'li_connect', label: 'LI Connect', template: LINKEDIN_CONNECT, channel: 'linkedin_connect' },
  { id: 'li_dm', label: 'LI DM', template: LINKEDIN_DM_AFTER_ACCEPT, channel: 'linkedin_dm' },
  { id: 'dm_reply_email', label: 'DM Reply → Email', template: DM_REPLY_FOLLOWUP_EMAIL, channel: 'email' },
  { id: 'email_body', label: 'Cold Email', template: COLD_EMAIL, channel: 'email' },
  { id: 'booking_a', label: 'Booking ✓ (A)', template: BOOKING_CONFIRMATION_A, channel: 'email' },
  { id: 'booking_b', label: 'Booking ✓ (B — ask for mobile)', template: BOOKING_CONFIRMATION_B, channel: 'email' },
  { id: 'no_show', label: 'No-Show Recovery', template: NO_SHOW_RECOVERY, channel: 'email' },
];

function sanitizeSlug(company: string): string {
  return company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Extract a clean first name from a full name string. Strips common
 * honorifics ("Mrs.", "Dr.", "Mx", etc.) so templates render "Hey Susana"
 * even when the CRM has "Mrs. Susana Castaneira".
 */
const HONORIFIC_RE = /^(Mr|Mrs|Ms|Mx|Dr|Prof|Sir|Madam|Miss|Mister|Mister\.|Mr\.|Mrs\.|Ms\.|Mx\.|Dr\.|Prof\.)\.?\s+/i;
function cleanFirstName(fullName: string | null | undefined): string {
  if (!fullName) return '';
  const stripped = fullName.replace(HONORIFIC_RE, '').trim();
  return (stripped.split(/\s+/)[0] || '').trim();
}

export function WorkhumanMessagingPanel({ lead }: { lead: WorkhumanLead }) {
  const { user } = useAuth();
  const authedSender: SenderName | null = useMemo(() => {
    const email = user?.email?.toLowerCase() || '';
    return EMAIL_TO_SENDER[email] || null;
  }, [user]);

  const [senderName, setSenderName] = useState<SenderName>(() => {
    // Clean up legacy key from the old system
    localStorage.removeItem('workhuman_sender_name');
    // Priority: explicit override in localStorage > auth user > fallback to Will
    const stored = localStorage.getItem('workhuman_sender_name_override') as SenderName | null;
    if (stored && SENDER_NAMES.includes(stored)) return stored;
    return SENDER_NAMES[0];
  });
  const [manualOverride, setManualOverride] = useState<boolean>(() => !!localStorage.getItem('workhuman_sender_name_override'));
  const [activeTab, setActiveTab] = useState<TabId>('whdm');
  const [subjectIdx, setSubjectIdx] = useState(0);
  const [customBody, setCustomBody] = useState<string>('');
  const [useCustomBody, setUseCustomBody] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [history, setHistory] = useState<LeadOutreachLog[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const tab = TABS.find(t => t.id === activeTab)!;

  const vars = useMemo(() => {
    // Append ?lead={id} to the landing page URL so the form can auto-prefill
    // when this specific lead clicks through
    const baseUrl = lead.landing_page_url;
    const urlWithLead = baseUrl
      ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}lead=${lead.id}`
      : undefined;

    // Day + time used by booking confirmation templates. We try, in order:
    //  1. vip_slot_time on the lead (set by Book-at-Booth modal — exact start time)
    //  2. Time parsed from notes ("Preferred: <day> · <time>")
    //  3. Empty (renders as [time] placeholder)
    const dayLabels: Record<string, string> = {
      day_1: 'Monday, April 27',
      day_2: 'Tuesday, April 28',
      day_3: 'Wednesday, April 29',
    };
    const day = lead.vip_slot_day ? dayLabels[lead.vip_slot_day] || lead.vip_slot_day : '';
    let time = (lead.vip_slot_time || '').trim();
    if (!time && lead.notes) {
      const m = lead.notes.match(/Preferred:\s*([^.]+?)(?:\.|$)/i);
      if (m) {
        const value = m[1].trim();
        // Strip leading day name + separator (e.g. "Mon Apr 27 · 1:00-3:00 PM" → "1:00-3:00 PM")
        time = value.replace(/^(Mon|Tue|Wed|Thu)\s+\w+\s+\d+\s*[·\-—]\s*/i, '');
      }
    }

    return {
      firstName: cleanFirstName(lead.name),
      company: lead.company || '',
      senderName,
      landingPageUrl: urlWithLead,
      companySlug: slugFromLandingUrl(lead.landing_page_url) || (lead.company ? sanitizeSlug(lead.company) : ''),
      day,
      time,
    };
  }, [lead, senderName]);

  const filled = useMemo(() => fillTemplate(tab.template.body, vars), [tab, vars]);
  // Pick subject lines from the active template if it has them, else fall back
  // to the standard cold-email rotation.
  const activeSubjects = useMemo(() => {
    const t = tab.template as { subjectLines?: string[] };
    return t.subjectLines && t.subjectLines.length ? t.subjectLines : EMAIL_SUBJECT_LINES;
  }, [tab]);
  const filledSubject = useMemo(
    () => fillTemplate(activeSubjects[subjectIdx % activeSubjects.length], vars),
    [activeSubjects, subjectIdx, vars]
  );

  const bodyToUse = useCustomBody && customBody ? customBody : filled;
  const charCount = bodyToUse.length;
  const overLimit = tab.template.charLimit !== undefined && charCount > tab.template.charLimit;

  const whDmUrl = workhumanDmUrl(lead.workhuman_attendee_id);
  const linkedinSearchUrl = lead.name
    ? `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(lead.name + (lead.company ? ' ' + lead.company : ''))}`
    : null;

  // Sync senderName to auth user unless there's a manual override
  useEffect(() => {
    if (!manualOverride && authedSender) {
      setSenderName(authedSender);
    }
  }, [authedSender, manualOverride]);

  // Persist override (only when user explicitly picks a different sender)
  useEffect(() => {
    if (manualOverride) {
      localStorage.setItem('workhuman_sender_name_override', senderName);
    }
  }, [senderName, manualOverride]);

  // Clear override: revert to auth-derived sender
  const clearOverride = () => {
    localStorage.removeItem('workhuman_sender_name_override');
    setManualOverride(false);
    if (authedSender) setSenderName(authedSender);
  };

  // Reset custom body + subject index when switching tabs
  useEffect(() => {
    setCustomBody('');
    setUseCustomBody(false);
    setSubjectIdx(0);
  }, [activeTab]);

  // Load history
  useEffect(() => {
    fetchOutreachLogForLead(lead.id).then(setHistory);
  }, [lead.id]);

  const copy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch (e) {
      console.error('Copy failed:', e);
    }
  };

  const markSent = async () => {
    const ok = await logOutreach({
      leadId: lead.id,
      channel: tab.channel,
      templateId: tab.template.id,
      senderName,
      messagePreview: bodyToUse.substring(0, 500),
    });
    if (ok) {
      fetchOutreachLogForLead(lead.id).then(setHistory);
    }
  };

  const sentChannels = new Set(history.map(h => h.channel));

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      {/* Header row: sender dropdown + history toggle */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <MessageSquare size={15} className="text-amber-600" />
          <span className="font-medium text-gray-700 text-sm">Outreach</span>
          <span className="text-gray-300">•</span>
          <label className="text-xs text-gray-500">From:</label>
          <select
            value={senderName}
            onChange={e => { setSenderName(e.target.value as SenderName); setManualOverride(true); }}
            className={`text-sm border rounded px-2 py-1 bg-white ${manualOverride ? 'border-amber-400' : 'border-gray-200'}`}
            title={manualOverride ? 'Manual override — click reset to use your logged-in identity' : `Auto-set to logged-in user (${user?.email || 'unknown'})`}
          >
            {SENDER_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          {manualOverride && (
            <button
              onClick={clearOverride}
              className="text-[11px] text-amber-700 hover:text-amber-900 underline"
              title="Reset to logged-in user"
            >
              reset
            </button>
          )}
          {!authedSender && user?.email && (
            <span className="text-[11px] text-red-500" title={`${user.email} isn't mapped to a sender. Using fallback.`}>
              ⚠ unmapped
            </span>
          )}
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="text-xs text-gray-600 hover:text-gray-800 inline-flex items-center gap-1"
        >
          <History size={12} /> {history.length} sent
        </button>
      </div>

      {/* Channel history chips */}
      {history.length > 0 && showHistory && (
        <div className="text-xs text-gray-500 border-b pb-2 space-y-1">
          {history.slice(0, 5).map(h => (
            <div key={h.id} className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-gray-700">
                {CHANNEL_ICONS[h.channel]} {CHANNEL_LABELS[h.channel]}
              </span>
              <span className="text-gray-400">·</span>
              <span>{h.sender_name}</span>
              <span className="text-gray-400">·</span>
              <span>{new Date(h.sent_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-gray-100 pb-2">
        {TABS.map(t => {
          const isActive = t.id === activeTab;
          const sent = sentChannels.has(t.channel);
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 transition-colors ${
                isActive
                  ? 'bg-amber-600 text-white'
                  : sent
                  ? 'bg-green-50 text-green-700 hover:bg-green-100'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {CHANNEL_ICONS[t.channel]}
              {t.label}
              {sent && <Check size={11} />}
            </button>
          );
        })}
      </div>

      {/* Channel-specific actions */}
      <div className="flex items-center flex-wrap gap-2">
        {tab.channel === 'workhuman_dm' && (
          whDmUrl ? (
            <a
              href={whDmUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-[#1b3a5c] hover:bg-[#0d2945] text-white font-medium px-3 py-1.5 rounded-full inline-flex items-center gap-1.5"
            >
              <ExternalLink size={11} /> Open Workhuman DM
            </a>
          ) : (
            <div className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">
              No attendee ID — can't deep link. Paste message manually in Workhuman app.
            </div>
          )
        )}
        {(tab.channel === 'linkedin_connect' || tab.channel === 'linkedin_dm') && linkedinSearchUrl && (
          <a
            href={lead.linkedin_url || linkedinSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-[#0a66c2] hover:bg-[#074a99] text-white font-medium px-3 py-1.5 rounded-full inline-flex items-center gap-1.5"
          >
            <Linkedin size={11} />
            {lead.linkedin_url ? 'Open LinkedIn profile' : 'Search LinkedIn'}
          </a>
        )}
      </div>

      {/* Subject lines (email only) */}
      {tab.channel === 'email' && (
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-gray-600">Subject (click to rotate, then copy):</div>
          <div className="flex flex-wrap gap-1">
            {activeSubjects.map((line, i) => (
              <button
                key={i}
                onClick={() => setSubjectIdx(i)}
                className={`text-xs px-2 py-1 rounded border transition-colors ${
                  subjectIdx === i
                    ? 'border-amber-500 bg-amber-50 text-amber-800'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <input
              type="text"
              value={filledSubject}
              readOnly
              className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm bg-gray-50"
            />
            <button
              onClick={() => copy(filledSubject, 'subject')}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1.5 rounded inline-flex items-center gap-1"
            >
              {copiedField === 'subject' ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
            </button>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-gray-600">{tab.template.label}</div>
          <div className={`text-xs ${overLimit ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
            {charCount}{tab.template.charLimit ? ` / ${tab.template.charLimit}` : ''}
          </div>
        </div>
        {tab.template.description && (
          <div className="text-xs text-gray-500 italic">{tab.template.description}</div>
        )}
        <textarea
          value={bodyToUse}
          onChange={e => { setCustomBody(e.target.value); setUseCustomBody(true); }}
          rows={useCustomBody ? Math.max(8, customBody.split('\n').length + 2) : Math.max(6, filled.split('\n').length + 1)}
          className={`w-full px-3 py-2 border rounded-lg text-sm font-sans resize-none focus:outline-none focus:ring-2 ${
            overLimit ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-[#09364f]/20 focus:border-[#09364f]'
          }`}
        />
        {useCustomBody && (
          <button
            onClick={() => { setCustomBody(''); setUseCustomBody(false); }}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Reset to template
          </button>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
        <button
          onClick={() => copy(bodyToUse, 'body')}
          className="text-sm bg-gray-800 hover:bg-gray-900 text-white font-medium px-3 py-2 rounded-lg inline-flex items-center gap-2"
        >
          {copiedField === 'body' ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy message</>}
        </button>
        <button
          onClick={markSent}
          className="text-sm bg-green-600 hover:bg-green-700 text-white font-medium px-3 py-2 rounded-lg inline-flex items-center gap-2"
          title="Log that you sent this message"
        >
          <Send size={14} /> Mark sent
        </button>
      </div>
    </div>
  );
}
