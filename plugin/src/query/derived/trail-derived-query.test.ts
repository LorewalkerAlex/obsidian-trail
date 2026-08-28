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
  selectIsTrailInitiativeCompleted,
  selectTrailCycleEffort,
  selectTrailInitiativeActualStart,
  selectTrailMilestoneActualStart,
  selectTrailMilestoneProgress,
  selectTrailProjectActualStart,
} from "./trail-derived-query";

function readyStore(configuration = createTrailTestConfiguration()) {
  const initiativeA = {
    id: "initiative-a",
    labelIds: [],
    title: "Initiative A",
  };
  const initiativeEmpty = {
    id: "initiative-empty",
    labelIds: [],
    title: "Initiative Empty",
  };
  const projectA = {
    id: "project-a",
    initiativeId: initiativeA.id,
    labelIds: [],
    statusDefinitionId: "project-completed",
    title: "Project A",
  };
  const projectB = {
    id: "project-b",
    initiativeId: initiativeA.id,
    labelIds: [],
    statusDefinitionId: "project-canceled",
    title: "Project B",
  };
  const milestoneA = {
    id: "milestone-a",
    projectId: projectA.id,
    title: "Milestone A",
  };
  const milestoneEmpty = {
    id: "milestone-empty",
    projectId: projectA.id,
    title: "Milestone Empty",
  };
  const issueA = {
    context: "workflow" as const,
    createdAt: 1,
    estimate: "medium" as const,
    firstStartedAt: 80,
    id: "issue-a",
    labelIds: [],
    milestoneId: milestoneA.id,
    projectId: projectA.id,
    statusDefinitionId: "issue-completed",
    terminalAt: 100,
    title: "Issue A",
  };
  const issueB = {
    context: "workflow" as const,
    createdAt: 2,
    estimate: "small" as const,
    firstStartedAt: 50,
    id: "issue-b",
    labelIds: [],
    projectId: projectA.id,
    statusDefinitionId: "issue-canceled",
    terminalAt: 90,
    title: "Issue B",
  };
  const issueC = {
    context: "workflow" as const,
    createdAt: 3,
    estimate: "large" as const,
    firstStartedAt: 30,
    id: "issue-c",
    labelIds: [],
    projectId: projectB.id,
    statusDefinitionId: "issue-completed",
    terminalAt: 60,
    title: "Issue C",
  };
  const cycleA = {
    id: "cycle-a",
    issueIds: [issueA.id, issueB.id, issueC.id],
    plannedEnd: 200,
    startedAt: 10,
  };

  const store = createTrailRuntimeStore();
  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration,
      workspaceState: createTrailTestWorkspaceState(),
    },
    sources: [
      {
        initiative: initiativeA,
        kind: "initiative",
        sourcePath: "Trail/Initiatives/0001 Initiative A.md",
      },
      {
        initiative: initiativeEmpty,
        kind: "initiative",
        sourcePath: "Trail/Initiatives/0002 Initiative Empty.md",
      },
      {
        issues: [issueA, issueB],
        kind: "project",
        milestones: [milestoneA, milestoneEmpty],
        project: projectA,
        sourcePath: "Trail/Projects/0001 Project A.md",
      },
      {
        issues: [issueC],
        kind: "project",
        milestones: [],
        project: projectB,
        sourcePath: "Trail/Projects/0002 Project B.md",
      },
      {
        cycles: [cycleA],
        kind: "cycles",
        sourcePath: "Trail/Collections/Cycles.md",
      },
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });

  return { cycleA, issueA, issueC, projectB, store };
}

