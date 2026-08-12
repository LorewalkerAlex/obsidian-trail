import { describe, expect, it } from "vitest";
import {
  createDefaultTrailPluginData,
  validateTrailPluginData,
} from "./trail-configuration";


type DeepMutable<T> = T extends readonly (infer Item)[]
  ? DeepMutable<Item>[]
  : T extends object
    ? { -readonly [Key in keyof T]: DeepMutable<T[Key]> }
    : T;

function mutableClone<T>(value: T): DeepMutable<T> {
  return structuredClone(value) as DeepMutable<T>;
}

function createOpaqueIdFactory(): () => string {
  let next = 0;
  return () => `opaque-${String(++next).padStart(3, "0")}`;
}

describe("Formal Trail plugin configuration", () => {
  it("creates a valid current configuration with opaque unique status IDs", () => {
    const data = createDefaultTrailPluginData({
      createId: createOpaqueIdFactory(),
      timezone: "Asia/Singapore",
    });
    const validation = validateTrailPluginData(data);

    expect(validation.ok).toBe(true);
    expect(data.configuration.temporal.timezone).toBe("Asia/Singapore");

    const statusIds = [
      ...Object.values(data.configuration.statuses.issue),
      ...Object.values(data.configuration.statuses.project),
    ].flatMap((category) => category.definitions.map((definition) => definition.id));

    expect(statusIds).toHaveLength(10);
    expect(new Set(statusIds)).toHaveLength(10);
  });

  it("treats display names as mutable Configuration rather than category semantics", () => {
    const data = mutableClone(
      createDefaultTrailPluginData({
        createId: createOpaqueIdFactory(),
        timezone: "Asia/Singapore",
      }),
    );

    data.configuration.statuses.issue.started.definitions[0].name = "Deep Work";

    const validation = validateTrailPluginData(data);
    expect(validation.ok).toBe(true);
  });

  it("rejects empty, unknown, or POC-shaped plugin data instead of defaulting it", () => {
    expect(validateTrailPluginData({}).ok).toBe(false);
    expect(validateTrailPluginData({ pages: ["Dashboard", "Areas"] }).ok).toBe(false);
    expect(
      validateTrailPluginData({
        configuration: {},
        workspaceState: {},
        legacy: true,
      }).ok,
    ).toBe(false);
  });

  it("rejects a status default that is not a member of its category", () => {
    const data = mutableClone(
      createDefaultTrailPluginData({
        createId: createOpaqueIdFactory(),
        timezone: "Asia/Singapore",
      }),
    );

    data.configuration.statuses.issue.started.defaultId = "missing-id";

    const validation = validateTrailPluginData(data);
    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.issues).toContain(
        "configuration.statuses.issue.started.defaultId must reference a definition in the same category",
      );
    }
  });

  it("rejects duplicate StatusDefinition IDs across the configuration", () => {
    const data = mutableClone(
      createDefaultTrailPluginData({
        createId: createOpaqueIdFactory(),
        timezone: "Asia/Singapore",
      }),
    );
    const duplicateId = data.configuration.statuses.issue.backlog.definitions[0].id;

    data.configuration.statuses.project.backlog.definitions[0].id = duplicateId;
    data.configuration.statuses.project.backlog.defaultId = duplicateId;

    const validation = validateTrailPluginData(data);
    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(
        validation.issues.some((issue) =>
          issue.includes("duplicates another StatusDefinition ID"),
        ),
      ).toBe(true);
    }
  });

  it("requires a runtime-supported IANA timezone", () => {
    expect(() =>
      createDefaultTrailPluginData({
        createId: createOpaqueIdFactory(),
        timezone: "Not/A-Timezone",
      }),
    ).toThrow("supported IANA timezone");
  });
});
