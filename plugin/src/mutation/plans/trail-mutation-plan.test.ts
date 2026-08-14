import { describe, expect, it } from "vitest";

import {
  createTrailMutationPlan,
  cycleMutationEntity,
  initiativeMutationEntity,
  mergeTrailMutationPlans,
  milestoneMutationEntity,
  projectMutationEntity,
  triageIssueMutationEntity,
  workflowIssueMutationEntity,
} from "./trail-mutation-plan";

const project = {
  id: "project-a",
  labelIds: [],
  statusDefinitionId: "project-status",
  title: "Project A",
} as const;

const triage = {
  context: "triage",
  due: 1_000,
  id: "triage-a",
  labelIds: [],
  title: "Triage A",
} as const;

const workflow = {
  context: "workflow",
  createdAt: 2_000,
  id: "workflow-a",
  labelIds: [],
  projectId: project.id,
  statusDefinitionId: "issue-status",
  title: "Workflow A",
} as const;

describe("Trail logical mutation plan", () => {
  it("derives scope and logical conditions from create/replace/delete effects", () => {
    const replacement = { ...triage, due: 3_000 };
    const plan = createTrailMutationPlan({
      commandId: "command-a",
      effects: [
        { after: projectMutationEntity(project), kind: "create" },
        {
          after: triageIssueMutationEntity(replacement),
          before: triageIssueMutationEntity(triage),
          kind: "replace",
        },
        { before: workflowIssueMutationEntity(workflow), kind: "delete" },
      ],
      intent: "test.logical-plan",
    });

    expect(plan.affectedScope.entityIds).toEqual([
      "project-a",
      "triage-a",
      "workflow-a",
    ]);
    expect(plan.preconditions.map((condition) => condition.kind)).toEqual([
      "entity-absent",
      "entity-equals",
      "entity-equals",
    ]);
    expect(plan.postconditions.map((condition) => condition.kind)).toEqual([
      "entity-equals",
      "entity-equals",
      "entity-absent",
    ]);
  });


  it("keeps the full Core Entity universe available to logical planning", () => {
    const initiative = {
      id: "initiative-a",
      labelIds: [],
      title: "Initiative A",
    } as const;
    const milestone = {
      id: "milestone-a",
      projectId: project.id,
      title: "Milestone A",
    } as const;
    const cycle = {
      id: "cycle-a",
      issueIds: [workflow.id],
      plannedEnd: 5_000,
      startedAt: 4_000,
    } as const;

    const plan = createTrailMutationPlan({
      commandId: "command-core-universe",
      effects: [
        { after: initiativeMutationEntity(initiative), kind: "create" },
        { after: milestoneMutationEntity(milestone), kind: "create" },
        { after: cycleMutationEntity(cycle), kind: "create" },
      ],
      intent: "test.core-universe",
    });

    expect(plan.effects.map((effect) => (
      effect.kind === "delete" ? effect.before.kind : effect.after.kind
    ))).toEqual([
      "initiative",
      "milestone",
      "cycle",
    ]);
    expect(plan.affectedScope.entityIds).toEqual([
      "cycle-a",
      "initiative-a",
      "milestone-a",
    ]);
  });

  it("rejects multiple final effects for one stable identity", () => {
    expect(() => createTrailMutationPlan({
      commandId: "command-a",
      effects: [
        { before: triageIssueMutationEntity(triage), kind: "delete" },
        { after: triageIssueMutationEntity(triage), kind: "create" },
      ],
      intent: "test.duplicate-effect",
    })).toThrow(/multiple final effects/);
  });

  it("merges subplans from one command into one logical pending plan", () => {
    const source = createTrailMutationPlan({
      commandId: "accept-command",
      effects: [{ before: triageIssueMutationEntity(triage), kind: "delete" }],
      intent: "triage.issue.delete",
    });
    const target = createTrailMutationPlan({
      commandId: "accept-command",
      effects: [{ after: workflowIssueMutationEntity(workflow), kind: "create" }],
      intent: "workflow.issue.create",
      preconditions: [{
        entity: projectMutationEntity(project),
        kind: "entity-equals",
      }],
    });

    const merged = mergeTrailMutationPlans({
      commandId: "accept-command",
      intent: "triage.accept",
      plans: [source, target],
    });

    expect(merged.effects).toHaveLength(2);
    expect(merged.affectedScope.entityIds).toEqual([
      "project-a",
      "triage-a",
      "workflow-a",
    ]);
    expect(merged.preconditions).toEqual(expect.arrayContaining([
      { entity: projectMutationEntity(project), kind: "entity-equals" },
    ]));
  });
});
