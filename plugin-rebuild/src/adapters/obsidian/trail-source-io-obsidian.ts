import type { App, TFile, TFolder } from "obsidian";

import type { TrailSourceIO } from "../../persistence/ports/trail-source-io";
import type { TrailObsidianFileKinds } from "./trail-obsidian-file-kinds";
import type { TrailHostWriteGuard, TrailVaultEvent } from "./trail-vault-events-obsidian";

function requireFile(
  app: Pick<App, "vault">,
  fileKinds: TrailObsidianFileKinds,
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
  fileKinds: TrailObsidianFileKinds,
  path: string,
): TFolder {
  const folder = app.vault.getAbstractFileByPath(path);
  if (!fileKinds.isFolder(folder)) {
    throw new Error(`Expected Markdown source directory is missing: ${path}`);
  }
  return folder;
}

async function withTrailOwnedEvent<TResult>(
  writeGuard: TrailHostWriteGuard | undefined,
  event: TrailVaultEvent,
  operation: () => Promise<TResult>,
): Promise<TResult> {
  if (writeGuard === undefined) return operation();
  const token = writeGuard.begin(event);
  try {
    return await operation();
  } finally {
    writeGuard.end(token);
  }
}

/** Obsidian implementation of the generic authoritative Markdown SourceIO port. */
export function createObsidianSourceIO(
  app: Pick<App, "vault"> & Partial<Pick<App, "fileManager">>,
  fileKinds: TrailObsidianFileKinds,
  writeGuard?: TrailHostWriteGuard,
): TrailSourceIO {
  return {
    async create(path, content): Promise<void> {
      await withTrailOwnedEvent(writeGuard, { kind: "create", path }, async () => {
        await app.vault.create(path, content);
      });
    },
    async delete(path): Promise<void> {
      const target = app.vault.getAbstractFileByPath(path);
      if (target === null) throw new Error(`Expected source is missing: ${path}`);
      const fileManager = app.fileManager;
      if (fileManager === undefined) {
        throw new Error("Obsidian fileManager is required to delete a source");
      }
      await withTrailOwnedEvent(writeGuard, { kind: "delete", path }, async () => {
        await fileManager.trashFile(target);
      });
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
      await withTrailOwnedEvent(writeGuard, { kind: "modify", path }, async () => {
        await app.vault.process(file, transform);
      });
    },
    read(path): Promise<string> {
      return app.vault.read(requireFile(app, fileKinds, path));
    },
    async rename(from, to): Promise<void> {
      const target = app.vault.getAbstractFileByPath(from);
      if (target === null) throw new Error(`Expected source is missing: ${from}`);
      const fileManager = app.fileManager;
      if (fileManager === undefined) {
        throw new Error("Obsidian fileManager is required to rename a source");
      }
      await withTrailOwnedEvent(
        writeGuard,
        { kind: "rename", oldPath: from, path: to },
        async () => {
          await fileManager.renameFile(target, to);
        },
      );
    },
  };
}
