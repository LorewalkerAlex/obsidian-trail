import { describe, expect, it } from "vitest";
import {
  createTrailTestConfiguration,
  createTrailTestWorkspaceState,
} from "../../test/trail-test-fixtures";
import {
  parseTrailPluginData,
  serializeTrailPluginData,
} from "./trail-plugin-data-codec";

describe("Trail plugin-data codec", () => {
  it("maps normalized logical state to current data.json shape and back", () => {
    const snapshot = {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(),
    };
    const physical = serializeTrailPluginData(snapshot);
    const physicalRoot = physical as { configuration: Record<string, unknown> };
    const parsed = parseTrailPluginData(physical);

    expect(physicalRoot.configuration.statusDefinitions).toBeUndefined();
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("expected valid plugin data");
    expect(parsed.value).toEqual(snapshot);
  });

  it("preserves Favorites order while canonicalizing unordered definitions", () => {
    const snapshot = {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(),
    };
    const physical = serializeTrailPluginData(snapshot) as {
      workspaceState: { favorites: readonly { targetId: string }[] };
    };
    expect(physical.workspaceState.favorites.map((item) => item.targetId)).toEqual([
      "project-a",
      "view-active",
    ]);
  });

  it("rejects non-JSON extension values before persistence", () => {
    const workspaceState = createTrailTestWorkspaceState();
    const invalidWorkspaceState = {
      ...workspaceState,
      home: { calculate: () => 1 },
    };

    expect(() => serializeTrailPluginData({
      configuration: createTrailTestConfiguration(),
      workspaceState: invalidWorkspaceState,
    })).toThrow("non-JSON-serializable");
  });

  it("rejects duplicate Set-backed LabelGroup registrations", () => {
    const physical = serializeTrailPluginData({
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(),
    }) as {
      configuration: {
        labels: {
          groups: Array<{ registeredEntityTypes: string[] }>;
        };
      };
    };
    physical.configuration.labels.groups[0].registeredEntityTypes = ["issue", "issue"];
    const parsed = parseTrailPluginData(physical);

    expect(parsed.ok).toBe(false);
    if (parsed.ok) throw new Error("expected duplicate registration failure");
    expect(parsed.issues.some((issue) =>
      issue.code === "plugin-data.label-group.entity-type.duplicate")).toBe(true);
  });

  it("fails closed on unknown physical keys", () => {
    const physical = serializeTrailPluginData({
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(),
    }) as Record<string, unknown>;
    const invalid = { ...physical, unexpected: true };
    const parsed = parseTrailPluginData(invalid);

    expect(parsed.ok).toBe(false);
    if (parsed.ok) throw new Error("expected invalid plugin data");
    expect(parsed.issues.some((issue) => issue.code === "plugin-data.key.unknown")).toBe(true);
  });
});
