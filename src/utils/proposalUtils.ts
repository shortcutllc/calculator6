import type { Proposal } from '../types/proposal';

/**
 * Extract unique service types from a proposal's nested services structure.
 * Iterates through all locations → dates → services to collect unique types.
 */
export function getServiceTypesFromProposal(proposal: Proposal): string[] {
  const types = new Set<string>();
  const services = proposal.data.services;
  for (const location of Object.values(services)) {
    for (const dateData of Object.values(location)) {
      if (dateData.services) {
        for (const service of dateData.services) {
          if (service.serviceType) types.add(service.serviceType);
        }
      }
    }
  }
  return Array.from(types);
}

/**
 * Map a proposal service type code to a human-readable display name.
 */
export function formatServiceType(type: string): string {
  const map: Record<string, string> = {
    'massage': 'Chair Massage',
    'chair': 'Chair Massage',
    'table-massage': 'Table Massage',
    'headshots': 'Corporate Headshots',
    'nails': 'Manicure',
    'nails-hand-massage': 'Nails & Hand Massage',
    'hair': 'Hair & Styling',
    'blowout': 'Blowout & Styling',
    'grooming': 'Grooming',
    'facials': 'Facials',
    'mindfulness': 'Mindfulness',
    'mindfulness-cle': 'CLE Mindfulness',
  };
  return map[type] || type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, ' ');
}

/**
 * Format a date string to American readable format.
 * Handles ISO dates like "2026-02-18" and already-formatted strings.
 */
export function formatDateAmerican(raw: string): string {
  if (!raw) return raw;
  // If it looks like an ISO date (YYYY-MM-DD), parse and format it
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    // Parse as local date (not UTC) to avoid off-by-one day issues
    const [, year, month, day] = isoMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }
  return raw;
}
