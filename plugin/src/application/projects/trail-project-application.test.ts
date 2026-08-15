import { describe, expect, it } from "vitest";

import { createDefaultTrailPluginData } from "../../domain/trail-configuration";
import {
  normalizeCreateProjectCommand,
  planCreateProject,
} from "./trail-project-application";

function configuration() {
  let id = 0;
  return createDefaultTrailPluginData({
    createId: () => `status-${++id}`,
    timezone: "UTC",
  }).configuration;
}

describe("Project Application planning", () => {
  it("creates Projects in the configured Unstarted default through the canonical plan", () => {
    const config = configuration();
    const ids = ["command-a", "project-a"];
    const command = normalizeCreateProjectCommand("Trail Workflow", {
      createId: () => ids.shift() ?? "unexpected",
      now: () => 100,
    });
    const result = planCreateProject(command, config, new Set());
    expect(result).toMatchObject({
      kind: "ready",
      plan: { intent: "workflow.project.create" },
      project: {
        id: "project-a",
        statusDefinitionId: config.statuses.project.unstarted.defaultId,
        title: "Trail Workflow",
      },
    });
  });
});
