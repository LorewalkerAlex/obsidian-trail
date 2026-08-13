import { describe, expect, it } from "vitest";

import { createDefaultTrailPluginData } from "./trail-configuration";
import { TrailMutationQueue } from "./trail-mutation-queue";
import {
  TRAIL_BOOTSTRAP_FILES,
  TRAIL_TOP_LEVEL_DIRECTORIES,
} from "./trail-physical-schema";
import { TrailApplication } from "./trail-application";
import { createTrailRuntimeStore } from "./trail-runtime";
import type {
  PluginDataProbe,
  WorkspaceBootstrapGateway,
  WorkspaceProbe,
} from "./trail-workspace";
import type { TrailTriagePersistenceGateway } from "./trail-triage-intake";
import { parseTriageMarkdown } from "./trail-triage-markdown";

function parseYaml(yaml: string): unknown {
  return { kind: yaml.trim().split(":")[1]?.trim() };
}

function emptyTriageResult() {
  return parseTriageMarkdown({
    filePath: "Trail/Collections/Triage.md",
    markdown: TRAIL_BOOTSTRAP_FILES[0].content,
    parseYaml,
  });
}

function createExistingProbe(pluginData: unknown): WorkspaceProbe {
  return {
    markdown: {
      existingPaths: [
        ...TRAIL_TOP_LEVEL_DIRECTORIES.map((name) => `Trail/${name}`),
        ...TRAIL_BOOTSTRAP_FILES.map((file) => file.path),
      ],
      invalidFormalPaths: [],
      rootKind: "directory",
      topLevelEntries: TRAIL_TOP_LEVEL_DIRECTORIES.map((name) => ({
        kind: "directory" as const,
        name,
      })),
      trailExists: true,
    },
    pluginData: {
      exists: true,
      value: pluginData,
    },
  };
}

function createWorkspaceGateway(initialProbe: WorkspaceProbe): WorkspaceBootstrapGateway {
  let probe = initialProbe;
  const files = new Map<string, string>();
  let pluginDataProbe: PluginDataProbe = initialProbe.pluginData;

  return {
    async createDirectory(): Promise<void> {},
    async createFile(path, content): Promise<void> {
      files.set(path, content);
    },
    async deleteFile(path): Promise<void> {
      files.delete(path);
    },
    async loadPluginData(): Promise<PluginDataProbe> {
      return pluginDataProbe;
    },
    async probeWorkspace(): Promise<WorkspaceProbe> {
      if (probe.markdown.trailExists || files.size === 0) {
        return probe;
      }
      probe = createExistingProbe(pluginDataProbe.value);
      return probe;
    },
    async readFile(path): Promise<string> {
      const content = files.get(path);
      if (content === undefined) {
        throw new Error(`missing fixture file: ${path}`);
      }
      return content;
    },
    async removeDirectoryIfEmpty(): Promise<void> {},
    async savePluginData(data): Promise<void> {
      pluginDataProbe = { exists: true, value: data };
    },
  };
}

function createPersistence(): TrailTriagePersistenceGateway {
  return {
    appendIssue: async () => emptyTriageResult(),
    readLatest: async () => emptyTriageResult(),
  };
}

describe("Formal Trail application startup", () => {
  it("loads an existing valid Formal workspace and publishes configured timezone", async () => {
    let id = 0;
    const pluginData = createDefaultTrailPluginData({
      createId: () => `status-${id += 1}`,
      timezone: "Asia/Shanghai",
    });
    const runtimeStore = createTrailRuntimeStore();
    const application = new TrailApplication({
      createId: () => "unused",
      mutationQueue: new TrailMutationQueue(),
      now: () => 1_786_464_000_000,
      persistence: createPersistence(),
      resolveHostTimezone: () => "UTC",
      runtimeStore,
      workspace: createWorkspaceGateway(createExistingProbe(pluginData)),
    });

    const classification = await application.initialize();

    expect(classification.canLoad).toBe(true);
    expect(runtimeStore.getState().availability).toEqual({
      kind: "ready",
      timezone: "Asia/Shanghai",
    });
  });

  it("blocks a POC managed-root footprint without reading Triage persistence", async () => {
    let reads = 0;
    const runtimeStore = createTrailRuntimeStore();
    const application = new TrailApplication({
      createId: () => "unused",
      mutationQueue: new TrailMutationQueue(),
      now: () => 0,
      persistence: {
        appendIssue: async () => emptyTriageResult(),
        readLatest: async () => {
          reads += 1;
          return emptyTriageResult();
        },
      },
      resolveHostTimezone: () => "UTC",
      runtimeStore,
      workspace: createWorkspaceGateway({
        markdown: {
          existingPaths: [],
          rootKind: "directory",
          topLevelEntries: [{ kind: "directory", name: "Areas" }],
          trailExists: true,
        },
        pluginData: { exists: false },
      }),
    });

    const classification = await application.initialize();

    expect(classification.mode).toBe("blocked");
    expect(runtimeStore.getState().availability.kind).toBe("blocked");
    expect(reads).toBe(0);
  });

  it("bootstraps only an exact Fresh workspace before loading Triage", async () => {
    let id = 0;
    const runtimeStore = createTrailRuntimeStore();
    const workspace = createWorkspaceGateway({
      markdown: {
        existingPaths: [],
        topLevelEntries: [],
        trailExists: false,
      },
      pluginData: { exists: false },
    });
    const application = new TrailApplication({
      createId: () => `id-${id += 1}`,
      mutationQueue: new TrailMutationQueue(),
      now: () => 1_786_464_000_000,
      persistence: createPersistence(),
      resolveHostTimezone: () => "Asia/Singapore",
      runtimeStore,
      workspace,
    });

    const classification = await application.initialize();

    expect(classification.canLoad).toBe(true);
    expect(runtimeStore.getState().availability).toEqual({
      kind: "ready",
      timezone: "Asia/Singapore",
    });
  });

  it("refuses Quick Capture while authoritative Triage has Data Issues", async () => {
    let id = 0;
    const pluginData = createDefaultTrailPluginData({
      createId: () => `status-${id += 1}`,
      timezone: "UTC",
    });
    const runtimeStore = createTrailRuntimeStore();
    const application = new TrailApplication({
      createId: () => `command-${id += 1}`,
      mutationQueue: new TrailMutationQueue(),
      now: () => 1_786_464_000_000,
      persistence: createPersistence(),
      resolveHostTimezone: () => "UTC",
      runtimeStore,
      workspace: createWorkspaceGateway(createExistingProbe(pluginData)),
    });

    await application.initialize();
    runtimeStore.setState((state) => ({
      ...state,
      committed: {
        ...state.committed,
        sourceIssues: [{
          code: "test-invalid",
          filePath: "Trail/Collections/Triage.md",
          message: "invalid fixture",
          scope: "file",
        }],
      },
    }));

    expect(() => application.capture("Blocked capture")).toThrowError(
      "Quick Capture is paused until Triage.md is valid again",
    );
  });
});
