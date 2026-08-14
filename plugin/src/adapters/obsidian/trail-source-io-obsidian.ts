import type { App, TFile, TFolder } from "obsidian";

import type { TrailSourceIO } from "../../persistence/ports/trail-source-io";
import type { ObsidianFileKinds } from "./trail-obsidian-file-kinds";

function requireFile(
  app: Pick<App, "vault">,
  fileKinds: ObsidianFileKinds,
  path: string,
): TFile {
  const file = app.vault.getAbstractFileByPath(path);
  if (!fileKinds.isFile(file)) {
    throw new Error(`Expected Markdown source file is missing: ${path}`);
  }
  return file;
}

function requireFolder(
  app: Pick<App, "vault">,
  fileKinds: ObsidianFileKinds,
  path: string,
): TFolder {
  const folder = app.vault.getAbstractFileByPath(path);
  if (!fileKinds.isFolder(folder)) {
    throw new Error(`Expected Markdown source directory is missing: ${path}`);
  }
  return folder;
}

/** Obsidian adapter for the generic authoritative Markdown SourceIO port. */
export function createObsidianSourceIO(
  app: Pick<App, "vault"> & Partial<Pick<App, "fileManager">>,
  fileKinds: ObsidianFileKinds,
): TrailSourceIO {
  return {
    async create(path, content): Promise<void> {
      await app.vault.create(path, content);
    },

    async delete(path): Promise<void> {
      const target = app.vault.getAbstractFileByPath(path);
      if (target === null) {
        throw new Error(`Expected source is missing: ${path}`);
      }
      if (app.fileManager === undefined) {
        throw new Error("Obsidian fileManager is required to delete a source");
      }
      await app.fileManager.trashFile(target);
    },

    async list(path) {
      const folder = requireFolder(app, fileKinds, path);
      return folder.children
        .filter((child) => fileKinds.isFile(child) || fileKinds.isFolder(child))
        .map((child) => ({
          kind: fileKinds.isFolder(child) ? "directory" as const : "file" as const,
          name: child.name,
          path: child.path,
        }));
    },

    async process(path, transform): Promise<void> {
      const file = requireFile(app, fileKinds, path);
      await app.vault.process(file, transform);
    },

    async read(path): Promise<string> {
      return app.vault.read(requireFile(app, fileKinds, path));
    },

    async rename(from, to): Promise<void> {
      const target = app.vault.getAbstractFileByPath(from);
      if (target === null) {
        throw new Error(`Expected source is missing: ${from}`);
      }
      if (app.fileManager === undefined) {
        throw new Error("Obsidian fileManager is required to rename a source");
      }
      await app.fileManager.renameFile(target, to);
    },
  };
}
