import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Upload, Search, Calendar, CheckCircle, XCircle, Clock,
  Star, User, Phone, Building, Loader2, RefreshCw, AlertCircle, MessageSquare,
  ChevronDown, ChevronUp, UserPlus, CheckCircle2, Linkedin, Mail, Smartphone,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

// --- Types -------------------------------------------------------

interface SignupRow {
  id: string;
  external_id: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  appointment_at: string | null;
  service_type: string | null;
  day_label: string | null;
  time_slot: string | null;
  raw_notes: string | null;
  matched_lead_id: string | null;
  match_method: string | null;
  team_notes: string | null;
  team_status: string;
  uploaded_batch_id: string | null;
  uploaded_at: string;
  updated_at: string;
  // Joined lead data (populated client-side)
  _lead?: {
    id: string;
    name: string;
    email: string | null;
    company: string | null;
    title: string | null;
    assigned_to: string | null;
    tier: string;
    tier_1a: boolean;
    tier_1b: boolean;
    source: string | null;
    research_brief: string | null;
    linkedin_url: string | null;
    phone: string | null;
    mobile_phone: string | null;
    personal_email: string | null;
    signup_phone: string | null;
    linked_main_lead_id: string | null;
    notes: string | null;
  } | null;
}

const SENDER_MAP: Record<string, string> = {
  'will@getshortcut.co': 'Will Newton',
  'jaimie@getshortcut.co': 'Jaimie Pritchard',
  'marc@getshortcut.co': 'Marc Levitan',
  'caren@getshortcut.co': 'Caren Skutch',
};

const ASSIGNEE_INITIALS: Record<string, string> = {
  'Will Newton': 'WN',
  'Jaimie Pritchard': 'JP',
  'Marc Levitan': 'ML',
  'Caren Skutch': 'CS',
};
const ASSIGNEE_COLORS: Record<string, string> = {
  'Will Newton': 'bg-indigo-100 text-indigo-800',
  'Jaimie Pritchard': 'bg-rose-100 text-rose-800',
  'Marc Levitan': 'bg-emerald-100 text-emerald-800',
  'Caren Skutch': 'bg-cyan-100 text-cyan-800',
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  arrived: 'Arrived',
  completed: 'Completed',
  no_show: 'No-show',
  cancelled: 'Cancelled',
};
const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  arrived: 'bg-amber-50 text-amber-800 border-amber-300',
  completed: 'bg-green-50 text-green-700 border-green-200',
  no_show: 'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
};

// --- CSV parsing (shared logic with WorkhumanLeadService) -------

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else current += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { fields.push(current.trim()); current = ''; }
      else current += c;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const fields = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = fields[i] || ''; });
    return row;
  });
}

// --- Helpers ----------------------------------------------------

function formatAppointmentTime(signup: SignupRow): string {
  if (signup.time_slot) return signup.time_slot;
  if (!signup.appointment_at) return '—';
  const d = new Date(signup.appointment_at);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function dayBucket(signup: SignupRow): string {
  if (signup.day_label) {
    const match = signup.day_label.match(/\b(mon|tue|wed|thu|fri|sat|sun)\b/i);
    if (match) return match[1][0].toUpperCase() + match[1].slice(1).toLowerCase();
  }
  if (signup.appointment_at) {
    const d = new Date(signup.appointment_at);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { weekday: 'short' });
    }
  }
  return 'Unknown';
}

/**
 * Send a no-show recovery email or a reminder SMS for a booth signup.
 * Triggers the workhuman-booth-send Netlify function which handles SendGrid /
 * Twilio + appends a note to the signup so the team can see what's gone out.
 */
