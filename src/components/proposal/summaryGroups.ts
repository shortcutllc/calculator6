// How the V2 pricing summary groups a proposal's services (Will, 2026-10-21).
//
// A proposal is services by location, then by date. The summary used to list
// every service as its own "Massage event" row with no day or place on it, so
// a three-day conference read as six identical rows. It now groups them:
//
//   one location, one date      → no groups: the service rows, as before
//   one location, several dates → a row per date ("Tue, Oct 27")
//   several locations           → a row per location, with its date if set
//   a multi-day event           → a row per day ("Day 1", "Day 2 · Oct 28")
//
// There is no conference flag in the data. A multi-day event is a proposal
// whose locations are all named "..., Day N", which is how staff build one
// (e.g. "LegalOps Conference, Day 1" to "Day 3").

const DAY_SUFFIX = /(?:^|[,·|–-]\s*|\s)day\s*(\d+)\s*$/i;

export interface SummaryShape {
  /** Every location is "..., Day N": call the units days. */
  multiDay: boolean;
  /** More than one location. */
  byLocation: boolean;
}

export function summaryShape(services: Record<string, unknown> | undefined): SummaryShape {
  const locations = Object.keys(services || {});
  return {
    multiDay: locations.length > 1 && locations.every((l) => DAY_SUFFIX.test(l)),
    byLocation: locations.length > 1,
  };
}

/** The word for one group, for "3 days" / "2 locations" / "4 dates". */
export function unitWord(shape: SummaryShape): 'day' | 'location' | 'date' {
  return shape.multiDay ? 'day' : shape.byLocation ? 'location' : 'date';
}

/** A group's label. `shortDate` formats a real date key; TBD dates are left off. */
export function groupLabel(
  location: string,
  date: string,
  shape: SummaryShape,
  shortDate: (raw: string) => string
): string {
  const d = date && date !== 'TBD' ? shortDate(date) : '';
  if (shape.multiDay) {
    const n = location.match(DAY_SUFFIX)?.[1];
    return [n ? `Day ${n}` : location, d].filter(Boolean).join(' · ');
  }
  return [shape.byLocation ? location : '', d].filter(Boolean).join(' · ') || 'Date TBD';
}

export interface SummaryGroup {
  key: string;
  label: string;
  /** Service names in the group, in order, without repeats. */
  names: string[];
  /** Highest repeat count in the group (×N a year). */
  repeat: number;
  cost: number;
}

/** Group the summary's included rows by location and date. `costOf` picks the
 *  figure: the desktop card is per event (unitCost), the phone sheet is the
 *  year (lineCost). */
export function buildSummaryGroups<R extends { included: boolean; location: string; date: string; serviceType: string; frequency: number }>(
  rows: R[],
  shape: SummaryShape,
  shortDate: (raw: string) => string,
  displayName: (serviceType: string) => string,
  costOf: (row: R) => number
): SummaryGroup[] {
  const groups: SummaryGroup[] = [];
  rows.filter((r) => r.included).forEach((r) => {
    const key = `${r.location}|${r.date}`;
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = { key, label: groupLabel(r.location, r.date, shape, shortDate), names: [], repeat: 1, cost: 0 };
      groups.push(g);
    }
    const name = displayName(r.serviceType);
    if (!g.names.includes(name)) g.names.push(name);
    g.repeat = Math.max(g.repeat, r.frequency);
    g.cost += costOf(r);
  });
  return groups;
}
