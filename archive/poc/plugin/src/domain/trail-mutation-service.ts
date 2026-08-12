import type { App, TFile } from "obsidian";
import type {
  TrailFleetingNote,
  TrailTask,
  TrailTaskStatus,
} from "./trail-model";
import { parseFleetingNotes } from "./trail-fleeting-note-parser";
import {
  removeFleetingNoteMarkdown,
  TrailFleetingNoteRemovalError,
} from "./trail-fleeting-note-writer";
import { parseProjectTasks } from "./trail-parser";
import {
  createBacklogTaskMarkdown,
  removeCreatedTaskMarkdown,
  type TrailBacklogTaskDraft,
  TrailTaskCreationError,
} from "./trail-task-creation-writer";
import {
  TrailTaskStatusUpdateError,
  TrailTaskTitleUpdateError,
  updateTaskStatusMarkdown,
  updateTaskTitleMarkdown,
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

export interface TrailTaskTitleMutationInput {
  expectedTask: TrailTask;
  title: string;
}

export interface TrailBacklogTaskMutationInput {
  projectId: string;
  projectPath: string;
  task: TrailBacklogTaskDraft;
}

export interface TrailCreatedTaskCompensationInput {
  expectedTask: TrailTask;
}

export interface TrailFleetingNoteRemovalMutationInput {
  expectedNote: TrailFleetingNote;
}

export type TrailMutationErrorCode =
  | "project-file-not-found"
  | "fleeting-file-not-found"
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
    throw writeVerificationError(
      result.issues,
      expectedTask.id,
      `Trail could not confirm Task UUID "${expectedTask.id}" after writing.`,
    );
  }

  return updatedTask;
}

export async function updateTaskTitleInVault<
  FileType extends TrailMutableFile,
