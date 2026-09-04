import { useStore } from "zustand";

import type { TrailInspectorStore, TrailInspectorTarget } from "./trail-inspector-state";

export interface TrailInspectorProps {
  readonly inspectorStore: TrailInspectorStore;
}

function targetKindLabel(target: TrailInspectorTarget): string {
  switch (target.kind) {
    case "initiative":
      return "Initiative";
    case "project":
      return "Project";
    case "issue":
      return "Issue";
    case "cycle":
      return "Cycle";
  }
}

export function TrailInspector({ inspectorStore }: TrailInspectorProps) {
  const target = useStore(inspectorStore, (state) => state.target);

  if (target === null) return null;

  const kindLabel = targetKindLabel(target);

  return (
    <aside
      aria-label="Trail inspector"
      className="trail-inspector"
      data-target-kind={target.kind}
    >
      <header className="trail-inspector__header">
        <span className="trail-inspector__eyebrow">Inspector</span>
        <h2>{kindLabel}</h2>
      </header>
      <p className="trail-inspector__placeholder">
        Inspector content has not been implemented yet.
      </p>
    </aside>
  );
}
