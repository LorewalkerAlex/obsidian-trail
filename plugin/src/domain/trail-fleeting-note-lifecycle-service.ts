import type {
  App,
  TFile,
} from "obsidian";

import type {
  TrailFleetingNote,
  TrailFleetingNoteStorage,
  TrailParseIssue,
  TrailStoredFleetingNote,
} from "./trail-model";
import {
  createActiveFleetingNoteMarkdown,
  createStoredFleetingNoteMarkdown,
  parseStoredFleetingNotes,
  storedFleetingNotePath,
  TRAIL_FLEETING_NOTES_PATH,
  TrailFleetingNoteLifecycleWriteError,
} from "./trail-fleeting-note-lifecycle";
import { parseFleetingNotes } from "./trail-fleeting-note-parser";
import type {
  TrailMutableFile,
  TrailMutationSource,
} from "./trail-mutation-service";

export interface TrailFleetingNoteLifecycleSource<
  FileType extends TrailMutableFile,
> extends TrailMutationSource<FileType> {
  processOrCreate(
    path: string,
    update: (markdown: string) => string,
  ): Promise<string>;
}

export type TrailFleetingNoteLifecycleMutationErrorCode =
  | "lifecycle-path-invalid"
  | "vault-process-failed"
  | "write-verification-failed";

export class TrailFleetingNoteLifecycleMutationError
  extends Error {
  constructor(
    readonly code:
      TrailFleetingNoteLifecycleMutationErrorCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "TrailFleetingNoteLifecycleMutationError";
  }
}

export function createObsidianTrailFleetingNoteLifecycleSource(
  app: App,
): TrailFleetingNoteLifecycleSource<TFile> {
  return {
    getFileByPath: (path) =>
      app.vault.getFileByPath(path),

    process: (file, update) =>
      app.vault.process(file, update),

    processOrCreate: (path, update) =>
      processOrCreateObsidianFile(app, path, update),
  };
}

export interface TrailStoreFleetingNoteMutationInput {
  expectedNote: TrailFleetingNote;
  storage: TrailFleetingNoteStorage;
  storedAt: string;
}

export async function createStoredFleetingNoteInVault<
  FileType extends TrailMutableFile,
>(
  source: TrailFleetingNoteLifecycleSource<FileType>,
  {
    expectedNote,
    storage,
    storedAt,
  }: TrailStoreFleetingNoteMutationInput,
): Promise<TrailStoredFleetingNote> {
  const filePath = storedFleetingNotePath(storage);
  let writtenMarkdown: string;

  try {
    writtenMarkdown = await source.processOrCreate(
      filePath,
      (markdown) => createStoredFleetingNoteMarkdown({
        markdown,
        filePath,
        note: expectedNote,
        storage,
        storedAt,
      }),
    );
  } catch (error: unknown) {
    if (
      error
      instanceof TrailFleetingNoteLifecycleWriteError
      || error
      instanceof TrailFleetingNoteLifecycleMutationError
    ) {
      throw error;
    }

    throw new TrailFleetingNoteLifecycleMutationError(
      "vault-process-failed",
      `Trail could not store Fleeting Note UUID "${expectedNote.id}" in ${filePath}.`,
      error,
    );
  }

  const result = parseStoredFleetingNotes({
    filePath,
    markdown: writtenMarkdown,
    storage,
  });
  const createdNote = result.notes.find(
    (candidate) => candidate.id === expectedNote.id,
  );
  const issue = relevantIssue(
    result.issues,
    expectedNote.id,
  );

  if (
    issue
    || !createdNote
    || createdNote.text !== expectedNote.text
    || createdNote.created !== expectedNote.created
    || createdNote.cleanupDue !== expectedNote.cleanupDue
    || createdNote.storedAt !== storedAt
  ) {
    throw new TrailFleetingNoteLifecycleMutationError(
      "write-verification-failed",
      issue?.message
        ?? `Trail could not confirm stored Fleeting Note UUID "${expectedNote.id}" after writing.`,
    );
  }

  return createdNote;
}

export interface TrailRestoreFleetingNoteMutationInput {
  expectedNote: TrailStoredFleetingNote;
}

export async function createActiveFleetingNoteInVault<
  FileType extends TrailMutableFile,
