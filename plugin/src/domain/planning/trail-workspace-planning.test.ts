import { describe, expect, it } from "vitest";

import type { TrailPlanningState } from "./trail-planning-state";
import { planSetTrailDefaultProject } from "./trail-workspace-planning";
import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";

function state(): TrailPlanningState {
  const projectA = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-unstarted",
    title: "Project A",
  };
  const projectB = {
    id: "project-b",
    labelIds: [],
    statusDefinitionId: "project-completed",
    title: "Project B",
  };
  return {
    configuration: createTrailTestConfiguration(),
    domain: {
      cyclesById: new Map(),
      initiativesById: new Map(),
      issuesById: new Map(),
      milestonesById: new Map(),
      projectsById: new Map([
        [projectA.id, projectA],
        [projectB.id, projectB],
      ]),
    },
    workspaceState: createTrailTestWorkspaceState(projectA.id),
  };
}

describe("Trail Workspace planning", () => {
  it("repoints Default Project to any existing ordinary Project", () => {
    const planning = state();
    const projectB = planning.domain.projectsById.get("project-b");
    if (projectB === undefined) throw new Error("missing fixture Project B");
    const result = planSetTrailDefaultProject(planning, {
      commandId: "set-default",
      expectedWorkspaceState: planning.workspaceState,
      projectId: projectB.id,
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.plan.workspaceState.defaultProjectId).toBe(projectB.id);
    expect(result.plan.plan).toMatchObject({
      intent: "workspace.default-project.set",
      effects: [{
        after: { defaultProjectId: projectB.id },
        before: { defaultProjectId: "project-a" },
        kind: "replace-workspace-state",
      }],
    });
    expect(result.plan.plan.preconditions).toContainEqual({
      entity: { kind: "project", value: projectB },
      kind: "entity-equals",
    });
  });

  it("rejects a missing Project and stale Workspace State", () => {
    const planning = state();
    expect(planSetTrailDefaultProject(planning, {
      commandId: "missing-default",
      expectedWorkspaceState: planning.workspaceState,
      projectId: "project-missing",
    })).toMatchObject({
      kind: "rejected",
      reason: { code: "default-project-missing" },
    });

    expect(planSetTrailDefaultProject(planning, {
      commandId: "stale-default",
      expectedWorkspaceState: createTrailTestWorkspaceState("project-b"),
      projectId: "project-b",
    })).toMatchObject({
      kind: "rejected",
      reason: { code: "workspace-state-changed" },
    });
  });
});
