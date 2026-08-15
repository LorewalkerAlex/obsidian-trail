import type { TrailTriageIssue } from "../../domain/trail-issue";
import type { TrailTriageParseResult } from "../../markdown/codecs/trail-triage-codec";

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
