import { describe, expect, it } from "vitest";

import type { TrailProject, TrailWorkflowIssue } from "../../domain/model/trail-entities";
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
import { selectTrailWorkflowIssueEffectiveCapabilities } from "./trail-effective-capability-query";

function readyStore(input: {
  readonly projectStatus?: string;
  readonly targetProjectStatus?: string;
  readonly workflowStatus?: string;
} = {}) {
  const project: TrailProject = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: input.projectStatus ?? "project-started",
    title: "Project A",
  };
  const targetProject: TrailProject = {
    id: "project-b",
    labelIds: [],
    statusDefinitionId: input.targetProjectStatus ?? "project-started",
    title: "Project B",
  };
  const workflowStatus = input.workflowStatus ?? "issue-unstarted";
  const workflow: TrailWorkflowIssue = {
    context: "workflow",
    createdAt: 1,
    id: "issue-a",
    labelIds: [],
    projectId: project.id,
    statusDefinitionId: workflowStatus,
    title: "Issue A",
    ...(workflowStatus === "issue-completed"
      ? { estimate: "small" as const, terminalAt: 2 }
      : {}),
  };
  const store = createTrailRuntimeStore();
  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(project.id),
    },
    sources: [
      {
        issues: [workflow],
        kind: "project",
        milestones: [],
        project,
        sourcePath: "Trail/Projects/0001 Project A.md",
      },
      {
        issues: [],
        kind: "project",
        milestones: [],
        project: targetProject,
        sourcePath: "Trail/Projects/0002 Project B.md",
      },
      { issues: [], kind: "triage", sourcePath: "Trail/Collections/Triage.md" },
      { cycles: [], kind: "cycles", sourcePath: "Trail/Collections/Cycles.md" },
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });
  return { project, store, targetProject, workflow };
}

function selectCapabilities(test: ReturnType<typeof readyStore>) {
  return selectTrailWorkflowIssueEffectiveCapabilities(
    test.store.getState(),
    test.workflow.id,
  );
}

describe("Workflow Issue effective capability Query", () => {
  it("projects ordinary Started-Project actions and ordered legal targets", () => {
    const test = readyStore();
    expect(selectCapabilities(test)).toEqual({
      capabilities: {
        canAssignMilestone: true,
        canCancel: true,
        canChangeStatus: true,
        canDelete: true,
        canEditPlanningFields: true,
        canMoveOut: true,
      },
      legalTargets: {
        moveProjectIds: [test.targetProject.id],
        statusDefinitionIds: [
          "issue-backlog",
          "issue-started",
          "issue-completed",
          "issue-canceled",
        ],
      },
    });
  });

  it("keeps Unstarted Backlog planning while exposing only Backlog-compatible lifecycle actions", () => {
    const test = readyStore({
      projectStatus: "project-unstarted",
      targetProjectStatus: "project-unstarted",
      workflowStatus: "issue-backlog",
    });
    expect(selectCapabilities(test)).toEqual({
      capabilities: {
        canAssignMilestone: true,
        canCancel: true,
        canChangeStatus: true,
        canDelete: true,
        canEditPlanningFields: true,
        canMoveOut: true,
      },
      legalTargets: {
        moveProjectIds: [test.targetProject.id],
        statusDefinitionIds: ["issue-canceled"],
      },
    });
  });

  it("limits later-state work in an Unstarted Project to cleanup actions", () => {
    const test = readyStore({
      projectStatus: "project-unstarted",
      targetProjectStatus: "project-started",
      workflowStatus: "issue-started",
    });
    expect(selectCapabilities(test)).toEqual({
      capabilities: {
        canAssignMilestone: false,
        canCancel: true,
        canChangeStatus: true,
        canDelete: false,
        canEditPlanningFields: false,
        canMoveOut: true,
      },
      legalTargets: {
        moveProjectIds: [test.targetProject.id],
        statusDefinitionIds: ["issue-canceled"],
      },
    });
  });

  it("keeps Canceled unresolved work limited to cancel or move-out cleanup", () => {
    const test = readyStore({
      projectStatus: "project-canceled",
      targetProjectStatus: "project-started",
      workflowStatus: "issue-unstarted",
    });
    expect(selectCapabilities(test)).toEqual({
      capabilities: {
        canAssignMilestone: false,
        canCancel: true,
        canChangeStatus: true,
        canDelete: false,
        canEditPlanningFields: false,
        canMoveOut: true,
      },
      legalTargets: {
        moveProjectIds: [test.targetProject.id],
        statusDefinitionIds: ["issue-canceled"],
      },
    });
  });

  it("keeps Completed Project children read-only except for legal move-out cleanup", () => {
    const test = readyStore({
      projectStatus: "project-completed",
      targetProjectStatus: "project-started",
      workflowStatus: "issue-completed",
    });
    expect(selectCapabilities(test)).toEqual({
      capabilities: {
        canAssignMilestone: false,
        canCancel: false,
        canChangeStatus: false,
        canDelete: false,
        canEditPlanningFields: false,
        canMoveOut: true,
      },
      legalTargets: {
        moveProjectIds: [test.targetProject.id],
        statusDefinitionIds: [],
      },
    });
  });

  it("removes write affordances when Runtime is not writable", () => {
    const test = readyStore();
    setTrailRuntimeControl(test.store, { kind: "refreshing" });
    expect(selectCapabilities(test)).toEqual({
      capabilities: {
        canAssignMilestone: false,
        canCancel: false,
        canChangeStatus: false,
        canDelete: false,
        canEditPlanningFields: false,
        canMoveOut: false,
      },
      legalTargets: {
        moveProjectIds: [],
        statusDefinitionIds: [],
      },
    });
  });

  it("returns null when the requested Workflow Issue is absent", () => {
    const test = readyStore();
    expect(selectTrailWorkflowIssueEffectiveCapabilities(
      test.store.getState(),
      "missing-issue",
    )).toBeNull();
  });
});
