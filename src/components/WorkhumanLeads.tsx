import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Upload, Search, ChevronDown, ChevronUp, Target, Users,
  Star, Mail, MessageSquare, Calendar, Trash2, X, FileDown,
  AlertCircle, CheckCircle, Clock, UserCheck
} from 'lucide-react';
import { WorkhumanLead, OutreachStatus, LeadTier, VipSlotDay } from '../types/workhumanLead';
import {
  parseCSV,
  bulkInsertLeads,
  fetchLeads,
  updateLeadStatus,
  updateLeadTier,
  updateLeadVipSlot,
  updateLeadNotes,
  deleteLead,
} from '../services/WorkhumanLeadService';
import { calculateWorkhumanLeadScore } from '../utils/workhumanLeadScoring';
import { WorkhumanLeadCSVRow } from '../types/workhumanLead';

// --- Constants ---

const TIER_LABELS: Record<LeadTier, string> = {
  tier_1: 'Tier 1 (VIP)',
  tier_2: 'Tier 2',
  tier_3: 'Tier 3',
};

const TIER_COLORS: Record<LeadTier, string> = {
  tier_1: 'bg-amber-100 text-amber-800',
  tier_2: 'bg-blue-100 text-blue-800',
  tier_3: 'bg-gray-100 text-gray-600',
};

const STATUS_LABELS: Record<OutreachStatus, string> = {
  not_contacted: 'Not Contacted',
  emailed: 'Emailed',
  responded: 'Responded',
  meeting_booked: 'Meeting Booked',
  vip_booked: 'VIP Booked',
  declined: 'Declined',
  no_response: 'No Response',
};

const STATUS_COLORS: Record<OutreachStatus, string> = {
  not_contacted: 'bg-gray-100 text-gray-600',
  emailed: 'bg-yellow-100 text-yellow-800',
  responded: 'bg-green-100 text-green-800',
  meeting_booked: 'bg-purple-100 text-purple-800',
  vip_booked: 'bg-amber-100 text-amber-800',
  declined: 'bg-red-100 text-red-800',
  no_response: 'bg-orange-100 text-orange-800',
};

const DAY_LABELS: Record<VipSlotDay, string> = {
  day_1: 'Day 1 (Apr 27)',
  day_2: 'Day 2 (Apr 28)',
  day_3: 'Day 3 (Apr 29)',
};

const ALL_STATUSES: OutreachStatus[] = [
  'not_contacted', 'emailed', 'responded', 'meeting_booked', 'vip_booked', 'declined', 'no_response'
];

// --- Component ---