>(
  source: TrailFleetingNoteLifecycleSource<FileType>,
  {
    expectedNote,
  }: TrailRestoreFleetingNoteMutationInput,
): Promise<TrailFleetingNote> {
  let writtenMarkdown: string;

  try {
    writtenMarkdown = await source.processOrCreate(
      TRAIL_FLEETING_NOTES_PATH,
      (markdown) => createActiveFleetingNoteMarkdown({
        markdown,
        filePath: TRAIL_FLEETING_NOTES_PATH,
        note: expectedNote,
      }),
    );
  } catch (error: unknown) {
    if (
      error
      instanceof TrailFleetingNoteLifecycleWriteError
      || error
      instanceof TrailFleetingNoteLifecycleMutationError
    ) {
      throw error;
    }

    throw new TrailFleetingNoteLifecycleMutationError(
      "vault-process-failed",
      `Trail could not restore Fleeting Note UUID "${expectedNote.id}" to ${TRAIL_FLEETING_NOTES_PATH}.`,
      error,
    );
  }

  const result = parseFleetingNotes({
    filePath: TRAIL_FLEETING_NOTES_PATH,
    markdown: writtenMarkdown,
  });
  const createdNote = result.notes.find(
    (candidate) => candidate.id === expectedNote.id,
  );
  const issue = relevantIssue(
    result.issues,
    expectedNote.id,
  );

  if (
    issue
    || !createdNote
    || createdNote.text !== expectedNote.text
    || createdNote.created !== expectedNote.created
    || createdNote.cleanupDue !== expectedNote.cleanupDue
  ) {
    throw new TrailFleetingNoteLifecycleMutationError(
      "write-verification-failed",
      issue?.message
        ?? `Trail could not confirm restored Fleeting Note UUID "${expectedNote.id}" after writing.`,
    );
  }

  return createdNote;
}

async function processOrCreateObsidianFile(
  app: App,
  path: string,
  update: (markdown: string) => string,
): Promise<string> {
  const existingFile = app.vault.getFileByPath(path);

  if (existingFile) {
    return app.vault.process(existingFile, update);
  }

  const existingPath =
    app.vault.getAbstractFileByPath(path);

  if (existingPath) {
    throw new TrailFleetingNoteLifecycleMutationError(
      "lifecycle-path-invalid",
      `Trail lifecycle path is not a Markdown file: ${path}`,
    );
  }

  const initialMarkdown = update("");
  const parentPath = path.slice(0, path.lastIndexOf("/"));

  await ensureObsidianFolder(app, parentPath);

  try {
    await app.vault.create(path, initialMarkdown);
    return initialMarkdown;
  } catch (error: unknown) {
    const concurrentFile = app.vault.getFileByPath(path);

    if (concurrentFile) {
      return app.vault.process(concurrentFile, update);
    }

    throw error;
  }
}

async function ensureObsidianFolder(
  app: App,
  path: string,
): Promise<void> {
  let currentPath = "";

  for (const segment of path.split("/")) {
    if (segment === "") {
      continue;
    }

    currentPath = currentPath === ""
      ? segment
      : `${currentPath}/${segment}`;

    const existingFile =
      app.vault.getFileByPath(currentPath);

    if (existingFile) {
      throw new TrailFleetingNoteLifecycleMutationError(
        "lifecycle-path-invalid",
        `Trail lifecycle folder path is occupied by a file: ${currentPath}`,
      );
    }

    const existingPath =
      app.vault.getAbstractFileByPath(currentPath);

    if (existingPath) {
      continue;
    }

    try {
      await app.vault.createFolder(currentPath);
    } catch (error: unknown) {
      const concurrentFile =
        app.vault.getFileByPath(currentPath);

      if (concurrentFile) {
        throw new TrailFleetingNoteLifecycleMutationError(
          "lifecycle-path-invalid",
          `Trail lifecycle folder path is occupied by a file: ${currentPath}`,
          error,
        );
      }

      const concurrentPath =
        app.vault.getAbstractFileByPath(currentPath);

      if (concurrentPath) {
        continue;
      }

      throw error;
    }
  }
}

function relevantIssue(
  issues: TrailParseIssue[],
  noteId: string,
): TrailParseIssue | undefined {
  return issues.find(
    (candidate) =>
      candidate.scope === "file"
      || candidate.objectId === noteId,
  );
}
