import { describe, expect, it } from "vitest";
import {
  createDefaultTrailPluginData,
  type TrailPluginData,
} from "../../domain/trail-configuration";
import { TRAIL_BOOTSTRAP_DIRECTORIES, TRAIL_CYCLES_PATH, TRAIL_PROJECTLESS_ISSUES_PATH, TRAIL_TRIAGE_PATH } from "../../markdown/schema/trail-paths";
import { TRAIL_BOOTSTRAP_FILES } from "../../markdown/schema/trail-bootstrap-markdown";
import {
  classifyManagedMarkdown,
  classifyWorkspace,
  createFreshWorkspaceBootstrapPlan,
  executeFreshWorkspaceBootstrap,
  type PluginDataProbe,
  type WorkspaceBootstrapGateway,
  type WorkspaceProbe,
} from "./trail-workspace";

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

function formalMarkdownProbe(overrides: Partial<WorkspaceProbe["markdown"]> = {}) {
  return {
    trailExists: true,
    topLevelEntries: [
      { kind: "directory" as const, name: "Collections" },
      { kind: "directory" as const, name: "Initiatives" },
      { kind: "directory" as const, name: "Projects" },
    ],
    existingPaths: [
      "Trail/Collections",
      "Trail/Initiatives",
      "Trail/Projects",
      TRAIL_TRIAGE_PATH,
      TRAIL_PROJECTLESS_ISSUES_PATH,
      TRAIL_CYCLES_PATH,
    ],
    ...overrides,
  };
}

class FakeBootstrapGateway implements WorkspaceBootstrapGateway {
  public readonly directories = new Set<string>();
  public readonly events: string[] = [];
  public readonly files = new Map<string, string>();
  public pluginData: PluginDataProbe = { exists: false };
  public corruptOncePath: string | null = null;
  public failSavePluginData = false;

  public async createDirectory(path: string): Promise<void> {
    this.events.push(`mkdir:${path}`);
    if (this.directories.has(path)) {
      throw new Error(`directory already exists: ${path}`);
    }
    this.directories.add(path);
  }

  public async createFile(path: string, content: string): Promise<void> {
    this.events.push(`create:${path}`);
    if (this.files.has(path)) {
      throw new Error(`file already exists: ${path}`);
    }
    this.files.set(path, content);
  }

  public async deleteFile(path: string): Promise<void> {
    this.events.push(`delete:${path}`);
    this.files.delete(path);
  }

  public async loadPluginData(): Promise<PluginDataProbe> {
    this.events.push("load-plugin-data");
    return this.pluginData;
  }

  public async probeWorkspace(): Promise<WorkspaceProbe> {
    this.events.push("probe-workspace");
    const trailExists = this.directories.has("Trail");
    const topLevelEntries = ["Collections", "Initiatives", "Projects"]
      .filter((name) => this.directories.has(`Trail/${name}`))
      .map((name) => ({ kind: "directory" as const, name }));

    if (this.directories.has("Trail/Areas")) {
      topLevelEntries.push({ kind: "directory", name: "Areas" });
    }

    return {
      markdown: {
        trailExists,
        topLevelEntries,
        existingPaths: [
          ...this.directories,
          ...this.files.keys(),
        ],
      },
      pluginData: this.pluginData,
    };
  }

  public async readFile(path: string): Promise<string> {
    this.events.push(`read:${path}`);
    const content = this.files.get(path);
    if (content === undefined) {
      throw new Error(`missing file: ${path}`);
    }
    if (this.corruptOncePath === path) {
      this.corruptOncePath = null;
      return `${content}externally-changed`;
    }
    return content;
  }

  public async removeDirectoryIfEmpty(path: string): Promise<void> {
    this.events.push(`rmdir:${path}`);
    const prefix = `${path}/`;
    const hasChildren = [...this.directories, ...this.files.keys()].some(
      (candidate) => candidate !== path && candidate.startsWith(prefix),
    );
    if (hasChildren) {
      throw new Error(`directory is not empty: ${path}`);
    }
    this.directories.delete(path);
  }

