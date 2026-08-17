import { describe, expect, it } from "vitest";

import type {
  TrailCycle,
  TrailInitiative,
  TrailMilestone,
  TrailProject,
  TrailWorkflowIssue,
} from "../model/trail-entities";
import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";
import type { TrailMutationPlan, TrailStateEffect } from "../../mutation/plans/trail-mutation-plan";
import {
  planDeleteTrailCycle,
  planDeleteTrailInitiative,
  planDeleteTrailMilestone,
  planDeleteTrailProject,
  planDeleteTrailWorkflowIssue,
} from "./trail-delete-planning";
import type { TrailPlanningState } from "./trail-planning-state";

function state(): TrailPlanningState & {
  readonly cycleClosed: TrailCycle;
  readonly cycleOpen: TrailCycle;
  readonly initiativeA: TrailInitiative;
  readonly initiativeB: TrailInitiative;
  readonly issueA: TrailWorkflowIssue;
  readonly milestoneA: TrailMilestone;
  readonly milestoneA2: TrailMilestone;
  readonly milestoneB: TrailMilestone;
  readonly projectA: TrailProject;
  readonly projectB: TrailProject;
} {
  const initiativeA: TrailInitiative = { id: "initiative-a", labelIds: [], title: "Initiative A" };
  const initiativeB: TrailInitiative = { id: "initiative-b", labelIds: [], title: "Initiative B" };
  const projectA: TrailProject = {
    id: "project-a",
    initiativeId: initiativeA.id,
    labelIds: [],
    statusDefinitionId: "project-unstarted",
    title: "Project A",
  };
  const projectB: TrailProject = {
    id: "project-b",
    initiativeId: initiativeA.id,
    labelIds: [],
    statusDefinitionId: "project-unstarted",
    title: "Project B",
  };
  const milestoneA: TrailMilestone = { id: "milestone-a", projectId: projectA.id, title: "Milestone A" };
  const milestoneA2: TrailMilestone = { id: "milestone-a2", projectId: projectA.id, title: "Milestone A2" };
  const milestoneB: TrailMilestone = { id: "milestone-b", projectId: projectB.id, title: "Milestone B" };
  const issueA: TrailWorkflowIssue = {
    context: "workflow",
    createdAt: 1,
    id: "issue-a",
    labelIds: [],
    milestoneId: milestoneA.id,
    projectId: projectA.id,
    statusDefinitionId: "issue-unstarted",
    title: "Issue A",
  };
  const cycleOpen: TrailCycle = {
    id: "cycle-open",
    issueIds: [issueA.id],
    plannedEnd: 30,
    startedAt: 10,
  };
  const cycleClosed: TrailCycle = {
    endedAt: 9,
    id: "cycle-closed",
    issueIds: [issueA.id],
    plannedEnd: 8,
    startedAt: 1,
  };
  return {
    configuration: createTrailTestConfiguration(),
    cycleClosed,
    cycleOpen,
    domain: {
      cyclesById: new Map([
        [cycleOpen.id, cycleOpen],
        [cycleClosed.id, cycleClosed],
      ]),
      initiativesById: new Map([
        [initiativeA.id, initiativeA],
        [initiativeB.id, initiativeB],
      ]),
      issuesById: new Map([[issueA.id, issueA]]),
      milestonesById: new Map([
        [milestoneA.id, milestoneA],
        [milestoneA2.id, milestoneA2],
        [milestoneB.id, milestoneB],
      ]),
      projectsById: new Map([
        [projectA.id, projectA],
        [projectB.id, projectB],
      ]),
    },
    initiativeA,
    initiativeB,
    issueA,
    milestoneA,
    milestoneA2,
    milestoneB,
    projectA,
    projectB,
    workspaceState: createTrailTestWorkspaceState(),
  };
}

function effectsOfKind<K extends TrailStateEffect["kind"]>(
  result: { readonly plan: TrailMutationPlan },
  kind: K,
): readonly Extract<TrailStateEffect, { readonly kind: K }>[] {
  return result.plan.effects.filter(
    (effect): effect is Extract<TrailStateEffect, { readonly kind: K }> => effect.kind === kind,
  );
}

