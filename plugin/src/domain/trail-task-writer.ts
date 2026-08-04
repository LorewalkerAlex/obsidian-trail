import type {
  TrailTask,
  TrailTaskStatus,
} from "./trail-model";
import { parseProjectTasks } from "./trail-parser";

const TRAIL_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/;

export type TrailTaskStatusUpdateErrorCode =
  | "source-fingerprint-missing"
  | "project-invalid"
  | "task-not-found"
  | "task-duplicate"
  | "task-conflict"
  | "task-completion-blocked"
  | "completed-at-invalid"
  | "task-header-invalid";

export class TrailTaskStatusUpdateError extends Error {
  constructor(
    readonly code: TrailTaskStatusUpdateErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TrailTaskStatusUpdateError";
  }
}

export interface TrailTaskStatusUpdateInput {
  markdown: string;
  expectedTask: TrailTask;
  targetStatus: TrailTaskStatus;
  completedAt?: string;
}

export function updateTaskStatusMarkdown({
  markdown,
  expectedTask,
  targetStatus,
  completedAt,
}: TrailTaskStatusUpdateInput): string {
  const expectedFingerprint =
    expectedTask.source.fingerprint;

  if (expectedFingerprint === undefined) {
    throw new TrailTaskStatusUpdateError(
      "source-fingerprint-missing",
      "The task does not contain a source fingerprint.",
    );
  }

  const result = parseProjectTasks(
    {
      filePath: expectedTask.projectPath,
      markdown,
    },
    expectedTask.projectId,
  );
  const fileIssue = result.issues.find(
    (issue) => issue.scope === "file",
  );

  if (fileIssue) {
    throw new TrailTaskStatusUpdateError(
      "project-invalid",
      fileIssue.message,
    );
  }

  const duplicateIssue = result.issues.find(
    (issue) =>
      issue.code === "task.id.duplicate"
      && issue.objectId === expectedTask.id,
  );

  if (duplicateIssue) {
    throw new TrailTaskStatusUpdateError(
      "task-duplicate",
      duplicateIssue.message,
    );
  }

  const latestTask = result.tasks.find(
    (task) => task.id === expectedTask.id,
  );

  if (!latestTask) {
    throw new TrailTaskStatusUpdateError(
      "task-not-found",
      `Task UUID "${expectedTask.id}" was not found.`,
    );
  }

  if (latestTask.source.fingerprint !== expectedFingerprint) {
    throw new TrailTaskStatusUpdateError(
      "task-conflict",
      "The task changed after it was read.",
    );
  }

  if (latestTask.status === targetStatus) {
    return markdown;
  }

  if (
    targetStatus === "completed"
    && latestTask.subtasks.some(
      (subtask) => !subtask.completed,
    )
  ) {
    throw new TrailTaskStatusUpdateError(
      "task-completion-blocked",
      "Complete every subtask before completing the task.",
    );
  }

  if (
    targetStatus === "completed"
    && (
      completedAt === undefined
      || !TRAIL_TIMESTAMP_PATTERN.test(completedAt)
    )
  ) {
    throw new TrailTaskStatusUpdateError(
      "completed-at-invalid",
      "A +08:00 completion timestamp is required.",
    );
  }

  const headerEndOffset = findHeaderEnd(
    markdown,
    latestTask.source.startOffset,
  );
  const currentHeader = markdown.slice(
    latestTask.source.startOffset,
    headerEndOffset,
  );
  const updatedHeader = updateTaskHeader(
    currentHeader,
    latestTask,
    targetStatus,
    completedAt,
  );

  return [
    markdown.slice(0, latestTask.source.startOffset),
    updatedHeader,
    markdown.slice(headerEndOffset),
  ].join("");
}

function updateTaskHeader(
  header: string,
  task: TrailTask,
  targetStatus: TrailTaskStatus,
  completedAt: string | undefined,
): string {
  if (
    !header.startsWith("- [")
    || header[4] !== "]"
    || ![" ", "x", "X"].includes(header[3] ?? "")
  ) {
    throw new TrailTaskStatusUpdateError(
      "task-header-invalid",
      "The task title line is no longer valid.",
    );
  }

  const commentStart = header.lastIndexOf("<!--");
  const commentPrefix = commentStart >= 0
    ? /<!--\s*trail:task\s+/.exec(
        header.slice(commentStart),
      )
    : null;

  if (!commentPrefix || commentPrefix.index !== 0) {
    throw new TrailTaskStatusUpdateError(
      "task-header-invalid",
      "The task metadata comment is no longer valid.",
    );
  }

  const metadataStart =
    commentStart + commentPrefix[0].length;
  const commentEnd = header.indexOf("-->", metadataStart);

  if (commentEnd < 0) {
    throw new TrailTaskStatusUpdateError(
      "task-header-invalid",
      "The task metadata comment is not closed.",
    );
  }

  let metadataEnd = commentEnd;

  while (
    metadataEnd > metadataStart
    && /\s/.test(header[metadataEnd - 1] ?? "")
  ) {
    metadataEnd -= 1;
  }

  const checkbox = targetStatus === "completed"
    ? "x"
    : " ";
  const metadata = {
    id: task.id,
    status: targetStatus,
    priority: task.priority,
    created: task.created,
    ...(task.due === undefined
      ? {}
      : { due: task.due }),
    ...(targetStatus === "completed"
      ? { completed: completedAt }
      : {}),
    labels: task.labels,
  };

  return [
    header.slice(0, 3),
    checkbox,
    header.slice(4, metadataStart),
    JSON.stringify(metadata),
    header.slice(metadataEnd),
  ].join("");
}

function findHeaderEnd(
  markdown: string,
  startOffset: number,
): number {
  const newlineOffset = markdown.indexOf("\n", startOffset);

  if (newlineOffset < 0) {
    return markdown.length;
  }

  return markdown[newlineOffset - 1] === "\r"
    ? newlineOffset - 1
    : newlineOffset;
}
