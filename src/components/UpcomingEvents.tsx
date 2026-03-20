import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  RefreshCw, Calendar, MapPin, Clock, Users, ExternalLink,
  Search, ChevronDown, ChevronUp, AlertCircle, CheckCircle,
  XCircle, Filter, Eye, EyeOff
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
  if (pct >= 50) return 'bg-blue-500';
  if (pct >= 25) return 'bg-yellow-500';
  return 'bg-gray-300';
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
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Upcoming Events</h1>
          <p className="text-sm text-gray-500 mt-1">
            Events synced from Shortcut Coordinator
            {lastSynced && (
              <span className="ml-2">
                — last synced {formatDistanceToNow(new Date(lastSynced), { addSuffix: true })}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={fetchEvents}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#4A7B7D] text-white rounded-lg hover:bg-[#3d6566] disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Upcoming</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">This Week</p>
          <p className="text-2xl font-bold text-blue-600">{stats.thisWeek}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Need Pros</p>
          <p className="text-2xl font-bold text-orange-600">{stats.needsPros}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Avg Fill Rate</p>
          <p className="text-2xl font-bold text-green-600">{stats.avgFill}%</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4A7B7D] focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4A7B7D]"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button
          onClick={() => setShowTestEvents(!showTestEvents)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
            showTestEvents
              ? 'bg-gray-100 border-gray-400 text-gray-700'
              : 'border-gray-300 text-gray-500 hover:bg-gray-50'
          }`}
        >
          {showTestEvents ? <Eye size={14} /> : <EyeOff size={14} />}
          Test Events
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle size={16} />
          <span className="text-sm">{error}</span>
          <button onClick={fetchEvents} className="ml-auto text-sm underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && events.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={24} className="animate-spin text-gray-400 mr-3" />
          <span className="text-gray-500">Loading events from Coordinator...</span>
        </div>
      )}

      {/* Events List */}
      {!loading && filteredEvents.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <Calendar size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium">No events found</p>
          <p className="text-sm">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Click Sync Now to fetch events from Coordinator'}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {filteredEvents.map(evt => {
          const isExpanded = expandedId === evt.coordinatorEventId;
          const statusBadge = getStatusBadge(evt.status);
          const isCancelled = evt.status.toLowerCase() === 'cancelled';

          return (
            <div
              key={evt.coordinatorEventId}
              className={`bg-white rounded-lg border border-gray-200 overflow-hidden transition-shadow hover:shadow-md ${
                isCancelled ? 'opacity-60' : ''
              }`}
            >
              {/* Main Row */}
              <div
                className="flex items-center gap-4 px-4 py-3 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : evt.coordinatorEventId)}
              >
                {/* Date Column */}
                <div className="flex-shrink-0 w-20 text-center">
                  {evt.startTime ? (
                    <>
                      <p className="text-xs font-medium text-gray-500 uppercase">
                        {format(new Date(evt.startTime), 'EEE')}
                      </p>
                      <p className="text-lg font-bold text-gray-900">
                        {format(new Date(evt.startTime), 'MMM d')}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">TBD</p>
                  )}
                </div>

                {/* Event Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-semibold text-gray-900 truncate ${isCancelled ? 'line-through' : ''}`}>
                      {evt.name}
                    </h3>
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${statusBadge.className}`}>
                      {statusBadge.label}
                    </span>
                    {evt.isTestEvent && (
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                        TEST
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
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
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Signups</span>
                    <span>{evt.filledSlots}/{evt.totalSlots}</span>
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
                  <Users size={14} className="text-gray-400" />
                  <span className={evt.openProSpots > 0 ? 'text-orange-600 font-medium' : 'text-green-600'}>
                    {evt.prosRequired - evt.openProSpots}/{evt.prosRequired}
                  </span>
                </div>

                {/* Expand Toggle */}
                <div className="flex-shrink-0">
                  {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>
              </div>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Column 1: Event Details */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Event Details</h4>
                      <div className="text-sm space-y-2">
                        <div>
                          <span className="text-gray-500">Date:</span>{' '}
                          <span className="text-gray-900">{formatEventDate(evt.startTime)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Time:</span>{' '}
                          <span className="text-gray-900">{formatEventTime(evt.startTime, evt.endTime, evt.timezoneAbbreviation)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Address:</span>{' '}
                          <span className="text-gray-900">{formatAddress(evt.address, evt.locationDescription)}</span>
                        </div>
                        {evt.contactName && (
                          <div>
                            <span className="text-gray-500">Contact:</span>{' '}
                            <span className="text-gray-900">{evt.contactName}{evt.contactPhone ? ` — ${evt.contactPhone}` : ''}</span>
                          </div>
                        )}
                        {evt.sponsorName && (
                          <div>
                            <span className="text-gray-500">Sponsor:</span>{' '}
                            <span className="text-gray-900">{evt.sponsorName}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Column 2: Staffing & Services */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Staffing & Services</h4>
                      <div className="text-sm space-y-2">
                        <div>
                          <span className="text-gray-500">Signups:</span>{' '}
                          <span className="text-gray-900">
                            {evt.filledSlots} / {evt.totalSlots} ({evt.fillPercentage}%)
                            {evt.waitlistEntries > 0 && (
                              <span className="text-orange-600 ml-1">+{evt.waitlistEntries} waitlisted</span>
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Pros:</span>{' '}
                          <span className={evt.openProSpots > 0 ? 'text-orange-600 font-medium' : 'text-gray-900'}>
                            {evt.prosRequired - evt.openProSpots} assigned / {evt.prosRequired} needed
                            {evt.openProSpots > 0 && ` (${evt.openProSpots} open)`}
                          </span>
                        </div>
                        {evt.proHourlyRate && (
                          <div>
                            <span className="text-gray-500">Pro Rate:</span>{' '}
                            <span className="text-gray-900">${evt.proHourlyRate}/hr</span>
                          </div>
                        )}
                        {evt.serviceOfferings.length > 0 && (
                          <div>
                            <span className="text-gray-500">Services:</span>{' '}
                            <span className="text-gray-900">
                              {evt.serviceOfferings.map(s => s.serviceTitle || 'Unknown').join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Column 3: Notes & Links */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Notes & Links</h4>
                      <div className="text-sm space-y-2">
                        {evt.adminNotes && (
                          <div>
                            <span className="text-gray-500">Admin Notes:</span>{' '}
                            <span className="text-gray-900">{evt.adminNotes}</span>
                          </div>
                        )}
                        {evt.staffNotes && (
                          <div>
                            <span className="text-gray-500">Staff Notes:</span>{' '}
                            <span className="text-gray-900">{evt.staffNotes}</span>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 pt-1">
                          {evt.signupUrl && (
                            <a
                              href={evt.signupUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#4A7B7D] text-white text-xs rounded hover:bg-[#3d6566] transition-colors"
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
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 transition-colors"
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
