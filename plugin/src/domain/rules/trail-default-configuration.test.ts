import { describe, expect, it } from "vitest";

import {
  createDefaultTrailConfiguration,
  createDefaultTrailWorkspaceState,
} from "./trail-default-configuration";

describe("Trail default Configuration", () => {
  it("creates one stable definition per applicable category and entity type", () => {
    let next = 0;
    const configuration = createDefaultTrailConfiguration({
      createId: () => `status-${next += 1}`,
      timezone: "Asia/Singapore",
    });

    expect(configuration.statusDefinitions).toHaveLength(9);
    expect(configuration.workflowStatuses.issue.unstarted.defaultId).toBe("status-2");
    expect(configuration.workflowStatuses.project.completed.defaultId).toBe("status-8");
    expect(configuration.workflowStatuses.project).not.toHaveProperty("backlog");
    expect(configuration.temporal.timezone).toBe("Asia/Singapore");
    expect(createDefaultTrailWorkspaceState("project-default")).toEqual({
      customViews: [],
      defaultProjectId: "project-default",
      favorites: [],
      home: {},
    });
  });
});
