import type { App, TFile } from "obsidian";

import type {
  TrailTask,
  TrailTaskStatus,
} from "./trail-model";
import { parseProjectTasks } from "./trail-parser";
import {
  TrailTaskStatusUpdateError,
  updateTaskStatusMarkdown,
} from "./trail-task-writer";

export interface TrailMutableFile {
  path: string;
}

export interface TrailMutationSource<
  FileType extends TrailMutableFile,
> {
  getFileByPath(path: string): FileType | null;
  process(
    file: FileType,
    update: (markdown: string) => string,
  ): Promise<string>;
}

export interface TrailTaskStatusMutationInput {
  expectedTask: TrailTask;
  targetStatus: TrailTaskStatus;
  completedAt?: string;
}

export type TrailMutationErrorCode =
  | "project-file-not-found"
  | "vault-process-failed"
  | "write-verification-failed";

export class TrailMutationError extends Error {
  constructor(
    readonly code: TrailMutationErrorCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "TrailMutationError";
  }
}

export function createObsidianTrailMutationSource(
  app: App,
): TrailMutationSource<TFile> {
  return {
    getFileByPath: (path) =>
      app.vault.getFileByPath(path),

    process: (file, update) =>
      app.vault.process(file, update),
  };
}

export async function updateTaskStatusInVault<
  FileType extends TrailMutableFile,
>(
  source: TrailMutationSource<FileType>,
  {
    expectedTask,
    targetStatus,
    completedAt,
  }: TrailTaskStatusMutationInput,
): Promise<TrailTask> {
  const file = source.getFileByPath(
    expectedTask.projectPath,
  );

  if (!file) {
    throw new TrailMutationError(
      "project-file-not-found",
      `Project file was not found: ${expectedTask.projectPath}`,
    );
  }

  let writtenMarkdown: string;

  try {
    writtenMarkdown = await source.process(
      file,
      (markdown) => updateTaskStatusMarkdown({
        markdown,
        expectedTask,
        targetStatus,
        completedAt,
      }),
    );
  } catch (error: unknown) {
    if (error instanceof TrailTaskStatusUpdateError) {
      throw error;
    }

    throw new TrailMutationError(
      "vault-process-failed",
      `Trail could not update ${file.path}.`,
      error,
    );
  }

  const result = parseProjectTasks(
    {
      filePath: file.path,
      markdown: writtenMarkdown,
    },
    expectedTask.projectId,
  );
  const updatedTask = result.tasks.find(
    (task) => task.id === expectedTask.id,
  );

  if (
    !updatedTask
    || !matchesRequestedStatus(
      updatedTask,
      targetStatus,
      completedAt,
    )
  ) {
    const issue = result.issues.find(
      (candidate) =>
        candidate.scope === "file"
        || candidate.objectId === expectedTask.id,
    );

    throw new TrailMutationError(
      "write-verification-failed",
      issue?.message
        ?? `Trail could not confirm Task UUID "${expectedTask.id}" after writing.`,
    );
  }

  return updatedTask;
}

function matchesRequestedStatus(
  task: TrailTask,
  targetStatus: TrailTaskStatus,
  completedAt: string | undefined,
): boolean {
  if (task.status !== targetStatus) {
    return false;
  }

  if (targetStatus === "completed") {
    return completedAt === undefined
      || task.completed === completedAt;
  }

  return task.completed === undefined;
}
