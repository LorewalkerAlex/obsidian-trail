import type { TrailTask } from "./trail-model";
import { parseProjectTasks } from "./trail-parser";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/;

export type TrailTaskCreationErrorCode =
  | "project-invalid"
  | "task-id-invalid"
  | "task-created-invalid"
  | "task-title-invalid"
  | "task-duplicate"
  | "task-id-conflict"
  | "source-fingerprint-missing"
  | "task-conflict";

export class TrailTaskCreationError extends Error {
  constructor(
    readonly code: TrailTaskCreationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TrailTaskCreationError";
  }
}

export interface TrailBacklogTaskDraft {
  id: string;
  title: string;
  created: string;
}

export interface TrailBacklogTaskCreationInput {
  markdown: string;
  projectId: string;
  projectPath: string;
  task: TrailBacklogTaskDraft;
}

export interface TrailCreatedTaskRemovalInput {
  markdown: string;
  expectedTask: TrailTask;
}

export function createBacklogTaskMarkdown({
  markdown,
  projectId,
  projectPath,
  task,
}: TrailBacklogTaskCreationInput): string {
  validateDraft(task);

  const result = parseProjectTasks(
    {
      filePath: projectPath,
      markdown,
    },
    projectId,
  );

  assertProjectValid(result.issues);
  assertTaskNotDuplicated(result.issues, task.id);

  const existingTask = result.tasks.find(
    (candidate) => candidate.id === task.id,
  );

  if (existingTask) {
    if (matchesDraft(existingTask, task)) {
      return markdown;
    }

    throw new TrailTaskCreationError(
      "task-id-conflict",
      `Task UUID "${task.id}" is already in use by a different Task.`,
    );
  }

  const insertionOffset = findTaskInsertionOffset(markdown);
  const lineEnding = detectLineEnding(markdown);
  const taskLine = serializeBacklogTask(task);
  const prefix = markdown.slice(0, insertionOffset);
  const suffix = markdown.slice(insertionOffset);

  return [
    prefix,
    prefix.endsWith("\n") ? "" : lineEnding,
    taskLine,
    suffix.startsWith("\n") || suffix.startsWith("\r\n")
      ? ""
      : lineEnding,
    suffix,
  ].join("");
}

export function removeCreatedTaskMarkdown({
  markdown,
  expectedTask,
}: TrailCreatedTaskRemovalInput): string {
  const expectedFingerprint =
    expectedTask.source.fingerprint;

  if (expectedFingerprint === undefined) {
    throw new TrailTaskCreationError(
      "source-fingerprint-missing",
      "The created Task does not contain a source fingerprint.",
    );
  }

  const result = parseProjectTasks(
    {
      filePath: expectedTask.projectPath,
      markdown,
    },
    expectedTask.projectId,
  );

  assertProjectValid(result.issues);
  assertTaskNotDuplicated(result.issues, expectedTask.id);

  const latestTask = result.tasks.find(
    (candidate) => candidate.id === expectedTask.id,
  );

  if (!latestTask) {
    return markdown;
  }

  if (latestTask.source.fingerprint !== expectedFingerprint) {
    throw new TrailTaskCreationError(
      "task-conflict",
      "The created Task changed before it could be compensated.",
    );
  }

  return [
    markdown.slice(0, latestTask.source.startOffset),
    markdown.slice(latestTask.source.endOffset),
  ].join("");
}

function validateDraft(
  task: TrailBacklogTaskDraft,
): void {
  if (!UUID_PATTERN.test(task.id)) {
    throw new TrailTaskCreationError(
      "task-id-invalid",
      "The new Task id must be a UUID.",
    );
  }

  if (!TIMESTAMP_PATTERN.test(task.created)) {
    throw new TrailTaskCreationError(
      "task-created-invalid",
      "The new Task created time must be a +08:00 timestamp.",
    );
  }

  if (
    task.title.trim() === ""
    || /\r|\n/.test(task.title)
    || /<!--\s*trail:task\b/.test(task.title)
  ) {
    throw new TrailTaskCreationError(
      "task-title-invalid",
      "The new Task title must be one non-empty line without trail:task metadata.",
    );
  }
}

function assertProjectValid(
  issues: ReturnType<typeof parseProjectTasks>["issues"],
): void {
  const fileIssue = issues.find(
    (issue) => issue.scope === "file",
  );

  if (fileIssue) {
    throw new TrailTaskCreationError(
      "project-invalid",
      fileIssue.message,
    );
  }
}

function assertTaskNotDuplicated(
  issues: ReturnType<typeof parseProjectTasks>["issues"],
  taskId: string,
): void {
  const duplicateIssue = issues.find(
    (issue) =>
      issue.code === "task.id.duplicate"
      && issue.objectId === taskId,
  );

  if (duplicateIssue) {
    throw new TrailTaskCreationError(
      "task-duplicate",
      duplicateIssue.message,
    );
  }
}

function matchesDraft(
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

function findTaskInsertionOffset(
  markdown: string,
): number {
  const notesHeading = /^##[ \t]+Notes[ \t]*\r?$/gm.exec(
    markdown,
  );

  if (!notesHeading) {
    throw new TrailTaskCreationError(
      "project-invalid",
      "Project Notes section was not found.",
    );
  }

  return notesHeading.index;
}

function detectLineEnding(
  markdown: string,
): "\n" | "\r\n" {
  return markdown.includes("\r\n") ? "\r\n" : "\n";
}

function serializeBacklogTask(
  task: TrailBacklogTaskDraft,
): string {
  const metadata = {
    id: task.id,
    status: "backlog",
    priority: "medium",
    created: task.created,
    labels: [],
  };

  return `- [ ] ${task.title.trim()} <!-- trail:task ${JSON.stringify(metadata)} -->`;
}