async function sendBoothMessage(signupId: string, action: 'no_show_email' | 'reminder_sms'): Promise<{ ok: boolean; from?: string; error?: string }> {
  try {
    const resp = await fetch('/.netlify/functions/workhuman-booth-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signupId, action }),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, error: json?.error || `HTTP ${resp.status}` };
    return { ok: true, from: json.from };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Compact send-button trigger row. Shows an Email and SMS button; each is
 * disabled when the signup lacks the relevant contact info. Includes a tiny
 * inline confirmation prompt to avoid accidental fires.
 */
function SendButtons({
  signup, onSent,
}: { signup: SignupRow; onSent: () => void }) {
  const [busy, setBusy] = useState<null | 'email' | 'sms'>(null);
  const [confirm, setConfirm] = useState<null | 'no_show_email' | 'reminder_sms'>(null);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  const hasEmail = !!signup.email && !signup.email.includes('@no-email.placeholder');
  const hasPhone = !!(signup.phone || signup._lead?.mobile_phone || signup._lead?.phone);

  const fire = async (action: 'no_show_email' | 'reminder_sms') => {
    setBusy(action === 'no_show_email' ? 'email' : 'sms');
    setConfirm(null);
    const result = await sendBoothMessage(signup.id, action);
    setBusy(null);
    if (result.ok) {
      setFeedback({ kind: 'ok', msg: action === 'no_show_email' ? `Sent from ${result.from}` : `Texted from ${result.from}` });
      onSent();
    } else {
      setFeedback({ kind: 'err', msg: result.error || 'Failed' });
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
      {confirm ? (
        <div className="flex items-center gap-1 bg-amber-50 border border-amber-300 rounded px-2 py-1 text-[11px]">
          <span className="text-amber-900 font-medium">
            {confirm === 'no_show_email' ? 'Send no-show email?' : 'Send reminder text?'}
          </span>
          <button
            onClick={() => fire(confirm)}
            className="bg-amber-600 hover:bg-amber-700 text-white px-2 py-0.5 rounded"
          >Yes</button>
          <button
            onClick={() => setConfirm(null)}
            className="text-gray-600 hover:text-gray-900 px-1"
          >No</button>
        </div>
      ) : feedback ? (
        <div className={`text-[11px] px-2 py-1 rounded ${feedback.kind === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {feedback.kind === 'ok' ? <CheckCircle size={11} className="inline mr-1" /> : <AlertCircle size={11} className="inline mr-1" />}
          {feedback.msg}
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setConfirm('no_show_email')}
            disabled={!hasEmail || busy !== null}
            title={hasEmail ? 'Send no-show recovery email' : 'No email on file'}
            className="inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-medium disabled:opacity-40 disabled:cursor-not-allowed bg-white hover:bg-blue-50 border-blue-200 text-blue-700"
          >
            {busy === 'email' ? <Loader2 size={11} className="animate-spin" /> : <Mail size={11} />}
            No-show email
          </button>
          <button
            type="button"
            onClick={() => setConfirm('reminder_sms')}
            disabled={!hasPhone || busy !== null}
            title={hasPhone ? 'Text a reminder about this booking' : 'No phone on file'}
            className="inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-medium disabled:opacity-40 disabled:cursor-not-allowed bg-white hover:bg-emerald-50 border-emerald-200 text-emerald-700"
          >
            {busy === 'sms' ? <Loader2 size={11} className="animate-spin" /> : <Smartphone size={11} />}
            Reminder text
          </button>
        </>
      )}
    </div>
  );
}

// --- Component --------------------------------------------------

const WorkhumanBooth: React.FC = () => {
  const { user } = useAuth();
  const myAssignee = useMemo(() =>
    SENDER_MAP[user?.email?.toLowerCase() || ''] || null, [user]);

  const [signups, setSignups] = useState<SignupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [search, setSearch] = useState('');
  // Default to "all days" post-event — the conference is over, so there's
  // no live "today is the day" reason to scope. Users can narrow per-day
  // via the dropdown if needed.
  const [dayFilter, setDayFilter] = useState<string>('all');
  // Assignee filter: 'all' | 'mine' | '<teammate name>' | 'unassigned' | 'new_walkin'
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  // Filter toggle — when on, only signups with a manually-tagged team note
  // (or a matched lead with notes) are shown. Independent of the sort mode.
  const [hasNotesFilter, setHasNotesFilter] = useState(false);
  // Sort options for the booth view — defaults to time-of-appointment
  // (the natural order at the booth), with a "has notes first" mode for
  // catching up on flagged leads.
  const [boothSort, setBoothSort] = useState<'time' | 'has_notes' | 'tier'>('time');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [bulkResult, setBulkResult] = useState<null | { action: 'no_show_email' | 'reminder_sms'; sent: number; failed: number; failures: Array<{ name?: string; error: string }> }>(null);
  // Holds an in-flight bulk request awaiting explicit confirmation. Surface
  // the count + sample of names + skip-reason so the user can sanity-check
  // before a 80+ message blast.
  const [bulkConfirm, setBulkConfirm] = useState<null | {
    action: 'no_show_email' | 'reminder_sms';
    sendable: SignupRow[];
    skipped: number;
  }>(null);
  const [uploadStatus, setUploadStatus] = useState<{
    state: 'idle' | 'uploading' | 'done' | 'error';
    message?: string;
    summary?: { total: number; inserted: number; matched_existing: number; new_leads_created: number; errors: number };
  }>({ state: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Load signups from Supabase. Two modes:
   *   - silent=false (default): toggles the loading flag for the initial fetch
   *     so the user sees a "Loading…" screen
   *   - silent=true: skips the loading flag so background refreshes don't
   *     blank-out and re-render the whole list under an actively-interacting
   *     user (which used to scroll the page and collapse expanded cards)
   */
  const loadSignups = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    // Slim column list — drops the heavy fields we never render in the
    // row/card view (raw_row JSONB, raw_notes, match_confidence, batch
    // ids). team_notes IS included because the "Has notes" filter scans
    // it; raw_notes is still lazy-loaded when a row expands.
    const SIGNUP_COLS = 'id,external_id,full_name,first_name,last_name,email,phone,company,appointment_at,service_type,day_label,time_slot,matched_lead_id,match_method,team_status,team_notes,uploaded_at,updated_at';
    const { data, error } = await supabase
      .from('workhuman_signups')
      .select(SIGNUP_COLS)
      .order('appointment_at', { ascending: true, nullsFirst: false })
      .order('uploaded_at', { ascending: false });
    if (error) {
      console.error('Failed to load signups:', error);
      if (!silent) setLoading(false);
      return;
    }

    // Hydrate joined lead data in one follow-up query. research_brief is
    // also lazy — fetched per-row when the panel expands. Without it the
    // hydrate query drops from ~170KB / 600ms to ~120KB / 250ms.
    const leadIds = Array.from(new Set((data || []).map(s => s.matched_lead_id).filter(Boolean)));
    let leadMap: Record<string, SignupRow['_lead']> = {};
    if (leadIds.length) {
      // Chunk the .in() lookup. With 600+ unique leadIds the URL crosses
      // ~24KB and silently fails with a HeadersOverflowError on the client
      // (which manifested as every signup showing as "no lead match"). 100
      // ids per batch keeps each URL under 4KB.
      const BATCH = 100;
      const all: NonNullable<SignupRow['_lead']>[] = [];
      for (let i = 0; i < leadIds.length; i += BATCH) {
        const chunk = leadIds.slice(i, i + BATCH);
        const { data: leads } = await supabase
          .from('workhuman_leads')
          .select('id, name, email, company, title, assigned_to, tier, tier_1a, tier_1b, source, linkedin_url, phone, mobile_phone, personal_email, signup_phone, linked_main_lead_id, notes')
          .in('id', chunk);
        if (leads) all.push(...(leads as unknown as NonNullable<SignupRow['_lead']>[]));
      }
      leadMap = Object.fromEntries(all.map(l => [l.id, l]));
    }
    const hydrated = (data || []).map(s => ({
      ...s,
      raw_notes: null as string | null,
      _lead: s.matched_lead_id ? leadMap[s.matched_lead_id] || null : null,
    }));
    setSignups(hydrated as SignupRow[]);
    setLastRefreshedAt(new Date());
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => { loadSignups(); }, [loadSignups]);

  // Auto-refresh when the user returns to this tab (so reassignments made
  // in the main CRM propagate without a manual click) and on a 60-second
  // poll while the tab is visible. Both refreshes run silently so they
  // don't blank-out the list under an actively-interacting user.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') loadSignups(true);
    };
    document.addEventListener('visibilitychange', onVis);
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') loadSignups(true);
    }, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      clearInterval(interval);
    };
  }, [loadSignups]);

  // --- CSV upload ---

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus({ state: 'uploading', message: `Parsing ${file.name}...` });
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length === 0) throw new Error('CSV is empty or has no data rows');

      setUploadStatus({ state: 'uploading', message: `Uploading ${rows.length} rows...` });
      const resp = await fetch('/.netlify/functions/workhuman-signups-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: resp.statusText }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }
      const result = await resp.json();
      setUploadStatus({
        state: 'done',
        summary: {
          total: result.total,
          inserted: result.inserted,
          matched_existing: result.matched_existing,
          new_leads_created: result.new_leads_created,
          errors: (result.errors || []).length,
        },
      });
      await loadSignups();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setUploadStatus({ state: 'error', message: msg });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- Status + notes mutations ---

  const updateStatus = async (id: string, status: string) => {
    setSignups(prev => prev.map(s => s.id === id ? { ...s, team_status: status } : s));
    await supabase.from('workhuman_signups').update({ team_status: status }).eq('id', id);
  };

  const updateAssignee = async (signupId: string, leadId: string | null, assignee: string | null) => {
    if (!leadId) return; // can't reassign if no matched lead
    // Optimistic UI: update _lead.assigned_to in local state
    setSignups(prev => prev.map(s =>
      s.id === signupId && s._lead
        ? { ...s, _lead: { ...s._lead, assigned_to: assignee } }
        : s
    ));
    const { error } = await supabase
      .from('workhuman_leads')
      .update({ assigned_to: assignee })
      .eq('id', leadId);
    if (error) {
      console.error('Failed to update assignee:', error);
      // Revert on error by reloading silently
      loadSignups(true);
    }
  };

  /**
   * Append a timestamped booth note. Writes the entry to the signup row
   * (workhuman_signups.team_notes) AND mirrors it onto the matched lead's
   * workhuman_leads.notes field so the same note shows up in the main CRM
   * lead view. Both writes happen in parallel; mirroring is best-effort
   * (a failed lead patch doesn't block the booth note save).
   */
  const appendNote = async (id: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const signup = signups.find(s => s.id === id);
    const existing = signup?.team_notes || '';
    const stamp = new Date().toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
    const who = myAssignee ? myAssignee.split(' ')[0] : 'Team';
    const newLine = `[${stamp} · ${who}] ${trimmed}`;
    const merged = existing ? `${newLine}\n${existing}` : newLine;
    // Optimistically reflect the note in BOTH local fields. The booth view
    // renders signup._lead?.notes alongside team_notes, so without this the
    // freshly-added note would only appear under "Team notes" until refresh.
    setSignups(prev => prev.map(s => {
      if (s.id !== id) return s;
      const leadExistingLocal = s._lead?.notes || '';
      const leadMergedLocal = leadExistingLocal ? `${newLine}\n${leadExistingLocal}` : newLine;
      return {
        ...s,
        team_notes: merged,
        _lead: s._lead ? { ...s._lead, notes: leadMergedLocal } : s._lead,
      };
    }));

    const writes: Promise<unknown>[] = [
      supabase.from('workhuman_signups').update({ team_notes: merged }).eq('id', id),
    ];

    // Mirror to the matched lead's CRM notes. Re-query the signup row
    // for the CURRENT matched_lead_id at write time — local state can
    // be stale if dedupe re-pointed this signup after the page loaded
    // (this caused Estelle Jackson's note + others to silently miss).
    // Errors surface to the console (not silently swallowed) so any
    // future mirror failure is visible.
    writes.push((async () => {
      const { data: freshSignup, error: fetchErr } = await supabase
        .from('workhuman_signups')
        .select('matched_lead_id')
        .eq('id', id)
        .maybeSingle();
      if (fetchErr) { console.error('[booth note mirror] read signup failed:', fetchErr); return; }
      const leadId = freshSignup?.matched_lead_id;
      if (!leadId) return; // truly orphan signup, nothing to mirror to
      const { data: leadRow, error: leadErr } = await supabase
        .from('workhuman_leads')
        .select('notes')
        .eq('id', leadId)
        .maybeSingle();
      if (leadErr) { console.error('[booth note mirror] read lead failed:', leadErr); return; }
      const leadExisting = leadRow?.notes || '';
      const leadMerged = leadExisting ? `${newLine}\n${leadExisting}` : newLine;
      const { error: updateErr } = await supabase
        .from('workhuman_leads')
        .update({ notes: leadMerged })
        .eq('id', leadId);
      if (updateErr) console.error('[booth note mirror] update lead failed:', updateErr);
    })());

    await Promise.all(writes);
  };

  // --- Filtering ---

  const filtered = useMemo(() => {
    let result = signups;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        (s.full_name || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.company || '').toLowerCase().includes(q) ||
        (s._lead?.name || '').toLowerCase().includes(q) ||
        (s._lead?.company || '').toLowerCase().includes(q)
      );
    }
    if (dayFilter !== 'all') {
      result = result.filter(s => dayBucket(s) === dayFilter);
    }
    if (assigneeFilter === 'mine' && myAssignee) {
      result = result.filter(s => s._lead?.assigned_to === myAssignee);
    } else if (assigneeFilter === 'unassigned') {
      result = result.filter(s => !s._lead?.assigned_to);
    } else if (assigneeFilter === 'new_walkin') {
      result = result.filter(s => s._lead?.source === 'whl_booth_signup');
    } else if (assigneeFilter !== 'all') {
      // Filter by a specific teammate's name
      result = result.filter(s => s._lead?.assigned_to === assigneeFilter);
    }
    if (statusFilter !== 'all') {
      result = result.filter(s => s.team_status === statusFilter);
    }
    if (hasNotesFilter) {
      // Match the CRM definition of "has notes": manual entry on EITHER
      // workhuman_signups.team_notes (booth-side) OR workhuman_leads.notes
      // (CRM-side). Booth-added notes mirror to both, but CRM-added notes
      // only land on the lead row, so we have to check both.
      // (auto send-receipts excluded), since that's the booth-relevant
      // signal — not the lead-side CRM notes blob.
      const MANUAL_NOTE_RE = /\[[^\]]+·\s*[A-Za-z]+\]/;
      const hasManual = (s: SignupRow) =>
        MANUAL_NOTE_RE.test(s.team_notes || '') || MANUAL_NOTE_RE.test(s._lead?.notes || '');
      result = result.filter(hasManual);
    }
    // Sort. Default keeps the chronological order (already sorted by
    // appointment_at via the supabase query); other modes float useful
    // signals — manually-noted leads, or tier 1A/1B — to the top.
    if (boothSort === 'has_notes') {
      // "Has notes" = signup.team_notes has at least one MANUAL entry —
      // tagged with an author (`[stamp · Name]`). Auto-send receipts
      // (📧 / 📱) are excluded so the sort surfaces leads where someone
      // actually wrote a real note from the booth.
      const MANUAL_NOTE_RE = /\[[^\]]+·\s*[A-Za-z]+\]/;
      const hasNotes = (s: SignupRow) =>
        MANUAL_NOTE_RE.test(s.team_notes || '') || MANUAL_NOTE_RE.test(s._lead?.notes || '');
      result = [...result].sort((a, b) => Number(hasNotes(b)) - Number(hasNotes(a)));
    } else if (boothSort === 'tier') {
      const rank = (s: SignupRow) => s._lead?.tier_1a ? 3 : s._lead?.tier_1b ? 2 : s._lead ? 1 : 0;
      result = [...result].sort((a, b) => rank(b) - rank(a));
    }
    return result;
  }, [signups, search, dayFilter, assigneeFilter, statusFilter, hasNotesFilter, boothSort, myAssignee]);

  // --- Bulk send -----------------------------------------------------

  /** Toggle one signup id in the selection set. */
  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  /** Select / deselect every currently visible (filtered) signup. */
  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      const visibleIds = new Set(filtered.map(s => s.id));
      const allVisibleSelected = filtered.length > 0 && filtered.every(s => prev.has(s.id));
      if (allVisibleSelected) {
        // unselect every visible row but keep any others that were selected
        const next = new Set(prev);
        visibleIds.forEach(id => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      visibleIds.forEach(id => next.add(id));
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Netlify function timeout caps a single bulk call at ~80 sends; chunk
  // anything larger client-side so the UI doesn't 502 mid-batch.
  const BULK_CHUNK_SIZE = 80;

  /**
   * Step 1 of bulk send: filter the selected signups to those we can
   * actually deliver to, then open the confirmation panel. The actual
   * fire happens in confirmBulkSend.
   */
  const sendBulk = (action: 'no_show_email' | 'reminder_sms') => {
    const selected = signups.filter(s => selectedIds.has(s.id));
    const sendable = selected.filter(s => {
      if (action === 'no_show_email') {
        return !!s.email && !s.email.includes('@no-email.placeholder');
      }
      return !!(s.phone || s._lead?.mobile_phone || s._lead?.phone);
    });
    if (sendable.length === 0) {
      setBulkResult({
        action, sent: 0, failed: 0,
        failures: [{ error: action === 'no_show_email' ? 'None of the selected signups have an email on file.' : 'None of the selected signups have a phone on file.' }],
      });
      return;
    }
    setBulkConfirm({ action, sendable, skipped: selected.length - sendable.length });
  };

  /**
   * Step 2: actually fire after explicit confirmation. Chunks the send
   * across multiple Netlify invocations of BULK_CHUNK_SIZE each so a
   * single call never bumps the function timeout.
   */
  const confirmBulkSend = async () => {
    if (!bulkConfirm) return;
    const { action, sendable } = bulkConfirm;
    setBulkConfirm(null);
    setBulkSending(true);
    setBulkResult(null);
    setBulkProgress({ done: 0, total: sendable.length });

    let totalSent = 0;
    let totalFailed = 0;
    const allFailures: Array<{ name?: string; error: string }> = [];

    try {
      for (let i = 0; i < sendable.length; i += BULK_CHUNK_SIZE) {
        const chunk = sendable.slice(i, i + BULK_CHUNK_SIZE);
        const resp = await fetch('/.netlify/functions/workhuman-booth-send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, signupIds: chunk.map(s => s.id) }),
        });
        const json = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          totalFailed += chunk.length;
          allFailures.push({ error: json?.error || `HTTP ${resp.status} on chunk ${Math.floor(i / BULK_CHUNK_SIZE) + 1}` });
        } else {
          totalSent += json.sent || 0;
          totalFailed += json.failed || 0;
          if (Array.isArray(json.failures)) allFailures.push(...json.failures);
        }
        setBulkProgress({ done: Math.min(i + chunk.length, sendable.length), total: sendable.length });
        // Small breath between chunks; not strictly required but keeps the
        // load polite to SendGrid / Twilio.
        if (i + BULK_CHUNK_SIZE < sendable.length) await new Promise(r => setTimeout(r, 1000));
      }
      setBulkResult({ action, sent: totalSent, failed: totalFailed, failures: allFailures });
      await loadSignups(true);
      clearSelection();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setBulkResult({ action, sent: totalSent, failed: sendable.length - totalSent, failures: [...allFailures, { error: msg }] });
    } finally {
      setBulkSending(false);
      setBulkProgress(null);
    }
  };

  // --- Stats ---

  const stats = useMemo(() => {
    const total = signups.length;
    const matched = signups.filter(s => s._lead && s._lead.source !== 'whl_booth_signup').length;
    const newLeads = signups.filter(s => s._lead?.source === 'whl_booth_signup').length;
    const tier1a = signups.filter(s => s._lead?.tier_1a).length;
    const tier1b = signups.filter(s => s._lead?.tier_1b).length;
    const mine = myAssignee ? signups.filter(s => s._lead?.assigned_to === myAssignee).length : 0;
    const perTeammate: Record<string, number> = {};
    Object.values(SENDER_MAP).forEach(name => {
      perTeammate[name] = signups.filter(s => s._lead?.assigned_to === name).length;
    });
    const unassigned = signups.filter(s => !s._lead?.assigned_to).length;
    return { total, matched, newLeads, tier1a, tier1b, mine, perTeammate, unassigned };
  }, [signups, myAssignee]);

  // --- Render -----------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-5">
          <Link to="/workhuman-leads" className="text-sm text-gray-500 hover:text-gray-800 inline-flex items-center gap-1 mb-2">
            <ArrowLeft size={14} /> Back to leads
          </Link>
          <div className="flex items-center gap-3 mb-1">
            <Calendar className="text-amber-600" size={26} />
            <h1 className="text-2xl font-bold text-gray-900">Booth — Day-of Dashboard</h1>
          </div>
          <p className="text-gray-500 text-sm">Conference sign-ups, cross-referenced to your lead list. Walk-ins get new lead profiles automatically.</p>
        </div>

        {/* Upload + refresh */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2 bg-[#09364f] hover:bg-[#0a4060] text-white rounded-lg text-sm font-medium cursor-pointer transition-colors">
            <Upload size={16} />
            Upload sign-ups CSV
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          <button
            onClick={() => loadSignups(true)}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
            title="Pull fresh data from the CRM. Auto-refreshes when you return to this tab."
          >
            <RefreshCw size={14} /> Refresh
          </button>
          {lastRefreshedAt && (
            <span className="text-[11px] text-gray-400" title={lastRefreshedAt.toLocaleString()}>
              Updated {lastRefreshedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
          {uploadStatus.state === 'uploading' && (
            <div className="text-sm text-gray-500 inline-flex items-center gap-1.5">
              <Loader2 size={14} className="animate-spin" /> {uploadStatus.message}
            </div>
          )}
          {uploadStatus.state === 'done' && uploadStatus.summary && (
            <div className="text-sm text-green-700 inline-flex items-center gap-1.5">
              <CheckCircle size={14} /> Imported {uploadStatus.summary.inserted}/{uploadStatus.summary.total} · Matched {uploadStatus.summary.matched_existing} · New leads {uploadStatus.summary.new_leads_created}{uploadStatus.summary.errors ? ` · ${uploadStatus.summary.errors} errors` : ''}
            </div>
          )}
          {uploadStatus.state === 'error' && (
            <div className="text-sm text-red-600 inline-flex items-center gap-1.5">
              <AlertCircle size={14} /> {uploadStatus.message}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
          <Stat label="Total sign-ups" value={stats.total} />
          <Stat label="My appointments" value={stats.mine} color="text-indigo-700" />
          <Stat label="Tier 1A" value={stats.tier1a} color="text-amber-700" />
          <Stat label="Tier 1B" value={stats.tier1b} color="text-orange-600" />
          <Stat label="Matched to leads" value={stats.matched} color="text-green-700" />
          <Stat label="New walk-ins" value={stats.newLeads} color="text-purple-700" />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search name, email, company..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#09364f]/20 focus:border-[#09364f]"
              />
            </div>
            <select
              value={dayFilter}
              onChange={e => setDayFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="all">All days</option>
              <option value="Mon">Mon — Apr 27</option>
              <option value="Tue">Tue — Apr 28</option>
              <option value="Wed">Wed — Apr 29</option>
              <option value="Thu">Thu — Apr 30</option>
              <option value="Unknown">Unknown</option>
            </select>
            <select
              value={assigneeFilter}
              onChange={e => setAssigneeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
              title="Filter by assigned teammate"
            >
              <option value="all">All teammates ({stats.total})</option>
              {myAssignee && <option value="mine">My appointments ({stats.mine})</option>}
              <optgroup label="By teammate">
                {Object.entries(stats.perTeammate).map(([name, count]) => (
                  <option key={name} value={name}>{name} ({count})</option>
                ))}
              </optgroup>
              <optgroup label="Other">
                <option value="unassigned">Unassigned ({stats.unassigned})</option>
                <option value="new_walkin">New walk-ins ({stats.newLeads})</option>
              </optgroup>
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
              title="Filter by check-in status"
            >
              <option value="all">All statuses</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select
              value={boothSort}
              onChange={e => setBoothSort(e.target.value as 'time' | 'has_notes' | 'tier')}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
              title="Sort the visible signups"
            >
              <option value="time">Sort: Appointment time</option>
              <option value="has_notes">📝 Has notes first</option>
              <option value="tier">Tier (1A → 1B → other)</option>
            </select>
            <button
              type="button"
              onClick={() => setHasNotesFilter(v => !v)}
              className={`px-3 py-2 border rounded-lg text-sm inline-flex items-center gap-1.5 transition-colors ${
                hasNotesFilter
                  ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
              title={hasNotesFilter ? 'Showing only signups with notes — click to clear' : 'Show only signups with notes'}
            >
              📝 {hasNotesFilter ? 'Notes only' : 'Has notes'}
            </button>
          </div>
        </div>

        {/* Bulk action bar — appears when 1+ signups are selected */}
        {selectedIds.size > 0 && (
          <div className="bg-[#09364f] text-white rounded-lg shadow-md p-3 mb-4 flex flex-wrap items-center gap-3 sticky top-2 z-10">
            <div className="text-sm font-medium">
              {selectedIds.size} selected
            </div>
            <button
              onClick={() => sendBulk('no_show_email')}
              disabled={bulkSending}
              className="bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded inline-flex items-center gap-1.5"
            >
              {bulkSending ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
              Send no-show emails
            </button>
            <button
              onClick={() => sendBulk('reminder_sms')}
              disabled={bulkSending}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded inline-flex items-center gap-1.5"
            >
              {bulkSending ? <Loader2 size={12} className="animate-spin" /> : <Smartphone size={12} />}
              Send reminder texts
            </button>
            <div className="text-[11px] text-gray-300">
              Tip: filter by status / day first, then "Select all"
            </div>
            <button
              onClick={clearSelection}
              className="ml-auto text-[11px] text-gray-300 hover:text-white underline"
            >Clear</button>
          </div>
        )}

        {/* Bulk progress bar — surfaces during a multi-chunk send so the
            user can see how far through the batch we are. */}
        {bulkSending && bulkProgress && (
          <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4 flex items-center gap-3">
            <Loader2 size={16} className="animate-spin text-[#09364f]" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">
                Sending… {bulkProgress.done} / {bulkProgress.total}
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="h-full bg-[#09364f] transition-all"
                  style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Explicit confirmation modal — required for any bulk send. Shows
            count, action, recipient sample, and skip reasons so an accidental
            click can't fire 100+ messages. */}
        {bulkConfirm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setBulkConfirm(null)}>
            <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
              <div className={`px-5 py-4 border-b ${bulkConfirm.action === 'no_show_email' ? 'bg-blue-50 border-blue-200' : 'bg-emerald-50 border-emerald-200'} rounded-t-lg`}>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  {bulkConfirm.action === 'no_show_email' ? <Mail size={18} className="text-blue-600" /> : <Smartphone size={18} className="text-emerald-600" />}
                  Confirm bulk send
                </h3>
                <p className="text-sm text-gray-700 mt-1">
                  You're about to send <strong>{bulkConfirm.action === 'no_show_email' ? 'no-show recovery emails' : 'reminder texts'}</strong> to <strong>{bulkConfirm.sendable.length} {bulkConfirm.sendable.length === 1 ? 'person' : 'people'}</strong>.
                </p>
                {bulkConfirm.skipped > 0 && (
                  <p className="text-xs text-gray-600 mt-1">
                    ({bulkConfirm.skipped} selected {bulkConfirm.skipped === 1 ? 'is' : 'are'} missing {bulkConfirm.action === 'no_show_email' ? 'an email' : 'a phone'} and will be skipped.)
                  </p>
                )}
              </div>
              <div className="px-5 py-4 max-h-64 overflow-y-auto">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Recipients</div>
                <ul className="text-xs text-gray-700 space-y-0.5">
                  {bulkConfirm.sendable.slice(0, 12).map(s => (
                    <li key={s.id} className="flex justify-between gap-2">
                      <span className="truncate">{s.full_name || '(no name)'}{s._lead?.company ? ` · ${s._lead.company}` : ''}</span>
                      <span className="text-gray-400 whitespace-nowrap">{bulkConfirm.action === 'no_show_email' ? s.email : (s.phone || s._lead?.mobile_phone || s._lead?.phone)}</span>
                    </li>
                  ))}
                  {bulkConfirm.sendable.length > 12 && (
                    <li className="text-gray-400 italic">… and {bulkConfirm.sendable.length - 12} more</li>
                  )}
                </ul>
                {bulkConfirm.sendable.length > BULK_CHUNK_SIZE && (
                  <div className="mt-3 text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded p-2">
                    Will send in {Math.ceil(bulkConfirm.sendable.length / BULK_CHUNK_SIZE)} chunks of up to {BULK_CHUNK_SIZE} (≈{Math.ceil(bulkConfirm.sendable.length * 1.25)}s total).
                  </div>
                )}
              </div>
              <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2 bg-gray-50 rounded-b-lg">
                <button
                  onClick={() => setBulkConfirm(null)}
                  className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded"
                >Cancel</button>
                <button
                  onClick={confirmBulkSend}
                  className={`px-4 py-1.5 text-sm font-semibold text-white rounded inline-flex items-center gap-1.5 ${bulkConfirm.action === 'no_show_email' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                >
                  {bulkConfirm.action === 'no_show_email' ? <Mail size={14} /> : <Smartphone size={14} />}
                  Send {bulkConfirm.sendable.length} {bulkConfirm.action === 'no_show_email' ? 'email' : 'text'}{bulkConfirm.sendable.length === 1 ? '' : 's'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk result toast */}
        {bulkResult && (
          <div className={`rounded-lg p-3 mb-4 text-sm flex items-start gap-2 ${
            bulkResult.failed === 0 ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-amber-50 border border-amber-200 text-amber-900'
          }`}>
            {bulkResult.failed === 0 ? <CheckCircle size={16} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />}
            <div className="flex-1">
              <div className="font-medium">
                {bulkResult.action === 'no_show_email' ? 'No-show emails' : 'Reminder texts'}: sent {bulkResult.sent}{bulkResult.failed ? `, failed ${bulkResult.failed}` : ''}.
              </div>
              {bulkResult.failures.length > 0 && (
                <ul className="text-xs mt-1.5 space-y-0.5 list-disc pl-4 max-h-24 overflow-y-auto">
                  {bulkResult.failures.slice(0, 8).map((f, i) => (
                    <li key={i}>{f.name ? `${f.name} — ` : ''}{f.error}</li>
                  ))}
                  {bulkResult.failures.length > 8 && <li>... and {bulkResult.failures.length - 8} more</li>}
                </ul>
              )}
            </div>
            <button onClick={() => setBulkResult(null)} className="text-current opacity-50 hover:opacity-100">
              <XCircle size={14} />
            </button>
          </div>
        )}

        {/* Results */}
        <div className="text-sm text-gray-500 mb-2">
          Showing {filtered.length} of {stats.total} appointments
        </div>

        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-400">Loading sign-ups...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            {stats.total === 0 ? (
              <>
                <Upload size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 mb-1">No sign-ups yet</p>
                <p className="text-gray-400 text-sm">Upload a CSV from your booker to get started.</p>
              </>
            ) : (
              <p className="text-gray-500 text-sm">No appointments match your filters.</p>
            )}
          </div>
        ) : (
          <>
            {/* Desktop / tablet table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hidden md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500">
                    <th className="px-3 py-2 w-10">
                      <input
                        type="checkbox"
                        checked={filtered.length > 0 && filtered.every(s => selectedIds.has(s.id))}
                        ref={el => { if (el) el.indeterminate = filtered.some(s => selectedIds.has(s.id)) && !filtered.every(s => selectedIds.has(s.id)); }}
                        onChange={toggleSelectAll}
                        className="cursor-pointer"
                        title="Select all visible"
                      />
                    </th>
                    <th className="text-left px-3 py-2 font-medium">When</th>
                    <th className="text-left px-3 py-2 font-medium">Who</th>
                    <th className="text-left px-3 py-2 font-medium">Company</th>
                    <th className="text-left px-3 py-2 font-medium">Match</th>
                    <th className="text-left px-3 py-2 font-medium">Assigned</th>
                    <th className="text-left px-3 py-2 font-medium">Status</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <SignupRowView
                      key={s.id}
                      signup={s}
                      isExpanded={expandedId === s.id}
                      isSelected={selectedIds.has(s.id)}
                      onSelectToggle={() => toggleSelected(s.id)}
                      onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
                      onStatusChange={(status) => updateStatus(s.id, status)}
                      onAppendNote={(text) => appendNote(s.id, text)}
                      onAssigneeChange={(assignee) => updateAssignee(s.id, s._lead?.id ?? null, assignee)}
                      onSent={() => loadSignups(true)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list — shows the whole lead per card */}
            <div className="md:hidden space-y-3">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs text-[#09364f] hover:underline px-2 py-1 inline-flex items-center gap-1"
              >
                <input
                  type="checkbox"
                  readOnly
                  checked={filtered.length > 0 && filtered.every(s => selectedIds.has(s.id))}
                  className="pointer-events-none"
                />
                Select all visible ({filtered.length})
              </button>
              {filtered.map(s => (
                <SignupCardMobile
                  key={s.id}
                  signup={s}
                  isExpanded={expandedId === s.id}
                  isSelected={selectedIds.has(s.id)}
                  onSelectToggle={() => toggleSelected(s.id)}
                  onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
                  onStatusChange={(status) => updateStatus(s.id, status)}
                  onAppendNote={(text) => appendNote(s.id, text)}
                  onAssigneeChange={(assignee) => updateAssignee(s.id, s._lead?.id ?? null, assignee)}
                  onSent={() => loadSignups(true)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <div className="text-[11px] font-medium text-gray-500 mb-0.5">{label}</div>
      <div className={`text-xl font-bold ${color || 'text-gray-900'}`}>{value}</div>
    </div>
  );
}

function SignupRowView({
  signup, isExpanded, isSelected, onSelectToggle, onToggle, onStatusChange, onAppendNote, onAssigneeChange, onSent,
}: {
  signup: SignupRow;
  isExpanded: boolean;
  isSelected: boolean;
  onSelectToggle: () => void;
  onToggle: () => void;
  onStatusChange: (status: string) => void;
  onAppendNote: (text: string) => void;
  onAssigneeChange: (assignee: string | null) => void;
  onSent: () => void;
}) {
  const lead = signup._lead;
  const isNewWalkIn = lead?.source === 'whl_booth_signup';
  const displayName = lead?.name || signup.full_name || '(unknown)';
  const displayCompany = lead?.company || signup.company || '—';
  const tierBadge = lead?.tier_1a
    ? <span title="Tier 1A" className="text-amber-600 inline-flex items-center"><Star size={12} fill="currentColor" /></span>
    : lead?.tier_1b
      ? <span title="Tier 1B" className="text-orange-500 inline-flex items-center"><Star size={12} /></span>
      : null;
  const assignee = lead?.assigned_to;

  return (
    <>
      <tr className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${isExpanded ? 'bg-blue-50/40' : ''} ${isSelected ? 'bg-blue-50/70' : ''}`} onClick={onToggle}>
        <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelectToggle}
            className="cursor-pointer"
          />
        </td>
        <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
          <div className="font-medium text-gray-900">{formatAppointmentTime(signup)}</div>
          <div className="text-[11px] text-gray-400">{signup.day_label || ''}</div>
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-gray-900">{displayName}</span>
            {tierBadge}
            {isNewWalkIn && (
              <span className="bg-purple-100 text-purple-800 text-[10px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wide inline-flex items-center gap-0.5">
                <UserPlus size={10} /> new
              </span>
            )}
            {lead && (
              <Link
                to={`/workhuman-leads?lead=${lead.id}`}
                onClick={e => e.stopPropagation()}
                className="text-[11px] text-[#09364f] hover:underline inline-flex items-center gap-0.5 ml-1"
                title="Open this lead in the main CRM"
              >
                <ExternalLink size={11} /> CRM
              </Link>
            )}
          </div>
          {lead?.title && (
            <div className="text-[11px] text-gray-500 italic truncate max-w-[260px]" title={lead.title}>
              {lead.title}
            </div>
          )}
          <div className="text-[11px] text-gray-400">
            {signup.email ? (
              <a
                href={`mailto:${signup.email}`}
                onClick={e => e.stopPropagation()}
                className="text-gray-500 hover:text-[#09364f] hover:underline"
                title="Compose email"
              >
                {signup.email}
              </a>
            ) : '—'}
            {signup.phone && (
              <>
                {' · '}
                <a
                  href={`sms:${signup.phone}`}
                  onClick={e => e.stopPropagation()}
                  className="text-gray-500 hover:text-emerald-700 hover:underline"
                  title="Text this number"
                >
                  {signup.phone}
                </a>
              </>
            )}
            {lead?.linkedin_url && (
              <>
                {' · '}
                <a
                  href={lead.linkedin_url.startsWith('http') ? lead.linkedin_url : `https://${lead.linkedin_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0a66c2] hover:underline inline-flex items-center gap-0.5"
                  onClick={e => e.stopPropagation()}
                  title="Open LinkedIn profile"
                >
                  <Linkedin size={10} /> LinkedIn
                </a>
              </>
            )}
          </div>
        </td>
        <td className="px-3 py-2 text-gray-700">{displayCompany}</td>
        <td className="px-3 py-2 text-gray-600 text-[11px] whitespace-nowrap">
          {signup.match_method === 'email_exact' && <span title="Matched on exact email">✓ email</span>}
          {signup.match_method === 'email_domain_name' && <span title="Matched on email domain + last name">~ domain</span>}
          {signup.match_method === 'name_fuzzy_within_company' && <span title="Matched on name within company">~ name</span>}
          {signup.match_method === 'full_name_exact' && <span title="Matched on full name">~ name</span>}
          {signup.match_method === 'new_lead_created' && <span className="text-purple-700">+ new lead</span>}
          {!signup.match_method && <span className="text-gray-400">—</span>}
        </td>
        <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
          {lead ? (
            <select
              value={assignee || ''}
              onChange={e => onAssigneeChange(e.target.value || null)}
              className={`text-[11px] font-medium rounded-full px-2 py-1 border cursor-pointer min-w-[44px] ${
                assignee && ASSIGNEE_COLORS[assignee]
                  ? `${ASSIGNEE_COLORS[assignee]} border-transparent`
                  : 'bg-gray-50 text-gray-500 border-gray-200'
              }`}
              title={assignee ? `Assigned to ${assignee}` : 'Reassign to a teammate'}
            >
              <option value="">— (unassigned)</option>
              {Object.values(SENDER_MAP).map(name => (
                <option key={name} value={name}>{ASSIGNEE_INITIALS[name]} · {name}</option>
              ))}
            </select>
          ) : <span className="text-gray-400 text-xs">—</span>}
        </td>
        <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
          <select
            value={signup.team_status}
            onChange={e => onStatusChange(e.target.value)}
            className={`text-xs font-medium rounded-full px-2.5 py-1 border cursor-pointer ${STATUS_COLORS[signup.team_status] || 'bg-gray-50 border-gray-200 text-gray-700'}`}
          >
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </td>
        <td className="px-2 py-2 text-gray-400">
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={8} className="bg-gray-50/70 px-6 py-4">
            <SignupDetail signup={signup} onAppendNote={onAppendNote} onSent={onSent} />
          </td>
        </tr>
      )}
    </>
  );
}

/**
 * Mobile card view for the booth dashboard. Renders the full lead in a
 * stacked layout so nothing is cut off on a phone screen. Tapping the
 * card chevron expands the same SignupDetail panel used by the desktop
 * table row.
 */
function SignupCardMobile({
  signup, isExpanded, isSelected, onSelectToggle, onToggle, onStatusChange, onAppendNote, onAssigneeChange, onSent,
}: {
  signup: SignupRow;
  isExpanded: boolean;
  isSelected: boolean;
  onSelectToggle: () => void;
  onToggle: () => void;
  onStatusChange: (status: string) => void;
  onAppendNote: (text: string) => void;
  onAssigneeChange: (assignee: string | null) => void;
  onSent: () => void;
}) {
  const lead = signup._lead;
  const isNewWalkIn = lead?.source === 'whl_booth_signup';
  const displayName = lead?.name || signup.full_name || '(unknown)';
  const displayCompany = lead?.company || signup.company || '—';
  const displayTitle = lead?.title;
  const displayEmail = signup.email && !signup.email.includes('@no-email.placeholder') ? signup.email : null;
  const assignee = lead?.assigned_to;
  const tierBadge = lead?.tier_1a
    ? <span title="Tier 1A" className="text-amber-600 inline-flex"><Star size={13} fill="currentColor" /></span>
    : lead?.tier_1b
      ? <span title="Tier 1B" className="text-orange-500 inline-flex"><Star size={13} /></span>
      : null;

  return (
    <div className={`bg-white rounded-lg border overflow-hidden shadow-sm ${isSelected ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-200'}`}>
      {/* Top: time + status pill */}
      <div className="px-4 py-2.5 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelectToggle}
            className="cursor-pointer"
            onClick={e => e.stopPropagation()}
          />
          <Clock size={14} className="text-amber-600" />
          <span className="font-semibold text-gray-900">{formatAppointmentTime(signup)}</span>
          <span className="text-[11px] text-gray-400">{signup.day_label || ''}</span>
        </div>
        <select
          value={signup.team_status}
          onChange={e => onStatusChange(e.target.value)}
          className={`text-[11px] font-medium rounded-full px-2 py-1 border cursor-pointer ${STATUS_COLORS[signup.team_status] || 'bg-gray-50 border-gray-200 text-gray-700'}`}
        >
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Identity */}
      <div className="px-4 py-3">
        <div className="flex items-start gap-2 mb-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-gray-900 text-base leading-tight">{displayName}</span>
              {tierBadge}
              {isNewWalkIn && (
                <span className="bg-purple-100 text-purple-800 text-[10px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wide inline-flex items-center gap-0.5">
                  <UserPlus size={10} /> new
                </span>
              )}
              {lead && (
                <Link
                  to={`/workhuman-leads?lead=${lead.id}`}
                  onClick={e => e.stopPropagation()}
                  className="text-[11px] text-[#09364f] hover:underline inline-flex items-center gap-0.5"
                  title="Open this lead in the main CRM"
                >
                  <ExternalLink size={11} /> CRM
                </Link>
              )}
            </div>
            {displayTitle && (
              <div className="text-[12px] text-gray-600 italic mt-0.5 break-words">{displayTitle}</div>
            )}
            <div className="text-[12px] text-gray-700 mt-0.5 break-words">{displayCompany}</div>
          </div>
        </div>

        {/* Contact: email · phone · LinkedIn — wrap freely on narrow screens */}
        {(displayEmail || signup.phone || lead?.linkedin_url) && (
          <div className="text-[11px] text-gray-500 mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            {displayEmail && (
              <a
                href={`mailto:${displayEmail}`}
                onClick={e => e.stopPropagation()}
                className="break-all text-gray-500 hover:text-[#09364f] hover:underline"
                title="Compose email"
              >
                {displayEmail}
              </a>
            )}
            {signup.phone && (
              <>
                {displayEmail && <span className="text-gray-300">·</span>}
                <a
                  href={`sms:${signup.phone}`}
                  onClick={e => e.stopPropagation()}
                  className="text-gray-500 hover:text-emerald-700 hover:underline"
                  title="Text this number"
                >
                  {signup.phone}
                </a>
              </>
            )}
            {lead?.linkedin_url && (
              <>
                <span className="text-gray-300">·</span>
                <a
                  href={lead.linkedin_url.startsWith('http') ? lead.linkedin_url : `https://${lead.linkedin_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0a66c2] hover:underline inline-flex items-center gap-0.5"
                  onClick={e => e.stopPropagation()}
                >
                  <Linkedin size={11} /> LinkedIn
                </a>
              </>
            )}
          </div>
        )}

        {/* Assigned + match info row */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="text-[11px] text-gray-500">
            {signup.match_method === 'email_exact' && '✓ matched on email'}
            {signup.match_method === 'email_domain_name' && '~ matched on domain + name'}
            {signup.match_method === 'name_fuzzy_within_company' && '~ matched on name'}
            {signup.match_method === 'full_name_exact' && '~ matched on full name'}
            {signup.match_method === 'new_lead_created' && <span className="text-purple-700 font-medium">+ new lead created</span>}
            {signup.match_method === 'manual' && 'manually entered'}
            {!signup.match_method && '—'}
          </div>
          {lead ? (
            <select
              value={assignee || ''}
              onChange={e => onAssigneeChange(e.target.value || null)}
              className={`text-[11px] font-medium rounded-full px-2 py-1 border cursor-pointer ${
                assignee && ASSIGNEE_COLORS[assignee]
                  ? `${ASSIGNEE_COLORS[assignee]} border-transparent`
                  : 'bg-gray-50 text-gray-500 border-gray-200'
              }`}
            >
              <option value="">— unassigned</option>
              {Object.values(SENDER_MAP).map(name => (
                <option key={name} value={name}>{ASSIGNEE_INITIALS[name]} · {name}</option>
              ))}
            </select>
          ) : <span className="text-[11px] text-gray-400">no lead</span>}
        </div>
      </div>

      {/* Footer: expand toggle */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full border-t border-gray-100 px-4 py-2 text-[12px] text-gray-500 hover:bg-gray-50 inline-flex items-center justify-center gap-1.5"
      >
        {isExpanded ? <><ChevronUp size={14} /> Hide details</> : <><ChevronDown size={14} /> Briefing + notes</>}
      </button>
      {isExpanded && (
        <div className="border-t border-gray-100 px-3 py-4 bg-gray-50/40">
          <SignupDetail signup={signup} onAppendNote={onAppendNote} onSent={onSent} />
        </div>
      )}
    </div>
  );
}

function SignupDetail({ signup, onAppendNote, onSent }: { signup: SignupRow; onAppendNote: (text: string) => void; onSent: () => void }) {
  const [noteDraft, setNoteDraft] = useState('');
  const lead = signup._lead;
  const [submitting, setSubmitting] = useState(false);
  const [briefingOpen, setBriefingOpen] = useState(true);

  // Lazy-load the heavy fields that aren't fetched on initial list load:
  //   raw_notes / team_notes (per-signup), research_brief (per-lead)
  const [lazyTeamNotes, setLazyTeamNotes] = useState<string | null>(signup.team_notes);
  const [lazyRawNotes, setLazyRawNotes] = useState<string | null>(signup.raw_notes);
  const [lazyBrief, setLazyBrief] = useState<string | null>(lead?.research_brief ?? null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Skip if we already have it (e.g. previously expanded) or fields are
      // truly null in the row (we couldn't tell from the slim load — fetch
      // to confirm)
      const sigRes = await supabase
        .from('workhuman_signups')
        .select('raw_notes,team_notes')
        .eq('id', signup.id)
        .maybeSingle();
      if (cancelled || !sigRes.data) return;
      setLazyRawNotes(sigRes.data.raw_notes ?? null);
      setLazyTeamNotes(sigRes.data.team_notes ?? null);

      if (lead?.id) {
        const leadRes = await supabase
          .from('workhuman_leads')
          .select('research_brief')
          .eq('id', lead.id)
          .maybeSingle();
        if (!cancelled && leadRes.data) {
          setLazyBrief(leadRes.data.research_brief ?? null);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [signup.id, lead?.id]);

  const submitNote = async () => {
    if (!noteDraft.trim()) return;
    setSubmitting(true);
    await onAppendNote(noteDraft);
    // Optimistically reflect the new note locally so the panel updates
    // immediately without a full list refresh
    const stamp = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    setLazyTeamNotes(prev => `[${stamp}] ${noteDraft}\n${prev || ''}`.trim());
    setNoteDraft('');
    setSubmitting(false);
  };

  return (
    <div className="space-y-4">
      {/* Quick send actions — no-show recovery email + reminder text */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Send:</span>
        <SendButtons signup={signup} onSent={onSent} />
      </div>

      {/* Sales briefing — top-priority info to scan before chatting */}
      {lazyBrief && (
        <div className="bg-amber-50/40 border border-amber-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setBriefingOpen(!briefingOpen)}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-amber-50 transition-colors"
            aria-expanded={briefingOpen}
          >
            <h4 className="text-xs font-semibold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
              <Star size={12} fill="currentColor" /> Sales briefing — {lead?.company || 'company'}
            </h4>
            <div className="flex items-center gap-1.5 text-amber-800/70">
              <span className="text-[11px] font-medium">{briefingOpen ? 'Hide' : 'Show'}</span>
              {briefingOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </button>
          {briefingOpen && (
            <div className="px-4 pb-4 text-sm text-gray-800 space-y-1.5 leading-relaxed">
              {lazyBrief.split('\n').filter(l => l.trim()).map((line, i) => {
                const text = line.replace(/^\s*[-*]\s+/, '').trim();
                if (!text) return null;
                const html = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
                return (
                  <div key={i} className="flex gap-2">
                    <span className="text-amber-600 select-none mt-0.5">•</span>
                    <span dangerouslySetInnerHTML={{ __html: html }} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Signup details */}
      <div className="space-y-1.5 text-sm">
        <h4 className="font-medium text-gray-700 mb-2 text-xs uppercase tracking-wide">Booking</h4>
        <div>
          <span className="text-gray-400">Email:</span>{' '}
          {signup.email ? (
            <a href={`mailto:${signup.email}`} className="text-[#09364f] hover:underline break-all">{signup.email}</a>
          ) : <span className="text-gray-700">—</span>}
        </div>
        <div>
          <span className="text-gray-400">Phone:</span>{' '}
          {signup.phone ? (
            <a href={`sms:${signup.phone}`} className="text-emerald-700 hover:underline">{signup.phone}</a>
          ) : <span className="text-gray-700">—</span>}
        </div>
        <div><span className="text-gray-400">Service:</span> <span className="text-gray-700">{signup.service_type || '—'}</span></div>
        <div><span className="text-gray-400">Slot:</span> <span className="text-gray-700">{signup.time_slot || formatAppointmentTime(signup)}</span></div>
        {lazyRawNotes && <div className="pt-1"><span className="text-gray-400">Booker notes:</span> <div className="text-gray-700 text-xs whitespace-pre-wrap">{lazyRawNotes}</div></div>}
      </div>

      {/* Lead profile */}
      <div className="space-y-1.5 text-sm">
        <h4 className="font-medium text-gray-700 mb-2 text-xs uppercase tracking-wide">Lead profile</h4>
        {lead ? (
          <>
            <div><span className="text-gray-400">Title:</span> <span className="text-gray-700">{lead.title || '—'}</span></div>
            <div><span className="text-gray-400">Tier:</span> <span className="text-gray-700">
              {lead.tier_1a ? 'Tier 1A (VIP 200)' : lead.tier_1b ? 'Tier 1B' : lead.tier.replace('tier_', 'Tier ')}
            </span></div>
            <div><span className="text-gray-400">Assigned:</span> <span className="text-gray-700">{lead.assigned_to || '(unassigned)'}</span></div>
            {/* Full contact ladder — work + personal email + work + signup phone, all clickable */}
            {lead.email && !lead.email.includes('@no-email.placeholder') && (
              <div>
                <span className="text-gray-400">Work email:</span>{' '}
                <a href={`mailto:${lead.email}`} className="text-[#09364f] hover:underline break-all">{lead.email}</a>
              </div>
            )}
            {lead.personal_email && (
              <div>
                <span className="text-gray-400">Personal email:</span>{' '}
                <a href={`mailto:${lead.personal_email}`} className="text-[#09364f] hover:underline break-all">{lead.personal_email}</a>
              </div>
            )}
            {(lead.mobile_phone || lead.phone) && (
              <div>
                <span className="text-gray-400">Phone:</span>{' '}
                <a href={`sms:${lead.mobile_phone || lead.phone}`} className="text-emerald-700 hover:underline">{lead.mobile_phone || lead.phone}</a>
              </div>
            )}
            {lead.signup_phone && lead.signup_phone !== (lead.mobile_phone || lead.phone) && (
              <div>
                <span className="text-gray-400">Sign-up phone:</span>{' '}
                <a href={`sms:${lead.signup_phone}`} className="text-emerald-700 hover:underline">{lead.signup_phone}</a>
              </div>
            )}
            <div>
              <span className="text-gray-400">LinkedIn:</span>{' '}
              {lead.linkedin_url ? (
                <a
                  href={lead.linkedin_url.startsWith('http') ? lead.linkedin_url : `https://${lead.linkedin_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0a66c2] hover:underline inline-flex items-center gap-1"
                >
                  <Linkedin size={11} /> {lead.linkedin_url.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, '').replace(/\/$/, '')}
                </a>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </div>
            <div><span className="text-gray-400">Source:</span> <span className="text-gray-700">{lead.source || 'apollo_enrichment'}</span></div>
            <div className="pt-2">
              <Link
                to={`/workhuman-leads?lead=${lead.id}`}
                className="text-xs text-[#09364f] hover:underline inline-flex items-center gap-1"
              >
                Open in CRM →
              </Link>
            </div>
          </>
        ) : (
          <div className="text-gray-400 text-sm">No lead match yet.</div>
        )}
      </div>

      {/* Team notes */}
      <div>
        <h4 className="font-medium text-gray-700 mb-2 text-xs uppercase tracking-wide">Team notes</h4>
        <textarea
          value={noteDraft}
          onChange={e => setNoteDraft(e.target.value)}
          placeholder="Jot a note from the booth..."
          rows={2}
          className="w-full px-2.5 py-2 border border-gray-200 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#09364f]/20 focus:border-[#09364f] mb-2"
        />
        <button
          onClick={submitNote}
          disabled={!noteDraft.trim() || submitting}
          className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 text-white text-xs font-medium px-3 py-1.5 rounded transition-colors inline-flex items-center gap-1.5"
        >
          {submitting ? <Loader2 size={12} className="animate-spin" /> : <MessageSquare size={12} />}
          Add note
        </button>
        {lazyTeamNotes && (
          <div className="mt-3 text-xs text-gray-600 whitespace-pre-wrap border-t border-gray-200 pt-2">
            {lazyTeamNotes}
          </div>
        )}
        {signup._lead?.notes && signup._lead.notes !== lazyTeamNotes && (
          <div className="mt-3 border-t border-gray-200 pt-2">
            <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">From CRM lead profile</div>
            <div className="text-xs text-gray-600 whitespace-pre-wrap">{signup._lead.notes}</div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

export default WorkhumanBooth;
