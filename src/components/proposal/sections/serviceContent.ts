// Copy + content shared across V2's "Why Shortcut" / Benefits / What's
// included / Features sections. Sourced verbatim from the V1
// *ProposalContent components so the V2 redesign preserves every claim.
//
// Imports stay typed to a controlled icon-name string union so the renderer
// can map them to lucide-react components without leaking the lib here.

export type SectionIconName =
  | 'Heart'
  | 'Sparkles'
  | 'Users'
  | 'Shield'
  | 'Clock'
  | 'CheckCircle'
  | 'Camera'
  | 'Image'
  | 'Brain'
  | 'FileText'
  | 'Award'
  | 'Palette';

export interface WhyShortcutBullet {
  title: string;
  description: string;
}

export interface BenefitCard {
  iconName: SectionIconName;
  title: string;
  description: string;
}

export interface WhatsIncludedItem {
  iconName: SectionIconName | 'custom';
  /** Optional asset path for the V1 service icon (only used when iconName === 'custom') */
  iconSrc?: string;
  title: string;
  description: string;
}

export interface ServiceSectionContent {
  /** Service display label used in section headings (e.g. "Massage") */
  label: string;
  whyShortcut: WhyShortcutBullet[];
  benefitsHeading: string;
  benefits: BenefitCard[];
  whatsIncludedHeading: string;
  whatsIncluded: WhatsIncludedItem[];
  featuresHeading: string;
  features: string[];
}

// ---------------------------------------------------------------------------
// Unified (multi-service) Why Shortcut copy. Used when a single proposal mixes
// multiple service types; the per-service version is too repetitive in that
// case, so V1 swaps in this universal version. Mirrors
// UnifiedProposalSections.tsx → UnifiedWhyShortcutSection.
// ---------------------------------------------------------------------------
export const UNIFIED_WHY_SHORTCUT: WhyShortcutBullet[] = [
  {
    title: 'Vetted & Insured Professionals',
    description:
      'Every provider is fully licensed, background-checked, and insured for seamless access to any office building.',
  },
  {
    title: 'All-Inclusive Pricing',
    description:
      'No hidden fees for equipment, setup, or supplies. Everything is included in one transparent price.',
  },
  {
    title: 'Effortless Scheduling',
    description:
      'Easy online booking for employees with automated reminders and flexible appointment management.',
  },
  {
    title: 'Premium Experience',
    description:
      'We bring the spa to your office with professional equipment, premium products, and a relaxing atmosphere.',
  },
];

