import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ChevronLeft, ChevronRight, SkipForward, StickyNote, Users,
} from 'lucide-react';
import { WorkhumanLead } from '../types/workhumanLead';
import { SENDER_NAMES, SenderName } from '../utils/workhumanOutreachTemplates';
import { fetchLeads } from '../services/WorkhumanLeadService';
import { useAuth } from '../contexts/AuthContext';
import { PersonalNoteFollowUpPanel } from './PersonalNoteFollowUpPanel';
import { hasManualNote } from '../utils/notes';
import { fetchOutreachLogForLead } from '../services/WorkhumanLeadService';
import { PERSONAL_NOTE_FOLLOWUP_EMAIL } from '../utils/workhumanOutreachTemplates';
import { CheckCircle2 } from 'lucide-react';

const EMAIL_TO_SENDER: Record<string, SenderName> = {
  'will@getshortcut.co': 'Will Newton',
  'jaimie@getshortcut.co': 'Jaimie Pritchard',
  'marc@getshortcut.co': 'Marc Levitan',
  'caren@getshortcut.co': 'Caren Skutch',
};

const STORAGE_INDEX_KEY = 'workhuman_personal_note_queue_index';

/**
 * One-lead-at-a-time queue for sending the personal-note follow-up email
 * to leads who had a real booth conversation. Filters to leads where
 * `hasManualNote(notes)` is true AND `assigned_to === senderName`. The
 * per-lead UI is the same `PersonalNoteFollowUpPanel` that renders inside
 * the lead profile expanded view, so there's no copy-divergence between
 * the queue flow and the inline flow.
 */
