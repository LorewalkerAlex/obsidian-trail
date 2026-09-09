import type { TrailConfiguration, TrailStatusDefinition } from "../model/trail-configuration";
import type { TrailIssue, TrailWorkflowIssue } from "../model/trail-entities";
import {
  isTrailTerminalStatusDefinition,
  resolveTrailStatusDefinition,
} from "./trail-status-rules";

/**
 * New Workflow Issue membership follows the target Project lifecycle: Unstarted
 * accepts Backlog planning only, Started accepts ordinary work, and terminal
 * Projects accept no new membership.
 */
export function canTrailProjectAcceptWorkflowIssue(
  projectStatus: TrailStatusDefinition,
  issueStatus: TrailStatusDefinition,
): boolean {
  if (projectStatus.category === "unstarted") {
    return issueStatus.category === "backlog";
  }
  return projectStatus.category === "started";
}

function canTrailProjectUseOrdinaryWorkflowIssueMutation(
  projectStatus: TrailStatusDefinition,
  issueStatus: TrailStatusDefinition,
): boolean {
  return projectStatus.category === "started"
    || (projectStatus.category === "unstarted" && issueStatus.category === "backlog");
}

export function canTrailProjectEditWorkflowIssuePlanningFields(
  projectStatus: TrailStatusDefinition,
  issueStatus: TrailStatusDefinition,
): boolean {
  return canTrailProjectUseOrdinaryWorkflowIssueMutation(projectStatus, issueStatus);
}

export function canTrailProjectAssignWorkflowIssueMilestone(
  projectStatus: TrailStatusDefinition,
  issueStatus: TrailStatusDefinition,
): boolean {
  return canTrailProjectUseOrdinaryWorkflowIssueMutation(projectStatus, issueStatus);
}

export function canTrailProjectDeleteWorkflowIssue(
  projectStatus: TrailStatusDefinition,
  issueStatus: TrailStatusDefinition,
): boolean {
  return canTrailProjectUseOrdinaryWorkflowIssueMutation(projectStatus, issueStatus);
}

/**
 * Status changes are Project-scoped mutations, not membership checks. Started
 * Projects permit ordinary Issue progression. Unstarted Projects keep Backlog
 * planning plus cancellation but do not advance work into execution. Canceled
 * Projects expose only cancellation for unresolved non-terminal children.
 */
export function canTrailProjectChangeWorkflowIssueStatus(
  projectStatus: TrailStatusDefinition,
  currentIssueStatus: TrailStatusDefinition,
  targetIssueStatus: TrailStatusDefinition,
): boolean {
  if (currentIssueStatus.id === targetIssueStatus.id) return true;
  if (projectStatus.category === "started") return true;
  if (projectStatus.category === "unstarted") {
    return targetIssueStatus.category === "canceled"
      || (
        currentIssueStatus.category === "backlog"
        && targetIssueStatus.category === "backlog"
      );
  }
  if (projectStatus.category === "canceled") {
    return !isTrailTerminalStatusDefinition(currentIssueStatus)
      && targetIssueStatus.category === "canceled";
  }
  return false;
}

/** Returns the first current non-terminal Workflow Issue owned by a Project. */
export function findTrailNonTerminalProjectChildIssue(
  configuration: TrailConfiguration,
  issues: Iterable<TrailIssue>,
  projectId: string,
): TrailWorkflowIssue | undefined {
  for (const candidate of issues) {
    if (candidate.context !== "workflow" || candidate.projectId !== projectId) continue;
    const status = resolveTrailStatusDefinition(
      configuration,
      "issue",
      candidate.statusDefinitionId,
    );
    if (status !== undefined && !isTrailTerminalStatusDefinition(status)) return candidate;
  }
  return undefined;
}