// ---------------------------------------------------------------------------
// Per-service content. Keys are the canonical service-type slugs from
// SERVICE_DISPLAY in ../data.ts.
// ---------------------------------------------------------------------------
export const SERVICE_CONTENT: Record<string, ServiceSectionContent> = {
  massage: {
    label: 'Massage',
    whyShortcut: [
      {
        title: 'Vetted & Insured Therapists',
        description:
          'Every massage therapist is fully licensed, background-checked, and insured for access to any office building.',
      },
      {
        title: 'Flexible Setup Options',
        description:
          'Choose between chair or table massages to fit your space. Optional privacy screens available for added comfort.',
      },
      {
        title: 'Spa-Like Ambiance',
        description:
          'We create a relaxing atmosphere with soothing music, aromatherapy scents, and customized lighting right in your office.',
      },
      {
        title: 'Therapist Preferences',
        description:
          'Employees can select their preferred therapist gender for maximum comfort during their session.',
      },
    ],
    benefitsHeading: 'Employee Benefits',
    benefits: [
      {
        iconName: 'Heart',
        title: 'Stress Relief',
        description:
          'Immediate tension release and deep relaxation to combat workplace stress',
      },
      {
        iconName: 'Sparkles',
        title: 'Productivity Boost',
        description:
          'Refreshed employees return to work more focused and energized',
      },
      {
        iconName: 'Users',
        title: 'Team Morale',
        description:
          'Shows investment in employee wellbeing and builds company culture',
      },
    ],
    whatsIncludedHeading: "What's Included",
    whatsIncluded: [
      {
        iconName: 'custom',
        iconSrc: '/Holiday Proposal/Our Services/Massage/icon.svg',
        title: 'Sports Massage',
        description: 'Deep tissue work for muscle recovery',
      },
      {
        iconName: 'custom',
        iconSrc: '/Holiday Proposal/Our Services/Massage/icon-2.svg',
        title: 'Compression Massage',
        description: 'Rhythmic pressure for circulation',
      },
      {
        iconName: 'Shield',
        title: 'Privacy Screens',
        description: 'Optional screens for added privacy',
      },
      {
        iconName: 'Clock',
        title: 'Flexible Scheduling',
        description: 'Easy online booking for employees',
      },
    ],
    featuresHeading: 'Every massage event comes with:',
    features: [
      'Chair or table massage options',
      'Relaxing music & aromatherapy',
      'Therapist gender preference',
      'Fully insured professionals',
    ],
  },

  headshot: {
    label: 'Headshot',
    whyShortcut: [
      {
        title: 'Professional Photographers',
        description:
          'Experienced corporate photographers who specialize in professional headshots and know how to make everyone look their best.',
      },
      {
        title: 'All-Inclusive Pricing',
        description:
          'No hidden fees for equipment, transportation, or setup. Everything is included in one transparent price.',
      },
      {
        title: 'Expert Posing Guidance',
        description:
          'Our photographers provide coaching during each session, ensuring natural, confident expressions every time.',
      },
      {
        title: 'Fast Turnaround',
        description:
          'Professionally retouched photos delivered within 5-7 business days, ready for LinkedIn, websites, and company directories.',
      },
    ],
    benefitsHeading: 'Employee Benefits',
    benefits: [
      {
        iconName: 'Image',
        title: 'Professional Image',
        description:
          'Consistent, polished appearance across all company platforms and materials',
      },
      {
        iconName: 'Sparkles',
        title: 'Employee Confidence',
        description:
          'Employees feel valued and look their best in professional photos',
      },
      {
        iconName: 'Users',
        title: 'Brand Consistency',
        description:
          'Unified visual identity across LinkedIn, websites, and directories',
      },
    ],
    whatsIncludedHeading: "What's Included",
    whatsIncluded: [
      {
        iconName: 'Camera',
        title: 'Outfit Guidance',
        description: 'Pre-session consultation on what to wear',
      },
      {
        iconName: 'Palette',
        title: 'Background Selection',
        description: 'Multiple backdrop options to choose from',
      },
      {
        iconName: 'Sparkles',
        title: 'Hair + Makeup Touchups',
        description: 'Optional styling before your session',
      },
      {
        iconName: 'Image',
        title: 'Professional Retouching',
        description: 'Flawless editing included with every photo',
      },
    ],
    featuresHeading: 'Every headshot event comes with:',
    features: [
      'Top-notch lighting setup',
      'Expert posing guidance',
      '5-7 day turnaround',
      'Pre & event day support',
    ],
  },

  facial: {
    label: 'Facial',
    whyShortcut: [
      {
        title: 'Licensed Estheticians',
        description:
          'All estheticians are fully licensed, experienced, and insured for access to any office building.',
      },
      {
        title: 'Premium Skincare Products',
        description:
          'We use only professional-grade, hypoallergenic products suitable for all skin types.',
      },
      {
        title: 'Customized Treatments',
        description:
          'Each facial is tailored to individual skin concerns and preferences for optimal results.',
      },
      {
        title: 'Relaxing Experience',
        description:
          'We create a spa-like atmosphere with soothing music and aromatherapy right in your office.',
      },
    ],
    benefitsHeading: 'Employee Benefits',
    benefits: [
      {
        iconName: 'Sparkles',
        title: 'Glowing Skin',
        description:
          'Professional treatments that leave skin refreshed, radiant, and rejuvenated',
      },
      {
        iconName: 'Heart',
        title: 'Self-Care Break',
        description:
          'A relaxing escape from work stress that employees genuinely appreciate',
      },
      {
        iconName: 'Users',
        title: 'Team Appreciation',
        description:
          "A thoughtful perk that shows employees they're valued and cared for",
      },
    ],
    whatsIncludedHeading: "What's Included",
    whatsIncluded: [
      {
        iconName: 'Sparkles',
        title: 'Express Facial',
        description: 'Quick refresh cleanse & hydration',
      },
      {
        iconName: 'Heart',
        title: 'Signature Facial',
        description: 'Full treatment with extractions',
      },
      {
        iconName: 'Sparkles',
        title: 'LED Light Therapy',
        description: 'Add-on for enhanced results',
      },
      {
        iconName: 'Shield',
        title: 'Mask Treatments',
        description: 'Hydrating & detoxifying options',
      },
    ],
    featuresHeading: 'Every facial event comes with:',
    features: [
      'All skin types welcome',
      'Premium skincare products',
      'Relaxing spa atmosphere',
      'Fully insured professionals',
    ],
  },

  hair: {
    label: 'Hair',
    whyShortcut: [
      {
        title: 'Inclusive Styling',
        description:
          'Our stylists are experienced with all hair types and textures, ensuring everyone looks and feels amazing.',
      },
      {
        title: 'Premium Products',
        description:
          'We use only brand-name, professional-grade styling products for results that last.',
      },
      {
        title: 'Clean & Pristine',
        description:
          'No hair left behind! We leave your space in pristine condition with full sanitation between appointments.',
      },
      {
        title: 'Fully Insured',
        description:
          'All stylists are licensed, insured, and approved for access to any office building.',
      },
    ],
    benefitsHeading: 'Employee Benefits',
    benefits: [
      {
        iconName: 'Sparkles',
        title: 'Event-Ready',
        description:
          'Perfect for headshots, holiday parties, presentations, or any special occasion',
      },
      {
        iconName: 'Clock',
        title: 'Time Savings',
        description:
          'Professional styling without leaving the office or taking personal time',
      },
      {
        iconName: 'Users',
        title: 'Inclusive Options',
        description: 'Services for all hair types, styles, and personal preferences',
      },
    ],
    whatsIncludedHeading: "What's Included",
    whatsIncluded: [
      {
        iconName: 'Sparkles',
        title: 'Barber Cut',
        description: "Professional men's haircuts",
      },
      {
        iconName: 'Sparkles',
        title: 'Beard Trim',
        description: 'Shaping and grooming',
      },
      {
        iconName: 'Palette',
        title: 'Makeup Application',
        description: 'Natural to glamorous looks',
      },
      {
        iconName: 'Sparkles',
        title: 'Salon Cut & Style',
        description: 'Full haircut and styling',
      },
    ],
    featuresHeading: 'Every hair & makeup event comes with:',
    features: [
      'Services for all hair types',
      'Premium brand products',
      'Sanitation between clients',
      'Space left pristine',
    ],
  },

  'hair-makeup': {
    label: 'Hair + Makeup',
    whyShortcut: [
      {
        title: 'Inclusive Styling',
        description:
          'Our stylists are experienced with all hair types and textures, ensuring everyone looks and feels amazing.',
      },
      {
        title: 'Premium Products',
        description:
          'We use only brand-name, professional-grade styling products for results that last.',
      },
      {
        title: 'Clean & Pristine',
        description:
          'No hair left behind! We leave your space in pristine condition with full sanitation between appointments.',
      },
      {
        title: 'Fully Insured',
        description:
          'All stylists are licensed, insured, and approved for access to any office building.',
      },
    ],
    benefitsHeading: 'Employee Benefits',
    benefits: [
      {
        iconName: 'Sparkles',
        title: 'Event-Ready',
        description:
          'Perfect for headshots, holiday parties, presentations, or any special occasion',
      },
      {
        iconName: 'Clock',
        title: 'Time Savings',
        description:
          'Professional styling without leaving the office or taking personal time',
      },
      {
        iconName: 'Users',
        title: 'Inclusive Options',
        description: 'Services for all hair types, styles, and personal preferences',
      },
    ],
    whatsIncludedHeading: "What's Included",
    whatsIncluded: [
      {
        iconName: 'Sparkles',
        title: 'Barber Cut',
        description: "Professional men's haircuts",
      },
      {
        iconName: 'Sparkles',
        title: 'Beard Trim',
        description: 'Shaping and grooming',
      },
      {
        iconName: 'Palette',
        title: 'Makeup Application',
        description: 'Natural to glamorous looks',
      },
      {
        iconName: 'Sparkles',
        title: 'Salon Cut & Style',
        description: 'Full haircut and styling',
      },
    ],
    featuresHeading: 'Every hair & makeup event comes with:',
    features: [
      'Services for all hair types',
      'Premium brand products',
      'Sanitation between clients',
      'Space left pristine',
    ],
  },

  nails: {
    label: 'Nails',
    whyShortcut: [
      {
        title: 'Licensed Nail Technicians',
        description:
          'All technicians are fully licensed, experienced, and insured for access to any office building.',
      },
      {
        title: 'Hygiene First',
        description:
          'Single-use nail kits for every appointment and sanitized metal tools between each client for maximum safety.',
      },
      {
        title: 'Wide Selection',
        description:
          'Over 20 polish colors to choose from, including classic, trendy, and seasonal options.',
      },
      {
        title: 'Relaxing Atmosphere',
        description:
          'We bring the spa to you with soothing music and calming scents for a true pampering experience.',
      },
    ],
    benefitsHeading: 'Employee Benefits',
    benefits: [
      {
        iconName: 'Heart',
        title: 'Self-Care Moment',
        description:
          'A relaxing break from work stress that employees truly appreciate',
      },
      {
        iconName: 'Sparkles',
        title: 'Polished Look',
        description: 'Professional, well-groomed appearance that boosts confidence',
      },
      {
        iconName: 'Users',
        title: 'Team Appreciation',
        description: "A thoughtful perk that shows employees they're valued",
      },
    ],
    whatsIncludedHeading: "What's Included",
    whatsIncluded: [
      {
        iconName: 'Sparkles',
        title: 'Classic Manicure',
        description: 'Shape, buff, cuticle care & polish',
      },
      {
        iconName: 'Sparkles',
        title: 'Gel Manicure',
        description: 'Long-lasting gel polish application',
      },
      {
        iconName: 'Heart',
        title: 'Dry Pedicure',
        description: 'Waterless pedicure perfect for office',
      },
      {
        iconName: 'Shield',
        title: 'Hand Treatments',
        description: 'Moisturizing treatments available',
      },
    ],
    featuresHeading: 'Every nails event comes with:',
    features: [
      '20+ polish colors',
      'Single-use nail kits',
      'Relaxing music & scents',
      'Fully insured professionals',
    ],
  },

  // Headshot-with-hair-makeup uses the headshot content plus a hair note.
  'headshot-hair-makeup': {
    label: 'Hair + Makeup for Headshots',
    whyShortcut: [
      {
        title: 'Professional Photographers',
        description:
          'Experienced corporate photographers who specialize in professional headshots and know how to make everyone look their best.',
      },
      {
        title: 'On-Site Hair + Makeup',
        description:
          'Optional hair styling and makeup application before the camera so every shot looks polished from the first click.',
      },
      {
        title: 'Expert Posing Guidance',
        description:
          'Our photographers provide coaching during each session, ensuring natural, confident expressions every time.',
      },
      {
        title: 'Fast Turnaround',
        description:
          'Professionally retouched photos delivered within 5-7 business days, ready for LinkedIn, websites, and company directories.',
      },
    ],
    benefitsHeading: 'Employee Benefits',
    benefits: [
      {
        iconName: 'Image',
        title: 'Professional Image',
        description:
          'Consistent, polished appearance across all company platforms and materials',
      },
      {
        iconName: 'Sparkles',
        title: 'Employee Confidence',
        description:
          'Employees feel valued and look their best in professional photos',
      },
      {
        iconName: 'Users',
        title: 'Brand Consistency',
        description:
          'Unified visual identity across LinkedIn, websites, and directories',
      },
    ],
    whatsIncludedHeading: "What's Included",
    whatsIncluded: [
      {
        iconName: 'Sparkles',
        title: 'Hair + Makeup Touchups',
        description: 'Optional styling before the camera',
      },
      {
        iconName: 'Camera',
        title: 'Outfit Guidance',
        description: 'Pre-session consultation on what to wear',
      },
      {
        iconName: 'Palette',
        title: 'Background Selection',
        description: 'Multiple backdrop options to choose from',
      },
      {
        iconName: 'Image',
        title: 'Professional Retouching',
        description: 'Flawless editing included with every photo',
      },
    ],
    featuresHeading: 'Every headshot + styling event comes with:',
    features: [
      'Top-notch lighting setup',
      'Hair + makeup touchups',
      '5-7 day turnaround',
      'Pre & event day support',
    ],
  },

  // Mindfulness uses fields below + Phase 5 sidebar / sections. We keep the
  // top-level structure populated for callers that grab the label or render
  // a fallback benefits card.
  mindfulness: {
    label: 'Mindfulness',
    whyShortcut: [
      {
        title: 'Dedicated Facilitator',
        description:
          'Courtney Schulnick, who brings over two decades of experience and will guide every session to ensure continuity and reliability.',
      },
      {
        title: 'Punctual and Prepared Sessions',
        description:
          "Each session is expertly planned and starts promptly, maximizing the value of your team's time.",
      },
      {
        title: 'Effortless Scheduling',
        description:
          "Shortcut's advanced scheduling technology simplifies program management, making the process a breeze for your team.",
      },
    ],
    benefitsHeading: 'Participant Benefits',
    benefits: [
      {
        iconName: 'Brain',
        title: 'Reduced Stress',
        description: 'Improved resilience and stress management capabilities',
      },
      {
        iconName: 'Sparkles',
        title: 'Enhanced Focus',
        description: 'Better decision-making and cognitive performance',
      },
      {
        iconName: 'Heart',
        title: 'Daily Practice',
        description: 'Practical techniques for daily mindfulness integration',
      },
    ],
    whatsIncludedHeading: 'Additional Resources',
    whatsIncluded: [
      {
        iconName: 'FileText',
        title: 'Customized Audio Recordings',
        description:
          'A recording of a guided meditation designed to calm the nervous system and strengthen present moment awareness.',
      },
      {
        iconName: 'FileText',
        title: 'Personalized Handouts & Exercises',
        description:
          'Handouts that compliment the session and offer ways to increasingly weave mindfulness into your daily life.',
      },
    ],
    featuresHeading: 'Every mindfulness session comes with:',
    features: [
      'Live, expert-led practice',
      'Customized to your audience',
      'Resources you can reuse',
      'Single dedicated facilitator',
    ],
  },

  'sound-bath': {
    label: 'Sound Bath',
    whyShortcut: [
      {
        title: 'Vetted Facilitators',
        description:
          'Every facilitator has 200+ hours of sound-healing training. Vetted professionals, not freelancers off a marketplace.',
      },
      {
        title: 'Full Kit Included',
        description:
          'Crystal singing bowls, gong, chimes, and supporting instruments. We bring everything. No client setup.',
      },
      {
        title: 'One Point of Contact',
        description:
          'Booking, prep, and day-of coordination handled for you, with a pre-event planning call to set the intention.',
      },
    ],
    benefitsHeading: 'What your team takes home',
    benefits: [
      {
        iconName: 'Brain',
        title: 'Nervous-System Reset',
        description: 'Lower stress and reactivity that lasts well past the session.',
      },
      {
        iconName: 'Heart',
        title: 'Shared Stillness',
        description: 'A shared experience that asks nothing and gives a lot. No small talk required.',
      },
      {
        iconName: 'Sparkles',
        title: 'An Easy Entry to Mindfulness',
        description: 'A way in for people who would never sign up for meditation.',
      },
    ],
    whatsIncludedHeading: 'What we bring',
    whatsIncluded: [
      {
        iconName: 'CheckCircle',
        title: 'Trained Facilitator',
        description: 'A facilitator with 200+ hours of sound-healing training.',
      },
      {
        iconName: 'CheckCircle',
        title: 'Full Instrument Kit',
        description: 'Crystal singing bowls, gong, chimes, and supporting instruments, plus setup and breakdown.',
      },
      {
        iconName: 'FileText',
        title: 'RSVP Blurb',
        description: 'A Slack or email blurb you can drop in to drive sign-ups.',
      },
    ],
    featuresHeading: 'Format options',
    features: [
      'In-person at your office',
      'Virtual via Zoom, Teams, or Meet',
      'Hybrid: on-site streamed to remote teammates',
    ],
  },

  yoga: {
    label: 'Yoga',
    whyShortcut: [
      {
        title: 'Certified Instructors',
        description: 'RYT-200+ teachers, vetted and consistent across every session.',
      },
      {
        title: 'Chair Option Needs Nothing',
        description: 'No equipment, no floor clearance, no change of clothes. It runs in any conference room.',
      },
      {
        title: 'Same Instructor Each Time',
        description: 'The same teacher across recurring sessions builds a rhythm and real participation.',
      },
    ],
    benefitsHeading: 'What it does for the team',
    benefits: [
      {
        iconName: 'Heart',
        title: 'Posture Relief',
        description: 'Eases desk strain in the neck, shoulders, and back.',
      },
      {
        iconName: 'Sparkles',
        title: 'Afternoon Energy',
        description: 'A reset for the 2 to 3pm slump. No coffee required.',
      },
      {
        iconName: 'Brain',
        title: 'Stress Reduction',
        description: 'Parasympathetic activation and a calmer afternoon.',
      },
    ],
    whatsIncludedHeading: 'What we bring',
    whatsIncluded: [
      {
        iconName: 'CheckCircle',
        title: 'Certified Instructor',
        description: 'Corporate teaching experience, with modifications for every level and flagged injuries.',
      },
      {
        iconName: 'CheckCircle',
        title: 'Music and Playlist',
        description: 'A tailored playlist for the room.',
      },
      {
        iconName: 'Clock',
        title: 'Setup and Arrival',
        description: 'The instructor arrives 15 minutes before start.',
      },
    ],
    featuresHeading: 'Format options',
    features: [
      'Chair yoga: conference room, no equipment',
      'Mat yoga: open floor, employees bring mats',
      'Virtual livestream: Zoom, Teams, or Meet',
    ],
  },

  stretch: {
    label: 'Assisted Stretch',
    whyShortcut: [
      {
        title: 'Certified Specialists',
        description:
          'Backgrounds in physical therapy, sports massage, or PNF/FST. Specialists, not generalists.',
      },
      {
        title: 'The Pro Brings Everything',
        description: 'Chair, table, straps, mats, and sanitizer. Nothing for you to set up.',
      },
      {
        title: 'Same Model as Chair Massage',
        description: 'A sign-up sheet, short slots, rotating through the team. Fully clothed, no oils.',
      },
    ],
    benefitsHeading: 'What it fixes',
    benefits: [
      {
        iconName: 'Heart',
        title: 'Range of Motion',
        description: 'Improved mobility in the shoulders, hips, and lower back.',
      },
      {
        iconName: 'Shield',
        title: 'Injury Prevention',
        description: 'For desk workers and gym-goers alike.',
      },
      {
        iconName: 'Sparkles',
        title: 'Focus Reset',
        description: 'Most powerful as a midday or post-lunch slot.',
      },
    ],
    whatsIncludedHeading: 'What we bring',
    whatsIncluded: [
      {
        iconName: 'CheckCircle',
        title: 'Certified Stretch Specialist',
        description: 'A specialist with PNF/FST training.',
      },
      {
        iconName: 'CheckCircle',
        title: 'Portable Chair or Table',
        description: 'Your choice, plus straps, mats, blocks, sanitizer, and signage.',
      },
      {
        iconName: 'FileText',
        title: 'Sign-Up Template',
        description: 'A sign-up sheet and a pre-event Slack blurb.',
      },
    ],
    featuresHeading: 'Formats',
    features: [
      'Express chair stretch: any open corner, fully clothed',
      'Premium table stretch: private or curtained space, deeper work',
    ],
  },
  // 2026 movement & sound services (approved copy, gated via brand voice guide;
  // drawn from the provider's own descriptions and practitioner background).
  reiki: {
    label: 'Reiki Reset',
    whyShortcut: [
      {
        title: 'Certified Reiki Master',
        description:
          'Sessions are led by a certified Reiki Master trained in energy work, acupressure, and meridian theory. A real practitioner, not a marketplace booking.',
      },
      {
        title: 'Everything Handled',
        description:
          'We bring the table, the quiet, and the setup. Your team just signs up and shows up.',
      },
      {
        title: 'One Point of Contact',
        description:
          'Booking, scheduling, and day-of coordination handled for you, with a planning call before the event.',
      },
    ],
    benefitsHeading: 'What your team takes home',
    benefits: [
      {
        iconName: 'Brain',
        title: 'A Calmer Nervous System',
        description:
          'Fifteen or sixty minutes of deep rest that settles stress and quiets a busy mind.',
      },
      {
        iconName: 'Heart',
        title: 'Real Relaxation',
        description:
          'No talking, no effort, nothing to perform. Just dedicated time to slow down.',
      },
      {
        iconName: 'Sparkles',
        title: 'An Easy Entry',
        description:
          'A gentle way in for people who would never book a wellness session on their own.',
      },
    ],
    whatsIncludedHeading: 'What we bring',
    whatsIncluded: [
      {
        iconName: 'Award',
        title: 'Certified Practitioner',
        description: 'A certified Reiki Master to guide every one-on-one session.',
      },
      {
        iconName: 'CheckCircle',
        title: 'Full Setup',
        description:
          'Table or chair, a calming setup, and everything a private session needs. Optional incense on request.',
      },
      {
        iconName: 'FileText',
        title: 'RSVP Blurb',
        description: 'A Slack or email blurb you can drop in to drive sign-ups.',
      },
    ],
    featuresHeading: 'Session options',
    features: [
      'Fifteen or sixty-minute private sessions',
      'Seated or lying down, fully clothed',
      'In-person at your office',
    ],
  },
  'crystal-sound-bath': {
    label: 'Crystal Sound Bath',
    whyShortcut: [
      {
        title: 'Trained Facilitator',
        description:
          'Every sound bath is led by a trained practitioner working live with crystal singing bowls. A vetted professional, not a recording.',
      },
      {
        title: 'Full Kit Included',
        description:
          'Crystal singing bowls and supporting instruments. We bring everything, no client setup.',
      },
      {
        title: 'One Point of Contact',
        description:
          'Booking, prep, and day-of coordination handled for you, with a planning call to set the intention.',
      },
    ],
    benefitsHeading: 'What your team takes home',
    benefits: [
      {
        iconName: 'Brain',
        title: 'Nervous-System Reset',
        description: 'Lower stress and reactivity that lasts well past the session.',
      },
      {
        iconName: 'Heart',
        title: 'Shared Stillness',
        description:
          'A shared experience that asks nothing and gives a lot. No small talk required.',
      },
      {
        iconName: 'Sparkles',
        title: 'An Easy Entry to Stillness',
        description: 'A way in for people who would never sign up for meditation.',
      },
    ],
    whatsIncludedHeading: 'What we bring',
    whatsIncluded: [
      {
        iconName: 'Award',
        title: 'Trained Facilitator',
        description: 'A practitioner trained in sound healing to hold the room.',
      },
      {
        iconName: 'CheckCircle',
        title: 'Crystal Bowl Kit',
        description:
          'Crystal singing bowls and supporting instruments, plus setup and breakdown. Optional incense on request.',
      },
      {
        iconName: 'FileText',
        title: 'RSVP Blurb',
        description: 'A Slack or email blurb you can drop in to drive sign-ups.',
      },
    ],
    featuresHeading: 'Format options',
    features: [
      'Thirty or sixty-minute sessions',
      'In-person at your office',
      'The group sits or lies down, no experience needed',
    ],
  },
  'somatic-sound-bath': {
    label: 'Somatic Movement + Crystal Sound Bath',
    whyShortcut: [
      {
        title: 'Trained Facilitator',
        description:
          'Led by a practitioner trained in both somatic movement and sound healing. One person, two modalities, fully vetted.',
      },
      {
        title: 'Full Kit Included',
        description:
          'Crystal singing bowls and everything for the movement portion. We bring it all, no client setup.',
      },
      {
        title: 'One Point of Contact',
        description:
          'Booking, prep, and day-of coordination handled for you, with a planning call before the event.',
      },
    ],
    benefitsHeading: 'What your team takes home',
    benefits: [
      {
        iconName: 'Brain',
        title: 'Released Tension',
        description:
          'Slow, guided movement that unwinds what the body has been holding all day.',
      },
      {
        iconName: 'Heart',
        title: 'Wired to Rested',
        description:
          'The movement settles the body so the sound bath can carry it the rest of the way.',
      },
      {
        iconName: 'Sparkles',
        title: 'Deeper Body Awareness',
        description: 'A felt sense of being back in the body, grounded and connected.',
      },
    ],
    whatsIncludedHeading: 'What we bring',
    whatsIncluded: [
      {
        iconName: 'Award',
        title: 'Trained Facilitator',
        description: 'A practitioner trained in somatic movement and sound healing.',
      },
      {
        iconName: 'CheckCircle',
        title: 'Movement + Sound Kit',
        description:
          'Crystal singing bowls, supporting instruments, and everything for the movement portion, plus setup and breakdown.',
      },
      {
        iconName: 'FileText',
        title: 'RSVP Blurb',
        description: 'A Slack or email blurb you can drop in to drive sign-ups.',
      },
    ],
    featuresHeading: 'Format options',
    features: [
      'Thirty or sixty-minute sessions',
      'In-person at your office',
      'Standing, seated, or on the floor, no experience needed',
    ],
  },
  'stretch-mobility': {
    label: 'Stretch, Mobility & Somatic Recovery',
    whyShortcut: [
      {
        title: 'Trained Specialist',
        description:
          'Classes are led by a specialist in mobility and somatic movement, not a generic instructor off a marketplace.',
      },
      {
        title: 'Nothing to Set Up',
        description:
          'No mats or equipment required. We bring the class to your space or your screen.',
      },
      {
        title: 'One Point of Contact',
        description:
          'Booking, prep, and day-of coordination handled for you, with a planning call before the event.',
      },
    ],
    benefitsHeading: 'What your team takes home',
    benefits: [
      {
        iconName: 'Brain',
        title: 'Undone Desk Tightness',
        description:
          'Targeted release for the neck, shoulders, hips, and back that sitting all day creates.',
      },
      {
        iconName: 'Heart',
        title: 'Better Mobility',
        description:
          'Improved flexibility, posture, and range of motion that carries into the workday.',
      },
      {
        iconName: 'Sparkles',
        title: 'A Reset After Long Days',
        description: 'Especially good after conferences, travel, or stretches of high stress.',
      },
    ],
    whatsIncludedHeading: 'What we bring',
    whatsIncluded: [
      {
        iconName: 'Award',
        title: 'Trained Specialist',
        description: 'A specialist in stretching, mobility, and somatic movement.',
      },
      {
        iconName: 'CheckCircle',
        title: 'A Ready-to-Go Class',
        description:
          'A full guided session with no setup, mats, or equipment on your end.',
      },
      {
        iconName: 'FileText',
        title: 'RSVP Blurb',
        description: 'A Slack or email blurb you can drop in to drive sign-ups.',
      },
    ],
    featuresHeading: 'Format options',
    features: [
      'Thirty or sixty-minute classes',
      'In-person at your office or live over video',
      'Standing or seated, no mats required',
    ],
  },
  'dance-cardio': {
    label: 'Dance Cardio',
    whyShortcut: [
      {
        title: 'Trained Instructor',
        description:
          'Classes are led by a trained dancer and instructor who keeps every level moving. Fun, not intimidating.',
      },
      {
        title: 'Nothing to Set Up',
        description:
          'Just a playlist and some open space. We bring the energy, you bring the team.',
      },
      {
        title: 'One Point of Contact',
        description:
          'Booking, prep, and day-of coordination handled for you, with a planning call before the event.',
      },
    ],
    benefitsHeading: 'What your team takes home',
    benefits: [
      {
        iconName: 'Heart',
        title: 'A Real Energy Lift',
        description:
          'Music-driven cardio that gets a desk-bound team moving and laughing together.',
      },
      {
        iconName: 'Users',
        title: 'Team Connection',
        description:
          'Nothing bonds a team like being a little out of their comfort zone together.',
      },
      {
        iconName: 'Sparkles',
        title: 'Accessible to Everyone',
        description: 'Simple moves anyone can follow, adaptable from full-out to low-impact.',
      },
    ],
    whatsIncludedHeading: 'What we bring',
    whatsIncluded: [
      {
        iconName: 'Award',
        title: 'Trained Instructor',
        description: 'A dancer and instructor who leads the whole room.',
      },
      {
        iconName: 'CheckCircle',
        title: 'Music + Class',
        description:
          'A built-out playlist and a full guided class, no setup on your end.',
      },
      {
        iconName: 'FileText',
        title: 'RSVP Blurb',
        description: 'A Slack or email blurb you can drop in to drive sign-ups.',
      },
    ],
    featuresHeading: 'Format options',
    features: [
      'Thirty or sixty-minute classes',
      'In-person at your office or live over video',
      'Comfortable clothing, no experience needed',
    ],
  },
  'strength-sculpt': {
    label: 'Strength & Sculpt',
    whyShortcut: [
      {
        title: 'Trained Instructor',
        description:
          'Classes are led by a trained instructor who scales every move to the room. Vetted, not a marketplace booking.',
      },
      {
        title: 'Equipment Optional',
        description:
          'Bodyweight works on its own. Light dumbbells or bands are a nice-to-have, not a requirement.',
      },
      {
        title: 'One Point of Contact',
        description:
          'Booking, prep, and day-of coordination handled for you, with a planning call before the event.',
      },
    ],
    benefitsHeading: 'What your team takes home',
    benefits: [
      {
        iconName: 'Heart',
        title: 'Full-Body Strength',
        description: 'Functional movement that builds strength, posture, and stability.',
      },
      {
        iconName: 'Sparkles',
        title: 'Every Fitness Level',
        description: 'Scaled up or down on the spot, so nobody feels behind.',
      },
      {
        iconName: 'Users',
        title: 'A Team That Moves Together',
        description: 'A shared push that leaves a sedentary team stronger and looser.',
      },
    ],
    whatsIncludedHeading: 'What we bring',
    whatsIncluded: [
      {
        iconName: 'Award',
        title: 'Trained Instructor',
        description: 'An instructor who leads and scales the whole class.',
      },
      {
        iconName: 'CheckCircle',
        title: 'A Ready-to-Go Class',
        description:
          'A full guided session using bodyweight, with light dumbbells or bands optional.',
      },
      {
        iconName: 'FileText',
        title: 'RSVP Blurb',
        description: 'A Slack or email blurb you can drop in to drive sign-ups.',
      },
    ],
    featuresHeading: 'Format options',
    features: [
      'Thirty or sixty-minute classes',
      'In-person at your office or live over video',
      'Bodyweight, dumbbells, or bands, all levels welcome',
    ],
  },
};

