import { describe, expect, it } from "vitest";

import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";
import { createTrailMutationPlan } from "./trail-mutation-plan";

describe("TrailMutationPlan", () => {
  it("derives conditions and affected scope across all authoritative universes", () => {
    const configuration = createTrailTestConfiguration();
    const workspaceState = createTrailTestWorkspaceState();
    const project = {
      kind: "project" as const,
      value: {
        id: "project-a",
        labelIds: [],
        statusDefinitionId: "project-unstarted",
        title: "Project A",
      },
    };

    const plan = createTrailMutationPlan({
      commandId: "command-a",
      effects: [
        { after: project, kind: "create-entity" },
        {
          after: { ...configuration, temporal: { timezone: "UTC" } },
          before: configuration,
          kind: "replace-configuration",
        },
        {
          after: { ...workspaceState, home: { mode: "compact" } },
          before: workspaceState,
          kind: "replace-workspace-state",
        },
      ],
      intent: "test-multi-universe-plan",
    });

    expect(plan.affectedScope).toEqual({
      configuration: true,
      entityIds: ["project-a"],
      workspaceState: true,
    });
    expect(plan.preconditions.map((item) => item.kind)).toEqual([
      "entity-absent",
      "configuration-equals",
      "workspace-state-equals",
    ]);
  });

  it("rejects multiple final effects for one entity", () => {
    const project = {
      kind: "project" as const,
      value: {
        id: "project-a",
        labelIds: [],
        statusDefinitionId: "project-unstarted",
        title: "Project A",
      },
    };
    expect(() => createTrailMutationPlan({
      commandId: "command-a",
      effects: [
        { after: project, kind: "create-entity" },
        { before: project, kind: "delete-entity" },
      ],
      intent: "invalid",
    })).toThrow(/multiple final effects/);
  });

  it("requires replace to preserve kind and identity", () => {
    expect(() => createTrailMutationPlan({
      commandId: "command-a",
      effects: [{
        after: {
          kind: "project",
          value: {
            id: "project-b",
            labelIds: [],
            statusDefinitionId: "project-unstarted",
            title: "Project B",
          },
        },
        before: {
          kind: "project",
          value: {
            id: "project-a",
            labelIds: [],
            statusDefinitionId: "project-unstarted",
            title: "Project A",
          },
        },
        kind: "replace-entity",
      }],
      intent: "invalid",
    })).toThrow(/stable identity/);
  });
});
