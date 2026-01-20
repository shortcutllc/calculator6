// Wonder Weeks / Developmental Leaps Data
// Based on research by Hetty van de Rijt and Frans Plooij
// Note: Leaps are calculated from DUE DATE, not birth date

export interface LeapInfo {
  leapNumber: number;
  name: string;
  subtitle: string;
  startWeek: number; // Week when fussiness may begin
  peakWeek: number; // Peak of the leap
  endWeek: number; // When "sunny" period begins
  description: string;
  whatBabyLearns: string[];
  signsOfLeap: string[];
  howToHelp: string[];
  newSkillsAfter: string[];
}

export const leaps: LeapInfo[] = [
  {
    leapNumber: 1,
    name: 'The World of Sensations',
    subtitle: 'Changing Sensations',
    startWeek: 5,
    peakWeek: 5,
    endWeek: 6,
    description: 'Your baby\'s senses are becoming more refined. They\'re taking in the world in a whole new way.',
    whatBabyLearns: [
      'More aware of internal sensations',
      'Notices changes in environment more',
      'Metabolism changes affecting digestion',
    ],
    signsOfLeap: [
      'Cries more and is harder to soothe',
      'Wants to be held more',
      'May sleep poorly',
      'May feed poorly or want to feed constantly',
    ],
    howToHelp: [
      'Hold baby close - skin-to-skin if possible',
      'Reduce stimulation during fussy periods',
      'Trust that this is temporary (usually 1-2 days)',
    ],
    newSkillsAfter: [
      'More alert and aware',
      'Better at seeing faces',
      'May smile socially soon',
    ],
  },
  {
    leapNumber: 2,
    name: 'The World of Patterns',
    subtitle: 'Recognizing Patterns',
    startWeek: 8,
    peakWeek: 8,
    endWeek: 9,
    description: 'Baby begins to recognize simple patterns in their world - in sights, sounds, and movements.',
    whatBabyLearns: [
      'Recognizes patterns in what they see',
      'Notices repetitive sounds and movements',
      'Discovers their own hands and feet',
    ],
    signsOfLeap: [
      'More clingy than usual',
      'Cries more, especially when put down',
      'Sleeps poorly or wants to feed more',
      'May seem to "regress" temporarily',
    ],
    howToHelp: [
      'Offer high-contrast patterns to look at',
      'Sing repetitive songs',
      'Be patient - this typically lasts 3-7 days',
      'Remember: clinginess is a sign of healthy attachment',
    ],
    newSkillsAfter: [
      'Watches moving objects intently',
      'May bat at hanging toys',
      'More interested in surroundings',
      'Social smiling more frequent',
    ],
  },
  {
    leapNumber: 3,
    name: 'The World of Smooth Transitions',
    subtitle: 'Smooth Movements',
    startWeek: 12,
    peakWeek: 12,
    endWeek: 13,
    description: 'Baby learns that the world flows smoothly - movements, sounds, and sights transition rather than jump.',
    whatBabyLearns: [
      'Movements can be smooth, not jerky',
      'Sounds have melody and flow',
      'Actions have consequences',
    ],
    signsOfLeap: [
      'Fussier than usual',
      'Sleep disrupted',
      'May want more feeding/comfort',
      'Startles more easily',
    ],
    howToHelp: [
      'Play with smooth, flowing movements',
      'Sing songs with varied tones',
      'Gentle rocking and swaying',
      'This often coincides with the 3-month growth spurt',
    ],
    newSkillsAfter: [
      'Smoother arm and leg movements',
      'Tracks objects more smoothly',
      'May reach for toys more deliberately',
      'Coos with varied sounds',
    ],
  },
  {
    leapNumber: 4,
    name: 'The World of Events',
    subtitle: 'Understanding Events',
    startWeek: 15,
    peakWeek: 19,
    endWeek: 20,
    description: 'Baby begins to understand that things happen in sequences - events have beginnings, middles, and ends.',
    whatBabyLearns: [
      'Events have a sequence',
      'Can anticipate what comes next',
      'Understands cause and effect basics',
    ],
    signsOfLeap: [
      'The dreaded "4-month sleep regression"',
      'More clingy and fussy',
      'May refuse the bottle or breast',
      'Sleep patterns completely disrupted',
    ],
    howToHelp: [
      'This is the HARDEST leap for most parents',
      'Sleep regression is actually brain maturation',
      'Maintain consistent routines',
      'Consider gentle sleep training after leap ends',
      'Emily Oster\'s research: sleep training is safe and effective',
    ],
    newSkillsAfter: [
      'Anticipates feeding when sees bottle/breast',
      'Gets excited when sees familiar faces',
      'Better hand-eye coordination',
      'May start reaching for toys deliberately',
    ],
  },
  {
    leapNumber: 5,
    name: 'The World of Relationships',
    subtitle: 'Understanding Relationships',
    startWeek: 23,
    peakWeek: 26,
    endWeek: 27,
    description: 'Baby understands relationships between things - distance, position, and how objects relate to each other.',
    whatBabyLearns: [
      'Objects have relationships to each other',
      'Distance and space concepts',
      'Things can go IN other things',
    ],
    signsOfLeap: [
      'Separation anxiety begins',
      'Stranger anxiety may appear',
      'Very clingy to primary caregivers',
      'Sleep disrupted again',
    ],
    howToHelp: [
      'Practice brief separations and reunions',
      'Play peekaboo (object permanence!)',
      'Don\'t sneak away - say goodbye briefly',
      'Separation anxiety is a sign of healthy attachment',
    ],
    newSkillsAfter: [
      'Understands object permanence better',
      'Can find partially hidden objects',
      'Puts things in containers',
      'More deliberate movements',
    ],
  },
  {
    leapNumber: 6,
    name: 'The World of Categories',
    subtitle: 'Sorting and Grouping',
    startWeek: 34,
    peakWeek: 37,
    endWeek: 38,
    description: 'Baby learns to categorize - dogs are dogs, cats are cats, food is food.',
    whatBabyLearns: [
      'Things belong to groups',
      'Can recognize categories',
      'Begins to understand words for categories',
    ],
    signsOfLeap: [
      'May become picky about foods',
      'Stranger anxiety peaks',
      'Wants mama/dada specifically',
      'Sleep may be disrupted',
    ],
    howToHelp: [
      'Name categories: "Look, a dog! And another dog!"',
      'Sort toys by type together',
      'Read books about categories (animals, vehicles)',
      'Be patient with food preferences',
    ],
    newSkillsAfter: [
      'Points at things and looks to you',
      'Understands more words',
      'May sort objects by type',
      'Shows clear preferences',
    ],
  },
  {
    leapNumber: 7,
    name: 'The World of Sequences',
    subtitle: 'Understanding Sequences',
    startWeek: 42,
    peakWeek: 46,
    endWeek: 47,
    description: 'Baby understands that things happen in order - first this, then that.',
    whatBabyLearns: [
      'Actions happen in sequences',
      'Can follow simple routines',
      'Understands "first... then..."',
    ],
    signsOfLeap: [
      'Frustrated when things don\'t go as expected',
      'May have tantrums',
      'Sleep disrupted',
      'Tests boundaries more',
    ],
    howToHelp: [
      'Narrate sequences: "First we put on socks, then shoes"',
      'Keep routines consistent',
      'Be patient with early tantrum attempts',
      'This is when they become a "toddler"',
    ],
    newSkillsAfter: [
      'Follows simple instructions',
      'Can do simple two-step tasks',
      'More cooperative with routines',
      'May start early pretend play',
    ],
  },
  {
    leapNumber: 8,
    name: 'The World of Programs',
    subtitle: 'Flexible Sequences',
    startWeek: 51,
    peakWeek: 55,
    endWeek: 56,
    description: 'Baby understands that sequences can be flexible - there are different ways to achieve the same goal.',
    whatBabyLearns: [
      'Multiple ways to do things',
      'Can problem-solve',
      'Goals can be achieved different ways',
    ],
    signsOfLeap: [
      'Strong opinions about HOW things should be done',
      'Tantrums when things don\'t go their way',
      'Very determined and persistent',
      'May seem defiant',
    ],
    howToHelp: [
      'Offer choices: "Do you want the red cup or blue cup?"',
      'Let them try their way first when safe',
      'Stay calm during tantrums',
      'This is independence emerging, not defiance',
    ],
    newSkillsAfter: [
      'More creative problem-solving',
      'Can use tools',
      'Starts to understand rules',
      'More cooperative (eventually!)',
    ],
  },
  {
    leapNumber: 9,
    name: 'The World of Principles',
    subtitle: 'Understanding Principles',
    startWeek: 60,
    peakWeek: 64,
    endWeek: 65,
    description: 'Toddler begins to understand abstract principles - fairness, mine vs yours, rules.',
    whatBabyLearns: [
      'Abstract concepts like "mine"',
      'Basic principles and rules',
      'Cause and effect at a deeper level',
    ],
    signsOfLeap: [
      '"Mine!" phase begins',
      'Testing all the rules',
      'Emotional outbursts',
      'Needs more reassurance',
    ],
    howToHelp: [
      'Name emotions: "You\'re feeling frustrated"',
      'Be consistent with rules',
      'This is normal toddler development',
      'Dr. Becky: "Kids aren\'t giving you a hard time, they\'re having a hard time"',
    ],
    newSkillsAfter: [
      'Uses "mine" and "yours"',
      'Starts to follow rules (sometimes)',
      'More empathy emerging',
      'Pretend play becomes complex',
    ],
  },
  {
    leapNumber: 10,
    name: 'The World of Systems',
    subtitle: 'Understanding Systems',
    startWeek: 71,
    peakWeek: 75,
    endWeek: 76,
    description: 'Toddler understands systems - family, society, right and wrong.',
    whatBabyLearns: [
      'Understands family as a system',
      'Grasps social rules',
      'Develops conscience',
    ],
    signsOfLeap: [
      'Very aware of fairness',
      'May become anxious about rules',
      'Needs lots of reassurance',
      'Big emotions about small things',
    ],
    howToHelp: [
      'Talk about family and relationships',
      'Be consistent but flexible',
      'Validate their big feelings',
      'This is the last "leap" - you made it!',
    ],
    newSkillsAfter: [
      'Understands family roles',
      'More socially aware',
      'Can play cooperatively',
      'Ready for preschool!',
    ],
  },
];

