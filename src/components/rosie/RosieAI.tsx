import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RosieAuthProvider, useRosieAuth } from './RosieAuthContext';
import { RosieAuth } from './RosieAuth';
import { RosieTimeline } from './RosieTimeline';
import { RosieChat } from './RosieChat';
import { RosieDevelopment } from './RosieDevelopment';
import { RosieInsights } from './RosieInsights';
import { RosieHeader, TimePeriod, getTimePeriod } from './RosieHeader';
import { RosieQuickLog } from './RosieQuickLog';
import { RosieProfile } from './RosieProfile';
import { RosieData, BabyProfile, TimelineEvent, ChatMessage, ActiveTimer, GrowthMeasurement } from './types';
import { getStoredData, saveData, clearData } from './storage';
import { getDevelopmentalInfo } from './developmentalData';
import './rosie.css';

// Helper to format seconds as mm:ss or hh:mm:ss
const formatDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Inner component that uses auth context
const RosieAIContent: React.FC = () => {
  const { user, currentBaby, loading: authLoading } = useRosieAuth();
  const [data, setData] = useState<RosieData | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'insights' | 'development' | 'chat'>('timeline');
  const [isLoading, setIsLoading] = useState(true);
  const [bannerTimerDisplay, setBannerTimerDisplay] = useState(0);
  const [showQuickLogModal, setShowQuickLogModal] = useState<'feed' | 'sleep' | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(() => getTimePeriod(new Date().getHours()));
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    // If user is authenticated and has a baby, load from localStorage (for now)
    // In the future, this will sync with Supabase
    if (currentBaby) {
      const stored = getStoredData();
      // Merge currentBaby info into stored data
      if (stored) {
        setData({
          ...stored,
          baby: {
            name: currentBaby.name,
            birthDate: currentBaby.birthDate,
            photoUrl: currentBaby.photoUrl,
          }
        });
      } else {
        setData({
          baby: {
            name: currentBaby.name,
            birthDate: currentBaby.birthDate,
            photoUrl: currentBaby.photoUrl,
          },
          timeline: [],
          chatHistory: [],
          caregiverNotes: [],
        });
      }
    } else if (!authLoading && !user) {
      // Not authenticated, show auth screen
      setShowAuth(true);
    } else {
      // Fallback to local storage for non-authenticated usage
      const stored = getStoredData();
      setData(stored);
    }
    setIsLoading(false);
  }, [user, currentBaby, authLoading]);

  // Update banner timer display every second when timer is active
  useEffect(() => {
    if (!data?.activeTimer) {
      setBannerTimerDisplay(0);
      return;
    }

    const updateDisplay = () => {
      const now = Date.now();
      const startMs = new Date(data.activeTimer!.startTime).getTime();
      const totalSeconds = Math.floor((now - startMs) / 1000);
      setBannerTimerDisplay(totalSeconds);
    };

    updateDisplay();
    const interval = setInterval(updateDisplay, 1000);
    return () => clearInterval(interval);
  }, [data?.activeTimer]);

  // Extract last feed side from most recent breast feed event
  const lastFeedSide = useMemo(() => {
    if (!data?.timeline) return undefined;
    const lastBreastFeed = data.timeline.find(
      event => event.type === 'feed' && event.feedType === 'breast' && event.feedLastSide
    );
    return lastBreastFeed?.feedLastSide;
  }, [data?.timeline]);

  // Timer management handlers
  const handleStartTimer = (timer: ActiveTimer) => {
    if (!data) return;
    const updatedData = {
      ...data,
      activeTimer: timer,
    };
    saveData(updatedData);
    setData(updatedData);
  };

  const handleStopTimer = useCallback(() => {
    if (!data) return;
    const updatedData = {
      ...data,
      activeTimer: undefined,
    };
    saveData(updatedData);
    setData(updatedData);
  }, [data]);

  const handleUpdateTimer = (timer: ActiveTimer) => {
    if (!data) return;
    const updatedData = {
      ...data,
      activeTimer: timer,
    };
    saveData(updatedData);
    setData(updatedData);
  };

  const handleOnboardingComplete = (profile: BabyProfile) => {
    const newData: RosieData = {
      baby: profile,
      timeline: [],
      chatHistory: [],
      caregiverNotes: [],
    };
    saveData(newData);
    setData(newData);
  };

  const handleAddEvent = (event: Omit<TimelineEvent, 'id' | 'timestamp'>) => {
    if (!data) return;

    const newEvent: TimelineEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };

    const updatedData = {
      ...data,
      timeline: [newEvent, ...data.timeline],
    };

    saveData(updatedData);
    setData(updatedData);
  };

  const handleDeleteEvent = (eventId: string) => {
    if (!data) return;

    const updatedData = {
      ...data,
      timeline: data.timeline.filter(event => event.id !== eventId),
    };

    saveData(updatedData);
    setData(updatedData);
  };

  const handleAddMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    if (!data) return;

    const newMessage: ChatMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };

    const updatedData = {
      ...data,
      chatHistory: [...data.chatHistory, newMessage],
    };

    saveData(updatedData);
    setData(updatedData);
  };

  const handleUpdateChatHistory = (messages: ChatMessage[]) => {
    if (!data) return;

    const updatedData = {
      ...data,
      chatHistory: messages,
    };

    saveData(updatedData);
    setData(updatedData);
  };

  // Profile handlers
  const handleUpdateBaby = (baby: BabyProfile) => {
    if (!data) return;

    const updatedData = {
      ...data,
      baby,
    };

    saveData(updatedData);
    setData(updatedData);
  };

  const handleAddMeasurement = (measurement: Omit<GrowthMeasurement, 'id' | 'timestamp'>) => {
    if (!data) return;

    const newMeasurement: GrowthMeasurement = {
      ...measurement,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };

    const updatedData = {
      ...data,
      growthMeasurements: [newMeasurement, ...(data.growthMeasurements || [])],
    };

    saveData(updatedData);
    setData(updatedData);
  };

  const handleDeleteMeasurement = (id: string) => {
    if (!data) return;

    const updatedData = {
      ...data,
      growthMeasurements: (data.growthMeasurements || []).filter(m => m.id !== id),
    };

    saveData(updatedData);
    setData(updatedData);
  };

  const handleResetData = () => {
    clearData();
    setData(null);
    setShowProfile(false);
  };

  // Show loading state
  if (isLoading || authLoading) {
    return (
      <div className="rosie-container">
        <div className="rosie-loading">
          <div className="rosie-loading-spinner" />
        </div>
      </div>
    );
  }

  // Show auth screen if user needs to sign in
  if (showAuth || (!user && !data?.baby)) {
    return <RosieAuth onComplete={() => setShowAuth(false)} />;
  }

  // Show onboarding if no baby data (for non-authenticated local usage)
  if (!data?.baby) {
    return <RosieOnboarding onComplete={handleOnboardingComplete} />;
  }

  const developmentalInfo = getDevelopmentalInfo(data.baby.birthDate);

  // Handle clicking on timer banner to open the appropriate modal
  const handleBannerClick = () => {
    if (data?.activeTimer) {
      setShowQuickLogModal(data.activeTimer.type === 'feed' ? 'feed' : 'sleep');
    }
  };

  return (
    <div className={`rosie-container ${timePeriod}`}>
      <RosieHeader
        baby={data.baby}
        developmentalInfo={developmentalInfo}
        onTimePeriodChange={setTimePeriod}
        onProfileClick={() => setShowProfile(true)}
      />

      {/* Persistent Timer Banner - shows when timer is active */}
      {data.activeTimer && (
        <div
          className={`rosie-timer-banner ${data.activeTimer.type === 'sleep' ? 'sleep' : ''}`}
          onClick={handleBannerClick}
          role="button"
          tabIndex={0}
        >
          <div className="rosie-timer-banner-content">
            <div className="rosie-timer-banner-icon">
              {data.activeTimer.type === 'feed' ? '🍼' : '💤'}
            </div>
            <div className="rosie-timer-banner-info">
              <div className="rosie-timer-banner-label">
                {data.activeTimer.type === 'feed' ? 'Feeding' : 'Sleeping'}
              </div>
              <div className="rosie-timer-banner-time">
                {formatDuration(bannerTimerDisplay)}
              </div>
              {data.activeTimer.type === 'feed' && data.activeTimer.currentSide && (
                <div className="rosie-timer-banner-detail">
                  {data.activeTimer.currentSide.charAt(0).toUpperCase() + data.activeTimer.currentSide.slice(1)} side
                </div>
              )}
            </div>
          </div>
          <button className="rosie-timer-banner-btn">
            View
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <nav className="rosie-tabs">
        <button
          className={`rosie-tab ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          Timeline
        </button>
        <button
          className={`rosie-tab ${activeTab === 'insights' ? 'active' : ''}`}
          onClick={() => setActiveTab('insights')}
        >
          Insights
        </button>
        <button
          className={`rosie-tab ${activeTab === 'development' ? 'active' : ''}`}
          onClick={() => setActiveTab('development')}
        >
          This Week
        </button>
        <button
          className={`rosie-tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          Ask Rosie
        </button>
      </nav>

      {/* Main Content */}
      <main className="rosie-main">
        {activeTab === 'timeline' && (
          <RosieTimeline
            events={data.timeline}
            baby={data.baby}
            onDeleteEvent={handleDeleteEvent}
          />
        )}
        {activeTab === 'insights' && (
          <RosieInsights
            baby={data.baby}
            timeline={data.timeline}
          />
        )}
        {activeTab === 'development' && (
          <RosieDevelopment
            baby={data.baby}
            developmentalInfo={developmentalInfo}
          />
        )}
        {activeTab === 'chat' && (
          <RosieChat
            baby={data.baby}
            messages={data.chatHistory}
            onAddMessage={handleAddMessage}
            onUpdateHistory={handleUpdateChatHistory}
            timeline={data.timeline}
            developmentalInfo={developmentalInfo}
          />
        )}
      </main>

      {/* Quick Log Buttons - Always visible on timeline/insights tabs, or when modal opened from banner */}
      {(activeTab === 'timeline' || activeTab === 'insights' || showQuickLogModal) && (
        <RosieQuickLog
          onAddEvent={handleAddEvent}
          activeTimer={data.activeTimer || null}
          onStartTimer={handleStartTimer}
          onStopTimer={handleStopTimer}
          onUpdateTimer={handleUpdateTimer}
          lastFeedSide={lastFeedSide}
          openModal={showQuickLogModal}
          onModalClose={() => setShowQuickLogModal(null)}
        />
      )}

      {/* Profile Modal */}
      {showProfile && (
        <RosieProfile
          baby={data.baby}
          growthMeasurements={data.growthMeasurements || []}
          onUpdateBaby={handleUpdateBaby}
          onAddMeasurement={handleAddMeasurement}
          onDeleteMeasurement={handleDeleteMeasurement}
          onClose={() => setShowProfile(false)}
          onResetData={handleResetData}
        />
      )}
    </div>
  );
};

// Main export wraps with auth provider
export const RosieAI: React.FC = () => {
  return (
    <RosieAuthProvider>
      <RosieAIContent />
    </RosieAuthProvider>
  );
};

export default RosieAI;
