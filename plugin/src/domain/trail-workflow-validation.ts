import {
  resolveStatusDefinition,
  type TrailConfiguration,
} from "./trail-configuration";
import type { TrailWorkflowIssue } from "./trail-issue";
import type { TrailProjectContribution } from "./trail-project-markdown";
import type { TrailSourceIssue } from "./trail-source-issue";

function sourceIssue(
  contribution: TrailProjectContribution,
  code: string,
  message: string,
  objectId?: string,
): TrailSourceIssue {
  return {
    code,
    filePath: contribution.filePath,
    message,
    objectId,
    scope: objectId === undefined ? "file" : "record",
  };
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

/** Validates cross-record and Configuration-dependent Workflow invariants. */
export function validateProjectContribution(
  contribution: TrailProjectContribution,
  configuration: TrailConfiguration,
): readonly TrailSourceIssue[] {
  const issues: TrailSourceIssue[] = [];
  const projectStatus = resolveStatusDefinition(
    configuration.statuses.project,
    contribution.project.statusDefinitionId,
  );

  if (projectStatus === undefined) {
    issues.push(sourceIssue(
      contribution,
      "project.status.invalid-reference",
      "Project statusDefinitionId does not reference a Project StatusDefinition",
      contribution.project.id,
    ));
  }

  for (const issue of Object.values(contribution.issuesById)) {
    const status = resolveWorkflowIssueStatus(configuration, issue);
    if (status === undefined) {
      issues.push(sourceIssue(
        contribution,
        "workflow-issue.status.invalid-reference",
        "Workflow Issue statusDefinitionId does not reference an Issue StatusDefinition",
        issue.id,
      ));
      continue;
    }

    if (issue.projectId !== contribution.project.id) {
      issues.push(sourceIssue(
        contribution,
        "workflow-issue.project.mismatch",
        "Workflow Issue projectId must match its physical Project container",
        issue.id,
      ));
    }
    if (issue.milestoneId !== undefined) {
      issues.push(sourceIssue(
        contribution,
        "workflow-issue.milestone.unsupported",
        "Milestone references are not supported by the current Workflow Entry slice",
        issue.id,
      ));
    }

    const terminal = status.category === "completed" || status.category === "canceled";
    if (terminal && issue.terminalAt === undefined) {
      issues.push(sourceIssue(
        contribution,
        "workflow-issue.terminal-at.required",
        "Terminal Workflow Issue status requires terminalAt",
        issue.id,
      ));
    }
    if (!terminal && issue.terminalAt !== undefined) {
      issues.push(sourceIssue(
        contribution,
        "workflow-issue.terminal-at.unexpected",
        "Non-terminal Workflow Issue status must not retain terminalAt",
        issue.id,
      ));
    }
    if (status.category === "completed" && issue.estimate === undefined) {
      issues.push(sourceIssue(
        contribution,
        "workflow-issue.estimate.required",
        "Completed Workflow Issue requires Estimate",
        issue.id,
      ));
    }
  }

  if (projectStatus?.category === "completed") {
    const hasNonTerminalIssue = Object.values(contribution.issuesById).some((issue) => {
      const status = resolveWorkflowIssueStatus(configuration, issue);
      return (
        status !== undefined
        && status.category !== "completed"
        && status.category !== "canceled"
      );
    });
    if (hasNonTerminalIssue) {
      issues.push(sourceIssue(
        contribution,
        "project.completed.non-terminal-issue",
        "Completed Project cannot contain a current non-terminal Workflow Issue",
        contribution.project.id,
      ));
    }
  }

  return issues;
}