const WorkhumanLeads: React.FC = () => {
  const [leads, setLeads] = useState<WorkhumanLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | LeadTier>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | OutreachStatus>('all');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'score' | 'company_size' | 'name'>('score');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCSVModal, setShowCSVModal] = useState(false);

  // --- Data loading ---

  const loadLeads = useCallback(async () => {
    setLoading(true);
    const data = await fetchLeads();
    setLeads(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // --- Computed values ---

  const industries = useMemo(() => {
    const set = new Set<string>();
    leads.forEach(l => { if (l.industry) set.add(l.industry); });
    return Array.from(set).sort();
  }, [leads]);

  const stats = useMemo(() => {
    const tier1 = leads.filter(l => l.tier === 'tier_1').length;
    const tier2 = leads.filter(l => l.tier === 'tier_2').length;
    const tier3 = leads.filter(l => l.tier === 'tier_3').length;
    const emailed = leads.filter(l => l.outreach_status !== 'not_contacted').length;
    const responded = leads.filter(l => ['responded', 'meeting_booked', 'vip_booked'].includes(l.outreach_status)).length;
    const meetings = leads.filter(l => ['meeting_booked', 'vip_booked'].includes(l.outreach_status)).length;
    const vipSlots = leads.filter(l => l.vip_slot_day !== null).length;
    return { total: leads.length, tier1, tier2, tier3, emailed, responded, meetings, vipSlots };
  }, [leads]);

  const filteredLeads = useMemo(() => {
    let result = leads;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(l =>
        l.name.toLowerCase().includes(term) ||
        (l.company && l.company.toLowerCase().includes(term)) ||
        l.email.toLowerCase().includes(term) ||
        (l.title && l.title.toLowerCase().includes(term))
      );
    }

    if (tierFilter !== 'all') {
      result = result.filter(l => l.tier === tierFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter(l => l.outreach_status === statusFilter);
    }

    if (industryFilter !== 'all') {
      result = result.filter(l => l.industry === industryFilter);
    }

    if (sortBy === 'score') {
      result = [...result].sort((a, b) => b.lead_score - a.lead_score);
    } else if (sortBy === 'company_size') {
      result = [...result].sort((a, b) => (b.company_size_normalized || 0) - (a.company_size_normalized || 0));
    } else if (sortBy === 'name') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [leads, searchTerm, tierFilter, statusFilter, industryFilter, sortBy]);

  // --- Actions ---

  const handleStatusChange = async (id: string, status: OutreachStatus) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, outreach_status: status } : l));
    const success = await updateLeadStatus(id, status);
    if (!success) loadLeads(); // revert on failure
  };

  const handleTierCycle = async (id: string, currentTier: LeadTier) => {
    const tiers: LeadTier[] = ['tier_1', 'tier_2', 'tier_3'];
    const nextIdx = (tiers.indexOf(currentTier) + 1) % tiers.length;
    const newTier = tiers[nextIdx];
    setLeads(prev => prev.map(l => l.id === id ? { ...l, tier: newTier, tier_override: true } : l));
    const success = await updateLeadTier(id, newTier);
    if (!success) loadLeads();
  };

  const handleVipSlot = async (id: string, day: VipSlotDay | null) => {
    setLeads(prev => prev.map(l => l.id === id ? {
      ...l,
      vip_slot_day: day,
      outreach_status: day ? 'vip_booked' : l.outreach_status
    } : l));
    const success = await updateLeadVipSlot(id, day, null);
    if (!success) loadLeads();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this lead?')) return;
    setLeads(prev => prev.filter(l => l.id !== id));
    await deleteLead(id);
  };

  // --- Render ---

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <Target className="text-amber-600" size={28} />
            <h1 className="text-2xl font-bold text-gray-900">Workhuman Leads</h1>
            <span className="bg-gray-200 text-gray-700 text-sm px-2.5 py-0.5 rounded-full font-medium">
              {stats.total}
            </span>
          </div>
          <p className="text-gray-500 text-sm">Workhuman Live 2026 attendee CRM. Upload networking list, auto-score, manage outreach.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total Leads" value={stats.total} icon={<Users size={18} />} color="text-gray-600" />
          <StatCard label="Tier 1 (VIP)" value={stats.tier1} icon={<Star size={18} />} color="text-amber-600" />
          <StatCard label="Tier 2" value={stats.tier2} icon={<Target size={18} />} color="text-blue-600" />
          <StatCard label="Tier 3" value={stats.tier3} icon={<Users size={18} />} color="text-gray-400" />
          <StatCard label="Contacted" value={stats.emailed} icon={<Mail size={18} />} color="text-yellow-600" />
          <StatCard label="Responded" value={stats.responded} icon={<MessageSquare size={18} />} color="text-green-600" />
          <StatCard label="Meetings" value={stats.meetings} icon={<Calendar size={18} />} color="text-purple-600" />
          <StatCard label="VIP Slots" value={stats.vipSlots} icon={<CheckCircle size={18} />} color="text-amber-600" />
        </div>

        {/* Actions Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowCSVModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#09364f] text-white rounded-lg hover:bg-[#0a4060] transition-colors text-sm font-medium"
            >
              <Upload size={16} />
              Import CSV
            </button>

            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search name, company, email, title..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#09364f]/20 focus:border-[#09364f]"
              />
            </div>

            <select
              value={tierFilter}
              onChange={e => setTierFilter(e.target.value as 'all' | LeadTier)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="all">All Tiers</option>
              <option value="tier_1">Tier 1 (VIP)</option>
              <option value="tier_2">Tier 2</option>
              <option value="tier_3">Tier 3</option>
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as 'all' | OutreachStatus)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="all">All Statuses</option>
              {ALL_STATUSES.map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>

            <select
              value={industryFilter}
              onChange={e => setIndustryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="all">All Industries</option>
              {industries.map(ind => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'score' | 'company_size' | 'name')}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="score">Sort: Score</option>
              <option value="company_size">Sort: Company Size</option>
              <option value="name">Sort: Name</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="text-sm text-gray-500 mb-2">
          Showing {filteredLeads.length} of {stats.total} leads
        </div>

        {/* Table */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center text-gray-400">
            Loading leads...
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Upload size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 mb-1">No leads yet</p>
            <p className="text-gray-400 text-sm">Import the Workhuman attendee CSV to get started.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Name / Email</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Company</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Title</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Size</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-500">Score</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-500">Tier</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-500">VIP Slot</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map(lead => (
                    <React.Fragment key={lead.id}>
                      <tr
                        className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${expandedId === lead.id ? 'bg-blue-50/50' : ''}`}
                        onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{lead.name}</div>
                          <div className="text-gray-400 text-xs">{lead.email?.includes('@no-email.placeholder') ? '' : lead.email}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{lead.company || '—'}</td>
                        <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">{lead.title || '—'}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {lead.company_size_normalized ? lead.company_size_normalized.toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block w-8 h-8 leading-8 rounded-full text-xs font-bold ${
                            lead.lead_score >= 70 ? 'bg-amber-100 text-amber-800' :
                            lead.lead_score >= 40 ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {lead.lead_score}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={e => { e.stopPropagation(); handleTierCycle(lead.id, lead.tier); }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${TIER_COLORS[lead.tier]} hover:opacity-80 transition-opacity`}
                            title="Click to change tier"
                          >
                            {TIER_LABELS[lead.tier]}
                            {lead.tier_override && <span className="text-[10px] opacity-60">*</span>}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                          <select
                            value={lead.outreach_status}
                            onChange={e => handleStatusChange(lead.id, e.target.value as OutreachStatus)}
                            className={`text-xs font-medium rounded-full px-2.5 py-1 border-0 cursor-pointer ${STATUS_COLORS[lead.outreach_status]}`}
                          >
                            {ALL_STATUSES.map(s => (
                              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-gray-500">
                          {lead.vip_slot_day ? DAY_LABELS[lead.vip_slot_day] : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {expandedId === lead.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {expandedId === lead.id && (
                        <tr>
                          <td colSpan={9} className="bg-gray-50/70 px-6 py-4">
                            <ExpandedLeadRow
                              lead={lead}
                              onVipSlot={handleVipSlot}
                              onNotesChange={async (notes) => {
                                setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, notes } : l));
                                await updateLeadNotes(lead.id, notes);
                              }}
                              onDelete={() => handleDelete(lead.id)}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {filteredLeads.map(lead => (
                <MobileLeadCard
                  key={lead.id}
                  lead={lead}
                  expanded={expandedId === lead.id}
                  onToggle={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                  onStatusChange={handleStatusChange}
                  onTierCycle={handleTierCycle}
                  onVipSlot={handleVipSlot}
                  onNotesChange={async (notes) => {
                    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, notes } : l));
                    await updateLeadNotes(lead.id, notes);
                  }}
                  onDelete={() => handleDelete(lead.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CSV Import Modal */}
      {showCSVModal && (
        <CSVImportModal
          onClose={() => setShowCSVModal(false)}
          onImportComplete={() => { setShowCSVModal(false); loadLeads(); }}
        />
      )}
    </div>
  );
};

// --- Sub-components ---

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className={`flex items-center gap-2 mb-1 ${color}`}>
        {icon}
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

function ExpandedLeadRow({ lead, onVipSlot, onNotesChange, onDelete }: {
  lead: WorkhumanLead;
  onVipSlot: (id: string, day: VipSlotDay | null) => void;
  onNotesChange: (notes: string) => void;
  onDelete: () => void;
}) {
  const [notes, setNotes] = useState(lead.notes || '');
  const notesTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleNotesChange = (val: string) => {
    setNotes(val);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => onNotesChange(val), 800);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Details */}
      <div className="space-y-2 text-sm">
        <h4 className="font-medium text-gray-700 mb-2">Details</h4>
        <div><span className="text-gray-400">Email:</span> <span className="text-gray-700">{lead.email?.includes('@no-email.placeholder') ? '—' : lead.email}</span></div>
        <div><span className="text-gray-400">Location:</span> <span className="text-gray-700">{lead.hq_location || '—'}</span></div>
        <div><span className="text-gray-400">Industry:</span> <span className="text-gray-700">{lead.industry || '—'}</span></div>
        <div><span className="text-gray-400">Company size:</span> <span className="text-gray-700">{lead.company_size ? parseInt(lead.company_size).toLocaleString() + ' employees' : '—'}</span></div>
        <div><span className="text-gray-400">LinkedIn:</span> {lead.linkedin_url ? <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{lead.linkedin_url.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, '').replace(/\/$/, '')}</a> : <span className="text-gray-700">—</span>}</div>
        <div><span className="text-gray-400">Company URL:</span> {lead.company_url ? <a href={lead.company_url.startsWith('http') ? lead.company_url : 'https://' + lead.company_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{lead.company_url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</a> : <span className="text-gray-700">—</span>}</div>
        <div><span className="text-gray-400">Score:</span> <span className="text-gray-700">{lead.lead_score} pts</span></div>
        {lead.tier_override && <div className="text-amber-600 text-xs">Tier manually overridden</div>}
      </div>

      {/* VIP Slot + Timeline */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-700 mb-2 text-sm">VIP Massage Slot</h4>
        <div className="flex gap-2">
          {(['day_1', 'day_2', 'day_3'] as VipSlotDay[]).map(day => (
            <button
              key={day}
              onClick={() => onVipSlot(lead.id, lead.vip_slot_day === day ? null : day)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                lead.vip_slot_day === day
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {DAY_LABELS[day]}
            </button>
          ))}
        </div>

        <h4 className="font-medium text-gray-700 mt-4 mb-2 text-sm">Outreach Timeline</h4>
        <div className="space-y-1 text-xs text-gray-500">
          {lead.email_sent_at && (
            <div className="flex items-center gap-1.5">
              <Mail size={12} /> Emailed {new Date(lead.email_sent_at).toLocaleDateString()}
            </div>
          )}
          {lead.responded_at && (
            <div className="flex items-center gap-1.5">
              <MessageSquare size={12} /> Responded {new Date(lead.responded_at).toLocaleDateString()}
            </div>
          )}
          {lead.meeting_scheduled_at && (
            <div className="flex items-center gap-1.5">
              <Calendar size={12} /> Meeting {new Date(lead.meeting_scheduled_at).toLocaleDateString()}
            </div>
          )}
          {!lead.email_sent_at && !lead.responded_at && !lead.meeting_scheduled_at && (
            <div className="text-gray-400">No outreach activity yet</div>
          )}
        </div>
      </div>

      {/* Notes + Delete */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-700 mb-2 text-sm">Notes</h4>
        <textarea
          value={notes}
          onChange={e => handleNotesChange(e.target.value)}
          placeholder="Add notes about this lead..."
          className="w-full h-24 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#09364f]/20 focus:border-[#09364f]"
        />
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors"
        >
          <Trash2 size={12} /> Remove lead
        </button>
      </div>
    </div>
  );
}

function MobileLeadCard({ lead, expanded, onToggle, onStatusChange, onTierCycle, onVipSlot, onNotesChange, onDelete }: {
  lead: WorkhumanLead;
  expanded: boolean;
  onToggle: () => void;
  onStatusChange: (id: string, status: OutreachStatus) => void;
  onTierCycle: (id: string, tier: LeadTier) => void;
  onVipSlot: (id: string, day: VipSlotDay | null) => void;
  onNotesChange: (notes: string) => void;
  onDelete: () => void;
}) {
  return (
    <div className="p-4">
      <div className="flex items-start justify-between cursor-pointer" onClick={onToggle}>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate">{lead.name}</div>
          <div className="text-xs text-gray-500 truncate">{lead.company || '—'} · {lead.title || '—'}</div>
          <div className="flex items-center gap-2 mt-2">
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[lead.tier]}`}>
              {TIER_LABELS[lead.tier]}
            </span>
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[lead.outreach_status]}`}>
              {STATUS_LABELS[lead.outreach_status]}
            </span>
            <span className="text-xs text-gray-400">{lead.lead_score} pts</span>
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-gray-400 mt-1" /> : <ChevronDown size={16} className="text-gray-400 mt-1" />}
      </div>
      {expanded && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <ExpandedLeadRow lead={lead} onVipSlot={onVipSlot} onNotesChange={onNotesChange} onDelete={onDelete} />
        </div>
      )}
    </div>
  );
}

// --- CSV Import Modal ---

function CSVImportModal({ onClose, onImportComplete }: { onClose: () => void; onImportComplete: () => void }) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<WorkhumanLeadCSVRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ inserted: number; updated: number; errors: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setError('');
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      try {
        const rows = parseCSV(content);
        if (rows.length === 0) {
          setError('No valid rows found. Make sure the CSV has name and email columns.');
          return;
        }
        setParsedRows(rows);
      } catch (err) {
        setError('Failed to parse CSV file.');
      }
    };
    reader.readAsText(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.csv') || f.type === 'text/csv')) {
      handleFile(f);
    } else {
      setError('Please upload a CSV file.');
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setProgress(0);
    try {
      const res = await bulkInsertLeads(parsedRows, (done, total) => {
        setProgress(Math.round((done / total) * 100));
      });
      setResult(res);
      setTimeout(() => onImportComplete(), 1500);
    } catch (err) {
      setError('Import failed. Please try again.');
      setImporting(false);
    }
  };

  // Preview scoring for first 10 rows
  const previewScored = useMemo(() => {
    return parsedRows.slice(0, 10).map(row => {
      const result = calculateWorkhumanLeadScore(row);
      return { ...row, ...result };
    });
  }, [parsedRows]);

  const tierSummary = useMemo(() => {
    if (parsedRows.length === 0) return { tier1: 0, tier2: 0, tier3: 0 };
    let tier1 = 0, tier2 = 0, tier3 = 0;
    parsedRows.forEach(row => {
      const { tier } = calculateWorkhumanLeadScore(row);
      if (tier === 'tier_1') tier1++;
      else if (tier === 'tier_2') tier2++;
      else tier3++;
    });
    return { tier1, tier2, tier3 };
  }, [parsedRows]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Import Workhuman Attendee List</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-5">
          {/* Drop zone */}
          {!file && (
            <div
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
                dragActive ? 'border-[#09364f] bg-[#09364f]/5' : 'border-gray-300'
              }`}
              onDragOver={e => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
            >
              <Upload size={36} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-600 mb-1">Drag and drop your CSV file here</p>
              <p className="text-gray-400 text-sm mb-4">or</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-[#09364f] text-white rounded-lg text-sm font-medium hover:bg-[#0a4060]"
              >
                Browse Files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Preview */}
          {parsedRows.length > 0 && !result && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-700">
                  Preview ({parsedRows.length} leads found)
                </h3>
                <button onClick={() => { setFile(null); setParsedRows([]); }} className="text-xs text-gray-400 hover:text-gray-600">
                  Clear
                </button>
              </div>

              {/* Tier summary */}
              <div className="flex gap-3 mb-4">
                <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-medium">
                  {tierSummary.tier1} Tier 1 (VIP)
                </span>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                  {tierSummary.tier2} Tier 2
                </span>
                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                  {tierSummary.tier3} Tier 3
                </span>
              </div>

              {/* Preview table */}
              <div className="overflow-x-auto border border-gray-200 rounded-lg mb-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-3 py-2 font-medium text-gray-500">Name</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">Company</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">Title</th>
                      <th className="text-center px-3 py-2 font-medium text-gray-500">Score</th>
                      <th className="text-center px-3 py-2 font-medium text-gray-500">Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewScored.map((row, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="px-3 py-2 text-gray-900">{row.name}</td>
                        <td className="px-3 py-2 text-gray-600">{row.company || '—'}</td>
                        <td className="px-3 py-2 text-gray-600 max-w-[150px] truncate">{row.title || '—'}</td>
                        <td className="px-3 py-2 text-center font-medium">{row.score}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${TIER_COLORS[row.tier]}`}>
                            {TIER_LABELS[row.tier]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedRows.length > 10 && (
                  <div className="text-center text-xs text-gray-400 py-2 border-t border-gray-100">
                    ... and {parsedRows.length - 10} more
                  </div>
                )}
              </div>

              {/* Import button */}
              {!importing && (
                <button
                  onClick={handleImport}
                  className="w-full py-2.5 bg-[#09364f] text-white rounded-lg text-sm font-medium hover:bg-[#0a4060] transition-colors"
                >
                  Import {parsedRows.length} Leads
                </button>
              )}

              {/* Progress */}
              {importing && !result && (
                <div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-[#09364f] transition-all duration-300 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-500 text-center">Importing... {progress}%</p>
                </div>
              )}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="mt-4 p-4 bg-green-50 text-green-800 rounded-lg flex items-center gap-3">
              <CheckCircle size={20} />
              <div>
                <div className="font-medium">Import complete</div>
                <div className="text-sm">{result.inserted} new, {result.updated} updated{result.errors > 0 ? `, ${result.errors} errors` : ''}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default WorkhumanLeads;
