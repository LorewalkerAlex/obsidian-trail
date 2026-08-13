import type { TrailProject } from "./trail-project";
import type { TrailWorkflowIssue } from "./trail-issue";

export interface CreateProjectPlan {
  readonly commandId: string;
  readonly kind: "create-project";
  readonly project: TrailProject;
}

export interface CreateWorkflowIssuePlan {
  readonly commandId: string;
  readonly expectedProject: TrailProject;
  readonly issue: TrailWorkflowIssue;
  readonly kind: "create-workflow-issue";
}

export interface UpdateWorkflowIssuePlan {
  readonly commandId: string;
  readonly expectedIssue: TrailWorkflowIssue;
  readonly issue: TrailWorkflowIssue;
  readonly kind: "update-workflow-issue";
}

export type WorkflowMutationPlan =
  | CreateProjectPlan
  | CreateWorkflowIssuePlan
  | UpdateWorkflowIssuePlan;

export function affectedWorkflowEntityId(plan: WorkflowMutationPlan): string {
  switch (plan.kind) {
    case "create-project":
      return plan.project.id;
    case "create-workflow-issue":
    case "update-workflow-issue":
      return plan.issue.id;
  }
}
