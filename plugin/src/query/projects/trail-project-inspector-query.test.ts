import { describe, expect, it } from "vitest";

import type {
  TrailInitiative,
  TrailMilestone,
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
import { selectTrailProjectInspectorReadModel } from "./trail-project-inspector-query";

function readyStore() {
  const initiative: TrailInitiative = {
    id: "initiative-a",
    labelIds: [],
    title: "Initiative A",
  };
  const project: TrailProject = {
    description: "Project narrative",
    due: Date.UTC(2026, 8, 18, 4),
    id: "project-a",
    initiativeId: initiative.id,
    labelIds: ["label-work"],
    priority: "urgent",
    statusDefinitionId: "project-started",
    title: "Project A",
  };
  const milestone: TrailMilestone = {
    due: Date.UTC(2026, 8, 12, 4),
    id: "milestone-a",
    projectId: project.id,
    title: "Milestone A",
  };
  const active: TrailWorkflowIssue = {
    context: "workflow",
    createdAt: 1,
    due: Date.UTC(2026, 8, 12, 4),
    id: "issue-active",
    labelIds: [],
    milestoneId: milestone.id,
    projectId: project.id,
    statusDefinitionId: "issue-started",
    title: "Active",
  };
  const later: TrailWorkflowIssue = {
    context: "workflow",
    createdAt: 2,
    due: Date.UTC(2026, 8, 18, 4),
    id: "issue-later",
    labelIds: [],
    milestoneId: milestone.id,
    projectId: project.id,
    statusDefinitionId: "issue-backlog",
    title: "Later",
  };
  const completed: TrailWorkflowIssue = {
    context: "workflow",
    createdAt: 3,
    due: Date.UTC(2026, 8, 7, 4),
    id: "issue-completed",
    labelIds: [],
    projectId: project.id,
    statusDefinitionId: "issue-completed",
    terminalAt: 4,
    title: "Completed",
  };
  const store = createTrailRuntimeStore();
  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(project.id),
    },
    sources: [
      {
        initiative,
        kind: "initiative",
        sourcePath: "Trail/Initiatives/0001 Initiative A.md",
      },
      {
        issues: [active, later, completed],
        kind: "project",
        milestones: [milestone],
        project,
        sourcePath: "Trail/Projects/0001 Project A.md",
      },
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });
  return store;
}

describe("Project Inspector Query", () => {
  it("projects stable properties, configured status options, and derived Project insights", () => {
    const store = readyStore();
    const readModel = selectTrailProjectInspectorReadModel(
      store.getState(),
      "project-a",
      Date.UTC(2026, 8, 8, 4),
    );

    expect(readModel).not.toBeNull();
    expect(readModel?.status).toEqual({
      category: "started",
      id: "project-started",
      label: "started",
    });
    expect(readModel?.initiativeTargets).toEqual([{ id: "initiative-a", title: "Initiative A" }]);
    expect(readModel?.progress).toEqual({ max: 3, value: 1 });
    expect(readModel?.attention).toEqual({ later: 1, overdue: 0, thisWeek: 1 });
    expect(readModel?.milestones).toEqual([{
      due: Date.UTC(2026, 8, 12, 4),
      id: "milestone-a",
      progress: { max: 2, value: 0 },
      title: "Milestone A",
    }]);
    expect(readModel?.statusOptionGroups.map(({ category }) => category)).toEqual([
      "unstarted",
      "started",
      "completed",
      "canceled",
    ]);
  });

  it("returns unavailable Progress when no non-canceled work exists", () => {
    const store = readyStore();
    const state = store.getState();
    const readableProject = state.committed.authoritative.domain.projectsById.get("project-a");
    expect(readableProject).toBeDefined();

    const emptyStore = createTrailRuntimeStore();
    publishTrailCommittedRuntime(emptyStore, buildTrailCommittedRuntimeCandidate({
      pluginData: {
        configuration: createTrailTestConfiguration(),
        workspaceState: createTrailTestWorkspaceState("project-a"),
      },
      sources: [{
        issues: [],
        kind: "project",
        milestones: [],
        project: readableProject!,
        sourcePath: "Trail/Projects/0001 Project A.md",
      }],
    }), { sourceIssuesByPath: {} });
    setTrailRuntimeControl(emptyStore, { kind: "ready" });

    expect(selectTrailProjectInspectorReadModel(
      emptyStore.getState(),
      "project-a",
      Date.UTC(2026, 8, 8, 4),
    )?.progress).toEqual({ unavailable: true });
  });
});
