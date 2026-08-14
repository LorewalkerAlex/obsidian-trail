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
  selectEffectiveCycleById,
  selectEffectiveTriageIssueById,
  selectEffectiveWorkflowIssueById,
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

describe("Trail Runtime logical projection", () => {
  it("publishes a multi-effect source transition through one pending plan", () => {
    const store = createTrailRuntimeStore();
    reconcileTriageContribution(store, {
      filePath: "Trail/Collections/Triage.md",
      issuesById: { [source.id]: source },
      sourceByIssueId: {},
    });
    reconcileProjectContribution(store, {
      filePath: "Trail/Projects/0001 Project A.md",
      issuesById: {},
      project,
      sourceByIssueId: {},
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
});
