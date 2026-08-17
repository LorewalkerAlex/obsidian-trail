import { describe, expect, it } from "vitest";

import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";
import { planCreateTrailInitiative } from "./trail-initiative-planning";

function state() {
  return {
    configuration: createTrailTestConfiguration(),
    domain: {
      cyclesById: new Map(),
      initiativesById: new Map(),
      issuesById: new Map(),
      milestonesById: new Map(),
      projectsById: new Map(),
    },
    workspaceState: createTrailTestWorkspaceState(),
  };
}

describe("Initiative planning", () => {
  it("creates a minimal managed Initiative without workflow state", () => {
    const result = planCreateTrailInitiative(state(), {
      commandId: "command-create",
      initiativeId: "initiative-new",
      title: "Initiative New",
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.plan.initiative).toEqual({
      id: "initiative-new",
      labelIds: [],
      title: "Initiative New",
    });
    expect(result.plan.plan).toMatchObject({
      commandId: "command-create",
      effects: [{
        after: { kind: "initiative", value: result.plan.initiative },
        kind: "create-entity",
      }],
      intent: "workflow.initiative.create",
    });
  });

  it("rejects an identity already used by another Core Entity", () => {
    const planning = state();
    planning.domain.projectsById.set("shared-id", {
      id: "shared-id",
      labelIds: [],
      statusDefinitionId: "project-unstarted",
      title: "Existing Project",
    });

    expect(planCreateTrailInitiative(planning, {
      commandId: "command-conflict",
      initiativeId: "shared-id",
      title: "Initiative",
    })).toMatchObject({
      kind: "rejected",
      reason: { code: "entity-id-conflict" },
    });
  });
});
