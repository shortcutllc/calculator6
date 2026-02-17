import type { ServiceType } from '../types/qrCodeSign';

/**
 * Title-friendly service names that read naturally in titles.
 * Two versions per service: straight (clear) and casual (fun).
 *
 * "Your Massage Break" ✓
 * "Your Nail Break" ✗  →  "Your Mani Break" ✓
 */
const STRAIGHT_NAMES: Record<ServiceType, string> = {
  'massage': 'Massage',
  'hair-beauty': 'Hair & Beauty',
  'headshot': 'Headshot',
  'nails': 'Nail Care',
  'mindfulness': 'Mindfulness',
  'facial': 'Facial',
};

const CASUAL_NAMES: Record<ServiceType, string> = {
  'massage': 'Massage',
  'hair-beauty': 'Glam',
  'headshot': 'Headshot',
  'nails': 'Mani',
  'mindfulness': 'Mindfulness',
  'facial': 'Spa',
};

/**
 * Templates WITH company name.
 * {service} = title-friendly service name, {company} = company name.
 *
 * Voice: Light, human, optimistic. Happiness-forward.
 * Confident without salesy. Simple, not corporate.
 *
 * NO "today" — signs are often posted ahead of time.
 */
const TEMPLATES_WITH_COMPANY = [
  // Warm & direct — tells you what's happening and it's for you
  '{company} Team, Your {service} Day Is Here',
  'Hey {company} — A Free {service}, On Us',
  '{company} Team — It\'s {service} Day',
  'A Free {service} for the {company} Team — Book Your Spot',
  '{service} Day at {company} — Grab Your Spot',

  // Light personality — still relevant to someone walking past a sign
  '{company}, Take a {service} Break. You\'ve Earned It.',
  'A Free {service} for {company}. No Catch. Just Book.',
  '{company} Team, This {service} Has Your Name on It',
  'Step Away from Your Desk, {company}. A Free {service} Awaits.',
  '{company}, Your {service} Break Is Booked. Well, Almost.',
];

/**
 * Templates WITHOUT company name (manual sign creation fallback).
 */
const TEMPLATES_NO_COMPANY = [
  'Your {service} Day Is Here — Book Your Spot',
  '{service} Day Is Here — Grab Your Spot',
  'Your {service} Awaits — Book Your Spot',
  'Take a {service} Break. You\'ve Earned It.',
  'A Free {service}. No Catch. Just Book.',
  'Step Away from Your Desk. A Free {service} Awaits.',
  'This {service} Has Your Name on It',
];

/**
 * Simple hash to deterministically pick from an array.
 * Same inputs always return the same result.
 */
function hashPick<T>(items: T[], seed: string): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return items[Math.abs(hash) % items.length];
}

/**
 * Get the service label for titles.
 * Single service → use its name. Multi-service → "Wellness" umbrella.
 */
function getServiceLabel(serviceTypes: ServiceType[], casual: boolean): string {
  if (serviceTypes.length === 0) return 'Wellness';
  if (serviceTypes.length >= 2) return 'Wellness';
  const names = casual ? CASUAL_NAMES : STRAIGHT_NAMES;
  return names[serviceTypes[0]];
}

/**
 * Fill a template with service label and company name.
 */
function fillTemplate(template: string, serviceLabel: string, companyName?: string): string {
  return template
    .replace(/\{service\}/g, serviceLabel)
    .replace(/\{company\}/g, companyName || '');
}

/**
 * Generate a sign title based on selected services and company name.
 *
 * Company name is always included when provided.
 * Uses title-friendly service names that read naturally.
 *
 * @param serviceTypes - Array of 1-3 service types
 * @param companyName - Company name (should always be provided)
 * @returns A natural, on-brand title string
 */
export function generateSignTitle(
  serviceTypes: ServiceType[],
  companyName?: string
): string {
  const sorted = [...serviceTypes].sort();
  const seed = sorted.join('-') + (companyName || '');

  const templates = companyName
    ? TEMPLATES_WITH_COMPANY
    : TEMPLATES_NO_COMPANY;

  const template = hashPick(templates, seed);

  // Alternate between straight and casual based on hash
  const useCasual = (Math.abs(seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 2) === 0;
  const serviceLabel = getServiceLabel(serviceTypes, useCasual);

  return fillTemplate(template, serviceLabel, companyName);
}

/**
 * Get all available titles for a given service combo + company name.
 * Returns both straight and casual versions of every template.
 * Used by the regenerate button in QRCodeSignCreator.
 */
export function getAvailableTitles(
  serviceTypes: ServiceType[],
  companyName?: string
): string[] {
  const templates = companyName
    ? TEMPLATES_WITH_COMPANY
    : TEMPLATES_NO_COMPANY;

  const straightLabel = getServiceLabel(serviceTypes, false);
  const casualLabel = getServiceLabel(serviceTypes, true);
  const seen = new Set<string>();
  const titles: string[] = [];

  for (const template of templates) {
    // Straight version
    const straight = fillTemplate(template, straightLabel, companyName);
    if (!seen.has(straight)) {
      seen.add(straight);
      titles.push(straight);
    }

    // Casual version (skip if identical to straight)
    const casual = fillTemplate(template, casualLabel, companyName);
    if (!seen.has(casual)) {
      seen.add(casual);
      titles.push(casual);
    }
  }

  return titles;
}
