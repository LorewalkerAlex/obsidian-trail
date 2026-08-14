import type { TrailTriageIssue } from "./trail-issue";
import {
  createTrailMutationPlan,
  triageIssueMutationEntity,
  type TrailMutationPlan,
} from "../mutation/plans/trail-mutation-plan";

export interface CreateTriageIssuePlan {
  readonly commandId: string;
  readonly issue: TrailTriageIssue;
  readonly kind: "create-triage-issue";
}

export interface UpdateTriageIssuePlan {
  readonly commandId: string;
  readonly expectedIssue: TrailTriageIssue;
  readonly issue: TrailTriageIssue;
  readonly kind: "update-triage-issue";
}

export interface DeleteTriageIssuePlan {
  readonly commandId: string;
  readonly expectedIssue: TrailTriageIssue;
  readonly issueId: string;
  readonly kind: "delete-triage-issue";
}

export type TriageMutationPlan =
  | CreateTriageIssuePlan
  | UpdateTriageIssuePlan
  | DeleteTriageIssuePlan;

export function affectedTriageIssueId(plan: TriageMutationPlan): string {
  return plan.kind === "delete-triage-issue" ? plan.issueId : plan.issue.id;
}

/** Transitional adapter from feature execution plans to the canonical logical plan. */
export function toTrailMutationPlan(plan: TriageMutationPlan): TrailMutationPlan {
  switch (plan.kind) {
    case "create-triage-issue":
      return createTrailMutationPlan({
        commandId: plan.commandId,
        effects: [{ after: triageIssueMutationEntity(plan.issue), kind: "create" }],
        intent: "triage.issue.create",
      });
    case "update-triage-issue":
      return createTrailMutationPlan({
        commandId: plan.commandId,
        effects: [{
          after: triageIssueMutationEntity(plan.issue),
          before: triageIssueMutationEntity(plan.expectedIssue),
          kind: "replace",
        }],
        intent: "triage.issue.replace",
      });
    case "delete-triage-issue":
      return createTrailMutationPlan({
        commandId: plan.commandId,
        effects: [{
          before: triageIssueMutationEntity(plan.expectedIssue),
          kind: "delete",
        }],
        intent: "triage.issue.delete",
      });
  }
}
