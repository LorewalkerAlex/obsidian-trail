import type { TrailWorkflowIssue } from "./trail-issue";
import type { TrailProject } from "./trail-project";
import {
  createTrailMutationPlan,
  projectMutationEntity,
  workflowIssueMutationEntity,
  type TrailMutationPlan,
} from "../mutation/plans/trail-mutation-plan";

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

/** Transitional adapter from feature execution plans to the canonical logical plan. */
export function toTrailMutationPlan(plan: WorkflowMutationPlan): TrailMutationPlan {
  switch (plan.kind) {
    case "create-project":
      return createTrailMutationPlan({
        commandId: plan.commandId,
        effects: [{ after: projectMutationEntity(plan.project), kind: "create" }],
        intent: "workflow.project.create",
      });
    case "create-workflow-issue":
      return createTrailMutationPlan({
        commandId: plan.commandId,
        effects: [{ after: workflowIssueMutationEntity(plan.issue), kind: "create" }],
        intent: "workflow.issue.create",
        preconditions: [{
          entity: projectMutationEntity(plan.expectedProject),
          kind: "entity-equals",
        }],
      });
    case "update-workflow-issue":
      return createTrailMutationPlan({
        commandId: plan.commandId,
        effects: [{
          after: workflowIssueMutationEntity(plan.issue),
          before: workflowIssueMutationEntity(plan.expectedIssue),
          kind: "replace",
        }],
        intent: "workflow.issue.replace",
      });
  }
}
