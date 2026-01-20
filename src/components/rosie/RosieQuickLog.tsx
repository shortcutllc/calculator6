import React, { useState, useEffect, useCallback } from 'react';
import { TimelineEvent, ActiveTimer } from './types';
import { DurationRing } from './DurationRing';

interface RosieQuickLogProps {
  onAddEvent: (event: Omit<TimelineEvent, 'id' | 'timestamp'>) => void;
  activeTimer: ActiveTimer | null;
  onStartTimer: (timer: ActiveTimer) => void;
  onStopTimer: () => void;
  onUpdateTimer: (timer: ActiveTimer) => void;
  lastFeedSide?: 'left' | 'right';
  openModal?: 'feed' | 'sleep' | null;
  onModalClose?: () => void;
}

type ModalType = 'feed' | 'sleep' | 'diaper' | null;
type EntryMode = 'timer' | 'manual';
type FeedTimerPhase = 'ready' | 'timing' | 'paused' | 'review';
type SleepTimerPhase = 'ready' | 'timing' | 'paused' | 'review';

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

// Helper to format duration for display in events (e.g., "15m" or "1h 20m")
const formatDurationDisplay = (minutes: number): string => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0) {
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
  return `${mins}m`;
};

// Review data structure for paused feed
interface FeedReviewData {
  leftSeconds: number;
  rightSeconds: number;
  startTime: string;
  endTime: string;
  lastSide: 'left' | 'right';
}

// Review data structure for paused sleep
interface SleepReviewData {
  durationSeconds: number;
  startTime: string;
  endTime: string;
  sleepType: 'nap' | 'night';
}

