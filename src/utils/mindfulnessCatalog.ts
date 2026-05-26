// Shared mindfulness service catalog — single source of truth for the
// menu Shortcut offers. Both the calculator (Home.tsx) and the admin
// proposal viewer (ProposalViewerV2) consume this so the menu, prices,
// names, and descriptions stay in sync. The legacy recalculation engine
// (proposalGenerator) also defers to it when a `mindfulnessServiceId` is
// present, so picking a 60-min Intro ($1,350) doesn't get silently
// rewritten to the generic Mindful Movement price ($1,500).
//
// Adding a new offering:
//   1. Add an entry below.
//   2. Decide which legacy `mindfulnessType` bucket it belongs to
//      (drop-in / intro / mindful-movement) for backward compat — these
//      drive `proHourly` and any code keying off the 3-bucket model.
//   3. The select label in the viewer is built automatically below.
//
// `mindfulnessType` mapping rule (for legacy code that doesn't know about
// `mindfulnessServiceId` yet): pick the bucket whose default classLength
// matches yours; if none match exactly, pick the closest.

export interface MindfulnessCatalogEntry {
  /** Stable id stored on the service as `mindfulnessServiceId`. */
  id: string;
  /** Display name shown in the proposal and select menus. */
  name: string;
  /** Class length in minutes — drives `classLength` + `totalHours`. */
  classLength: number;
  /** Fixed per-session price (USD) — drives `fixedPrice` + `serviceCost`. */
  fixedPrice: number;
  /** Customer-facing description used for the service card body. */
  description: string;
  /** Legacy 3-bucket type kept for back-compat with older serialized data. */
  mindfulnessType: 'drop-in' | 'intro' | 'mindful-movement';
}

export const MINDFULNESS_CATALOG: MindfulnessCatalogEntry[] = [
  {
    id: 'mindful-eating',
    name: 'Mindful Eating & Breathe Awareness',
    classLength: 30,
    fixedPrice: 1250,
    description:
      'Slow down and reconnect through mindful eating and breath awareness. This 30-minute session uses the five senses to invite deeper presence and calm and bring ease to the daily rush.',
    mindfulnessType: 'drop-in',
  },
  {
    id: 'movement-scan',
    name: 'Movement & Scan',
    classLength: 30,
    fixedPrice: 1250,
    description:
      'Release tension with gentle movement and a guided body scan. This 30-minute course awakens body awareness, eases stress, and restores balance.',
    mindfulnessType: 'drop-in',
  },
  {
    id: 'drop-in',
    name: 'Drop-in Session',
    classLength: 30,
    fixedPrice: 1250,
    description:
      'Our 30-minute drop-in sessions offer a quick and easy way to step out of the "doing mode" and into a space of rest and rejuvenation.',
    mindfulnessType: 'drop-in',
  },
  {
    id: 'intro',
    name: 'Intro to Mindfulness (40 min)',
    classLength: 40,
    fixedPrice: 1375,
    description:
      'In just one initial course your team will learn the fundamentals, experience guided meditations and gain practical tools to reduce stress and enhance focus.',
    mindfulnessType: 'intro',
  },
  {
    id: 'intro-mindfulness-60',
    name: 'Intro to Mindfulness (60 min)',
    classLength: 60,
    fixedPrice: 1500,
    description:
      'In just one initial course your team will learn the fundamentals, experience guided meditations and gain practical tools to reduce stress and enhance focus.',
    mindfulnessType: 'mindful-movement',
  },
  {
    id: 'mindful-movement',
    name: 'Mindful Movement',
    classLength: 60,
    fixedPrice: 1500,
    description:
      'Mindful movement is a wonderful way to connect more fully with the present moment by resting attention on sensations that arise within the body moment to moment.',
    mindfulnessType: 'mindful-movement',
  },
  {
    id: 'speak-listen',
    name: 'Speak & Listen',
    classLength: 60,
    fixedPrice: 1500,
    description:
      'Learn mindfulness tools to step out of reactivity and more consciously respond. This 60-minute workshop introduces calming techniques to ease stress and deepen meaningful connection.',
    mindfulnessType: 'mindful-movement',
  },
];

/** Default catalog id used whenever a mindfulness service is created
 *  without one (new "Add service" flow, legacy data, etc.). */
export const DEFAULT_MINDFULNESS_ID = 'intro';

/** Map keyed by id for O(1) lookups. */
export const MINDFULNESS_CATALOG_BY_ID: Record<string, MindfulnessCatalogEntry> =
  MINDFULNESS_CATALOG.reduce(
    (acc, entry) => {
      acc[entry.id] = entry;
      return acc;
    },
    {} as Record<string, MindfulnessCatalogEntry>
  );

/** Pretty-formatted USD with no decimals — matches the menus elsewhere. */
const formatPrice = (cents: number): string =>
  `$${cents.toLocaleString('en-US')}`;

/** Build the option list for a `<select>` — value = catalog id, label = "Name — Nm ($X)". */
export const MINDFULNESS_SELECT_OPTIONS: Array<{ value: string; label: string }> =
  MINDFULNESS_CATALOG.map((e) => ({
    value: e.id,
    label: `${e.name.replace(/\s*\(\d+\s*min\)/, '')} — ${e.classLength} min (${formatPrice(e.fixedPrice)})`,
  }));

/** Resolve a catalog entry from whatever the service has stored.
 *  Order: explicit `mindfulnessServiceId` → fallback via legacy
 *  `mindfulnessType` + `classLength` → default. Never returns null. */
export function resolveMindfulnessEntry(input: {
  mindfulnessServiceId?: string;
  mindfulnessType?: string;
  classLength?: number;
}): MindfulnessCatalogEntry {
  if (input.mindfulnessServiceId && MINDFULNESS_CATALOG_BY_ID[input.mindfulnessServiceId]) {
    return MINDFULNESS_CATALOG_BY_ID[input.mindfulnessServiceId];
  }
  // Legacy fallback — find best match by (mindfulnessType, classLength).
  // Prefer an exact (type + length) hit, else first by type, else by length, else default.
  const cl = Number(input.classLength) || 0;
  const mt = input.mindfulnessType;
  if (mt) {
    const exact = MINDFULNESS_CATALOG.find(
      (e) => e.mindfulnessType === mt && e.classLength === cl
    );
    if (exact) return exact;
    const byType = MINDFULNESS_CATALOG.find((e) => e.mindfulnessType === mt);
    if (byType) return byType;
  }
  if (cl) {
    const byLen = MINDFULNESS_CATALOG.find((e) => e.classLength === cl);
    if (byLen) return byLen;
  }
  return MINDFULNESS_CATALOG_BY_ID[DEFAULT_MINDFULNESS_ID];
}

/** Apply a catalog entry onto a service object (in place). Sets every
 *  derived field the rest of the app expects, including the legacy
 *  `mindfulnessType` for back-compat. */
export function applyMindfulnessEntry(
  service: any,
  entry: MindfulnessCatalogEntry
): void {
  service.mindfulnessServiceId = entry.id;
  service.mindfulnessServiceName = entry.name;
  service.mindfulnessDescription = entry.description;
  service.mindfulnessType = entry.mindfulnessType;
  service.classLength = entry.classLength;
  service.appTime = entry.classLength;
  service.totalHours = entry.classLength / 60;
  service.fixedPrice = entry.fixedPrice;
  service.serviceCost = entry.fixedPrice;
}
