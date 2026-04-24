import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Upload, Search, Calendar, CheckCircle, XCircle, Clock,
  Star, User, Phone, Building, Loader2, RefreshCw, AlertCircle, MessageSquare,
  ChevronDown, ChevronUp, UserPlus, CheckCircle2,
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
  const [search, setSearch] = useState('');
  const [dayFilter, setDayFilter] = useState<string>('all');
  const [myOnly, setMyOnly] = useState(false);
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
        .select('id, name, company, title, assigned_to, tier, tier_1a, tier_1b, source')
        .in('id', leadIds);
      leadMap = Object.fromEntries((leads || []).map(l => [l.id, l]));
    }
    const hydrated = (data || []).map(s => ({
      ...s,
      _lead: s.matched_lead_id ? leadMap[s.matched_lead_id] || null : null,
    }));
    setSignups(hydrated);
    setLoading(false);
  }, []);

  useEffect(() => { loadSignups(); }, [loadSignups]);

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
    if (myOnly && myAssignee) {
      result = result.filter(s => s._lead?.assigned_to === myAssignee);
    }
    return result;
  }, [signups, search, dayFilter, myOnly, myAssignee]);

  // --- Stats ---

  const stats = useMemo(() => {
    const total = signups.length;
    const matched = signups.filter(s => s._lead && s._lead.source !== 'whl_booth_signup').length;
    const newLeads = signups.filter(s => s._lead?.source === 'whl_booth_signup').length;
    const tier1a = signups.filter(s => s._lead?.tier_1a).length;
    const tier1b = signups.filter(s => s._lead?.tier_1b).length;
    const mine = myAssignee ? signups.filter(s => s._lead?.assigned_to === myAssignee).length : 0;
    return { total, matched, newLeads, tier1a, tier1b, mine };
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
            title="Refresh from DB"
          >
            <RefreshCw size={14} /> Refresh
          </button>
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
            {myAssignee && (
              <label className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm cursor-pointer transition-colors ${
                myOnly ? 'bg-indigo-50 border-indigo-300 text-indigo-800' : 'bg-white border-gray-200 text-gray-600'
              }`}>
                <input
                  type="checkbox"
                  checked={myOnly}
                  onChange={e => setMyOnly(e.target.checked)}
                  className="rounded"
                />
                My appointments
              </label>
            )}
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
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                  />
                ))}
              </tbody>
            </table>
          </div>
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
  signup, isExpanded, onToggle, onStatusChange, onAppendNote,
}: {
  signup: SignupRow;
  isExpanded: boolean;
  onToggle: () => void;
  onStatusChange: (status: string) => void;
  onAppendNote: (text: string) => void;
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
          <div className="text-[11px] text-gray-400">{signup.email || lead?.name ? (signup.email || '—') : '—'}{signup.phone ? ` · ${signup.phone}` : ''}</div>
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
        <td className="px-3 py-2">
          {assignee && ASSIGNEE_INITIALS[assignee] ? (
            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold ${ASSIGNEE_COLORS[assignee]}`} title={assignee}>
              {ASSIGNEE_INITIALS[assignee]}
            </span>
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

function SignupDetail({ signup, onAppendNote }: { signup: SignupRow; onAppendNote: (text: string) => void }) {
  const [noteDraft, setNoteDraft] = useState('');
  const lead = signup._lead;
  const [submitting, setSubmitting] = useState(false);

  const submitNote = async () => {
    if (!noteDraft.trim()) return;
    setSubmitting(true);
    await onAppendNote(noteDraft);
    setNoteDraft('');
    setSubmitting(false);
  };

  return (
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
  );
}

export default WorkhumanBooth;
