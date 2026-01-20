import React, { useState, useMemo } from 'react';
import { TimelineEvent, BabyProfile } from './types';
import { formatTimeAgo, formatTime } from './developmentalData';

type FilterType = 'all' | 'feed' | 'sleep' | 'diaper';

interface RosieTimelineProps {
  events: TimelineEvent[];
  baby: BabyProfile;
  onDeleteEvent?: (eventId: string) => void;
}

// Helper to get start of day for a date
const getStartOfDay = (date: Date): Date => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

// Helper to check if two dates are the same day
const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.toDateString() === date2.toDateString();
};

// Format date for display
const formatDateDisplay = (date: Date): string => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(date, today)) {
    return 'Today';
  } else if (isSameDay(date, yesterday)) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }
};

export const RosieTimeline: React.FC<RosieTimelineProps> = ({ events, baby, onDeleteEvent }) => {
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Check if viewing today
  const isToday = useMemo(() => isSameDay(selectedDate, new Date()), [selectedDate]);

  // Get events for the selected date
  const eventsForSelectedDate = useMemo(() => {
    return events.filter(e => isSameDay(new Date(e.timestamp), selectedDate));
  }, [events, selectedDate]);

  // Filter events based on active filter AND selected date
  const filteredEvents = useMemo(() => {
    let filtered = eventsForSelectedDate;
    if (activeFilter !== 'all') {
      filtered = filtered.filter(e => e.type === activeFilter);
    }
    return filtered;
  }, [eventsForSelectedDate, activeFilter]);

  // Calculate daily stats for selected date
  const dailyStats = useMemo(() => {
    const dayEvents = eventsForSelectedDate;

    const feedEvents = dayEvents.filter(e => e.type === 'feed');
    const sleepEvents = dayEvents.filter(e => e.type === 'sleep');
    const diaperEvents = dayEvents.filter(e => e.type === 'diaper');

    // Total feed time in minutes
    const totalFeedMinutes = feedEvents.reduce((sum, e) => sum + (e.feedDuration || 0), 0);
    // Total sleep time in minutes
    const totalSleepMinutes = sleepEvents.reduce((sum, e) => sum + (e.sleepDuration || 0), 0);

    return {
      feedCount: feedEvents.length,
      totalFeedMinutes,
      sleepCount: sleepEvents.length,
      totalSleepMinutes,
      diaperCount: diaperEvents.length,
      wetCount: diaperEvents.filter(e => e.diaperType === 'wet' || e.diaperType === 'both').length,
      dirtyCount: diaperEvents.filter(e => e.diaperType === 'dirty' || e.diaperType === 'both').length,
    };
  }, [eventsForSelectedDate]);

  // Navigate to previous day
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  // Navigate to next day
  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    // Don't go past today
    if (newDate <= new Date()) {
      setSelectedDate(newDate);
    }
  };

  // Go to today
  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Toggle filter when clicking summary cards
  const handleFilterClick = (type: FilterType) => {
    setActiveFilter(current => current === type ? 'all' : type);
  };

  // Get last event of each type (for "today" view)
  const getLastEvent = (type: TimelineEvent['type']): TimelineEvent | undefined => {
    return events.find(e => e.type === type);
  };

  const lastFeed = getLastEvent('feed');
  const lastSleep = getLastEvent('sleep');
  const lastDiaper = getLastEvent('diaper');

  // Format duration for daily stats
  const formatDurationStats = (minutes: number): string => {
    if (minutes === 0) return '0m';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
    }
    return `${mins}m`;
  };

  const getEventIcon = (type: TimelineEvent['type']): string => {
    switch (type) {
      case 'feed': return '🍼';
      case 'sleep': return '💤';
      case 'diaper': return '🧷';
      case 'note': return '📝';
      default: return '•';
    }
  };

  const getEventTypeName = (event: TimelineEvent): string => {
    switch (event.type) {
      case 'feed':
        if (event.feedType === 'breast') return 'Breastfeed';
        if (event.feedType === 'bottle') return 'Bottle feed';
        if (event.feedType === 'solid') return 'Solid food';
        return 'Feed';
      case 'sleep':
        return event.sleepType === 'nap' ? 'Nap' : 'Night sleep';
      case 'diaper':
        if (event.diaperType === 'wet') return 'Wet diaper';
        if (event.diaperType === 'dirty') return 'Dirty diaper';
        if (event.diaperType === 'both') return 'Wet + Dirty';
        return 'Diaper';
      case 'note':
        return 'Note';
      default:
        return 'Event';
    }
  };

  const getEventDetails = (event: TimelineEvent): string => {
    const details: string[] = [];

    if (event.type === 'feed') {
      if (event.feedAmount) details.push(`${event.feedAmount}oz`);
      if (event.feedDuration) details.push(`${event.feedDuration}min`);
      if (event.feedSide && event.feedType === 'breast') {
        details.push(event.feedSide === 'both' ? 'Both sides' : `${event.feedSide} side`);
      }
    }

    if (event.type === 'sleep') {
      if (event.sleepDuration) {
        const hours = Math.floor(event.sleepDuration / 60);
        const mins = event.sleepDuration % 60;
        if (hours > 0) {
          details.push(`${hours}h ${mins > 0 ? `${mins}m` : ''}`);
        } else {
          details.push(`${mins}m`);
        }
      }
      if (event.sleepQuality) {
        details.push(`Quality: ${event.sleepQuality}`);
      }
    }

    return details.join(' • ');
  };

  const getSummaryDetail = (event: TimelineEvent | undefined): string => {
    if (!event) return '';

    if (event.type === 'feed') {
      const parts: string[] = [];
      if (event.feedType === 'breast') parts.push('Breast');
      if (event.feedType === 'bottle') parts.push('Bottle');
      if (event.feedType === 'solid') parts.push('Solid');
      if (event.feedAmount) parts.push(`${event.feedAmount}oz`);
      return parts.join(', ');
    }

    if (event.type === 'sleep') {
      const parts: string[] = [];
      if (event.sleepType === 'nap') parts.push('Nap');
      else parts.push('Night');
      if (event.sleepDuration) {
        const hours = Math.floor(event.sleepDuration / 60);
        const mins = event.sleepDuration % 60;
        if (hours > 0) {
          parts.push(`${hours}h${mins > 0 ? ` ${mins}m` : ''}`);
        } else {
          parts.push(`${mins}m`);
        }
      }
      return parts.join(', ');
    }

    if (event.type === 'diaper') {
      if (event.diaperType === 'wet') return 'Wet';
      if (event.diaperType === 'dirty') return 'Poop';
      if (event.diaperType === 'both') return 'Wet + Poop';
    }

    return '';
  };

  // Format duration for display
  const formatDurationDisplay = (minutes: number): string => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
    }
    return `${mins}m`;
  };

  // Format time range for detail modal
  const formatTimeRange = (startTime?: string, endTime?: string): string => {
    if (!startTime) return '';
    const start = new Date(startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (!endTime) return start;
    const end = new Date(endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `${start} → ${end}`;
  };

  const handleEventClick = (event: TimelineEvent) => {
    setSelectedEvent(event);
    setShowDeleteConfirm(false);
  };

  const closeDetailModal = () => {
    setSelectedEvent(null);
    setShowDeleteConfirm(false);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (selectedEvent && onDeleteEvent) {
      onDeleteEvent(selectedEvent.id);
      closeDetailModal();
    }
  };

  return (
    <div className="rosie-timeline">
      {/* Date Navigator */}
      <div className="rosie-date-navigator">
        <button
          className="rosie-date-nav-btn"
          onClick={goToPreviousDay}
          aria-label="Previous day"
        >
          ‹
        </button>
        <div className="rosie-date-nav-center">
          <span className="rosie-date-nav-label">{formatDateDisplay(selectedDate)}</span>
          {!isToday && (
            <button className="rosie-date-nav-today" onClick={goToToday}>
              Back to Today
            </button>
          )}
        </div>
        <button
          className="rosie-date-nav-btn"
          onClick={goToNextDay}
          disabled={isToday}
          aria-label="Next day"
        >
          ›
        </button>
      </div>

      {/* Summary Cards - Show "last" for today, or daily totals for past days */}
      <div className="rosie-summary-grid">
        <div
          className={`rosie-summary-card feed ${activeFilter === 'feed' ? 'active' : ''}`}
          onClick={() => handleFilterClick('feed')}
          role="button"
          tabIndex={0}
        >
          <div className="rosie-summary-icon">🍼</div>
          {isToday ? (
            <>
              <div className="rosie-summary-label">Last feed</div>
              {lastFeed ? (
                <>
                  <div className="rosie-summary-time">{formatTimeAgo(lastFeed.timestamp)}</div>
                  <div className="rosie-summary-detail">{getSummaryDetail(lastFeed)}</div>
                </>
              ) : (
                <div className="rosie-summary-empty">No feeds yet</div>
              )}
            </>
          ) : (
            <>
              <div className="rosie-summary-label">Feeds</div>
              <div className="rosie-summary-time">{dailyStats.feedCount}</div>
              <div className="rosie-summary-detail">
                {dailyStats.totalFeedMinutes > 0 ? formatDurationStats(dailyStats.totalFeedMinutes) : 'None logged'}
              </div>
            </>
          )}
          {activeFilter === 'feed' && <div className="rosie-summary-filter-badge">Filtered</div>}
        </div>

        <div
          className={`rosie-summary-card sleep ${activeFilter === 'sleep' ? 'active' : ''}`}
          onClick={() => handleFilterClick('sleep')}
          role="button"
          tabIndex={0}
        >
          <div className="rosie-summary-icon">💤</div>
          {isToday ? (
            <>
              <div className="rosie-summary-label">Last sleep</div>
              {lastSleep ? (
                <>
                  <div className="rosie-summary-time">{formatTimeAgo(lastSleep.timestamp)}</div>
                  <div className="rosie-summary-detail">{getSummaryDetail(lastSleep)}</div>
                </>
              ) : (
                <div className="rosie-summary-empty">No sleep yet</div>
              )}
            </>
          ) : (
            <>
              <div className="rosie-summary-label">Sleep</div>
              <div className="rosie-summary-time">{dailyStats.sleepCount}</div>
              <div className="rosie-summary-detail">
                {dailyStats.totalSleepMinutes > 0 ? formatDurationStats(dailyStats.totalSleepMinutes) : 'None logged'}
              </div>
            </>
          )}
          {activeFilter === 'sleep' && <div className="rosie-summary-filter-badge">Filtered</div>}
        </div>

        <div
          className={`rosie-summary-card diaper ${activeFilter === 'diaper' ? 'active' : ''}`}
          onClick={() => handleFilterClick('diaper')}
          role="button"
          tabIndex={0}
        >
          <div className="rosie-summary-icon">🧷</div>
          {isToday ? (
            <>
              <div className="rosie-summary-label">Last diaper</div>
              {lastDiaper ? (
                <>
                  <div className="rosie-summary-time">{formatTimeAgo(lastDiaper.timestamp)}</div>
                  <div className="rosie-summary-detail">{getSummaryDetail(lastDiaper)}</div>
                </>
              ) : (
                <div className="rosie-summary-empty">No diapers yet</div>
              )}
            </>
          ) : (
            <>
              <div className="rosie-summary-label">Diapers</div>
              <div className="rosie-summary-time">{dailyStats.diaperCount}</div>
              <div className="rosie-summary-detail">
                {dailyStats.diaperCount > 0
                  ? `${dailyStats.wetCount} wet, ${dailyStats.dirtyCount} dirty`
                  : 'None logged'}
              </div>
            </>
          )}
          {activeFilter === 'diaper' && <div className="rosie-summary-filter-badge">Filtered</div>}
        </div>
      </div>

      {/* Filter indicator */}
      {activeFilter !== 'all' && (
        <div className="rosie-filter-indicator">
          <span>Showing {activeFilter} entries only</span>
          <button
            className="rosie-filter-clear"
            onClick={() => setActiveFilter('all')}
          >
            Clear
          </button>
        </div>
      )}

      {/* Timeline Events for Selected Date */}
      {filteredEvents.length === 0 ? (
        <div className="rosie-timeline-empty">
          <div className="rosie-timeline-empty-icon">📋</div>
          <div className="rosie-timeline-empty-text">
            {isToday ? 'No events logged yet' : `No events on ${formatDateDisplay(selectedDate)}`}
          </div>
          <div className="rosie-timeline-empty-hint">
            {isToday
              ? `Tap the buttons below to log ${baby.name}'s first feed, sleep, or diaper`
              : 'Use the arrows above to navigate to other days'}
          </div>
        </div>
      ) : (
        <div>
          {filteredEvents.map(event => (
            <div
              key={event.id}
              className={`rosie-event clickable ${event.type}`}
              onClick={() => handleEventClick(event)}
              role="button"
              tabIndex={0}
            >
              <div className={`rosie-event-icon ${event.type}`}>
                {getEventIcon(event.type)}
              </div>
              <div className="rosie-event-content">
                <div className="rosie-event-header">
                  <span className="rosie-event-time">{formatTime(event.timestamp)}</span>
                  <span className="rosie-event-type">{getEventTypeName(event)}</span>
                </div>
                {getEventDetails(event) && (
                  <div className="rosie-event-details">{getEventDetails(event)}</div>
                )}
                {event.note && (
                  <div className="rosie-event-note">{event.note}</div>
                )}
              </div>
              <span className="rosie-event-chevron">›</span>
            </div>
          ))}
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="rosie-modal-overlay" onClick={closeDetailModal}>
          <div className={`rosie-modal rosie-event-detail ${selectedEvent.type}`} onClick={e => e.stopPropagation()}>
            {!showDeleteConfirm ? (
              <>
                <div className="rosie-event-detail-header">
                  <div className={`rosie-event-detail-icon ${selectedEvent.type}`}>
                    {getEventIcon(selectedEvent.type)}
                  </div>
                  <div className="rosie-event-detail-info">
                    <div className="rosie-event-detail-type">{getEventTypeName(selectedEvent)}</div>
                    <div className="rosie-event-detail-time">
                      {new Date(selectedEvent.timestamp).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })} at {formatTime(selectedEvent.timestamp)}
                    </div>
                  </div>
                </div>

                <div className="rosie-event-detail-body">
                  {/* Feed Details */}
                  {selectedEvent.type === 'feed' && (
                    <>
                      <div className="rosie-event-detail-row">
                        <span className="rosie-event-detail-label">Type</span>
                        <span className="rosie-event-detail-value">
                          {selectedEvent.feedType === 'breast' ? 'Breastfeed' :
                           selectedEvent.feedType === 'bottle' ? 'Bottle' : 'Solid food'}
                        </span>
                      </div>
                      {selectedEvent.feedDuration && (
                        <div className="rosie-event-detail-row">
                          <span className="rosie-event-detail-label">Duration</span>
                          <span className="rosie-event-detail-value">
                            {formatDurationDisplay(selectedEvent.feedDuration)}
                          </span>
                        </div>
                      )}
                      {selectedEvent.feedType === 'breast' && selectedEvent.feedLeftDuration !== undefined && (
                        <div className="rosie-event-detail-row">
                          <span className="rosie-event-detail-label">Left side</span>
                          <span className="rosie-event-detail-value">
                            {formatDurationDisplay(selectedEvent.feedLeftDuration)}
                          </span>
                        </div>
                      )}
                      {selectedEvent.feedType === 'breast' && selectedEvent.feedRightDuration !== undefined && (
                        <div className="rosie-event-detail-row">
                          <span className="rosie-event-detail-label">Right side</span>
                          <span className="rosie-event-detail-value">
                            {formatDurationDisplay(selectedEvent.feedRightDuration)}
                          </span>
                        </div>
                      )}
                      {selectedEvent.feedAmount && (
                        <div className="rosie-event-detail-row">
                          <span className="rosie-event-detail-label">Amount</span>
                          <span className="rosie-event-detail-value">{selectedEvent.feedAmount} oz</span>
                        </div>
                      )}
                      {selectedEvent.startTime && (
                        <div className="rosie-event-detail-row">
                          <span className="rosie-event-detail-label">Time</span>
                          <span className="rosie-event-detail-value">
                            {formatTimeRange(selectedEvent.startTime, selectedEvent.endTime)}
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Sleep Details */}
                  {selectedEvent.type === 'sleep' && (
                    <>
                      <div className="rosie-event-detail-row">
                        <span className="rosie-event-detail-label">Type</span>
                        <span className="rosie-event-detail-value">
                          {selectedEvent.sleepType === 'nap' ? 'Nap' : 'Night sleep'}
                        </span>
                      </div>
                      {selectedEvent.sleepDuration && (
                        <div className="rosie-event-detail-row">
                          <span className="rosie-event-detail-label">Duration</span>
                          <span className="rosie-event-detail-value">
                            {formatDurationDisplay(selectedEvent.sleepDuration)}
                          </span>
                        </div>
                      )}
                      {selectedEvent.sleepQuality && (
                        <div className="rosie-event-detail-row">
                          <span className="rosie-event-detail-label">Quality</span>
                          <span className="rosie-event-detail-value">
                            {selectedEvent.sleepQuality.charAt(0).toUpperCase() + selectedEvent.sleepQuality.slice(1)}
                          </span>
                        </div>
                      )}
                      {selectedEvent.startTime && (
                        <div className="rosie-event-detail-row">
                          <span className="rosie-event-detail-label">Time</span>
                          <span className="rosie-event-detail-value">
                            {formatTimeRange(selectedEvent.startTime, selectedEvent.endTime)}
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Diaper Details */}
                  {selectedEvent.type === 'diaper' && (
                    <div className="rosie-event-detail-row">
                      <span className="rosie-event-detail-label">Type</span>
                      <span className="rosie-event-detail-value">
                        {selectedEvent.diaperType === 'wet' ? 'Wet (pee only)' :
                         selectedEvent.diaperType === 'dirty' ? 'Dirty (poop)' : 'Wet + Dirty (both)'}
                      </span>
                    </div>
                  )}

                  {/* Note */}
                  {selectedEvent.note && (
                    <div className="rosie-event-detail-note">
                      {selectedEvent.note}
                    </div>
                  )}
                </div>

                <div className="rosie-event-detail-actions">
                  {onDeleteEvent && (
                    <button className="rosie-btn-danger" onClick={handleDeleteClick}>
                      Delete
                    </button>
                  )}
                  <button className="rosie-btn-close" onClick={closeDetailModal}>
                    Close
                  </button>
                </div>
              </>
            ) : (
              /* Delete Confirmation */
              <div className="rosie-confirm-delete">
                <div className="rosie-confirm-delete-icon">🗑️</div>
                <div className="rosie-confirm-delete-title">Delete this entry?</div>
                <div className="rosie-confirm-delete-text">
                  This will permanently remove this {selectedEvent.type} log from {baby.name}'s timeline.
                  This action cannot be undone.
                </div>
                <div className="rosie-confirm-delete-actions">
                  <button className="rosie-btn-close" onClick={() => setShowDeleteConfirm(false)}>
                    Cancel
                  </button>
                  <button className="rosie-btn-danger" onClick={handleConfirmDelete}>
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RosieTimeline;
