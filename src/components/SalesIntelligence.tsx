import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Target, Crosshair, BarChart3, Search, FileDown, RefreshCw, AlertCircle, PenLine, X, Copy, Check, Send, Mail, Building2, MapPin, ExternalLink, Clock, Bookmark, BookmarkCheck, Trash2, Sparkles, Loader2, MessageSquare, ChevronDown, ChevronUp, Briefcase, Workflow, Scale } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import { createLandingPageForLead } from '../services/WorkhumanLeadService';
import { useAuth } from '../contexts/AuthContext';
import SystemLoopDiagram from './SystemLoopDiagram';

// Rep email → first name (for timestamped notes). Mirrors WorkhumanLeads.
const REP_EMAIL_TO_FIRST_NAME: Record<string, string> = {
  'will@getshortcut.co': 'Will',
  'jaimie@getshortcut.co': 'Jaimie',
  'marc@getshortcut.co': 'Marc',
  'caren@getshortcut.co': 'Caren',
};

type TabId = 'playA' | 'playB' | 'law' | 'followups' | 'brokers' | 'drafts' | 'recon' | 'loop';
interface SavedDraftRow {
  id: string; recipient_email: string | null; subject: string; body: string;
  direction_label: string | null; source_company: string | null; source_contact: string | null;
  source_title: string | null; target_kind: string | null; target_ref: Record<string, unknown>;
  preflight_reco: string | null; note: string | null; created_at: string;
}

interface PlayARow {
  rank: number; play_score: number; fit_score: number; company_name: string;
  employees: string; industry: string; sites_served: number; sites_list: string;
  generated_at: string; company_id: string | null;
  last_event_at: string | null; months_since_event: number | null; play_status: string | null;
}
type CardTarget = { company: string; email?: string | null; domain?: string | null; companyId?: string | null };
interface PlayBRow {
  rank: number; score: number; company_name: string; domain: string;
  employees: string; industry: string; contact_name: string;
  contact_title: string; title_category: string; generated_at: string;
  contact_email: string | null; contact_linkedin: string | null; contact_location: string | null;
  engagement_state: 'replied' | 'no_reply' | 'net_new' | 're_engage' | null;
  touches: number | null; last_contacted_at: string | null;
  reply_sentiment: string | null; is_leadgen: boolean | null;
  mv_status: string | null;
  bounceban_status: string | null;
  in_campaign: boolean | null; smartlead_campaign_id: string | null;
  last_sender_name: string | null; last_sender_email: string | null;
}
const PB_STATE: Record<string, { label: string; tone: string; hint: string }> = {
  replied:   { label: 'Replied',   tone: 'bg-green-100 text-green-800', hint: 'Emailed & they responded — warmest, never closed' },
  no_reply:  { label: 'No reply',  tone: 'bg-gray-100 text-gray-700',   hint: 'Emailed, silent — needs a new angle' },
  net_new:   { label: 'Net-new',   tone: 'bg-blue-100 text-blue-800',   hint: 'Freshly sourced, never touched' },
  re_engage: { label: 'Re-engage', tone: 'bg-amber-100 text-amber-800', hint: 'In our world but never actually emailed' },
};
type PBFilter = 'all' | 'replied' | 'no_reply' | 'net_new' | 're_engage';
type PBSort = 'state' | 'score' | 'recent' | 'touches';
// Email deliverability bucket: MV 'ok' or BounceBan 'deliverable' = verified;
// an unresolved catch_all = catchall; invalid/unknown/undeliverable = bad.
type PBDeliv = 'verified' | 'catchall' | 'bad';
const delivOf = (r: PlayBRow): PBDeliv => {
  if (r.mv_status === 'ok' || r.bounceban_status === 'deliverable') return 'verified';
  if (r.bounceban_status === 'undeliverable') return 'bad';
  if (r.mv_status === 'invalid' || r.mv_status === 'unknown' || r.mv_status === 'disposable') return 'bad';
  if (r.mv_status === 'catch_all') return 'catchall';
  return 'verified'; // no status yet → don't hide
};
const PB_DELIV: Record<PBDeliv, { label: string; tone: string }> = {
  verified: { label: 'verified', tone: 'bg-green-100 text-green-700' },
  catchall: { label: 'catch all', tone: 'bg-amber-100 text-amber-700' },
  bad:      { label: 'bad',       tone: 'bg-red-100 text-red-700' },
};
interface ReconRow {
  bucket: string; total: number; title_breakdown: Record<string, number>;
  generated_at: string;
}

interface DraftDirection { label: string; subject: string; body: string }
interface ContactHistory {
  email: string | null;
  emailed_count: number;
  first_sent: string | null;
  last_sent: string | null;
  replied: boolean;
  sends: Array<{ campaign_id: string | null; sent_time: string | null; replied: boolean; bounced: boolean; touches: number; sender_email: string | null; thread_id: string | null; message_id: string | null }>;
  replies: Array<{ date: string | null; sentiment: string | null; is_ooo: boolean; source: string | null; content: string | null }>;
}
interface DraftResponse {
  target: Record<string, unknown>;
  preflight: { recommendation?: string; suppressed?: boolean; is_client?: boolean; contacted?: boolean } | null;
  history?: ContactHistory;
  drafts: DraftDirection[];
  fight_for: string | null;
  fight_for_reason: string | null;
  grounding_note: string;
}
interface FollowupRow {
  email: string;
  name: string | null; title: string | null; company: string | null;
  // Email state derived from outreach_sends
  state: 'never_emailed' | 'unknown_no_inbox' | 'no_reply' | 'maxed' | 'replied';
  last_sent: string | null; days_since: number | null; touches: number;
  thread_id: string | null; sender_email?: string | null; replied?: boolean;
  // Workhuman lead context (when the row maps to a personal-note lead)
  is_personal_note: boolean; has_workhuman: boolean;
  assigned_to: string | null;
  tier: string | null;
  outreach_status: string | null;
  personal_note: string | null;
  linkedin_url: string | null;
  landing_page_url: string | null;
  page_view_count?: number | null;
  page_last_viewed_at?: string | null;
  conference_attendee: boolean;
  was_waitlisted: boolean;
  vip_slot: { day: string; time: string | null } | null;
  // Broker GTM context — set when the row originates from the Brokers tab.
  // The draft pipeline keys off `track` to flip from the Workhuman-style
  // "great chatting at the booth" hook into the wellness-fund / broker pitch.
  track?: 'broker' | 'carrier_hec' | null;
  firm_tier?: 'tier_1' | 'tier_2' | 'tier_3' | null;
  firm_why?: string | null;
  firm_nyc?: string | null;
  is_first_outreach?: boolean;
}
interface BrokerRow {
  email: string;
  name: string | null;
  title: string | null;
  company: string | null;
  linkedin_url: string | null;
  assigned_to: string | null;
  firm_name: string;
  firm_tier: 'tier_1' | 'tier_2' | 'tier_3' | null;
  firm_track: 'broker' | 'carrier_hec' | null;
  firm_priority: number | null;
  firm_nyc: string | null;
  firm_why: string | null;
  emailed_count: number;
  last_sent: string | null;
  last_reply: string | null;
  days_since: number | null;
  replied: boolean;
  sender_email: string | null;
  state: 'never_emailed' | 'in_cadence' | 'replied';
}

interface InboxBanner {
  connected: boolean; email: string | null;
  sent_crawl_enabled: boolean; assignee_name: string | null;
}
const FU_STATE: Record<string, { label: string; tone: string; hint: string }> = {
  never_emailed:     { label: 'Never emailed', tone: 'bg-blue-100 text-blue-800',   hint: 'Personal-note lead we have not emailed yet — first outreach' },
  unknown_no_inbox:  { label: 'Status unknown', tone: 'bg-gray-100 text-gray-600',  hint: 'Connect your Gmail to verify whether you have emailed this lead' },
  no_reply:          { label: 'No reply',       tone: 'bg-amber-100 text-amber-800', hint: 'Emailed, no reply yet — follow-up time' },
  maxed:             { label: '3+ no reply',    tone: 'bg-gray-100 text-gray-600',  hint: 'Cap hit: 3+ rep outreach sends in last 30d or 5+ in 60d, no reply. Pause to avoid hounding.' },
  replied:           { label: 'Replied',        tone: 'bg-green-100 text-green-800', hint: 'They responded — open the thread to continue' },
  muted:             { label: 'Muted',          tone: 'bg-red-100 text-red-700',     hint: 'Suppressed from your queue. Click the row → Unmute to bring them back.' },
};
const TIER_BADGE: Record<string, { label: string; tone: string }> = {
  tier_1a: { label: '1A', tone: 'bg-yellow-200 text-yellow-900' },
  tier_1b: { label: '1B', tone: 'bg-yellow-100 text-yellow-800' },
  tier_1:  { label: '1',  tone: 'bg-yellow-100 text-yellow-700' },
  tier_2:  { label: '2',  tone: 'bg-gray-200 text-gray-700' },
  tier_3:  { label: '3',  tone: 'bg-gray-100 text-gray-600' },
};
type DraftTarget = {
  company: string;
  play?: 'A' | 'B';
  rank?: number;
  prefillEmail?: string | null;
  followup?: FollowupRow;
  // Reopen a previously-saved draft: skip the LLM fetch, prefill the modal.
  savedDraft?: { id: string; subject: string; body: string; direction_label: string; recipient_email: string | null };
};

const RECO_COPY: Record<string, { tone: string; text: string }> = {
  skip_suppressed: { tone: 'bg-red-50 text-red-700', text: 'Suppressed / do-not-contact. Do not send.' },
  skip_already_client: { tone: 'bg-amber-50 text-amber-700', text: 'Already an active client. This is an expansion touch, not a cold pitch.' },
  caution_recently_contacted: { tone: 'bg-amber-50 text-amber-700', text: 'Contacted in the last 90 days with no reply. Consider a different angle or waiting.' },
  ok_to_proceed: { tone: 'bg-green-50 text-green-700', text: 'Clear to reach out. No prior contact or suppression found.' },
};

