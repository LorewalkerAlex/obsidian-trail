import type { App, TFile, TFolder } from "obsidian";

import {
  TRAIL_MANAGED_ROOT,
  TRAIL_REQUIRED_SINGLETON_PATHS,
  TRAIL_TOP_LEVEL_DIRECTORY_PATHS,
} from "../../markdown/schema/trail-paths";
import {
  createTrailPluginDataRepository,
} from "../../persistence/plugin-data/trail-plugin-data-repository";
import type {
  ManagedRootEntry,
  PluginDataProbe,
  WorkspaceBootstrapGateway,
  WorkspaceProbe,
} from "../../source-sync/bootstrap/trail-workspace-bootstrap";
import type { ObsidianFileKinds } from "./trail-obsidian-file-kinds";
import {
  createObsidianPluginDataIO,
  type ObsidianPluginDataHost,
} from "./trail-plugin-data-io-obsidian";

export type TrailPluginDataHost = ObsidianPluginDataHost;

export type ManagedMarkdownValidator = (
  path: string,
  markdown: string,
) => readonly string[];

export type ObsidianWorkspaceFileKinds = ObsidianFileKinds;

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
 * Obsidian bootstrap adapter. Bootstrap policy remains owned by Source Sync;
 * Markdown validation and plugin-data validation are delegated to their canonical
 * persistence capabilities without changing bootstrap ordering or rollback.
 */
export function createObsidianWorkspaceBootstrapGateway(
  app: Pick<App, "fileManager" | "vault">,
  pluginDataHost: TrailPluginDataHost,
  validateManagedMarkdown: ManagedMarkdownValidator,
  fileKinds: ObsidianWorkspaceFileKinds,
): WorkspaceBootstrapGateway {
  const pluginDataRepository = createTrailPluginDataRepository(
    createObsidianPluginDataIO(pluginDataHost),
  );

  async function loadPluginData(): Promise<PluginDataProbe> {
    const result = await pluginDataRepository.read();
    switch (result.kind) {
      case "absent":
        return { exists: false };
      case "valid":
        return { exists: true, value: result.data };
      case "invalid":
        return { exists: true, value: result.value };
    }
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
    const invalidManagedPaths: string[] = [];

    for (const path of TRAIL_TOP_LEVEL_DIRECTORY_PATHS) {
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
        invalidManagedPaths.push(path);
        continue;
      }

      try {
        const markdown = await app.vault.read(file);
        const issues = validateManagedMarkdown(path, markdown);
        if (issues.length > 0) {
          invalidManagedPaths.push(path);
        }
      } catch {
        invalidManagedPaths.push(path);
      }
    }

    return {
      markdown: {
        trailExists: true,
        rootKind: "directory",
        topLevelEntries,
        existingPaths,
        invalidManagedPaths,
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
        throw new Error(`Expected managed file is missing: ${path}`);
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
      await pluginDataRepository.save(data);
    },
  };
}