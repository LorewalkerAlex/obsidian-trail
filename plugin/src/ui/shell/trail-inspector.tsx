import { useStore } from "zustand";

import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { TrailCycleInspector } from "../pages/cycles/trail-cycle-inspector";
import { TrailIssueInspector } from "../pages/issues/trail-issue-inspector";
import { TrailInitiativeInspector } from "../pages/projects/trail-initiative-inspector";
import { TrailProjectInspector } from "../pages/projects/trail-project-inspector";
import type { TrailInspectorStore } from "./trail-inspector-state";
import type { TrailUiActions } from "./trail-ui-actions";

export interface TrailInspectorProps {
  readonly actions: TrailUiActions;
  readonly inspectorStore: TrailInspectorStore;
  readonly runtimeStore: TrailRuntimeStore;
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
  if (target.kind === "issue") {
    return (
      <TrailIssueInspector
        actions={{ cycles: actions.cycles, issues: actions.issues }}
        issueId={target.issueId}
        key={target.issueId}
        runtimeStore={runtimeStore}
      />
    );
  }
  return (
    <TrailCycleInspector
      actions={actions.cycles}
      cycleId={target.cycleId}
      key={target.cycleId}
      runtimeStore={runtimeStore}
    />
  );
}