  public async savePluginData(data: TrailPluginData): Promise<void> {
    this.events.push("save-plugin-data");
    if (this.failSavePluginData) {
      throw new Error("simulated save failure");
    }
    this.pluginData = { exists: true, value: data };
  }
}

describe("Formal Workspace safety classification", () => {
  it("allows Fresh only when both authoritative footprints are absent", () => {
    const result = classifyWorkspace({
      markdown: {
        trailExists: false,
        topLevelEntries: [],
        existingPaths: [],
      },
      pluginData: { exists: false },
    });

    expect(result.mode).toBe("fresh");
    expect(result.canBootstrap).toBe(true);
    expect(result.blockers).toEqual([]);
  });

  it("loads an existing workspace only when both footprints validate", () => {
    const result = classifyWorkspace({
      markdown: formalMarkdownProbe(),
      pluginData: { exists: true, value: createValidPluginData() },
    });

    expect(result.mode).toBe("existing");
    expect(result.canLoad).toBe(true);
    expect(result.blockers).toEqual([]);
  });

  it("treats a file occupying the Trail managed-root path as a conflict", () => {
    const markdown = classifyManagedMarkdown({
      trailExists: true,
      rootKind: "file",
      topLevelEntries: [],
      existingPaths: ["Trail"],
    });

    expect(markdown).toEqual({
      kind: "managed-root-conflict",
      conflicts: ["Trail (expected directory)"],
    });
  });

  it("classifies the current POC Areas footprint as a managed-root conflict", () => {
    const markdown = classifyManagedMarkdown({
      trailExists: true,
      topLevelEntries: [{ kind: "directory", name: "Areas" }],
      existingPaths: ["Trail/Areas", "Trail/Areas/Work"],
    });

    expect(markdown).toEqual({
      kind: "managed-root-conflict",
      conflicts: ["Areas"],
    });
  });

  it("does not tolerate a residual POC root beside an otherwise Formal tree", () => {
    const result = classifyWorkspace({
      markdown: formalMarkdownProbe({
        topLevelEntries: [
          { kind: "directory", name: "Collections" },
          { kind: "directory", name: "Initiatives" },
          { kind: "directory", name: "Projects" },
          { kind: "directory", name: "Areas" },
        ],
      }),
      pluginData: { exists: true, value: createValidPluginData() },
    });

    expect(result.mode).toBe("blocked");
    expect(result.blockers).toContain("managed-root-conflict");
  });

  it("reports missing required singleton containers without recreating them", () => {
    const result = classifyWorkspace({
      markdown: formalMarkdownProbe({
        existingPaths: [
          "Trail/Collections",
          "Trail/Initiatives",
          "Trail/Projects",
          TRAIL_PROJECTLESS_ISSUES_PATH,
          TRAIL_CYCLES_PATH,
        ],
      }),
      pluginData: { exists: true, value: createValidPluginData() },
    });

    expect(result.mode).toBe("blocked");
    expect(result.blockers).toContain("formal-markdown-incomplete");
    expect(result.markdown).toMatchObject({
      kind: "formal-incomplete",
      missingPaths: [TRAIL_TRIAGE_PATH],
    });
  });

  it("keeps missing or invalid plugin data distinct from Fresh", () => {
    const missing = classifyWorkspace({
      markdown: formalMarkdownProbe(),
      pluginData: { exists: false },
    });
    const invalid = classifyWorkspace({
      markdown: formalMarkdownProbe(),
      pluginData: { exists: true, value: { oldPocSettings: true } },
    });

    expect(missing.mode).toBe("blocked");
    expect(missing.blockers).toContain("configuration-missing");
    expect(invalid.mode).toBe("blocked");
    expect(invalid.blockers).toContain("invalid-configuration");
  });

  it("blocks valid plugin data when the managed Markdown footprint is absent", () => {
    const result = classifyWorkspace({
      markdown: {
        trailExists: false,
        topLevelEntries: [],
        existingPaths: [],
      },
      pluginData: { exists: true, value: createValidPluginData() },
    });

    expect(result.mode).toBe("blocked");
    expect(result.blockers).toContain("managed-markdown-missing");
    expect(result.canBootstrap).toBe(false);
  });
});

