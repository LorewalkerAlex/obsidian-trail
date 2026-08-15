import {
  resolveStatusDefinition,
  type TrailConfiguration,
} from "../trail-configuration";
import type { TrailWorkflowIssue } from "../trail-issue";
import type { TrailProject } from "../trail-project";

/** Logical Project aggregate required by Workflow Domain validation. */
export interface TrailProjectValidationState {
  readonly issuesById: Readonly<Record<string, TrailWorkflowIssue>>;
  readonly project: TrailProject;
}

/** Pure Domain validation result; source location is attached outside Domain. */
export interface TrailWorkflowValidationIssue {
  readonly code: string;
  readonly entityId: string;
  readonly message: string;
}

function validationIssue(
  code: string,
  entityId: string,
  message: string,
): TrailWorkflowValidationIssue {
  return { code, entityId, message };
}

export function resolveWorkflowIssueStatus(
  configuration: TrailConfiguration,
  issue: TrailWorkflowIssue,
) {
  return resolveStatusDefinition(
    configuration.statuses.issue,
    issue.statusDefinitionId,
  );
}

/** Validates cross-entity and Configuration-dependent Workflow invariants. */
export function validateWorkflowProjectState(
  state: TrailProjectValidationState,
  configuration: TrailConfiguration,
): readonly TrailWorkflowValidationIssue[] {
  const issues: TrailWorkflowValidationIssue[] = [];
  const projectStatus = resolveStatusDefinition(
    configuration.statuses.project,
    state.project.statusDefinitionId,
  );

  if (projectStatus === undefined) {
    issues.push(validationIssue(
      "project.status.invalid-reference",
      state.project.id,
      "Project statusDefinitionId does not reference a Project StatusDefinition",
    ));
  }

  for (const issue of Object.values(state.issuesById)) {
    const status = resolveWorkflowIssueStatus(configuration, issue);
    if (status === undefined) {
      issues.push(validationIssue(
        "workflow-issue.status.invalid-reference",
        issue.id,
        "Workflow Issue statusDefinitionId does not reference an Issue StatusDefinition",
      ));
      continue;
    }

    if (issue.projectId !== state.project.id) {
      issues.push(validationIssue(
        "workflow-issue.project.mismatch",
        issue.id,
        "Workflow Issue projectId must match its Project",
      ));
    }
    if (issue.milestoneId !== undefined) {
      issues.push(validationIssue(
        "workflow-issue.milestone.unsupported",
        issue.id,
        "Milestone references are not supported by the current Workflow behavior",
      ));
    }

    const terminal = status.category === "completed" || status.category === "canceled";
    if (terminal && issue.terminalAt === undefined) {
      issues.push(validationIssue(
        "workflow-issue.terminal-at.required",
        issue.id,
        "Terminal Workflow Issue status requires terminalAt",
      ));
    }
    if (!terminal && issue.terminalAt !== undefined) {
      issues.push(validationIssue(
        "workflow-issue.terminal-at.unexpected",
        issue.id,
        "Non-terminal Workflow Issue status must not retain terminalAt",
      ));
    }
    if (status.category === "completed" && issue.estimate === undefined) {
      issues.push(validationIssue(
        "workflow-issue.estimate.required",
        issue.id,
        "Completed Workflow Issue requires Estimate",
      ));
    }
  }

  if (projectStatus?.category === "completed") {
    const hasNonTerminalIssue = Object.values(state.issuesById).some((issue) => {
      const status = resolveWorkflowIssueStatus(configuration, issue);
      return status !== undefined
        && status.category !== "completed"
        && status.category !== "canceled";
    });
    if (hasNonTerminalIssue) {
      issues.push(validationIssue(
        "project.completed.non-terminal-issue",
        state.project.id,
        "Completed Project cannot contain a current non-terminal Workflow Issue",
      ));
    }
  }

  return issues;
}
