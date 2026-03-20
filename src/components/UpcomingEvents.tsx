import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  RefreshCw, Calendar, MapPin, Clock, Users, ExternalLink,
  Search, ChevronDown, ChevronUp, AlertCircle,
  Eye, EyeOff, CalendarCheck
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { format, formatDistanceToNow } from 'date-fns';

// --- Types ---

interface CoordinatorEventAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

interface ServiceOffering {
  serviceTitle?: string;
  id?: string;
  [key: string]: unknown;
}

interface Pro {
  id: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  proType: string | null;
  hairProType: string | null;
  active: boolean | null;
}

interface CoordinatorEvent {
  coordinatorEventId: string;
  name: string;
  category: string | null;
  status: string;
  startTime: string | null;
  endTime: string | null;
  timezoneAbbreviation: string | null;
  address: CoordinatorEventAddress | null;
  locationDescription: string | null;
  totalSlots: number;
  openSlots: number;
  filledSlots: number;
  fillPercentage: number;
  waitlistEntries: number;
  prosRequired: number;
  openProSpots: number;
  serviceOfferings: ServiceOffering[];
  serviceCategories: string[];
  contactName: string | null;
  contactPhone: string | null;
  sponsorName: string | null;
  proHourlyRate: number | null;
  proPayment: number | null;
  serviceCost: number | null;
  paid: boolean;
  adminNotes: string | null;
  staffNotes: string | null;
  signupUrl: string | null;
  eventLinkURL: string | null;
  logoUrl: string | null;
  pros: Pro[];
  isTestEvent: boolean;
  isSecret: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

// --- Helpers ---

function formatEventTime(startTime: string | null, endTime: string | null, tz: string | null): string {
  if (!startTime) return 'TBD';
  try {
    const start = new Date(startTime);
    const timeStr = format(start, 'h:mm a');
    if (endTime) {
      const end = new Date(endTime);
      return `${timeStr} - ${format(end, 'h:mm a')}${tz ? ` ${tz}` : ''}`;
    }
    return `${timeStr}${tz ? ` ${tz}` : ''}`;
  } catch {
    return 'TBD';
  }
}

function formatEventDate(startTime: string | null): string {
  if (!startTime) return 'TBD';
  try {
    return format(new Date(startTime), 'EEE, MMM d, yyyy');
  } catch {
    return 'TBD';
  }
}

function formatAddress(address: CoordinatorEventAddress | null, locationDesc: string | null): string {
  if (!address && !locationDesc) return 'No address';
  const parts: string[] = [];
  if (address?.street) parts.push(address.street);
  if (address?.city) parts.push(address.city);
  if (address?.state) parts.push(address.state);
  if (parts.length === 0 && locationDesc) return locationDesc;
  const result = parts.join(', ');
  return locationDesc ? `${result} (${locationDesc})` : result;
}

function getFillColor(pct: number): string {
  if (pct >= 90) return 'bg-green-500';
  if (pct >= 50) return 'bg-shortcut-teal';
  if (pct >= 25) return 'bg-shortcut-service-yellow';
  return 'bg-gray-300';
}

function formatProType(proType: string | null, hairProType: string | null): string {
  if (!proType) return '';
  const label = proType.charAt(0).toUpperCase() + proType.slice(1);
  if (proType === 'hair' && hairProType) {
    return `${hairProType.charAt(0).toUpperCase() + hairProType.slice(1)}`;
  }
  return label;
}

function getProTypeBadgeClass(proType: string | null): string {
  switch (proType?.toLowerCase()) {
    case 'massage': return 'bg-blue-100 text-blue-700';
    case 'hair': return 'bg-shortcut-service-yellow/30 text-[#09364f]';
    case 'nails': return 'bg-shortcut-pink/30 text-[#09364f]';
    case 'makeup': return 'bg-rose-100 text-rose-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

function getStatusBadge(status: string): { label: string; className: string } {
  switch (status.toLowerCase()) {
    case 'cancelled':
      return { label: 'Cancelled', className: 'bg-red-100 text-red-700' };
    case 'confirmed':
      return { label: 'Confirmed', className: 'bg-green-100 text-green-700' };
    case 'completed':
      return { label: 'Completed', className: 'bg-gray-100 text-gray-600' };
    case 'pending':
    default:
      return { label: 'Pending', className: 'bg-yellow-100 text-yellow-700' };
  }
}

// --- Component ---

const UpcomingEvents: React.FC = () => {
  const [events, setEvents] = useState<CoordinatorEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showTestEvents, setShowTestEvents] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({ scope: 'upcoming' });
      if (showTestEvents) params.set('includeTests', 'true');

      const response = await fetch(`/.netlify/functions/fetch-coordinator-events?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch events');
      }

      setEvents(result.events);
      setLastSynced(result.syncedAt);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch events';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [showTestEvents]);

  // Fetch on mount
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Filtered + sorted events
  const filteredEvents = useMemo(() => {
    return events.filter(evt => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesName = evt.name.toLowerCase().includes(term);
        const matchesSponsor = evt.sponsorName?.toLowerCase().includes(term);
        const matchesContact = evt.contactName?.toLowerCase().includes(term);
        if (!matchesName && !matchesSponsor && !matchesContact) return false;
      }
      if (statusFilter !== 'all' && evt.status.toLowerCase() !== statusFilter) return false;
      return true;
    });
  }, [events, searchTerm, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const active = events.filter(e => e.status.toLowerCase() !== 'cancelled');
    return {
      total: active.length,
      thisWeek: active.filter(e => {
        if (!e.startTime) return false;
        const diff = new Date(e.startTime).getTime() - Date.now();
        return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
      }).length,
      needsPros: active.filter(e => e.openProSpots > 0).length,
      avgFill: active.length
        ? Math.round(active.reduce((sum, e) => sum + e.fillPercentage, 0) / active.length)
        : 0,
    };
  }, [events]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-shortcut-navy-blue flex items-center gap-3">
            <CalendarCheck size={28} />
            Upcoming Events
            {events.length > 0 && (
              <span className="text-base font-medium bg-shortcut-teal/20 text-[#09364f] px-3 py-1 rounded-full">
                {events.length}
              </span>
            )}
          </h1>
          <p className="text-text-dark-60 mt-1">
            Events synced from Shortcut Coordinator
            {lastSynced && (
              <span className="ml-1">
                — last synced {formatDistanceToNow(new Date(lastSynced), { addSuffix: true })}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={fetchEvents}
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#9EFAFF] text-[#09364f] font-bold text-sm rounded-full hover:bg-[#FEDC64] disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-text-dark-60">Upcoming</p>
          <p className="text-2xl font-extrabold text-[#09364f]">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-text-dark-60">This Week</p>
          <p className="text-2xl font-extrabold text-[#09364f]">{stats.thisWeek}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-text-dark-60">Need Pros</p>
          <p className="text-2xl font-extrabold text-shortcut-coral">{stats.needsPros}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-text-dark-60">Avg Fill Rate</p>
          <p className="text-2xl font-extrabold text-green-600">{stats.avgFill}%</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#09364f] focus:border-[#09364f]"
          />
        </div>
        <div className="flex items-center gap-2">
          {['all', 'pending', 'confirmed', 'cancelled'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 text-xs font-bold rounded-lg transition-colors ${
                statusFilter === s
                  ? 'bg-[#09364f] text-white'
                  : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <button
            onClick={() => setShowTestEvents(!showTestEvents)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-colors ${
              showTestEvents
                ? 'bg-[#09364f] text-white'
                : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {showTestEvents ? <Eye size={14} /> : <EyeOff size={14} />}
            Test
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700">
          <AlertCircle size={16} />
          <span className="text-sm">{error}</span>
          <button onClick={fetchEvents} className="ml-auto text-sm font-bold underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && events.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={24} className="animate-spin text-text-dark-60 mr-3" />
          <span className="text-text-dark-60">Loading events from Coordinator...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredEvents.length === 0 && (
        <div className="text-center py-20">
          <Calendar size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-extrabold text-[#09364f]">No events found</p>
          <p className="text-sm text-text-dark-60 mt-1">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Click Sync Now to fetch events from Coordinator'}
          </p>
        </div>
      )}

      {/* Events List */}
      <div className="space-y-3">
        {filteredEvents.map(evt => {
          const isExpanded = expandedId === evt.coordinatorEventId;
          const statusBadge = getStatusBadge(evt.status);
          const isCancelled = evt.status.toLowerCase() === 'cancelled';

          return (
            <div
              key={evt.coordinatorEventId}
              className={`bg-white rounded-xl border border-gray-200 overflow-hidden transition-shadow hover:shadow-md ${
                isCancelled ? 'opacity-60' : ''
              }`}
            >
              {/* Main Row */}
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : evt.coordinatorEventId)}
              >
                {/* Date Column */}
                <div className="flex-shrink-0 w-20 text-center">
                  {evt.startTime ? (
                    <>
                      <p className="text-xs font-bold text-text-dark-60 uppercase">
                        {format(new Date(evt.startTime), 'EEE')}
                      </p>
                      <p className="text-lg font-extrabold text-[#09364f]">
                        {format(new Date(evt.startTime), 'MMM d')}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-text-dark-60">TBD</p>
                  )}
                </div>

                {/* Event Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-extrabold text-[#09364f] text-lg truncate ${isCancelled ? 'line-through' : ''}`}>
                      {evt.name}
                    </h3>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full ${statusBadge.className}`}>
                      {statusBadge.label}
                    </span>
                    {evt.isTestEvent && (
                      <span className="inline-flex px-2.5 py-0.5 text-xs font-bold rounded-full bg-purple-100 text-purple-700">
                        TEST
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-1 text-sm text-text-dark-60">
                    <span className="flex items-center gap-1">
                      <Clock size={13} />
                      {formatEventTime(evt.startTime, evt.endTime, evt.timezoneAbbreviation)}
                    </span>
                    <span className="flex items-center gap-1 truncate">
                      <MapPin size={13} />
                      {formatAddress(evt.address, evt.locationDescription)}
                    </span>
                  </div>
                </div>

                {/* Fill Rate */}
                <div className="flex-shrink-0 w-32 hidden md:block">
                  <div className="flex items-center justify-between text-xs text-text-dark-60 mb-1">
                    <span>Signups</span>
                    <span className="font-bold">{evt.filledSlots}/{evt.totalSlots}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${getFillColor(evt.fillPercentage)}`}
                      style={{ width: `${Math.min(evt.fillPercentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Pro Staffing */}
                <div className="flex-shrink-0 hidden md:flex items-center gap-1.5 text-sm">
                  <Users size={14} className="text-text-dark-60" />
                  <span className={`font-bold ${evt.openProSpots > 0 ? 'text-shortcut-coral' : 'text-green-600'}`}>
                    {evt.prosRequired - evt.openProSpots}/{evt.prosRequired}
                  </span>
                </div>

                {/* Expand Toggle */}
                <div className="flex-shrink-0">
                  {isExpanded ? <ChevronUp size={16} className="text-text-dark-60" /> : <ChevronDown size={16} className="text-text-dark-60" />}
                </div>
              </div>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-5 py-5 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Column 1: Event Details */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-text-dark-60 uppercase tracking-wider">Event Details</h4>
                      <div className="text-sm space-y-2">
                        <div>
                          <span className="text-text-dark-60">Date:</span>{' '}
                          <span className="text-text-dark font-medium">{formatEventDate(evt.startTime)}</span>
                        </div>
                        <div>
                          <span className="text-text-dark-60">Time:</span>{' '}
                          <span className="text-text-dark font-medium">{formatEventTime(evt.startTime, evt.endTime, evt.timezoneAbbreviation)}</span>
                        </div>
                        <div>
                          <span className="text-text-dark-60">Address:</span>{' '}
                          <span className="text-text-dark font-medium">{formatAddress(evt.address, evt.locationDescription)}</span>
                        </div>
                        {evt.contactName && (
                          <div>
                            <span className="text-text-dark-60">Contact:</span>{' '}
                            <span className="text-text-dark font-medium">{evt.contactName}{evt.contactPhone ? ` — ${evt.contactPhone}` : ''}</span>
                          </div>
                        )}
                        {evt.sponsorName && (
                          <div>
                            <span className="text-text-dark-60">Sponsor:</span>{' '}
                            <span className="text-text-dark font-medium">{evt.sponsorName}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Column 2: Staffing & Services */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-text-dark-60 uppercase tracking-wider">Staffing & Services</h4>
                      <div className="text-sm space-y-2">
                        <div>
                          <span className="text-text-dark-60">Signups:</span>{' '}
                          <span className="text-text-dark font-medium">
                            {evt.filledSlots} / {evt.totalSlots} ({evt.fillPercentage}%)
                            {evt.waitlistEntries > 0 && (
                              <span className="text-shortcut-coral ml-1">+{evt.waitlistEntries} waitlisted</span>
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="text-text-dark-60">Pros Needed:</span>{' '}
                          <span className={`font-medium ${evt.openProSpots > 0 ? 'text-shortcut-coral' : 'text-text-dark'}`}>
                            {evt.prosRequired - evt.openProSpots} assigned / {evt.prosRequired} needed
                            {evt.openProSpots > 0 && ` (${evt.openProSpots} open)`}
                          </span>
                        </div>
                        {evt.pros.length > 0 && (
                          <div>
                            <span className="text-text-dark-60">Assigned Pros:</span>
                            <div className="mt-1 space-y-1">
                              {evt.pros.map((pro, idx) => (
                                <div key={pro.id || idx} className="flex items-center gap-2">
                                  <span className="text-text-dark font-medium">{pro.fullName}</span>
                                  {pro.proType && (
                                    <span className={`inline-flex px-1.5 py-0.5 text-xs font-bold rounded-full ${getProTypeBadgeClass(pro.proType)}`}>
                                      {formatProType(pro.proType, pro.hairProType)}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {evt.proHourlyRate && (
                          <div>
                            <span className="text-text-dark-60">Pro Rate:</span>{' '}
                            <span className="text-text-dark font-medium">${evt.proHourlyRate}/hr</span>
                          </div>
                        )}
                        {evt.serviceOfferings.length > 0 && (
                          <div>
                            <span className="text-text-dark-60">Services:</span>{' '}
                            <span className="text-text-dark font-medium">
                              {evt.serviceOfferings.map(s => s.serviceTitle || 'Unknown').join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Column 3: Notes & Links */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-text-dark-60 uppercase tracking-wider">Notes & Links</h4>
                      <div className="text-sm space-y-2">
                        {evt.adminNotes && (
                          <div>
                            <span className="text-text-dark-60">Admin Notes:</span>{' '}
                            <span className="text-text-dark">{evt.adminNotes}</span>
                          </div>
                        )}
                        {evt.staffNotes && (
                          <div>
                            <span className="text-text-dark-60">Staff Notes:</span>{' '}
                            <span className="text-text-dark">{evt.staffNotes}</span>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 pt-1">
                          {evt.signupUrl && (
                            <a
                              href={evt.signupUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#9EFAFF] text-[#09364f] text-xs font-semibold rounded-full hover:bg-[#FEDC64] transition-colors"
                              onClick={e => e.stopPropagation()}
                            >
                              <ExternalLink size={12} />
                              Signup Page
                            </a>
                          )}
                          <a
                            href={`https://admin.shortcutpros.com/#/events/${evt.coordinatorEventId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 text-[#09364f] text-xs font-semibold rounded-full hover:bg-gray-300 transition-colors"
                            onClick={e => e.stopPropagation()}
                          >
                            <ExternalLink size={12} />
                            Coordinator
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UpcomingEvents;
