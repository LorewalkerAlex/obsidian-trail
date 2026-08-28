import { describe, expect, it } from "vitest";
import {
  createTrailTestConfiguration,
  createTrailTestWorkspaceState,
} from "../../test/trail-test-fixtures";
import type { TrailPluginDataIO } from "../ports/trail-plugin-data-io";
import { serializeTrailPluginData } from "./trail-plugin-data-codec";
import { createTrailPluginDataRepository } from "./trail-plugin-data-repository";

describe("Trail Plugin Data Repository", () => {
  it("distinguishes absent and invalid persisted state", async () => {
    let persisted: unknown = undefined;
    const io: TrailPluginDataIO = {
      load: async () => persisted,
      save: async (value) => { persisted = value; },
    };
    const repository = createTrailPluginDataRepository(io);

    expect(await repository.read()).toEqual({ kind: "absent" });
    persisted = { configuration: {} };
    const invalid = await repository.read();
    expect(invalid.kind).toBe("invalid");
  });

  it("reads a physically missing Default Project as recoverable pre-ready Plugin Data", async () => {
    const physical = serializeTrailPluginData({
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(),
    }) as { workspaceState: Record<string, unknown> };
    delete physical.workspaceState.defaultProjectId;
    const io: TrailPluginDataIO = {
      load: async () => physical,
      save: async () => undefined,
    };
    const repository = createTrailPluginDataRepository(io);

    const result = await repository.read();
    expect(result.kind).toBe("valid");
    if (result.kind !== "valid") return;
    expect(result.snapshot.workspaceState.defaultProjectId).toBeUndefined();
  });

  it("saves a complete snapshot and verifies the authoritative reread", async () => {
    let persisted: unknown;
    const io: TrailPluginDataIO = {
      load: async () => persisted,
      save: async (value) => { persisted = value; },
    };
    const repository = createTrailPluginDataRepository(io);
    const snapshot = {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(),
    };

    await expect(repository.save(snapshot)).resolves.toEqual(snapshot);
  });

  it("rejects a host-altered authoritative reread", async () => {
    let persisted: unknown;
    const io: TrailPluginDataIO = {
      load: async () => persisted,
      save: async (value) => {
        const root = value as { workspaceState: { favorites: unknown[] } };
        persisted = {
          ...(value as Record<string, unknown>),
          workspaceState: {
            ...(root.workspaceState as Record<string, unknown>),
            favorites: [],
          },
        };
      },
    };
    const repository = createTrailPluginDataRepository(io);
    const snapshot = {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(),
    };

    await expect(repository.save(snapshot)).rejects.toThrow(
      "authoritative reread did not match",
    );
  });
});
