import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Copy, Check, ExternalLink,
  Linkedin, MessageSquare, SkipForward, Target,
} from 'lucide-react';
import { WorkhumanLead, OutreachChannel } from '../types/workhumanLead';
import {
  WORKHUMAN_DM, LINKEDIN_CONNECT, fillTemplate, workhumanDmUrl, slugFromLandingUrl,
  SENDER_NAMES, SenderName,
} from '../utils/workhumanOutreachTemplates';
import { fetchLeads, logOutreach, fetchOutreachChannelsByLead } from '../services/WorkhumanLeadService';
import { useAuth } from '../contexts/AuthContext';

const EMAIL_TO_SENDER: Record<string, SenderName> = {
  'will@getshortcut.co': 'Will Newton',
  'jaimie@getshortcut.co': 'Jaimie Pritchard',
  'marc@getshortcut.co': 'Marc Levitan',
  'caren@getshortcut.co': 'Caren Skutch',
};

function sanitizeSlug(company: string): string {
  return company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const STORAGE_INDEX_KEY = 'workhuman_outreach_queue_index';

const WorkhumanOutreachQueue: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const authedSender: SenderName | null = useMemo(() => {
    const email = user?.email?.toLowerCase() || '';
    return EMAIL_TO_SENDER[email] || null;
  }, [user]);

  const [senderName, setSenderName] = useState<SenderName>(() => {
    const stored = localStorage.getItem('workhuman_sender_name_override') as SenderName | null;
    if (stored && SENDER_NAMES.includes(stored)) return stored;
    return SENDER_NAMES[0];
  });

  useEffect(() => {
    if (authedSender && !localStorage.getItem('workhuman_sender_name_override')) {
      setSenderName(authedSender);
    }
  }, [authedSender]);

  const [leads, setLeads] = useState<WorkhumanLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState<number>(() => {
    const raw = localStorage.getItem(STORAGE_INDEX_KEY);
    return raw ? Math.max(0, parseInt(raw, 10) || 0) : 0;
  });
  const [sentMap, setSentMap] = useState<Record<string, Set<OutreachChannel>>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [showOnlyUnsent, setShowOnlyUnsent] = useState(false);

  // Load all Tier 1A leads assigned to the current sender
  useEffect(() => {
    (async () => {
      setLoading(true);
      const all = await fetchLeads();
      const mine = all
        .filter(l => l.tier_1a && l.assigned_to === senderName)
        .sort((a, b) => (b.lead_score || 0) - (a.lead_score || 0));
      setLeads(mine);
      const channels = await fetchOutreachChannelsByLead();
      setSentMap(channels);
      setLoading(false);
    })();
  }, [senderName]);

  // Persist queue position
  useEffect(() => {
    localStorage.setItem(STORAGE_INDEX_KEY, String(index));
  }, [index]);

  // Filter out fully-sent leads if requested
  const visibleLeads = useMemo(() => {
    if (!showOnlyUnsent) return leads;
    return leads.filter(l => {
      const sent = sentMap[l.id] || new Set();
      return !(sent.has('workhuman_dm') && sent.has('linkedin_connect'));
    });
  }, [leads, sentMap, showOnlyUnsent]);

  // Keep index in bounds
  useEffect(() => {
    if (visibleLeads.length === 0) return;
    if (index >= visibleLeads.length) setIndex(visibleLeads.length - 1);
  }, [visibleLeads.length, index]);

  const current = visibleLeads[index] || null;
  const sentForCurrent = current ? (sentMap[current.id] || new Set<OutreachChannel>()) : new Set<OutreachChannel>();

  const vars = useMemo(() => {
    if (!current) return null;
    const baseUrl = current.landing_page_url;
    const urlWithLead = baseUrl
      ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}lead=${current.id}`
      : undefined;
    return {
      firstName: (current.name.split(' ')[0] || '').trim(),
      company: current.company || '',
      senderName,
      landingPageUrl: urlWithLead,
      companySlug: slugFromLandingUrl(current.landing_page_url) || (current.company ? sanitizeSlug(current.company) : ''),
    };
  }, [current, senderName]);

  const whDmBody = useMemo(() => (vars ? fillTemplate(WORKHUMAN_DM.body, vars) : ''), [vars]);
  const liConnectBody = useMemo(() => (vars ? fillTemplate(LINKEDIN_CONNECT.body, vars) : ''), [vars]);

  const whDmUrl = current ? workhumanDmUrl(current.workhuman_attendee_id) : null;
  const liUrl = current?.linkedin_url || (current?.name
    ? `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(current.name + (current.company ? ' ' + current.company : ''))}`
    : null);

  const copyToClipboard = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      setTimeout(() => setCopied(null), 1200);
    } catch (e) {
      console.error('Copy failed:', e);
    }
  }, []);

  const copyAndOpen = async (text: string, url: string | null, field: string) => {
    await copyToClipboard(text, field);
    if (url) window.open(url, '_blank', 'noopener');
  };

  const markSent = async (channel: OutreachChannel, body: string, templateId: string) => {
    if (!current) return;
    const ok = await logOutreach({
      leadId: current.id,
      channel,
      templateId,
      senderName,
      messagePreview: body.substring(0, 500),
    });
    if (ok) {
      setSentMap(prev => {
        const next = { ...prev };
        const set = new Set(next[current.id] || []);
        set.add(channel);
        next[current.id] = set;
        return next;
      });
    }
  };

  const next = () => {
    if (index < visibleLeads.length - 1) setIndex(index + 1);
  };
  const prev = () => {
    if (index > 0) setIndex(index - 1);
  };

  // Progress counts
  const totalAssigned = leads.length;
  const whDmDone = leads.filter(l => (sentMap[l.id] || new Set()).has('workhuman_dm')).length;
  const liConnectDone = leads.filter(l => (sentMap[l.id] || new Set()).has('linkedin_connect')).length;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <button
              onClick={() => navigate('/workhuman-leads')}
              className="text-sm text-gray-500 hover:text-gray-800 inline-flex items-center gap-1 mb-2"
            >
              <ArrowLeft size={14} /> Back to leads
            </button>
            <div className="flex items-center gap-3 mb-1">
              <Target className="text-amber-600" size={24} />
              <h1 className="text-2xl font-bold text-gray-900">Rapid Outreach</h1>
              <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-medium">
                {senderName}
              </span>
            </div>
            <p className="text-gray-500 text-sm">One lead at a time. Copy the message, send on the platform, mark sent, next.</p>
          </div>

          {/* Sender override (debug/testing) */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Sender:</label>
            <select
              value={senderName}
              onChange={e => {
                const v = e.target.value as SenderName;
                setSenderName(v);
                localStorage.setItem('workhuman_sender_name_override', v);
                setIndex(0);
              }}
              className="text-sm border border-gray-200 rounded px-2 py-1 bg-white"
            >
              {SENDER_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatPill label="Total leads" value={totalAssigned} />
          <StatPill label="WH DMs sent" value={whDmDone} total={totalAssigned} color="text-[#1b3a5c]" />
          <StatPill label="LI Connects sent" value={liConnectDone} total={totalAssigned} color="text-[#0a66c2]" />
        </div>

        {/* Progress + controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <button
                onClick={prev}
                disabled={index === 0}
                className="p-2 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="text-sm text-gray-600 font-medium min-w-[120px] text-center">
                {visibleLeads.length > 0 ? (
                  <>Lead <span className="text-gray-900">{index + 1}</span> of {visibleLeads.length}</>
                ) : (
                  <>No leads</>
                )}
              </div>
              <button
                onClick={next}
                disabled={index >= visibleLeads.length - 1}
                className="p-2 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} />
              </button>
              <button
                onClick={next}
                disabled={index >= visibleLeads.length - 1}
                className="p-2 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1 text-xs"
                title="Skip"
              >
                <SkipForward size={14} /> Skip
              </button>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyUnsent}
                onChange={e => setShowOnlyUnsent(e.target.checked)}
                className="rounded"
              />
              Hide leads fully sent
            </label>
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all"
              style={{ width: `${visibleLeads.length ? ((index + 1) / visibleLeads.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Lead card */}
        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-400">
            Loading leads...
          </div>
        ) : !current ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-500 mb-1">No leads in this queue</p>
            <p className="text-gray-400 text-sm">
              {showOnlyUnsent ? 'All leads fully sent. Uncheck the filter above to see them.' : 'No Tier 1A leads assigned to you yet.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Lead identity */}
            <div className="border-b border-gray-100 px-5 py-4 flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="font-semibold text-gray-900 text-lg">{current.name}</div>
                <div className="text-gray-600 text-sm">{current.title || '—'}</div>
                <div className="text-gray-500 text-sm">{current.company || '—'}</div>
              </div>
              <div className="text-right text-xs text-gray-500 space-y-0.5">
                {current.industry && <div>{current.industry}</div>}
                {current.hq_location && <div>{current.hq_location}</div>}
                {current.company_size_normalized && <div>{current.company_size_normalized.toLocaleString()} employees</div>}
                {current.email && !current.email.includes('@no-email.placeholder') && (
                  <div className="text-gray-400 truncate max-w-[260px]">{current.email}</div>
                )}
              </div>
            </div>

            {/* Two-channel grid */}
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
              {/* Workhuman DM */}
              <ChannelCard
                icon={<MessageSquare size={16} className="text-[#1b3a5c]" />}
                title="Workhuman DM"
                body={whDmBody}
                platformUrl={whDmUrl}
                platformLabel="Open Workhuman"
                charLimit={500}
                sent={sentForCurrent.has('workhuman_dm')}
                copied={copied === 'wh'}
                unreachable={!current.workhuman_attendee_id}
                unreachableLabel="No attendee ID — search manually"
                onCopyOpen={() => copyAndOpen(whDmBody, whDmUrl, 'wh')}
                onMarkSent={() => markSent('workhuman_dm', whDmBody, WORKHUMAN_DM.id)}
              />

              {/* LinkedIn Connect */}
              <ChannelCard
                icon={<Linkedin size={16} className="text-[#0a66c2]" />}
                title="LinkedIn Connect"
                body={liConnectBody}
                platformUrl={liUrl}
                platformLabel={current.linkedin_url ? 'Open LinkedIn' : 'Search LinkedIn'}
                charLimit={300}
                sent={sentForCurrent.has('linkedin_connect')}
                copied={copied === 'li'}
                unreachable={!current.linkedin_url}
                unreachableLabel="No LinkedIn URL — search fallback"
                onCopyOpen={() => copyAndOpen(liConnectBody, liUrl, 'li')}
                onMarkSent={() => markSent('linkedin_connect', liConnectBody, LINKEDIN_CONNECT.id)}
              />
            </div>

            {/* Footer nav */}
            <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between bg-gray-50/50">
              <button
                onClick={prev}
                disabled={index === 0}
                className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <button
                onClick={next}
                disabled={index >= visibleLeads.length - 1}
                className="text-sm bg-amber-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-amber-700 inline-flex items-center gap-1 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Next lead <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function StatPill({ label, value, total, color }: { label: string; value: number; total?: number; color?: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color || 'text-gray-900'}`}>
        {value}
        {total !== undefined && (
          <span className="text-sm font-medium text-gray-400 ml-1">/ {total} ({pct}%)</span>
        )}
      </div>
    </div>
  );
}

