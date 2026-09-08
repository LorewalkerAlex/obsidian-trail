import { useStore } from "zustand";

import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { TrailInitiativeInspector } from "../pages/projects/trail-initiative-inspector";
import { TrailProjectInspector } from "../pages/projects/trail-project-inspector";
import type { TrailInspectorStore, TrailInspectorTarget } from "./trail-inspector-state";
import type { TrailUiActions } from "./trail-ui-actions";

export interface TrailInspectorProps {
  readonly actions: TrailUiActions;
  readonly inspectorStore: TrailInspectorStore;
  readonly runtimeStore: TrailRuntimeStore;
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

function TrailPendingInspector({ target }: { readonly target: TrailInspectorTarget }) {
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

export function TrailInspector({
  actions,
  inspectorStore,
  runtimeStore,
}: TrailInspectorProps) {
  const target = useStore(inspectorStore, (state) => state.target);

  if (target === null) return null;
  if (target.kind === "initiative") {
    return (
      <TrailInitiativeInspector
        actions={actions.initiatives}
        initiativeId={target.initiativeId}
        key={target.initiativeId}
        runtimeStore={runtimeStore}
      />
    );
  }
  if (target.kind === "project") {
    return (
      <TrailProjectInspector
        actions={{ milestones: actions.milestones, projects: actions.projects }}
        key={target.projectId}
        projectId={target.projectId}
        runtimeStore={runtimeStore}
      />
    );
  }

  return <TrailPendingInspector target={target} />;
}
