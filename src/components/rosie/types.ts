export interface BabyProfile {
  name: string;
  birthDate: string; // ISO date string
  gender?: 'boy' | 'girl' | 'other';
  avatarEmoji?: string;
  avatarImage?: string; // Base64 encoded image data URL
  avatarType?: 'emoji' | 'image'; // Which avatar to display
  // Growth measurements
  birthWeight?: number; // in oz or grams
  birthLength?: number; // in inches or cm
  weightUnit?: 'oz' | 'lb' | 'g' | 'kg';
  lengthUnit?: 'in' | 'cm';
}

export interface GrowthMeasurement {
  id: string;
  timestamp: string; // ISO date string
  weight?: number; // in oz or grams based on unit
  length?: number; // in inches or cm based on unit
  headCircumference?: number; // in inches or cm
  note?: string;
}

export interface TimelineEvent {
  id: string;
  timestamp: string; // ISO date string - when the event was logged
  type: 'feed' | 'sleep' | 'diaper' | 'note';

  // Start/End times for timed events
  startTime?: string; // ISO date string
  endTime?: string; // ISO date string

  // Feed-specific
  feedType?: 'breast' | 'bottle' | 'solid';
  feedSide?: 'left' | 'right' | 'both';
  feedAmount?: number; // oz or ml
  feedDuration?: number; // total minutes
  feedLeftDuration?: number; // minutes on left side
  feedRightDuration?: number; // minutes on right side
  feedLastSide?: 'left' | 'right'; // which side was used last (for reminder)

  // Sleep-specific
  sleepType?: 'nap' | 'night';
  sleepDuration?: number; // minutes
  sleepQuality?: 'good' | 'restless' | 'poor';

  // Diaper-specific
  diaperType?: 'wet' | 'dirty' | 'both';

  // Note
  note?: string;

  // Metadata
  caregiver?: string;
}

export interface ActiveTimer {
  type: 'feed' | 'sleep';
  startTime: string; // ISO date string

  // Feed timer specific
  feedType?: 'breast' | 'bottle';
  currentSide?: 'left' | 'right';
  leftStartTime?: string;
  leftDuration?: number; // accumulated seconds
  rightStartTime?: string;
  rightDuration?: number; // accumulated seconds

  // Sleep timer specific
  sleepType?: 'nap' | 'night';
}

export interface ChatMessage {
  id: string;
  timestamp: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface CaregiverNote {
  id: string;
  timestamp: string;
  content: string;
  caregiver?: string;
  linkedEventId?: string;
}

export interface RosieData {
  baby: BabyProfile;
  timeline: TimelineEvent[];
  chatHistory: ChatMessage[];
  caregiverNotes: CaregiverNote[];
  growthMeasurements?: GrowthMeasurement[]; // Weight/height history
  activeTimer?: ActiveTimer; // Currently running timer
  lastFeedSide?: 'left' | 'right'; // Remember which side was last for breastfeeding
}

export interface DevelopmentalInfo {
  ageInDays: number;
  ageInWeeks: number;
  ageInMonths: number;
  ageDisplay: string;
  weekNumber: number;
  milestones: string[];
  whatToExpect: string[];
  commonConcerns: string[];
  sleepInfo: {
    totalSleep: string;
    nightSleep: string;
    napCount: string;
    wakeWindow: string;
  };
  feedingInfo: {
    frequency: string;
    amount?: string;
    notes: string[];
  };
  upcomingChanges: string[];
}
