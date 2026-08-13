import type { TrailWorkflowIssue } from "./trail-issue";
import type { TrailProjectParseResult } from "./trail-project-markdown";
import type { TrailWorkflowPersistence } from "./trail-workflow-persistence";

export interface TrailWorkflowIssueDeletionPersistence {
  readonly deleteIssue: (
    filePath: string,
    expectedIssue: TrailWorkflowIssue,
    correlationId?: string,
  ) => Promise<TrailProjectParseResult>;
}

/** Runtime capability guard keeps existing Workflow test gateways source-compatible. */
export function supportsWorkflowIssueDeletion(
  persistence: TrailWorkflowPersistence,
): persistence is TrailWorkflowPersistence & TrailWorkflowIssueDeletionPersistence {
  return typeof (persistence as Partial<TrailWorkflowIssueDeletionPersistence>).deleteIssue
    === "function";
}