describe("Trail canonical derived Query", () => {
  it("derives Initiative completion from current Project terminal categories", () => {
    const { projectB, store } = readyStore();

    expect(selectIsTrailInitiativeCompleted(store.getState(), "initiative-a")).toBe(true);
    expect(selectIsTrailInitiativeCompleted(store.getState(), "initiative-empty")).toBe(false);
    expect(selectIsTrailInitiativeCompleted(store.getState(), "initiative-missing")).toBeUndefined();

    addTrailPendingPlan(store, createTrailMutationPlan({
      commandId: "project-reopen",
      effects: [{
        after: { kind: "project", value: { ...projectB, statusDefinitionId: "project-started" } },
        before: { kind: "project", value: projectB },
        kind: "replace-entity",
      }],
      intent: "test.project.reopen",
    }));

    expect(selectIsTrailInitiativeCompleted(store.getState(), "initiative-a")).toBe(false);

    setTrailRuntimeControl(store, { kind: "refreshing" });
    expect(selectIsTrailInitiativeCompleted(store.getState(), "initiative-a")).toBe(true);
  });

  it("derives Milestone progress as terminal/current Issue counts without lifecycle state", () => {
    const { issueA, store } = readyStore();

    expect(selectTrailMilestoneProgress(store.getState(), "milestone-a")).toEqual({
      terminalIssueCount: 1,
      totalIssueCount: 1,
    });
    expect(selectTrailMilestoneProgress(store.getState(), "milestone-empty")).toEqual({
      terminalIssueCount: 0,
      totalIssueCount: 0,
    });
    expect(selectTrailMilestoneProgress(store.getState(), "milestone-missing")).toBeUndefined();

    const reopenedIssue = {
      ...issueA,
      statusDefinitionId: "issue-started",
      terminalAt: undefined,
    };
    addTrailPendingPlan(store, createTrailMutationPlan({
      commandId: "milestone-progress-change",
      effects: [{
        after: { kind: "issue", value: reopenedIssue },
        before: { kind: "issue", value: issueA },
        kind: "replace-entity",
      }],
      intent: "test.milestone.progress",
    }));

    expect(selectTrailMilestoneProgress(store.getState(), "milestone-a")).toEqual({
      terminalIssueCount: 0,
      totalIssueCount: 1,
    });

    setTrailRuntimeControl(store, { kind: "refreshing" });
    expect(selectTrailMilestoneProgress(store.getState(), "milestone-a")).toEqual({
      terminalIssueCount: 1,
      totalIssueCount: 1,
    });
  });

  it("derives Cycle Effort from current T-Shirt Estimates and configured weights", () => {
    const { cycleA, store } = readyStore();

    expect(selectTrailCycleEffort(store.getState(), cycleA.id)).toBe(8);
    expect(selectTrailCycleEffort(store.getState(), "cycle-missing")).toBeUndefined();

    const configured = createTrailTestConfiguration();
    const custom = readyStore({
      ...configured,
      estimateWeights: {
        ...configured.estimateWeights,
        large: 8,
        medium: 3,
      },
    });
    expect(selectTrailCycleEffort(custom.store.getState(), custom.cycleA.id)).toBe(12);
  });

  it("derives current-scope actual start from earliest Issue firstStartedAt", () => {
    const { issueC, store } = readyStore();

    expect(selectTrailProjectActualStart(store.getState(), "project-a")).toBe(50);
    expect(selectTrailProjectActualStart(store.getState(), "project-b")).toBe(30);
    expect(selectTrailMilestoneActualStart(store.getState(), "milestone-a")).toBe(80);
    expect(selectTrailInitiativeActualStart(store.getState(), "initiative-a")).toBe(30);
    expect(selectTrailInitiativeActualStart(store.getState(), "initiative-empty")).toBeUndefined();

    addTrailPendingPlan(store, createTrailMutationPlan({
      commandId: "issue-move",
      effects: [{
        after: { kind: "issue", value: { ...issueC, projectId: "project-a" } },
        before: { kind: "issue", value: issueC },
        kind: "replace-entity",
      }],
      intent: "test.issue.move",
    }));

    expect(selectTrailProjectActualStart(store.getState(), "project-a")).toBe(30);
    expect(selectTrailProjectActualStart(store.getState(), "project-b")).toBeUndefined();

    setTrailRuntimeControl(store, { kind: "refreshing" });
    expect(selectTrailProjectActualStart(store.getState(), "project-a")).toBe(50);
    expect(selectTrailProjectActualStart(store.getState(), "project-b")).toBe(30);
  });
});
