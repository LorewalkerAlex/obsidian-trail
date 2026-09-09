import {
  useCallback,
  useEffect,
  useState,
} from "react";

export interface TrailCollectionSelectionSnapshot {
  readonly anchorId: string | null;
  readonly selectedIds: ReadonlySet<string>;
}

const EMPTY_SELECTION: TrailCollectionSelectionSnapshot = {
  anchorId: null,
  selectedIds: new Set<string>(),
};

function sameSelection(
  left: ReadonlySet<string>,
  right: ReadonlySet<string>,
): boolean {
  if (left.size !== right.size) return false;
  for (const id of left) {
    if (!right.has(id)) return false;
  }
  return true;
}

export function reconcileTrailCollectionSelection(
  state: TrailCollectionSelectionSnapshot,
  visibleIds: readonly string[],
): TrailCollectionSelectionSnapshot {
  const visible = new Set(visibleIds);
  const selectedIds = new Set(
    Array.from(state.selectedIds).filter((id) => visible.has(id)),
  );
  const anchorId = state.anchorId !== null && visible.has(state.anchorId)
    ? state.anchorId
    : null;

  if (anchorId === state.anchorId && sameSelection(selectedIds, state.selectedIds)) {
    return state;
  }
  return { anchorId, selectedIds };
}

export function setTrailCollectionSelection(
  state: TrailCollectionSelectionSnapshot,
  visibleIds: readonly string[],
  targetId: string,
  selected: boolean,
  extendRange = false,
): TrailCollectionSelectionSnapshot {
  const reconciled = reconcileTrailCollectionSelection(state, visibleIds);
  const targetIndex = visibleIds.indexOf(targetId);
  if (targetIndex < 0) return reconciled;

  const nextSelected = new Set(reconciled.selectedIds);
  const anchorIndex = reconciled.anchorId === null
    ? -1
    : visibleIds.indexOf(reconciled.anchorId);

  if (extendRange && anchorIndex >= 0) {
    const start = Math.min(anchorIndex, targetIndex);
    const end = Math.max(anchorIndex, targetIndex);
    for (let index = start; index <= end; index += 1) {
      const id = visibleIds[index];
      if (id === undefined) continue;
      if (selected) nextSelected.add(id);
      else nextSelected.delete(id);
    }
    return {
      anchorId: reconciled.anchorId,
      selectedIds: nextSelected,
    };
  }

  if (selected) nextSelected.add(targetId);
  else nextSelected.delete(targetId);
  return {
    anchorId: targetId,
    selectedIds: nextSelected,
  };
}

export function isTrailCollectionSelectionKeyboardOriginEligible(
  target: EventTarget | null,
): boolean {
  if (!(target instanceof Element)) return true;
  if (target.closest([
    "textarea",
    "select",
    "[contenteditable='true']",
    "[role='combobox']",
    "[role='textbox']",
  ].join(", ")) !== null) {
    return false;
  }
  const input = target.closest("input");
  if (!(input instanceof HTMLInputElement)) return true;
  return input.type === "checkbox" || input.type === "radio";
}

export function useTrailCollectionSelectionState(visibleIds: readonly string[]) {
  const [state, setState] = useState<TrailCollectionSelectionSnapshot>(EMPTY_SELECTION);

  useEffect(() => {
    setState((current) => reconcileTrailCollectionSelection(current, visibleIds));
  }, [visibleIds]);

  const clear = useCallback(() => {
    setState((current) => current.selectedIds.size === 0 && current.anchorId === null
      ? current
      : EMPTY_SELECTION);
  }, []);

  const setSelected = useCallback((
    targetId: string,
    selected: boolean,
    extendRange = false,
  ) => {
    setState((current) => setTrailCollectionSelection(
      current,
      visibleIds,
      targetId,
      selected,
      extendRange,
    ));
  }, [visibleIds]);

  return {
    clear,
    selectedIds: state.selectedIds,
    setSelected,
  } as const;
}
