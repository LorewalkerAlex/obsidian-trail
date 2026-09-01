import { useCallback, useState } from "react";

import type {
  TrailCollectionFilterClause,
  TrailCollectionFilterState,
  TrailDueFilterValue,
  TrailFilterDiscreteValue,
} from "../../query/shared/trail-collection-filter";

function discreteValueKey(value: TrailFilterDiscreteValue): string {
  return value.kind === "none" ? "none" : `value:${value.value}`;
}

export function toggleTrailDiscreteFilterValue<PropertyId extends string>(
  state: TrailCollectionFilterState<PropertyId>,
  propertyId: PropertyId,
  value: TrailFilterDiscreteValue,
): TrailCollectionFilterState<PropertyId> {
  const current = state[propertyId];
  if (current !== undefined && current.kind !== "discrete") {
    throw new Error(`Filter property ${propertyId} is not discrete`);
  }

  const key = discreteValueKey(value);
  const values = current?.values ?? [];
  const nextValues = values.some((candidate) => discreteValueKey(candidate) === key)
    ? values.filter((candidate) => discreteValueKey(candidate) !== key)
    : [...values, value];

  const next = { ...state } as Record<string, TrailCollectionFilterClause>;
  if (nextValues.length === 0) {
    delete next[propertyId];
  } else {
    next[propertyId] = { kind: "discrete", values: nextValues };
  }
  return next as TrailCollectionFilterState<PropertyId>;
}

export function setTrailDueFilterValue<PropertyId extends string>(
  state: TrailCollectionFilterState<PropertyId>,
  propertyId: PropertyId,
  value: TrailDueFilterValue,
): TrailCollectionFilterState<PropertyId> {
  return {
    ...state,
    [propertyId]: { kind: "due", value },
  };
}

export function clearTrailFilterClause<PropertyId extends string>(
  state: TrailCollectionFilterState<PropertyId>,
  propertyId: PropertyId,
): TrailCollectionFilterState<PropertyId> {
  if (state[propertyId] === undefined) return state;
  const next = { ...state } as Record<string, TrailCollectionFilterClause>;
  delete next[propertyId];
  return next as TrailCollectionFilterState<PropertyId>;
}

export function useTrailCollectionFilterState<PropertyId extends string>() {
  const [state, setState] = useState<TrailCollectionFilterState<PropertyId>>(
    {} as TrailCollectionFilterState<PropertyId>,
  );

  const clearAll = useCallback(() => {
    setState({} as TrailCollectionFilterState<PropertyId>);
  }, []);

  const clearClause = useCallback((propertyId: PropertyId) => {
    setState((current) => clearTrailFilterClause(current, propertyId));
  }, []);

  const setDueValue = useCallback((propertyId: PropertyId, value: TrailDueFilterValue) => {
    setState((current) => setTrailDueFilterValue(current, propertyId, value));
  }, []);

  const toggleDiscreteValue = useCallback((
    propertyId: PropertyId,
    value: TrailFilterDiscreteValue,
  ) => {
    setState((current) => toggleTrailDiscreteFilterValue(current, propertyId, value));
  }, []);

  return {
    clearAll,
    clearClause,
    setDueValue,
    state,
    toggleDiscreteValue,
  } as const;
}
