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
import { selectTrailWorkflowIssueActionFacts } from "./trail-workflow-issue-action-query";

function createStore() {
  const projectA = {
    id: "project-a",
    labelIds: [] as string[],
    statusDefinitionId: "project-started",
    title: "Alpha",
  };
  const projectB = {
    id: "project-b",
    labelIds: [] as string[],
    statusDefinitionId: "project-unstarted",
    title: "Beta",
  };
  const projectC = {
    id: "project-c",
    labelIds: [] as string[],
    statusDefinitionId: "project-started",
    title: "Gamma",
  };
  const issue = {
    context: "workflow" as const,
    createdAt: 1,
    id: "issue-a",
    labelIds: [] as string[],
    projectId: projectA.id,
    statusDefinitionId: "issue-started",
    title: "Issue A",
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
        milestones: [],
        project: projectA,
        sourcePath: "Trail/Projects/0001 Alpha.md",
      },
      {
        issues: [],
        kind: "project",
        milestones: [],
        project: projectB,
        sourcePath: "Trail/Projects/0002 Beta.md",
      },
      {
        issues: [],
        kind: "project",
        milestones: [],
        project: projectC,
        sourcePath: "Trail/Projects/0003 Gamma.md",
      },
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });
  return { issue, store };
}

describe("Workflow Issue action Query", () => {
  it("decorates capability target IDs with Query-owned labels and the expected entity snapshot", () => {
    const { issue, store } = createStore();
    const facts = selectTrailWorkflowIssueActionFacts(store.getState(), [issue.id]);

    expect(facts).not.toBeNull();
    expect(facts?.issues[0]?.expectedIssue).toBe(issue);
    expect(facts?.issues[0]?.legalTargets.moveProjects).toEqual([
      { id: "project-c", label: "Gamma" },
    ]);
    expect(facts?.issues[0]?.legalTargets.statuses).toContainEqual({
      category: "canceled",
      id: "issue-canceled",
      isDefault: true,
      label: "canceled",
    });
  });

  it("retains readable facts while Runtime control disables mutation capabilities", () => {
    const { issue, store } = createStore();
    setTrailRuntimeControl(store, { kind: "refreshing" });

    const facts = selectTrailWorkflowIssueActionFacts(store.getState(), [issue.id]);
    expect(facts?.controlKind).toBe("refreshing");
    expect(facts?.issues[0]?.expectedIssue).toBe(issue);
    expect(facts?.issues[0]?.capabilities).toMatchObject({
      canCancel: false,
      canDelete: false,
      canMoveOut: false,
    });
    expect(facts?.issues[0]?.legalTargets.moveProjects).toEqual([]);
    expect(facts?.issues[0]?.legalTargets.statuses).toEqual([]);
  });
});