describe("Core delete planning", () => {
  it("deletes an Initiative while clearing or explicitly reassigning child Projects", () => {
    const planning = state();
    const cleared = planDeleteTrailInitiative(planning, {
      commandId: "delete-initiative-clear",
      expectedInitiative: planning.initiativeA,
    });
    expect(cleared.kind).toBe("ready");
    if (cleared.kind !== "ready") return;
    const clearedProjects = effectsOfKind(cleared.plan, "replace-entity");
    expect(clearedProjects).toHaveLength(2);
    const clearedProjectRelations = clearedProjects.flatMap((effect) =>
      effect.after.kind === "project"
        ? [{ id: effect.after.value.id, initiativeId: effect.after.value.initiativeId }]
        : [],
    );
    expect(clearedProjectRelations).toContainEqual({ id: "project-a", initiativeId: undefined });
    expect(clearedProjectRelations).toContainEqual({ id: "project-b", initiativeId: undefined });

    const reassigned = planDeleteTrailInitiative(planning, {
      commandId: "delete-initiative-reassign",
      expectedInitiative: planning.initiativeA,
      replacementInitiativeId: planning.initiativeB.id,
    });
    expect(reassigned.kind).toBe("ready");
    if (reassigned.kind === "ready") {
      expect(reassigned.plan.plan.preconditions).toContainEqual({
        entity: { kind: "initiative", value: planning.initiativeB },
        kind: "entity-equals",
      });
    }
  });

  it("deletes a Milestone while clearing or same-Project replacing Issue references", () => {
    const planning = state();
    const replaced = planDeleteTrailMilestone(planning, {
      commandId: "delete-milestone-replace",
      expectedMilestone: planning.milestoneA,
      replacementMilestoneId: planning.milestoneA2.id,
    });
    expect(replaced.kind).toBe("ready");
    if (replaced.kind !== "ready") return;
    const issueReplacement = effectsOfKind(replaced.plan, "replace-entity")
      .find((effect) => effect.after.kind === "issue");
    expect(issueReplacement).toBeDefined();
    if (issueReplacement?.after.kind === "issue") {
      expect(issueReplacement.after.value.milestoneId).toBe(planning.milestoneA2.id);
    }

    expect(planDeleteTrailMilestone(planning, {
      commandId: "delete-milestone-cross-project",
      expectedMilestone: planning.milestoneA,
      replacementMilestoneId: planning.milestoneB.id,
    })).toMatchObject({
      kind: "rejected",
      reason: { code: "milestone-replacement-project-mismatch" },
    });
  });

  it("deletes a Project while preserving child Issues as project-less and removing its Milestones", () => {
    const planning = state();
    const result = planDeleteTrailProject(planning, {
      commandId: "delete-project",
      expectedProject: planning.projectA,
    });
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    const issueReplacement = effectsOfKind(result.plan, "replace-entity")
      .find((effect) => effect.after.kind === "issue");
    expect(issueReplacement).toBeDefined();
    if (issueReplacement?.after.kind === "issue") {
      expect(issueReplacement.after.value.id).toBe(planning.issueA.id);
      expect(issueReplacement.after.value.milestoneId).toBeUndefined();
      expect(issueReplacement.after.value.projectId).toBeUndefined();
    }
    const deletedIds = effectsOfKind(result.plan, "delete-entity")
      .map((effect) => effect.before.value.id);
    expect(deletedIds).toEqual(expect.arrayContaining([
      planning.milestoneA.id,
      planning.milestoneA2.id,
      planning.projectA.id,
    ]));
    expect(deletedIds).not.toContain(planning.milestoneB.id);
  });

  it("deletes a Workflow Issue and removes all open and historical Cycle memberships", () => {
    const planning = state();
    const result = planDeleteTrailWorkflowIssue(planning, {
      commandId: "delete-issue",
      expectedIssue: planning.issueA,
    });
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    const cycleReplacements = effectsOfKind(result.plan, "replace-entity")
      .filter((effect) => effect.after.kind === "cycle");
    expect(cycleReplacements).toHaveLength(2);
    for (const effect of cycleReplacements) {
      expect(effect.after.value).toEqual(expect.objectContaining({ issueIds: [] }));
    }
  });

  it("deletes a Cycle without rewriting its member Issues", () => {
    const planning = state();
    const result = planDeleteTrailCycle(planning, {
      commandId: "delete-cycle",
      expectedCycle: planning.cycleClosed,
    });
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.plan.plan.effects).toEqual([
      { before: { kind: "cycle", value: planning.cycleClosed }, kind: "delete-entity" },
    ]);
    expect(result.plan.plan.affectedScope.entityIds).toEqual([planning.cycleClosed.id]);
  });
});
