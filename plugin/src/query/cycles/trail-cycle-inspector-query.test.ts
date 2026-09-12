import { describe, expect, it } from "vitest";

import type {
  TrailCycle,
  TrailProject,
  TrailWorkflowIssue,
} from "../../domain/model/trail-entities";
import {
  buildTrailCommittedRuntimeCandidate,
  publishTrailCommittedRuntime,
} from "../../runtime/reconcile/trail-runtime-reconciler";
import {
  createTrailRuntimeStore,
  setTrailRuntimeControl,
} from "../../runtime/store/trail-runtime-store";
import {
  createTrailTestConfiguration,
  createTrailTestWorkspaceState,
} from "../../test/trail-test-fixtures";
import { selectTrailCycleInspectorReadModel } from "./trail-cycle-inspector-query";

function readyStore() {
  const project: TrailProject = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-started",
    title: "Project Alpha",
  };
  const active: TrailWorkflowIssue = {
    context: "workflow",
    createdAt: 2,
    estimate: "medium",
    id: "issue-active",
    labelIds: [],
    projectId: project.id,
    statusDefinitionId: "issue-started",
    title: "Active issue",
  };
  const completed: TrailWorkflowIssue = {
    context: "workflow",
    createdAt: 1,
    estimate: "small",
    id: "issue-completed",
    labelIds: [],
    projectId: project.id,
    statusDefinitionId: "issue-completed",
    terminalAt: 4,
    title: "Completed issue",
  };
  const current: TrailCycle = {
    id: "cycle-current",
    issueIds: [active.id, completed.id],
    plannedEnd: Date.UTC(2026, 7, 30, 16),
    startedAt: Date.UTC(2026, 7, 18, 16),
  };
  const historical: TrailCycle = {
    endedAt: Date.UTC(2026, 7, 10, 16),
    id: "cycle-history",
    issueIds: [completed.id],
    plannedEnd: Date.UTC(2026, 7, 9, 16),
    startedAt: Date.UTC(2026, 6, 27, 16),
  };
  const store = createTrailRuntimeStore();
  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(project.id),
    },
    sources: [
      {
        issues: [active, completed],
        kind: "project",
        milestones: [],
        project,
        sourcePath: "Trail/Projects/0001 Project Alpha.md",
      },
      {
        cycles: [historical, current],
        kind: "cycles",
        sourcePath: "Trail/Collections/Cycles.md",
      },
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });
  return { current, historical, store };
}

describe("Trail Cycle Inspector query", () => {
  it("projects live Current Cycle progress, effort, scope, and unfinished count", () => {
    const { current, store } = readyStore();
    const model = selectTrailCycleInspectorReadModel(store.getState(), current.id);

    expect(model?.kind).toBe("current");
    if (model?.kind !== "current") return;
    expect(model.expectedCycle).toEqual(current);
    expect(model).toMatchObject({
      effort: 3,
      issueCount: 2,
      progress: { max: 2, value: 1 },
      unfinishedIssueCount: 1,
    });
  });

  it("keeps Historical Cycle Inspector read-only without historical progress", () => {
    const { historical, store } = readyStore();
    const model = selectTrailCycleInspectorReadModel(store.getState(), historical.id);

    expect(model?.kind).toBe("historical");
    if (model?.kind !== "historical") return;
    expect(model).toMatchObject({
      endedAt: historical.endedAt,
      issueCount: 1,
      kind: "historical",
    });
    expect(model).not.toHaveProperty("progress");
    expect(model).not.toHaveProperty("unfinishedIssueCount");
  });
});
