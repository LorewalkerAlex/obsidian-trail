import type { App, TAbstractFile, TFile, TFolder } from "obsidian";

import type { TrailManagedEvidenceEntry } from "../../diagnostics/trail-validation-evidence";
import { TRAIL_MANAGED_ROOT } from "../../markdown/schema/trail-paths";
import type { TrailObsidianFileKinds } from "./trail-obsidian-file-kinds";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function collectFile(
  app: Pick<App, "vault">,
  file: TFile,
): Promise<TrailManagedEvidenceEntry> {
  try {
    return {
      content: await app.vault.read(file),
      kind: "file",
      path: file.path,
    };
  } catch (error: unknown) {
    return {
      kind: "file",
      path: file.path,
      readError: errorMessage(error),
    };
  }
}

async function collectFolder(
  app: Pick<App, "vault">,
  folder: TFolder,
  fileKinds: TrailObsidianFileKinds,
  result: TrailManagedEvidenceEntry[],
): Promise<void> {
  result.push({ kind: "directory", path: folder.path });
  const children = [...folder.children].sort((left, right) => left.path.localeCompare(right.path));
  for (const child of children) {
    if (fileKinds.isFolder(child)) {
      await collectFolder(app, child, fileKinds, result);
    } else if (fileKinds.isFile(child)) {
      result.push(await collectFile(app, child));
    }
  }
}

/** Captures the raw host view of the managed tree, including invalid/unknown files when present. */
export async function captureObsidianTrailManagedEntries(
  app: Pick<App, "vault">,
  fileKinds: TrailObsidianFileKinds,
): Promise<readonly TrailManagedEvidenceEntry[]> {
  const root: TAbstractFile | null = app.vault.getAbstractFileByPath(TRAIL_MANAGED_ROOT);
  if (root === null) return [];
  const rootPath = root.path;
  if (fileKinds.isFile(root)) return [await collectFile(app, root)];
  if (!fileKinds.isFolder(root)) {
    return [{ kind: "file", path: rootPath, readError: "Unsupported managed root entry" }];
  }
  const result: TrailManagedEvidenceEntry[] = [];
  await collectFolder(app, root, fileKinds, result);
  return result;
}
