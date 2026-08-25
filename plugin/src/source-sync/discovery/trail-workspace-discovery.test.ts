import { describe, expect, it } from "vitest";

import {
  TRAIL_COLLECTIONS_PATH,
  TRAIL_CYCLES_PATH,
  TRAIL_INITIATIVES_PATH,
  TRAIL_MANAGED_ROOT,
  TRAIL_PROJECTS_PATH,
  TRAIL_TRIAGE_PATH,
} from "../../markdown/schema/trail-paths";
import type { TrailDomainSourceRepository } from "../../persistence/domain-sources/trail-domain-source-repository";
import type { TrailPluginDataRepository } from "../../persistence/plugin-data/trail-plugin-data-repository";
import type { TrailWorkspaceLayoutIO, TrailWorkspacePathKind } from "../../persistence/ports/trail-workspace-layout-io";
import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";
import { discoverTrailWorkspace } from "./trail-workspace-discovery";

function harness(pluginMode: "valid" | "absent" = "valid") {
  const kinds = new Map<string, TrailWorkspacePathKind>();
  for (const path of [TRAIL_MANAGED_ROOT, TRAIL_INITIATIVES_PATH, TRAIL_PROJECTS_PATH, TRAIL_COLLECTIONS_PATH]) {
    kinds.set(path, "directory");
  }
  for (const path of [TRAIL_TRIAGE_PATH, TRAIL_CYCLES_PATH]) {
    kinds.set(path, "file");
  }
  const entries = new Map<string, readonly { readonly kind: "directory" | "file"; readonly name: string; readonly path: string }[]>([
    [TRAIL_MANAGED_ROOT, [
      { kind: "directory", name: "Initiatives", path: TRAIL_INITIATIVES_PATH },
      { kind: "directory", name: "Projects", path: TRAIL_PROJECTS_PATH },
      { kind: "directory", name: "Collections", path: TRAIL_COLLECTIONS_PATH },
    ]],
    [TRAIL_INITIATIVES_PATH, [
      { kind: "file", name: "0001 Initiative.md", path: `${TRAIL_INITIATIVES_PATH}/0001 Initiative.md` },
    ]],
    [TRAIL_PROJECTS_PATH, [
      { kind: "file", name: "0002 Project.md", path: `${TRAIL_PROJECTS_PATH}/0002 Project.md` },
    ]],
    [TRAIL_COLLECTIONS_PATH, [
      { kind: "file", name: "Triage.md", path: TRAIL_TRIAGE_PATH },
      { kind: "file", name: "Cycles.md", path: TRAIL_CYCLES_PATH },
    ]],
  ]);
  const layout: TrailWorkspaceLayoutIO = {
    createDirectory: async () => undefined,
    pathKind: async (path) => kinds.get(path) ?? "missing",
    removeDirectoryIfEmpty: async () => undefined,
  };
  const domainSources = {
    list: async (path: string) => entries.get(path) ?? [],
  } as Pick<TrailDomainSourceRepository, "list">;
  const pluginData = {
    read: async () => pluginMode === "absent"
      ? { kind: "absent" as const }
      : {
          kind: "valid" as const,
          snapshot: {
            configuration: createTrailTestConfiguration(),
            workspaceState: createTrailTestWorkspaceState(),
          },
        },
  } as Pick<TrailPluginDataRepository, "read">;
  return { domainSources, entries, kinds, layout, pluginData };
}

describe("Trail workspace discovery", () => {
  it("distinguishes Fresh from an initialized existing workspace", async () => {
    const fresh = harness("absent");
    fresh.kinds.clear();
    expect((await discoverTrailWorkspace(fresh)).mode).toBe("fresh");

    const existing = await discoverTrailWorkspace(harness());
    expect(existing.mode).toBe("existing");
    if (existing.mode === "existing") {
      expect(existing.sources.map(({ kind }) => kind)).toEqual([
        "initiative", "project", "triage", "cycles",
      ]);
    }
  });

  it("fails closed on missing singleton and unknown managed content", async () => {
    const value = harness();
    value.kinds.delete(TRAIL_TRIAGE_PATH);
    value.entries.set(TRAIL_PROJECTS_PATH, [
      { kind: "file", name: "Legacy.md", path: `${TRAIL_PROJECTS_PATH}/Legacy.md` },
    ]);
    const result = await discoverTrailWorkspace(value);
    expect(result.mode).toBe("blocked");
    if (result.mode === "blocked") {
      expect(result.blockers.map(({ code }) => code)).toContain("managed-markdown-incomplete");
    }
  });

  it("rejects the retired Projectless carrier instead of accepting a runtime compatibility path", async () => {
    const value = harness();
    value.entries.set(TRAIL_COLLECTIONS_PATH, [
      ...value.entries.get(TRAIL_COLLECTIONS_PATH)!,
      {
        kind: "file",
        name: "Projectless Issues.md",
        path: `${TRAIL_COLLECTIONS_PATH}/Projectless Issues.md`,
      },
    ]);
    const result = await discoverTrailWorkspace(value);
    expect(result.mode).toBe("blocked");
    if (result.mode === "blocked") {
      expect(result.blockers).toEqual(expect.arrayContaining([
        expect.objectContaining({
          code: "managed-markdown-invalid",
          path: `${TRAIL_COLLECTIONS_PATH}/Projectless Issues.md`,
        }),
      ]));
    }
  });

  it("blocks a legacy top-level root instead of silently ignoring it", async () => {
    const value = harness();
    value.entries.set(TRAIL_MANAGED_ROOT, [
      ...value.entries.get(TRAIL_MANAGED_ROOT)!,
      { kind: "directory", name: "Areas", path: "Trail/Areas" },
    ]);
    const result = await discoverTrailWorkspace(value);
    expect(result.mode).toBe("blocked");
    if (result.mode === "blocked") {
      expect(result.blockers.map(({ code }) => code)).toContain("managed-root-conflict");
    }
  });
});
