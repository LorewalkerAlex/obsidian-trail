import type { TrailWorkflowIssue } from "../../domain/model/trail-entities";
import type { TrailRuntimeState } from "../../runtime/store/trail-runtime-store";
import { selectTrailWorkflowIssueActionFacts } from "./trail-workflow-issue-action-query";

export interface TrailWorkflowIssueStatusDragTargetReadModel {
  readonly id: string;
  readonly requiresInput: boolean;
}

export interface TrailWorkflowIssueStatusDragItemReadModel {
  readonly expectedIssue: TrailWorkflowIssue;
  readonly id: string;
  readonly statusDefinitionId: string;
  readonly targets: readonly TrailWorkflowIssueStatusDragTargetReadModel[];
}

/**
 * Projects the current legal Status targets plus the one extra-input fact that
 * Status drag needs. The target legality still comes from the normal effective
 * capability Query; this projection only marks completion targets that require
 * an Estimate before the existing Application intent can execute immediately.
 */
export function selectTrailWorkflowIssueStatusDragItems(
  state: TrailRuntimeState,
  issueIds: readonly string[],
): readonly TrailWorkflowIssueStatusDragItemReadModel[] | null {
  const facts = selectTrailWorkflowIssueActionFacts(state, issueIds);
  if (facts === null) return null;

  return facts.issues.map(({ expectedIssue, legalTargets }) => ({
    expectedIssue,
    id: expectedIssue.id,
    statusDefinitionId: expectedIssue.statusDefinitionId,
    targets: legalTargets.statuses.map((target) => ({
      id: target.id,
      requiresInput: target.category === "completed" && expectedIssue.estimate === undefined,
    })),
  }));
}
