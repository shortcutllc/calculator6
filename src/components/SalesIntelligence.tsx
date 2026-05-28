import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Target, Crosshair, BarChart3, Search, FileDown, RefreshCw, AlertCircle, PenLine, X, Copy, Check, Send, Mail, Building2, MapPin, ExternalLink, Clock, Bookmark, BookmarkCheck, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../lib/supabaseClient';

type TabId = 'playA' | 'playB' | 'followups' | 'drafts' | 'recon';
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
      window.open(j.url, '_blank', 'noopener');
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
              personal_note: target.followup.personal_note || null,  // in-person Workhuman note to ground a fresh outreach
              is_first_outreach: target.followup.state === 'never_emailed' || target.followup.state === 'unknown_no_inbox',
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
          <div>
            <h2 className="text-lg font-bold text-shortcut-navy-blue flex items-center gap-2">
              <PenLine size={18} /> {target.followup ? 'Follow-up' : 'Draft outreach'} — {target.company}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {target.followup
                ? `Follow-up #${(target.followup.touches || 1) + 1} · no reply in ${target.followup.days_since}d · sends on the same Gmail thread.`
                : `Play ${target.play} · rank ${target.rank}`} · human-in-the-loop. Review and edit before sending. The pre-flight gate re-checks the recipient on send.
            </p>
          </div>
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
const ThreadView: React.FC<{ threadId: string; defaultOpen?: boolean }> = ({ threadId, defaultOpen = false }) => {
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
        body: JSON.stringify({ thread_id: threadId }),
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
  }, [threadId]);

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

