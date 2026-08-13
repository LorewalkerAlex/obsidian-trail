import { describe, expect, it } from "vitest";

import { createDefaultTrailPluginData } from "./trail-configuration";
import { TrailMutationQueue } from "./trail-mutation-queue";
import {
  TRAIL_BOOTSTRAP_FILES,
  TRAIL_TOP_LEVEL_DIRECTORIES,
} from "./trail-physical-schema";
import { TrailApplication } from "./trail-application";
import {
  createTrailRuntimeStore,
  setSourceIssuesForPath,
} from "./trail-runtime";
import type {
  PluginDataProbe,
  WorkspaceBootstrapGateway,
  WorkspaceProbe,
} from "./trail-workspace";
import type { TrailTriageIssue } from "./trail-issue";
import {
  appendTriageIssueToMarkdown,
  deleteTriageIssueFromMarkdown,
  parseTriageMarkdown,
  updateTriageIssueInMarkdown,
  type TrailTriageParseResult,
} from "./trail-triage-markdown";
import type { TrailTriagePersistence } from "./trail-triage-persistence";
import {
  parseProjectMarkdown,
  serializeProjectMarkdown,
} from "./trail-project-markdown";
import type { TrailWorkflowPersistence } from "./trail-workflow-persistence";

function parseYaml(yaml: string): unknown {
  const value: Record<string, unknown> = {};
  for (const line of yaml.split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    const raw = line.slice(separator + 1).trim();
    if (raw === "") continue;
    value[key] = key === "id" ? JSON.parse(raw) : raw;
  }
  return value;
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

function createPersistence(): TrailTriagePersistence {
  return {
    appendIssue: async () => emptyTriageResult(),
    deleteIssue: async () => emptyTriageResult(),
    readLatest: async () => emptyTriageResult(),
    updateIssue: async () => emptyTriageResult(),
  };
}

function createWorkflowPersistence(): TrailWorkflowPersistence {
  return {
    appendIssue: async () => {
      throw new Error("Workflow append is unused");
    },
    createProject: async () => {
      throw new Error("Workflow Project create is unused");
    },
    readAll: async () => ({ projectResults: [], structuralIssues: [] }),
    readSource: async () => {
      throw new Error("Workflow source read is unused");
    },
    updateIssue: async () => {
      throw new Error("Workflow update is unused");
    },
  };
}

function createProjectWritingWorkflowPersistence(): TrailWorkflowPersistence {
  return {
    appendIssue: async () => {
      throw new Error("Workflow append is unused");
    },
    async createProject(project) {
      return parseProjectMarkdown({
        filePath: "Trail/Projects/0001 Workflow survives.md",
        markdown: serializeProjectMarkdown(project),
        parseYaml,
      });
    },
    readAll: async () => ({ projectResults: [], structuralIssues: [] }),
    readSource: async () => {
      throw new Error("Workflow source read is unused");
    },
    updateIssue: async () => {
      throw new Error("Workflow update is unused");
    },
  };
}

class MutableTriagePersistence implements TrailTriagePersistence {
  public markdown = TRAIL_BOOTSTRAP_FILES[0].content;
  public readonly deleteCalls: string[] = [];
  public readonly updateCalls: TrailTriageIssue[] = [];

  public seed(issue: TrailTriageIssue): void {
    this.markdown = appendTriageIssueToMarkdown({
      filePath: "Trail/Collections/Triage.md",
      issue,
      markdown: this.markdown,
      parseYaml,
    });
  }

  public async appendIssue(issue: TrailTriageIssue): Promise<TrailTriageParseResult> {
    this.seed(issue);
    return this.readLatest();
  }

  public async deleteIssue(
    expectedIssue: TrailTriageIssue,
  ): Promise<TrailTriageParseResult> {
    this.deleteCalls.push(expectedIssue.id);
    this.markdown = deleteTriageIssueFromMarkdown({
      expectedIssue,
      filePath: "Trail/Collections/Triage.md",
      markdown: this.markdown,
      parseYaml,
    });
    return this.readLatest();
  }

  public async readLatest(): Promise<TrailTriageParseResult> {
    return parseTriageMarkdown({
      filePath: "Trail/Collections/Triage.md",
      markdown: this.markdown,
      parseYaml,
    });
  }

  public async updateIssue(
    expectedIssue: TrailTriageIssue,
    issue: TrailTriageIssue,
  ): Promise<TrailTriageParseResult> {
    this.updateCalls.push(issue);
    this.markdown = updateTriageIssueInMarkdown({
      expectedIssue,
      filePath: "Trail/Collections/Triage.md",
      issue,
      markdown: this.markdown,
      parseYaml,
    });
    return this.readLatest();
  }
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
      triagePersistence: createPersistence(),
      resolveHostTimezone: () => "UTC",
      runtimeStore,
      workflowPersistence: createWorkflowPersistence(),
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
      triagePersistence: {
        appendIssue: async () => emptyTriageResult(),
        deleteIssue: async () => emptyTriageResult(),
        readLatest: async () => {
          reads += 1;
          return emptyTriageResult();
        },
        updateIssue: async () => emptyTriageResult(),
      },
      resolveHostTimezone: () => "UTC",
      runtimeStore,
      workflowPersistence: createWorkflowPersistence(),
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
      triagePersistence: createPersistence(),
      resolveHostTimezone: () => "Asia/Singapore",
      runtimeStore,
      workflowPersistence: createWorkflowPersistence(),
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
      triagePersistence: createPersistence(),
      resolveHostTimezone: () => "UTC",
      runtimeStore,
      workflowPersistence: createWorkflowPersistence(),
      workspace: createWorkspaceGateway(createExistingProbe(pluginData)),
    });

    await application.initialize();
    setSourceIssuesForPath(runtimeStore, "Trail/Collections/Triage.md", [{
      code: "test-invalid",
      filePath: "Trail/Collections/Triage.md",
      message: "invalid fixture",
      scope: "file",
    }]);

    expect(() => application.capture("Blocked capture")).toThrowError(
      "Quick Capture is paused until Triage.md is valid again",
    );
  });

  it("preserves the exact existing Due when editing only the title", async () => {
    let id = 0;
    const pluginData = createDefaultTrailPluginData({
      createId: () => `status-${id += 1}`,
      timezone: "Asia/Shanghai",
    });
    const due = Date.UTC(2026, 7, 13, 2, 30, 45, 900);
    const persistence = new MutableTriagePersistence();
    persistence.seed({
      context: "triage",
      due,
      id: "issue-a",
      labelIds: [],
      title: "Original",
    });
    const runtimeStore = createTrailRuntimeStore();
    const application = new TrailApplication({
      createId: () => "command-edit",
      mutationQueue: new TrailMutationQueue(),
      now: () => due,
      triagePersistence: persistence,
      resolveHostTimezone: () => "UTC",
      runtimeStore,
      workflowPersistence: createWorkflowPersistence(),
      workspace: createWorkspaceGateway(createExistingProbe(pluginData)),
    });
    await application.initialize();

    const receipt = application.editTriageIssue(
      runtimeStore.getState().committed.triageIssuesById["issue-a"],
      "Edited",
      "2026-08-13T10:30",
    );
    await receipt.completion;

    expect(persistence.updateCalls).toHaveLength(1);
    expect(persistence.updateCalls[0]).toMatchObject({
      due,
      title: "Edited",
    });
  });

  it("resolves changed Due input and Defer through the configured timezone", async () => {
    let id = 0;
    const pluginData = createDefaultTrailPluginData({
      createId: () => `status-${id += 1}`,
      timezone: "Asia/Shanghai",
    });
    const persistence = new MutableTriagePersistence();
    persistence.seed({
      context: "triage",
      due: Date.UTC(2026, 7, 13, 2, 30, 45, 900),
      id: "issue-a",
      labelIds: [],
      title: "Original",
    });
    const runtimeStore = createTrailRuntimeStore();
    const ids = ["command-edit", "command-defer"];
    const application = new TrailApplication({
      createId: () => ids.shift() ?? "unexpected",
      mutationQueue: new TrailMutationQueue(),
      now: () => Date.UTC(2026, 7, 13, 0),
      triagePersistence: persistence,
      resolveHostTimezone: () => "UTC",
      runtimeStore,
      workflowPersistence: createWorkflowPersistence(),
      workspace: createWorkspaceGateway(createExistingProbe(pluginData)),
    });
    await application.initialize();

    await application.editTriageIssue(
      runtimeStore.getState().committed.triageIssuesById["issue-a"],
      "Original",
      "2026-08-14T10:30",
    ).completion;
    expect(persistence.updateCalls[0].due).toBe(Date.UTC(2026, 7, 14, 2, 30));

    await application.deferTriageIssue(
      runtimeStore.getState().committed.triageIssuesById["issue-a"],
    ).completion;
    expect(persistence.updateCalls[1].due).toBe(Date.UTC(2026, 7, 21, 2, 30));
  });

  it("isolates a missing Triage singleton without blocking valid Workflow actions", async () => {
    let statusId = 0;
    const pluginData = createDefaultTrailPluginData({
      createId: () => `status-${statusId += 1}`,
      timezone: "UTC",
    });
    const ids = ["command-project", "project-a"];
    const runtimeStore = createTrailRuntimeStore();
    const application = new TrailApplication({
      createId: () => ids.shift() ?? "unexpected",
      mutationQueue: new TrailMutationQueue(),
      now: () => 1_786_464_000_000,
      triagePersistence: createPersistence(),
      resolveHostTimezone: () => "UTC",
      runtimeStore,
      workflowPersistence: createProjectWritingWorkflowPersistence(),
      workspace: createWorkspaceGateway(createExistingProbe(pluginData)),
    });
    await application.initialize();

    application.markRequiredTriageUnavailable("Triage fixture removed");

    expect(runtimeStore.getState().availability.kind).toBe("ready");
    expect(runtimeStore.getState().committed.sourceIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "triage.required-source.unavailable",
          filePath: "Trail/Collections/Triage.md",
        }),
      ]),
    );

    const receipt = application.createProject("Workflow survives");
    await receipt.completion;

    expect(runtimeStore.getState().committed.projectIds).toEqual(["project-a"]);
  });

  it("routes delete through Triage management and blocks management on Data Issues", async () => {
    let id = 0;
    const pluginData = createDefaultTrailPluginData({
      createId: () => `status-${id += 1}`,
      timezone: "UTC",
    });
    const persistence = new MutableTriagePersistence();
    persistence.seed({
      context: "triage",
      due: 20,
      id: "issue-a",
      labelIds: [],
      title: "Delete me",
    });
    const runtimeStore = createTrailRuntimeStore();
    const application = new TrailApplication({
      createId: () => "command-delete",
      mutationQueue: new TrailMutationQueue(),
      now: () => 10,
      triagePersistence: persistence,
      resolveHostTimezone: () => "UTC",
      runtimeStore,
      workflowPersistence: createWorkflowPersistence(),
      workspace: createWorkspaceGateway(createExistingProbe(pluginData)),
    });
    await application.initialize();

    await application.deleteTriageIssue(
      runtimeStore.getState().committed.triageIssuesById["issue-a"],
    ).completion;
    expect(persistence.deleteCalls).toEqual(["issue-a"]);

    setSourceIssuesForPath(runtimeStore, "Trail/Collections/Triage.md", [{
      code: "test-invalid",
      filePath: "Trail/Collections/Triage.md",
      message: "invalid fixture",
      scope: "file",
    }]);
    expect(() => application.deleteTriageIssue({
      context: "triage",
      due: 30,
      id: "missing",
      labelIds: [],
      title: "Missing",
    })).toThrow("Triage actions are paused until Triage.md is valid again");
  });

});
