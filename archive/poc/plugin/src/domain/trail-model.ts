export const PROJECT_STATUSES = [
  "planned",
  "active",
  "completed",
  "archived",
] as const;

export const TASK_STATUSES = [
  "backlog",
  "todo",
  "doing",
  "blocked",
  "completed",
] as const;

export const TASK_PRIORITIES = [
  "low",
  "medium",
  "high",
  "urgent",
] as const;

export type TrailProjectStatus =
  (typeof PROJECT_STATUSES)[number];

export type TrailTaskStatus =
  (typeof TASK_STATUSES)[number];

export type TrailTaskPriority =
  (typeof TASK_PRIORITIES)[number];
export interface TrailSourceRange {
  filePath: string;
  startOffset: number;
  endOffset: number;
  fingerprint?: string;
}

export interface TrailArea {
  id: string;
  name: string;
  created: string;
  description: string;
  filePath: string;
}
export interface TrailProject {
  id: string;
  areaId: string;
  areaName: string;
  name: string;
  created: string;
  status: TrailProjectStatus;
  completedAt?: string;
  overview: string;
  tasks: TrailTask[];
  notes: TrailProjectNote[];
  filePath: string;
}
export interface TrailTask {
  id: string;
  projectId: string;
  projectPath: string;
  title: string;
  status: TrailTaskStatus;
  priority: TrailTaskPriority;
  created: string;
  due?: string;
  completed?: string;
  labels: string[];
  subtasks: TrailSubtask[];
  notes: TrailTaskNote[];
  source: TrailSourceRange;
}

export interface TrailFleetingNote {
  id: string;
  text: string;
  created: string;
  cleanupDue?: string;
  source: TrailSourceRange;
}
export type TrailFleetingNoteStorage =
  | "archive"
  | "trash";

export interface TrailStoredFleetingNote
  extends TrailFleetingNote {
  storage: TrailFleetingNoteStorage;
  storedAt: string;
}
export interface TrailSubtask {
  text: string;
  completed: boolean;
}

export interface TrailTaskNote {
  text: string;
}

export interface TrailProjectNote {
  text: string;
}

export type TrailParseIssueScope =
  | "file"
  | "task"
  | "fleeting";

export interface TrailParseIssue {
  scope: TrailParseIssueScope;
  code: string;
  message: string;
  filePath: string;
  line?: number;
  objectId?: string;
}

export interface TrailParseResult<T> {
  value?: T;
  issues: TrailParseIssue[];
}
