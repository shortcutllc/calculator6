import { useState, useCallback, useMemo, useEffect } from 'react';

// Optional add-ons: production extras a client opts into, kept deliberately
// separate from services.
//
// WHY A SEPARATE LAYER RATHER THAN MORE customLineItems
// `customLineItems` already exists, but proposalGenerator adds their amount
// straight into summary.totalEventCost, which makes them mandatory. An
// optional extra has to be able to be off without the quoted price being
// wrong, so it needs its own selection state.
//
// WHY THEY SIT OUTSIDE THE VOLUME DISCOUNT
// useServiceSelections applies the 4+/9+ volume tier to the service subtotal
// because that discount is earned by booking more EVENTS. Branded uniforms
// and rented planters are production costs bought once; discounting them on
// event count would be an accident, not a decision. So the arithmetic is:
//
//     services subtotal
//   − volume discount
//   = services total          ← everything useServiceSelections already does
//   + selected add-ons        ← this hook, added afterwards
//   = grand total
//
// Nothing here touches the service math, so an existing proposal with no
// `addOns` array behaves exactly as it did before.

export interface ProposalAddOn {
  id: string;
  name: string;
  /** Optional line under the name, e.g. "Four screens at $150 each". */
  description?: string;
  amount: number;
  /** Staff choice: does this start switched on for the client? Defaults off,
   *  because an add-on that is on by default is really just a line item. */
  selectedByDefault?: boolean;
}

export interface AddOnSelectionSummary {
  /** Every add-on with its current selected state, in staff order. */
  rows: (ProposalAddOn & { selected: boolean })[];
  /** Sum of amounts across SELECTED add-ons only. */
  total: number;
  /** How many are switched on, for "2 of 4 selected" style copy. */
  selectedCount: number;
}

interface UseAddOnSelectionsArgs {
  addOns: ProposalAddOn[] | undefined;
  /** Previously persisted client picks (proposal.data.addOnsState). */
  initialState?: Record<string, boolean>;
  /** Fires on change so the caller can persist. Debounced by 200ms. */
  onChange?: (state: Record<string, boolean>) => void;
  /** Approved proposals must never move under the client. */
  readOnly?: boolean;
}

export function useAddOnSelections({
  addOns,
  initialState,
  onChange,
  readOnly,
}: UseAddOnSelectionsArgs) {
  const list = useMemo(() => (Array.isArray(addOns) ? addOns : []), [addOns]);

  // Persisted client state wins; otherwise the staff default; otherwise off.
  const computedInitial = useMemo(() => {
    const out: Record<string, boolean> = {};
    list.forEach((a) => {
      if (!a?.id) return;
      const fromState = initialState?.[a.id];
      out[a.id] = typeof fromState === 'boolean' ? fromState : a.selectedByDefault === true;
    });
    return out;
  }, [list, initialState]);

  const [state, setState] = useState<Record<string, boolean>>(computedInitial);

  useEffect(() => {
    setState(computedInitial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(computedInitial)]);

  useEffect(() => {
    if (!onChange) return;
    const handle = window.setTimeout(() => onChange(state), 200);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const isSelected = useCallback((id: string): boolean => state[id] === true, [state]);

  const setSelected = useCallback(
    (id: string, next: boolean) => {
      if (readOnly) return;
      setState((s) => ({ ...s, [id]: next }));
    },
    [readOnly]
  );

  const summary = useMemo<AddOnSelectionSummary>(() => {
    const rows = list.map((a) => ({ ...a, selected: state[a.id] === true }));
    const total = rows.reduce(
      (sum, r) => (r.selected ? sum + (Number(r.amount) || 0) : sum),
      0
    );
    return { rows, total, selectedCount: rows.filter((r) => r.selected).length };
  }, [list, state]);

  return { isSelected, setSelected, summary, state, hasAddOns: list.length > 0 };
}
