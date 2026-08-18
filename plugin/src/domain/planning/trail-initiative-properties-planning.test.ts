import { describe, expect, it } from "vitest";

import type { TrailInitiative, TrailProject } from "../model/trail-entities";
import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";
import { planEditTrailInitiativeProperties } from "./trail-initiative-planning";

function planningState() {
  const configuration = createTrailTestConfiguration();
  const initiative: TrailInitiative = {
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

describe("Initiative planning properties", () => {
  it("replaces Initiative-owned details while preserving identity and Project references", () => {
    const state = planningState();
    const result = planEditTrailInitiativeProperties(state, {
      commandId: "command-properties",
      description: "Strategy notes",
      due: 500,
      expectedInitiative: state.initiative,
      labelIds: ["label-work"],
      priority: "urgent",
      title: "Updated Initiative",
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.plan.initiative).toEqual({
      ...state.initiative,
      description: "Strategy notes",
      due: 500,
      labelIds: ["label-work"],
      priority: "urgent",
      title: "Updated Initiative",
    });
    expect(result.plan.plan.intent).toBe("workflow.initiative.edit-properties");
    expect(result.plan.initiative.id).toBe(state.initiative.id);
    expect(state.domain.projectsById.get(state.project.id)?.initiativeId).toBe(state.initiative.id);
  });

  it("rejects stale expected state and invalid Label membership", () => {
    const state = planningState();
    state.domain.initiativesById.set(
      state.initiative.id,
      { ...state.initiative, title: "Changed elsewhere" },
    );
    expect(planEditTrailInitiativeProperties(state, {
      commandId: "command-stale",
      expectedInitiative: state.initiative,
      labelIds: [],
      title: "Local edit",
    })).toMatchObject({
      kind: "rejected",
      reason: { code: "initiative-changed" },
    });

    const fresh = planningState();
    expect(planEditTrailInitiativeProperties(fresh, {
      commandId: "command-label",
      expectedInitiative: fresh.initiative,
      labelIds: ["missing-label"],
      title: fresh.initiative.title,
    })).toMatchObject({
      kind: "rejected",
      reason: { code: "label-missing" },
    });
  });
});
