import type { TrailConfiguration } from "../../domain/model/trail-configuration";
import type { TrailWorkflowIssue } from "../../domain/model/trail-entities";
import {
  TRAIL_PRIORITIES,
  type TrailPriority,
  type TrailStatusCategory,
} from "../../domain/model/trail-values";
import {
  selectTrailStatusOptionGroups,
  type TrailStatusOptionGroup,
} from "./trail-status-query";

export const TRAIL_WORKFLOW_ISSUE_LIST_STATUS_CATEGORY_ORDER = [
  "started",
  "unstarted",
  "backlog",
  "completed",
  "canceled",
] as const satisfies readonly TrailStatusCategory[];

function priorityOrder(priority: TrailPriority | undefined): number {
  if (priority === undefined) return TRAIL_PRIORITIES.length;
  const index = TRAIL_PRIORITIES.indexOf(priority);
  return index < 0 ? TRAIL_PRIORITIES.length : index;
}

/** Shared Workflow Issue scan order for Project Workspace and Current Cycle Lists. */
export function compareTrailWorkflowIssueCollectionOrder(
  left: TrailWorkflowIssue,
  right: TrailWorkflowIssue,
): number {
  const leftDue = left.due ?? Number.POSITIVE_INFINITY;
  const rightDue = right.due ?? Number.POSITIVE_INFINITY;
  if (leftDue !== rightDue) return leftDue - rightDue;

  const priorityDelta = priorityOrder(left.priority) - priorityOrder(right.priority);
  if (priorityDelta !== 0) return priorityDelta;

  const createdDelta = left.createdAt - right.createdAt;
  return createdDelta !== 0 ? createdDelta : left.id.localeCompare(right.id);
}

/** Preserves configured definition order inside Trail's shared Workflow Issue List skeleton. */
export function selectTrailWorkflowIssueListStatusGroups(
  configuration: TrailConfiguration,
): readonly TrailStatusOptionGroup[] {
  return [...selectTrailStatusOptionGroups(configuration, "issue")].sort((left, right) => (
    TRAIL_WORKFLOW_ISSUE_LIST_STATUS_CATEGORY_ORDER.indexOf(left.category)
    - TRAIL_WORKFLOW_ISSUE_LIST_STATUS_CATEGORY_ORDER.indexOf(right.category)
  ));
}
