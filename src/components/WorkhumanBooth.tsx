import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Upload, Search, Calendar, CheckCircle, XCircle, Clock,
  Star, User, Phone, Building, Loader2, RefreshCw, AlertCircle, MessageSquare,
  ChevronDown, ChevronUp, UserPlus, CheckCircle2, Linkedin,
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
    company: string | null;
    title: string | null;
    assigned_to: string | null;
    tier: string;
    tier_1a: boolean;
    tier_1b: boolean;
    source: string | null;
    research_brief: string | null;
    linkedin_url: string | null;
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

// --- Component --------------------------------------------------

const WorkhumanBooth: React.FC = () => {
  const { user } = useAuth();
  const myAssignee = useMemo(() =>
    SENDER_MAP[user?.email?.toLowerCase() || ''] || null, [user]);

  const [signups, setSignups] = useState<SignupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [search, setSearch] = useState('');
  const [dayFilter, setDayFilter] = useState<string>('all');
  // Assignee filter: 'all' | 'mine' | '<teammate name>' | 'unassigned' | 'new_walkin'
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{
    state: 'idle' | 'uploading' | 'done' | 'error';
    message?: string;
    summary?: { total: number; inserted: number; matched_existing: number; new_leads_created: number; errors: number };
  }>({ state: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSignups = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('workhuman_signups')
      .select('*')
      .order('appointment_at', { ascending: true, nullsFirst: false })
      .order('uploaded_at', { ascending: false });
    if (error) {
      console.error('Failed to load signups:', error);
      setLoading(false);
      return;
    }

    // Hydrate joined lead data in one follow-up query
    const leadIds = Array.from(new Set((data || []).map(s => s.matched_lead_id).filter(Boolean)));
    let leadMap: Record<string, SignupRow['_lead']> = {};
    if (leadIds.length) {
      const { data: leads } = await supabase
        .from('workhuman_leads')
        .select('id, name, company, title, assigned_to, tier, tier_1a, tier_1b, source, research_brief, linkedin_url')
        .in('id', leadIds);
      leadMap = Object.fromEntries((leads || []).map(l => [l.id, l]));
    }
    const hydrated = (data || []).map(s => ({
      ...s,
      _lead: s.matched_lead_id ? leadMap[s.matched_lead_id] || null : null,
    }));
    setSignups(hydrated);
    setLastRefreshedAt(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { loadSignups(); }, [loadSignups]);

  // Auto-refresh when the user returns to this tab (so reassignments made
  // in the main CRM propagate without a manual click) and on a 60-second
  // poll while the tab is visible.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') loadSignups();
    };
    document.addEventListener('visibilitychange', onVis);
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') loadSignups();
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
      // Revert on error by reloading
      loadSignups();
    }
  };

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
    setSignups(prev => prev.map(s => s.id === id ? { ...s, team_notes: merged } : s));
    await supabase.from('workhuman_signups').update({ team_notes: merged }).eq('id', id);
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
    return result;
  }, [signups, search, dayFilter, assigneeFilter, myAssignee]);

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
            onClick={loadSignups}
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
          </div>
        </div>

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
                      onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
                      onStatusChange={(status) => updateStatus(s.id, status)}
                      onAppendNote={(text) => appendNote(s.id, text)}
                      onAssigneeChange={(assignee) => updateAssignee(s.id, s._lead?.id ?? null, assignee)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list — shows the whole lead per card */}
            <div className="md:hidden space-y-3">
              {filtered.map(s => (
                <SignupCardMobile
                  key={s.id}
                  signup={s}
                  isExpanded={expandedId === s.id}
                  onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
                  onStatusChange={(status) => updateStatus(s.id, status)}
                  onAppendNote={(text) => appendNote(s.id, text)}
                  onAssigneeChange={(assignee) => updateAssignee(s.id, s._lead?.id ?? null, assignee)}
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
  signup, isExpanded, onToggle, onStatusChange, onAppendNote, onAssigneeChange,
}: {
  signup: SignupRow;
  isExpanded: boolean;
  onToggle: () => void;
  onStatusChange: (status: string) => void;
  onAppendNote: (text: string) => void;
  onAssigneeChange: (assignee: string | null) => void;
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
      <tr className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${isExpanded ? 'bg-blue-50/40' : ''}`} onClick={onToggle}>
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
          </div>
          {lead?.title && (
            <div className="text-[11px] text-gray-500 italic truncate max-w-[260px]" title={lead.title}>
              {lead.title}
            </div>
          )}
          <div className="text-[11px] text-gray-400">
            {signup.email || lead?.name ? (signup.email || '—') : '—'}
            {signup.phone ? ` · ${signup.phone}` : ''}
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
          <td colSpan={7} className="bg-gray-50/70 px-6 py-4">
            <SignupDetail signup={signup} onAppendNote={onAppendNote} />
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
  signup, isExpanded, onToggle, onStatusChange, onAppendNote, onAssigneeChange,
}: {
  signup: SignupRow;
  isExpanded: boolean;
  onToggle: () => void;
  onStatusChange: (status: string) => void;
  onAppendNote: (text: string) => void;
  onAssigneeChange: (assignee: string | null) => void;
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
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      {/* Top: time + status pill */}
      <div className="px-4 py-2.5 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
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
            {displayEmail && <span className="break-all">{displayEmail}</span>}
            {signup.phone && (
              <>
                {displayEmail && <span className="text-gray-300">·</span>}
                <span>{signup.phone}</span>
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
          <SignupDetail signup={signup} onAppendNote={onAppendNote} />
        </div>
      )}
    </div>
  );
}

function SignupDetail({ signup, onAppendNote }: { signup: SignupRow; onAppendNote: (text: string) => void }) {
  const [noteDraft, setNoteDraft] = useState('');
  const lead = signup._lead;
  const [submitting, setSubmitting] = useState(false);
  const [briefingOpen, setBriefingOpen] = useState(true);

  const submitNote = async () => {
    if (!noteDraft.trim()) return;
    setSubmitting(true);
    await onAppendNote(noteDraft);
    setNoteDraft('');
    setSubmitting(false);
  };

  return (
    <div className="space-y-4">
      {/* Sales briefing — top-priority info to scan before chatting */}
      {lead?.research_brief && (
        <div className="bg-amber-50/40 border border-amber-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setBriefingOpen(!briefingOpen)}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-amber-50 transition-colors"
            aria-expanded={briefingOpen}
          >
            <h4 className="text-xs font-semibold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
              <Star size={12} fill="currentColor" /> Sales briefing — {lead.company || 'company'}
            </h4>
            <div className="flex items-center gap-1.5 text-amber-800/70">
              <span className="text-[11px] font-medium">{briefingOpen ? 'Hide' : 'Show'}</span>
              {briefingOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </button>
          {briefingOpen && (
            <div className="px-4 pb-4 text-sm text-gray-800 space-y-1.5 leading-relaxed">
              {lead.research_brief.split('\n').filter(l => l.trim()).map((line, i) => {
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
        <div><span className="text-gray-400">Email:</span> <span className="text-gray-700">{signup.email || '—'}</span></div>
        <div><span className="text-gray-400">Phone:</span> <span className="text-gray-700">{signup.phone || '—'}</span></div>
        <div><span className="text-gray-400">Service:</span> <span className="text-gray-700">{signup.service_type || '—'}</span></div>
        <div><span className="text-gray-400">Slot:</span> <span className="text-gray-700">{signup.time_slot || formatAppointmentTime(signup)}</span></div>
        {signup.raw_notes && <div className="pt-1"><span className="text-gray-400">Booker notes:</span> <div className="text-gray-700 text-xs whitespace-pre-wrap">{signup.raw_notes}</div></div>}
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
        {signup.team_notes && (
          <div className="mt-3 text-xs text-gray-600 whitespace-pre-wrap border-t border-gray-200 pt-2">
            {signup.team_notes}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

export default WorkhumanBooth;
