import { describe, expect, it } from "vitest";
import {
  createTrailTestConfiguration,
  createTrailTestWorkspaceState,
} from "../../test/trail-test-fixtures";
import {
  isTrailPluginDataSnapshot,
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
    const physicalRoot = physical as {
      configuration: {
        estimateWeights: Record<string, unknown>;
        statusDefinitions?: unknown;
        statuses: { project: Record<string, unknown> };
      };
    };
    const parsed = parseTrailPluginData(physical);

    expect(physicalRoot.configuration.statusDefinitions).toBeUndefined();
    expect(physicalRoot.configuration.estimateWeights).toEqual({
      small: 1,
      medium: 2,
      large: 5,
      xlarge: 10,
    });
    expect(physicalRoot.configuration.statuses.project).not.toHaveProperty("backlog");
    expect(Object.keys(physicalRoot.configuration.statuses.project)).toEqual([
      "unstarted",
      "started",
      "completed",
      "canceled",
    ]);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("expected valid plugin data");
    expect(isTrailPluginDataSnapshot(parsed.value)).toBe(true);
    expect(parsed.value).toEqual(snapshot);
  });

  it("rejects Project Backlog as an unknown current-schema key", () => {
    const physical = serializeTrailPluginData({
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(),
    }) as {
      configuration: {
        statuses: { project: Record<string, unknown> };
      };
    };
    physical.configuration.statuses.project.backlog = {
      defaultId: "project-backlog",
      definitions: [{ id: "project-backlog", name: "Backlog" }],
    };

    const parsed = parseTrailPluginData(physical);
    expect(parsed.ok).toBe(false);
    if (parsed.ok) throw new Error("expected invalid plugin data");
    expect(parsed.issues.some((issue) => (
      issue.code === "plugin-data.key.unknown"
      && issue.path === "$.configuration.statuses.project"
      && issue.message === "Unknown key: backlog"
    ))).toBe(true);
  });

  it("rejects incomplete or non-positive Estimate weights in the current schema", () => {
    const missing = serializeTrailPluginData({
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(),
    }) as { configuration: { estimateWeights: Record<string, unknown> } };
    delete missing.configuration.estimateWeights.xlarge;

    const missingParsed = parseTrailPluginData(missing);
    expect(missingParsed.ok).toBe(false);
    if (missingParsed.ok) throw new Error("expected missing Estimate weight failure");
    expect(missingParsed.issues.some((issue) => (
      issue.code === "plugin-data.key.missing"
      && issue.path === "$.configuration.estimateWeights"
    ))).toBe(true);

    const nonPositive = serializeTrailPluginData({
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(),
    }) as { configuration: { estimateWeights: Record<string, unknown> } };
    nonPositive.configuration.estimateWeights.medium = 0;

    const nonPositiveParsed = parseTrailPluginData(nonPositive);
    expect(nonPositiveParsed.ok).toBe(false);
    if (nonPositiveParsed.ok) throw new Error("expected invalid Estimate weight failure");
    expect(nonPositiveParsed.issues.some((issue) => (
      issue.code === "plugin-data.estimate-weight.invalid"
      && issue.path === "$.configuration.estimateWeights.medium"
    ))).toBe(true);
  });

  it("accepts the one persisted pre-ready shape with a physically missing Default Project", () => {
    const snapshot = {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState("project-a"),
    };
    const physical = serializeTrailPluginData(snapshot) as {
      workspaceState: Record<string, unknown>;
    };
    delete physical.workspaceState.defaultProjectId;

    const parsed = parseTrailPluginData(physical);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("expected recoverable pre-ready plugin data");
    expect(parsed.value.workspaceState).not.toHaveProperty("defaultProjectId");
    expect(isTrailPluginDataSnapshot(parsed.value)).toBe(false);
  });

  it("preserves Status order and default within one fixed Category", () => {
    const base = createTrailTestConfiguration();
    const ready = {
      category: "unstarted" as const,
      entityType: "issue" as const,
      id: "issue-ready",
      name: "Ready",
    };
    const snapshot = {
      configuration: {
        ...base,
        statusDefinitions: base.statusDefinitions.flatMap((definition) => (
          definition.id === "issue-unstarted" ? [ready, definition] : [definition]
        )),
        workflowStatuses: {
          ...base.workflowStatuses,
          issue: {
            ...base.workflowStatuses.issue,
            unstarted: {
              defaultId: ready.id,
              definitionIds: [ready.id, "issue-unstarted"],
            },
          },
        },
      },
      workspaceState: createTrailTestWorkspaceState(),
    };

    const parsed = parseTrailPluginData(serializeTrailPluginData(snapshot));

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
