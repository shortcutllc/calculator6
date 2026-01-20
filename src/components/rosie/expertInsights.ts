// Expert insights and parent wellness content
// Sources: Emily Oster (Cribsheet), Dr. Becky Kennedy (Good Inside), AAP, research studies

export interface ExpertInsight {
  topic: string;
  insight: string;
  source: string;
  sourceType: 'research' | 'expert' | 'aap';
}

export interface ParentWellnessContent {
  weekRange: [number, number]; // [startWeek, endWeek]
  howYouMightFeel: string[];
  permissionSlip: string; // "It's okay to..."
  oneThingToday: string;
  selfCareReminder: string;
}

export interface QuickWin {
  activity: string;
  duration: string;
  benefit: string;
  ageAppropriate: [number, number]; // [minWeek, maxWeek]
}

// Expert insights organized by topic
export const expertInsights: Record<string, ExpertInsight[]> = {
  sleep: [
    {
      topic: 'Sleep Training',
      insight: 'Sleep training methods, including cry-it-out, have been studied extensively. The research shows no negative effects on child development, attachment, or behavior.',
      source: 'Emily Oster, Cribsheet',
      sourceType: 'research',
    },
    {
      topic: 'Sleep Location',
      insight: 'Room-sharing (not bed-sharing) for the first 6-12 months is recommended. After that, there\'s no evidence that room-sharing is better or worse.',
      source: 'AAP Guidelines + Emily Oster analysis',
      sourceType: 'aap',
    },
    {
      topic: 'Night Feeds',
      insight: 'Most babies can go 6+ hours without feeding by 4-6 months, but "can" doesn\'t mean "must." Night weaning is a personal choice.',
      source: 'Emily Oster, Cribsheet',
      sourceType: 'research',
    },
    {
      topic: 'Sleep Regressions',
      insight: 'Sleep regressions are actually progressions. Your baby\'s brain is developing, which temporarily disrupts sleep. It\'s a sign of growth, not a setback.',
      source: 'Developmental research',
      sourceType: 'research',
    },
  ],
  feeding: [
    {
      topic: 'Breastfeeding',
      insight: 'Breastfeeding has real benefits, but they\'re more modest than often claimed. Formula-fed babies turn out just fine. Fed is best.',
      source: 'Emily Oster, Cribsheet',
      sourceType: 'research',
    },
    {
      topic: 'Introducing Solids',
      insight: 'Starting solids between 4-6 months is fine. Earlier introduction of allergenic foods (peanuts, eggs) may actually REDUCE allergy risk.',
      source: 'LEAP Study + AAP Guidelines',
      sourceType: 'research',
    },
    {
      topic: 'Feeding Schedule',
      insight: 'Scheduled feeding vs. on-demand feeding: the research doesn\'t show one is definitively better. Do what works for your family.',
      source: 'Emily Oster, Cribsheet',
      sourceType: 'research',
    },
  ],
  behavior: [
    {
      topic: 'Crying',
      insight: 'It\'s okay for babies to cry. You can\'t spoil a baby by responding to them, but you also don\'t damage them by not responding instantly every time.',
      source: 'Dr. Becky Kennedy + Research',
      sourceType: 'expert',
    },
    {
      topic: 'Tantrums',
      insight: 'Your child isn\'t giving you a hard time - they\'re having a hard time. Tantrums are a sign their brain is developing faster than their coping skills.',
      source: 'Dr. Becky Kennedy, Good Inside',
      sourceType: 'expert',
    },
    {
      topic: 'Boundaries',
      insight: 'Being a "sturdy leader" means holding boundaries AND connection. You can be firm and loving at the same time. Kids need both.',
      source: 'Dr. Becky Kennedy, Good Inside',
      sourceType: 'expert',
    },
  ],
  development: [
    {
      topic: 'Milestones',
      insight: 'Milestone ranges are wide for a reason. Most babies who are "late" to walk or talk catch up completely. Early isn\'t better.',
      source: 'Developmental research',
      sourceType: 'research',
    },
    {
      topic: 'Screen Time',
      insight: 'For babies under 18 months, the AAP recommends avoiding screens (except video calls). But occasional exposure won\'t cause harm.',
      source: 'AAP Guidelines',
      sourceType: 'aap',
    },
    {
      topic: 'Tummy Time',
      insight: 'Tummy time is helpful but not mandatory for specific durations. Any time on the belly counts. Work up gradually.',
      source: 'AAP Guidelines',
      sourceType: 'aap',
    },
  ],
};

