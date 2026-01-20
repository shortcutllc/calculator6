import React, { useState, useMemo } from 'react';
import { BabyProfile, TimelineEvent } from './types';

interface RosieInsightsProps {
  baby: BabyProfile;
  timeline: TimelineEvent[];
}

type TimePeriod = 'today' | 'week' | 'month';

// Helper to format duration for display
const formatDurationDisplay = (minutes: number): string => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0) {
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
  return `${mins}m`;
};

// Progress Ring Component
interface ProgressRingProps {
  value: number;
  maxValue: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  bgColor?: string;
  label: string;
  displayValue: string;
  subLabel?: string;
}

const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  maxValue,
  size = 120,
  strokeWidth = 12,
  color,
  bgColor = 'var(--rosie-fill-secondary)',
  label,
  displayValue,
  subLabel,
}) => {
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / maxValue, 1);
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="rosie-progress-ring-container">
      <svg width={size} height={size} className="rosie-progress-ring">
        {/* Background ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
          opacity={0.3}
        />
        {/* Progress ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${center} ${center})`}
          className="rosie-progress-ring-fill"
        />
      </svg>
      <div className="rosie-progress-ring-center">
        <div className="rosie-progress-ring-value">{displayValue}</div>
        <div className="rosie-progress-ring-label">{label}</div>
        {subLabel && <div className="rosie-progress-ring-sublabel">{subLabel}</div>}
      </div>
    </div>
  );
};

export const RosieInsights: React.FC<RosieInsightsProps> = ({ baby, timeline }) => {
  const [period, setPeriod] = useState<TimePeriod>('today');

  // Get date range based on period
  const dateRange = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (period) {
      case 'today':
        return { start: today, end: now };
      case 'week': {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return { start: weekAgo, end: now };
      }
      case 'month': {
        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 30);
        return { start: monthAgo, end: now };
      }
    }
  }, [period]);

  // Filter events by date range
  const filteredEvents = useMemo(() => {
    return timeline.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= dateRange.start && eventDate <= dateRange.end;
    });
  }, [timeline, dateRange]);

  // Calculate stats
  const stats = useMemo(() => {
    const feeds = filteredEvents.filter(e => e.type === 'feed');
    const sleeps = filteredEvents.filter(e => e.type === 'sleep');
    const diapers = filteredEvents.filter(e => e.type === 'diaper');

    // Feed stats
    const totalFeeds = feeds.length;
    const breastFeeds = feeds.filter(f => f.feedType === 'breast');
    const bottleFeeds = feeds.filter(f => f.feedType === 'bottle');
    const totalFeedMinutes = breastFeeds.reduce((sum, f) => sum + (f.feedDuration || 0), 0);
    const totalBottleOz = bottleFeeds.reduce((sum, f) => sum + (f.feedAmount || 0), 0);

    // Average feed duration for breast
    const avgFeedDuration = breastFeeds.length > 0
      ? Math.round(totalFeedMinutes / breastFeeds.length)
      : 0;

    // Sleep stats
    const totalSleepMinutes = sleeps.reduce((sum, s) => sum + (s.sleepDuration || 0), 0);
    const napCount = sleeps.filter(s => s.sleepType === 'nap').length;
    const nightSleeps = sleeps.filter(s => s.sleepType === 'night');
    const totalNightMinutes = nightSleeps.reduce((sum, s) => sum + (s.sleepDuration || 0), 0);
    const totalNapMinutes = totalSleepMinutes - totalNightMinutes;

    // Diaper stats
    const totalDiapers = diapers.length;
    const wetDiapers = diapers.filter(d => d.diaperType === 'wet' || d.diaperType === 'both').length;
    const dirtyDiapers = diapers.filter(d => d.diaperType === 'dirty' || d.diaperType === 'both').length;

    // Calculate daily averages for week/month views
    const days = period === 'today' ? 1 : period === 'week' ? 7 : 30;
    const avgFeedsPerDay = Math.round((totalFeeds / days) * 10) / 10;
    const avgSleepPerDay = Math.round(totalSleepMinutes / days);
    const avgDiapersPerDay = Math.round((totalDiapers / days) * 10) / 10;

    return {
      totalFeeds,
      breastFeedCount: breastFeeds.length,
      bottleFeedCount: bottleFeeds.length,
      totalFeedMinutes,
      totalBottleOz: Math.round(totalBottleOz * 10) / 10,
      avgFeedDuration,
      totalSleepMinutes,
      napCount,
      totalNapMinutes,
      totalNightMinutes,
      totalDiapers,
      wetDiapers,
      dirtyDiapers,
      avgFeedsPerDay,
      avgSleepPerDay,
      avgDiapersPerDay,
      days,
    };
  }, [filteredEvents, period]);

  // Expected values based on baby's age
  const expectedValues = useMemo(() => {
    const birth = new Date(baby.birthDate);
    const now = new Date();
    const ageInDays = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));

    // These are rough guidelines based on typical infant needs
    if (ageInDays < 14) {
      return {
        feedsPerDay: 10,
        sleepMinutesPerDay: 960, // 16 hours
        diapersPerDay: 10,
      };
    } else if (ageInDays < 60) {
      return {
        feedsPerDay: 8,
        sleepMinutesPerDay: 900, // 15 hours
        diapersPerDay: 8,
      };
    } else if (ageInDays < 120) {
      return {
        feedsPerDay: 7,
        sleepMinutesPerDay: 840, // 14 hours
        diapersPerDay: 7,
      };
    } else {
      return {
        feedsPerDay: 6,
        sleepMinutesPerDay: 780, // 13 hours
        diapersPerDay: 6,
      };
    }
  }, [baby.birthDate]);

  // Scale expected values by period
  const scaledExpected = {
    feeds: expectedValues.feedsPerDay * stats.days,
    sleepMinutes: expectedValues.sleepMinutesPerDay * stats.days,
    diapers: expectedValues.diapersPerDay * stats.days,
  };

  return (
    <div className="rosie-insights">
      {/* Period Selector */}
      <div className="rosie-insights-period-selector">
        <button
          className={`rosie-insights-period-btn ${period === 'today' ? 'active' : ''}`}
          onClick={() => setPeriod('today')}
        >
          Today
        </button>
        <button
          className={`rosie-insights-period-btn ${period === 'week' ? 'active' : ''}`}
          onClick={() => setPeriod('week')}
        >
          7 Days
        </button>
        <button
          className={`rosie-insights-period-btn ${period === 'month' ? 'active' : ''}`}
          onClick={() => setPeriod('month')}
        >
          30 Days
        </button>
      </div>

      {/* Main Stats Rings */}
      <div className="rosie-insights-rings">
        <ProgressRing
          value={stats.totalFeeds}
          maxValue={scaledExpected.feeds}
          size={110}
          strokeWidth={10}
          color="#FF9F0A"
          label="Feeds"
          displayValue={stats.totalFeeds.toString()}
          subLabel={period !== 'today' ? `${stats.avgFeedsPerDay}/day` : undefined}
        />
        <ProgressRing
          value={stats.totalSleepMinutes}
          maxValue={scaledExpected.sleepMinutes}
          size={110}
          strokeWidth={10}
          color="#AF52DE"
          label="Sleep"
          displayValue={formatDurationDisplay(stats.totalSleepMinutes)}
          subLabel={period !== 'today' ? `${formatDurationDisplay(stats.avgSleepPerDay)}/day` : undefined}
        />
        <ProgressRing
          value={stats.totalDiapers}
          maxValue={scaledExpected.diapers}
          size={110}
          strokeWidth={10}
          color="#30D158"
          label="Diapers"
          displayValue={stats.totalDiapers.toString()}
          subLabel={period !== 'today' ? `${stats.avgDiapersPerDay}/day` : undefined}
        />
      </div>

      {/* Detailed Stats Cards */}
      <div className="rosie-insights-cards">
        {/* Feeding Details */}
        <div className="rosie-insights-card feed">
          <div className="rosie-insights-card-header">
            <span className="rosie-insights-card-icon">🍼</span>
            <h3 className="rosie-insights-card-title">Feeding</h3>
          </div>
          <div className="rosie-insights-card-stats">
            {stats.breastFeedCount > 0 && (
              <div className="rosie-insights-stat">
                <span className="rosie-insights-stat-value">{stats.breastFeedCount}</span>
                <span className="rosie-insights-stat-label">Breastfeeds</span>
              </div>
            )}
            {stats.bottleFeedCount > 0 && (
              <div className="rosie-insights-stat">
                <span className="rosie-insights-stat-value">{stats.bottleFeedCount}</span>
                <span className="rosie-insights-stat-label">Bottles</span>
              </div>
            )}
            {stats.totalFeedMinutes > 0 && (
              <div className="rosie-insights-stat">
                <span className="rosie-insights-stat-value">{formatDurationDisplay(stats.totalFeedMinutes)}</span>
                <span className="rosie-insights-stat-label">Total Time</span>
              </div>
            )}
            {stats.totalBottleOz > 0 && (
              <div className="rosie-insights-stat">
                <span className="rosie-insights-stat-value">{stats.totalBottleOz} oz</span>
                <span className="rosie-insights-stat-label">Bottle Total</span>
              </div>
            )}
            {stats.avgFeedDuration > 0 && (
              <div className="rosie-insights-stat">
                <span className="rosie-insights-stat-value">{stats.avgFeedDuration}m</span>
                <span className="rosie-insights-stat-label">Avg Duration</span>
              </div>
            )}
          </div>
        </div>

        {/* Sleep Details */}
        <div className="rosie-insights-card sleep">
          <div className="rosie-insights-card-header">
            <span className="rosie-insights-card-icon">💤</span>
            <h3 className="rosie-insights-card-title">Sleep</h3>
          </div>
          <div className="rosie-insights-card-stats">
            <div className="rosie-insights-stat">
              <span className="rosie-insights-stat-value">{stats.napCount}</span>
              <span className="rosie-insights-stat-label">Naps</span>
            </div>
            {stats.totalNapMinutes > 0 && (
              <div className="rosie-insights-stat">
                <span className="rosie-insights-stat-value">{formatDurationDisplay(stats.totalNapMinutes)}</span>
                <span className="rosie-insights-stat-label">Nap Time</span>
              </div>
            )}
            {stats.totalNightMinutes > 0 && (
              <div className="rosie-insights-stat">
                <span className="rosie-insights-stat-value">{formatDurationDisplay(stats.totalNightMinutes)}</span>
                <span className="rosie-insights-stat-label">Night Sleep</span>
              </div>
            )}
          </div>
        </div>

        {/* Diaper Details */}
        <div className="rosie-insights-card diaper">
          <div className="rosie-insights-card-header">
            <span className="rosie-insights-card-icon">🧷</span>
            <h3 className="rosie-insights-card-title">Diapers</h3>
          </div>
          <div className="rosie-insights-card-stats">
            <div className="rosie-insights-stat">
              <span className="rosie-insights-stat-value">{stats.wetDiapers}</span>
              <span className="rosie-insights-stat-label">Wet</span>
            </div>
            <div className="rosie-insights-stat">
              <span className="rosie-insights-stat-value">{stats.dirtyDiapers}</span>
              <span className="rosie-insights-stat-label">Dirty</span>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredEvents.length === 0 && (
        <div className="rosie-insights-empty">
          <div className="rosie-insights-empty-icon">📊</div>
          <p className="rosie-insights-empty-text">No data for this period</p>
          <p className="rosie-insights-empty-hint">Start tracking to see insights here</p>
        </div>
      )}
    </div>
  );
};

export default RosieInsights;
