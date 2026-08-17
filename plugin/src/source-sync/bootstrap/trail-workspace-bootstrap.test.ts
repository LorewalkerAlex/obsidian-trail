import { describe, expect, it } from "vitest";

import { TRAIL_BOOTSTRAP_FILES } from "../../markdown/schema/trail-bootstrap-markdown";
import {
  TRAIL_BOOTSTRAP_DIRECTORIES,
  TRAIL_COLLECTIONS_PATH,
  TRAIL_CYCLES_PATH,
  TRAIL_INITIATIVES_PATH,
  TRAIL_MANAGED_ROOT,
  TRAIL_PROJECTLESS_ISSUES_PATH,
  TRAIL_PROJECTS_PATH,
  TRAIL_TRIAGE_PATH,
} from "../../markdown/schema/trail-paths";
import type { TrailDomainSourceRepository } from "../../persistence/domain-sources/trail-domain-source-repository";
import type { TrailPluginDataSnapshot } from "../../persistence/plugin-data/trail-plugin-data-codec";
import type { TrailPluginDataRepository } from "../../persistence/plugin-data/trail-plugin-data-repository";
import type { TrailWorkspaceLayoutIO, TrailWorkspacePathKind } from "../../persistence/ports/trail-workspace-layout-io";
import { bootstrapFreshTrailWorkspace } from "./trail-workspace-bootstrap";

function createHarness() {
  const kinds = new Map<string, TrailWorkspacePathKind>();
  const files = new Map<string, string>();
  let savedPluginData: TrailPluginDataSnapshot | undefined;
  let failSave = false;
  let failCreate = false;
  const events: string[] = [];

  const layout: TrailWorkspaceLayoutIO = {
    async createDirectory(path) {
      events.push(`mkdir:${path}`);
      kinds.set(path, "directory");
    },
    pathKind: async (path) => kinds.get(path) ?? "missing",
    async removeDirectoryIfEmpty(path) {
      events.push(`rmdir:${path}`);
      const prefix = `${path}/`;
      const hasChildren = [...kinds.keys()].some((candidate) => candidate !== path && candidate.startsWith(prefix));
      if (hasChildren) throw new Error("directory not empty");
      kinds.delete(path);
    },
  };

  const list = async (path: string) => {
    if (path === TRAIL_MANAGED_ROOT) {
      return [
        { kind: "directory" as const, name: "Initiatives", path: TRAIL_INITIATIVES_PATH },
        { kind: "directory" as const, name: "Projects", path: TRAIL_PROJECTS_PATH },
        { kind: "directory" as const, name: "Collections", path: TRAIL_COLLECTIONS_PATH },
      ].filter(({ path: child }) => kinds.get(child) === "directory");
    }
    if (path === TRAIL_COLLECTIONS_PATH) {
      return [TRAIL_TRIAGE_PATH, TRAIL_PROJECTLESS_ISSUES_PATH, TRAIL_CYCLES_PATH]
        .filter((child) => kinds.get(child) === "file")
        .map((child) => ({ kind: "file" as const, name: child.slice(child.lastIndexOf("/") + 1), path: child }));
    }
    return [];
  };

  const domainSources = {
    async create(kind: string, path: string, markdown: string) {
      events.push(`create:${path}`);
      files.set(path, markdown);
      kinds.set(path, "file");
      if (failCreate) throw new Error("verification failed");
      return {
        issues: [],
        kind: "accepted" as const,
        snapshot: kind === "triage"
          ? { issues: [], kind: "triage" as const, sourcePath: path }
          : kind === "projectless-issues"
            ? { issues: [], kind: "projectless-issues" as const, sourcePath: path }
            : { cycles: [], kind: "cycles" as const, sourcePath: path },
      };
    },
    async deleteSourceIfUnchanged(path: string, expected: string) {
      events.push(`delete:${path}`);
      if (files.get(path) !== expected) return false;
      files.delete(path);
      kinds.delete(path);
      return true;
    },
    list,
  } as unknown as TrailDomainSourceRepository;

  const pluginData = {
    async read() {
      return savedPluginData === undefined
        ? { kind: "absent" as const }
        : { kind: "valid" as const, snapshot: savedPluginData };
    },
    async save(snapshot: TrailPluginDataSnapshot) {
      events.push("save-plugin-data");
      if (failSave) throw new Error("save failed");
      savedPluginData = snapshot;
      return snapshot;
    },
  } as TrailPluginDataRepository;

  return {
    domainSources,
    events,
    files,
    layout,
    pluginData,
    setFailCreate: () => { failCreate = true; },
    setFailSave: () => { failSave = true; },
  };
}

describe("Fresh Trail workspace bootstrap", () => {
  it("creates and verifies Markdown before saving Plugin Data", async () => {
    const harness = createHarness();
    let next = 0;
    await bootstrapFreshTrailWorkspace({
      createId: () => `status-${next += 1}`,
      domainSources: harness.domainSources,
      layout: harness.layout,
      pluginData: harness.pluginData,
      timezone: "Asia/Singapore",
    });
    expect(harness.files.size).toBe(TRAIL_BOOTSTRAP_FILES.length);
    const saveIndex = harness.events.indexOf("save-plugin-data");
    expect(saveIndex).toBeGreaterThan(
      Math.max(...TRAIL_BOOTSTRAP_FILES.map(({ path }) => harness.events.indexOf(`create:${path}`))),
    );
  });

  it("rolls back unchanged Markdown before Plugin Data persistence starts", async () => {
    const harness = createHarness();
    harness.setFailCreate();
    let next = 0;
    await expect(bootstrapFreshTrailWorkspace({
      createId: () => `status-${next += 1}`,
      domainSources: harness.domainSources,
      layout: harness.layout,
      pluginData: harness.pluginData,
      timezone: "Asia/Singapore",
    })).rejects.toMatchObject({ name: "TrailWorkspaceBootstrapError" });
    expect(harness.files.size).toBe(0);
    expect(TRAIL_BOOTSTRAP_DIRECTORIES.every((path) => (
      harness.events.includes(`rmdir:${path}`)
    ))).toBe(true);
  });

  it("does not delete verified Markdown after Plugin Data persistence begins", async () => {
    const harness = createHarness();
    harness.setFailSave();
    let next = 0;
    await expect(bootstrapFreshTrailWorkspace({
      createId: () => `status-${next += 1}`,
      domainSources: harness.domainSources,
      layout: harness.layout,
      pluginData: harness.pluginData,
      timezone: "Asia/Singapore",
    })).rejects.toThrow("Plugin Data persistence");
    expect(harness.files.size).toBe(TRAIL_BOOTSTRAP_FILES.length);
    expect(harness.events.some((event) => event.startsWith("delete:"))).toBe(false);
    expect(TRAIL_BOOTSTRAP_DIRECTORIES.every((path) => harness.events.includes(`mkdir:${path}`))).toBe(true);
  });
});
