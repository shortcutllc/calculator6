// Shared catalog for the "movement & sound" flat-price group services added in
// 2026: Crystal Sound Bath, Somatic Movement + Crystal Sound Bath, Stretch /
// Mobility & Somatic Recovery, Dance Cardio, and Strength & Sculpt.
//
// These price exactly like mindfulness / sound-bath / yoga — a flat per-session
// `fixedPrice` with unlimited appointments — so the engine treats them as
// flat-class (see the `isMindfulness` gate in proposalGenerator.ts). Delivery
// format (in-person / virtual / hybrid) rides on the shared `mindfulnessFormat`
// field and is display-only (it never changes price).
//
// Unlike the single-service catalogs (soundBathCatalog.ts, yogaCatalog.ts) this
// one holds several serviceTypes, so every lookup is scoped by `serviceType`.
// Each service offers a 30-min and a 60-min duration as separate entries, the
// same "one id per duration" shape the other catalogs use.
//
// NOTE ON COPY: the `description` here is neutral factual microcopy only. The
// customer-facing marketing blurb for each service lives in
// src/components/proposal/data.ts (SERVICE_DESC) and goes through the copy gate.

export interface MovementCatalogEntry {
  /** Stable id stored on the service as `movementServiceId`. */
  id: string;
  /** The serviceType this entry belongs to (e.g. 'dance-cardio'). */
  serviceType: string;
  /** Display name shown in the proposal and select menus. */
  name: string;
  /** Class length in minutes — drives `classLength` + `totalHours`. */
  classLength: number;
  /** Fixed per-session price (USD) — drives `fixedPrice` + `serviceCost`. */
  fixedPrice: number;
  /** Neutral factual microcopy (NOT the marketing blurb — see file header). */
  description: string;
}

export const MOVEMENT_CATALOG: MovementCatalogEntry[] = [
  // Crystal Sound Bath — group, priced at parity with the existing sound bath.
  {
    id: 'crystal-sound-bath-30',
    serviceType: 'crystal-sound-bath',
    name: 'Crystal Sound Bath (30 min)',
    classLength: 30,
    fixedPrice: 1250,
    description: 'A 30-minute crystal sound bath for the group.',
  },
  {
    id: 'crystal-sound-bath-60',
    serviceType: 'crystal-sound-bath',
    name: 'Crystal Sound Bath (60 min)',
    classLength: 60,
    fixedPrice: 1500,
    description: 'A 60-minute crystal sound bath for the group.',
  },
  // Somatic Movement + Crystal Sound Bath — premium combined offering, in-person.
  {
    id: 'somatic-sound-bath-30',
    serviceType: 'somatic-sound-bath',
    name: 'Somatic Movement + Crystal Sound Bath (30 min)',
    classLength: 30,
    fixedPrice: 1500,
    description: 'A 30-minute somatic movement and crystal sound bath session.',
  },
  {
    id: 'somatic-sound-bath-60',
    serviceType: 'somatic-sound-bath',
    name: 'Somatic Movement + Crystal Sound Bath (60 min)',
    classLength: 60,
    fixedPrice: 1750,
    description: 'A 60-minute somatic movement and crystal sound bath session.',
  },
  // Stretch, Mobility & Somatic Recovery — group class, in-person or virtual.
  {
    id: 'stretch-mobility-30',
    serviceType: 'stretch-mobility',
    name: 'Stretch, Mobility & Somatic Recovery (30 min)',
    classLength: 30,
    fixedPrice: 1000,
    description: 'A 30-minute stretch, mobility, and somatic recovery class.',
  },
  {
    id: 'stretch-mobility-60',
    serviceType: 'stretch-mobility',
    name: 'Stretch, Mobility & Somatic Recovery (60 min)',
    classLength: 60,
    fixedPrice: 1250,
    description: 'A 60-minute stretch, mobility, and somatic recovery class.',
  },
  // Dance Cardio — group class, in-person or virtual.
  {
    id: 'dance-cardio-30',
    serviceType: 'dance-cardio',
    name: 'Dance Cardio (30 min)',
    classLength: 30,
    fixedPrice: 1000,
    description: 'A 30-minute dance cardio class.',
  },
  {
    id: 'dance-cardio-60',
    serviceType: 'dance-cardio',
    name: 'Dance Cardio (60 min)',
    classLength: 60,
    fixedPrice: 1250,
    description: 'A 60-minute dance cardio class.',
  },
  // Strength & Sculpt — group class, in-person or virtual.
  {
    id: 'strength-sculpt-30',
    serviceType: 'strength-sculpt',
    name: 'Strength & Sculpt (30 min)',
    classLength: 30,
    fixedPrice: 1000,
    description: 'A 30-minute strength and sculpt class.',
  },
  {
    id: 'strength-sculpt-60',
    serviceType: 'strength-sculpt',
    name: 'Strength & Sculpt (60 min)',
    classLength: 60,
    fixedPrice: 1250,
    description: 'A 60-minute strength and sculpt class.',
  },
];