export interface LeapStatus {
  currentLeap: LeapInfo | null;
  isInLeap: boolean;
  isSunnyPeriod: boolean;
  leapPhase: 'before' | 'starting' | 'peak' | 'ending' | 'sunny' | 'between';
  daysUntilNextLeap: number | null;
  nextLeap: LeapInfo | null;
  previousLeap: LeapInfo | null;
  progressThroughLeap: number; // 0-100
}

export const getLeapStatus = (ageInWeeks: number): LeapStatus => {
  // Find current, next, and previous leaps
  let currentLeap: LeapInfo | null = null;
  let nextLeap: LeapInfo | null = null;
  let previousLeap: LeapInfo | null = null;
  let isInLeap = false;
  let isSunnyPeriod = false;
  let leapPhase: LeapStatus['leapPhase'] = 'between';
  let progressThroughLeap = 0;

  for (let i = 0; i < leaps.length; i++) {
    const leap = leaps[i];

    // Check if we're in this leap
    if (ageInWeeks >= leap.startWeek && ageInWeeks <= leap.endWeek) {
      currentLeap = leap;
      isInLeap = true;

      // Determine phase within leap
      const leapDuration = leap.endWeek - leap.startWeek;
      const weeksIntoLeap = ageInWeeks - leap.startWeek;
      progressThroughLeap = Math.round((weeksIntoLeap / leapDuration) * 100);

      if (ageInWeeks < leap.peakWeek) {
        leapPhase = weeksIntoLeap < 1 ? 'starting' : 'before';
      } else if (ageInWeeks === leap.peakWeek) {
        leapPhase = 'peak';
      } else {
        leapPhase = 'ending';
      }

      // Next leap is the one after this
      if (i < leaps.length - 1) {
        nextLeap = leaps[i + 1];
      }
      // Previous leap
      if (i > 0) {
        previousLeap = leaps[i - 1];
      }
      break;
    }

    // Check if we're in sunny period after this leap
    if (i < leaps.length - 1) {
      const nextLeapStart = leaps[i + 1].startWeek;
      if (ageInWeeks > leap.endWeek && ageInWeeks < nextLeapStart) {
        isSunnyPeriod = true;
        leapPhase = 'sunny';
        previousLeap = leap;
        nextLeap = leaps[i + 1];
        break;
      }
    }

    // Track previous and next for between-leap periods
    if (ageInWeeks < leap.startWeek && !nextLeap) {
      nextLeap = leap;
      if (i > 0) {
        previousLeap = leaps[i - 1];
      }
    }
  }

  // Calculate days until next leap
  let daysUntilNextLeap: number | null = null;
  if (nextLeap && !isInLeap) {
    const weeksUntil = nextLeap.startWeek - ageInWeeks;
    daysUntilNextLeap = Math.round(weeksUntil * 7);
  }

  return {
    currentLeap,
    isInLeap,
    isSunnyPeriod,
    leapPhase,
    daysUntilNextLeap,
    nextLeap,
    previousLeap,
    progressThroughLeap,
  };
};