function ChannelCard({
  icon, title, body, platformUrl, platformLabel, charLimit, sent, copied, unreachable, unreachableLabel,
  onCopyOpen, onMarkSent,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  platformUrl: string | null;
  platformLabel: string;
  charLimit: number;
  sent: boolean;
  copied: boolean;
  unreachable: boolean;
  unreachableLabel: string;
  onCopyOpen: () => void;
  onMarkSent: () => void;
}) {
  const charCount = body.length;
  const overLimit = charCount > charLimit;

  return (
    <div className="p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-2">
          {icon}
          <span className="font-semibold text-gray-800 text-sm">{title}</span>
          {sent && <span className="bg-green-100 text-green-700 text-[10px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wide">Sent</span>}
        </div>
        <div className={`text-xs ${overLimit ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
          {charCount}/{charLimit}
        </div>
      </div>

      <textarea
        readOnly
        value={body}
        className={`w-full text-xs font-mono p-2.5 border rounded bg-gray-50 text-gray-700 flex-1 mb-3 resize-none ${overLimit ? 'border-red-300' : 'border-gray-200'}`}
        rows={7}
      />

      {unreachable && (
        <div className="text-[11px] text-amber-700 mb-2">⚠ {unreachableLabel}</div>
      )}

      <div className="space-y-2">
        <button
          onClick={onCopyOpen}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#09364f] hover:bg-[#0a4060] text-white text-sm font-medium rounded transition-colors"
        >
          {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy + {platformLabel}</>}
          <ExternalLink size={12} className="opacity-70" />
        </button>
        <button
          onClick={onMarkSent}
          disabled={sent}
          className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded transition-colors ${
            sent
              ? 'bg-green-50 text-green-700 cursor-default'
              : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
          }`}
        >
          {sent ? <><Check size={14} /> Marked sent</> : <><Check size={14} /> Mark as sent</>}
        </button>
      </div>
    </div>
  );
}

export default WorkhumanOutreachQueue;
