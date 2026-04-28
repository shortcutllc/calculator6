import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Upload, Search, ChevronDown, ChevronUp, Target, Users,
  Star, Mail, MessageSquare, Calendar, Trash2, X, FileDown,
  AlertCircle, CheckCircle, Clock, UserCheck, ExternalLink, Copy,
  Sparkles, Loader2, RefreshCw, Linkedin, Zap, UserPlus, CalendarCheck, Pencil
} from 'lucide-react';
import { WorkhumanLead, OutreachStatus, LeadTier, VipSlotDay, OutreachChannel, AssigneeName, ASSIGNEE_NAMES } from '../types/workhumanLead';
import {
  parseCSV,
  bulkInsertLeads,
  fetchLeads,
  updateLeadStatus,
  updateLeadTier,
  updateLeadVipSlot,
  updateLeadNotes,
  updateLeadAssignment,
  deleteLead,
  createLandingPageForLead,
  bulkCreateLandingPages,
  fetchOutreachChannelsByLead,
} from '../services/WorkhumanLeadService';
import { WorkhumanMessagingPanel } from './WorkhumanMessagingPanel';
import { WorkhumanAddLeadModal } from './WorkhumanAddLeadModal';
import { WorkhumanBookBoothModal } from './WorkhumanBookBoothModal';
import { WorkhumanEditLeadModal } from './WorkhumanEditLeadModal';
import { calculateWorkhumanLeadScore } from '../utils/workhumanLeadScoring';
import { WorkhumanLeadCSVRow } from '../types/workhumanLead';
import { useAuth } from '../contexts/AuthContext';

// Auth email → assignee name (mirrors mapping in WorkhumanMessagingPanel)
const EMAIL_TO_ASSIGNEE: Record<string, AssigneeName> = {
  'will@getshortcut.co': 'Will Newton',
  'jaimie@getshortcut.co': 'Jaimie Pritchard',
  'marc@getshortcut.co': 'Marc Levitan',
  'caren@getshortcut.co': 'Caren Skutch',
};

// Two-letter initials per assignee, used for lead-row badges
const ASSIGNEE_INITIALS: Record<AssigneeName, string> = {
  'Will Newton': 'WN',
  'Jaimie Pritchard': 'JP',
  'Marc Levitan': 'ML',
  'Caren Skutch': 'CS',
};

// Distinct color per assignee for the badge
const ASSIGNEE_COLORS: Record<AssigneeName, string> = {
  'Will Newton': 'bg-indigo-100 text-indigo-800',
  'Jaimie Pritchard': 'bg-rose-100 text-rose-800',
  'Marc Levitan': 'bg-emerald-100 text-emerald-800',
  'Caren Skutch': 'bg-cyan-100 text-cyan-800',
};

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

type TierFilter = 'all' | LeadTier | 'tier_1a' | 'tier_1b';