// Parent wellness content by week range
export const parentWellnessContent: ParentWellnessContent[] = [
  {
    weekRange: [1, 2],
    howYouMightFeel: [
      'Overwhelmed and undersupplied (both are normal)',
      'Hormonal shifts causing mood swings',
      'Like you have no idea what you\'re doing',
      'Weepy - the "baby blues" are real and common',
    ],
    permissionSlip: 'It\'s okay to not feel instantly bonded. It\'s okay to feel scared. It\'s okay to ask for help with EVERYTHING.',
    oneThingToday: 'Take a shower (or at least wash your face). Small acts of self-care matter.',
    selfCareReminder: 'You just created a human. Your only job right now is to feed the baby and recover. Everything else can wait.',
  },
  {
    weekRange: [3, 4],
    howYouMightFeel: [
      'Exhausted on a cellular level',
      'Anxious about doing everything "right"',
      'Isolated, especially if partner returns to work',
      'Moments of joy mixed with moments of doubt',
    ],
    permissionSlip: 'It\'s okay to put the baby down safely and step away when you need a break. It\'s okay to not answer the door.',
    oneThingToday: 'Drink a full glass of water. Hydration affects everything, including mood.',
    selfCareReminder: 'The dishes can wait. Sleep when baby sleeps isn\'t always possible, but rest when you can is.',
  },
  {
    weekRange: [5, 6],
    howYouMightFeel: [
      'Like you\'re in survival mode (you are)',
      'Frustrated that it\'s still this hard',
      'Questioning every decision you make',
      'Touched out and overstimulated',
    ],
    permissionSlip: 'It\'s okay to feel angry or resentful sometimes. These feelings don\'t make you a bad parent. They make you human.',
    oneThingToday: 'Step outside for 5 minutes, even just to the mailbox. Fresh air helps.',
    selfCareReminder: 'Week 6 is often the hardest. If you\'re surviving, you\'re succeeding. This peak will pass.',
  },
  {
    weekRange: [7, 8],
    howYouMightFeel: [
      'Glimmers of a routine emerging',
      'Still tired, but maybe slightly less',
      'Anticipating the 2-month shots',
      'Starting to feel more confident',
    ],
    permissionSlip: 'It\'s okay to start introducing a bottle (if breastfeeding). It\'s okay to let someone else hold the baby.',
    oneThingToday: 'Do one thing that\'s just for you - read an article, listen to a podcast, eat a real meal.',
    selfCareReminder: 'If you\'ve made it 8 weeks, you can make it through anything. The hardest part is behind you.',
  },
  {
    weekRange: [9, 12],
    howYouMightFeel: [
      'More confident in your parenting instincts',
      'Guilty about returning to work (if applicable)',
      'Anxious about the "4 month sleep regression"',
      'Like you\'re finally getting the hang of this',
    ],
    permissionSlip: 'It\'s okay to go back to work and miss your baby. It\'s okay to not go back and miss your old life. Both are valid.',
    oneThingToday: 'Make plans with another adult - even a phone call counts.',
    selfCareReminder: 'The fourth trimester is ending. You survived. Take a moment to acknowledge how far you\'ve come.',
  },
  {
    weekRange: [13, 20],
    howYouMightFeel: [
      'Frustrated if sleep has regressed',
      'Proud of your baby\'s new skills',
      'Eager for more predictability',
      'Wondering about sleep training',
    ],
    permissionSlip: 'It\'s okay to sleep train. It\'s okay not to. The research says both are fine.',
    oneThingToday: 'Take a photo of you WITH your baby, not just of your baby.',
    selfCareReminder: 'The 4-month regression is a brain development milestone. It\'s hard, but it means your baby is growing.',
  },
  {
    weekRange: [21, 30],
    howYouMightFeel: [
      'More like yourself again',
      'Enjoying your baby\'s personality',
      'Nervous about starting solids',
      'Dealing with separation anxiety (theirs and yours)',
    ],
    permissionSlip: 'It\'s okay if solids are messy and slow. It\'s okay if your baby hates purees. There\'s no one right way.',
    oneThingToday: 'Do something physical - even a 10-minute walk or some stretching.',
    selfCareReminder: 'You\'re halfway through the first year. Look how much you\'ve both grown.',
  },
  {
    weekRange: [31, 40],
    howYouMightFeel: [
      'Exhausted from chasing a mobile baby',
      'Proud and terrified in equal measure',
      'Nostalgic for the newborn days (already!)',
      'Ready for more sleep',
    ],
    permissionSlip: 'It\'s okay to use screen time occasionally. It\'s okay to give pouches instead of homemade purees.',
    oneThingToday: 'Put down your phone and just watch your baby play for 5 minutes. They\'re amazing.',
    selfCareReminder: 'Babyproofing is self-care. Every outlet covered is one less thing to worry about.',
  },
  {
    weekRange: [41, 52],
    howYouMightFeel: [
      'Disbelief that a year has passed',
      'Pride in how far you\'ve come',
      'Uncertainty about the toddler phase',
      'Ready for the next chapter',
    ],
    permissionSlip: 'It\'s okay to be sad that babyhood is ending. It\'s okay to be relieved. It\'s okay to feel both.',
    oneThingToday: 'Write down three things you\'re proud of from this year.',
    selfCareReminder: 'You made it through the hardest year. You are your baby\'s perfect parent.',
  },
];

