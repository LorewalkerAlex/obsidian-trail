import type { App } from "obsidian";

import type {
  TrailWorkspaceLayoutIO,
  TrailWorkspacePathKind,
} from "../../persistence/ports/trail-workspace-layout-io";
import type { TrailObsidianFileKinds } from "./trail-obsidian-file-kinds";

function pathKind(
  app: Pick<App, "vault">,
  fileKinds: TrailObsidianFileKinds,
  path: string,
): TrailWorkspacePathKind {
  const target = app.vault.getAbstractFileByPath(path);
  if (target === null) return "missing";
  if (fileKinds.isFolder(target)) return "directory";
  if (fileKinds.isFile(target)) return "file";
  throw new Error(`Unsupported Obsidian file kind at managed path: ${path}`);
}

/** Host layout capability used by Source Sync discovery/bootstrap only. */
export function createObsidianWorkspaceLayoutIO(
  app: Pick<App, "fileManager" | "vault">,
  fileKinds: TrailObsidianFileKinds,
): TrailWorkspaceLayoutIO {
  return {
    createDirectory: async (path) => {
      await app.vault.createFolder(path);
    },
    pathKind: async (path) => pathKind(app, fileKinds, path),
    removeDirectoryIfEmpty: async (path) => {
      const folder = app.vault.getAbstractFileByPath(path);
      if (!fileKinds.isFolder(folder)) {
        throw new Error(`Expected rollback directory is missing: ${path}`);
      }
      if (folder.children.length > 0) {
        throw new Error(`Refused to remove non-empty managed directory: ${path}`);
      }
      await app.fileManager.trashFile(folder);
    },
  };
}
