import { useState, useCallback, useMemo, useEffect } from 'react';

// Per-service selection state used by the redesigned viewers.
// Keyed by `${location}|${date}|${serviceIndex}` so the same proposal data
// shape we already persist (services per location → per date → array) works
// without reshaping.

export interface ServiceSelection {
  included: boolean;
  frequency: number;
}

export interface ServiceSelectionRow {
  key: string;
  serviceType: string;
  location: string;
  date: string;
  unitCost: number;
  lineCost: number;
  frequency: number;
  included: boolean;
}

export interface ServiceSelectionSummary {
  rows: ServiceSelectionRow[];
  /** Sum of line costs across all *included* services. */
  subtotal: number;
  /** Sum of `frequency` across all *included* services — drives volume discount. */
  totalEvents: number;
  /** % discount applied based on totalEvents (0, 15, or 20). */
  discountPercent: number;
  /** Dollar amount of the discount. */
  discountAmount: number;
  /** Subtotal minus discountAmount. (Gratuity is intentionally not added — */
  /** per project decision #3 it stays as a staff-editable add-on only.) */
  total: number;
}

export const selectionKey = (location: string, date: string, serviceIndex: number): string =>
  `${location}|${date}|${serviceIndex}`;

const DEFAULT: ServiceSelection = { included: true, frequency: 1 };

interface UseServiceSelectionsArgs {
  /** ProposalData.services shape: { [location]: { [date]: { services: Service[] } } } */
  servicesByLocation: Record<string, Record<string, { services: any[] }>>;
  /** Initial state if previously persisted (proposal.data.optionsState). */
  initialState?: Record<string, ServiceSelection>;
  /** Called whenever the selection state changes. Use to persist to DB. */
  onChange?: (state: Record<string, ServiceSelection>) => void;
  /** Disable mutations (e.g. proposal is approved). */
  readOnly?: boolean;
  /** Proposal-wide override: when true, every service starts NOT included
   *  so the client has to opt in service-by-service. Persisted state still
   *  takes precedence — once the client has toggled anything, their picks
   *  win. Per-service `optionsSelectedDefault === false` also wins; this
   *  flag is the fallback when nothing else has an opinion. */
  startUnselected?: boolean;
}

/**
 * useServiceSelections — manages include + frequency state for each service in
 * an options-style proposal. The hook owns local state; persistence to the
 * proposal row is the caller's responsibility (e.g. via onChange wired to a
 * supabase update).
 */
export function useServiceSelections({
  servicesByLocation,
  initialState,
  onChange,
  readOnly,
  startUnselected,
}: UseServiceSelectionsArgs) {
  // Build defaults from staff-set fields on each service if provided.
  // Precedence for the initial frequency:
  //   1. Previously persisted client state (proposal.data.optionsState[key])
  //   2. Staff's options-proposal default (service.optionsFrequency)
  //   3. Legacy recurring field (service.recurringFrequency.occurrences when
  //      service.isRecurring is true) — for back-compat with existing proposals
  //   4. 1 (single event)
  const computedInitial = useMemo(() => {
    const out: Record<string, ServiceSelection> = {};
    Object.entries(servicesByLocation || {}).forEach(([loc, byDate]) => {
      Object.entries(byDate || {}).forEach(([date, dateData]) => {
        (dateData?.services || []).forEach((service: any, idx: number) => {
          const key = selectionKey(loc, date, idx);
          const fromState = initialState?.[key];
          if (fromState) {
            out[key] = { ...DEFAULT, ...fromState };
            return;
          }
          // Resolve frequency from layered defaults
          let frequency = 1;
          if (typeof service?.optionsFrequency === 'number' && service.optionsFrequency > 0) {
            frequency = service.optionsFrequency;
          } else if (
            service?.isRecurring &&
            typeof service?.recurringFrequency?.occurrences === 'number' &&
            service.recurringFrequency.occurrences > 0
          ) {
            frequency = service.recurringFrequency.occurrences;
          }
          // Precedence for `included`:
          //   1. Per-service `optionsSelectedDefault === false` → off
          //   2. Proposal-wide `startUnselected` → off
          //   3. Default → on
          const includedDefault =
            service?.optionsSelectedDefault === false
              ? false
              : startUnselected
              ? false
              : true;
          out[key] = {
            included: includedDefault,
            frequency: Math.max(1, frequency),
          };
        });
      });
    });
    return out;
  }, [servicesByLocation, initialState, startUnselected]);

  const [state, setState] = useState<Record<string, ServiceSelection>>(computedInitial);

  // If the underlying proposal data changes (e.g. owner re-fetched), re-seed
  // the state. This is rare in client view but covers refresh-from-DB cases.
  useEffect(() => {
    setState(computedInitial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(computedInitial)]);

  // Fire onChange whenever local state shifts (debounced lightly via setTimeout
  // to coalesce rapid changes like dragging a slider). The caller is responsible
  // for persisting to DB.
  useEffect(() => {
    if (!onChange) return;
    const handle = window.setTimeout(() => onChange(state), 200);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const get = useCallback(
    (key: string): ServiceSelection => state[key] || DEFAULT,
    [state]
  );

  const setIncluded = useCallback(
    (key: string, next: boolean) => {
      if (readOnly) return;
      setState((s) => ({ ...s, [key]: { ...(s[key] || DEFAULT), included: next } }));
    },
    [readOnly]
  );

  const setFrequency = useCallback(
    (key: string, next: number) => {
      if (readOnly) return;
      setState((s) => ({
        ...s,
        [key]: { ...(s[key] || DEFAULT), frequency: Math.max(1, next) },
      }));
    },
    [readOnly]
  );

  const summary = useMemo<ServiceSelectionSummary>(() => {
    const rows: ServiceSelectionRow[] = [];
    let subtotal = 0;
    let totalEvents = 0;

    Object.entries(servicesByLocation || {}).forEach(([loc, byDate]) => {
      Object.entries(byDate || {}).forEach(([date, dateData]) => {
        (dateData?.services || []).forEach((service: any, idx: number) => {
          const key = selectionKey(loc, date, idx);
          const st = state[key] || DEFAULT;
          const unit = service?.serviceCost || 0;
          const lineCost = unit * st.frequency;
          rows.push({
            key,
            serviceType: service?.serviceType || '',
            location: loc,
            date,
            unitCost: unit,
            lineCost,
            frequency: st.frequency,
            included: st.included,
          });
          if (st.included) {
            subtotal += lineCost;
            totalEvents += st.frequency;
          }
        });
      });
    });

    // Volume discount: 15% at 4+ total events, 20% at 9+. Applies to combined
    // event count across all selected services (project decision #2).
    let discountPercent = 0;
    if (totalEvents >= 9) discountPercent = 20;
    else if (totalEvents >= 4) discountPercent = 15;

    const discountAmount = (subtotal * discountPercent) / 100;
    const total = subtotal - discountAmount;

    return { rows, subtotal, totalEvents, discountPercent, discountAmount, total };
  }, [state, servicesByLocation]);

  return { get, setIncluded, setFrequency, summary, state };
}