export const RosieQuickLog: React.FC<RosieQuickLogProps> = ({
  onAddEvent,
  activeTimer,
  onStartTimer,
  onStopTimer,
  onUpdateTimer,
  lastFeedSide,
  openModal,
  onModalClose,
}) => {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [entryMode, setEntryMode] = useState<EntryMode>('timer');

  // Feed timer phase tracking
  const [feedTimerPhase, setFeedTimerPhase] = useState<FeedTimerPhase>('ready');
  const [feedReviewData, setFeedReviewData] = useState<FeedReviewData | null>(null);

  // Sleep timer phase tracking
  const [sleepTimerPhase, setSleepTimerPhase] = useState<SleepTimerPhase>('ready');
  const [sleepReviewData, setSleepReviewData] = useState<SleepReviewData | null>(null);

  // Independent L/R breast timer states (each can be running or paused)
  const [leftTimerRunning, setLeftTimerRunning] = useState(false);
  const [rightTimerRunning, setRightTimerRunning] = useState(false);

  // Open modal from parent (e.g., from timer banner)
  useEffect(() => {
    if (openModal) {
      setActiveModal(openModal);
    }
  }, [openModal]);

  // Feed state
  const [feedType, setFeedType] = useState<'breast' | 'bottle' | 'solid'>('breast');
  const [feedAmount, setFeedAmount] = useState('');
  const [feedNote, setFeedNote] = useState('');
  // Manual entry times
  const [feedStartTime, setFeedStartTime] = useState('');
  const [feedEndTime, setFeedEndTime] = useState('');
  const [feedManualLeftMins, setFeedManualLeftMins] = useState('');
  const [feedManualRightMins, setFeedManualRightMins] = useState('');

  // Sleep state
  const [sleepType, setSleepType] = useState<'nap' | 'night'>('nap');
  const [sleepQuality, setSleepQuality] = useState<'good' | 'restless' | 'poor'>('good');
  const [sleepNote, setSleepNote] = useState('');
  const [sleepStartTime, setSleepStartTime] = useState('');
  const [sleepEndTime, setSleepEndTime] = useState('');
  const [sleepManualDuration, setSleepManualDuration] = useState(0); // in minutes

  // Diaper state
  const [diaperType, setDiaperType] = useState<'wet' | 'dirty' | 'both'>('wet');
  const [diaperNote, setDiaperNote] = useState('');

  // Timer display state
  const [timerDisplay, setTimerDisplay] = useState(0);
  const [leftDisplay, setLeftDisplay] = useState(0);
  const [rightDisplay, setRightDisplay] = useState(0);

  // Update timer display every second when timer is active
  useEffect(() => {
    if (!activeTimer) {
      setTimerDisplay(0);
      setLeftDisplay(0);
      setRightDisplay(0);
      return;
    }

    const updateDisplay = () => {
      const now = Date.now();

      if (activeTimer.type === 'feed' && activeTimer.feedType === 'breast') {
        // Calculate left side time - only add running time if left is currently active
        let leftTotal = activeTimer.leftDuration || 0;
        if (leftTimerRunning && activeTimer.leftStartTime) {
          const leftStart = new Date(activeTimer.leftStartTime).getTime();
          leftTotal += Math.floor((now - leftStart) / 1000);
        }
        setLeftDisplay(leftTotal);

        // Calculate right side time - only add running time if right is currently active
        let rightTotal = activeTimer.rightDuration || 0;
        if (rightTimerRunning && activeTimer.rightStartTime) {
          const rightStart = new Date(activeTimer.rightStartTime).getTime();
          rightTotal += Math.floor((now - rightStart) / 1000);
        }
        setRightDisplay(rightTotal);

        // Total is sum of both
        setTimerDisplay(leftTotal + rightTotal);
      } else if (activeTimer.type === 'sleep') {
        // Sleep timer - simple total from start
        const startMs = new Date(activeTimer.startTime).getTime();
        const totalSeconds = Math.floor((now - startMs) / 1000);
        setTimerDisplay(totalSeconds);
      }
    };

    updateDisplay();
    const interval = setInterval(updateDisplay, 1000);
    return () => clearInterval(interval);
  }, [activeTimer, leftTimerRunning, rightTimerRunning]);

  // Sync feedTimerPhase and running states with activeTimer
  useEffect(() => {
    if (activeTimer && activeTimer.type === 'feed') {
      if (feedTimerPhase === 'ready') {
        setFeedTimerPhase('timing');
      }
      // Restore running states based on which side has a start time
      // This handles the case when modal is reopened with an active timer
      if (activeTimer.feedType === 'breast') {
        const shouldLeftRun = !!activeTimer.leftStartTime;
        const shouldRightRun = !!activeTimer.rightStartTime;
        if (shouldLeftRun !== leftTimerRunning) {
          setLeftTimerRunning(shouldLeftRun);
        }
        if (shouldRightRun !== rightTimerRunning) {
          setRightTimerRunning(shouldRightRun);
        }
      }
    } else if (!activeTimer && feedTimerPhase === 'timing' && !feedReviewData) {
      // Timer was cleared externally (not by pausing)
      setFeedTimerPhase('ready');
    }
  }, [activeTimer, feedTimerPhase, feedReviewData, leftTimerRunning, rightTimerRunning]);

  // Sync sleepTimerPhase with activeTimer
  useEffect(() => {
    if (activeTimer && activeTimer.type === 'sleep') {
      if (sleepTimerPhase === 'ready') {
        setSleepTimerPhase('timing');
      }
    } else if (!activeTimer && sleepTimerPhase === 'timing' && !sleepReviewData) {
      // Timer was cleared externally (not by pausing)
      setSleepTimerPhase('ready');
    }
  }, [activeTimer, sleepTimerPhase, sleepReviewData]);

  const resetFeedForm = useCallback(() => {
    setFeedType('breast');
    setFeedAmount('');
    setFeedNote('');
    setFeedStartTime('');
    setFeedEndTime('');
    setFeedManualLeftMins('');
    setFeedManualRightMins('');
    setEntryMode('timer');
    setFeedReviewData(null);

    // Only reset timer states if there's no active feed timer
    // This preserves the running state when modal is closed mid-timer
    if (!activeTimer || activeTimer.type !== 'feed') {
      setFeedTimerPhase('ready');
      setLeftTimerRunning(false);
      setRightTimerRunning(false);
    }
  }, [activeTimer]);

  const resetSleepForm = useCallback(() => {
    setSleepType('nap');
    setSleepQuality('good');
    setSleepNote('');
    setSleepStartTime('');
    setSleepEndTime('');
    setSleepManualDuration(0);
    setEntryMode('timer');
    setSleepTimerPhase('ready');
    setSleepReviewData(null);
  }, []);

  const resetDiaperForm = useCallback(() => {
    setDiaperType('wet');
    setDiaperNote('');
  }, []);

  const closeModal = () => {
    setActiveModal(null);
    resetFeedForm();
    resetSleepForm();
    resetDiaperForm();
    onModalClose?.();
  };

  // Parse time string to Date object (today)
  const parseTimeToDate = (timeStr: string): Date => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  // ===== FEED TIMER FUNCTIONS (Independent L/R Timers) =====

  // Start or resume a specific side's timer
  const startSideTimer = (side: 'left' | 'right') => {
    const now = new Date().toISOString();
    const nowMs = Date.now();

    if (!activeTimer || activeTimer.type !== 'feed') {
      // First time starting - create new timer
      const timer: ActiveTimer = {
        type: 'feed',
        startTime: now,
        feedType: 'breast',
        currentSide: side,
        leftStartTime: side === 'left' ? now : undefined,
        leftDuration: 0,
        rightStartTime: side === 'right' ? now : undefined,
        rightDuration: 0,
      };
      onStartTimer(timer);
      if (side === 'left') {
        setLeftTimerRunning(true);
        setRightTimerRunning(false);
      } else {
        setRightTimerRunning(true);
        setLeftTimerRunning(false);
      }
      setFeedTimerPhase('timing');
    } else {
      // Timer already exists - start this side
      // First, pause the other side if it's running
      let newLeftDuration = activeTimer.leftDuration || 0;
      let newRightDuration = activeTimer.rightDuration || 0;

      if (side === 'left' && rightTimerRunning && activeTimer.rightStartTime) {
        // Pause right, accumulate its time
        const rightStart = new Date(activeTimer.rightStartTime).getTime();
        newRightDuration += Math.floor((nowMs - rightStart) / 1000);
      } else if (side === 'right' && leftTimerRunning && activeTimer.leftStartTime) {
        // Pause left, accumulate its time
        const leftStart = new Date(activeTimer.leftStartTime).getTime();
        newLeftDuration += Math.floor((nowMs - leftStart) / 1000);
      }

      const updatedTimer: ActiveTimer = {
        ...activeTimer,
        currentSide: side,
        leftDuration: newLeftDuration,
        rightDuration: newRightDuration,
        leftStartTime: side === 'left' ? now : undefined,
        rightStartTime: side === 'right' ? now : undefined,
      };
      onUpdateTimer(updatedTimer);

      if (side === 'left') {
        setLeftTimerRunning(true);
        setRightTimerRunning(false);
      } else {
        setRightTimerRunning(true);
        setLeftTimerRunning(false);
      }
    }
  };

  // Pause a specific side's timer
  const pauseSideTimer = (side: 'left' | 'right') => {
    if (!activeTimer || activeTimer.type !== 'feed') return;

    const nowMs = Date.now();

    let newLeftDuration = activeTimer.leftDuration || 0;
    let newRightDuration = activeTimer.rightDuration || 0;

    if (side === 'left' && leftTimerRunning && activeTimer.leftStartTime) {
      const leftStart = new Date(activeTimer.leftStartTime).getTime();
      newLeftDuration += Math.floor((nowMs - leftStart) / 1000);
      setLeftTimerRunning(false);
    } else if (side === 'right' && rightTimerRunning && activeTimer.rightStartTime) {
      const rightStart = new Date(activeTimer.rightStartTime).getTime();
      newRightDuration += Math.floor((nowMs - rightStart) / 1000);
      setRightTimerRunning(false);
    }

    const updatedTimer: ActiveTimer = {
      ...activeTimer,
      currentSide: undefined,
      leftDuration: newLeftDuration,
      rightDuration: newRightDuration,
      leftStartTime: undefined,
      rightStartTime: undefined,
    };
    onUpdateTimer(updatedTimer);
  };

  // Complete the feed timer and go to review
  const completeFeedTimer = () => {
    if (!activeTimer || activeTimer.type !== 'feed') return;

    const now = new Date();
    const nowMs = now.getTime();

    // Calculate final durations including any running time
    let finalLeftDuration = activeTimer.leftDuration || 0;
    let finalRightDuration = activeTimer.rightDuration || 0;

    if (leftTimerRunning && activeTimer.leftStartTime) {
      const leftStart = new Date(activeTimer.leftStartTime).getTime();
      finalLeftDuration += Math.floor((nowMs - leftStart) / 1000);
    }
    if (rightTimerRunning && activeTimer.rightStartTime) {
      const rightStart = new Date(activeTimer.rightStartTime).getTime();
      finalRightDuration += Math.floor((nowMs - rightStart) / 1000);
    }

    // Determine which side was used last
    let lastSide: 'left' | 'right' = 'left';
    if (activeTimer.currentSide) {
      lastSide = activeTimer.currentSide;
    } else if (finalRightDuration > 0 && finalLeftDuration === 0) {
      lastSide = 'right';
    } else if (finalLeftDuration > 0 && finalRightDuration === 0) {
      lastSide = 'left';
    } else if (finalRightDuration > 0) {
      lastSide = 'right'; // Default to right if both were used
    }

    // Store review data
    setFeedReviewData({
      leftSeconds: finalLeftDuration,
      rightSeconds: finalRightDuration,
      startTime: activeTimer.startTime,
      endTime: now.toISOString(),
      lastSide,
    });

    // Clear the active timer and go to review
    setLeftTimerRunning(false);
    setRightTimerRunning(false);
    onStopTimer();
    setFeedTimerPhase('review');
  };

  // Continue feeding on a side (from review state)
  const continueFeedingOnSide = (side: 'left' | 'right') => {
    if (!feedReviewData) return;

    const now = new Date().toISOString();

    // When resuming, the side we're resuming has its accumulated time in xxxDuration
    // and we start a new timer for that side (xxxStartTime = now)
    // The other side keeps its accumulated time but no running timer
    const timer: ActiveTimer = {
      type: 'feed',
      startTime: feedReviewData.startTime, // Keep original start time
      feedType: 'breast',
      currentSide: side,
      // For the side we're resuming: start new timer, keep accumulated duration
      leftStartTime: side === 'left' ? now : undefined,
      leftDuration: feedReviewData.leftSeconds,
      // For the other side: no timer running, keep accumulated duration
      rightStartTime: side === 'right' ? now : undefined,
      rightDuration: feedReviewData.rightSeconds,
    };

    // Clear review data FIRST to prevent stale state issues
    setFeedReviewData(null);

    // Update running states BEFORE starting timer to ensure proper sync
    if (side === 'left') {
      setLeftTimerRunning(true);
      setRightTimerRunning(false);
    } else {
      setRightTimerRunning(true);
      setLeftTimerRunning(false);
    }

    // Set phase before starting timer
    setFeedTimerPhase('timing');

    // Finally start the timer - this will trigger parent state update
    onStartTimer(timer);
  };

  // Save the feed from review
  const saveFeedFromReview = () => {
    if (!feedReviewData) return;

    const totalSeconds = feedReviewData.leftSeconds + feedReviewData.rightSeconds;
    const totalMinutes = Math.ceil(totalSeconds / 60);

    // Determine feed side for the event
    let feedSide: 'left' | 'right' | 'both' = 'both';
    if (feedReviewData.leftSeconds > 0 && feedReviewData.rightSeconds === 0) feedSide = 'left';
    else if (feedReviewData.rightSeconds > 0 && feedReviewData.leftSeconds === 0) feedSide = 'right';

    onAddEvent({
      type: 'feed',
      feedType: 'breast',
      feedSide,
      feedDuration: totalMinutes,
      feedLeftDuration: Math.ceil(feedReviewData.leftSeconds / 60),
      feedRightDuration: Math.ceil(feedReviewData.rightSeconds / 60),
      feedLastSide: feedReviewData.lastSide,
      startTime: feedReviewData.startTime,
      endTime: feedReviewData.endTime,
      note: feedNote || undefined,
    });

    closeModal();
  };

  // Discard the feed
  const discardFeed = () => {
    setFeedReviewData(null);
    setFeedTimerPhase('ready');
    setFeedNote('');
  };

  // ===== SLEEP TIMER FUNCTIONS =====
  const startSleepTimer = () => {
    const now = new Date().toISOString();
    const timer: ActiveTimer = {
      type: 'sleep',
      startTime: now,
      sleepType,
    };
    onStartTimer(timer);
    setSleepTimerPhase('timing');
  };

  // Pause the sleep timer and go to review
  const pauseSleepTimer = () => {
    if (!activeTimer || activeTimer.type !== 'sleep') return;

    const now = new Date();
    const startMs = new Date(activeTimer.startTime).getTime();
    const durationSeconds = Math.floor((now.getTime() - startMs) / 1000);

    // Store review data
    setSleepReviewData({
      durationSeconds,
      startTime: activeTimer.startTime,
      endTime: now.toISOString(),
      sleepType: activeTimer.sleepType || 'nap',
    });

    // Clear the active timer but keep in paused state
    onStopTimer();
    setSleepTimerPhase('paused');
  };

  // Resume sleep timer from paused state
  const resumeSleepTimer = () => {
    if (!sleepReviewData) return;

    // Note: We can't truly "resume" since we need a new start time
    // We'll restart from now and the final duration will include the paused time
    // This is a simplified approach - for true pause/resume we'd need more complex state
    const now = new Date().toISOString();
    const timer: ActiveTimer = {
      type: 'sleep',
      startTime: sleepReviewData.startTime, // Keep original start time for total calculation
      sleepType: sleepReviewData.sleepType,
    };
    onStartTimer(timer);
    setSleepTimerPhase('timing');
    setSleepReviewData(null);
  };

  // Complete sleep timer and go to review for saving
  const completeSleepTimer = () => {
    if (!activeTimer || activeTimer.type !== 'sleep') return;

    const now = new Date();
    const startMs = new Date(activeTimer.startTime).getTime();
    const durationSeconds = Math.floor((now.getTime() - startMs) / 1000);

    // Store review data
    setSleepReviewData({
      durationSeconds,
      startTime: activeTimer.startTime,
      endTime: now.toISOString(),
      sleepType: activeTimer.sleepType || 'nap',
    });

    // Clear the active timer and go to review
    onStopTimer();
    setSleepTimerPhase('review');
  };

  // Save sleep from review
  const saveSleepFromReview = () => {
    if (!sleepReviewData) return;

    const durationMinutes = Math.ceil(sleepReviewData.durationSeconds / 60);

    onAddEvent({
      type: 'sleep',
      sleepType: sleepReviewData.sleepType,
      sleepDuration: durationMinutes,
      sleepQuality,
      startTime: sleepReviewData.startTime,
      endTime: sleepReviewData.endTime,
      note: sleepNote || undefined,
    });

    closeModal();
  };

  // Discard the sleep
  const discardSleep = () => {
    setSleepReviewData(null);
    setSleepTimerPhase('ready');
    setSleepNote('');
  };

  // ===== MANUAL ENTRY HANDLERS =====
  const handleSaveFeedManual = () => {
    if (feedType === 'breast') {
      const leftMins = parseInt(feedManualLeftMins) || 0;
      const rightMins = parseInt(feedManualRightMins) || 0;
      const totalMins = leftMins + rightMins;

      if (totalMins === 0) return;

      let feedSide: 'left' | 'right' | 'both' = 'both';
      if (leftMins > 0 && rightMins === 0) feedSide = 'left';
      else if (rightMins > 0 && leftMins === 0) feedSide = 'right';

      // Determine last side (right if both used, otherwise whichever was used)
      const lastSide: 'left' | 'right' = rightMins > 0 ? 'right' : 'left';

      let startTime: string | undefined;
      let endTime: string | undefined;

      if (feedStartTime) {
        const start = parseTimeToDate(feedStartTime);
        startTime = start.toISOString();
        if (feedEndTime) {
          endTime = parseTimeToDate(feedEndTime).toISOString();
        } else {
          // Calculate end time from duration
          const end = new Date(start.getTime() + totalMins * 60000);
          endTime = end.toISOString();
        }
      }

      onAddEvent({
        type: 'feed',
        feedType: 'breast',
        feedSide,
        feedDuration: totalMins,
        feedLeftDuration: leftMins,
        feedRightDuration: rightMins,
        feedLastSide: lastSide,
        startTime,
        endTime,
        note: feedNote || undefined,
      });
    } else if (feedType === 'bottle') {
      const amount = parseFloat(feedAmount);
      if (!amount) return;

      let startTime: string | undefined;
      let endTime: string | undefined;

      if (feedStartTime) {
        startTime = parseTimeToDate(feedStartTime).toISOString();
        if (feedEndTime) {
          endTime = parseTimeToDate(feedEndTime).toISOString();
        }
      }

      onAddEvent({
        type: 'feed',
        feedType: 'bottle',
        feedAmount: amount,
        startTime,
        endTime,
        note: feedNote || undefined,
      });
    } else {
      // Solid food
      onAddEvent({
        type: 'feed',
        feedType: 'solid',
        note: feedNote || undefined,
      });
    }

    closeModal();
  };

  const handleSaveSleepManual = () => {
    // Can use either time inputs or duration ring
    if (sleepStartTime && sleepEndTime) {
      const start = parseTimeToDate(sleepStartTime);
      const end = parseTimeToDate(sleepEndTime);

      // Handle overnight sleep (end time before start time)
      if (end < start) {
        end.setDate(end.getDate() + 1);
      }

      const durationMinutes = Math.ceil((end.getTime() - start.getTime()) / 60000);

      onAddEvent({
        type: 'sleep',
        sleepType,
        sleepDuration: durationMinutes,
        sleepQuality,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        note: sleepNote || undefined,
      });
    } else if (sleepManualDuration > 0) {
      // Using just duration ring - calculate times from now
      const end = new Date();
      const start = new Date(end.getTime() - sleepManualDuration * 60000);

      onAddEvent({
        type: 'sleep',
        sleepType,
        sleepDuration: sleepManualDuration,
        sleepQuality,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        note: sleepNote || undefined,
      });
    } else {
      return; // No valid data
    }

    closeModal();
  };

  const handleSaveDiaper = () => {
    onAddEvent({
      type: 'diaper',
      diaperType,
      note: diaperNote || undefined,
    });
    closeModal();
  };

  // Suggest starting side based on last feed
  const suggestedSide = lastFeedSide === 'left' ? 'right' : 'left';

  // Calculate total time for review
  const reviewTotalSeconds = feedReviewData
    ? feedReviewData.leftSeconds + feedReviewData.rightSeconds
    : 0;

  return (
    <>
      {/* Quick Log Bar */}
      <div className="rosie-quicklog">
        <div className="rosie-quicklog-content">
          <button
            className="rosie-quicklog-btn feed"
            onClick={() => setActiveModal('feed')}
            aria-label="Log feed"
          >
            <span className="rosie-quicklog-icon">🍼</span>
            <span className="rosie-quicklog-label">Feed</span>
          </button>
          <button
            className="rosie-quicklog-btn sleep"
            onClick={() => setActiveModal('sleep')}
            aria-label="Log sleep"
          >
            <span className="rosie-quicklog-icon">💤</span>
            <span className="rosie-quicklog-label">Sleep</span>
          </button>
          <button
            className="rosie-quicklog-btn diaper"
            onClick={() => setActiveModal('diaper')}
            aria-label="Log diaper"
          >
            <span className="rosie-quicklog-icon">🧷</span>
            <span className="rosie-quicklog-label">Diaper</span>
          </button>
        </div>
      </div>

      {/* Feed Modal */}
      {activeModal === 'feed' && (
        <div className="rosie-modal-overlay" onClick={closeModal}>
          <div className="rosie-modal" onClick={e => e.stopPropagation()}>
            <div className="rosie-modal-header">
              <h2 className="rosie-modal-title">
                {feedTimerPhase === 'review' ? 'Review Feed' : 'Log Feed'}
              </h2>
              <button className="rosie-modal-close" onClick={closeModal} aria-label="Close">
                ×
              </button>
            </div>

            {/* Feed Type Selection - only show in ready phase */}
            {feedTimerPhase === 'ready' && (
              <div className="rosie-modal-section">
                <label className="rosie-modal-label">Type</label>
                <div className="rosie-options">
                  <button
                    className={`rosie-option ${feedType === 'breast' ? 'selected' : ''}`}
                    onClick={() => setFeedType('breast')}
                  >
                    <div className="rosie-option-icon">🤱</div>
                    <div className="rosie-option-label">Breast</div>
                  </button>
                  <button
                    className={`rosie-option ${feedType === 'bottle' ? 'selected' : ''}`}
                    onClick={() => setFeedType('bottle')}
                  >
                    <div className="rosie-option-icon">🍼</div>
                    <div className="rosie-option-label">Bottle</div>
                  </button>
                  <button
                    className={`rosie-option ${feedType === 'solid' ? 'selected' : ''}`}
                    onClick={() => setFeedType('solid')}
                  >
                    <div className="rosie-option-icon">🥣</div>
                    <div className="rosie-option-label">Solid</div>
                  </button>
                </div>
              </div>
            )}

            {/* Breastfeeding - Timer or Manual */}
            {feedType === 'breast' && (
              <>
                {/* Mode Toggle - only in ready phase */}
                {feedTimerPhase === 'ready' && (
                  <div className="rosie-mode-toggle">
                    <button
                      className={`rosie-mode-btn ${entryMode === 'timer' ? 'active' : ''}`}
                      onClick={() => setEntryMode('timer')}
                    >
                      Timer
                    </button>
                    <button
                      className={`rosie-mode-btn ${entryMode === 'manual' ? 'active' : ''}`}
                      onClick={() => setEntryMode('manual')}
                    >
                      Manual
                    </button>
                  </div>
                )}

                {entryMode === 'timer' ? (
                  <>
                    {/* READY PHASE - Show L/R buttons to start */}
                    {feedTimerPhase === 'ready' && (
                      <>
                        {/* Side Reminder */}
                        {lastFeedSide && (
                          <div className="rosie-side-indicator">
                            Last feed ended on {lastFeedSide} side — start on {suggestedSide}?
                          </div>
                        )}

                        <div className="rosie-modal-section">
                          <label className="rosie-modal-label">Tap to start</label>
                          <div className="rosie-side-buttons">
                            <button
                              className={`rosie-side-btn left ${suggestedSide === 'left' ? 'suggested' : ''}`}
                              onClick={() => startSideTimer('left')}
                            >
                              <div className="rosie-side-btn-label">Left</div>
                              <div className="rosie-side-btn-hint">Tap to start</div>
                            </button>
                            <button
                              className={`rosie-side-btn right ${suggestedSide === 'right' ? 'suggested' : ''}`}
                              onClick={() => startSideTimer('right')}
                            >
                              <div className="rosie-side-btn-label">Right</div>
                              <div className="rosie-side-btn-hint">Tap to start</div>
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {/* TIMING PHASE - Active timer with independent L/R controls */}
                    {feedTimerPhase === 'timing' && activeTimer && activeTimer.type === 'feed' && (
                      <>
                        {/* Dual Apple Fitness-style Timer Rings */}
                        <div className="rosie-dual-timer-rings">
                          {/* Left Timer Ring */}
                          <div className={`rosie-timer-ring-small ${leftTimerRunning ? 'active' : ''}`}>
                            <svg viewBox="0 0 100 100">
                              <defs>
                                <linearGradient id="leftGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#FF6B8A" />
                                  <stop offset="100%" stopColor="#FF2D55" />
                                </linearGradient>
                              </defs>
                              {/* Background ring */}
                              <circle
                                className="rosie-timer-ring-bg"
                                cx="50"
                                cy="50"
                                r="42"
                              />
                              {/* Progress ring - fills based on time (15 min = full per side) */}
                              <circle
                                className="rosie-timer-ring-progress left"
                                cx="50"
                                cy="50"
                                r="42"
                                strokeDasharray={2 * Math.PI * 42}
                                strokeDashoffset={2 * Math.PI * 42 * (1 - Math.min(leftDisplay / 900, 1))}
                              />
                            </svg>
                            <div className="rosie-timer-ring-inner-small">
                              <div className="rosie-timer-time-medium">{formatDuration(leftDisplay)}</div>
                              <div className="rosie-timer-label-small left">LEFT</div>
                            </div>
                            {/* Control button overlay */}
                            <button
                              className={`rosie-ring-control-btn ${leftTimerRunning ? 'pause' : 'start'}`}
                              onClick={() => leftTimerRunning ? pauseSideTimer('left') : startSideTimer('left')}
                            >
                              {leftTimerRunning ? '❚❚' : (leftDisplay > 0 ? '▶' : '▶')}
                            </button>
                          </div>

                          {/* Right Timer Ring */}
                          <div className={`rosie-timer-ring-small ${rightTimerRunning ? 'active' : ''}`}>
                            <svg viewBox="0 0 100 100">
                              <defs>
                                <linearGradient id="rightGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#5AC8FA" />
                                  <stop offset="100%" stopColor="#007AFF" />
                                </linearGradient>
                              </defs>
                              {/* Background ring */}
                              <circle
                                className="rosie-timer-ring-bg"
                                cx="50"
                                cy="50"
                                r="42"
                              />
                              {/* Progress ring - fills based on time (15 min = full per side) */}
                              <circle
                                className="rosie-timer-ring-progress right"
                                cx="50"
                                cy="50"
                                r="42"
                                strokeDasharray={2 * Math.PI * 42}
                                strokeDashoffset={2 * Math.PI * 42 * (1 - Math.min(rightDisplay / 900, 1))}
                              />
                            </svg>
                            <div className="rosie-timer-ring-inner-small">
                              <div className="rosie-timer-time-medium">{formatDuration(rightDisplay)}</div>
                              <div className="rosie-timer-label-small right">RIGHT</div>
                            </div>
                            {/* Control button overlay */}
                            <button
                              className={`rosie-ring-control-btn ${rightTimerRunning ? 'pause' : 'start'}`}
                              onClick={() => rightTimerRunning ? pauseSideTimer('right') : startSideTimer('right')}
                            >
                              {rightTimerRunning ? '❚❚' : (rightDisplay > 0 ? '▶' : '▶')}
                            </button>
                          </div>
                        </div>

                        {/* Total time display */}
                        <div className="rosie-total-timer-display">
                          <span className="rosie-total-timer-label">Total</span>
                          <span className="rosie-total-timer-value">{formatDuration(timerDisplay)}</span>
                        </div>

                        <div className="rosie-timer-actions">
                          <button
                            className="rosie-timer-action-btn stop"
                            onClick={completeFeedTimer}
                          >
                            Done
                          </button>
                        </div>
                      </>
                    )}

                    {/* REVIEW PHASE - Final confirmation */}
                    {feedTimerPhase === 'review' && feedReviewData && (
                      <>
                        <div className="rosie-review-card">
                          <div className="rosie-review-total">
                            <div className="rosie-review-total-label">Total Duration</div>
                            <div className="rosie-review-total-value">{formatDurationDisplay(Math.ceil(reviewTotalSeconds / 60))}</div>
                          </div>

                          <div className="rosie-review-breakdown">
                            <div className="rosie-review-side">
                              <div className="rosie-review-side-label">Left</div>
                              <div className="rosie-review-side-value">{formatDurationDisplay(Math.ceil(feedReviewData.leftSeconds / 60))}</div>
                            </div>
                            <div className="rosie-review-side">
                              <div className="rosie-review-side-label">Right</div>
                              <div className="rosie-review-side-value">{formatDurationDisplay(Math.ceil(feedReviewData.rightSeconds / 60))}</div>
                            </div>
                          </div>

                          <div className="rosie-review-time">
                            {new Date(feedReviewData.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                            {' → '}
                            {new Date(feedReviewData.endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                          </div>
                        </div>

                        {/* Option to continue feeding */}
                        <div className="rosie-modal-section">
                          <label className="rosie-modal-label">Continue feeding?</label>
                          <div className="rosie-side-buttons">
                            <button
                              className="rosie-side-btn left"
                              onClick={() => continueFeedingOnSide('left')}
                            >
                              <div className="rosie-side-btn-label">Left</div>
                              <div className="rosie-side-btn-hint">Resume</div>
                            </button>
                            <button
                              className="rosie-side-btn right"
                              onClick={() => continueFeedingOnSide('right')}
                            >
                              <div className="rosie-side-btn-label">Right</div>
                              <div className="rosie-side-btn-hint">Resume</div>
                            </button>
                          </div>
                        </div>

                        <div className="rosie-modal-section">
                          <label className="rosie-modal-label">Note (optional)</label>
                          <textarea
                            className="rosie-input rosie-textarea"
                            placeholder="Any observations..."
                            value={feedNote}
                            onChange={e => setFeedNote(e.target.value)}
                          />
                        </div>

                        <div className="rosie-timer-actions">
                          <button
                            className="rosie-timer-action-btn secondary"
                            onClick={discardFeed}
                          >
                            Discard
                          </button>
                          <button
                            className="rosie-timer-action-btn start"
                            onClick={saveFeedFromReview}
                          >
                            Save Feed
                          </button>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  /* Manual Entry Mode with Duration Rings */
                  <>
                    <div className="rosie-time-inputs">
                      <div className="rosie-time-input-group">
                        <label className="rosie-time-input-label">Start Time</label>
                        <input
                          type="time"
                          className="rosie-input"
                          value={feedStartTime}
                          onChange={e => setFeedStartTime(e.target.value)}
                        />
                      </div>
                      <div className="rosie-time-input-group">
                        <label className="rosie-time-input-label">End Time</label>
                        <input
                          type="time"
                          className="rosie-input"
                          value={feedEndTime}
                          onChange={e => setFeedEndTime(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Dual Duration Rings for Left/Right */}
                    <div className="rosie-dual-duration-rings">
                      <div className="rosie-duration-ring-wrapper left">
                        <DurationRing
                          value={parseInt(feedManualLeftMins) || 0}
                          onChange={(val) => setFeedManualLeftMins(val.toString())}
                          maxValue={30}
                          size={140}
                          strokeWidth={18}
                          color="#FF2D55"
                          label="Left"
                          showHours={false}
                        />
                      </div>
                      <div className="rosie-duration-ring-wrapper right">
                        <DurationRing
                          value={parseInt(feedManualRightMins) || 0}
                          onChange={(val) => setFeedManualRightMins(val.toString())}
                          maxValue={30}
                          size={140}
                          strokeWidth={18}
                          color="#007AFF"
                          label="Right"
                          showHours={false}
                        />
                      </div>
                    </div>

                    {/* Total time display */}
                    <div className="rosie-manual-total">
                      <span className="rosie-manual-total-label">Total:</span>
                      <span className="rosie-manual-total-value">
                        {formatDurationDisplay((parseInt(feedManualLeftMins) || 0) + (parseInt(feedManualRightMins) || 0))}
                      </span>
                    </div>

                    <div className="rosie-modal-section">
                      <label className="rosie-modal-label">Note (optional)</label>
                      <textarea
                        className="rosie-input rosie-textarea"
                        placeholder="Any observations..."
                        value={feedNote}
                        onChange={e => setFeedNote(e.target.value)}
                      />
                    </div>

                    <button
                      className="rosie-btn-primary"
                      onClick={handleSaveFeedManual}
                      disabled={!feedManualLeftMins && !feedManualRightMins}
                    >
                      Save Feed
                    </button>
                  </>
                )}
              </>
            )}

            {/* Bottle Feeding */}
            {feedType === 'bottle' && feedTimerPhase === 'ready' && (
              <>
                <div className="rosie-time-inputs">
                  <div className="rosie-time-input-group">
                    <label className="rosie-time-input-label">Start Time</label>
                    <input
                      type="time"
                      className="rosie-input"
                      value={feedStartTime}
                      onChange={e => setFeedStartTime(e.target.value)}
                    />
                  </div>
                  <div className="rosie-time-input-group">
                    <label className="rosie-time-input-label">End Time</label>
                    <input
                      type="time"
                      className="rosie-input"
                      value={feedEndTime}
                      onChange={e => setFeedEndTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="rosie-modal-section">
                  <label className="rosie-modal-label">Amount (oz)</label>
                  <input
                    type="number"
                    className="rosie-input"
                    placeholder="e.g., 4"
                    value={feedAmount}
                    onChange={e => setFeedAmount(e.target.value)}
                    min="0"
                    max="12"
                    step="0.5"
                  />
                </div>

                <div className="rosie-modal-section">
                  <label className="rosie-modal-label">Note (optional)</label>
                  <textarea
                    className="rosie-input rosie-textarea"
                    placeholder="Any observations..."
                    value={feedNote}
                    onChange={e => setFeedNote(e.target.value)}
                  />
                </div>

                <button
                  className="rosie-btn-primary"
                  onClick={handleSaveFeedManual}
                  disabled={!feedAmount}
                >
                  Save Feed
                </button>
              </>
            )}

            {/* Solid Food */}
            {feedType === 'solid' && feedTimerPhase === 'ready' && (
              <>
                <div className="rosie-modal-section">
                  <label className="rosie-modal-label">Note (optional)</label>
                  <textarea
                    className="rosie-input rosie-textarea"
                    placeholder="What did they eat? How did it go?"
                    value={feedNote}
                    onChange={e => setFeedNote(e.target.value)}
                  />
                </div>

                <button className="rosie-btn-primary" onClick={handleSaveFeedManual}>
                  Save Feed
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Sleep Modal */}
      {activeModal === 'sleep' && (
        <div className="rosie-modal-overlay" onClick={closeModal}>
          <div className="rosie-modal" onClick={e => e.stopPropagation()}>
            <div className="rosie-modal-header">
              <h2 className="rosie-modal-title">Log Sleep</h2>
              <button className="rosie-modal-close" onClick={closeModal} aria-label="Close">
                ×
              </button>
            </div>

            {/* Sleep Type */}
            <div className="rosie-modal-section">
              <label className="rosie-modal-label">Type</label>
              <div className="rosie-options">
                <button
                  className={`rosie-option ${sleepType === 'nap' ? 'selected' : ''}`}
                  onClick={() => setSleepType('nap')}
                >
                  <div className="rosie-option-icon">😴</div>
                  <div className="rosie-option-label">Nap</div>
                </button>
                <button
                  className={`rosie-option ${sleepType === 'night' ? 'selected' : ''}`}
                  onClick={() => setSleepType('night')}
                >
                  <div className="rosie-option-icon">🌙</div>
                  <div className="rosie-option-label">Night</div>
                </button>
              </div>
            </div>

            {/* Mode Toggle */}
            <div className="rosie-mode-toggle">
              <button
                className={`rosie-mode-btn ${entryMode === 'timer' ? 'active' : ''}`}
                onClick={() => setEntryMode('timer')}
              >
                Timer
              </button>
              <button
                className={`rosie-mode-btn ${entryMode === 'manual' ? 'active' : ''}`}
                onClick={() => setEntryMode('manual')}
              >
                Manual
              </button>
            </div>

            {entryMode === 'timer' ? (
              <>
                {/* READY PHASE - Timer not started */}
                {sleepTimerPhase === 'ready' && !activeTimer && (
                  <>
                    <div className="rosie-timer-display">
                      <div className="rosie-timer-time">0:00</div>
                      <div className="rosie-timer-status">Ready to start</div>
                    </div>

                    <div className="rosie-timer-actions">
                      <button
                        className="rosie-timer-action-btn start"
                        onClick={startSleepTimer}
                      >
                        Start
                      </button>
                    </div>
                  </>
                )}

                {/* TIMING PHASE - Timer running */}
                {sleepTimerPhase === 'timing' && activeTimer && activeTimer.type === 'sleep' && (
                  <>
                    <div className="rosie-timer-ring active">
                      <svg viewBox="0 0 100 100" className="sleep">
                        <defs>
                          <linearGradient id="sleepGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#C77DFF" />
                            <stop offset="100%" stopColor="#AF52DE" />
                          </linearGradient>
                        </defs>
                        {/* Background ring */}
                        <circle
                          className="rosie-timer-ring-bg"
                          cx="50"
                          cy="50"
                          r="42"
                        />
                        {/* Progress ring - fills based on time (2 hours = full for sleep) */}
                        <circle
                          className="rosie-timer-ring-progress sleep"
                          cx="50"
                          cy="50"
                          r="42"
                          strokeDasharray={2 * Math.PI * 42}
                          strokeDashoffset={2 * Math.PI * 42 * (1 - Math.min(timerDisplay / 7200, 1))}
                        />
                      </svg>
                      <div className="rosie-timer-ring-inner">
                        <div className="rosie-timer-time-large">{formatDuration(timerDisplay)}</div>
                        <div className="rosie-timer-label sleep">
                          {activeTimer.sleepType === 'nap' ? 'NAP' : 'NIGHT'}
                        </div>
                      </div>
                    </div>

                    <div className="rosie-timer-actions">
                      <button
                        className="rosie-timer-action-btn secondary"
                        onClick={pauseSleepTimer}
                      >
                        Pause
                      </button>
                      <button
                        className="rosie-timer-action-btn stop"
                        onClick={completeSleepTimer}
                      >
                        Done
                      </button>
                    </div>
                  </>
                )}

                {/* PAUSED PHASE - Timer paused */}
                {sleepTimerPhase === 'paused' && sleepReviewData && (
                  <>
                    <div className="rosie-timer-display">
                      <div className="rosie-timer-time">{formatDuration(sleepReviewData.durationSeconds)}</div>
                      <div className="rosie-timer-status">Paused</div>
                    </div>

                    <div className="rosie-timer-actions">
                      <button
                        className="rosie-timer-action-btn start"
                        onClick={resumeSleepTimer}
                      >
                        Resume
                      </button>
                      <button
                        className="rosie-timer-action-btn stop"
                        onClick={() => setSleepTimerPhase('review')}
                      >
                        Done
                      </button>
                    </div>
                  </>
                )}

                {/* REVIEW PHASE - Save or discard */}
                {sleepTimerPhase === 'review' && sleepReviewData && (
                  <>
                    <div className="rosie-review-card">
                      <div className="rosie-review-total">
                        <div className="rosie-review-total-label">Sleep Duration</div>
                        <div className="rosie-review-total-value">{formatDurationDisplay(Math.ceil(sleepReviewData.durationSeconds / 60))}</div>
                      </div>

                      <div className="rosie-review-time">
                        {new Date(sleepReviewData.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        {' → '}
                        {new Date(sleepReviewData.endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>

                    <div className="rosie-modal-section">
                      <label className="rosie-modal-label">Quality</label>
                      <div className="rosie-options">
                        <button
                          className={`rosie-option ${sleepQuality === 'good' ? 'selected' : ''}`}
                          onClick={() => setSleepQuality('good')}
                        >
                          <div className="rosie-option-icon">😊</div>
                          <div className="rosie-option-label">Good</div>
                        </button>
                        <button
                          className={`rosie-option ${sleepQuality === 'restless' ? 'selected' : ''}`}
                          onClick={() => setSleepQuality('restless')}
                        >
                          <div className="rosie-option-icon">😐</div>
                          <div className="rosie-option-label">Restless</div>
                        </button>
                        <button
                          className={`rosie-option ${sleepQuality === 'poor' ? 'selected' : ''}`}
                          onClick={() => setSleepQuality('poor')}
                        >
                          <div className="rosie-option-icon">😫</div>
                          <div className="rosie-option-label">Poor</div>
                        </button>
                      </div>
                    </div>

                    <div className="rosie-modal-section">
                      <label className="rosie-modal-label">Note (optional)</label>
                      <textarea
                        className="rosie-input rosie-textarea"
                        placeholder="Any observations..."
                        value={sleepNote}
                        onChange={e => setSleepNote(e.target.value)}
                      />
                    </div>

                    <div className="rosie-timer-actions">
                      <button
                        className="rosie-timer-action-btn secondary"
                        onClick={discardSleep}
                      >
                        Discard
                      </button>
                      <button
                        className="rosie-timer-action-btn start"
                        onClick={saveSleepFromReview}
                      >
                        Save Sleep
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : (
              /* Manual Entry Mode with Duration Ring */
              <>
                {/* Duration Ring */}
                <div className="rosie-single-duration-ring">
                  <DurationRing
                    value={sleepManualDuration}
                    onChange={setSleepManualDuration}
                    maxValue={sleepType === 'nap' ? 180 : 720} // 3h for nap, 12h for night
                    size={180}
                    strokeWidth={22}
                    color="#AF52DE"
                    label={sleepType === 'nap' ? 'Nap' : 'Night Sleep'}
                    showHours={true}
                  />
                </div>

                {/* Optional: Exact time inputs */}
                <div className="rosie-manual-time-toggle">
                  <p className="rosie-manual-time-hint">Or enter exact times:</p>
                  <div className="rosie-time-inputs compact">
                    <div className="rosie-time-input-group">
                      <label className="rosie-time-input-label">Start</label>
                      <input
                        type="time"
                        className="rosie-input"
                        value={sleepStartTime}
                        onChange={e => {
                          setSleepStartTime(e.target.value);
                          setSleepManualDuration(0); // Clear ring when using times
                        }}
                      />
                    </div>
                    <div className="rosie-time-input-group">
                      <label className="rosie-time-input-label">End</label>
                      <input
                        type="time"
                        className="rosie-input"
                        value={sleepEndTime}
                        onChange={e => {
                          setSleepEndTime(e.target.value);
                          setSleepManualDuration(0); // Clear ring when using times
                        }}
                      />
                    </div>
                  </div>
                </div>

                {sleepStartTime && sleepEndTime && (
                  <div className="rosie-duration-display">
                    <div className="rosie-duration-label">Duration</div>
                    <div className="rosie-duration-value">
                      {(() => {
                        const start = parseTimeToDate(sleepStartTime);
                        let end = parseTimeToDate(sleepEndTime);
                        if (end < start) end.setDate(end.getDate() + 1);
                        const mins = Math.ceil((end.getTime() - start.getTime()) / 60000);
                        return formatDurationDisplay(mins);
                      })()}
                    </div>
                  </div>
                )}

                <div className="rosie-modal-section">
                  <label className="rosie-modal-label">Quality</label>
                  <div className="rosie-options">
                    <button
                      className={`rosie-option ${sleepQuality === 'good' ? 'selected' : ''}`}
                      onClick={() => setSleepQuality('good')}
                    >
                      <div className="rosie-option-icon">😊</div>
                      <div className="rosie-option-label">Good</div>
                    </button>
                    <button
                      className={`rosie-option ${sleepQuality === 'restless' ? 'selected' : ''}`}
                      onClick={() => setSleepQuality('restless')}
                    >
                      <div className="rosie-option-icon">😐</div>
                      <div className="rosie-option-label">Restless</div>
                    </button>
                    <button
                      className={`rosie-option ${sleepQuality === 'poor' ? 'selected' : ''}`}
                      onClick={() => setSleepQuality('poor')}
                    >
                      <div className="rosie-option-icon">😫</div>
                      <div className="rosie-option-label">Poor</div>
                    </button>
                  </div>
                </div>

                <div className="rosie-modal-section">
                  <label className="rosie-modal-label">Note (optional)</label>
                  <textarea
                    className="rosie-input rosie-textarea"
                    placeholder="Any observations..."
                    value={sleepNote}
                    onChange={e => setSleepNote(e.target.value)}
                  />
                </div>

                <button
                  className="rosie-btn-primary"
                  onClick={handleSaveSleepManual}
                  disabled={!((sleepStartTime && sleepEndTime) || sleepManualDuration > 0)}
                >
                  Save Sleep
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Diaper Modal */}
      {activeModal === 'diaper' && (
        <div className="rosie-modal-overlay" onClick={closeModal}>
          <div className="rosie-modal" onClick={e => e.stopPropagation()}>
            <div className="rosie-modal-header">
              <h2 className="rosie-modal-title">Log Diaper</h2>
              <button className="rosie-modal-close" onClick={closeModal} aria-label="Close">
                ×
              </button>
            </div>

            <div className="rosie-modal-section">
              <label className="rosie-modal-label">Type</label>
              <div className="rosie-options">
                <button
                  className={`rosie-option ${diaperType === 'wet' ? 'selected' : ''}`}
                  onClick={() => setDiaperType('wet')}
                >
                  <div className="rosie-option-icon">💧</div>
                  <div className="rosie-option-label">Pee</div>
                </button>
                <button
                  className={`rosie-option ${diaperType === 'dirty' ? 'selected' : ''}`}
                  onClick={() => setDiaperType('dirty')}
                >
                  <div className="rosie-option-icon">💩</div>
                  <div className="rosie-option-label">Poop</div>
                </button>
                <button
                  className={`rosie-option ${diaperType === 'both' ? 'selected' : ''}`}
                  onClick={() => setDiaperType('both')}
                >
                  <div className="rosie-option-icon">💧💩</div>
                  <div className="rosie-option-label">Both</div>
                </button>
              </div>
            </div>

            <div className="rosie-modal-section">
              <label className="rosie-modal-label">Note (optional)</label>
              <textarea
                className="rosie-input rosie-textarea"
                placeholder="Color, consistency, anything notable..."
                value={diaperNote}
                onChange={e => setDiaperNote(e.target.value)}
              />
            </div>

            <button className="rosie-btn-primary" onClick={handleSaveDiaper}>
              Save Diaper
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default RosieQuickLog;
