// Shared yoga service catalog — single source of truth for the menu.
// Mirrors mindfulnessCatalog.ts. Yoga is a flat-price group class (priced
// below the mindfulness floor) and supports in-person / virtual delivery via
// the service's `mindfulnessFormat` field (the shared "class format" field).
// Note: yoga offers in-person / virtual only (no hybrid) per product spec.

export interface YogaCatalogEntry {
  /** Stable id stored on the service as `yogaServiceId`. */
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

export const YOGA_CATALOG: YogaCatalogEntry[] = [
  {
    id: 'chair-yoga-30',
    name: 'Chair Yoga (30 min)',
    classLength: 30,
    fixedPrice: 650,
    description:
      'Seated and standing postures at the desk. No mats, no change of clothes. Eases shoulder, neck, and back tension from sitting. Runs in a conference room with chairs only — the highest-participation format we offer.',
  },
  {
    id: 'vinyasa-flow-60',
    name: 'Vinyasa Flow (60 min)',
    classLength: 60,
    fixedPrice: 1150,
    description:
      'A full hour of dynamic flow with breathwork and mobility, for teams that want a real class. Beginner-friendly with modifications for every level. Employees bring mats; we bring the instructor and playlist.',
  },
  {
    id: 'restorative-yin-60',
    name: 'Restorative + Yin (60 min)',
    classLength: 60,
    fixedPrice: 1250,
    description:
      'Long-hold, prop-supported postures for stress relief and recovery. A slow, grounding hour that pairs well as the wind-down on event days that include massage or headshots. We bring blocks and bolsters.',
  },
];

/** Default catalog id used whenever a yoga service is created without one. */
export const DEFAULT_YOGA_ID = 'chair-yoga-30';

/** Map keyed by id for O(1) lookups. */
export const YOGA_CATALOG_BY_ID: Record<string, YogaCatalogEntry> = YOGA_CATALOG.reduce(
  (acc, entry) => {
    acc[entry.id] = entry;
    return acc;
  },
  {} as Record<string, YogaCatalogEntry>
);

const formatPrice = (n: number): string => `$${n.toLocaleString('en-US')}`;

/** Option list for a `<select>` — value = catalog id, label = "Name — Nm ($X)". */
export const YOGA_SELECT_OPTIONS: Array<{ value: string; label: string }> = YOGA_CATALOG.map(
  (e) => ({
    value: e.id,
    label: `${e.name.replace(/\s*\(\d+\s*min\)/, '')} — ${e.classLength} min (${formatPrice(e.fixedPrice)})`,
  })
);

/** Resolve a catalog entry from whatever the service has stored. Never null. */
export function resolveYogaEntry(input: {
  yogaServiceId?: string;
  classLength?: number;
}): YogaCatalogEntry {
  if (input.yogaServiceId && YOGA_CATALOG_BY_ID[input.yogaServiceId]) {
    return YOGA_CATALOG_BY_ID[input.yogaServiceId];
  }
  const cl = Number(input.classLength) || 0;
  if (cl) {
    const byLen = YOGA_CATALOG.find((e) => e.classLength === cl);
    if (byLen) return byLen;
  }
  return YOGA_CATALOG_BY_ID[DEFAULT_YOGA_ID];
}

/** Apply a catalog entry onto a service object (in place). */
export function applyYogaEntry(service: any, entry: YogaCatalogEntry): void {
  service.yogaServiceId = entry.id;
  service.classLength = entry.classLength;
  service.appTime = entry.classLength;
  service.totalHours = entry.classLength / 60;
  service.fixedPrice = entry.fixedPrice;
  service.serviceCost = entry.fixedPrice;
}
