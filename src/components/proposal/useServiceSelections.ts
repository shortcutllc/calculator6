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
  /** Sum of line costs across all *included* services AFTER per-service
   *  discount is applied. This is what the volume-discount math operates
   *  on and what gratuity is computed against. */
  subtotal: number;
  /** Sum of line costs across all *included* services BEFORE any discount.
   *  Used purely for display — lets us show "Subtotal $6,300 / Service
   *  discount −$700 / ..." with consistent arithmetic. Equals `subtotal +
   *  serviceDiscountAmount`. */
  originalSubtotal: number;
  /** Total dollars saved by per-service `discountPercent` across all
   *  included services. Zero when no service has a discount set. */
  serviceDiscountAmount: number;
  /** Sum of `frequency` across all *included* services — drives volume discount. */
  totalEvents: number;
  /** % volume discount applied based on totalEvents (0, 15, or 20). */
  discountPercent: number;
  /** Dollar amount of the volume discount. */
  discountAmount: number;
  /** Subtotal minus discountAmount. (Gratuity is intentionally not added — */
  /** per project decision #3 it stays as a staff-editable add-on only.) */
  total: number;

  // --- Per-EVENT figures (frequency forced to 1) ---------------------------
  // Frequency is treated as display-only on the card + sidebar: picking
  // "twice a year" must NOT move those totals — it only annualizes the
  // bottom Pricing summary. These per-event figures back the sidebar.
  // The volume discount is deliberately excluded here: it's driven by the
  // annual event count, so it lives only in the annualized bottom summary.
  /** Per-event subtotal AFTER per-service/recurring discount (= sum of unit). */
  perEventSubtotal: number;
  /** Per-event subtotal BEFORE per-service discount (for the Subtotal line). */
  perEventOriginalSubtotal: number;
  /** Per-event dollars saved by per-service discount. */
  perEventServiceDiscount: number;
  /** Per-event total (= perEventSubtotal; no annual volume discount). */
  perEventTotal: number;
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
    let subtotal = 0;            // sum of post-per-service-discount line costs
    let originalSubtotal = 0;    // sum of pre-discount line costs (for display)
    let serviceDiscountAmount = 0; // sum of per-service savings (originalSubtotal − subtotal)
    let totalEvents = 0;
    // Per-event mirrors (frequency forced to 1) — back the per-event sidebar.
    let perEventSubtotal = 0;
    let perEventOriginalSubtotal = 0;
    let perEventServiceDiscount = 0;

    Object.entries(servicesByLocation || {}).forEach(([loc, byDate]) => {
      Object.entries(byDate || {}).forEach(([date, dateData]) => {
        (dateData?.services || []).forEach((service: any, idx: number) => {
          const key = selectionKey(loc, date, idx);
          const st = state[key] || DEFAULT;
          // `service.serviceCost` is the post-EVERYTHING per-unit price
          // (both per-service discount AND auto-recurring discount applied).
          // To recover the truly-original pre-any-discount price for the
          // display "Subtotal" line:
          //   1. Start from `originalServiceCost` if proposalGenerator set
          //      it (that's the post-per-service-discount, pre-recurring
          //      value — only populated when auto-recurring fires).
          //   2. Otherwise fall back to `serviceCost`.
          //   3. Reverse the per-service `discountPercent` from that base.
          // This keeps the math consistent whether one, both, or neither
          // discount is active.
          const unit = service?.serviceCost || 0;
          const preRecurringUnit =
            typeof service?.originalServiceCost === 'number' && service.originalServiceCost > 0
              ? service.originalServiceCost
              : unit;
          const pct = Math.min(99, Math.max(0, Number(service?.discountPercent) || 0));
          const originalUnit = pct > 0 ? preRecurringUnit / (1 - pct / 100) : preRecurringUnit;
          const lineCost = unit * st.frequency;
          const originalLineCost = originalUnit * st.frequency;
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
            originalSubtotal += originalLineCost;
            // Per-service discount = original − pre-recurring (NOT
            // original − unit, which would also include the recurring
            // savings). Recurring savings are surfaced separately from
            // displayData.autoRecurringSavings.
            serviceDiscountAmount += (originalUnit - preRecurringUnit) * st.frequency;
            totalEvents += st.frequency;
            // Per-event mirrors — identical math, frequency held at 1.
            perEventSubtotal += unit;
            perEventOriginalSubtotal += originalUnit;
            perEventServiceDiscount += originalUnit - preRecurringUnit;
          }
        });
      });
    });

    // Volume discount: 15% at 4+ total events, 20% at 9+. Applies on top of
    // the post-per-service-discount subtotal (combined event count across
    // all selected services — project decision #2).
    let discountPercent = 0;
    if (totalEvents >= 9) discountPercent = 20;
    else if (totalEvents >= 4) discountPercent = 15;

    const discountAmount = (subtotal * discountPercent) / 100;
    const total = subtotal - discountAmount;

    return {
      rows,
      subtotal,
      originalSubtotal,
      serviceDiscountAmount,
      totalEvents,
      discountPercent,
      discountAmount,
      total,
      perEventSubtotal,
      perEventOriginalSubtotal,
      perEventServiceDiscount,
      perEventTotal: perEventSubtotal,
    };
  }, [state, servicesByLocation]);

  return { get, setIncluded, setFrequency, summary, state };
}
