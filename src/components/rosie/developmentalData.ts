import { DevelopmentalInfo } from './types';

interface WeekData {
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

// Comprehensive developmental data for weeks 1-52
const weeklyData: Record<number, WeekData> = {
  1: {
    milestones: [
      'Reflexive movements (rooting, sucking, grasping)',
      'Can see 8-12 inches away (perfect distance to your face)',
      'Recognizes your voice from the womb',
      'Prefers high-contrast patterns',
    ],
    whatToExpect: [
      'Sleeping 16-17 hours in short bursts',
      'Feeding every 2-3 hours around the clock',
      'Umbilical cord still attached',
      'Losing birth weight (normal up to 10%)',
      'Jaundice may appear and peak',
    ],
    commonConcerns: [
      'Weight loss up to 10% is normal',
      'Jaundice peaks around day 3-5',
      'Cluster feeding in evenings is normal',
      'Irregular breathing patterns during sleep are normal',
    ],
    sleepInfo: {
      totalSleep: '16-17 hours',
      nightSleep: 'No day/night distinction yet',
      napCount: 'Sleeps in 2-4 hour stretches',
      wakeWindow: '30-45 minutes max',
    },
    feedingInfo: {
      frequency: 'Every 2-3 hours (8-12 times/day)',
      amount: '1-2 oz per bottle feed',
      notes: [
        'Colostrum transitions to mature milk around day 3-5',
        'Watch for 6+ wet diapers by day 5',
        'Weight should stabilize by day 5',
      ],
    },
    upcomingChanges: [
      'Week 2: Umbilical cord will fall off',
      'Week 2-3: May regain birth weight',
      'Week 3: First growth spurt possible',
    ],
  },
  2: {
    milestones: [
      'May briefly lift head during tummy time',
      'Starting to uncurl from fetal position',
      'More alert periods emerging',
      'May start tracking faces briefly',
    ],
    whatToExpect: [
      'Umbilical cord falling off',
      'Skin may be peeling (normal)',
      'More wakeful periods during day',
      'Still no day/night rhythm',
      'Feeding frequency remains high',
    ],
    commonConcerns: [
      'Baby acne may appear',
      'Cradle cap starting',
      'Spitting up is normal if baby is gaining weight',
      'Hiccups are very common',
    ],
    sleepInfo: {
      totalSleep: '15-17 hours',
      nightSleep: 'Still irregular, 2-4 hour stretches',
      napCount: 'Multiple short naps',
      wakeWindow: '30-45 minutes',
    },
    feedingInfo: {
      frequency: 'Every 2-3 hours',
      amount: '2-3 oz per bottle feed',
      notes: [
        'Should be back to birth weight or close',
        'Expect 6-8 wet diapers daily',
        'Cluster feeding continues',
      ],
    },
    upcomingChanges: [
      'Week 3: Possible growth spurt',
      'Week 4: May see first social smile',
      'Weeks 3-4: More alert periods',
    ],
  },
  3: {
    milestones: [
      'Stronger neck muscles',
      'May turn head toward sounds',
      'Hands starting to unfist',
      'More focused eye contact',
    ],
    whatToExpect: [
      'First growth spurt common this week',
      'Increased hunger and fussiness',
      'May seem unsettled for a few days',
      'Cluster feeding intensifies',
      'More awake time during day',
    ],
    commonConcerns: [
      'Growth spurts cause temporary increased feeding',
      'Fussiness during growth spurts is normal',
      'Gas and digestive discomfort common',
      'Sleep may temporarily worsen',
    ],
    sleepInfo: {
      totalSleep: '15-17 hours',
      nightSleep: '2-4 hour stretches',
      napCount: 'Multiple naps',
      wakeWindow: '45-60 minutes',
    },
    feedingInfo: {
      frequency: 'Every 2-3 hours (more during growth spurt)',
      amount: '2-4 oz per bottle feed',
      notes: [
        'Growth spurt may increase demand',
        'Feed on demand during spurts',
        'Spurt typically lasts 2-3 days',
      ],
    },
    upcomingChanges: [
      'Week 4: First real smiles emerging',
      'Week 5-6: Fussiness peaks',
      'Week 6: Another growth spurt',
    ],
  },
  4: {
    milestones: [
      'First true social smiles!',
      'Better head control during tummy time',
      'Smoother body movements',
      'Cooing sounds beginning',
      'Recognizes primary caregivers',
    ],
    whatToExpect: [
      'Social smiling emerges',
      'More engaged eye contact',
      'Starting to distinguish day from night',
      'Longer alert periods',
      'May start to settle into patterns',
    ],
    commonConcerns: [
      'Fussiness increasing (peaks at 6 weeks)',
      '"Witching hour" in evenings is normal',
      'Crying peaks around 6-8 weeks',
      'Still irregular sleep is normal',
    ],
    sleepInfo: {
      totalSleep: '14-17 hours',
      nightSleep: 'May get one 3-4 hour stretch',
      napCount: '4-5 naps',
      wakeWindow: '45-75 minutes',
    },
    feedingInfo: {
      frequency: 'Every 2.5-3.5 hours',
      amount: '3-4 oz per bottle feed',
      notes: [
        'Feeding may become slightly more predictable',
        'Still expect cluster feeding',
        'Growing ~1 oz per day',
      ],
    },
    upcomingChanges: [
      'Week 5-6: Peak fussiness period',
      'Week 6: Growth spurt',
      'Week 8: Fussiness starts decreasing',
    ],
  },
  5: {
    milestones: [
      'Smiling more responsively',
      'Cooing and vowel sounds',
      'Better at tracking moving objects',
      'May bat at hanging toys',
      'Starting to notice own hands',
    ],
    whatToExpect: [
      'Approaching peak fussiness',
      'More interactive during alert times',
      'Better at self-soothing (briefly)',
      'May be more sensitive to environment',
      'Wonder Week 1 may begin',
    ],
    commonConcerns: [
      'This is often the hardest week',
      'Peak crying period approaching',
      'Overstimulation signs increasing',
      'Sleep disruption from developmental leap',
    ],
    sleepInfo: {
      totalSleep: '14-16 hours',
      nightSleep: 'One 4-5 hour stretch possible',
      napCount: '4-5 naps',
      wakeWindow: '60-75 minutes',
    },
    feedingInfo: {
      frequency: 'Every 2.5-3.5 hours',
      amount: '4-5 oz per bottle feed',
      notes: [
        'May feed more due to developmental leap',
        'Comfort nursing/feeding common',
        'Watch for hunger vs comfort cues',
      ],
    },
    upcomingChanges: [
      'Week 6: Peak fussiness + growth spurt',
      'Week 7-8: Improvement begins',
      'Week 8: Longer sleep stretches emerge',
    ],
  },
  6: {
    milestones: [
      'Peak social smiling',
      'Gurgling and laughing sounds',
      'Holds head at 45 degrees in tummy time',
      'Tracks objects smoothly',
      'Discovers hands',
    ],
    whatToExpect: [
      'PEAK FUSSINESS - this is often the hardest',
      'Growth spurt common',
      'Crying typically peaks this week',
      'May feel like nothing works',
      'This. Will. Pass.',
    ],
    commonConcerns: [
      'Peak crying is developmentally normal',
      'Colic diagnosis often happens now',
      '"Purple crying" period',
      'Take breaks - this is survival mode',
    ],
    sleepInfo: {
      totalSleep: '14-16 hours',
      nightSleep: '4-6 hour stretch possible',
      napCount: '4-5 naps',
      wakeWindow: '60-90 minutes',
    },
    feedingInfo: {
      frequency: 'Every 2.5-3.5 hours',
      amount: '4-5 oz per bottle feed',
      notes: [
        'Growth spurt increases hunger',
        'Cluster feeding very common',
        'Baby may seem insatiable - this passes',
      ],
    },
    upcomingChanges: [
      'Week 7-8: Fussiness starts declining',
      'Week 8: Longer sleep stretches',
      'Week 9-10: Much calmer baby emerging',
    ],
  },
  7: {
    milestones: [
      'More engaged social interaction',
      'Laughs and squeals',
      'Stronger neck control',
      'May push up on arms briefly',
      'Interested in mirrors',
    ],
    whatToExpect: [
      'Fussiness starting to decrease',
      'More predictable patterns emerging',
      'Better at entertaining self briefly',
      'Clearer hunger and tired cues',
      'Personality emerging',
    ],
    commonConcerns: [
      'Still fussy but improving',
      'Sleep may still be erratic',
      'Normal to have good and bad days',
      'Every baby is different',
    ],
    sleepInfo: {
      totalSleep: '14-16 hours',
      nightSleep: '4-6 hours possible',
      napCount: '4-5 naps',
      wakeWindow: '75-90 minutes',
    },
    feedingInfo: {
      frequency: 'Every 3-4 hours',
      amount: '4-6 oz per bottle feed',
      notes: [
        'Feeding becoming more efficient',
        'May take larger, less frequent feeds',
        'Spit-up often peaks around now',
      ],
    },
    upcomingChanges: [
      'Week 8: 2-month checkup and vaccines',
      'Week 8-9: Notable improvement in fussiness',
      'Week 10-12: Sleep consolidation begins',
    ],
  },
  8: {
    milestones: [
      'Lifts head 90 degrees during tummy time',
      'Coos in response to you',
      'Follows objects 180 degrees',
      'Bears some weight on legs when held',
      'Opens and closes hands',
    ],
    whatToExpect: [
      '2-month checkup and vaccinations',
      'Fussiness noticeably decreasing',
      'More regular wake/sleep patterns',
      'Better self-soothing emerging',
      'May find thumb/fingers',
    ],
    commonConcerns: [
      'Vaccine reaction (fussy, low fever) normal',
      'Sleep regression possible after vaccines',
      'Still normal to have hard days',
      'Compare to yourself, not other babies',
    ],
    sleepInfo: {
      totalSleep: '14-16 hours',
      nightSleep: '5-6 hours possible',
      napCount: '4 naps',
      wakeWindow: '75-90 minutes',
    },
    feedingInfo: {
      frequency: 'Every 3-4 hours',
      amount: '4-6 oz per bottle feed',
      notes: [
        'May be fussy after vaccines',
        'Comfort feeding after shots is fine',
        'Return to normal within 24-48 hours',
      ],
    },
    upcomingChanges: [
      'Week 9-10: Much calmer baby',
      'Week 12: Growth spurt and Wonder Week',
      'Month 3: "Fourth trimester" ends',
    ],
  },
  9: {
    milestones: [
      'Mini push-ups during tummy time',
      'Reaches for objects (misses often)',
      'Brings hands together at midline',
      'Recognizes familiar faces',
      'Different cries for different needs',
    ],
    whatToExpect: [
      'Much calmer than weeks 5-7',
      'More predictable schedule emerging',
      'Longer stretches of contentment',
      'More interactive and fun',
      'Easier to read their cues',
    ],
    commonConcerns: [
      'Sleep still varies - this is normal',
      'May resist naps as world gets interesting',
      'Drooling increasing (not always teeth)',
      'Growth continues rapidly',
    ],
    sleepInfo: {
      totalSleep: '14-15 hours',
      nightSleep: '6-8 hours possible',
      napCount: '3-4 naps',
      wakeWindow: '90 minutes',
    },
    feedingInfo: {
      frequency: 'Every 3-4 hours',
      amount: '5-6 oz per bottle feed',
      notes: [
        'More efficient feeding sessions',
        'May go longer between feeds',
        'Night feeds may reduce naturally',
      ],
    },
    upcomingChanges: [
      'Week 10-11: Sleep consolidating',
      'Week 12: Growth spurt coming',
      'Week 12: Wonder Week 3',
    ],
  },
  10: {
    milestones: [
      'Holds head steady when upright',
      'Actively reaches for toys',
      'Laughs out loud',
      'May roll from tummy to back',
      'Explores toys with mouth',
    ],
    whatToExpect: [
      'Longer sleep stretches at night',
      'More predictable daytime routine',
      'Enjoys social interaction',
      'May fight sleep as overtired',
      'Drooling and mouthing increasing',
    ],
    commonConcerns: [
      'Fighting naps is common',
      'Watch for overtired signs',
      'Early rolling can disrupt sleep',
      'Hands in mouth constantly (normal)',
    ],
    sleepInfo: {
      totalSleep: '14-15 hours',
      nightSleep: '6-8 hours',
      napCount: '3-4 naps',
      wakeWindow: '90-105 minutes',
    },
    feedingInfo: {
      frequency: 'Every 3-4 hours',
      amount: '5-7 oz per bottle feed',
      notes: [
        'May drop a night feed naturally',
        'Growing more efficient at eating',
        'Still too early for solids',
      ],
    },
    upcomingChanges: [
      'Week 11-12: Sleep improvements',
      'Week 12: Wonder Week 3',
      'Month 4: Big developmental leap',
    ],
  },
  11: {
    milestones: [
      'May roll both directions',
      'Grasps objects intentionally',
      'Studies faces intently',
      'Babbling with consonants starting',
      'Shows preference for certain toys',
    ],
    whatToExpect: [
      'Approaching end of fourth trimester',
      'More independent play moments',
      'Clear sleep and feeding patterns',
      'Enjoys cause and effect toys',
      'Very social and engaged',
    ],
    commonConcerns: [
      'Rolling disrupting sleep is common',
      'May resist swaddle (time to transition)',
      'Separation anxiety may begin',
      'Overstimulation still possible',
    ],
    sleepInfo: {
      totalSleep: '14-15 hours',
      nightSleep: '7-9 hours possible',
      napCount: '3-4 naps',
      wakeWindow: '90-120 minutes',
    },
    feedingInfo: {
      frequency: 'Every 3-4 hours',
      amount: '5-7 oz per bottle feed',
      notes: [
        'Feeding patterns well established',
        'May show interest in watching you eat',
        'Still 4-6 weeks from solid food',
      ],
    },
    upcomingChanges: [
      'Week 12: Growth spurt + Wonder Week',
      'Month 3: Fourth trimester ends!',
      'Month 4: 4-month sleep regression',
    ],
  },
  12: {
    milestones: [
      'Good head control',
      'Rolls both ways',
      'Brings objects to mouth',
      'Social butterfly - loves interaction',
      'May bear weight on legs',
    ],
    whatToExpect: [
      'FOURTH TRIMESTER COMPLETE!',
      'Growth spurt common',
      'Wonder Week 3 (smooth transitions)',
      'Much more predictable baby',
      'Sleep consolidation continues',
    ],
    commonConcerns: [
      'Growth spurt increases hunger',
      'Wonder Week may cause fussiness',
      '4-month regression coming soon',
      'Time to transition from swaddle if rolling',
    ],
    sleepInfo: {
      totalSleep: '14-15 hours',
      nightSleep: '8-10 hours possible (with feeds)',
      napCount: '3-4 naps',
      wakeWindow: '90-120 minutes',
    },
    feedingInfo: {
      frequency: 'Every 3-4 hours',
      amount: '5-7 oz per bottle feed',
      notes: [
        'Growth spurt may increase demand',
        'Feeding efficiency continues improving',
        'Approaching solid food age (4-6 months)',
      ],
    },
    upcomingChanges: [
      'Month 4: 4-month sleep regression',
      'Month 4: Wonder Week 4 (events)',
      'Month 4: May start showing interest in food',
    ],
  },
  // Continue with months 4-12...
  16: {
    milestones: [
      'May start rolling back to tummy',
      'Improved hand-eye coordination',
      'Recognizes name',
      'Expresses more emotions',
      'May start teething',
    ],
    whatToExpect: [
      '4-MONTH SLEEP REGRESSION',
      'Sleep cycles maturing (lighter sleep)',
      'More night wakings temporarily',
      'Growth spurt possible',
      'Wonder Week 4 (Events)',
    ],
    commonConcerns: [
      'Sleep regression can last 2-6 weeks',
      'Not a setback - brain is maturing',
      'Maintain consistent routines',
      'This too shall pass',
    ],
    sleepInfo: {
      totalSleep: '14-15 hours',
      nightSleep: 'May regress temporarily',
      napCount: '3-4 naps',
      wakeWindow: '1.5-2 hours',
    },
    feedingInfo: {
      frequency: 'Every 3-4 hours',
      amount: '5-7 oz per bottle feed',
      notes: [
        'May want to feed more during regression',
        'Watch for signs of solid food readiness',
        'Discuss with pediatrician at 4-month visit',
      ],
    },
    upcomingChanges: [
      'Week 18-19: Sleep may improve',
      'Month 5: Wonder Week 5 (relationships)',
      'Month 5-6: Likely starting solids',
    ],
  },
  // Add representative weeks for key milestones
  20: {
    milestones: [
      'Sits with support',
      'Reaches for objects accurately',
      'Transfers toys between hands',
      'Babbles with varied sounds',
      'Shows solid food readiness',
    ],
    whatToExpect: [
      'May be ready to start solids',
      'More mobile and curious',
      'Sleep may be stabilizing',
      'Teething may begin or continue',
      'Very social and engaged',
    ],
    commonConcerns: [
      'Teething discomfort varies greatly',
      'Sleep still variable is normal',
      'Starting solids is messy and slow',
      'Constipation when starting solids',
    ],
    sleepInfo: {
      totalSleep: '13-14 hours',
      nightSleep: '10-11 hours (with possible feeds)',
      napCount: '3 naps',
      wakeWindow: '2-2.5 hours',
    },
    feedingInfo: {
      frequency: 'Every 3-4 hours + solids',
      amount: '6-8 oz per bottle feed',
      notes: [
        'Introduce single-ingredient purees',
        'Milk/formula still primary nutrition',
        'Start with 1-2 tbsp once daily',
      ],
    },
    upcomingChanges: [
      'Month 6: May sit independently',
      'Month 6: More mobile',
      'Month 7: Stranger anxiety peaks',
    ],
  },
  26: {
    milestones: [
      'Sits independently',
      'May start scooting or crawling',
      'Pincer grasp developing',
      'Says "mama" and "dada" (non-specific)',
      'Understands object permanence',
    ],
    whatToExpect: [
      '6-month checkup',
      'More active and mobile',
      'Separation anxiety increasing',
      'Solid foods progressing',
      'May be ready for 2 naps',
    ],
    commonConcerns: [
      'Stranger/separation anxiety normal',
      'Sleep disrupted by mobility',
      'Teething often in full swing',
      'Comparison trap intensifies',
    ],
    sleepInfo: {
      totalSleep: '13-14 hours',
      nightSleep: '10-11 hours',
      napCount: '2-3 naps (transitioning)',
      wakeWindow: '2-3 hours',
    },
    feedingInfo: {
      frequency: 'Every 4 hours + solids 2x daily',
      amount: '6-8 oz per bottle feed',
      notes: [
        'Can try more textures',
        'Introduce protein sources',
        'Water with meals okay',
      ],
    },
    upcomingChanges: [
      'Month 7: Crawling likely',
      'Month 8: Pulling to stand',
      'Month 8-9: Sleep may disrupt with mobility',
    ],
  },
  35: {
    milestones: [
      'Crawling confidently',
      'Pulling to stand',
      'Cruising along furniture',
      'Says 1-2 words with meaning',
      'Understands "no"',
    ],
    whatToExpect: [
      'Very mobile and curious',
      'Into everything',
      'Babyproofing essential',
      'Sleep may regress with skills',
      'Separation anxiety continues',
    ],
    commonConcerns: [
      '8-10 month sleep regression common',
      'Standing in crib at night',
      'Refusing solids temporarily normal',
      'Comparison to walkers unnecessary',
    ],
    sleepInfo: {
      totalSleep: '13-14 hours',
      nightSleep: '10-11 hours',
      napCount: '2 naps',
      wakeWindow: '3-3.5 hours',
    },
    feedingInfo: {
      frequency: 'Every 4-5 hours + 3 meals',
      amount: '6-8 oz per bottle feed',
      notes: [
        'More finger foods',
        'Three meals plus snacks',
        'Cup practice encouraged',
      ],
    },
    upcomingChanges: [
      'Month 9-10: Walking possible',
      'Month 12: Transition to whole milk',
      'Month 12: 1-year checkup',
    ],
  },
  44: {
    milestones: [
      'May take first steps',
      'Points to things',
      'Uses simple gestures',
      'Says several words',
      'Follows simple instructions',
    ],
    whatToExpect: [
      'Walking or close to it',
      'Very independent minded',
      'Tests boundaries',
      'Language explosion starting',
      'May transition to one nap',
    ],
    commonConcerns: [
      'Not walking yet is normal (9-18 months)',
      'One nap transition can be rough',
      'Pickier eating emerging',
      'Tantrums beginning',
    ],
    sleepInfo: {
      totalSleep: '12-14 hours',
      nightSleep: '10-11 hours',
      napCount: '1-2 naps (transitioning)',
      wakeWindow: '3.5-4 hours (or one longer)',
    },
    feedingInfo: {
      frequency: '3 meals + 2 snacks',
      amount: 'Approaching transition to whole milk',
      notes: [
        'Table food mostly',
        'Self-feeding improving',
        'Planning bottle/breast weaning',
      ],
    },
    upcomingChanges: [
      'Month 12: 1-year checkup',
      'Month 12: Whole milk transition',
      'Month 12-15: Walking confidently',
    ],
  },
  52: {
    milestones: [
      'Walking (or very close)',
      'Says 5-10 words',
      'Follows simple directions',
      'Shows affection',
      'Plays alongside others',
    ],
    whatToExpect: [
      'HAPPY FIRST BIRTHDAY!',
      '1-year checkup',
      'Transition to whole milk',
      'Toddler behaviors emerging',
      'You survived the first year!',
    ],
    commonConcerns: [
      'Weaning process varies greatly',
      'Sleep still not "perfect" is normal',
      'Pickier eating phase common',
      'You did an amazing job',
    ],
    sleepInfo: {
      totalSleep: '12-14 hours',
      nightSleep: '10-12 hours',
      napCount: '1-2 naps',
      wakeWindow: '4-5 hours',
    },
    feedingInfo: {
      frequency: '3 meals + 2 snacks + milk',
      amount: '16-24 oz whole milk daily',
      notes: [
        'Whole milk replaces formula',
        'Eating what family eats',
        'Cup transition encouraged',
      ],
    },
    upcomingChanges: [
      'Welcome to toddlerhood!',
      'Language will explode soon',
      'Walking will become running',
    ],
  },
};

// Generate default data for any week not explicitly defined
const getDefaultWeekData = (week: number): WeekData => {
  // Determine approximate developmental stage
  if (week <= 12) {
    return weeklyData[12]; // Use week 12 as template for early weeks
  } else if (week <= 26) {
    return weeklyData[20]; // Use week 20 as template for months 4-6
  } else if (week <= 39) {
    return weeklyData[35]; // Use week 35 as template for months 7-9
  } else {
    return weeklyData[44]; // Use week 44 as template for months 10-12
  }
};

const getWeekData = (week: number): WeekData => {
  // Clamp to 1-52 range
  const clampedWeek = Math.max(1, Math.min(52, week));

  // Return specific week data if available, otherwise interpolate
  if (weeklyData[clampedWeek]) {
    return weeklyData[clampedWeek];
  }

  // Find closest defined week
  const definedWeeks = Object.keys(weeklyData).map(Number).sort((a, b) => a - b);
  const closestWeek = definedWeeks.reduce((prev, curr) =>
    Math.abs(curr - clampedWeek) < Math.abs(prev - clampedWeek) ? curr : prev
  );

  return weeklyData[closestWeek] || getDefaultWeekData(clampedWeek);
};

export const getDevelopmentalInfo = (birthDateString: string): DevelopmentalInfo => {
  const birthDate = new Date(birthDateString);
  const today = new Date();

  // Calculate age in days
  const ageInMs = today.getTime() - birthDate.getTime();
  const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));
  const ageInWeeks = Math.floor(ageInDays / 7);
  const ageInMonths = Math.floor(ageInDays / 30.44); // Average days per month

  // Format age display
  let ageDisplay: string;
  if (ageInDays < 14) {
    ageDisplay = `${ageInDays} day${ageInDays !== 1 ? 's' : ''} old`;
  } else if (ageInWeeks < 12) {
    const remainingDays = ageInDays % 7;
    ageDisplay = `${ageInWeeks} week${ageInWeeks !== 1 ? 's' : ''}${remainingDays > 0 ? `, ${remainingDays} day${remainingDays !== 1 ? 's' : ''}` : ''} old`;
  } else {
    const months = Math.floor(ageInDays / 30.44);
    const remainingDays = Math.floor(ageInDays % 30.44);
    if (remainingDays > 0) {
      ageDisplay = `${months} month${months !== 1 ? 's' : ''}, ${remainingDays} day${remainingDays !== 1 ? 's' : ''} old`;
    } else {
      ageDisplay = `${months} month${months !== 1 ? 's' : ''} old`;
    }
  }

  // Get week-specific data (week 1 = days 1-7, etc.)
  const weekNumber = Math.max(1, ageInWeeks + 1); // Week 1 starts at birth
  const weekData = getWeekData(weekNumber);

  return {
    ageInDays,
    ageInWeeks,
    ageInMonths,
    ageDisplay,
    weekNumber: Math.min(weekNumber, 52),
    ...weekData,
  };
};

export const formatTimeAgo = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
};

export const formatTime = (timestamp: string): string => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};
