import type {
  App,
  TAbstractFile,
  TFile,
  TFolder,
} from "obsidian";
import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultTrailPluginData } from "./trail-configuration";
import {
  TRAIL_BOOTSTRAP_FILES,
  TRAIL_CYCLES_PATH,
  TRAIL_PROJECTLESS_ISSUES_PATH,
  TRAIL_TRIAGE_PATH,
} from "./trail-physical-schema";
import {
  createObsidianWorkspaceBootstrapGateway,
  type ObsidianWorkspaceFileKinds,
  type TrailPluginDataHost,
} from "./trail-workspace-obsidian";
import {
  classifyWorkspace,
  executeFreshWorkspaceBootstrap,
} from "./trail-workspace";

class MockTAbstractFile {
  public constructor(
    public readonly path: string,
    public readonly name: string,
  ) {}
}

class MockTFile extends MockTAbstractFile {}

class MockTFolder extends MockTAbstractFile {
  public readonly children: (MockTFile | MockTFolder)[] = [];
}

const fakeFileKinds: ObsidianWorkspaceFileKinds = {
  isFile: (file: TAbstractFile | null): file is TFile =>
    file instanceof MockTFile,
  isFolder: (file: TAbstractFile | null): file is TFolder =>
    file instanceof MockTFolder,
};

function createOpaqueIdFactory(): () => string {
  let next = 0;
  return () => `opaque-${String(++next).padStart(3, "0")}`;
}

class FakeObsidianHost {
  public readonly root = new MockTFolder("/", "");
  public readonly nodes = new Map<string, MockTFile | MockTFolder>();
  public readonly contents = new Map<string, string>();
  public readonly trashedPaths: string[] = [];
  public pluginData: unknown = null;
  public corruptNextReadPath: string | null = null;

  public readonly app = {
    vault: {
      getAbstractFileByPath: (path: string) => this.nodes.get(path) ?? null,
      createFolder: async (path: string) => {
        if (this.nodes.has(path)) {
          throw new Error(`already exists: ${path}`);
        }
        const folder = new MockTFolder(path, path.split("/").slice(-1)[0] ?? path);
        this.nodes.set(path, folder);
        this.attach(folder);
        return folder;
      },
      create: async (path: string, content: string) => {
        if (this.nodes.has(path)) {
          throw new Error(`already exists: ${path}`);
        }
        const file = new MockTFile(path, path.split("/").slice(-1)[0] ?? path);
        this.nodes.set(path, file);
        this.contents.set(path, content);
        this.attach(file);
        return file;
      },
      read: async (file: MockTFile) => {
        const content = this.contents.get(file.path);
        if (content === undefined) {
          throw new Error(`missing content: ${file.path}`);
        }
        if (this.corruptNextReadPath === file.path) {
          this.corruptNextReadPath = null;
          return `${content}externally-changed`;
        }
        return content;
      },
    },
    fileManager: {
      trashFile: async (file: MockTFile | MockTFolder) => {
        this.trashedPaths.push(file.path);
        this.detach(file);
        this.nodes.delete(file.path);
        this.contents.delete(file.path);
      },
    },
  } as unknown as Pick<App, "fileManager" | "vault">;

  public readonly pluginDataHost: TrailPluginDataHost = {
    loadData: async () => this.pluginData,
    saveData: async (data) => {
      this.pluginData = structuredClone(data);
    },
  };

  public addFolder(path: string): MockTFolder {
    const folder = new MockTFolder(path, path.split("/").slice(-1)[0] ?? path);
    this.nodes.set(path, folder);
    this.attach(folder);
    return folder;
  }

  public addFile(path: string, content: string): MockTFile {
    const file = new MockTFile(path, path.split("/").slice(-1)[0] ?? path);
    this.nodes.set(path, file);
    this.contents.set(path, content);
    this.attach(file);
    return file;
  }

  private attach(child: MockTFile | MockTFolder): void {
    const parentPath = child.path.includes("/")
      ? child.path.slice(0, child.path.lastIndexOf("/"))
      : "";
    const parent = parentPath === "" ? this.root : this.nodes.get(parentPath);
    if (parent instanceof MockTFolder) {
      parent.children.push(child);
    }
  }

