import { describe, expect, it } from "vitest";

import {
  createDefaultTrailPluginData,
  type TrailPluginData,
} from "../../domain/trail-configuration";
import type { TrailPluginDataIO } from "../ports/trail-plugin-data-io";
import { createTrailPluginDataRepository } from "./trail-plugin-data-repository";

function createOpaqueIdFactory(): () => string {
  let next = 0;
  return () => `opaque-${String(++next).padStart(3, "0")}`;
}

function createValidPluginData(): TrailPluginData {
  return createDefaultTrailPluginData({
    createId: createOpaqueIdFactory(),
    timezone: "Asia/Singapore",
  });
}

function createFixture(initial: unknown) {
  let persisted = initial;
  const saves: unknown[] = [];
  const io: TrailPluginDataIO = {
    async load(): Promise<unknown> {
      return persisted;
    },
    async save(data): Promise<void> {
      saves.push(data);
      persisted = structuredClone(data);
    },
  };

  return {
    repository: createTrailPluginDataRepository(io),
    saves,
  };
}

describe("PluginDataRepository", () => {
  it("distinguishes absent, valid, and invalid complete snapshots", async () => {
    const absent = createFixture(null);
    const validData = createValidPluginData();
    const valid = createFixture(validData);
    const invalidValue = { oldPocSettings: true };
    const invalid = createFixture(invalidValue);

    await expect(absent.repository.read()).resolves.toEqual({ kind: "absent" });
    await expect(valid.repository.read()).resolves.toEqual({
      data: validData,
      kind: "valid",
    });
    await expect(invalid.repository.read()).resolves.toMatchObject({
      kind: "invalid",
      value: invalidValue,
    });
  });

  it("persists only a complete valid snapshot as the normal write unit", async () => {
    const fixture = createFixture(null);
    const data = createValidPluginData();

    await fixture.repository.save(data);

    expect(fixture.saves).toEqual([data]);
    await expect(fixture.repository.read()).resolves.toEqual({
      data,
      kind: "valid",
    });
  });

  it("refuses an invalid runtime snapshot before host persistence", async () => {
    const fixture = createFixture(null);
    const invalid = {
      configuration: {},
      workspaceState: {},
    } as unknown as TrailPluginData;

    await expect(fixture.repository.save(invalid)).rejects.toThrow(
      "Refused to persist invalid Trail plugin data",
    );
    expect(fixture.saves).toEqual([]);
  });
});