const WorkhumanPersonalNoteQueue: React.FC = () => {
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
  const [includeUnassigned, setIncludeUnassigned] = useState(false);

  // Load leads with manual personal notes
  useEffect(() => {
    (async () => {
      setLoading(true);
      const all = await fetchLeads();
      const mine = all
        .filter(l => hasManualNote(l.notes) && (
          l.assigned_to === senderName || (includeUnassigned && !l.assigned_to)
        ))
        .sort((a, b) => {
          // Tier 1A first, then 1B, then by lead_score desc
          if (a.tier_1a !== b.tier_1a) return a.tier_1a ? -1 : 1;
          if (a.tier_1b !== b.tier_1b) return a.tier_1b ? -1 : 1;
          return (b.lead_score || 0) - (a.lead_score || 0);
        });
      setLeads(mine);
      setLoading(false);
    })();
  }, [senderName, includeUnassigned]);

  useEffect(() => { localStorage.setItem(STORAGE_INDEX_KEY, String(index)); }, [index]);
  useEffect(() => {
    if (leads.length === 0) return;
    if (index >= leads.length) setIndex(leads.length - 1);
  }, [leads.length, index]);

  const current = leads[index] || null;

  // Tracks which leads have a logged personal-note send. Populated as the
  // teammate scrolls through the queue (lazy per-lead lookup) plus
  // optimistic updates from the panel via `onSentStateChange`.
  const [sentLeadIds, setSentLeadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    fetchOutreachLogForLead(current.id).then(log => {
      if (cancelled) return;
      const personalSend = log.find(e => e.template_id?.startsWith(PERSONAL_NOTE_FOLLOWUP_EMAIL.id));
      if (personalSend) {
        setSentLeadIds(prev => {
          if (prev.has(current.id)) return prev;
          const next = new Set(prev);
          next.add(current.id);
          return next;
        });
      }
    }).catch(() => { /* non-fatal */ });
    return () => { cancelled = true; };
  }, [current]);

  const isCurrentSent = current ? sentLeadIds.has(current.id) : false;

  const goPrev = () => setIndex(i => Math.max(0, i - 1));
  const goNext = () => setIndex(i => Math.min(leads.length - 1, i + 1));
  const reset = () => setIndex(0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Loading personal-note leads...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-3xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/workhuman-leads')}
            className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1"
          >
            <ArrowLeft size={14} /> Back to leads
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <StickyNote size={20} className="text-orange-600" />
                Personal-Note Outreach
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Hand-written follow-ups to leads you had a real booth conversation with. One at a time.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <label className="text-gray-500">Sender:</label>
              <select
                value={senderName}
                onChange={e => {
                  setSenderName(e.target.value as SenderName);
                  localStorage.setItem('workhuman_sender_name_override', e.target.value);
                  reset();
                }}
                className="text-sm border border-gray-200 rounded px-2 py-1 bg-white"
              >
                {SENDER_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          {/* Stats + filter */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 flex-wrap gap-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1 text-gray-700">
                <Users size={14} className="text-gray-400" />
                {leads.length} {leads.length === 1 ? 'lead' : 'leads'}
              </span>
              {leads.length > 0 && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-gray-700">{index + 1} of {leads.length}</span>
                </>
              )}
            </div>
            <label className="text-xs text-gray-600 inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeUnassigned}
                onChange={e => { setIncludeUnassigned(e.target.checked); reset(); }}
                className="cursor-pointer"
              />
              Also include unassigned personal-note leads
            </label>
          </div>
        </div>

        {/* Empty state */}
        {leads.length === 0 ? (
          <div className="bg-white rounded-lg border border-dashed border-gray-300 p-12 text-center">
            <StickyNote size={32} className="text-gray-300 mx-auto mb-3" />
            <div className="text-sm text-gray-700 font-medium">No personal-note leads {includeUnassigned ? 'available' : `assigned to ${senderName}`}</div>
            <div className="text-xs text-gray-500 mt-1">
              These are leads with a `[stamp · Name]` written-by-team note in their CRM profile.
            </div>
            <Link
              to="/workhuman-leads?personalNote=1"
              className="mt-4 inline-flex items-center gap-1 text-sm text-[#09364f] hover:underline"
            >
              View all personal-note leads in CRM →
            </Link>
          </div>
        ) : (
          <>
            {/* Lead identity card */}
            {current && (
              <div className={`bg-white rounded-lg border p-4 mb-3 ${isCurrentSent ? 'border-green-300' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-semibold text-gray-900 text-base inline-flex items-center gap-2">
                      {current.name}
                      {isCurrentSent && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-800 border border-green-200">
                          <CheckCircle2 size={11} /> Personal note sent
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {[current.title, current.company].filter(Boolean).join(' · ') || '—'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                      {current.email && !current.email.includes('@no-email.placeholder') && (
                        <span>📧 {current.email}</span>
                      )}
                      {current.personal_email && current.personal_email !== current.email && (
                        <span>· 🏠 {current.personal_email}</span>
                      )}
                      {current.phone && <span>· 📱 {current.phone}</span>}
                    </div>
                  </div>
                  <Link
                    to={`/workhuman-leads?lead=${current.id}`}
                    className="text-xs text-[#09364f] hover:underline"
                  >
                    Open in CRM →
                  </Link>
                </div>
              </div>
            )}

            {/* Personal-note follow-up panel — same one used in the lead profile expanded view.
                onSentStateChange flips the card-level "Personal note sent" badge above when
                the teammate hits Mark Sent in the panel — no page refresh needed. */}
            {current && (
              <PersonalNoteFollowUpPanel
                lead={current}
                onSentStateChange={(sent) => {
                  setSentLeadIds(prev => {
                    const next = new Set(prev);
                    if (sent) next.add(current.id); else next.delete(current.id);
                    return next;
                  });
                }}
              />
            )}

            {/* Navigation footer */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 mt-3 flex items-center justify-between">
              <button
                onClick={goPrev}
                disabled={index === 0}
                className="px-3 py-1.5 text-sm rounded border border-gray-200 inline-flex items-center gap-1 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                onClick={goNext}
                disabled={index >= leads.length - 1}
                className="px-3 py-1.5 text-sm rounded border border-gray-200 inline-flex items-center gap-1 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Move to the next lead — mark sent on the panel above first if you sent the email"
              >
                Next <ChevronRight size={14} />
              </button>
              <button
                onClick={() => { goNext(); }}
                disabled={index >= leads.length - 1}
                className="px-3 py-1.5 text-sm rounded bg-amber-600 text-white inline-flex items-center gap-1 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Skip this lead and move on"
              >
                <SkipForward size={14} /> Skip
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WorkhumanPersonalNoteQueue;
