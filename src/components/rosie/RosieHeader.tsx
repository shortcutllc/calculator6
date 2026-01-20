import React, { useState, useEffect } from 'react';
import { BabyProfile, DevelopmentalInfo } from './types';

// Time period for ambient theming
export type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'night';

// Get the current time period
export const getTimePeriod = (hour: number): TimePeriod => {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'night';
};

// Get greeting based on time of day
const getGreeting = (period: TimePeriod): string => {
  switch (period) {
    case 'morning': return 'Good morning';
    case 'afternoon': return 'Good afternoon';
    case 'evening': return 'Good evening';
    case 'night': return 'Good night';
  }
};

// Get supportive subtext based on time and context
const getSupportiveText = (period: TimePeriod, babyName: string): string => {
  switch (period) {
    case 'morning':
      return `Here's how ${babyName}'s day is starting`;
    case 'afternoon':
      return `Here's how ${babyName}'s day is going`;
    case 'evening':
      return `Winding down with ${babyName}`;
    case 'night':
      return `You're doing amazing`;
  }
};

interface RosieHeaderProps {
  baby: BabyProfile;
  developmentalInfo: DevelopmentalInfo;
  onTimePeriodChange?: (period: TimePeriod) => void;
  onProfileClick?: () => void;
}

export const RosieHeader: React.FC<RosieHeaderProps> = ({ baby, developmentalInfo, onTimePeriodChange, onProfileClick }) => {
  const { ageDisplay, weekNumber, ageInDays } = developmentalInfo;
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(() => getTimePeriod(new Date().getHours()));

  // Update time every minute
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now);
      const newPeriod = getTimePeriod(now.getHours());
      if (newPeriod !== timePeriod) {
        setTimePeriod(newPeriod);
        onTimePeriodChange?.(newPeriod);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [timePeriod, onTimePeriodChange]);

  // Notify parent of initial time period
  useEffect(() => {
    onTimePeriodChange?.(timePeriod);
  }, []);

  // Format time (e.g., "1:45 PM")
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Format date (e.g., "Monday, January 20")
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  // Format a friendly day display
  const getDayText = () => {
    if (ageInDays === 0) return 'Born today';
    if (ageInDays === 1) return 'Day 1';
    return `Day ${ageInDays}`;
  };

  const greeting = getGreeting(timePeriod);
  const supportiveText = getSupportiveText(timePeriod, baby.name);

  return (
    <header className={`rosie-header ${timePeriod}`}>
      <div className="rosie-header-content">
        {/* Profile Button - Top Right */}
        {onProfileClick && (
          <button
            className={`rosie-header-profile-btn ${baby.avatarType === 'image' && baby.avatarImage ? 'has-image' : ''}`}
            onClick={onProfileClick}
            aria-label="Open profile"
          >
            {baby.avatarType === 'image' && baby.avatarImage ? (
              <img src={baby.avatarImage} alt={`${baby.name}'s photo`} />
            ) : (
              baby.avatarEmoji || '👶'
            )}
          </button>
        )}

        {/* Time & Date - Apple Lock Screen style */}
        <div className="rosie-header-datetime">
          <div className="rosie-header-time">{formatTime(currentTime)}</div>
          <div className="rosie-header-date">{formatDate(currentTime)}</div>
        </div>

        {/* Greeting & Welcome Message */}
        <div className="rosie-header-welcome">
          <h1 className="rosie-greeting">{greeting}</h1>
          <p className="rosie-welcome-text">{supportiveText}</p>
        </div>

        {/* Baby age info */}
        <div className="rosie-age">
          <div className="rosie-age-detail">
            <span>{getDayText()}</span>
            <span className="rosie-age-separator" />
            <span>Week {weekNumber}</span>
            <span className="rosie-age-separator" />
            <span>{ageDisplay}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default RosieHeader;
