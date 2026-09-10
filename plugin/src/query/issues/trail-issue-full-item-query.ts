import type { TrailWorkflowIssue } from "../../domain/model/trail-entities";
import type { TrailRuntimeState } from "../../runtime/store/trail-runtime-store";
import {
  selectTrailWorkflowIssueEffectiveCapabilitiesFromReadableSnapshot,
  type TrailWorkflowIssueEffectiveCapabilities,
} from "../shared/trail-effective-capability-query";
import { selectTrailReadableRuntimeSnapshot } from "../shared/trail-effective-query";
import {
  createTrailWorkflowIssuePresentationProjector,
  type TrailWorkflowIssuePresentationReadModel,
} from "../shared/trail-workflow-issue-presentation-query";

export interface TrailIssueFullItemReadModel {
  readonly capabilities: TrailWorkflowIssueEffectiveCapabilities;
  readonly expectedIssue: TrailWorkflowIssue;
  readonly issue: TrailWorkflowIssuePresentationReadModel;
}

/**
 * Full Item consumes one readable Runtime snapshot so content, relationship
 * presentation, and write capability remain coherent for the same Issue view.
 */
export function selectTrailIssueFullItemReadModel(
  state: TrailRuntimeState,
  issueId: string,
): TrailIssueFullItemReadModel | null {
  const readable = selectTrailReadableRuntimeSnapshot(state);
  const issue = readable.authoritative.domain.issuesById.get(issueId);
  if (issue?.context !== "workflow") return null;

  const projectIssue = createTrailWorkflowIssuePresentationProjector(readable);
  const presentation = projectIssue?.(issue) ?? null;
  const capability = selectTrailWorkflowIssueEffectiveCapabilitiesFromReadableSnapshot(
    readable,
    state.control,
    issue.id,
  );
  if (presentation === null || capability === null) return null;

  return {
    capabilities: capability.capabilities,
    expectedIssue: issue,
    issue: presentation,
  };
}
