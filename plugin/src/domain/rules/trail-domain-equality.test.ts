import { describe, expect, it } from "vitest";

import {
  sameTrailConfiguration,
  sameTrailDomainEntity,
  sameTrailWorkspaceState,
} from "./trail-domain-equality";
import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";

describe("Trail domain equality", () => {
  it("treats logical set-backed entity arrays as unordered", () => {
    expect(sameTrailDomainEntity(
      {
        kind: "project",
        value: {
          id: "project-a",
          labelIds: ["label-b", "label-a"],
          statusDefinitionId: "project-status",
          title: "Project A",
        },
      },
      {
        kind: "project",
        value: {
          id: "project-a",
          labelIds: ["label-a", "label-b"],
          statusDefinitionId: "project-status",
          title: "Project A",
        },
      },
    )).toBe(true);
  });

  it("keeps Configuration and Workspace ordering meaningful", () => {
    const configuration = createTrailTestConfiguration();
    expect(sameTrailConfiguration(configuration, configuration)).toBe(true);

    const workspace = createTrailTestWorkspaceState();
    expect(sameTrailWorkspaceState(workspace, workspace)).toBe(true);
    expect(sameTrailWorkspaceState(
      workspace,
      { ...workspace, favorites: [...workspace.favorites].reverse() },
    )).toBe(workspace.favorites.length < 2);
  });
});
