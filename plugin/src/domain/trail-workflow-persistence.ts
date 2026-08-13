import type { TrailWorkflowIssue } from "./trail-issue";
import type { TrailProject } from "./trail-project";
import type { TrailProjectParseResult } from "./trail-project-markdown";
import type { TrailSourceIssue } from "./trail-source-issue";

export interface TrailWorkflowSnapshot {
  readonly projectResults: readonly TrailProjectParseResult[];
  readonly structuralIssues: readonly TrailSourceIssue[];
}

export interface TrailWorkflowPersistence {
  readonly appendIssue: (
    filePath: string,
    expectedProject: TrailProject,
    issue: TrailWorkflowIssue,
    correlationId?: string,
  ) => Promise<TrailProjectParseResult>;
  readonly createProject: (
    project: TrailProject,
    correlationId?: string,
  ) => Promise<TrailProjectParseResult>;
  readonly readAll: () => Promise<TrailWorkflowSnapshot>;
  readonly readSource: (filePath: string) => Promise<TrailProjectParseResult>;
  readonly updateIssue: (
    filePath: string,
    expectedIssue: TrailWorkflowIssue,
    issue: TrailWorkflowIssue,
    correlationId?: string,
  ) => Promise<TrailProjectParseResult>;
}
