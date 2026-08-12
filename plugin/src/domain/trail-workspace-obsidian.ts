import type {
  App,
  TAbstractFile,
  TFile,
  TFolder,
} from "obsidian";
import type { TrailPluginData } from "./trail-configuration";
import {
  TRAIL_MANAGED_ROOT,
  TRAIL_REQUIRED_SINGLETON_PATHS,
  TRAIL_TOP_LEVEL_DIRECTORIES,
} from "./trail-physical-schema";
import type {
  ManagedRootEntry,
  PluginDataProbe,
  WorkspaceBootstrapGateway,
  WorkspaceProbe,
} from "./trail-workspace";

export interface TrailPluginDataHost {
  readonly loadData: () => Promise<unknown>;
  readonly saveData: (data: TrailPluginData) => Promise<void>;
}

export type FormalMarkdownValidator = (
  path: string,
  markdown: string,
) => readonly string[];

/**
 * Obsidian's TFile/TFolder classes are runtime host values, while the npm
 * package is primarily a build/type contract outside Obsidian. The composition
 * root supplies these guards using the real host constructors; tests can supply
 * fake constructors without making Vitest resolve an Obsidian runtime module.
 */
export interface ObsidianWorkspaceFileKinds {
  readonly isFile: (
    file: TAbstractFile | null,
  ) => file is TFile;
  readonly isFolder: (
    file: TAbstractFile | null,
  ) => file is TFolder;
}

function toManagedRootEntry(
  file: TFile | TFolder,
  fileKinds: ObsidianWorkspaceFileKinds,
): ManagedRootEntry {
  return {
    kind: fileKinds.isFolder(file) ? "directory" : "file",
    name: file.name,
  };
}

/**
 * Adapts the Obsidian Vault and plugin-data APIs to the conservative Formal
 * Workspace bootstrap gateway. Domain and physical validity remain delegated to
 * the caller-supplied current-schema validator rather than being guessed here.
 *
 * This module type-imports Obsidian only. Runtime TFile/TFolder discrimination
 * is injected by the composition root so the adapter remains testable outside
 * the Obsidian host without a fake global runtime module.
 */
export function createObsidianWorkspaceBootstrapGateway(
  app: Pick<App, "fileManager" | "vault">,
  pluginDataHost: TrailPluginDataHost,
  validateFormalMarkdown: FormalMarkdownValidator,
  fileKinds: ObsidianWorkspaceFileKinds,
): WorkspaceBootstrapGateway {
  async function loadPluginData(): Promise<PluginDataProbe> {
    const value = await pluginDataHost.loadData();
    return value === null || value === undefined
      ? { exists: false }
      : { exists: true, value };
  }

  async function probeWorkspace(): Promise<WorkspaceProbe> {
    const pluginData = await loadPluginData();
    const root = app.vault.getAbstractFileByPath(TRAIL_MANAGED_ROOT);

    if (root === null) {
      return {
        markdown: {
          trailExists: false,
          topLevelEntries: [],
          existingPaths: [],
        },
        pluginData,
      };
    }

    if (!fileKinds.isFolder(root)) {
      return {
        markdown: {
          trailExists: true,
          rootKind: "file",
          topLevelEntries: [],
          existingPaths: [TRAIL_MANAGED_ROOT],
        },
        pluginData,
      };
    }

    const topLevelEntries = root.children
      .filter((child): child is TFile | TFolder =>
        fileKinds.isFile(child) || fileKinds.isFolder(child),
      )
      .map((child) => toManagedRootEntry(child, fileKinds));

    const existingPaths: string[] = [];
    const invalidFormalPaths: string[] = [];

    for (const directoryName of TRAIL_TOP_LEVEL_DIRECTORIES) {
      const path = `${TRAIL_MANAGED_ROOT}/${directoryName}`;
      if (app.vault.getAbstractFileByPath(path) !== null) {
        existingPaths.push(path);
      }
    }

    for (const path of TRAIL_REQUIRED_SINGLETON_PATHS) {
      const file = app.vault.getAbstractFileByPath(path);
      if (file === null) {
        continue;
      }

      existingPaths.push(path);
      if (!fileKinds.isFile(file)) {
        invalidFormalPaths.push(path);
        continue;
      }

      try {
        const markdown = await app.vault.read(file);
        const issues = validateFormalMarkdown(path, markdown);
        if (issues.length > 0) {
          invalidFormalPaths.push(path);
        }
      } catch {
        invalidFormalPaths.push(path);
      }
    }

    return {
      markdown: {
        trailExists: true,
        rootKind: "directory",
        topLevelEntries,
        existingPaths,
        invalidFormalPaths,
      },
      pluginData,
    };
  }

  return {
    async createDirectory(path): Promise<void> {
      await app.vault.createFolder(path);
    },

    async createFile(path, content): Promise<void> {
      await app.vault.create(path, content);
    },

    async deleteFile(path): Promise<void> {
      const file = app.vault.getAbstractFileByPath(path);
      if (!fileKinds.isFile(file)) {
        throw new Error(`Expected rollback file is missing: ${path}`);
      }
      await app.fileManager.trashFile(file);
    },

    loadPluginData,
    probeWorkspace,

    async readFile(path): Promise<string> {
      const file = app.vault.getAbstractFileByPath(path);
      if (!fileKinds.isFile(file)) {
        throw new Error(`Expected Formal file is missing: ${path}`);
      }
      return app.vault.read(file);
    },

    async removeDirectoryIfEmpty(path): Promise<void> {
      const folder = app.vault.getAbstractFileByPath(path);
      if (!fileKinds.isFolder(folder)) {
        throw new Error(`Expected rollback directory is missing: ${path}`);
      }
      if (folder.children.length > 0) {
        throw new Error(`Refused to rollback non-empty directory: ${path}`);
      }
      await app.fileManager.trashFile(folder);
    },

    async savePluginData(data): Promise<void> {
      await pluginDataHost.saveData(data);
    },
  };
}
