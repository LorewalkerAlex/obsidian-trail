import { describe, expect, it } from "vitest";

import type { TrailProject } from "../model/trail-entities";
import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";
import { planEditTrailProjectProperties } from "./trail-project-planning";

function planningState() {
  const configuration = createTrailTestConfiguration();
  const initiative = {
    id: "initiative-a",
    labelIds: [],
    title: "Initiative A",
  };
  const project: TrailProject = {
    id: "project-a",
    initiativeId: initiative.id,
    labelIds: [],
    statusDefinitionId: "project-started",
    title: "Project A",
  };
  return {
    configuration,
    domain: {
      cyclesById: new Map(),
      initiativesById: new Map([[initiative.id, initiative]]),
      issuesById: new Map(),
      milestonesById: new Map(),
      projectsById: new Map([[project.id, project]]),
    },
    initiative,
    project,
    workspaceState: createTrailTestWorkspaceState(),
  };
}

describe("Project planning properties", () => {
  it("replaces Project-owned details while preserving identity, Status, and Initiative", () => {
    const state = planningState();
    const result = planEditTrailProjectProperties(state, {
      commandId: "command-properties",
      description: "Outcome notes",
      due: 500,
      expectedProject: state.project,
      labelIds: ["label-work"],
      priority: "high",
      title: "Updated Project",
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.plan.project).toEqual({
      ...state.project,
      description: "Outcome notes",
      due: 500,
      labelIds: ["label-work"],
      priority: "high",
      title: "Updated Project",
    });
    expect(result.plan.plan.intent).toBe("workflow.project.edit-properties");
    expect(result.plan.project.id).toBe(state.project.id);
    expect(result.plan.project.statusDefinitionId).toBe("project-started");
    expect(result.plan.project.initiativeId).toBe(state.initiative.id);
  });

  it("rejects stale expected state and invalid Label membership", () => {
    const state = planningState();
    state.domain.projectsById.set(state.project.id, { ...state.project, title: "Changed elsewhere" });
    expect(planEditTrailProjectProperties(state, {
      commandId: "command-stale",
      expectedProject: state.project,
      labelIds: [],
      title: "Local edit",
    })).toMatchObject({
      kind: "rejected",
      reason: { code: "project-changed" },
    });

    const fresh = planningState();
    expect(planEditTrailProjectProperties(fresh, {
      commandId: "command-label",
      expectedProject: fresh.project,
      labelIds: ["missing-label"],
      title: fresh.project.title,
    })).toMatchObject({
      kind: "rejected",
      reason: { code: "label-missing" },
    });
  });
});
