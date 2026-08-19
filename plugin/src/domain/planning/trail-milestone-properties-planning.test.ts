import { describe, expect, it } from "vitest";

import type { TrailMilestone } from "../model/trail-entities";
import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";
import { planEditTrailMilestoneProperties } from "./trail-milestone-planning";

function planningState() {
  const project = {
    id: "project-a",
    labelIds: [] as string[],
    statusDefinitionId: "project-unstarted",
    title: "Project A",
  };
  const milestone: TrailMilestone = {
    id: "milestone-a",
    projectId: project.id,
    title: "Milestone A",
  };
  return {
    configuration: createTrailTestConfiguration(),
    domain: {
      cyclesById: new Map(),
      initiativesById: new Map(),
      issuesById: new Map(),
      milestonesById: new Map([[milestone.id, milestone]]),
      projectsById: new Map([[project.id, project]]),
    },
    milestone,
    project,
    workspaceState: createTrailTestWorkspaceState(),
  };
}

describe("Milestone planning properties", () => {
  it("replaces Milestone-owned details while preserving identity and Project ownership", () => {
    const state = planningState();
    const result = planEditTrailMilestoneProperties(state, {
      commandId: "command-properties",
      description: "Checkpoint notes",
      due: 500,
      expectedMilestone: state.milestone,
      title: "Updated Milestone",
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.plan.milestone).toEqual({
      ...state.milestone,
      description: "Checkpoint notes",
      due: 500,
      title: "Updated Milestone",
    });
    expect(result.plan.plan.intent).toBe("workflow.milestone.edit-properties");
    expect(result.plan.milestone.id).toBe(state.milestone.id);
    expect(result.plan.milestone.projectId).toBe(state.project.id);
  });

  it("rejects a stale expected Milestone instead of overwriting a newer snapshot", () => {
    const state = planningState();
    state.domain.milestonesById.set(state.milestone.id, {
      ...state.milestone,
      title: "Changed elsewhere",
    });

    expect(planEditTrailMilestoneProperties(state, {
      commandId: "command-stale",
      expectedMilestone: state.milestone,
      title: "Local edit",
    })).toMatchObject({
      kind: "rejected",
      reason: { code: "milestone-changed" },
    });
  });
});
