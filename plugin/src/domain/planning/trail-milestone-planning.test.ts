import { describe, expect, it } from "vitest";

import type { TrailProject } from "../model/trail-entities";
import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";
import { planCreateTrailMilestone } from "./trail-milestone-planning";
import type { TrailPlanningState } from "./trail-planning-state";

function state(): TrailPlanningState {
  const project: TrailProject = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-unstarted",
    title: "Project A",
  };
  return {
    configuration: createTrailTestConfiguration(),
    domain: {
      cyclesById: new Map(),
      initiativesById: new Map(),
      issuesById: new Map(),
      milestonesById: new Map(),
      projectsById: new Map([[project.id, project]]),
    },
    workspaceState: createTrailTestWorkspaceState(),
  };
}

describe("Milestone planning", () => {
  it("creates a Milestone with an exact owning Project precondition", () => {
    const planning = state();
    const result = planCreateTrailMilestone(planning, {
      commandId: "command-create-milestone",
      due: 100,
      milestoneId: "milestone-a",
      projectId: "project-a",
      title: "Milestone A",
    });
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.plan.milestone).toEqual({
      due: 100,
      id: "milestone-a",
      projectId: "project-a",
      title: "Milestone A",
    });
    expect(result.plan.plan.preconditions).toContainEqual({
      entity: {
        kind: "project",
        value: planning.domain.projectsById.get("project-a"),
      },
      kind: "entity-equals",
    });
  });

  it("rejects missing Project and globally conflicting identity", () => {
    const planning = state();
    expect(planCreateTrailMilestone(planning, {
      commandId: "command-missing-project",
      milestoneId: "milestone-a",
      projectId: "missing-project",
      title: "Milestone A",
    })).toMatchObject({ kind: "rejected", reason: { code: "project-missing" } });

    expect(planCreateTrailMilestone(planning, {
      commandId: "command-conflict",
      milestoneId: "project-a",
      projectId: "project-a",
      title: "Milestone A",
    })).toMatchObject({ kind: "rejected", reason: { code: "entity-id-conflict" } });
  });
});
