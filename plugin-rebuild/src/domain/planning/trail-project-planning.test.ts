import { describe, expect, it } from "vitest";

import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";
import { planCreateTrailProject } from "./trail-project-planning";

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

describe("Project planning", () => {
  it("creates a Project with the configured Unstarted default", () => {
    const result = planCreateTrailProject(state(), {
      commandId: "command-a",
      projectId: "project-a",
      title: "Project A",
    });
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.plan.project.statusDefinitionId).toBe("project-unstarted");
    expect(result.plan.plan.effects).toHaveLength(1);
  });
});