  private detach(child: MockTFile | MockTFolder): void {
    const parentPath = child.path.includes("/")
      ? child.path.slice(0, child.path.lastIndexOf("/"))
      : "";
    const parent = parentPath === "" ? this.root : this.nodes.get(parentPath);
    if (!(parent instanceof MockTFolder)) {
      return;
    }
    const index = parent.children.indexOf(child);
    if (index >= 0) {
      parent.children.splice(index, 1);
    }
  }
}

function acceptCanonicalSingletons(path: string, markdown: string): readonly string[] {
  const expected = TRAIL_BOOTSTRAP_FILES.find((file) => file.path === path);
  return expected?.content === markdown ? [] : ["invalid singleton content"];
}

function createGateway(
  host: FakeObsidianHost,
  validator = acceptCanonicalSingletons,
) {
  return createObsidianWorkspaceBootstrapGateway(
    host.app,
    host.pluginDataHost,
    validator,
    fakeFileKinds,
  );
}

describe("Obsidian Formal Workspace bootstrap gateway", () => {
  let host: FakeObsidianHost;

  beforeEach(() => {
    host = new FakeObsidianHost();
  });

  it("maps missing plugin data and the POC Areas root to a blocked conflict", async () => {
    host.addFolder("Trail");
    host.addFolder("Trail/Areas");

    const result = classifyWorkspace(await createGateway(host).probeWorkspace());

    expect(result.mode).toBe("blocked");
    expect(result.blockers).toContain("managed-root-conflict");
    expect(result.pluginData.kind).toBe("absent");
  });

  it("treats a file at the Trail root path as a managed-root conflict", async () => {
    host.addFile("Trail", "not a managed directory");

    const result = classifyWorkspace(await createGateway(host).probeWorkspace());

    expect(result.mode).toBe("blocked");
    expect(result.markdown).toMatchObject({
      kind: "managed-root-conflict",
      conflicts: ["Trail (expected directory)"],
    });
  });

  it("classifies existing Formal persistence only after singleton validation", async () => {
    host.addFolder("Trail");
    host.addFolder("Trail/Initiatives");
    host.addFolder("Trail/Projects");
    host.addFolder("Trail/Collections");
    for (const file of TRAIL_BOOTSTRAP_FILES) {
      host.addFile(file.path, file.content);
    }
    host.pluginData = createDefaultTrailPluginData({
      createId: createOpaqueIdFactory(),
      timezone: "Asia/Singapore",
    });

    expect(classifyWorkspace(await createGateway(host).probeWorkspace()).mode).toBe(
      "existing",
    );

    const invalidGateway = createGateway(
      host,
      (path) => path === TRAIL_TRIAGE_PATH ? ["invalid triage"] : [],
    );
    const invalid = classifyWorkspace(await invalidGateway.probeWorkspace());
    expect(invalid.mode).toBe("blocked");
    expect(invalid.blockers).toContain("formal-markdown-invalid");
  });

  it("executes Fresh bootstrap through Vault and plugin-data APIs", async () => {
    const gateway = createGateway(host);

    await executeFreshWorkspaceBootstrap(gateway, {
      createId: createOpaqueIdFactory(),
      timezone: "Asia/Singapore",
    });

    const result = classifyWorkspace(await gateway.probeWorkspace());
    expect(result.mode).toBe("existing");
    expect(host.nodes.get(TRAIL_TRIAGE_PATH)).toBeInstanceOf(MockTFile);
    expect(host.nodes.get(TRAIL_PROJECTLESS_ISSUES_PATH)).toBeInstanceOf(MockTFile);
    expect(host.nodes.get(TRAIL_CYCLES_PATH)).toBeInstanceOf(MockTFile);
    expect(host.pluginData).not.toBeNull();
  });

  it("routes pre-save bootstrap rollback through Obsidian trash semantics", async () => {
    host.corruptNextReadPath = TRAIL_TRIAGE_PATH;
    const gateway = createGateway(host);

    await expect(
      executeFreshWorkspaceBootstrap(gateway, {
        createId: createOpaqueIdFactory(),
        timezone: "Asia/Singapore",
      }),
    ).rejects.toThrow("Bootstrap verification failed");

    expect(host.pluginData).toBeNull();
    expect(host.trashedPaths).toEqual([
      TRAIL_CYCLES_PATH,
      TRAIL_PROJECTLESS_ISSUES_PATH,
      TRAIL_TRIAGE_PATH,
      "Trail/Collections",
      "Trail/Projects",
      "Trail/Initiatives",
      "Trail",
    ]);
    expect(host.nodes.size).toBe(0);
  });
});
