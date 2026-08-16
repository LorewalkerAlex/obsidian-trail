import { describe, expect, it } from "vitest";

import {
  createDefaultTrailConfiguration,
  createDefaultTrailWorkspaceState,
} from "./trail-default-configuration";

describe("Trail default Configuration", () => {
  it("creates one stable definition per category and entity type", () => {
    let next = 0;
    const configuration = createDefaultTrailConfiguration({
      createId: () => `status-${next += 1}`,
      timezone: "Asia/Singapore",
    });

    expect(configuration.statusDefinitions).toHaveLength(10);
    expect(configuration.workflowStatuses.issue.unstarted.defaultId).toBe("status-2");
    expect(configuration.workflowStatuses.project.completed.defaultId).toBe("status-9");
    expect(configuration.temporal.timezone).toBe("Asia/Singapore");
    expect(createDefaultTrailWorkspaceState()).toEqual({
      customViews: [],
      favorites: [],
      home: {},
    });
  });
});
