import {
  applyGuardedMarkdownEdit,
} from "./trail-guarded-markdown-edit";
import type {
  TrailTask,
  TrailTaskStatus,
} from "./trail-model";
import { parseProjectTasks } from "./trail-parser";

const TRAIL_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/;

type TrailTaskLocateErrorCode =
  | "project-invalid"
  | "task-not-found"
  | "task-duplicate";

export type TrailTaskStatusUpdateErrorCode =
  | "source-fingerprint-missing"
  | TrailTaskLocateErrorCode
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

export type TrailTaskTitleUpdateErrorCode =
  | "source-fingerprint-missing"
  | TrailTaskLocateErrorCode
  | "task-conflict"
  | "task-title-invalid"
  | "task-header-invalid";

export class TrailTaskTitleUpdateError extends Error {
  constructor(
    readonly code: TrailTaskTitleUpdateErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TrailTaskTitleUpdateError";
  }
}

export interface TrailTaskStatusUpdateInput {
  markdown: string;
  expectedTask: TrailTask;
  targetStatus: TrailTaskStatus;
  completedAt?: string;
}

export interface TrailTaskTitleUpdateInput {
  markdown: string;
  expectedTask: TrailTask;
  title: string;
}

export function updateTaskStatusMarkdown({
  markdown,
  expectedTask,
  targetStatus,
  completedAt,
}: TrailTaskStatusUpdateInput): string {
  return applyGuardedMarkdownEdit({
    markdown,
    expectedFingerprint: expectedTask.source.fingerprint,
    missingFingerprintError: () => new TrailTaskStatusUpdateError(
      "source-fingerprint-missing",
      "The task does not contain a source fingerprint.",
    ),
    locateLatest: (latestMarkdown) => locateTaskForUpdate(
      latestMarkdown,
      expectedTask,
      (code, message) => new TrailTaskStatusUpdateError(
        code,
        message,
      ),
    ),
    conflictError: () => new TrailTaskStatusUpdateError(
      "task-conflict",
      "The task changed after it was read.",
    ),
    buildEdit: (latestTask, latestMarkdown) =>
      buildTaskStatusEdit(
        latestMarkdown,
        latestTask,
        targetStatus,
        completedAt,
      ),
  });
}

export function updateTaskTitleMarkdown({
  markdown,
  expectedTask,
  title,
}: TrailTaskTitleUpdateInput): string {
  const nextTitle = normalizeTaskTitle(title);

  return applyGuardedMarkdownEdit({
    markdown,
    expectedFingerprint: expectedTask.source.fingerprint,
    missingFingerprintError: () => new TrailTaskTitleUpdateError(
      "source-fingerprint-missing",
      "The task does not contain a source fingerprint.",
    ),
    locateLatest: (latestMarkdown) => locateTaskForUpdate(
      latestMarkdown,
      expectedTask,
      (code, message) => new TrailTaskTitleUpdateError(
        code,
        message,
      ),
    ),
    conflictError: () => new TrailTaskTitleUpdateError(
      "task-conflict",
      "The task changed after it was read.",
    ),
    buildEdit: (latestTask, latestMarkdown) =>
      buildTaskTitleEdit(
        latestMarkdown,
        latestTask,
        nextTitle,
      ),
  });
}

function locateTaskForUpdate(
  markdown: string,
  expectedTask: TrailTask,
  createError: (
    code: TrailTaskLocateErrorCode,
    message: string,
  ) => Error,
): TrailTask {
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
    throw createError("project-invalid", fileIssue.message);
  }

  const duplicateIssue = result.issues.find(
    (issue) =>
      issue.code === "task.id.duplicate"
      && issue.objectId === expectedTask.id,
  );
  if (duplicateIssue) {
    throw createError("task-duplicate", duplicateIssue.message);
  }

  const latestTask = result.tasks.find(
    (task) => task.id === expectedTask.id,
  );

  if (!latestTask) {
    throw createError(
      "task-not-found",
      `Task UUID "${expectedTask.id}" was not found.`,
    );
  }

  return latestTask;
}

function buildTaskStatusEdit(
  markdown: string,
  latestTask: TrailTask,
  targetStatus: TrailTaskStatus,
  completedAt: string | undefined,
): {
  startOffset: number;
  endOffset: number;
  replacement: string;
} | undefined {
  if (latestTask.status === targetStatus) {
    return undefined;
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

  return {
    startOffset: latestTask.source.startOffset,
    endOffset: headerEndOffset,
    replacement: updatedHeader,
  };
}

function buildTaskTitleEdit(
  markdown: string,
  latestTask: TrailTask,
  nextTitle: string,
): {
  startOffset: number;
  endOffset: number;
  replacement: string;
} | undefined {
  if (latestTask.title === nextTitle) {
    return undefined;
  }

  const headerEndOffset = findHeaderEnd(
    markdown,
    latestTask.source.startOffset,
  );
  const header = markdown.slice(
    latestTask.source.startOffset,
    headerEndOffset,
  );
  const titleRange = findTaskTitleRange(header);

  return {
    startOffset:
      latestTask.source.startOffset + titleRange.startOffset,
    endOffset:
      latestTask.source.startOffset + titleRange.endOffset,
    replacement: nextTitle,
  };
}

function normalizeTaskTitle(title: string): string {
  const normalized = title.trim();

  if (
    normalized === ""
    || /[\r\n]/.test(normalized)
    || /<!--\s*trail:task\b/i.test(normalized)
  ) {
    throw new TrailTaskTitleUpdateError(
      "task-title-invalid",
      "Task title must be one non-empty line without trail:task metadata.",
    );
  }

  return normalized;
}

function findTaskTitleRange(header: string): {
  startOffset: number;
  endOffset: number;
} {
  if (
    !header.startsWith("- [")
    || header[4] !== "]"
    || ![" ", "x", "X"].includes(header[3] ?? "")
    || header[5] !== " "
  ) {
    throw new TrailTaskTitleUpdateError(
      "task-header-invalid",
      "The task title line is no longer valid.",
    );
  }

  const commentStart = header.lastIndexOf("<!--");
  const metadataComment = commentStart >= 0
    ? /<!--\s*trail:task\s+/.exec(header.slice(commentStart))
    : null;

  if (!metadataComment || metadataComment.index !== 0) {
    throw new TrailTaskTitleUpdateError(
      "task-header-invalid",
      "The task metadata comment is no longer valid.",
    );
  }

  let titleEndOffset = commentStart;

  while (
    titleEndOffset > 6
    && /\s/.test(header[titleEndOffset - 1] ?? "")
  ) {
    titleEndOffset -= 1;
  }

  if (titleEndOffset <= 6) {
    throw new TrailTaskTitleUpdateError(
      "task-header-invalid",
      "The task title line is no longer valid.",
    );
  }

  return {
    startOffset: 6,
    endOffset: titleEndOffset,
  };
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