// Quick wins by age
export const quickWins: QuickWin[] = [
  // Newborn (0-4 weeks)
  { activity: '1 minute of tummy time', duration: '1 min', benefit: 'Builds neck strength', ageAppropriate: [1, 4] },
  { activity: 'Narrate a diaper change', duration: '2 min', benefit: 'Language exposure', ageAppropriate: [1, 52] },
  { activity: 'Black and white pictures', duration: '3 min', benefit: 'Visual development', ageAppropriate: [1, 8] },
  { activity: 'Skin-to-skin cuddle', duration: '5 min', benefit: 'Bonding + regulation', ageAppropriate: [1, 12] },

  // 1-2 months
  { activity: 'Sing during a feeding', duration: '3 min', benefit: 'Bonding + language', ageAppropriate: [4, 52] },
  { activity: 'Gentle bicycle legs', duration: '2 min', benefit: 'Relieves gas, motor skills', ageAppropriate: [4, 16] },
  { activity: 'Face-to-face cooing', duration: '3 min', benefit: 'Social development', ageAppropriate: [4, 16] },
  { activity: 'Mirror play', duration: '3 min', benefit: 'Self-awareness', ageAppropriate: [6, 52] },

  // 3-4 months
  { activity: 'Tummy time with toys', duration: '5 min', benefit: 'Strength + reaching', ageAppropriate: [12, 26] },
  { activity: 'Shake a rattle together', duration: '3 min', benefit: 'Cause and effect', ageAppropriate: [12, 30] },
  { activity: 'Read a board book', duration: '3 min', benefit: 'Language + bonding', ageAppropriate: [8, 52] },
  { activity: 'Practice rolling', duration: '5 min', benefit: 'Gross motor skills', ageAppropriate: [14, 26] },

  // 5-7 months
  { activity: 'Peekaboo game', duration: '3 min', benefit: 'Object permanence', ageAppropriate: [20, 52] },
  { activity: 'Explore textures', duration: '5 min', benefit: 'Sensory development', ageAppropriate: [20, 52] },
  { activity: 'Supported sitting play', duration: '5 min', benefit: 'Core strength', ageAppropriate: [20, 30] },
  { activity: 'Clap hands together', duration: '2 min', benefit: 'Motor skills + music', ageAppropriate: [24, 52] },

  // 8-12 months
  { activity: 'Stack and knock blocks', duration: '5 min', benefit: 'Fine motor + cause/effect', ageAppropriate: [32, 52] },
  { activity: 'Practice waving bye-bye', duration: '2 min', benefit: 'Social skills', ageAppropriate: [32, 52] },
  { activity: 'Point and name things', duration: '5 min', benefit: 'Language building', ageAppropriate: [36, 52] },
  { activity: 'Dance party', duration: '3 min', benefit: 'Gross motor + joy', ageAppropriate: [30, 52] },
];

// Get appropriate content for a specific week
export const getParentWellnessForWeek = (week: number): ParentWellnessContent | null => {
  return parentWellnessContent.find(
    content => week >= content.weekRange[0] && week <= content.weekRange[1]
  ) || null;
};

export const getQuickWinsForWeek = (week: number): QuickWin[] => {
  return quickWins
    .filter(win => week >= win.ageAppropriate[0] && week <= win.ageAppropriate[1])
    .slice(0, 4); // Return max 4 activities
};

export const getExpertInsightForTopic = (topic: keyof typeof expertInsights): ExpertInsight | null => {
  const insights = expertInsights[topic];
  if (!insights || insights.length === 0) return null;
  // Return a random insight for variety
  return insights[Math.floor(Math.random() * insights.length)];
};