// CLE Why Shortcut variant. Reuses the mindfulness base but adds the CLE
// administration + ethics credit bullets.
export const CLE_WHY_SHORTCUT: WhyShortcutBullet[] = [
  {
    title: 'Dedicated Facilitator',
    description:
      'Courtney Schulnick, who brings over two decades of experience and will guide every session to ensure continuity and reliability.',
  },
  {
    title: 'Punctual and Prepared Sessions',
    description:
      "Each session is expertly planned and starts promptly, maximizing the value of your team's time.",
  },
  {
    title: 'Full CLE Administration',
    description:
      'Shortcut manages the entire CLE process including accreditation submission, attendance tracking, and credit reporting — no administrative burden on your firm.',
  },
  {
    title: 'Ethics & Professionalism Credit',
    description:
      'This program qualifies for Ethics & Professionalism CLE credit in the jurisdictions we serve.',
  },
  {
    title: 'Effortless Scheduling',
    description:
      "Shortcut's advanced scheduling technology simplifies program management, making the process a breeze for your team.",
  },
];

// 60-minute CLE class outline (V1 parity)
export interface CLEOutlineEntry {
  timeRange: string;
  title: string;
  bullets: string[];
}
export const CLE_OUTLINE: CLEOutlineEntry[] = [
  {
    timeRange: '0:00 – 4:00',
    title: 'Welcome & Course Overview',
    bullets: [
      'Purpose of the program',
      'Relevance of mindfulness to ethical lawyering and professional judgment',
      'Framing mindfulness as a professional skill, not a wellness add-on',
    ],
  },
  {
    timeRange: '4:00 – 8:00',
    title: 'What Is Mindfulness?',
    bullets: [
      'Definition of mindfulness and present-moment awareness',
      'Mindfulness as an innate capacity that can be strengthened',
      'Why this matters in demanding legal environments',
    ],
  },
  {
    timeRange: '8:00 – 13:00',
    title: 'Distraction, Autopilot, and Ethical Risk',
    bullets: [
      'Why attorneys become distracted and cognitively overloaded',
      'How "autopilot mode" increases the risk of errors, miscommunication, and reactive behavior',
      'Connection between distraction, stress, and ethical lapses',
    ],
  },
  {
    timeRange: '13:00 – 18:00',
    title: 'Competence, Ethics, and Attorney Well-Being',
    bullets: [
      "Ethical obligations under the rules of professional conduct",
      "The relationship between competence, judgment, and an attorney's mental and emotional state",
      'Why chronic stress undermines ethical awareness',
    ],
  },
  {
    timeRange: '18:00 – 24:00',
    title: 'The Overextended Lawyer',
    bullets: [
      'Research and data on attorney stress, burnout, and overwork',
      'Cultural norms in large law firms and their ethical implications',
      'Why self-regulation is an ethical skill, not a personal indulgence',
    ],
  },
  {
    timeRange: '24:00 – 30:00',
    title: 'How Mindfulness Supports Ethical Decision-Making',
    bullets: [
      'Improving focus, attention, and clarity',
      'Reducing reactivity in difficult conversations and high-pressure moments',
      'Strengthening discernment versus judgment',
    ],
  },
  {
    timeRange: '30:00 – 36:00',
    title: 'Stress, Perception, and Choice',
    bullets: [
      'Distinguishing between stressors and stress',
      'The role of perception in ethical responses',
      'How mindfulness increases choice in challenging situations',
    ],
  },
  {
    timeRange: '36:00 – 46:00',
    title: 'PRO Practice (Pause – Relax – Open)',
    bullets: [
      'Explanation of the PRO framework',
      'Guided formal mindfulness practice',
      'Noticing present-moment experience without judgment',
    ],
  },
  {
    timeRange: '46:00 – 52:00',
    title: 'On-the-Spot Practices for the Workday',
    bullets: [
      'Brief, discreet practices attorneys can use immediately',
      'Integrating mindfulness into meetings, transitions, and decision points',
    ],
  },
  {
    timeRange: '52:00 – 58:00',
    title: 'Ethical Application & Integration',
    bullets: [
      'Applying mindfulness to client interactions, negotiations, and internal collaboration',
      'Maintaining professionalism under pressure',
      'Reducing risk through awareness and intentional response',
    ],
  },
  {
    timeRange: '58:00 – 60:00',
    title: 'Closing & Key Takeaways',
    bullets: [
      'Final reflections and Q&A',
      'Resources for continued practice',
    ],
  },
];

// CLE accreditation explainer (V1 parity)
export const CLE_ACCREDITATION_BULLETS: string[] = [
  'Submission of materials to the relevant state CLE board',
  'Attendance tracking for all participants',
  'CLE credit reporting — the firm does not need to handle CLE paperwork or administrative follow-up',
];

// Courtney Schulnick facilitator profile — used in the right-rail sidebar for
// mindfulness proposals.
export const FACILITATOR = {
  name: 'Courtney Schulnick',
  title: "Shortcut's Mindfulness Meditation Leader",
  photoSrc: '/Holiday Proposal/Our Services/Mindfulness/Courtney Frame 2x.webp',
  photoFallbackSrc: '/Holiday Proposal/Our Services/Mindfulness/Courtney Frame 2x.png',
  bio:
    'Courtney Schulnick, an attorney with two decades of experience, now leads mindfulness programs at Shortcut. With extensive training from the Myrna Brind Center for Mindfulness, she brings a unique perspective to corporate wellness. Her workshops give employees real tools for handling stress, sharpening focus, and getting through the harder parts of work.',
} as const;
