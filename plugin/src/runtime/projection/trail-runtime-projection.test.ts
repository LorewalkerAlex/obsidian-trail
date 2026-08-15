import { describe, expect, it } from "vitest";

import {
  createTrailMutationPlan,
  cycleMutationEntity,
  triageIssueMutationEntity,
  workflowIssueMutationEntity,
} from "../../mutation/plans/trail-mutation-plan";
import {
  reconcileProjectContribution,
  reconcileTriageContribution,
} from "../reconcile/trail-runtime-reconciler";
import { createTrailRuntimeStore } from "../store/trail-runtime-store";
import {
  addTrailPendingPlan,
  removePendingPlan,
  selectEffectiveCycleById,
  selectEffectiveTriageIssueById,
  selectEffectiveTriageIssueIds,
  selectEffectiveWorkflowIssueById,
  selectIsTriageIssuePending,
} from "./trail-runtime-projection";

const project = {
  id: "project-a",
  labelIds: [],
  statusDefinitionId: "project-status",
  title: "Project A",
} as const;

const source = {
  context: "triage",
  due: 1_000,
  id: "triage-a",
  labelIds: [],
  title: "Captured work",
} as const;

const target = {
  context: "workflow",
  createdAt: 2_000,
  id: "workflow-a",
  labelIds: [],
  projectId: project.id,
  statusDefinitionId: "issue-status",
  title: source.title,
} as const;

function triageContribution(
  issues: readonly {
    due: number;
    id: string;
    title: string;
  }[],
) {
  return {
    filePath: "Trail/Collections/Triage.md",
    issuesById: Object.fromEntries(issues.map((issue) => [
      issue.id,
      {
        context: "triage" as const,
        due: issue.due,
        id: issue.id,
        labelIds: [],
        title: issue.title,
      },
    ])),
  };
}

describe("Trail Runtime logical projection", () => {
  it("publishes a multi-effect source transition through one pending plan", () => {
    const store = createTrailRuntimeStore();
    reconcileTriageContribution(store, {
      filePath: "Trail/Collections/Triage.md",
      issuesById: { [source.id]: source },
    });
    reconcileProjectContribution(store, {
      filePath: "Trail/Projects/0001 Project A.md",
      issuesById: {},
      project,
    });

    const plan = createTrailMutationPlan({
      commandId: "accept-command",
      effects: [
        { before: triageIssueMutationEntity(source), kind: "delete" },
        { after: workflowIssueMutationEntity(target), kind: "create" },
      ],
      intent: "triage.accept",
    });
    addTrailPendingPlan(store, plan);

    const optimistic = store.getState();
    expect(optimistic.pendingPlans).toHaveLength(1);
    expect(selectEffectiveTriageIssueById(optimistic, source.id)).toBeUndefined();
    expect(selectEffectiveWorkflowIssueById(optimistic, target.id)).toEqual(target);
    expect(optimistic.committed.triageIssuesById[source.id]).toEqual(source);
    expect(optimistic.committed.workflowIssuesById[target.id]).toBeUndefined();
  });

  it(
    "projects structurally known deferred Core Entities without enabling their persistence behavior",
    () => {
      const store = createTrailRuntimeStore();
      const cycle = {
        id: "cycle-a",
        issueIds: [],
        plannedEnd: 3_000,
        startedAt: 2_000,
      } as const;
      addTrailPendingPlan(store, createTrailMutationPlan({
        commandId: "cycle-command",
        effects: [{ after: cycleMutationEntity(cycle), kind: "create" }],
        intent: "cycle.create",
      }));

      expect(selectEffectiveCycleById(store.getState(), cycle.id)).toEqual(cycle);
      expect(store.getState().committed.cyclesById[cycle.id]).toBeUndefined();
    },
  );

  it("replays later pending creates when an earlier plan is removed", () => {
    const store = createTrailRuntimeStore();
    const first = {
      context: "triage" as const,
      due: 20,
      id: "first-issue",
      labelIds: [],
      title: "First",
    };
    const second = {
      context: "triage" as const,
      due: 10,
      id: "second-issue",
      labelIds: [],
      title: "Second",
    };

    addTrailPendingPlan(store, createTrailMutationPlan({
      commandId: "first",
      effects: [{ after: triageIssueMutationEntity(first), kind: "create" }],
      intent: "triage.issue.create",
    }));
    addTrailPendingPlan(store, createTrailMutationPlan({
      commandId: "second",
      effects: [{ after: triageIssueMutationEntity(second), kind: "create" }],
      intent: "triage.issue.create",
    }));

    removePendingPlan(store, "first");

    expect(selectEffectiveTriageIssueIds(store.getState())).toEqual([
      "second-issue",
    ]);
    expect(store.getState().pendingPlans.map((plan) => plan.commandId)).toEqual([
      "second",
    ]);
  });

  it("projects pending replacement and reorders by optimistic Due", () => {
    const store = createTrailRuntimeStore();
    reconcileTriageContribution(store, triageContribution([
      { due: 10, id: "a", title: "A" },
      { due: 20, id: "b", title: "B" },
    ]));
    const expectedIssue = store.getState().committed.triageIssuesById.b;
    const nextIssue = {
      ...expectedIssue,
      due: 5,
      title: "B edited",
    };

    addTrailPendingPlan(store, createTrailMutationPlan({
      commandId: "edit-b",
      effects: [{
        after: triageIssueMutationEntity(nextIssue),
        before: triageIssueMutationEntity(expectedIssue),
        kind: "replace",
      }],
      intent: "triage.issue.replace",
    }));

    expect(selectEffectiveTriageIssueIds(store.getState())).toEqual(["b", "a"]);
    expect(selectEffectiveTriageIssueById(store.getState(), "b")?.title).toBe(
      "B edited",
    );
    expect(selectIsTriageIssuePending(store.getState(), "b")).toBe(true);
    expect(store.getState().committed.triageIssuesById.b.title).toBe("B");

    removePendingPlan(store, "edit-b");
    expect(selectEffectiveTriageIssueIds(store.getState())).toEqual(["a", "b"]);
    expect(selectEffectiveTriageIssueById(store.getState(), "b")?.title).toBe("B");
  });

  it("projects pending delete and restores the committed entity when removed", () => {
    const store = createTrailRuntimeStore();
    reconcileTriageContribution(store, triageContribution([
      { due: 10, id: "a", title: "A" },
    ]));
    const expectedIssue = store.getState().committed.triageIssuesById.a;

    addTrailPendingPlan(store, createTrailMutationPlan({
      commandId: "delete-a",
      effects: [{ before: triageIssueMutationEntity(expectedIssue), kind: "delete" }],
      intent: "triage.issue.delete",
    }));

    expect(selectEffectiveTriageIssueIds(store.getState())).toEqual([]);
    expect(selectEffectiveTriageIssueById(store.getState(), "a")).toBeUndefined();
    expect(selectIsTriageIssuePending(store.getState(), "a")).toBe(true);

    removePendingPlan(store, "delete-a");

    expect(selectEffectiveTriageIssueIds(store.getState())).toEqual(["a"]);
    expect(selectEffectiveTriageIssueById(store.getState(), "a")?.title).toBe("A");
  });
});
