import type { TrailConfiguration } from "../../domain/model/trail-configuration";
import type {
  TrailProject,
  TrailTriageIssue,
  TrailWorkflowIssue,
} from "../../domain/model/trail-entities";
import {
  TRAIL_PRIORITIES,
  TRAIL_STATUS_CATEGORIES,
  type TrailPriority,
  type TrailStatusCategory,
} from "../../domain/model/trail-values";
import { projectTrailEffectiveAuthoritativeState } from "../../runtime/projection/trail-runtime-projection";
import type {
  TrailAuthoritativeState,
  TrailRuntimeState,
} from "../../runtime/store/trail-runtime-store";

const PRIORITY_ORDER = new Map<TrailPriority, number>(
  TRAIL_PRIORITIES.map((priority, index) => [priority, index]),
);
const STATUS_CATEGORY_ORDER = new Map<TrailStatusCategory, number>(
  TRAIL_STATUS_CATEGORIES.map((category, index) => [category, index]),
);

/**
 * User pages show optimistic state only while Trail is writable. During refresh or
 * read-only recovery they deliberately fall back to the committed last-known-good
 * snapshot instead of presenting queued optimistic work as authoritative data.
 */
export function selectTrailReadableAuthoritativeState(
  state: TrailRuntimeState,
): TrailAuthoritativeState {
  return state.control.kind === "ready"
    ? projectTrailEffectiveAuthoritativeState(state)
    : state.committed.authoritative;
}

export function selectTrailReadableConfiguration(
  state: TrailRuntimeState,
): TrailConfiguration | null {
  return selectTrailReadableAuthoritativeState(state).configuration;
}

export function selectTrailReadableProjectById(
  state: TrailRuntimeState,
  projectId: string,
): TrailProject | undefined {
  return selectTrailReadableAuthoritativeState(state).domain.projectsById.get(projectId);
}

export function selectTrailReadableTriageIssueById(
  state: TrailRuntimeState,
  issueId: string,
): TrailTriageIssue | undefined {
  const issue = selectTrailReadableAuthoritativeState(state).domain.issuesById.get(issueId);
  return issue?.context === "triage" ? issue : undefined;
}

export function selectTrailReadableWorkflowIssueById(
  state: TrailRuntimeState,
  issueId: string,
): TrailWorkflowIssue | undefined {
  const issue = selectTrailReadableAuthoritativeState(state).domain.issuesById.get(issueId);
  return issue?.context === "workflow" ? issue : undefined;
}

/** Project navigation remains deterministic without persisting a manual rank. */
export function selectTrailReadableProjectIds(
  state: TrailRuntimeState,
): readonly string[] {
  return [...selectTrailReadableAuthoritativeState(state).domain.projectsById.values()]
    .sort((left, right) => {
      const titleOrder = left.title.localeCompare(right.title);
      return titleOrder !== 0 ? titleOrder : left.id.localeCompare(right.id);
    })
    .map((project) => project.id);
}

/** Triage is a due-driven inbox: earliest review point first, then stable identity. */
export function selectTrailReadableTriageIssueIds(
  state: TrailRuntimeState,
): readonly string[] {
  return [...selectTrailReadableAuthoritativeState(state).domain.issuesById.values()]
    .filter((issue): issue is TrailTriageIssue => issue.context === "triage")
    .sort((left, right) => left.due - right.due || left.id.localeCompare(right.id))
    .map((issue) => issue.id);
}

function statusCategoryFor(
  configuration: TrailConfiguration,
  issue: TrailWorkflowIssue,
): TrailStatusCategory | undefined {
  return configuration.statusDefinitions.find((definition) => (
    definition.entityType === "issue" && definition.id === issue.statusDefinitionId
  ))?.category;
}

function workflowSortKey(
  configuration: TrailConfiguration,
  issue: TrailWorkflowIssue,
): readonly [number, number, number, string] {
  const category = statusCategoryFor(configuration, issue);
  const categoryIndex = category === undefined
    ? TRAIL_STATUS_CATEGORIES.length
    : STATUS_CATEGORY_ORDER.get(category) ?? TRAIL_STATUS_CATEGORIES.length;
  const priorityIndex = issue.priority === undefined
    ? TRAIL_PRIORITIES.length
    : PRIORITY_ORDER.get(issue.priority) ?? TRAIL_PRIORITIES.length;
  const time = category === "started"
    ? issue.firstStartedAt ?? issue.createdAt
    : issue.createdAt;
  return [categoryIndex, priorityIndex, time, issue.id];
}

/**
 * Project Issue ordering is presentation-only. It follows status-category,
 * priority, category-relevant activity time, then stable identity.
 */
export function selectTrailReadableWorkflowIssueIdsByProject(
  state: TrailRuntimeState,
  projectId: string,
): readonly string[] {
  const readable = selectTrailReadableAuthoritativeState(state);
  const configuration = readable.configuration;
  if (configuration === null) return [];

  return [...readable.domain.issuesById.values()]
    .filter((issue): issue is TrailWorkflowIssue => (
      issue.context === "workflow" && issue.projectId === projectId
    ))
    .sort((left, right) => {
      const leftKey = workflowSortKey(configuration, left);
      const rightKey = workflowSortKey(configuration, right);
      for (let index = 0; index < leftKey.length - 1; index += 1) {
        const delta = Number(leftKey[index]) - Number(rightKey[index]);
        if (delta !== 0) return delta;
      }
      return leftKey[3].localeCompare(rightKey[3]);
    })
    .map((issue) => issue.id);
}

export function selectIsTrailEntityPending(
  state: TrailRuntimeState,
  entityId: string,
): boolean {
  return state.pending.some((plan) => plan.affectedScope.entityIds.includes(entityId));
}
