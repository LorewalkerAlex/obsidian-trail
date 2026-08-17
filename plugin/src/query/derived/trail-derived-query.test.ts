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
  selectTrailInitiativeActualStart,
  selectTrailMilestoneActualStart,
  selectTrailProjectActualStart,
} from "./trail-derived-query";

function readyStore() {
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
  const issueA = {
    context: "workflow" as const,
    createdAt: 1,
    estimate: 1,
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
    estimate: 1,
    firstStartedAt: 30,
    id: "issue-c",
    labelIds: [],
    projectId: projectB.id,
    statusDefinitionId: "issue-completed",
    terminalAt: 60,
    title: "Issue C",
  };

  const store = createTrailRuntimeStore();
  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
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
        milestones: [milestoneA],
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
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });

  return { issueC, projectB, store };
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