describe("Formal Fresh Workspace bootstrap", () => {
  it("plans the complete managed scaffold and a valid plugin-data payload", () => {
    const plan = createFreshWorkspaceBootstrapPlan({
      createId: createOpaqueIdFactory(),
      timezone: "Asia/Singapore",
    });

    expect(plan.directories).toEqual(TRAIL_BOOTSTRAP_DIRECTORIES);
    expect(plan.files).toEqual(TRAIL_BOOTSTRAP_FILES);
    expect(plan.pluginData.configuration.temporal.timezone).toBe("Asia/Singapore");
  });

  it("verifies all Markdown before saving plugin data and finishes as existing", async () => {
    const gateway = new FakeBootstrapGateway();

    await executeFreshWorkspaceBootstrap(gateway, {
      createId: createOpaqueIdFactory(),
      timezone: "Asia/Singapore",
    });

    expect(gateway.pluginData.exists).toBe(true);
    expect(gateway.files.size).toBe(TRAIL_BOOTSTRAP_FILES.length);

    const saveIndex = gateway.events.indexOf("save-plugin-data");
    const lastVerificationIndex = Math.max(
      ...TRAIL_BOOTSTRAP_FILES.map((file) =>
        gateway.events.indexOf(`read:${file.path}`),
      ),
    );
    expect(saveIndex).toBeGreaterThan(lastVerificationIndex);

    const classification = classifyWorkspace(await gateway.probeWorkspace());
    expect(classification.mode).toBe("existing");
    expect(classification.canLoad).toBe(true);
  });

  it("rolls back only the newly created Markdown when pre-save verification fails", async () => {
    const gateway = new FakeBootstrapGateway();
    gateway.corruptOncePath = TRAIL_TRIAGE_PATH;

    await expect(
      executeFreshWorkspaceBootstrap(gateway, {
        createId: createOpaqueIdFactory(),
        timezone: "Asia/Singapore",
      }),
    ).rejects.toMatchObject({
      rollbackIssues: [],
    });

    expect(gateway.pluginData.exists).toBe(false);
    expect(gateway.files.size).toBe(0);
    expect(gateway.directories.size).toBe(0);
    expect(gateway.events).not.toContain("save-plugin-data");
  });

  it("does not delete verified Markdown after plugin-data persistence has started", async () => {
    const gateway = new FakeBootstrapGateway();
    gateway.failSavePluginData = true;

    await expect(
      executeFreshWorkspaceBootstrap(gateway, {
        createId: createOpaqueIdFactory(),
        timezone: "Asia/Singapore",
      }),
    ).rejects.toThrow("simulated save failure");

    expect(gateway.files.size).toBe(TRAIL_BOOTSTRAP_FILES.length);
    expect(gateway.directories.size).toBe(TRAIL_BOOTSTRAP_DIRECTORIES.length);
    expect(gateway.events.some((event) => event.startsWith("delete:"))).toBe(false);
  });

  it("refuses bootstrap before writes when the POC managed-root footprint exists", async () => {
    const gateway = new FakeBootstrapGateway();
    gateway.directories.add("Trail");
    gateway.directories.add("Trail/Areas");

    await expect(
      executeFreshWorkspaceBootstrap(gateway, {
        createId: createOpaqueIdFactory(),
        timezone: "Asia/Singapore",
      }),
    ).rejects.toThrow("Fresh bootstrap refused");

    expect(gateway.events.some((event) => event.startsWith("mkdir:"))).toBe(false);
    expect(gateway.events).not.toContain("save-plugin-data");
  });
});