const DraftModal: React.FC<{ target: DraftTarget; onClose: () => void; onMutated?: () => void }> = ({ target, onClose, onMutated }) => {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<DraftResponse | null>(null);
  const [bodies, setBodies] = useState<Record<string, string>>({});
  const [subjects, setSubjects] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [gmail, setGmail] = useState<{ connected: boolean; email: string | null } | null>(null);
  const [toEmail, setToEmail] = useState(target.followup?.email || target.prefillEmail || '');
  const [sending, setSending] = useState<string | null>(null);
  const [confirmLabel, setConfirmLabel] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<
    { label: string; kind: 'ok' | 'blocked' | 'err'; text: string; canForce?: boolean } | null
  >(null);

  const authedFetch = async (path: string, init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not signed in');
    return fetch(path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        ...(init?.headers || {}),
      },
    });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authedFetch('/.netlify/functions/gmail-status', { method: 'GET' });
        const j = await res.json();
        if (!cancelled && res.ok) setGmail({ connected: !!j.connected, email: j.email || null });
      } catch { /* status is best-effort; copy path still works */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const connectGmail = async () => {
    try {
      const res = await authedFetch('/.netlify/functions/gmail-oauth-start', { method: 'POST', body: '{}' });
      const j = await res.json();
      if (!res.ok || !j.url) throw new Error(j.error || 'Could not start Gmail connect');
      // Same-tab redirect (not window.open) — iOS Safari blocks window.open
      // after an awaited promise because the user-gesture context is gone.
      // The OAuth callback returns to /sales-intelligence anyway, so a
      // top-level navigation is the right pattern on every device.
      window.location.href = j.url;
    } catch (e) {
      setSendResult({ label: '', kind: 'err', text: e instanceof Error ? e.message : 'Connect failed' });
    }
  };

  const sendDraft = async (label: string, force = false) => {
    setSending(label); setSendResult(null); setConfirmLabel(null);
    try {
      const res = await authedFetch('/.netlify/functions/send-as-rep', {
        method: 'POST',
        body: JSON.stringify({
          play: target.play, rank: target.rank,
          to: toEmail.trim(), fromEmail: gmail?.email,
          subject: subjects[label], body: bodies[label],
          threadId: target.followup?.thread_id || undefined,
          acknowledgedCaution: force,
        }),
      });
      const j = await res.json();
      if (res.status === 409 && j.blocked) {
        const recent = j.reason === 'recently_contacted';
        setSendResult({
          label, kind: 'blocked', canForce: recent,
          text: j.reason === 'suppressed' ? 'Blocked: recipient is suppressed / do-not-contact.'
            : j.reason === 'already_client' ? 'Blocked: already an active client.'
            : 'Caution: contacted in the last 90 days with no reply.',
        });
        return;
      }
      if (!res.ok || !j.success) throw new Error(j.error || `Send failed (${res.status})`);
      setSendResult({ label, kind: 'ok', text: `Sent to ${toEmail.trim()}.` });
      onMutated?.();  // invalidate caches immediately — queue should reflect the send right now
    } catch (e) {
      setSendResult({ label, kind: 'err', text: e instanceof Error ? e.message : 'Send failed' });
    } finally {
      setSending(null);
    }
  };

  const openInGmail = async (label: string) => {
    setSending(label); setSendResult(null); setConfirmLabel(null);
    try {
      const res = await authedFetch('/.netlify/functions/send-as-rep', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'open',
          play: target.play, rank: target.rank,
          to: toEmail.trim(), fromEmail: gmail?.email,
          subject: subjects[label], body: bodies[label],
        }),
      });
      const j = await res.json();
      if (res.status === 409 && j.blocked) {
        setSendResult({
          label, kind: 'blocked',
          text: j.reason === 'suppressed' ? 'Blocked: recipient is suppressed / do-not-contact.'
            : j.reason === 'already_client' ? 'Blocked: already an active client.'
            : 'Caution: contacted in the last 90 days. Use Send via Gmail to override.',
        });
        return;
      }
      if (!res.ok || !j.success || !j.open_url) throw new Error(j.error || `Failed (${res.status})`);
      window.open(j.open_url, '_blank', 'noopener');
      setSendResult({ label, kind: 'ok', text: 'Opened in Gmail. Send from there to finish.' });
      onMutated?.();  // 'open' mode logs the lead as contacted — invalidate immediately
    } catch (e) {
      setSendResult({ label, kind: 'err', text: e instanceof Error ? e.message : 'Could not open in Gmail' });
    } finally {
      setSending(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setErr(null);
      // Reopening a saved draft: skip the LLM fetch, prefill from the saved row.
      if (target.savedDraft) {
        const sd = target.savedDraft;
        setData({
          target: {}, preflight: null, drafts: [{ label: sd.direction_label || 'saved', subject: sd.subject, body: sd.body }],
          fight_for: sd.direction_label || null, fight_for_reason: null, grounding_note: 'Reopened from saved drafts.',
        });
        setSubjects({ [sd.direction_label || 'saved']: sd.subject });
        setBodies({ [sd.direction_label || 'saved']: sd.body });
        setLoading(false);
        return;
      }
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not signed in');
        const draftBody = target.followup
          ? { followup: {
              to: target.followup.email, name: target.followup.name, title: target.followup.title,
              company: target.followup.company, days_since: target.followup.days_since ?? null,
              touch_number: (target.followup.touches || 0) + 1,
              thread_id: target.followup.thread_id,  // lets the backend pull your prior email body from Gmail
              personal_note: target.followup.personal_note || null,
              is_first_outreach: target.followup.is_first_outreach ?? (target.followup.state === 'never_emailed' || target.followup.state === 'unknown_no_inbox'),
              // BROKER GTM passthrough — keys the broker / carrier-HEC pitch branch
              track: target.followup.track || null,
              firm_tier: target.followup.firm_tier || null,
              firm_why: target.followup.firm_why || null,
              firm_nyc: target.followup.firm_nyc || null,
            } }
          : { play: target.play, rank: target.rank };
        const res = await fetch('/.netlify/functions/draft-outreach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify(draftBody),
        });
        const j = await res.json();
        if (!res.ok || !j.success) throw new Error(j.error || `Request failed (${res.status})`);
        if (cancelled) return;
        setData(j);
        setBodies(Object.fromEntries((j.drafts || []).map((d: DraftDirection) => [d.label, d.body])));
        setSubjects(Object.fromEntries((j.drafts || []).map((d: DraftDirection) => [d.label, d.subject])));
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Failed to draft');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [target]);

  const copy = (label: string) => {
    const text = `Subject: ${subjects[label] || ''}\n\n${bodies[label] || ''}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied((c) => (c === label ? null : c)), 1800);
    });
  };

  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const saveDraft = async (label: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');
      // Reconstruct the target_ref so the modal can reopen with full context.
      const targetRef: Record<string, unknown> = { company: target.company };
      if (target.play) { targetRef.play = target.play; targetRef.rank = target.rank; }
      if (target.followup) targetRef.followup = target.followup;
      if (target.prefillEmail) targetRef.prefillEmail = target.prefillEmail;
      const kind = target.followup ? 'followup' : target.play ? `play${target.play}` : 'contact';
      const { error } = await supabase.from('saved_drafts').insert({
        user_id: user.id,
        recipient_email: toEmail.trim() || null,
        subject: subjects[label] || '',
        body: bodies[label] || '',
        direction_label: label,
        source_company: target.company,
        source_contact: target.followup?.name || null,
        source_title: target.followup?.title || null,
        target_kind: kind,
        target_ref: targetRef,
        preflight_reco: data?.preflight?.recommendation || null,
      });
      if (error) throw error;
      setSaved((s) => ({ ...s, [label]: true }));
      setTimeout(() => setSaved((s) => ({ ...s, [label]: false })), 1800);
    } catch (e) {
      setSendResult({ label, kind: 'err', text: e instanceof Error ? e.message : 'Save failed' });
    }
  };

  const deleteSavedDraft = async () => {
    if (!target.savedDraft?.id) return;
    try {
      const { error } = await supabase.from('saved_drafts').delete().eq('id', target.savedDraft.id);
      if (error) throw error;
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const reco = data?.preflight?.recommendation || '';
  const recoMeta = RECO_COPY[reco];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl my-8">
        <div className="flex items-start justify-between p-5 border-b border-gray-200">
          {(() => {
            // Title + subtitle vary by whether this is a never-emailed lead
            // (cold open / first outreach) or a true follow-up. Old check
            // was `target.followup ?` which is ALWAYS true for any followup
            // payload — even brand-new contacts who've never been emailed.
            // Bug surfaced when Will opened a draft for a never-emailed lead
            // and saw "Follow-up #2 · no reply in 0d" — nonsensical.
            const fu = target.followup;
            const isFirst = !fu ? false : !!(
              fu.is_first_outreach
              || fu.state === 'never_emailed'
              || fu.state === 'unknown_no_inbox'
              || !fu.touches
              || !fu.last_sent
            );
            const title = fu
              ? (isFirst ? 'Draft outreach' : 'Follow-up')
              : 'Draft outreach';
            const subtitle = fu
              ? (isFirst
                ? `First outreach · ${fu.company || fu.email || ''}`
                : `Follow-up #${(fu.touches || 1) + 1} · no reply in ${fu.days_since}d · sends on the same Gmail thread.`)
              : `Play ${target.play} · rank ${target.rank}`;
            return (
              <div>
                <h2 className="text-lg font-bold text-shortcut-navy-blue flex items-center gap-2">
                  <PenLine size={18} /> {title} — {target.company}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  {subtitle} · human-in-the-loop. Review and edit before sending. The pre-flight gate re-checks the recipient on send.
                </p>
              </div>
            );
          })()}
          <div className="flex items-center gap-3">
            {target.savedDraft && (
              <button
                onClick={deleteSavedDraft}
                className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800"
                title="Remove this saved draft"
              >
                <Trash2 size={14} /> Delete saved
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {loading && <div className="py-12 text-center text-gray-400">Drafting in brand voice…</div>}
          {err && (
            <div className="bg-red-50 text-red-700 p-3 rounded flex items-center gap-2 text-sm">
              <AlertCircle size={16} /> {err}
            </div>
          )}
          {data && !loading && (
            <>
              {recoMeta && (
                <div className={`text-sm px-3 py-2 rounded ${recoMeta.tone}`}>
                  <span className="font-semibold uppercase text-xs tracking-wide">Pre-flight: </span>
                  {recoMeta.text}
                </div>
              )}
              {data.fight_for && (
                <div className="text-sm bg-blue-50 text-blue-800 px-3 py-2 rounded">
                  <span className="font-semibold">Recommended: {data.fight_for}.</span>{' '}
                  {data.fight_for_reason}
                </div>
              )}

              {data.history && data.history.emailed_count > 0 && (
                <div className="border border-gray-200 rounded">
                  <button
                    onClick={() => setShowHistory((v) => !v)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50"
                  >
                    <span className="text-gray-700">
                      <span className="font-semibold">Contact history</span>{' '}
                      · emailed {data.history.emailed_count}× · last{' '}
                      {data.history.last_sent ? new Date(data.history.last_sent).toLocaleDateString() : '—'}
                      {data.history.replies.length > 0
                        ? ` · ${data.history.replies.length} repl${data.history.replies.length === 1 ? 'y' : 'ies'}`
                        : ' · no reply'}
                    </span>
                    <span className="text-xs text-gray-400">{showHistory ? 'hide' : 'show'}</span>
                  </button>
                  {showHistory && (
                    <div className="border-t border-gray-100 p-3 space-y-3 max-h-72 overflow-y-auto">
                      {data.history.replies.length > 0 && (
                        <div className="space-y-2">
                          {data.history.replies.map((rp, i) => (
                            <div key={i} className="text-sm">
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span className="font-medium">
                                  {rp.date ? new Date(rp.date).toLocaleDateString() : 'reply'}
                                </span>
                                {rp.sentiment && (
                                  <span className={`px-1.5 py-0.5 rounded ${
                                    rp.sentiment === 'positive' ? 'bg-green-100 text-green-700'
                                      : rp.sentiment === 'negative' ? 'bg-red-100 text-red-700'
                                      : 'bg-gray-100 text-gray-600'}`}>
                                    {rp.sentiment}{rp.is_ooo ? ' · OOO' : ''}
                                  </span>
                                )}
                                <span className="text-gray-400">{rp.source}</span>
                              </div>
                              <div className="text-gray-700 whitespace-pre-wrap mt-0.5">
                                {rp.content || <span className="text-gray-400 italic">replied (no text captured)</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        Sends:{' '}
                        {data.history.sends.map((s, i) => (
                          <span key={i} className="inline-block mr-2">
                            {s.sent_time ? new Date(s.sent_time).toLocaleDateString() : '?'}
                            {s.touches > 1 ? `(×${s.touches})` : ''}
                            {s.replied ? ' ✓' : ''}{s.bounced ? ' ⚠bounce' : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 border border-gray-200 rounded p-3 bg-gray-50">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Send to
                  </label>
                  <input
                    type="email"
                    value={toEmail}
                    onChange={(e) => setToEmail(e.target.value)}
                    placeholder="recipient@company.com"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {gmail?.connected ? (
                    <span className="flex items-center gap-1.5 text-green-700">
                      <Mail size={15} /> {gmail.email}
                    </span>
                  ) : (
                    <button
                      onClick={connectGmail}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded hover:bg-white"
                    >
                      <Mail size={15} /> Connect Gmail
                    </button>
                  )}
                </div>
              </div>

              {(data.drafts || []).map((d) => (
                <div key={d.label} className="border border-gray-200 rounded">
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
                    <span className={`text-xs font-bold uppercase tracking-wide ${
                      data.fight_for === d.label ? 'text-blue-700' : 'text-gray-500'}`}>
                      {d.label}{data.fight_for === d.label ? ' · recommended' : ''}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => saveDraft(d.label)}
                        className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900"
                        title="Save this draft to come back to later"
                      >
                        {saved[d.label] ? <BookmarkCheck size={14} className="text-green-700" /> : <Bookmark size={14} />}
                        {saved[d.label] ? 'Saved' : 'Save'}
                      </button>
                      <button
                        onClick={() => copy(d.label)}
                        className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900"
                      >
                        {copied === d.label ? <Check size={14} /> : <Copy size={14} />}
                        {copied === d.label ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    <input
                      value={subjects[d.label] ?? ''}
                      onChange={(e) => setSubjects((s) => ({ ...s, [d.label]: e.target.value }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm font-medium"
                    />
                    <textarea
                      value={bodies[d.label] ?? ''}
                      onChange={(e) => setBodies((b) => ({ ...b, [d.label]: e.target.value }))}
                      rows={Math.min(16, Math.max(6, (bodies[d.label] || '').split('\n').length + 1))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm font-mono leading-relaxed"
                    />
                    <div className="flex items-center gap-3 pt-1">
                      {confirmLabel === d.label ? (
                        <>
                          <button
                            onClick={() => sendDraft(d.label)}
                            disabled={sending === d.label}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-700 rounded disabled:opacity-40"
                          >
                            <Send size={14} /> {sending === d.label ? 'Sending…' : `Confirm send to ${toEmail.trim()}`}
                          </button>
                          <button
                            onClick={() => setConfirmLabel(null)}
                            className="text-xs text-gray-500 hover:text-gray-800"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => { setSendResult(null); setConfirmLabel(d.label); }}
                            disabled={!gmail?.connected || !toEmail.trim() || sending === d.label}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-shortcut-navy-blue rounded disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Send size={14} /> Send via Gmail
                          </button>
                          <button
                            onClick={() => openInGmail(d.label)}
                            disabled={!toEmail.trim() || sending === d.label}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Mail size={14} /> Open in Gmail
                          </button>
                        </>
                      )}
                      {!gmail?.connected && (
                        <span className="text-xs text-gray-400">Connect Gmail for direct send · Open in Gmail works without it</span>
                      )}
                      {sendResult?.label === d.label && (
                        <span
                          className={`text-xs ${
                            sendResult.kind === 'ok' ? 'text-green-700'
                              : sendResult.kind === 'blocked' ? 'text-amber-700' : 'text-red-700'
                          }`}
                        >
                          {sendResult.text}
                          {sendResult.canForce && (
                            <button
                              onClick={() => sendDraft(d.label, true)}
                              className="ml-2 underline font-medium"
                            >
                              Send anyway
                            </button>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <p className="text-xs text-gray-400">{data.grounding_note}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

interface CardData {
  identity: { email: string | null; name: string | null; title: string | null; company: string | null;
    domain: string | null; linkedin_url: string | null; location: string | null; headcount: string | null;
    industry: string | null; source?: string | null; stage?: string | null; years_in_role?: string | null;
    email_status: string | null; company_url?: string | null };
  // Workhuman-curated lead (when this contact is on the Workhuman CRM).
  // Same shape Pro Slack's lookup_lead returns — sourced from lib/lead-picture.js
  // so the two surfaces don't drift.
  workhuman: {
    id: string; assigned_to: string | null;
    tier: string | null; outreach_status: string | null; lead_score: number | null;
    notes_raw: string | null;
    personal_note: string | null; personal_note_at: string | null; personal_note_by: string | null;
    notes_all: Array<{ when: string; author: string; text: string }>;
    linkedin_url: string | null;
    phone: string | null; mobile_phone: string | null; work_phone: string | null;
    signup_phone: string | null; phone_source: string | null;
    personal_email: string | null;
    hq_location: string | null; industry: string | null; company_size: string | null;
    multi_office: boolean; logo_url: string | null;
    linked_main_lead_id: string | null; source: string | null;
    landing_page_url: string | null; landing_page_views: number; landing_page_last_viewed: string | null;
    conference_attendee: boolean; was_waitlisted: boolean;
    vip_slot: { day: string | null; time: string | null } | null;
    email_sent_at: string | null; responded_at: string | null; meeting_scheduled_at: string | null;
    outreach_log: Array<{ channel: string; sender_name: string; sent_at: string; message_preview: string | null; template_id: string | null }>;
    outreach_log_count: number;
    booth_signups: Array<{ id: string; appointment_at: string | null; day_label: string | null; time_slot: string | null; service_type: string | null; team_status: string | null; team_notes: string | null; full_name: string | null }>;
    booth_signups_count: number;
  } | null;
  company: { id?: string; name: string; trajectory: string | null; activity_status: string | null; completed_events: number;
    last_event_at: string | null; months_since_event: number | null; fit_score: number | null;
    industry: string | null; employees: string | null; sites_we_serve: number; cities: string[] } | null;
  preflight: { recommendation?: string; suppressed?: boolean; is_client?: boolean } | null;
  history: ContactHistory;
  proposals: Array<{ id: string; client_name: string | null; client_email: string | null; status: string | null; proposal_type: string | null; created_at: string | null; updated_at: string | null }>;
  signups: Array<{ id: string; proposal_id: string | null; signup_url: string | null; status: string | null; event_payload: unknown; created_at: string | null }>;
  plays: {
    play_a: { rank: number; play_score: number; play_status: string | null } | null;
    play_b: { rank: number; score: number; contact_title: string | null; title_category: string | null } | null;
  };
}

interface ThreadMessage {
  direction: 'sent' | 'received';
  from: string | null;
  to: string | null;
  subject: string | null;
  date: string | null;
  snippet: string | null;
  body: string;
}

// Live thread viewer — pulls bodies straight from the rep's Gmail via the
// gmail-thread function. Bodies aren't stored in our DB; they live in Gmail.
// Collapsed by default; clicking the toggle fetches + expands. Shows last
// sent + last received as a preview, with "Show full thread" for the rest.
const ThreadView: React.FC<{ threadId: string; senderEmail?: string | null; defaultOpen?: boolean }> = ({ threadId, senderEmail, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not signed in');
      const res = await fetch('/.netlify/functions/gmail-thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        // sender_email tells gmail-thread to query that rep's mailbox (not the
        // logged-in user's). Required for team-scope views where you're
        // looking at another rep's row.
        body: JSON.stringify({ thread_id: threadId, sender_email: senderEmail || undefined }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `Failed (${res.status})`);
      setMessages(j.messages || []);
      setLoaded(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load thread');
    } finally {
      setLoading(false);
    }
  }, [threadId, senderEmail]);

  const toggle = () => {
    if (!loaded && !loading) load();
    setOpen((v) => !v);
  };

  // Auto-load when opened by default (rapid mode passes defaultOpen=true so
  // prior contact is visible immediately).
  useEffect(() => { if (open && !loaded && !loading) load(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [open]);

  // When collapsed: show a small "View thread" button.
  if (!open) {
    return (
      <button onClick={toggle} className="text-xs text-shortcut-navy-blue hover:underline">
        View thread {loaded ? `(${messages.length})` : ''}
      </button>
    );
  }

  const visible = showAll ? messages : (() => {
    // Default preview: last sent + last received (chronological).
    const lastSent = [...messages].reverse().find((m) => m.direction === 'sent');
    const lastRecv = [...messages].reverse().find((m) => m.direction === 'received');
    const arr = [lastSent, lastRecv].filter((x): x is ThreadMessage => !!x);
    arr.sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
    return arr;
  })();
  const hiddenCount = messages.length - visible.length;

  return (
    <div className="mt-2 border-l-2 border-shortcut-navy-blue pl-3 space-y-2">
      <button onClick={toggle} className="text-xs text-gray-500 hover:text-gray-700">
        Hide thread
      </button>
      {loading && <div className="text-xs text-gray-400">Loading…</div>}
      {err && <div className="text-xs text-red-600">{err}</div>}
      {!loading && !err && messages.length === 0 && (
        <div className="text-xs text-gray-400 italic">No messages found in your Gmail for this thread.</div>
      )}
      {visible.map((m, i) => (
        <div key={i} className="text-sm">
          <div className="flex items-center gap-2 text-xs">
            <span className={`font-semibold uppercase tracking-wide ${
              m.direction === 'sent' ? 'text-shortcut-navy-blue' : 'text-green-700'}`}>
              {m.direction === 'sent' ? 'Sent' : 'Reply'}
            </span>
            <span className="text-gray-500">{m.date ? new Date(m.date).toLocaleString() : '?'}</span>
            <span className="text-gray-400 truncate" title={m.from || ''}>{m.from}</span>
          </div>
          {m.subject && <div className="text-xs text-gray-500 truncate">Subject: {m.subject}</div>}
          <div className="text-gray-700 whitespace-pre-wrap text-sm mt-1 leading-snug">
            {m.body || <span className="text-gray-400 italic">{m.snippet || '(empty)'}</span>}
          </div>
        </div>
      ))}
      {!showAll && hiddenCount > 0 && (
        <button onClick={() => setShowAll(true)} className="text-xs text-shortcut-navy-blue hover:underline">
          Show full thread ({hiddenCount} more {hiddenCount === 1 ? 'message' : 'messages'})
        </button>
      )}
    </div>
  );
};

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex gap-2 text-sm py-0.5">
    <span className="w-28 shrink-0 text-gray-400">{label}</span>
    <span className="text-gray-800 break-words">{children || <span className="text-gray-300">—</span>}</span>
  </div>
);

// Per-row action bar shown at the TOP of every expanded lead. Covers the
// stuff Will asked for: mute (hide from queue), snooze 1d / 7d (per-rep
// temporal mute), delete permanently (full purge incl. outreach_sends so
// the reply hook stops matching), and Workhuman-only actions (reassign,
// tier). Calls a single Netlify endpoint lead-actions.js that authz'es
// via Supabase JWT and routes on `action`.
type AssigneeName = 'Will Newton' | 'Jaimie Pritchard' | 'Marc Levitan' | 'Caren Skutch';
const ASSIGNEE_NAMES: AssigneeName[] = ['Will Newton', 'Jaimie Pritchard', 'Marc Levitan', 'Caren Skutch'];

// Lead-action verbs that mutate state. Parent uses these to update local
// arrays surgically (remove muted row from queue, etc.) instead of forcing
// a full refetch on every action.
type LeadAction = 'mute' | 'unmute' | 'snooze' | 'reassign' | 'set_tier' | 'delete';

const LeadActionBar: React.FC<{
  email: string;
  hasWorkhuman: boolean;
  currentAssignedTo: string | null;
  currentTier: string | null;
  onMutated: (action?: LeadAction) => void;   // action lets parent update state in place instead of refetching everything
  isMuted?: boolean;   // when the card is opened from the "Muted" section
}> = ({ email, hasWorkhuman, currentAssignedTo, currentTier, onMutated, isMuted }) => {
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const call = useCallback(async (payload: Record<string, unknown>): Promise<unknown> => {
    setBusy(payload.action as string); setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not signed in');
      const r = await fetch('/.netlify/functions/lead-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ email, ...payload }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `Failed (${r.status})`);
      onMutated(payload.action as LeadAction);
      return j;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      throw e;
    } finally {
      setBusy(null);
    }
  }, [email, onMutated]);

  const tierVal = currentTier || '';
  return (
    <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 bg-gray-100 border-b border-gray-200 text-xs">
      {isMuted ? (
        <button onClick={() => call({ action: 'unmute' })}
          disabled={!!busy}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-green-600 hover:bg-green-700 text-white font-medium disabled:opacity-50">
          {busy === 'unmute' ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
          Unmute
        </button>
      ) : (
        <>
          <button onClick={() => call({ action: 'mute', reason: 'personal' })}
            disabled={!!busy}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium disabled:opacity-50"
            title="Hide from your follow-up queue (reversible)">
            {busy === 'mute' ? <Loader2 size={11} className="animate-spin" /> : null}
            Hide
          </button>
          <button onClick={() => call({ action: 'snooze', days: 1 })}
            disabled={!!busy}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 disabled:opacity-50">
            Snooze 1d
          </button>
          <button onClick={() => call({ action: 'snooze', days: 7 })}
            disabled={!!busy}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 disabled:opacity-50">
            Snooze 7d
          </button>
        </>
      )}

      {hasWorkhuman && (
        <>
          <div className="border-l border-gray-300 h-5 mx-1" />
          <label className="text-gray-500 mr-1">Assign:</label>
          <select value={currentAssignedTo || ''} onChange={(e) => call({ action: 'reassign', assigned_to: e.target.value || null })}
            disabled={!!busy}
            className="px-1.5 py-0.5 border border-gray-300 rounded bg-white text-xs">
            <option value="">Unassigned</option>
            {ASSIGNEE_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <label className="text-gray-500 mr-1 ml-2">Tier:</label>
          <select value={tierVal} onChange={(e) => call({ action: 'set_tier', tier: e.target.value })}
            disabled={!!busy}
            className="px-1.5 py-0.5 border border-gray-300 rounded bg-white text-xs">
            <option value="">—</option>
            <option value="tier_1a">1A</option>
            <option value="tier_1b">1B</option>
            <option value="tier_1">1</option>
            <option value="tier_2">2</option>
            <option value="tier_3">3</option>
          </select>
        </>
      )}

      <div className="ml-auto">
        {confirmDelete ? (
          <div className="inline-flex items-center gap-1">
            <span className="text-red-600 mr-1">Delete forever?</span>
            <button onClick={async () => { try { await call({ action: 'delete' }); } finally { setConfirmDelete(false); } }}
              disabled={!!busy}
              className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50">
              {busy === 'delete' ? <Loader2 size={11} className="animate-spin" /> : 'Yes, delete'}
            </button>
            <button onClick={() => setConfirmDelete(false)} disabled={!!busy}
              className="px-2 py-0.5 rounded bg-gray-200 hover:bg-gray-300 text-gray-700">
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} disabled={!!busy}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 font-medium border border-red-200"
            title="Hard delete from CRM. Replies will no longer be tracked.">
            <Trash2 size={11} /> Delete forever
          </button>
        )}
      </div>
      {error && <div className="w-full text-red-700 text-[10px] pt-1">{error}</div>}
    </div>
  );
};

// Workhuman-parity actions on an expanded card: timestamped notes editor +
// personalized landing-page creator (with logo override). Only renders when
// the card backs to a workhuman_leads row (d.workhuman.id present). Mirrors
// the ExpandedLeadRow surfaces in WorkhumanLeads.tsx so a sales rep gets
// the same affordances on either page.
const WorkhumanAffordances: React.FC<{
  leadId: string | null;            // null for non-Workhuman contacts — backend auto-creates a row
  contactEmail: string | null;      // used when leadId is null (auto-create key)
  contactName: string | null;       // used when leadId is null
  company: string | null;
  companyUrl: string | null;
  logoUrl: string | null;
  logoSource: string | null;
  landingPageUrl: string | null;
  pageViewCount: number | null;
  pageLastViewedAt: string | null;
  initialNotes: string | null;
  onMutated: () => void;
}> = ({ leadId, contactEmail, contactName, company, companyUrl, logoUrl, logoSource, landingPageUrl, pageViewCount, pageLastViewedAt, initialNotes, onMutated }) => {
  const { user } = useAuth();
  const myFirstName = useMemo(() => {
    const email = user?.email?.toLowerCase() || '';
    return REP_EMAIL_TO_FIRST_NAME[email] || 'Team';
  }, [user]);

  const [notes, setNotes] = useState(initialNotes || '');
  const [noteDraft, setNoteDraft] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [creatingPage, setCreatingPage] = useState(false);
  const [logoOverride, setLogoOverride] = useState('');
  const [showLogoOverride, setShowLogoOverride] = useState(false);
  const notesTimer = useRef<ReturnType<typeof setTimeout>>();

  const persistNotes = useCallback(async (val: string) => {
    if (!leadId) return;   // notes only persist for workhuman_leads rows
    await supabase.from('workhuman_leads').update({ notes: val }).eq('id', leadId);
  }, [leadId]);

  const handleNotesChange = (val: string) => {
    setNotes(val);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => { persistNotes(val); }, 800);
  };

  const handleAddNote = async () => {
    const trimmed = noteDraft.trim();
    if (!trimmed) return;
    setAddingNote(true);
    const stamp = new Date().toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
    const newLine = `[${stamp} · ${myFirstName}] ${trimmed}`;
    const merged = notes ? `${newLine}\n${notes}` : newLine;
    setNotes(merged);
    setNoteDraft('');
    if (notesTimer.current) clearTimeout(notesTimer.current);
    await persistNotes(merged);
    setAddingNote(false);
    onMutated();
  };

  const handleCreatePage = async (overrideUrl?: string) => {
    if (!company) return;
    setCreatingPage(true);
    // When the contact is a workhuman lead, use the typed service. Otherwise
    // call the endpoint directly with contactEmail — the backend will
    // find-or-create a workhuman_leads row so the URL + view stats persist.
    let result;
    try {
      if (leadId) {
        result = await createLandingPageForLead(
          { id: leadId, company, company_url: companyUrl || undefined, logo_url: logoUrl || undefined } as Parameters<typeof createLandingPageForLead>[0],
          overrideUrl,
        );
      } else {
        const resp = await fetch('/.netlify/functions/create-workhuman-landing-page', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName: company,
            companyDomain: companyUrl || undefined,
            overrideLogoUrl: overrideUrl || undefined,
            contactEmail: contactEmail || undefined,
            contactName: contactName || undefined,
            // The actor email becomes the assignee when we auto-create the row.
            assignedTo: REP_EMAIL_TO_FIRST_NAME[(user?.email || '').toLowerCase()]
              ? Object.entries(REP_EMAIL_TO_FIRST_NAME).find(([e]) => e === user?.email?.toLowerCase())?.[0]
              : undefined,
          }),
        });
        const j = await resp.json();
        result = { success: resp.ok && j.success, url: j.url, logoUrl: j.logoUrl, logoSource: j.logoSource, error: j.error };
      }
    } catch (e) {
      result = { success: false, error: e instanceof Error ? e.message : 'unknown' };
    }
    setCreatingPage(false);
    if (result.success) {
      setLogoOverride('');
      setShowLogoOverride(false);
      onMutated();   // refetch the parent card so it picks up the new URL + logo
    } else {
      alert(`Failed to create landing page: ${result.error || 'unknown'}`);
    }
  };

  const copyToClipboard = (s: string) => navigator.clipboard?.writeText(s).catch(() => { /* noop */ });

  return (
    <div className="space-y-4">
      {/* Landing page card */}
      <div className="border-t border-yellow-200 pt-3">
        <h4 className="text-[10px] uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1.5">
          <Sparkles size={12} className="text-amber-600" /> Personalized landing page
        </h4>
        <div className="flex flex-col md:flex-row md:items-start gap-3">
          {/* Logo preview */}
          <div className="flex items-center gap-2 shrink-0">
            {logoUrl ? (
              <div className="w-16 h-16 bg-white border border-gray-200 rounded-md flex items-center justify-center p-1.5 overflow-hidden">
                <img src={logoUrl} alt={company || ''} className="max-w-full max-h-full object-contain"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              </div>
            ) : (
              <div className="w-16 h-16 bg-gray-100 border border-dashed border-gray-300 rounded-md flex items-center justify-center text-[10px] text-gray-400">
                No logo
              </div>
            )}
            {logoSource && <div className="text-[10px] text-gray-500">{logoSource}</div>}
          </div>
          {/* URL + actions */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {landingPageUrl ? (
              <>
                <div className="flex items-center gap-1.5 text-xs min-w-0">
                  <a href={landingPageUrl} target="_blank" rel="noopener noreferrer"
                    className="text-shortcut-navy-blue hover:underline truncate inline-flex items-center gap-1 min-w-0">
                    <ExternalLink size={11} /> <span className="truncate">{landingPageUrl}</span>
                  </a>
                  <button onClick={() => copyToClipboard(landingPageUrl)}
                    className="text-gray-400 hover:text-gray-700 shrink-0" title="Copy URL">
                    <Copy size={12} />
                  </button>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-medium ${(pageViewCount ?? 0) > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                    👁 {pageViewCount ?? 0} view{pageViewCount === 1 ? '' : 's'}
                  </span>
                  {pageLastViewedAt && (
                    <span className="text-gray-500">last {new Date(pageLastViewedAt).toLocaleDateString()}</span>
                  )}
                  <button onClick={() => setShowLogoOverride(!showLogoOverride)}
                    className="text-gray-600 hover:text-gray-800 inline-flex items-center gap-1 ml-auto">
                    <RefreshCw size={10} /> Replace logo
                  </button>
                </div>
              </>
            ) : (
              <button onClick={() => handleCreatePage()}
                disabled={creatingPage || !company}
                className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 text-white text-xs font-semibold px-3 py-1.5 rounded inline-flex items-center gap-1.5">
                {creatingPage ? (<><Loader2 size={12} className="animate-spin" /> Creating…</>)
                  : (<><Sparkles size={12} /> Create landing page</>)}
              </button>
            )}
            {showLogoOverride && (
              <div className="flex gap-1.5 items-center pt-1">
                <input type="text" value={logoOverride} onChange={(e) => setLogoOverride(e.target.value)}
                  placeholder="Paste image URL"
                  className="flex-1 min-w-0 px-2 py-1 border border-gray-200 rounded text-xs" />
                <button onClick={() => logoOverride.trim() && handleCreatePage(logoOverride.trim())}
                  disabled={!logoOverride.trim() || creatingPage}
                  className="bg-gray-800 hover:bg-gray-900 disabled:bg-gray-300 text-white text-xs px-2.5 py-1 rounded shrink-0">
                  {creatingPage ? <Loader2 size={10} className="animate-spin" /> : 'Regenerate'}
                </button>
                <button onClick={() => { setShowLogoOverride(false); setLogoOverride(''); }}
                  className="text-gray-400 hover:text-gray-600 shrink-0"><X size={12} /></button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timestamped notes editor (only when the lead is in workhuman_leads —
          notes are stored on that row) */}
      {leadId && (
      <div className="border-t border-yellow-200 pt-3">
        <h4 className="text-[10px] uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1.5">
          <MessageSquare size={12} /> Notes
        </h4>
        <div className="flex items-start gap-1.5 mb-2">
          <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleAddNote(); } }}
            placeholder="Quick note (Cmd/Ctrl + Enter to save)…"
            rows={2}
            className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs resize-none focus:outline-none focus:ring-2 focus:ring-shortcut-navy-blue/20"
          />
          <button onClick={handleAddNote} disabled={!noteDraft.trim() || addingNote}
            className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 text-white text-xs font-semibold px-2.5 py-1.5 rounded inline-flex items-center gap-1 self-stretch">
            {addingNote ? <Loader2 size={10} className="animate-spin" /> : <MessageSquare size={10} />}
            Add
          </button>
        </div>
        <textarea value={notes} onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="No notes yet…"
          className="w-full h-20 px-2 py-1.5 border border-gray-200 rounded text-xs resize-none focus:outline-none focus:ring-2 focus:ring-shortcut-navy-blue/20 font-mono"
        />
      </div>
      )}
    </div>
  );
};

// Fetches + renders the CRM picture. Used inline as a row-expansion card
// (Workhuman-style) so SalesIntelligence rows feel the same as WorkhumanLeads.
// onMutated lets child Workhuman actions (notes / create landing page) ask
// the card to re-fetch so the new state shows up immediately.
const CRMCardContent: React.FC<{ target: CardTarget; onDraft: (t: DraftTarget) => void; inline?: boolean; onMutated?: (action?: LeadAction) => void }> = ({ target, onDraft, inline, onMutated }) => {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [d, setD] = useState<CardData | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const reload = useCallback((action?: LeadAction) => { setReloadTick((t) => t + 1); onMutated?.(action); }, [onMutated]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setErr(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not signed in');
        const res = await fetch('/.netlify/functions/contact-card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ email: target.email, domain: target.domain, companyId: target.companyId }),
        });
        const j = await res.json();
        if (!res.ok || !j.success) throw new Error(j.error || `Failed (${res.status})`);
        if (!cancelled) setD(j);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [target, reloadTick]);

  const draftFromCard = () => {
    if (!d) return;
    if (d.plays.play_b) onDraft({ company: target.company, play: 'B', rank: d.plays.play_b.rank, prefillEmail: d.identity.email });
    else if (d.plays.play_a) onDraft({ company: target.company, play: 'A', rank: d.plays.play_a.rank });
    else if (d.identity.email) onDraft({ company: target.company, followup: {
      email: d.identity.email, name: d.identity.name, title: d.identity.title, company: d.identity.company,
      last_sent: d.history.last_sent || '', days_since: 0, touches: d.history.emailed_count, thread_id: null } });
  };

  return (
    <div className={inline ? 'p-0 bg-gray-50' : 'p-5 space-y-5'}>
      {/* Action bar (mute/snooze/delete/reassign/tier) — only when we have
          an email to operate on (Play A is company-level, no email). */}
      {d?.identity?.email && (
        <LeadActionBar
          email={d.identity.email}
          hasWorkhuman={!!d.workhuman}
          currentAssignedTo={d.workhuman?.assigned_to || null}
          currentTier={d.workhuman?.tier || null}
          onMutated={reload}
          isMuted={d.preflight?.suppressed}
        />
      )}
      <div className={inline ? 'p-4 space-y-4' : 'space-y-5'}>
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {[d?.identity.title, d?.identity.company || d?.company?.name].filter(Boolean).join(' · ')}
        </div>
        <button onClick={draftFromCard} disabled={!d}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-shortcut-navy-blue rounded disabled:opacity-40">
          <PenLine size={14} /> Draft
        </button>
      </div>
      {loading && <div className="py-12 text-center text-gray-400">Loading CRM card…</div>}
      {err && <div className="bg-red-50 text-red-700 p-3 rounded flex items-center gap-2 text-sm"><AlertCircle size={16} /> {err}</div>}
      {d && !loading && (
            <>
              {d.preflight && (
                <div className={`text-sm px-3 py-2 rounded ${
                  d.preflight.suppressed ? 'bg-red-50 text-red-700'
                    : d.preflight.is_client ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                  Pre-flight: {RECO_COPY[d.preflight.recommendation || 'ok_to_proceed']?.text || d.preflight.recommendation}
                </div>
              )}

              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Identity</h3>
                <Row label="Email">{d.identity.email}{d.identity.email_status ? <span className="text-xs text-gray-400"> ({d.identity.email_status})</span> : null}</Row>
                <Row label="Location"><span className="inline-flex items-center gap-1"><MapPin size={12} />{d.identity.location}</span></Row>
                <Row label="LinkedIn">{d.identity.linkedin_url
                  ? <a href={d.identity.linkedin_url} target="_blank" rel="noreferrer" className="text-shortcut-navy-blue hover:underline inline-flex items-center gap-1">profile <ExternalLink size={11} /></a> : null}</Row>
                <Row label="Source">{d.identity.source}</Row>
                <Row label="Stage">{d.identity.stage}</Row>
                <Row label="Yrs in role">{d.identity.years_in_role}</Row>
              </section>

              {/* Workhuman block — surfaces tier, assignee, personal note, all
                  contact channels (phone with source, LinkedIn, personal email),
                  conference attendance, landing page, booth signups. Same data
                  Pro Slack returns from lookup_lead, rendered for the web. */}
              {d.workhuman && (
                <section className="border border-yellow-200 bg-yellow-50/50 rounded p-3 -mx-1">
                  <h3 className="text-xs font-semibold text-yellow-800 uppercase tracking-wide mb-2 flex items-center gap-2">
                    Workhuman lead
                    {d.workhuman.tier && TIER_BADGE[d.workhuman.tier] && (
                      <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${TIER_BADGE[d.workhuman.tier].tone}`}>
                        Tier {TIER_BADGE[d.workhuman.tier].label}
                      </span>
                    )}
                    {d.workhuman.conference_attendee && <span className="px-1.5 py-0.5 text-[10px] rounded bg-purple-100 text-purple-700">Attended</span>}
                    {d.workhuman.was_waitlisted && <span className="px-1.5 py-0.5 text-[10px] rounded bg-gray-200 text-gray-700">Waitlisted</span>}
                  </h3>
                  <Row label="Assigned to">{d.workhuman.assigned_to}</Row>
                  <Row label="Status">{d.workhuman.outreach_status?.replace(/_/g, ' ')}</Row>
                  {d.workhuman.personal_note && (
                    <div className="my-2 px-3 py-2 bg-white border-l-2 border-yellow-400 rounded">
                      <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
                        Personal note{d.workhuman.personal_note_by ? ` · ${d.workhuman.personal_note_by}` : ''}{d.workhuman.personal_note_at ? ` · ${d.workhuman.personal_note_at}` : ''}
                      </div>
                      <div className="text-sm text-gray-800 whitespace-pre-wrap leading-snug">{d.workhuman.personal_note}</div>
                    </div>
                  )}
                  <Row label="Phone">
                    {d.workhuman.phone ? (
                      <span className="inline-flex items-center gap-1.5">
                        <a href={`tel:${d.workhuman.phone}`} className="text-shortcut-navy-blue hover:underline">{d.workhuman.phone}</a>
                        {d.workhuman.phone_source && <span className="text-[10px] text-gray-400">({d.workhuman.phone_source.replace(/_/g, ' ')})</span>}
                      </span>
                    ) : null}
                  </Row>
                  <Row label="Personal email">{d.workhuman.personal_email}</Row>
                  <Row label="LinkedIn">{d.workhuman.linkedin_url
                    ? <a href={d.workhuman.linkedin_url} target="_blank" rel="noreferrer" className="text-shortcut-navy-blue hover:underline inline-flex items-center gap-1">profile <ExternalLink size={11} /></a> : null}</Row>
                  <Row label="HQ">{d.workhuman.hq_location}</Row>
                  <Row label="Size">{d.workhuman.company_size}{d.workhuman.multi_office ? ' · multi-office' : ''}</Row>
                  {d.workhuman.vip_slot && (
                    <Row label="VIP slot">{d.workhuman.vip_slot.day?.replace('_', ' ')} {d.workhuman.vip_slot.time}</Row>
                  )}
                  {d.workhuman.landing_page_url && (
                    <Row label="Landing page">
                      <a href={d.workhuman.landing_page_url} target="_blank" rel="noreferrer" className="text-shortcut-navy-blue hover:underline inline-flex items-center gap-1">
                        open <ExternalLink size={11} />
                      </a>
                      {d.workhuman.landing_page_views > 0 && (
                        <span className="ml-2 text-xs text-gray-500">
                          {d.workhuman.landing_page_views} view{d.workhuman.landing_page_views === 1 ? '' : 's'}
                          {d.workhuman.landing_page_last_viewed ? ` · last ${new Date(d.workhuman.landing_page_last_viewed).toLocaleDateString()}` : ''}
                        </span>
                      )}
                    </Row>
                  )}
                  {d.workhuman.booth_signups_count > 0 && (
                    <div className="mt-2 pt-2 border-t border-yellow-200">
                      <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
                        Booked at our Workhuman booth ({d.workhuman.booth_signups_count})
                      </div>
                      <div className="space-y-1">
                        {d.workhuman.booth_signups.map((s) => (
                          <div key={s.id} className="text-xs text-gray-700">
                            {s.day_label} {s.time_slot} · {s.service_type}
                            {s.team_status && <span className="ml-1 text-gray-500">({s.team_status})</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {d.workhuman.outreach_log_count > 0 && (
                    <div className="mt-2 pt-2 border-t border-yellow-200">
                      <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
                        Multi-channel outreach log ({d.workhuman.outreach_log_count})
                      </div>
                      <div className="space-y-1">
                        {d.workhuman.outreach_log.slice(0, 6).map((e, i) => (
                          <div key={i} className="text-xs">
                            <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] mr-2">{e.channel.replace(/_/g, ' ')}</span>
                            <span className="text-gray-700">{e.sender_name}</span>
                            <span className="text-gray-400 ml-2">{e.sent_at ? new Date(e.sent_at).toLocaleDateString() : ''}</span>
                            {e.message_preview && <div className="text-gray-500 mt-0.5 ml-1 truncate">{e.message_preview.slice(0, 140)}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </section>
              )}

              {/* Lead affordances: timestamped notes editor (workhuman_leads only)
                  + personalized landing-page creator (any contact with company).
                  When the lead is NOT in workhuman_leads, the backend auto-creates
                  a row so the URL + view stats persist on the contact card.
                  Mirrors the bottom of WorkhumanLeads.ExpandedLeadRow. */}
              {d.identity?.company && (
                <section className="border border-yellow-200 bg-yellow-50/50 rounded p-3 -mx-1">
                  <WorkhumanAffordances
                    leadId={d.workhuman?.id || null}
                    contactEmail={d.identity?.email || null}
                    contactName={d.identity?.name || null}
                    company={d.identity.company}
                    companyUrl={d.identity.company_url || null}
                    logoUrl={d.workhuman?.logo_url || null}
                    logoSource={d.workhuman?.logo_source || null}
                    landingPageUrl={d.workhuman?.landing_page_url || null}
                    pageViewCount={d.workhuman?.landing_page_views || null}
                    pageLastViewedAt={d.workhuman?.landing_page_last_viewed || null}
                    initialNotes={d.workhuman?.notes_raw || null}
                    onMutated={reload}
                  />
                </section>
              )}

              {/* Recent email thread — promoted to the TOP of the data sections.
                  "What was the last conversation" is the most relevant question
                  when working an active lead. Most recent thread auto-expands;
                  older threads in the same contact stay collapsed but visible
                  for quick toggle. */}
              {(() => {
                const seen = new Set<string>();
                const uniqThreads = (d.history?.sends || [])
                  .filter((s) => s.thread_id && !seen.has(s.thread_id) && (seen.add(s.thread_id) || true))
                  .sort((a, b) => new Date(b.sent_time || 0).getTime() - new Date(a.sent_time || 0).getTime());
                if (!uniqThreads.length) return null;
                return (
                  <section className="border border-blue-100 bg-blue-50/30 rounded p-3 -mx-1">
                    <h3 className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Mail size={13} /> Recent email thread{uniqThreads.length > 1 ? `s (${uniqThreads.length})` : ''}
                    </h3>
                    <div className="space-y-3">
                      {uniqThreads.slice(0, 3).map((s, i) => (
                        <div key={s.thread_id!} className="text-xs">
                          <div className="text-gray-500 mb-1">
                            {s.sent_time ? new Date(s.sent_time).toLocaleDateString() : '?'} · {s.sender_email ? s.sender_email.split('@')[0] : 'unknown'} · {s.replied ? <span className="text-green-700 font-medium">replied</span> : <span>no reply</span>}
                          </div>
                          {/* Most recent thread is open by default — that's the one the rep cares about */}
                          <ThreadView threadId={s.thread_id!} senderEmail={s.sender_email} defaultOpen={i === 0} />
                        </div>
                      ))}
                      {uniqThreads.length > 3 && (
                        <div className="text-xs text-gray-400 italic">+{uniqThreads.length - 3} older thread{uniqThreads.length - 3 === 1 ? '' : 's'} (see History below)</div>
                      )}
                    </div>
                  </section>
                );
              })()}

              {/* Proposals on file for this contact's company */}
              {(d.proposals?.length || 0) > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Proposals ({d.proposals.length})</h3>
                  <div className="space-y-1">
                    {d.proposals.slice(0, 5).map((p) => (
                      <div key={p.id} className="text-xs flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <a href={`/proposal/${p.id}`} target="_blank" rel="noreferrer" className="text-shortcut-navy-blue hover:underline truncate">
                            {p.client_name || 'Untitled'}
                          </a>
                          <span className="text-gray-400 ml-2">{p.proposal_type}</span>
                        </div>
                        <span className="text-gray-500 shrink-0">{p.status} · {p.updated_at ? new Date(p.updated_at).toLocaleDateString() : ''}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Sign-up links for events for this contact's company */}
              {(d.signups?.length || 0) > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sign-up links ({d.signups.length})</h3>
                  <div className="space-y-1">
                    {d.signups.slice(0, 5).map((s) => (
                      <div key={s.id} className="text-xs">
                        {s.signup_url ? (
                          <a href={s.signup_url} target="_blank" rel="noreferrer" className="text-shortcut-navy-blue hover:underline inline-flex items-center gap-1">
                            open <ExternalLink size={11} />
                          </a>
                        ) : <span className="text-gray-400">(no url)</span>}
                        <span className="text-gray-500 ml-2">{s.status}</span>
                        {s.created_at && <span className="text-gray-400 ml-2">{new Date(s.created_at).toLocaleDateString()}</span>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1"><Building2 size={13} /> Company / CRM</h3>
                {d.company ? (
                  <>
                    <Row label="Company">{d.company.name}</Row>
                    <Row label="Industry">{d.company.industry}</Row>
                    <Row label="Employees">{d.company.employees}</Row>
                    <Row label="Trajectory">{d.company.trajectory}</Row>
                    <Row label="Activity">{d.company.activity_status}</Row>
                    <Row label="Events run">{d.company.completed_events}</Row>
                    <Row label="Last event">{d.company.last_event_at
                      ? `${new Date(d.company.last_event_at).toLocaleDateString()}${d.company.months_since_event ? ` (${d.company.months_since_event}mo ago)` : ''}` : null}</Row>
                    <Row label="We serve">{d.company.sites_we_serve} site(s){d.company.cities.length ? `: ${d.company.cities.join(', ')}` : ''}</Row>
                    <Row label="Fit score">{d.company.fit_score}</Row>
                  </>
                ) : <p className="text-sm text-gray-400">Not matched to a CRM company (net-new / no event history).</p>}
              </section>

              {(d.plays.play_a || d.plays.play_b) && (
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">In plays</h3>
                  {d.plays.play_a && <Row label="Play A">rank #{d.plays.play_a.rank} · {d.plays.play_a.play_status || 'expand'}</Row>}
                  {d.plays.play_b && <Row label="Play B">rank #{d.plays.play_b.rank} · score {d.plays.play_b.score}</Row>}
                </section>
              )}

              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Clock size={13} /> History — emailed {d.history.emailed_count}× {d.history.replies.length ? `· ${d.history.replies.length} repl${d.history.replies.length === 1 ? 'y' : 'ies'}` : '· no reply'}
                </h3>
                {d.history.emailed_count === 0 ? (
                  <p className="text-sm text-gray-400">No outreach on record.</p>
                ) : (
                  <div className="space-y-3">
                    {d.history.replies.map((rp, i) => (
                      <div key={i} className="text-sm border-l-2 border-gray-200 pl-3">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="font-medium">{rp.date ? new Date(rp.date).toLocaleDateString() : 'reply'}</span>
                          {rp.sentiment && (
                            <span className={`px-1.5 py-0.5 rounded ${
                              rp.sentiment === 'positive' ? 'bg-green-100 text-green-700'
                                : rp.sentiment === 'negative' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                              {rp.sentiment}{rp.is_ooo ? ' · OOO' : ''}
                            </span>
                          )}
                          <span className="text-gray-400">{rp.source}</span>
                        </div>
                        <div className="text-gray-700 whitespace-pre-wrap mt-1">
                          {rp.content || <span className="text-gray-400 italic">replied (no text captured)</span>}
                        </div>
                      </div>
                    ))}
                    <div className="text-xs text-gray-500">
                      Sends:{' '}
                      {d.history.sends.map((s, i) => (
                        <span key={i} className="inline-block mr-2" title={s.sender_email ? `sent by ${s.sender_email}` : 'legacy (no sender attribution)'}>
                          {s.sent_time ? new Date(s.sent_time).toLocaleDateString() : '?'}
                          {s.touches > 1 ? `(×${s.touches})` : ''}{s.replied ? ' ✓' : ''}{s.bounced ? ' ⚠' : ''}
                          {s.sender_email ? ` · ${s.sender_email.split('@')[0]}` : ''}
                        </span>
                      ))}
                    </div>
                    {/* Threads block moved up — see "Recent email thread" section
                        above the proposals/signups. This bottom History section
                        now just shows the sends list + replies summary. */}
                  </div>
                )}
              </section>
            </>
      )}
      </div>
    </div>
  );
};

// CRMCard side-drawer removed — every tab now uses inline row expansion
// (CRMCardContent inline) so the user sees the full picture + thread in
// one smooth dropdown, matching the WorkhumanLeads UX. Saved here as a
// comment for context; the inline pattern is rendered per-tab below.

const TABS: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: 'playA', label: 'Play A — Expand', icon: <Target size={18} /> },
  { id: 'playB', label: 'Play B — Net-New', icon: <Crosshair size={18} /> },
  { id: 'law', label: 'Law — CLE', icon: <Scale size={18} /> },
  { id: 'followups', label: 'Follow-ups', icon: <Send size={18} /> },
  { id: 'brokers', label: 'Brokers', icon: <Briefcase size={18} /> },
  { id: 'drafts', label: 'Drafts', icon: <Bookmark size={18} /> },
  { id: 'recon', label: 'Reconciliation', icon: <BarChart3 size={18} /> },
  { id: 'loop', label: 'System', icon: <Workflow size={18} /> },
];

function exportCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const VALID_TABS: TabId[] = ['playA', 'playB', 'law', 'followups', 'brokers', 'drafts', 'recon', 'loop'];
// Law tab = Play B filtered to the law-firm industry (CLE/wellness vertical).
const LAW_INDUSTRY_RE = /law practice|legal services/i;
const FU_CACHE_KEY = 'sales_intel.followups.v1';
const FU_CACHE_TTL_MS = 30 * 60 * 1000;

// Rapid outreach: iterate the rep's filtered queue one lead at a time with
// pre-loaded draft + Workhuman context + Gmail thread + keyboard shortcuts.
// Used on Follow-ups today; same shape can wrap Play A / Play B later.
const RapidQueue: React.FC<{
  queue: FollowupRow[];
  fromGmail: string | null;
  onClose: () => void;
  onMutated?: () => void;
}> = ({ queue, fromGmail, onClose, onMutated }) => {
  const [idx, setIdx] = useState(0);
  const [stats, setStats] = useState({ sent: 0, saved: 0, skipped: 0, blocked: 0 });
  const [draftLoading, setDraftLoading] = useState(false);
  const [drafts, setDrafts] = useState<DraftDirection[]>([]);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [recommended, setRecommended] = useState<string | null>(null);
  const [recommendedReason, setRecommendedReason] = useState<string | null>(null);
  const [groundingNote, setGroundingNote] = useState<string | null>(null);
  const [sending, setSending] = useState<null | 'send' | 'open' | 'save'>(null);
  const [actionMsg, setActionMsg] = useState<{ kind: 'ok' | 'err' | 'blocked'; text: string; canForce?: boolean } | null>(null);
  // Manual override of the inferred draft mode (when the system says
  // never_emailed but the rep knows they've emailed, or vice versa).
  const [modeOverride, setModeOverride] = useState<'followup' | 'first_outreach' | null>(null);

  const cur = queue[idx];
  const total = queue.length;
  const inferredFirstOutreach = cur ? (cur.state === 'never_emailed' || cur.state === 'unknown_no_inbox') : false;
  const isFirstOutreach = modeOverride === 'first_outreach' ? true
    : modeOverride === 'followup' ? false
    : inferredFirstOutreach;

  // On-demand draft generation — instant navigation between leads, draft
  // only fires when the rep clicks Generate. Auto-loading was making
  // skim-through painful (10-15s per lead waiting on Anthropic).
  const [draftRequested, setDraftRequested] = useState(false);

  // Reset per-lead state whenever we advance.
  useEffect(() => {
    setModeOverride(null);
    setDraftRequested(false);
    setDrafts([]); setSubject(''); setBody(''); setActiveLabel(null);
    setRecommended(null); setRecommendedReason(null); setGroundingNote(null);
    setActionMsg(null); setErr(null);
  }, [idx]);

  // Fetch a fresh draft only when requested (or when mode is toggled mid-stream).
  useEffect(() => {
    let cancelled = false;
    if (!cur || !draftRequested) return;
    setDraftLoading(true); setErr(null); setActionMsg(null);
    setDrafts([]); setSubject(''); setBody(''); setActiveLabel(null);
    setRecommended(null); setRecommendedReason(null); setGroundingNote(null);
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not signed in');
        const draftBody = {
          followup: {
            to: cur.email, name: cur.name, title: cur.title,
            company: cur.company, days_since: cur.days_since ?? null,
            touch_number: (cur.touches || 0) + 1,
            thread_id: cur.thread_id,
            personal_note: cur.personal_note || null,
            is_first_outreach: isFirstOutreach,
          },
        };
        const res = await fetch('/.netlify/functions/draft-outreach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify(draftBody),
        });
        const j = await res.json();
        if (!res.ok || !j.success) throw new Error(j.error || `Draft failed (${res.status})`);
        if (cancelled) return;
        setDrafts(j.drafts || []);
        const ff = j.fight_for || (j.drafts?.[0]?.label || null);
        setActiveLabel(ff);
        const pick = (j.drafts || []).find((d: DraftDirection) => d.label === ff) || j.drafts?.[0];
        if (pick) { setSubject(pick.subject || ''); setBody(pick.body || ''); }
        setRecommended(j.fight_for || null);
        setRecommendedReason(j.fight_for_reason || null);
        setGroundingNote(j.grounding_note || null);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Failed to draft');
      } finally {
        if (!cancelled) setDraftLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [idx, cur, isFirstOutreach, draftRequested]);

  const switchDirection = (label: string) => {
    const d = drafts.find((x) => x.label === label);
    if (!d) return;
    setActiveLabel(label);
    setSubject(d.subject || '');
    setBody(d.body || '');
  };

  const advance = useCallback(() => {
    if (idx < total - 1) setIdx((i) => i + 1);
    else onClose();
  }, [idx, total, onClose]);
  const back = useCallback(() => { if (idx > 0) setIdx((i) => i - 1); }, [idx]);
  const skip = useCallback(() => {
    setStats((s) => ({ ...s, skipped: s.skipped + 1 }));
    advance();
  }, [advance]);

  const send = useCallback(async (force = false) => {
    // Subject is only required for fresh sends — in-thread replies inherit it from the thread.
    if (!cur || sending || !body.trim() || !fromGmail) return;
    if (!subject.trim() && !cur.thread_id) return;
    setSending('send'); setActionMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not signed in');
      const res = await fetch('/.netlify/functions/send-as-rep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          to: cur.email, fromEmail: fromGmail, subject, body,
          threadId: cur.thread_id || undefined, acknowledgedCaution: force,
        }),
      });
      const j = await res.json();
      if (res.status === 409 && j.blocked) {
        const recent = j.reason === 'recently_contacted';
        setActionMsg({
          kind: 'blocked', canForce: recent,
          text: j.reason === 'suppressed' ? 'Blocked: suppressed / do-not-contact.'
            : j.reason === 'already_client' ? 'Blocked: already an active client.'
            : 'Caution: contacted in the last 90 days. Hit Send again to override.',
        });
        setStats((s) => ({ ...s, blocked: s.blocked + 1 }));
        if (recent) { setSending(null); return; }
        advance();
        return;
      }
      if (!res.ok || !j.success) throw new Error(j.error || `Send failed (${res.status})`);
      setStats((s) => ({ ...s, sent: s.sent + 1 }));
      setActionMsg({ kind: 'ok', text: `Sent to ${cur.email}.` });
      onMutated?.();  // invalidate the underlying queue cache immediately
      setTimeout(advance, 600);
    } catch (e) {
      setActionMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Send failed' });
    } finally {
      setSending((s) => (s === 'send' ? null : s));
    }
  }, [cur, sending, subject, body, fromGmail, advance, onMutated]);

  const openGmail = useCallback(async () => {
    if (!cur || sending || !subject.trim() || !body.trim()) return;
    setSending('open'); setActionMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not signed in');
      const res = await fetch('/.netlify/functions/send-as-rep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ mode: 'open', to: cur.email, fromEmail: fromGmail, subject, body }),
      });
      const j = await res.json();
      if (!res.ok || !j.success || !j.open_url) throw new Error(j.error || `Open failed (${res.status})`);
      window.open(j.open_url, '_blank', 'noopener');
      setActionMsg({ kind: 'ok', text: 'Opened in Gmail. Send from there to finish.' });
      onMutated?.();  // 'open' mode logs the lead as contacted server-side — invalidate
      setTimeout(advance, 600);
    } catch (e) {
      setActionMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Open failed' });
    } finally {
      setSending(null);
    }
  }, [cur, sending, subject, body, fromGmail, advance, onMutated]);

  const save = useCallback(async () => {
    if (!cur || sending || !subject.trim() || !body.trim()) return;
    setSending('save'); setActionMsg(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');
      const targetRef = {
        company: cur.company || cur.email,
        followup: cur,
      };
      const { error } = await supabase.from('saved_drafts').insert({
        user_id: user.id,
        recipient_email: cur.email,
        subject, body,
        direction_label: activeLabel,
        source_company: cur.company || cur.email,
        source_contact: cur.name || null,
        source_title: cur.title || null,
        target_kind: 'followup',
        target_ref: targetRef,
        preflight_reco: null,
      });
      if (error) throw error;
      setStats((s) => ({ ...s, saved: s.saved + 1 }));
      setActionMsg({ kind: 'ok', text: 'Saved to Drafts.' });
    } catch (e) {
      setActionMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSending(null);
    }
  }, [cur, sending, subject, body, activeLabel]);

  // Keyboard shortcuts — Esc always works; others ignored while typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inText = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (inText) return;
      if (e.key === 'ArrowRight' || e.key === 'j' || e.key === 'J') { e.preventDefault(); skip(); }
      else if (e.key === 'ArrowLeft' || e.key === 'k' || e.key === 'K') { e.preventDefault(); back(); }
      else if (e.key === 's' || e.key === 'S') { e.preventDefault(); send(); }
      else if (e.key === 'o' || e.key === 'O') { e.preventDefault(); openGmail(); }
      else if (e.key === 'd' || e.key === 'D') { e.preventDefault(); save(); }
      else if (e.key === 'g' || e.key === 'G') { e.preventDefault(); if (!draftRequested) setDraftRequested(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, skip, back, send, openGmail, save, draftRequested]);

  if (!cur) {
    return createPortal(
      <div className="fixed inset-0 z-[100] bg-white p-8 flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold mb-2">Queue empty</h2>
        <button onClick={onClose} className="text-sm text-shortcut-navy-blue hover:underline">Close</button>
      </div>,
      document.body
    );
  }

  const stMeta = FU_STATE[cur.state] || FU_STATE.no_reply;
  const tierMeta = cur.tier ? (TIER_BADGE[cur.tier] || null) : null;
  const draftModeLabel = isFirstOutreach
    ? 'First outreach (no prior email — Workhuman in-person)'
    : `Follow-up · touch #${(cur.touches || 0) + 1}${cur.thread_id ? ' · threaded into prior Gmail conversation' : ''}`;

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-white overflow-y-auto">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="text-sm font-semibold text-shortcut-navy-blue">Rapid outreach</div>
            <div className="text-sm text-gray-600">{idx + 1} of {total}</div>
            <div className="text-xs text-gray-500">
              sent {stats.sent} · saved {stats.saved} · skipped {stats.skipped}{stats.blocked ? ` · blocked ${stats.blocked}` : ''}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
        </div>
        <div className="px-6 pb-3 flex items-center justify-between gap-4 flex-wrap text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold px-1.5 py-0.5 rounded ${isFirstOutreach ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
              Mode: {isFirstOutreach ? 'First outreach' : 'Follow-up'}
            </span>
            <span className="text-gray-500">{draftModeLabel}</span>
            <button
              onClick={() => setModeOverride(isFirstOutreach ? 'followup' : 'first_outreach')}
              className="text-shortcut-navy-blue hover:underline"
              title="Force the drafter to switch mode for this lead"
            >
              Switch to {isFirstOutreach ? 'follow-up' : 'first outreach'}
            </button>
            {modeOverride && (
              <button onClick={() => setModeOverride(null)} className="text-gray-400 hover:text-gray-700">
                (reset)
              </button>
            )}
          </div>
          <span className="hidden md:inline text-gray-400">
            <kbd className="bg-gray-100 border border-gray-300 px-1 rounded">G</kbd> draft · <kbd className="bg-gray-100 border border-gray-300 px-1 rounded">S</kbd> send · <kbd className="bg-gray-100 border border-gray-300 px-1 rounded">O</kbd> open · <kbd className="bg-gray-100 border border-gray-300 px-1 rounded">D</kbd> save · <kbd className="bg-gray-100 border border-gray-300 px-1 rounded">→</kbd> skip · <kbd className="bg-gray-100 border border-gray-300 px-1 rounded">Esc</kbd> exit
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-5 grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-shortcut-navy-blue flex items-center gap-2">
              {cur.name || '—'}
              {cur.conference_attendee && <span title="Attended Workhuman" className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">WH</span>}
            </h2>
            <div className="text-sm text-gray-600">{cur.title || '—'}{cur.company ? ` · ${cur.company}` : ''}</div>
            <div className="text-sm text-gray-500 mt-1">
              <a href={`mailto:${cur.email}`} className="text-shortcut-navy-blue hover:underline">{cur.email}</a>
              {cur.linkedin_url && <a href={cur.linkedin_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-shortcut-navy-blue hover:underline">LinkedIn</a>}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${stMeta.tone}`}>{stMeta.label}</span>
              {tierMeta && <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${tierMeta.tone}`}>T{tierMeta.label}</span>}
              {cur.assigned_to && <span className="text-xs text-gray-500">assigned: {cur.assigned_to.split(' ')[0]}</span>}
              {cur.outreach_status && <span className="text-xs text-gray-500">status: {cur.outreach_status.replace(/_/g, ' ')}</span>}
              {cur.days_since != null && cur.last_sent && <span className="text-xs text-gray-500">last sent {cur.days_since}d ago</span>}
              {cur.touches > 0 && <span className="text-xs text-gray-500">touches: {cur.touches}</span>}
            </div>
          </div>

          {cur.personal_note && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded">
              <div className="text-[10px] font-semibold text-amber-900 uppercase tracking-wide mb-1">Personal note from the conference</div>
              <div className="text-sm text-gray-800 whitespace-pre-wrap leading-snug">{cur.personal_note}</div>
            </div>
          )}

          {cur.thread_id && (
            <div className="border-t border-gray-100 pt-3">
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Gmail thread (latest sent + latest reply)</div>
              <ThreadView threadId={cur.thread_id} senderEmail={cur.sender_email} defaultOpen />
            </div>
          )}

          {cur.landing_page_url && (
            <div className="text-xs text-gray-500">
              Landing page: <a href={cur.landing_page_url} target="_blank" rel="noopener noreferrer" className="text-shortcut-navy-blue hover:underline">{cur.landing_page_url.replace(/^https?:\/\//, '').slice(0, 40)}</a>
              {cur.page_view_count != null && <> · {cur.page_view_count} views</>}
            </div>
          )}
        </div>

        <div className="lg:col-span-3 space-y-3">
          {/* On-demand draft: instant navigation; the LLM call only happens
              when the rep decides to engage. Skip-through stays fast. */}
          {!draftRequested && !draftLoading && drafts.length === 0 && !err && (
            <div className="border border-gray-200 rounded p-8 text-center bg-gray-50 space-y-3">
              <div className="text-sm text-gray-600">
                Skim the context, then draft when you're ready to engage.
              </div>
              <button
                onClick={() => setDraftRequested(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-shortcut-navy-blue rounded hover:opacity-90"
              >
                <PenLine size={14} /> Generate draft
                <kbd className="text-[10px] opacity-70 ml-1 bg-white/20 px-1 rounded">G</kbd>
              </button>
              <div className="text-xs text-gray-400">
                Or hit <kbd className="bg-gray-100 border border-gray-300 px-1 rounded">→</kbd> / <kbd className="bg-gray-100 border border-gray-300 px-1 rounded">J</kbd> to skip to the next lead.
              </div>
            </div>
          )}
          {draftLoading && <div className="py-12 text-center text-gray-400 border border-gray-200 rounded">Drafting in brand voice…</div>}
          {err && <div className="bg-red-50 text-red-700 p-3 rounded flex items-center gap-2 text-sm"><AlertCircle size={16} /> {err}</div>}
          {!draftLoading && !err && drafts.length > 0 && (
            <>
              <div className="flex items-center gap-2">
                {drafts.map((d) => (
                  <button
                    key={d.label}
                    onClick={() => switchDirection(d.label)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition ${
                      activeLabel === d.label
                        ? 'border-shortcut-navy-blue bg-shortcut-navy-blue text-white'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                  >
                    {d.label}{recommended === d.label ? ' ★' : ''}
                  </button>
                ))}
              </div>
              {recommendedReason && <div className="text-xs text-gray-500 italic">{recommendedReason}</div>}
              <input
                type="text" value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm font-medium"
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={Math.min(20, Math.max(8, body.split('\n').length + 1))}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm leading-relaxed font-mono"
              />
              {groundingNote && <div className="text-xs text-gray-400">{groundingNote}</div>}
              {actionMsg && (
                <div className={`text-sm px-3 py-2 rounded ${
                  actionMsg.kind === 'ok' ? 'bg-green-50 text-green-800'
                    : actionMsg.kind === 'blocked' ? 'bg-amber-50 text-amber-800'
                    : 'bg-red-50 text-red-700'}`}>
                  {actionMsg.text}
                  {actionMsg.canForce && (
                    <button onClick={() => send(true)} className="ml-2 underline font-medium">Send anyway</button>
                  )}
                </div>
              )}
              <div className="flex items-center gap-3 pt-2 flex-wrap">
                <button
                  onClick={() => send()}
                  disabled={!fromGmail || sending !== null}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-shortcut-navy-blue rounded disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send size={14} /> {sending === 'send' ? 'Sending…' : 'Send via Gmail'}
                </button>
                <button
                  onClick={openGmail}
                  disabled={sending !== null}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
                >
                  <Mail size={14} /> {sending === 'open' ? 'Opening…' : 'Open in Gmail'}
                </button>
                <button
                  onClick={save}
                  disabled={sending !== null}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
                >
                  <Bookmark size={14} /> {sending === 'save' ? 'Saving…' : 'Save'}
                </button>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={back}
                    disabled={idx === 0}
                    className="text-sm text-gray-500 hover:text-gray-800 disabled:opacity-30"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={skip}
                    className="text-sm font-medium text-gray-700 px-3 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Skip →
                  </button>
                </div>
              </div>
              {!fromGmail && (
                <div className="text-xs text-amber-700">Connect Gmail in the page header to enable Send via Gmail.</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

const SalesIntelligence: React.FC = () => {
  // Sticky tab: URL hash survives refresh natively + is shareable.
  const [tab, setTab] = useState<TabId>(() => {
    try {
      const h = window.location.hash.replace(/^#/, '') as TabId;
      if (VALID_TABS.includes(h)) return h;
    } catch { /* SSR/safety */ }
    return 'playA';
  });
  useEffect(() => {
    try { window.history.replaceState(null, '', `#${tab}`); } catch { /* */ }
  }, [tab]);
  const [playA, setPlayA] = useState<PlayARow[]>([]);
  const [playB, setPlayB] = useState<PlayBRow[]>([]);
  const [recon, setRecon] = useState<ReconRow[]>([]);
  // Follow-ups cache survives page refresh + tab switches; explicit refresh
  // button is the only thing that re-fetches. TTL guards stale data.
  const [followups, setFollowups] = useState<FollowupRow[] | null>(() => {
    try {
      const raw = sessionStorage.getItem(FU_CACHE_KEY);
      if (!raw) return null;
      const c = JSON.parse(raw);
      if (Date.now() - (c.ts || 0) > FU_CACHE_TTL_MS) return null;
      return c.data || null;
    } catch { return null; }
  });
  const [fuLoadedScope, setFuLoadedScope] = useState<'mine' | 'team' | null>(() => {
    try {
      const raw = sessionStorage.getItem(FU_CACHE_KEY);
      return raw ? (JSON.parse(raw).scope || null) : null;
    } catch { return null; }
  });
  const _initialFuInbox = (() => {
    try { const raw = sessionStorage.getItem(FU_CACHE_KEY); return raw ? (JSON.parse(raw).inbox || null) : null; } catch { return null; }
  })();
  const [savedDrafts, setSavedDrafts] = useState<SavedDraftRow[] | null>(null);
  const [sdLoading, setSdLoading] = useState(false);
  const [fuLoading, setFuLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [draftTarget, setDraftTarget] = useState<DraftTarget | null>(null);
  // cardTarget removed — replaced with inline expansion (paExpanded / pbExpanded / fuExpanded).
  const [pbFilter, setPbFilter] = useState<PBFilter>('all');
  const [pbDeliv, setPbDeliv] = useState<PBDeliv | 'all'>('verified');   // default: hide catch-all + bad
  const [hideInCampaign, setHideInCampaign] = useState(false);
  const [pbSort, setPbSort] = useState<PBSort>('state');
  const [pbExpanded, setPbExpanded] = useState<string | null>(null);
  // Play A inline expansion (matches Play B + Workhuman pattern — no side drawer).
  const [paExpanded, setPaExpanded] = useState<number | null>(null);
  const [gmailNotice, setGmailNotice] = useState<string | null>(null);
  const [pageGmail, setPageGmail] = useState<{
    connected: boolean; email: string | null;
    sent_crawl_enabled: boolean; last_sent_crawl_at: string | null;
  } | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);

  const refreshGmail = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/.netlify/functions/gmail-status', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const j = await res.json();
      if (res.ok) setPageGmail({
        connected: !!j.connected, email: j.email || null,
        sent_crawl_enabled: !!j.sent_crawl_enabled, last_sent_crawl_at: j.last_sent_crawl_at || null,
      });
    } catch { /* best-effort */ }
  }, []);

  const toggleSentSync = useCallback(async () => {
    if (!pageGmail?.connected || syncBusy) return;
    setSyncBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/.netlify/functions/gmail-sync-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ enabled: !pageGmail.sent_crawl_enabled }),
      });
      const j = await res.json();
      if (res.ok && j.success) await refreshGmail();
    } finally { setSyncBusy(false); }
  }, [pageGmail, syncBusy, refreshGmail]);

  const disconnectGmailPage = useCallback(async () => {
    if (!confirm('Disconnect Gmail? Your access + refresh tokens will be revoked at Google. Your digest preferences (Slack mapping, timezone, opt-ins) are preserved so reconnecting restores everything.')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/.netlify/functions/gmail-oauth-disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: '{}',
      });
      const j = await res.json();
      if (res.ok && j.ok) {
        await refreshGmail();
      } else {
        alert(`Disconnect failed: ${j.error || res.status}`);
      }
    } catch (e) {
      alert(`Disconnect failed: ${e instanceof Error ? e.message : 'unknown'}`);
    }
  }, [refreshGmail]);

  const connectGmailPage = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/.netlify/functions/gmail-oauth-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: '{}',
      });
      const j = await res.json();
      // Same-tab redirect — iOS Safari's popup blocker silently swallows
      // window.open() after an awaited fetch. OAuth callback returns to
      // /sales-intelligence so top-level navigation is the right pattern.
      if (res.ok && j.url) window.location.href = j.url;
    } catch { /* surfaced via banner on return */ }
  }, []);

  useEffect(() => { refreshGmail(); }, [refreshGmail]);

  useEffect(() => {
    const g = new URLSearchParams(window.location.search).get('gmail');
    if (!g) return;
    setGmailNotice(
      g === 'connected' ? 'Gmail connected. You can now send drafts from your inbox.'
        : g === 'denied' ? 'Gmail connection was declined.'
        : g === 'noretoken' ? 'Gmail returned no refresh token. Remove the app at myaccount.google.com/permissions, then connect again.'
        : 'Gmail connection failed. Please try connecting again.',
    );
    if (g === 'connected') refreshGmail();
    window.history.replaceState({}, '', window.location.pathname);
  }, [refreshGmail]);

  // Slack-digest "Draft" deep link — Pro DMs land at `?lead=<email>#followups`.
  // On mount we capture the param. Once followups load + match by email, we
  // open the draft modal automatically and clear the param so a refresh
  // doesn't keep re-opening it.
  const [pendingDeepLinkEmail, setPendingDeepLinkEmail] = useState<string | null>(null);
  useEffect(() => {
    const lead = new URLSearchParams(window.location.search).get('lead');
    if (!lead) return;
    setPendingDeepLinkEmail(lead.toLowerCase());
    // Force the followups tab so the user lands on the right view immediately.
    try { window.history.replaceState(null, '', '#followups' + (window.location.search ? '' : '')); } catch { /* */ }
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [a, b, r] = await Promise.all([
        supabase.from('crm_play_a').select('*').order('rank', { ascending: true }),
        supabase.from('crm_play_b').select('*').order('rank', { ascending: true }),
        supabase.from('crm_reconciliation').select('*').order('total', { ascending: false }),
      ]);
      if (a.error) throw a.error;
      if (b.error) throw b.error;
      if (r.error) throw r.error;
      setPlayA(a.data || []); setPlayB(b.data || []); setRecon(r.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const [fuScope, setFuScope] = useState<'mine' | 'team'>('mine');
  const [fuExpanded, setFuExpanded] = useState<string | null>(null);
  const [fuNote, setFuNote] = useState<string | null>(null);
  const [fuInbox, setFuInbox] = useState<InboxBanner | null>(_initialFuInbox);
  const [fuTotalBeforeCap, setFuTotalBeforeCap] = useState<number | null>(null);
  // Bulk selection — checkboxes per row, bulk action bar appears when >0.
  const [selectedFollowupEmails, setSelectedFollowupEmails] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState<string | null>(null);
  const [bulkConfirmDelete, setBulkConfirmDelete] = useState(false);
  // Sort: null = default (state-then-recency); otherwise click-driven header
  // sort. Sort happens client-side over the already-fetched + filtered list.
  type FuSortBy = 'recency' | 'name' | 'company' | 'state' | 'touches';
  const [followupSort, setFollowupSort] = useState<{ by: FuSortBy; dir: 'asc' | 'desc' } | null>(null);
  const toggleFollowupSort = useCallback((by: FuSortBy) => {
    setFollowupSort((prev) => {
      if (prev?.by !== by) return { by, dir: 'desc' };
      if (prev.dir === 'desc') return { by, dir: 'asc' };
      return null;   // third click → back to default
    });
  }, []);
  const [fuStateFilter, setFuStateFilter] = useState<'all' | 'never_emailed' | 'no_reply' | 'replied' | 'muted'>('all');
  const [rapidQueue, setRapidQueue] = useState<FollowupRow[] | null>(null);
  // Separate state for muted leads — fetched on-demand when the chip is clicked
  // so the main queue doesn't carry the muted overhead on every load.
  const [mutedLeads, setMutedLeads] = useState<FollowupRow[] | null>(null);
  const [mutedLoading, setMutedLoading] = useState(false);
  const loadFollowups = useCallback(async (scope: 'mine' | 'team') => {
    setFuLoading(true); setFuNote(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not signed in');
      const res = await fetch(`/.netlify/functions/followups?scope=${scope}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error(j.error || `Failed (${res.status})`);
      const data = j.followups || [];
      setFollowups(data);
      setFuLoadedScope(scope);
      setFuInbox(j.inbox || null);
      setFuTotalBeforeCap(typeof j.total_before_cap === 'number' ? j.total_before_cap : null);
      if (j.note) setFuNote(j.note);
      try { sessionStorage.setItem(FU_CACHE_KEY, JSON.stringify({ data, scope, ts: Date.now(), note: j.note || null, inbox: j.inbox || null })); } catch { /* quota etc */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load follow-ups');
      setFollowups([]);
    } finally {
      setFuLoading(false);
    }
  }, []);

  const loadMutedLeads = useCallback(async () => {
    setMutedLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not signed in');
      const res = await fetch('/.netlify/functions/followups?include_muted=1', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error(j.error || `Failed (${res.status})`);
      setMutedLeads(j.followups || []);
    } catch (e) {
      console.warn('loadMutedLeads failed:', e);
      setMutedLeads([]);
    } finally {
      setMutedLoading(false);
    }
  }, []);

  // Fetch only when needed: first visit to followups tab, scope changed, or
  // someone reset followups to null (e.g., after a send invalidates the queue).
  useEffect(() => {
    if (tab !== 'followups') return;
    if (followups === null || fuLoadedScope !== fuScope) loadFollowups(fuScope);
  }, [tab, fuScope, followups, fuLoadedScope, loadFollowups]);

  // Lazy-load muted leads when the chip is first clicked.
  useEffect(() => {
    if (tab !== 'followups') return;
    if (fuStateFilter === 'muted' && mutedLeads === null && !mutedLoading) loadMutedLeads();
  }, [tab, fuStateFilter, mutedLeads, mutedLoading, loadMutedLeads]);

  // Slack-digest "Draft" deep link follow-through: once we've forced the
  // followups tab AND followups have loaded, find the matching FollowupRow
  // by email and open the draft modal. Clears the pending state once handled
  // so a tab switch doesn't re-open it.
  useEffect(() => {
    if (!pendingDeepLinkEmail) return;
    if (tab !== 'followups') { setTab('followups'); return; }   // first force the tab
    if (!followups) return;                                       // wait for data
    const match = followups.find((f) => f.email?.toLowerCase() === pendingDeepLinkEmail);
    if (match) {
      setDraftTarget({ company: match.company || match.email, followup: match });
    } else {
      // No matching follow-up row — could be a never-emailed personal-note lead
      // or a contact that aged out of the queue. Either way, don't trap the
      // user; clear pending state and let them browse manually.
      console.warn('Slack deep link: no follow-up found for', pendingDeepLinkEmail);
    }
    setPendingDeepLinkEmail(null);
    // Clean the URL so a refresh doesn't re-open the modal.
    try { window.history.replaceState(null, '', window.location.pathname + '#followups'); } catch { /* */ }
  }, [pendingDeepLinkEmail, tab, followups]);

  const loadSavedDrafts = useCallback(async () => {
    setSdLoading(true);
    try {
      const { data, error } = await supabase.from('saved_drafts').select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSavedDrafts(data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load drafts');
      setSavedDrafts([]);
    } finally {
      setSdLoading(false);
    }
  }, []);

  useEffect(() => {
    // Refetch when entering Drafts tab AND whenever the draft modal closes
    // (a save/delete inside the modal should be reflected on return).
    if (tab === 'drafts' && !draftTarget) loadSavedDrafts();
  }, [tab, draftTarget, loadSavedDrafts]);

  // ----- Brokers tab — healthcare broker + carrier-HEC GTM queue -----
  const [brokers, setBrokers] = useState<BrokerRow[] | null>(null);
  const [brokersLoading, setBrokersLoading] = useState(false);
  const [brokersScope, setBrokersScope] = useState<'mine' | 'team'>('mine');
  const [brokerTrackFilter, setBrokerTrackFilter] = useState<'all' | 'broker' | 'carrier_hec'>('all');
  const [brokerStateFilter, setBrokerStateFilter] = useState<'all' | 'never_emailed' | 'in_cadence' | 'replied'>('all');
  const [brokerTierFilter, setBrokerTierFilter] = useState<'all' | 'tier_1' | 'tier_2' | 'tier_3'>('all');
  // Inline expansion: clicking a broker row drops down a panel showing the
  // firm "why" insight, NYC presence, full CRM card via the shared
  // CRMCardContent (so all the contact data we have shows up).
  const [brokerExpanded, setBrokerExpanded] = useState<string | null>(null);

  const loadBrokers = useCallback(async (scope: 'mine' | 'team') => {
    setBrokersLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not signed in');
      const res = await fetch(`/.netlify/functions/brokers?scope=${scope}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error(j.error || `Failed (${res.status})`);
      setBrokers(j.brokers || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load brokers');
      setBrokers([]);
    } finally {
      setBrokersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'brokers' && brokers === null) loadBrokers(brokersScope);
  }, [tab, brokers, brokersScope, loadBrokers]);

  const generatedAt = playA[0]?.generated_at || playB[0]?.generated_at || recon[0]?.generated_at || null;

  const fa = useMemo(
    () => playA.filter((x) => !search || x.company_name?.toLowerCase().includes(search.toLowerCase())),
    [playA, search],
  );
  // The Law tab reuses the entire Play B render against the law-industry subset.
  const pbBase = useMemo(
    () => (tab === 'law' ? playB.filter((x) => LAW_INDUSTRY_RE.test(x.industry || '')) : playB),
    [playB, tab],
  );
  const pbCounts = useMemo(() => {
    const c: Record<string, number> = { all: pbBase.length, replied: 0, no_reply: 0, net_new: 0, re_engage: 0, verified: 0, catchall: 0, bad: 0, in_campaign: 0 };
    for (const x of pbBase) {
      if (x.engagement_state) c[x.engagement_state] = (c[x.engagement_state] || 0) + 1;
      c[delivOf(x)] += 1;
      if (x.in_campaign) c.in_campaign += 1;
    }
    return c;
  }, [pbBase]);

  const fb = useMemo(() => {
    const sRank: Record<string, number> = { replied: 0, no_reply: 1, net_new: 2, re_engage: 3 };
    let rows = pbBase.filter((x) => !search
      || x.company_name?.toLowerCase().includes(search.toLowerCase())
      || x.contact_name?.toLowerCase().includes(search.toLowerCase())
      || x.contact_email?.toLowerCase().includes(search.toLowerCase())
      || x.contact_title?.toLowerCase().includes(search.toLowerCase()));
    if (pbFilter !== 'all') rows = rows.filter((x) => x.engagement_state === pbFilter);
    if (pbDeliv !== 'all') rows = rows.filter((x) => delivOf(x) === pbDeliv);
    if (hideInCampaign) rows = rows.filter((x) => !x.in_campaign);
    const cmp: Record<PBSort, (a: PlayBRow, b: PlayBRow) => number> = {
      state: (a, b) => (sRank[a.engagement_state || 'z'] - sRank[b.engagement_state || 'z']) || (b.score - a.score),
      score: (a, b) => b.score - a.score,
      touches: (a, b) => (b.touches || 0) - (a.touches || 0),
      recent: (a, b) => new Date(b.last_contacted_at || 0).getTime() - new Date(a.last_contacted_at || 0).getTime(),
    };
    return [...rows].sort(cmp[pbSort]);
  }, [pbBase, search, pbFilter, pbDeliv, hideInCampaign, pbSort]);

  const th = 'text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-2';
  const td = 'px-3 py-2 text-sm text-gray-800 border-t border-gray-100';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-start justify-between mb-2">
        <h1 className="text-3xl font-extrabold text-shortcut-navy-blue flex items-center gap-3">
          <Target size={28} /> Sales Intelligence
        </h1>
        <div className="flex items-center gap-4">
          {pageGmail?.connected ? (
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1.5 text-green-700">
                <Mail size={15} /> {pageGmail.email}
              </span>
              <button
                onClick={toggleSentSync}
                disabled={syncBusy}
                title={pageGmail.sent_crawl_enabled
                  ? 'Stop pulling your Gmail sends into the pipeline'
                  : 'Pull your manual Gmail sends (and their replies) into the follow-up queue / CRM card history. Forward-only — no historical backfill.'}
                className={`text-xs px-2 py-1 rounded border ${
                  pageGmail.sent_crawl_enabled
                    ? 'border-green-600 text-green-700 hover:bg-green-50'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'} disabled:opacity-50`}
              >
                Sent-mail sync: {pageGmail.sent_crawl_enabled ? 'ON' : 'OFF'}
                {pageGmail.sent_crawl_enabled && pageGmail.last_sent_crawl_at
                  ? ` · last ${formatDistanceToNow(new Date(pageGmail.last_sent_crawl_at), { addSuffix: true })}`
                  : ''}
              </button>
              <button
                onClick={connectGmailPage}
                title="Re-run Gmail consent (needed after we add new scopes — e.g. drafts.create permission for Open in Gmail)"
                className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                Reconnect
              </button>
              <button
                onClick={disconnectGmailPage}
                title="Revoke Gmail access. Your digest preferences are preserved so reconnecting restores them."
                className="text-xs px-2 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={connectGmailPage}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50"
            >
              <Mail size={15} /> Connect Gmail
            </button>
          )}
          <button
            onClick={() => { load(); setFollowups(null); setSavedDrafts(null); }}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            title="Refresh plays + queues + drafts"
          >
            <RefreshCw size={16} /> Reload
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        {generatedAt
          ? `Lists generated ${formatDistanceToNow(new Date(generatedAt), { addSuffix: true })} — read-only; regenerated on schedule.`
          : 'No data generated yet.'}
      </p>

      {gmailNotice && (
        <div className="bg-blue-50 text-blue-800 p-3 rounded flex items-center justify-between gap-2 mb-4 text-sm">
          <span className="flex items-center gap-2"><Mail size={16} /> {gmailNotice}</span>
          <button onClick={() => setGmailNotice(null)} className="text-blue-500 hover:text-blue-700">
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded flex items-center gap-2 mb-4">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === t.id
                ? 'border-shortcut-navy-blue text-shortcut-navy-blue'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {(tab === 'playA' || tab === 'playB' || tab === 'law') && (
        <div className="flex items-center justify-between mb-3 gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company or title…"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm"
            />
          </div>
          <button
            onClick={() => (tab === 'playA'
              ? exportCSV(fa as unknown as Record<string, unknown>[], 'play_a.csv')
              : exportCSV(fb as unknown as Record<string, unknown>[], tab === 'law' ? 'law_leads.csv' : 'play_b.csv'))}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            <FileDown size={16} /> Export CSV
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-gray-400">Loading…</div>
      ) : tab === 'playA' ? (
        <div className="overflow-x-auto border border-gray-200 rounded">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className={th}></th>
                <th className={th}>#</th><th className={th}>Company</th><th className={th}>Fit</th>
                <th className={th}>Employees</th><th className={th}>Industry</th>
                <th className={th}>We serve</th><th className={th}>Offices</th>
                <th className={th}>Last event</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody>
              {fa.map((r) => {
                const open = paExpanded === r.rank;
                return (
                  <React.Fragment key={r.rank}>
                    <tr className={`hover:bg-gray-50 cursor-pointer transition-colors ${open ? 'bg-blue-50/50' : ''}`}
                      onClick={() => setPaExpanded(open ? null : r.rank)}>
                      <td className={`${td} text-gray-400`}>{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</td>
                      <td className={td}>{r.rank}</td>
                      <td className={`${td} font-medium`}>
                        {r.company_name}
                        {r.play_status === 're_engage' && (
                          <span className="ml-2 text-xs font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                            Re-engage
                          </span>
                        )}
                      </td>
                      <td className={td}>{r.fit_score}</td>
                      <td className={td}>{r.employees}</td>
                      <td className={td}>{r.industry}</td>
                      <td className={td}>{r.sites_served}</td>
                      <td className={`${td} text-gray-500`}>{r.sites_list}</td>
                      <td className={td}>
                        {r.last_event_at
                          ? <span className={r.play_status === 're_engage' ? 'text-amber-700' : 'text-gray-600'}>
                              {r.months_since_event != null && r.months_since_event > 0
                                ? `${r.months_since_event}mo ago`
                                : new Date(r.last_event_at).toLocaleDateString()}
                            </span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className={td}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDraftTarget({ play: 'A', rank: r.rank, company: r.company_name }); }}
                          className="flex items-center gap-1.5 text-xs font-medium text-shortcut-navy-blue hover:underline"
                        >
                          <PenLine size={14} /> Draft
                        </button>
                      </td>
                    </tr>
                    {open && (
                      <tr>
                        <td colSpan={10} className="border-t border-gray-100 p-0 bg-gray-50/50">
                          <CRMCardContent
                            inline
                            target={{ company: r.company_name, companyId: r.company_id }}
                            onDraft={(t) => setDraftTarget(t)}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (tab === 'playB' || tab === 'law') ? (
        <div>
          {tab === 'law' && (
            <div className="mb-3 text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              Law firm vertical. Lead with the accredited Ethics CLE wedge in <strong>NY, FL, PA</strong> only, then upsell the wellness day. CLE is not accredited elsewhere.
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {(['all', 'replied', 'no_reply', 'net_new', 're_engage'] as PBFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setPbFilter(f)}
                title={f === 'all' ? 'Everything' : PB_STATE[f].hint}
                className={`text-xs px-2.5 py-1 rounded-full border transition ${
                  pbFilter === f
                    ? 'border-shortcut-navy-blue bg-shortcut-navy-blue text-white'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              >
                {f === 'all' ? 'All' : PB_STATE[f].label} <span className="opacity-70">({pbCounts[f] ?? 0})</span>
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
              <span>Sort</span>
              <select
                value={pbSort}
                onChange={(e) => setPbSort(e.target.value as PBSort)}
                className="border border-gray-300 rounded px-2 py-1 text-xs"
              >
                <option value="state">Warmest first</option>
                <option value="score">Lookalike score</option>
                <option value="recent">Most recently contacted</option>
                <option value="touches">Most touches</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-[11px] uppercase tracking-wide text-gray-400 mr-1">Email</span>
            {(['verified', 'catchall', 'bad', 'all'] as (PBDeliv | 'all')[]).map((d) => (
              <button
                key={d}
                onClick={() => setPbDeliv(d)}
                title={d === 'verified' ? 'MV-ok or BounceBan-deliverable — safe to send' : d === 'catchall' ? 'Catch-all, not yet resolved by BounceBan' : d === 'bad' ? 'Invalid / undeliverable — do not send' : 'Everything'}
                className={`text-xs px-2.5 py-1 rounded-full border transition ${
                  pbDeliv === d
                    ? 'border-shortcut-navy-blue bg-shortcut-navy-blue text-white'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              >
                {d === 'all' ? 'All' : PB_DELIV[d].label} <span className="opacity-70">({d === 'all' ? pbCounts.all : pbCounts[d] ?? 0})</span>
              </button>
            ))}
            <label className="ml-auto flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
              <input type="checkbox" checked={hideInCampaign} onChange={(e) => setHideInCampaign(e.target.checked)} className="rounded border-gray-300" />
              Hide in-campaign <span className="opacity-70">({pbCounts.in_campaign ?? 0})</span>
            </label>
          </div>
          <div className="overflow-x-auto border border-gray-200 rounded">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className={th}></th><th className={th}>#</th><th className={th}>Company</th>
                  <th className={th}>State</th><th className={th}>Score</th>
                  <th className={th}>Contact</th><th className={th}>Title</th>
                  <th className={th}>Last touch</th><th className={th}>Last sender</th><th className={th}></th>
                </tr>
              </thead>
              <tbody>
                {fb.map((r) => {
                  const key = `${r.rank}-${r.domain}`;
                  const open = pbExpanded === key;
                  const st = r.engagement_state ? PB_STATE[r.engagement_state] : null;
                  return (
                    <React.Fragment key={key}>
                      <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => setPbExpanded(open ? null : key)}>
                        <td className={`${td} text-gray-400`}>{open ? '▾' : '▸'}</td>
                        <td className={td}>{r.rank}</td>
                        <td className={`${td} font-medium`}>
                          {r.company_name}
                          {r.in_campaign && (
                            <span className="ml-2 align-middle text-[10px] font-semibold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded"
                              title={`Already in a Smartlead campaign${r.smartlead_campaign_id ? ` (${r.smartlead_campaign_id})` : ''}`}>
                              in campaign
                            </span>
                          )}
                        </td>
                        <td className={td}>
                          {st && (
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${st.tone}`} title={st.hint}>
                              {st.label}
                              {r.engagement_state === 'replied' && r.reply_sentiment ? ` · ${r.reply_sentiment}` : ''}
                              {r.is_leadgen ? ' · fresh' : ''}
                            </span>
                          )}
                        </td>
                        <td className={td}>{r.score}</td>
                        <td className={td}>
                          <div>{r.contact_name}</div>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            {r.contact_email
                              ? <span className="text-gray-500">{r.contact_email}</span>
                              : <span className="italic">no email</span>}
                            {(r.mv_status || r.bounceban_status) && (
                              <span
                                className={`px-1 rounded text-[10px] font-semibold ${PB_DELIV[delivOf(r)].tone}`}
                                title={`MillionVerifier: ${r.mv_status || '—'}${r.bounceban_status ? ` · BounceBan: ${r.bounceban_status}` : ''}`}>
                                {r.mv_status === 'catch_all' && r.bounceban_status === 'deliverable' ? 'verified ✓' : PB_DELIV[delivOf(r)].label}
                              </span>
                            )}
                            {r.contact_linkedin && (
                              <a href={r.contact_linkedin} target="_blank" rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-shortcut-navy-blue hover:underline">in</a>
                            )}
                          </div>
                        </td>
                        <td className={`${td} text-gray-500`}>{r.contact_title} <span className="text-xs text-gray-400">({r.title_category})</span></td>
                        <td className={td}>
                          {r.last_contacted_at
                            ? <span className="text-gray-600">{new Date(r.last_contacted_at).toLocaleDateString()}{r.touches ? ` · ${r.touches}×` : ''}</span>
                            : <span className="text-gray-300">never</span>}
                        </td>
                        <td className={td}>
                          {r.last_sender_name
                            ? <span className="text-xs font-medium text-gray-700" title={r.last_sender_email || ''}>{r.last_sender_name.split(' ')[0]}</span>
                            : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className={td}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDraftTarget({ play: 'B', rank: r.rank, company: r.company_name, prefillEmail: r.contact_email }); }}
                            className="flex items-center gap-1.5 text-xs font-medium text-shortcut-navy-blue hover:underline"
                          >
                            <PenLine size={14} /> Draft
                          </button>
                        </td>
                      </tr>
                      {open && (
                        <tr>
                          <td colSpan={10} className="border-t border-gray-100 p-0">
                            <CRMCardContent
                              inline
                              target={{ company: r.company_name, email: r.contact_email, domain: r.domain }}
                              onDraft={(t) => setDraftTarget(t)}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === 'followups' ? (
        <div>
          {/* Inbox status banner — preloaded leads + accuracy warning when not connected */}
          {fuInbox && !fuInbox.connected && (
            <div className="mb-3 p-3 rounded border border-amber-200 bg-amber-50 text-amber-900 text-sm flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <div>
                <strong>Connect your Gmail to verify send/reply status.</strong> Personal-note leads are preloaded from Workhuman so you can work them now — but until you connect, we can't tell which ones you've already emailed. Hit <Mail size={12} className="inline-block -mt-0.5" /> Connect Gmail in the header.
              </div>
            </div>
          )}
          {fuInbox?.connected && !fuInbox.assignee_name && (
            <div className="mb-3 p-3 rounded border border-amber-200 bg-amber-50 text-amber-900 text-sm flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <div>
                Couldn't match <code className="text-xs">{fuInbox.email}</code> to a Workhuman assignee (Will / Jaimie / Marc / Caren). Personal-note leads won't preload for you until that mapping is added.
              </div>
            </div>
          )}

          {/* Controls: scope + state filter */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {(['mine', 'team'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFuScope(s)}
                className={`text-xs px-3 py-1 rounded-full border transition ${
                  fuScope === s
                    ? 'border-shortcut-navy-blue bg-shortcut-navy-blue text-white'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              >
                {s === 'mine' ? 'My leads' : 'Whole team'}
              </button>
            ))}
            <div className="w-px h-5 bg-gray-200 mx-1" />
            {([
              { id: 'all',           label: 'All' },
              { id: 'never_emailed', label: 'Never emailed' },
              { id: 'no_reply',      label: 'No reply' },
              { id: 'replied',       label: 'Replied' },
              { id: 'muted',         label: 'Muted' },
            ] as const).map((f) => {
              const n = f.id === 'all'
                ? (followups?.length || 0)
                : f.id === 'muted'
                  ? (mutedLeads?.length ?? '…')
                  : (followups || []).filter((x) => f.id === 'never_emailed' ? (x.state === 'never_emailed' || x.state === 'unknown_no_inbox') : x.state === f.id).length;
              return (
                <button
                  key={f.id}
                  onClick={() => setFuStateFilter(f.id)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition ${
                    fuStateFilter === f.id
                      ? 'border-shortcut-navy-blue bg-shortcut-navy-blue text-white'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                >
                  {f.label} <span className="opacity-70">({n})</span>
                </button>
              );
            })}
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => {
                  const visible = (followups || []).filter((r) => {
                    if (fuStateFilter === 'all') return r.state !== 'replied' && r.state !== 'maxed';
                    if (fuStateFilter === 'never_emailed') return r.state === 'never_emailed' || r.state === 'unknown_no_inbox';
                    return r.state === fuStateFilter;
                  });
                  if (visible.length > 0) setRapidQueue(visible);
                }}
                disabled={!followups || followups.length === 0}
                className="flex items-center gap-1.5 text-xs font-medium text-white bg-shortcut-navy-blue px-3 py-1 rounded hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                title="One-lead-at-a-time queue with pre-loaded drafts + keyboard shortcuts"
              >
                <Send size={13} /> Rapid mode
              </button>
              <button
                onClick={() => { setFollowups(null); }}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800"
                title="Refetch the queue"
              >
                <RefreshCw size={13} /> Refresh
              </button>
            </div>
          </div>
          {fuNote && <div className="text-xs text-amber-700 mb-2">{fuNote}</div>}

          <div className="overflow-x-auto border border-gray-200 rounded">
            {fuLoading && !followups ? (
              <div className="py-16 text-center text-gray-400">Loading your queue…</div>
            ) : !followups || followups.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                No personal-note leads or follow-ups for you.
              </div>
            ) : (() => {
              // Muted view: pull from the separately-fetched mutedLeads state.
              const source = fuStateFilter === 'muted' ? (mutedLeads || []) : (followups || []);
              const filtered = source.filter((r) => {
                if (fuStateFilter === 'muted') return true;          // already pre-filtered server-side
                if (fuStateFilter === 'all') return true;
                if (fuStateFilter === 'never_emailed') return r.state === 'never_emailed' || r.state === 'unknown_no_inbox';
                return r.state === fuStateFilter;
              });
              // Apply user-selected sort (click on column header). Default
              // ordering happens server-side: never_emailed first, then most-
              // recent-by-days_since. User sort overrides.
              const visible = [...filtered];
              if (followupSort) {
                const dirMul = followupSort.dir === 'asc' ? 1 : -1;
                const stateOrder: Record<string, number> = { never_emailed: 0, unknown_no_inbox: 0, no_reply: 1, replied: 2, maxed: 3 };
                visible.sort((a, b) => {
                  switch (followupSort.by) {
                    case 'recency': {
                      const av = a.days_since ?? 9999;
                      const bv = b.days_since ?? 9999;
                      return (av - bv) * dirMul;
                    }
                    case 'name': return ((a.name || a.email || '').localeCompare(b.name || b.email || '')) * dirMul;
                    case 'company': return ((a.company || '').localeCompare(b.company || '')) * dirMul;
                    case 'state': return ((stateOrder[a.state] ?? 9) - (stateOrder[b.state] ?? 9)) * dirMul;
                    case 'touches': return ((a.touches || 0) - (b.touches || 0)) * dirMul;
                    default: return 0;
                  }
                });
              }
              if (fuStateFilter === 'muted' && mutedLeads === null) {
                return <div className="py-16 text-center text-gray-400">Loading muted leads…</div>;
              }
              if (visible.length === 0) {
                return <div className="py-16 text-center text-gray-400">No rows match this filter.</div>;
              }
              // Helper for sortable column header look + click
              const SortHdr = ({ by, label }: { by: FuSortBy; label: string }) => {
                const active = followupSort?.by === by;
                const arrow = !active ? '' : followupSort?.dir === 'asc' ? ' ↑' : ' ↓';
                return (
                  <button onClick={() => toggleFollowupSort(by)} className={`${active ? 'text-shortcut-navy-blue font-semibold' : 'text-gray-600 hover:text-gray-900'} text-xs font-medium uppercase tracking-wider`}>
                    {label}{arrow}
                  </button>
                );
              };
              // Bulk action handler — fires lead-actions for each selected
              // email in parallel, then filters them out of local state.
              const bulkApply = async (action: 'mute' | 'snooze' | 'delete', days?: number) => {
                setBulkBusy(action);
                try {
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session) throw new Error('Not signed in');
                  const emails = [...selectedFollowupEmails];
                  await Promise.all(emails.map((email) => fetch('/.netlify/functions/lead-actions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                    body: JSON.stringify({ email, action, ...(days ? { days } : {}), ...(action === 'mute' ? { reason: 'personal' } : {}) }),
                  }).then((r) => r.json())));
                  setFollowups((prev) => (prev || []).filter((x) => !selectedFollowupEmails.has(x.email)));
                  setMutedLeads(null);
                  setSelectedFollowupEmails(new Set());
                  setBulkConfirmDelete(false);
                } catch (e) {
                  console.error('bulk action failed:', e);
                } finally { setBulkBusy(null); }
              };
              const allVisibleSelected = visible.length > 0 && visible.every((r) => selectedFollowupEmails.has(r.email));
              const toggleSelectAll = () => {
                setSelectedFollowupEmails((prev) => {
                  if (allVisibleSelected) {
                    const next = new Set(prev);
                    for (const r of visible) next.delete(r.email);
                    return next;
                  }
                  const next = new Set(prev);
                  for (const r of visible) next.add(r.email);
                  return next;
                });
              };
              const toggleSelect = (email: string) => {
                setSelectedFollowupEmails((prev) => {
                  const next = new Set(prev);
                  if (next.has(email)) next.delete(email);
                  else next.add(email);
                  return next;
                });
              };
              return (
              <>
              {selectedFollowupEmails.size > 0 && (
                <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-amber-50 border-y border-amber-200 text-xs">
                  <span className="font-semibold text-amber-900">{selectedFollowupEmails.size} selected</span>
                  <span className="text-amber-700">·</span>
                  <button disabled={!!bulkBusy} onClick={() => bulkApply('mute')} className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium disabled:opacity-50">
                    {bulkBusy === 'mute' ? <Loader2 size={11} className="animate-spin" /> : null} Hide all
                  </button>
                  <button disabled={!!bulkBusy} onClick={() => bulkApply('snooze', 1)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 disabled:opacity-50">
                    Snooze 1d
                  </button>
                  <button disabled={!!bulkBusy} onClick={() => bulkApply('snooze', 7)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 disabled:opacity-50">
                    Snooze 7d
                  </button>
                  {bulkConfirmDelete ? (
                    <span className="inline-flex items-center gap-1 ml-auto">
                      <span className="text-red-700 mr-1">Delete {selectedFollowupEmails.size} forever?</span>
                      <button disabled={!!bulkBusy} onClick={() => bulkApply('delete')} className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50">
                        {bulkBusy === 'delete' ? <Loader2 size={11} className="animate-spin" /> : 'Yes, delete'}
                      </button>
                      <button onClick={() => setBulkConfirmDelete(false)} className="px-2 py-0.5 rounded bg-gray-200 hover:bg-gray-300 text-gray-700">Cancel</button>
                    </span>
                  ) : (
                    <button onClick={() => setBulkConfirmDelete(true)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 font-medium border border-red-200 ml-auto" title="Hard delete from CRM — replies will no longer be tracked.">
                      <Trash2 size={11} /> Delete forever
                    </button>
                  )}
                  <button onClick={() => setSelectedFollowupEmails(new Set())} className="text-gray-500 hover:text-gray-900 ml-1">Clear</button>
                </div>
              )}
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className={th}>
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAll}
                        className="cursor-pointer"
                        title={allVisibleSelected ? 'Deselect all visible' : 'Select all visible'}
                      />
                    </th>
                    <th className={th}></th>
                    <th className={th}><SortHdr by="state" label="State" /></th>
                    <th className={th}><SortHdr by="name" label="Contact" /></th>
                    <th className={th}><SortHdr by="company" label="Company" /></th>
                    <th className={th}>Personal note</th>
                    <th className={th}><SortHdr by="recency" label="Last sent" /></th>
                    {fuScope === 'team' && <th className={th}>Sent by</th>}
                    <th className={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => {
                    const open = fuExpanded === r.email;
                    const stMeta = FU_STATE[r.state] || FU_STATE.no_reply;
                    const tierMeta = r.tier ? (TIER_BADGE[r.tier] || null) : null;
                    const canDraft = r.state !== 'maxed';
                    const isFirstOutreach = r.state === 'never_emailed' || r.state === 'unknown_no_inbox';
                    const draftLabel = isFirstOutreach ? 'Draft outreach' : 'Draft follow-up';
                    // +1 for the new leading checkbox column
                    const cols = fuScope === 'team' ? 9 : 8;
                    const isSelected = selectedFollowupEmails.has(r.email);
                    return (
                      <React.Fragment key={r.email}>
                        <tr className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => setFuExpanded(open ? null : r.email)}>
                          <td className={td}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onClick={(e) => e.stopPropagation()}
                              onChange={() => toggleSelect(r.email)}
                              className="cursor-pointer"
                            />
                          </td>
                          <td className={`${td} text-gray-400`}>{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</td>
                          <td className={td}>
                            <div className="flex flex-col gap-1">
                              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${stMeta.tone}`} title={stMeta.hint}>
                                {stMeta.label}
                                {r.state === 'no_reply' && r.days_since != null ? ` · ${r.days_since}d` : ''}
                                {r.touches > 0 && r.state !== 'never_emailed' && r.state !== 'unknown_no_inbox' ? ` · ${r.touches}×` : ''}
                              </span>
                              {tierMeta && (
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded inline-block w-fit ${tierMeta.tone}`} title="Workhuman tier">
                                  T{tierMeta.label}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className={td}>
                            <div className="flex items-center gap-1.5">
                              <span>{r.name || '—'}</span>
                              {r.conference_attendee && <span title="Attended Workhuman booth" className="text-[10px] bg-purple-100 text-purple-700 px-1 rounded">WH</span>}
                              {r.linkedin_url && (
                                <a href={r.linkedin_url} target="_blank" rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs text-shortcut-navy-blue hover:underline">in</a>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">{r.email}</div>
                            {r.title && <div className="text-xs text-gray-400">{r.title}</div>}
                          </td>
                          <td className={td}>
                            <div>{r.company || '—'}</div>
                            {r.outreach_status && (
                              <div className="text-xs text-gray-400">{r.outreach_status.replace(/_/g, ' ')}</div>
                            )}
                          </td>
                          <td className={`${td} max-w-xs`}>
                            {r.personal_note ? (
                              <div className="text-xs text-gray-700 italic line-clamp-2" title={r.personal_note}>
                                "{r.personal_note.replace(/\[[^\]]*\]\s*/g, '').slice(0, 140)}{r.personal_note.length > 140 ? '…' : ''}"
                              </div>
                            ) : <span className="text-xs text-gray-300">—</span>}
                          </td>
                          <td className={`${td} text-xs text-gray-500`}>
                            {r.last_sent ? new Date(r.last_sent).toLocaleDateString() : <span className="italic text-gray-400">—</span>}
                          </td>
                          {fuScope === 'team' && (
                            <td className={`${td} text-xs text-gray-500`}>
                              {r.sender_email ? r.sender_email.split('@')[0] : r.assigned_to ? <span className="text-gray-400">{r.assigned_to.split(' ')[0]}</span> : <span className="italic text-gray-400">—</span>}
                            </td>
                          )}
                          <td className={td}>
                            {canDraft && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setDraftTarget({ company: r.company || r.email, followup: r }); }}
                                className="flex items-center gap-1.5 text-xs font-medium text-shortcut-navy-blue hover:underline"
                              >
                                <PenLine size={14} /> {draftLabel}
                              </button>
                            )}
                          </td>
                        </tr>
                        {open && (
                          <tr>
                            <td colSpan={cols} className="border-t border-gray-100 p-0 bg-gray-50/50">
                              <CRMCardContent
                                inline
                                target={{ company: r.company || r.email, email: r.email, domain: r.email?.split('@')[1] || null }}
                                onDraft={(t) => setDraftTarget(t)}
                                onMutated={(action) => {
                                  // Surgical state update instead of a full
                                  // refetch (whole tab was reloading on every
                                  // mute/snooze). Mute / snooze / delete remove
                                  // the row from the active queue; unmute moves
                                  // it back from the muted bucket; reassign
                                  // and set_tier mutate in place. Card itself
                                  // already refetches via its own reload tick.
                                  if (!action) return;  // workhuman-affordance mutation (note edit, landing-page create) — card refetches itself
                                  if (['mute', 'snooze', 'delete'].includes(action)) {
                                    setFollowups((prev) => (prev || []).filter((x) => x.email !== r.email));
                                    setMutedLeads(null);   // muted bucket will refetch when filter clicked
                                    setFuExpanded(null);   // close the expansion since the row is gone
                                  } else if (action === 'unmute') {
                                    setMutedLeads((prev) => (prev || []).filter((x) => x.email !== r.email));
                                    setFollowups(null);    // active queue will refetch when user re-enters
                                  } else if (action === 'reassign' || action === 'set_tier') {
                                    // Card refetches its own view via reload; main row only shows email/state which didn't change
                                  }
                                }}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
              </>
              );
            })()}
          </div>

          {/* Total count + cap indicator — tells the rep "you're seeing
              everything" or surfaces if we ever hit MAX_RESULTS=2000. */}
          {followups && followups.length > 0 && fuStateFilter !== 'muted' && (() => {
            const filteredCount = (followups || []).filter((r) => {
              if (fuStateFilter === 'all') return true;
              if (fuStateFilter === 'never_emailed') return r.state === 'never_emailed' || r.state === 'unknown_no_inbox';
              return r.state === fuStateFilter;
            }).length;
            const truncated = fuTotalBeforeCap !== null && fuTotalBeforeCap > followups.length;
            return (
              <div className="text-xs text-gray-500 mt-2 px-1 flex items-center justify-between">
                <span>
                  Showing <strong>{filteredCount}</strong>
                  {fuStateFilter !== 'all' && ` ${fuStateFilter.replace('_', ' ')} of ${followups.length} total`}
                  {fuStateFilter === 'all' && ` of ${followups.length}`}
                </span>
                {truncated && (
                  <span className="text-amber-700">
                    Server cap hit ({followups.length} of {fuTotalBeforeCap}+ total) — message Will to raise the cap.
                  </span>
                )}
              </div>
            );
          })()}
        </div>
      ) : tab === 'brokers' ? (
        <div className="space-y-3">
          {/* Filter chips */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-gray-500 font-medium">Track:</span>
            {(['all', 'broker', 'carrier_hec'] as const).map((t) => (
              <button key={t} onClick={() => setBrokerTrackFilter(t)}
                className={`px-2 py-1 rounded ${brokerTrackFilter === t ? 'bg-shortcut-navy-blue text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {t === 'all' ? 'All' : t === 'broker' ? 'Brokers' : 'Carrier HECs'}
              </button>
            ))}
            <span className="text-gray-500 font-medium ml-3">Tier:</span>
            {(['all', 'tier_1', 'tier_2', 'tier_3'] as const).map((t) => (
              <button key={t} onClick={() => setBrokerTierFilter(t)}
                className={`px-2 py-1 rounded ${brokerTierFilter === t ? 'bg-shortcut-navy-blue text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {t === 'all' ? 'All' : t.replace('tier_', 'T')}
              </button>
            ))}
            <span className="text-gray-500 font-medium ml-3">State:</span>
            {(['all', 'never_emailed', 'in_cadence', 'replied'] as const).map((t) => (
              <button key={t} onClick={() => setBrokerStateFilter(t)}
                className={`px-2 py-1 rounded ${brokerStateFilter === t ? 'bg-shortcut-navy-blue text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {t === 'all' ? 'All' : t.replace('_', ' ')}
              </button>
            ))}
            <span className="ml-auto flex items-center gap-2">
              <span className="text-gray-500 font-medium">Scope:</span>
              {(['mine', 'team'] as const).map((s) => (
                <button key={s} onClick={() => { setBrokersScope(s); setBrokers(null); loadBrokers(s); }}
                  className={`px-2 py-1 rounded ${brokersScope === s ? 'bg-shortcut-navy-blue text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  {s === 'mine' ? 'Mine' : 'Team'}
                </button>
              ))}
              <button onClick={() => { setBrokers(null); loadBrokers(brokersScope); }} className="text-gray-500 hover:text-gray-900" title="Refresh">
                <RefreshCw size={14} />
              </button>
            </span>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded">
            {brokersLoading && !brokers ? (
              <div className="py-16 text-center text-gray-400">Loading broker queue…</div>
            ) : !brokers || brokers.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                No broker contacts assigned to you yet. Talk to Will to seed your stack.
              </div>
            ) : (() => {
              const visible = (brokers || []).filter((r) => {
                if (brokerTrackFilter !== 'all' && r.firm_track !== brokerTrackFilter) return false;
                if (brokerTierFilter !== 'all' && r.firm_tier !== brokerTierFilter) return false;
                if (brokerStateFilter !== 'all' && r.state !== brokerStateFilter) return false;
                return true;
              });
              if (visible.length === 0) return <div className="py-16 text-center text-gray-400">No rows match these filters.</div>;
              return (
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className={th}></th>
                      <th className={th}>State</th>
                      <th className={th}>Contact</th>
                      <th className={th}>Firm</th>
                      <th className={th}>Tier / Track</th>
                      <th className={th}>Last sent</th>
                      <th className={th}>Touches</th>
                      <th className={th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((r) => {
                      const isOpen = brokerExpanded === r.email;
                      const stateBadge = r.state === 'never_emailed'
                        ? <span className="px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-800">Never emailed</span>
                        : r.state === 'replied'
                        ? <span className="px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-800">Replied</span>
                        : <span className="px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-800">In cadence</span>;
                      const tierBadge = r.firm_tier === 'tier_1' ? 'T1' : r.firm_tier === 'tier_2' ? 'T2' : r.firm_tier === 'tier_3' ? 'T3' : '—';
                      return (
                        <React.Fragment key={r.email}>
                        <tr
                          className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                          onClick={() => setBrokerExpanded(isOpen ? null : r.email)}
                        >
                          <td className={td}>
                            <span className="text-gray-400 inline-block w-4">{isOpen ? '▾' : '▸'}</span>
                          </td>
                          <td className={td}>{stateBadge}</td>
                          <td className={td}>
                            <div className="font-medium text-gray-900">{r.name || r.email}</div>
                            <div className="text-xs text-gray-500">{r.title || '—'}</div>
                            {r.linkedin_url && <a href={r.linkedin_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-shortcut-navy-blue hover:underline inline-flex items-center gap-1">linkedin <ExternalLink size={10} /></a>}
                          </td>
                          <td className={td}>
                            <div className="font-medium text-gray-900">{r.firm_name}</div>
                            {r.firm_nyc && <div className="text-xs text-gray-500">{r.firm_nyc}</div>}
                          </td>
                          <td className={td}>
                            <span className="text-xs font-semibold text-gray-700">{tierBadge}</span>
                            <span className="text-xs text-gray-500 ml-2">{r.firm_track === 'carrier_hec' ? 'HEC' : 'Broker'}</span>
                            {r.firm_priority !== null && <span className="text-xs text-gray-400 ml-2">#{r.firm_priority}</span>}
                          </td>
                          <td className={td}>
                            {r.last_sent ? `${r.days_since}d ago` : <span className="text-gray-400">—</span>}
                          </td>
                          <td className={td}>{r.emailed_count || 0}</td>
                          <td className={td}>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDraftTarget({
                                company: r.firm_name,
                                followup: {
                                  email: r.email, name: r.name, title: r.title, company: r.firm_name,
                                  state: r.state === 'never_emailed' ? 'never_emailed' : (r.state === 'replied' ? 'replied' : 'no_reply'),
                                  last_sent: r.last_sent || '', days_since: r.days_since || 0,
                                  touches: r.emailed_count || 0, thread_id: null,
                                  sender_email: r.sender_email || null,
                                  // BROKER GTM context — keys off `track` to flip
                                  // the prompt out of Workhuman-personal-note mode
                                  // into the wellness-fund pitch.
                                  track: (r.firm_track === 'carrier_hec' ? 'carrier_hec' : 'broker'),
                                  firm_tier: r.firm_tier,
                                  firm_why: r.firm_why,
                                  firm_nyc: r.firm_nyc,
                                  is_first_outreach: r.state === 'never_emailed',
                                  // Personal-note + Workhuman flags must be false so
                                  // the draft pipeline doesn't accidentally treat
                                  // this as a booth lead.
                                  is_personal_note: false, has_workhuman: false,
                                  personal_note: null, linkedin_url: r.linkedin_url,
                                  landing_page_url: null,
                                  assigned_to: r.assigned_to, tier: null, outreach_status: null,
                                  conference_attendee: false, was_waitlisted: false, vip_slot: null,
                                } as FollowupRow,
                              }); }}
                              className="flex items-center gap-1.5 text-xs font-medium text-shortcut-navy-blue hover:underline"
                            >
                              <PenLine size={14} /> Draft
                            </button>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr>
                            <td colSpan={8} className="border-t border-gray-100 p-0 bg-gray-50/50">
                              {/* Action bar matches the Follow-ups tab expanded
                                  row — Hide / Snooze / Delete + (for Workhuman
                                  contacts) Reassign / Tier dropdowns. Brokers
                                  generally aren't workhuman_leads so the WH
                                  affordances render disabled, but Hide / Snooze
                                  / Delete still work. */}
                              <LeadActionBar
                                email={r.email}
                                hasWorkhuman={false}
                                currentAssignedTo={r.assigned_to || null}
                                currentTier={null}
                                onMutated={(action) => {
                                  if (!action) return;
                                  if (['mute', 'snooze', 'delete'].includes(action)) {
                                    setBrokers((prev) => (prev || []).filter((x) => x.email !== r.email));
                                    setBrokerExpanded(null);
                                  }
                                }}
                              />
                              {/* Firm insight blurb — the "why" Pro uses to
                                  compose emails. So the rep sees what context
                                  Pro is reasoning over. */}
                              {r.firm_why && (
                                <div className="mx-3 mt-3 mb-3 p-3 bg-white border border-blue-200 rounded">
                                  <div className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide mb-1">Firm insight (used in drafts)</div>
                                  <div className="text-sm text-gray-700 leading-snug">{r.firm_why}</div>
                                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                                    {r.firm_nyc && <span><strong>NYC presence:</strong> {r.firm_nyc}</span>}
                                    {r.firm_tier && <span><strong>Tier:</strong> {r.firm_tier.replace('tier_', 'T')}</span>}
                                    {r.firm_track && <span><strong>Track:</strong> {r.firm_track === 'carrier_hec' ? 'Carrier HEC' : 'Broker'}</span>}
                                    {r.firm_priority !== null && r.firm_priority !== undefined && <span><strong>Priority rank:</strong> #{r.firm_priority}</span>}
                                  </div>
                                </div>
                              )}
                              {/* Full CRM card — same shared inline view the
                                  Follow-ups tab uses. Identity (Location, Source,
                                  Yrs in role) + recent threads + proposals +
                                  landing-page links all render. */}
                              <CRMCardContent
                                inline
                                target={{ company: r.firm_name, email: r.email }}
                                onDraft={(t) => setDraftTarget(t)}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              );
            })()}
          </div>

          {brokers && brokers.length > 0 && (
            <div className="text-xs text-gray-500 px-1">
              Showing <strong>{(brokers || []).filter((r) => {
                if (brokerTrackFilter !== 'all' && r.firm_track !== brokerTrackFilter) return false;
                if (brokerTierFilter !== 'all' && r.firm_tier !== brokerTierFilter) return false;
                if (brokerStateFilter !== 'all' && r.state !== brokerStateFilter) return false;
                return true;
              }).length}</strong> of {brokers.length} total in your queue
            </div>
          )}
        </div>
      ) : tab === 'drafts' ? (
        <div className="overflow-x-auto border border-gray-200 rounded">
          {sdLoading ? (
            <div className="py-16 text-center text-gray-400">Loading saved drafts…</div>
          ) : !savedDrafts || savedDrafts.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              No saved drafts. Hit <Bookmark size={12} className="inline-block -mt-0.5" /> Save in the draft modal to park one for later.
            </div>
          ) : (
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className={th}>Saved</th><th className={th}>Company</th>
                  <th className={th}>To</th><th className={th}>Subject</th>
                  <th className={th}>Source</th><th className={th}></th>
                </tr>
              </thead>
              <tbody>
                {savedDrafts.map((sd) => (
                  <tr key={sd.id} className="hover:bg-gray-50">
                    <td className={`${td} text-gray-500 text-xs whitespace-nowrap`}>
                      {formatDistanceToNow(new Date(sd.created_at), { addSuffix: true })}
                    </td>
                    <td className={`${td} font-medium`}>{sd.source_company || '—'}</td>
                    <td className={`${td} text-gray-600`}>{sd.recipient_email || <span className="italic text-gray-400">no recipient</span>}</td>
                    <td className={td}>
                      <div className="text-gray-800 max-w-md truncate" title={sd.subject}>{sd.subject || <span className="italic text-gray-400">no subject</span>}</div>
                      <div className="text-xs text-gray-400 max-w-md truncate" title={sd.body}>{(sd.body || '').slice(0, 120)}</div>
                    </td>
                    <td className={`${td} text-xs text-gray-500`}>
                      {sd.target_kind || '—'}{sd.direction_label ? ` · ${sd.direction_label}` : ''}
                    </td>
                    <td className={td}>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setDraftTarget({
                            company: sd.source_company || sd.recipient_email || 'Saved draft',
                            ...((sd.target_ref || {}) as Partial<DraftTarget>),
                            savedDraft: {
                              id: sd.id, subject: sd.subject, body: sd.body,
                              direction_label: sd.direction_label || 'saved',
                              recipient_email: sd.recipient_email,
                            },
                          })}
                          className="flex items-center gap-1.5 text-xs font-medium text-shortcut-navy-blue hover:underline"
                        >
                          <PenLine size={14} /> Open
                        </button>
                        <button
                          onClick={async () => {
                            const { error } = await supabase.from('saved_drafts').delete().eq('id', sd.id);
                            if (!error) loadSavedDrafts();
                          }}
                          className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : tab === 'loop' ? (
        <SystemLoopDiagram />
      ) : (
        <div className="space-y-4">
          {recon.map((r) => (
            <div key={r.bucket} className="border border-gray-200 rounded p-4">
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold text-gray-800">{r.bucket.replace(/_/g, ' ')}</h3>
                <span className="text-2xl font-bold text-shortcut-navy-blue">{r.total.toLocaleString()}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(r.title_breakdown || {})
                  .sort((a, b) => b[1] - a[1])
                  .map(([t, n]) => (
                    <span key={t} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {t}: {n.toLocaleString()}
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CRMCard side-drawer removed — replaced with inline row expansion
          across all tabs (Workhuman parity). See paExpanded / pbExpanded /
          fuExpanded. */}

      {draftTarget && (
        <DraftModal
          target={draftTarget}
          onMutated={() => {
            setFollowups(null);                    // refetch follow-ups
            try { sessionStorage.removeItem(FU_CACHE_KEY); } catch { /* */ }
          }}
          onClose={() => {
            const wasFollowup = !!draftTarget.followup;
            setDraftTarget(null);
            if (wasFollowup) setFollowups(null); // belt-and-suspenders
          }}
        />
      )}

      {rapidQueue && (
        <RapidQueue
          queue={rapidQueue}
          fromGmail={pageGmail?.email || null}
          onMutated={() => {
            setFollowups(null);
            try { sessionStorage.removeItem(FU_CACHE_KEY); } catch { /* */ }
          }}
          onClose={() => { setRapidQueue(null); setFollowups(null); }}
        />
      )}
    </div>
  );
};

export default SalesIntelligence;
