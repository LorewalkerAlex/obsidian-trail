import type { TrailWorkflowIssue } from "../../domain/trail-issue";
import type { TrailProject } from "../../domain/trail-project";
import type { TrailSourceEntry } from "../ports/trail-source-io";
import type {
  TrailProjectSourceResult,
  TrailSourceProblem,
} from "./trail-source-result";

export interface TrailWorkflowSnapshot {
  readonly projectResults: readonly TrailProjectSourceResult[];
  readonly structuralIssues: readonly TrailSourceProblem[];
}

export type TrailWorkflowPersistenceErrorCode =
  | "conflict"
  | "duplicate-id"
  | "source-invalid"
  | "target-missing"
  | "verification-failed";

/** Stable persistence error; Markdown-specific error classes do not cross this boundary. */
export class TrailWorkflowPersistenceError extends Error {
  public constructor(
    readonly code: TrailWorkflowPersistenceErrorCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "TrailWorkflowPersistenceError";
  }
}

/** Complete authoritative contract for Project-backed Workflow sources. */
export interface TrailWorkflowPersistence {
  readonly appendIssue: (
    filePath: string,
    expectedProject: TrailProject,
    issue: TrailWorkflowIssue,
    correlationId?: string,
  ) => Promise<TrailProjectSourceResult>;
  readonly createProjectAtPath: (
    filePath: string,
    project: TrailProject,
    correlationId?: string,
  ) => Promise<TrailProjectSourceResult>;
  readonly deleteIssue: (
    filePath: string,
    expectedIssue: TrailWorkflowIssue,
    correlationId?: string,
  ) => Promise<TrailProjectSourceResult>;
  readonly listProjectSources: () => Promise<readonly TrailSourceEntry[]>;
  readonly readAll: () => Promise<TrailWorkflowSnapshot>;
  readonly readSource: (filePath: string) => Promise<TrailProjectSourceResult>;
  readonly updateIssue: (
    filePath: string,
    expectedIssue: TrailWorkflowIssue,
    issue: TrailWorkflowIssue,
    correlationId?: string,
  ) => Promise<TrailProjectSourceResult>;
}