/** The serviceType slugs owned by this catalog. */
export const MOVEMENT_SERVICE_TYPES = [
  'crystal-sound-bath',
  'somatic-sound-bath',
  'stretch-mobility',
  'dance-cardio',
  'strength-sculpt',
] as const;

export type MovementServiceType = (typeof MOVEMENT_SERVICE_TYPES)[number];

/** True when a serviceType is one of the movement/sound flat-class services. */
export function isMovementServiceType(serviceType: string): boolean {
  return (MOVEMENT_SERVICE_TYPES as readonly string[]).includes(serviceType);
}

/** Map keyed by id for O(1) lookups. */
export const MOVEMENT_CATALOG_BY_ID: Record<string, MovementCatalogEntry> =
  MOVEMENT_CATALOG.reduce(
    (acc, entry) => {
      acc[entry.id] = entry;
      return acc;
    },
    {} as Record<string, MovementCatalogEntry>
  );

/** Default catalog id per serviceType — the 60-min (flagship) entry. */
export const DEFAULT_MOVEMENT_ID_BY_TYPE: Record<string, string> = {
  'crystal-sound-bath': 'crystal-sound-bath-60',
  'somatic-sound-bath': 'somatic-sound-bath-60',
  'stretch-mobility': 'stretch-mobility-60',
  'dance-cardio': 'dance-cardio-60',
  'strength-sculpt': 'strength-sculpt-60',
};

const formatPrice = (n: number): string => `$${n.toLocaleString('en-US')}`;

/** The duration options for one serviceType, as `<select>` entries
 *  (value = catalog id, label = "Name — N min ($X)"). */
export function movementSelectOptions(
  serviceType: string
): Array<{ value: string; label: string }> {
  return MOVEMENT_CATALOG.filter((e) => e.serviceType === serviceType).map((e) => ({
    value: e.id,
    label: `${e.name.replace(/\s*\(\d+\s*min\)/, '')} — ${e.classLength} min (${formatPrice(
      e.fixedPrice
    )})`,
  }));
}

/** Resolve a catalog entry from whatever the service has stored.
 *  Order: explicit id → fallback by (serviceType, classLength) → serviceType
 *  default. Never null (returns undefined only for an unknown serviceType). */
export function resolveMovementEntry(input: {
  serviceType: string;
  movementServiceId?: string;
  classLength?: number;
}): MovementCatalogEntry | undefined {
  if (input.movementServiceId && MOVEMENT_CATALOG_BY_ID[input.movementServiceId]) {
    return MOVEMENT_CATALOG_BY_ID[input.movementServiceId];
  }
  const cl = Number(input.classLength) || 0;
  if (cl) {
    const byLen = MOVEMENT_CATALOG.find(
      (e) => e.serviceType === input.serviceType && e.classLength === cl
    );
    if (byLen) return byLen;
  }
  const defId = DEFAULT_MOVEMENT_ID_BY_TYPE[input.serviceType];
  return defId ? MOVEMENT_CATALOG_BY_ID[defId] : undefined;
}

/** Apply a catalog entry onto a service object (in place). Mirrors
 *  applySoundBathEntry: sets the id, classLength, appTime, totalHours, and the
 *  flat price fields. */
export function applyMovementEntry(service: any, entry: MovementCatalogEntry): void {
  service.movementServiceId = entry.id;
  service.classLength = entry.classLength;
  service.appTime = entry.classLength;
  service.totalHours = entry.classLength / 60;
  service.fixedPrice = entry.fixedPrice;
  service.serviceCost = entry.fixedPrice;
}
