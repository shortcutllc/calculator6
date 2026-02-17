import type { ServiceType } from '../types/qrCodeSign';

/**
 * Title pools for single-service signs.
 * Each service has a set of creative, branded titles.
 * All titles must be ≤60 characters.
 */
const SINGLE_SERVICE_TITLES: Record<ServiceType, string[]> = {
  'massage': [
    'Your Massage Break Awaits',
    'Time to Unwind',
    'Take a Break, On Us',
    'Relax. Recharge. Return.',
    'You Deserve This',
    'Stress Relief, Right Here',
  ],
  'hair-beauty': [
    'Your Glow-Up Awaits',
    'Fresh Look, On Us',
    'A Little Something Extra',
    'Look Good, Feel Good',
    'Style Session, On the House',
  ],
  'nails': [
    'Treat Yourself Today',
    'Nail Your Day',
    'A Little Polish Goes a Long Way',
    'You Deserve a Touch-Up',
    'Fresh Nails, Fresh Start',
  ],
  'headshot': [
    'Your New Headshot Awaits',
    'Picture-Perfect Day',
    'Put Your Best Face Forward',
    'New Look, New You',
    'Time for an Update',
  ],
  'mindfulness': [
    'A Moment of Calm',
    'Breathe, Reset, Refocus',
    'Pause. Breathe. Begin Again.',
    'Your Mind Deserves a Break',
    'Find Your Center',
  ],
  'facial': [
    'Your Skin Will Thank You',
    'Glow From the Inside Out',
    'A Fresh Face for the Day',
    'Time for a Glow-Up',
    'Refresh, Renew, Glow',
  ],
};

/**
 * Taglines appended to multi-service combo titles.
 */
const COMBO_TAGLINES = [
  'On Us Today',
  'Just for You',
  'Take a Break',
  'You Deserve This',
  'On the House',
];

/**
 * Umbrella titles for 3-service combos when the combined name gets too long.
 */
const UMBRELLA_TITLES = [
  'Your Wellness Day Awaits',
  'The Full Treatment, On Us',
  'A Day of Self-Care',
  'Treat Yourself Today',
  'Something Special, Just for You',
];

/**
 * Short display names for combo title construction.
 * Shorter than the full display names to keep titles under 60 chars.
 */
const SHORT_NAMES: Record<ServiceType, string> = {
  'massage': 'Massage',
  'hair-beauty': 'Hair & Beauty',
  'headshot': 'Headshots',
  'nails': 'Nails',
  'mindfulness': 'Mindfulness',
  'facial': 'Facials',
};

/**
 * Simple hash to deterministically pick from an array.
 * Uses the service types as a seed so the same combo always returns the same title.
 */
function hashPick<T>(items: T[], seed: string): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return items[Math.abs(hash) % items.length];
}

/**
 * Generate a creative, branded sign title based on selected services.
 *
 * @param serviceTypes - Array of 1-3 service types
 * @param companyName - Optional company name to incorporate
 * @returns A title string ≤60 characters
 */
export function generateSignTitle(
  serviceTypes: ServiceType[],
  companyName?: string
): string {
  if (serviceTypes.length === 0) return 'Your Wellness Day Awaits';

  const sorted = [...serviceTypes].sort();
  const seed = sorted.join('-');

  // Single service — pick from the dedicated pool
  if (serviceTypes.length === 1) {
    const pool = SINGLE_SERVICE_TITLES[serviceTypes[0]];
    return hashPick(pool, seed);
  }

  // Multi-service — try "{Service} & {Service} — {tagline}" first
  const names = serviceTypes.map(t => SHORT_NAMES[t]);
  const tagline = hashPick(COMBO_TAGLINES, seed);

  if (serviceTypes.length === 2) {
    const combo = `${names[0]} & ${names[1]} — ${tagline}`;
    if (combo.length <= 60) return combo;
    // Fallback to umbrella
    return hashPick(UMBRELLA_TITLES, seed);
  }

  // 3 services — try listing, fall back to umbrella
  const combo3 = `${names[0]}, ${names[1]} & ${names[2]} — ${tagline}`;
  if (combo3.length <= 60) return combo3;

  // Try without tagline
  const combo3NoTag = `${names[0]}, ${names[1]} & ${names[2]}`;
  if (combo3NoTag.length <= 60) return combo3NoTag;

  // Fall back to umbrella title
  return hashPick(UMBRELLA_TITLES, seed);
}

/**
 * Get all available titles for a given service combo.
 * Useful for a "regenerate" / title picker UI.
 */
export function getAvailableTitles(serviceTypes: ServiceType[]): string[] {
  if (serviceTypes.length === 0) return UMBRELLA_TITLES;

  if (serviceTypes.length === 1) {
    return [...SINGLE_SERVICE_TITLES[serviceTypes[0]]];
  }

  // Multi-service: generate combo variations + umbrellas
  const names = serviceTypes.map(t => SHORT_NAMES[t]);
  const titles: string[] = [];

  for (const tagline of COMBO_TAGLINES) {
    let combo: string;
    if (serviceTypes.length === 2) {
      combo = `${names[0]} & ${names[1]} — ${tagline}`;
    } else {
      combo = `${names[0]}, ${names[1]} & ${names[2]} — ${tagline}`;
    }
    if (combo.length <= 60) titles.push(combo);
  }

  // Add umbrella titles as fallbacks
  titles.push(...UMBRELLA_TITLES);

  return titles;
}
