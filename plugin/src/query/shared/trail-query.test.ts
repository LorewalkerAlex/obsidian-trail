import { describe, expect, it } from "vitest";

import { createTrailMutationPlan } from "../../mutation/plans/trail-mutation-plan";
import { addTrailPendingPlan } from "../../runtime/projection/trail-runtime-projection";
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
  selectIsTrailEntityPending,
  selectTrailReadableCurrentCycleId,
  selectTrailReadableCycleIdsByIssue,
  selectTrailReadableEntityIdsByLabel,
  selectTrailReadableEntityIdsByStatusDefinition,
  selectTrailReadableMilestoneIdsByProject,
  selectTrailReadableProjectIds,
  selectTrailReadableProjectIdsByInitiative,
  selectTrailReadableTriageIssueIds,
  selectTrailReadableWorkflowIssueById,
  selectTrailReadableWorkflowIssueIdsByCycle,
  selectTrailReadableWorkflowIssueIdsByMilestone,
  selectTrailReadableWorkflowIssueIdsByProject,
} from "./trail-effective-query";
import { selectTrailStatusOptionGroups } from "./trail-status-query";

function readyStore() {
  const configuration = createTrailTestConfiguration();
  const initiative = {
    id: "initiative-a",
    labelIds: ["label-goal"],
    title: "Initiative A",
  };
  const projectA = {
    id: "project-a",
    initiativeId: initiative.id,
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
  const milestone = {
    id: "milestone-a",
    projectId: projectA.id,
    title: "Milestone A",
  };
  const issueA = {
    context: "workflow" as const,
    createdAt: 30,
    id: "issue-a",
    labelIds: ["label-old"],
    milestoneId: milestone.id,
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
  const cycle = {
    id: "cycle-open",
    issueIds: [issueA.id],
    plannedEnd: 300,
    startedAt: 100,
  };
  const store = createTrailRuntimeStore();
  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: { configuration, workspaceState: createTrailTestWorkspaceState() },
    sources: [
      {
        initiative,
        kind: "initiative",
        sourcePath: "Trail/Initiatives/0001 Initiative A.md",
      },
      {
        issues: [issueA, issueB, issueC],
        kind: "project",
        milestones: [milestone],
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
      {
        issues: [],
        kind: "projectless-issues",
        sourcePath: "Trail/Collections/Projectless Issues.md",
      },
      {
        cycles: [cycle],
        kind: "cycles",
        sourcePath: "Trail/Collections/Cycles.md",
      },
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });
  return { configuration, cycle, issueA, issueB, milestone, projectA, projectB, store };
}

describe("Trail Query read side", () => {
  it("returns deterministic page IDs and shared structural membership", () => {
    const { cycle, issueA, milestone, projectA, store } = readyStore();
    expect(selectTrailReadableProjectIds(store.getState())).toEqual(["project-b", "project-a"]);
    expect(selectTrailReadableTriageIssueIds(store.getState())).toEqual(["triage-a", "triage-z"]);
    expect(selectTrailReadableWorkflowIssueIdsByProject(store.getState(), projectA.id)).toEqual([
      "issue-b",
      "issue-a",
      "issue-c",
    ]);
    expect(selectTrailReadableProjectIdsByInitiative(store.getState(), "initiative-a"))
      .toEqual([projectA.id]);
    expect(selectTrailReadableMilestoneIdsByProject(store.getState(), projectA.id))
      .toEqual([milestone.id]);
    expect(selectTrailReadableWorkflowIssueIdsByMilestone(store.getState(), milestone.id))
      .toEqual([issueA.id]);
    expect(selectTrailReadableCurrentCycleId(store.getState())).toBe(cycle.id);
    expect(selectTrailReadableWorkflowIssueIdsByCycle(store.getState(), cycle.id))
      .toEqual([issueA.id]);
    expect(selectTrailReadableCycleIdsByIssue(store.getState(), issueA.id)).toEqual([cycle.id]);
    expect(selectTrailReadableEntityIdsByLabel(store.getState(), "label-goal"))
      .toEqual(["initiative-a"]);
    expect(selectTrailReadableEntityIdsByStatusDefinition(store.getState(), "project-unstarted"))
      .toEqual(["project-a", "project-b"]);
  });

  it("keeps structural selectors aligned with optimistic relationship changes", () => {
    const { issueA, milestone, projectA, projectB, store } = readyStore();
    const replacement = {
      ...issueA,
      firstStartedAt: 500,
      labelIds: ["label-new"],
      milestoneId: undefined,
      projectId: projectB.id,
      statusDefinitionId: "issue-started",
      title: "Optimistic",
    };
    addTrailPendingPlan(store, createTrailMutationPlan({
      commandId: "command-a",
      effects: [{
        after: { kind: "issue", value: replacement },
        before: { kind: "issue", value: issueA },
        kind: "replace-entity",
      }],
      intent: "test.issue.move-and-reclassify",
    }));

    expect(selectIsTrailEntityPending(store.getState(), issueA.id)).toBe(true);
    expect(selectTrailReadableWorkflowIssueById(store.getState(), issueA.id)?.title).toBe("Optimistic");
    expect(selectTrailReadableWorkflowIssueIdsByProject(store.getState(), projectA.id))
      .toEqual(["issue-b", "issue-c"]);
    expect(selectTrailReadableWorkflowIssueIdsByProject(store.getState(), projectB.id))
      .toEqual([issueA.id]);
    expect(selectTrailReadableWorkflowIssueIdsByMilestone(store.getState(), milestone.id)).toEqual([]);
    expect(selectTrailReadableEntityIdsByLabel(store.getState(), "label-old")).toEqual([]);
    expect(selectTrailReadableEntityIdsByLabel(store.getState(), "label-new")).toEqual([issueA.id]);
    expect(selectTrailReadableEntityIdsByStatusDefinition(store.getState(), "issue-backlog"))
      .toEqual(["issue-b"]);
    expect(selectTrailReadableEntityIdsByStatusDefinition(store.getState(), "issue-started"))
      .toEqual(["issue-a", "issue-c"]);

    setTrailRuntimeControl(store, { kind: "refreshing" });
    expect(selectTrailReadableWorkflowIssueById(store.getState(), issueA.id)?.title).toBe("A");
    expect(selectTrailReadableWorkflowIssueIdsByProject(store.getState(), projectA.id))
      .toEqual(["issue-b", "issue-a", "issue-c"]);
    expect(selectTrailReadableWorkflowIssueIdsByProject(store.getState(), projectB.id)).toEqual([]);
    expect(selectTrailReadableWorkflowIssueIdsByMilestone(store.getState(), milestone.id))
      .toEqual([issueA.id]);
    expect(selectTrailReadableEntityIdsByLabel(store.getState(), "label-old")).toEqual([issueA.id]);
    expect(selectTrailReadableEntityIdsByLabel(store.getState(), "label-new")).toEqual([]);
  });

  it("projects Cycle membership and current-cycle selection through pending plans", () => {
    const { cycle, issueB, store } = readyStore();
    const replacement = {
      ...cycle,
      endedAt: 400,
      issueIds: [issueB.id],
    };
    addTrailPendingPlan(store, createTrailMutationPlan({
      commandId: "cycle-change",
      effects: [{
        after: { kind: "cycle", value: replacement },
        before: { kind: "cycle", value: cycle },
        kind: "replace-entity",
      }],
      intent: "test.cycle.replace",
    }));

    expect(selectTrailReadableCurrentCycleId(store.getState())).toBeUndefined();
    expect(selectTrailReadableWorkflowIssueIdsByCycle(store.getState(), cycle.id))
      .toEqual([issueB.id]);
    expect(selectTrailReadableCycleIdsByIssue(store.getState(), "issue-a")).toEqual([]);
    expect(selectTrailReadableCycleIdsByIssue(store.getState(), issueB.id)).toEqual([cycle.id]);
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