>(
  source: TrailMutationSource<FileType>,
  {
    expectedTask,
    title,
  }: TrailTaskTitleMutationInput,
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

  const expectedTitle = title.trim();
  let writtenMarkdown: string;

  try {
    writtenMarkdown = await source.process(
      file,
      (markdown) => updateTaskTitleMarkdown({
        markdown,
        expectedTask,
        title,
      }),
    );
  } catch (error: unknown) {
    if (error instanceof TrailTaskTitleUpdateError) {
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

  if (!updatedTask || updatedTask.title !== expectedTitle) {
    throw writeVerificationError(
      result.issues,
      expectedTask.id,
      `Trail could not confirm Task UUID "${expectedTask.id}" after writing.`,
    );
  }

  return updatedTask;
}

export async function createBacklogTaskInVault<
  FileType extends TrailMutableFile,
>(
  source: TrailMutationSource<FileType>,
  {
    projectId,
    projectPath,
    task,
  }: TrailBacklogTaskMutationInput,
): Promise<TrailTask> {
  const file = source.getFileByPath(projectPath);

  if (!file) {
    throw new TrailMutationError(
      "project-file-not-found",
      `Project file was not found: ${projectPath}`,
    );
  }

  let writtenMarkdown: string;
  try {
    writtenMarkdown = await source.process(
      file,
      (markdown) => createBacklogTaskMarkdown({
        markdown,
        projectId,
        projectPath,
        task,
      }),
    );
  } catch (error: unknown) {
    if (error instanceof TrailTaskCreationError) {
      throw error;
    }

    throw new TrailMutationError(
      "vault-process-failed",
      `Trail could not create a Task in ${file.path}.`,
      error,
    );
  }
  const result = parseProjectTasks(
    {
      filePath: file.path,
      markdown: writtenMarkdown,
    },
    projectId,
  );
  const createdTask = result.tasks.find(
    (candidate) => candidate.id === task.id,
  );
  const issue = relevantIssue(
    result.issues,
    task.id,
  );
  if (
    issue
    || !createdTask
    || !matchesBacklogTaskDraft(createdTask, task)
  ) {
    throw new TrailMutationError(
      "write-verification-failed",
      issue?.message
        ?? `Trail could not confirm created Task UUID "${task.id}" after writing.`,
    );
  }

  return createdTask;
}
export async function removeCreatedTaskInVault<
  FileType extends TrailMutableFile,
>(
  source: TrailMutationSource<FileType>,
  {
    expectedTask,
  }: TrailCreatedTaskCompensationInput,
): Promise<void> {
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
      (markdown) => removeCreatedTaskMarkdown({
        markdown,
        expectedTask,
      }),
    );
  } catch (error: unknown) {
    if (error instanceof TrailTaskCreationError) {
      throw error;
    }

    throw new TrailMutationError(
      "vault-process-failed",
      `Trail could not compensate Task UUID "${expectedTask.id}" in ${file.path}.`,
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
  const issue = relevantIssue(
    result.issues,
    expectedTask.id,
  );
  const remainingTask = result.tasks.find(
    (candidate) => candidate.id === expectedTask.id,
  );
  if (issue || remainingTask) {
    throw new TrailMutationError(
      "write-verification-failed",
      issue?.message
        ?? `Trail could not confirm compensation of Task UUID "${expectedTask.id}" after writing.`,
    );
  }
}
export async function removeFleetingNoteInVault<
  FileType extends TrailMutableFile,
>(
  source: TrailMutationSource<FileType>,
  {
    expectedNote,
  }: TrailFleetingNoteRemovalMutationInput,
): Promise<void> {
  const file = source.getFileByPath(
    expectedNote.source.filePath,
  );

  if (!file) {
    throw new TrailMutationError(
      "fleeting-file-not-found",
      `Fleeting Notes file was not found: ${expectedNote.source.filePath}`,
    );
  }

  let writtenMarkdown: string;
  try {
    writtenMarkdown = await source.process(
      file,
      (markdown) => removeFleetingNoteMarkdown({
        markdown,
        expectedNote,
      }),
    );
  } catch (error: unknown) {
    if (error instanceof TrailFleetingNoteRemovalError) {
      throw error;
    }

    throw new TrailMutationError(
      "vault-process-failed",
      `Trail could not remove Fleeting Note UUID "${expectedNote.id}" from ${file.path}.`,
      error,
    );
  }
  const result = parseFleetingNotes({
    filePath: file.path,
    markdown: writtenMarkdown,
  });
  const issue = relevantFleetingIssue(
    result.issues,
    expectedNote.id,
  );
  const remainingNote = result.notes.find(
    (candidate) => candidate.id === expectedNote.id,
  );
  if (issue || remainingNote) {
    throw new TrailMutationError(
      "write-verification-failed",
      issue?.message
        ?? `Trail could not confirm removal of Fleeting Note UUID "${expectedNote.id}" after writing.`,
    );
  }
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
function matchesBacklogTaskDraft(
  task: TrailTask,
  draft: TrailBacklogTaskDraft,
): boolean {
  return (
    task.title === draft.title.trim()
    && task.status === "backlog"
    && task.priority === "medium"
    && task.created === draft.created
    && task.due === undefined
    && task.completed === undefined
    && task.labels.length === 0
    && task.subtasks.length === 0
    && task.notes.length === 0
  );
}
function writeVerificationError(
  issues: ReturnType<typeof parseProjectTasks>["issues"],
  taskId: string,
  fallbackMessage: string,
): TrailMutationError {
  return new TrailMutationError(
    "write-verification-failed",
    relevantIssue(issues, taskId)?.message
      ?? fallbackMessage,
  );
}
function relevantIssue(
  issues: ReturnType<typeof parseProjectTasks>["issues"],
  taskId: string,
): ReturnType<typeof parseProjectTasks>["issues"][number] | undefined {
  return issues.find(
    (candidate) =>
      candidate.scope === "file"
      || candidate.objectId === taskId,
  );
}
function relevantFleetingIssue(
  issues: ReturnType<typeof parseFleetingNotes>["issues"],
  noteId: string,
): ReturnType<typeof parseFleetingNotes>["issues"][number] | undefined {
  return issues.find(
    (candidate) =>
      candidate.scope === "file"
      || candidate.objectId === noteId,
  );
}
