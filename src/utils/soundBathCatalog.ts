// Shared sound-bath service catalog — single source of truth for the menu.
// Mirrors mindfulnessCatalog.ts so the calculator (Home.tsx) and the admin
// proposal viewer (ProposalViewerV2) stay in sync. Sound bath is a flat-price
// group session (priced like mindfulness) and supports in-person / virtual /
// hybrid delivery via the service's `mindfulnessFormat` field (reused as the
// shared "class format" field across flat services).

export interface SoundBathCatalogEntry {
  /** Stable id stored on the service as `soundBathServiceId`. */
  id: string;
  /** Display name shown in the proposal and select menus. */
  name: string;
  /** Class length in minutes — drives `classLength` + `totalHours`. */
  classLength: number;
  /** Fixed per-session price (USD) — drives `fixedPrice` + `serviceCost`. */
  fixedPrice: number;
  /** Customer-facing description used for the service card body. */
  description: string;
}

export const SOUND_BATH_CATALOG: SoundBathCatalogEntry[] = [
  {
    id: 'sound-bath-30',
    name: 'Sound Bath (30 min)',
    classLength: 30,
    fixedPrice: 1250,
    description:
      'A 30-minute nervous-system reset. One facilitator with crystal singing bowls, gong, and chimes. Your team lies down or sits, eyes closed, and lets the sound do the work. Fits neatly inside a wellness day or a longer agenda.',
  },
  {
    id: 'sound-bath-60',
    name: 'Sound Bath (60 min)',
    classLength: 60,
    fixedPrice: 1500,
    description:
      'Our standard hour-long sound bath. Crystal singing bowls, gong, chimes, and a grounding intro and close. People walk out quieter and clearer. In-person at your office or live over video for distributed teams.',
  },
];

/** Default catalog id used whenever a sound-bath service is created without one. */
export const DEFAULT_SOUND_BATH_ID = 'sound-bath-60';

/** Map keyed by id for O(1) lookups. */
export const SOUND_BATH_CATALOG_BY_ID: Record<string, SoundBathCatalogEntry> =
  SOUND_BATH_CATALOG.reduce(
    (acc, entry) => {
      acc[entry.id] = entry;
      return acc;
    },
    {} as Record<string, SoundBathCatalogEntry>
  );

const formatPrice = (n: number): string => `$${n.toLocaleString('en-US')}`;

/** Option list for a `<select>` — value = catalog id, label = "Name ($X)". */
export const SOUND_BATH_SELECT_OPTIONS: Array<{ value: string; label: string }> =
  SOUND_BATH_CATALOG.map((e) => ({
    value: e.id,
    label: `${e.name.replace(/\s*\(\d+\s*min\)/, '')} — ${e.classLength} min (${formatPrice(e.fixedPrice)})`,
  }));

/** Resolve a catalog entry from whatever the service has stored.
 *  Order: explicit id → fallback by classLength → default. Never null. */
export function resolveSoundBathEntry(input: {
  soundBathServiceId?: string;
  classLength?: number;
}): SoundBathCatalogEntry {
  if (input.soundBathServiceId && SOUND_BATH_CATALOG_BY_ID[input.soundBathServiceId]) {
    return SOUND_BATH_CATALOG_BY_ID[input.soundBathServiceId];
  }
  const cl = Number(input.classLength) || 0;
  if (cl) {
    const byLen = SOUND_BATH_CATALOG.find((e) => e.classLength === cl);
    if (byLen) return byLen;
  }
  return SOUND_BATH_CATALOG_BY_ID[DEFAULT_SOUND_BATH_ID];
}

/** Apply a catalog entry onto a service object (in place). */
export function applySoundBathEntry(service: any, entry: SoundBathCatalogEntry): void {
  service.soundBathServiceId = entry.id;
  service.classLength = entry.classLength;
  service.appTime = entry.classLength;
  service.totalHours = entry.classLength / 60;
  service.fixedPrice = entry.fixedPrice;
  service.serviceCost = entry.fixedPrice;
}
