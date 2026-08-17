import { describe, expect, it } from "vitest";

import { addTrailPendingPlan } from "../../runtime/projection/trail-runtime-projection";
import {
  buildTrailCommittedRuntimeCandidate,
  publishTrailCommittedRuntime,
} from "../../runtime/reconcile/trail-runtime-reconciler";
import {
  createTrailRuntimeStore,
  setTrailRuntimeControl,
} from "../../runtime/store/trail-runtime-store";
import { createTrailMutationPlan } from "../../mutation/plans/trail-mutation-plan";
import {
  createTrailTestConfiguration,
  createTrailTestWorkspaceState,
} from "../../test/trail-test-fixtures";
import {
  selectIsTrailEntityPending,
  selectTrailReadableProjectIds,
  selectTrailReadableTriageIssueIds,
  selectTrailReadableWorkflowIssueById,
  selectTrailReadableWorkflowIssueIdsByProject,
} from "./trail-effective-query";
import { selectTrailStatusOptionGroups } from "./trail-status-query";

function readyStore() {
  const configuration = createTrailTestConfiguration();
  const projectA = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-unstarted",
    title: "Zulu",
  };
  const projectB = {
    id: "project-b",
    labelIds: [],
    statusDefinitionId: "project-unstarted",
    title: "Alpha",
  };
  const issueA = {
    context: "workflow" as const,
    createdAt: 30,
    id: "issue-a",
    labelIds: [],
    priority: "low" as const,
    projectId: projectA.id,
    statusDefinitionId: "issue-backlog",
    title: "A",
  };
  const issueB = {
    context: "workflow" as const,
    createdAt: 10,
    id: "issue-b",
    labelIds: [],
    priority: "urgent" as const,
    projectId: projectA.id,
    statusDefinitionId: "issue-backlog",
    title: "B",
  };
  const issueC = {
    context: "workflow" as const,
    createdAt: 1,
    firstStartedAt: 50,
    id: "issue-c",
    labelIds: [],
    projectId: projectA.id,
    statusDefinitionId: "issue-started",
    title: "C",
  };
  const triageLate = {
    context: "triage" as const,
    due: 200,
    id: "triage-z",
    labelIds: [],
    title: "Late",
  };
  const triageEarly = {
    context: "triage" as const,
    due: 100,
    id: "triage-a",
    labelIds: [],
    title: "Early",
  };
  const store = createTrailRuntimeStore();
  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: { configuration, workspaceState: createTrailTestWorkspaceState() },
    sources: [
      {
        issues: [issueA, issueB, issueC],
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
      {
        issues: [triageLate, triageEarly],
        kind: "triage",
        sourcePath: "Trail/Collections/Triage.md",
      },
      { issues: [], kind: "projectless-issues", sourcePath: "Trail/Collections/Projectless Issues.md" },
      { cycles: [], kind: "cycles", sourcePath: "Trail/Collections/Cycles.md" },
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });
  return { configuration, issueA, store };
}

describe("Trail Query read side", () => {
  it("returns deterministic page IDs without storing presentation rank", () => {
    const { store } = readyStore();
    expect(selectTrailReadableProjectIds(store.getState())).toEqual(["project-b", "project-a"]);
    expect(selectTrailReadableTriageIssueIds(store.getState())).toEqual(["triage-a", "triage-z"]);
    expect(selectTrailReadableWorkflowIssueIdsByProject(store.getState(), "project-a")).toEqual([
      "issue-b",
      "issue-a",
      "issue-c",
    ]);
  });

  it("shows optimistic entities only while Runtime is ready", () => {
    const { issueA, store } = readyStore();
    const replacement = { ...issueA, title: "Optimistic" };
    addTrailPendingPlan(store, createTrailMutationPlan({
      commandId: "command-a",
      effects: [{
        after: { kind: "issue", value: replacement },
        before: { kind: "issue", value: issueA },
        kind: "replace-entity",
      }],
      intent: "test.issue.replace",
    }));

    expect(selectIsTrailEntityPending(store.getState(), issueA.id)).toBe(true);
    expect(selectTrailReadableWorkflowIssueById(store.getState(), issueA.id)?.title).toBe("Optimistic");

    setTrailRuntimeControl(store, { kind: "refreshing" });
    expect(selectTrailReadableWorkflowIssueById(store.getState(), issueA.id)?.title).toBe("A");
  });

  it("keeps status picker order driven by Configuration", () => {
    const { configuration } = readyStore();
    const groups = selectTrailStatusOptionGroups(configuration, "issue");
    expect(groups.map(({ category }) => category)).toEqual([
      "backlog",
      "unstarted",
      "started",
      "completed",
      "canceled",
    ]);
    expect(groups[0]?.definitions.map(({ id }) => id)).toEqual(["issue-backlog"]);
  });
});
