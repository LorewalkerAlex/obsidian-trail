import type { TrailTriageIssue } from "./trail-issue";
import type { TrailTriageParseResult } from "./trail-triage-markdown";

export interface TrailTriagePersistenceGateway {
  readonly appendIssue: (
    issue: TrailTriageIssue,
    correlationId?: string,
  ) => Promise<TrailTriageParseResult>;
  readonly readLatest: () => Promise<TrailTriageParseResult>;
}

export interface TrailTriageManagementPersistenceGateway {
  readonly deleteIssue: (
    expectedIssue: TrailTriageIssue,
    correlationId?: string,
  ) => Promise<TrailTriageParseResult>;
  readonly readLatest: () => Promise<TrailTriageParseResult>;
  readonly updateIssue: (
    expectedIssue: TrailTriageIssue,
    issue: TrailTriageIssue,
    correlationId?: string,
  ) => Promise<TrailTriageParseResult>;
}

export type TrailTriagePersistence =
  & TrailTriagePersistenceGateway
  & TrailTriageManagementPersistenceGateway;
