import { describe, expect, it } from "vitest";

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
import {
  selectTrailDefaultTriageAcceptProjectId,
  selectTrailReadableDefaultProject,
  selectTrailTriageAcceptProjectIds,
  selectTrailWorkflowIssueMoveProjectIds,
} from "./trail-project-target-query";

function readyStore(input: {
  readonly defaultProjectId?: string;
  readonly projectAStatus?: string;
  readonly projectBStatus?: string;
  readonly workflowStatus?: string;
} = {}) {
  const projectA = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: input.projectAStatus ?? "project-unstarted",
    title: "Zulu",
  };
  const projectB = {
    id: "project-b",
    labelIds: [],
    statusDefinitionId: input.projectBStatus ?? "project-completed",
    title: "Alpha",
  };
  const workflow = {
    context: "workflow" as const,
    createdAt: 1,
    id: "issue-a",
    labelIds: [] as string[],
    projectId: projectA.id,
    statusDefinitionId: input.workflowStatus ?? "issue-unstarted",
    title: "Issue A",
    ...(input.workflowStatus === "issue-completed"
      ? { estimate: "small" as const, terminalAt: 2 }
      : {}),
  };
  const workspaceState = createTrailTestWorkspaceState(input.defaultProjectId ?? projectA.id);
  const store = createTrailRuntimeStore();
  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState,
    },
    sources: [
      {
        issues: [workflow],
        kind: "project",
        milestones: [],
        project: projectA,
        sourcePath: "Trail/Projects/0001 Zulu.md",
      },
      {
        issues: [],
        kind: "project",
        milestones: [],
        project: projectB,
        sourcePath: "Trail/Projects/0002 Alpha.md",
      },
      { issues: [], kind: "triage", sourcePath: "Trail/Collections/Triage.md" },
      { cycles: [], kind: "cycles", sourcePath: "Trail/Collections/Cycles.md" },
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });
  return { projectA, projectB, store, workflow };
}

describe("Project target Query", () => {
  it("resolves Default Project by stable Workspace reference without title semantics", () => {
    const { projectA, store } = readyStore({ defaultProjectId: "project-a" });
    expect(selectTrailReadableDefaultProject(store.getState())).toBe(projectA);
  });

  it("offers only Projects that can accept the Backlog Issue created by Triage Accept", () => {
    const { projectA, store } = readyStore({ defaultProjectId: "project-a" });
    expect(selectTrailTriageAcceptProjectIds(store.getState())).toEqual([projectA.id]);
    expect(selectTrailDefaultTriageAcceptProjectId(store.getState())).toBe(projectA.id);
  });

  it("does not preselect a terminal Default Project for an action it cannot accept", () => {
    const terminal = readyStore({
      defaultProjectId: "project-b",
      projectAStatus: "project-unstarted",
      projectBStatus: "project-completed",
    });
    expect(selectTrailReadableDefaultProject(terminal.store.getState())).toBe(terminal.projectB);
    expect(selectTrailDefaultTriageAcceptProjectId(terminal.store.getState())).toBeUndefined();
  });

  it("offers only legal explicit Project destinations for a Workflow Issue move", () => {
    const nonTerminal = readyStore({
      projectAStatus: "project-unstarted",
      projectBStatus: "project-completed",
    });
    expect(selectTrailWorkflowIssueMoveProjectIds(
      nonTerminal.store.getState(),
      nonTerminal.workflow.id,
    )).toEqual([nonTerminal.projectA.id]);

    const startedTarget = readyStore({
      projectAStatus: "project-unstarted",
      projectBStatus: "project-started",
    });
    expect(selectTrailWorkflowIssueMoveProjectIds(
      startedTarget.store.getState(),
      startedTarget.workflow.id,
    )).toEqual([startedTarget.projectB.id, startedTarget.projectA.id]);
  });

  it("allows terminal Workflow Issue history to move into terminal Projects", () => {
    const terminal = readyStore({
      projectAStatus: "project-completed",
      projectBStatus: "project-canceled",
      workflowStatus: "issue-completed",
    });
    expect(selectTrailWorkflowIssueMoveProjectIds(
      terminal.store.getState(),
      terminal.workflow.id,
    )).toEqual([terminal.projectB.id, terminal.projectA.id]);
  });
});
