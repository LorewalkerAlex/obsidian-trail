import type { TrailTriageIssue } from "../../domain/trail-issue";
import type { TrailTriageSourceResult } from "./trail-source-result";

export type TrailTriagePersistenceErrorCode =
  | "conflict"
  | "duplicate-id"
  | "source-invalid"
  | "target-missing"
  | "verification-failed";

/** Stable Triage persistence error; Markdown-specific error classes stay below Persistence. */
export class TrailTriagePersistenceError extends Error {
  public constructor(
    readonly code: TrailTriagePersistenceErrorCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "TrailTriagePersistenceError";
  }
}

/** Complete authoritative contract for the singleton Triage source. */
export interface TrailTriagePersistence {
  readonly appendIssue: (
    issue: TrailTriageIssue,
    correlationId?: string,
  ) => Promise<TrailTriageSourceResult>;
  readonly deleteIssue: (
    expectedIssue: TrailTriageIssue,
    correlationId?: string,
  ) => Promise<TrailTriageSourceResult>;
  readonly readLatest: () => Promise<TrailTriageSourceResult>;
  readonly updateIssue: (
    expectedIssue: TrailTriageIssue,
    issue: TrailTriageIssue,
    correlationId?: string,
  ) => Promise<TrailTriageSourceResult>;
}
