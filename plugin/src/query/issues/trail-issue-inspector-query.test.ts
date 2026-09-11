import { describe, expect, it } from "vitest";

import type {
  TrailCycle,
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
import { selectTrailIssueInspectorReadModel } from "./trail-issue-inspector-query";

function readyStore() {
  const projectA: TrailProject = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-started",
    title: "Project A",
  };
  const projectB: TrailProject = {
    id: "project-b",
    labelIds: [],
    statusDefinitionId: "project-started",
    title: "Project B",
  };
  const milestoneA: TrailMilestone = {
    id: "milestone-a",
    projectId: projectA.id,
    title: "Alpha milestone",
  };
  const milestoneZ: TrailMilestone = {
    id: "milestone-z",
    projectId: projectA.id,
    title: "Zulu milestone",
  };
  const issue: TrailWorkflowIssue = {
    context: "workflow",
    createdAt: 1,
    due: 100,
    estimate: "medium",
    id: "issue-a",
    labelIds: ["label-work"],
    milestoneId: milestoneZ.id,
    priority: "high",
    projectId: projectA.id,
    statusDefinitionId: "issue-started",
    title: "Inspect this issue",
  };
  const cycle: TrailCycle = {
    id: "cycle-open",
    issueIds: [issue.id],
    plannedEnd: 200,
    startedAt: 50,
  };
  const store = createTrailRuntimeStore();

  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(projectA.id),
    },
    sources: [
      {
        issues: [issue],
        kind: "project",
        milestones: [milestoneZ, milestoneA],
        project: projectA,
        sourcePath: "Trail/Projects/0001 Project A.md",
      },
      {
        issues: [],
        kind: "project",
        milestones: [],
        project: projectB,
        sourcePath: "Trail/Projects/0002 Project B.md",
      },
      {
        cycles: [cycle],
        kind: "cycles",
        sourcePath: "Trail/Collections/Cycles.md",
      },
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });

  return { issue, store };
}

describe("Issue Inspector Query", () => {
  it("projects editable property targets and Current Cycle context from one readable snapshot", () => {
    const { issue, store } = readyStore();

    const readModel = selectTrailIssueInspectorReadModel(store.getState(), issue.id);

    expect(readModel).toMatchObject({
      canChangeCurrentCycleMembership: true,
      currentCycle: {
        expectedCycle: { id: "cycle-open" },
        isMember: true,
      },
      estimate: "medium",
      milestoneId: "milestone-z",
      priority: "high",
      project: { id: "project-a", title: "Project A" },
      status: { id: "issue-started", label: "started" },
      title: "Inspect this issue",
    });
    expect(readModel?.projectTargets.map(({ id }) => id)).toEqual(["project-a", "project-b"]);
    expect(readModel?.milestoneTargets.map(({ id }) => id)).toEqual(["milestone-a", "milestone-z"]);
    expect(readModel?.statusOptionGroups.flatMap(({ definitions }) => definitions.map(({ id }) => id)))
      .toContain("issue-started");
  });

  it("keeps readable context but removes every write affordance in read-only Runtime state", () => {
    const { issue, store } = readyStore();
    setTrailRuntimeControl(store, { kind: "refreshing" });

    const readModel = selectTrailIssueInspectorReadModel(store.getState(), issue.id);

    expect(readModel?.title).toBe("Inspect this issue");
    expect(readModel?.capabilities).toEqual({
      canAssignMilestone: false,
      canCancel: false,
      canChangeStatus: false,
      canDelete: false,
      canEditPlanningFields: false,
      canMoveOut: false,
    });
    expect(readModel?.canChangeCurrentCycleMembership).toBe(false);
  });
});