const WorkhumanLeads: React.FC = () => {
  const { user } = useAuth();
  const myAssignee: AssigneeName | null = useMemo(() => {
    const email = user?.email?.toLowerCase() || '';
    return EMAIL_TO_ASSIGNEE[email] || null;
  }, [user]);

  const [leads, setLeads] = useState<WorkhumanLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [myLeadsOnly, setMyLeadsOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | OutreachStatus>('all');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [landingPageFilter, setLandingPageFilter] = useState<'all' | 'has' | 'missing'>('all');
  const [sortField, setSortField] = useState<'name' | 'company' | 'title' | 'company_size_normalized' | 'lead_score' | 'tier' | 'page_view_count'>('lead_score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [creatingPageIds, setCreatingPageIds] = useState<Set<string>>(new Set());
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [outreachChannelsByLead, setOutreachChannelsByLead] = useState<Record<string, Set<OutreachChannel>>>({});
  const [showAddLead, setShowAddLead] = useState(false);
  const [bookBoothLead, setBookBoothLead] = useState<WorkhumanLead | null>(null);
  const [editLead, setEditLead] = useState<WorkhumanLead | null>(null);

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

  // Deep-link support: when arrived from `/workhuman-leads?lead=<uuid>` (e.g.
  // the booth view's "Open in CRM →" button), auto-expand that lead and
  // scroll it into view as soon as the data arrives. Reset every filter so
  // the target lead is guaranteed to be visible regardless of what was
  // selected before. Strip the param from the URL after handling so a
  // manual refresh doesn't keep re-scrolling.
  useEffect(() => {
    if (loading || leads.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const target = params.get('lead');
    if (!target) return;
    const exists = leads.some(l => l.id === target);
    if (!exists) return;
    // Clear filters that could hide the lead
    setSearchTerm('');
    setTierFilter('all');
    setMyLeadsOnly(false);
    setStatusFilter('all');
    setIndustryFilter('all');
    setLandingPageFilter('all');
    setExpandedId(target);
    // Defer scroll until after the filter reset re-renders
    setTimeout(() => {
      const el = document.getElementById(`lead-row-${target}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    // Clean the URL so a manual refresh doesn't re-trigger the scroll
    params.delete('lead');
    const newSearch = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}${window.location.hash}`);
  }, [loading, leads]);

  // Load outreach channel summary for badges on each row
  useEffect(() => {
    fetchOutreachChannelsByLead().then(setOutreachChannelsByLead);
  }, [leads.length]);

  // --- Computed values ---

  const industries = useMemo(() => {
    const set = new Set<string>();
    leads.forEach(l => { if (l.industry) set.add(l.industry); });
    return Array.from(set).sort();
  }, [leads]);

  const stats = useMemo(() => {
    const tier1 = leads.filter(l => l.tier === 'tier_1').length;
    const tier1a = leads.filter(l => l.tier_1a).length;
    const tier1b = leads.filter(l => l.tier_1b).length;
    const tier2 = leads.filter(l => l.tier === 'tier_2').length;
    const tier3 = leads.filter(l => l.tier === 'tier_3').length;
    const emailed = leads.filter(l => l.outreach_status !== 'not_contacted').length;
    const responded = leads.filter(l => ['responded', 'meeting_booked', 'vip_booked'].includes(l.outreach_status)).length;
    const meetings = leads.filter(l => ['meeting_booked', 'vip_booked'].includes(l.outreach_status)).length;
    const vipSlots = leads.filter(l => l.vip_slot_day !== null).length;
    const myLeads = myAssignee ? leads.filter(l => l.assigned_to === myAssignee).length : 0;
    return { total: leads.length, tier1, tier1a, tier1b, tier2, tier3, emailed, responded, meetings, vipSlots, myLeads };
  }, [leads, myAssignee]);

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

    if (tierFilter === 'tier_1a') {
      result = result.filter(l => l.tier_1a);
    } else if (tierFilter === 'tier_1b') {
      result = result.filter(l => l.tier_1b);
    } else if (tierFilter !== 'all') {
      result = result.filter(l => l.tier === tierFilter);
    }

    if (myLeadsOnly && myAssignee) {
      result = result.filter(l => l.assigned_to === myAssignee);
    }

    if (statusFilter !== 'all') {
      result = result.filter(l => l.outreach_status === statusFilter);
    }

    if (industryFilter !== 'all') {
      result = result.filter(l => l.industry === industryFilter);
    }

    if (landingPageFilter === 'has') {
      result = result.filter(l => !!l.landing_page_url);
    } else if (landingPageFilter === 'missing') {
      result = result.filter(l => !l.landing_page_url);
    }

    // Sort
    const tierRank = { tier_1: 3, tier_2: 2, tier_3: 1 } as const;
    const multi = sortDir === 'asc' ? 1 : -1;
    result = [...result].sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      switch (sortField) {
        case 'name':                  av = a.name.toLowerCase(); bv = b.name.toLowerCase(); break;
        case 'company':               av = (a.company || '').toLowerCase(); bv = (b.company || '').toLowerCase(); break;
        case 'title':                 av = (a.title || '').toLowerCase(); bv = (b.title || '').toLowerCase(); break;
        case 'company_size_normalized': av = a.company_size_normalized || 0; bv = b.company_size_normalized || 0; break;
        case 'page_view_count':       av = a.page_view_count || 0; bv = b.page_view_count || 0; break;
        case 'tier':                  av = tierRank[a.tier]; bv = tierRank[b.tier]; break;
        case 'lead_score':
        default:                      av = a.lead_score; bv = b.lead_score; break;
      }
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * multi;
      return String(av).localeCompare(String(bv)) * multi;
    });

    return result;
  }, [leads, searchTerm, tierFilter, myLeadsOnly, myAssignee, statusFilter, industryFilter, landingPageFilter, sortField, sortDir]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      // Default direction per field
      setSortDir(field === 'name' || field === 'company' || field === 'title' ? 'asc' : 'desc');
    }
  };

  // --- Actions ---

  const handleStatusChange = async (id: string, status: OutreachStatus) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, outreach_status: status } : l));
    const success = await updateLeadStatus(id, status);
    if (!success) loadLeads(); // revert on failure
  };

  const handleAssignmentChange = async (id: string, assignee: AssigneeName | null) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, assigned_to: assignee } : l));
    const ok = await updateLeadAssignment(id, assignee);
    if (!ok) loadLeads();
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

  // --- Selection handlers ---
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredLeads.length && filteredLeads.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLeads.map(l => l.id)));
    }
  };

  // --- Landing page creation ---
  const handleCreateLandingPage = async (lead: WorkhumanLead, overrideLogoUrl?: string) => {
    setCreatingPageIds(prev => { const n = new Set(prev); n.add(lead.id); return n; });
    try {
      const result = await createLandingPageForLead(lead, overrideLogoUrl);
      if (result.success) {
        setLeads(prev => prev.map(l =>
          l.id === lead.id
            ? { ...l, landing_page_url: result.url || null, logo_url: result.logoUrl || null, logo_source: result.logoSource || null }
            : l
        ));
      } else {
        alert('Failed to create landing page: ' + (result.error || 'unknown'));
      }
    } finally {
      setCreatingPageIds(prev => { const n = new Set(prev); n.delete(lead.id); return n; });
    }
  };

  const handleBulkCreateLandingPages = async () => {
    const selected = filteredLeads.filter(l => selectedIds.has(l.id));
    // Only create for ones that don't already have a page
    const toCreate = selected.filter(l => !l.landing_page_url);
    if (toCreate.length === 0) {
      alert('All selected leads already have landing pages.');
      return;
    }
    if (!confirm(`Create landing pages for ${toCreate.length} lead${toCreate.length !== 1 ? 's' : ''}? (${selected.length - toCreate.length} already have pages and will be skipped)`)) return;

    setBulkProgress({ done: 0, total: toCreate.length });
    setCreatingPageIds(new Set(toCreate.map(l => l.id)));

    const { succeeded, failed, results } = await bulkCreateLandingPages(toCreate, (done, total) => {
      setBulkProgress({ done, total });
    });

    // Update leads state from results
    setLeads(prev => prev.map(l => {
      const r = results.find(x => x.leadId === l.id);
      if (r && r.result.success) {
        return {
          ...l,
          landing_page_url: r.result.url || null,
          logo_url: r.result.logoUrl || null,
          logo_source: r.result.logoSource || null,
        };
      }
      return l;
    }));

    setBulkProgress(null);
    setCreatingPageIds(new Set());
    setSelectedIds(new Set());
    alert(`Created ${succeeded} landing page${succeeded !== 1 ? 's' : ''}${failed > 0 ? `, ${failed} failed` : ''}.`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
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
          <StatCard
            label="Tier 1A (VIP 200)"
            value={stats.tier1a}
            icon={<Star size={18} />}
            color="text-amber-700"
            onClick={() => setTierFilter('tier_1a')}
            active={tierFilter === 'tier_1a'}
          />
          <StatCard
            label="Tier 1B"
            value={stats.tier1b}
            icon={<Star size={18} />}
            color="text-orange-600"
            onClick={() => setTierFilter('tier_1b')}
            active={tierFilter === 'tier_1b'}
          />
          <StatCard label="Tier 1" value={stats.tier1} icon={<Star size={18} />} color="text-amber-600" />
          <StatCard label="Tier 2" value={stats.tier2} icon={<Target size={18} />} color="text-blue-600" />
          <StatCard label="Tier 3" value={stats.tier3} icon={<Users size={18} />} color="text-gray-400" />
          <StatCard label="Contacted" value={stats.emailed} icon={<Mail size={18} />} color="text-yellow-600" />
          <StatCard label="Responded" value={stats.responded} icon={<MessageSquare size={18} />} color="text-green-600" />
          <StatCard label="VIP Slots" value={stats.vipSlots} icon={<CheckCircle size={18} />} color="text-amber-600" />
        </div>

        {/* Actions Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/workhuman-leads/outreach"
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
              title="Process your assigned Tier 1A leads one at a time"
            >
              <Zap size={16} />
              Rapid Outreach
            </Link>
            <Link
              to="/workhuman-leads/booth"
              className="flex items-center gap-2 px-4 py-2 bg-[#09364f] text-white rounded-lg hover:bg-[#0a4060] transition-colors text-sm font-medium"
              title="Conference day-of sign-ups and appointments"
            >
              <Calendar size={16} />
              Booth (Day-of)
            </Link>
            <button
              onClick={() => setShowAddLead(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              title="Add a single lead manually"
            >
              <UserPlus size={16} />
              Add Lead
            </button>
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
              onChange={e => setTierFilter(e.target.value as TierFilter)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="all">All Tiers</option>
              <option value="tier_1a">Tier 1A (VIP 200)</option>
              <option value="tier_1b">Tier 1B</option>
              <option value="tier_1">Tier 1 (all)</option>
              <option value="tier_2">Tier 2</option>
              <option value="tier_3">Tier 3</option>
            </select>

            {myAssignee && (
              <label className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm cursor-pointer transition-colors ${
                myLeadsOnly ? 'bg-indigo-50 border-indigo-300 text-indigo-800' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}>
                <input
                  type="checkbox"
                  checked={myLeadsOnly}
                  onChange={e => setMyLeadsOnly(e.target.checked)}
                  className="rounded border-gray-300"
                />
                My Leads ({stats.myLeads})
              </label>
            )}

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
              value={landingPageFilter}
              onChange={e => setLandingPageFilter(e.target.value as 'all' | 'has' | 'missing')}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="all">All Landing Pages</option>
              <option value="has">Has Landing Page</option>
              <option value="missing">Missing Landing Page</option>
            </select>
          </div>
        </div>

        {/* Results count + Bulk action bar */}
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-500">
            Showing {filteredLeads.length} of {stats.total} leads
            {selectedIds.size > 0 && (
              <span className="ml-3 text-amber-700 font-medium">{selectedIds.size} selected</span>
            )}
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
              <button
                onClick={handleBulkCreateLandingPages}
                disabled={bulkProgress !== null}
                className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 text-white text-sm font-medium px-4 py-2 rounded-lg inline-flex items-center gap-2 transition-colors"
              >
                {bulkProgress ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {bulkProgress.done}/{bulkProgress.total}
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Create landing pages ({selectedIds.size})
                  </>
                )}
              </button>
            </div>
          )}
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
                    <th className="w-10 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.size > 0 && selectedIds.size === filteredLeads.length}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 cursor-pointer"
                      />
                    </th>
                    <SortableHeader label="Name / Email" field="name" currentField={sortField} direction={sortDir} onClick={toggleSort} align="left" />
                    <SortableHeader label="Company" field="company" currentField={sortField} direction={sortDir} onClick={toggleSort} align="left" />
                    <SortableHeader label="Landing Page" field="page_view_count" currentField={sortField} direction={sortDir} onClick={toggleSort} align="center" />
                    <SortableHeader label="Title" field="title" currentField={sortField} direction={sortDir} onClick={toggleSort} align="left" />
                    <SortableHeader label="Size" field="company_size_normalized" currentField={sortField} direction={sortDir} onClick={toggleSort} align="left" />
                    <SortableHeader label="Score" field="lead_score" currentField={sortField} direction={sortDir} onClick={toggleSort} align="center" />
                    <SortableHeader label="Tier" field="tier" currentField={sortField} direction={sortDir} onClick={toggleSort} align="center" />
                    <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-500">VIP Slot</th>
                    <th className="text-center px-2 py-3 font-medium text-gray-500" title="Outreach channels used">Sent</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map(lead => (
                    <React.Fragment key={lead.id}>
                      <tr
                        id={`lead-row-${lead.id}`}
                        className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${expandedId === lead.id ? 'bg-blue-50/50' : ''} ${selectedIds.has(lead.id) ? 'bg-amber-50/40' : ''}`}
                        onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                      >
                        <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(lead.id)}
                            onChange={() => toggleSelect(lead.id)}
                            className="rounded border-gray-300 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-gray-900">{lead.name}</div>
                            {lead.tier_1a && (
                              <span title="Tier 1A (VIP 200)" className="text-amber-600"><Star size={12} fill="currentColor" /></span>
                            )}
                            {!lead.tier_1a && lead.tier_1b && (
                              <span title="Tier 1B" className="text-orange-500"><Star size={12} /></span>
                            )}
                            {lead.assigned_to && ASSIGNEE_INITIALS[lead.assigned_to as AssigneeName] && (
                              <span
                                title={`Assigned to ${lead.assigned_to}`}
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${ASSIGNEE_COLORS[lead.assigned_to as AssigneeName]}`}
                              >
                                {ASSIGNEE_INITIALS[lead.assigned_to as AssigneeName]}
                              </span>
                            )}
                          </div>
                          <div className="text-gray-400 text-xs">
                            {lead.email && !lead.email.includes('@no-email.placeholder') ? (
                              <a
                                href={`mailto:${lead.email}`}
                                onClick={e => e.stopPropagation()}
                                className="hover:text-[#09364f] hover:underline break-all"
                              >
                                {lead.email}
                              </a>
                            ) : ''}
                            {(lead.mobile_phone || lead.phone) && (
                              <>
                                {lead.email && !lead.email.includes('@no-email.placeholder') && ' · '}
                                <a
                                  href={`sms:${lead.mobile_phone || lead.phone}`}
                                  onClick={e => e.stopPropagation()}
                                  className="hover:text-emerald-700 hover:underline"
                                  title="Text this number"
                                >
                                  {lead.mobile_phone || lead.phone}
                                </a>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{lead.company || '—'}</td>
                        <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                          {lead.landing_page_url ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="inline-flex items-center gap-1">
                                <a
                                  href={lead.landing_page_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 text-xs"
                                  title={lead.landing_page_url}
                                >
                                  <ExternalLink size={12} />
                                  Open
                                </a>
                                <button
                                  onClick={() => copyToClipboard(lead.landing_page_url!)}
                                  className="text-gray-400 hover:text-gray-600 p-1"
                                  title="Copy URL"
                                >
                                  <Copy size={12} />
                                </button>
                              </div>
                              {(lead.page_view_count ?? 0) > 0 ? (
                                <div className="text-[10px] text-green-700 font-medium" title={lead.page_last_viewed_at ? `Last viewed ${new Date(lead.page_last_viewed_at).toLocaleString()}` : ''}>
                                  👁 {lead.page_view_count} view{lead.page_view_count === 1 ? '' : 's'}
                                </div>
                              ) : (
                                <div className="text-[10px] text-gray-400">Not viewed</div>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleCreateLandingPage(lead)}
                              disabled={creatingPageIds.has(lead.id) || !lead.company}
                              className="text-xs bg-amber-100 hover:bg-amber-200 disabled:bg-gray-100 disabled:text-gray-400 text-amber-800 font-medium px-2.5 py-1 rounded-full inline-flex items-center gap-1 transition-colors"
                              title={!lead.company ? 'Company name required' : 'Create landing page'}
                            >
                              {creatingPageIds.has(lead.id) ? (
                                <><Loader2 size={11} className="animate-spin" /> Creating</>
                              ) : (
                                <><Sparkles size={11} /> Create</>
                              )}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700 min-w-[260px]">{lead.title || '—'}</td>
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
                        <td className="px-2 py-3 text-center">
                          <div className="inline-flex items-center gap-1 text-gray-400">
                            {(outreachChannelsByLead[lead.id] || new Set()).has('workhuman_dm') && (
                              <span title="Workhuman DM sent" className="text-[#1b3a5c]"><MessageSquare size={12} /></span>
                            )}
                            {((outreachChannelsByLead[lead.id] || new Set()).has('linkedin_connect') ||
                              (outreachChannelsByLead[lead.id] || new Set()).has('linkedin_dm')) && (
                              <span title="LinkedIn outreach" className="text-[#0a66c2]"><Linkedin size={12} /></span>
                            )}
                            {(outreachChannelsByLead[lead.id] || new Set()).has('email') && (
                              <span title="Email sent" className="text-amber-600"><Mail size={12} /></span>
                            )}
                            {!outreachChannelsByLead[lead.id]?.size && <span className="text-gray-300">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {expandedId === lead.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {expandedId === lead.id && (
                        <tr>
                          <td colSpan={12} className="bg-gray-50/70 px-6 py-4">
                            <ExpandedLeadRow
                              lead={lead}
                              onVipSlot={handleVipSlot}
                              isCreatingPage={creatingPageIds.has(lead.id)}
                              onCreatePage={(overrideUrl) => handleCreateLandingPage(lead, overrideUrl)}
                              onCopyUrl={() => lead.landing_page_url && copyToClipboard(lead.landing_page_url)}
                              onNotesChange={async (notes) => {
                                setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, notes } : l));
                                await updateLeadNotes(lead.id, notes);
                              }}
                              onDelete={() => handleDelete(lead.id)}
                              onAssignmentChange={(assignee) => handleAssignmentChange(lead.id, assignee)}
                              onBookAtBooth={() => setBookBoothLead(lead)}
                              onEdit={() => setEditLead(lead)}
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

      {/* Manual Add Lead Modal */}
      {showAddLead && (
        <WorkhumanAddLeadModal
          onClose={() => setShowAddLead(false)}
          onCreated={(created) => {
            setLeads(prev => [created, ...prev]);
            setShowAddLead(false);
          }}
        />
      )}

      {/* Book Booth Appointment Modal */}
      {bookBoothLead && (
        <WorkhumanBookBoothModal
          lead={bookBoothLead}
          onClose={() => setBookBoothLead(null)}
          onBooked={(updated) => {
            setLeads(prev => prev.map(l => l.id === updated.id ? { ...l, ...updated } : l));
            setBookBoothLead(null);
          }}
        />
      )}

      {/* Edit Lead Modal */}
      {editLead && (
        <WorkhumanEditLeadModal
          lead={editLead}
          onClose={() => setEditLead(null)}
          onSaved={(patch) => {
            setLeads(prev => prev.map(l => l.id === editLead.id ? { ...l, ...patch } : l));
            setEditLead(null);
          }}
        />
      )}
    </div>
  );
};

// --- Sub-components ---

function SortableHeader<F extends string>({ label, field, currentField, direction, onClick, align = 'left' }: {
  label: string;
  field: F;
  currentField: F;
  direction: 'asc' | 'desc';
  onClick: (field: F) => void;
  align?: 'left' | 'center' | 'right';
}) {
  const isActive = currentField === field;
  const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
  return (
    <th className={`${alignClass} px-4 py-3 font-medium text-gray-500`}>
      <button
        onClick={() => onClick(field)}
        className={`inline-flex items-center gap-1 ${alignClass} hover:text-gray-800 transition-colors ${isActive ? 'text-gray-800' : ''}`}
      >
        {label}
        <span className={`text-[10px] ${isActive ? 'text-amber-600' : 'text-gray-300'}`}>
          {isActive ? (direction === 'asc' ? '▲' : '▼') : '▲▼'}
        </span>
      </button>
    </th>
  );
}

function StatCard({ label, value, icon, color, onClick, active }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const className = `bg-white rounded-lg shadow-sm border p-4 ${
    onClick ? 'cursor-pointer hover:shadow transition-shadow' : ''
  } ${active ? 'border-amber-500 ring-2 ring-amber-200' : 'border-gray-200'}`;
  const content = (
    <>
      <div className={`flex items-center gap-2 mb-1 ${color}`}>
        {icon}
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className={`${className} text-left w-full`}>{content}</button>
  ) : (
    <div className={className}>{content}</div>
  );
}

function ExpandedLeadRow({ lead, onVipSlot, onNotesChange, onDelete, onAssignmentChange, isCreatingPage, onCreatePage, onCopyUrl, onBookAtBooth, onEdit }: {
  lead: WorkhumanLead;
  onVipSlot: (id: string, day: VipSlotDay | null) => void;
  onNotesChange: (notes: string) => void;
  onDelete: () => void;
  onAssignmentChange: (assignee: AssigneeName | null) => void;
  isCreatingPage?: boolean;
  onCreatePage?: (overrideUrl?: string) => void;
  onCopyUrl?: () => void;
  onBookAtBooth?: () => void;
  onEdit?: () => void;
}) {
  const { user } = useAuth();
  const myFirstName = useMemo(() => {
    const email = user?.email?.toLowerCase() || '';
    const assignee = EMAIL_TO_ASSIGNEE[email];
    return assignee ? assignee.split(' ')[0] : 'Team';
  }, [user]);

  const [notes, setNotes] = useState(lead.notes || '');
  const [noteDraft, setNoteDraft] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [logoOverride, setLogoOverride] = useState('');
  const [showLogoOverride, setShowLogoOverride] = useState(false);
  const notesTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleNotesChange = (val: string) => {
    setNotes(val);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => onNotesChange(val), 800);
  };

  /**
   * Append a timestamped + name-tagged note to the existing notes blob.
   * Mirrors the booth-view note adder so a CRM scroll-and-tag pattern
   * stays consistent across surfaces. New entries land at the top.
   */
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
    await onNotesChange(merged);
    setAddingNote(false);
  };

  const handleReplaceLogo = () => {
    if (!logoOverride.trim() || !onCreatePage) return;
    onCreatePage(logoOverride.trim());
    setLogoOverride('');
    setShowLogoOverride(false);
  };

  return (
    <div>
      {onEdit && (
        <div className="flex justify-end mb-3">
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#09364f] hover:text-[#0a4060] px-3 py-1.5 border border-[#09364f]/20 rounded-lg hover:bg-[#09364f]/5 transition-colors"
            title="Edit all lead fields"
          >
            <Pencil size={12} /> Edit Lead
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Details */}
      <div className="space-y-2 text-sm">
        <h4 className="font-medium text-gray-700 mb-2">Details</h4>
        <div>
          <span className="text-gray-400">Email:</span>{' '}
          {lead.email && !lead.email.includes('@no-email.placeholder') ? (
            <a href={`mailto:${lead.email}`} className="text-[#09364f] hover:underline break-all">{lead.email}</a>
          ) : <span className="text-gray-700">—</span>}
        </div>
        {(lead.mobile_phone || lead.phone) && (
          <div>
            <span className="text-gray-400">Phone:</span>{' '}
            <a
              href={`sms:${lead.mobile_phone || lead.phone}`}
              className="text-emerald-700 hover:underline"
              title="Text this number"
            >
              {lead.mobile_phone || lead.phone}
            </a>
            {lead.mobile_phone && lead.phone && lead.mobile_phone !== lead.phone && (
              <>
                {' · '}
                <a href={`tel:${lead.phone}`} className="text-gray-500 hover:underline">{lead.phone}</a>
              </>
            )}
          </div>
        )}
        <div><span className="text-gray-400">Location:</span> <span className="text-gray-700">{lead.hq_location || '—'}</span></div>
        <div><span className="text-gray-400">Industry:</span> <span className="text-gray-700">{lead.industry || '—'}</span></div>
        <div><span className="text-gray-400">Company size:</span> <span className="text-gray-700">{lead.company_size ? parseInt(lead.company_size).toLocaleString() + ' employees' : '—'}</span></div>
        <div><span className="text-gray-400">LinkedIn:</span> {lead.linkedin_url ? <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{lead.linkedin_url.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, '').replace(/\/$/, '')}</a> : <span className="text-gray-700">—</span>}</div>
        <div><span className="text-gray-400">Company URL:</span> {lead.company_url ? <a href={lead.company_url.startsWith('http') ? lead.company_url : 'https://' + lead.company_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{lead.company_url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</a> : <span className="text-gray-700">—</span>}</div>
        <div><span className="text-gray-400">Score:</span> <span className="text-gray-700">{lead.lead_score} pts</span></div>
        {lead.tier_1a && <div className="text-amber-700 text-xs flex items-center gap-1"><Star size={12} fill="currentColor" /> Tier 1A (top 200 VIP)</div>}
        {lead.tier_override && <div className="text-amber-600 text-xs">Tier manually overridden</div>}
        <div className="pt-2">
          <label className="text-gray-400 block mb-1 text-xs">Assigned to:</label>
          <select
            value={lead.assigned_to || ''}
            onChange={e => onAssignmentChange((e.target.value || null) as AssigneeName | null)}
            className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-white"
          >
            <option value="">Unassigned</option>
            {ASSIGNEE_NAMES.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* VIP Slot + Timeline */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-700 mb-2 text-sm">VIP Massage Slot</h4>
        <div className="flex gap-2 flex-wrap">
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
              {lead.vip_slot_day === day && lead.vip_slot_time && (
                <span className="ml-1 opacity-80">· {lead.vip_slot_time.substring(0, 14)}</span>
              )}
            </button>
          ))}
        </div>
        {onBookAtBooth && (
          <button
            onClick={onBookAtBooth}
            className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-[#09364f] hover:text-[#0a4060] px-3 py-1.5 border border-[#09364f]/20 rounded-lg hover:bg-[#09364f]/5 transition-colors"
            title="Book a massage appointment — auto-adds to Booth dashboard"
          >
            <CalendarCheck size={12} /> Book at Booth
          </button>
        )}

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

        {/* Quick add — prepends a timestamped, name-tagged entry without
            wiping the existing notes blob. */}
        <div className="flex items-start gap-2">
          <textarea
            value={noteDraft}
            onChange={e => setNoteDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleAddNote();
              }
            }}
            placeholder="Quick note (Cmd/Ctrl + Enter to save)…"
            rows={2}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#09364f]/20 focus:border-[#09364f]"
          />
          <button
            onClick={handleAddNote}
            disabled={!noteDraft.trim() || addingNote}
            className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 text-white text-xs font-semibold px-3 py-2 rounded-lg inline-flex items-center gap-1.5 self-stretch"
          >
            {addingNote ? <Loader2 size={12} className="animate-spin" /> : <MessageSquare size={12} />}
            Add note
          </button>
        </div>

        {/* Free-form blob — auto-saves on debounce, holds the running log */}
        <textarea
          value={notes}
          onChange={e => handleNotesChange(e.target.value)}
          placeholder="No notes yet…"
          className="w-full h-32 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#09364f]/20 focus:border-[#09364f] font-mono"
        />
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors"
        >
          <Trash2 size={12} /> Remove lead
        </button>
      </div>

      {/* Landing Page + Logo */}
      <div className="space-y-3 md:col-span-3 pt-2 border-t border-gray-200">
        <h4 className="font-medium text-gray-700 mb-2 text-sm flex items-center gap-2">
          <Sparkles size={14} className="text-amber-600" />
          Personalized Landing Page
        </h4>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          {/* Logo preview */}
          <div className="flex items-center gap-3">
            {lead.logo_url ? (
              <div className="w-20 h-20 bg-white border border-gray-200 rounded-lg flex items-center justify-center p-2 overflow-hidden">
                <img
                  src={lead.logo_url}
                  alt={lead.company || ''}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            ) : (
              <div className="w-20 h-20 bg-gray-100 border border-dashed border-gray-300 rounded-lg flex items-center justify-center text-xs text-gray-400">
                No logo
              </div>
            )}
            <div className="text-xs text-gray-500">
              {lead.logo_source && <div>Source: <span className="font-medium text-gray-700">{lead.logo_source}</span></div>}
              {!lead.logo_source && <div className="text-gray-400">Logo will be auto-discovered</div>}
            </div>
          </div>

          {/* URL + actions */}
          <div className="flex-1 space-y-2">
            {lead.landing_page_url ? (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <a href={lead.landing_page_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate inline-flex items-center gap-1">
                    <ExternalLink size={12} /> {lead.landing_page_url}
                  </a>
                  <button
                    onClick={onCopyUrl}
                    className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                    title="Copy URL"
                  >
                    <Copy size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full font-medium ${(lead.page_view_count ?? 0) > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                    👁 {lead.page_view_count ?? 0} view{lead.page_view_count === 1 ? '' : 's'}
                  </div>
                  {lead.page_last_viewed_at && (
                    <span className="text-gray-500">
                      Last viewed {new Date(lead.page_last_viewed_at).toLocaleString()}
                    </span>
                  )}
                  <button
                    onClick={() => setShowLogoOverride(!showLogoOverride)}
                    className="text-gray-600 hover:text-gray-800 inline-flex items-center gap-1 ml-auto"
                  >
                    <RefreshCw size={11} /> Replace logo
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => onCreatePage?.()}
                disabled={isCreatingPage || !lead.company}
                className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 text-white text-sm font-medium px-4 py-2 rounded-lg inline-flex items-center gap-2 transition-colors"
              >
                {isCreatingPage ? (
                  <><Loader2 size={14} className="animate-spin" /> Creating...</>
                ) : (
                  <><Sparkles size={14} /> Create landing page</>
                )}
              </button>
            )}

            {/* Override logo input */}
            {showLogoOverride && (
              <div className="flex gap-2 items-center pt-2">
                <input
                  type="text"
                  value={logoOverride}
                  onChange={e => setLogoOverride(e.target.value)}
                  placeholder="Paste image URL (PNG/SVG transparent preferred)"
                  className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#09364f]/20 focus:border-[#09364f]"
                />
                <button
                  onClick={handleReplaceLogo}
                  disabled={!logoOverride.trim() || isCreatingPage}
                  className="bg-gray-800 hover:bg-gray-900 disabled:bg-gray-300 text-white text-sm font-medium px-3 py-1.5 rounded-lg"
                >
                  {isCreatingPage ? <Loader2 size={12} className="animate-spin" /> : 'Regenerate'}
                </button>
                <button onClick={() => { setShowLogoOverride(false); setLogoOverride(''); }} className="text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messaging panel */}
      <div className="md:col-span-3 pt-2 border-t border-gray-200">
        <WorkhumanMessagingPanel lead={lead} />
      </div>
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
    <div id={`lead-row-${lead.id}`} className="p-4">
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
