import type { TrailTriageIssue } from "./trail-issue";

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