// Fetches + renders the CRM picture. Used both in the side drawer and inline
// (Workhuman-style row dropdown) so the two surfaces never drift.
const CRMCardContent: React.FC<{ target: CardTarget; onDraft: (t: DraftTarget) => void; inline?: boolean }> = ({ target, onDraft, inline }) => {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [d, setD] = useState<CardData | null>(null);

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
  }, [target]);

  const draftFromCard = () => {
    if (!d) return;
    if (d.plays.play_b) onDraft({ company: target.company, play: 'B', rank: d.plays.play_b.rank, prefillEmail: d.identity.email });
    else if (d.plays.play_a) onDraft({ company: target.company, play: 'A', rank: d.plays.play_a.rank });
    else if (d.identity.email) onDraft({ company: target.company, followup: {
      email: d.identity.email, name: d.identity.name, title: d.identity.title, company: d.identity.company,
      last_sent: d.history.last_sent || '', days_since: 0, touches: d.history.emailed_count, thread_id: null } });
  };

  return (
    <div className={inline ? 'p-4 space-y-4 bg-gray-50' : 'p-5 space-y-5'}>
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
                    {/* Threads with bodies (live from rep's Gmail). Per unique thread_id. */}
                    {(() => {
                      const seen = new Set<string>();
                      const uniq = d.history.sends
                        .filter((s) => s.thread_id && !seen.has(s.thread_id) && (seen.add(s.thread_id) || true))
                        .sort((a, b) => new Date(b.sent_time || 0).getTime() - new Date(a.sent_time || 0).getTime());
                      if (!uniq.length) return null;
                      return (
                        <div className="space-y-2 pt-2 border-t border-gray-100">
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Threads (from your Gmail)</div>
                          {uniq.map((s) => (
                            <div key={s.thread_id!} className="text-xs">
                              <div className="text-gray-500 mb-1">
                                {s.sent_time ? new Date(s.sent_time).toLocaleDateString() : '?'} ·{' '}
                                {s.sender_email ? s.sender_email.split('@')[0] : 'unknown'} ·{' '}
                                {s.replied ? <span className="text-green-700">replied</span> : <span>no reply</span>}
                              </div>
                              <ThreadView threadId={s.thread_id!} />
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </section>
            </>
      )}
    </div>
  );
};

const CRMCard: React.FC<{ target: CardTarget; onClose: () => void; onDraft: (t: DraftTarget) => void }> = ({ target, onClose, onDraft }) => (
  <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onClose}>
    <div className="bg-white w-full max-w-xl h-full overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-start justify-between p-5 border-b border-gray-200 sticky top-0 bg-white z-10">
        <h2 className="text-lg font-bold text-shortcut-navy-blue">{target.company}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
      </div>
      <CRMCardContent target={target} onDraft={onDraft} />
    </div>
  </div>
);

const TABS: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: 'playA', label: 'Play A — Expand', icon: <Target size={18} /> },
  { id: 'playB', label: 'Play B — Net-New', icon: <Crosshair size={18} /> },
  { id: 'followups', label: 'Follow-ups', icon: <Send size={18} /> },
  { id: 'drafts', label: 'Drafts', icon: <Bookmark size={18} /> },
  { id: 'recon', label: 'Reconciliation', icon: <BarChart3 size={18} /> },
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

const VALID_TABS: TabId[] = ['playA', 'playB', 'followups', 'drafts', 'recon'];
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
              <ThreadView threadId={cur.thread_id} defaultOpen />
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
  const [cardTarget, setCardTarget] = useState<CardTarget | null>(null);
  const [pbFilter, setPbFilter] = useState<PBFilter>('all');
  const [pbSort, setPbSort] = useState<PBSort>('state');
  const [pbExpanded, setPbExpanded] = useState<string | null>(null);
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
      if (res.ok && j.url) window.open(j.url, '_blank', 'noopener');
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
  const [fuStateFilter, setFuStateFilter] = useState<'all' | 'never_emailed' | 'no_reply' | 'replied'>('all');
  const [rapidQueue, setRapidQueue] = useState<FollowupRow[] | null>(null);
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
      if (j.note) setFuNote(j.note);
      try { sessionStorage.setItem(FU_CACHE_KEY, JSON.stringify({ data, scope, ts: Date.now(), note: j.note || null, inbox: j.inbox || null })); } catch { /* quota etc */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load follow-ups');
      setFollowups([]);
    } finally {
      setFuLoading(false);
    }
  }, []);

  // Fetch only when needed: first visit to followups tab, scope changed, or
  // someone reset followups to null (e.g., after a send invalidates the queue).
  useEffect(() => {
    if (tab !== 'followups') return;
    if (followups === null || fuLoadedScope !== fuScope) loadFollowups(fuScope);
  }, [tab, fuScope, followups, fuLoadedScope, loadFollowups]);

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

  const generatedAt = playA[0]?.generated_at || playB[0]?.generated_at || recon[0]?.generated_at || null;

  const fa = useMemo(
    () => playA.filter((x) => !search || x.company_name?.toLowerCase().includes(search.toLowerCase())),
    [playA, search],
  );
  const pbCounts = useMemo(() => {
    const c: Record<string, number> = { all: playB.length, replied: 0, no_reply: 0, net_new: 0, re_engage: 0 };
    for (const x of playB) if (x.engagement_state) c[x.engagement_state] = (c[x.engagement_state] || 0) + 1;
    return c;
  }, [playB]);

  const fb = useMemo(() => {
    const sRank: Record<string, number> = { replied: 0, no_reply: 1, net_new: 2, re_engage: 3 };
    let rows = playB.filter((x) => !search
      || x.company_name?.toLowerCase().includes(search.toLowerCase())
      || x.contact_name?.toLowerCase().includes(search.toLowerCase())
      || x.contact_email?.toLowerCase().includes(search.toLowerCase())
      || x.contact_title?.toLowerCase().includes(search.toLowerCase()));
    if (pbFilter !== 'all') rows = rows.filter((x) => x.engagement_state === pbFilter);
    const cmp: Record<PBSort, (a: PlayBRow, b: PlayBRow) => number> = {
      state: (a, b) => (sRank[a.engagement_state || 'z'] - sRank[b.engagement_state || 'z']) || (b.score - a.score),
      score: (a, b) => b.score - a.score,
      touches: (a, b) => (b.touches || 0) - (a.touches || 0),
      recent: (a, b) => new Date(b.last_contacted_at || 0).getTime() - new Date(a.last_contacted_at || 0).getTime(),
    };
    return [...rows].sort(cmp[pbSort]);
  }, [playB, search, pbFilter, pbSort]);

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

      {(tab === 'playA' || tab === 'playB') && (
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
              : exportCSV(fb as unknown as Record<string, unknown>[], 'play_b.csv'))}
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
                <th className={th}>#</th><th className={th}>Company</th><th className={th}>Fit</th>
                <th className={th}>Employees</th><th className={th}>Industry</th>
                <th className={th}>We serve</th><th className={th}>Offices</th>
                <th className={th}>Last event</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody>
              {fa.map((r) => (
                <tr key={r.rank} className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setCardTarget({ company: r.company_name, companyId: r.company_id })}>
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
              ))}
            </tbody>
          </table>
        </div>
      ) : tab === 'playB' ? (
        <div>
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
                        <td className={`${td} font-medium`}>{r.company_name}</td>
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
            ] as const).map((f) => {
              const n = f.id === 'all'
                ? (followups?.length || 0)
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
              const visible = (followups || []).filter((r) => {
                if (fuStateFilter === 'all') return true;
                if (fuStateFilter === 'never_emailed') return r.state === 'never_emailed' || r.state === 'unknown_no_inbox';
                return r.state === fuStateFilter;
              });
              if (visible.length === 0) {
                return <div className="py-16 text-center text-gray-400">No rows match this filter.</div>;
              }
              return (
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className={th}></th>
                    <th className={th}>State</th>
                    <th className={th}>Contact</th>
                    <th className={th}>Company</th>
                    <th className={th}>Personal note</th>
                    <th className={th}>Last sent</th>
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
                    const cols = fuScope === 'team' ? 8 : 7;
                    return (
                      <React.Fragment key={r.email}>
                        <tr className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => setFuExpanded(open ? null : r.email)}>
                          <td className={`${td} text-gray-400`}>{r.thread_id ? (open ? '▾' : '▸') : ''}</td>
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
                            <div className="flex items-center gap-3">
                              <button
                                onClick={(e) => { e.stopPropagation(); setCardTarget({ company: r.company || r.email, email: r.email }); }}
                                className="text-xs text-gray-500 hover:text-gray-700 hover:underline"
                              >
                                Open card
                              </button>
                              {canDraft && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setDraftTarget({ company: r.company || r.email, followup: r }); }}
                                  className="flex items-center gap-1.5 text-xs font-medium text-shortcut-navy-blue hover:underline"
                                >
                                  <PenLine size={14} /> {draftLabel}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {open && r.thread_id && (
                          <tr>
                            <td colSpan={cols} className="border-t border-gray-100 p-3 bg-gray-50">
                              <ThreadView threadId={r.thread_id} />
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

      {cardTarget && (
        <CRMCard
          target={cardTarget}
          onClose={() => setCardTarget(null)}
          onDraft={(t) => { setCardTarget(null); setDraftTarget(t); }}
        />
      )}

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
